# Lamaelle — « Nos envies » v1 : dossier d'intégration

Version du 20 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce dossier refond l'onglet « Nos envies ». Il décrit le **comportement attendu**, pas l'implémentation, et il a été rédigé sans accès au code.

Il s'appuie sur deux références validées par Julien, jointes à ce dossier :
- **Le contenu** : `nos-envies-questions.md`, l'inventaire des questions v1.3 (19 tuiles, environ 210 questions, formats, règles). Il fait foi pour chaque question, chaque choix et chaque « Sert à ».
- **Les écrans** : l'archive `lamaelle-nos-envies-maquettes.zip`, six maquettes (onglet, page d'une prestation, trois formats de question, fin de l'essentiel). Elles fixent la structure et la hiérarchie, **pas les couleurs ni les polices**. Elles sont dans un format de prototype (`.dc.html`) : ne pas les copier telles quelles.

## 1. Mode d'emploi

1. Lis `CLAUDE.md`, puis tout le code de l'onglet « Nos envies » : questionnaire par catégorie (15 catégories), moodboard (`S.inspirations`, Pinterest), synthèse du coach (`S.profil`, `S.briefs.filRouge`), briefs PDF (`pdfBriefs`), entretien avec le coach (`chatbrief`). Lis aussi le calcul des notes des prestataires.
2. **Propose un plan avant de coder**, découpé selon les lots de la section 10.
3. Garde l'identité de l'app, qui est définitive : variables de rôle de `styles.css` (`--hero-b`, `--hero-fg`, `--accent`, `--accent-soft`, `--coral-ui`, `--muted`, `--line`, `--f-accroche`…), Jost et Cormorant, thèmes clair et sombre. Aucune couleur en dur.
4. Réutilise l'existant partout : appels IA, calcul des notes, génération des briefs, moodboard, bouton flottant du coach.
5. **Déplacer, jamais supprimer** : tout ce qui quitte l'écran principal reste accessible (section 3).
6. Signale tout conflit avec l'existant au lieu de trancher seul, en particulier sur le modèle de données et les règles d'accès Firestore.
7. Tous les textes d'interface et toutes les questions sont externalisés (traduction et déploiement hors de France prévus).
8. Enregistre ce dossier dans `docs/nos-envies-v1.md`, l'inventaire dans `docs/nos-envies-questions.md`, et mets `CLAUDE.md` à jour.

## 2. Le principe

L'onglet ne doit plus ressembler à un formulaire, mais à une exploration où **chaque réponse rapporte quelque chose tout de suite**.

- Les questions sont rangées en **19 tuiles** (7 familles), chacune sur **trois niveaux** : l'essentiel (3 questions), les détails (4 à 5), les questions d'un pro (3 à 4).
- **Une seule chose à faire mise en avant** : la carte « À explorer maintenant », choisie selon le calendrier du mariage.
- **Chaque niveau terminé donne une récompense** : ce que l'app a compris, des notes de prestataires recalculées, un brief, des questions à poser.
- **Le coach remplit une partie des réponses** à partir des conversations et des visites, à confirmer d'un geste.
- **Liberté maximale** : aucune réponse obligatoire, aucun niveau verrouillé, texte libre, dictée et photos partout.

## 3. Écart avec l'onglet actuel

| Aujourd'hui | Demain |
|---|---|
| Questionnaire en 15 catégories | 19 tuiles, 3 niveaux, une question par écran (section 4.3) |
| Moodboard à part | Inspirations rangées dans chaque tuile, et vue « Toutes vos inspirations » en bas de l'onglet |
| Synthèse du coach | Phrase du couple et priorités en tête de l'onglet ; synthèse complète à un appui |
| Briefs PDF | Dans chaque tuile, et ligne « Briefs prestataires » en bas de l'onglet ; la tuile Documents de l'accueil ne change pas |
| Entretien avec le coach (`chatbrief`) | Reste accessible par le bouton flottant du coach ; ses réponses alimentent les tuiles (section 6.7) |

## 4. Les écrans

### 4.1 L'onglet (maquette `Main.dc.html`)

De haut en bas :

