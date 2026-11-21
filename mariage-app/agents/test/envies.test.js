import { test } from "node:test";
import assert from "node:assert/strict";
import { TUILES, QUESTIONS, FAMILLES } from "../lib/envies/catalogue.js";
import { FR } from "../lib/envies/fr.js";
import { tileGris, jauge, explore, tileState, levelDone, answerText, QBY, nextStep } from "../lib/envies/logic.js";
import { migrateBrief } from "../lib/envies/migration.js";
import { QCATS } from "../../src/questions.js";

test("catalogue : 19 tuiles, 7 familles, identifiants uniques, textes pour tout", () => {
  assert.equal(TUILES.length, 19);
  assert.deepEqual([...new Set(TUILES.map(t => t.famille))], FAMILLES);
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length);
  assert.equal(QUESTIONS.filter(q => q.niveau === "essentiel").length, 57);
  for (const q of QUESTIONS) {
    const T = FR.questions[q.id];
    assert.ok(T && T.libelle && T.sertA, q.id);
    for (const c of q.choix || []) assert.ok(T.choix[c.id], `${q.id} ${c.id}`);
    if (q.format === "CU") assert.equal(T.crans.length, 5, q.id);
    if (q.format === "CC") assert.equal(q.choix.length, 2, q.id);
  }
  for (const t of TUILES) assert.ok(FR.tuiles[t.k].nom && FR.tuiles[t.k].pourquoi, t.k);
  assert.ok(QBY["invites.voiture"], "la voiture des mariés est gardée");
});

test("tuiles grisées : « Jamais » sur la 1re question, Officiant conditionnel, réactivation", () => {
  assert.equal(tileGris("video", { "video.envie": { v: { _: "j" } } }).gris, true);
  assert.equal(tileGris("video", { "video.envie": { v: { _: "j" } }, "_tuile.video": { actif: true } }).gris, false);
  assert.equal(tileGris("planner", { "planner.accompagnement": { v: { "organisation-complete": "j", "coordination-du-jour-j": "j", "conseils-ponctuels": "j" } } }).gris, true);
  assert.equal(tileGris("planner", { "planner.accompagnement": { v: { "organisation-complete": "j" } } }).gris, false);
  assert.deepEqual(tileGris("officiant", {}), { gris: true, raison: "pasLaique" });
  assert.equal(tileGris("officiant", { "ceremonie.types": { v: ["laique"] }, "ceremonie.officie": { v: ["un-proche"] } }).raison, "procheOfficie");
  assert.equal(tileGris("officiant", { "ceremonie.types": { v: ["laique"] }, "ceremonie.officie": { v: ["un-officiant-professionnel"] } }).gris, false);
});

test("jauge : jamais de 0 %, pondération 60/30/10, tuiles grisées exclues", () => {
  assert.equal(jauge({}, "claire"), null);
  const A = { "lieu.type": { v: ["chateau"] } };
  const j = jauge(A, "claire");
  assert.ok(j >= 1 && j <= 2, String(j));
  const vu = jauge({ "lieu.type": { vu: true } }, "claire");
  assert.equal(vu, null, "une question seulement passée ne compte pas");
});

test("niveaux, états et reprise", () => {
  const A = {};
  for (const id of ["lieu.type", "lieu.distance"]) A[id] = { v: ["x"] };
  assert.equal(levelDone("lieu", "essentiel", A, "claire"), false);
  assert.deepEqual(nextStep("lieu", A, "claire"), { niveau: "essentiel", index: 2, started: true });
  A["lieu.dedans"] = { vu: true };
  assert.equal(levelDone("lieu", "essentiel", A, "claire"), true);
  assert.equal(tileState("lieu", A, "claire"), "esquissee");
  assert.equal(tileState("lieu", A, "claire", "FR", "lieu"), "moment");
  assert.equal(tileState("tenues", {}, "claire"), "chacun");
  assert.equal(tileState("video", { "video.envie": { v: { _: "j" } } }, "claire"), "gris");
});

test("questions par partenaire : chacun sa réponse, le texte commun repris compte pour les deux", () => {
  const A = { "tenues.style": { p: { claire: { v: ["boheme"] } } } };
  assert.equal(levelDone("tenues", "essentiel", { ...A, "tenues.ou": { vu: true }, "tenues.nombre": { vu: true } }, "claire"), true);
  assert.equal(levelDone("tenues", "essentiel", { ...A, "tenues.ou": { vu: true }, "tenues.nombre": { vu: true } }, "julien"), false);
});

test("À explorer maintenant : le Lieu d'abord tant qu'il n'est pas réservé, puis le plus en retard", () => {
  const date = new Date("2028-05-20"), today = new Date("2026-11-20");
  assert.equal(explore({}, "claire", { date, today }).tuile, "lieu");
  const reserved = new Set(["Lieu"]);
  const e = explore({}, "claire", { date, today, reserved });
  assert.equal(e.tuile, "mariage", "le fil rouge (dès l'arrivée) est le plus en retard");
  assert.equal(explore({}, "claire", { date: null, today }).tuile, "mariage", "sans date : ordre des familles");
});

test("texte d'une réponse pour le coach", () => {
  assert.match(answerText(QBY["lieu.imposes"], { v: 5 }, FR), /Liberté totale/);
  assert.match(answerText(QBY["lieu.exclusif"], { v: { _: "a" } }, FR), /Absolument/);
  assert.match(answerText(QBY["mariage.style"], { v: ["boheme"], libre: "et simple" }, FR), /Bohème · et simple/);
});

