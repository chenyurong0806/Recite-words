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
let pendingBackClickAt = 0;
let activeDomTransitionCleanup = null;

function isMobilePageTransitionViewport() {
    if (typeof window === 'undefined') return false;
    if (typeof window.matchMedia === 'function') {
        try {
            return window.matchMedia('(max-width: 767px)').matches;
        } catch (e) { }
    }
    return window.innerWidth <= 767;
}
window.isMobilePageTransitionViewport = isMobilePageTransitionViewport;

function isReducedMotionActive() {
    if (typeof document !== 'undefined') {
        if (document.documentElement.classList.contains('reduce-motion')) return true;
        if (document.body && document.body.classList.contains('reduce-motion')) return true;
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        try {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        } catch (e) { }
    }
    return false;
}
window.isReducedMotionActive = isReducedMotionActive;

function isRootNavState(viewId, subviewKey = 'main') {
    if (viewId === 'view-hub') return true;
    if (viewId === 'view-me') return subviewKey === 'main';
    if (viewId === 'view-settings') return subviewKey === 'main';
    return false;
}

function resolveCurrentSubviewKey(viewId) {
    if (typeof document === 'undefined') return 'main';
    if (viewId === 'view-me') {
        const activeSub = document.querySelector('#view-me .me-subview.active');
        return (!activeSub || activeSub.id === 'me-subview-main')
            ? 'main'
            : activeSub.id.replace(/^settings-subview-/, '');
    }
    if (viewId === 'view-settings') {
        const activeSub = document.querySelector('#view-settings .settings-subview.active');
        return (!activeSub || activeSub.id === 'settings-subview-main')
            ? 'main'
            : activeSub.id.replace(/^settings-subview-/, '');
    }
    return 'main';
}

function updateNavVisibilityForState(viewId = null, subviewKey = null) {
    if (typeof document === 'undefined' || !document.body) return;
    const resolvedView = viewId || (typeof window !== 'undefined' && window.currentView) || 'view-hub';
    const resolvedSub = subviewKey || resolveCurrentSubviewKey(resolvedView);
    const isMobile = isMobilePageTransitionViewport();
    const isLoggedOutAuth = (typeof currentUser !== 'undefined' ? !currentUser : false) && resolvedView === 'view-auth';

    let shouldHideNav = false;
    if (isMobile) {
        // 手机端：仅首页、个人中心主页、设置主页保留底部栏；进入所有新页面与二级子页面一律隐藏底部栏/左侧栏
        shouldHideNav = !isRootNavState(resolvedView, resolvedSub) || isLoggedOutAuth;
    } else {
        const hideNavViews = ['view-auth', 'view-single', 'view-game', 'view-local-duel', 'view-dictation', 'view-riddle', 'view-shici', 'view-search', 'view-book-selector', 'view-manage-books', 'view-book-content', 'view-online', 'view-result', 'view-leaderboard', 'view-riddle-history', 'view-activity', 'view-mailbox'];
        shouldHideNav = hideNavViews.includes(resolvedView) || isLoggedOutAuth;
    }

    if (shouldHideNav) {
        document.body.classList.remove('has-nav');
        document.body.classList.add('nav-hidden');
    } else {
        document.body.classList.add('has-nav');
        document.body.classList.remove('nav-hidden');
    }
}
window.updateNavVisibilityForState = updateNavVisibilityForState;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', () => {
        updateNavVisibilityForState();
    }, { passive: true });
}

function getEffectiveElementZoom(el, rect = null) {
    const r = rect || (el && typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null);
    if (el && el.offsetWidth > 0 && r && r.width > 0) {
        const ratio = r.width / el.offsetWidth;
        if (Number.isFinite(ratio) && ratio > 0.25 && ratio < 4) {
            return ratio;
        }
    }
    if (typeof document !== 'undefined' && document.body && document.body.style && document.body.style.zoom) {
        const parsed = parseFloat(document.body.style.zoom);
        if (Number.isFinite(parsed) && parsed > 0.25 && parsed < 4) {
            return parsed;
        }
    }
    return 1;
}

