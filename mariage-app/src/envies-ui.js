// Onglet « Nos envies » (docs/nos-envies-v1.md, lot 1) : onglet, page d'une tuile, écran de question (tous formats).
// Aucun texte de question ici : ils viennent de agents/lib/envies/fr.js. L'app fournit ses outils via makeEnvies(ctx).
import { TUILES, FAMILLES, NIVEAUX } from "../agents/lib/envies/catalogue.js";
import { FR } from "../agents/lib/envies/fr.js";
import { TBY, QBY, OLD2TILE, questionsOf, visibleChoix, answerFor, hasValue, isSeen, tileGris, tileState, levelDone, jauge, explore, nextStep, lendemainUtile } from "../agents/lib/envies/logic.js";

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
  pasPourNous: "Pas pour nous", reactiver: "Réactiver cette tuile", pasPourNousQ: "Ce n'est pas pour nous",
  raisons: { pasPourNous: "Vous l'avez mise de côté.", jamais: "Vous avez répondu « Jamais » à la première question.", pasLaique: "Pas de cérémonie laïque prévue (tuile Cérémonie).",
    procheOfficie: "Un proche ou vous deux officiez (tuile Cérémonie).", officiantAChoisir: "Dites d'abord qui officie, dans la tuile Cérémonie." },
  vosPrio: "Vos priorités pour cette tuile", importance: "Importance", budgetCible: "Budget cible (€)", reussite: "Ce qui en fera une vraie réussite", redhib: "Ce qui serait rédhibitoire",
  IMPORT: ["Secondaire", "Utile", "Important", "Très important", "Essentiel"],
  sur: (n, t) => `${n} sur ${t}`, sertA: "Sert à : ", autre: "Dire ou écrire autre chose", ecrire: "Écrire ou dicter ici…", photo: "Ajouter une photo",
  passer: "Passer", suivant: "Suivant", terminer: "Terminer", fermer: "Fermer et revenir à la tuile", ajouterOption: "+ Ajouter", nouvelleOption: "Votre option",
  glisser: "Faites glisser pour choisir", chiffre: "Un chiffre ou une fourchette", classer: "Touchez dans l'ordre de vos priorités", effacer: "Recommencer",
  pourTa: p => `Votre réponse, ${p}`, finTitre: (t, n) => `${t} · ${n}, c'est fait`, finJauge: "Lamaelle vous connaît mieux", continuer: n => `Continuer avec ${n.charAt(0).toLowerCase() + n.slice(1)}`, plusTard: "Plus tard",
  retour: "Nos envies", archive: "Vos réponses précédentes", archiveP: "Ces réponses ne correspondent à aucune question du nouveau questionnaire. Le coach les connaît toujours.",
};
const WHO = { essentiel: 20, details: 25, pro: 25 }; // secondes par question, pour la durée affichée
// Métier → pluriel, pour « Vos photographes », « Elles nourrissent la note des photographes »
const METIER_PL = { Lieu: "lieux", Traiteur: "traiteurs", Photographe: "photographes", "Vidéaste": "vidéastes", Musique: "musiciens et DJ", Fleuriste: "fleuristes",
  Tenues: "boutiques de tenues", Alliances: "bijoutiers", "Coiffure & maquillage": "coiffeurs et maquilleurs", Papeterie: "papetiers", Transport: "transporteurs",
  Officiant: "officiants", "Hébergement": "hébergements", "Animation enfants": "animateurs", Bar: "bars", "Pâtissier": "pâtissiers", "Wedding planner": "wedding planners", "Agence de voyage": "agences de voyage" };
const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

