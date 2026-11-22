// Règles de l'onglet « Prestataires » v1 (docs/prestataires-v1.md, sections 5 et 6), sans Firebase :
// partagées par l'app (src/prestataires-ui.js), le coach et les agents. Tout est déduit des données, rien n'est saisi deux fois.
// Un prestataire (`vendors/<id>`) : { name, cat (métier), status (étape), ville?, email?, site?, instagram?, contact?, tel?,
//   prix?, devis[], visitNotes?, visitNotesAt?, fit{score, forces, vigilance, avis{note, nombre, resume, trait}}, briefEnvoyeLe?,
//   raisonEcart?, ecarteLe?, by?, createdAt, source? }
import { TUILES, METIERS_MULTIPLES } from "./envies/catalogue.js";
import { METIER2TILE, TBY, tileGris, retard, momentVenu } from "./envies/logic.js";

export const ETAPES = ["repere", "discussion", "reserve"];               // la frise de la fiche ; « ecarte » est hors frise
export const AUTRE = "Autre";                                             // métier hors catalogue (prestataires spécifiques)
/** Métiers dans l'ordre du catalogue de Nos envies (« métiers de prestataires rattachés »), puis « Autre ». */
export const METIERS = [...new Set(TUILES.flatMap(t => t.metiers).filter(m => METIER2TILE[m])), AUTRE];
export const tuileDe = m => METIER2TILE[m] || null;
export const multiple = m => METIERS_MULTIPLES.includes(m);

/** Étape d'un prestataire. Les anciens statuts (contacte, devis) se lisent « En discussion » (migration du 22/11/2026). */
export function etapeOf(v) {
  const s = v && v.status;
  if (s === "ecarte" || s === "reserve") return s;
  if (s === "discussion" || s === "contacte" || s === "devis") return "discussion";
  return "repere";
}
export const enLice = v => ["repere", "discussion"].includes(etapeOf(v));
const DAY = 864e5;
const pd = s => (s ? new Date(String(s).length === 10 ? s + "T12:00:00" : s) : null);
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Rendez-vous d'un prestataire : reliés par id, sinon par son nom dans le titre ou « avec ». */
export function rdvOf(v, rdv = []) {
  const n = fold(v.name);
  return rdv.filter(r => r.vendorId === v.id || (!r.vendorId && n.length > 2 && fold(`${r.avec || ""} ${r.title || ""}`).includes(n)))
    .map(r => ({ ...r, at: pd(r.date) })).filter(r => r.at).sort((a, b) => a.at - b.at);
}
const devisOf = v => (Array.isArray(v.devis) ? v.devis : []);
/** Un devis est connu : historique des devis, ancien statut « Devis reçu », ou prix renseigné. */
export const aDevis = v => devisOf(v).length > 0 || v.status === "devis" || +v.prix > 0;
export const dernierPrix = v => { const d = devisOf(v)[0]; return d && +d.montant ? +d.montant : +v.prix || null; };

