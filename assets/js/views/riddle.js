/**
 * Wordle 单词解谜与草稿行逻辑
 * Module: assets/js/views/riddle.js
 */

/* ==========================================================================
   Wordle 草稿行逻辑 (支持多行草稿，每格自由输入，一键填入答题格并验证)
   ========================================================================== */
let riddleDraftRows = [];
let activeRiddleDraft = null;

function initRiddleDraftRows() {
    riddleDraftRows = [];
    activeRiddleDraft = null;
    renderRiddleDraftRows();
}

function addRiddleDraftRow() {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : (riddleConfig && riddleConfig.wordLength ? riddleConfig.wordLength : 5);
    riddleDraftRows.push(new Array(len).fill(''));
    renderRiddleDraftRows();
    setTimeout(() => {
        const lastRowIndex = riddleDraftRows.length - 1;
        const firstTile = document.getElementById(`draft-tile-${lastRowIndex}-0`);
        if (firstTile) {
            firstTile.focus();
            firstTile.select();
        }
    }, 60);
}

function removeRiddleDraftRow(rowIndex) {
    if (riddleDraftRows && riddleDraftRows.length > 0) {
        riddleDraftRows.splice(rowIndex, 1);
    }
    activeRiddleDraft = null;
    renderRiddleDraftRows();
}

function renderRiddleDraftRows() {
    const container = document.getElementById('riddle-draft-rows-container');
    if (!container) return;
    if (!riddleDraftRows || riddleDraftRows.length === 0) {
        container.innerHTML = '';
        return;
    }
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    const compactClass = (len >= 9) ? 'compact-9' : ((len === 8) ? 'compact-8' : '');
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');

    let html = '';
    riddleDraftRows.forEach((row, rIdx) => {
        while (row.length < len) row.push('');
        if (row.length > len) row.length = len;

        html += `<div class="riddle-draft-row" data-row="${rIdx}" onclick="handleRiddleDraftRowClick(event, ${rIdx})">`;
        html += `<div class="riddle-draft-tiles-wrapper">`;
        html += `<div class="riddle-draft-tiles">`;
        for (let cIdx = 0; cIdx < len; cIdx++) {
            const val = row[cIdx] || '';
            const displayVal = isLower ? val.toLowerCase() : val.toUpperCase();
            html += `<input type="text"
                class="riddle-draft-tile ${compactClass} ${isLower ? 'lowercase' : ''}"
                id="draft-tile-${rIdx}-${cIdx}"
                data-row="${rIdx}"
                data-col="${cIdx}"
                maxlength="1"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="text-transform: ${isLower ? 'lowercase' : 'uppercase'};"
                value="${escapeHtml(displayVal)}"
                onfocus="handleRiddleDraftFocus(${rIdx}, ${cIdx})"
                oninput="handleRiddleDraftInput(event, ${rIdx}, ${cIdx})"
                onkeydown="handleRiddleDraftKeydown(event, ${rIdx}, ${cIdx})"
            />`;
        }
        html += `</div>`;
        html += `<div class="riddle-draft-actions">
            <button type="button" class="riddle-draft-btn riddle-draft-del-btn" onclick="removeRiddleDraftRow(${rIdx})" title="删除此草稿行">
                <span class="material-symbols-rounded" style="font-size:18px;">close</span>
            </button>
            <button type="button" class="riddle-draft-btn riddle-draft-submit-btn" onclick="submitRiddleDraftRow(${rIdx})" title="填入答题格并验证">
                <span class="material-symbols-rounded" style="font-size:18px;">check</span>
            </button>
        </div>`;
        html += `</div>`;
        html += `</div>`;
    });
    container.innerHTML = html;
}

function handleRiddleDraftRowClick(e, rIdx) {
    if (e.target.closest('.riddle-draft-actions') || e.target.classList.contains('riddle-draft-tile')) {
        return;
    }
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    const row = riddleDraftRows[rIdx] || [];
    let targetCol = 0;
    for (let c = 0; c < len; c++) {
        if (!row[c]) {
            targetCol = c;
            break;
        }
    }
    const tile = document.getElementById(`draft-tile-${rIdx}-${targetCol}`);
    if (tile) {
        tile.focus();
        tile.select();
    }
    activeRiddleDraft = { row: rIdx, col: targetCol };
}

function handleRiddleDraftFocus(row, col) {
    activeRiddleDraft = { row, col };
    const input = document.getElementById(`draft-tile-${row}-${col}`);
    if (input) input.select();
}

function handleRiddleDraftInput(e, row, col) {
    const input = e.target;
    const raw = input.value || '';
    const char = raw.replace(/[^a-zA-Z]/g, '').slice(-1);
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
    if (char) {
        input.value = isLower ? char.toLowerCase() : char.toUpperCase();
        if (riddleDraftRows[row]) riddleDraftRows[row][col] = char.toUpperCase();
        const nextTile = document.getElementById(`draft-tile-${row}-${col + 1}`);
        if (nextTile) {
            nextTile.focus();
            nextTile.select();
            activeRiddleDraft = { row, col: col + 1 };
        }
    } else {
        input.value = '';
        if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
    }
}

