// Agent d'analyse : synthèse du brief (meta/profil) et note de fit de chaque prestataire (vendors/<id>.fit).
import { readFileSync } from "node:fs";
import { getDb, getMeta, listAll, mergeMeta } from "./lib/firestore.js";
import { runForOutput } from "./lib/claude.js";
import { vendorsToAnalyse } from "./lib/scheduler.js";
import { notify } from "./lib/push.js";

const SYSTEM = readFileSync(new URL("./prompts/analyse.md", import.meta.url), "utf8");

const PROFIL_OUT = {
  name: "enregistrer_profil",
  description: "Enregistre la synthèse du brief de Claire et Julien.",
  input_schema: {
    type: "object",
    properties: {
      resume: { type: "string", description: "4 à 6 phrases : ambiance, format, ce qui compte vraiment" },
      priorites: { type: "array", items: { type: "object", properties: { cat: { type: "string" }, phrase: { type: "string" } }, required: ["cat", "phrase"] } },
      divergences: { type: "array", items: { type: "object", properties: {
        cat: { type: "string" }, sujet: { type: "string" }, claire: { type: "string" }, julien: { type: "string" }, conseil: { type: "string" } }, required: ["sujet"] } },
      questionsOuvertes: { type: "array", items: { type: "string" }, maxItems: 8 },
      completude: { type: "number", minimum: 0, maximum: 100 },
    },
    required: ["resume", "priorites", "divergences", "questionsOuvertes", "completude"],
  },
};

const FIT_OUT = {
  name: "enregistrer_fit",
  description: "Enregistre la fiche et la note de fit du prestataire.",
  input_schema: {
    type: "object",
    properties: {
      score: { type: "number", minimum: 0, maximum: 100 },
      confiance: { type: "string", enum: ["faible", "moyenne", "bonne"] },
      verdict: { type: "string", description: "une phrase" },
      criteres: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", properties: {
        label: { type: "string" }, note: { type: "number" }, pourquoi: { type: "string" } }, required: ["label", "note", "pourquoi"] } },
      forces: { type: "array", items: { type: "string" } },
      vigilance: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" }, maxItems: 6 },
      avis: { type: "object", properties: {
        note: { type: "number", description: "sur 5, seulement si trouvée" },
        nombre: { type: "number" },
        resume: { type: "string" },
        sources: { type: "array", items: { type: "object", properties: { titre: { type: "string" }, url: { type: "string" } }, required: ["url"] } },
      } },
    },
    required: ["score", "confiance", "verdict", "criteres", "forces", "vigilance", "questions", "avis"],
  },
};

const strip = ({ fit, ...v }) => v; // on n'envoie pas l'ancienne fiche à Claude

/** Exécute fn sur chaque élément, `n` à la fois ; la première erreur est remontée après la fin des autres. */
export async function mapPool(items, n, fn) {
  let i = 0, err = null;
  const worker = async () => { while (i < items.length) { const it = items[i++]; try { await fn(it); } catch (e) { err ||= e; } } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  if (err) throw err;
}

async function loadContext() {
  const [settings, brief, inbox] = await Promise.all([getMeta("settings"), listAll("brief"), listAll("inbox")]);
  return JSON.stringify({
    settings,
    brief: brief.map(({ id, updatedAt, ...b }) => ({ id, ...b })),
    offresRecues: inbox.filter(m => m.type !== "ignored").map(m => ({ from: m.from, summary: m.summary, payload: m.payload })),
  });
}

async function writeProfil(context) {
  const profil = await runForOutput({
    system: SYSTEM,
    user: `Écris la synthèse du brief (divergences : desaccord=true ou réponses claire/julien différentes).\n\n<donnees>${context}</donnees>`,
    output: PROFIL_OUT,
    effort: "medium",
  });
  await getDb().doc("meta/profil").set({ ...profil, updatedAt: Date.now() });
  return profil;
}

/** Synthèse seule (sans recherche web) : relancée quand les envies ou les réglages ont changé. */
export async function runProfil({ log = console.log } = {}) {
  const profil = await writeProfil(await loadContext());
  log(`Synthèse des envies mise à jour (brief complet à ${Math.round(profil.completude ?? 0)} %).`);
}

export async function runAnalyseAgent({ log = console.log, force = false } = {}) {
  const analyse = await getMeta("analyse");
  const vendors = await listAll("vendors");
  const todo = vendorsToAnalyse(vendors, analyse.requestedAt);
  const asked = analyse.requestedAt && analyse.requestedAt > (analyse.lastRunAt || analyse.lastRun || 0);
  if (!todo.length && !asked && !force) {
    log("Rien à analyser.");
    await mergeMeta("analyse", { lastRunAt: Date.now() });
    return { analyses: 0 };
  }
  await mergeMeta("analyse", { status: "en cours" });

  try {
    const context = await loadContext();

    // Synthèse du brief et fiches prestataires en parallèle (4 à la fois) : quelques minutes de moins
    const scores = [];
    const analyseOne = async v => {
      const fit = await runForOutput({
        system: SYSTEM,
        user: `Analyse ce prestataire, recherche ses avis en ligne, puis appelle enregistrer_fit.\n\n<prestataire>${JSON.stringify(strip(v))}</prestataire>\n\n<donnees>${context}</donnees>`,
        output: FIT_OUT,
        webSearch: true, maxSearches: 4, effort: "medium",
      });
      if (fit.avis?.sources) fit.avis.sources = fit.avis.sources.filter(s => /^https?:\/\//.test(s.url || ""));
      // update avec un seul champ : on ne touche à rien d'autre sur le prestataire
      await getDb().doc(`vendors/${v.id}`).update({ fit: { ...fit, updatedAt: Date.now() } });
      scores.push(`${v.name} : ${Math.round(fit.score)}`);
    };
    await Promise.all([writeProfil(context), mapPool(todo, 4, analyseOne)]);
    await mergeMeta("analyse", { status: "terminée", lastRun: Date.now(), lastRunAt: Date.now() });
    log(`${todo.length} prestataire(s) analysé(s). ${scores.join(" · ")}`);
    if (todo.length) await notify({ title: "Analyse des prestataires terminée", body: scores.join(" · "), url: "/#prestataires", tag: "analyse" }, { log });
    return { analyses: todo.length, scores };
  } catch (e) {
    await mergeMeta("analyse", { status: "erreur", lastError: String(e.message || e).slice(0, 500), lastRunAt: Date.now() });
    throw e;
  }
}
