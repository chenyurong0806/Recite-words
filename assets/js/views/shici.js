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
// 结算页面小结渲染函数
// ========================
function toggleSettlementDrawer(el) {
    if (!el) return;
    el.classList.toggle('open');
}

function filterSettlementList(filter, btn) {
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.settlement-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    const container = document.getElementById('settlement-list-container');
    if (!container) return;
    const items = container.querySelectorAll('.settlement-item');
    items.forEach(item => {
        if (filter === 'all') {
            item.style.display = 'block';
        } else if (filter === 'mistakes') {
            item.style.display = (item.getAttribute('data-mistake') === '1') ? 'block' : 'none';
        }
    });
}

function renderSingleSummaryHtml(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    let mistakeCount = pool.filter(q => !q.isCorrect).length;

    let itemsHtml = pool.map((q, idx) => {
        const isMistake = !q.isCorrect;
        const isPhrase = !!(q.isPhrase || (q.word && q.word.trim().includes(' ')));
        const targetMeaning = escapeHtml(q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : ''));

        let titleDisplay = '';
        let drawerContent = '';

        if (isPhrase) {
            // 词组规则：词组则将错的地方加粗
            const targetWords = q.targetWords || (typeof extractPhraseTargetWords === 'function' ? extractPhraseTargetWords(q.word) : q.word.split(' '));
            const wrongSlots = Array.isArray(q.wrongSlotIndices) ? q.wrongSlotIndices : [];

            if (isMistake) {
                titleDisplay = targetWords.map((w, i) => {
                    if (typeof isFixedPhraseToken === 'function' && isFixedPhraseToken(w)) return escapeHtml(w);
                    const isSlotWrong = wrongSlots.length === 0 || wrongSlots.includes(i);
                    return isSlotWrong
                        ? `<strong class="phrase-wrong-token-bold">${escapeHtml(w)}</strong>`
                        : escapeHtml(w);
                }).join(' ');
            } else {
                titleDisplay = escapeHtml(q.word);
            }

            drawerContent = `
                        <div style="font-weight:700; color:var(--md-sys-color-primary); margin-bottom:8px; font-size:0.86rem;">
                            词组搭配与释义：
                        </div>
                        <div style="font-size:0.92rem; line-height:1.6; background:var(--md-sys-color-surface-container); padding:10px 14px; border-radius:8px;">
                            完整词组：<strong>${escapeHtml(q.word)}</strong><br>
                            标准释义：<span style="color:var(--md-sys-color-on-surface-variant);">${targetMeaning}</span>
                        </div>
                    `;
        } else {
            // 单词规则：左边放四个选项的单词，右边展示释义；选错加粗标红前缀 ✕，正确前缀 ✓；删除“干扰辨析”“正确释义”“选错的辨析项”等文字标签
            const phoneDisplay = q.phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); margin-left:6px; font-weight:normal;">/${escapeHtml(q.phone)}/</span>` : '';
            if (isMistake) {
                titleDisplay = `<strong class="settlement-word-text mistake-word-bold">${escapeHtml(q.word)}</strong>${phoneDisplay}`;
            } else {
                titleDisplay = `<span class="settlement-word-text">${escapeHtml(q.word)}</span>${phoneDisplay}`;
            }

            let distractorsHtml = '';
            if (Array.isArray(q.options) && q.options.length > 0) {
                distractorsHtml = q.options.map((opt, optIdx) => {
                    const isCorrectOpt = (optIdx === q.correctIdx);
                    const isUserChosen = (optIdx === q.userAnswerIdx);
                    const isChosenWrong = isMistake && isUserChosen;

                    const optWord = escapeHtml(opt.word || (isCorrectOpt ? q.word : ''));
                    const optMeaning = escapeHtml(opt.meaning || '');

                    if (isCorrectOpt) {
                        return `
                                    <div class="distractor-grid-row correct-target-row">
                                        <span class="distractor-word-col">
                                            <span style="font-weight:700;">✓</span>
                                            <span>${optWord}</span>
                                        </span>
                                        <span class="distractor-meaning-col">${optMeaning}</span>
                                    </div>
                                `;
                    } else if (isChosenWrong) {
                        return `
                                    <div class="distractor-grid-row chosen-mistake-row">
                                        <span class="distractor-word-col">
                                            <span style="font-weight:800;">✕</span>
                                            <strong>${optWord}</strong>
                                        </span>
                                        <span class="distractor-meaning-col"><strong>${optMeaning}</strong></span>
                                    </div>
                                `;
                    } else {
                        return `
                                    <div class="distractor-grid-row">
                                        <span class="distractor-word-col">${optWord}</span>
                                        <span class="distractor-meaning-col">${optMeaning}</span>
                                    </div>
                                `;
                    }
                }).join('');
            } else {
                distractorsHtml = '<div style="color:var(--md-sys-color-outline); font-size:0.84rem;">暂无选项数据</div>';
            }

            drawerContent = `
                        <div style="font-weight:700; color:var(--md-sys-color-primary); margin-bottom:8px; font-size:0.86rem;">
                            选项辨析：
                        </div>
                        <div class="distractor-list">
                            ${distractorsHtml}
                        </div>
                    `;
        }

        return `
                    <div class="settlement-item ${isMistake ? 'item-mistake' : 'item-correct'}" onclick="toggleSettlementDrawer(this)" data-mistake="${isMistake ? '1' : '0'}">
                        <div class="settlement-item-header">
                            <div class="settlement-item-main">
                                <span class="material-symbols-rounded settlement-status-icon ${isMistake ? 'wrong' : 'correct'}">
                                    ${isMistake ? 'cancel' : 'check_circle'}
                                </span>
                                <div>
                                    <div>${titleDisplay}</div>
                                    <div class="settlement-trans-text">${targetMeaning}</div>
                                </div>
                            </div>
                            <span class="material-symbols-rounded settlement-item-chevron">expand_more</span>
                        </div>
                        <div class="settlement-item-drawer">
                            ${drawerContent}
                        </div>
                    </div>
                `;
    }).join('');

    return `
                <div class="settlement-summary-card">
                    <div class="settlement-summary-header">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem; font-weight:700;">本组题目小结</h3>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--md-sys-color-outline);">点击单词或词组可展开查看选项辨析与干扰项</p>
                        </div>
                        <div class="settlement-filter-group">
                            <button type="button" class="settlement-filter-btn active" onclick="filterSettlementList('all', this)">全部 (${pool.length})</button>
                            <button type="button" class="settlement-filter-btn" onclick="filterSettlementList('mistakes', this)">仅看错题 (${mistakeCount})</button>
                        </div>
                    </div>
                    <div class="settlement-list md3-scroll-view" id="settlement-list-container">
                        ${itemsHtml}
                    </div>
                </div>
            `;
}

