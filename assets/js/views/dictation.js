/**
 * 听音/看义默写练习视图
 * Module: assets/js/views/dictation.js
 */

/* ==========================================================================
   11. 听音/看义默写模式
   ========================================================================== */
let dictationConfig = {
    type: 'listen',
    batchSize: 20,
    autoPlay: true,
    selectedBooks: ['books/考纲/高考3500.json']
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_dictation_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.type) dictationConfig.type = saved.type;
        if (saved.batchSize) dictationConfig.batchSize = saved.batchSize;
        if (saved.autoPlay !== undefined) dictationConfig.autoPlay = saved.autoPlay;
        if (Array.isArray(saved.selectedBooks) && saved.selectedBooks.length > 0) {
            dictationConfig.selectedBooks = saved.selectedBooks;
        } else {
            dictationConfig.selectedBooks = ['books/考纲/高考3500.json'];
        }
    }
} catch (e) { }

let dictationState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    currentQ: null,
    answered: false,
    hasError: false
};

function openDictationSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-dictation-settings');
    if (!modal) return;
    renderDictationBookChips();
    updateDictationSettingsChips();
    modal.classList.add('active');
}

function closeDictationSettings() {
    const modal = document.getElementById('modal-dictation-settings');
    if (modal) modal.classList.remove('active');
}

function renderDictationBookChips() {
    const container = document.getElementById('chips-dictation-books');
    if (!container) return;
    if (!Array.isArray(dictationConfig.selectedBooks) || dictationConfig.selectedBooks.length === 0) {
        dictationConfig.selectedBooks = [(BookManager.availableBooks[0]?.id || 'GaoKao3500')];
    }
    renderBookFolderTree('chips-dictation-books', {
        selectedIds: dictationConfig.selectedBooks,
        onToggle: 'toggleDictationBook',
        mode: 'dictation'
    });
}

function toggleDictationBook(bookId) {
    if (!Array.isArray(dictationConfig.selectedBooks)) {
        dictationConfig.selectedBooks = [];
    }
    const hasIt = isBookIdSelected(dictationConfig.selectedBooks, bookId);
    if (hasIt) {
        if (dictationConfig.selectedBooks.length <= 1) {
            showToast('至少保留一本词书！');
            return;
        }
        dictationConfig.selectedBooks = toggleBookIdInList(dictationConfig.selectedBooks, bookId);
    } else {
        dictationConfig.selectedBooks.push(bookId);
    }
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
    renderDictationBookChips();
}

function updateDictationSettingsChips() {
    document.querySelectorAll('#chips-dictation-type .md3-chip').forEach(c => {
        const type = c.getAttribute('data-type');
        c.classList.toggle('selected', type === dictationConfig.type);
    });
    document.querySelectorAll('#chips-dictation-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === dictationConfig.batchSize);
    });

    // 同步 MD3 滑动开关状态
    const autoSwitch = document.getElementById('switch-dictation-autoplay');
    if (autoSwitch) autoSwitch.checked = !!dictationConfig.autoPlay;

    const kbSwitch = document.getElementById('switch-dictation-kb');
    if (kbSwitch) kbSwitch.checked = (dictationVirtualKeyboardEnabled !== false);
}

function toggleDictationAutoplaySwitch(checked) {
    if (!navigator.onLine && checked) {
        showToast('当前未联网，无法开启发音');
        const autoSwitch = document.getElementById('switch-dictation-autoplay');
        if (autoSwitch) autoSwitch.checked = false;
        return;
    }
    dictationConfig.autoPlay = Boolean(checked);
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
}

function toggleDictationKbSwitch(checked) {
    dictationVirtualKeyboardEnabled = Boolean(checked);
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    renderDictationKeyboard();
}

function selectDictationType(type) {
    dictationConfig.type = type;
    updateDictationSettingsChips();
}

function selectDictationBatch(val) {
    dictationConfig.batchSize = val;
    updateDictationSettingsChips();
}

function selectDictationAutoplay(val) {
    if (!navigator.onLine && val) {
        showToast('当前未联网，无法开启发音');
        return;
    }
    dictationConfig.autoPlay = val;
    updateDictationSettingsChips();
}

function saveDictationSettings() {
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    closeDictationSettings();
    showToast('默写设置已保存');
}

function confirmExitDictation() {
    if (typeof closeGlobalVirtualKeyboard === 'function') closeGlobalVirtualKeyboard();
    switchView('view-hub');
}

