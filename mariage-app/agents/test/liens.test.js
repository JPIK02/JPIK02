import { test } from "node:test";
import assert from "node:assert/strict";
import { nouveauJeton, empreinte, jetonValide, expiration, lienActif, limite, nettoyerEnvoi, vuePublique } from "../lib/liens.js";

test("jeton : long, aléatoire, empreinte stable", () => {
  const a = nouveauJeton(), b = nouveauJeton();
  assert.ok(jetonValide(a)); assert.notEqual(a, b); assert.equal(a.length, 43);
  assert.equal(empreinte(a), empreinte(a)); assert.equal(empreinte(a).length, 64);
  assert.ok(!jetonValide("court")); assert.ok(!jetonValide(a + "<script>")); assert.ok(!jetonValide(null));
});
test("expiration : le soir du mariage, sinon un an", () => {
  assert.equal(new Date(expiration("2028-05-20")).getDate(), 20);
  const t = Date.UTC(2026, 10, 22); assert.equal(expiration(null, t), t + 365 * 864e5);
  assert.ok(lienActif({ foyerId: "f", expire: Date.now() + 1000 }));
  assert.ok(!lienActif({ foyerId: "f", expire: Date.now() - 1 }), "expiré");
  assert.ok(!lienActif({ foyerId: "f", expire: Date.now() + 1000, revoque: true }), "révoqué");
  assert.ok(!lienActif(null));
});
test("limite de fréquence : 30 par heure et par jeton", () => {
  let c = {}, t = 36e5 * 1000;
  for (let i = 0; i < 30; i++) { const r = limite(c, t); assert.ok(r.ok); c = r.compte; }
  assert.ok(!limite(c, t).ok);
  assert.ok(limite(c, t + 36e5).ok, "l'heure suivante, le compte repart");
});
test("envoi nettoyé : seulement ses champs et les régimes de SES personnes", () => {
  const r = nettoyerEnvoi({ adresse: " 12 rue des Lilas\n59000 Lille ", email: "a@b.fr", tel: "+33 6 12 34 56 78", regimes: { g1: "Végétarien", autre: "x" }, role: "admin" }, [{ id: "g1" }, { id: "g2" }]);
  assert.deepEqual(r, { foyer: { adresse: "12 rue des Lilas\n59000 Lille", tel: "+33 6 12 34 56 78", email: "a@b.fr" }, regimes: { g1: "Végétarien" } });
  assert.equal(nettoyerEnvoi({ email: "pas un mail" }, []).erreur, "e-mail");
  assert.equal(nettoyerEnvoi({ tel: "appelez-moi" }, []).erreur, "téléphone");
  assert.equal(nettoyerEnvoi({ adresse: "x".repeat(900) }, []).foyer.adresse.length, 400);
});
test("vue publique : son foyer seulement, prénoms seuls", () => {
  const v = vuePublique({ foyer: { adresse: "A", note: "privée", cercle: "Famille" }, personnes: [{ id: "g1", name: "Paul Rousselot", regime: "", table: "3" }, { id: "g2", name: "+1", plusUn: true }], noms: { p1: "Claire", p2: "Julien" } });
  assert.equal(v.couple, "Claire et Julien"); assert.deepEqual(v.personnes.map(p => p.prenom), ["Paul", ""]);
  const s = JSON.stringify(v); assert.ok(!s.includes("privée") && !s.includes("Famille") && !s.includes("table") && !s.includes("Rousselot\""));
});
