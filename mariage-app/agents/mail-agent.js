// Agent e-mails : lit la boîte dédiée et dépose des propositions dans inbox (status "new").
// Ne touche jamais aux prestataires, tâches, invités ou budget : Claire et Julien valident dans l'app.
import { readFileSync } from "node:fs";
import { getMeta, listAll, batchWrite, mergeMeta } from "./lib/firestore.js";
import { gmailClient, recentThreads, threadUrl } from "./lib/gmail.js";
import { runForOutput } from "./lib/claude.js";
import { TYPES, cleanPayload, cleanSubject } from "./lib/validate.js";
import { parisClock } from "./lib/scheduler.js";
import { notify } from "./lib/push.js";

const COUPLE = (process.env.COUPLE_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const SYSTEM = readFileSync(new URL("./prompts/mail.md", import.meta.url), "utf8")
  .replace("{{COUPLE_EMAILS}}", COUPLE.join(", ") || "leurs adresses personnelles");

const OUTPUT = {
  name: "propositions",
  description: "Rend les propositions à déposer dans l'app (liste vide si rien de pertinent).",
  input_schema: {
    type: "object",
    properties: {
      propositions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            messageId: { type: "string", description: "id du message Gmail source" },
            suffix: { type: "string", description: "suffixe si plusieurs propositions pour un même message" },
            type: { type: "string", enum: TYPES },
            from: { type: "string", description: "nom lisible de l'expéditeur réel" },
            subject: { type: "string" },
            receivedAt: { type: "string", description: "date réelle AAAA-MM-JJ" },
            summary: { type: "string" },
            payload: { type: "object" },
          },
          required: ["messageId", "type", "from", "subject", "receivedAt", "summary", "payload"],
        },
      },
      ignores: { type: "array", items: { type: "string" }, description: "ids de messages ignorés (hors sujet)" },
    },
    required: ["propositions"],
  },
};

export async function runMailAgent({ log = console.log } = {}) {
  const agent = await getMeta("agent");
  const mailbox = agent.mailbox || process.env.GMAIL_ADDRESS;
  const types = agent.types || Object.fromEntries(TYPES.map(t => [t, true]));
  const enabled = TYPES.filter(t => types[t] !== false);

  const [inbox, vendors, guests, rdv] = await Promise.all(["inbox", "vendors", "guests", "rdv"].map(listAll));
  const done = new Set(inbox.flatMap(d => [d.id, d.messageId]).filter(Boolean));

  const gmail = gmailClient();
  const threads = await recentThreads(gmail, {
    query: "newer_than:8d -from:no-reply@accounts.google.com -from:no-reply@google.com -in:sent",
  });

  const known = {
    prestataires: vendors.map(v => ({ name: v.name, cat: v.cat, prix: v.prix ?? null, status: v.status })),
    invites: guests.map(g => ({ name: g.name, rsvp: g.rsvp })),
    rendezVous: rdv.map(r => ({ title: r.title, date: r.date })),
  };

  const writes = [];
  let read = 0, ignored = 0;
  const stats = {};

  for (const th of threads) {
    const fresh = th.messages.filter(m => !done.has(m.id) && !m.labelIds.includes("SENT"));
    if (!fresh.length) continue;
    read += fresh.length;

    const user = [
      `Types activés : ${enabled.join(", ")}`,
      `Consignes de Claire et Julien : ${agent.consignes || "(aucune)"}`,
      `Aujourd'hui : ${parisClock().isoDate}`,
      `Déjà dans l'app : ${JSON.stringify(known)}`,
      `Messages à traiter (ids) : ${fresh.map(m => m.id).join(", ")}`,
      `Messages déjà traités dans ce fil (contexte seulement) : ${th.messages.filter(m => done.has(m.id)).map(m => m.id).join(", ") || "aucun"}`,
      "",
      "<fil_gmail>",
      ...th.messages.map(m => [
        `--- message id=${m.id}`,
        `De : ${m.from}`, `À : ${m.to}`, `Date : ${m.date}`, `Objet : ${m.subject}`,
        m.attachments.length ? `Pièces jointes : ${m.attachments.join(", ")}` : "",
        "", m.text,
      ].filter(Boolean).join("\n")),
      "</fil_gmail>",
    ].join("\n");

    const res = await runForOutput({ system: SYSTEM, user, output: OUTPUT, effort: "medium" });
    const freshIds = new Set(fresh.map(m => m.id));
    const used = new Set();

    for (const p of res.propositions || []) {
      if (!freshIds.has(p.messageId) || !enabled.includes(p.type)) continue;
      const payload = cleanPayload(p.type, p.payload);
      if (!payload) continue;
      let id = p.messageId;
      if (used.has(id)) id = `${p.messageId}-${String(p.suffix || p.type).replace(/[^\w-]/g, "").slice(0, 20) || p.type}`;
      while (used.has(id)) id += "x";
      used.add(id);
      writes.push({
        collection: "inbox", id,
        data: {
          type: p.type, status: "new",
          from: String(p.from || "").slice(0, 200),
          subject: cleanSubject(p.subject).slice(0, 300),
          receivedAt: /^\d{4}-\d{2}-\d{2}$/.test(p.receivedAt) ? p.receivedAt : fresh[0].date.slice(0, 10),
          summary: String(p.summary || "").slice(0, 1500),
          payload,
          threadUrl: threadUrl(mailbox, th.id),
          messageId: p.messageId,
          createdAt: Date.now(),
        },
      });
      stats[p.type] = (stats[p.type] || 0) + 1;
    }
    // Les messages sans proposition sont marqués comme vus pour ne pas les relire à chaque passage.
    for (const m of fresh) {
      if (![...used].some(u => u === m.id || u.startsWith(m.id + "-"))) {
        writes.push({ collection: "inbox", id: m.id, data: {
          type: "ignored", status: "ignored", messageId: m.id, subject: cleanSubject(m.subject).slice(0, 300),
          from: m.from.replace(/<[^>]*>/, "").trim().slice(0, 200), receivedAt: m.date.slice(0, 10),
          threadUrl: threadUrl(mailbox, th.id), createdAt: Date.now() } });
        ignored++;
      }
    }
  }

  if (writes.length) await batchWrite(writes);
  const nb = Object.values(stats).reduce((a, b) => a + b, 0);
  if (nb) await notify({ title: `${nb} nouvelle${nb > 1 ? "s" : ""} proposition${nb > 1 ? "s" : ""} à valider`,
    body: "L'assistant e-mails a repéré des devis, rendez-vous ou tâches dans vos mails.", url: "/#assistant", tag: "mail" }, { log });
  await mergeMeta("agent", { lastRun: parisClock().isoDate, lastRunAt: Date.now(), status: "actif" });
  const summary = { mailsLus: read, propositions: stats, ignores: ignored };
  log(JSON.stringify(summary));
  return summary;
}
