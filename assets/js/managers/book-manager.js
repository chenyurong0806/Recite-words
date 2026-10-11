/**
 * 词书管理器 (云端/本地/缓存分类隔离、增量更新与索引同步)
 * Module: assets/js/managers/book-manager.js
 */

/* ==========================================================================
   3. 词书管理器 (云端/本地/缓存分类隔离)
   ========================================================================== */
// 全局通用：彻底剔除词书名中的所有 📂、📁 及前后多余空格
function cleanBookName(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[📂📁]/g, '').trim();
}

const BookManager = {
    availableBooks: [],
    bookCache: {},
    cloudFetchSuccess: false,
    dorisBooks: [],
    categories: ['我的', '全部', '高中', '初中', '大学', '实词', '翻译', '其他', 'Doris'],

    // 默认内置兜底词书 (严格采用云端最新分类：高中、初中、大学、实词、翻译、其他)
    fallbackBooks: [
        { id: 'builtin_default', name: '默认词书', category: '内置', count: DEFAULT_WORDS.length, words: DEFAULT_WORDS, path: '', isCloud: false, syncStatus: 'downloaded' },
        { id: 'books/高中/高中考纲词汇.json', name: '高中考纲词汇', category: '高中', count: 3892, path: 'books/高中/高中考纲词汇.json', isCloud: true, size: 709960, updatedAt: 1790866132725 },
        { id: 'books/高中/高中考纲词组.json', name: '高中考纲词组', category: '高中', count: 1200, path: 'books/高中/高中考纲词组.json', isCloud: true, size: 101004, updatedAt: 1789287225149 },
        { id: 'books/高中/高中518词组.json', name: '高中518词组', category: '高中', count: 570, path: 'books/高中/高中518词组.json', isCloud: true, size: 43073, updatedAt: 1789277163781 },
        { id: 'books/高中/高考真题高频.json', name: '高考真题高频', category: '高中', count: 799, path: 'books/高中/高考真题高频.json', isCloud: true, size: 188628, updatedAt: 1790993843899 },
        { id: 'books/高中/高考阅读高频.json', name: '高考阅读高频', category: '高中', count: 688, path: 'books/高中/高考阅读高频.json', isCloud: true, size: 56600, updatedAt: 1790994126898 },
        { id: 'books/初中/初中考纲词汇.json', name: '初中考纲词汇', category: '初中', count: 1741, path: 'books/初中/初中考纲词汇.json', isCloud: true, size: 203237, updatedAt: 1790866132727 },
        { id: 'books/初中/初中考纲词组.json', name: '初中考纲词组', category: '初中', count: 347, path: 'books/初中/初中考纲词组.json', isCloud: true, size: 37098, updatedAt: 1790865358054 },
        { id: 'books/大学/四级词汇.json', name: '四级词汇', category: '大学', count: 2607, path: 'books/大学/四级词汇.json', isCloud: true, size: 521112, updatedAt: 1788585207794 },
        { id: 'books/大学/六级词汇.json', name: '六级词汇', category: '大学', count: 2345, path: 'books/大学/六级词汇.json', isCloud: true, size: 481442, updatedAt: 1790993777567 },
        { id: 'books/大学/考研/考研红宝书.json', name: '考研红宝书', category: '大学', count: 6705, path: 'books/大学/考研/考研红宝书.json', isCloud: true, size: 1309181, updatedAt: 1790994144781 },
        { id: 'books/实词/初中150实词.json', name: '初中150实词', category: '实词', count: 150, path: 'books/实词/初中150实词.json', isCloud: true, size: 117017, updatedAt: 1790865998755 },
        { id: 'books/实词/高中300实词.json', name: '高中300实词', category: '实词', count: 300, path: 'books/实词/高中300实词.json', isCloud: true, size: 494200, updatedAt: 1789290228192 },
        { id: 'books/翻译/高中翻译.json', name: '高中翻译', category: '翻译', count: 107, path: 'books/翻译/高中翻译.json', isCloud: true, size: 13350, updatedAt: 1790774698937 },
        { id: 'books/其他/基础词汇.json', name: '基础词汇', category: '其他', count: 2991, path: 'books/其他/基础词汇.json', isCloud: true, size: 286696, updatedAt: 1789277152518 }
    ],

    // 旧版词书 ID / 路径映射至最新路径
    legacyBookMap: {
        'GaoKao3500': 'books/高中/高中考纲词汇.json',
        'books/考纲/高考3500.json': 'books/高中/高中考纲词汇.json',
        'books/经典/高中考纲词汇.json': 'books/高中/高中考纲词汇.json',
        'books/考纲/初中考纲词汇.json': 'books/初中/初中考纲词汇.json',
        'books/经典/初中考纲词汇.json': 'books/初中/初中考纲词汇.json',
        'books/考纲/初中考纲词组.json': 'books/初中/初中考纲词组.json',
        'books/经典/初中考纲词组.json': 'books/初中/初中考纲词组.json',
        'books/考纲/518.json': 'books/高中/高中518词组.json',
        'books/经典/高中518词组.json': 'books/高中/高中518词组.json',
        'books/考纲/考纲词组.json': 'books/高中/高中考纲词组.json',
        'books/经典/高中考纲词组.json': 'books/高中/高中考纲词组.json',
        'books/其他/CET4.json': 'books/大学/四级词汇.json',
        'books/经典/四级词汇.json': 'books/大学/四级词汇.json',
        'books/其他/CET6.json': 'books/大学/六级词汇.json',
        'books/经典/六级词汇.json': 'books/大学/六级词汇.json',
        'books/其他/小学词汇.json': 'books/其他/基础词汇.json',
        'books/经典/基础词汇.json': 'books/其他/基础词汇.json',
        'books/经典/考研红宝书.json': 'books/大学/考研/考研红宝书.json',
        'books/经典/高考真题高频.json': 'books/高中/高考真题高频.json',
        'books/经典/高考阅读高频.json': 'books/高中/高考阅读高频.json',
        'books/实词/实词.json': 'books/实词/高中300实词.json',
        'books/高中精选/翻译.json': 'books/翻译/高中翻译.json',
        'books/翻译/翻译.json': 'books/翻译/高中翻译.json'
    },

    isMeteredConnection() {
        try {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn) {
                if (conn.saveData) return true;
                if (conn.type === 'cellular') return true;
                if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g') return true;
            }
        } catch (e) { }
        return false;
    },

    async init() {
        this.bookCache['builtin_default'] = this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');

        // 1. 从本地还原缓存的云端词书列表
        try {
            const cachedCloudList = localStorage.getItem('vocab_cached_cloud_books');
            if (cachedCloudList) {
                const parsed = JSON.parse(cachedCloudList);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.availableBooks = parsed;
                }
            }
        } catch (e) { }

        // 2. 从 IndexedDB 加载本地已下载词书与用户自定义词书
        try {
            await VocabOfflineDB.init();
            const offlineBooks = await VocabOfflineDB.getAllBooks();
            if (!window.customBooks) window.customBooks = [];

            offlineBooks.forEach(ob => {
                ob.name = cleanBookName(ob.name);
                ob.rawName = cleanBookName(ob.rawName || ob.name);
                if (ob.isCloud) {
                    if (ob.words && ob.words.length > 0 && !this.bookCache[ob.id]) {
                        this.bookCache[ob.id] = ob.words;
                    }
                } else {
                    if (!window.customBooks.some(cb => cb.id === ob.id)) {
                        window.customBooks.push(ob);
                    }
                    if (ob.words && !this.bookCache[ob.id]) {
                        this.bookCache[ob.id] = ob.words;
                    }
                }
            });
            localFolders = await VocabOfflineDB.getAllFolders();
            localFolders.forEach(f => f.name = cleanBookName(f.name));
        } catch (e) {
            console.warn('[BookManager] Offline books load error:', e);
        }

        // 3. 如果 Doris 已通过密码解锁，后台加载 Doris 内部词书
        if (typeof isDorisUnlocked === 'function' && isDorisUnlocked()) {
            this.loadDorisBooks(false).catch(() => {});
        }

        // 4. 获取云端最新词书索引文件并对比更新状态
        await this.fetchBookList();

        // 5. 初始进入网站逻辑优化：不要一次性全量下载词书！首次进入只下载核心词书《高中考纲词汇》
        const gaoKaoId = 'books/高中/高中考纲词汇.json';
        const hasGaoKao = (this.bookCache[gaoKaoId] && this.bookCache[gaoKaoId].length > 50) ||
                          (await VocabOfflineDB.getBook(gaoKaoId));
        if (!hasGaoKao) {
            console.log('[BookManager] 首次进入网站，按需下载核心词书《高中考纲词汇》...');
            this.downloadBook(gaoKaoId, true).catch(() => {});
        } else {
            // 确保缓存中存在
            if (!this.bookCache[gaoKaoId]) {
                const b = await VocabOfflineDB.getBook(gaoKaoId);
                if (b && b.words) this.bookCache[gaoKaoId] = b.words;
            }
        }
    },

    /**
     * 获取云端词书索引文件 (books-index.json) 并完成分类冲突仲裁与版本比对
     */
    async fetchBookList() {
        const banner = document.getElementById('worker-status-banner');
        let fetchedBooks = null;

        // 优先从 books-index.json 读取云端词书索引 (记录最新更新时间与分类)
        const indexSources = [
            './books/books-index.json',
            'https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/books/books-index.json',
            'https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/books/books-index.json',
            'https://testingcf.jsdelivr.net/gh/chenyurong0806/Recite-words@main/books/books-index.json'
        ];

        for (const url of indexSources) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const text = await res.text();
                    const data = safeJsonParse(text);
                    if (data && Array.isArray(data.books) && data.books.length > 0) {
                        fetchedBooks = data.books;
                        this.cloudFetchSuccess = true;
                        break;
                    }
                }
            } catch (e) { }
        }

        // 若索引文件加载失败，降级使用 fallbackBooks
        if (!fetchedBooks || fetchedBooks.length === 0) {
            fetchedBooks = [...this.fallbackBooks.filter(b => b.isCloud)];
        }

        // 以云端分类和元数据为绝对准则，更新 availableBooks
        this.availableBooks = fetchedBooks.map(item => {
            const id = (item.id || item.path).replace(/\\/g, '/');
            const pathStr = (item.path || id).replace(/\\/g, '/');
            return {
                id: id,
                name: cleanBookName(item.name || item.title || id),
                category: cleanBookName(item.category || '高中'),
                count: item.count || (item.words ? item.words.length : null) || (item.size ? Math.round(item.size / 120) : null) || '多词',
                path: pathStr,
                size: item.size || null,
                updatedAt: item.updatedAt || 0,
                cdnUrl: `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(pathStr)}`,
                downloadUrl: `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(pathStr)}`,
                isCloud: true,
                syncStatus: 'not_downloaded'
            };
        });

        // 关键逻辑：云端分类仲裁与本地历史缓存矫正
        // 凡与云端冲突的本地词书或历史选择项，强制以云端最新分类为准
        await this.syncAndMigrateLocalCategories();

        this.mergeCustomBooks();

        try {
            localStorage.setItem('vocab_cached_cloud_books', JSON.stringify(this.availableBooks.filter(b => b.isCloud)));
            localStorage.setItem('vocab_last_books_fetch_time', Date.now().toString());
        } catch (e) { }

        if (banner) banner.style.display = 'none';
        return { success: true, books: this.availableBooks };
    },

    /**
     * 云端分类仲裁：对比 IndexedDB 与 localStorage，以云端分类和最新结构覆写冲突旧分类
     */
    async syncAndMigrateLocalCategories() {
        try {
            const offlineBooks = await VocabOfflineDB.getAllBooks();
            const cloudBookMap = new Map();
            this.availableBooks.forEach(cb => cloudBookMap.set(cb.name, cb));

            for (const ob of offlineBooks) {
                if (!ob) continue;
                const cloudMatched = cloudBookMap.get(ob.name) || 
                    this.availableBooks.find(cb => cb.id === ob.id || cb.id === this.legacyBookMap[ob.id]);

                if (cloudMatched) {
                    let needsSave = false;
                    // 分类冲突：以云端为准
                    if (ob.category !== cloudMatched.category) {
                        console.log(`[BookManager] 词书《${ob.name}》分类由旧分类“${ob.category}”同步为云端“${cloudMatched.category}”`);
                        ob.category = cloudMatched.category;
                        needsSave = true;
                    }
                    if (ob.id !== cloudMatched.id && this.legacyBookMap[ob.id] === cloudMatched.id) {
                        // 迁移旧 ID
                        await VocabOfflineDB.deleteBook(ob.id);
                        ob.id = cloudMatched.id;
                        ob.path = cloudMatched.path;
                        needsSave = true;
                    }
                    if (cloudMatched.updatedAt && (!ob.updatedAt || cloudMatched.updatedAt > ob.updatedAt)) {
                        cloudMatched.syncStatus = 'update_available';
                    } else if (ob.words && ob.words.length > 0) {
                        cloudMatched.syncStatus = 'downloaded';
                        if (!ob.updatedAt && cloudMatched.updatedAt) {
                            ob.updatedAt = cloudMatched.updatedAt;
                            needsSave = true;
                        }
                    }
                    if (needsSave) {
                        await VocabOfflineDB.saveBook(ob);
                    }
                }
            }

            // 纠正 singleSelectedBookIds 中的旧版词书路径
            if (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds)) {
                let changed = false;
                singleSelectedBookIds = singleSelectedBookIds.map(id => {
                    if (this.legacyBookMap[id]) {
                        changed = true;
                        return this.legacyBookMap[id];
                    }
                    return id;
                });
                if (changed) {
                    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
                }
            }
        } catch (e) {
            console.warn('[BookManager] Category migration warning:', e);
        }
    },

    /**
     * 手动/按需下载单本词书 (不一次性全量拉取，节省流量并秒开页面)
     */
    async downloadBook(bookId, silent = false) {
        if (!bookId) return false;
        if (this.legacyBookMap[bookId]) bookId = this.legacyBookMap[bookId];

        const bookMeta = this.getBookMeta(bookId);
        if (!silent && typeof showToast === 'function') {
            showToast(`正在下载《${bookMeta.name || bookId}》...`);
        }

        try {
            const words = await this.loadBookData(bookId, true);
            if (words && words.length > 0) {
                // 更新元数据状态
                const target = this.availableBooks.find(b => b.id === bookId);
                if (target) target.syncStatus = 'downloaded';
                if (!silent && typeof showToast === 'function') {
                    showToast(`《${bookMeta.name || bookId}》下载成功 (共${words.length}词)！`);
                }
                if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
                    renderBookSelectorPage();
                }
                if (typeof renderManageBooksPage === 'function' && window.currentView === 'view-manage-books') {
                    renderManageBooksPage();
                }
                return true;
            }
        } catch (err) {
            console.error('[BookManager] Download book failed:', bookId, err);
            if (!silent && typeof showToast === 'function') {
                showToast(`下载《${bookMeta.name || bookId}》失败，请检查网络`);
            }
        }
        return false;
    },

    /**
     * 删除本地已下载的词书 (仅删除本地缓存，云端列表保留未下载状态)
     */
    async deleteDownloadedBook(bookId) {
        if (!bookId) return false;
        try {
            await VocabOfflineDB.deleteBook(bookId);
            delete this.bookCache[bookId];
            const target = this.availableBooks.find(b => b.id === bookId);
            if (target) {
                target.syncStatus = 'not_downloaded';
                target.words = null;
            }
            const fallback = this.fallbackBooks ? this.fallbackBooks.find(b => b.id === bookId) : null;
            if (fallback) {
                fallback.syncStatus = 'not_downloaded';
                fallback.words = null;
            }

            // 若正被选中，则从选词列表剔除
            if (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds)) {
                if (singleSelectedBookIds.includes(bookId)) {
                    singleSelectedBookIds = singleSelectedBookIds.filter(id => id !== bookId);
                    if (singleSelectedBookIds.length === 0) {
                        singleSelectedBookIds = ['books/高中/高中考纲词汇.json'];
                    }
                    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
                }
            }

            if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
                renderBookSelectorPage();
            }
            if (typeof renderManageBooksPage === 'function' && window.currentView === 'view-manage-books') {
                renderManageBooksPage();
            }
            return true;
        } catch (e) {
            console.error('[BookManager] deleteDownloadedBook error:', e);
            return false;
        }
    },

    /**
const DORIS_LOCAL_FALLBACK_BOOKS = [
    { id: 'books/Doris/Wordbank 1.json', name: 'Wordbank 1', category: 'Doris', count: 100, isCloud: true, isDoris: true },
    { id: 'books/Doris/Wordbank 3.json', name: 'Wordbank 3', category: 'Doris', count: 100, isCloud: true, isDoris: true },
    { id: 'books/Doris/Wordbank 4.json', name: 'Wordbank 4', category: 'Doris', count: 80, isCloud: true, isDoris: true },
    { id: 'books/Doris/基础闯关a-as.json', name: '基础闯关 a-as', category: 'Doris', count: 68, isCloud: true, isDoris: true },
    { id: 'books/Doris/基础闯关a-b.json', name: '基础闯关 a-b', category: 'Doris', count: 50, isCloud: true, isDoris: true },
    { id: 'books/Doris/基础闯关b-c.json', name: '基础闯关 b-c', category: 'Doris', count: 45, isCloud: true, isDoris: true },
    { id: 'books/Doris/基础闯关c-d.json', name: '基础闯关 c-d', category: 'Doris', count: 48, isCloud: true, isDoris: true },
    { id: 'books/Doris/词汇测试a-as.json', name: '词汇测试 a-as', category: 'Doris', count: 25, isCloud: true, isDoris: true },
    { id: 'books/Doris/高一高二.json', name: '高一高二核心词汇', category: 'Doris', count: 1200, isCloud: true, isDoris: true },
    { id: 'books/Doris/高三.json', name: '高三冲刺词汇', category: 'Doris', count: 600, isCloud: true, isDoris: true }
];

    /**
     * 加载 Doris 内部词书 (密码验证后从 Supabase 拉取，离线时降级使用本地预置词书)
     */
    async loadDorisBooks(triggerRefresh = true) {
        try {
            let dorisList = [];
            if (typeof fetchDorisBooksFromSupabase === 'function') {
                try {
                    dorisList = await fetchDorisBooksFromSupabase();
                } catch (e) {
                    console.warn('[BookManager] fetchDorisBooksFromSupabase error:', e);
                }
            }
            if (!Array.isArray(dorisList) || dorisList.length === 0) {
                dorisList = DORIS_LOCAL_FALLBACK_BOOKS;
            }

            if (Array.isArray(dorisList) && dorisList.length > 0) {
                this.dorisBooks = dorisList;
                dorisList.forEach(db => {
                    if (db.words && db.words.length > 0) {
                        this.bookCache[db.id] = this.normalizeWords(db.words, db.name, db.id);
                        if (typeof VocabOfflineDB !== 'undefined') {
                            VocabOfflineDB.saveBook({
                                id: db.id,
                                name: db.name,
                                category: 'Doris',
                                count: db.count,
                                words: this.bookCache[db.id],
                                isCloud: true,
                                isDoris: true,
                                updatedAt: db.updatedAt || Date.now()
                            }).catch(() => {});
                        }
                    }
                    if (!this.availableBooks.some(b => b.id === db.id)) {
                        this.availableBooks.push(db);
                    }
                });
                if (triggerRefresh) {
                    if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
                        renderBookSelectorPage();
                    }
                    if (typeof renderManageBooksPage === 'function' && window.currentView === 'view-manage-books') {
                        renderManageBooksPage();
                    }
                }
                return dorisList;
            }
        } catch (e) {
            console.warn('[BookManager] loadDorisBooks error:', e);
        }
        return [];
    },

    mergeCustomBooks() {
        if (window.customBooks && window.customBooks.length > 0) {
            window.customBooks.forEach(cb => {
                if (!this.availableBooks.some(b => b.id === cb.id)) {
                    this.availableBooks.push(cb);
                }
            });
        }
    },

    async loadBookData(bookId, forceNetwork = false) {
        if (bookId === 'builtin_default' || bookId === 'DEFAULT_WORDS') {
            return this.bookCache['builtin_default'] || this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        }
        if (this.legacyBookMap[bookId]) {
            bookId = this.legacyBookMap[bookId];
        }

        if (!forceNetwork && this.bookCache[bookId] && this.bookCache[bookId].length > 0) {
            return this.bookCache[bookId];
        }

        const isGaoKao = (bookId === 'books/高中/高中考纲词汇.json' || bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json' || bookId === 'books/经典/高中考纲词汇.json');
        if (isGaoKao && !forceNetwork) {
            if (this.bookCache['books/高中/高中考纲词汇.json'] && this.bookCache['books/高中/高中考纲词汇.json'].length > 50) return this.bookCache['books/高中/高中考纲词汇.json'];
            if (this.bookCache['books/经典/高中考纲词汇.json'] && this.bookCache['books/经典/高中考纲词汇.json'].length > 50) return this.bookCache['books/经典/高中考纲词汇.json'];
            if (this.bookCache['books/考纲/高考3500.json'] && this.bookCache['books/考纲/高考3500.json'].length > 50) return this.bookCache['books/考纲/高考3500.json'];
            if (this.bookCache['GaoKao3500'] && this.bookCache['GaoKao3500'].length > 50) return this.bookCache['GaoKao3500'];
        }

        // 优先检查用户自定义词书
        if (window.customBooks) {
            const custom = window.customBooks.find(b => b.id === bookId);
            if (custom && custom.words) {
                this.bookCache[bookId] = this.normalizeWords(custom.words, custom.name, custom.id);
                return this.bookCache[bookId];
            }
        }

        // 检查本地离线数据库 (IndexedDB)
        if (!forceNetwork) {
            try {
                const offlineBook = await VocabOfflineDB.getBook(bookId);
                if (offlineBook && offlineBook.words && offlineBook.words.length > 0) {
                    this.bookCache[bookId] = offlineBook.words;
                    if (isGaoKao) {
                        this.bookCache['books/高中/高中考纲词汇.json'] = offlineBook.words;
                    }
                    return offlineBook.words;
                }
            } catch (e) { }
        }

        // 若为 Doris 词书，通过 Supabase 请求
        if (bookId.startsWith('doris_') || (this.getBookMeta(bookId) && this.getBookMeta(bookId).isDoris)) {
            const dorisList = await this.loadDorisBooks(false);
            const found = dorisList.find(b => b.id === bookId);
            if (found && found.words) {
                const normalized = this.normalizeWords(found.words, found.name, bookId);
                this.bookCache[bookId] = normalized;
                return normalized;
            }
        }

        const bookMeta = this.getBookMeta(bookId);

        // 构造资源请求地址 (优先使用 CDN / GitHub，彻底解决 Toy 平台 404 报错)
        let relPath = bookMeta.path || bookId;
        if (!relPath.startsWith('books/') && !relPath.includes('/')) {
            if (isGaoKao) relPath = 'books/高中/高中考纲词汇.json';
            else relPath = `books/${bookMeta.category || '高中'}/${bookMeta.name || bookId}.json`;
        }
        relPath = relPath.replace(/\\/g, '/');

        const encodedRel = encodeURI(relPath);
        const sources = [];

        // 1. 如果在标准静态 Web 环境 (非 Toy 容器，且非 file 协议)，尝试读取同域文件
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:' && typeof isBilibiliToy !== 'undefined' && !isBilibiliToy) {
            sources.push(`./${encodedRel}`);
            sources.push(`./${relPath}`);
        }

        // 2. 线上公网 CDN 与 GitHub Raw (首选通道，避免 Toy 静态包缺失引发 404)
        sources.push(`https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`);
        sources.push(`https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodedRel}`);
        sources.push(`https://testingcf.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`);
        sources.push(`https://gcore.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`);

        // 3. 本地 file 协议下备选
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
            sources.push(`./${encodedRel}`);
            sources.push(`./${relPath}`);
        }

        for (const url of sources) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const rawText = await res.text();
                    const rawData = safeJsonParse(rawText);
                    if (rawData) {
                        const normalized = this.normalizeWords(rawData, bookMeta.name || bookId, bookId);
                        if (normalized.length > 0) {
                            this.bookCache[bookId] = normalized;
                            if (isGaoKao) {
                                this.bookCache['books/高中/高中考纲词汇.json'] = normalized;
                                this.bookCache['books/经典/高中考纲词汇.json'] = normalized;
                                this.bookCache['GaoKao3500'] = normalized;
                            }
                            // 存入本地离线数据库
                            await VocabOfflineDB.saveBook({
                                id: bookId,
                                name: bookMeta.name || bookId,
                                category: bookMeta.category || '高中',
                                count: normalized.length,
                                words: normalized,
                                updatedAt: bookMeta.updatedAt || Date.now(),
                                isCloud: true
                            }).catch(() => { });

                            // 同步保存一份至专属本地词书目录 (Electron 环境)
                            if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
                                const diskBookName = (bookMeta.name || bookId).replace(/[\\/:*?"<>|]/g, '_') + '.json';
                                ElectronManager.saveBookToDisk(diskBookName, JSON.stringify(normalized, null, 2)).catch(() => {});
                            }

                            const target = this.availableBooks.find(b => b.id === bookId);
                            if (target) target.syncStatus = 'downloaded';

                            return normalized;
                        }
                    }
                }
            } catch (e) { }
        }

        // 降级使用内置 fallback 数据
        const fallback = this.fallbackBooks.find(b => b.id === bookId);
        if (fallback && fallback.words) {
            return this.normalizeWords(fallback.words, fallback.name, fallback.id);
        }
        if (bookId === 'builtin_default') {
            return this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        }
        return [];
    },

    /**
     * 高鲁棒性词条归一化引擎：兼容词典数组、包装对象、中英键值对等各种格式，去除 UTF-8 BOM
     */
    normalizeWords(rawData, bookName = '', bookId = '') {
        if (!rawData) return [];
        let list = rawData;

        // 兼容解包各种常见 JSON 数据结构
        if (!Array.isArray(rawData)) {
            if (rawData.words && Array.isArray(rawData.words)) list = rawData.words;
            else if (rawData.list && Array.isArray(rawData.list)) list = rawData.list;
            else if (rawData.items && Array.isArray(rawData.items)) list = rawData.items;
            else if (rawData.data && Array.isArray(rawData.data)) list = rawData.data;
            else if (typeof rawData === 'object') {
                // 处理形如 { "apple": "苹果", "banana": "香蕉" } 结构
                list = Object.keys(rawData).map(k => ({ word: k, trans: rawData[k] }));
            } else {
                return [];
            }
        }

        return list.map(item => {
            if (!item) return null;
            const word = (item.word || item.name || item.headWord || item.key || item.title || '').trim();
            if (!word) return null;

            let phone = item.phone || item.phonetic || '';
            if (!phone && item.pinyin) phone = item.pinyin;
            else if (!phone && item.usphone) phone = `/${item.usphone}/`;
            else if (!phone && item.ukphone) phone = `/${item.ukphone}/`;

            let meanings = [];
            if (Array.isArray(item.senses) && item.senses.length > 0) {
                meanings = item.senses.map(s => {
                    if (typeof s === 'string') return { pos: '', meaning: s };
                    return {
                        pos: s.part_of_speech || s.pos || '',
                        meaning: (s.meaning || s.trans || '').replace(/★/g, ''),
                        examples: s.examples || []
                    };
                });
            } else if (Array.isArray(item.meanings) && item.meanings.length > 0) {
                meanings = item.meanings.map(m => {
                    if (typeof m === 'string') {
                        const match = m.match(/^([a-z]+\.)\s*(.+)/i);
                        return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: m.trim() };
                    }
                    return { pos: m.pos || '', meaning: m.meaning || m.trans || '' };
                });
            } else if (Array.isArray(item.trans) && item.trans.length > 0) {
                meanings = item.trans.map(t => {
                    if (typeof t !== 'string') return null;
                    const match = t.match(/^([a-z]+\.)\s*(.+)/i);
                    return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: t.trim() };
                }).filter(Boolean);
            } else if (Array.isArray(item.translations) && item.translations.length > 0) {
                meanings = item.translations.map(t => ({ pos: '', meaning: typeof t === 'string' ? t : (t.translation || '') }));
            } else if (typeof item.trans === 'string') {
                meanings = [{ pos: '', meaning: item.trans }];
            } else if (typeof item.translation === 'string') {
                meanings = [{ pos: '', meaning: item.translation }];
            } else if (typeof item.definition === 'string') {
                meanings = [{ pos: '', meaning: item.definition }];
            } else if (typeof item.meaning === 'string') {
                meanings = [{ pos: '', meaning: item.meaning }];
            }

            if (meanings.length === 0) {
                meanings = [{ pos: '', meaning: '释义暂缺' }];
            }

            return {
                word,
                phone,
                meanings,
                senses: item.senses || null,
                pinyin: item.pinyin || phone,
                bookName: bookName || '练习词书',
                bookId: bookId || 'default'
            };
        }).filter(Boolean);
    },

    async loadMultipleBooks(bookIds = []) {
        if (!bookIds || bookIds.length === 0) return [];
        const loadPromises = bookIds.map(id => this.loadBookData(id));
        const results = await Promise.all(loadPromises);
        const combined = [];
        const seenWords = new Set();
        results.flat().forEach(item => {
            if (item && !seenWords.has(item.word.toLowerCase())) {
                seenWords.add(item.word.toLowerCase());
                combined.push(item);
            }
        });
        return combined;
    },

    getBookMeta(bookId) {
        if (!bookId) return null;
        if (this.legacyBookMap[bookId]) bookId = this.legacyBookMap[bookId];
        return (this.availableBooks || []).find(b => b && (b.id === bookId || b.path === bookId)) ||
            (this.fallbackBooks || []).find(b => b && (b.id === bookId || b.path === bookId)) ||
            (window.customBooks || []).find(b => b && (b.id === bookId)) ||
            { id: bookId, name: cleanBookName(String(bookId).replace(/^.*\//, '').replace(/\.json$/i, '')), category: '高中' };
    }
};

/* ==========================================================================
   词书工具与去重辅助
   ========================================================================== */
function getAllUniqueBooks() {
    const list = [];
    const seen = new Set();
    const candidates = [
        ...(BookManager.availableBooks || []),
        ...(BookManager.fallbackBooks || []),
        ...(BookManager.dorisBooks || []),
        ...(window.customBooks || [])
    ];
    const hasCloudBooks = candidates.some(b => b && (b.isCloud || String(b.id).startsWith('books/')));
    for (const b of candidates) {
        if (!b || !b.id) continue;
        if (hasCloudBooks && b.id === 'builtin_default') continue;
        if (!seen.has(b.id)) {
            seen.add(b.id);
            list.push(b);
        }
    }
    return list;
}

function isBookShiCi(b) {
    if (!b) return false;
    return b.category === '实词' || 
           b.id === 'books/实词/实词.json' || 
           b.id === 'books/实词/初中150实词.json' || 
           b.id === 'books/实词/高中300实词.json' || 
           (typeof isShiCiBook === 'function' && isShiCiBook(b));
}
