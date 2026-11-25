// Page « Budget » v1 (docs/budget-planning-v1.md, lot 1) : la page (3.2) et un poste ouvert (3.5).
// Règles dans agents/lib/budget.js (testées). Aucun appel IA à l'affichage : tout est lu dans la base.
// L'arbitrage (3.3), les échéances automatiques et le budget vide (3.6) viennent aux lots 3 et 4.
import { TILE_ICON } from "./envies-ui.js";
import { tuileDe, METIERS, AUTRE } from "../agents/lib/prestataires.js";
import { bilan, barre, etatPoste, devisFace, ecartEnvies, metierDe, empreinteBudget } from "../agents/lib/budget.js";

// Textes d'interface (à traduire)
const UI = {
  titre: "Notre budget", retour: "Accueil", ajouter: "Ajouter un poste", prevuK: "PRÉVU POUR LE MARIAGE", pour: l => `pour ${l}`, fixerLimite: "Fixer une limite",
  modifierLimite: "Modifier la limite", leg: { paye: "payé", signe: "signé", prevu: "prévu" }, marge: m => `${m} de marge`, limite: "votre limite", plus: m => `+${m}`,
  cpt: { signe: "signé", pctPrevu: p => `${p} % du prévu`, paye: "déjà payé", parInvite: n => `par invité (${n})` },
  arbitrer: "À arbitrer", aTrouver: m => `${m} à trouver ou à assumer`, arbitrerP: "Réduire une enveloppe, revoir un devis ou monter la limite : le coach propose des pistes à partir de vos envies et de vos devis.",
  voirPistes: "Voir les pistes", pistesAsk: m => `Notre budget prévu dépasse notre limite de ${m}. Propose-nous 2 à 4 pistes concrètes pour le réduire (gain estimé, pourquoi, ce que nous perdons), à partir de nos envies, de nos devis et de nos postes, et rappelle l'option d'assumer en montant la limite.`,
  aPayer: "À payer", aVenir: m => `${m} à venir`, rienAPayer: "Rien à payer pour l'instant", marquer: p => `Marquer ${p} comme payé`, acompte: "l'acompte", solde: "le solde",
  dateAPreciser: "date à préciser", ou: n => `Où va l'argent · ${n} poste${n > 1 ? "s" : ""}`, autres: (n, m) => `Voir les ${n} autres postes · ${m}`, moins: "Voir moins",
  etat: {
    reserve: (n, p) => `${n} réservé${p ? ` · ${p} payés` : ""}`, signeDessus: e => `Signé · +${e} sur l'enveloppe`, signe: p => (p ? `Signé · ${p} payés` : "Signé"),
    devis: (b, e) => `Meilleur devis ${b}${e ? ` · ${e > 0 ? "+" : "−"}${Math.abs(e).toLocaleString("fr-FR")} €` : ""}`, sansDevis: (n, pl) => `${n} ${pl} en lice · aucun devis`,
    estimation: "Estimation", parInvite: m => `Estimation · ≈ ${m} par invité`,
  },
  vide: "Aucun poste pour l'instant", videP: "Ajoutez vos postes : lieu, traiteur, photographe…",
  // poste ouvert
  duMariage: p => `${p} % du mariage`, enveloppe: "Votre enveloppe", vosEnvies: m => `Vos envies : ≈ ${m}`, moins100: "Retirer 100 €", plus100: "Ajouter 100 €", enveloppeL: "Enveloppe en euros",
  ecartEnvies: (e, m) => `Votre enveloppe est ${e > 0 ? "au-dessus" : "en dessous"} de ce que vous aviez indiqué dans Nos envies (${m}).`,
  devisFace: "Vos devis face à l'enveloppe", prixInconnu: "Prix inconnu", fit: s => `fit ${s}`, comparer: pl => `Comparer les ${pl}`, aucunCand: "Pas encore de candidat pour ce poste.",
  trouver: pl => `Trouver des ${pl}`, quandPayer: "Quand payer", echeancesSignature: "Les échéances se créeront à la signature, à partir du devis.",
  autresDep: "Autres dépenses du poste", depP: "Album, tirages, achats de déco… tout ce qui ne passe pas par un prestataire.", depLabel: "Dépense", depMontant: "Montant (€)",
  depPaye: "Déjà payée", ajouterDep: "Ajouter", retirer: "Retirer", depOk: "Dépense ajoutée", depRetiree: "Dépense retirée", payee: "payée", signee: "à payer",
  modifier: "Modifier le poste", metierL: "Métier", envOk: m => `Enveloppe : ${m}`,
  aConfirmer: "à confirmer", piste: (t, g) => `Piste du coach : ${t} (−${g})`,
  // arbitrer (3.3)
  arbT: m => `${m} à trouver`, arbP: "Cochez ce qui vous va : rien ne change avant que vous appliquiez.", cherche: "Le coach cherche des pistes dans vos envies, vos devis et vos postes…",
  perdez: "Ce que vous perdez", assumer: m => `Assumer : monter la limite à ${m}`, assumerP: "Vous gardez toutes vos enveloppes ; la carte « À arbitrer » ne revient qu'au prochain dépassement.",
  autresPistes: "Demander d'autres pistes", nouveauTotal: "Nouveau total", reste: m => `encore ${m} au-dessus`, sous: m => `${m} sous la limite`, pile: "pile à la limite",
  appliquer: n => (n ? `Appliquer ${n} piste${n > 1 ? "s" : ""}` : "Choisir une piste"), appliquerA: "Assumer", applique: n => `${n} enveloppe${n > 1 ? "s" : ""} ajustée${n > 1 ? "s" : ""}`,
  assume: m => `Limite montée à ${m}`, mentionIA: "Pistes proposées par une IA à partir de vos envies et de vos devis. Les montants sont des estimations.",
  echec: e => `Le coach n'a pas pu proposer de pistes : ${e}`,
  // budget vide (3.6) et répartition
  videT: "Combien voulez-vous consacrer à votre mariage ?", videP2: "Un ordre de grandeur suffit : vous l'ajusterez à tout moment.", montantL: "Votre budget en euros",
  parPers: (n, m) => `Pour ${n} invités, soit ≈ ${m} par personne`, coachRep: "Le coach répartit selon vos envies, pas selon une moyenne : plus pour ce qui compte pour vous, rien pour ce qui n'est « pas pour nous ».",
  repartir: "Répartir mon budget", estimer: "Aucune idée : estimer avec le coach", moiMeme: "Saisir mes postes moi-même", indiquez: "Indiquez d'abord un montant, même approximatif.",
  repEnCours: "Le coach répartit votre budget…", repT: "La répartition du coach", repEst: m => `Estimation du coach : ${m}`, repP: "Décochez ou ajustez ce qui ne vous va pas, puis créez vos postes.",
  creer: n => `Créer ${n} poste${n > 1 ? "s" : ""}`, cree: n => `${n} poste${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""}`, montantPoste: l => `Montant pour ${l}`,
  mentionRep: "Proposé par une IA. Les montants sont des estimations.", refaireRep: "Demander une autre répartition", totalRep: m => `Total ${m}`,
  echecRep: e => `Le coach n'a pas pu répartir : ${e}`, apercu: ["Lieu", "Traiteur", "Photo", "Tenues", "Autres"], aucunePiste: "Le coach n'a pas trouvé de piste sûre : assumer, ou revoir un poste vous-même.", rienADepasser: "Vous êtes sous votre limite : rien à arbitrer.",
};
const PL = { Lieu: "lieux", Traiteur: "traiteurs", Photographe: "photographes", "Vidéaste": "vidéastes", Musique: "musiciens", Fleuriste: "fleuristes", Tenues: "boutiques",
  Alliances: "bijoutiers", "Coiffure & maquillage": "coiffeurs et maquilleurs", Papeterie: "papetiers", Transport: "transporteurs", Officiant: "officiants", "Hébergement": "hébergements",
  "Animation enfants": "animateurs", Bar: "bars", "Pâtissier": "pâtissiers", "Wedding planner": "wedding planners", "Agence de voyage": "agences" };
