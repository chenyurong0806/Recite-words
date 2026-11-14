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

function _normMasteredKey(word) {
    return typeof normalizeWordKey === 'function'
        ? normalizeWordKey(word)
        : String(word || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isWordMastered(word) {
    if (!word) return false;
    const clean = _normMasteredKey(word);
    const list = getMasteredWords();
    return list.some(item => _normMasteredKey(typeof item === 'string' ? item : item.word) === clean);
}

function toggleMasteredWord(word, phone = '', meaning = '') {
    if (!currentUser || !word) return false;
    const clean = _normMasteredKey(word);
    const cleanWord = String(word).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => _normMasteredKey(typeof item === 'string' ? item : item.word) === clean);

    let nowMastered = false;
    if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        nowMastered = false;
        showToast(`已取消“${cleanWord}”的熟词标记`);
    } else {
        list.push({
            word: cleanWord,
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        nowMastered = true;
        showToast(`已将“${cleanWord}”标为熟词`);
    }
    saveMasteredWords(list);
    return nowMastered;
}

function ensureWordMastered(word, phone = '', meaning = '') {
    if (!currentUser || !word) return;
    const clean = _normMasteredKey(word);
    const cleanWord = String(word).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => _normMasteredKey(typeof item === 'string' ? item : item.word) === clean);
    if (existingIdx < 0) {
        list.push({
            word: cleanWord,
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        saveMasteredWords(list);
    }
}

function removeWordMastered(word) {
    if (!currentUser || !word) return;
    const clean = _normMasteredKey(word);
    let list = getMasteredWords();
    const nextList = list.filter(item => _normMasteredKey(typeof item === 'string' ? item : item.word) !== clean);
    if (nextList.length !== list.length) {
        saveMasteredWords(nextList);
    }
}

function toggleCurrentWordMastered() {
    if (!singleState || !singleState.pool || singleState.currentIdx >= singleState.pool.length) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || !q.word) return;
    const nowMastered = toggleMasteredWord(q.word, q.phone, q.meaning);
    updateSingleCardToolbar(q);
    const targetClean = (q.word || '').trim().toLowerCase();
    if (nowMastered) {
        // 标注熟词后播放加星动画，允许继续答题或直接点击“下一题”
        renderCardMasteryDiamonds(q.word, 'gain');

        // 标为熟词后，在本组学习中也不要再抽取：过滤后续待学 pool 中该词的所有项（含错题即时复测题）
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
        if (!q.answered && singleState.completedWords) {
            singleState.completedWords.delete(targetClean);
        }
        renderCardMasteryDiamonds(q.word, 'loss');
        saveSingleProgress();
    }

    // 未答题状态下，若已标为熟词，底部按钮切换为“下一题”，取消标注则恢复“看答案”
    if (!singleState.answered) {
        const nextBtn = document.getElementById('single-next-btn');
        if (nextBtn) {
            nextBtn.style.display = 'flex';
            if (nowMastered) {
                nextBtn.className = 'single-next-btn';
                nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
            } else {
                nextBtn.className = 'single-next-btn show-answer-mode';
                nextBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px;">skip_next</span><span class="btn-label-text">看答案</span>';
            }
        }
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
        masterBtn.disabled = false;
        masterBtn.style.opacity = '1';
        masterBtn.style.cursor = 'pointer';
        masterBtn.title = isMastered ? '已标注熟词（点击取消）' : '标注熟词（不再抽取）';
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

    // 控制“上一个”与“下一个”按钮
    const prevBtn = document.getElementById('btn-card-prev');
    const returnBtn = document.getElementById('btn-card-return');
    if (singleState) {
        if (typeof singleState.maxReachedIdx !== 'number' || singleState.currentIdx > singleState.maxReachedIdx) {
            singleState.maxReachedIdx = singleState.currentIdx;
        }
        const canGoPrev = singleState.currentIdx > 0;
        const canReturn = singleState.currentIdx < singleState.maxReachedIdx;
        if (prevBtn) {
            prevBtn.style.display = 'inline-flex';
            prevBtn.disabled = !canGoPrev;
            prevBtn.style.opacity = canGoPrev ? '1' : '0.35';
            prevBtn.style.cursor = canGoPrev ? 'pointer' : 'not-allowed';
        }
        if (returnBtn) {
            returnBtn.style.display = 'inline-flex';
            returnBtn.disabled = !canReturn;
            returnBtn.style.opacity = canReturn ? '1' : '0.35';
            returnBtn.style.cursor = canReturn ? 'pointer' : 'not-allowed';
            returnBtn.classList.toggle('return-highlight', canReturn);
        }
    }
}

function viewPreviousSingleQuestion() {
    if (!singleState || !singleState.pool || singleState.currentIdx <= 0) return;
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    if (typeof singleState.maxReachedIdx !== 'number' || singleState.currentIdx > singleState.maxReachedIdx) {
        singleState.maxReachedIdx = singleState.currentIdx;
    }
    singleState.currentIdx--;
    renderSingleQuestion();
}
window.viewPreviousSingleQuestion = viewPreviousSingleQuestion;

function returnToCurrentSingleQuestion() {
    if (!singleState || !singleState.pool) return;
    if (typeof singleState.maxReachedIdx === 'number' && singleState.currentIdx < singleState.maxReachedIdx) {
        if (singlePhraseTimer) {
            clearTimeout(singlePhraseTimer);
            singlePhraseTimer = null;
        }
        singleState.currentIdx++;
        renderSingleQuestion();
    }
}
window.returnToCurrentSingleQuestion = returnToCurrentSingleQuestion;

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

    if (typeof singleState.maxReachedIdx !== 'number' || singleState.currentIdx > singleState.maxReachedIdx) {
        singleState.maxReachedIdx = singleState.currentIdx;
    }
    const isHistoryView = singleState.currentIdx < singleState.maxReachedIdx;
    const q = singleState.pool[singleState.currentIdx];
    const alreadyAnswered = Boolean(isHistoryView || q.answered);
    singleState.answered = alreadyAnswered;
    singleState.selectedIdx = (q.userAnswerIdx !== undefined) ? q.userAnswerIdx : -1;

    const isPhrase = Boolean(q.isPhrase !== undefined ? q.isPhrase : (q.word && q.word.trim().includes(' ') && (!q.senses || q.senses.length === 0) && (!q.options || q.options.length === 0 || (q.phraseChips && q.phraseChips.length > 0))));

    if (singleConfig.autoPlayAudio && navigator.onLine && q && q.word && (!isPhrase || alreadyAnswered)) {
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
        const isPreMastered = !alreadyAnswered && typeof isWordMastered === 'function' && isWordMastered(q.word);
        if (alreadyAnswered || isPreMastered) {
            nextBtn.className = 'single-next-btn';
            nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
        } else {
            nextBtn.className = 'single-next-btn show-answer-mode';
            nextBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px;">skip_next</span><span class="btn-label-text">看答案</span>';
        }
    }

    if (isPhrase) {
        renderSinglePhraseQuestion(q);
        if (alreadyAnswered) {
            singlePhraseState.targetWords.forEach((tw, i) => {
                const slotEl = document.getElementById(`single-slot-${i}`);
                if (!slotEl || isFixedPhraseToken(tw)) return;
                slotEl.classList.remove('empty', 'wrong');
                slotEl.classList.add('filled', 'correct');
                slotEl.innerText = tw;
            });
            if (wordEl) {
                wordEl.style.display = 'block';
                wordEl.innerText = q.word;
                wordEl.style.color = '#15803d';
                wordEl.style.fontSize = '2.1rem';
                wordEl.style.fontWeight = '800';
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
        }
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
        if (alreadyAnswered) {
            const isCorrectOpt = idx === q.correctIdx;
            const isWrongOpt = !q.isCorrect && q.userAnswerIdx === idx;
            const cls = isCorrectOpt ? 'correct' : (isWrongOpt ? 'wrong' : '');
            html += `
                <button class="single-opt-btn ${cls}" id="single-opt-${idx}" disabled>
                    <span class="opt-word">${escapeHtml(opt.word)}</span> <span class="opt-trans">${escapeHtml(opt.meaning)}</span>
                </button>
            `;
        } else {
            html += `
                <button class="single-opt-btn" id="single-opt-${idx}" onclick="handleSingleAnswer(${idx})">
                    <span class="opt-trans">${opt.meaning}</span>
                </button>
            `;
        }
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

    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    const phraseMeaning = q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : '');

    if (isRight) {
        userStats.correct++;
        singleState.score++;
        const wKey = (q.word || '').trim().toLowerCase();
        const normKey = wKey.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        const hasRemainingInPool = singleState.pool.slice(singleState.currentIdx + 1).some(item => {
            const ik = (item.word || '').trim().toLowerCase();
            return ik === wKey || ik.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() === normKey;
        });
        if (!hasRemainingInPool) {
            if (!singleState.completedWords) singleState.completedWords = new Set();
            singleState.completedWords.add(normKey);
        }
        q.isCorrect = true;
        q.answered = true;
        q.wrongSlotIndices = [];

        EbbinghausEngine.recordWord(q.word, phraseMeaning, q.phone, true, currentBookId);
        renderCardMasteryDiamonds(q.word, 'gain');
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record(singleState.sessionName === '复习' ? 'reviewed' : 'learned', 1);
        }
        updateSingleProgressDisplay();
        saveCurrentUserData();

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
        if (singleConfig.autoPlayAudio && navigator.onLine && q.word) {
            playWordAudio(q.word);
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
        const normKey = _normMasteredKey(q.word);
        if (singleState.completedWords) {
            singleState.completedWords.delete(wKey);
            singleState.completedWords.delete(normKey);
        }
        if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
        const isFirstWrongOnThisQ = !q._hasRecordedWrong;
        q._hasRecordedWrong = true;
        singleState.sessionMistakes.add(normKey);
        if (isFirstWrongOnThisQ) {
            EbbinghausEngine.recordWord(q.word, phraseMeaning, q.phone, false, currentBookId);
            renderCardMasteryDiamonds(q.word, 'loss');
            scheduleRetestForCurrentQuestion();
        }
        saveCurrentUserData();
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
    const normKey = _normMasteredKey(q.word);
    if (singleState.completedWords) {
        singleState.completedWords.delete(wKey);
        singleState.completedWords.delete(normKey);
    }
    if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
    singleState.sessionMistakes.add(normKey);
    userStats.total++;
    singleState.total++;
    recordUserMistake(currentUser, q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone);
    scheduleRetestForCurrentQuestion();
    updateSingleProgressDisplay();
    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    EbbinghausEngine.recordWord(q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone, false, currentBookId);
    renderCardMasteryDiamonds(q.word, 'loss');

    const isPhrase = Boolean(q.isPhrase !== undefined ? q.isPhrase : (q.word && q.word.trim().includes(' ') && (!q.senses || q.senses.length === 0) && (!q.options || q.options.length === 0 || (q.phraseChips && q.phraseChips.length > 0))));
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
    if (!isRight) q.wrongAnswerIdx = idx;
    q.answered = true;

    userStats.total++;
    singleState.total++;

    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    if (isRight) {
        userStats.correct++;
        singleState.score++;
        const wKey = (q.word || '').trim().toLowerCase();
        const normKey = wKey.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        const hasRemainingInPool = singleState.pool.slice(singleState.currentIdx + 1).some(item => {
            const ik = (item.word || '').trim().toLowerCase();
            return ik === wKey || ik.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() === normKey;
        });
        if (!hasRemainingInPool) {
            if (!singleState.completedWords) singleState.completedWords = new Set();
            singleState.completedWords.add(normKey);
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
        const normKey = _normMasteredKey(q.word);
        if (singleState.completedWords) {
            singleState.completedWords.delete(wKey);
            singleState.completedWords.delete(normKey);
        }
        if (!singleState.sessionMistakes) singleState.sessionMistakes = new Set();
        singleState.sessionMistakes.add(normKey);
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
    const q = (singleState && singleState.pool) ? singleState.pool[singleState.currentIdx] : null;
    const isMasteredUnanswered = Boolean(q && !singleState.answered && typeof isWordMastered === 'function' && isWordMastered(q.word));
    if (isMasteredUnanswered) {
        q.answered = true;
        q.isCorrect = true;
        q.skippedAsMastered = true;
    } else if (!forceAdvance && !singleState.answered) {
        revealSingleAnswer();
        return;
    }
    singleState.currentIdx++;
    saveSingleProgress();
    renderSingleQuestion();
}

function endSingleGame() {
    const isReviewMode = (singleState && singleState.sessionName === '复习');
    if (currentUser) {
        localStorage.removeItem(`single_progress_${currentUser}`);
        localStorage.removeItem(isReviewMode ? `single_review_progress_${currentUser}` : `single_learn_progress_${currentUser}`);
        updateHubResumeButtons();
    }
    if (window.EbbinghausEngine) {
        EbbinghausEngine.updateDueBadge();
    }
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
                        if (Array.isArray(w.senses)) {
                            w.senses.forEach(s => {
                                const pos = s.part_of_speech || s.pos || '';
                                const mText = Array.isArray(s.trans) ? s.trans.join('；') : (s.meaning || s.trans || '');
                                if (mText) addClean((pos ? pos + ' ' : '') + mText);
                            });
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

function formatWordAllMeanings(w) {
    if (!w) return '---';
    if (Array.isArray(w.meanings) && w.meanings.length > 0) {
        const parts = [];
        w.meanings.forEach(m => {
            if (!m) return;
            const str = ((m.pos ? m.pos + ' ' : '') + (m.meaning || '')).trim();
            if (str && str !== '---' && !parts.includes(str)) {
                parts.push(str);
            }
        });
        if (parts.length > 0) return parts.join(' ');
    }
    if (w.meaning && typeof w.meaning === 'string' && w.meaning.trim() !== '---') {
        return w.meaning.trim();
    }
    return '---';
}

function getWordDistractorMeaning(d, usedMeanings, targetForbiddenMeanings = new Set(), meaningMode = 'all') {
    if (!d) return null;
    const candidates = [];
    if (meaningMode !== 'random') {
        const combined = formatWordAllMeanings(d);
        if (combined && combined !== '---') {
            candidates.push(combined);
        }
    }
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
        if (meaningMode !== 'random') {
            return available[0];
        }
        return available[Math.floor(Math.random() * available.length)];
    }
    return null;
}

function getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride, meaningMode = 'all') {
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
        const meaning = getWordDistractorMeaning(cand, usedMeanings, targetForbiddenMeanings, meaningMode);
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
            const meaning = getWordDistractorMeaning(cand, usedMeanings, targetForbiddenMeanings, meaningMode);
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

function generateOptions(targetWord, correctMeaning, poolOverride, meaningMode = 'all') {
    const distractors = getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride, meaningMode);
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

function generateShuffledPoolFromWords(wordsList, count = 70, meaningMode = 'all') {
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

        const isShiCiItem = Boolean(
            w.isShiCi ||
            (w.bookName && (String(w.bookName).includes('实词') || String(w.bookName).includes('文言'))) ||
            (w.bookId && (String(w.bookId).includes('实词') || String(w.bookId).includes('文言'))) ||
            (!/[a-zA-Z]/.test(w.word || '') && Array.isArray(w.senses) && w.senses.length > 0)
        );
        if (isShiCiItem && w.senses && Array.isArray(w.senses) && w.senses.length > 0) {
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

        if (meaningMode === 'random') {
            const selected = (w.meanings && w.meanings.length > 0) ? w.meanings[Math.floor(Math.random() * w.meanings.length)] : { pos: '', meaning: w.meaning || '---' };
            fullMeaning = ((selected.pos ? selected.pos + ' ' : '') + (selected.meaning || '')).trim();
        } else {
            fullMeaning = formatWordAllMeanings(w);
        }
        const optData = generateOptions(w.word, fullMeaning, list, meaningMode);
        options = optData.options;
        correctIdx = optData.correctIdx;

        const isPhrase = Boolean(w.word && w.word.trim().includes(' ') && (!w.senses || w.senses.length === 0));
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
            isPhrase: isPhrase,
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

            // 渲染我的道具入口与徽标 (离线模式或未登录账号不显示)
            const myItemsRow = document.getElementById('me-row-my-items');
            if (myItemsRow) {
                const isOnlineAccount = currentUserProfile && currentUserProfile.isLoggedIn && (currentUserProfile.type === 'cloud' || currentUserProfile.type === 'bilibili');
                const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
                if (isOnlineAccount && !isOffline) {
                    myItemsRow.style.display = 'flex';
                    if (typeof ItemManager !== 'undefined') {
                        ItemManager.updateBadge();
                    }
                } else {
                    myItemsRow.style.display = 'none';
                }
            }
        }
    }

    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%`;
    }

    // 更新个人中心的数据中心统计卡片（今日学习&复习数、累计学习&复习数、今日学习时长、累计学习时长）
    const summaryStats = (window.DailyStudyTracker && typeof DailyStudyTracker.getSummaryStats === 'function')
        ? DailyStudyTracker.getSummaryStats()
        : { todayWords: 0, totalWords: userStats.total || 0, todayDurationSeconds: 0, totalDurationSeconds: 0 };

    const elTodayWords = document.getElementById('me-stat-today-words');
    const elTotalWords = document.getElementById('me-stat-total-words');
    const elTodayDuration = document.getElementById('me-stat-today-duration');
    const elTotalDuration = document.getElementById('me-stat-total-duration');
    const todayW = (summaryStats && typeof summaryStats.todayWords === 'number')
        ? summaryStats.todayWords
        : ((summaryStats && typeof summaryStats.todayLearnAndReview === 'number')
            ? summaryStats.todayLearnAndReview
            : 0);

    const totalW = (summaryStats && typeof summaryStats.totalWords === 'number')
        ? summaryStats.totalWords
        : ((summaryStats && typeof summaryStats.totalLearnAndReview === 'number')
            ? summaryStats.totalLearnAndReview
            : (userStats.total || 0));

    if (elTodayWords) elTodayWords.innerText = todayW;
    if (elTotalWords) elTotalWords.innerText = totalW;
    if (elTodayDuration) {
        const todayDurStr = (window.DailyStudyTracker && typeof DailyStudyTracker.formatDuration === 'function')
            ? DailyStudyTracker.formatDuration(summaryStats.todayDurationSeconds || 0)
            : '0分钟';
        elTodayDuration.innerHTML = formatDurationAccentHtml(todayDurStr);
    }
    if (elTotalDuration) {
        const totalDurStr = (window.DailyStudyTracker && typeof DailyStudyTracker.formatDuration === 'function')
            ? DailyStudyTracker.formatDuration(summaryStats.totalDurationSeconds || 0)
            : '0分钟';
        elTotalDuration.innerHTML = formatDurationAccentHtml(totalDurStr);
    }

    // 兼容旧统计元素
    const statTotalEl = document.getElementById('stat-total');
    const statAccEl = document.getElementById('stat-acc');
    if (statTotalEl) statTotalEl.innerText = summaryStats.totalWords || 0;
    if (statAccEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statAccEl.innerText = `${acc}%`;
    }

    // 渲染“我的词书”板块最近学习的词书卡片
    renderMeRecentBookCard();

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

    const trashSummaryEl = document.getElementById('settings-trash-summary-text');
    if (trashSummaryEl) {
        const tCount = getTrashWords().length;
        trashSummaryEl.innerText = `共 ${tCount} 个已删词汇`;
    }

    const reviewPlanSummaryEl = document.getElementById('me-review-plan-summary-text');
    if (reviewPlanSummaryEl && window.EbbinghausEngine && typeof EbbinghausEngine.getScheduledReviewWords === 'function') {
        const scheduled = EbbinghausEngine.getScheduledReviewWords();
        const dueNow = scheduled.filter(item => item.isDue).length;
        reviewPlanSummaryEl.innerText = dueNow > 0
            ? `共 ${scheduled.length} 词在列，其中 ${dueNow} 词待立即复习`
            : `共 ${scheduled.length} 个计划复习词汇`;
    }

    const autoSyncSwitch = document.getElementById('switch-auto-sync');
    if (autoSyncSwitch) {
        autoSyncSwitch.checked = typeof isAutoSyncEnabled === 'function' ? isAutoSyncEnabled() : true;
    }

    const meShareBtn = document.getElementById('btn-me-share-poster');
    if (meShareBtn) {
        meShareBtn.style.display = 'inline-flex';
    }
}

function getMostRecentStudiedBook() {
    const allBooks = [];
    if (typeof BookManager !== 'undefined') {
        const base = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
            ? BookManager.availableBooks
            : (BookManager.fallbackBooks || []);
        base.forEach(b => {
            if (!BookManager.cloudFetchSuccess || b.id !== 'builtin_default') {
                allBooks.push(b);
            }
        });
    }
    if (Array.isArray(window.customBooks)) {
        window.customBooks.forEach(cb => {
            if (!allBooks.some(b => b.id === cb.id)) allBooks.push(cb);
        });
    }
    if (allBooks.length === 0) return null;

    let targetId = null;
    if (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds) && singleSelectedBookIds.length > 0) {
        targetId = singleSelectedBookIds[0];
    }
    if (!targetId) {
        try {
            const saved = JSON.parse(localStorage.getItem('vocab_single_selected_books') || '[]');
            if (Array.isArray(saved) && saved.length > 0) targetId = saved[0];
        } catch (e) {}
    }
    if (targetId) {
        const matched = allBooks.find(b => b.id === targetId || (typeof isBookIdSelected === 'function' && isBookIdSelected([targetId], b.id)));
        if (matched) return matched;
    }
    return allBooks[0];
}

function renderMeRecentBookCard() {
    const container = document.getElementById('me-recent-book-card-container');
    if (!container) return;

    const book = getMostRecentStudiedBook();
    if (!book) {
        container.innerHTML = `
            <div class="me-recent-book-empty" onclick="openMeSubview('books')">
                <span class="material-symbols-rounded" style="font-size:28px; color:var(--md-sys-color-primary);">menu_book</span>
                <div>
                    <div style="font-weight:700; color:var(--md-sys-color-on-surface);">暂无最近学习的词书</div>
                    <div style="font-size:0.8rem; color:var(--md-sys-color-outline); margin-top:2px;">点击前往词书管理选择或导入词书</div>
                </div>
            </div>
        `;
        return;
    }

    const cachedWords = (typeof BookManager !== 'undefined' && BookManager.bookCache && BookManager.bookCache[book.id])
        ? BookManager.bookCache[book.id]
        : (Array.isArray(book.words) ? book.words : null);

    // 如果尚未加载该词书词表，异步加载一次以精确计算总词数和进度
    if (!cachedWords && typeof BookManager !== 'undefined' && typeof BookManager.loadBookById === 'function' && !book._meLoadingWords) {
        book._meLoadingWords = true;
        BookManager.loadBookById(book.id).then(() => {
            book._meLoadingWords = false;
            renderMeRecentBookCard();
        }).catch(() => {
            book._meLoadingWords = false;
        });
    }

    const fallbackTotal = (book.count && book.count > 0) ? book.count : (cachedWords ? cachedWords.length : 0);
    const prog = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookLearnedProgress === 'function')
        ? EbbinghausEngine.getBookLearnedProgress(book.id, cachedWords, fallbackTotal)
        : { learnedCount: 0, totalWords: fallbackTotal };

    const total = prog.totalWords || fallbackTotal || 0;
    const learned = Math.min(total || prog.learnedCount, prog.learnedCount || 0);
    const pct = total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0;
    const rawTitle = (book.rawName || book.name || '未命名词书').replace(/^[📂📁\s]+/, '');
    const title = (typeof cleanBookName === 'function') ? cleanBookName(rawTitle) : rawTitle;
    const isCustom = String(book.id).startsWith('custom_') || (window.customBooks || []).some(cb => cb.id === book.id);
    const scopeSummary = (typeof getBookScopeSummaryText === 'function') ? getBookScopeSummaryText(book.id) : '';
    const escapedId = escapeHtml(book.id);

    const coverUrl = (book.cover && typeof book.cover === 'string' && book.cover.trim()) ? book.cover.trim() : null;
    const gradient = (typeof getProceduralBookGradient === 'function')
        ? getProceduralBookGradient(book.id || book.name, book.category || '')
        : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';

    const bookMeta = (typeof BookManager !== 'undefined' && typeof BookManager.getBookMeta === 'function')
        ? BookManager.getBookMeta(book.id)
        : null;
    const hasUpdate = Boolean(bookMeta && bookMeta.isCloud && bookMeta.syncStatus === 'update_available');

    const supportsSections = (typeof doesBookSupportSections === 'function') ? doesBookSupportSections(book) : false;
    const supportsTypes = (typeof doesBookSupportTypes === 'function') ? doesBookSupportTypes(book) : false;
    const sectionSummary = (supportsSections && typeof getBookSectionFilterSummaryText === 'function')
        ? getBookSectionFilterSummaryText(book.id)
        : '全部板块';
    const typeSummary = (supportsTypes && typeof getBookTypeFilterSummaryText === 'function')
        ? getBookTypeFilterSummaryText(book.id)
        : '全部类型';

    const scopeButtonsHtml = [
        supportsSections
            ? `<button type="button" class="me-recent-book-scope-pill clickable" onclick="event.stopPropagation(); if (typeof toggleBookSectionDropdown === 'function') toggleBookSectionDropdown(event, '${escapedId}');" title="点击筛选学习板块">
                   <span class="material-symbols-rounded" style="font-size:15px;">segment</span>
                   <span>${escapeHtml(sectionSummary)}</span>
                   <span class="material-symbols-rounded" style="font-size:15px; opacity:0.7;">expand_more</span>
               </button>`
            : '',
        supportsTypes
            ? `<button type="button" class="me-recent-book-scope-pill clickable" onclick="event.stopPropagation(); if (typeof toggleBookTypeDropdown === 'function') toggleBookTypeDropdown(event, '${escapedId}');" title="点击筛选单词/词组">
                   <span class="material-symbols-rounded" style="font-size:15px;">filter_list</span>
                   <span>${escapeHtml(typeSummary)}</span>
                   <span class="material-symbols-rounded" style="font-size:15px; opacity:0.7;">expand_more</span>
               </button>`
            : ''
    ].filter(Boolean).join('');

    container.innerHTML = `
        <div class="me-recent-book-card">
            <div class="me-recent-book-top">
                <div class="book-cover-wrap me-recent-book-cover-wrap" onclick="openBookContentPage('${escapedId}')" title="点击查看词书内容">
                    ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                    <div class="book-cover-art" style="background:${gradient}; ${coverUrl ? 'display:none;' : ''}">
                        <span class="book-cover-art-title">${escapeHtml(title)}</span>
                    </div>
                </div>
                <div class="me-recent-book-info">
                    <div class="me-recent-book-title-row" onclick="openBookContentPage('${escapedId}')" style="cursor:pointer;">
                        <span class="me-recent-book-title">${escapeHtml(title)}</span>
                        <span class="material-symbols-rounded me-recent-book-title-arrow">chevron_right</span>
                    </div>
                    ${scopeButtonsHtml ? `<div class="me-recent-book-meta">${scopeButtonsHtml}</div>` : ''}
                    <div class="me-recent-book-inline-progress">
                        <div class="me-recent-book-progress-labels">
                            <span>学习进度：已学 <strong>${learned}</strong> / ${total} 词</span>
                            <span class="me-recent-book-progress-pct">${pct}%</span>
                        </div>
                        <div class="me-recent-book-progress-track">
                            <div class="me-recent-book-progress-fill" style="width:${pct}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="me-recent-book-actions-wrap" style="position:relative;">
                    <button type="button" id="me-recent-book-more-btn" class="icon-btn me-recent-book-more-btn" onclick="toggleMeRecentBookMenu(event, '${escapedId}')" title="更多操作">
                        <span class="material-symbols-rounded">more_horiz</span>
                    </button>
                    <div id="me-recent-book-more-menu" class="me-recent-book-dropdown-menu" style="display:none;" onclick="event.stopPropagation()">
                        <button type="button" class="book-action-item" onclick="handleMeRecentBookAction('content', '${escapedId}', event)">
                            <span class="material-symbols-rounded">visibility</span>
                            <span>查看内容</span>
                        </button>
                        <button type="button" class="book-action-item" onclick="handleMeRecentBookAction('reset', '${escapedId}', event)">
                            <span class="material-symbols-rounded">restart_alt</span>
                            <span>重学词书</span>
                        </button>
                        <button type="button" class="book-action-item" ${!hasUpdate ? 'disabled style="opacity:0.45; cursor:not-allowed;" title="已是最新版本"' : `onclick="handleMeRecentBookAction('update', '${escapedId}', event)"`}>
                            <span class="material-symbols-rounded">cloud_sync</span>
                            <span>更新词书</span>
                        </button>
                        <div style="height:1px; background:var(--md-sys-color-outline-variant, #e2e8f0); margin:4px 6px;"></div>
                        <button type="button" class="book-action-item danger" onclick="handleMeRecentBookAction('delete', '${escapedId}', event)">
                            <span class="material-symbols-rounded">delete</span>
                            <span>删除词书</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
window.renderMeRecentBookCard = renderMeRecentBookCard;

function closeMeRecentBookScopeMenu() {
    const scopeMenu = document.getElementById('me-recent-book-scope-menu');
    if (scopeMenu) {
        scopeMenu.style.display = 'none';
        scopeMenu.classList.remove('align-right', 'flip-up');
    }
}
window.closeMeRecentBookScopeMenu = closeMeRecentBookScopeMenu;

async function openMeRecentBookScopeMenu(bookId, anchorEl, event) {
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    const moreMenu = document.getElementById('me-recent-book-more-menu');
    if (moreMenu) moreMenu.style.display = 'none';

    const scopeMenu = document.getElementById('me-recent-book-scope-menu');
    if (!scopeMenu || !bookId || typeof BookManager === 'undefined') return;

    const book = BookManager.getBookMeta ? BookManager.getBookMeta(bookId) : null;
    if (!book) return;

    const supportsSections = typeof doesBookSupportSections === 'function' ? doesBookSupportSections(book) : false;
    const supportsTypes = typeof doesBookSupportTypes === 'function' ? doesBookSupportTypes(book) : false;
    if (!supportsSections && !supportsTypes) {
        if (typeof showToast === 'function') showToast('该词书默认学习全部词汇');
        return;
    }

    const anchor = anchorEl || document.getElementById('me-recent-book-more-btn');
    scopeMenu.dataset.bookId = bookId;
    scopeMenu.innerHTML = `<div style="padding:14px; text-align:center; font-size:0.82rem; color:var(--md-sys-color-outline);">加载范围中...</div>`;

    if (typeof mountAnchoredBookDropdown === 'function' && anchor) {
        mountAnchoredBookDropdown(scopeMenu, anchor, 'right');
    } else {
        scopeMenu.style.display = 'flex';
    }

    const words = supportsSections ? await BookManager.loadBookData(bookId) : [];
    if (scopeMenu.dataset.bookId !== bookId) return;

    const sectionCounts = {};
    const sectionList = [];
    if (supportsSections && Array.isArray(words)) {
        words.forEach(w => {
            if (!w) return;
            const sec = (w.section || '').trim().toLowerCase();
            if (sec) {
                if (!sectionCounts[sec]) {
                    sectionCounts[sec] = 0;
                    sectionList.push(sec);
                }
                sectionCounts[sec]++;
            }
        });
        if (sectionList.length === 0 && words.length > 0) {
            const letterSet = new Set();
            words.forEach(w => {
                const first = (w.word || '').trim().charAt(0).toLowerCase();
                if (/^[a-z]$/.test(first)) {
                    letterSet.add(first);
                    sectionCounts[first] = (sectionCounts[first] || 0) + 1;
                }
            });
            if (letterSet.size >= 2) {
                sectionList.push(...Array.from(letterSet).sort());
            }
        } else {
            sectionList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        }
    }

    const savedFilter = BookManager.getBookStudyFilter(bookId) || {};
    const escapedBookId = escapeHtml(bookId);
    const hasSectionOpts = supportsSections && sectionList.length > 0;
    const selectedSet = (savedFilter && Array.isArray(savedFilter.sections) && !savedFilter.isAll)
        ? new Set(savedFilter.sections.map(s => s.toLowerCase()))
        : null;
    const isAllSecSelected = hasSectionOpts && (!selectedSet || selectedSet.size >= sectionList.length);

    const isAllTypes = !savedFilter.types || savedFilter.types.length === 0 || savedFilter.types.length === 2;
    const isWordChecked = isAllTypes || savedFilter.types.includes('word');
    const isPhraseChecked = isAllTypes || savedFilter.types.includes('phrase');

    scopeMenu.innerHTML = `
        <div class="book-dd-header" style="padding:8px 10px 6px;">
            <span class="book-dd-title"><span class="material-symbols-rounded" style="font-size:16px; margin-right:4px;">tune</span>选择学习范围</span>
            ${hasSectionOpts ? `<label class="book-dd-select-all-chip" style="cursor:pointer;">
                <input type="checkbox" id="me-scope-all-sections" ${isAllSecSelected ? 'checked' : ''} onchange="toggleAllMeScopeSections('${escapedBookId}', this.checked)">
                <span>全选分类</span>
            </label>` : ''}
        </div>
        ${hasSectionOpts ? `
        <div class="me-scope-section-title">词书分类</div>
        <div class="me-scope-sections-list">
            ${sectionList.map(sec => {
                const checked = selectedSet ? selectedSet.has(sec) : true;
                return `<label class="book-dd-check-row ${checked ? 'active' : ''}">
                    <input type="checkbox" class="me-scope-sec-cb book-dd-checkbox" value="${escapeHtml(sec)}" ${checked ? 'checked' : ''} onchange="handleMeScopeOptionChange('${escapedBookId}')">
                    <span class="book-dd-row-name">${escapeHtml(sec.toUpperCase())}</span>
                    <span class="book-dd-row-count">${sectionCounts[sec] || 0} 词</span>
                </label>`;
            }).join('')}
        </div>` : ''}
        ${supportsTypes ? `
        <div class="me-scope-section-title">词条类型</div>
        <div class="me-scope-types-list">
            <label class="book-dd-check-row ${isWordChecked ? 'active' : ''}">
                <input type="checkbox" id="me-scope-type-word" class="book-dd-checkbox" ${isWordChecked ? 'checked' : ''} onchange="handleMeScopeOptionChange('${escapedBookId}', 'word')">
                <span class="book-dd-row-name">单词</span>
            </label>
            <label class="book-dd-check-row ${isPhraseChecked ? 'active' : ''}">
                <input type="checkbox" id="me-scope-type-phrase" class="book-dd-checkbox" ${isPhraseChecked ? 'checked' : ''} onchange="handleMeScopeOptionChange('${escapedBookId}', 'phrase')">
                <span class="book-dd-row-name">词组</span>
            </label>
        </div>` : ''}
        <div class="me-scope-footer">
            <button type="button" class="btn btn-filled btn-sm" style="width:100%; height:32px; border-radius:99px;" onclick="closeMeRecentBookScopeMenu()">完成</button>
        </div>
    `;

    if (typeof mountAnchoredBookDropdown === 'function' && anchor) {
        mountAnchoredBookDropdown(scopeMenu, anchor, 'right');
    }
}
window.openMeRecentBookScopeMenu = openMeRecentBookScopeMenu;

function toggleAllMeScopeSections(bookId, checked) {
    const cbs = Array.from(document.querySelectorAll('#me-recent-book-scope-menu .me-scope-sec-cb'));
    if (cbs.length === 0) return;
    if (!checked && cbs.length > 0) {
        // 至少保留第一项，避免空选
        cbs.forEach((cb, i) => {
            cb.checked = i === 0;
            const row = cb.closest('.book-dd-check-row');
            if (row) row.classList.toggle('active', cb.checked);
        });
    } else {
        cbs.forEach(cb => {
            cb.checked = true;
            const row = cb.closest('.book-dd-check-row');
            if (row) row.classList.add('active');
        });
    }
    handleMeScopeOptionChange(bookId);
}
window.toggleAllMeScopeSections = toggleAllMeScopeSections;

function handleMeScopeOptionChange(bookId, changedType = null) {
    if (!bookId || typeof BookManager === 'undefined') return;
    const secCbs = Array.from(document.querySelectorAll('#me-recent-book-scope-menu .me-scope-sec-cb'));
    if (secCbs.length > 0) {
        const checkedSec = secCbs.filter(cb => cb.checked);
        if (checkedSec.length === 0) {
            secCbs[0].checked = true;
        }
        secCbs.forEach(cb => {
            const row = cb.closest('.book-dd-check-row');
            if (row) row.classList.toggle('active', cb.checked);
        });
        const allSecCb = document.getElementById('me-scope-all-sections');
        if (allSecCb) {
            allSecCb.checked = secCbs.every(cb => cb.checked);
        }
    }

    const wordCb = document.getElementById('me-scope-type-word');
    const phraseCb = document.getElementById('me-scope-type-phrase');
    if (wordCb && phraseCb) {
        if (!wordCb.checked && !phraseCb.checked) {
            if (changedType === 'word') phraseCb.checked = true;
            else wordCb.checked = true;
        }
        const wordRow = wordCb.closest('.book-dd-check-row');
        const phraseRow = phraseCb.closest('.book-dd-check-row');
        if (wordRow) wordRow.classList.toggle('active', wordCb.checked);
        if (phraseRow) phraseRow.classList.toggle('active', phraseCb.checked);
    }

    const curFilter = BookManager.getBookStudyFilter(bookId) || {};
    if (secCbs.length > 0) {
        const selectedSections = secCbs.filter(cb => cb.checked).map(cb => cb.value.toLowerCase());
        const isAllSecs = selectedSections.length === secCbs.length;
        curFilter.sections = isAllSecs ? null : selectedSections;
    }
    if (wordCb && phraseCb) {
        const allowW = wordCb.checked;
        const allowP = phraseCb.checked;
        curFilter.types = (allowW && allowP) ? null : [allowW ? 'word' : null, allowP ? 'phrase' : null].filter(Boolean);
    }
    const isAllSecsFinal = !curFilter.sections || curFilter.sections.length === 0;
    const isAllTypesFinal = !curFilter.types || curFilter.types.length === 0 || curFilter.types.length === 2;
    curFilter.isAll = isAllSecsFinal && isAllTypesFinal;

    BookManager.setBookStudyFilter(bookId, curFilter);
    renderMeRecentBookCard();
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderSingleBookList === 'function') renderSingleBookList();
}
window.handleMeScopeOptionChange = handleMeScopeOptionChange;

function toggleMeRecentBookMenu(event, bookId) {
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    closeMeRecentBookScopeMenu();
    const menu = document.getElementById('me-recent-book-more-menu');
    if (!menu) return;
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
}
window.toggleMeRecentBookMenu = toggleMeRecentBookMenu;

document.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('me-recent-book-more-menu');
    if (menu && menu.style.display !== 'none') {
        const wrap = menu.closest('.me-recent-book-actions-wrap');
        if (!wrap || !wrap.contains(e.target)) {
            menu.style.display = 'none';
        }
    }
    const scopeMenu = document.getElementById('me-recent-book-scope-menu');
    if (scopeMenu && scopeMenu.style.display !== 'none') {
        if (!scopeMenu.contains(e.target) && !(e.target.closest && e.target.closest('.me-recent-book-scope-pill'))) {
            closeMeRecentBookScopeMenu();
        }
    }
});

async function handleMeRecentBookAction(action, bookId, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('me-recent-book-more-menu');
    if (menu) menu.style.display = 'none';
    if (!bookId) return;

    if (action === 'scope') {
        const btn = document.getElementById('me-recent-book-more-btn');
        await openMeRecentBookScopeMenu(bookId, btn, event);
    } else if (action === 'content') {
        if (typeof openBookContentPage === 'function') {
            openBookContentPage(bookId);
        }
    } else if (action === 'reset') {
        if (typeof actionResetBookProgress === 'function') {
            await actionResetBookProgress(bookId);
            renderMeRecentBookCard();
        }
    } else if (action === 'update') {
        if (typeof actionUpdateSingleBook === 'function') {
            await actionUpdateSingleBook(bookId);
            renderMeRecentBookCard();
        }
    } else if (action === 'delete') {
        if (typeof actionDeleteBook === 'function') {
            await actionDeleteBook(bookId);
            renderMeRecentBookCard();
        }
    }
}
window.handleMeRecentBookAction = handleMeRecentBookAction;

// ----------------- 管理账号子页面 -----------------
function renderAccountManageSubview() {
    const isLoggedIn = currentUserProfile && currentUserProfile.isLoggedIn;
    const isBili = isLoggedIn && currentUserProfile.type === 'bilibili';
    const userDisplayEl = document.getElementById('account-manage-username');
    const typeBadgeEl = document.getElementById('account-manage-type-badge');
    const rowEditUsername = document.getElementById('account-manage-row-username');
    const rowEditPassword = document.getElementById('account-manage-row-password');
    const rowDeleteAccount = document.getElementById('account-manage-row-delete');

    const uname = (currentUserProfile && currentUserProfile.username) || currentUser || '游客';
    if (userDisplayEl) userDisplayEl.innerText = uname;

    // 渲染头像
    const avatarImg = document.getElementById('account-manage-avatar-img');
    const avatarIcon = document.getElementById('account-manage-avatar-icon');
    let avatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(uname) : '';
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

    if (typeBadgeEl) {
        if (!isLoggedIn) {
            typeBadgeEl.innerHTML = `<span class="badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline); font-size:0.75rem; padding:3px 9px; border-radius:10px; font-weight:600;">游客模式</span>`;
        } else if (isBili) {
            typeBadgeEl.innerHTML = `<span class="badge" style="background:#fb7299; color:#fff; font-size:0.75rem; padding:3px 9px; border-radius:10px; font-weight:600;">哔哩哔哩授权账号</span>`;
        } else {
            typeBadgeEl.innerHTML = `<span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-size:0.75rem; padding:3px 9px; border-radius:10px; font-weight:600;">云端账号</span>`;
        }
    }

    // 渲染用户等级与段位积分进度
    if (typeof LevelManager !== 'undefined') {
        const lData = LevelManager.getLevelData(uname);
        const badge = document.getElementById('account-manage-level-badge');
        const expText = document.getElementById('account-manage-level-exp-text');
        const fill = document.getElementById('account-manage-level-progress-fill');

        if (badge) {
            badge.innerText = `${lData.rank}段`;
            badge.title = `段位：${lData.rank}段 | 总等级分：${lData.rating}分`;
        }
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

    if (rowEditUsername) rowEditUsername.style.display = (isLoggedIn && !isBili) ? 'flex' : 'none';
    if (rowEditPassword) rowEditPassword.style.display = (isLoggedIn && !isBili) ? 'flex' : 'none';
    if (rowDeleteAccount) rowDeleteAccount.style.display = isLoggedIn ? 'flex' : 'none';
}
window.renderAccountManageSubview = renderAccountManageSubview;

// ----------------- 详细数据子页面 (图表展示每周/每月学习时长与其他数据) -----------------
let currentDetailedStatsRange = 'week'; // 'week' | 'month'

function switchDetailedStatsRange(range) {
    currentDetailedStatsRange = range === 'month' ? 'month' : 'week';
    renderDetailedStatsSubview(currentDetailedStatsRange);
}
window.switchDetailedStatsRange = switchDetailedStatsRange;

function formatDurationAccentHtml(durText) {
    const raw = String(durText || '0分钟');
    return escapeHtml(raw).replace(/(\d+(?:\.\d+)?)/g, '<span class="stat-num">$1</span>').replace(/([^\d<>]+)(?=<span|$)/g, (m) => {
        if (m.includes('stat-num')) return m;
        return m ? `<small>${m}</small>` : '';
    });
}

const detailedChartLabelState = {
    words: true,
    duration: false
};
let detailedStatsSelectedDateKey = null;

function toggleDetailedChartLabels(chartType, checked) {
    if (chartType !== 'words' && chartType !== 'duration') return;
    detailedChartLabelState[chartType] = Boolean(checked);
    renderDetailedStatsSubview(currentDetailedStatsRange);
}
window.toggleDetailedChartLabels = toggleDetailedChartLabels;

function selectDetailedStatsDay(dateKey) {
    if (!dateKey || detailedStatsSelectedDateKey === dateKey) {
        detailedStatsSelectedDateKey = null;
    } else {
        detailedStatsSelectedDateKey = dateKey;
    }
    renderDetailedStatsSubview(currentDetailedStatsRange);
}
window.selectDetailedStatsDay = selectDetailedStatsDay;

function computeNiceAxisCeiling(rawMax, minFloor = 10) {
    const v = Math.max(minFloor, rawMax || 0);
    if (v <= 10) return 10;
    if (v <= 20) return 20;
    if (v <= 50) return Math.ceil(v / 10) * 10;
    if (v <= 200) return Math.ceil(v / 20) * 20;
    if (v <= 500) return Math.ceil(v / 50) * 50;
    return Math.ceil(v / 100) * 100;
}

function renderDetailedStatsAxesSvg({ svgW, padL, padR, padT, plotH, maxVal, unitSuffix = '' }) {
    const midVal = Math.round(maxVal / 2);
    const baselineY = padT + plotH;
    const midY = padT + plotH / 2;
    return `
        <line x1="${padL}" y1="${padT}" x2="${svgW - padR}" y2="${padT}" stroke="#e2e8f0" stroke-dasharray="3 3" />
        <line x1="${padL}" y1="${midY}" x2="${svgW - padR}" y2="${midY}" stroke="#e2e8f0" stroke-dasharray="3 3" />
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${baselineY}" stroke="#cbd5e1" stroke-width="1" />
        <line x1="${padL}" y1="${baselineY}" x2="${svgW - padR}" y2="${baselineY}" stroke="#cbd5e1" stroke-width="1.2" />
        <text x="${padL - 8}" y="${padT + 4}" text-anchor="end" class="detailed-axis-text">${maxVal}${unitSuffix}</text>
        <text x="${padL - 8}" y="${midY + 4}" text-anchor="end" class="detailed-axis-text">${midVal}${unitSuffix}</text>
        <text x="${padL - 8}" y="${baselineY + 4}" text-anchor="end" class="detailed-axis-text">0${unitSuffix}</text>
    `;
}

function renderDetailedStatsSubview(range = currentDetailedStatsRange) {
    const nextRange = range || 'week';
    if (nextRange !== currentDetailedStatsRange) {
        detailedStatsSelectedDateKey = null;
    }
    currentDetailedStatsRange = nextRange;
    const container = document.getElementById('detailed-stats-content');
    if (!container) return;

    document.querySelectorAll('#detailed-stats-range-tabs .settings-cat-tab').forEach(btn => {
        const isActive = btn.getAttribute('data-range') === currentDetailedStatsRange;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const daysCount = currentDetailedStatsRange === 'month' ? 30 : 7;
    const rangeLabel = currentDetailedStatsRange === 'month' ? '近30天' : '近7天';
    const series = (window.DailyStudyTracker && typeof DailyStudyTracker.getRangeSeries === 'function')
        ? DailyStudyTracker.getRangeSeries(daysCount)
        : [];

    if (detailedStatsSelectedDateKey && !series.some(d => d.dateKey === detailedStatsSelectedDateKey)) {
        detailedStatsSelectedDateKey = null;
    }
    const selectedDay = detailedStatsSelectedDateKey
        ? series.find(d => d.dateKey === detailedStatsSelectedDateKey) || null
        : null;

    const periodDurationSec = series.reduce((acc, d) => acc + (d.durationSeconds || 0), 0);
    const periodLearned = series.reduce((acc, d) => acc + (d.learned || 0) + (d.shici || 0), 0);
    const periodReviewed = series.reduce((acc, d) => acc + (d.reviewed || 0), 0);
    const activeDays = series.filter(d => (d.durationSeconds || 0) > 0 || (d.learned || 0) + (d.reviewed || 0) + (d.shici || 0) + (d.riddle || 0) > 0).length;

    const formatDur = (sec) => (window.DailyStudyTracker && typeof DailyStudyTracker.formatDuration === 'function')
        ? DailyStudyTracker.formatDuration(sec)
        : `${Math.round(sec / 60)}分钟`;

    const svgW = 620;
    const svgH = 225;
    const padL = 44;
    const padR = 16;
    const padT = 26;
    const padB = 30;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const baselineY = padT + plotH;
    const labelStep = series.length > 10 ? 5 : 1;
    const svgMonthClass = series.length > 10 ? ' detailed-chart-svg--month' : '';

    // 1. 每日新学与复习词数 SVG 堆叠柱状图
    const rawMaxWords = Math.max(0, ...series.map(d => (d.learned || 0) + (d.shici || 0) + (d.reviewed || 0)));
    const niceMaxWords = computeNiceAxisCeiling(rawMaxWords, 10);
    const slotW = series.length > 0 ? plotW / series.length : plotW;
    const barW = series.length <= 10 ? Math.min(34, slotW * 0.44) : Math.max(11, Math.min(16, slotW * 0.68));
    const showWordNums = detailedChartLabelState.words;

    const wordBarsSvg = series.map((d, idx) => {
        const learnCnt = (d.learned || 0) + (d.shici || 0);
        const revCnt = d.reviewed || 0;
        const totalCnt = learnCnt + revCnt;
        const cx = padL + (idx + 0.5) * slotW;
        const bx = cx - barW / 2;
        const isSelected = Boolean(detailedStatsSelectedDateKey && d.dateKey === detailedStatsSelectedDateKey);

        let learnH = learnCnt > 0 ? Math.max(4, (learnCnt / niceMaxWords) * plotH) : 0;
        let revH = revCnt > 0 ? Math.max(4, (revCnt / niceMaxWords) * plotH) : 0;
        if (learnH + revH > plotH && (learnH + revH) > 0) {
            const scale = plotH / (learnH + revH);
            learnH *= scale;
            revH *= scale;
        }

        const gap = (learnH > 0 && revH > 0) ? 1.5 : 0;
        const yLearn = baselineY - learnH;
        const yRev = baselineY - learnH - gap - revH;
        const topY = revH > 0 ? yRev : yLearn;
        const barFontSize = series.length <= 10 ? 10.5 : 8.5;

        let numLabelsSvg = '';
        if (showWordNums && totalCnt > 0) {
            const shortParts = [];
            if (learnCnt > 0) {
                if (learnH >= 15) {
                    numLabelsSvg += `<text x="${cx.toFixed(1)}" y="${(yLearn + learnH / 2 + 3.5).toFixed(1)}" text-anchor="middle" font-size="${barFontSize}" font-weight="700" fill="#ffffff">${learnCnt}</text>`;
                } else {
                    shortParts.push({ val: learnCnt, color: '#0061a4' });
                }
            }
            if (revCnt > 0) {
                if (revH >= 15) {
                    numLabelsSvg += `<text x="${cx.toFixed(1)}" y="${(yRev + revH / 2 + 3.5).toFixed(1)}" text-anchor="middle" font-size="${barFontSize}" font-weight="700" fill="#ffffff">${revCnt}</text>`;
                } else {
                    shortParts.push({ val: revCnt, color: '#0d9488' });
                }
            }
            if (shortParts.length === 1) {
                numLabelsSvg += `<text x="${cx.toFixed(1)}" y="${Math.max(padT - 6, topY - 4).toFixed(1)}" text-anchor="middle" font-size="${barFontSize}" font-weight="700" fill="${shortParts[0].color}">${shortParts[0].val}</text>`;
            } else if (shortParts.length === 2) {
                numLabelsSvg += `<text x="${cx.toFixed(1)}" y="${Math.max(padT - 6, topY - 4).toFixed(1)}" text-anchor="middle" font-size="${barFontSize}" font-weight="700" fill="#0f172a">${learnCnt}+${revCnt}</text>`;
            }
        }

        const xTickSvg = (idx % labelStep === 0 || idx === series.length - 1 || isSelected)
            ? `<text x="${cx.toFixed(1)}" y="${svgH - 8}" text-anchor="middle" class="detailed-axis-text" ${isSelected ? 'style="fill:#0061a4; font-weight:800;"' : ''}>${d.label}</text>`
            : '';

        return `
            <g class="detailed-svg-bar-col" onclick="selectDetailedStatsDay('${d.dateKey}')">
                <title>${d.dateKey}：新学 ${learnCnt} 词，复习 ${revCnt} 词（点击查看当日详细数据）</title>
                ${learnH > 0 ? `<rect class="detailed-bar-seg" x="${bx.toFixed(1)}" y="${yLearn.toFixed(1)}" width="${barW.toFixed(1)}" height="${learnH.toFixed(1)}" rx="3" fill="#0061a4" />` : ''}
                ${revH > 0 ? `<rect class="detailed-bar-seg" x="${bx.toFixed(1)}" y="${yRev.toFixed(1)}" width="${barW.toFixed(1)}" height="${revH.toFixed(1)}" rx="3" fill="#0d9488" />` : ''}
                ${totalCnt === 0 ? `<rect x="${bx.toFixed(1)}" y="${(baselineY - 2).toFixed(1)}" width="${barW.toFixed(1)}" height="2" rx="1" fill="${isSelected ? '#0061a4' : '#cbd5e1'}" opacity="${isSelected ? '0.9' : '0.6'}" />` : ''}
                ${numLabelsSvg}
                ${xTickSvg}
                <rect x="${(cx - slotW / 2).toFixed(1)}" y="${padT - 6}" width="${slotW.toFixed(1)}" height="${plotH + 14}" fill="transparent" />
            </g>
        `;
    }).join('');

    // 2. 学习时长趋势折线面积图 (SVG)
    const rawMaxDurMin = Math.max(0, ...series.map(d => (d.durationSeconds || 0) / 60));
    const niceMaxDur = computeNiceAxisCeiling(Math.ceil(rawMaxDurMin), 10);
    const nonZeroDays = series.filter(d => (d.durationSeconds || 0) > 0).length;
    const avgDurMinRaw = nonZeroDays > 0 ? ((periodDurationSec / 60) / nonZeroDays) : 0;
    const avgDurMin = Math.round(avgDurMinRaw * 10) / 10;
    const avgDisplay = Number.isInteger(avgDurMin) ? `${avgDurMin}` : avgDurMin.toFixed(1);
    const avgY = padT + plotH - Math.min(1, avgDurMin / niceMaxDur) * plotH;

    const points = series.map((d, i) => {
        const mins = Math.round(((d.durationSeconds || 0) / 60) * 10) / 10;
        const x = padL + (series.length > 1 ? (i / (series.length - 1)) * plotW : plotW / 2);
        const y = padT + plotH - Math.min(1, mins / niceMaxDur) * plotH;
        return { x, y, mins, label: d.label, dateKey: d.dateKey };
    });

    const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = points.length > 0
        ? `M ${points[0].x.toFixed(1)},${baselineY.toFixed(1)} L ` +
          points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') +
          ` L ${points[points.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} Z`
        : '';
    const showDurNums = detailedChartLabelState.duration;
    const pointStepW = series.length > 1 ? plotW / (series.length - 1) : plotW;

    const selLearn = selectedDay ? ((selectedDay.learned || 0) + (selectedDay.shici || 0)) : periodLearned;
    const selRev = selectedDay ? (selectedDay.reviewed || 0) : periodReviewed;
    const selDurSec = selectedDay ? (selectedDay.durationSeconds || 0) : periodDurationSec;
    const wordsFooterPrefix = selectedDay ? `${selectedDay.label} ` : rangeLabel;
    const durFooterLabel = selectedDay ? `${selectedDay.label} 学习时长` : `${rangeLabel}总时长`;

    container.innerHTML = `
        <!-- 图表1：每日新学与复习词数 -->
        <div class="detailed-chart-card">
            <div class="detailed-chart-header">
                <div class="detailed-chart-title">每日新学与复习词数</div>
                <div class="detailed-chart-controls detailed-chart-controls--stacked">
                    <label class="detailed-chart-toggle-label">
                        <span>显示详细数据</span>
                        <span class="md3-switch detailed-chart-switch">
                            <input type="checkbox" role="switch" ${showWordNums ? 'checked' : ''} onchange="toggleDetailedChartLabels('words', this.checked)">
                            <span class="md3-switch-track"><span class="md3-switch-thumb"></span></span>
                        </span>
                    </label>
                    <div class="detailed-chart-legend">
                        <span><i style="background:#0061a4;"></i>新学</span>
                        <span><i style="background:#0d9488;"></i>复习</span>
                    </div>
                </div>
            </div>
            <div class="detailed-svg-wrap">
                <svg viewBox="0 0 ${svgW} ${svgH}" class="detailed-chart-svg${svgMonthClass}">
                    ${renderDetailedStatsAxesSvg({ svgW, padL, padR, padT, plotH, maxVal: niceMaxWords, unitSuffix: '' })}
                    ${wordBarsSvg}
                </svg>
            </div>
            <div class="detailed-chart-footer">
                <div class="detailed-chart-footer-metrics">
                    <div class="detailed-chart-footer-item stat-accent-2">
                        <span class="detailed-chart-footer-label">${escapeHtml(wordsFooterPrefix)}新学</span>
                        <span class="detailed-chart-footer-val"><span class="stat-num">${selLearn}</span><small>词</small></span>
                    </div>
                    <div class="detailed-chart-footer-item stat-accent-3">
                        <span class="detailed-chart-footer-label">${escapeHtml(wordsFooterPrefix)}复习</span>
                        <span class="detailed-chart-footer-val"><span class="stat-num">${selRev}</span><small>词</small></span>
                    </div>
                </div>
                <div class="detailed-chart-selected-hint">
                    ${selectedDay
                        ? `<span>已选中 ${escapeHtml(selectedDay.dateKey)}</span><button type="button" class="detailed-chart-reset-btn" onclick="selectDetailedStatsDay(null)">返回${rangeLabel}汇总</button>`
                        : '<span>点击任意柱条查看当日详细数据</span>'
                    }
                </div>
            </div>
        </div>

        <!-- 图表2：学习时长趋势 (分钟) -->
        <div class="detailed-chart-card">
            <div class="detailed-chart-header">
                <div class="detailed-chart-title">学习时长趋势 (分钟)</div>
                <div class="detailed-chart-controls">
                    <label class="detailed-chart-toggle-label">
                        <span>显示详细数据</span>
                        <span class="md3-switch detailed-chart-switch">
                            <input type="checkbox" role="switch" ${showDurNums ? 'checked' : ''} onchange="toggleDetailedChartLabels('duration', this.checked)">
                            <span class="md3-switch-track"><span class="md3-switch-thumb"></span></span>
                        </span>
                    </label>
                </div>
            </div>
            <div class="detailed-svg-wrap">
                <svg viewBox="0 0 ${svgW} ${svgH}" class="detailed-chart-svg${svgMonthClass}">
                    <defs>
                        <linearGradient id="durAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="var(--md-sys-color-primary, #0061a4)" stop-opacity="0.26"/>
                            <stop offset="100%" stop-color="var(--md-sys-color-primary, #0061a4)" stop-opacity="0.02"/>
                        </linearGradient>
                    </defs>
                    ${renderDetailedStatsAxesSvg({ svgW, padL, padR, padT, plotH, maxVal: niceMaxDur, unitSuffix: 'm' })}
                    <path d="${areaPath}" fill="url(#durAreaGrad)" />
                    <line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${svgW - padR}" y2="${avgY.toFixed(1)}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4" />
                    ${avgDurMin > 0 ? `<text x="${padL - 8}" y="${Math.max(padT + 10, Math.min(baselineY - 6, avgY + 3.5)).toFixed(1)}" text-anchor="end" font-size="10.5" font-weight="700" fill="#d97706">${avgDisplay}m</text>` : ''}
                    <polyline fill="none" stroke="var(--md-sys-color-primary, #0061a4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
                    ${points.map((p, idx) => {
                        const valText = Number.isInteger(p.mins) ? `${p.mins}` : p.mins.toFixed(1);
                        const isSelected = Boolean(detailedStatsSelectedDateKey && p.dateKey === detailedStatsSelectedDateKey);
                        const shouldShowPtNum = isSelected || (showDurNums && (p.mins > 0 || series.length <= 10));
                        const ptRadius = isSelected ? 5.5 : (series.length > 14 ? 2.6 : 4);
                        return `
                        <g class="detailed-svg-point-col" onclick="selectDetailedStatsDay('${p.dateKey}')">
                            <title>${p.dateKey}: ${p.mins} 分钟（点击查看当日详细数据）</title>
                            ${isSelected ? `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${baselineY.toFixed(1)}" stroke="rgba(0, 97, 164, 0.3)" stroke-width="1.5" stroke-dasharray="3 3" />` : ''}
                            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${ptRadius}" fill="${isSelected ? '#0061a4' : '#fff'}" stroke="var(--md-sys-color-primary, #0061a4)" stroke-width="${isSelected ? 2.5 : 2}" />
                            ${shouldShowPtNum ? `<text x="${p.x.toFixed(1)}" y="${Math.max(padT - 5, p.y - 9).toFixed(1)}" text-anchor="middle" font-size="${(series.length <= 10 || isSelected) ? 10.5 : 8.5}" font-weight="${isSelected ? 800 : 700}" fill="#0061a4">${valText}${isSelected ? 'm' : ''}</text>` : ''}
                            ${(idx % labelStep === 0 || idx === points.length - 1 || isSelected) ? `<text x="${p.x.toFixed(1)}" y="${svgH - 8}" text-anchor="middle" class="detailed-axis-text" ${isSelected ? 'style="fill:#0061a4; font-weight:800;"' : ''}>${p.label}</text>` : ''}
                            <rect x="${(p.x - pointStepW / 2).toFixed(1)}" y="${padT - 6}" width="${pointStepW.toFixed(1)}" height="${plotH + 14}" fill="transparent" />
                        </g>
                        `;
                    }).join('')}
                </svg>
            </div>
            <div class="detailed-chart-footer">
                <div class="detailed-chart-footer-metrics">
                    <div class="detailed-chart-footer-item stat-accent-1">
                        <span class="detailed-chart-footer-label">${escapeHtml(durFooterLabel)}</span>
                        <span class="detailed-chart-footer-val">${formatDurationAccentHtml(formatDur(selDurSec))}</span>
                    </div>
                    ${!selectedDay ? `
                    <div class="detailed-chart-footer-item stat-accent-4">
                        <span class="detailed-chart-footer-label">活跃打卡天数</span>
                        <span class="detailed-chart-footer-val"><span class="stat-num">${activeDays}</span><small>/ ${daysCount} 天</small></span>
                    </div>` : ''}
                    <div class="detailed-chart-footer-item">
                        <span class="detailed-chart-footer-label">日均</span>
                        <span class="detailed-chart-footer-val"><span class="stat-num" style="color:#d97706;">${avgDisplay}</span><small>分钟</small></span>
                    </div>
                </div>
                <div class="detailed-chart-selected-hint">
                    ${selectedDay
                        ? `<span>已选中 ${escapeHtml(selectedDay.dateKey)}</span><button type="button" class="detailed-chart-reset-btn" onclick="selectDetailedStatsDay(null)">返回${rangeLabel}汇总</button>`
                        : '<span>点击曲线节点查看当日详细数据</span>'
                    }
                </div>
            </div>
        </div>
    `;
}
window.renderDetailedStatsSubview = renderDetailedStatsSubview;

// ----------------- 复习计划子页面 (列出所有待复习的词，与词书内容列表风格统一，支持展开查看) -----------------
let currentReviewPlanDateFilter = 'today'; // 'today' | 'tomorrow' | 'dayAfterTomorrow' | 'all'

function filterReviewPlanByDate(filterVal) {
    currentReviewPlanDateFilter = filterVal || 'today';
    renderReviewPlanSubview(currentReviewPlanDateFilter);
}
window.filterReviewPlanByDate = filterReviewPlanByDate;

function toggleReviewPlanItemDetail(cardEl, e) {
    if (!cardEl) return;
    if (e && e.target && e.target.closest('.btn-circle-icon-action')) return;
    const isExp = cardEl.classList.contains('expanded');
    cardEl.classList.toggle('expanded', !isExp);
    const drawer = cardEl.querySelector('.bc-item-drawer');
    if (drawer) {
        drawer.style.display = !isExp ? 'block' : 'none';
    }
}
window.toggleReviewPlanItemDetail = toggleReviewPlanItemDetail;

function formatReviewPlanTime(ts, nowMs) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const dateStr = `${y}-${m}-${day}`;
    const timeStr = `${hh}:${mm}`;

    if (ts <= nowMs) {
        return { badge: '待立即复习', detail: `${dateStr} ${timeStr}`, isUrgent: true, dateKey: dateStr };
    }
    const diffHours = Math.max(1, Math.round((ts - nowMs) / (1000 * 60 * 60)));
    if (diffHours < 24) {
        return { badge: `${diffHours}小时后`, detail: `${dateStr} ${timeStr}`, isUrgent: false, dateKey: dateStr };
    }
    const diffDays = Math.max(1, Math.round((ts - nowMs) / (1000 * 60 * 60 * 24)));
    return { badge: `${diffDays}天后复习`, detail: `${dateStr} ${timeStr}`, isUrgent: false, dateKey: dateStr };
}

function renderReviewPlanSubview(dateFilter = currentReviewPlanDateFilter) {
    currentReviewPlanDateFilter = dateFilter || 'today';
    const listContainer = document.getElementById('review-plan-list-container');
    const headerActions = document.getElementById('review-plan-header-actions');
    if (!listContainer) return;

    document.querySelectorAll('#review-plan-filter-tabs .settings-cat-tab').forEach(tab => {
        const isMatch = tab.getAttribute('data-filter') === currentReviewPlanDateFilter;
        tab.classList.toggle('active', isMatch);
        tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    const allScheduled = (window.EbbinghausEngine && typeof EbbinghausEngine.getScheduledReviewWords === 'function')
        ? EbbinghausEngine.getScheduledReviewWords()
        : [];

    const now = Date.now();
    const todayDate = new Date(now);
    const pad = (n) => String(n).padStart(2, '0');
    const toDateKey = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const todayKey = toDateKey(todayDate);
    const tomorrowKey = toDateKey(new Date(now + 86400000));
    const dayAfterTomorrowKey = toDateKey(new Date(now + 2 * 86400000));

    if (headerActions) {
        const dueCount = allScheduled.filter(i => i.nextReview <= now).length;
        headerActions.innerHTML = dueCount > 0 ? `
            <button type="button" class="btn btn-filled btn-sm" onclick="switchView('view-hub'); if (typeof handleReviewMainClick === 'function') handleReviewMainClick();">
                <span class="material-symbols-rounded" style="font-size:16px;">play_arrow</span>
                <span class="btn-label-text">开始复习 (${dueCount})</span>
            </button>
        ` : '';
    }

    const filtered = allScheduled.filter(item => {
        const itemDateKey = toDateKey(new Date(item.nextReview));
        if (currentReviewPlanDateFilter === 'all') return true;
        if (currentReviewPlanDateFilter === 'today') return item.nextReview <= now || itemDateKey === todayKey;
        if (currentReviewPlanDateFilter === 'tomorrow') return itemDateKey === tomorrowKey;
        if (currentReviewPlanDateFilter === 'dayAfterTomorrow') return itemDateKey === dayAfterTomorrowKey;
        return itemDateKey === currentReviewPlanDateFilter;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="review-plan-empty-box">
                <span class="material-symbols-rounded" style="font-size:48px; color:var(--md-sys-color-outline); opacity:0.6;">event_available</span>
                <div style="margin-top:10px; font-weight:700; font-size:1.02rem; color:var(--md-sys-color-on-surface);">该日期范围内暂无待复习词汇</div>
                <div style="font-size:0.82rem; color:var(--md-sys-color-outline); margin-top:4px;">学习新单词后，艾宾浩斯复习计划将自动在此生成</div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = filtered.slice(0, 300).map(item => {
        const tInfo = formatReviewPlanTime(item.nextReview, now);
        const fullEntry = (typeof findWordEntryForDrawer === 'function') ? findWordEntryForDrawer(item.word, false) : null;
        const wordObj = fullEntry ? { ...fullEntry, phone: fullEntry.phone || item.phone || '', meaning: fullEntry.meaning || item.meaning || '' } : item;
        const detail = (typeof buildUnifiedWordDetailData === 'function')
            ? buildUnifiedWordDetailData(wordObj, false)
            : {
                phoneDisplay: item.phone || '',
                meaningsHtml: `<div class="bc-meaning-row"><span class="bc-meaning-text">${escapeHtml(item.meaning || '暂无释义')}</span></div>`,
                extraDrawerHtml: ''
            };

        return `
            <div class="bc-unified-item" onclick="toggleReviewPlanItemDetail(this, event)">
                <div class="bc-item-header">
                    <div class="bc-item-title-meta">
                        <span class="bc-headword">${escapeHtml(item.word)}</span>
                        ${detail.phoneDisplay ? `<span class="bc-phone">${escapeHtml(detail.phoneDisplay)}</span>` : ''}
                        <span class="review-plan-stage-tag">第${item.stage}阶段</span>
                        <span class="review-plan-time-badge ${tInfo.isUrgent ? 'urgent' : ''}" title="${tInfo.detail}">${tInfo.badge}</span>
                    </div>
                    <div class="bc-item-actions" onclick="event.stopPropagation()">
                        <button type="button" class="btn-circle-icon-action" data-word="${escapeHtml(item.word)}" onclick="if (typeof jumpToSearch === 'function') jumpToSearch(this.dataset.word);" title="查词" aria-label="查词">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        <button type="button" class="btn-circle-icon-action" data-word="${escapeHtml(item.word)}" onclick="if (typeof playAudio === 'function') playAudio(this.dataset.word);" title="发音" aria-label="发音">
                            <span class="material-symbols-rounded">volume_up</span>
                        </button>
                    </div>
                </div>
                <div class="bc-item-drawer" style="display:none;">
                    <div class="bc-meanings-group">
                        ${detail.meaningsHtml}
                    </div>
                    ${detail.extraDrawerHtml || ''}
                </div>
            </div>
        `;
    }).join('');
}
window.renderReviewPlanSubview = renderReviewPlanSubview;

// ----------------- 数据同步状态与手动同步 -----------------
let isUserDataSynced = false;

function updateSyncButtonStatus(isSynced) {
    const btn = document.getElementById('btn-sync-cloud-data');
    const row = document.getElementById('me-row-sync-data');
    const rowBadge = document.getElementById('me-sync-row-badge');
    const rowIcon = document.getElementById('me-sync-row-icon');
    const headerBtn = document.getElementById('btn-me-sync-header');

    // 统计本地待同步队列数据
    const pendingCount = (window.SyncManager && Array.isArray(window.SyncManager.pendingQueue))
        ? window.SyncManager.pendingQueue.length
        : 0;

    if (isSynced === true || (isSynced !== false && pendingCount === 0)) {
        isUserDataSynced = true;
    } else if (isSynced === false || pendingCount > 0) {
        isUserDataSynced = false;
    }

    const isOnlineAccount = currentUserProfile && currentUserProfile.isLoggedIn && (currentUserProfile.type === 'cloud' || currentUserProfile.type === 'bilibili');
    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const hasPendingData = (!isUserDataSynced || pendingCount > 0);

    // 顶部操作区“同步数据”按钮：当存在未同步的数据时显示
    if (headerBtn) {
        if (isOnlineAccount && !isOffline && hasPendingData) {
            headerBtn.style.display = 'inline-flex';
            const hIcon = headerBtn.querySelector('.material-symbols-rounded');
            const hLabel = headerBtn.querySelector('.btn-label-text');
            if (window.SyncManager && window.SyncManager.isSyncing) {
                if (hIcon) hIcon.style.animation = 'spin 1s linear infinite';
                if (hLabel) hLabel.innerText = '同步中...';
                headerBtn.disabled = true;
            } else {
                if (hIcon) hIcon.style.animation = '';
                if (hLabel) hLabel.innerText = pendingCount > 0 ? `同步数据 (${pendingCount})` : '同步数据';
                headerBtn.disabled = false;
            }
        } else {
            headerBtn.style.display = 'none';
        }
    }

    // 1. 检查自动同步是否开启：仅当关闭自动同步时才显示该按钮/行
    const autoSync = (typeof isAutoSyncEnabled === 'function')
        ? isAutoSyncEnabled()
        : (localStorage.getItem('vocab_auto_sync_enabled') !== 'false');

    if (autoSync) {
        if (btn) btn.style.display = 'none';
        if (row) row.style.display = 'none';
        return;
    } else {
        if (btn) btn.style.display = 'inline-flex';
        if (row) row.style.display = 'flex';
    }

    const label = btn ? btn.querySelector('.btn-label-text') : null;
    const icon = btn ? btn.querySelector('.material-symbols-rounded') : null;

    // 2. 检查是否正在同步中
    if (window.SyncManager && window.SyncManager.isSyncing) {
        if (icon) {
            icon.innerText = 'sync';
            icon.style.animation = 'spin 1s linear infinite';
        }
        if (label) label.innerText = '同步中...';
        if (btn) {
            btn.disabled = true;
            btn.style.borderColor = 'var(--md-sys-color-outline)';
            btn.style.color = 'var(--md-sys-color-outline)';
        }
        if (rowIcon) {
            rowIcon.innerText = 'sync';
            rowIcon.style.animation = 'spin 1s linear infinite';
        }
        if (rowBadge) {
            rowBadge.innerText = '同步中...';
            rowBadge.style.background = 'var(--md-sys-color-surface-container-high)';
            rowBadge.style.color = 'var(--md-sys-color-outline)';
        }
        return;
    }

    if (icon) icon.style.animation = '';
    if (rowIcon) rowIcon.style.animation = '';

    if (isUserDataSynced) {
        if (icon) icon.innerText = 'check';
        if (label) label.innerText = '已是最新';
        if (btn) {
            btn.disabled = false;
            btn.style.borderColor = 'var(--md-sys-color-success, #2e7d32)';
            btn.style.color = 'var(--md-sys-color-success, #2e7d32)';
        }
        if (rowIcon) rowIcon.innerText = 'cloud_done';
        if (rowBadge) {
            rowBadge.innerText = '已是最新';
            rowBadge.style.background = '#dcfce7';
            rowBadge.style.color = '#15803d';
        }
    } else {
        if (icon) icon.innerText = 'sync';
        if (label) label.innerText = pendingCount > 0 ? `同步数据 (${pendingCount})` : '同步数据';
        if (btn) {
            btn.disabled = false;
            btn.style.borderColor = 'var(--md-sys-color-primary)';
            btn.style.color = 'var(--md-sys-color-primary)';
        }
        if (rowIcon) rowIcon.innerText = 'sync';
        if (rowBadge) {
            rowBadge.innerText = pendingCount > 0 ? `待同步 (${pendingCount})` : '点击同步';
            rowBadge.style.background = 'var(--md-sys-color-primary-container)';
            rowBadge.style.color = 'var(--md-sys-color-primary)';
        }
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
    const rowIcon = document.getElementById('me-sync-row-icon');
    const rowBadge = document.getElementById('me-sync-row-badge');
    if (rowIcon) rowIcon.style.animation = 'spin 1s linear infinite';
    if (rowBadge) {
        rowBadge.innerText = '同步中...';
        rowBadge.style.background = 'var(--md-sys-color-surface-container-high)';
        rowBadge.style.color = 'var(--md-sys-color-outline)';
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

        // 本地彻底清理
        try {
            const userSuffix = `_${targetUser}`;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.endsWith(userSuffix) ||
                    key.includes(`_${targetUser}_`) ||
                    key === `vocab_mails_${targetUser}` ||
                    key === `vocab_mail_status_${targetUser}` ||
                    key === `vocab_claimed_mails_${targetUser}` ||
                    key === `vocab_deleted_mails_${targetUser}` ||
                    key === `vocab_user_items_${targetUser}` ||
                    key === `vocab_item_active_${targetUser}` ||
                    key === `vocab_stats_${targetUser}` ||
                    key === `vocab_ebbinghaus_db_${targetUser}` ||
                    key === `vocab_user_avatar_${targetUser}` ||
                    key === `vocab_riddle_history_${targetUser}` ||
                    key === `vocab_riddle_streak_${targetUser}` ||
                    key === `vocab_wordle_records_${targetUser}` ||
                    key === `vocab_rank_data_${targetUser}` ||
                    key === `vocab_sync_queue_${targetUser}` ||
                    key === `shici_config_${targetUser}` ||
                    key === `shici_progress_${targetUser}` ||
                    key === `vocab_review_filter_${targetUser}`
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => {
                try { localStorage.removeItem(k); } catch (e) {}
                try { SafeStorage.removeItem(k); } catch (e) {}
            });
        } catch (e) {}

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
        SafeStorage.removeItem('vocab_registered_account');
        SafeStorage.removeItem('vocab_device_has_registered');
        try { localStorage.removeItem('vocab_registered_account'); } catch (e) {}
        try { localStorage.removeItem('vocab_device_has_registered'); } catch (e) {}

        // 清空内存管理器状态
        if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
            MailManager.resetForUser('');
        }
        if (typeof ItemManager !== 'undefined') {
            ItemManager._itemsCache = [];
            ItemManager._itemsCacheUser = '';
            ItemManager.updateBadge();
        }

        closeDeleteAccountModal();
        showToast(`账号 “${targetUser}” 已成功删除`);
        if (typeof handleAuthLogout === 'function') {
            handleAuthLogout(false);
        } else if (typeof handleLogout === 'function') {
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

