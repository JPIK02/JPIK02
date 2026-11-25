// Comptes autorisés par environnement (docs : dossier « Environnements v1 », lot 1) : écrit `config/acces` dans la base du projet
// visé par le compte de service. Lu par les règles Firestore, l'app et les fonctions à la place des adresses écrites en dur.
//   COMPTES_AUTORISES = "adresse1:claire, adresse2:julien, adresse3:claire"   (variable GitHub, jamais dans le dépôt)
//   node scripts/config-acces.js            → écrit
//   node scripts/config-acces.js verifier   → n'écrit rien, compare avec ce qui est en base
// Rien de personnel dans les journaux : seulement des nombres.
import { getDb } from "../agents/lib/firestore.js";

const PARTENAIRES = ["claire", "julien"];
export function lireComptes(texte = "") {
  const comptes = {}, erreurs = [];
  for (const brut of String(texte).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)) {
    const m = /^([^\s:=]+@[^\s:=]+\.[^\s:=]+)\s*[:=]\s*(claire|julien)$/i.exec(brut);
    if (!m) { erreurs.push(brut.includes("@") ? "élément mal formé (attendu « adresse:claire » ou « adresse:julien »)" : "élément sans adresse"); continue; }
    comptes[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  return { comptes, erreurs };
}

const verifier = process.argv.includes("verifier");
const { comptes, erreurs } = lireComptes(process.env.COMPTES_AUTORISES || "");
if (erreurs.length) { console.error(`${erreurs.length} élément(s) refusé(s) : ${[...new Set(erreurs)].join(" ; ")}`); process.exit(1); }
const n = Object.keys(comptes).length, parP = PARTENAIRES.map(p => `${p} : ${Object.values(comptes).filter(x => x === p).length}`).join(", ");
if (!n || PARTENAIRES.some(p => !Object.values(comptes).includes(p))) { console.error(`Il faut au moins un compte par partenaire (${parP}). Rien n'est écrit.`); process.exit(1); }
const ref = getDb().doc("config/acces"), avant = await ref.get(), actuels = avant.exists ? avant.data().comptes || {} : null;
const identique = actuels && JSON.stringify(Object.entries(actuels).sort()) === JSON.stringify(Object.entries(comptes).sort());
console.log(`Demandé : ${n} compte(s) (${parP}). En base : ${actuels ? `${Object.keys(actuels).length} compte(s)${identique ? ", identique" : ", différent"}` : "aucun document"}.`);
if (verifier || identique) process.exit(0);
await ref.set({ comptes, majLe: Date.now() });
console.log("config/acces écrit.");
