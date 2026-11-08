# Mariage Claire & Julien

L'app d'organisation du mariage, sortie de claude.ai pour devenir un vrai projet : comptes pour Claire et Julien, données synchronisées entre vos téléphones, et les deux agents IA (e-mails et analyse des prestataires) qui tournent tout seuls.

**Coût attendu** : Firebase (offre gratuite Spark), GitHub Actions (gratuit), API Claude (quelques euros par mois au plus pour ce volume).

## Mise en route (≈ 45 min, une seule fois)

Le plus simple : ouvrir ce dossier dans **Claude Code** et lui demander « aide-moi à faire la mise en route du README, étape par étape ». Les étapes :

### 1. Firebase (base + connexion + hébergement)
1. https://console.firebase.google.com → **Ajouter un projet** (ex. `mariage-claire-julien`), sans Analytics.
2. **Firestore Database** → Créer → mode production → région `europe-west9 (Paris)`.
3. **Authentication** → Commencer → activer **Google** et **E-mail/Mot de passe** avec l'option **Lien envoyé par e-mail (connexion sans mot de passe)**.
4. **Paramètres du projet** → Vos applications → **Web** (`</>`) → copier `apiKey`, `authDomain`, `projectId`, `appId` dans un fichier `.env` (modèle : `.env.example`).
5. Vérifier la liste des deux adresses autorisées dans `firestore.rules` et `VITE_ALLOWED_EMAILS` (Claire se connecte avec l'adresse qu'elle utilisera, Google ou lien par e-mail).
6. En local :
   ```bash
   cd mariage-app
   npm install
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc   # mettre l'ID du projet
   npm run deploy
   ```
   L'app est en ligne sur `https://<projet>.web.app`. Sur iPhone : Safari → Partager → **Sur l'écran d'accueil**.

### 2. Reprendre les données de l'ancienne app
Le dossier `seed/` contient l'export de l'app claude.ai (52 tâches, 17 postes de budget, déroulé du jour J, prestataire analysé, 4 propositions).
1. Console Firebase → Paramètres → **Comptes de service** → Générer une clé privée → `service-account.json` (jamais dans git).
2. ```bash
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

### 6. Couper les anciennes tâches planifiées
Une fois que tout tourne ici, mettre en pause les deux tâches planifiées « Assistant e-mails du mariage » et « Analyse des prestataires du mariage » dans Claude, pour éviter que deux agents écrivent en parallèle.

## Au quotidien
- Les agents passent selon le planning réglé dans **Réglages** (par défaut 7 h pour les mails, 8 h pour l'analyse).
- « Lire la boîte au prochain passage » / « Demander une analyse » : pris en compte dans l'heure.
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
