// Point de la semaine du coach (lundi matin) : écrit dans meta/hebdo, notifié sur les téléphones.
import { readFileSync } from "node:fs";
import { getDb, getMeta, listAll } from "./lib/firestore.js";
import { runForOutput } from "./lib/claude.js";
import { notify } from "./lib/push.js";
import { parisClock, isoWeek, visitsToFollow } from "./lib/scheduler.js";

const SYSTEM = readFileSync(new URL("./prompts/hebdo.md", import.meta.url), "utf8");
const OUT = {
  name: "point_hebdo",
  description: "Enregistre le point de la semaine.",
  input_schema: {
    type: "object",
    properties: {
      titre: { type: "string", description: "court" },
      points: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
      question: { type: "string" },
    },
    required: ["titre", "points", "question"],
  },
};

const PH = { m12: -9, m9: -6, m6: -4, m4: -2, m2: -1 }; // mois avant la date (le reste : proche du jour J)
function due(t, wd) {
  if (t.due) return t.due;
  if (!wd) return null;
  const d = new Date(wd + "T12:00:00");
  if (PH[t.phase] != null) d.setMonth(d.getMonth() + PH[t.phase]);
  else if (t.phase === "m1") d.setDate(d.getDate() - 7);
  else if (t.phase === "s1") d.setDate(d.getDate() - 1);
  else if (t.phase === "apres") d.setMonth(d.getMonth() + 2);
  return d.toISOString().slice(0, 10);
}

export async function buildContext(now = new Date()) {
  const [settings, tasks, vendors, budget, rdv, inbox, brief, profil] = await Promise.all([
    getMeta("settings"), listAll("tasks"), listAll("vendors"), listAll("budget"), listAll("rdv"), listAll("inbox"), listAll("brief"), getMeta("profil")]);
  const today = parisClock(now).isoDate, in21 = new Date(now.getTime() + 21 * 864e5).toISOString().slice(0, 10);
  const open = tasks.filter(t => t.status !== "done").map(t => ({ titre: t.title, qui: t.owner || "deux", echeance: due(t, settings.date), statut: t.status }));
  const sum = k => budget.reduce((s, b) => s + (+b[k] || 0), 0);
  return {
    aujourdhui: today, mariage: settings.date || null, dateIndicative: !!settings.dateIndicative, lieu: settings.lieu || null, ville: settings.ville || null,
    taches_en_retard: open.filter(t => t.echeance && t.echeance < today),
    taches_3_semaines: open.filter(t => t.echeance && t.echeance >= today && t.echeance <= in21),
    avancement: `${tasks.filter(t => t.status === "done").length}/${tasks.length} tâches faites`,
    rendez_vous: rdv.filter(r => r.date && r.date >= today && r.date <= in21).map(r => ({ titre: r.title, date: r.date, heure: r.time || null })),
    budget: { total: +settings.budgetTotal || null, prevu: sum("prevu"), engage: sum("engage"), paye: sum("paye") },
    prestataires: vendors.filter(v => v.status !== "ecarte").map(v => ({ nom: v.name, categorie: v.cat, statut: v.status, prix: v.prix ?? null, note_fit: v.fit?.score ?? null, verdict: v.fit?.verdict, notes: v.note ? String(v.note).slice(0, 300) : undefined })),
    propositions_mail_en_attente: inbox.filter(m => (m.status || "new") === "new" && m.type !== "ignored").length,
    envies_reponses: brief.filter(b => b.qid !== "_meta").length,
    synthese_envies: profil.resume || null,
  };
}

export async function runHebdo({ log = console.log, now = new Date() } = {}) {
  const ctx = await buildContext(now);
  const out = await runForOutput({ system: SYSTEM, user: `<donnees>${JSON.stringify(ctx)}</donnees>`, output: OUT, feature: "synthese" });
  const week = isoWeek(now);
  await getDb().doc("meta/hebdo").set({ week, titre: String(out.titre || "Votre point de la semaine").slice(0, 120),
    points: (out.points || []).map(p => String(p).slice(0, 400)).slice(0, 5), question: String(out.question || "").slice(0, 300), at: Date.now() });
  log(`Point de la semaine ${week} : ${out.titre}`);
  await notify({ title: "Votre point de la semaine", body: out.titre, url: "/#apercu", tag: "hebdo" }, { log });
}

/** Relance le soir d'une visite : « Comment s'est passée la visite ? » (une fois par rendez-vous). */
export async function runVisitFollowups({ log = console.log, now = new Date() } = {}) {
  const [rdv, vendors] = await Promise.all([listAll("rdv"), listAll("vendors")]);
  for (const { r, v } of visitsToFollow(rdv, vendors, parisClock(now))) {
    await notify({ title: `Comment s'est passée la visite ?`, body: `${v.name} : dites-le au coach en deux phrases, il met la fiche à jour.`, url: "/#apercu", tag: `visite-${r.id}` }, { log });
    await getDb().doc(`rdv/${r.id}`).set({ followupAt: Date.now() }, { merge: true });
  }
}
