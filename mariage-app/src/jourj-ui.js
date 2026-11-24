// Jour J v1 (docs/jour-j-v1.md, lot 1) : page en préparation (3.1) et page d'un moment (3.2). Règles dans agents/lib/jourj.js (testées) :
// moments lus depuis `schedule` (champs historiques gardés, aucune migration), barre de la journée, coucher du soleil calculé sur place,
// « À caler », rôles (`meta/jourj.roles`). Aucun appel IA à l'affichage : seul le bouton du coach (job `jourj`) rédige un brouillon,
// ouvert dans l'app mail du téléphone ; l'app n'envoie rien.
import { momentsDe, barre, heureEntre, hLisible, hDe, minDe, rolesDe, personneDe, aCaler, trouDe, compteurs, lieuReserve, prestatairesDuJour,
  coucherSoleil, minutesLocales, villeSoleil, VILLES, VOIT_DEFAUT, visiblesPar, fichePrestataire, etatFiche, empreinteFiche, momentsPourMetier, contactSurPlace,
  cleTrou, moisAvant, vueTemoins, estLeJour, heureDuJour, aDecaler } from "../agents/lib/jourj.js";
import { rendreJour } from "./jourj-jour.js";
import { concernes, tablesDe, resume } from "../agents/lib/plan.js";

