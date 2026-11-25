// Nettoyage « tenue secrète » (22/11/2026) : l'ancien texte des deux tenues (questionnaire d'avant le secret, repris le 20/11 dans
// les questions secrètes) était resté dans l'espace commun et avait nourri la phrase « Ce que vous cherchez », le brief tenue de chacun,
// la synthèse et les briefs communs.
//   node nettoyer-secret.js          : simulation (comptes seulement, rien n'est écrit)
//   node nettoyer-secret.js ecrire   : sauvegarde dans `sauvegardes/` (illisible depuis l'app), puis :
//     1. contenu commun des questions secrètes (v, libre, cu, extra) retiré ;
//     2. brief tenue et récompense « essentiel » de la tuile Tenues de chacun refaits à partir de ses seules réponses ;
//     3. synthèse et briefs communs redemandés (passage suivant des agents).
// N'affiche que des comptes (jamais de contenu). Le code ignore déjà ce contenu commun (fusion, enviesForAI) : ce script ne fait que nettoyer.
import { getDb, getMeta, listAll } from "./lib/firestore.js";
import { FieldValue } from "firebase-admin/firestore";
import { QUI, chemin, questionSecrete, TUILE_SECRETE } from "./lib/secret.js";
import { coupleNames } from "./lib/couple.js";

const write = process.argv[2] === "ecrire", db = getDb();
const [envies, settings] = await Promise.all([listAll("envies"), getMeta("settings")]);
const noms = coupleNames(settings), prenom = q => (q === "claire" ? noms.p1 : noms.p2);
const CHAMPS = ["v", "libre", "cu", "extra"];
const aNettoyer = envies.filter(d => questionSecrete(d.id) && CHAMPS.some(k => d[k] != null && d[k] !== "" && !(Array.isArray(d[k]) && !d[k].length)));
const prive = {};
for (const q of QUI) {
  const [briefs, recs] = await Promise.all([listAll(chemin(q, "briefs")), listAll(chemin(q, "recompenses"))]);
  prive[q] = { brief: briefs.some(b => b.id === TUILE_SECRETE), essentiel: recs.some(r => r.id === `${TUILE_SECRETE}.essentiel` && r.phrase) };
}
console.log(`Questions secrètes avec un contenu commun à retirer : ${aNettoyer.length}`);
for (const q of QUI) console.log(`${prenom(q)} : brief tenue à refaire ${prive[q].brief ? "oui" : "non"} · phrase « Ce que vous cherchez » à refaire ${prive[q].essentiel ? "oui" : "non"}`);
console.log("Synthèse et briefs communs : redemandés (rédigés à nouveau sans la tenue au passage suivant des agents).");
if (!write) { console.log("Simulation : rien n'a été écrit."); process.exit(0); }

const at = new Date().toISOString().replace(/[:.]/g, "-");
await db.doc(`sauvegardes/nettoyage-secret-${at}`).set({ at: Date.now(), envies: aNettoyer.map(d => ({ id: d.id, ...Object.fromEntries(CHAMPS.filter(k => k in d).map(k => [k, d[k]])) })) });
for (const d of aNettoyer) await db.doc(`envies/${d.id}`).update(Object.fromEntries(CHAMPS.filter(k => k in d).map(k => [k, FieldValue.delete()])));
console.log(`1. ${aNettoyer.length} question(s) nettoyée(s) ; sauvegarde sauvegardes/nettoyage-secret-${at}.`);

const { runBriefTenue } = await import("./briefs-agent.js");
const { runRecompense } = await import("./recompense-agent.js");
const log = () => {}; // rien de personnel dans le journal
for (const q of QUI) {
  if (prive[q].brief) { await runBriefTenue({ pour: q, log }); console.log(`2. brief tenue de ${prenom(q)} refait.`); }
  if (prive[q].essentiel) { await runRecompense({ tuile: TUILE_SECRETE, niveau: "essentiel", pour: q, log }); console.log(`2. phrase de ${prenom(q)} refaite.`); }
}
const now = Date.now();
await db.doc("meta/analyse").set({ profilRequestedAt: now }, { merge: true });
await db.doc("meta/briefs").set({ requestedAt: now }, { merge: true });
console.log("3. synthèse et briefs communs redemandés.");
process.exit(0);
