// Page « Planning » v1 (docs/budget-planning-v1.md, lot 2) : la page (4.2), une étape (4.3), une tâche ou un rendez-vous (4.4).
// Tâches et rendez-vous dans une seule page (plus d'onglet Agenda). Règles dans agents/lib/planning.js (testées) ;
// tableau des étapes et thèmes validé : docs/planning-migration.md. Aucun appel IA à l'affichage.
// Lot 3 : actions du coach sur une tâche ; lot 4 : vue calendrier et planning vide.
import { ETAPES, ETAPE, THEMES, ORDRE_THEMES, themeDe, pourQui, etapeCourante, avancement, prochainement, joursDeRetard, ics, actionCoach } from "../agents/lib/planning.js";
import { candidats } from "../agents/lib/prestataires.js";

// Textes d'interface (à traduire)
const UI = {
  titre: "Notre planning", retour: "Accueil", ajouter: "Ajouter une tâche", etapeK: (n, t) => `ÉTAPE ${n} SUR ${t}`, aujourdhui: "Aujourd'hui",
  dateIndicative: "date indicative", dateAFixer: "date à fixer", fixerDate: "Fixez une date, même indicative, pour voir les échéances.",
  cpt: { retard: "en retard", faites: "faites", rdv: "rendez-vous à venir" }, tout: "Tout", calendrier: "Tous les rendez-vous",
  enRetard: n => `En retard · ${n}`, prochainement: "Prochainement", rienProche: "Rien de prévu dans les 60 prochains jours.", chemin: "Le chemin jusqu'au jour J",
  rapport: "Rapport d'organisation", rapportS: "PDF · planning, budget, prestataires et invités", rdvTous: "Tous les rendez-vous", rdvTousS: "À venir et passés",
  vueEnsemble: "Vue d'ensemble", vueEnsembleS: "Jalons et qui fait quoi",
  viaMail: "via e-mail", rdv: "Rendez-vous", avec: a => `avec ${a}`,
  // étape
  etapeK2: (n, t, p) => `ÉTAPE ${n} SUR ${t}${p ? ` · ${p}` : ""}`, surN: (a, b) => `${a} sur ${b}`, faitesN: (n, t) => `${n} faite${n > 1 ? "s" : ""}${t ? ` · ${t}` : ""}`,
  ensuite: "Ensuite", ensuiteS: n => `${n} tâche${n > 1 ? "s" : ""}`, aucuneTache: "Aucune tâche dans cette étape.", toutFait: "Tout est fait dans cette étape.",
  periode: { debut: f => `jusqu'à ${f}`, dePuis: (d, f) => `${d} – ${f}`, sansDate: "sans date" },
  lienTheme: { lieu: n => (n ? `${n} lieu${n > 1 ? "x" : ""} en lice` : "Prestataires"), tenues: () => "Prestataires", choix: () => "Nos envies", ceremonie: () => "Nos envies",
    papeterie: () => "Nos envies", prestataires: () => "Prestataires", argent: () => "Budget", invites: () => "Invités", logistique: () => "Jour J" },
  // tâche
  etat: { retard: n => (n > 1 ? `En retard de ${n} jours` : "En retard d'un jour"), doing: "En cours", todo: "À faire", done: "Fait" },
  echeance: "Échéance", echeanceCalc: d => `Calculée : ${d}`, qui: "Qui s'en occupe", etape: "Étape", theme: "Thème", reliA: "Relié à", note: "Note",
  notePh: "Une précision, un contact, un lien…", reporter: "Reporter", plus1s: "+1 semaine", plus1m: "+1 mois", choisir: "Choisir une date", fait: "C'est fait", refaire: "À refaire",
  faitOk: t => `« ${t} » faite`, reporteOk: d => `Reportée au ${d}`, toutModifier: "Tout modifier", ouvrirMail: "Ouvrir le mail d'origine", mail: "E-mail d'origine",
  posteBudget: p => `Budget · ${p}`, tuile: n => `Nos envies · ${n}`, prest: (n, c) => `${n} · ${c}`,
  // rendez-vous
  // le coach peut aider (4.7)
  coachH: "Le coach peut aider", coachBtn: { reponse: "Rédiger la réponse", creneaux: "Proposer des créneaux", budget: "Ouvrir le budget", arbitrer: "Ouvrir le budget · arbitrer", preparer: "Préparer avec le coach", metier: m => `Voir les ${m}` },
  coachP: { reponse: "Un brouillon court, à relire, à partir du mail reçu.", creneaux: "Trois créneaux libres (sans conflit avec vos rendez-vous) et le message qui les propose.", preparer: "Vos envies pour ce métier et les questions à poser." },
  redige: "Le coach rédige…", brouillon: "Brouillon à relire", ouvrirMailApp: "Ouvrir dans l'app mail", copier: "Copier", copie: "Copié", refaire: "Refaire",
  creneauxL: "Créneaux proposés", rienEnvoye: "Rien n'est envoyé par l'app : vous relisez et envoyez depuis votre messagerie.", echecCoach: e => `Le coach n'a pas pu rédiger : ${e}`,
  preparerAsk: (t, d, v) => `Prépare notre rendez-vous « ${t} »${v ? ` avec ${v}` : ""}${d ? ` le ${d}` : ""} : rappelle nos envies pour ce métier et donne-nous les questions à poser.`,
  heure: "Heure", lieu: "Lieu", ajouterTel: "Ajouter à mon téléphone", rdvSecret: "Rendez-vous secret : seuls la date et l'heure sont partagés.",
};
const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICAL = '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>';

