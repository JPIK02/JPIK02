// Récolte passive (docs/nos-envies-v1.md, section 6.7) : réponses repérées par le coach, à confirmer.
// Collection `envies_reperees`, un document par question (par partenaire pour une question `parPartenaire`) :
//   { q, v, libre, phrase, source: "coach"|"visite"|"pinterest", ref, pour, by, at, status: "attente"|"confirmee"|"close" }
// Une envie repérée ne compte (jauge, notes, coach) qu'une fois confirmée : elle est alors écrite dans `envies`.
// Sans Firebase : partagé par l'app, le coach (functions/tools.js) et les agents.
import { QUESTIONS } from "./catalogue.js";
import { QBY, isAnswered, tileGris, visibleQ } from "./logic.js";

const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const JPA = { jamais: "j", pourquoi_pas: "p", absolument: "a" };

/** Champs d'une réponse, au format des outils du coach (enregistrer_envie, proposer_envie, sorties des agents). */
export const VALEUR_PROPS = {
  question: { type: "string", description: "id complet de la question, ex. lieu.type" },
  choix: { type: "array", items: { type: "string" }, description: "ids des choix (CP, CC, CM)" },
  cran: { type: "integer", minimum: 1, maximum: 5, description: "CU : 1 à 5" },
  jpa: { type: "object", additionalProperties: { type: "string", enum: ["jamais", "pourquoi_pas", "absolument"] }, description: "JPA : {id du choix, ou « _ » : jamais | pourquoi_pas | absolument}" },
  ordre: { type: "array", items: { type: "string" }, description: "CL : ids dans l'ordre" },
  valeur: { type: "string", description: "CH : chiffre ou fourchette" },
  texte: { type: "string", description: "texte libre fidèle (TL, ou précision en plus)" },
};

/** Convertit une réponse donnée par Claude en valeur du catalogue : { q, v?, libre? }. Lève une erreur si rien d'utilisable. */
export function toAnswer(i, FR) {
  const q = QBY[i && i.question]; if (!q) throw new Error(`question inconnue : ${i && i.question} (lis la tuile avec lire_envies pour avoir les ids)`);
  const T = FR.questions[q.id], ids = (q.choix || []).map(c => c.id);
  const toId = x => (ids.includes(x) ? x : ids.find(c => fold(T.choix[c]) === fold(x)));
  let v;
  if (["CP", "CC", "CM"].includes(q.format) && Array.isArray(i.choix)) { v = [...new Set(i.choix.map(toId).filter(Boolean))]; if (!v.length) v = undefined; }
  else if (q.format === "CL" && Array.isArray(i.ordre)) { v = [...new Set(i.ordre.map(toId).filter(Boolean))]; if (!v.length) v = undefined; }
  else if (q.format === "CU" && Number.isInteger(i.cran) && i.cran >= 1 && i.cran <= 5) v = i.cran;
  else if (q.format === "JPA" && i.jpa && typeof i.jpa === "object") {
    v = {};
    for (const [c, x] of Object.entries(i.jpa)) {
      if (!JPA[x]) continue;
      if (c === "_" && ids.length) ids.forEach(id => { v[id] = JPA[x]; });
      else { const id = c === "_" ? "_" : toId(c); if (id) v[id] = JPA[x]; }
    }
    if (!Object.keys(v).length) v = undefined;
  } else if (q.format === "CH" && str(i.valeur, 100)) v = str(i.valeur, 100);
  const libre = str(i.texte, 2000);
  if (v === undefined && !libre) throw new Error("rien à enregistrer : donne des choix (ids), un cran, un jpa, un ordre, une valeur ou un texte");
  return { q, ...(v !== undefined ? { v } : {}), ...(libre ? { libre } : {}) };
}

/** Id du document : la question, suivie du partenaire pour une question par partenaire. */
export const repId = (q, pour) => (q.parPartenaire ? `${q.id}.${pour}` : q.id);

/** Une envie peut être proposée si la question est visible, sa tuile active, et qu'elle n'a pas encore de réponse
 *  (pour le partenaire concerné sur une question par partenaire ; sans partenaire connu, pas de proposition). */
export function canPropose(q, A, { pour, pays } = {}) {
  if (!q || !visibleQ(q, pays) || tileGris(q.tuile, A).gris) return false;
  if (q.parPartenaire && !pour) return false;
  return !isAnswered(q, A, pour || "claire");
}

/** Document à écrire pour une envie repérée, ou null si elle ne doit pas être proposée. */
export function buildReperee(i, FR, { A = {}, source, ref, pour, by, pays, now = Date.now() }) {
  let a; try { a = toAnswer(i, FR); } catch (e) { return null; }
  const phrase = str(i.phrase, 400);
  if (!phrase || !canPropose(a.q, A, { pour, pays })) return null;
  const doc = { q: a.q.id, phrase, source, at: now, status: "attente", ...(a.v !== undefined ? { v: a.v } : {}), ...(a.libre ? { libre: a.libre } : {}) };
  if (ref) doc.ref = String(ref).slice(0, 200);
  if (a.q.parPartenaire) doc.pour = pour;
  if (by) doc.by = by;
  return { id: repId(a.q, pour), doc };
}

/** Envies repérées à montrer à `me` : en attente, question toujours sans réponse, et pour lui sur une question par partenaire. */
export function pendingFor(reps = [], A = {}, me, pays) {
  return reps.filter(r => r.status === "attente" && QBY[r.q] && (!r.pour || r.pour === me) && canPropose(QBY[r.q], A, { pour: r.pour || me, pays }))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** Données à écrire dans `envies` quand on confirme (« C'est ça ») : la réponse, et pour une question par partenaire, sous p.<pour>. */
export function confirmData(r, cur = {}) {
  const part = { ...(r.v !== undefined ? { v: r.v } : {}), ...(r.libre ? { libre: r.libre } : {}) };
  if (!r.pour) return { data: part, fields: Object.keys(part) };
  return { data: { p: { ...(cur.p || {}), [r.pour]: { ...((cur.p || {})[r.pour] || {}), ...part } } }, fields: [`p.${r.pour}`] };
}

/** Questions encore sans réponse de quelques tuiles, en texte compact pour une sortie d'agent (id, format, choix). */
export function openQuestions(tuiles, A, FR, { pays, max = 40 } = {}) {
  return QUESTIONS.filter(q => tuiles.includes(q.tuile) && !q.parPartenaire && canPropose(q, A, { pays }) && q.format !== "TL")
    .slice(0, max).map(q => {
      const T = FR.questions[q.id];
      const extra = q.choix ? ` choix : ${q.choix.map(c => `${c.id} (${T.choix[c.id]})`).join(", ")}` : q.format === "CU" ? ` crans : 1 = ${T.poles[0]}, 5 = ${T.poles[1]}` : "";
      return `- ${q.id} [${q.format}] ${T.libelle}${extra}`;
    }).join("\n");
}

/** La phrase d'origine figure bien dans la source (notes de visite, texte d'épingle) : espaces, casse et accents ignorés,
 *  guillemets et ponctuation finale tolérés. Garde-fou : un agent ne propose jamais une phrase qu'il aurait inventée. */
export function inSource(phrase, source) {
  const n = s => fold(s).replace(/[«»"“”'’]/g, "").replace(/\s+/g, " ").trim().replace(/[.…!?,;:]+$/, "").trim();
  const p = n(phrase);
  return p.length >= 3 && n(source).includes(p);
}