const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export function makeBudget(ctx) {
  const { S, esc } = ctx, eur = ctx.eur;
  const pl = m => PL[m] || String(m || "").toLowerCase();
  const B = () => bilan({ lignes: S.budget, vendors: ctx.vendorsVisibles(), guests: S.guests, limite: S.settings.budgetTotal, invitesCible: S.settings.invitesCible, prenomMoi: ctx.prenom() });
  const icon = m => `<svg class="ev-ic" viewBox="0 0 24 24" aria-hidden="true">${TILE_ICON[tuileDe(m)] || '<circle cx="12" cy="12" r="7"/><path d="M9 12h6"/>'}</svg>`;
  const pastille = p => `<span class="pr-av t-${ctx.tintOf(p.metier || p.b.label)}" aria-hidden="true">${esc(ctx.initials(p.metier || p.b.label))}</span>`;
  const budgetEnvies = m => { const k = m && tuileDe(m); return k ? +((ctx.metaTuile(k) || {}).budget) || 0 : 0; };

  function texteEtat(p, b) {
    const e = etatPoste(p, { vendors: ctx.vendorsVisibles(), attendus: b.attendus });
    switch (e.k) {
      case "reserve": return [UI.etat.reserve(e.nom, e.paye ? eur(e.paye) : ""), "ok"];
      case "signeDessus": return [UI.etat.signeDessus(eur(e.ecart)), "bad"];
      case "signe": return [UI.etat.signe(e.paye ? eur(e.paye) : ""), "ok"];
      case "devis": return [UI.etat.devis(eur(e.meilleur), e.ecart), e.ecart > 0 ? "bad" : ""];
      case "sansDevis": return [UI.etat.sansDevis(e.n, e.n > 1 ? pl(e.metier) : pl(e.metier).replace(/s$/, "")), "coral"];
      default: return [e.parInvite ? UI.etat.parInvite(eur(e.parInvite)) : UI.etat.estimation, ""];
    }
  }

  /* ---------- 3.2 La page ---------- */
  function head(b) {
    const ba = barre(b), lim = b.limite;
    const seg = (w, c) => (w > 0 ? `<i class="bu-s ${c}" style="width:${w.toFixed(2)}%"></i>` : "");
    return `<section class="pr-head bu-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-new="budget" aria-label="${UI.ajouter}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <div class="bu-k">${UI.prevuK}</div>
      <div class="pr-count bu-count"><b class="num">${eur(b.prevu)}</b>${lim ? `<button class="bu-lim" data-act="budgettot" ${S.canWrite ? "" : "disabled"} aria-label="${UI.modifierLimite}">${esc(UI.pour(eur(lim)))}</button>` : S.canWrite ? `<button class="bu-lim" data-act="budgettot">${UI.fixerLimite}</button>` : ""}</div>
      <div class="bu-bar" role="img" aria-label="${esc(`${eur(b.paye)} payés, ${eur(b.signe)} signés, ${eur(b.prevu)} prévus${lim ? `, limite ${eur(lim)}` : ""}`)}">
        ${seg(ba.paye, "paye")}${seg(ba.signe, "signe")}${seg(ba.prevu - ba.depasse > 0 ? ba.prevu - ba.depasse : 0, "prevu")}${ba.depasse ? `<i class="bu-s over" style="width:${ba.depasse.toFixed(2)}%"></i>` : ""}
        ${ba.limite != null && ba.depasse ? `<span class="bu-limk" style="left:${ba.limite.toFixed(2)}%"></span>` : ""}</div>
      <div class="bu-leg"><span>${["paye", "signe", "prevu"].map(k => `<span><i class="bu-s ${k}"></i>${UI.leg[k]}</span>`).join("")}</span>
        ${b.depasse ? `<b class="bu-over">${esc(UI.plus(eur(b.depasse)))}</b>` : b.marge != null ? `<b>${esc(UI.marge(eur(b.marge)))}</b>` : ""}</div>
      <div class="bu-cpts">
        <div><b class="num">${eur(b.signe)}</b><span>${UI.cpt.signe}${b.signe && b.prevu ? ` · ${UI.cpt.pctPrevu(Math.round(b.signe / b.prevu * 100))}` : ""}</span></div>
        <div><b class="num">${eur(b.paye)}</b><span>${UI.cpt.paye}</span></div>
        <div><b class="num">${b.parInvite ? eur(b.parInvite) : "—"}</b><span>${UI.cpt.parInvite(b.attendus)}</span></div></div>
    </section>`;
  }
  // pistes en cache (meta/arbitrage) tant que la limite et les enveloppes n'ont pas changé
  const pistesValides = () => { const a = S.arbitrage || {}; return a.empreinte === empreinteBudget(S.budget, S.settings.budgetTotal) && Array.isArray(a.pistes) ? a.pistes : null; };
  function carteArbitrer(b) {
    if (!b.depasse) return "";
    const p = (pistesValides() || [])[0];
    return `<section class="pr-card bu-arb"><span class="ev-tag">${UI.arbitrer}</span><b>${esc(UI.aTrouver(eur(b.depasse)))}</b><p>${esc(p ? UI.piste(p.titre, eur(p.gain)) : UI.arbitrerP)}</p>
      <button class="btn primary" data-act="buview" data-v="arbitrer">${UI.voirPistes}</button></section>`;
  }
  const cal = d => `<span class="pr-cal" aria-hidden="true"><small>${MOIS[d.getMonth()]}</small><b>${d.getDate()}</b></span>`;
  function aPayer(pays) {
    const tot = pays.reduce((s, p) => s + p.amount, 0), t = ctx.today();
    if (!pays.length) return `<section class="pr-sec"><h3 class="home-h">${UI.aPayer}</h3><div class="bu-rien">${UI.rienAPayer}</div></section>`;
    return `<section class="pr-sec"><div class="pr-sec-h"><h3 class="home-h">${UI.aPayer}</h3><span class="ev-note num">${esc(UI.aVenir(eur(tot)))}</span></div>
      <div class="pr-box">${pays.slice(0, 3).map((p, i) => { const proche = i === 0 && p.date && (p.date - t) / 864e5 <= 30;
        return `<div class="bu-pay ${proche ? "proche" : ""} ${p.aConfirmer ? "conf" : ""}">${p.date ? cal(p.date) : `<span class="pr-cal" aria-hidden="true"><small>?</small><b>–</b></span>`}
          <span class="pr-rb"><button class="pr-link bu-pn" data-fiche="${p.v.id}"><b>${esc(p.v.name)}</b></button><span>${esc([p.kind, p.aConfirmer ? UI.aConfirmer : "", p.date ? "" : UI.dateAPreciser].filter(Boolean).join(" · "))}</span></span><b class="num">${eur(p.amount)}</b></div>`; }).join("")}</div>
      ${S.canWrite ? `<button class="btn" data-act="prpaye" data-id="${pays[0].v.id}" data-k="${pays[0].kind === "Acompte" ? "acompte" : "solde"}">${esc(UI.marquer(pays[0].kind === "Acompte" ? UI.acompte : UI.solde))} · ${esc(pays[0].v.name)}</button>` : ""}</section>`;
  }
  function lignePoste(p, b, max) {
    const [txt, cls] = texteEtat(p, b), w = max ? Math.max(4, p.prevu / max * 100) : 0;
    const pa = p.prevu ? Math.min(100, p.paye / p.prevu * 100) : 0, si = p.prevu ? Math.min(100 - pa, Math.max(0, p.signe - p.paye) / p.prevu * 100) : 0;
    return `<button class="bu-row" data-act="buposte" data-id="${p.b.id}">${pastille(p)}<span class="pr-rb"><span class="bu-rh"><b>${esc(p.b.label)}</b><b class="num">${p.prevu ? eur(p.prevu) : "—"}</b></span>
      <span class="bu-pb" style="width:${w.toFixed(1)}%"><i class="paye" style="width:${pa.toFixed(1)}%"></i><i class="signe" style="width:${si.toFixed(1)}%"></i></span>
      <span class="bu-et ${cls}">${esc(txt)}</span></span>${ctx.CHEV}</button>`;
  }
  function postes(b) {
    const ps = b.postes.slice().sort((x, y) => y.prevu - x.prevu || String(x.b.label).localeCompare(y.b.label)), max = ps.length ? ps[0].prevu : 0;
    if (!ps.length) return `<section class="pr-sec"><h3 class="home-h">${UI.ou(0).replace(/ · .*/, "")}</h3>${ctx.emptyBlock(UI.vide, UI.videP)}</section>`;
    const vus = S.f.bAll ? ps : ps.slice(0, 8), reste = ps.slice(8);
    return `<section class="pr-sec"><h3 class="home-h">${UI.ou(ps.length)}</h3><div class="pr-list">${vus.map(p => lignePoste(p, b, max)).join("")}</div>
      ${reste.length ? `<button class="link bu-more" data-act="buall">${S.f.bAll ? UI.moins : esc(UI.autres(reste.length, eur(reste.reduce((s, p) => s + p.prevu, 0))))}</button>` : ""}</section>`;
  }
  function vMain() {
    const b = B(), pays = ctx.payments();
    const ap = aPayer(pays), ps = postes(b);
    // « À payer » au-dessus des postes dès qu'une échéance existe (artboard 4), en dessous sinon (artboard 1)
    return `<div class="pr bu">${head(b)}${carteArbitrer(b)}${pays.length ? ap + ps : ps + ap}
      <button class="pr-row bu-pdf" data-act="pdfreport">${SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>')}<span class="pr-rb"><b>Rapport d'organisation</b><span>PDF · budget, planning, prestataires et invités</span></span>${ctx.CHEV}</button></div>`;
  }

  /* ---------- 3.5 Un poste ouvert ---------- */
  function vPoste(id) {
    const b = B(), p = b.postes.find(x => x.b.id === id);
    if (!p) { S.f.bView = "main"; return vMain(); }
    const m = p.metier, [txt] = texteEtat(p, b), pct = b.prevu ? Math.round(p.prevu / b.prevu * 100) : 0, be = budgetEnvies(m), ec = ecartEnvies(p.prevu, be);
    const df = m ? devisFace(m, ctx.vendorsVisibles(), p.prevu) : [], echelle = Math.max(p.prevu, ...df.map(x => x.prix), 1) * 1.08;
    const pays = ctx.payments().filter(x => p.reserves.some(v => v.id === x.v.id));
    const deps = Array.isArray(p.b.depenses) ? p.b.depenses : [];
    const enveloppe = `<section class="pr-card bu-env"><div class="pr-sec-h"><h3 class="home-h">${UI.enveloppe}</h3>${be ? `<span class="ev-note">${esc(UI.vosEnvies(eur(be)))}</span>` : ""}</div>
      <div class="bu-step">${S.canWrite ? `<button class="pr-round sm bu-pm" data-act="buenv" data-d="-100" aria-label="${UI.moins100}">${SVG('<path d="M5 12h14"/>')}</button>` : ""}
        <label class="sr" for="bu-env-in">${UI.enveloppeL}</label><input id="bu-env-in" class="bu-in num" inputmode="numeric" data-buenv="${p.b.id}" value="${p.prevu || ""}" placeholder="0" ${S.canWrite ? "" : "disabled"}><span class="bu-eu">€</span>
        ${S.canWrite ? `<button class="pr-round sm bu-pm" data-act="buenv" data-d="100" aria-label="${UI.plus100}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : ""}</div>
      ${ec ? `<p class="ev-note">${esc(UI.ecartEnvies(ec, eur(be)))}</p>` : ""}</section>`;
    const devis = m ? `<section class="pr-sec"><h3 class="home-h">${UI.devisFace}</h3>
      ${df.length ? `<div class="pr-box bu-df">${df.map(x => `<button class="bu-dv" data-fiche="${x.v.id}"><span class="bu-dvh"><b>${esc(x.v.name)}</b><b class="num">${x.prix ? eur(x.prix) : `<span class="na">${UI.prixInconnu}</span>`}</b></span>
          <span class="bu-dtrack">${x.prix ? `<i class="${x.ecart > 0 ? "over" : ""}" style="width:${(x.prix / echelle * 100).toFixed(1)}%"></i>` : ""}${p.prevu ? `<span class="bu-envl" style="left:${(p.prevu / echelle * 100).toFixed(1)}%"></span>` : ""}</span>
          <span class="bu-dvs">${[x.ecart ? `<span class="${x.ecart > 0 ? "bad-t" : "ok-t"}">${x.ecart > 0 ? "+" : "−"}${eur(Math.abs(x.ecart))}</span>` : "", x.fit != null ? UI.fit(x.fit) : ""].filter(Boolean).join(" · ")}</span></button>`).join("")}</div>
        <button class="link" data-act="bumetier" data-m="${esc(m)}">${esc(UI.comparer(pl(m)))}</button>`
        : `<p class="ev-note">${UI.aucunCand}</p><button class="btn sm" data-act="bumetier" data-m="${esc(m)}">${esc(UI.trouver(pl(m)))}</button>`}</section>` : "";
    const quand = `<section class="pr-sec"><h3 class="home-h">${UI.quandPayer}</h3>${pays.length ? `<div class="pr-box">${pays.map(x => `<div class="bu-pay">${x.date ? cal(x.date) : `<span class="pr-cal" aria-hidden="true"><small>?</small><b>–</b></span>`}<span class="pr-rb"><b>${esc(x.kind)}</b><span>${esc(x.v.name)}${x.date ? "" : ` · ${UI.dateAPreciser}`}</span></span><b class="num">${eur(x.amount)}</b>
      ${S.canWrite ? `<button class="btn sm" data-act="prpaye" data-id="${x.v.id}" data-k="${x.kind === "Acompte" ? "acompte" : "solde"}" aria-label="${esc(UI.marquer(x.kind === "Acompte" ? UI.acompte : UI.solde))}">✓</button>` : ""}</div>`).join("")}</div>`
      : `<p class="ev-note">${UI.echeancesSignature}</p>`}</section>`;
    const autres = `<section class="pr-sec"><h3 class="home-h">${UI.autresDep}</h3>
      ${deps.length ? `<div class="pr-box">${deps.map((d, i) => `<div class="bu-pay"><span class="pr-rb"><b>${esc(d.label || UI.depLabel)}</b><span>${d.paye ? UI.payee : UI.signee}</span></span><b class="num">${eur(+d.montant || 0)}</b>${S.canWrite ? `<button class="link" data-act="budepdel" data-i="${i}">${UI.retirer}</button>` : ""}</div>`).join("")}</div>` : `<p class="ev-note">${UI.depP}</p>`}
      ${S.canWrite ? `<form class="bu-dep" data-budep="${p.b.id}"><label class="sr" for="bu-dl">${UI.depLabel}</label><input id="bu-dl" name="label" placeholder="${UI.depLabel}" required>
        <label class="sr" for="bu-dm">${UI.depMontant}</label><input id="bu-dm" name="montant" class="num" inputmode="decimal" placeholder="€" required>
        <label class="bu-ck"><input type="checkbox" name="paye"> ${UI.depPaye}</label><button class="btn sm" type="submit">${UI.ajouterDep}</button></form>` : ""}</section>`;
    return `<div class="ev-page pr-page bu-page">
      <div class="ev-cover">${m ? `<span class="ev-ph ev-ph-ic cov" aria-hidden="true">${icon(m)}</span>` : `<span class="ev-ph cov bu-nocov" aria-hidden="true"></span>`}<button class="ev-back" data-act="buview" data-v="main" aria-label="${UI.titre}">${ctx.BACK_SVG}</button>
        <div class="ev-cover-b"><h2>${esc(p.b.label)}</h2><span>${esc([pct ? UI.duMariage(pct) : "", txt].filter(Boolean).join(" · "))}</span></div></div>
      ${enveloppe}${devis}${quand}${autres}
      ${S.canWrite ? `<button class="btn bu-mod" data-edit="budget" data-id="${p.b.id}">${UI.modifier}</button>` : ""}</div>`;
  }

  /* ---------- 3.3 Arbitrer ---------- */
  async function demanderPistes(autres = false) {
    if (S.ui.arbLoading) return;
    S.ui.arbLoading = true; S.ui.arbErr = ""; S.ui.arbSel = []; S.ui.arbAssume = false; ctx.render();
    try { const r = await ctx.runAgentNow("arbitrer", autres ? { autres: true } : {}); if (r && r.ok === false) S.ui.arbErr = r.erreur || "erreur"; }
    catch (e) { S.ui.arbErr = e.message || "erreur"; }
    S.ui.arbLoading = false; ctx.render();
  }
  function vArbitrer() {
    const b = B();
    if (!b.depasse) return `<div class="ev-page bu-page"><button class="link env-back" data-act="buview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button><p class="ev-note">${UI.rienADepasser}</p></div>`;
    const pistes = pistesValides();
    if (!pistes && !S.ui.arbLoading && !S.ui.arbErr && S.canWrite) setTimeout(() => demanderPistes(false), 0); // un appel seulement si rien en cache
    const sel = (S.ui.arbSel || []).filter(i => pistes && pistes[i]), assume = !!S.ui.arbAssume;
    // nouveau total : les pistes cochées (par poste, la plus forte baisse), ou la limite montée au prévu
    const parPoste = {};
    sel.forEach(i => pistes[i].changements.forEach(c => { parPoste[c.posteId] = Math.min(parPoste[c.posteId] ?? c.avant, c.apres); }));
    const gain = Object.entries(parPoste).reduce((s, [id, apres]) => { const l = S.budget.find(x => x.id === id); return s + Math.max(0, (+(l && l.prevu) || 0) - apres); }, 0);
    const total = b.prevu - gain, limite = assume ? b.prevu : b.limite, ecart = total - limite;
    const pct = x => Math.max(0, Math.min(100, x / Math.max(total, limite, 1) * 100));
    return `<div class="ev-page bu-page bu-arbp"><button class="link env-back" data-act="buview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${esc(UI.arbT(eur(b.depasse)))}</h2><p class="ev-note">${UI.arbP}</p>
      ${S.ui.arbLoading ? `<div class="pr-card bu-load" role="status"><span class="spin" aria-hidden="true"></span>${UI.cherche}</div>`
        : S.ui.arbErr ? `<p class="brief-err">${esc(UI.echec(S.ui.arbErr))}</p>`
        : pistes && !pistes.length ? `<p class="ev-note">${UI.aucunePiste}</p>`
        : (pistes || []).map((x, i) => `<label class="pr-card bu-piste ${sel.includes(i) ? "on" : ""}"><input type="checkbox" data-buarb="${i}" ${sel.includes(i) ? "checked" : ""} ${assume || !S.canWrite ? "disabled" : ""}>
          <span class="pr-rb"><span class="bu-ph"><b>${esc(x.titre)}</b><b class="num ok-t">−${eur(x.gain)}</b></span><span>${esc(x.pourquoi)}</span>
          ${x.perte ? `<span class="bu-perte"><b>${UI.perdez} :</b> ${esc(x.perte)}</span>` : ""}<span class="bu-chg">${x.changements.map(c => `${esc(c.label)} ${eur(c.avant)} → ${eur(c.apres)}`).join(" · ")}</span></span></label>`).join("")}
      <label class="pr-card bu-piste ${assume ? "on" : ""}"><input type="checkbox" data-buassume="1" ${assume ? "checked" : ""} ${S.canWrite ? "" : "disabled"}><span class="pr-rb"><b>${esc(UI.assumer(eur(b.prevu)))}</b><span>${UI.assumerP}</span></span></label>
      ${S.canWrite && !S.ui.arbLoading ? `<button class="link" data-act="buautres">${UI.autresPistes}</button>` : ""}
      <p class="ev-note">${UI.mentionIA}</p>
      ${S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><span>${UI.nouveauTotal}</span><b class="num">${eur(total)}</b>
          <span class="${ecart > 0 ? "bu-over" : ""}">${ecart > 0 ? esc(UI.reste(eur(ecart))) : ecart < 0 ? esc(UI.sous(eur(-ecart))) : UI.pile}</span>
          <span class="bu-mini"><i style="width:${pct(Math.min(total, limite)).toFixed(1)}%"></i>${ecart > 0 ? `<i class="over" style="width:${pct(ecart).toFixed(1)}%"></i>` : ""}</span></div>
        <button class="btn primary" data-act="buappliquer" ${sel.length || assume ? "" : "disabled"}>${assume ? UI.appliquerA : esc(UI.appliquer(sel.length))}</button></div>` : ""}</div>`;
  }
  async function appliquer() {
    if (!S.canWrite) return;
    if (S.ui.arbAssume) {
      const b = B(), avant = S.settings.budgetTotal ?? null;
      if (await ctx.setLimite(b.prevu)) { ctx.toastUndo(UI.assume(eur(b.prevu)), () => ctx.setLimite(avant)); S.ui.arbAssume = false; show("main"); }
      return;
    }
    const pistes = pistesValides() || [], parPoste = {};
    (S.ui.arbSel || []).filter(i => pistes[i]).forEach(i => pistes[i].changements.forEach(c => { parPoste[c.posteId] = Math.min(parPoste[c.posteId] ?? Infinity, c.apres); }));
    const avant = {}, ids = Object.keys(parPoste).filter(id => S.budget.some(x => x.id === id));
    for (const id of ids) { const l = S.budget.find(x => x.id === id); avant[id] = l.prevu ?? null; }
    let ok = true;
    for (const id of ids) ok = (await ctx.patch("budget", id, { prevu: parPoste[id], updatedAt: Date.now() })) && ok; // enveloppes seulement, jamais de suppression
    if (ok) { ctx.toastUndo(UI.applique(ids.length), async () => { for (const id of ids) await ctx.patch("budget", id, { prevu: avant[id] }); }); S.ui.arbSel = []; show("main"); }
  }

  /* ---------- 3.6 Budget vide ---------- */
  const vide = () => !(+S.settings.budgetTotal > 0) && !S.budget.length;
  function vVide() {
    const m = +String(S.ui.buMontant ?? "").replace(/\s/g, "") || 0, n = B().attendus, rep = S.repartition && S.repartition.postes && S.repartition.postes.length ? S.repartition : null;
    const seg = rep ? rep.postes.slice().sort((a, b) => b.montant - a.montant).slice(0, 5).map(p => [p.label, p.montant]) : UI.apercu.map((l, i) => [l, [30, 35, 10, 10, 15][i]]);
    const tot = seg.reduce((s2, x) => s2 + x[1], 0) || 1;
    return `<div class="pr bu">
      <section class="pr-head bu-head bu-vide"><div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2><span></span></div>
        <b class="bu-vt">${UI.videT}</b><p>${UI.videP2}</p>
        <label class="sr" for="bu-montant">${UI.montantL}</label><div class="bu-vin"><input id="bu-montant" class="num" inputmode="numeric" data-bumontant="1" placeholder="20 000" value="${m || ""}" ${S.canWrite ? "" : "disabled"}><span>€</span></div>
        <div class="bu-chips">${[15000, 20000, 30000].map(v => `<button class="chip ${m === v ? "acc" : ""}" data-act="bumontant" data-v="${v}">${eur(v)}</button>`).join("")}</div>
        ${n && m ? `<span class="bu-pp">${esc(UI.parPers(n, eur(Math.round(m / n))))}</span>` : ""}</section>
      <section class="pr-card pl-coach">${coachEntete()}<p>${UI.coachRep}</p>
        <span class="bu-apercu" aria-hidden="true">${seg.map((x, i) => `<i class="a${i}" style="width:${(x[1] / tot * 100).toFixed(1)}%"></i>`).join("")}</span>
        <span class="bu-apl">${seg.map((x, i) => `<span><i class="a${i}"></i>${esc(x[0])}</span>`).join("")}</span>
        ${S.ui.repErr ? `<p class="brief-err">${esc(UI.echecRep(S.ui.repErr))}</p>` : ""}
        ${S.canWrite ? `<button class="btn primary" data-act="burepartir" ${S.ui.repLoading ? "disabled" : ""}>${S.ui.repLoading ? UI.repEnCours : UI.repartir}</button>
          <button class="btn" data-act="buestimer" ${S.ui.repLoading ? "disabled" : ""}>${UI.estimer}</button>` : ""}</section>
      ${S.canWrite ? `<button class="link" data-act="bumoimeme">${UI.moiMeme}</button>` : ""}</div>`;
  }
  const coachEntete = () => `<span class="pr-ck2"><span class="pr-mi" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.9L19 9.7l-4.6 2.6L12 21l-2.4-8.7L5 9.7l5.2-1.8z"/></svg></span><b>LE COACH</b></span>`;
  async function repartir(total) {
    if (S.ui.repLoading) return;
    S.ui.repLoading = true; S.ui.repErr = ""; ctx.render();
    try { const r = await ctx.runAgentNow("repartir", total ? { total } : {}); if (r && r.ok === false) S.ui.repErr = r.erreur || "erreur"; else { S.ui.repSel = null; S.ui.repMontants = {}; S.f.bView = "repartition"; ctx.saveF(); } }
    catch (e) { S.ui.repErr = e.message || "erreur"; }
    S.ui.repLoading = false; ctx.render(); window.scrollTo(0, 0);
  }
  function vRepartition() {
    const r = S.repartition || {}, ps = r.postes || [];
    if (!ps.length) { S.f.bView = "main"; return vMain(); }
    const sel = S.ui.repSel || ps.map((_, i) => i), mt = S.ui.repMontants || {}, val = i => (mt[i] != null ? mt[i] : ps[i].montant);
    const tot = sel.reduce((s2, i) => s2 + (+val(i) || 0), 0);
    return `<div class="ev-page bu-page bu-arbp"><button class="link env-back" data-act="buview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.repT}</h2>${r.estime ? `<span class="ev-tag">${esc(UI.repEst(eur(r.total)))}</span>` : ""}<p class="ev-note">${UI.repP}</p>
      <div class="pr-box">${ps.map((p, i) => `<div class="bu-rp ${sel.includes(i) ? "" : "off"}"><input type="checkbox" data-burep="${i}" ${sel.includes(i) ? "checked" : ""} aria-label="${esc(p.label)}">
        <span class="pr-rb"><b>${esc(p.label)}</b>${p.pourquoi ? `<span>${esc(p.pourquoi)}</span>` : ""}</span>
        <label class="sr" for="bu-rp-${i}">${esc(UI.montantPoste(p.label))}</label><input id="bu-rp-${i}" class="num bu-rpm" inputmode="numeric" data-burepm="${i}" value="${val(i)}"><span class="bu-eu">€</span></div>`).join("")}</div>
      <p class="ev-note">${UI.mentionRep}</p>
      <button class="link" data-act="${r.estime ? "buestimer" : "burepartir"}">${UI.refaireRep}</button>
      ${S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><span>${esc(UI.totalRep(""))}</span><b class="num">${eur(tot)}</b></div>
        <button class="btn primary" data-act="bucreer" ${sel.length ? "" : "disabled"}>${UI.creer(sel.length)}</button></div>` : ""}</div>`;
  }
  async function creerPostes() {
    const r = S.repartition || {}, ps = r.postes || [], sel = S.ui.repSel || ps.map((_, i) => i), mt = S.ui.repMontants || {};
    const choisis = sel.map(i => ({ ...ps[i], montant: Math.max(0, Math.round(+(mt[i] != null ? mt[i] : ps[i].montant) || 0)) })).filter(p => p.montant > 0);
    if (!choisis.length) return;
    const limAvant = S.settings.budgetTotal ?? null, total = choisis.reduce((s2, p) => s2 + p.montant, 0);
    const ids = [];
    for (const [i, p] of choisis.entries()) { const id = await ctx.addDoc("budget", { label: p.label, prevu: p.montant, metier: p.metier || "", order: i + 1, note: "", source: "coach" }); if (id) ids.push(id); }
    if (!(+S.settings.budgetTotal > 0)) await ctx.setLimite(+String(S.ui.buMontant || "").replace(/\s/g, "") || r.total || total);
    // annulable : les postes que l'on vient de créer sont retirés, la limite revient (rien d'autre n'est touché)
    ctx.toastUndo(UI.cree(ids.length), async () => { for (const id of ids) await ctx.remove("budget", id); await ctx.setLimite(limAvant); });
    S.f.bView = "main"; ctx.saveF(); ctx.render(); window.scrollTo(0, 0);
  }

  function vBudget() {
    if (S.f.bView === "repartition") return vRepartition();
    if (vide() && S.f.bView !== "poste") return vVide();
    return S.f.bView === "poste" ? vPoste(S.f.bPoste) : S.f.bView === "arbitrer" ? vArbitrer() : vMain();
  }
  const show = (v, id) => { S.f.bView = v; if (id) S.f.bPoste = id; ctx.saveF(); ctx.render(); window.scrollTo(0, 0); };
  async function setEnveloppe(id, val) {
    const b = S.budget.find(x => x.id === id); if (!b || !S.canWrite) return;
    const avant = b.prevu ?? null, n = Math.max(0, Math.round(+val || 0));
    if (n === (+avant || 0)) return;
    if (await ctx.patch("budget", id, { prevu: n, updatedAt: Date.now() })) ctx.toastUndo(UI.envOk(eur(n)), () => ctx.patch("budget", id, { prevu: avant }));
  }
  function act(a, t) {
    switch (a) {
      case "buview": show(t.dataset.v); return true;
      case "buposte": show("poste", t.dataset.id); return true;
      case "buall": S.f.bAll = !S.f.bAll; ctx.saveF(); ctx.render(); return true;
      case "buautres": demanderPistes(true); return true;
      case "buappliquer": appliquer(); return true;
      case "bumontant": S.ui.buMontant = +t.dataset.v; ctx.render(); return true;
      case "burepartir": { const m = +String(S.ui.buMontant || "").replace(/\s/g, "") || +S.settings.budgetTotal || (S.repartition && !S.repartition.estime ? S.repartition.total : 0);
        if (!m) { ctx.toast(UI.indiquez); const i = document.getElementById("bu-montant"); if (i) i.focus(); return true; } repartir(m); return true; }
      case "buestimer": repartir(0); return true;
      case "bucreer": creerPostes(); return true;
      case "bumoimeme": { const m = +String(S.ui.buMontant || "").replace(/\s/g, ""); (m ? ctx.setLimite(m) : Promise.resolve()).then(() => ctx.openEditor("budget")); return true; }
      case "buenv": { const b = S.budget.find(x => x.id === S.f.bPoste); if (b) setEnveloppe(b.id, (+b.prevu || 0) + (+t.dataset.d)); return true; }
      case "bumetier": S.f.pView = "metier"; S.f.pMetier = t.dataset.m; ctx.saveF(); ctx.go("prestataires"); return true;
      case "budepdel": { const b = S.budget.find(x => x.id === S.f.bPoste); if (!b) return true; const avant = (b.depenses || []).slice(), i = +t.dataset.i;
        ctx.patch("budget", b.id, { depenses: avant.filter((_, j) => j !== i) }).then(ok => ok && ctx.toastUndo(UI.depRetiree, () => ctx.patch("budget", b.id, { depenses: avant }))); return true; }
    }
    return false;
  }
  function change(el) {
    if (!el.dataset) return false;
    if (el.dataset.buenv) { setEnveloppe(el.dataset.buenv, String(el.value).replace(/\s/g, "")); return true; }
    if (el.dataset.buarb != null) { const i = +el.dataset.buarb, s2 = new Set(S.ui.arbSel || []); el.checked ? s2.add(i) : s2.delete(i); S.ui.arbSel = [...s2]; ctx.render(); return true; }
    if (el.dataset.bumontant) { S.ui.buMontant = String(el.value).replace(/[^\d]/g, ""); ctx.render(); return true; }
    if (el.dataset.burep != null) { const r = S.repartition || {}, i = +el.dataset.burep, s2 = new Set(S.ui.repSel || (r.postes || []).map((_, j) => j)); el.checked ? s2.add(i) : s2.delete(i); S.ui.repSel = [...s2].sort((a, b) => a - b); ctx.render(); return true; }
    if (el.dataset.burepm != null) { S.ui.repMontants = { ...(S.ui.repMontants || {}), [el.dataset.burepm]: Math.max(0, Math.round(+String(el.value).replace(/[^\d]/g, "") || 0)) }; ctx.render(); return true; }
    if (el.dataset.buassume) { S.ui.arbAssume = el.checked; if (el.checked) S.ui.arbSel = []; ctx.render(); return true; }
    return false;
  }
  async function submit(form) {
    if (!form.dataset || !form.dataset.budep) return false;
    const b = S.budget.find(x => x.id === form.dataset.budep), fd = new FormData(form), montant = +String(fd.get("montant") || "").replace(/\s/g, "").replace(",", ".");
    if (!b || !(montant > 0)) return true;
    const avant = (b.depenses || []).slice(), d = { label: String(fd.get("label") || "").trim().slice(0, 80), montant: Math.round(montant * 100) / 100, paye: !!fd.get("paye"), at: Date.now() };
    if (await ctx.patch("budget", b.id, { depenses: [...avant, d] })) { form.reset(); ctx.toastUndo(UI.depOk, () => ctx.patch("budget", b.id, { depenses: avant })); }
    return true;
  }
  return { vBudget, act, change, submit, chiffres: B, metierDe };
}
// Choix du métier d'un poste dans son formulaire : deviné d'après le nom tant qu'il n'est pas choisi, ou aucun (poste libre)
export const METIER_OPTIONS = [["", "Deviné d'après le nom"], ...METIERS.filter(m => m !== AUTRE).map(m => [m, m]), ["-", "Aucun (poste libre)"]];
