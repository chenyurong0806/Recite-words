/**
 * MD3 系统设置、数据备份与更新日志
 * Module: assets/js/views/settings.js
 */

/* ==========================================================================
   12. MD3 系统设置与子页面管理
   ========================================================================== */
function handleNavClick(dest) {
    if (dest === 'settings') {
        switchView('view-settings', { isTabSwitch: true });
    } else if (dest === 'me') {
        switchView('view-me', { isTabSwitch: true });
    } else {
        switchView('view-hub', { isTabSwitch: true });
    }
}
if (typeof window !== 'undefined') window.handleNavClick = handleNavClick;

function openMeSubview(subviewKey, skipTransition = false) {
    if (subviewKey === 'books') {
        if (typeof openManageBooksPage === 'function') {
            openManageBooksPage('view-me');
            return;
        }
    }
    if (subviewKey === 'sync') {
        if (typeof openSyncOptionsModal === 'function') {
            openSyncOptionsModal();
        }
        return;
    }
    const viewMe = document.getElementById('view-me');
    const isSwitchingIntoViewMe = (typeof currentView !== 'undefined' ? currentView !== 'view-me' : (viewMe && !viewMe.classList.contains('active')));
    if (isSwitchingIntoViewMe) {
        window.__targetMeSubview = subviewKey;
        switchView('view-me', { direction: subviewKey === 'main' ? 'back' : 'forward', skipTransition });
        return;
    }
    const currentSubEl = document.querySelector('#view-me .me-subview.active');
    const targetSubEl = (subviewKey === 'main')
        ? document.getElementById('me-subview-main')
        : document.getElementById(`settings-subview-${subviewKey}`);
    const isReturningToMain = Boolean(subviewKey === 'main' && currentSubEl && currentSubEl.id !== 'me-subview-main');
    const isBackToMain = Boolean(!skipTransition && isReturningToMain && targetSubEl);
    const isForwardToSub = Boolean(!skipTransition && subviewKey !== 'main' && currentSubEl && targetSubEl && currentSubEl !== targetSubEl);

    if (subviewKey !== 'main' && currentSubEl && currentSubEl.id === 'me-subview-main' && typeof saveScrollPositionForState === 'function') {
        saveScrollPositionForState('view-me', 'main');
    }

    const performSwitch = () => {
        if (typeof updateNavVisibilityForState === 'function') {
            updateNavVisibilityForState('view-me', subviewKey);
        }
        const meSubviews = ['main', 'books', 'words', 'mastered', 'trash', 'export-data', 'items', 'account', 'detailed-stats', 'review-plan'];
        meSubviews.forEach(k => {
            const el = (k === 'main')
                ? document.getElementById('me-subview-main')
                : document.getElementById(`settings-subview-${k}`);
            if (el) {
                const isActive = (k === subviewKey);
                if (!isActive) el.classList.remove('no-enter-anim');
                el.classList.toggle('active', isActive);
                el.inert = !isActive;
                if (isActive) el.removeAttribute('aria-hidden');
                else el.setAttribute('aria-hidden', 'true');
            }
        });
        if (subviewKey === 'items' && typeof ItemManager !== 'undefined') {
            ItemManager.renderItemsView();
        }
        if (subviewKey === 'main') {
            renderMeView();
        } else if (subviewKey === 'books') {
            renderManageLocalBooksInSettings();
        } else if (subviewKey === 'mastered') {
            renderMasteredWordsInSettings();
        } else if (subviewKey === 'trash') {
            renderTrashWordsInSettings();
        } else if (subviewKey === 'export-data') {
            if (typeof initExportStudyDataView === 'function') {
                initExportStudyDataView();
            }
        } else if (subviewKey === 'account') {
            if (typeof renderAccountManageSubview === 'function') {
                renderAccountManageSubview();
            }
        } else if (subviewKey === 'detailed-stats') {
            if (typeof renderDetailedStatsSubview === 'function') {
                renderDetailedStatsSubview();
            }
        } else if (subviewKey === 'review-plan') {
            if (typeof renderReviewPlanSubview === 'function') {
                renderReviewPlanSubview();
            }
        }
        if (isReturningToMain && typeof restoreScrollPositionForState === 'function') {
            restoreScrollPositionForState('view-me', 'main');
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    };

    if (isBackToMain && typeof runBackPageTransition === 'function') {
        runBackPageTransition(performSwitch, currentSubEl, targetSubEl);
    } else if (isForwardToSub && typeof runForwardPageTransition === 'function') {
        runForwardPageTransition(performSwitch, currentSubEl, targetSubEl);
    } else if (window.__skipNextBackAnimation && targetSubEl) {
        window.__skipNextBackAnimation = false;
        targetSubEl.classList.add('no-enter-anim');
        performSwitch();
    } else {
        performSwitch();
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
    let num = parseFloat(zoom);
    if (isNaN(num) || num < 0.7 || num > 1.5) num = 1;
    const val = String(Math.round(num * 100) / 100);
    document.documentElement.style.setProperty('--app-zoom', val);
    document.body.style.zoom = val;
    localStorage.setItem('app_zoom', val);

    const slider = document.getElementById('slider-app-zoom');
    if (slider && slider.value !== val) slider.value = val;
    if (typeof updateMd3SliderUI === 'function' && slider) {
        updateMd3SliderUI(slider);
    }
    const valText = document.getElementById('app-zoom-val-text');
    if (valText) valText.innerText = `${Math.round(num * 100)}%`;
}

function setReduceMotion(enabled) {
    const isReduce = !!enabled;
    localStorage.setItem('app_reduce_motion', isReduce ? 'true' : 'false');
    document.documentElement.classList.toggle('reduce-motion', isReduce);
    if (document.body) {
        document.body.classList.toggle('reduce-motion', isReduce);
    }
    const toggle = document.getElementById('toggle-reduce-motion');
    if (toggle && toggle.checked !== isReduce) toggle.checked = isReduce;
}

function handleToggleReduceMotion(checked) {
    setReduceMotion(checked);
}

function initDisplaySettings() {
    const savedWidth = localStorage.getItem('app_max_width') || '960px';
    document.documentElement.style.setProperty('--container-max-width', savedWidth);

    const savedZoom = localStorage.getItem('app_zoom') || '1';
    document.documentElement.style.setProperty('--app-zoom', savedZoom);
    if (document.body) {
        document.body.style.zoom = savedZoom;
    }

    const savedReduceMotion = localStorage.getItem('app_reduce_motion') === 'true';
    document.documentElement.classList.toggle('reduce-motion', savedReduceMotion);
    if (document.body) {
        document.body.classList.toggle('reduce-motion', savedReduceMotion);
    }
    const motionToggle = document.getElementById('toggle-reduce-motion');
    if (motionToggle) motionToggle.checked = savedReduceMotion;

    if (typeof applyHomeLayoutConfig === 'function') {
        applyHomeLayoutConfig();
    }

    syncOfflineModeSwitchUI();
}

function handleToggleOfflineMode(checked) {
    if (typeof setOfflineMode === 'function') {
        const success = setOfflineMode(checked);
        if (!success) {
            const toggle = document.getElementById('toggle-offline-mode');
            if (toggle) toggle.checked = true;
            return;
        }
        if (checked) {
            showToast('已开启离线模式');
        } else {
            showToast('已关闭离线模式');
        }
    }
}
window.handleToggleOfflineMode = handleToggleOfflineMode;

function syncOfflineModeSwitchUI() {
    const toggle = document.getElementById('toggle-offline-mode');
    const desc = document.getElementById('settings-offline-mode-desc');
    if (!toggle) return;
    const offline = (typeof isOfflineMode === 'function') && isOfflineMode();
    toggle.checked = offline;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toggle.disabled = true;
        if (desc) desc.innerText = '当前无网络连接，强制开启离线模式';
    } else {
        toggle.disabled = false;
        if (desc) {
            desc.innerText = offline ? '已开启离线模式，使用纯本地数据，不进行任何网络通信' : '开启后完全使用本地数据，不进行任何网络通信';
        }
    }
}
window.syncOfflineModeSwitchUI = syncOfflineModeSwitchUI;
window.setReduceMotion = setReduceMotion;
window.handleToggleReduceMotion = handleToggleReduceMotion;
if (typeof window !== 'undefined') window.initDisplaySettings = initDisplaySettings;

function switchSettingsSubview(subviewKey, skipTransition = false, options = {}) {
    const meSubviews = ['books', 'words', 'mastered', 'trash'];
    if (meSubviews.includes(subviewKey)) {
        openMeSubview(subviewKey, skipTransition);
        return;
    }

    const currentSubEl = document.querySelector('#view-settings .settings-subview.active');
    const targetSubEl = document.getElementById(`settings-subview-${subviewKey}`);
    const isReturningToMain = Boolean(subviewKey === 'main' && currentSubEl && currentSubEl.id !== 'settings-subview-main');
    const isBackToMain = Boolean(!skipTransition && isReturningToMain && targetSubEl);
    const isForwardToSub = Boolean(!skipTransition && subviewKey !== 'main' && currentSubEl && targetSubEl && currentSubEl !== targetSubEl);

    if (subviewKey !== 'main' && currentSubEl && currentSubEl.id === 'settings-subview-main' && typeof saveScrollPositionForState === 'function') {
        saveScrollPositionForState('view-settings', 'main');
    }

    const performSubviewSwitch = () => {
        if (typeof updateNavVisibilityForState === 'function') {
            updateNavVisibilityForState('view-settings', subviewKey);
        }
        const subviews = ['main', 'changelog', 'edit-home'];
        subviews.forEach(k => {
            const el = document.getElementById(`settings-subview-${k}`);
            if (el) {
                const isActive = (k === subviewKey);
                if (!isActive) el.classList.remove('no-enter-anim');
                el.classList.toggle('active', isActive);
                el.inert = !isActive;
                if (isActive) el.removeAttribute('aria-hidden');
                else el.setAttribute('aria-hidden', 'true');
            }
        });
        if (subviewKey === 'main') {
            renderSettingsMain();
        } else if (subviewKey === 'changelog') {
            renderChangelogInSettings();
        } else if (subviewKey === 'edit-home') {
            if (typeof renderEditHomeSettings === 'function') {
                renderEditHomeSettings();
            }
        }
        if (options && options.preserveScroll) {
            return;
        }
        if (isReturningToMain && typeof restoreScrollPositionForState === 'function') {
            restoreScrollPositionForState('view-settings', 'main');
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    };

    if (isBackToMain && typeof runBackPageTransition === 'function') {
        runBackPageTransition(performSubviewSwitch, currentSubEl, targetSubEl);
    } else if (isForwardToSub && typeof runForwardPageTransition === 'function') {
        runForwardPageTransition(performSubviewSwitch, currentSubEl, targetSubEl);
    } else if (window.__skipNextBackAnimation && targetSubEl) {
        window.__skipNextBackAnimation = false;
        targetSubEl.classList.add('no-enter-anim');
        performSubviewSwitch();
    } else {
        performSubviewSwitch();
    }
}

function renderSettingsMain() {
    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    const verLabel = document.getElementById('settings-version-label');
    if (verLabel) verLabel.innerText = `v${APP_VERSION}`;
    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        ElectronManager.syncSettingsUpdateButton();
    }
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%`;
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
    const slider = document.getElementById('slider-app-zoom');
    if (slider) {
        slider.value = savedZoom;
        if (typeof updateMd3SliderUI === 'function') {
            updateMd3SliderUI(slider);
        }
    }
    const valText = document.getElementById('app-zoom-val-text');
    if (valText) valText.innerText = `${Math.round(parseFloat(savedZoom) * 100)}%`;

    const motionToggle = document.getElementById('toggle-reduce-motion');
    if (motionToggle) {
        motionToggle.checked = localStorage.getItem('app_reduce_motion') === 'true';
    }

    const kbEnabled = localStorage.getItem('dictation_virtual_keyboard_enabled') !== 'false';
    document.querySelectorAll('#chips-settings-dictation-kb .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-kb') === String(kbEnabled));
    });

    const autoSyncSwitch = document.getElementById('switch-auto-sync');
    if (autoSyncSwitch) {
        autoSyncSwitch.checked = typeof isAutoSyncEnabled === 'function' ? isAutoSyncEnabled() : true;
    }

    const summaryEl = document.getElementById('settings-books-summary-text');
    if (summaryEl) {
        const customCount = (window.customBooks || []).length;
        const folderCount = (localFolders || []).length;
        summaryEl.innerText = `已创建 ${folderCount} 个文件夹，${customCount} 个本地词书`;
    }

    const masteredSummaryEl = document.getElementById('settings-mastered-summary-text');
    if (masteredSummaryEl) {
        const mCount = getMasteredWords().length;
        masteredSummaryEl.innerText = `已标注 ${mCount} 个熟词，练习中不再抽取`;
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
    if (typeof cleanAccountSwitchPresence === 'function') {
        cleanAccountSwitchPresence(oldUser, name);
    } else {
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
    if (typeof cleanAccountSwitchPresence === 'function') {
        cleanAccountSwitchPresence(oldUser, name);
    } else {
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
    if (typeof cleanAccountSwitchPresence === 'function') {
        cleanAccountSwitchPresence(oldUser, '');
    } else {
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
    }

    // 清除该用户在 localStorage 中的所有相关数据
    const userSuffix = `_${targetUser}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.endsWith(userSuffix) ||
            key.includes(`_${targetUser}_`) ||
            key === `vocab_mails_${targetUser}` ||
            key === `vocab_mail_status_${targetUser}` ||
            key === `vocab_claimed_mails_${targetUser}` ||
            key === `vocab_deleted_mails_${targetUser}` ||
            key === `vocab_user_items_${targetUser}` ||
            key === `vocab_item_active_${targetUser}` ||
            key === `vocab_stats_${targetUser}` ||
            key === `vocab_ebbinghaus_db_${targetUser}` ||
            key === `vocab_user_avatar_${targetUser}` ||
            key === `vocab_riddle_history_${targetUser}` ||
            key === `vocab_riddle_streak_${targetUser}` ||
            key === `vocab_wordle_records_${targetUser}` ||
            key === `vocab_rank_data_${targetUser}` ||
            key === `vocab_sync_queue_${targetUser}` ||
            key === `shici_config_${targetUser}` ||
            key === `shici_progress_${targetUser}` ||
            key === `vocab_review_filter_${targetUser}`
        )) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
        try { SafeStorage.removeItem(k); } catch (e) {}
    });

    if (typeof isOfflineMode === 'function' && !isOfflineMode() && typeof supabaseDeleteAccount === 'function' && typeof sbClient !== 'undefined' && sbClient) {
        supabaseDeleteAccount(targetUser, null).catch(e => console.warn('[Settings] Supabase delete account error:', e));
    }

    if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
        MailManager.resetForUser('');
    }
    if (typeof ItemManager !== 'undefined') {
        ItemManager._itemsCache = [];
        ItemManager._itemsCacheUser = '';
        ItemManager.updateBadge();
    }

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

