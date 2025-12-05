// ফাইল: firebaseConfig.js

// Firebase এর প্রয়োজনীয় লাইব্রেরি ইম্পোর্ট (Web ভার্সন)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// আপনার নতুন প্রজেক্টের কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyB1eYmM_QHtZmBAce18JVIUT-ICy60hKRY",
  authDomain: "l-chat-29d17.firebaseapp.com",
  // নিচে আপনার ডাটাবেস লিংক দেওয়া হলো। কাজ না করলে ফায়ারবেস কনসোল থেকে Realtime Database এর লিংকটি মিলিয়ে নেবেন।
  databaseURL: "https://l-chat-29d17-default-rtdb.asia-southeast1.firebasedatabase.app/", 
  projectId: "l-chat-29d17",
  storageBucket: "l-chat-29d17.firebasestorage.app",
  messagingSenderId: "1093227353532",
  appId: "1:1093227353532:web:b066d8fcc4983b446fc7b9",
  measurementId: "G-B0KYR2Z2W9"
};

// অ্যাপ ইনিশিয়ালাইজ করা
const app = initializeApp(firebaseConfig);

// অথেন্টিকেশন এবং ডাটাবেস সার্ভিস চালু করা এবং এক্সপোর্ট করা
// যাতে script.js এ ব্যবহার করা যায়
export const auth = getAuth(app);
export const db = getDatabase(app);
export const chatApp = app;