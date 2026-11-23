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

import { momentsDe, inviteA, vientA, etapeApresReponse, reponses, statutFoyer, dateLimite, aRelancer, regimesComptes, recapTraiteur, texteTraiteur, parMoment, messageRelance } from "../lib/invites.js";
test("moments : trois par défaut, drapeaux historiques invités sauf false, moments ajoutés seulement si cochés", () => {
  assert.deepEqual(momentsDe({}).map(m => m.k), ["ceremonie", "vin", "diner"]);
  assert.deepEqual(momentsDe({ moments: [{ k: "diner", nom: "Le dîner" }, { k: "m_brunch", nom: "Brunch" }, { k: "x", nom: "" }] }).map(m => m.nom), ["Le dîner", "Brunch"]);
  assert.ok(inviteA({}, "diner")); assert.ok(!inviteA({ diner: false }, "diner"));
  assert.ok(!inviteA({}, "m_brunch")); assert.ok(inviteA({ m_brunch: true }, "m_brunch"));
  assert.ok(vientA({ rsvp: "oui" }, "diner")); assert.ok(!vientA({ rsvp: "oui", absentA: { diner: true } }, "diner")); assert.ok(!vientA({ rsvp: "attente" }, "diner"));
});
test("étape après une réponse", () => {
  assert.equal(etapeApresReponse({ etape: "fairepart" }, [{ rsvp: "oui" }, { rsvp: "non" }]), "repondu");
  assert.equal(etapeApresReponse({ etape: "repondu" }, [{ rsvp: "oui" }, { rsvp: "attente" }]), "fairepart");
  assert.equal(etapeApresReponse({ etape: "liste" }, [{ rsvp: "oui" }, {}]), "fairepart");
  assert.equal(etapeApresReponse({ etape: "std" }, [{}, {}]), "std");
});
test("bilan des réponses et statut d'un foyer", () => {
  const fs = [{ etape: "fairepart", personnes: [{ rsvp: "oui" }, { rsvp: "attente" }] }, { etape: "liste", personnes: [{ rsvp: "attente" }] }, { etape: "repondu", personnes: [{ rsvp: "non" }] }];
  assert.deepEqual(reponses(fs), { oui: 1, non: 1, sans: 1, pasEnvoye: 1, total: 4 });
  assert.deepEqual(fs.map(statutFoyer), ["partiel", "pasenvoye", "non"]);
});
test("date limite : réglage, sinon 2 mois avant", () => {
  assert.deepEqual(dateLimite({ date: "2028-06-17" }), { date: "2028-04-17", proposee: true });
  assert.deepEqual(dateLimite({ date: "2028-06-17", dateLimiteReponse: "2028-05-01" }), { date: "2028-05-01", proposee: false });
  assert.equal(dateLimite({}), null);
});
test("à relancer : 15 jours avant la limite, pas deux fois en 7 jours", () => {
  const fs = [{ id: "a", etape: "fairepart", personnes: [{}] }, { id: "b", etape: "fairepart", personnes: [{}], relanceLe: +new Date("2028-04-13") }, { id: "c", etape: "liste", personnes: [{}] }, { id: "d", etape: "repondu", personnes: [{ rsvp: "oui" }] }];
  assert.deepEqual(aRelancer(fs, { limite: "2028-05-01", today: new Date("2028-04-01") }).map(f => f.id), []);
  assert.deepEqual(aRelancer(fs, { limite: "2028-05-01", today: new Date("2028-04-17") }).map(f => f.id), ["a"]);
  assert.deepEqual(aRelancer(fs, { limite: "2028-05-01", today: new Date("2028-04-20") }).map(f => f.id), ["a", "b"]);
});
test("récapitulatif traiteur : sans nom par défaut, régimes réunis", () => {
  const g = [{ name: "A", rsvp: "oui", regime: "Végétarien" }, { name: "B", rsvp: "oui", regime: "végétarienne, sans gluten" }, { name: "C", rsvp: "oui", enfant: true }, { name: "D", rsvp: "oui", diner: false, regime: "Vegan" }, { name: "E", rsvp: "non", regime: "Halal" }];
  const r = recapTraiteur(g);
  assert.equal(r.places, 3); assert.equal(r.enfants, 1);
  assert.deepEqual(r.regimes.map(x => [x.label, x.n]), [["Végétarien", 2], ["Sans gluten", 1]]);
  const t = texteTraiteur(r, { couple: "P et Q" });
  assert.ok(t.includes("Végétarien : 2")); assert.ok(!t.includes("A,")); assert.ok(texteTraiteur(r, { noms: true }).includes("(A, B)"));
  assert.deepEqual(regimesComptes([{ name: "x", regime: "Allergie aux fruits à coque" }]).map(x => x.n), [1]);
});
test("par moment et message de relance", () => {
  assert.deepEqual(parMoment([{ rsvp: "oui" }, { rsvp: "oui", vin: false }, { rsvp: "non" }]).map(m => [m.k, m.invites, m.presents]), [["ceremonie", 3, 2], ["vin", 2, 1], ["diner", 3, 2]]);
  assert.equal(messageRelance("Coucou {foyer}, réponse ?", "Famille X"), "Coucou Famille X, réponse ?");
  assert.ok(messageRelance("", "Léa", { couple: "P et Q", limite: "1er mai" }).startsWith("Bonjour Léa !"));
});

