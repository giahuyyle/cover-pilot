import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const firebaseHostedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : configuredAuthDomain;
const useCustomAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_HELPER_STRATEGY === "custom-hosting";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: useCustomAuthDomain ? configuredAuthDomain : firebaseHostedAuthDomain,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
