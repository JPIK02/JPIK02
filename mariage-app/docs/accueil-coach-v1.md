# Lamaelle — Accueil Coach v1 : dossier d'intégration

Version du 15 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`.

Ce dossier refond la page d'accueil (vue `apercu`, onglet Coach) **dans l'app telle qu'elle est aujourd'hui**, pour le couple déjà installé. Le parcours d'arrivée (dossier séparé) sera intégré **après** : il ajoutera des états à cet accueil (bandeau de reprise, synthèse à deux, invité verrouillé, premier message du coach). Une v2 de ce dossier les décrira. Ne rien en coder maintenant.

Maquette de référence : canvas « Lamaelle – Accueil Coach », artboard « Quelques mois plus tard · accueil commun » (structure et contenu). L'artboard « Jour 1 » montre les tuiles vides (« Commencer »).

## 1. Mode d'emploi

1. Pars de la **dernière version du code** : la branche `claude/cool-cori-ipe48i` est en avance sur `main` (commits du 15 novembre). Vérifie avec Julien laquelle est déployée avant de créer ta branche.
2. Lis `CLAUDE.md`, puis `vApercu()`, `coachHome()`, `alerts()`, `qrFor()`, `runQr()`, `renderBnav()`, `openMore()`, `renderHero()`, `onboardH()` et les notifications push. Propose un plan avant de coder.
3. **Garde l'identité actuelle, qui est définitive** : variables de rôle de `styles.css`, Jost et Cormorant, thèmes clair et sombre. La maquette fixe la structure et la hiérarchie, **pas les couleurs ni les polices** (elle a été dessinée avec une autre palette).
4. Réutilise l'existant partout : `alerts()`, `dayCard()`, `qrFor()`/`runQr()`, `visitsToTell()`, `coupleAvatar()`, `openChat()`, `enablePush()`, `S.hebdo`, `S.profil`, `S.briefs.filRouge`.
5. **Déplacer, jamais supprimer** : tout ce qui quitte l'accueil doit rester accessible ailleurs (section 5).
6. Signale tout conflit au lieu de trancher seul.

## 2. Le principe

L'accueil est le **point d'entrée de toute l'app** et doit la rendre simple. Il répond à trois questions, dans cet ordre :

1. **Que dois-je faire maintenant ?** Une partie qui bouge : 1 à 3 cartes.
2. **Que me dit le coach ?** Une carte avec son dernier message et un champ pour lui écrire.
3. **Où trouver le reste ?** Une partie fixe : la carte « Nos envies » et cinq tuiles, toujours au même endroit.

Règle de simplicité : **toute fonction est atteignable en deux gestes au plus depuis l'accueil.**

## 3. Écart avec l'accueil actuel

| Aujourd'hui sur l'accueil | Demain |
|---|---|
| Bandeau (`hero`) avec prénoms, compte à rebours, frise des périodes | Sur l'accueil seulement : remplacé par l'en-tête de page (4.1). Inchangé ailleurs |
| `coachHome` : avatar, « Bonjour », date | En-tête (4.1) |
| Point de la semaine repliable | Devient le message de la carte Coach (4.3) |
| « Aujourd'hui · N points » (`dayCard`) | Devient « À faire maintenant » (4.2), même mécanique |
| « Vos 3 prochaines actions » | La plus urgente devient une carte « À faire » ; la suivante s'affiche sur la tuile Planning |
| « Prochains rendez-vous » | Tuile Planning ; les rendez-vous à 14 jours restent des alertes |
| « Bien démarrer » (`onboardH`) | Retiré : les tuiles « Commencer » et les cartes « À faire » le remplacent |
| « Vue d'ensemble » (KPI, jalons, paiements, qui fait quoi, budget par poste, assistant e-mails) | Retirée de l'accueil ; chiffres clés dans les tuiles, le reste déplacé (section 5) |
| Bouton flottant « Coach » | Masqué sur l'accueil (la carte Coach le remplace), conservé sur les autres pages |
| Barre du bas : Coach, Planning, Prestataires, Nos envies, Plus | Coach, Nos envies, Prestataires (4.5) |

## 4. Le nouvel accueil, de haut en bas

Une colonne sur mobile. Au-delà de 760 px : même ordre, largeur de lecture limitée, tuiles sur trois colonnes.

### 4.1 En-tête
- Symbole Lamaelle, prénoms (`COUPLE(" & ")`), puis `J-n · date longue` (« indicative » si `dateIndicative`). Sans date : « Date pas encore fixée », qui ouvre Réglages.
- À droite : la photo du couple (`coupleAvatar`), qui **ouvre Réglages** au lieu de changer la photo. Le changement de photo reste dans Réglages > Général.
- Pas de frise des périodes sur l'accueil (elle reste dans Planning si utile).

### 4.2 « À faire maintenant »
- 3 cartes au plus, classées ; lien « Voir les N autres » si besoin (mécanique `S.ui.more` existante).
- Sources, par priorité :
  1. alertes `bad` de `alerts()` ;
  2. propositions de l'agent mail (`sugs`) : carte mise en avant, « Valider en un geste » → vue `assistant` ;
  3. visites à raconter (`visitsToTell`) ;
  4. alertes `warn`, puis `info` (rendez-vous, analyse à relancer, envies peu remplies) ;
  5. notifications non activées (`S.pushState` = `off` ou `install`) : « Recevoir le point de la semaine » → `enablePush()` ou explication d'installation sur iPhone ; masquable ;
  6. si rien d'autre : la prochaine tâche ouverte du planning, comme « prochaine étape ».
- **Jamais vide** : il y a toujours au moins la carte 6. Le message « Tout est cohérent » disparaît.
- Chaque carte garde un seul bouton principal et ses « Autres options » (`dayCard`, `qrFor`). La première carte est mise en avant visuellement, comme sur la maquette.
- Toute nouvelle règle d'alerte reste dans `alerts()`.

### 4.3 Carte Coach
- Titre « Point de la semaine » si `S.hebdo` est frais (moins de 8 jours) : son titre et sa question, lien « Lire le point » (déroulé actuel). Sinon « Votre coach » avec une phrase d'invite et le lien « Faire le point de la semaine ».
- Champ « Demandez ou dites ce que vous voulez faire » avec dictée : il ouvre la conversation **en plein écran** (`openChat("chat", texte)`), jamais dans l'accueil.
- Trois suggestions en pastilles, tirées de l'état de l'app, sans appel IA : par exemple le prochain prestataire clé non réservé (« Trouver un photographe »), un devis au-dessus de l'enveloppe (« Négocier le devis… »), des invités sans réponse (« Relancer les invités »). Repli : « Par quoi commencer cette semaine ? ». Chaque pastille envoie une question (`ask:`).
- La règle de recherche internet ne change pas.

### 4.4 « Votre mariage »
Partie fixe : même ordre, même place, toujours affichée. Chaque élément ouvre sa page. Sans données, il affiche « Commencer » au lieu de disparaître.

| Élément | Contenu | Sans données |
|---|---|---|
| **Nos envies** (pleine largeur) | `briefs.filRouge.titre`, sinon la première phrase de `profil.resume` ; puis les 3 premières `profil.priorites` (catégories) ; « N points dont vous reparlez » si `profil.divergences` | « Racontez vos envies » → entretien avec le coach (`chatbrief`) |
| **Prestataires** | « N suivis · R réservés » (hors écartés) | Commencer → ajout d'un prestataire |
| **Planning** | La plus proche entre la prochaine tâche datée et le prochain rendez-vous (« Prochain : dégustation, jeudi ») ; pastille du nombre de retards | Commencer → Planning |
| **Budget** | « X % engagé » et une barre (engagé sur budget total, sinon sur prévu) ; en `--bad` si dépassement | Commencer → Budget |
| **Invités** | « N réponses sur T » | Commencer → Invités |
| **Jour J** | Nombre d'étapes du déroulé | Commencer → Jour J |

### 4.5 Navigation
- Barre du bas (moins de 760 px) : **Coach, Nos envies, Prestataires**. Plus de bouton « Plus » : Planning, Budget, Invités et Jour J passent par les tuiles, Réglages par la photo du couple.
- Pastilles de la barre : le nombre de propositions à valider sur Coach.
- Au-delà de 760 px, la barre d'onglets du haut ne change pas pour l'instant.
- Le bouton flottant du coach reste sur toutes les pages sauf l'accueil.

## 5. Ce qui quitte l'accueil, et où ça va

| Élément | Nouvelle place |
|---|---|
| Paiements à venir | Page Budget, en tête |
| Budget par poste | Déjà dans Budget |
| Jalons, Qui fait quoi | Page Planning, sous la liste ou dans une section repliable |
| Assistant e-mails (état, dernier passage) | Page E-mails, déjà présente |
| Accès à la page E-mails | Carte « À faire » quand il y a des propositions ; sinon Réglages > Agents IA |
| Briefs prestataires en PDF (aujourd'hui seulement dans Nos envies) | Restent dans Nos envies, **et** s'ajoutent là où l'on contacte les prestataires (section 6) |
| Rapport d'organisation PDF (dans « Plus ») | Page Planning, bouton en tête « Rapport PDF » |
| Agenda, Plan de table | Sous-onglets de Planning et d'Invités (tuile puis sous-onglet : deux gestes) |
| « Bien démarrer » | Retiré ; `mariage-onboard-off` peut rester sans effet |

## 6. Les briefs prestataires, là où on en a besoin

Les briefs PDF sont faits pour être envoyés aux prestataires : ils doivent être sous la main au moment du contact, pas seulement dans Nos envies.

- **Fiche d'un prestataire** : bouton « Brief [métier] (PDF) » quand le brief de sa catégorie est prêt (correspondance métier → catégorie via `VCAT2Q` et `BRIEF_LABEL`). Il ouvre `pdfBriefs(cat)` avec partage direct.
- **Page Prestataires** : bouton en tête « Briefs à envoyer », qui ouvre la même liste que dans Nos envies (tous les briefs, ou un métier). Respecter la règle des 2 boutons au plus en tête de page : signaler si elle est dépassée.
- Si les briefs ne sont pas encore prêts : le bouton propose « Préparer les briefs » (job `briefs` existant).
- Rien ne change dans Nos envies.

## 7. Le coach ouvre la bonne page

Le champ du coach doit aussi servir à **trouver** : « montre-moi le budget », « où sont les invités ? ».

- Nouvel outil de lecture dans `functions/tools.js` : `ouvrir_page` (vue parmi `VIEWS` et sous-vues, plus `fiche` d'un prestataire). Il n'écrit rien et renvoie une action.
- L'app l'affiche dans la conversation comme un bouton « Ouvrir le budget ». Pas de navigation automatique.
- Ajouter la consigne dans `prompt.js` et un test dans `functions/test/tools.test.js`.

## 8. Hors champ (v2, après le parcours d'arrivée)

- Bandeau de reprise, synthèse à deux, relance du conjoint, accès restreint de l'invité.
- Premier message proactif du coach et point d'accueil à J+1.
- Citations du couple dans la carte « Nos envies » et « Prochaines étapes » produites par l'IA.

## 9. Critères d'acceptation

- L'accueil montre, dans l'ordre : en-tête, « À faire maintenant », carte Coach, « Votre mariage ».
- « À faire maintenant » n'affiche jamais plus de 3 cartes sans « Voir les N autres », et jamais zéro carte.
- Les six éléments de « Votre mariage » sont toujours présents, au même endroit, avec « Commencer » quand ils sont vides.
- Chaque vue de l'app est atteignable en deux gestes au plus depuis l'accueil (y compris Agenda et Plan de table). Exception acceptée : E-mails sans proposition, via Réglages.
- Depuis la fiche d'un prestataire, son brief PDF s'ouvre en un geste quand il est prêt ; depuis la page Prestataires, tous les briefs en un geste.
- Le rapport d'organisation PDF s'ouvre depuis Planning.
- Rien n'a disparu : tout élément retiré de l'accueil se retrouve à la place indiquée en section 5.
- Les réponses rapides existantes (`go:`, `fiche:`, `ask:`, `prefill:`, `compare:`, `vstatus:`, `budgetset:` avec « Annuler ») fonctionnent toujours.
- Le champ du coach ouvre la conversation en plein écran avec le texte saisi.
- « Montre-moi le budget » au coach renvoie un bouton qui ouvre Budget.
- Clair et sombre, contrastes, labels et focus visible conformes aux règles de `CLAUDE.md`.
- `CLAUDE.md` est mis à jour : navigation (3 onglets), description de l'accueil, outil `ouvrir_page`, accès aux briefs.

## 10. Identité visuelle

L'identité actuelle de l'app (variables de `styles.css`, Jost et Cormorant, fond ivoire) est **définitive**. La maquette, dessinée avec une autre palette, ne donne que la structure.
