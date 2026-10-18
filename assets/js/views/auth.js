/**
 * 账号中心与认证系统 (Supabase 云端账号 & B 站 Toy 授权登录)
 * Module: assets/js/views/auth.js
 */

let authActiveTab = 'login'; // 'login' | 'register'
let regAvatarDataUrl = '';
let localAuthActiveTab = 'login';
let localRegSelectedRank = 1;

function renderAuthView() {
    const offlineContainer = document.getElementById('auth-offline-container');
    const toyContainer = document.getElementById('auth-toy-container');
    const webContainer = document.getElementById('auth-web-container');

    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        if (offlineContainer) offlineContainer.style.display = 'block';
        if (toyContainer) toyContainer.style.display = 'none';
        if (webContainer) webContainer.style.display = 'none';
        switchLocalAuthTab(localAuthActiveTab);
        return;
    }

    if (offlineContainer) offlineContainer.style.display = 'none';
    if (isBilibiliToy) {
        if (toyContainer) toyContainer.style.display = 'block';
        if (webContainer) webContainer.style.display = 'block';
    } else {
        if (toyContainer) toyContainer.style.display = 'none';
        if (webContainer) webContainer.style.display = 'block';
    }
    switchAuthTab(authActiveTab);
}

/* ==========================================================================
   离线模式本地账号专属管理系统 (Requirement 10)
   ========================================================================== */
function selectLocalRegRank(rank) {
    localRegSelectedRank = Math.max(1, Math.min(3, parseInt(rank) || 1));
    const container = document.getElementById('chips-local-reg-rank');
    if (container) {
        const chips = container.querySelectorAll('.md3-chip');
        chips.forEach(chip => {
            const r = parseInt(chip.getAttribute('data-rank'));
            chip.classList.toggle('selected', r === localRegSelectedRank);
        });
    }
}
window.selectLocalRegRank = selectLocalRegRank;

function switchLocalAuthTab(tab) {
    localAuthActiveTab = tab;
    const tabLogin = document.getElementById('tab-auth-local-login');
    const tabReg = document.getElementById('tab-auth-local-register');
    const secLogin = document.getElementById('auth-local-login-section');
    const secReg = document.getElementById('auth-local-register-section');

    if (tabLogin && tabReg) {
        tabLogin.classList.toggle('active', tab === 'login');
        tabReg.classList.toggle('active', tab === 'register');
    }
    if (secLogin) secLogin.style.display = (tab === 'login') ? 'flex' : 'none';
    if (secReg) secReg.style.display = (tab === 'register') ? 'flex' : 'none';

    if (tab === 'login') {
        renderSavedLocalAccounts();
    }
}
window.switchLocalAuthTab = switchLocalAuthTab;

