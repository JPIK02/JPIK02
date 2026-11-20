// Diagnostic (lecture seule) du volume chargé par l'app au démarrage : par collection, nombre de documents et taille,
// et les champs les plus lourds. N'affiche aucun contenu.
import { getDb } from "./lib/firestore.js";

const COLS = ["tasks", "budget", "guests", "vendors", "schedule", "rdv", "inbox", "brief", "envies", "recompenses", "inspirations", "meta", "usage"];
const db = getDb();
const ko = n => `${(n / 1024).toFixed(0)} ko`;
let total = 0;
for (const c of COLS) {
  const snap = await db.collection(c).get();
  const fields = {}; let size = 0, max = 0;
  for (const d of snap.docs) {
    const data = d.data(); const s = JSON.stringify(data).length; size += s; max = Math.max(max, s);
    for (const [k, v] of Object.entries(data)) fields[k] = (fields[k] || 0) + JSON.stringify(v ?? null).length;
  }
  total += size;
  const top = Object.entries(fields).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${ko(n)}`).join(", ");
  console.log(`${c} : ${snap.size} docs, ${ko(size)} (plus gros ${ko(max)}) · champs lourds : ${top}`);
  if (c === "meta") for (const d of snap.docs) console.log(`  meta/${d.id} : ${ko(JSON.stringify(d.data()).length)}`);
}
console.log(`Total : ${ko(total)}`);
process.exit(0);
