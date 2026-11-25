// Lien pour les adresses (docs/invites-v1.md, section 4) : règles côté serveur, sans Firebase (testées).
// Un lien par foyer, jeton aléatoire long ; seul son empreinte (sha-256) sert d'identifiant dans `liens/<empreinte>` (illisible depuis l'app).
// La page publique ne voit que son foyer. Avant le faire-part : adresse, e-mail, téléphone. Faire-part envoyé : la réponse de chaque
// personne (moments, régime de qui vient, prénom d'un +1), l'adresse restant modifiable (docs/invites-v1.1.md).
import { randomBytes, createHash } from "node:crypto";
import { nomFoyer, estPlusUn, envoye, momentsDe, inviteA, dateLimite } from "./invites.js";

export const nouveauJeton = () => randomBytes(32).toString("base64url");           // 43 caractères
export const empreinte = jeton => createHash("sha256").update(String(jeton)).digest("hex");
export const jetonValide = j => typeof j === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(j);

/** Le lien expire le soir du mariage ; sans date, un an après sa création. */
export function expiration(dateMariage, maintenant = Date.now()) {
  if (dateMariage && /^\d{4}-\d{2}-\d{2}$/.test(dateMariage)) return new Date(`${dateMariage}T23:59:59`).getTime();
  return maintenant + 365 * 864e5;
}
/** Le lien est-il utilisable ? (existe, non révoqué, non expiré) */
export const lienActif = (l, maintenant = Date.now()) => !!(l && l.foyerId && !l.revoque && +l.expire > maintenant);

/** Limite de fréquence par jeton : 30 demandes par heure. @returns {ok, compte} le compte à enregistrer */
export function limite(compte = {}, maintenant = Date.now(), max = 30) {
  const h = Math.floor(maintenant / 36e5);
  const n = compte.heure === h ? (+compte.n || 0) + 1 : 1;
  return { ok: n <= max, compte: { heure: h, n } };
}

const txt = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

/**
 * Un seul lien par foyer, dont le contenu suit le moment du foyer (docs/invites-v1.1.md) : avant le faire-part, l'adresse seule ;
 * faire-part envoyé, la réponse (qui vient, à quels moments, puis les régimes de ceux qui viennent).
 */
export const modeLien = foyer => (envoye(foyer) ? "reponse" : "adresse");
/** La réponse est modifiable jusqu'à la date limite (incluse) ; sans date limite, toujours. */
export function reponseOuverte(settings = {}, maintenant = Date.now()) {
  const l = dateLimite(settings); return !l || maintenant <= new Date(`${l.date}T23:59:59`).getTime();
}
const prenomDe = g => (estPlusUn(g) && !String(g.name || "").replace(/^\s*\+\s*1\b.*$/, "").trim() ? "" : String(g.name || "").trim().split(/\s+/)[0]);
const nommeur = g => estPlusUn(g) && !prenomDe(g);

/**
 * Ce que le foyer envoie, nettoyé.
 *  - adresse : {adresse, email, tel} du foyer, rien d'autre (plus de régimes avant le faire-part) ;
 *  - reponse : `reponses` {guestId: {rsvp: oui|non, absents: [moments], regime, prenom}} pour SES personnes seulement,
 *    moments limités à ceux où la personne est invitée, régime seulement pour qui vient (jamais effacé sinon), prénom seulement
 *    pour un +1 sans nom ; adresse, e-mail, téléphone facultatifs (modifiables en bas).
 * @returns {foyer, guests: {guestId: champs}} ou {erreur}
 */
export function nettoyerEnvoi(data = {}, personnes = [], { mode = "adresse", settings = {} } = {}) {
  const email = txt(data.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "e-mail" };
  const tel = txt(data.tel, 40);
  if (tel && !/^[+()0-9 .\-]{6,40}$/.test(tel)) return { erreur: "téléphone" };
  const foyer = {};
  if (mode === "adresse" || "adresse" in data) foyer.adresse = txt(data.adresse, 400);
  if (mode === "adresse" || "email" in data) foyer.email = email;
  if (mode === "adresse" || "tel" in data) foyer.tel = tel;
  if (mode === "adresse" && !foyer.adresse) return { erreur: "adresse" };
  const guests = {};
  if (mode === "reponse") {
    const ks = momentsDe(settings).map(m => m.k), R = data.reponses && typeof data.reponses === "object" ? data.reponses : {};
    for (const g of personnes) {
      const r = R[g.id]; if (!r || (r.rsvp !== "oui" && r.rsvp !== "non")) continue;
      const o = { rsvp: r.rsvp };
      if (r.rsvp === "oui") {
        const absents = new Set((Array.isArray(r.absents) ? r.absents : []).map(String));
        o.absentA = Object.fromEntries(ks.filter(k => inviteA(g, k) && absents.has(k)).map(k => [k, true]));
        if ("regime" in r) o.regime = txt(r.regime, 120);
      }
      const pr = txt(r.prenom, 40); if (pr && nommeur(g)) o.name = pr;
      guests[g.id] = o;
    }
  }
  return { foyer, guests };
}

/** Ce que la page publique affiche : le couple, son foyer, ses personnes (prénom seul), selon le moment du lien. Rien d'autre. */
export function vuePublique({ foyer = {}, personnes = [], noms = {}, settings = {}, maintenant = Date.now() }) {
  const mode = modeLien(foyer), base = {
    mode, couple: [noms.p1, noms.p2].filter(Boolean).join(" et "), foyer: nomFoyer({ ...foyer, personnes }),
    adresse: foyer.adresse || "", tel: foyer.tel || "", email: foyer.email || "", majLe: foyer.lienReponseLe || null,
  };
  if (mode === "adresse") return base;
  const ms = momentsDe(settings), l = dateLimite(settings);
  return { ...base, limite: l ? l.date : null, ouvert: reponseOuverte(settings, maintenant),
    personnes: personnes.map(g => ({ id: g.id, prenom: prenomDe(g), accompagnant: estPlusUn(g), aNommer: nommeur(g), enfant: !!g.enfant,
      rsvp: g.rsvp === "oui" || g.rsvp === "non" ? g.rsvp : "", regime: g.regime || "",
      moments: ms.filter(m => inviteA(g, m.k)).map(m => ({ k: m.k, nom: m.nom, absent: !!(g.absentA && g.absentA[m.k]) })) })) };
}
