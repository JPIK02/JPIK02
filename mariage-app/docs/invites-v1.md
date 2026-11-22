# Lamaelle — Invités v1 : dossier d'intégration

Version du 22 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce dossier refond la page **Invités** et le **Plan de table**, ouverts depuis la tuile Invités de l'accueil. Il décrit le **comportement attendu**, pas l'implémentation, et il a été rédigé sans accès au code.

Référence visuelle validée par Julien : canvas **« Lamaelle – Invités »** (5 artboards : invités aujourd'hui, un foyer, après le faire-part, plan de table, liste vide). Il fixe la structure et la hiérarchie, **pas les couleurs ni les polices**. Noms, cercles et chiffres sont des exemples.

## 1. Mode d'emploi

1. Lis `CLAUDE.md`, `docs/accueil-v3.md` et `docs/budget-planning-v1.md` (section 2 : règles communes aux pages), puis tout le code actuel des invités, du plan de table, de l'export CSV, de l'ajout rapide et de l'agent mail (réponses d'invités).
2. **Propose un plan avant de coder**, découpé selon les lots de la section 9.
3. Garde l'identité de l'app : variables de rôle de `styles.css`, Jost et Cormorant, clair et sombre. Aucune couleur en dur.
4. **Déplacer, jamais supprimer** : toute fonction actuelle reste accessible (ajout rapide, export CSV, recherche, filtres).
5. Signale tout conflit avec l'existant au lieu de trancher seul, en particulier sur le modèle de données, la migration en foyers et les règles Firestore.
6. Textes d'interface externalisés.
7. Enregistre ce dossier dans `docs/invites-v1.md` et mets `CLAUDE.md` à jour.

## 2. Le principe

La page suit **trois moments**, et n'affiche que celui où le couple se trouve :

1. **« Qui on invite ? »** : la liste se construit (artboard 1).
2. **« Qui vient ? »** : les faire-part sont partis, les réponses arrivent (artboard 3).
3. **« Qui s'assoit où ? »** : le plan de table (artboard 4).

Deux corrections de fond :
- **« En attente » ne veut rien dire avant l'envoi.** Aujourd'hui, 38 personnes sont « en attente » alors qu'aucune invitation n'est partie. Un invité est d'abord **sur la liste** ; il ne peut être « sans réponse » qu'après l'envoi du faire-part.
- **Le foyer devient l'unité** : un couple ou une famille = une invitation, une adresse, une réponse, plusieurs couverts.

| Aujourd'hui | Demain |
|---|---|
| Onglets Liste / Plan de table | Une page ; le plan de table s'ouvre depuis une carte |
| Paragraphe d'aide, boutons « Ranger » et « Ajouter » | « + » dans l'en-tête ; « Ranger » devient le choix du cercle |
| 4 cartes : invités, présents, au dîner, répartition | Un grand chiffre, un point par place, trois compteurs |
| Grand champ de recherche | Champ d'une ligne |
| Filtres Toutes / Présents / En attente / Absents | Selon le moment : cercles avant l'envoi, réponses après |
| Une ligne par personne, statut sur chacune | Foyers ; statut par foyer |
| Ajout rapide, export CSV | Conservés en bas de page |

## 3. Les écrans

### 3.1 Moment 1 — la liste se construit (artboard 1)

Affiché tant qu'aucun faire-part n'est marqué envoyé.

1. **En-tête** sur `--hero-b` : « Nos invités », « + ». Étiquette « SUR LA LISTE », **nombre de personnes en grand**, « sur [cible] visés ».
2. **Un point par place**, sur une grille, jusqu'à la cible (au-delà de 150, un point = 2 personnes, indiqué dans la légende) : rempli à la couleur du côté (Claire, Julien, Commun), cerclé pour les places libres. Légende avec les nombres. Au-dessus de la cible : les points en trop sont marqués et la légende dit « +N au-dessus de votre cible ».
3. **Compteurs** : « adultes + enfants », « foyers », « adresses » (foyers avec adresse / foyers).
4. **Carte d'action** (bord corail), la première qui s'applique :
   - adresses manquantes : « N foyers sans adresse », « Partager le lien » (section 4) ;
   - foyers non regroupés après migration : « N invités à regrouper en foyers », proposé par le coach ;
   - tout est prêt : « Prêts pour les save-the-date », lien vers la tâche du planning.
5. **Recherche** sur une ligne (nom, cercle).
6. **« Par cercle »** : tuiles en 2 colonnes, avatars d'initiales sur la teinte du côté, nombre en grand, nom du cercle. Une tuile ouvre la liste du cercle (foyers, puis personnes).
7. **Carte « Plan de table »** : « Utile quand les réponses arrivent · brouillon possible ».
8. **« Coller une liste »** et **« Exporter (CSV) »** en bas de page.

### 3.2 Un foyer (artboard 2)

