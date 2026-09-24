/**
 * 用户中心与账号切换视图
 * Module: assets/js/views/auth.js
 */

function renderAuthUsersList() {
    const listEl = document.getElementById('auth-users-list');
    if (!listEl) return;
    if (allUsersList.length === 0) {
        listEl.innerHTML = `<p style="font-size:0.85rem; color:var(--md-sys-color-outline); padding:10px 0;">暂无本地账号</p>`;
        return;
    }
    listEl.innerHTML = allUsersList.map(u => `
            <div class="account-item-card" onclick="selectUserAndEnter('${u}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="account-avatar">${u.charAt(0).toUpperCase()}</div>
                    <span style="font-weight:600; font-size:0.98rem; color:var(--md-sys-color-on-surface);">${u}</span>
                </div>
                <button class="account-del-btn" title="删除账号数据" onclick="event.stopPropagation(); deleteAccount('${u}')">
                    <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                </button>
            </div>
        `).join('');
}

function selectUserAndEnter(username) {
    loadUserData(username);
    switchView('view-hub');
}

function createUserAndEnter() {
    const nameInput = document.getElementById('username-input');
    const name = nameInput.value.trim();
    if (!name) {
        showToast('请输入昵称');
        return;
    }
    if (allUsersList.includes(name)) {
        showToast(`该昵称 “${name}” 已存在，请直接在列表中选择`);
        return;
    }
    nameInput.value = '';
    loadUserData(name);
    switchView('view-hub');
}

function handleLogout() {
    currentUser = '';
    localStorage.removeItem('vocab_pk_user');
    switchView('view-auth');
}

function deleteAccount(username) {
    if (!confirm(`确定要删除账号“${username}”吗？此操作无法撤销。`)) return;
    allUsersList = allUsersList.filter(u => u !== username);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    localStorage.removeItem(`vocab_stats_${username}`);
    localStorage.removeItem(`vocab_ebbinghaus_db_${username}`);
    localStorage.removeItem(`single_progress_${username}`);
    localStorage.removeItem(`riddle_progress_${username}`);
    if (currentUser === username) {
        currentUser = '';
        localStorage.removeItem('vocab_pk_user');
    }
    renderAuthUsersList();
}