function handleRiddleDraftKeydown(e, row, col) {
    if (e.key === 'Backspace') {
        const input = e.target;
        if (input.value) {
            // 当前格有字符，仅清空当前格并阻止默认行为，不删除左边格
            e.preventDefault();
            input.value = '';
            if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
        } else if (col > 0) {
            // 当前格已为空，跳转到左边一格并清空
            e.preventDefault();
            const prevTile = document.getElementById(`draft-tile-${row}-${col - 1}`);
            if (prevTile) {
                prevTile.focus();
                prevTile.value = '';
                if (riddleDraftRows[row]) riddleDraftRows[row][col - 1] = '';
                activeRiddleDraft = { row, col: col - 1 };
            }
        }
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevTile = document.getElementById(`draft-tile-${row}-${col - 1}`);
        if (prevTile) {
            prevTile.focus();
            prevTile.select();
            activeRiddleDraft = { row, col: col - 1 };
        }
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextTile = document.getElementById(`draft-tile-${row}-${col + 1}`);
        if (nextTile) {
            nextTile.focus();
            nextTile.select();
            activeRiddleDraft = { row, col: col + 1 };
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitRiddleDraftRow(row);
    }
}

function submitRiddleDraftRow(rowIndex) {
    if (riddleState.gameOver) {
        showToast('本局已结束');
        return;
    }
    const row = riddleDraftRows[rowIndex];
    if (!row) return;
    const len = riddleState.targetLength;
    const guess = row.slice(0, len).map(c => (c || '').trim().toUpperCase()).join('');
    if (guess.length < len) {
        showToast(`草稿未填满，还缺少 ${len - guess.length} 个字母！`);
        for (let c = 0; c < len; c++) {
            if (!row[c] || !row[c].trim()) {
                const el = document.getElementById(`draft-tile-${rowIndex}-${c}`);
                if (el) el.focus();
                break;
            }
        }
        return;
    }
    riddleState.currentInput = guess;
    updateRiddleCurrentRow();
    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }
    activeRiddleDraft = null;
    submitRiddleRow();
}

/* ==========================================================================
   9. Wordle 单词解谜 (退出免确认、断点恢复与进度保存)
   ========================================================================== */
let riddleConfig = {
    bookId: "GaoKao3500",
    selectedBooks: ["GaoKao3500"],
    wordLength: 5,
    maxAttempts: 6,
    letterCase: "upper"
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_riddle_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.bookId) riddleConfig.bookId = saved.bookId;
        if (Array.isArray(saved.selectedBooks) && saved.selectedBooks.length > 0) {
            riddleConfig.selectedBooks = saved.selectedBooks;
        } else if (riddleConfig.bookId) {
            riddleConfig.selectedBooks = [riddleConfig.bookId];
        }
        if (saved.wordLength !== undefined) riddleConfig.wordLength = saved.wordLength;
        if (saved.maxAttempts) riddleConfig.maxAttempts = saved.maxAttempts;
        if (saved.letterCase) riddleConfig.letterCase = saved.letterCase;
    }
} catch (e) { }

let riddleState = {
    targetWord: '',
    clueMeaning: '',
    cluePhone: '',
    bookName: '',
    targetLength: 5,
    maxAttempts: 6,
    attempts: [],
    currentInput: '',
    gameOver: false,
    isWon: false,
    letterStatus: {},
    revealedPositions: new Set(),
    pendingHint: null,
    revealedMeaning: false
};

function saveRiddleProgress() {
    if (!currentUser) return;
    if (riddleState.gameOver) {
        localStorage.removeItem(`riddle_progress_${currentUser}`);
        updateHubResumeButtons();
        return;
    }
    const dataToSave = {
        targetWord: riddleState.targetWord,
        clueMeaning: riddleState.clueMeaning,
        cluePhone: riddleState.cluePhone,
        bookName: riddleState.bookName,
        targetLength: riddleState.targetLength,
        maxAttempts: riddleState.maxAttempts,
        attempts: riddleState.attempts,
        currentInput: riddleState.currentInput,
        gameOver: riddleState.gameOver,
        isWon: riddleState.isWon,
        letterStatus: riddleState.letterStatus,
        revealedPositions: Array.from(riddleState.revealedPositions || []),
        pendingHint: riddleState.pendingHint,
        revealedMeaning: riddleState.revealedMeaning,
        hintLevel: riddleState.hintLevel || 0
    };
    localStorage.setItem(`riddle_progress_${currentUser}`, JSON.stringify(dataToSave));
    updateHubResumeButtons();
}

