// Page publique du lien des invités (docs/invites-v1.md section 4, corrigée par docs/invites-v1.1.md) : ouverte sans compte.
// Un seul lien par foyer : avant le faire-part, l'adresse seule ; faire-part envoyé, la réponse (qui vient, à quels moments, puis les
// régimes de ceux qui viennent), l'adresse restant modifiable en bas.
// Ne charge pas Firebase : tout passe par la fonction serveur /api/adresse, avec le jeton du lien (dans le # : jamais envoyé
// dans l'adresse demandée au serveur, ni dans le référent). Ne montre que son foyer.
import "@fontsource/jost/400.css"; import "@fontsource/jost/500.css"; import "@fontsource/jost/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./styles.css";

// Textes (à traduire)
const UI = {
  titre: c => (c ? `Le mariage de ${c}` : "Notre mariage"), bonjour: f => `Bonjour ${f} !`,
  intro: "Pour vous envoyer notre faire-part, pouvez-vous nous indiquer votre adresse ? Cela prend une minute.",
  adresse: "Adresse postale", adressePh: "Numéro, rue\nCode postal, ville\nPays si hors de France", email: "E-mail", tel: "Téléphone",
  facultatif: "facultatif", regimePh: "Végétarien, sans gluten, allergie…", regime: "Régime ou allergie",
  // réponse au faire-part
  reponseIntro: d => (d ? `Merci de nous répondre avant le ${d}.` : "Merci de nous répondre."), vient: "Vient", vientPas: "Ne vient pas",
  quiP: (p, enfant) => (p ? `${p}${enfant ? " (enfant)" : ""}` : "Votre accompagnant·e"), prenomPlus: "Son prénom", invitesA: "Sera là pour",
  envoyerReponse: "Envoyer notre réponse", reponseMerci: c => `Merci ! Votre réponse est notée${c ? `, ${c} vous remercient` : ""}.`,
  modifierJusqua: d => (d ? `Vous pouvez la modifier jusqu'au ${d} avec ce même lien.` : "Vous pouvez la modifier avec ce même lien."),
  ferme: d => `La date limite (${d}) est passée : pour changer votre réponse, écrivez directement aux mariés.`, repondezPour: "Indiquez pour chacun s'il vient.",
  monAdresse: "Notre adresse", envoyerAdresse: "Enregistrer l'adresse",
  envoyer: "Envoyer", envoi: "Envoi…", merci: c => `Merci ! C'est noté${c ? `, ${c} vous remercient` : ""}.`, modifier: "Vous pouvez revenir modifier vos informations avec ce même lien.",
  majLe: d => `Dernière mise à jour le ${d}`, obligatoire: "Indiquez au moins votre adresse.",
  vie: c => `Ces informations sont recueillies par ${c || "les mariés"} pour vous envoyer leur faire-part et préparer le repas. Elles ne sont visibles que d'eux, ne sont transmises à personne (le traiteur ne reçoit qu'un total des régimes, sans nom) et seront supprimées six mois après le mariage. Pour les faire supprimer plus tôt, demandez-le simplement à ${c || "eux"}.`,
  dateFr: d => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
  marque: "Lamaelle", signature: c => `Lamaelle · l'app d'organisation du mariage${c ? ` de ${c}` : ""}`,
  invalide: "Ce lien n'est plus valable. Demandez-en un nouveau aux mariés.", reseau: "Pas de connexion : réessayez dans un instant.",
};
// symbole Lamaelle (le même que dans l'en-tête de l'app)
const SYMBOLE = `<svg class="ad-sym" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke="#F7F3EC" stroke-width="2.4"/><circle cx="60" cy="62" r="26" fill="none" stroke="#D98C6A" stroke-width="7"/><path d="M60 32 L32 25 M60 32 L88 25" fill="none" stroke="#C9A46A" stroke-width="1.8" stroke-linecap="round"/><polygon points="54.5,90 65.5,90 63.5,41 56.5,41" fill="#F7F3EC"/><rect x="55.5" y="31" width="9" height="10" fill="#F7F3EC"/><polygon points="54,31 66,31 60,23" fill="#F7F3EC"/><path d="M24 90 L96 90 M34 97 L86 97 M46 104 L74 104" fill="none" stroke="#F7F3EC" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const marque = () => `<div class="ad-brand">${SYMBOLE}<span>${UI.marque}</span></div>`;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const token = new URLSearchParams(location.hash.slice(1)).get("t") || "";
let vue = null, envoye = false;

async function appel(action, data) {
  const r = await fetch("/api/adresse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action, data }), credentials: "omit", cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erreur || UI.reseau), { code: r.status });
  return j.vue;
}
function champsAdresse(v) {
  return `<label class="ad-f"><span>${UI.adresse}</span><textarea name="adresse" rows="4" autocomplete="street-address" placeholder="${esc(UI.adressePh)}">${esc(v.adresse)}</textarea></label>
      <div class="ad-2"><label class="ad-f"><span>${UI.email} <i>${UI.facultatif}</i></span><input name="email" type="email" inputmode="email" autocomplete="email" value="${esc(v.email)}"></label>
        <label class="ad-f"><span>${UI.tel} <i>${UI.facultatif}</i></span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(v.tel)}"></label></div>`;
}
function ecran() {
  const v = vue, main = $("#ad");
  document.title = `${UI.titre(v.couple)} · ${UI.marque}`;
  const maj = v.majLe ? new Date(v.majLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  const pied = `<p class="ad-vie">${esc(UI.vie(v.couple))}</p><p class="ad-sign">${SYMBOLE}<span>${esc(UI.signature(v.couple))}</span></p>`;
  if (v.mode !== "reponse") {
    // avant le faire-part : l'adresse seule (docs/invites-v1.1.md, 3)
    main.innerHTML = `<header class="ad-head">${marque()}<span class="ad-k">${esc(UI.titre(v.couple))}</span><h1>${esc(UI.bonjour(v.foyer))}</h1><p>${UI.intro}</p></header>
      ${envoye ? `<div class="ad-ok" role="status"><b>${esc(UI.merci(v.couple))}</b><span>${UI.modifier}</span></div>` : ""}
      <form id="ad-form" class="ad-form" novalidate>${champsAdresse(v)}
        <p id="ad-err" class="ad-err" role="alert"></p><button class="ad-btn" type="submit">${UI.envoyer}</button>
        ${maj ? `<p class="ad-maj">${esc(UI.majLe(maj))}</p>` : ""}</form>${pied}`;
    $("#ad-form").addEventListener("submit", envoyerAdresse);
    return;
  }
  // faire-part envoyé : la réponse, puis les régimes de ceux qui viennent ; l'adresse repliée en bas (4)
  const lim = v.limite ? UI.dateFr(v.limite) : "", dis = v.ouvert ? "" : "disabled";
  main.innerHTML = `<header class="ad-head">${marque()}<span class="ad-k">${esc(UI.titre(v.couple))}</span><h1>${esc(UI.bonjour(v.foyer))}</h1><p>${esc(v.ouvert ? UI.reponseIntro(lim) : UI.ferme(lim))}</p></header>
    ${envoye ? `<div class="ad-ok" role="status"><b>${esc(UI.reponseMerci(v.couple))}</b><span>${esc(UI.modifierJusqua(lim))}</span></div>` : ""}
    <form id="ad-rep" class="ad-form" novalidate>
      ${v.personnes.map(p => `<fieldset class="ad-pers" data-id="${esc(p.id)}"><legend>${esc(UI.quiP(p.prenom, p.enfant))}</legend>
        ${p.aNommer ? `<label class="ad-f"><span>${UI.prenomPlus}</span><input name="prenom" maxlength="40" autocomplete="off" ${dis}></label>` : ""}
        <div class="ad-seg" role="radiogroup">${[["oui", UI.vient], ["non", UI.vientPas]].map(([k, l]) => `<label><input type="radio" name="rsvp-${esc(p.id)}" value="${k}" ${p.rsvp === k ? "checked" : ""} ${dis}><span>${l}</span></label>`).join("")}</div>
        <div class="ad-vient" ${p.rsvp === "oui" ? "" : "hidden"}>
          ${p.moments.length > 1 ? `<span class="ad-sous">${UI.invitesA}</span><div class="ad-ms">${p.moments.map(m => `<label class="ad-m"><input type="checkbox" name="m" value="${esc(m.k)}" ${m.absent ? "" : "checked"} ${dis}><span>${esc(m.nom)}</span></label>`).join("")}</div>` : ""}
          <label class="ad-f"><span>${UI.regime} <i>${UI.facultatif}</i></span><input name="regime" value="${esc(p.regime)}" placeholder="${esc(UI.regimePh)}" maxlength="120" ${dis}></label></div></fieldset>`).join("")}
      <p id="ad-err" class="ad-err" role="alert"></p>
      ${v.ouvert ? `<button class="ad-btn" type="submit">${UI.envoyerReponse}</button>` : ""}
      ${maj ? `<p class="ad-maj">${esc(UI.majLe(maj))}</p>` : ""}</form>
    <details class="ad-plie"><summary>${UI.monAdresse}</summary><form id="ad-form" class="ad-form" novalidate>${champsAdresse(v)}
      <p id="ad-err2" class="ad-err" role="alert"></p><button class="ad-btn sec" type="submit">${UI.envoyerAdresse}</button></form></details>${pied}`;
  $("#ad-rep").addEventListener("change", e => { const f = e.target.closest(".ad-pers"); if (f && e.target.name.startsWith("rsvp-")) f.querySelector(".ad-vient").hidden = e.target.value !== "oui"; });
  $("#ad-rep").addEventListener("submit", envoyerReponse);
  $("#ad-form").addEventListener("submit", envoyerAdresse);
}
async function envoyer(data, b, err, label) {
  b.disabled = true; b.textContent = UI.envoi; err.textContent = "";
  try { vue = await appel("ecrire", data); envoye = true; ecran(); window.scrollTo(0, 0); }
  catch (x) { err.textContent = x.message; b.disabled = false; b.textContent = label; }
}
async function envoyerAdresse(e) {
  e.preventDefault();
  const f = e.target, err = f.querySelector(".ad-err"), b = f.querySelector("button[type=submit]");
  const data = { adresse: f.adresse.value, email: f.email.value, tel: f.tel.value };
  if (!data.adresse.trim()) { err.textContent = UI.obligatoire; f.adresse.focus(); return; }
  envoyer(data, b, err, b.textContent);
}
async function envoyerReponse(e) {
  e.preventDefault();
  const f = e.target, err = $("#ad-err"), b = f.querySelector("button[type=submit]"), reponses = {};
  for (const fs of f.querySelectorAll(".ad-pers")) {
    const r = fs.querySelector("input[type=radio]:checked"); if (!r) continue;
    const o = { rsvp: r.value }, pr = fs.querySelector("input[name=prenom]"); if (pr && pr.value.trim()) o.prenom = pr.value.trim();
    if (r.value === "oui") { o.absents = [...fs.querySelectorAll("input[name=m]")].filter(x => !x.checked).map(x => x.value); o.regime = fs.querySelector("input[name=regime]").value; }
    reponses[fs.dataset.id] = o;
  }
  if (!Object.keys(reponses).length) { err.textContent = UI.repondezPour; return; }
  envoyer({ reponses }, b, err, UI.envoyerReponse);
}
async function demarrer() {
  const main = $("#ad");
  const signe = `<p class="ad-sign">${SYMBOLE}<span>${UI.marque}</span></p>`;
  if (!token) { main.innerHTML = `<p class="ad-load">${UI.invalide}</p>${signe}`; return; }
  try { vue = await appel("lire"); ecran(); }
  catch (x) { main.innerHTML = `<p class="ad-load">${esc(x.code === 404 ? UI.invalide : x.message)}</p>${signe}`; }
}
demarrer();
window.addEventListener("hashchange", () => location.reload()); // autre lien collé dans le même onglet
