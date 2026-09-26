/**
 * MD3 系统设置、数据备份与更新日志
 * Module: assets/js/views/settings.js
 */

/* ==========================================================================
   12. MD3 系统设置与子页面管理
   ========================================================================== */
function handleNavClick(dest) {
    if (dest === 'settings') {
        switchView('view-settings');
    } else if (dest === 'me') {
        switchView('view-me');
        openMeSubview('main');
    } else {
        switchView('view-hub');
    }
}

function openMeSubview(subviewKey) {
    const viewMe = document.getElementById('view-me');
    if (viewMe && !viewMe.classList.contains('active')) {
        switchView('view-me');
    }
    const performSwitch = () => {
        const meSubviews = ['main', 'books', 'words', 'mastered', 'trash'];
        meSubviews.forEach(k => {
            const el = (k === 'main')
                ? document.getElementById('me-subview-main')
                : document.getElementById(`settings-subview-${k}`);
            if (el) {
                if (k === subviewKey) el.classList.add('active');
                else el.classList.remove('active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    if (document.startViewTransition) {
        try {
            const transition = document.startViewTransition(performSwitch);
            if (transition) {
                if (transition.ready && typeof transition.ready.catch === 'function') transition.ready.catch(() => { });
                if (transition.finished && typeof transition.finished.catch === 'function') transition.finished.catch(() => { });
                if (transition.updateCallbackDone && typeof transition.updateCallbackDone.catch === 'function') transition.updateCallbackDone.catch(() => { });
            }
        } catch (e) {
            performSwitch();
        }
    } else {
        performSwitch();
    }

    if (subviewKey === 'main') {
        renderMeView();
    } else if (subviewKey === 'books') {
        renderManageLocalBooksInSettings();
    } else if (subviewKey === 'mastered') {
        renderMasteredWordsInSettings();
    } else if (subviewKey === 'trash') {
        renderTrashWordsInSettings();
    }
}

function updateNavActive(current) {
    ['home', 'me', 'settings'].forEach(key => {
        const railEl = document.getElementById(`nav-rail-${key}`);
        const botEl = document.getElementById(`bottom-nav-${key}`);
        if (railEl) {
            if (key === current) railEl.classList.add('active');
            else railEl.classList.remove('active');
        }
        if (botEl) {
            if (key === current) botEl.classList.add('active');
            else botEl.classList.remove('active');
        }
    });
}

function setPageMaxWidth(width) {
    const allowed = ['720px', '960px', '1200px', '100%'];
    const val = allowed.includes(width) ? width : '960px';
    document.documentElement.style.setProperty('--container-max-width', val);
    localStorage.setItem('app_max_width', val);
    document.querySelectorAll('#chips-page-width .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-width') === val);
    });
}

function setAppZoom(zoom) {
    const allowed = ['0.9', '1', '1.1', '1.2'];
    const val = allowed.includes(zoom) ? zoom : '1';
    document.documentElement.style.setProperty('--app-zoom', val);
    document.body.style.zoom = val;
    localStorage.setItem('app_zoom', val);
    document.querySelectorAll('#chips-app-zoom .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-zoom') === val);
    });
}

function initDisplaySettings() {
    const savedWidth = localStorage.getItem('app_max_width') || '960px';
    document.documentElement.style.setProperty('--container-max-width', savedWidth);

    const savedZoom = localStorage.getItem('app_zoom') || '1';
    document.documentElement.style.setProperty('--app-zoom', savedZoom);
    document.body.style.zoom = savedZoom;
}

