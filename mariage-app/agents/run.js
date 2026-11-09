// Lancement à la main (GitHub Actions « Run workflow » ou poste local) :
//   node run.js            → chaque agent tourne s'il est dû (planning ou demande depuis l'app)
//   node run.js mail       → force l'agent e-mails ; analyse, hebdo : idem
// Le passage automatique toutes les 10 minutes est fait par Google Cloud (functions/index.js → agents/main.js).
import { runAll } from "./main.js";
const failed = await runAll({ forced: process.argv[2] });
process.exit(failed ? 1 : 0);
