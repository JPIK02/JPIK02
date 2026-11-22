# Lamaelle — « Prestataires » v1 : dossier d'intégration

Version du 22 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce dossier refond l'onglet « Prestataires ». Il décrit le **comportement attendu**, pas l'implémentation, et il a été rédigé sans accès au code.

Référence visuelle validée par Julien : canvas **« Lamaelle – Prestataires »**, sept artboards (onglet, page d'un métier, fiche, comparer, ajouter, c'est réservé, onglet vide). Ils fixent la structure et la hiérarchie, **pas les couleurs ni les polices**. Les zones colorées sont des emplacements de photos ; les noms de prestataires et les montants sont des exemples.

## 1. Mode d'emploi

1. Lis `CLAUDE.md`, `docs/nos-envies-v1.md` et `docs/accueil-v3.md`, puis tout le code de l'onglet « Prestataires » : annuaire par métier, statuts, note de fit IA et avis en ligne, notes de visite, comparateur, historique des devis. Lis aussi l'agent mail (propositions de prestataires et de devis), la recherche internet du coach, le budget et le planning.
2. **Propose un plan avant de coder**, découpé selon les lots de la section 10.
3. Garde l'identité de l'app, qui est définitive : variables de rôle de `styles.css` (`--hero-b`, `--accent`, `--accent-soft`, `--coral-ui`, `--muted`, `--line`, `--f-accroche`…), Jost et Cormorant, thèmes clair et sombre. Aucune couleur en dur.
4. Réutilise l'existant partout : calcul des notes, analyse des avis, agent mail, briefs (`pdfBriefs`), recherche du coach, budget, planning, bouton flottant du coach.
5. **Déplacer, jamais supprimer** : toute fonction actuelle reste accessible (section 3).
6. Signale tout conflit avec l'existant au lieu de trancher seul, en particulier sur le modèle de données et les règles Firestore.
7. Tous les textes d'interface sont externalisés (traduction prévue).
8. Enregistre ce dossier dans `docs/prestataires-v1.md` et mets `CLAUDE.md` à jour.

## 2. Le principe

L'onglet n'est plus un annuaire : c'est **une suite de décisions, une par métier**, de « qui choisir ? » à « c'est réservé ».

- **Nos envies** dit ce que le couple veut ; **Prestataires** dit qui le fait. Les deux onglets renvoient l'un vers l'autre à chaque métier.
- **Une seule chose mise en avant** : la carte « À décider maintenant ».
- **Le métier est l'unité** : on compare toujours à l'intérieur d'un métier, sur les envies du couple.
- **Peu de statuts à tenir** : trois étapes visibles, le reste est déduit par l'app (agent mail, rendez-vous).
- **La réservation est une récompense** : l'app met à jour le budget et le planning toute seule, et propose de prévenir les autres prestataires.
- **Pas de catalogue** : un onglet vide reste utile et guide le couple (écran 7).

## 3. Écart avec l'onglet actuel

| Aujourd'hui | Demain |
|---|---|
| Annuaire par métier | Métiers rangés par état : En cours, À lancer, Réservés (section 4.1) |
| Statuts repéré → réservé | 3 étapes visibles + Écarté ; devis et rendez-vous en mentions automatiques (6.1) |
| Note de fit sur 100, avis | Inchangés ; affichés avec « Pour vous » et « À vérifier » sur les cartes et la fiche |
| Notes de visite | Dans l'historique de la fiche ; « Raconter le RDV » depuis la prochaine étape |
| Comparateur | Lignes construites à partir des envies du couple (4.4) |
| Historique des devis | Section « Devis » de la fiche, versions et écart |
| — | Carte « À décider maintenant », page métier, écran « C'est réservé », onglet vide |

## 4. Les écrans

### 4.1 L'onglet (artboard 1)

De haut en bas :

