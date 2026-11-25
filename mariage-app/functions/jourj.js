// Liens du jour J (docs/jour-j-v1.md, section 4) : logique des fonctions `lienJourJ` et `jourjPublic` (index.js), séparée pour être
// testée sans Firebase (test/jourj.test.js). Même principe que le lien d'adresse : jeton long, seule son empreinte sert d'identifiant
// (`liens/<sha-256>`, illisible depuis l'app), lecture par le serveur seulement, révocable, limite de fréquence.
// Témoin (un lien par personne) : lecture seule, sauf « On a du retard » (le jour même, journalisé, annulable par le couple).
// Invités (un lien pour le faire-part) : les moments visibles par eux, l'accès, les navettes.
import { nouveauJeton, empreinte, jetonValide, limite } from "./agents/lib/liens.js";
import { rolesDe, personneDe, expirationJourJ, lienJourJActif, vueTemoins, vueInvites, momentsDe, estLeJour, heureDuJour, aDecaler } from "./agents/lib/jourj.js";

const lireJourJ = async db => (await db.doc("meta/jourj").get()).data() || {};
const ecrireJourJ = async (db, o) => { const ref = db.doc("meta/jourj"), cur = (await ref.get()).data() || {}; await ref.set({ ...cur, ...o }); };

/** Créer (ou refaire) le lien d'un témoin (`roleId`) ou celui des invités, ou le révoquer. Un seul lien actif par personne. */
export async function gererLienJourJ(db, { type, roleId, action } = {}) {
  if (type !== "temoin" && type !== "invites") return { erreur: "Lien inconnu.", code: "invalid-argument" };
  const j = await lireJourJ(db), liens = { temoins: {}, ...(j.liens || {}) }; liens.temoins = { ...(liens.temoins || {}) };
  if (type === "temoin") {
    roleId = String(roleId || ""); const r = rolesDe(j).find(x => x.id === roleId);
    if (!r) return { erreur: "Rôle inconnu.", code: "not-found" };
    if (action !== "revoquer") {
      const guests = r.guestId ? [{ id: r.guestId, ...((await db.doc(`guests/${r.guestId}`).get()).data() || {}) }] : [];
      if (!personneDe(r, guests)) return { erreur: "Confiez d'abord ce rôle à quelqu'un.", code: "failed-precondition" };
    }
  }
  const ancien = type === "temoin" ? liens.temoins[roleId] : liens.invites;
  if (ancien && ancien.token) await db.doc(`liens/${empreinte(ancien.token)}`).delete().catch(() => {});
  if (action === "revoquer") {
    if (type === "temoin") delete liens.temoins[roleId]; else liens.invites = null;
    await ecrireJourJ(db, { liens }); return { ok: true };
  }
  const st = (await db.doc("meta/settings").get()).data() || {}, token = nouveauJeton(), creeLe = Date.now(), expire = expirationJourJ(st.date, creeLe);
  await db.doc(`liens/${empreinte(token)}`).set({ type, ...(type === "temoin" ? { roleId } : {}), creeLe, expire, revoque: false, compte: {} });
  const l = { token, creeLe, expire };
  if (type === "temoin") liens.temoins[roleId] = l; else liens.invites = l;
  await ecrireJourJ(db, { liens });
  return { ok: true, token, expire };
}

const REFUS = { status: 404, body: { erreur: "Ce lien n'est plus valable. Demandez-en un nouveau aux mariés." } };
const tous = async (db, c) => (await db.collection(c).get()).docs.map(d => ({ id: d.id, ...d.data() }));
/** Page publique : {token, action: "lire"|"retard"} → {status, body}. */
export async function traiterJourJ(db, { token, action } = {}, { noms = () => ({}), now = () => new Date() } = {}) {
  if (!jetonValide(token)) return REFUS;
  const lref = db.doc(`liens/${empreinte(token)}`);
  let lien;
  try {
    lien = await db.runTransaction(async tx => {
      const s = await tx.get(lref); if (!s.exists) return null;
      const l = s.data(); if (!lienJourJActif(l, +now())) return null;
      const r = limite(l.compte, +now(), 150); tx.update(lref, { compte: r.compte }); // l'écran du jour se rafraîchit chaque minute
      return r.ok ? l : { trop: true };
    });
  } catch (e) { return { status: 500, body: { erreur: "Réessayez dans un instant." } }; }
  if (!lien) return REFUS;
  if (lien.trop) return { status: 429, body: { erreur: "Trop d'essais : réessayez dans une heure." } };
  const j = await lireJourJ(db), liens = j.liens || {};
  const actuel = lien.type === "temoin" ? (liens.temoins || {})[lien.roleId] : liens.invites;
  if (!actuel || actuel.token !== token) return REFUS; // remplacé ou révoqué entre-temps
  const st = (await db.doc("meta/settings").get()).data() || {}, schedule = await tous(db, "schedule");
  if (lien.type === "invites") {
    if (action !== "lire") return { status: 403, body: { erreur: "Lecture seule." } };
    return { status: 200, body: { ok: true, vue: vueInvites({ schedule, jourj: j, settings: st, noms: noms(st) }) } };
  }
  const roles = rolesDe(j), ids = roles.map(r => r.guestId).filter(Boolean);
  const guests = (await Promise.all(ids.map(id => db.doc(`guests/${id}`).get().then(s => (s.exists ? { id, name: s.data().name } : null))))).filter(Boolean);
  const vendors = (await tous(db, "vendors")).filter(v => v.status === "reserve");
  if (action === "retard") {
    const ms = momentsDe(schedule), t = now();
    if (!estLeJour(st, ms, t)) return { status: 403, body: { erreur: "Seulement le jour du mariage." } };
    const dernier = (j.retards || []).filter(x => !x.annuleLe).at(-1);
    if (dernier && +t - dernier.at < 60e3) return { status: 409, body: { erreur: "La suite vient déjà d'être décalée." } };
    const d = aDecaler(ms, heureDuJour(t).mn, 15);
    if (d.length) {
      const batch = db.batch();
      for (const x of d) batch.update(db.doc(`schedule/${x.id}`), { time: x.apres.time, ...(x.apres.fin ? { fin: x.apres.fin } : {}) });
      await batch.commit();
      const r = roles.find(x => x.id === lien.roleId), p = r && personneDe(r, guests);
      const entree = { at: +t, de: 15, par: `${p ? p.nom.split(/\s+/)[0] : "Un témoin"}${r ? ` (${r.nom})` : ""}`, ids: d.map(x => x.id), avant: Object.fromEntries(d.map(x => [x.id, x.avant])) };
      j.retards = [...(j.retards || []), entree].slice(-30); await ecrireJourJ(db, { retards: j.retards });
      for (const x of d) { const s = schedule.find(y => y.id === x.id); s.time = x.apres.time; if (x.apres.fin) s.fin = x.apres.fin; }
    }
  } else if (action !== "lire") return { status: 400, body: { erreur: "Action inconnue." } };
  return { status: 200, body: { ok: true, vue: vueTemoins({ schedule, vendors, guests, jourj: j, settings: st, roleId: lien.roleId, noms: noms(st) }) } };
}
