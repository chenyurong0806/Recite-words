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

// 申请持久化存储（防止移动端/PWA/Toy添加到主屏幕后本地存储被系统清理）
if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().catch(() => {});
}

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
        // 苹果设备与移动端/独立容器兜底：尝试从 Cookie 读取
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
        // 对于关键用户标识及中短配置（< 3.5KB），同步存入 Cookie 确保独立容器与移动端持久化
        if (strVal.length < 3500) {
            try {
                setCookie(key, strVal, 365);
            } catch (e) { }
        }
        // 异步镜像至 IndexedDB，保障 PWA/Toy 独立窗口全量本地持久化
        if (typeof VocabOfflineDB !== 'undefined' && typeof VocabOfflineDB.saveKV === 'function') {
            VocabOfflineDB.saveKV(key, strVal).catch(() => {});
        }
        // 如果运行在 Toy 平台环境，实时同步关键账号与登录凭证（严格遵守 Toy value ≤ 1024 字节规范）
        if (typeof window !== 'undefined' && window.toy && typeof window.toy.setCloudStorage === 'function') {
            if (key === 'vocab_auth_session' || key === 'vocab_device_accounts' || key === 'vocab_pk_user' || key === 'vocab_guest_name') {
                try {
                    const toyPayload = {};
                    if (key === 'vocab_auth_session') {
                        try {
                            const p = JSON.parse(strVal);
                            const compact = JSON.stringify({
                                isLoggedIn: Boolean(p.isLoggedIn),
                                type: p.type || 'cloud',
                                username: p.username || '',
                                openId: p.openId || ''
                            });
                            if (compact.length <= 1024) toyPayload['auth_session'] = compact;
                        } catch (e) {
                            if (strVal.length <= 1024) toyPayload['auth_session'] = strVal;
                        }
                    } else if (key === 'vocab_device_accounts') {
                        try {
                            const arr = JSON.parse(strVal);
                            if (Array.isArray(arr)) {
                                const compactArr = arr.slice(0, 5).map(a => ({
                                    username: a.username,
                                    type: a.type || 'cloud',
                                    hashedPassword: a.hashedPassword || '',
                                    lastLoginTime: a.lastLoginTime || Date.now()
                                }));
                                const compactStr = JSON.stringify(compactArr);
                                if (compactStr.length <= 1024) toyPayload['device_accounts'] = compactStr;
                            }
                        } catch (e) { }
                    } else if (key === 'vocab_pk_user') {
                        if (strVal.length <= 1024) toyPayload['current_user'] = strVal;
                    } else if (key === 'vocab_guest_name') {
                        if (strVal.length <= 1024) toyPayload['guest_id'] = strVal;
                    }
                    if (Object.keys(toyPayload).length > 0) {
                        window.toy.setCloudStorage(toyPayload).catch(() => {});
                    }
                } catch (e) { }
            }
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
        if (typeof VocabOfflineDB !== 'undefined' && typeof VocabOfflineDB.deleteKV === 'function') {
            VocabOfflineDB.deleteKV(key).catch(() => {});
        }
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
    version: 3,
    db: null,
    _initPromise: null,

    async init() {
        if (this.db) return this.db;
        if (this._initPromise) return this._initPromise;
        this._initPromise = new Promise((resolve) => {
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
                    if (!db.objectStoreNames.contains('kv_store')) {
                        db.createObjectStore('kv_store', { keyPath: 'k' });
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    // 同步从 IndexedDB 恢复可能缺失的 localStorage 关键数据 (如账号信息、段位等)
                    try {
                        if (!this.db.objectStoreNames.contains('kv_store')) {
                            resolve(this.db);
                            return;
                        }
                        const tx = this.db.transaction('kv_store', 'readwrite');
                        const store = tx.objectStore('kv_store');
                        const req = store.getAll();
                        req.onsuccess = () => {
                            const list = req.result || [];
                            const idbKeys = new Set();
                            list.forEach(item => {
                                if (item && item.k && item.v !== undefined) {
                                    idbKeys.add(item.k);
                                    memoryStorageMap[item.k] = item.v;
                                    try {
                                        if (SafeStorage.isAvailable) {
                                            const cur = window.localStorage.getItem(item.k);
                                            if (cur === null || cur === '' || cur === 'null' || cur === 'undefined') {
                                                window.localStorage.setItem(item.k, item.v);
                                            }
                                        }
                                    } catch (err) { }
                                }
                            });
                            // 反向同步：若 localStorage 中存在 vocab_ 开头的数据但 IndexedDB 中尚未建立，自动同步进 IndexedDB
                            try {
                                if (SafeStorage.isAvailable && window.localStorage) {
                                    for (let i = 0; i < window.localStorage.length; i++) {
                                        const lsKey = window.localStorage.key(i);
                                        if (lsKey && lsKey.startsWith('vocab_') && !idbKeys.has(lsKey)) {
                                            const lsVal = window.localStorage.getItem(lsKey);
                                            if (lsVal !== null && lsVal !== undefined) {
                                                store.put({ k: lsKey, v: lsVal });
                                                memoryStorageMap[lsKey] = lsVal;
                                            }
                                        }
                                    }
                                }
                            } catch (syncErr) { }
                            resolve(this.db);
                        };
                        req.onerror = () => resolve(this.db);
                    } catch (err) {
                        resolve(this.db);
                    }
                };
                request.onerror = (e) => {
                    resolve(null);
                };
            } catch (err) {
                resolve(null);
            }
        });
        return this._initPromise;
    },

    async saveKV(key, val) {
        await this.init();
        if (!this.db) return false;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('kv_store', 'readwrite');
                const store = tx.objectStore('kv_store');
                store.put({ k: key, v: val });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    },

    async deleteKV(key) {
        await this.init();
        if (!this.db) return false;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('kv_store', 'readwrite');
                const store = tx.objectStore('kv_store');
                store.delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
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