1. **En-tête** sur `--hero-b` : étiquette « PRESTATAIRES », bouton rechercher, bouton « + » (ouvre 4.5). Le chiffre « N métiers réservés sur M » (N en grand, en corail) et une **frise d'un point par métier** : plein si réservé, cerclé si en cours, gris si à lancer. Légende sous la frise.
2. **« À décider maintenant »** : une seule grande carte (photo du métier, étiquette « C'est le moment », nom du métier, avatars des candidats, une phrase qui dit où on en est et pourquoi maintenant, « Meilleur fit N/100 », bouton « Comparer » s'il y a au moins deux candidats, sinon « Voir »). Choix : section 6.3.
3. **Encart agent mail** « N prestataires repérés dans vos mails », s'il y en a : ouvre 4.5 sur la liste à ajouter.
4. **« En cours · N »** : une ligne par métier qui a au moins un candidat et aucun réservé. Vignette, nom, « N en lice · N devis reçus », prochaine étape en corail (« Rendez-vous le 4 déc. », « Envoyer le brief »), meilleur fit à droite. Ouvre la page métier.
5. **« À lancer · N »** : métiers sans candidat, triés par « Remonte à ». Une ligne : « Vers N mois avant » et l'état des envies (« essentiel fait »). Bouton « Trouver » quand le moment est venu. Une tuile grisée dans Nos envies apparaît atténuée, « Pas pour nous · réactiver ».
6. **« Réservés · N »** : liste compacte, une coche corail, « Métier · Nom », et à droite l'état du suivi (« Acompte payé », « Contrat à signer » en corail, « Solde le 20 avr. », « À jour »).
7. Lien discret **« Écartés (N) · gardés pour mémoire »**.

### 4.2 La page d'un métier (artboard 2)

1. **Photo du métier** en tête (environ 240 px), retour, « + » (ajouter dans ce métier), titre en `--f-accroche` (« Les photographes »), ligne « À réserver vers N mois avant · d'ici [mois année] ».
2. **« Ce que vous cherchez »** : la phrase de la tuile Nos envies en `--f-accroche` et 3 ou 4 pastilles (style, contraintes, budget du poste). Lien « Nos envies [métier] » vers la page de la tuile. Si l'essentiel n'est pas fait : « Répondez à l'essentiel pour des notes plus justes · 1 min ».
3. **« En lice · N »**, classés par note : une carte par candidat avec initiales sur la teinte du métier, nom, « ville · note des avis sur N avis », note sur 100 en grand, une ligne « Pour vous » et une ligne « À vérifier », puis en pied l'étape ou la mention (« Devis reçu · RDV 2 déc. », « Repéré ») et le dernier prix connu (« Prix inconnu » sinon). Le premier a un bord corail.
4. Bouton principal **« Comparer les N »** (à partir de deux candidats).
5. **Encart du coach** sur `--hero-b` : « Pas encore convaincus ? », une phrase qui dit ce que le coach chercherait (style, date, distance du lieu réservé), mention « avec votre accord · sources citées », bouton « Lancer la recherche ».
6. **Brief [métier]** : « Envoyé à N sur M », bouton pour l'envoyer à ceux qui ne l'ont pas. Brief pas prêt : « Prêt dès les détails remplis » (lien vers Nos envies).
7. **« Écartés · N »** repliés, avec la raison donnée et la date.
8. Mention IA (section 8).

### 4.3 La fiche d'un prestataire (artboard 3)

1. **En-tête** sur `--hero-b` : retour, modifier ; métier en étiquette, nom en `--f-accroche`, « ville · repéré le [date] par [prénom] » ; **anneau de la note** (82, « fit ») ; **barre d'étapes** en trois segments, étape courante en gras.
2. **« Prochaine étape »** (fond `--accent-soft`) : la chose à faire, avec un visuel (mini-calendrier pour un rendez-vous). Exemples : rendez-vous à venir → « Voir les questions » et « Raconter le RDV » ; devis reçu → « Comparer » ; repéré sans contact → « Envoyer le brief ». Règles : section 6.4.
3. **« Pourquoi N »** : 2 à 4 points « Pour vous » (coche verte) et 1 à 3 « À vérifier » (cercle corail), formulés avec les envies du couple ; carte avis : note, nombre d'avis, un trait qui revient souvent. Mention IA.
4. **« Devis »** : dernier montant en grand, ancien barré, écart en pastille, ligne « Version N du [date] · lue par l'agent mail · [ce qui est inclus] ». Ouvre l'historique et le PDF.
5. **« Historique »** : frise des événements (repéré, brief envoyé, devis, rendez-vous, notes de visite, mails), du plus récent au plus ancien, avec leur source.
6. **« Contact »** : quatre boutons (appeler, e-mail, site, Instagram), affichés seulement s'ils sont renseignés.
7. **Barre d'action** fixe au-dessus de la barre du bas : « Écarter » (secondaire) et **« On le réserve »** (principal). Le bouton du coach remonte au-dessus de la barre d'action.

