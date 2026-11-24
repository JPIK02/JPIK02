import { test } from "node:test";
import assert from "node:assert/strict";
import { minDe, hDe, hLisible, momentsDe, barre, heureEntre, rolesDe, personneDe, aCaler, compteurs, coucherSoleil, minutesLocales, villeDe, villeSoleil, lieuReserve, trouDe } from "../lib/jourj.js";

test("heures : nuit du jour J après minuit", () => {
  assert.equal(minDe("14:30"), 870); assert.equal(minDe("01:15"), 25 * 60 + 15); assert.equal(minDe("14h05"), 845);
  assert.equal(minDe(""), null); assert.equal(minDe("25:00"), null);
  assert.equal(hDe(25 * 60 + 15), "01:15"); assert.equal(hLisible(870), "14 h 30"); assert.equal(hLisible(900), "15 h");
});

test("moments : ancien déroulé lu tel quel, fin estimée", () => {
  const ms = momentsDe([
    { id: "b", time: "16:00", title: "Vin d'honneur", lieu: "Parc", qui: "Tous", note: "n" },
    { id: "a", time: "14:00", title: "Cérémonie", fin: "15:30", template: true },
    { id: "c", time: "01:00", title: "Fin de soirée" },
    { id: "d", title: "Sans heure" },
  ]);
  assert.deepEqual(ms.map(m => m.id), ["a", "b", "c", "d"]);
  assert.equal(ms[0].fin, 930); assert.equal(ms[0].finEstimee, false); assert.equal(ms[0].template, true);
  assert.equal(ms[1].fin, 25 * 60); assert.equal(ms[1].detail, "Tous"); assert.equal(ms[1].note, "n");
  assert.equal(ms[2].fin, 26 * 60); assert.equal(ms[3].fin, null);
  assert.deepEqual(ms[1].voit, { invites: true, prestataires: true, temoins: true });
});

test("barre de la journée", () => {
  const b = barre(momentsDe([{ id: "a", time: "14:00", title: "A", cle: true }, { id: "b", time: "18:00", title: "B", fin: "02:00" }]));
  assert.equal(b.debut, 840); assert.equal(b.fin, 26 * 60);
  assert.equal(b.segments[0].x, 0); assert.ok(Math.abs(b.segments[0].w - 100 / 3) < 0.01); assert.equal(b.segments[0].cle, true);
  assert.ok(b.reperes.length >= 3 && b.reperes.length <= 6); assert.equal(barre([]), null);
});

test("glisser : heure entre deux voisins, arrondie", () => {
  assert.equal(heureEntre(840, 960), 900); assert.equal(heureEntre(840, 845), 845);
  assert.equal(heureEntre(840, null), 900); assert.equal(heureEntre(null, 840), 780); assert.equal(heureEntre(null, null), 840);
});

test("rôles par défaut et personne", () => {
  const r = rolesDe({}); assert.equal(r.length, 4); assert.equal(r[0].nom, "Maître de cérémonie");
  assert.equal(rolesDe({ roles: [] }).length, 0);
  const g = [{ id: "g1", name: "Léa" }];
  assert.equal(personneDe({ guestId: "g1" }, g).nom, "Léa"); assert.equal(personneDe({ personne: " Tom " }, g).nom, "Tom"); assert.equal(personneDe({}, g), null);
});

test("à caler : ordre du dossier, seulement les prestataires réservés", () => {
  const vendors = [{ id: "v1", name: "Photo", status: "reserve" }, { id: "v2", name: "DJ", status: "discussion" }];
  const moments = momentsDe([
    { id: "m1", time: "14:00", title: "Cérémonie", exterieur: true, prestas: [{ vendorId: "v1" }, { vendorId: "v2" }], objets: [{ id: "o1", label: "Alliances" }, { id: "o2", label: "Livret", qui: "Tom" }] },
    { id: "m2", time: "16:00", title: "Vin", exterieur: true, pluie: "Sous la halle", prestas: [{ vendorId: "v1", arrivee: "15:30" }] },
  ]);
  const roles = [{ id: "r1", nom: "MC", personne: "Tom" }, { id: "r2", nom: "Alliances" }];
  const t = aCaler({ moments, roles, vendors });
  assert.deepEqual(t.map(x => x.k), ["arrivee", "role", "pluie", "objet"]);
  assert.equal(t[0].vendor, "Photo"); assert.equal(t[3].objet, "Alliances");
  assert.equal(trouDe(moments[0], t).k, "arrivee"); assert.equal(trouDe(moments[1], t), null);
  assert.deepEqual(compteurs({ moments, roles, vendors }), { moments: 2, prestataires: 1, aConfier: 1 });
});

test("coucher du soleil : Paris au solstice, Bordeaux en septembre", () => {
  const p = minutesLocales(coucherSoleil("2027-06-21", 48.857, 2.352));
  assert.ok(Math.abs(p - (21 * 60 + 58)) <= 3, `Paris ${hDe(p)}`);
  const b = minutesLocales(coucherSoleil("2028-09-09", 44.838, -0.579));
  assert.ok(Math.abs(b - (20 * 60 + 25)) <= 4, `Bordeaux ${hDe(b)}`);
  assert.equal(coucherSoleil("", 48, 2), null); assert.equal(coucherSoleil("2027-06-21", null, 2), null);
});

