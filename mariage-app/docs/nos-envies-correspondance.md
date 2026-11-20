# Lamaelle — « Nos envies » : correspondance ancien → nouveau questionnaire

Version du 20 novembre 2026, lot 1 de `nos-envies-v1.md` (section 7). **À valider par Julien avant toute migration.**

Source : diagnostic en lecture seule (`diag.yml`, cible « envies ») du 20 novembre 2026. Ce document ne contient aucune réponse du couple : seulement si la question est répondue, et les règles de reprise.

État actuel : **57 questions répondues sur 85**, toutes en version commune (aucune réponse séparée par partenaire). 8 catégories ont des priorités (importance, budget cible…). 3 inspirations (tenues, fleurs, traiteur).

## Règles de reprise

- **Choix qui correspondent** : repris tels quels dans la nouvelle question (colonne « Choix »).
- **Choix sans équivalent, et tout texte libre** : repris dans le texte libre de la nouvelle question, précédé de « Réponse précédente : ».
- **Question archivée** : la réponse reste lisible dans la synthèse et continue d'alimenter le coach. Rien n'est supprimé.
- Les anciennes réponses restent intactes dans la collection `brief` (archive). Les nouvelles vont dans `envies`. Une sauvegarde complète est faite avant la migration.
- Une question reprise compte comme répondue dans la jauge et dans l'état des tuiles.
- Les priorités par catégorie (importance, budget cible, critère de réussite, rédhibitoire) passent à la tuile correspondante.
- Les inspirations sont rangées dans la tuile correspondante : `tenues` → Tenues et alliances, `fleurs` → Fleurs et déco, `traiteur` → Repas, `vision` → Votre mariage.

Identifiants des nouvelles questions : `tuile.question` (ils seront ceux du catalogue `src/envies/catalogue.js`).

## Tableau

