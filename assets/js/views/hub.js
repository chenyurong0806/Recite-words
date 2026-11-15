/**
 * 学习主站大厅与导航中枢
 * Module: assets/js/views/hub.js
 */

let toastTimer = null;
function showToast(text, duration = 2600) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) return;
    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }
    const ms = (typeof duration === 'number' && !isNaN(duration) && duration > 0) ? duration : 2800;
    snackbar.innerText = text;
    snackbar.classList.add('show');
    toastTimer = setTimeout(() => {
        snackbar.classList.remove('show');
        toastTimer = null;
    }, ms);
}

let currentView = 'view-auth';
window.currentView = currentView;
let previousView = 'view-hub';
window.previousView = previousView;

function goBackToPreviousView(fallback = 'view-hub') {
    const prev = window.previousView || fallback;
    if (!prev || prev === currentView) {
        switchView(fallback);
    } else {
        switchView(prev);
    }
}
window.goBackToPreviousView = goBackToPreviousView;

function switchView(viewId) {
    if (currentView && currentView !== viewId) {
        previousView = currentView;
        window.previousView = currentView;
    }
    currentView = viewId;
    window.currentView = viewId;
    if (typeof resetAllGameAlertsAndFeedback === 'function') {
        resetAllGameAlertsAndFeedback();
    }

    // 学习时长计时器管理：进入学习/练习视图时开启计时，离开时结算保存
    const studyTimerViews = ['view-single', 'view-shici', 'view-dictation', 'view-riddle', 'view-game', 'view-local-duel'];
    if (window.DailyStudyTracker) {
        if (studyTimerViews.includes(viewId)) {
            window.DailyStudyTracker.startSessionTimer();
        } else {
            window.DailyStudyTracker.flushSessionTimer(false);
        }
    }

    const hideNavViews = ['view-auth', 'view-single', 'view-game', 'view-local-duel', 'view-dictation', 'view-riddle', 'view-shici', 'view-search', 'view-book-selector', 'view-manage-books', 'view-book-content', 'view-online', 'view-result', 'view-leaderboard', 'view-riddle-history', 'view-activity', 'view-mailbox'];

    const shouldHideNav = hideNavViews.includes(viewId) || (!currentUser && viewId === 'view-auth');

    if (shouldHideNav) {
        document.body.classList.remove('has-nav');
        document.body.classList.add('nav-hidden');
    } else {
        document.body.classList.add('has-nav');
        document.body.classList.remove('nav-hidden');
    }

    if (typeof updateNavActive === 'function') {
        const navKey = viewId === 'view-settings' ? 'settings' : (viewId === 'view-me' ? 'me' : 'home');
        updateNavActive(navKey);
    }

    const views = document.querySelectorAll('.view');
    for (let i = 0; i < views.length; i++) {
        const v = views[i];
        const isTarget = (v.id === viewId);
        if (isTarget) {
            if (!v.classList.contains('active')) v.classList.add('active');
            v.inert = false;
            v.removeAttribute('aria-hidden');
        } else {
            if (v.classList.contains('active')) v.classList.remove('active');
            v.inert = true;
            v.setAttribute('aria-hidden', 'true');
        }
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    if (viewId === 'view-hub') {
        const hubInp = document.getElementById('hub-search-input');
        if (hubInp) hubInp.value = '';
        const hubClear = document.getElementById('hub-search-clear-btn');
        if (hubClear) hubClear.style.display = 'none';
        const hubSuggs = document.getElementById('hub-search-suggestions');
        if (hubSuggs) hubSuggs.style.display = 'none';
        updateHub();
        requestAnimationFrame(() => {
            if (currentUser && typeof initGlobalPresence === 'function') {
                initGlobalPresence();
            }
        });
    } else if (viewId === 'view-auth') {
        if (typeof renderAuthView === 'function') renderAuthView();
    } else if (viewId === 'view-me') {
        const activeKey = window.__targetMeSubview || 'main';
        window.__targetMeSubview = null;
        const meSubviews = ['main', 'books', 'words', 'mastered', 'trash', 'export-data', 'items', 'account', 'detailed-stats', 'review-plan'];
        meSubviews.forEach(k => {
            const el = (k === 'main')
                ? document.getElementById('me-subview-main')
                : document.getElementById(`settings-subview-${k}`);
            if (el) {
                const isActiveSub = (k === activeKey);
                el.classList.toggle('active', isActiveSub);
                el.inert = !isActiveSub;
                if (isActiveSub) el.removeAttribute('aria-hidden');
                else el.setAttribute('aria-hidden', 'true');
            }
        });
        if (activeKey === 'main' && typeof renderMeView === 'function') {
            renderMeView();
        }
    } else if (viewId === 'view-settings') {
        if (typeof switchSettingsSubview === 'function') {
            switchSettingsSubview('main', true);
        }
    } else if (viewId === 'view-online') {
        const inRoomEl = document.getElementById('online-in-room');
        const isInRoom = inRoomEl && inRoomEl.style.display !== 'none' && typeof roomCode !== 'undefined' && roomCode;
        if (!isInRoom) {
            requestAnimationFrame(() => {
                if (typeof fetchOnlineRoomsList === 'function') {
                    fetchOnlineRoomsList();
                    initGlobalPresence();
                }
            });
        }
    } else if (viewId === 'view-search') {
        const searchInp = document.getElementById('search-page-input');
        if (!searchInp || !searchInp.value || !searchInp.value.trim()) {
            if (typeof showSearchHistoryView === 'function') {
                showSearchHistoryView();
            }
        }
    } else if (viewId === 'view-riddle') {
        if (typeof restoreRiddleViewOverlays === 'function') {
            restoreRiddleViewOverlays();
        }
    }
}

let isNetworkOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;

function checkNetworkStatus(explicitState) {
    if (typeof explicitState === 'boolean') {
        isNetworkOnline = explicitState;
    } else {
        isNetworkOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
    }

    if (typeof updateGlobalNetworkBadge === 'function') {
        if (!isNetworkOnline) {
            updateGlobalNetworkBadge('CLOSED');
        } else if (typeof currentConnectionQuality !== 'undefined' && (currentConnectionQuality === 'connected' || currentConnectionQuality === 'connecting' || currentConnectionQuality === 'degraded')) {
            updateGlobalNetworkBadge(currentConnectionQuality);
        } else {
            updateGlobalNetworkBadge('online');
        }
    } else {
        const badge = document.getElementById('hub-online-offline-badge');
        const badgeText = document.getElementById('hub-online-offline-text');
        if (badge && badgeText) {
            if (!isNetworkOnline) {
                badge.className = 'network-status-badge offline';
                badgeText.innerText = '离线';
            } else {
                badge.className = 'network-status-badge online';
                badgeText.innerText = '在线';
            }
        }
    }

    const btnOnline = document.getElementById('btn-enter-online');
    if (btnOnline) {
        if (isNetworkOnline) {
            btnOnline.disabled = false;
            btnOnline.title = '进入联机大厅';
            btnOnline.style.opacity = '1';
            btnOnline.style.cursor = 'pointer';
        } else {
            btnOnline.disabled = true;
            btnOnline.title = '当前无网络连接，联机不可用';
            btnOnline.style.opacity = '0.45';
            btnOnline.style.cursor = 'not-allowed';
        }
    }
}

function handleEnterOnlineClick() {
    if (!isNetworkOnline) {
        showToast('当前处于离线状态，远程联机不可用');
        return;
    }
    switchView('view-online');
}

window.addEventListener('online', () => {
    checkNetworkStatus(true);
    showToast('已恢复网络连接');
});

window.addEventListener('offline', () => {
    checkNetworkStatus(false);
    showToast('网络已断开');
});

// Safari / WebKit 页面从缓存恢复 (bfcache) 时及时纠正网络在线状态
window.addEventListener('pageshow', () => {
    checkNetworkStatus();
});

function toggleHubUserDropdown(event) {
    if (event) event.stopPropagation();
    const dd = document.getElementById('hub-user-dropdown');
    if (!dd) return;
    const isVisible = dd.style.display === 'block';
    if (isVisible) {
        closeHubUserDropdown();
    } else {
        updateHub();
        dd.style.display = 'block';
    }
}

function closeHubUserDropdown() {
    const dd = document.getElementById('hub-user-dropdown');
    if (dd) dd.style.display = 'none';
}

const DEFAULT_HOME_MODE_ORDER = [
    'mode-duel',
    'mode-single',
    'mode-shici',
    'mode-riddle',
    'mode-dictation'
];

function getHomeLayoutConfig() {
    const def = {
        collapseSearchBar: false,
        hiddenCards: [],
        modeOrder: [...DEFAULT_HOME_MODE_ORDER]
    };
    try {
        const raw = localStorage.getItem('vocab_home_layout_config');
        if (!raw) return def;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return def;
        const hidden = Array.isArray(parsed.hiddenCards)
            ? parsed.hiddenCards.filter(id => id !== 'hub-activity-entry-card' && id !== 'hub-leaderboard-entry-card')
            : [];
        let order = Array.isArray(parsed.modeOrder) ? parsed.modeOrder.filter(id => DEFAULT_HOME_MODE_ORDER.includes(id)) : [...DEFAULT_HOME_MODE_ORDER];
        DEFAULT_HOME_MODE_ORDER.forEach(id => {
            if (!order.includes(id)) order.push(id);
        });
        return {
            collapseSearchBar: Boolean(parsed.collapseSearchBar),
            hiddenCards: hidden,
            modeOrder: order
        };
    } catch (e) {
        return def;
    }
}
window.getHomeLayoutConfig = getHomeLayoutConfig;

function saveHomeLayoutConfig(cfg) {
    const clean = {
        collapseSearchBar: Boolean(cfg.collapseSearchBar),
        hiddenCards: Array.isArray(cfg.hiddenCards)
            ? cfg.hiddenCards.filter(id => id !== 'hub-activity-entry-card' && id !== 'hub-leaderboard-entry-card')
            : [],
        modeOrder: Array.isArray(cfg.modeOrder) ? cfg.modeOrder : [...DEFAULT_HOME_MODE_ORDER]
    };
    localStorage.setItem('vocab_home_layout_config', JSON.stringify(clean));
    applyHomeLayoutConfig();
}
window.saveHomeLayoutConfig = saveHomeLayoutConfig;

function applyHomeLayoutConfig() {
    const cfg = getHomeLayoutConfig();
    const hiddenSet = new Set(cfg.hiddenCards || []);

    // 1. 搜索栏收起/展开控制
    const searchWrapper = document.querySelector('#view-hub .hub-search-wrapper');
    const appBarSearchBtn = document.getElementById('btn-hub-appbar-search');
    if (searchWrapper) {
        searchWrapper.style.display = cfg.collapseSearchBar ? 'none' : '';
    }
    if (appBarSearchBtn) {
        appBarSearchBtn.style.display = cfg.collapseSearchBar ? 'inline-flex' : 'none';
    }

    // 2. 活动和排行榜禁止隐藏，强制保持 flex 布局显示
    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const actCard = document.getElementById('hub-activity-entry-card');
    if (actCard) actCard.style.display = isOffline ? 'none' : 'flex';
    const lbCard = document.getElementById('hub-leaderboard-entry-card');
    if (lbCard) lbCard.style.display = 'flex';

    // 3. 独立卡片隐藏控制（在线玩家卡片、学习日历卡片）
    const onlineCard = document.getElementById('hub-online-players-card');
    if (onlineCard) {
        onlineCard.style.display = hiddenSet.has('hub-online-players-card') ? 'none' : '';
    }
    const calendarCard = document.getElementById('hub-calendar-card') || document.querySelector('#view-hub .week-calendar-card');
    if (calendarCard) {
        calendarCard.style.display = hiddenSet.has('hub-calendar-card') ? 'none' : '';
    }

    // 4. modes-grid 卡片顺序与隐藏控制
    const modesGrid = document.querySelector('#view-hub .modes-grid');
    if (modesGrid) {
        const cardMap = new Map();
        Array.from(modesGrid.children).forEach(el => {
            const cid = el.getAttribute('data-home-card-id') || el.id;
            if (cid) cardMap.set(cid, el);
        });
        cfg.modeOrder.forEach(cid => {
            const el = cardMap.get(cid);
            if (el) {
                el.style.display = hiddenSet.has(cid) ? 'none' : '';
                modesGrid.appendChild(el);
            }
        });
    }
}
window.applyHomeLayoutConfig = applyHomeLayoutConfig;

document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#hub-user-pill') && !e.target.closest('#hub-user-dropdown')) {
        closeHubUserDropdown();
    }
});

