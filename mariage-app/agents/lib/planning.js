// Planning v1 (docs/budget-planning-v1.md, section 4 ; tableau validé : docs/planning-migration.md) : règles sans Firebase,
// partagées par l'app (src/planning-ui.js) et les tests. Rien n'est réécrit en base : l'étape vient de la période `tasks.phase`
// (inchangée), le thème est calculé (`themeDe`) ; un champ `theme` n'est posé que si le couple le change.

const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les 9 étapes, dans l'ordre des périodes (clé = `tasks.phase`). */
export const ETAPES = [
  { k: "m12", nom: "Les fondations", phrase: "Le budget, la date, le lieu et les grands choix : tout le reste en découle." },
  { k: "m9", nom: "Les prestataires clés", phrase: "Traiteur, photographe, musique et officiant : les plus demandés se réservent tôt." },
  { k: "m6", nom: "Tenues, liste et site", phrase: "Les tenues, la liste de mariage et le site pour vos invités." },
  { k: "m4", nom: "Faire-part et détails", phrase: "Les faire-part, les alliances, le menu et la décoration." },
  { k: "m2", nom: "Mairie et confirmations", phrase: "Le dossier de mairie, les relances et le déroulé de la journée." },
  { k: "m1", nom: "Les derniers réglages", phrase: "Le nombre de couverts, le plan de table et les horaires avec chacun." },
  { k: "s1", nom: "La dernière semaine", phrase: "Les soldes, le kit du jour J et un peu de repos." },
  { k: "j", nom: "Le jour J", phrase: "Profiter : tout est confié à vos proches." },
  { k: "apres", nom: "Après le mariage", phrase: "Les remerciements, les locations et les souvenirs." },
];
export const ETAPE = Object.fromEntries(ETAPES.map((e, i) => [e.k, { ...e, n: i + 1 }]));

/** Thèmes d'une étape, avec le lien de leur groupe (vue de l'app). */
export const THEMES = {
  choix: { nom: "Les grands choix", lien: { go: "envies" } },
  lieu: { nom: "Le lieu", lien: { metier: "Lieu" } },
  ceremonie: { nom: "La cérémonie", lien: { tuile: "ceremonie" } },
  prestataires: { nom: "Les prestataires", lien: { go: "prestataires" } },
  tenues: { nom: "Tenues et beauté", lien: { metier: "Tenues" } },
  argent: { nom: "L'argent", lien: { go: "budget" } },
  invites: { nom: "Les invités", lien: { go: "invites" } },
  papeterie: { nom: "Faire-part et papeterie", lien: { tuile: "papeterie" } },
  mairie: { nom: "Mairie et papiers", lien: null },
  logistique: { nom: "Logistique", lien: { go: "jour-j" } },
};
export const ORDRE_THEMES = Object.keys(THEMES);

// Les 52 tâches du catalogue (tableau validé le 22/11/2026)
const CATALOGUE = {
  t01: "argent", t02: "choix", t03: "invites", t04: "ceremonie", t05: "lieu", t06: "choix", t07: "choix",
  t08: "prestataires", t09: "prestataires", t10: "prestataires", t11: "prestataires", t12: "ceremonie", t13: "papeterie", t14: "invites",
  t15: "tenues", t16: "tenues", t17: "prestataires", t18: "invites", t19: "invites", t20: "mairie", t21: "invites",
  t22: "papeterie", t23: "tenues", t24: "prestataires", t25: "papeterie", t26: "logistique", t27: "tenues", t28: "mairie",
  t29: "mairie", t30: "mairie", t31: "invites", t32: "tenues", t33: "logistique", t34: "ceremonie",
  t35: "invites", t36: "invites", t37: "mairie", t38: "prestataires", t39: "ceremonie", t40: "prestataires", t41: "tenues",
  t42: "argent", t43: "logistique", t44: "logistique", t45: "tenues", t46: "logistique",
  t47: "logistique", t48: "logistique", t49: "invites", t50: "logistique", t51: "mairie", t52: "prestataires",
};
const MOTS = [
  ["argent", /budget|payer|paiement|acompte|solde|€/],
  ["mairie", /mairie|notaire|bans|papiers|etat civil/],
  ["invites", /invite|plan de table|hebergement|rsvp|couverts/],
  ["papeterie", /faire.?part|papeterie|save.?the.?date|marque.?place/],
  ["tenues", /robe|costume|tenue|alliance|coiffure|maquillage|essayage/],
  ["lieu", /\blieu\b|salle|domaine|chateau/],
  ["ceremonie", /ceremonie|officiant|discours/],
  ["prestataires", /traiteur|photograph|videaste|video|\bdj\b|musique|musicien|fleur|prestataire|degustation/],
];

/** Thème d'une tâche : choisi, catalogue, réservation, mots du titre, prestataire relié, sinon logistique. */
export function themeDe(t = {}, vendors = []) {
  if (t.theme && THEMES[t.theme]) return t.theme;
  if (CATALOGUE[t.id]) return CATALOGUE[t.id];
  if (t.kind === "acompte" || t.kind === "solde") return "argent";
  if (t.kind === "contrat" || t.kind === "point") return "prestataires";
  const titre = fold(t.title);
  for (const [k, re] of MOTS) if (re.test(titre)) return k;
  if (t.vendorId) { const v = vendors.find(x => x.id === t.vendorId); return v && v.cat === "Lieu" ? "lieu" : "prestataires"; }
  return "logistique";
}

/** Une tâche pour qui ? « deux » apparaît sous chacun ; le filtre « Ensemble » n'existe plus. */
export const pourQui = (t, qui) => qui === "all" || (t.owner || "deux") === qui || (t.owner || "deux") === "deux";

