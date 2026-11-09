import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTools, TOOL_DEFS } from "../tools.js";

// Faux Firestore en mémoire (doc/collection/get/set), même forme que le SDK Admin.
function fakeDb(init = {}) {
  const data = structuredClone(init); let n = 0;
  const doc = path => ({ id: path.split("/")[1], async get() { return { exists: path in data, data: () => structuredClone(data[path]) }; },
    async set(d) { data[path] = structuredClone(d); } });
  return { data, doc, collection: c => ({
    doc: () => doc(`${c}/new${++n}`),
    async get() { return { docs: Object.keys(data).filter(k => k.split("/")[0] === c).map(k => ({ id: k.split("/")[1], data: () => structuredClone(data[k]) })) }; } }) };
}
const QCATS = [{ k: "lieu", label: "Lieu", qs: [["style", "m", "Quel style de lieu ?", ["Château", "Grange"]], ["capacite", "t", "Combien de personnes ?"]] }];
const now = new Date("2026-11-09T12:00:00");
const base = () => fakeDb({
  "meta/settings": { date: "2028-05-20", budgetTotal: 20000 },
  "tasks/t1": { title: "Réserver le traiteur", phase: "m9", status: "todo", owner: "deux" },
  "tasks/t2": { title: "Fixer le budget", phase: "m12", status: "todo", owner: "deux", due: "2026-10-01" },
  "guests/g1": { name: "Alex", rsvp: "attente", side: "commun" }, "guests/g2": { name: "Chloé", rsvp: "attente", side: "commun" },
  "vendors/v1": { name: "Château de Couturelle", cat: "Lieu", status: "devis", prix: 4850, fit: { score: 55, updatedAt: 1 } },
  "budget/b1": { label: "Lieu de réception", prevu: 4000 },
});

test("chaque outil déclaré a une implémentation", async () => {
  const exec = makeTools(fakeDb(), { qcats: QCATS, now });
  for (const t of TOOL_DEFS) { const r = await exec(t.name, {}); assert.ok(!/Outil inconnu/.test(r.content), t.name); }
  assert.ok(!TOOL_DEFS.some(t => /supprim|delete/i.test(t.name)), "aucun outil de suppression");
});

test("aperçu : retards, budget, invités", async () => {
  const exec = makeTools(base(), { qcats: QCATS, now });
  const a = JSON.parse((await exec("apercu")).content);
  assert.deepEqual(a.taches.en_retard.map(t => t.id), ["t2"]);
  assert.equal(a.budget.prevu, 4000); assert.equal(a.invites.total, 2); assert.equal(a.envies_remplies, "0/2");
});

test("ajouter puis annuler une tâche : l'action rend l'état d'avant", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now });
  const r = await exec("ajouter_tache", { titre: "Réserver l'église", qui: "claire", periode: "m9", echeance: "pas une date" });
  const op = r.action.ops[0];
  assert.equal(op.before, null);
  assert.deepEqual({ ...db.data[op.path], createdAt: 0 }, { createdAt: 0, title: "Réserver l'église", owner: "claire", phase: "m9", status: "todo", due: "", note: "", order: 999, source: "assistant" });
});

test("modifier des invités en lot, valeurs nettoyées, état d'avant conservé", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now });
  const r = await exec("modifier_invites", { ids: ["g1", "g2"], changements: { reponse: "oui", cote: "inconnu", groupe: "Amis" } });
  assert.equal(r.action.ops.length, 2);
  assert.equal(db.data["guests/g1"].rsvp, "oui"); assert.equal(db.data["guests/g1"].side, "commun"); assert.equal(db.data["guests/g2"].group, "Amis");
  assert.equal(r.action.ops[0].before.rsvp, "attente");
  assert.match((await exec("modifier_invites", { ids: ["zz"], changements: { reponse: "oui" } })).content, /introuvable/);
});

test("notes de visite : le prestataire est marqué pour réanalyse", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now });
  await exec("modifier_prestataire", { id: "v1", notes_visite: "Très belle orangerie, mais traiteur imposé" });
  assert.ok(db.data["vendors/v1"].fitRequestedAt > 0);
  assert.equal(db.data["vendors/v1"].fit.score, 55); // le reste de la fiche est conservé
});

test("envies : choix filtrés sur les options, synthèse redemandée", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now });
  await exec("enregistrer_envie", { categorie: "lieu", question: "style", choix: ["Château", "Plage"], commun: "Un château avec parc" });
  assert.deepEqual(db.data["brief/lieu--style"].choix, ["Château"]);
  assert.ok(db.data["meta/analyse"].profilRequestedAt > 0);
  assert.match((await exec("enregistrer_envie", { categorie: "lieu", question: "inconnue" })).content, /question inconnue/);
  const l = JSON.parse((await exec("lire_envies", { categorie: "lieu" })).content);
  assert.equal(l.questions[0].reponse.commun, "Un château avec parc");
});

test("rendez-vous : date obligatoire et valide", async () => {
  const exec = makeTools(base(), { qcats: QCATS, now });
  assert.match((await exec("ajouter_rendez_vous", { titre: "Dégustation", date: "demain" })).content, /AAAA-MM-JJ/);
  assert.ok((await exec("ajouter_rendez_vous", { titre: "Dégustation", date: "2026-12-01", heure: "25:00" })).action);
});
