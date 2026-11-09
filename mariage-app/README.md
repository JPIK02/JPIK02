# Mariage Claire & Julien

L'app d'organisation du mariage, sortie de claude.ai pour devenir un vrai projet : comptes pour Claire et Julien, données synchronisées entre vos téléphones, et les deux agents IA (e-mails et analyse des prestataires) qui tournent tout seuls.

**Coût attendu** : Firebase (offre gratuite Spark), GitHub Actions (gratuit), API Claude (quelques euros par mois au plus pour ce volume).

## Mise en route (≈ 45 min, une seule fois)

Le plus simple : ouvrir ce dossier dans **Claude Code** et lui demander « aide-moi à faire la mise en route du README, étape par étape ». Les étapes :

### 1. Firebase (base + connexion + hébergement)
1. https://console.firebase.google.com → **Ajouter un projet** (ex. `mariage-claire-julien`), sans Analytics.
2. **Firestore Database** → Créer → mode production → région `europe-west9 (Paris)`.
3. **Authentication** → Commencer → activer **Google** et **E-mail/Mot de passe** avec l'option **Lien envoyé par e-mail (connexion sans mot de passe)**.
4. ✅ La configuration web du projet `mariageapp-a2ffe` est déjà dans `.env.production` (valeurs publiques, pas des secrets).
5. Les deux adresses autorisées sont dans `firestore.rules` et `VITE_ALLOWED_EMAILS` (garder les deux identiques).
6. **Mise en ligne automatique, sans rien installer** :
   1. Console Firebase → ⚙️ Paramètres → **Comptes de service** → **Générer une nouvelle clé privée** → un fichier `.json` se télécharge.
   2. Ouvrir ce fichier (sur iPhone : app Fichiers → Téléchargements), **tout sélectionner, copier**.
   3. GitHub → dépôt `JPIK02/JPIK02` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** : nom `FIREBASE_SERVICE_ACCOUNT`, valeur = le contenu copié.
   4. Onglet **Actions** → « Mise en ligne de l'app » → relancer (**Re-run jobs**) ou **Run workflow**.
   5. L'app est en ligne sur **https://mariageapp-a2ffe.web.app**. Sur iPhone : Safari → Partager → **Sur l'écran d'accueil**.

   Ensuite, chaque modification poussée remet l'app en ligne toute seule. En cas d'erreur « permission denied » : https://console.cloud.google.com/iam-admin/iam?project=mariageapp-a2ffe → crayon sur le compte `firebase-adminsdk-…` → ajouter le rôle **Administrateur Firebase**.

   (Alternative depuis un ordinateur : `cd mariage-app && npm install && npx firebase-tools login && npm run deploy`.)

### 2. Reprendre les données de l'ancienne app
Le dossier `seed/` contient l'export de l'app claude.ai (52 tâches, 17 postes de budget, déroulé du jour J, prestataire analysé, 4 propositions).
✅ **Automatique** : la première mise en ligne (étape 1.6) importe ces données si la base est vide. Les mises en ligne suivantes n'y touchent plus.

À la main depuis un ordinateur, si besoin :
```bash
cd mariage-app/agents && npm install && cd ..
FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node scripts/import-seed.js --dry   # essai
FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" node scripts/import-seed.js
```

### 3. Accès Gmail en lecture seule
1. https://console.cloud.google.com → choisir le **même projet** que Firebase → **API et services** → activer **Gmail API**.
2. **Écran de consentement OAuth** : type Externe, ajouter `mariageclaireetjulien2028@gmail.com` comme utilisateur test, puis **Publier l'application** (sinon le jeton expire au bout de 7 jours).
3. **Identifiants** → Créer → **ID client OAuth** → Application de bureau.
4. ```bash
   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/get-gmail-token.js
   ```
   Se connecter avec la boîte du mariage, accepter : le `GMAIL_REFRESH_TOKEN` s'affiche.

