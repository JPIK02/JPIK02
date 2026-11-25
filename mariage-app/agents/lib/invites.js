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
  if (nommes.length === 3 && !noms.length) return `${nommes[0].name}, ${nommes[1].name} et ${nommes[2].name}`; // prénoms seuls
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

/* ---------- Lot 3 : les réponses (3.3, 5.3, 6) ---------- */
/** Moments par défaut (5.3) : les trois drapeaux historiques des fiches (`ceremonie`, `vin`, `diner`, invité sauf `false`). */
export const MOMENTS_DEFAUT = [{ k: "ceremonie", nom: "Cérémonie" }, { k: "vin", nom: "Vin d'honneur" }, { k: "diner", nom: "Dîner" }];
const HISTORIQUES = new Set(MOMENTS_DEFAUT.map(m => m.k));
/** Moments du mariage : `settings.moments` (renommés, ajoutés, retirés par le couple), sinon les trois par défaut. */
export function momentsDe(settings = {}) {
  const l = Array.isArray(settings.moments) ? settings.moments.filter(m => m && m.k && String(m.nom || "").trim()) : [];
  return l.length ? l.map(m => ({ k: String(m.k), nom: String(m.nom).trim() })) : MOMENTS_DEFAUT.map(m => ({ ...m }));
}
/** Invité à un moment : un moment historique sauf drapeau `false` ; un moment ajouté seulement si coché (`true`). */
export const inviteA = (g, k) => (HISTORIQUES.has(k) ? g[k] !== false : g[k] === true);
/** Vient à un moment : a répondu oui, est invité à ce moment et ne l'a pas décliné (`absentA`). */
export const vientA = (g, k) => g.rsvp === "oui" && inviteA(g, k) && !(g.absentA && g.absentA[k]);
export const envoye = f => !!f && (f.etape === "fairepart" || f.etape === "repondu");
export const repondu = g => g.rsvp === "oui" || g.rsvp === "non";

/** Étape d'un foyer après une réponse : tous ont répondu → « repondu » ; sinon « fairepart » (une réponse suppose l'invitation reçue). */
export function etapeApresReponse(f, personnes = f.personnes || []) {
  if (personnes.length && personnes.every(repondu)) return "repondu";
  if (f.etape === "repondu" || personnes.some(repondu)) return "fairepart";
  return f.etape || "liste";
}

/** Bilan des réponses (en-tête du moment 2) : personnes qui viennent, ne viennent pas, sans réponse (faire-part envoyé), pas encore invitées. */
export function reponses(foyers = []) {
  const r = { oui: 0, non: 0, sans: 0, pasEnvoye: 0, total: 0 };
  for (const f of foyers) for (const g of f.personnes) { r.total++; if (g.rsvp === "oui") r.oui++; else if (g.rsvp === "non") r.non++; else if (envoye(f)) r.sans++; else r.pasEnvoye++; }
  return r;
}
/** Statut d'un foyer pour les listes du moment 2. */
export function statutFoyer(f) {
  if (!envoye(f) && !f.personnes.some(repondu)) return "pasenvoye";
  const oui = f.personnes.filter(g => g.rsvp === "oui").length;
  if (f.personnes.some(g => !repondu(g))) return oui ? "partiel" : "sans";
  return oui ? "oui" : "non";
}

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Date limite de réponse (6) : réglage du couple, sinon proposée 2 mois avant le mariage ; null sans date. */
export function dateLimite(settings = {}) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(settings.dateLimiteReponse || "")) return { date: settings.dateLimiteReponse, proposee: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.date || "")) return null;
  const d = new Date(settings.date + "T12:00:00"); d.setMonth(d.getMonth() - 2);
  return { date: iso(d), proposee: true };
}

const JOUR = 864e5;
/**
 * « À relancer » (3.3.2, 6) : foyers au faire-part envoyé avec quelqu'un sans réponse, dès 15 jours avant la date limite ;
 * un foyer relancé (`relanceLe`) ne revient qu'après 7 jours.
 */
export function aRelancer(foyers = [], { limite = null, today = new Date() } = {}) {
  if (!limite) return [];
  const t = +today, lim = +new Date(limite + "T23:59:59");
  if (t < lim - 15 * JOUR) return [];
  return foyers.filter(f => envoye(f) && f.personnes.some(g => !repondu(g)) && !(+f.relanceLe && t - +f.relanceLe < 7 * JOUR));
}