function confirmExitRiddle() {
    saveRiddleProgress();
    switchView('view-hub');
}

function selectRiddleCase(letterCase) {
    riddleConfig.letterCase = letterCase;
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    updateRiddleCaseUI();
}

function formatRiddleCase(str) {
    if (!str || typeof str !== 'string') return str || '';
    return riddleConfig.letterCase === 'lower' ? str.toLowerCase() : str.toUpperCase();
}

function updateRiddleCaseUI() {
    document.querySelectorAll('#chips-riddle-case .md3-chip').forEach(c => {
        const cCase = c.getAttribute('data-case');
        c.classList.toggle('selected', cCase === riddleConfig.letterCase);
    });
    if (riddleState && riddleState.targetLength) {
        renderRiddleBoard();
        renderRiddleKeyboard();
        renderRiddleDraftRows();
        if (riddleState.hintLevel > 0) {
            renderRiddleHintContent();
        }
        if (riddleState.gameOver) {
            const wordEl = document.getElementById('riddle-result-word');
            if (wordEl) {
                wordEl.innerText = formatRiddleCase(riddleState.targetWord);
            }
        }
    }
}

function openRiddleSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-riddle-settings');
    if (!modal) return;
    renderRiddleBookChips();
    updateRiddleSettingsChips();
    modal.classList.add('active');
}

function closeRiddleSettings() {
    const modal = document.getElementById('modal-riddle-settings');
    if (modal) modal.classList.remove('active');
}

function toggleRiddleBook(bookId) {
    if (!Array.isArray(riddleConfig.selectedBooks)) {
        riddleConfig.selectedBooks = [riddleConfig.bookId || 'books/考纲/高考3500.json'];
    }
    const hasIt = isBookIdSelected(riddleConfig.selectedBooks, bookId);
    if (hasIt) {
        if (riddleConfig.selectedBooks.length <= 1) {
            showToast('至少保留一本词书！');
            return;
        }
        riddleConfig.selectedBooks = toggleBookIdInList(riddleConfig.selectedBooks, bookId);
    } else {
        riddleConfig.selectedBooks.push(bookId);
    }
    riddleConfig.bookId = riddleConfig.selectedBooks[0] || 'books/考纲/高考3500.json';
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    renderRiddleBookChips();
}

async function renderRiddleBookChips() {
    const container = document.getElementById('chips-riddle-books');
    if (!container) return;
    if (!Array.isArray(riddleConfig.selectedBooks) || riddleConfig.selectedBooks.length === 0) {
        riddleConfig.selectedBooks = [riddleConfig.bookId || 'GaoKao3500'];
    }
    renderBookFolderTree('chips-riddle-books', {
        selectedIds: riddleConfig.selectedBooks,
        onToggle: 'toggleRiddleBook',
        mode: 'riddle'
    });
}

function updateRiddleSettingsChips() {
    document.querySelectorAll('#chips-riddle-len .md3-chip').forEach(c => {
        const len = parseInt(c.getAttribute('data-len'));
        c.classList.toggle('selected', len === riddleConfig.wordLength);
    });
    document.querySelectorAll('#chips-riddle-attempts .md3-chip').forEach(c => {
        const att = parseInt(c.getAttribute('data-att'));
        c.classList.toggle('selected', att === riddleConfig.maxAttempts);
    });
    document.querySelectorAll('#chips-riddle-case .md3-chip').forEach(c => {
        const cCase = c.getAttribute('data-case');
        c.classList.toggle('selected', cCase === riddleConfig.letterCase);
    });
}

function selectRiddleLength(len) {
    riddleConfig.wordLength = len;
    updateRiddleSettingsChips();
}

function selectRiddleAttempts(att) {
    riddleConfig.maxAttempts = att;
    updateRiddleSettingsChips();
}

function saveRiddleSettingsOnly() {
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    updateRiddleCaseUI();
    closeRiddleSettings();
    showToast('设置已保存');
}

async function saveAndStartRiddle() {
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    closeRiddleSettings();
    await startWordRiddleGame(true);
}

