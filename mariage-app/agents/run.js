// Point d'entrée appelé toutes les 10 minutes par GitHub Actions.
//   node agents/run.js            → chaque agent tourne s'il est dû (planning ou demande depuis l'app)
//   node agents/run.js mail       → force l'agent e-mails
//   node agents/run.js analyse    → force l'agent d'analyse
import { getMeta } from "./lib/firestore.js";
import { DEFAULT_PLANS, shouldRun, profilDue } from "./lib/scheduler.js";
import { runMailAgent } from "./mail-agent.js";
import { runAnalyseAgent, runProfil } from "./analyse-agent.js";

const forced = process.argv[2];
const JOBS = { mail: { meta: "agent", run: runMailAgent }, analyse: { meta: "analyse", run: runAnalyseAgent } };

const planning = await getMeta("planning");
let failed = false;
const ran = new Set();
for (const [k, job] of Object.entries(JOBS)) {
  if (forced && forced !== k) continue;
  const plan = { ...DEFAULT_PLANS[k], ...(planning[k] || {}) };
  const meta = await getMeta(job.meta);
  const d = shouldRun(plan, meta, new Date(), { force: forced === k });
  console.log(`[${k}] ${d.run ? "→ lancement" : "→ ignoré"} (${d.reason})`);
  if (!d.run) continue;
  ran.add(k);
  try { await job.run({ force: forced === k }); }
  catch (e) { failed = true; console.error(`[${k}] échec :`, e); }
}
// Synthèse des envies seule, quand l'app a signalé un changement (l'analyse complète la refait déjà).
if (!forced && !ran.has("analyse")) {
  const [analyse, profil] = await Promise.all([getMeta("analyse"), getMeta("profil")]);
  if (profilDue(analyse, profil)) {
    console.log("[profil] → mise à jour de la synthèse (envies ou réglages modifiés)");
    try { await runProfil(); } catch (e) { failed = true; console.error("[profil] échec :", e); }
  }
}
process.exit(failed ? 1 : 0);
