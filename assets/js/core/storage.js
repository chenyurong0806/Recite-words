/**
 * IndexedDB 缓存与本地持久化引擎
 * Module: assets/js/core/storage.js
 */

/* ==========================================================================
   2. 离线缓存、本地数据库与工具函数
   ========================================================================== */
function safeJsonParse(str) {
    if (typeof str !== 'string') return str;
    const trimmed = str.trim();
    try {
        return JSON.parse(trimmed);
    } catch (e1) {
        const cleaned = trimmed.replace(/,\s*([\]}])/g, '$1');
        try {
            return JSON.parse(cleaned);
        } catch (e2) {
            try {
                return (new Function('return (' + trimmed + ');'))();
            } catch (e3) {
                throw e1;
            }
        }
    }
}

function getCookie(name) {
    try {
        if (typeof document === 'undefined' || !document.cookie) return null;
        const matches = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
    } catch (e) {
        return null;
    }
}

function setCookie(name, val, days = 365) {
    try {
        if (typeof document === 'undefined') return;
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const secPart = isSecure ? '; SameSite=None; Secure' : '; SameSite=Lax';
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(val)}; expires=${expires}; path=/${secPart}`;
    } catch (e) { }
}

function removeCookie(name) {
    try {
        if (typeof document === 'undefined') return;
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    } catch (e) { }
}
window.getCookie = getCookie;
window.setCookie = setCookie;
window.removeCookie = removeCookie;

const memoryStorageMap = {};
const SafeStorage = {
    isAvailable: (() => {
        try {
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    })(),

    getItem(key) {
        if (!key) return null;
        try {
            if (this.isAvailable) {
                const val = window.localStorage.getItem(key);
                if (val !== null) return val;
            }
        } catch (e) { }
        // 苹果设备与移动端兜底：尝试从 Cookie 读取
        try {
            const cookieVal = getCookie(key);
            if (cookieVal !== null) {
                memoryStorageMap[key] = cookieVal;
                try {
                    if (this.isAvailable) window.localStorage.setItem(key, cookieVal);
                } catch (e) { }
                return cookieVal;
            }
        } catch (e) { }
        return Object.prototype.hasOwnProperty.call(memoryStorageMap, key) ? memoryStorageMap[key] : null;
    },

    setItem(key, value) {
        if (!key) return;
        const strVal = String(value);
        memoryStorageMap[key] = strVal;
        try {
            if (this.isAvailable) {
                window.localStorage.setItem(key, strVal);
            }
        } catch (e) {
            console.warn('[SafeStorage] localStorage.setItem failed, retained in memory:', key, e);
        }
        // 对于关键用户标识及中短配置（< 3.5KB），同步存入 Cookie 确保苹果设备持久化
        if (strVal.length < 3500) {
            try {
                setCookie(key, strVal, 365);
            } catch (e) { }
        }
    },

    removeItem(key) {
        if (!key) return;
        delete memoryStorageMap[key];
        try {
            if (this.isAvailable) {
                window.localStorage.removeItem(key);
            }
        } catch (e) { }
        try {
            removeCookie(key);
        } catch (e) { }
    },

    clear() {
        Object.keys(memoryStorageMap).forEach(k => delete memoryStorageMap[k]);
        try {
            if (this.isAvailable) {
                window.localStorage.clear();
            }
        } catch (e) { }
    }
};
window.SafeStorage = SafeStorage;

let localFolders = [];
let folderTreeCollapseMap = {};

const VocabOfflineDB = {
    dbName: 'VocabLocalBooksDB',
    version: 1,
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve) => {
            try {
                if (!window.indexedDB) {
                    resolve(null);
                    return;
                }
                const request = indexedDB.open(this.dbName, this.version);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('books')) {
                        db.createObjectStore('books', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('folders')) {
                        db.createObjectStore('folders', { keyPath: 'id' });
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                request.onerror = (e) => {
                    resolve(null);
                };
            } catch (err) {
                resolve(null);
            }
        });
    },

    async getAllBooks() {
        await this.init();
        if (!this.db) {
            try {
                return JSON.parse(SafeStorage.getItem('vocab_offline_books') || '[]');
            } catch (e) { return []; }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readonly');
            const store = tx.objectStore('books');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async saveBook(book) {
        await this.init();
        if (!this.db) {
            const list = await this.getAllBooks();
            const idx = list.findIndex(b => b.id === book.id);
            if (idx >= 0) list[idx] = book; else list.push(book);
            try { SafeStorage.setItem('vocab_offline_books', JSON.stringify(list)); } catch (e) { }
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readwrite');
            const store = tx.objectStore('books');
            const req = store.put(book);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async deleteBook(bookId) {
        await this.init();
        if (!this.db) {
            const list = (await this.getAllBooks()).filter(b => b.id !== bookId);
            SafeStorage.setItem('vocab_offline_books', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readwrite');
            const store = tx.objectStore('books');
            const req = store.delete(bookId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async getAllFolders() {
        await this.init();
        if (!this.db) {
            try {
                return JSON.parse(SafeStorage.getItem('vocab_offline_folders') || '[]');
            } catch (e) { return []; }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readonly');
            const store = tx.objectStore('folders');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async saveFolder(folder) {
        await this.init();
        if (!this.db) {
            const list = await this.getAllFolders();
            const idx = list.findIndex(f => f.id === folder.id);
            if (idx >= 0) list[idx] = folder; else list.push(folder);
            SafeStorage.setItem('vocab_offline_folders', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.put(folder);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async deleteFolder(folderId) {
        await this.init();
        if (!this.db) {
            const list = (await this.getAllFolders()).filter(f => f.id !== folderId);
            SafeStorage.setItem('vocab_offline_folders', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.delete(folderId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    }
};

