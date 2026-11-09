// Point d'entrée appelé toutes les 10 minutes par GitHub Actions.
//   node agents/run.js            → chaque agent tourne s'il est dû (planning ou demande depuis l'app)
//   node agents/run.js mail       → force l'agent e-mails
//   node agents/run.js analyse    → force l'agent d'analyse
import { getMeta } from "./lib/firestore.js";
import { DEFAULT_PLANS, shouldRun } from "./lib/scheduler.js";
import { runMailAgent } from "./mail-agent.js";
import { runAnalyseAgent } from "./analyse-agent.js";

const forced = process.argv[2];
const JOBS = { mail: { meta: "agent", run: runMailAgent }, analyse: { meta: "analyse", run: runAnalyseAgent } };

const planning = await getMeta("planning");
let failed = false;
for (const [k, job] of Object.entries(JOBS)) {
  if (forced && forced !== k) continue;
  const plan = { ...DEFAULT_PLANS[k], ...(planning[k] || {}) };
  const meta = await getMeta(job.meta);
  const d = shouldRun(plan, meta, new Date(), { force: forced === k });
  console.log(`[${k}] ${d.run ? "→ lancement" : "→ ignoré"} (${d.reason})`);
  if (!d.run) continue;
  try { await job.run({ force: forced === k }); }
  catch (e) { failed = true; console.error(`[${k}] échec :`, e); }
}
process.exit(failed ? 1 : 0);
