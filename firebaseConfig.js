// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA85Se_AWfx7My1LRR43WhXhAZ7uxTVa4o",
  authDomain: "test4-3168a.firebaseapp.com",
  databaseURL: "https://test4-3168a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test4-3168a",
  storageBucket: "test4-3168a.firebasestorage.app",
  messagingSenderId: "1088639479082",
  appId: "1:1088639479082:web:ac4098d4b05c5553de8253",
  measurementId: "G-8KVMZEC5JR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); 
export const firestore = getFirestore(app); 