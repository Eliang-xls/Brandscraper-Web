// IndexedDB logic for brands storage

const DB_NAME = 'brandsCrapDB';
const DB_VERSION = 1;
const BRAND_STORE = 'brands';

export async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(BRAND_STORE)) {
                const store = db.createObjectStore(BRAND_STORE, { keyPath: 'name' });
                store.createIndex('source', 'source', { unique: false });
                store.createIndex('classification', 'classification', { unique: false });
            }
        };
    });
}

export async function loadStoredBrands() {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BRAND_STORE, 'readonly');
        const store = transaction.objectStore(BRAND_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveBrands(brands) {
    const db = await initDatabase();
    const transaction = db.transaction(BRAND_STORE, 'readwrite');
    const store = transaction.objectStore(BRAND_STORE);
    for (const brand of brands) {
        store.put(brand);
    }
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function clearAllBrands() {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BRAND_STORE, 'readwrite');
        const store = transaction.objectStore(BRAND_STORE);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}