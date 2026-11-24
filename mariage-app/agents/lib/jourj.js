// Jour J (docs/jour-j-v1.md, lot 1) : règles sans Firebase, partagées par l'app (src/jourj-ui.js), le coach et les tests.
// Modèle : collection `schedule`, un document par moment. Champs historiques gardés tels quels : time (début « HH:MM »), title (nom),
// lieu, qui (détail), note, template. Ajoutés : fin, lieuPrecis, cle, exterieur, pluie, prestas [{vendorId, arrivee, tache}],
// objets [{id, label, qui, fait}], voit {invites, prestataires, temoins}, brouillon. Aucune migration : un ancien moment se lit tel quel.
// Rôles : `meta/jourj.roles` [{id, nom, guestId, personne, tel}] ; absents = rôles par défaut (écrits à la première modification).
// Une heure avant 6 h appartient à la nuit du mariage (après minuit).

export const DUREE_DEFAUT = 60;
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « HH:MM » → minutes depuis minuit du jour J (01:30 → 25 h 30). */
export function minDe(t) {
  const m = /^(\d{1,2})[:h](\d{2})/.exec(String(t || "").trim()); if (!m) return null;
  let h = +m[1]; const mn = +m[2]; if (h > 23 || mn > 59) return null; if (h < 6) h += 24;
  return h * 60 + mn;
}
/** minutes → « HH:MM ». */
export const hDe = mn => { const x = ((Math.round(mn) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
/** minutes → « 14 h », « 14 h 30 ». */
export const hLisible = mn => { const [h, m] = hDe(mn).split(":"); return `${+h} h${m !== "00" ? ` ${m}` : ""}`; };

export const VOIT_DEFAUT = { invites: true, prestataires: true, temoins: true };

/**
 * Moments triés par heure (sans heure : à la fin). Fin : champ `fin` s'il suit le début, sinon le début du moment suivant,
 * sinon une heure après (`finEstimee`).
 */
export function momentsDe(schedule = []) {
  const ms = schedule.map(s => ({
    id: s.id, nom: String(s.title || "").trim(), time: s.time || "", debut: minDe(s.time), finSaisie: minDe(s.fin),
    lieu: String(s.lieu || "").trim(), lieuPrecis: String(s.lieuPrecis || "").trim(), detail: String(s.qui || "").trim(), note: s.note || "",
    cle: !!s.cle, exterieur: !!s.exterieur, pluie: String(s.pluie || "").trim(), template: !!s.template,
    prestas: (Array.isArray(s.prestas) ? s.prestas : []).filter(p => p && p.vendorId),
    objets: (Array.isArray(s.objets) ? s.objets : []).filter(o => o && String(o.label || "").trim()),
    voit: { ...VOIT_DEFAUT, ...(s.voit || {}) }, brouillon: s.brouillon || null,
  }));
  ms.sort((a, b) => (a.debut ?? 1e9) - (b.debut ?? 1e9) || a.nom.localeCompare(b.nom));
  return ms.map((m, i) => {
    if (m.debut == null) return { ...m, fin: null, finEstimee: true };
    const suiv = ms.slice(i + 1).find(x => x.debut != null && x.debut > m.debut);
    if (m.finSaisie != null && m.finSaisie > m.debut) return { ...m, fin: m.finSaisie, finEstimee: false };
    return { ...m, fin: suiv ? suiv.debut : m.debut + DUREE_DEFAUT, finEstimee: true };
  });
}

/** Barre de la journée : de la première heure à la dernière fin, un segment par moment (en %), repères d'heure. */
export function barre(moments = []) {
  const ms = moments.filter(m => m.debut != null); if (!ms.length) return null;
  const debut = Math.min(...ms.map(m => m.debut)), fin = Math.max(...ms.map(m => m.fin)), span = Math.max(1, fin - debut);
  const pct = x => Math.max(0, Math.min(100, ((x - debut) / span) * 100));
  const pas = span > 12 * 60 ? 240 : span > 6 * 60 ? 180 : span > 3 * 60 ? 120 : 60, reperes = [];
  for (let h = Math.ceil(debut / pas) * pas; h <= fin; h += pas) reperes.push({ mn: h, x: pct(h) });
  return { debut, fin, pct, reperes, segments: ms.map(m => ({ id: m.id, x: pct(m.debut), w: Math.max(0.8, pct(m.fin) - pct(m.debut)), cle: m.cle })) };
}

/** L'heure proposée pour un moment glissé entre deux voisins (arrondie à 5 min) ; les autres moments ne bougent pas. */
export function heureEntre(avant, apres) {
  const r5 = x => Math.round(x / 5) * 5;
  if (avant != null && apres != null) return apres - avant >= 10 ? r5((avant + apres) / 2) : avant + 5;
  if (avant != null) return r5(avant + DUREE_DEFAUT);
  if (apres != null) return Math.max(6 * 60, r5(apres - DUREE_DEFAUT));
  return 14 * 60;
}

/* ---------- Rôles ---------- */
export const ROLES_DEFAUT = [
  { id: "mc", nom: "Maître de cérémonie" }, { id: "alliances", nom: "Garder les alliances" },
  { id: "contact", nom: "Contact des prestataires" }, { id: "deco", nom: "Ramener la déco et les cadeaux" },
];
export const rolesDe = meta => (Array.isArray(meta && meta.roles) ? meta.roles : ROLES_DEFAUT.map(r => ({ ...r })));
/** Personne d'un rôle : invité choisi, sinon nom libre ; null = à confier. */
export function personneDe(r, guests = []) {
  const g = r.guestId && guests.find(x => x.id === r.guestId);
  const nom = g ? g.name : String(r.personne || "").trim();
  return nom ? { nom, guest: g || null, tel: String(r.tel || "").trim() } : null;
}

/* ---------- Prestataires du jour ---------- */
const reserve = v => v && v.status === "reserve";
/** Lieu réservé (métier Lieu) : le premier, par date de réservation. */
export const lieuReserve = (vendors = []) => vendors.filter(v => reserve(v) && v.cat === "Lieu").sort((a, b) => (a.reserveLe || 0) - (b.reserveLe || 0))[0] || null;
/** Prestataires réservés présents ce jour-là (rattachés à au moins un moment). */
export function prestatairesDuJour(moments = [], vendors = []) {
  const ids = new Set(moments.flatMap(m => m.prestas.map(p => p.vendorId)));
  return vendors.filter(v => reserve(v) && ids.has(v.id));
}

/* ---------- À caler (5.2) ---------- */
/**
 * Trous, dans l'ordre du dossier : prestataire réservé sans heure d'arrivée, rôle sans personne, moment en extérieur sans plan pluie,
 * objet sans responsable, fiche prestataire envoyée puis modifiée (si `fiches` est donné). Calculé sans IA.
 */
export function aCaler({ moments = [], roles = [], vendors = [], guests = [], acces = null, fiches = null } = {}) {
  const out = [];
  for (const m of moments) for (const p of m.prestas) {
    const v = vendors.find(x => x.id === p.vendorId);
    if (reserve(v) && minDe(p.arrivee) == null) out.push({ k: "arrivee", momentId: m.id, moment: m.nom, vendorId: v.id, vendor: v.name });
  }
  for (const r of roles) if (!personneDe(r, guests)) out.push({ k: "role", roleId: r.id, role: r.nom });
  for (const m of moments) if (m.exterieur && !m.pluie) out.push({ k: "pluie", momentId: m.id, moment: m.nom });
  for (const m of moments) for (const o of m.objets) if (!String(o.qui || "").trim()) out.push({ k: "objet", momentId: m.id, moment: m.nom, objetId: o.id, objet: o.label });
  if (fiches) out.push(...fichesModifiees({ moments, roles, vendors, guests, acces: acces || {}, fiches }));
  return out;
}
/** Le premier trou d'un moment (affiché en rouge sur sa ligne). */
export const trouDe = (m, trous) => trous.find(t => t.momentId === m.id) || null;

export function compteurs({ moments = [], roles = [], vendors = [], guests = [] } = {}) {
  return { moments: moments.length, prestataires: prestatairesDuJour(moments, vendors).length, aConfier: roles.filter(r => !personneDe(r, guests)).length };
}

/* ---------- Coucher du soleil (5.3) : formule astronomique standard, sans appel externe ---------- */
const RAD = Math.PI / 180;
/** Instant du coucher du soleil (Date) pour une date « AAAA-MM-JJ » et des coordonnées ; null aux latitudes sans coucher. */
export function coucherSoleil(dateIso, lat, lng) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateIso || "")); if (!m || lat == null || lng == null) return null;
  const jd = Date.UTC(+m[1], +m[2] - 1, +m[3], 12) / 86400000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008), J = n - lng / 360;
  const M = (357.5291 + 0.98560028 * J) % 360, C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 180 + 102.9372) % 360, transit = 2451545.0 + J + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const dec = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD));
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null;
  return new Date((transit + Math.acos(cosW) / RAD / 360 - 2440587.5) * 86400000);
}
/** Minutes (heure locale du lieu, Europe/Paris par défaut) d'un instant, avec la règle « avant 6 h = nuit du jour J ». */
export function minutesLocales(d, timeZone = "Europe/Paris") {
  if (!d) return null;
  const s = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(d);
  return minDe(s);
}

