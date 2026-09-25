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
        'dictation': '选择词书 (英语默写)'
    };
    if (titleEl) titleEl.textContent = modeNames[mode] || '选择词书';

    switchView('view-book-selector');
    renderBookSelectorPage();
}

function exitBookSelectorPage() {
    switchView(bookSelectorPreviousView || 'view-hub');
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
        return Array.isArray(singleSelectedBookIds) && singleSelectedBookIds.includes(bookId);
    } else if (bookSelectorMode === 'shici') {
        return typeof shiciConfig !== 'undefined' && Array.isArray(shiciConfig.selectedBooks) && shiciConfig.selectedBooks.includes(bookId);
    } else if (bookSelectorMode === 'riddle') {
        return typeof riddleConfig !== 'undefined' && ((Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.includes(bookId)) || riddleConfig.bookId === bookId);
    } else if (bookSelectorMode === 'dictation') {
        return typeof dictationConfig !== 'undefined' && Array.isArray(dictationConfig.selectedBooks) && dictationConfig.selectedBooks.includes(bookId);
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

    let selectedCount = 0;
    if (bookSelectorMode === 'single') {
        selectedCount = (singleSelectedBookIds || []).length;
    } else if (bookSelectorMode === 'shici') {
        selectedCount = (typeof shiciConfig !== 'undefined' && shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
    } else if (bookSelectorMode === 'riddle') {
        selectedCount = (typeof riddleConfig !== 'undefined' && riddleConfig.selectedBooks) ? riddleConfig.selectedBooks.length : 1;
    } else if (bookSelectorMode === 'dictation') {
        selectedCount = (typeof dictationConfig !== 'undefined' && dictationConfig.selectedBooks) ? dictationConfig.selectedBooks.length : 0;
    }
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
                            <span class="book-folder-count" style="font-size:0.8rem; color:var(--md-sys-color-outline); font-family:monospace;">(${books.length} 本)</span>
                        </div>
                        <div class="book-cover-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                            ${books.map(b => {
            const isSelected = isBookIdSelectedInCurrentMode(b.id);
            const gradient = getProceduralBookGradient(b.name, b.category);
            const coverUrl = b.cover || (b.path ? b.path.replace(/\.json$/i, '.png') : null) || (b.id && String(b.id).endsWith('.json') ? String(b.id).replace(/\.json$/i, '.png') : null);
            return `
                                    <div class="book-cover-card ${isSelected ? 'selected' : ''}" data-book-id="${escapeHtml(b.id)}" onclick="handleBookSelectorToggle('${escapeHtml(b.id)}')">
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
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                                                <span class="badge" style="font-size:0.75rem;">${escapeHtml(b.category || '词书')}</span>
                                                <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-family:monospace;">${b.count ? `${b.count} 词` : ''}</span>
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
        let selectedCount = 0;
        if (bookSelectorMode === 'single') {
            selectedCount = (typeof singleSelectedBookIds !== 'undefined') ? singleSelectedBookIds.length : 0;
        } else if (bookSelectorMode === 'shici') {
            selectedCount = (typeof shiciConfig !== 'undefined' && shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        } else if (bookSelectorMode === 'riddle') {
            selectedCount = (typeof riddleConfig !== 'undefined' && riddleConfig.selectedBooks) ? riddleConfig.selectedBooks.length : 1;
        } else if (bookSelectorMode === 'dictation') {
            selectedCount = (typeof dictationConfig !== 'undefined' && dictationConfig.selectedBooks) ? dictationConfig.selectedBooks.length : 0;
        }
        summaryChip.textContent = `已选 ${selectedCount} 本词书`;
    }
}

async function handleBookSelectorToggle(bookId) {
    const allBooks = getAllUniqueBooks();
    const bookMeta = allBooks.find(b => b.id === bookId) || { id: bookId, name: bookId };

    if (bookSelectorMode === 'single') {
        if (!Array.isArray(singleSelectedBookIds)) singleSelectedBookIds = [];
        if (singleSelectedBookIds.includes(bookId)) {
            if (singleSelectedBookIds.length > 1) {
                singleSelectedBookIds = singleSelectedBookIds.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本背单词词书');
                return;
            }
        } else {
            singleSelectedBookIds.push(bookId);
        }
        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        const badge = document.getElementById('single-book-badge');
        if (badge) badge.innerText = bookMeta.name;
        if (typeof singleState !== 'undefined' && singleState && typeof initSinglePlayerGame === 'function' && currentView === 'view-single') {
            initSinglePlayerGame();
        }
    } else if (bookSelectorMode === 'shici') {
        if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
        if (shiciConfig.selectedBooks.includes(bookId)) {
            if (shiciConfig.selectedBooks.length > 1) {
                shiciConfig.selectedBooks = shiciConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本实词词书');
                return;
            }
        } else {
            shiciConfig.selectedBooks.push(bookId);
        }
        saveShiCiState();
        const badge = document.getElementById('shici-book-badge');
        if (badge) badge.innerText = bookMeta.name;
    } else if (bookSelectorMode === 'riddle') {
        riddleConfig.selectedBooks = [bookId];
        riddleConfig.bookId = bookId;
        if (typeof riddleState !== 'undefined' && riddleState) {
            riddleState.bookName = bookMeta.name;
        }
        saveRiddleSettingsOnly();
        const topBookName = document.getElementById('riddle-top-book-name');
        if (topBookName) topBookName.innerText = bookMeta.name;
        if (currentView === 'view-riddle' && typeof startWordRiddleGame === 'function') {
            startWordRiddleGame(true);
        }
    } else if (bookSelectorMode === 'dictation') {
        if (!Array.isArray(dictationConfig.selectedBooks)) dictationConfig.selectedBooks = [];
        if (dictationConfig.selectedBooks.includes(bookId)) {
            if (dictationConfig.selectedBooks.length > 1) {
                dictationConfig.selectedBooks = dictationConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本默写词书');
                return;
            }
        } else {
            dictationConfig.selectedBooks.push(bookId);
        }
        saveDictationSettings();
        const badge = document.getElementById('dictation-book-badge');
        if (badge) badge.innerText = bookMeta.name;
    }

    updateBookSelectorDOM();
}

