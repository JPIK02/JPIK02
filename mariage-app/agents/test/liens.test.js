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
test("adresse (avant le faire-part) : ses champs seulement, plus aucun régime, adresse obligatoire", () => {
  const r = nettoyerEnvoi({ adresse: " 12 rue des Lilas\n59000 Lille ", email: "a@b.fr", tel: "+33 6 12 34 56 78", regimes: { g1: "Végétarien" }, role: "admin" }, [{ id: "g1" }, { id: "g2" }]);
  assert.deepEqual(r, { foyer: { adresse: "12 rue des Lilas\n59000 Lille", email: "a@b.fr", tel: "+33 6 12 34 56 78" }, guests: {} });
  assert.equal(nettoyerEnvoi({ adresse: "x", email: "pas un mail" }, []).erreur, "e-mail");
  assert.equal(nettoyerEnvoi({ adresse: "x", tel: "appelez-moi" }, []).erreur, "téléphone");
  assert.equal(nettoyerEnvoi({ email: "a@b.fr" }, []).erreur, "adresse");
  assert.equal(nettoyerEnvoi({ adresse: "x".repeat(900) }, []).foyer.adresse.length, 400);
});
test("réponse (faire-part envoyé) : SES personnes, moments invités, régime de qui vient, prénom d'un +1", () => {
  const P = [{ id: "g1", name: "Paul R", vin: false }, { id: "g2", name: "+1", plusUn: true }, { id: "g3", name: "Léa R", regime: "sans gluten" }];
  const r = nettoyerEnvoi({ reponses: { g1: { rsvp: "oui", absents: ["vin", "diner", "piraté"], regime: "Végétarien" }, g2: { rsvp: "oui", prenom: "Sam" }, g3: { rsvp: "non", regime: "x" }, autre: { rsvp: "oui" } } }, P, { mode: "reponse" });
  assert.deepEqual(r.foyer, {});
  assert.deepEqual(r.guests.g1, { rsvp: "oui", absentA: { diner: true }, regime: "Végétarien" });
  assert.deepEqual(r.guests.g2, { rsvp: "oui", absentA: {}, name: "Sam" });
  assert.deepEqual(r.guests.g3, { rsvp: "non" }); assert.equal(r.guests.autre, undefined);
  assert.equal(nettoyerEnvoi({ reponses: { g1: { rsvp: "oui", prenom: "Pirate" } } }, P, { mode: "reponse" }).guests.g1.name, undefined);
  assert.equal(nettoyerEnvoi({ adresse: "Nouvelle", reponses: {} }, P, { mode: "reponse" }).foyer.adresse, "Nouvelle");
});
test("vue publique : son foyer seulement, prénoms seuls ; la réponse seulement après le faire-part", () => {
  const P = [{ id: "g1", name: "Paul Rousselot", regime: "", table: "3", vin: false }, { id: "g2", name: "+1", plusUn: true }];
  let v = vuePublique({ foyer: { adresse: "A", note: "privée", cercle: "Famille" }, personnes: P, noms: { p1: "Claire", p2: "Julien" } });
  assert.equal(v.mode, "adresse"); assert.equal(v.couple, "Claire et Julien"); assert.equal(v.personnes, undefined);
  let s = JSON.stringify(v); assert.ok(!s.includes("privée") && !s.includes("Famille") && !s.includes("table") && !s.includes("\"3\""));
  v = vuePublique({ foyer: { etape: "fairepart", note: "privée" }, personnes: P, settings: { date: "2099-06-10" }, maintenant: Date.UTC(2099, 0, 1) });
  assert.equal(v.mode, "reponse"); assert.equal(v.limite, "2099-04-10"); assert.equal(v.ouvert, true);
  assert.deepEqual(v.personnes.map(p => p.prenom), ["Paul", ""]); assert.equal(v.personnes[1].aNommer, true);
  assert.deepEqual(v.personnes[0].moments.map(m => m.k), ["ceremonie", "diner"]);
  s = JSON.stringify(v); assert.ok(!s.includes("privée") && !s.includes("table"));
  assert.equal(vuePublique({ foyer: { etape: "fairepart" }, personnes: P, settings: { date: "2099-06-10" }, maintenant: Date.UTC(2099, 4, 1) }).ouvert, false);
});