/* Préfectures (une par département) et quelques villes de mariage : [département, nom, latitude, longitude]. Précision d'une à deux minutes. */
export const VILLES = [
  ["01", "Bourg-en-Bresse", 46.205, 5.225], ["02", "Laon", 49.564, 3.62], ["03", "Moulins", 46.566, 3.333], ["04", "Digne-les-Bains", 44.092, 6.236],
  ["05", "Gap", 44.559, 6.079], ["06", "Nice", 43.71, 7.262], ["07", "Privas", 44.735, 4.599], ["08", "Charleville-Mézières", 49.773, 4.72],
  ["09", "Foix", 42.965, 1.607], ["10", "Troyes", 48.297, 4.074], ["11", "Carcassonne", 43.213, 2.351], ["12", "Rodez", 44.35, 2.575],
  ["13", "Marseille", 43.296, 5.37], ["14", "Caen", 49.183, -0.371], ["15", "Aurillac", 44.926, 2.44], ["16", "Angoulême", 45.648, 0.156],
  ["17", "La Rochelle", 46.16, -1.151], ["18", "Bourges", 47.081, 2.399], ["19", "Tulle", 45.267, 1.772], ["2A", "Ajaccio", 41.919, 8.739],
  ["2B", "Bastia", 42.697, 9.451], ["21", "Dijon", 47.322, 5.041], ["22", "Saint-Brieuc", 48.514, -2.765], ["23", "Guéret", 46.171, 1.871],
  ["24", "Périgueux", 45.184, 0.721], ["25", "Besançon", 47.238, 6.024], ["26", "Valence", 44.933, 4.892], ["27", "Évreux", 49.027, 1.151],
  ["28", "Chartres", 48.446, 1.489], ["29", "Quimper", 47.996, -4.102], ["30", "Nîmes", 43.837, 4.36], ["31", "Toulouse", 43.605, 1.444],
  ["32", "Auch", 43.646, 0.586], ["33", "Bordeaux", 44.838, -0.579], ["34", "Montpellier", 43.611, 3.877], ["35", "Rennes", 48.117, -1.678],
  ["36", "Châteauroux", 46.811, 1.691], ["37", "Tours", 47.394, 0.685], ["38", "Grenoble", 45.188, 5.725], ["39", "Lons-le-Saunier", 46.675, 5.555],
  ["40", "Mont-de-Marsan", 43.894, -0.5], ["41", "Blois", 47.586, 1.336], ["42", "Saint-Étienne", 45.44, 4.387], ["43", "Le Puy-en-Velay", 45.043, 3.885],
  ["44", "Nantes", 47.218, -1.554], ["45", "Orléans", 47.903, 1.909], ["46", "Cahors", 44.448, 1.441], ["47", "Agen", 44.203, 0.616],
  ["48", "Mende", 44.518, 3.501], ["49", "Angers", 47.478, -0.563], ["50", "Saint-Lô", 49.116, -1.091], ["51", "Châlons-en-Champagne", 48.957, 4.365],
  ["52", "Chaumont", 48.111, 5.139], ["53", "Laval", 48.073, -0.77], ["54", "Nancy", 48.692, 6.184], ["55", "Bar-le-Duc", 48.773, 5.16],
  ["56", "Vannes", 47.658, -2.76], ["57", "Metz", 49.12, 6.176], ["58", "Nevers", 46.99, 3.159], ["59", "Lille", 50.629, 3.057],
  ["60", "Beauvais", 49.43, 2.081], ["61", "Alençon", 48.432, 0.091], ["62", "Arras", 50.291, 2.777], ["63", "Clermont-Ferrand", 45.778, 3.087],
  ["64", "Pau", 43.295, -0.371], ["65", "Tarbes", 43.233, 0.078], ["66", "Perpignan", 42.699, 2.895], ["67", "Strasbourg", 48.573, 7.752],
  ["68", "Colmar", 48.079, 7.358], ["69", "Lyon", 45.764, 4.836], ["70", "Vesoul", 47.622, 6.155], ["71", "Mâcon", 46.307, 4.828],
  ["72", "Le Mans", 48.006, 0.199], ["73", "Chambéry", 45.564, 5.918], ["74", "Annecy", 45.899, 6.129], ["75", "Paris", 48.857, 2.352],
  ["76", "Rouen", 49.443, 1.099], ["77", "Melun", 48.54, 2.66], ["78", "Versailles", 48.804, 2.13], ["79", "Niort", 46.323, -0.464],
  ["80", "Amiens", 49.894, 2.296], ["81", "Albi", 43.929, 2.148], ["82", "Montauban", 44.018, 1.355], ["83", "Toulon", 43.124, 5.928],
  ["84", "Avignon", 43.949, 4.806], ["85", "La Roche-sur-Yon", 46.67, -1.426], ["86", "Poitiers", 46.58, 0.34], ["87", "Limoges", 45.834, 1.262],
  ["88", "Épinal", 48.173, 6.45], ["89", "Auxerre", 47.798, 3.567], ["90", "Belfort", 47.638, 6.863], ["91", "Évry", 48.629, 2.441],
  ["92", "Nanterre", 48.892, 2.207], ["93", "Bobigny", 48.908, 2.439], ["94", "Créteil", 48.79, 2.455], ["95", "Cergy", 49.036, 2.076],
  ["06", "Cannes", 43.552, 7.017], ["13", "Aix-en-Provence", 43.529, 5.447], ["13", "Arles", 43.677, 4.63], ["64", "Biarritz", 43.483, -1.559],
  ["64", "Bayonne", 43.493, -1.475], ["33", "Arcachon", 44.658, -1.168], ["35", "Saint-Malo", 48.649, -2.026], ["14", "Deauville", 49.36, 0.075],
  ["51", "Reims", 49.258, 4.032], ["76", "Le Havre", 49.494, 0.108], ["29", "Brest", 48.39, -4.486], ["56", "Lorient", 47.748, -3.37],
  ["83", "Saint-Tropez", 43.27, 6.64], ["30", "Uzès", 44.012, 4.42], ["34", "Sète", 43.403, 3.697], ["84", "Gordes", 43.911, 5.2],
  ["13", "Saint-Rémy-de-Provence", 43.789, 4.832], ["24", "Sarlat-la-Canéda", 44.889, 1.216], ["17", "Cognac", 45.696, -0.329], ["21", "Beaune", 47.025, 4.84],
  ["74", "Chamonix", 45.924, 6.869], ["78", "Rambouillet", 48.644, 1.83],
  ["77", "Fontainebleau", 48.405, 2.701], ["60", "Chantilly", 49.194, 2.471], ["37", "Amboise", 47.412, 0.982], ["41", "Chambord", 47.616, 1.517],
].map(([dep, nom, lat, lng]) => ({ dep, nom, lat, lng }));

