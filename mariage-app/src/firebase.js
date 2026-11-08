// Connexion Firebase : Auth (Google + lien par e-mail) et Firestore.
// L'API "compat" de Firestore est volontairement utilisée : c'est exactement la même forme
// (collection().doc().set/update/delete, onSnapshot, snap.exists, snap.data()) que la base
// de l'ancienne app sur claude.ai, ce qui permet de garder app.js presque tel quel.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

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

// Cache local : l'app reste lisible hors ligne et se resynchronise ensuite.
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

if (import.meta.env.VITE_USE_EMULATORS === "1") {
  db.useEmulator("127.0.0.1", 8080);
  auth.useEmulator("http://127.0.0.1:9099");
}

export async function signInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // Redirection plutôt que popup : plus fiable sur iPhone (Safari bloque souvent les popups).
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  return mobile ? auth.signInWithRedirect(provider) : auth.signInWithPopup(provider);
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
