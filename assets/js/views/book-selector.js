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

const BOOK_CATEGORIES = ['我的', '全部', '本地', '初中', '高中', '大学', '实词', '翻译', '其他', 'Doris'];

/**
 * 根据页面模式获取允许展示的词书分类
 * 规则：
 * 1. 仅在人机对战(ai_duel)、远程联机(room/preset/invite)、同屏对决(local_duel)中显示“全部”选项卡
 * 2. Wordle(riddle)不用显示“实词”和“翻译”选项卡
 * 3. 英语默写(dictation)不用显示“实词”选项卡
 * 4. 实词(shici)模式仅展示“实词”、“我的”与“本地”
 * 5. 本地模式下展示“云端”分类（显示已下载的云端词书）；非本地模式展示“本地”分类（显示本地词书）
 */
function getCategoriesForMode(mode) {
    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        const cats = ['全部', '云端'];
        const allLocalBooks = (window.customBooks || []).filter(b => b && (!b.isCloud || b.isDiskBook));

        // 按模式过滤候选词书：
        // 背单词(single)、英语默写(dictation)、Wordle(riddle)严禁包含实词词书
        // 背实词(shici)严禁包含英语词书
        const filtered = allLocalBooks.filter(b => {
            if (mode === 'shici') return (typeof isShiCiBook === 'function' && isShiCiBook(b));
            if (mode === 'single' || mode === 'dictation' || mode === 'riddle') return !(typeof isShiCiBook === 'function' && isShiCiBook(b));
            return true;
        });

        const folderCats = new Set();

        // 1. 直接读取本地专属词书目录(local_books)中的所有物理文件夹作为分类！
        let diskFolders = window.localDiskFolders;
        if (!Array.isArray(diskFolders)) {
            try {
                diskFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
            } catch (e) {
                diskFolders = [];
            }
        }
        if (Array.isArray(diskFolders)) {
            diskFolders.forEach(folderName => {
                const trimmed = (folderName || '').trim();
                if (trimmed && trimmed !== '未分类' && trimmed !== '全部' && trimmed !== '云端' && trimmed !== '本地' && trimmed !== 'cloud_books' && trimmed !== 'local_books') {
                    folderCats.add(trimmed);
                }
            });
        }

        // 2. 从已有词书中提取子文件夹分类
        filtered.forEach(b => {
            const cat = (b.category || '未分类').trim();
            if (cat && cat !== '未分类' && cat !== '未归类' && cat !== '本地' && cat !== '云端' && cat !== '自定义' && cat !== '全部') {
                folderCats.add(cat);
            }
        });

        folderCats.forEach(c => cats.push(c));
        cats.push('未分类');
        return cats;
    }

    if (mode === 'shici') {
        return ['实词', '我的', '本地'];
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
    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        bookSelectorActiveCategory = displayCategories[0] || '全部';
    } else if (mode === 'shici') {
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
    if (typeof clearRiddleAnimationClasses === 'function') clearRiddleAnimationClasses();
    switchView(bookSelectorPreviousView || 'view-hub', { direction: 'back' });
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
        else if (cat === '本地') icon = 'folder_special';
        else if (cat === '云端') icon = 'cloud_done';
        else if (cat === '英语词书') icon = 'school';
        else if (cat === '实词词书') icon = 'history_edu';
        else if (cat === '初中') icon = 'menu_book';
        else if (cat === '高中') icon = 'school';
        else if (cat === '大学') icon = 'account_balance';
        else if (cat === '实词') icon = 'history_edu';
        else if (cat === '翻译') icon = 'translate';
        else if (cat === '其他') icon = 'category';
        else if (cat === 'Doris') icon = isDorisOpen ? 'lock_open' : 'lock';
        else icon = 'folder';

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

/* ==========================================================================
   本地模式独立文件夹树组件与操作 (支持嵌套子文件夹、拖拽导入、拖动归类与悬浮操作)
   ========================================================================== */
let localFolderTreeCollapseMap = {};
let _draggingBookInfo = null;

function buildLocalBooksTree(allLocalBooks, diskFolderPaths = []) {
    const folderPathSet = new Set();

    (diskFolderPaths || []).forEach(p => {
        const clean = (p || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (clean && !['未分类', '未归类', '全部', '云端', '本地', 'cloud_books', 'local_books'].includes(clean)) {
            const parts = clean.split('/');
            let cur = '';
            parts.forEach(part => {
                cur = cur ? `${cur}/${part}` : part;
                folderPathSet.add(cur);
            });
        }
    });

    // 强去重：按 ID、按名称+分类、按文件路径多重仲裁去重，彻底消除重复卡片
    const dedupedLocalBooks = [];
    const seenIds = new Set();
    const seenNameCat = new Set();
    const seenPaths = new Set();

    (allLocalBooks || []).forEach(b => {
        if (!b) return;
        const bId = b.id ? String(b.id) : '';
        const bName = cleanBookName(b.name || b.rawName || '').toLowerCase();
        const bCat = (b.category || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim().toLowerCase();
        const nameCatKey = bName ? `${bName}::${bCat}` : '';
        const bPath = (b.path || '').replace(/\\/g, '/').toLowerCase();

        if (bId && seenIds.has(bId)) return;
        if (nameCatKey && seenNameCat.has(nameCatKey)) return;
        if (bPath && seenPaths.has(bPath)) return;

        if (bId) seenIds.add(bId);
        if (nameCatKey) seenNameCat.add(nameCatKey);
        if (bPath) seenPaths.add(bPath);

        dedupedLocalBooks.push(b);
    });

    dedupedLocalBooks.forEach(b => {
        if (b.isCloud) return;
        const cat = (b.category || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (cat && !['未分类', '未归类', '全部', '云端', '本地', 'cloud_books', 'local_books'].includes(cat)) {
            const parts = cat.split('/');
            let cur = '';
            parts.forEach(part => {
                cur = cur ? `${cur}/${part}` : part;
                folderPathSet.add(cur);
            });
        }
    });

    const nodeMap = new Map();
    function getNode(path) {
        if (!nodeMap.has(path)) {
            const parts = path.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.slice(0, -1).join('/');
            nodeMap.set(path, {
                path: path,
                name: name,
                parentPath: parentPath,
                subfolders: [],
                books: []
            });
        }
        return nodeMap.get(path);
    }

    folderPathSet.forEach(path => getNode(path));

    const uncatBooks = [];
    const cloudBooks = [];

    dedupedLocalBooks.forEach(b => {
        if (b.isCloud) {
            cloudBooks.push(b);
            return;
        }
        const cat = (b.category || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (!cat || ['未分类', '未归类', '本地', '自定义'].includes(cat)) {
            uncatBooks.push(b);
        } else if (nodeMap.has(cat)) {
            nodeMap.get(cat).books.push(b);
        } else {
            getNode(cat).books.push(b);
        }
    });

    const rootFolders = [];
    nodeMap.forEach(node => {
        if (node.parentPath && nodeMap.has(node.parentPath)) {
            nodeMap.get(node.parentPath).subfolders.push(node);
        } else {
            rootFolders.push(node);
        }
    });

    function sortNodes(nodes) {
        nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }));
        nodes.forEach(n => sortNodes(n.subfolders));
    }
    sortNodes(rootFolders);

    return { rootFolders, uncatBooks, cloudBooks };
}

function getNodeBookCounts(node, selectedCheckFn = null) {
    let total = node.books.length;
    let selected = selectedCheckFn ? node.books.filter(b => selectedCheckFn(b.id)).length : 0;
    node.subfolders.forEach(sub => {
        const subCounts = getNodeBookCounts(sub, selectedCheckFn);
        total += subCounts.total;
        selected += subCounts.selected;
    });
    return { total, selected };
}

function renderTreeFolderNode(node, level = 0, isManageMode = false, options = {}) {
    const containerId = options.containerId || 'manage-books-content-list';
    const folderKey = `${containerId}_folder_${node.path}`;
    const isCollapsed = localFolderTreeCollapseMap[folderKey] === true;
    const safeId = 'folder-' + encodeURIComponent(node.path).replace(/%/g, '_');

    const counts = getNodeBookCounts(node, isManageMode ? null : isBookIdSelectedInCurrentMode);
    const badgeText = isManageMode
        ? `共 ${counts.total} 本`
        : `已选 ${counts.selected} / 共 ${counts.total} 本`;

    return `
        <div class="local-tree-folder ${level > 0 ? 'nested-subfolder' : ''} ${isCollapsed ? 'collapsed' : ''}" 
             id="${containerId}-${safeId}" 
             data-folder-path="${escapeHtml(node.path)}">
            <div class="local-tree-folder-header" 
                 onclick="toggleLocalTreeFolder('${containerId}-${safeId}', '${folderKey}')"
                 ondragover="handleLocalFolderDragOver(event, '${escapeHtml(node.path)}')"
                 ondragleave="handleLocalFolderDragLeave(event)"
                 ondrop="handleLocalFolderDrop(event, '${escapeHtml(node.path)}')">
                
                <div class="local-tree-folder-left">
                    <span class="material-symbols-rounded local-tree-chevron">expand_more</span>
                    <span class="material-symbols-rounded local-tree-folder-icon">folder</span>
                    <span class="local-tree-folder-name" title="${escapeHtml(node.path)}">${escapeHtml(node.name)}</span>
                    <span class="local-tree-folder-badge">${badgeText}</span>
                </div>

                ${isManageMode ? `
                    <div class="local-tree-folder-actions" onclick="event.stopPropagation()">
                        <button type="button" class="tree-act-btn" onclick="actionCreateBookInFolder('${escapeHtml(node.path)}')" title="新建词书" aria-label="新建词书">
                            <span class="material-symbols-rounded">note_add</span>
                        </button>
                        <button type="button" class="tree-act-btn" onclick="actionImportBookToFolder('${escapeHtml(node.path)}')" title="导入词书" aria-label="导入词书">
                            <span class="material-symbols-rounded">upload_file</span>
                        </button>
                        <button type="button" class="tree-act-btn" onclick="actionRenameFolder('${escapeHtml(node.path)}')" title="重命名文件夹" aria-label="重命名文件夹">
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                        <button type="button" class="tree-act-btn" onclick="actionCreateSubFolder('${escapeHtml(node.path)}')" title="新建子文件夹" aria-label="新建子文件夹">
                            <span class="material-symbols-rounded">create_new_folder</span>
                        </button>
                        <button type="button" class="tree-act-btn danger" onclick="actionDeleteFolder('${escapeHtml(node.path)}')" title="删除文件夹" aria-label="删除文件夹">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="local-tree-folder-body"
                 ondragover="handleLocalFolderDragOver(event, '${escapeHtml(node.path)}')"
                 ondragleave="handleLocalFolderDragLeave(event)"
                 ondrop="handleLocalFolderDrop(event, '${escapeHtml(node.path)}')">
                ${node.subfolders.map(subNode => renderTreeFolderNode(subNode, level + 1, isManageMode, options)).join('')}

                ${node.books.length > 0 ? `
                    <div class="book-card-grid local-tree-book-grid">
                        ${node.books.map(b => renderBookCardItem(b, isManageMode, node.path)).join('')}
                    </div>
                ` : (node.subfolders.length === 0 ? `
                    <div class="local-tree-empty-folder" 
                         ondragover="handleLocalFolderDragOver(event, '${escapeHtml(node.path)}')" 
                         ondragleave="handleLocalFolderDragLeave(event)" 
                         ondrop="handleLocalFolderDrop(event, '${escapeHtml(node.path)}')">
                        <span class="material-symbols-rounded" style="font-size:22px; opacity:0.4;">folder_open</span>
                        <span>文件夹为空，可拖入词书文件或卡片到此处</span>
                    </div>
                ` : '')}
            </div>
        </div>
    `;
}

function renderLocalFolderTree(containerId, options = {}) {
    if (typeof parkBookDropdownMenus === 'function') parkBookDropdownMenus();
    const container = document.getElementById(containerId);
    if (!container) return;

    const isManageMode = !!options.isManageMode;
    const mode = options.mode || bookSelectorMode || 'single';

    const allBooks = getAllUniqueBooks();
    let localBooks = (window.customBooks || []).filter(b => b && (!b.isCloud || b.isDiskBook));
    const cloudBooks = allBooks.filter(b => b.isCloud && (b.syncStatus === 'downloaded' || (b.words && b.words.length > 0) || (BookManager.bookCache && BookManager.bookCache[b.id])));

    // 强去重合并，防止同一个词书因本地磁盘/云端多重来源重复渲染
    const candidateList = [...localBooks, ...cloudBooks];
    let booksForTree = [];
    const treeSeenIds = new Set();
    const treeSeenNameCat = new Set();

    candidateList.forEach(b => {
        if (!b) return;
        const bId = b.id ? String(b.id) : '';
        const bName = cleanBookName(b.name || b.rawName || '').toLowerCase();
        const bCat = (b.category || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim().toLowerCase();
        const nameCatKey = bName ? `${bName}::${bCat}` : '';

        if (bId && treeSeenIds.has(bId)) return;
        if (nameCatKey && treeSeenNameCat.has(nameCatKey)) return;

        if (bId) treeSeenIds.add(bId);
        if (nameCatKey) treeSeenNameCat.add(nameCatKey);
        booksForTree.push(b);
    });

    if (!isManageMode) {
        if (mode === 'shici') {
            booksForTree = booksForTree.filter(b => typeof isShiCiBook === 'function' && isShiCiBook(b));
        } else if (['single', 'dictation', 'riddle'].includes(mode)) {
            booksForTree = booksForTree.filter(b => !(typeof isShiCiBook === 'function' && isShiCiBook(b)));
        }
    }

    let diskFolders = window.localDiskFolders;
    if (!Array.isArray(diskFolders)) {
        try {
            diskFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
        } catch (e) { diskFolders = []; }
    }

    const tree = buildLocalBooksTree(booksForTree, diskFolders);
    if (!isManageMode) {
        const sortSelectedFirst = (arr) => {
            if (!Array.isArray(arr) || arr.length <= 1) return arr;
            const sel = [];
            const unsel = [];
            arr.forEach(b => (isBookIdSelectedInCurrentMode(b.id) ? sel : unsel).push(b));
            return sel.concat(unsel);
        };
        const sortFolderNodeBooks = (node) => {
            if (!node) return;
            if (Array.isArray(node.books)) node.books = sortSelectedFirst(node.books);
            if (Array.isArray(node.children)) node.children.forEach(sortFolderNodeBooks);
        };
        if (Array.isArray(tree.rootFolders)) tree.rootFolders.forEach(sortFolderNodeBooks);
        tree.uncatBooks = sortSelectedFirst(tree.uncatBooks);
        tree.cloudBooks = sortSelectedFirst(tree.cloudBooks);
    }

    const summaryChip = document.getElementById(isManageMode ? 'manage-books-summary-chip' : 'book-selector-summary-chip');
    if (summaryChip) {
        if (isManageMode) {
            summaryChip.textContent = `共 ${booksForTree.length} 本词书 · ${tree.rootFolders.length} 个分类`;
        } else {
            const selectedCount = allBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
            summaryChip.textContent = `共 ${booksForTree.length} 本 · 已选 ${selectedCount} 本`;
        }
    }

    const clearBtn = document.getElementById('btn-clear-selected-books');
    if (clearBtn && !isManageMode) {
        const totalSelected = allBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
        clearBtn.style.display = totalSelected > 0 ? 'inline-flex' : 'none';
    }

    if (booksForTree.length === 0 && tree.rootFolders.length === 0) {
        container.innerHTML = `
            <div class="empty-books-state" style="padding: 48px 16px; text-align: center;">
                <span class="material-symbols-rounded" style="font-size:52px; opacity:0.35;">folder_open</span>
                <h4 style="margin:12px 0 6px; font-weight:700;">本地词书库暂无词书</h4>
                <p style="font-size:0.92rem; color:var(--md-sys-color-outline); margin-bottom:18px;">
                    你可以将 JSON 词书文件直接拖入页面，或点击按钮快速创建与导入
                </p>
                <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-filled btn-sm" onclick="document.getElementById('manage-books-import-file').click()">
                        <span class="material-symbols-rounded">upload_file</span>
                        <span>导入词书</span>
                    </button>
                    <button type="button" class="btn btn-tonal btn-sm" onclick="promptCreateLocalCategory()">
                        <span class="material-symbols-rounded">create_new_folder</span>
                        <span>新建分类文件夹</span>
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '<div class="local-tree-container">';

    // 1. 递归渲染所有文件夹分类
    tree.rootFolders.forEach(folderNode => {
        html += renderTreeFolderNode(folderNode, 0, isManageMode, { containerId });
    });

    // 2. 渲染未归类文件夹
    if (tree.uncatBooks.length > 0 || (isManageMode && tree.rootFolders.length === 0)) {
        const uncatKey = `${containerId}_folder_uncat`;
        const isCollapsed = localFolderTreeCollapseMap[uncatKey] === true;
        const uncatSelected = tree.uncatBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
        const uncatBadge = isManageMode
            ? `共 ${tree.uncatBooks.length} 本`
            : `已选 ${uncatSelected} / 共 ${tree.uncatBooks.length} 本`;

        html += `
            <div class="local-tree-folder ${isCollapsed ? 'collapsed' : ''}" 
                 id="${containerId}-folder-uncat" 
                 data-folder-path="">
                <div class="local-tree-folder-header" 
                     onclick="toggleLocalTreeFolder('${containerId}-folder-uncat', '${uncatKey}')"
                     ondragover="handleLocalFolderDragOver(event, '')"
                     ondragleave="handleLocalFolderDragLeave(event)"
                     ondrop="handleLocalFolderDrop(event, '')">
                    <div class="local-tree-folder-left">
                        <span class="material-symbols-rounded local-tree-chevron">expand_more</span>
                        <span class="material-symbols-rounded local-tree-folder-icon" style="color:var(--md-sys-color-secondary);">folder_open</span>
                        <span class="local-tree-folder-name">未分类</span>
                        <span class="local-tree-folder-badge">${uncatBadge}</span>
                    </div>

                    ${isManageMode ? `
                        <div class="local-tree-folder-actions" onclick="event.stopPropagation()">
                            <button type="button" class="tree-act-btn" onclick="actionCreateBookInFolder('')" title="新建词书" aria-label="新建词书">
                                <span class="material-symbols-rounded">note_add</span>
                            </button>
                            <button type="button" class="tree-act-btn" onclick="actionImportBookToFolder('')" title="导入词书" aria-label="导入词书">
                                <span class="material-symbols-rounded">upload_file</span>
                            </button>
                            <button type="button" class="tree-act-btn" onclick="promptCreateLocalCategory()" title="新建分类" aria-label="新建分类">
                                <span class="material-symbols-rounded">create_new_folder</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="local-tree-folder-body"
                     ondragover="handleLocalFolderDragOver(event, '')"
                     ondragleave="handleLocalFolderDragLeave(event)"
                     ondrop="handleLocalFolderDrop(event, '')">
                    ${tree.uncatBooks.length > 0 ? `
                        <div class="book-card-grid local-tree-book-grid">
                            ${tree.uncatBooks.map(b => renderBookCardItem(b, isManageMode, '')).join('')}
                        </div>
                    ` : `
                        <div class="local-tree-empty-folder" 
                             ondragover="handleLocalFolderDragOver(event, '')" 
                             ondragleave="handleLocalFolderDragLeave(event)" 
                             ondrop="handleLocalFolderDrop(event, '')">
                            <span class="material-symbols-rounded" style="font-size:22px; opacity:0.4;">folder_open</span>
                            <span>暂无未分类词书</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // 3. 渲染已下载云端词书
    if (tree.cloudBooks.length > 0) {
        const cloudKey = `${containerId}_folder_cloud_downloaded`;
        const isCollapsed = localFolderTreeCollapseMap[cloudKey] === true;
        const cloudSelected = tree.cloudBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
        const cloudBadge = isManageMode
            ? `共 ${tree.cloudBooks.length} 本`
            : `已选 ${cloudSelected} / 共 ${tree.cloudBooks.length} 本`;

        html += `
            <div class="local-tree-folder ${isCollapsed ? 'collapsed' : ''}" 
                 id="${containerId}-folder-cloud-downloaded" 
                 data-folder-path="__cloud__">
                <div class="local-tree-folder-header" 
                     onclick="toggleLocalTreeFolder('${containerId}-folder-cloud-downloaded', '${cloudKey}')">
                    <div class="local-tree-folder-left">
                        <span class="material-symbols-rounded local-tree-chevron">expand_more</span>
                        <span class="material-symbols-rounded local-tree-folder-icon" style="color:#0284c7;">cloud_done</span>
                        <span class="local-tree-folder-name">云端词书 (已下载)</span>
                        <span class="local-tree-folder-badge">${cloudBadge}</span>
                    </div>
                </div>
                <div class="local-tree-folder-body">
                    <div class="book-card-grid local-tree-book-grid">
                        ${tree.cloudBooks.map(b => renderBookCardItem(b, isManageMode, '__cloud__')).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function toggleLocalTreeFolder(elemId, folderKey) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const isCollapsed = el.classList.toggle('collapsed');
    localFolderTreeCollapseMap[folderKey] = isCollapsed;
}

/* ==========================================================================
   拖拽导入词书文件与拖动卡片移动文件夹事件处理
   ========================================================================== */
function handleBookCardDragStart(e, bookId, fromCategory) {
    _draggingBookInfo = { bookId, fromCategory };
    if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', bookId);
        e.dataTransfer.effectAllowed = 'move';
    }
    e.currentTarget.classList.add('book-card-dragging');
}

function handleBookCardDragEnd(e) {
    _draggingBookInfo = null;
    e.currentTarget.classList.remove('book-card-dragging');
    document.querySelectorAll('.drag-folder-hover').forEach(el => el.classList.remove('drag-folder-hover'));
}

function handleLocalFolderDragOver(e, targetFolderPath) {
    e.preventDefault();
    e.stopPropagation();
    if (targetFolderPath === '__cloud__') return;

    if (e.dataTransfer) {
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
            e.dataTransfer.dropEffect = 'copy';
        } else {
            e.dataTransfer.dropEffect = 'move';
        }
    }

    const folder = e.currentTarget.closest('.local-tree-folder');
    const header = folder ? folder.querySelector('.local-tree-folder-header') : (e.currentTarget.closest('.local-tree-folder-header') || e.currentTarget);
    if (header) header.classList.add('drag-folder-hover');
}

function handleLocalFolderDragLeave(e) {
    const folder = e.currentTarget.closest('.local-tree-folder');
    const header = folder ? folder.querySelector('.local-tree-folder-header') : (e.currentTarget.closest('.local-tree-folder-header') || e.currentTarget);
    if (header) header.classList.remove('drag-folder-hover');
}

async function handleLocalFolderDrop(e, targetFolderPath) {
    e.preventDefault();
    e.stopPropagation();
    const folder = e.currentTarget.closest('.local-tree-folder');
    const header = folder ? folder.querySelector('.local-tree-folder-header') : (e.currentTarget.closest('.local-tree-folder-header') || e.currentTarget);
    if (header) header.classList.remove('drag-folder-hover');
    document.querySelectorAll('.drag-folder-hover').forEach(el => el.classList.remove('drag-folder-hover'));

    if (targetFolderPath === '__cloud__') {
        showToast('云端词书分类为只读，无法移动或导入至此');
        return;
    }

    // 1. 拖入词书文件完成导入
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await importCustomBookFiles(e.dataTransfer.files, targetFolderPath);
        return;
    }

    // 2. 拖动词书卡片移动至不同文件夹
    const bookId = (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '') || (_draggingBookInfo ? _draggingBookInfo.bookId : '');
    if (!bookId) return;

    const fromCategory = _draggingBookInfo ? _draggingBookInfo.fromCategory : '';
    if (fromCategory === targetFolderPath) {
        return;
    }

    await moveBookToFolder(bookId, targetFolderPath);
}

/* ==========================================================================
   文件夹悬浮行快捷操作函数 (新建词书、导入词书、重命名、新建子文件夹、删除文件夹)
   ========================================================================== */
async function actionCreateBookInFolder(folderPath) {
    const name = await showAppPrompt({
        title: '新建词书',
        message: folderPath ? `在文件夹「${folderPath}」下新建词书：` : '请输入新词书名称：',
        defaultValue: '生词本',
        placeholder: '词书名称'
    });
    if (!name || !name.trim()) return;
    const bookName = cleanBookName(name.trim());
    const bookId = 'custom_' + Date.now();
    const cleanCat = folderPath ? folderPath.trim() : '未分类';

    const bookObj = {
        id: bookId,
        name: bookName,
        rawName: bookName,
        category: cleanCat,
        isShiCi: bookName.includes('实词') || bookName.includes('文言'),
        count: 0,
        words: [],
        folderId: null,
        isCloud: false,
        isDiskBook: true,
        syncStatus: 'downloaded',
        createdAt: Date.now()
    };

    if (!window.customBooks) window.customBooks = [];
    window.customBooks.push(bookObj);

    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(bookObj);
    }
    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        await ElectronManager.saveBookToDisk(bookName + '.json', JSON.stringify([]), 'local', cleanCat === '未分类' ? '' : cleanCat);
        await ElectronManager.scanAndSyncLocalBooks(true);
    }
    if (typeof BookManager !== 'undefined') {
        BookManager.bookCache[bookId] = [];
        BookManager.mergeCustomBooks();
    }

    showToast(`已创建词书《${bookName}》`);
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
}

