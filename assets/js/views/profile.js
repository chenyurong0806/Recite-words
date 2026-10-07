/**
 * 个人中心 (我)、熟词本、回收站与自建词书
 * Module: assets/js/views/profile.js
 */

/* ==========================================================================
   熟词本（Mastered Words）与本地词书回收站（Trash Bin）系统
   ========================================================================== */
function getMasteredWords() {
    if (!currentUser) return [];
    try {
        const raw = localStorage.getItem(`vocab_mastered_words_${currentUser}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveMasteredWords(words) {
    if (!currentUser) return;
    localStorage.setItem(`vocab_mastered_words_${currentUser}`, JSON.stringify(words));
}

function isWordMastered(word) {
    if (!word) return false;
    const clean = word.trim().toLowerCase();
    const list = getMasteredWords();
    return list.some(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
}

function toggleMasteredWord(word, phone = '', meaning = '') {
    if (!currentUser || !word) return false;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);

    let nowMastered = false;
    if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        nowMastered = false;
        showToast(`已取消“${word}”的熟词标记`);
    } else {
        list.push({
            word: word.trim(),
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        nowMastered = true;
        showToast(`已将“${word}”标为熟词`);
    }
    saveMasteredWords(list);
    return nowMastered;
}

function ensureWordMastered(word, phone = '', meaning = '') {
    if (!currentUser || !word) return;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
    if (existingIdx < 0) {
        list.push({
            word: word.trim(),
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        saveMasteredWords(list);
    }
}

function removeWordMastered(word) {
    if (!currentUser || !word) return;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
    if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        saveMasteredWords(list);
    }
}

function toggleCurrentWordMastered() {
    if (!singleState || !singleState.pool || singleState.currentIdx >= singleState.pool.length) return;
    // 只有在答完题后才能标注熟词
    if (!singleState.answered) {
        if (typeof showToast === 'function') showToast('请先作答，答题后方可标注熟词');
        return;
    }
    const q = singleState.pool[singleState.currentIdx];
    if (!q || !q.word) return;
    const nowMastered = toggleMasteredWord(q.word, q.phone, q.meaning);
    updateSingleCardToolbar(q);
    if (nowMastered) {
        // 标注熟词后播放加星动画，不立刻跳到下一题
        renderCardMasteryDiamonds(q.word, 'gain');

        // 标为熟词后，在本组学习中也不要再抽取：过滤后续待学 pool 中该词的所有项（含错题即时复测题）
        const targetClean = (q.word || '').trim().toLowerCase();
        const currentIdx = singleState.currentIdx;
        const prevItems = singleState.pool.slice(0, currentIdx + 1);
        const remainingItems = singleState.pool.slice(currentIdx + 1).filter(item => (item.word || '').trim().toLowerCase() !== targetClean);
        singleState.pool = prevItems.concat(remainingItems);

        if (!singleState.completedWords) singleState.completedWords = new Set();
        singleState.completedWords.add(targetClean);

        updateSingleProgressDisplay();
        saveSingleProgress();
        if (typeof showToast === 'function') {
            showToast(`已标为熟词，本组学习将不再抽取“${q.word}”`);
        }
    } else {
        // 取消标注熟词：播放减星动画，回到刚才的星数
        renderCardMasteryDiamonds(q.word, 'loss');
    }
}

function confirmClearAllMasteredWords() {
    const list = getMasteredWords();
    if (list.length === 0) {
        showToast('熟词本为空');
        return;
    }
    if (!confirm("确定要清空全部熟词标记吗？")) return;
    saveMasteredWords([]);
    showToast('已清空全部熟词标记');
    renderMasteredWordsInSettings();
    if (gameMode === 'single' && singleState && singleState.pool) {
        const q = singleState.pool[singleState.currentIdx];
        if (q) updateSingleCardToolbar(q);
    }
}

function getTrashWords() {
    try {
        return JSON.parse(localStorage.getItem('vocab_trash_words') || '[]');
    } catch (e) {
        return [];
    }
}

function saveTrashWords(list) {
    try {
        localStorage.setItem('vocab_trash_words', JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save trash words', e);
    }
}

async function deleteWordFromCustomBook(word, bookId, showToastAlert = true) {
    if (!word || !bookId) return false;
    let book = (window.customBooks || []).find(b => b.id === bookId);
    if (!book) return false;

    const originalWords = book.words || [];
    const targetWordObj = originalWords.find(w => (w.word || '').toLowerCase() === word.toLowerCase());
    if (!targetWordObj) return false;

    const trashList = getTrashWords();
    trashList.unshift({
        id: 'trash_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        word: targetWordObj.word,
        phone: targetWordObj.phone || '',
        meaning: targetWordObj.meanings ? targetWordObj.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；') : (targetWordObj.meaning || ''),
        meanings: targetWordObj.meanings || null,
        originalBookId: book.id,
        originalBookName: book.rawName || book.name,
        deletedAt: Date.now()
    });
    saveTrashWords(trashList);

    book.words = originalWords.filter(w => (w.word || '').toLowerCase() !== word.toLowerCase());
    book.count = book.words.length;
    await BookManager.saveCustomBook(book);

    if (showToastAlert) showToast(`已将“${word}”从词书移入回收站`);
    return true;
}

async function deleteCurrentSingleWord() {
    if (!singleState || !singleState.pool || singleState.currentIdx >= singleState.pool.length) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || !q.word) return;

    if (!confirm(`确定要将单词“${q.word}”移出该词书吗？`)) return;

    const ok = await deleteWordFromCustomBook(q.word, q.bookId);
    if (ok) {
        nextSingleQuestion(true);
    } else {
        showToast('移入回收站失败：未在本地词书中找到该词条');
    }
}

async function restoreTrashWord(trashId) {
    const trash = getTrashWords();
    const itemIdx = trash.findIndex(t => t.id === trashId);
    if (itemIdx < 0) return;
    const item = trash[itemIdx];

    let targetBook = (window.customBooks || []).find(b => b.id === item.originalBookId);
    if (!targetBook) {
        if (!window.customBooks || window.customBooks.length === 0) {
            alert('原词书已不存在，且当前无其他本地词书可供恢复。请先在词书管理中创建或导入本地词书。');
            return;
        }
        targetBook = window.customBooks[0];
    }

    if (!Array.isArray(targetBook.words)) targetBook.words = [];
    if (!targetBook.words.some(w => (w.word || '').toLowerCase() === item.word.toLowerCase())) {
        targetBook.words.push({
            word: item.word,
            phone: item.phone || '',
            meanings: item.meanings && item.meanings.length > 0 ? item.meanings : [{ pos: '', meaning: item.meaning || '' }],
            bookName: targetBook.rawName || targetBook.name,
            bookId: targetBook.id
        });
        targetBook.count = targetBook.words.length;
        await VocabOfflineDB.saveBook(targetBook);
        BookManager.bookCache[targetBook.id] = targetBook.words;
    }

    trash.splice(itemIdx, 1);
    saveTrashWords(trash);
    showToast(`已将 “${item.word}” 恢复至 “${targetBook.rawName || targetBook.name}”`);
    renderTrashWordsInSettings();
    renderManageLocalBooksInSettings();
}

async function moveTrashWordToAnotherBook(trashId, targetBookId) {
    const trash = getTrashWords();
    const itemIdx = trash.findIndex(t => t.id === trashId);
    if (itemIdx < 0) return;
    const item = trash[itemIdx];

    const targetBook = (window.customBooks || []).find(b => b.id === targetBookId);
    if (!targetBook) {
        alert('目标词书不存在');
        return;
    }

    if (!Array.isArray(targetBook.words)) targetBook.words = [];
    if (!targetBook.words.some(w => (w.word || '').toLowerCase() === item.word.toLowerCase())) {
        targetBook.words.push({
            word: item.word,
            phone: item.phone || '',
            meanings: item.meanings && item.meanings.length > 0 ? item.meanings : [{ pos: '', meaning: item.meaning || '' }],
            bookName: targetBook.rawName || targetBook.name,
            bookId: targetBook.id
        });
        targetBook.count = targetBook.words.length;
        await VocabOfflineDB.saveBook(targetBook);
        BookManager.bookCache[targetBook.id] = targetBook.words;
    }

    trash.splice(itemIdx, 1);
    saveTrashWords(trash);
    showToast(`已将“${item.word}”移动至“${targetBook.rawName || targetBook.name}”！`);
    renderTrashWordsInSettings();
    renderManageLocalBooksInSettings();
}

function permanentlyDeleteTrashWord(trashId) {
    let trash = getTrashWords();
    const item = trash.find(t => t.id === trashId);
    if (!item) return;
    if (!confirm(`确定要彻底删除“${item.word}”吗？此操作无法撤销。`)) return;
    trash = trash.filter(t => t.id !== trashId);
    saveTrashWords(trash);
    showToast(`已彻底删除“${item.word}”`);
    renderTrashWordsInSettings();
}

function confirmClearAllTrashWords() {
    const trash = getTrashWords();
    if (trash.length === 0) {
        showToast('回收站为空');
        return;
    }
    if (!confirm(`确定要永久删除所有回收站中的单词吗？此操作无法撤销。`)) return;
    saveTrashWords([]);
    showToast(`已彻底删除${trash.length}个单词`);
    renderTrashWordsInSettings();
}

function updateSingleCardToolbar(q) {
    if (!q) return;
    const isMastered = isWordMastered(q.word);
    const masterBtn = document.getElementById('btn-card-master');
    if (masterBtn) {
        masterBtn.classList.toggle('active', isMastered);
        if (singleState && singleState.answered) {
            masterBtn.disabled = false;
            masterBtn.style.opacity = '1';
            masterBtn.style.cursor = 'pointer';
            masterBtn.title = isMastered ? '已标注熟词（点击取消）' : '标注熟词（不再抽取）';
        } else {
            masterBtn.disabled = true;
            masterBtn.style.opacity = '0.35';
            masterBtn.style.cursor = 'not-allowed';
            masterBtn.title = '答题后方可标注熟词';
        }
        masterBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size:18px;">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>`;
    }

    const deleteBtn = document.getElementById('btn-card-delete');
    if (deleteBtn) {
        const isCustomBook = (q.bookId && String(q.bookId).startsWith('custom_')) ||
            (window.customBooks || []).some(cb => cb.id === q.bookId);

        if (isCustomBook) {
            deleteBtn.disabled = false;
            deleteBtn.title = "从当前本地词书删除并移入回收站";
            deleteBtn.style.cursor = "pointer";
        } else {
            deleteBtn.disabled = true;
            deleteBtn.title = "云端预置词书不支持删除词汇";
            deleteBtn.style.cursor = "not-allowed";
        }
        deleteBtn.style.display = 'inline-flex';
    }

    // 控制发音按钮：回答前禁用，回答后启用
    const audioBtn = document.getElementById('btn-card-audio');
    if (audioBtn) {
        audioBtn.style.display = 'inline-flex';
        if (singleState.answered) {
            audioBtn.disabled = false;
            audioBtn.style.opacity = '1';
            audioBtn.style.cursor = 'pointer';
            audioBtn.title = '朗读发音';
        } else {
            audioBtn.disabled = true;
            audioBtn.style.opacity = '0.35';
            audioBtn.style.cursor = 'not-allowed';
            audioBtn.title = '回答后方可播放发音';
        }
    }

    // 控制跳转搜索按钮：回答前禁用，回答后启用
    const searchBtn = document.getElementById('btn-card-search');
    if (searchBtn) {
        searchBtn.style.display = 'inline-flex';
        if (singleState.answered) {
            searchBtn.disabled = false;
            searchBtn.style.opacity = '1';
            searchBtn.style.cursor = 'pointer';
            searchBtn.title = '查询详细释义与例句';
        } else {
            searchBtn.disabled = true;
            searchBtn.style.opacity = '0.35';
            searchBtn.style.cursor = 'not-allowed';
            searchBtn.title = '回答后方可查询释义';
        }
    }
}

function toggleCardToolbarCollapse(event) {
    if (event) event.stopPropagation();
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (cluster) {
        cluster.classList.toggle('expanded');
    }
}

function checkCardToolbarOverflow() {
    const header = document.querySelector('.single-top-header-row');
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (!header || !cluster) return;
    if (header.scrollWidth > header.clientWidth) {
        cluster.classList.add('collapsed-overflow');
    } else if (window.innerWidth > 520) {
        cluster.classList.remove('collapsed-overflow');
    }
}

window.addEventListener('resize', checkCardToolbarOverflow);
document.addEventListener('pointerdown', (e) => {
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (cluster && cluster.classList.contains('expanded') && !cluster.contains(e.target)) {
        cluster.classList.remove('expanded');
    }
});

let singlePhraseTimer = null;
let singlePhraseState = {
    targetWords: [],
    placed: [],
    chips: [],
    q: null
};

function updateSingleProgressDisplay() {
    if (!singleState || !singleState.pool) return;
    const progEl = document.getElementById('single-progress-text');
    const progFillEl = document.getElementById('single-progress-fill');

    const isImmediateRetest = (typeof singleConfig !== 'undefined' && singleConfig.immediateRetest !== false);
    const targetTotal = singleState.targetTotal || new Set(singleState.pool.filter(q => !q._isRetest).map(q => (q.word || '').trim().toLowerCase())).size || singleState.pool.length;

    let currentProgress = 0;
    if (isImmediateRetest) {
        // 开启即时复习时：当前进度按完整完成该词学习的单词数计算，答错题不增加进度和总题数
        currentProgress = singleState.completedWords ? singleState.completedWords.size : 0;
    } else {
        currentProgress = Math.min(singleState.currentIdx + 1, targetTotal);
    }

    if (progEl) {
        progEl.innerText = `${currentProgress} / ${targetTotal}`;
    }
    if (progFillEl) {
        const pct = Math.min(100, Math.max(0, Math.round((currentProgress / targetTotal) * 100)));
        progFillEl.style.width = `${pct}%`;
    }
}
window.updateSingleProgressDisplay = updateSingleProgressDisplay;

function renderSingleQuestion() {
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    if (singleState.currentIdx >= singleState.pool.length) {
        endSingleGame();
        return;
    }

    const q = singleState.pool[singleState.currentIdx];
    singleState.answered = false;
    singleState.selectedIdx = -1;

    const isPhrase = !!(q.word && q.word.trim().includes(' '));

    if (singleConfig.autoPlayAudio && navigator.onLine && q && q.word && !isPhrase) {
        playWordAudio(q.word);
    }

    const audioBtn = document.getElementById('btn-single-audio');
    if (audioBtn) audioBtn.style.display = 'none';

    const badge = document.getElementById('single-book-badge');
    if (badge) badge.innerText = q.bookName || (singleState.sessionName || '单人练习');
    if (typeof updateReviewPageActiveBookLabel === 'function') {
        updateReviewPageActiveBookLabel();
    }

    updateSingleProgressDisplay();

    const retestTag = document.getElementById('single-retest-tag');
    if (retestTag) {
        retestTag.style.display = q._isRetest ? 'inline-flex' : 'none';
    }

    updateSingleCardToolbar(q);
    renderCardMasteryDiamonds(q.word);
    setTimeout(checkCardToolbarOverflow, 0);

    const wordEl = document.getElementById('single-word');
    const phoneEl = document.getElementById('single-phone');

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.style.display = 'flex';
        nextBtn.className = 'single-next-btn show-answer-mode';
        nextBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px;">skip_next</span><span class="btn-label-text">看答案</span>';
    }

    if (isPhrase) {
        renderSinglePhraseQuestion(q);
        return;
    }

    if (wordEl) {
        wordEl.style.display = 'block';
        wordEl.innerText = q.word;
        wordEl.style.color = '#111827';
    }
    if (phoneEl) {
        phoneEl.style.display = 'block';
        phoneEl.innerText = q.phone || '';
    }

    const optionsContainer = document.getElementById('single-options');
    if (!optionsContainer) return;

    let html = '';
    q.options.forEach((opt, idx) => {
        html += `
                <button class="single-opt-btn" id="single-opt-${idx}" onclick="handleSingleAnswer(${idx})">
                    <span class="opt-trans">${opt.meaning}</span>
                </button>
            `;
    });
    optionsContainer.innerHTML = html;
}

