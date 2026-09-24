/**
 * 艾宾浩斯抗遗忘记忆曲线引擎
 * Module: assets/js/managers/ebbinghaus.js
 */

const EBBINGHAUS_INTERVALS = [
    1 * 24 * 60 * 60 * 1000,   // 第 1 轮复习：1天后（第二天）
    4 * 24 * 60 * 60 * 1000,   // 第 2 轮复习：4天后
    7 * 24 * 60 * 60 * 1000,   // 第 3 轮复习：7天后（一周后）
    28 * 24 * 60 * 60 * 1000   // 第 4 轮复习：28天后（四周后）
];

const EbbinghausEngine = {
    getRecords() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`vocab_ebbinghaus_db_${currentUser}`) || '{}');
        } catch (e) { return {}; }
    },
    saveRecords(records) {
        if (!currentUser) return;
        localStorage.setItem(`vocab_ebbinghaus_db_${currentUser}`, JSON.stringify(records));
    },
    getDueWords() {
        const records = this.getRecords();
        const now = Date.now();
        return Object.values(records).filter(r => r && r.stage >= 1 && r.stage < 5 && r.nextReview && now >= r.nextReview && !isWordMastered(r.word));
    },
    getAllLearnedWords() {
        const records = this.getRecords();
        return Object.values(records).filter(r => r && (r.stage >= 1 || isWordMastered(r.word)));
    },
    getDueWordsForBooks(bookIds = []) {
        if (!bookIds || bookIds.length === 0) return [];
        const allDue = this.getDueWords();
        if (allDue.length === 0) return [];

        const wordSet = new Set();
        bookIds.forEach(id => {
            let words = BookManager.bookCache[id];
            if (!words && window.customBooks) {
                const cb = window.customBooks.find(b => b.id === id);
                if (cb && cb.words) words = cb.words;
            }
            if (!words && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')) {
                words = DEFAULT_WORDS;
            }
            if (words && Array.isArray(words)) {
                words.forEach(w => {
                    if (w && w.word) wordSet.add(w.word.trim().toLowerCase());
                });
            }
        });

        return allDue.filter(r => {
            const key = (r.word || '').trim().toLowerCase();
            return wordSet.has(key) || (r.bookId && bookIds.includes(r.bookId));
        });
    },
    getBookProgress(bookId, bookWords = null) {
        let words = bookWords;
        if (!words && BookManager.bookCache) {
            words = BookManager.bookCache[bookId];
        }
        if (!words && window.customBooks) {
            const cb = window.customBooks.find(b => b.id === bookId);
            if (cb && cb.words) words = cb.words;
        }
        if (!words && (bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json')) {
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
                const k = w.word.trim().toLowerCase();
                const isMast = isWordMastered(k);
                const rec = records[k];

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

            const effective = Math.max(0, learned - due);
            const progressPercent = Math.min(100, Math.round((effective / total) * 100));
            return { total, learned, due, mastered, progressPercent };
        }

        // 若词汇列表尚未加载到内存，尝试通过元数据与已学记录计算
        let metaCount = 0;
        const meta = (BookManager.availableBooks || []).find(b => b.id === bookId) ||
            (BookManager.fallbackBooks || []).find(b => b.id === bookId) ||
            (window.customBooks || []).find(b => b.id === bookId);
        if (meta && meta.count) {
            metaCount = parseInt(meta.count) || 0;
        }

        const recs = Object.values(records).filter(r => r && r.bookId === bookId);
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

        const total = metaCount || learned;
        const effective = Math.max(0, learned - due);
        const progressPercent = total > 0 ? Math.min(100, Math.round((effective / total) * 100)) : 0;
        return { total, learned, due, mastered, progressPercent };
    },
    async resetBookProgress(bookId) {
        if (!currentUser || !bookId) return;
        let words = await BookManager.loadBookData(bookId);
        if (!words || words.length === 0) {
            if (bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json') {
                words = DEFAULT_WORDS;
            }
        }
        const records = this.getRecords();
        if (words && Array.isArray(words)) {
            words.forEach(w => {
                if (!w || !w.word) return;
                const k = w.word.trim().toLowerCase();
                delete records[k];
                removeWordMastered(k);
            });
        }
        Object.keys(records).forEach(k => {
            if (records[k] && records[k].bookId === bookId) {
                removeWordMastered(records[k].word);
                delete records[k];
            }
        });
        this.saveRecords(records);
        this.updateDueBadge();
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
    },
    recordWord(word, meaning, phone, isSuccess, bookId = null) {
        if (!word || !currentUser) return;
        const key = word.trim().toLowerCase();
        const records = this.getRecords();
        const now = Date.now();
        const isMast = isWordMastered(key);

        const record = records[key] || {
            word: word.trim(),
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
            // 首次学习生词
            if (isSuccess) {
                // 首次答对直接跳到第 2 轮复习（4天后）
                record.stage = 2;
                record.nextReview = now + EBBINGHAUS_INTERVALS[1];
            } else {
                // 首次答错进入第 1 轮复习（第二天）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
            }
        } else {
            // 复习阶段 (Stage 1..4) 或熟词 (Stage 5)
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
                    // 第 4 轮复习答对 -> 标记为熟词
                    record.stage = 5;
                    record.nextReview = 0;
                    ensureWordMastered(word, phone, meaning);
                }
            } else {
                // 任何一轮答错，则回到第 1 轮复习（第二天）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
                removeWordMastered(word);
            }
        }

        records[key] = record;
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
    // 新增：如果到期当天未复习，则掉一颗星
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
            // 处于复习阶段 (Stage 1..4) 且有到期时间的单词
            if (rec.stage >= 1 && rec.stage <= 4 && rec.nextReview) {
                // 如果到期时间早于今日凌晨（即昨天或更早到期，但直至今天仍未复习）
                if (rec.nextReview < todayStartMs) {
                    // 保证一天只扣减一次，避免每次刷新重复掉星
                    if (rec.lastOverduePenalizedDate !== todayStr) {
                        rec.lastOverduePenalizedDate = todayStr;
                        // 掉一颗星 (最低保留为第 1 轮复习)
                        rec.stage = Math.max(1, rec.stage - 1);
                        // 调整为立即待复习
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