/**
 * Ville la plus proche d'un texte libre (« Château de X, 37400 Amboise ») : nom de ville trouvé dans le texte (le plus long l'emporte),
 * sinon le code postal → préfecture du département. null si rien ne correspond (pas de repère).
 */
export function villeDe(texte) {
  const t = ` ${fold(texte).replace(/[^a-z0-9]+/g, " ")} `; if (!t.trim()) return null;
  const parNom = VILLES.filter(v => t.includes(` ${fold(v.nom).replace(/[^a-z0-9]+/g, " ")} `)).sort((a, b) => b.nom.length - a.nom.length)[0];
  if (parNom) return parNom;
  const cp = /\b(\d{5})\b/.exec(String(texte || "")); if (!cp) return null;
  let dep = cp[1].slice(0, 2); if (dep === "20") dep = +cp[1].slice(0, 3) < 202 ? "2A" : "2B";
  return VILLES.find(v => v.dep === dep) || null;
}
/** Où situer le coucher du soleil : ville choisie (`choix`), sinon le lieu réservé (ville, adresse, nom), sinon la ville du mariage. */
export function villeSoleil({ choix = "", vendors = [], settings = {} } = {}) {
  if (choix) { const v = VILLES.find(x => x.nom === choix); if (v) return v; }
  const l = lieuReserve(vendors);
  return (l && (villeDe(l.ville) || villeDe(l.adresse) || villeDe(l.name))) || villeDe(settings.lieu) || villeDe(settings.ville) || null;
}