Une fois réservé, la fiche passe en **mode suivi** : la barre d'action disparaît, « Prochaine étape » montre le suivi (contrat, acompte, solde, point avant le jour J), et une section « Paiements » s'ajoute (prévu, payé, reste, échéances, liés au budget).

### 4.4 Comparer (artboard 4)

- Plein écran, sans barre du bas. Fermer, étiquette « COMPARER », titre « Vos [métier] ».
- **En-têtes** : 2 ou 3 candidats (au plus 3 ; au-delà, le couple choisit lesquels).
- **Lignes** : « Fit avec vos envies », « Prix », puis **une ligne par envie importante de la tuile** (style, horaires, inclus…), puis « Avis en ligne » et « Libre le [date du mariage] ». Une valeur inconnue s'affiche « ? » ou « À demander ». Le meilleur de chaque ligne en corail et en gras.
- Phrase sous le tableau : « Les lignes reprennent vos envies [métier]. En corail : le meilleur sur la ligne. »
- **« L'avis du coach »** sur `--hero-b` : une phrase de synthèse en `--f-accroche`, une recommandation sur ce qu'il faut vérifier avant de trancher, mention IA.
- Actions : « Réserver [nom du premier] » et « Poser une question au coach » (ouvre le coach avec le contexte de la comparaison).

### 4.5 Ajouter un prestataire (artboard 5)

Une feuille qui monte du bas, depuis le « + » de l'onglet, d'un métier ou de l'encart mails.