// Textes d'interface (à traduire)
const UI = {
  titre: "Notre jour J", retour: "Accueil", ajouter: "Ajouter un moment", dateAFixer: "DATE À FIXER", indicative: "DATE INDICATIVE",
  phrase: (a, b) => `De ${a} à ${b}`, lieuAChoisir: "lieu à choisir",
  cpt: { moments: n => (n > 1 ? "moments" : "moment"), prestas: n => (n > 1 ? "prestataires" : "prestataire"), roles: n => (n > 1 ? "rôles à confier" : "rôle à confier"), aucun: "Aucun", tous: "Tous confiés" },
  soleil: h => `Coucher du soleil à ${h}`, soleilOu: "Où situer le coucher du soleil ?", soleilChanger: "changer", soleilT: "Le coucher du soleil",
  soleilP: "Choisissez la ville la plus proche du lieu. Le calcul se fait sur votre téléphone, sans service extérieur.", soleilAuto: "Comme le lieu réservé",
  caler: n => `À caler · ${n}`, plusN: n => `+ ${n}`, moinsN: "Voir moins",
  trou: { fiche: t => `Fiche de ${t.vendor} : mise à jour depuis l'envoi`, arrivee: t => `Heure d'arrivée de ${t.vendor} (${t.moment})`, role: t => `${t.role} : à confier`, pluie: t => `${t.moment} : pas de plan pluie`, objet: t => `${t.objet} (${t.moment}) : personne pour s'en charger` },
  trouCourt: { arrivee: t => `Heure d'arrivée de ${t.vendor} à fixer`, pluie: () => "Plan pluie à prévoir", objet: t => `${t.objet} : à confier` },
  deroule: "Le déroulé", aAjuster: "à ajuster", sansHeure: "--:--", glisser: n => `Déplacer ${n}`, deplace: (n, h) => `${n} passe à ${h}`,
  quiFait: "Qui fait quoi", aConfier: "À confier", ajouterRole: "Ajouter un rôle", nouveauRole: "Nouveau rôle",
  partager: "Partager le déroulé", partagerS: "Invités, prestataires, témoins : chacun sa version",
  // 3.3 partager
  chacun: "Chacun sa version", chacunP: "Un seul déroulé : ce que vous changez se met à jour partout.", onglets: { invites: "Invités", prestataires: "Prestataires", temoins: "Témoins" },
  invVoient: n => `${n} moment${n > 1 ? "s" : ""} visible${n > 1 ? "s" : ""} par les invités`, invCaches: n => `${n} caché${n > 1 ? "s" : ""} aux invités`, aucunVisible: "Aucun moment visible par les invités.",
  acces: "Accès et parking", accesPh: "Adresse, plan d'accès, où se garer…", navettes: "Navettes", navettesPh: "Horaires et point de départ des navettes…",
  pdfInvites: "PDF pour les invités", pdfTemoins: "PDF pour les témoins",
  // liens (section 4)
  lienInvT: "Le lien pour le faire-part", lienInvP: "Le programme de la journée, sans nom ni numéro. Il expire deux jours après le mariage.",
  liensTemT: "Les liens des témoins", liensTemP: "Un lien par personne : tout le déroulé et, le jour J, l'écran du jour. Lecture seule, sauf « On a du retard ». Il expire deux jours après le mariage.",
  creerLien: "Créer le lien", partagerLien: "Partager le lien", revoquer: "Révoquer", lienCree: "Lien prêt", lienRevoque: "Lien révoqué", lienCopie: "Lien copié",
  partageLe: d => `Partagé le ${d}`, cree: "Lien prêt, pas encore partagé", sansLien: "Pas de lien", ajouterTemoin: "Ajouter un témoin", temoin: "Témoin",
  aConfierAvant: "Confiez d'abord ce rôle à quelqu'un", lienTexteTem: (r, c) => `Voici le déroulé de notre jour J${r ? ` (${r.toLowerCase()})` : ""}. Le jour même, la page devient l'écran du jour.${c ? ` ${c}` : ""}`,
  lienTexteInv: "Le programme de notre mariage :", echecLien: e => `Le lien n'a pas pu être créé : ${e}`,
  // le jour même
  ecranJour: "Revenir à l'écran du jour", ecranJourS: "Le moment en cours, le suivant, les numéros utiles", decaleOk: n => `${n} moment${n > 1 ? "s" : ""} décalé${n > 1 ? "s" : ""} de 15 min`,
  rienADecaler: "Aucun moment à décaler", retardAnnule: "Décalage annulé",
  tem: { moments: "moments", roles: "rôles", prestas: "prestataires", pluie: "plans pluie" }, temP: "Tout le déroulé, les rôles, les contacts des prestataires et les plans pluie.",
  etat: { prete: n => `Prête · ${n} moment${n > 1 ? "s" : ""}`, envoyee: d => `Envoyée le ${d}`, maj: d => `Envoyée le ${d} · mise à jour depuis`,
    manque: { moments: "Moments à choisir", arrivee: "Heure d'arrivée manquante", contact: "Contact sur place manquant" } },
  completer: "Compléter", envoyer: "Envoyer", renvoyer: "Renvoyer", voirPdf: "Voir la fiche", envoyerN: n => `Envoyer les ${n} fiche${n > 1 ? "s" : ""} prête${n > 1 ? "s" : ""}`,
  aucunReserveP: "Les fiches apparaissent ici dès qu'un prestataire est réservé.", pasDeBudget: "Une fiche ne contient ni montant, ni devis, ni autre prestataire.",
  // envoi
  envoiT: (i, n) => (n > 1 ? `Fiche ${i} sur ${n}` : "Envoyer la fiche"), redigeMsgs: "Le coach rédige les messages…", partagerFiche: "Partager la fiche",
  partagerP: "Choisissez Mail : la fiche est jointe et le message prêt. Rien ne part sans vous.", ouvrirMailSans: "Ouvrir dans l'app mail (sans pièce jointe)", telecharger: "Télécharger la fiche",
  marquerEnvoyee: "Marquer comme envoyée", envoyeeOk: n => `Fiche de ${n} notée envoyée`, suivante: "Suivante", passer: "Passer", termine: "Terminé",
  // choisir les moments d'un prestataire
  choisirT: n => `Les moments de ${n}`, choisirP: "Cochez les moments où il intervient ; les plus courants pour son métier sont proposés.", ajoutes: n => `Ajouté à ${n} moment${n > 1 ? "s" : ""}`,
  enregistrer: "Enregistrer",
  // 5.4 et tâches
  ajouterJourJ: noms => `L'ajouter au jour J : ${noms}`, tacheT: t => t,
  videT: "Pas encore de déroulé", videP: "Ajoutez les grands moments : préparatifs, mairie, cérémonie, vin d'honneur, dîner.",
  // feuille d'ajout
  nom: "Nom du moment", debut: "Début", fin: "Fin", creer: "Ajouter", annuler: "Annuler", fermer: "Fermer", nomPh: "Cérémonie, vin d'honneur…",
  // page d'un moment
  tousMoments: "Notre jour J", lieu: "Lieu", lieuPrecis: "Lieu précis", lieuPrecisPh: "Le jardin, la salle des voûtes…", detail: "Détail", detailPh: "Qui est concerné, ce qui s'y passe",
  cle: "Moment clé", exterieur: "En extérieur", horaires: "Horaires",
  pluieT: "S'il pleut", pluiePh: "La solution de repli : salle, tente, horaires…", pluieCoach: "Poser la question au lieu", pasDeLieu: "Réservez d'abord le lieu pour que le coach lui écrive.",
  prestasT: "Les prestataires", arrivee: "Arrivée", tache: "Ce qu'il fait", tachePh: "Photos de la cérémonie…", arriveeAFixer: "Heure d'arrivée à fixer",
  arriveeCoach: "Lui demander l'heure", ajouterPresta: "Ajouter un prestataire réservé", aucunReserve: "Aucun prestataire réservé pour l'instant.", retirer: "Retirer",
  objetsT: "À ne pas oublier", objetPh: "Les alliances, le livret…", ajouterObjet: "Ajouter", quiCharge: "Qui s'en charge", fait: "Prêt",
  voitT: "Qui voit ce moment", voit: { invites: "Invités", prestataires: "Prestataires", temoins: "Témoins" }, voitP: "Un moment intime, comme les photos de couple, peut être caché aux invités.",
  note: "Note", notePh: "Ce qu'il faut savoir", supprimer: "Supprimer ce moment", supprime: n => `${n} supprimé`,
  diner: (n, p, t) => `${n} au dîner${t ? ` · ${p} placé${p > 1 ? "s" : ""} sur ${t} table${t > 1 ? "s" : ""}` : ""}`, planTable: "Plan de table",
  redige: "Le coach rédige…", brouillon: "Brouillon à relire", ouvrirMail: "Ouvrir dans l'app mail", copier: "Copier", copie: "Copié", refaire: "Refaire",
  rienEnvoye: "Rien n'est envoyé : vous relisez et envoyez depuis votre app mail.", echec: e => `Le coach n'a pas pu rédiger : ${e}`,
  // feuille d'un rôle
  roleNom: "Rôle", qui: "Qui ?", chercher: "Chercher un invité", nomLibre: "Ou un nom", nomLibrePh: "Prénom et nom", tel: "Téléphone",
  personneVide: "Personne pour l'instant", retirerPersonne: "Retirer la personne", supprimerRole: "Supprimer ce rôle", roleSupprime: n => `Rôle « ${n} » supprimé`,
  confie: (r, n) => `${r} : ${n}`, aucunInvite: "Aucun invité ne correspond.",
};
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const SOLEIL = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const GRIP = '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>';
const uid = () => Math.random().toString(36).slice(2, 10);
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « au Domaine X », « à la Bergerie », « aux Jardins », « à Uzès ». */
function auLieu(nom) {
  const n = String(nom || "").trim(), m = /^(le|les|la|l['’])\s*(.*)$/i.exec(n);
  if (m) { const k = m[1].toLowerCase(); return k === "le" ? `au ${m[2]}` : k === "les" ? `aux ${m[2]}` : k === "la" ? `à la ${m[2]}` : `à l'${m[2]}`; }
  return /^(château|domaine|mas|moulin|manoir|clos|prieuré|relais|jardin|parc|restaurant|hôtel|chalet|pavillon|couvent|monastère|cloître|musée|théâtre|bastion|fort|haras|logis)\b/i.test(n) ? `au ${n}` : `à ${n}`;
}
// la tuile de Nos envies dont la photo illustre un moment
const tuileDuMoment = nom => { const n = fold(nom);
  return /ceremonie|mairie|eglise|benediction/.test(n) ? "ceremonie" : /vin d|cocktail|aperitif/.test(n) ? "cocktail" : /diner|repas|dejeuner/.test(n) ? "repas"
    : /soiree|danse|bal|fete/.test(n) ? "musique" : /brunch|lendemain/.test(n) ? "lendemain" : /prepar/.test(n) ? "beaute" : "lieu"; };

export function makeJourJ(ctx) {
  const { S, esc } = ctx;
  const M = () => momentsDe(S.schedule || []);
  const R = () => rolesDe(S.jourj);
  const V = id => (S.vendors || []).find(v => v.id === id);
  const reserves = () => (S.vendors || []).filter(v => v.status === "reserve");
  const J = () => S.jourj || {};
  const trous = (ms = M()) => aCaler({ moments: ms, roles: R(), vendors: S.vendors || [], guests: S.guests || [], acces: J().acces || {}, fiches: J().fiches || {} });
  const doc = id => (S.schedule || []).find(x => x.id === id);

  /* ---------- en-tête ---------- */
  function soleil() {
    const d = S.settings && S.settings.date; if (!d) return null;
    const v = villeSoleil({ choix: (S.jourj || {}).soleil, vendors: S.vendors || [], settings: S.settings || {} }); if (!v) return { ville: null };
    return { ville: v, mn: minutesLocales(coucherSoleil(d, v.lat, v.lng)) };
  }
  function dateK() {
    const d = ctx.wDate(); if (!d) return UI.dateAFixer;
    const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
    return S.settings.dateIndicative ? `${t} · ${UI.indicative}` : t;
  }
  function vBarre(ms, so) {
    const b = barre(ms); if (!b) return "";
    const soleilX = so && so.mn != null && so.mn >= b.debut && so.mn <= b.fin ? b.pct(so.mn) : null;
    const label = ms.filter(m => m.debut != null).map(m => `${hLisible(m.debut)} ${m.nom}`).join(", ");
    return `<div class="jj-barre" role="img" aria-label="${esc(label)}">${b.segments.map(s => `<span class="jj-seg ${s.cle ? "cle" : ""}" style="left:${s.x.toFixed(2)}%;width:${s.w.toFixed(2)}%"></span>`).join("")}
        ${soleilX != null ? `<span class="jj-sun" style="left:${soleilX.toFixed(2)}%">${SVG(SOLEIL)}</span>` : ""}</div>
      <div class="jj-rep" aria-hidden="true">${b.reperes.map(r => `<span style="left:${r.x.toFixed(2)}%">${esc(hLisible(r.mn).replace(/ h$/, " h"))}</span>`).join("")}</div>`;
  }
  function head(ms) {
    const b = barre(ms), so = soleil(), c = compteurs({ moments: ms, roles: R(), vendors: S.vendors || [], guests: S.guests || [] });
    const lieu = lieuReserve(S.vendors || []), nomLieu = lieu ? lieu.name : (S.settings.lieu || "");
    const phrase = b ? `${UI.phrase(hLisible(b.debut), hLisible(b.fin))}, ${nomLieu ? esc(auLieu(nomLieu)) : UI.lieuAChoisir}` : (nomLieu ? esc(nomLieu) : "");
    const ligneSoleil = !so ? "" : so.mn != null ? `<p class="jj-sol">${SVG(SOLEIL)}<span>${esc(UI.soleil(hLisible(so.mn)))} · ${esc(so.ville.nom)}</span>${S.canWrite ? `<button class="link" data-act="jjsoleil">${UI.soleilChanger}</button>` : ""}</p>`
      : S.canWrite ? `<p class="jj-sol">${SVG(SOLEIL)}<button class="link" data-act="jjsoleil">${UI.soleilOu}</button></p>` : "";
    const cpt = (n, lab, cls = "") => `<div><b class="num ${cls}">${n || UI.cpt.aucun}</b><span>${lab(n)}</span></div>`;
    return `<section class="pr-head bu-head jj-head">
      <div class="pr-top"><button class="pr-round" data-go="apercu" aria-label="${UI.retour}">${ctx.BACK_SVG}</button><h2 class="bu-t">${UI.titre}</h2>
        ${S.canWrite ? `<button class="pr-round plus" data-act="jjajout" aria-label="${UI.ajouter}">${SVG('<path d="M12 5v14M5 12h14"/>')}</button>` : "<span></span>"}</div>
      <div class="bu-k">${esc(dateK())}</div>
      ${phrase ? `<p class="jj-phrase">${phrase}</p>` : ""}
      ${vBarre(ms, so)}${ligneSoleil}
      ${ms.length ? `<div class="bu-cpts">${cpt(c.moments, UI.cpt.moments)}${cpt(c.prestataires, UI.cpt.prestas)}
        <div><b class="num ${c.aConfier ? "jj-coral" : ""}">${c.aConfier || UI.cpt.tous}</b><span>${c.aConfier ? UI.cpt.roles(c.aConfier) : ""}</span></div></div>` : ""}
    </section>`;
  }

  /* ---------- 3.1 la page ---------- */
  const texteTrou = t => UI.trou[t.k](t);
  function carteCaler(ts) {
    if (!ts.length) return "";
    const tout = !!S.ui.jjCalerTout, vus = tout ? ts : ts.slice(0, 3);
    return `<section class="pr-card bu-arb jj-caler"><span class="ev-tag">${UI.caler(ts.length)}</span>
      <div class="jj-trous">${vus.map((t, i) => `<button class="jj-trou" data-act="jjtrou" data-i="${i}"><span>${esc(texteTrou(t))}</span>${ctx.CHEV}</button>`).join("")}</div>
      ${ts.length > 3 ? `<button class="link" data-act="jjcalertout">${tout ? UI.moinsN : UI.plusN(ts.length - 3)}</button>` : ""}</section>`;
  }
  function ligneMoment(m, ts) {
    const t = trouDe(m, ts), noms = m.prestas.map(p => V(p.vendorId)).filter(Boolean).map(v => v.name);
    const sous = [m.lieuPrecis || m.lieu, noms.length ? noms.join(", ") : m.detail].filter(Boolean).join(" · ");
    return `<div class="jj-l ${m.cle ? "cle" : ""}" data-mid="${esc(m.id)}">
      ${S.canWrite ? `<button class="jj-grip" aria-label="${esc(UI.glisser(m.nom))}">${SVG(GRIP)}</button>` : ""}
      <button class="jj-lb" data-act="jjmoment" data-id="${esc(m.id)}"><span class="jj-h num">${m.debut != null ? esc(hDe(m.debut)) : UI.sansHeure}</span><span class="jj-dot" aria-hidden="true"></span>
        <span class="pr-rb"><b>${esc(m.nom)}${m.template ? ` <span class="chip">${UI.aAjuster}</span>` : ""}</b>${sous ? `<span>${esc(sous)}</span>` : ""}${t ? `<span class="jj-bad">${esc(UI.trouCourt[t.k](t))}</span>` : ""}</span>${ctx.CHEV}</button></div>`;
  }
  function quiFaitQuoi() {
    const rs = R(), g = S.guests || [];
    return `<section class="pr-sec"><h3 class="home-h">${UI.quiFait}</h3><div class="pr-box">${rs.map(r => { const p = personneDe(r, g);
      return `<button class="iv-p jj-role" data-act="jjrole" data-id="${esc(r.id)}"><span class="pr-rb"><b>${esc(r.nom)}</b></span>
        ${p ? `<span class="jj-pers"><span class="iv-av" aria-hidden="true">${esc(ctx.initials(p.nom))}</span><span>${esc(p.nom)}</span></span>` : `<span class="jj-aconfier">${UI.aConfier}</span>`}</button>`; }).join("")}
      ${S.canWrite ? `<button class="iv-p plus" data-act="jjroleajout"><span class="pr-rb"><b>${UI.ajouterRole}</b></span></button>` : ""}</div></section>`;
  }
  function vMain() {
    const ms = M(), ts = trous(ms), jour = estLeJour(S.settings || {}, ms, new Date());
    return `<div class="pr bu jj">${head(ms)}${jour ? `<button class="pr-row bu-pdf jj-live-row" data-act="jjdouvrir"><span class="pr-rb"><b>${UI.ecranJour}</b><span>${UI.ecranJourS}</span></span>${ctx.CHEV}</button>` : ""}${carteCaler(ts)}
      ${ms.length ? `<section class="pr-sec"><h3 class="home-h">${UI.deroule}</h3><div class="jj-tl" id="jj-tl">${ms.map(m => ligneMoment(m, ts)).join("")}</div></section>`
        : `<section class="pr-card bu-arb"><b>${UI.videT}</b><p>${UI.videP}</p>${S.canWrite ? `<div class="pl-acts"><button class="btn primary" data-act="jjajout">${UI.ajouter}</button></div>` : ""}</section>`}
      ${quiFaitQuoi()}
      ${ms.length ? `<button class="pr-row bu-pdf" data-act="jjpartager">${SVG('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>')}<span class="pr-rb"><b>${UI.partager}</b><span>${UI.partagerS}</span></span>${ctx.CHEV}</button>` : ""}</div>`;
  }

  /* ---------- 3.2 un moment ---------- */
  function photo(m) {
    const de = k => (S.inspirations || []).filter(x => x.thumb && ctx.inspTile(x) === k).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    const x = de(tuileDuMoment(m.nom)) || de("lieu"); return x ? x.thumb : null;
  }
  function brouillon(m, sujet, vendorId) {
    const b = m.brouillon; if (!b || !b.corps || b.k !== sujet || (sujet === "arrivee" && b.vendorId !== vendorId)) return "";
    const v = V(b.vendorId), to = v && /\S+@\S+\.\S+/.test(v.email || "") ? v.email.trim() : "";
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(b.objet || "")}&body=${encodeURIComponent(b.corps)}`;
    return `<div class="pl-brouillon"><span class="ev-tag">${UI.brouillon}</span><b>${esc(b.objet || "")}</b><p class="pl-p">${esc(b.corps)}</p>
      <div class="pl-acts"><a class="btn primary" href="${href}">${UI.ouvrirMail}</a><button class="btn" data-act="jjcopie" data-id="${esc(m.id)}">${UI.copier}</button>
      ${S.canWrite ? `<button class="link" data-act="jjcoach" data-id="${esc(m.id)}" data-sujet="${sujet}" data-v="${esc(vendorId || "")}">${UI.refaire}</button>` : ""}</div><p class="ev-note">${UI.rienEnvoye}</p></div>`;
  }
  const boutonCoach = (m, sujet, vendorId, label) => !S.canWrite ? "" : S.ui.jjCoach === `${m.id}|${sujet}|${vendorId || ""}`
    ? `<button class="btn sm" disabled>${UI.redige}</button>` : `<button class="btn sm" data-act="jjcoach" data-id="${esc(m.id)}" data-sujet="${sujet}" data-v="${esc(vendorId || "")}">${label}</button>`;
  function secPluie(m) {
    if (!m.exterieur) return "";
    const lieu = lieuReserve(S.vendors || []), dis = S.canWrite ? "" : "disabled";
    return `<section class="pr-card jj-pluie ${m.pluie ? "" : "vide"}" id="jj-sec-pluie"><h3 class="home-h">${UI.pluieT}</h3>
      <label class="sr" for="jj-pluie">${UI.pluieT}</label><textarea id="jj-pluie" class="pl-note" data-jjf="pluie" data-id="${esc(m.id)}" placeholder="${UI.pluiePh}" ${dis}>${esc(m.pluie)}</textarea>
      ${!m.pluie ? (lieu ? brouillon(m, "pluie") || boutonCoach(m, "pluie", "", UI.pluieCoach) : `<p class="ev-note">${UI.pasDeLieu}</p>`) : ""}
      ${S.ui.jjErr ? `<p class="brief-err" role="alert">${esc(UI.echec(S.ui.jjErr))}</p>` : ""}</section>`;
  }
  function secPrestas(m) {
    const dis = S.canWrite ? "" : "disabled", libres = reserves().filter(v => !m.prestas.some(p => p.vendorId === v.id));
    return `<section class="pr-sec" id="jj-sec-arrivee"><h3 class="home-h">${UI.prestasT}</h3>
      ${m.prestas.length ? `<div class="pr-box">${m.prestas.map((p, i) => { const v = V(p.vendorId); if (!v) return "";
        const sansH = v.status === "reserve" && minDe(p.arrivee) == null;
        return `<div class="jj-presta"><div class="jj-pt"><button class="jj-pn" data-fiche="${esc(v.id)}"><span class="pr-av t-${ctx.tintOf(v.cat)}" aria-hidden="true">${esc(ctx.initials(v.name))}</span><span class="pr-rb"><b>${esc(v.name)}</b><span>${esc(v.cat || "")}</span></span></button>
            ${S.canWrite ? `<button class="link" data-act="jjpout" data-id="${esc(m.id)}" data-i="${i}">${UI.retirer}</button>` : ""}</div>
          <div class="pl-f2"><label class="pl-f"><span>${UI.arrivee}</span><input type="time" data-jjp="arrivee" data-id="${esc(m.id)}" data-i="${i}" value="${esc(p.arrivee || "")}" ${dis}></label>
            <label class="pl-f"><span>${UI.tache}</span><input data-jjp="tache" data-id="${esc(m.id)}" data-i="${i}" value="${esc(p.tache || "")}" placeholder="${UI.tachePh}" maxlength="120" ${dis}></label></div>
          ${sansH ? `<div class="jj-ph"><span class="jj-bad">${UI.arriveeAFixer}</span>${brouillon(m, "arrivee", v.id) || boutonCoach(m, "arrivee", v.id, UI.arriveeCoach)}</div>` : ""}</div>`; }).join("")}</div>` : ""}
      ${S.canWrite ? (libres.length ? `<label class="pl-f"><span class="sr">${UI.ajouterPresta}</span><select data-jjadd="${esc(m.id)}"><option value="">${UI.ajouterPresta}</option>${libres.map(v => `<option value="${esc(v.id)}">${esc(v.name)} · ${esc(v.cat || "")}</option>`).join("")}</select></label>`
        : !reserves().length ? `<p class="ev-note">${UI.aucunReserve}</p>` : "") : ""}</section>`;
  }
  function secObjets(m) {
    const dis = S.canWrite ? "" : "disabled";
    const noms = [...new Set([...(S.guests || []).map(g => g.name), ...R().map(r => (personneDe(r, S.guests || []) || {}).nom)].filter(Boolean))];
    return `<section class="pr-sec" id="jj-sec-objet"><h3 class="home-h">${UI.objetsT}</h3>
      <datalist id="jj-noms">${noms.slice(0, 400).map(n => `<option value="${esc(n)}">`).join("")}</datalist>
      ${m.objets.length ? `<div class="pr-box">${m.objets.map(o => `<div class="jj-obj ${o.fait ? "fait" : ""}">
        <label class="jj-ck"><input type="checkbox" data-jjo="fait" data-id="${esc(m.id)}" data-o="${esc(o.id)}" ${o.fait ? "checked" : ""} ${dis}><span>${esc(o.label)}</span></label>
        <label class="jj-oq"><span class="sr">${UI.quiCharge}</span><input list="jj-noms" class="${String(o.qui || "").trim() ? "" : "vide"}" data-jjo="qui" data-id="${esc(m.id)}" data-o="${esc(o.id)}" value="${esc(o.qui || "")}" placeholder="${UI.aConfier}" ${dis}></label>
        ${S.canWrite ? `<button class="link" data-act="jjoout" data-id="${esc(m.id)}" data-o="${esc(o.id)}" aria-label="${esc(`${UI.retirer} ${o.label}`)}">${UI.retirer}</button>` : ""}</div>`).join("")}</div>` : ""}
      ${S.canWrite ? `<div class="jj-oadd"><label class="sr" for="jj-onew">${UI.objetsT}</label><input id="jj-onew" placeholder="${UI.objetPh}" maxlength="80" autocomplete="off"><button class="btn" data-act="jjoadd" data-id="${esc(m.id)}">${UI.ajouterObjet}</button></div>` : ""}</section>`;
  }
  function ligneDiner(m) {
    if (!/diner|repas/.test(fold(m.nom))) return "";
    const G = concernes(S.guests || [], { settings: S.settings || {}, moment: 2 }), n = G.length; if (!n) return "";
    const r = resume(tablesDe(S.tables || [], S.guests || []), G);
    return `<button class="pr-row" data-go="tables"><span class="pr-rb"><b>${UI.planTable}</b><span>${esc(UI.diner(n, r.places, r.tables))}</span></span>${ctx.CHEV}</button>`;
  }
  function vMoment(id) {
    const ms = M(), m = ms.find(x => x.id === id); if (!m) { S.f.jView = "main"; return vMain(); }
    const dis = S.canWrite ? "" : "disabled", ph = photo(m), lieu = m.lieuPrecis || m.lieu;
    const quand = m.debut != null ? `${hLisible(m.debut)} → ${hLisible(m.fin)}` : UI.sansHeure;
    return `<div class="ev-page pr-page jj-page">
      <div class="ev-cover jj-cover">${ph ? `<img class="jj-img" src="${esc(ph)}" alt="">` : `<span class="ev-ph ev-ph-ic cov" aria-hidden="true"><svg class="ev-ic" viewBox="0 0 24 24">${SOLEIL}</svg></span>`}
        <button class="ev-back" data-act="jjmain" aria-label="${UI.tousMoments}">${ctx.BACK_SVG}</button>
        <div class="ev-cover-b"><span class="jj-quand">${esc(quand)}${lieu ? ` · ${esc(lieu)}` : ""}</span><h2>${esc(m.nom)}</h2></div></div>
      <section class="pr-card pl-champs">
        <div class="pl-f2"><label class="pl-f"><span>${UI.debut}</span><input type="time" data-jjf="time" data-id="${esc(m.id)}" value="${esc(m.time || "")}" ${dis}></label>
          <label class="pl-f"><span>${UI.fin}</span><input type="time" data-jjf="fin" data-id="${esc(m.id)}" value="${esc(m.finEstimee ? "" : hDe(m.fin))}" placeholder="${m.fin != null ? esc(hDe(m.fin)) : ""}" ${dis}>${m.finEstimee && m.fin != null ? `<small>${esc(hLisible(m.fin))}</small>` : ""}</label></div>
        <label class="pl-f"><span>${UI.nom}</span><input data-jjf="title" data-id="${esc(m.id)}" value="${esc(m.nom)}" maxlength="80" ${dis}></label>
        <div class="pl-f2"><label class="pl-f"><span>${UI.lieu}</span><input data-jjf="lieu" data-id="${esc(m.id)}" value="${esc(m.lieu)}" maxlength="120" ${dis}></label>
          <label class="pl-f"><span>${UI.lieuPrecis}</span><input data-jjf="lieuPrecis" data-id="${esc(m.id)}" value="${esc(m.lieuPrecis)}" placeholder="${UI.lieuPrecisPh}" maxlength="120" ${dis}></label></div>
        <label class="pl-f"><span>${UI.detail}</span><input data-jjf="qui" data-id="${esc(m.id)}" value="${esc(m.detail)}" placeholder="${UI.detailPh}" maxlength="160" ${dis}></label>
        <div class="iv-moments">${[["cle", UI.cle], ["exterieur", UI.exterieur]].map(([k, l]) => `<button class="chip ${m[k] ? "acc" : ""}" data-act="jjdrap" data-id="${esc(m.id)}" data-k="${k}" aria-pressed="${m[k]}" ${dis}>${l}</button>`).join("")}</div>
      </section>
      ${secPluie(m)}${ligneDiner(m)}${secPrestas(m)}${secObjets(m)}
      <section class="pr-sec"><h3 class="home-h">${UI.voitT}</h3><div class="iv-moments">${Object.keys(VOIT_DEFAUT).map(k => `<button class="chip ${m.voit[k] ? "acc" : ""}" data-act="jjvoit" data-id="${esc(m.id)}" data-k="${k}" aria-pressed="${!!m.voit[k]}" ${dis}>${UI.voit[k]}</button>`).join("")}</div><p class="ev-note">${UI.voitP}</p></section>
      <section class="pr-sec"><h3 class="home-h">${UI.note}</h3><label class="sr" for="jj-note">${UI.note}</label><textarea id="jj-note" class="pl-note" data-jjf="note" data-id="${esc(m.id)}" placeholder="${UI.notePh}" ${dis}>${esc(m.note)}</textarea></section>
      ${S.canWrite ? `<button class="link iv-retirer" data-act="jjsuppr" data-id="${esc(m.id)}">${UI.supprimer}</button>` : ""}</div>`;
  }

  function vJourJ() {
    setTimeout(verifierTaches, 1500);
    if (S.f.jView === "partager") return vPartager();
    if (estLeJour(S.settings || {}, M(), new Date()) && !S.ui.jjFerme && S.f.jView !== "moment") return vDuJour();
    if (S.f.jView === "moment" && S.f.jMoment) return vMoment(S.f.jMoment);
    return vMain();
  }

  /* ---------- 3.3 partager : chacun sa version ---------- */
  const hh = mn => (mn != null ? hLisible(mn) : "—");
  const dCourt = ms => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const fiche = v => fichePrestataire(v, { moments: M(), roles: R(), guests: S.guests || [], acces: J().acces || {} });
  const envoiDe = v => (J().fiches || {})[v.id] || null;
  const telV = v => String(v.tel || "").trim();
  function texteEtat(e) {
    return e.k === "manque" ? UI.etat.manque[e.manque] : e.k === "prete" ? UI.etat.prete(e.n) : e.k === "envoyee" ? UI.etat.envoyee(dCourt(e.le)) : UI.etat.maj(dCourt(e.le));
  }
  function ongletInvites() {
    const ms = M(), vis = visiblesPar(ms, "invites"), a = J().acces || {}, dis = S.canWrite ? "" : "disabled";
    return `<section class="pr-sec"><h3 class="home-h">${esc(UI.invVoient(vis.length))}</h3>
        ${vis.length ? `<div class="pr-box">${vis.map(m => `<button class="iv-p" data-act="jjmoment" data-id="${esc(m.id)}"><span class="jj-h num">${esc(m.debut != null ? hDe(m.debut) : UI.sansHeure)}</span><span class="pr-rb"><b>${esc(m.nom)}</b>${m.lieuPrecis || m.lieu ? `<span>${esc(m.lieuPrecis || m.lieu)}</span>` : ""}</span></button>`).join("")}</div>` : `<p class="ev-note">${UI.aucunVisible}</p>`}
        ${ms.length > vis.length ? `<p class="ev-note">${esc(UI.invCaches(ms.length - vis.length))}</p>` : ""}</section>
      <section class="pr-card pl-champs">
        <label class="pl-f"><span>${UI.acces}</span><textarea class="pl-note" data-jjacces="texte" placeholder="${UI.accesPh}" ${dis}>${esc(a.texte || "")}</textarea></label>
        <label class="pl-f"><span>${UI.navettes}</span><textarea class="pl-note" data-jjacces="navettes" placeholder="${UI.navettesPh}" ${dis}>${esc(a.navettes || "")}</textarea></label></section>
      ${blocLienInvites()}
      <div class="pl-acts"><button class="btn" data-act="jjpdf" data-v="invites" ${vis.length ? "" : "disabled"}>${UI.pdfInvites}</button></div>`;
  }
  function ongletPrestas() {
    const vs = reserves(); if (!vs.length) return `<p class="ev-note">${UI.aucunReserveP}</p>`;
    const l = vs.map(v => ({ v, e: etatFiche(fiche(v), envoiDe(v)) })), prets = l.filter(x => x.e.k === "prete" || x.e.k === "maj");
    return `<div class="jj-fiches">${l.map(({ v, e }) => `<div class="pr-card jj-fiche ${e.k}">
        <button class="jj-pn" data-fiche="${esc(v.id)}"><span class="pr-av t-${ctx.tintOf(v.cat)}" aria-hidden="true">${esc(ctx.initials(v.name))}</span><span class="pr-rb"><b>${esc(v.name)}</b><span>${esc(v.cat || "")}</span></span></button>
        <span class="jj-etat ${e.k}">${esc(texteEtat(e))}</span>
        ${S.canWrite ? `<div class="pl-acts">${e.k === "manque" ? `<button class="btn" data-act="jjcompleter" data-id="${esc(v.id)}">${UI.completer}</button>`
          : `<button class="btn ${e.k === "envoyee" ? "" : "primary"}" data-act="jjenvoyer" data-id="${esc(v.id)}">${e.k === "prete" ? UI.envoyer : UI.renvoyer}</button>`}
          ${e.k !== "manque" || e.manque !== "moments" ? `<button class="link" data-act="jjpdf" data-v="fiche" data-id="${esc(v.id)}">${UI.voirPdf}</button>` : ""}</div>` : ""}</div>`).join("")}</div>
      ${S.canWrite && prets.length > 1 ? `<button class="btn primary jj-tout" data-act="jjenvoyertout">${UI.envoyerN(prets.length)}</button>` : ""}
      <p class="ev-note">${UI.pasDeBudget}</p>`;
  }
  function ongletTemoins() {
    const ms = M(), rs = R(), vs = reserves().filter(v => ms.some(m => m.prestas.some(p => p.vendorId === v.id))), pl = ms.filter(m => m.exterieur && m.pluie).length;
    const k = (n, l) => `<div><b class="num">${n}</b><span>${l}</span></div>`;
    return `<section class="pr-card"><div class="jj-kpis">${k(ms.length, UI.tem.moments)}${k(rs.length, UI.tem.roles)}${k(vs.length, UI.tem.prestas)}${k(pl, UI.tem.pluie)}</div><p class="ev-note">${UI.temP}</p></section>
      ${blocLiensTemoins()}
      <div class="pl-acts"><button class="btn" data-act="jjpdf" data-v="temoins" ${ms.length ? "" : "disabled"}>${UI.pdfTemoins}</button></div>`;
  }
  function vPartager() {
    const tab = ["invites", "prestataires", "temoins"].includes(S.f.jTab) ? S.f.jTab : "invites";
    return `<div class="ev-page pl-tache jj-part"><button class="link env-back" data-act="jjmain">${ctx.BACK_SVG}<span>${UI.titre}</span></button>
      <h2 class="ev-h2">${UI.chacun}</h2><p class="ev-note">${UI.chacunP}</p>
      <div class="seg jj-tabs" role="tablist">${Object.entries(UI.onglets).map(([k, l]) => `<button role="tab" data-act="jjtab" data-v="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${l}</button>`).join("")}</div>
      ${tab === "invites" ? ongletInvites() : tab === "prestataires" ? ongletPrestas() : ongletTemoins()}</div>`;
  }

  /* ---------- PDF des trois versions ---------- */
  function specInvites() {
    const ms = visiblesPar(M(), "invites"), a = J().acces || {};
    return ["Jour J - invités.pdf", { docTitle: "Le déroulé de la journée", blocks: [
      { table: { head: ["Heure", "Moment", "Lieu"], widths: [22, null, 62], boldFirst: true, body: ms.map(m => [hh(m.debut), m.nom, m.lieuPrecis || m.lieu || ""]) } },
      ...(a.texte ? [{ h2: UI.acces }, { p: a.texte }] : []), ...(a.navettes ? [{ h2: UI.navettes }, { p: a.navettes }] : [])] }];
  }
  function specFiche(v) {
    const f = fiche(v), pluie = f.moments.filter(s => s.pluie);
    return [`Fiche jour J - ${v.name}.pdf`, { docTitle: `Fiche jour J · ${v.name}`, blocks: [
      { kpis: [["Arrivée", hh(f.arrivee), ""], ["Vos moments", String(f.moments.length), ""], ["Contact sur place", f.contact ? f.contact.nom : "—", f.contact && f.contact.tel ? f.contact.tel : ""]] },
      { h2: "Vos moments" }, { table: { head: ["Horaires", "Moment", "Lieu", "Arrivée", "Ce que vous faites"], widths: [26, null, 36, 18, 44], boldFirst: true,
        body: f.moments.map(s => [`${hh(s.debut)} – ${hh(s.fin)}`, s.nom, s.lieu || "", hh(s.arrivee), s.tache || ""]) } },
      ...(pluie.length ? [{ h2: "S'il pleut" }, { ul: pluie.map(s => `${s.nom} : ${s.pluie}`) }] : []),
      ...(f.journee.length ? [{ h2: "La journée" }, { ul: f.journee.map(j => `${hh(j.debut)} · ${j.nom}`) }] : []),
      ...(f.acces ? [{ h2: UI.acces }, { p: f.acces }] : []),
      ...(f.contact ? [{ h2: "Contact sur place" }, { p: [f.contact.nom, f.contact.tel].filter(Boolean).join(" · ") }] : [])] }];
  }
  function specTemoins() {
    const ms = M(), g = S.guests || [], a = J().acces || {};
    const vs = reserves().filter(v => ms.some(m => m.prestas.some(p => p.vendorId === v.id)));
    const objets = ms.flatMap(m => m.objets.map(o => `${o.label} (${m.nom}) : ${String(o.qui || "").trim() || UI.aConfier}${o.fait ? " ✓" : ""}`));
    return ["Jour J - témoins.pdf", { docTitle: "Le jour J, pour les témoins", blocks: [
      { table: { head: ["Horaires", "Moment", "Lieu", "Détail"], widths: [26, null, 40, 48], boldFirst: true, body: ms.map(m => [m.debut != null ? `${hh(m.debut)} – ${hh(m.fin)}` : "—", m.nom + (m.note ? "\n" + m.note : ""), m.lieuPrecis || m.lieu || "", m.detail || ""]) } },
      { h2: UI.quiFait }, { table: { head: ["Rôle", "Qui", "Téléphone"], widths: [60, null, 36], boldFirst: true, body: R().map(r => { const p = personneDe(r, g); return [r.nom, p ? p.nom : UI.aConfier, p && p.tel ? p.tel : ""]; }) } },
      ...(vs.length ? [{ h2: "Les prestataires" }, { table: { head: ["Prestataire", "Métier", "Téléphone", "Arrivée"], widths: [null, 36, 34, 18], boldFirst: true, body: vs.map(v => [v.name, v.cat || "", telV(v), hh(fiche(v).arrivee)]) } }] : []),
      ...(ms.some(m => m.exterieur) ? [{ h2: "S'il pleut" }, { ul: ms.filter(m => m.exterieur).map(m => `${m.nom} : ${m.pluie || "à prévoir"}`) }] : []),
      ...(objets.length ? [{ h2: UI.objetsT }, { ul: objets }] : []),
      ...(a.texte ? [{ h2: UI.acces }, { p: a.texte }] : []), ...(a.navettes ? [{ h2: UI.navettes }, { p: a.navettes }] : [])] }];
  }
  function pdf(k, id) {
    const sp = k === "invites" ? specInvites() : k === "temoins" ? specTemoins() : (() => { const v = V(id); return v ? specFiche(v) : null; })();
    if (sp) ctx.makePdf(sp[0], sp[1]);
  }

  /* ---------- envoi des fiches (un brouillon après l'autre ; la feuille de partage du téléphone joint le PDF) ---------- */
  async function ouvrirEnvoi(ids) {
    ids = ids.filter(id => V(id)); if (!ids.length) return;
    S.ui.jjEnvoi = { ids, i: 0, file: null, pour: null, err: null }; rendreEnvoi();
    const manquent = ids.filter(id => !(J().messages || {})[id]);
    if (manquent.length) {
      S.ui.jjEnvoi.redige = true; majEnvoi();
      const infos = Object.fromEntries(manquent.map(id => { const f = fiche(V(id)); return [id, { arrivee: f.arrivee != null ? hDe(f.arrivee) : null, moments: f.moments.length }]; }));
      try { const r = await ctx.runAgentNow("jourj", { sujet: "fiches", ids: manquent, infos }); if (r && r.ok === false) S.ui.jjEnvoi.err = r.erreur || "erreur"; else if (r && r.messages) S.jourj = { ...J(), messages: { ...(J().messages || {}), ...r.messages } }; }
      catch (e) { if (S.ui.jjEnvoi) S.ui.jjEnvoi.err = e.message || "erreur"; }
      if (S.ui.jjEnvoi) { S.ui.jjEnvoi.redige = false; majEnvoi(); }
    }
  }
  async function preparerFichier() {
    const e = S.ui.jjEnvoi; if (!e) return; const id = e.ids[e.i]; if (e.pour === id) return;
    e.pour = id; e.file = null; const v = V(id); if (!v) return; const [nom, spec] = specFiche(v);
    const f = await ctx.pdfFile(nom, spec); if (S.ui.jjEnvoi === e && e.pour === id) { e.file = f; majEnvoi(); }
  }
  function rendreEnvoi() {
    const e = S.ui.jjEnvoi; if (!e) return; const v = V(e.ids[e.i]); if (!v) return;
    const m = (J().messages || {})[v.id], fait = envoiDe(v) && etatFiche(fiche(v), envoiDe(v)).k === "envoyee";
    const to = /\S+@\S+\.\S+/.test(v.email || "") ? v.email.trim() : "";
    const href = m ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(m.objet)}&body=${encodeURIComponent(m.corps)}` : "";
    const peutPartager = !!(e.file && navigator.canShare && navigator.canShare({ files: [e.file] }));
    const url = e.file ? URL.createObjectURL(e.file) : "", dernier = e.i >= e.ids.length - 1;
    ctx.layer(`<div class="ov"><div class="modal iv-pick jj-envoi" role="dialog" aria-modal="true" aria-label="${esc(UI.envoiT(e.i + 1, e.ids.length))}">
      <span class="ev-tag">${esc(UI.envoiT(e.i + 1, e.ids.length))}</span><h3>${esc(v.name)}</h3>
      ${e.redige ? `<p class="ai-pending" role="status">${UI.redigeMsgs}</p>` : e.err && !m ? `<p class="brief-err" role="alert">${esc(UI.echec(e.err))}</p>` : ""}
      ${m ? `<div class="pl-brouillon"><b>${esc(m.objet)}</b><p class="pl-p">${esc(m.corps)}</p></div>` : ""}
      ${fait ? `<p class="ok-t">✓ ${esc(UI.etat.envoyee(dCourt(envoiDe(v).envoyeLe)))}</p>` : ""}
      <p class="ev-note">${UI.partagerP}</p>
      <div class="pl-acts">${peutPartager ? `<button class="btn primary" data-act="jjshare">${UI.partagerFiche}</button>` : ""}
        ${m ? `<a class="btn ${peutPartager ? "" : "primary"}" href="${href}">${UI.ouvrirMailSans}</a>` : ""}
        ${url ? `<a class="btn" href="${url}" download="${esc(e.file.name)}">${UI.telecharger}</a>` : ""}</div>
      <div class="acts"><button type="button" class="link" data-act="jjmarquer">${UI.marquerEnvoyee}</button><div><button type="button" class="btn" data-act="jjsuiv">${dernier ? UI.termine : fait ? UI.suivante : UI.passer}</button></div></div></div></div>`);
    preparerFichier();
  }
  // mise à jour de la feuille seulement si elle est encore ouverte (jamais rouverte d'elle-même)
  const majEnvoi = () => { if (document.querySelector(".jj-envoi")) rendreEnvoi(); };
  async function marquerEnvoyee() {
    const e = S.ui.jjEnvoi; if (!e) return; const v = V(e.ids[e.i]); if (!v) return;
    const fiches = { ...(J().fiches || {}), [v.id]: { envoyeLe: Date.now(), empreinte: empreinteFiche(fiche(v)) } };
    await ctx.setMeta("jourj", { fiches }); ctx.toast(UI.envoyeeOk(v.name)); setTimeout(majEnvoi, 200);
  }
  async function partagerFiche() {
    const e = S.ui.jjEnvoi; if (!e || !e.file) return; const m = (J().messages || {})[e.ids[e.i]] || {};
    try { await navigator.share({ files: [e.file], title: m.objet || e.file.name, text: m.corps || "" }); await marquerEnvoyee(); }
    catch (err) { if (err && err.name !== "AbortError") ctx.toast(err.message || "Partage impossible"); }
  }
  function suivante() {
    const e = S.ui.jjEnvoi; if (!e) return;
    if (e.i >= e.ids.length - 1) { S.ui.jjEnvoi = null; ctx.closeModal(); ctx.render(); return; }
    e.i++; e.pour = null; e.file = null; rendreEnvoi();
  }

  /* ---------- compléter une fiche ---------- */
  function completer(v) {
    const f = fiche(v);
    if (f.manque === "moments") return ouvrirChoix(v);
    if (f.manque === "arrivee") { const m = M().find(x => x.prestas.some(p => p.vendorId === v.id && minDe(p.arrivee) == null)); if (m) ouvrirMoment(m.id, "arrivee"); return; }
    if (f.manque === "contact") {
      if (!R().some(r => r.id === "contact" || /contact/i.test(r.nom || ""))) setRoles([...R(), { id: "contact", nom: "Contact des prestataires" }]).then(() => ouvrirRole("contact"));
      else ouvrirRole((R().find(r => r.id === "contact") || R().find(r => /contact/i.test(r.nom || ""))).id);
    }
  }
  function ouvrirChoix(v) {
    const ms = M(), sugg = new Set(momentsPourMetier(v.cat, ms, v.id).map(m => m.id));
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${esc(UI.choisirT(v.name))}"><h3>${esc(UI.choisirT(v.name))}</h3><p class="ev-note">${UI.choisirP}</p>
      <div class="pr-box">${ms.map(m => { const deja = m.prestas.some(p => p.vendorId === v.id);
        return `<label class="jj-ck jj-choix"><input type="checkbox" name="jjm" value="${esc(m.id)}" ${deja || sugg.has(m.id) ? "checked" : ""}><span class="jj-h num">${esc(m.debut != null ? hDe(m.debut) : UI.sansHeure)}</span><span>${esc(m.nom)}</span></label>`; }).join("")}</div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="button" class="btn primary" data-act="jjchoix" data-id="${esc(v.id)}">${UI.enregistrer}</button></div></div></div></div>`);
  }
  async function enregistrerChoix(vid) {
    const coches = new Set([...document.querySelectorAll('input[name="jjm"]:checked')].map(x => x.value)); ctx.closeModal();
    const avant = [];
    for (const m of M()) {
      const deja = m.prestas.some(p => p.vendorId === vid), veut = coches.has(m.id); if (deja === veut) continue;
      const d = doc(m.id); avant.push([m.id, (d && d.prestas) || []]);
      await setPrestas(m.id, l => { if (veut) l.push({ vendorId: vid, arrivee: "", tache: "" }); else { const i = l.findIndex(p => p.vendorId === vid); if (i >= 0) l.splice(i, 1); } });
    }
    if (avant.length) ctx.toastUndo(UI.ajoutes(coches.size), async () => { for (const [id, l] of avant) await ctx.patch("schedule", id, { prestas: l }); });
  }

  /* ---------- 5.4 : un prestataire qu'on vient de réserver ---------- */
  const suggestion = v => (v && !v._prive && v.status === "reserve" ? momentsPourMetier(v.cat, M(), v.id) : []);
  async function ajouterAuJourJ(v) {
    const ms = suggestion(v); if (!ms.length) return 0; const avant = [];
    for (const m of ms) { const d = doc(m.id); avant.push([m.id, (d && d.prestas) || []]); await setPrestas(m.id, l => l.push({ vendorId: v.id, arrivee: "", tache: "" })); }
    ctx.toastUndo(UI.ajoutes(ms.length), async () => { for (const [id, l] of avant) await ctx.patch("schedule", id, { prestas: l }); });
    return ms.length;
  }

  /* ---------- 5.4 : un trou encore là un mois avant → une tâche « Les derniers réglages » (une fois, jamais recréée) ---------- */
  let verifie = false;
  async function verifierTaches() {
    if (verifie || !S.canWrite || !S.db || !S.jourjLu || !moisAvant(S.settings || {}, new Date())) return; verifie = true;
    const deja = new Set(J().tachesCreees || []), ts = trous().filter(t => !deja.has(cleTrou(t))); if (!ts.length) return;
    for (const t of ts) await ctx.creerSiAbsent(`tasks/jj-${cleTrou(t).replace(/[^\w-]/g, "_")}`, { title: UI.trou[t.k](t), phase: "m1", owner: "deux", status: "todo", note: "", order: 999, source: "jourj", sourceId: cleTrou(t), createdAt: Date.now() });
    await ctx.setMeta("jourj", { tachesCreees: [...deja, ...ts.map(cleTrou)] });
  }

  /* ---------- 3.4 le jour même ---------- */
  const vueJour = () => vueTemoins({ schedule: S.schedule || [], vendors: S.vendors || [], guests: S.guests || [], jourj: J(), settings: S.settings || {}, roleId: "", noms: {} });
  // le prénom d'un témoin dont le lien a été partagé (« [Prénom] a le même écran »)
  function avecQui() {
    const t = (J().liens || {}).temoins || {}, r = R().find(x => t[x.id] && t[x.id].partageLe), p = r && personneDe(r, S.guests || []);
    return p ? p.nom.split(/\s+/)[0] : "";
  }
  function vDuJour() {
    document.body.classList.add("jj-live");
    return `<div class="jj-jour">${rendreJour(vueJour(), heureDuJour().mn, { fermer: true, peutDecaler: S.canWrite, confirmer: !!S.ui.jjConf, annuler: S.canWrite, avecQui: avecQui() })}</div>`;
  }
  setInterval(() => { if (S.view === "jour-j" && document.body.classList.contains("jj-live") && !document.hidden && !S.ui.jjConf) ctx.render(); }, 60e3);
  async function decaler() {
    S.ui.jjConf = false; const d = aDecaler(M(), heureDuJour().mn, 15);
    if (!d.length) { ctx.toast(UI.rienADecaler); ctx.render(); return; }
    for (const x of d) await ctx.patch("schedule", x.id, { time: x.apres.time, ...(x.apres.fin ? { fin: x.apres.fin } : {}) });
    const entree = { at: Date.now(), de: 15, par: ctx.prenom(), ids: d.map(x => x.id), avant: Object.fromEntries(d.map(x => [x.id, x.avant])) };
    await ctx.setMeta("jourj", { retards: [...(J().retards || []), entree].slice(-30) });
    ctx.toastUndo(UI.decaleOk(d.length), () => annulerRetard(entree.at)); ctx.render();
  }
  async function annulerRetard(at) {
    const l = (J().retards || []).slice(), i = at ? l.findIndex(x => x.at === at) : l.map(x => !x.annuleLe).lastIndexOf(true); if (i < 0 || l[i].annuleLe) return;
    for (const [id, a] of Object.entries(l[i].avant || {})) if (doc(id)) await ctx.patch("schedule", id, { time: a.time, ...(a.fin ? { fin: a.fin } : {}) });
    l[i] = { ...l[i], annuleLe: Date.now() }; await ctx.setMeta("jourj", { retards: l }); ctx.toast(UI.retardAnnule); ctx.render();
  }

  /* ---------- liens des témoins et des invités (section 4) ---------- */
  const urlLien = t => `${location.origin}/jourj#t=${t}`;
  const lienDe = (type, roleId) => { const l = J().liens || {}; return type === "invites" ? l.invites || null : ((l.temoins || {})[roleId] || null); };
  async function creerLien(type, roleId) {
    S.ui.jjLien = `${type}|${roleId || ""}`; ctx.render();
    try { await ctx.lienJourJ({ type, roleId, action: "creer" }); ctx.toast(UI.lienCree); }
    catch (e) { ctx.toast(UI.echecLien(e.message || "erreur")); }
    S.ui.jjLien = null; ctx.render();
  }
  async function partagerLien(type, roleId) {
    const l = lienDe(type, roleId); if (!l) return; const url = urlLien(l.token), r = R().find(x => x.id === roleId);
    const texte = type === "invites" ? `${UI.lienTexteInv} ${url}` : UI.lienTexteTem(r ? r.nom : "", url);
    const noter = () => { const L = { temoins: {}, ...(J().liens || {}) }; if (type === "invites") L.invites = { ...l, partageLe: Date.now() }; else L.temoins = { ...(L.temoins || {}), [roleId]: { ...l, partageLe: Date.now() } }; return ctx.setMeta("jourj", { liens: L }); };
    try { if (navigator.share) { await navigator.share({ text: texte }); await noter(); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(texte); ctx.toast(UI.lienCopie); await noter(); } catch {}
  }
  async function revoquerLien(type, roleId) { try { await ctx.lienJourJ({ type, roleId, action: "revoquer" }); ctx.toast(UI.lienRevoque); } catch (e) { ctx.toast(e.message || "Erreur"); } }
  function etatLien(l) { return !l ? UI.sansLien : l.partageLe ? UI.partageLe(dCourt(l.partageLe)) : UI.cree; }
  function actionsLien(type, roleId, possible = true) {
    if (!S.canWrite) return ""; const l = lienDe(type, roleId), busy = S.ui.jjLien === `${type}|${roleId || ""}`;
    if (!l) return possible ? `<button class="btn sm" data-act="jjlien" data-t="${type}" data-r="${esc(roleId || "")}" ${busy ? "disabled" : ""}>${UI.creerLien}</button>` : "";
    return `<button class="btn sm primary" data-act="jjlienpart" data-t="${type}" data-r="${esc(roleId || "")}">${UI.partagerLien}</button><button class="link" data-act="jjlienrev" data-t="${type}" data-r="${esc(roleId || "")}">${UI.revoquer}</button>`;
  }
  function blocLienInvites() {
    const l = lienDe("invites");
    return `<section class="pr-card jj-lien"><h3 class="home-h">${UI.lienInvT}</h3><p class="ev-note">${UI.lienInvP}</p><span class="jj-etat ${l ? "prete" : ""}">${esc(etatLien(l))}</span><div class="pl-acts">${actionsLien("invites")}</div></section>`;
  }
  function blocLiensTemoins() {
    const g = S.guests || [];
    return `<section class="pr-sec"><h3 class="home-h">${UI.liensTemT}</h3><p class="ev-note">${UI.liensTemP}</p><div class="pr-box">${R().map(r => { const p = personneDe(r, g), l = lienDe("temoin", r.id);
      return `<div class="jj-lr"><span class="pr-rb"><b>${esc(r.nom)}</b><span>${esc(p ? `${p.nom} · ${etatLien(l)}` : UI.aConfierAvant)}</span></span><div class="jj-la">${actionsLien("temoin", r.id, !!p)}${!p && S.canWrite ? `<button class="link" data-act="jjrole" data-id="${esc(r.id)}">${UI.completer}</button>` : ""}</div></div>`; }).join("")}
      ${S.canWrite ? `<button class="iv-p plus" data-act="jjtemoinajout"><span class="pr-rb"><b>${UI.ajouterTemoin}</b></span></button>` : ""}</div></section>`;
  }

  /* ---------- écritures ---------- */
  const show = (v, id) => { S.f.jView = v; if (id) S.f.jMoment = id; ctx.saveF(); ctx.render(); window.scrollTo(0, 0); };
  const ouvrirMoment = (id, sec) => { show("moment", id); if (sec) setTimeout(() => { const el = document.getElementById(`jj-sec-${sec}`); if (el) el.scrollIntoView({ block: "center" }); }, 120); };
  async function champ(id, k, v) {
    const d = doc(id); if (!d || !S.canWrite) return;
    let val = typeof v === "string" ? v.trim() : v;
    if (k === "title" && !val) return ctx.render();
    if ((d[k] ?? "") === val) return;
    await ctx.patch("schedule", id, { [k]: val, ...(d.template && (k === "time" || k === "title") ? { template: false } : {}) });
  }
  async function setPrestas(id, f) { const d = doc(id); if (!d) return; const l = (Array.isArray(d.prestas) ? d.prestas : []).map(x => ({ ...x })); f(l); await ctx.patch("schedule", id, { prestas: l }); }
  async function setObjets(id, f) { const d = doc(id); if (!d) return; const l = (Array.isArray(d.objets) ? d.objets : []).map(x => ({ ...x })); f(l); await ctx.patch("schedule", id, { objets: l }); }
  async function supprimer(id) {
    const d = doc(id); if (!d) return; const { id: _i, ...data } = d;
    if (await ctx.remove("schedule", id)) { show("main"); ctx.toastUndo(UI.supprime(d.title || ""), () => ctx.setRaw(`schedule/${id}`, data)); }
  }
  async function demanderCoach(id, sujet, vendorId) {
    const k = `${id}|${sujet}|${vendorId || ""}`; if (S.ui.jjCoach) return; S.ui.jjCoach = k; S.ui.jjErr = null; ctx.render();
    try { const r = await ctx.runAgentNow("jourj", { id, sujet, vendorId }); if (r && r.ok === false) S.ui.jjErr = r.erreur || "erreur"; }
    catch (e) { S.ui.jjErr = e.message || "erreur"; }
    S.ui.jjCoach = null; ctx.render();
  }

  /* ---------- ajouter un moment ---------- */
  function ouvrirAjout() {
    const ms = M().filter(m => m.debut != null), apres = ms.length ? ms[ms.length - 1].fin : null;
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.ajouter}"><h3>${UI.ajouter}</h3>
      <label class="pl-f"><span>${UI.nom}</span><input id="jj-anom" placeholder="${UI.nomPh}" maxlength="80" autocomplete="off"></label>
      <div class="pl-f2"><label class="pl-f"><span>${UI.debut}</span><input type="time" id="jj-adeb" value="${apres != null ? hDe(apres) : ""}"></label><label class="pl-f"><span>${UI.fin}</span><input type="time" id="jj-afin"></label></div>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.annuler}</button><button type="button" class="btn primary" data-act="jjcreer">${UI.creer}</button></div></div></div></div>`);
    setTimeout(() => { const el = document.getElementById("jj-anom"); if (el) el.focus(); }, 50);
  }
  async function creer() {
    const v = k => ((document.getElementById(k) || {}).value || "").trim(), title = v("jj-anom"); if (!title) { const el = document.getElementById("jj-anom"); if (el) el.focus(); return; }
    const data = { title, time: v("jj-adeb"), ...(v("jj-afin") ? { fin: v("jj-afin") } : {}) };
    ctx.closeModal(); const id = await ctx.addDoc("schedule", data); if (id) ouvrirMoment(id);
  }

  /* ---------- rôles ---------- */
  async function setRoles(l) { await ctx.setMeta("jourj", { roles: l }); majRole(); }
  const roleDe = id => R().find(r => r.id === id);
  function feuilleRole(r) {
    const g = S.guests || [], p = personneDe(r, g), q = fold(S.ui.jjRq || "");
    const liste = g.filter(x => !q || fold(x.name).includes(q)).sort((a, b) => String(a.name).localeCompare(b.name)).slice(0, 40);
    return `<label class="pl-f"><span>${UI.roleNom}</span><input data-jjrnom="${esc(r.id)}" value="${esc(r.nom)}" maxlength="60" autocomplete="off"></label>
      <h4 class="home-h">${UI.qui}</h4>
      <p class="jj-rp">${p ? `<span class="iv-av" aria-hidden="true">${esc(ctx.initials(p.nom))}</span><b>${esc(p.nom)}</b><button class="link" data-act="jjrvide" data-id="${esc(r.id)}">${UI.retirerPersonne}</button>` : `<span class="jj-aconfier">${UI.personneVide}</span>`}</p>
      <label class="pl-f"><span class="sr">${UI.chercher}</span><input type="search" id="jj-rq" data-jjrq="${esc(r.id)}" value="${esc(S.ui.jjRq || "")}" placeholder="${UI.chercher}" autocomplete="off"></label>
      <div class="pr-box jj-rlist">${liste.length ? liste.map(x => `<button class="iv-p" data-act="jjrpick" data-id="${esc(r.id)}" data-gid="${esc(x.id)}" aria-pressed="${r.guestId === x.id}"><span class="iv-av" aria-hidden="true">${esc(ctx.initials(x.name))}</span><span class="pr-rb"><b>${esc(x.name)}</b>${x.group ? `<span>${esc(x.group)}</span>` : ""}</span></button>`).join("") : `<p class="ev-note">${UI.aucunInvite}</p>`}</div>
      <div class="pl-f2"><label class="pl-f"><span>${UI.nomLibre}</span><input data-jjrlibre="${esc(r.id)}" value="${esc(r.guestId ? "" : r.personne || "")}" placeholder="${UI.nomLibrePh}" maxlength="60" autocomplete="off"></label>
        <label class="pl-f"><span>${UI.tel}</span><input type="tel" data-jjrtel="${esc(r.id)}" value="${esc(r.tel || "")}" maxlength="30" autocomplete="off"></label></div>
      <div class="acts"><button type="button" class="link iv-retirer" data-act="jjrsuppr" data-id="${esc(r.id)}">${UI.supprimerRole}</button><div><button type="button" class="btn" data-close="1">${UI.fermer}</button></div></div>`;
  }
  function ouvrirRole(id) {
    const r = roleDe(id); if (!r || !S.canWrite) return; S.ui.jjRole = id; S.ui.jjRq = "";
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${esc(r.nom)}"><div id="jj-role">${feuilleRole(r)}</div></div></div>`);
  }
  function majRole(focusQ) {
    setTimeout(() => { const el = document.getElementById("jj-role"), r = S.ui.jjRole && roleDe(S.ui.jjRole); if (!el || !r) return; el.innerHTML = feuilleRole(r);
      if (focusQ) { const q = document.getElementById("jj-rq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } }, focusQ ? 0 : 250);
  }
  const majR = (id, o) => setRoles(R().map(r => (r.id === id ? { ...r, ...o } : r)));
  function telDe(gid) { const g = (S.guests || []).find(x => x.id === gid); if (!g) return ""; const f = (S.foyers || []).find(x => x.id === g.foyerId); return String((g.tel || (f && f.tel) || "")).trim(); }

  /* ---------- coucher du soleil : choisir la ville ---------- */
  function ouvrirSoleil() {
    const cur = (S.jourj || {}).soleil || "", noms = [...new Set(VILLES.map(v => v.nom))].sort((a, b) => a.localeCompare(b, "fr"));
    ctx.layer(`<div class="ov" data-close="1"><div class="modal iv-pick" role="dialog" aria-modal="true" aria-label="${UI.soleilT}"><h3>${UI.soleilT}</h3><p class="ev-note">${UI.soleilP}</p>
      <label class="pl-f"><span>${UI.lieu}</span><select data-jjsoleil="1"><option value="">${UI.soleilAuto}</option>${noms.map(n => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <div class="acts"><div></div><div><button type="button" class="btn" data-close="1">${UI.fermer}</button></div></div></div></div>`);
  }

  /* ---------- glisser pour réordonner : le moment prend une heure entre ses voisins, les autres ne bougent pas ---------- */
  let dr = null;
  document.addEventListener("pointerdown", e => {
    const g = e.target.closest && e.target.closest(".jj-grip"); if (!g || !S.canWrite || e.button > 0) return;
    const row = g.closest(".jj-l"), list = row && row.parentElement; if (!list) return;
    e.preventDefault(); const rows = [...list.querySelectorAll(".jj-l")];
    dr = { id: row.dataset.mid, row, list, y0: e.clientY, i0: rows.indexOf(row), idx: rows.indexOf(row), y: e.clientY };
    row.classList.add("jj-drag"); try { g.setPointerCapture(e.pointerId); } catch {}
  });
  function bougerDr(y) {
    if (!dr) return; dr.y = y; dr.row.style.transform = `translateY(${y - dr.y0}px)`;
    const autres = [...dr.list.querySelectorAll(".jj-l")].filter(r => r !== dr.row);
    dr.idx = autres.filter(r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 < y; }).length;
    autres.forEach((r, i) => { r.classList.toggle("jj-ins", i === dr.idx); r.classList.toggle("jj-ins-apres", dr.idx === autres.length && i === autres.length - 1); });
    const v = y > innerHeight - 90 ? 10 : y < 90 ? -10 : 0;
    if (v && !dr.raf) { const pas = () => { if (!dr) return; const w = dr.y > innerHeight - 90 ? 10 : dr.y < 90 ? -10 : 0; if (!w) { dr.raf = null; return; } scrollBy(0, w); dr.y0 -= w; bougerDr(dr.y); dr.raf = requestAnimationFrame(pas); }; dr.raf = requestAnimationFrame(pas); }
  }
  document.addEventListener("pointermove", e => { if (dr) { e.preventDefault(); bougerDr(e.clientY); } }, { passive: false });
  document.addEventListener("touchmove", e => { if (dr && e.cancelable) e.preventDefault(); }, { passive: false });
  async function finDr(poser) {
    if (!dr) return; const d = dr; dr = null; if (d.raf) cancelAnimationFrame(d.raf);
    d.row.style.transform = ""; d.row.classList.remove("jj-drag"); d.list.querySelectorAll(".jj-ins,.jj-ins-apres").forEach(r => r.classList.remove("jj-ins", "jj-ins-apres"));
    if (!poser || d.idx === d.i0) return;
    const autres = M().filter(m => m.id !== d.id), m = M().find(x => x.id === d.id), s = doc(d.id); if (!m || !s) return;
    const deb = heureEntre(autres[d.idx - 1] ? autres[d.idx - 1].debut : null, autres[d.idx] ? autres[d.idx].debut : null);
    const avant = { time: s.time || "", fin: s.fin || "", template: !!s.template }, o = { time: hDe(deb), template: false };
    if (m.finSaisie != null && m.debut != null) o.fin = hDe(deb + (m.finSaisie - m.debut));
    if (await ctx.patch("schedule", d.id, o)) ctx.toastUndo(UI.deplace(m.nom, hLisible(deb)), () => ctx.patch("schedule", d.id, avant));
  }
  document.addEventListener("pointerup", () => finDr(true));
  document.addEventListener("pointercancel", () => finDr(false));

  /* ---------- gestes ---------- */
  function act(a, t) {
    if (!a || !a.startsWith("jj")) return false;
    const id = t.dataset.id;
    switch (a) {
      case "jjmain": show("main"); return true;
      case "jjmoment": ouvrirMoment(id); return true;
      case "jjajout": if (S.canWrite) ouvrirAjout(); return true;
      case "jjcreer": creer(); return true;
      case "jjcalertout": S.ui.jjCalerTout = !S.ui.jjCalerTout; ctx.render(); return true;
      case "jjtrou": { const tr = trous()[+t.dataset.i]; if (!tr) return true; if (tr.k === "role") ouvrirRole(tr.roleId); else if (tr.k === "fiche") { S.f.jTab = "prestataires"; show("partager"); } else ouvrirMoment(tr.momentId, tr.k); return true; }
      case "jjrole": ouvrirRole(id); return true;
      case "jjroleajout": { const r = { id: `r${uid()}`, nom: UI.nouveauRole }; setRoles([...R(), r]).then(() => ouvrirRole(r.id)); return true; }
      case "jjrpick": { const g = (S.guests || []).find(x => x.id === t.dataset.gid), r = roleDe(id); if (!g || !r) return true;
        majR(id, { guestId: g.id, personne: "", tel: r.tel || telDe(g.id) }); ctx.toast(UI.confie(r.nom, g.name)); return true; }
      case "jjrvide": majR(id, { guestId: "", personne: "" }); return true;
      case "jjrsuppr": { const avant = R(), r = roleDe(id); ctx.closeModal(); S.ui.jjRole = null; setRoles(avant.filter(x => x.id !== id)); ctx.toastUndo(UI.roleSupprime(r ? r.nom : ""), () => setRoles(avant)); return true; }
      case "jjsoleil": ouvrirSoleil(); return true;
      case "jjdrap": { const d = doc(id); if (d) champ(id, t.dataset.k, !d[t.dataset.k]); return true; }
      case "jjvoit": { const d = doc(id); if (!d) return true; const v = { ...VOIT_DEFAUT, ...(d.voit || {}) }; v[t.dataset.k] = !v[t.dataset.k]; ctx.patch("schedule", id, { voit: v }); return true; }
      case "jjpout": { const i = +t.dataset.i, d = doc(id), avant = (d && d.prestas) || [], v = avant[i] && V(avant[i].vendorId);
        setPrestas(id, l => l.splice(i, 1)); ctx.toastUndo(`${UI.retirer} ${v ? v.name : ""}`.trim(), () => ctx.patch("schedule", id, { prestas: avant })); return true; }
      case "jjoadd": { const el = document.getElementById("jj-onew"), label = el ? el.value.trim() : ""; if (!label) { if (el) el.focus(); return true; }
        setObjets(id, l => l.push({ id: uid(), label, qui: "", fait: false })); return true; }
      case "jjoout": { const d = doc(id), avant = (d && d.objets) || []; setObjets(id, l => { const i = l.findIndex(o => o.id === t.dataset.o); if (i >= 0) l.splice(i, 1); });
        ctx.toastUndo(UI.retirer, () => ctx.patch("schedule", id, { objets: avant })); return true; }
      case "jjcoach": demanderCoach(id, t.dataset.sujet === "arrivee" ? "arrivee" : "pluie", t.dataset.v || ""); return true;
      case "jjcopie": { const d = doc(id), b = d && d.brouillon; if (b) navigator.clipboard.writeText(`${b.objet ? b.objet + "\n\n" : ""}${b.corps}`).then(() => ctx.toast(UI.copie), () => {}); return true; }
      case "jjsuppr": supprimer(id); return true;
      case "jjpartager": show("partager"); return true;
      case "jjtab": S.f.jTab = t.dataset.v; ctx.saveF(); ctx.render(); return true;
      case "jjpdf": pdf(t.dataset.v, id); return true;
      case "jjcompleter": { const v = V(id); if (v) completer(v); return true; }
      case "jjchoix": enregistrerChoix(id); return true;
      case "jjenvoyer": ouvrirEnvoi([id]); return true;
      case "jjenvoyertout": ouvrirEnvoi(reserves().filter(v => ["prete", "maj"].includes(etatFiche(fiche(v), envoiDe(v)).k)).map(v => v.id)); return true;
      case "jjshare": partagerFiche(); return true;
      case "jjmarquer": marquerEnvoyee(); return true;
      case "jjsuiv": suivante(); return true;
      case "jjdfermer": S.ui.jjFerme = true; S.ui.jjConf = false; document.body.classList.remove("jj-live"); ctx.render(); window.scrollTo(0, 0); return true;
      case "jjdouvrir": S.ui.jjFerme = false; ctx.render(); window.scrollTo(0, 0); return true;
      case "jjdretard": S.ui.jjConf = true; ctx.render(); return true;
      case "jjdretardnon": S.ui.jjConf = false; ctx.render(); return true;
      case "jjdretardok": decaler(); return true;
      case "jjdannuler": annulerRetard(); return true;
      case "jjlien": creerLien(t.dataset.t, t.dataset.r || ""); return true;
      case "jjlienpart": partagerLien(t.dataset.t, t.dataset.r || ""); return true;
      case "jjlienrev": revoquerLien(t.dataset.t, t.dataset.r || ""); return true;
      case "jjtemoinajout": { const r = { id: `t${uid()}`, nom: UI.temoin }; setRoles([...R(), r]).then(() => ouvrirRole(r.id)); return true; }
    }
    return false;
  }
  function change(el) {
    const ds = el.dataset || {};
    if (ds.jjf) { champ(ds.id, ds.jjf, el.value); return true; }
    if (ds.jjp) { const i = +ds.i, k = ds.jjp, v = el.value.trim(); setPrestas(ds.id, l => { if (l[i]) l[i][k] = v; }); return true; }
    if (ds.jjo) { const v = ds.jjo === "fait" ? el.checked : el.value.trim(); setObjets(ds.id, l => { const o = l.find(x => x.id === ds.o); if (o) o[ds.jjo] = v; }); return true; }
    if (ds.jjadd != null) { const vid = el.value; if (vid) setPrestas(ds.jjadd, l => l.push({ vendorId: vid, arrivee: "", tache: "" })); return true; }
    if (ds.jjrnom) { const v = el.value.trim(); if (v) majR(ds.jjrnom, { nom: v.slice(0, 60) }); return true; }
    if (ds.jjrlibre) { const v = el.value.trim(); majR(ds.jjrlibre, v ? { personne: v.slice(0, 60), guestId: "" } : { personne: "" }); return true; }
    if (ds.jjrtel) { majR(ds.jjrtel, { tel: el.value.trim().slice(0, 30) }); return true; }
    if (ds.jjsoleil) { ctx.setMeta("jourj", { soleil: el.value }); return true; }
    if (ds.jjacces) { const a = { ...(J().acces || {}), [ds.jjacces]: el.value.trim().slice(0, 2000) }; ctx.setMeta("jourj", { acces: a }); return true; }
    return false;
  }
  function input(el) { if (el.dataset && el.dataset.jjrq) { S.ui.jjRq = el.value; majRole(true); return true; } return false; }
  return { vJourJ, act, change, input, verifierTaches, suggestion, ajouterAuJourJ, prestatairesDuJour: () => prestatairesDuJour(M(), S.vendors || []) };
}
