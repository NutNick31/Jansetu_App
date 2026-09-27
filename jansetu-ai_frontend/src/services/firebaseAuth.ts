import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function firebaseApp(): FirebaseApp {
  if (!cachedApp) cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
}

export function firebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(firebaseApp());
  return cachedAuth;
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth(), cb);
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
  return cred.user;
}

export async function signUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(firebaseAuth(), provider);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(firebaseAuth());
}

export async function getIdToken(): Promise<string | null> {
  const user = firebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}
