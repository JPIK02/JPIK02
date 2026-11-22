// Invités v1 (docs/invites-v1.md, lot 1) : règles sans Firebase, partagées par l'app (src/invites-ui.js) et les tests.
// Modèle : une fiche par personne (`guests`, inchangée : coach, agent mail, budget, export s'y appuient) reliée à un foyer
// (`guests.foyerId` → `foyers/<id>` : nom, côté, cercle, étape de suivi, adresse, téléphone, e-mail, note). Une personne sans foyer
// compte comme un foyer d'une personne (« virtuel », id `g:<id de la personne>`) jusqu'au regroupement, validé dans l'app.

const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const COTES = ["claire", "julien", "commun"];
/** Étapes du suivi d'un foyer (3.2) ; « en attente » n'existe qu'à partir du faire-part. */
export const SUIVI = ["liste", "std", "fairepart", "repondu"];
export const coteDe = x => (COTES.includes(x && x.side) ? x.side : "commun");

/** Une personne « +1 » sans nom (accompagnant à nommer). */
export const estPlusUn = g => !!g.plusUn || /^\s*\+\s*1\b/.test(String(g.name || "")) || /^(accompagnant|conjoint|conjointe)\b/i.test(fold(g.name));

/** Les foyers : documents `foyers` + foyers virtuels d'une personne. */
export function foyersDe(guests = [], foyers = []) {
  const F = Object.fromEntries(foyers.map(f => [f.id, { ...f, personnes: [] }]));
  const out = [];
  for (const g of guests) {
    if (g.foyerId && F[g.foyerId]) F[g.foyerId].personnes.push(g);
    else out.push({ id: `g:${g.id}`, virtuel: true, nom: "", side: coteDe(g), cercle: g.group || "", etape: "liste", personnes: [g] });
  }
  const reels = Object.values(F).filter(f => f.personnes.length).map(f => ({ ...f, side: COTES.includes(f.side) ? f.side : coteDe(f.personnes[0]), cercle: f.cercle ?? (f.personnes[0].group || ""), etape: SUIVI.includes(f.etape) ? f.etape : "liste" }));
  return [...reels, ...out];
}

const nomDeFamille = n => { const m = String(n || "").trim().split(/\s+/); return m.length > 1 ? m[m.length - 1] : ""; };
const prenom = n => String(n || "").trim().split(/\s+/)[0] || "";
/** Nom affiché d'un foyer : le sien, sinon « Famille X », « A et B », ou le nom de la personne. */
export function nomFoyer(f) {
  if (f.nom && String(f.nom).trim()) return String(f.nom).trim();
  const nommes = f.personnes.filter(g => !estPlusUn(g));
  if (!nommes.length) return f.personnes.length ? "+1" : "Foyer";
  if (f.personnes.length === 1) return nommes[0].name;
  const noms = [...new Set(nommes.map(g => fold(nomDeFamille(g.name))).filter(Boolean))];
  if (noms.length === 1 && (nommes.length > 2 || f.personnes.some(g => g.enfant))) return `Famille ${nomDeFamille(nommes[0].name)}`;
  if (nommes.length === 1) return `${nommes[0].name} et son accompagnant`;
  if (nommes.length === 2) return `${prenom(nommes[0].name)} et ${nommes[1].name}`;
  return `${nommes[0].name} et ${nommes.length - 1} autres`;
}

/** Compte d'un foyer ou d'une liste : une personne = une place, un « +1 » sans nom aussi. */
export function compte(personnes = []) {
  const enfants = personnes.filter(g => g.enfant).length;
  return { places: personnes.length, adultes: personnes.length - enfants, enfants };
}

/** Moment de la page (6) : 2 dès qu'un foyer a son faire-part envoyé (ou a répondu), sinon 1. */
export const momentDe = (foyers = []) => (foyers.some(f => f.etape === "fairepart" || f.etape === "repondu") ? 2 : 1);
/** Avant le faire-part, une personne est « sur la liste », jamais « en attente ». */
export const statutAffiche = (g, foyer) => (foyer && (foyer.etape === "fairepart" || foyer.etape === "repondu") ? (g.rsvp === "oui" ? "oui" : g.rsvp === "non" ? "non" : "sans") : "liste");

