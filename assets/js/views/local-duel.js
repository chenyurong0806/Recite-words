/**
 * 希沃同屏双人触控对决视图
 * Module: assets/js/views/local-duel.js
 */

/* ==========================================================================
   10. 希沃同屏多触控对决
   ========================================================================== */
let localDuelConfig = {
    selectedBooks: ['GaoKao3500'],
    opponentName: '挑战者',
    mode: 'lead',
    leadThreshold: 6,
    duration: 60,
    gaugeStyle: 'tug'
};

try {
    const saved = JSON.parse(localStorage.getItem('vocab_local_duel_config') || '{}');
    if (saved) {
        if (saved.bookId && !saved.selectedBooks) saved.selectedBooks = [saved.bookId];
        Object.assign(localDuelConfig, saved);
    }
} catch (e) { }

let localDuelState = {
    active: false,
    pool: [],
    mode: 'lead',
    leadThreshold: 6,
    duration: 60,
    timeLeft: 60,
    clockTimer: null,
    p1: { name: '红方', score: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false },
    p2: { name: '挑战者', score: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false }
};

let localPhraseState = {
    p1: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' },
    p2: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' }
};

function renderLocalDuelOpponents() {
    const container = document.getElementById('chips-local-duel-opponents');
    if (!container) return;

    const myName = currentUser || '红方';
    const otherUsers = (allUsersList || []).filter(u => u && u !== myName);
    const candidates = ['挑战者', ...otherUsers];

    if (!localDuelConfig.opponentName || localDuelConfig.opponentName === myName) {
        localDuelConfig.opponentName = candidates[0];
    } else if (!candidates.includes(localDuelConfig.opponentName)) {
        candidates.push(localDuelConfig.opponentName);
    }

    container.innerHTML = candidates.map(name => {
        const isSelected = (localDuelConfig.opponentName === name);
        return `
                <div class="md3-chip ${isSelected ? 'selected' : ''}" 
                     data-opp="${name}" 
                     onclick="selectLocalDuelOpponent('${name}')">
                    ${isSelected ? '✓ ' : ''} ${name}
                </div>
            `;
    }).join('');
}

function selectLocalDuelOpponent(name) {
    localDuelConfig.opponentName = name;
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelOpponents();
}

function toggleCreateOpponentInput(show) {
    const box = document.getElementById('local-duel-new-opp-box');
    if (!box) return;
    const willShow = (typeof show === 'boolean') ? show : (box.style.display === 'none');
    box.style.display = willShow ? 'block' : 'none';
    if (willShow) {
        const inp = document.getElementById('input-new-opponent');
        if (inp) {
            inp.value = '';
            setTimeout(() => inp.focus(), 100);
        }
    }
}

function createAndSelectLocalOpponent() {
    const inp = document.getElementById('input-new-opponent');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name) {
        showToast('请输入账号昵称');
        return;
    }
    if (name === (currentUser || '红方')) {
        showToast('对手账号不能与当前登录玩家重名');
        return;
    }
    if (allUsersList.includes(name)) {
        showToast(`已有账号 “${name}”，已为您直接选中该对手`);
        localDuelConfig.opponentName = name;
        localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
        renderLocalDuelOpponents();
        toggleCreateOpponentInput(false);
        return;
    }

    allUsersList.push(name);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    localDuelConfig.opponentName = name;
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelOpponents();
    toggleCreateOpponentInput(false);
    inp.value = '';
    showToast(`成功创建并选中对手：“${name}”`);
}

function openLocalDuelSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-local-duel-settings');
    if (!modal) return;
    renderLocalDuelBookChips();
    renderLocalDuelOpponents();
    updateLocalDuelSettingsChips();
    modal.classList.add('active');
}

function closeLocalDuelSettings() {
    const modal = document.getElementById('modal-local-duel-settings');
    if (modal) modal.classList.remove('active');
}

let currentLocalDuelCategory = 'english';