function renderShiCiSummaryHtml(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    let mistakeCount = pool.filter(q => !q.isCorrect).length;

    let itemsHtml = pool.map((q, idx) => {
        const isMistake = !q.isCorrect;
        const wordTitle = isMistake
            ? `<strong class="settlement-word-text mistake-word-bold">${escapeHtml(q.word)}</strong> <span style="font-size:0.85rem; color:var(--md-sys-color-outline); font-weight:normal;">${escapeHtml(q.pinyin || '')}</span>`
            : `<span class="settlement-word-text">${escapeHtml(q.word)}</span> <span style="font-size:0.85rem; color:var(--md-sys-color-outline); font-weight:normal;">${escapeHtml(q.pinyin || '')}</span>`;

        const correctSenseText = `【${escapeHtml(q.sense?.part_of_speech || '')}】 ${escapeHtml((q.sense?.meaning || '').replace(/★/g, ''))}`;

        let optionsHtml = '';
        if (Array.isArray(q.options)) {
            optionsHtml = q.options.map((opt, optIdx) => {
                const isCorrect = (optIdx === q.correctIdx);
                const isUserChosen = (optIdx === q.userAnswerIdx);
                const isChosenWrong = isMistake && isUserChosen;

                if (isCorrect) {
                    return `
                                <div class="distractor-row correct-target-meaning" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px;">
                                    <span class="distractor-text">✓ [${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}</span>
                                    <span class="badge" style="background:#2E7D32; color:#fff; font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:600;">例句对应释义</span>
                                </div>
                            `;
                } else if (isChosenWrong) {
                    // 选错项：前缀加 ✕，加粗，展示选错释义对应的例句与出处
                    let wrongExampleHtml = '';
                    const ex = (opt.examples && opt.examples.length > 0) ? opt.examples[0] : null;
                    if (ex) {
                        wrongExampleHtml = `
                                    <div class="shici-wrong-example-box">
                                        <div style="font-weight:700; color:#BA1A1A; font-size:0.8rem; margin-bottom:2px;">选错释义对应例句：</div>
                                        <div style="line-height:1.5;">${escapeHtml(ex.sentence || '')} <span style="color:var(--md-sys-color-outline); font-size:0.78rem;">${escapeHtml(ex.source || '')}</span></div>
                                        ${ex.annotation ? `<div style="color:var(--md-sys-color-on-surface-variant); font-size:0.8rem; margin-top:2px;">句意：${escapeHtml(ex.annotation)}</div>` : ''}
                                    </div>
                                `;
                    } else if (Array.isArray(q.allSenses)) {
                        const matchedSense = q.allSenses.find(s => (s.meaning || '').replace(/★/g, '').trim() === opt.meaning);
                        if (matchedSense && matchedSense.examples && matchedSense.examples.length > 0) {
                            const mex = matchedSense.examples[0];
                            wrongExampleHtml = `
                                        <div class="shici-wrong-example-box">
                                            <div style="font-weight:700; color:#BA1A1A; font-size:0.8rem; margin-bottom:2px;">选错释义对应例句：</div>
                                            <div style="line-height:1.5;">${escapeHtml(mex.sentence || '')} <span style="color:var(--md-sys-color-outline); font-size:0.78rem;">${escapeHtml(mex.source || '')}</span></div>
                                            ${mex.annotation ? `<div style="color:var(--md-sys-color-on-surface-variant); font-size:0.8rem; margin-top:2px;">句意：${escapeHtml(mex.annotation)}</div>` : ''}
                                        </div>
                                    `;
                        }
                    }

                    return `
                                <div style="background:#FFDAD6; border:1.5px solid var(--md-sys-color-error); border-radius:8px; padding:10px 12px; margin-bottom:4px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span class="distractor-text" style="font-weight:800; color:#BA1A1A; font-size:0.92rem;">
                                            ✕ [${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}
                                        </span>
                                        <span class="badge" style="background:#BA1A1A; color:#fff; font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:700;">选错的释义</span>
                                    </div>
                                    ${wrongExampleHtml}
                                </div>
                            `;
                } else {
                    // 其他干扰项：不加“该词其他释义”/“该词其他义项”标签
                    return `
                                <div class="distractor-row" style="padding:8px 12px;">
                                    <span class="distractor-text">[${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}</span>
                                </div>
                            `;
                }
            }).join('');
        }

        const annotationHtml = q.example?.annotation
            ? `<div style="font-size:0.88rem; color:var(--md-sys-color-on-surface-variant); margin-top:6px; background:rgba(0,104,116,0.06); padding:8px 12px; border-radius:8px; line-height:1.5;">💡 <strong>句意释义：</strong>${escapeHtml(q.example.annotation)}</div>`
            : '';

        return `
                    <div class="settlement-item ${isMistake ? 'item-mistake' : 'item-correct'}" onclick="toggleSettlementDrawer(this)" data-mistake="${isMistake ? '1' : '0'}">
                        <div class="settlement-item-header">
                            <div class="settlement-item-main">
                                <span class="material-symbols-rounded settlement-status-icon ${isMistake ? 'wrong' : 'correct'}">
                                    ${isMistake ? 'cancel' : 'check_circle'}
                                </span>
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div>${wordTitle}</div>
                                        <span class="badge" style="background:var(--md-sys-color-surface-container); color:var(--md-sys-color-on-surface); font-size:0.74rem;">${escapeHtml(q.example?.source || '文言例句')}</span>
                                    </div>
                                    <div style="font-size:0.95rem; margin-top:4px; line-height:1.5;">
                                        ${q.highlightedSentence || escapeHtml(q.example?.sentence || '')}
                                    </div>
                                    <div class="settlement-trans-text" style="color:var(--md-sys-color-primary); font-weight:600; margin-top:4px;">
                                        例句释义：${correctSenseText}
                                    </div>
                                </div>
                            </div>
                            <span class="material-symbols-rounded settlement-item-chevron">expand_more</span>
                        </div>
                        <div class="settlement-item-drawer">
                            ${annotationHtml}
                            <div style="font-weight:700; color:var(--md-sys-color-primary); margin:10px 0 6px 0; font-size:0.86rem;">
                                抽取的释义辨析项：
                            </div>
                            <div class="distractor-list">
                                ${optionsHtml}
                            </div>
                        </div>
                    </div>
                `;
    }).join('');

    return `
                <div class="settlement-summary-card">
                    <div class="settlement-summary-header">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem; font-weight:700;">本组实词小结</h3>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--md-sys-color-outline);">列举本组所有实词及其在对应例句下的释义</p>
                        </div>
                        <div class="settlement-filter-group">
                            <button type="button" class="settlement-filter-btn active" onclick="filterSettlementList('all', this)">全部 (${pool.length})</button>
                            <button type="button" class="settlement-filter-btn" onclick="filterSettlementList('mistakes', this)">仅看错题 (${mistakeCount})</button>
                        </div>
                    </div>
                    <div class="settlement-list md3-scroll-view" id="settlement-list-container">
                        ${itemsHtml}
                    </div>
                </div>
            `;
}

