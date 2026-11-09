import { test } from "node:test";
import assert from "node:assert/strict";
import { converse } from "../converse.js";

test("boucle : outil appelé, résultat renvoyé, réponse finale, actions remontées", async () => {
  const calls = [];
  const replies = [
    { stop_reason: "tool_use", content: [{ type: "thinking", thinking: "" }, { type: "tool_use", id: "u1", name: "ajouter_tache", input: { titre: "X" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Tâche ajoutée." }] },
  ];
  const client = { beta: { messages: { create: async body => { calls.push(structuredClone(body)); return replies.shift(); } } } };
  const exec = async (name, input) => ({ content: '{"ok":true}', action: { label: `${name}:${input.titre}`, ops: [] } });
  const out = await converse({ client, model: "claude-opus-5-5", system: "s", tools: [{ name: "ajouter_tache" }], messages: [{ role: "user", content: "ajoute X" }], exec });
  assert.equal(out.text, "Tâche ajoutée.");
  assert.deepEqual(out.actions.map(a => a.label), ["ajouter_tache:X"]);
  // forme des requêtes : pas de tool_choice forcé (refusé par les modèles récents), repli activé, contenu de l'assistant renvoyé tel quel
  assert.equal(calls[0].tool_choice, undefined);
  assert.equal(calls[0].fallbacks, "default");
  assert.deepEqual(calls[1].messages[1].content[0], { type: "thinking", thinking: "" });
  assert.deepEqual(calls[1].messages[2].content, [{ type: "tool_result", tool_use_id: "u1", content: '{"ok":true}' }]);
});

test("refus : réponse polie, rien d'autre", async () => {
  const client = { beta: { messages: { create: async () => ({ stop_reason: "refusal", content: [] }) } } };
  const out = await converse({ client, model: "m", system: "s", tools: [], messages: [{ role: "user", content: "?" }], exec: async () => ({}) });
  assert.match(out.text, /ne peux pas/);
});
