// « Nos envies » en texte lisible pour Claude (synthèse, notes de fit, briefs, point de la semaine).
// Seules les questions répondues sont envoyées ; les réponses par partenaire sont étiquetées avec le prénom.
// Lot 4 (tenue secrète) : filtrer ici les questions `secret` avant tout envoi hors conversation avec leur auteur.
import { TUILES, QUESTIONS } from "./catalogue.js";
import { FR } from "./fr.js";
import { answerText, hasValue, tileGris } from "./logic.js";

const ARCHIVEES = ["vision--invites", "vision--periode", "vision--craintes", "traiteur--budgetpp", "tenues--budget", "alliances--artisan"];

/** @param envies documents de la collection `envies` ; brief : ancienne collection (réponses archivées) ; noms : {p1, p2} */
export function enviesForAI(envies = [], brief = [], noms = {}) {
  const A = Object.fromEntries(envies.map(d => [d.id, d]));
  const tuiles = TUILES.map(t => {
    const m = A["_tuile." + t.k] || {}, gris = tileGris(t.k, A);
    const reponses = [];
    for (const q of QUESTIONS.filter(x => x.tuile === t.k)) {
      const d = A[q.id]; if (!d) continue;
      const libelle = FR.questions[q.id].libelle;
      if (q.parPartenaire) {
        // question secrète (tenue) : seules les réponses de chacun (p) comptent, jamais un texte commun
        if (!q.secret && hasValue({ libre: d.libre })) reponses.push({ question: libelle, reponse: d.libre });
        for (const [k, nom] of [["claire", noms.p1], ["julien", noms.p2]]) { const a = (d.p || {})[k]; if (hasValue(a)) reponses.push({ question: `${libelle} (${nom || k})`, reponse: answerText(q, a, FR) }); }
      } else if (hasValue(d)) reponses.push({ question: libelle, niveau: q.niveau, reponse: answerText(q, d, FR) });
    }
    const prio = Object.fromEntries(["importance", "budget", "reussite", "redhibitoire"].filter(f => m[f] != null && m[f] !== "").map(f => [f, m[f]]));
    return reponses.length || Object.keys(prio).length || gris.gris ? { tuile: t.k, nom: FR.tuiles[t.k].nom, ...(gris.gris ? { pasPourNous: true } : {}), ...(Object.keys(prio).length ? { priorites: prio } : {}), reponses } : null;
  }).filter(Boolean);
  const archivees = brief.filter(b => ARCHIVEES.includes(b.id)).map(b => ({ question: b.question || b.id, reponse: [Array.isArray(b.choix) ? b.choix.join(", ") : "", b.commun, b.claire, b.julien].filter(x => x && String(x).trim()).join(" · ") })).filter(x => x.reponse);
  return { tuiles, ...(archivees.length ? { reponsesArchivees: archivees } : {}) };
}
/** Date de la dernière réponse (pour savoir si la synthèse ou les briefs sont à refaire). */
export const lastEnviesAt = (envies = []) => envies.reduce((m, d) => Math.max(m, +d.updatedAt || 0), 0);
