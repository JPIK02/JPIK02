// Règles des récompenses de fin de niveau, sans Firebase (testables seules).
/** Ligne affichée sous une note recalculée : « Pour vous : … » si elle monte, « À vérifier : … » sinon. */
export function ligneNote(avant, apres, fit = {}) {
  const up = avant == null || apres >= avant;
  const t = String((up ? fit.forces : fit.vigilance)?.[0] || (up ? fit.vigilance : fit.forces)?.[0] || fit.verdict || "").trim();
  return t ? { type: up ? "pour" : "verifier", texte: t.replace(/\.$/, "") } : null;
}

/** Demandes de récompense restées sans réponse plus de 3 minutes (reprises par l'agent planifié). */
export const recompensesDues = (docs = [], now = Date.now()) => docs.filter(d => d.status === "demandee" && now - (+d.requestedAt || 0) > 3 * 60 * 1000);