### 4. Clé API Claude
https://console.anthropic.com → API Keys → créer une clé. Vérifier le nom du modèle à utiliser sur https://docs.claude.com/en/docs/about-claude/models.

### 5. GitHub (les agents)
1. Le code est dans le dépôt `JPIK02/JPIK02`, dossier `mariage-app/`, et le workflow est à la racine (`.github/workflows/agents.yml`, GitHub n'en lit pas ailleurs). **Fusionner la branche dans la branche par défaut** : GitHub ne lance les workflows planifiés que depuis celle-ci.
2. Settings → Secrets and variables → Actions :
   - **Secrets** : `FIREBASE_SERVICE_ACCOUNT` (contenu du JSON), `ANTHROPIC_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
   - **Variables** : `ANTHROPIC_MODEL` (`claude-opus-5-5`, ou laisser vide : c'est la valeur par défaut), `COUPLE_EMAILS` (vos adresses perso, pour que l'agent ne les reprenne jamais)
3. Les secrets ne sont jamais visibles, même dans un dépôt public. Mais dans un dépôt public, n'importe qui peut lire les journaux des Actions : les agents n'y écrivent qu'un résumé (nombre de mails, noms et notes des prestataires).
4. Onglet **Actions** → « Agents mariage » → **Run workflow** avec `mail` pour un premier essai.

### 6. Assistant IA intégré (offre Blaze)
L'assistant de l'app (bouton ✦) répond en quelques secondes et agit dans l'app : il lui faut un petit serveur (Cloud Functions), disponible avec l'offre **Blaze** de Firebase (paiement à l'usage, gratuit à ce volume).
1. Console Firebase → ⚙️ **Utilisation et facturation** → **Détails et paramètres du forfait** → **Modifier le forfait** → **Blaze**, puis une **alerte de budget** (ex. 1 €).
2. Google Cloud → **IAM** (https://console.cloud.google.com/iam-admin/iam?project=mariageapp-a2ffe) → crayon sur `firebase-adminsdk-…` → ajouter le rôle **Éditeur** (nécessaire pour publier la fonction).
3. GitHub → Actions → « Assistant IA (Cloud Functions) » → **Run workflow** (ou il part tout seul à la prochaine modification du dossier `functions/`).

La clé Claude utilisée est le secret `ANTHROPIC_API_KEY` déjà en place. Coût Claude : quelques centimes par échange ; garde-fou de 150 messages par jour.

### 7. Couper les anciennes tâches planifiées
Une fois que tout tourne ici, mettre en pause les deux tâches planifiées « Assistant e-mails du mariage » et « Analyse des prestataires du mariage » dans Claude, pour éviter que deux agents écrivent en parallèle.

## Au quotidien
- **Assistant ✦** (en bas à droite) : posez une question ou demandez une action (« ajoute… », « mets X dans le groupe Amis », « note le devis de… »). Chaque action s'annule d'un toucher. Il ne supprime jamais rien. Dans *Nos envies*, « Commencer l'entretien » remplit le questionnaire en discutant.
- **Notifications** : Réglages → Notifications (sur iPhone, depuis l'app ajoutée à l'écran d'accueil).
- Les agents passent selon le planning réglé dans **Réglages** (par défaut 7 h pour les mails, 8 h pour l'analyse).
- « Lire la boîte au prochain passage » / « Demander une analyse » : pris en compte dans les 10 à 15 minutes.
- Rien n'entre dans le planning, le budget ou les invités sans votre validation dans l'onglet **E-mails**.

## Structure
```
index.html, src/        l'app (app.js = toute l'interface, firebase.js = connexion)
firestore.rules         qui peut lire/écrire (vous deux seulement)
agents/                 agents IA (Node) + prompts + tests
../.github/workflows/   planification horaire des agents (à la racine du dépôt)
scripts/                import des données, jeton Gmail
seed/                   export de l'ancienne app
```