function switchLocalDuelBookCategory(cat) {
    currentLocalDuelCategory = cat;
    document.querySelectorAll('#local-duel-book-category-tabs .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    const importLabel = document.getElementById('local-duel-import-label');
    if (importLabel) importLabel.innerText = cat === 'shici' ? '导入文言' : '导入词书';
    renderLocalDuelBookChips();
}

function triggerLocalDuelBookImport() {
    const input = document.getElementById('local-duel-custom-book-input');
    if (input) input.click();
}

async function handleLocalDuelCustomBookUpload(e) {
    if (currentLocalDuelCategory === 'shici') {
        await loadCustomShiCiBook(e);
    } else {
        await loadCustomBook(e);
    }
    renderLocalDuelBookChips();
}

function selectAllLocalDuelBooks(selectAll = true) {
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const targetBooks = allBooks.filter(b => currentLocalDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b))
        .concat((window.customBooks || []).filter(b => currentLocalDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    if (selectAll) {
        targetBooks.forEach(b => {
            if (!localDuelConfig.selectedBooks.includes(b.id)) {
                localDuelConfig.selectedBooks.push(b.id);
            }
        });
    } else {
        const targetIds = new Set(targetBooks.map(b => b.id));
        localDuelConfig.selectedBooks = (localDuelConfig.selectedBooks || []).filter(id => !targetIds.has(id));
    }
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelBookChips();
}

function renderLocalDuelBookChips() {
    const container = document.getElementById('chips-local-duel-books');
    if (!container) return;
    if (!Array.isArray(localDuelConfig.selectedBooks)) {
        localDuelConfig.selectedBooks = [];
    }

    renderBookFolderTree('chips-local-duel-books', {
        selectedIds: localDuelConfig.selectedBooks,
        onToggle: 'toggleLocalDuelBook',
        mode: 'local_duel',
        filterType: 'all'
    });

    const summaryEl = document.getElementById('local-duel-books-summary');
    if (summaryEl) {
        const totalCount = (localDuelConfig.selectedBooks || []).length;
        summaryEl.innerText = `已选 ${totalCount} 本词书`;
    }

    updateLocalDuelStartButtonState();
}

function toggleLocalDuelBook(bookId) {
    if (!Array.isArray(localDuelConfig.selectedBooks)) {
        localDuelConfig.selectedBooks = [];
    }
    const hasIt = isBookIdSelected(localDuelConfig.selectedBooks, bookId);
    if (hasIt) {
        localDuelConfig.selectedBooks = toggleBookIdInList(localDuelConfig.selectedBooks, bookId);
    } else {
        localDuelConfig.selectedBooks.push(bookId);
    }
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelBookChips();
}

function updateLocalDuelStartButtonState() {
    const startBtn = document.getElementById('btn-start-local-duel');
    const selCount = (localDuelConfig.selectedBooks || []).length;
    if (startBtn) {
        startBtn.disabled = (selCount === 0);
    }
}

function updateLocalDuelSettingsChips() {
    document.querySelectorAll('#chips-local-duel-rule .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-rule') === localDuelConfig.mode);
    }); const groupLead =
        document.getElementById('group-local-duel-lead'); const groupTimed =
            document.getElementById('group-local-duel-timed'); if (groupLead)
        groupLead.style.display = (localDuelConfig.mode === 'lead') ? 'block' : 'none';
    if (groupTimed) groupTimed.style.display = (localDuelConfig.mode === 'timed') ?
        'block' : 'none';

    document.querySelectorAll('#chips-local-duel-lead .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-lead')) === localDuelConfig.leadThreshold);
    });
    document.querySelectorAll('#chips-local-duel-duration .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-time')) === localDuelConfig.duration);
    });
    document.querySelectorAll('#chips-local-duel-gauge-style .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-gauge') === (localDuelConfig.gaugeStyle || 'tug'));
    });
}

