// Diagnostic (lecture seule) pour la correspondance de « Prestataires » v1 (docs/prestataires-v1.md, section 9) :
// statuts et métiers actuels, métiers absents du catalogue de Nos envies, doublons possibles, champs remplis.
// N'affiche que des comptes et des noms de métiers (jamais de nom de prestataire ni de contact).
import { listAll } from "./lib/firestore.js";
import { METIER2TILE } from "./lib/envies/logic.js";

const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const vendors = await listAll("vendors");
const count = (arr, key) => arr.reduce((m, x) => { const k = key(x); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log(`${vendors.length} prestataires.`);
console.log("Par statut :", JSON.stringify(count(vendors, v => v.status || "(vide)")));
console.log("Par métier :", JSON.stringify(count(vendors, v => v.cat || "(vide)")));
const hors = vendors.filter(v => !METIER2TILE[v.cat]);
console.log(`Métier absent du catalogue de Nos envies : ${hors.length}`, JSON.stringify(count(hors, v => v.cat || "(vide)")));
console.log("Réservés par métier :", JSON.stringify(count(vendors.filter(v => v.status === "reserve"), v => v.cat)));
// doublons possibles : même nom (normalisé) dans un métier, ou même site/e-mail cité dans le champ contact
const keyN = {}, keyC = {};
for (const v of vendors) {
  const n = `${v.cat}|${fold(v.name)}`; keyN[n] = (keyN[n] || 0) + 1;
  for (const m of String(v.contact || "").match(/[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/[^\s,;]+|www\.[^\s,;]+/gi) || []) { const k = fold(m.replace(/^https?:\/\/(www\.)?/i, "")); keyC[k] = (keyC[k] || 0) + 1; }
}
console.log(`Doublons possibles : ${Object.values(keyN).filter(n => n > 1).length} nom(s) en double dans un métier, ${Object.values(keyC).filter(n => n > 1).length} site/e-mail cité(s) plusieurs fois.`);
const filled = f => vendors.filter(v => { const x = v[f]; return Array.isArray(x) ? x.length : x != null && String(x).trim() !== ""; }).length;
console.log("Champs remplis :", ["contact", "tel", "prix", "devis", "visitNotes", "fit", "questionsAPoser", "source", "mailUrl", "by", "createdAt", "acompte", "acomptePaye", "dateSolde"].map(f => `${f} ${filled(f)}`).join(", "));
console.log("Sources :", JSON.stringify(count(vendors, v => v.source || "(vide)")));
const rdv = await listAll("rdv");
const names = vendors.map(v => fold(v.name)).filter(Boolean);
console.log(`Rendez-vous : ${rdv.length}, dont ${rdv.filter(r => r.vendorId).length} reliés par id, ${rdv.filter(r => !r.vendorId && names.some(n => fold(`${r.avec} ${r.title}`).includes(n))).length} reliables par le nom.`);
const inbox = await listAll("inbox");
console.log("Propositions mail en attente :", JSON.stringify(count(inbox.filter(m => (m.status || "new") === "new" && m.type !== "ignored"), m => m.type)));
process.exit(0);
