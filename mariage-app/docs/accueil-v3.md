# Lamaelle — Accueil v3 : refonte visuelle

Version du 20 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main` (la v1.1 y est fusionnée).

L'accueil fonctionne mais ressemble à un tableau de bord de projet. Cette version le rend **émotionnel et visuel** : la photo et la phrase du couple en ouverture, des visuels à la place du texte, un chiffre par tuile. **Le comportement ne change pas** : mêmes sources de données, mêmes actions, même navigation.

Maquette validée par Julien : canvas « Lamaelle – Accueil Coach », artboard **« v3 · plus visuel, moins de texte »**. Ses zones colorées sont des emplacements de photos. Identité de l'app inchangée : variables de `styles.css`, Jost et Cormorant, clair et sombre.

Ce document remplace les sections 2 à 5 et 9 du correctif v1.1 pour l'accueil. Reste valable de la v1.1 : barre du bas (Accueil, Nos envies, Prestataires), tuile Documents et sa feuille de PDF, règle « pas de zéro décourageant ».

## Règles à ne pas toucher

- **Bouton flottant du coach** : ni sa taille, ni sa position, ni son style. Seule la marge basse de la page garantit qu'il ne recouvre jamais la dernière tuile.
- La bande grise sous la barre d'état est un effet d'iOS : ne rien faire.

## 1. Ouverture : la photo et la phrase du couple

- Le **bandeau bleu disparaît de l'accueil** (il reste sur les autres pages). La photo à cheval aussi.
- En haut, **la photo du couple en plein cadre**, environ 430 px de haut sur iPhone, `object-fit: cover`, jusqu'en haut de l'écran.
- Un dégradé sombre (`--hero-b` vers transparent) en haut, pour lisibilité du symbole, et en bas, pour le texte.
- Par-dessus, en haut : symbole Lamaelle et « LAMAELLE » à gauche ; à droite, un bouton rond translucide (44 px) qui ouvre Réglages.
- Par-dessus, en bas :
  - **la phrase du couple** (`briefs.filRouge.titre`, sinon première phrase de `profil.resume`) en Cormorant italique, environ 34 px, entre guillemets français ; elle ouvre Nos envies ;
  - en dessous, sur une ligne : « Claire & Julien » à gauche, **« 918 jours* »** à droite (chiffre en corail, grand). L'astérisque signale la date indicative ; un appui affiche la date complète.
- **Sans photo de couple** : première photo d'inspiration de la catégorie `vision` (`S.inspirations`), sinon fond `--hero-b` avec le phare en grand filigrane. Ajouter dans ce cas un petit lien « Ajouter votre photo » sous les prénoms.
- **Sans phrase** : « Racontez-nous votre mariage », qui ouvre l'entretien avec le coach.

## 2. « À faire maintenant » : des visuels au lieu des paragraphes

- Plus de titre de section, plus de bouton noir ni d'« Autres options » sur l'accueil : **toucher la carte déclenche la première action** de `qrFor`. Les autres options restent dans la page ouverte.
- **Première carte** pleine largeur : un visuel à gauche, un titre court, une ligne, un chevron. Visuels selon le type :
  - budget : anneau de progression (prévu ou engagé sur total), en `--bad` au-delà de 100 %, pourcentage au centre ;
  - rendez-vous ou visite : mini-calendrier (mois en petit, jour en grand) ;
  - retards : pastille avec le nombre ;
  - propositions e-mail : pastille avec le nombre et l'icône enveloppe ;
  - visite à raconter : icône micro.
- **Suivantes** (2 au plus) : deux **petites cartes côte à côte**, visuel et 2 à 4 mots (« 2 tâches en retard », « Visite Petit Manoir »).
- Au-delà : « + N » discret qui ouvre la liste complète.
- Titres courts : le titre dit l'écart ou l'objet (« +2 600 € sur le budget »), la ligne donne l'action (« À trouver ou à couper »).

## 3. Point de la semaine : une ligne

- Carte bleu nuit (`--hero-b`) sur une ligne : icône du coach, étiquette « POINT DE LA SEMAINE », puis le titre du point (ou « Faire le point avec le coach »), chevron.
- Elle ouvre le point complet. Les suggestions en pastilles quittent l'accueil (elles restent dans la conversation du coach).

## 4. « Votre mariage » : un visuel et un chiffre par tuile

Six tuiles, 2 colonnes, **hauteur fixe ~150 px**, même fond. Dans chacune : le visuel en haut, en bas **un chiffre ou un mot en grand** (environ 26 px) et une ligne courte.

| Tuile | Visuel | Grand | Ligne |
|---|---|---|---|
| Prestataires | 3 avatars ronds superposés + « +N » ; pas de photo de prestataire dans l'app : **initiales sur une teinte par catégorie** | nombre suivi | « Prestataires » ou « N réservés » |
| Budget | anneau de remplissage (engagé sur total) | montant prévu, abrégé (« 22,6 k€ ») | « Budget prévu » ou « X % engagé » |
| Invités | un point par invité (jusqu'à 40, sinon proportionnel), coloré s'il a répondu | « 3 / 41 » | « Invités ont répondu » |
| Planning | petites barres : tâches faites (corail) et à venir (gris) par période | « Planning » | « 2 en retard » en `--bad`, sinon la prochaine échéance |
| Jour J | frise de points jusqu'à une étoile | « Jour J » | « 9 étapes » |
| Documents | pile de deux feuilles | « Briefs » | « À envoyer » ou « À préparer » |

- La carte « Nos envies » pleine largeur disparaît de cette section : sa phrase est en ouverture. L'onglet Nos envies reste dans la barre du bas.
- Tuile vide : visuel en gris et « Commencer » en corail.
- Visuels en SVG ou CSS, couleurs par variables, `aria-hidden` sur le décor et un `aria-label` sur la tuile qui dit le chiffre.

## 5. Critères d'acceptation

- À l'ouverture sur iPhone, on voit la photo, la phrase, les prénoms, le compte à rebours et la première carte « À faire ».
- Aucun paragraphe de plus d'une ligne sur l'accueil.
- Chaque carte et chaque tuile s'ouvre d'un appui ; toutes les actions existantes restent accessibles dans les pages.
- Sans photo, sans phrase ou sans données, l'accueil reste beau (repli décrit ci-dessus) et n'affiche ni zéro seul ni bloc vide.
- Le bouton du coach est inchangé et ne cache aucun contenu en fin de défilement.
- Mode sombre vérifié ; texte sur photo lisible (contraste 4,5:1 grâce au dégradé).
- Enregistre ce document dans `docs/accueil-v3.md` et mets `CLAUDE.md` à jour.
