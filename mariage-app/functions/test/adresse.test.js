import { test } from "node:test";
import assert from "node:assert/strict";
import { gererLien, traiterAdresse } from "../adresse.js";

// Firestore en mémoire : juste ce qu'il faut pour les deux fonctions
function fakeDb(init = {}) {
  const D = JSON.parse(JSON.stringify(init));
  const doc = p => ({ path: p, async get() { return { exists: p in D, data: () => D[p] && JSON.parse(JSON.stringify(D[p])) }; },
    async set(v) { D[p] = JSON.parse(JSON.stringify(v)); }, async update(v) { if (!(p in D)) throw new Error("absent " + p); Object.assign(D[p], JSON.parse(JSON.stringify(v))); },
    async delete() { delete D[p]; } });
  return { D, doc,
    collection: c => ({ where: (k, op, v) => ({ async get() { return { docs: Object.entries(D).filter(([p, d]) => p.startsWith(c + "/") && p.split("/").length === 2 && d[k] === v).map(([p, d]) => ({ id: p.split("/")[1], data: () => d })) }; } }) }),
    async runTransaction(fn) { return fn({ get: r => r.get(), update: (r, v) => r.update(v) }); },
    batch() { const ops = []; return { update: (r, v) => ops.push(() => r.update(v)), async commit() { for (const o of ops) await o(); } }; } };
}
const base = () => fakeDb({
  "meta/settings": { date: "2099-05-20", prenom1: "Claire", prenom2: "Julien" },
  "foyers/f1": { nom: "", side: "julien", note: "secret de famille" },
  "foyers/f2": { nom: "Autres", adresse: "ne pas voir" },
  "guests/g1": { name: "Paul Rousselot", foyerId: "f1", regime: "", table: "3" },
  "guests/g2": { name: "Léa Rousselot", foyerId: "f1", regime: "" },
  "guests/g3": { name: "Zoé Petit", foyerId: "f2", regime: "" },
});
const noms = st => ({ p1: st.prenom1, p2: st.prenom2 });

test("le couple crée un lien ; la page lit son foyer seulement", async () => {
  const db = base(), { token } = await gererLien(db, { foyerId: "f1" });
  assert.ok(token && db.D["foyers/f1"].lien.token === token);
  const r = await traiterAdresse(db, { token, action: "lire" }, { noms });
  assert.equal(r.status, 200); assert.equal(r.body.vue.couple, "Claire et Julien");
  assert.deepEqual(r.body.vue.personnes.map(p => p.prenom), ["Paul", "Léa"]);
  const s = JSON.stringify(r.body); assert.ok(!s.includes("secret de famille") && !s.includes("Zoé") && !s.includes("ne pas voir") && !s.includes("table"));
});
test("écrire : ses champs et les régimes de SES personnes, jamais ceux d'un autre foyer", async () => {
  const db = base(), { token } = await gererLien(db, { foyerId: "f1" });
  const r = await traiterAdresse(db, { token, action: "ecrire", data: { adresse: "12 rue des Lilas", email: "p@r.fr", regimes: { g1: "Végétarien", g3: "piraté" }, note: "x", side: "claire" } }, { noms });
  assert.equal(r.status, 200);
  assert.equal(db.D["foyers/f1"].adresse, "12 rue des Lilas"); assert.equal(db.D["foyers/f1"].note, "secret de famille"); assert.equal(db.D["foyers/f1"].side, "julien");
  assert.equal(db.D["guests/g1"].regime, "Végétarien"); assert.equal(db.D["guests/g3"].regime, "");
  assert.ok(db.D["foyers/f1"].lienReponseLe > 0);
});
test("jeton modifié, révoqué, remplacé ou expiré : refusé", async () => {
  const db = base(), { token } = await gererLien(db, { foyerId: "f1" });
  assert.equal((await traiterAdresse(db, { token: token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), action: "lire" })).status, 404);
  assert.equal((await traiterAdresse(db, { token: "<script>", action: "lire" })).status, 404);
  const { token: t2 } = await gererLien(db, { foyerId: "f1" });              // nouveau lien : l'ancien ne marche plus
  assert.equal((await traiterAdresse(db, { token, action: "lire" })).status, 404);
  assert.equal((await traiterAdresse(db, { token: t2, action: "lire" }, { noms })).status, 200);
  await gererLien(db, { foyerId: "f1", action: "revoquer" });
  assert.equal((await traiterAdresse(db, { token: t2, action: "lire" })).status, 404);
  const db2 = base(); db2.D["meta/settings"].date = "2000-01-01";
  const { token: t3 } = await gererLien(db2, { foyerId: "f1" });
  assert.equal((await traiterAdresse(db2, { token: t3, action: "lire" })).status, 404, "expiré le soir du mariage");
});
test("limite de fréquence et données invalides", async () => {
  const db = base(), { token } = await gererLien(db, { foyerId: "f1" });
  assert.equal((await traiterAdresse(db, { token, action: "ecrire", data: { email: "pas un mail" } })).status, 400);
  let dernier; for (let i = 0; i < 31; i++) dernier = await traiterAdresse(db, { token, action: "lire" }, { noms });
  assert.equal(dernier.status, 429);
});
test("le couple ne peut pas créer de lien pour un foyer inconnu", async () => {
  assert.ok((await gererLien(base(), { foyerId: "../meta/settings" })).erreur);
  assert.ok((await gererLien(base(), { foyerId: "inconnu" })).erreur);
});
