// Plan de table (docs/invites-v1.md, lot 4, 3.4 et 6) : règles sans Firebase, partagées par l'app (src/plan-ui.js), l'agent de placement et les tests.
// Modèle : `guests.table` = nom de la table (inchangé : coach, export, ancienne vue s'y appuient) ; `guests.tableFixe` = placé à la main
// (jamais déplacé par le coach) ; collection `tables` {nom, places, forme: ronde|rect, honneur, enfants, ordre}. Une table nommée sur une
// fiche sans document est « virtuelle » (8 places, ronde) jusqu'à sa première modification. `meta/plan.separer` : paires « idA|idB » à séparer.
import { momentsDe, inviteA, vientA, foyersDe } from "./invites.js";

export const PLACES_DEFAUT = 8;
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const memeNom = (a, b) => fold(a) === fold(b);
const nomT = g => String(g.table || "").trim();

/** Tables : documents + noms trouvés sur les fiches ; table d'honneur d'abord, puis l'ordre, puis le nom (« Table 2 » avant « Table 10 »). */
export function tablesDe(docs = [], guests = []) {
  const out = docs.filter(t => String(t.nom || "").trim()).map(t => ({ ...t, nom: String(t.nom).trim(), places: Math.max(1, Math.round(+t.places || PLACES_DEFAUT)), forme: t.forme === "rect" ? "rect" : "ronde" }));
  for (const g of guests) { const n = nomT(g); if (n && !out.some(t => memeNom(t.nom, n))) out.push({ id: `n:${n}`, nom: n, places: PLACES_DEFAUT, forme: "ronde", virtuel: true }); }
  return out.sort((a, b) => (!!b.honneur - !!a.honneur) || ((a.ordre ?? 1e9) - (b.ordre ?? 1e9)) || a.nom.localeCompare(b.nom, "fr", { numeric: true }));
}

/** Clé du moment « dîner » (le dernier moment si le dîner a été retiré). */
export const cleDiner = settings => { const m = momentsDe(settings); return m.some(x => x.k === "diner") ? "diner" : m[m.length - 1].k; };
/**
 * Les personnes du plan : celles qui viennent au dîner (moment 2) ; au moment 1, brouillon avec toute la liste invitée au dîner
 * (sauf celles qui ont déjà dit non).
 */
export function concernes(guests = [], { settings = {}, moment = 1 } = {}) {
  const k = cleDiner(settings);
  return guests.filter(g => (moment === 2 ? vientA(g, k) : inviteA(g, k) && g.rsvp !== "non"));
}
export const occupants = (t, gens) => gens.filter(g => memeNom(nomT(g), t.nom));
export function resume(tables, gens) { const places = gens.filter(g => tables.some(t => memeNom(t.nom, nomT(g)))); return { places: places.length, total: gens.length, tables: tables.length, aPlacer: gens.length - places.length }; }

export const clePaire = (a, b) => [a, b].sort().join("|");
/**
 * Alertes (3.4), en une ligne chacune, calculées sans IA : table trop pleine, foyer séparé, enfant loin de ses parents
 * (sauf à une table d'enfants), deux personnes « à séparer » à la même table. `tables` = noms des tables concernées.
 */
export function alertes({ tables = [], gens = [], foyers = [], separer = [] } = {}) {
  const out = [], tableDe = g => { const n = nomT(g); return n ? (tables.find(t => memeNom(t.nom, n)) || null) : null; };
  for (const t of tables) { const n = occupants(t, gens).length; if (n > t.places) out.push({ k: "plein", tables: [t.nom], n, places: t.places }); }
  for (const f of foyers) {
    const ids = new Set(f.personnes.map(g => g.id)), p = gens.filter(g => ids.has(g.id)); if (p.length < 2) continue;
    const adultes = p.filter(g => !g.enfant), enfants = p.filter(g => g.enfant);
    const tA = [...new Set(adultes.map(g => tableDe(g)).filter(Boolean))];
    if (tA.length > 1) out.push({ k: "foyer", foyer: f, tables: tA.map(t => t.nom) });
    for (const e of enfants) { const te = tableDe(e); if (!te || te.enfants || !tA.length) continue; if (!tA.includes(te)) out.push({ k: "enfant", personne: e, foyer: f, tables: [te.nom, ...tA.map(t => t.nom)] }); }
  }
  for (const pr of separer) {
    const [a, b] = String(pr).split("|").map(id => gens.find(g => g.id === id)); if (!a || !b) continue;
    const ta = tableDe(a); if (ta && ta === tableDe(b)) out.push({ k: "separer", personnes: [a, b], tables: [ta.nom] });
  }
  return out;
}

/** Nombre de tables à créer pour n personnes. */
export const besoinTables = (n, parTable = PLACES_DEFAUT) => Math.max(1, Math.ceil(n / parTable));

/**
 * Placement proposé par le coach, vérifié (6) : seulement des personnes du plan et des tables existantes, jamais une personne placée
 * à la main, jamais au-delà des places, jamais deux personnes « à séparer » ensemble. Ce qui ne va pas est laissé de côté.
 * @returns [{nom, ids, pourquoi}] (une entrée par table, ids = nouvelles personnes placées)
 */
export function nettoyerPlacement(prop = [], { tables = [], gens = [], separer = [] } = {}) {
  const fixes = new Set(gens.filter(g => g.tableFixe && nomT(g)).map(g => g.id)), vus = new Set(), sep = new Set(separer);
  const libres = new Set(gens.filter(g => !fixes.has(g.id)).map(g => g.id));
  const out = [];
  for (const x of Array.isArray(prop) ? prop : []) {
    const t = tables.find(y => memeNom(y.nom, x && x.nom)); if (!t || out.some(o => o.nom === t.nom)) continue;
    const dejaLa = gens.filter(g => fixes.has(g.id) && memeNom(nomT(g), t.nom)).map(g => g.id), ids = [];
    for (const id of Array.isArray(x.ids) ? x.ids.map(String) : []) {
      if (!libres.has(id) || vus.has(id) || dejaLa.length + ids.length >= t.places) continue;
      if ([...dejaLa, ...ids].some(o => sep.has(clePaire(o, id)))) continue;
      ids.push(id); vus.add(id);
    }
    out.push({ nom: t.nom, ids, pourquoi: String((x && x.pourquoi) || "").trim().slice(0, 240) });
  }
  return out;
}

/** Données sans nom pour le coach : identifiants, foyer, cercle, côté, enfant, table déjà fixée. */
export function pourCoach({ tables = [], gens = [], guests = [], foyers = [], separer = [] } = {}) {
  const fs = foyersDe(guests, foyers), foyerDe = Object.fromEntries(fs.flatMap(f => f.personnes.map(g => [g.id, f.id])));
  return {
    tables: tables.map(t => ({ nom: t.nom, places: t.places, honneur: !!t.honneur, enfants: !!t.enfants })),
    personnes: gens.map(g => ({ id: g.id, foyer: foyerDe[g.id] || g.id, cercle: g.group || "", cote: g.side || "commun", enfant: !!g.enfant, fixe: g.tableFixe && nomT(g) ? nomT(g) : null })),
    separer: separer.filter(p => String(p).split("|").every(id => gens.some(g => g.id === id))),
  };
}
