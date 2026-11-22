import { test } from "node:test";
import assert from "node:assert/strict";
import { etapeOf, etatMetier, compteur, aDecider, prochaineEtape, mentions, doublons, contacts, historique, METIERS, calendrier, rdvOf } from "../lib/prestataires.js";

const today = new Date("2026-11-22T12:00:00"), date = new Date("2028-05-20T12:00:00");
test("étapes : anciens statuts lus comme « En discussion »", () => {
  assert.equal(etapeOf({ status: "contacte" }), "discussion");
  assert.equal(etapeOf({ status: "devis" }), "discussion");
  assert.equal(etapeOf({}), "repere");
  assert.equal(etapeOf({ status: "ecarte" }), "ecarte");
  assert.ok(METIERS.includes("Lieu") && METIERS.at(-1) === "Autre");
});
test("états des métiers, compteur N sur M sans les tuiles « Pas pour nous » ni « Autre »", () => {
  const vs = [{ id: "a", cat: "Lieu", status: "reserve" }, { id: "b", cat: "Photographe", status: "repere" }, { id: "c", cat: "Autre", status: "repere" }];
  const A = { "planner.accompagnement": { v: { "organisation-complete": "j", "coordination-du-jour-j": "j", "conseils-ponctuels": "j" } } };
  assert.equal(etatMetier("Lieu", vs, A), "reserve");
  assert.equal(etatMetier("Photographe", vs, A), "enCours");
  assert.equal(etatMetier("Vidéaste", vs, A), "aLancer");
  assert.equal(etatMetier("Wedding planner", vs, A), "pasPourNous");
  const c = compteur(vs, A);
  assert.equal(c.n, 1);
  assert.equal(c.total, METIERS.length - 3, "sans Autre, Wedding planner (de côté) ni Officiant (pas de cérémonie laïque)");
  assert.equal(c.frise[0].etat, "reserve");
});
test("« À décider maintenant » : le Lieu d'abord, puis un métier en cours prêt à trancher, sinon à lancer", () => {
  assert.equal(aDecider([], {}, { date, today }).m, "Lieu");
  const vs = [{ id: "l", cat: "Lieu", status: "reserve" }, { id: "p1", cat: "Photographe", status: "repere", fit: { score: 80 } }, { id: "p2", cat: "Photographe", status: "discussion" }];
  const d = aDecider(vs, {}, { date: new Date("2027-11-20T12:00:00"), today });
  assert.equal(d.raison, "decider"); assert.equal(d.m, "Photographe");
  assert.equal(aDecider([{ id: "l", cat: "Lieu", status: "reserve" }], {}, { date, today }).raison, "lancer");
  assert.equal(aDecider([{ id: "l", cat: "Lieu", status: "reserve" }], {}, { date: new Date("2040-01-01"), today }), null, "rien d'urgent : pas de carte");
});
test("prochaine étape d'une fiche (6.4) et mentions calculées", () => {
  const v = { id: "v", name: "Atelier Lumière", cat: "Photographe", status: "discussion" };
  const rdv = [{ title: "Visio Atelier Lumière", date: "2026-12-02" }];
  assert.equal(prochaineEtape(v, { rdv, today }).k, "rdv");
  assert.equal(prochaineEtape(v, { rdv: [{ vendorId: "v", date: "2026-11-10" }], today }).k, "raconter");
  assert.equal(prochaineEtape({ ...v, visitNotes: "bien", visitNotesAt: +new Date("2026-11-11") }, { rdv: [{ vendorId: "v", date: "2026-11-10" }], today }).k, "devis");
  assert.equal(prochaineEtape({ ...v, devis: [{ montant: 2400 }] }, { today, candidats: 2 }).k, "comparer");
  assert.equal(prochaineEtape(v, { today, briefPret: true }).k, "brief");
  assert.equal(prochaineEtape({ ...v, status: "reserve", acompte: 500 }, { today }).k, "acompte");
  assert.deepEqual(mentions({ ...v, devis: [{ montant: 1 }] }, { rdv, today }).map(m => m.k), ["devis", "rdv"]);
  assert.equal(rdvOf(v, rdv).length, 1, "relié par le nom");
});
test("doublons signalés, contacts repérés dans le texte, historique", () => {
  const a = { id: "a", name: "Domaine X", cat: "Lieu", contact: "contact@domaine-x.fr, https://domaine-x.fr" };
  const b = { id: "b", name: "Autre nom", cat: "Lieu", contact: "www.domaine-x.fr" };
  assert.deepEqual(doublons(a, [a, b]).map(x => x.id), ["b"]);
  const c = contacts({ contact: "contact@domaine-x.fr · https://domaine-x.fr · instagram.com/domainex", tel: "06" });
  assert.equal(c.email, "contact@domaine-x.fr"); assert.equal(c.site, "https://domaine-x.fr"); assert.equal(c.instagram, "https://instagram.com/domainex");
  const h = historique({ id: "a", createdAt: 1, devis: [{ montant: 2, recuLe: "2026-11-14" }, { montant: 3, recuLe: "2026-11-06" }] });
  assert.deepEqual(h.map(e => e.k), ["devis", "devis", "repere"]); assert.equal(h[0].version, 2);
});
test("calendrier de l'onglet vide", () => {
  const c = calendrier([], {}, { date, today });
  assert.ok(c.maintenant.some(x => x.m === "Lieu"));
  assert.ok(calendrier([], {}, {}).sansDate);
});