/** Points de l'en-tête (3.1) : un point par place jusqu'à la cible (un pour deux au-delà de 150), colorés par côté, cerclés si libres. */
export function points(guests = [], cible = 0) {
  const n = guests.length, max = Math.max(n, +cible || 0), pas = max > 150 ? 2 : 1;
  const parCote = Object.fromEntries(COTES.map(c => [c, guests.filter(g => coteDe(g) === c).length]));
  const out = [];
  for (const c of COTES) for (let i = 0; i < Math.ceil(parCote[c] / pas); i++) out.push(c);
  const pris = out.length, cibleP = Math.ceil((+cible || 0) / pas);
  for (let i = pris; i < cibleP; i++) out.push("libre");
  // au-dessus de la cible : les points en trop sont marqués (les derniers posés)
  const trop = cible > 0 && n > cible ? Math.ceil((n - cible) / pas) : 0;
  return { points: out.map((c, i) => ({ c, trop: trop > 0 && i >= pris - trop && i < pris })), pas, parCote, libres: Math.max(0, (+cible || 0) - n), auDessus: cible > 0 && n > cible ? n - cible : 0 };
}

/** Cercles (groupes actuels), avec leurs personnes et foyers ; « Sans cercle » à la fin. */
export function cercles(foyers = []) {
  const m = new Map();
  for (const f of foyers) { const k = f.cercle || ""; if (!m.has(k)) m.set(k, []); m.get(k).push(f); }
  return [...m.entries()].map(([nom, fs]) => ({ nom, foyers: fs, personnes: fs.flatMap(f => f.personnes) }))
    .sort((a, b) => (a.nom === "") - (b.nom === "") || b.personnes.length - a.personnes.length || a.nom.localeCompare(b.nom));
}

/**
 * Foyers proposés (5.6), sans IA : parmi les personnes pas encore regroupées, même nom de famille dans le même cercle et le même côté ;
 * un « +1 » ou « +1 de X » rejoint X ; un enfant rejoint les adultes de son nom. Seulement les groupes de 2 personnes ou plus.
 * @returns [{nom, ids: [guestId], side, cercle}]
 */
export function proposerFoyers(guests = []) {
  const libres = guests.filter(g => !g.foyerId), groupes = new Map(), seuls = [];
  for (const g of libres) {
    if (estPlusUn(g)) { seuls.push(g); continue; }
    const nf = fold(nomDeFamille(g.name)); if (!nf) continue;
    const k = `${nf}|${g.group || ""}|${coteDe(g)}`;
    if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(g);
  }
  // « +1 de Marie Dupont » / « Accompagnant de Paul » : rattaché à la personne nommée, sinon laissé seul
  for (const p of seuls) {
    const m = /\b(?:de|d')\s*(.+)$/i.exec(String(p.name || "")), cible = m && fold(m[1]);
    // la personne nommée : nom complet d'abord, puis prénom ; à égalité, celle du même côté et du même cercle
    const cands = cible ? libres.filter(x => !estPlusUn(x) && (fold(x.name) === cible || fold(prenom(x.name)) === cible)) : [];
    const score = x => (cible.includes(" ") && fold(x.name) === cible ? 4 : 0) + (coteDe(x) === coteDe(p) ? 2 : 0) + ((x.group || "") === (p.group || "") ? 1 : 0);
    const g = cands.sort((a, b) => score(b) - score(a))[0];
    if (!g) continue;
    const k = [...groupes.entries()].find(([, l]) => l.includes(g));
    if (k) k[1].push(p); else groupes.set(`p|${g.id}`, [g, p]);
  }
  return [...groupes.values()].filter(l => l.length >= 2 && l.some(g => !g.enfant && !estPlusUn(g)))
    .map(l => ({ nom: nomFoyer({ personnes: l }), ids: l.map(g => g.id), side: coteDe(l[0]), cercle: l[0].group || "" }));
}

/** Carte d'action du moment 1 (3.1), la première qui s'applique. */
export function carteAction(foyers = [], guests = []) {
  const aRegrouper = proposerFoyers(guests);
  if (aRegrouper.length) return { k: "regrouper", n: aRegrouper.reduce((s, x) => s + x.ids.length, 0), foyers: aRegrouper.length };
  const sansAdresse = foyers.filter(f => !String(f.adresse || "").trim());
  if (sansAdresse.length) return { k: "adresses", n: sansAdresse.length, premier: sansAdresse[0].id };
  return foyers.length ? { k: "prets" } : null;
}
