import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdJy4cg0vEJE2dlp9obDuHL6YuvmkcrhM",
  authDomain: "huerth-open-live.firebaseapp.com",
  projectId: "huerth-open-live",
  storageBucket: "huerth-open-live.firebasestorage.app",
  messagingSenderId: "927003962018",
  appId: "1:927003962018:web:3b94a8e09f20bc3a72c5fb",
  measurementId: "G-3M2PMMT2SN",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);