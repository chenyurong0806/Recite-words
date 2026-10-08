/**
 * Wordle 单词解谜与草稿行逻辑
 * Module: assets/js/views/riddle.js
 */

/* ==========================================================================
   Wordle 草稿行逻辑 (支持多行草稿，每格自由输入，一键填入答题格并验证)
   ========================================================================== */
let riddleDraftRows = [];
let activeRiddleDraft = null;
let activeFormalCol = 0;
let riddleCurrentLetters = [];

function syncFormalInputLetters() {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    if (!Array.isArray(riddleCurrentLetters) || riddleCurrentLetters.length !== len) {
        riddleCurrentLetters = new Array(len).fill('');
        const str = (riddleState && riddleState.currentInput) ? riddleState.currentInput : '';
        for (let i = 0; i < len && i < str.length; i++) {
            if (str[i]) riddleCurrentLetters[i] = str[i].toUpperCase();
        }
    }
}

function focusFormalTile(col) {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    col = Math.max(0, Math.min(len - 1, col));
    handleFormalTileFocus(col);
}

function handleFormalTileFocus(col) {
    activeFormalCol = col;
    activeRiddleDraft = null;
    document.querySelectorAll('.riddle-draft-tile').forEach(t => t.classList.remove('active-draft-tile'));
    updateRiddleCurrentRow();
    const tile = document.getElementById(`formal-tile-${col}`);
    if (tile) {
        tile.classList.add('active');
        tile.focus();
        tile.select();
    }
}

function applyFormalLetterInput(col, char) {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
    if (!Array.isArray(riddleCurrentLetters) || riddleCurrentLetters.length !== len) {
        riddleCurrentLetters = new Array(len).fill('');
    }
    riddleCurrentLetters[col] = char.toUpperCase();
    riddleState.currentInput = riddleCurrentLetters.join('');
    saveRiddleProgress();

    const tile = document.getElementById(`formal-tile-${col}`);
    if (tile) {
        tile.value = isLower ? char.toLowerCase() : char.toUpperCase();
    }

    // 检查是否全行字母均已填满
    const isFull = (riddleCurrentLetters.length === len && riddleCurrentLetters.every(c => c && c.trim()));
    if (isFull) {
        // 填满后自动提交验证
        riddleState.isSubmitting = true;
        setTimeout(() => {
            riddleState.isSubmitting = false;
            if (!riddleState.gameOver) {
                submitRiddleRow();
            }
        }, 120);
    } else {
        // 自动跳转到下一个空格子，或紧邻的下一格
        let nextCol = col + 1;
        if (nextCol < len && !riddleCurrentLetters[nextCol]) {
            focusFormalTile(nextCol);
        } else {
            const firstEmpty = riddleCurrentLetters.findIndex(c => !c || !c.trim());
            if (firstEmpty !== -1) {
                focusFormalTile(firstEmpty);
            } else if (nextCol < len) {
                focusFormalTile(nextCol);
            } else {
                focusFormalTile(col);
            }
        }
    }
}

function applyFormalBackspace(col) {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    if (!Array.isArray(riddleCurrentLetters) || riddleCurrentLetters.length !== len) {
        riddleCurrentLetters = new Array(len).fill('');
    }
    const tile = document.getElementById(`formal-tile-${col}`);
    if (tile && tile.value) {
        tile.value = '';
        riddleCurrentLetters[col] = '';
        riddleState.currentInput = riddleCurrentLetters.join('');
        saveRiddleProgress();
        focusFormalTile(col);
    } else if (col > 0) {
        focusFormalTile(col - 1);
        const prev = document.getElementById(`formal-tile-${col - 1}`);
        if (prev) {
            prev.value = '';
            riddleCurrentLetters[col - 1] = '';
            riddleState.currentInput = riddleCurrentLetters.join('');
            saveRiddleProgress();
        }
    }
}

function handleFormalTileInput(e, col) {
    const raw = e.target ? (e.target.value || '') : '';
    const char = raw.replace(/[^a-zA-Z]/g, '').slice(-1);
    if (char) {
        applyFormalLetterInput(col, char);
    } else {
        const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
        if (!Array.isArray(riddleCurrentLetters) || riddleCurrentLetters.length !== len) {
            riddleCurrentLetters = new Array(len).fill('');
        }
        if (e.target) e.target.value = '';
        riddleCurrentLetters[col] = '';
        riddleState.currentInput = riddleCurrentLetters.join('');
        saveRiddleProgress();
    }
}

function handleFormalTileKeydown(e, col) {
    if (e.key === 'Backspace') {
        e.preventDefault();
        applyFormalBackspace(col);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col > 0) focusFormalTile(col - 1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
        if (col + 1 < len) focusFormalTile(col + 1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitRiddleRow();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        applyFormalLetterInput(col, e.key);
    }
}

function initRiddleDraftRows() {
    riddleDraftRows = [];
    activeRiddleDraft = null;
    activeFormalCol = 0;
    riddleCurrentLetters = [];
    syncFormalInputLetters();
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
                inputmode="none"
                maxlength="1"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="text-transform: ${isLower ? 'lowercase' : 'uppercase'};"
                value="${escapeHtml(displayVal)}"
                onclick="handleRiddleDraftFocus(${rIdx}, ${cIdx})"
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
    handleRiddleDraftFocus(rIdx, targetCol);
}

function handleRiddleDraftFocus(row, col) {
    activeRiddleDraft = { row, col };
    document.querySelectorAll('.riddle-tile.active').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.riddle-draft-tile').forEach(t => t.classList.remove('active-draft-tile'));
    const input = document.getElementById(`draft-tile-${row}-${col}`);
    if (input) {
        input.classList.add('active-draft-tile');
        input.focus();
        input.select();
    }
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
    riddleCurrentLetters = new Array(len).fill('');
    for (let c = 0; c < len; c++) {
        riddleCurrentLetters[c] = (row[c] || '').toUpperCase();
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
    bookId: "books/经典/高中考纲词汇.json",
    selectedBooks: ["books/经典/高中考纲词汇.json"],
    wordLength: 5,
    maxAttempts: 6,
    letterCase: "lower",
    enableTimer: false
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_riddle_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.bookId && saved.bookId !== 'GaoKao3500' && saved.bookId !== 'books/考纲/高考3500.json') {
            riddleConfig.bookId = saved.bookId;
        } else {
            riddleConfig.bookId = 'books/经典/高中考纲词汇.json';
        }
        if (Array.isArray(saved.selectedBooks) && saved.selectedBooks.length > 0) {
            riddleConfig.selectedBooks = saved.selectedBooks.map(b => (b === 'GaoKao3500' || b === 'books/考纲/高考3500.json') ? 'books/经典/高中考纲词汇.json' : b);
        } else if (riddleConfig.bookId) {
            riddleConfig.selectedBooks = [riddleConfig.bookId];
        }
        if (saved.wordLength !== undefined) riddleConfig.wordLength = saved.wordLength;
        if (saved.maxAttempts) riddleConfig.maxAttempts = saved.maxAttempts;
        if (saved.letterCase) riddleConfig.letterCase = saved.letterCase;
        if (saved.enableTimer !== undefined) riddleConfig.enableTimer = !!saved.enableTimer;
    }
} catch (e) { }

