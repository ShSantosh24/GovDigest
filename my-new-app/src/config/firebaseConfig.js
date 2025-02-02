// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage'; 


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKdUDP1NZvNvQtXED2j8jxFPzDNSgxYg0",
  authDomain: "govdigest-421a2.firebaseapp.com",
  projectId: "govdigest-421a2",
  storageBucket: "govdigest-421a2.firebasestorage.app",
  messagingSenderId: "216056374481",
  appId: "1:216056374481:web:29f1057a1597281ec711f0",
  measurementId: "G-FQEGHQKJV6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);         // Exporting auth
export const db = getFirestore(app); // Exporting Firestore
export const storage = getStorage(app);   // Exporting Storage