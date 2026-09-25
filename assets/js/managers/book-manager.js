/**
 * 词书管理器 (云端/本地/缓存分类隔离)
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
    API_BASE: 'https://vocab-api.chenyurong.qzz.io',
    availableBooks: [],
    bookCache: {},
    cloudFetchSuccess: false,
    fallbackBooks: [
        { id: 'builtin_default', name: '默认词书', category: '内置', count: DEFAULT_WORDS.length, words: DEFAULT_WORDS, path: '', isCloud: false },
        { id: 'books/考纲/高考3500.json', name: '高考3500', category: '考纲', count: 3893, path: 'books/考纲/高考3500.json', isCloud: true },
        { id: 'books/考纲/518.json', name: '518', category: '考纲', count: 570, path: 'books/考纲/518.json', isCloud: true },
        { id: 'books/考纲/考纲词组.json', name: '考纲词组', category: '考纲', count: 1201, path: 'books/考纲/考纲词组.json', isCloud: true },
        { id: 'books/Doris/基础闯关a-as.json', name: '基础闯关a-as', category: 'Doris', count: 68, path: 'books/Doris/基础闯关a-as.json', isCloud: true },
        { id: 'books/Doris/翻译.json', name: '翻译', category: 'Doris', count: 58, path: 'books/Doris/翻译.json', isCloud: true },
        { id: 'books/Doris/词汇测试a-as.json', name: '词汇测试a-as', category: 'Doris', count: 25, path: 'books/Doris/词汇测试a-as.json', isCloud: true },
        { id: 'books/Doris/高一高二笔记.json', name: '高一高二笔记', category: 'Doris', count: 1039, path: 'books/Doris/高一高二笔记.json', isCloud: true },
        { id: 'books/Doris/高三笔记.json', name: '高三笔记', category: 'Doris', count: 31, path: 'books/Doris/高三笔记.json', isCloud: true },
        { id: 'books/其他/CET4.json', name: 'CET4', category: '其他', count: 2607, path: 'books/其他/CET4.json', isCloud: true },
        { id: 'books/其他/小学词汇.json', name: '小学词汇', category: '其他', count: 2991, path: 'books/其他/小学词汇.json', isCloud: true },
        { id: 'books/实词/实词.json', name: '实词', category: '实词', count: 300, path: 'books/实词/实词.json', isCloud: true }
    ],

    async init() {
        this.bookCache['builtin_default'] = this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        try {
            await VocabOfflineDB.init();
            const offlineBooks = await VocabOfflineDB.getAllBooks();
            if (!window.customBooks) window.customBooks = [];
            offlineBooks.forEach(ob => {
                // 强制清理历史缓存名称中的文件夹图标
                ob.name = cleanBookName(ob.name);
                ob.rawName = cleanBookName(ob.rawName || ob.name);
                if (ob.isCloud) {
                    if (ob.words && !this.bookCache[ob.id]) {
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
        await this.fetchBookList();
        this.preloadAllWorkerBooks();
    },

    async preloadAllWorkerBooks() {
        try {
            await this.loadBookData('books/考纲/高考3500.json');
        } catch (e) { }
        if (!Array.isArray(this.availableBooks)) return;
        for (const book of this.availableBooks) {
            if (book.id !== 'builtin_default' && !this.bookCache[book.id]) {
                try {
                    await this.loadBookData(book.id);
                } catch (e) { }
            }
        }
        if (typeof _allDbWordsCache !== 'undefined') {
            _allDbWordsCache = null;
        }
    },

    async fetchBookList() {
        const banner = document.getElementById('worker-status-banner');
        let fetchedBooks = null;

        // 1. 优先直接从 GitHub 仓库读取 books 目录 (确保实时获取最新提交的词书)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);
            const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/git/trees/main?recursive=1', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                if (ghData.tree && Array.isArray(ghData.tree)) {
                    const books = ghData.tree
                        .filter(item => item.type === 'blob' && item.path.startsWith('books/') && item.path.endsWith('.json'))
                        .map(item => {
                            const parts = item.path.split('/');
                            const filename = parts[parts.length - 1];
                            const name = cleanBookName(filename.replace(/\.json$/i, ''));
                            const category = cleanBookName(parts.length > 2 ? parts[1] : '精选');
                            return {
                                id: item.path,
                                name: name,
                                category: category,
                                path: item.path,
                                size: item.size,
                                cdnUrl: `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(item.path)}`,
                                downloadUrl: `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(item.path)}`,
                                isCloud: true
                            };
                        });
                    if (books.length > 0) {
                        fetchedBooks = books;
                    }
                }
            }
        } catch (ghErr) {
            console.warn('[BookManager] Direct GitHub trees fetch failed, trying worker:', ghErr);
        }

        // 2. 若 GitHub API 受限或失败，尝试从 Cloudflare Worker 获取 (且必须是包含 books/ 规范路径的新结构)
        if (!fetchedBooks || fetchedBooks.length === 0) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(`${this.API_BASE}/api/books`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const data = await res.json();
                    // 检查返回的是否为新的 GitHub books 结构（过滤掉旧版 KV 遗留的旧字典清单）
                    if (Array.isArray(data) && data.length > 0) {
                        const isNewFormat = data.some(b => (b.path && b.path.startsWith('books/')) || b.category);
                        if (isNewFormat) {
                            fetchedBooks = data;
                        } else {
                            console.warn('[BookManager] Worker returned legacy KV books, ignoring in favor of books/ folder.');
                        }
                    }
                }
            } catch (err) {
                console.warn('[BookManager] Worker fetch failed:', err);
            }
        }

        // 3. 处理获取到的词书或使用 fallbackBooks
        if (fetchedBooks && fetchedBooks.length > 0) {
            this.cloudFetchSuccess = true;
            this.availableBooks = fetchedBooks.map(item => ({
                id: String(item.id || item.path || item.name),
                name: cleanBookName(item.name || item.title || item.id),
                category: cleanBookName(item.category || '精选'),
                count: item.count || (item.words ? item.words.length : null) || (item.size ? `${Math.round(item.size / 120)}` : null) || '多词',
                path: item.path || (String(item.id).startsWith('books/') ? item.id : `books/${item.category || '其他'}/${item.name || item.id}.json`),
                cdnUrl: item.cdnUrl || `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(item.path || item.id)}`,
                downloadUrl: item.downloadUrl || `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(item.path || item.id)}`,
                isCloud: true
            }));
            this.mergeCustomBooks();
            if (banner) banner.style.display = 'none';
            return { success: true, books: this.availableBooks };
        } else {
            this.cloudFetchSuccess = false;
            this.availableBooks = [...this.fallbackBooks];
            this.mergeCustomBooks();
            if (banner) banner.style.display = 'block';
            return { success: false, error: 'Loaded fallback books', books: this.availableBooks };
        }
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

    async loadBookData(bookId) {
        if (bookId === 'builtin_default' || bookId === 'DEFAULT_WORDS') {
            return this.bookCache['builtin_default'] || this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        }
        if (this.bookCache[bookId]) return this.bookCache[bookId];

        const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
        if (isGaoKao) {
            if (this.bookCache['books/考纲/高考3500.json']) return this.bookCache['books/考纲/高考3500.json'];
            if (this.bookCache['GaoKao3500']) return this.bookCache['GaoKao3500'];
        }

        if (window.customBooks) {
            const custom = window.customBooks.find(b => b.id === bookId);
            if (custom && custom.words) {
                this.bookCache[bookId] = this.normalizeWords(custom.words, custom.name, custom.id);
                return this.bookCache[bookId];
            }
        }

        try {
            const offlineBook = await VocabOfflineDB.getBook(bookId);
            if (offlineBook && offlineBook.words && offlineBook.words.length > 0) {
                this.bookCache[bookId] = offlineBook.words;
                return offlineBook.words;
            }
        } catch (e) { }

        if (typeof isShiCiBook === 'function' && isShiCiBook({ id: bookId }) && typeof ShiCiManager !== 'undefined' && ShiCiManager.loadBooks) {
            try {
                const scData = await ShiCiManager.loadBooks([bookId]);
                if (Array.isArray(scData) && scData.length > 0) {
                    const normalized = this.normalizeWords(scData, '文言实词', bookId);
                    if (normalized && normalized.length > 0) {
                        this.bookCache[bookId] = normalized;
                        return normalized;
                    }
                }
            } catch (err) { }
        }

        const bookMeta = this.availableBooks.find(b => b.id === bookId || b.path === bookId) ||
            this.fallbackBooks.find(b => b.id === bookId || b.path === bookId) ||
            { id: bookId, name: bookId };

        let relPath = bookMeta.path || bookId;
        if (!relPath.startsWith('books/') && !relPath.includes('/')) {
            if (isGaoKao) relPath = 'books/考纲/高考3500.json';
            else relPath = `books/${bookMeta.category || '其他'}/${bookMeta.name || bookId}.json`;
        }

        const sources = [
            `./${relPath}`,
            `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(relPath)}`,
            `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(relPath)}`,
            `${this.API_BASE}/api/book?id=${encodeURIComponent(bookId)}`
        ];

        for (const url of sources) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const rawText = await res.text();
                    const rawData = safeJsonParse(rawText);
                    if (Array.isArray(rawData) && rawData.length > 0) {
                        const normalized = this.normalizeWords(rawData, bookMeta.name || bookId, bookId);
                        if (normalized.length > 0) {
                            this.bookCache[bookId] = normalized;
                            if (isGaoKao) {
                                this.bookCache['GaoKao3500'] = normalized;
                                this.bookCache['books/考纲/高考3500.json'] = normalized;
                            }
                            VocabOfflineDB.saveBook({
                                id: bookId,
                                name: bookMeta.name || bookId,
                                count: normalized.length,
                                words: normalized,
                                isCloud: true
                            }).catch(() => { });
                            return normalized;
                        }
                    }
                }
            } catch (e) { }
        }

        const fallback = this.fallbackBooks.find(b => b.id === bookId);
        if (fallback && fallback.words) {
            return this.normalizeWords(fallback.words, fallback.name, fallback.id);
        }
        if (bookId === 'builtin_default') {
            return this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        }
        return [];
    },

    normalizeWords(rawData, bookName = '', bookId = '') {
        if (!Array.isArray(rawData)) return [];
        return rawData.map(item => {
            if (!item) return null;
            const word = (item.word || item.name || '').trim();
            if (!word) return null;

            let phone = item.phone || '';
            if (!phone && item.pinyin) phone = item.pinyin;
            else if (!phone && item.usphone) phone = `/${item.usphone}/`;
            else if (!phone && item.ukphone) phone = `/${item.ukphone}/`;

            let meanings = [];
            if (Array.isArray(item.senses) && item.senses.length > 0) {
                meanings = item.senses.map(s => ({
                    pos: s.part_of_speech || '',
                    meaning: (s.meaning || '').replace(/★/g, ''),
                    examples: s.examples || []
                }));
            } else if (Array.isArray(item.meanings) && item.meanings.length > 0) {
                meanings = item.meanings.map(m => {
                    if (typeof m === 'string') {
                        const match = m.match(/^([a-z]+\.)\s*(.+)/i);
                        return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: m.trim() };
                    }
                    return { pos: m.pos || '', meaning: m.meaning || '' };
                });
            } else if (Array.isArray(item.trans) && item.trans.length > 0) {
                meanings = item.trans.map(t => {
                    if (typeof t !== 'string') return null;
                    const match = t.match(/^([a-z]+\.)\s*(.+)/i);
                    return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: t.trim() };
                }).filter(Boolean);
            } else if (typeof item.trans === 'string') {
                meanings = [{ pos: '', meaning: item.trans }];
            }

            if (meanings.length === 0) return null;
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
        if (!bookIds || bookIds.length === 0) {
            return [];
        }
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
        ...(window.customBooks || [])
    ];
    // 如果有云端词书，就不要在选择词书中显示默认内置词书
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
    return b.category === '实词' || b.id === 'books/实词/实词.json' || (typeof isShiCiBook === 'function' && isShiCiBook(b));
}