1. **« Vous l'avez déjà trouvé »** (bord corail) : un champ « Collez un lien Instagram ou un site, ou tapez un nom » et deux boutons « Carte ou flyer » (photo) et « Un devis PDF ». L'IA remplit la fiche : nom, métier, ville, contacts, prix si devis. Le couple vérifie avant d'enregistrer.
2. **« Le coach cherche pour vous »** : ouvre la recherche du coach pour un métier (règle d'accord inchangée).
3. **« Repérés dans vos mails · N »** : propositions de l'agent mail, un « + » pour ajouter chacune d'un geste.

Ouverte depuis un métier, la feuille préremplit ce métier. Un doublon (même site, même e-mail ou même nom dans le métier) est signalé au lieu d'être créé.

### 4.6 C'est réservé (artboard 6)

Après confirmation de la réservation (6.6) :

1. **En-tête** sur `--hero-b` : grande coche corail, « [MÉTIER] · C'EST RÉSERVÉ », une phrase en `--f-accroche` (« Atelier Lumière racontera votre 20 mai »), « N métiers réservés sur M » et la frise mise à jour.
2. **« Déjà fait pour vous »** : budget (anneau, « N € engagés », part du budget engagé) et planning (« N tâches ajoutées », listées en une ligne). Chaque ligne s'ouvre sur la page concernée.
3. **« Prévenir les N autres ? »** (fond `--accent-soft`) : « Un mot courtois est prêt pour [noms]. Ils seront rangés dans « Écartés », pas supprimés. » Boutons « Relire et envoyer » et « Plus tard ». Absent s'il n'y a pas d'autre candidat.
4. **« Prochaine décision »** : la prochaine carte « À décider maintenant ».
5. Action principale : « Voir la fiche de [nom] ».

### 4.7 L'onglet vide (artboard 7)

Affiché tant qu'**aucun prestataire** n'existe dans l'espace du mariage.

1. **En-tête** sur `--hero-b`, avec le phare Lamaelle en filigrane : « PRESTATAIRES », « + », titre « Trouvons ceux qui vous ressemblent » et une phrase : pas de catalogue, Lamaelle part de vos envies et note chaque prestataire. **Aucun compteur, aucun « 0 ».**
2. **« Par où commencer »** : une grande carte pour le **premier métier à lancer** (le Lieu s'il n'est pas réservé, sinon la règle 6.3). Photo, « C'est le moment », une phrase qui dit pourquoi ce métier d'abord et pourquoi maintenant, 2 ou 3 pastilles tirées des réponses déjà données (parcours d'arrivée ou Nos envies), mention « D'après vos réponses du parcours d'arrivée ». Boutons « Le coach cherche 3 [métier] » et « On a déjà des [métier] en tête » (ouvre 4.5). Mention de l'accord pour la recherche.
3. **« Comment ça marche »** : trois cartes numérotées : « Vos envies · 3 questions par métier suffisent », « Des noms · les vôtres ou ceux du coach », « Une note · sur 100, et pourquoi ».
4. **« Votre calendrier »**, avec la date du mariage à droite : trois périodes (« Maintenant », une saison ou une année, « Plus tard ») calculées à partir des « Remonte à » des tuiles et de la date. Dans « Maintenant », une ligne par métier avec son état : « Essentiel fait · prêt à chercher » (bouton « Chercher ») ou « Répondez à l'essentiel d'abord · 1 min » en corail (bouton « Envies »). Les métiers lointains sont regroupés en une ligne (« 6 métiers · Lamaelle vous fera signe »). Lien « Voir les 14 métiers ».
5. **Encart mails** : « Déjà en contact avec des prestataires ? Reliez vos mails : leurs devis arrivent ici tout seuls. » Ouvre le réglage de l'agent mail.

Sans date de mariage : les périodes sont remplacées par l'ordre des familles de Nos envies, et une ligne invite à fixer une date indicative.

## 5. Données

- Un prestataire porte : métier (rattaché à une tuile de Nos envies), nom, ville, contacts, source (couple, coach, agent mail), qui l'a ajouté et quand, **étape**, raison d'écart, note de fit, « Pour vous », « À vérifier », avis (note, nombre, trait récurrent), devis (versions), rendez-vous, notes de visite, questions à poser, paiements une fois réservé.
- Le **métier** est la liste des métiers rattachés aux tuiles dans le catalogue de Nos envies (« métiers de prestataires rattachés »), avec leur « Remonte à ». Pas de seconde liste.
- **M** (« sur M ») = nombre de métiers des tuiles non grisées. Une tuile « Pas pour nous » sort du compte.
- Teinte des initiales : une par métier, la même que dans la tuile Accueil.

## 6. Règles métier

### 6.1 Étapes
1. Trois étapes visibles : **Repéré**, **En discussion**, **Réservé**, plus **Écarté** (hors frise).
2. Passage automatique à « En discussion » dès qu'un brief est envoyé, qu'un devis arrive, qu'un rendez-vous est pris ou qu'un échange mail est repéré. Le couple peut toujours changer l'étape à la main.
3. Les **mentions** (« Devis reçu », « RDV 2 déc. », « Brief envoyé ») sont calculées à partir des données, jamais saisies.
4. **Un seul réservé par métier**, sauf métiers qui en admettent plusieurs (à déclarer dans le catalogue : hébergement, navettes, beauté…).

### 6.2 États des métiers
- **Réservé** : un prestataire réservé. **En cours** : au moins un candidat repéré ou en discussion. **À lancer** : aucun candidat. **Pas pour nous** : tuile grisée dans Nos envies.

### 6.3 « À décider maintenant »
Une seule carte. Choisir le métier, dans cet ordre :
1. métier **en cours** dont le moment est venu (« Remonte à » atteint), avec au moins deux candidats ou un devis reçu ;
2. sinon métier **à lancer** dont le moment est venu ;
3. à égalité : le plus en retard sur son « Remonte à », puis une priorité du couple ;
4. le Lieu passe en premier tant qu'il n'est pas réservé ;
5. sans date : ordre des familles de Nos envies.

La phrase de la carte dit où on en est et pourquoi maintenant. Rien d'urgent : la carte disparaît (pas de carte vide). Cette règle et celle de Nos envies (`docs/nos-envies-v1.md`, 6.3) partagent la même fonction de calendrier.

### 6.4 Prochaine étape d'une fiche
Par ordre de priorité : rendez-vous à venir (sous 14 jours) ; rendez-vous passé sans note de visite (« Raconter le RDV ») ; devis reçu non comparé ; brief non envoyé alors qu'il est prêt ; sans rien de tout cela : « Demander un devis ». Une fiche réservée affiche la prochaine échéance de suivi.

### 6.5 Ajout
1. Lien ou nom : l'IA remplit les champs à partir de la page publique, **sur demande explicite** (bouton), et le couple valide. C'est une lecture de page, pas une recherche internet élargie.
2. Photo de carte ou PDF de devis : extraction par l'IA, puis validation.
3. Une proposition de l'agent mail n'est ajoutée qu'une fois acceptée (garde-fou existant).
4. Doublons : signalés, jamais fusionnés sans accord.
5. Après l'ajout, la note de fit est calculée **pour ce prestataire seulement**.

### 6.6 Réservation
1. « On le réserve » ouvre une confirmation courte : montant (dernier devis, modifiable), acompte et date si connus.
2. Effets, tous **annulables d'un geste** (garde-fou existant) :
   - **budget** : le poste du métier passe le montant en « engagé » ;
   - **planning** : tâches « Signer le contrat », « Payer l'acompte » (avec échéance si connue) et « Faire le point · 1 mois avant » ;
   - les autres candidats du métier restent **en lice** tant que le couple n'a pas choisi de les prévenir ou de les écarter.
3. **Prévenir les autres** : le coach rédige un message court et courtois par prestataire. Envoi : **ouverture du brouillon dans l'app mail du téléphone** (ou copie), pas d'envoi depuis l'app : l'accès Gmail actuel est en lecture seule et ne doit pas être élargi. Une fois prévenus, ils passent en « Écarté » avec la raison « Autre prestataire choisi ».
4. L'écran 4.6 s'affiche une seule fois par réservation.

### 6.7 Écartés
- Écarter demande une raison facultative (pastilles proposées et texte libre). Rien n'est supprimé ; un écarté se remet en lice d'un appui.
- Les écartés ne comptent pas dans « N en lice » et ne sont pas recalculés.

### 6.8 Onglet vide
- L'onglet vide (4.7) s'affiche tant qu'il n'y a **aucun prestataire, écartés compris**.
- Dès le premier prestataire ajouté, l'onglet normal (4.1) s'affiche ; le calendrier devient le groupe « À lancer ».

### 6.9 Tenue secrète et accès du conjoint
- Les prestataires de tenue suivent `docs/nos-envies-v1.md` (6.8) : l'autre partenaire voit seulement une ligne « Tenue de [prénom] · secrète », sans nom, note, devis, rendez-vous ni mails. Le secret est garanti par les règles Firestore. Ils sont comptés dans la frise sans rien révéler.
- Conjoint invité qui a répondu séparément et dont la version commune n'est pas validée : il voit la liste mais pas les notes ni les analyses (règle du parcours d'arrivée inchangée).

## 7. Coût de l'IA

- Aucun appel IA à l'affichage de l'onglet, d'une page métier ou d'une fiche : tout est lu depuis la base.
- Appels seulement : à l'ajout (remplissage, puis note du nouveau prestataire), à l'arrivée d'un nouveau devis (note de ce prestataire), à l'ouverture de « Comparer » si la synthèse n'existe pas ou si un candidat a changé (synthèse en cache sinon), à la rédaction des messages aux écartés, et pour la recherche du coach (avec accord).
- Recalcul des notes : seulement les prestataires modifiés, et ceux du métier dont la tuile Nos envies a changé (règle de `docs/nos-envies-v1.md`, 6.5).
- Respecter les niveaux Éco / Équilibré / Max et le budget mensuel existants.

## 8. Sorties IA

| Sortie | Quand | Contenu |
|---|---|---|
| Fiche préremplie | Ajout par lien, photo ou PDF | Nom, métier, ville, contacts, prix ; rien d'inventé, les champs inconnus restent vides |
| Note de fit | Ajout, nouveau devis, envies du métier modifiées | Note sur 100, 2 à 4 « Pour vous », 1 à 3 « À vérifier », avec les mots des envies |
| Lignes du comparateur | Ouverture de « Comparer » | Une ligne par envie importante ; valeurs connues seulement, sinon « ? » ou « À demander » |
| Avis du coach | Ouverture de « Comparer » | Une phrase de synthèse et une chose à vérifier avant de trancher |
| Message aux écartés | Après une réservation | Un message court et courtois par prestataire, à relire |
| Phrase « C'est réservé » | Après une réservation | Une phrase avec le nom et la date du mariage |

Mention partout où une note ou un avis du coach s'affiche : « L'analyse est faite par une IA. Elle éclaire votre choix, elle ne décide pas pour vous. »

## 9. Correspondance avec l'existant

1. Lister les statuts actuels et le nombre de prestataires dans chacun.
2. Proposer un tableau **statut actuel → étape** (Repéré, En discussion, Réservé, Écarté).
3. Vérifier que chaque prestataire a un métier qui existe dans le catalogue de Nos envies ; lister ceux qui n'en ont pas.
4. Repérer les doublons éventuels sans les fusionner.
5. **Soumettre le tableau à Julien avant la migration**, puis migrer avec une sauvegarde préalable. Rien n'est supprimé : notes, devis, visites et historiques restent attachés.

## 10. Lots de livraison

1. **Lot 1 — Onglet, métier, fiche** : étapes et migration (après validation), onglet (4.1), page métier (4.2), fiche (4.3) avec prochaine étape, état vide (4.7) et bascule (6.8).
2. **Lot 2 — Ajouter et comparer** : feuille d'ajout (4.5) avec remplissage par l'IA et doublons, comparateur à lignes d'envies et avis du coach (4.4).
3. **Lot 3 — Réservation** : confirmation, effets sur le budget et le planning avec annulation, écran « C'est réservé » (4.6), messages aux écartés, mode suivi de la fiche et paiements.
4. **Lot 4 — Tenue secrète** : à livrer avec le lot 4 de Nos envies (stockage privé, règles Firestore, affichage « secrète »).

## 11. Critères d'acceptation

Onglet :
- À l'ouverture, on voit le compteur, la frise et la carte « À décider maintenant » (si elle existe).
- Les métiers sont rangés en En cours, À lancer et Réservés ; aucun « 0 » affiché ; une tuile « Pas pour nous » sort du compte M.
- Sans aucun prestataire, l'onglet vide s'affiche ; dès le premier ajout, l'onglet normal le remplace.

Métier, fiche, comparer :
- La page métier montre la phrase d'envie de la tuile et renvoie à Nos envies en un appui.
- Les candidats sont classés par note, avec « Pour vous » et « À vérifier ».
- La fiche affiche toujours une prochaine étape qui suit la règle 6.4.
- Le comparateur montre au plus 3 candidats ; ses lignes viennent des envies ; les valeurs inconnues ne sont jamais inventées.

Ajout et réservation :
- On ajoute un prestataire à partir d'un lien, d'une photo, d'un PDF ou d'une proposition de l'agent mail ; les doublons sont signalés.
- Réserver met à jour le budget et le planning, et tout s'annule d'un geste.
- Les messages aux écartés s'ouvrent dans l'app mail du téléphone ; l'app n'envoie rien elle-même.

IA et accès :
- Aucun appel IA à l'affichage ; seuls les prestataires modifiés sont recalculés.
- Connecté comme l'autre partenaire, aucune donnée d'un prestataire de tenue secrète n'est lisible, ni à l'écran ni par une requête directe.
- Zones tactiles de 44 px au moins ; clair et sombre vérifiés ; le bouton du coach ne cache jamais de contenu.

Migration :
- Le tableau de correspondance a été validé par Julien avant la migration ; aucun prestataire, devis ni note n'est perdu.