async function startWordRiddleGame(forceNew = false) {
    if (forceNew) {
        resetAllGameAlertsAndFeedback();
    }
    if (!forceNew && currentUser) {
        const saved = localStorage.getItem(`riddle_progress_${currentUser}`);
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p && !p.gameOver && p.targetWord) {
                    riddleState = {
                        targetWord: p.targetWord,
                        clueMeaning: p.clueMeaning,
                        cluePhone: p.cluePhone || '',
                        bookName: p.bookName || '单词谜题',
                        targetLength: p.targetLength || p.targetWord.length,
                        maxAttempts: p.maxAttempts || 6,
                        attempts: p.attempts || [],
                        currentInput: p.currentInput || '',
                        gameOver: false,
                        isWon: false,
                        letterStatus: p.letterStatus || {},
                        hintLevel: p.hintLevel || 0,
                        isSubmitting: false,
                        revealedPositions: new Set(p.revealedPositions || []),
                        pendingHint: p.pendingHint || null,
                        revealedMeaning: p.revealedMeaning || false
                    };

                    const topBookName = document.getElementById('riddle-top-book-name');
                    if (topBookName) topBookName.innerText = riddleState.bookName;
                    initRiddleDraftRows();
                    const hintBox = document.getElementById('riddle-hint-box');
                    if (hintBox) hintBox.style.display = riddleState.hintLevel > 0 ? 'block' : 'none';
                    const resbox = document.getElementById('riddle-result-box');
                    if (resbox) resbox.style.display = 'none';

                    renderRiddleBoard();
                    renderRiddleKeyboard();
                    if (riddleState.hintLevel > 0) renderRiddleHintContent();

                    switchView('view-riddle');
                    return;
                }
            } catch (e) { }
        }
    }

    let candidatePool = [];
    const selected = (Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.length > 0)
        ? riddleConfig.selectedBooks
        : ['books/考纲/高考3500.json'];

    candidatePool = await BookManager.loadMultipleBooks(selected);
    if (!candidatePool || candidatePool.length === 0) {
        const hasCloudBooks = (BookManager.availableBooks || []).some(b => b.isCloud || String(b.id).startsWith('books/'));
        const hasSelectedOtherBooks = selected && selected.length > 0 && !selected.includes('builtin_default');
        if (!hasSelectedOtherBooks && !hasCloudBooks) {
            candidatePool = (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : []);
        } else if (dictionary && dictionary.length > 0) {
            candidatePool = dictionary;
        }
    }

    const requiredLen = riddleConfig.wordLength || 0;
    const validWords = candidatePool.filter(w => {
        const wordStr = (w && w.word ? w.word : '').trim();
        if (wordStr.includes(' ') || !/^[a-zA-Z]+$/.test(wordStr)) return false;
        if (requiredLen > 0 && wordStr.length !== requiredLen) return false;
        if (requiredLen === 0 && (wordStr.length < 3 || wordStr.length > 9)) return false;
        return true;
    });

    if (validWords.length === 0) {
        showToast(`未找到长度为 ${requiredLen} 的单词，已切换为任意长度！`);
        riddleConfig.wordLength = 0;
        localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
        return startWordRiddleGame(true);
    }

    const chosen = validWords[Math.floor(Math.random() * validWords.length)];
    const targetWord = chosen.word.trim().toUpperCase();

    let meaningText = '---';
    if (chosen.meanings && chosen.meanings.length > 0) {
        meaningText = chosen.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
    } else if (chosen.meaning) {
        meaningText = chosen.meaning;
    }

    riddleState = {
        targetWord: targetWord,
        clueMeaning: meaningText,
        cluePhone: chosen.phone || '',
        bookName: chosen.bookName || '精选题库',
        targetLength: targetWord.length,
        maxAttempts: riddleConfig.maxAttempts || 6,
        attempts: [],
        currentInput: '',
        gameOver: false,
        isWon: false,
        letterStatus: {},
        hintLevel: 0,
        isSubmitting: false,
        revealedPositions: new Set(),
        pendingHint: null,
        revealedMeaning: false
    };

    saveRiddleProgress();

    resetAllGameAlertsAndFeedback();
    const topBookName = document.getElementById('riddle-top-book-name');
    if (topBookName) topBookName.innerText = riddleState.bookName;
    initRiddleDraftRows();
    const hintCount = document.getElementById('riddle-hint-count');
    if (hintCount) hintCount.innerText = '0/4';

    renderRiddleBoard();
    renderRiddleKeyboard();
    switchView('view-riddle');
}

function clearRiddleAnimationClasses() {
    const grid = document.getElementById('riddle-grid');
    if (!grid) return;
    grid.querySelectorAll('.riddle-tile.flip').forEach(t => {
        t.classList.remove('flip');
        t.style.animationDelay = '';
    });
}

