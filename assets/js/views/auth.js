/**
 * 账号中心与认证系统 (Supabase 云端账号 & B 站 Toy 授权登录)
 * Module: assets/js/views/auth.js
 */

let authActiveTab = 'login'; // 'login' | 'register'
let regAvatarDataUrl = '';

function renderAuthView() {
    const toyContainer = document.getElementById('auth-toy-container');
    const webContainer = document.getElementById('auth-web-container');

    if (isBilibiliToy) {
        if (toyContainer) toyContainer.style.display = 'block';
        if (webContainer) webContainer.style.display = 'block';
    } else {
        if (toyContainer) toyContainer.style.display = 'none';
        if (webContainer) webContainer.style.display = 'block';
    }
    switchAuthTab(authActiveTab);
}

function getSavedDeviceAccounts() {
    try {
        const raw = localStorage.getItem('vocab_device_accounts');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function recordDeviceAccount(username, avatar, type, hashedPassword) {
    if (!username || username.startsWith('游客')) return;
    let list = getSavedDeviceAccounts();
    const existingIdx = list.findIndex(a => a.username === username);
    const item = {
        username,
        avatar: avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(username) : ''),
        type: type || 'cloud',
        lastLoginTime: Date.now(),
        hashedPassword: hashedPassword || ''
    };
    if (existingIdx >= 0) {
        if (!item.hashedPassword) item.hashedPassword = list[existingIdx].hashedPassword;
        list[existingIdx] = item;
    } else {
        list.unshift(item);
    }
    localStorage.setItem('vocab_device_accounts', JSON.stringify(list));
}

function removeSavedDeviceAccount(username) {
    let list = getSavedDeviceAccounts();
    list = list.filter(a => a.username !== username);
    localStorage.setItem('vocab_device_accounts', JSON.stringify(list));
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
            if (diffDays === 0) timeDesc = '今天登录过';
            else if (diffDays === 1) timeDesc = '昨天登录过';
            else timeDesc = `${diffDays} 天前登录`;
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
                                : `<span style="color:var(--md-sys-color-outline, #64748b);">${timeDesc} · 点击直接登录</span>`}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    ${isExpired ? `
                        <button type="button" class="btn btn-outlined btn-sm" style="border-radius:9999px; height:34px; padding:0 14px; font-size:0.82rem; font-weight:700;" onclick="event.stopPropagation(); showManualLoginForm('${escapeHtml(acc.username)}')">输入密码</button>
                    ` : `
                        <button type="button" class="btn btn-filled btn-sm" style="border-radius:9999px; height:34px; padding:0 18px; font-size:0.85rem; font-weight:700;" onclick="event.stopPropagation(); selectSavedAccountToLogin('${escapeHtml(acc.username)}')">登录</button>
                    `}
                    <button type="button" class="md3-icon-btn" onclick="event.stopPropagation(); removeSavedDeviceAccount('${escapeHtml(acc.username)}')" title="从本机移除此账号" style="width:34px; height:34px; border-radius:50%; background:#e2e8f0; border:none; display:flex; align-items:center; justify-content:center; padding:0;">
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

    showToast(`正在快捷登录账号“${username}”...`);
    try {
        const user = await supabaseLoginWithHash(acc.username, acc.hashedPassword);
        acc.lastLoginTime = Date.now();
        localStorage.setItem('vocab_device_accounts', JSON.stringify(list));

        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: user.username,
            avatar: user.avatar_url || ''
        };
        if (user.user_data && user.user_data.stats) {
            try {
                SafeStorage.setItem(`vocab_stats_${user.username}`, JSON.stringify(user.user_data.stats));
            } catch (e) { }
        }
        loadUserData(user.username, profile);
        showToast(`快捷登录成功，欢迎回来 ${user.username}！`);
        switchView('view-hub');
    } catch (e) {
        showToast(e.message || '快捷登录凭证失效，请重新输入密码');
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

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerText = '登录中...';
    }

    try {
        const hashedPassword = await hashPassword(password);
        const user = await supabaseLoginUser({ username, password });
        recordDeviceAccount(user.username, user.avatar_url || '', 'cloud', hashedPassword);

        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: user.username,
            avatar: user.avatar_url || ''
        };

        // 如果用户有云端存储的数据，则合并恢复
        if (user.user_data && user.user_data.stats) {
            try {
                SafeStorage.setItem(`vocab_stats_${user.username}`, JSON.stringify(user.user_data.stats));
            } catch (e) { }
        }

        loadUserData(user.username, profile);
        showToast(`登录成功，欢迎回来 ${user.username}！`);

        if (passwordInput) passwordInput.value = '';
        switchView('view-hub');
    } catch (err) {
        alert(err.message || '登录失败，请检查网络或用户名密码');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerText = '登录';
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

    if (regBtn) {
        regBtn.disabled = true;
        regBtn.innerText = '注册中...';
    }

    try {
        const newUser = await supabaseRegisterUser({
            username: username,
            password: password,
            avatar: regAvatarDataUrl
        });

        const hashedPassword = await hashPassword(password);
        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: newUser.username,
            avatar: newUser.avatar_url || ''
        };
        recordDeviceAccount(newUser.username, newUser.avatar_url || '', 'cloud', hashedPassword);

        loadUserData(newUser.username, profile);
        showToast(`注册成功！已为您登录云端账号`);

        if (passwordInput) passwordInput.value = '';
        if (password2Input) password2Input.value = '';
        regAvatarDataUrl = '';
        switchView('view-hub');
    } catch (err) {
        alert(err.message || '注册失败');
    } finally {
        if (regBtn) {
            regBtn.disabled = false;
            regBtn.innerText = '注册并登录';
        }
    }
}

