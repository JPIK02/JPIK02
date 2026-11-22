import { test } from "node:test";
import assert from "node:assert/strict";
import { tablesDe, concernes, occupants, resume, alertes, besoinTables, nettoyerPlacement, pourCoach, clePaire, cleDiner } from "../lib/plan.js";

const G = (id, o = {}) => ({ id, name: id.toUpperCase(), side: "commun", group: "Amis", rsvp: "oui", ...o });
test("tables : documents + noms des fiches, honneur d'abord, ordre numérique", () => {
  const t = tablesDe([{ id: "a", nom: "Table 10", places: 10 }, { id: "h", nom: "Honneur", honneur: true, places: 6 }], [G("x", { table: "Table 2" }), G("y", { table: "table 10" })]);
  assert.deepEqual(t.map(x => x.nom), ["Honneur", "Table 2", "Table 10"]);
  assert.ok(t[1].virtuel); assert.equal(t[1].places, 8);
});
test("personnes du plan : réponses au moment 2, brouillon au moment 1", () => {
  const g = [G("a"), G("b", { rsvp: "attente" }), G("c", { rsvp: "non" }), G("d", { diner: false }), G("e", { absentA: { diner: true } })];
  assert.deepEqual(concernes(g, { moment: 2 }).map(x => x.id), ["a"]);
  assert.deepEqual(concernes(g, { moment: 1 }).map(x => x.id), ["a", "b", "e"]);
  assert.equal(cleDiner({ moments: [{ k: "ceremonie", nom: "C" }, { k: "m_soir", nom: "Soirée" }] }), "m_soir");
});
test("alertes : pleine, foyer séparé, enfant loin, à séparer ; table d'enfants admise", () => {
  const tables = tablesDe([{ id: "1", nom: "T1", places: 2 }, { id: "2", nom: "T2", places: 8 }, { id: "k", nom: "Enfants", places: 8, enfants: true }]);
  const p = G("p", { table: "T1" }), m = G("m", { table: "T2" }), e = G("e", { enfant: true, table: "T1" }), e2 = G("e2", { enfant: true, table: "Enfants" }), x = G("x", { table: "T1" }), y = G("y", { table: "T1" });
  const gens = [p, m, e, e2, x, y], foyers = [{ id: "f", personnes: [p, m, e, e2] }];
  const a = alertes({ tables, gens, foyers, separer: [clePaire("y", "x")] });
  assert.deepEqual(a.map(z => z.k).sort(), ["foyer", "plein", "separer"]);
  const a2 = alertes({ tables, gens: [p, m, e], foyers: [{ id: "f", personnes: [p, e] }] });
  assert.deepEqual(a2.map(z => z.k), []);
  const e4 = G("e4", { enfant: true, table: "T2" });
  assert.deepEqual(alertes({ tables, gens: [p, e4], foyers: [{ id: "f", personnes: [p, e4] }] }).map(z => z.k), ["enfant"]);
  assert.deepEqual(resume(tables, gens), { places: 6, total: 6, tables: 3, aPlacer: 0 });
  assert.equal(occupants(tables.find(t => t.nom === "T1"), gens).length, 4);
});
test("placement du coach vérifié : places, fixes, à séparer, inconnus", () => {
  const tables = tablesDe([{ id: "1", nom: "T1", places: 3 }]);
  const gens = [G("a", { table: "T1", tableFixe: true }), G("b"), G("c"), G("d")];
  const r = nettoyerPlacement([{ nom: "t1", ids: ["a", "b", "zz", "c", "d"], pourquoi: "Les amis" }, { nom: "Inconnue", ids: ["d"] }], { tables, gens, separer: [clePaire("c", "a")] });
  assert.deepEqual(r, [{ nom: "T1", ids: ["b", "d"], pourquoi: "Les amis" }]);
  assert.equal(besoinTables(17), 3);
});
test("données du coach sans nom", () => {
  const g = [G("a", { foyerId: "f" }), G("b", { foyerId: "f", table: "T1", tableFixe: true })];
  const d = pourCoach({ tables: tablesDe([{ nom: "T1" }]), gens: g, guests: g, foyers: [{ id: "f" }] });
  assert.ok(!JSON.stringify(d).includes('"A"')); assert.equal(d.personnes[0].foyer, "f"); assert.equal(d.personnes[1].fixe, "T1");
});