let isDailyWordleMode = false;
let dailyWordleTimerId = null;
let dailyWordleElapsedSeconds = 0;

function formatDailyTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startDailyTimer() {
    stopDailyTimer();
    const timerText = document.getElementById('riddle-daily-timer-text');
    if (timerText) timerText.innerText = formatDailyTimer(dailyWordleElapsedSeconds);
    dailyWordleTimerId = setInterval(() => {
        dailyWordleElapsedSeconds++;
        const t = document.getElementById('riddle-daily-timer-text');
        if (t) t.innerText = formatDailyTimer(dailyWordleElapsedSeconds);
        if (isDailyWordleMode && !riddleState.gameOver) {
            saveDailyWordleProgress();
        } else if (!isDailyWordleMode && !riddleState.gameOver && riddleConfig.enableTimer) {
            saveRiddleProgress();
        }
    }, 1000);
}

function stopDailyTimer() {
    if (dailyWordleTimerId) {
        clearInterval(dailyWordleTimerId);
        dailyWordleTimerId = null;
    }
}

function saveDailyWordleProgress() {
    const todayStr = (new Date()).toISOString().slice(0, 10);
    const userKey = currentUser || 'guest';
    const stateToSave = {
        date: todayStr,
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
        elapsedSeconds: dailyWordleElapsedSeconds
    };
    localStorage.setItem(`vocab_daily_wordle_${userKey}_${todayStr}`, JSON.stringify(stateToSave));
}

function updateRiddleModeUI() {
    const timerBox = document.getElementById('riddle-daily-timer-box');
    const selectBookBtn = document.getElementById('btn-riddle-select-book');
    const hintBtn = document.getElementById('btn-riddle-hint');
    const shuffleBtn = document.getElementById('btn-riddle-shuffle');
    const giveupBtn = document.getElementById('btn-riddle-giveup');
    const lbBtn = document.getElementById('btn-riddle-leaderboard');

    if (isDailyWordleMode) {
        if (lbBtn) lbBtn.style.display = 'inline-flex';
        if (timerBox) timerBox.style.display = 'inline-flex';
        if (selectBookBtn) selectBookBtn.style.display = 'none';
        if (hintBtn) hintBtn.style.display = 'none';
        if (shuffleBtn) shuffleBtn.style.display = 'none';
        if (giveupBtn) giveupBtn.style.display = 'none';
    } else {
        if (lbBtn) lbBtn.style.display = 'none';
        if (timerBox) timerBox.style.display = riddleConfig.enableTimer ? 'inline-flex' : 'none';
        if (selectBookBtn) selectBookBtn.style.display = 'inline-flex';
        if (hintBtn) hintBtn.style.display = 'inline-flex';
        if (shuffleBtn) shuffleBtn.style.display = 'inline-flex';
        if (giveupBtn) giveupBtn.style.display = 'inline-flex';
    }
}

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
    if (isDailyWordleMode) {
        saveDailyWordleProgress();
        return;
    }
    if (riddleState.gameOver) {
        localStorage.removeItem(`riddle_progress_${currentUser}`);
        updateHubResumeButtons();
        return;
    }
    const dataToSave = {
        targetWord: riddleState.targetWord,
        clueMeaning: riddleState.clueMeaning,
        cluePhone: riddleState.cluePhone,
        bookName: (riddleState.bookName || '').replace(/\s*\(今日Wordle\)/g, ''),
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
        hintLevel: riddleState.hintLevel || 0,
        elapsedSeconds: dailyWordleElapsedSeconds
    };
    localStorage.setItem(`riddle_progress_${currentUser}`, JSON.stringify(dataToSave));
    updateHubResumeButtons();
}

function confirmExitRiddle() {
    if (isDailyWordleMode) {
        stopDailyTimer();
        saveDailyWordleProgress();
    } else {
        stopDailyTimer();
        saveRiddleProgress();
    }
    if (typeof syncAllUserDataToCloud === 'function') {
        syncAllUserDataToCloud();
    }
    switchView('view-hub');
}

function selectRiddleCase(letterCase) {
    riddleConfig.letterCase = letterCase;
    updateRiddleSettingsChips();
    updateRiddleSettingsFooterButtons();
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

let riddleInitialSettings = null;

function openRiddleSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-riddle-settings');
    if (!modal) return;

    // 记录打开弹窗时的初始设置快照，用于判断是否修改了核心题型参数，并在取消时准确还原
    riddleInitialSettings = {
        wordLength: riddleConfig.wordLength,
        maxAttempts: riddleConfig.maxAttempts,
        letterCase: riddleConfig.letterCase,
        enableTimer: !!riddleConfig.enableTimer,
        selectedBooks: [...(riddleConfig.selectedBooks || [])],
        bookId: riddleConfig.bookId
    };

    const lenGroup = document.getElementById('riddle-settings-group-len');
    const attGroup = document.getElementById('riddle-settings-group-att');
    const timerGroup = document.getElementById('riddle-settings-group-timer');
    const historyGroup = document.getElementById('riddle-settings-group-history');
    if (lenGroup) lenGroup.style.display = isDailyWordleMode ? 'none' : 'block';
    if (attGroup) attGroup.style.display = isDailyWordleMode ? 'none' : 'block';
    if (timerGroup) timerGroup.style.display = isDailyWordleMode ? 'none' : 'block';
    if (historyGroup) historyGroup.style.display = isDailyWordleMode ? 'none' : 'block';

    renderRiddleBookChips();
    updateRiddleSettingsChips();
    updateRiddleSettingsFooterButtons();
    modal.classList.add('active');
}

function isRiddleCoreSettingsChanged() {
    return !isDailyWordleMode && riddleInitialSettings && (
        riddleConfig.wordLength !== riddleInitialSettings.wordLength ||
        riddleConfig.maxAttempts !== riddleInitialSettings.maxAttempts ||
        riddleConfig.enableTimer !== riddleInitialSettings.enableTimer
    );
}

