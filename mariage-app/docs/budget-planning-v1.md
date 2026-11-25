# Lamaelle — Budget et Planning v1 : dossier d'intégration

Version du 22 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`, branche `main`.

Ce dossier refond deux pages ouvertes depuis les tuiles de l'accueil : **Budget** et **Planning** (qui absorbe l'Agenda). Il décrit le **comportement attendu**, pas l'implémentation, et il a été rédigé sans accès au code.

Références visuelles validées par Julien : canvas **« Lamaelle – Budget »** (5 artboards) et **« Lamaelle – Planning »** (5 artboards). Ils fixent la structure et la hiérarchie, **pas les couleurs ni les polices**. Les zones colorées sont des emplacements de photos. Les noms, montants, dates et pistes du coach sont des exemples.

## 1. Mode d'emploi

1. Lis `CLAUDE.md`, `docs/accueil-v3.md`, `docs/nos-envies-v1.md` et `docs/prestataires-v1.md`, puis tout le code actuel du budget, du planning, de l'agenda, du rapport PDF et de l'agent mail (devis, échéances, rendez-vous).
2. **Propose un plan avant de coder**, découpé selon les lots de la section 8.
3. Garde l'identité de l'app : variables de rôle de `styles.css` (`--hero-b`, `--accent`, `--accent-soft`, `--coral-ui`, `--bad`, `--muted`, `--line`, `--f-accroche`…), Jost et Cormorant, clair et sombre. Aucune couleur en dur.
4. **Déplacer, jamais supprimer** : toute fonction actuelle reste accessible.
5. Signale tout conflit avec l'existant au lieu de trancher seul, en particulier sur le modèle de données, la migration des périodes et les règles Firestore.
6. Tous les textes d'interface sont externalisés (traduction prévue).
7. Enregistre ce dossier dans `docs/budget-planning-v1.md` et mets `CLAUDE.md` à jour.

## 2. Règles communes aux pages

Ce modèle servira ensuite aux autres pages (Invités, Jour J, Documents…).

- **En-tête sur `--hero-b`** : retour, titre de la page en `--f-accroche`, « + » à droite. Puis **une réponse en grand** (un chiffre ou un nom), **un visuel** (barre ou frise) et **trois compteurs** sur une ligne.
- **Le corps répond à des questions**, dans l'ordre d'urgence : ce qui demande une action d'abord (carte à bord corail ou `--bad`), puis le détail.
- **Chaque ligne renvoie ailleurs** : un poste vers ses prestataires, une tâche vers son mail, son poste de budget ou sa tuile d'envies.
- **Pas de paragraphe d'explication** en tête de page, pas de « 0 » isolé, pas d'étiquette répétée sur chaque ligne.
- **La date du mariage peut être fictive.** Tout ce qui en dépend affiche « date indicative » tant que le couple ne l'a pas confirmée, et tout fonctionne sans date (section 5.6).
- Barre du bas et bouton flottant du coach inchangés ; marge basse suffisante pour que le bouton ne cache jamais de contenu.

## 3. Budget

### 3.1 Le principe

La page répond à trois questions : **« Est-ce qu'on tient ? »**, **« Où arbitrer ? »**, **« Que payer et quand ? »**. Les mots « prévu / engagé / payé » et la définition en tête de page disparaissent : on dit « prévu », « signé », « déjà payé ».

| Aujourd'hui | Demain |
|---|---|
| Paragraphe de définitions, bouton « Ajouter un poste » | « + » dans l'en-tête |
| 4 cartes : total, prévu, engagé, marge | Un grand chiffre « 22 600 € pour 20 000 € », une barre, trois compteurs |
| Marge négative en rouge, sans suite | Carte « À arbitrer » et écran de pistes du coach |
| 14 lignes « X % du budget » | Postes avec barre et état relié aux prestataires (3.4) |
| « Modifier » le budget total | Dans l'écran d'un poste et dans « Arbitrer » (choix « Assumer ») |
| — | Section « À payer » (échéances), page d'un poste, écran vide |

### 3.2 La page (artboards 1 et 4)

1. **En-tête** : « Notre budget ». Étiquette « PRÉVU POUR LE MARIAGE », **montant prévu en grand**, « pour [limite] » à côté.
2. **Barre** sur toute la largeur, échelle = max(limite, prévu) :
   - sous la limite : trois segments **payé**, **signé non payé**, **prévu non signé**, puis l'espace restant ; légende « payé · signé · prévu » et à droite « N € de marge » ;
   - au-dessus : la partie qui dépasse est hachurée en `--bad`, un trait marque « votre limite », « +N € » à droite.
3. **Compteurs** : « signé » (avec % du prévu dès qu'il est non nul), « déjà payé », « par invité (N) ».
4. **« À arbitrer »** (bord corail), seulement si prévu > limite : « N € à trouver ou à assumer », une phrase du coach, « Voir les pistes ». Ouvre 3.3.
5. **« À payer »** : les 3 prochaines échéances (pastille date, quoi, une ligne, montant), la plus proche en corail si elle tombe sous 30 jours. Total « N € à venir » à droite du titre. Bouton « Marquer [échéance] comme payé ». Sans échéance : « Rien à payer pour l'instant », une ligne en pointillés, jamais de « 0 € ».
6. **« Où va l'argent · N postes »** : les 8 plus gros postes (3.4), puis « Voir les N autres postes · total ».

Ordre des sections 5 et 6 : « À payer » passe au-dessus des postes dès qu'une échéance existe (artboard 4) ; avant, il est en dessous (artboard 1).

### 3.3 Arbitrer (artboard 2)

- Plein écran, retour vers le budget. Titre « N € à trouver », une phrase : rien ne change avant validation.
- **2 à 4 pistes** du coach, chacune avec case à cocher : titre, gain en vert (« −1 600 € »), une phrase « pourquoi », une ligne « Ce que vous perdez ». Les pistes s'appuient sur les envies, les devis et les postes du couple.
- Une option **« Assumer : monter la limite à [prévu] »**, toujours présente.
- « Demander d'autres pistes » (nouvel appel au coach).
- **Barre fixe en bas** sur `--hero-b` : nouveau total, écart restant, mini-barre, bouton « Appliquer N pistes ».
- Appliquer modifie les enveloppes concernées (jamais de suppression de poste) et **s'annule d'un geste** (garde-fou existant). « Assumer » fixe la limite au prévu ; la carte « À arbitrer » ne revient qu'au prochain dépassement.
- Mention : « Pistes proposées par une IA à partir de vos envies et de vos devis. Les montants sont des estimations. »

### 3.4 Un poste dans la liste

- Pastille d'initiales sur la teinte du métier (la même que dans Prestataires), nom, montant, barre de largeur proportionnelle au plus gros poste, une ligne d'état.
- Une fois des paiements ou des signatures enregistrés, la barre montre la part payée (corail) et signée (sable).
- **Ligne d'état**, première règle qui s'applique :
  1. réservé : « [Nom] réservé · N € payés » (vert) ;
  2. signé au-dessus de l'enveloppe : « Signé · +N € sur l'enveloppe » (`--bad`) ;
  3. devis reçus : « Meilleur devis N € · ±N € » (`--bad` si au-dessus) ;
  4. candidats sans devis : « N [lieux / photographes…] en lice · aucun devis » (corail) ;
  5. sinon « Estimation », avec un repère utile si possible (« ≈ 122 € par invité » pour le traiteur).

### 3.5 Un poste ouvert (artboard 3)

1. **Photo du métier** en tête, titre en `--f-accroche`, ligne « N % du mariage · [état] ».
2. **« Votre enveloppe »** : montant modifiable avec −/+ (pas de 100 €) et saisie directe. À droite, « Vos envies : ≈ N € » si la tuile Nos envies du métier contient un budget. Si l'écart dépasse 10 %, une phrase le dit.
3. **« Vos devis face à l'enveloppe »** : une barre par candidat (dernier devis), une ligne verticale en pointillés pour l'enveloppe, écart et note de fit sous le nom, « Prix inconnu » sans devis. Lien « Comparer les [métier] » vers la page métier de Prestataires.
4. **« Quand payer »** : échéances du poste ; sans devis signé, une phrase explique qu'elles se créeront à la signature.
5. **« Autres dépenses du poste »** : ajouter une dépense hors prestataire (album, tirages, achats déco).

Un poste sans métier (« Gestion du risque ») n'a ni photo ni section devis.

### 3.6 Budget vide (artboard 5)

Affiché tant qu'il n'y a **ni limite ni poste**.
- Titre « Combien voulez-vous consacrer à votre mariage ? », une phrase : un ordre de grandeur suffit.
- Champ montant, trois pastilles (15 000, 20 000, 30 000 €), ligne « Pour N invités, soit ≈ N € par personne » si la liste existe.
- Encart du coach : il répartit selon les envies, pas selon une moyenne ; aperçu en barre.
- Boutons « Répartir mon budget » (le coach propose des postes, le couple valide), « Aucune idée : estimer avec le coach », lien « Saisir mes postes moi-même ».

### 3.7 Règles

- **Par invité** = prévu ÷ invités attendus (présents + en attente, hors absents). **Corrige le calcul actuel**, qui divise par les seuls présents (7 533 € au lieu de 551 €).
- Prévu = somme des enveloppes. Signé = montants des prestataires réservés (règle 6.6 de `docs/prestataires-v1.md`) + dépenses saisies comme signées. Payé = paiements marqués.
- **Échéances** : créées à la réservation à partir des conditions du devis lues par l'agent mail (acompte, solde, dates). Si les conditions sont inconnues : acompte 30 % à la signature et solde 7 jours avant le mariage, marqués « à confirmer », modifiables. **À vérifier** : l'agent mail sait-il déjà lire ces conditions ? Sinon, le signaler et commencer par la saisie manuelle.
- Un poste est rattaché à un métier du catalogue de Nos envies quand il en existe un ; les postes libres restent possibles.

## 4. Planning

### 4.1 Le principe

La page répond à deux questions : **« Qu'est-ce qu'on fait maintenant ? »** et **« Le chemin jusqu'au jour J »**. Tâches et Agenda deviennent **une seule page** : un rendez-vous est un élément du planning avec une heure et un lieu.

| Aujourd'hui | Demain |
|---|---|
| Onglets Tâches / Agenda | Une page ; vue calendrier par une icône (4.6) |
| Paragraphe sur le calcul des échéances | Supprimé |
| Rapport PDF et « Ajouter » en tête | « + » dans l'en-tête ; rapport PDF en bas de page |
| Filtre Tout / Claire / Julien / Ensemble, « Masquer les faites » | Pastilles Tout / Claire / Julien ; les faites sont repliées par défaut |
| Périodes « 12 mois avant »… avec 59 tâches dépliées | 9 étapes nommées, une frise, une seule étape ouverte à la fois |
| Retards au milieu de leur période | Section « En retard » en tête, avec une action du coach |
| Pastille « Les deux » sur chaque ligne | Affichée seulement si une seule personne s'en occupe |

### 4.2 La page (artboard 1)

1. **En-tête** : « Notre planning ». Étiquette « ÉTAPE N SUR 9 », **nom de l'étape en grand**, une phrase sur ce qu'elle couvre.
2. **Frise** : un point par étape, l'étape courante en corail avec un halo, une étoile au bout ; « Aujourd'hui » à gauche, date du mariage à droite (« date indicative » si non confirmée).
3. **Compteurs** : « en retard » (corail s'il y en a), « faites » (N / total), « rendez-vous à venir ».
4. **Pastilles Tout / Claire / Julien** (mémorisées par personne) et une icône calendrier qui ouvre 4.6.
5. **« En retard · N »** (bord `--bad`), seulement s'il y en a : case à cocher, titre, ligne « date · origine », bouton du coach (4.7).
6. **« Prochainement »** : les 4 à 6 prochains éléments sur 60 jours, tâches et rendez-vous mêlés, triés par date. Pastille date (corail pour un rendez-vous), titre, une ligne, **lien vers l'objet relié** en corail (« Voir le photographe », « Ouvrir le budget · 2 600 € à arbitrer »).
7. **« Le chemin jusqu'au jour J »** : une ligne par étape, reliées par un trait vertical, avec nom, période et « N / M ». L'étape courante est en gras et en corail. Chaque ligne ouvre 4.3.
8. **Rapport d'organisation en PDF** : ligne en bas de page (fonction existante).

### 4.3 Une étape (artboard 2)

- **Photo** en tête, « ÉTAPE N SUR 9 · [période] », nom en `--f-accroche`, barre de progression « N sur M ».
- **Tâches rangées par thème**, chaque groupe avec un lien vers la page concernée (« LE LIEU · 3 lieux en lice », « LES GRANDS CHOIX · Nos envies », « L'ARGENT · Budget »). Rond : vide (à faire), corail (en retard, date en `--bad`), à moitié plein (en cours).
- Tâches faites repliées : « N faites · [titre de la dernière] ».
- Carte **« Ensuite »** : nom de l'étape suivante et nombre de tâches.

### 4.4 Une tâche (artboard 3)

- Retour, étiquette d'état (« En retard de N jours », « En cours »…), titre.
- **Échéance** (modifiable), **Qui s'en occupe** (Claire / Julien / Les deux), **Étape** (« Les fondations · Le lieu »).
- **« Relié à »** : prestataire, e-mail d'origine, poste du budget, tuile de Nos envies. Chacun s'ouvre d'un appui ; on n'affiche que ce qui existe.
- **« Le coach peut aider »**, si une action existe (4.7).
- **Note** libre.
- **Barre fixe** : « Reporter » (+1 semaine, +1 mois, choisir une date) et **« C'est fait »**.

Un rendez-vous a la même page, avec l'heure, le lieu et « Ajouter à mon téléphone » en plus.

### 4.5 Les étapes

Les périodes « N mois avant » sont remplacées par **9 étapes nommées** :

| # | Étape | Fin par défaut |
|---|---|---|
| 1 | Les fondations | 9 mois avant |
| 2 | Les prestataires clés | 6 mois avant |
| 3 | Tenues, liste et site | 4 mois avant |
| 4 | Faire-part et détails | 2 mois avant |
| 5 | Mairie et confirmations | 1 mois avant |
| 6 | Les derniers réglages | 8 jours avant |
| 7 | La dernière semaine | la veille |
| 8 | Le jour J | le jour même |
| 9 | Après le mariage | 2 mois après |

- **La première étape commence à la création du compte**, quelle que soit la distance au mariage. C'est le défaut actuel : « 12 mois avant » dure près de deux ans quand le couple s'y prend tôt.
- L'**étape courante** est la première qui a des tâches non faites dont la fin n'est pas passée. Si toutes sont faites, c'est l'étape dont la période contient aujourd'hui.
- Les échéances des tâches restent calculées comme aujourd'hui : une échéance précise sur une tâche prend le dessus.
- Le **thème** d'une tâche (lieu, grands choix, prestataires, argent, invités, papeterie, mairie, logistique…) vient du catalogue de tâches. À défaut, Claude Code propose un rattachement.

### 4.6 Vue calendrier (artboard 4)

- Mois affiché (flèches), grille L→D, points sous les jours : rendez-vous (corail), à confirmer (doré), échéance de tâche (gris). Légende en bas.
- Jour choisi : la liste de ses éléments, avec pour un rendez-vous « Ajouter à mon téléphone » (fichier .ics) et « Préparer avec le coach ».
- « Ailleurs ce mois-ci » : les autres éléments du mois.
- Un rendez-vous « à confirmer » s'affiche en pointillés.

### 4.7 Les actions du coach sur une tâche

| Tâche | Bouton | Effet |
|---|---|---|
| Née d'un e-mail qui attend une réponse | Rédiger la réponse | Brouillon ouvert dans l'app mail du téléphone ou copié ; **l'app n'envoie rien** (accès Gmail en lecture seule) |
| Visite ou rendez-vous à caler | Proposer des créneaux | Le coach propose 3 créneaux libres et rédige le message |
| Liée à un métier | Voir le [métier] | Ouvre la page métier de Prestataires |
| Liée au budget | Ouvrir le budget | Ouvre le Budget, sur « Arbitrer » s'il y a un dépassement |
| Rendez-vous à venir | Préparer avec le coach | Ouvre le coach avec les envies du métier et les questions à poser |

Aucune action ne correspond : pas de bouton.

### 4.8 Planning vide (artboard 5)

Affiché à la première ouverture, quand le planning vient d'être généré.
- « Votre chemin est prêt. » et une phrase : N tâches en 9 étapes, construites à partir de la date et des envies.
- Carte date (« Juin 2028 · Date indicative », bouton « Changer »).
- **« Adapté à vous »** : 2 ou 3 lignes sur ce qui a été ajouté ou retiré selon Nos envies (cérémonie laïque → officiant, pas d'église ; pas de vidéaste → tâche retirée).
- **« Vos 3 premières tâches »**, puis « Voir tout le chemin » et « Ajouter une tâche à moi ».
- **Générer le planning à partir des envies est une évolution.** Si le générateur actuel ne sait pas filtrer selon les envies, livrer d'abord cet écran sans « Adapté à vous » et le signaler.

## 5. Données et migration

1. Rendez-vous de l'agenda → éléments du planning de type « rendez-vous » (date, heure, lieu, prestataire, statut « à confirmer »). Rien n'est perdu.
2. Périodes → étapes : proposer un **tableau période actuelle → étape et thème** pour chaque tâche, et **le soumettre à Julien avant la migration**. Sauvegarde préalable.
3. Une tâche peut porter des liens : prestataire, mail d'origine, poste de budget, tuile de Nos envies.
4. Budget : limite, postes (enveloppe, métier facultatif), dépenses, échéances (montant, date, « à confirmer », payée ou non). Garder les données existantes ; le « prévu » actuel d'un poste devient son enveloppe.
5. La répartition « qui s'en occupe » garde les valeurs actuelles (Claire, Julien, Les deux).
6. **Sans date** : la frise et le chemin affichent les étapes sans période ; « Prochainement » se limite aux tâches datées et aux rendez-vous ; une ligne invite à fixer une date indicative. **Date indicative** : tout est calculé normalement, avec la mention « date indicative » partout où la date apparaît.

## 6. Coût de l'IA

- **Aucun appel IA à l'affichage** du Budget, du Planning, d'une étape, d'une tâche ou du calendrier : tout est lu depuis la base.
- Appels seulement sur action : pistes d'arbitrage (ouverture de « Arbitrer » si aucune piste en cache, ou « Demander d'autres pistes »), répartition du budget vide, actions du coach (4.7), génération du planning adapté.
- La phrase de la carte « À arbitrer » réutilise les pistes en cache ; sinon, phrase fixe.
- Lecture des conditions de paiement : dans le passage existant de l'agent mail sur un devis, pas d'appel à part.
- Respecter les niveaux Éco / Équilibré / Max et le budget mensuel existants.

## 7. Sorties IA

| Sortie | Quand | Contenu |
|---|---|---|
| Pistes d'arbitrage | Ouverture de « Arbitrer » | 2 à 4 pistes : titre, gain estimé, pourquoi, ce que le couple perd ; rien d'inventé sur les prestataires |
| Répartition du budget | Budget vide | Postes et montants proposés à partir des envies et du nombre d'invités, à valider |
| Conditions de paiement | Devis lu par l'agent mail | Acompte, solde, dates ; inconnu = vide, jamais deviné |
| Réponse à un mail | Bouton du coach | Brouillon court, à relire |
| Créneaux | Bouton du coach | 3 créneaux sans conflit avec le planning, message rédigé |
| Planning adapté | Génération | Tâches ajoutées ou retirées selon les envies, avec la raison |

Mention sous toute piste ou proposition chiffrée : « Proposé par une IA. Les montants sont des estimations. »

## 8. Lots de livraison

1. **Lot 1 — Budget** : page (3.2) avec barre, compteurs et postes (3.4), correction « par invité », poste ouvert (3.5). Sans arbitrage ni échéances automatiques : la carte « À arbitrer » ouvre le coach en attendant.
2. **Lot 2 — Planning** : migration des périodes vers les étapes (après validation), page (4.2), étape (4.3), tâche (4.4), rendez-vous dans le planning, retrait de l'onglet Agenda.
3. **Lot 3 — Le coach dans les pages** : Arbitrer (3.3), actions du coach sur les tâches (4.7), échéances depuis les devis et section « À payer ».
4. **Lot 4 — Calendrier et états vides** : vue calendrier (4.6), budget vide (3.6), planning vide (4.8).

Livrer le lot 1, laisser Julien le tester sur iPhone, puis enchaîner.

## 9. Critères d'acceptation

Budget :
- À l'ouverture, on voit le prévu en grand, la limite, la barre et les trois compteurs, sans paragraphe d'explication.
- « Par invité » divise par les invités attendus (551 € pour 22 600 € et 41 invités).
- Au-dessus de la limite, la barre montre le dépassement et la carte « À arbitrer » apparaît ; sous la limite, la marge s'affiche et la carte disparaît.
- Chaque poste montre un état relié aux prestataires et s'ouvre sur sa page ; l'enveloppe se modifie depuis cette page.
- Appliquer des pistes ou « Assumer » s'annule d'un geste ; aucun poste n'est supprimé.

Planning :
- À l'ouverture, on voit l'étape courante, la frise et les compteurs ; les retards sont en tête.
- Il n'y a plus d'onglet Agenda ; les rendez-vous sont dans « Prochainement » et dans la vue calendrier.
- « Les deux » n'apparaît dans aucune liste.
- Une seule étape s'ouvre à la fois ; les tâches faites sont repliées.
- Une tâche née d'un e-mail montre ce mail et propose une réponse ; l'app n'envoie aucun mail.
- Sans date ou avec une date indicative, les deux pages restent complètes et le disent.

Commun :
- Aucun appel IA à l'affichage ; clair et sombre vérifiés ; zones tactiles de 44 px au moins ; le bouton du coach ne cache jamais de contenu.
- Le tableau de migration des tâches a été validé par Julien avant la migration ; aucune tâche, aucun rendez-vous ni montant n'est perdu.