test("migration : chaque ancienne question a sa règle, rien n'est perdu", () => {
  const docs = QCATS.flatMap(c => c.qs.map(([id, t, l, o]) => ({ id: `${c.k}--${id}`, commun: "un texte", ...(o ? { choix: [o[0]] } : {}) })));
  const r = migrateBrief(docs, { p1: "Alice", p2: "Bob" });
  for (const id of Object.keys(r.answers)) assert.ok(QBY[id], id);
  assert.deepEqual(r.archived.map(a => a.id).sort(), ["alliances--artisan", "tenues--budget", "traiteur--budgetpp", "vision--craintes", "vision--invites", "vision--periode"]);
  assert.deepEqual(r.answers["mariage.style"].v, ["champetre"]);
  assert.equal(r.answers["lieu.imposes"].v, 5, "« Indispensable » → liberté totale");
  assert.deepEqual(r.answers["video.envie"].v, { _: "a" });
  assert.match(r.answers["tenues.style"].libre, /Tenue de Alice : un texte/);
  assert.match(r.answers["invites.voiture"].libre, /^Réponse précédente : un texte$/);
  // chaque texte repris se retrouve quelque part
  const total = docs.length - r.archived.length;
  const texts = Object.values(r.answers).reduce((n, a) => n + (a.libre ? a.libre.split("\n").length : 0), 0);
  assert.ok(texts >= total, `${texts} textes pour ${total} questions`);
});

test("récompenses : ligne d'une note recalculée, reprise des demandes restées sans réponse", async () => {
  const { ligneNote, recompensesDues } = await import("../lib/envies/recompense.js");
  assert.deepEqual(ligneNote(55, 72, { forces: ["Orangerie lumineuse."], vigilance: ["Loin"] }), { type: "pour", texte: "Orangerie lumineuse" });
  assert.deepEqual(ligneNote(80, 68, { forces: ["Beau parc"], vigilance: ["Traiteur imposé"] }), { type: "verifier", texte: "Traiteur imposé" });
  assert.equal(ligneNote(null, 60, {}), null);
  const now = 1e12;
  assert.deepEqual(recompensesDues([{ id: "a", status: "demandee", requestedAt: now - 5 * 60e3 }, { id: "b", status: "demandee", requestedAt: now - 60e3 }, { id: "c", status: "prete" }], now).map(d => d.id), ["a"]);
});

test("récolte passive : proposée seulement sur une question sans réponse, comptée seulement une fois confirmée", async () => {
  const { buildReperee, pendingFor, confirmData, inSource, toAnswer } = await import("../lib/envies/reperees.js");
  const A = {};
  const r = buildReperee({ question: "lieu.type", choix: ["Château"], phrase: "un château avec un parc" }, FR, { A, source: "visite", ref: "v1", now: 5 });
  assert.equal(r.id, "lieu.type");
  assert.deepEqual(r.doc.v, ["chateau"], "libellé traduit en id de choix");
  assert.equal(r.doc.status, "attente");
  assert.equal(buildReperee({ question: "lieu.type", choix: ["chateau"] }, FR, { A, source: "coach" }), null, "sans phrase d'origine : rien");
  assert.equal(buildReperee({ question: "lieu.type", choix: ["chateau"], phrase: "x y z" }, FR, { A: { "lieu.type": { v: ["ferme"] } }, source: "coach" }), null, "déjà répondue : rien");
  assert.equal(buildReperee({ question: "video.envie", jpa: { _: "absolument" }, phrase: "on veut un film" }, FR, { A: { "_tuile.video": { pasPourNous: true } }, source: "coach" }), null, "tuile de côté : rien");
  // par partenaire : seulement pour celui qui l'a dit
  assert.equal(buildReperee({ question: "tenues.style", choix: ["boheme"], phrase: "une robe bohème" }, FR, { A, source: "pinterest" }), null);
  const t = buildReperee({ question: "tenues.style", choix: ["boheme"], phrase: "une robe bohème" }, FR, { A, source: "coach", pour: "claire" });
  assert.equal(t.id, "tenues.style.claire");
  const reps = [{ id: r.id, ...r.doc }, { id: t.id, ...t.doc }];
  assert.deepEqual(pendingFor(reps, A, "claire").map(x => x.id).sort(), ["lieu.type", "tenues.style.claire"]);
  assert.deepEqual(pendingFor(reps, A, "julien").map(x => x.id), ["lieu.type"]);
  // la jauge ne bouge pas tant que ce n'est pas confirmé
  assert.equal(jauge(A, "claire"), null);
  const c = confirmData(reps[0], {});
  assert.equal(jauge({ "lieu.type": c.data }, "claire") > 0, true);
  assert.deepEqual(confirmData(reps[1], { p: { julien: { v: ["chic"] } } }).data, { p: { julien: { v: ["chic"] }, claire: { v: ["boheme"] } } });
  assert.deepEqual(confirmData(reps[1], {}).fields, ["p.claire"]);
  // confirmée ou répondue entre-temps : plus montrée
  assert.deepEqual(pendingFor([{ ...reps[0], status: "confirmee" }], A, "claire"), []);
  assert.deepEqual(pendingFor(reps, { "lieu.type": { v: ["ferme"] } }, "julien"), []);
  // garde-fou : la phrase doit figurer dans la source
  assert.equal(inSource("« Un château avec parc. »", "Visite : un  CHÂTEAU avec parc, très beau"), true);
  assert.equal(inSource("une grange rénovée", "Visite : un château avec parc"), false);
  assert.throws(() => toAnswer({ question: "lieu.inconnue" }, FR), /question inconnue/);
});
