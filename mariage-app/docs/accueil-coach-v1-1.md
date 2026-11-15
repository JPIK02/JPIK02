# Lamaelle — Accueil Coach v1.1 : correctif visuel

Version du 15 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`.

L'accueil v1 est en place et fonctionne. Ce correctif le rend plus léger et plus beau, **sans changer son comportement** : mêmes sources de données, mêmes actions (`qrFor`, `runQr`, `dayCard`), même navigation. Il complète `docs/accueil-coach-v1.md`, qui fait foi pour tout le reste.

Maquette validée par Julien : canvas « Lamaelle – Accueil Coach », artboard **« v2 · identité de l'app »**. Elle utilise déjà l'identité de l'app : traduire ses couleurs en variables de rôle de `styles.css` (aucune couleur en dur), et vérifier le mode sombre.

## 1. Un seul en-tête

Constat : le bandeau bleu (prénoms, « 923 jours », photo) et le bloc « Bonjour Claire · J-923 · date » affichent deux fois la même chose.

- Sur l'accueil, garder **uniquement le bandeau bleu** et y ajouter la date sur une ligne : `923 jours · samedi 26 mai 2029 (indicative)`. Sans date : « Fixer la date », qui ouvre Réglages.
- Supprimer « Bonjour [prénom] » et la ligne J-n en dessous.
- La photo du couple dans le bandeau ouvre Réglages (comme en v1).

## 2. « À faire maintenant » : une carte mise en avant, le reste en lignes

Constat : trois cartes identiques, chacune avec un gros bouton et « Autres options ». Rien ne ressort et le coach passe sous la ligne de flottaison.

- **Première carte** (la plus prioritaire) : carte pleine sur `--accent-soft`, petite étiquette colorée selon le niveau (« Budget », « Planning »…), titre, une phrase, bouton principal et lien « Autres options » (mécanique `dayCard` inchangée).
- **Cartes suivantes** : regroupées dans **une seule carte** blanche, une **ligne compacte** par point, séparées par un filet : pastille de niveau, titre, une phrase courte, chevron. Toute la ligne déclenche la première action de `qrFor` ; pas de bouton, pas d'« Autres options ».
- Toujours 3 points au plus visibles, puis « Voir les N autres ».
- Raccourcir les textes des lignes quand c'est possible (« Visite Au Petit Manoir · sam. 22 nov. » / « 6 questions à poser, prêtes »).

## 3. Carte Coach resserrée

- Étiquette « POINT DE LA SEMAINE » avec l'icône du coach et le jour à droite, titre du point, puis sa question. « Lire le point » devient un **lien en fin de phrase**, pas une ligne à part.
- Champ : texte d'aide **« Écrire au coach… »** (l'actuel est coupé), fond `--surface-2` sans bordure, micro et bouton d'envoi.
- Suggestions : pastilles **plus petites, à contour fin, sur une seule ligne qui défile** horizontalement (plus de pastilles empilées pleine largeur). Zone tactile de 44 px conservée.

## 4. « Nos envies » : le point d'ancrage

- Carte sur le fond bleu du bandeau (`--hero-b`, texte `--hero-fg`), étiquette « NOS ENVIES » en corail, phrase en **Cormorant Garamond italique** (`--f-accroche`), plus grande qu'aujourd'hui.
- Les priorités en pastilles à contour clair (`--hero-edge`).

## 5. Six tuiles régulières

Constat : hauteurs inégales (Planning déborde), Jour J seule sur sa ligne, fond différent sur Invités, zéros décourageants.

- **Hauteur fixe** pour toutes les tuiles ; texte sur **une ligne** avec points de suspension.
- Icône au trait corail (`--coral-ui`) **sans pavé de fond**, titre en bas de la tuile, puis la ligne d'info.
- Vérifier le fond d'Invités : probablement un état « appuyé » ou « actif » qui reste affiché. Toutes les tuiles ont le même fond au repos.
- **Nouvelle sixième tuile « Documents »** : ouvre une feuille listant les PDF à partager :
  - briefs prestataires : tous, ou par métier (`pdfBriefs`), avec « Préparer les briefs » s'ils ne sont pas prêts ;
  - déroulé du Jour J (`pdfJourJ`) ;
  - rapport d'organisation (`pdfReport`).

  Ligne d'info : « Briefs à envoyer » si les briefs sont prêts, sinon « Briefs à préparer ».
- **Pas de zéro décourageant** :
  - Prestataires : « 16 en vue » tant qu'aucun n'est réservé, puis « 16 suivis · 2 réservés » ;
  - Budget : « 22 600 € prévus » tant que rien n'est engagé, puis « X % engagé » avec sa barre.

Les accès aux briefs prévus en v1 (fiche prestataire, page Prestataires) restent ; le rapport d'organisation reste aussi dans Planning.

## 6. Barre du bas

Inchangée : Coach à gauche (premier onglet, convention iOS pour l'accueil), Nos envies, Prestataires.

## 7. Critères d'acceptation

- Sur iPhone, le premier écran montre le bandeau, « À faire maintenant » et le haut de la carte Coach.
- Une seule carte « À faire » a un bouton ; les autres sont des lignes compactes cliquables.
- Le texte d'aide du champ du coach n'est pas coupé ; les suggestions tiennent sur une ligne qui défile.
- Les six tuiles ont la même hauteur et le même fond ; aucune n'affiche « 0 » seul.
- La tuile Documents ouvre la liste des PDF, et chaque PDF s'ouvre ou se partage.
- Mode sombre vérifié, contrastes conformes à `CLAUDE.md`.
- Ajoute ce correctif au dépôt (`docs/accueil-coach-v1-1.md`) et mets `CLAUDE.md` à jour (accueil, tuile Documents).
