// Règles « Nos envies » (docs/nos-envies-v1.md, section 6), sans Firebase : partagées par l'app, le coach et les agents.
// Réponses : collection `envies`, un document par question (id = id du catalogue, ex. « lieu.type ») :
//   { v, libre, vu, cu, p: { claire: {v, libre}, julien: {v, libre} }, by, updatedAt }
//   v : CP/CC/CM → [ids de choix] ; CU → 1 à 5 ; JPA → { idChoix | "_" : "j"|"p"|"a" } ; CL → [ids dans l'ordre] ; CH → texte ; TL → (texte dans libre)
//   cu : "differents" | "nsp" (pastilles du curseur) ; vu : vue ou passée sans réponse ; p : réponses par partenaire (Tenues)
// Réglages d'une tuile : document `_tuile.<clé>` : { actif, pasPourNous, importance, budget, reussite, redhibitoire }
import { TUILES, QUESTIONS, NIVEAUX } from "./catalogue.js";

export const TBY = Object.fromEntries(TUILES.map(t => [t.k, t]));
export const QBY = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
export const POIDS = { essentiel: 60, details: 30, pro: 10 };
export const OLD2TILE = { vision: "mariage", lieu: "lieu", traiteur: "repas", photo: "photo", video: "video", musique: "musique", fleurs: "fleurs",
  tenues: "tenues", alliances: "tenues", beaute: "beaute", papeterie: "papeterie", transport: "invites", ceremonie: "ceremonie", hebergement: "invites", enfants: "invites" };
// Métier de prestataire → tuile principale (note de fit, « Vos [métier] »)
export const METIER2TILE = Object.fromEntries(TUILES.flatMap(t => t.metiers.map(m => [m, t.k])).filter(([m, k]) => !(m === "Traiteur" && k !== "repas")));

const visibleIn = (pays, list) => !list || !list.length || list.includes(pays || "FR");
export const visibleQ = (q, pays) => visibleIn(pays, q.pays);
export const visibleChoix = (q, pays) => (q.choix || []).filter(c => visibleIn(pays, c.pays));
export function questionsOf(tile, niveau, pays) {
  return QUESTIONS.filter(q => q.tuile === tile && (!niveau || q.niveau === niveau) && visibleQ(q, pays))
    .sort((a, b) => NIVEAUX.indexOf(a.niveau) - NIVEAUX.indexOf(b.niveau) || a.ordre - b.ordre);
}

const filled = v => (Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : v != null && String(v).trim() !== "");
/** Une réponse existe : un choix, un cran, un texte ou une photo (« vu » seul ne suffit pas). */
export const hasValue = a => !!a && (filled(a.v) || filled(a.libre) || filled(a.photos) || !!a.cu);
/** La réponse qui compte pour cette personne : la sienne sur une question par partenaire (avec le texte commun repris), sinon la commune. */
export function answerFor(q, doc, me) {
  if (!doc) return null;
  if (!q.parPartenaire) return doc;
  const mine = (doc.p && doc.p[me]) || {};
  return { ...mine, libre: [doc.libre, mine.libre].filter(filled).join("\n") || undefined, vu: doc.vu || mine.vu };
}
export const isAnswered = (q, A, me) => hasValue(answerFor(q, A[q.id], me));
export const isSeen = (q, A, me) => { const a = answerFor(q, A[q.id], me); return !!a && (hasValue(a) || !!a.vu); };

const vals = (A, id) => { const v = A[id] && A[id].v; return Array.isArray(v) ? v : []; };
/** Tuile grisée ? { gris, raison } : « Jamais » sur la 1re question, conditions (Officiant), choix « Pas pour nous » ; réactivable. */
export function tileGris(k, A) {
  const meta = A["_tuile." + k] || {};
  if (meta.actif) return { gris: false };
  if (meta.pasPourNous) return { gris: true, raison: "pasPourNous" };
  if (k === "officiant") {
    const types = vals(A, "ceremonie.types"), qui = vals(A, "ceremonie.officie");
    if (!types.includes("laique")) return { gris: true, raison: "pasLaique" };
    if (!qui.includes("un-officiant-professionnel")) return { gris: true, raison: qui.length ? "procheOfficie" : "officiantAChoisir" };
  }
  const q1 = QUESTIONS.find(q => q.tuile === k && q.niveau === "essentiel" && q.ordre === 1);
  if (q1 && q1.format === "JPA") {
    const v = (A[q1.id] && A[q1.id].v) || {};
    const keys = q1.choix && q1.choix.length ? q1.choix.map(c => c.id) : ["_"];
    if (keys.every(c => v[c] === "j")) return { gris: true, raison: "jamais" };
  }
  return { gris: false };
}
/** Le lendemain ne remonte que si un week-end ou un brunch est prévu. */
export const lendemainUtile = A => vals(A, "mariage.duree").some(c => c === "un-week-end" || c === "un-brunch-le-lendemain");