/**
 * Étape courante : la première qui a des tâches non faites dont la fin n'est pas passée ;
 * si toutes sont faites, celle dont la période contient aujourd'hui. Sans date : la première étape avec des tâches non faites.
 * fin(k) : fin de l'étape (Date ou null sans date de mariage).
 */
export function etapeCourante(tasks = [], { fin = () => null, today = new Date() } = {}) {
  for (const e of ETAPES) {
    const f = fin(e.k), ouvertes = tasks.filter(t => t.phase === e.k && t.status !== "done");
    if (ouvertes.length && (!f || f >= today)) return e.k;
  }
  const dansPeriode = ETAPES.find(e => { const f = fin(e.k); return f && f >= today; });
  return dansPeriode ? dansPeriode.k : ETAPES[ETAPES.length - 1].k;
}

/** Avancement de chaque étape. */
export const avancement = (tasks = []) => Object.fromEntries(ETAPES.map(e => {
  const l = tasks.filter(t => t.phase === e.k);
  return [e.k, { fait: l.filter(t => t.status === "done").length, total: l.length, derniere: l.filter(t => t.status === "done").sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))[0] || null }];
}));

/**
 * « Prochainement » : tâches non faites et rendez-vous à venir dans les `jours` prochains jours, mêlés, triés par date.
 * due(t) : échéance d'une tâche (Date ou null) ; dateRdv(r) : date d'un rendez-vous.
 */
export function prochainement(tasks = [], rdv = [], { due, dateRdv, today = new Date(), jours = 60, max = 6 } = {}) {
  const fin = new Date(today); fin.setDate(fin.getDate() + jours);
  const items = [
    ...tasks.filter(t => t.status !== "done").map(t => ({ type: "tache", d: due(t), x: t })).filter(i => i.d && i.d >= today && i.d <= fin),
    ...rdv.map(r => ({ type: "rdv", d: dateRdv(r), x: r })).filter(i => i.d && i.d >= today && i.d <= fin),
  ];
  return items.sort((a, b) => a.d - b.d || (a.type === "rdv" ? -1 : 1)).slice(0, max);
}

/** Retard en jours (entier), 0 si à l'heure. */
export const joursDeRetard = (d, today = new Date()) => (d && d < today ? Math.floor((today - d) / 864e5) : 0);

/** Fichier .ics d'un rendez-vous (« Ajouter à mon téléphone »). Sans heure : journée entière. */
export function ics(r, { titre, lieu = "", note = "" } = {}) {
  const esc = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const d = String(r.date || "").replace(/-/g, ""), uid = `${r.id || d}@lamaelle`;
  let deb, fin;
  if (r.time && /^\d{1,2}:\d{2}$/.test(r.time)) {
    const [h, m] = r.time.split(":").map(Number), p2 = n => String(n).padStart(2, "0");
    deb = `DTSTART:${d}T${p2(h)}${p2(m)}00`; fin = `DTEND:${d}T${p2((h + 1) % 24)}${p2(m)}00`;
  } else {
    const n = new Date(`${r.date}T12:00:00`); n.setDate(n.getDate() + 1);
    deb = `DTSTART;VALUE=DATE:${d}`; fin = `DTEND;VALUE=DATE:${n.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lamaelle//FR", "BEGIN:VEVENT", `UID:${uid}`, deb, fin, `SUMMARY:${esc(titre || r.title)}`,
    ...(lieu ? [`LOCATION:${esc(lieu)}`] : []), ...(note ? [`DESCRIPTION:${esc(note)}`] : []), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/**
 * 3 créneaux libres pour une visite (4.7) : à partir d'après-demain et dans les 3 semaines, un par jour (mardi et jeudi 18 h 30,
 * samedi 10 h puis 14 h 30), jamais un jour qui a déjà un rendez-vous.
 */
export function creneauxLibres(rdv = [], { today = new Date(), n = 3, jours = 21 } = {}) {
  const pris = new Set(rdv.map(r => String(r.date || "")).filter(Boolean)), out = [];
  const p2 = x => String(x).padStart(2, "0");
  for (let i = 2; i <= jours && out.length < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i), k = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    if (pris.has(k)) continue;
    // un créneau par jour : samedi 10 h (14 h 30 un samedi sur deux), mardi et jeudi 18 h 30
    const h = d.getDay() === 6 ? (out.some(x => new Date(x.date + "T12:00:00").getDay() === 6) ? "14:30" : "10:00") : d.getDay() === 2 || d.getDay() === 4 ? "18:30" : null;
    if (h) out.push({ date: k, time: h });
  }
  return out;
}

const RE_VISITE = /visite|visiter|rendez-vous|\brdv\b|degustation|essai|essayage|rencontr|caler/;
/**
 * Action du coach sur une tâche (4.7), la première qui s'applique, ou null (pas de bouton).
 * mail : proposition d'origine (inbox) ; depasse : budget au-dessus de la limite ; aVenir : rendez-vous relié à venir.
 */
export function actionCoach(t = {}, { vendors = [], mail = null, depasse = false, aVenir = null } = {}) {
  if (t.status === "done") return null;
  const titre = fold(t.title), v = t.vendorId ? vendors.find(x => x.id === t.vendorId) : null;
  if (aVenir) return { k: "preparer", rdv: aVenir };
  if (t.source === "mail" && mail) return { k: "reponse" };
  if (RE_VISITE.test(titre)) return { k: "creneaux", vendor: v || null };
  if (themeDe(t, vendors) === "argent" || t.kind === "acompte" || t.kind === "solde") return { k: "budget", arbitrer: !!depasse };
  if (v) return { k: "metier", metier: v.cat };
  const lien = (THEMES[themeDe(t, vendors)] || {}).lien;
  if (lien && lien.metier) return { k: "metier", metier: lien.metier };
  return null;
}