function renderSinglePhraseQuestion(q) {
    const targetWords = extractPhraseTargetWords(q.word);
    const placed = targetWords.map((w, idx) => isFixedPhraseToken(w) ? `__fixed__${idx}` : null);

    singlePhraseState = {
        targetWords: targetWords,
        placed: placed,
        chips: (q.phraseChips && q.phraseChips.length > 0)
            ? q.phraseChips.filter(c => !isFixedPhraseToken(c.text))
            : generatePhraseDistractors(targetWords, singleState.pool, q),
        q: q
    };

    updateSingleCardToolbar(q);

    // 【核心修复】：未作答前严禁提前剧透英文，必须隐藏！
    const wordEl = document.getElementById('single-word');
    const phoneEl = document.getElementById('single-phone');
    if (wordEl) {
        wordEl.style.display = 'none';
        wordEl.innerText = '';
    }
    if (phoneEl) {
        phoneEl.style.display = 'none';
        phoneEl.innerText = '';
    }

    const optionsContainer = document.getElementById('single-options');
    if (!optionsContainer) return;

    const correctMeaning = q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : '');

    optionsContainer.innerHTML = `
            <div class="phrase-container">
                <!-- 仅展示中文释义 -->
                <div class="phrase-trans-card" style="background:#f1f4f9; border-radius:14px; padding:16px 20px; border:1.5px solid #dce2eb;">
                    <div class="phrase-trans-title" style="font-size:1.45rem; font-weight:800; color:#1e293b;">
                        ${escapeHtml(correctMeaning)}
                    </div>
                </div>
                
                <!-- 待拼装槽位行 -->
                <div class="phrase-slots-row" id="single-phrase-slots" style="border:1.5px dashed #cbd5e1; border-radius:16px; padding:12px 10px; background:#fff;">
                    ${targetWords.map((tw, i) => {
        if (isFixedPhraseToken(tw)) {
            return `<div class="phrase-slot fixed" style="background:#dcfce7; color:#15803d; border-bottom:3px solid #16a34a; font-weight:700;" id="single-slot-${i}">${escapeHtml(tw)}</div>`;
        }
        return `<div class="phrase-slot empty" id="single-slot-${i}" onclick="handleSinglePhraseSlotClick(${i})"></div>`;
    }).join('')}
                </div>
                
                <div id="single-phrase-compare" class="phrase-comparison-card" style="display: none;"></div>

                <!-- 备选词网格框 -->
                <div class="phrase-bank-card" style="background:#f8faff; border:1.5px solid #e2e8f0; border-radius:20px; padding:16px;">
                    <div class="phrase-bank-header" style="margin-bottom:14px;">
                        <span style="font-weight:700; color:#475569; font-size:0.9rem;">备选词框：</span>
                        <button type="button" class="btn-clear-phrase" id="btn-clear-single-phrase" onclick="clearSinglePhraseSlots()" style="background:#f1f5f9; border:1.5px solid #cbd5e1; border-radius:9999px; padding:4px 12px; font-weight:600;">
                            清空已选
                        </button>
                    </div>
                    <div class="phrase-chips-grid" id="single-phrase-bank" style="gap:10px;">
                        ${singlePhraseState.chips.map(c => `
                            <button class="phrase-word-chip" id="single-chip-${c.id}" onclick="handleSinglePhraseChipClick('${c.id}')">
                                ${escapeHtml(c.text)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            `;
}

function clearSinglePhraseSlots() {
    if (singleState.answered) return;
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    singlePhraseState.placed.forEach((chipId, idx) => {
        if (chipId && !String(chipId).startsWith('__fixed__')) {
            const slotEl = document.getElementById(`single-slot-${idx}`);
            if (slotEl) {
                slotEl.classList.remove('filled', 'correct', 'wrong');
                slotEl.classList.add('empty');
                slotEl.innerText = '';
            }
            const chipEl = document.getElementById(`single-chip-${chipId}`);
            if (chipEl) {
                chipEl.classList.remove('used');
                chipEl.disabled = false;
            }
            singlePhraseState.placed[idx] = null;
        }
    });
    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function handleSinglePhraseChipClick(chipId) {
    if (singleState.answered) return;
    const emptyIdx = singlePhraseState.placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    const chip = singlePhraseState.chips.find(c => c.id === chipId);
    if (!chip) return;

    singlePhraseState.placed[emptyIdx] = chipId;

    const slotEl = document.getElementById(`single-slot-${emptyIdx}`);
    if (slotEl) {
        slotEl.classList.remove('empty');
        slotEl.classList.add('filled');
        slotEl.innerText = chip.text;
    }

    const chipEl = document.getElementById(`single-chip-${chipId}`);
    if (chipEl) chipEl.classList.add('used');

    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';

    if (!singlePhraseState.placed.includes(null)) {
        checkSinglePhraseAnswer();
    }
}

function handleSinglePhraseSlotClick(slotIdx) {
    if (singleState.answered) return;
    const chipId = singlePhraseState.placed[slotIdx];
    if (!chipId || String(chipId).startsWith('__fixed__')) return;

    singlePhraseState.placed[slotIdx] = null;

    const slotEl = document.getElementById(`single-slot-${slotIdx}`);
    if (slotEl) {
        slotEl.classList.remove('filled', 'correct', 'wrong');
        slotEl.classList.add('empty');
        slotEl.innerText = '';
    }

    const chipEl = document.getElementById(`single-chip-${chipId}`);
    if (chipEl) chipEl.classList.remove('used');

    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function checkSinglePhraseAnswer() {
    const placedWords = singlePhraseState.placed.map((cid, i) => {
        if (String(cid).startsWith('__fixed__')) {
            return singlePhraseState.targetWords[i].toLowerCase();
        }
        const c = singlePhraseState.chips.find(item => item.id === cid);
        return c ? c.text.toLowerCase() : '';
    });
    const q = singlePhraseState.q;
    const isMatching = (typeof isPhraseAnswerMatching === 'function')
        ? isPhraseAnswerMatching(placedWords, singlePhraseState.targetWords)
        : false;
    let allSlotsRight = isMatching;
    const wrongSlots = [];
    if (!allSlotsRight) {
        allSlotsRight = true;
        singlePhraseState.targetWords.forEach((targetToken, idx) => {
            const userWord = placedWords[idx] || '';
            if (String(singlePhraseState.placed[idx]).startsWith('__fixed__')) return;
            if (!isPhraseSlotMatch(userWord, targetToken, q)) {
                allSlotsRight = false;
                wrongSlots.push(idx);
            }
        });
    }
    const isRight = allSlotsRight || isMatching;

    userStats.total++;
    singleState.total++;
    q.isPhrase = true;
    q.targetWords = singlePhraseState.targetWords;
    q.userPlacedTokens = placedWords;

    if (isRight) {
        userStats.correct++;
        singleState.score++;
        const wKey = (q.word || '').trim().toLowerCase();
        const hasRemainingInPool = singleState.pool.slice(singleState.currentIdx + 1).some(item => (item.word || '').trim().toLowerCase() === wKey);
        if (!hasRemainingInPool) {
            if (!singleState.completedWords) singleState.completedWords = new Set();
            singleState.completedWords.add(wKey);
        }
        updateSingleProgressDisplay();
        q.isCorrect = true;
        q.wrongSlotIndices = [];

        // 槽位高亮为正确绿色
        singlePhraseState.placed.forEach((cid, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (slotEl && !String(cid).startsWith('__fixed__')) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            }
        });

        // 【核心】：回答正确后，才在顶部展示墨绿色英文完整句
        const wordEl = document.getElementById('single-word');
        if (wordEl) {
            wordEl.style.display = 'block';
            wordEl.innerText = q.word;
            wordEl.style.color = '#15803d';
            wordEl.style.fontSize = '2.1rem';
            wordEl.style.fontWeight = '800';
        }

        singleState.answered = true;
        saveSingleProgress();
        updateSingleCardToolbar(q); // 解禁发音与熟词按钮

        // 备选词按钮全部灰显锁定
        singlePhraseState.chips.forEach(c => {
            const chipEl = document.getElementById(`single-chip-${c.id}`);
            if (chipEl) {
                chipEl.classList.add('used');
                chipEl.disabled = true;
            }
        });
        const clearBtn = document.getElementById('btn-clear-single-phrase');
        if (clearBtn) clearBtn.disabled = true;

        // 按钮变成蓝色的【下一题 ->】
        const nextBtn = document.getElementById('single-next-btn');
        if (nextBtn) {
            nextBtn.className = 'single-next-btn';
            nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
            nextBtn.style.display = 'flex';
        }
        const comp = document.getElementById('single-phrase-compare');
        if (comp) comp.style.display = 'none';

        // 优化：答完词组不自动跳转下一题，保留界面给用户查看与跟读
        if (singlePhraseTimer) {
            clearTimeout(singlePhraseTimer);
            singlePhraseTimer = null;
        }
    } else {
        q.isCorrect = false;
        q.wrongSlotIndices = singlePhraseState.targetWords.map((tw, i) => {
            if (isFixedPhraseToken(tw)) return -1;
            const cid = singlePhraseState.placed[i];
            const chip = cid ? singlePhraseState.chips.find(c => c.id === cid) : null;
            const uWord = chip ? chip.text : '';
            return isPhraseSlotMatch(uWord, tw) ? -1 : i;
        }).filter(idx => idx !== -1);
        const wKey = (q.word || '').trim().toLowerCase();
        if (singleState.completedWords) singleState.completedWords.delete(wKey);
        if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
        singleState.sessionMistakes.add(wKey);
        recordUserMistake(currentUser, q.word, q.meaning, q.phone);
        scheduleRetestForCurrentQuestion();
        updateSingleProgressDisplay();

        singlePhraseState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            slotEl.classList.add('wrong');
            const chipId = singlePhraseState.placed[i];
            const chip = chipId ? singlePhraseState.chips.find(c => c.id === chipId) : null;
            const userWord = chip ? chip.text : '';
            const isSlotRight = isPhraseSlotMatch(userWord, tw);
            if (isSlotRight) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            } else {
                slotEl.classList.remove('correct');
                slotEl.classList.add('wrong');
            }
        });

        setTimeout(() => {
            singlePhraseState.placed.forEach((cid, i) => {
                const slotEl = document.getElementById(`single-slot-${i}`);
                if (slotEl && !String(cid).startsWith('__fixed__')) slotEl.classList.remove('wrong');
            });
        }, 600);
        const comp = document.getElementById('single-phrase-compare');
        if (comp) {
            comp.className = 'phrase-comparison-card wrong-state';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div class="phrase-compare-row">
                        <span class="phrase-compare-badge wrong">✕ 搭配有误</span>
                        <span style="font-size:0.85rem; color:var(--md-sys-color-error); font-weight:600;">请重新调整，或点击下方【跳过】</span>
                    </div>
                `;
        }
    }
}

