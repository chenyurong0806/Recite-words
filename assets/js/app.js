/**
 * 系统初始化生命周期与网络字体检测
 * Module: assets/js/app.js
 */

/* ==========================================================================
   14. 系统初始化启动逻辑
   ========================================================================== */
async function bootstrapApp() {
    initDisplaySettings();
    if (typeof renderAuthUsersList === 'function') {
        renderAuthUsersList();
    }
    checkCloudVersion(false);
    checkFirstOpenWelcome();
    checkIosSafariPwa();
    checkLocalIconFontAvailability();
    initGlobalVirtualKeyboard();

    // 检查 Toy 云端是否有持久化游客身份或统计数据（防止苹果手机/Iframe环境刷新重置游客编号）
    const isToyContainer = typeof window !== 'undefined' && window.toy && typeof window.toy.getCloudStorage === 'function' && (window.self !== window.top || (typeof isBilibiliToy !== 'undefined' && isBilibiliToy));
    if (isToyContainer) {
        try {
            const fetchPromise = window.toy.getCloudStorage(['guest_id', 'toy_stats']);
            if (fetchPromise && typeof fetchPromise.catch === 'function') fetchPromise.catch(() => { });
            const tData = await fetchPromise;
            if (tData && tData.guest_id && /^游客_\d{4}$/.test(tData.guest_id)) {
                window.__cachedToyGuestId = tData.guest_id;
                SafeStorage.setItem('vocab_guest_name', tData.guest_id);
                if (typeof setCookie === 'function') setCookie('vocab_guest_name', tData.guest_id, 365);
                if (currentUserProfile && currentUserProfile.type === 'guest') {
                    currentUserProfile.username = tData.guest_id;
                }
            }
            if (tData && tData.toy_stats) {
                try {
                    const p = typeof tData.toy_stats === 'string' ? JSON.parse(tData.toy_stats) : tData.toy_stats;
                    const gid = (tData && tData.guest_id) || SafeStorage.getItem('vocab_guest_name');
                    if (gid && !SafeStorage.getItem(`vocab_stats_${gid}`)) {
                        SafeStorage.setItem(`vocab_stats_${gid}`, JSON.stringify({ total: p.t || 0, correct: p.c || 0, mistakes: {} }));
                    }
                } catch (e) { }
            }
        } catch (e) { }
    }

    const isLocalStartup = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalStartup && typeof BookManager !== 'undefined' && typeof BookManager.fetchBookList === 'function') {
        BookManager.fetchBookList(true);
    }

    if (typeof updatePronunciationSettingsChips === 'function') {
        updatePronunciationSettingsChips();
    }

    if (currentUserProfile && currentUserProfile.isLoggedIn && currentUserProfile.username) {
        loadUserData(currentUserProfile.username, currentUserProfile);
        if (currentUserProfile.type === 'cloud' && typeof supabaseFetchUserData === 'function') {
            supabaseFetchUserData(currentUserProfile.username).then(user => {
                if (user) {
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
    switchView('view-hub');
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

