// Page publique des liens du jour J (docs/jour-j-v1.md, section 4), ouverte sans compte.
// Témoin : la version témoins (déroulé, rôles, prestataires, plans pluie, objets, accès) et, le jour même, l'écran de pilotage
// avec « On a du retard ». Invités (lien du faire-part) : les moments qui les concernent, l'accès, les navettes.
// Ne charge pas Firebase : tout passe par /api/jourj avec le jeton du lien (dans le # : jamais envoyé dans l'adresse ni le référent).
import "@fontsource/jost/400.css"; import "@fontsource/jost/500.css"; import "@fontsource/jost/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./styles.css";
import { estLeJour, heureDuJour, hLisible } from "../agents/lib/jourj.js";
import { rendreJour } from "./jourj-jour.js";

// Textes (à traduire)
const UI = {
  titre: c => (c ? `Le mariage de ${c}` : "Notre mariage"), jour: d => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  bonjour: (p, r) => (p ? `Bonjour ${p}${r ? `, ${r.toLowerCase()}` : ""} !` : "Bonjour !"), temP: "Voici tout le déroulé. Le jour J, cette page devient l'écran du jour : le moment en cours, le suivant, les numéros utiles.",
  invP: "Le programme de la journée.", deroule: "Le déroulé", roles: "Qui fait quoi", prestas: "Les prestataires", pluie: "S'il pleut", objets: "À ne pas oublier",
  acces: "Accès et parking", navettes: "Navettes", aConfier: "à confier", arrive: h => `arrivée ${h}`, aPrevoir: "à prévoir",
  invalide: "Ce lien n'est plus valable. Demandez-en un nouveau aux mariés.", reseau: "Pas de connexion : réessayez dans un instant.",
  marque: "Lamaelle", signature: c => `Lamaelle · l'app d'organisation du mariage${c ? ` de ${c}` : ""}`,
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const telHref = t => `tel:${String(t).replace(/[^\d+]/g, "")}`;
const token = new URLSearchParams(location.hash.slice(1)).get("t") || "";
let vue = null, confirmer = false, erreur = "";

async function appel(action) {
  const r = await fetch("/api/jourj", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action }), credentials: "omit", cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erreur || UI.reseau), { code: r.status });
  return j.vue;
}
const h = mn => (mn != null ? hLisible(mn) : "");
function versionTemoins(v) {
  const ms = v.moments, pl = ms.filter(m => m.exterieur), obj = ms.flatMap(m => m.objets.map(o => ({ ...o, moment: m.nom })));
  return `<header class="ad-head"><span class="ad-k">${esc(UI.titre(v.couple))}</span><h1>${esc(UI.bonjour(v.moi.prenom, v.moi.role))}</h1>
      ${v.date ? `<p class="jjp-date">${esc(UI.jour(v.date))}</p>` : ""}<p>${UI.temP}</p></header>
    <section class="jjp-sec"><h2>${UI.deroule}</h2><ol class="jjp-tl">${ms.map(m => `<li class="${m.cle ? "cle" : ""}"><span class="jjp-h">${esc(h(m.debut))}</span><div><b>${esc(m.nom)}</b>
      ${m.lieu ? `<span>${esc(m.lieu)}</span>` : ""}${m.detail ? `<span>${esc(m.detail)}</span>` : ""}${m.note ? `<span>${esc(m.note)}</span>` : ""}
      ${m.prestas.length ? `<span>${esc(m.prestas.map(p => `${p.nom}${p.arrivee != null ? ` (${UI.arrive(h(p.arrivee))})` : ""}`).join(", "))}</span>` : ""}</div></li>`).join("")}</ol></section>
    <section class="jjp-sec"><h2>${UI.roles}</h2><ul class="jjp-l">${v.roles.map(r => `<li><b>${esc(r.nom)}</b><span>${esc(r.personne || UI.aConfier)}</span>${r.tel ? `<a href="${esc(telHref(r.tel))}">${esc(r.tel)}</a>` : ""}</li>`).join("")}</ul></section>
    ${v.prestataires.length ? `<section class="jjp-sec"><h2>${UI.prestas}</h2><ul class="jjp-l">${v.prestataires.map(p => `<li><b>${esc(p.nom)}</b><span>${esc(p.metier)}</span>${p.tel ? `<a href="${esc(telHref(p.tel))}">${esc(p.tel)}</a>` : ""}</li>`).join("")}</ul></section>` : ""}
    ${pl.length ? `<section class="jjp-sec"><h2>${UI.pluie}</h2><ul class="jjp-l">${pl.map(m => `<li><b>${esc(m.nom)}</b><span>${esc(m.pluie || UI.aPrevoir)}</span></li>`).join("")}</ul></section>` : ""}
    ${obj.length ? `<section class="jjp-sec"><h2>${UI.objets}</h2><ul class="jjp-l">${obj.map(o => `<li><b>${esc(o.label)}</b><span>${esc(`${o.moment} · ${o.qui || UI.aConfier}`)}${o.fait ? " ✓" : ""}</span></li>`).join("")}</ul></section>` : ""}
    ${acces(v)}`;
}
const acces = v => `${v.acces ? `<section class="jjp-sec"><h2>${UI.acces}</h2><p class="jjp-p">${esc(v.acces)}</p></section>` : ""}${v.navettes ? `<section class="jjp-sec"><h2>${UI.navettes}</h2><p class="jjp-p">${esc(v.navettes)}</p></section>` : ""}`;
function versionInvites(v) {
  return `<header class="ad-head"><span class="ad-k">${esc(UI.titre(v.couple))}</span><h1>${v.date ? esc(UI.jour(v.date)) : esc(UI.titre(v.couple))}</h1><p>${UI.invP}</p></header>
    <section class="jjp-sec"><ol class="jjp-tl">${v.moments.map(m => `<li><span class="jjp-h">${esc(h(m.debut))}</span><div><b>${esc(m.nom)}</b>${m.lieu ? `<span>${esc(m.lieu)}</span>` : ""}</div></li>`).join("")}</ol></section>
    ${acces(v)}`;
}
function ecran() {
  const main = $("#jjp"), v = vue; document.title = `${UI.titre(v.couple)} · ${UI.marque}`;
  const signe = `<p class="ad-sign"><span>${esc(UI.signature(v.couple))}</span></p>`;
  if (v.type === "temoin" && v.date && estLeJour({ date: v.date }, v.moments, new Date())) {
    document.body.classList.add("jjp-live");
    main.innerHTML = rendreJour(v, heureDuJour().mn, { peutDecaler: true, confirmer }) + (erreur ? `<p class="ad-err" role="alert">${esc(erreur)}</p>` : "");
    return;
  }
  document.body.classList.remove("jjp-live");
  main.innerHTML = (v.type === "temoin" ? versionTemoins(v) : versionInvites(v)) + signe;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; erreur = "";
  if (b.dataset.act === "jjdretard") { confirmer = true; ecran(); return; }
  if (b.dataset.act === "jjdretardnon") { confirmer = false; ecran(); return; }
  if (b.dataset.act === "jjdretardok") { confirmer = false; b.disabled = true; try { vue = await appel("retard"); } catch (x) { erreur = x.message; } ecran(); }
});
async function demarrer() {
  const main = $("#jjp");
  if (!token) { main.innerHTML = `<p class="ad-load">${UI.invalide}</p>`; return; }
  try { vue = await appel("lire"); ecran(); }
  catch (x) { main.innerHTML = `<p class="ad-load">${esc(x.code === 404 ? UI.invalide : x.message)}</p>`; return; }
  // le jour même : l'écran se met à jour chaque minute (heure, moment en cours, décalages faits par d'autres)
  setInterval(async () => { if (document.hidden || !vue || vue.type !== "temoin" || confirmer) return; try { vue = await appel("lire"); } catch {} ecran(); }, 60e3);
}
demarrer();
window.addEventListener("hashchange", () => location.reload());
