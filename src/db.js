// IndexedDB logic for brands storage

const DB_NAME = 'brandsCrapDB';
const DB_VERSION = 1;
const BRAND_STORE = 'brands';

export async function initDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = (event) => {
                    log('Database error: ' + event.target.error, 'error');
                    updateStorageStatus('error');
                    reject(event.target.error);
                };
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    log('Database initialized successfully', 'success');
                    updateStorageStatus('ready');
                    resolve(db);
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(BRAND_STORE)) {
                        const store = db.createObjectStore(BRAND_STORE, { keyPath: 'name' });
                        store.createIndex('source', 'source', { unique: false });
                        store.createIndex('classification', 'classification', { unique: false });
                        log('Brand store created', 'success');
                    }
                };
            });
}

export async function loadStoredBrands() {
            try {
                const db = await initDatabase();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(BRAND_STORE, 'readonly');
                    const store = transaction.objectStore(BRAND_STORE);
                    const request = store.getAll();
                    request.onsuccess = () => {
                        const brands = request.result;
                        log(`Loaded ${brands.length} brands from storage`, 'success');
                        resolve(brands);
                    };
                    request.onerror = () => {
                        log('Error loading stored brands', 'error');
                        reject(request.error);
                    };
                });
            } catch (error) {
                log('Failed to load stored brands: ' + error, 'error');
                updateStorageStatus('error');
                return [];
            }
}

export  async function saveBrands(brands) {
            try {
                const db = await initDatabase();
                const transaction = db.transaction(BRAND_STORE, 'readwrite');
                const store = transaction.objectStore(BRAND_STORE);

                for (const brand of brands) {
                    store.put(brand);
                }

                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        log(`Saved ${brands.length} brands to storage`, 'success');
                        updateStorageStatus('ready');
                        resolve();
                    };
                    transaction.onerror = () => {
                        log('Error saving brands', 'error');
                        updateStorageStatus('error');
                        reject(transaction.error);
                    };
                });
            } catch (error) {
                log('Failed to save brands: ' + error, 'error');
                addAlert('Failed to save brands to local storage', 'error');
                updateStorageStatus('error');
            }
}

export async function clearAllBrands() {
            try {
                const db = await initDatabase();
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(BRAND_STORE, 'readwrite');
                    const store = transaction.objectStore(BRAND_STORE);
                    const req = store.clear();
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            } catch (e) {
                log('Failed to clear brands: ' + e, 'error');
            }
}