function getFixedContainingBlockRect(el) {
    if (typeof window === 'undefined' || !el) return { left: 0, top: 0 };
    let cur = el.parentElement;
    while (cur && cur !== document.documentElement) {
        if (cur !== document.body && typeof window.getComputedStyle === 'function') {
            const st = window.getComputedStyle(cur);
            const hasTransform = st.transform && st.transform !== 'none';
            const hasPerspective = st.perspective && st.perspective !== 'none';
            const hasFilter = st.filter && st.filter !== 'none';
            const willChange = st.willChange || '';
            const hasWillChange = /\b(transform|perspective|filter)\b/.test(willChange);
            const contain = st.contain || '';
            const hasContain = /\b(layout|paint|strict|content)\b/.test(contain);
            if (hasTransform || hasPerspective || hasFilter || hasWillChange || hasContain) {
                return cur.getBoundingClientRect();
            }
        }
        cur = cur.parentElement;
    }
    return { left: 0, top: 0 };
}

function measureElementForFixedLayer(el, fallbackViewportHeight = 0) {
    const rect = (el && typeof el.getBoundingClientRect === 'function')
        ? el.getBoundingClientRect()
        : { top: 0, left: 0, width: 0, height: 0 };
    const zoomScale = getEffectiveElementZoom(el, rect);
    const cbRect = getFixedContainingBlockRect(el);
    const width = (el && el.offsetWidth > 0) ? el.offsetWidth : (rect.width / zoomScale);
    const innerH = fallbackViewportHeight
        || (typeof window !== 'undefined' ? window.innerHeight : 0)
        || (typeof document !== 'undefined' && document.documentElement ? document.documentElement.clientHeight : 0)
        || 0;
    const minHeight = Math.max(
        (el && el.offsetHeight) || 0,
        (rect.height || 0) / zoomScale,
        innerH / zoomScale
    );
    return {
        top: ((rect.top || 0) - (cbRect.top || 0)) / zoomScale,
        left: ((rect.left || 0) - (cbRect.left || 0)) / zoomScale,
        width,
        minHeight,
        zoomScale,
        cbRect
    };
}
window.measureElementForFixedLayer = measureElementForFixedLayer;

function lockContainerHeightForLayering(referenceEl, zoomScale = 1) {
    if (typeof document === 'undefined') return () => {};
    const containerEl = (referenceEl && typeof referenceEl.closest === 'function' ? referenceEl.closest('.container') : null)
        || document.querySelector('.container');
    if (!containerEl) return () => {};
    const prevMinHeight = containerEl.style.minHeight;
    const rect = typeof containerEl.getBoundingClientRect === 'function' ? containerEl.getBoundingClientRect() : null;
    const lockedHeight = Math.max(
        containerEl.offsetHeight || 0,
        rect && rect.height ? (rect.height / (zoomScale || 1)) : 0
    );
    if (lockedHeight > 0) {
        containerEl.style.minHeight = `${lockedHeight}px`;
    }
    return () => {
        containerEl.style.minHeight = prevMinHeight;
    };
}

function computeSwipeBackSettleDuration({ viewportWidth = 375, progress = 0, velocityX = 0, shouldCommit = true, reduced = false } = {}) {
    if (reduced) return 0;
    const width = Math.max(280, Number(viewportWidth) || 375);
    const p = Math.max(0, Math.min(1, Number(progress) || 0));
    const v = Math.max(0, Math.min(2.4, Number(velocityX) || 0));
    // 页面越宽基准时间越充裕、左滑力度越大（速度越快）收尾越利落，保持视觉速度从容自然
    const widthFactor = Math.max(0.85, Math.min(1.42, width / 390));
    const remainingRatio = shouldCommit ? Math.max(0.08, 1 - p) : Math.max(0.08, p);
    const distanceFactor = 0.5 + 0.5 * Math.sqrt(remainingRatio);
    const velocityFactor = shouldCommit
        ? (1 / (1 + v * 0.38))
        : (1 / (1 + Math.min(1.0, v) * 0.22));
    const baseMs = shouldCommit ? 480 : 380;
    const raw = Math.round(baseMs * widthFactor * distanceFactor * velocityFactor);
    return Math.max(shouldCommit ? 250 : 210, Math.min(580, raw));
}
window.computeSwipeBackSettleDuration = computeSwipeBackSettleDuration;