// ========================
// 背实词数据与控制器 (ShiCiManager)
// ========================
let shiciConfig = {
    order: 'sequential', // 'sequential' or 'random'
    batchSize: 15,
    selectedBooks: ['books/实词/实词.json'],
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
    } catch (e) { }
    try {
        const prog = localStorage.getItem('shici_progress_' + (currentUser || 'default'));
        if (prog) Object.assign(shiciProgress, JSON.parse(prog));
    } catch (e) { }
    if (!Array.isArray(shiciConfig.selectedBooks) || shiciConfig.selectedBooks.length === 0) {
        shiciConfig.selectedBooks = ['books/实词/实词.json'];
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

    async loadData() {
        if (this.data && Array.isArray(this.data) && this.data.length > 0) {
            return this.data;
        }
        this.loading = true;

        // 1. 本地缓存读取
        try {
            const cached = localStorage.getItem('vocab_shici_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length >= 300) {
                    this.data = parsed;
                    this.loading = false;
                    return this.data;
                }
            }
        } catch (e) { }

        // 2. 候选加载路径
        const urls = [
            './books/实词/实词.json',
            'books/实词/实词.json',
            'https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/books/%E5%AE%9E%E8%AF%8D/%E5%AE%9E%E8%AF%8D.json',
            'https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/books/%E5%AE%9E%E8%AF%8D/%E5%AE%9E%E8%AF%8D.json',
            `${BookManager.API_BASE}/api/book?path=${encodeURIComponent('books/实词/实词.json')}`
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
                        this.data = json;
                        try {
                            localStorage.setItem('vocab_shici_cache', JSON.stringify(json));
                        } catch (e) { }
                        this.loading = false;
                        return this.data;
                    }
                }
            } catch (err) { }
        }

        this.loading = false;
        throw new Error('未能加载实词库文件，请确保 books/实词/实词.json 存在或网络正常！');
    },

    async loadBooks(bookIds = ['books/实词/实词.json']) {
        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            bookIds = ['books/实词/实词.json'];
        }
        const results = [];
        for (const bId of bookIds) {
            const custom = (window.customBooks || []).find(b => b.id === bId);
            if (custom && Array.isArray(custom.words) && custom.words.length > 0) {
                results.push(...custom.words);
                continue;
            }
            try {
                const data = await this.loadData();
                if (Array.isArray(data)) results.push(...data);
            } catch (e) { }
        }
        return results.length > 0 ? results : (await this.loadData());
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

    const shuffledOther = [...otherSenses].sort(() => 0.5 - Math.random());
    for (const os of shuffledOther) {
        if (pickedDistractors.length >= 3) break;
        pickedDistractors.push(os);
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

    const cleanTargetMeaning = (sense.meaning || '').replace(/★/g, '').trim();
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

    // 检查是否有未完成的断点进度
    if (currentUser) {
        const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                    shiciState = parsed;
                    renderShiCiQuestion();
                    switchView('view-shici');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/实词.json']);
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

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
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

// 实词复习功能（基于艾宾浩斯记忆遗忘曲线）
async function startShiCiReview() {
    loadShiCiSettings();
    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/实词.json']);
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

        const batchSize = shiciConfig.batchSize || 15;
        const targets = [...reviewWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const questions = targets.map(w => generateShiCiQuestion(w, allWords)).filter(Boolean);

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
            answered: false,
            isReview: true
        };

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
        localStorage.setItem(`shici_progress_session_${currentUser}`, JSON.stringify({
            pool: shiciState.pool,
            currentIdx: shiciState.currentIdx,
            score: shiciState.score,
            total: shiciState.pool.length,
            isReview: !!shiciState.isReview,
            timestamp: Date.now()
        }));
    } catch (e) { }
    updateHubShiCiResumeButton();
}

function clearCurrentShiCiProgress() {
    if (!currentUser) return;
    localStorage.removeItem(`shici_progress_session_${currentUser}`);
    updateHubShiCiResumeButton();
    updateShiCiProgressStatusUI();
    showToast('已清除当前实词学习进度');
}

function updateShiCiProgressStatusUI() {
    const tipEl = document.getElementById('shici-progress-status-tip');
    const clearBtn = document.getElementById('btn-clear-shici-progress');
    if (!tipEl || !clearBtn || !currentUser) return;

    const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                tipEl.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                tipEl.style.color = 'var(--md-sys-color-primary)';
                clearBtn.disabled = false;
                return;
            }
        } catch (e) { }
    }
    tipEl.innerText = '无';
    tipEl.style.color = 'var(--md-sys-color-outline)';
    clearBtn.disabled = true;
}

