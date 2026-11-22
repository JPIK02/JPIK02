import { test } from "node:test";
import assert from "node:assert/strict";
import { metierDe, attendus, bilan, barre, etatPoste, rattacher, ecartEnvies, devisFace } from "../lib/budget.js";

test("métier d'un poste : choisi, deviné par le nom, ou libre", () => {
  assert.equal(metierDe({ label: "Photographe" }), "Photographe");
  assert.equal(metierDe({ label: "Réception & salle" }), "Lieu");
  assert.equal(metierDe({ label: "Gestion du risque" }), null);
  assert.equal(metierDe({ label: "Photo", metier: "-" }), null);
  assert.equal(metierDe({ label: "Photo", metier: "" }), "Photographe");
  assert.equal(metierDe({ label: "Divers", metier: "Fleuriste" }), "Fleuriste");
});
test("par invité : invités attendus (présents + en attente, hors absents)", () => {
  const guests = [...Array(3)].map(() => ({ rsvp: "oui" })).concat([...Array(38)].map(() => ({ rsvp: "attente" })), [{ rsvp: "non" }, { rsvp: "non" }]);
  assert.equal(attendus(guests), 41);
  const b = bilan({ lignes: [{ id: "a", label: "Lieu", prevu: 22600 }], guests, limite: 20000 });
  assert.equal(b.parInvite, 551);
  assert.equal(b.depasse, 2600); assert.equal(b.marge, null);
  assert.equal(attendus([], 80), 80);
});
test("signé et payé : le plus grand de la saisie et des prestataires réservés, jamais additionnés", () => {
  const lignes = [{ id: "l", label: "Lieu", prevu: 9000, engage: 8000, paye: 1000 }, { id: "p", label: "Photographe", prevu: 2500 }];
  const vendors = [{ id: "v1", name: "Château", cat: "Lieu", status: "reserve", prix: 8500, acompte: 2500, acomptePaye: true },
    { id: "v2", cat: "Photographe", status: "discussion", prix: 2800 }];
  const b = bilan({ lignes, vendors, limite: 15000 });
  const lieu = b.postes[0];
  assert.equal(lieu.signe, 8500); assert.equal(lieu.paye, 2500);
  assert.equal(b.marge, 15000 - 11500);
  assert.deepEqual(etatPoste(lieu, { vendors }), { k: "reserve", nom: "Château", paye: 2500 });
  assert.deepEqual(etatPoste(b.postes[1], { vendors }), { k: "devis", meilleur: 2800, ecart: 300 });
});
test("dépenses hors prestataire : comptent dans le signé et le payé", () => {
  const b = bilan({ lignes: [{ id: "x", label: "Photographe", prevu: 3000, depenses: [{ label: "Album", montant: 400, paye: true }, { label: "Tirages", montant: 100 }] }] });
  assert.equal(b.postes[0].signe, 400); assert.equal(b.postes[0].paye, 400);
});
test("états d'un poste : signé au-dessus, candidats sans devis, estimation par invité", () => {
  const p = (b, vendors = []) => bilan({ lignes: [b], vendors }).postes[0];
  assert.deepEqual(etatPoste(p({ id: "a", label: "Fleuriste", prevu: 1000, engage: 1300 })), { k: "signeDessus", ecart: 300 });
  const vs = [{ id: "c1", cat: "Lieu", status: "repere" }, { id: "c2", cat: "Lieu", status: "discussion" }];
  assert.deepEqual(etatPoste(p({ id: "b", label: "Lieu", prevu: 9000 }, vs), { vendors: vs }), { k: "sansDevis", n: 2, metier: "Lieu" });
  assert.deepEqual(etatPoste(p({ id: "c", label: "Traiteur", prevu: 5000 }), { attendus: 41 }), { k: "estimation", parInvite: 122 });
  assert.deepEqual(etatPoste(p({ id: "d", label: "Gestion du risque", prevu: 500 })), { k: "estimation", parInvite: 0 });
});
test("tenue secrète : ma boutique va sur « Tenue de <moi> », jamais sur la ligne de l'autre", () => {
  const lignes = [{ id: "c", label: "Tenue de Claire", engage: 1500 }, { id: "j", label: "Tenue de Julien" }];
  const r = rattacher(lignes, [{ id: "t", cat: "Tenues", status: "reserve", prix: 900, _prive: true }], { prenomMoi: "Julien" });
  assert.deepEqual(r.c, []); assert.equal(r.j.length, 1);
  const b = bilan({ lignes, vendors: [{ id: "s", cat: "Tenues", status: "reserve", _secretDe: "claire" }], prenomMoi: "Julien" });
  assert.equal(b.postes[0].signe, 1500); // la tenue de l'autre : son montant seul, saisi sur sa ligne
});
test("barre : parts payé · signé · prévu, et dépassement au-dessus de la limite", () => {
  const sous = barre({ prevu: 15000, signe: 6000, paye: 2000, limite: 20000 });
  assert.equal(sous.paye, 10); assert.equal(sous.signe, 20); assert.equal(sous.prevu, 45); assert.equal(sous.depasse, 0); assert.equal(sous.limite, 100);
  const dessus = barre({ prevu: 25000, signe: 0, paye: 0, limite: 20000 });
  assert.equal(dessus.limite, 80); assert.equal(dessus.depasse, 20);
});
test("devis face à l'enveloppe et écart avec Nos envies", () => {
  const d = devisFace("Photographe", [{ id: "a", cat: "Photographe", status: "discussion", prix: 2800, fit: { score: 81.4 } }, { id: "b", cat: "Photographe", status: "repere" }], 2500);
  assert.deepEqual(d.map(x => [x.v.id, x.prix, x.ecart, x.fit]), [["a", 2800, 300, 81], ["b", 0, null, null]]);
  assert.equal(ecartEnvies(3000, 2500), 500); assert.equal(ecartEnvies(2600, 2500), 0);
});
import { echeancesDe } from "../lib/budget.js";
test("échéances : d'après le devis, sinon 30 % à la signature et solde J-7 « à confirmer »", () => {
  const date = new Date("2028-05-20T12:00:00");
  assert.deepEqual(echeancesDe({ prix: 8500, acompte: 2500, dateAcompte: "2026-12-01", dateSolde: "2028-04-20", acomptePaye: true }, { date }),
    [{ kind: "acompte", montant: 2500, date: "2026-12-01", aConfirmer: false, paye: true }, { kind: "solde", montant: 6000, date: "2028-04-20", aConfirmer: false, paye: false }]);
  const e = echeancesDe({ prix: 2000, reserveLe: new Date("2026-11-22T10:00:00").getTime() }, { date });
  assert.deepEqual(e, [{ kind: "acompte", montant: 600, date: "2026-11-22", aConfirmer: true, paye: false }, { kind: "solde", montant: 1400, date: "2028-05-13", aConfirmer: true, paye: false }]);
  assert.deepEqual(echeancesDe({}), []);
});
import { nettoyerPistes } from "../lib/budget.js";
test("pistes d'arbitrage : postes réels, jamais sous le signé, gain recalculé", () => {
  const postes = [{ b: { id: "a", label: "Traiteur" }, prevu: 7000, signe: 0 }, { b: { id: "b", label: "Lieu" }, prevu: 4000, signe: 3500 }];
  const p = nettoyerPistes([
    { titre: "Menu plus simple", pourquoi: "x", perte: "y", gain: 99999, changements: [{ posteId: "a", enveloppe: 5600 }] },
    { titre: "Lieu moins cher", changements: [{ posteId: "b", enveloppe: 3000 }] },        // ramené au signé : 500 €
    { titre: "Inventée", changements: [{ posteId: "zzz", enveloppe: 1 }] },                // poste inconnu : retirée
    { titre: "Hausse", changements: [{ posteId: "a", enveloppe: 8000 }] },                 // pas une économie : retirée
  ], postes);
  assert.deepEqual(p.map(x => [x.titre, x.gain]), [["Menu plus simple", 1400], ["Lieu moins cher", 500]]);
  assert.equal(p[1].changements[0].apres, 3500);
});
import { nettoyerRepartition } from "../lib/budget.js";
test("répartition du budget vide : ramenée exactement au total, métiers du catalogue seulement", () => {
  const r = nettoyerRepartition({ postes: [{ label: "Lieu", metier: "Lieu", montant: 6000 }, { label: "Traiteur", metier: "Traiteur", montant: 9000 }, { label: "Divers", metier: "Inventé", montant: 1000 }, { label: "", montant: 5 }] }, { total: 20000 });
  assert.equal(r.postes.reduce((s, p) => s + p.montant, 0), 20000);
  assert.deepEqual(r.postes.map(p => p.metier), ["Lieu", "Traiteur", null]);
  assert.ok(r.postes.every(p => p.montant % 50 === 0));
  const est = nettoyerRepartition({ total: 18000, postes: [{ label: "Lieu", montant: 1 }, { label: "Traiteur", montant: 1 }] });
  assert.equal(est.total, 18000); assert.deepEqual(est.postes.map(p => p.montant), [9000, 9000]);
  assert.deepEqual(nettoyerRepartition({ postes: [] }, { total: 1000 }), { total: 0, postes: [] });
});
