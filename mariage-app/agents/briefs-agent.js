// Briefs prestataires : un fil rouge commun + un brief par catégorie, rédigés en une seule passe à partir
// de l'entretien « Nos envies », de la synthèse et des inspirations → meta/briefs (l'app en fait des PDF).
import { readFileSync } from "node:fs";
import { TUILES } from "./lib/envies/catalogue.js";
import { FR } from "./lib/envies/fr.js";
import { TBY } from "./lib/envies/logic.js";
import { getDb, getMeta, listAll } from "./lib/firestore.js";
import { runForOutput } from "./lib/claude.js";
import { notify } from "./lib/push.js";
import { enviesForAI } from "./lib/envies/context.js";
import { coupleNames } from "./lib/couple.js";

const SYSTEM = readFileSync(new URL("./prompts/briefs.md", import.meta.url), "utf8");

// Briefs par tuile de « Nos envies » ayant un métier (clé de tuile → nom) ; la tuile « mariage » donne le fil rouge.
// Les anciens briefs (clés lieu, traiteur, photo… de l'ancien questionnaire) restent lisibles jusqu'à la prochaine rédaction complète.
export const BRIEF_CATS = Object.fromEntries(TUILES.filter(t => t.metiers.length || t.k === "ceremonie").map(t => [t.k, FR.tuiles[t.k].nom]));
const list = d => ({ type: "array", items: { type: "string" }, description: d });
export const OUT = {
  name: "enregistrer_briefs",
  description: "Enregistre le fil rouge commun et les briefs par catégorie.",
  input_schema: {
    type: "object",
    properties: {
      filRouge: {
        type: "object",
        properties: {
          titre: { type: "string", description: "Une formule courte qui résume le mariage" },
          ambiance: { type: "string", description: "Court paragraphe : ce que les invités doivent ressentir" },
          motsCles: list("4 à 8 mots-clés"),
          palette: list("Couleurs"),
          matieres: list("Matières et textures"),
          experience: list("L'expérience des invités au fil de la journée, moment par moment"),
          aEviter: list("Ce qu'ils ne veulent surtout pas"),
        },
        required: ["titre", "ambiance", "motsCles", "palette", "matieres", "experience", "aEviter"],
      },
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cat: { type: "string", enum: Object.keys(BRIEF_CATS) },
            intention: { type: "string" },
            essentiels: list("Non négociables"),
            details: list("Détails d'ambiance propres à ce métier"),
            aEviter: list("Ce qu'ils ne veulent pas"),
            liens: list("Comment ce travail s'accorde avec les autres prestataires"),
            questions: list("4 à 6 questions à poser au prestataire"),
          },
          required: ["cat", "intention", "essentiels", "details", "aEviter", "liens", "questions"],
        },
      },
    },
    required: ["filRouge", "categories"],
  },
};

const clean = a => (Array.isArray(a) ? a.map(x => String(x || "").trim()).filter(Boolean).slice(0, 12) : []);

/** tuiles : rédige seulement ces briefs (fin des détails d'une tuile), en gardant le fil rouge existant ; sans : tout. */
export async function runBriefs({ log = console.log, tuiles = null } = {}) {
  const [settings, brief, profil, inspirations, vendors, envies] = await Promise.all([
    getMeta("settings"), listAll("brief"), getMeta("profil"), listAll("inspirations"), listAll("vendors"), listAll("envies")]);
  const data = {
    reglages: { date: settings.date, lieu: settings.lieu, ville: settings.ville, invitesCible: settings.invitesCible, dateIndicative: !!settings.dateIndicative },
    envies: enviesForAI(envies, brief, coupleNames(settings)),
    synthese: { resume: profil.resume, priorites: profil.priorites, divergences: profil.divergences },
    inspirations: inspirations.map(i => ({ categorie: i.cat, description: i.description })),
    prestataires: Object.fromEntries(Object.keys(BRIEF_CATS).map(k => [k, vendors.filter(v => TBY[k].metiers.includes(v.cat) && v.status !== "ecarte").map(v => ({ nom: v.name, statut: v.status }))]).filter(([, l]) => l.length)),
  };
  const prev = await getMeta("briefs");
  const subset = Array.isArray(tuiles) && tuiles.length && prev.filRouge ? tuiles.filter(k => BRIEF_CATS[k]) : null;
  const cats = subset ? Object.fromEntries(subset.map(k => [k, BRIEF_CATS[k]])) : BRIEF_CATS;
  if (subset) data.filRougeExistant = prev.filRouge;
  const out = await runForOutput({
    system: SYSTEM,
    user: subset
      ? `Le fil rouge existe déjà (filRougeExistant) : recopie-le tel quel dans filRouge, puis rédige un brief seulement pour : ${Object.entries(cats).map(([k, l]) => `${k} (${l})`).join(", ")}.\n\n<donnees>${JSON.stringify(data)}</donnees>`
      : `Rédige le fil rouge puis un brief pour chacune de ces tuiles : ${Object.entries(cats).map(([k, l]) => `${k} (${l})`).join(", ")}.\n\n<donnees>${JSON.stringify(data)}</donnees>`,
    output: OUT,
    feature: "synthese",
    effort: "medium",
    maxTokens: 32000,
  });
  const fr = out.filRouge || {};
  const categories = {};
  for (const c of out.categories || []) {
    if (!cats[c.cat]) continue;
    categories[c.cat] = { intention: String(c.intention || "").trim(), essentiels: clean(c.essentiels), details: clean(c.details), aEviter: clean(c.aEviter), liens: clean(c.liens), questions: clean(c.questions) };
  }
  const ref = getDb().doc("meta/briefs");
  if (subset) { // seulement ces briefs : les autres et le fil rouge restent
    const upd = { updatedAt: Date.now(), status: "prêts", lastError: null };
    for (const [k, v] of Object.entries(categories)) upd[`categories.${k}`] = v;
    await ref.update(upd);
    log(`[briefs] ${Object.keys(categories).join(", ")} rédigé(s).`);
    return { tuiles: Object.keys(categories) };
  }
  await ref.set({
    filRouge: { titre: String(fr.titre || "").trim(), ambiance: String(fr.ambiance || "").trim(), motsCles: clean(fr.motsCles), palette: clean(fr.palette), matieres: clean(fr.matieres), experience: clean(fr.experience), aEviter: clean(fr.aEviter) },
    categories, updatedAt: Date.now(), status: "prêts", lastError: null,
  }, { mergeFields: ["filRouge", "categories", "updatedAt", "status", "lastError"] });
  log(`[briefs] ${Object.keys(categories).length} briefs rédigés.`);
  await notify({ title: "Vos briefs prestataires sont prêts", body: fr.titre || "Fil rouge et briefs par catégorie, à télécharger en PDF.", url: "/#envies", tag: "briefs" }, { log });
}

/** À refaire ? Demandé depuis l'app après la dernière rédaction. */
export const briefsDue = (m = {}) => (+m.requestedAt || 0) > (+m.updatedAt || 0);
