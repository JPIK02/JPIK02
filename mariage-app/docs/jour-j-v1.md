# Lamaelle — Jour J v1 : dossier d'intégration

Version du 24 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce dossier refond la page **Jour J**, ouverte depuis la tuile Jour J de l'accueil. Il décrit le **comportement attendu**, pas l'implémentation, et il a été rédigé sans accès au code ni capture de la page actuelle.

Référence visuelle validée par Julien : canvas **« Lamaelle – Jour J »** (5 artboards : jour J en préparation, un moment, partager, le jour même, journée vide). Il fixe la structure et la hiérarchie, **pas les couleurs ni les polices**. Horaires, lieux, rôles et prénoms sont des exemples.

## 1. Mode d'emploi

1. Lis `CLAUDE.md`, `docs/accueil-v3.md`, `docs/budget-planning-v1.md` (section 2 : règles communes aux pages), `docs/prestataires-v1.md` et `docs/invites-v1.md` (section 4 : lien sans compte), puis tout le code actuel du Jour J (déroulé, PDF à partager).
2. **Liste ce que la page actuelle contient** et vérifie que chaque fonction a sa place dans ce dossier ; signale ce qui manquerait.
3. **Propose un plan avant de coder**, découpé selon les lots de la section 9.
4. Garde l'identité de l'app : variables de rôle de `styles.css`, Jost et Cormorant, clair et sombre. Aucune couleur en dur.
5. **Déplacer, jamais supprimer** ; signale tout conflit avec l'existant (modèle de données, règles Firestore) au lieu de trancher seul.
6. Textes d'interface externalisés.
7. Enregistre ce dossier dans `docs/jour-j-v1.md` et mets `CLAUDE.md` à jour.

## 2. Le principe

La page répond à trois questions :

1. **« Comment se passe la journée ? »** : le déroulé, moment par moment.
2. **« Qui fait quoi ? »** : les rôles confiés aux proches, et ce qui reste à caler.
3. **« Qui doit savoir quoi ? »** : un seul déroulé, partagé en trois versions (invités, prestataires, témoins).

Le jour même, la page devient un **écran de pilotage** : le moment en cours, le suivant, les contacts.

| Aujourd'hui | Demain |
|---|---|
| Déroulé heure par heure | Moments avec lieu, prestataires présents, objets à prévoir, plan pluie |
| Un PDF à partager | Trois versions : invités, une fiche par prestataire, témoins ; PDF ou lien |
| — | Rôles des proches, carte « À caler », mode « C'est aujourd'hui », trames de départ |

## 3. Les écrans

### 3.1 Jour J en préparation (artboard 1)

