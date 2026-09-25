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
        if (webContainer) webContainer.style.display = 'none';
    } else {
        if (toyContainer) toyContainer.style.display = 'none';
        if (webContainer) webContainer.style.display = 'block';
        switchAuthTab(authActiveTab);
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
            if (loginSection) loginSection.style.display = 'block';
            if (regSection) regSection.style.display = 'none';
        } else {
            tabRegBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            if (loginSection) loginSection.style.display = 'none';
            if (regSection) regSection.style.display = 'block';
        }
    }
}

function triggerRegAvatarUpload() {
    const input = document.getElementById('auth-reg-avatar-file');
    if (input) input.click();
}

async function handleRegAvatarChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
        regAvatarDataUrl = await compressImageFile(file, 140, 140, 0.82);
        const imgEl = document.getElementById('auth-reg-avatar-preview');
        const iconEl = document.getElementById('auth-reg-avatar-icon');
        if (imgEl && iconEl) {
            imgEl.src = regAvatarDataUrl;
            imgEl.style.display = 'block';
            iconEl.style.display = 'none';
        }
    } catch (e) {
        showToast(e.message || '头像处理失败');
    }
}

async function handleCloudLogin() {
    if (isBilibiliToy) {
        showToast('Toy 平台中请使用 B 站授权登录');
        return;
    }
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
        const user = await supabaseLoginUser({ username, password });
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
    if (isBilibiliToy) {
        showToast('Toy 平台暂不支持注册 Supabase 云端账号');
        return;
    }
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

        const profile = {
            isLoggedIn: true,
            type: 'cloud',
            username: newUser.username,
            avatar: newUser.avatar_url || ''
        };

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
    currentUserProfile = {
        isLoggedIn: false,
        type: 'guest',
        username: '游客',
        avatar: '',
        openId: ''
    };
    loadUserData('游客', currentUserProfile);
    switchView('view-hub');
}

function handleAuthLogout() {
    currentUserProfile = {
        isLoggedIn: false,
        type: 'guest',
        username: '游客',
        avatar: '',
        openId: ''
    };
    SafeStorage.removeItem('vocab_auth_session');
    SafeStorage.setItem('vocab_pk_user', '游客');
    loadUserData('游客', currentUserProfile);
    showToast('已退出登录');
    updateHub();
    if (typeof renderMeView === 'function') {
        renderMeView();
    }
}