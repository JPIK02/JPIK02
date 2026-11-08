// Appels à l'API Claude. Chaque agent rend son résultat via un « outil de sortie » :
// Claude remplit un JSON décrit par un schéma, plus fiable qu'un texte à parser.
import Anthropic from "@anthropic-ai/sdk";

// Modèle par défaut : Claude Opus 5.5. Modifiable via la variable ANTHROPIC_MODEL.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

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
export async function runForOutput({ system, user, output, webSearch = false, maxSearches = 6, maxTokens = 16000, effort = "high" }) {
  const tools = [output];
  if (webSearch) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: maxSearches });
  const messages = [{
    role: "user",
    content: `${user}\n\nQuand tu as fini, rends ton résultat en appelant l'outil ${output.name}.`,
  }];

  for (let turn = 0; turn < 8; turn++) {
    const res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools,
      tool_choice: { type: "auto" },
      output_config: { effort },
      // En cas de refus par un filtre de sécurité, l'API relance d'elle-même sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });
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