async function startDictationPractice() {
    resetAllGameAlertsAndFeedback();
    let bookIds = dictationConfig.selectedBooks;
    if (!bookIds || bookIds.length === 0) {
        bookIds = (singleSelectedBookIds && singleSelectedBookIds.length > 0)
            ? singleSelectedBookIds
            : [(BookManager.availableBooks[0]?.id || 'GaoKao3500')];
    }
    const words = await BookManager.loadMultipleBooks(bookIds);
    if (!words || words.length === 0) {
        showToast('所选词书没有词汇，请先检查词书');
        return;
    }

    const unmastered = words.filter(w => !isWordMastered(w.word));
    const activeWords = unmastered.length > 0 ? unmastered : words;
    const shuffled = shuffle([...activeWords]);
    const batchCount = Math.min(dictationConfig.batchSize || 20, shuffled.length);
    const pool = shuffled.slice(0, batchCount).map(w => {
        const meaning = (w.meanings && w.meanings.length > 0)
            ? w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；')
            : (w.meaning || '---');
        const isPhrase = (w.word || '').trim().includes(' ');
        const targetTokens = isPhrase ? extractPhraseTargetWords(w.word) : [w.word.trim()];
        return {
            word: w.word.trim(),
            meaning: meaning,
            phone: w.phone || '',
            bookName: w.bookName || '默写词库',
            isPhrase: isPhrase,
            targetTokens: targetTokens
        };
    });

    dictationState = {
        pool: pool,
        currentIdx: 0,
        score: 0,
        total: 0,
        currentQ: null,
        answered: false,
        hasError: false
    };

    renderDictationQuestion();
    switchView('view-dictation');
}

