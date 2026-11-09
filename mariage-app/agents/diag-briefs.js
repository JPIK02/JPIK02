// Diagnostic : affiche le début de chaque brief rédigé (meta/briefs), pour vérifier qu'ils diffèrent.
import { getMeta } from "./lib/firestore.js";
const b = await getMeta("briefs");
for (const [k, v] of Object.entries(b.categories || {})) console.log(`${k} | ${(v.intention || "").slice(0, 140)} | essentiels: ${(v.essentiels || []).slice(0, 2).join(" ; ").slice(0, 120)}`);
process.exit(0);