function updateHub() {
    if (!currentUser) currentUser = '游客';
    
    // 更新右上角用户胶囊与登录按钮
    const userNameEl = document.getElementById('hub-user-name');
    const userImgEl = document.getElementById('hub-user-avatar-img');
    const userIconEl = document.getElementById('hub-user-avatar-icon');
    const loginBtnEl = document.getElementById('btn-hub-login');
    const profileTag = document.getElementById('hub-profile-tag');

    if (userNameEl) userNameEl.innerText = currentUser;
    if (profileTag) profileTag.innerText = currentUser;

    let avatar = (typeof getUserAvatar === 'function') ? getUserAvatar(currentUser) : '';
    if (avatar && avatar.startsWith('//')) avatar = 'https:' + avatar;
    if (avatar && userImgEl && userIconEl) {
        userImgEl.onerror = () => {
            userImgEl.style.display = 'none';
            userIconEl.style.display = 'inline-flex';
        };
        userImgEl.onload = () => {
            userImgEl.style.display = 'block';
            userIconEl.style.display = 'none';
        };
        userImgEl.src = avatar;
        userImgEl.style.display = 'block';
        userIconEl.style.display = 'none';
    } else if (userImgEl && userIconEl) {
        userImgEl.style.display = 'none';
        userIconEl.style.display = 'inline-flex';
    }

    const isLoggedIn = currentUserProfile && currentUserProfile.isLoggedIn;
    if (loginBtnEl) {
        loginBtnEl.style.display = isLoggedIn ? 'none' : 'inline-flex';
    }

    // 更新首页右上角等级展示
    const levelBadge = document.getElementById('hub-user-level-badge');
    if (levelBadge) {
        if (typeof LevelManager !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
            const lData = LevelManager.getLevelData(currentUser);
            levelBadge.style.display = 'inline-flex';
            levelBadge.innerText = `${lData.rank}段`;
            levelBadge.title = `段位：${lData.rank}段 (总等级分：${lData.rating}分)`;
        } else {
            levelBadge.style.display = 'none';
        }
    }

    const ddUsername = document.getElementById('hub-dd-username');
    const ddLevelText = document.getElementById('hub-dd-level-text');
    const ddLogged = document.getElementById('hub-dd-logged-actions');
    const ddGuest = document.getElementById('hub-dd-guest-actions');
    if (ddUsername) ddUsername.innerText = currentUser || '游客';
    if (ddLevelText) {
        if (typeof LevelManager !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
            const lData = LevelManager.getLevelData(currentUser);
            ddLevelText.innerText = `${lData.rank}段 (${lData.rating}分)`;
        } else {
            ddLevelText.innerText = '登录后解锁段位和排位赛功能';
        }
    }
    if (ddLogged && ddGuest) {
        const isLogged = currentUser && !currentUser.startsWith('游客');
        ddLogged.style.display = isLogged ? 'block' : 'none';
        ddGuest.style.display = isLogged ? 'none' : 'block';
    }

    const statTotal = document.getElementById('stat-total');
    const statAcc = document.getElementById('stat-acc');
    if (statTotal) statTotal.innerText = userStats.total || 0;
    if (statAcc) statAcc.innerText = (userStats.total > 0) ? Math.round((userStats.correct / userStats.total) * 100) + '%' : '0%';

    applyHomeLayoutConfig();
    checkNetworkStatus();
    updateHubResumeButtons();

    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const btnDailyWordle = document.getElementById('btn-hub-daily-wordle');
    if (btnDailyWordle) {
        btnDailyWordle.style.display = isOffline ? 'none' : '';
    }

    if (window.DailyStudyTracker) {
        window.DailyStudyTracker.renderWeekCalendar(currentCalendarWeekOffset);
    }

    requestAnimationFrame(() => {
        if (window.EbbinghausEngine) {
            window.EbbinghausEngine.updateDueBadge();
        }
        if (typeof updateHubShiCiBadge === 'function') {
            updateHubShiCiBadge();
        }
        if (typeof initSearchTabs === 'function') {
            initSearchTabs();
        }
        if (typeof ActivityManager !== 'undefined') {
            ActivityManager.updateBadge();
        }
        if (typeof MailManager !== 'undefined') {
            MailManager.updateBadge();
        }
    });
}

