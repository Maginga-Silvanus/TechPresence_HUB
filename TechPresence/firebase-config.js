// 1. Create a Firebase web app in the Firebase console.
// 2. Enable Authentication > Sign-in method > Email/Password.
// 3. Enable Firestore Database.
// 4. Replace the placeholder values below with your Firebase app config.
(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyDfd_AII3V5uy86ZDMhbbEJ6GkSe_mtznA",
        authDomain: "freelancing-website-dc547.firebaseapp.com",
        projectId: "freelancing-website-dc547",
        storageBucket: "freelancing-website-dc547.firebasestorage.app",
        messagingSenderId: "37190303153",
        appId: "1:37190303153:web:9cce0a6f548348ca8a9190",
        measurementId: "G-N2WG3FKKLC"
    };

    const app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

    window.AppFirebase = {
        app,
        auth: firebase.auth(),
        db: firebase.firestore(),
        isConfigured: true,
        serverTimestamp: firebase.firestore.FieldValue.serverTimestamp
    };

    window.firebaseReady = Promise.resolve(window.AppFirebase);
})();
