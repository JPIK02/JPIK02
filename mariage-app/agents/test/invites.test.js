import { test } from "node:test";
import assert from "node:assert/strict";
import { foyersDe, nomFoyer, compte, momentDe, statutAffiche, points, cercles, proposerFoyers, carteAction, estPlusUn } from "../lib/invites.js";

const G = (id, name, o = {}) => ({ id, name, side: "commun", group: "Famille", ...o });
test("foyers : documents + personnes seules (foyer virtuel d'une personne)", () => {
  const f = foyersDe([G("a", "Paul Martin", { foyerId: "f1" }), G("b", "Léa Martin", { foyerId: "f1" }), G("c", "Zoé Petit")], [{ id: "f1", side: "julien", etape: "std" }, { id: "vide" }]);
  assert.equal(f.length, 2);
  assert.deepEqual(f[0].personnes.map(g => g.id), ["a", "b"]); assert.equal(f[0].side, "julien"); assert.equal(f[0].etape, "std");
  assert.equal(f[1].id, "g:c"); assert.ok(f[1].virtuel);
});
test("nom d'un foyer", () => {
  assert.equal(nomFoyer({ personnes: [G("a", "Paul Martin"), G("b", "Léa Martin")] }), "Paul et Léa Martin");
  assert.equal(nomFoyer({ personnes: [G("a", "Paul Martin"), G("b", "Léa Martin"), G("c", "Tom Martin", { enfant: true })] }), "Famille Martin");
  assert.equal(nomFoyer({ personnes: [G("a", "Alejandra Ruiz"), G("b", "+1", { plusUn: true })] }), "Alejandra Ruiz et son accompagnant");
  assert.equal(nomFoyer({ nom: "Les Rousselot", personnes: [] }), "Les Rousselot");
  assert.equal(nomFoyer({ personnes: [G("a", "Inès"), G("b", "Hugo"), G("c", "Nina", { enfant: true })] }), "Inès, Hugo et Nina");
});
test("comptes : un +1 compte une place", () => {
  assert.deepEqual(compte([G("a", "Paul"), G("b", "+1", { plusUn: true }), G("c", "Tom", { enfant: true })]), { places: 3, adultes: 2, enfants: 1 });
  assert.ok(estPlusUn({ name: "+1 de Marie" })); assert.ok(estPlusUn({ name: "Conjoint de Paul" })); assert.ok(!estPlusUn({ name: "Paul" }));
});
test("moment et statut : jamais « en attente » avant le faire-part", () => {
  assert.equal(momentDe([{ etape: "liste" }, { etape: "std" }]), 1);
  assert.equal(momentDe([{ etape: "fairepart" }]), 2);
  assert.equal(statutAffiche({ rsvp: "attente" }, { etape: "std" }), "liste");
  assert.equal(statutAffiche({ rsvp: "oui" }, { etape: "liste" }), "liste");
  assert.equal(statutAffiche({ rsvp: "attente" }, { etape: "fairepart" }), "sans");
  assert.equal(statutAffiche({ rsvp: "non" }, { etape: "repondu" }), "non");
});
test("points : un par place jusqu'à la cible, au-delà marqués, un pour deux après 150", () => {
  const gs = [G("a", "A", { side: "claire" }), G("b", "B", { side: "julien" }), G("c", "C")];
  const p = points(gs, 5);
  assert.deepEqual(p.points.map(x => x.c), ["claire", "julien", "commun", "libre", "libre"]); assert.equal(p.libres, 2);
  const trop = points(gs, 2); assert.equal(trop.auDessus, 1); assert.equal(trop.points.filter(x => x.trop).length, 1);
  const grand = points(Array.from({ length: 160 }, (_, i) => G(String(i), "X")), 180); assert.equal(grand.pas, 2); assert.equal(grand.points.length, 90);
});
test("cercles : par taille, « sans cercle » à la fin", () => {
  const c = cercles(foyersDe([G("a", "A"), G("b", "B", { group: "Amis" }), G("c", "C", { group: "Amis" }), G("d", "D", { group: "" })]));
  assert.deepEqual(c.map(x => [x.nom, x.personnes.length]), [["Amis", 2], ["Famille", 1], ["", 1]]);
});
test("foyers proposés : même nom de famille et même cercle, +1 rattaché, enfants avec leurs parents", () => {
  const gs = [G("a", "Paul Martin"), G("b", "Léa Martin"), G("k", "Tom Martin", { enfant: true }), G("x", "Jean Martin", { group: "Amis" }),
    G("m", "Marie Dupont"), G("p", "+1 de Marie"), G("s", "Zoé Petit"), G("z", "Anne Roy", { foyerId: "deja" }), G("w", "Luc Roy")];
  const pr = proposerFoyers(gs);
  assert.deepEqual(pr.map(x => x.ids.sort()), [["a", "b", "k"], ["m", "p"]]);
  assert.equal(pr[0].nom, "Famille Martin");
});
test("carte d'action : regrouper d'abord, puis adresses, puis prêts", () => {
  const gs = [G("a", "Paul Martin"), G("b", "Léa Martin")];
  assert.equal(carteAction(foyersDe(gs), gs).k, "regrouper");
  const g2 = [G("a", "Paul Martin", { foyerId: "f" }), G("b", "Léa Martin", { foyerId: "f" })];
  assert.equal(carteAction(foyersDe(g2, [{ id: "f" }]), g2).k, "adresses");
  assert.equal(carteAction(foyersDe(g2, [{ id: "f", adresse: "1 rue X" }]), g2).k, "prets");
});
test("+1 de X : rattaché à la bonne personne (même côté et même cercle)", () => {
  const gs = [G("a", "Alejandra", { side: "commun", group: "" }), G("b", "Alejandra Ruiz", { side: "claire", group: "Amis" }), G("p", "+1 de Alejandra", { side: "claire", group: "Amis" })];
  assert.deepEqual(proposerFoyers(gs).map(x => x.ids.sort()), [["b", "p"]]);
});
