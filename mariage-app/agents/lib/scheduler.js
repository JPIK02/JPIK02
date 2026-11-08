// Décide si un agent doit tourner maintenant, à partir de meta/planning.
// Le workflow GitHub tourne toutes les heures ; cette fonction est pure pour être testable.

export const DEFAULT_PLANS = {
  mail: { enabled: true, mode: "daily", h1: 7, h2: 19, day: 1 },
  analyse: { enabled: true, mode: "daily", h1: 8, h2: 20, day: 1 },
};

/** Heure et jour de la semaine à Paris pour une date donnée. */
export function parisClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23", weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = t => parts.find(p => p.type === t).value;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { hour: +get("hour"), dow, isoDate: `${get("year")}-${get("month")}-${get("day")}` };
}

/** Le planning prévoit-il un passage pendant cette heure-ci ? */
export function slotMatches(plan, clock) {
  if (!plan || plan.enabled === false) return false;
  switch (plan.mode) {
    case "hourly": return true;
    case "twice": return clock.hour === +plan.h1 || clock.hour === +plan.h2;
    case "weekly": return clock.dow === +plan.day && clock.hour === +plan.h1;
    default: return clock.hour === +plan.h1;
  }
}

/**
 * @param {object} plan      meta/planning[job] (fusionné avec le défaut)
 * @param {object} meta      meta/agent ou meta/analyse : {lastRunAt?, requestedAt?}
 * @param {Date} now
 * @returns {{run:boolean, reason:string}}
 */
export function shouldRun(plan, meta = {}, now = new Date(), { force = false } = {}) {
  if (force) return { run: true, reason: "forcé" };
  const last = +meta.lastRunAt || 0;
  const req = +meta.requestedAt || 0;
  if (req && req > last) return { run: true, reason: "demandé depuis l'app" };
  if (!slotMatches(plan, parisClock(now))) return { run: false, reason: "hors créneau" };
  // GitHub peut déclencher deux fois dans la même heure : on évite le doublon.
  if (now - last < 50 * 60 * 1000) return { run: false, reason: "déjà passé dans l'heure" };
  return { run: true, reason: "créneau du planning" };
}

const MONTH = 30 * 24 * 3600 * 1000;
/** Prestataires à (ré)analyser : non écartés, sans fiche, fiche > 30 j ou antérieure à une demande. */
export function vendorsToAnalyse(vendors, requestedAt = 0, now = Date.now()) {
  return vendors.filter(v => v.status !== "ecarte" &&
    (!v.fit || !v.fit.updatedAt || now - v.fit.updatedAt > MONTH || (requestedAt && v.fit.updatedAt < requestedAt)));
}