function renderRiddleBoard() {
    const grid = document.getElementById('riddle-grid');
    if (!grid) return;
    clearRiddleAnimationClasses();

    const attemptInd = document.getElementById('riddle-attempt-indicator');
    if (attemptInd) {
        const currentAtt = Math.min(riddleState.attempts.length + (riddleState.gameOver ? 0 : 1), riddleState.maxAttempts);
        attemptInd.innerText = `尝试: ${currentAtt} / ${riddleState.maxAttempts}`;
    }

    let html = '';
    const compactClass = (riddleState.targetLength >= 9) ? 'compact-9' : ((riddleState.targetLength === 8) ? 'compact-8' : '');
    for (let r = 0; r < riddleState.maxAttempts; r++) {
        html += '<div class="riddle-row">';
        if (r < riddleState.attempts.length) {
            const att = riddleState.attempts[r];
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = att.guess[c] || '';
                const displayLetter = (riddleConfig.letterCase === 'lower') ? letter.toLowerCase() : letter.toUpperCase();
                const evalClass = att.evaluation[c] || '';
                html += `<div class="riddle-tile ${evalClass} ${compactClass}">${displayLetter}</div>`;
            }
        } else if (r === riddleState.attempts.length && !riddleState.gameOver) {
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = riddleState.currentInput[c] || '';
                const displayLetter = (riddleConfig.letterCase === 'lower') ? letter.toLowerCase() : letter.toUpperCase();
                const isCurrentActive = (c === riddleState.currentInput.length);
                html += `<div class="riddle-tile ${isCurrentActive ? 'active' : ''} ${compactClass}">${displayLetter}</div>`;
            }
        } else {
            for (let c = 0; c < riddleState.targetLength; c++) {
                html += `<div class="riddle-tile ${compactClass}"></div>`;
            }
        }
        html += '</div>';
    }
    grid.innerHTML = html;
}

function updateRiddleCurrentRow() {
    const grid = document.getElementById('riddle-grid');
    if (!grid) return;
    const currentRow = grid.children[riddleState.attempts.length];
    if (!currentRow) return;
    const tiles = currentRow.children;
    for (let c = 0; c < riddleState.targetLength; c++) {
        const tile = tiles[c];
        if (!tile) continue;
        const char = riddleState.currentInput[c] || '';
        tile.innerText = (riddleConfig.letterCase === 'lower') ? char.toLowerCase() : char.toUpperCase();
        if (c === riddleState.currentInput.length && !riddleState.gameOver) {
            tile.classList.add('active');
        } else {
            tile.classList.remove('active');
        }
    }
}

function renderRiddleKeyboard() {
    const kb = document.getElementById('riddle-keyboard');
    if (!kb) return;

    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    let html = '';
    rows.forEach(rowKeys => {
        html += '<div class="riddle-key-row">';
        rowKeys.forEach(k => {
            let extraClass = '';
            let label = k;
            if (k === 'ENTER') {
                extraClass = 'wide';
                label = '提交';
            } else if (k === 'BACKSPACE') {
                extraClass = 'wide';
                label = '⌫';
            } else {
                label = (riddleConfig.letterCase === 'lower') ? k.toLowerCase() : k.toUpperCase();
                const status = riddleState.letterStatus[k];
                if (status) extraClass = status;
            }

            html += `
                    <button type="button" class="riddle-key ${extraClass}" onpointerdown="event.preventDefault()" onmousedown="event.preventDefault()" onclick="handleRiddleVirtualKey('${k}')">
                        ${label}
                    </button>
                `;
        });
        html += '</div>';
    });
    kb.innerHTML = html;
}

function handleRiddleVirtualKey(key) {
    let draftTarget = null;
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('riddle-draft-tile')) {
        const row = parseInt(activeEl.getAttribute('data-row'), 10);
        const col = parseInt(activeEl.getAttribute('data-col'), 10);
        draftTarget = { row, col, el: activeEl };
    } else if (activeRiddleDraft) {
        const el = document.getElementById(`draft-tile-${activeRiddleDraft.row}-${activeRiddleDraft.col}`);
        if (el) {
            draftTarget = { row: activeRiddleDraft.row, col: activeRiddleDraft.col, el };
        }
    }

    if (draftTarget && draftTarget.el) {
        const { row, col, el } = draftTarget;
        const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
        if (key === 'ENTER') {
            submitRiddleDraftRow(row);
            return;
        } else if (key === 'BACKSPACE') {
            if (el.value) {
                el.value = '';
                if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
            } else if (col > 0) {
                const prev = document.getElementById(`draft-tile-${row}-${col - 1}`);
                if (prev) {
                    prev.focus();
                    prev.value = '';
                    if (riddleDraftRows[row]) riddleDraftRows[row][col - 1] = '';
                    activeRiddleDraft = { row, col: col - 1 };
                }
            }
            return;
        } else if (/^[a-zA-Z]$/.test(key)) {
            const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
            el.value = isLower ? key.toLowerCase() : key.toUpperCase();
            if (riddleDraftRows[row]) riddleDraftRows[row][col] = key.toUpperCase();
            if (col + 1 < len) {
                const next = document.getElementById(`draft-tile-${row}-${col + 1}`);
                if (next) {
                    next.focus();
                    next.select();
                    activeRiddleDraft = { row, col: col + 1 };
                }
            } else {
                activeRiddleDraft = { row, col };
            }
            return;
        }
    }

    if (key === 'ENTER') {
        submitRiddleRow();
    } else if (key === 'BACKSPACE') {
        handleRiddleBackspace();
    } else {
        handleRiddleKey(key);
    }
}