function actionImportBookToFolder(folderPath) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = async (e) => {
        await importCustomBookFiles(e.target.files, folderPath);
    };
    input.click();
}

async function actionCreateSubFolder(parentPath) {
    const subName = await showAppPrompt({
        title: '新建子文件夹',
        message: `在「${parentPath}」下新建子文件夹：`,
        placeholder: '子文件夹名称'
    });
    if (!subName || !subName.trim()) return;
    const cleanSub = subName.trim();
    const newPath = `${parentPath}/${cleanSub}`;
    await createLocalCategoryPath(newPath);
}

async function actionRenameFolder(folderPath) {
    const parts = folderPath.split('/');
    const currentName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const newName = await showAppPrompt({
        title: '重命名文件夹',
        message: `请输入文件夹「${currentName}」的新名称：`,
        defaultValue: currentName,
        placeholder: '新名称'
    });
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const cleanNew = newName.trim();
    const newPath = parentPath ? `${parentPath}/${cleanNew}` : cleanNew;

    await renameLocalCategoryPath(folderPath, newPath);
}

async function actionDeleteFolder(folderPath) {
    const ok = await showAppConfirm({
        title: '删除文件夹',
        message: `确定要删除文件夹「${folderPath}」吗？\n文件夹内的词书将被移至根目录。`,
        confirmText: '删除',
        cancelText: '取消',
        isDanger: true
    });
    if (!ok) return;

    await deleteLocalCategoryPath(folderPath);
}

async function createLocalCategoryPath(pathName) {
    const clean = (pathName || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').trim();
    if (!clean) return;

    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        const res = await ElectronManager.createCategory(clean);
        if (res) {
            renderManageBooksPage();
            renderBookSelectorPage();
        }
    } else {
        let customFolders = [];
        try {
            customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
        } catch (e) { customFolders = []; }
        if (!customFolders.includes(clean)) {
            customFolders.push(clean);
            localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
        }
        window.localDiskFolders = customFolders;
        showToast(`已创建文件夹「${clean}」`);
        renderManageBooksPage();
        renderBookSelectorPage();
    }
}

async function renameLocalCategoryPath(oldPath, newPath) {
    if (!oldPath || !newPath || oldPath === newPath) return;

    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        const res = await ElectronManager.renameCategory(oldPath, newPath);
        if (res) {
            renderManageBooksPage();
            renderBookSelectorPage();
        }
    } else {
        let customFolders = [];
        try {
            customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
        } catch (e) { customFolders = []; }

        customFolders = customFolders.map(f => {
            if (f === oldPath) return newPath;
            if (f.startsWith(oldPath + '/')) return newPath + f.slice(oldPath.length);
            return f;
        });
        localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
        window.localDiskFolders = customFolders;

        (window.customBooks || []).forEach(b => {
            if (b.category === oldPath) {
                b.category = newPath;
                if (typeof VocabOfflineDB !== 'undefined') VocabOfflineDB.saveBook(b);
            } else if (b.category && b.category.startsWith(oldPath + '/')) {
                b.category = newPath + b.category.slice(oldPath.length);
                if (typeof VocabOfflineDB !== 'undefined') VocabOfflineDB.saveBook(b);
            }
        });

        showToast(`已重命名为「${newPath}」`);
        renderManageBooksPage();
        renderBookSelectorPage();
    }
}

async function deleteLocalCategoryPath(folderPath) {
    if (!folderPath) return;

    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        const res = await ElectronManager.deleteCategory(folderPath);
        if (res) {
            renderManageBooksPage();
            renderBookSelectorPage();
        }
    } else {
        let customFolders = [];
        try {
            customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
        } catch (e) { customFolders = []; }

        customFolders = customFolders.filter(f => f !== folderPath && !f.startsWith(folderPath + '/'));
        localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
        window.localDiskFolders = customFolders;

        (window.customBooks || []).forEach(b => {
            if (b.category === folderPath || (b.category && b.category.startsWith(folderPath + '/'))) {
                b.category = '未分类';
                if (typeof VocabOfflineDB !== 'undefined') VocabOfflineDB.saveBook(b);
            }
        });

        showToast(`已删除分类「${folderPath}」`);
        renderManageBooksPage();
        renderBookSelectorPage();
    }
}

async function moveBookToFolder(bookId, targetCategory) {
    const cleanCat = (targetCategory || '').trim() || '未分类';
    const bookMeta = (typeof BookManager !== 'undefined' && BookManager.getBookMeta) 
        ? BookManager.getBookMeta(bookId) 
        : (window.customBooks || []).find(b => b.id === bookId);
    if (!bookMeta) return;

    const oldCategory = bookMeta.category;
    // 1. 立即乐观更新内存中的词书分类
    bookMeta.category = cleanCat;
    if (window.customBooks) {
        const b = window.customBooks.find(x => x.id === bookId);
        if (b) b.category = cleanCat;
    }
    if (typeof BookManager !== 'undefined') {
        if (Array.isArray(BookManager.availableBooks)) {
            const ab = BookManager.availableBooks.find(x => x.id === bookId);
            if (ab) ab.category = cleanCat;
        }
        BookManager.mergeCustomBooks();
    }

    // 2. 立即刷新所有相关词书列表视图，零延迟响应
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
    if (typeof renderManageBooksCategoryTabs === 'function') renderManageBooksCategoryTabs();
    if (typeof renderBookSelectorCategoryTabs === 'function') renderBookSelectorCategoryTabs();
    if (typeof renderManageLocalBooksInSettings === 'function') renderManageLocalBooksInSettings();

    // 3. 执行持久化
    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        const ok = await ElectronManager.moveBook(bookId, cleanCat === '未分类' ? '' : cleanCat);
        if (!ok) {
            bookMeta.category = oldCategory;
            if (window.customBooks) {
                const b = window.customBooks.find(x => x.id === bookId);
                if (b) b.category = oldCategory;
            }
            if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
            if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
        }
    } else {
        const b = (window.customBooks || []).find(x => x.id === bookId);
        if (b) {
            b.category = cleanCat;
            if (typeof VocabOfflineDB !== 'undefined') {
                await VocabOfflineDB.saveBook(b);
            }
        }
        if (typeof BookManager !== 'undefined') {
            BookManager.mergeCustomBooks();
        }
        showToast(`已将《${bookMeta.name}》移动至「${cleanCat}」`);
    }

    // 4. 持久化后最终再次刷新视图
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
}

async function importCustomBookFiles(fileList, targetCategory = '') {
    const files = Array.from(fileList || []).filter(f => f.name.toLowerCase().endsWith('.json'));
    if (files.length === 0) {
        showToast('请选择或拖入 .json 格式的词书文件');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const rawBookName = file.name.replace(/\.json$/i, '');
            const bookName = cleanBookName(rawBookName);

            let text = await file.text();
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            const rawData = safeJsonParse(text);
            if (!rawData) throw new Error('无效的 JSON 内容');

            const isAncient = (file.name.includes('实词') || file.name.includes('文言') || 
                (Array.isArray(rawData) && rawData.some(it => it && (it.isAncient || (it.pinyin && !it.word && it.char)))));

            const bookId = 'custom_' + Date.now() + '_' + i;
            const normalized = (typeof BookManager !== 'undefined' && typeof BookManager.normalizeWords === 'function')
                ? BookManager.normalizeWords(rawData, bookName, bookId)
                : rawData;
            if (!normalized || normalized.length === 0) throw new Error('未解析到有效词条');

            const cleanCat = (targetCategory || '').trim() || '未分类';

            const bookObj = {
                id: bookId,
                name: bookName,
                rawName: bookName,
                category: cleanCat,
                isShiCi: isAncient,
                count: normalized.length,
                words: normalized,
                folderId: null,
                isCloud: false,
                isDiskBook: true,
                syncStatus: 'downloaded',
                createdAt: Date.now() + i
            };

            if (!window.customBooks) window.customBooks = [];
            const existingIdx = window.customBooks.findIndex(b => b.name === bookName && b.category === cleanCat);
            if (existingIdx >= 0) {
                window.customBooks[existingIdx] = bookObj;
            } else {
                window.customBooks.push(bookObj);
            }

            if (typeof VocabOfflineDB !== 'undefined') {
                await VocabOfflineDB.saveBook(bookObj);
            }

            if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
                await ElectronManager.saveBookToDisk(bookName + '.json', text, 'local', cleanCat === '未分类' ? '' : cleanCat);
            }

            if (typeof BookManager !== 'undefined') {
                BookManager.bookCache[bookId] = normalized;
                BookManager.mergeCustomBooks();
            }

            successCount++;
        } catch (err) {
            console.error('[importCustomBookFiles error]', err);
            failCount++;
        }
    }

    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        await ElectronManager.scanAndSyncLocalBooks(true);
    }

    if (successCount > 0) {
        showToast(`成功导入 ${successCount} 本词书${targetCategory ? ` 到「${targetCategory}」` : ''}`);
    } else if (failCount > 0) {
        showToast('导入词书失败，请检查文件格式');
    }

    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
}

function renderBookSelectorPage() {
    if (typeof updateAllBooksButtonVisibility === "function") updateAllBooksButtonVisibility();
    if (typeof parkBookDropdownMenus === 'function') parkBookDropdownMenus();
    const container = document.getElementById('book-selector-content-list');
    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (!container) return;

    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const tabsContainer = document.querySelector('#view-book-selector .md3-cat-scroll-container');
    if (tabsContainer) {
        tabsContainer.style.display = isOffline ? 'none' : 'block';
    }

    if (isOffline) {
        renderLocalFolderTree('book-selector-content-list', { isManageMode: false, mode: bookSelectorMode });
        return;
    }

    renderBookSelectorCategoryTabs();

    const allBooks = getAllUniqueBooks();
    const isShiCi = (bookSelectorMode === 'shici');

    let booksToDisplay = [];
    if (bookSelectorActiveCategory === '我的') {
        booksToDisplay = getMyDownloadedAndLocalBooks();
        if (isShiCi) booksToDisplay = booksToDisplay.filter(b => isBookShiCi(b));
    } else if (bookSelectorActiveCategory === '全部') {
        booksToDisplay = allBooks;
    } else if (bookSelectorActiveCategory === '本地') {
        booksToDisplay = allBooks.filter(b => !b.isCloud || (b.isDiskBook && !b.isCloud));
    } else if (bookSelectorActiveCategory === '云端') {
        booksToDisplay = allBooks.filter(b => b.isCloud && (b.syncStatus === 'downloaded' || (b.words && b.words.length > 0) || (BookManager.bookCache && BookManager.bookCache[b.id])));
    } else if (bookSelectorActiveCategory === '未分类' || bookSelectorActiveCategory === '未归类') {
        booksToDisplay = allBooks.filter(b => !b.category || b.category === '未分类' || b.category === '未归类' || b.category === '自定义');
    } else if (bookSelectorActiveCategory === '英语词书') {
        booksToDisplay = allBooks.filter(b => isEnglishBook(b));
    } else if (bookSelectorActiveCategory === '实词词书') {
        booksToDisplay = allBooks.filter(b => isShiCiBook(b));
    } else if (bookSelectorActiveCategory === 'Doris') {
        booksToDisplay = allBooks.filter(b => b.category === 'Doris' || b.isDoris);
    } else {
        booksToDisplay = allBooks.filter(b => b.category === bookSelectorActiveCategory);
    }

    // 强模式隔离：
    // 实词词书不要出现在背单词(single)、英语默写(dictation)、Wordle(riddle)的选择词书页面中
    if (bookSelectorMode === 'single' || bookSelectorMode === 'dictation' || bookSelectorMode === 'riddle') {
        booksToDisplay = booksToDisplay.filter(b => !(typeof isShiCiBook === 'function' && isShiCiBook(b)));
    } else if (bookSelectorMode === 'shici') {
        // 英语词书不要出现在背实词(shici)的选择词书页面中
        booksToDisplay = booksToDisplay.filter(b => (typeof isShiCiBook === 'function' && isShiCiBook(b)));
    }

    const totalSelectedCount = allBooks.filter(b => isBookIdSelectedInCurrentMode(b.id)).length;
    if (summaryChip) {
        if (bookSelectorActiveCategory === '我的') {
            summaryChip.textContent = `共 ${booksToDisplay.length} 本 · 已选 ${totalSelectedCount} 本`;
        } else {
            summaryChip.textContent = `已选 ${totalSelectedCount} 本词书`;
        }
    }
    const clearBtn = document.getElementById('btn-clear-selected-books');
    if (clearBtn) {
        clearBtn.style.display = totalSelectedCount > 0 ? 'inline-flex' : 'none';
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

    // 选择词书页面：将已选择的词书排在最前面（保持其余相对顺序）
    const selectedBooksList = [];
    const unselectedBooksList = [];
    booksToDisplay.forEach(b => {
        if (isBookIdSelectedInCurrentMode(b.id)) {
            selectedBooksList.push(b);
        } else {
            unselectedBooksList.push(b);
        }
    });
    const orderedBooks = selectedBooksList.concat(unselectedBooksList);

    container.innerHTML = `
        <div class="book-card-grid">
            ${orderedBooks.map(b => renderBookCardItem(b, false)).join('')}
        </div>
    `;
}

/**
 * 判断词书是否支持板块分类筛选（如《高中考纲》等包含明确首字母或主题分块的词书）
 * @param {object|string} book - 词书元数据对象或词书ID
 * @returns {boolean}
 */
function doesBookSupportSections(book) {
    if (!book) return false;
    const bookId = typeof book === 'string' ? book : (book.id || '');
    const bookName = typeof book === 'string' ? '' : (book.name || '');

    if (bookId.includes('考纲') || bookName.includes('考纲')) {
        return true;
    }

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        const words = BookManager.bookCache[bookId] || (typeof book === 'object' && Array.isArray(book.words) ? book.words : null);
        if (words && words.length > 0) {
            const seenSec = new Set();
            for (let i = 0; i < words.length; i++) {
                const s = words[i] && words[i].section;
                if (s && !seenSec.has(s)) {
                    seenSec.add(s);
                    if (seenSec.size >= 2) return true;
                }
            }
        }
    }

    if (typeof BookManager !== 'undefined' && typeof BookManager.getBookSections === 'function') {
        const sections = BookManager.getBookSections(bookId);
        if (sections && sections.length > 1) return true;
    }

    return false;
}