/* ---------- Lot 2 : partager (3.3) ---------- */
// `meta/jourj.acces` {texte, navettes} : accès, parking et navettes ; `meta/jourj.fiches` {vendorId: {envoyeLe, empreinte}} ;
// `meta/jourj.messages` {vendorId: {objet, corps, at}} (messages d'envoi rédigés par le coach, job `jourj` sujet `fiches`).
export const visiblesPar = (moments, qui) => moments.filter(m => m.voit[qui] !== false);
/** Contact sur place des prestataires : le rôle « Contact des prestataires » (id `contact`, sinon un rôle de ce nom). */
export function contactSurPlace(roles = [], guests = []) {
  const r = roles.find(x => x.id === "contact") || roles.find(x => /contact/i.test(x.nom || "")); if (!r) return null;
  const p = personneDe(r, guests); return p ? { nom: p.nom, tel: p.tel } : null;
}
/**
 * Fiche d'un prestataire réservé : ses moments (heure d'arrivée, tâche), la journée vue des prestataires, l'accès, le contact sur place.
 * Rien sur le budget, les devis ni les autres prestataires. `manque` : la première information qui empêche de l'envoyer.
 */
export function fichePrestataire(v, { moments = [], roles = [], guests = [], acces = {} } = {}) {
  const siens = moments.filter(m => m.prestas.some(p => p.vendorId === v.id)).map(m => {
    const p = m.prestas.find(x => x.vendorId === v.id);
    return { nom: m.nom, debut: m.debut, fin: m.fin, lieu: m.lieuPrecis || m.lieu, arrivee: minDe(p.arrivee), tache: String(p.tache || "").trim(), pluie: m.exterieur ? m.pluie : "" };
  });
  const arrivees = siens.map(s => s.arrivee).filter(x => x != null), contact = contactSurPlace(roles, guests);
  const fiche = {
    vendorId: v.id, nom: v.name || "", metier: v.cat || "", moments: siens, arrivee: arrivees.length ? Math.min(...arrivees) : null,
    journee: visiblesPar(moments, "prestataires").filter(m => m.debut != null).map(m => ({ nom: m.nom, debut: m.debut })),
    acces: String((acces && acces.texte) || "").trim(), contact,
  };
  fiche.manque = !siens.length ? "moments" : siens.some(s => s.arrivee == null) ? "arrivee" : !contact ? "contact" : null;
  return fiche;
}
/** Empreinte stable du contenu d'une fiche (pour « mise à jour depuis »). */
export function empreinteFiche(f) {
  const s = JSON.stringify([f.moments, f.journee, f.acces, f.contact]); let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
/** État d'une fiche : manque | prete | envoyee | maj. */
export function etatFiche(f, envoi) {
  if (f.manque) return { k: "manque", manque: f.manque };
  if (envoi && envoi.envoyeLe) return empreinteFiche(f) === envoi.empreinte ? { k: "envoyee", le: envoi.envoyeLe } : { k: "maj", le: envoi.envoyeLe };
  return { k: "prete", n: f.moments.length };
}
/** Fiches modifiées depuis leur envoi (5e trou de « À caler »). */
export function fichesModifiees({ moments = [], roles = [], vendors = [], guests = [], acces = {}, fiches = {} } = {}) {
  return vendors.filter(v => v.status === "reserve" && fiches[v.id] && fiches[v.id].envoyeLe)
    .filter(v => etatFiche(fichePrestataire(v, { moments, roles, guests, acces }), fiches[v.id]).k === "maj")
    .map(v => ({ k: "fiche", vendorId: v.id, vendor: v.name }));
}

/* ---------- 5.4 : un prestataire réservé, ajouté aux moments de son métier ---------- */
const MOTIFS_METIER = {
  Photographe: /./, "Vidéaste": /./, "Wedding planner": /./,
  Traiteur: /vin d|cocktail|aperitif|diner|repas|dejeuner|brunch|lendemain/, Bar: /vin d|cocktail|aperitif|diner|repas|soiree|bal|fete/,
  Musique: /ceremonie|benediction|soiree|bal|danse|fete/, Officiant: /ceremonie|benediction/, "Coiffure & maquillage": /prepar/,
  "Pâtissier": /gateau|dessert|piece montee|diner/, Fleuriste: /prepar|ceremonie|installation/, Transport: /navette|transfert|depart|retour/,
  "Animation enfants": /diner|repas|soiree/,
};
/** Les moments où un prestataire de ce métier intervient d'ordinaire (ceux où il n'est pas déjà). */
export function momentsPourMetier(metier, moments = [], vendorId = null) {
  const re = MOTIFS_METIER[metier]; if (!re) return [];
  return moments.filter(m => re.test(fold(m.nom)) && !m.prestas.some(p => p.vendorId === vendorId));
}

/* ---------- 5.4 : un trou encore là un mois avant → une tâche dans « Les derniers réglages » ---------- */
export const cleTrou = t => [t.k, t.momentId || t.roleId || "", t.vendorId || t.objetId || ""].join(":");
/** Vrai dans le dernier mois avant une date confirmée (jamais avec une date indicative). */
export function moisAvant(settings = {}, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(settings.date || "")); if (!m || settings.dateIndicative) return false;
  const d = Date.UTC(+m[1], +m[2] - 1, +m[3]), t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return t >= d - 30 * 864e5 && t <= d;
}