test("ville : nom, code postal, Corse, rien", () => {
  assert.equal(villeDe("Château de la Loire, Amboise").nom, "Amboise");
  assert.equal(villeDe("Domaine X, 37150 Civray").nom, "Tours");
  assert.equal(villeDe("20000 Ajaccio").nom, "Ajaccio"); assert.equal(villeDe("Mas, 20217 Saint-Florent").nom, "Bastia");
  assert.equal(villeDe("Saint-Rémy-de-Provence").nom, "Saint-Rémy-de-Provence");
  assert.equal(villeDe("Domaine des Oliviers"), null); assert.equal(villeDe(""), null);
  const vendors = [{ id: "l", cat: "Lieu", status: "reserve", name: "Domaine", ville: "Uzès" }];
  assert.equal(lieuReserve(vendors).id, "l");
  assert.equal(villeSoleil({ vendors, settings: { ville: "Paris" } }).nom, "Uzès");
  assert.equal(villeSoleil({ vendors: [], settings: { ville: "Paris" } }).nom, "Paris");
  assert.equal(villeSoleil({ choix: "Nice", vendors }).nom, "Nice");
});

import { fichePrestataire, empreinteFiche, etatFiche, fichesModifiees, momentsPourMetier, contactSurPlace, visiblesPar, cleTrou, moisAvant } from "../lib/jourj.js";

test("fiche prestataire : ses moments, rien d'autre, ce qui manque", () => {
  const v = { id: "ph", name: "Studio", cat: "Photographe", status: "reserve", prix: 3000, devis: [{ montant: 3000 }] };
  const autre = { id: "dj", name: "DJ", status: "reserve" };
  const moments = momentsDe([
    { id: "a", time: "14:00", title: "Cérémonie", exterieur: true, pluie: "Halle", prestas: [{ vendorId: "ph", arrivee: "13:15", tache: "Photos" }, { vendorId: "dj" }] },
    { id: "b", time: "16:00", title: "Photos de couple", voit: { invites: false } },
    { id: "c", time: "19:00", title: "Dîner", prestas: [{ vendorId: "ph" }], voit: { prestataires: false } },
  ]);
  let f = fichePrestataire(v, { moments, roles: [{ id: "contact", nom: "Contact des prestataires" }] });
  assert.equal(f.manque, "arrivee"); assert.equal(f.moments.length, 2); assert.equal(f.arrivee, 13 * 60 + 15);
  assert.deepEqual(f.journee.map(j => j.nom), ["Cérémonie", "Photos de couple"]);
  const json = JSON.stringify(f); assert.ok(!json.includes("3000") && !json.includes("DJ"));
  const m2 = momentsDe([{ id: "a", time: "14:00", title: "Cérémonie", prestas: [{ vendorId: "ph", arrivee: "13:15" }] }]);
  f = fichePrestataire(v, { moments: m2, roles: [{ id: "contact", nom: "Contact", personne: "Tom", tel: "06" }] });
  assert.equal(f.manque, null); assert.deepEqual(f.contact, { nom: "Tom", tel: "06" });
  assert.equal(fichePrestataire(v, { moments: [] }).manque, "moments");
  assert.equal(fichePrestataire(v, { moments: m2, roles: [] }).manque, "contact");
  // envoi puis modification
  const e = { envoyeLe: 1, empreinte: empreinteFiche(f) };
  assert.equal(etatFiche(f, null).k, "prete"); assert.equal(etatFiche(f, e).k, "envoyee");
  const m3 = momentsDe([{ id: "a", time: "14:30", title: "Cérémonie", prestas: [{ vendorId: "ph", arrivee: "13:15" }] }]);
  const roles = [{ id: "contact", nom: "Contact", personne: "Tom", tel: "06" }];
  assert.equal(etatFiche(fichePrestataire(v, { moments: m3, roles }), e).k, "maj");
  assert.deepEqual(fichesModifiees({ moments: m3, roles, vendors: [v, autre], fiches: { ph: e } }).map(x => x.k), ["fiche"]);
  assert.equal(aCaler({ moments: m3, roles, vendors: [v], fiches: { ph: e } }).at(-1).k, "fiche");
  assert.equal(visiblesPar(moments, "invites").length, 2); assert.equal(contactSurPlace([], []), null);
});

test("métier → moments, clé d'un trou, dernier mois", () => {
  const ms = momentsDe([{ id: "p", time: "10:00", title: "Préparatifs" }, { id: "c", time: "15:00", title: "Cérémonie laïque" }, { id: "v", time: "17:00", title: "Vin d'honneur" }, { id: "d", time: "20:00", title: "Dîner" }, { id: "s", time: "23:00", title: "Soirée dansante" }]);
  assert.deepEqual(momentsPourMetier("Traiteur", ms).map(m => m.id), ["v", "d"]);
  assert.deepEqual(momentsPourMetier("Musique", ms).map(m => m.id), ["c", "s"]);
  assert.equal(momentsPourMetier("Photographe", ms).length, 5); assert.deepEqual(momentsPourMetier("Lieu", ms), []);
  assert.equal(cleTrou({ k: "arrivee", momentId: "c", vendorId: "v1" }), "arrivee:c:v1");
  assert.equal(moisAvant({ date: "2028-05-20" }, new Date(2028, 3, 25)), true);
  assert.equal(moisAvant({ date: "2028-05-20" }, new Date(2028, 3, 10)), false);
  assert.equal(moisAvant({ date: "2028-05-20", dateIndicative: true }, new Date(2028, 4, 1)), false);
});