function renderDictationQuestion() {
    if (dictationState.currentIdx >= dictationState.pool.length) {
        endDictationSession();
        return;
    }

    const q = dictationState.pool[dictationState.currentIdx];
    dictationState.currentQ = q;
    dictationState.answered = false;
    dictationState.hasError = false;

    const badge = document.getElementById('dictation-book-badge');
    if (badge) badge.innerText = q.bookName;

    const progEl = document.getElementById('dictation-progress-text');
    if (progEl) progEl.innerText = `${dictationState.currentIdx + 1} / ${dictationState.pool.length}`;

    const dProgFillEl = document.getElementById('dictation-progress-fill');
    if (dProgFillEl) {
        dProgFillEl.style.width = Math.round((dictationState.score / dictationState.pool.length) * 100) + '%';
    }

    const typeBadge = document.getElementById('dictation-type-badge');
    if (typeBadge) {
        if (q.isPhrase) {
            typeBadge.innerText = '词组看义默写';
        } else {
            typeBadge.innerText = (dictationConfig.type === 'listen') ? '听音写词' : '看义写词';
        }
    }

    const promptMain = document.getElementById('dictation-prompt-main');
    const promptSub = document.getElementById('dictation-prompt-sub');
    const audioBtn = document.getElementById('btn-dictation-audio');

    if (q.isPhrase) {
        if (promptMain) promptMain.innerText = q.meaning;
        if (promptSub) { promptSub.innerText = ''; promptSub.style.display = 'none'; }
        if (audioBtn) audioBtn.style.display = 'none';
    } else {
        if (dictationConfig.type === 'listen') {
            if (promptMain) promptMain.innerText = '请听发音输入单词';
            if (promptSub) {
                promptSub.innerText = '';
                promptSub.style.display = 'none';
            }
            if (audioBtn) audioBtn.style.display = 'inline-flex';
        } else {
            if (promptMain) promptMain.innerText = q.meaning;
            if (promptSub) { promptSub.innerText = ''; promptSub.style.display = 'none'; }
            if (audioBtn) audioBtn.style.display = 'none';
        }
    }

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    if (feedbackCard) {
        feedbackCard.style.display = 'none';
        feedbackCard.style.background = '';
        feedbackCard.style.borderColor = '';
    }
    if (feedbackWord) {
        feedbackWord.style.color = '';
        feedbackWord.innerHTML = '';
    }

    const submitBtn = document.getElementById('btn-dictation-submit');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');
    const submitBtnIcon = document.getElementById('btn-dictation-submit-icon');
    if (submitBtnText) submitBtnText.innerText = '确认';
    if (submitBtnIcon) submitBtnIcon.innerText = 'check';
    if (submitBtn) {
        submitBtn.onclick = () => submitDictationAnswer();
        submitBtn.className = 'btn btn-filled btn-sm';
    }

    const hintBtn = document.getElementById('btn-dictation-hint');
    if (hintBtn) {
        hintBtn.style.display = 'inline-flex';
        hintBtn.disabled = false;
        hintBtn.style.opacity = '1';
    }

    const skipBtn = document.getElementById('btn-dictation-skip');
    if (skipBtn) {
        skipBtn.style.display = 'inline-flex';
    }

    if (typeof updateDictationToolbar === 'function') {
        updateDictationToolbar();
    }

    const inputArea = document.getElementById('dictation-input-area');
    if (!inputArea) return;

    if (!q.isPhrase) {
        inputArea.innerHTML = `
                <div class="dictation-slots-container">
                    <div class="dictation-slot-item">
                        <input type="text" id="dictation-word-input" class="dictation-slot-input" placeholder="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key==='Enter') submitDictationAnswer()" oninput="handleDictationSingleInput(this)">
                        <span class="dictation-slot-len-badge">${q.word.length} 字母</span>
                    </div>
                </div>
            `;
        const wordInput = document.getElementById('dictation-word-input');
        if (wordInput) {
            autoResizeDictationInput(wordInput);
            setTimeout(() => wordInput.focus(), 150);
        }
    } else {
        let slotsHtml = '<div class="dictation-slots-container">';
        q.targetTokens.forEach((token, idx) => {
            if (isFixedPhraseToken(token)) {
                slotsHtml += `<div class="dictation-slot-block-fixed" id="dictation-slot-fixed-${idx}">${escapeHtml(token)}</div>`;
            } else {
                const lenHint = token.includes('/')
                    ? token.split('/').map(t => t.length).filter((v, i, a) => a.indexOf(v) === i).join('/') + ' 字母'
                    : token.length + ' 字母';
                slotsHtml += `
                        <div class="dictation-slot-item">
                            <input type="text" class="dictation-slot-input" id="dictation-slot-input-${idx}" data-idx="${idx}" data-token="${escapeHtml(token)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="handleDictationSlotKey(event, ${idx})" oninput="handleDictationSlotInput(event, ${idx})" onfocus="handleDictationSlotFocus(this)" onblur="handleDictationSlotBlur(this)">
                            <span class="dictation-slot-len-badge">${lenHint}</span>
                        </div>
                    `;
            }
        });
        slotsHtml += '</div>';
        inputArea.innerHTML = slotsHtml;

        inputArea.querySelectorAll('.dictation-slot-input').forEach(inp => autoResizeDictationInput(inp));

        setTimeout(() => {
            const firstInput = inputArea.querySelector('.dictation-slot-input');
            if (firstInput) firstInput.focus();
        }, 150);
    }

    if (dictationConfig.type === 'listen' && !q.isPhrase && dictationConfig.autoPlay && navigator.onLine) {
        setTimeout(() => playDictationAudio(), 250);
    }
    if (typeof renderDictationKeyboard === 'function') {
        renderDictationKeyboard();
    }
}