- Retour ; pastille « [Côté] · [Cercle] » ; nom du foyer en `--f-accroche` (« Alejandra et son conjoint », « Famille Rousselot ») ; ligne « Un foyer · N adultes · N enfants · une seule invitation ».
- **« Les personnes »** : une ligne par personne (initiales, nom, adulte ou enfant, régime). Un accompagnant sans nom s'affiche « +1 » en pointillés, « Prénom à demander ». « Ajouter une personne au foyer ».
- **« Invités à »** : pastilles des moments (4.3), cochées ou non pour ce foyer.
- **« Pour les envoyer »** : adresse, téléphone, e-mail. Adresse manquante : bouton « Demander par lien ».
- **« Suivi »** : frise Sur la liste → Save-the-date → Faire-part → Réponse, étape actuelle en corail.
- **Note** libre ; « Retirer de la liste » en bas, discret (avec confirmation, annulable).

### 3.3 Moment 2 — les réponses arrivent (artboard 3)

Affiché dès qu'au moins un faire-part est marqué envoyé.

1. **En-tête** : étiquette « ILS VIENNENT », nombre en grand, « sur N invités ». Points colorés par réponse : viennent (corail), ne viennent pas (sombre), sans réponse (cerclé). Compteurs : « au dîner », « enfants », « date limite ».
2. **« À relancer · N »** (bord corail), s'il y a des foyers sans réponse après la date limite ou à moins de 15 jours : pastilles des foyers, bouton « Relancer · message prêt ». Le message s'ouvre dans la feuille de partage du téléphone (SMS, WhatsApp, mail) ; **l'app n'envoie rien elle-même**.
3. **« Pour le traiteur »** : adultes, enfants, régimes au dîner ; détail des régimes ; « Envoyer le récapitulatif au traiteur » (brouillon dans l'app mail du téléphone, traiteur réservé prérempli si connu).
4. **« Par moment »** : une barre par moment avec le nombre de présents.
5. **Carte « Plan de table »** : « N placés sur N · N tables ».

### 3.4 Plan de table (artboard 4)

- Retour, « Plan de table », « + » (ajouter une table). Ligne « N placés sur N · N tables ».
- **Table d'honneur** en haut, puis les tables en 2 colonnes : table ronde avec une pastille d'initiales par siège (teinte du côté), siège libre en pointillés, nom de la table, « N / N ». Toucher une table l'ouvre (liste, renommer, nombre de sièges, forme ronde ou rectangulaire).
- **Alertes** sous les tables, en une ligne chacune, par exemple : foyer séparé, enfant loin de ses parents, deux personnes que le couple a notées « à séparer ». La table concernée a un bord `--bad`.
- **Tiroir en bas** : « À placer · N », pastilles glissables vers une table ; « PDF du plan » ; « Placer les N avec le coach ».
- Le plan ne concerne que les personnes qui viennent au **dîner** (moment 1 : brouillon avec toute la liste, signalé « brouillon »).

### 3.5 Liste vide (artboard 5)

Affiché tant qu'il n'y a aucun invité.
- « Qui voulez-vous à vos côtés ? » et une phrase : un ordre de grandeur guide le choix du lieu et du traiteur.
- **« Combien, environ ? »** : 30, 60, 100, 150+ (modifiable plus tard ; c'est la cible du 3.1). La cible alimente aussi le budget (« par invité ») et les envies du lieu.
- **« Ajouter vos proches »** : « Coller une liste » (l'IA reconnaît couples et familles et propose des foyers), « Un par un », « Un tableur » (CSV ou Excel).
- Encart : chacun ajoute son côté depuis son téléphone ; les amis communs vont dans « Commun ».

## 4. Le lien pour les adresses

Validé par Julien. C'est le seul endroit où des personnes extérieures écrivent dans l'app.

1. **Un lien par foyer**, avec un jeton aléatoire long, envoyé par le couple (feuille de partage du téléphone). Option « un lien pour tous » : **non** en v1, pour éviter les inscriptions sauvages.
2. La page ouverte par le lien : aux couleurs de Lamaelle, prénoms du couple, nom du foyer, champs **adresse postale, e-mail, téléphone**, et pour chaque personne le **régime alimentaire** (facultatif). Aucun compte, aucune autre donnée visible.
3. Écriture **via une fonction serveur**, jamais en direct dans Firestore ; le jeton ne donne accès qu'aux champs de son foyer. Limite de fréquence par jeton.
4. Le couple voit les réponses arriver ; une modification par le foyer remplace la précédente (date affichée).
5. **Données personnelles** : mention courte sur la page (qui collecte, pourquoi, durée de conservation, contact pour suppression). Proposer une durée par défaut (suppression des adresses et régimes 6 mois après le mariage, sur confirmation du couple) et la soumettre à Julien.
6. Le lien expire au mariage ; le couple peut le révoquer ou en générer un nouveau.
7. Plus tard, la même page pourra recueillir les **réponses au faire-part** (RSVP). Prévoir le modèle pour, sans le livrer en v1.

## 5. Données et migration

1. **Foyer** : nom affiché, côté (Claire, Julien, Commun), cercle, personnes, moments invités, adresse, téléphone, e-mail, étape de suivi (sur la liste, save-the-date envoyé, faire-part envoyé, répondu), note, jeton de lien.
2. **Personne** : prénom, nom, adulte ou enfant, régime, réponse par moment (oui, non, sans réponse), table et siège.
3. **Moments** : liste propre au mariage, par défaut Cérémonie, Vin d'honneur, Dîner, Brunch du lendemain ; le couple peut renommer, ajouter, retirer.
4. **Cible** : nombre d'invités visé (aujourd'hui « 60 visés »).
5. **Statuts actuels** : « Présent » devient « oui » aux moments cochés ; « En attente » devient « sans réponse » **seulement** si le faire-part est marqué envoyé, sinon le foyer est « sur la liste » ; « Absent » devient « non ».
6. **Regroupement en foyers** : proposer un tableau personnes → foyers (même nom de famille, « +1 », enfants rattachés), **le soumettre à Julien avant la migration**, sauvegarde préalable. Une personne seule est un foyer d'une personne.
7. Le côté actuel (Claire, Julien, Commun) et les groupes actuels (devenus cercles) sont conservés.
8. Les régimes et allergies sont des données de santé : visibles du couple seulement, jamais envoyés à un prestataire autrement que dans le récapitulatif agrégé (« 1 allergie aux fruits à coque », sans nom) sauf si le couple choisit d'ajouter les noms.

## 6. Règles

- **Moment affiché** : moment 1 tant qu'aucun foyer n'a l'étape « faire-part envoyé » ; sinon moment 2. Le plan de table est accessible dans les deux.
- **Compter** : une personne compte une place ; un « +1 » sans nom compte une place.
- **Date limite de réponse** : réglage du couple, proposée à 2 mois avant le mariage.
- **Agent mail** : une réponse d'invité repérée dans la boîte reste une **proposition** à valider (garde-fou existant), rattachée au foyer.
- **Relance** : un foyer n'apparaît dans « À relancer » qu'une fois par période de 7 jours après une relance marquée faite.
- **Placement automatique** : garder les foyers ensemble, les enfants près de leurs parents (ou à une table d'enfants si elle existe), regrouper par cercle, respecter « à séparer » et les places déjà fixées à la main (jamais déplacées). Résultat présenté, puis appliqué sur validation, annulable d'un geste.

## 7. Coût de l'IA

- Aucun appel IA à l'affichage.
- Appels sur action seulement : coller une liste (foyers proposés), regroupement en foyers lors de la migration, message de relance, placement par le coach.
- Le récapitulatif traiteur et les alertes du plan de table sont **calculés sans IA**.

## 8. Sorties IA

| Sortie | Quand | Contenu |
|---|---|---|
| Foyers proposés | Coller une liste, migration | Personnes regroupées, côté et cercle si évidents ; rien d'inventé, champs inconnus vides |
| Message de relance | « Relancer » | Court, chaleureux, signé des prénoms du couple, avec la date limite |
| Placement | « Placer avec le coach » | Affectations proposées et une phrase par table expliquant le choix |

## 9. Lots de livraison

1. **Lot 1 — Page et foyers** : migration en foyers (après validation), moment 1 (3.1), page d'un foyer (3.2), cercles, cible, correction de « en attente ».
2. **Lot 2 — Le lien pour les adresses** (section 4), avec la fonction serveur et la mention données personnelles.
3. **Lot 3 — Les réponses** : moments, moment 2 (3.3), relance, récapitulatif traiteur.
4. **Lot 4 — Plan de table** (3.4) : tables, glisser-déposer, alertes, placement par le coach, PDF.
5. **Lot 5 — Liste vide** (3.5) et « Coller une liste » avec foyers proposés.

Livrer le lot 1, laisser Julien le tester sur iPhone, puis enchaîner.

## 10. Critères d'acceptation

- Avant l'envoi des faire-part, aucun invité n'apparaît « en attente » ou « sans réponse ».
- À l'ouverture, on voit le nombre sur la liste, la cible, un point par place coloré par côté et les trois compteurs.
- Un couple ou une famille est un seul foyer, avec une seule adresse et une réponse par personne et par moment.
- Le lien d'adresse s'ouvre sans compte, ne montre que son foyer, n'écrit que ses champs, et passe par une fonction serveur ; un jeton modifié ou expiré est refusé.
- La relance et le récapitulatif traiteur s'ouvrent dans les apps du téléphone ; l'app n'envoie rien.
- Le plan de table ne déplace jamais une place fixée à la main ; le placement par le coach s'annule d'un geste.
- Ajout rapide, export CSV et recherche restent disponibles.
- Aucun appel IA à l'affichage ; clair et sombre vérifiés ; zones tactiles de 44 px ; le bouton du coach ne cache jamais de contenu.
- Le tableau de regroupement en foyers a été validé par Julien avant la migration ; aucune personne ni réponse n'est perdue.
