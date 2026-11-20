// Fichier généré par scripts/envies-spec.py : ne pas modifier à la main.
// Catalogue « Nos envies » v1.3 : 19 tuiles, questions par niveau, identifiants stables (données, sans texte).
export const FAMILLES = ["coeur", "table", "souvenirs", "ambiance", "vous", "invites", "aide"];
export const NIVEAUX = ["essentiel", "details", "pro"];
export const TUILES = [
 {
  "k": "mariage",
  "famille": "coeur",
  "ordre": 0,
  "remonte": 99,
  "metiers": []
 },
 {
  "k": "lieu",
  "famille": "coeur",
  "ordre": 1,
  "remonte": 24,
  "metiers": [
   "Lieu"
  ]
 },
 {
  "k": "ceremonie",
  "famille": "coeur",
  "ordre": 2,
  "remonte": 12,
  "metiers": []
 },
 {
  "k": "officiant",
  "famille": "coeur",
  "ordre": 3,
  "remonte": 10,
  "metiers": [
   "Officiant"
  ]
 },
 {
  "k": "cocktail",
  "famille": "table",
  "ordre": 4,
  "remonte": 10,
  "metiers": [
   "Traiteur"
  ]
 },
 {
  "k": "repas",
  "famille": "table",
  "ordre": 5,
  "remonte": 10,
  "metiers": [
   "Traiteur"
  ]
 },
 {
  "k": "bar",
  "famille": "table",
  "ordre": 6,
  "remonte": 8,
  "metiers": [
   "Bar"
  ]
 },
 {
  "k": "gateau",
  "famille": "table",
  "ordre": 7,
  "remonte": 6,
  "metiers": [
   "Pâtissier"
  ]
 },
 {
  "k": "photo",
  "famille": "souvenirs",
  "ordre": 8,
  "remonte": 14,
  "metiers": [
   "Photographe"
  ]
 },
 {
  "k": "video",
  "famille": "souvenirs",
  "ordre": 9,
  "remonte": 12,
  "metiers": [
   "Vidéaste"
  ]
 },
 {
  "k": "musique",
  "famille": "ambiance",
  "ordre": 10,
  "remonte": 12,
  "metiers": [
   "Musique"
  ]
 },
 {
  "k": "fleurs",
  "famille": "ambiance",
  "ordre": 11,
  "remonte": 9,
  "metiers": [
   "Fleuriste"
  ]
 },
 {
  "k": "papeterie",
  "famille": "ambiance",
  "ordre": 12,
  "remonte": 8,
  "metiers": [
   "Papeterie"
  ]
 },
 {
  "k": "tenues",
  "famille": "vous",
  "ordre": 13,
  "remonte": 12,
  "metiers": [
   "Tenues",
   "Alliances"
  ]
 },
 {
  "k": "beaute",
  "famille": "vous",
  "ordre": 14,
  "remonte": 6,
  "metiers": [
   "Coiffure & maquillage"
  ]
 },
 {
  "k": "voyage",
  "famille": "vous",
  "ordre": 15,
  "remonte": 9,
  "metiers": [
   "Agence de voyage"
  ]
 },
 {
  "k": "invites",
  "famille": "invites",
  "ordre": 16,
  "remonte": 8,
  "metiers": [
   "Transport",
   "Hébergement",
   "Animation enfants"
  ]
 },
 {
  "k": "lendemain",
  "famille": "invites",
  "ordre": 17,
  "remonte": 6,
  "metiers": [
   "Traiteur"
  ]
 },
 {
  "k": "planner",
  "famille": "aide",
  "ordre": 18,
  "remonte": 20,
  "metiers": [
   "Wedding planner"
  ]
 }
];
export const QUESTIONS = [
 {
  "id": "mariage.style",
  "tuile": "mariage",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "champetre"
   },
   {
    "id": "boheme"
   },
   {
    "id": "elegant-et-chic"
   },
   {
    "id": "chateau-classique"
   },
   {
    "id": "moderne-et-epure"
   },
   {
    "id": "guinguette-festive"
   },
   {
    "id": "intime"
   },
   {
    "id": "grande-fete"
   }
  ],
  "arrivee": 1
 },
 {
  "id": "mariage.paquet",
  "tuile": "mariage",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CL",
  "choix": [
   {
    "id": "lieu"
   },
   {
    "id": "repas"
   },
   {
    "id": "musique"
   },
   {
    "id": "fleurs-et-decor"
   },
   {
    "id": "photo-et-video"
   },
   {
    "id": "effet-de-surprise"
   }
  ],
  "arrivee": 5
 },
 {
  "id": "mariage.recit",
  "tuile": "mariage",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "TL",
  "arrivee": 7
 },
 {
  "id": "mariage.duree",
  "tuile": "mariage",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "une-journee"
   },
   {
    "id": "un-week-end"
   },
   {
    "id": "un-brunch-le-lendemain"
   }
  ],
  "arrivee": 3
 },
 {
  "id": "mariage.pasvoulu",
  "tuile": "mariage",
  "niveau": "details",
  "ordre": 2,
  "format": "TL",
  "arrivee": 6
 },
 {
  "id": "mariage.ambiance",
  "tuile": "mariage",
  "niveau": "details",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "mariage.moments",
  "tuile": "mariage",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA",
  "choix": [
   {
    "id": "discours-de-proches"
   },
   {
    "id": "premiere-danse"
   },
   {
    "id": "surprise-pour-les-invites"
   },
   {
    "id": "feu-d-artifice-ou-spectacle"
   },
   {
    "id": "moment-rien-qu-a-deux"
   }
  ]
 },
 {
  "id": "mariage.traditions",
  "tuile": "mariage",
  "niveau": "pro",
  "ordre": 1,
  "format": "TL"
 },
 {
  "id": "mariage.langues",
  "tuile": "mariage",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "francais"
   },
   {
    "id": "anglais"
   },
   {
    "id": "espagnol"
   },
   {
    "id": "italien"
   },
   {
    "id": "allemand"
   },
   {
    "id": "portugais"
   },
   {
    "id": "neerlandais"
   },
   {
    "id": "arabe"
   },
   {
    "id": "autre"
   }
  ]
 },
 {
  "id": "mariage.parfait",
  "tuile": "mariage",
  "niveau": "pro",
  "ordre": 3,
  "format": "TL"
 },
 {
  "id": "lieu.type",
  "tuile": "lieu",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "chateau"
   },
   {
    "id": "domaine-ou-manoir"
   },
   {
    "id": "ferme-ou-grange"
   },
   {
    "id": "bord-de-mer"
   },
   {
    "id": "lieu-urbain"
   },
   {
    "id": "jardin-prive"
   }
  ],
  "arrivee": 2
 },
 {
  "id": "lieu.distance",
  "tuile": "lieu",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "moins-d-une-heure"
   },
   {
    "id": "1-a-3-heures"
   },
   {
    "id": "destination-lointaine"
   }
  ]
 },
 {
  "id": "lieu.dedans",
  "tuile": "lieu",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "dedans"
   },
   {
    "id": "dehors"
   }
  ]
 },
 {
  "id": "lieu.ensemble",
  "tuile": "lieu",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "oui-tout-sur-place"
   },
   {
    "id": "ceremonie-ailleurs"
   },
   {
    "id": "soiree-ailleurs"
   }
  ]
 },
 {
  "id": "lieu.dormir",
  "tuile": "lieu",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "les-maries"
   },
   {
    "id": "les-proches"
   },
   {
    "id": "tous-les-invites"
   }
  ]
 },
 {
  "id": "lieu.exclusif",
  "tuile": "lieu",
  "niveau": "details",
  "ordre": 3,
  "format": "JPA"
 },
 {
  "id": "lieu.imposes",
  "tuile": "lieu",
  "niveau": "details",
  "ordre": 4,
  "format": "CU"
 },
 {
  "id": "lieu.caractere",
  "tuile": "lieu",
  "niveau": "details",
  "ordre": 5,
  "format": "CU"
 },
 {
  "id": "lieu.heure",
  "tuile": "lieu",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "minuit"
   },
   {
    "id": "2-h"
   },
   {
    "id": "4-h"
   },
   {
    "id": "sans-limite"
   }
  ]
 },
 {
  "id": "lieu.mobilite",
  "tuile": "lieu",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "non"
   }
  ]
 },
 {
  "id": "lieu.tente",
  "tuile": "lieu",
  "niveau": "pro",
  "ordre": 3,
  "format": "JPA"
 },
 {
  "id": "ceremonie.types",
  "tuile": "ceremonie",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "civile-en-mairie"
   },
   {
    "id": "religieuse"
   },
   {
    "id": "laique"
   },
   {
    "id": "pas-encore-decide"
   }
  ]
 },
 {
  "id": "ceremonie.ambiance",
  "tuile": "ceremonie",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CU"
 },
 {
  "id": "ceremonie.duree",
  "tuile": "ceremonie",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "20-min"
   },
   {
    "id": "45-min"
   },
   {
    "id": "une-heure-ou-plus"
   }
  ]
 },
 {
  "id": "ceremonie.officie",
  "tuile": "ceremonie",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "un-officiant-professionnel"
   },
   {
    "id": "un-proche"
   },
   {
    "id": "nous-deux"
   }
  ]
 },
 {
  "id": "ceremonie.vivre",
  "tuile": "ceremonie",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "lectures"
   },
   {
    "id": "discours-de-proches"
   },
   {
    "id": "v-ux-ecrits-par-vous"
   },
   {
    "id": "rituel-symbolique"
   },
   {
    "id": "musique-live"
   },
   {
    "id": "enfants-d-honneur"
   }
  ]
 },
 {
  "id": "ceremonie.entree",
  "tuile": "ceremonie",
  "niveau": "details",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "accompagne-e-d-un-parent"
   },
   {
    "id": "ensemble"
   },
   {
    "id": "chacun-de-son-cote"
   },
   {
    "id": "surprise"
   }
  ]
 },
 {
  "id": "ceremonie.sortie",
  "tuile": "ceremonie",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA",
  "choix": [
   {
    "id": "petales"
   },
   {
    "id": "bulles"
   },
   {
    "id": "haie-d-honneur"
   },
   {
    "id": "musique-entrainante"
   }
  ]
 },
 {
  "id": "ceremonie.places",
  "tuile": "ceremonie",
  "niveau": "pro",
  "ordre": 1,
  "format": "CH"
 },
 {
  "id": "ceremonie.micro",
  "tuile": "ceremonie",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "non"
   },
   {
    "id": "a-voir"
   }
  ]
 },
 {
  "id": "ceremonie.redaction",
  "tuile": "ceremonie",
  "niveau": "pro",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "l-officiant-ecrit"
   },
   {
    "id": "on-co-ecrit"
   },
   {
    "id": "on-ecrit-tout"
   }
  ]
 },
 {
  "id": "officiant.qui",
  "tuile": "officiant",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CC",
  "choix": [
   {
    "id": "un-officiant-professionnel"
   },
   {
    "id": "un-proche-accompagne-par-un-pro"
   }
  ]
 },
 {
  "id": "officiant.ton",
  "tuile": "officiant",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CU"
 },
 {
  "id": "officiant.histoire",
  "tuile": "officiant",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "JPA"
 },
 {
  "id": "officiant.rencontres",
  "tuile": "officiant",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "une"
   },
   {
    "id": "deux-ou-trois"
   },
   {
    "id": "autant-que-necessaire"
   }
  ]
 },
 {
  "id": "officiant.proches",
  "tuile": "officiant",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "lectures"
   },
   {
    "id": "temoignages"
   },
   {
    "id": "chanson"
   },
   {
    "id": "surprise"
   }
  ]
 },
 {
  "id": "officiant.rituel",
  "tuile": "officiant",
  "niveau": "details",
  "ordre": 3,
  "format": "CP",
  "choix": [
   {
    "id": "sable"
   },
   {
    "id": "ruban"
   },
   {
    "id": "arbre-plante"
   },
   {
    "id": "bougie"
   },
   {
    "id": "aucun"
   }
  ]
 },
 {
  "id": "officiant.langues",
  "tuile": "officiant",
  "niveau": "details",
  "ordre": 4,
  "format": "CM",
  "choix": [
   {
    "id": "francais"
   },
   {
    "id": "anglais"
   },
   {
    "id": "espagnol"
   },
   {
    "id": "italien"
   },
   {
    "id": "allemand"
   },
   {
    "id": "portugais"
   },
   {
    "id": "neerlandais"
   },
   {
    "id": "arabe"
   },
   {
    "id": "autre"
   }
  ]
 },
 {
  "id": "officiant.discours",
  "tuile": "officiant",
  "niveau": "pro",
  "ordre": 1,
  "format": "CH"
 },
 {
  "id": "officiant.repetition",
  "tuile": "officiant",
  "niveau": "pro",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "officiant.son",
  "tuile": "officiant",
  "niveau": "pro",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "par-l-officiant"
   },
   {
    "id": "par-le-lieu"
   },
   {
    "id": "par-le-dj"
   }
  ]
 },
 {
  "id": "cocktail.invites",
  "tuile": "cocktail",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "tous-les-invites"
   },
   {
    "id": "un-cercle-plus-large-que-le-diner"
   }
  ]
 },
 {
  "id": "cocktail.duree",
  "tuile": "cocktail",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "une-heure"
   },
   {
    "id": "deux-heures"
   },
   {
    "id": "plus"
   }
  ]
 },
 {
  "id": "cocktail.ambiance",
  "tuile": "cocktail",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "debout-et-anime"
   },
   {
    "id": "coins-salon-poses"
   }
  ]
 },
 {
  "id": "cocktail.quantite",
  "tuile": "cocktail",
  "niveau": "details",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "cocktail.stands",
  "tuile": "cocktail",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "huitres"
   },
   {
    "id": "plancha"
   },
   {
    "id": "fromages"
   },
   {
    "id": "decoupe"
   },
   {
    "id": "bar-a"
   }
  ]
 },
 {
  "id": "cocktail.animations",
  "tuile": "cocktail",
  "niveau": "details",
  "ordre": 3,
  "format": "JPA",
  "choix": [
   {
    "id": "jeux-d-exterieur"
   },
   {
    "id": "photobooth"
   },
   {
    "id": "musique-live"
   },
   {
    "id": "rien-on-discute"
   }
  ]
 },
 {
  "id": "cocktail.signature",
  "tuile": "cocktail",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA"
 },
 {
  "id": "cocktail.photos",
  "tuile": "cocktail",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "non"
   }
  ]
 },
 {
  "id": "cocktail.ombre",
  "tuile": "cocktail",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "non"
   },
   {
    "id": "a-voir"
   }
  ]
 },
 {
  "id": "repas.format",
  "tuile": "repas",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "assis-servi-a-l-assiette"
   },
   {
    "id": "buffet"
   },
   {
    "id": "grandes-tablees"
   },
   {
    "id": "food-trucks"
   },
   {
    "id": "cocktail-dinatoire"
   }
  ],
  "arrivee": 4
 },
 {
  "id": "repas.cuisine",
  "tuile": "repas",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CP",
  "choix": [
   {
    "id": "terroir"
   },
   {
    "id": "gastronomique"
   },
   {
    "id": "du-monde"
   },
   {
    "id": "street-food"
   },
   {
    "id": "vegetale"
   }
  ]
 },
 {
  "id": "repas.plutot",
  "tuile": "repas",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "raffine"
   },
   {
    "id": "genereux"
   }
  ]
 },
 {
  "id": "repas.regimes",
  "tuile": "repas",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "vegetarien"
   },
   {
    "id": "sans-gluten"
   },
   {
    "id": "halal"
   },
   {
    "id": "casher"
   },
   {
    "id": "enfants"
   }
  ]
 },
 {
  "id": "repas.local",
  "tuile": "repas",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "repas.rythme",
  "tuile": "repas",
  "niveau": "details",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "repas.fromages",
  "tuile": "repas",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA",
  "pays": [
   "FR"
  ]
 },
 {
  "id": "repas.plat",
  "tuile": "repas",
  "niveau": "details",
  "ordre": 5,
  "format": "TL"
 },
 {
  "id": "repas.degustation",
  "tuile": "repas",
  "niveau": "pro",
  "ordre": 1,
  "format": "CH"
 },
 {
  "id": "repas.service",
  "tuile": "repas",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "indispensable"
   },
   {
    "id": "peut-se-louer-a-part"
   }
  ]
 },
 {
  "id": "repas.prestataires",
  "tuile": "repas",
  "niveau": "pro",
  "ordre": 3,
  "format": "CH"
 },
 {
  "id": "bar.ambiance",
  "tuile": "bar",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "bar.boissons",
  "tuile": "bar",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "champagne"
   },
   {
    "id": "vin"
   },
   {
    "id": "biere"
   },
   {
    "id": "cocktails"
   },
   {
    "id": "sans-alcool-elabores"
   }
  ]
 },
 {
  "id": "bar.fournisseur",
  "tuile": "bar",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "le-traiteur"
   },
   {
    "id": "nous-memes"
   }
  ]
 },
 {
  "id": "bar.ouvert",
  "tuile": "bar",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "bar.barman",
  "tuile": "bar",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "bar.vins",
  "tuile": "bar",
  "niveau": "details",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "accords-avec-le-repas"
   },
   {
    "id": "on-choisit"
   },
   {
    "id": "conseil-d-un-caviste"
   }
  ]
 },
 {
  "id": "bar.cafe",
  "tuile": "bar",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA"
 },
 {
  "id": "bar.bouchon",
  "tuile": "bar",
  "niveau": "pro",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "bar.reprise",
  "tuile": "bar",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "important"
   },
   {
    "id": "indifferent"
   }
  ]
 },
 {
  "id": "gateau.forme",
  "tuile": "gateau",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "piece-montee",
    "pays": [
     "FR"
    ]
   },
   {
    "id": "wedding-cake"
   },
   {
    "id": "buffet-de-desserts"
   },
   {
    "id": "pas-de-gateau"
   }
  ]
 },
 {
  "id": "gateau.saveurs",
  "tuile": "gateau",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "chocolat"
   },
   {
    "id": "fruits"
   },
   {
    "id": "vanille"
   },
   {
    "id": "caramel"
   },
   {
    "id": "agrumes"
   }
  ]
 },
 {
  "id": "gateau.moment",
  "tuile": "gateau",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "gateau.style",
  "tuile": "gateau",
  "niveau": "details",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "epure"
   },
   {
    "id": "fleuri"
   },
   {
    "id": "rustique"
   },
   {
    "id": "spectaculaire"
   }
  ]
 },
 {
  "id": "gateau.nuit",
  "tuile": "gateau",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "crepes"
   },
   {
    "id": "bar-a-bonbons"
   },
   {
    "id": "sale-de-minuit"
   }
  ]
 },
 {
  "id": "gateau.recette",
  "tuile": "gateau",
  "niveau": "details",
  "ordre": 3,
  "format": "TL"
 },
 {
  "id": "gateau.chaleur",
  "tuile": "gateau",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "ete"
   },
   {
    "id": "exterieur"
   },
   {
    "id": "aucune-contrainte"
   }
  ]
 },
 {
  "id": "gateau.parts",
  "tuile": "gateau",
  "niveau": "pro",
  "ordre": 2,
  "format": "CH"
 },
 {
  "id": "photo.style",
  "tuile": "photo",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CC",
  "choix": [
   {
    "id": "naturel-sur-le-vif"
   },
   {
    "id": "pose-editorial"
   }
  ]
 },
 {
  "id": "photo.lumiere",
  "tuile": "photo",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CC",
  "choix": [
   {
    "id": "lumineux-couleurs-vives"
   },
   {
    "id": "sombre-effet-film"
   }
  ]
 },
 {
  "id": "photo.jusqua",
  "tuile": "photo",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "ceremonie-seule"
   },
   {
    "id": "jusqu-au-repas"
   },
   {
    "id": "jusqu-a-la-premiere-danse"
   },
   {
    "id": "toute-la-soiree"
   }
  ]
 },
 {
  "id": "photo.aise",
  "tuile": "photo",
  "niveau": "details",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "photo.groupes",
  "tuile": "photo",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "famille-proche"
   },
   {
    "id": "tous-les-invites"
   },
   {
    "id": "amis-par-groupe"
   },
   {
    "id": "les-enfants"
   }
  ]
 },
 {
  "id": "photo.seance",
  "tuile": "photo",
  "niveau": "details",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "avant-le-mariage"
   },
   {
    "id": "le-jour-meme"
   },
   {
    "id": "le-lendemain"
   },
   {
    "id": "non"
   }
  ]
 },
 {
  "id": "photo.livrables",
  "tuile": "photo",
  "niveau": "details",
  "ordre": 4,
  "format": "CM",
  "choix": [
   {
    "id": "galerie-en-ligne"
   },
   {
    "id": "album-papier"
   },
   {
    "id": "tirages"
   }
  ]
 },
 {
  "id": "photo.incontournables",
  "tuile": "photo",
  "niveau": "pro",
  "ordre": 1,
  "format": "TL"
 },
 {
  "id": "photo.personnes",
  "tuile": "photo",
  "niveau": "pro",
  "ordre": 2,
  "format": "TL"
 },
 {
  "id": "photo.diffusion",
  "tuile": "photo",
  "niveau": "pro",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "avec-notre-accord"
   },
   {
    "id": "non"
   }
  ]
 },
 {
  "id": "video.envie",
  "tuile": "video",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "video.format",
  "tuile": "video",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "clip-de-3-min"
   },
   {
    "id": "film-de-15-a-20-min"
   },
   {
    "id": "ceremonie-complete"
   },
   {
    "id": "formats-reseaux-sociaux"
   }
  ]
 },
 {
  "id": "video.style",
  "tuile": "video",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "cinema-emotion"
   },
   {
    "id": "documentaire-brut"
   }
  ]
 },
 {
  "id": "video.garder",
  "tuile": "video",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA",
  "choix": [
   {
    "id": "discours-en-entier"
   },
   {
    "id": "messages-des-invites"
   },
   {
    "id": "images-de-drone"
   },
   {
    "id": "son-de-la-ceremonie"
   }
  ]
 },
 {
  "id": "video.musique",
  "tuile": "video",
  "niveau": "details",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "au-choix-du-videaste"
   },
   {
    "id": "on-choisit"
   }
  ]
 },
 {
  "id": "video.delai",
  "tuile": "video",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "un-mois"
   },
   {
    "id": "trois-mois"
   },
   {
    "id": "six-mois"
   }
  ]
 },
 {
  "id": "video.equipe",
  "tuile": "video",
  "niveau": "pro",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "musique.genres",
  "tuile": "musique",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "annees-80-90"
   },
   {
    "id": "electro"
   },
   {
    "id": "rock"
   },
   {
    "id": "chanson-francaise"
   },
   {
    "id": "latino"
   },
   {
    "id": "jazz-et-soul"
   },
   {
    "id": "musiques-du-monde"
   }
  ]
 },
 {
  "id": "musique.qui",
  "tuile": "musique",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CC",
  "choix": [
   {
    "id": "dj"
   },
   {
    "id": "groupe-live"
   }
  ]
 },
 {
  "id": "musique.energie",
  "tuile": "musique",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "musique.live",
  "tuile": "musique",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA",
  "choix": [
   {
    "id": "ceremonie"
   },
   {
    "id": "cocktail"
   },
   {
    "id": "diner"
   }
  ]
 },
 {
  "id": "musique.ouverture",
  "tuile": "musique",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "premiere-danse"
   },
   {
    "id": "danse-choregraphiee"
   },
   {
    "id": "tout-le-monde-d-un-coup"
   }
  ]
 },
 {
  "id": "musique.animateur",
  "tuile": "musique",
  "niveau": "details",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "musique.jeux",
  "tuile": "musique",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA",
  "choix": [
   {
    "id": "jeux-de-soiree"
   },
   {
    "id": "karaoke"
   },
   {
    "id": "aucun"
   }
  ]
 },
 {
  "id": "musique.incontournables",
  "tuile": "musique",
  "niveau": "pro",
  "ordre": 1,
  "format": "TL"
 },
 {
  "id": "musique.interdits",
  "tuile": "musique",
  "niveau": "pro",
  "ordre": 2,
  "format": "TL"
 },
 {
  "id": "musique.son",
  "tuile": "musique",
  "niveau": "pro",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "indispensable"
   },
   {
    "id": "le-lieu-les-fournit"
   }
  ]
 },
 {
  "id": "fleurs.couleurs",
  "tuile": "fleurs",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "blanc-et-vert-sauge"
   },
   {
    "id": "terracotta-et-sable"
   },
   {
    "id": "bleu-nuit-et-or"
   },
   {
    "id": "rose-poudre"
   },
   {
    "id": "pastels"
   },
   {
    "id": "couleurs-vives"
   },
   {
    "id": "noir-et-blanc"
   }
  ]
 },
 {
  "id": "fleurs.style",
  "tuile": "fleurs",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CP",
  "choix": [
   {
    "id": "champetre"
   },
   {
    "id": "romantique"
   },
   {
    "id": "epure"
   },
   {
    "id": "exotique"
   },
   {
    "id": "fleurs-sechees"
   }
  ]
 },
 {
  "id": "fleurs.dosage",
  "tuile": "fleurs",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "fleurs.fleurir",
  "tuile": "fleurs",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA",
  "choix": [
   {
    "id": "bouquet"
   },
   {
    "id": "boutonnieres"
   },
   {
    "id": "arche-de-ceremonie"
   },
   {
    "id": "centres-de-table"
   },
   {
    "id": "voiture"
   }
  ]
 },
 {
  "id": "fleurs.centres",
  "tuile": "fleurs",
  "niveau": "details",
  "ordre": 2,
  "format": "CC",
  "choix": [
   {
    "id": "bas-on-se-voit"
   },
   {
    "id": "hauts-spectaculaires"
   }
  ]
 },
 {
  "id": "fleurs.lumieres",
  "tuile": "fleurs",
  "niveau": "details",
  "ordre": 3,
  "format": "JPA",
  "choix": [
   {
    "id": "guirlandes"
   },
   {
    "id": "bougies"
   },
   {
    "id": "lustres"
   },
   {
    "id": "neon"
   }
  ]
 },
 {
  "id": "fleurs.diy",
  "tuile": "fleurs",
  "niveau": "details",
  "ordre": 4,
  "format": "CU"
 },
 {
  "id": "fleurs.saison",
  "tuile": "fleurs",
  "niveau": "pro",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "fleurs.reutiliser",
  "tuile": "fleurs",
  "niveau": "pro",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "fleurs.montage",
  "tuile": "fleurs",
  "niveau": "pro",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "par-le-prestataire"
   },
   {
    "id": "par-nous-et-nos-proches"
   }
  ]
 },
 {
  "id": "papeterie.style",
  "tuile": "papeterie",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "classique"
   },
   {
    "id": "illustre"
   },
   {
    "id": "minimaliste"
   },
   {
    "id": "botanique"
   },
   {
    "id": "fantaisie"
   }
  ]
 },
 {
  "id": "papeterie.support",
  "tuile": "papeterie",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CC",
  "choix": [
   {
    "id": "papier"
   },
   {
    "id": "numerique"
   }
  ]
 },
 {
  "id": "papeterie.pieces",
  "tuile": "papeterie",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "reservez-la-date"
   },
   {
    "id": "faire-part"
   },
   {
    "id": "livret-de-ceremonie"
   },
   {
    "id": "menus"
   },
   {
    "id": "plan-de-table"
   },
   {
    "id": "marque-places"
   }
  ]
 },
 {
  "id": "papeterie.site",
  "tuile": "papeterie",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "papeterie.finitions",
  "tuile": "papeterie",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "dorure"
   },
   {
    "id": "papier-recycle"
   },
   {
    "id": "cachet-de-cire"
   },
   {
    "id": "illustration-du-lieu"
   }
  ]
 },
 {
  "id": "papeterie.quantite",
  "tuile": "papeterie",
  "niveau": "pro",
  "ordre": 1,
  "format": "CH"
 },
 {
  "id": "papeterie.langues",
  "tuile": "papeterie",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "francais"
   },
   {
    "id": "anglais"
   },
   {
    "id": "espagnol"
   },
   {
    "id": "italien"
   },
   {
    "id": "allemand"
   },
   {
    "id": "portugais"
   },
   {
    "id": "neerlandais"
   },
   {
    "id": "arabe"
   },
   {
    "id": "autre"
   }
  ]
 },
 {
  "id": "tenues.style",
  "tuile": "tenues",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "classique"
   },
   {
    "id": "boheme"
   },
   {
    "id": "moderne"
   },
   {
    "id": "retro"
   },
   {
    "id": "decale"
   }
  ],
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "tenues.ou",
  "tuile": "tenues",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "sur-mesure"
   },
   {
    "id": "createur"
   },
   {
    "id": "boutique"
   },
   {
    "id": "seconde-main"
   },
   {
    "id": "location"
   }
  ],
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "tenues.nombre",
  "tuile": "tenues",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "une"
   },
   {
    "id": "une-pour-la-soiree-en-plus"
   }
  ],
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "tenues.confort",
  "tuile": "tenues",
  "niveau": "details",
  "ordre": 1,
  "format": "CU",
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "tenues.temoins",
  "tuile": "tenues",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "assorties"
   },
   {
    "id": "theme-de-couleur"
   },
   {
    "id": "libres"
   }
  ]
 },
 {
  "id": "tenues.code",
  "tuile": "tenues",
  "niveau": "details",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "aucun"
   },
   {
    "id": "couleur"
   },
   {
    "id": "theme"
   },
   {
    "id": "chic-exige"
   }
  ]
 },
 {
  "id": "tenues.alliances",
  "tuile": "tenues",
  "niveau": "details",
  "ordre": 4,
  "format": "CP",
  "choix": [
   {
    "id": "classiques"
   },
   {
    "id": "gravees"
   },
   {
    "id": "assorties"
   },
   {
    "id": "differentes"
   }
  ]
 },
 {
  "id": "tenues.retouches",
  "tuile": "tenues",
  "niveau": "pro",
  "ordre": 1,
  "format": "CH",
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "tenues.essayages",
  "tuile": "tenues",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "personne"
   },
   {
    "id": "un-parent"
   },
   {
    "id": "des-amis"
   },
   {
    "id": "un-temoin"
   }
  ],
  "parPartenaire": true,
  "secret": true
 },
 {
  "id": "beaute.rendu",
  "tuile": "beaute",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "beaute.qui",
  "tuile": "beaute",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "les-maries"
   },
   {
    "id": "les-temoins"
   },
   {
    "id": "les-meres"
   },
   {
    "id": "d-autres-proches"
   }
  ]
 },
 {
  "id": "beaute.ou",
  "tuile": "beaute",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "sur-le-lieu"
   },
   {
    "id": "a-la-maison"
   },
   {
    "id": "a-l-hotel"
   },
   {
    "id": "en-salon"
   }
  ]
 },
 {
  "id": "beaute.coiffure",
  "tuile": "beaute",
  "niveau": "details",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "attachee"
   },
   {
    "id": "lachee"
   },
   {
    "id": "courte-coiffee"
   },
   {
    "id": "accessoires"
   }
  ]
 },
 {
  "id": "beaute.essai",
  "tuile": "beaute",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "beaute.retouches",
  "tuile": "beaute",
  "niveau": "details",
  "ordre": 3,
  "format": "JPA"
 },
 {
  "id": "beaute.ambiance",
  "tuile": "beaute",
  "niveau": "pro",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "beaute.fin",
  "tuile": "beaute",
  "niveau": "pro",
  "ordre": 2,
  "format": "CH"
 },
 {
  "id": "voyage.type",
  "tuile": "voyage",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CP",
  "choix": [
   {
    "id": "plage"
   },
   {
    "id": "nature-et-aventure"
   },
   {
    "id": "villes"
   },
   {
    "id": "road-trip"
   },
   {
    "id": "croisiere"
   },
   {
    "id": "pas-tout-de-suite"
   }
  ]
 },
 {
  "id": "voyage.quand",
  "tuile": "voyage",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "juste-apres"
   },
   {
    "id": "quelques-mois-apres"
   },
   {
    "id": "un-an-apres"
   }
  ]
 },
 {
  "id": "voyage.duree",
  "tuile": "voyage",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "une-semaine"
   },
   {
    "id": "deux-semaines"
   },
   {
    "id": "trois-ou-plus"
   }
  ]
 },
 {
  "id": "voyage.rythme",
  "tuile": "voyage",
  "niveau": "details",
  "ordre": 1,
  "format": "CU"
 },
 {
  "id": "voyage.dormir",
  "tuile": "voyage",
  "niveau": "details",
  "ordre": 2,
  "format": "CP",
  "choix": [
   {
    "id": "hotel-de-charme"
   },
   {
    "id": "villa"
   },
   {
    "id": "lodge"
   },
   {
    "id": "au-fil-de-la-route"
   }
  ]
 },
 {
  "id": "voyage.distance",
  "tuile": "voyage",
  "niveau": "details",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "europe"
   },
   {
    "id": "long-courrier"
   },
   {
    "id": "peu-importe"
   }
  ]
 },
 {
  "id": "voyage.liste",
  "tuile": "voyage",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA"
 },
 {
  "id": "voyage.papiers",
  "tuile": "voyage",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "passeports-a-renouveler"
   },
   {
    "id": "visa"
   },
   {
    "id": "vaccins-conseilles"
   }
  ]
 },
 {
  "id": "voyage.assurance",
  "tuile": "voyage",
  "niveau": "pro",
  "ordre": 2,
  "format": "JPA"
 },
 {
  "id": "voyage.agence",
  "tuile": "voyage",
  "niveau": "pro",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "une-agence-s-occupe-de-tout"
   },
   {
    "id": "on-organise-nous-memes"
   }
  ]
 },
 {
  "id": "invites.enfants",
  "tuile": "invites",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "tous-invites"
   },
   {
    "id": "ceux-de-la-famille"
   },
   {
    "id": "aucun"
   }
  ]
 },
 {
  "id": "invites.logement",
  "tuile": "invites",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "on-s-en-occupe"
   },
   {
    "id": "on-propose-des-adresses"
   },
   {
    "id": "chacun-gere"
   }
  ]
 },
 {
  "id": "invites.transport",
  "tuile": "invites",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CM",
  "choix": [
   {
    "id": "navettes"
   },
   {
    "id": "covoiturage-organise"
   },
   {
    "id": "chacun-gere"
   }
  ]
 },
 {
  "id": "invites.garde",
  "tuile": "invites",
  "niveau": "details",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "invites.retour",
  "tuile": "invites",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "navettes"
   },
   {
    "id": "taxis-reserves"
   },
   {
    "id": "dormir-sur-place"
   }
  ]
 },
 {
  "id": "invites.table",
  "tuile": "invites",
  "niveau": "details",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "invites.cadeau",
  "tuile": "invites",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA"
 },
 {
  "id": "invites.voiture",
  "tuile": "invites",
  "niveau": "details",
  "ordre": 5,
  "format": "JPA",
  "choix": [
   {
    "id": "voiture-de-collection"
   },
   {
    "id": "decapotable"
   },
   {
    "id": "caleche"
   },
   {
    "id": "voiture-d-un-proche"
   }
  ]
 },
 {
  "id": "invites.liste",
  "tuile": "invites",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "liste"
   },
   {
    "id": "cagnotte"
   },
   {
    "id": "voyage"
   },
   {
    "id": "rien"
   }
  ]
 },
 {
  "id": "invites.loin",
  "tuile": "invites",
  "niveau": "pro",
  "ordre": 2,
  "format": "TL"
 },
 {
  "id": "lendemain.format",
  "tuile": "lendemain",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "brunch"
   },
   {
    "id": "barbecue"
   },
   {
    "id": "pique-nique"
   },
   {
    "id": "rien"
   }
  ]
 },
 {
  "id": "lendemain.qui",
  "tuile": "lendemain",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "tous-les-invites"
   },
   {
    "id": "ceux-qui-dorment-sur-place"
   },
   {
    "id": "les-proches"
   }
  ]
 },
 {
  "id": "lendemain.ambiance",
  "tuile": "lendemain",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "lendemain.lieu",
  "tuile": "lendemain",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "oui"
   },
   {
    "id": "ailleurs"
   }
  ]
 },
 {
  "id": "lendemain.activites",
  "tuile": "lendemain",
  "niveau": "details",
  "ordre": 2,
  "format": "JPA",
  "choix": [
   {
    "id": "baignade"
   },
   {
    "id": "jeux"
   },
   {
    "id": "balade"
   },
   {
    "id": "rien"
   }
  ]
 },
 {
  "id": "lendemain.traiteur",
  "tuile": "lendemain",
  "niveau": "pro",
  "ordre": 1,
  "format": "JPA"
 },
 {
  "id": "lendemain.rangement",
  "tuile": "lendemain",
  "niveau": "pro",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "par-le-lieu"
   },
   {
    "id": "par-nous"
   }
  ]
 },
 {
  "id": "planner.accompagnement",
  "tuile": "planner",
  "niveau": "essentiel",
  "ordre": 1,
  "format": "JPA",
  "choix": [
   {
    "id": "organisation-complete"
   },
   {
    "id": "coordination-du-jour-j"
   },
   {
    "id": "conseils-ponctuels"
   }
  ]
 },
 {
  "id": "planner.poids",
  "tuile": "planner",
  "niveau": "essentiel",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "trouver-les-prestataires"
   },
   {
    "id": "tenir-le-budget"
   },
   {
    "id": "la-logistique"
   },
   {
    "id": "le-jour-j"
   },
   {
    "id": "les-familles"
   }
  ]
 },
 {
  "id": "planner.role",
  "tuile": "planner",
  "niveau": "essentiel",
  "ordre": 3,
  "format": "CU"
 },
 {
  "id": "planner.presence",
  "tuile": "planner",
  "niveau": "details",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "toute-la-journee"
   },
   {
    "id": "jusqu-au-diner"
   },
   {
    "id": "pas-necessaire"
   }
  ]
 },
 {
  "id": "planner.etapes",
  "tuile": "planner",
  "niveau": "details",
  "ordre": 2,
  "format": "CM",
  "choix": [
   {
    "id": "chaque-semaine"
   },
   {
    "id": "chaque-mois"
   },
   {
    "id": "a-la-demande"
   }
  ]
 },
 {
  "id": "planner.contact",
  "tuile": "planner",
  "niveau": "details",
  "ordre": 3,
  "format": "CC",
  "choix": [
   {
    "id": "il-gere-tout"
   },
   {
    "id": "on-garde-la-main"
   }
  ]
 },
 {
  "id": "planner.inviter",
  "tuile": "planner",
  "niveau": "details",
  "ordre": 4,
  "format": "JPA"
 },
 {
  "id": "planner.remuneration",
  "tuile": "planner",
  "niveau": "pro",
  "ordre": 1,
  "format": "CM",
  "choix": [
   {
    "id": "forfait"
   },
   {
    "id": "pourcentage-du-budget"
   },
   {
    "id": "a-comprendre"
   }
  ]
 },
 {
  "id": "planner.reseau",
  "tuile": "planner",
  "niveau": "pro",
  "ordre": 2,
  "format": "CU"
 },
 {
  "id": "planner.equipe",
  "tuile": "planner",
  "niveau": "pro",
  "ordre": 3,
  "format": "CH"
 }
];
