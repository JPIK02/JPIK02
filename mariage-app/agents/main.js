// Tous les agents en un passage : chacun tourne s'il est dû (planning, demande depuis l'app) ou s'il est forcé.
// Appelé par Google Cloud (fonction planifiée « agents », toutes les 10 minutes, voir functions/index.js)
// et, à la main, par `node run.js [mail|analyse|hebdo]` (GitHub Actions ou poste local).
import { getMeta, listAll } from "./lib/firestore.js";
import { DEFAULT_PLANS, shouldRun, profilDue, vendorsRequested, hebdoDue } from "./lib/scheduler.js";
import { runMailAgent } from "./mail-agent.js";
import { runAnalyseAgent, runProfil } from "./analyse-agent.js";
import { ensureVapid } from "./lib/push.js";
import { runHebdo, runVisitFollowups } from "./hebdo-agent.js";


/** @returns {Promise<boolean>} true si un agent a échoué */
export async function runAll({ forced } = {}) {
  const JOBS = { mail: { meta: "agent", run: runMailAgent }, analyse: { meta: "analyse", run: runAnalyseAgent } };

  const planning = await getMeta("planning");
  // Clés des notifications push : créées au premier passage (l'app en a besoin pour s'abonner).
  try { await ensureVapid(); } catch (e) { console.error("[push] clés indisponibles :", e.message); }
  let failed = false;
  const ran = new Set();
  for (const [k, job] of Object.entries(JOBS)) {
    if (forced && forced !== k) continue;
    const plan = { ...DEFAULT_PLANS[k], ...(planning[k] || {}) };
    const meta = await getMeta(job.meta);
    let d = shouldRun(plan, meta, new Date(), { force: forced === k });
    // Notes de visite ajoutées dans l'app : on réanalyse ces prestataires sans attendre le créneau.
    if (!d.run && !forced && k === "analyse" && vendorsRequested(await listAll("vendors")).length)
      d = { run: true, reason: "notes de visite à prendre en compte" };
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
  // Coach proactif : point du lundi (ou demandé depuis l'app) et relance le soir des visites.
  if (!forced || forced === "hebdo") {
    try { if (forced === "hebdo" || hebdoDue(await getMeta("hebdo"))) { console.log("[hebdo] → point de la semaine"); await runHebdo(); } }
    catch (e) { failed = true; console.error("[hebdo] échec :", e); }
    try { await runVisitFollowups(); } catch (e) { console.error("[visites] échec :", e.message); }
  }
  return failed;
}
