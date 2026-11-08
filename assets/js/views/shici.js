/**
 * 文言实词数据、闯关与结算小结视图
 * Module: assets/js/views/shici.js
 */

/* ==========================================================================
   11.5 背实词模块 (ShiCiManager) & 结算小结生成引擎
   ========================================================================== */
function escapeRegex(str) {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================
// 结算页面小结渲染函数 (扁平化极简结构)
// ========================
function getWordSettlementReviewStatus(word, isShiCi = false) {
    if (!word) return { text: '1天后复习', isMastered: false };
    const clean = word.trim();
    const isMast = isShiCi
        ? (typeof ShiCiEbbinghausEngine !== 'undefined' && ShiCiEbbinghausEngine.isWordMastered(clean))
        : (typeof isWordMastered === 'function' && isWordMastered(clean));
    if (isMast) {
        return { text: '已标熟', isMastered: true };
    }
    const records = isShiCi
        ? (typeof ShiCiEbbinghausEngine !== 'undefined' ? ShiCiEbbinghausEngine.getRecords() : {})
        : (typeof EbbinghausEngine !== 'undefined' && EbbinghausEngine.getRecords ? EbbinghausEngine.getRecords() : {});
    const rec = records[isShiCi ? clean : clean.toLowerCase()];
    if (rec) {
        if (rec.stage >= 5) {
            return { text: '已标熟', isMastered: true };
        }
        if (rec.nextReview && rec.nextReview > Date.now()) {
            const days = Math.max(1, Math.round((rec.nextReview - Date.now()) / 86400000));
            return { text: `${days}天后复习`, isMastered: false };
        }
    }
    return { text: '1天后复习', isMastered: false };
}

function formatSettlementMeaningsLines(q) {
    if (!q) return [];
    if (q.isShiCi) {
        const pos = q.sense?.part_of_speech || q.pos || '';
        const m = (q.sense?.meaning || q.meaning || '').replace(/★/g, '').trim();
        const lines = [];
        if (m) lines.push(`${pos ? pos + '. ' : ''}${m}`);
        if (q.sentence || q.example?.sentence) {
            lines.push(`例：${q.sentence || q.example?.sentence} ${q.source || q.example?.source || ''}`);
        }
        return lines;
    }
    if (Array.isArray(q.meanings) && q.meanings.length > 0) {
        const lines = [];
        q.meanings.forEach(m => {
            if (!m) return;
            const line = ((m.pos ? m.pos + ' ' : '') + (m.meaning || '')).trim();
            if (line && line !== '---' && !lines.includes(line)) {
                lines.push(line);
            }
        });
        if (lines.length > 0) return lines;
    }
    const raw = (q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : '') || '').trim();
    if (!raw || raw === '---') return [];
    // 将同一串中包含多个词性的释义按词性前缀拆分为多行
    const splitParts = raw.split(/\s+(?=(?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|pl)\.)/g).map(s => s.trim()).filter(Boolean);
    return splitParts.length > 0 ? splitParts : [raw];
}

function toggleSettlementRowExpand(rowEl) {
    if (!rowEl) return;
    rowEl.classList.toggle('expanded');
    syncSettlementEyeBtnState();
}
window.toggleSettlementRowExpand = toggleSettlementRowExpand;

function toggleSettlementWordsMask(btnEl) {
    const list = document.getElementById('settlement-list-container');
    if (!list) return;
    const masked = list.classList.toggle('mask-words');
    if (btnEl) {
        btnEl.classList.toggle('active', !masked);
    }
}
window.toggleSettlementWordsMask = toggleSettlementWordsMask;

function toggleSettlementMeaningsAll(btnEl) {
    const list = document.getElementById('settlement-list-container');
    if (!list) return;
    const rows = Array.from(list.querySelectorAll('.settlement-minimal-row'));
    const allExpanded = rows.length > 0 && rows.every(r => r.classList.contains('expanded'));
    const targetExpand = !allExpanded;
    rows.forEach(r => r.classList.toggle('expanded', targetExpand));
    syncSettlementEyeBtnState();
}
window.toggleSettlementMeaningsAll = toggleSettlementMeaningsAll;

function syncSettlementEyeBtnState() {
    const list = document.getElementById('settlement-list-container');
    const btn = document.getElementById('btn-settlement-toggle-meanings');
    if (!list || !btn) return;
    const rows = Array.from(list.querySelectorAll('.settlement-minimal-row'));
    const anyExpanded = rows.some(r => r.classList.contains('expanded'));
    btn.classList.toggle('active', anyExpanded);
    const closedSvg = btn.querySelector('.eye-closed-svg');
    const openSvg = btn.querySelector('.eye-open-svg');
    if (closedSvg && openSvg) {
        closedSvg.style.display = anyExpanded ? 'none' : 'block';
        openSvg.style.display = anyExpanded ? 'block' : 'none';
    }
}

function toggleSettlementWordMastered(word, phone, meaning, btnEl, isShiCi = false) {
    if (!word) return;
    let nowMastered = false;
    if (isShiCi) {
        if (!shiciProgress.masteredWords) shiciProgress.masteredWords = {};
        nowMastered = !shiciProgress.masteredWords[word];
        if (nowMastered) {
            shiciProgress.masteredWords[word] = true;
            ShiCiEbbinghausEngine.recordWord(word, meaning, phone, true, true);
        } else {
            delete shiciProgress.masteredWords[word];
            ShiCiEbbinghausEngine.unmarkMastered(word);
        }
        saveShiCiState();
        if (typeof toggleMasteredWord === 'function') {
            toggleMasteredWord(word, phone || '', meaning || '', 'shici');
        }
    } else if (typeof toggleMasteredWord === 'function') {
        nowMastered = toggleMasteredWord(word, phone, meaning);
    }

    const rowEl = btnEl ? btnEl.closest('.settlement-minimal-row') : null;
    if (btnEl) {
        btnEl.classList.toggle('active', nowMastered);
        const icon = btnEl.querySelector('.material-symbols-rounded');
        if (icon) icon.innerText = nowMastered ? 'star' : 'star_outline';
    }
    if (rowEl) {
        const statusEl = rowEl.querySelector('.settlement-minimal-status');
        if (statusEl) {
            const st = getWordSettlementReviewStatus(word, isShiCi);
            statusEl.innerText = st.text;
            statusEl.classList.toggle('is-mastered', st.isMastered);
        }
    }
}
window.toggleSettlementWordMastered = toggleSettlementWordMastered;