/**
 * 判断词书是否支持类型筛选（同时包含单词与词组）
 * @param {object|string} book - 词书元数据对象或词书ID
 * @returns {boolean}
 */
function doesBookSupportTypes(book) {
    if (!book) return false;
    const bookId = typeof book === 'string' ? book : (book.id || '');
    const bookName = typeof book === 'string' ? '' : (book.name || '');

    // 纯词组词书不展示类型筛选
    if (bookId.includes('词组') || bookName.includes('词组')) {
        return false;
    }

    if (bookId.includes('高中考纲') || bookName.includes('高中考纲')) {
        return true;
    }

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        const words = BookManager.bookCache[bookId] || (typeof book === 'object' && Array.isArray(book.words) ? book.words : null);
        if (words && words.length > 0) {
            let hasWord = false;
            let hasPhrase = false;
            for (let i = 0; i < words.length; i++) {
                const t = words[i] && words[i].itemType;
                if (t === 'word') hasWord = true;
                else if (t === 'phrase') hasPhrase = true;
                if (hasWord && hasPhrase) return true;
            }
        }
    }

    return false;
}

function doesBookSupportFilter(book) {
    return doesBookSupportSections(book) || doesBookSupportTypes(book);
}

/**
 * 获取板块筛选按钮摘要文字
 * @param {string} bookId 
 * @returns {string}
 */
function getBookSectionFilterSummaryText(bookId) {
    if (!bookId || typeof BookManager === 'undefined') return '全部分类';
    const filter = BookManager.getBookStudyFilter(bookId);
    if (!filter || filter.isAll || !Array.isArray(filter.sections) || filter.sections.length === 0) {
        return '全部分类';
    }
    if (filter.sections.length <= 2) {
        return filter.sections.map(s => String(s).toUpperCase()).join(', ');
    }
    return `${filter.sections.length} 个分类`;
}

/**
 * 获取内容类型筛选按钮摘要文字
 * @param {string} bookId 
 * @returns {string}
 */
function getBookTypeFilterSummaryText(bookId) {
    if (!bookId || typeof BookManager === 'undefined') return '类型';
    const filter = BookManager.getBookStudyFilter(bookId);
    if (!filter || filter.isAll || !Array.isArray(filter.types) || filter.types.length === 0 || filter.types.length === 2) {
        return '类型';
    }
    if (filter.types[0] === 'phrase') return '仅词组';
    return '仅单词';
}

function getBookFilterSummaryText(bookId) {
    return getBookSectionFilterSummaryText(bookId);
}

/**
 * 渲染单张词书卡片 (供选择词书与管理词书通用)
 * @param {object} b - 词书元数据对象
 * @param {boolean} isManageMode - 是否为管理词书页面模式 (我的分类显示···菜单)
 * @param {string} currentCategory - 当前卡片所在文件夹分类
 */
function renderBookCardItem(b, isManageMode = false, currentCategory = '') {
    const isSelected = isManageMode ? false : isBookIdSelectedInCurrentMode(b.id);
    const gradient = getProceduralBookGradient(b.name, b.category);
    const coverUrl = (b.cover && typeof b.cover === 'string' && b.cover.trim()) ? b.cover.trim() : null;
    const isBlockedForWordle = (bookSelectorMode === 'riddle' && isWordleUnsupportedBook(b));

    // 选择词书与管理词书页面均支持设置学习范围
    const hasSections = doesBookSupportSections(b);
    const hasTypes = doesBookSupportTypes(b);
    const studyFilter = (typeof BookManager !== 'undefined') ? BookManager.getBookStudyFilter(b.id) : null;
    const hasActiveSecFilter = Boolean(studyFilter && !studyFilter.isAll && Array.isArray(studyFilter.sections) && studyFilter.sections.length > 0);
    const hasActiveTypeFilter = Boolean(studyFilter && !studyFilter.isAll && Array.isArray(studyFilter.types) && studyFilter.types.length === 1);
    const secSummary = hasSections ? getBookSectionFilterSummaryText(b.id) : '';
    const typeSummary = hasTypes ? getBookTypeFilterSummaryText(b.id) : '';

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

    // 更多操作按钮 (在管理词书模式下展现)
    const showMoreAction = isManageMode;

    const categoryLabel = cleanBookName(b.category || (b.isCloud ? '云端词书' : '本地词书')) || '词库';
    const progressPct = isDownloaded ? Math.min(100, Math.max(0, prog.progressPercent || 0)) : 0;
    const fillWidth = isDownloaded ? Math.max((progressPct > 0 ? 4 : 0), progressPct) : 0;

    return `
        <div class="book-cover-card ${isSelected ? 'selected' : ''} ${isBlockedForWordle ? 'disabled-for-wordle' : ''}" 
             data-book-id="${escapeHtml(b.id)}" 
             draggable="${isManageMode ? 'true' : 'false'}"
             ${isManageMode ? `ondragstart="handleBookCardDragStart(event, '${escapeHtml(b.id)}', '${escapeHtml(currentCategory || b.category || '')}')" ondragend="handleBookCardDragEnd(event)"` : ''}
             onclick="${isManageMode ? `handleManageBookCardClick(event, '${escapeHtml(b.id)}')` : `handleBookCardClick('${escapeHtml(b.id)}')`}">
            
            <div class="book-cover-wrap">
                ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                <div class="book-cover-art" style="background:${gradient}; ${coverUrl ? 'display:none;' : ''}">
                    <span class="book-cover-art-title">${escapeHtml(b.name)}</span>
                </div>
            </div>

            <div class="book-card-info">
                <!-- 第一行：书名 + 右上角操作或选中状态 -->
                <div class="book-card-header">
                    <div class="book-card-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
                    <div class="book-card-top-slot">
                        ${showMoreAction ? `
                            <button type="button" class="book-card-more-btn" onclick="openBookActionMenu(event, this.closest('[data-book-id]')?.dataset.bookId)" title="更多操作" aria-label="更多操作">
                                <span class="material-symbols-rounded" style="font-size:20px; line-height:1;">more_horiz</span>
                            </button>
                        ` : `
                            <div class="book-card-check-badge ${isSelected ? 'selected' : ''}" aria-hidden="true">
                                ${isSelected ? '<span class="material-symbols-rounded" style="font-size:14px; font-weight:700;">check</span>' : ''}
                            </div>
                        `}
                    </div>
                </div>

                <!-- 第二行：筛选下拉按钮 / 词数与下载状态 -->
                <div class="book-card-mid-row">
                    <div class="book-card-filters-slot">
                        ${(hasSections || hasTypes) ? `
                            ${hasSections ? `
                                <button type="button" class="book-card-filter-btn ${hasActiveSecFilter ? 'has-filter' : ''}"
                                    onclick="toggleBookSectionDropdown(event, '${escapeHtml(b.id)}')"
                                    title="选择该词书的学习分类">
                                    <span class="book-card-filter-text">${escapeHtml(secSummary)}</span>
                                    <span class="material-symbols-rounded book-card-filter-caret">expand_more</span>
                                </button>
                            ` : ''}
                            ${hasTypes ? `
                                <button type="button" class="book-card-filter-btn ${hasActiveTypeFilter ? 'has-filter' : ''}"
                                    onclick="toggleBookTypeDropdown(event, '${escapeHtml(b.id)}')"
                                    title="选择该词书的学习内容类型">
                                    <span class="book-card-filter-text">${escapeHtml(typeSummary)}</span>
                                    <span class="material-symbols-rounded book-card-filter-caret">expand_more</span>
                                </button>
                            ` : ''}
                        ` : ''}
                    </div>

                    <div class="book-card-count-slot">
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
                        ` : '')}
                    </div>
                </div>

                <!-- 第三行：掌握度与进度条 -->
                <div class="book-card-mastery">
                    <div class="book-card-mastery-row">
                        <span class="book-card-mastery-label">${isDownloaded ? '掌握度' : '状态'}</span>
                        <span class="book-card-mastery-text ${isDownloaded ? '' : 'muted'}">
                            ${isDownloaded ? `${progressPct}%` : '未下载'}
                        </span>
                    </div>
                    <div class="book-progress-mini">
                        <div class="book-progress-mini-fill" style="width:${fillWidth}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function handleManageBookCardClick(event, bookId) {
    if (event && event.target && (event.target.closest('.book-card-anchor-wrap') || event.target.closest('.btn-card-action') || event.target.closest('.book-anchored-dropdown'))) {
        return;
    }
    openBookContentPage(bookId);
}


/**
 * 点击选择词书卡片
 */
async function handleBookCardClick(bookId) {
    const bookMeta = BookManager.getBookMeta(bookId);
    if (bookSelectorMode === 'riddle' && isWordleUnsupportedBook(bookMeta)) {
        if (typeof showToast === 'function') {
            showToast('该词书不支持 Wordle 模式');
        }
        return;
    }
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
    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    manageBooksActiveCategory = isOffline ? '全部' : '我的';

    switchView('view-manage-books');
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        ElectronManager.scanAndSyncLocalBooks(true);
    }
}

function exitManageBooksPage() {
    let target = manageBooksPreviousView;
    if (!target || target === 'view-manage-books' || target === 'view-me') {
        if (target === 'view-me') {
            window.__targetMeSubview = 'main';
            switchView('view-me', { direction: 'back' });
            return;
        }
        target = 'view-book-selector';
    }
    if (target === 'view-book-selector') {
        renderBookSelectorPage();
    }
    switchView(target, { direction: 'back' });
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
        else if (cat === '本地') icon = 'folder_special';
        else if (cat === '云端') icon = 'cloud_done';
        else if (cat === '英语词书') icon = 'school';
        else if (cat === '实词词书') icon = 'history_edu';
        else if (cat === '初中') icon = 'menu_book';
        else if (cat === '高中') icon = 'school';
        else if (cat === '大学') icon = 'account_balance';
        else if (cat === '实词') icon = 'history_edu';
        else if (cat === '翻译') icon = 'translate';
        else if (cat === '其他') icon = 'category';
        else if (cat === 'Doris') icon = isDorisOpen ? 'lock_open' : 'lock';
        else icon = 'folder';

        return `
            <button type="button" class="md3-cat-chip ${isActive ? 'active' : ''}" onclick="switchManageBooksCategory('${cat}')">
                <span class="material-symbols-rounded" style="font-size:18px;">${icon}</span>
                <span>${cat}${cat === 'Doris' && !isDorisOpen ? ' (密钥)' : ''}</span>
            </button>
        `;
    }).join('');
}

