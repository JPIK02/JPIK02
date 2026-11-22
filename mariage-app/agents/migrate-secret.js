// Migration « tenue secrète » (lot 4 de Nos envies et de Prestataires ; règle du couple du 22/11/2026 : robe → Claire, costume → Julien).
//   node migrate-secret.js          : simulation (comptes seulement, rien n'est écrit)
//   node migrate-secret.js ecrire   : sauvegarde dans `sauvegardes/`, puis déplacement vers prive/<claire|julien>/…
// Déplace, ne perd rien : réponses tenue par partenaire (et les lignes « Tenue de X : … » reprises le 20/11 dans le texte commun),
// prestataires de tenue, photos de tenue, envies repérées sur la tenue ; les récompenses et la comparaison de la tuile Tenues,
// rédigées avec ces réponses, sont gardées dans la sauvegarde et retirées de l'espace commun. Ce qu'on ne sait pas attribuer reste commun.
// N'affiche que des comptes (jamais de contenu, de nom ni de description).
import { getDb, getMeta, listAll } from "./lib/firestore.js";
// Complément du 22/11/2026 : les sauvegardes ne sont plus lisibles depuis l'app (firestore.rules) ; l'ancien brief commun de la tuile
// Tenues et les anciennes réponses « tenue de Claire / de Julien » de l'ancien questionnaire (collection brief) passent en sauvegarde.
import { FieldValue } from "firebase-admin/firestore";
import { coupleNames } from "./lib/couple.js";
import { QUI, chemin, questionSecrete, proprietaireTenue, METIER_SECRET, TUILE_SECRETE } from "./lib/secret.js";

const write = process.argv[2] === "ecrire", db = getDb();
const [envies, vendors, inspirations, reperees, recompenses, comparaisons, ancien, settings, briefs] = await Promise.all(
  ["envies", "vendors", "inspirations", "envies_reperees", "recompenses", "comparaisons", "brief"].map(listAll).concat(getMeta("settings"), getMeta("briefs")));
const noms = coupleNames(settings), prenomDe = { claire: noms.p1, julien: noms.p2 };
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const quiDuPrenom = p => QUI.find(q => fold(prenomDe[q]) === fold(p)) || null;

const ops = [], stats = { reponses: { claire: 0, julien: 0 }, lignes: 0, vendors: { claire: 0, julien: 0, inconnus: 0 }, photos: { claire: 0, julien: 0, inconnues: 0 }, reperees: 0, recompenses: 0, comparaisons: 0, ancien: 0, briefCommun: 0 };
const sauvegarde = [];