1. **En-tête** sur `--hero-b` : étiquette « NOS ENVIES », la phrase du couple (`briefs.filRouge.titre`, sinon première phrase de `profil.resume`) en `--f-accroche`, la jauge « Lamaelle vous connaît à X % » avec sa barre, « Vos priorités » et les trois priorités en pastilles, lien « Lire la synthèse complète ». Sans phrase : « Racontez-nous votre mariage », qui ouvre `chatbrief`.
2. **« À explorer maintenant »** : une seule grande carte (photo d'illustration du métier, étiquette « C'est le moment », nom de la tuile, une phrase qui dit pourquoi maintenant, « L'essentiel · 1 min », bouton « Commencer »). Choix de la carte : section 6.3.
3. **Encart « N envies notées par le coach »**, s'il y en a : il ouvre la liste des propositions à confirmer.
4. **Les 7 familles**, chacune avec son titre (« LE CŒUR », « À TABLE »…) et ses tuiles sur deux colonnes. Chaque tuile : photo d'illustration, nom, **trois traits** (un par niveau, corail si terminé) et un mot d'état (section 6.4). Une tuile grisée garde sa place, atténuée, avec « Pas pour nous ».
5. **« Tout au même endroit »** : ligne « Briefs prestataires » (« N prêts à envoyer ») et ligne « Toutes vos inspirations » (nombre de photos, Pinterest relié).

Le bouton flottant du coach reste inchangé, avec une marge basse suffisante pour ne rien cacher.

### 4.2 La page d'une prestation (maquette `Prestation.dc.html`)

1. **Photo du métier** en tête (environ 260 px), bouton retour, nom de la tuile en `--f-accroche`, une ligne : « À réserver vers N mois avant · N [métier] suivis ».
2. **Les trois niveaux**, en cartes :
   - le prochain niveau à faire est mis en avant (bord corail) : titre, une phrase, nombre de questions, durée, bouton « Commencer » (ou « Reprendre ») ;
   - les autres en lignes compactes, toujours ouvrables ;
   - un niveau terminé affiche « Fait · Modifier ».
3. **« Déjà noté par le coach »** : la phrase d'origine entre guillemets, sa source et sa date, la question à laquelle elle répond, boutons « C'est ça » et « Corriger ».
4. **Vos inspirations [métier]** : trois vignettes, lien « Ajouter », phrase « Elles nourrissent la note des [métier] ».
5. **Vos [métier]** : les prestataires de ce métier avec leur note sur 100. Tant que l'essentiel n'est pas fait : « Notes provisoires : elles s'affinent après l'essentiel. »
6. **Brief [métier]** : « Prêt dès les détails remplis », puis « Envoyer » une fois prêt. Après les questions d'un pro : « Questions à poser » (section 6.5).

### 4.3 L'écran de question (maquettes `Question-photos`, `Question-curseur`, `Question-jpa`)

- **Une question par écran**, en plein écran, sans barre du bas.
- En haut : bouton fermer (retour à la page de la tuile, réponses conservées), « [TUILE] · [NIVEAU] · n SUR N » et une barre segmentée.
- Le libellé en `--f-accroche`, puis la phrase **« Sert à … »** en `--muted`.
- La zone de réponse selon le format (codes de l'inventaire) :
  - **CP** cartes photo et **CC** ceci ou cela : cartes à photo, choix multiples cumulables, coche corail sur les cartes choisies ;
  - **CU** curseur : 5 crans, le libellé du cran courant affiché en grand, les deux pôles en dessous ; pastilles « Nous ne sommes pas pareils » et « Aucune idée » ;
  - **JPA** : une ligne par option, trois boutons « Jamais · Pourquoi pas · Absolument » ; un nouvel appui sur le bouton choisi l'annule ; « + Ajouter » une option libre ;
  - **CM**, **CL**, **TL**, **CH** : composants existants de l'app.
- Sous chaque question : **« Dire ou écrire autre chose »** (dictée, texte libre, photo).
- En bas : « Passer » et « Suivant ». Aucune réponse obligatoire.
- Après la dernière question du niveau : écran de fin de niveau (4.4).
- Une question déjà pré-remplie par le coach s'affiche avec sa réponse et la mention « Déjà noté par le coach · à confirmer ».

### 4.4 La fin d'un niveau (maquette `Recompense.dc.html`)

1. En-tête sur `--hero-b` : coche, « [TUILE] · L'ESSENTIEL, C'EST FAIT », puis « Voilà ce que nous avons compris : » et **une phrase** en `--f-accroche`, avec les mots du couple. Boutons « C'est ça » et « Corriger » (ouvre la phrase en édition).
2. **« Vos [métier], recalculés »** : chaque prestataire du métier avec l'ancienne note barrée, la nouvelle, l'écart en pastille (vert si hausse, rouge si baisse), et une ligne « Pour vous : … » ou « À vérifier : … ». Sans prestataire : « Voulez-vous que le coach en cherche ? » (règle de recherche internet inchangée : accord du couple).
3. **La jauge** : nouveau pourcentage et « +N points ».
4. Action principale vers le niveau suivant (« Continuer avec les détails · votre brief [métier] à la clé »), action secondaire « Plus tard ».

Fin des détails : même écran, avec « Votre brief [métier] est prêt » et « Envoyer ». Fin des questions d'un pro : « Vos questions à poser sont prêtes », avec un lien vers la fiche de chaque prestataire.

## 5. Le catalogue de questions

- Les 19 tuiles et leurs questions sont décrites dans **un fichier de données** (pas dans le code des écrans), traduisible, avec pour chaque question :
  - identifiant stable, tuile, niveau, ordre ;
  - format, libellé, phrase « Sert à », choix (identifiant et libellé de chacun) ;
  - pays concernés (questions « FR ») ;
  - `secret` (questions de tenue, section 6.8), `parPartenaire` ;
  - condition d'affichage ou de grisage (section 6.2) ;
  - lien vers une question du parcours d'arrivée (« arrivée Q n ») : même identifiant, jamais de double saisie.
- Les tuiles portent : famille, ordre, « Remonte à » (en mois avant le mariage), métiers de prestataires rattachés, photo d'illustration.
- **Photos d'illustration** : pas encore fournies. Prévoir un emplacement neutre aux couleurs de l'app, une photo par tuile et par carte CP ou CC.

## 6. Règles métier

### 6.1 Réponses
1. Aucune réponse obligatoire. Une question est répondue dès qu'elle a un choix, un texte ou une photo.
2. Les réponses sont enregistrées à chaque geste : quitter un écran ne perd rien.
3. Version commune (règles du parcours d'arrivée inchangées) : une seule version des envies, modifiable par les deux ; sur un choix multiple, on garde tous les choix des deux partenaires. **Exception : la tuile Tenues** (6.8).

### 6.2 Tuiles grisées et conditionnelles
1. « Jamais » sur la première question d'une tuile la grise : « Pas pour nous », questions retirées de la jauge, tuile réactivable d'un appui.
2. **Officiant** : active seulement si une cérémonie laïque est choisie et que « Un officiant professionnel » est coché dans « Qui officie ? ». Sinon grisée, avec la raison (« Un proche officie »).
3. **Le lendemain** : remonte seulement si « Un week-end » ou « Un brunch » est choisi au fil rouge.
4. **Wedding planner** : grisée si tous les accompagnements sont sur « Jamais ».
5. Les questions marquées pour un autre pays ne s'affichent pas.

### 6.3 « À explorer maintenant »
Une seule carte. Choisir la tuile, dans cet ordre :
1. tuile dont le niveau essentiel n'est pas fait et dont **le moment est venu** (« Remonte à » atteint par rapport à la date du mariage), avec un prestataire de ce métier non réservé ou aucun prestataire ;
2. à égalité : la plus en retard sur son « Remonte à », puis celle qui fait partie des priorités du couple ;
3. le Lieu passe en premier tant qu'il n'est pas réservé ;
4. sans date de mariage : ordre des familles ;
5. tout l'essentiel fait : proposer les détails de la tuile prioritaire.

La phrase de la carte dit pourquoi maintenant (« Les bons photographes se réservent environ 14 mois avant »). Les tuiles grisées ne sont jamais proposées.

### 6.4 État des tuiles et jauge
- Mot d'état : « À découvrir » (aucun niveau), « Esquissée » (essentiel fait), « Brief prêt » (détails faits), « Brief prêt · complet » (trois niveaux), « C'est le moment » (tuile de la carte 6.3), « Pas pour nous » (grisée), « Chacun la sienne » (Tenues).
- Un niveau est « fait » quand toutes ses questions ont été vues, répondues ou passées.
- **Jauge globale** : essentielles 60 %, détails 30 %, questions d'un pro 10 %, calculés sur les questions répondues des tuiles non grisées. Les questions secrètes comptent sans rien révéler.
- **Jamais de pourcentage par tuile, jamais de « 0 % » affiché.** Sans aucune réponse : « Lamaelle apprend à vous connaître ».

### 6.5 Récompenses
- **Fin de l'essentiel** : phrase « Voilà ce que nous avons compris », recalcul des notes des prestataires **de ce métier seulement**, écarts affichés.
- **Fin des détails** : brief du métier généré (`pdfBriefs`, par métier), disponible dans la tuile et dans la ligne « Briefs prestataires ».
- **Fin des questions d'un pro** : liste « Questions à poser », ajoutée à la fiche de chaque prestataire du métier.
- Une réponse modifiée après coup ne relance rien tout de suite : le recalcul se fait à la sortie de la tuile, une seule fois.

### 6.6 Coût de l'IA
- Aucun appel IA par réponse. Les appels se font **en fin de niveau** (phrase, notes, brief, questions à poser) et à la sortie d'une tuile modifiée.
- Le recalcul des notes ne touche que les prestataires du métier concerné.
- Respecter les niveaux Éco / Équilibré / Max et le budget mensuel existants.

### 6.7 Récolte passive
- Le coach repère des réponses dans les conversations, les notes de visite, les photos et Pinterest, lors de ses passages existants (pas de nouvel appel dédié).
- Chaque proposition garde : la question visée, la réponse proposée, la phrase d'origine, sa source et sa date.
- Elle s'affiche en « Déjà noté par le coach » dans la tuile et sur la question, et dans l'encart de l'onglet. Elle ne compte dans la jauge et dans les notes **qu'une fois confirmée**. « Corriger » ouvre la question.
- Une proposition sur une question secrète n'est montrée qu'à son auteur.

### 6.8 Tuile Tenues : réponses séparées et secrètes
Décisions de Julien. Questions marquées `parPartenaire` et `secret` dans le catalogue ; les questions communes de la tuile (témoins, code vestimentaire, alliances) suivent la règle normale.

1. Chaque partenaire répond pour sa tenue. L'autre voit seulement « Tenue de [prénom] · secrète » et l'avancement, jamais les réponses, photos ou inspirations.
2. **Le secret est garanti côté serveur** : les réponses secrètes et tout ce qui en découle sont stockés à part, lisibles par leur auteur seul dans les **règles Firestore**. Masquer à l'affichage ne suffit pas.
3. **Coach** : les données secrètes n'entrent jamais dans le contexte d'une conversation commune, du point de la semaine ou d'une synthèse. Elles n'entrent que dans les échanges du coach avec leur auteur.
4. **Prestataires de tenue** (boutiques, créateurs, retoucheurs) : fiches, notes, devis, visites et e-mails visibles par leur auteur seul.
5. **Brief tenue** : généré et envoyé par son auteur seul, absent des briefs communs.
6. **Budget** : poste « Tenue de [prénom] » avec son montant, sans détail. Le total reste juste.
7. **Planning et rendez-vous** : affichés à l'autre comme « Rendez-vous tenue de [prénom] », sans lieu ni boutique.
8. L'auteur peut lever le secret (« Montrer ma tenue à [prénom] »).

Si le modèle de données actuel (une base par couple, sans espace privé) rend une de ces règles difficile, **le signaler avant de coder**.

## 7. Correspondance avec l'existant

1. Lister les 15 catégories actuelles et toutes leurs questions, avec le nombre de réponses saisies.
2. Produire un tableau **ancienne question → nouvelle question** (tuile, niveau), ou « à archiver ».
3. Reprise des réponses :
   - choix qui correspondent : repris tels quels ;
   - choix sans équivalent ou texte libre : repris dans le texte libre de la nouvelle question, marqué « Réponse précédente » ;
   - question archivée : sa réponse reste lisible dans la synthèse et alimente toujours le coach.
4. Réponses existantes sur les tenues : le modèle actuel ne sait pas qui a répondu. Les garder communes et demander à chaque partenaire, à sa première ouverture de la tuile, s'il veut les reprendre en secret.
5. **Rien n'est supprimé.** Les briefs déjà générés restent disponibles, et les états des tuiles sont calculés à partir des réponses reprises.
6. **Soumettre le tableau à Julien avant toute migration**, puis migrer avec une sauvegarde préalable des données.

## 8. Sorties IA

| Sortie | Quand | Contenu |
|---|---|---|
| « Voilà ce que nous avons compris » | Fin de l'essentiel d'une tuile | Une phrase, avec les mots du couple entre guillemets si possible |
| Notes recalculées | Fin de l'essentiel, sortie d'une tuile modifiée | Note sur 100, écart, une ligne « Pour vous » ou « À vérifier » |
| Brief du métier | Fin des détails | PDF par métier, à partir de toutes les réponses de la tuile et du fil rouge |
| Questions à poser | Fin des questions d'un pro | 3 à 6 questions par prestataire du métier |
| Propositions de réponses | Passages existants du coach | Question visée, réponse, phrase d'origine, source, date |

Mention conservée partout où une note s'affiche : « L'analyse est faite par une IA. Elle éclaire votre choix, elle ne décide pas pour vous. »

## 9. Hypothèses et points non couverts

- Les **photos d'illustration** des tuiles et des cartes sont à fournir.
- Les **noms de prestataires** des maquettes (Atelier Lumière, Studio Noir) sont des exemples.
- Le **parcours d'arrivée** n'est pas encore codé : ses sept questions doivent déjà exister dans le catalogue, avec les identifiants qu'il utilisera.
- **Non couverts** : l'accès d'un wedding planner à l'espace (seule la question existe), l'adaptation des questions par pays (seul le marquage « FR » est prévu), la traduction elle-même.

## 10. Lots de livraison

1. **Lot 1 — Catalogue, écrans et migration** : fichier de questions, onglet, page de tuile, écrans de question (tous les formats), états des tuiles, jauge, tuiles conditionnelles, correspondance et migration (après validation de Julien).
2. **Lot 2 — Récompenses** : écran de fin de niveau, phrase, recalcul des notes par métier, briefs par métier, questions à poser, carte « À explorer maintenant ».
3. **Lot 3 — Récolte passive** : propositions du coach, encart, confirmation.
4. **Lot 4 — Tenue secrète** : stockage privé, règles Firestore, filtrage du contexte du coach, prestataires, budget et planning. Avant ce lot, la tuile Tenues fonctionne avec des réponses séparées mais **sans** promettre le secret dans l'interface.

## 11. Critères d'acceptation

Onglet et tuiles :
- À l'ouverture, on voit la phrase du couple, la jauge et la carte « À explorer maintenant ».
- Les 19 tuiles sont rangées en 7 familles ; chacune montre trois traits et un mot d'état ; aucun « 0 % » nulle part.
- Une tuile grisée reste visible et se réactive d'un appui ; ses questions sortent de la jauge.
- L'Officiant n'est actif qu'avec une cérémonie laïque et un officiant professionnel.
- Les briefs et toutes les inspirations sont atteignables en un appui depuis l'onglet.

Questions :
- Une question par écran, avec sa phrase « Sert à » ; « Passer » sur chaque question ; aucun blocage.
- Tous les formats fonctionnent au doigt (zones de 44 px au moins), en clair et en sombre.
- Fermer une question en cours conserve les réponses ; « Reprendre » revient à la bonne question.
- Les réponses du parcours d'arrivée apparaissent dans les bonnes tuiles, sans double saisie.

Récompenses et IA :
- La fin de l'essentiel affiche une phrase et les notes recalculées des seuls prestataires du métier.
- Aucun appel IA n'est fait à chaque réponse.
- Une proposition du coach ne compte qu'une fois confirmée.

Tenue secrète :
- Connecté comme l'autre partenaire, aucune donnée secrète n'est lisible : ni à l'écran, ni par une requête directe à la base, ni dans une réponse du coach, ni dans un brief, le budget ou le planning.
- Le budget total reste juste ; « Montrer ma tenue » lève le secret.

Migration :
- Le tableau de correspondance a été validé par Julien avant la migration ; aucune réponse existante n'est perdue.
