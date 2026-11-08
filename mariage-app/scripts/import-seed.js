// Importe dans Firestore les données exportées de l'ancienne app (dossier seed/).
// Usage : FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node scripts/import-seed.js [--dry] [--force] [--if-empty]
// N'écrase pas un document déjà présent (sauf --force).
// --if-empty : ne fait rien si la base contient déjà des tâches (utilisé à chaque mise en ligne :
// l'import n'a lieu qu'une fois, et une tâche supprimée dans l'app ne revient jamais).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(new URL("../agents/package.json", import.meta.url));
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const dry = process.argv.includes("--dry"), force = process.argv.includes("--force"), ifEmpty = process.argv.includes("--if-empty");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "seed");
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

if (ifEmpty && !(await db.collection("tasks").limit(1).get()).empty) {
  console.log("Base déjà remplie : import ignoré.");
  process.exit(0);
}

let n = 0, skipped = 0;
for (const col of readdirSync(root).filter(d => statSync(join(root, d)).isDirectory())) {
  for (const f of readdirSync(join(root, col)).filter(f => f.endsWith(".json"))) {
    const id = f.slice(0, -5), data = JSON.parse(readFileSync(join(root, col, f), "utf8"));
    const ref = db.collection(col).doc(id);
    if (!force && (await ref.get()).exists) { skipped++; continue; }
    if (!dry) await ref.set(data);
    n++;
  }
}
console.log(`${dry ? "[essai] " : ""}${n} documents importés, ${skipped} déjà présents.`);
