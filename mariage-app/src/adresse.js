// Page publique du lien d'adresse (docs/invites-v1.md, section 4) : ouverte par un invité, sans compte.
// Ne charge pas Firebase : tout passe par la fonction serveur /api/adresse, avec le jeton du lien (dans le # : jamais envoyé
// dans l'adresse demandée au serveur, ni dans le référent). Ne montre que son foyer ; n'écrit qu'adresse, e-mail, téléphone, régimes.
import "@fontsource/jost/400.css"; import "@fontsource/jost/500.css"; import "@fontsource/jost/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./styles.css";

// Textes (à traduire)
const UI = {
  titre: c => (c ? `Le mariage de ${c}` : "Notre mariage"), bonjour: f => `Bonjour ${f} !`,
  intro: "Pour vous envoyer notre faire-part, pouvez-vous nous indiquer votre adresse ? Cela prend une minute.",
  adresse: "Adresse postale", adressePh: "Numéro, rue\nCode postal, ville\nPays si hors de France", email: "E-mail", tel: "Téléphone",
  facultatif: "facultatif", regimes: "Régimes et allergies", regimesP: "Pour que chacun mange bien. Laissez vide s'il n'y a rien à signaler.",
  regimeDe: (p, enfant) => (p ? `${p}${enfant ? " (enfant)" : ""}` : "Votre accompagnant·e"), regimePh: "Ex. végétarien, sans gluten",
  envoyer: "Envoyer", envoi: "Envoi…", merci: c => `Merci ! C'est noté${c ? `, ${c} vous remercient` : ""}.`, modifier: "Vous pouvez revenir modifier vos informations avec ce même lien.",
  majLe: d => `Dernière mise à jour le ${d}`, obligatoire: "Indiquez au moins votre adresse.",
  vie: c => `Ces informations sont recueillies par ${c || "les mariés"} pour vous envoyer leur faire-part et préparer le repas. Elles ne sont visibles que d'eux, ne sont transmises à personne (le traiteur ne reçoit qu'un total des régimes, sans nom) et seront supprimées six mois après le mariage. Pour les faire supprimer plus tôt, demandez-le simplement à ${c || "eux"}.`,
  invalide: "Ce lien n'est plus valable. Demandez-en un nouveau aux mariés.", reseau: "Pas de connexion : réessayez dans un instant.",
};
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
function ecran() {
  const v = vue, main = $("#ad");
  document.title = UI.titre(v.couple);
  const maj = v.majLe ? new Date(v.majLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
  main.innerHTML = `<header class="ad-head"><span class="ad-k">${esc(UI.titre(v.couple))}</span><h1>${esc(UI.bonjour(v.foyer))}</h1><p>${UI.intro}</p></header>
    ${envoye ? `<div class="ad-ok" role="status"><b>${esc(UI.merci(v.couple))}</b><span>${UI.modifier}</span></div>` : ""}
    <form id="ad-form" class="ad-form" novalidate>
      <label class="ad-f"><span>${UI.adresse}</span><textarea name="adresse" rows="4" autocomplete="street-address" placeholder="${esc(UI.adressePh)}">${esc(v.adresse)}</textarea></label>
      <div class="ad-2"><label class="ad-f"><span>${UI.email} <i>${UI.facultatif}</i></span><input name="email" type="email" inputmode="email" autocomplete="email" value="${esc(v.email)}"></label>
        <label class="ad-f"><span>${UI.tel} <i>${UI.facultatif}</i></span><input name="tel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(v.tel)}"></label></div>
      ${v.personnes.length ? `<fieldset class="ad-reg"><legend>${UI.regimes}</legend><p>${UI.regimesP}</p>
        ${v.personnes.map(p => `<label class="ad-f"><span>${esc(UI.regimeDe(p.prenom, p.enfant))}</span><input name="r-${esc(p.id)}" data-id="${esc(p.id)}" value="${esc(p.regime)}" placeholder="${esc(UI.regimePh)}" maxlength="120"></label>`).join("")}</fieldset>` : ""}
      <p id="ad-err" class="ad-err" role="alert"></p>
      <button class="ad-btn" type="submit">${UI.envoyer}</button>
      ${maj ? `<p class="ad-maj">${esc(UI.majLe(maj))}</p>` : ""}
    </form>
    <p class="ad-vie">${esc(UI.vie(v.couple))}</p>`;
  $("#ad-form").addEventListener("submit", envoyer);
}
async function envoyer(e) {
  e.preventDefault();
  const f = e.target, err = $("#ad-err"), b = f.querySelector("button[type=submit]");
  const data = { adresse: f.adresse.value, email: f.email.value, tel: f.tel.value, regimes: Object.fromEntries([...f.querySelectorAll("input[data-id]")].map(i => [i.dataset.id, i.value])) };
  if (!data.adresse.trim()) { err.textContent = UI.obligatoire; f.adresse.focus(); return; }
  b.disabled = true; b.textContent = UI.envoi; err.textContent = "";
  try { vue = await appel("ecrire", data); envoye = true; ecran(); window.scrollTo(0, 0); }
  catch (x) { err.textContent = x.message; b.disabled = false; b.textContent = UI.envoyer; }
}
async function demarrer() {
  const main = $("#ad");
  if (!token) { main.innerHTML = `<p class="ad-load">${UI.invalide}</p>`; return; }
  try { vue = await appel("lire"); ecran(); }
  catch (x) { main.innerHTML = `<p class="ad-load">${esc(x.code === 404 ? UI.invalide : x.message)}</p>`; }
}
demarrer();
window.addEventListener("hashchange", () => location.reload()); // autre lien collé dans le même onglet
