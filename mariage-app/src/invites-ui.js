// Page « Invités » v1 (docs/invites-v1.md, lot 1) : moment 1 « Qui on invite ? » (3.1), un cercle, un foyer (3.2), regroupement en foyers.
// Règles dans agents/lib/invites.js (testées). Une fiche par personne (`guests`) reliée à un foyer (`foyers`, `guests.foyerId`).
// Lot 2 : lien des adresses. Lot 3 : moment 2 « Qui vient ? » (3.3 : réponses, relance, récapitulatif traiteur, par moment), réponse par personne
// sur la page d'un foyer, faire-part marqués envoyés, moments du mariage. Aucun appel IA à l'affichage. Lots suivants : plan de table (4), liste vide (5).
import { foyersDe, nomFoyer, compte, momentDe, points, cercles, proposerFoyers, carteAction, estPlusUn, coteDe, SUIVI,
  momentsDe, inviteA, vientA, envoye, repondu, etapeApresReponse, reponses, statutFoyer, dateLimite, aRelancer, recapTraiteur, texteTraiteur, parMoment, messageRelance,
  nettoyerFoyersProposes, lireCsv, texteTableur } from "../agents/lib/invites.js";

// Textes d'interface (à traduire)
const UI = {
  nouveauT: "Nouveau foyer", nouveauP: "Un couple, une famille ou une personne seule : une invitation, une adresse.", nomFoyerOpt: "Nom du foyer (facultatif)",
  cote: "Côté", cercle: "Cercle", personneN: i => `Personne ${i}`, prenomNom: "Prénom et nom", enfantCase: "Enfant", ajouterLigne: "Ajouter une personne",
  avecPlus1: "Avec un accompagnant dont nous ne connaissons pas encore le prénom (+1)", creerFoyer: "Créer le foyer", uneSeule: "Ajouter une seule personne (formulaire complet)",
  auMoinsUn: "Indiquez au moins une personne.", foyerCree: n => `${n} ajouté à la liste`,
  titre: "Nos invités", retour: "Accueil", ajouter: "Ajouter une personne", surListe: "SUR LA LISTE", visees: c => `sur ${c} visés`, fixerCible: "Fixer une cible",
  cibleL: "Nombre d'invités visé", unPour2: "1 point = 2 personnes", libres: n => `${n} place${n > 1 ? "s" : ""} libre${n > 1 ? "s" : ""}`, auDessus: n => `+${n} au-dessus de votre cible`, commun: "Commun",
  cpt: { ae: "adultes + enfants", foyers: "foyers", adresses: "adresses" },
  action: {
    regrouper: (n, f) => [`${n} invités à regrouper en ${f} foyer${f > 1 ? "s" : ""}`, "Un couple ou une famille = une invitation, une adresse, une réponse.", "Voir les foyers proposés"],
    adresses: n => [`${n} foyer${n > 1 ? "s" : ""} sans adresse`, "Envoyez-leur un lien : ils la saisissent eux-mêmes, sans compte.", "Partager le lien"],
    prets: () => ["Prêts pour les save-the-date", "Toutes les adresses sont là.", "Voir la tâche"],
  },
  rechercher: "Chercher un nom ou un cercle", parCercle: "Par cercle", sansCercle: "Sans cercle", aucun: "Aucun invité ne correspond.",
  planT: "Plan de table", planS: "Utile quand les réponses arrivent · brouillon possible", coller: "Coller une liste", exporter: "Exporter (CSV)", liste: "Liste détaillée et rangement",
  // cercle
  foyersN: n => `${n} foyer${n > 1 ? "s" : ""}`, personnesN: n => `${n} personne${n > 1 ? "s" : ""}`,
  // foyer
  unFoyer: (a, e) => `Un foyer · ${a} adulte${a > 1 ? "s" : ""}${e ? ` · ${e} enfant${e > 1 ? "s" : ""}` : ""} · une seule invitation`,
  personnes: "Les personnes", adulte: "Adulte", enfant: "Enfant", plusUn: "+1", prenomADemander: "Prénom à demander", ajouterPersonne: "Ajouter une personne au foyer", ajouterPlus1: "Ajouter un +1",
  deLaListe: "Ajouter quelqu'un de la liste", choisirT: f => `Ajouter à ${f}`, choisirP: "Touchez les personnes qui font partie de ce foyer.", chercherPers: "Chercher une personne",
  deja: f => `aujourd'hui avec ${f}`, seul: "seul", aucunePers: "Personne d'autre sur la liste ne correspond.", fermer: "Fermer", lie: (n, f) => `${n} rejoint ${f}`,
  invitesA: "Invités à",
  // lot 3 : les réponses
  viennent: "ILS VIENNENT", surInvites: n => `sur ${n} invité${n > 1 ? "s" : ""}`, cpt2: { diner: "au dîner", enfants: n => (n > 1 ? "enfants" : "enfant"), limite: "date limite" },
  limiteL: "Date limite de réponse", limiteP: "proposée", fixerLimite: "à fixer",
  leg: { oui: "viennent", non: "ne viennent pas", sans: "sans réponse", pasEnvoye: "faire-part pas envoyé" },
  relT: n => `À relancer · ${n}`, relP: d => (d ? `Sans réponse, date limite le ${d}.` : "Sans réponse."), relBtn: "Relancer · message prêt", relPrep: "Le coach prépare le message…",
  relSheetT: "Relancer", relSheetP: "Le message s'ouvre dans la feuille de partage du téléphone (SMS, WhatsApp, mail) : l'app n'envoie rien elle-même. Vous pouvez le modifier avant.",
  relMsg: "Message", relEnvoyer: "Envoyer", relFait: "Relancé", relNote: f => `Relance notée pour ${f}`, relAutre: "Une autre formulation", relErr: e => `Le message n'a pas pu être préparé : ${e}`, relMarquer: "Marquer relancé",
  traiteurT: "Pour le traiteur", traiteurP: "Les personnes qui viennent au dîner. Les régimes sont comptés sans nom.", adultes: n => (n > 1 ? "adultes" : "adulte"), enfants: n => (n > 1 ? "enfants" : "enfant"), regimes: n => (n > 1 ? "régimes" : "régime"),
  aucunRegime: "Aucun régime signalé pour l'instant.", avecNoms: "Ajouter les noms (données de santé : seulement si besoin)", envoyerTraiteur: "Envoyer le récapitulatif au traiteur",
  recapObjet: d => `Récapitulatif des repas · mariage${d ? ` du ${d}` : ""}`, copierRecap: "Copier", recapCopie: "Récapitulatif copié",
  parMoment: "Par moment", gererMoments: "Modifier les moments", presentsSur: (p, i) => `${p} / ${i}`,
  momentsT: "Les moments du mariage", momentsP: "Renommez, ajoutez ou retirez un moment. Retirer un moment ne touche pas aux réponses déjà notées.", ajouterMoment: "Ajouter un moment", nomMoment: "Nom du moment",
  suggestion: "Brunch du lendemain", retirerMoment: "Retirer", auMoins1: "Gardez au moins un moment.", momentsOk: "Moments enregistrés",
  parReponse: "Par réponse", rep: { oui: "Viennent", non: "Ne viennent pas", sans: "Sans réponse", partiel: "Réponse en partie", pasenvoye: "Faire-part pas envoyé" },
  planS2: (p, n, t) => `${p} placé${p > 1 ? "s" : ""} sur ${n} · ${t} table${t > 1 ? "s" : ""}`,
  reponseT: "Réponse", vient: "Vient", vientPas: "Ne vient pas", sansRep: "Sans réponse", toutVient: "Tout le foyer vient", personneVient: "Personne ne vient",
  repOk: (n, r) => `${n} : ${r}`, absentA: "Touchez un moment auquel cette personne ne vient pas.",
  // lot 5 : liste vide, coller une liste, un tableur
  videT: "Qui voulez-vous à vos côtés ?", videP: "Un ordre de grandeur suffit pour commencer : il guide le choix du lieu, du traiteur et le budget par invité.",
  combien: "Combien, environ ?", combienP: "Modifiable plus tard.", tailles: [[30, "30"], [60, "60"], [100, "100"], [150, "150+"]], cibleOk: n => `Cible : ${n} invités`,
  ajouterProches: "Ajouter vos proches", vCollerT: "Coller une liste", vCollerP: "Depuis vos notes ou un message : le coach reconnaît les couples et les familles.",
  vUnT: "Un par un", vUnP: "Un foyer à la fois : un couple, une famille, une personne seule.", vTabT: "Un tableur", vTabP: "Un fichier CSV ou Excel (.xlsx).",
  encart: (a, b) => `Chacun ajoute son côté depuis son téléphone (${a} et ${b}) ; les amis communs vont dans « Commun ».`,
  colT: "Coller une liste", colP: "Une personne, un couple ou une famille par ligne, comme vous l'écririez. Ex. « Paul et Léa Martin, et leur fils Tom (6 ans) ».",
  colTxt: "La liste", colPh: "Famille Martin : Paul, Léa et Tom (6 ans)\nAlejandra Ruiz +1\nMarc Petit", colCote: "Côté par défaut", colCercle: "Cercle par défaut (facultatif)",
  colFichier: "Importer un tableur (CSV ou Excel)", colLu: n => `${n} ligne${n > 1 ? "s" : ""} lue${n > 1 ? "s" : ""} : relisez, puis demandez les foyers`, colErrF: e => `Le fichier n'a pas pu être lu : ${e}`,
  colGo: "Proposer des foyers", colBusy: "Le coach lit la liste…", colErr: e => `La liste n'a pas pu être lue : ${e}`, colVide: "Collez au moins un nom.",
  colSans: "Ajouter une personne par ligne, sans regrouper", colPrive: "La liste est envoyée au coach (IA) seulement pour la lire ; rien n'est gardé de son côté.",
  propT: "Les foyers proposés", propP: "Décochez ce qui ne va pas, renommez si besoin. Rien n'est ajouté avant votre validation.", propRien: "Le coach n'a reconnu aucun nom dans cette liste.",
  dejaListe: "déjà sur la liste", enfantM: "enfant", ajouterN: (f, p) => `Ajouter ${f} foyer${f > 1 ? "s" : ""} · ${p} personne${p > 1 ? "s" : ""}`, ajoutes: (f, p) => `${f} foyer${f > 1 ? "s" : ""}, ${p} personne${p > 1 ? "s" : ""} ajoutés`, recommencer: "Recommencer",
  plusPersonne: "Plus personne à relancer pour l'instant.", messageCopie: "Message copié : collez-le dans votre message", enregistrer: "Enregistrer", sansAdresse: "sans adresse",
  envoiLien: "Marquer des faire-part envoyés", envoiT: "Faire-part envoyés", envoiP: "Cochez les foyers à qui le faire-part est parti. La page passe aux réponses dès le premier.",
  envoiBtn: n => `Marquer ${n} faire-part envoyé${n > 1 ? "s" : ""}`, envoiOk: n => `${n} faire-part marqué${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""}`, rienAEnvoyer: "Tous les faire-part sont marqués envoyés.",
  envoyer: "Pour les envoyer",
  purgeT: "Six mois après le mariage", purgeP: n => `Comme annoncé à vos invités, leurs adresses, e-mails, téléphones et régimes (${n} foyer${n > 1 ? "s" : ""}) peuvent maintenant être supprimés.`,
  purgeBtn: "Supprimer ces informations", purgeOk: "Adresses, contacts et régimes supprimés",
  lienT: "Le lien pour vos invités", lienP: "Ils saisissent eux-mêmes leur adresse, leur e-mail, leur téléphone et leurs régimes, sans compte.",
  demanderLien: "Demander par lien", partagerLien: "Partager le lien", revoquer: "Révoquer le lien", nouveauLien: "Nouveau lien",
  lienCree: (c, e) => `Lien créé le ${c} · valable jusqu'au ${e}`, reponseLe: d => `Réponse reçue le ${d}`, lienEnCours: "Création du lien…", lienPret: "Lien prêt : touchez « Partager le lien »",
  lienCopie: "Lien copié : collez-le dans votre message", lienRevoque: "Lien révoqué : il ne fonctionne plus", lienErreur: e => `Le lien n'a pas pu être créé : ${e}`,
  message: (f, url, c) => `Bonjour ${f} ! Pour vous envoyer notre faire-part, pourriez-vous nous indiquer votre adresse ici ? Cela prend une minute :\n${url}\n\n${c}`, adresse: "Adresse postale", tel: "Téléphone", email: "E-mail", nomFoyer: "Nom du foyer", nomFoyerPh: "Ex. Famille Rousselot",
  suivi: "Suivi", etapes: { liste: "Sur la liste", std: "Save-the-date", fairepart: "Faire-part", repondu: "Réponse" }, suiviP: "Touchez l'étape atteinte.",
  note: "Note", notePh: "Une précision, un lien de parenté…", retirer: "Retirer de la liste", retirerT: n => `Retirer ${n} de la liste ?`, retirerP: n => `${n} personne${n > 1 ? "s" : ""} et leurs informations. Vous pourrez annuler juste après.`,
  confirmer: "Retirer", annuler: "Annuler", retire: n => `${n} retiré de la liste`, enregistre: "Enregistré", etapeOk: e => `Suivi : ${e}`,
  // regroupement
  regT: "Regrouper en foyers", regP: "Proposés d'après les noms de famille, les « +1 » et les enfants. Décochez ce qui ne va pas, renommez si besoin.",
  appliquer: n => `Créer ${n} foyer${n > 1 ? "s" : ""}`, regOk: n => `${n} foyer${n > 1 ? "s" : ""} créé${n > 1 ? "s" : ""}`, rienARegrouper: "Rien à regrouper : chaque foyer est prêt.",
};
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export function makeInvites(ctx) {
  const { S, esc } = ctx;
  const coteNom = c => (c === "claire" ? ctx.P1() : c === "julien" ? ctx.P2() : UI.commun);
  const F = () => foyersDe(S.guests, S.foyers || []);
  const foyer = id => F().find(f => f.id === id);
  const ini = (g, c) => `<span class="iv-av s-${c || coteDe(g)} ${estPlusUn(g) ? "plus" : ""}" aria-hidden="true">${estPlusUn(g) ? "+1" : esc(ctx.initials(g.name))}</span>`;

  /* ---------- 3.1 Moment 1 ---------- */
  function head(fs) {
    const cible = +S.settings.invitesCible || 0, n = S.guests.length, c = compte(S.guests), p = points(S.guests, cible);
    const avecAdr = fs.filter(f => String(f.adresse || "").trim()).length;
    return `<section class="pr-head bu-head iv-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-act="ivnouveau" aria-label="${UI.nouveauT}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <div class="bu-k">${UI.surListe}</div>
      <div class="pr-count bu-count"><b class="num">${n}</b>${S.ui.ivCible ? `<label class="sr" for="iv-cible">${UI.cibleL}</label><input id="iv-cible" class="iv-cin num" inputmode="numeric" data-ivcible="1" value="${cible || ""}" placeholder="60">`
        : `<button class="bu-lim" data-act="ivcible" ${S.canWrite ? "" : "disabled"}>${cible ? esc(UI.visees(cible)) : UI.fixerCible}</button>`}</div>
      <div class="iv-pts ${p.pas > 1 ? "pas2" : ""}" role="img" aria-label="${esc(`${n} personnes sur la liste${cible ? `, cible ${cible}` : ""}`)}">${p.points.map(x => `<i class="${x.c}${x.trop ? " trop" : ""}"></i>`).join("")}</div>
      <div class="bu-leg"><span>${["claire", "julien", "commun"].map(k => `<span><i class="iv-d ${k}"></i>${esc(coteNom(k))} ${p.parCote[k]}</span>`).join("")}${p.libres ? `<span><i class="iv-d libre"></i>${UI.libres(p.libres)}</span>` : ""}</span>
        ${p.auDessus ? `<b class="bu-over">${UI.auDessus(p.auDessus)}</b>` : p.pas > 1 ? `<span>${UI.unPour2}</span>` : ""}</div>
      <div class="bu-cpts"><div><b class="num">${c.adultes} + ${c.enfants}</b><span>${UI.cpt.ae}</span></div><div><b class="num">${fs.length}</b><span>${UI.cpt.foyers}</span></div>
        <div><b class="num">${avecAdr} / ${fs.length}</b><span>${UI.cpt.adresses}</span></div></div>
    </section>`;
  }
  function action(fs) {
    const a = carteAction(fs, S.guests); if (!a || !S.canWrite) return "";
    const [t, p, b] = a.k === "regrouper" ? UI.action.regrouper(a.n, a.foyers) : a.k === "adresses" ? UI.action.adresses(a.n) : UI.action.prets();
    const btn = a.k === "regrouper" ? `data-act="ivview" data-v="regrouper"` : a.k === "adresses" ? `data-act="ivfoyer" data-id="${esc(a.premier)}"` : `data-act="ivstd"`;
    return `<section class="pr-card bu-arb"><span class="ev-tag">${a.k === "prets" ? "Prêts" : "À faire"}</span><b>${esc(t)}</b><p>${esc(p)}</p><button class="btn primary" ${btn}>${b}</button></section>`;
  }
  const ligneFoyer = f => { const c = compte(f.personnes);
    return `<button class="pr-row iv-fr" data-act="ivfoyer" data-id="${esc(f.id)}"><span class="iv-avs">${f.personnes.slice(0, 3).map(g => ini(g, f.side)).join("")}</span>
      <span class="pr-rb"><b>${esc(nomFoyer(f))}</b><span>${esc([momentDe(F()) === 2 ? UI.rep[statutFoyer(f)] : "", c.places > 1 ? UI.personnesN(c.places) : "", f.personnes.find(g => g.regime) ? f.personnes.filter(g => g.regime).map(g => g.regime).join(", ") : ""].filter(Boolean).join(" · "))}</span></span>${ctx.CHEV}</button>`; };
  function recherche(fs) {
    const q = ctx.fold(S.f.iq || ""); if (q.length < 2) return "";
    const res = fs.filter(f => ctx.fold([nomFoyer(f), f.cercle, ...f.personnes.map(g => g.name)].join(" ")).includes(q));
    return `<section class="pr-sec"><div class="pr-list">${res.length ? res.slice(0, 20).map(ligneFoyer).join("") : `<p class="ev-note">${UI.aucun}</p>`}</div></section>`;
  }
  function tuilesCercles(fs) {
    const cs = cercles(fs);
    return `<section class="pr-sec"><h3 class="home-h">${UI.parCercle}</h3><div class="iv-cercles">${cs.map(c => `<button class="iv-c" data-act="ivcercle" data-c="${esc(c.nom)}">
      <span class="iv-avs">${c.personnes.slice(0, 3).map(g => ini(g)).join("")}</span><b class="num">${c.personnes.length}</b><span>${esc(c.nom || UI.sansCercle)}</span></button>`).join("")}</div></section>`;
  }
  // Durée de conservation (validée le 22/11/2026) : 6 mois après le mariage, suppression proposée, sur confirmation du couple
  const aPurger = fs => { const d = ctx.wDate(); if (!d || S.settings.dateIndicative) return []; const lim = new Date(d); lim.setMonth(lim.getMonth() + 6);
    return ctx.today() >= lim ? fs.filter(f => f.adresse || f.tel || f.email || f.personnes.some(g => g.regime)) : []; };
  function cartePurge(fs) {
    const l = aPurger(fs); if (!l.length || !S.canWrite) return "";
    return `<section class="pr-card bu-arb"><span class="ev-tag">${UI.purgeT}</span><p>${esc(UI.purgeP(l.length))}</p><button class="btn primary" data-act="ivpurge">${UI.purgeBtn}</button></section>`;
  }
  async function purger() {
    const l = aPurger(F()), avant = [];
    for (const f of l) {
      if (!f.virtuel) { const d = S.foyers.find(x => x.id === f.id) || {}; avant.push(["foyers", f.id, { adresse: d.adresse || "", tel: d.tel || "", email: d.email || "" }]); await ctx.patch("foyers", f.id, { adresse: "", tel: "", email: "" }); }
      for (const g of f.personnes.filter(g => g.regime)) { avant.push(["guests", g.id, { regime: g.regime }]); await ctx.patch("guests", g.id, { regime: "" }); }
    }
    ctx.toastUndo(UI.purgeOk, async () => { for (const [c, id, d] of avant) await ctx.patch(c, id, d); });
  }
  function vMain() {
    const fs = F();
    if (!S.guests.length) return vVide();
    if (momentDe(fs) === 2) return vMain2(fs);
    return `<div class="pr bu iv">${head(fs)}${cartePurge(fs)}${action(fs)}
      <label class="sr" for="iv-q">${UI.rechercher}</label><input id="iv-q" class="iv-q" type="search" autocomplete="off" name="search_q" data-ivq="1" placeholder="${UI.rechercher}" value="${esc(S.f.iq || "")}">
      ${(S.f.iq || "").length >= 2 ? recherche(fs) : tuilesCercles(fs)}
      <button class="pr-row bu-pdf" data-go="tables">${SVG('<circle cx="12" cy="12" r="4"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>')}<span class="pr-rb"><b>${UI.planT}</b><span>${UI.planS}</span></span>${ctx.CHEV}</button>
      <div class="iv-bas">${S.canWrite ? `<button class="link" data-act="ivcoller">${UI.coller}</button>` : ""}${S.guests.length ? `<button class="link" data-act="csv">${UI.exporter}</button>` : ""}<button class="link" data-act="ivview" data-v="liste">${UI.liste}</button>
      ${S.canWrite && fs.length ? `<button class="link" data-act="ivview" data-v="envoi">${UI.envoiLien}</button>` : ""}</div></div>`;
  }

  /* ---------- 3.5 Liste vide ---------- */
  function vVide() {
    const cible = +S.settings.invitesCible || 0, ligneV = (act, t, p, ic) => `<button class="pr-row iv-vr" data-act="${act}" ${S.canWrite ? "" : "disabled"}>${SVG(ic)}<span class="pr-rb"><b>${t}</b><span>${p}</span></span>${ctx.CHEV}</button>`;
    return `<div class="pr bu iv iv-vide"><section class="pr-head bu-head iv-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2><span></span></div>
      <h3 class="iv-vt">${UI.videT}</h3><p class="iv-vp">${UI.videP}</p>
      <div class="bu-k">${UI.combien}</div>
      <div class="iv-tailles" role="group" aria-label="${UI.combien}">${UI.tailles.map(([n, l]) => `<button class="iv-taille ${cible === n ? "on" : ""}" data-act="ivtaille" data-n="${n}" aria-pressed="${cible === n}" ${S.canWrite ? "" : "disabled"}>${l}</button>`).join("")}</div>
      <p class="iv-vp">${UI.combienP}</p></section>
      <section class="pr-sec"><h3 class="home-h">${UI.ajouterProches}</h3><div class="pr-list">
        ${ligneV("ivcoller", UI.vCollerT, UI.vCollerP, '<path d="M9 4h6v3H9zM7 5H5v15h14V5h-2"/><path d="M8 11h8M8 15h5"/>')}
        ${ligneV("ivnouveau", UI.vUnT, UI.vUnP, '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>')}
        ${ligneV("ivtableur", UI.vTabT, UI.vTabP, '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>')}</div></section>
      <p class="ev-note iv-encart">${esc(UI.encart(ctx.P1(), ctx.P2()))}</p></div>`;
  }

  /* ---------- Coller une liste, un tableur : foyers proposés par le coach (3.5, 8) ---------- */
  function ouvrirColler(tableur = false) {
    const moi = ctx.moi(), cs = [...new Set([...ctx.groupes(), ...S.guests.map(g => g.group).filter(Boolean)])];
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.colT}"><h3>${UI.colT}</h3><p class="ev-note">${UI.colP}</p>
      <label class="pl-f"><span>${UI.colTxt}</span><textarea id="iv-col-txt" class="pl-note iv-coltxt" data-ivcoltxt="1" rows="8" autocomplete="off" placeholder="${esc(UI.colPh)}">${esc(S.ui.ivColTxt || "")}</textarea></label>
      <label class="btn sm iv-fic"><input type="file" id="iv-fic" data-ivfichier="1" accept=".csv,.txt,.tsv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">${UI.colFichier}</label>
      <p class="ev-note" id="iv-col-info" role="status"></p>
      <div class="pt-reg"><div class="pl-f"><span>${UI.colCote}</span><div class="seg" role="radiogroup" aria-label="${UI.colCote}">${["claire", "julien", "commun"].map(k => `<label class="iv-seg"><input type="radio" name="iv-col-cote" value="${k}" ${k === (S.ui.ivColCote || moi) ? "checked" : ""}><span>${esc(coteNom(k))}</span></label>`).join("")}</div></div>
        <label class="pl-f"><span>${UI.colCercle}</span><input id="iv-col-cercle" list="iv-cercles2" autocomplete="off" value="${esc(S.ui.ivColCercle || "")}"><datalist id="iv-cercles2">${cs.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label></div>
      <p class="ev-note">${UI.colPrive}</p>
      <p class="brief-err" id="iv-col-err" role="alert"></p>
      <div class="acts"><button type="button" class="link" data-act="ivbulk">${UI.colSans}</button><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="button" class="btn primary" data-act="ivcolgo" id="iv-col-go">${UI.colGo}</button></div></div></div></div>`);
    setTimeout(() => { if (tableur) { const f = document.getElementById("iv-fic"); if (f) f.click(); } else { const t = document.getElementById("iv-col-txt"); if (t) t.focus(); } }, 60);
  }
  async function lireFichier(input) {
    const f = input.files && input.files[0], info = document.getElementById("iv-col-info"), err = document.getElementById("iv-col-err"); if (!f) return;
    try {
      let rows;
      if (/\.xlsx$/i.test(f.name)) { const { lireXlsx } = await import("../agents/lib/xlsx.js"); rows = await lireXlsx(await f.arrayBuffer()); }
      else rows = lireCsv(await f.text());
      const txt = texteTableur(rows), n = txt ? txt.split("\n").length : 0;
      S.ui.ivColTxt = txt; const t = document.getElementById("iv-col-txt"); if (t) t.value = txt;
      if (info) info.textContent = UI.colLu(n); if (err) err.textContent = "";
    } catch (e) { if (err) err.textContent = UI.colErrF(e.message || "erreur"); }
    input.value = "";
  }
  async function proposer() {
    const t = document.getElementById("iv-col-txt"), err = document.getElementById("iv-col-err"), go = document.getElementById("iv-col-go");
    const texte = String((t && t.value) || "").trim(); if (!texte) { if (err) err.textContent = UI.colVide; return; }
    const cote = (document.querySelector('input[name="iv-col-cote"]:checked') || {}).value || "commun", cercle = String((document.getElementById("iv-col-cercle") || {}).value || "").trim();
    S.ui.ivColTxt = texte; S.ui.ivColCote = cote; S.ui.ivColCercle = cercle;
    if (go) { go.disabled = true; go.textContent = UI.colBusy; } if (err) err.textContent = "";
    try {
      const r = await ctx.runAgentNow("foyers", { texte });
      if (r && r.ok === false) throw new Error(r.erreur || "erreur");
      S.ui.ivProp = nettoyerFoyersProposes(r.foyers, { texte, existants: S.guests, side: cote, cercle });
      S.ui.ivPropSel = S.ui.ivProp.map((f, i) => (f.personnes.every(p => p.plusUn || p.dejaLa) ? -1 : i)).filter(i => i >= 0); S.ui.ivPropNoms = {};
      ctx.closeModal(); show("coller");
    } catch (e) { if (err) err.textContent = UI.colErr(e.message || "erreur"); if (go) { go.disabled = false; go.textContent = UI.colGo; } }
  }
  function vColler() {
    const l = S.ui.ivProp; if (!l) { S.f.iView = "main"; return vMain(); }
    const sel = S.ui.ivPropSel || [], noms = S.ui.ivPropNoms || {}, nP = sel.reduce((n, i) => n + (l[i] ? l[i].personnes.filter(p => !p.dejaLa).length : 0), 0);
    return `<div class="ev-page pl-tache iv-page bu-arbp"><button class="link env-back" data-act="ivview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.propT}</h2><p class="ev-note">${l.length ? UI.propP : UI.propRien}</p>
      ${l.map((x, i) => `<div class="pr-card bu-piste ${sel.includes(i) ? "on" : ""}"><input type="checkbox" data-ivpsel="${i}" ${sel.includes(i) ? "checked" : ""} aria-label="${esc(x.nom || nomFoyer({ personnes: x.personnes }))}">
        <span class="pr-rb"><label class="sr" for="iv-pn-${i}">${UI.nomFoyer}</label><input id="iv-pn-${i}" class="iv-nin" data-ivpnom="${i}" value="${esc(noms[i] ?? (x.nom || nomFoyer({ personnes: x.personnes })))}">
          <span class="iv-membres">${x.personnes.map(p => `<span class="chip ${p.dejaLa ? "warn" : ""}">${esc(p.name)}${p.enfant ? ` · ${UI.enfantM}` : ""}${p.dejaLa ? ` · ${UI.dejaListe}` : ""}</span>`).join("")}</span>
          <span class="iv-pcote"><label class="sr" for="iv-pc-${i}">${UI.cote}</label><select id="iv-pc-${i}" data-ivpcote="${i}">${["claire", "julien", "commun"].map(k => `<option value="${k}" ${x.side === k ? "selected" : ""}>${esc(coteNom(k))}</option>`).join("")}</select>${x.cercle ? ` · ${esc(x.cercle)}` : ""}</span></span></div>`).join("")}
      <button class="link" data-act="ivcoller">${UI.recommencer}</button>
      ${l.length && S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><b class="num">${nP}</b><span>${UI.personnesN(nP).replace(/^\d+ /, "")}</span></div><button class="btn primary" data-act="ivpajout" ${sel.length && nP ? "" : "disabled"}>${UI.ajouterN(sel.length, nP)}</button></div>` : ""}</div>`;
  }
  async function ajouterProposes() {
    const l = S.ui.ivProp || [], sel = (S.ui.ivPropSel || []).filter(i => l[i]), noms = S.ui.ivPropNoms || {}, fids = [], gids = [];
    for (const i of sel) {
      const x = l[i], pers = x.personnes.filter(p => !p.dejaLa); if (!pers.some(p => !p.plusUn)) continue;
      const nom = String(noms[i] ?? "").trim(), auto = x.nom || nomFoyer({ personnes: x.personnes });
      const fid = await ctx.addDoc("foyers", { nom: nom && nom !== auto ? nom.slice(0, 120) : x.nom || "", side: x.side, cercle: x.cercle, etape: "liste" }); if (!fid) break; fids.push(fid);
      for (const p of pers) { const id = await ctx.addDoc("guests", { name: p.name, ...(p.plusUn ? { plusUn: true } : {}), enfant: !!p.enfant, foyerId: fid, side: x.side, group: x.cercle, rsvp: "attente", ceremonie: true, vin: true, diner: true, regime: "", table: "", note: "" }); if (id) gids.push(id); }
    }
    S.ui.ivProp = null; S.ui.ivColTxt = ""; S.f.iView = "main"; ctx.saveF(); ctx.render(); window.scrollTo(0, 0);
    ctx.toastUndo(UI.ajoutes(fids.length, gids.length), async () => { for (const id of gids) await ctx.remove("guests", id); for (const id of fids) await ctx.remove("foyers", id); });
  }

  /* ---------- 3.3 Moment 2 : les réponses arrivent ---------- */
  const dCourt = iso => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");
  const MOM = () => momentsDe(S.settings);
  function head2(fs) {
    const r = reponses(fs), lim = dateLimite(S.settings), tous = fs.flatMap(f => f.personnes.map(g => [g, f]));
    const dinerK = MOM().some(m => m.k === "diner") ? "diner" : MOM()[MOM().length - 1].k;
    const auDiner = S.guests.filter(g => vientA(g, dinerK)).length, enfants = S.guests.filter(g => g.rsvp === "oui" && g.enfant).length;
    const ordre = { oui: 0, non: 1, sans: 2, pasEnvoye: 3 }, cl = ([g, f]) => (g.rsvp === "oui" ? "oui" : g.rsvp === "non" ? "non" : envoye(f) ? "sans" : "pasEnvoye");
    const pts = tous.map(cl).sort((a, b) => ordre[a] - ordre[b]), pas = pts.length > 150 ? 2 : 1, vus = pts.filter((_, i) => i % pas === 0);
    return `<section class="pr-head bu-head iv-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-act="ivnouveau" aria-label="${UI.nouveauT}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <div class="bu-k">${UI.viennent}</div>
      <div class="pr-count bu-count"><b class="num">${r.oui}</b><span class="iv-sur">${esc(UI.surInvites(r.total))}</span></div>
      <div class="iv-pts ${pas > 1 ? "pas2" : ""}" role="img" aria-label="${esc(`${r.oui} viennent, ${r.non} ne viennent pas, ${r.sans} sans réponse`)}">${vus.map(c => `<i class="r-${c}"></i>`).join("")}</div>
      <div class="bu-leg"><span>${["oui", "non", "sans", "pasEnvoye"].filter(k => k !== "pasEnvoye" || r.pasEnvoye).map(k => `<span><i class="iv-d r-${k}"></i>${r[k]} ${UI.leg[k]}</span>`).join("")}</span>${pas > 1 ? `<span>${UI.unPour2}</span>` : ""}</div>
      <div class="bu-cpts"><div><b class="num">${auDiner}</b><span>${UI.cpt2.diner}</span></div><div><b class="num">${enfants}</b><span>${UI.cpt2.enfants(enfants)}</span></div>
        <div>${S.ui.ivLimite ? `<label class="sr" for="iv-lim">${UI.limiteL}</label><input id="iv-lim" type="date" class="iv-lim" data-ivlimite="1" value="${esc(lim ? lim.date : "")}">`
          : `<button class="iv-limb" data-act="ivlimite" ${S.canWrite ? "" : "disabled"} aria-label="${esc(UI.limiteL)}"><b class="num">${lim ? esc(dCourt(lim.date)) : UI.fixerLimite}</b></button>`}<span>${UI.cpt2.limite}${lim && lim.proposee ? ` · ${UI.limiteP}` : ""}</span></div></div>
    </section>`;
  }
  function carteRelance(fs) {
    const lim = dateLimite(S.settings), l = aRelancer(fs, { limite: lim && lim.date, today: ctx.today() });
    if (!l.length || !S.canWrite) return "";
    return `<section class="pr-card bu-arb iv-rel"><span class="ev-tag">${UI.relT(l.length)}</span><p>${esc(UI.relP(lim && dCourt(lim.date)))}</p>
      <div class="iv-membres">${l.slice(0, 8).map(f => `<span class="chip">${esc(nomFoyer(f))}</span>`).join("")}${l.length > 8 ? `<span class="chip">+${l.length - 8}</span>` : ""}</div>
      ${S.ui.ivRelErr ? `<p class="brief-err" role="alert">${esc(UI.relErr(S.ui.ivRelErr))}</p>` : ""}
      <button class="btn primary" data-act="ivrelance" ${S.ui.ivRelBusy ? "disabled" : ""}>${S.ui.ivRelBusy ? UI.relPrep : UI.relBtn}</button></section>`;
  }
  function carteTraiteur() {
    const k = MOM().some(m => m.k === "diner") ? "diner" : MOM()[MOM().length - 1].k, r = recapTraiteur(S.guests, k);
    return `<section class="pr-card iv-trait"><h3 class="home-h">${UI.traiteurT}</h3><p class="ev-note">${UI.traiteurP}</p>
      <div class="bu-cpts iv-tc"><div><b class="num">${r.adultes}</b><span>${UI.adultes(r.adultes)}</span></div><div><b class="num">${r.enfants}</b><span>${UI.enfants(r.enfants)}</span></div><div><b class="num">${r.avecRegime}</b><span>${UI.regimes(r.avecRegime)}</span></div></div>
      ${r.regimes.length ? `<ul class="iv-reg">${r.regimes.map(x => `<li><span>${esc(x.label)}</span><b class="num">${x.n}</b></li>`).join("")}</ul>` : `<p class="ev-note">${UI.aucunRegime}</p>`}
      ${r.places ? `<label class="bu-ck"><input type="checkbox" data-ivnoms="1" ${S.ui.ivNomsTr ? "checked" : ""}> ${UI.avecNoms}</label>
      <div class="pl-acts"><button class="btn" data-act="ivtraiteur">${UI.envoyerTraiteur}</button><button class="link" data-act="ivtraiteurcopie">${UI.copierRecap}</button></div>` : ""}</section>`;
  }
  function recapMail() {
    const k = MOM().some(m => m.k === "diner") ? "diner" : MOM()[MOM().length - 1].k, m = MOM().find(x => x.k === k);
    const d = ctx.wDate(), date = d && !S.settings.dateIndicative ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
    return { objet: UI.recapObjet(date), corps: texteTraiteur(recapTraiteur(S.guests, k), { couple: ctx.couple(), date, moment: m ? m.nom : "Dîner", noms: !!S.ui.ivNomsTr }) };
  }
  function blocMoments() {
    const l = parMoment(S.guests, MOM()), max = Math.max(1, ...l.map(x => x.invites));
    return `<section class="pr-sec"><h3 class="home-h">${UI.parMoment}</h3><div class="pr-box iv-pm">${l.map(x => `<div class="iv-pmr"><span>${esc(x.nom)}</span>
      <span class="iv-bar" aria-hidden="true"><i style="width:${Math.round(100 * x.presents / max)}%"></i><i class="inv" style="width:${Math.round(100 * (x.invites - x.presents) / max)}%"></i></span><b class="num">${UI.presentsSur(x.presents, x.invites)}</b></div>`).join("")}</div>
      ${S.canWrite ? `<button class="link" data-act="ivmoments">${UI.gererMoments}</button>` : ""}</section>`;
  }
  function tuilesReponses(fs) {
    const par = { oui: [], partiel: [], sans: [], non: [], pasenvoye: [] }; for (const f of fs) par[statutFoyer(f)].push(f);
    return `<section class="pr-sec"><h3 class="home-h">${UI.parReponse}</h3><div class="iv-cercles">${Object.entries(par).filter(([, l]) => l.length).map(([k, l]) => `<button class="iv-c" data-act="ivrep" data-r="${k}">
      <span class="iv-avs">${l.flatMap(f => f.personnes).slice(0, 3).map(g => ini(g)).join("")}</span><b class="num">${l.reduce((n, f) => n + f.personnes.length, 0)}</b><span>${esc(UI.rep[k])} · ${esc(UI.foyersN(l.length))}</span></button>`).join("")}</div></section>`;
  }
  function cartePlan() {
    const dinerK = MOM().some(m => m.k === "diner") ? "diner" : MOM()[MOM().length - 1].k, l = S.guests.filter(g => vientA(g, dinerK));
    const places = l.filter(g => String(g.table || "").trim()), tables = new Set(places.map(g => String(g.table).trim())).size;
    return `<button class="pr-row bu-pdf" data-go="tables">${SVG('<circle cx="12" cy="12" r="4"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>')}<span class="pr-rb"><b>${UI.planT}</b><span>${esc(UI.planS2(places.length, l.length, tables))}</span></span>${ctx.CHEV}</button>`;
  }
  function vMain2(fs) {
    return `<div class="pr bu iv">${head2(fs)}${cartePurge(fs)}${carteRelance(fs)}${carteTraiteur()}${blocMoments()}
      <label class="sr" for="iv-q">${UI.rechercher}</label><input id="iv-q" class="iv-q" type="search" autocomplete="off" name="search_q" data-ivq="1" placeholder="${UI.rechercher}" value="${esc(S.f.iq || "")}">
      ${(S.f.iq || "").length >= 2 ? recherche(fs) : tuilesReponses(fs) + tuilesCercles(fs)}
      ${cartePlan()}
      <div class="iv-bas">${S.canWrite ? `<button class="link" data-act="ivcoller">${UI.coller}</button>` : ""}${S.guests.length ? `<button class="link" data-act="csv">${UI.exporter}</button>` : ""}<button class="link" data-act="ivview" data-v="liste">${UI.liste}</button>
      ${S.canWrite && fs.some(f => !envoye(f)) ? `<button class="link" data-act="ivview" data-v="envoi">${UI.envoiLien}</button>` : ""}</div></div>`;
  }
  function vReponses(k) {
    const l = F().filter(f => statutFoyer(f) === k); if (!l.length) { S.f.iView = "main"; return vMain(); }
    return `<div class="ev-page pl-tache iv-page"><button class="link env-back" data-act="ivview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${esc(UI.rep[k] || "")}</h2><p class="ev-note">${esc(`${UI.foyersN(l.length)} · ${UI.personnesN(l.reduce((n, f) => n + f.personnes.length, 0))}`)}</p>
      <div class="pr-list">${l.sort((a, b) => nomFoyer(a).localeCompare(nomFoyer(b))).map(ligneFoyer).join("")}</div></div>`;
  }

  /* ---------- La réponse d'un foyer (page du foyer) ---------- */
  function blocReponse(f) {
    if (!envoye(f) && !f.personnes.some(repondu)) return "";
    const dis = S.canWrite ? "" : "disabled", ms = MOM();
    return `<section class="pr-sec iv-repsec"><h3 class="home-h">${UI.reponseT}</h3><div class="pr-box">${f.personnes.map(g => {
      const r = g.rsvp === "oui" || g.rsvp === "non" ? g.rsvp : "attente", invites = ms.filter(m => inviteA(g, m.k));
      return `<div class="iv-rp"><span class="iv-rpn">${ini(g, f.side)}<b>${esc(estPlusUn(g) && !String(g.name || "").replace(/^\s*\+\s*1\s*/, "").trim() ? UI.plusUn : g.name)}</b></span>
        <div class="seg iv-rseg" role="group" aria-label="${esc(`${UI.reponseT} : ${g.name}`)}">${[["oui", UI.vient], ["non", UI.vientPas], ["attente", UI.sansRep]].map(([v, l]) => `<button class="${r === v ? "on" : ""}" data-act="ivrsvp" data-id="${g.id}" data-v="${v}" aria-pressed="${r === v}" ${dis}>${l}</button>`).join("")}</div>
        ${r === "oui" && invites.length > 1 ? `<div class="iv-moments iv-abs">${invites.map(m => { const on = !(g.absentA && g.absentA[m.k]); return `<button class="chip ${on ? "acc" : ""}" data-act="ivabsent" data-id="${g.id}" data-k="${esc(m.k)}" aria-pressed="${on}" ${dis}>${esc(m.nom)}</button>`; }).join("")}</div>` : ""}</div>`; }).join("")}</div>
      ${S.canWrite && f.personnes.length > 1 ? `<div class="pl-acts"><button class="btn sm" data-act="ivtous" data-id="${esc(f.id)}" data-v="oui">${UI.toutVient}</button><button class="btn sm" data-act="ivtous" data-id="${esc(f.id)}" data-v="non">${UI.personneVient}</button></div>` : ""}
      ${f.relanceLe ? `<p class="ev-note">${esc(`${UI.relFait} le ${dLong(f.relanceLe)}`)}</p>` : ""}</section>`;
  }
  // l'étape du foyer suit les réponses (tous ont répondu → « Réponse ») ; appelée aussi par l'ancienne liste et les propositions de l'agent mail
  async function apresReponse(gid, rsvp) {
    const g = S.guests.find(x => x.id === gid); if (!g) return;
    const f = F().find(x => x.personnes.some(y => y.id === gid)); if (!f) return;
    const pers = f.personnes.map(y => (y.id === gid ? { ...y, rsvp } : y)), et = etapeApresReponse(f, pers);
    if (et === f.etape) return;
    const fid = await foyerReel(f.id); if (!fid) return;
    await ctx.patch("foyers", fid, { etape: et, etapeLe: Date.now(), ...(et === "repondu" ? { reponduLe: Date.now() } : {}) });
  }
  async function setRsvp(gids, v) {
    const avant = gids.map(id => { const g = S.guests.find(x => x.id === id); return g && [id, g.rsvp || "attente"]; }).filter(Boolean);
    const f = F().find(x => x.personnes.some(y => y.id === gids[0])), etAvant = f && f.etape, fidAvant = f && !f.virtuel ? f.id : null;
    for (const [id] of avant) await ctx.patch("guests", id, { rsvp: v });
    if (f) { const pers = f.personnes.map(y => (gids.includes(y.id) ? { ...y, rsvp: v } : y)), et = etapeApresReponse(f, pers);
      if (et !== f.etape) { const fid = await foyerReel(f.id); if (fid) await ctx.patch("foyers", fid, { etape: et, etapeLe: Date.now(), ...(et === "repondu" ? { reponduLe: Date.now() } : {}) }); } }
    const lab = v === "oui" ? UI.vient : v === "non" ? UI.vientPas : UI.sansRep;
    ctx.toastUndo(UI.repOk(gids.length === 1 ? (S.guests.find(x => x.id === gids[0]) || {}).name || UI.plusUn : nomFoyer(f || { personnes: [] }), lab), async () => {
      for (const [id, r] of avant) await ctx.patch("guests", id, { rsvp: r });
      const fid = fidAvant || (f && (S.guests.find(x => x.id === gids[0]) || {}).foyerId); if (fid && etAvant) await ctx.patch("foyers", fid, { etape: etAvant });
    });
  }

  /* ---------- Relancer (3.3.2) : un message du coach, partagé foyer par foyer ---------- */
  async function relancer(autre = false) {
    const lim = dateLimite(S.settings), emp = [ctx.P1(), ctx.P2(), lim && lim.date, S.settings.date].join("|");
    if (!autre && S.relance && S.relance.corps && S.relance.empreinte === emp) { ouvrirRelance(); return; }
    S.ui.ivRelBusy = true; S.ui.ivRelErr = null; ctx.render();
    try { const r = await ctx.runAgentNow("relance", autre ? { autre: true } : {}); if (r && r.ok === false) S.ui.ivRelErr = r.erreur || "erreur"; else if (r && r.relance) { S.relance = r.relance; S.ui.ivRelTxt = null; } }
    catch (e) { S.ui.ivRelErr = e.message || "erreur"; }
    S.ui.ivRelBusy = false; ctx.render(); if (!S.ui.ivRelErr) ouvrirRelance();
  }
  function modeleRelance() { const lim = dateLimite(S.settings); return S.ui.ivRelTxt ?? (S.relance && S.relance.corps) ?? messageRelance("", "{foyer}", { couple: ctx.couple(), limite: lim ? dCourt(lim.date) : "" }); }
  function listeRelance() {
    const lim = dateLimite(S.settings), l = aRelancer(F(), { limite: lim && lim.date, today: ctx.today() });
    return l.length ? l.map(f => `<div class="iv-p iv-relr">${ini(f.personnes[0], f.side)}<span class="pr-rb"><b>${esc(nomFoyer(f))}</b><span>${esc([f.tel, f.email].filter(Boolean).join(" · "))}</span></span>
      <button class="btn sm primary" data-act="ivrelenvoi" data-id="${esc(f.id)}">${UI.relEnvoyer}</button><button class="link" data-act="ivrelfait" data-id="${esc(f.id)}">${UI.relMarquer}</button></div>`).join("") : `<p class="ev-note">${UI.plusPersonne}</p>`;
  }
  function ouvrirRelance() {
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.relSheetT}"><h3>${UI.relSheetT}</h3><p class="ev-note">${UI.relSheetP}</p>
      <label class="pl-f"><span>${UI.relMsg}</span><textarea class="pl-note iv-reltxt" data-ivreltxt="1" rows="6">${esc(modeleRelance())}</textarea></label>
      <button class="link" data-act="ivrelautre">${UI.relAutre}</button>
      <div id="iv-rel-list" class="pr-box iv-pickl">${listeRelance()}</div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.fermer}</button></div></div></div></div>`);
  }
  const majRelance = () => { const l = document.getElementById("iv-rel-list"); if (l) l.innerHTML = listeRelance(); };
  async function noterRelance(id) {
    const fid = await foyerReel(id); if (!fid) return; const avant = (S.foyers.find(x => x.id === fid) || {}).relanceLe ?? null, f = foyer(fid);
    if (await ctx.patch("foyers", fid, { relanceLe: Date.now() })) { ctx.toastUndo(UI.relNote(f ? nomFoyer(f) : ""), () => ctx.patch("foyers", fid, { relanceLe: avant })); setTimeout(majRelance, 300); }
  }
  async function envoyerRelance(id) {
    const f = foyer(id); if (!f) return; const texte = messageRelance(modeleRelance(), nomFoyer(f));
    try { if (navigator.share) { await navigator.share({ text: texte }); await noterRelance(id); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(texte); ctx.toast(UI.messageCopie); await noterRelance(id); } catch (e) { window.prompt(UI.relMsg, texte); }
  }

  /* ---------- Récapitulatif traiteur : brouillon dans l'app mail, jamais d'envoi ---------- */
  function mailTraiteur() {
    const { objet, corps } = recapMail(), v = ctx.traiteur(), to = v && v.email ? v.email : "";
    location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
  }
  async function copierTraiteur() { const { corps } = recapMail(); try { await navigator.clipboard.writeText(corps); ctx.toast(UI.recapCopie); } catch (e) { window.prompt(UI.copierRecap, corps); } }

  /* ---------- Les moments du mariage (5.3) ---------- */
  function ouvrirMoments() {
    S.ui.ivMoms = MOM().map(m => ({ ...m }));
    rendreMoments();
  }
  function rendreMoments() {
    const l = S.ui.ivMoms || [];
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.momentsT}"><h3>${UI.momentsT}</h3><p class="ev-note">${UI.momentsP}</p>
      <div class="iv-nls">${l.map((m, i) => `<div class="iv-nl"><label class="sr" for="iv-m-${i}">${UI.nomMoment}</label><input id="iv-m-${i}" data-ivmnom="${i}" value="${esc(m.nom)}" maxlength="40">
        <button type="button" class="link" data-act="ivmretirer" data-i="${i}" ${l.length < 2 ? "disabled" : ""}>${UI.retirerMoment}</button></div>`).join("")}</div>
      <div class="iv-nl"><label class="sr" for="iv-m-new">${UI.ajouterMoment}</label><input id="iv-m-new" placeholder="${esc(UI.suggestion)}" maxlength="40"><button type="button" class="btn sm" data-act="ivmajout">${UI.ajouterMoment}</button></div>
      <p class="brief-err" id="iv-m-err" role="alert"></p>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="button" class="btn primary" data-act="ivmok">${UI.enregistrer}</button></div></div></div></div>`);
  }
  const slug = t => "m_" + ctx.fold(t).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
  async function enregistrerMoments() {
    const l = (S.ui.ivMoms || []).map(m => ({ k: m.k, nom: String(m.nom || "").trim().slice(0, 40) })).filter(m => m.nom);
    if (!l.length) { const e = document.getElementById("iv-m-err"); if (e) e.textContent = UI.auMoins1; return; }
    const avant = Array.isArray(S.settings.moments) ? S.settings.moments : null;
    ctx.closeModal(); S.ui.ivMoms = null;
    await ctx.setSettings({ moments: l });
    ctx.toastUndo(UI.momentsOk, () => ctx.setSettings({ moments: avant }));
  }

  /* ---------- Faire-part marqués envoyés ---------- */
  function vEnvoi() {
    const l = F().filter(f => !envoye(f)), sel = S.ui.ivEnv || l.map(f => f.id);
    return `<div class="ev-page pl-tache iv-page bu-arbp"><button class="link env-back" data-act="ivview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.envoiT}</h2><p class="ev-note">${UI.envoiP}</p>
      ${l.length ? `<div class="pr-box">${l.sort((a, b) => nomFoyer(a).localeCompare(nomFoyer(b))).map(f => `<label class="iv-p iv-envr"><input type="checkbox" data-ivenv="${esc(f.id)}" ${sel.includes(f.id) ? "checked" : ""}>${ini(f.personnes[0], f.side)}
        <span class="pr-rb"><b>${esc(nomFoyer(f))}</b><span>${esc([UI.personnesN(f.personnes.length), String(f.adresse || "").trim() ? "" : UI.sansAdresse].filter(Boolean).join(" · "))}</span></span></label>`).join("")}</div>`
        : `<p class="ev-note">${UI.rienAEnvoyer}</p>`}
      ${l.length && S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><b class="num">${sel.length}</b><span>${UI.foyersN(sel.length)}</span></div><button class="btn primary" data-act="ivenvoyer" ${sel.length ? "" : "disabled"}>${UI.envoiBtn(sel.length)}</button></div>` : ""}</div>`;
  }
  async function marquerEnvoyes() {
    const l = F().filter(f => !envoye(f)), sel = new Set(S.ui.ivEnv || l.map(f => f.id)), faits = [];
    for (const f of l.filter(x => sel.has(x.id))) { const fid = await foyerReel(f.id); if (!fid) continue;
      const avant = (S.foyers.find(x => x.id === fid) || {}).etape || "liste";
      if (await ctx.patch("foyers", fid, { etape: "fairepart", etapeLe: Date.now(), fairepartLe: Date.now() })) faits.push([fid, avant]); }
    S.ui.ivEnv = null; S.f.iView = "main"; ctx.saveF(); ctx.render(); window.scrollTo(0, 0);
    ctx.toastUndo(UI.envoiOk(faits.length), async () => { for (const [fid, e] of faits) await ctx.patch("foyers", fid, { etape: e }); });
  }

  /* ---------- Un cercle ---------- */
  function vCercle(nom) {
    const c = cercles(F()).find(x => x.nom === nom); if (!c) { S.f.iView = "main"; return vMain(); }
    return `<div class="ev-page pl-tache iv-page"><button class="link env-back" data-act="ivview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${esc(c.nom || UI.sansCercle)}</h2><p class="ev-note">${esc(`${UI.foyersN(c.foyers.length)} · ${UI.personnesN(c.personnes.length)}`)}</p>
      <div class="pr-list">${c.foyers.slice().sort((a, b) => nomFoyer(a).localeCompare(nomFoyer(b))).map(ligneFoyer).join("")}</div></div>`;
  }

  /* ---------- 3.2 Un foyer ---------- */
  function vFoyer(id) {
    const f = foyer(id); if (!f) { S.f.iView = S.f.iCercle != null ? "cercle" : "main"; return S.f.iView === "cercle" ? vCercle(S.f.iCercle) : vMain(); }
    const c = compte(f.personnes), dis = S.canWrite ? "" : "disabled", et = SUIVI.indexOf(f.etape);
    const momentOn = k => f.personnes.every(g => inviteA(g, k));
    return `<div class="ev-page pl-tache iv-page"><button class="link env-back" data-act="ivback">${ctx.BACK_SVG}<span>${esc(S.f.iCercle != null && S.f.iFrom === "cercle" ? (S.f.iCercle || UI.sansCercle) : UI.titre)}</span></button>
      <span class="pl-etat iv-cote s-${f.side}">${esc([coteNom(f.side), f.cercle].filter(Boolean).join(" · "))}</span>
      <h2 class="iv-nom">${esc(nomFoyer(f))}</h2><p class="ev-note">${esc(UI.unFoyer(c.adultes, c.enfants))}</p>
      <section class="pr-sec"><h3 class="home-h">${UI.personnes}</h3><div class="pr-box">${f.personnes.map(g => `<button class="iv-p ${estPlusUn(g) ? "plus" : ""}" data-edit="guests" data-id="${g.id}">${ini(g, f.side)}
          <span class="pr-rb"><b>${estPlusUn(g) && !String(g.name || "").replace(/^\s*\+\s*1\s*/, "").trim() ? UI.plusUn : esc(g.name)}</b><span>${esc([estPlusUn(g) ? UI.prenomADemander : g.enfant ? UI.enfant : UI.adulte, g.regime].filter(Boolean).join(" · "))}</span></span>${ctx.CHEV}</button>`).join("")}</div>
        ${S.canWrite ? `<div class="pl-acts"><button class="btn sm" data-act="ivajout" data-id="${esc(f.id)}">${UI.ajouterPersonne}</button><button class="btn sm" data-act="ivplus1" data-id="${esc(f.id)}">${UI.ajouterPlus1}</button><button class="btn sm" data-act="ivchoisir" data-id="${esc(f.id)}">${UI.deLaListe}</button></div>` : ""}</section>
      <section class="pr-sec"><h3 class="home-h">${UI.invitesA}</h3><div class="iv-moments">${momentsDe(S.settings).map(({ k, nom: l }) => `<button class="chip ${momentOn(k) ? "acc" : ""}" data-act="ivmoment" data-id="${esc(f.id)}" data-k="${esc(k)}" aria-pressed="${momentOn(k)}" ${dis}>${esc(l)}</button>`).join("")}</div></section>
      ${blocReponse(f)}
      <section class="pr-card pl-champs"><h3 class="home-h">${UI.envoyer}</h3>
        <label class="pl-f"><span>${UI.nomFoyer}</span><input data-ivf="nom" data-id="${esc(f.id)}" value="${esc(f.nom || "")}" placeholder="${esc(nomFoyer({ ...f, nom: "" }))}" ${dis}></label>
        <label class="pl-f"><span>${UI.adresse}</span><textarea class="pl-note iv-adr" data-ivf="adresse" data-id="${esc(f.id)}" autocomplete="off" ${dis}>${esc(f.adresse || "")}</textarea></label>
        <div class="pl-f2"><label class="pl-f"><span>${UI.tel}</span><input data-ivf="tel" data-id="${esc(f.id)}" inputmode="tel" value="${esc(f.tel || "")}" ${dis}></label>
          <label class="pl-f"><span>${UI.email}</span><input data-ivf="email" data-id="${esc(f.id)}" inputmode="email" value="${esc(f.email || "")}" ${dis}></label></div></section>
      ${blocLien(f)}
      <section class="pr-sec"><h3 class="home-h">${UI.suivi}</h3><ol class="iv-suivi">${SUIVI.map((k, i) => `<li class="${i < et ? "past" : i === et ? "now" : ""}"><button data-act="ivetape" data-id="${esc(f.id)}" data-k="${k}" ${dis} aria-current="${i === et ? "step" : "false"}"><i></i><span>${UI.etapes[k]}</span></button></li>`).join("")}</ol>
        ${S.canWrite ? `<p class="ev-note">${UI.suiviP}</p>` : ""}</section>
      <section class="pr-sec"><h3 class="home-h">${UI.note}</h3><label class="sr" for="iv-note">${UI.note}</label><textarea id="iv-note" class="pl-note" data-ivf="note" data-id="${esc(f.id)}" placeholder="${UI.notePh}" ${dis}>${esc(f.note || "")}</textarea></section>
      ${S.canWrite ? `<button class="link iv-retirer" data-act="ivretirer" data-id="${esc(f.id)}">${UI.retirer}</button>` : ""}</div>`;
  }
  /* ---------- Le lien pour les adresses (section 4, lot 2) ---------- */
  const dLong = ms => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const urlLien = tok => `${location.origin}/adresse#t=${tok}`;
  function blocLien(f) {
    if (!S.canWrite) return "";
    const l = f.lien, actif = l && l.token && +l.expire > Date.now(), occupe = S.ui.ivLien === f.id;
    return `<section class="pr-card iv-lien"><h3 class="home-h">${UI.lienT}</h3>
      ${actif ? `<p class="ev-note">${esc(UI.lienCree(dLong(l.creeLe), dLong(l.expire)))}</p>${f.lienReponseLe ? `<span class="pl-etat ok">${esc(UI.reponseLe(dLong(f.lienReponseLe)))}</span>` : ""}
        <div class="pl-acts"><button class="btn primary" data-act="ivpartager" data-id="${esc(f.id)}">${UI.partagerLien}</button><button class="link" data-act="ivrevoquer" data-id="${esc(f.id)}">${UI.revoquer}</button></div>`
      : `<p class="ev-note">${UI.lienP}</p><button class="btn ${String(f.adresse || "").trim() ? "" : "primary"}" data-act="ivlien" data-id="${esc(f.id)}" ${occupe ? "disabled" : ""}>${occupe ? UI.lienEnCours : l && l.token ? UI.nouveauLien : UI.demanderLien}</button>`}</section>`;
  }
  async function partager(f, tok) {
    const url = urlLien(tok), texte = UI.message(nomFoyer(f), url, ctx.couple());
    try { if (navigator.share) { await navigator.share({ title: UI.lienT, text: texte }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(texte); ctx.toast(UI.lienCopie); } catch (e) { window.prompt(UI.lienCopie, url); }
  }
  async function creerLien(id) {
    if (S.ui.ivLien) return;
    const fid = await foyerReel(id); if (!fid) return;
    S.ui.ivLien = fid; ctx.render();
    // pas de partage automatique : sur iPhone, la feuille de partage doit s'ouvrir juste après un toucher (« Partager le lien » apparaît)
    try { await ctx.lienFoyer(fid, "creer"); S.ui.ivLien = null; ctx.render(); ctx.toast(UI.lienPret); }
    catch (e) { S.ui.ivLien = null; ctx.render(); ctx.toast(UI.lienErreur(e.message || "erreur")); }
  }

  // un foyer virtuel (personne seule) devient un vrai foyer à la première information propre au foyer
  async function foyerReel(id) {
    const f = foyer(id); if (!f) return null; if (!f.virtuel) return f.id;
    const g = f.personnes[0], nid = await ctx.addDoc("foyers", { nom: "", side: coteDe(g), cercle: g.group || "", etape: "liste" });
    if (!nid) return null;
    await ctx.patch("guests", g.id, { foyerId: nid }); if (S.f.iFoyer === id) { S.f.iFoyer = nid; ctx.saveF(); }
    return nid;
  }
  async function champFoyer(id, k, v) {
    const fid = await foyerReel(id); if (!fid) return;
    const avant = (S.foyers.find(x => x.id === fid) || {})[k] ?? "";
    if (String(avant) === String(v)) return;
    if (await ctx.patch("foyers", fid, { [k]: String(v).slice(0, k === "adresse" || k === "note" ? 600 : 120), updatedAt: Date.now() })) ctx.toast(UI.enregistre);
  }
  function confirmerRetrait(id) {
    const f = foyer(id); if (!f) return;
    ctx.layer(`<div class="ov" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(UI.retirerT(nomFoyer(f)))}"><h3>${esc(UI.retirerT(nomFoyer(f)))}</h3><p>${esc(UI.retirerP(f.personnes.length))}</p>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="button" class="btn primary" data-act="ivretirerok" data-id="${esc(id)}">${UI.confirmer}</button></div></div></div></div>`);
  }
  async function retirer(id) {
    const f = foyer(id); if (!f) return; ctx.closeModal();
    const docs = f.personnes.map(g => { const { id: gid, ...d } = g; return [`guests/${gid}`, d, gid]; }), fdoc = !f.virtuel && S.foyers.find(x => x.id === f.id);
    for (const [, , gid] of docs) await ctx.remove("guests", gid);
    if (fdoc) await ctx.remove("foyers", fdoc.id);
    S.f.iView = S.f.iFrom === "cercle" ? "cercle" : "main"; ctx.saveF(); ctx.render();
    // annulable : on remet les fiches telles quelles (mêmes identifiants)
    ctx.toastUndo(UI.retire(nomFoyer(f)), async () => { for (const [p, d] of docs) await ctx.setRaw(p, d); if (fdoc) { const { id: _i, ...d } = fdoc; await ctx.setRaw(`foyers/${fdoc.id}`, d); } });
  }

  /* ---------- Nouveau foyer (« + » de l'en-tête) ---------- */
  const ligne = i => `<div class="iv-nl"><label class="sr" for="iv-np-${i}">${UI.personneN(i + 1)}</label><input id="iv-np-${i}" name="p" placeholder="${UI.prenomNom}" autocomplete="off" ${i === 0 ? "required" : ""}>
    <label class="bu-ck"><input type="checkbox" name="e${i}"> ${UI.enfantCase}</label></div>`;
  function ouvrirNouveau() {
    const cercles = [...new Set([...ctx.groupes(), ...S.guests.map(g => g.group).filter(Boolean)])];
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.nouveauT}"><h3>${UI.nouveauT}</h3><p class="ev-note">${UI.nouveauP}</p>
      <form class="iv-nf" data-ivnf="1">
        <label class="pl-f"><span>${UI.nomFoyerOpt}</span><input name="nom" placeholder="${UI.nomFoyerPh}" autocomplete="off"></label>
        <div class="pl-f"><span>${UI.cote}</span><div class="seg" role="radiogroup" aria-label="${UI.cote}">${["claire", "julien", "commun"].map((k, i) => `<label class="iv-seg"><input type="radio" name="side" value="${k}" ${i === 2 ? "checked" : ""}><span>${esc(coteNom(k))}</span></label>`).join("")}</div></div>
        <label class="pl-f"><span>${UI.cercle}</span><input name="cercle" list="iv-cercles" autocomplete="off"><datalist id="iv-cercles">${cercles.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>
        <div class="iv-nls" id="iv-nls">${[0, 1].map(ligne).join("")}</div>
        <button type="button" class="link" data-act="ivligne">+ ${UI.ajouterLigne}</button>
        <label class="bu-ck"><input type="checkbox" name="plus1"> ${UI.avecPlus1}</label>
        <p class="brief-err" id="iv-nf-err" role="alert"></p>
        <div class="acts"><button type="button" class="link" data-act="ivuneseule">${UI.uneSeule}</button><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button class="btn primary" type="submit">${UI.creerFoyer}</button></div></div>
      </form></div></div>`);
    setTimeout(() => { const i = document.querySelector('.iv-nf [name="nom"]'); if (i) i.focus(); }, 50);
  }
  async function creerFoyer(form) {
    const fd = new FormData(form), noms = fd.getAll("p").map(x => String(x).trim()), err = document.getElementById("iv-nf-err");
    const personnes = noms.map((n, i) => ({ name: n.slice(0, 80), enfant: !!fd.get("e" + i) })).filter(p => p.name);
    if (fd.get("plus1")) personnes.push({ name: "+1", plusUn: true, enfant: false });
    if (!personnes.length) { if (err) err.textContent = UI.auMoinsUn; return; }
    const side = ["claire", "julien", "commun"].includes(fd.get("side")) ? fd.get("side") : "commun", cercle = String(fd.get("cercle") || "").trim().slice(0, 40);
    const fid = await ctx.addDoc("foyers", { nom: String(fd.get("nom") || "").trim().slice(0, 120), side, cercle, etape: "liste" });
    if (!fid) return;
    const ids = [];
    for (const p of personnes) { const id = await ctx.addDoc("guests", { ...p, foyerId: fid, side, group: cercle, rsvp: "attente", ceremonie: true, vin: true, diner: true, regime: "", table: "", note: "" }); if (id) ids.push(id); }
    ctx.closeModal();
    const f = foyer(fid);
    ctx.toastUndo(UI.foyerCree(f ? nomFoyer(f) : UI.nouveauT), async () => { for (const id of ids) await ctx.remove("guests", id); await ctx.remove("foyers", fid); });
    show("foyer", { iFoyer: fid, iFrom: "main" });
  }

  /* ---------- Ajouter quelqu'un de la liste à un foyer ---------- */
  function listeChoix(fid) {
    const f = foyer(fid); if (!f) return "";
    const q = ctx.fold(S.ui.ivPickQ || ""), dans = new Set(f.personnes.map(g => g.id)), fs = F();
    const de = g => fs.find(x => x.personnes.some(y => y.id === g.id));
    const autres = S.guests.filter(g => !dans.has(g.id) && (!q || ctx.fold([g.name, g.group].join(" ")).includes(q)))
      .sort((a, b) => ((coteDe(b) === f.side) + ((b.group || "") === f.cercle)) - ((coteDe(a) === f.side) + ((a.group || "") === f.cercle)) || String(a.name).localeCompare(b.name));
    return autres.length ? autres.slice(0, 60).map(g => { const x = de(g), avec = x && x.personnes.length > 1 ? UI.deja(nomFoyer(x)) : "";
      return `<button class="iv-p" data-act="ivlier" data-id="${esc(fid)}" data-g="${g.id}">${ini(g)}<span class="pr-rb"><b>${esc(g.name || UI.plusUn)}</b><span>${esc([coteNom(coteDe(g)), g.group, avec].filter(Boolean).join(" · "))}</span></span><span class="iv-plus" aria-hidden="true">+</span></button>`; }).join("")
      : `<p class="ev-note">${UI.aucunePers}</p>`;
  }
  function ouvrirChoix(fid) {
    const f = foyer(fid); if (!f) return; S.ui.ivPickQ = ""; S.ui.ivPick = fid;
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${esc(UI.choisirT(nomFoyer(f)))}"><h3 id="iv-pick-h">${esc(UI.choisirT(nomFoyer(f)))}</h3><p class="ev-note">${UI.choisirP}</p>
      <label class="sr" for="iv-pick-q">${UI.chercherPers}</label><input id="iv-pick-q" class="iv-q" type="search" autocomplete="off" name="search_q" data-ivpick="1" placeholder="${UI.chercherPers}">
      <div id="iv-pick-list" class="pr-box iv-pickl">${listeChoix(fid)}</div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.fermer}</button></div></div></div></div>`);
  }
  const majChoix = () => { const l = document.getElementById("iv-pick-list"), h = document.getElementById("iv-pick-h"), f = S.ui.ivPick && foyer(S.ui.ivPick);
    if (l && S.ui.ivPick) l.innerHTML = listeChoix(S.ui.ivPick); if (h && f) h.textContent = UI.choisirT(nomFoyer(f)); };
  async function lier(id, gid) {
    const g = S.guests.find(x => x.id === gid); if (!g) return;
    const fid = await foyerReel(id); if (!fid) return;
    if (S.ui.ivPick === id) S.ui.ivPick = fid;
    const avant = g.foyerId ?? null, f = S.foyers.find(x => x.id === fid) || {};
    if (await ctx.patch("guests", gid, { foyerId: fid })) {
      ctx.toastUndo(UI.lie(g.name || UI.plusUn, nomFoyer(foyer(fid) || { ...f, personnes: [g] })), () => ctx.patch("guests", gid, { foyerId: avant }));
      ctx.render(); majChoix();
    }
  }

  /* ---------- Regroupement en foyers ---------- */
  function vRegrouper() {
    const pr = proposerFoyers(S.guests), sel = S.ui.ivSel || pr.map((_, i) => i), noms = S.ui.ivNoms || {};
    const nomG = id => (S.guests.find(g => g.id === id) || {}).name || "";
    return `<div class="ev-page pl-tache iv-page bu-arbp"><button class="link env-back" data-act="ivview" data-v="main">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.regT}</h2><p class="ev-note">${UI.regP}</p>
      ${pr.length ? pr.map((x, i) => `<div class="pr-card bu-piste ${sel.includes(i) ? "on" : ""}"><input type="checkbox" data-ivsel="${i}" ${sel.includes(i) ? "checked" : ""} aria-label="${esc(x.nom)}">
        <span class="pr-rb"><label class="sr" for="iv-n-${i}">${UI.nomFoyer}</label><input id="iv-n-${i}" class="iv-nin" data-ivnom="${i}" value="${esc(noms[i] ?? x.nom)}">
          <span class="iv-membres">${x.ids.map(id => `<span class="chip">${esc(nomG(id))}</span>`).join("")}</span><span>${esc([coteNom(x.side), x.cercle].filter(Boolean).join(" · "))}</span></span></div>`).join("")
        : `<p class="ev-note">${UI.rienARegrouper}</p>`}
      ${pr.length && S.canWrite ? `<div class="pr-bar bu-arbbar"><div class="bu-arbt"><b class="num">${sel.length}</b><span>${UI.foyersN(sel.length)}</span></div><button class="btn primary" data-act="ivregrouper" ${sel.length ? "" : "disabled"}>${UI.appliquer(sel.length)}</button></div>` : ""}</div>`;
  }
  async function regrouper() {
    const pr = proposerFoyers(S.guests), sel = (S.ui.ivSel || pr.map((_, i) => i)).filter(i => pr[i]), noms = S.ui.ivNoms || {};
    const crees = [], lies = [];
    for (const i of sel) {
      const x = pr[i], nom = String(noms[i] ?? "").trim(), fid = await ctx.addDoc("foyers", { nom: nom && nom !== x.nom ? nom.slice(0, 120) : "", side: x.side, cercle: x.cercle, etape: "liste" });
      if (!fid) continue; crees.push(fid);
      for (const gid of x.ids) if (await ctx.patch("guests", gid, { foyerId: fid })) lies.push(gid);
    }
    S.ui.ivSel = null; S.ui.ivNoms = null; S.f.iView = "main"; ctx.saveF(); ctx.render();
    // annulable : on délie les personnes et on retire les foyers créés (rien d'autre n'est touché)
    ctx.toastUndo(UI.regOk(crees.length), async () => { for (const gid of lies) await ctx.patch("guests", gid, { foyerId: null }); for (const fid of crees) await ctx.remove("foyers", fid); });
  }

  /* ---------- gestes ---------- */
  function vInvites() {
    switch (S.f.iView) { case "cercle": return vCercle(S.f.iCercle); case "foyer": return vFoyer(S.f.iFoyer); case "regrouper": return vRegrouper(); case "reponses": return vReponses(S.f.iRep); case "envoi": return vEnvoi(); case "coller": return vColler(); case "liste": return ctx.ancienneListe(); default: return vMain(); }
  }
  const show = (v, o = {}) => { Object.assign(S.f, { iView: v }, o); ctx.saveF(); ctx.render(); window.scrollTo(0, 0); };
  function act(a, t) {
    const id = t.dataset.id;
    switch (a) {
      case "ivview": show(t.dataset.v); return true;
      case "ivcercle": show("cercle", { iCercle: t.dataset.c }); return true;
      case "ivfoyer": show("foyer", { iFoyer: id, iFrom: S.f.iView === "cercle" ? "cercle" : "main" }); return true;
      case "ivback": show(S.f.iFrom === "cercle" ? "cercle" : "main"); return true;
      case "ivcible": S.ui.ivCible = true; ctx.render(); setTimeout(() => { const i = document.getElementById("iv-cible"); if (i) i.focus(); }, 0); return true;
      case "ivstd": ctx.showTask("t13"); return true;
      case "ivetape": foyerReel(id).then(fid => fid && ctx.patch("foyers", fid, { etape: t.dataset.k, etapeLe: Date.now() }).then(ok => ok && ctx.toast(UI.etapeOk(UI.etapes[t.dataset.k])))); return true;
      case "ivmoment": { const f = foyer(id); if (!f) return true; const k = t.dataset.k, on = f.personnes.every(g => g[k] !== false);
        Promise.all(f.personnes.map(g => ctx.patch("guests", g.id, { [k]: !on }))); return true; }
      case "ivajout": case "ivplus1": foyerReel(id).then(fid => { if (!fid) return; const f = S.foyers.find(x => x.id === fid) || {};
        const base = { foyerId: fid, side: f.side || "commun", group: f.cercle || "", rsvp: "attente", ceremonie: true, vin: true, diner: true };
        if (a === "ivplus1") ctx.addDoc("guests", { ...base, name: "+1", plusUn: true, enfant: false, regime: "", table: "" }); else ctx.openEditor("guests", null, base); }); return true;
      case "ivretirer": confirmerRetrait(id); return true;
      case "ivchoisir": ouvrirChoix(id); return true;
      case "ivnouveau": ouvrirNouveau(); return true;
      case "ivligne": { const l = document.getElementById("iv-nls"); if (l) { const n = l.querySelectorAll(".iv-nl").length; l.insertAdjacentHTML("beforeend", ligne(n)); const i = document.getElementById(`iv-np-${n}`); if (i) i.focus(); } return true; }
      case "ivuneseule": ctx.closeModal(); ctx.openEditor("guests"); return true;
      case "ivlien": creerLien(id); return true;
      case "ivpurge": purger(); return true;
      case "ivpartager": { const f = foyer(id); if (f && f.lien && f.lien.token) partager(f, f.lien.token); return true; }
      case "ivrevoquer": ctx.lienFoyer(id, "revoquer").then(() => ctx.toast(UI.lienRevoque), e => ctx.toast(e.message || "Erreur")); return true;
      case "ivlier": lier(id, t.dataset.g); return true;
      case "ivretirerok": retirer(id); return true;
      case "ivregrouper": regrouper(); return true;
      case "ivrep": show("reponses", { iRep: t.dataset.r }); return true;
      case "ivlimite": S.ui.ivLimite = true; ctx.render(); setTimeout(() => { const i = document.getElementById("iv-lim"); if (i) { i.focus(); try { i.showPicker && i.showPicker(); } catch (e) {} } }, 0); return true;
      case "ivrsvp": setRsvp([id], t.dataset.v); return true;
      case "ivtous": { const f = foyer(id); if (f) setRsvp(f.personnes.map(g => g.id), t.dataset.v); return true; }
      case "ivabsent": { const g = S.guests.find(x => x.id === id); if (!g) return true; const k = t.dataset.k, a = { ...(g.absentA || {}) }; if (a[k]) delete a[k]; else a[k] = true; ctx.patch("guests", id, { absentA: a }); return true; }
      case "ivrelance": relancer(false); return true;
      case "ivrelautre": ctx.closeModal(); S.ui.ivRelTxt = null; relancer(true); return true;
      case "ivrelenvoi": envoyerRelance(id); return true;
      case "ivrelfait": noterRelance(id); return true;
      case "ivtraiteur": mailTraiteur(); return true;
      case "ivtraiteurcopie": copierTraiteur(); return true;
      case "ivmoments": ouvrirMoments(); return true;
      case "ivmretirer": { const l = S.ui.ivMoms || []; if (l.length > 1) { l.splice(+t.dataset.i, 1); rendreMoments(); } return true; }
      case "ivmajout": { const i = document.getElementById("iv-m-new"), nom = String((i && i.value) || "").trim() || UI.suggestion, l = S.ui.ivMoms || [];
        let k = slug(nom); while (l.some(m => m.k === k)) k += "_"; l.push({ k, nom: nom.slice(0, 40) }); rendreMoments(); return true; }
      case "ivmok": enregistrerMoments(); return true;
      case "ivenvoyer": marquerEnvoyes(); return true;
      case "ivtaille": { const n = +t.dataset.n; ctx.setCible(n).then(() => { ctx.render(); ctx.toast(UI.cibleOk(n === 150 ? "150+" : n)); }); return true; }
      case "ivcoller": ouvrirColler(false); return true;
      case "ivtableur": ouvrirColler(true); return true;
      case "ivbulk": ctx.closeModal(); ctx.openBulk(); return true;
      case "ivcolgo": proposer(); return true;
      case "ivpajout": ajouterProposes(); return true;
    }
    return false;
  }
  function change(el) {
    const d = el.dataset || {};
    if (d.ivf) { champFoyer(d.id, d.ivf, el.value.trim()); return true; }
    if (d.ivcible) { const v = Math.max(0, Math.round(+String(el.value).replace(/[^\d]/g, "") || 0)); S.ui.ivCible = false; ctx.setCible(v || null).then(() => ctx.render()); return true; }
    if (d.ivsel != null) { const pr = proposerFoyers(S.guests), s2 = new Set(S.ui.ivSel || pr.map((_, i) => i)), i = +d.ivsel; el.checked ? s2.add(i) : s2.delete(i); S.ui.ivSel = [...s2].sort((x, y) => x - y); ctx.render(); return true; }
    if (d.ivnom != null) { S.ui.ivNoms = { ...(S.ui.ivNoms || {}), [d.ivnom]: el.value }; return true; }
    if (d.ivlimite) { const v = /^\d{4}-\d{2}-\d{2}$/.test(el.value) ? el.value : null; S.ui.ivLimite = false; ctx.setSettings({ dateLimiteReponse: v }).then(() => ctx.render()); return true; }
    if (d.ivnoms) { S.ui.ivNomsTr = el.checked; return true; }
    if (d.ivenv != null) { const l = F().filter(f => !envoye(f)), s2 = new Set(S.ui.ivEnv || l.map(f => f.id)); el.checked ? s2.add(d.ivenv) : s2.delete(d.ivenv); S.ui.ivEnv = [...s2]; ctx.render(); return true; }
    if (d.ivmnom != null) { const l = S.ui.ivMoms || []; if (l[+d.ivmnom]) l[+d.ivmnom].nom = el.value; return true; }
    if (d.ivfichier) { lireFichier(el); return true; }
    if (d.ivpsel != null) { const s2 = new Set(S.ui.ivPropSel || []), i = +d.ivpsel; el.checked ? s2.add(i) : s2.delete(i); S.ui.ivPropSel = [...s2].sort((x, y) => x - y); ctx.render(); return true; }
    if (d.ivpnom != null) { S.ui.ivPropNoms = { ...(S.ui.ivPropNoms || {}), [d.ivpnom]: el.value }; return true; }
    if (d.ivpcote != null) { const x = (S.ui.ivProp || [])[+d.ivpcote]; if (x) x.side = el.value; return true; }
    return false;
  }
  function input(el) {
    if (el.dataset && el.dataset.ivcoltxt) { S.ui.ivColTxt = el.value; return true; }
    if (el.dataset && el.dataset.ivreltxt) { S.ui.ivRelTxt = el.value; return true; }
    if (el.dataset && el.dataset.ivmnom != null) { const l = S.ui.ivMoms || []; if (l[+el.dataset.ivmnom]) l[+el.dataset.ivmnom].nom = el.value; return true; }
    if (el.dataset && el.dataset.ivpick) { S.ui.ivPickQ = el.value; majChoix(); return true; }
    if (el.dataset && el.dataset.ivq) { S.f.iq = el.value; ctx.saveF(); ctx.render(); const i = document.getElementById("iv-q"); if (i && document.activeElement !== i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return true; } return false; }
  function submit(f) { if (f.dataset && f.dataset.ivnf) { creerFoyer(f); return true; } return false; }
  return { vInvites, act, change, input, submit, apresReponse, foyers: F, moment: () => momentDe(F()) };
}
