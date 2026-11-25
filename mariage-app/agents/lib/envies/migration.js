// Reprise des anciennes réponses (collection `brief`) dans le nouveau catalogue, selon docs/nos-envies-correspondance.md
// (validé par Julien le 20 novembre 2026). Fonction pure : la sauvegarde et l'écriture sont faites par scripts/migrate-envies.js.
import { QBY } from "./logic.js";

const PREV = "Réponse précédente : ";
const txt = d => ["commun", "claire", "julien"].map(k => (d[k] && String(d[k]).trim() ? String(d[k]).trim() : "")).filter(Boolean).join("\n");

/** @param briefDocs documents de `brief` ({id: "<cat>--<qid>", commun, choix, claire, julien, importance…})
 *  @returns {answers: {idQuestion: {v, libre}}, metas: {cléTuile: {...}}, archived: [{id, texte}]} */
export function migrateBrief(briefDocs, { p1 = "partenaire 1", p2 = "partenaire 2" } = {}) {
  const answers = {}, metas = {}, archived = [];
  const get = id => (answers[id] = answers[id] || {});
  const text = (id, t) => { if (!t) return; const a = get(id); a.libre = [a.libre, PREV + t].filter(Boolean).join("\n"); };
  const choose = (id, ...cs) => { const a = get(id), q = QBY[id]; a.v = [...new Set([...(a.v || []), ...cs.filter(c => (q.choix || []).some(x => x.id === c))])]; };
  const cran = (id, n) => { get(id).v = n; };
  const jpa = (id, c, x) => { const a = get(id); a.v = { ...(a.v || {}), [c]: x }; };
  // ch : choix de l'ancienne question ; t : son texte ; reste : choix sans équivalent (vont dans le texte)
  const R = {
    "vision--ambiance": (ch, t) => text("mariage.ambiance", t),
    "vision--style": (ch, t) => { choose("mariage.style", ...ch.map(slugOf)); text("mariage.style", t); },
    "vision--invites": "archive", "vision--periode": "archive", "vision--craintes": "archive",
    "vision--format": (ch, t) => {
      const m = { "Une journée": ["mariage.duree", "une-journee"], "Week-end complet": ["mariage.duree", "un-week-end"], "Brunch du lendemain": ["mariage.duree", "un-brunch-le-lendemain"],
        "Cérémonie laïque": ["ceremonie.types", "laique"], "Cérémonie religieuse": ["ceremonie.types", "religieuse"], "Mariage civil seul": ["ceremonie.types", "civile-en-mairie"] };
      ch.forEach(c => m[c] && choose(m[c][0], m[c][1])); text("mariage.duree", t);
    },
    "vision--moments": (ch, t) => text("mariage.moments", t),
    "vision--souvenirs": (ch, t) => text("mariage.pasvoulu", t),
    "vision--juliette": (ch, t) => text("invites.enfants", t),
    "vision--recit": (ch, t) => text("mariage.recit", t),
    "vision--arbitrage": (ch, t) => text("mariage.paquet", t),
    "lieu--region": (ch, t) => text("lieu.distance", t),
    "lieu--type": (ch, t) => { choose("lieu.type", ...ch.map(slugOf)); text("lieu.type", t); },
    "lieu--exclu": (ch, t) => { ch.forEach(c => jpa("lieu.exclusif", "_", c === "Indispensable" ? "a" : "p")); text("lieu.exclusif", t); },
    "lieu--dodo": (ch, t) => text("lieu.dormir", t),
    "lieu--traiteur": (ch, t) => { const m = { Indispensable: 5, "Préférable": 4, "Peu importe": 1 }; ch.forEach(c => m[c] && cran("lieu.imposes", m[c])); text("lieu.imposes", t); },
    "lieu--pluie": (ch, t) => text("lieu.tente", t),
    "lieu--horaires": (ch, t) => text("lieu.heure", t),
    "lieu--acces": (ch, t) => text("lieu.mobilite", t),
    "traiteur--format": (ch, t) => { const m = { "Grandes tablées à partager": "grandes-tablees" }; choose("repas.format", ...ch.map(c => m[c] || slugOf(c))); text("repas.format", t); },
    "traiteur--cuisine": (ch, t) => text("repas.cuisine", t),
    "traiteur--cocktail": (ch, t) => text("cocktail.duree", t),
    "traiteur--regimes": (ch, t) => text("repas.regimes", t),
    "traiteur--boissons": (ch, t) => {
      const m = { "Fournis par nous (droit de bouchon)": "nous-memes", "Fournis par le traiteur": "le-traiteur" };
      ch.forEach(c => (m[c] ? choose("bar.fournisseur", m[c]) : text("bar.fournisseur", c))); text("bar.fournisseur", t);
    },
    "traiteur--dessert": (ch, t) => { ch.forEach(c => (["Pièce montée", "Wedding cake", "Buffet de desserts"].includes(c) ? choose("gateau.forme", slugOf(c)) : text("gateau.forme", c))); text("gateau.forme", t); },
    "traiteur--brunch": (ch, t) => { ch.forEach(c => (c === "Oui" ? choose("lendemain.format", "brunch") : c === "Non" ? choose("lendemain.format", "rien") : text("lendemain.format", "Brunch le lendemain : " + c.toLowerCase()))); text("lendemain.format", t); },
    "traiteur--budgetpp": "archive",
    "photo--style": (ch, t) => { const m = { "Reportage naturel": "naturel-sur-le-vif", "Posé et classique": "pose-editorial", "Artistique, éditorial": "pose-editorial" }; ch.forEach(c => (m[c] ? choose("photo.style", m[c]) : text("photo.style", c))); text("photo.style", t); },
    "photo--couverture": (ch, t) => text("photo.jusqua", t),
    "photo--couple": (ch, t) => { const m = { "Avant le jour J": "avant-le-mariage", "Pendant le jour J": "le-jour-meme", "Le lendemain (day after)": "le-lendemain", "Pas de séance": "non" }; ch.forEach(c => m[c] && choose("photo.seance", m[c])); text("photo.seance", t); },
    "photo--groupes": (ch, t) => text("photo.groupes", t),
    "photo--aise": (ch, t) => { const m = { "Très à l'aise": 5, Moyennement: 3, "Pas du tout": 1 }; ch.forEach(c => m[c] && cran("photo.aise", m[c])); text("photo.aise", t); },
    "photo--livrables": (ch, t) => text("photo.livrables", t),
    "photo--refs": (ch, t) => text("photo.style", t),
    "video--envie": (ch, t) => { const m = { Indispensable: "a", "Si le budget le permet": "p", Non: "j" }; ch.forEach(c => m[c] && jpa("video.envie", "_", m[c])); text("video.envie", t); },
    "video--format": (ch, t) => {
      const f = { "Film court (3 à 5 min)": "clip-de-3-min", "Film long": "film-de-15-a-20-min", "Teaser réseaux sociaux": "formats-reseaux-sociaux" };
      const g = { "Discours en intégralité": "discours-en-entier", "Images de drone": "images-de-drone" };
      ch.forEach(c => (f[c] ? choose("video.format", f[c]) : g[c] ? jpa("video.garder", g[c], "a") : text("video.format", c))); text("video.format", t);
    },
    "video--style": (ch, t) => text("video.style", t),
    "video--discretion": (ch, t) => text("video.style", t),
    "musique--formule": (ch, t) => {
      const q = { DJ: "dj", "Groupe live": "groupe-live" }, l = { "Musiciens pour la cérémonie": "ceremonie", "Musique au cocktail": "cocktail" };
      ch.forEach(c => (q[c] ? choose("musique.qui", q[c]) : l[c] ? jpa("musique.live", l[c], "a") : text("musique.qui", c))); text("musique.qui", t);
    },
    "musique--styles": (ch, t) => text("musique.genres", t),
    "musique--ouverture": (ch, t) => text("musique.ouverture", t),
    "musique--animation": (ch, t) => { const m = { "Discrète, la musique suffit": 1, "Entre les deux": 3, "Ambianceur qui fait participer": 5 }; ch.forEach(c => m[c] && cran("musique.animateur", m[c])); text("musique.animateur", t); },
    "musique--moments": (ch, t) => text("musique.ouverture", t),
    "musique--fin": (ch, t) => text("lieu.heure", t),
    "fleurs--palette": (ch, t) => text("fleurs.couleurs", t),
    "fleurs--aimees": (ch, t) => text("fleurs.style", t),
    "fleurs--style": (ch, t) => { const m = { "Fleurs des champs": "champetre", Luxuriant: "romantique", "Épuré": "epure", "Fleurs séchées": "fleurs-sechees" }; ch.forEach(c => (m[c] ? choose("fleurs.style", m[c]) : text("fleurs.style", c))); text("fleurs.style", t); },
    "fleurs--quoi": (ch, t) => {
      const m = { "Bouquet de la mariée": "bouquet", Boutonnières: "boutonnieres", "Arche ou allée de cérémonie": "arche-de-ceremonie", "Centres de table": "centres-de-table", Voiture: "voiture" };
      ch.forEach(c => (m[c] ? jpa("fleurs.fleurir", m[c], "a") : text("fleurs.fleurir", c))); text("fleurs.fleurir", t);
    },
    "fleurs--deco": (ch, t) => text("fleurs.lumieres", t),
    "fleurs--diy": (ch, t) => { const m = { "Non, tout déléguer": 1, "Un peu": 3, "Oui, avec plaisir": 5 }; ch.forEach(c => m[c] && cran("fleurs.diy", m[c])); text("fleurs.diy", t); },
    "tenues--claire": (ch, t) => text("tenues.style", t && `Tenue de ${p1} : ${t}`),
    "tenues--julien": (ch, t) => text("tenues.style", t && `Tenue de ${p2} : ${t}`),
    "tenues--soiree": (ch, t) => { ch.forEach(c => (c === "Oui" ? choose("tenues.nombre", "une-pour-la-soiree-en-plus") : c === "Non" ? choose("tenues.nombre", "une") : text("tenues.nombre", "Deuxième tenue : " + c.toLowerCase()))); text("tenues.nombre", t); },
    "tenues--accessoires": (ch, t) => text("tenues.style", t),
    "tenues--cortege": (ch, t) => text("tenues.temoins", t),
    "tenues--budget": "archive",
    "alliances--metal": (ch, t) => { ch.forEach(c => text("tenues.alliances", "Métal : " + c)); text("tenues.alliances", t); },
    "alliances--assorties": (ch, t) => { ch.forEach(c => (c === "Assorties" ? choose("tenues.alliances", "assorties") : c === "Chacun son style" ? choose("tenues.alliances", "differentes") : text("tenues.alliances", c))); text("tenues.alliances", t); },
    "alliances--artisan": "archive",
    "alliances--gravure": (ch, t) => text("tenues.alliances", t),
    "beaute--pour": (ch, t) => { const m = { "Témoins": "les-temoins", Mamans: "les-meres" }; ch.forEach(c => choose("beaute.qui", m[c] || (c === "Juliette" ? "d-autres-proches" : "les-maries"))); text("beaute.qui", t); },
    "beaute--style": (ch, t) => text("beaute.rendu", t),
    "beaute--domicile": (ch, t) => { ch.forEach(c => c === "Oui" && text("beaute.ou", "sur place indispensable")); text("beaute.ou", t); },
    "beaute--retouches": (ch, t) => { ch.forEach(c => { if (c === "Oui") jpa("beaute.retouches", "_", "a"); else if (c === "Non") jpa("beaute.retouches", "_", "j"); else { jpa("beaute.retouches", "_", "p"); text("beaute.retouches", c); } }); text("beaute.retouches", t); },
    "papeterie--supports": (ch, t) => text("papeterie.pieces", t), "papeterie--papier": (ch, t) => text("papeterie.support", t),
    "papeterie--identite": (ch, t) => text("papeterie.style", t), "papeterie--reponses": (ch, t) => text("papeterie.site", t),
    "transport--voiture": (ch, t) => text("invites.voiture", t),
    "transport--navettes": (ch, t) => text("invites.transport", t),
    "transport--trajets": (ch, t) => text("lieu.ensemble", t),
    "ceremonie--type": (ch, t) => { const m = { "Civile seule": "civile-en-mairie", "Laïque": "laique", Religieuse: "religieuse" }; ch.forEach(c => m[c] && choose("ceremonie.types", m[c])); text("ceremonie.types", t); },
    "ceremonie--officiant": (ch, t) => { const m = { "Un officiant professionnel": "un-officiant-professionnel", "Un proche": "un-proche" }; ch.forEach(c => m[c] && choose("ceremonie.officie", m[c])); text("ceremonie.officie", t); },
    "ceremonie--message": (ch, t) => text("ceremonie.vivre", t), "ceremonie--intervenants": (ch, t) => text("ceremonie.vivre", t),
    "ceremonie--duree": (ch, t) => { ch.forEach(c => (["20 min", "45 min"].includes(c) ? choose("ceremonie.duree", slugOf(c)) : text("ceremonie.duree", c))); text("ceremonie.duree", t); },
    "ceremonie--roles": (ch, t) => text("ceremonie.vivre", t),
    "hebergement--combien": (ch, t) => text("invites.logement", t),
    "hebergement--qui": (ch, t) => { ch.forEach(c => text("invites.logement", "Qui paie : " + c)); text("invites.logement", t); },
    "hebergement--priorite": (ch, t) => text("invites.logement", t),
    "hebergement--noces": (ch, t) => text("lieu.dormir", t),
    "enfants--nombre": (ch, t) => text("invites.enfants", t),
    "enfants--formule": (ch, t) => { ch.forEach(c => text("invites.garde", c)); text("invites.garde", t); },
    "enfants--horaire": (ch, t) => text("invites.garde", t),
    "enfants--juliette": (ch, t) => text("invites.garde", t),
  };
  const META2TILE = { vision: "mariage", lieu: "lieu", traiteur: "repas", photo: "photo", video: "video", musique: "musique", fleurs: "fleurs", tenues: "tenues", alliances: "tenues",
    beaute: "beaute", papeterie: "papeterie", transport: "invites", ceremonie: "ceremonie", hebergement: "invites", enfants: "invites" };
  for (const d of briefDocs) {
    const [cat, qid] = String(d.id).split("--");
    if (qid === "_meta") {
      const k = META2TILE[cat]; if (!k) continue;
      const m = metas[k] = metas[k] || {};
      if (Number.isInteger(d.importance)) m.importance = Math.max(m.importance || 0, d.importance);
      for (const f of ["budget", "reussite", "redhibitoire"]) if (d[f] != null && d[f] !== "") m[f] = m[f] != null && f === "budget" ? m[f] + Number(d[f] || 0) : m[f] ? `${m[f]}\n${d[f]}` : d[f];
      continue;
    }
    const rule = R[d.id], t = txt(d), ch = Array.isArray(d.choix) ? d.choix : [];
    if (!t && !ch.length) continue;
    if (rule === "archive") { archived.push({ id: d.id, texte: [ch.join(", "), t].filter(Boolean).join(" · ") }); continue; }
    if (typeof rule === "function") rule(ch, t); else archived.push({ id: d.id, texte: [ch.join(", "), t].filter(Boolean).join(" · ") });
  }
  return { answers, metas, archived };
}
// identifiant d'un choix à partir de son libellé (même règle que scripts/envies-spec.py)
export function slugOf(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}
