# Lamaelle — Environnements v1 : préprod et prod

Version du 25 novembre 2026. Destinataire : Claude Code, dans le dépôt `mariage-app`.

Aujourd'hui, chaque modification de `main` part directement sur l'app que Claire et Julien utilisent tous les jours. Ce dossier met en place **deux environnements séparés et automatisés** :

- **préprod** pour tester ;
- **prod** pour les vrais couples (Claire et Julien, puis les 10 couples de la bêta).

C'est le préalable au passage à plusieurs couples, qui se fera en préprod.

**Règle n° 1 : ne jamais casser la prod en cours de route.** L'app actuelle doit continuer de fonctionner à chaque étape.

## 0. Avant de modifier quoi que ce soit : l'inventaire (lot 0)

Le dossier a été écrit sans accès au code. Commence donc par lire le dépôt, puis rends un **court rapport à Julien** avant de toucher au code :

- les workflows GitHub Actions existants : déclencheurs, commandes, authentification à Firebase ;
- `firebase.json` et `.firebaserc` : sites d'hébergement, règles, index, fonctions ;
- la région des Cloud Functions et de Firestore ;
- où sont aujourd'hui les secrets (clé Anthropic, client OAuth Gmail, autres) et comment les fonctions les lisent ;
- tout ce qui est écrit en dur pour la prod : ID du projet Firebase, URL, adresses e-mail de Claire et Julien (code **et** règles Firestore), boîte Gmail ;
- les fonctions planifiées (Pinterest quotidien, point du lundi, agent mail…) ;
- les tests existants (`functions/test/…`) et leur commande.

Le rapport liste les écarts par rapport à ce dossier et le plan lot par lot. **Attendre la validation de Julien.**

## 1. La cible

| | Préprod | Prod |
| --- | --- | --- |
| Projet Firebase | nouveau projet (ex. `lamaelle-preprod`) | **projet actuel, inchangé** (il contient les vraies données) |
| Se déploie | automatiquement à chaque modification de `main` | uniquement sur une version validée par Julien |
| Données | fictives, créées par un script | réelles |
| Clé Claude | clé dédiée, plafond mensuel bas | clé actuelle |
| Gmail | boîte de test | boîte du mariage |
| Fonctions planifiées | coupées par défaut | actives |
| Repère visuel | bandeau « PRÉPROD », nom « Lamaelle Préprod » | aucun |

Choix structurant : **le projet actuel devient la prod**, on ne migre aucune donnée. La préprod est un projet neuf, dans **la même région** que la prod (une région Firestore ne se change pas après coup).

## 2. Ce que Julien fait lui-même (avant les lots 2 et 3)

Claude Code donne à Julien la liste exacte des valeurs à lui transmettre ; Julien ne colle jamais de secret dans une conversation.

1. **Firebase** : créer le projet préprod, passer en offre Blaze, activer Firestore (même région que la prod), Authentication avec Google, Hosting et Functions. Ajouter le domaine de la préprod aux domaines autorisés.
2. **Alertes de budget Google Cloud** sur les deux projets (ex. 20 € préprod, 50 € prod).
3. **GitHub** : créer deux environnements dans Settings → Environments, `preprod` et `production`. Pour `production`, cocher « Required reviewers » avec Julien.
4. **Accès de GitHub Actions** à chaque projet Firebase (compte de service ou fédération d'identité, selon ce que Claude Code propose après l'inventaire), rangé dans le secret de l'environnement correspondant.
5. **Anthropic** : créer une seconde clé (idéalement dans un espace de travail séparé) avec un plafond mensuel bas pour la préprod.
6. **Gmail** : créer une boîte de test pour la préprod et un client OAuth propre au projet préprod.

## 3. Les lots

