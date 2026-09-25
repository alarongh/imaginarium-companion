import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const isFirebaseConfigured = Object.values(firebaseConfig).every(value => value && !String(value).startsWith("REPLACE_"));

let firebaseApp = null;
export let auth = null;
export let db = null;
let authPromise = null;

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getDatabase(firebaseApp);
}

export async function ensureAnonymousUser() {
  if (!isFirebaseConfigured) throw new Error("Firebase ещё не настроен для этого сайта.");
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = signInAnonymously(auth).then(credential => credential.user).finally(() => { authPromise = null; });
  }
  return authPromise;
}