/* ---------- Lot 3 : le jour même (3.4) ---------- */
/**
 * L'heure « du jour J » (Europe/Paris) : avant 6 h, on est encore dans la nuit de la veille (date de la veille, minutes + 24 h).
 * @returns {date: "AAAA-MM-JJ", mn}
 */
export function heureDuJour(now = new Date(), timeZone = "Europe/Paris") {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now).map(x => [x.type, x.value]));
  let date = `${p.year}-${p.month}-${p.day}`, mn = +p.hour * 60 + +p.minute;
  if (+p.hour < 6) { const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day) - 864e5); date = d.toISOString().slice(0, 10); mn += 1440; }
  return { date, mn };
}
/** C'est le jour du mariage, de 6 h à la fin du dernier moment (jamais avec une date indicative ni sans moment). */
export function estLeJour(settings = {}, moments = [], now = new Date()) {
  if (!settings.date || settings.dateIndicative) return false;
  const h = heureDuJour(now), ms = moments.filter(m => m.debut != null); if (h.date !== String(settings.date).slice(0, 10) || !ms.length) return false;
  return h.mn >= 6 * 60 && h.mn <= Math.max(...ms.map(m => m.fin));
}
/** Le moment en cours, le suivant, la progression du moment en cours (0 à 1) et le délai avant le suivant (minutes). */
export function ecranDuJour(moments = [], mn) {
  const ms = moments.filter(m => m.debut != null);
  const courant = ms.filter(m => m.debut <= mn && mn < m.fin).sort((a, b) => b.debut - a.debut)[0] || null;
  const suivant = ms.find(m => m.debut > mn) || null;
  return { courant, suivant, progression: courant ? Math.min(1, (mn - courant.debut) / Math.max(1, courant.fin - courant.debut)) : 0, dans: suivant ? suivant.debut - mn : null };
}
export const duree = n => (n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${String(n % 60).padStart(2, "0")}` : ""}`);
/**
 * « On a du retard » : les moments pas encore commencés avancent de `de` minutes (début et fin saisie) ; les autres ne bougent pas.
 * @returns [{id, avant: {time, fin}, apres: {time, fin}}]
 */
