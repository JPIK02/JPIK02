// Tenue secrète (docs/nos-envies-v1.md 6.8, docs/prestataires-v1.md 6.9), sans Firebase : partagé par l'app, le coach et les agents.
// Chaque partenaire a un espace privé `prive/<claire|julien>/<collection>/…`, lisible par lui seul (firestore.rules).
// Règle du couple (22/11/2026) : tout ce qui concerne la robe est à Claire, tout ce qui concerne le costume est à Julien.
// L'autre partenaire ne voit que `meta/secret.<qui>` : avancement et nombre de prestataires, jamais de contenu.
import { QBY } from "./envies/logic.js";

export const QUI = ["claire", "julien"];
export const autre = qui => (qui === "claire" ? "julien" : "claire");
/** Collections qui ont un pendant privé. */
export const PRIVES = ["envies", "vendors", "inspirations", "envies_reperees", "recompenses", "inbox", "rdv", "comparaisons"];
export const METIER_SECRET = "Tenues";      // métier dont les prestataires sont privés (les alliances restent communes)
export const TUILE_SECRETE = "tenues";
export const chemin = (qui, col) => `prive/${qui}/${col}`;

/** Une question dont la réponse est privée (tant que son auteur n'a pas levé le secret). */
export const questionSecrete = id => !!(QBY[id] && QBY[id].secret);
/** Ce document va-t-il dans l'espace privé ? (création) */
export function estPrive(col, data = {}, { montre = false } = {}) {
  if (montre) return false;
  if (col === "vendors") return data.cat === METIER_SECRET;
  if (col === "inspirations") return data.cat === TUILE_SECRETE;
  if (col === "envies") return questionSecrete(data.id);
  if (col === "envies_reperees") return questionSecrete(data.q) && !!data.pour;
  if (col === "recompenses" || col === "comparaisons") return String(data.id || "").startsWith(TUILE_SECRETE) || data.metier === METIER_SECRET;
  return false;
}

/** Fusion de l'espace commun et de mon espace privé, pour l'affichage. Les documents privés portent `_prive`. */
export function fusion(col, commun = [], prive = [], me) {
  if (col === "envies") {
    // une réponse privée est la mienne : elle prend la place de p.<moi> sur la question
    const out = commun.map(d => ({ ...d })), by = Object.fromEntries(out.map(d => [d.id, d]));
    for (const p of prive) {
      const { id, by: _b, updatedAt, ...rep } = p;
      if (by[id]) by[id].p = { ...(by[id].p || {}), [me]: rep };
      else out.push(by[id] = { id, p: { [me]: rep }, updatedAt });
      by[id]._prive = true;
    }
    return out;
  }
  const ids = new Set(prive.map(d => d.id));
  const base = commun.filter(d => !ids.has(d.id) && !(col === "rdv" && d.secretDe === me)); // mon rendez-vous secret remplace son repère commun
  return [...base, ...prive.map(d => ({ ...d, _prive: true }))];
}

/** Ce que l'autre partenaire peut savoir de ma tenue : avancement et prestataires, sans aucun contenu. */
export function resumeSecret({ envies = [], vendors = [], me, levelDone, montre = false }) {
  const A = Object.fromEntries(envies.map(d => [d.id, d]));
  const niveaux = Object.fromEntries(["essentiel", "details", "pro"].map(n => [n, !!(levelDone && levelDone(TUILE_SECRETE, n, A, me))]));
  const vs = vendors.filter(v => v._prive && v.cat === METIER_SECRET && v.status !== "ecarte");
  const repondues = envies.filter(d => d._prive && d.p && d.p[me] && (d.p[me].v != null || d.p[me].libre || d.p[me].cu)).length;
  return { niveaux, repondues, prestataires: vs.length, reserve: vs.some(v => v.status === "reserve"), montre: !!montre };
}

/** Règle robe → Claire, costume → Julien : à qui appartient un élément de tenue d'après son texte, ou null si on ne sait pas. */
export function proprietaireTenue(texte) {
  const t = String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const robe = /\b(robes?|mariee|bridal|voile|jupon|traine|couturiere de mariage)\b/.test(t);
  const costume = /\b(costumes?|smoking|tailleur|chemise|cravate|noeud papillon|homme|groom|marie\b(?! e))/.test(t);
  return robe && !costume ? "claire" : costume && !robe ? "julien" : null;
}