function selectLocalDuelRule(rule) {
    localDuelConfig.mode = rule;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelLead(lead) {
    localDuelConfig.leadThreshold = lead;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelDuration(duration) {
    localDuelConfig.duration = duration;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelGaugeStyle(style) {
    localDuelConfig.gaugeStyle = style;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

async function startLocalDuelFromModal() {
    if (!localDuelConfig.selectedBooks || localDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    closeLocalDuelSettings();
    await startLocalDuel();
}

async function startLocalDuel() {
    if (!localDuelConfig.selectedBooks || localDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    resetAllGameAlertsAndFeedback();
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1 && localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1 && localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2 && localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2 && localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);

    let words = [];
    if (localDuelConfig.selectedBooks && localDuelConfig.selectedBooks.length > 0) {
        words = await BookManager.loadMultipleBooks(localDuelConfig.selectedBooks);
    }
    if (!words || words.length === 0) {
        showToast('所选词书没有词汇，请先检查词书');
        return;
    }

    const matchPool = generateShuffledPoolFromWords(words, 80);

    const p1Name = currentUser || '红方';
    const p2Name = localDuelConfig.opponentName || '蓝方';
    localDuelState = {
        active: true,
        matchPool: matchPool,
        mode: localDuelConfig.mode || 'lead',
        leadThreshold: localDuelConfig.leadThreshold || 6,
        duration: localDuelConfig.duration || 60,
        timeLeft: localDuelConfig.duration || 60,
        clockTimer: null,
        p1: { name: p1Name, score: 0, round: 0, pool: shuffle([...matchPool]), currentIdx: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false },
        p2: { name: p2Name, score: 0, round: 0, pool: shuffle([...matchPool]), currentIdx: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false }
    };

    localPhraseState = {
        p1: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' },
        p2: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' }
    };

    const f1 = document.getElementById('local-freeze-p1');
    if (f1) f1.style.display = 'none';
    const f2 = document.getElementById('local-freeze-p2');
    if (f2) f2.style.display = 'none';
    const info1 = document.getElementById('local-freeze-info-p1');
    if (info1) info1.style.display = 'none';
    const info2 = document.getElementById('local-freeze-info-p2');
    if (info2) info2.style.display = 'none';

    const gaugeStyle = localDuelConfig.gaugeStyle || 'tug';
    const tugEl = document.getElementById('local-duel-gauge-tug');
    const snakeEl = document.getElementById('local-duel-gauge-snake');
    if (gaugeStyle === 'snake') {
        if (tugEl) tugEl.style.display = 'none';
        if (snakeEl) snakeEl.style.display = 'flex';
    } else {
        if (tugEl) tugEl.style.display = 'flex';
        if (snakeEl) snakeEl.style.display = 'none';
    }

    generateLocalDuelQuestion('p1');
    generateLocalDuelQuestion('p2');
    updateLocalDuelGauge();

    if (localDuelState.mode === 'timed') {
        localDuelState.clockTimer = setInterval(() => {
            if (!localDuelState.active) return;
            localDuelState.timeLeft--;
            updateLocalDuelGauge();
            if (localDuelState.timeLeft <= 0) {
                clearInterval(localDuelState.clockTimer);
                let winner = 'draw';
                if (localDuelState.p1.score > localDuelState.p2.score) winner = 'p1';
                else if (localDuelState.p2.score > localDuelState.p1.score) winner = 'p2';
                endLocalDuel(winner, '时间到！比赛结束');
            }
        }, 1000);
    }

    switchView('view-local-duel');
}

function generateLocalDuelQuestion(player) {
    const pState = localDuelState[player];
    if (!pState || !pState.pool || pState.pool.length === 0) return;

    if (pState.currentIdx >= pState.pool.length) {
        pState.pool = shuffle([...localDuelState.matchPool]);
        pState.currentIdx = 0;
    }

    const q = pState.pool[pState.currentIdx++];
    pState.round = (pState.round || 0) + 1;

    if (q.phraseChips && q.phraseChips.length > 0) {
        const targetWords = extractPhraseTargetWords(q.word);
        const placed = new Array(targetWords.length).fill(null);
        targetWords.forEach((tw, idx) => {
            if (isFixedPhraseToken(tw)) {
                placed[idx] = `__fixed__${idx}`;
            }
        });
        pState.currentQ = {
            isPhrase: true,
            isShiCi: false,
            word: q.word,
            meaning: q.meaning,
            targetWords: targetWords,
            chips: q.phraseChips,
            bookName: q.bookName || '对决词库'
        };
        pState.answered = false;

        localPhraseState[player] = {
            targetWords: targetWords,
            placed: placed,
            chips: q.phraseChips,
            q: pState.currentQ,
            correctMeaning: q.meaning
        };
    } else if (q.isShiCi) {
        pState.currentQ = {
            isPhrase: false,
            isShiCi: true,
            word: q.word,
            phone: q.pinyin || q.phone || '',
            pinyin: q.pinyin || q.phone || '',
            sentence: q.sentence || '',
            highlightedSentence: q.highlightedSentence || '',
            source: q.source || '《古文》',
            sense: q.sense,
            example: q.example,
            meaning: q.meaning || '',
            options: q.options,
            correctIdx: q.correctIdx,
            bookName: q.bookName || '文言实词'
        };
        pState.answered = false;
    } else {
        pState.currentQ = {
            isPhrase: false,
            isShiCi: false,
            word: q.word,
            phone: q.phone || '',
            meaning: q.meaning || '',
            options: q.options,
            correctIdx: q.correctIdx,
            bookName: q.bookName || '对决词库'
        };
        pState.answered = false;
    }

    renderLocalDuelSide(player);
}

function renderLocalDuelSide(player) {
    const pState = localDuelState[player];
    if (!pState || !pState.currentQ) return;

    const q = pState.currentQ;
    const tagEl = document.getElementById(`local-player-tag-${player}`);
    const wordEl = document.getElementById(`local-word-${player}`);
    const phoneEl = document.getElementById(`local-phone-${player}`);
    const scoreEl = document.getElementById(`local-score-${player}`);
    const roundEl = document.getElementById(`local-round-${player}`);
    const bookEl = document.getElementById(`local-book-badge-${player}`);
    const optContainer = document.getElementById(`local-options-${player}`);
    const shiciBadgeEl = document.getElementById(`local-shici-badge-${player}`);
    const shiciBoxEl = document.getElementById(`local-shici-box-${player}`);
    const shiciSentenceEl = document.getElementById(`local-shici-sentence-${player}`);
    const shiciSourceEl = document.getElementById(`local-shici-source-${player}`);
    const shiciFreezeRevealEl = document.getElementById(`local-shici-freeze-reveal-${player}`);
    if (shiciFreezeRevealEl) shiciFreezeRevealEl.style.display = 'none';

    if (tagEl) {
        tagEl.innerText = player === 'p1' ? `🔴 ${pState.name || '红方'}` : `🔵 ${pState.name || '蓝方'}`;
    }
    if (roundEl) roundEl.innerText = `第 ${pState.round || 1} 题`;
    if (bookEl) {
        bookEl.innerText = q.bookName || '对决词库';
    }
    if (scoreEl) scoreEl.innerText = pState.score;

    if (q.isPhrase) {
        if (shiciBadgeEl) shiciBadgeEl.style.display = 'none';
        if (shiciBoxEl) shiciBoxEl.style.display = 'none';
        if (wordEl) {
            wordEl.style.display = 'flex';
            wordEl.innerText = q.meaning || '请拼出对应英文词组';
        }
        if (phoneEl) {
            phoneEl.innerText = '';
            phoneEl.style.display = 'none';
        }

        const phrState = localPhraseState[player];
        if (!optContainer || !phrState) return;

        optContainer.className = 'options-grid';
        optContainer.innerHTML = `
                <div class="phrase-container" style="margin:0 0 10px;">
                    <div class="phrase-slots-row" id="local-phrase-slots-${player}">
                        ${phrState.targetWords.map((tw, i) => {
            if (isFixedPhraseToken(tw)) {
                return `<div class="phrase-slot filled fixed" id="local-slot-${player}-${i}">${escapeHtml(tw)}</div>`;
            }
            return `
                            <div class="phrase-slot empty" 
                                 id="local-slot-${player}-${i}" 
                                 onpointerdown="handleLocalPhraseSlotPointerDown(event, '${player}', ${i})"></div>
                        `;
        }).join('')}
                    </div>
                    <div id="local-phrase-compare-${player}" class="phrase-comparison-card" style="display: none;"></div>
                    <div class="phrase-bank-card">
                        <div class="phrase-bank-header">
                            <span>备选词框：</span>
                            <button type="button" class="btn-clear-phrase" id="btn-clear-local-phrase-${player}" onpointerdown="clearLocalPhraseSlots(event, '${player}')">
                                清空已选
                            </button>
                        </div>
                        <div class="phrase-chips-grid" id="local-phrase-bank-${player}">
                            ${phrState.chips.map(c => `
                                <button type="button" class="phrase-word-chip" id="local-chip-${player}-${c.id}" onpointerdown="handleLocalPhraseChipPointerDown(event, '${player}', '${c.id}')">
                                    ${c.text}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
    } else if (q.isShiCi) {
        if (wordEl) wordEl.style.display = 'none';
        if (phoneEl) phoneEl.style.display = 'none';
        if (shiciBadgeEl) {
            shiciBadgeEl.style.display = 'inline-flex';
            shiciBadgeEl.innerText = `${q.word} ${q.pinyin || ''}`.trim();
        }
        if (shiciBoxEl) {
            shiciBoxEl.style.display = 'block';
            if (shiciSentenceEl) shiciSentenceEl.innerHTML = q.highlightedSentence || escapeHtml(q.sentence || q.word);
            if (shiciSourceEl) shiciSourceEl.innerText = `—— ${q.source || '《古文》'}`;
        }

        if (optContainer) {
            optContainer.className = 'shici-options-grid';
            const letters = ['A', 'B', 'C', 'D'];
            optContainer.innerHTML = q.options.map((opt, idx) => `
                    <button class="shici-opt-btn" 
                            id="local-opt-${player}-${idx}" 
                            data-idx="${idx}" 
                            onpointerdown="handleLocalPointerDown(event, '${player}', ${idx})">
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.rawMeaning || (opt.meaning || '').replace(/^\[.*?\]\s*/, ''))}</span>
                    </button>
                `).join('');
        }
    } else {
        if (shiciBadgeEl) shiciBadgeEl.style.display = 'none';
        if (shiciBoxEl) shiciBoxEl.style.display = 'none';
        if (wordEl) {
            wordEl.style.display = 'flex';
            wordEl.innerText = q.word;
        }
        if (phoneEl) {
            if (q.phone) {
                phoneEl.innerText = q.phone.startsWith('/') ? q.phone : `/${q.phone}/`;
                phoneEl.style.display = 'block';
            } else {
                phoneEl.style.display = 'none';
            }
        }

        if (optContainer) {
            optContainer.className = 'single-options-list';
            optContainer.innerHTML = q.options.map((opt, idx) => `
                    <button class="single-opt-btn" 
                            id="local-opt-${player}-${idx}" 
                            data-idx="${idx}" 
                            onpointerdown="handleLocalPointerDown(event, '${player}', ${idx})">
                        <span class="opt-trans">${escapeHtml(opt.meaning || opt.word)}</span>
                    </button>
                `).join('');
        }
    }
}

function clearLocalPhraseSlots(e, player) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    phrState.placed.forEach((chipId, idx) => {
        if (chipId && !String(chipId).startsWith('__fixed__')) {
            const slotEl = document.getElementById(`local-slot-${player}-${idx}`);
            if (slotEl) {
                slotEl.classList.remove('filled', 'correct', 'wrong');
                slotEl.classList.add('empty');
                slotEl.innerText = '';
            }
            const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
            if (chipEl) {
                chipEl.classList.remove('used');
                chipEl.disabled = false;
            }
            phrState.placed[idx] = null;
        }
    });
    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';
}

function handleLocalPhraseChipPointerDown(e, player, chipId) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const emptyIdx = phrState.placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    const chip = phrState.chips.find(c => c.id === chipId);
    if (!chip) return;

    phrState.placed[emptyIdx] = chipId;

    const slotEl = document.getElementById(`local-slot-${player}-${emptyIdx}`);
    if (slotEl) {
        slotEl.classList.remove('empty', 'correct', 'wrong');
        slotEl.classList.add('filled');
        slotEl.innerText = chip.text;
    }

    const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
    if (chipEl) chipEl.classList.add('used');

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';

    if (!phrState.placed.includes(null)) {
        checkLocalPhraseAnswer(player);
    }
}

function handleLocalPhraseSlotPointerDown(e, player, slotIdx) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const chipId = phrState.placed[slotIdx];
    if (!chipId || String(chipId).startsWith('__fixed__')) return;

    phrState.placed[slotIdx] = null;

    const slotEl = document.getElementById(`local-slot-${player}-${slotIdx}`);
    if (slotEl) {
        slotEl.classList.remove('filled', 'correct', 'wrong');
        slotEl.classList.add('empty');
        slotEl.innerText = '';
    }

    const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
    if (chipEl) chipEl.classList.remove('used');

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';
}

function checkLocalPhraseAnswer(player) {
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const placedWords = phrState.placed.map((cid, i) => {
        if (String(cid).startsWith('__fixed__')) {
            return phrState.targetWords[i].toLowerCase();
        }
        const c = phrState.chips.find(item => item.id === cid);
        return c ? c.text.toLowerCase() : '';
    });
    const targetWordsLower = phrState.targetWords.map(w => w.toLowerCase());
    const isRight = (placedWords.join(' ') === targetWordsLower.join(' '));

    if (isRight) {
        pState.answered = true;
        pState.score++;

        phrState.placed.forEach((cid, i) => {
            const slotEl = document.getElementById(`local-slot-${player}-${i}`);
            if (slotEl && !String(cid).startsWith('__fixed__')) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            }
        });

        const comp = document.getElementById(`local-phrase-compare-${player}`);
        if (comp) comp.style.display = 'none';
        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = true;

        const scoreEl = document.getElementById(`local-score-${player}`);
        if (scoreEl) scoreEl.innerText = pState.score;

        spawnParticles(
            player === 'p1' ? window.innerWidth * 0.25 : window.innerWidth * 0.75,
            window.innerHeight * 0.5,
            player === 'p1' ? '#B3261E' : '#006874'
        );

        updateLocalDuelGauge();
        if (checkLocalDuelWinCondition()) return;

        setTimeout(() => {
            if (!localDuelState.active) return;
            generateLocalDuelQuestion(player);
        }, 300);
    } else {
        const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
        recordUserMistake(pName, phrState.targetWords.join(' '), phrState.correctMeaning || phrState.q?.meaning, '');

        phrState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`local-slot-${player}-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            const chipId = phrState.placed[i];
            const chip = chipId ? phrState.chips.find(c => c.id === chipId) : null;
            const userWord = chip ? chip.text : '';
            const isSlotRight = (userWord.toLowerCase() === tw.toLowerCase());
            if (isSlotRight) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            } else {
                slotEl.classList.remove('correct');
                slotEl.classList.add('wrong');
            }
        });

        const comp = document.getElementById(`local-phrase-compare-${player}`);
        if (comp) {
            comp.className = 'phrase-comparison-card wrong-state';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                        <div class="phrase-compare-row">
                            <span class="phrase-compare-badge wrong">✕ 搭配有误</span>
                            <span id="local-penalty-tip-${player}" style="font-size:0.85rem; color:var(--md-sys-color-error); font-weight:600;">冷却 <strong id="local-phrase-cooldown-${player}">3</strong> 秒后可重试</span>
                        </div>
                        <button type="button" class="btn-reveal-ten-sec" id="btn-local-reveal-${player}" onpointerdown="handleLocalRevealPhrase(event, '${player}')">
                            跳过本题，惩罚 10 秒
                        </button>
                    </div>
                `;
        }

        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = true;

        triggerLocalPhrasePenalty(player);
    }
}