function runTwoLayerPageTransition(direction, updateDom, fromEl = null, toEl = null, options = {}) {
    if (typeof updateDom !== 'function') return;

    const invokeCallback = (fn) => {
        if (typeof fn === 'function') {
            try { fn(); } catch (err) { console.error(err); }
        }
    };

    if (activeDomTransitionCleanup) {
        activeDomTransitionCleanup();
        activeDomTransitionCleanup = null;
    }

    if (window.__skipNextBackAnimation) {
        window.__skipNextBackAnimation = false;
        if (toEl) toEl.classList.add('no-enter-anim');
        updateDom();
        invokeCallback(options && options.onAfterDomUpdate);
        if (toEl) {
            requestAnimationFrame(() => toEl.classList.remove('no-enter-anim'));
        }
        invokeCallback(options && options.onTransitionEnd);
        return;
    }

    // 宽屏设备（>= 768px）与减弱动态效果模式均不播放页面滑入/返回动画
    if (!isMobilePageTransitionViewport() || isReducedMotionActive() || !fromEl || !toEl || fromEl === toEl) {
        if (direction === 'back' && toEl) {
            toEl.classList.add('no-enter-anim');
            updateDom();
            invokeCallback(options && options.onAfterDomUpdate);
            requestAnimationFrame(() => toEl.classList.remove('no-enter-anim'));
        } else {
            updateDom();
            invokeCallback(options && options.onAfterDomUpdate);
        }
        invokeCallback(options && options.onTransitionEnd);
        return;
    }

    const isBack = (direction === 'back');
    const docClass = isBack ? 'dom-back-transition' : 'dom-forward-transition';
    const outClass = isBack ? 'page-back-outgoing-layer' : 'page-forward-outgoing-layer';
    const inClass = isBack ? 'page-back-incoming-layer' : 'page-forward-incoming-layer';
    const primaryAnimEl = isBack ? fromEl : toEl;

    const docEl = document.documentElement;
    const metrics = measureElementForFixedLayer(fromEl, window.innerHeight || 0);
    const unlockContainer = lockContainerHeightForLayering(fromEl, metrics.zoomScale);
    docEl.classList.add(docClass);
    updateDom();

    fromEl.style.top = `${metrics.top}px`;
    fromEl.style.left = `${metrics.left}px`;
    fromEl.style.width = `${metrics.width}px`;
    fromEl.style.height = 'auto';
    fromEl.style.minHeight = `${metrics.minHeight}px`;
    fromEl.classList.add(outClass);

    // 在页面滑入动画类使目标层离屏偏移前先执行同步回调（如聚焦搜索框），防止 Safari/移动端拒绝聚焦离屏元素
    invokeCallback(options && options.onAfterDomUpdate);

    toEl.classList.add(inClass);

    let finished = false;
    const cleanup = () => {
        if (finished) return;
        finished = true;
        if (activeDomTransitionCleanup === cleanup) activeDomTransitionCleanup = null;
        primaryAnimEl.removeEventListener('animationend', onAnimEnd);
        fromEl.classList.remove(outClass);
        fromEl.style.top = '';
        fromEl.style.left = '';
        fromEl.style.width = '';
        fromEl.style.height = '';
        fromEl.style.minHeight = '';
        toEl.classList.remove(inClass);
        docEl.classList.remove(docClass);
        unlockContainer();
        invokeCallback(options && options.onTransitionEnd);
    };
    const onAnimEnd = (ev) => {
        if (ev.target === primaryAnimEl) cleanup();
    };
    activeDomTransitionCleanup = cleanup;
    primaryAnimEl.addEventListener('animationend', onAnimEnd);

    if (typeof primaryAnimEl.getAnimations === 'function' && primaryAnimEl.getAnimations().length === 0) {
        cleanup();
        return;
    }
    setTimeout(cleanup, 360);
}

function runBackPageTransition(updateDom, fromEl = null, toEl = null, options = {}) {
    runTwoLayerPageTransition('back', updateDom, fromEl, toEl, options);
}
window.runBackPageTransition = runBackPageTransition;

function runForwardPageTransition(updateDom, fromEl = null, toEl = null, options = {}) {
    runTwoLayerPageTransition('forward', updateDom, fromEl, toEl, options);
}
window.runForwardPageTransition = runForwardPageTransition;