export function makeEnvies(ctx) {
  const { S, esc } = ctx;
  let cArr = null, cMap = {};
  const A = () => { if (S.envies !== cArr) { cArr = S.envies; cMap = Object.fromEntries((S.envies || []).map(d => [d.id, d])); } return cMap; };
  const me = () => ctx.meKey() || "claire";
  const pays = () => S.settings.pays || "FR";
  const tName = k => FR.tuiles[k] ? FR.tuiles[k].nom : k;
  const metier = k => { const t = TBY[k]; return t && t.metiers[0] ? METIER_PL[t.metiers[0]] || t.metiers[0].toLowerCase() : tName(k).toLowerCase(); };
  const inspTile = x => OLD2TILE[x.cat] || (TBY[x.cat] ? x.cat : "mariage");
  const inspOf = k => S.inspirations.filter(x => inspTile(x) === k).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const placeholder = (k, cls = "") => { const t = inspOf(k)[0]; return t ? `<span class="ev-ph ${cls}"><img src="data:image/jpeg;base64,${t.thumb}" alt="" loading="lazy"></span>` : `<span class="ev-ph ${cls} t-${ctx.tintOf(k)}" aria-hidden="true"><b>${esc(tName(k).charAt(0))}</b></span>`; };
  const traits = k => `<span class="ev-tr" aria-hidden="true">${NIVEAUX.map(n => `<i class="${levelDone(k, n, A(), me(), pays()) ? "on" : ""}"></i>`).join("")}</span>`;
  const exploreNow = () => {
    const reserved = new Set(S.vendors.filter(v => v.status === "reserve").map(v => v.cat));
    const prios = (S.profil && Array.isArray(S.profil.priorites) ? S.profil.priorites : []).map(p => OLD2TILE[p.cat] || p.cat);
    return explore(A(), me(), { date: ctx.wDate(), today: ctx.today(), reserved, priorites: prios, pays: pays() });
  };
  const duree = (k, n) => Math.max(1, Math.round(questionsOf(k, n, pays()).length * WHO[n] / 60));

  /* ---------- 4.1 L'onglet ---------- */
  function vMain() {
    const pr = S.profil || {}, fr = (S.briefs || {}).filRouge || {};
    const phrase = ctx.couplePhrase(), j = jauge(A(), me(), pays());
    const prios = [...new Set((Array.isArray(pr.priorites) ? pr.priorites : []).map(p => OLD2TILE[p.cat] || p.cat).filter(k => TBY[k]))].slice(0, 3);
    const head = `<section class="ev-head">
      <span class="ev-k">${UI.label}</span>
      ${phrase ? `<button class="ev-phrase" data-act="envview" data-v="synth">« ${esc(phrase)} »</button>` : `<button class="ev-phrase" data-act="qr" data-do="chatbrief">${UI.racontez}</button>`}
      <div class="ev-j"><span>${j ? UI.connait(j) : UI.apprend}</span>${j ? `<span class="ev-bar" aria-hidden="true"><i style="width:${j}%"></i></span>` : ""}</div>
      ${prios.length ? `<div class="ev-prios"><span>${UI.priorites}</span>${prios.map(k => `<button class="chip" data-act="envtile" data-k="${k}">${esc(tName(k))}</button>`).join("")}</div>` : ""}
      ${pr.resume || fr.titre ? `<button class="link ev-syn" data-act="envview" data-v="synth">${UI.synthese}</button>` : ""}</section>`;
    const ex = exploreNow();
    const exH = ex ? `<button class="ev-now" data-act="envstart" data-k="${ex.tuile}" data-n="${ex.niveau}">${placeholder(ex.tuile, "big")}
      <span class="ev-now-b"><span class="ev-tag">${UI.moment}</span><b>${esc(tName(ex.tuile))}</b><span>${esc(FR.tuiles[ex.tuile].pourquoi)}</span>
      <span class="ev-now-f"><span>${esc(FR.niveaux[ex.niveau].nom)} · ${UI.minutes(duree(ex.tuile, ex.niveau))}</span><span class="btn sm primary">${nextStep(ex.tuile, A(), me(), pays())?.started ? UI.reprendre : UI.commencer}</span></span></span></button>` : "";
    const fams = FAMILLES.map(f => `<section class="ev-fam"><h3 class="home-h">${esc(FR.familles[f])}</h3><div class="ev-tiles">${TUILES.filter(t => t.famille === f).map(t => {
      const st = tileState(t.k, A(), me(), pays(), ex && ex.tuile), gris = st === "gris";
      return `<button class="ev-tile ${gris ? "gris" : ""}" data-act="envtile" data-k="${t.k}">${placeholder(t.k)}<span class="ev-tile-b"><b>${esc(tName(t.k))}</b>${traits(t.k)}<span class="ev-st st-${st}">${esc(FR.etats[st])}</span></span></button>`;
    }).join("")}</div></section>`).join("");
    const nb = ctx.briefsReadyCount(), nI = S.inspirations.length, pin = S.pinterest && (S.pinterest.boards || []).length;
    const all = `<section class="ev-fam"><h3 class="home-h">${UI.toutIci}</h3><div class="ev-rows">
      <button class="ev-row" data-act="briefsmenu"><b>${UI.briefs}</b><span>${UI.briefsN(nb)}</span>${ctx.CHEV}</button>
      <button class="ev-row" data-act="envview" data-v="mood"><b>${UI.inspis}</b><span>${nI ? UI.inspisN(nI, pin) : UI.ajouter}</span>${ctx.CHEV}</button></div></section>`;
    return `<div class="ev">${head}${exH}${fams}${all}</div>`;
  }

  /* ---------- 4.2 La page d'une tuile ---------- */
  function vTile(k) {
    const t = TBY[k]; if (!t) return vMain();
    const G = tileGris(k, A()), step = nextStep(k, A(), me(), pays());
    const vend = S.vendors.filter(v => t.metiers.includes(v.cat) && v.status !== "ecarte");
    const m = metier(k), meta = A()["_tuile." + k] || {}, dis = S.canWrite ? "" : "disabled";
    const lvl = NIVEAUX.map(n => {
      const qs = questionsOf(k, n, pays()), done = levelDone(k, n, A(), me(), pays()), next = step && step.niveau === n;
      if (next) return `<div class="ev-lvl next"><b>${esc(FR.niveaux[n].nom)}</b><p>${esc(FR.niveaux[n].phrase)}</p><span class="ev-lvl-m">${UI.questions(qs.length)} · ${UI.minutes(duree(k, n))}</span>
        <button class="btn primary" data-act="envstart" data-k="${k}" data-n="${n}" ${G.gris ? "disabled" : ""}>${step.started ? UI.reprendre : UI.commencer}</button></div>`;
      return `<button class="ev-lvl-row" data-act="envstart" data-k="${k}" data-n="${n}" data-i="0"><span class="ev-dot ${done ? "on" : ""}" aria-hidden="true"></span><b>${esc(FR.niveaux[n].nom)}</b><span>${done ? `${UI.fait} · ${UI.modifier}` : `${UI.questions(qs.length)} · ${UI.minutes(duree(k, n))}`}</span>${ctx.CHEV}</button>`;
    }).join("");
    const ins = inspOf(k).slice(0, 3);
    const brief = ctx.briefFor(k);
    const essDone = levelDone(k, "essentiel", A(), me(), pays());
    return `<div class="ev-page">
      <div class="ev-cover">${placeholder(k, "cover")}<button class="ev-back" data-act="envview" data-v="main" aria-label="${UI.retour}">${ctx.BACK_SVG}</button>
        <div class="ev-cover-b"><h2>${esc(tName(k))}</h2><span>${UI.remonte(t.remonte)}${t.metiers.length ? ` · ${UI.suivis(vend.length, m)}` : ""}</span></div></div>
      ${G.gris ? `<div class="ev-gris"><b>${UI.pasPourNous}</b><span>${esc(UI.raisons[G.raison] || "")}</span>${S.canWrite ? `<button class="btn sm" data-act="envactif" data-k="${k}">${UI.reactiver}</button>` : ""}</div>` : ""}
      <div class="ev-lvls">${lvl}</div>
      ${t.metiers.length || ins.length ? `<section class="ev-sec"><div class="ev-sec-h"><h3>${esc(UI.vosInspis(k === "mariage" ? "" : m))}</h3>${S.canWrite ? `<button class="link" data-act="envphoto" data-k="${k}">${UI.ajouter}</button>` : ""}</div>
        ${ins.length ? `<div class="ev-ins">${ins.map(x => `<button data-act="inspopen" data-id="${x.id}" aria-label="${esc(x.description || "")}"><img src="data:image/jpeg;base64,${x.thumb}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        ${t.metiers.length ? `<p class="ev-note">${esc(UI.nourrissent(m))}</p>` : ""}</section>` : ""}
      ${t.metiers.length ? `<section class="ev-sec"><h3>${esc(UI.vos(m))}</h3>${vend.length ? `<div class="ev-vend">${vend.map(v => `<button class="ev-v" data-fiche="${v.id}"><b>${esc(v.name)}</b>${ctx.fitPill(v)}</button>`).join("")}</div>${essDone ? "" : `<p class="ev-note">${UI.provisoires}</p>`}<p class="ev-note">${UI.ia}</p>` : `<p class="ev-note">${esc(UI.aucun(m))}</p>`}</section>` : ""}
      ${t.metiers.length ? `<section class="ev-sec ev-brief"><div><b>${esc(UI.brief(m))}</b><span>${brief ? UI.briefPret : UI.briefBientot}</span></div>${brief ? `<button class="btn sm" data-act="briefpdf" data-c="${brief}">${UI.envoyer}</button>` : ""}</section>` : ""}
      <details class="ev-sec ev-prio"><summary>${UI.vosPrio}</summary>
        <div class="field"><span class="lab">${UI.importance}</span><div class="seg" role="group">${UI.IMPORT.map((l, i) => `<button data-act="envmeta" data-k="${k}" data-f="importance" data-v="${i + 1}" aria-pressed="${meta.importance === i + 1}" ${dis}>${l}</button>`).join("")}</div></div>
        <div class="field"><label class="lab" for="search-ev-${k}-budget">${UI.budgetCible}</label><input type="number" min="0" step="50" inputmode="numeric" id="search-ev-${k}-budget" data-evmeta="${k}|budget" value="${esc(meta.budget ?? "")}" ${dis}></div>
        <div class="field"><label class="lab" for="search-ev-${k}-reussite">${UI.reussite}</label><textarea autocomplete="off" name="search_text" id="search-ev-${k}-reussite" data-evmeta="${k}|reussite" ${dis}>${esc(meta.reussite || "")}</textarea></div>
        <div class="field"><label class="lab" for="search-ev-${k}-redhib">${UI.redhib}</label><textarea autocomplete="off" name="search_text" id="search-ev-${k}-redhib" data-evmeta="${k}|redhibitoire" ${dis}>${esc(meta.redhibitoire || "")}</textarea></div>
      </details>
      ${!G.gris && S.canWrite && k !== "mariage" ? `<button class="link ev-pas" data-act="envpas" data-k="${k}">${UI.pasPourNousQ}</button>` : ""}
    </div>`;
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
  function vEnvies() {
    const v = S.f.envView;
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
  function start(k, niveau, i) {
    const st = nextStep(k, A(), me(), pays());
    const idx = i != null ? +i : st && st.niveau === niveau ? st.index : 0;
    S.qs = { k, niveau, i: Math.min(idx, questionsOf(k, niveau, pays()).length - 1), autre: false };
    S.qs.draft = draftFrom(curQ());
    renderQ();
  }
  function close() { S.qs = null; document.getElementById("layer").innerHTML = ""; document.body.classList.remove("qs-open"); ctx.render(); }
  // Enregistre à chaque geste ; sur une question par partenaire, dans p.<moi>
  async function persist(extra = {}) {
    const q = curQ(), d = S.qs.draft; if (!q || !S.canWrite) return;
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
    if (i >= n) { S.qs.fin = true; renderQ(); return; }
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
        <div class="opts">${["differents", "nsp"].map(x => `<button class="opt" data-act="qcuflag" data-c="${x}" aria-pressed="${d.cu === x}" ${dis}>${esc(FR.cu[x])}</button>`).join("")}</div></div>`;
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
        ${q.parPartenaire ? `<p class="qs-pp">${esc(UI.pourTa(ctx.prenom() || ""))}</p>` : ""}
        ${zone(q)}
        ${open ? `<div class="qs-autre"><label class="sr" for="search-qs-libre">${UI.autre}</label><textarea id="search-qs-libre" name="search_text" autocomplete="off" data-qlibre="1" placeholder="${UI.ecrire}" ${S.canWrite ? "" : "disabled"}>${esc(d.libre || "")}</textarea>
          <div class="qs-autre-b">${ctx.SR ? `<button class="ch-ic" data-act="qmic" aria-label="Dicter">${MIC_SVG}</button>` : ""}${S.canWrite ? `<button class="link" data-act="envphoto" data-k="${S.qs.k}">${UI.photo}</button>` : ""}</div></div>`
          : `<button class="link qs-more" data-act="qautre">${UI.autre}</button>`}
      </div>
      <div class="qs-foot"><button class="btn ghost" data-act="qpass">${UI.passer}</button><button class="btn primary" data-act="qnext">${S.qs.i === n - 1 ? UI.terminer : UI.suivant}</button></div></div>`;
  }
  // 4.4 (version lot 1) : fin de niveau, sans les récompenses IA (lot 2)
  function renderFin() {
    const k = S.qs.k, n = S.qs.niveau, j = jauge(A(), me(), pays()), nx = NIVEAUX[NIVEAUX.indexOf(n) + 1];
    document.getElementById("layer").innerHTML = `<div class="qs" role="dialog" aria-modal="true" aria-label="${esc(UI.finTitre(tName(k), FR.niveaux[n].nom))}">
      <div class="qs-fin"><span class="qs-ok" aria-hidden="true">✓</span><span class="ev-k">${esc(UI.finTitre(tName(k), FR.niveaux[n].nom)).toUpperCase()}</span>
        ${j ? `<div class="ev-j"><span>${UI.connait(j)}</span><span class="ev-bar" aria-hidden="true"><i style="width:${j}%"></i></span></div>` : ""}</div>
      <div class="qs-foot col">${nx && !levelDone(k, nx, A(), me(), pays()) ? `<button class="btn primary" data-act="envstart" data-k="${k}" data-n="${nx}">${esc(UI.continuer(FR.niveaux[nx].nom))}</button>` : ""}<button class="btn ghost" data-act="qclose">${UI.plusTard}</button></div></div>`;
  }

  /* ---------- Gestes ---------- */
  function act(a, t) {
    const d = S.qs && S.qs.draft;
    switch (a) {
      case "envview": S.f.envView = t.dataset.v; ctx.saveF(); ctx.render(); window.scrollTo(0, 0); return true;
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
      case "envpas": ctx.saveEnvie("_tuile." + t.dataset.k, { actif: false, pasPourNous: true }, ["actif", "pasPourNous", "by", "updatedAt"]); return true;
      case "envmeta": ctx.saveEnvie("_tuile." + t.dataset.k, { [t.dataset.f]: +t.dataset.v }, [t.dataset.f, "by", "updatedAt"]); return true;
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
  return { vEnvies, act, input, submit, renderQ, jaugeNow: () => jauge(A(), me(), pays()), tName, inspTile, lendemainUtile, stateOf, metaOf, essentielFait, lastAt, etat: st => FR.etats[st] };
}