function switchSettingsSubview(subviewKey) {
    const meSubviews = ['books', 'words', 'mastered', 'trash'];
    if (meSubviews.includes(subviewKey)) {
        openMeSubview(subviewKey);
        return;
    }

    const performSubviewSwitch = () => {
        const subviews = ['main', 'changelog'];
        subviews.forEach(k => {
            const el = document.getElementById(`settings-subview-${k}`);
            if (el) {
                if (k === subviewKey) el.classList.add('active');
                else el.classList.remove('active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    if (document.startViewTransition) {
        try {
            const transition = document.startViewTransition(performSubviewSwitch);
            if (transition) {
                if (transition.ready && typeof transition.ready.catch === 'function') transition.ready.catch(() => { });
                if (transition.finished && typeof transition.finished.catch === 'function') transition.finished.catch(() => { });
                if (transition.updateCallbackDone && typeof transition.updateCallbackDone.catch === 'function') transition.updateCallbackDone.catch(() => { });
            }
        } catch (e) {
            performSubviewSwitch();
        }
    } else {
        performSubviewSwitch();
    }

    if (subviewKey === 'main') {
        renderSettingsMain();
    } else if (subviewKey === 'changelog') {
        renderChangelogInSettings();
    }
}

function renderSettingsMain() {
    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    const verLabel = document.getElementById('settings-version-label');
    if (verLabel) verLabel.innerText = `v${APP_VERSION}`;
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%  |  错题数：${Object.keys(userStats.mistakes || {}).length} 词`;
    }

    if (typeof updatePronunciationSettingsChips === 'function') {
        updatePronunciationSettingsChips();
    }

    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const webRow = document.getElementById('settings-online-web-row');
    const githubRow = document.querySelector('a[href*="github.com"]');
    const webBadge = document.getElementById('settings-online-badge');
    const webTip = document.getElementById('settings-online-tip');
    
    if (githubRow) githubRow.style.display = 'flex';

    if (isBilibiliToy) {
        // 在 B 站端隐藏外部网页版入口
        if (webRow) webRow.style.display = 'none';
    } else {
        // 在个人站与离线端正常显示全部功能
        if (webRow) {
            webRow.style.display = 'flex';
            if (isLocal) {
                webRow.href = 'https://www.bilibili.com/toy/cyr/index.html';
                if (webTip) webTip.innerText = '当前为本地环境，点击访问在线网页版';
            } else {
                webRow.href = getGithubAssetUrl('https://github.com/chenyurong0806/Recite-words/releases');
                const h4 = webRow.querySelector('h4');
                if (h4) h4.innerText = '下载离线版本';
                if (webTip) webTip.innerText = '下载 Windows / 离线单文件运行包，离线背单词';
            }
        }
    }

    const quickUsersList = document.getElementById('settings-quick-users-list');
    if (quickUsersList) {
        quickUsersList.innerHTML = allUsersList.map(u => {
            const isCur = u === currentUser;
            return `
                    <div class="md3-chip ${isCur ? 'selected' : ''}" onclick="switchAccount('${escapeHtml(u)}')">
                        <span class="material-symbols-rounded" style="font-size:16px; margin-right:4px;">${isCur ? 'check' : 'person'}</span>
                        <span>${escapeHtml(u)}</span>
                    </div>
                `;
        }).join('');
    }

    const savedWidth = localStorage.getItem('app_max_width') || '960px';
    document.querySelectorAll('#chips-page-width .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-width') === savedWidth);
    });

    const savedZoom = localStorage.getItem('app_zoom') || '1';
    document.querySelectorAll('#chips-app-zoom .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-zoom') === savedZoom);
    });

    const kbEnabled = localStorage.getItem('dictation_virtual_keyboard_enabled') !== 'false';
    document.querySelectorAll('#chips-settings-dictation-kb .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-kb') === String(kbEnabled));
    });

    const summaryEl = document.getElementById('settings-books-summary-text');
    if (summaryEl) {
        const customCount = (window.customBooks || []).length;
        const folderCount = (localFolders || []).length;
        summaryEl.innerText = `已创建 ${folderCount} 个文件夹，${customCount} 个本地词书`;
    }

    const masteredSummaryEl = document.getElementById('settings-mastered-summary-text');
    if (masteredSummaryEl) {
        const mCount = getMasteredWords().length;
        masteredSummaryEl.innerText = `已标注 ${mCount} 个熟词（练习与对战中不再抽取）`;
    }

    const trashSummaryEl = document.getElementById('settings-trash-summary-text');
    if (trashSummaryEl) {
        const tCount = getTrashWords().length;
        trashSummaryEl.innerText = `共 ${tCount} 个已删词汇`;
    }

    initToyFeedbackSection();
}

let toyAuthorMid = '1569750390';
let toyAuthorProfile = null;
let isToyAuthorFollowed = false;
async function initToyFeedbackSection() {
    // 静态展现作者信息，绝不发起任何需要用户登录态或触发强制授权弹窗的接口请求
    const nameEl = document.getElementById('toy-author-name');
    const descEl = document.getElementById('toy-author-desc');
    if (nameEl) nameEl.innerText = '支持一下';
    if (descEl) descEl.innerText = '关注作者 B 站账号';
}

async function handleToyFollowAuthor() {
    if (window.toy && typeof window.toy.navigate === 'function') {
        try {
            const targetId = toyAuthorMid || (toyAuthorProfile && toyAuthorProfile.mid ? String(toyAuthorProfile.mid) : '1569750390');
            await window.toy.navigate({
                type: 'space',
                id: String(targetId)
            });
            return;
        } catch (e) {
            console.warn('[Toy] navigate to space failed:', e);
        }
    }
    window.open(`https://space.bilibili.com/${toyAuthorMid || '1569750390'}`, '_blank');
}

function switchAccount(name) {
    if (!name || name === currentUser) return;
    const oldUser = currentUser;
    if (typeof recordSwitchedAccount === 'function') {
        recordSwitchedAccount(oldUser);
    }
    if (globalLobbyChannel) {
        try {
            globalLobbyChannel.untrack();
            if (sbClient) sbClient.removeChannel(globalLobbyChannel);
        } catch (e) { }
        globalLobbyChannel = null;
    }
    loadUserData(name);
    renderSettingsMain();
    renderMeView();
    updateHub();
    if (typeof initGlobalPresence === 'function') {
        initGlobalPresence();
    }
    showToast(`已切换至账号 ${name} `);
}

function createAndSwitchAccount() {
    const input = document.getElementById('settings-new-user-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return showToast('请输入有效的账号名称');
    if (allUsersList.includes(name)) {
        switchAccount(name);
        input.value = '';
        return;
    }
    const oldUser = currentUser;
    if (typeof recordSwitchedAccount === 'function') {
        recordSwitchedAccount(oldUser);
    }
    if (globalLobbyChannel) {
        try {
            globalLobbyChannel.untrack();
            if (sbClient) sbClient.removeChannel(globalLobbyChannel);
        } catch (e) { }
        globalLobbyChannel = null;
    }
    allUsersList.push(name);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    loadUserData(name);
    input.value = '';
    renderSettingsMain();
    renderMeView();
    updateHub();
    if (typeof initGlobalPresence === 'function') {
        initGlobalPresence();
    }
    showToast(`已新建并切换至账号【${name}】`);
}

function handleDeleteCurrentAccount() {
    if (!currentUser) return;
    const targetUser = currentUser;
    const isConfirmed = confirm(`确定要永久删除当前账号【${targetUser}】吗？\n\n警告：此操作不可撤销！该账号的所有学习统计、艾宾浩斯复习进度、错词记录及熟词数据将被彻底删除！`);
    if (!isConfirmed) return;

    const oldUser = currentUser;
    if (typeof recordSwitchedAccount === 'function') {
        recordSwitchedAccount(oldUser);
    }
    if (globalLobbyChannel) {
        try {
            globalLobbyChannel.untrack();
            if (sbClient) sbClient.removeChannel(globalLobbyChannel);
        } catch (e) { }
        globalLobbyChannel = null;
    }

    // 清除该用户在 localStorage 中的所有相关数据
    const userSuffix = `_${targetUser}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.endsWith(userSuffix) || key === `shici_config_${targetUser}` || key === `shici_progress_${targetUser}` || key === `vocab_review_filter_${targetUser}`)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 从用户列表中移除
    allUsersList = allUsersList.filter(u => u !== targetUser);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));

    if (allUsersList.length > 0) {
        const nextUser = allUsersList[0];
        loadUserData(nextUser);
        renderSettingsMain();
        renderMeView();
        updateHub();
        if (typeof initGlobalPresence === 'function') {
            initGlobalPresence();
        }
        showToast(`已删除账号【${targetUser}】，已自动切换至【${nextUser}】`);
    } else {
        currentUser = '';
        localStorage.removeItem('vocab_pk_user');
        switchView('view-auth');
        showToast(`已删除账号【${targetUser}】`);
    }
}

let settingsManageBooksCategory = 'english';

function switchManageBooksCategory(cat) {
    settingsManageBooksCategory = cat;
    const tabEn = document.getElementById('tab-manage-books-en');
    const tabShiCi = document.getElementById('tab-manage-books-shici');
    if (tabEn) tabEn.classList.toggle('active', cat === 'english');
    if (tabShiCi) tabShiCi.classList.toggle('active', cat === 'shici');
    renderManageLocalBooksInSettings();
}

let settingsFolderCollapseMap = {};

function toggleSettingsFolderCollapse(folderKey) {
    settingsFolderCollapseMap[folderKey] = !settingsFolderCollapseMap[folderKey];
    renderManageLocalBooksInSettings();
}

function renderManageLocalBooksInSettings() {
    const container = document.getElementById('settings-manage-books-list');
    if (!container) return;

    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0) ? BookManager.availableBooks : BookManager.fallbackBooks;
    const bookMatches = (b) => (settingsManageBooksCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b));
    const cloudBooks = allBooks.filter(b => (b.isCloud || !String(b.id).startsWith('custom_')) && b.id !== 'GaoKao3500' && bookMatches(b));
    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_') && bookMatches(b));

    if (cloudBooks.length === 0 && customBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem;">暂无${settingsManageBooksCategory === 'shici' ? '实词' : '英语'}词书</p>
                    </div>
                `;
        return;
    }

    let html = '';

    const isBookProgressActive = (b) => {
        const p = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
            ? EbbinghausEngine.getBookProgress(b.id, b.words)
            : null;
        const hasProgress = p && (p.learned > 0 || p.due > 0 || p.progressPercent > 0);
        const isSelected = (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds) && isBookIdSelected(singleSelectedBookIds, b.id));
        return hasProgress || isSelected;
    };

    // 1. 云端词书分类药丸（参考图三，点击展开呈现图四）
    if (cloudBooks.length > 0) {
        const categories = {};
        cloudBooks.forEach(b => {
            const cat = b.category || '精选';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(b);
        });

        Object.keys(categories).forEach(cat => {
            const booksInCat = categories[cat];
            const folderKey = `cat_${cat}`;
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = booksInCat.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#0284c7; font-size:22px;">cloud</span>
                            <strong style="font-size:1rem; color:#0f172a;">${escapeHtml(cat)}</strong>
                            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; font-weight:700;">${activeCount}/${booksInCat.length} 本</span>
                        </div>
                        <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${booksInCat.map(b => renderSettingsManageBookRow(b, true, cat)).join('')}
                        </div>
                        `;
            }
        });
    }

    // 2. 自建文件夹
    if (customBooks.length > 0 || localFolders.length > 0) {
        localFolders.forEach(folder => {
            const booksInFolder = customBooks.filter(b => b.folderId === folder.id);
            const folderKey = `folder_${folder.id}`;
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = booksInFolder.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#2563eb; font-size:22px;">folder</span>
                            <strong style="font-size:1rem; color:#0f172a;">${escapeHtml(folder.name)}</strong>
                            <span class="badge" style="background:#dbeafe; color:#1d4ed8; font-size:0.75rem; font-weight:700;">${activeCount}/${booksInFolder.length} 本</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="display:inline-flex; gap:6px;" onclick="event.stopPropagation();">
                                <button type="button" class="btn btn-outlined btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="promptRenameFolder('${folder.id}', '${escapeHtml(folder.name)}')">重命名</button>
                                <button type="button" class="btn btn-danger btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="confirmDeleteFolder('${folder.id}')">解散</button>
                            </div>
                            <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                        </div>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${booksInFolder.length === 0 ? `<div style="font-size:0.84rem; color:var(--md-sys-color-outline); padding:10px 4px;">该文件夹暂无词书</div>` : ''}
                            ${booksInFolder.map(b => renderSettingsManageBookRow(b, false)).join('')}
                        </div>
                        `;
            }
        });

        const uncatBooks = customBooks.filter(b => !b.folderId || !localFolders.some(f => f.id === b.folderId));
        if (uncatBooks.length > 0) {
            const folderKey = 'folder_uncat';
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = uncatBooks.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#475569; font-size:22px;">folder_open</span>
                            <strong style="font-size:1rem; color:#0f172a;">未归类</strong>
                            <span class="badge" style="background:#e2e8f0; color:#334155; font-size:0.75rem; font-weight:700;">${activeCount}/${uncatBooks.length} 本</span>
                        </div>
                        <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${uncatBooks.map(b => renderSettingsManageBookRow(b, false)).join('')}
                        </div>
                        `;
            }
        }
    }

    container.innerHTML = html;
}

function renderSettingsManageBookRow(b, isCloud = false, categoryName = '') {
    const displayName = escapeHtml(cleanBookName(b.rawName || b.name));
    const prog = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
        ? EbbinghausEngine.getBookProgress(b.id, b.words)
        : { total: b.count || 0, learned: 0, due: 0, mastered: 0, progressPercent: 0 };
    const totalWords = prog.total || b.count || (b.words ? b.words.length : 0);
    const tag = isCloud ? (categoryName || b.category || '精选') : '本地';

    return `
            <div class="settings-book-item-card" style="background:#ffffff; border:1px solid #e8edf2; border-radius:16px; padding:16px 20px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div class="settings-book-item-main" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div class="settings-book-item-info" style="flex:1; min-width:0;">
                        <div class="settings-book-item-title-row" style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                            <span class="settings-book-item-name" style="font-weight:700; font-size:1.05rem; color:#0f172a;">
                                <span class="material-symbols-rounded" style="font-size:18px; color:#0284c7; vertical-align:middle; margin-right:4px;">${isCloud ? 'cloud' : 'folder'}</span>
                                ${displayName}
                            </span>
                            <span class="settings-book-item-tag" style="background:#f1f5f9; color:#475569; font-size:0.78rem; padding:2px 8px; border-radius:9999px; font-weight:600;">${escapeHtml(tag)}</span>
                        </div>
                        <div class="settings-book-item-sub" style="font-size:0.86rem; color:#64748b;">
                            共 ${totalWords} 词 | 已学 ${prog.learned} 词 | 待复习 ${prog.due} 词
                        </div>
                    </div>
                    <div class="settings-book-item-actions" style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                        <button type="button" class="settings-book-item-btn" style="border:1px solid #e2e8f0; background:#ffffff; border-radius:9999px; padding:6px 14px; font-size:0.85rem; font-weight:600; color:#1e293b; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="viewBookWordsInSettings('${b.id}')">
                            <span class="material-symbols-rounded" style="font-size:17px; color:#334155;">visibility</span>
                            <span>查看内容</span>
                        </button>
                        <button type="button" class="settings-book-item-btn" style="border:1px solid #e2e8f0; background:#ffffff; border-radius:9999px; padding:6px 14px; font-size:0.85rem; font-weight:600; color:#1e293b; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="confirmResetBookProgress('${b.id}', '${displayName}')" title="重学该词书">
                            <span class="material-symbols-rounded" style="font-size:17px; color:#ea580c;">refresh</span>
                            <span>重学</span>
                        </button>
                        ${!isCloud ? `
                        <button type="button" class="btn btn-danger btn-sm" style="width:34px; height:34px; padding:0; border-radius:9999px;" onclick="confirmDeleteCustomBook('${b.id}', '${displayName}')" title="删除词书">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 14px; margin-top: 12px;">
                    <div class="book-progress-mini" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin: 0;">
                        <div class="book-progress-mini-fill" style="width: ${prog.progressPercent}%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 9999px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="font-size: 0.92rem; font-weight: 800; color: #0284c7; min-width: 36px; text-align: right; flex-shrink: 0;">
                        ${prog.progressPercent}%
                    </div>
                </div>
            </div>
            `;
}

async function confirmResetBookProgress(bookId, bookName) {
    if (!currentUser) return;
    if (!confirm(`确定要重置词书“${bookName}”的学习进度吗？\n\n重置后，该词书的所有复习记录与相关熟词标记将被清空，恢复为全新未学状态。`)) {
        return;
    }
    await EbbinghausEngine.resetBookProgress(bookId);
    showToast(`已重置词书“${bookName}”的学习进度`);
    renderManageLocalBooksInSettings();
}

function exportUserConfigAndProgress() {
    if (!currentUser) return showToast('请先登录后再导出备份');
    try {
        const backupObj = {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.2.5',
            exportedAt: new Date().toISOString(),
            user: currentUser,
            data: {
                ebbinghaus: localStorage.getItem(`vocab_ebbinghaus_db_${currentUser}`),
                mastered: localStorage.getItem(`vocab_mastered_words_${currentUser}`),
                dailyLogs: localStorage.getItem(`vocab_daily_logs_${currentUser}`),
                userStats: localStorage.getItem(`user_stats_${currentUser}`),
                singleSelectedBooks: localStorage.getItem(`vocab_single_selected_books_${currentUser}`),
                singleConfig: localStorage.getItem('vocab_single_config'),
                dictationConfig: localStorage.getItem('vocab_dictation_config'),
                riddleHistory: localStorage.getItem(`vocab_riddle_daily_history_${currentUser}`)
            }
        };

        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentUser}的学习记录 ${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('已导出备份文件！');
    } catch (err) {
        alert('导出备份失败：' + err.message);
    }
}

function importUserConfigAndProgress(event) {
    if (!currentUser) return showToast('请先登录后再导入备份');
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed || !parsed.data) {
                throw new Error('备份文件格式不符合要求');
            }

            if (!confirm(`确定要恢复备份文件吗？\n导出时间: ${parsed.exportedAt || '未知'}\n用户名: ${parsed.user || '未知'}\n当前用户的复习进度与配置将被覆盖。`)) {
                event.target.value = '';
                return;
            }

            const d = parsed.data;
            if (d.ebbinghaus !== undefined && d.ebbinghaus !== null) {
                localStorage.setItem(`vocab_ebbinghaus_db_${currentUser}`, d.ebbinghaus);
            }
            if (d.mastered !== undefined && d.mastered !== null) {
                localStorage.setItem(`vocab_mastered_words_${currentUser}`, d.mastered);
            }
            if (d.dailyLogs !== undefined && d.dailyLogs !== null) {
                localStorage.setItem(`vocab_daily_logs_${currentUser}`, d.dailyLogs);
            }
            if (d.userStats !== undefined && d.userStats !== null) {
                localStorage.setItem(`user_stats_${currentUser}`, d.userStats);
            }
            if (d.singleSelectedBooks !== undefined && d.singleSelectedBooks !== null) {
                localStorage.setItem(`vocab_single_selected_books_${currentUser}`, d.singleSelectedBooks);
            }
            if (d.singleConfig) {
                localStorage.setItem('vocab_single_config', d.singleConfig);
            }
            if (d.dictationConfig) {
                localStorage.setItem('vocab_dictation_config', d.dictationConfig);
            }
            if (d.riddleHistory) {
                localStorage.setItem(`vocab_riddle_daily_history_${currentUser}`, d.riddleHistory);
            }

            showToast('备份数据恢复成功！正在刷新应用...');
            setTimeout(() => location.reload(), 600);
        } catch (err) {
            alert('导入备份失败：' + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function promptCreateFolder() {
    const name = prompt('请输入新文件夹名称：');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    if (localFolders.some(f => f.name === cleanName)) {
        showToast('该文件夹名称已存在');
        return;
    }
    const newFolder = { id: 'folder_' + Date.now(), name: cleanName, createdAt: Date.now() };
    localFolders.push(newFolder);
    await VocabOfflineDB.saveFolder(newFolder);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast(`已创建文件夹【${cleanName}】`);
}

async function promptRenameFolder(folderId, oldName) {
    const name = prompt('修改文件夹名称：', oldName);
    if (!name || !name.trim() || name.trim() === oldName) return;
    const folder = localFolders.find(f => f.id === folderId);
    if (folder) {
        folder.name = name.trim();
        await VocabOfflineDB.saveFolder(folder);
        renderManageLocalBooksInSettings();
        renderSingleBookList();
        showToast('文件夹名称已更新');
    }
}

async function confirmDeleteFolder(folderId) {
    if (!confirm('确定删除此文件夹吗？')) return;
    if (window.customBooks) {
        for (const b of window.customBooks) {
            if (b.folderId === folderId) {
                b.folderId = null;
                await VocabOfflineDB.saveBook(b);
            }
        }
    }
    localFolders = localFolders.filter(f => f.id !== folderId);
    await VocabOfflineDB.deleteFolder(folderId);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast('文件夹已删除');
}

async function changeBookFolder(bookId, targetFolderId) {
    const book = (window.customBooks || []).find(b => b.id === bookId);
    if (!book) return;
    book.folderId = targetFolderId || null;
    await VocabOfflineDB.saveBook(book);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast('更改成功');
}

async function confirmDeleteCustomBook(bookId, bookName) {
    if (!confirm(`确定删除本地词书【${bookName}】吗？`)) return;
    if (window.customBooks) {
        window.customBooks = window.customBooks.filter(b => b.id !== bookId);
    }
    delete BookManager.bookCache[bookId];
    BookManager.availableBooks = BookManager.availableBooks.filter(b => b.id !== bookId);
    singleSelectedBookIds = (singleSelectedBookIds || []).filter(id => id !== bookId);
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    await VocabOfflineDB.deleteBook(bookId);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    renderRoomBookChips();
    renderLocalDuelBookChips();
    renderAiDuelBookChips();
    showToast(`已删除本地词书【${bookName}】`);
}

async function syncLocalBooksWithCloud(notify = false) {
    if (!navigator.onLine) {
        if (notify) showToast('当前处于离线状态，词书已保存在本地');
        return;
    }
    try {
        const customBooks = window.customBooks || [];
        if (notify) {
            showToast(`${customBooks.length} 本词书已完成同步！`);
        }
    } catch (e) {
        if (notify) showToast('同步完成');
    }
}

let settingsViewingBookId = null;
let settingsViewingBookWords = [];
let settingsViewingCurrentWordsList = [];
let settingsViewingWordsExpanded = false;
let settingsViewingExpandedShiCiWords = new Set();

async function viewBookWordsInSettings(bookId) {
    const book = (window.customBooks || []).find(b => b.id === bookId) ||
        BookManager.availableBooks.find(b => b.id === bookId) ||
        BookManager.fallbackBooks.find(b => b.id === bookId);
    if (!book) return;

    settingsViewingBookId = bookId;
    settingsViewingWordsExpanded = false;
    settingsViewingExpandedShiCiWords = new Set();

    let words = [];
    if (isShiCiBook(book)) {
        words = await ShiCiManager.loadBooks([bookId]);
        if (words && words.length > 0) {
            settingsViewingExpandedShiCiWords.add(words[0].word);
        }
    } else {
        words = await BookManager.loadBookData(bookId);
    }
    settingsViewingBookWords = words || [];
    settingsViewingCurrentWordsList = settingsViewingBookWords;

    const titleEl = document.getElementById('settings-view-book-title');
    const countEl = document.getElementById('settings-view-book-count');
    const searchEl = document.getElementById('settings-view-book-search');

    if (titleEl) titleEl.innerText = book.rawName || book.name;
    if (countEl) countEl.innerText = `共 ${settingsViewingBookWords.length} 词`;
    if (searchEl) searchEl.value = '';

    renderSettingsViewingWordsList(settingsViewingBookWords);
    const addWordBtn = document.getElementById('btn-settings-add-word');
    if (addWordBtn) {
        const isCustom = String(bookId).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === bookId));
        addWordBtn.style.display = isCustom ? 'inline-flex' : 'none';
    }
    switchSettingsSubview('words');
}

function toggleShiCiWordCard(word) {
    if (settingsViewingExpandedShiCiWords.has(word)) {
        settingsViewingExpandedShiCiWords.delete(word);
    } else {
        settingsViewingExpandedShiCiWords.add(word);
    }
    const safeWordId = encodeURIComponent(word).replace(/%/g, '_');
    const card = document.getElementById(`shici-word-card-${safeWordId}`);
    if (card) {
        const isExp = settingsViewingExpandedShiCiWords.has(word);
        card.classList.toggle('expanded', isExp);
        updateShiCiExpandAllButton();
    } else {
        const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
        if (query) filterSettingsBookWordsDisplay();
        else renderSettingsViewingWordsList(settingsViewingBookWords);
    }
}

function toggleAllShiCiWordCards(expand) {
    const currentList = settingsViewingCurrentWordsList && settingsViewingCurrentWordsList.length > 0
        ? settingsViewingCurrentWordsList
        : settingsViewingBookWords;
    if (expand) {
        currentList.forEach(w => {
            if (w && w.word) settingsViewingExpandedShiCiWords.add(w.word);
        });
    } else {
        settingsViewingExpandedShiCiWords.clear();
    }
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) filterSettingsBookWordsDisplay();
    else renderSettingsViewingWordsList(settingsViewingBookWords);
}

function updateShiCiExpandAllButton() {
    const btn = document.getElementById('btn-shici-toggle-all-cards');
    if (!btn) return;
    const currentList = settingsViewingCurrentWordsList && settingsViewingCurrentWordsList.length > 0
        ? settingsViewingCurrentWordsList
        : settingsViewingBookWords;
    const anyExpanded = currentList.some(w => w && settingsViewingExpandedShiCiWords.has(w.word));
    btn.setAttribute('onclick', `toggleAllShiCiWordCards(${!anyExpanded})`);
    const icon = btn.querySelector('.material-symbols-rounded');
    const text = btn.querySelector('.btn-label-text');
    if (icon) icon.innerText = anyExpanded ? 'unfold_less' : 'unfold_more';
    if (text) text.innerText = anyExpanded ? '收起详情' : '全部展开';
}

function filterSettingsBookWordsDisplay() {
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim().toLowerCase();
    if (!query) {
        renderSettingsViewingWordsList(settingsViewingBookWords);
        return;
    }
    const filtered = settingsViewingBookWords.filter(w => {
        const wordMatch = (w.word || '').toLowerCase().includes(query);
        const pinyinMatch = (w.pinyin || '').toLowerCase().includes(query);
        let meaningStr = '';
        if (w.senses && Array.isArray(w.senses)) {
            meaningStr = w.senses.map(s => (s.meaning || '') + ' ' + (s.examples || []).map(e => (e.sentence || '') + ' ' + (e.source || '')).join(' ')).join(' ');
        } else {
            meaningStr = w.meanings ? w.meanings.map(m => m.meaning).join(' ') : (w.meaning || '');
        }
        const meaningMatch = meaningStr.toLowerCase().includes(query);
        return wordMatch || pinyinMatch || meaningMatch;
    });
    filtered.forEach(w => {
        if (w && w.word) settingsViewingExpandedShiCiWords.add(w.word);
    });
    renderSettingsViewingWordsList(filtered);
}

function expandSettingsViewingWords() {
    settingsViewingWordsExpanded = true;
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) {
        filterSettingsBookWordsDisplay();
    } else {
        renderSettingsViewingWordsList(settingsViewingBookWords);
    }
}

function handleToggleMasteredInWordList(word, phone, meaning, type = 'word') {
    const nowMastered = toggleMasteredWord(word, phone, meaning, type);
    if (type === 'shici' && typeof ShiCiEbbinghausEngine !== 'undefined') {
        if (nowMastered) {
            ShiCiEbbinghausEngine.recordWord(word, meaning, phone, true, true);
        } else {
            ShiCiEbbinghausEngine.unmarkMastered(word);
        }
        ShiCiEbbinghausEngine.updateDueBadge();
    }
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) filterSettingsBookWordsDisplay();
    else renderSettingsViewingWordsList(settingsViewingBookWords);
}

async function handleDeleteWordFromBookList(word) {
    if (!confirm(`确定将词汇【${word}】从当前词书移除并移入回收站吗？可在回收站中随时恢复。`)) return;
    const ok = await deleteWordFromCustomBook(word, settingsViewingBookId);
    if (ok) {
        settingsViewingBookWords = settingsViewingBookWords.filter(w => (w.word || '').toLowerCase() !== word.toLowerCase());
        const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
        if (query) filterSettingsBookWordsDisplay();
        else renderSettingsViewingWordsList(settingsViewingBookWords);
        renderManageLocalBooksInSettings();
    }
}

function renderSettingsViewingWordsList(words) {
    const container = document.getElementById('settings-view-book-words-container');
    const countEl = document.getElementById('settings-view-book-count');
    if (!container) return;

    settingsViewingCurrentWordsList = words || [];
    const isLocalCustomBook = settingsViewingBookId && String(settingsViewingBookId).startsWith('custom_');
    const book = (window.customBooks || []).find(b => b.id === settingsViewingBookId) ||
        BookManager.availableBooks.find(b => b.id === settingsViewingBookId) ||
        BookManager.fallbackBooks.find(b => b.id === settingsViewingBookId);

    const isShiCi = isShiCiBook(book) || (words.length > 0 && Array.isArray(words[0].senses));

    const totalCount = settingsViewingBookWords.length;
    const currentMatchCount = words.length;

    if (countEl) {
        countEl.innerText = `显示 ${Math.min(settingsViewingWordsExpanded ? currentMatchCount : 200, currentMatchCount)} / ${totalCount} 词`;
    }

    if (words.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的词汇</div>`;
        return;
    }

    // 实词词书专属展示：自适应单列卡片手风琴（一行只显示一个字）
    if (isShiCi) {
        const displayedWords = settingsViewingWordsExpanded ? words : words.slice(0, 200);
        const anyExpanded = displayedWords.some(w => settingsViewingExpandedShiCiWords.has(w.word));

        const cardsHtml = displayedWords.map((w, idx) => {
            const isMastered = typeof ShiCiEbbinghausEngine !== 'undefined'
                ? ShiCiEbbinghausEngine.isWordMastered(w.word)
                : isWordMastered(w.word);
            const isExpanded = settingsViewingExpandedShiCiWords.has(w.word);
            const sensesList = w.senses || [];
            const safeWordId = encodeURIComponent(w.word).replace(/%/g, '_');

            return `
                    <div class="shici-word-card ${isExpanded ? 'expanded' : ''}" id="shici-word-card-${safeWordId}">
                        <div class="shici-card-header" onclick="toggleShiCiWordCard('${escapeHtml(w.word)}')">
                            <div class="shici-card-header-left">
                                <span class="shici-card-char-name">【${escapeHtml(w.word)}】</span>
                                <span class="shici-card-char-pinyin">${escapeHtml(w.pinyin || '')}</span>
                                <span class="shici-card-senses-badge">${sensesList.length} 个义项</span>
                            </div>
                            <div class="shici-card-header-right">
                                <button type="button" class="btn btn-sm ${isMastered ? 'btn-filled' : 'btn-outlined'}"
                                    style="${isMastered ? 'background:var(--md-sys-color-success); color:#fff; border-color:transparent;' : ''}"
                                    onclick="event.stopPropagation(); handleToggleMasteredInWordList('${escapeHtml(w.word)}', '${escapeHtml(w.pinyin || '')}', '', 'shici')">
                                    <span class="material-symbols-rounded" style="font-size:16px;">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                                    <span>${isMastered ? '已掌握' : '标记熟词'}</span>
                                </button>
                                ${isLocalCustomBook ? `
                                <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); handleDeleteWordFromBookList('${escapeHtml(w.word)}')">
                                    <span class="material-symbols-rounded">delete</span>
                                </button>
                                ` : ''}
                                <span class="material-symbols-rounded shici-card-chevron">expand_more</span>
                            </div>
                        </div>
                        <div class="shici-card-body">
                            ${sensesList.map((s, sIdx) => {
                const cleanMeaning = (s.meaning || '').replace(/★/g, '').trim();
                const isStar = (s.meaning || '').includes('★');
                const examples = s.examples || [];
                return `
                                <div class="shici-sense-card-item">
                                    <div class="shici-sense-meta-box">
                                        <div class="shici-sense-meta-header">
                                            <span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-weight:700; border-radius:6px; padding:2px 8px; font-size:0.8rem;">${escapeHtml(s.part_of_speech || '实词')}</span>
                                            <strong style="font-size:0.98rem; font-weight:700; color:var(--md-sys-color-on-surface); line-height:1.4;">${escapeHtml(cleanMeaning)}</strong>
                                            ${isStar ? '<span class="badge" style="background:#FFF3E0; color:#E65100; font-weight:700; border:1px solid #FFE0B2; font-size:0.75rem;">★ 核心考点</span>' : ''}
                                        </div>
                                        <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-weight:600;">义项 #${sIdx + 1}</span>
                                    </div>
                                    <div class="shici-sense-examples-box">
                                        ${examples.length > 0 ? examples.map(ex => {
                    let highSent = escapeHtml(ex.sentence || '');
                    if (w.word && ex.sentence && ex.sentence.includes(w.word)) {
                        const reg = new RegExp(escapeRegex(w.word), 'g');
                        highSent = escapeHtml(ex.sentence).replace(reg, `<strong style="color:var(--md-sys-color-primary); font-weight:800;">${escapeHtml(w.word)}</strong>`);
                    }
                    return `
                                                <div class="shici-sense-example-line">
                                                    <span>${highSent}</span>
                                                    <span class="shici-sense-example-source">${escapeHtml(ex.source || '')}</span>
                                                    ${ex.annotation ? `<div style="font-size:0.82rem; color:var(--md-sys-color-on-surface-variant); margin-top:3px;">💡 译文释义：${escapeHtml(ex.annotation)}</div>` : ''}
                                                </div>
                                            `;
                }).join('') : '<div style="font-size:0.82rem; color:var(--md-sys-color-outline);">暂为例句数据</div>'}
                                    </div>
                                </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                    `;
        }).join('');

        container.innerHTML = `
                    <div class="shici-cards-list">
                        ${cardsHtml}
                    </div>
                    ${!settingsViewingWordsExpanded && words.length > 200 ? `
                        <div style="text-align:center; margin-top:16px;">
                            <button type="button" class="btn btn-outlined btn-sm" onclick="expandSettingsViewingWords()">
                                <span class="material-symbols-rounded" style="font-size:18px;">expand_more</span>
                                <span class="btn-label-text">查看全部 (共 ${words.length} 词)</span>
                            </button>
                        </div>
                    ` : (words.length > 200 ? `<div style="text-align:center; padding:12px; font-size:0.82rem; color:var(--md-sys-color-outline);">已展示全部 ${words.length} 词</div>` : '')}
                `;
        return;
    }

    const displayedWords = settingsViewingWordsExpanded ? words : words.slice(0, 200);

    container.innerHTML = displayedWords.map((w, idx) => {
        const isMastered = isWordMastered(w.word);
        const meaningStr = w.meanings ? w.meanings.map(m => (m.pos ? `<span style="color:var(--md-sys-color-primary); font-weight:700;">${m.pos}</span> ` : '') + m.meaning).join('；') : (w.meaning || '');
        const meaningPlain = w.meanings ? w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；') : (w.meaning || '');

        return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant); gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.02rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(w.word)}</span>
                            ${w.phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(w.phone)}</span>` : ''}
                            <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-family:monospace;">#${idx + 1}</span>
                        </div>
                        <div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px; line-height:1.4;">${meaningStr}</div>
                    </div>
                    <div class="word-item-toolbar">
                        <button type="button" class="word-item-tool-btn" onclick="playWordAudio('${escapeHtml(w.word)}')" title="播放发音">
                            <span class="material-symbols-rounded">volume_up</span>
                        </button>
                        <button type="button" class="word-item-tool-btn" onclick="jumpToSearch('${escapeHtml(w.word)}')" title="查询详细释义">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        <button type="button" class="word-item-tool-btn ${isMastered ? 'active' : ''}" onclick="handleToggleMasteredInWordList('${escapeHtml(w.word)}', '${escapeHtml(w.phone || '')}', '${escapeHtml(meaningPlain)}')" title="${isMastered ? '已标注熟词（点击取消）' : '标注熟词（不再抽取）'}">
                            <span class="material-symbols-rounded">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                        </button>
                        ${isLocalCustomBook ? `
                        <button type="button" class="word-item-tool-btn danger" onclick="handleDeleteWordFromBookList('${escapeHtml(w.word)}')" title="移出词书并放入回收站">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
    }).join('') + (!settingsViewingWordsExpanded && words.length > 200 ? `
                <div style="text-align:center; margin-top:16px;">
                    <button type="button" class="btn btn-outlined btn-sm" onclick="expandSettingsViewingWords()">
                        <span class="material-symbols-rounded" style="font-size:18px;">expand_more</span>
                        <span class="btn-label-text">查看全部 (共 ${words.length} 词)</span>
                    </button>
                </div>
            ` : (words.length > 200 ? `<div style="text-align:center; padding:12px; font-size:0.82rem; color:var(--md-sys-color-outline);">已展示全部 ${words.length} 词</div>` : ''));
}

