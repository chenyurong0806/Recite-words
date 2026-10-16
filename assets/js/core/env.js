/**
 * 环境检测与全局版本常量
 * Module: assets/js/core/env.js
 */

if (typeof window !== 'undefined') {
    window.APP_VERSION = '2.7.0';
}
var APP_VERSION = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : '2.7.0';

/* ==========================================================================
环境检测：判断是否运行在 B 站 Toy 容器内
========================================================================== */
const isBilibiliToy = (() => {
    try {
        // 0. window.toy SDK 或缓存凭证存在
        if (typeof window !== 'undefined' && (Boolean(window.toy) || Boolean(window.__cachedToyGuestId))) return true;

        // 1. URL 参数标记 (支持测试 ?bilibili=1 / ?bili_toy=1 / ?toy=1)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('bilibili') || urlParams.has('bili_toy') || urlParams.has('toy')) return true;

        // 2. 域名检测 (运行在 B 站官方域名下)
        const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
        if (host.includes('bilibili.com') || host.includes('hdslb.com')) return true;

        // 3. 路径特征 (B 站 Toy 专属运行路径 /toy/<slug>/)
        const pathname = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        if (pathname.includes('/toy/')) return true;

        // 4. 宿主环境 Referrer 检测
        if (document.referrer && (document.referrer.includes('bilibili.com') || document.referrer.includes('bili'))) {
            return true;
        }

        // 5. 客户端 UserAgent 检测 (B 站 App WebView 容器内)
        if (typeof navigator !== 'undefined' && navigator.userAgent && /bili/i.test(navigator.userAgent)) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
})();

// 沙箱环境（如 B 站 Toy）防护：避免 alert() 在无 allow-modals 的 iframe 中报错
if (typeof window !== 'undefined') {
    const _origAlert = window.alert;
    window.alert = function (msg) {
        if (typeof showToast === 'function') {
            showToast(String(msg));
        } else {
            try {
                if (_origAlert) _origAlert.call(window, msg);
            } catch (e) {
                console.warn('[Sandbox Alert Ignored]:', msg);
            }
        }
    };
}

/* ==========================================================================
   设备唯一标识与封禁状态检测
   ========================================================================== */
function getDeviceId() {
    let deviceId = null;
    try {
        deviceId = localStorage.getItem('vocab_device_unique_id');
    } catch (e) { }

    if (!deviceId) {
        try {
            if (typeof document !== 'undefined' && document.cookie) {
                const match = document.cookie.match(/(?:^|; )vocab_device_unique_id=([^;]*)/);
                if (match) deviceId = decodeURIComponent(match[1]);
            }
        } catch (e) { }
    }

    if (!deviceId) {
        const rand = Math.random().toString(36).slice(2, 10);
        const time = Date.now().toString(36);
        const screenKey = (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}` : '0';
        deviceId = `dev_${time}_${rand}_${screenKey}`;
        try {
            localStorage.setItem('vocab_device_unique_id', deviceId);
        } catch (e) { }
        try {
            if (typeof document !== 'undefined') {
                const expires = new Date(Date.now() + 3650 * 864e5).toUTCString();
                document.cookie = `vocab_device_unique_id=${encodeURIComponent(deviceId)}; expires=${expires}; path=/; SameSite=Lax`;
            }
        } catch (e) { }
    }
    return deviceId;
}

function isDeviceBannedLocally() {
    try {
        if (localStorage.getItem('vocab_is_banned') === 'true') return true;
        const devId = getDeviceId();
        const bannedDev = localStorage.getItem('vocab_banned_device_id');
        if (bannedDev && bannedDev === devId) return true;
    } catch (e) { }
    return false;
}

function markDeviceBanned(username = '', deviceId = '') {
    try {
        localStorage.setItem('vocab_is_banned', 'true');
        if (username) localStorage.setItem(`vocab_banned_user_${username}`, 'true');
        const dev = deviceId || getDeviceId();
        if (dev) localStorage.setItem('vocab_banned_device_id', dev);
    } catch (e) { }
}

function unmarkDeviceBanned(username = '') {
    try {
        localStorage.removeItem('vocab_is_banned');
        localStorage.removeItem('vocab_banned_device_id');
        if (username) localStorage.removeItem(`vocab_banned_user_${username}`);
    } catch (e) { }
}

/* ==========================================================================
   离线模式核心状态与控制器
   ========================================================================== */
window._isDeviceOfflineForce = false;

async function checkDeviceNetworkOnline() {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.isNetworkOnline === 'function') {
        try {
            const isOnline = await window.electronAPI.isNetworkOnline();
            return !!isOnline;
        } catch (e) {
            console.warn('[checkDeviceNetworkOnline] electronAPI error:', e);
        }
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        await fetch('https://dict.youdao.com/favicon.ico', { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);
        return true;
    } catch (e) {
        return false;
    }
}

function isOfflineMode() {
    if (window._isDeviceOfflineForce) {
        return true;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return true;
    }
    try {
        return localStorage.getItem('vocab_offline_mode') === 'true';
    } catch (e) {
        return false;
    }
}

function setOfflineMode(enabled, force = false) {
    if (!enabled && (window._isDeviceOfflineForce || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        if (typeof showToast === 'function') {
            showToast('当前设备未连接网络，强制保持离线模式');
        }
        try { localStorage.setItem('vocab_offline_mode', 'true'); } catch (e) {}
        handleOfflineModeChange(true);
        return false;
    }

    try {
        localStorage.setItem('vocab_offline_mode', enabled ? 'true' : 'false');
    } catch (e) {}

    handleOfflineModeChange(enabled);
    return true;
}

function handleOfflineModeChange(enabled) {
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('is-offline-mode', !!enabled);
        // 仅在设备无法联网的情况下删除换背景按钮
        if (window._isDeviceOfflineForce || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            const btnPosterBg = document.getElementById('btn-poster-change-bg');
            if (btnPosterBg) btnPosterBg.remove();
        }
    }
    const toggle = document.getElementById('toggle-offline-mode');
    if (toggle) {
        toggle.checked = !!enabled;
        if (window._isDeviceOfflineForce || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            toggle.disabled = true;
        } else {
            toggle.disabled = false;
        }
    }
    const desc = document.getElementById('settings-offline-mode-desc');
    if (desc) {
        if (window._isDeviceOfflineForce || (typeof navigator !== 'undefined' && !navigator.onLine)) {
            desc.innerText = '当前设备未连接网络，强制保持离线模式';
        } else if (enabled) {
            desc.innerText = '已开启离线模式，使用纯本地数据，不进行任何网络通信';
        } else {
            desc.innerText = '开启后完全使用本地数据，不进行任何网络通信';
        }
    }

    // 离线模式下状态徽标
    const badge = document.getElementById('hub-online-offline-badge');
    const badgeText = document.getElementById('hub-online-offline-text');
    if (badge && badgeText && enabled) {
        badge.className = 'network-status-badge offline';
        badgeText.innerText = '离线模式';
    }

    // 联动禁用/恢复“自动同步”按钮
    const autoSyncSwitch = document.getElementById('switch-auto-sync');
    const autoSyncLabel = document.getElementById('switch-auto-sync-label');
    if (enabled) {
        if (autoSyncSwitch) {
            if (!autoSyncSwitch.disabled) {
                try { localStorage.setItem('vocab_prev_auto_sync', autoSyncSwitch.checked ? 'true' : 'false'); } catch (e) {}
            }
            autoSyncSwitch.checked = false;
            autoSyncSwitch.disabled = true;
        }
        if (autoSyncLabel) {
            autoSyncLabel.style.opacity = '0.4';
            autoSyncLabel.style.pointerEvents = 'none';
        }
    } else {
        if (autoSyncSwitch) {
            autoSyncSwitch.disabled = false;
            let prevSync = 'true';
            try { prevSync = localStorage.getItem('vocab_prev_auto_sync') || 'true'; } catch (e) {}
            autoSyncSwitch.checked = (prevSync === 'true');
        }
        if (autoSyncLabel) {
            autoSyncLabel.style.opacity = '1';
            autoSyncLabel.style.pointerEvents = 'auto';
        }
    }

    if (enabled) {
        // 1. 断开与服务器的长连接通道，不再发送任何 api 请求
        if (typeof unsubscribeGlobalPresence === 'function') {
            try { unsubscribeGlobalPresence(); } catch (e) {}
        }
        // 2. 隐藏右上角云端版本提示
        const updateCard = document.getElementById('version-update-card');
        if (updateCard) updateCard.style.display = 'none';

        // 3. 返回登录页面 (若当前非本地账号已登录状态，强制切回登录页)
        if (typeof currentUserProfile === 'undefined' || !currentUserProfile || currentUserProfile.type !== 'local') {
            if (typeof switchView === 'function') {
                switchView('view-auth');
            }
        }
    } else {
        // 关闭离线模式：退出本地账号，清理本地会话，并切回在线登录页
        if (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.type === 'local') {
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else {
                try { localStorage.removeItem('vocab_user_token'); } catch (e) {}
                if (typeof currentUser !== 'undefined') currentUser = '';
            }
        }
        if (typeof switchView === 'function') {
            switchView('view-auth');
        }
    }

    if (typeof renderAuthView === 'function') {
        renderAuthView();
    }

    // 刷新词书分类与选择页面
    if (typeof BookManager !== 'undefined' && typeof BookManager.refreshCategories === 'function') {
        BookManager.refreshCategories();
    }
    if (typeof renderBookSelectorPage === 'function' && typeof currentView !== 'undefined' && currentView === 'view-book-selector') {
        renderBookSelectorPage();
    }
    if (typeof renderManageLocalBooksInSettings === 'function' && typeof currentView !== 'undefined' && currentView === 'view-settings') {
        renderManageLocalBooksInSettings();
    }
}

// 启动时检测设备联网状态，若未联网强制开启离线模式，并在无法联网时删除换背景按钮
if (typeof window !== 'undefined') {
    window.isOfflineMode = isOfflineMode;
    window.setOfflineMode = setOfflineMode;
    window.handleOfflineModeChange = handleOfflineModeChange;
    window.checkDeviceNetworkOnline = checkDeviceNetworkOnline;

    const enforceDeviceNetworkCheck = async () => {
        const isOnline = await checkDeviceNetworkOnline();
        if (!isOnline) {
            window._isDeviceOfflineForce = true;
            try { localStorage.setItem('vocab_offline_mode', 'true'); } catch (e) {}
            handleOfflineModeChange(true);
            const btnPosterBg = document.getElementById('btn-poster-change-bg');
            if (btnPosterBg) btnPosterBg.remove();
        } else {
            window._isDeviceOfflineForce = false;
            const toggle = document.getElementById('toggle-offline-mode');
            if (toggle) toggle.disabled = false;
        }
    };

    enforceDeviceNetworkCheck();

    window.addEventListener('DOMContentLoaded', () => {
        enforceDeviceNetworkCheck();
        if (isOfflineMode()) {
            handleOfflineModeChange(true);
        }
    });

    window.addEventListener('offline', () => {
        window._isDeviceOfflineForce = true;
        setOfflineMode(true, true);
        const btnPosterBg = document.getElementById('btn-poster-change-bg');
        if (btnPosterBg) btnPosterBg.remove();
    });

    window.addEventListener('online', async () => {
        await enforceDeviceNetworkCheck();
        const toggle = document.getElementById('toggle-offline-mode');
        if (toggle) toggle.disabled = false;
        const desc = document.getElementById('settings-offline-mode-desc');
        if (desc && !isOfflineMode()) {
            desc.innerText = '开启后完全使用本地数据，不进行任何网络通信';
        }
    });
}


