import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Detect mock config
export const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'mock-api-key';

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// 🚀 Use initializeFirestore with explicit long polling to bypass iframe/proxy websocket constraints
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

export { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, setDoc, serverTimestamp };