/** Mentions calculées (jamais saisies) : « Devis reçu », « RDV 2 déc. », « Brief envoyé ». */
export function mentions(v, { rdv = [], today = new Date() } = {}) {
  const out = [];
  if (aDevis(v)) out.push({ k: "devis" });
  const next = rdvOf(v, rdv).find(r => r.at >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  if (next) out.push({ k: "rdv", date: next.at, rdv: next });
  if (v.briefEnvoyeLe) out.push({ k: "brief", date: new Date(v.briefEnvoyeLe) });
  return out;
}

/** Prochaine étape d'une fiche (6.4), par priorité. ctx : { rdv, today, briefPret, candidats (nb en lice du métier) } */
export function prochaineEtape(v, { rdv = [], today = new Date(), briefPret = false, candidats = 1 } = {}) {
  const e = etapeOf(v), list = rdvOf(v, rdv), t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (e === "reserve") {
    if (+v.acompte && !v.acomptePaye) return { k: "acompte", date: pd(v.dateAcompte), montant: +v.acompte };
    if (v.dateSolde && !v.soldePaye) return { k: "solde", date: pd(v.dateSolde) };
    return { k: "ajour" };
  }
  if (e === "ecarte") return { k: "ecarte" };
  const proche = list.find(r => r.at >= t0 && r.at - t0 <= 14 * DAY);
  if (proche) return { k: "rdv", date: proche.at, rdv: proche };
  const passe = [...list].reverse().find(r => r.at < t0);
  if (passe && !(v.visitNotes && (!v.visitNotesAt || v.visitNotesAt >= +passe.at))) return { k: "raconter", date: passe.at, rdv: passe };
  if (aDevis(v) && candidats >= 2) return { k: "comparer" };
  if (briefPret && !v.briefEnvoyeLe) return { k: "brief" };
  if (!aDevis(v)) return { k: "devis" };
  return { k: "attendre" };
}

/** État d'un métier (6.2) : pasPourNous | reserve | enCours | aLancer. A : réponses de Nos envies. */
export function etatMetier(m, vendors = [], A = {}) {
  const t = tuileDe(m);
  const vs = vendors.filter(v => v.cat === m);
  if (vs.some(v => etapeOf(v) === "reserve")) return "reserve";
  if (t && tileGris(t, A).gris) return "pasPourNous";
  return vs.some(enLice) ? "enCours" : "aLancer";
}
/** Compteur de l'en-tête : N métiers réservés sur M (métiers des tuiles non grisées ; « Autre » hors compte) et la frise. */
export function compteur(vendors = [], A = {}) {
  const ms = METIERS.filter(m => m !== AUTRE && etatMetier(m, vendors, A) !== "pasPourNous");
  const etats = ms.map(m => ({ m, etat: etatMetier(m, vendors, A) }));
  const ordre = { reserve: 0, enCours: 1, aLancer: 2 };
  return { n: etats.filter(x => x.etat === "reserve").length, total: ms.length, frise: etats.sort((a, b) => ordre[a.etat] - ordre[b.etat]) };
}
/** Meilleure note de fit des candidats en lice d'un métier. */
export const meilleurFit = (m, vendors) => { const s = vendors.filter(v => v.cat === m && enLice(v) && v.fit && v.fit.score != null).map(v => Math.round(v.fit.score)); return s.length ? Math.max(...s) : null; };
/** Candidats en lice d'un métier, classés par note. */
export const candidats = (m, vendors) => vendors.filter(v => v.cat === m && enLice(v)).sort((a, b) => ((b.fit && b.fit.score) ?? -1) - ((a.fit && a.fit.score) ?? -1));

/** « À décider maintenant » (6.3) : { m, etat, raison } ou null. ctx : { date, today, priorites [clés de tuiles] } */
export function aDecider(vendors = [], A = {}, { date = null, today = new Date(), priorites = [] } = {}) {
  const ms = METIERS.filter(m => m !== AUTRE).map(m => ({ m, etat: etatMetier(m, vendors, A), t: TBY[tuileDe(m)] }))
    .filter(x => x.t && (x.etat === "enCours" || x.etat === "aLancer"));
  const lieu = ms.find(x => x.m === "Lieu");
  if (lieu && (!date || momentVenu(lieu.t, date, today))) return { ...lieu, raison: "lieu" };
  if (!date) {
    const fam = ms.find(x => x.etat === "enCours") || ms[0];
    return fam ? { ...fam, raison: "ordre" } : null;
  }
  const pret = x => candidats(x.m, vendors).length >= 2 || vendors.some(v => v.cat === x.m && enLice(v) && aDevis(v));
  const tri = (a, b) => retard(b.t, date, today) - retard(a.t, date, today) || (priorites.includes(b.t.k) - priorites.includes(a.t.k));
  const venus = ms.filter(x => momentVenu(x.t, date, today));
  const c1 = venus.filter(x => x.etat === "enCours" && pret(x)).sort(tri)[0];
  if (c1) return { ...c1, raison: "decider" };
  const c2 = venus.filter(x => x.etat === "aLancer").sort(tri)[0];
  return c2 ? { ...c2, raison: "lancer" } : null;
}

/** Doublon possible (même site, même e-mail ou même nom dans le métier) : signalé, jamais fusionné. */
export function doublons(v, vendors = []) {
  const keys = x => { const c = `${x.contact || ""} ${x.email || ""} ${x.site || ""}`;
    return (c.match(/[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/[^\s,;]+|www\.[^\s,;]+/gi) || []).map(s => fold(s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, ""))); };
  const mine = keys(v);
  return vendors.filter(x => x.id !== v.id && ((x.cat === v.cat && fold(x.name) === fold(v.name)) || keys(x).some(k => mine.includes(k))));
}

/** Contacts d'une fiche : champs dédiés, sinon repérés dans le texte « Contact » (e-mail, site, Instagram). */
export function contacts(v) {
  const c = String(v.contact || "");
  const email = v.email || (c.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0];
  const insta = v.instagram || (c.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w.]+/i) || [])[0];
  const site = v.site || (c.replace(insta || "\u0000", "").match(/https?:\/\/[^\s,;]+|www\.[^\s,;]+/i) || [])[0];
  return { tel: v.tel || null, email: email || null, site: site ? (/^https?:/i.test(site) ? site : "https://" + site) : null,
    instagram: insta ? (/^https?:/i.test(insta) ? insta : "https://" + insta) : null };
}