export function aDecaler(moments = [], mn, de = 15) {
  return moments.filter(m => m.debut != null && m.debut > mn).map(m => ({
    id: m.id, avant: { time: m.time || "", fin: m.finSaisie != null ? hDe(m.finSaisie) : "" },
    apres: { time: hDe(m.debut + de), fin: m.finSaisie != null ? hDe(m.finSaisie + de) : "" },
  }));
}
/** Les numéros à appeler : maître de cérémonie, puis prestataires du moment en cours et du suivant, puis les autres rôles (4 au plus). */
export function aAppeler({ roles = [], guests = [], vendors = [], courant = null, suivant = null } = {}, max = 4) {
  const out = [], vu = new Set(), add = (nom, role, tel) => { const t = String(tel || "").trim(); if (!t || vu.has(t) || out.length >= max) return; vu.add(t); out.push({ nom, role, tel: t }); };
  const mc = roles.find(r => r.id === "mc"), p = mc && personneDe(mc, guests); if (p) add(p.nom, mc.nom, p.tel);
  for (const m of [courant, suivant].filter(Boolean)) for (const x of m.prestas) { const v = vendors.find(y => y.id === x.vendorId); if (v) add(v.name, v.cat || "", v.tel); }
  for (const r of roles) { const q = personneDe(r, guests); if (q) add(q.nom, r.nom, q.tel); }
  return out;
}

