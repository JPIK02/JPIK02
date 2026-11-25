// Lien d'adresse des invités (docs/invites-v1.md, section 4) : logique des fonctions `lienFoyer` et `adresseFoyer` (index.js),
// séparée pour être testée sans Firebase (test/adresse.test.js). Règles pures dans agents/lib/liens.js.
import { nouveauJeton, empreinte, jetonValide, expiration, lienActif, limite, nettoyerEnvoi, vuePublique, modeLien, reponseOuverte } from "./agents/lib/liens.js";
import { etapeApresReponse } from "./agents/lib/invites.js";

/** Créer (ou refaire) le lien d'un foyer, ou le révoquer. Un seul lien actif par foyer. */
export async function gererLien(db, { foyerId, action } = {}) {
  foyerId = String(foyerId || "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(foyerId)) return { erreur: "Foyer inconnu.", code: "invalid-argument" };
  const ref = db.doc(`foyers/${foyerId}`), f = await ref.get();
  if (!f.exists) return { erreur: "Foyer inconnu.", code: "not-found" };
  const ancien = f.data().lien;
  if (ancien && ancien.token) await db.doc(`liens/${empreinte(ancien.token)}`).delete().catch(() => {});
  if (action === "revoquer") { await ref.update({ lien: null }); return { ok: true }; }
  const st = (await db.doc("meta/settings").get()).data() || {};
  const token = nouveauJeton(), lien = { token, creeLe: Date.now(), expire: expiration(st.date) };
  await db.doc(`liens/${empreinte(token)}`).set({ foyerId, creeLe: lien.creeLe, expire: lien.expire, revoque: false, compte: {} });
  await ref.update({ lien });
  return { ok: true, token, expire: lien.expire };
}

const REFUS = { status: 404, body: { erreur: "Ce lien n'est plus valable. Demandez-en un nouveau aux mariés." } };
/** Page publique : {token, action: "lire"|"ecrire", data} → {status, body}. Un jeton inconnu, révoqué, remplacé ou expiré est refusé. */
export async function traiterAdresse(db, { token, action, data } = {}, { noms = () => ({}), now = () => Date.now() } = {}) {
  if (!jetonValide(token)) return REFUS;
  const lref = db.doc(`liens/${empreinte(token)}`);
  let lien;
  try {
    lien = await db.runTransaction(async tx => {
      const s = await tx.get(lref); if (!s.exists) return null;
      const l = s.data(); if (!lienActif(l)) return null;
      const r = limite(l.compte); tx.update(lref, { compte: r.compte });
      return r.ok ? l : { trop: true };
    });
  } catch (e) { return { status: 500, body: { erreur: "Réessayez dans un instant." } }; }
  if (!lien) return REFUS;
  if (lien.trop) return { status: 429, body: { erreur: "Trop d'essais : réessayez dans une heure." } };
  const fref = db.doc(`foyers/${lien.foyerId}`), f = await fref.get();
  if (!f.exists) return REFUS;
  const foyer = f.data();
  if (!foyer.lien || foyer.lien.token !== token) return REFUS; // lien remplacé ou révoqué entre-temps
  const personnes = (await db.collection("guests").where("foyerId", "==", lien.foyerId).get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const st = (await db.doc("meta/settings").get()).data() || {};
  // un seul lien, dont le contenu suit le moment du foyer : l'adresse avant le faire-part, la réponse ensuite (docs/invites-v1.1.md)
  const mode = modeLien(foyer);
  if (action === "ecrire") {
    const n = nettoyerEnvoi(data, personnes, { mode, settings: st });
    if (n.erreur) return { status: 400, body: { erreur: n.erreur === "adresse" ? "Indiquez votre adresse." : `Vérifiez le ${n.erreur}.` } };
    const ids = Object.keys(n.guests);
    if (ids.length && !reponseOuverte(st, now())) return { status: 403, body: { erreur: "La date limite est passée : écrivez directement aux mariés." } };
    const t = now(), batch = db.batch();
    for (const gid of ids) { batch.update(db.doc(`guests/${gid}`), { ...n.guests[gid], rsvpLe: t, rsvpPar: "lien", updatedAt: t }); Object.assign(personnes.find(p => p.id === gid), n.guests[gid]); }
    const etape = ids.length ? etapeApresReponse(foyer, personnes) : foyer.etape;
    const fo = { ...n.foyer, lienReponseLe: t, updatedAt: t, ...(etape !== foyer.etape ? { etape, etapeLe: t, ...(etape === "repondu" ? { reponduLe: t } : {}) } : {}) };
    batch.update(fref, fo);
    await batch.commit();
    Object.assign(foyer, fo);
  }
  return { status: 200, body: { ok: true, vue: vuePublique({ foyer, personnes, noms: noms(st), settings: st, maintenant: now() }) } };
}
