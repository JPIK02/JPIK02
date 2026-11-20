// Migration « Nos envies » : anciennes réponses (`brief`) → nouveau questionnaire (`envies`), selon
// docs/nos-envies-correspondance.md (validé par Julien). Lancée à la main par .github/workflows/diag.yml (cible migration-…).
//   node migrate-envies.js          : simulation, n'écrit rien, affiche ce qui serait repris (sans contenu)
//   node migrate-envies.js ecrire   : sauvegarde complète dans `sauvegardes/`, puis écriture
// Rien n'est supprimé : `brief` reste intact. Une réponse déjà donnée dans le nouveau questionnaire n'est jamais
// écrasée : l'ancienne réponse s'ajoute à son texte libre. Sans effet si la migration a déjà été faite.
import { getDb, getMeta, listAll } from "./lib/firestore.js";
import { migrateBrief } from "./lib/envies/migration.js";
import { OLD2TILE } from "./lib/envies/logic.js";
import { coupleNames } from "./lib/couple.js";

const write = process.argv[2] === "ecrire";
const db = getDb();
const done = await getMeta("envies");
if (done.migratedAt && !process.argv.includes("--force")) { console.log(`Déjà migré le ${new Date(done.migratedAt).toISOString()} : rien à faire.`); process.exit(0); }

const [brief, envies, inspirations, settings] = await Promise.all([listAll("brief"), listAll("envies"), listAll("inspirations"), getMeta("settings")]);
const names = coupleNames(settings);
const { answers, metas, archived } = migrateBrief(brief, { p1: names.p1, p2: names.p2 });
const existing = Object.fromEntries(envies.map(d => [d.id, d]));
const now = Date.now();

const writes = [];
for (const [id, a] of Object.entries(answers)) {
  const cur = existing[id] || {};
  const data = { migre: true, updatedAt: now, by: "migration" };
  if (a.v != null && (cur.v == null || (Array.isArray(cur.v) && !cur.v.length))) data.v = a.v; // jamais d'écrasement
  if (a.libre) data.libre = [cur.libre, a.libre].filter(Boolean).join("\n");
  writes.push([`envies/${id}`, data]);
}
for (const [k, m] of Object.entries(metas)) {
  const cur = existing[`_tuile.${k}`] || {}, data = {};
  for (const [f, v] of Object.entries(m)) if (cur[f] == null || cur[f] === "") data[f] = v;
  if (Object.keys(data).length) writes.push([`envies/_tuile.${k}`, { ...data, updatedAt: now }]);
}
const recat = inspirations.filter(i => OLD2TILE[i.cat] && OLD2TILE[i.cat] !== i.cat);
for (const i of recat) writes.push([`inspirations/${i.id}`, { cat: OLD2TILE[i.cat], ancienneCat: i.cat }]);

console.log(`${brief.length} anciennes réponses lues · ${Object.keys(answers).length} questions alimentées · ${Object.keys(metas).length} tuiles avec priorités · ${recat.length} inspirations rangées par tuile · ${archived.length} réponses archivées (restent dans « brief »).`);
console.log(`Questions alimentées : ${Object.keys(answers).sort().join(", ")}`);
console.log(`Déjà répondues dans le nouveau questionnaire (non écrasées) : ${Object.keys(answers).filter(id => existing[id] && existing[id].v != null).join(", ") || "aucune"}`);
if (!write) { console.log("Simulation : rien n'a été écrit."); process.exit(0); }

// Sauvegarde complète avant toute écriture
const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
await db.doc(`sauvegardes/envies-${stamp}`).set({ at: now, brief: JSON.stringify(brief), envies: JSON.stringify(envies), inspirationsCat: JSON.stringify(inspirations.map(i => ({ id: i.id, cat: i.cat }))) });
console.log(`Sauvegarde : sauvegardes/envies-${stamp}`);
for (let i = 0; i < writes.length; i += 400) {
  const b = db.batch();
  for (const [path, data] of writes.slice(i, i + 400)) b.set(db.doc(path), data, { merge: true });
  await b.commit();
}
await db.doc("meta/envies").set({ migratedAt: now, sauvegarde: `sauvegardes/envies-${stamp}`, questions: Object.keys(answers).length, archivees: archived.map(a => a.id) }, { merge: true });
await db.doc("meta/analyse").set({ profilRequestedAt: now }, { merge: true }); // la synthèse se refait à partir du nouveau questionnaire
console.log(`Migration écrite : ${writes.length} documents.`);
process.exit(0);
