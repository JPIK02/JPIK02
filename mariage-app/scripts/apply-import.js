// Applique un fichier d'import (mariage-app/import/*.json) à Firestore, UNE SEULE FOIS.
// Usage : FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node scripts/apply-import.js import/excel-2026-11.json [--dry]
// Une trace est écrite dans meta/imports : si l'import a déjà eu lieu, le script ne fait rien
// (les modifications faites depuis dans l'app ne sont jamais écrasées).
// Opérations : set (crée/remplace), merge (complète un document existant),
// deleteIfEmpty (supprime seulement si les champs listés sont tous vides : ligne de modèle jamais remplie),
// regexField (retire un motif d'un champ texte dans toute une collection).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../agents/package.json", import.meta.url));
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) { console.error("Fichier d'import manquant"); process.exit(1); }
const { name, ops } = JSON.parse(readFileSync(file, "utf8"));

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const marker = db.doc("meta/imports");
const done = (await marker.get()).data() || {};
if (done[name]) {
  console.log(`Import « ${name} » déjà appliqué le ${new Date(done[name]).toLocaleString("fr-FR")} : rien à faire.`);
  process.exit(0);
}

const stats = {};
const count = k => (stats[k] = (stats[k] || 0) + 1);
const batch = db.batch();
for (const o of ops) {
  const ref = o.path ? db.doc(o.path) : null;
  const col = o.path ? o.path.split("/")[0] : o.collection;
  if (o.op === "set") { batch.set(ref, o.data); count(`${col} ajoutés`); }
  else if (o.op === "merge") { batch.set(ref, o.data, { merge: true }); count(`${col} mis à jour`); }
  else if (o.op === "deleteIfEmpty") {
    const snap = await ref.get();
    if (!snap.exists) continue;
    const d = snap.data();
    if (o.fields.every(f => d[f] === null || d[f] === undefined || d[f] === "")) { batch.delete(ref); count(`${col} supprimés (lignes vides)`); }
    else count(`${col} conservés (déjà remplis)`);
  } else if (o.op === "regexField") {
    // Nettoie un champ texte de tous les documents d'une collection (seulement ceux qui correspondent)
    const re = new RegExp(o.pattern, "gi");
    for (const d of (await db.collection(o.collection).get()).docs) {
      const v = d.data()[o.field];
      if (typeof v !== "string" || !new RegExp(o.pattern, "i").test(v)) continue;
      const cleaned = v.replace(re, o.replace ?? "").replace(/^\s*·\s*|\s*·\s*$/g, "").replace(/\s{2,}/g, " ").trim();
      batch.set(d.ref, { [o.field]: cleaned }, { merge: true }); count(`${o.collection} nettoyés`);
    }
  } else throw new Error(`Opération inconnue : ${o.op}`);
}
if (!dry) {
  batch.set(marker, { [name]: Date.now() }, { merge: true });
  await batch.commit();
}
console.log(`${dry ? "[essai] " : ""}Import « ${name} » :`, stats);
