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

import { heureDuJour, estLeJour, ecranDuJour, aDecaler, aAppeler, duree, expirationJourJ, lienJourJActif, vueTemoins, vueInvites } from "../lib/jourj.js";

test("heure du jour J (Paris), nuit après minuit", () => {
  assert.deepEqual(heureDuJour(new Date("2028-05-20T14:30:00Z")), { date: "2028-05-20", mn: 16 * 60 + 30 });
  assert.deepEqual(heureDuJour(new Date("2028-05-20T23:30:00Z")), { date: "2028-05-20", mn: 25 * 60 + 30 });
  const ms = momentsDe([{ id: "a", time: "15:00", title: "Cérémonie" }, { id: "b", time: "20:00", title: "Dîner", fin: "02:00" }]);
  assert.equal(estLeJour({ date: "2028-05-20" }, ms, new Date("2028-05-20T03:00:00Z")), false); // 5 h à Paris
  assert.equal(estLeJour({ date: "2028-05-20" }, ms, new Date("2028-05-20T05:00:00Z")), true);
  assert.equal(estLeJour({ date: "2028-05-20" }, ms, new Date("2028-05-20T23:30:00Z")), true);   // 1 h 30, encore la soirée
  assert.equal(estLeJour({ date: "2028-05-20" }, ms, new Date("2028-05-21T00:30:00Z")), false);  // 2 h 30 : fini
  assert.equal(estLeJour({ date: "2028-05-20", dateIndicative: true }, ms, new Date("2028-05-20T12:00:00Z")), false);
});

test("écran du jour, retard, numéros", () => {
  const ms = momentsDe([{ id: "a", time: "15:00", title: "Cérémonie", fin: "16:00" }, { id: "b", time: "16:30", title: "Vin", prestas: [{ vendorId: "t" }] }, { id: "c", time: "20:00", title: "Dîner", fin: "23:00" }]);
  let e = ecranDuJour(ms, 15 * 60 + 30); assert.equal(e.courant.id, "a"); assert.equal(e.suivant.id, "b"); assert.equal(e.progression, 0.5); assert.equal(e.dans, 60);
  e = ecranDuJour(ms, 16 * 60 + 10); assert.equal(e.courant, null); assert.equal(e.suivant.id, "b");
  const d = aDecaler(ms, 15 * 60 + 30); assert.deepEqual(d.map(x => x.id), ["b", "c"]);
  assert.deepEqual(d[1], { id: "c", avant: { time: "20:00", fin: "23:00" }, apres: { time: "20:15", fin: "23:15" } });
  assert.equal(duree(25), "25 min"); assert.equal(duree(70), "1 h 10"); assert.equal(duree(120), "2 h");
  const appel = aAppeler({ roles: [{ id: "mc", nom: "Maître de cérémonie", personne: "Tom", tel: "06 1" }, { id: "x", nom: "Alliances", personne: "Zoé", tel: "06 3" }],
    vendors: [{ id: "t", name: "Traiteur", cat: "Traiteur", tel: "06 2" }], courant: ms[0], suivant: ms[1] });
  assert.deepEqual(appel.map(a => a.nom), ["Tom", "Traiteur", "Zoé"]);
});

test("liens : expiration, vues sans montant ni moments cachés", () => {
  assert.equal(new Date(expirationJourJ("2028-05-20")).toISOString().slice(0, 10), "2028-05-22");
  assert.equal(lienJourJActif({ type: "temoin", expire: Date.now() + 1000 }), true); assert.equal(lienJourJActif({ foyerId: "f", expire: Date.now() + 1000 }), false);
  const schedule = [{ id: "a", time: "15:00", title: "Cérémonie", prestas: [{ vendorId: "v", arrivee: "14:00" }] }, { id: "b", time: "17:00", title: "Photos de couple", voit: { invites: false } }];
  const vendors = [{ id: "v", name: "Studio", cat: "Photographe", status: "reserve", prix: 3200, tel: "06", note: "négocié" }];
  const t = vueTemoins({ schedule, vendors, guests: [{ id: "g", name: "Tom Durand" }], jourj: { roles: [{ id: "mc", nom: "MC", guestId: "g", tel: "07" }] }, settings: { date: "2028-05-20" }, roleId: "mc", noms: { p1: "A", p2: "B" } });
  assert.equal(t.moi.prenom, "Tom"); assert.equal(t.moments.length, 2); assert.equal(t.prestataires[0].tel, "06");
  const s = JSON.stringify(t); assert.ok(!s.includes("3200") && !s.includes("négocié"));
  const i = vueInvites({ schedule, settings: { date: "2028-05-20" } }); assert.deepEqual(i.moments.map(m => m.nom), ["Cérémonie"]);
  assert.ok(!JSON.stringify(i).includes("Studio"));
});

import { TRAMES, enviesDuJour, phraseEnvies, nettoyerTrame } from "../lib/jourj.js";

test("trames : lendemain après la nuit, hors de la barre", () => {
  const d = momentsDe(TRAMES.find(t => t.k === "deux").moments.map((m, i) => ({ id: String(i), ...m })));
  assert.equal(d.at(-1).nom, "Brunch du lendemain"); assert.equal(d.at(-1).lendemain, true); assert.equal(d.at(-1).debut, 35 * 60);
  const b = barre(d); assert.equal(b.fin, 27 * 60);
  for (const t of TRAMES) assert.ok(t.moments.length >= 6 && t.moments.every(m => minDe(m.time) != null));
});

test("envies → trame recommandée et phrase", () => {
  const A = { "ceremonie.types": { v: ["civile-en-mairie", "laique"] }, "lieu.dedans": { v: ["dehors"] }, "musique.qui": { v: ["dj"] } };
  let e = enviesDuJour(A); assert.equal(e.reco, "mairie"); assert.equal(phraseEnvies(e), "cérémonies civile et laïque, en extérieur, soirée avec DJ");
  e = enviesDuJour({ ...A, "lendemain.format": { v: ["brunch"] } }); assert.equal(e.reco, "deux");
  e = enviesDuJour({ "lendemain.format": { v: ["rien"] }, "mariage.duree": { v: ["une-journee"] } }); assert.equal(e.reco, "meme"); assert.equal(phraseEnvies(e), "");
});

test("trame du coach nettoyée", () => {
  const l = nettoyerTrame([{ title: "Dîner", time: "20:00", fin: "23:00", cle: true, prix: 9 }, { title: "", time: "10:00" }, { title: "Faux", time: "25:00" },
    { title: "Brunch", time: "11:00", jour: 2 }, { title: "Cérémonie", time: "15:00", note: "x".repeat(300) }, { title: "Dîner", time: "20:00" }]);
  assert.deepEqual(l.map(m => m.title), ["Cérémonie", "Dîner", "Brunch"]); assert.equal(l[0].note.length, 200); assert.equal(l[1].prix, undefined); assert.equal(l[2].jour, 2);
});