// 实体键盘（物理键盘）事件监听
window.addEventListener('keydown', (e) => {
    const riddleView = document.getElementById('view-riddle');
    if (!riddleView || !riddleView.classList.contains('active')) return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }
    if (activeEl && activeEl.classList.contains('riddle-draft-tile')) {
        return;
    }
    if (activeEl && activeEl.tagName === 'INPUT' && !activeEl.classList.contains('riddle-draft-tile')) {
        return;
    }

    const openModals = document.querySelectorAll('.modal-overlay.active, .modal.active');
    if (openModals.length > 0) return;

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const key = e.key;

    // 若当前正在编辑草稿行，则路由至草稿格，绝不跑入正式格
    if (activeRiddleDraft !== null) {
        const { row, col } = activeRiddleDraft;
        const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
        const curTile = document.getElementById(`draft-tile-${row}-${col}`);
        if (curTile) {
            if (/^[a-zA-Z]$/.test(key)) {
                e.preventDefault();
                const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
                curTile.value = isLower ? key.toLowerCase() : key.toUpperCase();
                if (riddleDraftRows[row]) riddleDraftRows[row][col] = key.toUpperCase();
                if (col + 1 < len) {
                    const nextTile = document.getElementById(`draft-tile-${row}-${col + 1}`);
                    if (nextTile) {
                        nextTile.focus();
                        nextTile.select();
                        activeRiddleDraft = { row, col: col + 1 };
                    }
                }
                return;
            } else if (key === 'Backspace') {
                e.preventDefault();
                if (curTile.value) {
                    curTile.value = '';
                    if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
                } else if (col > 0) {
                    const prevTile = document.getElementById(`draft-tile-${row}-${col - 1}`);
                    if (prevTile) {
                        prevTile.focus();
                        prevTile.value = '';
                        if (riddleDraftRows[row]) riddleDraftRows[row][col - 1] = '';
                        activeRiddleDraft = { row, col: col - 1 };
                    }
                }
                return;
            } else if (key === 'Enter') {
                e.preventDefault();
                submitRiddleDraftRow(row);
                return;
            }
        }
    }

    if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        handleRiddleKey(key.toUpperCase());
    } else if (key === 'Backspace') {
        e.preventDefault();
        handleRiddleBackspace();
    } else if (key === 'Enter') {
        e.preventDefault();
        submitRiddleRow();
    }
});

// 点击草稿区以外区域重置草稿聚焦状态
document.addEventListener('pointerdown', (e) => {
    if (typeof currentView !== 'undefined' && currentView !== 'view-riddle') return;
    if (e.target.closest('#riddle-draft-rows-container') || e.target.closest('#btn-riddle-add-draft') || e.target.closest('#riddle-keyboard')) {
        return;
    }
    activeRiddleDraft = null;
});

function handleRiddleKey(char) {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    if (riddleState.currentInput.length < riddleState.targetLength) {
        riddleState.currentInput += char.toUpperCase();
        updateRiddleCurrentRow();
        saveRiddleProgress();

        if (riddleState.currentInput.length === riddleState.targetLength) {
            riddleState.isSubmitting = true;
            setTimeout(() => {
                if (riddleState.currentInput.length === riddleState.targetLength && !riddleState.gameOver) {
                    submitRiddleRow();
                }
                riddleState.isSubmitting = false;
            }, 120);
        }
    }
}

function handleRiddleBackspace() {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    if (riddleState.currentInput.length > 0) {
        riddleState.currentInput = riddleState.currentInput.slice(0, -1);
        updateRiddleCurrentRow();
        saveRiddleProgress();
    }
}