function buildMinimalSummaryLayoutHtml(items) {
    const rowsHtml = items.map(item => {
        const cleanPhone = String(item.phone || '').replace(/^\/+|\/+$/g, '').trim();
        const phoneHtml = cleanPhone
            ? (item.isShiCi ? `<span class="settlement-minimal-phone">${escapeHtml(cleanPhone)}</span>` : `<span class="settlement-minimal-phone">/${escapeHtml(cleanPhone)}/</span>`)
            : '';
        const statusInfo = getWordSettlementReviewStatus(item.word, item.isShiCi);
        const lines = item.lines && item.lines.length > 0 ? item.lines : ['暂无释义'];
        const safeWord = escapeHtml((item.word || '').replace(/'/g, "\\'"));
        const safePhone = escapeHtml((item.phone || '').replace(/'/g, "\\'"));
        const safeMeaning = escapeHtml((lines.join('；') || '').replace(/'/g, "\\'"));

        return `
            <div class="settlement-minimal-row ${item.isMistake ? 'expanded' : ''}" onclick="toggleSettlementRowExpand(this)" data-mistake="${item.isMistake ? '1' : '0'}">
                <div class="settlement-minimal-row-top">
                    <div class="settlement-minimal-word-group">
                        <span class="settlement-minimal-word ${item.isMistake ? 'is-mistake' : ''}" onclick="if(this.closest('.settlement-minimal-row').classList.contains('expanded')){event.stopPropagation(); playWordAudio('${safeWord}');}">${escapeHtml(item.word)}</span>
                        ${phoneHtml}
                    </div>
                    <span class="settlement-minimal-status ${statusInfo.isMastered ? 'is-mastered' : ''}">${escapeHtml(statusInfo.text)}</span>
                </div>
                <div class="settlement-minimal-row-body">
                    <div class="settlement-minimal-meanings">
                        ${lines.map(line => `<div class="settlement-minimal-meaning-line">${escapeHtml(line)}</div>`).join('')}
                    </div>
                    <button type="button" class="settlement-minimal-star-btn ${statusInfo.isMastered ? 'active' : ''}" onclick="event.stopPropagation(); toggleSettlementWordMastered('${safeWord}', '${safePhone}', '${safeMeaning}', this, ${item.isShiCi ? 'true' : 'false'});" title="${statusInfo.isMastered ? '取消标熟' : '标为熟词'}">
                        <span class="material-symbols-rounded">${statusInfo.isMastered ? 'star' : 'star_outline'}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const anyExpanded = items.some(i => i.isMistake);

    return `
        <div class="settlement-minimal-page">
            <div class="settlement-minimal-topbar">
                <button type="button" class="settlement-minimal-nav-btn" onclick="handleResultBackToHub()" title="返回">
                    <span class="material-symbols-rounded">arrow_back_ios_new</span>
                </button>
                <div class="settlement-minimal-title">小结</div>
                <div class="settlement-minimal-toggles">
                    <button type="button" class="settlement-minimal-abc-btn active" onclick="toggleSettlementWordsMask(this)" title="显隐单词">
                        <span>ab<u style="text-underline-offset:3px;">c</u></span>
                    </button>
                    <button type="button" id="btn-settlement-toggle-meanings" class="settlement-minimal-eye-btn ${anyExpanded ? 'active' : ''}" onclick="toggleSettlementMeaningsAll(this)" title="展开/收起全部释义">
                        <svg class="eye-closed-svg" style="display:${anyExpanded ? 'none' : 'block'};" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 10c3.5 4.5 8 6 10 6s6.5-1.5 10-6"/>
                            <path d="M5 13l-2 3"/>
                            <path d="M9.5 15.5l-1 3.5"/>
                            <path d="M14.5 15.5l1 3.5"/>
                            <path d="M19 13l2 3"/>
                        </svg>
                        <svg class="eye-open-svg" style="display:${anyExpanded ? 'block' : 'none'};" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="settlement-minimal-list" id="settlement-list-container">
                ${rowsHtml}
            </div>
        </div>
    `;
}

function renderSingleSummaryHtml(pool, sessionMistakes) {
    if (!Array.isArray(pool) || pool.length === 0) return '';

    const mistakeSet = new Set(
        Array.isArray(sessionMistakes) ? sessionMistakes.map(s => String(s).trim().toLowerCase()) :
        (sessionMistakes instanceof Set ? Array.from(sessionMistakes).map(s => String(s).trim().toLowerCase()) : [])
    );

    const uniquePool = [];
    const seenWords = new Map();
    pool.forEach(q => {
        if (!q || !q.word) return;
        const key = q.word.trim().toLowerCase();
        const wasEverMistake = mistakeSet.has(key) || !q.isCorrect;
        if (!seenWords.has(key)) {
            const itemCopy = { ...q };
            if (wasEverMistake) itemCopy.isCorrect = false;
            seenWords.set(key, itemCopy);
            uniquePool.push(itemCopy);
        } else {
            const existing = seenWords.get(key);
            if (wasEverMistake) existing.isCorrect = false;
        }
    });

    const items = uniquePool.map(q => ({
        word: q.word,
        phone: q.phone || '',
        lines: formatSettlementMeaningsLines(q),
        isMistake: !q.isCorrect,
        isShiCi: false
    }));

    return buildMinimalSummaryLayoutHtml(items);
}

function renderShiCiSummaryHtml(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    const uniquePool = [];
    const seen = new Map();
    pool.forEach(q => {
        if (!q || !q.word) return;
        const k = q.word.trim();
        if (!seen.has(k)) {
            seen.set(k, { ...q });
            uniquePool.push(seen.get(k));
        } else if (!q.isCorrect) {
            seen.get(k).isCorrect = false;
        }
    });

    const items = uniquePool.map(q => ({
        word: q.word,
        phone: q.pinyin || '',
        lines: formatSettlementMeaningsLines({ ...q, isShiCi: true }),
        isMistake: !q.isCorrect,
        isShiCi: true
    }));

    return buildMinimalSummaryLayoutHtml(items);
}
window.renderSingleSummaryHtml = renderSingleSummaryHtml;
window.renderShiCiSummaryHtml = renderShiCiSummaryHtml;

function renderDictationSummaryHtml(pool, sessionMistakes) {
    return renderSingleSummaryHtml(pool, sessionMistakes);
}
window.renderDictationSummaryHtml = renderDictationSummaryHtml;

// ========================
// 背实词数据与控制器 (ShiCiManager)
// ========================
let shiciConfig = {
    order: 'sequential', // 'sequential' or 'random'
    batchSize: 15,
    reviewBatch: 20,
    selectedBooks: ['books/实词/高中300实词.json'],
    immediateRetest: true
};

let shiciProgress = {
    currentIndex: 0,
    learnedWords: {},
    masteredWords: {}
};

let shiciState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    answered: false,
    isReview: false
};

// ========================
// 背实词艾宾浩斯记忆遗忘曲线引擎 (与背单词复习规则保持完全一致)
// 生词(0颗钻) -> 第1轮(次日，1颗钻) -> 第2轮(4天后，2颗钻) -> 第3轮(8天后，3颗钻) -> 第4轮(15天后，4颗钻) -> 熟词(5颗钻)
// ========================
const ShiCiEbbinghausEngine = {
    getRecords() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`shici_ebbinghaus_db_${currentUser}`) || '{}');
        } catch (e) { return {}; }
    },
    saveRecords(records) {
        if (!currentUser) return;
        localStorage.setItem(`shici_ebbinghaus_db_${currentUser}`, JSON.stringify(records));
    },
    isWordMastered(word) {
        if (!word) return false;
        if (shiciProgress.masteredWords && shiciProgress.masteredWords[word]) return true;
        if (typeof isWordMastered === 'function' && isWordMastered(word)) return true;
        return false;
    },
    getDueWords() {
        const records = this.getRecords();
        const now = Date.now();
        return Object.values(records).filter(r => r && r.stage >= 1 && r.stage < 5 && r.nextReview && now >= r.nextReview && !this.isWordMastered(r.word));
    },
    getAllLearnedWords() {
        const records = this.getRecords();
        return Object.values(records).filter(r => r && (r.stage >= 1 || this.isWordMastered(r.word)));
    },
    recordWord(word, meaning, phone, isSuccess, forceMastered = false) {
        if (!word || !currentUser) return;
        const key = word.trim();
        const records = this.getRecords();
        const now = Date.now();
        const isMast = this.isWordMastered(key);

        const record = records[key] || {
            word: key,
            meaning: meaning || '',
            phone: phone || '',
            stage: isMast ? 5 : 0,
            historyCount: 0
        };

        if (meaning) record.meaning = meaning;
        if (phone) record.phone = phone;
        record.lastPracticed = now;
        record.historyCount = (record.historyCount || 0) + 1;

        if (forceMastered) {
            record.stage = 5;
            record.nextReview = 0;
            records[key] = record;
            this.saveRecords(records);
            this.updateDueBadge();
            return;
        }

        const currentStage = (typeof record.stage === 'number') ? record.stage : (isMast ? 5 : 0);

        if (currentStage === 0) {
            // 首次学习生词
            if (isSuccess) {
                // 首次答对直接跳到第 2 轮复习（4天后）
                record.stage = 2;
                record.nextReview = now + EBBINGHAUS_INTERVALS[1];
            } else {
                // 首次答错进入第 1 轮复习（次日）
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
                    if (!shiciProgress.masteredWords) shiciProgress.masteredWords = {};
                    shiciProgress.masteredWords[key] = true;
                    saveShiCiState();
                    if (typeof toggleMasteredWord === 'function' && !isWordMastered(key)) {
                        toggleMasteredWord(key, phone || '', meaning || '', 'shici');
                    }
                }
            } else {
                // 任何一轮答错，回到第 1 轮复习（次日）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
                if (shiciProgress.masteredWords) delete shiciProgress.masteredWords[key];
                saveShiCiState();
                if (typeof removeWordMastered === 'function') {
                    removeWordMastered(key);
                }
            }
        }

        records[key] = record;
        this.saveRecords(records);
        this.updateDueBadge();
    },
    unmarkMastered(word) {
        if (!word || !currentUser) return;
        const key = word.trim();
        const records = this.getRecords();
        if (records[key]) {
            records[key].stage = 4;
            records[key].nextReview = Date.now() + EBBINGHAUS_INTERVALS[0];
        }
        this.saveRecords(records);
        this.updateDueBadge();
    },
    updateDueBadge() {
        const badgeEl = document.getElementById('hub-shici-review-due-count');
        const btnShiCiReview = document.getElementById('btn-hub-shici-review');
        const dueWords = this.getDueWords();
        if (badgeEl) {
            badgeEl.innerText = dueWords.length;
        }
        if (btnShiCiReview) {
            btnShiCiReview.disabled = (dueWords.length === 0);
            if (dueWords.length === 0) {
                btnShiCiReview.title = '当前没有待复习的实词';
            } else {
                btnShiCiReview.title = `共有 ${dueWords.length} 个实词待复习`;
            }
        }
    },
    checkOverduePenalties() {
        if (!currentUser) return;
        const records = this.getRecords();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStartMs = today.getTime();
        const todayStr = typeof DailyStudyTracker !== 'undefined' ? DailyStudyTracker.getTodayStr() : new Date().toISOString().slice(0, 10);

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
window.ShiCiEbbinghausEngine = ShiCiEbbinghausEngine;

function renderShiCiMasteryDiamonds(word, animType = null) {
    const bar = document.getElementById('shici-mastery-stars');
    if (!bar) return;

    let targetStage = 0;
    if (word) {
        if (ShiCiEbbinghausEngine.isWordMastered(word)) {
            targetStage = 5;
        } else {
            const records = ShiCiEbbinghausEngine.getRecords();
            const rec = records[word.trim()];
            if (rec && typeof rec.stage === 'number') {
                targetStage = rec.stage;
            }
        }
    }

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`shici-mastery-star-${i}`);
        if (!star) continue;

        star.classList.remove('anim-gain', 'anim-loss');

        const wasFilled = star.classList.contains('filled');
        const willFill = i <= targetStage;

        if (willFill) {
            star.innerText = '◆';
            star.classList.add('filled');
        } else {
            star.innerText = '◇';
            star.classList.remove('filled');
        }

        if (animType === 'gain' && willFill && !wasFilled) {
            void star.offsetWidth;
            star.style.animationDelay = `${(i - 1) * 80}ms`;
            star.classList.add('anim-gain');
        } else if (animType === 'loss' && !willFill && wasFilled) {
            void star.offsetWidth;
            star.style.animationDelay = `${(5 - i) * 60}ms`;
            star.classList.add('anim-loss');
        } else {
            star.style.animationDelay = '0ms';
        }
    }
}

function scheduleRetestForCurrentShiCiQuestion() {
    if (shiciConfig.immediateRetest === false) return;
    if (!shiciState || !shiciState.pool || shiciState.pool.length === 0) return;
    const q = shiciState.pool[shiciState.currentIdx];
    if (!q || q._retestScheduled) return;
    q._retestScheduled = true;

    const retestQ1 = { ...q, _isRetest: true, _retestScheduled: false };
    const insertPos = shiciState.currentIdx + 4;
    if (insertPos < shiciState.pool.length) {
        shiciState.pool.splice(insertPos, 0, retestQ1);
    } else {
        shiciState.pool.push(retestQ1);
    }

    const alreadyScheduledLater = shiciState.pool.slice(shiciState.currentIdx + 1).some(item => item.word === q.word);
    if (!q._isRetest && !alreadyScheduledLater) {
        const retestQ2 = { ...q, _isRetest: true, _retestScheduled: false };
        shiciState.pool.push(retestQ2);
    }
    saveShiCiSessionProgress();
}

function loadShiCiSettings() {
    try {
        const cfg = localStorage.getItem('shici_config_' + (currentUser || 'default'));
        if (cfg) Object.assign(shiciConfig, JSON.parse(cfg));
        if (shiciConfig.immediateRetest === undefined) shiciConfig.immediateRetest = true;
        if (shiciConfig.reviewBatch === undefined) shiciConfig.reviewBatch = 20;
    } catch (e) { }
    try {
        const prog = localStorage.getItem('shici_progress_' + (currentUser || 'default'));
        if (prog) Object.assign(shiciProgress, JSON.parse(prog));
    } catch (e) { }
    if (!Array.isArray(shiciConfig.selectedBooks) || shiciConfig.selectedBooks.length === 0) {
        shiciConfig.selectedBooks = ['books/实词/高中300实词.json'];
    } else {
        shiciConfig.selectedBooks = shiciConfig.selectedBooks.map(b => b === 'books/实词/实词.json' ? 'books/实词/高中300实词.json' : b);
    }
}

function saveShiCiState() {
    try {
        localStorage.setItem('shici_config_' + (currentUser || 'default'), JSON.stringify(shiciConfig));
        localStorage.setItem('shici_progress_' + (currentUser || 'default'), JSON.stringify(shiciProgress));
    } catch (e) { }
}

const ShiCiManager = {
    data: null,
    loading: false,
    bookCache: {},

    async loadSingleBook(bookId = 'books/实词/高中300实词.json') {
        if (!bookId) bookId = 'books/实词/高中300实词.json';
        if (bookId === 'books/实词/实词.json') {
            bookId = 'books/实词/高中300实词.json';
        }
        if (this.bookCache[bookId] && Array.isArray(this.bookCache[bookId]) && this.bookCache[bookId].length > 0) {
            return this.bookCache[bookId];
        }

        // 1. 本地自定义词书
        if (window.customBooks) {
            const custom = window.customBooks.find(b => b.id === bookId);
            if (custom && Array.isArray(custom.words) && custom.words.length > 0) {
                this.bookCache[bookId] = custom.words;
                return custom.words;
            }
        }

        // 2. 本地缓存读取
        try {
            const cacheKey = 'vocab_shici_cache_' + bookId;
            const cached = localStorage.getItem(cacheKey) || (bookId === 'books/实词/高中300实词.json' ? localStorage.getItem('vocab_shici_cache') : null);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.bookCache[bookId] = parsed;
                    return parsed;
                }
            }
        } catch (e) { }

        // 3. 候选加载路径
        let relPath = bookId;
        if (!relPath.startsWith('books/') && !relPath.includes('/')) {
            relPath = `books/实词/${bookId}.json`;
        }
        const encodedRel = encodeURI(relPath);
        const urls = [
            `./${encodedRel}`,
            `./${relPath}`,
            `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`,
            `https://testingcf.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`,
            `https://gcore.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodedRel}`,
            `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodedRel}`
        ];

        for (const u of urls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(u, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json) && json.length > 0) {
                        this.bookCache[bookId] = json;
                        try {
                            localStorage.setItem('vocab_shici_cache_' + bookId, JSON.stringify(json));
                            if (bookId === 'books/实词/高中300实词.json') {
                                localStorage.setItem('vocab_shici_cache', JSON.stringify(json));
                            }
                        } catch (e) { }
                        return json;
                    }
                }
            } catch (err) { }
        }

        return [];
    },

    async loadData(bookPath) {
        if (bookPath) {
            const data = await this.loadSingleBook(bookPath);
            if (data && data.length > 0) {
                this.data = data;
                return data;
            }
        }
        // 未传参或指定路径失败时，合并加载所有已知文言词书，保障错题检索及全局实词数据完整
        const defaultShiCiIds = ['books/实词/初中150实词.json', 'books/实词/高中300实词.json'];
        const all = await this.loadBooks(defaultShiCiIds);
        if (all && all.length > 0) {
            this.data = all;
            return all;
        }
        return this.data || [];
    },

    async loadBooks(bookIds = ['books/实词/高中300实词.json']) {
        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            bookIds = ['books/实词/高中300实词.json'];
        }
        bookIds = bookIds.map(b => b === 'books/实词/实词.json' ? 'books/实词/高中300实词.json' : b);
        const results = [];
        const seenWords = new Set();
        for (const bId of bookIds) {
            const data = await this.loadSingleBook(bId);
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const key = item.word || item.name;
                    if (key && !seenWords.has(key)) {
                        seenWords.add(key);
                        results.push(item);
                    }
                });
            }
        }
        if (results.length > 0) {
            this.data = results;
            return results;
        }
        return await this.loadData();
    }
};