function updateHubShiCiResumeButton() {
    const label = document.getElementById('btn-hub-shici-text');
    if (!label) return;
    if (!currentUser) {
        label.innerText = '学习新词';
        return;
    }
    const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                label.innerText = `继续背诵 (${parsed.currentIdx + 1}/${parsed.pool.length})`;
                return;
            }
        } catch (e) { }
    }
    label.innerText = '学习新词';
}

function renderShiCiQuestion() {
    if (!shiciState || shiciState.currentIdx >= shiciState.pool.length) {
        endShiCiGame();
        return;
    }

    const q = shiciState.pool[shiciState.currentIdx];
    shiciState.answered = false;

    const progressEl = document.getElementById('shici-progress-text');
    if (progressEl) progressEl.innerText = `${shiciState.currentIdx + 1}/${shiciState.pool.length}`;

    const fillEl = document.getElementById('shici-progress-fill');
    if (fillEl) fillEl.style.width = Math.round(((shiciState.currentIdx + 1) / shiciState.pool.length) * 100) + '%';

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
        optContainer.innerHTML = q.options.map((opt, idx) => `
                    <button class="shici-opt-btn" id="shici-opt-${idx}" onclick="handleShiCiAnswer(${idx})">
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.meaning)}</span>
                    </button>
                `).join('');
    }

    const expCard = document.getElementById('shici-explanation-card');
    if (expCard) expCard.style.display = 'none';

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    if (actionBtn) {
        actionBtn.className = 'single-next-btn show-answer-mode';
        actionBtn.style.display = 'flex';
    }
    if (actionText) actionText.innerText = '看答案';
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

    if (isRight) {
        shiciState.score++;
        if (!shiciProgress.learnedWords) shiciProgress.learnedWords = {};
        shiciProgress.learnedWords[q.word] = (shiciProgress.learnedWords[q.word] || 0) + 1;
        ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, true);
        renderShiCiMasteryDiamonds(q.word, 'gain');
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
    } else {
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
        localStorage.removeItem(`shici_progress_session_${currentUser}`);
    }
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();

    gameResult = {
        mode: 'shici',
        msg: shiciState.isReview ? '已完成本组实词复习！' : '已完成本组实词背诵！',
        p1Score: shiciState.score,
        p2Score: 0,
        pool: shiciState.pool,
        total: shiciState.pool.length
    };
    renderResult();
    switchView('view-result');
}

function confirmExitShiCi() {
    saveShiCiSessionProgress();
    saveShiCiState();
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();
    switchView('view-hub');
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
        showToast(`已将【${w}】标记为熟词`);
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

function selectShiCiBatch(batch) {
    shiciConfig.batchSize = batch;
    document.querySelectorAll('#chips-shici-batch .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-val')) === batch);
    });
    saveShiCiState();
}

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

    document.querySelectorAll('#chips-shici-batch .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-val')) === shiciConfig.batchSize);
    });

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