function switchSettingsLocalManageBooksCategory(cat) {
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

    if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--md-sys-color-surface-container); border:1px solid var(--md-sys-color-outline-variant); border-radius:14px; padding:10px 14px; margin-bottom:12px; gap:10px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary); font-size:22px;">folder_special</span>
                    <div>
                        <div style="font-size:0.92rem; font-weight:700; color:var(--md-sys-color-on-surface);">专属词书存放目录</div>
                        <div style="font-size:0.76rem; color:var(--md-sys-color-outline);">下载与导入的词书均存放在本地独立目录中，可直接放入 .json 词书</div>
                    </div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-tonal btn-sm" onclick="ElectronManager.openBooksFolder()">
                        <span class="material-symbols-rounded" style="font-size:16px;">folder_open</span>
                        <span>打开目录</span>
                    </button>
                    <button type="button" class="btn btn-outlined btn-sm" onclick="ElectronManager.scanAndSyncLocalBooks(false)">
                        <span class="material-symbols-rounded" style="font-size:16px;">sync</span>
                        <span>扫描同步</span>
                    </button>
                </div>
            </div>
        `;
    }

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
        const isCurrentLocal = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.type === 'local') || (typeof isOfflineMode === 'function' && isOfflineMode());
        const backupObj = {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.9.0',
            exportedAt: new Date().toISOString(),
            user: currentUser,
            accountType: isCurrentLocal ? 'local' : 'online',
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

            // 本地账号和在线账号的数据不允许互相导入 (Requirement 4)
            const currentIsLocal = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.type === 'local') || (typeof isOfflineMode === 'function' && isOfflineMode());
            const backupIsLocal = (parsed.accountType === 'local') || (parsed.user && typeof getLocalAccounts === 'function' && getLocalAccounts().some(a => a.username === parsed.user));

            if (currentIsLocal && !backupIsLocal) {
                alert('数据隔离保护：当前登录的是本地账号，禁止导入在线账号的备份数据！');
                event.target.value = '';
                return;
            }
            if (!currentIsLocal && backupIsLocal) {
                alert('数据隔离保护：当前登录的是在线账号，禁止导入本地账号的备份数据！');
                event.target.value = '';
                return;
            }

            if (!confirm(`确定要恢复备份文件吗？\n导出时间: ${parsed.exportedAt || '未知'}\n用户名: ${parsed.user || '未知'}\n账号类型: ${backupIsLocal ? '本地账号' : '在线账号'}\n当前用户的复习进度与配置将被覆盖。`)) {
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
    const name = await (typeof showAppPrompt === 'function' ? showAppPrompt({
        title: '新建文件夹',
        message: '请输入新文件夹名称：',
        placeholder: '文件夹名称'
    }) : Promise.resolve(prompt('请输入新文件夹名称：')));
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
    const name = await (typeof showAppPrompt === 'function' ? showAppPrompt({
        title: '重命名文件夹',
        message: '修改文件夹名称：',
        defaultValue: oldName,
        placeholder: '新名称'
    }) : Promise.resolve(prompt('修改文件夹名称：', oldName)));
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
    const ok = await (typeof showAppConfirm === 'function' ? showAppConfirm({
        title: '删除文件夹',
        message: '确定删除此文件夹吗？',
        confirmText: '删除',
        cancelText: '取消',
        isDanger: true,
        icon: 'folder_delete'
    }) : Promise.resolve(confirm('确定删除此文件夹吗？')));
    if (!ok) return;
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
    if (typeof renderSingleBookList === 'function') renderSingleBookList();
    if (typeof renderRoomBookChips === 'function') renderRoomBookChips();
    if (typeof renderLocalDuelBookChips === 'function') {
        renderLocalDuelBookChips();
    } else if (typeof updateLocalDuelBookSummaryUI === 'function') {
        updateLocalDuelBookSummaryUI();
    }
    if (typeof renderAiDuelBookChips === 'function') {
        renderAiDuelBookChips();
    } else if (typeof updateAiDuelBookSummaryUI === 'function') {
        updateAiDuelBookSummaryUI();
    }
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
        if (notify) showToast('数据同步失败，请检查网络');
    }
}

let settingsViewingBookId = null;
let settingsViewingBookWords = [];
let settingsViewingCurrentWordsList = [];
let settingsViewingWordsExpanded = false;
let settingsViewingExpandedShiCiWords = new Set();
let settingsViewingBookPreviousView = 'view-manage-books';

function exitBookWordsView() {
    if (settingsViewingBookPreviousView === 'view-manage-books') {
        if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
        switchView('view-manage-books', { direction: 'back' });
    } else if (settingsViewingBookPreviousView === 'view-me') {
        window.__targetMeSubview = 'main';
        switchView('view-me', { direction: 'back' });
    } else {
        switchView(settingsViewingBookPreviousView || 'view-manage-books', { direction: 'back' });
    }
}
window.exitBookWordsView = exitBookWordsView;

async function viewBookWordsInSettings(bookId) {
    if (typeof openBookContentPage === 'function') {
        openBookContentPage(bookId, null, (typeof currentView !== 'undefined' && currentView) ? currentView : 'view-me');
        return;
    }
    const book = (window.customBooks || []).find(b => b.id === bookId) ||
        BookManager.availableBooks.find(b => b.id === bookId) ||
        BookManager.fallbackBooks.find(b => b.id === bookId);
    if (!book) return;

    if (typeof currentView !== 'undefined' && currentView && currentView !== 'view-me') {
        settingsViewingBookPreviousView = currentView;
    }

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

    settingsViewingActiveSection = 'all';
    settingsViewingActiveType = 'all';
    settingsViewingExpandedWordExamples.clear();

    renderSettingsBookFilterBar(settingsViewingBookWords);
    renderSettingsViewingWordsList(settingsViewingBookWords);
    const addWordBtn = document.getElementById('btn-settings-add-word');
    if (addWordBtn) {
        const isCustom = String(bookId).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === bookId));
        addWordBtn.style.display = isCustom ? 'inline-flex' : 'none';
    }
    switchSettingsSubview('words');
}

let settingsViewingActiveSection = 'all';
let settingsViewingActiveType = 'all';
const settingsViewingExpandedWordExamples = new Set();

function renderSettingsBookFilterBar(words) {
    const bar = document.getElementById('settings-view-book-filter-bar');
    if (!bar) return;

    const sections = [];
    const secCounts = {};
    let wordCount = 0;
    let phraseCount = 0;

    (words || []).forEach(w => {
        if (!w) return;
        if (w.section) {
            secCounts[w.section] = (secCounts[w.section] || 0) + 1;
            if (!sections.includes(w.section)) sections.push(w.section);
        }
        const isPhrase = w.itemType === 'phrase' || Boolean(w.mistake && (!w.senses || w.senses.length === 0));
        if (isPhrase) phraseCount++;
        else wordCount++;
    });

    const hasSections = sections.length > 0;
    const hasBothTypes = (wordCount > 0 && phraseCount > 0);

    if (!hasSections && !hasBothTypes) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }

    bar.style.display = 'flex';
    let html = '';

    if (hasBothTypes) {
        html += `
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary);">类型筛选:</span>
                <div style="display:inline-flex; gap:6px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm ${settingsViewingActiveType === 'all' ? 'btn-filled' : 'btn-tonal'}"
                        style="height:28px; font-size:0.76rem; padding:0 10px; border-radius:14px;"
                        onclick="setSettingsViewingFilterType('all')">
                        全部 (${wordCount + phraseCount})
                    </button>
                    <button type="button" class="btn btn-sm ${settingsViewingActiveType === 'word' ? 'btn-filled' : 'btn-tonal'}"
                        style="height:28px; font-size:0.76rem; padding:0 10px; border-radius:14px;"
                        onclick="setSettingsViewingFilterType('word')">
                        单词 (${wordCount})
                    </button>
                    <button type="button" class="btn btn-sm ${settingsViewingActiveType === 'phrase' ? 'btn-filled' : 'btn-tonal'}"
                        style="height:28px; font-size:0.76rem; padding:0 10px; border-radius:14px;"
                        onclick="setSettingsViewingFilterType('phrase')">
                        词组 (${phraseCount})
                    </button>
                </div>
            </div>
        `;
    }

    if (hasSections) {
        sections.sort((a, b) => a.localeCompare(b));
        html += `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary); white-space:nowrap;">板块分类:</span>
                <div style="display:inline-flex; gap:5px; overflow-x:auto; padding:2px 0 4px; flex:1;" class="hide-scrollbar">
                    <button type="button" class="btn btn-sm ${settingsViewingActiveSection === 'all' ? 'btn-filled' : 'btn-tonal'}"
                        style="height:26px; font-size:0.75rem; padding:0 8px; border-radius:13px; white-space:nowrap; flex-shrink:0;"
                        onclick="setSettingsViewingFilterSection('all')">
                        全部板块
                    </button>
                    ${sections.map(sec => `
                        <button type="button" class="btn btn-sm ${settingsViewingActiveSection === sec ? 'btn-filled' : 'btn-tonal'}"
                            style="height:26px; font-size:0.75rem; padding:0 8px; border-radius:13px; white-space:nowrap; flex-shrink:0;"
                            onclick="setSettingsViewingFilterSection('${escapeHtml(sec)}')">
                            ${sec.toUpperCase()} (${secCounts[sec] || 0})
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bar.innerHTML = html;
}

function setSettingsViewingFilterType(type) {
    settingsViewingActiveType = type;
    renderSettingsBookFilterBar(settingsViewingBookWords);
    filterSettingsBookWordsDisplay();
}
window.setSettingsViewingFilterType = setSettingsViewingFilterType;

function setSettingsViewingFilterSection(sec) {
    settingsViewingActiveSection = sec;
    renderSettingsBookFilterBar(settingsViewingBookWords);
    filterSettingsBookWordsDisplay();
}
window.setSettingsViewingFilterSection = setSettingsViewingFilterSection;

function toggleSettingsWordDetail(uniqueKey, event) {
    if (event && event.target && event.target.closest('.book-viewer-act-btn')) {
        return;
    }
    if (settingsViewingExpandedWordExamples.has(uniqueKey)) {
        settingsViewingExpandedWordExamples.delete(uniqueKey);
    } else {
        settingsViewingExpandedWordExamples.add(uniqueKey);
    }
    const currentList = settingsViewingCurrentWordsList && settingsViewingCurrentWordsList.length > 0
        ? settingsViewingCurrentWordsList
        : settingsViewingBookWords;
    renderSettingsViewingWordsList(currentList);
}
window.toggleSettingsWordDetail = toggleSettingsWordDetail;

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
    
    let filtered = settingsViewingBookWords;

    // 1. 板块分类筛选
    if (settingsViewingActiveSection && settingsViewingActiveSection !== 'all') {
        const secLower = settingsViewingActiveSection.toLowerCase();
        filtered = filtered.filter(w => {
            if (w.section && String(w.section).toLowerCase() === secLower) return true;
            if (!w.section && w.word) {
                return w.word.trim().charAt(0).toLowerCase() === secLower;
            }
            return false;
        });
    }

    // 2. 类型筛选 (单词 / 词组)
    if (settingsViewingActiveType && settingsViewingActiveType !== 'all') {
        filtered = filtered.filter(w => {
            const isPhrase = w.itemType === 'phrase' || Boolean(w.mistake && (!w.senses || w.senses.length === 0));
            return settingsViewingActiveType === 'phrase' ? isPhrase : !isPhrase;
        });
    }

    // 3. 搜索关键词匹配
    if (query) {
        filtered = filtered.filter(w => {
            const wordMatch = (w.word || '').toLowerCase().includes(query);
            const pinyinMatch = (w.phone || w.pinyin || '').toLowerCase().includes(query);
            
            let meaningStr = '';
            if (w.senses && Array.isArray(w.senses)) {
                meaningStr = w.senses.map(s => {
                    const transStr = Array.isArray(s.trans) ? s.trans.join(' ') : String(s.trans || s.meaning || '');
                    const exStr = (s.examples || []).map(e => (e.en || e.sentence || '') + ' ' + (e.zh || e.source || '')).join(' ');
                    return transStr + ' ' + exStr;
                }).join(' ');
            } else if (w.meanings && Array.isArray(w.meanings)) {
                meaningStr = w.meanings.map(m => m.meaning).join(' ');
            } else {
                meaningStr = String(w.meaning || w.trans || '');
            }

            const derivStr = (w.derivatives || []).map(d => (d.name || '') + ' ' + (Array.isArray(d.trans) ? d.trans.join(' ') : (d.trans || ''))).join(' ');
            const noteStr = String(w.note || '');

            const totalSearchText = `${meaningStr} ${derivStr} ${noteStr}`.toLowerCase();
            return wordMatch || pinyinMatch || totalSearchText.includes(query);
        });
    }

    renderSettingsViewingWordsList(filtered);
}

function expandSettingsViewingWords() {
    settingsViewingWordsExpanded = true;
    filterSettingsBookWordsDisplay();
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
    filterSettingsBookWordsDisplay();
}

async function handleDeleteWordFromBookList(word) {
    if (!confirm(`确定将词汇【${word}】从当前词书移除并移入回收站吗？可在回收站中随时恢复。`)) return;
    const ok = await deleteWordFromCustomBook(word, settingsViewingBookId);
    if (ok) {
        settingsViewingBookWords = settingsViewingBookWords.filter(w => (w.word || '').toLowerCase() !== word.toLowerCase());
        filterSettingsBookWordsDisplay();
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

    const isShiCi = Boolean(isShiCiBook(book));

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

    const itemsHtml = displayedWords.map((w, idx) => {
        const isMastered = isWordMastered(w.word);
        const uniqueWordKey = `word_detail_${idx}_${encodeURIComponent(w.word).replace(/%/g, '_')}`;
        const isExp = settingsViewingExpandedWordExamples.has(uniqueWordKey);
        const isPhrase = w.itemType === 'phrase' || Boolean(w.mistake && (!w.senses || w.senses.length === 0));

        // 收集所有例句
        const examplesList = [];
        if (Array.isArray(w.examples)) {
            w.examples.forEach(ex => {
                if (ex && (ex.en || ex.zh || ex.sentence)) {
                    examplesList.push({ pos: '', trans: '', en: ex.en || ex.sentence || '', zh: ex.zh || ex.source || '' });
                }
            });
        }
        if (Array.isArray(w.senses)) {
            w.senses.forEach(s => {
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

        // 格式化释义展示：按词性分组展示，避免重复词性徽章
        let formattedMeaningHtml = '';
        if (Array.isArray(w.senses) && w.senses.length > 0) {
            const posMap = [];
            w.senses.forEach(s => {
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
            formattedMeaningHtml = posMap.map(g => `
                <div style="margin-top:2px;">
                    ${g.pos ? `<span style="color:var(--md-sys-color-primary); font-weight:700; margin-right:4px;">${escapeHtml(g.pos)}</span>` : ''}
                    <span>${escapeHtml(g.texts.join('； '))}</span>
                </div>
            `).join('');
        } else if (w.meanings && Array.isArray(w.meanings)) {
            formattedMeaningHtml = w.meanings.map(m => (m.pos ? `<span style="color:var(--md-sys-color-primary); font-weight:700;">${escapeHtml(m.pos)}</span> ` : '') + escapeHtml(m.meaning)).join('； ');
        } else {
            formattedMeaningHtml = escapeHtml(w.meaning || '');
        }

        const meaningPlain = w.meanings ? w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；') : (w.meaning || '');

        return `
            <div class="book-viewer-word-item ${isExp ? 'open' : ''}" onclick="toggleSettingsWordDetail('${uniqueWordKey}', event)">
                <div class="book-viewer-word-header">
                    <div class="book-viewer-word-main">
                        <span class="book-viewer-word-text">${escapeHtml(w.word)}</span>
                        ${w.phone ? `<span class="book-viewer-word-phone">${escapeHtml(w.phone)}</span>` : ''}
                        ${w.section ? `<span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-weight:700; font-size:0.72rem; padding:1px 6px; border-radius:4px;">${escapeHtml(w.section.toUpperCase())}</span>` : ''}
                        ${isPhrase ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:600; font-size:0.72rem; padding:1px 6px; border-radius:4px;">词组</span>` : ''}
                        <span class="book-viewer-word-index">#${idx + 1}</span>
                    </div>
                    <div class="book-viewer-word-actions" onclick="event.stopPropagation()">
                        <button type="button" class="btn btn-sm btn-outlined book-viewer-act-btn" onclick="jumpToSearch('${escapeHtml(w.word)}')" title="查词">
                            <span class="material-symbols-rounded">search</span>
                            <span>查词</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outlined book-viewer-act-btn" onclick="playWordAudio('${escapeHtml(w.word)}')" title="播放发音">
                            <span class="material-symbols-rounded">volume_up</span>
                            <span>发音</span>
                        </button>
                        <button type="button" class="btn btn-sm ${isMastered ? 'btn-filled' : 'btn-outlined'} book-viewer-act-btn ${isMastered ? 'mastered' : ''}" onclick="handleToggleMasteredInWordList('${escapeHtml(w.word)}', '${escapeHtml(w.phone || '')}', '${escapeHtml(meaningPlain)}')" title="${isMastered ? '已标注熟词（点击取消）' : '标注为熟词'}">
                            <span class="material-symbols-rounded">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                            <span>${isMastered ? '已掌握' : '熟词'}</span>
                        </button>
                        ${isLocalCustomBook ? `
                        <button type="button" class="btn btn-sm btn-danger book-viewer-act-btn" onclick="handleDeleteWordFromBookList('${escapeHtml(w.word)}')" title="移出词书">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                        ` : ''}
                        <span class="material-symbols-rounded book-viewer-chevron">expand_more</span>
                    </div>
                </div>

                ${isExp ? `
                <div class="book-viewer-word-drawer">
                    ${w.note ? `<div class="book-viewer-note"><span class="material-symbols-rounded" style="font-size:15px;">info</span><span>${escapeHtml(w.note)}</span></div>` : ''}
                    
                    <div class="book-viewer-meanings">
                        ${formattedMeaningHtml}
                    </div>

                    ${examplesList.length > 0 ? `
                        <div class="book-viewer-examples">
                            <div class="book-viewer-examples-title">
                                <span class="material-symbols-rounded" style="font-size:15px;">format_quote</span>
                                <span>例句 (${examplesList.length})</span>
                            </div>
                            <div class="book-viewer-examples-list">
                                ${examplesList.map(ex => `
                                    <div class="book-viewer-example-item">
                                        ${ex.trans ? `<div class="book-viewer-example-trans">【${escapeHtml(ex.trans)}】</div>` : ''}
                                        <div class="book-viewer-example-en">${escapeHtml(ex.en)}</div>
                                        ${ex.zh ? `<div class="book-viewer-example-zh">${escapeHtml(ex.zh)}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${((Array.isArray(w.derivatives) && w.derivatives.length > 0) || (Array.isArray(w.mistake) && w.mistake.length > 0) || (Array.isArray(w.antonyms) && w.antonyms.length > 0)) ? `
                        <div class="book-viewer-tags-row">
                            ${(Array.isArray(w.derivatives) && w.derivatives.length > 0) ? `
                                <div class="book-viewer-tag-group derivative">
                                    <strong>派生:</strong>
                                    <span>${w.derivatives.map(d => `${escapeHtml(d.name)}${d.pos ? ` (${escapeHtml(d.pos)})` : ''}${Array.isArray(d.trans) ? ` ${escapeHtml(d.trans.join('、'))}` : ''}`).join('； ')}</span>
                                </div>
                            ` : ''}
                            ${(Array.isArray(w.mistake) && w.mistake.length > 0) ? `
                                <div class="book-viewer-tag-group mistake">
                                    <strong>易错:</strong>
                                    <span>${escapeHtml(w.mistake.join(', '))}</span>
                                </div>
                            ` : ''}
                            ${(Array.isArray(w.antonyms) && w.antonyms.length > 0) ? `
                                <div class="book-viewer-tag-group antonym">
                                    <strong>反义:</strong>
                                    <span>${w.antonyms.map(a => typeof a === 'string' ? escapeHtml(a) : `${escapeHtml(a.name || a.word || '')}${Array.isArray(a.trans) ? ` ${escapeHtml(a.trans.join('、'))}` : (a.trans ? ` ${escapeHtml(a.trans)}` : '')}`).join('； ')}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="settings-card book-viewer-unified-card" style="padding:0; overflow:hidden;">
            ${itemsHtml}
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

let selectedMasteredBookId = 'all';
let selectedTrashBookId = 'all';

function renderMasteredBookDropdown() {
    const menu = document.getElementById('mastered-book-filter-menu');
    const label = document.getElementById('mastered-book-filter-label');
    if (!menu) return;

    const books = [];
    if (typeof BookManager !== 'undefined' && Array.isArray(BookManager.availableBooks)) {
        BookManager.availableBooks.forEach(b => {
            if (b && !books.some(x => x.id === b.id)) {
                books.push({ id: b.id, name: (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '') });
            }
        });
    }
    if (Array.isArray(window.customBooks)) {
        window.customBooks.forEach(b => {
            if (b && !books.some(x => x.id === b.id)) {
                books.push({ id: b.id, name: (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '') });
            }
        });
    }

    let activeName = '全部词书';
    if (selectedMasteredBookId !== 'all') {
        const found = books.find(b => b.id === selectedMasteredBookId);
        if (found) activeName = found.name;
    }
    if (label) label.innerText = activeName;

    menu.innerHTML = `
        <div class="md3-custom-select-option ${selectedMasteredBookId === 'all' ? 'active' : ''}" onclick="selectMasteredBook('all')">
            <span>全部词书</span>
            ${selectedMasteredBookId === 'all' ? '<span class="material-symbols-rounded">check</span>' : ''}
        </div>
        ${books.map(b => `
            <div class="md3-custom-select-option ${selectedMasteredBookId === b.id ? 'active' : ''}" onclick="selectMasteredBook('${escapeHtml(b.id)}')">
                <span>${escapeHtml(b.name)}</span>
                ${selectedMasteredBookId === b.id ? '<span class="material-symbols-rounded">check</span>' : ''}
            </div>
        `).join('')}
    `;
}
window.renderMasteredBookDropdown = renderMasteredBookDropdown;

function selectMasteredBook(bookId) {
    selectedMasteredBookId = bookId;
    if (typeof closeAllMd3Selects === 'function') closeAllMd3Selects();
    renderMasteredBookDropdown();
    renderMasteredWordsInSettings();
}
window.selectMasteredBook = selectMasteredBook;

function renderTrashBookDropdown() {
    const menu = document.getElementById('trash-book-filter-menu');
    const label = document.getElementById('trash-book-filter-label');
    if (!menu) return;

    const trash = getTrashWords();
    const books = [];
    trash.forEach(t => {
        const bId = t.originalBookId || 'unknown';
        const bName = (t.originalBookName || '原词书').replace(/^[📂📁\s]+/, '');
        if (!books.some(b => b.id === bId)) {
            books.push({ id: bId, name: bName });
        }
    });

    let activeName = '全部词书';
    if (selectedTrashBookId !== 'all') {
        const found = books.find(b => b.id === selectedTrashBookId);
        if (found) activeName = found.name;
    }
    if (label) label.innerText = activeName;

    menu.innerHTML = `
        <div class="md3-custom-select-option ${selectedTrashBookId === 'all' ? 'active' : ''}" onclick="selectTrashBook('all')">
            <span>全部词书</span>
            ${selectedTrashBookId === 'all' ? '<span class="material-symbols-rounded">check</span>' : ''}
        </div>
        ${books.map(b => `
            <div class="md3-custom-select-option ${selectedTrashBookId === b.id ? 'active' : ''}" onclick="selectTrashBook('${escapeHtml(b.id)}')">
                <span>${escapeHtml(b.name)}</span>
                ${selectedTrashBookId === b.id ? '<span class="material-symbols-rounded">check</span>' : ''}
            </div>
        `).join('')}
    `;
}
window.renderTrashBookDropdown = renderTrashBookDropdown;

function selectTrashBook(bookId) {
    selectedTrashBookId = bookId;
    if (typeof closeAllMd3Selects === 'function') closeAllMd3Selects();
    renderTrashBookDropdown();
    renderTrashWordsInSettings();
}
window.selectTrashBook = selectTrashBook;

function toggleExpandableSearch(wrapId, inputId) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const isExpanded = wrap.classList.contains('expanded');
    if (isExpanded) {
        closeExpandableSearch(wrapId, inputId);
    } else {
        wrap.classList.add('expanded');
        const input = document.getElementById(inputId);
        if (input) {
            if (typeof focusSearchInputReliable === 'function') {
                focusSearchInputReliable(input, () => wrap.classList.contains('expanded'), wrap);
            } else {
                void wrap.offsetWidth;
                try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
                requestAnimationFrame(() => {
                    if (wrap.classList.contains('expanded') && document.activeElement !== input) {
                        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
                    }
                });
            }
        }
    }
}
window.toggleExpandableSearch = toggleExpandableSearch;

function closeExpandableSearch(wrapId, inputId) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    wrap.classList.remove('expanded');
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
    }
}
window.closeExpandableSearch = closeExpandableSearch;

function buildMasteredWordRowHtml(item) {
    const word = typeof item === 'string' ? item : item.word;
    const phone = typeof item === 'string' ? '' : (item.phone || '');
    const meaning = typeof item === 'string' ? '' : (item.meaning || '');
    const isShiCi = isShiCiItem(item);

    return `
        <div class="bc-unified-item no-expand">
            <div class="bc-item-header"${meaning ? ' style="padding-bottom:4px;"' : ''}>
                <div class="bc-item-title-meta">
                    <span class="bc-headword">${escapeHtml(word)}</span>
                    ${phone ? `<span class="bc-phone">${escapeHtml(formatPhonetic(phone))}</span>` : ''}
                    ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.72rem; font-weight:700;">文言实词</span>` : ''}
                </div>
                <div class="bc-item-actions">
                    ${!isShiCi ? `
                    <button type="button" class="btn-circle-icon-action" onclick="playWordAudio('${escapeHtml(word)}')" title="发音">
                        <span class="material-symbols-rounded">volume_up</span>
                    </button>
                    ` : ''}
                    <button type="button" class="btn-circle-icon-action bc-mastered-btn mastered" onclick="handleUnmarkMastered('${escapeHtml(word)}')" title="取消熟词标记">
                        <span class="material-symbols-rounded">check_circle</span>
                    </button>
                </div>
            </div>
            ${meaning ? `<div class="bc-sub-meaning-row"><span class="bc-meaning-text">${escapeHtml(meaning)}</span></div>` : ''}
        </div>
    `;
}

/* Settings 熟词本页面渲染逻辑 */
function renderMasteredWordsInSettings() {
    renderMasteredBookDropdown();
    const container = document.getElementById('settings-mastered-container');
    const countEl = document.getElementById('settings-mastered-count');
    if (!container) return;

    let list = getMasteredWords();
    if (selectedMasteredBookId !== 'all') {
        list = list.filter(item => {
            const bId = item.bookId || item.originalBookId;
            return bId === selectedMasteredBookId;
        });
    }

    if (countEl) countEl.innerText = `共 ${list.length} 词`;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">check_circle</span>
                <p style="margin-top:8px; font-size:0.92rem;">暂无熟词</p>
            </div>
        `;
        return;
    }

    container.className = 'book-content-unified-card';
    container.innerHTML = list.map(buildMasteredWordRowHtml).join('');
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
    if (selectedMasteredBookId !== 'all') {
        list = list.filter(item => {
            const bId = item.bookId || item.originalBookId;
            return bId === selectedMasteredBookId;
        });
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

    container.className = 'book-content-unified-card';
    container.innerHTML = filtered.map(buildMasteredWordRowHtml).join('');
}

function buildTrashWordRowHtml(item) {
    const bookNameClean = (item.originalBookName || '原词书').replace(/^[📂📁\s]+/, '');
    return `
        <div class="bc-unified-item no-expand">
            <div class="bc-item-header"${item.meaning ? ' style="padding-bottom:4px;"' : ''}>
                <div class="bc-item-title-meta">
                    <span class="bc-headword">${escapeHtml(item.word)}</span>
                    ${item.phone ? `<span class="bc-phone">${escapeHtml(formatPhonetic(item.phone))}</span>` : ''}
                    <span class="bc-source-badge">来源：${escapeHtml(bookNameClean)}</span>
                </div>
                <div class="bc-item-actions">
                    <button type="button" class="btn-circle-icon-action" onclick="playWordAudio('${escapeHtml(item.word)}')" title="发音">
                        <span class="material-symbols-rounded">volume_up</span>
                    </button>
                    <button type="button" class="btn-circle-icon-action" onclick="restoreTrashWord('${item.id}')" title="恢复至词书">
                        <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary);">restore_from_trash</span>
                    </button>
                </div>
            </div>
            ${item.meaning ? `<div class="bc-sub-meaning-row"><span class="bc-meaning-text">${escapeHtml(item.meaning)}</span></div>` : ''}
        </div>
    `;
}

/* 渲染回收站完整列表 */
function renderTrashWordsInSettings() {
    renderTrashBookDropdown();
    const container = document.getElementById('settings-trash-container');
    const countEl = document.getElementById('settings-trash-count');
    if (!container) return;

    let trash = getTrashWords();
    if (selectedTrashBookId !== 'all') {
        trash = trash.filter(item => (item.originalBookId || 'unknown') === selectedTrashBookId);
    }

    if (countEl) countEl.innerText = `共 ${trash.length} 词`;

    if (trash.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">delete</span>
                <p style="margin-top:8px; font-size:0.92rem;">暂无已删词汇</p>
            </div>
        `;
        return;
    }

    container.className = 'book-content-unified-card';
    container.innerHTML = trash.map(buildTrashWordRowHtml).join('');
}

/* 搜索过滤回收站词汇 */
function filterTrashWordsDisplay() {
    const query = (document.getElementById('settings-trash-search')?.value || '').trim().toLowerCase();
    const container = document.getElementById('settings-trash-container');
    if (!container) return;

    let trash = getTrashWords();
    if (selectedTrashBookId !== 'all') {
        trash = trash.filter(item => (item.originalBookId || 'unknown') === selectedTrashBookId);
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

    container.className = 'book-content-unified-card';
    container.innerHTML = filtered.map(buildTrashWordRowHtml).join('');
}

var APP_VERSION = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : '2.15.0';
const APP_CHANGELOG = [
    {
        version: 'v2.15.0',
        date: '2026-11-28',
        badge: '当前版本',
        items: [
            '首次打开图标加载提速：为本地精简图标字体子集增加高优先级预加载并提前触发字体解码，全站业务脚本改为按序非阻塞 defer 加载，显著加快首次进入页面的图标渲染速度。',
            '页面返回与手势惯性动画升级：修复直接点击返回按钮时退出层离屏幕右端差一截的问题；iOS 边缘滑动返回松手后改为临界阻尼惯性弹簧物理模型，自然承接手指滑动速度补全剩余动画；修复进入新页面途中左滑打断导致原页面连带右移的问题。',
            '晒成绩海报与学习时长体验优化：恢复原版海报字体并统一四项学习指标的字号与字重，学习时长不足 1 分钟统一显示为“1分钟”；对战海报顶部改为随机抽取展示词（支持换词），将对战模式移至得分上方作为独立标题，并移除多余的天梯底行。',
            '排行榜与对决界面细节修复：修复排行榜长昵称导致“B站”徽标与右侧段位分数紧贴重叠的问题；修复对战答错等待提示条与上方选项卡片宽度不一致的问题。',
            'iOS PWA 与 B站 App Toy 安全区适配：接入新版 Toy JS SDK 容器能力（getContainerState / onContainerChange），在 B站 App 内直接读取 SDK 返回的 CSS px 安全区（top / right / bottom / left）动态适配屏幕旋转与沉浸态，并自动避让顶部胶囊按钮与底部互动条；增强 iOS 独立 PWA 顶部安全区避让；首页顶栏移除默认用户图标蓝色底色并统一图标尺寸，游客点击直接跳转登录页，单行放不下时自动收起为纯图标/头像。'
        ]
    },
    {
        version: 'v2.14.0',
        date: '2026-11-28',
        badge: '历史版本',
        items: [
            '熟词云端同步修复：修复熟词列表在云端同步合并时被误清空的严重 Bug，双端统一持久化与删除记录合并，确保同步后熟词完整保留；取消熟词标记时恢复原有掌握度并正常播放扣星动画。',
            '页面返回滚动位置记忆与防抖优化：返回上一页面及个人中心/设置主页时自动恢复之前的滚动位置，不再强制回到顶部；使用稳定滚动条占位避免有/无滚动条页面切换时产生横向跳变；修复进入登录页时顶部过渡背景未完全遮挡的问题。',
            '排行榜隐私与上榜引导升级：新注册账号默认不上榜，首次打开排行榜或排位等级分发生变化时弹窗询问是否显示在排行榜中，并支持随时在排行榜页面一键切换显示或隐藏自己。',
            '对战小结全面优化：将统计摘要头移至顶部并移除“展开全部”按钮；修复对战中错题识别与记录异常；移除多余的“错题”标签，取消熟词时同步移除“已标熟”标签；补全展开词条卡片之间的分割线。',
            '实词学习与小结修复：修复实词小结卡片展开后显示“暂无释义”的问题；修复背实词顶部进度计数（如 0 / 15）的排版与标熟同步问题。',
            '复习计划精简：将“全部”选项卡调整为“其他”（展示今日/明日/后日以外的计划），并移除紧急状态标签（review-plan-time-badge urgent）。',
            '晒成绩海报升级：新增“今日学习时长”与“累计学习时长”数据卡片；优化长词组与长释义的自适应缩放换行，避免超出海报宽度；移除海报预览弹窗多余的“取消”按钮。',
            '词书选择与背词设置优化：选择词书页面将已选词书置顶排列；切换“词性及释义展示”方式后立即刷新并生效；人机模式无法选择排位赛时，在“对战模式”下方提供小字原因说明。',
            '界面细节修复：确保查看词书页面展开搜索框时工具栏不换行；修复 MD3 浮动输入框标签（如修改用户名弹窗）背景色与容器背景不符的问题。'
        ]
    },
    {
        version: 'v2.13.0',
        date: '2026-11-21',
        badge: '历史版本',
        items: [
            '搜索聚焦稳定性全面修复：优化首页搜索框（避免只读占位输入框抢占焦点）、顶部折叠搜索按钮及展开式搜索按钮的聚焦时机，确保在页面进入与输入框展开过渡期间同步激活光标并在过渡结束后自动兜底校验。',
            '搜索标签页一键清空：在搜索多标签栏右侧新增“清空”按钮，支持一键清除全部搜索标签页并返回搜索主页。',
            '搜索设置释义来源归类：将搜索设置“释义来源”列表中的所有加密词书统一归类为独立的「Doris」来源选项，支持统一开关控制。',
            '手机端导航栏自动隐藏：在手机端（<= 767px）进入所有新页面及个人中心/设置二级子页面时统一隐藏底部栏与左侧栏，仅在首页、个人中心主页和设置主页保留导航栏。',
            '手机端页面滑入/返回与 iOS 手势体验优化：取消宽屏设备返回动画；修复手机端左滑返回过程中及返回上一页后的页面尺寸跳变问题（修正缩放系数、固定定位包含块与容器高度锁定，并调整状态提交顺序）；iOS 边缘左滑返回支持依据页面宽度、剩余距离与手势滑动力度动态调节过渡速度。',
            '返回首页稳定性修复：优化首页布局刷新与卡片过渡属性，修复回到首页时重复重排刷新卡片及触发卡片位移动画的问题。',
            '熟词永久免复习：优化单词与文言实词熟词机制，将词汇标为熟词后立即同步记为已掌握并清零复习计划，后续不再安排或抽取复习，也不受逾期惩罚或误答重置影响。'
        ]
    },
    {
        version: 'v2.12.0',
        date: '2026-11-15',
        badge: '历史版本',
        items: [
            '跨设备云端数据同步修复：完善 Supabase 多设备登录、全量快照拉取与双向合并逻辑，解决同一账号在不同设备间进度与学习统计不一致的问题。',
            '关闭自动同步与手动同步修复：修复关闭“自动同步”后顶部“同步数据”按钮在部分改动下不显示、记忆库与熟词变更未标记待同步，以及手动点击同步时被后台重试状态拦截或被预拉取覆盖本地配置导致云端未收到数据的问题。',
            '词性及释义展示设置修复：修复全局词性筛选与词条释义展示设置失效或不同步的异常。',
            '个人中心与移动端排版优化：缩小“最近学习词书”范围胶囊按钮尺寸、修复进度条统计数值异常，并重排词书元数据、内联进度条及“更多类型”下拉菜单定位，彻底解决菜单偏移至左上角的问题。',
            '详细数据页面图表体验升级：选中图表中的某一天后自动平滑居中聚焦并实时展示当日详细数据；关闭“显示详细数据”开关时仍强制标注选中日期的数据，并在学习时长趋势折线图选中点下方保留至 X 轴的辅助虚线；移除多余虚线、选中外容器框及“点击任意柱条查看当日详细数据”提示；修复邻近日期在 X 轴的重叠问题，高亮强调底部日期胶囊并精简重复文字。',
            '个人中心卡片与设置图标统一：优化“最近学习词书”封面与内联进度条的底部对齐效果；将“自定义首页”设置页中的各模式图标统一调整为圆形样式，与顶部搜索图标保持一致。',
            '查词结果页交互与结构优化：将加入本地词书与修改释义操作按钮上移至词头右侧并统一为与发音按钮协调的胶囊/圆形样式；将“添加到本地词书”面板移至分割线与词典来源标签栏上方，改用 bc-section-select-trigger 下拉样式、去除词数冗余并重构自适应布局避免按钮与下拉框重叠；自动加粗例句与辨析例句中的查询关键词。',
            '复习计划与交互精简：移除复习计划卡片上的阶段标签（review-plan-stage-tag）及页面滑动返回手势。',
            '查看词书内容页面升级：优化窄屏/移动端工具栏双行网格结构（第一行左侧分类筛选 + 右侧可平滑展开搜索，第二行等宽排列类型与展示模式选项卡），同时保留并增强非实词词库的 A–Z 首字母分类筛选。',
            '数据中心界面精简：移除个人中心列表中冗余的“数据同步”入口行，保持界面简洁。'
        ]
    },
    {
        version: 'v2.11.0',
        date: '2026-11-08',
        badge: '历史版本',
        items: [
            '背词与对战全模式小结上线：为背单词、背实词、人机对战、同屏对决、远程联机模式全面配备轻量扁平化小结页，排版风格保持高度一致，支持查看答题词条、音标、释义、复习状态与即时标熟。',
            '个人中心数据中心重构升级：顶部“晒成绩”按需替换为“同步数据”胶囊按钮（仅在存在未同步数据时灵动显示），支持一键云端对齐；数据统计卡片修复 undefined 异常并完善持久化；并将“晒成绩”、“下载学习数据”与“自动同步”开关整合至数据中心操作列表。',
            '个人中心架构与词书卡片瘦身：彻底移除多余的“备份与管理”模块，将离线模式开关整合至设置“网络与离线”；最近学习词书卡片移除冗余嵌套容器与双重外边框，更多操作菜单更新为绝对定位优雅弹窗；若词书无需更新则自动禁用“更新词书”按钮。',
            '“管理账号”全新子页面：顶部卡片精致展示用户头像、用户名、平台认证徽章与段位积分进度条；完整支持修改用户名、修改密码、切换账号、删除账号及退出登录，切换账号返回交互无缝回跳当前管理页，退出登录顺畅回到首页。',
            '详细数据子页面视觉重构：将“每日新学与复习词数”堆叠柱状图调整至“学习时长趋势”折线图前方，删除冗余的“词汇掌握度阶段分布”图表，聚焦关键学习数据。',
            '复习计划子页面全面优化：新增复习概览状态看板与快速日期筛选芯片（全部、待复习、今日、明日、未来7天），支持按具体日期精准筛选，优化紧急待复习呼吸灯徽章与音频试听。',
            '熟词本与回收站（已删除词汇）改版：顶栏改用 MD3 风格词书选择下拉列表，搜索框升级为右上角图标展开框；移除“清空熟词”与“永久删除”冗余按钮；词条卡片样式与查看词书内容页面全面统一。',
            '查看词书内容页面视觉与交互打磨：顶部工具栏统一为 32px 紧凑 MD3 胶囊风格；全部分类下拉框在仅有多分类时才展示；词条标题取消加粗，音标独立为分离圆角标签；典型例句关键词自动加粗高亮；修复反义词等拓展项解析为 [object Object] 的问题；彻底支持文言词组与短语点击展开与发音。',
            '背单词与背实词答题界面增强：答题卡片右上角掌握度菱形（◇ ◇ ◇ ◇ ◇）随作答正确率与熟词标记实时动态演进；工具栏全面换用规范 MD3 图标 ↩（撤回/上一个）与 ↪（重做/返回），界面更简洁高级。',
            '首页与布局优化：个人下拉菜单去除重复的用户名与段位信息；首页移除版权信息页脚；排行榜卡片右侧“查看”按钮位置与活动卡片统一右对齐。',
            '设置“编辑首页”优化：各模式图标采用统一的色块图标容器，移除模式卡片冗余描述文本；美化卡片上移/下移按钮；修复切换卡片显示开关时动画被重绘打断的问题；删除活动与排行榜卡片选项（受保护始终常驻）。',
            '道具系统优化：我的道具中为已过期的道具右上角增加删除按钮，支持本地与云端安全销毁已过期道具。',
            '“减弱动画效果”开启时，精准恢复所有输入框（包括 Wordle、搜索框等）的光标与输入动效。',
            '彻底清理错题本与状态设置遗留代码，系统轻量化运行更流畅。'
        ]
    },
    {
        version: 'v2.10.0',
        date: '2026-11-01',
        badge: '历史版本',
        items: [
            '统一词书卡片、筛选下拉菜单及数量统计字体，全面采用页面标准 UI 字体。',
            '优化词书封面排版设计，封面文字标题在色块卡片中严格垂直与水平居中。',
            '优化词书卡片结构，移除冗余分类标签与不支持Wordle标签，紧凑掌握度与进度条垂直间隙，确保与封面底部严丝合缝平齐。',
            '在 Wordle 选词页面中对不支持 Wordle 模式的词书直接标灰并禁止点击选择。',
            '词书筛选下拉菜单升级：标题重命名为“选择分类”，移除子项“板块”前缀并优化文字与容器结构，彻底避免文字过长截断。',
            '晒成绩结果页分享按钮样式与交互动画升级，全面对齐 Wordle 挑战海报按钮的 MD3 Tonal 风格与按压缩放动画反馈。',
            '搜索设置功能拓展：优化“显示相关词组”与“显示相关链接”文字描述，新增“显示例句”、“显示反义词”、“显示辨析”开关，支持对考纲拓展项自由定制展示并实时生效。',
            '优化查词与词典页面视觉效果，去除相关词组外边框并统一相关链接样式。',
            '在设置中添加“减弱动画效果”功能，确保在低性能设备上流畅运行。',
            '修复减弱动态效果开启时切换至个人中心界面的画面抖动问题。',
            '放缓页面切换淡入位移动画时长至 0.32s，大幅提升视效平滑度。',
            '拆分词书学习范围为“板块”与“类型”两个独立的 MD3 下拉菜单，重做交互 UI 并修复弹出定位偏差。',
            '统一词书卡片网格布局，信息紧凑上移并严格与封面高度齐平，管理词书模式下隐藏学习范围按钮。',
            '修复词书操作更多菜单的右边缘定位偏移，彻底解决菜单被屏幕右边缘裁切的问题。',
            '修复管理词书中点击“查看内容”误跳回设置页面的问题，支持在当前页面以弹窗形式快速查阅展开词条。',
            '移除管理词书卡片操作菜单中冗余的“板块与类型设置”选项。',
            '重构词书内容查看子页面（参考背词小结页面），采用统一列表容器展示，默认折叠释义并提供查词、发音与标熟词快捷按钮，点击词条可向下展开详情。',
            '优化背单词小结页面，合并所有词条为统一容器并支持展开查词、发音与标为熟词。',
            '优化背单词小结滚动条可见度，提升对比度。',
            '优化搜索标签栏鼠标滚轮横向滚动支持。',
            '修复主页在各端导航与切换时的页面结构突变与卡片间距问题。',
            '修复 Electron 本地词书读取中不规范参数引发的 DeprecationWarning 告警。',
            '全面适配《高中考纲》词书与专属例句、派生、辨析、反义拓展项。',
            '修复若干已知 UI 与交互问题。'
        ]
    },
    {
        version: 'v2.9.0',
        date: '2026-10-18',
        badge: '历史版本',
        items: [
            '添加“活动”系统。',
            '添加“道具”系统。',
            '添加“邮箱”系统。',
            '优化底部栏显示。',
            '优化下载学习数据功能。',
            '优化UI。',
            '修复账号解封后仍无法登录的bug。',
            '修复排位赛等级分计算问题。',
            '修复若干bug。'
        ]
    },
    {
        version: 'v2.8.0',
        date: '2026-10-16',
        badge: '历史版本',
        items: [
            '加入下载学习数据功能。',
            '优化离线模式的词书分类系统。',
            '离线模式下同屏对决支持选择其他本地账号作为对手。',
            '优化更新功能。'
        ]
    },
    {
        version: 'v2.7.0',
        date: '2026-10-13',
        badge: '历史版本',
        items: [
            '加入离线模式。',
            '更新词书并优化分类。',
            '优化选择词书、管理词书页面。',
            '优化更新功能。',
            '优化离线版本体验。',
            '优化UI。',
            '优化搜索页面。',
            '优化无网环境下的应用打开速度。',
            '修复无法导入词书的 bug。',
            '在背单词设置中添加学习顺序设置。',
            '在背实词设置中添加复习节奏设置。'
        ]
    },
    {
        version: 'v2.6.1',
        date: '2026-10-08',
        badge: '历史版本',
        items: [
            '更新生成海报和分享功能。',
            '添加更多词书。',
            '只有排位赛限制云端词书，友谊赛可以选择本地词书。',
            '优化UI。',
            '重构supabase realtime架构。',
            '在首页点击搜索栏时，直接进入搜索页面。',
            '搜索列表不再显示实词结果。',
            '可以在搜索设置中勾选需要展示释义的词书。',
            '在设置中支持开启/关闭自动同步。',
            '流量环境下降低同步数据频率，节省流量消耗。',
            '标为熟词后，在本组学习中不再抽取。',
            '只有当对方响应后或请求超时后才能再次发送邀请。',
            '修复若干bug。'
        ]
    },
    {
        version: 'v2.4.11',
        date: '2026-10-01',
        badge: '历史版本',
        items: [
            '支持使用第三方账号注册和登录。',
            '加入段位+等级分制度。',
            '加入排位赛。',
            '加入每日Wordle竞赛。',
            '加入排行榜功能。',
            '加入新词书。',
            '优化人机对战。',
            '优化英语默写：答错后支持订正、添加工具栏、优化UI。',
            '优化标注熟词逻辑。',
            '优化邀请对决逻辑。',
            '优化背词小结。',
            '优化数据同步。',
            '优化Wordle设置逻辑。',
            '优化UI。',
            '修复英语词组中带有=、/的题，左右两边互换算错的bug。',
            '修复添加到主屏幕后无法保存本地数据的bug。',
            '修复Wordle选择词组词书时卡死的bug。',
            '修复打开设置时强制要求在b站中打开的bug。',
            '修复词书学习进度不更新的bug。',
            '修复词书掌握度一直显示为0的bug。',
            '修复背词小结中错题重复显示的bug。',
            '修复对战双方抽取的题库不一致的bug。',
            '修复更新弹窗无法下载最新版本文件的bug。',
            '修复登录账号时卡死的bug。',
            '修复人机模式退出对决按钮无效的bug。',
            '修复待复习词数显示错误的bug。',
            '修复答错题后增加进度和总题数的bug。',
            '修复抽取的题组答完无法继续答题的bug。',
            '支持记住登录状态和快捷切换账号。',
            '支持切换在线和隐身状态。',
            '联机对战需要等待所有玩家准备后再开始。',
            'Wordle 草稿行与上方对齐，方便对照。',
            'Wordle 支持自由输入，且不再调起系统键盘。',
            'Wordle 支持显示计时器、查看历史记录。',
            '词组答错，惩罚时间结束后自动放回错误的词块。',
            '仅本地词书支持添加词块和修改释义。',
            '在设置-更新日志中可以切换云端日志和本地日志。',
            '上传头像时支持调整显示区域和大小。'
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

        const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases?per_page=15', {
            signal: controller.signal
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (ghRes && ghRes.ok) {
            const releases = await ghRes.json();
            if (Array.isArray(releases) && releases.length > 0) {
                cachedCloudChangelog = releases.map((rel, idx) => {
                    const version = rel.tag_name || `v${rel.name || ''}`;
                    const currentVer = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : (window.APP_VERSION || '2.9.0'));
                    const compareFn = typeof semverCompare === 'function' ? semverCompare : (typeof window !== 'undefined' && window.semverCompare ? window.semverCompare : null);
                    const cmp = compareFn ? compareFn(version, currentVer) : 0;
                    const isCurrent = cmp === 0;
                    const isNewer = cmp > 0;
                    let badge = '历史版本';
                    if (isCurrent) {
                        badge = '当前版本';
                    } else if (isNewer) {
                        badge = '最新版本';
                    } else if (idx === 0) {
                        badge = '云端最新';
                    }
                    const date = (rel.published_at || '').substring(0, 10);
                    const rawBody = (rel.body || '').trim() || '查看 GitHub Release 获取完整详情';
                    return {
                        version,
                        date,
                        badge,
                        rawBody,
                        items: [rawBody],
                        htmlUrl: rel.html_url,
                        isHighlight: isCurrent || isNewer || idx === 0
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
    const raw = query || '';
    const clearBtn = document.getElementById('settings-filter-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = raw.length > 0 ? 'flex' : 'none';
    }
    const q = raw.trim().toLowerCase();
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

function clearSettingsFilterInput(e) {
    if (e) e.stopPropagation();
    const inp = document.getElementById('settings-filter-input');
    if (inp) {
        inp.value = '';
        filterSettingsRows('');
        if (typeof focusSearchInputElement === 'function') {
            focusSearchInputElement(inp);
        } else {
            inp.focus();
        }
    }
}
window.clearSettingsFilterInput = clearSettingsFilterInput;

function isAutoSyncEnabled() {
    try {
        const val = localStorage.getItem('vocab_auto_sync_enabled');
        if (val === null) return true; // 默认开启
        return val === 'true' || val === true || val === '1';
    } catch (e) {
        return true;
    }
}
window.isAutoSyncEnabled = isAutoSyncEnabled;

function toggleAutoSyncSetting(enabled) {
    try {
        localStorage.setItem('vocab_auto_sync_enabled', enabled ? 'true' : 'false');
        if (typeof updateSyncButtonStatus === 'function') {
            updateSyncButtonStatus();
        }
        if (enabled && window.SyncManager && Array.isArray(window.SyncManager.pendingQueue) && window.SyncManager.pendingQueue.length > 0 && typeof window.SyncManager.flush === 'function') {
            window.SyncManager.flush({ silent: true });
        }
    } catch (e) {
        console.error('Failed to save auto sync setting', e);
    }
}
window.toggleAutoSyncSetting = toggleAutoSyncSetting;

/* ==========================================================================
   编辑首页布局与卡片配置 (隐藏卡片 / 调整 modes-grid 顺序 / 收起搜索栏)
   ========================================================================== */
const HOME_MODE_CARD_META = {
    'mode-single': { title: '背单词', icon: 'track_changes', bg: '#FFDAD6', color: '#B3261E' },
    'mode-duel': { title: '对战', icon: 'public', bg: '#D1E4FF', color: '#0061A4' },
    'mode-dictation': { title: '英语默写', icon: 'spellcheck', bg: '#D1E4FF', color: '#0061A4' },
    'mode-shici': { title: '背实词', icon: 'history_edu', bg: '#E0F2FE', color: '#006874' },
    'mode-riddle': { title: 'Word Riddles', icon: 'grid_view', bg: '#E8DEF8', color: '#6750A4' }
};

function renderEditHomeSettings() {
    const cfg = (typeof getHomeLayoutConfig === 'function')
        ? getHomeLayoutConfig()
        : { collapseSearchBar: false, hiddenCards: [], modeOrder: Object.keys(HOME_MODE_CARD_META) };
    const hiddenSet = new Set(cfg.hiddenCards || []);

    const searchSwitch = document.getElementById('switch-home-collapse-search');
    if (searchSwitch) {
        searchSwitch.checked = Boolean(cfg.collapseSearchBar);
    }

    const chkOnlinePlayers = document.getElementById('switch-home-card-online-players');
    if (chkOnlinePlayers) {
        chkOnlinePlayers.checked = !hiddenSet.has('hub-online-players-card');
    }

    const chkCalendar = document.getElementById('switch-home-card-calendar');
    if (chkCalendar) {
        chkCalendar.checked = !hiddenSet.has('hub-calendar-card');
    }

    const modeListEl = document.getElementById('edit-home-modes-list');
    if (modeListEl) {
        const order = Array.isArray(cfg.modeOrder) ? cfg.modeOrder : Object.keys(HOME_MODE_CARD_META);
        modeListEl.innerHTML = order.map((cardId, idx) => {
            const meta = HOME_MODE_CARD_META[cardId] || { title: cardId, icon: 'widgets', bg: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-primary)' };
            const isVisible = !hiddenSet.has(cardId);
            const isFirst = idx === 0;
            const isLast = idx === order.length - 1;
            return `
                <div class="settings-row edit-home-mode-row" style="padding:12px 16px; display:flex; align-items:center; justify-content:space-between;">
                    <div class="settings-row-left" style="display:flex; align-items:center; gap:12px;">
                        <div class="settings-icon-box" style="background:${meta.bg}; color:${meta.color}; border-radius:50%;">
                            <span class="material-symbols-rounded" style="font-size:22px;">${meta.icon}</span>
                        </div>
                        <div class="settings-row-text">
                            <h4 style="margin:0; font-size:0.95rem; font-weight:600; color:var(--md-sys-color-on-surface);">${escapeHtml(meta.title)}</h4>
                        </div>
                    </div>
                    <div class="settings-row-action" style="display:flex; align-items:center; gap:6px;">
                        <button type="button" class="btn-icon-move" onclick="moveHomeModeCard('${cardId}', -1)" ${isFirst ? 'disabled' : ''} title="上移">
                            <span class="material-symbols-rounded" style="font-size:18px;">arrow_upward</span>
                        </button>
                        <button type="button" class="btn-icon-move" onclick="moveHomeModeCard('${cardId}', 1)" ${isLast ? 'disabled' : ''} title="下移">
                            <span class="material-symbols-rounded" style="font-size:18px;">arrow_downward</span>
                        </button>
                        <label class="md3-switch" style="margin-left:6px;" title="${isVisible ? '显示中' : '已隐藏'}">
                            <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleHomeCardVisibility('${cardId}', this.checked)">
                            <span class="md3-switch-track">
                                <span class="md3-switch-thumb"></span>
                            </span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }
}
window.renderEditHomeSettings = renderEditHomeSettings;

function toggleHomeSearchBarCollapse(checked) {
    if (typeof getHomeLayoutConfig !== 'function' || typeof saveHomeLayoutConfig !== 'function') return;
    const cfg = getHomeLayoutConfig();
    cfg.collapseSearchBar = Boolean(checked);
    saveHomeLayoutConfig(cfg);
    if (typeof applyHomeLayoutConfig === 'function') {
        applyHomeLayoutConfig();
    }
}
window.toggleHomeSearchBarCollapse = toggleHomeSearchBarCollapse;

function toggleHomeCardVisibility(cardId, isVisible) {
    if (cardId === 'hub-activity-entry-card' || cardId === 'hub-leaderboard-entry-card') {
        showToast('活动与排行榜卡片禁止隐藏');
        return;
    }
    if (typeof getHomeLayoutConfig !== 'function' || typeof saveHomeLayoutConfig !== 'function') return;
    const cfg = getHomeLayoutConfig();
    const set = new Set(cfg.hiddenCards || []);
    if (isVisible) {
        set.delete(cardId);
    } else {
        set.add(cardId);
    }
    cfg.hiddenCards = Array.from(set);
    saveHomeLayoutConfig(cfg);
    if (typeof applyHomeLayoutConfig === 'function') {
        applyHomeLayoutConfig();
    }
}
window.toggleHomeCardVisibility = toggleHomeCardVisibility;

function moveHomeModeCard(cardId, direction) {
    if (typeof getHomeLayoutConfig !== 'function' || typeof saveHomeLayoutConfig !== 'function') return;
    const cfg = getHomeLayoutConfig();
    const order = [...(cfg.modeOrder || Object.keys(HOME_MODE_CARD_META))];
    const idx = order.indexOf(cardId);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const temp = order[idx];
    order[idx] = order[targetIdx];
    order[targetIdx] = temp;
    cfg.modeOrder = order;
    saveHomeLayoutConfig(cfg);
    renderEditHomeSettings();
}
window.moveHomeModeCard = moveHomeModeCard;

function resetHomeLayoutDefault() {
    if (typeof saveHomeLayoutConfig !== 'function') return;
    saveHomeLayoutConfig({
        collapseSearchBar: false,
        hiddenCards: [],
        modeOrder: Object.keys(HOME_MODE_CARD_META)
    });
    renderEditHomeSettings();
    showToast('已恢复默认首页布局');
}
window.resetHomeLayoutDefault = resetHomeLayoutDefault;


