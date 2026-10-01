/**
 * 系统初始化生命周期与网络字体检测
 * Module: assets/js/app.js
 */

/* ==========================================================================
   14. 系统初始化启动逻辑
   ========================================================================== */
async function bootstrapApp() {
    initDisplaySettings();

    // 1. 首先初始化并等待 IndexedDB 本地数据库恢复所有离线 KV 数据 (解决 PWA/Toy 添加到主屏幕数据重置)
    if (typeof VocabOfflineDB !== 'undefined' && typeof VocabOfflineDB.init === 'function') {
        try {
            await VocabOfflineDB.init();
        } catch (e) { }
    }

    // 2. 检查 Toy 云端是否有持久化账号、登录态、游客身份或统计数据（保障添加到主屏幕及独立窗口持久化）
    const hasToyApi = typeof window !== 'undefined' && window.toy && typeof window.toy.getCloudStorage === 'function';
    if (hasToyApi) {
        try {
            const fetchPromise = window.toy.getCloudStorage(['guest_id', 'auth_session', 'device_accounts', 'current_user', 'toy_stats', 'vocab_auth_session', 'vocab_device_accounts', 'vocab_pk_user', 'vocab_guest_name']);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1200));
            const tData = await Promise.race([fetchPromise, timeoutPromise]);
            if (tData) {
                const rawAuth = tData.auth_session || tData.vocab_auth_session;
                if (rawAuth) {
                    const sStr = typeof rawAuth === 'string' ? rawAuth : JSON.stringify(rawAuth);
                    SafeStorage.setItem('vocab_auth_session', sStr);
                }
                const rawAccounts = tData.device_accounts || tData.vocab_device_accounts;
                if (rawAccounts) {
                    const aStr = typeof rawAccounts === 'string' ? rawAccounts : JSON.stringify(rawAccounts);
                    SafeStorage.setItem('vocab_device_accounts', aStr);
                }
                const rawUser = tData.current_user || tData.vocab_pk_user;
                if (rawUser && !String(rawUser).startsWith('游客')) {
                    SafeStorage.setItem('vocab_pk_user', String(rawUser));
                }
                const gid = tData.guest_id || tData.vocab_guest_name;
                if (gid && /^游客_\d{4,}$/.test(gid)) {
                    window.__cachedToyGuestId = gid;
                    SafeStorage.setItem('vocab_guest_name', gid);
                    if (typeof setCookie === 'function') setCookie('vocab_guest_name', gid, 365);
                }
                if (tData.toy_stats) {
                    try {
                        const p = typeof tData.toy_stats === 'string' ? JSON.parse(tData.toy_stats) : tData.toy_stats;
                        const statGid = gid || SafeStorage.getItem('vocab_guest_name');
                        if (statGid && !SafeStorage.getItem(`vocab_stats_${statGid}`)) {
                            SafeStorage.setItem(`vocab_stats_${statGid}`, JSON.stringify({ total: p.t || 0, correct: p.c || 0, mistakes: {} }));
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { }
    }

    // 3. 从已恢复的存储中刷新当前登录用户 Profile 与设备账号列表
    if (typeof refreshCurrentUserProfileFromStorage === 'function') {
        refreshCurrentUserProfileFromStorage();
    }
    if (typeof renderAuthUsersList === 'function') {
        renderAuthUsersList();
    }
    if (typeof renderSavedDeviceAccounts === 'function') {
        renderSavedDeviceAccounts();
    }

    // 4. 加载当前用户数据
    if (currentUserProfile && currentUserProfile.isLoggedIn && currentUserProfile.username) {
        loadUserData(currentUserProfile.username, currentUserProfile);
        if (currentUserProfile.type === 'cloud' && typeof supabaseFetchUserData === 'function') {
            supabaseFetchUserData(currentUserProfile.username).then(user => {
                if (user) {
                    if (typeof restoreUserDataFromCloud === 'function') {
                        restoreUserDataFromCloud(user);
                    }
                    if (user.user_data && user.user_data.stats) {
                        try {
                            SafeStorage.setItem(`vocab_stats_${user.username}`, JSON.stringify(user.user_data.stats));
                            userStats = user.user_data.stats;
                        } catch (e) { }
                    }
                    if (user.avatar_url && user.avatar_url !== currentUserProfile.avatar) {
                        currentUserProfile.avatar = user.avatar_url;
                        SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
                        SafeStorage.setItem(`vocab_user_avatar_${user.username}`, user.avatar_url);
                        if (typeof updateHub === 'function') updateHub();
                    }
                }
            }).catch(() => { });
        }
    } else {
        loadUserData((currentUserProfile && currentUserProfile.username) || (typeof defaultGuestName !== 'undefined' ? defaultGuestName : '游客'));
    }

    // 5. 首次且唯一一次切换到主页，避免异步任务完成后再次 switchView 导致页面闪烁重置
    if (typeof switchView === 'function') {
        switchView('view-hub');
    }

    if (typeof updatePronunciationSettingsChips === 'function') {
        updatePronunciationSettingsChips();
    }

    // 6. 后台异步执行其他初始化任务（不阻塞主线程，不触发 switchView）
    checkCloudVersion(false);
    checkFirstOpenWelcome();
    checkIosSafariPwa();
    checkLocalIconFontAvailability();
    initGlobalVirtualKeyboard();

    if (typeof BookManager !== 'undefined' && typeof BookManager.init === 'function') {
        BookManager.init().catch(e => console.warn('[BookManager] init error:', e));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
    bootstrapApp();
}

// ----------------- 网络环境与镜像检测 -----------------
let isDomesticNetCached = null;
function isDomesticNetwork() {
    if (isDomesticNetCached !== null) return isDomesticNetCached;
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        isDomesticNetCached = tz.includes('Shanghai') || tz.includes('Chongqing') || tz.includes('Harbin') || tz.includes('Urumqi') || tz.startsWith('Asia/');
    } catch (e) {
        isDomesticNetCached = true;
    }
    return isDomesticNetCached;
}

function getGithubAssetUrl(url) {
    if (!url) return '';
    if (isDomesticNetwork() && url.includes('github.com')) {
        return 'https://ghfast.top/' + url;
    }
    return url;
}

// ----------------- 缺失图标字体提示 -----------------
async function checkLocalIconFontAvailability() {
    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;

    if (typeof FontFace !== 'undefined') {
        try {
            const font = new FontFace('Material Symbols Rounded', 'url(./assets/fonts/material-symbols-rounded.woff2)');
            await font.load();
            document.fonts.add(font);
            return;
        } catch (e1) {
            try {
                const fontRoot = new FontFace('Material Symbols Rounded', 'url(./material-symbols-rounded.woff2)');
                await fontRoot.load();
                document.fonts.add(fontRoot);
                return;
            } catch (e2) {
                if (document.fonts && document.fonts.check && document.fonts.check('24px "Material Symbols Rounded"', 'home')) {
                    return;
                }
                showMissingIconsModal();
            }
        }
    } else {
        try {
            const res = await fetch('./assets/fonts/material-symbols-rounded.woff2');
            if (res.ok || res.status === 304 || res.status === 0) return;
            showMissingIconsModal();
        } catch (e) {
            // 忽视网络读取异常，不主动触发弹窗
        }
    }
}

function showMissingIconsModal() {
    const modal = document.getElementById('modal-missing-icons');
    if (modal) modal.classList.add('active');
}

function continueWithoutIcons() {
    document.body.classList.add('hide-all-icons');
    const modal = document.getElementById('modal-missing-icons');
    if (modal) modal.classList.remove('active');
}

function downloadIconFontFile() {
    const directUrl = 'https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/assets/fonts/material-symbols-rounded.woff2';
    window.open(getGithubAssetUrl(directUrl), '_blank');
}

// ----------------- iOS Safari PWA 引导 -----------------
function checkIosSafariPwa() {
    if (isBilibiliToy) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
        const hasShown = sessionStorage.getItem('ios_pwa_prompt_shown');
        if (!hasShown) {
            sessionStorage.setItem('ios_pwa_prompt_shown', 'true');
            const modal = document.getElementById('ios-pwa-modal');
            const btn = document.getElementById('btn-close-ios-pwa');
            if (modal) {
                modal.classList.add('active');
                let timeLeft = 5;
                if (btn) {
                    btn.disabled = true;
                    btn.innerText = `关闭 (${timeLeft}s)`;
                    const timer = setInterval(() => {
                        timeLeft--;
                        if (timeLeft > 0) {
                            btn.innerText = `关闭 (${timeLeft}s)`;
                        } else {
                            clearInterval(timer);
                            btn.disabled = false;
                            btn.innerText = '关闭';
                        }
                    }, 1000);
                }
            }
        }
    }
}

function closeIosPwaModal() {
    const modal = document.getElementById('ios-pwa-modal');
    if (modal) modal.classList.remove('active');
}

// 页面关闭或切入后台时，通过 keepalive 保证将全量学习数据与等级同步至 Supabase
window.addEventListener('beforeunload', () => {
    if (typeof syncAllUserDataToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
        syncAllUserDataToCloud(currentUser, { keepalive: true });
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (typeof syncAllUserDataToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
            syncAllUserDataToCloud(currentUser, { keepalive: true });
        }
    }
});