function handleDictationSlotKey(event, idx) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitDictationAnswer();
    } else if (event.key === ' ' || event.key === 'Tab') {
        event.preventDefault();
        const allInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        const currIdx = allInputs.findIndex(el => parseInt(el.getAttribute('data-idx')) === idx);
        if (currIdx >= 0 && currIdx < allInputs.length - 1) {
            allInputs[currIdx + 1].focus();
        }
    } else if (event.key === 'Backspace') {
        const el = event.target;
        if (!el.value || (el.selectionStart === 0 && el.selectionEnd === 0)) {
            const allInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
            const currIdx = allInputs.indexOf(el);
            if (currIdx > 0) {
                event.preventDefault();
                const prev = allInputs[currIdx - 1];
                prev.focus();
                if (prev.value.length > 0) {
                    prev.value = prev.value.slice(0, -1);
                    autoResizeDictationInput(prev);
                    prev.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }
}

function handleDictationSingleInput(input) {
    autoResizeDictationInput(input);
    input.classList.remove('wrong');
    if (dictationState.currentQ && input.value.trim().toLowerCase() !== dictationState.currentQ.word.toLowerCase()) {
        input.classList.remove('correct');
    }
}

function handleDictationSlotInput(event, idx) {
    const el = event.target;
    autoResizeDictationInput(el);
    el.classList.remove('wrong');
    const token = el.getAttribute('data-token') || '';
    if (el.value.trim().toLowerCase() !== token.toLowerCase()) {
        el.classList.remove('correct');
    }
    if (token && el.value.length >= token.length) {
        const allInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        const currIdxInList = allInputs.indexOf(el);
        if (currIdxInList >= 0 && currIdxInList < allInputs.length - 1) {
            allInputs[currIdxInList + 1].focus();
        }
    }
}

function handleDictationHint() {
    if (!dictationState.currentQ || dictationState.answered) return;
    const q = dictationState.currentQ;

    if (!q.isPhrase) {
        const input = document.getElementById('dictation-word-input');
        if (!input) return;
        const currentVal = input.value.trim();
        const target = q.word;

        let matchLen = 0;
        while (matchLen < currentVal.length && matchLen < target.length && currentVal[matchLen].toLowerCase() === target[matchLen].toLowerCase()) {
            matchLen++;
        }
        if (matchLen < target.length) {
            const nextChar = target[matchLen];
            input.value = target.slice(0, matchLen + 1);
            input.classList.remove('wrong');
            autoResizeDictationInput(input);
            showToast(`已补全第 ${matchLen + 1} 个字母「${nextChar}」`);
        } else {
            input.value = target;
            input.classList.remove('wrong');
            input.classList.add('correct');
            autoResizeDictationInput(input);
            showToast('已补全完整单词');
        }
        input.focus();
    } else {
        const inputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        for (const input of inputs) {
            const token = input.getAttribute('data-token') || '';
            if (input.value.trim().toLowerCase() !== token.toLowerCase()) {
                input.value = token;
                input.classList.remove('wrong');
                input.classList.add('correct');
                autoResizeDictationInput(input);
                const idx = parseInt(input.getAttribute('data-idx'));
                showToast(`已揭示第 ${idx + 1} 格词块「${token}」`);
                input.focus();
                return;
            }
        }
        showToast('所有词块已全部填出');
    }
}

function submitDictationAnswer() {
    if (!dictationState.currentQ) return;
    const q = dictationState.currentQ;

    if (dictationState.answered) {
        dictationState.currentIdx++;
        renderDictationQuestion();
        return;
    }

    let isCorrect = false;

    if (!q.isPhrase) {
        const input = document.getElementById('dictation-word-input');
        const userVal = (input ? input.value : '').trim();
        isCorrect = (userVal.toLowerCase() === q.word.toLowerCase());
        if (input) {
            input.classList.toggle('correct', isCorrect);
            input.classList.toggle('wrong', !isCorrect);
        }
    } else {
        const inputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        let allOk = true;
        inputs.forEach(inp => {
            const token = inp.getAttribute('data-token') || '';
            const ok = isPhraseSlotMatch(inp.value.trim(), token, q);
            inp.classList.toggle('correct', ok);
            inp.classList.toggle('wrong', !ok);
            if (!ok) allOk = false;
        });
        isCorrect = inputs.length > 0 && allOk;
    }

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');
    const submitBtnIcon = document.getElementById('btn-dictation-submit-icon');
    const skipBtn = document.getElementById('btn-dictation-skip');
    const hintBtn = document.getElementById('btn-dictation-hint');

    if (isCorrect) {
        dictationState.answered = true;
        dictationState.total++;
        if (!dictationState.hasError) {
            dictationState.score++;
            if (window.DailyStudyTracker) {
                DailyStudyTracker.record('dictation', 1);
            }
        }
        showToast('回答正确！');

        const dProgFillEl = document.getElementById('dictation-progress-fill');
        if (dProgFillEl) {
            dProgFillEl.style.width = Math.round((dictationState.score / dictationState.pool.length) * 100) + '%';
        }

        // 输入框设为只读
        document.querySelectorAll('.dictation-slot-input').forEach(inp => inp.readOnly = true);

        // 答对后隐藏“看答案”和“提示”
        if (skipBtn) skipBtn.style.display = 'none';
        if (hintBtn) hintBtn.style.display = 'none';

        // 展示正确答案卡片（发音与熟词按钮已移至顶部工具栏）
        if (feedbackCard) {
            feedbackCard.style.display = 'block';
            feedbackCard.style.background = '';
            feedbackCard.style.borderColor = '';
            if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
            if (feedbackWord) {
                feedbackWord.style.color = '';
                feedbackWord.innerHTML = `<span style="word-break: break-word;">${escapeHtml(q.word)}</span>`;
            }
            if (feedbackMeaning) {
                feedbackMeaning.innerText = q.meaning;
            }
        }

        if (typeof updateDictationToolbar === 'function') {
            updateDictationToolbar();
        }

        // 修改按钮为下一题，不自动下一题
        if (submitBtnText) submitBtnText.innerText = '下一题';
        if (submitBtnIcon) submitBtnIcon.innerText = 'arrow_forward';

    } else {
        // 答错后：不要展示答案，让玩家再次改正
        if (!dictationState.hasError) {
            dictationState.hasError = true;
            recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');
        }

        // 确保答案卡片不展示
        if (feedbackCard) {
            feedbackCard.style.display = 'none';
        }

        showToast('存在拼写错误，请修改标红词块后重试');

        // 自动聚焦第一个错误的词块
        const firstWrong = document.querySelector('.dictation-slot-input.wrong');
        if (firstWrong) {
            firstWrong.focus();
            if (typeof firstWrong.select === 'function') firstWrong.select();
        }
    }
}

function skipDictationQuestion() {
    if (!dictationState.currentQ) return;
    const q = dictationState.currentQ;

    if (dictationState.answered) {
        dictationState.currentIdx++;
        renderDictationQuestion();
        return;
    }

    dictationState.total++;
    dictationState.answered = true;
    dictationState.hasError = true;

    recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');

    // 将未答对的词块标红，已答对的标蓝
    if (!q.isPhrase) {
        const wordInput = document.getElementById('dictation-word-input');
        if (wordInput) {
            const isMatch = wordInput.value.trim().toLowerCase() === q.word.toLowerCase();
            wordInput.classList.toggle('correct', isMatch);
            wordInput.classList.toggle('wrong', !isMatch);
            wordInput.readOnly = true;
        }
    } else {
        const inputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        inputs.forEach(inp => {
            const token = inp.getAttribute('data-token') || '';
            const ok = isPhraseSlotMatch(inp.value.trim(), token, q);
            inp.classList.toggle('correct', ok);
            inp.classList.toggle('wrong', !ok);
            inp.readOnly = true;
        });
    }

    // 隐藏“看答案”和“提示”
    const skipBtn = document.getElementById('btn-dictation-skip');
    if (skipBtn) skipBtn.style.display = 'none';
    const hintBtn = document.getElementById('btn-dictation-hint');
    if (hintBtn) hintBtn.style.display = 'none';

    // 展示答案卡片（正常配色，不要红色填充，发音按钮移到英文右边）
    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');
    const submitBtnIcon = document.getElementById('btn-dictation-submit-icon');

    if (feedbackCard) {
        feedbackCard.style.display = 'block';
        feedbackCard.style.background = '';
        feedbackCard.style.borderColor = '';
        if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
        if (feedbackWord) {
            feedbackWord.style.color = '';
            feedbackWord.innerHTML = `<span style="word-break: break-word;">${escapeHtml(q.word)}</span>`;
        }
        if (feedbackMeaning) {
            feedbackMeaning.innerText = q.meaning;
        }
    }

    if (typeof updateDictationToolbar === 'function') {
        updateDictationToolbar();
    }

    if (submitBtnText) submitBtnText.innerText = '下一题';
    if (submitBtnIcon) submitBtnIcon.innerText = 'arrow_forward';
}

function updateDictationToolbar() {
    const q = dictationState ? dictationState.currentQ : null;
    const audioBtn = document.getElementById('btn-dictation-tool-audio');
    const searchBtn = document.getElementById('btn-dictation-tool-search');
    const masterBtn = document.getElementById('btn-dictation-tool-master');
    const masterIcon = document.getElementById('icon-dictation-tool-master');

    const answered = !!(dictationState && dictationState.answered);
    const isListenMode = (typeof dictationConfig !== 'undefined' && dictationConfig.type === 'listen') && q && !q.isPhrase;

    // 发音：看义模式或词组默写在答题前禁用，答题后或听音模式下可用
    if (audioBtn) {
        const canAudio = answered || isListenMode;
        audioBtn.disabled = !canAudio;
        audioBtn.style.opacity = canAudio ? '1' : '0.35';
        audioBtn.style.cursor = canAudio ? 'pointer' : 'not-allowed';
    }

    // 查词：答题前禁用
    if (searchBtn) {
        searchBtn.disabled = !answered;
        searchBtn.style.opacity = answered ? '1' : '0.35';
        searchBtn.style.cursor = answered ? 'pointer' : 'not-allowed';
    }

    // 标注熟词：答题前禁用
    if (masterBtn) {
        masterBtn.disabled = !answered;
        masterBtn.style.opacity = answered ? '1' : '0.35';
        masterBtn.style.cursor = answered ? 'pointer' : 'not-allowed';

        if (q && q.word) {
            const isMastered = typeof isWordMastered === 'function' ? isWordMastered(q.word) : false;
            masterBtn.classList.toggle('active', isMastered);
            if (masterIcon) {
                masterIcon.innerText = 'check_circle';
                masterIcon.style.color = isMastered ? 'var(--md-sys-color-primary, #0061a4)' : '';
            }
        }
    }
}
window.updateDictationToolbar = updateDictationToolbar;

function toggleDictationMasteredWord() {
    if (!dictationState || !dictationState.answered) {
        showToast('答题后方可标注熟词');
        return;
    }
    if (!dictationState.currentQ) return;
    const q = dictationState.currentQ;
    if (typeof toggleMasteredWord === 'function') {
        toggleMasteredWord(q.word, q.phone || '', q.meaning || '');
        updateDictationToolbar();
    }
}
window.toggleDictationMasteredWord = toggleDictationMasteredWord;

function jumpToSearchFromDictation() {
    if (!dictationState || !dictationState.answered) {
        showToast('答题后方可查询释义');
        return;
    }
    const q = dictationState.currentQ || (dictationState.pool && dictationState.pool[dictationState.currentIdx]);
    if (q && q.word && typeof jumpToSearch === 'function') {
        jumpToSearch(q.word);
    }
}
window.jumpToSearchFromDictation = jumpToSearchFromDictation;

function endDictationSession() {
    if (typeof closeGlobalVirtualKeyboard === 'function') closeGlobalVirtualKeyboard();
    const accuracy = dictationState.total > 0 ? Math.round((dictationState.score / dictationState.total) * 100) : 0;
    alert(`🎉 默写练习完成！\n\n总题数：${dictationState.total} 题\n正确数：${dictationState.score} 题\n正确率：${accuracy}%\n\n错题已自动录入个人错题本。`);
    switchView('view-hub');
}


let dictationVirtualKeyboardEnabled = localStorage.getItem('dictation_virtual_keyboard_enabled') !== 'false';

function setDictationKeyboardToggle(enabled) {
    dictationVirtualKeyboardEnabled = Boolean(enabled);
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    document.querySelectorAll('#chips-settings-dictation-kb .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-kb') === String(dictationVirtualKeyboardEnabled));
    });
    renderDictationKeyboard();
    showToast(dictationVirtualKeyboardEnabled ? '默写虚拟键盘已开启' : '默写虚拟键盘已关闭');
}

