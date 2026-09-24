/**
 * 单人自学练习模式 (闪卡/选择/拼写/复习)
 * Module: assets/js/views/single.js
 */

/* ==========================================================================
   5. 学习练习模式核心控制 (免二次确认、进度保存与断点恢复)
   ========================================================================== */
function openSingleBookSelector() {
    // 每次打开弹窗时，重置所有分类文件夹默认收起
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-single-books');
    if (modal) {
        modal.classList.add('active');
        renderSingleBookList();
    }
}

function closeSingleBookSelector() {
    const modal = document.getElementById('modal-single-books');
    if (modal) modal.classList.remove('active');
}

function renderSingleBookList() {
    const listEl = document.getElementById('single-book-list');
    if (!listEl) return;

    if (!Array.isArray(singleSelectedBookIds)) {
        singleSelectedBookIds = ['books/考纲/高考3500.json'];
    }

    renderBookFolderTree('single-book-list', {
        selectedIds: singleSelectedBookIds,
        onToggle: 'toggleSingleBook',
        isSingleSelect: false,
        mode: 'single'
    });

    updateSingleSelectedSummary();
}

function toggleSingleBook(bookId) {
    singleSelectedBookIds = toggleBookIdInList(singleSelectedBookIds, bookId);
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    renderSingleBookList();
}

function selectAllSingleBooks(selectAll) {
    if (selectAll) {
        const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;
        singleSelectedBookIds = allBooks.filter(b => b.id !== 'GaoKao3500').map(b => b.id);
    } else {
        singleSelectedBookIds = [];
    }
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    renderSingleBookList();
}

async function refreshBooksFromWorker(notify = false) {
    if (notify) showToast('正在获取词书...');
    const res = await BookManager.fetchBookList();
    renderSingleBookList();
    renderRoomBookChips();
    if (notify) {
        if (res.success) {
            showToast(`成功同步 ${res.books.length} 本云端词书！`);
        } else {
            showToast('词书获取失败！');
        }
    }
}

function updateSingleSelectedSummary() {
    const count = (singleSelectedBookIds || []).length;
    const summary = document.getElementById('single-selected-summary');
    if (summary) {
        summary.innerText = count > 0 ? `已勾选 ${count} 本词书` : '未勾选任何词书';
        summary.style.color = count > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)';
    }
    const startBtn = document.getElementById('btn-start-single-quiz');
    if (startBtn) {
        startBtn.disabled = (count === 0);
    }
    const hubLearnBtn = document.getElementById('btn-hub-learn');
    if (hubLearnBtn) {
        hubLearnBtn.disabled = (count === 0);
    }
}

function openShiCiBookSelector() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-shici-books');
    if (modal) {
        modal.classList.add('active');
        renderShiCiBookList();
    }
}

function closeShiCiBookSelector() {
    const modal = document.getElementById('modal-shici-books');
    if (modal) modal.classList.remove('active');
    saveShiCiState();
    updateHubShiCiBadge();
}

function renderShiCiBookList() {
    const listEl = document.getElementById('shici-book-list');
    if (!listEl) return;

    loadShiCiSettings();
    if (!shiciConfig.selectedBooks || !Array.isArray(shiciConfig.selectedBooks) || shiciConfig.selectedBooks.length === 0) {
        shiciConfig.selectedBooks = ['books/实词/实词.json'];
    }

    renderBookFolderTree('shici-book-list', {
        selectedIds: shiciConfig.selectedBooks,
        onToggle: 'toggleShiCiBook',
        isSingleSelect: false,
        mode: 'shici',
        filterType: 'shici'
    });

    updateShiCiSelectedSummary();
}

function toggleShiCiBook(bookId) {
    loadShiCiSettings();
    if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
    shiciConfig.selectedBooks = toggleBookIdInList(shiciConfig.selectedBooks, bookId);
    saveShiCiState();
    renderShiCiBookList();
    updateShiCiSelectedSummary();
    updateHubShiCiBadge();
}

function selectAllShiCiBooks(selectAll) {
    loadShiCiSettings();
    const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;
    const shiciBooks = allBooks.filter(b => isShiCiBook(b)).concat((window.customBooks || []).filter(b => isShiCiBook(b)));
    if (selectAll) {
        shiciConfig.selectedBooks = shiciBooks.map(b => b.id);
    } else {
        shiciConfig.selectedBooks = [];
    }
    saveShiCiState();
    renderShiCiBookList();
    updateShiCiSelectedSummary();
    updateHubShiCiBadge();
}

