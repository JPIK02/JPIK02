import { test } from "node:test";
import assert from "node:assert/strict";
import { gererLienJourJ, traiterJourJ } from "../jourj.js";

function fakeDb(init = {}) {
  const D = JSON.parse(JSON.stringify(init)), c = v => JSON.parse(JSON.stringify(v));
  const doc = p => ({ path: p, async get() { return { exists: p in D, data: () => (p in D ? c(D[p]) : undefined) }; },
    async set(v) { D[p] = c(v); }, async update(v) { if (!(p in D)) throw new Error("absent " + p); Object.assign(D[p], c(v)); }, async delete() { delete D[p]; } });
  return { D, doc,
    collection: col => ({ async get() { return { docs: Object.entries(D).filter(([p]) => p.startsWith(col + "/") && p.split("/").length === 2).map(([p, d]) => ({ id: p.split("/")[1], data: () => c(d) })) }; } }),
    async runTransaction(fn) { return fn({ get: r => r.get(), update: (r, v) => r.update(v) }); },
    batch() { const ops = []; return { update: (r, v) => ops.push(() => r.update(v)), async commit() { for (const o of ops) await o(); } }; } };
}
const base = () => fakeDb({
  "meta/settings": { date: "2099-05-20", prenom1: "Claire", prenom2: "Julien" },
  "meta/jourj": { roles: [{ id: "mc", nom: "Maître de cérémonie", guestId: "g1", tel: "06 11" }, { id: "x", nom: "Alliances" }], acces: { texte: "Parking" } },
  "guests/g1": { name: "Tom Durand", regime: "secret", table: "3" }, "guests/g2": { name: "Zoé Petit" },
  "vendors/v1": { name: "Studio", cat: "Photographe", status: "reserve", prix: 3200, tel: "06 22" }, "vendors/v2": { name: "Autre DJ", status: "discussion", tel: "06 33" },
  "schedule/a": { time: "15:00", title: "Cérémonie", fin: "16:00", prestas: [{ vendorId: "v1", arrivee: "14:00" }] },
  "schedule/b": { time: "17:00", title: "Photos de couple", voit: { invites: false } }, "schedule/c": { time: "20:00", title: "Dîner", fin: "23:00" },
});
const noms = st => ({ p1: st.prenom1, p2: st.prenom2 });
const jour = h => () => new Date(`2099-05-20T${h}:00+02:00`);

test("lien d'un témoin : lecture seule de la version témoins, rien d'autre", async () => {
  const db = base();
  assert.equal((await gererLienJourJ(db, { type: "temoin", roleId: "x" })).code, "failed-precondition"); // rôle sans personne
  const { token } = await gererLienJourJ(db, { type: "temoin", roleId: "mc" });
  assert.equal(db.D["meta/jourj"].liens.temoins.mc.token, token);
  const r = await traiterJourJ(db, { token, action: "lire" }, { noms });
  assert.equal(r.status, 200); assert.equal(r.body.vue.moi.prenom, "Tom"); assert.equal(r.body.vue.moments.length, 3);
  const s = JSON.stringify(r.body); assert.ok(!s.includes("3200") && !s.includes("secret") && !s.includes("Zoé") && !s.includes("Autre DJ"));
});
test("lien des invités : moments visibles par eux, aucun contact, pas de retard", async () => {
  const db = base(), { token } = await gererLienJourJ(db, { type: "invites" });
  const r = await traiterJourJ(db, { token, action: "lire" }, { noms });
  assert.deepEqual(r.body.vue.moments.map(m => m.nom), ["Cérémonie", "Dîner"]); assert.equal(r.body.vue.acces, "Parking");
  const s = JSON.stringify(r.body); assert.ok(!s.includes("06") && !s.includes("Tom") && !s.includes("Studio"));
  assert.equal((await traiterJourJ(db, { token, action: "retard" }, { now: jour("16:30") })).status, 403);
});
test("on a du retard : seulement le jour même, la suite avance de 15 min, journalisé", async () => {
  const db = base(), { token } = await gererLienJourJ(db, { type: "temoin", roleId: "mc" });
  assert.equal((await traiterJourJ(db, { token, action: "retard" }, { now: () => new Date("2099-05-19T16:30:00+02:00") })).status, 403);
  const r = await traiterJourJ(db, { token, action: "retard" }, { noms, now: jour("16:30") });
  assert.equal(r.status, 200);
  assert.equal(db.D["schedule/a"].time, "15:00"); assert.equal(db.D["schedule/b"].time, "17:15");
  assert.equal(db.D["schedule/c"].time, "20:15"); assert.equal(db.D["schedule/c"].fin, "23:15"); assert.equal(db.D["schedule/b"].fin, undefined);
  const log = db.D["meta/jourj"].retards[0]; assert.equal(log.par, "Tom (Maître de cérémonie)"); assert.deepEqual(log.ids, ["b", "c"]); assert.equal(log.avant.c.time, "20:00");
  assert.equal((await traiterJourJ(db, { token, action: "retard" }, { now: () => new Date(+jour("16:30")() + 20e3) })).status, 409); // double appui
});
test("jeton modifié, remplacé, révoqué ou expiré : refusé", async () => {
  const db = base(), { token } = await gererLienJourJ(db, { type: "temoin", roleId: "mc" });
  assert.equal((await traiterJourJ(db, { token: token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), action: "lire" })).status, 404);
  const { token: t2 } = await gererLienJourJ(db, { type: "temoin", roleId: "mc" });
  assert.equal((await traiterJourJ(db, { token, action: "lire" })).status, 404); assert.equal((await traiterJourJ(db, { token: t2, action: "lire" }, { noms })).status, 200);
  await gererLienJourJ(db, { type: "temoin", roleId: "mc", action: "revoquer" });
  assert.equal((await traiterJourJ(db, { token: t2, action: "lire" })).status, 404);
  const { token: t3 } = await gererLienJourJ(db, { type: "invites" });
  assert.equal((await traiterJourJ(db, { token: t3, action: "lire" }, { now: () => new Date("2099-05-23T12:00:00Z") })).status, 404); // 2 jours après : expiré
});
