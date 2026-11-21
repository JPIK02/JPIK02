# Lamaelle — « Nos envies » v1.1 : correctif

Version du 21 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`.

Les lots 1 à 3 de `docs/nos-envies-v1.md` sont en place. Ce correctif fait suite à la revue des captures de Julien du 21 novembre. **Le comportement ne change pas**, sauf l'état « En cours » (section 3). Les autres règles de `docs/nos-envies-v1.md` restent valables.

Identité inchangée : variables de rôle de `styles.css`, Jost et Cormorant, clair et sombre. Aucune couleur en dur.

## 1. Un seul en-tête : l'action visible dès l'ouverture

Ce qu'on constate : deux blocs bleus se suivent, le bandeau de l'app (logo, « Claire & Julien », « 917 jours », photo) puis la carte « Nos envies ». La carte « À explorer maintenant » commence en bas du premier écran : son bouton n'est pas visible et le bouton flottant du coach recouvre son texte.

- **Sur l'onglet Nos envies seulement**, remplacer le bandeau et la carte par **un seul en-tête** sur `--hero-b`, collé au haut de l'écran, sans coins arrondis :
  1. une ligne : symbole Lamaelle, « Claire & Julien », puis « 917 jours » à droite (plus petit qu'aujourd'hui, environ 20 px pour le chiffre) ;
  2. la phrase du couple en `--f-accroche` (environ 26 px au lieu de ~34) ;
  3. « Lamaelle vous connaît à X % » et la barre, sur une ligne ;
  4. « Vos priorités » et les pastilles ;
  5. le lien « Lire la synthèse complète ».
- La photo du couple quitte cet en-tête (elle reste sur l'accueil et dans Réglages).
- **Carte « À explorer maintenant » en format horizontal** : vignette carrée de 88 px à gauche (illustration, section 2), à droite l'étiquette « C'EST LE MOMENT », le nom de la tuile, la phrase sur deux lignes au plus, puis « L'essentiel · 1 min » et le bouton.
- Le bouton de la carte suit le style du bouton principal de l'app (`--accent`) : « Commencer », ou « Reprendre » si le niveau est en cours.
- **But** : sur iPhone, à l'ouverture, on voit l'en-tête **et la carte entière avec son bouton**, sans défiler. Si ce n'est pas le cas, réduire d'abord les marges de l'en-tête, jamais le texte sous 15 px.

## 2. Des tuiles plus basses, sans lettres

Ce qu'on constate : les tuiles font environ 240 pt de haut, l'onglet fait six écrans de défilement, et la grande lettre en italique sur la plupart des tuiles donne une impression d'inachevé. La tuile **Repas affiche un gâteau**.

- **Zone d'image réduite d'environ 40 %** (environ 76 px au lieu de ~125). Le reste de la tuile ne change pas.
- **Ce qu'on met dans la zone d'image**, dans cet ordre :
  1. la première photo d'inspiration **rangée dans cette tuile** par le couple ;
  2. sinon, la photo d'illustration de la tuile, quand elle sera fournie ;
  3. sinon, une **icône au trait** propre à la tuile, en `--coral-ui`, d'environ 32 px, centrée sur le fond pâle actuel. Plus de lettre.
- **Vérifier la correspondance photo ↔ tuile** : une photo d'inspiration ne s'affiche que dans la tuile où elle est rangée. La photo du gâteau doit aller dans « Gâteau et desserts », pas dans « Repas ». Si l'ancien moodboard n'était pas rangé par tuile, ne rien afficher plutôt qu'une photo d'une autre tuile.
- Tuile grisée : icône et fond atténués, comme aujourd'hui.
- **Tuile seule sur sa ligne** (aujourd'hui Papeterie, Voyage de noces, Wedding planner) : elle prend toute la largeur, au format horizontal (image à gauche sur 40 % de la largeur, texte à droite), pour ne plus laisser de trou.

## 3. Nouvel état « En cours »

Ce qu'on constate : une tuile où l'on a répondu à quelques questions, sans finir un niveau, reste sur « À découvrir ». Le couple ne voit pas que ses réponses ont compté.

- Une tuile passe à **« En cours »** dès qu'une de ses questions a une réponse et que le niveau correspondant n'est pas terminé.
- Le trait de ce niveau se remplit **à moitié** (corail sur la moitié gauche).
- Ordre de priorité des mots d'état : « Pas pour nous » > « C'est le moment » > « Brief prêt · complet » > « Brief prêt » > « Esquissée » > « En cours » > « À découvrir ». Le premier qui s'applique s'affiche.
- Sur la page de la tuile, le niveau commencé est mis en avant, avec le bouton « Reprendre » et « n questions sur N ».
- La jauge ne change pas : elle compte déjà les questions répondues.

## 4. Détails

1. **Libellé du cocktail** : afficher « Vin d'honneur » en France et « Cocktail » ailleurs, jamais « Cocktail (vin d'honneur) ». La mention « FR » de l'inventaire est une note pour la traduction, pas un texte d'interface. Vérifier les autres libellés de tuiles et de questions qui portent une mention entre parenthèses (« Pièce montée (FR) », « Plateau de fromages (FR) »…).
2. **Officiant grisé** : afficher la raison sous le mot d'état, en `--muted` : « Un proche officie », « Vous officiez », ou « Selon votre cérémonie » si la Cérémonie n'a pas de réponse. Même principe pour Le lendemain (« Selon la durée choisie »).
3. **Bouton flottant du coach** : ne pas le modifier. Vérifier seulement qu'à l'ouverture il ne recouvre pas la carte « À explorer maintenant » (section 1).

## 5. Critères d'acceptation

- À l'ouverture sur iPhone : un seul bloc bleu, et la carte « À explorer maintenant » entière avec son bouton, sans défiler.
- Aucune tuile n'affiche de lettre ; aucune photo n'apparaît dans une tuile où elle n'est pas rangée ; Repas ne montre plus le gâteau.
- L'onglet est nettement plus court (objectif : environ quatre écrans de défilement au lieu de six).
- Une tuile avec au moins une réponse, sans niveau terminé, affiche « En cours » et un demi-trait.
- Plus aucun libellé ne contient « (FR) » ni « (vin d'honneur) ».
- Une tuile grisée dit pourquoi.
- Mode sombre vérifié, contrastes conformes à `CLAUDE.md`.
- Enregistre ce correctif dans `docs/nos-envies-v1-1.md` et mets `CLAUDE.md` à jour.
