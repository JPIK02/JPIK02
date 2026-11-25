import { test } from "node:test";
import assert from "node:assert/strict";
import { estPrive, fusion, resumeSecret, proprietaireTenue, enviesTenueDe, questionSecrete } from "../lib/secret.js";
import { levelDone } from "../lib/envies/logic.js";

test("tenue secrète : ce qui va dans l'espace privé", () => {
  assert.equal(questionSecrete("tenues.style"), true);
  assert.equal(questionSecrete("tenues.temoins"), false, "les questions communes de la tuile restent communes");
  assert.equal(estPrive("vendors", { cat: "Tenues" }), true);
  assert.equal(estPrive("vendors", { cat: "Alliances" }), false, "les alliances restent communes");
  assert.equal(estPrive("vendors", { cat: "Tenues" }, { montre: true }), false, "secret levé");
  assert.equal(estPrive("inspirations", { cat: "tenues" }), true);
  assert.equal(estPrive("envies", { id: "tenues.style" }), true);
  assert.equal(estPrive("recompenses", { id: "tenues.essentiel" }), true);
  assert.equal(estPrive("recompenses", { id: "lieu.essentiel" }), false);
});
test("fusion : ma réponse privée prend la place de p.<moi>, mes documents privés s'ajoutent", () => {
  const A = fusion("envies", [{ id: "tenues.style", libre: "commun" }, { id: "lieu.type", v: ["chateau"] }], [{ id: "tenues.style", v: ["boheme"], by: "x" }, { id: "tenues.ou", vu: true }], "claire");
  const st = A.find(d => d.id === "tenues.style");
  assert.deepEqual(st.p.claire, { v: ["boheme"] }); assert.equal(st.libre, undefined); assert.equal(st._prive, true); // texte commun d'une question secrète : ignoré
  assert.equal(A.find(d => d.id === "tenues.ou").p.claire.vu, true);
  const vs = fusion("vendors", [{ id: "a", cat: "Lieu" }], [{ id: "b", cat: "Tenues" }], "claire");
  assert.deepEqual(vs.map(v => [v.id, !!v._prive]), [["a", false], ["b", true]]);
  const rdv = fusion("rdv", [{ id: "r1", title: "Rendez-vous tenue de Claire", secretDe: "claire" }, { id: "r2" }], [{ id: "p1", title: "Essayage" }], "claire");
  assert.deepEqual(rdv.map(r => r.id), ["r2", "p1"], "mon repère commun est remplacé par mon vrai rendez-vous");
  assert.deepEqual(fusion("rdv", [{ id: "r1", secretDe: "claire" }], [], "julien").map(r => r.id), ["r1"], "l'autre voit le repère");
});
test("ce que l'autre sait : avancement et nombre, sans contenu", () => {
  const envies = fusion("envies", [], [{ id: "tenues.style", v: ["boheme"] }, { id: "tenues.ou", vu: true }, { id: "tenues.nombre", vu: true }], "claire");
  const r = resumeSecret({ envies, vendors: [{ id: "b", cat: "Tenues", status: "reserve", _prive: true, name: "Boutique" }], me: "claire", levelDone });
  assert.deepEqual(r, { niveaux: { essentiel: true, details: false, pro: false }, repondues: 1, prestataires: 1, reserve: true, montre: false });
  assert.ok(!JSON.stringify(r).includes("Boutique") && !JSON.stringify(r).includes("boheme"));
});
test("règle du couple : robe → Claire, costume → Julien", () => {
  assert.equal(proprietaireTenue("Boutique de robes de mariée"), "claire");
  assert.equal(proprietaireTenue("Tailleur sur mesure, costumes et smokings"), "julien");
  assert.equal(proprietaireTenue("Atelier de retouches"), null);
});
test("brief tenue : mes réponses seulement, jamais celles de l'autre ni le budget commun", () => {
  const commun = [{ id: "tenues.style", p: { julien: { v: ["smoking"] } }, libre: "" }, { id: "tenues.temoins", v: ["assortis"] },
    { id: "_tuile.tenues", importance: 4, budget: 3000 }, { id: "lieu.type", v: ["chateau"] }];
  const e = enviesTenueDe(commun, [{ id: "tenues.style", v: ["boheme"] }], "claire");
  const txt = JSON.stringify(e);
  assert.ok(txt.includes("boheme") && txt.includes("assortis") && txt.includes('"importance":4'));
  assert.ok(!txt.includes("smoking") && !txt.includes("julien") && !txt.includes("3000") && !txt.includes("chateau"));
});
test("question secrète : un contenu commun (ancien texte des deux tenues) est ignoré partout", () => {
  const e = fusion("envies", [{ id: "tenues.style", v: ["a"], libre: "robe X, smoking Y", p: { julien: { v: ["moderne"] } } }, { id: "tenues.temoins", v: ["assortis"] }], [{ id: "tenues.style", v: ["boheme"] }], "claire");
  const st = e.find(d => d.id === "tenues.style");
  assert.equal(st.libre, undefined); assert.equal(st.v, undefined); assert.deepEqual(st.p.claire.v, ["boheme"]);
  assert.deepEqual(e.find(d => d.id === "tenues.temoins").v, ["assortis"]); // les questions communes de la tuile restent
  const txt = JSON.stringify(enviesTenueDe([{ id: "tenues.style", libre: "robe X, smoking Y" }], [{ id: "tenues.style", v: ["boheme"] }], "claire"));
  assert.ok(!txt.includes("smoking"));
});
