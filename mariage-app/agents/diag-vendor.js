// Diagnostic (lecture seule) : lignes de notes d'un prestataire contenant « capacit » ou des chiffres de personnes.
import { listAll } from "./lib/firestore.js";
const q = (process.argv[2] || "").toLowerCase();
for (const v of await listAll("vendors")) {
  if (!String(v.name || "").toLowerCase().includes(q)) continue;
  console.log("==", v.name, "| cat", v.cat, "| statut", v.status);
  for (const f of ["note", "visitNotes"]) for (const l of String(v[f] || "").split(/\n/)) if (/capacit|personne|invit|couvert|place/i.test(l)) console.log(f, ":", l.slice(0, 200));
}
process.exit(0);
