// Rangement des inspirations venues de l'ancienne catégorie « traiteur » (docs/nos-envies-v1-1.md, section 2), sans Firebase.
export const DESSERT = /g[âa]teau|dessert|pi[èe]ce mont[ée]e|wedding cake|cupcake|macaron|p[âa]tisserie|croquembouche|layer cake|naked cake/i;
/** Nouvelle catégorie d'une inspiration venue de « traiteur » (« gateau » si elle montre un dessert), ou null si rien à changer. */
export const rangement = i => ((i.ancienneCat === "traiteur" || i.cat === "traiteur") && !i.rangeeLe && DESSERT.test(i.description || "") ? "gateau" : null);
