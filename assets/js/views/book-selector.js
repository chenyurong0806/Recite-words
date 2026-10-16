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
 * @param {string} currentCategory - 当前卡片所在文件夹分类
 */
function renderBookCardItem(b, isManageMode = false, currentCategory = '') {
    const isSelected = isManageMode ? false : isBookIdSelectedInCurrentMode(b.id);
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
             draggable="${isManageMode ? 'true' : 'false'}"
             ${isManageMode ? `ondragstart="handleBookCardDragStart(event, '${escapeHtml(b.id)}', '${escapeHtml(currentCategory || b.category || '')}')" ondragend="handleBookCardDragEnd(event)"` : ''}
             onclick="${isManageMode ? '' : `handleBookCardClick('${escapeHtml(b.id)}')`}">
            
            <div class="book-cover-wrap">
                ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                <div class="book-cover-art" style="background:${gradient}; justify-content:center; align-items:center; text-align:center; padding:8px 6px; ${coverUrl ? 'display:none;' : ''}">
                    <span class="book-cover-art-title" style="-webkit-line-clamp:4; font-size:0.82rem; word-break:break-all; overflow-wrap:anywhere; max-width:100%; box-sizing:border-box;">${escapeHtml(b.name)}</span>
                </div>
            </div>

            <div class="book-card-info">
                <div class="book-card-header">
                    <div class="book-card-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${showMoreAction ? `
                            <button type="button" class="book-card-more-btn" onclick="event.stopPropagation(); openBookActionMenu(event, '${escapeHtml(b.id)}')" title="更多操作">
                                <span class="material-symbols-rounded" style="font-size:20px; line-height:1;">more_horiz</span>
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
                        : '<span></span>'}
                    
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
            switchView('view-me');
            if (typeof openMeSubview === 'function') openMeSubview('main');
            return;
        }
        target = 'view-book-selector';
    }
    switchView(target);
    if (target === 'view-book-selector') {
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

    const btnMove = document.getElementById('btn-action-move-book');
    if (btnMove) {
        const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode()) || window.currentEnvMode === 'offline';
        const isLocalBook = bookMeta && (!bookMeta.isCloud || String(bookId).startsWith('custom_') || bookMeta.category === '本地' || bookMeta.isDiskBook);
        btnMove.style.display = (isOffline || isLocalBook) ? 'flex' : 'none';
    }

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

    const okReset = await (typeof showAppConfirm === 'function' ? showAppConfirm({
        title: '重置学习进度',
        message: `确定要重学词书《${bookName}》吗？\n这将清空该词书所有学习记录，从头开始背诵。`,
        confirmText: '确认重置',
        cancelText: '取消',
        isDanger: true,
        icon: 'restart_alt'
    }) : Promise.resolve(confirm(`确定要重学词书《${bookName}》吗？\n这将清空该词书所有学习记录，从头开始背诵。`)));
    if (!okReset) {
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
    } catch (e) {
        console.error('Delete book error:', e);
        showToast('删除词书失败');
    }
}

/**
 * 移动词书选项：打开分类文件夹选择弹窗
 */
function actionMoveBook() {
    const bookId = activeActionBookId;
    closeBookActionMenu();
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
window.actionMoveBook = actionMoveBook;
window.closeMoveBookCategoryModal = closeMoveBookCategoryModal;
window.selectTargetFolderToMove = selectTargetFolderToMove;
window.promptCreateAndMoveBook = promptCreateAndMoveBook;
window.clearAllSelectedBooksInCurrentMode = clearAllSelectedBooksInCurrentMode;
window.promptCreateLocalCategory = promptCreateLocalCategory;
window.promptRenameCurrentCategory = promptRenameCurrentCategory;
window.promptDeleteCurrentCategory = promptDeleteCurrentCategory;