// 1. réponses tenue : p.<qui> → prive/<qui>/envies ; lignes « Tenue de <prénom> : … » du texte commun → texte privé
for (const d of envies.filter(e => questionSecrete(e.id))) {
  const prives = { claire: { ...((d.p || {}).claire || {}) }, julien: { ...((d.p || {}).julien || {}) } };
  const restent = [];
  for (const l of String(d.libre || "").split("\n")) {
    const m = /^\s*Tenue de ([^:]+?)\s*:\s*(.*)$/.exec(l), q = m && quiDuPrenom(m[1]);
    if (q) { prives[q].libre = [prives[q].libre, m[2]].filter(Boolean).join("\n"); stats.lignes++; } else if (l.trim()) restent.push(l);
  }
  let touche = false;
  for (const q of QUI) if (Object.keys(prives[q]).length) { ops.push(["set", `${chemin(q, "envies")}/${d.id}`, { ...prives[q], migre: true, updatedAt: Date.now() }]); stats.reponses[q]++; touche = true; }
  if (touche) { sauvegarde.push({ path: `envies/${d.id}`, data: d }); ops.push(["update", `envies/${d.id}`, { p: FieldValue.delete(), libre: restent.join("\n") }]); }
}
// 2. prestataires de tenue : robe → Claire, costume → Julien ; sinon ils restent communs
for (const v of vendors.filter(x => x.cat === METIER_SECRET)) {
  const q = proprietaireTenue([v.name, v.note, v.contact, v.fit && v.fit.verdict, ...(v.devis || []).map(x => x.resume)].filter(Boolean).join(" "));
  if (!q) { stats.vendors.inconnus++; continue; }
  sauvegarde.push({ path: `vendors/${v.id}`, data: v });
  const { id, ...data } = v;
  ops.push(["set", `${chemin(q, "vendors")}/${id}`, data], ["delete", `vendors/${id}`]); stats.vendors[q]++;
}
// 3. photos de tenue : d'après la personne qui l'a ajoutée, sinon d'après la description
for (const i of inspirations.filter(x => x.cat === TUILE_SECRETE || x.ancienneCat === "tenues")) {
  const q = quiDuPrenom(i.by) || proprietaireTenue(i.description);
  if (!q) { stats.photos.inconnues++; continue; }
  sauvegarde.push({ path: `inspirations/${i.id}`, data: i });
  const { id, ...data } = i;
  ops.push(["set", `${chemin(q, "inspirations")}/${id}`, { ...data, cat: TUILE_SECRETE }], ["delete", `inspirations/${id}`]); stats.photos[q]++;
}
// 4. envies repérées sur la tenue (déjà adressées à un partenaire)
for (const r of reperees.filter(x => x.pour && questionSecrete(x.q))) {
  sauvegarde.push({ path: `envies_reperees/${r.id}`, data: r });
  const { id, ...data } = r;
  ops.push(["set", `${chemin(r.pour, "envies_reperees")}/${id}`, data], ["delete", `envies_reperees/${id}`]); stats.reperees++;
}
// 5. récompenses et comparaison de la tuile Tenues : rédigées avec les réponses de tenue, gardées dans la sauvegarde seulement
for (const r of recompenses.filter(x => x.id.startsWith(TUILE_SECRETE + "."))) { sauvegarde.push({ path: `recompenses/${r.id}`, data: r }); ops.push(["delete", `recompenses/${r.id}`]); stats.recompenses++; }
for (const c of comparaisons.filter(x => x.metier === METIER_SECRET)) { sauvegarde.push({ path: `comparaisons/${c.id}`, data: c }); ops.push(["delete", `comparaisons/${c.id}`]); stats.comparaisons++; }
// 6. ancien brief commun de la tuile Tenues (rédigé avec les réponses de tenue des deux) : sauvegarde, puis retiré de meta/briefs
if (briefs.categories && briefs.categories[TUILE_SECRETE]) {
  sauvegarde.push({ path: `meta/briefs.categories.${TUILE_SECRETE}`, data: briefs.categories[TUILE_SECRETE] });
  ops.push(["update", "meta/briefs", { [`categories.${TUILE_SECRETE}`]: FieldValue.delete() }]); stats.briefCommun++;
}
// 7. ancien questionnaire : réponses « tenue de Claire » et « tenue de Julien » (déjà reprises dans l'espace privé le 20/11 puis par l'étape 1)
for (const d of ancien.filter(x => ["tenues--claire", "tenues--julien"].includes(x.id))) { sauvegarde.push({ path: `brief/${d.id}`, data: d }); ops.push(["delete", `brief/${d.id}`]); stats.ancien++; }

console.log(`Réponses de tenue déplacées : ${noms.p1} ${stats.reponses.claire}, ${noms.p2} ${stats.reponses.julien} (dont ${stats.lignes} ligne(s) reprise(s) du texte commun).`);
console.log(`Prestataires de tenue : ${noms.p1} ${stats.vendors.claire}, ${noms.p2} ${stats.vendors.julien}, laissés communs faute de savoir : ${stats.vendors.inconnus}.`);
console.log(`Photos de tenue : ${noms.p1} ${stats.photos.claire}, ${noms.p2} ${stats.photos.julien}, laissées communes : ${stats.photos.inconnues}.`);
console.log(`Envies repérées déplacées : ${stats.reperees} · récompenses retirées (gardées en sauvegarde) : ${stats.recompenses} · comparaisons : ${stats.comparaisons}.`);
console.log(`Ancien brief commun de la tenue retiré : ${stats.briefCommun} · anciennes réponses du questionnaire retirées : ${stats.ancien}.`);
if (!write) { console.log(`Simulation : rien n'a été écrit (${ops.length} opération(s) prévues).`); process.exit(0); }

const at = new Date().toISOString().replace(/[:.]/g, "-");
// sauvegarde : un document par élément (les photos sont lourdes), puis un index
for (const [n, s] of sauvegarde.entries()) await db.doc(`sauvegardes/secret-${at}-${n}`).set({ at: Date.now(), ...s });
await db.doc(`sauvegardes/secret-${at}`).set({ at: Date.now(), elements: sauvegarde.length, chemins: sauvegarde.map(s => s.path) });
for (const [op, path, data] of ops) { const ref = db.doc(path); op === "set" ? await ref.set(data) : op === "update" ? await ref.update(data) : await ref.delete(); }
await db.doc("meta/secret").set({ migreLe: Date.now(), sauvegarde: `sauvegardes/secret-${at}` }, { merge: true });
console.log(`Écrit : ${ops.length} opération(s) ; sauvegarde sauvegardes/secret-${at} (${sauvegarde.length} élément(s)).`);
process.exit(0);