function renderManageBooksPage() {
    if (typeof updateAllBooksButtonVisibility === "function") updateAllBooksButtonVisibility();
    if (typeof parkBookDropdownMenus === 'function') parkBookDropdownMenus();
    const container = document.getElementById('manage-books-content-list');
    const summaryChip = document.getElementById('manage-books-summary-chip');
    if (!container) return;

    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const tabsContainer = document.querySelector('#view-manage-books .md3-cat-scroll-container');
    if (tabsContainer) {
        tabsContainer.style.display = isOffline ? 'none' : 'block';
    }

    if (isOffline) {
        const actionsBar = document.getElementById('manage-books-actions-bar');
        if (actionsBar) actionsBar.style.display = 'flex';
        const createCatBtn = document.getElementById('btn-manage-create-category');
        if (createCatBtn) createCatBtn.style.display = 'inline-flex';
        const catTools = document.getElementById('manage-category-tools');
        if (catTools) catTools.style.display = 'none';

        renderLocalFolderTree('manage-books-content-list', { isManageMode: true });
        return;
    }

    renderManageBooksCategoryTabs();

    const allBooks = getAllUniqueBooks();
    let booksToDisplay = [];

    if (manageBooksActiveCategory === '我的') {
        booksToDisplay = getMyDownloadedAndLocalBooks();
    } else if (manageBooksActiveCategory === '全部') {
        booksToDisplay = allBooks;
    } else if (manageBooksActiveCategory === '本地') {
        booksToDisplay = allBooks.filter(b => !b.isCloud || (b.isDiskBook && !b.isCloud));
    } else if (manageBooksActiveCategory === '云端') {
        booksToDisplay = allBooks.filter(b => b.isCloud && (b.syncStatus === 'downloaded' || (b.words && b.words.length > 0) || (BookManager.bookCache && BookManager.bookCache[b.id])));
    } else if (manageBooksActiveCategory === '未分类' || manageBooksActiveCategory === '未归类') {
        booksToDisplay = allBooks.filter(b => !b.category || b.category === '未分类' || b.category === '未归类' || b.category === '自定义');
    } else if (manageBooksActiveCategory === '英语词书') {
        booksToDisplay = allBooks.filter(b => isEnglishBook(b));
    } else if (manageBooksActiveCategory === '实词词书') {
        booksToDisplay = allBooks.filter(b => isShiCiBook(b));
    } else if (manageBooksActiveCategory === 'Doris') {
        booksToDisplay = allBooks.filter(b => b.category === 'Doris' || b.isDoris);
    } else {
        booksToDisplay = allBooks.filter(b => b.category === manageBooksActiveCategory);
    }

    const actionsBar = document.getElementById('manage-books-actions-bar');
    if (actionsBar) {
        actionsBar.style.display = (manageBooksActiveCategory === '我的' || manageBooksActiveCategory === '本地') ? 'flex' : 'none';
    }
    const createCatBtn = document.getElementById('btn-manage-create-category');
    if (createCatBtn) {
        createCatBtn.style.display = 'none';
    }
    const catTools = document.getElementById('manage-category-tools');
    const nonEditable = ['全部', '云端', '本地', '我的', '初中', '高中', '大学', '实词', '翻译', '其他', 'Doris', '未分类', '未归类'];
    const isCustomCat = isOffline && !nonEditable.includes(manageBooksActiveCategory);
    if (catTools) {
        catTools.style.display = isCustomCat ? 'flex' : 'none';
        const curNameEl = document.getElementById('manage-current-category-name');
        if (curNameEl) curNameEl.textContent = manageBooksActiveCategory;
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

    container.innerHTML = `
        <div class="book-card-grid">
            ${booksToDisplay.map(b => renderBookCardItem(b, true)).join('')}
        </div>
    `;
}

/* ==========================================================================
   3. 词书操作菜单与下拉锚定挂载 (查看内容、重学词书、删除词书)
   ========================================================================== */

/**
 * 将所有浮动下拉菜单归位至 document.body 并隐藏，清理高亮状态
 */
function parkBookDropdownMenus() {
    const menus = [
        document.getElementById('modal-book-actions-menu'),
        document.getElementById('menu-book-section-dropdown'),
        document.getElementById('menu-book-type-dropdown')
    ];
    menus.forEach(menu => {
        if (menu && menu.parentElement && menu.parentElement !== document.body) {
            document.body.appendChild(menu);
            menu.style.display = 'none';
            menu.classList.remove('align-right', 'flip-up', 'active');
        }
    });
    document.querySelectorAll('.book-cover-card.dropdown-open').forEach(c => c.classList.remove('dropdown-open'));
    document.querySelectorAll('.local-tree-folder.dropdown-open-folder').forEach(f => f.classList.remove('dropdown-open-folder'));
}

/**
 * 将下拉菜单锚定定位至触发按钮，采用 position: fixed 挂载于 body，免受父容器布局限制
 * 智能遵循 Modern Web Guidance：动态视口边缘检测与垂直自动翻转，滚动自适应收起
 */
function resolveConnectedDropdownTrigger(triggerBtn, menuEl) {
    if (triggerBtn && triggerBtn.isConnected) return triggerBtn;
    if (menuEl && menuEl.id === 'menu-book-type-dropdown' && currentDropdownTypeBookId) {
        const match = Array.from(document.querySelectorAll('.me-recent-book-scope-pill[data-scope-type="type"]'))
            .find(el => el.getAttribute('data-book-id') === currentDropdownTypeBookId);
        if (match && match.isConnected) return match;
    }
    if (menuEl && menuEl.id === 'menu-book-section-dropdown' && currentDropdownSectionBookId) {
        const match = Array.from(document.querySelectorAll('.me-recent-book-scope-pill[data-scope-type="section"]'))
            .find(el => el.getAttribute('data-book-id') === currentDropdownSectionBookId);
        if (match && match.isConnected) return match;
    }
    return (triggerBtn && triggerBtn.isConnected) ? triggerBtn : null;
}

function mountAnchoredBookDropdown(menuEl, triggerBtn, defaultAlign = 'left') {
    const resolvedBtn = resolveConnectedDropdownTrigger(triggerBtn, menuEl);
    if (!menuEl || !resolvedBtn) return;

    const btnRect = resolvedBtn.getBoundingClientRect();
    if (btnRect.width === 0 && btnRect.height === 0 && btnRect.top === 0 && btnRect.left === 0) {
        return;
    }

    if (menuEl.parentElement !== document.body) {
        document.body.appendChild(menuEl);
    }

    document.querySelectorAll('.book-cover-card.dropdown-open').forEach(c => {
        if (c !== resolvedBtn.closest('.book-cover-card')) c.classList.remove('dropdown-open');
    });
    document.querySelectorAll('.local-tree-folder.dropdown-open-folder').forEach(f => {
        if (f !== resolvedBtn.closest('.local-tree-folder')) f.classList.remove('dropdown-open-folder');
    });

    const card = resolvedBtn.closest('.book-cover-card');
    if (card) card.classList.add('dropdown-open');
    const folder = resolvedBtn.closest('.local-tree-folder');
    if (folder) folder.classList.add('dropdown-open-folder');

    // 重置样式后进行实时坐标标定，彻底消除 body.style.zoom / transform 带来的定位偏移
    menuEl.style.maxHeight = '';
    menuEl.style.overflowY = '';
    menuEl.style.transform = 'none';
    menuEl.style.top = '0px';
    menuEl.style.left = '0px';
    menuEl.style.right = 'auto';
    menuEl.style.bottom = 'auto';
    menuEl.style.display = 'flex';
    menuEl.style.visibility = 'hidden';
    menuEl.style.position = 'fixed';
    menuEl.style.zIndex = '10050';

    const r0 = menuEl.getBoundingClientRect();
    menuEl.style.top = '100px';
    menuEl.style.left = '100px';
    const r100 = menuEl.getBoundingClientRect();
    const scaleY = (Math.abs(r100.top - r0.top) > 10) ? ((r100.top - r0.top) / 100) : 1;
    const scaleX = (Math.abs(r100.left - r0.left) > 10) ? ((r100.left - r0.left) / 100) : 1;

    const anchorRect = resolvedBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = r0.width || ((menuEl.offsetWidth || (menuEl.id === 'modal-book-actions-menu' ? 168 : 240)) * scaleX);
    const naturalHeight = r0.height || ((menuEl.scrollHeight || menuEl.offsetHeight || 220) * scaleY);

    const spaceBelow = viewportHeight - anchorRect.bottom - 12;
    const spaceAbove = anchorRect.top - 12;
    let desiredTop = 0;

    if (spaceBelow < naturalHeight && spaceAbove > spaceBelow) {
        const fitHeight = Math.max(120, spaceAbove - 8);
        const usedHeight = Math.min(naturalHeight, fitHeight);
        desiredTop = Math.max(10, anchorRect.top - usedHeight - 6);
        menuEl.classList.add('flip-up');
        if (naturalHeight > fitHeight) {
            menuEl.style.maxHeight = `${Math.floor(fitHeight / scaleY)}px`;
            menuEl.style.overflowY = 'auto';
        }
    } else {
        const fitHeight = Math.max(120, spaceBelow - 8);
        desiredTop = Math.min(viewportHeight - Math.min(naturalHeight, fitHeight) - 10, anchorRect.bottom + 6);
        desiredTop = Math.max(10, desiredTop);
        menuEl.classList.remove('flip-up');
        if (naturalHeight > fitHeight) {
            menuEl.style.maxHeight = `${Math.floor(fitHeight / scaleY)}px`;
            menuEl.style.overflowY = 'auto';
        }
    }

    let desiredLeft = 0;
    if (defaultAlign === 'right') {
        desiredLeft = anchorRect.right - menuWidth;
        if (desiredLeft + menuWidth > viewportWidth - 10) desiredLeft = viewportWidth - menuWidth - 10;
        if (desiredLeft < 10) desiredLeft = 10;
        menuEl.classList.add('align-right');
    } else {
        desiredLeft = anchorRect.left;
        if (desiredLeft + menuWidth > viewportWidth - 10) {
            desiredLeft = Math.max(10, anchorRect.right - menuWidth);
        }
        if (desiredLeft < 10) desiredLeft = 10;
        menuEl.classList.remove('align-right');
    }

    menuEl.style.top = `${Math.round((desiredTop - r0.top) / scaleY * 10) / 10}px`;
    menuEl.style.left = `${Math.round((desiredLeft - r0.left) / scaleX * 10) / 10}px`;
    menuEl.style.right = 'auto';
    menuEl.style.bottom = 'auto';
    menuEl.style.visibility = 'visible';
    menuEl.classList.add('active');
}

function getResolvedBookActionId(explicitBookId = null) {
    if (typeof explicitBookId === 'string' && explicitBookId) return explicitBookId;
    if (typeof activeActionBookId === 'string' && activeActionBookId) return activeActionBookId;
    const menu = document.getElementById('modal-book-actions-menu');
    return (menu && menu.dataset && menu.dataset.bookId) ? menu.dataset.bookId : null;
}

function openBookActionMenu(event, bookId) {
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    const menu = document.getElementById('modal-book-actions-menu');
    if (!menu) return;

    if (!bookId && event && event.target && event.target.closest) {
        const host = event.target.closest('[data-book-id]');
        if (host && host.dataset) bookId = host.dataset.bookId;
    }
    if (!bookId) return;

    // 若重复点击同一卡片的操作按钮且已处于展开状态，则收起
    if (activeActionBookId === bookId && menu.style.display !== 'none' && menu.classList.contains('active')) {
        closeBookActionMenu();
        return;
    }

    closeBookSectionDropdown();
    closeBookTypeDropdown();

    activeActionBookId = bookId;
    menu.dataset.bookId = bookId;
    const bookMeta = BookManager.getBookMeta(bookId);

    const btnMove = document.getElementById('btn-action-move-book');
    if (btnMove) {
        const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode()) || window.currentEnvMode === 'offline';
        const isLocalBook = bookMeta && (!bookMeta.isCloud || String(bookId).startsWith('custom_') || bookMeta.category === '本地' || bookMeta.isDiskBook);
        btnMove.style.display = (isOffline || isLocalBook) ? 'flex' : 'none';
    }

    menu.classList.add('active');
    const btn = event ? (event.currentTarget || event.target.closest('.book-card-more-btn') || event.target) : null;
    mountAnchoredBookDropdown(menu, btn, 'right');
}

function closeBookActionMenu(clearDataset = false) {
    const menu = document.getElementById('modal-book-actions-menu');
    if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('active', 'align-right', 'flip-up');
        if (clearDataset) delete menu.dataset.bookId;
    }
    activeActionBookId = null;
    document.querySelectorAll('.book-cover-card.dropdown-open').forEach(c => c.classList.remove('dropdown-open'));
    document.querySelectorAll('.local-tree-folder.dropdown-open-folder').forEach(f => f.classList.remove('dropdown-open-folder'));
}

/**
 * 查看词书全部内容（在新页面 view-book-content 中打开，自适应结构适配）
 */
async function actionViewBookContent(explicitBookId = null) {
    const bookId = getResolvedBookActionId(explicitBookId);
    closeBookActionMenu(true);
    if (!bookId) return;
    openBookContentPage(bookId);
}

/* ==========================================================================
   4. 独立词书内容浏览页面 (view-book-content 控制器与 5 种结构适配器)
   ========================================================================== */

const bookContentState = {
    bookId: null,
    bookMeta: null,
    archetype: null,
    rawWords: [],
    filteredWords: [],
    searchQuery: '',
    activeSection: 'all',
    activeType: 'all',
    activePos: 'all',
    activeMasteryFilter: 'all', // 'all' | 'unmastered' | 'mastered'
    activeStarOnly: false,
    pageSize: 60,
    renderedCount: 60,
    allExpanded: false,
    expandedItemKeys: new Set(),
    previousView: 'view-manage-books'
};

/**
 * 识别词书结构原型 (5大结构形态)
 * 1. shici: 文言实词 (初中150、高中300实词)
 * 2. rich_dict: 详尽词典 (高中考纲等，包含深度例句、同反义、考点、词性分组、易混辨析)
 * 3. phonetic_vocab: 双音标标准词库 (四六级、考研红宝书、高考阅读高频，英美音标+考频)
 * 4. phrase_mistake: 短语搭配 / 翻译句式 / 干扰项小测 (518词组、考纲词组、高考翻译、Doris测试)
 * 5. concise_list: 精简速记词表 / 本地自定义词书 (双列卡片，快速扫描记忆与增删改)
 */
function detectBookContentArchetype(bookMeta, words) {
    const bookId = String((bookMeta && bookMeta.id) || '').toLowerCase();
    const bookName = String((bookMeta && (bookMeta.name || bookMeta.rawName)) || '').toLowerCase();

    // 1. 文言实词
    const isShiCi = (typeof isShiCiBook === 'function' && isShiCiBook(bookMeta)) ||
        bookId.includes('shici') || bookName.includes('实词') ||
        (words && words.length > 0 && words.some(w => w && w.pinyin && Array.isArray(w.senses) && w.senses.some(s => s && s.examples && s.examples.some(e => e.source))));
    if (isShiCi) {
        return {
            key: 'shici',
            label: '文言实词',
            icon: 'menu_book',
            hasExpandableDetails: false,
            hasStarKey: true,
            hasSections: false,
            hasTypes: false
        };
    }

    // 2. 短语搭配 / 翻译句式 / 易混词组
    const isPhraseBook = bookId.includes('词组') || bookName.includes('词组') ||
        bookId.includes('phrase') || bookId.includes('翻译') || bookName.includes('翻译') ||
        bookName.includes('搭配');
    if (isPhraseBook) {
        return {
            key: 'phrase_mistake',
            label: bookName.includes('翻译') ? '翻译句式' : '短语搭配',
            icon: 'conversion_path',
            hasExpandableDetails: false,
            hasStarKey: false,
            hasSections: false,
            hasTypes: false
        };
    }

    // 3. 详尽词典 (高中考纲等，深度例句、衍生词、辨析、易混项)
    const hasRichDetails = words && words.some(w => {
        if (!w) return false;
        const hasEx = (Array.isArray(w.examples) && w.examples.length > 0) ||
            (Array.isArray(w.senses) && w.senses.some(s => s && Array.isArray(s.examples) && s.examples.length > 0));
        const hasDeriv = Array.isArray(w.derivatives) && w.derivatives.length > 0;
        const hasDisc = Array.isArray(w.discriminations) && w.discriminations.length > 0;
        return hasEx || hasDeriv || hasDisc;
    });

    const isKaogang = bookId.includes('考纲') || bookName.includes('考纲') || bookId.includes('rich_dict');
    if (isKaogang || hasRichDetails) {
        return {
            key: 'rich_dict',
            label: '详尽词典',
            icon: 'auto_stories',
            hasExpandableDetails: true,
            hasStarKey: false,
            hasSections: true,
            hasTypes: true
        };
    }

    // 4. 双音标标准词库 (四六级、考研红宝书等英美双音标与词性条目)
    const hasPhonetics = words && words.some(w => w && (w.usphone || w.ukphone || (w.phone && Array.isArray(w.meanings))));
    const isMajorExam = bookId.includes('cet') || bookId.includes('kaoyan') || bookName.includes('四级') || bookName.includes('六级') || bookName.includes('考研');
    if (hasPhonetics || isMajorExam) {
        return {
            key: 'phonetic_vocab',
            label: '标准双音标词库',
            icon: 'record_voice_over',
            hasExpandableDetails: false,
            hasStarKey: false,
            hasSections: true,
            hasTypes: false
        };
    }

    // 5. 精简速记词表 / 自定义词书
    return {
        key: 'concise_list',
        label: (bookId.startsWith('custom_') || (bookMeta && bookMeta.isCustom)) ? '自定义词书' : '速记词表',
        icon: 'format_list_bulleted',
        hasExpandableDetails: false,
        hasStarKey: false,
        hasSections: false,
        hasTypes: false
    };
}

/**
 * 在新页面打开词书内容浏览
 */
async function openBookContentPage(bookId, preloadedWords = null, prevView = null) {
    if (!bookId) return;
    parkBookDropdownMenus();

    // 记录跳转来源视图
    if (prevView) {
        bookContentState.previousView = prevView;
    } else if (typeof currentView !== 'undefined' && currentView && currentView !== 'view-book-content') {
        bookContentState.previousView = currentView;
    }

    bookContentState.bookId = bookId;
    // 同步设置 settingsViewingBookId，确保添加词汇/编辑释义/删除词汇接口无缝联动
    window.settingsViewingBookId = bookId;

    const bookMeta = (typeof BookManager !== 'undefined' && BookManager.getBookMeta) ? BookManager.getBookMeta(bookId) : null;
    bookContentState.bookMeta = bookMeta;

    let words = preloadedWords;
    if (!words || words.length === 0) {
        if (typeof isShiCiBook === 'function' && isShiCiBook(bookMeta) && typeof ShiCiManager !== 'undefined') {
            words = await ShiCiManager.loadBooks([bookId]);
        } else if (typeof BookManager !== 'undefined') {
            words = await BookManager.loadBookData(bookId);
        }
    }
    words = words || [];
    bookContentState.rawWords = words;

    const archetype = detectBookContentArchetype(bookMeta, words);
    bookContentState.archetype = archetype;

    // 重置筛选项与展开状态
    bookContentState.searchQuery = '';
    bookContentState.activeSection = 'all';
    bookContentState.activeType = 'all';
    bookContentState.activePos = 'all';
    bookContentState.activeMasteryFilter = 'all';
    bookContentState.activeStarOnly = false;
    bookContentState.renderedCount = 60;
    bookContentState.allExpanded = false;
    bookContentState.expandedItemKeys.clear();

    // 初始化内容工具栏：分类筛选下拉菜单与类型按钮组
    const isShiCiContent = (archetype && archetype.key === 'shici') || (typeof isShiCiBook === 'function' && isShiCiBook(bookMeta));
    const secSet = new Set();
    words.forEach(w => {
        if (w && w.section) {
            const cleanSec = String(w.section).trim().replace(/^板块\s*/i, '');
            if (cleanSec) secSet.add(cleanSec);
        }
    });
    let useLetterFallback = false;
    if (secSet.size <= 1 && !isShiCiContent) {
        const letterSet = new Set();
        words.forEach(w => {
            if (!w || !w.word) return;
            const ch = String(w.word).trim().charAt(0).toLowerCase();
            if (/^[a-z]$/.test(ch)) letterSet.add(ch);
        });
        if (letterSet.size > 1) {
            secSet.clear();
            letterSet.forEach(l => secSet.add(l));
            useLetterFallback = true;
        }
    }
    bookContentState.useLetterSectionFallback = useLetterFallback;
    const secWrap = document.getElementById('bc-toolbar-section-wrap');
    const secLabel = document.getElementById('bc-toolbar-section-label');
    const secMenu = document.getElementById('bc-toolbar-section-menu');
    if (secWrap && secMenu) {
        if (secSet.size > 1) {
            const sortedSecs = Array.from(secSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            if (secLabel) secLabel.textContent = '全部分类';
            secMenu.innerHTML = `
                <div class="md3-custom-select-option selected" data-value="all" onclick="selectMd3Option('bc-toolbar-section', 'all', '全部分类', 'setBookContentSectionFilter')">
                    <span>全部分类</span>
                    <span class="material-symbols-rounded" style="font-size:16px;">check</span>
                </div>
                ${sortedSecs.map(s => `
                    <div class="md3-custom-select-option" data-value="${escapeHtml(s)}" onclick="selectMd3Option('bc-toolbar-section', '${escapeHtml(s)}', '${escapeHtml(s.toUpperCase())}', 'setBookContentSectionFilter')">
                        <span>${escapeHtml(s.toUpperCase())}</span>
                    </div>
                `).join('')}
            `;
            secWrap.style.display = 'inline-flex';
        } else {
            secWrap.style.display = 'none';
        }
    }
    const searchWrapEl = document.getElementById('bc-expandable-search-wrap');
    if (searchWrapEl) searchWrapEl.classList.remove('expanded');
    document.querySelectorAll('#bc-toolbar-type-tabs .settings-cat-tab').forEach(ch => {
        ch.classList.toggle('active', ch.getAttribute('data-type') === 'all');
    });
    document.querySelectorAll('#bc-toolbar-type-chips .md3-chip').forEach(ch => {
        ch.classList.toggle('selected', ch.getAttribute('data-type') === 'all');
    });
    bookContentState.collapsedDisplayMode = 'en';
    updateBookContentDisplayModeUI();
    const expandIcon = document.getElementById('icon-bc-expand-all');
    const expandText = document.getElementById('text-bc-expand-all');
    if (expandIcon) expandIcon.textContent = 'unfold_more';
    if (expandText) expandText.textContent = '展开全部';

    // 更新页面标题与顶栏信息
    const titleEl = document.getElementById('book-content-page-title');
    const subtitleEl = document.getElementById('book-content-page-subtitle');
    const badgeEl = document.getElementById('book-content-arch-badge');
    const searchInput = document.getElementById('book-content-search-input');
    const searchClear = document.getElementById('book-content-search-clear');
    const btnExpandAll = document.getElementById('btn-book-content-expand-all');
    const btnAddWord = document.getElementById('btn-book-content-add-word');

    const displayName = (bookMeta ? (bookMeta.rawName || bookMeta.name) : bookId) || '词书内容';
    // 图10要求：请删除《》
    if (titleEl) titleEl.textContent = displayName;
    if (subtitleEl) subtitleEl.textContent = `共 ${words.length} 词条`;
    if (badgeEl) badgeEl.style.display = 'none';
    if (btnExpandAll) btnExpandAll.style.display = 'none';

    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';

    const isCustomLocal = String(bookId).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === bookId));
    if (btnAddWord) {
        btnAddWord.style.display = isCustomLocal ? 'inline-flex' : 'none';
    }

    applyBookContentFilters();

    // 切换至新页面
    if (typeof switchView === 'function') {
        switchView('view-book-content');
    }
}

/**
 * 退出词书内容浏览页面，返回先前的管理/选择页面
 */
function exitBookContentPage() {
    parkBookDropdownMenus();
    const target = bookContentState.previousView || 'view-manage-books';
    if (target === 'view-manage-books' && typeof renderManageBooksPage === 'function') {
        renderManageBooksPage();
    } else if (target === 'view-book-selector' && typeof renderBookSelectorPage === 'function') {
        renderBookSelectorPage();
    } else if (target === 'view-me') {
        window.__targetMeSubview = 'main';
    }
    if (typeof switchView === 'function') {
        switchView(target, { direction: 'back' });
    }
}