/** Historique d'une fiche (4.3), du plus récent au plus ancien : { at, k, src } (textes dans l'interface). */
export function historique(v, { rdv = [], inbox = [] } = {}) {
  const ev = [];
  if (v.createdAt) ev.push({ at: +v.createdAt, k: "repere", src: v.source || (v.by ? "couple" : null), by: v.by || null });
  devisOf(v).forEach((d, i, all) => ev.push({ at: +pd(d.recuLe) || 0, k: "devis", version: all.length - i, montant: +d.montant || null, src: d.source || null }));
  rdvOf(v, rdv).forEach(r => ev.push({ at: +r.at, k: "rdv", titre: r.title || "" }));
  if (v.visitNotes) ev.push({ at: +v.visitNotesAt || 0, k: "visite" });
  if (v.briefEnvoyeLe) ev.push({ at: +v.briefEnvoyeLe, k: "brief" });
  inbox.filter(m => m.vendorId === v.id || (v.sourceId && m.id === v.sourceId)).forEach(m => ev.push({ at: +pd(m.receivedAt) || 0, k: "mail", sujet: m.subject || "" }));
  if (etapeOf(v) === "ecarte" && v.ecarteLe) ev.push({ at: +v.ecarteLe, k: "ecarte", raison: v.raisonEcart || "" });
  return ev.sort((a, b) => b.at - a.at);
}

/** Calendrier de l'onglet vide (4.7) : métiers à lancer rangés en périodes, d'après le « Remonte à » des tuiles et la date. */
export function calendrier(vendors = [], A = {}, { date = null, today = new Date() } = {}) {
  const ms = METIERS.filter(m => m !== AUTRE && etatMetier(m, vendors, A) === "aLancer").map(m => ({ m, t: TBY[tuileDe(m)] })).filter(x => x.t);
  if (!date) return { sansDate: true, maintenant: ms.slice(0, 4), ensuite: ms.slice(4, 8), plusTard: ms.slice(8) };
  const r = x => retard(x.t, date, today);
  const tri = (a, b) => r(b) - r(a);
  return { maintenant: ms.filter(x => r(x) >= 0).sort(tri), ensuite: ms.filter(x => r(x) < 0 && r(x) >= -6).sort(tri), plusTard: ms.filter(x => r(x) < -6).sort(tri) };
}