// 刷新主页中背单词与 Wordle 的按钮文本（有未完成进度时显示“继续学习” / “继续解谜”）
function updateHubResumeButtons() {
    const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';

    // 1. 英语新词学习进度
    const singleSaved = localStorage.getItem(`single_learn_progress_${u}`) || localStorage.getItem(`single_progress_${u}`) || localStorage.getItem('single_learn_progress_guest') || localStorage.getItem('single_progress_guest');
    const learnBtnText = document.getElementById('btn-hub-learn-text');
    if (learnBtnText) {
        let restored = false;
        if (singleSaved) {
            try {
                const parsed = JSON.parse(singleSaved);
                if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length && (!parsed.isReview && !String(parsed.sessionName).includes('复习'))) {
                    learnBtnText.innerText = `继续(${parsed.currentIdx + 1}/${parsed.pool.length})`;
                    restored = true;
                }
            } catch (e) { }
        }
        if (!restored) {
            learnBtnText.innerText = '学习新词';
        }
    }

    // 2. 英语复习进度
    const reviewSaved = localStorage.getItem(`single_review_progress_${u}`) || localStorage.getItem('single_review_progress_guest');
    const reviewBtnText = document.getElementById('btn-hub-review-text');
    if (reviewBtnText) {
        let restored = false;
        if (reviewSaved) {
            try {
                const parsed = JSON.parse(reviewSaved);
                if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                    reviewBtnText.innerText = `继续复习(${parsed.currentIdx + 1}/${parsed.pool.length})`;
                    restored = true;
                }
            } catch (e) { }
        }
        if (!restored) {
            reviewBtnText.innerText = '复习';
        }
    }

    const riddleSaved = localStorage.getItem(`riddle_progress_${currentUser || 'guest'}`) || (currentUser ? localStorage.getItem(`riddle_progress_${currentUser}`) : null);
    const riddleBtnText = document.getElementById('btn-hub-riddle-text');
    if (riddleBtnText) {
        if (riddleSaved) {
            try {
                const parsed = JSON.parse(riddleSaved);
                if (parsed && !parsed.gameOver && parsed.attempts && parsed.attempts.length > 0) {
                    riddleBtnText.innerText = `继续解谜`;
                } else {
                    riddleBtnText.innerText = '开始解谜';
                }
            } catch (e) {
                riddleBtnText.innerText = '开始解谜';
            }
        } else {
            riddleBtnText.innerText = '开始解谜';
        }
    }

    if (typeof updateHubShiCiResumeButton === 'function') {
        updateHubShiCiResumeButton();
    }
}

