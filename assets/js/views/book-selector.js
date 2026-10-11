/**
 * 选词书与管理词书视图 (Google MD3 风格、单行水平滑动分类、我的分类与操作菜单)
 * Module: assets/js/views/book-selector.js
 */

let bookSelectorMode = 'single';
let bookSelectorActiveCategory = '我的';
let bookSelectorPreviousView = 'view-hub';

let manageBooksActiveCategory = '我的';
let manageBooksPreviousView = 'view-book-selector';
let activeActionBookId = null;

const BOOK_CATEGORIES = ['我的', '全部', '初中', '高中', '大学', '实词', '翻译', '其他', 'Doris'];

/**
 * 根据页面模式获取允许展示的词书分类
 * 规则：
 * 1. 仅在人机对战(ai_duel)、远程联机(room/preset/invite)、同屏对决(local_duel)中显示“全部”选项卡
 * 2. Wordle(riddle)不用显示“实词”和“翻译”选项卡
 * 3. 英语默写(dictation)不用显示“实词”选项卡
 * 4. 实词(shici)模式仅展示“实词”与“我的”
 */
function getCategoriesForMode(mode) {
    if (mode === 'shici') {
        return ['实词', '我的'];
    }
    const showAllModes = ['ai_duel', 'room', 'preset', 'invite', 'local_duel'];
    let cats = [...BOOK_CATEGORIES];
    if (!showAllModes.includes(mode)) {
        cats = cats.filter(c => c !== '全部');
    }
    if (mode === 'riddle') {
        cats = cats.filter(c => c !== '实词' && c !== '翻译');
    }
    if (mode === 'dictation') {
        cats = cats.filter(c => c !== '实词');
    }
    return cats;
}
window.getCategoriesForMode = getCategoriesForMode;

/* ==========================================================================
   1. “选择词书”页面控制器
   ========================================================================== */
function openBookSelectorPage(mode = 'single') {
    if (typeof clearRiddleAnimationClasses === 'function') clearRiddleAnimationClasses();
    bookSelectorMode = mode;
    bookSelectorPreviousView = currentView || 'view-hub';

    const displayCategories = getCategoriesForMode(mode);
    if (mode === 'shici') {
        bookSelectorActiveCategory = '实词';
    } else {
        const myBooks = getMyDownloadedAndLocalBooks();
        if (myBooks && myBooks.length > 0) {
            bookSelectorActiveCategory = '我的';
        } else if (displayCategories.includes('全部')) {
            bookSelectorActiveCategory = '全部';
        } else if (displayCategories.includes('初中')) {
            bookSelectorActiveCategory = '初中';
        } else {
            bookSelectorActiveCategory = displayCategories[0] || '我的';
        }
    }

    if (mode === 'single') {
        if (!Array.isArray(singleSelectedBookIds) || singleSelectedBookIds.length === 0) {
            singleSelectedBookIds = ['books/经典/高中考纲词汇.json'];
            localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
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
        'invite': '选择词书 (对战规则)',
        'ai_duel': '选择词书 (人机对战)',
        'local_duel': '选择词书 (同屏对决)'
    };
    if (titleEl) titleEl.textContent = modeNames[mode] || '选择词书';

    switchView('view-book-selector');
    renderBookSelectorCategoryTabs();
    renderBookSelectorPage();
}

function exitBookSelectorPage() {
    if (bookSelectorMode === 'single') {
        if (!Array.isArray(singleSelectedBookIds) || singleSelectedBookIds.length === 0) {
            singleSelectedBookIds = ['books/经典/高中考纲词汇.json'];
            localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        }
    }
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
    if (bookSelectorMode === 'ai_duel') {
        const modal = document.getElementById('modal-ai-duel-settings');
        if (modal) modal.classList.add('active');
        if (typeof updateAiDuelBookSummaryUI === 'function') updateAiDuelBookSummaryUI();
    }
    if (bookSelectorMode === 'local_duel') {
        const modal = document.getElementById('modal-local-duel-settings');
        if (modal) modal.classList.add('active');
        if (typeof updateLocalDuelBookSummaryUI === 'function') updateLocalDuelBookSummaryUI();
    }
}

/**
 * 切换选择词书页面的分类
 */
function switchBookSelectorCategory(cat) {
    if (cat === 'Doris') {
        if (typeof isDorisUnlocked === 'function' && !isDorisUnlocked()) {
            openDorisPasswordModal(async () => {
                bookSelectorActiveCategory = 'Doris';
                renderBookSelectorCategoryTabs();
                renderBookSelectorPage();
            });
            return;
        } else {
            if (typeof BookManager !== 'undefined' && typeof BookManager.loadDorisBooks === 'function') {
                BookManager.loadDorisBooks(false).then(() => {
                    renderBookSelectorPage();
                });
            }
        }
    }
    bookSelectorActiveCategory = cat;
    renderBookSelectorCategoryTabs();
    renderBookSelectorPage();
}

/**
 * 渲染选择词书顶部的单行分类 Chip 标签栏
 */
function renderBookSelectorCategoryTabs() {
    const container = document.getElementById('book-selector-category-tabs');
    if (!container) return;

    const displayCategories = getCategoriesForMode(bookSelectorMode);
    if (!displayCategories.includes(bookSelectorActiveCategory)) {
        bookSelectorActiveCategory = displayCategories[0] || '我的';
    }

    const isDorisOpen = (typeof isDorisUnlocked === 'function' && isDorisUnlocked());

    container.innerHTML = displayCategories.map(cat => {
        const isActive = (bookSelectorActiveCategory === cat);
        let icon = '';
        if (cat === '我的') icon = 'bookmark';
        else if (cat === '全部') icon = 'apps';
        else if (cat === '初中') icon = 'menu_book';
        else if (cat === '高中') icon = 'school';
        else if (cat === '大学') icon = 'account_balance';
        else if (cat === '实词') icon = 'history_edu';
        else if (cat === '翻译') icon = 'translate';
        else if (cat === '其他') icon = 'category';
        else if (cat === 'Doris') icon = isDorisOpen ? 'lock_open' : 'lock';

        return `
            <button type="button" class="md3-cat-chip ${isActive ? 'active' : ''}" onclick="switchBookSelectorCategory('${cat}')">
                <span class="material-symbols-rounded" style="font-size:18px;">${icon}</span>
                <span>${cat}${cat === 'Doris' && !isDorisOpen ? ' (密钥)' : ''}</span>
            </button>
        `;
    }).join('');
}

/**
 * 获取“我的”分类包含的词书：已下载到本地的云端词书 + 用户本地导入的自定义词书
 */
function getMyDownloadedAndLocalBooks() {
    const allBooks = getAllUniqueBooks();
    return allBooks.filter(b => {
        if (!b) return false;
        // 本地自定义导入的词书
        if (String(b.id).startsWith('custom_') || !b.isCloud) return true;
        // 已下载或缓存了词条的云端词书
        if (b.syncStatus === 'downloaded' || (b.words && b.words.length > 0)) return true;
        if (BookManager.bookCache[b.id] && BookManager.bookCache[b.id].length > 0) return true;
        return false;
    });
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
    if (BookManager.legacyBookMap && BookManager.legacyBookMap[bookId]) {
        bookId = BookManager.legacyBookMap[bookId];
    }
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
    } else if (bookSelectorMode === 'ai_duel') {
        const list = (typeof aiDuelConfig !== 'undefined' && Array.isArray(aiDuelConfig.selectedBooks)) ? aiDuelConfig.selectedBooks : [];
        return typeof isBookIdSelected === 'function' ? isBookIdSelected(list, bookId) : list.includes(bookId);
    } else if (bookSelectorMode === 'local_duel') {
        const list = (typeof localDuelConfig !== 'undefined' && Array.isArray(localDuelConfig.selectedBooks)) ? localDuelConfig.selectedBooks : [];
        return typeof isBookIdSelected === 'function' ? isBookIdSelected(list, bookId) : list.includes(bookId);
    }
    return false;
}