function generateShiCiQuestion(wordItem, allWords) {
    const senses = wordItem.senses || [];
    if (senses.length === 0) return null;

    // 优先抽取考点★义项或随机义项
    const starredSenses = senses.filter(s => (s.meaning || '').includes('★'));
    const sense = (starredSenses.length > 0 && Math.random() < 0.6)
        ? starredSenses[Math.floor(Math.random() * starredSenses.length)]
        : senses[Math.floor(Math.random() * senses.length)];

    const examples = sense.examples || [{ sentence: wordItem.word, source: '《文言》' }];
    const example = examples[Math.floor(Math.random() * examples.length)];

    // 例句考察词加粗
    let sentence = example.sentence || '';
    let highlightedSentence = escapeHtml(sentence);

    if (sentence.includes(wordItem.word)) {
        const reg = new RegExp(escapeRegex(wordItem.word), 'g');
        highlightedSentence = escapeHtml(sentence).replace(reg, `<strong class="shici-word-highlight">${escapeHtml(wordItem.word)}</strong>`);
    } else {
        highlightedSentence = `<strong class="shici-word-highlight">${escapeHtml(wordItem.word)}</strong> · ${escapeHtml(sentence)}`;
    }

    // 易错项抽取该词的其他释义
    const otherSenses = senses.filter(s => s !== sense);
    const pickedDistractors = [];

    const cleanTargetMeaning = (sense.meaning || '').replace(/★/g, '').trim();
    const shuffledOther = [...otherSenses].sort(() => 0.5 - Math.random());
    for (const os of shuffledOther) {
        if (pickedDistractors.length >= 3) break;
        const cleanM = (os.meaning || '').replace(/★/g, '').trim();
        const existingMeanings = [
            cleanTargetMeaning,
            ...pickedDistractors.map(d => (d.meaning || '').replace(/★/g, '').trim())
        ];
        if (cleanM && !existingMeanings.includes(cleanM)) {
            pickedDistractors.push(os);
        }
    }

    // 若该词释义少于4个，库内平滑补全其余选项
    if (pickedDistractors.length < 3 && Array.isArray(allWords)) {
        const otherWords = allWords.filter(w => w.word !== wordItem.word).sort(() => 0.5 - Math.random());
        for (const ow of otherWords) {
            if (pickedDistractors.length >= 3) break;
            if (ow.senses && ow.senses.length > 0) {
                const rs = ow.senses[Math.floor(Math.random() * ow.senses.length)];
                const cleanM = (rs.meaning || '').replace(/★/g, '').trim();
                const existingMeanings = [
                    sense.meaning.replace(/★/g, '').trim(),
                    ...pickedDistractors.map(d => (d.meaning || '').replace(/★/g, '').trim())
                ];
                if (!existingMeanings.includes(cleanM)) {
                    pickedDistractors.push(rs);
                }
            }
        }
    }

    const correctOption = {
        pos: sense.part_of_speech || '',
        meaning: cleanTargetMeaning,
        isCorrect: true,
        sense: sense,
        examples: sense.examples || []
    };

    const distractorOptions = pickedDistractors.map(ds => ({
        pos: ds.part_of_speech || '',
        meaning: (ds.meaning || '').replace(/★/g, '').trim(),
        isCorrect: false,
        sense: ds,
        examples: ds.examples || []
    }));

    const options = [correctOption, ...distractorOptions].sort(() => 0.5 - Math.random());
    const correctIdx = options.findIndex(o => o.isCorrect);

    return {
        word: wordItem.word,
        pinyin: wordItem.pinyin || '',
        example: example,
        sentence: sentence,
        highlightedSentence: highlightedSentence,
        source: example.source || '文言典籍',
        sense: sense,
        options: options,
        correctIdx: correctIdx,
        allSenses: senses
    };
}