let settingsMasteredCategory = 'all';
let settingsTrashCategory = 'all';

function isShiCiItem(item) {
    if (!item) return false;
    if (item.type === 'shici' || item.isShiCi) return true;
    const w = (typeof item === 'string') ? item : (item.word || '');
    if (/[\u4e00-\u9fa5]/.test(w) && !/[a-zA-Z]/.test(w)) return true;
    return false;
}

function filterMasteredCategory(cat) {
    settingsMasteredCategory = cat;
    ['all', 'en', 'shici'].forEach(k => {
        const btn = document.getElementById(`tab-mastered-${k}`);
        if (btn) btn.classList.toggle('active', (k === 'all' && cat === 'all') || (k === 'en' && cat === 'english') || (k === 'shici' && cat === 'shici'));
    });
    renderMasteredWordsInSettings();
}

function filterTrashCategory(cat) {
    settingsTrashCategory = cat;
    ['all', 'en', 'shici'].forEach(k => {
        const btn = document.getElementById(`tab-trash-${k}`);
        if (btn) btn.classList.toggle('active', (k === 'all' && cat === 'all') || (k === 'en' && cat === 'english') || (k === 'shici' && cat === 'shici'));
    });
    renderTrashWordsInSettings();
}

/* Settings 熟词本页面渲染逻辑 (Task 22) */
function renderMasteredWordsInSettings() {
    const container = document.getElementById('settings-mastered-container');
    const countEl = document.getElementById('settings-mastered-count');
    if (!container) return;

    let list = getMasteredWords();
    if (settingsMasteredCategory === 'english') {
        list = list.filter(item => !isShiCiItem(item));
    } else if (settingsMasteredCategory === 'shici') {
        list = list.filter(item => isShiCiItem(item));
    }

    if (countEl) countEl.innerText = `共 ${list.length} 词`;

    if (list.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">check_circle</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${settingsMasteredCategory === 'shici' ? '实词' : (settingsMasteredCategory === 'english' ? '英语' : '')}熟词</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = list.map((item, idx) => {
        const word = typeof item === 'string' ? item : item.word;
        const phone = typeof item === 'string' ? '' : (item.phone || '');
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        const isShiCi = isShiCiItem(item);

        return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant);">
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.1rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(word)}</span>
                                ${phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(phone)}</span>` : ''}
                                ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.72rem; font-weight:700;">文言实词</span>` : ''}
                                ${!isShiCi ? `
                                <button type="button" class="btn-audio-speak" style="width:26px; height:26px; margin-left:4px;" onclick="playWordAudio('${escapeHtml(word)}')" title="发音">
                                    <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                                </button>
                                ` : ''}
                            </div>
                            ${meaning ? `<div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px;">${escapeHtml(meaning)}</div>` : ''}
                        </div>
                        <button type="button" class="btn btn-outlined btn-sm" onclick="handleUnmarkMastered('${escapeHtml(word)}')" title="取消熟词标记">
                            <span class="material-symbols-rounded" style="font-size:16px;">remove_done</span>
                            <span class="btn-label-text">取消熟词</span>
                        </button>
                    </div>
                `;
    }).join('');
}

function handleUnmarkMastered(word) {
    toggleMasteredWord(word);
    renderMasteredWordsInSettings();
    if (gameMode === 'single' && singleState && singleState.pool) {
        const q = singleState.pool[singleState.currentIdx];
        if (q) updateSingleCardToolbar(q);
    }
    if (shiciProgress.masteredWords && shiciProgress.masteredWords[word]) {
        delete shiciProgress.masteredWords[word];
        saveShiCiState();
    }
}

function filterMasteredWordsDisplay() {
    const query = (document.getElementById('settings-mastered-search')?.value || '').trim().toLowerCase();
    const container = document.getElementById('settings-mastered-container');
    if (!container) return;

    let list = getMasteredWords();
    if (settingsMasteredCategory === 'english') {
        list = list.filter(item => !isShiCiItem(item));
    } else if (settingsMasteredCategory === 'shici') {
        list = list.filter(item => isShiCiItem(item));
    }

    if (!query) {
        renderMasteredWordsInSettings();
        return;
    }

    const filtered = list.filter(item => {
        const word = typeof item === 'string' ? item : item.word;
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        return word.toLowerCase().includes(query) || meaning.toLowerCase().includes(query);
    });

    const countEl = document.getElementById('settings-mastered-count');
    if (countEl) countEl.innerText = `显示 ${filtered.length} / ${list.length} 词`;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的熟词</div>`;
        return;
    }

    container.innerHTML = filtered.map((item, idx) => {
        const word = typeof item === 'string' ? item : item.word;
        const phone = typeof item === 'string' ? '' : (item.phone || '');
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        const isShiCi = isShiCiItem(item);

        return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant);">
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.1rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(word)}</span>
                                ${phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(phone)}</span>` : ''}
                                ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.72rem; font-weight:700;">文言实词</span>` : ''}
                                ${!isShiCi ? `
                                <button type="button" class="btn-audio-speak" style="width:26px; height:26px; margin-left:4px;" onclick="playWordAudio('${escapeHtml(word)}')" title="发音">
                                    <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                                </button>
                                ` : ''}
                            </div>
                            ${meaning ? `<div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px;">${escapeHtml(meaning)}</div>` : ''}
                        </div>
                        <button type="button" class="btn btn-outlined btn-sm" onclick="handleUnmarkMastered('${escapeHtml(word)}')" title="取消熟词标记">
                            <span class="material-symbols-rounded" style="font-size:16px;">remove_done</span>
                            <span class="btn-label-text">取消熟词</span>
                        </button>
                    </div>
                `;
    }).join('');
}
function toggleTrashMoveDropdown(e, trashId) {
    if (e) e.stopPropagation();
    const dropdownId = `dropdown-trash-move-${trashId}`;
    const targetEl = document.getElementById(dropdownId);
    if (!targetEl) return;
    const isAlreadyOpen = targetEl.classList.contains('open');
    document.querySelectorAll('.md3-custom-dropdown.open').forEach(el => el.classList.remove('open'));
    if (!isAlreadyOpen) {
        targetEl.classList.add('open');
    }
}

function selectMoveTrashWordOption(trashId, targetBookId) {
    document.querySelectorAll('.md3-custom-dropdown.open').forEach(el => el.classList.remove('open'));
    moveTrashWordToAnotherBook(trashId, targetBookId);
}

/* ==========================================================================
   回收站公用单行模板函数（统一防挤压、自适应图层展开）
   ========================================================================== */
function renderTrashWordRow(item, customBooks) {
    const deletedTimeStr = item.deletedAt
        ? new Date(item.deletedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const cleanBookName = String(item.originalBookName || '未知').replace(/^[📂📁\s]+/, '');
    const isShiCi = isShiCiItem(item);

    return `
                <div class="trash-word-row">
                    <!-- 左侧信息区：自适应伸缩，自动折行，绝不挤压右侧按钮 -->
                    <div class="trash-word-info">
                        <div class="trash-word-header">
                            <span class="trash-word-title">${escapeHtml(item.word)}</span>
                            ${item.phone ? `<span class="trash-word-phone">${escapeHtml(item.phone)}</span>` : ''}
                            ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.75rem; font-weight:700;">文言实词</span>` : ''}
                            <span class="badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline); font-size:0.75rem;">原词书: ${escapeHtml(cleanBookName)}</span>
                            ${deletedTimeStr ? `<span style="font-size:0.75rem; color:var(--md-sys-color-outline);">${deletedTimeStr}</span>` : ''}
                        </div>
                        <div class="trash-word-meaning">${escapeHtml(item.meaning || '')}</div>
                    </div>

                    <!-- 右侧操作区：flex-shrink: 0 彻底防止挤压变形 -->
                    <div class="trash-word-actions">
                        <button type="button" class="btn btn-tonal btn-sm" onclick="restoreTrashWord('${item.id}')" title="恢复到原词书">
                            <span class="material-symbols-rounded" style="font-size:16px;">restore</span>
                            <span class="btn-label-text">恢复</span>
                        </button>

                        ${customBooks.length > 0 ? `
                        <div class="md3-custom-dropdown" id="dropdown-trash-move-${item.id}">
                            <button type="button" class="md3-dropdown-btn" style="height:34px; font-size:0.82rem; padding:0 12px;" onclick="toggleTrashMoveDropdown(event, '${item.id}')">
                                <span>移动到...</span>
                                <span class="material-symbols-rounded dropdown-chevron" style="font-size:16px;">expand_more</span>
                            </button>
                            <div class="md3-dropdown-menu">
                                ${customBooks.map(cb => `
                                    <div class="md3-dropdown-item" onclick="selectMoveTrashWordOption('${item.id}', '${cb.id}')">
                                        <span class="material-symbols-rounded">menu_book</span>
                                        <span>${escapeHtml((cb.rawName || cb.name).replace(/^[📂📁\s]+/, ''))}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <button type="button" class="btn btn-danger btn-sm" style="padding:0 10px; height:34px;" onclick="permanentlyDeleteTrashWord('${item.id}')" title="彻底删除">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete_forever</span>
                        </button>
                    </div>
                </div>
            `;
}

/* 渲染回收站完整列表 */
function renderTrashWordsInSettings() {
    const container = document.getElementById('settings-trash-container');
    const countEl = document.getElementById('settings-trash-count');
    if (!container) return;

    let trash = getTrashWords();
    if (settingsTrashCategory === 'english') {
        trash = trash.filter(item => !isShiCiItem(item));
    } else if (settingsTrashCategory === 'shici') {
        trash = trash.filter(item => isShiCiItem(item));
    }

    if (countEl) countEl.innerText = `共 ${trash.length} 词`;

    if (trash.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">delete</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${settingsTrashCategory === 'shici' ? '实词' : (settingsTrashCategory === 'english' ? '英语' : '')}已删词汇</p>
                    </div>
                `;
        return;
    }

    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_'));
    container.innerHTML = trash.map(item => renderTrashWordRow(item, customBooks)).join('');
}

