// Budget v1 (docs/budget-planning-v1.md, section 3) : règles sans Firebase, partagées par l'app (src/budget-ui.js), le rapport PDF et les tests.
// Prévu = somme des enveloppes ; signé et payé : pour chaque poste, le plus grand de la saisie du poste et des prestataires réservés
// du métier (jamais additionnés : ce serait compter deux fois le même devis), plus les dépenses hors prestataire du poste.
import { METIERS, AUTRE, enLice, dernierPrix, aDevis } from "./prestataires.js";

const num = x => { const n = +String(x ?? "").replace(/\s/g, "").replace(",", "."); return Number.isFinite(n) ? n : 0; };
export const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Nom d'un poste → métier du catalogue (sur le nom sans accents) ; un poste peut aussi choisir son métier (`metier`) ou n'en avoir aucun (`metier: "-"`)
export const MOTIFS_POSTE = {
  Lieu: /lieu|salle|reception|domaine/, Traiteur: /traiteur|repas|boisson/, Photographe: /photo/, "Vidéaste": /video/, Musique: /musique|dj|orchestre/,
  Fleuriste: /fleur|deco/, Tenues: /tenue|robe|costume|costard/, Alliances: /alliance/, "Coiffure & maquillage": /coiff|maquill/, Papeterie: /papeterie|faire.?part/,
  Transport: /transport/, Officiant: /ceremonie|officiant/, "Hébergement": /heberg/, "Animation enfants": /enfant|animation/, Bar: /bar\b|boisson|vin|alcool/,
  "Pâtissier": /gateau|patiss|dessert/, "Wedding planner": /planner|organisat/, "Agence de voyage": /voyage|noces|lune de miel/,
};
export function metierDe(b = {}) {
  if (b.metier === "-") return null;                                      // poste libre, choisi comme tel ("" : deviné)
  if (b.metier && (METIERS.includes(b.metier) || MOTIFS_POSTE[b.metier])) return b.metier === AUTRE ? null : b.metier;
  const l = fold(b.label);
  return Object.keys(MOTIFS_POSTE).find(m => MOTIFS_POSTE[m].test(l)) || null;
}

/** Invités attendus : présents + en attente, hors absents ; sans liste, le nombre visé. */
export function attendus(guests = [], invitesCible = 0) {
  return guests.length ? guests.filter(g => g.rsvp !== "non").length : num(invitesCible);
}

const montantRes = v => num(v.prix) || dernierPrix(v) || 0;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/**
 * Échéances d'un prestataire réservé (3.7) : d'après le devis (acompte, dates lues par l'agent mail ou saisies) ;
 * conditions inconnues : acompte de 30 % à la signature et solde 7 jours avant le mariage, marqués « à confirmer ».
 * date : date du mariage (Date) ou null. @returns [{kind: acompte|solde, montant, date: "AAAA-MM-JJ"|null, aConfirmer, paye}]
 */
export function echeancesDe(v = {}, { date = null } = {}) {
  const prix = montantRes(v); if (!prix) return [];
  const acConnu = num(v.acompte) > 0, ac = acConnu ? num(v.acompte) : Math.round(prix * 0.3);
  const signe = v.reserveLe ? new Date(typeof v.reserveLe === "number" ? v.reserveLe : String(v.reserveLe)) : null;
  const j7 = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7) : null;
  return [
    { kind: "acompte", montant: Math.min(ac, prix), date: v.dateAcompte || (!acConnu && signe && !isNaN(signe) ? iso(signe) : null), aConfirmer: !acConnu, paye: !!v.acomptePaye || !!v.soldePaye },
    { kind: "solde", montant: Math.max(0, prix - Math.min(ac, prix)), date: v.dateSolde || (j7 ? iso(j7) : null), aConfirmer: !v.dateSolde, paye: !!v.soldePaye },
  ].filter(e => e.montant > 0);
}
const payeRes = v => echeancesDe(v).filter(e => e.paye).reduce((s, e) => s + e.montant, 0);
const depensesDe = b => (Array.isArray(b.depenses) ? b.depenses : []).filter(d => num(d.montant) > 0);

/** À quel poste revient chaque prestataire réservé : celui qui le nomme (`vendorIds`), sinon pour ma tenue secrète la ligne
 *  « Tenue de <mon prénom> », sinon le premier poste du métier. Un prestataire ne compte que sur un poste. */
export function rattacher(lignes = [], vendors = [], { prenomMoi = "" } = {}) {
  const parPoste = Object.fromEntries(lignes.map(b => [b.id, []]));
  for (const v of vendors.filter(x => x.status === "reserve" && !x._secretDe)) {
    let b = lignes.find(x => Array.isArray(x.vendorIds) && x.vendorIds.includes(v.id));
    if (!b && v._prive && prenomMoi) b = lignes.find(x => metierDe(x) === v.cat && fold(x.label).includes(fold(prenomMoi)));
    if (!b) b = lignes.find(x => metierDe(x) === v.cat && !(v.cat === "Tenues" && /tenue de/.test(fold(x.label)) && prenomMoi && !fold(x.label).includes(fold(prenomMoi))));
    if (b) parPoste[b.id].push(v);
  }
  return parPoste;
}

/** Chiffres d'un poste. */
export function chiffresPoste(b, reserves = []) {
  const deps = depensesDe(b);
  const signeV = reserves.reduce((s, v) => s + montantRes(v), 0), payeV = reserves.reduce((s, v) => s + payeRes(v), 0);
  const signe = Math.max(num(b.engage), signeV) + deps.filter(d => d.signe || d.paye).reduce((s, d) => s + num(d.montant), 0);
  const paye = Math.max(num(b.paye), payeV) + deps.filter(d => d.paye).reduce((s, d) => s + num(d.montant), 0);
  return { prevu: num(b.prevu), signe, paye };
}

