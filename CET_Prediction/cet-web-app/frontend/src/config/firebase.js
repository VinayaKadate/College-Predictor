import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyDc_TPj4Gy0hp_FInzEJpP3nusXdcaJDjg",
  authDomain: "collegepredictor-b49c2.firebaseapp.com",
  projectId: "collegepredictor-b49c2",
  storageBucket: "collegepredictor-b49c2.firebasestorage.app",
  messagingSenderId: "631642189226",
  appId: "1:631642189226:web:89a8bf0fa17a0ccc184fd3",
  measurementId: "G-VQC03HJ4VQ"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
