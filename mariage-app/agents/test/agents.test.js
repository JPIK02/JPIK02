import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRun, slotMatches, parisClock, vendorsToAnalyse, profilDue, vendorsRequested, isoWeek, hebdoDue, visitsToFollow } from "../lib/scheduler.js";
import { cleanPayload, cleanSubject } from "../lib/validate.js";
import { extractText, stripHtml, readableFiles } from "../lib/mailtext.js";
import { mapPool } from "../lib/pool.js";

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
  assert.deepEqual(extractText(payload), { text: "Bonjour ! Tarif 4 850 €", attachments: ["plaquette.pdf"], files: [] });
  assert.equal(stripHtml("<div>A<br>B</div><style>x{}</style>"), "A\nB");
});

test("synthèse des envies : relancée après une modification, une fois la saisie terminée", () => {
  const now = 1_000_000_000;
  assert.equal(profilDue({}, {}, now), false);                                            // rien de demandé
  assert.equal(profilDue({ profilRequestedAt: now - 10 * 60e3 }, { updatedAt: 0 }, now), true);
  assert.equal(profilDue({ profilRequestedAt: now - 60e3 }, { updatedAt: 0 }, now), false);  // saisie en cours
  assert.equal(profilDue({ profilRequestedAt: now - 10 * 60e3 }, { updatedAt: now - 60e3 }, now), false); // déjà refaite
});

test("notes de visite : seuls les prestataires modifiés sont réanalysés", () => {
  const now = Date.now();
  const vs = [
    { id: "a", status: "devis", fit: { updatedAt: now - 1000 }, fitRequestedAt: now },        // notes après la fiche
    { id: "b", status: "devis", fit: { updatedAt: now - 1000 }, fitRequestedAt: now - 5000 }, // déjà prises en compte
    { id: "c", status: "ecarte", fit: { updatedAt: now - 1000 }, fitRequestedAt: now },       // écarté : ignoré
  ];
  assert.deepEqual(vendorsRequested(vs).map(v => v.id), ["a"]);
  assert.deepEqual(vendorsToAnalyse(vs, 0, now).map(v => v.id), ["a"]);
});

test("point de la semaine : lundi 8 h, une fois par semaine, ou sur demande", () => {
  assert.equal(isoWeek(new Date("2026-11-09T10:00:00Z")), "2026-W46");
  assert.equal(isoWeek(new Date("2027-01-01T10:00:00Z")), "2026-W53");
  assert.equal(hebdoDue({}, mondayParis7), false);                                   // lundi 7 h : trop tôt
  const monday9 = new Date("2026-11-09T08:10:00Z");
  assert.equal(hebdoDue({}, monday9), true);
  assert.equal(hebdoDue({ week: "2026-W46", at: 1 }, monday9), false);              // déjà fait
  assert.equal(hebdoDue({ week: "2026-W46", at: 1, requestedAt: 2 }, monday9), true); // redemandé
});

test("relance après visite : le soir même, une fois, si un prestataire est reconnu", () => {
  const vendors = [{ id: "v", name: "Au Petit Manoir" }];
  const rdv = [{ id: "a", date: "2026-11-22", title: "Visite Au Petit Manoir" }, { id: "b", date: "2026-11-22", title: "Coiffeur" }, { id: "c", date: "2026-11-22", avec: "Au Petit Manoir", followupAt: 1 }];
  assert.deepEqual(visitsToFollow(rdv, vendors, { hour: 19, isoDate: "2026-11-22" }).map(x => x.r.id), ["a"]);
  assert.deepEqual(visitsToFollow(rdv, vendors, { hour: 12, isoDate: "2026-11-22" }), []);
});

test("pièces jointes des mails : PDF et photos lisibles, 3 au plus, taille limitée", () => {
  const payload = { mimeType: "multipart/mixed", parts: [
    { mimeType: "text/plain", body: { data: Buffer.from("Voir devis").toString("base64url") } },
    { mimeType: "application/pdf", filename: "devis.pdf", body: { attachmentId: "A1", size: 120000 } },
    { mimeType: "application/octet-stream", filename: "tarifs.PDF", body: { attachmentId: "A2", size: 1000 } },
    { mimeType: "image/jpeg", filename: "salle.jpg", body: { attachmentId: "A3", size: 9_000_000 } },
    { mimeType: "application/zip", filename: "photos.zip", body: { attachmentId: "A4", size: 1000 } },
  ] };
  const { files } = extractText(payload);
  assert.equal(files.length, 4);
  const ok = readableFiles(files);
  assert.deepEqual(ok.map(f => [f.filename, f.kind, f.mimeType]), [["devis.pdf", "document", "application/pdf"], ["tarifs.PDF", "document", "application/pdf"]]);
});

test("analyse en parallèle : tout est traité, n à la fois au plus", async () => {
  let cur = 0, peak = 0; const done = [];
  await mapPool([1, 2, 3, 4, 5, 6], 4, async x => { cur++; peak = Math.max(peak, cur); await new Promise(r => setTimeout(r, 10)); done.push(x); cur--; });
  assert.equal(done.length, 6); assert.equal(peak, 4);
});