/** Tous les postes avec leurs chiffres, et les totaux. */
export function bilan({ lignes = [], vendors = [], guests = [], limite = 0, invitesCible = 0, prenomMoi = "" } = {}) {
  const rat = rattacher(lignes, vendors, { prenomMoi });
  const postes = lignes.map(b => ({ b, metier: metierDe(b), reserves: rat[b.id] || [], ...chiffresPoste(b, rat[b.id] || []) }));
  const sum = k => postes.reduce((s, p) => s + p[k], 0);
  const prevu = sum("prevu"), signe = sum("signe"), paye = sum("paye"), lim = num(limite), n = attendus(guests, invitesCible);
  return { postes, prevu, signe, paye, limite: lim, attendus: n, parInvite: n && prevu ? Math.round(prevu / n) : 0,
    depasse: lim > 0 && prevu > lim ? prevu - lim : 0, marge: lim > 0 && prevu <= lim ? lim - prevu : null };
}

/** Barre de l'en-tête (3.2) : parts en % de l'échelle max(limite, prévu, signé). */
export function barre({ prevu, signe, paye, limite }) {
  const echelle = Math.max(limite || 0, prevu, signe, 1), pc = x => Math.max(0, Math.min(100, x / echelle * 100));
  const pa = Math.min(paye, signe || paye), si = Math.max(0, signe - pa), pr = Math.max(0, prevu - Math.max(signe, pa));
  const dans = Math.min(limite > 0 ? limite : echelle, pa + si + pr);
  return { paye: pc(pa), signe: pc(si), prevu: pc(pr), limite: limite > 0 ? pc(limite) : null,
    depasse: limite > 0 && pa + si + pr > limite ? pc(pa + si + pr - dans) : 0 };
}

/** Ligne d'état d'un poste (3.4) : la première règle qui s'applique. */
export function etatPoste(p, { vendors = [], attendus: n = 0 } = {}) {
  const enveloppe = p.prevu;
  if (p.reserves.length) return { k: "reserve", nom: p.reserves.map(v => v.name).join(", "), paye: p.paye };
  if (p.signe > 0 && enveloppe > 0 && p.signe > enveloppe) return { k: "signeDessus", ecart: p.signe - enveloppe };
  if (p.signe > 0) return { k: "signe", paye: p.paye };
  const cands = p.metier ? vendors.filter(v => v.cat === p.metier && enLice(v) && !v._secretDe) : [];
  const prix = cands.filter(aDevis).map(dernierPrix).filter(x => x > 0);
  if (prix.length) { const best = Math.min(...prix); return { k: "devis", meilleur: best, ecart: enveloppe ? best - enveloppe : 0 }; }
  if (cands.length) return { k: "sansDevis", n: cands.length, metier: p.metier };
  return { k: "estimation", parInvite: p.metier === "Traiteur" && n && enveloppe ? Math.round(enveloppe / n) : 0 };
}

/** Devis des candidats d'un métier face à l'enveloppe (3.5). */
export function devisFace(metier, vendors = [], enveloppe = 0) {
  return vendors.filter(v => v.cat === metier && (enLice(v) || v.status === "reserve") && !v._secretDe)
    .map(v => { const px = dernierPrix(v) || 0; return { v, prix: px, ecart: px && enveloppe ? px - enveloppe : null, fit: v.fit && v.fit.score != null ? Math.round(v.fit.score) : null }; })
    .sort((a, b) => (a.prix || 9e15) - (b.prix || 9e15));
}

/** Enveloppe et budget de la tuile Nos envies : la phrase s'affiche si l'écart dépasse 10 %. */
export const ecartEnvies = (enveloppe, budgetEnvies) => (budgetEnvies > 0 && enveloppe > 0 && Math.abs(enveloppe - budgetEnvies) / budgetEnvies > 0.1 ? enveloppe - budgetEnvies : 0);

/**
 * Pistes d'arbitrage (3.3) rendues par le coach, nettoyées : seulement des postes existants, jamais une enveloppe sous ce qui est
 * déjà signé ni au-dessus de l'actuelle ; le gain est recalculé (jamais celui annoncé par l'IA). 2 à 4 pistes au plus, gain > 0.
 * postes : [{b: {id, label}, prevu, signe}] (bilan().postes).
 */
export function nettoyerPistes(pistes = [], postes = []) {
  const P = Object.fromEntries(postes.map(p => [p.b.id, p]));
  return (Array.isArray(pistes) ? pistes : []).map(x => {
    const vus = new Set(), changements = [];
    for (const c of Array.isArray(x.changements) ? x.changements : []) {
      const p = P[c.posteId], n = Math.round(num(c.enveloppe));
      if (!p || vus.has(c.posteId) || !(n >= 0)) continue;
      const cible = Math.max(n, Math.ceil(p.signe));
      if (cible >= p.prevu) continue;
      vus.add(c.posteId); changements.push({ posteId: c.posteId, label: p.b.label, avant: p.prevu, apres: cible });
    }
    const gain = changements.reduce((s, c) => s + c.avant - c.apres, 0);
    return { titre: String(x.titre || "").trim().slice(0, 80), pourquoi: String(x.pourquoi || "").trim().slice(0, 240), perte: String(x.perte || "").trim().slice(0, 200), changements, gain };
  }).filter(x => x.titre && x.gain > 0).slice(0, 4);
}
/** Empreinte du budget : les pistes en cache ne valent que tant que limite et enveloppes n'ont pas changé. */
export const empreinteBudget = (lignes = [], limite = 0) => [num(limite), ...lignes.map(b => `${b.id}:${num(b.prevu)}:${num(b.engage)}`).sort()].join("|");