/**
 * 词书内容页筛选栏兼容器（兼容历史调用）
 */
function renderBookContentFilterBar() {
    // 依图10要求：仅保留纯净搜索栏，移除旧分块/类型/状态筛选条
}

function setBookContentFilter(kind, val) {
    if (kind === 'section') bookContentState.activeSection = val;
    else if (kind === 'type') bookContentState.activeType = val;
    else if (kind === 'mastery') bookContentState.activeMasteryFilter = val;
    else if (kind === 'star') bookContentState.activeStarOnly = Boolean(val);
    applyBookContentFilters();
}

/**
 * 实时搜索词书内容与可伸展搜索框控制
 */
let _bcSearchBlurTimer = null;

function toggleBookContentSearchExpand(forceExpand = true, e = null) {
    if (e) e.stopPropagation();
    const wrap = document.getElementById('bc-expandable-search-wrap');
    const input = document.getElementById('book-content-search-input');
    if (!wrap) return;
    if (_bcSearchBlurTimer) {
        clearTimeout(_bcSearchBlurTimer);
        _bcSearchBlurTimer = null;
    }
    if (forceExpand) {
        wrap.classList.add('expanded');
        if (input) {
            if (typeof focusSearchInputReliable === 'function') {
                focusSearchInputReliable(input, () => wrap.classList.contains('expanded'), wrap);
            } else {
                void wrap.offsetWidth;
                try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
                requestAnimationFrame(() => {
                    if (wrap.classList.contains('expanded') && document.activeElement !== input) {
                        try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
                    }
                });
            }
        }
    } else {
        if (input) input.value = '';
        handleBookContentSearch('');
        wrap.classList.remove('expanded');
    }
}
window.toggleBookContentSearchExpand = toggleBookContentSearchExpand;

function handleBookContentSearchBlur() {
    const wrap = document.getElementById('bc-expandable-search-wrap');
    const input = document.getElementById('book-content-search-input');
    if (!wrap || !input) return;
    if (_bcSearchBlurTimer) clearTimeout(_bcSearchBlurTimer);
    _bcSearchBlurTimer = setTimeout(() => {
        _bcSearchBlurTimer = null;
        if (!input.value.trim() && document.activeElement !== input) {
            wrap.classList.remove('expanded');
        }
    }, 180);
}
window.handleBookContentSearchBlur = handleBookContentSearchBlur;

function handleBookContentSearch(val) {
    bookContentState.searchQuery = (val || '').trim();
    const clearBtn = document.getElementById('book-content-search-clear');
    if (clearBtn) {
        clearBtn.style.display = 'inline-flex';
    }
    applyBookContentFilters();
}

function clearBookContentSearch(e = null) {
    if (e) e.stopPropagation();
    const wrap = document.getElementById('bc-expandable-search-wrap');
    const input = document.getElementById('book-content-search-input');
    if (input && input.value.trim()) {
        input.value = '';
        handleBookContentSearch('');
        input.focus();
    } else {
        if (input) input.value = '';
        handleBookContentSearch('');
        if (wrap) wrap.classList.remove('expanded');
    }
}

/**
 * 执行筛选、计算掌握度并刷新统一列表 (图10: 只保留搜索框)
 */
function applyBookContentFilters() {
    const { rawWords, searchQuery, archetype } = bookContentState;
    const subtitleEl = document.getElementById('book-content-page-subtitle');
    const isShiCi = (archetype && archetype.key === 'shici');
    const q = searchQuery.toLowerCase();

    const filtered = rawWords.filter(w => {
        if (!w || !w.word) return false;

        // 类型筛选：单词 / 词组
        if (bookContentState.activeType === 'word') {
            const isPh = w.itemType === 'phrase' || (!isShiCi && (w.word || '').includes(' '));
            if (isPh) return false;
        } else if (bookContentState.activeType === 'phrase') {
            const isPh = w.itemType === 'phrase' || (!isShiCi && (w.word || '').includes(' '));
            if (!isPh) return false;
        }

        // 分类筛选（兼容显式 section 与首字母回退分类）
        if (bookContentState.activeSection && bookContentState.activeSection !== 'all') {
            const explicitSec = String(w.section || '').trim().replace(/^板块\s*/i, '').toLowerCase();
            const fallbackLetter = (w.word || '').trim().charAt(0).toLowerCase();
            const wSec = bookContentState.useLetterSectionFallback ? fallbackLetter : (explicitSec || fallbackLetter);
            if (wSec !== bookContentState.activeSection.toLowerCase()) return false;
        }

        if (!q) return true;

        const wordText = String(w.word || '').toLowerCase();
        const phoneText = String(w.phone || w.pinyin || w.usphone || w.ukphone || '').toLowerCase();

        let meaningString = '';
        if (Array.isArray(w.senses)) {
            meaningString = w.senses.map(s => {
                const transStr = Array.isArray(s.trans) ? s.trans.join(' ') : String(s.trans || s.meaning || '');
                const exStr = (s.examples || []).map(e => (e.en || e.sentence || '') + ' ' + (e.zh || e.source || '')).join(' ');
                return transStr + ' ' + exStr;
            }).join(' ');
        } else if (Array.isArray(w.meanings)) {
            meaningString = w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + (m.meaning || '')).join(' ');
        } else {
            meaningString = String(w.meaning || w.trans || '');
        }

        const derivString = Array.isArray(w.derivatives) ? w.derivatives.map(d => (d.name || '') + ' ' + (Array.isArray(d.trans) ? d.trans.join(' ') : (d.trans || ''))).join(' ') : '';
        const noteString = String(w.note || '');

        const fullHaystack = `${wordText} ${phoneText} ${meaningString} ${derivString} ${noteString}`.toLowerCase();
        return fullHaystack.includes(q);
    });

    bookContentState.filteredWords = filtered;
    bookContentState.renderedCount = 60;
    if (subtitleEl) subtitleEl.textContent = `共 ${filtered.length} 词条`;
    renderBookContentItems();
}

/**
 * 音标格式化助手：图10要求“只要单斜杠”
 * 去除首尾多余斜杠并包裹单斜杠，如 //əˈbændən// -> /əˈbændən/
 */
function formatPhonetic(raw) {
    if (!raw) return '';
    const clean = String(raw).replace(/^\/+|\/+$/g, '').trim();
    return clean ? `/${clean}/` : '';
}

/**
 * 考点与词义辨析排版助手：图9修复 [object Object]
 */
function formatDiscriminationsHtml(discriminations) {
    if (!Array.isArray(discriminations) || discriminations.length === 0) return '';
    return discriminations.map(d => {
        if (!d) return '';
        if (typeof d === 'string') {
            return `<div class="bc-discrim-block"><div class="bc-discrim-intro">${escapeHtml(d)}</div></div>`;
        }

        let wordsHtml = '';
        if (Array.isArray(d.words) && d.words.length > 0) {
            wordsHtml = `
                <div class="bc-discrim-words">
                    ${d.words.map((w, wi) => `
                        <span class="bc-discrim-word-chip">${escapeHtml(w)}</span>
                        ${wi < d.words.length - 1 ? '<span class="bc-discrim-vs">vs</span>' : ''}
                    `).join('')}
                </div>
            `;
        }

        const introHtml = d.intro ? `<div class="bc-discrim-intro">${escapeHtml(d.intro)}</div>` : '';

        let itemsHtml = '';
        if (Array.isArray(d.items) && d.items.length > 0) {
            itemsHtml = d.items.map(it => {
                if (!it) return '';
                const itWord = it.word ? `<span class="bc-discrim-item-word">${escapeHtml(it.word)}</span>` : '';
                const itExp = it.explanation ? `<div class="bc-discrim-item-exp">${itWord}${escapeHtml(it.explanation)}</div>` : '';
                let itExamplesHtml = '';
                if (Array.isArray(it.examples) && it.examples.length > 0) {
                    itExamplesHtml = `
                        <div class="bc-discrim-item-examples">
                            ${it.examples.map(ex => `
                                <div class="bc-discrim-ex-row">
                                    <div class="bc-discrim-ex-en">${escapeHtml(ex.en || ex.sentence || '')}</div>
                                    <div class="bc-discrim-ex-zh">${escapeHtml(ex.zh || ex.source || '')}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                return `
                    <div class="bc-discrim-item">
                        ${itExp}
                        ${itExamplesHtml}
                    </div>
                `;
            }).join('');
        }

        return `
            <div class="bc-discrim-block">
                ${wordsHtml}
                ${introHtml}
                ${itemsHtml}
            </div>
        `;
    }).join('');
}

/**
 * 衍生词汇排版助手：图7优化配色
 */
function formatDerivativesHtml(derivatives) {
    if (!Array.isArray(derivatives) || derivatives.length === 0) return '';
    return `
        <div class="bc-drawer-section">
            <div class="bc-drawer-title"><span class="material-symbols-rounded">account_tree</span>衍生词汇</div>
            <div class="bc-chips-flow">
                ${derivatives.map(d => {
                    const name = d.name || d.word || '';
                    const trans = Array.isArray(d.trans) ? d.trans.join('； ') : (d.trans || d.meaning || '');
                    return `
                        <div class="bc-tag-chip derivative">
                            <strong class="bc-deriv-name">${escapeHtml(name)}</strong>
                            <span class="bc-deriv-trans">${escapeHtml(trans)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * 反义词排版助手：修复对象渲染 [object Object] 问题
 */
function formatAntonymsHtml(antonyms) {
    if (!Array.isArray(antonyms) || antonyms.length === 0) return '';
    return `
        <div class="bc-drawer-section">
            <div class="bc-drawer-title"><span class="material-symbols-rounded">swap_horiz</span>反义词</div>
            <div class="bc-chips-flow">
                ${antonyms.map(a => {
                    if (!a) return '';
                    if (typeof a === 'string') {
                        return `<div class="bc-tag-chip antonym"><strong class="bc-antonym-name">${escapeHtml(a)}</strong></div>`;
                    }
                    const name = a.name || a.word || a.hwd || a.antonym || '';
                    const trans = Array.isArray(a.trans) ? a.trans.join('； ') : (a.trans || a.meaning || a.tran || '');
                    return `
                        <div class="bc-tag-chip antonym">
                            <strong class="bc-antonym-name">${escapeHtml(name)}</strong>
                            ${trans ? `<span class="bc-antonym-trans">${escapeHtml(trans)}</span>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * 典型例句关键词高亮助手：自动将目标词及其常见词形变化加粗
 */
function highlightTargetWordInSentence(sentence, targetWord) {
    if (!sentence) return '';
    const safeSentence = escapeHtml(sentence);
    const cleanTarget = String(targetWord || '').trim();
    if (!cleanTarget) return safeSentence;

    // 处理形如 "a (an)" 的词条，拆解括号分别高亮
    const rawTokens = cleanTarget.replace(/[()（）]/g, ' ').split(/\s+/).map(t => t.trim()).filter(Boolean);
    const candidates = [];
    if (cleanTarget.includes('(') || cleanTarget.includes('（')) {
        candidates.push(...rawTokens);
    } else {
        candidates.push(cleanTarget);
    }

    let result = safeSentence;
    candidates.forEach(cand => {
        const escapedTarget = cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let patternStr = `\\b${escapedTarget}\\b`;
        if (/^[a-zA-Z]+$/.test(cand) && cand.length >= 3) {
            const stem = cand.replace(/(?:e|y)$/i, '');
            const escapedStem = stem.length >= 3 ? stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : escapedTarget;
            patternStr = `\\b(?:${escapedTarget}|${escapedStem}(?:s|es|ed|d|ing|ies|ied|er|est|ly|tion|tions|ity|ities)?)\\b`;
        }
        try {
            const regex = new RegExp(patternStr, 'gi');
            result = result.replace(regex, '<strong class="bc-ex-keyword">$&</strong>');
        } catch (e) {}
    });
    return result;
}

/**
 * 典型例句排版助手：将目标关键词加粗
 */
function formatExamplesHtml(examplesList, targetWord = '') {
    if (!Array.isArray(examplesList) || examplesList.length === 0) return '';
    return `
        <div class="bc-drawer-section">
            <div class="bc-drawer-title"><span class="material-symbols-rounded">notes</span>典型例句</div>
            <div class="bc-examples-list">
                ${examplesList.slice(0, 4).map(ex => `
                    <div class="bc-example-item" style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <div class="bc-example-main">
                            <div class="bc-ex-en">${highlightTargetWordInSentence(ex.en, targetWord)}</div>
                            <div class="bc-ex-zh">${escapeHtml(ex.zh)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * 从已加载词书、默认词库或自定义词书中查找完整词条数据（用于复习计划/小结详情展开）
 */
function findWordEntryForDrawer(wordText, isShiCi = false) {
    const raw = String(wordText || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();

    if (isShiCi && typeof ShiCiManager !== 'undefined') {
        const searchLists = [];
        if (Array.isArray(ShiCiManager.data)) searchLists.push(ShiCiManager.data);
        if (Array.isArray(ShiCiManager.words)) searchLists.push(ShiCiManager.words);
        if (ShiCiManager.bookCache && typeof ShiCiManager.bookCache === 'object') {
            Object.values(ShiCiManager.bookCache).forEach(arr => {
                if (Array.isArray(arr)) searchLists.push(arr);
            });
        }
        for (let i = 0; i < searchLists.length; i++) {
            const hit = searchLists[i].find(item => item && String(item.word || item.name || '').trim() === raw);
            if (hit) return hit;
        }
    }

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        const values = Object.values(BookManager.bookCache);
        for (let i = 0; i < values.length; i++) {
            const list = values[i];
            if (!Array.isArray(list)) continue;
            const hit = list.find(item => item && String(item.word || item.name || '').trim().toLowerCase() === lower);
            if (hit) return hit;
        }
    }

    if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS)) {
        const hit = DEFAULT_WORDS.find(item => item && String(item.word || '').trim().toLowerCase() === lower);
        if (hit) return hit;
    }

    if (Array.isArray(window.customBooks)) {
        for (let i = 0; i < window.customBooks.length; i++) {
            const cb = window.customBooks[i];
            if (!cb || !Array.isArray(cb.words)) continue;
            const hit = cb.words.find(item => item && String(item.word || item.name || '').trim().toLowerCase() === lower);
            if (hit) return hit;
        }
    }

    return null;
}

/**
 * 构建统一词条抽屉所需的音标、释义与拓展区块 HTML
 */
function isMistakeMeaningMatch(pos, meaningText, targetMeaning) {
    if (!targetMeaning || typeof targetMeaning !== 'string') return false;
    const cleanTarget = targetMeaning.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!cleanTarget) return false;

    const cleanPos = String(pos || '').replace(/\./g, '').trim().toLowerCase();
    const cleanText = String(meaningText || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const combined = ((cleanPos ? cleanPos + ' ' : '') + cleanText).trim();

    if (cleanTarget === cleanText || cleanTarget === combined) return true;
    if (cleanTarget.includes(cleanText) || cleanText.includes(cleanTarget)) return true;

    const targetTokens = cleanTarget.split(/[;,，；、\s]+/).map(t => t.trim()).filter(t => t.length >= 2);
    const rowTokens = cleanText.split(/[;,，；、\s]+/).map(t => t.trim()).filter(t => t.length >= 2);
    if (targetTokens.length > 0 && rowTokens.length > 0) {
        const hasOverlap = targetTokens.some(t => rowTokens.some(r => r === t || r.includes(t) || t.includes(r)));
        if (hasOverlap) return true;
    }

    return false;
}

function buildUnifiedWordDetailData(w, isShiCi = false, targetMistakeMeaning = null) {
    const word = w.word || w.name || '';
    let phoneDisplay = '';
    if (isShiCi) {
        phoneDisplay = w.pinyin || '';
    } else {
        const phone = w.phone || w.ukphone || w.usphone || '';
        phoneDisplay = typeof formatPhonetic === 'function' ? formatPhonetic(phone) : phone;
    }

    const resolvedSenses = (Array.isArray(w.senses) && w.senses.length > 0)
        ? w.senses
        : (isShiCi && Array.isArray(w.allSenses) && w.allSenses.length > 0)
            ? w.allSenses
            : (isShiCi && w.sense ? [w.sense] : null);

    const examplesList = [];
    if (Array.isArray(w.examples)) {
        w.examples.forEach(ex => {
            if (ex && (ex.en || ex.zh || ex.sentence)) {
                examplesList.push({ pos: '', trans: '', en: ex.en || ex.sentence || '', zh: ex.zh || ex.source || '' });
            }
        });
    }
    if (Array.isArray(resolvedSenses)) {
        resolvedSenses.forEach(s => {
            if (!s || !Array.isArray(s.examples)) return;
            const pos = s.pos || s.part_of_speech || '';
            const transText = Array.isArray(s.trans) ? s.trans.join('；') : (s.trans || s.meaning || '');
            s.examples.forEach(ex => {
                if (ex && (ex.en || ex.zh || ex.sentence)) {
                    examplesList.push({ pos, trans: transText, en: ex.en || ex.sentence || '', zh: ex.zh || ex.source || '' });
                }
            });
        });
    }
    if (isShiCi && examplesList.length === 0 && (w.sentence || (w.example && w.example.sentence))) {
        const exSent = w.sentence || w.example.sentence;
        const exSrc = w.source || (w.example && w.example.source) || '';
        const exPos = (w.sense && (w.sense.part_of_speech || w.sense.pos)) || w.pos || '';
        const exMeaning = (w.sense && (w.sense.meaning || w.sense.trans)) || w.meaning || '';
        examplesList.push({ pos: exPos, trans: String(exMeaning || '').replace(/★/g, '').trim(), en: exSent, zh: exSrc });
    }

    let meaningsHtml = '';
    let flatMeaning = '';
    let topZhHeaderHtml = '';
    if (isShiCi && Array.isArray(resolvedSenses) && resolvedSenses.length > 0) {
        meaningsHtml = resolvedSenses.map((s) => {
            const cleanMeaning = (s.meaning || s.trans || '').replace(/★/g, '').trim();
            const isStar = (s.meaning || s.trans || '').includes('★');
            const pos = s.part_of_speech || s.pos || '实词';
            const isMistakeRow = Boolean(targetMistakeMeaning && (resolvedSenses.length === 1 || isMistakeMeaningMatch(pos, cleanMeaning, targetMistakeMeaning)));
            return `
                <div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}">
                    <span class="bc-pos-inline">${escapeHtml(pos)}</span>
                    <span class="bc-meaning-text">${escapeHtml(cleanMeaning)}</span>
                    ${isStar ? '<span class="shici-star-badge" style="margin-left:6px;">★ 考点</span>' : ''}
                </div>
            `;
        }).join('');
        flatMeaning = resolvedSenses.map(s => {
            const pos = s.part_of_speech || s.pos || '';
            const m = (s.meaning || s.trans || '').replace(/★/g, '').trim();
            return (pos ? pos + ' ' : '') + m;
        }).join('   ');
        topZhHeaderHtml = resolvedSenses.map(s => {
            const pos = s.part_of_speech || s.pos || '';
            const m = (s.meaning || s.trans || '').replace(/★/g, '').trim();
            return `<span class="bc-top-sense-seg">${pos ? `<span class="bc-pos-inline">${escapeHtml(pos)}</span> ` : ''}${escapeHtml(m)}</span>`;
        }).join(' ');
    } else if (Array.isArray(resolvedSenses) && resolvedSenses.length > 0) {
        const posMap = [];
        resolvedSenses.forEach(s => {
            if (!s) return;
            const pos = s.pos || s.part_of_speech || '';
            const rawTrans = Array.isArray(s.trans) ? s.trans.join('； ') : (s.trans || s.meaning || '');
            const clean = String(rawTrans || '').replace(/★/g, '').trim();
            if (!clean) return;
            const last = posMap[posMap.length - 1];
            if (last && last.pos === pos) {
                last.texts.push(clean);
            } else {
                posMap.push({ pos, texts: [clean] });
            }
        });
        meaningsHtml = posMap.map(g => {
            const rowMeaningText = g.texts.join('； ');
            const isMistakeRow = Boolean(targetMistakeMeaning && (posMap.length === 1 || isMistakeMeaningMatch(g.pos, rowMeaningText, targetMistakeMeaning)));
            return `
            <div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}">
                ${g.pos ? `<span class="bc-pos-inline">${escapeHtml(g.pos)}</span>` : ''}
                <span class="bc-meaning-text">${escapeHtml(rowMeaningText)}</span>
            </div>
            `;
        }).join('');
        flatMeaning = posMap.map(g => (g.pos ? g.pos + ' ' : '') + g.texts.join('； ')).join('   ');
        topZhHeaderHtml = posMap.map(g => `<span class="bc-top-sense-seg">${g.pos ? `<span class="bc-pos-inline">${escapeHtml(g.pos)}</span> ` : ''}${escapeHtml(g.texts.join('； '))}</span>`).join(' ');
    } else if (w.meanings && Array.isArray(w.meanings) && w.meanings.length > 0) {
        meaningsHtml = w.meanings.map(m => {
            const isMistakeRow = Boolean(targetMistakeMeaning && (w.meanings.length === 1 || isMistakeMeaningMatch(m.pos, m.meaning, targetMistakeMeaning)));
            return `
            <div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}">
                ${m.pos ? `<span class="bc-pos-inline">${escapeHtml(m.pos)}</span>` : ''}
                <span class="bc-meaning-text">${escapeHtml(m.meaning || '')}</span>
            </div>
            `;
        }).join('');
        flatMeaning = w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + (m.meaning || '')).join('   ');
        topZhHeaderHtml = w.meanings.map(m => `<span class="bc-top-sense-seg">${m.pos ? `<span class="bc-pos-inline">${escapeHtml(m.pos)}</span> ` : ''}${escapeHtml(m.meaning || '')}</span>`).join(' ');
    } else {
        const rawM = w.meaning || (Array.isArray(w.trans) ? w.trans.join('； ') : (w.trans || '暂无释义'));
        const splitParts = (typeof rawM === 'string' && rawM.includes(' '))
            ? rawM.split(/\s+(?=(?:n|v|vt|vi|adj|adv|a|ad|prep|conj|pron|num|art|int|aux|pl)\.)/g).map(s => s.trim()).filter(Boolean)
            : [];
        if (splitParts.length > 1) {
            meaningsHtml = splitParts.map(part => {
                const match = part.match(/^([a-zA-Z]+\.)\s*(.*)$/);
                const pos = match ? match[1] : '';
                const txt = match ? match[2] : part;
                const isMistakeRow = Boolean(targetMistakeMeaning && isMistakeMeaningMatch(pos, txt, targetMistakeMeaning));
                if (match) {
                    return `<div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}"><span class="bc-pos-inline">${escapeHtml(match[1])}</span><span class="bc-meaning-text">${escapeHtml(match[2])}</span></div>`;
                }
                return `<div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}"><span class="bc-meaning-text">${escapeHtml(part)}</span></div>`;
            }).join('');
        } else {
            const match = typeof rawM === 'string' ? rawM.match(/^([a-zA-Z]+\.)\s*(.+)$/) : null;
            const isMistakeRow = Boolean(targetMistakeMeaning);
            meaningsHtml = match
                ? `<div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}"><span class="bc-pos-inline">${escapeHtml(match[1])}</span><span class="bc-meaning-text">${escapeHtml(match[2])}</span></div>`
                : `<div class="bc-meaning-row ${isMistakeRow ? 'mistake-highlight' : ''}"><span class="bc-meaning-text">${escapeHtml(rawM)}</span></div>`;
        }
        flatMeaning = rawM;
        topZhHeaderHtml = `<span class="bc-top-sense-seg">${escapeHtml(rawM)}</span>`;
    }

    const examplesHtml = formatExamplesHtml(examplesList, word);
    const derivativesHtml = formatDerivativesHtml(w.derivatives);
    const discriminationsHtml = (Array.isArray(w.discriminations) && w.discriminations.length > 0)
        ? `<div class="bc-drawer-section">
               <div class="bc-drawer-title"><span class="material-symbols-rounded">psychology</span>考点与词义辨析</div>
               ${formatDiscriminationsHtml(w.discriminations)}
           </div>`
        : '';
    const antonymsHtml = formatAntonymsHtml(w.antonyms);
    const noteHtml = w.note
        ? `<div class="bc-word-note"><span class="material-symbols-rounded" style="font-size:14px; margin-right:4px;">info</span><span>${escapeHtml(w.note)}</span></div>`
        : '';

    return {
        word,
        phoneDisplay,
        meaningsHtml,
        flatMeaning,
        topZhHeaderHtml,
        noteHtml,
        examplesHtml,
        derivativesHtml,
        discriminationsHtml,
        antonymsHtml,
        extraDrawerHtml: `${noteHtml}${examplesHtml}${derivativesHtml}${discriminationsHtml}${antonymsHtml}`
    };
}