function revealSingleAnswer() {
    if (singleState.answered) return;
    singleState.answered = true;
    const q = singleState.pool[singleState.currentIdx];
    q.userAnswerIdx = -1;
    q.isCorrect = false;
    q.skipped = true;
    q.answered = true;

    const wKey = (q.word || '').trim().toLowerCase();
    if (singleState.completedWords) singleState.completedWords.delete(wKey);
    if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
    singleState.sessionMistakes.add(wKey);
    userStats.total++;
    singleState.total++;
    recordUserMistake(currentUser, q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone);
    scheduleRetestForCurrentQuestion();
    updateSingleProgressDisplay();
    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    EbbinghausEngine.recordWord(q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone, false, currentBookId);
    renderCardMasteryDiamonds(q.word, 'loss');

    const isPhrase = q.word && q.word.trim().includes(' ');
    if (isPhrase) {
        q.isPhrase = true;
        q.targetWords = singlePhraseState.targetWords;
        q.wrongSlotIndices = singlePhraseState.targetWords.map((tw, i) => isFixedPhraseToken(tw) ? -1 : i).filter(i => i !== -1);
        singlePhraseState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            const chipId = singlePhraseState.placed[i];
            const chip = chipId ? singlePhraseState.chips.find(c => c.id === chipId) : null;
            const userWord = chip ? chip.text : '';
            const isSlotRight = isPhraseSlotMatch(userWord, tw);

            slotEl.classList.remove('empty');
            if (isSlotRight) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('filled', 'correct');
                slotEl.innerText = userWord;
            } else {
                slotEl.classList.remove('correct');
                slotEl.classList.add('filled', 'wrong');
                slotEl.innerText = userWord || tw;
            }
        });

        const comp = document.getElementById('single-phrase-compare');
        if (comp) {
            comp.className = 'phrase-comparison-card';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div class="phrase-compare-row" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span class="phrase-compare-badge correct">✓ 正确词组</span>
                        <span class="phrase-compare-text correct">${q.word}</span>
                    </div>
                `;
        }
        if (singleConfig.autoPlayAudio && navigator.onLine) {
            playWordAudio(q.word);
        }

        singlePhraseState.chips.forEach(c => {
            const chipEl = document.getElementById(`single-chip-${c.id}`);
            if (chipEl) {
                chipEl.classList.add('used');
                chipEl.disabled = true;
            }
        });
        const clearBtn = document.getElementById('btn-clear-single-phrase');
        if (clearBtn) clearBtn.disabled = true;

        const wordEl = document.getElementById('single-word');
        const phoneEl = document.getElementById('single-phone');
        if (wordEl) wordEl.style.display = 'none';
        if (phoneEl) {
            phoneEl.innerText = '';
            phoneEl.style.display = 'none';
        }
    } else {
        q.options.forEach((opt, i) => {
            const btn = document.getElementById(`single-opt-${i}`);
            if (!btn) return;
            btn.disabled = true;
            btn.innerHTML = `<span class="opt-word">${opt.word}</span> <span class="opt-trans">${opt.meaning}</span>`;
            if (i === q.correctIdx) {
                btn.classList.add('correct');
            }
        });
    }

    saveSingleProgress();
    updateSingleCardToolbar(q); // 解禁发音按钮

    // 核心：词组被跳过揭晓答案时，若开启自动发音则播放
    if (isPhrase && singleConfig.autoPlayAudio && navigator.onLine && q && q.word) {
        playWordAudio(q.word);
    }

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.className = 'single-next-btn';
        nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
        nextBtn.style.display = 'flex';
    }
}

function handleSingleAnswer(idx) {
    if (singleState.answered) return;
    singleState.answered = true;
    singleState.selectedIdx = idx;

    const q = singleState.pool[singleState.currentIdx];
    const isRight = (idx === q.correctIdx);
    q.userAnswerIdx = idx;
    q.isCorrect = isRight;
    q.answered = true;

    userStats.total++;
    singleState.total++;

    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    if (isRight) {
        userStats.correct++;
        singleState.score++;
        const wKey = (q.word || '').trim().toLowerCase();
        const hasRemainingInPool = singleState.pool.slice(singleState.currentIdx + 1).some(item => (item.word || '').trim().toLowerCase() === wKey);
        if (!hasRemainingInPool) {
            if (!singleState.completedWords) singleState.completedWords = new Set();
            singleState.completedWords.add(wKey);
        }
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
        EbbinghausEngine.recordWord(q.word, q.options[q.correctIdx]?.meaning, q.phone, true, currentBookId);
        renderCardMasteryDiamonds(q.word, 'gain');
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record(singleState.sessionName === '复习' ? 'reviewed' : 'learned', 1);
        }
    } else {
        const wKey = (q.word || '').trim().toLowerCase();
        if (singleState.completedWords) singleState.completedWords.delete(wKey);
        if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
        singleState.sessionMistakes.add(wKey);
        recordUserMistake(currentUser, q.word, q.options[q.correctIdx]?.meaning, q.phone);
        scheduleRetestForCurrentQuestion();
        EbbinghausEngine.recordWord(q.word, q.options[q.correctIdx]?.meaning, q.phone, false, currentBookId);
        renderCardMasteryDiamonds(q.word, 'loss');
    }
    updateSingleProgressDisplay();
    saveCurrentUserData();
    saveSingleProgress();
    updateSingleCardToolbar(q); // 解禁发音按钮
    saveSingleProgress();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`single-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = `<span class="opt-word">${opt.word}</span> <span class="opt-trans">${opt.meaning}</span>`;
        if (i === q.correctIdx) {
            btn.classList.add('correct');
        }
    });

    if (!isRight) {
        const wrongBtn = document.getElementById(`single-opt-${idx}`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
    }

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.className = 'single-next-btn';
        nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
        nextBtn.style.display = 'flex';
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function nextSingleQuestion(forceAdvance = false) {
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    if (!forceAdvance && !singleState.answered) {
        revealSingleAnswer();
        return;
    }
    singleState.currentIdx++;
    saveSingleProgress();
    renderSingleQuestion();
}

function endSingleGame() {
    if (currentUser) {
        localStorage.removeItem(`single_progress_${currentUser}`);
        updateHubResumeButtons();
    }
    if (window.EbbinghausEngine) {
        EbbinghausEngine.updateDueBadge();
    }
    const isReviewMode = (singleState && singleState.sessionName === '复习');
    gameResult = {
        mode: 'single',
        msg: isReviewMode ? '已完成本组复习！' : `已完成本组练习！`,
        sessionName: singleState ? singleState.sessionName : '',
        currentReviewBookId: typeof currentReviewBookId !== 'undefined' ? currentReviewBookId : null,
        p1Score: singleState.score,
        p2Score: 0,
        pool: singleState.pool,
        sessionMistakes: Array.from(singleState.sessionMistakes || []),
        total: singleState.targetTotal || singleState.total || (singleState.pool ? singleState.pool.length : 0)
    };
    if (typeof syncAllUserDataToCloud === 'function') {
        syncAllUserDataToCloud();
    }
    renderResult();
    switchView('view-result');
}

function getAllKnownMeaningsOfTargetWord(targetWord) {
    const forbidden = new Set();
    const tLower = (targetWord || '').trim().toLowerCase();
    if (!tLower) return forbidden;

    const addClean = (str) => {
        if (!str || typeof str !== 'string') return;
        const s = str.trim().toLowerCase();
        if (s && s !== '---') {
            forbidden.add(s);
            const noPos = s.replace(/^[a-z]{1,6}\.\s*/i, '').trim();
            if (noPos) forbidden.add(noPos);
        }
    };

    if (typeof dictionary !== 'undefined' && Array.isArray(dictionary)) {
        dictionary.forEach(w => {
            if (w && (w.word || w.name || '').trim().toLowerCase() === tLower) {
                if (w.meaning) addClean(w.meaning);
                if (Array.isArray(w.meanings)) {
                    w.meanings.forEach(m => addClean((m.pos ? m.pos + ' ' : '') + (m.meaning || '')));
                }
                if (Array.isArray(w.trans)) {
                    w.trans.forEach(t => addClean(t));
                }
            }
        });
    }

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        Object.values(BookManager.bookCache).forEach(words => {
            if (Array.isArray(words)) {
                words.forEach(w => {
                    if (w && (w.word || w.name || '').trim().toLowerCase() === tLower) {
                        if (w.meaning) addClean(w.meaning);
                        if (Array.isArray(w.meanings)) {
                            w.meanings.forEach(m => addClean((m.pos ? m.pos + ' ' : '') + (m.meaning || '')));
                        }
                        if (Array.isArray(w.trans)) {
                            w.trans.forEach(t => addClean(t));
                        }
                    }
                });
            }
        });
    }

    if (typeof window !== 'undefined' && Array.isArray(window.customBooks)) {
        window.customBooks.forEach(b => {
            if (Array.isArray(b.words)) {
                b.words.forEach(w => {
                    if (w && (w.word || w.name || '').trim().toLowerCase() === tLower) {
                        if (w.meaning) addClean(w.meaning);
                        if (Array.isArray(w.meanings)) {
                            w.meanings.forEach(m => addClean((m.pos ? m.pos + ' ' : '') + (m.meaning || '')));
                        }
                    }
                });
            }
        });
    }

    if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS)) {
        DEFAULT_WORDS.forEach(w => {
            if (w && (w.word || w.name || '').trim().toLowerCase() === tLower) {
                if (w.meaning) addClean(w.meaning);
                if (Array.isArray(w.meanings)) {
                    w.meanings.forEach(m => addClean((m.pos ? m.pos + ' ' : '') + (m.meaning || '')));
                }
            }
        });
    }

    return forbidden;
}