function updateRiddleSettingsFooterButtons() {
    const leftBtn = document.getElementById('btn-riddle-settings-left');
    const rightBtn = document.getElementById('btn-riddle-settings-right');
    if (!leftBtn || !rightBtn) return;

    const hasCoreChanged = isRiddleCoreSettingsChanged();

    if (hasCoreChanged) {
        // 如果修改了单词长度、可尝试次数或计时器开关，将两个按钮改成“保存并重开”和“下一题生效”
        leftBtn.className = 'btn btn-outlined btn-touch-large';
        leftBtn.style.flex = '1';
        leftBtn.style.background = '';
        leftBtn.style.color = '';
        leftBtn.onclick = handleRiddleLeftBtnClick;
        leftBtn.innerHTML = `
            <span class="material-symbols-rounded">replay</span>
            <span class="btn-label-text">保存并重开</span>
        `;

        rightBtn.className = 'btn btn-filled btn-touch-large';
        rightBtn.style.flex = '1';
        rightBtn.style.background = '#6750A4';
        rightBtn.style.color = '#ffffff';
        rightBtn.onclick = handleRiddleRightBtnClick;
        rightBtn.innerHTML = `
            <span class="material-symbols-rounded">schedule</span>
            <span class="btn-label-text">下一题生效</span>
        `;
    } else {
        // 如果只是修改字母大小写（或未修改）：将下方两个按钮改成“取消”和“保存设置”
        leftBtn.className = 'btn btn-outlined btn-touch-large';
        leftBtn.style.flex = '1';
        leftBtn.style.background = '';
        leftBtn.style.color = '';
        leftBtn.onclick = handleRiddleLeftBtnClick;
        leftBtn.innerHTML = `
            <span class="material-symbols-rounded">close</span>
            <span class="btn-label-text">取消</span>
        `;

        rightBtn.className = 'btn btn-filled btn-touch-large';
        rightBtn.style.flex = '1';
        rightBtn.style.background = '#6750A4';
        rightBtn.style.color = '#ffffff';
        rightBtn.onclick = handleRiddleRightBtnClick;
        rightBtn.innerHTML = `
            <span class="material-symbols-rounded">check</span>
            <span class="btn-label-text">保存设置</span>
        `;
    }
}

async function handleRiddleLeftBtnClick() {
    const hasCoreChanged = isRiddleCoreSettingsChanged();

    if (hasCoreChanged) {
        // 点击“保存并重开”
        localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
        riddleInitialSettings = null;
        closeRiddleSettingsModalDirectly();
        if (isDailyWordleMode) {
            updateRiddleCaseUI();
            showToast('设置已保存');
        } else {
            await startWordRiddleGame(true);
            showToast('已重开题目并应用新设置');
        }
    } else {
        // 点击“取消”
        cancelRiddleSettings();
    }
}

function handleRiddleRightBtnClick() {
    const hasCoreChanged = isRiddleCoreSettingsChanged();

    if (hasCoreChanged) {
        // 点击“下一题生效”
        localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
        updateRiddleCaseUI();
        riddleInitialSettings = null;
        closeRiddleSettingsModalDirectly();
        showToast('设置已保存，将在下一题生效');
    } else {
        // 点击“保存设置” (此时只修改了大小写或无改动)
        localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
        updateRiddleCaseUI();
        riddleInitialSettings = null;
        closeRiddleSettingsModalDirectly();
        showToast('设置已保存');
    }
}

function cancelRiddleSettings() {
    if (riddleInitialSettings) {
        riddleConfig.wordLength = riddleInitialSettings.wordLength;
        riddleConfig.maxAttempts = riddleInitialSettings.maxAttempts;
        riddleConfig.letterCase = riddleInitialSettings.letterCase;
        riddleConfig.enableTimer = riddleInitialSettings.enableTimer;
        riddleConfig.selectedBooks = [...riddleInitialSettings.selectedBooks];
        riddleConfig.bookId = riddleInitialSettings.bookId || riddleConfig.selectedBooks[0] || 'books/经典/高中考纲词汇.json';
        updateRiddleSettingsChips();
        updateRiddleCaseUI();
        riddleInitialSettings = null;
    }
    closeRiddleSettingsModalDirectly();
}

function closeRiddleSettingsModalDirectly() {
    const modal = document.getElementById('modal-riddle-settings');
    if (modal) modal.classList.remove('active');
}

function closeRiddleSettings() {
    cancelRiddleSettings();
}

