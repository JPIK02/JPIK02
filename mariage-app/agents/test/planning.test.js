import { test } from "node:test";
import assert from "node:assert/strict";
import { ETAPES, themeDe, pourQui, etapeCourante, avancement, prochainement, joursDeRetard, ics } from "../lib/planning.js";

test("9 étapes, une par période", () => {
  assert.deepEqual(ETAPES.map(e => e.k), ["m12", "m9", "m6", "m4", "m2", "m1", "s1", "j", "apres"]);
});
test("thème : choisi, catalogue, réservation, mots du titre, prestataire, logistique", () => {
  assert.equal(themeDe({ id: "t05" }), "lieu");
  assert.equal(themeDe({ id: "t05", theme: "argent" }), "argent");
  assert.equal(themeDe({ id: "x1", kind: "acompte" }), "argent");
  assert.equal(themeDe({ id: "x2", kind: "contrat" }), "prestataires");
  assert.equal(themeDe({ id: "x3", title: "Rendez-vous à la mairie" }), "mairie");
  assert.equal(themeDe({ id: "x4", title: "Essayage chez la couturière" }), "tenues");
  assert.equal(themeDe({ id: "x5", title: "Rappeler Marc", vendorId: "v" }, [{ id: "v", cat: "Lieu" }]), "lieu");
  assert.equal(themeDe({ id: "x6", title: "Acheter des bougies" }), "logistique");
});
test("filtre : une tâche à deux apparaît sous chacun", () => {
  assert.ok(pourQui({ owner: "deux" }, "claire")); assert.ok(pourQui({}, "julien"));
  assert.ok(!pourQui({ owner: "julien" }, "claire")); assert.ok(pourQui({ owner: "julien" }, "all"));
});
test("étape courante : première étape avec des tâches non faites dont la fin n'est pas passée", () => {
  const today = new Date("2026-11-22T12:00:00"), fins = { m12: new Date("2027-08-20"), m9: new Date("2027-11-20") };
  const fin = k => fins[k] || new Date("2028-05-01");
  assert.equal(etapeCourante([{ phase: "m12", status: "done" }, { phase: "m9", status: "todo" }], { fin, today }), "m9");
  assert.equal(etapeCourante([{ phase: "m12", status: "todo" }], { fin, today }), "m12");
  // fin passée : l'étape suivante devient courante (les tâches restent en retard)
  assert.equal(etapeCourante([{ phase: "m12", status: "todo" }, { phase: "m9", status: "todo" }], { fin: k => (k === "m12" ? new Date("2026-01-01") : fin(k)), today }), "m9");
  // tout est fait : l'étape dont la période contient aujourd'hui
  assert.equal(etapeCourante([{ phase: "m12", status: "done" }], { fin, today }), "m12");
  // sans date
  assert.equal(etapeCourante([{ phase: "m6", status: "todo" }], { today }), "m6");
});
test("avancement et dernière tâche faite", () => {
  const a = avancement([{ phase: "m12", status: "done", title: "A", doneAt: 1 }, { phase: "m12", status: "done", title: "B", doneAt: 2 }, { phase: "m12", status: "todo" }]);
  assert.equal(a.m12.fait, 2); assert.equal(a.m12.total, 3); assert.equal(a.m12.derniere.title, "B"); assert.equal(a.j.total, 0);
});
test("prochainement : tâches et rendez-vous mêlés sur 60 jours, triés", () => {
  const today = new Date("2026-11-22T00:00:00"), D = s => new Date(s + "T12:00:00");
  const tasks = [{ id: "a", due: "2026-12-01" }, { id: "b", due: "2027-03-01" }, { id: "c", due: "2026-11-30", status: "done" }, { id: "d", due: "2026-11-25" }];
  const rdv = [{ id: "r", date: "2026-11-28" }, { id: "old", date: "2026-11-01" }];
  const p = prochainement(tasks, rdv, { due: t => D(t.due), dateRdv: r => D(r.date), today });
  assert.deepEqual(p.map(i => i.x.id), ["d", "r", "a"]);
});
test("retard en jours", () => {
  assert.equal(joursDeRetard(new Date("2026-11-12T12:00:00"), new Date("2026-11-22T12:00:00")), 10);
  assert.equal(joursDeRetard(new Date("2026-12-12"), new Date("2026-11-22")), 0);
});
test("fichier .ics d'un rendez-vous", () => {
  const avecHeure = ics({ id: "r1", date: "2027-03-14", time: "14:30", title: "Dégustation" }, { lieu: "Lille, rue X" });
  assert.match(avecHeure, /DTSTART:20270314T143000/); assert.match(avecHeure, /DTEND:20270314T153000/); assert.match(avecHeure, /LOCATION:Lille\\, rue X/);
  const journee = ics({ id: "r2", date: "2027-03-31", title: "Essayage" });
  assert.match(journee, /DTSTART;VALUE=DATE:20270331/); assert.match(journee, /DTEND;VALUE=DATE:20270401/);
});