function isWordleUnsupportedBook(b) {
    if (!b) return false;
    let nameStr = (b.name || b.title || b.rawName || '').toString();
    let idStr = (b.id || b.path || '').toString();
    const target = `${nameStr} ${idStr}`.toLowerCase();
    if (isBookShiCi(b)) return true;
    if (target.includes('实词')) return true;
    if (target.includes('初中考纲词组')) return true;
    if (target.includes('高中考纲词组') || target.includes('考纲词组')) return true;
    if (target.includes('518词组') || target.includes('518')) return true;
    if (target.includes('翻译')) return true;
    return false;
}

function renderBookSelectorPage() {
    const container = document.getElementById('book-selector-content-list');
    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (!container) return;

    renderBookSelectorCategoryTabs();

    const allBooks = getAllUniqueBooks();
    const isShiCi = (bookSelectorMode === 'shici');

    let booksToDisplay = [];
    if (bookSelectorActiveCategory === '我的') {
        booksToDisplay = getMyDownloadedAndLocalBooks();
        if (isShiCi) booksToDisplay = booksToDisplay.filter(b => isBookShiCi(b));
    } else if (bookSelectorActiveCategory === '全部') {
        booksToDisplay = isShiCi ? allBooks.filter(b => isBookShiCi(b)) : allBooks;
    } else if (bookSelectorActiveCategory === 'Doris') {
        booksToDisplay = allBooks.filter(b => b.category === 'Doris' || b.isDoris);
    } else {
        booksToDisplay = allBooks.filter(b => b.category === bookSelectorActiveCategory);
    }

    const totalSelectedCount = allBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
    if (summaryChip) {
        if (bookSelectorActiveCategory === '我的') {
            summaryChip.textContent = `共 ${booksToDisplay.length} 本 · 已选 ${totalSelectedCount} 本`;
        } else {
            summaryChip.textContent = `已选 ${totalSelectedCount} 本词书`;
        }
    }

    if (booksToDisplay.length === 0) {
        if (bookSelectorActiveCategory === '我的') {
            container.innerHTML = `
                <div class="empty-books-state">
                    <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">cloud_off</span>
                    <h4 style="margin:12px 0 6px; font-weight:700;">暂无已下载或本地词书</h4>
                    <p style="font-size:0.9rem; color:var(--md-sys-color-outline); max-width:360px; margin:0 auto 16px;">
                        你可以在其他分类中点击下载云端词书，或点击右上角“管理词书”导入你的本地词库。
                    </p>
                    <button type="button" class="btn btn-tonal btn-sm" onclick="switchBookSelectorCategory('高中')">
                        <span class="material-symbols-rounded">download</span>
                        <span>浏览高中词书</span>
                    </button>
                </div>
            `;
        } else if (bookSelectorActiveCategory === 'Doris') {
            const isUnlocked = (typeof isDorisUnlocked === 'function' && isDorisUnlocked());
            if (!isUnlocked) {
                container.innerHTML = `
                    <div class="empty-books-state">
                        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">lock</span>
                        <h4 style="margin:12px 0 6px; font-weight:700;">Doris 内部词库</h4>
                        <p style="font-size:0.9rem; color:var(--md-sys-color-outline); margin-bottom:16px;">
                            该词库为内部专属资源，请输入密钥永久解锁访问。
                        </p>
                        <button type="button" class="btn btn-filled btn-sm" onclick="openDorisPasswordModal(async () => { if (typeof BookManager !== 'undefined') await BookManager.loadDorisBooks(true); renderBookSelectorPage(); })">
                            <span class="material-symbols-rounded">key</span>
                            <span>输入密钥永久解锁</span>
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-books-state">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem; color:var(--md-sys-color-outline);">Doris 词库加载中或暂无词书</p>
                        <button type="button" class="btn btn-tonal btn-sm" style="margin-top:10px;" onclick="BookManager.loadDorisBooks(true)">
                            <span class="material-symbols-rounded">refresh</span>
                            <span>重新加载</span>
                        </button>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="empty-books-state">
                    <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                    <p style="margin-top:10px; font-size:0.95rem; color:var(--md-sys-color-outline);">该分类下暂无词书</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = `
        <div class="book-card-grid">
            ${booksToDisplay.map(b => renderBookCardItem(b, false)).join('')}
        </div>
    `;
}

/**
 * 渲染单张词书卡片 (供选择词书与管理词书通用)
 * @param {object} b - 词书元数据对象
 * @param {boolean} isManageMode - 是否为管理词书页面模式 (我的分类显示···菜单)
 */
function renderBookCardItem(b, isManageMode = false) {
    const isSelected = isBookIdSelectedInCurrentMode(b.id);
    const gradient = getProceduralBookGradient(b.name, b.category);
    const coverUrl = (b.cover && typeof b.cover === 'string' && b.cover.trim()) ? b.cover.trim() : null;
    const isBlockedForWordle = (bookSelectorMode === 'riddle' && isWordleUnsupportedBook(b));

    // 计算词书掌握度
    let prog = { progressPercent: 0, learned: 0, due: 0, mastered: 0 };
    if (isBookShiCi(b) && typeof ShiCiEbbinghausEngine !== 'undefined') {
        const shiciRecs = ShiCiEbbinghausEngine.getRecords();
        const words = b.words || (BookManager.bookCache ? BookManager.bookCache[b.id] : null) || [];
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

    const isDownloaded = (b.syncStatus === 'downloaded' || (b.words && b.words.length > 0) || (BookManager.bookCache[b.id] && BookManager.bookCache[b.id].length > 0));
    const isUpdateAvailable = (b.syncStatus === 'update_available');

    // 更多操作按钮 (在管理词书模式下的“我的”分类中展现)
    const showMoreAction = isManageMode;

    return `
        <div class="book-cover-card ${isSelected ? 'selected' : ''} ${isBlockedForWordle ? 'disabled-for-wordle' : ''}" 
             data-book-id="${escapeHtml(b.id)}" 
             onclick="${isManageMode ? `openBookActionMenu(event, '${escapeHtml(b.id)}')` : `handleBookCardClick('${escapeHtml(b.id)}')`}">
            
            <div class="book-cover-wrap">
                ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                <div class="book-cover-art" style="background:${gradient}; ${coverUrl ? 'display:none;' : ''}">
                    <span class="book-cover-art-cat">${escapeHtml(b.category || '词书')}</span>
                    <span class="book-cover-art-title">${escapeHtml(b.name)}</span>
                    <span class="book-cover-art-count">${b.count ? `${b.count}词` : ''}</span>
                </div>
            </div>

            <div class="book-card-info">
                <div class="book-card-header">
                    <div class="book-card-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${showMoreAction ? `
                            <button type="button" class="book-card-more-btn" onclick="event.stopPropagation(); openBookActionMenu(event, '${escapeHtml(b.id)}')" title="更多操作">
                                <span class="material-symbols-rounded">more_horiz</span>
                            </button>
                        ` : `
                            <div class="book-card-check-badge">
                                ${isSelected ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : ''}
                            </div>
                        `}
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    ${isBlockedForWordle 
                        ? '<span class="badge" style="font-size:0.72rem; background:rgba(239, 68, 68, 0.12); color:#dc2626; font-weight:700;">不支持Wordle</span>' 
                        : `<span class="badge" style="font-size:0.74rem;">${escapeHtml(b.category || '词书')}</span>`}
                    
                    ${isUpdateAvailable ? `
                        <button type="button" class="btn-card-action update" onclick="event.stopPropagation(); handleDownloadBookClick('${escapeHtml(b.id)}')">
                            <span class="material-symbols-rounded" style="font-size:13px;">update</span>
                            <span>更新</span>
                        </button>
                    ` : (!isDownloaded && b.isCloud ? `
                        <button type="button" class="btn-card-action download" onclick="event.stopPropagation(); handleDownloadBookClick('${escapeHtml(b.id)}')">
                            <span class="material-symbols-rounded" style="font-size:13px;">cloud_download</span>
                            <span>下载</span>
                        </button>
                    ` : `
                        <span style="font-size:0.74rem; color:var(--md-sys-color-outline);">${b.count ? `${b.count} 词` : ''}</span>
                    `)}
                </div>

                <div class="book-card-mastery" style="margin-top:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; margin-bottom:3px;">
                        <span style="color:var(--md-sys-color-outline);">${isDownloaded ? '掌握度' : '状态'}</span>
                        <span class="book-card-mastery-text" style="font-weight:700; color:var(--md-sys-color-primary);">
                            ${isDownloaded ? `${prog.progressPercent || 0}%` : '未下载'}
                        </span>
                    </div>
                    <div class="book-progress-mini" style="height:4px; margin:0;">
                        <div class="book-progress-mini-fill" style="width:${isDownloaded ? Math.max((prog.progressPercent > 0 ? 3 : 0), Math.min(100, prog.progressPercent || 0)) : 0}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 点击选择词书卡片
 */
async function handleBookCardClick(bookId) {
    const bookMeta = BookManager.getBookMeta(bookId);
    const isDownloaded = (bookMeta.syncStatus === 'downloaded' || (bookMeta.words && bookMeta.words.length > 0) || (BookManager.bookCache[bookId] && BookManager.bookCache[bookId].length > 0));

    // 若词书尚未下载，点击卡片自动先触发下载，成功后自动选中
    if (!isDownloaded && bookMeta.isCloud) {
        const ok = await BookManager.downloadBook(bookId);
        if (!ok) return;
    }

    handleBookSelectorToggle(bookId);
}

/**
 * 手动点击词书卡片上的下载/更新按钮
 */
async function handleDownloadBookClick(bookId) {
    await BookManager.downloadBook(bookId);
}

/* ==========================================================================
   2. “管理词书”页面控制器 (与选择词书相同结构，但我的分类支持···菜单)
   ========================================================================== */
function openManageBooksPage(prevView = null) {
    manageBooksPreviousView = prevView || currentView || 'view-book-selector';
    manageBooksActiveCategory = '我的';

    switchView('view-manage-books');
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
}

function exitManageBooksPage() {
    switchView(manageBooksPreviousView || 'view-book-selector');
    if (manageBooksPreviousView === 'view-book-selector') {
        renderBookSelectorPage();
    }
}

function switchManageBooksCategory(cat) {
    if (cat === 'Doris') {
        if (typeof isDorisUnlocked === 'function' && !isDorisUnlocked()) {
            openDorisPasswordModal(async () => {
                manageBooksActiveCategory = 'Doris';
                renderManageBooksCategoryTabs();
                renderManageBooksPage();
            });
            return;
        } else {
            if (typeof BookManager !== 'undefined' && typeof BookManager.loadDorisBooks === 'function') {
                BookManager.loadDorisBooks(false).then(() => {
                    renderManageBooksPage();
                });
            }
        }
    }
    manageBooksActiveCategory = cat;
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
}

function renderManageBooksCategoryTabs() {
    const container = document.getElementById('manage-books-category-tabs');
    if (!container) return;

    const displayCategories = getCategoriesForMode('manage');
    if (!displayCategories.includes(manageBooksActiveCategory)) {
        manageBooksActiveCategory = displayCategories[0] || '我的';
    }

    const isDorisOpen = (typeof isDorisUnlocked === 'function' && isDorisUnlocked());

    container.innerHTML = displayCategories.map(cat => {
        const isActive = (manageBooksActiveCategory === cat);
        let icon = '';
        if (cat === '我的') icon = 'bookmark';
        else if (cat === '全部') icon = 'apps';
        else if (cat === '初中') icon = 'menu_book';
        else if (cat === '高中') icon = 'school';
        else if (cat === '大学') icon = 'account_balance';
        else if (cat === '实词') icon = 'history_edu';
        else if (cat === '翻译') icon = 'translate';
        else if (cat === '其他') icon = 'category';
        else if (cat === 'Doris') icon = isDorisOpen ? 'lock_open' : 'lock';

        return `
            <button type="button" class="md3-cat-chip ${isActive ? 'active' : ''}" onclick="switchManageBooksCategory('${cat}')">
                <span class="material-symbols-rounded" style="font-size:18px;">${icon}</span>
                <span>${cat}${cat === 'Doris' && !isDorisOpen ? ' (密钥)' : ''}</span>
            </button>
        `;
    }).join('');
}

function renderManageBooksPage() {
    const container = document.getElementById('manage-books-content-list');
    const summaryChip = document.getElementById('manage-books-summary-chip');
    if (!container) return;

    renderManageBooksCategoryTabs();

    const allBooks = getAllUniqueBooks();
    let booksToDisplay = [];

    if (manageBooksActiveCategory === '我的') {
        booksToDisplay = getMyDownloadedAndLocalBooks();
    } else if (manageBooksActiveCategory === '全部') {
        booksToDisplay = allBooks;
    } else if (manageBooksActiveCategory === 'Doris') {
        booksToDisplay = allBooks.filter(b => b.category === 'Doris' || b.isDoris);
    } else {
        booksToDisplay = allBooks.filter(b => b.category === manageBooksActiveCategory);
    }

    const actionsBar = document.getElementById('manage-books-actions-bar');
    if (actionsBar) {
        actionsBar.style.display = (manageBooksActiveCategory === '我的') ? 'flex' : 'none';
    }

    if (summaryChip) {
        summaryChip.textContent = `共 ${booksToDisplay.length} 本词书`;
    }

    if (booksToDisplay.length === 0) {
        if (manageBooksActiveCategory === '我的') {
            container.innerHTML = `
                <div class="empty-books-state">
                    <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">folder_open</span>
                    <h4 style="margin:12px 0 6px; font-weight:700;">暂无已下载或本地词书</h4>
                    <p style="font-size:0.9rem; color:var(--md-sys-color-outline); margin-bottom:16px;">
                        你可以点击右上角“导入词书”导入 JSON 词库，或在其他分类中下载云端词书。
                    </p>
                    <button type="button" class="btn btn-filled btn-sm" onclick="document.getElementById('manage-books-import-file').click()">
                        <span class="material-symbols-rounded">upload_file</span>
                        <span>导入本地词书</span>
                    </button>
                </div>
            `;
        } else if (manageBooksActiveCategory === 'Doris') {
            const isUnlocked = (typeof isDorisUnlocked === 'function' && isDorisUnlocked());
            if (!isUnlocked) {
                container.innerHTML = `
                    <div class="empty-books-state">
                        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">lock</span>
                        <h4 style="margin:12px 0 6px; font-weight:700;">Doris 内部词库</h4>
                        <p style="font-size:0.9rem; color:var(--md-sys-color-outline); margin-bottom:16px;">
                            该词库为内部专属资源，请输入密钥永久解锁访问。
                        </p>
                        <button type="button" class="btn btn-filled btn-sm" onclick="openDorisPasswordModal(async () => { if (typeof BookManager !== 'undefined') await BookManager.loadDorisBooks(true); renderManageBooksPage(); })">
                            <span class="material-symbols-rounded">key</span>
                            <span>输入密钥永久解锁</span>
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-books-state">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem; color:var(--md-sys-color-outline);">Doris 词库加载中或暂无词书</p>
                        <button type="button" class="btn btn-tonal btn-sm" style="margin-top:10px;" onclick="BookManager.loadDorisBooks(true)">
                            <span class="material-symbols-rounded">refresh</span>
                            <span>重新加载</span>
                        </button>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="empty-books-state">
                    <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                    <p style="margin-top:10px; font-size:0.95rem; color:var(--md-sys-color-outline);">该分类下暂无词书</p>
                </div>
            `;
        }
        return;
    }

    const isMyCategory = (manageBooksActiveCategory === '我的');
    container.innerHTML = `
        <div class="book-card-grid">
            ${booksToDisplay.map(b => renderBookCardItem(b, isMyCategory)).join('')}
        </div>
    `;
}

/* ==========================================================================
   3. 词书操作菜单 (查看内容、重学词书、删除词书)
   ========================================================================== */
function openBookActionMenu(event, bookId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    activeActionBookId = bookId;
    const bookMeta = BookManager.getBookMeta(bookId);

    const menu = document.getElementById('modal-book-actions-menu');
    if (!menu) return;

    const titleEl = document.getElementById('book-action-menu-title');
    if (titleEl) titleEl.textContent = bookMeta ? `《${bookMeta.name}》` : '词书操作';

    const sheet = menu.querySelector('.book-action-menu-sheet');
    const btn = event ? (event.currentTarget || event.target.closest('.book-card-more-btn') || event.target) : null;
    if (btn && sheet) {
        const rect = btn.getBoundingClientRect();
        sheet.style.position = 'fixed';
        sheet.style.margin = '0';
        const menuWidth = 160;
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;
        if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
        let top = rect.bottom + 6;
        if (top + 160 > window.innerHeight - 10) {
            top = Math.max(10, rect.top - 160);
        }
        sheet.style.left = `${left}px`;
        sheet.style.top = `${top}px`;
    }

    menu.classList.add('active', 'dropdown-mode');
}

function closeBookActionMenu() {
    const menu = document.getElementById('modal-book-actions-menu');
    if (menu) {
        menu.classList.remove('active', 'dropdown-mode');
        const sheet = menu.querySelector('.book-action-menu-sheet');
        if (sheet) {
            sheet.style.left = '';
            sheet.style.top = '';
            sheet.style.position = '';
            sheet.style.margin = '';
        }
    }
}

/**
 * 查看词书全部单词内容
 */
async function actionViewBookContent() {
    const bookId = activeActionBookId;
    closeBookActionMenu();
    if (!bookId) return;

    if (typeof viewBookWordsInSettings === 'function') {
        viewBookWordsInSettings(bookId);
    } else {
        const bookMeta = BookManager.getBookMeta(bookId);
        showToast('正在加载词书内容...');
        const words = await BookManager.loadBookData(bookId);
        if (!words || words.length === 0) {
            alert('无法加载该词书的单词条目，请确认已下载完成。');
            return;
        }
        openBookWordsViewerModal(bookMeta ? bookMeta.name : bookId, words);
    }
}

/**
 * 打开词书内容查看弹窗
 */
function openBookWordsViewerModal(title, words) {
    const modal = document.getElementById('modal-book-words-viewer');
    const titleEl = document.getElementById('book-viewer-modal-title');
    const countEl = document.getElementById('book-viewer-modal-count');
    const searchInput = document.getElementById('book-viewer-search-input');
    const listEl = document.getElementById('book-viewer-words-list');

    if (!modal || !listEl) return;

    if (titleEl) titleEl.textContent = `《${title}》`;
    if (countEl) countEl.textContent = `(共 ${words.length} 词)`;
    if (searchInput) searchInput.value = '';

    window.__currentViewingWords = words;
    renderBookViewerList(words);

    modal.classList.add('active');
}

function closeBookWordsViewerModal() {
    const modal = document.getElementById('modal-book-words-viewer');
    if (modal) modal.classList.remove('active');
    window.__currentViewingWords = null;
}

function filterBookViewerWords(query) {
    if (!window.__currentViewingWords) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        renderBookViewerList(window.__currentViewingWords);
        return;
    }
    const filtered = window.__currentViewingWords.filter(item => {
        if (!item) return false;
        const w = (item.word || '').toLowerCase();
        const m = (item.meanings || []).map(x => x.meaning).join(' ').toLowerCase();
        return w.includes(q) || m.includes(q);
    });
    renderBookViewerList(filtered);
}

function renderBookViewerList(wordsList) {
    const listEl = document.getElementById('book-viewer-words-list');
    if (!listEl) return;

    if (!wordsList || wordsList.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding:32px 16px; color:var(--md-sys-color-outline);">
                未找到匹配词条
            </div>
        `;
        return;
    }

    listEl.innerHTML = wordsList.slice(0, 300).map((item, idx) => {
        const word = item.word || '';
        const phone = item.phone || item.pinyin || '';
        const meaningsStr = (item.meanings || []).map(m => {
            const p = m.pos ? `<span style="color:var(--md-sys-color-primary); font-weight:700; margin-right:4px;">${escapeHtml(m.pos)}</span>` : '';
            return `<div>${p}${escapeHtml(m.meaning || '')}</div>`;
        }).join('');

        return `
            <div class="book-viewer-word-item">
                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
                    <span style="font-weight:700; font-size:1.02rem; color:var(--md-sys-color-on-surface);">${escapeHtml(word)}</span>
                    <span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:var(--font-mono, monospace);">${escapeHtml(phone)}</span>
                </div>
                <div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px; line-height:1.45;">
                    ${meaningsStr || '释义暂缺'}
                </div>
            </div>
        `;
    }).join('') + (wordsList.length > 300 ? `<div style="text-align:center; padding:12px; font-size:0.8rem; color:var(--md-sys-color-outline);">已显示前 300 词条</div>` : '');
}

/**
 * 重学词书：清空记忆算法记录与已背进度
 */
async function actionResetBookProgress() {
    closeBookActionMenu();
    if (!activeActionBookId) return;

    const bookId = activeActionBookId;
    const bookMeta = BookManager.getBookMeta(bookId);
    const bookName = bookMeta.name || bookId;

    if (!confirm(`确定要重置词书《${bookName}》的学习进度吗？\n这将清空该词书所有记忆阶段与掌握记录，从头开始背诵。`)) {
        return;
    }

    try {
        if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.resetBookProgress === 'function') {
            await EbbinghausEngine.resetBookProgress(bookId);
        }
        if (isBookShiCi(bookMeta) && typeof ShiCiEbbinghausEngine !== 'undefined') {
            const shiciRecs = ShiCiEbbinghausEngine.getRecords();
            const words = bookMeta.words || (BookManager.bookCache ? BookManager.bookCache[bookId] : null) || [];
            words.forEach(w => {
                if (w && w.word) {
                    delete shiciRecs[w.word.trim()];
                }
            });
            ShiCiEbbinghausEngine.saveRecords(shiciRecs);
        }

        if (currentUser) {
            localStorage.removeItem(`single_learn_progress_${currentUser}`);
            localStorage.removeItem(`single_progress_${currentUser}`);
            localStorage.removeItem(`single_review_progress_${currentUser}`);
            localStorage.removeItem(`shici_learn_progress_${currentUser}`);
            localStorage.removeItem(`shici_review_progress_${currentUser}`);
        }

        showToast(`已成功重置《${bookName}》的学习进度！`);
        renderManageBooksPage();
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
    } catch (e) {
        console.error('Reset book progress error:', e);
        showToast('重置学习进度失败');
    }
}

/**
 * 删除本地词书
 */
async function actionDeleteBook() {
    closeBookActionMenu();
    if (!activeActionBookId) return;

    const bookId = activeActionBookId;
    const bookMeta = BookManager.getBookMeta(bookId);
    const bookName = bookMeta.name || bookId;

    if (!confirm(`确定要从本地删除《${bookName}》吗？\n如果是云端词书，你随时可以在云端分类中重新下载。`)) {
        return;
    }

    try {
        // 如果是自定义本地词书
        if (String(bookId).startsWith('custom_') || !bookMeta.isCloud) {
            await VocabOfflineDB.deleteBook(bookId);
            if (window.customBooks) {
                window.customBooks = window.customBooks.filter(b => b.id !== bookId);
            }
            delete BookManager.bookCache[bookId];
            showToast(`已成功删除本地词书《${bookName}》！`);
        } else {
            // 云端已下载词书
            await BookManager.deleteDownloadedBook(bookId);
            showToast(`已移除《${bookName}》的本地下载缓存！`);
        }

        // 立即从页面 DOM 移除被删除的词书卡片
        document.querySelectorAll(`.book-cover-card[data-book-id="${bookId}"]`).forEach(el => el.remove());

        renderManageBooksPage();
        if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
            renderBookSelectorPage();
        }
    } catch (e) {
        console.error('Delete book error:', e);
        showToast('删除词书失败');
    }
}