function submitRiddleRow() {
    if (riddleState.gameOver) return;
    if (riddleState.currentInput.length < riddleState.targetLength) {
        showToast(`还缺少 ${riddleState.targetLength - riddleState.currentInput.length} 个字母！`);
        return;
    }

    const guess = riddleState.currentInput.toUpperCase();
    const target = riddleState.targetWord.toUpperCase();
    const len = riddleState.targetLength;

    const evaluation = new Array(len).fill('absent');
    const targetCounts = {};

    for (let i = 0; i < len; i++) {
        if (guess[i] === target[i]) {
            evaluation[i] = 'correct';
        } else {
            targetCounts[target[i]] = (targetCounts[target[i]] || 0) + 1;
        }
    }

    for (let i = 0; i < len; i++) {
        if (evaluation[i] !== 'correct') {
            const gChar = guess[i];
            if (targetCounts[gChar] && targetCounts[gChar] > 0) {
                evaluation[i] = 'present';
                targetCounts[gChar]--;
            } else {
                evaluation[i] = 'absent';
            }
        }
    }

    for (let i = 0; i < len; i++) {
        const gChar = guess[i];
        const res = evaluation[i];
        const curr = riddleState.letterStatus[gChar];
        if (res === 'correct') {
            riddleState.letterStatus[gChar] = 'correct';
        } else if (res === 'present' && curr !== 'correct') {
            riddleState.letterStatus[gChar] = 'present';
        } else if (res === 'absent' && !curr) {
            riddleState.letterStatus[gChar] = 'absent';
        }
    }

    const grid = document.getElementById('riddle-grid');
    const submittedRow = grid ? grid.children[riddleState.attempts.length] : null;
    if (submittedRow) {
        const tiles = submittedRow.children;
        for (let c = 0; c < len; c++) {
            const tile = tiles[c];
            if (tile) {
                tile.innerText = formatRiddleCase(guess[c]);
                tile.classList.remove('active');
                tile.classList.add(evaluation[c]);
                tile.classList.add('flip');
                tile.style.animationDelay = `${c * 80}ms`;
                const currentTile = tile;
                setTimeout(() => {
                    if (currentTile) {
                        currentTile.classList.remove('flip');
                        currentTile.style.animationDelay = '';
                    }
                }, c * 80 + 500);
            }
        }
    }

    riddleState.attempts.push({ guess, evaluation });
    riddleState.currentInput = '';

    const attemptInd = document.getElementById('riddle-attempt-indicator');
    if (attemptInd) {
        const currentAtt = Math.min(riddleState.attempts.length + (riddleState.gameOver ? 0 : 1), riddleState.maxAttempts);
        attemptInd.innerText = `尝试: ${currentAtt} / ${riddleState.maxAttempts}`;
    }

    renderRiddleKeyboard();

    const isWin = (guess === target);
    if (isWin) {
        riddleState.gameOver = true;
        riddleState.isWon = true;
        saveRiddleProgress();
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record('riddle', 1);
        }
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#146C2E');
        renderRiddleResult(`🎉 恭喜猜中！用时 ${riddleState.attempts.length} 次尝试`, 'var(--md-sys-color-success)');
        return;
    }

    if (riddleState.attempts.length >= riddleState.maxAttempts) {
        riddleState.gameOver = true;
        riddleState.isWon = false;
        saveRiddleProgress();
        renderRiddleResult(`💔 失败！正确单词：`, 'var(--md-sys-color-error)');
        return;
    }

    saveRiddleProgress();

    if (grid && grid.children[riddleState.attempts.length]) {
        const nextRow = grid.children[riddleState.attempts.length];
        if (nextRow.children[0]) {
            nextRow.children[0].classList.add('active');
        }
    }
}

function getRiddleSolvedPositions() {
    let solved = new Set();
    if (riddleState.revealedPositions instanceof Set) {
        solved = new Set(riddleState.revealedPositions);
    } else if (Array.isArray(riddleState.revealedPositions)) {
        solved = new Set(riddleState.revealedPositions);
    }
    if (riddleState.attempts) {
        riddleState.attempts.forEach(att => {
            if (att.evaluation) {
                att.evaluation.forEach((ev, idx) => {
                    if (ev === 'correct') solved.add(idx);
                });
            }
        });
    }
    return solved;
}

function renderRiddleHintContent() {
    const hintContent = document.getElementById('riddle-hint-content');
    const hintTitle = document.getElementById('riddle-hint-title');
    const hintStepTip = document.getElementById('riddle-hint-step-tip');
    if (!hintContent) return;

    if (hintTitle) hintTitle.innerText = riddleState.revealedMeaning ? '终极释义' : '提示';
    if (hintStepTip) {
        if (riddleState.revealedMeaning) {
            hintStepTip.innerText = '释义已解锁';
        } else if (riddleState.hintLevel > 0) {
            hintStepTip.innerText = `第 ${riddleState.hintLevel} 步`;
        } else {
            hintStepTip.innerText = '';
        }
    }

    const target = riddleState.targetWord;
    const len = riddleState.targetLength;
    const solved = getRiddleSolvedPositions();

    const lettersArr = [];
    for (let i = 0; i < len; i++) {
        if (solved.has(i)) {
            lettersArr.push(formatRiddleCase(target[i]));
        } else {
            lettersArr.push('_');
        }
    }

    let html = '';

    // 只有已定位字母时才显示已知格位（避免开局全是空下划线冗余占位）
    if (solved.size > 0) {
        html += `
            <div style="margin-bottom:6px; display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.85rem; color:var(--md-sys-color-outline);">已定位格：</span>
                <span class="riddle-hint-letters" style="font-size:1.05rem; font-weight:700; letter-spacing:3px;">${lettersArr.join(' ')}</span>
            </div>
        `;
    }

    if (riddleState.pendingHint) {
        html += `
            <div style="margin-bottom:6px; display:inline-flex; align-items:center; gap:6px; background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); padding:4px 10px; border-radius:var(--md-shape-full); font-size:0.84rem; font-weight:600;">
                <span class="material-symbols-rounded" style="font-size:16px;">lightbulb</span>
                <span>包含字母【${formatRiddleCase(riddleState.pendingHint.letter)}】（再次提示解锁格位）</span>
            </div>
        `;
    }

    if (riddleState.revealedMeaning) {
        html += `
            <div style="padding-top:6px; margin-top:4px; border-top:1px dashed var(--md-sys-color-outline-variant);">
                <strong style="color:var(--md-sys-color-outline); font-size:0.86rem;">释义：</strong>
                <span style="font-weight:600; color:var(--md-sys-color-primary); font-size:0.92rem;">${riddleState.clueMeaning}</span>
            </div>
        `;
    }

    hintContent.innerHTML = html;
}

