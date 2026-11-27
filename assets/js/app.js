/**
 * 系统初始化生命周期与网络字体检测
 * Module: assets/js/app.js
 */

/* ==========================================================================
   14. 系统初始化启动逻辑
   ========================================================================== */
async function bootstrapApp() {
    initDisplaySettings();
    document.querySelectorAll('.view:not(.active)').forEach(v => {
        v.inert = true;
        v.setAttribute('aria-hidden', 'true');
    });

    // 1. 首先初始化并等待 IndexedDB 本地数据库恢复所有离线 KV 数据 (解决 PWA/Toy 添加到主屏幕数据重置)
    if (typeof VocabOfflineDB !== 'undefined' && typeof VocabOfflineDB.init === 'function') {
        try {
            await VocabOfflineDB.init();
            if (typeof loadSingleConfig === 'function') loadSingleConfig();
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

    // 4. 加载当前用户数据并验证云端账号是否存在与可用
    if (currentUserProfile && currentUserProfile.isLoggedIn && currentUserProfile.username && !currentUserProfile.username.startsWith('游客')) {
        const activeUser = currentUserProfile.username;
        loadUserData(activeUser, currentUserProfile);

        if (currentUserProfile.type === 'cloud' && typeof supabaseVerifyAccountStatus === 'function') {
            supabaseVerifyAccountStatus(activeUser).then(status => {
                if (status.networkError) {
                    // 网络问题/离线，保持离线缓存正常学习
                    return;
                }

                // 检查 A：账号不存在或已被删除 -> 自动登出并删除本地记录
                if (!status.exists) {
                    console.warn(`[Auth] 账号“${activeUser}”在云端不存在，执行自动登出并删除本地记录`);
                    if (typeof removeSavedDeviceAccount === 'function') {
                        removeSavedDeviceAccount(activeUser);
                    }
                    SafeStorage.removeItem('vocab_auth_session');
                    SafeStorage.removeItem('vocab_pk_user');
                    if (SafeStorage.getItem('vocab_registered_account') === activeUser) {
                        SafeStorage.removeItem('vocab_registered_account');
                        SafeStorage.removeItem('vocab_device_has_registered');
                    }
                    if (typeof handleAuthLogout === 'function') {
                        handleAuthLogout(false);
                    }
                    if (typeof showToast === 'function') {
                        showToast(`账号“${activeUser}”不存在或已被管理员删除，已退出登录`, 4000);
                    }
                    return;
                }

                // 检查 B：账号被封禁 -> 自动登出并禁止登录和注册
                if (status.isBanned) {
                    console.warn(`[Auth] 账号“${activeUser}”已被管理员封禁，执行自动退出并锁定！`);
                    if (typeof markDeviceBanned === 'function') {
                        markDeviceBanned(activeUser, status.deviceId);
                    }
                    if (typeof handleAuthLogout === 'function') {
                        handleAuthLogout(false);
                    }
                    if (typeof showToast === 'function') {
                        showToast(`账号“${activeUser}”已被管理员封禁，已强制退出登录，禁止登录与注册！`, 6000);
                    }
                    return;
                }

                // 账号正常可用：清除可能残留的本地封禁标记
                if (typeof unmarkDeviceBanned === 'function') {
                    unmarkDeviceBanned(activeUser);
                }

                // 如果未绑定 device_id，自动补全绑定当前设备
                const myDeviceId = (typeof getDeviceId === 'function') ? getDeviceId() : null;
                if (myDeviceId && !status.deviceId && typeof sbClient !== 'undefined') {
                    sbClient.from('user_accounts').update({ device_id: myDeviceId }).eq('username', activeUser).then(() => { }).catch(() => { });
                }

                // 继续拉取并合并用户云端数据（禁止直接覆盖本地已有更高进度）
                if (typeof pullAndMergeUserDataFromCloud === 'function') {
                    pullAndMergeUserDataFromCloud(activeUser).catch(() => { });
                } else if (typeof supabaseFetchUserData === 'function') {
                    supabaseFetchUserData(activeUser).then(user => {
                        if (user && typeof restoreUserDataFromCloud === 'function') {
                            restoreUserDataFromCloud(user);
                        }
                    }).catch(() => { });
                }
            }).catch(e => {
                console.warn('[Auth] Check account validity failed:', e);
            });
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
    checkFirstOpenWelcome();
    checkIosSafariPwa();
    checkLocalIconFontAvailability();
    initGlobalVirtualKeyboard();

    // 清理 Toy 云储存中的所有词书残留数据
    // if (typeof cleanToyLegacyBookStorage === 'function') {
    //     cleanToyLegacyBookStorage().catch(() => {});
    // }

    if (typeof BookManager !== 'undefined' && typeof BookManager.init === 'function') {
        BookManager.init().catch(e => console.warn('[BookManager] init error:', e));
    }

    if (typeof ItemManager !== 'undefined' && typeof ItemManager.fetchUserItems === 'function') {
        ItemManager.fetchUserItems(true).catch(e => console.warn('[ItemManager] init error:', e));
    }

    if (typeof ActivityManager !== 'undefined' && typeof ActivityManager.init === 'function') {
        ActivityManager.init().catch(e => console.warn('[ActivityManager] init error:', e));
    }

    if (typeof MailManager !== 'undefined' && typeof MailManager.init === 'function') {
        MailManager.init().catch(e => console.warn('[MailManager] init error:', e));
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

    const candidates = [
        './assets/fonts/material-symbols-rounded-subset.woff2',
        './assets/fonts/material-symbols-rounded.woff2',
        './material-symbols-rounded.woff2'
    ];

    if (typeof FontFace !== 'undefined') {
        for (const fontUrl of candidates) {
            try {
                const font = new FontFace('Material Symbols Rounded', `url(${fontUrl})`);
                await font.load();
                document.fonts.add(font);
                return;
            } catch (e) { }
        }
        if (document.fonts && document.fonts.check && document.fonts.check('24px "Material Symbols Rounded"', 'home')) {
            return;
        }
        showMissingIconsModal();
    } else {
        for (const fontUrl of candidates) {
            try {
                const res = await fetch(fontUrl);
                if (res.ok || res.status === 304 || res.status === 0) return;
            } catch (e) {
                return;
            }
        }
        showMissingIconsModal();
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
        if (!window._cloudRestoreDone || window._cloudRestoreDone[currentUser]) {
            syncAllUserDataToCloud(currentUser, { keepalive: true });
        }
    }
});

let lastForegroundPullAt = 0;
function triggerForegroundCloudPull() {
    const now = Date.now();
    if (now - lastForegroundPullAt < 30000) return;
    if (typeof pullAndMergeUserDataFromCloud !== 'function') return;
    if (typeof currentUser === 'undefined' || !currentUser || currentUser.startsWith('游客')) return;
    if (typeof currentUserProfile === 'undefined' || !currentUserProfile || !currentUserProfile.isLoggedIn) return;
    if (currentUserProfile.type !== 'cloud' && currentUserProfile.type !== 'bilibili') return;
    lastForegroundPullAt = now;
    const autoSyncAllowed = (typeof isAutoSyncEnabled === 'function')
        ? isAutoSyncEnabled()
        : (localStorage.getItem('vocab_auto_sync_enabled') !== 'false');
    pullAndMergeUserDataFromCloud(currentUser, { keepLocalConfigs: !autoSyncAllowed }).catch(() => { });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (typeof syncAllUserDataToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
            if (!window._cloudRestoreDone || window._cloudRestoreDone[currentUser]) {
                syncAllUserDataToCloud(currentUser, { keepalive: true });
            }
        }
    } else if (document.visibilityState === 'visible') {
        triggerForegroundCloudPull();
    }
});

window.addEventListener('focus', () => {
    triggerForegroundCloudPull();
});


