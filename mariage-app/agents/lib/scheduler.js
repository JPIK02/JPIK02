// Décide si un agent doit tourner maintenant, à partir de meta/planning.
// Le workflow GitHub tourne toutes les 10 minutes ; cette fonction est pure pour être testable.

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
  // Le workflow passe plusieurs fois dans l'heure : un seul passage par créneau.
  if (now - last < 50 * 60 * 1000) return { run: false, reason: "déjà passé dans l'heure" };
  return { run: true, reason: "créneau du planning" };
}

const MONTH = 30 * 24 * 3600 * 1000;
/** Prestataires dont les notes de visite ont changé depuis leur dernière fiche. */
export const vendorsRequested = vendors =>
  vendors.filter(v => v.status !== "ecarte" && (+v.fitRequestedAt || 0) > (+(v.fit && v.fit.updatedAt) || 0));

/** Prestataires à (ré)analyser : non écartés, sans fiche, fiche > 30 j, antérieure à une demande ou à des notes de visite. */
export function vendorsToAnalyse(vendors, requestedAt = 0, now = Date.now()) {
  return vendors.filter(v => v.status !== "ecarte" &&
    (!v.fit || !v.fit.updatedAt || now - v.fit.updatedAt > MONTH || (requestedAt && v.fit.updatedAt < requestedAt)
      || (+v.fitRequestedAt || 0) > v.fit.updatedAt));
}

/**
 * La synthèse des envies est-elle à refaire ? Oui si l'app a signalé un changement (envies ou réglages)
 * après la dernière synthèse, et que ce changement date d'au moins `quiet` (on attend la fin de la saisie).
 */
export function profilDue(analyse = {}, profil = {}, now = Date.now(), quiet = 5 * 60 * 1000) {
  const req = +analyse.profilRequestedAt || 0;
  return req > (+profil.updatedAt || 0) && now - req >= quiet;
}

/** Semaine ISO, ex. « 2026-W46 » (heure de Paris). */
export function isoWeek(date = new Date()) {
  const { isoDate } = parisClock(date);
  const d = new Date(isoDate + "T12:00:00Z"), day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Point de la semaine : le lundi à partir de 8 h (Paris) s'il n'est pas encore fait, ou sur demande depuis l'app. */
export function hebdoDue(hebdo = {}, now = new Date()) {
  if ((+hebdo.requestedAt || 0) > (+hebdo.at || 0)) return true;
  const c = parisClock(now);
  return c.dow === 1 && c.hour >= 8 && hebdo.week !== isoWeek(now);
}

/** Visites du jour liées à un prestataire, à relancer à partir de 18 h (une seule fois). */
export function visitsToFollow(rdvs, vendors, clock) {
  if (clock.hour < 18) return [];
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return rdvs.filter(r => r.date === clock.isoDate && !r.followupAt).map(r => {
    const v = vendors.find(x => fold(x.name) && (fold(r.avec) === fold(x.name) || fold(r.title).includes(fold(x.name))));
    return v ? { r, v } : null;
  }).filter(Boolean);
}