| Ancienne question | État | Nouvelle question (tuile · niveau) | Choix |
|---|---|---|---|
| **Votre mariage** | | | |
| ambiance (3 mots) | répondue | `mariage.ambiance` · Votre mariage · Détails | texte libre |
| style | répondue | `mariage.style` · Votre mariage · Essentiel | les 8 choix sont identiques |
| invites (combien) | répondue | **à archiver** (le nombre d'invités vit dans Réglages) | — |
| format | répondue | `mariage.duree` · Détails, et `ceremonie.types` · Essentiel | « Une journée » → « Une journée » ; « Week-end complet » → « Un week-end » ; « Brunch du lendemain » → « Un brunch le lendemain » ; « Cérémonie laïque / religieuse » → `ceremonie.types` « Laïque / Religieuse » ; « Mariage civil seul » → `ceremonie.types` « Civile » ; texte → texte libre de `mariage.duree` |
| periode (saison, dates à éviter) | répondue | **à archiver** (la date vit dans Réglages) | — |
| moments (trois moments) | répondue | `mariage.moments` · Détails | texte libre |
| craintes | vide | **à archiver** | — |
| souvenirs (adoré / à ne pas reproduire) | répondue | `mariage.pasvoulu` · Détails | texte libre |
| juliette (sa place dans la journée) | répondue | `invites.enfants` · Enfants, logement, transport · Essentiel | texte libre |
| recit (ce que les invités racontent) | répondue | `mariage.recit` · Essentiel | texte libre (même question) |
| arbitrage (mettre le paquet) | répondue | `mariage.paquet` · Essentiel | texte libre |
| **Lieu** | | | |
| region | répondue | `lieu.distance` · Essentiel | texte libre |
| type | répondue | `lieu.type` · Essentiel | choix identiques ; texte → texte libre |
| exclu (privatisation) | répondue | `lieu.exclusif` · Détails | « Indispensable » → Absolument ; « Souhaitable » et « Indifférent » → Pourquoi pas |
| dodo | répondue | `lieu.dormir` · Détails | texte libre |
| traiteur (liberté de choix) | répondue | `lieu.imposes` · Détails (curseur) | « Indispensable » → cran 5 « Liberté totale » ; « Préférable » → cran 4 ; « Peu importe » → cran 1 « Ça nous va » |
| pluie | vide | `lieu.tente` · Pro | — |
| horaires | répondue | `lieu.heure` · Pro | texte libre |
| acces | répondue | `lieu.mobilite` · Pro | texte libre |
| **Traiteur** | | | |
| format | répondue | `repas.format` · Repas · Essentiel | choix identiques (« Grandes tablées à partager » → « Grandes tablées ») |
| cuisine | répondue | `repas.cuisine` · Essentiel | texte libre |
| cocktail (vin d'honneur) | vide | `cocktail.duree` · Cocktail · Essentiel | — |
| regimes | répondue | `repas.regimes` · Détails | texte libre |
| boissons | répondue | `bar.fournisseur` · Bar et boissons · Essentiel | « Fournis par nous » → « Nous-mêmes » ; « Fournis par le traiteur » → « Le traiteur » ; « À voir selon le prix » → texte libre |
| dessert | répondue | `gateau.forme` · Gâteau et desserts · Essentiel | « Pièce montée », « Wedding cake », « Buffet de desserts » identiques ; « Dessert à l'assiette » → texte libre ; texte → texte libre |
| brunch (le lendemain) | répondue | `lendemain.format` · Le lendemain · Essentiel | « Oui » → « Brunch » ; « Non » → « Rien » ; « Peut-être » → texte libre |
| budgetpp | vide | **à archiver** | — |
| **Photographe** | | | |
| style | répondue | `photo.style` · Photo · Essentiel (ceci ou cela) | « Reportage naturel » → « Naturel, sur le vif » ; « Posé et classique », « Artistique, éditorial » → « Posé, éditorial » ; les autres → texte libre |
| couverture | vide | `photo.jusqua` · Essentiel | — |
| couple (séance) | répondue | `photo.seance` · Détails | « Avant le jour J » → « Avant le mariage » ; « Pendant le jour J » → « Le jour même » ; « Le lendemain » → « Le lendemain » ; « Pas de séance » → « Non » |
| groupes | vide | `photo.groupes` · Détails | — |
| aise (devant l'objectif) | répondue | `photo.aise` · Détails (curseur) | « Très à l'aise » → cran 5 ; « Moyennement » → cran 3 ; « Pas du tout » → cran 1 ; texte → texte libre |
| livrables | vide | `photo.livrables` · Détails | — |
| refs (photographes aimés) | répondue | `photo.style` · Essentiel | texte libre |
| **Vidéaste** | | | |
| envie | répondue | `video.envie` · Vidéo · Essentiel | « Indispensable » → Absolument ; « Si le budget le permet » → Pourquoi pas ; « Non » → Jamais (grise la tuile) |
| format | répondue | `video.format` · Essentiel, et `video.garder` · Détails | « Film court » → « Clip de 3 min » ; « Film long » → « Film de 15 à 20 min » ; « Discours en intégralité » → `video.garder` « Discours en entier » : Absolument ; « Images de drone » → `video.garder` « Images de drone » : Absolument ; « Teaser réseaux sociaux » → « Formats réseaux sociaux » |
| style | vide | `video.style` · Essentiel | — |
| discretion | répondue | `video.style` · Essentiel | texte libre |
| **Musique** | | | |
| formule | répondue | `musique.qui` · Musique et soirée · Essentiel, et `musique.live` · Détails | « DJ » / « Groupe live » → mêmes choix ; « Musiciens pour la cérémonie » → `musique.live` « Cérémonie » : Absolument ; « Musique au cocktail » → `musique.live` « Cocktail » : Absolument ; « Playlist maison » → texte libre |
| styles | vide | `musique.genres` · Essentiel | — |
| ouverture | vide | `musique.ouverture` · Détails | — |
| animation | répondue | `musique.animateur` · Détails (curseur) | « Discrète » → cran 1 « Invisible » ; « Entre les deux » → cran 3 ; « Ambianceur » → cran 5 |
| moments | vide | `musique.ouverture` · Détails | — |
| fin (heure) | répondue | `lieu.heure` · Lieu · Pro | texte libre |
| **Fleurs et déco** | | | |
| palette | répondue | `fleurs.couleurs` · Essentiel | texte libre |
| aimees | vide | `fleurs.style` · Essentiel | — |
| style | vide | `fleurs.style` · Essentiel | « Fleurs des champs » → « Champêtre » ; « Épuré », « Fleurs séchées » identiques ; « Luxuriant » → « Romantique » ; « Feuillages » → texte libre |
| quoi (que fleurir) | répondue | `fleurs.fleurir` · Détails (Jamais · Pourquoi pas · Absolument) | chaque choix coché → Absolument : « Bouquet », « Boutonnières », « Arche de cérémonie », « Centres de table », « Voiture » ; « Coiffure », « Espace cocktail » et texte → texte libre |
| deco (lumières, bougies…) | répondue | `fleurs.lumieres` · Détails | texte libre |
| diy | répondue | `fleurs.diy` · Détails (curseur) | « Non, tout déléguer » → cran 1 ; « Un peu » → cran 3 ; « Oui, avec plaisir » → cran 5 |
| **Tenues** (tuile « Tenues et alliances ») | | | |
| claire (tenue de partenaire 1) | répondue | `tenues.style` · Essentiel (par partenaire) | texte libre, **en version commune** (le modèle actuel ne sait pas qui a répondu) ; au lot 4, chacun pourra le reprendre en secret |
| julien (tenue de partenaire 2) | répondue | `tenues.style` · Essentiel (par partenaire) | idem |
| soiree (deuxième tenue) | répondue | `tenues.nombre` · Essentiel | « Oui » → « Une pour la soirée en plus » ; « Non » → « Une » ; « Peut-être » → texte libre |
| accessoires | répondue | `tenues.style` · Essentiel | texte libre (commun) |
| cortege | répondue | `tenues.temoins` · Détails | texte libre |
| budget | vide | **à archiver** (le budget vit dans Budget) | — |
| **Alliances** (même tuile) | | | |
| metal | répondue | `tenues.alliances` · Détails | texte libre (pas de question sur le métal) |
| assorties | répondue | `tenues.alliances` · Détails | « Assorties » → « Assorties » ; « Chacun son style » → « Différentes » ; « Un détail commun » → texte libre ; texte → texte libre |
| artisan | vide | **à archiver** | — |
| gravure | répondue | `tenues.alliances` · Détails | texte libre |
| **Coiffure et maquillage** (tuile « Beauté et préparatifs ») | | | |
| pour (pour qui) | répondue | `beaute.qui` · Essentiel | partenaire → « Les mariés » ; « Témoins » → « Les témoins » ; « Mamans » → « Les mères » ; l'enfant → « D'autres proches » |
| style | répondue | `beaute.rendu` · Essentiel | texte libre |
| domicile | répondue | `beaute.ou` · Essentiel | « Oui » → texte libre « sur place indispensable » ; « Non » → rien |
| retouches | répondue | `beaute.retouches` · Détails | « Oui » → Absolument ; « Non » → Jamais ; « Pour la soirée seulement » → Pourquoi pas + texte libre |
| **Papeterie** (aucune réponse) | | | |
| supports | vide | `papeterie.pieces` · Essentiel | — |
| papier | vide | `papeterie.support` · Essentiel | — |
| identite | vide | `papeterie.style` · Essentiel | — |
| reponses | vide | `papeterie.site` · Détails | — |
| **Transport** | | | |
| voiture (des mariés) | répondue | **à archiver** (pas de question sur la voiture des mariés) | — |
| navettes | vide | `invites.transport` · Essentiel | — |
| trajets | vide | `lieu.ensemble` · Détails | — |
| **Cérémonie** | | | |
| type | répondue | `ceremonie.types` · Essentiel | « Civile seule » → « Civile » ; « Laïque », « Religieuse » identiques |
| officiant | répondue | `ceremonie.officie` · Détails | « Un officiant professionnel » / « Un proche » → mêmes choix ; « Pas de cérémonie laïque » → rien (la tuile Officiant reste grisée faute de cérémonie laïque) |
| message | vide | `ceremonie.vivre` · Détails | — |
| intervenants | vide | `ceremonie.vivre` · Détails | — |
| duree | vide | `ceremonie.duree` · Essentiel | « 20 min », « 45 min » identiques ; « 30 min » → texte libre |
| roles | vide | `ceremonie.vivre` · Détails | — |
| **Hébergement** | | | |
| combien | répondue | `invites.logement` · Essentiel | texte libre |
| qui (paie) | vide | `invites.logement` · Essentiel | — |
| priorite | répondue | `invites.logement` · Essentiel | texte libre |
| noces (nuit de noces) | répondue | `lieu.dormir` · Lieu · Détails | texte libre |
| **Enfants** | | | |
| nombre | répondue | `invites.enfants` · Essentiel | texte libre |
| formule | vide | `invites.garde` · Détails | — |
| horaire | vide | `invites.garde` · Détails | — |
| juliette (qui s'en occupe) | répondue | `invites.garde` · Détails | texte libre |

## Ce que cela donne après migration

- **Tuiles alimentées** : Votre mariage, Lieu, Cérémonie, Repas, Bar et boissons, Gâteau et desserts, Photo, Vidéo, Musique et soirée, Fleurs et déco, Tenues et alliances, Beauté et préparatifs, Enfants, logement, transport, Le lendemain.
- **Tuiles neuves, sans réponse reprise** : Officiant (grisée tant qu'il n'y a pas de cérémonie laïque), Cocktail, Papeterie, Voyage de noces, Wedding planner.
- **Le lendemain** ne remonte que si « Un week-end » ou « Un brunch » est choisi dans `mariage.duree`.
- **Archivées** : 7 questions (invites, periode, craintes, budgetpp, budget tenues, artisan, voiture), dont 3 répondues, toujours lisibles dans la synthèse et connues du coach.
- Plusieurs anciennes réponses arrivent sur une même nouvelle question (par exemple `invites.logement`) : les textes sont mis bout à bout, chacun précédé de « Réponse précédente : ».

## Points à confirmer

1. La place de l'enfant dans la journée (`vision.juliette`) va dans `invites.enfants`, et qui s'en occupe (`enfants.juliette`) dans `invites.garde`. Autre choix possible : la Cérémonie (`ceremonie.vivre`).
2. Les deux textes de tenue (partenaire 1 et partenaire 2) restent communs jusqu'au lot 4, comme le prévoit le dossier.
3. La voiture des mariés n'a pas de question dans le nouvel inventaire : archivée. Elle peut devenir une option « Voiture des mariés » dans `invites.transport` si vous le souhaitez.
