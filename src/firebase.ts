// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7nqtjiaYBF2WlIpBzAdRnx1McwDbKssQ",
  authDomain: "sportplanapp.firebaseapp.com",
  projectId: "sportplanapp",
  storageBucket: "sportplanapp.firebasestorage.app",
  messagingSenderId: "431841601239",
  appId: "1:431841601239:web:83c7232a5428e0c5a6f292",
  measurementId: "G-ZJ0SK7N98B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db= getFirestore(app);
export const auth = getAuth(app);