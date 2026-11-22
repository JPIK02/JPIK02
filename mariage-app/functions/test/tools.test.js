import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTools, TOOL_DEFS } from "../tools.js";

// Faux Firestore en mémoire (doc/collection/get/set), même forme que le SDK Admin.
function fakeDb(init = {}) {
  const data = structuredClone(init); let n = 0;
  const doc = path => ({ id: path.split("/").pop(), async get() { return { exists: path in data, data: () => structuredClone(data[path]) }; },
    async set(d) { data[path] = structuredClone(d); } });
  return { data, doc, collection: c => ({
    doc: () => doc(`${c}/new${++n}`),
    async get() { return { docs: Object.keys(data).filter(k => k.startsWith(c + "/") && !k.slice(c.length + 1).includes("/")).map(k => ({ id: k.slice(c.length + 1), data: () => structuredClone(data[k]) })) }; } }) };
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

test("ouvrir_page : un bouton vers la page, rien n'est écrit", async () => {
  const db = base(); const before = JSON.stringify(db.data); const exec = makeTools(db, { qcats: QCATS, now });
  const r = await exec("ouvrir_page", { page: "budget" });
  assert.deepEqual(r.action.open, { page: "budget" }); assert.equal(r.action.label, "Ouvrir le budget"); assert.ok(!r.action.ops);
  const f = await exec("ouvrir_page", { page: "fiche", id: "v1" });
  assert.deepEqual(f.action.open, { page: "fiche", id: "v1" }); assert.match(f.action.label, /Château de Couturelle/);
  assert.ok((await exec("ouvrir_page", { page: "fiche", id: "inconnu" })).isError);
  assert.ok((await exec("ouvrir_page", { page: "cuisine" })).isError);
  assert.equal(JSON.stringify(db.data), before);
});

test("aperçu : retards, budget, invités", async () => {
  const exec = makeTools(base(), { qcats: QCATS, now });
  const a = JSON.parse((await exec("apercu")).content);
  assert.deepEqual(a.taches.en_retard.map(t => t.id), ["t2"]);
  assert.equal(a.budget.prevu, 4000); assert.equal(a.invites.total, 2); assert.equal(a.envies, "presque rien de rempli");
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

test("envies (nouveau questionnaire) : choix filtrés, formats, par partenaire, synthèse redemandée", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now, partner: "julien" });
  await exec("enregistrer_envie", { question: "lieu.type", choix: ["Château", "plage-privee", "bord-de-mer"], texte: "Un château avec parc" });
  assert.deepEqual(db.data["envies/lieu.type"].v, ["chateau", "bord-de-mer"], "libellé ou id acceptés, choix inconnus écartés");
  assert.ok(db.data["meta/analyse"].profilRequestedAt > 0);
  await exec("enregistrer_envie", { question: "lieu.imposes", cran: 5 });
  await exec("enregistrer_envie", { question: "lieu.exclusif", jpa: { _: "absolument" } });
  assert.equal(db.data["envies/lieu.imposes"].v, 5); assert.deepEqual(db.data["envies/lieu.exclusif"].v, { _: "a" });
  await exec("enregistrer_envie", { question: "tenues.style", choix: ["boheme"] });
  assert.deepEqual(db.data["prive/julien/envies/tenues.style"].v, ["boheme"], "la tenue est notée pour la personne qui parle, dans son espace privé");
  assert.match((await exec("enregistrer_envie", { question: "lieu.inconnue" })).content, /question inconnue/);
  const l = JSON.parse((await exec("lire_envies", { tuile: "lieu" })).content);
  assert.match(l.questions[0].reponse, /Château, Bord de mer · Un château avec parc/);
  const all = JSON.parse((await exec("lire_envies", {})).content);
  assert.equal(all.tuiles.length, 19); assert.ok(all.jauge >= 1);
  await exec("enregistrer_priorites", { tuile: "lieu", importance: 5, budget: 7000 });
  assert.equal(db.data["envies/_tuile.lieu"].importance, 5);
});

test("rendez-vous : date obligatoire et valide", async () => {
  const exec = makeTools(base(), { qcats: QCATS, now });
  assert.match((await exec("ajouter_rendez_vous", { titre: "Dégustation", date: "demain" })).content, /AAAA-MM-JJ/);
  assert.ok((await exec("ajouter_rendez_vous", { titre: "Dégustation", date: "2026-12-01", heure: "25:00" })).action);
});

test("inspiration : la miniature de la photo jointe est gardée, annulable", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now, thumbs: ["THUMB1"], author: "Julien" });
  const r = await exec("noter_inspiration", { photo: 1, tuile: "lieu", description: "Orangerie lumineuse, verrière, plantes" });
  const op = r.action.ops[0];
  assert.equal(op.before, null); assert.equal(db.data[op.path].thumb, "THUMB1"); assert.equal(db.data[op.path].cat, "lieu");
  assert.match((await exec("noter_inspiration", { photo: 2, tuile: "lieu", description: "x" })).content, /introuvable/);
  assert.match((await makeTools(base(), { qcats: QCATS })("noter_inspiration", { photo: 1, tuile: "lieu", description: "x" })).content, /aucune photo/);
});

