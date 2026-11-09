import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRun, slotMatches, parisClock, vendorsToAnalyse, profilDue } from "../lib/scheduler.js";
import { cleanPayload, cleanSubject } from "../lib/validate.js";
import { extractText, stripHtml } from "../lib/mailtext.js";

// 2026-11-09 07:10 à Paris = 06:10 UTC (heure d'hiver), un lundi
const mondayParis7 = new Date("2026-11-09T06:10:00Z");

test("horloge de Paris", () => {
  assert.deepEqual(parisClock(mondayParis7), { hour: 7, dow: 1, isoDate: "2026-11-09" });
  assert.equal(parisClock(new Date("2026-07-01T05:30:00Z")).hour, 7); // heure d'été
});

test("créneaux du planning", () => {
  const c = parisClock(mondayParis7);
  assert.ok(slotMatches({ mode: "daily", h1: 7 }, c));
  assert.ok(!slotMatches({ mode: "daily", h1: 8 }, c));
  assert.ok(slotMatches({ mode: "twice", h1: 7, h2: 19 }, c));
  assert.ok(slotMatches({ mode: "weekly", h1: 7, day: 1 }, c));
  assert.ok(!slotMatches({ mode: "weekly", h1: 7, day: 2 }, c));
  assert.ok(slotMatches({ mode: "hourly" }, c));
  assert.ok(!slotMatches({ mode: "hourly", enabled: false }, c));
});

test("shouldRun : planning, demande, doublon", () => {
  const plan = { enabled: true, mode: "daily", h1: 7 };
  assert.equal(shouldRun(plan, {}, mondayParis7).run, true);
  assert.equal(shouldRun(plan, { lastRunAt: +mondayParis7 - 5 * 60e3 }, mondayParis7).run, false);
  assert.equal(shouldRun({ ...plan, h1: 9 }, {}, mondayParis7).run, false);
  assert.equal(shouldRun({ ...plan, h1: 9 }, { requestedAt: 10, lastRunAt: 5 }, mondayParis7).run, true);
  assert.equal(shouldRun({ ...plan, enabled: false }, { requestedAt: 10, lastRunAt: 5 }, mondayParis7).run, true);
  assert.equal(shouldRun({ ...plan, h1: 9 }, { requestedAt: 5, lastRunAt: 10 }, mondayParis7).run, false);
});

test("prestataires à analyser", () => {
  const now = Date.now();
  const vs = [
    { id: "a", status: "repere" },
    { id: "b", status: "ecarte" },
    { id: "c", status: "devis", fit: { updatedAt: now - 1000 } },
    { id: "d", status: "devis", fit: { updatedAt: now - 40 * 864e5 } },
  ];
  assert.deepEqual(vendorsToAnalyse(vs, 0, now).map(v => v.id), ["a", "d"]);
  assert.deepEqual(vendorsToAnalyse(vs, now, now).map(v => v.id), ["a", "c", "d"]);
});

test("nettoyage des propositions", () => {
  assert.deepEqual(cleanPayload("quote", { name: "Château", cat: "Château", prix: "4 850 €", dateAcompte: "15/03/2027", tel: "06" }),
    { name: "Château", cat: "Autre", prix: 4850, tel: "06" });
  assert.equal(cleanPayload("rdv", { title: "Visite" }), null); // date obligatoire
  assert.deepEqual(cleanPayload("rdv", { title: "Visite", date: "2027-01-10", time: "25:00" }), { title: "Visite", date: "2027-01-10" });
  assert.deepEqual(cleanPayload("task", { title: "Appeler", owner: "maman", phase: "m12" }), { title: "Appeler", owner: "deux", phase: "m12" });
  assert.equal(cleanPayload("inconnu", {}), null);
  assert.equal(cleanSubject("Tr : Re: Au Petit Manoir"), "Au Petit Manoir");
  assert.equal(cleanSubject("Fwd: RE: devis"), "devis");
});

test("lecture du corps des mails", () => {
  const enc = s => Buffer.from(s).toString("base64url");
  const payload = { mimeType: "multipart/alternative", parts: [
    { mimeType: "text/html", body: { data: enc("<p>Bonjour&nbsp;!</p>") } },
    { mimeType: "text/plain", body: { data: enc("Bonjour ! Tarif 4 850 €") } },
    { mimeType: "application/pdf", filename: "plaquette.pdf", body: {} },
  ] };
  assert.deepEqual(extractText(payload), { text: "Bonjour ! Tarif 4 850 €", attachments: ["plaquette.pdf"] });
  assert.equal(stripHtml("<div>A<br>B</div><style>x{}</style>"), "A\nB");
});

test("synthèse des envies : relancée après une modification, une fois la saisie terminée", () => {
  const now = 1_000_000_000;
  assert.equal(profilDue({}, {}, now), false);                                            // rien de demandé
  assert.equal(profilDue({ profilRequestedAt: now - 10 * 60e3 }, { updatedAt: 0 }, now), true);
  assert.equal(profilDue({ profilRequestedAt: now - 60e3 }, { updatedAt: 0 }, now), false);  // saisie en cours
  assert.equal(profilDue({ profilRequestedAt: now - 10 * 60e3 }, { updatedAt: now - 60e3 }, now), false); // déjà refaite
});
