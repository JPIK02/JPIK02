// Onglet « Prestataires » v1 (docs/prestataires-v1.md, lot 1) : onglet, page d'un métier, fiche, écartés, onglet vide.
// Règles dans agents/lib/prestataires.js (partagées avec le coach et les agents). Aucun appel IA à l'affichage : tout est lu dans la base.
// L'app fournit ses outils via makePrest(ctx). Lot 2 (ajout, comparateur) et lot 3 (réservation) passent encore par l'existant.
import { FR } from "../agents/lib/envies/fr.js";
import { TBY, questionsOf, answerText, tileNom, retard } from "../agents/lib/envies/logic.js";
import { TILE_ICON } from "./envies-ui.js";
import { METIERS, AUTRE, tuileDe, multiple, etapeOf, enLice, etatMetier, compteur, meilleurFit, candidats, aDecider, prochaineEtape,
  mentions, doublons, contacts, historique, calendrier, dernierPrix, aDevis } from "../agents/lib/prestataires.js";

// Textes d'interface (à traduire)
const UI = {
  label: "Prestataires", rechercher: "Rechercher un prestataire", ajouter: "Ajouter un prestataire", chercherNom: "Nom d'un prestataire…",
  reserves: (n, m) => `métier${n > 1 ? "s" : ""} réservé${n > 1 ? "s" : ""} sur ${m}`, aReserver: m => `${m} métiers à réserver`,
  leg: { reserve: "Réservés", enCours: "En cours", aLancer: "À lancer" },
  decider: "À décider maintenant", moment: "C'est le moment", meilleurFit: "Meilleur fit", comparer: "Comparer", voir: "Voir",
  mails: n => `${n} prestataire${n > 1 ? "s" : ""} repéré${n > 1 ? "s" : ""} dans vos mails`, mailsS: "À ajouter d'un geste",
  enCours: n => `En cours · ${n}`, aLancer: n => `À lancer · ${n}`, reservesH: n => `Réservés · ${n}`, ecartesL: n => `Écartés (${n}) · gardés pour mémoire`,
  enLice: n => `${n} en lice`, repere1: "1 repéré", devisRecus: n => `${n} devis reçu${n > 1 ? "s" : ""}`, briefPret: "brief prêt",
  vers: m => (m >= 99 ? "Dès maintenant" : `Vers ${m} mois avant`), essFait: "essentiel fait", trouver: "Trouver",
  pasPourNous: "Pas pour nous", reactiver: "réactiver", fitL: "meilleur fit",
  aReserverVers: (m, d) => `${m >= 99 ? "À réserver dès maintenant" : `À réserver vers ${m} mois avant`}${d ? ` · d'ici ${d}` : ""}`,
  cherchez: "Ce que vous cherchez", nosEnvies: t => `Nos envies ${t}`, repondre: "Répondez à l'essentiel pour des notes plus justes · 1 min",
  enLiceH: n => `En lice · ${n}`, classes: "Classés par fit", pourVous: "Pour vous", aVerifier: "À vérifier", prixInconnu: "Prix inconnu",
  comparerN: n => `Comparer les ${n}`, convaincus: "Pas encore convaincus ?", avecAccord: "Recherche sur internet avec votre accord · sources citées", lancer: "Lancer la recherche",
  brief: m => `Brief ${m}`, envoyeA: (n, t) => (n ? `Envoyé à ${n} sur ${t}` : "Prêt à envoyer"), envoyerA: n => `Envoyer à ${n}`, briefBientot: "Prêt dès les détails remplis",
  ecartesH: n => `Écartés · ${n}`, remettre: "Remettre en lice", aucunCand: m => `Pas encore de ${m}.`,
  ia: "L'analyse est faite par une IA. Elle éclaire votre choix, elle ne décide pas pour vous.",
  etapes: { repere: "Repéré", discussion: "En discussion", reserve: "Réservé", ecarte: "Écarté" },
  reperePar: (d, p) => `repéré le ${d}${p ? ` par ${p}` : ""}`, fit: "fit", prochaine: "Prochaine étape", pourquoi: n => `Pourquoi ${n}`, pasAnalyse: "Pas encore analysé : la note arrive après la prochaine analyse.",
  avis: n => `${n} avis en ligne`, revient: t => `« ${t} » revient souvent`, devisH: "Devis", historiqueH: "Historique", contactH: "Contact", plusH: "Tous les détails",
  versionDu: (n, d) => `Version ${n} du ${d}`, luParAgent: "lue par l'agent mail", ajouteCoach: "ajoutée avec le coach",
  contact: { tel: "Appeler", email: "E-mail", site: "Site", instagram: "Instagram" },
  ecarter: "Écarter", reserver: "On le réserve",
  pe: {
    rdv: r => `Rendez-vous${r.title ? ` : ${r.title}` : ""}${r.time ? ` à ${r.time}` : ""}`, questions: n => `${n} question${n > 1 ? "s" : ""} prête${n > 1 ? "s" : ""} à poser`,
    voirQ: "Voir les questions", raconter: "Raconter le RDV", raconterT: d => `Comment s'est passé le rendez-vous du ${d} ?`, raconterS: "Vos impressions recalculent la note.",
    comparerT: "Devis reçu : comparez-le avec les autres", briefT: "Envoyez-lui votre brief", briefS: "Il résume vos envies et vos questions.", envoyerBrief: "Envoyer le brief",
    devisT: "Demandez-lui un devis", devisS: "Le coach peut rédiger le mail.", ecrire: "Écrire avec le coach", attendreT: "En attente de son retour", relancer: "Relancer avec le coach",
    acompteT: (m, d) => `Payer l'acompte de ${m}${d ? ` avant le ${d}` : ""}`, soldeT: d => `Solde ${d ? `avant le ${d}` : "à prévoir"}`, ajourT: "Tout est à jour", ecarteT: r => `Écarté${r ? ` : « ${r} »` : ""}`,
  },
  etatReserve: { acompte: "Acompte à payer", solde: d => (d ? `Solde le ${d}` : "Solde à prévoir"), ajour: "À jour" },
  ecarterT: n => `Écarter ${n} ?`, raisonP: "Pourquoi ? (facultatif)", raisons: ["Trop cher", "Pas disponible", "Pas notre style", "Trop loin", "Autre prestataire choisi"], raisonLibre: "Autre raison", confirmer: "Écarter", annuler: "Annuler",
  ecarteOk: n => `${n} écarté`, reserveOk: n => `${n} réservé`, remisOk: n => `${n} remis en lice`, dejaReserve: (m, n) => `${n} est déjà réservé pour ce métier : remettez-le en lice d'abord.`,
  doublon: n => `Doublon possible : ${n}`, histo: { repere: "Repéré", devis: v => `Devis${v ? ` v${v}` : ""} reçu`, rdv: "Rendez-vous", visite: "Notes de visite", brief: "Brief envoyé", mail: "Mail", ecarte: "Écarté" },
  src: { mail: "par l'agent mail", assistant: "avec le coach", coach: "avec le coach", couple: "par vous" },
  ecartesTitre: "Écartés · gardés pour mémoire", rienEcarte: "Aucun prestataire écarté.", outils: "Outils", briefsTous: "Briefs à envoyer",
  // onglet vide (4.7)
  videT: "Trouvons ceux qui vous ressemblent", videP: "Pas de catalogue : Lamaelle part de vos envies et note chaque prestataire que vous ajoutez ou que le coach trouve pour vous.",
  commencer: "Par où commencer", dapres: "D'après vos réponses", coachCherche: m => `Le coach cherche 3 ${m}`, dejaEnTete: m => `On a déjà des ${m} en tête`,
  accordMention: "La recherche sur internet se fait avec votre accord.",
  comment: "Comment ça marche", etapesV: [["Vos envies", "3 questions par métier suffisent"], ["Des noms", "les vôtres ou ceux du coach"], ["Une note", "sur 100, et pourquoi"]],
  calendrier: "Votre calendrier", maintenant: "Maintenant", ensuite: "Dans les 6 mois", plusTard: "Plus tard", dabord: "D'abord",
  pretChercher: "Essentiel fait · prêt à chercher", essentielDabord: "Répondez à l'essentiel d'abord · 1 min", chercher: "Chercher", envies: "Envies",
  signe: n => `${n} métier${n > 1 ? "s" : ""} · Lamaelle vous fera signe`, voirTous: n => `Voir les ${n} métiers`, fixerDate: "Fixez une date, même indicative, pour un calendrier précis",
  mailsVide: "Déjà en contact avec des prestataires ? Reliez vos mails : leurs devis arrivent ici tout seuls.",
  autres: "Autres prestataires",
};
// Métier → pluriel (« Les photographes », « Le coach cherche 3 fleuristes »)
const PL = { Lieu: "lieux", Traiteur: "traiteurs", Photographe: "photographes", "Vidéaste": "vidéastes", Musique: "musiciens et DJ", Fleuriste: "fleuristes",
  Tenues: "boutiques de tenues", Alliances: "bijoutiers", "Coiffure & maquillage": "coiffeurs et maquilleurs", Papeterie: "papetiers", Transport: "transporteurs",
  Officiant: "officiants", "Hébergement": "hébergements", "Animation enfants": "animateurs", Bar: "bars", "Pâtissier": "pâtissiers", "Wedding planner": "wedding planners",
  "Agence de voyage": "agences de voyage", Autre: "prestataires" };
