// Assistant IA intégré à l'app : fonction appelable par Claire et Julien uniquement.
// La clé Claude reste côté serveur (variable d'environnement écrite au déploiement depuis les secrets GitHub).
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFS, makeTools } from "./tools.js";
import { systemPrompt } from "./prompt.js";
import { converse, userContent } from "./converse.js";
import { QCATS } from "./questions.js";
import { FieldValue } from "firebase-admin/firestore";
import { profileFor, recordUsage } from "./agents/lib/usage.js";

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });

const MODEL = process.env.ANTHROPIC_MODEL || ""; // vide : modèle choisi dans Réglages → Coût de l'IA (meta/ia)
const ALLOWED = String(process.env.ALLOWED_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const PRENOMS = { "julienpicquet@gmail.com": "Julien", "duquesne.claire@yahoo.fr": "Claire", "claiire.duquesne59@gmail.com": "Claire" };
const DAILY_LIMIT = 150;   // messages par jour, à vous deux (garde-fou de coût)
const HISTORY = 16;        // derniers messages repris comme contexte
let client;

export const assistant = onCall({ timeoutSeconds: 300, memory: "512MiB" }, async req => {
  const email = String(req.auth?.token?.email || "").toLowerCase();
  if (!email || !req.auth.token.email_verified || !ALLOWED.includes(email))
    throw new HttpsError("permission-denied", "Coach réservé à Claire et Julien.");
  const { message, mode = "chat", view = "", reset = false, attachment = null } = req.data || {};
  const atts = (Array.isArray(req.data?.attachments) ? req.data.attachments : attachment ? [attachment] : []).slice(0, 4);
  const chatRef = db.doc(`chats/${email}`);
  if (reset && !message) { await chatRef.set({ messages: [], updatedAt: Date.now() }); return { ok: true }; }
  if (typeof message !== "string" || (!message.trim() && !atts.length) || message.length > 4000)
    throw new HttpsError("invalid-argument", "Message vide ou trop long.");
  let content;
  try { content = userContent(message, atts); } catch (e) { throw new HttpsError("invalid-argument", e.message); }
  const nPdf = atts.filter(a => a.media_type === "application/pdf").length, nImg = atts.length - nPdf;
  const tag = [nImg ? (nImg > 1 ? `${nImg} photos jointes` : "photo jointe") : "", nPdf ? (nPdf > 1 ? `${nPdf} PDF joints` : "PDF joint") : ""].filter(Boolean).join(", ");
  const shown = (message.trim() + (tag ? `${message.trim() ? " " : ""}[${tag}]` : "")).trim();

  // Garde-fou : nombre de messages par jour
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async tx => {
    const ref = db.doc("meta/assistant"), q = (await tx.get(ref)).data() || {};
    const count = q.day === today ? q.count || 0 : 0;
    if (count >= DAILY_LIMIT) throw new HttpsError("resource-exhausted", `Limite de ${DAILY_LIMIT} messages par jour atteinte.`);
    tx.set(ref, { day: today, count: count + 1 }, { merge: true });
  });

  const past = reset ? [] : ((await chatRef.get()).data()?.messages || []);
  // La section ouverte va dans le message (pas dans les consignes) : les consignes restent identiques et en cache.
  const where = `[Section ouverte : ${String(view || "Accueil").slice(0, 60)}]`;
  const withView = typeof content === "string" ? `${where} ${content}` : [...content.slice(0, -1), { ...content.at(-1), text: `${where} ${content.at(-1).text}` }];
  const messages = [...past.slice(-HISTORY).map(m => ({ role: m.role, content: m.text || "…" })), { role: "user", content: withView }];
  // Miniatures envoyées par l'app (480 px) : le coach peut garder une photo comme inspiration (noter_inspiration)
  const thumbs = atts.map(a => (typeof a.thumb === "string" && a.thumb.length < 400_000 ? a.thumb : null));
  const exec = makeTools(db, { qcats: QCATS, thumbs, author: PRENOMS[email] || "" });
  const system = systemPrompt({ prenom: PRENOMS[email] || "l'un des mariés", today: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }), view, mode });
  client ||= new Anthropic();

  const feature = mode === "brief" ? "brief" : "coach";
  const prof = profileFor((await db.doc("meta/ia").get()).data() || {}, feature);
  let text, actions;
  try { ({ text, actions } = await converse({ client, model: MODEL || prof.model, system, tools: TOOL_DEFS, messages, exec, effort: prof.effort,
    onUsage: res => recordUsage(db, FieldValue.increment, feature, res) })); }
  catch (e) { throw claudeError(e); }

  // On garde de quoi annuler les 10 derniers messages ; au-delà, seulement le libellé des actions (taille du document).
  const history = [...past, { role: "user", text: shown, at: Date.now() }, { role: "assistant", text, actions, at: Date.now() }].slice(-60)
    .map((m, i, arr) => (i < arr.length - 10 && m.actions ? { ...m, actions: m.actions.map(({ label, undone }) => ({ label, ...(undone ? { undone } : {}) })) } : m));
  await chatRef.set({ messages: history, mode, updatedAt: Date.now() });
  return { text, actions };
});