function toggleRiddleBook(bookId) {
    if (!Array.isArray(riddleConfig.selectedBooks)) {
        riddleConfig.selectedBooks = [riddleConfig.bookId || 'books/经典/高中考纲词汇.json'];
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
    riddleConfig.bookId = riddleConfig.selectedBooks[0] || 'books/经典/高中考纲词汇.json';
    renderRiddleBookChips();
    updateRiddleSettingsFooterButtons();
}

async function renderRiddleBookChips() {
    const container = document.getElementById('chips-riddle-books');
    if (!container) return;
    if (typeof isWordleSupportedBook === 'function') {
        riddleConfig.selectedBooks = (riddleConfig.selectedBooks || []).filter(id => {
            const b = BookManager.getBookMeta(id) || { id: id };
            return isWordleSupportedBook(b);
        });
        if (riddleConfig.selectedBooks.length === 0) {
            riddleConfig.selectedBooks = ['books/经典/高中考纲词汇.json'];
        }
        riddleConfig.bookId = riddleConfig.selectedBooks[0];
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
    document.querySelectorAll('#chips-riddle-timer .md3-chip').forEach(c => {
        const isTimerOn = c.getAttribute('data-timer') === 'on';
        c.classList.toggle('selected', isTimerOn === !!riddleConfig.enableTimer);
    });
}

function selectRiddleLength(len) {
    riddleConfig.wordLength = len;
    updateRiddleSettingsChips();
    updateRiddleSettingsFooterButtons();
}

function selectRiddleAttempts(att) {
    riddleConfig.maxAttempts = att;
    updateRiddleSettingsChips();
    updateRiddleSettingsFooterButtons();
}

function selectRiddleTimer(enabled) {
    riddleConfig.enableTimer = !!enabled;
    updateRiddleSettingsChips();
    updateRiddleSettingsFooterButtons();
}

function recordNormalWordleHistory(isWon) {
    try {
        const userKey = currentUser || 'guest';
        const raw = localStorage.getItem(`vocab_normal_wordle_history_${userKey}`);
        let history = [];
        if (raw) history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];

        history.unshift({
            id: 'nh_' + Date.now(),
            word: riddleState.targetWord,
            meaning: riddleState.clueMeaning || '---',
            isWon: !!isWon,
            attempts: riddleState.attempts.length,
            maxAttempts: riddleConfig.maxAttempts || 6,
            timeSpent: riddleConfig.enableTimer ? dailyWordleElapsedSeconds : null,
            timerEnabled: !!riddleConfig.enableTimer,
            timestamp: Date.now()
        });

        if (history.length > 100) history = history.slice(0, 100);
        localStorage.setItem(`vocab_normal_wordle_history_${userKey}`, JSON.stringify(history));
    } catch (e) {
        console.warn('Failed to record normal wordle history:', e);
    }
}

let riddleHistoryPreviousView = 'view-riddle';

function openNormalWordleHistoryModal() {
    closeRiddleSettings();
    riddleHistoryPreviousView = (typeof currentView !== 'undefined' && currentView) ? currentView : 'view-riddle';
    renderNormalWordleHistoryList();
    switchView('view-riddle-history');
}

function exitWordleHistoryView() {
    switchView(riddleHistoryPreviousView || 'view-riddle');
}

function closeNormalWordleHistoryModal() {
    exitWordleHistoryView();
}

function renderNormalWordleHistoryList() {
    const container = document.getElementById('normal-wordle-history-list');
    if (!container) return;
    const userKey = currentUser || 'guest';
    let history = [];
    try {
        const raw = localStorage.getItem(`vocab_normal_wordle_history_${userKey}`);
        if (raw) history = JSON.parse(raw);
    } catch (e) { }

    if (!Array.isArray(history) || history.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:44px; opacity:0.6; display:block; margin-bottom:8px;">history_toggle_off</span>
                <p style="margin:0; font-size:0.92rem;">暂无猜词历史记录</p>
            </div>
        `;
        return;
    }

    container.innerHTML = history.map(item => {
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const isWon = !!item.isWon;
        const timeDisplay = (item.timeSpent !== null && item.timeSpent !== undefined)
            ? `用时 ${formatDailyTimer(item.timeSpent)}`
            : '未开启计时';

        return `
            <div style="background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); border-radius:12px; padding:12px 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:700; font-size:1.05rem; letter-spacing:0.5px;">${escapeHtml(item.word || '')}</span>
                        <span class="badge" style="font-size:0.75rem; padding:2px 8px; border-radius:999px; font-weight:600; ${isWon ? 'background:var(--md-sys-color-success-container, #d1e7dd); color:var(--md-sys-color-success, #0f5132);' : 'background:var(--md-sys-color-error-container, #f8d7da); color:var(--md-sys-color-error, #842029);'}">
                            ${isWon ? '挑战成功' : '挑战失败'}
                        </span>
                    </div>
                    <span style="font-size:0.78rem; color:var(--md-sys-color-outline);">${dateStr}</span>
                </div>
                <div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-bottom:8px; line-height:1.4;">
                    ${escapeHtml(item.meaning || '---')}
                </div>
                <div style="display:flex; align-items:center; gap:14px; font-size:0.8rem; color:var(--md-sys-color-outline);">
                    <span style="display:inline-flex; align-items:center; gap:3px;">
                        <span class="material-symbols-rounded" style="font-size:15px;">flaky</span>
                        <span>尝试次数：<strong style="color:var(--md-sys-color-on-surface);">${item.attempts || 0}/${item.maxAttempts || 6}</strong></span>
                    </span>
                    <span style="display:inline-flex; align-items:center; gap:3px;">
                        <span class="material-symbols-rounded" style="font-size:15px;">schedule</span>
                        <span>${timeDisplay}</span>
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function clearNormalWordleHistory() {
    const userKey = currentUser || 'guest';
    localStorage.removeItem(`vocab_normal_wordle_history_${userKey}`);
    renderNormalWordleHistoryList();
    showToast('已清空普通模式猜词历史');
}

function saveRiddleSettingsOnly() {
    handleRiddleRightBtnClick();
}

async function saveAndStartRiddle() {
    await handleRiddleLeftBtnClick();
}

async function startWordRiddleGame(forceNew = false) {
    isDailyWordleMode = false;
    stopDailyTimer();
    dailyWordleElapsedSeconds = 0;

    if (forceNew) {
        resetAllGameAlertsAndFeedback();
    }
    if (!forceNew && currentUser) {
        const saved = localStorage.getItem(`riddle_progress_${currentUser}`);
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p && !p.gameOver && p.targetWord) {
                    const todayStr = (new Date()).toISOString().slice(0, 10);
                    const savedDaily = localStorage.getItem(`vocab_daily_wordle_${currentUser || 'guest'}_${todayStr}`);
                    let isDailyLeak = !!(p.bookName && p.bookName.includes('今日Wordle'));
                    if (savedDaily) {
                        try {
                            const dObj = JSON.parse(savedDaily);
                            if (dObj && dObj.targetWord && dObj.targetWord.toUpperCase() === p.targetWord.toUpperCase()) {
                                isDailyLeak = true;
                            }
                        } catch (e) { }
                    }
                    if (isDailyLeak) {
                        localStorage.removeItem(`riddle_progress_${currentUser}`);
                    } else {
                        riddleState = {
                            targetWord: p.targetWord,
                            clueMeaning: p.clueMeaning,
                            cluePhone: p.cluePhone || '',
                            bookName: (p.bookName || '单词谜题').replace(/\s*\(今日Wordle\)/g, ''),
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
                        dailyWordleElapsedSeconds = (typeof p.elapsedSeconds === 'number' && !isNaN(p.elapsedSeconds)) ? Math.max(0, p.elapsedSeconds) : 0;

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

                        const timerText = document.getElementById('riddle-daily-timer-text');
                        if (timerText) timerText.innerText = formatDailyTimer(dailyWordleElapsedSeconds);
                        if (riddleConfig.enableTimer) {
                            startDailyTimer();
                        } else {
                            stopDailyTimer();
                        }
                        updateRiddleModeUI();

                        switchView('view-riddle');
                        return;
                    }
                }
            } catch (e) { }
        }
    }

    let candidatePool = [];
    if (typeof isWordleSupportedBook === 'function') {
        const supported = (Array.isArray(riddleConfig.selectedBooks) ? riddleConfig.selectedBooks : []).filter(id => {
            const b = (typeof BookManager !== 'undefined' && BookManager.getBookMeta) ? (BookManager.getBookMeta(id) || id) : id;
            return isWordleSupportedBook(b);
        });
        if (supported.length > 0) {
            riddleConfig.selectedBooks = supported;
            riddleConfig.bookId = supported[0];
        } else {
            riddleConfig.selectedBooks = ['books/经典/高中考纲词汇.json'];
            riddleConfig.bookId = 'books/经典/高中考纲词汇.json';
        }
    }
    const selected = (Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.length > 0)
        ? riddleConfig.selectedBooks
        : ['books/经典/高中考纲词汇.json'];

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
        if (requiredLen > 0) {
            showToast(`未找到长度为 ${requiredLen} 的单词，已切换为任意长度！`);
            riddleConfig.wordLength = 0;
            localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
            return startWordRiddleGame(true);
        } else {
            // 当前选中的词书不含适于 Wordle 猜词的纯单词（如纯词组或翻译词书），自动回退至高中考纲词汇默认词书，绝不卡死
            showToast('所选词书不包含适用于 Wordle 的英文单词，已自动切换为《高中考纲词汇》');
            riddleConfig.selectedBooks = ['books/经典/高中考纲词汇.json'];
            riddleConfig.bookId = 'books/经典/高中考纲词汇.json';
            localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
            try {
                candidatePool = await BookManager.loadMultipleBooks(['books/经典/高中考纲词汇.json']);
            } catch (e) { }
            if (!candidatePool || candidatePool.length === 0) {
                candidatePool = (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : []);
            }
            const fallbackWords = candidatePool.filter(w => {
                const s = (w && w.word ? w.word : '').trim();
                return /^[a-zA-Z]{3,9}$/.test(s);
            });
            if (fallbackWords.length > 0) {
                validWords.push(...fallbackWords);
            } else {
                validWords.push({ word: 'REACT', meaning: 'v. 作出反应', phone: '' });
            }
        }
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

    dailyWordleElapsedSeconds = 0;
    const timerText = document.getElementById('riddle-daily-timer-text');
    if (timerText) timerText.innerText = formatDailyTimer(dailyWordleElapsedSeconds);
    if (riddleConfig.enableTimer) {
        startDailyTimer();
    } else {
        stopDailyTimer();
    }
    updateRiddleModeUI();

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

// ----------------- 今日 Wordle 每日统一单词获取与云端同步 -----------------
async function getDailyWordForDate(dateStr) {
    const todayStr = (new Date()).toISOString().slice(0, 10);
    if (!dateStr) dateStr = todayStr;

    // 禁止查看未来的单词（防剧透）
    if (dateStr > todayStr) {
        return null;
    }

    // 1. 优先从 Supabase 云端拉取当日已锁定的每日词（云端优先，动态更新，不写死）
    if (typeof sbClient !== 'undefined' && sbClient) {
        try {
            const { data, error } = await sbClient
                .from('daily_wordle_words')
                .select('*')
                .eq('date', dateStr)
                .maybeSingle();
            if (!error && data && data.word) {
                const targetW = data.word.trim().toUpperCase();
                const cloudResult = {
                    date: dateStr,
                    word: targetW,
                    meaning: data.meaning || '---',
                    length: data.length || targetW.length,
                    phone: data.phone || ''
                };
                try {
                    localStorage.setItem(`vocab_daily_word_${dateStr}`, JSON.stringify(cloudResult));
                } catch (e) { }
                return cloudResult;
            }
        } catch (e) {
            console.warn('[Wordle] Failed to fetch daily word from Supabase:', e);
        }
    }

    // 2. 本地缓存检查（离线 fallback）
    try {
        const cached = localStorage.getItem(`vocab_daily_word_${dateStr}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.word) return parsed;
        }
    } catch (e) { }

    // 3. 从高考3500中动态抽取确定性每日词 (支持4-8随机字母数)
    let candidatePool = [];
    try {
        if (typeof BookManager !== 'undefined' && BookManager.loadMultipleBooks) {
            candidatePool = await BookManager.loadMultipleBooks(['books/经典/高中考纲词汇.json']);
        }
    } catch (e) { }

    if (!candidatePool || candidatePool.length === 0) {
        if (typeof dictionary !== 'undefined' && dictionary.length > 0) {
            candidatePool = dictionary;
        } else if (typeof DEFAULT_WORDS !== 'undefined') {
            candidatePool = DEFAULT_WORDS;
        }
    }

    // 筛选 4-8 字母的纯英文字母单词
    const validWords = candidatePool.filter(w => {
        const wordStr = (w && w.word ? w.word : '').trim();
        return /^[a-zA-Z]{4,8}$/.test(wordStr);
    });

    if (validWords.length === 0) {
        return {
            date: dateStr,
            word: 'REACT',
            meaning: 'v. 作出反应；发生化学反应',
            length: 5,
            phone: ''
        };
    }

    // 根据日期生成确定性伪随机数种子
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash);

    // 随机抽取 4 到 8 之间的字母长度 (确保每日长度多变且所有用户一致)
    const targetLength = 4 + (seed % 5); // 4, 5, 6, 7, 8

    let poolForLen = validWords.filter(w => w.word.trim().length === targetLength);
    if (poolForLen.length === 0) {
        poolForLen = validWords;
    }
    poolForLen.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));

    const chosenIndex = Math.floor(seed / 5) % poolForLen.length;
    const chosen = poolForLen[chosenIndex];
    const targetWord = chosen.word.trim().toUpperCase();

    let meaningText = '---';
    if (chosen.meanings && chosen.meanings.length > 0) {
        meaningText = chosen.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
    } else if (chosen.meaning) {
        meaningText = chosen.meaning;
    }

    const wordResult = {
        date: dateStr,
        word: targetWord,
        meaning: meaningText,
        length: targetWord.length,
        phone: chosen.phone || ''
    };

    // 保存到本地缓存
    try {
        localStorage.setItem(`vocab_daily_word_${dateStr}`, JSON.stringify(wordResult));
    } catch (e) { }

    // 异步同步至 Supabase 云端，使全网后续玩家完全统一
    if (typeof sbClient !== 'undefined' && sbClient) {
        try {
            sbClient.from('daily_wordle_words').upsert({
                date: dateStr,
                word: targetWord,
                meaning: meaningText,
                length: targetWord.length
            }, { onConflict: 'date' }).then(() => { }).catch(() => { });
        } catch (e) { }
    }

    return wordResult;
}
window.getDailyWordForDate = getDailyWordForDate;

async function startDailyWordleGame() {
    isDailyWordleMode = true;
    updateRiddleModeUI();

    const todayStr = (new Date()).toISOString().slice(0, 10);
    const userKey = currentUser || 'guest';

    // 先从云端获取今日统一词 (支持动态换词与字母数随机)
    const dailyWord = await getDailyWordForDate(todayStr);

    // 1. 如果今天已经有进行中或完成的进度，且与最新云端词一致，恢复进度
    const savedDaily = localStorage.getItem(`vocab_daily_wordle_${userKey}_${todayStr}`);
    let hasRestored = false;
    let restoreData = null;

    if (savedDaily) {
        try {
            const p = JSON.parse(savedDaily);
            if (p && p.date === todayStr && p.targetWord && (!dailyWord || p.targetWord === dailyWord.word)) {
                restoreData = p;
                hasRestored = true;
            }
        } catch (e) {
            console.warn('[Wordle] Failed to parse saved daily progress:', e);
        }
    }

    // 若本地没有或者本地记录尚未完结，向 Supabase 云端检查今日是否已经挑战过
    if ((!hasRestored || !restoreData?.gameOver) && userKey && !userKey.startsWith('游客') && typeof sbClient !== 'undefined' && sbClient) {
        try {
            const { data: userRow } = await sbClient
                .from('user_accounts')
                .select('user_data')
                .eq('username', userKey)
                .single();
            const cloudWordle = userRow?.user_data?.wordle?.[todayStr] || userRow?.user_data?.wordle_history?.[todayStr];
            if (cloudWordle && Array.isArray(cloudWordle.attemptDetails) && cloudWordle.attemptDetails.length > 0) {
                const targetW = cloudWordle.word || (dailyWord ? dailyWord.word : '');
                restoreData = {
                    date: todayStr,
                    targetWord: targetW,
                    clueMeaning: cloudWordle.meaning || (dailyWord ? dailyWord.meaning : '---'),
                    cluePhone: cloudWordle.phonetic || (dailyWord ? dailyWord.phone : ''),
                    bookName: '高考3500',
                    targetLength: targetW.length,
                    maxAttempts: 6,
                    attempts: cloudWordle.attemptDetails,
                    currentInput: '',
                    gameOver: true,
                    isWon: !!cloudWordle.isWon,
                    letterStatus: cloudWordle.letterStatus || {},
                    elapsedSeconds: cloudWordle.timeSpent || 0
                };
                hasRestored = true;
                localStorage.setItem(`vocab_daily_wordle_${userKey}_${todayStr}`, JSON.stringify(restoreData));
            }
        } catch (e) {
            console.warn('[Wordle] Failed to check cloud wordle record:', e);
        }
    }

    if (hasRestored && restoreData) {
        riddleState = {
            targetWord: restoreData.targetWord,
            clueMeaning: restoreData.clueMeaning || '---',
            cluePhone: restoreData.cluePhone || '',
            bookName: '高考3500',
            targetLength: restoreData.targetLength || restoreData.targetWord.length,
            maxAttempts: 6,
            attempts: restoreData.attempts || [],
            currentInput: restoreData.currentInput || '',
            gameOver: !!restoreData.gameOver,
            isWon: !!restoreData.isWon,
            letterStatus: restoreData.letterStatus || {},
            hintLevel: 0,
            isSubmitting: false,
            revealedPositions: new Set(),
            pendingHint: null,
            revealedMeaning: false
        };
        dailyWordleElapsedSeconds = restoreData.elapsedSeconds || 0;

        const topBookName = document.getElementById('riddle-top-book-name');
        if (topBookName) topBookName.innerText = '高考3500';
        initRiddleDraftRows();
        const hintBox = document.getElementById('riddle-hint-box');
        if (hintBox) hintBox.style.display = 'none';

        renderRiddleBoard();
        renderRiddleKeyboard();

        const timerText = document.getElementById('riddle-daily-timer-text');
        if (timerText) timerText.innerText = formatDailyTimer(dailyWordleElapsedSeconds);

        if (riddleState.gameOver) {
            stopDailyTimer();
            const msg = riddleState.isWon
                ? `🎉 今日挑战已通关！用时 ${formatDailyTimer(dailyWordleElapsedSeconds)} (${riddleState.attempts.length}次尝试)`
                : `💔 今日挑战已结束！正确答案：`;
            renderRiddleResult(msg, riddleState.isWon ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)');
        } else {
            startDailyTimer();
        }

        switchView('view-riddle');
        return;
    }

    // 2. 从高考3500与云端获取今日统一词（字母数随机4-8）
    if (!dailyWord) {
        dailyWord = await getDailyWordForDate(todayStr);
    }

    riddleState = {
        targetWord: dailyWord.word,
        clueMeaning: dailyWord.meaning,
        cluePhone: dailyWord.phone || '',
        bookName: '高考3500',
        targetLength: dailyWord.length,
        maxAttempts: 6,
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

    dailyWordleElapsedSeconds = 0;
    saveDailyWordleProgress();

    resetAllGameAlertsAndFeedback();
    const topBookName = document.getElementById('riddle-top-book-name');
    if (topBookName) topBookName.innerText = '高考3500';
    initRiddleDraftRows();
    const hintBox = document.getElementById('riddle-hint-box');
    if (hintBox) hintBox.style.display = 'none';
    const resbox = document.getElementById('riddle-result-box');
    if (resbox) resbox.style.display = 'none';

    renderRiddleBoard();
    renderRiddleKeyboard();
    startDailyTimer();

    switchView('view-riddle');
}

async function recordDailyWordleFinish(isWon) {
    const todayStr = (new Date()).toISOString().slice(0, 10);
    const userKey = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.username) || (typeof currentUser !== 'undefined' ? currentUser : '') || 'guest';
    const record = {
        date: todayStr,
        word: riddleState.targetWord,
        meaning: riddleState.clueMeaning || '---',
        phonetic: riddleState.cluePhone || '',
        isWon: isWon,
        attempts: riddleState.attempts.length,
        attemptDetails: JSON.parse(JSON.stringify(riddleState.attempts || [])),
        letterStatus: JSON.parse(JSON.stringify(riddleState.letterStatus || {})),
        timeSpent: dailyWordleElapsedSeconds,
        timestamp: Date.now()
    };

    // 1. 本地存储历史记录
    try {
        let history = {};
        const raw = localStorage.getItem(`vocab_wordle_history_${userKey}`);
        if (raw) history = JSON.parse(raw);
        history[todayStr] = record;
        localStorage.setItem(`vocab_wordle_history_${userKey}`, JSON.stringify(history));
    } catch (e) {
        console.warn('Failed to save wordle history locally:', e);
    }

    // 2. 同步到 Supabase 专用表 daily_wordle_records 与 user_accounts（仅限已登录真实用户）
    const isGuest = !userKey || userKey === 'guest' || userKey.startsWith('游客');
    if (!isGuest && typeof sbClient !== 'undefined' && sbClient) {
        try {
            const userAvatar = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.avatar)
                ? currentUserProfile.avatar
                : ((typeof getUserAvatar === 'function') ? getUserAvatar(userKey) : '');
            const upsertPayload = {
                date: todayStr,
                username: userKey,
                is_won: isWon,
                attempts: riddleState.attempts.length,
                time_spent: dailyWordleElapsedSeconds
            };
            if (userAvatar) upsertPayload.avatar_url = userAvatar;
            const { error: upsertErr } = await sbClient.from('daily_wordle_records').upsert(upsertPayload, { onConflict: 'date,username' });
            if (upsertErr && userAvatar && upsertErr.message && upsertErr.message.includes('avatar_url')) {
                delete upsertPayload.avatar_url;
                await sbClient.from('daily_wordle_records').upsert(upsertPayload, { onConflict: 'date,username' });
            }
        } catch (e) {
            console.warn('[Wordle] Failed to upsert daily_wordle_records:', e);
        }

        try {
            const { data: userRow, error: fetchErr } = await sbClient
                .from('user_accounts')
                .select('user_data')
                .eq('username', userKey)
                .single();
            if (fetchErr) throw fetchErr;

            const uData = (userRow && userRow.user_data) || {};
            uData.wordle = uData.wordle || {};
            uData.wordle[todayStr] = record;
            uData.wordle_history = uData.wordle_history || {};
            uData.wordle_history[todayStr] = record;

            const { error: updateErr } = await sbClient
                .from('user_accounts')
                .update({ user_data: uData, updated_at: new Date().toISOString() })
                .eq('username', userKey);
            if (updateErr) throw updateErr;
        } catch (e) {
            console.warn('Failed to sync wordle record to cloud:', e);
            if (typeof showToast === 'function') {
                showToast('数据同步失败，请检查网络');
            }
        }
    }
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

    syncFormalInputLetters();
    let html = '';
    const compactClass = (riddleState.targetLength >= 9) ? 'compact-9' : ((riddleState.targetLength === 8) ? 'compact-8' : '');
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');

    for (let r = 0; r < riddleState.maxAttempts; r++) {
        html += '<div class="riddle-row">';
        if (r < riddleState.attempts.length) {
            const att = riddleState.attempts[r];
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = att.guess[c] || '';
                const displayLetter = isLower ? letter.toLowerCase() : letter.toUpperCase();
                const evalClass = att.evaluation[c] || '';
                html += `<div class="riddle-tile ${evalClass} ${compactClass}">${displayLetter}</div>`;
            }
        } else if (r === riddleState.attempts.length && !riddleState.gameOver) {
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = riddleCurrentLetters[c] || '';
                const displayLetter = isLower ? letter.toLowerCase() : letter.toUpperCase();
                const isCurrentActive = (activeFormalCol === c && activeRiddleDraft === null);
                html += `<input type="text"
                    class="riddle-tile ${isCurrentActive ? 'active' : ''} ${compactClass} ${isLower ? 'lowercase' : ''}"
                    id="formal-tile-${c}"
                    data-col="${c}"
                    inputmode="none"
                    maxlength="1"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    style="text-transform: ${isLower ? 'lowercase' : 'uppercase'}; cursor: pointer;"
                    value="${escapeHtml(displayLetter)}"
                    onclick="focusFormalTile(${c})"
                    onfocus="handleFormalTileFocus(${c})"
                    oninput="handleFormalTileInput(event, ${c})"
                    onkeydown="handleFormalTileKeydown(event, ${c})"
                />`;
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
    syncFormalInputLetters();
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
    for (let c = 0; c < len; c++) {
        const tile = document.getElementById(`formal-tile-${c}`);
        if (!tile) continue;
        const char = riddleCurrentLetters[c] || '';
        tile.value = isLower ? char.toLowerCase() : char.toUpperCase();
        if (c === activeFormalCol && !riddleState.gameOver && activeRiddleDraft === null) {
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
                    prev.value = '';
                    if (riddleDraftRows[row]) riddleDraftRows[row][col - 1] = '';
                    handleRiddleDraftFocus(row, col - 1);
                }
            }
            return;
        } else if (/^[a-zA-Z]$/.test(key)) {
            const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
            el.value = isLower ? key.toLowerCase() : key.toUpperCase();
            if (riddleDraftRows[row]) riddleDraftRows[row][col] = key.toUpperCase();
            if (col + 1 < len) {
                handleRiddleDraftFocus(row, col + 1);
            } else {
                handleRiddleDraftFocus(row, col);
            }
            return;
        }
    }

    // 正式答题格
    if (riddleState.gameOver) return;
    if (key === 'ENTER') {
        submitRiddleRow();
    } else if (key === 'BACKSPACE') {
        applyFormalBackspace(activeFormalCol);
    } else if (/^[a-zA-Z]$/.test(key)) {
        applyFormalLetterInput(activeFormalCol, key);
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
    // 已在正式输入格或草稿格聚焦时，由输入框自身 keydown 处理，防止重复输入
    if (activeEl && (activeEl.classList.contains('riddle-tile') || activeEl.classList.contains('riddle-draft-tile'))) {
        return;
    }
    if (activeEl && activeEl.tagName === 'INPUT') {
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
                    handleRiddleDraftFocus(row, col + 1);
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
                        prevTile.value = '';
                        if (riddleDraftRows[row]) riddleDraftRows[row][col - 1] = '';
                        handleRiddleDraftFocus(row, col - 1);
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

    // 正式格
    if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        applyFormalLetterInput(activeFormalCol, key);
    } else if (key === 'Backspace') {
        e.preventDefault();
        applyFormalBackspace(activeFormalCol);
    } else if (key === 'Enter') {
        e.preventDefault();
        submitRiddleRow();
    }
});

// 点击除草稿行与答题格以外区域重置草稿聚焦状态
document.addEventListener('pointerdown', (e) => {
    if (typeof currentView !== 'undefined' && currentView !== 'view-riddle') return;
    if (e.target.closest('#riddle-draft-rows-container') || e.target.closest('#btn-riddle-add-draft') || e.target.closest('#riddle-keyboard') || e.target.closest('#riddle-grid')) {
        return;
    }
    activeRiddleDraft = null;
    document.querySelectorAll('.riddle-draft-tile').forEach(t => t.classList.remove('active-draft-tile'));
});

function handleRiddleKey(char) {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    applyFormalLetterInput(activeFormalCol, char);
}

function handleRiddleBackspace() {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    applyFormalBackspace(activeFormalCol);
}

function submitRiddleRow() {
    if (riddleState.gameOver) return;
    syncFormalInputLetters();
    const len = riddleState.targetLength;
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
    const emptyCount = riddleCurrentLetters.filter(c => !c || !c.trim()).length;
    if (emptyCount > 0) {
        showToast(`还缺少 ${emptyCount} 个字母！`);
        const firstEmpty = riddleCurrentLetters.findIndex(c => !c || !c.trim());
        if (firstEmpty !== -1) focusFormalTile(firstEmpty);
        return;
    }

    const guess = riddleCurrentLetters.join('').toUpperCase();
    const target = riddleState.targetWord.toUpperCase();

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

    const compactClass = (len >= 9) ? 'compact-9' : ((len === 8) ? 'compact-8' : '');
    const grid = document.getElementById('riddle-grid');
    const submittedRowIndex = riddleState.attempts.length;
    const submittedRow = grid ? grid.children[submittedRowIndex] : null;
    if (submittedRow) {
        let submittedHtml = '';
        for (let c = 0; c < len; c++) {
            const letter = formatRiddleCase(guess[c]);
            const evalClass = evaluation[c] || 'absent';
            submittedHtml += `<div class="riddle-tile ${evalClass} ${compactClass} flip" style="animation-delay: ${c * 80}ms;">${letter}</div>`;
        }
        submittedRow.innerHTML = submittedHtml;
        setTimeout(() => {
            if (submittedRow) {
                submittedRow.querySelectorAll('.riddle-tile.flip').forEach(t => {
                    t.classList.remove('flip');
                    t.style.animationDelay = '';
                });
            }
        }, len * 80 + 500);
    }

    riddleState.attempts.push({ guess, evaluation });
    riddleState.currentInput = '';
    riddleCurrentLetters = new Array(len).fill('');
    activeFormalCol = 0;
    activeRiddleDraft = null;
    document.querySelectorAll('.riddle-draft-tile').forEach(t => t.classList.remove('active-draft-tile'));

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
        if (isDailyWordleMode) {
            stopDailyTimer();
            saveDailyWordleProgress();
            recordDailyWordleFinish(true);
        } else {
            stopDailyTimer();
            recordNormalWordleHistory(true);
            saveRiddleProgress();
        }
        if (window.DailyStudyTracker) {
            try { DailyStudyTracker.record('riddle', 1); } catch (e) { }
        }
        if (typeof LevelManager !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
            try { LevelManager.recordDailyTask('riddle'); } catch (e) { }
        }
        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud();
        }
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#146C2E');
        const winTitle = isDailyWordleMode
            ? `🎉 今日挑战成功！用时 ${formatDailyTimer(dailyWordleElapsedSeconds)} (${riddleState.attempts.length}次尝试)`
            : `🎉 恭喜猜中！${riddleConfig.enableTimer ? `用时 ${formatDailyTimer(dailyWordleElapsedSeconds)} · ` : ''}${riddleState.attempts.length} 次尝试`;
        renderRiddleResult(winTitle, 'var(--md-sys-color-success)');
        return;
    }

    if (riddleState.attempts.length >= riddleState.maxAttempts) {
        riddleState.gameOver = true;
        riddleState.isWon = false;
        if (isDailyWordleMode) {
            stopDailyTimer();
            saveDailyWordleProgress();
            recordDailyWordleFinish(false);
        } else {
            stopDailyTimer();
            recordNormalWordleHistory(false);
            saveRiddleProgress();
        }
        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud();
        }
        const failTitle = isDailyWordleMode
            ? `💔 今日挑战结束！正确答案：`
            : `💔 失败！正确单词：`;
        renderRiddleResult(failTitle, 'var(--md-sys-color-error)');
        return;
    }

    saveRiddleProgress();

    // 激活下一行 formal tile inputs
    if (grid && grid.children[riddleState.attempts.length]) {
        const nextRow = grid.children[riddleState.attempts.length];
        let nextHtml = '';
        for (let c = 0; c < len; c++) {
            const isCurrentActive = (c === 0);
            nextHtml += `<input type="text"
                class="riddle-tile ${isCurrentActive ? 'active' : ''} ${compactClass} ${isLower ? 'lowercase' : ''}"
                id="formal-tile-${c}"
                data-col="${c}"
                inputmode="none"
                maxlength="1"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                style="text-transform: ${isLower ? 'lowercase' : 'uppercase'}; cursor: pointer;"
                value=""
                onclick="focusFormalTile(${c})"
                onfocus="handleFormalTileFocus(${c})"
                oninput="handleFormalTileInput(event, ${c})"
                onkeydown="handleFormalTileKeydown(event, ${c})"
            />`;
        }
        nextRow.innerHTML = nextHtml;
        activeFormalCol = 0;
        activeRiddleDraft = null;
        focusFormalTile(0);
        setTimeout(() => {
            focusFormalTile(0);
        }, 50);
        setTimeout(() => {
            focusFormalTile(0);
        }, 150);
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

    let lbActionBox = document.getElementById('riddle-result-lb-action');
    if (isDailyWordleMode) {
        if (!lbActionBox) {
            lbActionBox = document.createElement('div');
            lbActionBox.id = 'riddle-result-lb-action';
            lbActionBox.style.cssText = 'margin-top:14px; display:flex; justify-content:center; gap:8px;';
            resbox.appendChild(lbActionBox);
        }
        lbActionBox.innerHTML = `
            <button type="button" class="btn btn-filled btn-sm" onclick="openLeaderboardView('wordle')" style="border-radius:9999px;">
                <span class="material-symbols-rounded" style="font-size:16px;">leaderboard</span>
                <span>查看今日 Wordle 排行榜</span>
            </button>
        `;
        lbActionBox.style.display = 'flex';
    } else if (lbActionBox) {
        lbActionBox.style.display = 'none';
    }

    let shareActionBox = document.getElementById('riddle-result-share-action');
    if (riddleState.isWon) {
        if (!shareActionBox) {
            shareActionBox = document.createElement('div');
            shareActionBox.id = 'riddle-result-share-action';
            shareActionBox.style.cssText = 'margin-top:10px; display:flex; justify-content:center; gap:8px;';
            resbox.appendChild(shareActionBox);
        }
        shareActionBox.innerHTML = `
            <button type="button" class="btn btn-tonal btn-sm" onclick="handleShareWordlePoster()" style="border-radius:9999px; height:34px; padding:0 16px;">
                <span class="material-symbols-rounded" style="font-size:18px;">share</span>
                <span style="font-weight:600;">炫耀一下</span>
            </button>
        `;
        shareActionBox.style.display = 'flex';
    } else if (shareActionBox) {
        shareActionBox.style.display = 'none';
    }

    try {
        resbox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) { }
    if (typeof showToast === 'function') {
        showToast(title);
    }
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
        if (isDailyWordleMode) {
            stopDailyTimer();
            saveDailyWordleProgress();
            recordDailyWordleFinish(false);
        } else {
            stopDailyTimer();
            recordNormalWordleHistory(false);
            saveRiddleProgress();
        }
        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud();
        }
        renderRiddleBoard();
        renderRiddleKeyboard();
        renderRiddleResult('揭晓答案', 'var(--md-sys-color-primary)');
    }
}

window.handleRiddleLeftBtnClick = handleRiddleLeftBtnClick;
window.handleRiddleRightBtnClick = handleRiddleRightBtnClick;
window.cancelRiddleSettings = cancelRiddleSettings;
window.closeRiddleSettings = closeRiddleSettings;
window.openRiddleSettings = openRiddleSettings;
window.saveAndStartRiddle = saveAndStartRiddle;
window.saveRiddleSettingsOnly = saveRiddleSettingsOnly;
window.selectRiddleCase = selectRiddleCase;
window.selectRiddleLength = selectRiddleLength;
window.selectRiddleAttempts = selectRiddleAttempts;
window.selectRiddleTimer = selectRiddleTimer;


