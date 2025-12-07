// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA32xhmw1KRGA07bxmWr8GHNDuL2qMt-BY",
  authDomain: "dailydhandora.firebaseapp.com",
  projectId: "dailydhandora",
  storageBucket: "dailydhandora.appspot.com", // Corrected from firebasestorage.app
  messagingSenderId: "303609550188",
  appId: "1:303609550188:web:9492e42403eff0d57d0f49"
};

// Initialize Firebase
// We check if apps are already initialized to prevent errors during hot-reloading in development.
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { app, db };
