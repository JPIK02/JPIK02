// Prénoms du couple, saisis dans l'app (meta/settings.prenom1 et prenom2) : jamais écrits dans le code.
// Les consignes des agents utilisent les marqueurs {{P1}}, {{P2}} et {{COUPLE}}, remplacés ici.
export function coupleNames(settings = {}) {
  const p1 = String(settings.prenom1 || "").trim() || "le premier partenaire";
  const p2 = String(settings.prenom2 || "").trim() || "le second partenaire";
  return { p1, p2, couple: `${p1} et ${p2}` };
}
/** Rappel ajouté aux consignes : les champs internes « claire » / « julien » désignent les deux partenaires. */
export const FIELDS_NOTE = "Dans les données, le champ « claire » contient l'avis ou la part de {{P1}} et le champ « julien » celle de {{P2}} (ce sont des noms techniques).";
export function fillCouple(text, settings) {
  const { p1, p2, couple } = coupleNames(settings);
  return String(text).replaceAll("{{COUPLE}}", couple).replaceAll("{{P1}}", p1).replaceAll("{{P2}}", p2);
}
