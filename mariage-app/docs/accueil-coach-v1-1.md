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

## 8. Ajustement v1.2 (après test sur iPhone)

Décision de Julien : le coach reste accessible par **le bouton flottant en bas à droite, sur tous les onglets, accueil compris**, pour garder une continuité.

- Réafficher le bouton flottant du coach sur l'accueil (annule la règle v1 qui le masquait).
- L'onglet d'accueil de la barre du bas s'appelle **« Accueil »**, avec l'icône maison (`ICON.apercu`) : deux entrées « Coach » avec la même étoile seraient confuses. Le bouton flottant garde l'étoile et le mot « Coach ».
- La carte Coach de l'accueil devient la carte **« Point de la semaine »** : étiquette, titre, question, « Lire le point », puis les suggestions sur une ligne qui défile. **Plus de champ de saisie** : on écrit au coach par le bouton flottant.
- Ajouter en bas de la page une marge suffisante pour que le bouton flottant ne cache jamais la dernière tuile.

## 9. Finitions v1.3 (revue des captures du 15 novembre)

1. **Haut de l'écran** : une bande grise dégradée apparaît sous la barre d'état, au-dessus du bandeau bleu. Le bleu du bandeau doit remonter jusqu'en haut de l'écran (zone de sécurité comprise), sans dégradé clair.
2. **Photo du couple plus grande** : environ 76 px (au lieu de ~52), cercle avec un fin liseré corail, alignée sur le bloc prénoms et date.
3. **Date sur une ligne** : `923 jours · 26 mai 2029` sans le jour de la semaine ; « date indicative » en petit dessous, ou un astérisque. Plus de « (indicative) » qui passe à la ligne.
4. **Carte budget sans répétition** : le mot « budget » apparaît trois fois. Garder l'étiquette « Budget », titre « 2 600 € au-dessus du budget », phrase « 22 600 € prévus pour 20 000 €. ». Même principe pour les autres alertes : le titre dit l'écart, la phrase donne les chiffres.
5. **Lignes « À faire »** : pas de point final dans les sous-titres (« À reprogrammer ou à faire en priorité » s'affiche avec un point, l'autre sans) ; harmoniser.
6. **Bouton flottant du coach : ne pas le modifier** (taille, position, style : décision de Julien). Seule la marge basse de la page augmente, pour qu'en fin de défilement il ne recouvre plus la tuile Documents.
7. **Suggestions du coach** : la deuxième pastille est coupée net par le bord de la carte. Libellés courts (« Trouver un lieu », « Notre budget », « Par où commencer ? ») et rangée qui déborde jusqu'au bord de l'écran, sans coupure dans la carte.
8. **Tuile Planning** : le titre de tâche est tronqué au milieu d'un nom (« Prévoir visite Château … ») et la pastille « 1 » n'est pas expliquée. Autoriser **deux lignes** de texte dans toutes les tuiles (hauteur fixe conservée) ; remplacer la pastille par le texte « 1 en retard » en rouge sur la première ligne quand il y a du retard.
9. **Tuiles** : l'espace vide entre l'icône et le titre est trop grand. Réduire la hauteur d'environ 15 %, avec deux lignes de texte possibles.
10. **Carte Nos envies** : les pastilles Lieu · Photographe · Vidéaste ne disent pas ce qu'elles sont. Ajouter devant, en petit, « Vos priorités ».