function renderDictationKeyboard() {
    // 移除原有内置键盘，应用图片中的底部统一滑入式虚拟键盘
    const container = document.getElementById('dictation-keyboard-container');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    if (dictationVirtualKeyboardEnabled !== false) {
        const activeInp = document.getElementById('dictation-word-input') || document.querySelector('.dictation-slot-input');
        if (activeInp && typeof openGlobalVirtualKeyboard === 'function') {
            activeVirtualKeyboardInput = activeInp;
            openGlobalVirtualKeyboard();
        }
    } else {
        if (typeof closeGlobalVirtualKeyboard === 'function') {
            closeGlobalVirtualKeyboard();
        }
    }
}

function handleVirtualKeyPress(key) {
    if (typeof handleGlobalVirtualKeyPress === 'function') {
        handleGlobalVirtualKeyPress(key);
    }
}

function autoResizeDictationInput(input) {
    if (!input) return;
    const len = Math.max((input.value || '').length, 1);
    // 缩窄输入框默认宽度（随输入的内容动态调整宽度）
    const dynamicWidth = Math.max(68, len * 16 + 28);
    input.style.width = `${Math.min(dynamicWidth, 340)}px`;
}

// ----------------- 听写槽位 Tooltip -----------------
function handleDictationSlotFocus(inputEl) {
    const parent = inputEl.parentElement;
    if (!parent) return;
    const tooltip = parent.querySelector('.dictation-slot-tooltip');
    if (tooltip) tooltip.classList.add('visible');
}

function handleDictationSlotBlur(inputEl) {
    const parent = inputEl.parentElement;
    if (!parent) return;
    const tooltip = parent.querySelector('.dictation-slot-tooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

