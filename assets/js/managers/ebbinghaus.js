/**
 * 艾宾浩斯抗遗忘记忆曲线引擎
 * Module: assets/js/managers/ebbinghaus.js
 */

function normalizeWordKey(word) {
    return String(word || '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function getEbbinghausRecordByWord(records, word) {
    if (!records || !word) return null;
    const normKey = normalizeWordKey(word);
    const rawKey = String(word).trim().toLowerCase();
    const recNorm = normKey ? records[normKey] : null;
    const recRaw = (rawKey && rawKey !== normKey) ? records[rawKey] : null;
    if (recNorm && recRaw) {
        return ((recRaw.stage || 0) > (recNorm.stage || 0)) ? recRaw : recNorm;
    }
    return recNorm || recRaw || null;
}

function dedupeEbbinghausRecords(records) {
    const byKey = new Map();
    if (!records) return [];
    Object.values(records).forEach(r => {
        if (!r || !r.word) return;
        const k = normalizeWordKey(r.word);
        if (!k) return;
        const existing = byKey.get(k);
        if (!existing || (r.stage || 0) > (existing.stage || 0) || ((r.stage || 0) === (existing.stage || 0) && (r.lastPracticed || 0) > (existing.lastPracticed || 0))) {
            byKey.set(k, r);
        }
    });
    return Array.from(byKey.values());
}

const EBBINGHAUS_INTERVALS = [
    1 * 24 * 60 * 60 * 1000,   // 第 1 轮复习：1天后（第二天）
    4 * 24 * 60 * 60 * 1000,   // 第 2 轮复习：4天后
    7 * 24 * 60 * 60 * 1000,   // 第 3 轮复习：7天后（一周后）
    28 * 24 * 60 * 60 * 1000   // 第 4 轮复习：28天后（四周后）
];

function getEbbinghausCurrentUser() {
    return (typeof currentUser !== 'undefined' && currentUser)
        || (typeof window !== 'undefined' && window.currentUser)
        || (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.username)
        || (typeof window !== 'undefined' && window.currentUserProfile && window.currentUserProfile.username)
        || (typeof SafeStorage !== 'undefined' && SafeStorage.getItem ? SafeStorage.getItem('vocab_pk_user') : (typeof localStorage !== 'undefined' ? localStorage.getItem('vocab_pk_user') : ''))
        || 'guest';
}

const EbbinghausEngine = {
    _progressCache: {},
    invalidateProgressCache() {
        this._progressCache = {};
    },
    getRecords() {
        const u = getEbbinghausCurrentUser();
        try {
            const raw = (typeof SafeStorage !== 'undefined' && SafeStorage.getItem)
                ? SafeStorage.getItem(`vocab_ebbinghaus_db_${u}`)
                : localStorage.getItem(`vocab_ebbinghaus_db_${u}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    },
    saveRecords(records) {
        const u = getEbbinghausCurrentUser();
        this.invalidateProgressCache();
        const str = JSON.stringify(records);
        try {
            if (typeof SafeStorage !== 'undefined' && SafeStorage.setItem) {
                SafeStorage.setItem(`vocab_ebbinghaus_db_${u}`, str);
            } else {
                localStorage.setItem(`vocab_ebbinghaus_db_${u}`, str);
            }
        } catch (e) { }
    },
    getDueWords() {
        const records = this.getRecords();
        const now = Date.now();
        return dedupeEbbinghausRecords(records).filter(r => r && r.stage >= 1 && r.stage < 5 && r.nextReview && now >= r.nextReview && !isWordMastered(r.word));
    },
    getAllLearnedWords() {
        const records = this.getRecords();
        return dedupeEbbinghausRecords(records).filter(r => r && (r.stage >= 1 || isWordMastered(r.word)));
    },
    getDueWordsForBooks(bookIds = []) {
        if (!bookIds || bookIds.length === 0) return [];
        const allDue = this.getDueWords();
        if (allDue.length === 0) return [];

        const normalizedTargetIds = new Set(bookIds.map(id => String(id).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase()));
        const wordSet = new Set();
        bookIds.forEach(id => {
            const normId = String(id).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase();
            let words = BookManager.bookCache ? BookManager.bookCache[id] : null;
            if (!words && (id === 'books/高中/高中考纲.json' || id === 'books/高中/高中考纲词汇.json' || id === 'GaoKao3500' || normId === '考纲/高考3500' || normId === '高考3500' || normId === '高中/高中考纲' || normId === '高中考纲' || id === 'builtin_default')) {
                words = (BookManager.bookCache && (BookManager.bookCache['books/高中/高中考纲.json'] || BookManager.bookCache['builtin_default'])) || (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : null);
            }
            if (!words && window.customBooks) {
                const cb = window.customBooks.find(b => b.id === id || String(b.id).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase() === normId);
                if (cb && cb.words) words = cb.words;
            }
            if (!words && BookManager.bookCache) {
                const aliasKey = Object.keys(BookManager.bookCache).find(k => String(k).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase() === normId);
                if (aliasKey) words = BookManager.bookCache[aliasKey];
            }
            if (words && Array.isArray(words)) {
                words.forEach(w => {
                    if (w && w.word) wordSet.add(normalizeWordKey(w.word));
                });
            }
        });

        return allDue.filter(r => {
            const key = normalizeWordKey(r.word);
            if (wordSet.has(key)) return true;
            if (r.bookId) {
                if (bookIds.includes(r.bookId)) return true;
                const normRecId = String(r.bookId).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase();
                if (normalizedTargetIds.has(normRecId)) return true;
            }
            return false;
        });
    },
    getBookProgress(bookId, bookWords = null) {
        if (!bookId) return { progressPercent: 0, learned: 0, due: 0, mastered: 0, total: 0 };
        const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
        const cacheKey = `${u}::${bookId}::${bookWords ? bookWords.length : 'cached'}`;
        if (this._progressCache && this._progressCache[cacheKey]) {
            return this._progressCache[cacheKey];
        }
        let words = bookWords;
        if (!words && BookManager.bookCache) {
            words = BookManager.bookCache[bookId];
            if (!words) {
                const normId = (bookId || '').replace(/^books\//, '').replace(/\.json$/, '');
                for (const k in BookManager.bookCache) {
                    const normK = k.replace(/^books\//, '').replace(/\.json$/, '');
                    if (normK === normId) {
                        words = BookManager.bookCache[k];
                        break;
                    }
                }
            }
        }
        if (!words && window.customBooks) {
            const cb = window.customBooks.find(b => b.id === bookId || (b.name && b.name === bookId));
            if (cb && cb.words) words = cb.words;
        }
        if (!words && bookId === 'builtin_default') {
            words = DEFAULT_WORDS;
        }

        const records = this.getRecords();
        const now = Date.now();

        if (words && Array.isArray(words) && words.length > 0) {
            const total = words.length;
            let learned = 0;
            let due = 0;
            let mastered = 0;

            words.forEach(w => {
                if (!w || !w.word) return;
                const k = normalizeWordKey(w.word);
                const isMast = isWordMastered(k);
                const rec = getEbbinghausRecordByWord(records, w.word);

                if (isMast || (rec && rec.stage >= 5)) {
                    learned++;
                    mastered++;
                } else if (rec && rec.stage >= 1) {
                    learned++;
                    if (rec.nextReview && now >= rec.nextReview) {
                        due++;
                    }
                }
            });

            let progressPercent = 0;
            if (total > 0 && learned > 0) {
                const rawPercent = (learned / total) * 100;
                if (rawPercent < 1) {
                    progressPercent = Number(rawPercent.toFixed(1));
                    if (progressPercent <= 0) progressPercent = 0.1;
                } else {
                    progressPercent = Math.min(100, Math.round(rawPercent));
                }
            }
            const res = { total, learned, due, mastered, progressPercent };
            this._progressCache[cacheKey] = res;
            return res;
        }

        let metaCount = 0;
        const normId = (bookId || '').replace(/^books\//, '').replace(/\.json$/, '');
        const meta = (BookManager.availableBooks || []).find(b => b.id === bookId || (b.id && b.id.replace(/^books\//, '').replace(/\.json$/, '') === normId)) ||
            (BookManager.fallbackBooks || []).find(b => b.id === bookId || (b.id && b.id.replace(/^books\//, '').replace(/\.json$/, '') === normId)) ||
            (window.customBooks || []).find(b => b.id === bookId);
        if (meta && meta.count) {
            metaCount = parseInt(meta.count) || 0;
        }

        const recs = Object.values(records).filter(r => {
            if (!r) return false;
            if (r.bookId === bookId) return true;
            if (r.bookId && normId && r.bookId.replace(/^books\//, '').replace(/\.json$/, '') === normId) return true;
            return false;
        });
        let learned = 0;
        let due = 0;
        let mastered = 0;
        recs.forEach(r => {
            const isMast = isWordMastered(r.word);
            if (isMast || r.stage >= 5) {
                learned++;
                mastered++;
            } else if (r.stage >= 1) {
                learned++;
                if (r.nextReview && now >= r.nextReview) {
                    due++;
                }
            }
        });

        const total = metaCount || learned || 1;
        let progressPercent = 0;
        if (total > 0 && learned > 0) {
            const rawPercent = (learned / total) * 100;
            if (rawPercent < 1) {
                progressPercent = Number(rawPercent.toFixed(1));
                if (progressPercent <= 0) progressPercent = 0.1;
            } else {
                progressPercent = Math.min(100, Math.round(rawPercent));
            }
        }
        return { total, learned, due, mastered, progressPercent };
    },
    async resetBookProgress(bookId) {
        const user = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser || (window.currentUserProfile && window.currentUserProfile.username) || 'guest';
        if (!bookId) return;
        const normTargetId = String(bookId).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase();
        let words = (typeof BookManager !== 'undefined' && BookManager.bookCache) ? BookManager.bookCache[bookId] : null;
        if (!words && typeof BookManager !== 'undefined' && typeof BookManager.loadBookData === 'function') {
            try {
                words = await BookManager.loadBookData(bookId);
            } catch (e) { }
        }
        if ((!words || words.length === 0) && window.customBooks) {
            const cb = window.customBooks.find(b => b.id === bookId || String(b.id).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase() === normTargetId);
            if (cb && cb.words) words = cb.words;
        }
        if (!words || words.length === 0) {
            if (bookId === 'builtin_default' || bookId === 'books/高中/高中考纲.json' || bookId === 'books/高中/高中考纲词汇.json' || bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json' || bookId === '经典/高中考纲词汇.json') {
                words = typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : [];
            }
        }
        const records = this.getRecords();
        if (words && Array.isArray(words)) {
            words.forEach(w => {
                if (!w || !w.word) return;
                const rawK = w.word.trim().toLowerCase();
                const normK = normalizeWordKey(w.word);
                delete records[normK];
                if (rawK !== normK) delete records[rawK];
                if (typeof removeWordMastered === 'function') removeWordMastered(w.word);
            });
        }
        Object.keys(records).forEach(k => {
            const rec = records[k];
            if (!rec) return;
            const recNorm = rec.bookId ? String(rec.bookId).replace(/^books\//, '').replace(/\.json$/, '').toLowerCase() : '';
            if (rec.bookId === bookId || (recNorm && recNorm === normTargetId)) {
                if (typeof removeWordMastered === 'function') removeWordMastered(rec.word);
                delete records[k];
            }
        });
        this.saveRecords(records);
        if (typeof invalidateBookProgressCache === 'function') invalidateBookProgressCache(bookId);
        this.updateDueBadge();
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
        if (typeof syncAllUserDataToCloud === 'function') syncAllUserDataToCloud();
    },
    getScheduledReviewWords() {
        const records = this.getRecords();
        const list = [];
        const now = Date.now();

        // 构建快速查词字典以补全缺失的释义或音标
        let fallbackWordMap = null;
        const lookupWordMeta = (wText) => {
            if (!fallbackWordMap) {
                fallbackWordMap = new Map();
                const addWords = (arr) => {
                    if (!Array.isArray(arr)) return;
                    for (let i = 0; i < arr.length; i++) {
                        const it = arr[i];
                        if (it && it.word) {
                            const k = normalizeWordKey(it.word);
                            if (!fallbackWordMap.has(k)) fallbackWordMap.set(k, it);
                        }
                    }
                };
                if (typeof DEFAULT_WORDS !== 'undefined') addWords(DEFAULT_WORDS);
                if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
                    Object.values(BookManager.bookCache).forEach(addWords);
                }
                if (Array.isArray(window.customBooks)) {
                    window.customBooks.forEach(cb => addWords(cb && cb.words));
                }
            }
            return fallbackWordMap.get(normalizeWordKey(wText)) || null;
        };

        dedupeEbbinghausRecords(records).forEach(r => {
            if (!r || !r.word) return;
            if (typeof isWordMastered === 'function' && isWordMastered(r.word)) return;
            if (r.stage >= 1 && r.stage < 5 && r.nextReview) {
                let meaning = r.meaning || '';
                let phone = r.phone || '';
                if (!meaning || !phone) {
                    const meta = lookupWordMeta(r.word);
                    if (meta) {
                        if (!meaning) meaning = meta.meaning || (Array.isArray(meta.trans) ? meta.trans.join('；') : '');
                        if (!phone) phone = meta.phone || meta.usphone || meta.ukphone || '';
                    }
                }
                if (phone) {
                    const cleanP = String(phone).replace(/^\/+|\/+$/g, '').trim();
                    phone = cleanP ? `/${cleanP}/` : '';
                }
                list.push({
                    word: r.word,
                    meaning,
                    phone,
                    stage: r.stage || 1,
                    nextReview: r.nextReview,
                    isDue: r.nextReview <= now,
                    lastPracticed: r.lastPracticed || 0,
                    bookId: r.bookId || '',
                    isShiCi: false
                });
            }
        });
        if (typeof ShiCiEbbinghausEngine !== 'undefined' && typeof ShiCiEbbinghausEngine.getRecords === 'function') {
            const shiciRecs = ShiCiEbbinghausEngine.getRecords() || {};
            Object.values(shiciRecs).forEach(r => {
                if (!r || !r.word) return;
                if (r.stage >= 1 && r.stage < 5 && r.nextReview) {
                    list.push({
                        word: r.word,
                        meaning: r.meaning || '',
                        phone: r.phone || '',
                        stage: r.stage || 1,
                        nextReview: r.nextReview,
                        isDue: r.nextReview <= now,
                        lastPracticed: r.lastPracticed || 0,
                        bookId: r.bookId || '文言实词',
                        isShiCi: true
                    });
                }
            });
        }
        list.sort((a, b) => a.nextReview - b.nextReview);
        return list;
    },
    recordWord(word, meaning, phone, isSuccess, bookId = null) {
        if (!word) return;
        const rawKey = String(word).trim().toLowerCase();
        const normKey = normalizeWordKey(word);
        if (!normKey) return;
        const records = this.getRecords();
        const now = Date.now();
        const isMast = isWordMastered(word);

        const existing = getEbbinghausRecordByWord(records, word);
        const record = existing ? { ...existing, word: String(word).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() } : {
            word: String(word).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim(),
            meaning: meaning || '',
            phone: phone || '',
            stage: isMast ? 5 : 0,
            historyCount: 0
        };

        if (bookId) record.bookId = bookId;
        if (meaning) record.meaning = meaning;
        if (phone) record.phone = phone;
        record.lastPracticed = now;
        record.historyCount = (record.historyCount || 0) + 1;

        const currentStage = (typeof record.stage === 'number') ? record.stage : (isMast ? 5 : 0);

        if (currentStage === 0) {
            if (isSuccess) {
                record.stage = 2;
                record.nextReview = now + EBBINGHAUS_INTERVALS[1];
            } else {
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
            }
        } else {
            if (isSuccess) {
                if (currentStage === 1) {
                    record.stage = 2;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[1];
                } else if (currentStage === 2) {
                    record.stage = 3;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[2];
                } else if (currentStage === 3) {
                    record.stage = 4;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[3];
                } else {
                    record.stage = 5;
                    record.nextReview = 0;
                    ensureWordMastered(record.word, phone, meaning);
                }
            } else {
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
                removeWordMastered(record.word);
            }
        }

        records[normKey] = record;
        if (rawKey && rawKey !== normKey && records[rawKey]) {
            delete records[rawKey];
        }
        this.saveRecords(records);
        this.updateDueBadge();
    },
    updateDueBadge() {
        const badgeEl = document.getElementById('hub-review-due-count');
        const btnReview = document.getElementById('btn-hub-review');

        const filterIds = (typeof getReviewSelectedBookIds === 'function')
            ? getReviewSelectedBookIds()
            : ((singleSelectedBookIds && singleSelectedBookIds.length > 0) ? singleSelectedBookIds : []);
        const dueWords = filterIds.length > 0 ? this.getDueWordsForBooks(filterIds) : this.getDueWords();
        const isDueZero = (dueWords.length === 0);

        if (badgeEl) {
            badgeEl.innerText = dueWords.length;
        }

        if (btnReview) {
            btnReview.disabled = isDueZero;
            if (dueWords.length === 0) {
                btnReview.title = '当前没有待复习的单词';
            } else {
                btnReview.title = `共有 ${dueWords.length} 个单词待复习`;
            }
        }
    },
    checkOverduePenalties() {
        if (!currentUser) return;
        const records = this.getRecords();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStartMs = today.getTime();
        const todayStr = DailyStudyTracker.getTodayStr();

        let modified = false;
        Object.values(records).forEach(rec => {
            if (!rec || typeof rec.stage !== 'number') return;
            if (rec.stage >= 1 && rec.stage <= 4 && rec.nextReview) {
                if (rec.nextReview < todayStartMs) {
                    if (rec.lastOverduePenalizedDate !== todayStr) {
                        rec.lastOverduePenalizedDate = todayStr;
                        rec.stage = Math.max(1, rec.stage - 1);
                        rec.nextReview = todayStartMs - 1000;
                        modified = true;
                    }
                }
            }
        });

        if (modified) {
            this.saveRecords(records);
            this.updateDueBadge();
        }
    }
};
window.EbbinghausEngine = EbbinghausEngine;