/**
 * 统一词条行渲染器
 * - 展示英文状态时：所有卡片（含已展开）上方展示英文+音标，详情框中展示每个词性及释义
 * - 展示释义状态时：所有卡片（含已展开）上方展示每个词性和对应释义（直接用空格分隔，不显示|和音标），详情框中展示单词本身和音标
 */
function renderBookContentUnifiedCard(w, idx, isCustomLocal, isShiCi) {
    const word = w.word || w.name || '';
    const safeKey = `bc_${idx}_${String(word).replace(/[^a-zA-Z0-9]/g, '_')}`;
    const isMastered = isShiCi
        ? (typeof ShiCiEbbinghausEngine !== 'undefined' ? ShiCiEbbinghausEngine.isWordMastered(word) : isWordMastered(word))
        : isWordMastered(word);
    const isExp = bookContentState.allExpanded || bookContentState.expandedItemKeys.has(safeKey);

    const detail = buildUnifiedWordDetailData(w, isShiCi);
    const { phoneDisplay, meaningsHtml, flatMeaning, topZhHeaderHtml, extraDrawerHtml } = detail;

    const isZhMode = (bookContentState.collapsedDisplayMode === 'zh');

    // 顶部标题栏：展示英文模式显示“单词 + 音标”；展示释义模式显示“词性 + 释义”（不含 | 和音标）
    const headerTitleHtml = isZhMode
        ? `<span class="bc-headword bc-headword-zh" title="${escapeHtml(flatMeaning || word)}">${topZhHeaderHtml || escapeHtml(word)}</span>`
        : `<span class="bc-headword" title="${escapeHtml(word)}">${escapeHtml(word)}</span>
           ${phoneDisplay ? `<span class="bc-phone">${escapeHtml(phoneDisplay)}</span>` : ''}`;

    // 展开框内部第一栏：展示英文模式显示“词性 + 释义”；展示释义模式显示“单词本身 + 音标”
    const drawerPrimaryBoxHtml = isZhMode
        ? `<div class="bc-meaning-row bc-word-reveal-row">
               <span class="bc-reveal-word">${escapeHtml(word)}</span>
               ${phoneDisplay ? `<span class="bc-reveal-phone">${escapeHtml(phoneDisplay)}</span>` : ''}
           </div>`
        : meaningsHtml;

    return `
        <div class="bc-unified-item ${isExp ? 'expanded' : ''}" id="bc-card-${safeKey}" onclick="toggleBookContentItemDetail('${safeKey}', event)">
            <div class="bc-item-header">
                <div class="bc-item-title-meta">
                    ${headerTitleHtml}
                </div>
                <div class="bc-item-actions" onclick="event.stopPropagation()">
                    <button type="button" class="btn-circle-icon-action" data-word="${escapeHtml(word)}" onclick="jumpToSearch(this.dataset.word)" title="查词" aria-label="查词">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                    <button type="button" class="btn-circle-icon-action" data-word="${escapeHtml(word)}" onclick="playWordAudio(this.dataset.word)" title="发音" aria-label="发音">
                        <span class="material-symbols-rounded">volume_up</span>
                    </button>
                    <button type="button" class="btn-circle-icon-action bc-mastered-btn ${isMastered ? 'mastered' : ''}" data-word="${escapeHtml(word)}" onclick="toggleBookContentMastered(this.dataset.word, ${isShiCi ? 'true' : 'false'}, this)" title="${isMastered ? '已掌握（点击取消）' : '标为熟词'}" aria-label="熟词">
                        <span class="material-symbols-rounded">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                    </button>
                    ${isCustomLocal ? `
                        <button type="button" class="btn-circle-icon-action danger" data-word="${escapeHtml(word)}" onclick="deleteWordFromBookContent(this.dataset.word)" title="删除词汇">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <!-- 向下展开的详情抽屉 -->
            <div class="bc-item-drawer" style="display:${isExp ? 'block' : 'none'};">
                <div class="bc-meanings-group">
                    ${drawerPrimaryBoxHtml}
                </div>
                ${extraDrawerHtml}
            </div>
        </div>
    `;
}

function toggleBookContentItemDetail(uniqueKey, e) {
    if (e && e.target && (e.target.closest('.btn-circle-icon-action') || e.target.closest('.btn-mastered-pill') || e.target.closest('.bc-inline-audio-btn'))) return;
    const card = document.getElementById(`bc-card-${uniqueKey}`);
    if (!card) return;

    const isExp = card.classList.contains('expanded');
    card.classList.toggle('expanded', !isExp);
    if (!isExp) {
        bookContentState.expandedItemKeys.add(uniqueKey);
    } else {
        bookContentState.expandedItemKeys.delete(uniqueKey);
    }
    const drawer = card.querySelector('.bc-item-drawer');
    if (drawer) {
        drawer.style.display = !isExp ? 'block' : 'none';
    }
    const phoneEl = card.querySelector('.bc-phone');
    if (phoneEl && bookContentState.collapsedDisplayMode !== 'zh') {
        phoneEl.style.display = !isExp ? 'inline-flex' : 'none';
    }
}

function loadMoreBookContent() {
    bookContentState.renderedCount += 60;
    renderBookContentItems(true);
}

/**
 * 渲染统一词条卡片列表 (图10: 将所有词条放在一起，不要用独立容器分隔)
 */
function renderBookContentItems(isAppending = false) {
    const listEl = document.getElementById('book-content-list');
    const loadMoreEl = document.getElementById('book-content-load-more');
    if (!listEl) return;

    const { filteredWords, renderedCount, archetype, bookId } = bookContentState;
    const totalMatched = filteredWords.length;
    const isCustomLocal = String(bookId).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === bookId));
    const isShiCi = (archetype && archetype.key === 'shici');

    if (totalMatched === 0) {
        listEl.innerHTML = `
            <div class="book-content-empty">
                <span class="material-symbols-rounded">search_off</span>
                <p>未找到符合条件的词条</p>
            </div>
        `;
        if (loadMoreEl) loadMoreEl.innerHTML = '';
        return;
    }

    const itemsToRender = filteredWords.slice(0, renderedCount);
    const cardsHtml = itemsToRender.map((w, idx) => {
        return renderBookContentUnifiedCard(w, idx, isCustomLocal, isShiCi);
    }).join('');

    listEl.className = 'book-content-unified-card';
    listEl.innerHTML = cardsHtml;

    if (loadMoreEl) {
        if (renderedCount < totalMatched) {
            const remaining = totalMatched - renderedCount;
            loadMoreEl.innerHTML = `
                <button type="button" class="btn btn-outlined btn-sm" onclick="loadMoreBookContent()">
                    <span class="material-symbols-rounded">expand_more</span>
                    <span>加载更多 (剩余 ${remaining} 词)</span>
                </button>
            `;
        } else if (totalMatched > 60) {
            loadMoreEl.innerHTML = `<div class="book-content-end-hint">已展示全部 ${totalMatched} 个词条</div>`;
        } else {
            loadMoreEl.innerHTML = '';
        }
    }
}


/**
 * 词书内容页直接切换熟词/已掌握状态
 */
function toggleBookContentMastered(word, isShiCi, btnEl) {
    if (!word) return;
    const nowMastered = isShiCi
        ? (typeof ShiCiEbbinghausEngine !== 'undefined' ? ShiCiEbbinghausEngine.isWordMastered(word) : (typeof isWordMastered === 'function' ? isWordMastered(word) : false))
        : (typeof isWordMastered === 'function' ? isWordMastered(word) : false);

    if (nowMastered) {
        if (isShiCi && typeof ShiCiEbbinghausEngine !== 'undefined') {
            ShiCiEbbinghausEngine.unmarkMastered(word);
            ShiCiEbbinghausEngine.updateDueBadge();
        }
        if (typeof removeWordMastered === 'function') {
            removeWordMastered(word);
        } else if (typeof unmarkWordAsMastered === 'function') {
            unmarkWordAsMastered(word);
        }
        if (btnEl) {
            btnEl.classList.remove('mastered');
            btnEl.title = '标为熟词';
            btnEl.innerHTML = `<span class="material-symbols-rounded">check_circle_outline</span>`;
        }
    } else {
        if (isShiCi && typeof ShiCiEbbinghausEngine !== 'undefined') {
            ShiCiEbbinghausEngine.recordWord(word, '', '', true, true);
            ShiCiEbbinghausEngine.updateDueBadge();
        }
        if (typeof ensureWordMastered === 'function') {
            ensureWordMastered(word, '', '', isShiCi);
        } else if (typeof markWordAsMastered === 'function') {
            markWordAsMastered(word);
        }
        if (btnEl) {
            btnEl.classList.add('mastered');
            btnEl.title = '已掌握（点击取消）';
            btnEl.innerHTML = `<span class="material-symbols-rounded">check_circle</span>`;
        }
    }

    // 重新计算掌握度 pill
    const { rawWords, archetype } = bookContentState;
    let masteredCount = 0;
    rawWords.forEach(w => {
        if (!w || !w.word) return;
        const mastered = isShiCi
            ? (typeof ShiCiEbbinghausEngine !== 'undefined' ? ShiCiEbbinghausEngine.isWordMastered(w.word) : isWordMastered(w.word))
            : isWordMastered(w.word);
        if (mastered) masteredCount++;
    });
    const totalCount = rawWords.length;
    const masteryPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
    const pillEl = document.getElementById('book-content-mastery-pill');
    if (pillEl) {
        pillEl.textContent = `已掌握 ${masteredCount}/${totalCount} (${masteryPct}%)`;
    }
}

/**
 * 从本地词书中删除词条（移入回收站）
 */
async function deleteWordFromBookContent(word) {
    if (!bookContentState.bookId || !word) return;
    const ok = await (typeof showAppConfirm === 'function' ? showAppConfirm({
        title: '移出词汇',
        message: `确定将词汇【${word}】从当前词书移除并移入回收站吗？可在回收站中随时恢复。`,
        confirmText: '移出',
        cancelText: '取消',
        isDanger: true,
        icon: 'delete'
    }) : Promise.resolve(confirm(`确定将词汇【${word}】从当前词书移除并移入回收站吗？`)));

    if (!ok) return;

    if (typeof deleteWordFromCustomBook === 'function') {
        const success = await deleteWordFromCustomBook(word, bookContentState.bookId);
        if (success) {
            showToast(`已将「${word}」移出词书`);
            openBookContentPage(bookContentState.bookId);
        }
    }
}

// 兼容性保留旧接口，直接指向新页面
function openBookWordsViewerModal(title, words) {
    openBookContentPage(bookContentState.bookId || title, words);
}
function closeBookWordsViewerModal() {
    exitBookContentPage();
}
function filterBookViewerWords(query) {
    handleBookContentSearch(query);
}
function toggleModalWordDetail(key, e) {
    toggleBookContentItemDetail(key, e);
}
function toggleModalWordMastered(word, btnEl) {
    toggleBookContentMastered(word, false, btnEl);
}
function renderBookViewerList(wordsList) {
    bookContentState.filteredWords = wordsList;
    renderBookContentItems();
}

/**
 * 重学词书：清空记忆算法记录与已背进度
 */
async function actionResetBookProgress(explicitBookId = null) {
    const bookId = getResolvedBookActionId(explicitBookId);
    closeBookActionMenu(true);
    if (!bookId) {
        console.warn('actionResetBookProgress: 未找到要重学的词书ID');
        if (typeof showToast === 'function') showToast('未找到要重学的词书');
        return;
    }

    const bookMeta = (typeof BookManager !== 'undefined' && BookManager.getBookMeta) ? (BookManager.getBookMeta(bookId) || { id: bookId, name: bookId }) : { id: bookId, name: bookId };
    const bookName = (bookMeta.rawName || bookMeta.name || bookId).replace(/^[📂📁\s]+/, '');

    let okReset = false;
    if (typeof showAppConfirm === 'function') {
        try {
            okReset = await showAppConfirm({
                title: '重置学习进度',
                message: `确定要重学词书《${bookName}》吗？\n这将清空该词书所有学习记录，从头开始背诵。`,
                confirmText: '确认重置',
                cancelText: '取消',
                isDanger: true,
                icon: 'restart_alt'
            });
        } catch (e) {
            okReset = confirm(`确定要重学词书《${bookName}》吗？\n这将清空该词书所有学习记录，从头开始背诵。`);
        }
    } else {
        okReset = confirm(`确定要重学词书《${bookName}》吗？\n这将清空该词书所有学习记录，从头开始背诵。`);
    }
    if (!okReset) {
        return;
    }

    try {
        if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.resetBookProgress === 'function') {
            await EbbinghausEngine.resetBookProgress(bookId);
        }
        if (typeof isBookShiCi === 'function' && isBookShiCi(bookMeta) && typeof ShiCiEbbinghausEngine !== 'undefined') {
            const shiciRecs = ShiCiEbbinghausEngine.getRecords();
            let words = bookMeta.words || (BookManager.bookCache ? BookManager.bookCache[bookId] : null);
            if ((!words || words.length === 0) && typeof ShiCiManager !== 'undefined') {
                words = await ShiCiManager.loadBooks([bookId]);
            }
            (words || []).forEach(w => {
                if (w && w.word) {
                    delete shiciRecs[w.word.trim()];
                }
            });
            ShiCiEbbinghausEngine.saveRecords(shiciRecs);
            if (typeof ShiCiEbbinghausEngine.updateDueBadge === 'function') {
                ShiCiEbbinghausEngine.updateDueBadge();
            }
        }

        const userKey = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
        if (userKey) {
            localStorage.removeItem(`single_learn_progress_${userKey}`);
            localStorage.removeItem(`single_progress_${userKey}`);
            localStorage.removeItem(`single_review_progress_${userKey}`);
            localStorage.removeItem(`shici_learn_progress_${userKey}`);
            localStorage.removeItem(`shici_review_progress_${userKey}`);
        }

        showToast(`已成功重置《${bookName}》的学习进度！`);
        if (typeof renderManageBooksPage === 'function') {
            renderManageBooksPage();
        }
        if (typeof renderBookSelectorPage === 'function') {
            renderBookSelectorPage();
        }
        if (typeof renderMeRecentBookCard === 'function') {
            renderMeRecentBookCard();
        }
        if (typeof renderMeView === 'function') {
            renderMeView();
        }
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
    } catch (e) {
        console.error('Reset book progress error:', e);
        showToast('重置学习进度失败');
    }
}

/**
 * 删除本地词书
 */
async function actionDeleteBook(explicitBookId = null) {
    const bookId = getResolvedBookActionId(explicitBookId);
    closeBookActionMenu(true);
    if (!bookId) return;

    const bookMeta = BookManager.getBookMeta(bookId) || { id: bookId, name: bookId };
    const bookName = (bookMeta.rawName || bookMeta.name || bookId).replace(/^[📂📁\s]+/, '');

    const okDelete = await (typeof showAppConfirm === 'function' ? showAppConfirm({
        title: '删除词书',
        message: `确定要从本地删除《${bookName}》吗？\n如果是云端词书，你可以随时重新下载。`,
        confirmText: '确认删除',
        cancelText: '取消',
        isDanger: true,
        icon: 'delete'
    }) : Promise.resolve(confirm(`确定要从本地删除《${bookName}》吗？\n如果是云端词书，你可以随时重新下载。`)));
    if (!okDelete) {
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
        if (typeof renderMeRecentBookCard === 'function') {
            renderMeRecentBookCard();
        }
    } catch (e) {
        console.error('Delete book error:', e);
        showToast('删除词书失败');
    }
}

/**
 * 单本词书更新（供个人中心“我的词书”菜单调用）
 */
async function actionUpdateSingleBook(explicitBookId = null) {
    const bookId = explicitBookId || activeActionBookId;
    closeBookActionMenu();
    if (!bookId || typeof BookManager === 'undefined') return;
    const bookMeta = BookManager.getBookMeta(bookId) || { id: bookId, name: bookId };
    if (String(bookId).startsWith('custom_') || !bookMeta.isCloud) {
        showToast('本地自定义词书无需从云端更新');
        return;
    }
    showToast(`正在更新《${bookMeta.name || bookId}》...`);
    try {
        const ok = await BookManager.downloadBook(bookId);
        if (ok) {
            showToast(`《${bookMeta.name || bookId}》已更新至最新版本！`);
            if (typeof renderMeRecentBookCard === 'function') renderMeRecentBookCard();
        }
    } catch (e) {
        showToast('更新词书失败，请检查网络连接');
    }
}
window.actionUpdateSingleBook = actionUpdateSingleBook;

/**
 * 获取词书学习范围摘要文本
 */
function getBookScopeSummaryText(bookId) {
    if (!bookId || typeof BookManager === 'undefined') return '';
    const filter = BookManager.getBookStudyFilter(bookId);
    if (!filter || filter.isAll) return '全部范围';
    const parts = [];
    if (Array.isArray(filter.sections) && filter.sections.length > 0) {
        parts.push(filter.sections.length <= 2 ? filter.sections.map(s => s.toUpperCase()).join(',') : `${filter.sections.length}个分类`);
    }
    if (Array.isArray(filter.types) && filter.types.length === 1) {
        parts.push(filter.types[0] === 'phrase' ? '仅词组' : '仅单词');
    }
    return parts.length > 0 ? parts.join(' · ') : '全部范围';
}
window.getBookScopeSummaryText = getBookScopeSummaryText;

/**
 * 在个人中心点击“选择学习范围”：打开词书学习范围选择弹窗或跳转选书页打开筛选
 */
async function openBookScopeModalForBook(bookId) {
    if (!bookId) return;
    openBookSelectorPage('single');
    setTimeout(() => {
        const card = document.querySelector(`#book-selector-content-list .book-cover-card[data-book-id="${bookId}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const secBtn = card.querySelector('.book-card-filter-btn');
            if (secBtn) {
                secBtn.click();
            } else {
                showToast('该词书默认学习全部词汇');
            }
        }
    }, 120);
}
window.openBookScopeModalForBook = openBookScopeModalForBook;

