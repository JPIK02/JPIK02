// Coût de l'IA : calibrage par fonction (modèle + effort) et compteur d'utilisation mensuel.
// Module sans dépendance : partagé par les agents et par l'assistant (copié dans functions/ au déploiement).

// Tarifs publics Anthropic, en dollars par million de tokens (vérifier sur la page Pricing s'ils changent).
// Écriture en cache = 1,25 × l'entrée ; recherche web = 10 $ les 1 000.
export const PRICES = {
  "claude-opus-5-5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { in: 2, out: 10, cacheRead: 0.2 },
};
export const SEARCH_USD = 0.01;
export const USD_EUR = 0.92; // conversion indicative pour l'affichage en euros

const OPUS = "claude-opus-5-5", SONNET = "claude-sonnet-5-5";

/** Niveaux proposés dans Réglages, par fonction. « equilibre » est le réglage par défaut. */
export const PROFILES = {
  coach:    { eco: { model: SONNET, effort: "low" },    equilibre: { model: OPUS, effort: "low" },    max: { model: OPUS, effort: "medium" } },
  brief:    { eco: { model: SONNET, effort: "medium" }, equilibre: { model: OPUS, effort: "medium" }, max: { model: OPUS, effort: "high" } },
  mail:     { eco: { model: SONNET, effort: "low" },    equilibre: { model: SONNET, effort: "medium" }, max: { model: OPUS, effort: "medium" } },
  analyse:  { eco: { model: SONNET, effort: "low", maxSearches: 2 }, equilibre: { model: SONNET, effort: "medium", maxSearches: 3 }, max: { model: OPUS, effort: "medium", maxSearches: 4 } },
  synthese: { eco: { model: SONNET, effort: "low" },    equilibre: { model: OPUS, effort: "low" },    max: { model: OPUS, effort: "medium" } },
  // décrire et ranger des images d'épingles : Sonnet suffit, Opus en Max
  pinterest: { eco: { model: SONNET, effort: "low" },   equilibre: { model: SONNET, effort: "low" },  max: { model: OPUS, effort: "low" } },
};
export const FEATURES = Object.keys(PROFILES);
export const DEFAULT_BUDGET_EUR = 20;

/** Réglage d'une fonction à partir de meta/ia ({ niveaux: { coach: "eco", … }, budget }). */
export function profileFor(cfg, feature) {
  const lvl = cfg?.niveaux?.[feature];
  const p = PROFILES[feature] || PROFILES.coach;
  return { niveau: p[lvl] ? lvl : "equilibre", ...(p[lvl] || p.equilibre) };
}

/** Coût en dollars d'une réponse de l'API (champ usage), au tarif du modèle qui a réellement répondu. */
export function costOf(model, usage = {}) {
  const p = PRICES[model] || PRICES[String(model || "").replace(/-\d{8}$/, "")] || PRICES[OPUS];
  const M = 1e6;
  return ((usage.input_tokens || 0) * p.in + (usage.cache_creation_input_tokens || 0) * p.in * 1.25
    + (usage.cache_read_input_tokens || 0) * p.cacheRead + (usage.output_tokens || 0) * p.out) / M
    + (usage.server_tool_use?.web_search_requests || 0) * SEARCH_USD;
}

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

/** Objet à fusionner dans usage/<mois> (increment = FieldValue.increment du SDK utilisé). */
export function usagePatch(feature, res, increment) {
  const u = res?.usage || {}, usd = costOf(res?.model, u);
  const f = {
    usd: increment(usd), calls: increment(1),
    in: increment((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0)),
    cached: increment(u.cache_read_input_tokens || 0),
    out: increment(u.output_tokens || 0),
    searches: increment(u.server_tool_use?.web_search_requests || 0),
  };
  return { usd: increment(usd), f: { [feature]: f }, updatedAt: Date.now() };
}

/** Enregistre une réponse dans usage/<mois>. Ne bloque jamais l'appel en cas d'échec. */
export async function recordUsage(db, increment, feature, res) {
  try { await db.doc(`usage/${monthKey()}`).set(usagePatch(feature, res, increment), { merge: true }); }
  catch (e) { console.error("[usage] non enregistré :", e.message); }
}

/** Budget du mois dépassé ? (en euros, d'après le compteur) */
export function overBudget(cfg, usage) {
  const budget = +cfg?.budget || DEFAULT_BUDGET_EUR;
  return (usage?.usd || 0) * USD_EUR >= budget;
}
