// Agent d'analyse : synthèse du brief (meta/profil) et note de fit de chaque prestataire (vendors/<id>.fit).
import { mapPool } from "./lib/pool.js";
import { readFileSync } from "node:fs";
import { getDb, getMeta, listAll, mergeMeta } from "./lib/firestore.js";
import { runForOutput } from "./lib/claude.js";
import { vendorsToAnalyse } from "./lib/scheduler.js";
import { notify } from "./lib/push.js";
import { enviesForAI } from "./lib/envies/context.js";
import { coupleNames } from "./lib/couple.js";
import { FR } from "./lib/envies/fr.js";
import { METIER2TILE } from "./lib/envies/logic.js";
import { openQuestions, VALEUR_PROPS, buildReperee, inSource } from "./lib/envies/reperees.js";

const SYSTEM = readFileSync(new URL("./prompts/analyse.md", import.meta.url), "utf8");

const PROFIL_OUT = {
  name: "enregistrer_profil",
  description: "Enregistre la synthèse du brief du couple.",
  input_schema: {
    type: "object",
    properties: {
      resume: { type: "string", description: "4 à 6 phrases : ambiance, format, ce qui compte vraiment" },
      priorites: { type: "array", items: { type: "object", properties: { cat: { type: "string", description: "clé de la tuile concernée (ex. lieu, repas, photo, mariage)" }, phrase: { type: "string" } }, required: ["cat", "phrase"] } },
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
        trait: { type: "string", description: "un trait qui revient souvent dans les avis, en quelques mots (ex. « discret, très à l'écoute »), seulement s'il revient vraiment" },
        sources: { type: "array", items: { type: "object", properties: { titre: { type: "string" }, url: { type: "string" } }, required: ["url"] } },
      } },
    },
    required: ["score", "confiance", "verdict", "criteres", "forces", "vigilance", "questions", "avis"],
  },
};

const strip = ({ fit, ...v }) => v; // on n'envoie pas l'ancienne fiche à Claude

// Récolte passive (Nos envies, section 6.7) : les notes de visite peuvent répondre à des questions encore ouvertes.
// Rien de plus qu'un champ dans la même réponse de Claude (pas d'appel en plus) ; les envies repérées restent à confirmer.
const ENVIES_OUT = { type: "array", maxItems: 5, description: "Envies que révèlent les notes de visite (vide si aucune)", items: { type: "object",
  properties: { ...VALEUR_PROPS, phrase: { type: "string", description: "la phrase des notes de visite, mot pour mot" } }, required: ["question", "phrase"] } };
/** Consigne et schéma de l'analyse d'un prestataire ; avec notes de visite, liste des questions ouvertes de son métier. */
export function fitRequest(v, A = {}, pays) {
  const user = `Analyse ce prestataire (données du couple dans <donnees>), recherche ses avis en ligne, puis appelle enregistrer_fit.\n\n<prestataire>${JSON.stringify(strip(v))}</prestataire>`;
  const qs = String(v.visitNotes || "").trim() ? openQuestions([...new Set([METIER2TILE[v.cat], "mariage"].filter(Boolean))], A, FR, { pays, max: 30 }) : "";
  if (!qs) return { user, output: FIT_OUT };
  return {
    user: `${user}\n\nSes notes de visite (champ visitNotes, écrites par le couple) peuvent aussi révéler leurs envies. Si une phrase de ces notes répond clairement à l'une de ces questions encore sans réponse, ajoute-la dans « envies », avec la phrase mot pour mot ; n'invente rien, sinon laisse « envies » vide.\n${qs}`,
    output: { ...FIT_OUT, input_schema: { ...FIT_OUT.input_schema, properties: { ...FIT_OUT.input_schema.properties, envies: ENVIES_OUT } } },
  };
}
/** Écrit les envies repérées dans les notes de visite (jamais une phrase absente des notes, jamais par-dessus une envie déjà traitée). */
export async function saveVisitEnvies(v, envies = [], { A = {}, pays, log = console.log } = {}) {
  const db = getDb(); let n = 0;
  for (const e of envies) {
    if (!inSource(e.phrase, v.visitNotes)) continue;
    const r = buildReperee(e, FR, { A, source: "visite", ref: v.id, pays });
    if (!r) continue;
    const cur = await db.doc(`envies_reperees/${r.id}`).get();
    if (cur.exists && cur.data().status !== "attente") continue;
    await db.doc(`envies_reperees/${r.id}`).set(r.doc); n++;
  }
  if (n) log(`[récolte] ${n} envie(s) repérée(s) dans les notes de visite de ${v.name}`);
  return n;
}


const enviesState = async () => {
  const [envies, settings] = await Promise.all([listAll("envies"), getMeta("settings")]);
  return { A: Object.fromEntries(envies.map(d => [d.id, d])), pays: settings.pays };
};

async function loadContext() {
  const [settings, brief, envies, inbox] = await Promise.all([getMeta("settings"), listAll("brief"), listAll("envies"), listAll("inbox")]);
  return JSON.stringify({
    settings,
    envies: enviesForAI(envies, brief, coupleNames(settings)),
    offresRecues: inbox.filter(m => m.type !== "ignored").map(m => ({ from: m.from, summary: m.summary, payload: m.payload })),
  });
}

