// Page « Invités » v1 (docs/invites-v1.md, lot 1) : moment 1 « Qui on invite ? » (3.1), un cercle, un foyer (3.2), regroupement en foyers.
// Règles dans agents/lib/invites.js (testées). Une fiche par personne (`guests`) reliée à un foyer (`foyers`, `guests.foyerId`).
// Aucun appel IA à l'affichage. Lots suivants : lien des adresses (2), réponses (3), plan de table (4), liste vide (5).
import { foyersDe, nomFoyer, compte, momentDe, points, cercles, proposerFoyers, carteAction, estPlusUn, coteDe, SUIVI } from "../agents/lib/invites.js";

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
  invitesA: "Invités à", moments: [["ceremonie", "Cérémonie"], ["vin", "Vin d'honneur"], ["diner", "Dîner"]],
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
      <span class="pr-rb"><b>${esc(nomFoyer(f))}</b><span>${esc([c.places > 1 ? UI.personnesN(c.places) : "", f.personnes.find(g => g.regime) ? f.personnes.filter(g => g.regime).map(g => g.regime).join(", ") : ""].filter(Boolean).join(" · "))}</span></span>${ctx.CHEV}</button>`; };
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
    return `<div class="pr bu iv">${head(fs)}${cartePurge(fs)}${action(fs)}
      <label class="sr" for="iv-q">${UI.rechercher}</label><input id="iv-q" class="iv-q" type="search" autocomplete="off" name="search_q" data-ivq="1" placeholder="${UI.rechercher}" value="${esc(S.f.iq || "")}">
      ${(S.f.iq || "").length >= 2 ? recherche(fs) : tuilesCercles(fs)}
      <button class="pr-row bu-pdf" data-go="tables">${SVG('<circle cx="12" cy="12" r="4"/><circle cx="12" cy="4" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>')}<span class="pr-rb"><b>${UI.planT}</b><span>${UI.planS}</span></span>${ctx.CHEV}</button>
      <div class="iv-bas">${S.canWrite ? `<button class="link" data-act="bulk">${UI.coller}</button>` : ""}${S.guests.length ? `<button class="link" data-act="csv">${UI.exporter}</button>` : ""}<button class="link" data-act="ivview" data-v="liste">${UI.liste}</button></div></div>`;
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
    const momentOn = k => f.personnes.every(g => g[k] !== false);
    return `<div class="ev-page pl-tache iv-page"><button class="link env-back" data-act="ivback">${ctx.BACK_SVG}<span>${esc(S.f.iCercle != null && S.f.iFrom === "cercle" ? (S.f.iCercle || UI.sansCercle) : UI.titre)}</span></button>
      <span class="pl-etat iv-cote s-${f.side}">${esc([coteNom(f.side), f.cercle].filter(Boolean).join(" · "))}</span>
      <h2 class="iv-nom">${esc(nomFoyer(f))}</h2><p class="ev-note">${esc(UI.unFoyer(c.adultes, c.enfants))}</p>
      <section class="pr-sec"><h3 class="home-h">${UI.personnes}</h3><div class="pr-box">${f.personnes.map(g => `<button class="iv-p ${estPlusUn(g) ? "plus" : ""}" data-edit="guests" data-id="${g.id}">${ini(g, f.side)}
          <span class="pr-rb"><b>${estPlusUn(g) && !String(g.name || "").replace(/^\s*\+\s*1\s*/, "").trim() ? UI.plusUn : esc(g.name)}</b><span>${esc([estPlusUn(g) ? UI.prenomADemander : g.enfant ? UI.enfant : UI.adulte, g.regime].filter(Boolean).join(" · "))}</span></span>${ctx.CHEV}</button>`).join("")}</div>
        ${S.canWrite ? `<div class="pl-acts"><button class="btn sm" data-act="ivajout" data-id="${esc(f.id)}">${UI.ajouterPersonne}</button><button class="btn sm" data-act="ivplus1" data-id="${esc(f.id)}">${UI.ajouterPlus1}</button><button class="btn sm" data-act="ivchoisir" data-id="${esc(f.id)}">${UI.deLaListe}</button></div>` : ""}</section>
      <section class="pr-sec"><h3 class="home-h">${UI.invitesA}</h3><div class="iv-moments">${UI.moments.map(([k, l]) => `<button class="chip ${momentOn(k) ? "acc" : ""}" data-act="ivmoment" data-id="${esc(f.id)}" data-k="${k}" aria-pressed="${momentOn(k)}" ${dis}>${l}</button>`).join("")}</div></section>
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
    switch (S.f.iView) { case "cercle": return vCercle(S.f.iCercle); case "foyer": return vFoyer(S.f.iFoyer); case "regrouper": return vRegrouper(); case "liste": return ctx.ancienneListe(); default: return vMain(); }
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
    }
    return false;
  }
  function change(el) {
    const d = el.dataset || {};
    if (d.ivf) { champFoyer(d.id, d.ivf, el.value.trim()); return true; }
    if (d.ivcible) { const v = Math.max(0, Math.round(+String(el.value).replace(/[^\d]/g, "") || 0)); S.ui.ivCible = false; ctx.setCible(v || null).then(() => ctx.render()); return true; }
    if (d.ivsel != null) { const pr = proposerFoyers(S.guests), s2 = new Set(S.ui.ivSel || pr.map((_, i) => i)), i = +d.ivsel; el.checked ? s2.add(i) : s2.delete(i); S.ui.ivSel = [...s2].sort((x, y) => x - y); ctx.render(); return true; }
    if (d.ivnom != null) { S.ui.ivNoms = { ...(S.ui.ivNoms || {}), [d.ivnom]: el.value }; return true; }
    return false;
  }
  function input(el) {
    if (el.dataset && el.dataset.ivpick) { S.ui.ivPickQ = el.value; majChoix(); return true; }
    if (el.dataset && el.dataset.ivq) { S.f.iq = el.value; ctx.saveF(); ctx.render(); const i = document.getElementById("iv-q"); if (i && document.activeElement !== i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return true; } return false; }
  function submit(f) { if (f.dataset && f.dataset.ivnf) { creerFoyer(f); return true; } return false; }
  return { vInvites, act, change, input, submit, foyers: F, moment: () => momentDe(F()) };
}
