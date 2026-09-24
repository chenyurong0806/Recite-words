/**
 * 文件夹分类树状选词书组件
 * Module: assets/js/components/folder-tree.js
 */

/* ==========================================================================
   4. 文件夹树形选词书组件 (完全修复：按分类分组、默认收起、英语与实词隔离、云端与未归类严格隔离)
   ========================================================================== */
function renderBookFolderTree(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedIds = options.selectedIds || [];
    const onToggleFn = options.onToggle || 'toggleSingleBook';
    const isSingle = options.isSingleSelect || false;
    const mode = options.mode || 'single';
    const isReadOnly = options.isReadOnly || (mode === 'room' && !isHost);
    const filterType = options.filterType || (mode === 'shici' ? 'shici' : 'english');

    const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;

    const bookMatches = (b) => (filterType === 'all' ? true : (filterType === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    // 云端词书：包括 Worker/GitHub 云端词书以及从云端下载到本地持久化的词书（过滤掉 GaoKao3500 重复项）
    const cloudBooks = allBooks.filter(b => (b.isCloud || !String(b.id).startsWith('custom_')) && b.id !== 'GaoKao3500' && bookMatches(b));
    // 本地词书：用户自主导入的本地词书
    const localCustomBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_') && bookMatches(b));

    if (cloudBooks.length === 0 && localCustomBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:36px; opacity:0.5;">menu_book</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${filterType === 'shici' ? '实词' : '英语'}词书</p>
                    </div>
                `;
        return;
    }

    let html = '<div class="book-tree-container">';

    // 1. 云端词书分类 (按 category 分组展示：Doris、考纲、其他等，默认收起)
    if (cloudBooks.length > 0) {
        const categories = {};
        cloudBooks.forEach(b => {
            const cat = b.category || '云端精选';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(b);
        });
        const catNames = Object.keys(categories);
        if (catNames.length > 1) {
            catNames.forEach(cat => {
                const booksInCat = categories[cat];
                const folderKey = `${containerId}_cloud_${cat}`;
                const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
                const catSelectedCount = booksInCat.filter(b => isBookIdSelected(selectedIds, b.id)).length;
                const safeCatId = encodeURIComponent(cat).replace(/%/g, '_');
                html += `
                        <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-cloud-${safeCatId}">
                            <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-cloud-${safeCatId}', '${folderKey}')">
                                <div class="tree-folder-left">
                                    <span class="material-symbols-rounded tree-folder-icon">cloud</span>
                                    <span class="tree-folder-name">${escapeHtml(cat)}</span>
                                    <span class="tree-folder-badge">${catSelectedCount}/${booksInCat.length} 本</span>
                                </div>
                                <div class="tree-folder-right">
                                    <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                                </div>
                            </div>
                            <div class="tree-folder-body">
                                ${booksInCat.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                            </div>
                        </div>
                        `;
            });
        } else {
            const defaultCollapsed = (localCustomBooks.length > 0);
            const isCollapsed = folderTreeCollapseMap[`${containerId}_cloud`] !== undefined
                ? folderTreeCollapseMap[`${containerId}_cloud`]
                : defaultCollapsed;
            const cloudSelectedCount = cloudBooks.filter(b => isBookIdSelected(selectedIds, b.id)).length;

            html += `
                    <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-cloud">
                        <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-cloud', '${containerId}_cloud')">
                            <div class="tree-folder-left">
                                <span class="material-symbols-rounded tree-folder-icon">cloud</span>
                                <span class="tree-folder-name">云端词书</span>
                                <span class="tree-folder-badge">${cloudSelectedCount}/${cloudBooks.length} 本</span>
                            </div>
                            <div class="tree-folder-right">
                                <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                            </div>
                        </div>
                        <div class="tree-folder-body">
                            ${cloudBooks.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                        </div>
                    </div>
                    `;
        }
    }

    // 2. 自建文件夹分类 (默认收起)
    localFolders.forEach(folder => {
        const booksInFolder = localCustomBooks.filter(b => b.folderId === folder.id);
        if (booksInFolder.length === 0) return;
        const folderKey = `${containerId}_folder_${folder.id}`;
        const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
        const folderSelectedCount = booksInFolder.filter(b => isBookIdSelected(selectedIds, b.id)).length;

        html += `
                <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-${folder.id}">
                    <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-${folder.id}', '${folderKey}')">
                        <div class="tree-folder-left">
                            <span class="material-symbols-rounded tree-folder-icon">folder</span>
                            <span class="tree-folder-name">${escapeHtml(folder.name)}</span>
                            <span class="tree-folder-badge">${folderSelectedCount}/${booksInFolder.length} 本</span>
                        </div>
                        <div class="tree-folder-right">
                            <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                        </div>
                    </div>
                    <div class="tree-folder-body">
                        ${booksInFolder.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                    </div>
                </div>
                `;
    });

    // 3. 未归类本地词书分类 (统一样式：带折叠箭头与复选框条目)
    const uncatBooks = localCustomBooks.filter(b => !b.folderId || !localFolders.some(f => f.id === b.folderId));
    if (uncatBooks.length > 0) {
        const folderKey = `${containerId}_uncat`;
        const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
        const uncatSelectedCount = uncatBooks.filter(b => isBookIdSelected(selectedIds, b.id)).length;

        html += `
                <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-uncat">
                    <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-uncat', '${folderKey}')">
                        <div class="tree-folder-left">
                            <span class="material-symbols-rounded tree-folder-icon" style="color:var(--md-sys-color-secondary);">folder_open</span>
                            <span class="tree-folder-name">未归类</span>
                            <span class="tree-folder-badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-on-surface);">${uncatSelectedCount}/${uncatBooks.length} 本</span>
                        </div>
                        <div class="tree-folder-right">
                            <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                        </div>
                    </div>
                    <div class="tree-folder-body">
                        ${uncatBooks.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                    </div>
                </div>
                `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly = false) {
    const isSel = isBookIdSelected(selectedIds, b.id);
    const displayName = escapeHtml(cleanBookName(b.rawName || b.name));
    const clickHandler = isReadOnly ? '' : `onclick="${onToggleFn}('${b.id}')"`;
    const cursorStyle = isReadOnly ? 'cursor:default;' : '';

    const prog = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
        ? EbbinghausEngine.getBookProgress(b.id, b.words)
        : { total: b.count || 0, learned: 0, due: 0, mastered: 0, progressPercent: 0 };

    const countText = prog.total ? `共${prog.total}词` : (b.count ? `共${b.count}词` : '多词');

    return `
            <div class="tree-book-item ${isSel ? 'selected' : ''}" ${clickHandler} style="${cursorStyle}">
                <div class="tree-book-info" style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <span class="tree-book-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</span>
                        <span class="tree-book-count" style="flex-shrink:0;">${countText}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-top:5px;">
                        <div class="book-progress-mini" style="flex:1; height:4px;">
                            <div class="book-progress-mini-fill" style="width:${prog.progressPercent}%;"></div>
                        </div>
                        <span style="font-size:0.72rem; font-weight:700; color:var(--md-sys-color-primary); flex-shrink:0;">${prog.progressPercent}%</span>
                        ${prog.due > 0 ? `<span style="font-size:0.68rem; font-weight:700; background:var(--md-sys-color-primary-container, #e0f2fe); color:var(--md-sys-color-primary, #0284c7); border:1px solid rgba(2, 132, 199, 0.2); padding:1px 6px; border-radius:9999px; flex-shrink:0;">待复习: ${prog.due}</span>` : ''}
                    </div>
                </div>
                <div class="tree-book-check" style="margin-left:8px; flex-shrink:0;">
                    ${isSel ? '<span class="material-symbols-rounded" style="font-size:16px; color:white;">check</span>' : ''}
                </div>
            </div>
        `;
}

function toggleTreeFolderCollapse(elemId, folderKey) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const isCollapsed = el.classList.toggle('collapsed');
    folderTreeCollapseMap[folderKey] = isCollapsed;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