1. **En-tête** sur `--hero-b` : « Notre jour J », « + » (ajouter un moment). Étiquette « [JOUR DATE] · DATE INDICATIVE » si la date n'est pas confirmée. Phrase en grand : « De [début] à [fin], au [lieu] » (lieu réservé dans Prestataires ; sinon « lieu à choisir »).
2. **Barre de la journée** : de la première à la dernière heure, un segment par moment (proportionnel à sa durée), un repère **coucher du soleil** calculé à partir de la date et du lieu. Repères d'heure sous la barre.
3. **Compteurs** : « moments », « prestataires » (réservés présents ce jour-là), « rôles à confier » (corail s'il y en a).
4. **« À caler · N »** (bord corail), seulement s'il y en a : une ligne par trou, qui ouvre l'endroit où le régler (règles 5.2).
5. **« Le déroulé »** : une ligne par moment, reliées par un trait vertical : heure, pastille (corail pour les moments clés), nom, ligne « lieu · prestataires ou détail », et en `--bad` le trou éventuel. Glisser pour réordonner ; les heures suivantes ne bougent pas toutes seules (seul le bouton « On a du retard » décale, 3.4).
6. **« Qui fait quoi »** : un rôle par ligne, avec la personne (initiales) ou « À confier » en pointillés `--bad`. Toucher un rôle ouvre le choix d'une personne parmi les invités (ou un nom libre).
7. **« Partager le déroulé »** : ouvre 3.3.

### 3.2 Un moment (artboard 2)

- **Photo** en tête (lieu ou inspiration de Nos envies), « [début] → [fin] · [lieu précis] », nom en `--f-accroche`.
- **« Si il pleut »** (bord `--bad` tant que vide) pour un moment en extérieur : solution de repli ; sinon, bouton du coach « Poser la question au lieu » (brouillon ouvert dans l'app mail du téléphone).
- **« Les prestataires »** : chacun avec son heure d'arrivée et sa tâche, ou « Heure d'arrivée à fixer » en `--bad`. Ouvre la fiche Prestataires.
- **« À ne pas oublier »** : objets à cocher, avec la personne qui s'en charge (« À confier » en `--bad`).
- **« Qui voit ce moment »** : pastilles Invités, Prestataires, Témoins (un moment intime, comme les photos de couple, peut être caché aux invités).
- **Note** libre. Modifier l'heure, la durée, le lieu ; supprimer (annulable).

### 3.3 Partager (artboard 3)

- Titre « Chacun sa version », une phrase : un seul déroulé, ce qui change se met à jour partout. Onglets **Invités / Prestataires / Témoins**.
- **Invités** : les moments visibles par les invités, les lieux, le plan d'accès, les navettes. Un lien à mettre sur le faire-part (ou le futur site) et un PDF.
- **Prestataires** : **une fiche par prestataire réservé** : son heure d'arrivée, les moments où il intervient, l'accès et le parking, le contact sur place (rôle « Contact des prestataires »). **Rien sur le budget, les devis ni les autres prestataires.** État de chaque fiche : « Prête · N moments », « Envoyée le [date] · mise à jour depuis », ou « [information] manquante » avec un bouton « Compléter ». Envoi par l'app mail du téléphone (PDF joint ou lien) ; **l'app n'envoie rien elle-même**.
- **Témoins** : tout le déroulé, les rôles, les contacts des prestataires, les plans pluie. Lien en lecture seule (section 4) et PDF.
- Bouton « Envoyer les N fiches prêtes » : enchaîne les brouillons un par un.

### 3.4 Le jour même (artboard 4)

Le jour du mariage, de 6 h à la fin du dernier moment, la page s'ouvre sur cet écran (fond `--hero-b`, toujours sombre). Un bouton fermer revient à 3.1.

- **« MAINTENANT · [heure] »** : nom du moment en très grand, lieu, heure de fin, barre de progression.
- **« ENSUITE · DANS [durée] »** : heure, nom, lieu, et une ligne utile (« traiteur prévenu 15 min avant » si un prestataire y est attaché).
- **Rappel coucher du soleil** si un photographe est réservé : « photos de couple à [coucher − 30 min] ».
- **« Appeler »** : 4 contacts en grille (maître de cérémonie, puis prestataires du moment en cours et du suivant), un appui lance l'appel.
- **« On a du retard : décaler la suite de 15 min »** : décale tous les moments non commencés ; annulable ; visible aussi sur le lien des témoins.
- Phrase finale en `--f-accroche` : « Profitez. [Prénom] a le même écran. » si le lien témoins a été partagé.

### 3.5 Journée vide (artboard 5)

Affiché tant que le déroulé ne contient aucun moment.
- « Imaginons votre journée. » et une phrase : choisir une trame, le coach l'adapte.
- **Trois trames** en cartes, chacune avec une mini-barre et une phrase : « Tout au même endroit », « Mairie le matin, fête le soir », « Deux jours » (avec brunch).
- Ligne « D'après vos envies : … » (type de cérémonie, intérieur ou extérieur, soirée) tirée de Nos envies.
- « Partir de [trame recommandée] » et « Partir d'une page blanche ».

## 4. Le lien des témoins

Validé par Julien. Même principe que le lien d'adresse des invités (`docs/invites-v1.md`, section 4).

1. Un lien **par personne** (maître de cérémonie, témoins), jeton aléatoire long, envoyé par le couple.
2. **Lecture seule**, sauf une action : « On a du retard » (décaler la suite), journalisée (qui, quand), annulable par le couple.
3. Contenu : version Témoins (3.3), et le jour J l'écran 3.4. Pas d'accès au reste de l'app.
4. Lecture via une fonction serveur ; jeton révocable ; expiration 2 jours après le mariage.

## 5. Règles

### 5.1 Données

- **Moment** : nom, début, fin, lieu (et lieu précis), moment clé oui/non, en extérieur oui/non, plan pluie, prestataires (avec heure d'arrivée et tâche), objets (avec responsable, coché), visible par (invités, prestataires, témoins), note.
- **Rôle** : nom, personne (invité ou nom libre), téléphone. Rôles proposés par défaut : Maître de cérémonie, Garder les alliances, Contact des prestataires, Ramener la déco et les cadeaux ; le couple en ajoute ou en retire.
- **Fiche prestataire envoyée** : date d'envoi et empreinte du contenu, pour détecter « mise à jour depuis ».
- Le déroulé actuel est migré en moments (heure, nom, description en note). Rien n'est perdu.

### 5.2 « À caler »

Un trou par ligne, dans cet ordre :
1. prestataire réservé présent à un moment sans heure d'arrivée ;
2. rôle sans personne ;
3. moment en extérieur sans plan pluie ;
4. objet sans responsable ;
5. fiche prestataire envoyée puis modifiée.

Au plus 3 lignes, puis « + N ». Rien à caler : la carte disparaît.

### 5.3 Coucher du soleil

Calculé localement (formule astronomique standard) à partir de la date et des coordonnées du lieu réservé ; sans lieu, de la ville du mariage ; sans date, pas de repère. Pas d'appel externe.

### 5.4 Liens avec le reste de l'app

- Prestataires : réserver un prestataire propose de l'ajouter aux moments concernés selon son métier (photographe : préparatifs à soirée ; traiteur : vin d'honneur et dîner ; DJ : cérémonie et soirée).
- Invités : le nombre au dîner et le plan de table s'affichent dans le moment Dîner ; les rôles se choisissent parmi les invités.
- Planning : un trou de « À caler » crée une tâche dans l'étape « Les derniers réglages » s'il n'est pas réglé un mois avant.

## 6. Coût de l'IA

- Aucun appel IA à l'affichage, ni le jour même.
- Appels sur action seulement : adaptation d'une trame aux envies, questions du coach (plan pluie, heures d'arrivée), rédaction des messages d'envoi des fiches.
- « À caler », coucher du soleil, fiches et décalage sont **calculés sans IA**.

## 7. Sorties IA

| Sortie | Quand | Contenu |
|---|---|---|
| Trame adaptée | Choix d'une trame | Moments et heures ajustés aux envies (type de cérémonie, extérieur, soirée) ; le couple valide |
| Question à un prestataire | Bouton du coach | Brouillon court (plan pluie, heure d'arrivée), à relire |
| Message d'envoi d'une fiche | Envoi d'une fiche | Deux phrases et la fiche jointe |

## 8. Hors champ v1

- Notifications automatiques aux prestataires ou aux invités le jour même.
- Site du mariage complet (la version invités en est la première brique).

## 9. Lots de livraison

1. **Lot 1 — Déroulé** : migration, page en préparation (3.1) avec barre, compteurs, « À caler », rôles ; page d'un moment (3.2).
2. **Lot 2 — Partager** : trois versions (3.3), fiches prestataires et détection des mises à jour, PDF.
3. **Lot 3 — Le jour même** : écran 3.4, décalage, lien des témoins (section 4).
4. **Lot 4 — Journée vide** (3.5) et trames adaptées par le coach.

Livrer le lot 1, laisser Julien le tester sur iPhone, puis enchaîner.

## 10. Critères d'acceptation

- À l'ouverture, on voit la date (avec « date indicative » si besoin), la barre de la journée et les compteurs.
- Chaque trou listé en 5.2 apparaît dans « À caler » et mène à l'endroit où le régler.
- Une fiche prestataire ne contient ni montant, ni devis, ni autre prestataire.
- Modifier un moment déjà envoyé marque la fiche « mise à jour depuis ».
- Le jour même, l'écran 3.4 s'ouvre seul ; « On a du retard » décale les moments non commencés et s'annule d'un geste.
- Le lien témoins est en lecture seule (sauf le décalage), ne donne accès qu'au Jour J, passe par une fonction serveur et expire.
- L'app n'envoie aucun message elle-même ; aucun appel IA à l'affichage.
- Clair et sombre vérifiés (l'écran 3.4 reste sombre) ; zones tactiles de 44 px ; le bouton du coach ne cache jamais de contenu (il est masqué sur l'écran 3.4).
- Aucune donnée du déroulé actuel n'est perdue.