/* ==========================================================================
   4. Doris 内部资源访问密码验证弹窗
   ========================================================================== */
let dorisUnlockCallback = null;

function openDorisPasswordModal(onSuccessCallback = null) {
    dorisUnlockCallback = onSuccessCallback;
    const modal = document.getElementById('modal-doris-unlock');
    const input = document.getElementById('doris-password-input');
    const errText = document.getElementById('doris-password-error');
    if (input) input.value = '';
    if (errText) errText.style.display = 'none';
    if (modal) modal.classList.add('active');
    setTimeout(() => { if (input) input.focus(); }, 150);
}

function closeDorisPasswordModal() {
    const modal = document.getElementById('modal-doris-unlock');
    if (modal) modal.classList.remove('active');
    dorisUnlockCallback = null;
}

async function submitDorisPassword() {
    const input = document.getElementById('doris-password-input');
    const errText = document.getElementById('doris-password-error');
    const pwd = input ? input.value.trim() : '';

    if (!verifyDorisPassword(pwd)) {
        if (errText) {
            errText.textContent = '密钥错误，无法访问 Doris 内部资源';
            errText.style.display = 'block';
        }
        if (input) {
            input.classList.add('input-shake');
            setTimeout(() => input.classList.remove('input-shake'), 400);
        }
        return;
    }

    closeDorisPasswordModal();
    showToast('密钥验证成功，已永久解锁 Doris 内部词书！');

    // 永久解锁成功后，自动将活跃分类切换至 Doris
    bookSelectorActiveCategory = 'Doris';
    manageBooksActiveCategory = 'Doris';

    renderBookSelectorCategoryTabs();
    if (typeof renderManageBooksCategoryTabs === 'function') {
        renderManageBooksCategoryTabs();
    }

    if (typeof BookManager !== 'undefined' && typeof BookManager.loadDorisBooks === 'function') {
        await BookManager.loadDorisBooks(true);
    }

    if (typeof dorisUnlockCallback === 'function') {
        const cb = dorisUnlockCallback;
        dorisUnlockCallback = null;
        await cb();
    } else {
        if (typeof window.currentView !== 'undefined' && window.currentView === 'view-manage-books') {
            renderManageBooksPage();
        } else {
            renderBookSelectorPage();
        }
    }
}

