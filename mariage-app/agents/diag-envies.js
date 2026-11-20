// Diagnostic (lecture seule) des réponses « Nos envies » actuelles, pour le tableau de correspondance
// (docs/nos-envies-correspondance.md). N'affiche jamais le contenu des réponses : seulement des comptes,
// et pour les choix, combien de fois chaque option du catalogue a été cochée.
import { listAll } from "./lib/firestore.js";
import { QCATS } from "../src/questions.js";

const filled = v => (Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim()));
const docs = await listAll("brief");
const byId = Object.fromEntries(docs.map(d => [d.id, d]));
const known = new Set();
let total = 0;
for (const c of QCATS) {
  const meta = byId[`${c.k}--_meta`];
  known.add(`${c.k}--_meta`);
  const m = meta ? Object.entries(meta).filter(([k, v]) => !["id", "updatedAt", "by"].includes(k) && filled(v)).map(([k]) => k) : [];
  console.log(`\n## ${c.k} (${c.label}) · méta : ${m.join(", ") || "rien"}`);
  for (const [id, type, label, opts] of c.qs) {
    const key = `${c.k}--${id}`; known.add(key);
    const a = byId[key] || {};
    const parts = ["commun", "claire", "julien"].filter(f => filled(a[f]));
    const choix = Array.isArray(a.choix) ? a.choix : [];
    const ok = parts.length || choix.length;
    if (ok) total++;
    const hors = choix.filter(x => !(opts || []).includes(x)).length;
    console.log(`- ${id} [${type}] ${ok ? "RÉPONDUE" : "vide"}${parts.length ? ` · texte : ${parts.join("+")}` : ""}${choix.length ? ` · choix : ${choix.filter(x => (opts || []).includes(x)).map(x => `«${x}»`).join(", ")}${hors ? ` + ${hors} hors catalogue` : ""}` : ""} · ${label.slice(0, 70)}`);
  }
}
const autres = docs.filter(d => !known.has(d.id)).map(d => d.id);
console.log(`\nTotal : ${total} questions répondues sur ${QCATS.reduce((s, c) => s + c.qs.length, 0)}.`);
console.log(`Documents hors catalogue : ${autres.length ? autres.join(", ") : "aucun"}.`);
const insp = await listAll("inspirations");
const parCat = {};
for (const i of insp) parCat[i.cat || "?"] = (parCat[i.cat || "?"] || 0) + 1;
console.log(`Inspirations par catégorie : ${Object.entries(parCat).map(([k, n]) => `${k} ${n}`).join(", ") || "aucune"}.`);
// Nouveau questionnaire : réglages des tuiles (drapeaux seulement) et réponses de la tuile Wedding planner (choix, sans texte)
const envies = await listAll("envies");
for (const d of envies.filter(x => x.id.startsWith("_tuile."))) console.log(`${d.id} : actif=${d.actif} pasPourNous=${d.pasPourNous} maj=${d.updatedAt ? new Date(d.updatedAt).toISOString() : "-"} par=${d.by ? "oui" : "-"}`);
const orig = { app: 0, coach: 0, migration: 0, autre: 0 }, last = {};
for (const d of envies) { const o = d.by === "migration" ? "migration" : String(d.by || "").includes("@") ? "app" : d.by ? "coach" : "autre"; orig[o]++; last[o] = Math.max(last[o] || 0, +d.updatedAt || 0); }
console.log(`Origine des ${envies.length} documents envies : ${Object.entries(orig).map(([k, n]) => `${k} ${n}${last[k] ? ` (dernier ${new Date(last[k]).toISOString()})` : ""}`).join(", ")}`);
const rec = await listAll("recompenses");
console.log(`Récompenses : ${rec.map(r => `${r.id} ${r.status}`).join(", ") || "aucune"}`);
for (const d of envies.filter(x => x.id.startsWith("planner."))) console.log(`${d.id} : v=${JSON.stringify(d.v)} texte=${d.libre ? "oui" : "non"} par=${d.by ? "oui" : "-"}`);
process.exit(0);
