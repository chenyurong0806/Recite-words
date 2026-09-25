/**
 * 学习主站大厅与导航中枢
 * Module: assets/js/views/hub.js
 */

function showToast(text) {
    const snackbar = document.getElementById('snackbar');
    snackbar.innerText = text;
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 2600);
}

let currentView = 'view-auth';
window.currentView = currentView;

function switchView(viewId) {
    currentView = viewId;
    window.currentView = viewId;
    if (typeof resetAllGameAlertsAndFeedback === 'function') {
        resetAllGameAlertsAndFeedback();
    }
    const hideNavViews = ['view-auth', 'view-single', 'view-game', 'view-local-duel', 'view-dictation', 'view-riddle', 'view-shici', 'view-search', 'view-book-selector', 'view-online', 'view-mistakes', 'view-result'];

    const performSwitch = () => {
        currentView = viewId;
        window.currentView = viewId;
        const shouldHideNav = hideNavViews.includes(viewId) || !currentUser;

        // 纯类名控制，触发 CSS 3D 平滑移出/移入动画
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

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
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

    if (viewId === 'view-hub') {
        updateHub();
        if (currentUser && typeof initGlobalPresence === 'function') {
            initGlobalPresence();
        }
    } else if (viewId === 'view-auth') {
        if (typeof renderAuthView === 'function') renderAuthView();
    } else if (viewId === 'view-me') {
        if (typeof renderMeView === 'function') {
            renderMeView();
        }
    } else if (viewId === 'view-settings') {
        if (typeof switchSettingsSubview === 'function') {
            switchSettingsSubview('main');
        }
    } else if (viewId === 'view-online') {
        if (typeof fetchOnlineRoomsList === 'function') {
            fetchOnlineRoomsList();
            initGlobalPresence();
        }
    } else if (viewId === 'view-search') {
        const searchInp = document.getElementById('search-page-input');
        if (!searchInp || !searchInp.value || !searchInp.value.trim()) {
            if (typeof showSearchHistoryView === 'function') {
                showSearchHistoryView();
            }
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
    const badge = document.getElementById('hub-online-offline-badge');
    const badgeText = document.getElementById('hub-online-offline-text');
    const btnOnline = document.getElementById('btn-enter-online');

    if (badge && badgeText) {
        if (isNetworkOnline) {
            badge.className = 'network-status-badge online';
            badgeText.innerText = '在线';
        } else {
            badge.className = 'network-status-badge offline';
            badgeText.innerText = '离线';
        }
    }

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

    const statTotal = document.getElementById('stat-total');
    const statAcc = document.getElementById('stat-acc');
    const statMistakes = document.getElementById('stat-mistakes');
    if (statTotal) statTotal.innerText = userStats.total || 0;
    if (statAcc) statAcc.innerText = (userStats.total > 0) ? Math.round((userStats.correct / userStats.total) * 100) + '%' : '0%';
    if (statMistakes) statMistakes.innerText = Object.keys(userStats.mistakes || {}).length;

    checkNetworkStatus();
    updateHubResumeButtons();

    if (window.EbbinghausEngine) {
        window.EbbinghausEngine.updateDueBadge();
    }
    if (window.DailyStudyTracker) {
        window.DailyStudyTracker.renderWeekCalendar(currentCalendarWeekOffset);
    }
    if (typeof updateHubShiCiBadge === 'function') {
        updateHubShiCiBadge();
    }
    if (typeof initSearchTabs === 'function') {
        initSearchTabs();
    }
}

// 刷新主页中单人学习与 Wordle 的按钮文本（有未完成进度时显示“继续学习” / “继续解谜”）
function updateHubResumeButtons() {
    if (!currentUser) return;

    // 1. 英语新词学习进度
    const singleSaved = localStorage.getItem(`single_learn_progress_${currentUser}`) || localStorage.getItem(`single_progress_${currentUser}`);
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
    const reviewSaved = localStorage.getItem(`single_review_progress_${currentUser}`);
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

    const riddleSaved = localStorage.getItem(`riddle_progress_${currentUser}`);
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

// 首页点击“管理本地词书”直接无弹窗进入个人中心-管理词书页面
function goToManageBooksInSettings() {
    openMeSubview('books');
}

async function loadCustomBook(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    const importedNames = [];

    if (!window.customBooks) window.customBooks = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const text = await file.text();
            const rawData = JSON.parse(text);
            // 禁止导入文言实词
            if (isShiCiBook(rawData) || (rawData && rawData.name && rawData.name.includes('实词')) || file.name.includes('实词') || file.name.includes('文言')) {
                alert('文言词书禁止导入！');
                continue;
            }
            if (Array.isArray(rawData) && rawData.some(it => it && (it.senses || it.isAncient || it.type === 'shici'))) {
                alert('文言词书禁止导入！');
                continue;
            }
            const bookName = file.name.replace(/\.json$/i, '');
            const bookId = 'custom_' + Date.now() + '_' + i;
            const normalized = BookManager.normalizeWords(rawData, bookName, bookId);
            if (normalized.length === 0) throw new Error('未解析到有效词条');

            const bookObj = {
                id: bookId,
                name: bookName,
                rawName: bookName,
                count: normalized.length,
                words: normalized,
                folderId: null,
                isCloud: false,
                createdAt: Date.now() + i
            };

            window.customBooks.push(bookObj);
            await VocabOfflineDB.saveBook(bookObj);

            BookManager.bookCache[bookId] = normalized;

            if (!singleSelectedBookIds.includes(bookId)) {
                singleSelectedBookIds.push(bookId);
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
    renderSingleBookList();
    renderRoomBookChips();
    renderLocalDuelBookChips();
    renderAiDuelBookChips();
    renderManageLocalBooksInSettings();
    renderSettingsBooksSummary();

    if (successCount > 0) {
        if (successCount === 1) {
            showToast(`成功导入本地词书“${importedNames[0]}”！`);
        } else {
            showToast(`成功导入 ${successCount} 本词书！` + (failCount > 0 ? ` (${failCount} 本失败)` : ''));
        }
    } else if (failCount > 0) {
        alert('所选词库解析失败，请确认为标准词典JSON格式。');
    }
}

function isBookIdSelected(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) return false;
    const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
    return selectedIds.some(id => id === bookId || (isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
}

function toggleBookIdInList(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) selectedIds = [];
    const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
    const hasIt = selectedIds.some(id => id === bookId || (isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
    if (hasIt) {
        return selectedIds.filter(id => id !== bookId && !(isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
    } else {
        return [...selectedIds, bookId];
    }
}

function isShiCiBook(b) {
    if (!b) return false;
    if (b.type === 'shici' || b.isShiCi) return true;
    if (b.category === '实词' || (b.name && b.name.includes('实词')) || (b.id && String(b.id).includes('实词'))) return true;
    if (b.words && b.words.length > 0 && b.words[0].senses) return true;
    return false;
}

function isEnglishBook(b) {
    return !isShiCiBook(b);
}

