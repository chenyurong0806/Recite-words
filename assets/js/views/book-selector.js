/**
 * 独立选词书大屏视图 (封面与分类)
 * Module: assets/js/views/book-selector.js
 */

/* ==========================================================================
   全新独立“选择词书”页面控制器 (支持封面与文件夹分类)
   ========================================================================== */
let bookSelectorMode = 'single';
let bookSelectorActiveCategory = 'english';
let bookSelectorPreviousView = 'view-hub';

function openBookSelectorPage(mode = 'single') {
    if (typeof clearRiddleAnimationClasses === 'function') clearRiddleAnimationClasses();
    bookSelectorMode = mode;
    bookSelectorPreviousView = currentView || 'view-hub';
    const enTab = document.getElementById('tab-bs-en');
    const shiciTab = document.getElementById('tab-bs-shici');

    if (mode === 'shici') {
        bookSelectorActiveCategory = 'shici';
        if (enTab) enTab.style.display = 'none';
        if (shiciTab) {
            shiciTab.style.display = 'inline-flex';
            shiciTab.classList.add('active');
        }
    } else {
        bookSelectorActiveCategory = 'english';
        if (shiciTab) shiciTab.style.display = 'none';
        if (enTab) {
            enTab.style.display = 'inline-flex';
            enTab.classList.add('active');
        }
    }

    const titleEl = document.getElementById('book-selector-page-title');
    const modeNames = {
        'single': '选择词书 (背单词)',
        'shici': '选择词书 (背实词)',
        'riddle': '选择词书 (Wordle)',
        'dictation': '选择词书 (英语默写)',
        'room': '选择词书 (远程联机)',
        'preset': '选择词书 (房间预设)',
        'invite': '选择词书 (对战规则)'
    };
    if (titleEl) titleEl.textContent = modeNames[mode] || '选择词书';

    switchView('view-book-selector');
    renderBookSelectorPage();
}

function exitBookSelectorPage() {
    if (typeof clearRiddleAnimationClasses === 'function') clearRiddleAnimationClasses();
    switchView(bookSelectorPreviousView || 'view-hub');
    if (bookSelectorMode === 'room' && typeof updateRoomBookSummaryUI === 'function') {
        updateRoomBookSummaryUI();
    }
    if (bookSelectorMode === 'preset') {
        const modal = document.getElementById('modal-room-preset');
        if (modal) modal.classList.add('active');
        if (typeof updatePresetBookSummaryUI === 'function') updatePresetBookSummaryUI();
    }
    if (bookSelectorMode === 'invite') {
        const modal = document.getElementById('modal-create-match-invite');
        if (modal) modal.classList.add('active');
        if (typeof updateInviteBookSummaryUI === 'function') updateInviteBookSummaryUI();
    }
}