async function startShiCiLearning() {
    loadShiCiSettings();

    const titleEl = document.getElementById('shici-mode-title');
    if (titleEl) titleEl.innerText = '学习新词';

    // 检查是否有未完成的新词学习断点进度
    if (currentUser) {
        const saved = localStorage.getItem(`shici_learn_progress_${currentUser}`) || localStorage.getItem(`shici_progress_session_${currentUser}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length && !parsed.isReview) {
                    shiciState = parsed;
                    shiciState.completedWords = new Set(parsed.completedWords || []);
                    shiciState.targetTotal = parsed.targetTotal || new Set((parsed.pool || []).filter(q => !q._isRetest).map(q => q.word)).size || (parsed.pool ? parsed.pool.length : 0);
                    shiciState.isReview = false;
                    renderShiCiQuestion();
                    switchView('view-shici');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/高中300实词.json']);
        if (!allWords || allWords.length === 0) {
            alert('未获取到实词库数据！');
            return;
        }

        const batchSize = shiciConfig.batchSize || 15;
        let targetWords = [];

        if (shiciConfig.order === 'sequential') {
            let startIdx = shiciProgress.currentIndex || 0;
            if (startIdx >= allWords.length) startIdx = 0;
            for (let i = 0; i < batchSize; i++) {
                const idx = (startIdx + i) % allWords.length;
                targetWords.push(allWords[idx]);
            }
        } else {
            const unmastered = allWords.filter(w => !shiciProgress.masteredWords || !shiciProgress.masteredWords[w.word]);
            const poolSource = unmastered.length >= batchSize ? unmastered : allWords;
            targetWords = [...poolSource].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        }

        const questions = targetWords.map(w => generateShiCiQuestion(w, allWords)).filter(Boolean);
        const targetTotal = new Set(questions.map(q => q.word)).size;

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
            targetTotal: targetTotal,
            completedWords: new Set(),
            answered: false,
            isReview: false
        };

        saveShiCiSessionProgress();
        updateShiCiSettingsModalUi();
        updateHubShiCiBadge();
        renderShiCiQuestion();
        switchView('view-shici');
    } catch (err) {
        alert('启动实词学习失败：' + err.message);
    }
}

// 实词复习功能（基于艾宾浩斯记忆遗忘曲线，支持断点恢复）
async function startShiCiReview() {
    loadShiCiSettings();

    const titleEl = document.getElementById('shici-mode-title');
    if (titleEl) titleEl.innerText = '复习';

    // 检查是否有未完成的复习断点进度
    if (currentUser) {
        const savedReview = localStorage.getItem(`shici_review_progress_${currentUser}`);
        if (savedReview) {
            try {
                const parsed = JSON.parse(savedReview);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                    shiciState = parsed;
                    shiciState.completedWords = new Set(parsed.completedWords || []);
                    shiciState.targetTotal = parsed.targetTotal || new Set((parsed.pool || []).filter(q => !q._isRetest).map(q => q.word)).size || (parsed.pool ? parsed.pool.length : 0);
                    shiciState.isReview = true;
                    renderShiCiQuestion();
                    switchView('view-shici');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/高中300实词.json']);
        if (!allWords || allWords.length === 0) {
            alert('未获取到实词库数据！');
            return;
        }

        // 优先抽取到期复习实词
        const dueRecords = ShiCiEbbinghausEngine.getDueWords();
        const dueKeys = new Set(dueRecords.map(r => r.word));
        let reviewWords = allWords.filter(w => dueKeys.has(w.word));

        // 若暂无到期实词，但有已学实词，则允许复习所有已学实词
        if (reviewWords.length === 0) {
            const allLearned = ShiCiEbbinghausEngine.getAllLearnedWords();
            const learnedKeys = new Set(allLearned.map(r => r.word));
            reviewWords = allWords.filter(w => learnedKeys.has(w.word));
        }

        // 兼顾历史本地已学词
        if (reviewWords.length === 0 && shiciProgress.learnedWords) {
            const legacyKeys = new Set(Object.keys(shiciProgress.learnedWords));
            reviewWords = allWords.filter(w => legacyKeys.has(w.word));
        }

        if (reviewWords.length === 0) {
            showToast('暂无已学实词可复习，请先学习新实词！');
            return;
        }

        const reviewBatchSetting = shiciConfig.reviewBatch || 20;
        const batchSize = (reviewBatchSetting >= 45) ? reviewWords.length : reviewBatchSetting;
        const targets = [...reviewWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const questions = targets.map(w => generateShiCiQuestion(w, allWords)).filter(Boolean);
        const targetTotal = new Set(questions.map(q => q.word)).size;

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
            targetTotal: targetTotal,
            completedWords: new Set(),
            answered: false,
            isReview: true
        };

        saveShiCiSessionProgress();
        updateShiCiSettingsModalUi();
        updateHubShiCiBadge();
        renderShiCiQuestion();
        switchView('view-shici');
    } catch (err) {
        alert('启动实词复习失败：' + err.message);
    }
}

function saveShiCiSessionProgress() {
    if (!currentUser || !shiciState || !shiciState.pool || shiciState.pool.length === 0) return;
    if (shiciState.currentIdx >= shiciState.pool.length) return;
    try {
        const payload = JSON.stringify({
            pool: shiciState.pool,
            currentIdx: shiciState.currentIdx,
            score: shiciState.score,
            total: shiciState.pool.length,
            targetTotal: shiciState.targetTotal,
            completedWords: Array.from(shiciState.completedWords || []),
            isReview: !!shiciState.isReview,
            timestamp: Date.now()
        });
        if (shiciState.isReview) {
            localStorage.setItem(`shici_review_progress_${currentUser}`, payload);
        } else {
            localStorage.setItem(`shici_learn_progress_${currentUser}`, payload);
            localStorage.setItem(`shici_progress_session_${currentUser}`, payload);
        }
    } catch (e) { }
    updateHubShiCiResumeButton();
}

function clearCurrentShiCiLearnProgress() {
    const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
    localStorage.removeItem(`shici_learn_progress_${u}`);
    localStorage.removeItem(`shici_progress_session_${u}`);
    localStorage.removeItem('shici_learn_progress_guest');
    localStorage.removeItem('shici_progress_session_guest');
    if (typeof shiciState !== 'undefined' && shiciState && !shiciState.isReview) {
        shiciState = null;
    }
    updateHubShiCiResumeButton();
    updateShiCiProgressStatusUI();
    showToast('已清空实词学习进度');
}

function clearCurrentShiCiReviewProgress() {
    const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
    localStorage.removeItem(`shici_review_progress_${u}`);
    localStorage.removeItem('shici_review_progress_guest');
    if (typeof shiciState !== 'undefined' && shiciState && shiciState.isReview) {
        shiciState = null;
    }
    updateHubShiCiResumeButton();
    updateShiCiProgressStatusUI();
    showToast('已清空实词复习进度');
}

function clearCurrentShiCiProgress() {
    clearCurrentShiCiLearnProgress();
    clearCurrentShiCiReviewProgress();
}

function updateShiCiProgressStatusUI() {
    const tipLearn = document.getElementById('shici-learn-progress-status-tip');
    const clearBtnLearn = document.getElementById('btn-clear-shici-learn-progress');
    const tipReview = document.getElementById('shici-review-progress-status-tip');
    const clearBtnReview = document.getElementById('btn-clear-shici-review-progress');

    // 兼顾旧单按钮
    const tipOld = document.getElementById('shici-progress-status-tip');
    const clearBtnOld = document.getElementById('btn-clear-shici-progress');

    if (!currentUser) return;

    // 学习进度
    const savedLearn = localStorage.getItem(`shici_learn_progress_${currentUser}`) || localStorage.getItem(`shici_progress_session_${currentUser}`);
    let hasLearn = false;
    if (savedLearn) {
        try {
            const parsed = JSON.parse(savedLearn);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length && !parsed.isReview) {
                if (tipLearn) {
                    tipLearn.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                    tipLearn.style.color = 'var(--md-sys-color-primary)';
                }
                if (clearBtnLearn) clearBtnLearn.disabled = false;
                hasLearn = true;
            }
        } catch (e) { }
    }
    if (!hasLearn) {
        if (tipLearn) {
            tipLearn.innerText = '无';
            tipLearn.style.color = 'var(--md-sys-color-outline)';
        }
        if (clearBtnLearn) clearBtnLearn.disabled = true;
    }

    // 复习进度
    const savedRev = localStorage.getItem(`shici_review_progress_${currentUser}`);
    let hasRev = false;
    if (savedRev) {
        try {
            const parsed = JSON.parse(savedRev);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                if (tipReview) {
                    tipReview.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                    tipReview.style.color = 'var(--md-sys-color-primary)';
                }
                if (clearBtnReview) clearBtnReview.disabled = false;
                hasRev = true;
            }
        } catch (e) { }
    }
    if (!hasRev) {
        if (tipReview) {
            tipReview.innerText = '无';
            tipReview.style.color = 'var(--md-sys-color-outline)';
        }
        if (clearBtnReview) clearBtnReview.disabled = true;
    }

    if (tipOld) {
        tipOld.innerText = (hasLearn || hasRev) ? '有保存的进度' : '无';
    }
    if (clearBtnOld) {
        clearBtnOld.disabled = !(hasLearn || hasRev);
    }
}

function updateHubShiCiResumeButton() {
    const learnLabel = document.getElementById('btn-hub-shici-text');
    const reviewLabel = document.getElementById('btn-hub-shici-review-text');

    if (!currentUser) {
        if (learnLabel) learnLabel.innerText = '学习新词';
        if (reviewLabel) reviewLabel.innerText = '复习';
        return;
    }

    // 检查学习新词进度
    const savedLearn = localStorage.getItem(`shici_learn_progress_${currentUser}`) || localStorage.getItem(`shici_progress_session_${currentUser}`);
    if (learnLabel) {
        let restored = false;
        if (savedLearn) {
            try {
                const parsed = JSON.parse(savedLearn);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length && !parsed.isReview) {
                    learnLabel.innerText = `继续(${parsed.currentIdx + 1}/${parsed.pool.length})`;
                    restored = true;
                }
            } catch (e) { }
        }
        if (!restored) {
            learnLabel.innerText = '学习新词';
        }
    }

    // 检查复习进度
    const savedReview = localStorage.getItem(`shici_review_progress_${currentUser}`);
    if (reviewLabel) {
        let restored = false;
        if (savedReview) {
            try {
                const parsed = JSON.parse(savedReview);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                    reviewLabel.innerText = `继续复习 (${parsed.currentIdx + 1}/${parsed.pool.length})`;
                    restored = true;
                }
            } catch (e) { }
        }
        if (!restored) {
            reviewLabel.innerText = '复习';
        }
    }
}

function updateShiCiProgressDisplay() {
    if (!shiciState || !shiciState.pool) return;
    const progressEl = document.getElementById('shici-progress-text');
    const fillEl = document.getElementById('shici-progress-fill');

    const isImmediateRetest = (typeof shiciConfig !== 'undefined' && shiciConfig.immediateRetest !== false);
    const targetTotal = shiciState.targetTotal || new Set(shiciState.pool.filter(q => !q._isRetest).map(q => q.word)).size || shiciState.pool.length;

    let currentProgress = 0;
    if (isImmediateRetest) {
        currentProgress = shiciState.completedWords ? shiciState.completedWords.size : 0;
    } else {
        currentProgress = Math.min(shiciState.currentIdx + 1, targetTotal);
    }

    if (progressEl) {
        progressEl.innerText = `${currentProgress} / ${targetTotal}`;
    }
    if (fillEl) {
        const pct = targetTotal > 0 ? Math.min(100, Math.max(0, Math.round((currentProgress / targetTotal) * 100))) : 0;
        fillEl.style.width = `${pct}%`;
    }
}
window.updateShiCiProgressDisplay = updateShiCiProgressDisplay;

function updateShiCiNavButtons() {
    const prevBtn = document.getElementById('btn-shici-prev');
    const returnBtn = document.getElementById('btn-shici-return');
    if (!shiciState) return;
    if (typeof shiciState.maxReachedIdx !== 'number' || shiciState.currentIdx > shiciState.maxReachedIdx) {
        shiciState.maxReachedIdx = shiciState.currentIdx;
    }
    const canPrev = shiciState.currentIdx > 0;
    const canReturn = shiciState.currentIdx < shiciState.maxReachedIdx;
    if (prevBtn) {
        prevBtn.style.display = 'inline-flex';
        prevBtn.disabled = !canPrev;
        prevBtn.style.opacity = canPrev ? '1' : '0.35';
        prevBtn.style.cursor = canPrev ? 'pointer' : 'not-allowed';
    }
    if (returnBtn) {
        returnBtn.style.display = canReturn ? 'inline-flex' : 'none';
        returnBtn.disabled = !canReturn;
    }
}

function viewPreviousShiCiQuestion() {
    if (!shiciState || !shiciState.pool || shiciState.currentIdx <= 0) return;
    if (typeof shiciState.maxReachedIdx !== 'number' || shiciState.currentIdx > shiciState.maxReachedIdx) {
        shiciState.maxReachedIdx = shiciState.currentIdx;
    }
    shiciState.currentIdx--;
    renderShiCiQuestion();
}
window.viewPreviousShiCiQuestion = viewPreviousShiCiQuestion;

function returnToCurrentShiCiQuestion() {
    if (!shiciState || !shiciState.pool) return;
    if (typeof shiciState.maxReachedIdx === 'number' && shiciState.currentIdx < shiciState.maxReachedIdx) {
        shiciState.currentIdx = shiciState.maxReachedIdx;
        renderShiCiQuestion();
    }
}
window.returnToCurrentShiCiQuestion = returnToCurrentShiCiQuestion;

function renderShiCiQuestion() {
    if (!shiciState || shiciState.currentIdx >= shiciState.pool.length) {
        endShiCiGame();
        return;
    }

    if (typeof shiciState.maxReachedIdx !== 'number' || shiciState.currentIdx > shiciState.maxReachedIdx) {
        shiciState.maxReachedIdx = shiciState.currentIdx;
    }
    const isHistoryView = shiciState.currentIdx < shiciState.maxReachedIdx;
    const q = shiciState.pool[shiciState.currentIdx];
    const alreadyAnswered = Boolean(isHistoryView || q.answered);
    shiciState.answered = alreadyAnswered;

    updateShiCiProgressDisplay();
    updateShiCiNavButtons();

    const bookBadge = document.getElementById('shici-book-badge');
    if (bookBadge) {
        const bMeta = (BookManager.availableBooks || []).find(b => b.id === shiciConfig.selectedBooks?.[0]);
        bookBadge.innerText = bMeta ? bMeta.name : '文言实词';
    }

    const wordTitleEl = document.getElementById('shici-current-word-title');
    if (wordTitleEl) wordTitleEl.innerText = `${q.word} ${q.pinyin || ''}`.trim();

    const retestTag = document.getElementById('shici-retest-tag');
    if (retestTag) retestTag.style.display = q._isRetest ? 'inline-flex' : 'none';

    renderShiCiMasteryDiamonds(q.word);
    updateShiCiMasterBtn(ShiCiEbbinghausEngine.isWordMastered(q.word));

    const sentenceEl = document.getElementById('shici-sentence-display');
    if (sentenceEl) sentenceEl.innerHTML = q.highlightedSentence;

    const sourceEl = document.getElementById('shici-source-display');
    if (sourceEl) sourceEl.innerText = `—— ${q.source || '《古文》'}`;

    const optContainer = document.getElementById('shici-options-container');
    if (optContainer) {
        const letters = ['A', 'B', 'C', 'D'];
        optContainer.innerHTML = q.options.map((opt, idx) => {
            if (alreadyAnswered) {
                const isCorr = idx === q.correctIdx;
                const isWr = !q.isCorrect && q.userAnswerIdx === idx;
                const cls = isCorr ? 'correct' : (isWr ? 'wrong' : '');
                return `
                    <button class="shici-opt-btn ${cls}" id="shici-opt-${idx}" disabled>
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.meaning)}</span>
                    </button>
                `;
            }
            return `
                    <button class="shici-opt-btn" id="shici-opt-${idx}" onclick="handleShiCiAnswer(${idx})">
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.meaning)}</span>
                    </button>
                `;
        }).join('');
    }

    const expCard = document.getElementById('shici-explanation-card');
    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    if (alreadyAnswered) {
        displayShiCiExplanation(q, Boolean(q.isCorrect));
        const isLast = (shiciState.currentIdx === shiciState.pool.length - 1);
        if (actionBtn) {
            actionBtn.className = 'single-next-btn';
            actionBtn.style.display = 'flex';
        }
        if (actionText) actionText.innerText = isLast ? '查看小结' : '下一题';
    } else {
        if (expCard) expCard.style.display = 'none';
        if (actionBtn) {
            actionBtn.className = 'single-next-btn show-answer-mode';
            actionBtn.style.display = 'flex';
        }
        if (actionText) actionText.innerText = '看答案';
    }
}

function handleShiCiAnswer(idx) {
    if (shiciState.answered) return;
    shiciState.answered = true;
    const q = shiciState.pool[shiciState.currentIdx];
    q.userAnswerIdx = idx;
    q.answered = true;

    const isRight = (idx === q.correctIdx);
    q.isCorrect = isRight;

    const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : '';
    const wKey = q.word;

    if (isRight) {
        shiciState.score++;
        const hasRemainingInPool = shiciState.pool.slice(shiciState.currentIdx + 1).some(item => item.word === wKey);
        if (!hasRemainingInPool) {
            if (!shiciState.completedWords) shiciState.completedWords = new Set();
            shiciState.completedWords.add(wKey);
        }
        if (!shiciProgress.learnedWords) shiciProgress.learnedWords = {};
        shiciProgress.learnedWords[q.word] = (shiciProgress.learnedWords[q.word] || 0) + 1;
        ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, true);
        renderShiCiMasteryDiamonds(q.word, 'gain');
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
    } else {
        if (shiciState.completedWords) shiciState.completedWords.delete(wKey);
        ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, false);
        renderShiCiMasteryDiamonds(q.word, 'loss');
        scheduleRetestForCurrentShiCiQuestion();
        recordShiCiUserMistake(currentUser, {
            word: q.word,
            meaning: fullMeaning,
            pinyin: q.pinyin,
            sentence: q.sentence || q.example?.sentence,
            highlightedSentence: q.highlightedSentence,
            source: q.source || q.example?.source,
            pos: q.sense?.part_of_speech || q.pos,
            isShiCi: true
        });
    }
    updateShiCiProgressDisplay();
    saveCurrentUserData();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`shici-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        if (i === q.correctIdx) {
            btn.classList.add('correct');
        }
    });

    if (!isRight) {
        const wrongBtn = document.getElementById(`shici-opt-${idx}`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
    }

    displayShiCiExplanation(q, isRight);

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    const isLast = (shiciState.currentIdx === shiciState.pool.length - 1);
    if (actionBtn) actionBtn.className = 'single-next-btn';
    if (actionText) actionText.innerText = isLast ? '查看小结' : '下一题';

    saveShiCiSessionProgress();
}