function getLocalAccounts() {
    try {
        const raw = SafeStorage.getItem('vocab_local_accounts');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
window.getLocalAccounts = getLocalAccounts;

function saveLocalAccounts(list) {
    try {
        SafeStorage.setItem('vocab_local_accounts', JSON.stringify(list || []));
    } catch (e) {}
}

function renderSavedLocalAccounts() {
    const listEl = document.getElementById('auth-local-saved-accounts-list');
    if (!listEl) return;

    const accounts = getLocalAccounts();
    if (accounts.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding:20px; color:var(--md-sys-color-outline); font-size:0.88rem;">
                暂无已注册的本地账号，请点击上方“注册本地账号”创建
            </div>
        `;
        return;
    }

    listEl.innerHTML = accounts.map(acc => {
        const username = acc.username;
        let rankDesc = '1段';
        let ratingDesc = '50分';
        if (typeof LevelManager !== 'undefined') {
            const rd = LevelManager.getUserRankData(username);
            rankDesc = `${rd.rank}段`;
            ratingDesc = `${rd.rating}分`;
        } else if (acc.rank) {
            rankDesc = `${acc.rank}段`;
        }

        const safeUser = (typeof escapeHtml === 'function') ? escapeHtml(username) : username;
        return `
            <div class="saved-account-card" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:16px; background:var(--md-sys-color-surface-container, #f1f5f9); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); transition:all 0.2s ease;">
                <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                    <div style="width:42px; height:42px; border-radius:50%; background:var(--md-sys-color-primary-container, #dbeafe); color:var(--md-sys-color-primary, #0061a4); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0;">
                        ${safeUser.charAt(0).toUpperCase()}
                    </div>
                    <div style="min-width:0; flex:1; text-align:left;">
                        <div style="font-weight:700; font-size:1rem; color:var(--md-sys-color-on-surface); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${safeUser}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
                            <span class="badge" style="background:#ffeedb; color:#c45716; font-size:0.72rem; padding:1px 6px; border-radius:6px; font-weight:700;">${rankDesc}</span>
                            <span style="font-size:0.76rem; color:var(--md-sys-color-outline);">${ratingDesc}</span>
                            ${acc.hasPassword ? '<span class="material-symbols-rounded" style="font-size:14px; color:#d97706;" title="有密码保护">lock</span>' : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    <button type="button" class="btn btn-filled btn-sm" style="border-radius:9999px; height:32px; padding:0 14px; font-size:0.84rem; font-weight:700;" onclick="clickSavedLocalAccountToLogin('${safeUser}')">登录</button>
                    <button type="button" class="md3-icon-btn" onclick="removeLocalAccount('${safeUser}')" title="删除本地账号" style="width:32px; height:32px; border-radius:50%; background:#e2e8f0; border:none; display:flex; align-items:center; justify-content:center; padding:0; cursor:pointer;">
                        <span class="material-symbols-rounded" style="font-size:16px; color:#475569;">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
window.renderSavedLocalAccounts = renderSavedLocalAccounts;

async function clickSavedLocalAccountToLogin(username) {
    const accounts = getLocalAccounts();
    const acc = accounts.find(a => a.username === username);
    if (!acc) return;

    if (acc.hasPassword) {
        const pwd = prompt(`请输入本地账号“${username}”的密码：`);
        if (pwd === null) return;
        const hashed = await hashPassword(pwd);
        if (hashed !== acc.passwordHash) {
            return showToast('密码错误，请重新输入');
        }
    }

    loginLocalAccount(acc);
}
window.clickSavedLocalAccountToLogin = clickSavedLocalAccountToLogin;

function loginLocalAccount(acc) {
    if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
        MailManager.resetForUser(acc.username);
    }
    const accounts = getLocalAccounts();
    acc.lastLoginTime = Date.now();
    const idx = accounts.findIndex(a => a.username === acc.username);
    if (idx >= 0) accounts[idx] = acc;
    saveLocalAccounts(accounts);

    let rank = acc.rank || acc.initialRank || 1;
    if (typeof LevelManager !== 'undefined') {
        const rd = LevelManager.getUserRankData(acc.username);
        rank = rd.rank;
    }

    currentUserProfile = {
        isLoggedIn: true,
        type: 'local',
        username: acc.username,
        avatar: acc.avatar || '',
        rank: rank
    };

    SafeStorage.setItem('vocab_local_current_user', acc.username);
    SafeStorage.setItem('vocab_pk_user', acc.username);
    SafeStorage.removeItem('vocab_user_logged_out');

    loadUserData(acc.username, currentUserProfile);

    showToast(`欢迎回来本地账号 ${acc.username}！`);
    switchView('view-hub');
    if (typeof updateHub === 'function') updateHub();
    if (typeof renderMeView === 'function') renderMeView();
}

function removeLocalAccount(username) {
    if (!confirm(`确定要从本设备删除本地账号“${username}”吗？其做题记录将一并清除。`)) return;
    let accounts = getLocalAccounts();
    accounts = accounts.filter(a => a.username !== username);
    saveLocalAccounts(accounts);

    // 清除该本地用户的专属数据
    try {
        SafeStorage.removeItem(`vocab_stats_${username}`);
        SafeStorage.removeItem(`vocab_rank_data_${username}`);
        SafeStorage.removeItem(`vocab_ebbinghaus_db_${username}`);
        SafeStorage.removeItem(`vocab_mastered_words_${username}`);
        SafeStorage.removeItem(`vocab_daily_logs_${username}`);
        SafeStorage.removeItem(`vocab_single_selected_books_${username}`);
    } catch (e) {}

    if (currentUser === username) {
        currentUser = null;
        currentUserProfile = null;
        SafeStorage.removeItem('vocab_local_current_user');
    }

    renderSavedLocalAccounts();
    showToast(`已删除本地账号“${username}”`);
}
window.removeLocalAccount = removeLocalAccount;

async function handleLocalRegister() {
    const nameInp = document.getElementById('auth-local-reg-username');
    const pwdInp = document.getElementById('auth-local-reg-password');
    const username = (nameInp ? nameInp.value : '').trim();
    const password = (pwdInp ? pwdInp.value : '').trim();

    if (!username) {
        return showToast('请输入用户名');
    }
    if (username.length < 2 || username.length > 16) {
        return showToast('用户名长度需在 2 到 16 个字符之间');
    }
    if (username.startsWith('游客')) {
        return showToast('用户名不能以“游客”开头');
    }

    const accounts = getLocalAccounts();
    if (accounts.some(a => a.username === username)) {
        return showToast(`本地账号“${username}”已存在，请直接登录`);
    }

    let passwordHash = '';
    if (password) {
        passwordHash = await hashPassword(password);
    }

    const initRank = localRegSelectedRank || 1;
    const initRating = (initRank - 1) * 100 + 50;

    const newAcc = {
        username: username,
        passwordHash: passwordHash,
        hasPassword: !!password,
        initialRank: initRank,
        rank: initRank,
        rating: initRating,
        avatar: '',
        createdAt: Date.now(),
        lastLoginTime: Date.now()
    };

    // 初始化段位数据
    if (typeof LevelManager !== 'undefined') {
        LevelManager.saveUserRankData(username, {
            rank: initRank,
            rating: initRating,
            battles: { total: 0, wins: 0, losses: 0, draws: 0 }
        });
    }

    // 初始化基础空数据
    SafeStorage.setItem(`vocab_stats_${username}`, JSON.stringify({ total: 0, correct: 0, mistakes: {} }));
    SafeStorage.setItem(`vocab_ebbinghaus_db_${username}`, JSON.stringify({}));

    accounts.unshift(newAcc);
    saveLocalAccounts(accounts);

    if (nameInp) nameInp.value = '';
    if (pwdInp) pwdInp.value = '';

    showToast(`本地账号“${username}”创建成功！初始段位：${initRank}段`);
    loginLocalAccount(newAcc);
}
window.handleLocalRegister = handleLocalRegister;

function getSavedDeviceAccounts() {
    try {
        const raw = SafeStorage.getItem('vocab_device_accounts');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function recordDeviceAccount(username, avatar, type, hashedPassword) {
    if (!username || username.startsWith('游客')) return;
    if (avatar) {
        SafeStorage.setItem(`vocab_user_avatar_${username}`, avatar);
    }
    let list = getSavedDeviceAccounts();
    const existingIdx = list.findIndex(a => a.username === username);
    const compactAvatar = (avatar && avatar.length < 300) ? avatar : '';
    const item = {
        username,
        avatar: compactAvatar,
        type: type || 'cloud',
        lastLoginTime: Date.now(),
        hashedPassword: hashedPassword || ''
    };
    if (existingIdx >= 0) {
        if (!item.hashedPassword) item.hashedPassword = list[existingIdx].hashedPassword;
        if (!item.avatar && list[existingIdx].avatar) item.avatar = list[existingIdx].avatar;
        list[existingIdx] = item;
    } else {
        list.unshift(item);
    }
    if (list.length > 10) list = list.slice(0, 10);
    SafeStorage.setItem('vocab_device_accounts', JSON.stringify(list));
}

function removeSavedDeviceAccount(username) {
    let list = getSavedDeviceAccounts();
    list = list.filter(a => a.username !== username);
    SafeStorage.setItem('vocab_device_accounts', JSON.stringify(list));
    renderSavedDeviceAccounts();
}

function renderSavedDeviceAccounts() {
    const section = document.getElementById('auth-saved-accounts-section');
    const listEl = document.getElementById('auth-saved-accounts-list');
    const manualForm = document.getElementById('auth-manual-login-form');
    if (!section || !listEl) return;

    if (manualForm) manualForm.style.display = 'flex';

    const accounts = getSavedDeviceAccounts();
    if (accounts.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    listEl.innerHTML = accounts.map(acc => {
        const isExpired = !acc.lastLoginTime || (now - acc.lastLoginTime > SEVEN_DAYS_MS);
        let timeDesc = '近期登录';
        if (acc.lastLoginTime) {
            const diffDays = Math.floor((now - acc.lastLoginTime) / (24 * 60 * 60 * 1000));
            if (diffDays === 0) timeDesc = '上次登录：今天';
            else if (diffDays === 1) timeDesc = '上次登录：昨天';
            else timeDesc = `上次登录：${diffDays}天前`;
        }

        let avatarSrc = acc.avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(acc.username) : '');
        if (avatarSrc && avatarSrc.startsWith('//')) avatarSrc = 'https:' + avatarSrc;

        return `
            <div class="saved-account-card" onclick="selectSavedAccountToLogin('${escapeHtml(acc.username)}')" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:16px; background:var(--md-sys-color-surface-container, #f1f5f9); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); cursor:pointer; transition:all 0.2s ease;">
                <div style="display:flex; align-items:center; gap:14px; min-width:0; flex:1;">
                    <div style="position:relative; width:44px; height:44px; border-radius:50%; overflow:hidden; background:var(--md-sys-color-surface-container-high, #e2e8f0); flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:24px; color:var(--md-sys-color-primary);">person</span>
                        ${avatarSrc ? `<img src="${escapeHtml(avatarSrc)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';" style="position:absolute; width:100%; height:100%; object-fit:cover;">` : ''}
                    </div>
                    <div style="min-width:0; flex:1;">
                        <div style="font-weight:700; font-size:1.02rem; color:var(--md-sys-color-on-surface); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${escapeHtml(acc.username)}
                        </div>
                        <div style="font-size:0.8rem; margin-top:3px;">
                            ${isExpired 
                                ? `<span style="color:#d97706; font-weight:600; display:inline-flex; align-items:center; gap:2px;"><span class="material-symbols-rounded" style="font-size:14px;">lock_clock</span>超过 7 天未登录，需验证密码</span>` 
                                : `<span style="color:var(--md-sys-color-outline, #64748b);">${timeDesc}</span>`}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    ${isExpired ? `
                        <button type="button" class="btn btn-outlined btn-sm" style="border-radius:9999px; height:34px; padding:0 14px; font-size:0.82rem; font-weight:700;" onclick="event.stopPropagation(); showManualLoginForm('${escapeHtml(acc.username)}')">输入密码</button>
                    ` : `
                        <button type="button" class="btn btn-filled btn-sm" style="border-radius:9999px; height:34px; padding:0 18px; font-size:0.85rem; font-weight:700;" onclick="event.stopPropagation(); selectSavedAccountToLogin('${escapeHtml(acc.username)}')">登录</button>
                    `}
                    <button type="button" class="md3-icon-btn" onclick="event.stopPropagation(); removeSavedDeviceAccount('${escapeHtml(acc.username)}')" title="删除登录记录" style="width:34px; height:34px; border-radius:50%; background:#e2e8f0; border:none; display:flex; align-items:center; justify-content:center; padding:0;">
                        <span class="material-symbols-rounded" style="font-size:18px; color:#475569;">close</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showManualLoginForm(prefUsername = '') {
    const manualForm = document.getElementById('auth-manual-login-form');
    if (manualForm) manualForm.style.display = 'flex';
    const usernameInput = document.getElementById('auth-login-username');
    const passwordInput = document.getElementById('auth-login-password');
    if (usernameInput && prefUsername) {
        usernameInput.value = prefUsername;
    }
    if (passwordInput) {
        passwordInput.value = '';
        setTimeout(() => passwordInput.focus(), 100);
    }
}

async function prepareUserSwitch(newUser) {
    if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
        MailManager.resetForUser(newUser);
    }
    const prevUser = currentUser;
    if (prevUser && prevUser !== newUser) {
        if (typeof cleanAccountSwitchPresence === 'function') {
            await cleanAccountSwitchPresence(prevUser, newUser);
        } else if (typeof recordSwitchedAccount === 'function') {
            recordSwitchedAccount(prevUser);
        }
        const localGuest = SafeStorage.getItem('vocab_guest_name');
        if (localGuest && localGuest !== newUser) {
            if (typeof cleanAccountSwitchPresence === 'function') {
                await cleanAccountSwitchPresence(localGuest, newUser);
            } else if (typeof recordSwitchedAccount === 'function') {
                recordSwitchedAccount(localGuest);
            }
        }
    }
}

function withAuthTimeout(promise, ms = 5000, timeoutMsg = '登录请求超时（5秒），网络较慢或服务器暂未响应，请稍后重试') {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), ms))
    ]);
}

async function selectSavedAccountToLogin(username) {
    const list = getSavedDeviceAccounts();
    const acc = list.find(a => a.username === username);
    if (!acc) return;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const isExpired = !acc.lastLoginTime || (Date.now() - acc.lastLoginTime > SEVEN_DAYS_MS);

    if (isExpired || !acc.hashedPassword) {
        showToast(`账号“${username}”已超过 7 天未登录，请重新输入密码`);
        showManualLoginForm(username);
        return;
    }

    try {
        const user = await withAuthTimeout(supabaseLoginWithHash(acc.username, acc.hashedPassword), 5000, '登录请求超时（5秒），请检查网络后重试');
        await prepareUserSwitch(user.username);
        SafeStorage.removeItem('vocab_user_logged_out');
        acc.lastLoginTime = Date.now();
        SafeStorage.setItem('vocab_device_accounts', JSON.stringify(list));

        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: user.username,
            avatar: user.avatar_url || ''
        };
        if (typeof restoreUserDataFromCloud === 'function') {
            restoreUserDataFromCloud(user);
        } else if (user.user_data && user.user_data.stats) {
            try {
                SafeStorage.setItem(`vocab_stats_${user.username}`, JSON.stringify(user.user_data.stats));
            } catch (e) { }
        }
        loadUserData(user.username, profile);
        if (typeof initGlobalPresence === 'function') {
            try { initGlobalPresence(); } catch (e) { console.warn('[Auth] Presence init warning:', e); }
        }
        showToast(`欢迎回来 ${user.username}！`);
        switchView('view-hub');
    } catch (e) {
        if (e.message && e.message.includes('封禁')) {
            showToast(e.message);
            return;
        }
        // 如果登录异常，异步校验该账号是否已在云端被彻底删除
        if (typeof supabaseVerifyAccountStatus === 'function') {
            supabaseVerifyAccountStatus(username).then(st => {
                if (!st.exists && !st.networkError) {
                    removeSavedDeviceAccount(username);
                    renderSavedDeviceAccounts();
                    showToast(`账号“${username}”在云端已被删除，已从本地列表移除`);
                }
            }).catch(() => { });
        }
        showToast(e.message || '登录已过期，请重新输入密码');
        showManualLoginForm(username);
    }
}

function switchAuthTab(tab) {
    authActiveTab = tab;
    const tabLoginBtn = document.getElementById('tab-auth-login');
    const tabRegBtn = document.getElementById('tab-auth-register');
    const loginSection = document.getElementById('auth-login-section');
    const regSection = document.getElementById('auth-register-section');

    if (tabLoginBtn && tabRegBtn) {
        if (tab === 'login') {
            tabLoginBtn.classList.add('active');
            tabRegBtn.classList.remove('active');
            if (loginSection) loginSection.style.display = 'flex';
            if (regSection) regSection.style.display = 'none';
            renderSavedDeviceAccounts();
        } else {
            tabRegBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            if (loginSection) loginSection.style.display = 'none';
            if (regSection) regSection.style.display = 'flex';
        }
    }
}

function triggerRegAvatarUpload() {
    const input = document.getElementById('auth-reg-avatar-file');
    if (input) input.click();
}

function handleRegAvatarChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    openAvatarCropper(file, (dataUrl) => {
        if (!dataUrl) return;
        regAvatarDataUrl = dataUrl;
        const imgEl = document.getElementById('auth-reg-avatar-preview');
        const iconEl = document.getElementById('auth-reg-avatar-icon');
        if (imgEl && iconEl) {
            imgEl.src = regAvatarDataUrl;
            imgEl.style.display = 'block';
            iconEl.style.display = 'none';
        }
    });
    event.target.value = '';
}

async function handleCloudLogin() {
    const usernameInput = document.getElementById('auth-login-username');
    const passwordInput = document.getElementById('auth-login-password');
    const loginBtn = document.getElementById('btn-auth-cloud-login');

    const username = (usernameInput ? usernameInput.value : '').trim();
    const password = (passwordInput ? passwordInput.value : '').trim();

    if (!username) {
        showToast('请输入用户名');
        return;
    }
    if (!password) {
        showToast('请输入密码');
        return;
    }

    const origLoginBtnHtml = loginBtn ? loginBtn.innerHTML : '';
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="material-symbols-rounded rotating" style="font-size:18px;">sync</span><span class="btn-label-text">登录中...</span>';
    }

    try {
        const hashedPassword = await hashPassword(password);
        const user = await withAuthTimeout(supabaseLoginUser({ username, password }), 5000, '登录请求超时（5秒），网络较慢或服务器暂未响应，请稍后重试');
        await prepareUserSwitch(user.username);
        SafeStorage.removeItem('vocab_user_logged_out');
        recordDeviceAccount(user.username, user.avatar_url || '', 'cloud', hashedPassword);

        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: user.username,
            avatar: user.avatar_url || ''
        };

        // 如果用户有云端存储的数据，则全量恢复（学习进度、等级、艾宾浩斯记忆库）
        if (typeof restoreUserDataFromCloud === 'function') {
            restoreUserDataFromCloud(user);
        } else if (user.user_data && user.user_data.stats) {
            try {
                SafeStorage.setItem(`vocab_stats_${user.username}`, JSON.stringify(user.user_data.stats));
            } catch (e) { }
        }

        loadUserData(user.username, profile);
        if (typeof initGlobalPresence === 'function') {
            try { initGlobalPresence(); } catch (e) { console.warn('[Auth] Presence init warning:', e); }
        }
        showToast(`欢迎回来 ${user.username}！`);

        if (passwordInput) passwordInput.value = '';
        switchView('view-hub');
    } catch (err) {
        showToast(err.message || '登录失败，请检查网络或用户名密码');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = origLoginBtnHtml || '<span class="material-symbols-rounded" style="font-size:18px;">login</span><span class="btn-label-text">登录</span>';
        }
    }
}

async function handleCloudRegister() {
    const usernameInput = document.getElementById('auth-reg-username');
    const passwordInput = document.getElementById('auth-reg-password');
    const password2Input = document.getElementById('auth-reg-password2');
    const regBtn = document.getElementById('btn-auth-cloud-register');

    const username = (usernameInput ? usernameInput.value : '').trim();
    const password = (passwordInput ? passwordInput.value : '').trim();
    const password2 = (password2Input ? password2Input.value : '').trim();

    if (!username) {
        showToast('请输入用户名');
        return;
    }
    if (username.length < 2 || username.length > 16) {
        showToast('用户名长度需在 2 到 16 个字符之间');
        return;
    }
    if (!password) {
        showToast('请输入密码');
        return;
    }
    if (password.length < 4) {
        showToast('密码长度至少为 4 位');
        return;
    }
    if (password !== password2) {
        showToast('两次输入的密码不一致');
        return;
    }

    const origRegBtnHtml = regBtn ? regBtn.innerHTML : '';
    if (regBtn) {
        regBtn.disabled = true;
        regBtn.innerHTML = '<span class="material-symbols-rounded rotating" style="font-size:18px;">sync</span><span class="btn-label-text">注册中...</span>';
    }

    try {
        const newUser = await withAuthTimeout(supabaseRegisterUser({
            username: username,
            password: password,
            avatar: regAvatarDataUrl
        }), 5000, '注册请求超时（5秒），请检查网络后重试');
        await prepareUserSwitch(newUser.username);
        SafeStorage.removeItem('vocab_user_logged_out');

        const hashedPassword = await hashPassword(password);
        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: newUser.username,
            avatar: newUser.avatar_url || ''
        };
        recordDeviceAccount(newUser.username, newUser.avatar_url || '', 'cloud', hashedPassword);

        loadUserData(newUser.username, profile);
        if (typeof initGlobalPresence === 'function') {
            try { initGlobalPresence(); } catch (e) { console.warn('[Auth] Presence init warning:', e); }
        }
        showToast(`注册成功！已为您送上一封礼包邮件～`);

        if (passwordInput) passwordInput.value = '';
        if (password2Input) password2Input.value = '';
        regAvatarDataUrl = '';
        switchView('view-hub');
    } catch (err) {
        showToast(err.message || '注册失败');
    } finally {
        if (regBtn) {
            regBtn.disabled = false;
            regBtn.innerHTML = origRegBtnHtml || '<span class="material-symbols-rounded" style="font-size:18px;">person_add</span><span class="btn-label-text">注册并登录</span>';
        }
    }
}

async function handleBiliToyLogin() {
    if (!isBilibiliToy) {
        showToast('非 B 站 Toy 平台环境，已禁用 B 站授权登录');
        return;
    }
    const btn = document.getElementById('btn-bili-toy-login');
    const origBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-rounded rotating" style="font-size:18px;">sync</span><span class="btn-label-text">正在授权...</span>';
    }

    try {
        const biliProfile = await withAuthTimeout(biliLogin(), 5000, 'B 站授权登录超时，请重试');
        await prepareUserSwitch(biliProfile.username);

        const profile = {
            isLoggedIn: true,
            type: 'bilibili',
            username: biliProfile.username,
            avatar: biliProfile.avatar || '',
            openId: biliProfile.toyOpenId || ''
        };
        recordDeviceAccount(biliProfile.username, biliProfile.avatar || '', 'bilibili', '');

        // 从 Supabase 恢复/同步 B 站用户学习记录、词书掌握度与段位（不使用 Toy 云储存）
        if (typeof supabaseSyncBiliUser === 'function') {
            const cloudUser = await supabaseSyncBiliUser(biliProfile);
            if (cloudUser && typeof restoreUserDataFromCloud === 'function') {
                restoreUserDataFromCloud(cloudUser);
            }
        }

        loadUserData(biliProfile.username, profile);
        if (typeof initGlobalPresence === 'function') {
            try { initGlobalPresence(); } catch (e) { console.warn('[Auth] Presence init warning:', e); }
        }
        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud(biliProfile.username);
        }
        showToast(`登录成功：${biliProfile.username}`);
        switchView('view-hub');
    } catch (err) {
        showToast(err.message || 'B 站授权登录失败');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origBtnHtml || '<span class="material-symbols-rounded" style="font-size:18px;">bolt</span><span class="btn-label-text">B 站快捷授权登录</span>';
        }
    }
}

function continueAsGuest() {
    const guestName = getUniqueGuestName();
    if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
        MailManager.resetForUser('');
    }
    currentUserProfile = {
        isLoggedIn: false,
        type: 'guest',
        username: guestName,
        avatar: '',
        openId: ''
    };
    loadUserData(guestName, currentUserProfile);
    switchView('view-hub');
}

function handleAuthBack() {
    if (currentUserProfile && currentUserProfile.isLoggedIn && currentUserProfile.username && !currentUserProfile.username.startsWith('游客')) {
        const target = (window.previousView && window.previousView !== 'view-auth') ? window.previousView : 'view-hub';
        switchView(target);
    } else {
        continueAsGuest();
    }
}
window.handleAuthBack = handleAuthBack;

function handleAuthLogout(notify = true) {
    if (typeof MailManager !== 'undefined' && typeof MailManager.resetForUser === 'function') {
        MailManager.resetForUser('');
    }
    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        currentUser = null;
        currentUserProfile = null;
        SafeStorage.setItem('vocab_user_logged_out', 'true');
        SafeStorage.removeItem('vocab_local_current_user');
        SafeStorage.removeItem('vocab_auth_session');
        if (notify) {
            showToast('已退出登录');
        }
        switchView('view-auth');
        renderAuthView();
        return;
    }

    const prevUser = currentUser;
    const guestName = getUniqueGuestName();
    if (typeof cleanAccountSwitchPresence === 'function' && prevUser) {
        cleanAccountSwitchPresence(prevUser, guestName);
    } else if (typeof recordSwitchedAccount === 'function') {
        recordSwitchedAccount(prevUser);
    }
    currentUserProfile = {
        isLoggedIn: false,
        type: 'guest',
        username: guestName,
        avatar: '',
        openId: ''
    };
    SafeStorage.setItem('vocab_user_logged_out', 'true');
    SafeStorage.removeItem('vocab_auth_session');
    SafeStorage.setItem('vocab_pk_user', guestName);
    SafeStorage.setItem('vocab_guest_name', guestName);
    loadUserData(guestName, currentUserProfile);
    if (notify) {
        showToast('已退出登录');
    }
    updateHub();
    if (typeof renderMeView === 'function') {
        renderMeView();
    }
}

function handleSwitchAccount() {
    // 切换账号时不提前登出，保留原登录态，待用户登录新账号成功后再切换
    switchView('view-auth');
    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        switchLocalAuthTab('login');
    } else {
        switchAuthTab('login');
    }
}
window.handleSwitchAccount = handleSwitchAccount;