// 首页点击“管理本地词书”直接进入独立管理词书页面
function goToManageBooksInSettings() {
    if (typeof openManageBooksPage === 'function') {
        openManageBooksPage('view-hub');
    } else {
        openMeSubview('books');
    }
}

async function loadCustomBook(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const importedNames = [];

    if (!window.customBooks) window.customBooks = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const rawBookName = file.name.replace(/\.json$/i, '');
            const bookName = cleanBookName(rawBookName);

            // 检查是否重复导入：如果同名词书已存在，则自动跳过
            const isDuplicate = (window.customBooks || []).some(b => b.name === bookName || b.rawName === bookName || b.name === rawBookName) ||
                                (BookManager.availableBooks || []).some(b => b.name === bookName || b.rawName === bookName || b.name === rawBookName);
            if (isDuplicate) {
                console.log(`[loadCustomBook] 词书《${bookName}》已存在，跳过导入`);
                skippedCount++;
                continue;
            }

            let text = await file.text();
            // 剥除 UTF-8 BOM 标记 (\uFEFF)
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            const rawData = safeJsonParse(text);
            if (!rawData) throw new Error('无效的 JSON 内容');

            const isAncient = (file.name.includes('实词') || file.name.includes('文言') || 
                (Array.isArray(rawData) && rawData.some(it => it && (it.isAncient || (it.pinyin && !it.word && it.char)))));

            const bookId = 'custom_' + Date.now() + '_' + i;
            const normalized = BookManager.normalizeWords(rawData, bookName, bookId);
            if (normalized.length === 0) throw new Error('未解析到有效词条');

            const bookObj = {
                id: bookId,
                name: bookName,
                rawName: bookName,
                category: '未分类',
                isShiCi: isAncient,
                count: normalized.length,
                words: normalized,
                folderId: null,
                isCloud: false,
                isDiskBook: true,
                syncStatus: 'downloaded',
                createdAt: Date.now() + i
            };

            window.customBooks.push(bookObj);
            await VocabOfflineDB.saveBook(bookObj);

            // 直接导入词书不用为其创建文件夹，直接存入 local_books 根目录（放入未分类中）
            if (typeof ElectronManager !== 'undefined' && ElectronManager.isAvailable()) {
                ElectronManager.saveBookToDisk(bookName + '.json', text, 'local', '').catch(() => {});
            }

            BookManager.bookCache[bookId] = normalized;

            if (isAncient) {
                if (typeof shiciConfig !== 'undefined' && Array.isArray(shiciConfig.selectedBooks)) {
                    shiciConfig.selectedBooks.push(bookId);
                    if (typeof saveShiCiState === 'function') saveShiCiState();
                }
            } else {
                if (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds)) {
                    if (!singleSelectedBookIds.includes(bookId)) {
                        singleSelectedBookIds.push(bookId);
                        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
                    }
                }
            }

            importedNames.push(bookName);
            successCount++;
        } catch (err) {
            console.error('导入词书解析失败:', file.name, err);
            failCount++;
        }
    }

    // 重置 input value 以支持再次导入同名文件
    e.target.value = '';

    BookManager.mergeCustomBooks();

    // 立即刷新所有相关词书列表
    if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
    if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
    if (typeof renderSingleBookList === 'function') renderSingleBookList();
    if (typeof renderRoomBookChips === 'function') renderRoomBookChips();
    if (typeof renderLocalDuelBookChips === 'function') renderLocalDuelBookChips();
    else if (typeof updateLocalDuelBookSummaryUI === 'function') updateLocalDuelBookSummaryUI();
    if (typeof renderAiDuelBookChips === 'function') renderAiDuelBookChips();
    else if (typeof updateAiDuelBookSummaryUI === 'function') updateAiDuelBookSummaryUI();
    if (typeof renderManageLocalBooksInSettings === 'function') renderManageLocalBooksInSettings();
    if (typeof renderSettingsBooksSummary === 'function') renderSettingsBooksSummary();

    if (successCount > 0) {
        if (successCount === 1 && skippedCount === 0) {
            showToast(`成功导入本地词书《${importedNames[0]}》！`);
        } else {
            showToast(`导入完成：成功 ${successCount} 本${skippedCount > 0 ? `，跳过已存在 ${skippedCount} 本` : ''}${failCount > 0 ? ` (${failCount} 本失败)` : ''}`);
        }
    } else if (skippedCount > 0) {
        showToast(`所选词书均已存在，已自动跳过重复导入 (${skippedCount} 本)`);
    } else if (failCount > 0) {
        alert('所选词库解析失败，请确认为标准词典JSON格式。');
    }
}