/**
 * 移动词书选项：打开分类文件夹选择弹窗
 */
function actionMoveBook(explicitBookId = null) {
    const bookId = getResolvedBookActionId(explicitBookId);
    closeBookActionMenu(true);
    if (!bookId) return;

    const bookMeta = BookManager.getBookMeta(bookId);
    const modal = document.getElementById('modal-move-book-category');
    const titleEl = document.getElementById('move-book-modal-title');
    const listEl = document.getElementById('move-book-folder-list');

    if (!modal || !listEl) return;
    if (titleEl) titleEl.textContent = `移动《${bookMeta ? bookMeta.name : bookId}》`;

    // 收集所有可用的本地文件夹分类
    const folders = new Set();
    folders.add('未分类'); // 根目录

    let diskFolders = window.localDiskFolders;
    if (!Array.isArray(diskFolders)) {
        try {
            diskFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
        } catch (e) {
            diskFolders = [];
        }
    }
    if (Array.isArray(diskFolders)) {
        diskFolders.forEach(f => {
            const trimmed = (f || '').trim();
            if (trimmed && !['未分类', '未归类', '全部', '云端', '本地', 'cloud_books', 'local_books'].includes(trimmed)) {
                folders.add(trimmed);
            }
        });
    }

    const currentCat = (bookMeta ? (bookMeta.category || '未分类') : '未分类').trim();

    listEl.innerHTML = Array.from(folders).map(folder => {
        const isCurrent = (folder === currentCat || (folder === '未分类' && (!currentCat || currentCat === '未分类' || currentCat === '未归类')));
        return `
            <div class="move-folder-item ${isCurrent ? 'current' : ''}" 
                 onclick="selectTargetFolderToMove('${escapeHtml(folder)}')"
                 style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; cursor:pointer; margin-bottom:4px; ${isCurrent ? 'background:var(--md-sys-color-secondary-container); font-weight:700;' : 'background:transparent;'}">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-primary);">${folder === '未分类' ? 'folder_open' : 'folder'}</span>
                    <span style="font-size:0.9rem;">${escapeHtml(folder)}</span>
                </div>
                ${isCurrent ? '<span style="font-size:0.75rem; color:var(--md-sys-color-outline);">当前位置</span>' : '<span class="material-symbols-rounded" style="font-size:16px; opacity:0.5;">arrow_forward</span>'}
            </div>
        `;
    }).join('');

    modal.classList.add('active');
}

function closeMoveBookCategoryModal() {
    const modal = document.getElementById('modal-move-book-category');
    if (modal) modal.classList.remove('active');
}

async function selectTargetFolderToMove(targetFolder) {
    const bookId = activeActionBookId;
    if (!bookId) return;

    closeMoveBookCategoryModal();
    const folder = (targetFolder === '未分类') ? '' : targetFolder;

    if (typeof ElectronManager !== 'undefined' && typeof ElectronManager.moveBook === 'function') {
        showToast('正在移动词书...');
        const res = await ElectronManager.moveBook(bookId, folder);
        if (res) {
            renderManageBooksPage();
            if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
                renderBookSelectorPage();
            }
        }
    }
}

async function promptCreateAndMoveBook() {
    const name = await (typeof showAppPrompt === 'function' ? showAppPrompt({
        title: '新建分类文件夹',
        message: '请输入新分类文件夹名称：',
        placeholder: '分类文件夹名称'
    }) : Promise.resolve(prompt('请输入新分类文件夹名称：')));

    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const reserved = ['全部', '云端', '本地', '我的', '未分类', '未归类', 'cloud_books', 'local_books'];
    if (reserved.includes(trimmed)) {
        showToast('该名称为系统保留分类，无法使用');
        return;
    }

    await createLocalCategoryPath(trimmed);
    await selectTargetFolderToMove(trimmed);
}

/**
 * 清空当前模式下所有已选择的词书
 */
function clearAllSelectedBooksInCurrentMode() {
    if (bookSelectorMode === 'single') {
        singleSelectedBookIds = [];
        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        const badge = document.getElementById('single-book-badge');
        if (badge) badge.innerText = '未选择';
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
        if (typeof shiciConfig !== 'undefined') shiciConfig.selectedBooks = [];
        if (typeof saveShiCiState === 'function') saveShiCiState();
        const badge = document.getElementById('shici-book-badge');
        if (badge) badge.innerText = '未选择';
        if (currentUser) {
            localStorage.removeItem(`shici_learn_progress_${currentUser}`);
            localStorage.removeItem(`shici_review_progress_${currentUser}`);
        }
        if (typeof updateShiCiProgressStatusUI === 'function') updateShiCiProgressStatusUI();
    } else if (bookSelectorMode === 'riddle') {
        if (typeof riddleConfig !== 'undefined') {
            riddleConfig.selectedBooks = [];
            riddleConfig.bookId = '';
        }
        if (typeof riddleState !== 'undefined' && riddleState) {
            riddleState.bookName = '';
        }
        if (typeof saveRiddleSettingsOnly === 'function') saveRiddleSettingsOnly();
        const topBookName = document.getElementById('riddle-top-book-name');
        if (topBookName) topBookName.innerText = '未选择';
    } else if (bookSelectorMode === 'dictation') {
        if (typeof dictationConfig !== 'undefined') dictationConfig.selectedBooks = [];
        if (typeof saveDictationSettings === 'function') saveDictationSettings();
        const badge = document.getElementById('dictation-book-badge');
        if (badge) badge.innerText = '未选择';
    } else if (bookSelectorMode === 'room') {
        if (typeof roomConfig !== 'undefined') roomConfig.selectedBooks = [];
        if (typeof updateRoomBookSummaryUI === 'function') updateRoomBookSummaryUI();
        if (typeof broadcastRuleChange === 'function' && typeof isHost !== 'undefined' && isHost) broadcastRuleChange();
    } else if (bookSelectorMode === 'preset') {
        if (window.activeEditingPreset) activeEditingPreset.selectedBooks = [];
        if (typeof updatePresetBookSummaryUI === 'function') updatePresetBookSummaryUI();
    } else if (bookSelectorMode === 'invite') {
        if (window.activeInviteRules) activeInviteRules.selectedBooks = [];
        if (typeof updateInviteBookSummaryUI === 'function') updateInviteBookSummaryUI();
    } else if (bookSelectorMode === 'ai_duel') {
        if (typeof aiDuelConfig !== 'undefined') {
            aiDuelConfig.selectedBooks = [];
            localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
        }
        if (typeof updateAiDuelBookSummaryUI === 'function') updateAiDuelBookSummaryUI();
    } else if (bookSelectorMode === 'local_duel') {
        if (typeof localDuelConfig !== 'undefined') {
            localDuelConfig.selectedBooks = [];
            localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
        }
        if (typeof updateLocalDuelBookSummaryUI === 'function') updateLocalDuelBookSummaryUI();
    }

    showToast('已清空所有已选择的词书');
    renderBookSelectorPage();
}

/**
 * 本地模式：新建分类文件夹
 */
async function promptCreateLocalCategory() {
    const name = await (typeof showAppPrompt === 'function' ? showAppPrompt({
        title: '新建分类文件夹',
        message: '请输入新分类名称：',
        placeholder: '分类名称'
    }) : Promise.resolve(prompt('请输入新分类名称：')));

    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const reserved = ['全部', '云端', '本地', '我的', '未分类', '未归类', 'cloud_books', 'local_books'];
    if (reserved.includes(trimmed)) {
        showToast('该名称为系统保留分类，无法使用');
        return;
    }

    await createLocalCategoryPath(trimmed);
    manageBooksActiveCategory = trimmed;
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
}

/**
 * 本地模式：重命名当前选中的本地分类
 */
async function promptRenameCurrentCategory() {
    const oldName = manageBooksActiveCategory;
    const nonEditable = ['全部', '云端', '本地', '我的', '初中', '高中', '大学', '实词', '翻译', '其他', 'Doris', '未分类', '未归类'];
    if (!oldName || nonEditable.includes(oldName)) {
        showToast('系统默认分类不可重命名');
        return;
    }
    const newName = await (typeof showAppPrompt === 'function' ? showAppPrompt({
        title: '重命名分类',
        message: `请输入分类“${oldName}”的新名称：`,
        defaultValue: oldName,
        placeholder: '新分类名称'
    }) : Promise.resolve(prompt(`请输入分类“${oldName}”的新名称：`, oldName)));

    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    const reserved = ['全部', '云端', '本地', '我的', '未分类', '未归类', 'cloud_books', 'local_books'];
    if (reserved.includes(trimmed)) {
        showToast('该名称为系统保留分类，无法使用');
        return;
    }

    await renameLocalCategoryPath(oldName, trimmed);
    manageBooksActiveCategory = trimmed;
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
}

/**
 * 本地模式：删除当前选中的本地分类
 */