const LES = { Lieu: "Les lieux", Autre: "Autres prestataires" };
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function makePrest(ctx) {
  const { S, esc } = ctx;
  const A = () => Object.fromEntries((S.envies || []).map(d => [d.id, d]));
  const pays = () => S.settings.pays || "FR";
  const pl = m => PL[m] || m.toLowerCase();
  const tuile = m => tuileDe(m);
  const T = m => { const k = tuile(m); return k ? TBY[k] || null : null; };
  const nomTuile = k => tileNom(k, FR, pays());
  const icon = m => `<svg class="ev-ic" viewBox="0 0 24 24" aria-hidden="true">${TILE_ICON[tuile(m)] || '<circle cx="12" cy="12" r="7"/><path d="M12 8v8M8 12h8"/>'}</svg>`;
  const vign = (m, cls = "") => `<span class="ev-ph ev-ph-ic pr-vign ${cls}" aria-hidden="true">${icon(m)}</span>`;
  const ini = (v, m) => `<span class="pr-av t-${ctx.tintOf(m || v.cat)}" aria-hidden="true">${esc(ctx.initials(v.name))}</span>`;
  const dFmt = d => (d ? `${d.getDate()} ${MOIS[d.getMonth()]}` : "");
  const dLong = d => (d ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "");
  const score = v => (v.fit && v.fit.score != null ? Math.round(v.fit.score) : null);
  const prenomDe = by => ctx.prenomDe(by);
  const dateM = ctx.wDate, today = ctx.today;
  const ctxRegles = () => ({ date: dateM(), today: today(), priorites: ((S.profil && S.profil.priorites) || []).map(p => p.cat) });
  const echeance = m => { const t = T(m), d = dateM(); if (!t || !d || t.remonte >= 99) return null; const x = new Date(d); x.setMonth(x.getMonth() - t.remonte); return x; };
  const briefPret = m => { const k = tuile(m); return !!(k && ctx.briefFor(k)); };
  const vendorsOf = m => S.vendors.filter(v => v.cat === m);
  const metiersPresents = () => METIERS.filter(m => m !== AUTRE || vendorsOf(AUTRE).length);

  /* ---------- texte d'une prochaine étape (onglet, métier, fiche) ---------- */
  function peTexte(pe) {
    switch (pe.k) {
      case "rdv": return `Rendez-vous le ${dFmt(pe.date)}`;
      case "raconter": return UI.pe.raconter;
      case "comparer": return UI.comparer;
      case "brief": return "Envoyer le brief";
      case "devis": return "Demander un devis";
      case "attendre": return UI.pe.attendreT;
      default: return "";
    }
  }
  const peOf = v => prochaineEtape(v, { rdv: S.rdv, today: today(), briefPret: briefPret(v.cat), candidats: candidats(v.cat, S.vendors).length });
  const mentionTxt = v => mentions(v, { rdv: S.rdv, today: today() }).map(x => (x.k === "devis" ? "Devis reçu" : x.k === "rdv" ? `RDV ${dFmt(x.date)}` : "Brief envoyé")).join(" · ");

  /* ---------- 4.1 L'onglet ---------- */
  function head() {
    const c = compteur(S.vendors, A());
    const dots = c.frise.map(x => `<i class="pr-dot ${x.etat}" title="${esc(x.m)}"></i>`).join("");
    return `<section class="pr-head">
      <div class="pr-top"><span class="pr-k">${UI.label.toUpperCase()}</span><span class="pr-btns">
        <button class="pr-round" data-act="prsearch" aria-label="${UI.rechercher}" aria-expanded="${!!S.f.pSearch}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>
        ${S.canWrite ? `<button class="pr-round plus" data-act="prnew" aria-label="${UI.ajouter}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>` : ""}</span></div>
      ${c.n ? `<div class="pr-count"><b class="num">${c.n}</b><span>${UI.reserves(c.n, c.total)}</span></div>` : `<div class="pr-count"><span>${UI.aReserver(c.total)}</span></div>`}
      <span class="pr-frise" role="img" aria-label="${c.n} réservés, ${c.frise.filter(x => x.etat === "enCours").length} en cours, ${c.frise.filter(x => x.etat === "aLancer").length} à lancer" style="grid-template-columns:repeat(${Math.max(1, c.total)},minmax(0,1fr))">${dots}</span>
      <span class="pr-leg">${["reserve", "enCours", "aLancer"].map(k => `<span><i class="pr-dot ${k}"></i>${UI.leg[k]}</span>`).join("")}</span>
      ${S.f.pSearch ? `<label class="sr" for="search-pr-q">${UI.rechercher}</label><input id="search-pr-q" class="pr-q" type="search" autocomplete="off" name="search_q" data-prq="1" placeholder="${UI.chercherNom}" value="${esc(S.f.pq || "")}">` : ""}
    </section>`;
  }
  function rechercheRes() {
    const q = ctx.fold(S.f.pq || ""); if (!S.f.pSearch || q.length < 2) return "";
    const res = S.vendors.filter(v => ctx.fold(v.name).includes(q)).slice(0, 12);
    return `<section class="pr-sec"><div class="pr-list">${res.length ? res.map(v => `<button class="pr-row" data-fiche="${v.id}">${ini(v)}<span class="pr-rb"><b>${esc(v.name)}</b><span>${esc(v.cat)} · ${UI.etapes[etapeOf(v)]}</span></span>${ctx.CHEV}</button>`).join("") : `<p class="ev-note">Aucun prestataire à ce nom.</p>`}</div></section>`;
  }
  function phraseDecider(d) {
    const cs = candidats(d.m, S.vendors), dv = cs.filter(aDevis).length, t = T(d.m), ech = echeance(d.m);
    const quand = t && t.remonte < 99 ? `Les ${pl(d.m)} se réservent vers ${t.remonte} mois avant${ech && ech > today() ? ` : à décider d'ici ${dLong(ech)}` : ""}.` : "";
    if (d.m === "Lieu" && !cs.length) return `Le lieu fixe la date, la capacité et le budget : il se réserve en premier.`;
    if (!cs.length) return `Pas encore de candidat. ${quand}`;
    return `${cs.length > 1 ? UI.enLice(cs.length) : UI.repere1}${dv ? `, ${UI.devisRecus(dv)}` : ""}. ${quand}`;
  }
  function carteDecider(d, label = UI.decider) {
    if (!d) return "";
    const cs = candidats(d.m, S.vendors), best = meilleurFit(d.m, S.vendors), cmp = cs.length >= 2;
    return `<section class="pr-sec"><h3 class="home-h">${label}</h3>
      <div class="pr-now">${vign(d.m, "big")}<div class="pr-now-b"><span class="ev-tag">${UI.moment}</span>
        <div class="pr-now-h"><b>${esc(nomMetier(d.m))}</b>${cs.length ? `<span class="pr-avs">${cs.slice(0, 3).map(v => ini(v, d.m)).join("")}</span>` : ""}</div>
        <p>${esc(phraseDecider(d))}</p>
        <div class="pr-now-f">${best != null ? `<span>${UI.meilleurFit} <b class="num">${best}</b>/100</span>` : "<span></span>"}
          ${cmp ? `<button class="btn primary" data-act="compare" data-cat="${esc(d.m)}">${UI.comparer}</button>` : `<button class="btn primary" data-act="prmetier" data-m="${esc(d.m)}">${UI.voir}</button>`}</div></div></div></section>`;
  }
  const nomMetier = m => (m === AUTRE ? UI.autres : m);
  function encartMails() {
    const n = ctx.pendingSugs().filter(s => s.type === "vendor" || s.type === "quote").length;
    return n ? `<button class="pr-mails" data-go="assistant"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></svg></span><span><b>${UI.mails(n)}</b><span>${UI.mailsS}</span></span>${ctx.CHEV}</button>` : "";
  }
  function ligneEnCours(m) {
    const cs = candidats(m, S.vendors), dv = cs.filter(aDevis).length, best = meilleurFit(m, S.vendors);
    const pe = cs.map(peOf).find(x => ["rdv", "raconter", "comparer", "brief"].includes(x.k)) || (cs[0] && peOf(cs[0]));
    const sub = [cs.length > 1 ? UI.enLice(cs.length) : UI.repere1, dv ? UI.devisRecus(dv) : briefPret(m) ? UI.briefPret : ""].filter(Boolean).join(" · ");
    return `<button class="pr-row big" data-act="prmetier" data-m="${esc(m)}">${vign(m)}<span class="pr-rb"><b>${esc(nomMetier(m))}</b><span>${esc(sub)}</span>${pe && peTexte(pe) ? `<span class="pr-next">${esc(peTexte(pe))}</span>` : ""}</span>
      ${best != null ? `<span class="pr-sc"><b class="num">${best}</b><small>${UI.fitL}</small></span>` : ""}</button>`;
  }
  function ligneALancer(m) {
    const t = T(m), st = etatMetier(m, S.vendors, A()), gris = st === "pasPourNous";
    const ess = t && ctx.env().essentielFait(t.k), venu = t && dateM() && retard(t, dateM(), today()) >= 0;
    const sub = gris ? `${UI.pasPourNous}` : [UI.vers(t ? t.remonte : 99), ess ? UI.essFait : ""].filter(Boolean).join(" · ");
    return `<div class="pr-row big ${gris ? "gris" : ""}">${vign(m)}<button class="pr-rb pr-link" data-act="prmetier" data-m="${esc(m)}"><b>${esc(nomMetier(m))}</b><span>${esc(sub)}</span></button>
      ${gris && S.canWrite ? `<button class="btn sm" data-act="envactif" data-k="${t.k}">${UI.reactiver}</button>` : !gris && venu && S.canWrite ? `<button class="btn sm" data-act="qr" data-do="${esc(askChercher(m))}">${UI.trouver}</button>` : ""}</div>`;
  }
  const askChercher = m => { const lieu = S.vendors.find(v => v.cat === "Lieu" && etapeOf(v) === "reserve"), d = dateM();
    return `ask:Peux-tu nous proposer 3 ${pl(m)} qui correspondent à nos envies${d ? `, libres le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}${lieu ? `, à moins d'une heure de ${lieu.name}` : ""} ?`; };
  function etatSuivi(v) {
    const pe = peOf(v);
    if (pe.k === "acompte") return `<span class="pr-st warn">${UI.etatReserve.acompte}</span>`;
    if (pe.k === "solde") return `<span class="pr-st">${UI.etatReserve.solde(dFmt(pe.date))}</span>`;
    return `<span class="pr-st">${UI.etatReserve.ajour}</span>`;
  }
  function vMain() {
    if (!S.vendors.length) return vVide();
    const ms = metiersPresents(), et = m => etatMetier(m, S.vendors, A());
    const enCours = ms.filter(m => et(m) === "enCours");
    const aLancer = ms.filter(m => m !== AUTRE && ["aLancer", "pasPourNous"].includes(et(m))).sort((a, b) => (et(a) === "pasPourNous") - (et(b) === "pasPourNous") || ((T(b) || {}).remonte || 0) - ((T(a) || {}).remonte || 0));
    const res = S.vendors.filter(v => etapeOf(v) === "reserve");
    const nEc = S.vendors.filter(v => etapeOf(v) === "ecarte").length;
    const d = aDecider(S.vendors, A(), ctxRegles());
    return `<div class="pr">${head()}${rechercheRes()}${carteDecider(d)}${encartMails() ? `<section class="pr-sec">${encartMails()}</section>` : ""}
      ${enCours.length ? `<section class="pr-sec"><h3 class="home-h">${UI.enCours(enCours.length)}</h3><div class="pr-list">${enCours.map(ligneEnCours).join("")}</div></section>` : ""}
      ${aLancer.length ? `<section class="pr-sec"><h3 class="home-h">${UI.aLancer(aLancer.filter(m => et(m) !== "pasPourNous").length)}</h3><div class="pr-list">${aLancer.map(ligneALancer).join("")}</div></section>` : ""}
      ${res.length ? `<section class="pr-sec"><h3 class="home-h">${UI.reservesH(res.length)}</h3><div class="pr-box">${res.map(v => `<button class="pr-res" data-fiche="${v.id}"><span class="pr-ck" aria-hidden="true">✓</span><span class="pr-rn"><span>${esc(nomMetier(v.cat))}</span> · <b>${esc(v.name)}</b></span>${etatSuivi(v)}</button>`).join("")}</div></section>` : ""}
      ${nEc ? `<button class="link pr-ec" data-act="prview" data-v="ecartes">${UI.ecartesL(nEc)}</button>` : ""}
      <details class="pr-sec pr-outils"><summary>${UI.outils}</summary><div class="pr-outils-b"><button class="btn" data-act="briefsmenu">${UI.briefsTous}</button>${ctx.analyseBar()}</div></details></div>`;
  }

  /* ---------- 4.2 La page d'un métier ---------- */
  function cherchez(m) {
    const t = T(m); if (!t) return "";
    const rec = (S.recompenses || []).find(r => r.id === `${t.k}.essentiel`), A0 = A();
    const pills = questionsOf(t.k, "essentiel", pays()).map(q => A0[q.id] && answerText(q, A0[q.id], FR).split(" · ")[0]).filter(Boolean).map(x => x.length > 28 ? x.slice(0, 27) + "…" : x).slice(0, 3);
    const meta = A0["_tuile." + t.k] || {}; if (+meta.budget) pills.push(`≈ ${ctx.eur(meta.budget)}`);
    const ess = ctx.env().essentielFait(t.k);
    return `<section class="pr-card pr-cherchez"><div class="pr-ch-h"><span class="pr-lab">${UI.cherchez.toUpperCase()}</span><button class="link" data-bgo="${t.k}">${esc(UI.nosEnvies(nomTuile(t.k).toLowerCase()))}</button></div>
      ${rec && rec.phrase ? `<p class="pr-phrase">« ${esc(rec.phrase)} »</p>` : ""}
      ${pills.length ? `<div class="pr-pills">${pills.map(p => `<span>${esc(p)}</span>`).join("")}</div>` : ""}
      ${!ess && S.canWrite ? `<button class="pr-ess" data-act="envstart" data-k="${t.k}" data-n="essentiel">${UI.repondre}</button>` : ""}</section>`;
  }
  function carteCandidat(v, i) {
    const f = v.fit || {}, av = f.avis || {}, sc = score(v), m = mentionTxt(v), e = etapeOf(v), prix = dernierPrix(v);
    const meta = [v.ville, av.note ? `${String(av.note).replace(".", ",")}${av.nombre ? ` sur ${av.nombre} avis` : ""}` : ""].filter(Boolean).join(" · ");
    return `<button class="pr-cand ${i === 0 ? "first" : ""}" data-fiche="${v.id}"><span class="pr-ct">${ini(v)}<span class="pr-rb"><b>${esc(v.name)}</b>${meta ? `<span>${esc(meta)}</span>` : ""}</span>${sc != null ? `<span class="pr-big num">${sc}<small>/100</small></span>` : `<span class="fit-pill none">à analyser</span>`}</span>
      ${(f.forces || []).length || (f.vigilance || []).length ? `<span class="pr-pv">${f.forces && f.forces[0] ? `<span><b class="ok-t">${UI.pourVous}</b> · ${esc(f.forces[0])}</span>` : ""}${f.vigilance && f.vigilance[0] ? `<span><b class="warn-t">${UI.aVerifier}</b> · ${esc(f.vigilance[0])}</span>` : ""}</span>` : ""}
      <span class="pr-cf"><span class="pr-chip ${e}">${esc(m || UI.etapes[e])}</span><span class="num">${prix ? ctx.eur(prix) : UI.prixInconnu}</span></span></button>`;
  }
  function vMetier(m) {
    const t = T(m), cs = candidats(m, S.vendors), ec = vendorsOf(m).filter(v => etapeOf(v) === "ecarte"), res = vendorsOf(m).filter(v => etapeOf(v) === "reserve");
    const ech = echeance(m), lieu = S.vendors.find(v => v.cat === "Lieu" && etapeOf(v) === "reserve"), d = dateM();
    const bk = t && ctx.briefFor(t.k), nonEnv = cs.filter(v => !v.briefEnvoyeLe);
    const coachP = `Le coach cherche 3 ${pl(m)} qui vous ressemblent${d ? `, libres le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}${lieu && m !== "Lieu" ? `, à moins d'une heure de ${lieu.name}` : ""}.`;
    return `<div class="ev-page pr-page">
      <div class="ev-cover"><span class="ev-ph ev-ph-ic cov" aria-hidden="true">${icon(m)}</span><button class="ev-back" data-act="prview" data-v="main" aria-label="${UI.label}">${ctx.BACK_SVG}</button>
        ${S.canWrite ? `<button class="ev-back pr-plus" data-act="prnew" data-m="${esc(m)}" aria-label="${UI.ajouter}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>` : ""}
        <div class="ev-cover-b"><h2>${esc(LES[m] || `Les ${pl(m)}`)}</h2>${t ? `<span>${esc(UI.aReserverVers(t.remonte, ech && ech > today() ? dLong(ech) : ""))}</span>` : ""}</div></div>
      ${cherchez(m)}
      ${res.length ? `<section class="pr-sec"><div class="pr-box">${res.map(v => `<button class="pr-res" data-fiche="${v.id}"><span class="pr-ck" aria-hidden="true">✓</span><span class="pr-rn"><b>${esc(v.name)}</b></span>${etatSuivi(v)}</button>`).join("")}</div></section>` : ""}
      <section class="pr-sec"><div class="pr-sec-h"><h3 class="home-h">${UI.enLiceH(cs.length)}</h3>${cs.length > 1 ? `<span class="ev-note">${UI.classes}</span>` : ""}</div>
        ${cs.length ? `<div class="pr-cands">${cs.map(carteCandidat).join("")}</div>` : `<p class="ev-note">${esc(UI.aucunCand(pl(m)))}</p>`}
        ${cs.length >= 2 ? `<button class="btn primary pr-cmp" data-act="compare" data-cat="${esc(m)}">${UI.comparerN(cs.length)}</button>` : ""}</section>
      ${S.canWrite ? `<section class="pr-coach"><span class="pr-ck2"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/></svg></span><b>${UI.convaincus.toUpperCase()}</b></span>
        <p>${esc(coachP)}</p><span class="pr-small">${UI.avecAccord}</span><button class="btn" data-act="qr" data-do="${esc(askChercher(m))}">${UI.lancer}</button></section>` : ""}
      ${t && m !== AUTRE ? `<section class="pr-card pr-brief"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>
        <span class="pr-rb"><b>${esc(UI.brief(m.toLowerCase()))}</b><span>${bk ? UI.envoyeA(cs.length - nonEnv.length, cs.length) : UI.briefBientot}</span></span>
        ${bk && nonEnv.length && S.canWrite ? `<button class="btn sm" data-act="prbrief" data-id="${nonEnv[0].id}">${esc(UI.envoyerA(nonEnv[0].name))}</button>` : !bk ? `<button class="btn sm" data-bgo="${t.k}">${UI.envies}</button>` : ""}</section>` : ""}
      ${ec.length ? `<details class="pr-card pr-ecs"><summary><b>${UI.ecartesH(ec.length)}</b></summary>${ec.map(ligneEcarte).join("")}</details>` : ""}
      <p class="ev-note">${UI.ia}</p></div>`;
  }
  const ligneEcarte = v => `<div class="pr-ecl"><button class="pr-rb pr-link" data-fiche="${v.id}"><b>${esc(v.name)}</b><span>${esc([v.raisonEcart ? `« ${v.raisonEcart} »` : "", v.ecarteLe ? dFmt(new Date(v.ecarteLe)) : ""].filter(Boolean).join(" · "))}</span></button>${S.canWrite ? `<button class="btn sm" data-act="prlice" data-id="${v.id}">${UI.remettre}</button>` : ""}</div>`;
  function vEcartes() {
    const ec = S.vendors.filter(v => etapeOf(v) === "ecarte");
    return `<div class="ev-page"><button class="link env-back" data-act="prview" data-v="main">${ctx.BACK_SVG}<span>${UI.label}</span></button><h2 class="ev-h2">${UI.ecartesTitre}</h2>
      ${ec.length ? metiersPresents().filter(m => ec.some(v => v.cat === m)).map(m => `<section class="pr-sec"><h3 class="home-h">${esc(nomMetier(m))}</h3><div class="pr-box">${ec.filter(v => v.cat === m).map(ligneEcarte).join("")}</div></section>`).join("") : `<p class="ev-note">${UI.rienEcarte}</p>`}</div>`;
  }

  /* ---------- 4.3 La fiche ---------- */
  function anneau(sc) {
    const C = 2 * Math.PI * 34, x = sc == null ? 0 : Math.max(0, Math.min(100, sc)) / 100 * C;
    return `<span class="pr-ring" role="img" aria-label="${sc == null ? "Pas encore de note" : `Fit avec vos envies : ${sc} sur 100`}"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="34" class="tr"/>${sc == null ? "" : `<circle cx="42" cy="42" r="34" class="fg" stroke-dasharray="${x.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 42 42)"/>`}</svg><span><b class="num">${sc == null ? "–" : sc}</b><small>${UI.fit}</small></span></span>`;
  }
  function boxProchaine(v) {
    const pe = peOf(v), nq = ((v.questionsAPoser && v.questionsAPoser.questions) || (v.fit && v.fit.questions) || []).length;
    const cal = d => `<span class="pr-cal" aria-hidden="true"><small>${MOIS[d.getMonth()].toUpperCase()}</small><b>${d.getDate()}</b></span>`;
    let corps = "", btns = "";
    const ask = q => `data-act="qr" data-do="${esc("ask:" + q)}"`;
    switch (pe.k) {
      case "rdv": corps = `${cal(pe.date)}<span><b>${esc(UI.pe.rdv(pe.rdv))}</b>${nq ? `<span>${UI.pe.questions(nq)}</span>` : ""}</span>`;
        btns = `${nq ? `<button class="btn dark" data-act="prquestions">${UI.pe.voirQ}</button>` : ""}${S.canWrite ? `<button class="btn" data-act="editv" data-id="${v.id}">${UI.pe.raconter}</button>` : ""}`; break;
      case "raconter": corps = `${cal(pe.date)}<span><b>${esc(UI.pe.raconterT(dFmt(pe.date)))}</b><span>${UI.pe.raconterS}</span></span>`;
        btns = S.canWrite ? `<button class="btn dark" data-act="editv" data-id="${v.id}">${UI.pe.raconter}</button>` : ""; break;
      case "comparer": corps = `<span><b>${UI.pe.comparerT}</b></span>`; btns = `<button class="btn dark" data-act="compare" data-cat="${esc(v.cat)}" data-id="${v.id}">${UI.comparer}</button>`; break;
      case "brief": corps = `<span><b>${UI.pe.briefT}</b><span>${UI.pe.briefS}</span></span>`; btns = S.canWrite ? `<button class="btn dark" data-act="prbrief" data-id="${v.id}">${UI.pe.envoyerBrief}</button>` : ""; break;
      case "devis": corps = `<span><b>${UI.pe.devisT}</b><span>${UI.pe.devisS}</span></span>`; btns = S.canWrite ? `<button class="btn dark" ${ask(`Rédige un mail pour demander un devis à ${v.name} (${v.cat}), à partir de nos envies.`)}>${UI.pe.ecrire}</button>` : ""; break;
      case "attendre": corps = `<span><b>${UI.pe.attendreT}</b></span>`; btns = S.canWrite ? `<button class="btn" ${ask(`Rédige une relance courtoise pour ${v.name} (${v.cat}).`)}>${UI.pe.relancer}</button>` : ""; break;
      case "acompte": corps = `${pe.date ? cal(pe.date) : ""}<span><b>${esc(UI.pe.acompteT(ctx.eur(pe.montant), pe.date ? dFmt(pe.date) : ""))}</b></span>`; btns = S.canWrite ? `<button class="btn" data-act="editv" data-id="${v.id}">Marquer payé</button>` : ""; break;
      case "solde": corps = `${pe.date ? cal(pe.date) : ""}<span><b>${esc(UI.pe.soldeT(pe.date ? dFmt(pe.date) : ""))}</b></span>`; break;
      case "ajour": corps = `<span><b>${UI.pe.ajourT}</b></span>`; break;
      case "ecarte": corps = `<span><b>${esc(UI.pe.ecarteT(v.raisonEcart))}</b></span>`; btns = S.canWrite ? `<button class="btn" data-act="prlice" data-id="${v.id}">${UI.remettre}</button>` : ""; break;
    }
    return `<section class="pr-pe"><span class="pr-lab">${UI.prochaine.toUpperCase()}</span><div class="pr-pe-b">${corps}</div>${btns ? `<div class="pr-pe-a">${btns}</div>` : ""}</section>`;
  }
  function pourquoi(v) {
    const f = v.fit || {}, av = f.avis || {}, sc = score(v);
    if (sc == null) return `<section class="pr-sec"><p class="ev-note">${UI.pasAnalyse}</p></section>`;
    const trait = av.trait || (av.resume ? String(av.resume).split(/(?<=[.!?])\s/)[0] : "");
    const ok = (f.forces || []).slice(0, 4), ve = (f.vigilance || []).slice(0, 3);
    return `<section class="pr-sec"><h3 class="home-h">${UI.pourquoi(sc)}</h3>
      ${ok.length || ve.length ? `<div class="pr-card pr-why">${ok.map(x => `<span class="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${esc(x)}</span>`).join("")}${ok.length && ve.length ? "<hr>" : ""}${ve.map(x => `<span class="ve"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.5v.5"/></svg>${esc(x)}</span>`).join("")}</div>` : ""}
      ${av.note ? `<div class="pr-card pr-avis"><b class="num">${esc(String(av.note).replace(".", ","))}</b><span>${av.nombre ? `<b>${esc(UI.avis(av.nombre))}</b>` : ""}${trait ? `<span>${esc(trait.length > 110 ? trait.slice(0, 109) + "…" : trait)}</span>` : ""}</span></div>` : ""}
      <p class="ev-note">${UI.ia}</p></section>`;
  }
  function devisCarte(v) {
    const list = Array.isArray(v.devis) ? v.devis : []; if (!list.length) return "";
    const d = list[0], p = list[1], dl = p && +p.montant ? +d.montant - +p.montant : null;
    const src = d.source === "mail" ? UI.luParAgent : d.source === "coach" ? UI.ajouteCoach : "";
    const inc = (d.inclus || [])[0];
    return `<section class="pr-sec"><h3 class="home-h">${UI.devisH}</h3><details class="pr-card pr-devis"><summary><span class="pr-dv"><b class="num">${ctx.eur(d.montant)}</b>${p && +p.montant ? `<s class="num">${ctx.eur(p.montant)}</s>` : ""}${dl ? `<span class="pr-delta ${dl < 0 ? "ok" : "bad"} num">${dl < 0 ? "−" : "+"}${ctx.eur(Math.abs(dl))}</span>` : ""}</span>
      <span class="pr-small">${esc([UI.versionDu(list.length, dFmt(ctx.pd(d.recuLe))), src, inc].filter(Boolean).join(" · "))}</span></summary>${ctx.devisSection(v)}</details></section>`;
  }
  function histo(v) {
    const ev = historique(v, { rdv: S.rdv, inbox: S.inbox }); if (!ev.length) return "";
    const t = e => (e.k === "devis" ? UI.histo.devis(e.version) : UI.histo[e.k]);
    const s = e => e.k === "repere" ? [UI.src[e.src] || "", e.by ? `par ${prenomDe(e.by) || e.by}` : ""].filter(Boolean).join(" ") : e.k === "devis" ? [e.montant ? ctx.eur(e.montant) : "", UI.src[e.src] || ""].filter(Boolean).join(" · ") : e.k === "rdv" ? e.titre : e.k === "mail" ? e.sujet : e.k === "ecarte" ? e.raison : "";
    return `<section class="pr-sec"><h3 class="home-h">${UI.historiqueH}</h3><div class="pr-card pr-histo">${ev.map((e, i) => `<div class="pr-h ${i ? "" : "last"}"><i aria-hidden="true"></i><span><b>${esc(t(e))}</b>${s(e) ? `<span>${esc(s(e))}</span>` : ""}</span><small>${e.at ? dFmt(new Date(e.at)) : ""}</small></div>`).join("")}</div></section>`;
  }
  function contactSec(v) {
    const c = contacts(v), href = { tel: x => `tel:${x.replace(/[^\d+]/g, "")}`, email: x => `mailto:${x}`, site: x => x, instagram: x => x };
    const ks = Object.keys(UI.contact).filter(k => c[k]); if (!ks.length) return "";
    return `<section class="pr-sec"><h3 class="home-h">${UI.contactH}</h3><div class="pr-contact" style="grid-template-columns:repeat(${ks.length},minmax(0,1fr))">${ks.map(k => `<a href="${esc(href[k](c[k]))}" ${k === "site" || k === "instagram" ? 'target="_blank" rel="noopener noreferrer"' : ""}><span class="pr-cdot" aria-hidden="true"></span>${UI.contact[k]}</a>`).join("")}</div></section>`;
  }
  function vFiche(id) {
    const v = S.vendors.find(x => x.id === id); if (!v) return vMain();
    const e = etapeOf(v), sc = score(v), dup = doublons(v, S.vendors);
    const created = v.createdAt ? dFmt(new Date(v.createdAt)) : "";
    const sub = [v.ville, created ? UI.reperePar(created, v.by ? prenomDe(v.by) : "") : ""].filter(Boolean).join(" · ");
    const steps = ["repere", "discussion", "reserve"], idx = steps.indexOf(e);
    const bar = e === "ecarte" ? "" : `<span class="pr-steps" role="img" aria-label="Étape : ${UI.etapes[e]}">${steps.map((s, i) => `<span class="${i <= idx ? "on" : ""} ${i === idx ? "cur" : ""}"><i></i>${UI.etapes[s]}</span>`).join("")}</span>`;
    const action = S.canWrite && (e === "repere" || e === "discussion") ? `<div class="pr-bar"><button class="btn" data-act="precart" data-id="${v.id}">${UI.ecarter}</button><button class="btn primary" data-act="prreserve" data-id="${v.id}">${UI.reserver}</button></div>` : "";
    return `<div class="pr-fiche ${action ? "has-bar" : ""}">
      <section class="pr-fh"><div class="pr-top"><button class="pr-round" data-act="prback" aria-label="Retour">${ctx.BACK_SVG}</button>${S.canWrite ? `<button class="pr-round" data-act="editv" data-id="${v.id}" aria-label="Modifier la fiche"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>` : ""}</div>
        <div class="pr-fh-m"><span class="pr-fh-t"><span class="pr-k">${esc(nomMetier(v.cat).toUpperCase())}${e === "ecarte" ? ` · ${UI.etapes.ecarte.toUpperCase()}` : ""}</span><h2>${esc(v.name)}</h2>${sub ? `<span class="pr-fh-s">${esc(sub)}</span>` : ""}</span>${anneau(sc)}</div>${bar}</section>
      ${dup.length ? `<p class="banner warn">${esc(UI.doublon(dup.map(x => x.name).join(", ")))}</p>` : ""}
      ${boxProchaine(v)}${pourquoi(v)}${devisCarte(v)}${histo(v)}${contactSec(v)}
      <details class="pr-sec pr-plus"><summary>${UI.plusH}</summary>${ctx.ficheDetails(v)}</details>
      ${action}</div>`;
  }

  /* ---------- 4.7 L'onglet vide ---------- */
  function vVide() {
    const d = aDecider(S.vendors, A(), ctxRegles()) || { m: "Lieu" };
    const t = T(d.m), A0 = A(), logo = ctx.logo();
    const pills = t ? questionsOf(t.k, "essentiel", pays()).map(q => A0[q.id] && answerText(q, A0[q.id], FR).split(" · ")[0]).filter(Boolean).slice(0, 3) : [];
    const cal = calendrier(S.vendors, A0, { date: dateM(), today: today() });
    const ligneCal = x => { const ess = ctx.env().essentielFait(x.t.k);
      return `<div class="pr-cl">${vign(x.m)}<span class="pr-rb"><b>${esc(nomMetier(x.m))}</b><span class="${ess ? "" : "warn-t"}">${ess ? UI.pretChercher : UI.essentielDabord}</span></span>
        ${S.canWrite ? (ess ? `<button class="btn sm" data-act="qr" data-do="${esc(askChercher(x.m))}">${UI.chercher}</button>` : `<button class="btn sm" data-act="envstart" data-k="${x.t.k}" data-n="essentiel">${UI.envies}</button>`) : ""}</div>`; };
    const groupe = (titre, list, detail) => !list.length ? "" : `<div class="pr-per"><span class="pr-lab">${titre.toUpperCase()}</span>${detail || S.f.pCalTous ? list.map(ligneCal).join("") : `<p class="ev-note">${esc(UI.signe(list.length))}</p>`}</div>`;
    const tous = cal.maintenant.length + cal.ensuite.length + cal.plusTard.length;
    return `<div class="pr">
      <section class="pr-head vide"><span class="pr-wm" aria-hidden="true">${logo}</span><div class="pr-top"><span class="pr-k">${UI.label.toUpperCase()}</span>${S.canWrite ? `<button class="pr-round plus" data-act="prnew" aria-label="${UI.ajouter}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>` : ""}</div>
        <h2 class="pr-vt">${UI.videT}</h2><p>${UI.videP}</p></section>
      <section class="pr-sec"><h3 class="home-h">${UI.commencer}</h3><div class="pr-now col">${vign(d.m, "big")}<div class="pr-now-b"><span class="ev-tag">${UI.moment}</span><b>${esc(nomMetier(d.m))}</b><p>${esc(phraseDecider(d))}</p>
        ${pills.length ? `<div class="pr-pills">${pills.map(p => `<span>${esc(p)}</span>`).join("")}</div><span class="pr-small">${UI.dapres}</span>` : ""}
        ${S.canWrite ? `<div class="pr-now-a"><button class="btn primary" data-act="qr" data-do="${esc(askChercher(d.m))}">${esc(UI.coachCherche(pl(d.m)))}</button><button class="btn" data-act="prnew" data-m="${esc(d.m)}">${esc(UI.dejaEnTete(pl(d.m)))}</button></div><span class="pr-small">${UI.accordMention}</span>` : ""}</div></div></section>
      <section class="pr-sec"><h3 class="home-h">${UI.comment}</h3><div class="pr-how">${UI.etapesV.map(([a, b], i) => `<div><b class="num">${i + 1}</b><span><b>${a}</b><span>${b}</span></span></div>`).join("")}</div></section>
      <section class="pr-sec"><div class="pr-sec-h"><h3 class="home-h">${UI.calendrier}</h3>${dateM() ? `<span class="ev-note">${esc(dateM().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }))}</span>` : ""}</div>
        <div class="pr-card">${cal.sansDate ? `<button class="link" data-go="reglages">${UI.fixerDate}</button>` : ""}
        ${groupe(cal.sansDate ? UI.dabord : UI.maintenant, cal.maintenant, true)}${groupe(UI.ensuite, cal.ensuite)}${groupe(UI.plusTard, cal.plusTard)}
        ${!S.f.pCalTous && tous ? `<button class="link" data-act="prcaltous">${UI.voirTous(tous)}</button>` : ""}</div></section>
      <section class="pr-sec"><button class="pr-mails" data-go="reglages-ia"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></svg></span><span><b>${UI.mailsVide}</b></span>${ctx.CHEV}</button></section></div>`;
  }

  function vPrest() {
    const v = S.f.pView;
    if (v === "fiche" && S.vendors.some(x => x.id === S.f.pFiche)) return vFiche(S.f.pFiche);
    if (v === "metier" && METIERS.includes(S.f.pMetier) && S.vendors.length) return vMetier(S.f.pMetier);
    if (v === "ecartes" && S.vendors.length) return vEcartes();
    return vMain();
  }

  /* ---------- Gestes ---------- */
  const show = (view, extra = {}) => { Object.assign(S.f, { pView: view }, extra); ctx.saveF(); ctx.go("prestataires"); window.scrollTo(0, 0); };
  async function setEtape(v, status, extra = {}, msg) {
    const before = Object.fromEntries(["status", "raisonEcart", "ecarteLe", "reserveLe"].map(k => [k, v[k] ?? null]));
    if (await ctx.patch("vendors", v.id, { status, ...extra })) ctx.toastUndo(msg, () => ctx.patch("vendors", v.id, before));
  }
  function sheetEcart(v) {
    ctx.layer(`<div class="ov" data-close="1"><form class="modal form" id="pr-ecart" role="dialog" aria-modal="true" aria-label="${esc(UI.ecarterT(v.name))}"><h3>${esc(UI.ecarterT(v.name))}</h3>
      <fieldset class="pr-raisons"><legend>${UI.raisonP}</legend>${UI.raisons.map(r => `<label class="chip"><input type="radio" name="raison" value="${esc(r)}"> ${esc(r)}</label>`).join("")}</fieldset>
      <div class="field"><label for="search-pr-raison">${UI.raisonLibre}</label><input id="search-pr-raison" name="search_raison" autocomplete="off"></div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="submit" class="btn primary">${UI.confirmer}</button></div></div></form></div>`);
    document.getElementById("pr-ecart").addEventListener("submit", async e => {
      e.preventDefault(); const f = e.target, r = (f.elements.search_raison.value || "").trim() || (f.querySelector("input[name=raison]:checked") || {}).value || "";
      ctx.closeModal(); await setEtape(v, "ecarte", { raisonEcart: r, ecarteLe: Date.now() }, UI.ecarteOk(v.name));
    });
  }
  function act(a, t) {
    const id = t.dataset.id, v = id && S.vendors.find(x => x.id === id);
    switch (a) {
      case "prview": show(t.dataset.v); return true;
      case "prmetier": show("metier", { pMetier: t.dataset.m }); return true;
      case "prback": { const f = S.vendors.find(x => x.id === S.f.pFiche); show(f ? "metier" : "main", f ? { pMetier: f.cat } : {}); return true; }
      case "prsearch": S.f.pSearch = !S.f.pSearch; if (!S.f.pSearch) S.f.pq = ""; ctx.render(); if (S.f.pSearch) document.getElementById("search-pr-q")?.focus(); return true;
      case "prnew": ctx.openEditor("vendors", null, { cat: t.dataset.m || (S.f.pView === "metier" ? S.f.pMetier : "Lieu"), status: "repere", by: ctx.userEmail() }); return true;
      case "prquestions": { const d = document.querySelector(".pr-plus"); if (d) d.open = true; document.getElementById("pr-questions")?.scrollIntoView({ behavior: "smooth", block: "start" }); return true; }
      case "prcaltous": S.f.pCalTous = true; ctx.render(); return true;
      case "prlice": if (v) setEtape(v, aDevis(v) || v.briefEnvoyeLe ? "discussion" : "repere", { raisonEcart: null, ecarteLe: null }, UI.remisOk(v.name)); return true;
      case "precart": if (v) sheetEcart(v); return true;
      case "prreserve": {
        if (!v) return true;
        const autre = !multiple(v.cat) && S.vendors.find(x => x.id !== v.id && x.cat === v.cat && etapeOf(x) === "reserve");
        if (autre) { ctx.toast(UI.dejaReserve(v.cat, autre.name)); return true; }
        setEtape(v, "reserve", { reserveLe: Date.now() }, UI.reserveOk(v.name)); return true;
      }
      case "prbrief": {
        if (!v) return true; const k = tuile(v.cat), b = k && ctx.briefFor(k); if (!b) return true;
        ctx.pdfBriefs(b);
        ctx.patch("vendors", v.id, { briefEnvoyeLe: Date.now(), ...(etapeOf(v) === "repere" ? { status: "discussion" } : {}) });
        return true;
      }
    }
    return false;
  }
  function input(el) { if (!el.dataset.prq) return false; S.f.pq = el.value; ctx.render(); const i = document.getElementById("search-pr-q"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return true; }
  // Ouvre la fiche d'un prestataire (anciens appels openFiche : accueil, comparateur, coach…)
  const openFiche = id => show("fiche", { pFiche: id });
  return { vPrest, act, input, openFiche, enFiche: () => S.view === "prestataires" && S.f.pView === "fiche" && S.vendors.some(x => x.id === S.f.pFiche) };
}