function updateShiCiSelectedSummary() {
    const el = document.getElementById('shici-selected-books-summary');
    if (el) {
        const count = Array.isArray(shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        el.innerText = count > 0 ? `已勾选 ${count} 本实词词书` : '未勾选实词词书';
        el.style.color = count > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)';
    }
    const learnBtn = document.getElementById('btn-hub-shici-learn');
    if (learnBtn) {
        const count = Array.isArray(shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        learnBtn.disabled = (count === 0);
    }
}

function loadCustomShiCiBook(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error('实词词书必须是包含实词条目的JSON数组');
                const bookId = 'custom_shici_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const bookName = file.name.replace(/\.json$/i, '');
                const newBook = {
                    id: bookId,
                    name: bookName,
                    rawName: bookName,
                    category: '实词',
                    type: 'shici',
                    isShiCi: true,
                    isCloud: false,
                    count: data.length,
                    words: data
                };
                window.customBooks = window.customBooks || [];
                window.customBooks.push(newBook);
                localStorage.setItem('vocab_custom_books', JSON.stringify(window.customBooks));
                loadShiCiSettings();
                if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
                shiciConfig.selectedBooks.push(bookId);
                saveShiCiState();
                renderShiCiBookList();
                updateShiCiSelectedSummary();
                updateHubShiCiBadge();
                showToast(`已成功导入实词词书《${bookName}》`);
            } catch (err) {
                alert('导入实词词书失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
    event.target.value = '';
}

let singleConfig = JSON.parse(localStorage.getItem('vocab_single_config') || '{"learnBatch":10,"reviewBatch":20,"immediateRetest":true,"autoPlayAudio":false}');
if (singleConfig.immediateRetest === undefined) singleConfig.immediateRetest = true;
if (singleConfig.autoPlayAudio === undefined) singleConfig.autoPlayAudio = false;

function openSingleSettings() {
    const modal = document.getElementById('modal-single-settings');
    if (!modal) return;
    const tip = document.getElementById('audio-online-tip');
    if (tip) {
        tip.innerText = navigator.onLine ? '(需联网)' : '(离线不可用)';
        tip.style.color = navigator.onLine ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-error)';
    }
    updateSingleSettingsChips();
    updateSingleProgressStatusUI(); // 检查并更新当前进度状态
    modal.classList.add('active');
}

// 检查当前是否有正在进行的断点进度，并更新提示与按钮状态
function updateSingleProgressStatusUI() {
    const tipEl = document.getElementById('single-progress-status-tip');
    const clearBtn = document.getElementById('btn-clear-single-progress');
    if (!tipEl || !clearBtn || !currentUser) return;

    const saved = localStorage.getItem(`single_progress_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                tipEl.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                tipEl.style.color = 'var(--md-sys-color-primary)';
                clearBtn.disabled = false;
                return;
            }
        } catch (e) { }
    }
    tipEl.innerText = '无';
    tipEl.style.color = 'var(--md-sys-color-outline)';
    clearBtn.disabled = true; // 无进度时禁用清除按钮
}

// 清除保存的学习进度
function clearCurrentSingleProgress() {
    if (!currentUser) return;
    localStorage.removeItem(`single_progress_${currentUser}`);
    updateHubResumeButtons();       // 首页按钮恢复为“学习新词”
    updateSingleProgressStatusUI(); // 更新当前弹窗内的提示
    showToast('已清除当前学习进度');
}

function closeSingleSettings() {
    const modal = document.getElementById('modal-single-settings');
    if (modal) modal.classList.remove('active');
}

function updateSingleSettingsChips() {
    document.querySelectorAll('#chips-learn-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === singleConfig.learnBatch);
    });
    document.querySelectorAll('#chips-review-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === singleConfig.reviewBatch);
    });
    const retestSwitch = document.getElementById('switch-single-retest');
    if (retestSwitch) {
        retestSwitch.checked = (singleConfig.immediateRetest !== false);
    }
    const autoplaySwitch = document.getElementById('switch-single-autoplay');
    if (autoplaySwitch) {
        autoplaySwitch.checked = (singleConfig.autoPlayAudio === true);
    }
}

function toggleSingleRetestSwitch(checked) {
    singleConfig.immediateRetest = checked;
    showToast(checked ? '即时复习已开启' : '即时复习已关闭');
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
}

function toggleSingleAutoplaySwitch(checked) {
    if (!navigator.onLine && checked) {
        showToast('当前未联网，无法开启发音');
        const autoplaySwitch = document.getElementById('switch-single-autoplay');
        if (autoplaySwitch) autoplaySwitch.checked = false;
        singleConfig.autoPlayAudio = false;
        localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
        return;
    }
    singleConfig.autoPlayAudio = checked;
    showToast(checked ? '自动发音已开启' : '自动发音已关闭');
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
}

function selectLearnBatch(val) {
    singleConfig.learnBatch = val;
    updateSingleSettingsChips();
}

function selectReviewBatch(val) {
    singleConfig.reviewBatch = val;
    updateSingleSettingsChips();
}

function selectImmediateRetest(val) {
    singleConfig.immediateRetest = val;
    updateSingleSettingsChips();
}

function selectAutoPlayAudio(val) {
    if (!navigator.onLine && val) {
        showToast('当前未联网，无法开启发音');
        return;
    }
    singleConfig.autoPlayAudio = val;
    updateSingleSettingsChips();
}

function saveSingleSettings() {
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
    closeSingleSettings();
    showToast('设置已保存');
}


function renderCardMasteryDiamonds(word, animType = null) {
    const bar = document.getElementById('single-mastery-stars');
    if (!bar) return;

    let targetStage = 0;
    if (word) {
        if (isWordMastered(word)) {
            targetStage = 5;
        } else {
            const records = EbbinghausEngine.getRecords();
            const rec = records[word.trim().toLowerCase()];
            if (rec && typeof rec.stage === 'number') {
                targetStage = rec.stage;
            }
        }
    }

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`mastery-star-${i}`);
        if (star) {
            star.classList.remove('anim-gain', 'anim-loss');
            star.style.animation = 'none';
        }
    }
    void bar.offsetWidth; // 强制容器重排以重置所有子元素动效

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`mastery-star-${i}`);
        if (!star) continue;
        star.style.animation = '';

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
            star.style.animationDelay = `${(i - 1) * 80}ms`;
            star.classList.add('anim-gain');
        } else if (animType === 'loss' && !willFill && wasFilled) {
            star.style.animationDelay = `${(5 - i) * 60}ms`;
            star.classList.add('anim-loss');
        } else {
            star.style.animationDelay = '0ms';
        }
    }
}

function scheduleRetestForCurrentQuestion() {
    if (gameMode !== 'single') return;
    if (singleConfig.immediateRetest === false) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || q._retestScheduled) return;
    q._retestScheduled = true;

    const retestQ1 = { ...q, _isRetest: true, _retestScheduled: false };

    // 插入到当前题后第 4 题（过 3 题后重问）
    const insertPos = singleState.currentIdx + 4;
    if (insertPos < singleState.pool.length) {
        singleState.pool.splice(insertPos, 0, retestQ1);
    } else {
        singleState.pool.push(retestQ1);
    }

    // 优化即时复习：如果多次答错（当前本身已是复测题）或后续队列已包含该词，不再在组末多问一遍
    const alreadyScheduledLater = singleState.pool.slice(singleState.currentIdx + 1).some(item => item.word === q.word);
    if (!q._isRetest && !alreadyScheduledLater) {
        const retestQ2 = { ...q, _isRetest: true, _retestScheduled: false };
        singleState.pool.push(retestQ2);
    }
    saveSingleProgress();
}

// 保存学习模式当前进度
function saveSingleProgress() {
    if (!currentUser || gameMode !== 'single' || !singleState || !singleState.pool || singleState.pool.length === 0) return;
    if (singleState.currentIdx >= singleState.pool.length) {
        localStorage.removeItem(`single_progress_${currentUser}`);
        updateHubResumeButtons();
        return;
    }
    const dataToSave = {
        pool: singleState.pool,
        currentIdx: singleState.currentIdx,
        score: singleState.score,
        total: singleState.total,
        sessionName: singleState.sessionName,
        time: Date.now()
    };
    localStorage.setItem(`single_progress_${currentUser}`, JSON.stringify(dataToSave));
    updateHubResumeButtons();
}

// 学习新词入口 (支持断点恢复)
async function startSingleLearning() {
    if (currentUser) {
        const saved = localStorage.getItem(`single_progress_${currentUser}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                    singleState = {
                        pool: parsed.pool,
                        currentIdx: parsed.currentIdx,
                        score: parsed.score || 0,
                        total: parsed.total || 0,
                        sessionName: parsed.sessionName || '新词学习',
                        answered: false,
                        selectedIdx: -1
                    };
                    gameMode = 'single';
                    const titleEl = document.getElementById('single-mode-title');
                    if (titleEl) titleEl.innerText = singleState.sessionName;
                    renderSingleQuestion();
                    switchView('view-single');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
            showToast('请至少选择一本词书！');
            openSingleBookSelector();
            return;
        }
        const words = await BookManager.loadMultipleBooks(singleSelectedBookIds);
        if (!words || words.length === 0) {
            showToast('未获取到词书词汇，请检查网络或选择词书！');
            return;
        }
        dictionary = words;

        const learnedMap = EbbinghausEngine.getRecords();
        const candidateWords = words.filter(w => {
            if (!w || !w.word) return false;
            const k = w.word.trim().toLowerCase();
            if (isWordMastered(k)) return false;
            const rec = learnedMap[k];
            if (rec && rec.stage >= 1) return false;
            return true;
        });

        if (candidateWords.length === 0) {
            showToast('所选词书中的生词已全部学完！请前往【复习】巩固，或在设置中重置词书进度。');
            return;
        }

        const batchSize = singleConfig.learnBatch || 10;
        const shuffled = [...candidateWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const pool = generateShuffledPoolFromWords(shuffled, shuffled.length);

        startSinglePlayerWithPool(pool, '新词学习');
    } catch (err) {
        alert('启动学习失败: ' + err.message);
    }
}

let currentReviewBookId = 'all';

function getBooksWithDueWords() {
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const all = allBooks.concat(window.customBooks || []);
    const seen = new Set();
    const uniqueBooks = [];
    all.forEach(b => {
        if (b && b.id && !seen.has(b.id)) {
            seen.add(b.id);
            uniqueBooks.push(b);
        }
    });

    return uniqueBooks.filter(b => {
        const due = EbbinghausEngine.getDueWordsForBooks([b.id]);
        return due && due.length > 0;
    });
}

function updateReviewPageActiveBookLabel() {
    const titleEl = document.getElementById('single-review-active-book-title');
    const container = document.getElementById('single-review-book-picker-container');
    if (!titleEl || !container) return;

    if (!singleState || singleState.sessionName !== '复习') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'inline-flex';

    if (currentReviewBookId === 'all') {
        titleEl.innerText = '全部词书';
    } else {
        const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
            ? BookManager.availableBooks
            : BookManager.fallbackBooks;
        const all = allBooks.concat(window.customBooks || []);
        const target = all.find(b => b.id === currentReviewBookId);
        const name = target ? (target.rawName || target.name || '当前词书').replace(/^[📂📁\s]+/, '') : '当前词书';
        titleEl.innerText = name;
    }
}

function toggleReviewPageBookDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('single-review-book-menu');
    if (!menu) return;
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    if (isHidden) {
        renderReviewPageBookDropdown();
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function renderReviewPageBookDropdown() {
    const menu = document.getElementById('single-review-book-menu');
    if (!menu) return;

    const booksWithDue = getBooksWithDueWords();
    const totalDue = EbbinghausEngine.getDueWords().length;

    let html = '';

    const isAllActive = currentReviewBookId === 'all';
    html += `
                <div class="md3-custom-select-option ${isAllActive ? 'selected' : ''}" onclick="switchReviewBook('all')" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="material-symbols-rounded" style="font-size:16px;">${isAllActive ? 'check' : 'layers'}</span>
                        <span style="font-weight:600; font-size:0.88rem;">全部待复习</span>
                    </div>
                    <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary);">${totalDue} 词</span>
                </div>
            `;

    if (booksWithDue.length === 0) {
        html += `<div style="padding:10px 12px; font-size:0.82rem; color:var(--md-sys-color-outline); text-align:center;">暂无待复习词书</div>`;
    } else {
        html += `<div style="height:1px; background:var(--md-sys-color-outline-variant, #e2e8f0); margin:4px 0;"></div>`;
        booksWithDue.forEach(b => {
            const isSelected = currentReviewBookId === b.id;
            const dueCount = EbbinghausEngine.getDueWordsForBooks([b.id]).length;
            const bName = escapeHtml(cleanBookName(b.rawName || b.name));
            html += `
                        <div class="md3-custom-select-option ${isSelected ? 'selected' : ''}" onclick="switchReviewBook('${escapeHtml(b.id)}')" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; cursor:pointer;">
                            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                                <span class="material-symbols-rounded" style="font-size:16px; flex-shrink:0;">${isSelected ? 'check' : 'menu_book'}</span>
                                <span style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${bName}</span>
                            </div>
                            <span style="font-size:0.78rem; font-weight:600; color:var(--md-sys-color-primary); margin-left:6px; flex-shrink:0;">${dueCount} 词</span>
                        </div>
                    `;
        });
    }

    menu.innerHTML = html;
}

function switchReviewBook(bookId) {
    const menu = document.getElementById('single-review-book-menu');
    if (menu) menu.style.display = 'none';
    if (bookId === currentReviewBookId) return;
    startSingleReview(bookId);
}

// 记录本轮已复习单词，杜绝连续点击“继续复习”时无限重复上一轮单词
let sessionReviewedWords = new Set();

// 艾宾浩斯复习入口 (按所选词书或指定词书复习，当前词书复习完自动复习下一本)
async function startSingleReview(specificBookId = null) {
    try {
        currentReviewBookId = specificBookId || 'all';

        let targetBookIds = [];
        if (specificBookId && specificBookId !== 'all') {
            targetBookIds = [specificBookId];
        } else {
            const booksWithDue = getBooksWithDueWords();
            if (booksWithDue.length > 0) {
                targetBookIds = booksWithDue.map(b => b.id);
            } else {
                targetBookIds = (singleSelectedBookIds && singleSelectedBookIds.length > 0) ? singleSelectedBookIds : ['GaoKao3500'];
            }
        }

        let words = await BookManager.loadMultipleBooks(targetBookIds);
        if (!words || words.length === 0) {
            showToast('未获取到词书词汇，请检查网络或选择词书！');
            return;
        }

        let wordMap = new Map();
        words.forEach(w => {
            if (w && w.word) wordMap.set(w.word.trim().toLowerCase(), w);
        });

        let dueRecords = EbbinghausEngine.getDueWordsForBooks(targetBookIds);
        // 关键修复：排除本轮会话已复习过的词汇
        let unreviewedDue = dueRecords.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));

        // 如果指定词书的到期待复习词已在本会话全部复习完毕，自动尝试切换下一本有待复习词的词书
        if (unreviewedDue.length === 0 && specificBookId && specificBookId !== 'all') {
            const allBooksWithDue = getBooksWithDueWords().filter(b => {
                const dues = EbbinghausEngine.getDueWordsForBooks([b.id]);
                return dues.some(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));
            });
            if (allBooksWithDue.length > 0) {
                const nextBook = allBooksWithDue.find(b => b.id !== specificBookId) || allBooksWithDue[0];
                if (nextBook) {
                    const allBooks = (BookManager.availableBooks || []).concat(window.customBooks || []);
                    const oldBook = allBooks.find(b => b.id === specificBookId);
                    const oldName = (oldBook ? (oldBook.rawName || oldBook.name) : '当前词书').replace(/^[📂📁\s]+/, '');
                    const nextName = (nextBook.rawName || nextBook.name || '').replace(/^[📂📁\s]+/, '');
                    specificBookId = nextBook.id;
                    currentReviewBookId = nextBook.id;
                    targetBookIds = [specificBookId];
                    const reloadedWords = await BookManager.loadMultipleBooks(targetBookIds);
                    if (reloadedWords && reloadedWords.length > 0) {
                        wordMap.clear();
                        reloadedWords.forEach(w => {
                            if (w && w.word) wordMap.set(w.word.trim().toLowerCase(), w);
                        });
                        dueRecords = EbbinghausEngine.getDueWordsForBooks(targetBookIds);
                        unreviewedDue = dueRecords.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));
                        showToast(`《${oldName}》已复习完，自动继续复习《${nextName}》`);
                    }
                }
            }
        }

        let reviewTargets = [];
        if (unreviewedDue.length > 0) {
            reviewTargets = [...unreviewedDue].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
        } else {
            // 无急需待复习词汇时，抽取已学但尚未熟练掌握的词汇进行强化
            const allLearned = EbbinghausEngine.getAllLearnedWords().filter(r => {
                const k = (r.word || '').trim().toLowerCase();
                return wordMap.has(k) && !isWordMastered(k);
            });

            let unreviewedLearned = allLearned.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));

            if (unreviewedLearned.length === 0) {
                if (allLearned.length === 0) {
                    showToast('🎉 所有词书均已完成复习！暂无待复习词汇');
                    return;
                }
                // 如果所有已学词汇在本会话中均已复习过至少一遍，重置会话去重集，允许开始新一轮强化
                sessionReviewedWords.clear();
                unreviewedLearned = allLearned;
            }

            reviewTargets = [...unreviewedLearned].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
        }

        const batchSize = singleConfig.reviewBatch || 20;
        const selectedBatch = reviewTargets.slice(0, batchSize);

        const wordsList = selectedBatch.map(r => {
            const existing = wordMap.get(r.word.toLowerCase());
            const bId = r.bookId || (targetBookIds.length > 0 ? targetBookIds[0] : null);
            if (existing) {
                return { ...existing, bookId: bId, bookName: '复习' };
            }
            return {
                word: r.word,
                phone: r.phone || '',
                bookId: bId,
                bookName: '复习',
                meanings: [{ pos: '', meaning: r.meaning || '---' }]
            };
        });

        const pool = generateShuffledPoolFromWords(wordsList, wordsList.length);
        startSinglePlayerWithPool(pool, '复习');
        updateReviewPageActiveBookLabel();
    } catch (err) {
        alert('启动复习失败: ' + err.message);
    }
}

