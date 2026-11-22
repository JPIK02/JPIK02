// Lien pour les adresses (docs/invites-v1.md, section 4) : règles côté serveur, sans Firebase (testées).
// Un lien par foyer, jeton aléatoire long ; seul son empreinte (sha-256) sert d'identifiant dans `liens/<empreinte>` (illisible depuis l'app).
// La page publique ne voit que son foyer et n'écrit que : adresse, e-mail, téléphone, régime de chaque personne du foyer.
import { randomBytes, createHash } from "node:crypto";
import { nomFoyer, estPlusUn } from "./invites.js";

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
 * Ce que le foyer envoie, nettoyé : seulement ses champs et les régimes de SES personnes (ids inconnus ignorés).
 * @returns {foyer: {adresse, tel, email}, regimes: {guestId: texte}} ou {erreur}
 */
export function nettoyerEnvoi(data = {}, personnes = []) {
  const email = txt(data.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "e-mail" };
  const tel = txt(data.tel, 40);
  if (tel && !/^[+()0-9 .\-]{6,40}$/.test(tel)) return { erreur: "téléphone" };
  const ids = new Set(personnes.map(g => g.id)), regimes = {};
  for (const [id, r] of Object.entries(data.regimes && typeof data.regimes === "object" ? data.regimes : {})) if (ids.has(id)) regimes[id] = txt(r, 120);
  return { foyer: { adresse: txt(data.adresse, 400), tel, email }, regimes };
}

/** Ce que la page publique affiche : le prénom du couple, son foyer, ses personnes (prénom seul), ses champs. Rien d'autre. */
export function vuePublique({ foyer = {}, personnes = [], noms = {} }) {
  return {
    couple: [noms.p1, noms.p2].filter(Boolean).join(" et "),
    foyer: nomFoyer({ ...foyer, personnes }),
    personnes: personnes.map(g => ({ id: g.id, prenom: estPlusUn(g) ? "" : String(g.name || "").trim().split(/\s+/)[0], accompagnant: estPlusUn(g), enfant: !!g.enfant, regime: g.regime || "" })),
    adresse: foyer.adresse || "", tel: foyer.tel || "", email: foyer.email || "", majLe: foyer.lienReponseLe || null,
  };
}