export function levelDone(k, niveau, A, me, pays) {
  const qs = questionsOf(k, niveau, pays);
  return qs.length > 0 && qs.every(q => isSeen(q, A, me));
}
/** Mot d'état d'une tuile (clé de FR.etats). */
export function tileState(k, A, me, pays, exploreKey) {
  if (tileGris(k, A).gris) return "gris";
  if (k === exploreKey) return "moment";
  const [e, d, p] = ["essentiel", "details", "pro"].map(n => levelDone(k, n, A, me, pays));
  if (k === "tenues" && !d) return "chacun";
  return e && d && p ? "complet" : d ? "brief" : e ? "esquissee" : "decouvrir";
}
/** Jauge globale (0 à 100) ou null sans aucune réponse : 60 % essentielles, 30 % détails, 10 % pro, tuiles grisées exclues. */
export function jauge(A, me, pays) {
  let score = 0, any = false;
  for (const n of NIVEAUX) {
    const qs = QUESTIONS.filter(q => q.niveau === n && visibleQ(q, pays) && !tileGris(q.tuile, A).gris);
    const ok = qs.filter(q => isAnswered(q, A, me)).length;
    if (ok) any = true;
    if (qs.length) score += POIDS[n] * ok / qs.length;
  }
  return any ? Math.max(1, Math.round(score)) : null;
}
/** « À explorer maintenant » (section 6.3) : { tuile, niveau, raison } ou null.
 *  ctx : { date (Date|null), today (Date), reserved (Set de métiers réservés), priorites ([clés de tuiles]), pays } */
export function explore(A, me, ctx) {
  const { date, today = new Date(), reserved = new Set(), priorites = [], pays } = ctx || {};
  const actives = TUILES.filter(t => !tileGris(t.k, A).gris && (t.k !== "lendemain" || lendemainUtile(A)));
  const isReserved = t => t.metiers.length && t.metiers.some(m => reserved.has(m));
  const todoE = actives.filter(t => !levelDone(t.k, "essentiel", A, me, pays));
  if (todoE.length) {
    if (!date) return { tuile: todoE[0].k, niveau: "essentiel", raison: "ordre" };
    const months = (date - today) / (30.44 * 864e5);
    const due = todoE.filter(t => t.remonte >= months && !isReserved(t));
    if (due.length) {
      const lieu = due.find(t => t.k === "lieu");
      if (lieu) return { tuile: "lieu", niveau: "essentiel", raison: "moment" };
      const prio = t => (priorites.includes(t.k) ? 0 : 1);
      due.sort((a, b) => (b.remonte - months) - (a.remonte - months) || prio(a) - prio(b) || a.ordre - b.ordre);
      return { tuile: due[0].k, niveau: "essentiel", raison: "moment" };
    }
    return { tuile: todoE.sort((a, b) => b.remonte - a.remonte || a.ordre - b.ordre)[0].k, niveau: "essentiel", raison: "avance" };
  }
  const todoD = actives.filter(t => !levelDone(t.k, "details", A, me, pays));
  if (!todoD.length) return null;
  const t = todoD.find(x => priorites.includes(x.k)) || todoD[0];
  return { tuile: t.k, niveau: "details", raison: "details" };
}
/** Prochain niveau d'une tuile et, dedans, la première question non vue (pour « Reprendre »). */
export function nextStep(k, A, me, pays) {
  for (const n of NIVEAUX) {
    const qs = questionsOf(k, n, pays);
    const i = qs.findIndex(q => !isSeen(q, A, me));
    if (i >= 0) return { niveau: n, index: i, started: i > 0 };
  }
  return null;
}
/** Réponse en texte lisible (coach, agents, synthèse). FR : textes du catalogue. */
export function answerText(q, a, FR) {
  if (!a) return "";
  const T = FR.questions[q.id] || {}, ch = { ...(T.choix || {}), ...(a.extra || {}) }, out = [];
  const v = a.v;
  if (q.format === "CU" && v) out.push(`${(T.crans || [])[v - 1] || v} (sur 5, de « ${T.poles[0]} » à « ${T.poles[1]} »)`);
  else if (q.format === "JPA" && v && typeof v === "object") out.push(Object.entries(v).map(([c, x]) => `${c === "_" ? "" : (ch[c] || c) + " : "}${FR.jpa[x] || x}`).join(" ; "));
  else if (q.format === "CL" && Array.isArray(v)) out.push(v.map((c, i) => `${i + 1}. ${ch[c] || c}`).join(", "));
  else if (Array.isArray(v)) out.push(v.map(c => (c === "les-deux" ? FR.cc.lesDeux : ch[c] || c)).join(", "));
  else if (v != null && String(v).trim()) out.push(String(v));
  if (a.cu) out.push(FR.cu[a.cu] || a.cu);
  if (a.libre && String(a.libre).trim()) out.push(String(a.libre).trim());
  return out.filter(Boolean).join(" · ");
}