function switchBookSelectorCategory(cat) {
    if (bookSelectorMode === 'shici' && cat !== 'shici') return;
    if (bookSelectorMode !== 'shici' && cat === 'shici') return;

    bookSelectorActiveCategory = cat;
    document.querySelectorAll('.book-selector-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(cat === 'shici' ? 'tab-bs-shici' : 'tab-bs-en');
    if (activeTab) activeTab.classList.add('active');
    renderBookSelectorPage();
}

function getProceduralBookGradient(title, category = '') {
    const gradients = [
        'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        'linear-gradient(135deg, #065f46, #10b981)',
        'linear-gradient(135deg, #701a75, #ec4899)',
        'linear-gradient(135deg, #831843, #f43f5e)',
        'linear-gradient(135deg, #1e293b, #64748b)',
        'linear-gradient(135deg, #0f766e, #14b8a6)',
        'linear-gradient(135deg, #3730a3, #6366f1)',
        'linear-gradient(135deg, #7c2d12, #f97316)',
        'linear-gradient(135deg, #4c1d95, #8b5cf6)'
    ];
    let hash = 0;
    const str = (title || '') + (category || '');
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
}

function isBookIdSelectedInCurrentMode(bookId) {
    if (bookSelectorMode === 'single') {
        return typeof isBookIdSelected === 'function'
            ? isBookIdSelected(singleSelectedBookIds, bookId)
            : (Array.isArray(singleSelectedBookIds) && singleSelectedBookIds.includes(bookId));
    } else if (bookSelectorMode === 'shici') {
        return typeof shiciConfig !== 'undefined' && Array.isArray(shiciConfig.selectedBooks) && (typeof isBookIdSelected === 'function' ? isBookIdSelected(shiciConfig.selectedBooks, bookId) : shiciConfig.selectedBooks.includes(bookId));
    } else if (bookSelectorMode === 'riddle') {
        return typeof riddleConfig !== 'undefined' && ((typeof isBookIdSelected === 'function' ? isBookIdSelected(riddleConfig.selectedBooks, bookId) : (Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.includes(bookId))) || (typeof isBookIdSelected === 'function' ? isBookIdSelected([riddleConfig.bookId], bookId) : riddleConfig.bookId === bookId));
    } else if (bookSelectorMode === 'dictation') {
        return typeof dictationConfig !== 'undefined' && Array.isArray(dictationConfig.selectedBooks) && (typeof isBookIdSelected === 'function' ? isBookIdSelected(dictationConfig.selectedBooks, bookId) : dictationConfig.selectedBooks.includes(bookId));
    } else if (bookSelectorMode === 'room') {
        const list = (typeof roomConfig !== 'undefined' && Array.isArray(roomConfig.selectedBooks)) ? roomConfig.selectedBooks : [];
        return typeof isBookIdSelected === 'function' ? isBookIdSelected(list, bookId) : list.includes(bookId);
    } else if (bookSelectorMode === 'preset') {
        const list = (typeof activeEditingPreset !== 'undefined' && Array.isArray(activeEditingPreset.selectedBooks)) ? activeEditingPreset.selectedBooks : [];
        return typeof isBookIdSelected === 'function' ? isBookIdSelected(list, bookId) : list.includes(bookId);
    } else if (bookSelectorMode === 'invite') {
        const list = (typeof activeInviteRules !== 'undefined' && Array.isArray(activeInviteRules.selectedBooks)) ? activeInviteRules.selectedBooks : [];
        return typeof isBookIdSelected === 'function' ? isBookIdSelected(list, bookId) : list.includes(bookId);
    }
    return false;
}

function isWordleUnsupportedBook(b) {
    if (!b) return false;
    const nameStr = (b.name || b.title || b.id || '').toString();
    const unsupportedList = ['考纲词组', '词组', '短语', 'phrase', '518', '翻译', '基础闯关', '词汇测试'];
    for (const kw of unsupportedList) {
        if (nameStr.includes(kw)) {
            return true;
        }
    }
    return isPhraseBook(b);
}

function isPhraseBook(b) {
    if (!b) return false;
    const nameStr = (b.name || b.title || b.id || '').toLowerCase();
    if (nameStr.includes('词组') || nameStr.includes('短语') || nameStr.includes('phrase') || nameStr.includes('518') || nameStr.includes('翻译') || nameStr.includes('基础闯关') || nameStr.includes('词汇测试')) {
        return true;
    }
    if (Array.isArray(b.words) && b.words.length > 0) {
        let spaceCount = 0;
        const sample = b.words.slice(0, 30);
        sample.forEach(w => {
            const wordText = (w.word || w.name || '').trim();
            if (wordText.includes(' ') || wordText.includes('...') || wordText.includes('.')) {
                spaceCount++;
            }
        });
        if (spaceCount / sample.length > 0.4) {
            return true;
        }
    }
    return false;
}

function renderBookSelectorPage() {
    const container = document.getElementById('book-selector-content-list');
    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (!container) return;

    const allBooks = getAllUniqueBooks();
    const isShiCi = (bookSelectorMode === 'shici') || (bookSelectorActiveCategory === 'shici');
    const filteredBooks = allBooks.filter(b => isShiCi ? isBookShiCi(b) : !isBookShiCi(b));

    const selectedCount = filteredBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
    if (summaryChip) summaryChip.textContent = `已选 ${selectedCount} 本词书`;

    if (filteredBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem;">该分类下暂无词书</p>
                    </div>
                `;
        return;
    }

    const folderGroups = {};
    filteredBooks.forEach(b => {
        let folder = b.category || '精选';
        if (b.id === 'builtin_default') folder = '内置';
        else if (String(b.id).startsWith('custom_')) folder = '自定义词书';
        if (!folderGroups[folder]) folderGroups[folder] = [];
        folderGroups[folder].push(b);
    });

    const folderOrder = ['内置', '考纲', 'Doris', '精选', '实词', '其他', '自定义词书'];
    const sortedFolderKeys = Object.keys(folderGroups).sort((a, b) => {
        let idxA = folderOrder.indexOf(a);
        let idxB = folderOrder.indexOf(b);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
    });

    container.innerHTML = sortedFolderKeys.map(folderName => {
        const books = folderGroups[folderName];
        return `
                    <div class="book-folder-section" style="margin-bottom: 24px;">
                        <div class="book-folder-header" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--md-sys-color-outline-variant, #e2e8f0);">
                            <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary, #0061a4); font-size:22px;">folder</span>
                            <span class="book-folder-title" style="font-weight:700; font-size:1.02rem; color:var(--md-sys-color-on-surface);">${escapeHtml(folderName)}</span>
                            <span class="book-folder-count" style="font-size:0.8rem; color:var(--md-sys-color-outline);">(${books.length} 本)</span>
                        </div>
                        <div class="book-cover-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                            ${books.map(b => {
            const isSelected = isBookIdSelectedInCurrentMode(b.id);
            const gradient = getProceduralBookGradient(b.name, b.category);
            const coverUrl = (b.cover && typeof b.cover === 'string' && b.cover.trim()) ? b.cover.trim() : null;
            const isPhrase = isPhraseBook(b);
            const isBlockedForWordle = (bookSelectorMode === 'riddle' && (isPhrase || isWordleUnsupportedBook(b)));

            // 计算词书掌握度 (Task: 在选择词书页面显示词书掌握度)
            let prog = { progressPercent: 0, learned: 0, due: 0, mastered: 0 };
            if (isBookShiCi(b) && typeof ShiCiEbbinghausEngine !== 'undefined') {
                const shiciRecs = ShiCiEbbinghausEngine.getRecords();
                const words = b.words || [];
                let learned = 0, mastered = 0;
                words.forEach(w => {
                    if (!w || !w.word) return;
                    const k = w.word.trim();
                    if (ShiCiEbbinghausEngine.isWordMastered(k)) { learned++; mastered++; }
                    else if (shiciRecs[k] && shiciRecs[k].stage >= 1) learned++;
                });
                const total = words.length || b.count || 1;
                const progressPercent = Math.min(100, Math.round((learned / total) * 100));
                prog = { progressPercent, learned, mastered, total };
            } else if (typeof EbbinghausEngine !== 'undefined') {
                prog = EbbinghausEngine.getBookProgress(b.id, b.words);
            }

            return `
                                    <div class="book-cover-card ${isSelected ? 'selected' : ''} ${isBlockedForWordle ? 'disabled-for-wordle' : ''}" data-book-id="${escapeHtml(b.id)}" onclick="handleBookSelectorToggle('${escapeHtml(b.id)}')" style="${isBlockedForWordle ? 'opacity: 0.55; cursor: not-allowed;' : ''}">
                                        <div class="book-cover-wrap">
                                             ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                                            <div class="book-cover-art" style="background:${gradient}; ${coverUrl ? 'display:none;' : ''}">
                                                <span class="book-cover-art-cat">${escapeHtml(b.category || '精选')}</span>
                                                <span class="book-cover-art-title">${escapeHtml(b.name)}</span>
                                                <span class="book-cover-art-count">${b.count ? `${b.count}词` : ''}</span>
                                            </div>
                                        </div>
                                        <div class="book-card-info">
                                             <div class="book-card-header">
                                                 <div class="book-card-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
                                                 <div class="book-card-check-badge">
                                                     ${isSelected ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : ''}
                                                 </div>
                                             </div>
                                             <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                                                 ${isBlockedForWordle 
                                                     ? '<span class="badge" style="font-size:0.72rem; background:rgba(239, 68, 68, 0.12); color:#dc2626; font-weight:700;">不支持Wordle</span>' 
                                                     : `<span class="badge" style="font-size:0.74rem;">${escapeHtml(b.category || '词书')}</span>`}
                                                 <span style="font-size:0.74rem; color:var(--md-sys-color-outline);">${b.count ? `${b.count} 词` : ''}</span>
                                             </div>
                                             <div class="book-card-mastery" style="margin-top:6px;">
                                                 <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; margin-bottom:3px;">
                                                     <span style="color:var(--md-sys-color-outline);">掌握度</span>
                                                     <span style="font-weight:700; color:var(--md-sys-color-primary);">${prog.progressPercent || 0}%</span>
                                                 </div>
                                                 <div class="book-progress-mini" style="height:4px; margin:0;">
                                                     <div class="book-progress-mini-fill" style="width:${prog.progressPercent || 0}%;"></div>
                                                 </div>
                                             </div>
                                         </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `;
    }).join('');
}

function updateBookSelectorDOM() {
    const cards = document.querySelectorAll('.book-cover-card[data-book-id]');
    cards.forEach(card => {
        const bId = card.getAttribute('data-book-id');
        const isSelected = isBookIdSelectedInCurrentMode(bId);
        card.classList.toggle('selected', isSelected);
        const checkBadge = card.querySelector('.book-card-check-badge');
        if (checkBadge) {
            checkBadge.innerHTML = isSelected ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : '';
        }
    });

    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (summaryChip) {
        const allBooks = getAllUniqueBooks();
        const isShiCi = (bookSelectorMode === 'shici') || (bookSelectorActiveCategory === 'shici');
        const filteredBooks = allBooks.filter(b => isShiCi ? isBookShiCi(b) : !isBookShiCi(b));
        const selectedCount = filteredBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
        summaryChip.textContent = `已选 ${selectedCount} 本词书`;
    }
}

async function handleBookSelectorToggle(bookId) {
    const allBooks = getAllUniqueBooks();
    const bookMeta = allBooks.find(b => b.id === bookId) || { id: bookId, name: bookId };

    if (bookSelectorMode === 'single') {
        if (!Array.isArray(singleSelectedBookIds)) singleSelectedBookIds = [];
        const isSel = typeof isBookIdSelected === 'function'
            ? isBookIdSelected(singleSelectedBookIds, bookId)
            : singleSelectedBookIds.includes(bookId);

        if (isSel) {
            if (singleSelectedBookIds.length > 1) {
                singleSelectedBookIds = typeof toggleBookIdInList === 'function'
                    ? toggleBookIdInList(singleSelectedBookIds, bookId)
                    : singleSelectedBookIds.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本背单词词书');
                return;
            }
        } else {
            singleSelectedBookIds = typeof toggleBookIdInList === 'function'
                ? toggleBookIdInList(singleSelectedBookIds, bookId)
                : [...singleSelectedBookIds, bookId];
        }

        // 如果已经选择了其他词书，确保不带上默认内置词书
        if (singleSelectedBookIds.length > 1 && singleSelectedBookIds.includes('builtin_default')) {
            singleSelectedBookIds = singleSelectedBookIds.filter(id => id !== 'builtin_default');
        }

        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        const badge = document.getElementById('single-book-badge');
        if (badge) badge.innerText = bookMeta.name;

        // 切换成其他词书后，清除当前学习进度
        if (currentUser) {
            localStorage.removeItem(`single_learn_progress_${currentUser}`);
            localStorage.removeItem(`single_progress_${currentUser}`);
            localStorage.removeItem(`single_review_progress_${currentUser}`);
        }
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
        if (typeof updateSingleProgressStatusUI === 'function') updateSingleProgressStatusUI();
        if (typeof singleState !== 'undefined' && singleState) {
            singleState.pool = [];
            singleState.currentIdx = 0;
            singleState.answered = false;
        }
        if (typeof initSinglePlayerGame === 'function' && currentView === 'view-single') {
            initSinglePlayerGame();
        }
    } else if (bookSelectorMode === 'shici') {
        if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(shiciConfig.selectedBooks, bookId) : shiciConfig.selectedBooks.includes(bookId);
        if (isSel) {
            if (shiciConfig.selectedBooks.length > 1) {
                shiciConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(shiciConfig.selectedBooks, bookId) : shiciConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本实词词书');
                return;
            }
        } else {
            shiciConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(shiciConfig.selectedBooks, bookId) : [...shiciConfig.selectedBooks, bookId];
        }
        saveShiCiState();
        const badge = document.getElementById('shici-book-badge');
        if (badge) badge.innerText = bookMeta.name;

        if (currentUser) {
            localStorage.removeItem(`shici_learn_progress_${currentUser}`);
            localStorage.removeItem(`shici_review_progress_${currentUser}`);
        }
        if (typeof updateShiCiProgressStatusUI === 'function') updateShiCiProgressStatusUI();
    } else if (bookSelectorMode === 'riddle') {
        if (isPhraseBook(bookMeta) || isWordleUnsupportedBook(bookMeta)) {
            showToast('该词书不支持 Wordle，请选择其他单词词书');
            return;
        }
        riddleConfig.selectedBooks = [bookId];
        riddleConfig.bookId = bookId;
        if (typeof riddleState !== 'undefined' && riddleState) {
            riddleState.bookName = bookMeta.name;
        }
        saveRiddleSettingsOnly();
        const topBookName = document.getElementById('riddle-top-book-name');
        if (topBookName) topBookName.innerText = bookMeta.name;
        if (typeof clearRiddleAnimationClasses === 'function') clearRiddleAnimationClasses();
        if (typeof startWordRiddleGame === 'function') {
            startWordRiddleGame(true);
        }
    } else if (bookSelectorMode === 'dictation') {
        if (!Array.isArray(dictationConfig.selectedBooks)) dictationConfig.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(dictationConfig.selectedBooks, bookId) : dictationConfig.selectedBooks.includes(bookId);
        if (isSel) {
            if (dictationConfig.selectedBooks.length > 1) {
                dictationConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(dictationConfig.selectedBooks, bookId) : dictationConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本默写词书');
                return;
            }
        } else {
            dictationConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(dictationConfig.selectedBooks, bookId) : [...dictationConfig.selectedBooks, bookId];
        }
        saveDictationSettings();
        const badge = document.getElementById('dictation-book-badge');
        if (badge) badge.innerText = bookMeta.name;
    } else if (bookSelectorMode === 'room') {
        if (!roomConfig.selectedBooks) roomConfig.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(roomConfig.selectedBooks, bookId) : roomConfig.selectedBooks.includes(bookId);
        if (isSel) {
            if (roomConfig.selectedBooks.length > 1) {
                roomConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(roomConfig.selectedBooks, bookId) : roomConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本联机词书');
                return;
            }
        } else {
            roomConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(roomConfig.selectedBooks, bookId) : [...roomConfig.selectedBooks, bookId];
        }
        if (typeof updateRoomBookSummaryUI === 'function') updateRoomBookSummaryUI();
        if (typeof broadcastRuleChange === 'function' && isHost) broadcastRuleChange();
    } else if (bookSelectorMode === 'preset') {
        if (!window.activeEditingPreset) window.activeEditingPreset = { selectedBooks: [] };
        if (!activeEditingPreset.selectedBooks) activeEditingPreset.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(activeEditingPreset.selectedBooks, bookId) : activeEditingPreset.selectedBooks.includes(bookId);
        if (isSel) {
            if (activeEditingPreset.selectedBooks.length > 1) {
                activeEditingPreset.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(activeEditingPreset.selectedBooks, bookId) : activeEditingPreset.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本词书');
                return;
            }
        } else {
            activeEditingPreset.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(activeEditingPreset.selectedBooks, bookId) : [...activeEditingPreset.selectedBooks, bookId];
        }
        if (typeof updatePresetBookSummaryUI === 'function') updatePresetBookSummaryUI();
    } else if (bookSelectorMode === 'invite') {
        if (!window.activeInviteRules) window.activeInviteRules = { selectedBooks: [] };
        if (!activeInviteRules.selectedBooks) activeInviteRules.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(activeInviteRules.selectedBooks, bookId) : activeInviteRules.selectedBooks.includes(bookId);
        if (isSel) {
            if (activeInviteRules.selectedBooks.length > 1) {
                activeInviteRules.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(activeInviteRules.selectedBooks, bookId) : activeInviteRules.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本词书');
                return;
            }
        } else {
            activeInviteRules.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(activeInviteRules.selectedBooks, bookId) : [...activeInviteRules.selectedBooks, bookId];
        }
        if (typeof updateInviteBookSummaryUI === 'function') updateInviteBookSummaryUI();
    }

    updateBookSelectorDOM();
}

function openRoomBookSelector(target = 'room') {
    if (target === 'room' && typeof isHost !== 'undefined' && !isHost) {
        showToast('仅房主可更改对决词书');
        return;
    }
    if (target === 'preset') {
        const modal = document.getElementById('modal-room-preset');
        if (modal) modal.classList.remove('active');
        openBookSelectorPage('preset');
        return;
    }
    if (target === 'invite') {
        const modal = document.getElementById('modal-create-match-invite');
        if (modal) modal.classList.remove('active');
        openBookSelectorPage('invite');
        return;
    }
    openBookSelectorPage('room');
}
window.openRoomBookSelector = openRoomBookSelector;


