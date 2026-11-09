// Tous les agents en un passage : chacun tourne s'il est dû (planning, demande depuis l'app) ou s'il est forcé.
// Appelé par Google Cloud (fonction planifiée « agents », toutes les 10 minutes, voir functions/index.js)
// et, à la main, par `node run.js [mail|analyse|hebdo]` (GitHub Actions ou poste local).
import { getMeta, listAll } from "./lib/firestore.js";
import { DEFAULT_PLANS, shouldRun, profilDue, vendorsRequested, hebdoDue } from "./lib/scheduler.js";
import { runMailAgent } from "./mail-agent.js";
import { runAnalyseAgent, runProfil } from "./analyse-agent.js";
import { ensureVapid } from "./lib/push.js";
import { runHebdo, runVisitFollowups } from "./hebdo-agent.js";
import { withLock } from "./lib/lock.js";
import { runBriefs, briefsDue } from "./briefs-agent.js";
import { runPinterest, pinterestDue } from "./pinterest-agent.js";
import { overBudget, monthKey } from "./lib/usage.js";
import { getDb } from "./lib/firestore.js";


/** @returns {Promise<boolean>} true si un agent a échoué */
export async function runAll({ forced } = {}) {
  const JOBS = { mail: { meta: "agent", run: runMailAgent }, analyse: { meta: "analyse", run: runAnalyseAgent } };

  const planning = await getMeta("planning");
  // Budget du mois atteint (Réglages → Coût de l'IA) : plus de passages automatiques ; les boutons de l'app restent actifs.
  if (!forced) {
    const [ia, usage] = await Promise.all([getMeta("ia"), getDb().doc(`usage/${monthKey()}`).get().then(s => s.data() || {})]);
    if (overBudget(ia, usage)) { console.log("[budget] budget du mois atteint : passages automatiques suspendus"); return false; }
  }
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
    try { await withLock(k, 25 * 60 * 1000, () => job.run({ force: forced === k })); }
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
    try { if (forced === "hebdo" || hebdoDue(await getMeta("hebdo"))) { console.log("[hebdo] → point de la semaine"); await withLock("hebdo", 10 * 60 * 1000, () => runHebdo()); } }
    catch (e) { failed = true; console.error("[hebdo] échec :", e); }
    try { await runVisitFollowups(); } catch (e) { console.error("[visites] échec :", e.message); }
  }
  // Tableaux Pinterest → inspirations : sur demande, sinon une fois par jour
  if (!forced || forced === "pinterest") {
    try { if (forced === "pinterest" || pinterestDue(await getMeta("pinterest"))) { console.log("[pinterest] → synchronisation"); await withLock("pinterest", 10 * 60 * 1000, () => runPinterest()); } }
    catch (e) { failed = true; console.error("[pinterest] échec :", e); await getDb().doc("meta/pinterest").set({ status: "erreur", lastError: String(e.message || e).slice(0, 300), lastSyncAt: Date.now() }, { merge: true }).catch(() => {}); }
  }
  // Briefs prestataires : sur demande depuis l'app (meta/briefs.requestedAt)
  if (!forced || forced === "briefs") {
    try { if (forced === "briefs" || briefsDue(await getMeta("briefs"))) { console.log("[briefs] → rédaction"); await withLock("briefs", 15 * 60 * 1000, () => runBriefs()); } }
    catch (e) { failed = true; console.error("[briefs] échec :", e); await getDb().doc("meta/briefs").set({ status: "erreur", lastError: String(e?.error?.error?.message || e.message || e).slice(0, 300), failedAt: Date.now() }, { merge: true }).catch(() => {}); }
  }
  return failed;
}
