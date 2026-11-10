// Nettoyage des propositions rendues par Claude, avant écriture dans inbox.
// Règle : on n'écrit jamais une valeur au mauvais format ; on l'omet.

export const TYPES = ["vendor", "quote", "task", "payment", "rdv", "rsvp"];
export const CATS = ["Lieu", "Traiteur", "Photographe", "Vidéaste", "Musique", "Fleuriste", "Tenues", "Alliances",
  "Coiffure & maquillage", "Papeterie", "Transport", "Officiant", "Hébergement", "Animation enfants", "Autre"];
export const PHASES = ["m12", "m9", "m6", "m4", "m2", "m1", "s1", "j", "apres"];

const isDate = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const isTime = v => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const toNum = v => {
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  if (typeof v !== "string") return undefined;
  const n = parseFloat(v.replace(/[\s€]/g, "").replace(",", "."));
  return isFinite(n) ? n : undefined;
};
const str = v => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : undefined);
const strList = v => { const a = (Array.isArray(v) ? v : []).map(x => str(x)).filter(Boolean).map(x => x.slice(0, 200)).slice(0, 15); return a.length ? a : undefined; };
const optList = v => { const a = (Array.isArray(v) ? v : []).map(o => o && str(o.label) ? { label: str(o.label).slice(0, 200), ...(toNum(o.prix) !== undefined ? { prix: toNum(o.prix) } : {}) } : null).filter(Boolean).slice(0, 15); return a.length ? a : undefined; };
const posInt = v => { const n = toNum(v); return n !== undefined && n > 0 ? Math.round(n) : undefined; };

const SPEC = {
  vendor: { name: str, cat: v => (CATS.includes(v) ? v : "Autre"), contact: str, tel: str },
  quote: { name: str, cat: v => (CATS.includes(v) ? v : "Autre"), prix: toNum, acompte: toNum,
    dateAcompte: v => (isDate(v) ? v : undefined), dateSolde: v => (isDate(v) ? v : undefined), contact: str, tel: str,
    validite: v => (isDate(v) ? v : undefined), invites: posInt, inclus: strList, options: optList, conditions: str, fichier: str },
  task: { title: str, owner: v => (["deux", "claire", "julien"].includes(v) ? v : "deux"),
    phase: v => (PHASES.includes(v) ? v : undefined), due: v => (isDate(v) ? v : undefined) },
  payment: { vendorName: str, amount: toNum, date: v => (isDate(v) ? v : undefined),
    kind: v => (["acompte", "solde"].includes(v) ? v : undefined) },
  rdv: { title: str, date: v => (isDate(v) ? v : undefined), time: v => (isTime(v) ? v : undefined), avec: str, lieu: str },
  rsvp: { name: str, rsvp: v => (["oui", "non", "attente"].includes(v) ? v : undefined), regime: str },
};
const REQUIRED = { vendor: ["name"], quote: ["name"], task: ["title"], payment: ["vendorName"], rdv: ["title", "date"], rsvp: ["name", "rsvp"] };

export function cleanPayload(type, payload = {}) {
  const spec = SPEC[type];
  if (!spec) return null;
  const out = {};
  for (const [k, fn] of Object.entries(spec)) {
    if (payload[k] === undefined || payload[k] === null || payload[k] === "") continue;
    const v = fn(payload[k]);
    if (v !== undefined) out[k] = v;
  }
  return REQUIRED[type].every(k => out[k] !== undefined) ? out : null;
}

export const cleanSubject = s => String(s || "").replace(/^(\s*(tr|fwd?|re|réf|ref)\s*:\s*)+/i, "").trim();
