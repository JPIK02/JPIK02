// Appels à l'API Claude. Chaque agent rend son résultat via un « outil de sortie » :
// Claude remplit un JSON décrit par un schéma, plus fiable qu'un texte à parser.
import Anthropic from "@anthropic-ai/sdk";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, getMeta } from "./firestore.js";
import { profileFor, recordUsage } from "./usage.js";

// Modèle et effort : réglés par fonction dans l'app (Réglages → Coût de l'IA, meta/ia, voir lib/usage.js).
// ANTHROPIC_MODEL force un modèle pour tout (tests, dépannage).
export const MODEL = process.env.ANTHROPIC_MODEL || "";
let cfgCache = null, cfgAt = 0;
export async function iaConfig() {
  if (!cfgCache || Date.now() - cfgAt > 60_000) { try { cfgCache = await getMeta("ia"); } catch { cfgCache = {}; } cfgAt = Date.now(); }
  return cfgCache;
}

let client;
const api = () => (client ||= new Anthropic()); // lit ANTHROPIC_API_KEY

/**
 * Fait tourner Claude jusqu'à ce qu'il appelle l'outil de sortie `output.name`.
 * Les modèles récents (Opus 5.5…) refusent un tool_choice forcé : on reste en "auto",
 * on demande explicitement l'outil, et on relance tant qu'il n'est pas appelé.
 * @param {object} o
 * @param {string} o.system
 * @param {string} o.user
 * @param {{name:string, description:string, input_schema:object}} o.output
 * @param {boolean} [o.webSearch]  autorise la recherche web côté serveur Anthropic
 * @param {number} [o.maxSearches]
 * @param {"low"|"medium"|"high"|"xhigh"|"max"} [o.effort]
 * @returns {Promise<object>} l'input passé à l'outil de sortie
 */
export async function runForOutput({ system, user, output, feature = "synthese", webSearch = false, maxSearches, maxTokens = 16000, effort }) {
  const prof = profileFor(await iaConfig(), feature);
  const model = MODEL || prof.model;
  effort = effort || prof.effort;
  maxSearches = maxSearches || prof.maxSearches || 3;
  const tools = [output];
  if (webSearch) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: maxSearches });
  const ask = `Quand tu as fini, rends ton résultat en appelant l'outil ${output.name}.`;
  const messages = [{
    role: "user",
    content: Array.isArray(user) ? [...user, { type: "text", text: ask }] : `${user}\n\n${ask}`,
  }];

  for (let turn = 0; turn < 8; turn++) {
    // En flux (stream) : le SDK refuse les longues réponses (briefs, 32 000 tokens) sans flux
    const res = await api().beta.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      tools,
      tool_choice: { type: "auto" },
      output_config: { effort },
      cache_control: { type: "ephemeral" }, // consignes et données communes relues à moindre coût
      // En cas de refus par un filtre de sécurité, l'API relance d'elle-même sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    }).finalMessage();
    await recordUsage(getDb(), FieldValue.increment, feature, res);
    if (res.stop_reason === "refusal")
      throw new Error(`Claude a refusé la requête (${res.stop_details?.category || "sans catégorie"})`);

    const call = res.content.find(b => b.type === "tool_use" && b.name === output.name);
    if (call) return call.input;

    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "pause_turn") continue; // recherche web longue : on relance tel quel
    messages.push({
      role: "user",
      content: `Termine maintenant en appelant l'outil ${output.name} avec ton résultat.`,
    });
  }
  throw new Error(`Claude n'a pas rendu de résultat via ${output.name}`);
}
