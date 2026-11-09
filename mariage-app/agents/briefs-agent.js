// Briefs prestataires : un fil rouge commun + un brief par catégorie, rédigés en une seule passe à partir
// de l'entretien « Nos envies », de la synthèse et des inspirations → meta/briefs (l'app en fait des PDF).
import { readFileSync } from "node:fs";
import { getDb, getMeta, listAll } from "./lib/firestore.js";
import { runForOutput } from "./lib/claude.js";
import { notify } from "./lib/push.js";

const SYSTEM = readFileSync(new URL("./prompts/briefs.md", import.meta.url), "utf8");

// Catégories de l'entretien qui correspondent à un métier (clé → libellé) : voir src/questions.js
export const BRIEF_CATS = {
  lieu: "Lieu", traiteur: "Traiteur", photo: "Photographe", video: "Vidéaste", musique: "Musique", fleurs: "Fleurs et déco",
  tenues: "Tenues", alliances: "Alliances", beaute: "Coiffure et maquillage", papeterie: "Papeterie", transport: "Transport",
  ceremonie: "Cérémonie", hebergement: "Hébergement", enfants: "Enfants",
};
const VCAT = { lieu: "Lieu", traiteur: "Traiteur", photo: "Photographe", video: "Vidéaste", musique: "Musique", fleurs: "Fleuriste", tenues: "Tenues",
  alliances: "Alliances", beaute: "Coiffure & maquillage", papeterie: "Papeterie", transport: "Transport", ceremonie: "Officiant", hebergement: "Hébergement", enfants: "Animation enfants" };

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

export async function runBriefs({ log = console.log } = {}) {
  const [settings, brief, profil, inspirations, vendors] = await Promise.all([
    getMeta("settings"), listAll("brief"), getMeta("profil"), listAll("inspirations"), listAll("vendors")]);
  const data = {
    reglages: { date: settings.date, lieu: settings.lieu, ville: settings.ville, invitesCible: settings.invitesCible },
    entretien: brief.map(({ id, updatedAt, by, ...b }) => ({ id, ...b })),
    synthese: { resume: profil.resume, priorites: profil.priorites, divergences: profil.divergences },
    inspirations: inspirations.map(i => ({ categorie: i.cat, description: i.description })),
    prestataires: Object.fromEntries(Object.entries(VCAT).map(([k, c]) => [k, vendors.filter(v => v.cat === c && v.status !== "ecarte").map(v => ({ nom: v.name, statut: v.status }))]).filter(([, l]) => l.length)),
  };
  const out = await runForOutput({
    system: SYSTEM,
    user: `Rédige le fil rouge puis un brief pour chacune de ces catégories : ${Object.entries(BRIEF_CATS).map(([k, l]) => `${k} (${l})`).join(", ")}.\n\n<donnees>${JSON.stringify(data)}</donnees>`,
    output: OUT,
    feature: "synthese",
    effort: "medium",
    maxTokens: 32000,
  });
  const fr = out.filRouge || {};
  const categories = {};
  for (const c of out.categories || []) {
    if (!BRIEF_CATS[c.cat]) continue;
    categories[c.cat] = { intention: String(c.intention || "").trim(), essentiels: clean(c.essentiels), details: clean(c.details), aEviter: clean(c.aEviter), liens: clean(c.liens), questions: clean(c.questions) };
  }
  await getDb().doc("meta/briefs").set({
    filRouge: { titre: String(fr.titre || "").trim(), ambiance: String(fr.ambiance || "").trim(), motsCles: clean(fr.motsCles), palette: clean(fr.palette), matieres: clean(fr.matieres), experience: clean(fr.experience), aEviter: clean(fr.aEviter) },
    categories, updatedAt: Date.now(), status: "prêts", lastError: null,
  }, { merge: true });
  log(`[briefs] ${Object.keys(categories).length} briefs rédigés.`);
  await notify({ title: "Vos briefs prestataires sont prêts", body: fr.titre || "Fil rouge et briefs par catégorie, à télécharger en PDF.", url: "/#envies", tag: "briefs" }, { log });
}

/** À refaire ? Demandé depuis l'app après la dernière rédaction. */
export const briefsDue = (m = {}) => (+m.requestedAt || 0) > (+m.updatedAt || 0);