function revealShiCiAnswer() {
    if (shiciState.answered) return;
    shiciState.answered = true;
    const q = shiciState.pool[shiciState.currentIdx];
    q.userAnswerIdx = -1;
    q.isCorrect = false;
    q.skipped = true;
    q.answered = true;

    const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : '';
    const wKey = q.word;
    if (shiciState.completedWords) shiciState.completedWords.delete(wKey);

    ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, false);
    renderShiCiMasteryDiamonds(q.word, 'loss');
    scheduleRetestForCurrentShiCiQuestion();

    recordShiCiUserMistake(currentUser, {
        word: q.word,
        meaning: fullMeaning,
        pinyin: q.pinyin,
        sentence: q.sentence || q.example?.sentence,
        highlightedSentence: q.highlightedSentence,
        source: q.source || q.example?.source,
        pos: q.sense?.part_of_speech || q.pos,
        isShiCi: true
    });
    updateShiCiProgressDisplay();
    saveCurrentUserData();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`shici-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        if (i === q.correctIdx) btn.classList.add('correct');
    });

    displayShiCiExplanation(q, false);

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    const isLast = (shiciState.currentIdx === shiciState.pool.length - 1);
    if (actionBtn) actionBtn.className = 'single-next-btn';
    if (actionText) actionText.innerText = isLast ? '查看小结' : '下一题';

    saveShiCiSessionProgress();
}

function handleShiCiActionClick() {
    if (!shiciState.answered) {
        revealShiCiAnswer();
    } else {
        nextShiCiQuestion();
    }
}

function nextShiCiQuestion() {
    shiciState.currentIdx++;
    saveShiCiSessionProgress();
    renderShiCiQuestion();
}

function displayShiCiExplanation(q, isRight) {
    const expCard = document.getElementById('shici-explanation-card');
    if (!expCard) return;
    expCard.style.display = 'flex';

    const bannerEl = document.getElementById('shici-feedback-banner');
    const iconEl = document.getElementById('shici-feedback-icon');
    const textEl = document.getElementById('shici-feedback-text');

    if (bannerEl) {
        bannerEl.className = `shici-feedback-banner ${isRight ? 'correct' : 'wrong'}`;
    }
    if (iconEl) iconEl.innerText = isRight ? 'check_circle' : 'cancel';
    if (textEl) textEl.innerText = isRight ? '回答正确' : (q.skipped ? '已揭晓答案' : '回答错误');

    const fullMeaningEl = document.getElementById('shici-correct-meaning-full');
    if (fullMeaningEl) {
        fullMeaningEl.innerText = `[${q.sense.part_of_speech || ''}] ${q.sense.meaning || ''}`;
    }

    const annotRow = document.getElementById('shici-annotation-row');
    const annotContent = document.getElementById('shici-annotation-content');
    if (q.example && q.example.annotation) {
        if (annotRow) annotRow.style.display = 'block';
        if (annotContent) annotContent.innerText = q.example.annotation;
    } else {
        if (annotRow) annotRow.style.display = 'block';
        if (annotContent) annotContent.innerText = `在${q.source || ''}中作${q.sense.part_of_speech || '实词'}，意为“${(q.sense.meaning || '').replace(/★/g, '')}”。`;
    }
}

function endShiCiGame() {
    if (shiciConfig.order === 'sequential' && !shiciState.isReview) {
        shiciProgress.currentIndex = ((shiciProgress.currentIndex || 0) + (shiciConfig.batchSize || 15)) % 300;
    }
    saveShiCiState();
    if (currentUser) {
        if (shiciState && shiciState.isReview) {
            localStorage.removeItem(`shici_review_progress_${currentUser}`);
        } else {
            localStorage.removeItem(`shici_learn_progress_${currentUser}`);
            localStorage.removeItem(`shici_progress_session_${currentUser}`);
        }
    }
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();

    gameResult = {
        mode: 'shici',
        msg: shiciState.isReview ? '已完成本组实词复习！' : '已完成本组实词背诵！',
        p1Score: shiciState.score,
        p2Score: 0,
        pool: shiciState.pool,
        total: shiciState.targetTotal || shiciState.pool.length
    };
    if (typeof syncAllUserDataToCloud === 'function') {
        syncAllUserDataToCloud();
    }
    if (typeof ItemManager !== 'undefined') {
        ItemManager.recordTaskProgress('task_shici', 1);
    }
    renderResult();
    switchView('view-result');
}

function confirmExitShiCi() {
    saveShiCiSessionProgress();
    saveShiCiState();
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();
    if (typeof syncAllUserDataToCloud === 'function') {
        syncAllUserDataToCloud();
    }
    const target = (window.previousView && window.previousView !== 'view-shici') ? window.previousView : 'view-hub';
    switchView(target);
}

function toggleCurrentShiCiMastered() {
    if (!shiciState || !shiciState.pool || !shiciState.pool[shiciState.currentIdx]) return;
    const currentQ = shiciState.pool[shiciState.currentIdx];
    const w = currentQ.word;
    if (!shiciProgress.masteredWords) shiciProgress.masteredWords = {};
    const isNow = !shiciProgress.masteredWords[w];
    const meaningStr = currentQ.sense ? `[${currentQ.sense.part_of_speech || ''}] ${(currentQ.sense.meaning || '').replace(/★/g, '')}` : '';

    if (isNow) {
        shiciProgress.masteredWords[w] = true;
        ShiCiEbbinghausEngine.recordWord(w, meaningStr, currentQ.pinyin, true, true);
        renderShiCiMasteryDiamonds(w, 'gain');
        showToast(`已将【${w}】标记为熟词，本组不再抽取`);

        // 从当前题之后的 pool 中移除该词
        const curIdx = shiciState.currentIdx;
        const prev = shiciState.pool.slice(0, curIdx + 1);
        const rem = shiciState.pool.slice(curIdx + 1).filter(item => item && item.word !== w);
        shiciState.pool = prev.concat(rem);
    } else {
        delete shiciProgress.masteredWords[w];
        ShiCiEbbinghausEngine.unmarkMastered(w);
        renderShiCiMasteryDiamonds(w, 'loss');
        showToast(`已取消【${w}】的熟词标记`);
    }
    saveShiCiState();
    updateShiCiMasterBtn(isNow);

    // 同时与全局熟词本打通
    if (typeof toggleMasteredWord === 'function') {
        toggleMasteredWord(w, currentQ.pinyin || '', meaningStr, 'shici');
    }
}

function updateShiCiMasterBtn(isMastered) {
    const btn = document.getElementById('btn-shici-master');
    const icon = document.getElementById('btn-shici-master-icon') || (btn ? btn.querySelector('.material-symbols-rounded') : null);
    if (!btn) return;
    if (isMastered) {
        btn.classList.add('active');
        if (icon) icon.innerText = 'check_circle';
        btn.title = '取消熟词标记';
    } else {
        btn.classList.remove('active');
        if (icon) icon.innerText = 'check_circle_outline';
        btn.title = '标注熟词（不再抽取）';
    }
}

function openShiCiSettings() {
    loadShiCiSettings();
    updateShiCiSettingsModalUi();
    const modal = document.getElementById('modal-shici-settings');
    if (modal) modal.classList.add('active');
}

function closeShiCiSettings() {
    const modal = document.getElementById('modal-shici-settings');
    if (modal) modal.classList.remove('active');
}

function saveShiCiSettings() {
    saveShiCiState();
    updateHubShiCiBadge();
    closeShiCiSettings();
    showToast('实词设置已保存');
}

function selectShiCiOrderMode(mode) {
    shiciConfig.order = mode;
    const seqEl = document.getElementById('chip-shici-seq');
    const randEl = document.getElementById('chip-shici-rand');
    if (seqEl) seqEl.classList.toggle('selected', mode === 'sequential');
    if (randEl) randEl.classList.toggle('selected', mode === 'random');
    saveShiCiState();
}

function handleShiCiBatchSlider(val) {
    const num = parseInt(val) || 15;
    shiciConfig.batchSize = num;
    if (typeof updateMd3SliderUI === 'function') {
        updateMd3SliderUI('slider-shici-batch', v => `${v} 题`);
    }
    saveShiCiState();
}
window.handleShiCiBatchSlider = handleShiCiBatchSlider;

function handleShiCiReviewBatchSlider(val) {
    const num = parseInt(val) || 20;
    shiciConfig.reviewBatch = num;
    if (typeof updateMd3SliderUI === 'function') {
        updateMd3SliderUI('slider-shici-review-batch', v => v >= 45 ? '全部' : `${v} 题`);
    }
    saveShiCiState();
}
window.handleShiCiReviewBatchSlider = handleShiCiReviewBatchSlider;

function selectShiCiBatch(batch) {
    handleShiCiBatchSlider(batch);
}

function selectShiCiReviewBatch(batch) {
    handleShiCiReviewBatchSlider(batch);
}
window.selectShiCiReviewBatch = selectShiCiReviewBatch;

function toggleShiCiRetestSwitch(checked) {
    shiciConfig.immediateRetest = !!checked;
    saveShiCiState();
}

function selectShiCiImmediateRetest(enabled) {
    shiciConfig.immediateRetest = !!enabled;
    const swEl = document.getElementById('switch-shici-retest');
    if (swEl) swEl.checked = shiciConfig.immediateRetest;
    saveShiCiState();
}

function updateShiCiSettingsModalUi() {
    const seqEl = document.getElementById('chip-shici-seq');
    const randEl = document.getElementById('chip-shici-rand');
    if (seqEl) seqEl.classList.toggle('selected', shiciConfig.order === 'sequential');
    if (randEl) randEl.classList.toggle('selected', shiciConfig.order === 'random');

    const learnSlider = document.getElementById('slider-shici-batch');
    if (learnSlider) {
        learnSlider.value = shiciConfig.batchSize || 15;
        if (typeof updateMd3SliderUI === 'function') {
            updateMd3SliderUI(learnSlider, val => `${val} 题`);
        }
    }

    const reviewSlider = document.getElementById('slider-shici-review-batch');
    if (reviewSlider) {
        reviewSlider.value = shiciConfig.reviewBatch || 20;
        if (typeof updateMd3SliderUI === 'function') {
            updateMd3SliderUI(reviewSlider, val => val >= 45 ? '全部' : `${val} 题`);
        }
    }

    const swEl = document.getElementById('switch-shici-retest');
    if (swEl) swEl.checked = shiciConfig.immediateRetest !== false;

    updateShiCiProgressStatusUI();
}

function updateHubShiCiBadge() {
    const badge = document.getElementById('hub-shici-badge');
    if (badge) {
        loadShiCiSettings();
        const count = shiciProgress.learnedWords ? Object.keys(shiciProgress.learnedWords).length : 0;
    }
    const reviewCountBadge = document.getElementById('hub-shici-review-due-count');
    const btnShiCiReview = document.getElementById('btn-hub-shici-review');
    if (reviewCountBadge || btnShiCiReview) {
        loadShiCiSettings();
        if (typeof ShiCiEbbinghausEngine !== 'undefined') {
            ShiCiEbbinghausEngine.checkOverduePenalties();
            const dueCount = ShiCiEbbinghausEngine.getDueWords().length;
            if (reviewCountBadge) {
                if (dueCount > 0) {
                    reviewCountBadge.style.display = 'inline-flex';
                    reviewCountBadge.innerText = dueCount;
                } else {
                    const learnedCount = ShiCiEbbinghausEngine.getAllLearnedWords().length || (shiciProgress.learnedWords ? Object.keys(shiciProgress.learnedWords).length : 0);
                    if (learnedCount > 0) {
                        reviewCountBadge.style.display = 'inline-flex';
                        reviewCountBadge.innerText = '0';
                    } else {
                        reviewCountBadge.style.display = 'none';
                    }
                }
            }
            if (btnShiCiReview) {
                btnShiCiReview.disabled = (dueCount === 0);
                if (dueCount === 0) {
                    btnShiCiReview.title = '当前没有待复习的实词';
                } else {
                    btnShiCiReview.title = `共有 ${dueCount} 个实词待复习`;
                }
            }
        }
    }
    updateHubShiCiResumeButton();
}