async function startSinglePlayerFromSelectedBooks() {
    if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    const btn = document.getElementById('btn-start-single-quiz');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-label-text">正在加载题库...</span>';
    }

    try {
        const words = await BookManager.loadMultipleBooks(singleSelectedBookIds);
        const learnedMap = EbbinghausEngine.getRecords();

        // 核心修改：严格排除已经学过的词（已在记忆库中且 stage >= 1）以及熟词
        const candidateWords = words.filter(w => {
            if (!w || !w.word) return false;
            const k = w.word.trim().toLowerCase();
            if (isWordMastered(k)) return false;
            const rec = learnedMap[k];
            // stage >= 1 代表已经学过进入复习阶段，新学模式中不再抽取
            if (rec && rec.stage >= 1) return false;
            return true;
        });

        if (candidateWords.length === 0) {
            showToast('所选词书中的生词已全部学完！请前往【复习】巩固，或在设置中重置词书进度。');
            return;
        }

        closeSingleBookSelector();
        dictionary = words;
        const batchSize = singleConfig.learnBatch || 10;
        const shuffled = [...candidateWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const pool = generateShuffledPoolFromWords(shuffled, shuffled.length);
        startSinglePlayerWithPool(pool, '单人练习');
    } catch (err) {
        alert('加载词书失败：' + err.message);
    } finally {
        if (btn) {
            btn.disabled = (!singleSelectedBookIds || singleSelectedBookIds.length === 0);
            btn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span><span class="btn-label-text">开始练习</span>';
        }
    }
}

function startSinglePlayerWithPool(pool, defaultBookName = '单人练习') {
    resetAllGameAlertsAndFeedback();
    gameMode = 'single';
    singleState = {
        pool: pool,
        currentIdx: 0,
        answered: false,
        selectedIdx: -1,
        score: 0,
        total: 0,
        sessionName: defaultBookName
    };
    saveSingleProgress();
    const titleEl = document.getElementById('single-mode-title');
    if (titleEl) titleEl.innerText = defaultBookName;
    if (typeof updateReviewPageActiveBookLabel === 'function') {
        updateReviewPageActiveBookLabel();
    }
    renderSingleQuestion();
    switchView('view-single');
}

// 退出单人练习：直接退出无需二次确认，并实时保存进度
function confirmExitSingle() {
    saveSingleProgress();
    switchView('view-hub');
}
