// ফাইল: firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// আপনার firebaseConfig.js থেকে কনফিগারেশনটি এখানেও দিতে হবে
const firebaseConfig = {
  // আপনার কনফিগারেশন অবজেক্ট এখান থেকে কপি করুন (firebaseConfig.js থেকে)
  apiKey: "AIzaSyB1eYmM_QHtZmBAce18JVIUT-ICy60hKRY",
  authDomain: "l-chat-29d17.firebaseapp.com",
  databaseURL: "https://l-chat-29d17-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "l-chat-29d17",
  storageBucket: "l-chat-29d17.firebasestorage.app",
  messagingSenderId: "1093227353532",
  appId: "1:1093227353532:web:b066d8fcc4983b446fc7b9",
  measurementId: "G-B0KYR2Z2W9"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// ব্যাকগ্রাউন্ডে মেসেজ আসলে যা হবে
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png', // আপনার অ্যাপ আইকন
    badge: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});