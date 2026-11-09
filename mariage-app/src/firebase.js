// Connexion Firebase : Auth (Google + lien par e-mail) et Firestore.
// L'API "compat" de Firestore est volontairement utilisée : c'est exactement la même forme
// (collection().doc().set/update/delete, onSnapshot, snap.exists, snap.data()) que la base
// de l'ancienne app sur claude.ai, ce qui permet de garder app.js presque tel quel.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Les deux comptes autorisés. La vraie barrière est dans firestore.rules :
// cette liste ne sert qu'à afficher un message clair côté interface.
export const ALLOWED = String(import.meta.env.VITE_ALLOWED_EMAILS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

firebase.initializeApp(config);
export const auth = firebase.auth();
auth.languageCode = "fr";
export const db = firebase.firestore();
// Assistant IA : fonction serveur (la clé Claude n'est jamais dans l'app)
const fns = firebase.app().functions("europe-west1");
export const callAssistant = data => fns.httpsCallable("assistant", { timeout: 300000 })(data).then(r => r.data);

// Cache local : l'app reste lisible hors ligne et se resynchronise ensuite.
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

if (import.meta.env.VITE_USE_EMULATORS === "1") {
  db.useEmulator("127.0.0.1", 8080);
  auth.useEmulator("http://127.0.0.1:9099");
  fns.useEmulator("127.0.0.1", 5001);
}

export async function signInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // Popup partout : la redirection échoue sur Safari iPhone, qui bloque le stockage partagé entre
  // mariageapp-a2ffe.web.app (l'app) et firebaseapp.com (la page de retour de Google) :
  // on revenait sur l'écran de connexion sans être connecté. Le popup n'est pas concerné.
  // Repli sur la redirection seulement si le navigateur refuse d'ouvrir le popup.
  try {
    return await auth.signInWithPopup(provider);
  } catch (e) {
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-environment")
      return auth.signInWithRedirect(provider);
    throw e;
  }
}

const LINK_KEY = "mariage-email-lien";
export async function sendEmailLink(email) {
  await auth.sendSignInLinkToEmail(email, {
    url: location.origin + location.pathname,
    handleCodeInApp: true,
  });
  try { localStorage.setItem(LINK_KEY, email); } catch (e) {}
}

export async function completeEmailLink() {
  if (!auth.isSignInWithEmailLink(location.href)) return;
  let email = null;
  try { email = localStorage.getItem(LINK_KEY); } catch (e) {}
  if (!email) email = window.prompt("Confirmez votre adresse e-mail");
  if (!email) return;
  await auth.signInWithEmailLink(email, location.href);
  try { localStorage.removeItem(LINK_KEY); } catch (e) {}
  history.replaceState(null, "", location.pathname + location.hash);
}

export const signOut = () => auth.signOut();