function getWordDistractorMeaning(d, usedMeanings, targetForbiddenMeanings = new Set()) {
    if (!d) return null;
    const candidates = [];
    if (Array.isArray(d.meanings) && d.meanings.length > 0) {
        d.meanings.forEach(m => {
            const str = ((m.pos ? m.pos + ' ' : '') + (m.meaning || '')).trim();
            if (str && str !== '---' && !candidates.includes(str)) candidates.push(str);
        });
    }
    if (d.meaning && typeof d.meaning === 'string') {
        const str = d.meaning.trim();
        if (str && str !== '---' && !candidates.includes(str)) candidates.push(str);
    }
    if (candidates.length === 0) return null;

    const available = candidates.filter(m => {
        const mLower = m.toLowerCase();
        const noPos = mLower.replace(/^[a-z]{1,6}\.\s*/i, '').trim();
        if (usedMeanings.has(mLower) || (noPos && usedMeanings.has(noPos))) return false;
        if (targetForbiddenMeanings.has(mLower) || (noPos && targetForbiddenMeanings.has(noPos))) return false;
        return true;
    });

    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    }
    return null;
}

function getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride) {
    const curDict = (typeof dictionary !== 'undefined' && Array.isArray(dictionary)) ? dictionary : [];
    let pool = (poolOverride && poolOverride.length >= 4) ? poolOverride : [...(poolOverride || []), ...curDict];
    if (pool.length === 0) {
        pool = (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : []);
    }
    const targetLower = (targetWord || '').toLowerCase().trim();
    const isSingleWord = !targetLower.includes(' ');

    const targetForbiddenMeanings = getAllKnownMeaningsOfTargetWord(targetWord);
    const cleanCorrect = (correctMeaning || '').trim().toLowerCase();
    if (cleanCorrect) {
        targetForbiddenMeanings.add(cleanCorrect);
        const cleanNoPos = cleanCorrect.replace(/^[a-z]{1,6}\.\s*/i, '').trim();
        if (cleanNoPos) targetForbiddenMeanings.add(cleanNoPos);
    }

    const usedMeanings = new Set([...targetForbiddenMeanings]);

    const seen = new Set();
    const candidates = [];
    for (const d of pool) {
        if (!d || !d.word) continue;
        const wl = d.word.toLowerCase().trim();
        if (wl === targetLower) continue; // 绝对不抽该单词自身
        if (isSingleWord && wl.includes(' ')) continue;
        if (!seen.has(wl)) {
            seen.add(wl);
            candidates.push(d);
        }
    }

    if (isSingleWord && candidates.length < 10 && typeof DEFAULT_WORDS !== 'undefined') {
        for (const d of DEFAULT_WORDS) {
            if (!d || !d.word) continue;
            const wl = d.word.toLowerCase().trim();
            if (wl === targetLower) continue;
            if (wl.includes(' ')) continue;
            if (!seen.has(wl)) {
                seen.add(wl);
                candidates.push(d);
            }
        }
    }

    const scoredCandidates = candidates.map(d => {
        const candLower = d.word.toLowerCase().trim();
        const dist = calcLevenshteinDist(targetLower, candLower);
        let prefixBonus = 0;
        if (targetLower.slice(0, 3) === candLower.slice(0, 3)) prefixBonus = 3;
        else if (targetLower.slice(0, 2) === candLower.slice(0, 2)) prefixBonus = 1.5;
        const lenDiff = Math.abs(targetLower.length - candLower.length);
        const score = (10 - dist) + prefixBonus - (lenDiff * 0.5);
        return { item: d, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, 25).map(c => c.item).sort(() => 0.5 - Math.random());

    const chosenDistractors = [];

    // 先从前置相似候选中挑选，保证释义完全不重复且不含目标词在其他词书的任何释义
    for (const cand of topCandidates) {
        if (chosenDistractors.length >= 3) break;
        const meaning = getWordDistractorMeaning(cand, usedMeanings, targetForbiddenMeanings);
        if (meaning) {
            usedMeanings.add(meaning.toLowerCase());
            const noPos = meaning.toLowerCase().replace(/^[a-z]{1,6}\.\s*/i, '').trim();
            if (noPos) usedMeanings.add(noPos);
            chosenDistractors.push({ word: cand.word, meaning: meaning });
        }
    }

    // 若不足3个，从整体候选词库随机补充不重合释义
    if (chosenDistractors.length < 3) {
        const remaining = candidates.filter(c => !chosenDistractors.some(cd => cd.word.toLowerCase().trim() === c.word.toLowerCase().trim())).sort(() => 0.5 - Math.random());
        for (const cand of remaining) {
            if (chosenDistractors.length >= 3) break;
            const meaning = getWordDistractorMeaning(cand, usedMeanings, targetForbiddenMeanings);
            if (meaning) {
                usedMeanings.add(meaning.toLowerCase());
                const noPos = meaning.toLowerCase().replace(/^[a-z]{1,6}\.\s*/i, '').trim();
                if (noPos) usedMeanings.add(noPos);
                chosenDistractors.push({ word: cand.word, meaning: meaning });
            }
        }
    }

    // 兜底保护，若依然不够3个，且备用释义已无可挑，避免崩溃
    let fallbackIdx = 1;
    while (chosenDistractors.length < 3) {
        chosenDistractors.push({
            word: `option_${fallbackIdx}`,
            meaning: `其他备选释义 ${fallbackIdx++}`
        });
    }

    return chosenDistractors;
}

function generateOptions(targetWord, correctMeaning, poolOverride) {
    const distractors = getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride);
    const correctOption = { word: targetWord, meaning: correctMeaning };
    const options = [correctOption, ...distractors].sort(() => 0.5 - Math.random());
    const correctIdx = options.findIndex(o => o.word === targetWord && o.meaning === correctMeaning);
    return { options, correctIdx };
}

function shuffle(array) {
    if (!Array.isArray(array)) return [];
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateShuffledPoolFromWords(wordsList, count = 70) {
    const curDict = (typeof dictionary !== 'undefined' && Array.isArray(dictionary)) ? dictionary : [];
    const list = (wordsList && wordsList.length > 0) ? wordsList : (curDict.length > 0 ? curDict : (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : []));
    const unmastered = list.filter(w => !isWordMastered(w.word));
    const activeList = unmastered.length > 0 ? unmastered : list;
    const shuffled = shuffle(activeList);
    const sliceCount = Math.min(count, shuffled.length);
    return shuffled.slice(0, sliceCount).map(w => {
        let fullMeaning = '';
        let options = [];
        let correctIdx = 0;

        if (w.senses && Array.isArray(w.senses) && w.senses.length > 0) {
            const sq = typeof generateShiCiQuestion === 'function' ? generateShiCiQuestion(w, list) : null;
            if (sq) {
                const cleanMeaning = sq.sense ? `[${sq.sense.part_of_speech || ''}] ${(sq.sense.meaning || '').replace(/★/g, '').trim()}` : '';
                return {
                    word: sq.word,
                    phone: sq.pinyin || w.pinyin || '',
                    pinyin: sq.pinyin || w.pinyin || '',
                    bookName: w.bookName || '文言实词',
                    bookId: w.bookId || null,
                    sentence: sq.sentence || '',
                    highlightedSentence: sq.highlightedSentence || '',
                    source: sq.source || '《文言》',
                    sense: sq.sense,
                    example: sq.example,
                    meaning: cleanMeaning,
                    options: sq.options.map(o => ({
                        word: sq.word,
                        pos: o.pos || '',
                        rawMeaning: o.meaning,
                        meaning: (o.pos ? `[${o.pos}] ` : '') + o.meaning
                    })),
                    correctIdx: sq.correctIdx,
                    isShiCi: true
                };
            }
        }

        const selected = (w.meanings && w.meanings.length > 0) ? w.meanings[Math.floor(Math.random() * w.meanings.length)] : { pos: '', meaning: w.meaning || '---' };
        fullMeaning = (selected.pos ? selected.pos + ' ' : '') + (selected.meaning || '');
        const optData = generateOptions(w.word, fullMeaning, list);
        options = optData.options;
        correctIdx = optData.correctIdx;

        const isPhrase = w.word && w.word.trim().includes(' ') && !w.senses;
        const phraseChips = isPhrase ? generatePhraseDistractors(extractPhraseTargetWords(w.word), list, w) : null;
        return {
            word: w.word,
            phone: w.phone || w.pinyin || '',
            bookName: w.bookName || '对决词库',
            bookId: w.bookId || null,
            meanings: w.meanings || [{ pos: '', meaning: fullMeaning }],
            meaning: fullMeaning,
            options: options,
            correctIdx: correctIdx,
            phraseChips: phraseChips,
            isShiCi: false,
            mistake: w.mistake || null
        };
    });
}

/* ==========================================================================
   15. 新功能实现：我 (Profile)、搜索 (Search)、自定义词书与手动加词、复习过滤
   ========================================================================== */

// ----------------- 个人中心 (我) 渲染逻辑 -----------------
function renderMeView() {
    const isLoggedIn = currentUserProfile && currentUserProfile.isLoggedIn;
    const unloggedBox = document.getElementById('me-account-unlogged-box');
    const loggedBox = document.getElementById('me-account-logged-box');

    if (unloggedBox && loggedBox) {
        if (!isLoggedIn) {
            unloggedBox.style.display = 'block';
            loggedBox.style.display = 'none';
        } else {
            unloggedBox.style.display = 'none';
            loggedBox.style.display = 'block';

            const avatarWrap = document.getElementById('me-user-avatar-wrap');
            const avatarImg = document.getElementById('me-user-avatar-img');
            const avatarIcon = document.getElementById('me-user-avatar-icon');
            const avatarEditHint = document.getElementById('me-user-avatar-edit-hint');
            const displayNameEl = document.getElementById('me-user-display-name');
            const badgeEl = document.getElementById('me-user-platform-badge');
            const cloudActions = document.getElementById('me-user-cloud-actions');

            if (displayNameEl) displayNameEl.innerText = currentUserProfile.username || currentUser;

            let avatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(currentUserProfile.username) : '';
            if (avatarUrl && avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
            if (avatarUrl && avatarImg && avatarIcon) {
                avatarImg.onerror = () => {
                    avatarImg.style.display = 'none';
                    avatarIcon.style.display = 'inline-flex';
                };
                avatarImg.onload = () => {
                    avatarImg.style.display = 'block';
                    avatarIcon.style.display = 'none';
                };
                avatarImg.src = avatarUrl;
                avatarImg.style.display = 'block';
                avatarIcon.style.display = 'none';
            } else if (avatarImg && avatarIcon) {
                avatarImg.style.display = 'none';
                avatarIcon.style.display = 'inline-flex';
            }

            const editUserRow = document.getElementById('me-row-edit-username');
            const editPassRow = document.getElementById('me-row-edit-password');

            if (currentUserProfile.type === 'bilibili') {
                if (badgeEl) {
                    badgeEl.innerHTML = `<span class="badge" style="background:#fb7299; color:#fff; font-size:0.75rem; padding:3px 9px; border-radius:10px; font-weight:600;">哔哩哔哩授权账号</span>`;
                }
                if (cloudActions) cloudActions.style.display = 'none';
                if (editUserRow) editUserRow.style.display = 'none';
                if (editPassRow) editPassRow.style.display = 'none';
                if (avatarEditHint) avatarEditHint.style.display = 'none';
                if (avatarWrap) avatarWrap.style.cursor = 'default';
            } else {
                if (badgeEl) {
                    badgeEl.innerHTML = `<span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-size:0.75rem; padding:3px 9px; border-radius:10px; font-weight:600;">云端账号</span>`;
                }
                if (cloudActions) cloudActions.style.display = 'flex';
                if (editUserRow) editUserRow.style.display = 'flex';
                if (editPassRow) editPassRow.style.display = 'flex';
                if (avatarEditHint) avatarEditHint.style.display = 'flex';
                if (avatarWrap) avatarWrap.style.cursor = 'pointer';
            }

            if (typeof updateSyncButtonStatus === 'function') {
                updateSyncButtonStatus();
            }

            // 渲染用户等级卡片 (实际等级分与上限，9段不用显示上限)
            if (typeof LevelManager !== 'undefined') {
                const lData = LevelManager.getLevelData(currentUserProfile.username || currentUser);
                const badge = document.getElementById('me-level-badge');
                const title = document.getElementById('me-level-title');
                const expText = document.getElementById('me-level-exp-text');
                const fill = document.getElementById('me-level-progress-fill');

                if (badge) {
                    badge.innerText = `${lData.rank}段`;
                    badge.title = `段位：${lData.rank}段 | 总等级分：${lData.rating}分`;
                }
                if (title) title.innerText = '';
                if (expText) {
                    if (lData.rank >= 9) {
                        expText.innerText = `${lData.rating}分`;
                    } else {
                        const tierMax = lData.rank * 100;
                        expText.innerText = `${lData.rating}/${tierMax}分`;
                    }
                }
                if (fill) {
                    if (lData.rank >= 9) {
                        fill.style.width = '100%';
                    } else {
                        fill.style.width = `${Math.min(100, Math.max(0, lData.progressPercent))}%`;
                    }
                }
            }
        }
    }

    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%  |  错题数：${Object.keys(userStats.mistakes || {}).length} 词`;
    }

    // 更新个人中心的数据中心统计卡片
    const statTotalEl = document.getElementById('stat-total');
    const statAccEl = document.getElementById('stat-acc');
    const statMistakesEl = document.getElementById('stat-mistakes');
    if (statTotalEl) statTotalEl.innerText = userStats.total || 0;
    if (statAccEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statAccEl.innerText = `${acc}%`;
    }
    if (statMistakesEl) {
        statMistakesEl.innerText = Object.keys(userStats.mistakes || {}).length;
    }

    const summaryEl = document.getElementById('settings-books-summary-text');
    if (summaryEl) {
        const customCount = (window.customBooks || []).length;
        const folderCount = (localFolders || []).length;
        summaryEl.innerText = `已创建 ${folderCount} 个文件夹，${customCount} 个本地词书`;
    }

    const masteredSummaryEl = document.getElementById('settings-mastered-summary-text');
    if (masteredSummaryEl) {
        const mCount = getMasteredWords().length;
        masteredSummaryEl.innerText = `已标注 ${mCount} 个熟词，练习中不再抽取`;
    }

    const mistakesSummaryEl = document.getElementById('settings-mistakes-summary-text');
    if (mistakesSummaryEl) {
        const mCount = Object.keys(userStats.mistakes || {}).length;
        mistakesSummaryEl.innerText = `在对战和练习过程中收录的错题，共 ${mCount} 题`;
    }

    const trashSummaryEl = document.getElementById('settings-trash-summary-text');
    if (trashSummaryEl) {
        const tCount = getTrashWords().length;
        trashSummaryEl.innerText = `共 ${tCount} 个已删词汇`;
    }

    const autoSyncSwitch = document.getElementById('switch-auto-sync');
    if (autoSyncSwitch) {
        autoSyncSwitch.checked = typeof isAutoSyncEnabled === 'function' ? isAutoSyncEnabled() : true;
    }

    const meShareBtn = document.getElementById('btn-me-share-poster');
    if (meShareBtn) {
        const canShare = (typeof isToyPlatform === 'function' ? isToyPlatform() : (typeof isBilibiliToy !== 'undefined' && isBilibiliToy));
        meShareBtn.style.display = canShare ? 'inline-flex' : 'none';
    }
}

// ----------------- 数据同步状态与手动同步 -----------------
let isUserDataSynced = false;

function updateSyncButtonStatus(isSynced) {
    const btn = document.getElementById('btn-sync-cloud-data');
    if (!btn) return;
    const label = btn.querySelector('.btn-label-text');
    const icon = btn.querySelector('.material-symbols-rounded');

    // 1. 检查自动同步是否开启：仅当关闭自动同步时才显示该按钮
    const autoSync = (typeof isAutoSyncEnabled === 'function')
        ? isAutoSyncEnabled()
        : (localStorage.getItem('vocab_auto_sync_enabled') !== 'false');

    if (autoSync) {
        btn.style.display = 'none';
        return;
    } else {
        btn.style.display = 'inline-flex';
    }

    // 2. 检查是否正在同步中
    if (window.SyncManager && window.SyncManager.isSyncing) {
        if (icon) {
            icon.innerText = 'sync';
            icon.style.animation = 'spin 1s linear infinite';
        }
        if (label) label.innerText = '同步中...';
        btn.disabled = true;
        btn.style.borderColor = 'var(--md-sys-color-outline)';
        btn.style.color = 'var(--md-sys-color-outline)';
        return;
    }

    if (icon) icon.style.animation = '';

    // 3. 统计本地待同步队列数据
    const pendingCount = (window.SyncManager && Array.isArray(window.SyncManager.pendingQueue))
        ? window.SyncManager.pendingQueue.length
        : 0;

    if (isSynced === true || (isSynced !== false && pendingCount === 0)) {
        isUserDataSynced = true;
        if (icon) icon.innerText = 'check';
        if (label) label.innerText = '已是最新';
        btn.disabled = false;
        btn.style.borderColor = 'var(--md-sys-color-success, #2e7d32)';
        btn.style.color = 'var(--md-sys-color-success, #2e7d32)';
    } else {
        isUserDataSynced = false;
        if (icon) icon.innerText = 'sync';
        if (label) label.innerText = pendingCount > 0 ? `同步数据 (${pendingCount})` : '同步数据';
        btn.disabled = false;
        btn.style.borderColor = 'var(--md-sys-color-primary)';
        btn.style.color = 'var(--md-sys-color-primary)';
    }
}
window.updateSyncButtonStatus = updateSyncButtonStatus;

async function handleManualSyncUserData() {
    const btn = document.getElementById('btn-sync-cloud-data');
    const pendingCount = (window.SyncManager && Array.isArray(window.SyncManager.pendingQueue))
        ? window.SyncManager.pendingQueue.length
        : 0;

    if (pendingCount === 0 && isUserDataSynced) {
        if (typeof showToast === 'function') {
            showToast('当前已是最新数据，已全部同步到云端');
        }
        return;
    }

    if (btn) {
        const icon = btn.querySelector('.material-symbols-rounded');
        const label = btn.querySelector('.btn-label-text');
        if (icon) icon.style.animation = 'spin 1s linear infinite';
        if (label) label.innerText = '同步中...';
        btn.disabled = true;
    }

    try {
        if (window.SyncManager && typeof window.SyncManager.flush === 'function') {
            await window.SyncManager.flush({ force: true, silent: false });
            updateSyncButtonStatus(true);
        } else if (typeof syncAllUserDataToCloud === 'function') {
            const res = await syncAllUserDataToCloud(currentUser, { silent: false });
            if (res && res.success) {
                updateSyncButtonStatus(true);
                if (typeof showToast === 'function') {
                    showToast('数据已成功同步到云端！');
                }
            } else {
                updateSyncButtonStatus(false);
            }
        }
    } catch (e) {
        console.error('[Sync] Manual sync failed:', e);
        updateSyncButtonStatus(false);
        if (typeof showToast === 'function') {
            showToast('数据同步失败，请检查网络');
        }
    } finally {
        updateSyncButtonStatus();
    }
}
window.handleManualSyncUserData = handleManualSyncUserData;

// ----------------- 云端账号管理操作 (修改用户名、密码、头像) -----------------
function triggerMeAvatarUpload() {
    if (currentUserProfile && currentUserProfile.type !== 'cloud') return;
    const input = document.getElementById('me-avatar-file-input');
    if (input) input.click();
}

function handleMeAvatarChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    openAvatarCropper(file, async (dataUrl) => {
        if (!dataUrl) return;
        try {
            await supabaseUpdateAvatar(currentUser, dataUrl);
            currentUserProfile.avatar = dataUrl;
            SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
            SafeStorage.setItem(`vocab_user_avatar_${currentUser}`, dataUrl);
            showToast('头像已更新');
            renderMeView();
            updateHub();
        } catch (e) {
            showToast(e.message || '更新头像失败');
        }
    });
    event.target.value = '';
}

function openEditUsernameModal() {
    const input = document.getElementById('input-new-username');
    if (input) input.value = currentUserProfile.username || currentUser;
    const modal = document.getElementById('modal-edit-username');
    if (modal) modal.classList.add('active');
}

function closeEditUsernameModal() {
    const modal = document.getElementById('modal-edit-username');
    if (modal) modal.classList.remove('active');
}

async function confirmUpdateUsername() {
    const input = document.getElementById('input-new-username');
    const newName = (input ? input.value : '').trim();
    if (!newName) {
        showToast('用户名不能为空');
        return;
    }
    if (newName.length < 2 || newName.length > 16) {
        showToast('用户名长度需在 2 到 16 个字符之间');
        return;
    }
    if (newName === currentUser) {
        closeEditUsernameModal();
        return;
    }

    try {
        await supabaseUpdateUsername(currentUser, newName);
        const oldName = currentUser;
        currentUser = newName;
        currentUserProfile.username = newName;
        SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
        SafeStorage.setItem('vocab_pk_user', newName);

        // 迁移本地所有核心数据 key (段位、统计、记忆曲线、错词本、每日记录等)
        const keysToMigrate = [
            'vocab_stats',
            'vocab_rank_data',
            'vocab_ebbinghaus_db',
            'vocab_daily_logs',
            'vocab_mastered_words',
            'vocab_wordle_history',
            'vocab_shici_progress',
            'vocab_user_avatar',
            'vocab_recent_books',
            'vocab_mistakes'
        ];
        keysToMigrate.forEach(prefix => {
            const oldVal = SafeStorage.getItem(`${prefix}_${oldName}`);
            if (oldVal !== null) {
                SafeStorage.setItem(`${prefix}_${newName}`, oldVal);
            }
        });

        // 迁移段位管理器内存与本地持久化
        if (typeof LevelManager !== 'undefined') {
            const oldRank = LevelManager.getUserRankData(oldName);
            if (oldRank && !oldRank.isGuest) {
                LevelManager.saveUserRankData(newName, {
                    rank: oldRank.rank,
                    rating: oldRank.rating,
                    isPromotionReady: oldRank.isPromotionReady,
                    battles: oldRank.battles || { total: 0, wins: 0, losses: 0, draws: 0 }
                });
            }
        }

        // 迁移记住的设备账号列表
        if (typeof getSavedDeviceAccounts === 'function') {
            let list = getSavedDeviceAccounts();
            const targetAcc = list.find(a => a.username === oldName);
            if (targetAcc) {
                targetAcc.username = newName;
                SafeStorage.setItem('vocab_device_accounts', JSON.stringify(list));
            }
        }

        // 立即触发云端全量数据同步，确保新用户名在云端继承原有段位与全部学习成果
        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud(newName);
        }

        showToast(`用户名已成功修改为 “${newName}”`);
        closeEditUsernameModal();
        renderMeView();
        updateHub();
    } catch (e) {
        if (typeof showToast === 'function') {
            showToast(e.message || '修改用户名失败');
        } else {
            alert(e.message || '修改用户名失败');
        }
    }
}

function openEditPasswordModal() {
    const pOld = document.getElementById('input-old-password');
    const pNew = document.getElementById('input-new-password');
    const pConfirm = document.getElementById('input-confirm-new-password');
    if (pOld) pOld.value = '';
    if (pNew) pNew.value = '';
    if (pConfirm) pConfirm.value = '';
    const modal = document.getElementById('modal-edit-password');
    if (modal) modal.classList.add('active');
}

function closeEditPasswordModal() {
    const modal = document.getElementById('modal-edit-password');
    if (modal) modal.classList.remove('active');
}

async function confirmUpdatePassword() {
    const pOld = document.getElementById('input-old-password');
    const pNew = document.getElementById('input-new-password');
    const pConfirm = document.getElementById('input-confirm-new-password');

    const oldPass = (pOld ? pOld.value : '').trim();
    const newPass = (pNew ? pNew.value : '').trim();
    const confirmPass = (pConfirm ? pConfirm.value : '').trim();

    if (!oldPass) {
        showToast('请输入旧密码');
        return;
    }
    if (!newPass) {
        showToast('请输入新密码');
        return;
    }
    if (newPass.length < 4) {
        showToast('新密码长度至少为 4 位');
        return;
    }
    if (newPass !== confirmPass) {
        showToast('两次输入的新密码不一致');
        return;
    }

    try {
        await supabaseUpdatePassword(currentUser, oldPass, newPass);
        showToast('密码修改成功，请牢记新密码');
        closeEditPasswordModal();
    } catch (e) {
        alert(e.message || '修改密码失败');
    }
}

// ----------------- 删除 / 注销账号 -----------------
function openDeleteAccountModal() {
    const modal = document.getElementById('modal-delete-account');
    if (!modal) return;
    const nameEl = document.getElementById('delete-account-target-name');
    if (nameEl) nameEl.innerText = currentUser || '';
    const passRow = document.getElementById('delete-account-pass-row');
    const isCloud = currentUserProfile && currentUserProfile.type === 'cloud';
    if (passRow) passRow.style.display = isCloud ? 'block' : 'none';
    const passInput = document.getElementById('input-delete-account-pass');
    if (passInput) passInput.value = '';
    modal.classList.add('active');
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('modal-delete-account');
    if (modal) modal.classList.remove('active');
}

async function confirmDeleteAccount() {
    const targetUser = currentUser;
    if (!targetUser) return;
    const isCloud = currentUserProfile && currentUserProfile.type === 'cloud';
    let pass = '';
    if (isCloud) {
        const passInput = document.getElementById('input-delete-account-pass');
        pass = passInput ? passInput.value.trim() : '';
        if (!pass) {
            showToast('请输入账号密码以验证身份');
            return;
        }
    }

    try {
        if (isCloud && typeof supabaseDeleteAccount === 'function') {
            await supabaseDeleteAccount(targetUser, pass);
        } else if (currentUserProfile && currentUserProfile.type === 'bilibili' && typeof supabaseDeleteAccount === 'function') {
            await supabaseDeleteAccount(targetUser, null);
        }

        // 本地清理
        if (typeof removeSavedDeviceAccount === 'function') {
            removeSavedDeviceAccount(targetUser);
        }
        allUsersList = (allUsersList || []).filter(u => u !== targetUser);
        SafeStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
        SafeStorage.removeItem(`vocab_stats_${targetUser}`);
        SafeStorage.removeItem(`vocab_user_avatar_${targetUser}`);
        SafeStorage.removeItem('vocab_auth_session');
        SafeStorage.removeItem('vocab_pk_user');
        SafeStorage.removeItem('vocab_guest_name');

        closeDeleteAccountModal();
        showToast(`账号 “${targetUser}” 已成功删除`);
        if (typeof handleLogout === 'function') {
            handleLogout(false);
        } else {
            location.reload();
        }
    } catch (e) {
        alert(e.message || '删除账号失败');
    }
}
window.openDeleteAccountModal = openDeleteAccountModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.confirmDeleteAccount = confirmDeleteAccount;


// ----------------- 词书选择“确定”按钮 -----------------
function confirmSingleBookSelection() {
    if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    closeSingleBookSelector();
    updateHub();
    if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.updateDueBadge === 'function') {
        EbbinghausEngine.updateDueBadge();
    }
    showToast('已确认选择词书');
}

// ----------------- 复习词书多选过滤 -----------------
function getReviewSelectedBookIds() {
    if (!currentUser) return [];
    const saved = localStorage.getItem(`vocab_review_filter_${currentUser}`);
    if (saved !== null) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) { }
    }
    // 每次默认全选所有英语词书
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const englishBooks = allBooks.filter(isEnglishBook).concat((window.customBooks || []).filter(isEnglishBook));
    return englishBooks.map(b => b.id);
}

function handleReviewMainClick(event) {
    const badgeEl = document.getElementById('hub-review-due-count');
    const count = parseInt(badgeEl ? badgeEl.innerText : '0', 10);
    if (count <= 0) {
        showToast('暂无需要复习的词汇，点击可强化复习');
    }
    startSingleReview();
}

// 全局点击关闭复习页面词书切换下拉菜单
document.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('single-review-book-menu');
    const btn = document.getElementById('single-review-book-btn');
    if (menu && menu.style.display !== 'none') {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
            menu.style.display = 'none';
        }
    }
});

// ----------------- 新建本地词书 -----------------
function promptCreateCustomBook() {
    const modal = document.getElementById('modal-create-custom-book');
    const nameInput = document.getElementById('input-new-book-name') || document.getElementById('input-create-book-name');
    if (nameInput) {
        nameInput.value = '';
        setTimeout(() => nameInput.focus(), 150);
    }
    if (modal) modal.classList.add('active');
}

function closeCreateCustomBookModal() {
    const modal = document.getElementById('modal-create-custom-book');
    if (modal) modal.classList.remove('active');
}

async function confirmCreateCustomBook() {
    const nameInput = document.getElementById('input-new-book-name') || document.getElementById('input-create-book-name');
    const name = (nameInput ? nameInput.value : '').trim();
    if (!name) {
        showToast('请输入词书名称！');
        if (nameInput) nameInput.focus();
        return;
    }
    const bookId = 'custom_' + Date.now();
    const newBook = {
        id: bookId,
        name: name,
        rawName: name,
        count: 0,
        words: [],
        folderId: null,
        isCloud: false,
        createdAt: Date.now()
    };
    if (!window.customBooks) window.customBooks = [];
    window.customBooks.push(newBook);
    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(newBook);
    }
    BookManager.mergeCustomBooks();
    closeCreateCustomBookModal();
    renderManageLocalBooksInSettings();
    showToast(`词书《${name}》创建成功！`);
    viewBookWordsInSettings(bookId);
}