import { nettoyerFoyersProposes, lireCsv, texteTableur } from "../lib/invites.js";
import { lireXlsx } from "../lib/xlsx.js";
import { deflateRawSync, crc32 } from "node:zlib";
test("foyers proposés vérifiés : rien d'inventé, +1, déjà sur la liste", () => {
  const texte = "Famille Martin : Paul, Léa et Tom (5 ans)\nAlejandra Ruiz +1\nMarc Petit";
  const r = nettoyerFoyersProposes([
    { nom: "Famille Martin", cote: "julien", cercle: "Famille", personnes: [{ nom: "Paul Martin" }, { nom: "Léa Martin" }, { nom: "Tom Martin", enfant: true }, { nom: "Inventé Dupont" }] },
    { personnes: [{ nom: "Alejandra Ruiz" }, { plusUn: true }] }, { personnes: [{ nom: "Marc Petit" }] }, { personnes: [{ plusUn: true }] }, { cote: "x", personnes: [{ nom: "paul martin" }] },
  ], { texte, existants: [{ name: "Marc Petit" }], side: "claire" });
  assert.equal(r.length, 3);
  assert.deepEqual(r[0].personnes.map(p => p.name), ["Paul Martin", "Léa Martin", "Tom Martin"]); assert.ok(r[0].personnes[2].enfant); assert.equal(r[0].side, "julien");
  assert.deepEqual(r[1].personnes.map(p => [p.name, p.plusUn]), [["Alejandra Ruiz", false], ["+1", true]]); assert.equal(r[1].side, "claire");
  assert.ok(r[2].personnes[0].dejaLa);
});
test("CSV : séparateur deviné, guillemets", () => {
  assert.deepEqual(lireCsv('Nom;Cercle\n"Martin; Paul";Famille\r\nLéa;"Amis ""proches"""\n'), [["Nom", "Cercle"], ["Martin; Paul", "Famille"], ["Léa", 'Amis "proches"']]);
  assert.deepEqual(lireCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.equal(texteTableur([["Paul", "", "Famille"], ["", ""]]), "Paul · Famille");
});
// petit écrivain de zip pour fabriquer un classeur de test (entrées compressées comme Excel)
function zip(entrees) {
  const loc = [], cen = []; let off = 0;
  for (const [nom, txt] of Object.entries(entrees)) {
    const n = Buffer.from(nom), d = Buffer.from(txt), c = deflateRawSync(d), crc = crc32(d);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14); h.writeUInt32LE(c.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(n.length, 26);
    const ce = Buffer.alloc(46); ce.writeUInt32LE(0x02014b50, 0); ce.writeUInt16LE(20, 4); ce.writeUInt16LE(20, 6); ce.writeUInt16LE(8, 10); ce.writeUInt32LE(crc, 16); ce.writeUInt32LE(c.length, 20); ce.writeUInt32LE(d.length, 24); ce.writeUInt16LE(n.length, 28); ce.writeUInt32LE(off, 42);
    loc.push(h, n, c); cen.push(ce, n); off += 30 + n.length + c.length;
  }
  const cd = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(cen.length / 2, 8); e.writeUInt16LE(cen.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cd, e]);
}
test("Excel : première feuille, textes partagés et en ligne", async () => {
  const buf = zip({ "[Content_Types].xml": "<Types/>", "xl/sharedStrings.xml": '<sst><si><t>Nom</t></si><si><t>Cercle</t></si><si><t>Paul &amp; Léa Martin</t></si><si><r><t>Fa</t></r><r><t>mille</t></r></si></sst>',
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>3</v></c><c r="B2" t="s"><v>3</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Zoé</t></is></c></row></sheetData></worksheet>' });
  assert.deepEqual(await lireXlsx(buf), [["Nom", "Cercle"], ["Paul & Léa Martin", "Famille", "3"], ["Zoé"]]);
  await assert.rejects(() => lireXlsx(Buffer.from("pas un zip")));
});
