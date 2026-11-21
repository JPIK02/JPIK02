// Range à nouveau les inspirations de l'ancienne catégorie « traiteur » (docs/nos-envies-v1-1.md, section 2) :
// la migration les a mises dans « repas » ; celles qui montrent un gâteau ou des desserts vont dans « gateau ».
// Les autres restent dans « repas » mais n'illustrent pas la tuile tant qu'elles ne sont pas rangées à nouveau.
//   node ranger-inspirations.js          : simulation (comptes seulement, rien n'est écrit)
//   node ranger-inspirations.js ecrire   : sauvegarde dans `sauvegardes/`, puis écriture
// N'affiche aucun contenu (ni description ni photo).
import { getDb, listAll } from "./lib/firestore.js";

import { rangement } from "./lib/envies/inspirations.js";

if (process.argv[1] && process.argv[1].endsWith("ranger-inspirations.js")) {
  const write = process.argv[2] === "ecrire", db = getDb();
  const insp = await listAll("inspirations");
  const todo = insp.map(i => [i, rangement(i)]).filter(([, c]) => c);
  const restent = insp.filter(i => (i.ancienneCat === "traiteur" || i.cat === "traiteur") && !rangement(i) && !i.rangeeLe).length;
  console.log(`${insp.length} inspirations · ${todo.length} à ranger dans « Gâteau et desserts » · ${restent} autre(s) venue(s) de « traiteur », laissée(s) hors des tuiles.`);
  if (write && todo.length) {
    const at = new Date().toISOString().replace(/[:.]/g, "-");
    await db.doc(`sauvegardes/inspirations-${at}`).set({ at: Date.now(), docs: todo.map(([i]) => ({ id: i.id, cat: i.cat, ancienneCat: i.ancienneCat || null })) });
    for (const [i, cat] of todo) await db.doc(`inspirations/${i.id}`).set({ cat, rangeeLe: Date.now() }, { merge: true });
    console.log(`Écrit : ${todo.length} inspiration(s) rangée(s), sauvegarde sauvegardes/inspirations-${at}.`);
  } else if (!write) console.log("Simulation : rien n'a été écrit.");
  process.exit(0);
}