function isGaoKaoBookId(id) {
    return id === 'books/高中/高中考纲.json' || id === 'books/高中/高中考纲词汇.json' || id === 'books/经典/高中考纲.json' || id === 'books/经典/高中考纲词汇.json' || id === 'books/考纲/高考3500.json' || id === 'GaoKao3500' || id === '高中考纲' || id === '高中考纲.json';
}

function isBookIdSelected(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) return false;
    const isGaoKao = isGaoKaoBookId(bookId);
    return selectedIds.some(id => id === bookId || (isGaoKao && isGaoKaoBookId(id)));
}

function toggleBookIdInList(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) selectedIds = [];
    const isGaoKao = isGaoKaoBookId(bookId);
    const hasIt = selectedIds.some(id => id === bookId || (isGaoKao && isGaoKaoBookId(id)));
    if (hasIt) {
        return selectedIds.filter(id => id !== bookId && !(isGaoKao && isGaoKaoBookId(id)));
    } else {
        return [...selectedIds, bookId];
    }
}

function isShiCiBook(b) {
    if (!b) return false;
    if (typeof b === 'string') {
        return b.includes('实词') || b.includes('shici') || b.includes('文言');
    }
    if (b.type === 'shici' || b.isShiCi) return true;
    if (b.category === '实词' || b.category === '实词词书' || (b.name && (b.name.includes('实词') || b.name.includes('文言'))) || (b.id && String(b.id).includes('实词'))) return true;
    if (b.words && b.words.length > 0) {
        const firstWord = b.words[0].word || b.words[0].name || '';
        if (/[\u4e00-\u9fa5]/.test(firstWord)) return true;
        if (b.words[0].senses && !/[a-zA-Z]/.test(firstWord)) return true;
    }
    return false;
}

function isEnglishBook(b) {
    return !isShiCiBook(b);
}
