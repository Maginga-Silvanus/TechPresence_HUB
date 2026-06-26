// 1. Create a Firebase web app in the Firebase console.
// 2. Enable Authentication > Sign-in method > Email/Password.
// 3. Enable Firestore Database.
// 4. Use the Firebase web app config for the techpresence-8150b project.
//    The apiKey, messagingSenderId, appId, and measurementId must come from
//    Firebase Console > Project settings > Your apps > Web app.
(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyDyLRNO3KlHnqYs_2mdIoVIjOosAcXggDE",
        authDomain: "techpresence-8150b.firebaseapp.com",
        projectId: "techpresence-8150b",
        storageBucket: "techpresence-8150b.firebasestorage.app",
        messagingSenderId: "383163941116",
        appId: "1:383163941116:web:10d6138fd19ba4ca8f1779",
        measurementId: "G-D64M24Q586"
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

    const collectionNames = [
        'users',
        'applications',
        'tasks',
        'submissions',
        'withdrawals',
        'awards',
        'activationPayments',
        'paymentMethods',
        'trainingSlots',
        'userTrainingSelections'
    ];

    function safeParse(value, fallback) {
        try {
            return JSON.parse(value || JSON.stringify(fallback));
        } catch (error) {
            return fallback;
        }
    }

    function normalizeTimestamp(value) {
        return value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value;
    }

    function normalizeDocument(doc) {
        const data = doc.data();
        return Object.keys(data).reduce((item, key) => {
            item[key] = normalizeTimestamp(data[key]);
            return item;
        }, { id: data.id || doc.id });
    }

    function storeCollection(name, items) {
        localStorage.setItem(name, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('appdata:changed', { detail: { collection: name, items } }));
    }

    function documentIdFor(name, item) {
        if (name === 'users' || name === 'applications') return (item.email || item.id || '').toLowerCase();
        return String(item.id || item.email || Date.now());
    }

    async function syncLocalToFirestore(name) {
        const items = safeParse(localStorage.getItem(name), []);
        const batch = window.AppFirebase.db.batch();
        let writes = 0;

        items.forEach(item => {
            const id = documentIdFor(name, item);
            if (!id) return;
            batch.set(window.AppFirebase.db.collection(name).doc(id), {
                ...item,
                id,
                updatedAt: window.AppFirebase.serverTimestamp()
            }, { merge: true });
            writes++;
        });

        if (writes) await batch.commit();
    }

    async function syncCollectionFromFirestore(name) {
        const snapshot = await window.AppFirebase.db.collection(name).get();
        const remoteItems = snapshot.docs.map(normalizeDocument);
        if (remoteItems.length) storeCollection(name, remoteItems);
        return remoteItems;
    }

    function watchCollection(name) {
        return window.AppFirebase.db.collection(name).onSnapshot(snapshot => {
            storeCollection(name, snapshot.docs.map(normalizeDocument));
        }, error => console.error(`Unable to sync ${name}`, error));
    }

    window.AppData = {
        collections: collectionNames,
        getCollection(name) {
            return safeParse(localStorage.getItem(name), []);
        },
        async syncAll() {
            await Promise.all(collectionNames.map(syncCollectionFromFirestore));
            await Promise.all(collectionNames.filter(name => name !== 'users').map(syncLocalToFirestore));
        },
        async saveCollection(name, items) {
            storeCollection(name, items);
            const batch = window.AppFirebase.db.batch();
            let writes = 0;
            items.forEach(item => {
                const id = documentIdFor(name, item);
                if (!id) return;
                batch.set(window.AppFirebase.db.collection(name).doc(id), {
                    ...item,
                    id,
                    updatedAt: window.AppFirebase.serverTimestamp()
                }, { merge: true });
                writes++;
            });
            if (writes) await batch.commit();
        },
        async upsertItem(name, item) {
            const id = documentIdFor(name, item);
            if (!id) return;
            const items = this.getCollection(name);
            const index = items.findIndex(existing => documentIdFor(name, existing) === id);
            const savedItem = { ...item, id };

            if (index >= 0) items[index] = { ...items[index], ...savedItem };
            else items.push(savedItem);

            storeCollection(name, items);
            await window.AppFirebase.db.collection(name).doc(id).set({
                ...savedItem,
                updatedAt: window.AppFirebase.serverTimestamp(),
                createdAt: savedItem.createdAt || window.AppFirebase.serverTimestamp()
            }, { merge: true });
        },
        async deleteItem(name, id) {
            const items = this.getCollection(name).filter(item => documentIdFor(name, item) !== String(id));
            storeCollection(name, items);
            await window.AppFirebase.db.collection(name).doc(String(id)).delete();
        },
        watchAll() {
            return collectionNames.map(watchCollection);
        }
    };

    window.AppData.watchAll();
    window.AppData.syncAll().catch(error => console.error('Firestore sync failed', error));
    window.AppFirebase.db.collection('settings').doc('admin').onSnapshot(doc => {
        if (!doc.exists) return;
        localStorage.setItem('adminSettings', JSON.stringify(doc.data()));
        window.dispatchEvent(new CustomEvent('appdata:changed', {
            detail: { collection: 'adminSettings', items: doc.data() }
        }));
    }, error => console.error('Unable to sync admin settings', error));

    window.firebaseReady = Promise.resolve(window.AppFirebase);
})();
