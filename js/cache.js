// js/cache.js
const DB_NAME = 'legislative-explorer-v1';
const DB_VERSION = 1;
const STORES = ['legislators', 'legislator-detail', 'bills', 'meets', 'votes', 'api-cache'];

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.dbPromise = this.initDB();
  }

  async initDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[Cache] IndexedDB not available, falling back to Memory Cache.');
      return null;
    }

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          for (const s of STORES) {
            if (!db.objectStoreNames.contains(s)) {
              db.createObjectStore(s);
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[Cache] Failed to open IndexedDB:', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[Cache] IndexedDB initialization error:', err);
        resolve(null);
      }
    });
  }

  async get(storeName, key) {
    const memKey = `${storeName}:${key}`;
    const memItem = this.memoryCache.get(memKey);
    if (memItem) {
      if (memItem.expiry && Date.now() > memItem.expiry) {
        this.memoryCache.delete(memKey);
      } else {
        return memItem.value;
      }
    }

    const db = await this.dbPromise;
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => {
          const item = req.result;
          if (!item) return resolve(null);
          if (item.expiry && Date.now() > item.expiry) {
            this.delete(storeName, key);
            return resolve(null);
          }
          // also sync to memory
          this.memoryCache.set(memKey, item);
          resolve(item.value);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async set(storeName, key, value, ttlMs = 3600000) {
    const expiry = ttlMs ? Date.now() + ttlMs : null;
    const item = { value, expiry };
    const memKey = `${storeName}:${key}`;
    this.memoryCache.set(memKey, item);

    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async delete(storeName, key) {
    const memKey = `${storeName}:${key}`;
    this.memoryCache.delete(memKey);

    const db = await this.dbPromise;
    if (!db) return;

    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
    } catch {
      // ignore
    }
  }

  async clearAll() {
    this.memoryCache.clear();
    const db = await this.dbPromise;
    if (!db) return;

    for (const s of STORES) {
      try {
        const tx = db.transaction(s, 'readwrite');
        tx.objectStore(s).clear();
      } catch {
        // ignore
      }
    }
  }
}

export const cache = new CacheManager();