function triggerLocalPhrasePenalty(player) {
    const pState = localDuelState[player];
    if (!pState) return;

    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    if (freezeInfo) freezeInfo.style.display = 'none';

    pState.frozenUntil = Date.now() + 3000;
    let sec = 3;

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    pState.freezeTick = setInterval(() => {
        sec--;
        const tipNum = document.getElementById(`local-phrase-cooldown-${player}`);
        if (tipNum) tipNum.innerText = Math.max(0, sec);
        if (sec <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 1000);

    pState.freezeTimer = setTimeout(() => {
        pState.frozenUntil = 0;
        const tipEl = document.getElementById(`local-penalty-tip-${player}`);
        if (tipEl) {
            tipEl.innerText = '可点击槽位撤回并重新选择';
            tipEl.style.color = 'var(--md-sys-color-primary)';
        }
        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = false;
    }, 3000);
}

function handleLocalRevealPhrase(e, player) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState) return;

    const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
    recordUserMistake(pName, phrState.targetWords.join(' '), phrState.correctMeaning || phrState.q?.meaning, '');

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    phrState.targetWords.forEach((tw, i) => {
        const slotEl = document.getElementById(`local-slot-${player}-${i}`);
        if (slotEl && !isFixedPhraseToken(tw)) {
            slotEl.classList.remove('empty', 'wrong');
            slotEl.classList.add('filled', 'correct');
            slotEl.innerText = tw;
        }
    });

    const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
    if (clearBtn) clearBtn.disabled = true;
    phrState.chips.forEach(c => {
        const chipEl = document.getElementById(`local-chip-${player}-${c.id}`);
        if (chipEl) {
            chipEl.classList.add('used');
            chipEl.disabled = true;
        }
    });

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) {
        comp.className = 'phrase-comparison-card';
        comp.style.display = 'block';
        comp.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <div class="phrase-compare-row">
                        <span class="phrase-compare-badge correct">✓ 正确词组</span>
                        <span class="phrase-compare-text correct" style="font-size:1.1rem;">${phrState.targetWords.join(' ')}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--md-sys-color-error); font-weight:700;">
                        跳过本题，惩罚 10 秒
                    </div>
                </div>
            `;
    }

    pState.frozenUntil = Date.now() + 10000;
    pState.answered = true;

    const overlay = document.getElementById(`local-freeze-${player}`);
    const numEl = document.getElementById(`local-freeze-num-${player}`);
    const barInner = document.getElementById(`local-freeze-bar-${player}`);
    const freezeTitle = overlay ? overlay.querySelector('.local-freeze-title') : null;
    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    const freezePhrase = document.getElementById(`local-freeze-phrase-${player}`);
    const freezeMeaning = document.getElementById(`local-freeze-meaning-${player}`);

    if (freezeTitle) freezeTitle.innerText = "跳过本题，惩罚 10 秒";
    if (freezePhrase) freezePhrase.innerText = phrState.targetWords.join(' ');
    if (freezeMeaning) freezeMeaning.innerText = phrState.correctMeaning || phrState.q?.meaning || '';
    if (freezeInfo) freezeInfo.style.display = 'flex';
    if (overlay) overlay.style.display = 'flex';
    if (numEl) numEl.innerText = '10';
    if (barInner) barInner.style.width = '100%';

    const startTime = Date.now();
    pState.freezeTick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainMs = Math.max(0, 10000 - elapsed);
        const remainSec = Math.ceil(remainMs / 1000);

        if (numEl) numEl.innerText = remainSec;
        if (barInner) barInner.style.width = `${(remainMs / 10000) * 100}%`;

        if (remainMs <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 100);

    pState.freezeTimer = setTimeout(() => {
        if (overlay) {
            overlay.style.display = 'none';
            if (freezeTitle) freezeTitle.innerText = "答错惩罚";
        }
        if (freezeInfo) freezeInfo.style.display = 'none';
        pState.frozenUntil = 0;
        pState.answered = false;

        if (localDuelState.active) {
            generateLocalDuelQuestion(player);
        }
    }, 10000);
}

function handleLocalPointerDown(e, player, optIdx) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    handleLocalDuelAnswer(player, optIdx);
}

function handleLocalDuelAnswer(player, optIdx) {
    if (!localDuelState.active) return;
    const pState = localDuelState[player];
    if (!pState || !pState.currentQ) return;

    if (Date.now() < pState.frozenUntil) return;
    if (pState.answered) return;

    const q = pState.currentQ;
    const optContainer = document.getElementById(`local-options-${player}`);
    const card = optContainer ? optContainer.querySelector(`[data-idx="${optIdx}"]`) : null;

    if (optIdx === q.correctIdx) {
        pState.answered = true;
        pState.score++;
        if (card) card.classList.add('correct');
        const scoreEl = document.getElementById(`local-score-${player}`);
        if (scoreEl) scoreEl.innerText = pState.score;

        spawnParticles(
            player === 'p1' ? window.innerWidth * 0.25 : window.innerWidth * 0.75,
            window.innerHeight * 0.5,
            player === 'p1' ? '#B3261E' : '#006874'
        );

        updateLocalDuelGauge();
        if (checkLocalDuelWinCondition()) return;

        setTimeout(() => {
            if (!localDuelState.active) return;
            generateLocalDuelQuestion(player);
        }, 180);
    } else {
        if (card) card.classList.add('wrong');
        const correctCard = optContainer ? optContainer.querySelector(`[data-idx="${q.correctIdx}"]`) : null;
        if (correctCard) correctCard.classList.add('correct');
        const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
        if (q.isShiCi) {
            const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : (q.options[q.correctIdx]?.rawMeaning || q.options[q.correctIdx]?.meaning || q.meaning);
            recordShiCiUserMistake(pName, {
                word: q.word,
                meaning: fullMeaning,
                pinyin: q.pinyin || q.phone || '',
                sentence: q.sentence || q.example?.sentence || '',
                highlightedSentence: q.highlightedSentence || '',
                source: q.source || q.example?.source || '',
                pos: q.sense?.part_of_speech || q.pos || q.options[q.correctIdx]?.pos || '',
                isShiCi: true
            });
        } else {
            recordUserMistake(pName, q.word, q.options[q.correctIdx]?.meaning || q.meaning, q.phone);
        }
        triggerLocalPenalty(player);
    }
}

function triggerLocalPenalty(player) {
    const pState = localDuelState[player];
    if (!pState) return;

    pState.frozenUntil = Date.now() + 3000;
    const overlay = document.getElementById(`local-freeze-${player}`);
    const numEl = document.getElementById(`local-freeze-num-${player}`);
    const barInner = document.getElementById(`local-freeze-bar-${player}`);
    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    const freezeTitle = overlay ? overlay.querySelector('.local-freeze-title') : null;
    const shiciFreezeRevealEl = document.getElementById(`local-shici-freeze-reveal-${player}`);
    const shiciSenseEl = document.getElementById(`local-shici-freeze-sense-${player}`);
    const shiciAnnotEl = document.getElementById(`local-shici-freeze-annot-${player}`);

    const q = pState.currentQ;
    const isShiCi = Boolean(q && q.isShiCi);

    if (freezeTitle) freezeTitle.innerText = "答错惩罚";
    if (freezeInfo) freezeInfo.style.display = 'none';

    if (isShiCi && shiciFreezeRevealEl) {
        if (shiciSenseEl) {
            const posStr = (q.sense?.part_of_speech || q.pos || q.options?.[q.correctIdx]?.pos) ? `[${q.sense?.part_of_speech || q.pos || q.options?.[q.correctIdx]?.pos}] ` : '';
            const meaningStr = (q.sense?.meaning || q.options?.[q.correctIdx]?.rawMeaning || q.options?.[q.correctIdx]?.meaning || q.meaning || '').replace(/★/g, '');
            shiciSenseEl.innerText = `${posStr}${meaningStr}`;
        }
        if (shiciAnnotEl) {
            const annotStr = q.example?.annotation || (q.sentence ? `在“${q.sentence}”中作相应释义` : '');
            shiciAnnotEl.innerText = annotStr || '请注意该实词在语境中的释义与用法';
        }
        shiciFreezeRevealEl.style.display = 'block';
    } else if (shiciFreezeRevealEl) {
        shiciFreezeRevealEl.style.display = 'none';
    }

    if (overlay) overlay.style.display = 'flex';
    if (numEl) numEl.innerText = '3';
    if (barInner) barInner.style.width = '100%';

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    const startTime = Date.now();
    pState.freezeTick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainMs = Math.max(0, 3000 - elapsed);
        const remainSec = Math.ceil(remainMs / 1000);
        if (numEl) numEl.innerText = remainSec;
        if (barInner) barInner.style.width = `${(remainMs / 3000) * 100}%`;
        if (remainMs <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 50);

    pState.freezeTimer = setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        if (freezeInfo) freezeInfo.style.display = 'none';
        if (shiciFreezeRevealEl) shiciFreezeRevealEl.style.display = 'none';
        pState.frozenUntil = 0;
        if (localDuelState.active) {
            generateLocalDuelQuestion(player);
        }
    }, 3000);
}

function updateLocalDuelGauge() {
    const p1Score = localDuelState.p1.score;
    const p2Score = localDuelState.p2.score;

    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    const p1Label = document.getElementById('local-duel-p1-lead-label');
    const p2Label = document.getElementById('local-duel-p2-lead-label');
    const ruleBadge = document.getElementById('local-duel-rule-badge');
    const statusSub = document.getElementById('local-duel-status-sub');
    const tugP1 = document.getElementById('local-tug-p1');
    const tugP2 = document.getElementById('local-tug-p2');
    const tugPin = document.getElementById('local-tug-pin');

    if (p1Label) p1Label.innerText = `🔴 ${p1Name} ${p1Score}`;
    if (p2Label) p2Label.innerText = `${p2Name} ${p2Score} 🔵`;

    if (localDuelState.mode === 'timed') {
        if (ruleBadge) ruleBadge.innerText = `剩余时间: ${localDuelState.timeLeft}s`;
    } else {
        if (ruleBadge) ruleBadge.innerText = `领先 ${localDuelState.leadThreshold} 题胜出`;
    }

    let ratio = 50;
    if (localDuelState.mode === 'lead') {
        const diff = p1Score - p2Score;
        const maxDiff = localDuelState.leadThreshold;
        ratio = 50 + (diff / maxDiff) * 50;
        ratio = Math.max(0, Math.min(100, ratio));

        if (statusSub) {
            if (diff > 0) statusSub.innerText = `${p1Name} 领先 ${diff} 题！(还需 ${maxDiff - diff} 题胜出)`;
            else if (diff < 0) statusSub.innerText = `${p2Name} 领先 ${Math.abs(diff)} 题！(还需 ${maxDiff - Math.abs(diff)} 题胜出)`;
            else statusSub.innerText = '双方平分秋色，胜负未分！';
        }
    } else {
        const total = p1Score + p2Score;
        ratio = total > 0 ? (p1Score / total) * 100 : 50;
        if (statusSub) {
            const diff = p1Score - p2Score;
            if (diff > 0) statusSub.innerText = `${p1Name} 领先 ${diff} 分`;
            else if (diff < 0) statusSub.innerText = `${p2Name} 领先 ${Math.abs(diff)} 分`;
            else statusSub.innerText = '比分持平';
        }
    }

    if (tugP1) tugP1.style.width = `${ratio}%`;
    if (tugP2) tugP2.style.width = `${100 - ratio}%`;
    if (tugPin) tugPin.style.left = `calc(${ratio}% - 3px)`;

    const cvs = document.getElementById('localSnakeCanvas');
    if (cvs) {
        let centerText = '';
        if (localDuelState.mode === 'timed') {
            let m = Math.floor(localDuelState.timeLeft / 60), s = localDuelState.timeLeft % 60;
            centerText = `${m}:${s.toString().padStart(2, '0')}`;
        } else {
            const diff = p1Score - p2Score;
            if (diff > 0) centerText = `+${diff}🔴`;
            else if (diff < 0) centerText = `🔵+${Math.abs(diff)}`;
            else centerText = `平`;
        }
        drawDualEnergyRing(cvs, p1Score, p2Score, localDuelState.leadThreshold || 6, true, centerText);
    }
    const snakeRule = document.getElementById('local-snake-rule-summary');
    if (snakeRule) {
        if (localDuelState.mode === 'timed') {
            snakeRule.innerText = `剩余时间: ${localDuelState.timeLeft}s`;
        } else {
            snakeRule.innerText = `领先 ${localDuelState.leadThreshold} 题胜出`;
        }
    }
}

function checkLocalDuelWinCondition() {
    if (!localDuelState.active) return false;
    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    if (localDuelState.mode === 'lead') {
        const diff = localDuelState.p1.score - localDuelState.p2.score;
        if (diff >= localDuelState.leadThreshold) {
            endLocalDuel('p1', `🎉 ${p1Name} 领先达到 ${localDuelState.leadThreshold} 题，拔河获胜！`);
            return true;
        } else if (-diff >= localDuelState.leadThreshold) {
            endLocalDuel('p2', `🎉 ${p2Name} 领先达到 ${localDuelState.leadThreshold} 题，拔河获胜！`);
            return true;
        }
    }
    return false;
}

function endLocalDuel(winner, detailText) {
    localDuelState.active = false;
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);

    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    let title = '对决结束';
    let icon = '🏆';
    if (winner === 'p1') {
        title = `🔴 ${p1Name} 获胜！`;
        spawnParticles(window.innerWidth * 0.25, window.innerHeight * 0.5, '#B3261E');
    } else if (winner === 'p2') {
        title = `🔵 ${p2Name} 获胜！`;
        spawnParticles(window.innerWidth * 0.75, window.innerHeight * 0.5, '#006874');
    } else {
        title = '🤝 握手言和，双方平局！';
        icon = '⚖️';
    }

    const p1Final = localDuelState.p1 ? localDuelState.p1.score : 0;
    const p2Final = localDuelState.p2 ? localDuelState.p2.score : 0;

    document.getElementById('result-icon').innerText = icon;
    document.getElementById('result-message').innerText = title;
    document.getElementById('result-details').innerHTML = `
            <p style="font-size:1.15rem; font-weight:700; margin:10px 0;">${detailText || ''}</p>
            <div style="display:flex; justify-content:center; gap:24px; font-size:1.25rem; font-weight:800; margin:16px 0;">
                <span style="color:var(--p1-sys-color);">🔴 ${p1Name}: ${p1Final} 题</span>
                <span style="color:var(--md-sys-color-outline);">VS</span>
                <span style="color:var(--p2-sys-color);">🔵 ${p2Name}: ${p2Final} 题</span>
            </div>
        `;

    const btnBack = document.getElementById('btn-back-room');
    if (btnBack) {
        btnBack.innerHTML = `
                <span class="material-symbols-rounded" style="font-size:20px;">replay</span>
                <span class="btn-label-text">再战一局</span>
            `;
        btnBack.onclick = () => { startLocalDuel(); };
    }

    switchView('view-result');
}

function restartLocalDuel() {
    if (confirm('确认重新开始本局对决吗？比分将清零。')) {
        startLocalDuel();
    }
}

function confirmExitLocalDuel() {
    localDuelState.active = false;
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);
    switchView('view-hub');
}