export function makePlanning(ctx) {
  const { S, esc } = ctx;
  const d0 = () => ctx.wDate(), today = () => ctx.today();
  const fin = k => { const d = d0(); return d && ctx.PH[k] ? ctx.PH[k].due(d) : null; };
  const dFmt = d => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") : "");
  const dLong = d => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
  const dMois = d => (d ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "");
  const qui = () => S.f.owner === "claire" || S.f.owner === "julien" ? S.f.owner : "all";
  const tasks = () => S.tasks.filter(t => pourQui(t, qui()));
  const rdvs = () => S.rdv.filter(r => qui() === "all" || !r.qui || r.qui === "deux" || r.qui === qui());
  const dateRdv = r => ctx.pd(r.date);
  const courante = () => etapeCourante(S.tasks, { fin, today: today() });
  const cal = (d, cls = "") => `<span class="pr-cal ${cls}" aria-hidden="true"><small>${d ? MOIS[d.getMonth()] : "?"}</small><b>${d ? d.getDate() : "–"}</b></span>`;
  const vendor = id => id && S.vendors.find(v => v.id === id);
  const chipQui = o => (o === "claire" || o === "julien" ? `<span class="chip ${o}">${esc(ctx.OWNERS[o])}</span>` : ""); // « Les deux » n'est jamais affiché
  const origine = t => { const v = vendor(t.vendorId); return v ? v.name : t.source === "mail" ? UI.viaMail : ""; };

  /* ---------- 4.2 La page ---------- */
  function head() {
    const k = courante(), e = ETAPE[k], d = d0(), ts = S.tasks, late = ts.filter(ctx.isLate).length, done = ts.filter(t => t.status === "done").length;
    const aVenir = S.rdv.filter(r => { const x = dateRdv(r); return x && x >= today(); }).length, ci = e.n - 1;
    return `<section class="pr-head bu-head pl-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-new="tasks" aria-label="${UI.ajouter}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <div class="bu-k">${UI.etapeK(e.n, ETAPES.length)}</div>
      <button class="pl-nom" data-act="pletape" data-k="${k}"><b>${esc(e.nom)}</b><span>${esc(e.phrase)}</span></button>
      <div class="pl-frise" role="img" aria-label="Étape ${e.n} sur ${ETAPES.length} : ${esc(e.nom)}">
        <span class="pl-track"><i style="width:${(ci / (ETAPES.length) * 100).toFixed(1)}%"></i></span>
        ${ETAPES.map((x, i) => `<span class="pl-pt ${i < ci ? "past" : i === ci ? "now" : ""}" style="left:${(i / ETAPES.length * 100).toFixed(2)}%"></span>`).join("")}
        <span class="pl-star" aria-hidden="true">${SVG('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>')}</span></div>
      <div class="pl-fl"><span>${UI.aujourdhui}</span><span>${d ? `${esc(dLong(d))}${S.settings.dateIndicative ? ` · ${UI.dateIndicative}` : ""}` : UI.dateAFixer}</span></div>
      <div class="bu-cpts">
        <div><b class="num ${late ? "pl-late" : ""}">${late}</b><span>${UI.cpt.retard}</span></div>
        <div><b class="num">${done} / ${ts.length}</b><span>${UI.cpt.faites}</span></div>
        <div><b class="num">${aVenir}</b><span>${UI.cpt.rdv}</span></div></div>
    </section>`;
  }
  function filtres() {
    return `<div class="pl-filt"><div class="seg" role="group" aria-label="Filtrer par personne">${[["all", UI.tout], ["claire", ctx.P1()], ["julien", ctx.P2()]].map(([k, l]) => `<button data-act="plqui" data-v="${k}" aria-pressed="${qui() === k}">${esc(l)}</button>`).join("")}</div>
      <button class="pr-round sm pl-calb" data-go="agenda" aria-label="${UI.calendrier}">${SVG(ICAL)}</button></div>`;
  }
  const rond = t => { const late = ctx.isLate(t); return `<button class="pl-ck ${t.status === "done" ? "done" : late ? "late" : t.status === "doing" ? "doing" : ""}" data-act="pldone" data-id="${t.id}" aria-label="${t.status === "done" ? "Marquer à faire" : "Marquer comme fait"} : ${esc(t.title)}" ${S.canWrite ? "" : "disabled"}></button>`; };
  function ligneTache(t, { ligne } = {}) {
    const due = ctx.taskDue(t), late = ctx.isLate(t);
    const l = ligne != null ? ligne : [due ? `<span class="${late ? "bad-t" : ""}">${esc(dFmt(due))}</span>` : "", esc(origine(t))].filter(Boolean).join(" · ");
    return `<div class="pl-row">${rond(t)}<button class="pr-rb pl-open" data-act="pltache" data-id="${t.id}"><b>${esc(t.title)}</b>${l ? `<span>${l}</span>` : ""}</button>${chipQui(t.owner)}</div>`;
  }
  function retards() {
    const l = tasks().filter(ctx.isLate).sort((a, b) => ctx.taskDue(a) - ctx.taskDue(b));
    if (!l.length) return "";
    const avecCoach = t => { const a = action(t); return ligneTache(t) + (a && S.canWrite ? `<div class="pl-cb">${boutonCoach(t, a, "sm")}</div>` : ""); };
    return `<section class="pr-card pl-retards"><h3 class="home-h">${UI.enRetard(l.length)}</h3><div class="pl-list">${l.slice(0, 8).map(avecCoach).join("")}</div>
      ${l.length > 8 ? `<button class="link" data-act="pletape" data-k="${l[8].phase}">+ ${l.length - 8}</button>` : ""}</section>`;
  }
  function lienObjet(x, type) {
    const v = vendor(x.vendorId);
    if (v) return `<button class="link pl-lien" data-fiche="${v.id}">Voir ${esc(v.name)}</button>`;
    if (type === "tache") { const th = THEMES[themeDe(x, S.vendors)]; if (th && th.lien && th.lien.go === "budget") return `<button class="link pl-lien" data-go="budget">Ouvrir le budget</button>`; }
    return "";
  }
  function prochains() {
    const it = prochainement(tasks(), rdvs(), { due: ctx.taskDue, dateRdv, today: today() });
    if (!it.length) return `<section class="pr-sec"><h3 class="home-h">${UI.prochainement}</h3><p class="ev-note">${d0() ? UI.rienProche : UI.fixerDate}</p></section>`;
    return `<section class="pr-sec"><h3 class="home-h">${UI.prochainement}</h3><div class="pr-box">${it.map(i => i.type === "rdv"
      ? `<div class="bu-pay pl-pr">${cal(i.d, "rdv")}<span class="pr-rb"><button class="pr-link pl-open2" data-act="plrdv" data-id="${i.x.id}"><b>${esc(i.x.title)}</b></button><span>${esc([UI.rdv, i.x.time, i.x.avec ? UI.avec(i.x.avec) : ""].filter(Boolean).join(" · "))}</span>${lienObjet(i.x, "rdv")}</span></div>`
      : `<div class="bu-pay pl-pr">${cal(i.d)}<span class="pr-rb"><button class="pr-link pl-open2" data-act="pltache" data-id="${i.x.id}"><b>${esc(i.x.title)}</b></button><span>${esc([ETAPE[i.x.phase] ? ETAPE[i.x.phase].nom : "", origine(i.x)].filter(Boolean).join(" · "))}</span>${lienObjet(i.x, "tache")}</span>${chipQui(i.x.owner)}</div>`).join("")}</div></section>`;
  }
  function periode(k) {
    const i = ETAPES.findIndex(e => e.k === k), f = fin(k);
    if (!d0()) return UI.periode.sansDate;
    if (i === 0) return UI.periode.debut(dMois(f));
    if (k === "j") return dLong(f);
    const d1 = fin(ETAPES[i - 1].k), court = f - d1 < 45 * 864e5; // étape courte : en jours
    return UI.periode.dePuis(court ? dFmt(d1) : dMois(d1), court ? dFmt(f) : dMois(f));
  }
  function chemin() {
    const av = avancement(tasks()), cur = courante();
    return `<section class="pr-sec"><h3 class="home-h">${UI.chemin}</h3><ol class="pl-chemin">${ETAPES.map(e => { const a = av[e.k];
      return `<li class="${e.k === cur ? "now" : a.total && a.fait === a.total ? "ok" : ""}"><button data-act="pletape" data-k="${e.k}"><span class="pl-cn"><b>${esc(e.nom)}</b><span>${esc(periode(e.k))}</span></span><span class="num pl-cc">${a.fait} / ${a.total}</span>${ctx.CHEV}</button></li>`; }).join("")}</ol></section>`;
  }
  function vMain() {
    return `<div class="pr bu pl">${head()}${filtres()}${retards()}${ctx.dupH()}${prochains()}${chemin()}
      <button class="pr-row bu-pdf" data-go="agenda">${SVG(ICAL)}<span class="pr-rb"><b>${UI.rdvTous}</b><span>${UI.rdvTousS}</span></span>${ctx.CHEV}</button>
      <button class="pr-row bu-pdf" data-act="pdfreport">${SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>')}<span class="pr-rb"><b>${UI.rapport}</b><span>${UI.rapportS}</span></span>${ctx.CHEV}</button>
      <div class="plan-ov ${S.f.overview ? "open" : ""}"><button class="ov-open" data-act="overview" aria-expanded="${!!S.f.overview}"><span><b>${UI.vueEnsemble}</b><span>${UI.vueEnsembleS}</span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        ${S.f.overview ? `<div class="plan-ov-b">${ctx.milestonesPanel()}${ctx.whoPanel()}</div>` : ""}</div></div>`;
  }

  /* ---------- 4.3 Une étape ---------- */
  function lienGroupe(k) {
    const th = THEMES[k]; if (!th.lien) return "";
    const n = k === "lieu" ? candidats("Lieu", S.vendors).length : 0, txt = (UI.lienTheme[k] || (() => ""))(n);
    if (th.lien.metier) return `<button class="link" data-act="plmetier" data-m="${esc(th.lien.metier)}">${esc(txt)}</button>`;
    if (th.lien.tuile) return `<button class="link" data-bgo="${th.lien.tuile}">${esc(txt)}</button>`;
    return `<button class="link" data-go="${th.lien.go}">${esc(txt)}</button>`;
  }
  function vEtape(k) {
    const e = ETAPE[k]; if (!e) { S.f.plView = "main"; return vMain(); }
    const l = tasks().filter(t => t.phase === k), done = l.filter(t => t.status === "done"), ouvertes = l.filter(t => t.status !== "done");
    const i = e.n - 1, suiv = ETAPES[i + 1], nSuiv = suiv ? tasks().filter(t => t.phase === suiv.k && t.status !== "done").length : 0;
    const derniere = avancement(l)[k].derniere;
    const groupes = ORDRE_THEMES.map(th => [th, ouvertes.filter(t => themeDe(t, S.vendors) === th).sort((a, b) => (ctx.taskDue(a) || 9e15) - (ctx.taskDue(b) || 9e15) || (a.order ?? 999) - (b.order ?? 999))]).filter(([, ts]) => ts.length);
    return `<div class="ev-page pr-page bu-page pl-page">
      <div class="ev-cover"><span class="ev-ph ev-ph-ic cov" aria-hidden="true"><svg class="ev-ic" viewBox="0 0 24 24">${ICAL}<path d="M8 14l2 2 4-4"/></svg></span><button class="ev-back" data-act="plview" data-v="main" aria-label="${UI.titre}">${ctx.BACK_SVG}</button>
        <div class="ev-cover-b"><span class="pl-ek">${esc(UI.etapeK2(e.n, ETAPES.length, periode(k)))}</span><h2>${esc(e.nom)}</h2>
          <span class="pl-prog" role="img" aria-label="${done.length} sur ${l.length}"><i style="width:${l.length ? (done.length / l.length * 100).toFixed(1) : 0}%"></i></span><span>${UI.surN(done.length, l.length)}</span></div></div>
      ${groupes.length ? groupes.map(([th, ts]) => `<section class="pr-sec"><div class="pr-sec-h"><h3 class="home-h">${esc(THEMES[th].nom)}</h3>${lienGroupe(th)}</div><div class="pr-box pl-list">${ts.map(t => ligneTache(t)).join("")}</div></section>`).join("")
        : `<p class="ev-note">${l.length ? UI.toutFait : UI.aucuneTache}</p>`}
      ${done.length ? `<details class="pr-card pl-faites"><summary><b>${esc(UI.faitesN(done.length, derniere ? derniere.title : ""))}</b></summary><div class="pl-list">${done.map(t => ligneTache(t)).join("")}</div></details>` : ""}
      ${suiv ? `<button class="pr-row pl-ensuite" data-act="pletape" data-k="${suiv.k}"><span class="pr-rb"><span class="ev-tag">${UI.ensuite}</span><b>${esc(suiv.nom)}</b><span>${UI.ensuiteS(nSuiv)}</span></span>${ctx.CHEV}</button>` : ""}</div>`;
  }

  /* ---------- 4.4 Une tâche ---------- */
  /* ---------- 4.7 Le coach sur une tâche ---------- */
  const mailDe = t => (t.sourceId && S.inbox.find(x => x.id === t.sourceId)) || null;
  const rdvAVenir = v => v && S.rdv.find(r => r.vendorId === v.id && dateRdv(r) && dateRdv(r) >= today());
  const action = t => actionCoach(t, { vendors: S.vendors, mail: mailDe(t), depasse: ctx.budgetDepasse(), aVenir: rdvAVenir(vendor(t.vendorId)) });
  const plM = m => ({ Lieu: "lieux", Traiteur: "traiteurs", Photographe: "photographes", "Vidéaste": "vidéastes", Musique: "musiciens", Fleuriste: "fleuristes", Tenues: "boutiques" }[m] || String(m).toLowerCase());
  function askPreparer(r) { const d = dateRdv(r), v = vendor(r.vendorId); return "ask:" + UI.preparerAsk(r.title, d ? dLong(d) : "", v ? v.name : r.avec || ""); }
  function boutonCoach(t, a, taille = "") {
    const cls = `btn ${taille} ${taille ? "" : "primary"}`;
    switch (a.k) {
      case "reponse": case "creneaux": return `<button class="${cls}" data-act="plcoach" data-id="${t.id}" data-k="${a.k}" ${S.ui.plCoach === t.id ? "disabled" : ""}>${S.ui.plCoach === t.id ? UI.redige : UI.coachBtn[a.k]}</button>`;
      case "budget": return `<button class="${cls}" data-act="plbudgetgo" data-arb="${a.arbitrer ? 1 : ""}">${a.arbitrer ? UI.coachBtn.arbitrer : UI.coachBtn.budget}</button>`;
      case "metier": return `<button class="${cls}" data-act="plmetier" data-m="${esc(a.metier)}">${esc(UI.coachBtn.metier(plM(a.metier)))}</button>`;
      case "preparer": return `<button class="${cls}" data-act="qr" data-do="${esc(askPreparer(a.rdv))}">${UI.coachBtn.preparer}</button>`;
    }
    return "";
  }
  function brouillonCarte(t) {
    const b = t.brouillon; if (!b || !b.corps) return "";
    const v = vendor(t.vendorId), to = v && /\S+@\S+\.\S+/.test(v.email || "") ? v.email.trim() : "";
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(b.objet || "")}&body=${encodeURIComponent(b.corps)}`;
    const cr = Array.isArray(b.creneaux) && b.creneaux.length ? `<p class="pl-cr"><b>${UI.creneauxL} :</b> ${b.creneaux.map(c => esc(`${dFmt(ctx.pd(c.date))} ${c.time.replace(":", " h ")}`)).join(" · ")}</p>` : "";
    return `<div class="pl-brouillon"><span class="ev-tag">${UI.brouillon}</span>${cr}<b>${esc(b.objet || "")}</b><p class="pl-p">${esc(b.corps)}</p>
      <div class="pl-acts"><a class="btn primary" href="${href}">${UI.ouvrirMailApp}</a><button class="btn" data-act="plcopie" data-id="${t.id}">${UI.copier}</button>
      ${S.canWrite ? `<button class="link" data-act="plcoach" data-id="${t.id}" data-k="${b.k}">${UI.refaire}</button>` : ""}</div><p class="ev-note">${UI.rienEnvoye}</p></div>`;
  }
  const coachEntete = `<span class="pr-ck2"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/></svg></span><b>${UI.coachH.toUpperCase()}</b></span>`;
  function coachTache(t) {
    const a = action(t); if (!a || !S.canWrite) return t.brouillon ? `<section class="pr-card pl-coach">${brouillonCarte(t)}</section>` : "";
    const aBrouillon = t.brouillon && t.brouillon.k === a.k;
    return `<section class="pr-card pl-coach">${coachEntete}
      ${UI.coachP[a.k] && !aBrouillon ? `<p>${UI.coachP[a.k]}</p>` : ""}${S.ui.plCoachErr ? `<p class="brief-err">${esc(UI.echecCoach(S.ui.plCoachErr))}</p>` : ""}
      ${aBrouillon ? brouillonCarte(t) : boutonCoach(t, a)}</section>`;
  }
  async function lancerCoach(id, k) {
    if (S.ui.plCoach) return;
    S.ui.plCoach = id; S.ui.plCoachErr = ""; ctx.render();
    try { const r = await ctx.runAgentNow(k, { id }); if (r && r.ok === false) S.ui.plCoachErr = r.erreur || "erreur"; }
    catch (e) { S.ui.plCoachErr = e.message || "erreur"; }
    S.ui.plCoach = null; ctx.render();
  }

  function relies(t) {
    const out = [], v = vendor(t.vendorId), th = themeDe(t, S.vendors);
    if (v) out.push(`<button class="pr-row" data-fiche="${v.id}"><span class="pr-av t-${ctx.tintOf(v.cat)}" aria-hidden="true">${esc(ctx.initials(v.name))}</span><span class="pr-rb"><b>${esc(v.name)}</b><span>${esc(v.cat)}</span></span>${ctx.CHEV}</button>`);
    const sug = t.sourceId && S.inbox.find(x => x.id === t.sourceId), url = sug && sug.threadUrl;
    if (url && /^https:\/\/mail\.google\.com\//.test(url)) out.push(`<a class="pr-row" href="${esc(url)}" target="_blank" rel="noopener">${SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>')}<span class="pr-rb"><b>${UI.mail}</b><span>${esc(sug.subject || sug.summary || "")}</span></span>${ctx.CHEV}</a>`);
    const poste = v ? ctx.budgetLineFor(v.cat) : th === "argent" ? null : null;
    if (poste) out.push(`<button class="pr-row" data-act="plposte" data-id="${poste.id}">${SVG('<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5a3 3 0 1 0 0 5M8 11h5M8 13h5"/>')}<span class="pr-rb"><b>${esc(UI.posteBudget(poste.label))}</b><span>${esc(ctx.eur(+poste.prevu || 0))}</span></span>${ctx.CHEV}</button>`);
    else if (th === "argent") out.push(`<button class="pr-row" data-go="budget">${SVG('<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5a3 3 0 1 0 0 5M8 11h5M8 13h5"/>')}<span class="pr-rb"><b>Budget</b></span>${ctx.CHEV}</button>`);
    const tuile = v ? ctx.tuileDe(v.cat) : THEMES[th].lien && THEMES[th].lien.tuile;
    if (tuile && ctx.nomTuile(tuile)) out.push(`<button class="pr-row" data-bgo="${tuile}">${SVG('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>')}<span class="pr-rb"><b>${esc(UI.tuile(ctx.nomTuile(tuile)))}</b></span>${ctx.CHEV}</button>`);
    return out.length ? `<section class="pr-sec"><h3 class="home-h">${UI.reliA}</h3><div class="pl-list">${out.join("")}</div></section>` : "";
  }
  function vTache(id) {
    const t = S.tasks.find(x => x.id === id); if (!t) { S.f.plView = "main"; return vMain(); }
    const due = ctx.taskDue(t), late = ctx.isLate(t), dis = S.canWrite ? "" : "disabled", th = themeDe(t, S.vendors);
    const coachEnHaut = S.ui.plCoach === t.id || !!(t.brouillon && t.brouillon.corps); // le brouillon arrive sous les yeux
    const etat = t.status === "done" ? UI.etat.done : late ? UI.etat.retard(joursDeRetard(due, today())) : t.status === "doing" ? UI.etat.doing : UI.etat.todo;
    return `<div class="ev-page pl-tache">
      <button class="link env-back" data-act="plback">${ctx.BACK_SVG}<span>${esc(S.f.plBackLabel || UI.titre)}</span></button>
      <span class="pl-etat ${t.status === "done" ? "ok" : late ? "bad" : ""}">${esc(etat)}</span><h2 class="ev-h2">${esc(t.title)}</h2>
      ${coachEnHaut ? coachTache(t) : ""}
      <section class="pr-card pl-champs">
        <label class="pl-f"><span>${UI.echeance}</span><input type="date" data-plf="due" data-id="${t.id}" value="${esc(t.due || "")}" ${dis}>${!t.due && due ? `<small>${esc(UI.echeanceCalc(dLong(due)))}</small>` : ""}</label>
        <div class="pl-f"><span>${UI.qui}</span><div class="seg" role="group" aria-label="${UI.qui}">${["claire", "julien", "deux"].map(o => `<button data-act="plowner" data-id="${t.id}" data-v="${o}" aria-pressed="${(t.owner || "deux") === o}" ${dis}>${esc(ctx.OWNERS[o])}</button>`).join("")}</div></div>
        <div class="pl-f2"><label class="pl-f"><span>${UI.etape}</span><select data-plf="phase" data-id="${t.id}" ${dis}>${ETAPES.map((e, i) => `<option value="${e.k}" ${t.phase === e.k ? "selected" : ""}>${i + 1} · ${esc(e.nom)}</option>`).join("")}</select></label>
          <label class="pl-f"><span>${UI.theme}</span><select data-plf="theme" data-id="${t.id}" ${dis}>${ORDRE_THEMES.map(k => `<option value="${k}" ${th === k ? "selected" : ""}>${esc(THEMES[k].nom)}</option>`).join("")}</select></label></div>
      </section>
      ${coachEnHaut ? "" : coachTache(t)}${relies(t)}
      <section class="pr-sec"><h3 class="home-h">${UI.note}</h3><label class="sr" for="pl-note">${UI.note}</label><textarea id="pl-note" class="pl-note" data-plf="note" data-id="${t.id}" placeholder="${UI.notePh}" ${dis}>${esc(t.note || "")}</textarea></section>
      ${S.canWrite ? `<button class="link" data-edit="tasks" data-id="${t.id}">${UI.toutModifier}</button>` : ""}
      ${S.canWrite ? `<div class="pr-bar pl-bar"><details class="pl-rep"><summary class="btn">${UI.reporter}</summary><div class="pl-repm">
          <button class="btn sm" data-act="plrep" data-id="${t.id}" data-j="7">${UI.plus1s}</button><button class="btn sm" data-act="plrep" data-id="${t.id}" data-j="30">${UI.plus1m}</button>
          <label class="pl-f"><span>${UI.choisir}</span><input type="date" data-plf="due" data-id="${t.id}"></label></div></details>
        <button class="btn primary" data-act="pldone" data-id="${t.id}">${t.status === "done" ? UI.refaire : UI.fait}</button></div>` : ""}</div>`;
  }
  function vRdv(id) {
    const r = S.rdv.find(x => x.id === id); if (!r) { S.f.plView = "main"; return vMain(); }
    const d = dateRdv(r), v = vendor(r.vendorId), secretAutre = r.secretDe && r.secretDe !== ctx.moi();
    return `<div class="ev-page pl-tache">
      <button class="link env-back" data-act="plback">${ctx.BACK_SVG}<span>${esc(S.f.plBackLabel || UI.titre)}</span></button>
      <span class="pl-etat">${UI.rdv}</span><h2 class="ev-h2">${esc(r.title)}</h2>
      <section class="pr-card pl-champs">
        <div class="pl-f"><span>${UI.echeance}</span><b>${d ? esc(dLong(d)) : UI.dateAFixer}</b></div>
        ${r.time ? `<div class="pl-f"><span>${UI.heure}</span><b class="num">${esc(r.time)}</b></div>` : ""}
        ${r.lieu ? `<div class="pl-f"><span>${UI.lieu}</span><b>${esc(r.lieu)}</b></div>` : ""}
        ${r.avec ? `<div class="pl-f"><span>${esc(UI.avec("").trim())}</span><b>${esc(r.avec)}</b></div>` : ""}
        ${r.qui && r.qui !== "deux" ? `<div class="pl-f"><span>${UI.qui}</span><b>${esc(ctx.OWNERS[r.qui])}</b></div>` : ""}
        ${secretAutre ? `<p class="ev-note">${UI.rdvSecret}</p>` : ""}</section>
      ${v ? `<section class="pr-sec"><h3 class="home-h">${UI.reliA}</h3><button class="pr-row" data-fiche="${v.id}"><span class="pr-av t-${ctx.tintOf(v.cat)}" aria-hidden="true">${esc(ctx.initials(v.name))}</span><span class="pr-rb"><b>${esc(v.name)}</b><span>${esc(v.cat)}</span></span>${ctx.CHEV}</button></section>` : ""}
      ${r.note ? `<section class="pr-sec"><h3 class="home-h">${UI.note}</h3><p class="pl-p">${esc(r.note)}</p></section>` : ""}
      ${d && d >= today() && !secretAutre ? `<section class="pr-card pl-coach">${coachEntete}<p>${UI.coachP.preparer}</p><button class="btn" data-act="qr" data-do="${esc(askPreparer(r))}">${UI.coachBtn.preparer}</button></section>` : ""}
      <div class="pl-acts">${d ? `<button class="btn primary" data-act="plics" data-id="${r.id}">${UI.ajouterTel}</button>` : ""}${S.canWrite && !secretAutre ? `<button class="btn" data-edit="rdv" data-id="${r.id}">${UI.toutModifier}</button>` : ""}</div></div>`;
  }

  /* ---------- gestes ---------- */
  function vPlanning() {
    switch (S.f.plView) { case "etape": return vEtape(S.f.plEtape); case "tache": return vTache(S.f.plId); case "rdv": return vRdv(S.f.plId); default: return vMain(); }
  }
  const show = (v, o = {}) => {
    if (v === "tache" || v === "rdv") { S.f.plFrom = { v: S.f.plView || "main", etape: S.f.plEtape }; S.f.plBackLabel = S.f.plView === "etape" && ETAPE[S.f.plEtape] ? ETAPE[S.f.plEtape].nom : UI.titre; }
    Object.assign(S.f, { plView: v }, o); ctx.saveF(); ctx.render(); window.scrollTo(0, 0);
  };
  async function setTache(id, data, msg) {
    const t = S.tasks.find(x => x.id === id); if (!t || !S.canWrite) return;
    const avant = Object.fromEntries(Object.keys(data).map(k => [k, t[k] ?? null]));
    if (await ctx.patch("tasks", id, data)) msg ? ctx.toastUndo(msg, () => ctx.patch("tasks", id, avant)) : null;
  }
  function act(a, t) {
    const id = t.dataset.id;
    switch (a) {
      case "plview": show(t.dataset.v); return true;
      case "pletape": show("etape", { plEtape: t.dataset.k }); return true;
      case "pltache": show("tache", { plId: id }); return true;
      case "plrdv": show("rdv", { plId: id }); return true;
      case "plback": { const f = S.f.plFrom || { v: "main" }; show(f.v === "tache" || f.v === "rdv" ? "main" : f.v, f.etape ? { plEtape: f.etape } : {}); return true; }
      case "plqui": S.f.owner = t.dataset.v; ctx.saveF(); ctx.render(); return true;
      case "plowner": setTache(id, { owner: t.dataset.v }); return true;
      case "pldone": { const x = S.tasks.find(y => y.id === id); if (!x || !S.canWrite) return true; const nx = x.status === "done" ? "todo" : "done";
        setTache(id, { status: nx, doneAt: nx === "done" ? Date.now() : null }, nx === "done" ? UI.faitOk(x.title) : null); return true; }
      case "plrep": { const x = S.tasks.find(y => y.id === id); if (!x) return true; const base = new Date(Math.max(+(ctx.taskDue(x) || 0), +today())); base.setDate(base.getDate() + (+t.dataset.j));
        const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
        setTache(id, { due: iso }, UI.reporteOk(dLong(base))); return true; }
      case "plmetier": S.f.pView = "metier"; S.f.pMetier = t.dataset.m; ctx.saveF(); ctx.go("prestataires"); return true;
      case "plposte": S.f.bView = "poste"; S.f.bPoste = id; ctx.saveF(); ctx.go("budget"); return true;
      case "plcoach": { const x = S.tasks.find(y => y.id === id); if (!x) return true;
        if (S.view === "planning" && S.f.plView !== "tache") show("tache", { plId: id }); // depuis « En retard » : la page de la tâche, où arrive le brouillon
        lancerCoach(id, t.dataset.k); return true; }
      case "plcopie": { const x = S.tasks.find(y => y.id === id), b = x && x.brouillon; if (!b) return true;
        const txt = `Objet : ${b.objet || ""}\n\n${b.corps}`;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => ctx.toast(UI.copie), () => ctx.toast(UI.copie)); return true; }
      case "plbudgetgo": S.f.bView = t.dataset.arb ? "arbitrer" : "main"; ctx.saveF(); ctx.go("budget"); return true;
      case "plics": { const r = S.rdv.find(x => x.id === id); if (!r) return true;
        const blob = new Blob([ics(r, { lieu: r.lieu, note: r.avec ? UI.avec(r.avec) : "" })], { type: "text/calendar" }), a2 = document.createElement("a");
        a2.href = URL.createObjectURL(blob); a2.download = `${String(r.title || "rendez-vous").replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 40) || "rendez-vous"}.ics`; document.body.appendChild(a2); a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(a2.href), 4000); return true; }
    }
    return false;
  }
  function change(el) {
    const f = el.dataset && el.dataset.plf; if (!f) return false;
    const id = el.dataset.id, v = el.value;
    if (f === "due") setTache(id, { due: v || "" }, v ? UI.reporteOk(dLong(ctx.pd(v))) : null);
    else if (f === "theme" || f === "phase" || f === "note") setTache(id, { [f]: v });
    return true;
  }
  return { vPlanning, act, change, enTache: () => S.view === "planning" && S.f.plView === "tache" };
}
