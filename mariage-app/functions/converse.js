// Boucle de conversation : Claude appelle des outils jusqu'à donner sa réponse. Testable (client injecté).
export async function converse({ client, model, system, tools, messages, exec, maxTurns = 12, effort = "low", onUsage = () => {} }) {
  const actions = [], sources = [];
  let text = "", searches = 0;
  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await client.beta.messages.create({
      model, max_tokens: 8000, system, tools, messages,
      output_config: { effort },
      cache_control: { type: "ephemeral" },
      // En cas de refus par un filtre de sécurité, l'API relance d'elle-même sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    });
    await onUsage(res);
    if (res.stop_reason === "refusal") return { text: "Je ne peux pas répondre à cette demande.", actions };
    messages.push({ role: "assistant", content: res.content });
    searches += res.usage?.server_tool_use?.web_search_requests || 0;
    for (const b of res.content) for (const c of b.citations || []) if (c.url && !sources.some(s => s.url === c.url) && sources.length < 8) sources.push({ url: c.url, title: String(c.title || c.url).slice(0, 120) });
    if (res.stop_reason === "pause_turn") continue; // recherche web longue : on relance tel quel
    const calls = res.content.filter(b => b.type === "tool_use");
    text = res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim() || text;
    if (res.stop_reason !== "tool_use" || !calls.length) break;
    const results = [];
    for (const c of calls) {
      const r = await exec(c.name, c.input);
      if (r.action) actions.push(r.action);
      results.push({ type: "tool_result", tool_use_id: c.id, content: r.content.slice(0, 60000), ...(r.isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }
  if (!text) text = actions.length ? "C'est fait." : "Je n'ai pas réussi à répondre, pouvez-vous reformuler ?";
  if (searches) actions.push({ label: `${searches} recherche${searches > 1 ? "s" : ""} sur internet` });
  return { text, actions, sources };
}

// Pièce jointe (photo ou PDF d'un devis, d'une plaquette…) : bloc image ou document pour Claude.
const MEDIA = { "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image", "application/pdf": "document" };
export const MAX_ATTACHMENT_B64 = 8_000_000; // ≈ 6 Mo une fois décodé
export const MAX_ATTACHMENTS = 3;
/** Texte seul, ou blocs image/document (jusqu'à 3 pièces jointes) suivis du texte. Accepte une pièce ou une liste. */
export function userContent(message, attachments) {
  const text = String(message || "").trim();
  const list = (Array.isArray(attachments) ? attachments : attachments ? [attachments] : []).filter(Boolean);
  if (!list.length) return text;
  if (list.length > MAX_ATTACHMENTS) throw new Error(`${MAX_ATTACHMENTS} pièces jointes au plus.`);
  let total = 0;
  const blocks = list.map(a => {
    const kind = MEDIA[a.media_type];
    if (!kind) throw new Error("Format non pris en charge : photo (JPEG, PNG) ou PDF.");
    if (typeof a.data !== "string" || !a.data || a.data.length > MAX_ATTACHMENT_B64) throw new Error("Fichier trop lourd (6 Mo au plus).");
    total += a.data.length;
    return { type: kind, source: { type: "base64", media_type: a.media_type, data: a.data } };
  });
  if (total > MAX_ATTACHMENT_B64 * 1.2) throw new Error("Pièces jointes trop lourdes au total.");
  const n = list.length, photos = list.filter(a => MEDIA[a.media_type] === "image").length;
  const label = n > 1 ? ` (${n} pièces jointes, numérotées 1 à ${n} dans l'ordre)` : "";
  return [...blocks, { type: "text", text: (text || (photos ? "Voici une photo : regarde-la et dis-moi ce que tu en retiens pour notre mariage." : "Voici un document : dis-moi ce qu'il contient d'utile pour notre mariage.")) + label }];
}
