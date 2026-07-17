import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsZbjsx-h1QeOTzx7QlX8DnKsL2-NSvAA",
  authDomain: "velveto-37672.firebaseapp.com",
  projectId: "velveto-37672",
  storageBucket: "velveto-37672.firebasestorage.app",
  messagingSenderId: "796121521570",
  appId: "1:796121521570:web:c1d95f346e2545cc07e6fb",
  measurementId: "G-D815MWLMG0"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