/* ---------- Lot 3 : liens des témoins et des invités (section 4) ---------- */
// `meta/jourj.liens` {temoins: {roleId: {token, creeLe, expire, partageLe?}}, invites: {token, creeLe, expire, partageLe?}} : lisible du couple ;
// `liens/<sha-256 du jeton>` {type: temoin|invites, roleId?, expire, revoque, compte} : lu par le serveur seulement (comme le lien d'adresse).
// `meta/jourj.retards` [{at, de, par, ids, avant: {id: {time, fin}}, annuleLe?}] : chaque décalage, qui et quand, annulable par le couple.
/** Expiration : deux jours après le mariage ; sans date, un an après la création. */
export function expirationJourJ(dateMariage, maintenant = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateMariage || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3] + 2, 22, 59, 59) : maintenant + 365 * 864e5;
}
export const lienJourJActif = (l, maintenant = Date.now()) => !!(l && (l.type === "temoin" || l.type === "invites") && !l.revoque && +l.expire > maintenant);
const prenom = s => String(s || "").trim().split(/\s+/)[0] || "";
/**
 * Ce que voit un témoin : tout le déroulé, les rôles (nom, téléphone), les prestataires du jour (nom, métier, téléphone, arrivée),
 * plans pluie, objets, accès ; jamais de montant, de devis, de note de prestataire ni le reste de l'app.
 */
export function vueTemoins({ schedule = [], vendors = [], guests = [], jourj = {}, settings = {}, roleId = "", noms = {} } = {}) {
  const ms = momentsDe(schedule), roles = rolesDe(jourj), moi = roles.find(r => r.id === roleId), p = moi && personneDe(moi, guests);
  const vs = prestatairesDuJour(ms, vendors), ville = villeSoleil({ choix: jourj.soleil, vendors, settings });
  return {
    type: "temoin", couple: [noms.p1, noms.p2].filter(Boolean).join(" et "), date: settings.dateIndicative ? null : settings.date || null,
    moi: { role: moi ? moi.nom : "", prenom: p ? prenom(p.nom) : "" },
    moments: ms.map(m => ({ id: m.id, nom: m.nom, debut: m.debut, fin: m.fin, lieu: m.lieuPrecis || m.lieu, detail: m.detail, note: m.note, cle: m.cle,
      exterieur: m.exterieur, pluie: m.pluie, objets: m.objets.map(o => ({ label: o.label, qui: o.qui || "", fait: !!o.fait })),
      prestas: m.prestas.map(x => { const v = vendors.find(y => y.id === x.vendorId); return v ? { nom: v.name, metier: v.cat || "", tel: String(v.tel || ""), arrivee: minDe(x.arrivee), tache: x.tache || "" } : null; }).filter(Boolean) })),
    roles: roles.map(r => { const q = personneDe(r, guests); return { id: r.id, nom: r.nom, personne: q ? q.nom : "", tel: q ? q.tel : "" }; }),
    prestataires: vs.map(v => ({ nom: v.name, metier: v.cat || "", tel: String(v.tel || ""), photo: v.cat === "Photographe" })),
    acces: (jourj.acces || {}).texte || "", navettes: (jourj.acces || {}).navettes || "",
    coucher: settings.date && ville ? minutesLocales(coucherSoleil(settings.date, ville.lat, ville.lng)) : null,
    retard: (() => { const r = (jourj.retards || []).filter(x => !x.annuleLe).at(-1); return r ? { at: r.at, de: r.de, par: r.par } : null; })(),
  };
}
/** Ce que voient les invités (lien du faire-part) : les moments visibles par eux, l'accès, les navettes. Aucun nom, aucun contact. */
export function vueInvites({ schedule = [], jourj = {}, settings = {}, noms = {} } = {}) {
  return {
    type: "invites", couple: [noms.p1, noms.p2].filter(Boolean).join(" et "), date: settings.dateIndicative ? null : settings.date || null,
    moments: visiblesPar(momentsDe(schedule), "invites").map(m => ({ nom: m.nom, debut: m.debut, fin: m.fin, lieu: m.lieuPrecis || m.lieu })),
    acces: (jourj.acces || {}).texte || "", navettes: (jourj.acces || {}).navettes || "",
  };
}