function handleRiddleHint() {
    if (riddleState.gameOver) {
        showToast(`游戏已结束，答案为【${formatRiddleCase(riddleState.targetWord)}】`);
        return;
    }

    const target = riddleState.targetWord;
    const len = riddleState.targetLength;
    const hintBox = document.getElementById('riddle-hint-box');
    const hintTitle = document.getElementById('riddle-hint-title');
    const hintStepTip = document.getElementById('riddle-hint-step-tip');
    const hintCount = document.getElementById('riddle-hint-count');

    if (hintBox) hintBox.style.display = 'block';

    if (riddleState.revealedMeaning) {
        showToast(`提示已全部解锁！`);
        return;
    }

    const solved = getRiddleSolvedPositions();

    if (riddleState.pendingHint) {
        const pending = riddleState.pendingHint;
        if (!solved.has(pending.pos)) {
            if (!riddleState.revealedPositions) riddleState.revealedPositions = new Set();
            riddleState.revealedPositions.add(pending.pos);
            riddleState.pendingHint = null;
            riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

            if (hintTitle) hintTitle.innerText = `提示`;
            if (hintStepTip) hintStepTip.innerText = `第 ${riddleState.hintLevel} 步`;
            if (hintCount) hintCount.innerText = `第 ${riddleState.hintLevel} 步`;
            renderRiddleHintContent();
            saveRiddleProgress();
            showToast(`第 ${pending.pos + 1} 个字母是【${formatRiddleCase(pending.letter)}】`);
            return;
        } else {
            riddleState.pendingHint = null;
        }
    }

    const currentSolved = getRiddleSolvedPositions();
    const unrevealed = [];
    for (let i = 0; i < len; i++) {
        if (!currentSolved.has(i)) unrevealed.push(i);
    }

    if (unrevealed.length <= 2) {
        riddleState.revealedMeaning = true;
        riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

        if (hintTitle) hintTitle.innerText = `终极提示`;
        if (hintStepTip) hintStepTip.innerText = `释义已揭晓`;
        if (hintCount) hintCount.innerText = `终极提示`;
        renderRiddleHintContent();
        saveRiddleProgress();
        showToast(`还有 ${unrevealed.length} 个字母未填`);
        return;
    }

    const randomPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = target[randomPos];
    riddleState.pendingHint = { letter, pos: randomPos };
    riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

    if (hintTitle) hintTitle.innerText = `提示`;
    if (hintStepTip) hintStepTip.innerText = `第 ${riddleState.hintLevel} 步`;
    if (hintCount) hintCount.innerText = `第 ${riddleState.hintLevel} 步`;
    renderRiddleHintContent();
    saveRiddleProgress();
    showToast(`提示：含有字母【${formatRiddleCase(letter)}】`);
}

function renderRiddleResult(title, titleColor) {
    const resbox = document.getElementById('riddle-result-box');
    if (!resbox) return;
    resbox.style.display = 'block';

    const titleEl = document.getElementById('riddle-result-title');
    if (titleEl) {
        titleEl.innerText = title;
        titleEl.style.color = titleColor || 'var(--md-sys-color-primary)';
    }

    const wordEl = document.getElementById('riddle-result-word');
    if (wordEl) wordEl.innerText = (riddleConfig.letterCase === 'lower') ? riddleState.targetWord.toLowerCase() : riddleState.targetWord.toUpperCase();

    const phoneEl = document.getElementById('riddle-result-phone');
    if (phoneEl) phoneEl.innerText = riddleState.cluePhone || '';

    const meaningEl = document.getElementById('riddle-result-meaning');
    if (meaningEl) meaningEl.innerText = riddleState.clueMeaning || '---';
}

async function giveUpRiddle() {
    if (riddleState.gameOver) return;
    const ok = await showConfirmModal({
        title: '揭晓答案',
        message: '确认揭晓答案吗？本局游戏将立即结算。',
        confirmText: '确认揭晓',
        cancelText: '继续猜词',
        isDanger: true,
        icon: 'visibility'
    });
    if (ok) {
        riddleState.gameOver = true;
        saveRiddleProgress();
        renderRiddleBoard();
        renderRiddleKeyboard();
        renderRiddleResult('揭晓答案', 'var(--md-sys-color-primary)');
    }
}

