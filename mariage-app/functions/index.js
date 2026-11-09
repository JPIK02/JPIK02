// Assistant IA intégré à l'app : fonction appelable par Claire et Julien uniquement.
// La clé Claude reste côté serveur (variable d'environnement écrite au déploiement depuis les secrets GitHub).
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFS, makeTools } from "./tools.js";
import { systemPrompt } from "./prompt.js";
import { converse, userContent } from "./converse.js";
import { QCATS } from "./questions.js";

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
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
  const chatRef = db.doc(`chats/${email}`);
  if (reset && !message) { await chatRef.set({ messages: [], updatedAt: Date.now() }); return { ok: true }; }
  if (typeof message !== "string" || (!message.trim() && !attachment) || message.length > 4000)
    throw new HttpsError("invalid-argument", "Message vide ou trop long.");
  let content;
  try { content = userContent(message, attachment); } catch (e) { throw new HttpsError("invalid-argument", e.message); }
  const shown = (message.trim() || "") + (attachment ? `${message.trim() ? " " : ""}[${attachment.media_type === "application/pdf" ? "PDF joint" : "photo jointe"}]` : "");

  // Garde-fou : nombre de messages par jour
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async tx => {
    const ref = db.doc("meta/assistant"), q = (await tx.get(ref)).data() || {};
    const count = q.day === today ? q.count || 0 : 0;
    if (count >= DAILY_LIMIT) throw new HttpsError("resource-exhausted", `Limite de ${DAILY_LIMIT} messages par jour atteinte.`);
    tx.set(ref, { day: today, count: count + 1 }, { merge: true });
  });

  const past = reset ? [] : ((await chatRef.get()).data()?.messages || []);
  const messages = [...past.slice(-HISTORY).map(m => ({ role: m.role, content: m.text || "…" })), { role: "user", content }];
  const exec = makeTools(db, { qcats: QCATS });
  const system = systemPrompt({ prenom: PRENOMS[email] || "l'un des mariés", today: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }), view, mode });
  client ||= new Anthropic();

  const { text, actions } = await converse({ client, model: MODEL, system, tools: TOOL_DEFS, messages, exec, effort: mode === "brief" ? "medium" : "low" });

  // On garde de quoi annuler les 10 derniers messages ; au-delà, seulement le libellé des actions (taille du document).
  const history = [...past, { role: "user", text: shown, at: Date.now() }, { role: "assistant", text, actions, at: Date.now() }].slice(-60)
    .map((m, i, arr) => (i < arr.length - 10 && m.actions ? { ...m, actions: m.actions.map(({ label, undone }) => ({ label, ...(undone ? { undone } : {}) })) } : m));
  await chatRef.set({ messages: history, mode, updatedAt: Date.now() });
  return { text, actions };
});