test("enregistrer_devis : ajouté à l'historique de la fiche, prix mis à jour, annulable", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now, author: "Julien" });
  const r = await exec("enregistrer_devis", { id: "v1", montant: 4500, acompte: 1350, validite: "2026-12-31", invites: 70, inclus: ["Salle", "Parc"], options: [{ label: "Nuit sur place", prix: 600 }], resume: "Remise de 350 €." });
  const v = db.data["vendors/v1"];
  assert.equal(v.prix, 4500); assert.equal(v.devis.length, 1); assert.equal(v.devis[0].invites, 70); assert.deepEqual(v.devis[0].options, [{ label: "Nuit sur place", prix: 600 }]);
  assert.equal(r.action.ops[0].before.prix, 4850);
  await exec("enregistrer_devis", { id: "v1", montant: 4300 });
  assert.equal(db.data["vendors/v1"].devis.length, 2); assert.equal(db.data["vendors/v1"].devis[0].montant, 4300);
  const n = await exec("enregistrer_devis", { nom: "Fleurs Martin", categorie: "Fleuriste", montant: 900 });
  assert.equal(JSON.parse(n.content).ok, true);
  assert.equal(Object.values(db.data).find(x => x.name === "Fleurs Martin").status, "discussion", "un devis reçu : En discussion");
});

test("envie repérée au passage : proposée (à confirmer), jamais sur une question déjà répondue, visible par le coach", async () => {
  const db = base(); const exec = makeTools(db, { qcats: QCATS, now, partner: "claire", author: "Claire" });
  const r = await exec("proposer_envie", { question: "mariage.style", choix: ["boheme"], phrase: "on voit ça plutôt bohème" });
  assert.ok(r.action && r.action.ops[0].before === null, "annulable");
  const d = db.data["envies_reperees/mariage.style"];
  assert.deepEqual(d.v, ["boheme"]); assert.equal(d.status, "attente"); assert.equal(d.source, "coach"); assert.equal(d.phrase, "on voit ça plutôt bohème");
  assert.equal(db.data["envies/mariage.style"], undefined, "rien n'est compté avant confirmation");
  const l = JSON.parse((await exec("lire_envies", { tuile: "mariage" })).content);
  assert.match(l.questions.find(q => q.id === "mariage.style").deja_repere_a_confirmer, /Bohème/);
  assert.match((await exec("proposer_envie", { question: "mariage.style", choix: ["boheme"] })).content, /phrase/);
  await exec("enregistrer_envie", { question: "lieu.type", choix: ["chateau"] });
  assert.match((await exec("proposer_envie", { question: "lieu.type", choix: ["ferme-ou-grange"], phrase: "une ferme ?" })).content, /déjà une réponse/);
  await exec("proposer_envie", { question: "tenues.style", choix: ["boheme"], phrase: "ma robe bohème" });
  assert.equal(db.data["prive/claire/envies_reperees/tenues.style.claire"].pour, "claire", "tenue : pour la personne qui parle, dans son espace privé");
});

test("tenue secrète : ce que Claire dit au coach va dans son espace, le coach de Julien n'en voit rien", async () => {
  const db = base();
  const claire = makeTools(db, { qcats: QCATS, now, partner: "claire", author: "Claire" });
  await claire("enregistrer_envie", { question: "tenues.style", choix: ["boheme"], texte: "une robe fluide" });
  assert.deepEqual(db.data["prive/claire/envies/tenues.style"].v, ["boheme"]);
  assert.equal(db.data["envies/tenues.style"], undefined, "rien dans l'espace commun");
  const r = await claire("ajouter_prestataire", { nom: "Maison Blanche", categorie: "Tenues" });
  const pid = Object.keys(db.data).find(k => k.startsWith("prive/claire/vendors/"));
  assert.ok(pid, "le prestataire de tenue est privé"); assert.ok(r.action.ops[0].path.startsWith("prive/claire/vendors/"), "annulable au bon endroit");
  await claire("modifier_prestataire", { id: pid.split("/").pop(), prix: 1800 });
  assert.equal(db.data[pid].prix, 1800);
  await claire("enregistrer_envie", { question: "tenues.temoins", choix: [], texte: "en bleu" });
  assert.ok(db.data["envies/tenues.temoins"], "les questions communes de la tuile restent communes");
  const lc = JSON.parse((await claire("lire_envies", { tuile: "tenues" })).content);
  assert.match(lc.questions.find(q => q.id === "tenues.style").reponse || "", /Bohème/);
  const julien = makeTools(db, { qcats: QCATS, now, partner: "julien", author: "Julien" });
  const lj = JSON.parse((await julien("lire_envies", { tuile: "tenues" })).content);
  assert.equal(lj.questions.find(q => q.id === "tenues.style").reponse, undefined, "Julien ne voit pas la réponse de Claire");
  const vj = (await julien("lister_prestataires", {})).content;
  assert.ok(!vj.includes("Maison Blanche"), "ni son prestataire");
  assert.match((await julien("detail_prestataire", { id: pid.split("/").pop() })).content, /introuvable/);
});