// 捕获阶段识别任意返回按钮点击，确保所有返回入口统一触发返回动画
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const backBtn = e.target && e.target.closest ? e.target.closest('.nav-back-btn:not(.search-page-settings-btn)') : null;
        if (backBtn) {
            pendingBackClickAt = Date.now();
        }
    }, true);
}

function goBackToPreviousView(fallback = 'view-hub') {
    const prev = window.previousView || fallback;
    if (!prev || prev === currentView) {
        switchView(fallback, { direction: 'back' });
    } else {
        switchView(prev, { direction: 'back' });
    }
}
window.goBackToPreviousView = goBackToPreviousView;

function switchView(viewId, options = {}) {
    const ROOT_TAB_VIEWS = ['view-hub', 'view-me', 'view-settings'];
    const prevViewId = currentView;
    const isSameView = (prevViewId === viewId);
    const isPendingBack = Boolean(pendingBackClickAt && (Date.now() - pendingBackClickAt < 450));
    if (isPendingBack) pendingBackClickAt = 0;

    const fromEl = prevViewId ? document.getElementById(prevViewId) : null;
    const toEl = document.getElementById(viewId);
    const isInitialBoot = !fromEl || !fromEl.classList.contains('active');
    const skipTransition = Boolean(options && options.skipTransition);

    const isBack = !skipTransition && !isSameView && !isInitialBoot && (
        (options && options.direction === 'back') || isPendingBack
    );
    const isTabSwitch = Boolean(
        (options && options.isTabSwitch) ||
        (ROOT_TAB_VIEWS.includes(prevViewId) && ROOT_TAB_VIEWS.includes(viewId) && !(options && options.direction === 'forward') && !isPendingBack)
    );
    const isForward = !skipTransition && !isSameView && !isInitialBoot && !isBack && !isTabSwitch && (
        (options && options.direction === 'forward') || viewId !== 'view-hub'
    );

    if (prevViewId && prevViewId !== viewId) {
        previousView = prevViewId;
        window.previousView = prevViewId;
    }
    currentView = viewId;
    window.currentView = viewId;

    const applyViewUpdate = () => {
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

        const targetSubKey = (viewId === 'view-me')
            ? (window.__targetMeSubview || 'main')
            : 'main';
        updateNavVisibilityForState(viewId, targetSubKey);

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
    };

    if (isBack) {
        runBackPageTransition(applyViewUpdate, fromEl, toEl, options);
    } else if (isForward) {
        runForwardPageTransition(applyViewUpdate, fromEl, toEl, options);
    } else if (window.__skipNextBackAnimation || skipTransition || (options && options.direction === 'back')) {
        window.__skipNextBackAnimation = false;
        if (toEl) toEl.classList.add('no-enter-anim');
        applyViewUpdate();
        if (options && typeof options.onAfterDomUpdate === 'function') {
            try { options.onAfterDomUpdate(); } catch (err) { console.error(err); }
        }
        if (toEl) {
            requestAnimationFrame(() => toEl.classList.remove('no-enter-anim'));
        }
        if (options && typeof options.onTransitionEnd === 'function') {
            try { options.onTransitionEnd(); } catch (err) { console.error(err); }
        }
    } else {
        applyViewUpdate();
        if (options && typeof options.onAfterDomUpdate === 'function') {
            try { options.onAfterDomUpdate(); } catch (err) { console.error(err); }
        }
        if (options && typeof options.onTransitionEnd === 'function') {
            try { options.onTransitionEnd(); } catch (err) { console.error(err); }
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
    const setDisplayIfChanged = (el, nextDisplay) => {
        if (el && el.style.display !== nextDisplay) {
            el.style.display = nextDisplay;
        }
    };

    // 1. 搜索栏收起/展开控制
    const searchWrapper = document.querySelector('#view-hub .hub-search-wrapper');
    const appBarSearchBtn = document.getElementById('btn-hub-appbar-search');
    setDisplayIfChanged(searchWrapper, cfg.collapseSearchBar ? 'none' : '');
    setDisplayIfChanged(appBarSearchBtn, cfg.collapseSearchBar ? 'inline-flex' : 'none');

    // 2. 活动和排行榜禁止隐藏，强制保持 flex 布局显示
    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
    const actCard = document.getElementById('hub-activity-entry-card');
    setDisplayIfChanged(actCard, isOffline ? 'none' : 'flex');
    const lbCard = document.getElementById('hub-leaderboard-entry-card');
    setDisplayIfChanged(lbCard, 'flex');

    // 3. 独立卡片隐藏控制（在线玩家卡片、学习日历卡片）
    const onlineCard = document.getElementById('hub-online-players-card');
    setDisplayIfChanged(onlineCard, hiddenSet.has('hub-online-players-card') ? 'none' : '');
    const calendarCard = document.getElementById('hub-calendar-card') || document.querySelector('#view-hub .week-calendar-card');
    setDisplayIfChanged(calendarCard, hiddenSet.has('hub-calendar-card') ? 'none' : '');

    // 4. modes-grid 卡片顺序与隐藏控制（仅在顺序确实变化时才重排 DOM，避免返回首页刷新与重触发卡片动效）
    const modesGrid = document.querySelector('#view-hub .modes-grid');
    if (modesGrid) {
        const currentChildren = Array.from(modesGrid.children);
        const cardMap = new Map();
        const currentOrder = [];
        currentChildren.forEach(el => {
            const cid = el.getAttribute('data-home-card-id') || el.id;
            if (cid) {
                cardMap.set(cid, el);
                currentOrder.push(cid);
            }
        });
        const targetOrder = cfg.modeOrder.filter(cid => cardMap.has(cid));
        const orderChanged = currentOrder.length !== targetOrder.length ||
            targetOrder.some((cid, idx) => currentOrder[idx] !== cid);

        targetOrder.forEach(cid => {
            const el = cardMap.get(cid);
            if (el) {
                setDisplayIfChanged(el, hiddenSet.has(cid) ? 'none' : '');
                if (orderChanged) {
                    modesGrid.appendChild(el);
                }
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

    if (userNameEl && userNameEl.innerText !== currentUser) userNameEl.innerText = currentUser;
    if (profileTag && profileTag.innerText !== currentUser) profileTag.innerText = currentUser;

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
        if (userImgEl.getAttribute('src') !== avatar) {
            userImgEl.src = avatar;
        }
        if (userImgEl.style.display !== 'block') userImgEl.style.display = 'block';
        if (userIconEl.style.display !== 'none') userIconEl.style.display = 'none';
    } else if (userImgEl && userIconEl) {
        if (userImgEl.style.display !== 'none') userImgEl.style.display = 'none';
        if (userIconEl.style.display !== 'inline-flex') userIconEl.style.display = 'inline-flex';
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

/* ==========================================================================
   iOS 移动端屏幕最左侧滑动返回（动画随手势实时进展）
   - 仅在 iOS 移动端生效
   - 仅当手指从屏幕最左侧边缘 (clientX <= 28px) 向右滑动时触发
   - 当前页面随手势向右滑动并淡出，目标页面从左侧滑入并渐显
   ========================================================================== */
(function setupIosLeftEdgeSwipeBack() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const EDGE_START_MAX_X = 28;
    const LOCK_THRESHOLD_PX = 8;
    const COMMIT_PROGRESS = 0.30;
    const COMMIT_VELOCITY = 0.45;
    const INCOMING_OFFSET_RATIO = 0.32;

    function isIosMobileDevice() {
        if (!isMobilePageTransitionViewport()) return false;
        const ua = navigator.userAgent || '';
        const isIosUa = (/iPhone|iPod|iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        return isIosUa && hasTouch;
    }

    function hasVisibleModalOverlay() {
        const modals = document.querySelectorAll('.modal-overlay.active');
        for (let i = 0; i < modals.length; i++) {
            const st = window.getComputedStyle(modals[i]);
            if (st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0') {
                return true;
            }
        }
        return false;
    }

    function isBlockedSwipeTarget(target) {
        if (!target || !(target instanceof Element)) return false;
        return Boolean(target.closest('.md3-slider, .virtual-keyboard, .no-swipe-back, input[type="range"]'));
    }

    function resolveSwipeBackContext() {
        const currViewId = window.currentView || (document.querySelector('.view.active') && document.querySelector('.view.active').id);
        if (!currViewId || currViewId === 'view-hub' || currViewId === 'view-game') {
            return null;
        }

        // 1. 个人中心二级子页面 -> 返回个人中心主页
        if (currViewId === 'view-me') {
            const activeSub = document.querySelector('#view-me .settings-subview.active');
            const mainSub = document.getElementById('me-subview-main');
            if (!activeSub || !mainSub || activeSub.id === 'me-subview-main') return null;
            return {
                fromEl: activeSub,
                toEl: mainSub,
                commit: () => {
                    const backBtn = activeSub.querySelector('.nav-back-btn');
                    if (backBtn && typeof backBtn.click === 'function') {
                        backBtn.click();
                    } else if (typeof openMeSubview === 'function') {
                        openMeSubview('main', true);
                    }
                }
            };
        }

        // 2. 设置中心二级子页面 -> 返回设置主页
        if (currViewId === 'view-settings') {
            const activeSub = document.querySelector('#view-settings .settings-subview.active');
            const mainSub = document.getElementById('settings-subview-main');
            if (!activeSub || !mainSub || activeSub.id === 'settings-subview-main') return null;
            return {
                fromEl: activeSub,
                toEl: mainSub,
                commit: () => {
                    if (typeof switchSettingsSubview === 'function') {
                        switchSettingsSubview('main', true);
                    }
                }
            };
        }

        // 3. 登录页：未登录且无返回目标时不允许滑动返回
        if (currViewId === 'view-auth' && !window.__authReturnMeSubview && (!currentUser || window.previousView === 'view-auth')) {
            return null;
        }

        // 4. 全屏页面 -> 解析返回目标视图
        let targetViewId = 'view-hub';
        if (currViewId === 'view-search') {
            targetViewId = (typeof searchPreviousView !== 'undefined' && searchPreviousView) ? searchPreviousView : 'view-hub';
        } else if (currViewId === 'view-book-selector') {
            targetViewId = (typeof bookSelectorPreviousView !== 'undefined' && bookSelectorPreviousView) ? bookSelectorPreviousView : 'view-hub';
        } else if (currViewId === 'view-manage-books') {
            const mbPrev = (typeof manageBooksPreviousView !== 'undefined') ? manageBooksPreviousView : '';
            targetViewId = (mbPrev && mbPrev !== 'view-manage-books') ? mbPrev : 'view-book-selector';
        } else if (currViewId === 'view-book-content') {
            targetViewId = (typeof bookContentState !== 'undefined' && bookContentState && bookContentState.previousView) ? bookContentState.previousView : 'view-manage-books';
        } else if (currViewId === 'view-riddle-history') {
            targetViewId = (typeof riddleHistoryPreviousView !== 'undefined' && riddleHistoryPreviousView) ? riddleHistoryPreviousView : 'view-riddle';
        } else if (currViewId === 'view-auth') {
            targetViewId = window.__authReturnMeSubview ? 'view-me' : ((window.previousView && window.previousView !== 'view-auth') ? window.previousView : 'view-hub');
        } else if (window.previousView && window.previousView !== currViewId) {
            targetViewId = window.previousView;
        }

        const fromEl = document.getElementById(currViewId);
        const toEl = document.getElementById(targetViewId);
        if (!fromEl || !toEl || fromEl === toEl) return null;

        return {
            fromEl,
            toEl,
            commit: () => {
                const backBtn = fromEl.querySelector('.nav-back-btn:not(.search-page-settings-btn), .search-page-back-btn');
                if (backBtn && typeof backBtn.click === 'function') {
                    backBtn.click();
                } else if (typeof goBackToPreviousView === 'function') {
                    goBackToPreviousView(targetViewId);
                } else {
                    switchView(targetViewId, { skipTransition: true });
                }
            }
        };
    }

    let state = null;

    function resetSwipeLayers(ctx) {
        if (!ctx) return;
        const { fromEl, toEl } = ctx;
        if (typeof ctx.unlockContainer === 'function') {
            ctx.unlockContainer();
            ctx.unlockContainer = null;
        }
        document.documentElement.classList.remove('swipe-back-active');
        if (fromEl) {
            fromEl.classList.remove('swipe-back-outgoing-layer');
            fromEl.style.top = '';
            fromEl.style.left = '';
            fromEl.style.width = '';
            fromEl.style.minHeight = '';
            fromEl.style.transform = '';
            fromEl.style.opacity = '';
            fromEl.style.transition = '';
        }
        if (toEl) {
            toEl.classList.remove('swipe-back-incoming-layer');
            toEl.style.top = '';
            toEl.style.left = '';
            toEl.style.width = '';
            toEl.style.minHeight = '';
            toEl.style.transform = '';
            toEl.style.opacity = '';
            toEl.style.transition = '';
        }
    }

    function applyProgress(ctx, progress, dragWidth) {
        const p = Math.max(0, Math.min(1, progress));
        const outX = p * dragWidth;
        const outOpacity = Math.max(0.08, 1 - p * 0.88);
        const inX = -INCOMING_OFFSET_RATIO * dragWidth * (1 - p);
        const inOpacity = 0.55 + p * 0.45;

        ctx.fromEl.style.transform = `translate3d(${outX}px, 0, 0)`;
        ctx.fromEl.style.opacity = String(outOpacity);
        ctx.toEl.style.transform = `translate3d(${inX}px, 0, 0)`;
        ctx.toEl.style.opacity = String(inOpacity);
    }

    function activateDragLayers(ctx, dragState) {
        const rawViewportWidth = dragState.viewportWidth;
        const metrics = measureElementForFixedLayer(ctx.fromEl, window.innerHeight || 0);
        const zoomScale = metrics.zoomScale || 1;
        const dragWidth = rawViewportWidth / zoomScale;
        dragState.zoomScale = zoomScale;
        dragState.dragWidth = dragWidth;

        const bodyStyle = window.getComputedStyle(document.body);
        const bodyPadTop = parseFloat(bodyStyle.paddingTop) || 12;
        const toCbRect = getFixedContainingBlockRect(ctx.toEl);
        const toTop = bodyPadTop - ((toCbRect.top || 0) / zoomScale);

        ctx.unlockContainer = lockContainerHeightForLayering(ctx.fromEl, zoomScale);
        document.documentElement.classList.add('swipe-back-active');

        ctx.toEl.style.top = `${toTop}px`;
        ctx.toEl.style.left = `${metrics.left}px`;
        ctx.toEl.style.width = `${metrics.width}px`;
        ctx.toEl.style.minHeight = `${metrics.minHeight}px`;
        ctx.toEl.style.transition = 'none';
        ctx.toEl.classList.add('swipe-back-incoming-layer');

        ctx.fromEl.style.top = `${metrics.top}px`;
        ctx.fromEl.style.left = `${metrics.left}px`;
        ctx.fromEl.style.width = `${metrics.width}px`;
        ctx.fromEl.style.minHeight = `${metrics.minHeight}px`;
        ctx.fromEl.style.transition = 'none';
        ctx.fromEl.classList.add('swipe-back-outgoing-layer');

        applyProgress(ctx, 0, dragWidth);
    }

    window.addEventListener('touchstart', (e) => {
        if (!isIosMobileDevice()) return;
        if (state && state.settling) return;
        if (!e.touches || e.touches.length !== 1) return;
        if (hasVisibleModalOverlay()) return;
        if (isBlockedSwipeTarget(e.target)) return;

        const touch = e.touches[0];
        // 严格限定：仅当手指从屏幕最左侧边缘开始滑动时触发
        if (touch.clientX > EDGE_START_MAX_X) return;

        const ctx = resolveSwipeBackContext();
        if (!ctx) return;

        const vw = window.innerWidth || document.documentElement.clientWidth || 375;
        state = {
            ctx,
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastTime: Date.now(),
            lastMoveTime: Date.now(),
            velocityX: 0,
            hasVelocitySample: false,
            locked: false,
            aborted: false,
            settling: false,
            viewportWidth: vw,
            dragWidth: vw,
            zoomScale: 1
        };
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!state || state.aborted || state.settling) return;
        if (!e.touches || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;

        if (!state.locked) {
            if (Math.abs(dy) > Math.abs(dx) * 1.1 && Math.abs(dy) > LOCK_THRESHOLD_PX) {
                state.aborted = true;
                return;
            }
            if (dx > LOCK_THRESHOLD_PX && dx > Math.abs(dy) * 1.15) {
                state.locked = true;
                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    try { document.activeElement.blur(); } catch (err) { }
                }
                activateDragLayers(state.ctx, state);
            } else {
                return;
            }
        }

        if (e.cancelable) {
            e.preventDefault();
        }

        const now = Date.now();
        const deltaX = touch.clientX - state.lastX;
        const dt = now - state.lastTime;
        if (dt >= 8 || Math.abs(deltaX) >= 1) {
            const instV = deltaX / Math.max(8, dt);
            state.velocityX = state.hasVelocitySample ? (state.velocityX * 0.45 + instV * 0.55) : instV;
            state.hasVelocitySample = true;
            state.lastX = touch.clientX;
            state.lastTime = now;
            if (Math.abs(deltaX) >= 0.5) {
                state.lastMoveTime = now;
            }
        }

        const progress = Math.max(0, Math.min(1, dx / state.viewportWidth));
        applyProgress(state.ctx, progress, state.dragWidth);
    }, { passive: false });

    function finishSwipe(isCancelled) {
        if (!state) return;
        const current = state;

        if (!current.locked || current.aborted) {
            state = null;
            return;
        }

        current.settling = true;
        const now = Date.now();
        const idleMs = Math.max(0, now - (current.lastMoveTime || current.lastTime));
        const effectiveVelocity = idleMs > 90
            ? Math.max(0, current.velocityX * Math.max(0, 1 - (idleMs - 90) / 120))
            : Math.max(0, current.velocityX);

        const dx = Math.max(0, current.lastX - current.startX);
        const progress = Math.max(0, Math.min(1, dx / current.viewportWidth));
        const shouldCommit = !isCancelled && (progress >= COMMIT_PROGRESS || (effectiveVelocity > COMMIT_VELOCITY && dx > 36));
        const reduced = isReducedMotionActive();
        const settleDuration = computeSwipeBackSettleDuration({
            viewportWidth: current.viewportWidth,
            progress,
            velocityX: effectiveVelocity,
            shouldCommit,
            reduced
        });
        const ease = 'cubic-bezier(0.2, 0.88, 0.32, 1)';
        const dragWidth = current.dragWidth || current.viewportWidth;

        if (settleDuration > 0) {
            const tr = `transform ${settleDuration}ms ${ease}, opacity ${settleDuration}ms ${ease}`;
            current.ctx.fromEl.style.transition = tr;
            current.ctx.toEl.style.transition = tr;
        } else {
            current.ctx.fromEl.style.transition = 'none';
            current.ctx.toEl.style.transition = 'none';
        }

        if (shouldCommit) {
            current.ctx.fromEl.style.transform = `translate3d(${dragWidth}px, 0, 0)`;
            current.ctx.fromEl.style.opacity = '0';
            current.ctx.toEl.style.transform = 'translate3d(0, 0, 0)';
            current.ctx.toEl.style.opacity = '1';
        } else {
            current.ctx.fromEl.style.transform = 'translate3d(0, 0, 0)';
            current.ctx.fromEl.style.opacity = '1';
            current.ctx.toEl.style.transform = `translate3d(${-INCOMING_OFFSET_RATIO * dragWidth}px, 0, 0)`;
            current.ctx.toEl.style.opacity = '0.55';
        }

        setTimeout(() => {
            state = null;
            if (shouldCommit) {
                if (current.ctx.toEl) {
                    current.ctx.toEl.classList.add('no-enter-anim');
                }
                window.__skipNextBackAnimation = true;
                try {
                    // 先在保持双层定位（目标页已静止于 (0,0)）期间提交视图状态切换，再解除固定定位，彻底消除返回后的 1 帧尺寸/排版跳变
                    current.ctx.commit();
                } finally {
                    resetSwipeLayers(current.ctx);
                    if (current.ctx.toEl) {
                        requestAnimationFrame(() => current.ctx.toEl.classList.remove('no-enter-anim'));
                    }
                    setTimeout(() => { window.__skipNextBackAnimation = false; }, 0);
                }
            } else {
                resetSwipeLayers(current.ctx);
            }
        }, settleDuration + 16);
    }

    window.addEventListener('touchend', () => finishSwipe(false), { passive: true });
    window.addEventListener('touchcancel', () => finishSwipe(true), { passive: true });
})();
