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
    selectedBooks: []
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_dictation_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.type) dictationConfig.type = saved.type;
        if (saved.batchSize) dictationConfig.batchSize = saved.batchSize;
        if (saved.autoPlay !== undefined) dictationConfig.autoPlay = saved.autoPlay;
        if (Array.isArray(saved.selectedBooks)) dictationConfig.selectedBooks = saved.selectedBooks;
    }
} catch (e) { }

let dictationState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    currentQ: null,
    answered: false
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
        answered: false
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

    const badge = document.getElementById('dictation-book-badge');
    if (badge) badge.innerText = q.bookName;

    const progEl = document.getElementById('dictation-progress-text');
    if (progEl) progEl.innerText = `${dictationState.currentIdx + 1} / ${dictationState.pool.length}`;

    const dProgFillEl = document.getElementById('dictation-progress-fill');
    if (dProgFillEl) {
        dProgFillEl.style.width = Math.round(((dictationState.currentIdx + 1) / dictationState.pool.length) * 100) + '%';
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
    }

    const submitBtn = document.getElementById('btn-dictation-submit');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');
    if (submitBtnText) submitBtnText.innerText = '确认';
    if (submitBtn) {
        submitBtn.onclick = () => submitDictationAnswer();
        submitBtn.className = 'btn btn-filled btn-sm';
    }

    const hintBtn = document.getElementById('btn-dictation-hint');
    if (hintBtn) {
        hintBtn.disabled = false;
        hintBtn.style.opacity = '1';
    }

    const inputArea = document.getElementById('dictation-input-area');
    if (!inputArea) return;

    if (!q.isPhrase) {
        inputArea.innerHTML = `
                <div class="dictation-slots-container">
                    <div class="dictation-slot-item">
                        <input type="text" id="dictation-word-input" class="dictation-slot-input" placeholder="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key==='Enter') submitDictationAnswer()" oninput="autoResizeDictationInput(this)">
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

function handleDictationSlotInput(event, idx) {
    const el = event.target;
    autoResizeDictationInput(el);
    const token = el.getAttribute('data-token') || '';
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
            autoResizeDictationInput(input);
            showToast(`已补全第 ${matchLen + 1} 个字母「${nextChar}」`);
        } else {
            input.value = target;
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
        isCorrect = inputs.length > 0 && inputs.every(inp => {
            const token = inp.getAttribute('data-token') || '';
            const ok = isPhraseSlotMatch(inp.value.trim(), token, q);
            inp.classList.toggle('correct', ok);
            inp.classList.toggle('wrong', !ok);
            return ok;
        });
    }

    dictationState.total++;
    dictationState.answered = true;

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');

    if (isCorrect) {
        dictationState.score++;
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record('dictation', 1);
        }
        showToast('回答正确！');

        if (feedbackCard) {
            feedbackCard.style.display = 'block';
            feedbackCard.style.background = '';
            feedbackCard.style.borderColor = '';
            if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
            if (feedbackWord) {
                feedbackWord.innerText = q.word;
                feedbackWord.style.color = '';
            }
            if (feedbackMeaning) {
                feedbackMeaning.innerHTML = `
                        <span>${q.meaning}</span>
                        <button type="button" class="btn-audio-speak" style="width:28px; height:28px; margin-left:6px;" onclick="playWordAudio('${escapeHtml(q.word)}')" title="发音">
                            <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                        </button>
                    `;
            }
        }

        setTimeout(() => {
            if (dictationState.answered) {
                dictationState.currentIdx++;
                renderDictationQuestion();
            }
        }, 800);
    } else {
        recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');

        if (feedbackCard) {
            feedbackCard.style.display = 'block';
            feedbackCard.style.background = 'var(--md-sys-color-error-container)';
            feedbackCard.style.borderColor = 'var(--md-sys-color-error)';
            if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
            if (feedbackWord) {
                feedbackWord.innerText = q.word;
                feedbackWord.style.color = 'var(--md-sys-color-on-error-container)';
            }
            if (feedbackMeaning) feedbackMeaning.innerText = q.meaning;
        }

        if (submitBtnText) submitBtnText.innerText = '下一题';
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

    recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');

    const wordInput = document.getElementById('dictation-word-input');
    if (wordInput) wordInput.classList.add('wrong');
    document.querySelectorAll('.dictation-slot-input').forEach(inp => inp.classList.add('wrong'));

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');

    if (feedbackCard) {
        feedbackCard.style.display = 'block';
        feedbackCard.style.background = 'var(--md-sys-color-error-container)';
        feedbackCard.style.borderColor = 'var(--md-sys-color-error)';
        if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
        if (feedbackWord) {
            feedbackWord.innerText = q.word;
            feedbackWord.style.color = 'var(--md-sys-color-on-error-container)';
        }
        if (feedbackMeaning) {
            feedbackMeaning.innerHTML = `
                    <span>${q.meaning}</span>
                    <button type="button" class="btn-audio-speak" style="width:28px; height:28px; margin-left:6px;" onclick="playWordAudio('${escapeHtml(q.word)}')" title="发音">
                        <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                    </button>
                `;
        }
    }

    if (submitBtnText) submitBtnText.innerText = '下一题';
}

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