async function handleBiliToyLogin() {
    if (!isBilibiliToy) {
        showToast('非 B 站 Toy 平台环境，已禁用 B 站授权登录');
        return;
    }
    const btn = document.getElementById('btn-bili-toy-login');
    if (btn) {
        btn.disabled = true;
        btn.innerText = '正在授权...';
    }

    try {
        const biliProfile = await biliLogin();
        const profile = {
            isLoggedIn: true,
            type: 'bilibili',
            username: biliProfile.username,
            avatar: biliProfile.avatar || '',
            openId: biliProfile.toyOpenId || ''
        };
        recordDeviceAccount(biliProfile.username, biliProfile.avatar || '', 'bilibili', '');

        // 从 B 站云存储尝试拉取数据
        const cloudData = await biliLoadCloudData();
        if (cloudData && cloudData.stats) {
            try {
                SafeStorage.setItem(`vocab_stats_${biliProfile.username}`, JSON.stringify(cloudData.stats));
            } catch (e) { }
        }

        loadUserData(biliProfile.username, profile);
        showToast(`登录成功：${biliProfile.username}`);
        switchView('view-hub');
    } catch (err) {
        alert(err.message || 'B 站授权登录失败');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'B 站快捷授权登录';
        }
    }
}

function continueAsGuest() {
    const guestName = getUniqueGuestName();
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

function handleAuthLogout(notify = true) {
    const prevUser = currentUser;
    const guestName = getUniqueGuestName();
    currentUserProfile = {
        isLoggedIn: false,
        type: 'guest',
        username: guestName,
        avatar: '',
        openId: ''
    };
    SafeStorage.removeItem('vocab_auth_session');
    SafeStorage.setItem('vocab_pk_user', guestName);
    loadUserData(guestName, currentUserProfile);
    if (typeof recordSwitchedAccount === 'function') {
        recordSwitchedAccount(prevUser);
    }
    if (notify) {
        showToast('已退出登录');
    }
    updateHub();
    if (typeof renderMeView === 'function') {
        renderMeView();
    }
}

function handleSwitchAccount() {
    handleAuthLogout(false);
    switchView('view-auth');
    switchAuthTab('login');
}
window.handleSwitchAccount = handleSwitchAccount;