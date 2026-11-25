// Le jour même (docs/jour-j-v1.md, 3.4) : l'écran de pilotage, partagé par l'app du couple (src/jourj-ui.js) et la page des témoins
// (src/jourj-public.js). Il reçoit la « vue témoins » (agents/lib/jourj.js `vueTemoins`) et l'heure du jour J ; aucun appel IA.
import { ecranDuJour, duree, hLisible as hBrut } from "../agents/lib/jourj.js";
const hLisible = mn => hBrut(mn).replace(/ /g, "\u00a0"); // « 21 h 02 » jamais coupé en fin de ligne

// Textes (à traduire)
export const UIJ = {
  k: "NOTRE JOUR J", fermer: "Revenir au déroulé", maintenant: h => `MAINTENANT · ${h}`, ensuite: d => `ENSUITE · DANS ${d.toUpperCase()}`,
  jusqua: h => `jusqu'à ${h}`, avant: h => `La journée commence à ${h}`, pause: "Entre deux moments", fini: "C'est la fin de la journée",
  prevenir: n => `Prévenir ${n} 15 min avant`, arrive: (n, h) => `${n} arrive à ${h}`,
  soleil: (c, p) => `Coucher du soleil à ${c}${p ? ` · photos de couple à ${p}` : ""}`, appeler: "APPELER",
  retard: "On a du retard : décaler la suite de 15 min", retardQ: "Décaler tous les moments qui n'ont pas commencé de 15 minutes ?", oui: "Oui, décaler", non: "Non",
  decale: (par, h) => `Suite décalée de 15 min${par ? ` par ${par}` : ""} à ${h}`, annuler: "Annuler", profitez: p => `Profitez.${p ? ` ${p} a le même écran.` : ""}`,
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const telHref = t => `tel:${String(t).replace(/[^\d+]/g, "")}`;
const initiales = s => String(s || "").split(/[\s'’-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
const hm = d => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

/** Contacts à appeler : maître de cérémonie, prestataires du moment en cours et du suivant, puis les autres rôles (4 au plus). */
function contacts(vue, e) {
  const out = [], vu = new Set(), add = (nom, role, tel) => { const t = String(tel || "").trim(); if (!t || vu.has(t) || out.length >= 4) return; vu.add(t); out.push({ nom, role, tel: t }); };
  const mc = vue.roles.find(r => r.id === "mc"); if (mc) add(mc.personne, mc.nom, mc.tel);
  for (const m of [e.courant, e.suivant].filter(Boolean)) for (const p of m.prestas || []) add(p.nom, p.metier, p.tel);
  for (const r of vue.roles) add(r.personne, r.nom, r.tel);
  return out;
}
/**
 * @param vue   vue témoins
 * @param mn    minutes du jour J (heureDuJour)
 * @param o     {fermer: bool, peutDecaler: bool, confirmer: bool, annuler: bool (couple), avecQui: prénom du témoin qui a le même écran}
 */
export function rendreJour(vue, mn, o = {}) {
  const e = ecranDuJour(vue.moments, mn), ms = vue.moments.filter(m => m.debut != null);
  const c = e.courant, s = e.suivant, premier = ms[0];
  const titre = c ? c.nom : premier && mn < premier.debut ? UIJ.avant(hLisible(premier.debut)) : s ? UIJ.pause : UIJ.fini;
  const utile = s && (s.prestas || []).length ? (s.prestas.find(p => p.arrivee != null) ? UIJ.arrive(s.prestas.find(p => p.arrivee != null).nom, hLisible(s.prestas.find(p => p.arrivee != null).arrivee)) : UIJ.prevenir(s.prestas[0].nom)) : "";
  const photo = vue.prestataires.some(p => p.photo), sol = vue.coucher != null ? UIJ.soleil(hLisible(vue.coucher), photo ? hLisible(vue.coucher - 30) : "") : "";
  const tel = contacts(vue, e), r = vue.retard;
  return `<div class="jjd">
    <div class="jjd-top"><span class="jjd-k">${UIJ.k}</span>${o.fermer ? `<button class="jjd-x" data-act="jjdfermer" aria-label="${UIJ.fermer}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ""}</div>
    <section class="jjd-now"><span class="jjd-l">${esc(UIJ.maintenant(hLisible(mn)))}</span><h1>${esc(titre)}</h1>
      ${c ? `<p>${esc([c.lieu, UIJ.jusqua(hLisible(c.fin))].filter(Boolean).join(" · "))}</p><span class="jjd-prog" role="img" aria-label="${Math.round(e.progression * 100)} %"><i style="width:${(e.progression * 100).toFixed(1)}%"></i></span>` : ""}</section>
    ${s ? `<section class="jjd-next"><span class="jjd-l">${esc(UIJ.ensuite(duree(e.dans)))}</span><b>${esc(`${hLisible(s.debut)} · ${s.nom}`)}</b>${s.lieu ? `<span>${esc(s.lieu)}</span>` : ""}${utile ? `<span class="jjd-u">${esc(utile)}</span>` : ""}</section>` : ""}
    ${sol ? `<p class="jjd-sun"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><span>${esc(sol)}</span></p>` : ""}
    ${tel.length ? `<section><span class="jjd-l">${UIJ.appeler}</span><div class="jjd-grid">${tel.map(t => `<a class="jjd-tel" href="${esc(telHref(t.tel))}"><span class="jjd-av" aria-hidden="true">${esc(initiales(t.nom))}</span><b>${esc(t.nom)}</b><span>${esc(t.role)}</span></a>`).join("")}</div></section>` : ""}
    ${o.peutDecaler && s ? (o.confirmer ? `<div class="jjd-conf" role="alertdialog" aria-label="${UIJ.retardQ}"><p>${UIJ.retardQ}</p><div><button class="jjd-btn" data-act="jjdretardok">${UIJ.oui}</button><button class="jjd-btn ghost" data-act="jjdretardnon">${UIJ.non}</button></div></div>`
      : `<button class="jjd-btn" data-act="jjdretard">${UIJ.retard}</button>`) : ""}
    ${r ? `<p class="jjd-log">${esc(UIJ.decale(r.par, hm(r.at)))}${o.annuler ? ` <button class="jjd-link" data-act="jjdannuler">${UIJ.annuler}</button>` : ""}</p>` : ""}
    <p class="jjd-fin">${esc(UIJ.profitez(o.avecQui || ""))}</p></div>`;
}
