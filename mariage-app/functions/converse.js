// Boucle de conversation : Claude appelle des outils jusqu'à donner sa réponse. Testable (client injecté).
export async function converse({ client, model, system, tools, messages, exec, maxTurns = 12, effort = "low" }) {
  const actions = [];
  let text = "";
  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await client.beta.messages.create({
      model, max_tokens: 8000, system, tools, messages,
      output_config: { effort },
      cache_control: { type: "ephemeral" },
      // En cas de refus par un filtre de sécurité, l'API relance d'elle-même sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    });
    if (res.stop_reason === "refusal") return { text: "Je ne peux pas répondre à cette demande.", actions };
    messages.push({ role: "assistant", content: res.content });
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
  return { text, actions };
}

// Pièce jointe (photo ou PDF d'un devis, d'une plaquette…) : bloc image ou document pour Claude.
const MEDIA = { "image/jpeg": "image", "image/png": "image", "image/webp": "image", "image/gif": "image", "application/pdf": "document" };
export const MAX_ATTACHMENT_B64 = 8_000_000; // ≈ 6 Mo une fois décodé
export function userContent(message, attachment) {
  const text = String(message || "").trim();
  if (!attachment) return text;
  const kind = MEDIA[attachment.media_type];
  if (!kind) throw new Error("Format non pris en charge : photo (JPEG, PNG) ou PDF.");
  if (typeof attachment.data !== "string" || !attachment.data || attachment.data.length > MAX_ATTACHMENT_B64)
    throw new Error("Fichier trop lourd (6 Mo au plus).");
  return [
    { type: kind, source: { type: "base64", media_type: attachment.media_type, data: attachment.data } },
    { type: "text", text: text || "Voici un document : dis-moi ce qu'il contient d'utile pour notre mariage." },
  ];
}