/** Erreur de l'API Claude → message clair dans l'app (au lieu de « Le coach ne répond pas »). */
export function claudeError(e) {
  if (e instanceof HttpsError) return e;
  const msg = String(e?.error?.error?.message || e?.message || "");
  console.error("[assistant] Claude :", e?.status, msg);
  if (/credit balance/i.test(msg)) return new HttpsError("failed-precondition", "Le crédit Claude est épuisé : rechargez-le sur console.anthropic.com (Plans & Billing), puis réessayez.");
  if (e?.status === 401) return new HttpsError("failed-precondition", "La clé Claude n'est plus valide : recréez-la sur console.anthropic.com et mettez à jour le secret GitHub ANTHROPIC_API_KEY.");
  if (e?.status === 429) return new HttpsError("resource-exhausted", "Trop de demandes envoyées à Claude en peu de temps : réessayez dans une minute.");
  if (e?.status === 529 || e?.status >= 500) return new HttpsError("unavailable", "Claude est surchargé en ce moment : réessayez dans quelques minutes.");
  return new HttpsError("internal", "Le coach a rencontré une erreur : " + msg.slice(0, 200));
}

// Agents (mails, analyse, synthèse, point du lundi, relances) : réveil par Google Cloud Scheduler toutes les 10 minutes.
// Chaque agent décide lui-même s'il a du travail (planning, demande depuis l'app) : la plupart des passages ne font rien.
// Le code des agents est copié de ../agents au déploiement (voir functions.yml).
export const agents = onSchedule(
  { schedule: "every 10 minutes", timeZone: "Europe/Paris", timeoutSeconds: 1800, memory: "1GiB", maxInstances: 1, retryCount: 0 },
  async () => {
    const { runAll } = await import("./agents/main.js");
    const failed = await runAll({});
    if (failed) console.error("[agents] au moins un agent a échoué (voir les lignes ci-dessus)");
  });

// Lancement immédiat depuis l'app (« Demander une analyse », « Lire la boîte », point de la semaine, notes de visite),
// sans attendre le prochain réveil. Un verrou (agents/lib/lock.js) évite les doubles passages.
export const runAgent = onCall({ timeoutSeconds: 1800, memory: "1GiB", maxInstances: 2 }, async req => {
  const email = String(req.auth?.token?.email || "").toLowerCase();
  if (!email || !req.auth.token.email_verified || !ALLOWED.includes(email)) throw new HttpsError("permission-denied", "Réservé à Claire et Julien.");
  const job = req.data?.job;
  if (!["mail", "analyse", "hebdo"].includes(job)) throw new HttpsError("invalid-argument", "Agent inconnu.");
  const { runAll } = await import("./agents/main.js");
  const failed = await runAll({ forced: job });
  return { ok: !failed };
});