/* ==========================================================================
   5. 词书选择切换事件处理器
   ========================================================================== */
async function handleBookSelectorToggle(bookId) {
    if (BookManager.legacyBookMap && BookManager.legacyBookMap[bookId]) {
        bookId = BookManager.legacyBookMap[bookId];
    }
    const allBooks = getAllUniqueBooks();
    const bookMeta = allBooks.find(b => b.id === bookId) || { id: bookId, name: bookId };

    if (bookSelectorMode === 'single') {
        if (!Array.isArray(singleSelectedBookIds)) singleSelectedBookIds = [];
        const isSel = typeof isBookIdSelected === 'function'
            ? isBookIdSelected(singleSelectedBookIds, bookId)
            : singleSelectedBookIds.includes(bookId);

        if (isSel) {
            const nextList = (typeof toggleBookIdInList === 'function'
                ? toggleBookIdInList(singleSelectedBookIds, bookId)
                : singleSelectedBookIds.filter(id => id !== bookId)).filter(id => id !== 'builtin_default');
            if (!nextList || nextList.length === 0) {
                showToast('背单词至少需要保留一本词书');
                return;
            }
            singleSelectedBookIds = nextList;
        } else {
            singleSelectedBookIds = typeof toggleBookIdInList === 'function'
                ? toggleBookIdInList(singleSelectedBookIds, bookId)
                : [...singleSelectedBookIds, bookId];
        }

        if (singleSelectedBookIds.length > 1 && singleSelectedBookIds.includes('builtin_default')) {
            singleSelectedBookIds = singleSelectedBookIds.filter(id => id !== 'builtin_default');
        }

        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        const badge = document.getElementById('single-book-badge');
        if (badge) badge.innerText = bookMeta.name;

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
        if (isWordleUnsupportedBook(bookMeta)) {
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
    } else if (bookSelectorMode === 'ai_duel') {
        if (typeof aiDuelConfig === 'undefined') window.aiDuelConfig = { selectedBooks: [] };
        if (!Array.isArray(aiDuelConfig.selectedBooks)) aiDuelConfig.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(aiDuelConfig.selectedBooks, bookId) : aiDuelConfig.selectedBooks.includes(bookId);
        if (isSel) {
            if (aiDuelConfig.selectedBooks.length > 1) {
                aiDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(aiDuelConfig.selectedBooks, bookId) : aiDuelConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本词书');
                return;
            }
        } else {
            aiDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(aiDuelConfig.selectedBooks, bookId) : [...aiDuelConfig.selectedBooks, bookId];
        }
        localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
        if (typeof updateAiDuelBookSummaryUI === 'function') updateAiDuelBookSummaryUI();
    } else if (bookSelectorMode === 'local_duel') {
        if (typeof localDuelConfig === 'undefined') window.localDuelConfig = { selectedBooks: [] };
        if (!Array.isArray(localDuelConfig.selectedBooks)) localDuelConfig.selectedBooks = [];
        const isSel = typeof isBookIdSelected === 'function' ? isBookIdSelected(localDuelConfig.selectedBooks, bookId) : localDuelConfig.selectedBooks.includes(bookId);
        if (isSel) {
            if (localDuelConfig.selectedBooks.length > 1) {
                localDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(localDuelConfig.selectedBooks, bookId) : localDuelConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本词书');
                return;
            }
        } else {
            localDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(localDuelConfig.selectedBooks, bookId) : [...localDuelConfig.selectedBooks, bookId];
        }
        localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
        if (typeof updateLocalDuelBookSummaryUI === 'function') updateLocalDuelBookSummaryUI();
    }

    renderBookSelectorPage();
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

function openAiDuelBookSelector() {
    const modal = document.getElementById('modal-ai-duel-settings');
    if (modal) modal.classList.remove('active');
    openBookSelectorPage('ai_duel');
}
window.openAiDuelBookSelector = openAiDuelBookSelector;

function openLocalDuelBookSelector() {
    const modal = document.getElementById('modal-local-duel-settings');
    if (modal) modal.classList.remove('active');
    openBookSelectorPage('local_duel');
}
window.openLocalDuelBookSelector = openLocalDuelBookSelector;

// 支持鼠标滚轮在分类 Chips 栏上水平滑动
document.addEventListener('wheel', (e) => {
    const container = e.target.closest('.md3-cat-scroll-container');
    if (container) {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta) {
            container.scrollLeft += delta;
            e.preventDefault();
        }
    }
}, { passive: false });

// 支持电脑端鼠标拖拽横向滑动分类 Chips 栏
(function initCatScrollDrag() {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let activeContainer = null;
    let dragged = false;

    document.addEventListener('mousedown', (e) => {
        const container = e.target.closest('.md3-cat-scroll-container');
        if (!container) return;
        isDown = true;
        activeContainer = container;
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        dragged = false;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDown || !activeContainer) return;
        const x = e.pageX - activeContainer.offsetLeft;
        const walk = (x - startX) * 1.5;
        if (Math.abs(x - startX) > 4) {
            dragged = true;
            activeContainer.classList.add('is-dragging');
        }
        activeContainer.scrollLeft = scrollLeft - walk;
    });

    const stopDrag = () => {
        if (!isDown) return;
        isDown = false;
        if (activeContainer) {
            activeContainer.classList.remove('is-dragging');
            activeContainer = null;
        }
    };

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mouseleave', stopDrag);

    // 拖拽后阻止触发按钮的点击事件
    document.addEventListener('click', (e) => {
        if (dragged && e.target.closest('.md3-cat-scroll-container')) {
            e.stopPropagation();
            e.preventDefault();
            dragged = false;
        }
    }, true);
})();

// 全局暴露管理词书入口
window.openManageBooksPage = openManageBooksPage;
window.exitManageBooksPage = exitManageBooksPage;
window.switchManageBooksCategory = switchManageBooksCategory;
window.openBookActionMenu = openBookActionMenu;
window.closeBookActionMenu = closeBookActionMenu;
window.actionViewBookContent = actionViewBookContent;
window.actionResetBookProgress = actionResetBookProgress;
window.actionDeleteBook = actionDeleteBook;
window.closeBookWordsViewerModal = closeBookWordsViewerModal;
window.filterBookViewerWords = filterBookViewerWords;
window.openDorisPasswordModal = openDorisPasswordModal;
window.closeDorisPasswordModal = closeDorisPasswordModal;
window.submitDorisPassword = submitDorisPassword;
window.handleBookCardClick = handleBookCardClick;
window.handleDownloadBookClick = handleDownloadBookClick;
