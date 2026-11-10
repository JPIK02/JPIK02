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

import { userContent } from "../converse.js";
test("pièce jointe : image et PDF acceptés, autres formats refusés", () => {
  assert.equal(userContent(" bonjour "), "bonjour");
  const img = userContent("", { media_type: "image/jpeg", data: "AAAA" });
  assert.equal(img[0].type, "image"); assert.equal(img[0].source.media_type, "image/jpeg"); assert.match(img[1].text, /photo/);
  assert.match(userContent("", { media_type: "application/pdf", data: "AAAA" })[1].text, /document/);
  assert.equal(userContent("devis", { media_type: "application/pdf", data: "AAAA" })[0].type, "document");
  assert.throws(() => userContent("x", { media_type: "text/html", data: "AAAA" }), /Format/);
  assert.throws(() => userContent("x", { media_type: "image/png", data: "A".repeat(8_000_001) }), /lourd/);
});

test("plusieurs photos : 3 au plus, numérotées pour le coach", () => {
  const c = userContent("on aime ça", [{ media_type: "image/jpeg", data: "AA" }, { media_type: "image/png", data: "BB" }]);
  assert.equal(c.length, 3); assert.match(c[2].text, /2 pièces jointes/);
  assert.throws(() => userContent("x", [1, 2, 3, 4].map(() => ({ media_type: "image/jpeg", data: "A" }))), /3 pièces/);
});

test("recherche web : relance après pause_turn, sources citées et compteur", async () => {
  const replies = [
    { stop_reason: "pause_turn", usage: { server_tool_use: { web_search_requests: 2 } }, content: [{ type: "text", text: "Je cherche…" }] },
    { stop_reason: "end_turn", usage: { server_tool_use: { web_search_requests: 1 } }, content: [
      { type: "text", text: "Idée : des lanternes en verre ancien.", citations: [{ type: "web_search_result_location", url: "https://exemple.fr/a", title: "Déco champêtre" }] },
      { type: "text", text: " Et du lin sauge.", citations: [{ url: "https://exemple.fr/a", title: "doublon" }] }] },
  ];
  let calls = 0;
  const client = { beta: { messages: { create: async () => replies[calls++] } } };
  const r = await converse({ client, model: "m", system: "s", tools: [], messages: [{ role: "user", content: "x" }], exec: async () => ({}) });
  assert.equal(calls, 2);
  assert.deepEqual(r.sources, [{ url: "https://exemple.fr/a", title: "Déco champêtre" }]);
  assert.equal(r.actions.at(-1).label, "3 recherches sur internet");
  assert.match(r.text, /lanternes/);
});

test("demander_recherche_web : ne cherche pas, renvoie la demande à l'app", async () => {
  const { makeTools } = await import("../tools.js");
  const db = { doc: () => ({ get: async () => ({ exists: false }) }), collection: () => ({ get: async () => ({ docs: [] }) }) };
  const exec = makeTools(db, { qcats: [] });
  const r = await exec("demander_recherche_web", { requete: "déco champêtre sauge", pourquoi: "des idées de centres de table" });
  assert.equal(JSON.parse(r.content).ok, true);
  assert.deepEqual(r.action.web, { requete: "déco champêtre sauge", pourquoi: "des idées de centres de table" });
});
