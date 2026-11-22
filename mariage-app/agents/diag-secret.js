// Diagnostic « tenue secrète » : ce qui reste de la tenue dans l'espace COMMUN (lisible par les deux). Comptes seulement :
// jamais de contenu, de nom ni de texte dans le journal. Ne lit jamais un espace privé.
import { getMeta, listAll } from "./lib/firestore.js";
import { questionSecrete, METIER_SECRET, TUILE_SECRETE } from "./lib/secret.js";

const [envies, recompenses, comparaisons, vendors, inspirations, reperees, profil, briefs, hebdo] = await Promise.all([
  ...["envies", "recompenses", "comparaisons", "vendors", "inspirations", "envies_reperees"].map(listAll), getMeta("profil"), getMeta("briefs"), getMeta("hebdo")]);
const sec = envies.filter(d => questionSecrete(d.id));
const plein = x => x != null && x !== "" && !(Array.isArray(x) && !x.length);
console.log(`Questions secrètes avec un document commun : ${sec.length}`);
console.log(`  dont réponse commune (v) : ${sec.filter(d => plein(d.v)).length} · texte commun (libre) : ${sec.filter(d => plein(d.libre)).length} · curseur (cu) : ${sec.filter(d => plein(d.cu)).length} · réponses par partenaire (p) : ${sec.filter(d => d.p && Object.keys(d.p).length).length}`);
console.log(`Récompenses de la tuile Tenues dans le commun : ${recompenses.filter(r => String(r.id).startsWith(TUILE_SECRETE + ".")).length}`);
console.log(`Comparaisons Tenues : ${comparaisons.filter(c => c.metier === METIER_SECRET).length} · prestataires Tenues communs : ${vendors.filter(v => v.cat === METIER_SECRET).length} · photos Tenues communes : ${inspirations.filter(i => i.cat === TUILE_SECRETE).length} · envies repérées sur une question secrète : ${reperees.filter(r => questionSecrete(r.q)).length}`);
const mots = /\b(robe|robes|costume|smoking|tailleur|voile|traine|traîne)\b/i;
const champs = o => JSON.stringify(o || {});
console.log(`Mots de tenue dans la synthèse (meta/profil) : ${mots.test(champs(profil)) ? "oui" : "non"} · fil rouge des briefs : ${mots.test(champs(briefs.filRouge)) ? "oui" : "non"} · briefs par catégorie (hors tenues) : ${Object.entries(briefs.categories || {}).filter(([k, v]) => k !== TUILE_SECRETE && mots.test(champs(v))).length} · point de la semaine : ${mots.test(champs(hebdo)) ? "oui" : "non"}`);
process.exit(0);
