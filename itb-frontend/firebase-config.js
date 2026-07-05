import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw_tI8emLLJvo0u-uxQveXlqE0IWNCZ_0",
  authDomain: "itb-market-sim.firebaseapp.com",
  projectId: "itb-market-sim",
  storageBucket: "itb-market-sim.firebasestorage.app",
  messagingSenderId: "92938028967",
  appId: "1:92938028967:web:869b6afdbc27c8bfed5882"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function authenticate(accessCode) {
    const roles = {
        'ALPHA1': { role: 'team', id: 'team1', name: 'Alpha Capital' },
        'BETA2': { role: 'team', id: 'team2', name: 'Beta Ventures' },
        'GAMMA3': { role: 'team', id: 'team3', name: 'Gamma Holdings' },
        'SYSADMIN': { role: 'admin', id: 'admin', name: 'SYSADMIN' }
    };
    
    const user = roles[accessCode.toUpperCase()];
    if (!user) throw new Error("Invalid Access Code");
    
    localStorage.setItem('itb_session', JSON.stringify(user));
    return user;
}

// Ensure 'export' is added here
export function getSession() {
    const session = localStorage.getItem('itb_session');
    
    // If there is no session, return null to avoid errors
    if (!session) return null;
    
    // Use JSON.parse to turn the stored string back into an object
    return JSON.parse(session); 
}