async function writeProfil(context) {
  const profil = await runForOutput({
    system: SYSTEM,
    user: `Écris la synthèse des envies (questionnaire « Nos envies », par tuile ; divergences : avis différents des deux partenaires dans les réponses).\n\n<donnees>${context}</donnees>`,
    output: PROFIL_OUT,
    feature: "synthese",
  });
  await getDb().doc("meta/profil").set({ ...profil, updatedAt: Date.now() });
  return profil;
}

/** Synthèse seule (sans recherche web) : relancée quand les envies ou les réglages ont changé. */
export async function runProfil({ log = console.log } = {}) {
  const profil = await writeProfil(await loadContext());
  log(`Synthèse des envies mise à jour (brief complet à ${Math.round(profil.completude ?? 0)} %).`);
}

/** Recalcule la note de fit de quelques prestataires (fin de l'essentiel d'une tuile de « Nos envies »).
 *  @returns [{id, nom, avant, apres, fit}] */
export async function fitVendors(vendors, { log = console.log } = {}) {
  if (!vendors.length) return [];
  const context = await loadContext();
  const system = [{ type: "text", text: `${SYSTEM}\n\n<donnees>${context}</donnees>`, cache_control: { type: "ephemeral" } }];
  const { A, pays } = await enviesState();
  const out = [];
  const one = async v => {
    const { envies = [], ...fit } = await runForOutput({ system, ...fitRequest(v, A, pays), webSearch: true, feature: "analyse" });
    await saveVisitEnvies(v, envies, { A, pays, log });
    if (fit.avis?.sources) fit.avis.sources = fit.avis.sources.filter(s => /^https?:\/\//.test(s.url || ""));
    await getDb().doc(`vendors/${v.id}`).update({ fit: { ...fit, updatedAt: Date.now() } });
    out.push({ id: v.id, nom: v.name, avant: v.fit?.score != null ? Math.round(v.fit.score) : null, apres: Math.round(fit.score), fit });
  };
  const list = vendors.slice();
  if (list.length > 1) await one(list.shift()); // la première écrit le cache, les suivantes le relisent
  await mapPool(list, 4, one);
  log(`[fit] ${out.map(x => `${x.nom} : ${x.avant ?? "—"} → ${x.apres}`).join(" · ")}`);
  return out;
}

export async function runAnalyseAgent({ log = console.log, force = false } = {}) {
  const analyse = await getMeta("analyse");
  const vendors = await listAll("vendors");
  const todo = vendorsToAnalyse(vendors, { requestedAt: analyse.requestedAt, changedAt: analyse.profilRequestedAt, fullAt: analyse.fullRequestedAt });
  const asked = analyse.requestedAt && analyse.requestedAt > (analyse.lastRunAt || analyse.lastRun || 0);
  if (!todo.length && !asked && !force) {
    log("Rien à analyser.");
    await mergeMeta("analyse", { lastRunAt: Date.now() });
    return { analyses: 0 };
  }
  await mergeMeta("analyse", { status: "en cours" });

  try {
    const context = await loadContext();
    const { A, pays } = await enviesState();
    // Consignes + données communes en tête, marquées pour le cache : relues à ~5 % du prix par les fiches suivantes
    const system = [{ type: "text", text: `${SYSTEM}\n\n<donnees>${context}</donnees>`, cache_control: { type: "ephemeral" } }];

    // Synthèse du brief et fiches prestataires en parallèle (4 à la fois) : quelques minutes de moins
    const scores = [];
    const analyseOne = async v => {
      const { envies = [], ...fit } = await runForOutput({ system, ...fitRequest(v, A, pays), webSearch: true, feature: "analyse" });
      await saveVisitEnvies(v, envies, { A, pays, log });
      if (fit.avis?.sources) fit.avis.sources = fit.avis.sources.filter(s => /^https?:\/\//.test(s.url || ""));
      // update avec un seul champ : on ne touche à rien d'autre sur le prestataire
      await getDb().doc(`vendors/${v.id}`).update({ fit: { ...fit, updatedAt: Date.now() } });
      scores.push(`${v.name} : ${Math.round(fit.score)}`);
    };
    // La synthèse n'est refaite que si les envies ou les réglages ont changé (ou « Tout réanalyser »)
    const profil = await getMeta("profil");
    const profilStale = !profil.updatedAt || (+analyse.profilRequestedAt || 0) > profil.updatedAt || (+analyse.fullRequestedAt || 0) > profil.updatedAt;
    // une première fiche seule écrit le cache, les suivantes le relisent
    if (todo.length > 1) await analyseOne(todo.shift());
    await Promise.all([profilStale ? writeProfil(context) : null, mapPool(todo, 4, analyseOne)]);
    await mergeMeta("analyse", { status: "terminée", lastRun: Date.now(), lastRunAt: Date.now() });
    log(`${scores.length} prestataire(s) analysé(s). ${scores.join(" · ") || "Tout était déjà à jour."}`);
    if (scores.length) await notify({ title: "Analyse des prestataires terminée", body: scores.join(" · "), url: "/#prestataires", tag: "analyse" }, { log });
    return { analyses: scores.length, scores };
  } catch (e) {
    await mergeMeta("analyse", { status: "erreur", lastError: String(e.message || e).slice(0, 500), lastRunAt: Date.now() });
    throw e;
  }
}
