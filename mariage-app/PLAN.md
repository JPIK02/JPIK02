# Plan de travail avec Claude Code

## Fait (v1)
- [x] Reprise à l'identique de l'app claude.ai (11 vues, questionnaire « Nos envies », annuaire avec notes de fit, assistant e-mails)
- [x] Firestore à la place de la base de l'artifact, API compatible, cache hors ligne
- [x] Comptes Claire + Julien (Google ou lien par e-mail), règles Firestore limitées à vos deux adresses
- [x] Agent e-mails intégré (Gmail lecture seule + API Claude) avec validation par schéma
- [x] Agent d'analyse intégré (recherche web Claude) → fiche et note de fit
- [x] Planning des agents réglable dans l'app (meta/planning), passage horaire via GitHub Actions
- [x] Export CSV des invités, installable sur l'écran d'accueil
- [x] Import des données existantes (`seed/`), tests des fonctions des agents

## À vérifier au premier lancement
- [ ] Connexion Google sur iPhone (redirection) et lien par e-mail pour Claire
- [ ] Premier passage manuel de l'agent e-mails : comparer les propositions avec celles de l'ancienne version
- [ ] Nom du modèle Claude dans la variable `ANTHROPIC_MODEL`

## Prochaines idées (à demander à Claude Code)
1. **« Lire maintenant » immédiat** : une Cloud Function (offre Blaze, gratuite à ce volume) déclenchée par `requestedAt` qui lance le workflow GitHub via `workflow_dispatch`, au lieu d'attendre le passage horaire.
2. **Pièces jointes** : lire les PDF de devis (plaquettes, tarifs) et les envoyer à Claude pour extraire prix et options.
3. **Notifications** : push (Firebase Cloud Messaging) quand de nouvelles propositions arrivent ou qu'un acompte approche.
4. **Découper app.js** (≈ 1 100 lignes) en modules par vue, sans changer le comportement.
5. **Site invités / RSVP** : page publique séparée qui écrit dans une collection `rsvp` validée ensuite dans l'app.
6. **Sauvegarde** : export JSON hebdomadaire de Firestore dans le dépôt ou Google Drive.
