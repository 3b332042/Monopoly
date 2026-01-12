// js/firebase.js

const firebaseConfig = {
    apiKey: "AIzaSyAF3lPrqw_L7wJbhk0LhJgPP7NCWSuN6u4",
    authDomain: "monopoly-online-bfc35.firebaseapp.com",
    // 推測的資料庫 URL (Standard US Central)
    databaseURL: "https://monopoly-online-bfc35-default-rtdb.firebaseio.com",
    projectId: "monopoly-online-bfc35",
    storageBucket: "monopoly-online-bfc35.firebasestorage.app",
    messagingSenderId: "894321009244",
    appId: "1:894321009244:web:17ad09f56b1813cea37c99"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, update, push, get, child };
