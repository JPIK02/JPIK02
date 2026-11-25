// Onglet « Nos envies » (docs/nos-envies-v1.md, lot 1) : onglet, page d'une tuile, écran de question (tous formats).
// Aucun texte de question ici : ils viennent de agents/lib/envies/fr.js. L'app fournit ses outils via makeEnvies(ctx).
import { TUILES, FAMILLES, NIVEAUX } from "../agents/lib/envies/catalogue.js";
import { FR } from "../agents/lib/envies/fr.js";
import { TBY, QBY, OLD2TILE, questionsOf, visibleChoix, answerFor, hasValue, isSeen, tileGris, tileState, levelDone, jauge, explore, nextStep, lendemainUtile, answerText, levelStarted, levelCount, tileNom } from "../agents/lib/envies/logic.js";
import { pendingFor, confirmData } from "../agents/lib/envies/reperees.js";

// Textes d'interface de l'onglet (à traduire avec fr.js)
const UI = {
  label: "Nos envies", connait: p => `Lamaelle vous connaît à ${p} %`, apprend: "Lamaelle apprend à vous connaître",
  racontez: "Racontez-nous votre mariage", priorites: "Vos priorités", synthese: "Lire la synthèse complète",
  moment: "C'est le moment", commencer: "Commencer", reprendre: "Reprendre", minutes: n => `${n} min`,
  toutIci: "Tout au même endroit", briefs: "Briefs prestataires", briefsN: n => (n ? `${n} prêt${n > 1 ? "s" : ""} à envoyer` : "À préparer"),
  inspis: "Toutes vos inspirations", inspisN: (n, pin) => `${n} photo${n > 1 ? "s" : ""}${pin ? " · Pinterest relié" : ""}`,
  remonte: m => (m >= 99 ? "À faire dès maintenant" : `À réserver vers ${m} mois avant`), suivis: (n, m) => `${n} ${m} suivi${n > 1 ? "s" : ""}`,
  fait: "Fait", modifier: "Modifier", questions: n => `${n} question${n > 1 ? "s" : ""}`,
  vosInspis: m => `Vos inspirations ${m}`, nourrissent: m => `Elles nourrissent la note des ${m}.`, ajouter: "Ajouter",
  vos: m => `Vos ${m}`, provisoires: "Notes provisoires : elles s'affinent après l'essentiel.", aucun: m => `Pas encore de ${m} : ajoutez-en depuis l'onglet Prestataires.`,
  ia: "L'analyse est faite par une IA. Elle éclaire votre choix, elle ne décide pas pour vous.",
  brief: m => `Brief ${m}`, briefPret: "Prêt à envoyer", briefBientot: "Prêt dès les détails remplis", envoyer: "Envoyer",
  briefTenueT: "Brief de ma tenue", briefTenuePret: a => `Prêt à envoyer · ${a} ne le voit pas`, briefTenueEnCours: "Le coach le rédige : environ une minute",
  briefTenueP: a => `Pour votre boutique, à partir de vos réponses · ${a} ne le verra pas`, briefTenueGo: "Préparer",
  // raison courte sous le mot d'état d'une tuile grisée ou conditionnelle (grille de l'onglet)
  raisonsCourtes: { selonCeremonie: "Selon votre cérémonie", officiantAChoisir: "Selon votre cérémonie", pasLaique: "Pas de cérémonie laïque", procheOfficie: "Un proche officie", vousOfficiez: "Vous officiez", lendemain: "Selon la durée choisie" },
  nSurN: (n, t) => `${n} question${n > 1 ? "s" : ""} sur ${t}`,
  pasPourNous: "Pas pour nous", reactiver: "Réactiver cette tuile", pasPourNousQ: "Ce n'est pas pour nous",
  raisons: { pasPourNous: "Vous l'avez mise de côté.", jamais: "Vous avez répondu « Jamais » à la première question.", pasLaique: "Pas de cérémonie laïque prévue (tuile Cérémonie).",
    procheOfficie: "Un proche officie (tuile Cérémonie).", vousOfficiez: "Vous officiez vous-mêmes (tuile Cérémonie).", officiantAChoisir: "Dites d'abord qui officie, dans la tuile Cérémonie.",
    selonCeremonie: "Selon votre cérémonie : répondez d'abord à la tuile Cérémonie." },
  vosPrio: "Vos priorités pour cette tuile", importance: "Importance", budgetCible: "Budget cible (€)", reussite: "Ce qui en fera une vraie réussite", redhib: "Ce qui serait rédhibitoire",
  IMPORT: ["Secondaire", "Utile", "Important", "Très important", "Essentiel"],
  sur: (n, t) => `${n} sur ${t}`, sertA: "Sert à : ", autre: "Dire ou écrire autre chose", ecrire: "Écrire ou dicter ici…", photo: "Ajouter une photo",
  passer: "Passer", suivant: "Suivant", terminer: "Terminer", fermer: "Fermer et revenir à la tuile", ajouterOption: "+ Ajouter", nouvelleOption: "Votre option",
  glisser: "Faites glisser pour choisir", chiffre: "Un chiffre ou une fourchette", classer: "Touchez dans l'ordre de vos priorités", effacer: "Recommencer",
  pourTa: p => `Votre réponse, ${p}`, secreteQ: a => ` · secrète : ${a} ne la voit pas`,
  // tenue secrète (lot 4) : l'autre ne voit que l'avancement
  votreSecrete: a => `Votre tenue est secrète : ${a} ne voit ni vos réponses, ni vos photos, ni vos prestataires de tenue.`, montrer: a => `Montrer ma tenue à ${a}`,
  montree: a => `Votre tenue est visible par ${a}.`, tenueDe: p => `Tenue de ${p} · secrète`, tenueDeVue: p => `Tenue de ${p}`,
  avancement: (n, ess, pr) => [n ? `${n} réponse${n > 1 ? "s" : ""}` : "Pas encore commencée", ess ? "essentiel fait" : "", pr ? `${pr} prestataire${pr > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · "), finTitre: (t, n) => `${t} · ${n}, c'est fait`, finJauge: "Lamaelle vous connaît mieux", continuer: n => `Continuer avec ${n.charAt(0).toLowerCase() + n.slice(1)}`, plusTard: "Plus tard",
  retour: "Nos envies",
  compris: "Voilà ce que nous avons compris :", cestCa: "C'est ça", corriger: "Corriger", enregistrer: "Enregistrer", merci: "Noté, merci",
  relit: "Lamaelle relit vos réponses…", relitNotes: m => `et recalcule la note de vos ${m}`, erreur: "La récompense n'a pas pu être préparée. Réessayez plus tard : vos réponses sont bien enregistrées.", reessayer: "Réessayer",
  recalcules: m => `Vos ${m}, recalculés`, pourVous: "Pour vous : ", aVerifier: "À vérifier : ", chercher: m => `Voulez-vous que le coach cherche des ${m} pour vous ?`, chercherBtn: "Demander au coach",
  points: n => `+${n} point${n > 1 ? "s" : ""}`, briefPretT: m => `Votre brief ${m} est prêt`, questionsPretes: "Vos questions à poser sont prêtes", voirFiche: "Voir la fiche",
  notees: n => `${n} envie${n > 1 ? "s" : ""} notée${n > 1 ? "s" : ""} par le coach`, aConfirmer: "À confirmer", dejaNote: "Déjà noté par le coach", dapres: "D'après : ",
  sources: { coach: "votre conversation avec le coach", visite: "vos notes de visite", pinterest: "Pinterest" }, noteesP: "Elles comptent dès que vous les confirmez.", rienANoter: "Tout est confirmé, merci.",
  continuerBrief: (n, m) => `Continuer avec ${n.charAt(0).toLowerCase() + n.slice(1)} · votre brief ${m} à la clé`, comprisTile: "Ce que nous avons compris", archive: "Vos réponses précédentes", archiveP: "Ces réponses ne correspondent à aucune question du nouveau questionnaire. Le coach les connaît toujours.",
};
const WHO = { essentiel: 20, details: 25, pro: 25 }; // secondes par question, pour la durée affichée
// Métier → pluriel, pour « Vos photographes », « Elles nourrissent la note des photographes »
const METIER_PL = { Lieu: "lieux", Traiteur: "traiteurs", Photographe: "photographes", "Vidéaste": "vidéastes", Musique: "musiciens et DJ", Fleuriste: "fleuristes",
  Tenues: "boutiques de tenues", Alliances: "bijoutiers", "Coiffure & maquillage": "coiffeurs et maquilleurs", Papeterie: "papetiers", Transport: "transporteurs",
  Officiant: "officiants", "Hébergement": "hébergements", "Animation enfants": "animateurs", Bar: "bars", "Pâtissier": "pâtissiers", "Wedding planner": "wedding planners", "Agence de voyage": "agences de voyage" };
// Icône au trait de chaque tuile (zone d'image sans photo) : 24 × 24, trait en --coral-ui (styles.css, .ev-ic)
export const TILE_ICON = {
  mariage: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
  lieu: '<path d="M4 20V9l4-3 4 3 4-3 4 3v11z"/><path d="M10 20v-5h4v5M3 20h18"/>',
  ceremonie: '<path d="M5 20v-9a7 7 0 0 1 14 0v9M3 20h18M9 20v-7a3 3 0 0 1 6 0v7"/>',
  officiant: '<path d="M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6zM12 6v13.5"/>',
  cocktail: '<path d="M5 4h14l-7 8zM12 12v8M8 20h8M8.5 8h7"/>',
  repas: '<path d="M6 3v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 11v10M8 3v5M17 3c-2 2-2.5 6-.5 8H17v10"/>',
  bar: '<path d="M10 3h4v4l2 3v11H8V10l2-3zM8 14h8"/>',
  gateau: '<path d="M5 20h14v-6H5zM7.5 14v-4h9v4M10 10V7h4v3M12 7V4.5"/>',
  photo: '<path d="M4 8h4l2-2.5h4L16 8h4v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  video: '<path d="M3 7h12v10H3zM15 10.5l6-3v9l-6-3"/>',
  musique: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  fleurs: '<path d="M12 21v-9M7 4l2.5 3L12 3.5 14.5 7 17 4v4a5 5 0 0 1-10 0zM12 17c-1.5-2-4.5-2.5-6-1.5M12 19c1.5-2 4.5-2.5 6-1.5"/>',
  papeterie: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
  tenues: '<path d="M10 5.5a2 2 0 1 1 2 2v1.5M12 9l-9 7h18z"/>',
  beaute: '<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V21M9.5 21h5M10 7.5a2.5 2.5 0 0 1 2-1.5"/>',
  voyage: '<path d="M3 12l18-8-7 17-3-7zM11 14l4-4"/>',
  invites: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.5 5.5 5.8"/>',
  lendemain: '<path d="M4 10h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 11.5h1.5a2 2 0 0 1 0 4H16M8 3.5v3M12 3.5v3"/>',
  planner: '<path d="M6 5h12v16H6zM9.5 3.5h5v3h-5zM9 13l2 2 4-4"/>',
};
// Anciennes catégories du moodboard dont le sens ne tombe pas dans une seule tuile : leurs photos ne s'affichent dans aucune tuile
// tant qu'elles n'ont pas été rangées à nouveau (`rangeeLe`, agents/ranger-inspirations.js) : la photo du gâteau, rangée dans
// « traiteur » puis dans « repas » par la migration, ne doit pas illustrer « Repas »
const AMBIGUES = new Set(["traiteur"]);
const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

export function makeEnvies(ctx) {
  const { S, esc } = ctx;
  let cArr = null, cMap = {};
  const A = () => { if (S.envies !== cArr) { cArr = S.envies; cMap = Object.fromEntries((S.envies || []).map(d => [d.id, d])); } return cMap; };
  const me = () => ctx.meKey() || "claire";
  const pays = () => S.settings.pays || "FR";
  const tName = k => tileNom(k, FR, pays());
  const metier = k => { const t = TBY[k]; return t && t.metiers[0] ? METIER_PL[t.metiers[0]] || t.metiers[0].toLowerCase() : tName(k).toLowerCase(); };
  const inspTile = x => OLD2TILE[x.cat] || (TBY[x.cat] ? x.cat : "mariage");
  // une photo ne s'affiche que dans la tuile où elle est rangée (jamais via une ancienne catégorie ambiguë)
  const ambigue = x => AMBIGUES.has(x.cat) || (AMBIGUES.has(x.ancienneCat) && !x.rangeeLe); // rangée par la migration, pas par vous
  const inspOf = k => S.inspirations.filter(x => x.thumb && !ambigue(x) && inspTile(x) === k).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const icon = k => `<svg class="ev-ic" viewBox="0 0 24 24" aria-hidden="true">${TILE_ICON[k] || TILE_ICON.mariage}</svg>`;
  // zone d'image (tuiles, carte « À explorer », page de tuile) : l'icône au trait de la tuile, pour le moment sans photo
  // (choix de Julien du 21/11/2026 ; les photos restent dans « Vos inspirations » de chaque tuile)
  const placeholder = (k, cls = "") => `<span class="ev-ph ev-ph-ic ${cls}" aria-hidden="true">${icon(k)}</span>`;
  // un trait par niveau : plein si terminé, à moitié s'il est commencé
  const traits = k => `<span class="ev-tr" aria-hidden="true">${NIVEAUX.map(n => `<i class="${levelDone(k, n, A(), me(), pays()) ? "on" : levelStarted(k, n, A(), me(), pays()) ? "half" : ""}"></i>`).join("")}</span>`;
  // raison courte d'une tuile grisée ou conditionnelle
  const raisonCourte = k => { const G = tileGris(k, A()); if (G.gris) return UI.raisonsCourtes[G.raison] || ""; return k === "lendemain" && !lendemainUtile(A()) ? UI.raisonsCourtes.lendemain : ""; };
  const exploreNow = () => {
    const reserved = new Set(S.vendors.filter(v => v.status === "reserve").map(v => v.cat));
    const prios = (S.profil && Array.isArray(S.profil.priorites) ? S.profil.priorites : []).map(p => OLD2TILE[p.cat] || p.cat);
    return explore(A(), me(), { date: ctx.wDate(), today: ctx.today(), reserved, priorites: prios, pays: pays() });
  };
  const duree = (k, n) => Math.max(1, Math.round(questionsOf(k, n, pays()).length * WHO[n] / 60));

  /* ---------- Récolte passive (section 6.7) : envies repérées par le coach, à confirmer ---------- */
  const pend = () => pendingFor(S.envies_reperees || [], A(), me(), pays());
  const repOf = qid => pend().find(r => r.q === qid) || null;
  const repDate = at => (at ? new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");
  const repSrc = r => { const v = r.source === "visite" && S.vendors.find(x => x.id === r.ref); return v ? `${UI.sources.visite} (${v.name})` : UI.sources[r.source] || r.source; };
  const repLine = r => `<span class="ev-rep-o">${UI.dapres}« ${esc(r.phrase)} » · ${esc(repSrc(r))}${r.at ? ` · ${repDate(r.at)}` : ""}</span>`;
  const repBtns = r => S.canWrite ? `<div class="qs-pa"><button class="btn sm ghost-l" data-act="repok" data-id="${r.id}">${UI.cestCa}</button><button class="link" data-act="repfix" data-id="${r.id}">${UI.corriger}</button></div>` : "";
  const repCard = (r, withTile) => { const q = QBY[r.q], T = FR.questions[q.id];
    return `<div class="ev-rep">${withTile ? `<span class="qs-k">${esc(tName(q.tuile))}</span>` : ""}<b>${esc(T.libelle)}</b><span class="ev-rep-a">${esc(answerText(q, r, FR))}</span>${repLine(r)}${repBtns(r)}</div>`; };
  // « C'est ça » : la réponse est écrite dans `envies` (elle compte alors), l'envie repérée est close
  function repConfirm(r) {
    const { data, fields } = confirmData(r, A()[r.q]);
    ctx.saveEnvie(r.q, data, [...fields, "by", "updatedAt"]);
    ctx.saveDoc(`envies_reperees/${r.id}`, { status: "confirmee", closedAt: Date.now() });
    S.envDirty = S.envDirty || {}; S.envDirty[QBY[r.q].tuile] = true;
  }
  const repClose = r => { if (r && S.canWrite) ctx.saveDoc(`envies_reperees/${r.id}`, { status: "close", closedAt: Date.now() }); };

  /* ---------- 4.1 L'onglet ---------- */
  function vMain() {
    const pr = S.profil || {}, fr = (S.briefs || {}).filRouge || {};
    const phrase = ctx.couplePhrase(), j = jauge(A(), me(), pays());
    const prios = [...new Set((Array.isArray(pr.priorites) ? pr.priorites : []).map(p => OLD2TILE[p.cat] || p.cat).filter(k => TBY[k]))].slice(0, 3);
    const head = `<section class="ev-head">
      <div class="ev-top">${ctx.headTop()}</div>
      ${phrase ? `<button class="ev-phrase" data-act="envview" data-v="synth">« ${esc(phrase)} »</button>` : `<button class="ev-phrase" data-act="qr" data-do="chatbrief">${UI.racontez}</button>`}
      <div class="ev-j"><span>${j ? UI.connait(j) : UI.apprend}</span>${j ? `<span class="ev-bar" aria-hidden="true"><i style="width:${j}%"></i></span>` : ""}</div>
      ${prios.length ? `<div class="ev-prios"><span>${UI.priorites}</span>${prios.map(k => `<button class="chip" data-act="envtile" data-k="${k}">${esc(tName(k))}</button>`).join("")}</div>` : ""}
      ${pr.resume || fr.titre ? `<button class="link ev-syn" data-act="envview" data-v="synth">${UI.synthese}</button>` : ""}</section>`;
    const ex = exploreNow();
    const exH = ex ? `<button class="ev-now" data-act="envstart" data-k="${ex.tuile}" data-n="${ex.niveau}">${placeholder(ex.tuile, "sq")}
      <span class="ev-now-b"><span class="ev-tag">${UI.moment}</span><b>${esc(tName(ex.tuile))}</b><span class="ev-now-p">${esc(FR.tuiles[ex.tuile].pourquoi)}</span>
      <span class="ev-now-f"><span>${esc(FR.niveaux[ex.niveau].nom)} · ${UI.minutes(duree(ex.tuile, ex.niveau))}</span><span class="btn sm primary">${nextStep(ex.tuile, A(), me(), pays())?.started || levelStarted(ex.tuile, ex.niveau, A(), me(), pays()) ? UI.reprendre : UI.commencer}</span></span></span></button>` : "";
    const fams = FAMILLES.map(f => { const ts = TUILES.filter(t => t.famille === f);
      return `<section class="ev-fam"><h3 class="home-h">${esc(FR.familles[f])}</h3><div class="ev-tiles">${ts.map((t, i) => {
      const st = tileState(t.k, A(), me(), pays(), ex && ex.tuile), gris = st === "gris", rc = raisonCourte(t.k);
      const seule = i === ts.length - 1 && i % 2 === 0; // seule sur sa ligne : toute la largeur, au format horizontal
      return `<button class="ev-tile ${gris ? "gris" : ""} ${seule ? "large" : ""}" data-act="envtile" data-k="${t.k}">${placeholder(t.k)}<span class="ev-tile-b"><b>${esc(tName(t.k))}</b>${traits(t.k)}<span class="ev-st st-${st}">${esc(FR.etats[st])}</span>${rc ? `<span class="ev-why">${esc(rc)}</span>` : ""}</span></button>`;
    }).join("")}</div></section>`; }).join("");
    const nb = ctx.briefsReadyCount(), nI = S.inspirations.length, pin = S.pinterest && (S.pinterest.boards || []).length;
    const all = `<section class="ev-fam"><h3 class="home-h">${UI.toutIci}</h3><div class="ev-rows">
      <button class="ev-row" data-act="briefsmenu"><b>${UI.briefs}</b><span>${UI.briefsN(nb)}</span>${ctx.CHEV}</button>
      <button class="ev-row" data-act="envview" data-v="mood"><b>${UI.inspis}</b><span>${nI ? UI.inspisN(nI, pin) : UI.ajouter}</span>${ctx.CHEV}</button></div></section>`;
    const np = pend().length;
    const repH = np ? `<div class="ev-rows ev-rep-rows"><button class="ev-row" data-act="envview" data-v="notees"><b>${UI.notees(np)}</b><span>${UI.aConfirmer}</span>${ctx.CHEV}</button></div>` : "";
    return `<div class="ev">${head}${exH}${repH}${fams}${all}</div>`;
  }

  /* ---------- 4.2 La page d'une tuile ---------- */
  function vTile(k) {
    const t = TBY[k]; if (!t) return vMain();
    const G = tileGris(k, A()), step = nextStep(k, A(), me(), pays());
    const vend = S.vendors.filter(v => t.metiers.includes(v.cat) && v.status !== "ecarte");
    const m = metier(k), meta = A()["_tuile." + k] || {}, dis = S.canWrite ? "" : "disabled";
    const lvl = NIVEAUX.map(n => {
      const qs = questionsOf(k, n, pays()), done = levelDone(k, n, A(), me(), pays()), next = step && step.niveau === n;
      const c = levelCount(k, n, A(), me(), pays()), commence = c.n > 0 && !done;
      if (next) return `<div class="ev-lvl next"><b>${esc(FR.niveaux[n].nom)}</b><p>${esc(FR.niveaux[n].phrase)}</p><span class="ev-lvl-m">${commence ? UI.nSurN(c.n, c.total) : `${UI.questions(qs.length)} · ${UI.minutes(duree(k, n))}`}</span>
        <button class="btn primary" data-act="envstart" data-k="${k}" data-n="${n}" ${G.gris ? "disabled" : ""}>${commence ? UI.reprendre : UI.commencer}</button></div>`;
      return `<button class="ev-lvl-row" data-act="envstart" data-k="${k}" data-n="${n}" data-i="0"><span class="ev-dot ${done ? "on" : ""}" aria-hidden="true"></span><b>${esc(FR.niveaux[n].nom)}</b><span>${done ? `${UI.fait} · ${UI.modifier}` : commence ? UI.nSurN(c.n, c.total) : `${UI.questions(qs.length)} · ${UI.minutes(duree(k, n))}`}</span>${ctx.CHEV}</button>`;
    }).join("");
    const ins = inspOf(k).slice(0, 3);
    const brief = ctx.briefFor(k);
    const essDone = levelDone(k, "essentiel", A(), me(), pays());
    return `<div class="ev-page">
      <div class="ev-cover">${placeholder(k, "cov")}<button class="ev-back" data-act="envview" data-v="main" aria-label="${UI.retour}">${ctx.BACK_SVG}</button>
        <div class="ev-cover-b"><h2>${esc(tName(k))}</h2><span>${UI.remonte(t.remonte)}${t.metiers.length ? ` · ${UI.suivis(vend.length, m)}` : ""}</span></div></div>
      ${G.gris ? `<div class="ev-gris"><b>${UI.pasPourNous}</b><span>${esc(UI.raisons[G.raison] || "")}</span>${S.canWrite ? `<button class="btn sm" data-act="envactif" data-k="${k}">${UI.reactiver}</button>` : ""}</div>` : ""}
      ${(() => { const r = recOf(k, "essentiel"); return r && r.phrase ? `<section class="ev-sec ev-compris"><span class="qs-k">${UI.comprisTile}</span><p>${esc(r.phrase)}</p></section>` : ""; })()}
      ${(() => { const rs = pend().filter(r => QBY[r.q].tuile === k); return rs.length ? `<section class="ev-sec"><h3>${UI.dejaNote}</h3><p class="ev-note">${UI.noteesP}</p>${rs.map(r => repCard(r, false)).join("")}</section>` : ""; })()}
      <div class="ev-lvls">${lvl}</div>
      ${t.metiers.length || ins.length ? `<section class="ev-sec"><div class="ev-sec-h"><h3>${esc(UI.vosInspis(k === "mariage" ? "" : m))}</h3>${S.canWrite ? `<button class="link" data-act="envphoto" data-k="${k}">${UI.ajouter}</button>` : ""}</div>
        ${ins.length ? `<div class="ev-ins">${ins.map(x => `<button data-act="inspopen" data-id="${x.id}" aria-label="${esc(x.description || "")}"><img src="data:image/jpeg;base64,${x.thumb}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        ${t.metiers.length ? `<p class="ev-note">${esc(UI.nourrissent(m))}</p>` : ""}</section>` : ""}
      ${t.metiers.length ? `<section class="ev-sec"><h3>${esc(UI.vos(m))}</h3>${vend.length ? `<div class="ev-vend">${vend.map(v => `<button class="ev-v" data-fiche="${v.id}"><b>${esc(v.name)}</b>${ctx.fitPill(v)}</button>`).join("")}</div>${essDone ? "" : `<p class="ev-note">${UI.provisoires}</p>`}<p class="ev-note">${UI.ia}</p>` : `<p class="ev-note">${esc(UI.aucun(m))}</p>`}</section>` : ""}
      ${t.metiers.length ? (k === "tenues" ? briefTenue(m) : `<section class="ev-sec ev-brief"><div><b>${esc(UI.brief(m))}</b><span>${brief ? UI.briefPret : UI.briefBientot}</span></div>${brief ? `<button class="btn sm" data-act="briefpdf" data-c="${brief}">${UI.envoyer}</button>` : ""}</section>`) : ""}
      <details class="ev-sec ev-prio"><summary>${UI.vosPrio}</summary>
        <div class="field"><span class="lab">${UI.importance}</span><div class="seg" role="group">${UI.IMPORT.map((l, i) => `<button data-act="envmeta" data-k="${k}" data-f="importance" data-v="${i + 1}" aria-pressed="${meta.importance === i + 1}" ${dis}>${l}</button>`).join("")}</div></div>
        <div class="field"><label class="lab" for="search-ev-${k}-budget">${UI.budgetCible}</label><input type="number" min="0" step="50" inputmode="numeric" id="search-ev-${k}-budget" data-evmeta="${k}|budget" value="${esc(meta.budget ?? "")}" ${dis}></div>
        <div class="field"><label class="lab" for="search-ev-${k}-reussite">${UI.reussite}</label><textarea autocomplete="off" name="search_text" id="search-ev-${k}-reussite" data-evmeta="${k}|reussite" ${dis}>${esc(meta.reussite || "")}</textarea></div>
        <div class="field"><label class="lab" for="search-ev-${k}-redhib">${UI.redhib}</label><textarea autocomplete="off" name="search_text" id="search-ev-${k}-redhib" data-evmeta="${k}|redhibitoire" ${dis}>${esc(meta.redhibitoire || "")}</textarea></div>
      </details>
      ${k === "tenues" ? blocSecret() : ""}
      ${!G.gris && S.canWrite && k !== "mariage" ? `<button class="link ev-pas" data-act="envpas" data-k="${k}">${UI.pasPourNousQ}</button>` : ""}
    </div>`;
  }

  // Tuile Tenues : ma tenue est secrète (ou montrée), celle de l'autre n'apparaît que par son avancement
  function blocSecret() {
    const a = ctx.prenomAutre(), sa = (S.secret || {})[ctx.autreKey()] || {};
    const autreH = sa.montre ? "" : `<div class="ev-sec-l"><b>${esc(UI.tenueDe(a))}</b><span>${esc(UI.avancement(sa.repondues || 0, sa.niveaux && sa.niveaux.essentiel, sa.prestataires || 0))}</span></div>`;
    return `<section class="ev-sec ev-secret"><p>${ctx.secretLeve() ? esc(UI.montree(a)) : esc(UI.votreSecrete(a))}</p>
      ${!ctx.secretLeve() && S.canWrite ? `<button class="btn sm" data-act="envmontrer">${esc(UI.montrer(a))}</button>` : ""}${autreH}</section>`;
  }
  // brief de ma tenue : rédigé dans mon espace privé, l'autre ne le voit pas (le brief de sa tenue est le sien)
  function briefTenue(m) {
    const { b, running } = ctx.briefTenue(), a = ctx.prenomAutre();
    return `<section class="ev-sec ev-brief"><div><b>${esc(UI.briefTenueT)}</b><span>${esc(b ? UI.briefTenuePret(a) : running ? UI.briefTenueEnCours : UI.briefTenueP(a))}</span></div>${b
      ? `<button class="btn sm" data-act="briefpdf" data-c="tenues">${UI.envoyer}</button>`
      : S.canWrite && !running ? `<button class="btn sm" data-act="brieftenue">${UI.briefTenueGo}</button>` : ""}</section>`;
  }

  /* ---------- Synthèse et inspirations (déplacées, jamais supprimées) ---------- */
  function vSynth() {
    const arch = ctx.archivedAnswers();
    return `<div class="ev-page"><button class="link env-back" data-act="envview" data-v="main">${ctx.BACK_SVG}<span>${UI.retour}</span></button>
      ${ctx.synthHtml()}
      ${arch.length ? `<section class="ev-sec"><h3>${UI.archive}</h3><p class="ev-note">${UI.archiveP}</p><dl class="ev-arch">${arch.map(a => `<dt>${esc(a.q)}</dt><dd>${esc(a.r)}</dd>`).join("")}</dl></section>` : ""}</div>`;
  }
  function vMood() {
    return `<div class="ev-page"><button class="link env-back" data-act="envview" data-v="main">${ctx.BACK_SVG}<span>${UI.retour}</span></button><h2 class="ev-h2">${UI.inspis}</h2>${ctx.moodboard()}</div>`;
  }
  function vNotees() {
    const rs = pend();
    return `<div class="ev-page"><button class="link env-back" data-act="envview" data-v="main">${ctx.BACK_SVG}<span>${UI.retour}</span></button><h2 class="ev-h2">${UI.notees(rs.length || 0)}</h2>
      ${rs.length ? `<p class="ev-note">${UI.noteesP}</p>${rs.map(r => repCard(r, true)).join("")}` : `<p class="ev-note">${UI.rienANoter}</p>`}</div>`;
  }
  function vEnvies() {
    const v = S.f.envView;
    if (v === "notees") return vNotees();
    if (v === "tile" && TBY[S.f.envTile]) return vTile(S.f.envTile);
    if (v === "synth") return vSynth();
    if (v === "mood") return vMood();
    return vMain();
  }

  /* ---------- 4.3 L'écran de question ---------- */
  // S.qs = { k, niveau, i, draft (copie de la réponse en cours), autre (zone texte ouverte), fin }
  const qList = () => questionsOf(S.qs.k, S.qs.niveau, pays());
  const curQ = () => qList()[S.qs.i];
  const docOf = q => A()[q.id] || {};
  const draftFrom = q => { const a = answerFor(q, docOf(q), me()) || {}; return { v: a.v ?? null, libre: (q.parPartenaire ? ((docOf(q).p || {})[me()] || {}).libre : docOf(q).libre) || "", cu: a.cu || null, extra: { ...(docOf(q).extra || {}) } }; };
  // « Corriger » : la question s'ouvre pré-remplie avec l'envie repérée (rien n'est enregistré avant le premier geste)
  function startCorr(r) {
    const q = QBY[r.q], i = questionsOf(q.tuile, q.niveau, pays()).findIndex(x => x.id === q.id);
    if (i < 0) return;
    start(q.tuile, q.niveau, i); corrDraft(r);
  }
  function corrDraft(r) {
    S.qs.corr = r.q;
    S.qs.draft = { ...S.qs.draft, v: r.v ?? S.qs.draft.v, libre: r.libre || S.qs.draft.libre };
    if (r.libre) S.qs.autre = true;
    renderQ();
  }
  function start(k, niveau, i) {
    const st = nextStep(k, A(), me(), pays());
    const idx = i != null ? +i : st && st.niveau === niveau ? st.index : 0;
    S.qs = { k, niveau, i: Math.min(idx, questionsOf(k, niveau, pays()).length - 1), autre: false, j0: jauge(A(), me(), pays()) || 0, wasDone: levelDone(k, niveau, A(), me(), pays()), changed: false };
    S.qs.draft = draftFrom(curQ());
    renderQ();
  }
  function close() { S.qs = null; document.getElementById("layer").innerHTML = ""; document.body.classList.remove("qs-open"); ctx.render(); }
  // Enregistre à chaque geste ; sur une question par partenaire, dans p.<moi>
  async function persist(extra = {}) {
    const q = curQ(), d = S.qs.draft; if (!q || !S.canWrite) return;
    if (S.qs.corr === q.id) { repClose(repOf(q.id)); S.qs.corr = null; } // « Corriger » : la réponse donnée (ou passée) clôt l'envie repérée
    if (!extra.vu) { S.qs.changed = true; S.envDirty = S.envDirty || {}; S.envDirty[S.qs.k] = true; }
    const base = { v: d.v ?? null, cu: d.cu || null, ...extra };
    const data = q.parPartenaire ? { p: { [me()]: { ...base, libre: d.libre || "" } } } : { ...base, libre: d.libre || "" };
    if (Object.keys(d.extra || {}).length) data.extra = d.extra;
    await ctx.saveEnvie(q.id, data, q.parPartenaire ? [`p.${me()}`, "extra", "by", "updatedAt"] : [...Object.keys(data), "by", "updatedAt"]);
  }
  function go(delta, passer) {
    const q = curQ(), d = S.qs.draft;
    const has = hasValue({ v: d.v, libre: d.libre, cu: d.cu });
    if (passer || !has) persist({ vu: true }); // vue ou passée : compte pour « fait », pas pour la jauge
    const n = qList().length, i = S.qs.i + delta;
    if (i >= n) { finish(); return; }
    if (i < 0) return;
    S.qs.i = i; S.qs.autre = false; S.qs.draft = draftFrom(curQ()); renderQ();
  }
  function zone(q) {
    const T = FR.questions[q.id], d = S.qs.draft, ch = visibleChoix(q, pays()), dis = S.canWrite ? "" : "disabled";
    const sel = Array.isArray(d.v) ? d.v : [];
    if (q.format === "CP" || q.format === "CC") return `<div class="qz-cards ${q.format === "CC" ? "cc" : ""}">${ch.map(c => `<button class="qz-card" data-act="qtog" data-c="${c.id}" aria-pressed="${sel.includes(c.id)}" ${dis}><span class="ev-ph t-${ctx.tintOf(c.id)}" aria-hidden="true"><b>${esc(T.choix[c.id].charAt(0))}</b></span><span class="qz-l">${esc(T.choix[c.id])}</span><span class="qz-ck" aria-hidden="true">✓</span></button>`).join("")}</div>`;
    if (q.format === "CM") return `<div class="opts">${ch.map(c => `<button class="opt" data-act="qtog" data-c="${c.id}" aria-pressed="${sel.includes(c.id)}" ${dis}>${esc(T.choix[c.id])}</button>`).join("")}</div>`;
    if (q.format === "CU") {
      const v = typeof d.v === "number" ? d.v : null;
      return `<div class="qz-cu"><b class="qz-cu-v" aria-live="polite">${v ? esc(T.crans[v - 1]) : UI.glisser}</b>
        <input type="range" min="1" max="5" step="1" value="${v || 3}" class="${v ? "" : "unset"}" data-qcu="1" aria-label="${esc(T.libelle)}" aria-valuetext="${esc(v ? T.crans[v - 1] : UI.glisser)}" ${dis}>
        <div class="qz-poles"><span>${esc(T.poles[0])}</span><span>${esc(T.poles[1])}</span></div>
        <div class="opts">${(q.parPartenaire ? ["nsp"] : ["differents", "nsp"]).map(x => /* réponse de chacun (tenue secrète) : « pas pareils » n'a pas de sens */ `<button class="opt" data-act="qcuflag" data-c="${x}" aria-pressed="${d.cu === x}" ${dis}>${esc(FR.cu[x])}</button>`).join("")}</div></div>`;
    }
    if (q.format === "JPA") {
      const v = d.v && typeof d.v === "object" && !Array.isArray(d.v) ? d.v : {};
      const rows = ch.length ? [...ch.map(c => [c.id, T.choix[c.id]]), ...Object.entries(d.extra || {})] : [["_", ""]];
      return `<div class="qz-jpa">${rows.map(([c, l]) => `<div class="qz-jr">${l ? `<span class="qz-jl">${esc(l)}</span>` : ""}<div class="qz-jb" role="group" aria-label="${esc(l || T.libelle)}">${["j", "p", "a"].map(x => `<button data-act="qjpa" data-c="${c}" data-x="${x}" aria-pressed="${v[c] === x}" ${dis}>${esc(FR.jpa[x])}</button>`).join("")}</div></div>`).join("")}
        ${ch.length && S.canWrite ? `<form class="qz-add" data-qadd="1"><input name="search_opt" autocomplete="off" placeholder="${UI.nouvelleOption}" aria-label="${UI.nouvelleOption}"><button class="btn sm">${UI.ajouterOption}</button></form>` : ""}</div>`;
    }
    if (q.format === "CL") return `<p class="ev-note">${UI.classer}</p><div class="qz-cl">${ch.map(c => { const r = sel.indexOf(c.id); return `<button class="opt" data-act="qrank" data-c="${c.id}" aria-pressed="${r >= 0}" ${dis}>${r >= 0 ? `<b class="qz-rk">${r + 1}</b>` : ""}${esc(T.choix[c.id])}</button>`; }).join("")}</div>${sel.length ? `<button class="link" data-act="qrankx">${UI.effacer}</button>` : ""}`;
    if (q.format === "CH") return `<input class="qz-ch" type="text" inputmode="text" autocomplete="off" name="search_nb" data-qch="1" value="${esc(d.v ?? "")}" placeholder="${UI.chiffre}" aria-label="${esc(T.libelle)}" ${dis}>`;
    return ""; // TL : la zone de texte ci-dessous
  }
  function renderQ() {
    const L = document.getElementById("layer"); if (!S.qs) return;
    document.body.classList.add("qs-open");
    if (S.qs.fin) return renderFin();
    const q = curQ(), T = FR.questions[q.id], n = qList().length, d = S.qs.draft, tl = q.format === "TL";
    const open = tl || S.qs.autre || !!d.libre;
    L.innerHTML = `<div class="qs" role="dialog" aria-modal="true" aria-label="${esc(T.libelle)}">
      <div class="qs-top"><button class="qs-x" data-act="qclose" aria-label="${UI.fermer}">✕</button><span class="qs-pos">${esc(tName(S.qs.k))} · ${esc(FR.niveaux[S.qs.niveau].nom)} · ${UI.sur(S.qs.i + 1, n)}</span></div>
      <div class="qs-seg" aria-hidden="true">${qList().map((x, i) => `<i class="${i < S.qs.i || isSeen(x, A(), me()) ? "on" : ""} ${i === S.qs.i ? "cur" : ""}"></i>`).join("")}</div>
      <div class="qs-body">
        <h2 class="qs-l">${esc(T.libelle)}</h2><p class="qs-s">${UI.sertA}${esc(T.sertA.charAt(0).toLowerCase() + T.sertA.slice(1))}</p>
        ${q.parPartenaire ? `<p class="qs-pp">${esc(UI.pourTa(ctx.prenom() || ""))}${q.secret && !ctx.secretLeve() ? esc(UI.secreteQ(ctx.prenomAutre())) : ""}</p>` : ""}
        ${(() => { const r = repOf(q.id); return r && S.qs.corr !== q.id && S.qs.repDone !== q.id ? `<div class="ev-rep qs-rep"><span class="qs-k">${UI.dejaNote}</span><span class="ev-rep-a">${esc(answerText(q, r, FR))}</span>${repLine(r)}${repBtns(r)}</div>` : ""; })()}
        ${zone(q)}
        ${open ? `<div class="qs-autre"><label class="sr" for="search-qs-libre">${UI.autre}</label><textarea id="search-qs-libre" name="search_text" autocomplete="off" data-qlibre="1" placeholder="${UI.ecrire}" ${S.canWrite ? "" : "disabled"}>${esc(d.libre || "")}</textarea>
          <div class="qs-autre-b">${ctx.SR ? `<button class="ch-ic" data-act="qmic" aria-label="Dicter">${MIC_SVG}</button>` : ""}${S.canWrite ? `<button class="link" data-act="envphoto" data-k="${S.qs.k}">${UI.photo}</button>` : ""}</div></div>`
          : `<button class="link qs-more" data-act="qautre">${UI.autre}</button>`}
      </div>
      <div class="qs-foot"><button class="btn ghost" data-act="qpass">${UI.passer}</button><button class="btn primary" data-act="qnext">${S.qs.i === n - 1 ? UI.terminer : UI.suivant}</button></div></div>`;
  }
  // 4.4 Fin d'un niveau : la récompense est demandée une fois (agent « récompense »), puis affichée dès qu'elle est prête
  const recOf = (k, n) => (S.recompenses || []).find(r => r.id === `${k}.${n}`) || null;
  function finish() {
    const { k, niveau } = S.qs;
    S.qs.fin = true;
    const r = recOf(k, niveau);
    // pas de nouvel appel si rien n'a changé depuis la dernière récompense de ce niveau
    if (S.canWrite && (!r || r.status === "erreur" || (S.qs.changed && !(r.status === "en cours" || r.status === "demandee")))) ctx.runReward(k, niveau);
    if (S.envDirty) delete S.envDirty[k]; // la récompense recalcule déjà les notes
    renderQ();
  }
  function renderFin() {
    const k = S.qs.k, n = S.qs.niveau, j = jauge(A(), me(), pays()) || 0, plus = Math.max(0, j - (S.qs.j0 || 0)), nx = NIVEAUX[NIVEAUX.indexOf(n) + 1];
    const r = recOf(k, n), m = metier(k), t = TBY[k], vend = S.vendors.filter(v => t.metiers.includes(v.cat) && v.status !== "ecarte");
    const busy = !r || r.status === "demandee" || r.status === "en cours";
    let corps = "";
    if (busy) corps = `<div class="qs-wait" role="status"><span class="qs-spin" aria-hidden="true"></span><b>${UI.relit}</b>${n === "essentiel" && vend.length ? `<span>${esc(UI.relitNotes(m))}</span>` : ""}</div>`;
    else if (r.status === "erreur") corps = `<div class="qs-wait"><b>${UI.erreur}</b><button class="btn sm" data-act="qretry">${UI.reessayer}</button></div>`;
    else {
      if (n === "essentiel") {
        const ph = S.qs.edit ? `<label class="sr" for="search-qs-phrase">${UI.compris}</label><textarea id="search-qs-phrase" name="search_text" autocomplete="off">${esc(r.phrase || "")}</textarea><button class="btn sm" data-act="qphrasesave">${UI.enregistrer}</button>`
          : `<p class="qs-phrase">${esc(r.phrase || "")}</p>${S.canWrite ? `<div class="qs-pa">${r.phraseOk ? `<span class="ev-note">${UI.merci}</span>` : `<button class="btn sm ghost-l" data-act="qphraseok">${UI.cestCa}</button>`}<button class="link" data-act="qphraseedit">${UI.corriger}</button></div>` : ""}`;
        corps += `<section class="qs-sec"><span class="qs-k">${UI.compris}</span>${ph}</section>`;
        corps += (r.notes || []).length ? `<section class="qs-sec"><h3>${esc(UI.recalcules(m))}</h3><div class="qs-notes">${r.notes.map(x => { const d = x.avant == null ? null : x.apres - x.avant;
          return `<button class="qs-note" data-fiche="${x.id}"><span class="qs-nn"><b>${esc(x.nom)}</b>${x.ligne ? `<span>${x.ligne.type === "pour" ? UI.pourVous : UI.aVerifier}${esc(x.ligne.texte)}</span>` : ""}</span><span class="qs-sc">${x.avant != null && x.avant !== x.apres ? `<s class="num">${x.avant}</s>` : ""}<b class="num">${x.apres}</b>${d ? `<i class="num ${d > 0 ? "up" : "down"}">${d > 0 ? "+" : "−"}${Math.abs(d)}</i>` : ""}</span></button>`; }).join("")}</div><p class="ev-note">${UI.ia}</p></section>`
          : t.metiers.length ? `<section class="qs-sec"><p>${esc(UI.chercher(m))}</p><button class="btn sm" data-act="qr" data-do="${esc(`ask:Peux-tu nous proposer des ${m} qui correspondent à nos envies pour « ${tName(k)} » ?`)}">${UI.chercherBtn}</button></section>` : "";
      }
      if (n === "details" && r.brief) { const b = ctx.briefFor(k); corps += `<section class="qs-sec qs-row"><b>${esc(UI.briefPretT(m))}</b>${b ? `<button class="btn sm primary" data-act="briefpdf" data-c="${b}">${UI.envoyer}</button>` : ""}</section>`; }
      if (n === "pro") corps += (r.questions || []).length ? `<section class="qs-sec"><h3>${UI.questionsPretes}</h3><div class="qs-notes">${r.questions.map(x => `<button class="qs-note" data-fiche="${x.id}"><span class="qs-nn"><b>${esc(x.nom)}</b><span>${UI.questions(x.n)}</span></span><span class="link">${UI.voirFiche}</span></button>`).join("")}</div></section>` : "";
    }
    document.getElementById("layer").innerHTML = `<div class="qs" role="dialog" aria-modal="true" aria-label="${esc(UI.finTitre(tName(k), FR.niveaux[n].nom))}">
      <div class="qs-body"><div class="qs-hero"><span class="qs-ok" aria-hidden="true">✓</span><span class="ev-k">${esc(UI.finTitre(tName(k), FR.niveaux[n].nom)).toUpperCase()}</span>
        ${j ? `<div class="ev-j"><span>${UI.connait(j)}${plus ? ` · <b>${UI.points(plus)}</b>` : ""}</span><span class="ev-bar" aria-hidden="true"><i style="width:${j}%"></i></span></div>` : ""}</div>
        ${corps}</div>
      <div class="qs-foot col">${nx && !levelDone(k, nx, A(), me(), pays()) ? `<button class="btn primary" data-act="envstart" data-k="${k}" data-n="${nx}">${esc(nx === "details" && t.metiers.length ? UI.continuerBrief(FR.niveaux[nx].nom, m) : UI.continuer(FR.niveaux[nx].nom))}</button>` : ""}<button class="btn ghost" data-act="qclose">${UI.plusTard}</button></div></div>`;
  }

  // Réponse modifiée après coup sur une tuile dont l'essentiel était fait : recalcul des notes à la sortie, une fois
  function leaveTile() {
    const k = S.f.envView === "tile" ? S.f.envTile : null;
    if (!k || !S.envDirty || !S.envDirty[k]) return;
    delete S.envDirty[k];
    const t = TBY[k];
    if (t && t.metiers.length && levelDone(k, "essentiel", A(), me(), pays()) && S.vendors.some(v => t.metiers.includes(v.cat) && v.status !== "ecarte")) ctx.runReward(k, "maj");
  }
  /* ---------- Gestes ---------- */
  function act(a, t) {
    const d = S.qs && S.qs.draft;
    switch (a) {
      case "repok": { const r = pend().find(x => x.id === t.dataset.id); if (!r) return true; repConfirm(r);
        if (S.qs && !S.qs.fin && curQ() && curQ().id === r.q) { S.qs.draft = { ...S.qs.draft, v: r.v ?? S.qs.draft.v, libre: r.libre || S.qs.draft.libre }; S.qs.changed = true; S.qs.repDone = r.q; renderQ(); }
        ctx.toast(UI.merci); return true; }
      case "repfix": { const r = pend().find(x => x.id === t.dataset.id); if (!r) return true; if (S.qs && !S.qs.fin && curQ() && curQ().id === r.q) corrDraft(r); else { S.qs = null; startCorr(r); } return true; }
      case "envview": leaveTile(); S.f.envView = t.dataset.v; ctx.saveF(); ctx.render(); window.scrollTo(0, 0); return true;
      case "envtile": S.f.envView = "tile"; S.f.envTile = t.dataset.k; ctx.saveF(); ctx.go("envies"); return true;
      case "envstart": S.qs = null; start(t.dataset.k, t.dataset.n, t.dataset.i); return true;
      case "qclose": close(); return true;
      case "qnext": go(1); return true;
      case "qpass": go(1, true); return true;
      case "qautre": S.qs.autre = true; renderQ(); document.getElementById("search-qs-libre")?.focus(); return true;
      case "qtog": { const c = t.dataset.c, v = Array.isArray(d.v) ? d.v : []; d.v = v.includes(c) ? v.filter(x => x !== c) : [...v, c]; renderQ(); persist(); return true; }
      case "qrank": { const c = t.dataset.c, v = Array.isArray(d.v) ? d.v : []; d.v = v.includes(c) ? v.filter(x => x !== c) : [...v, c]; renderQ(); persist(); return true; }
      case "qrankx": d.v = []; renderQ(); persist(); return true;
      case "qjpa": { const v = { ...(d.v && typeof d.v === "object" && !Array.isArray(d.v) ? d.v : {}) }; const c = t.dataset.c, x = t.dataset.x; if (v[c] === x) delete v[c]; else v[c] = x; d.v = v; renderQ(); persist(); return true; }
      case "qcuflag": { const x = t.dataset.c; d.cu = d.cu === x ? null : x; renderQ(); persist(); return true; }
      case "qmic": { const ta = document.getElementById("search-qs-libre"); if (ta) ctx.dictate(t, ta); return true; }
      case "envactif": ctx.saveEnvie("_tuile." + t.dataset.k, { actif: true, pasPourNous: false }, ["actif", "pasPourNous", "by", "updatedAt"]); return true;
      case "envmontrer": ctx.leverSecret(); return true;
      case "envpas": ctx.saveEnvie("_tuile." + t.dataset.k, { actif: false, pasPourNous: true }, ["actif", "pasPourNous", "by", "updatedAt"]); return true;
      case "envmeta": ctx.saveEnvie("_tuile." + t.dataset.k, { [t.dataset.f]: +t.dataset.v }, [t.dataset.f, "by", "updatedAt"]); return true;
      case "qretry": ctx.runReward(S.qs.k, S.qs.niveau); renderQ(); return true;
      case "qphraseok": ctx.saveDoc(`recompenses/${S.qs.k}.${S.qs.niveau}`, { phraseOk: true }); return true;
      case "qphraseedit": S.qs.edit = true; renderQ(); document.getElementById("search-qs-phrase")?.focus(); return true;
      case "qphrasesave": { const v = (document.getElementById("search-qs-phrase")?.value || "").trim(); S.qs.edit = false; if (v) ctx.saveDoc(`recompenses/${S.qs.k}.${S.qs.niveau}`, { phrase: v, phraseOk: true, corrigee: true }); renderQ(); return true; }
      case "envphoto": ctx.pickPhoto(t.dataset.k, S.qs ? FR.questions[curQ().id].libelle : ""); return true;
    }
    return false;
  }
  // Champs : curseur, chiffre, texte libre (enregistrés à la saisie, sans redessiner l'écran)
  let tmr = null;
  const mtmr = {};
  function input(el) {
    if (el.dataset.evmeta) { const [k, f] = el.dataset.evmeta.split("|"), v = f === "budget" ? (el.value === "" ? null : +el.value) : el.value;
      clearTimeout(mtmr[k + f]); mtmr[k + f] = setTimeout(() => ctx.saveEnvie("_tuile." + k, { [f]: v }, [f, "by", "updatedAt"]), 600); return true; }
    if (!S.qs) return false;
    const d = S.qs.draft;
    if (el.dataset.qcu) { d.v = +el.value; el.classList.remove("unset"); const T = FR.questions[curQ().id]; const b = document.querySelector(".qz-cu-v"); if (b) b.textContent = T.crans[d.v - 1]; el.setAttribute("aria-valuetext", T.crans[d.v - 1]); }
    else if (el.dataset.qch) d.v = el.value;
    else if (el.dataset.qlibre) d.libre = el.value;
    else return false;
    clearTimeout(tmr); tmr = setTimeout(() => persist(), 500);
    return true;
  }
  function submit(f) {
    if (!f.dataset.qadd || !S.qs) return false;
    const l = (f.elements.search_opt.value || "").trim(); if (!l) return true;
    const id = "x-" + l.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    S.qs.draft.extra = { ...(S.qs.draft.extra || {}), [id]: l }; renderQ(); persist(); return true;
  }
  const stateOf = k => { const ex = exploreNow(); return tileState(k, A(), me(), pays(), ex && ex.tuile); };
  const metaOf = k => A()["_tuile." + k] || {};
  const essentielFait = k => levelDone(k, "essentiel", A(), me(), pays());
  const lastAt = () => (S.envies || []).reduce((m, d) => Math.max(m, d.updatedAt || 0), 0);
  return { vEnvies, act, input, submit, renderQ, leaveTile, finOpen: () => !!(S.qs && S.qs.fin), jaugeNow: () => jauge(A(), me(), pays()), tName, inspTile, lendemainUtile, stateOf, metaOf, essentielFait, lastAt, etat: st => FR.etats[st] };
}