### Lot 1 — Configuration par environnement
- Configuration web Firebase par mode Vite : `.env.preprod` et `.env.prod` (cette configuration est publique, elle peut être versionnée), build avec `vite build --mode preprod|prod`.
- `.firebaserc` avec deux alias, `preprod` et `prod`.
- Supprimer toute valeur de prod écrite en dur dans le code client et serveur : ID de projet, URL, boîte mail.
- La liste des comptes autorisés (adresses de Claire et Julien aujourd'hui) sort du code et des règles vers une configuration par environnement : par exemple, un document `config/acces` lu par les règles Firestore, ou une revendication personnalisée sur le compte. **Ce n'est pas encore le multi-couple** : on rend seulement possible l'ajout de comptes de test en préprod.

### Lot 2 — Secrets et automatismes par environnement
- Tous les secrets serveur passent par les secrets de Cloud Functions (`defineSecret`, Secret Manager), un jeu par projet. Aucun secret dans le dépôt ni dans les journaux.
- Un paramètre `AUTOMATISMES_ACTIFS` (vrai en prod, faux en préprod) coupe les fonctions planifiées. Elles restent déclenchables à la main en préprod pour les tester.
- Le budget IA mensuel et le compteur de coût existants fonctionnent dans chaque environnement, séparément.

### Lot 3 — Déploiement automatisé
- **Contrôle des pull requests** : tests (y compris ceux des règles Firestore avec l'émulateur, s'ils existent) et build.
- **Préprod** : sur chaque modification de `main`, tests, puis build `preprod`, puis déploiement sur le projet préprod (hébergement, fonctions, règles, index). Si un test échoue, rien n'est déployé.
- **Prod** : un workflow « Mettre en prod », lancé à la main depuis l'onglet Actions (utilisable depuis l'iPhone). Il :
  1. demande le numéro de version (ex. `1.0.0`) ;
  2. attend l'approbation de Julien (environnement `production`) ;
  3. déploie en prod exactement le code déjà testé en préprod ;
  4. crée l'étiquette `v1.0.0` et une note de version listant les changements.
- **Bascule** : l'ancien workflow (`main` → prod) n'est désactivé qu'une fois la préprod déployée et vérifiée. D'ici là, tout part en prod comme aujourd'hui.

### Lot 4 — Ne jamais confondre les deux
- En préprod : un bandeau fin « PRÉPROD » en haut de chaque écran, le nom « Lamaelle Préprod » dans le manifeste et le titre, une icône différente (l'app est installée sur l'écran d'accueil de l'iPhone : les deux doivent pouvoir coexister).
- Dans les deux environnements : **la version et l'environnement affichés dans Réglages** (ex. « v1.0.0 · prod »), pour que les testeurs puissent les citer dans leurs retours.

### Lot 5 — Données fictives et documentation
- Un script de remplissage de la préprod : un couple fictif (ex. « Léa & Sam »), une dizaine de prestataires, des envies, quelques invités, un budget. Ne copier **aucune** donnée de prod (RGPD).
- Un script pour remettre la préprod à zéro.
- Mettre à jour `CLAUDE.md` avec :
  - les deux environnements et ce qui les distingue ;
  - comment mettre en prod ;
  - comment revenir en arrière (hébergement : restaurer la version précédente dans la console Firebase ; fonctions : relancer « Mettre en prod » sur la version précédente) ;
  - la règle « on développe et on teste en préprod, jamais directement en prod ».

### Lot 6 — Filets de sécurité en prod
- Sauvegardes Firestore quotidiennes en prod, avec une durée de conservation (ex. 14 jours) et une restauration testée une fois en préprod.
- Alertes par e-mail à Julien sur les erreurs répétées des fonctions en prod.

## 4. Hors champ (dossiers suivants)

- Passage à plusieurs couples : inscription, espace par mariage, cloisonnement des données.
- Page d'administration (indicateurs agrégés de la bêta).
- Conformité RGPD : politique de confidentialité, registre, durées de conservation, contrats avec les sous-traitants.
- Nom de domaine (`app.` et `preprod.`) : à brancher quand il sera réservé.

## 5. Critères d'acceptation

- Une modification fusionnée sur `main` apparaît en préprod sans action manuelle, et **ne touche pas la prod**.
- Un test qui échoue bloque le déploiement.
- La prod ne change qu'après « Mettre en prod » et l'approbation de Julien ; la version apparaît dans Réglages et dans GitHub.
- La préprod fonctionne de bout en bout avec un compte de test et les données fictives : connexion, coach, analyse d'un prestataire, budget, invités.
- Aucun secret dans le dépôt ; chaque environnement a sa propre clé Claude et son propre budget.
- Les fonctions planifiées ne tournent pas en préprod, sauf déclenchement manuel.
- Les deux apps installées sur l'iPhone se distinguent au premier coup d'œil.
- L'app de Claire et Julien a fonctionné sans interruption pendant toute la mise en place.
- `CLAUDE.md` décrit la mise en prod et le retour arrière.
