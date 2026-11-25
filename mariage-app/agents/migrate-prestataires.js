// Migration « Prestataires » v1 (docs/prestataires-v1.md, section 9 ; tableau validé par Julien le 22/11/2026) :
//   statuts contacte et devis → discussion (repere, reserve, ecarte inchangés) ; catégorie « Autre » gardée telle quelle ;
//   e-mail, site et Instagram cités dans le champ « Contact » copiés dans leurs champs (le texte d'origine est gardé) ;
//   rendez-vous reliés au prestataire par son nom (rdv.vendorId). Rien n'est supprimé ni fusionné.
//   node migrate-prestataires.js          : simulation (comptes seulement, rien n'est écrit)
//   node migrate-prestataires.js ecrire   : sauvegarde dans `sauvegardes/`, puis écriture
import { getDb, listAll } from "./lib/firestore.js";
import { contacts, rdvOf } from "./lib/prestataires.js";

const write = process.argv[2] === "ecrire", db = getDb();
const [vendors, rdv] = await Promise.all([listAll("vendors"), listAll("rdv")]);
const writes = [], stats = { etape: 0, email: 0, site: 0, instagram: 0, rdv: 0 };
for (const v of vendors) {
  const upd = {};
  if (v.status === "contacte" || v.status === "devis") { upd.status = "discussion"; upd.ancienStatut = v.status; stats.etape++; }
  const c = contacts(v);
  for (const k of ["email", "site", "instagram"]) if (!v[k] && c[k]) { upd[k] = c[k]; stats[k]++; }
  if (Object.keys(upd).length) writes.push([`vendors/${v.id}`, upd]);
}
for (const r of rdv) {
  if (r.vendorId) continue;
  const hits = vendors.filter(v => rdvOf(v, [r]).length);
  if (hits.length === 1) { writes.push([`rdv/${r.id}`, { vendorId: hits[0].id }]); stats.rdv++; }
}
console.log(`${vendors.length} prestataires · ${stats.etape} passent « En discussion » · champs copiés depuis « Contact » : ${stats.email} e-mail(s), ${stats.site} site(s), ${stats.instagram} Instagram · ${stats.rdv} rendez-vous relié(s).`);
if (!write) { console.log("Simulation : rien n'a été écrit."); process.exit(0); }
const at = new Date().toISOString().replace(/[:.]/g, "-");
await db.doc(`sauvegardes/prestataires-${at}`).set({ at: Date.now(), vendors, rdv });
for (const [path, data] of writes) await db.doc(path).set(data, { merge: true });
await db.doc("meta/prestataires").set({ migratedAt: Date.now(), sauvegarde: `sauvegardes/prestataires-${at}` }, { merge: true });
console.log(`Écrit : ${writes.length} document(s) ; sauvegarde sauvegardes/prestataires-${at}.`);
process.exit(0);