/** Régimes comptés sans nom (5.8) : « Végétarien » ×2, « Sans gluten » ×1 ; textes voisins réunis (casse, accents, pluriel). */
export function regimesComptes(personnes = []) {
  const m = new Map();
  for (const g of personnes) for (const brut of String(g.regime || "").split(/[,;/+]|\bet\b/i)) {
    const t = brut.trim().replace(/\s+/g, " ").replace(/[.]+$/, ""); if (!t) continue;
    const k = fold(t).replace(/(ne|e)?s?$/, "");
    if (!m.has(k)) m.set(k, { label: t[0].toUpperCase() + t.slice(1), n: 0, noms: [] });
    const x = m.get(k); x.n++; x.noms.push(g.name);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}
/** Récapitulatif traiteur (3.3.3), calculé sans IA : les personnes qui viennent au dîner (ou au moment donné). */
export function recapTraiteur(guests = [], k = "diner") {
  const l = guests.filter(g => vientA(g, k)), c = compte(l);
  return { ...c, regimes: regimesComptes(l), avecRegime: l.filter(g => String(g.regime || "").trim()).length };
}
/** Texte du récapitulatif (brouillon de mail) : sans nom, sauf si le couple choisit de les ajouter. */
export function texteTraiteur(r, { couple = "", date = "", moment = "Dîner", noms = false } = {}) {
  const lignes = [`Bonjour,`, ``, `Voici le récapitulatif des repas pour notre mariage${date ? ` du ${date}` : ""} (${moment.toLowerCase()}) :`,
    `- ${r.adultes} adulte${r.adultes > 1 ? "s" : ""}`, `- ${r.enfants} enfant${r.enfants > 1 ? "s" : ""}`, `Soit ${r.places} couvert${r.places > 1 ? "s" : ""}.`];
  if (r.regimes.length) { lignes.push(``, `Régimes et allergies :`); for (const x of r.regimes) lignes.push(`- ${x.label} : ${x.n}${noms ? ` (${x.noms.join(", ")})` : ""}`); }
  else lignes.push(``, `Aucun régime particulier signalé à ce jour.`);
  lignes.push(``, `Nous vous préviendrons si ces chiffres changent.`, ``, couple ? `Bien à vous,\n${couple}` : `Bien à vous`);
  return lignes.join("\n");
}

/** « Par moment » (3.3.4) : invités et présents de chaque moment. */
export const parMoment = (guests = [], moments = MOMENTS_DEFAUT) =>
  moments.map(m => ({ ...m, invites: guests.filter(g => inviteA(g, m.k)).length, presents: guests.filter(g => vientA(g, m.k)).length }));

/** Message de relance d'un foyer : le texte du coach (« {foyer} » remplacé), sinon un texte fixe. */
export function messageRelance(modele, foyerNom, { couple = "", limite = "" } = {}) {
  const base = String(modele || "").trim() || `Bonjour {foyer} ! Nous espérons que vous allez bien. Pourriez-vous nous dire si vous serez des nôtres${limite ? ` avant le ${limite}` : ""} ? Cela nous aide beaucoup pour l'organisation.\n\n${couple}`;
  return base.includes("{foyer}") ? base.replaceAll("{foyer}", foyerNom) : `Bonjour ${foyerNom} !\n\n${base}`;
}

/* ---------- Lot 5 : coller une liste, un tableur (3.5, 8) ---------- */
/**
 * Foyers proposés par le coach à partir d'une liste collée, vérifiés : chaque nom doit figurer dans le texte (rien d'inventé),
 * un « +1 » sans nom reste un +1 ; côté et cercle seulement s'ils sont valides ; une personne déjà sur la liste est signalée (`dejaLa`).
 * @returns [{nom, side, cercle, personnes: [{name, enfant, plusUn, dejaLa}]}]
 */
export function nettoyerFoyersProposes(foyers = [], { texte = "", existants = [], side = null, cercle = "" } = {}) {
  const src = fold(texte).replace(/\s+/g, " "), vus = new Set(), deja = new Set(existants.map(g => fold(g.name)).filter(Boolean));
  const out = [];
  for (const f of Array.isArray(foyers) ? foyers : []) {
    const personnes = [];
    for (const p of Array.isArray(f && f.personnes) ? f.personnes : []) {
      const name = String((p && p.nom) || (p && p.name) || "").trim().replace(/\s+/g, " ").slice(0, 80);
      if (p && p.plusUn && (!name || /^\+\s*1$/.test(name))) { personnes.push({ name: "+1", plusUn: true, enfant: false }); continue; }
      if (!name) continue;
      // chaque mot du nom doit être dans le texte collé (l'ordre peut changer : « Martin Paul » → « Paul Martin »)
      if (!fold(name).split(" ").every(m => src.includes(m))) continue;
      const k = fold(name); if (vus.has(k)) continue; vus.add(k);
      personnes.push({ name, enfant: !!(p && p.enfant), plusUn: false, dejaLa: deja.has(k) });
    }
    if (!personnes.some(p => !p.plusUn)) continue;
    const s = f && COTES.includes(f.cote) ? f.cote : COTES.includes(side) ? side : "commun";
    const c = String((f && f.cercle) || cercle || "").trim().slice(0, 40);
    out.push({ nom: String((f && f.nom) || "").trim().slice(0, 120), side: s, cercle: c, personnes });
  }
  return out;
}

/** CSV (séparateur ; , ou tabulation, guillemets) → lignes de cellules. */
export function lireCsv(texte = "") {
  const t = String(texte).replace(/^﻿/, ""), premiere = t.split(/\r?\n/)[0] || "";
  const sep = [";", "\t", ","].sort((a, b) => premiere.split(b).length - premiere.split(a).length)[0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}
/** Lignes d'un tableur → texte à relire puis à donner au coach (une ligne par rangée, cellules séparées par « · »). */
export function texteTableur(rows = [], max = 400) {
  return rows.slice(0, max).map(r => r.map(x => String(x ?? "").trim()).filter(Boolean).join(" · ")).filter(Boolean).join("\n");
}