async function promptDeleteCurrentCategory() {
    const catName = manageBooksActiveCategory;
    const nonEditable = ['全部', '云端', '本地', '我的', '初中', '高中', '大学', '实词', '翻译', '其他', 'Doris', '未分类', '未归类'];
    if (!catName || nonEditable.includes(catName)) {
        showToast('系统默认分类不可删除');
        return;
    }
    const ok = await (typeof showAppConfirm === 'function' ? showAppConfirm({
        title: '删除分类',
        message: `确定要删除分类“${catName}”吗？\n该分类下的词书将被移至根目录（未分类），不会被删除。`,
        confirmText: '删除分类',
        cancelText: '取消',
        isDanger: true,
        icon: 'folder_delete'
    }) : Promise.resolve(confirm(`确定要删除分类“${catName}”吗？\n该分类下的词书将被移至根目录（未分类），不会被删除。`)));

    if (!ok) return;

    await deleteLocalCategoryPath(catName);
    manageBooksActiveCategory = '全部';
    renderManageBooksCategoryTabs();
    renderManageBooksPage();
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
    showToast('已永久解锁内部词书！');

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
            aiDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(aiDuelConfig.selectedBooks, bookId) : aiDuelConfig.selectedBooks.filter(id => id !== bookId);
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
            localDuelConfig.selectedBooks = typeof toggleBookIdInList === 'function' ? toggleBookIdInList(localDuelConfig.selectedBooks, bookId) : localDuelConfig.selectedBooks.filter(id => id !== bookId);
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

// ---------------------------------------------------------
// 词书板块分类与类型学习筛选功能 (拆为两个独立的 MD3 锚定下拉菜单)
// ---------------------------------------------------------

let currentDropdownSectionBookId = null;
let currentDropdownSectionWords = [];
let activeSectionTriggerBtn = null;

let currentDropdownTypeBookId = null;
let currentDropdownTypeWords = [];
let activeTypeTriggerBtn = null;

/* ==========================================================================
   板块筛选下拉菜单 (Section Dropdown - 垂直下拉列表，每行一个板块)
   ========================================================================== */

/**
 * 展开/收起板块筛选下拉菜单
 */
async function toggleBookSectionDropdown(event, bookId) {
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    closeBookTypeDropdown();
    closeBookActionMenu();

    const menuEl = document.getElementById('menu-book-section-dropdown');
    if (!menuEl) return;

    if (currentDropdownSectionBookId === bookId && menuEl.style.display !== 'none') {
        closeBookSectionDropdown();
        return;
    }

    currentDropdownSectionBookId = bookId;
    activeSectionTriggerBtn = event ? (event.currentTarget || (event.target && event.target.closest('.book-card-filter-btn, .me-recent-book-scope-pill')) || event.target) : null;

    const titleEl = document.getElementById('sf-sec-dropdown-title');
    if (titleEl) {
        titleEl.textContent = '选择分类';
    }

    const listEl = document.getElementById('sf-dropdown-sections-grid');
    if (listEl) {
        listEl.innerHTML = '<div style="padding:16px; font-size:0.8rem; color:var(--md-sys-color-outline); text-align:center;">加载分类中...</div>';
    }

    mountAnchoredBookDropdown(menuEl, activeSectionTriggerBtn, 'left');

    let words = [];
    if (typeof BookManager !== 'undefined') {
        words = await BookManager.loadBookData(bookId);
    }
    currentDropdownSectionWords = words || [];

    const savedFilter = (typeof BookManager !== 'undefined') ? BookManager.getBookStudyFilter(bookId) : null;

    const sectionCounts = {};
    const sectionList = [];

    currentDropdownSectionWords.forEach(w => {
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

    if (sectionList.length === 0 && currentDropdownSectionWords.length > 0) {
        const letterSet = new Set();
        currentDropdownSectionWords.forEach(w => {
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

    if (listEl) {
        if (sectionList.length > 0) {
            const selectedSet = (savedFilter && Array.isArray(savedFilter.sections) && !savedFilter.isAll)
                ? new Set(savedFilter.sections.map(s => s.toLowerCase()))
                : null;

            listEl.innerHTML = sectionList.map(sec => {
                const isChecked = selectedSet ? selectedSet.has(sec) : true;
                const count = sectionCounts[sec] || 0;
                return `
                    <label class="book-dd-check-row ${isChecked ? 'active' : ''}">
                        <input type="checkbox" value="${escapeHtml(sec)}" ${isChecked ? 'checked' : ''} onchange="handleSectionDropdownChange()" class="book-dd-checkbox">
                        <span class="book-dd-row-name">${escapeHtml(sec.toUpperCase())}</span>
                        <span class="book-dd-row-count">${count} 词</span>
                    </label>
                `;
            }).join('');
        } else {
            listEl.innerHTML = '<div style="padding:16px; font-size:0.8rem; color:var(--md-sys-color-outline); text-align:center;">暂无独立分类</div>';
        }
    }

    handleSectionDropdownChange();
    mountAnchoredBookDropdown(menuEl, activeSectionTriggerBtn, 'left');
}

function closeBookSectionDropdown() {
    const menuEl = document.getElementById('menu-book-section-dropdown');
    if (menuEl) {
        menuEl.style.display = 'none';
        menuEl.classList.remove('align-right', 'flip-up');
    }
    currentDropdownSectionBookId = null;
    currentDropdownSectionWords = [];
    activeSectionTriggerBtn = null;
    document.querySelectorAll('.book-cover-card.dropdown-open').forEach(c => c.classList.remove('dropdown-open'));
    document.querySelectorAll('.local-tree-folder.dropdown-open-folder').forEach(f => f.classList.remove('dropdown-open-folder'));
}

function toggleAllDropdownSections(selectAll) {
    const cbs = document.querySelectorAll('#sf-dropdown-sections-grid input[type="checkbox"]');
    cbs.forEach(cb => {
        cb.checked = Boolean(selectAll);
        const label = cb.closest('.book-dd-check-row');
        if (label) {
            label.classList.toggle('active', cb.checked);
        }
    });
    handleSectionDropdownChange();
}

function handleSectionDropdownChange() {
    const sectionCbs = Array.from(document.querySelectorAll('#sf-dropdown-sections-grid input[type="checkbox"]'));
    const selectedSections = new Set();
    sectionCbs.forEach(cb => {
        const label = cb.closest('.book-dd-check-row');
        if (cb.checked) {
            selectedSections.add(cb.value.toLowerCase());
            if (label) label.classList.add('active');
        } else {
            if (label) label.classList.remove('active');
        }
    });

    const summaryEl = document.getElementById('sf-sec-dropdown-matched');
    if (summaryEl) {
        summaryEl.textContent = '';
        summaryEl.style.display = 'none';
    }
}

function applyBookSectionDropdown() {
    const bookId = currentDropdownSectionBookId;
    if (!bookId) {
        closeBookSectionDropdown();
        return;
    }

    const sectionCbs = Array.from(document.querySelectorAll('#sf-dropdown-sections-grid input[type="checkbox"]'));
    const totalCount = sectionCbs.length;
    const selectedSections = sectionCbs.filter(cb => cb.checked).map(cb => cb.value.toLowerCase());

    if (totalCount > 0 && selectedSections.length === 0) {
        if (typeof showToast === 'function') showToast('请至少勾选一个分类');
        return;
    }

    const curFilter = (typeof BookManager !== 'undefined' ? BookManager.getBookStudyFilter(bookId) : null) || {};
    const isAllSections = (totalCount === 0 || selectedSections.length === totalCount);

    curFilter.sections = isAllSections ? null : selectedSections;
    const isAllTypes = !curFilter.types || curFilter.types.length === 0 || curFilter.types.length === 2;
    curFilter.isAll = isAllSections && isAllTypes;

    if (typeof BookManager !== 'undefined') {
        BookManager.setBookStudyFilter(bookId, curFilter);
    }

    closeBookSectionDropdown();

    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderSingleBookList === 'function') renderSingleBookList();
    if (typeof renderMeRecentBookCard === 'function') renderMeRecentBookCard();

    if (typeof showToast === 'function') {
        showToast(isAllSections ? '已选择全部板块' : `已选择 ${selectedSections.length} 个板块`);
    }
}

/* ==========================================================================
   类型筛选下拉菜单 (Type Dropdown - 垂直下拉列表，每行一个类型)
   ========================================================================== */

/**
 * 展开/收起类型筛选下拉菜单
 */
async function toggleBookTypeDropdown(event, bookId) {
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    closeBookSectionDropdown();
    closeBookActionMenu();

    const menuEl = document.getElementById('menu-book-type-dropdown');
    if (!menuEl) return;

    if (currentDropdownTypeBookId === bookId && menuEl.style.display !== 'none') {
        closeBookTypeDropdown();
        return;
    }

    currentDropdownTypeBookId = bookId;
    activeTypeTriggerBtn = event ? (event.currentTarget || (event.target && event.target.closest('.book-card-filter-btn, .me-recent-book-scope-pill')) || event.target) : null;

    mountAnchoredBookDropdown(menuEl, activeTypeTriggerBtn, 'left');

    let words = [];
    if (typeof BookManager !== 'undefined') {
        words = await BookManager.loadBookData(bookId);
    }
    if (currentDropdownTypeBookId !== bookId) return;
    currentDropdownTypeWords = words || [];

    const savedFilter = (typeof BookManager !== 'undefined') ? BookManager.getBookStudyFilter(bookId) : null;

    const isAllSelected = !savedFilter || !savedFilter.types || savedFilter.types.length === 0 || savedFilter.types.length === 2;
    const isWordSelected = isAllSelected || (savedFilter.types && savedFilter.types.includes('word'));
    const isPhraseSelected = isAllSelected || (savedFilter.types && savedFilter.types.includes('phrase'));

    const listEl = document.getElementById('sf-dropdown-types-list');
    if (listEl) {
        // 用户要求：选择类型菜单不用显示每个类型的词数，删除分割线和共...词
        listEl.innerHTML = `
            <div class="book-dd-header">
                <span class="book-dd-title"><span class="material-symbols-rounded" style="font-size:16px; margin-right:4px;">category</span>选择类型</span>
            </div>
            <label class="book-dd-check-row ${isWordSelected ? 'active' : ''}">
                <input type="checkbox" id="sf-type-opt-word" ${isWordSelected ? 'checked' : ''} onchange="handleTypeDropdownRowChange()" class="book-dd-checkbox">
                <span class="book-dd-row-name">单词</span>
            </label>
            <label class="book-dd-check-row ${isPhraseSelected ? 'active' : ''}">
                <input type="checkbox" id="sf-type-opt-phrase" ${isPhraseSelected ? 'checked' : ''} onchange="handleTypeDropdownRowChange()" class="book-dd-checkbox">
                <span class="book-dd-row-name">词组</span>
            </label>
        `;
    }

    // 仅挂载定位，打开菜单时不触发 renderMeRecentBookCard 重绘销毁触发按钮 DOM
    activeTypeTriggerBtn = resolveConnectedDropdownTrigger(activeTypeTriggerBtn, menuEl);
    mountAnchoredBookDropdown(menuEl, activeTypeTriggerBtn, 'left');
}

function closeBookTypeDropdown() {
    const menuEl = document.getElementById('menu-book-type-dropdown');
    if (menuEl) {
        menuEl.style.display = 'none';
        menuEl.classList.remove('align-right', 'flip-up');
    }
    currentDropdownTypeBookId = null;
    currentDropdownTypeWords = [];
    activeTypeTriggerBtn = null;
    document.querySelectorAll('.book-cover-card.dropdown-open').forEach(c => c.classList.remove('dropdown-open'));
    document.querySelectorAll('.local-tree-folder.dropdown-open-folder').forEach(f => f.classList.remove('dropdown-open-folder'));
}

function handleTypeDropdownRowChange() {
    const wordCb = document.getElementById('sf-type-opt-word');
    const phraseCb = document.getElementById('sf-type-opt-phrase');
    if (!wordCb || !phraseCb) return;

    let allowWord = wordCb.checked;
    let allowPhrase = phraseCb.checked;

    if (!allowWord && !allowPhrase) {
        wordCb.checked = true;
        allowWord = true;
    }

    const wordRow = wordCb.closest('.book-dd-check-row');
    const phraseRow = phraseCb.closest('.book-dd-check-row');
    if (wordRow) wordRow.classList.toggle('active', allowWord);
    if (phraseRow) phraseRow.classList.toggle('active', allowPhrase);

    // 实时保存并刷新卡片（若重绘替换了触发按钮，自动回绑新节点再重新锚定位置）
    const bookId = currentDropdownTypeBookId;
    if (bookId) {
        const curFilter = (typeof BookManager !== 'undefined' ? BookManager.getBookStudyFilter(bookId) : null) || {};
        const isAllTypes = (allowWord && allowPhrase);
        curFilter.types = isAllTypes ? null : [allowWord ? 'word' : null, allowPhrase ? 'phrase' : null].filter(Boolean);
        const isAllSections = !curFilter.sections || curFilter.sections.length === 0;
        curFilter.isAll = isAllTypes && isAllSections;

        if (typeof BookManager !== 'undefined') {
            BookManager.setBookStudyFilter(bookId, curFilter);
        }

        if (typeof renderMeRecentBookCard === 'function') renderMeRecentBookCard();

        const menuEl = document.getElementById('menu-book-type-dropdown');
        activeTypeTriggerBtn = resolveConnectedDropdownTrigger(activeTypeTriggerBtn, menuEl);
        if (activeTypeTriggerBtn) {
            const textSpan = activeTypeTriggerBtn.querySelector('.book-card-filter-text');
            if (textSpan) {
                textSpan.textContent = isAllTypes ? '类型' : (allowWord ? '单词' : '词组');
            }
            activeTypeTriggerBtn.classList.toggle('has-filter', !isAllTypes);
            if (menuEl && menuEl.style.display !== 'none') {
                mountAnchoredBookDropdown(menuEl, activeTypeTriggerBtn, 'left');
            }
        }
    }
}

// 统一监听全局点击，点击空白处自动关闭下拉筛选菜单与更多菜单
document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.book-anchored-dropdown') || e.target.closest('.book-card-filter-btn') || e.target.closest('.book-card-more-btn') || e.target.closest('.me-recent-book-scope-pill')) {
        return;
    }
    closeBookSectionDropdown();
    closeBookTypeDropdown();
    closeBookActionMenu();
});

// 监听页面及容器滚动，滚动时自动关闭已弹出的固定定位菜单
window.addEventListener('scroll', (e) => {
    if (e.target && e.target.closest && e.target.closest('.book-anchored-dropdown')) return;
    closeBookSectionDropdown();
    closeBookTypeDropdown();
    closeBookActionMenu();
}, true);

// 全局暴露管理词书入口与新功能
window.openManageBooksPage = openManageBooksPage;
window.exitManageBooksPage = exitManageBooksPage;
window.switchManageBooksCategory = switchManageBooksCategory;
window.openBookActionMenu = openBookActionMenu;
window.closeBookActionMenu = closeBookActionMenu;
window.actionViewBookContent = actionViewBookContent;
window.actionResetBookProgress = actionResetBookProgress;
window.actionDeleteBook = actionDeleteBook;
window.openBookWordsViewerModal = openBookWordsViewerModal;
window.closeBookWordsViewerModal = closeBookWordsViewerModal;
window.filterBookViewerWords = filterBookViewerWords;
window.openDorisPasswordModal = openDorisPasswordModal;
window.closeDorisPasswordModal = closeDorisPasswordModal;
window.submitDorisPassword = submitDorisPassword;
window.handleBookCardClick = handleBookCardClick;
window.handleManageBookCardClick = handleManageBookCardClick;
window.handleDownloadBookClick = handleDownloadBookClick;
window.actionMoveBook = actionMoveBook;
window.closeMoveBookCategoryModal = closeMoveBookCategoryModal;
window.selectTargetFolderToMove = selectTargetFolderToMove;
window.promptCreateAndMoveBook = promptCreateAndMoveBook;
window.clearAllSelectedBooksInCurrentMode = clearAllSelectedBooksInCurrentMode;
window.promptCreateLocalCategory = promptCreateLocalCategory;
window.promptRenameCurrentCategory = promptRenameCurrentCategory;
window.promptDeleteCurrentCategory = promptDeleteCurrentCategory;
window.doesBookSupportSections = doesBookSupportSections;
window.doesBookSupportTypes = doesBookSupportTypes;
window.doesBookSupportFilter = doesBookSupportFilter;
window.getBookSectionFilterSummaryText = getBookSectionFilterSummaryText;
window.getBookTypeFilterSummaryText = getBookTypeFilterSummaryText;
window.getBookFilterSummaryText = getBookFilterSummaryText;
window.mountAnchoredBookDropdown = mountAnchoredBookDropdown;
window.toggleBookSectionDropdown = toggleBookSectionDropdown;
window.closeBookSectionDropdown = closeBookSectionDropdown;
window.toggleAllDropdownSections = toggleAllDropdownSections;
window.handleSectionDropdownChange = handleSectionDropdownChange;
window.applyBookSectionDropdown = applyBookSectionDropdown;
window.toggleBookTypeDropdown = toggleBookTypeDropdown;
window.closeBookTypeDropdown = closeBookTypeDropdown;
window.handleTypeDropdownRowChange = handleTypeDropdownRowChange;
window.openBookContentPage = openBookContentPage;
window.exitBookContentPage = exitBookContentPage;
window.handleBookContentSearch = handleBookContentSearch;
window.clearBookContentSearch = clearBookContentSearch;
window.setBookContentFilter = setBookContentFilter;
window.toggleBookContentExpandAll = toggleBookContentExpandAll;
window.toggleBookContentItemDetail = toggleBookContentItemDetail;
window.toggleBookContentMastered = toggleBookContentMastered;
window.deleteWordFromBookContent = deleteWordFromBookContent;
window.loadMoreBookContent = loadMoreBookContent;
window.parkBookDropdownMenus = parkBookDropdownMenus;
window.findWordEntryForDrawer = findWordEntryForDrawer;
window.buildUnifiedWordDetailData = buildUnifiedWordDetailData;
// 兼容性保留别名
window.toggleBookSectionFilterDropdown = toggleBookSectionDropdown;
window.closeBookSectionFilterDropdown = closeBookSectionDropdown;
window.applyBookSectionFilterDropdown = applyBookSectionDropdown;
window.openBookSectionFilterModal = toggleBookSectionDropdown;
window.closeBookSectionFilterModal = closeBookSectionDropdown;

/**
 * 词书内容工具栏：一键展开/收起全部词条
 */
function toggleBookContentExpandAll() {
    bookContentState.allExpanded = !bookContentState.allExpanded;
    if (bookContentState.allExpanded) {
        bookContentState.expandedItemKeys.clear();
        (bookContentState.filteredWords || []).forEach((w, idx) => {
            const word = w.word || '';
            const safeKey = `bc_${idx}_${encodeURIComponent(word).replace(/%/g, '_')}`;
            bookContentState.expandedItemKeys.add(safeKey);
        });
    } else {
        bookContentState.expandedItemKeys.clear();
    }
    const expandIcon = document.getElementById('icon-bc-expand-all');
    const expandText = document.getElementById('text-bc-expand-all');
    if (expandIcon) expandIcon.textContent = bookContentState.allExpanded ? 'unfold_less' : 'unfold_more';
    if (expandText) expandText.textContent = bookContentState.allExpanded ? '收起全部' : '展开全部';
    renderBookContentItems();
}
window.toggleBookContentExpandAll = toggleBookContentExpandAll;

function setBookContentTypeFilter(type) {
    bookContentState.activeType = type;
    document.querySelectorAll('#bc-toolbar-type-tabs .settings-cat-tab').forEach(ch => {
        ch.classList.toggle('active', ch.getAttribute('data-type') === type);
    });
    document.querySelectorAll('#bc-toolbar-type-chips .md3-chip').forEach(ch => {
        ch.classList.toggle('selected', ch.getAttribute('data-type') === type);
    });
    applyBookContentFilters();
}
window.setBookContentTypeFilter = setBookContentTypeFilter;

function setBookContentSectionFilter(sec) {
    bookContentState.activeSection = sec;
    applyBookContentFilters();
}
window.setBookContentSectionFilter = setBookContentSectionFilter;

function updateBookContentDisplayModeUI() {
    const mode = (bookContentState.collapsedDisplayMode === 'zh') ? 'zh' : 'en';
    document.querySelectorAll('#bc-display-mode-tabs .settings-cat-tab').forEach(tab => {
        const active = tab.getAttribute('data-mode') === mode;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

function setBookContentDisplayMode(mode) {
    const nextMode = (mode === 'zh') ? 'zh' : 'en';
    if (bookContentState.collapsedDisplayMode === nextMode) return;
    bookContentState.collapsedDisplayMode = nextMode;
    updateBookContentDisplayModeUI();
    renderBookContentItems();
}
window.setBookContentDisplayMode = setBookContentDisplayMode;

function toggleBookContentDisplayMode() {
    setBookContentDisplayMode(bookContentState.collapsedDisplayMode === 'zh' ? 'en' : 'zh');
}
window.toggleBookContentDisplayMode = toggleBookContentDisplayMode;

/**
 * 一键更新全部词书：检查并更新所有已下载云端词书
 */
async function handleUpdateAllBooks() {
    if (typeof BookManager === 'undefined') return;
    if (typeof showToast === 'function') showToast('正在检查全部词书更新...');
    try {
        await BookManager.fetchBookList();
    } catch (e) { }

    const candidates = (BookManager.availableBooks || []).filter(b => b && b.isCloud && b.syncStatus === 'update_available');
    if (candidates.length === 0) {
        if (typeof showToast === 'function') showToast('暂无需要更新的词书');
        return;
    }

    let updatedCount = 0;
    for (let i = 0; i < candidates.length; i++) {
        const b = candidates[i];
        try {
            if (typeof showToast === 'function') showToast(`正在更新《${b.name}》(${i + 1}/${candidates.length})...`);
            await BookManager.downloadBook(b.id);
            updatedCount++;
        } catch (e) { }
    }

    if (typeof EbbinghausEngine !== 'undefined' && EbbinghausEngine.invalidateProgressCache) {
        EbbinghausEngine.invalidateProgressCache();
    }

    if (typeof showToast === 'function') showToast(`词书更新完成，共更新 ${updatedCount} 本词书`);
    if (typeof updateAllBooksButtonVisibility === "function") updateAllBooksButtonVisibility();

    if (typeof currentView !== 'undefined') {
        if (currentView === 'view-book-selector' && typeof renderBookSelectorPage === 'function') {
            renderBookSelectorPage();
        } else if (currentView === 'view-manage-books' && typeof renderManageBooksPage === 'function') {
            renderManageBooksPage();
        }
    }
}
window.handleUpdateAllBooks = handleUpdateAllBooks;

function updateAllBooksButtonVisibility() {
    const hasUpdates = Boolean(
        typeof BookManager !== "undefined" && Array.isArray(BookManager.availableBooks) &&
        BookManager.availableBooks.some(b => b && b.isCloud && b.syncStatus === "update_available")
    );
    document.querySelectorAll(".btn-update-all-books").forEach(btn => {
        btn.style.display = hasUpdates ? "inline-flex" : "none";
    });
}
window.updateAllBooksButtonVisibility = updateAllBooksButtonVisibility;