/* 搜索过滤回收站词汇（完美同步一致模板） */
function filterTrashWordsDisplay() {
    const query = (document.getElementById('settings-trash-search')?.value || '').trim().toLowerCase();
    const container = document.getElementById('settings-trash-container');
    if (!container) return;

    let trash = getTrashWords();
    if (settingsTrashCategory === 'english') {
        trash = trash.filter(item => !isShiCiItem(item));
    } else if (settingsTrashCategory === 'shici') {
        trash = trash.filter(item => isShiCiItem(item));
    }

    if (!query) {
        renderTrashWordsInSettings();
        return;
    }

    const filtered = trash.filter(item => {
        const w = (item.word || '').toLowerCase();
        const m = (item.meaning || '').toLowerCase();
        const b = (item.originalBookName || '').toLowerCase();
        return w.includes(query) || m.includes(query) || b.includes(query);
    });

    const countEl = document.getElementById('settings-trash-count');
    if (countEl) countEl.innerText = `显示 ${filtered.length} / ${trash.length} 词`;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的已删词汇</div>`;
        return;
    }

    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_'));
    container.innerHTML = filtered.map(item => renderTrashWordRow(item, customBooks)).join('');
}

const APP_VERSION = '2.2.5';
const APP_CHANGELOG = [
    {
        version: 'v2.2.5',
        date: '2026-09-26',
        badge: '当前版本',
        items: [
            '英语默写练习答错后支持自主订正与重试，不再直接展示答案。',
            '英语默写答对或公布答案后隐藏“看答案”与“提示”按钮，且不再自动跳转下一题。',
            '优化英语默写反馈样式：正确答案取消红色背景填充，发音按钮移至英文词汇右侧。',
            '优化词块着色体验：答对词块标蓝（#0061a4），答错词块标红。',
            '更新日志全面支持识别 Markdown 语法：支持列表缩进、无序列表、有序列表及 blockquote 引用块。',
            '优化UI与交互细节。'
        ]
    },
    {
        version: 'v2.2.4',
        date: '2026-09-26',
        badge: '历史版本',
        items: [
            '支持使用第三方账号登录。',
            '在设置-更新日志中可以切换云端日志和本地日志。',
            'Wordle草稿行与上方对齐，方便对照。',
            '优化UI。',
            '修复英语词组中带有=、/的题，左右两边互换算错的bug。',
            '修复手机端游客账号无法保存数据的bug。',
            '修复若干bug。'
        ]
    },
    {
        version: 'v2.2.0',
        date: '2026-09-25',
        badge: '历史版本',
        items: [
            '更新登录系统。',
            '更新 wordle 笔记功能。',
            '优化搜索功能。',
            '优化选择词书功能。',
            '优化UI。',
            '修复若干bug。'
        ]
    },
    {
        version: 'v2.1.0',
        date: '2026-09-19',
        badge: '历史版本',
        items: [
            '添加搜索功能。',
            '优化人机对战。',
            '优化UI：新增“我”页面。',
            '优化复习功能。',
            '优化易错项抽取。'
        ]
    },
    {
        version: 'v2.0.0',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '更新背实词功能。',
            '更新每组小结。',
            '优化词书。',
            '修复自定义页面宽度对设置页没有作用的问题。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.9.2',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '优化词书。',
            '优化抽词："/"、"="、"( )"、","、"one’s"等自动预填。',
            '优化◇◇◇◇◇动画。',
            '优化窄屏UI。'
        ]
    },
    {
        version: 'v1.9.1',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '优化版本更新。',
        ]
    },
    {
        version: 'v1.9.0',
        date: '2026-09-12',
        badge: '历史版本',
        items: [
            '更新学习日历。',
            '云端词书也支持在设置中查看。',
            '更新复习规则：学习一个词汇/词组分为生词-第 1-4 轮复习-熟词共 5 个阶段，对应掌握程度，在单词卡片中用◇◇◇◇◇标识。第一轮复习为第二天，第二轮复习为第四天，第三轮复习为一周后，第四轮复习为四周后。如果有一轮答错，则回到第一轮复习。第一次如果答对则直接跳到第二轮复习。如果需要复习那一天未复习，则掉一颗星。',
            '在选择词书界面支持显示每本词书的学习进度条、待复习词数，学习进度动态更新。',
            '按照选择的词书进行复习。',
            '在设置中支持导入、导出个人配置与学习记录。'
        ]
    },
    {
        version: 'v1.8.1',
        date: '2026-09-12',
        badge: '历史版本',
        items: [
            '更新词汇卡片工具栏：支持播放发音、标注熟词、删除词汇功能。',
            '从 GitHub 加载词书。',
            '从GitHub Releases 获取更新日志，并一键下载最新版本。',
            '优化即时复习，如果多次答错，不用再在组末多问一遍。',
            '优化联机对战：解决双方本地词书不一致时的显示问题。',
            '优化词书管理。',
            '优化词组背诵："..."、"sb."、"sth."、"one’s"等自动预填。',
            '优化人机对战。',
            '所有“开启/关闭”设置改为滑动开关。',
            '听音写词模式隐藏音标。',
            '单人模式答完词组不会自动跳到下一题。',
            '添加 GitHub 开源仓库链接。',
            '修复Wordle 填词无法使用实体键盘输入的问题。',
            '修复无人在线房间意外显示的问题。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.7.0',
        date: '2026-09-09',
        badge: '历史版本',
        items: [
            '更新人机对战模式。',
            '优化联机功能。',
            '优化版本更新和日志功能。',
            '支持保存学习进度。',
            '优化UI'
        ]
    },
    {
        version: 'v1.6.0',
        date: '2026-09-08',
        badge: '历史版本',
        items: [
            '添加设置页，可以调整页面尺寸、管理词书、查看更新日志。',
            '支持自动更新版本。',
            '优化联机体验。',
            '默写模式添加键盘。',
            '修复学习模式拼出正确词组后卡住的bug。',
            '优化UI：添加左侧导航栏。'
        ]
    },
    {
        version: 'v1.5.0',
        date: '2026-09-01',
        badge: '历史版本',
        items: [
            '更新默写模式。',
            '更新管理本地词书功能。',
            '更新wordle提示功能。',
            '远程联机房间支持实时聊天。',
            '添加读音功能，调用有道词典api。',
            '修复wordle只读取云端词书的bug。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.4.0',
        date: '2026-08-31',
        badge: '历史版本',
        items: [
            '更新同屏对战、即时复习功能。',
            '远程联机、同屏对决的错题将自动放入错题本中。',
            '优化词组划分和易错项抽取。',
            '更新网页、app图标。',
            '更新World riddle切换大小写功能。',
            '修复World riddle的若干bug。',
            '优化、美化UI。'
        ]
    },
    {
        version: 'v1.3.0',
        date: '2026-08-30',
        badge: '历史版本',
        items: [
            '加入更多词书。',
            'World riddle更新提示功能。'
        ]
    },
    {
        version: 'v1.2.0',
        date: '2026-08-29',
        badge: '历史版本',
        items: [
            '加入Wordle小游戏。',
            '优化背词功能。'
        ]
    },
    {
        version: 'v1.1.0',
        date: '2026-08-28',
        badge: '历史版本',
        items: [
            '更新导入本地词库功能。',
            '添加词组支持。',
            '优化单人模式UI。'
        ]
    },
    {
        version: 'v1.0.0',
        date: '2026-08-27',
        badge: '历史版本',
        items: [
            '完成联机功能。',
            '完成UI适配。'
        ]
    }
];

let settingsChangelogActiveTab = 'cloud';
try {
    const savedTab = localStorage.getItem('vocab_changelog_tab');
    if (savedTab === 'cloud' || savedTab === 'local') {
        settingsChangelogActiveTab = savedTab;
    }
} catch (e) { }

let cachedCloudChangelog = null;
let isFetchingCloudChangelog = false;

function switchChangelogTab(tab) {
    if (tab !== 'cloud' && tab !== 'local') tab = 'cloud';
    settingsChangelogActiveTab = tab;
    try {
        localStorage.setItem('vocab_changelog_tab', tab);
    } catch (e) { }

    const tabCloud = document.getElementById('tab-changelog-cloud');
    const tabLocal = document.getElementById('tab-changelog-local');
    if (tabCloud) tabCloud.classList.toggle('active', tab === 'cloud');
    if (tabLocal) tabLocal.classList.toggle('active', tab === 'local');

    const container = document.getElementById('settings-changelog-container');
    if (!container) return;

    if (tab === 'local') {
        renderChangelogItems(container, APP_CHANGELOG, false);
    } else {
        if (cachedCloudChangelog && cachedCloudChangelog.length > 0) {
            renderChangelogItems(container, cachedCloudChangelog, true);
        } else {
            fetchAndRenderCloudChangelog();
        }
    }
}

async function fetchAndRenderCloudChangelog(forceRefresh = false) {
    const container = document.getElementById('settings-changelog-container');
    if (!container) return;

    if (isFetchingCloudChangelog) return;
    isFetchingCloudChangelog = true;

    if (!cachedCloudChangelog || forceRefresh) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:36px; animation:spin 1s linear infinite; display:inline-block; color:var(--md-sys-color-primary);">sync</span>
                <p style="margin-top:10px; font-size:0.92rem;">正在从云端获取最新发布日志...</p>
            </div>
        `;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        let ghRes = await fetch(`${BookManager.API_BASE}/api/releases`, {
            signal: controller.signal
        }).catch(() => null);

        if (!ghRes || !ghRes.ok) {
            ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases?per_page=15', {
                signal: controller.signal
            }).catch(() => null);
        }

        clearTimeout(timeoutId);

        if (ghRes && ghRes.ok) {
            const releases = await ghRes.json();
            if (Array.isArray(releases) && releases.length > 0) {
                cachedCloudChangelog = releases.map((rel, idx) => {
                    const version = rel.tag_name || `v${rel.name || ''}`;
                    const isCurrent = semverCompare(version, APP_VERSION) === 0;
                    const isNewer = semverCompare(version, APP_VERSION) > 0;
                    const badge = isCurrent ? '当前版本' : (isNewer ? '最新版本' : '历史版本');
                    const date = (rel.published_at || '').substring(0, 10);
                    const rawBody = (rel.body || '').trim() || '查看 GitHub Release 获取完整详情';
                    return {
                        version,
                        date,
                        badge,
                        rawBody,
                        items: [rawBody],
                        htmlUrl: rel.html_url,
                        isHighlight: isCurrent || isNewer
                    };
                });
            }
        }
    } catch (err) {
        console.warn('Failed to load cloud changelog:', err);
    } finally {
        isFetchingCloudChangelog = false;
    }

    if (settingsChangelogActiveTab === 'cloud') {
        if (cachedCloudChangelog && cachedCloudChangelog.length > 0) {
            renderChangelogItems(container, cachedCloudChangelog, true);
        } else {
            container.innerHTML = `
                <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                    <span class="material-symbols-rounded" style="font-size:36px; opacity:0.6;">cloud_off</span>
                    <p style="margin-top:10px; font-size:0.92rem;">未能获取到云端更新日志，可能受网络影响</p>
                    <div style="margin-top:14px; display:flex; gap:10px; justify-content:center;">
                        <button type="button" class="btn btn-outlined btn-sm" onclick="fetchAndRenderCloudChangelog(true)">
                            <span class="material-symbols-rounded" style="font-size:16px;">refresh</span>
                            <span>重试</span>
                        </button>
                        <button type="button" class="btn btn-filled btn-sm" onclick="switchChangelogTab('local')">
                            <span class="material-symbols-rounded" style="font-size:16px;">folder</span>
                            <span>查看本地日志</span>
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

async function handleChangelogSyncAction() {
    switchChangelogTab('cloud');
    const icon = document.getElementById('btn-changelog-action-icon');
    const text = document.getElementById('btn-changelog-action-text');
    if (icon) icon.style.animation = 'spin 1s linear infinite';
    if (text) text.innerText = '同步中...';
    try {
        await fetchAndRenderCloudChangelog(true);
        showToast('已同步最新云端日志');
    } catch (e) {
        showToast('同步失败，请检查网络');
    } finally {
        if (icon) icon.style.animation = '';
        if (text) text.innerText = '同步云端';
    }
}

async function renderChangelogInSettings() {
    const actionText = document.getElementById('btn-changelog-action-text');
    if (actionText) actionText.innerText = '同步云端';

    switchChangelogTab(settingsChangelogActiveTab);
}

function safeEscapeChangelogHtml(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatChangelogInlineMarkdown(text) {
    if (!text) return '';
    let html = safeEscapeChangelogHtml(text);
    html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
    return html;
}

function getChangelogIndentWidth(str) {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\t') {
            width = (Math.floor(width / 4) + 1) * 4;
        } else if (str[i] === ' ') {
            width += 1;
        } else {
            break;
        }
    }
    return width;
}

function parseChangelogMarkdownBlocks(lines) {
    let html = '';
    let listStack = []; // [{ type: 'ul'|'ol', indent: number }]

    function closeListsUpTo(targetIndent = -1, targetType = null) {
        while (listStack.length > 0) {
            const top = listStack[listStack.length - 1];
            if (targetIndent >= 0 && top.indent < targetIndent) {
                break;
            }
            if (targetIndent >= 0 && top.indent === targetIndent && (!targetType || top.type === targetType)) {
                break;
            }
            const popped = listStack.pop();
            html += `</li></${popped.type}>`;
        }
    }

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // 1. 检查是否为 blockquote 行 (> ...)
        if (/^[ \t]*>/.test(line)) {
            closeListsUpTo(-1);
            const bqLines = [];
            while (i < lines.length && /^[ \t]*>/.test(lines[i])) {
                bqLines.push(lines[i].replace(/^[ \t]*>[ \t]?/, ''));
                i++;
            }
            const innerHtml = parseChangelogMarkdownBlocks(bqLines);
            html += `<blockquote class="changelog-blockquote">${innerHtml}</blockquote>`;
            continue;
        }

        // 2. 检查空行
        if (!line.trim()) {
            closeListsUpTo(-1);
            i++;
            continue;
        }

        const indent = getChangelogIndentWidth(line);
        const ulMatch = line.match(/^[ \t]*([-*+•])\s+(.*)$/);
        const olMatch = line.match(/^[ \t]*(\d+)[.)]\s+(.*)$/);

        if (ulMatch || olMatch) {
            const listType = ulMatch ? 'ul' : 'ol';
            const itemText = ulMatch ? ulMatch[2] : olMatch[2];

            if (listStack.length === 0) {
                html += `<${listType} class="changelog-list"><li>${formatChangelogInlineMarkdown(itemText)}`;
                listStack.push({ type: listType, indent: indent });
            } else {
                const current = listStack[listStack.length - 1];
                if (indent > current.indent) {
                    html += `<${listType} class="changelog-list"><li>${formatChangelogInlineMarkdown(itemText)}`;
                    listStack.push({ type: listType, indent: indent });
                } else if (indent === current.indent) {
                    if (current.type === listType) {
                        html += `</li><li>${formatChangelogInlineMarkdown(itemText)}`;
                    } else {
                        html += `</li></${current.type}><${listType} class="changelog-list"><li>${formatChangelogInlineMarkdown(itemText)}`;
                        listStack[listStack.length - 1] = { type: listType, indent: indent };
                    }
                } else {
                    closeListsUpTo(indent, listType);
                    if (listStack.length > 0 && listStack[listStack.length - 1].indent === indent && listStack[listStack.length - 1].type === listType) {
                        html += `</li><li>${formatChangelogInlineMarkdown(itemText)}`;
                    } else {
                        html += `<${listType} class="changelog-list"><li>${formatChangelogInlineMarkdown(itemText)}`;
                        listStack.push({ type: listType, indent: indent });
                    }
                }
            }
            i++;
            continue;
        }

        // 3. 检查是否为列表项下方的缩进普通文本
        if (listStack.length > 0 && indent > listStack[0].indent) {
            html += `<div class="changelog-sub-text">${formatChangelogInlineMarkdown(line.trim())}</div>`;
            i++;
            continue;
        }

        // 4. 非列表行，关闭所有列表
        closeListsUpTo(-1);

        // 检查标题 (#...)
        if (/^[ \t]*#+/.test(line)) {
            const headingText = line.replace(/^[ \t]*#+\s*/, '');
            html += `<div class="changelog-heading">${formatChangelogInlineMarkdown(headingText)}</div>`;
        } else {
            html += `<div class="changelog-p">${formatChangelogInlineMarkdown(line.trim())}</div>`;
        }
        i++;
    }

    closeListsUpTo(-1);
    return html;
}

function renderMarkdownChangelog(content) {
    if (!content) return '';
    let lines = [];
    if (Array.isArray(content)) {
        lines = content.flatMap(item => {
            const str = String(item || '');
            return str.replace(/\r\n/g, '\n').split('\n');
        });
    } else {
        lines = String(content).replace(/\r\n/g, '\n').split('\n');
    }

    const hasAnyMarkdownStructure = lines.some(l => /^[ \t]*([-*+•>]|\d+[.)]|#)/.test(l));
    if (!hasAnyMarkdownStructure && Array.isArray(content)) {
        lines = lines.map(l => l.trim() ? `- ${l.trim()}` : '');
    }

    return `<div class="changelog-content">${parseChangelogMarkdownBlocks(lines)}</div>`;
}
window.renderMarkdownChangelog = renderMarkdownChangelog;

function renderChangelogItems(container, list, isCloud = false) {
    const cardsHtml = list.map((entry, idx) => {
        const isHighlight = entry.isHighlight !== undefined ? entry.isHighlight : (idx === 0);
        return `
            <div class="card" style="padding:18px 20px; border-left: 4px solid ${isHighlight ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h3 style="margin:0; font-size:1.1rem; font-weight:700;">${safeEscapeChangelogHtml(entry.version)}</h3>
                        <span class="badge" style="background:${isHighlight ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)'}; color:${isHighlight ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)'}; font-size:0.75rem;">${safeEscapeChangelogHtml(entry.badge)}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.82rem; color:var(--md-sys-color-outline);">${safeEscapeChangelogHtml(entry.date)}</span>
                        ${entry.htmlUrl ? `<a href="${entry.htmlUrl}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:var(--md-sys-color-primary); text-decoration:none; display:inline-flex; align-items:center; gap:2px;"><span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>Release</a>` : ''}
                    </div>
                </div>
                ${renderMarkdownChangelog(entry.rawBody || entry.items)}
            </div>
        `;
    }).join('');
    container.innerHTML = cardsHtml;
}

function filterSettingsRows(query) {
    const q = (query || '').trim().toLowerCase();
    const sections = document.querySelectorAll('#settings-subview-main .settings-card');
    const titles = document.querySelectorAll('#settings-subview-main .settings-section-title');
    if (!q) {
        sections.forEach(s => {
            s.style.display = '';
            s.querySelectorAll('.settings-row').forEach(r => r.style.display = '');
        });
        titles.forEach(t => t.style.display = '');
        return;
    }
    sections.forEach(card => {
        let matchCount = 0;
        card.querySelectorAll('.settings-row').forEach(row => {
            const text = (row.innerText || '').toLowerCase();
            if (text.includes(q)) {
                row.style.display = '';
                matchCount++;
            } else {
                row.style.display = 'none';
            }
        });
        card.style.display = matchCount > 0 ? '' : 'none';
        const prevTitle = card.previousElementSibling;
        if (prevTitle && prevTitle.classList.contains('settings-section-title')) {
            prevTitle.style.display = matchCount > 0 ? '' : 'none';
        }
    });
}
