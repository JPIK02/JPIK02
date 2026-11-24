// Onglet « Prestataires » v1 (docs/prestataires-v1.md, lot 1) : onglet, page d'un métier, fiche, écartés, onglet vide.
// Règles dans agents/lib/prestataires.js (partagées avec le coach et les agents). Aucun appel IA à l'affichage : tout est lu dans la base.
// L'app fournit ses outils via makePrest(ctx). Lot 2 (ajout, comparateur) et lot 3 (réservation) passent encore par l'existant.
import { FR } from "../agents/lib/envies/fr.js";
import { TBY, questionsOf, answerText, tileNom, retard } from "../agents/lib/envies/logic.js";
import { TILE_ICON } from "./envies-ui.js";
import { METIERS, AUTRE, tuileDe, multiple, etapeOf, enLice, etatMetier, compteur, meilleurFit, candidats, aDecider, prochaineEtape,
  mentions, doublons, contacts, historique, calendrier, dernierPrix, aDevis, cleComparaison, empreinte, tachesReservation } from "../agents/lib/prestataires.js";

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
  comparerN: () => "Comparer", convaincus: "Pas encore convaincus ?", avecAccord: "Recherche sur internet avec votre accord · sources citées", lancer: "Lancer la recherche",
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
  secrete: "Secrète", tenueAutre: p => `Tenue de ${p} · secrète`, tenueAutreS: (n, r) => (r ? "Réservée" : `${n} prestataire${n > 1 ? "s" : ""} en lice`),
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
  // tenue secrète de l'autre (meta/secret) : comptée dans la frise et l'état du métier, sans nom ni contenu
  const secretAutre = () => { const k = ctx.autreKey(), s2 = (S.secret || {})[k] || {}; return !s2.montre && (s2.prestataires || s2.reserve) ? s2 : null; };
  const VS = () => { const s2 = secretAutre(); return s2 ? [...S.vendors, { id: "_secret", cat: "Tenues", name: "", status: s2.reserve ? "reserve" : "repere", _secretDe: ctx.autreKey() }] : S.vendors; };
  const badgeSecret = v => (v._prive ? `<span class="pr-secret">${UI.secrete}</span>` : "");
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
  const peOf = v => prochaineEtape(v, { rdv: S.rdv, today: today(), briefPret: briefPret(v.cat), candidats: candidats(v.cat, S.vendors).length, taches: S.tasks || [] });
  const mentionTxt = v => mentions(v, { rdv: S.rdv, today: today() }).map(x => (x.k === "devis" ? "Devis reçu" : x.k === "rdv" ? `RDV ${dFmt(x.date)}` : "Brief envoyé")).join(" · ");

  /* ---------- 4.1 L'onglet ---------- */
  function head() {
    const c = compteur(VS(), A());
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
    const t = T(m), st = etatMetier(m, VS(), A()), gris = st === "pasPourNous";
    const ess = t && ctx.env().essentielFait(t.k), venu = t && dateM() && retard(t, dateM(), today()) >= 0;
    const sub = gris ? `${UI.pasPourNous}` : [UI.vers(t ? t.remonte : 99), ess ? UI.essFait : ""].filter(Boolean).join(" · ");
    return `<div class="pr-row big ${gris ? "gris" : ""}">${vign(m)}<button class="pr-rb pr-link" data-act="prmetier" data-m="${esc(m)}"><b>${esc(nomMetier(m))}</b><span>${esc(sub)}</span></button>
      ${gris && S.canWrite ? `<button class="btn sm" data-act="envactif" data-k="${t.k}">${UI.reactiver}</button>` : !gris && venu && S.canWrite ? `<button class="btn sm" data-act="qr" data-do="${esc(askChercher(m))}">${UI.trouver}</button>` : ""}</div>`;
  }
  const askChercher = m => { const lieu = S.vendors.find(v => v.cat === "Lieu" && etapeOf(v) === "reserve"), d = dateM();
    return `ask:Peux-tu nous proposer 3 ${pl(m)} qui correspondent à nos envies${d ? `, libres le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}${lieu ? `, à moins d'une heure de ${lieu.name}` : ""} ?`; };
  function etatSuivi(v) {
    const pe = peOf(v);
    if (pe.k === "contrat") return `<span class="pr-st warn">Contrat à signer</span>`;
    if (pe.k === "acompte") return `<span class="pr-st warn">${UI.etatReserve.acompte}</span>`;
    if (pe.k === "solde") return `<span class="pr-st">${UI.etatReserve.solde(dFmt(pe.date))}</span>`;
    return `<span class="pr-st">${UI.etatReserve.ajour}</span>`;
  }
  function vMain() {
    if (!S.vendors.length) return vVide();
    const ms = metiersPresents(), et = m => etatMetier(m, VS(), A());
    const enCours = ms.filter(m => et(m) === "enCours");
    const aLancer = ms.filter(m => m !== AUTRE && ["aLancer", "pasPourNous"].includes(et(m))).sort((a, b) => (et(a) === "pasPourNous") - (et(b) === "pasPourNous") || ((T(b) || {}).remonte || 0) - ((T(a) || {}).remonte || 0));
    const res = S.vendors.filter(v => etapeOf(v) === "reserve");
    const nEc = S.vendors.filter(v => etapeOf(v) === "ecarte").length;
    const d = aDecider(VS(), A(), ctxRegles());
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
    return `<button class="pr-cand ${i === 0 ? "first" : ""}" data-fiche="${v.id}"><span class="pr-ct">${ini(v)}<span class="pr-rb"><b>${esc(v.name)}</b>${badgeSecret(v)}${meta ? `<span>${esc(meta)}</span>` : ""}</span>${sc != null ? `<span class="pr-big num">${sc}<small>/100</small></span>` : `<span class="fit-pill none">à analyser</span>`}</span>
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
        ${cs.length >= 2 ? `<button class="btn primary pr-cmp" data-act="compare" data-cat="${esc(m)}">${UI.comparerN(cs.length)}</button>` : ""}
        ${m === "Tenues" && secretAutre() ? `<div class="pr-row"><span class="pr-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><span class="pr-rb"><b>${esc(UI.tenueAutre(ctx.prenomAutre()))}</b><span>${esc(UI.tenueAutreS(secretAutre().prestataires || 0, secretAutre().reserve))}</span></span></div>` : ""}</section>
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
      case "acompte": corps = `${pe.date ? cal(pe.date) : ""}<span><b>${esc(UI.pe.acompteT(ctx.eur(pe.montant), pe.date ? dFmt(pe.date) : ""))}</b></span>`; btns = S.canWrite ? `<button class="btn" data-act="prpaye" data-id="${v.id}" data-k="acompte">${UR.marquer}</button>` : ""; break;
      case "solde": corps = `${pe.date ? cal(pe.date) : ""}<span><b>${esc(UI.pe.soldeT(pe.date ? dFmt(pe.date) : ""))}${pe.montant ? ` · ${ctx.eur(pe.montant)}` : ""}</b></span>`; btns = S.canWrite ? `<button class="btn" data-act="prpaye" data-id="${v.id}" data-k="solde">${UR.marquer}</button>` : ""; break;
      case "contrat": corps = `<span><b>${UR.contratT}</b></span>`; btns = S.canWrite ? `<button class="btn dark" data-act="prcontrat" data-id="${pe.tache.id}">${UR.contratB}</button>` : ""; break;
      case "point": corps = `${cal(pe.date)}<span><b>${esc(UR.pointT(dFmt(pe.date)))}</b></span>`; btns = S.canWrite ? `<button class="btn" ${ask(`Prépare avec nous le point d'un mois avant le mariage avec ${v.name} (${v.cat}) : ce qu'il faut leur confirmer et leur demander.`)}>${UR.pointB}</button>` : ""; break;
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
        <div class="pr-fh-m"><span class="pr-fh-t"><span class="pr-k">${esc(nomMetier(v.cat).toUpperCase())}${e === "ecarte" ? ` · ${UI.etapes.ecarte.toUpperCase()}` : ""}${v._prive ? ` · ${UI.secrete.toUpperCase()}` : ""}</span><h2>${esc(v.name)}</h2>${sub ? `<span class="pr-fh-s">${esc(sub)}</span>` : ""}</span>${anneau(sc)}</div>${bar}</section>
      ${dup.length ? `<p class="banner warn">${esc(UI.doublon(dup.map(x => x.name).join(", ")))}</p>` : ""}
      ${boxProchaine(v)}${paiements(v)}${prevenirFiche(v)}${pourquoi(v)}${devisCarte(v)}${histo(v)}${contactSec(v)}
      <details class="pr-sec pr-plus"><summary>${UI.plusH}</summary>${ctx.ficheDetails(v)}</details>
      ${action}</div>`;
  }

  /* ---------- 4.7 L'onglet vide ---------- */
  function vVide() {
    const d = aDecider(VS(), A(), ctxRegles()) || { m: "Lieu" };
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


  /* ---------- 4.5 Ajouter un prestataire (feuille) ---------- */
  // S.ui.prAdd = { m, etape: "choix" | "verif", busy, err, draft }
  const UA = {
    titre: "Ajouter un prestataire", deja: "Vous l'avez déjà trouvé", champ: "Collez un lien Instagram ou un site, ou tapez un nom", continuer: "Continuer",
    carte: "Carte ou flyer", pdf: "Un devis PDF", iaRemplit: "L'IA remplit la fiche (nom, métier, ville, contacts, prix si devis) ; vous vérifiez avant d'enregistrer.",
    coach: "Le coach cherche pour vous", coachP: "Il cherche sur internet avec votre accord, et cite ses sources.", coachB: m => `Chercher des ${m}`,
    mails: n => `Repérés dans vos mails · ${n}`, ajouterMail: n => `Ajouter ${n}`, lecture: "Lecture en cours…", verifier: "Vérifiez la fiche",
    verifP: "Rempli par l'IA à partir de votre source : corrigez ce qui ne va pas. Rien n'est enregistré avant « Enregistrer ».", verifSans: "Complétez ce que vous savez ; le reste viendra plus tard.",
    champs: { nom: "Nom", metier: "Métier", ville: "Ville", email: "E-mail", tel: "Téléphone", site: "Site", instagram: "Instagram", prix: "Prix du devis (€)" },
    doublon: "Il existe peut-être déjà : ", ouvrir: "ouvrir sa fiche", quandMeme: "Enregistrer quand même", enregistrer: "Enregistrer", retour: "Retour",
    ok: n => `${n} ajouté : sa note arrive dans 1 à 2 minutes`, err: "La lecture n'a pas abouti : ", nomRequis: "Le nom est obligatoire",
  };
  const estUrl = s => /^(https?:\/\/|www\.)\S+$|^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(String(s).trim());
  const sugsPresta = () => ctx.pendingSugs().filter(s => s.type === "vendor" || s.type === "quote");
  function ouvrirAjout(m) { S.ui.prAdd = { m: m || (S.f.pView === "metier" ? S.f.pMetier : ""), etape: "choix" }; renderAjout(); }
  function renderAjout() {
    const a = S.ui.prAdd; if (!a) return;
    const metierSel = (id, val) => `<select id="${id}" name="${id}">${METIERS.map(m => `<option value="${esc(m)}" ${m === val ? "selected" : ""}>${esc(nomMetier(m))}</option>`).join("")}</select>`;
    let corps;
    if (a.etape === "verif") {
      const d = a.draft || {}, dup = d.nom ? doublons({ id: "_", name: d.nom, cat: d.metier || a.m || "Lieu", contact: [d.email, d.site, d.instagram].filter(Boolean).join(" ") }, S.vendors) : [];
      const champ = (k, type = "text") => `<div class="field"><label for="search-pa-${k}">${UA.champs[k]}</label><input id="search-pa-${k}" name="search_${k}" type="${type}" autocomplete="off" value="${esc(d[k] ?? "")}" ${type === "number" ? 'inputmode="numeric" min="0"' : ""}></div>`;
      corps = `<h3>${UA.verifier}</h3><p class="ev-note">${a.draft && a.draft._ia ? UA.verifP : UA.verifSans}</p>${d.resume ? `<p class="pr-small">${esc(d.resume)}</p>` : ""}
        <form class="form" id="pr-add-form">${champ("nom")}<div class="field"><label for="search-pa-metier">${UA.champs.metier}</label>${metierSel("search-pa-metier", d.metier || a.m || "Lieu")}</div>
          <div class="cols2">${champ("ville")}${champ("tel")}</div><div class="cols2">${champ("email")}${champ("site")}</div>${champ("instagram")}${champ("prix", "number")}
          ${dup.length ? `<p class="banner warn">${UA.doublon}${dup.map(v => `<b>${esc(v.name)}</b> (<button type="button" class="link" data-fiche="${v.id}">${UA.ouvrir}</button>)`).join(", ")}</p>` : ""}
          <div class="acts"><button type="button" class="btn" data-act="pradd-retour">${UA.retour}</button><button type="submit" class="btn primary">${dup.length ? UA.quandMeme : UA.enregistrer}</button></div></form>`;
    } else {
      const sg = sugsPresta();
      corps = `<h3>${UA.titre}</h3>
        <section class="pa-card first"><b>${UA.deja}</b><form id="pr-add-q" class="pa-q"><label class="sr" for="search-pa-q">${UA.champ}</label><input id="search-pa-q" name="search_q" autocomplete="off" placeholder="${UA.champ}" ${a.busy ? "disabled" : ""}><button class="btn primary" ${a.busy ? "disabled" : ""}>${UA.continuer}</button></form>
          <div class="pa-files"><label class="btn ${a.busy ? "disabled" : ""}"><input type="file" accept="image/*" data-pafile="1" hidden ${a.busy ? "disabled" : ""}>${UA.carte}</label><label class="btn ${a.busy ? "disabled" : ""}"><input type="file" accept="application/pdf" data-pafile="1" hidden ${a.busy ? "disabled" : ""}>${UA.pdf}</label></div>
          ${a.busy ? `<p class="ai-pending" role="status">${UA.lecture}</p>` : a.err ? `<p class="banner warn">${esc(UA.err + a.err)}</p>` : `<p class="pr-small">${UA.iaRemplit}</p>`}</section>
        <section class="pa-card"><b>${UA.coach}</b><p class="pr-small">${UA.coachP}</p><div class="pa-row"><label class="sr" for="search-pa-cm">${UA.champs.metier}</label>${metierSel("search-pa-cm", a.m || "Lieu")}<button class="btn" data-act="pradd-coach">${UI.lancer}</button></div></section>
        ${sg.length ? `<section class="pa-card"><b>${UA.mails(sg.length)}</b>${sg.map(s => { const n = (s.payload || {}).name || (s.payload || {}).vendorName || s.from || "";
          return `<div class="pa-mail"><span class="pr-rb"><b>${esc(n)}</b><span>${esc([(s.payload || {}).cat, s.type === "quote" && (s.payload || {}).prix ? ctx.eur(s.payload.prix) : ""].filter(Boolean).join(" · "))}</span></span><button class="pr-round plus sm" data-act="pradd-mail" data-id="${s.id}" aria-label="${esc(UA.ajouterMail(n))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>`; }).join("")}</section>` : ""}`;
    }
    ctx.layer(`<div class="ov" data-close="1"><div class="modal pa" role="dialog" aria-modal="true" aria-label="${UA.titre}">${corps}</div></div>`);
    const f = document.getElementById("pr-add-form");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); enregistrerAjout(f); });
    const q = document.getElementById("pr-add-q");
    if (q) q.addEventListener("submit", e => { e.preventDefault(); const v = (q.elements.search_q.value || "").trim(); if (!v) return; estUrl(v) ? remplir({ url: v }) : (a.draft = { nom: v, metier: a.m || "" }, a.etape = "verif", renderAjout()); });
    document.querySelectorAll("[data-pafile]").forEach(i => i.addEventListener("change", async () => { const file = i.files && i.files[0]; if (!file) return;
      try { remplir({ fichier: await ctx.fileForAI(file) }); } catch (e) { a.err = e.message; renderAjout(); } }));
  }
  async function remplir(src) {
    const a = S.ui.prAdd; a.busy = true; a.err = null; renderAjout();
    try {
      const r = await ctx.runAgentNow("fiche", { ...src, metier: a.m || undefined });
      if (!r || !r.ok) throw new Error((r && r.erreur) || "réponse vide");
      const f = r.fiche || {};
      a.draft = { _ia: true, _src: src.url ? "lien" : src.fichier && src.fichier.media_type === "application/pdf" ? "pdf" : "photo", _url: src.url,
        nom: f.nom || "", metier: f.metier || a.m || "", ville: f.ville || "", email: f.email || "", tel: f.tel || "", site: f.site || (src.url && !/instagram\.com/i.test(src.url) ? src.url : ""),
        instagram: f.instagram || (src.url && /instagram\.com/i.test(src.url) ? src.url : ""), prix: f.prix ?? "", acompte: f.acompte, inclus: f.inclus, resume: f.resume || "" };
      a.etape = "verif";
    } catch (e) { a.err = e.message || String(e); }
    a.busy = false; if (S.ui.prAdd === a) renderAjout();
  }
  async function enregistrerAjout(f) {
    const a = S.ui.prAdd, d = a.draft || {}, val = k => (f.elements["search_" + k] ? f.elements["search_" + k].value.trim() : "");
    const nom = val("nom"); if (!nom) { ctx.toast(UA.nomRequis); return; }
    const prix = +val("prix") > 0 ? Math.round(+val("prix")) : null, cat = f.elements["search-pa-metier"].value;
    // doublon (même nom dans le métier, même site ou e-mail) : signalé une fois avant d'enregistrer, jamais fusionné
    const vu = { nom, metier: cat, ville: val("ville"), email: val("email"), tel: val("tel"), site: val("site"), instagram: val("instagram"), prix: val("prix") };
    if (!a.confirme && doublons({ id: "_", name: nom, cat, contact: [vu.email, vu.site, vu.instagram].join(" ") }, S.vendors).length) { a.draft = { ...d, ...vu }; a.confirme = true; renderAjout(); return; }
    const data = { name: nom, cat, status: "repere", ville: val("ville"), email: val("email"), tel: val("tel"), site: val("site"), instagram: val("instagram"), source: d._ia ? "ia" : "couple", note: d.resume || "" };
    if (prix) data.prix = prix;
    if (d._src === "pdf" && prix) { data.status = "discussion"; data.devis = [{ id: `a${Date.now().toString(36)}`, montant: prix, ...(d.acompte ? { acompte: d.acompte } : {}), inclus: d.inclus || [], resume: d.resume || "", recuLe: new Date().toISOString().slice(0, 10), source: "coach" }]; }
    for (const k of Object.keys(data)) if (data[k] === "") delete data[k];
    const id = await ctx.addVendor(data); if (!id) return;
    S.ui.prAdd = null; ctx.closeModal(); ctx.kick("analyse"); ctx.toast(UA.ok(nom));
    show("fiche", { pFiche: id });
  }

  /* ---------- 4.4 Comparer (plein écran) ---------- */
  // S.ui.prCmp = { m, ids, busy, err, data }
  const UC = { label: "COMPARER", titre: m => `Vos ${pl(m)}`, fermer: "Fermer", choisir: "Choisissez jusqu'à 3 prestataires", fit: "Fit avec vos envies", prix: "Prix", avis: "Avis en ligne",
    libre: d => (d ? `Libre le ${d}` : "Libre à votre date"), prepare: "Le coach prépare les lignes de vos envies…", phrase: m => `Les lignes reprennent vos envies ${m}. En corail : le meilleur sur la ligne.`,
    avisCoach: "L'avis du coach", verifier: "À vérifier avant de trancher : ", reserver: n => `Réserver ${n}`, question: "Poser une question au coach", detail: "Comparaison détaillée (capacité, critères, notes de visite)",
    inconnu: "?", aDemander: "À demander", oui: "Oui", non: "Non", deux: "Choisissez au moins 2 prestataires.", erreur: "La comparaison n'a pas pu être préparée : ", reessayer: "Réessayer" };
  const enviesAtDe = m => { const k = tuile(m); return (S.envies || []).filter(d => k && (d.id.startsWith(k + ".") || d.id === "_tuile." + k)).reduce((x, d) => Math.max(x, +d.updatedAt || 0), 0); };
  function ouvrirComparer(m, id) {
    const cs = candidats(m, S.vendors); if (cs.length < 2) { ctx.toast(UC.deux); return; }
    const prev = S.ui.prCmp && S.ui.prCmp.m === m ? S.ui.prCmp.ids.filter(x => cs.some(v => v.id === x)) : [];
    let ids = prev.length >= 2 ? prev : cs.slice(0, 3).map(v => v.id);
    if (id && !ids.includes(id) && cs.some(v => v.id === id)) ids = [id, ...ids].slice(0, 3);
    S.ui.prCmp = { m, ids }; document.body.classList.add("qs-open"); chargerComparaison();
  }
  function comparaisonGardee() {
    const c = S.ui.prCmp, doc = (S.comparaisons || []).find(x => x.id === cleComparaison(c.m));
    return doc && doc.empreinte === empreinte(c.ids, S.vendors, enviesAtDe(c.m)) ? doc : null;
  }
  async function chargerComparaison() {
    const c = S.ui.prCmp; if (!c) return;
    c.data = comparaisonGardee(); c.err = null;
    if (!c.data && c.ids.length >= 2) {
      c.busy = true; renderComparer();
      try { const r = await ctx.runAgentNow("comparer", { metier: c.m, ids: c.ids, ...(S.vendors.some(v => c.ids.includes(v.id) && v._prive) ? { prive: ctx.moi() } : {}) }); if (!r || !r.ok) throw new Error((r && r.erreur) || "réponse vide"); if (S.ui.prCmp === c) c.data = r.comparaison; }
      catch (e) { c.err = e.message || String(e); }
      c.busy = false;
    }
    renderComparer();
  }
  function renderComparer() {
    const c = S.ui.prCmp; if (!c) return;
    const cs = candidats(c.m, S.vendors), vs = c.ids.map(id => cs.find(v => v.id === id)).filter(Boolean), d = c.data, dm = dateM();
    const best = (vals, dir) => { const ns = vals.filter(x => x != null); if (ns.length < 2) return -1; const b = dir > 0 ? Math.max(...ns) : Math.min(...ns); return vals.indexOf(b); };
    const ligne = (label, cells, bi) => `<div class="cv-l"><span class="pr-lab">${esc(label)}</span><div class="cv-cells" style="grid-template-columns:repeat(${vs.length},minmax(0,1fr))">${cells.map((x, i) => `<span class="${i === bi ? "best" : ""}">${x}</span>`).join("")}</div></div>`;
    const fits = vs.map(score), prix = vs.map(dernierPrix), avis = vs.map(v => v.fit && v.fit.avis && v.fit.avis.note != null ? +v.fit.avis.note : null);
    let rows = ligne(UC.fit, fits.map(x => (x == null ? UC.inconnu : `<b class="num">${x}</b>/100`)), best(fits, 1))
      + ligne(UC.prix, prix.map(x => (x == null ? UC.aDemander : `<b class="num">${ctx.eur(x)}</b>`)), best(prix, -1));
    if (d) {
      rows += d.lignes.map(l => ligne(l.envie, vs.map(v => (l.valeurs[v.id] == null ? UC.inconnu : esc(l.valeurs[v.id]))), vs.findIndex(v => v.id === l.meilleur))).join("");
    }
    rows += ligne(UC.avis, avis.map((x, i) => (x == null ? UC.inconnu : `<b class="num">${String(x).replace(".", ",")}</b>${vs[i].fit.avis.nombre ? ` · ${esc(vs[i].fit.avis.nombre)} avis` : ""}`)), best(avis, 1));
    if (d) { const dispo = vs.map(v => (d.disponibilite || {})[v.id] || "inconnu"); rows += ligne(UC.libre(dm ? dFmt(dm) : ""), dispo.map(s => (s === "libre" ? UC.oui : s === "pris" ? UC.non : UC.aDemander)), dispo.filter(s => s === "libre").length === 1 ? dispo.indexOf("libre") : -1); }
    const premier = vs.slice().sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1))[0];
    const ask = `ask:On compare ${vs.map(v => v.name).join(", ")} pour le métier ${c.m}. ${d && d.avis ? `Ton avis était : ${d.avis.phrase} ` : ""}Qu'en penses-tu, et que faut-il leur demander avant de trancher ?`;
    document.getElementById("layer").innerHTML = `<div class="cv" role="dialog" aria-modal="true" aria-label="${esc(UC.titre(c.m))}">
      <div class="cv-top"><button class="pr-round" data-act="prcmp-close" aria-label="${UC.fermer}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span class="pr-k">${UC.label}</span></div>
      <h2 class="cv-h">${esc(UC.titre(c.m))}</h2>
      ${cs.length > 2 ? `<div class="cv-pick" role="group" aria-label="${UC.choisir}"><span class="pr-small">${UC.choisir}</span><div class="chip-row">${cs.map(v => `<button class="chip ${c.ids.includes(v.id) ? "on" : ""}" data-act="prcmp-toggle" data-id="${v.id}" aria-pressed="${c.ids.includes(v.id)}">${esc(v.name)}</button>`).join("")}</div></div>` : ""}
      ${vs.length < 2 ? `<p class="ev-note">${UC.deux}</p>` : `<div class="cv-heads" style="grid-template-columns:repeat(${vs.length},minmax(0,1fr))">${vs.map(v => `<button class="cv-hd" data-act="prcmp-fiche" data-id="${v.id}">${ini(v)}<b>${esc(v.name)}</b></button>`).join("")}</div>
      <div class="cv-t">${rows}</div>
      ${c.busy ? `<p class="ai-pending" role="status">${UC.prepare}</p>` : c.err ? `<p class="banner warn">${esc(UC.erreur + c.err)} <button class="link" data-act="prcmp-retry">${UC.reessayer}</button></p>` : `<p class="ev-note">${esc(UC.phrase(tuile(c.m) ? nomTuile(tuile(c.m)).toLowerCase() : pl(c.m)))}</p>`}
      ${d && d.avis && d.avis.phrase ? `<section class="pr-coach"><span class="pr-ck2"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/></svg></span><b>${UC.avisCoach.toUpperCase()}</b></span>
        <p class="cv-phrase">${esc(d.avis.phrase)}</p>${d.avis.verifier ? `<p>${UC.verifier}${esc(d.avis.verifier)}</p>` : ""}<span class="pr-small">${UI.ia}</span></section>` : ""}
      <div class="cv-acts">${S.canWrite && premier ? `<button class="btn primary" data-act="prreserve" data-id="${premier.id}">${esc(UC.reserver(premier.name))}</button>` : ""}${S.canWrite ? `<button class="btn" data-act="qr" data-do="${esc(ask)}">${UC.question}</button>` : ""}
        <button class="link" data-act="prcmp-detail">${UC.detail}</button></div>`}</div>`;
  }
  function fermerComparer() { S.ui.prCmp = null; ctx.closeModal(); document.body.classList.remove("qs-open"); }


  /* ---------- Lot 3 : réservation (6.6), écran « C'est réservé » (4.6), messages aux autres, suivi et paiements ---------- */
  const UR = {
    titre: n => `Réserver ${n} ?`, montant: "Montant (€)", acompte: "Acompte (€)", dateAcompte: "Acompte à verser avant le", confirmer: "Confirmer la réservation", annuler: "Annuler",
    effets: "Le budget et le planning se mettent à jour tout seuls ; vous pourrez tout annuler d'un geste.", reserve: m => `${m.toUpperCase()} · C'EST RÉSERVÉ`, phraseDef: n => `${n}, c'est réservé.`,
    fait: "Déjà fait pour vous", engages: x => `${x} engagés`, partBudget: p => `${p} % du budget engagé`, budgetPoste: l => `Poste « ${l} »`,
    taches: n => `${n} tâche${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} au planning`, prevenirT: n => `Prévenir les ${n > 1 ? n + " autres" : "autre"} ?`,
    prevenirP: noms => `Un mot courtois est prêt pour ${noms}. Ils seront rangés dans « Écartés », pas supprimés.`, redige: "Le coach rédige un mot pour chacun…",
    relire: "Relire et envoyer", plusTard: "Plus tard", ouvrirMail: "Ouvrir dans Mail", copier: "Copier", previens: "Prévenu, rangé dans Écartés", copie: "Message copié",
    raison: "Autre prestataire choisi", prochaine: "Prochaine décision", voirFiche: n => `Voir la fiche de ${n}`, annulerRes: "Annuler la réservation", annule: "Réservation annulée",
    fermer: "Fermer", paiements: "Paiements", prevu: "Prévu au budget", montantL: "Montant", acompteL: "Acompte", soldeL: "Solde", reste: "Reste à payer", paye: "Payé",
    marquer: "Marquer payé", aVerser: d => (d ? `avant le ${d}` : "date à fixer"), voirBudget: "Voir le budget", prevenirFiche: n => `Prévenir les ${n} autres candidats`,
    jourj: noms => `L'ajouter au jour J : ${noms}`, jourjS: "Un geste, annulable", jourjOk: n => `Ajouté à ${n} moment${n > 1 ? "s" : ""} du jour J`,
    contratT: "Signer le contrat", contratB: "C'est signé", pointT: d => `Faire le point ${d ? `le ${d}` : "un mois avant"}`, pointB: "Préparer avec le coach", contratOk: "Contrat signé",
  };
  const tachesDe = v => (S.tasks || []).filter(x => x.vendorId === v.id);
  function ouvrirReserve(v) {
    const autre = !multiple(v.cat) && S.vendors.find(x => x.id !== v.id && x.cat === v.cat && etapeOf(x) === "reserve");
    if (autre) { ctx.toast(UI.dejaReserve(v.cat, autre.name)); return; }
    const d = (v.devis || [])[0] || {}, montant = dernierPrix(v), ac = +v.acompte || +d.acompte || "", da = v.dateAcompte || d.dateAcompte || "";
    ctx.layer(`<div class="ov" data-close="1"><form class="modal form" id="pr-res" role="dialog" aria-modal="true" aria-label="${esc(UR.titre(v.name))}"><h3>${esc(UR.titre(v.name))}</h3>
      <p class="ev-note">${UR.effets}</p>
      <div class="field"><label for="search-rs-m">${UR.montant}</label><input id="search-rs-m" name="search_m" type="number" inputmode="numeric" min="0" value="${esc(montant ?? "")}"></div>
      <div class="cols2"><div class="field"><label for="search-rs-a">${UR.acompte}</label><input id="search-rs-a" name="search_a" type="number" inputmode="numeric" min="0" value="${esc(ac)}"></div>
        <div class="field"><label for="search-rs-d">${UR.dateAcompte}</label><input id="search-rs-d" name="search_d" type="date" value="${esc(da)}"></div></div>
      <div class="acts"><button type="button" class="btn" data-close="1">${UR.annuler}</button><button type="submit" class="btn primary">${UR.confirmer}</button></div></form></div>`);
    document.getElementById("pr-res").addEventListener("submit", e => { e.preventDefault(); const f = e.target, n = x => (+x > 0 ? Math.round(+x) : null);
      reserver(v, { montant: n(f.elements.search_m.value), acompte: n(f.elements.search_a.value), dateAcompte: f.elements.search_d.value || null }); });
  }
  async function reserver(v, { montant, acompte, dateAcompte }) {
    ctx.closeModal();
    const champs = ["status", "reserveLe", "prix", "acompte", "dateAcompte", "reservation"];
    const avant = Object.fromEntries(champs.map(k => [k, v[k] ?? null]));
    const ok = await ctx.patch("vendors", v.id, { status: "reserve", reserveLe: Date.now(), ...(montant ? { prix: montant } : {}), ...(acompte ? { acompte } : {}), ...(dateAcompte ? { dateAcompte } : {}), reservation: { at: Date.now(), vu: false } });
    if (!ok) return;
    const eff = { id: v.id, avant, taches: [], line: null, montant };
    // budget : le poste du métier passe le montant en « engagé » (créé s'il n'existe pas)
    if (montant) {
      const lib = `Tenue de ${ctx.prenom()}`, line = v._prive ? (S.budget || []).find(b => b.label === lib) : ctx.budgetLineFor(v.cat);
      if (line) { eff.line = { id: line.id, avant: { engage: line.engage ?? null } }; await ctx.patch("budget", line.id, { engage: montant }); }
      else { const id = await ctx.addDoc("budget", { label: v._prive ? `Tenue de ${ctx.prenom()}` : nomMetier(v.cat), prevu: null, engage: montant, paye: null, note: "", order: 99 }); if (id) eff.line = { id, cree: true }; }
    }
    // planning : contrat, acompte, point un mois avant
    for (const t of tachesReservation({ ...v, name: v._prive ? `tenue de ${ctx.prenom()}` : v.name }, { date: dateM(), today: today(), acompte, dateAcompte, eur: ctx.eur })) {
      const id = await ctx.addDoc("tasks", { title: t.title, due: t.due, phase: ctx.phaseFor(t.due), owner: "deux", status: "todo", note: "", order: 999, vendorId: v.id, kind: t.kind });
      if (id) eff.taches.push({ id, title: t.title });
    }
    S.ui.prRes = eff;
    ctx.toastUndo(UI.reserveOk(v.name), () => annulerReservation(eff));
    renderReserve();
    // phrase de l'écran et messages aux autres candidats (un appel IA) ; l'écran se met à jour à la réponse
    ctx.runAgentNow("reserve", { id: v.id, ...(v._prive ? { prive: ctx.moi() } : {}) }).then(r => { if (r && r.ok && S.ui.prRes === eff) { eff.reservation = r.reservation; renderReserve(); } }).catch(() => {});
  }
  async function annulerReservation(eff) {
    await ctx.patch("vendors", eff.id, eff.avant);
    if (eff.line) eff.line.cree ? await ctx.remove("budget", eff.line.id) : await ctx.patch("budget", eff.line.id, eff.line.avant);
    for (const t of eff.taches) await ctx.remove("tasks", t.id);
    if (S.ui.prRes === eff) fermerReserve(false);
  }
  function blocMessages(v, msgs) {
    return msgs.map(m => { const x = S.vendors.find(y => y.id === m.id); if (!x) return "";
      const done = etapeOf(x) === "ecarte", mail = contacts(x).email || "";
      const href = `mailto:${encodeURIComponent(mail)}?subject=${encodeURIComponent(m.objet)}&body=${encodeURIComponent(m.corps)}`;
      return `<div class="rs-msg"><b>${esc(x.name)}</b><span class="pr-small">${esc(m.objet)}</span><p>${esc(m.corps)}</p>
        ${done ? `<span class="ok-t">✓ ${UR.previens}</span>` : `<div class="rs-msg-a"><a class="btn primary" href="${esc(href)}" data-act="prprevenu" data-id="${x.id}">${UR.ouvrirMail}</a><button class="btn" data-act="prcopier" data-id="${x.id}" data-v="${v.id}">${UR.copier}</button></div>`}</div>`; }).join("");
  }
  function renderReserve() {
    const eff = S.ui.prRes; if (!eff) return;
    const v = S.vendors.find(x => x.id === eff.id); if (!v) return;
    const res = eff.reservation || v.reservation || {}, c = compteur(VS(), A());
    const autres = candidats(v.cat, S.vendors).filter(x => x.id !== v.id);
    const totalEng = (S.budget || []).reduce((s, b) => s + (+b.engage || 0), 0), bt = +S.settings.budgetTotal || 0;
    const pct = bt ? Math.round(totalEng / bt * 100) : null, C = 2 * Math.PI * 22, x = pct == null ? 0 : Math.min(100, pct) / 100 * C;
    const dots = c.frise.map(f => `<i class="pr-dot ${f.etat}"></i>`).join("");
    const d = aDecider(VS(), A(), ctxRegles());
    document.body.classList.add("qs-open");
    document.getElementById("layer").innerHTML = `<div class="cv rs" role="dialog" aria-modal="true" aria-label="${esc(UR.reserve(v.cat))}">
      <section class="rs-head"><div class="pr-top"><span class="rs-ck" aria-hidden="true">✓</span><button class="pr-round" data-act="prres-close" aria-label="${UR.fermer}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <span class="pr-k">${esc(UR.reserve(nomMetier(v.cat)))}</span><p class="rs-phrase">${esc(res.phrase || UR.phraseDef(v.name))}</p>
        <div class="pr-count"><b class="num">${c.n}</b><span>${UI.reserves(c.n, c.total)}</span></div>
        <span class="pr-frise" style="grid-template-columns:repeat(${Math.max(1, c.total)},minmax(0,1fr))">${dots}</span></section>
      <section class="pr-sec"><h3 class="home-h">${UR.fait}</h3><div class="pr-box">
        ${eff.montant ? `<button class="pr-res" data-act="prres-go" data-v="budget"><span class="rs-ring" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" class="tr"/><circle cx="26" cy="26" r="22" class="fg" stroke-dasharray="${x.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 26 26)"/></svg></span>
          <span class="pr-rn"><b>${esc(UR.engages(ctx.eur(eff.montant)))}</b><br><span>${esc(pct != null ? UR.partBudget(pct) : UR.budgetPoste(nomMetier(v.cat)))}</span></span>${ctx.CHEV}</button>` : ""}
        ${eff.taches.length ? `<button class="pr-res" data-act="prres-go" data-v="planning"><span class="pr-ck" aria-hidden="true">✓</span><span class="pr-rn"><b>${UR.taches(eff.taches.length)}</b><br><span>${esc(eff.taches.map(t => t.title.split(" · ")[0]).join(" · "))}</span></span>${ctx.CHEV}</button>` : ""}
        ${lienJourJ(v, eff)}</div></section>
      ${autres.length && !eff.plusTard ? `<section class="pr-pe"><span class="pr-lab">${esc(UR.prevenirT(autres.length).toUpperCase())}</span>
        ${(res.messages || []).length ? (eff.relire ? blocMessages(v, res.messages) : `<p>${esc(UR.prevenirP(autres.map(a => a.name).join(", ")))}</p><div class="pr-pe-a"><button class="btn dark" data-act="prres-relire">${UR.relire}</button><button class="btn" data-act="prres-tard">${UR.plusTard}</button></div>`)
          : `<p class="ai-pending" role="status">${UR.redige}</p>`}</section>` : ""}
      ${d ? carteDecider(d, UR.prochaine) : ""}
      <div class="cv-acts"><button class="btn primary" data-act="prres-fiche">${esc(UR.voirFiche(v.name))}</button><button class="link" data-act="prres-annuler">${UR.annulerRes}</button></div></div>`;
  }
  // Jour J (docs/jour-j-v1.md, 5.4) : proposer d'ajouter le prestataire aux moments de son métier
  function lienJourJ(v, eff) {
    if (eff.jourj) return `<div class="pr-res"><span class="pr-ck" aria-hidden="true">✓</span><span class="pr-rn"><b>${esc(UR.jourjOk(eff.jourj))}</b></span></div>`;
    const ms = ctx.jourj ? ctx.jourj().suggestion(v) : []; if (!ms.length || !S.canWrite) return "";
    return `<button class="pr-res" data-act="prres-jourj" data-id="${v.id}"><span class="pr-ck" aria-hidden="true">+</span><span class="pr-rn"><b>${esc(UR.jourj(ms.map(m => m.nom).join(", ")))}</b><br><span>${UR.jourjS}</span></span>${ctx.CHEV}</button>`;
  }
  function fermerReserve(vu = true) {
    const eff = S.ui.prRes; S.ui.prRes = null; ctx.closeModal(); document.body.classList.remove("qs-open");
    if (vu && eff) ctx.patch("vendors", eff.id, { "reservation.vu": true });
  }
  async function prevenu(id) {
    const x = S.vendors.find(y => y.id === id); if (!x || etapeOf(x) === "ecarte") return;
    await setEtape(x, "ecarte", { raisonEcart: UR.raison, ecarteLe: Date.now() }, UI.ecarteOk(x.name));
    setTimeout(() => (S.ui.prRes ? renderReserve() : null), 300);
  }
  // Fiche en mode suivi : paiements liés au budget, autres candidats à prévenir
  function paiements(v) {
    if (etapeOf(v) !== "reserve") return "";
    const px = +v.prix || 0, ac = +v.acompte || 0, solde = Math.max(0, px - ac), line = ctx.budgetLineFor(v.cat);
    const reste = (v.acomptePaye ? 0 : ac) + (v.soldePaye ? 0 : solde);
    const row = (l, val, extra = "") => `<div class="hb-row"><span class="lab">${l}</span><span class="amt num">${val}</span>${extra}</div>`;
    const etat = (paye, k, d) => (paye ? `<div class="why ok-t">${UR.paye}</div>` : `<div class="why">${esc(UR.aVerser(d ? dFmt(ctx.pd(d)) : ""))}${S.canWrite ? ` · <button class="link" data-act="prpaye" data-id="${v.id}" data-k="${k}">${UR.marquer}</button>` : ""}</div>`);
    return `<section class="pr-sec"><h3 class="home-h">${UR.paiements}</h3><div class="pr-card pr-pay">
      ${line && +line.prevu ? row(UR.prevu, ctx.eur(line.prevu)) : ""}${px ? row(UR.montantL, ctx.eur(px)) : ""}
      ${ac ? row(UR.acompteL, ctx.eur(ac), etat(v.acomptePaye, "acompte", v.dateAcompte)) : ""}
      ${px ? row(UR.soldeL, ctx.eur(solde), etat(v.soldePaye, "solde", v.dateSolde)) : ""}
      ${px ? row(`<b>${UR.reste}</b>`, `<b>${ctx.eur(reste)}</b>`) : ""}
      <button class="link" data-go="budget">${UR.voirBudget}</button></div></section>`;
  }
  function prevenirFiche(v) {
    if (etapeOf(v) !== "reserve") return "";
    const msgs = ((v.reservation || {}).messages || []).filter(m => { const x = S.vendors.find(y => y.id === m.id); return x && enLice(x); });
    return msgs.length ? `<details class="pr-sec pr-card"><summary class="pr-lab">${esc(UR.prevenirFiche(msgs.length).toUpperCase())}</summary>${blocMessages(v, msgs)}</details>` : "";
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
      case "prnew": ouvrirAjout(t.dataset.m); return true;
      case "pradd-retour": S.ui.prAdd.etape = "choix"; renderAjout(); return true;
      case "pradd-coach": { const m = (document.getElementById("search-pa-cm") || {}).value || "Lieu"; S.ui.prAdd = null; ctx.closeModal(); ctx.runQr(askChercher(m)); return true; }
      case "pradd-mail": (async () => { if (await ctx.acceptSug(id)) { ctx.toast("Ajouté"); renderAjout(); } })(); return true;
      case "compare": { const m = t.dataset.cat; if (!m || candidats(m, S.vendors).length < 2) return false; ctx.closeModal(); ouvrirComparer(m, t.dataset.id); return true; }
      case "prcmp-close": fermerComparer(); return true;
      case "prcmp-toggle": { const c = S.ui.prCmp, x = t.dataset.id; c.ids = c.ids.includes(x) ? c.ids.filter(y => y !== x) : [...c.ids, x].slice(-3); chargerComparaison(); return true; }
      case "prcmp-retry": chargerComparaison(); return true;
      case "prcmp-fiche": { const x = t.dataset.id; fermerComparer(); show("fiche", { pFiche: x }); return true; }
      case "prcmp-detail": { const m = S.ui.prCmp.m, ids = S.ui.prCmp.ids; fermerComparer(); S.cmp.ids = ids.slice(); S.cmp.seeded = m; ctx.openCompare(m); return true; }
      case "prquestions": { const d = document.querySelector(".pr-plus"); if (d) d.open = true; document.getElementById("pr-questions")?.scrollIntoView({ behavior: "smooth", block: "start" }); return true; }
      case "prcaltous": S.f.pCalTous = true; ctx.render(); return true;
      case "prlice": if (v) setEtape(v, aDevis(v) || v.briefEnvoyeLe ? "discussion" : "repere", { raisonEcart: null, ecarteLe: null }, UI.remisOk(v.name)); return true;
      case "precart": if (v) sheetEcart(v); return true;
      case "prreserve": { if (!v) return true; if (S.ui.prCmp) fermerComparer(); ouvrirReserve(v); return true; }
      case "prres-close": fermerReserve(); return true;
      case "prres-fiche": { const x = S.ui.prRes && S.ui.prRes.id; fermerReserve(); if (x) show("fiche", { pFiche: x }); return true; }
      case "prres-go": { fermerReserve(); ctx.go(t.dataset.v); return true; }
      case "prres-jourj": { const v = S.vendors.find(x => x.id === t.dataset.id), eff = S.ui.prRes; if (v && eff) ctx.jourj().ajouterAuJourJ(v).then(n => { eff.jourj = n; renderReserve(); }); return true; }
      case "prres-relire": S.ui.prRes.relire = true; renderReserve(); return true;
      case "prres-tard": S.ui.prRes.plusTard = true; renderReserve(); return true;
      case "prres-annuler": { const eff = S.ui.prRes; if (eff) annulerReservation(eff).then(() => ctx.toast(UR.annule)); return true; }
      case "prprevenu": prevenu(id); return false; // laisse le lien mailto: s'ouvrir
      case "prcopier": { const x = S.vendors.find(y => y.id === id), r = S.vendors.find(y => y.id === t.dataset.v), m = ((r && r.reservation) || (S.ui.prRes && S.ui.prRes.reservation) || {}).messages?.find(mm => mm.id === id) || ((S.ui.prRes || {}).reservation || {}).messages?.find(mm => mm.id === id);
        if (m && navigator.clipboard) navigator.clipboard.writeText(`${m.objet}\n\n${m.corps}`).then(() => ctx.toast(UR.copie)).catch(() => {});
        if (x) prevenu(id); return true; }
      case "prpaye": { if (!v) return true; const k = t.dataset.k, champ = k === "solde" ? "soldePaye" : "acomptePaye", tache = (S.tasks || []).find(x => x.vendorId === v.id && x.kind === k && x.status !== "done");
        ctx.patch("vendors", v.id, { [champ]: true }).then(ok => { if (!ok) return; if (tache) ctx.patch("tasks", tache.id, { status: "done" });
          ctx.toastUndo(`${k === "solde" ? "Solde" : "Acompte"} payé`, async () => { await ctx.patch("vendors", v.id, { [champ]: false }); if (tache) await ctx.patch("tasks", tache.id, { status: tache.status || "todo" }); }); });
        return true; }
      case "prcontrat": { const tache = (S.tasks || []).find(x => x.id === id); if (!tache) return true;
        ctx.patch("tasks", id, { status: "done" }).then(ok => ok && ctx.toastUndo(UR.contratOk, () => ctx.patch("tasks", id, { status: tache.status || "todo" }))); return true; }
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
