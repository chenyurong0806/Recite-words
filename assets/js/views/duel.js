/**
 * 联机大厅与实时对战引擎 (Supabase Realtime)
 * Module: assets/js/views/duel.js
 */

/* ==========================================================================
   6. 联机大厅与房间设置 (专属房间、房间预设、实时对战与高并发保护)
   ========================================================================== */
let userExclusiveRoomPreset = null;
let activeEditingPreset = null;
let activeInviteRules = null;
let activeInviteTarget = null;
let pendingSentInvite = null;
let cachedDbRooms = [];
let cachedDbRoomsTime = 0;
let fetchRoomsDebounceTimer = null;

function isCurrentUserLoggedIn() {
    if (typeof currentUserProfile === 'undefined' || !currentUserProfile) return false;
    if (!currentUserProfile.isLoggedIn) return false;
    if (currentUserProfile.type === 'guest') return false;
    if (!currentUser || currentUser === '游客' || currentUser.startsWith('游客_')) return false;
    return true;
}

function getUserRoomCode(username) {
    if (!username) return 'EXCL01';
    let hash = 5381;
    for (let i = 0; i < username.length; i++) {
        hash = ((hash << 5) + hash) + username.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

function getDefaultRoomPreset(user) {
    const name = user ? `${user}的房间` : '对战房间';
    const books = (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds) && singleSelectedBookIds.length > 0)
        ? [...singleSelectedBookIds]
        : ['GaoKao3500'];
    return {
        name: name,
        capacity: 2,
        duration: 60,
        winLead: 6,
        gaugeStyle: 'tug',
        selectedBooks: books
    };
}

function getUserExclusivePreset() {
    if (userExclusiveRoomPreset) return userExclusiveRoomPreset;
    try {
        const saved = localStorage.getItem('vocab_room_preset_' + currentUser);
        if (saved) {
            userExclusiveRoomPreset = JSON.parse(saved);
            return userExclusiveRoomPreset;
        }
    } catch (e) { }
    if (currentUserProfile && currentUserProfile.user_data && currentUserProfile.user_data.room_preset) {
        userExclusiveRoomPreset = currentUserProfile.user_data.room_preset;
        return userExclusiveRoomPreset;
    }
    userExclusiveRoomPreset = getDefaultRoomPreset(currentUser);
    return userExclusiveRoomPreset;
}

function openRoomPresetModal() {
    if (!isCurrentUserLoggedIn()) {
        showToast('只有已登录账号拥有专属房间');
        return;
    }
    activeEditingPreset = JSON.parse(JSON.stringify(getUserExclusivePreset()));
    
    const nameInput = document.getElementById('preset-room-name-input');
    if (nameInput) nameInput.value = activeEditingPreset.name || `${currentUser}的房间`;

    renderPresetChips();
    updatePresetBookSummaryUI();

    const modal = document.getElementById('modal-room-preset');
    if (modal) modal.classList.add('active');
}

function closeRoomPresetModal() {
    const modal = document.getElementById('modal-room-preset');
    if (modal) modal.classList.remove('active');
}

function renderPresetChips() {
    if (!activeEditingPreset) return;
    document.querySelectorAll('#preset-chips-time .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-time'));
        el.classList.toggle('selected', val === (activeEditingPreset.duration || 60));
    });

    document.querySelectorAll('#preset-chips-lead .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-lead'));
        el.classList.toggle('selected', val === (activeEditingPreset.winLead || 6));
    });

    document.querySelectorAll('#preset-chips-gauge .md3-chip').forEach(el => {
        const val = el.getAttribute('data-gauge');
        el.classList.toggle('selected', val === (activeEditingPreset.gaugeStyle || 'tug'));
    });
}

function selectPresetTime(val) {
    if (!activeEditingPreset) return;
    activeEditingPreset.duration = parseInt(val);
    renderPresetChips();
}

function selectPresetLead(val) {
    if (!activeEditingPreset) return;
    activeEditingPreset.winLead = parseInt(val);
    renderPresetChips();
}

function selectPresetGauge(val) {
    if (!activeEditingPreset) return;
    activeEditingPreset.gaugeStyle = val;
    renderPresetChips();
}

function updatePresetBookSummaryUI() {
    if (!activeEditingPreset) return;
    const books = activeEditingPreset.selectedBooks || [];
    const titleEl = document.getElementById('preset-selected-book-title');
    const summaryEl = document.getElementById('preset-selected-book-summary');
    if (titleEl) titleEl.innerText = getBookNamesSummary(books);
    if (summaryEl) summaryEl.innerText = `已选 ${books.length} 本词书`;
}

async function saveRoomPreset() {
    if (!activeEditingPreset) return;
    const nameInput = document.getElementById('preset-room-name-input');
    const nameVal = (nameInput ? nameInput.value : '').trim();
    activeEditingPreset.name = nameVal || `${currentUser}的房间`;
    activeEditingPreset.capacity = 2;

    userExclusiveRoomPreset = JSON.parse(JSON.stringify(activeEditingPreset));
    try {
        localStorage.setItem('vocab_room_preset_' + currentUser, JSON.stringify(userExclusiveRoomPreset));
    } catch (e) { }

    if (currentUserProfile && currentUserProfile.isLoggedIn) {
        if (currentUserProfile.type === 'cloud' && typeof supabaseSyncUserData === 'function') {
            const currentData = (currentUserProfile.user_data || {});
            currentData.room_preset = userExclusiveRoomPreset;
            currentUserProfile.user_data = currentData;
            supabaseSyncUserData(currentUser, currentData);
        } else if (currentUserProfile.type === 'bilibili' && typeof biliSaveCloudData === 'function') {
            biliSaveCloudData({ room_preset: userExclusiveRoomPreset });
        }
    }

    const myCode = getUserRoomCode(currentUser);
    try {
        await sbClient.from('rooms').upsert({
            code: myCode,
            name: userExclusiveRoomPreset.name,
            host: currentUser,
            capacity: 2,
            player_count: (isHost && roomCode === myCode) ? 1 : 0,
            status: (isHost && roomCode === myCode) ? 'waiting' : 'closed',
            is_temporary: false,
            config: userExclusiveRoomPreset,
            updated_at: new Date().toISOString()
        }, { onConflict: 'code' });
    } catch (e) { }

    closeRoomPresetModal();
    showToast('专属房间预设已保存至云端');
    fetchOnlineRoomsList();
}

async function enterMyExclusiveRoom() {
    if (!isCurrentUserLoggedIn()) {
        showToast('请先登录云端账号');
        return;
    }
    const myPreset = getUserExclusivePreset();
    roomCode = getUserRoomCode(currentUser);
    isHost = true;
    hostName = currentUser;
    guestName = '';
    customRoomName = myPreset.name || `${currentUser}的房间`;
    roomConfig = { ...myPreset };

    setupRoomLobbyUI(roomCode, customRoomName);
    connectSupabaseChannel(roomCode);

    try {
        await sbClient.from('rooms').upsert({
            code: roomCode,
            name: customRoomName,
            host: currentUser,
            capacity: 2,
            player_count: 1,
            status: 'waiting',
            is_temporary: false,
            config: roomConfig,
            updated_at: new Date().toISOString()
        }, { onConflict: 'code' });
    } catch (e) { }

    if (globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'room_state_change',
            payload: {
                action: 'ready',
                room: {
                    code: roomCode,
                    name: customRoomName,
                    host: currentUser,
                    capacity: 2,
                    playerCount: 1,
                    status: 'waiting'
                }
            }
        });
    }

    switchView('view-online');
    showToast(`已进入专属房间：${customRoomName}`);
}

function handleP2AvatarClick() {
    if (!isHost) return;
    if (guestName) {
        if (confirm(`确定要将玩家【${guestName}】移出房间吗？`)) {
            kickPlayerFromRoom(guestName);
        }
    } else {
        openRoomInvitePlayersModal();
    }
}

function openRoomInvitePlayersModal() {
    const modal = document.getElementById('modal-room-invite-players');
    if (!modal) return;
    modal.classList.add('active');
    renderRoomInvitePlayersList();
}

function closeRoomInvitePlayersModal() {
    const modal = document.getElementById('modal-room-invite-players');
    if (modal) modal.classList.remove('active');
}

function renderRoomInvitePlayersList() {
    const container = document.getElementById('room-invite-players-list');
    if (!container) return;
    if (!globalLobbyChannel) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--md-sys-color-outline);">未连接到大厅</div>`;
        return;
    }
    const state = globalLobbyChannel.presenceState();
    const onlineUsers = [];
    Object.keys(state).forEach(k => {
        const presList = state[k] || [];
        const pres = presList[0] || {};
        const pUsername = pres.username || k;
        if (k === currentUser || pUsername === currentUser) return;
        if (pres.sessionId && pres.sessionId === CLIENT_SESSION_ID) return;
        if (recentlySwitchedAccounts.has(k) || recentlySwitchedAccounts.has(pUsername)) return;
        let avatar = pres.avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(pUsername) : '');
        if (avatar && avatar.startsWith('//')) avatar = 'https:' + avatar;
        onlineUsers.push({
            username: pUsername,
            avatar: avatar,
            status: pres.status || 'idle'
        });
    });

    if (onlineUsers.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px 10px; color:var(--md-sys-color-outline); font-size:0.88rem;">当前暂无其他在线玩家</div>`;
        return;
    }

    container.innerHTML = onlineUsers.map(u => `
        <div class="online-player-card">
            <div class="online-player-left">
                <div class="online-player-avatar" style="position:relative; width:36px; height:36px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--md-sys-color-surface-container);">
                    <span class="material-symbols-rounded" style="font-size:22px; color:var(--md-sys-color-primary);">person</span>
                    ${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';" style="position:absolute; width:100%; height:100%; object-fit:cover; border-radius:50%;">` : ''}
                </div>
                <div class="online-player-meta">
                    <span class="online-player-name" title="${escapeHtml(u.username)}">${escapeHtml(u.username)}</span>
                    <span class="online-player-status">
                        <span class="online-status-dot"></span>
                        在线空闲
                    </span>
                </div>
            </div>
            <button type="button" class="btn btn-filled btn-sm online-player-action-btn" onclick="invitePlayerFromRoom('${escapeHtml(u.username)}')">
                <span class="material-symbols-rounded" style="font-size:16px;">send</span>
                <span class="btn-label-text">邀请</span>
            </button>
        </div>
    `).join('');
}

function invitePlayerFromRoom(targetUser) {
    if (!targetUser || !globalLobbyChannel || !roomCode) return;
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const bookMap = {};
    allBooks.forEach(b => bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, ''));
    (window.customBooks || []).forEach(b => bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, ''));
    const selected = roomConfig.selectedBooks || [];
    const bookNames = selected.map(id => bookMap[id] || (String(id).startsWith('custom_') ? '自定义词书' : id));

    globalLobbyChannel.send({
        type: 'broadcast',
        event: 'invite_match',
        payload: {
            from: currentUser,
            fromAvatar: getUserAvatar(currentUser),
            to: targetUser,
            roomCode: roomCode,
            roomName: customRoomName || `${currentUser}的房间`,
            config: roomConfig,
            bookNames: bookNames.join(', ') || '未选词书'
        }
    });

    closeRoomInvitePlayersModal();
    showToast(`已向【${targetUser}】发送对决邀请，等待对方接受...`);
}

function kickPlayerFromRoom(targetUser) {
    if (!isHost || !realtimeChannel || !targetUser) return;
    realtimeChannel.send({
        type: 'broadcast',
        event: 'kick_player',
        payload: { target: targetUser, reason: '您已被房主移出房间' }
    });
    guestName = '';
    guestAvatar = '';
    refreshRoomPlayerCards();
    showToast(`已将玩家【${targetUser}】移出房间`);
    if (roomCode) {
        sbClient.from('rooms').update({ player_count: 1, status: 'waiting' }).eq('code', roomCode).then(() => {}).catch(() => {});
    }
}

function getBookNamesSummary(bookIds) {
    if (!bookIds || bookIds.length === 0) return '未选词书';
    const allBooks = (typeof BookManager !== 'undefined' && BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : (typeof BookManager !== 'undefined' && BookManager.fallbackBooks ? BookManager.fallbackBooks : []);
    const bookMap = {};
    allBooks.forEach(b => {
        bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
    });
    (window.customBooks || []).forEach(b => {
        bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
    });
    const names = bookIds.map(id => bookMap[id] || (String(id).startsWith('custom_') ? '自定义词书' : id));
    if (names.length === 1) return names[0];
    return `${names[0]} 等 ${names.length} 本`;
}

function changeRuleTime(seconds) {
    if (!isHost) return;
    roomConfig.duration = seconds;
    renderRuleChips();
    broadcastRuleChange();
}

function changeRuleLead(leads) {
    if (!isHost) return;
    roomConfig.winLead = leads;
    renderRuleChips();
    broadcastRuleChange();
}

function changeRuleGaugeStyle(style) {
    if (!isHost) return;
    roomConfig.gaugeStyle = style;
    renderRuleChips();
    broadcastRuleChange();
}

function toggleRoomBook(bookId) {
    if (!isHost) return;
    if (!roomConfig.selectedBooks) roomConfig.selectedBooks = [];

    const hasIt = isBookIdSelected(roomConfig.selectedBooks, bookId);
    if (hasIt) {
        roomConfig.selectedBooks = toggleBookIdInList(roomConfig.selectedBooks, bookId);
    } else {
        roomConfig.selectedBooks.push(bookId);
    }
    renderRoomBookChips();
    broadcastRuleChange();
}

let currentRoomBookCategory = 'english';

function switchRoomBookCategory(cat) {
    currentRoomBookCategory = cat;
    roomConfig.category = cat;
    document.querySelectorAll('#room-book-category-tabs .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    const importLabel = document.getElementById('room-import-label');
    if (importLabel) importLabel.innerText = cat === 'shici' ? '导入文言' : '导入词书';

    renderRoomBookChips();
    broadcastRuleChange();
}

function triggerRoomBookImport() {
    if (!isHost) {
        showToast('仅房主可导入和设置词书');
        return;
    }
    const input = document.getElementById('room-custom-book-input');
    if (input) input.click();
}

async function handleRoomCustomBookUpload(e) {
    if (currentRoomBookCategory === 'shici') {
        await loadCustomShiCiBook(e);
    } else {
        await loadCustomBook(e);
    }
    renderRoomBookChips();
    broadcastRuleChange();
}

function selectAllRoomBooks(selectAll = true) {
    if (!isHost) {
        showToast('仅房主可选择词书');
        return;
    }
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const targetBooks = allBooks.filter(b => currentRoomBookCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b))
        .concat((window.customBooks || []).filter(b => currentRoomBookCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    if (selectAll) {
        targetBooks.forEach(b => {
            if (!roomConfig.selectedBooks.includes(b.id)) {
                roomConfig.selectedBooks.push(b.id);
            }
        });
    } else {
        const targetIds = new Set(targetBooks.map(b => b.id));
        roomConfig.selectedBooks = (roomConfig.selectedBooks || []).filter(id => !targetIds.has(id));
    }
    renderRoomBookChips();
    broadcastRuleChange();
}

function updateRoomBookSummaryUI() {
    const books = roomConfig.selectedBooks || [];
    const titleEl = document.getElementById('room-selected-books-title');
    const summaryEl = document.getElementById('room-selected-books-summary');
    const selectBtn = document.getElementById('btn-room-select-books');

    if (!isHost) {
        const names = roomConfig.selectedBookNames || [];
        if (names.length > 0) {
            if (titleEl) titleEl.innerText = names.join(', ');
            if (summaryEl) summaryEl.innerText = `房主已选 ${names.length} 本词书`;
        } else if (books.length > 0) {
            if (titleEl) titleEl.innerText = getBookNamesSummary(books);
            if (summaryEl) summaryEl.innerText = `房主已选 ${books.length} 本词书`;
        } else {
            if (titleEl) titleEl.innerText = '等待房主选定词书...';
            if (summaryEl) summaryEl.innerText = '房主尚未选书';
        }
        if (selectBtn) selectBtn.style.display = 'none';
        return;
    }

    if (selectBtn) selectBtn.style.display = 'inline-flex';
    if (titleEl) titleEl.innerText = getBookNamesSummary(books);
    if (summaryEl) summaryEl.innerText = `已选 ${books.length} 本词书`;
}

function renderRoomBookChips() {
    updateRoomBookSummaryUI();
    refreshRoomPlayerCards();
}


function renderRuleChips() {
    document.querySelectorAll('#chips-time .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-time'));
        el.classList.toggle('selected', val === roomConfig.duration);
        el.classList.toggle('disabled', !isHost);
    });

    document.querySelectorAll('#chips-lead .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-lead'));
        el.classList.toggle('selected', val === roomConfig.winLead);
        el.classList.toggle('disabled', !isHost);
    });

    document.querySelectorAll('#chips-gauge-style .md3-chip').forEach(el => {
        const val = el.getAttribute('data-gauge');
        el.classList.toggle('selected', val === (roomConfig.gaugeStyle || 'tug'));
        el.classList.toggle('disabled', !isHost);
    });

    renderRoomBookChips();
}

function broadcastRuleChange() {
    if (!isHost || !realtimeChannel) return;
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const bookMap = {};
    allBooks.forEach(b => bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, ''));
    (window.customBooks || []).forEach(b => bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, ''));

    const selected = roomConfig.selectedBooks || [];
    // 将每一个选中的 ID 转为清晰的书名，杜绝传递 custom_xxx 给对方
    const bookNames = selected.map(id => {
        return bookMap[id] || (String(id).startsWith('custom_') ? '自定义词书' : id);
    });
    roomConfig.selectedBookNames = bookNames;

    realtimeChannel.send({
        type: 'broadcast',
        event: 'rule_update',
        payload: { config: roomConfig }
    });
    refreshRoomPlayerCards();
}

async function createOnlineRoom() {
    if (isCurrentUserLoggedIn()) {
        enterMyExclusiveRoom();
    } else {
        showToast('游客无专属房间，请通过在线玩家列表发起对战');
    }
}

async function joinOnlineRoom() {
    const btnJoin = document.getElementById('btn-join-room');
    const codeInput = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (codeInput.length !== 6) return alert('请输入正确6位房间码！');

    btnJoin.disabled = true;
    btnJoin.innerText = '正在验证房间...';

    const testChannel = sbClient.channel(`duel_${codeInput}`, {
        config: { presence: { key: currentUser } }
    });

    let verified = false;
    const timeoutTimer = setTimeout(() => {
        if (!verified) {
            testChannel.unsubscribe();
            btnJoin.disabled = false;
            btnJoin.innerText = '加入房间';
            alert(`房间 ${codeInput} 不存在或房主已离线！`);
        }
    }, 2600);

    testChannel
        .on('broadcast', { event: 'room_ack' }, ({ payload }) => {
            if (payload && payload.isHost) {
                verified = true;
                clearTimeout(timeoutTimer);
                testChannel.unsubscribe();

                isHost = false;
                roomCode = codeInput;
                hostName = payload.hostName;
                guestName = currentUser;
                if (payload.config) roomConfig = payload.config;

                btnJoin.disabled = false;
                btnJoin.innerText = '加入房间';

                setupRoomLobbyUI(roomCode);
                connectSupabaseChannel(roomCode);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                testChannel.send({
                    type: 'broadcast',
                    event: 'room_ping',
                    payload: { from: currentUser }
                });
            }
        });
}

function setupRoomLobbyUI(code, customName) {
    document.getElementById('online-pre-join').style.display = 'none';
    document.getElementById('online-in-room').style.display = 'block';
    document.getElementById('display-room-code').innerText = code;
    document.getElementById('display-room-code').onclick = () => {
        const copyText = (text) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
            }
            return fallbackCopy(text);
        };

        const fallbackCopy = (text) => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(err);
            }
        };

        copyText(code).then(() => {
            showToast(`已复制房间码: ${code}`);
        }).catch(() => {
            showToast(`房间码: ${code} (请手动长按复制)`);
        });
    };

    const titleEl = document.getElementById('display-room-name');
    if (titleEl) {
        titleEl.innerText = customName || (typeof customRoomName !== 'undefined' && customRoomName ? customRoomName : '对战房间');
    }

    const delBtn = document.getElementById('btn-host-delete-room');
    if (delBtn) {
        const isLogged = isCurrentUserLoggedIn();
        const myExclusiveCode = isLogged ? getUserRoomCode(currentUser) : null;
        const isExclusiveRoom = isLogged && (code === myExclusiveCode);
        delBtn.style.display = (isHost && !isExclusiveRoom) ? 'inline-flex' : 'none';
    }

    // 彻底清空房间聊天记录，防止残留上一房间的消息
    const chatMessages = document.getElementById('room-chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `<div style="text-align:center; font-size:0.75rem; color:var(--md-sys-color-outline); margin:auto;">房间已创建，欢迎和对手交流！</div>`;
    }

    renderRuleChips();
    refreshRoomPlayerCards();
}

function refreshRoomPlayerCards() {
    const p1NameEl = document.getElementById('room-p1-name');
    const p2NameEl = document.getElementById('room-p2-name');
    if (p1NameEl) p1NameEl.innerText = hostName || '等待房主...';

    const p1Img = document.getElementById('room-p1-avatar-img');
    const p1Icon = document.getElementById('room-p1-avatar-icon');
    let p1Avatar = hostAvatar || (hostName ? getUserAvatar(hostName) : '');
    if (p1Avatar && p1Avatar.startsWith('//')) p1Avatar = 'https:' + p1Avatar;
    if (p1Avatar && p1Img && p1Icon) {
        p1Img.src = p1Avatar;
        p1Img.style.display = 'block';
        p1Icon.style.display = 'none';
    } else if (p1Img && p1Icon) {
        p1Img.style.display = 'none';
        p1Icon.style.display = 'inline-flex';
    }

    const p2Img = document.getElementById('room-p2-avatar-img');
    const p2Icon = document.getElementById('room-p2-avatar-icon');
    const p2Badge = document.getElementById('room-p2-badge');

    if (guestName) {
        if (p2NameEl) p2NameEl.innerText = guestName;
        if (p2Badge) p2Badge.innerText = isHost ? '挑战者' : '挑战者';
        let p2Avatar = guestAvatar || (guestName ? getUserAvatar(guestName) : '');
        if (p2Avatar && p2Avatar.startsWith('//')) p2Avatar = 'https:' + p2Avatar;
        if (p2Avatar && p2Img && p2Icon) {
            p2Img.src = p2Avatar;
            p2Img.style.display = 'block';
            p2Icon.style.display = 'none';
        } else if (p2Img && p2Icon) {
            p2Img.style.display = 'none';
            p2Icon.style.display = 'inline-flex';
            p2Icon.innerText = 'person';
        }
    } else {
        if (p2NameEl) p2NameEl.innerText = isHost ? '点击邀请玩家' : '等待对手加入...';
        if (p2Badge) p2Badge.innerText = isHost ? '邀请对手' : '等待加入';
        if (p2Img) p2Img.style.display = 'none';
        if (p2Icon) {
            p2Icon.style.display = 'inline-flex';
            p2Icon.innerText = isHost ? 'person_add' : 'person';
        }
    }

    const startBtn = document.getElementById('online-start-btn');
    if (!startBtn) return;
    const totalBooks = (roomConfig.selectedBooks || []).length;
    if (isHost) {
        if (!guestName) {
            startBtn.disabled = true;
            startBtn.innerText = '等待对手加入...';
        } else if (totalBooks === 0) {
            startBtn.disabled = true;
            startBtn.innerText = '请至少选择一本词书';
        } else {
            startBtn.disabled = false;
            startBtn.innerText = '开始对局';
        }
    } else {
        startBtn.disabled = true;
        startBtn.innerText = guestName ? '已在房间内，等待房主开始...' : '正在连接...';
    }
}

// 修复：发送聊天消息时严格附带 roomCode
function sendRoomChatMessage() {
    const input = document.getElementById('room-chat-input');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;
    if (!realtimeChannel || !roomCode) {
        showToast('未连接到房间');
        return;
    }
    const msgPayload = {
        roomCode: roomCode, // 携带当前房间码
        sender: currentUser || (isHost ? '房主' : '挑战者'),
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHost: isHost
    };
    realtimeChannel.send({
        type: 'broadcast',
        event: 'room_chat',
        payload: msgPayload
    });
    appendRoomChatMessage(msgPayload, true);
    input.value = '';
}

// 修复：接收聊天时严格校验 roomCode，杜绝串房间
function handleReceiveRoomChatMessage(payload) {
    if (!payload || !payload.text) return;
    if (payload.roomCode && payload.roomCode !== roomCode) return; // 拦截非当前房间消息
    appendRoomChatMessage(payload, false);
}

function appendRoomChatMessage(data, isMine) {
    const container = document.getElementById('room-chat-messages');
    if (!container) return;
    const emptyNotice = container.querySelector('div[style*="margin:auto"]');
    if (emptyNotice) emptyNotice.remove();

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

    const metaSpan = document.createElement('div');
    metaSpan.className = 'chat-bubble-meta';
    metaSpan.innerHTML = `<strong>${isMine ? '我' : escapeHtml(data.sender || '对手')}</strong><span>${data.time || ''}</span>`;

    const textSpan = document.createElement('div');
    textSpan.className = 'chat-bubble-text';
    textSpan.innerText = data.text;

    bubble.appendChild(metaSpan);
    bubble.appendChild(textSpan);
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function connectSupabaseChannel(code) {
    if (realtimeChannel) realtimeChannel.unsubscribe();

    realtimeChannel = sbClient.channel(`duel_${code}`, {
        config: { presence: { key: currentUser } }
    });

    realtimeChannel
        .on('broadcast', { event: 'room_ping' }, () => {
            if (isHost) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'room_ack',
                    payload: { isHost: true, hostName: currentUser, config: roomConfig }
                });
            }
        })
        .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
            if (payload.role === 'guest') {
                guestName = payload.name;
                guestAvatar = payload.avatar || (guestName ? getUserAvatar(guestName) : '');
                showToast(`玩家${guestName}已就位！`);
                refreshRoomPlayerCards();
                if (isHost) {
                    realtimeChannel.send({
                        type: 'broadcast',
                        event: 'room_sync',
                        payload: {
                            hostName: currentUser,
                            hostAvatar: getUserAvatar(currentUser),
                            guestName: guestName,
                            guestAvatar: guestAvatar,
                            config: roomConfig
                        }
                    });
                }
            }
        })
        .on('broadcast', { event: 'room_sync' }, ({ payload }) => {
            hostName = payload.hostName;
            guestName = payload.guestName;
            if (payload.hostAvatar) hostAvatar = payload.hostAvatar;
            if (payload.guestAvatar) guestAvatar = payload.guestAvatar;
            if (payload.roomName) {
                customRoomName = payload.roomName;
                const titleEl = document.getElementById('display-room-name');
                if (titleEl) titleEl.innerText = customRoomName;
            }
            if (payload.config) roomConfig = payload.config;
            renderRuleChips();
            refreshRoomPlayerCards();
        })
        .on('broadcast', { event: 'rule_update' }, ({ payload }) => {
            if (!isHost && payload.config) {
                roomConfig = payload.config;
                renderRuleChips();
                showToast(`规则已更新`);
            }
        })
        .on('broadcast', { event: 'sync_back_to_room' }, () => {
            if (!isHost) {
                setupRoomLobbyUI(roomCode, customRoomName);
                switchView('view-online');
                showToast('已返回房间');
            }
        })
        .on('broadcast', { event: 'player_left' }, ({ payload }) => {
            if (payload.role === 'guest') {
                showToast(`玩家${guestName}已退出房间`);
                guestName = '';
                refreshRoomPlayerCards();
            }
        })
        .on('broadcast', { event: 'host_closed_and_kick' }, () => {
            if (!isHost) {
                alert('房主已关闭页面或离开房间，您已被移出房间。');
                cleanUpAndBackToHub();
            }
        })
        .on('broadcast', { event: 'kick_player' }, ({ payload }) => {
            if (!isHost && payload && payload.target === currentUser) {
                alert(payload.reason || '您已被房主移出房间');
                cleanUpAndBackToHub();
            }
        })
        .on('broadcast', { event: 'room_closed' }, () => {
            if (!isHost) {
                alert('房间已解散。');
                cleanUpAndBackToHub();
            }
        })
        .on('broadcast', { event: 'room_disbanded' }, ({ payload }) => {
            if (!isHost) {
                alert(payload?.message || '房间已被删除');
                cleanUpAndBackToHub();
            }
        })
        .on('broadcast', { event: 'room_chat' }, ({ payload }) => {
            handleReceiveRoomChatMessage(payload);
        })
        .on('broadcast', { event: 'game_start' }, ({ payload }) => {
            handleRemoteGameStart(payload);
        })
        .on('broadcast', { event: 'score_update' }, ({ payload }) => {
            handleRemoteScoreUpdate(payload);
        })
        .on('broadcast', { event: 'game_over' }, ({ payload }) => {
            endGame(payload.msg, false);
        })
        // === 核心心跳兜底：当房主断网、浏览器崩溃导致心跳消失时，对手被自动踢出 ===
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach(p => {
                if (isHost && p.key === guestName) {
                    showToast(`玩家${guestName}已断开连接`);
                    guestName = '';
                    refreshRoomPlayerCards();
                } else if (!isHost && p.key === hostName) {
                    alert('房主已断开连接并离开房间，您已被移出房间。');
                    cleanUpAndBackToHub();
                }
            });
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await realtimeChannel.track({ name: currentUser, isHost });
                if (!isHost) {
                    realtimeChannel.send({
                        type: 'broadcast',
                        event: 'player_joined',
                        payload: { name: currentUser, avatar: getUserAvatar(currentUser), role: 'guest' }
                    });
                }
            }
        });
}

async function leaveOnlineLobby(confirmNeeded = false) {
    if (confirmNeeded && !confirm('确认退出当前房间吗？')) return;

    const codeToLeave = roomCode;
    const wasHost = isHost;

    if (realtimeChannel) {
        if (wasHost) {
            realtimeChannel.send({ type: 'broadcast', event: 'room_closed', payload: {} });
        } else {
            realtimeChannel.send({ type: 'broadcast', event: 'player_left', payload: { name: currentUser, role: 'guest' } });
        }
    }

    // 如果是房主退出具体房间：
    if (wasHost && codeToLeave) {
        const isLogged = isCurrentUserLoggedIn();
        const myExclusiveCode = isLogged ? getUserRoomCode(currentUser) : null;
        const isTemp = (codeToLeave !== myExclusiveCode);

        try {
            if (isTemp) {
                await sbClient.from('rooms').delete().eq('code', codeToLeave);
            } else {
                await sbClient.from('rooms').update({ status: 'closed', player_count: 0 }).eq('code', codeToLeave);
            }
        } catch (e) { }

        // 2. 广播通知他人立刻移除该房间
        if (globalLobbyChannel) {
            globalLobbyChannel.send({
                type: 'broadcast',
                event: 'room_state_change',
                payload: { action: 'hide', code: codeToLeave }
            });
        }
    }

    cleanUpAndBackToHub();

    if (typeof fetchOnlineRoomsList === 'function') {
        fetchOnlineRoomsList();
    }
}

function cleanUpAndBackToHub() {
    if (gameTimer) clearInterval(gameTimer);
    if (p1State && p1State.timerId) clearInterval(p1State.timerId);
    resetAllGameAlertsAndFeedback();

    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }
    roomCode = null;
    isHost = false;
    hostName = '';
    guestName = '';

    document.getElementById('online-pre-join').style.display = 'flex';
    document.getElementById('online-in-room').style.display = 'none';
    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
        btnJoin.disabled = false;
        btnJoin.innerText = '加入房间';
    }
    switchView('view-hub');
}

async function startOnlineGame() {
    if (!isHost || !guestName) return;
    if (!roomConfig.selectedBooks || roomConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        refreshRoomPlayerCards();
        return;
    }
    const startBtn = document.getElementById('online-start-btn');
    startBtn.disabled = true;
    startBtn.innerText = '正在准备词库...';

    try {
        const words = await BookManager.loadMultipleBooks(roomConfig.selectedBooks);
        const sharedPool = generateShuffledPoolFromWords(words, 80);
        const startPayload = {
            pool: sharedPool,
            hostName: currentUser,
            hostAvatar: getUserAvatar(currentUser),
            guestName: guestName,
            guestAvatar: guestAvatar || (guestName ? getUserAvatar(guestName) : ''),
            config: roomConfig
        };
        realtimeChannel.send({
            type: 'broadcast',
            event: 'game_start',
            payload: startPayload
        });
        handleRemoteGameStart(startPayload);
    } catch (err) {
        alert('准备词库失败：' + err.message);
        refreshRoomPlayerCards();
    }
}

function renderArenaPlayersUI(myName, myAvatar, oppoName, oppoAvatar) {
    const myNameEl = document.getElementById('arena-my-name');
    const oppoNameEl = document.getElementById('arena-oppo-name');
    if (myNameEl) myNameEl.innerText = myName || '我方';
    if (oppoNameEl) oppoNameEl.innerText = oppoName || '对手';

    if (myAvatar && typeof myAvatar === 'string' && myAvatar.startsWith('//')) myAvatar = 'https:' + myAvatar;
    if (oppoAvatar && typeof oppoAvatar === 'string' && oppoAvatar.startsWith('//')) oppoAvatar = 'https:' + oppoAvatar;

    // 绑定我方头像
    const myImg = document.getElementById('arena-my-avatar-img');
    const myIcon = document.getElementById('arena-my-avatar-icon');
    if (myAvatar && myImg && myIcon) {
        myImg.src = myAvatar;
        myImg.style.display = 'block';
        myIcon.style.display = 'none';
    } else if (myImg && myIcon) {
        myImg.style.display = 'none';
        myIcon.style.display = 'inline-flex';
    }

    // 绑定对手头像（完全独立，不混淆）
    const oppoImg = document.getElementById('arena-oppo-avatar-img');
    const oppoIcon = document.getElementById('arena-oppo-avatar-icon');
    if (oppoAvatar && oppoImg && oppoIcon) {
        oppoImg.src = oppoAvatar;
        oppoImg.style.display = 'block';
        oppoIcon.style.display = 'none';
    } else if (oppoImg && oppoIcon) {
        oppoImg.style.display = 'none';
        oppoIcon.style.display = 'inline-flex';
    }
}

function handleRemoteGameStart(payload) {
    gameMode = 'online';
    if (payload.config) roomConfig = payload.config;

    if (payload.hostAvatar) hostAvatar = payload.hostAvatar;
    if (payload.guestAvatar) guestAvatar = payload.guestAvatar;

    const oppoName = isHost ? payload.guestName : payload.hostName;
    const oppoAvatar = isHost ? (guestAvatar || getUserAvatar(oppoName)) : (hostAvatar || getUserAvatar(oppoName));
    const myAvatar = getUserAvatar(currentUser);

    renderArenaPlayersUI(currentUser, myAvatar, oppoName, oppoAvatar);

    document.getElementById('arena-my-score').innerText = '0';
    document.getElementById('arena-oppo-score').innerText = '0';

    const gaugeStyle = roomConfig.gaugeStyle || 'tug';
    const snakeWrap = document.getElementById('arena-gauge-snake-wrap');
    const tugWrap = document.getElementById('arena-gauge-tug-wrap');
    if (gaugeStyle === 'tug') {
        if (snakeWrap) snakeWrap.style.display = 'none';
        if (tugWrap) tugWrap.style.display = 'flex';
        const ruleSum = document.getElementById('arena-tug-rule-summary');
        if (ruleSum) ruleSum.innerText = `领先 ${roomConfig.winLead} 题胜出`;
    } else {
        if (snakeWrap) snakeWrap.style.display = 'flex';
        if (tugWrap) tugWrap.style.display = 'none';
        const ruleSum = document.getElementById('arena-rule-summary');
        if (ruleSum) ruleSum.innerText = `领先 ${roomConfig.winLead} 题胜出`;
    }

    const playerShuffledPool = shuffle([...payload.pool]);
    resetPlayerState(p1State, playerShuffledPool);
    p2State.score = 0;
    p2State.total = 0;

    renderQuestion(p1State);

    timeLeft = roomConfig.duration;
    renderSnakeRing();
    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        timeLeft--;
        renderSnakeRing();
        if (timeLeft <= 0) {
            endGame("时间到！以当前能量决出胜负", true);
            clearInterval(gameTimer);
            const diff = p1State.score - p2State.score;
            let myMsg = "🤝 势均力敌，握手言和！";
            let peerMsg = "🤝 势均力敌，握手言和！";
            if (diff > 0) {
                myMsg = "🎉 恭喜获胜！";
                peerMsg = "💔 遗憾战败！";
            } else if (diff < 0) {
                myMsg = "💔 遗憾战败！";
                peerMsg = "🎉 恭喜获胜！";
            }
            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'game_over',
                    payload: { msg: peerMsg }
                });
            }
            endGame(myMsg, false);
        }
    }, 1000);

    switchView('view-game');
}

function handleRemoteScoreUpdate(payload) {
    p2State.score = payload.score;
    document.getElementById('arena-oppo-score').innerText = `${payload.score}`;
    renderSnakeRing();
    checkOnlineWinCondition();
}

function resetAllGameAlertsAndFeedback() {
    // 1. Arena / Online / AI 对决提示框、遮罩与计时器清理
    const p1Cooldown = document.getElementById('p1-cooldown');
    if (p1Cooldown) p1Cooldown.classList.remove('active');
    const p1RevEl = document.getElementById('p1-cooldown-reveal');
    if (p1RevEl) p1RevEl.style.display = 'none';
    const p1BarWrap = document.getElementById('p1-cooldown-bar-wrap');
    if (p1BarWrap) p1BarWrap.style.display = 'none';
    const arenaComp = document.getElementById('arena-phrase-compare');
    if (arenaComp) arenaComp.style.display = 'none';
    const arenaTip = document.getElementById('arena-penalty-tip');
    if (arenaTip) arenaTip.innerText = '';
    if (typeof p1State !== 'undefined' && p1State && p1State.timerId) {
        clearInterval(p1State.timerId);
        p1State.timerId = null;
    }
    if (typeof p1State !== 'undefined' && p1State) {
        p1State.frozen = false;
        p1State.answeringLock = false;
    }

    // 2. Wordle (单词解谜) 提示框与结果框彻底重置
    const riddleHintBox = document.getElementById('riddle-hint-box');
    if (riddleHintBox) riddleHintBox.style.display = 'none';
    const riddleHintTitle = document.getElementById('riddle-hint-title');
    if (riddleHintTitle) riddleHintTitle.innerText = '提示 (1/4)';
    const riddleHintStepTip = document.getElementById('riddle-hint-step-tip');
    if (riddleHintStepTip) riddleHintStepTip.innerText = '点击下方【提示】可继续解锁';
    const riddleHintContent = document.getElementById('riddle-hint-content');
    if (riddleHintContent) riddleHintContent.innerHTML = '';
    const riddleResBox = document.getElementById('riddle-result-box');
    if (riddleResBox) riddleResBox.style.display = 'none';
    const riddleHintCount = document.getElementById('riddle-hint-count');
    if (riddleHintCount) riddleHintCount.innerText = '0/4';

    // 3. 希沃本地对决红蓝双方惩罚遮罩与反馈清理
    ['p1', 'p2'].forEach(player => {
        const freezeOverlay = document.getElementById(`local-freeze-${player}`);
        if (freezeOverlay) freezeOverlay.style.display = 'none';
        const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
        if (freezeInfo) freezeInfo.style.display = 'none';
        const freezeBar = document.getElementById(`local-freeze-bar-${player}`);
        if (freezeBar) freezeBar.style.width = '0%';
        const tipEl = document.getElementById(`local-penalty-tip-${player}`);
        if (tipEl) tipEl.style.display = 'none';
        const phraseComp = document.getElementById(`local-phrase-compare-${player}`);
        if (phraseComp) phraseComp.style.display = 'none';
    });

    // 4. 默写模式结果反馈卡片清理
    const dictFeedback = document.getElementById('dictation-feedback-card');
    if (dictFeedback) dictFeedback.style.display = 'none';

    // 5. 单人练习词组比对卡片清理
    const singleComp = document.getElementById('single-phrase-compare');
    if (singleComp) singleComp.style.display = 'none';
}

function resetPlayerState(state, pool) {
    resetAllGameAlertsAndFeedback();
    if (state.timerId) clearInterval(state.timerId);
    state.score = 0;
    state.total = 0;
    state.currentIdx = 0;
    state.frozen = false;
    state.answeringLock = false;
    state.pool = pool;
    state.timerId = null;
}

let arenaPhraseState = {
    targetWords: [],
    placed: [],
    chips: [],
    q: null
};

function renderQuestion(state) {
    if (state.currentIdx >= state.pool.length) {
        document.getElementById(`p1-word`).innerText = "练习完成！";
        document.getElementById(`p1-phone`).innerText = "";
        document.getElementById(`p1-options`).innerHTML = "";
        return;
    }

    const q = state.pool[state.currentIdx];
    const roundTag = document.getElementById('arena-index-tag');
    if (roundTag) roundTag.innerText = `第 ${state.currentIdx + 1} 题`;

    const arenaBookBadge = document.getElementById('arena-book-badge');
    if (arenaBookBadge) {
        arenaBookBadge.innerText = q.bookName || '对决词库';
    }

    const isShiCi = Boolean(q.isShiCi || q.senses || q.highlightedSentence);
    const isPhrase = !isShiCi && q.word && q.word.trim().includes(' ');
    if (isPhrase) {
        const shiciBadge = document.getElementById('arena-shici-badge');
        if (shiciBadge) shiciBadge.style.display = 'none';
        renderArenaPhraseQuestion(state, q);
        return;
    }

    const wordEl = document.getElementById(`p1-word`);
    const phoneEl = document.getElementById(`p1-phone`);
    const shiciBadge = document.getElementById('arena-shici-badge');
    const shiciBox = document.getElementById('p1-shici-box');
    const shiciSentence = document.getElementById('p1-shici-sentence');
    const shiciSource = document.getElementById('p1-shici-source');
    const shiciCooldown = document.getElementById('p1-shici-cooldown-reveal');
    if (shiciCooldown) shiciCooldown.style.display = 'none';

    const optContainer = document.getElementById(`p1-options`);

    if (isShiCi) {
        if (wordEl) wordEl.style.display = 'none';
        if (phoneEl) phoneEl.style.display = 'none';
        if (shiciBadge) {
            shiciBadge.style.display = 'inline-flex';
            shiciBadge.innerText = `${q.word} ${q.pinyin || ''}`.trim();
        }
        if (shiciBox) {
            shiciBox.style.display = 'block';
            if (shiciSentence) shiciSentence.innerHTML = q.highlightedSentence || escapeHtml(q.sentence || q.word);
            if (shiciSource) shiciSource.innerText = `—— ${q.source || '《古文》'}`;
        }

        if (optContainer) {
            optContainer.className = 'shici-options-grid';
            const letters = ['A', 'B', 'C', 'D'];
            optContainer.innerHTML = q.options.map((opt, idx) => `
                        <button class="shici-opt-btn" id="opt-btn-${idx}">
                            <span class="opt-prefix">${letters[idx]}</span>
                            ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                            <span class="opt-meaning-text">${escapeHtml(opt.rawMeaning || (opt.meaning || '').replace(/^\[.*?\]\s*/, ''))}</span>
                        </button>
                    `).join('');
        }
    } else {
        if (shiciBadge) shiciBadge.style.display = 'none';
        if (shiciBox) shiciBox.style.display = 'none';
        if (wordEl) {
            wordEl.style.display = 'block';
            wordEl.innerText = q.word;
        }
        if (phoneEl) {
            if (q.phone) {
                phoneEl.innerText = q.phone.startsWith('/') ? q.phone : `/${q.phone}/`;
                phoneEl.style.display = 'block';
            } else {
                phoneEl.style.display = 'none';
            }
        }

        if (optContainer) {
            optContainer.className = 'single-options-list';
            optContainer.innerHTML = q.options.map((opt, idx) => `
                        <button class="single-opt-btn" id="opt-btn-${idx}">
                            <span class="opt-trans">${escapeHtml(opt.meaning || opt.word)}</span>
                        </button>
                    `).join('');
        }
    }

    q.options.forEach((_, idx) => {
        const btn = document.getElementById(`opt-btn-${idx}`);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handleAnswer(idx, e.clientX, e.clientY);
        });
    });
}

function renderArenaPhraseQuestion(state, q) {
    const targetWords = extractPhraseTargetWords(q.word);
    const placed = new Array(targetWords.length).fill(null);
    targetWords.forEach((tw, idx) => {
        if (isFixedPhraseToken(tw)) {
            placed[idx] = `__fixed__${idx}`;
        }
    });

    arenaPhraseState = {
        targetWords: targetWords,
        placed: placed,
        chips: (q.phraseChips && q.phraseChips.length > 0) ? q.phraseChips : generatePhraseDistractors(targetWords, state.pool),
        q: q
    };

    const wordEl = document.getElementById('p1-word');
    const phoneEl = document.getElementById('p1-phone');
    const optionsContainer = document.getElementById('p1-options');

    const correctMeaning = (q.options && q.correctIdx !== undefined && q.options[q.correctIdx]) ? q.options[q.correctIdx].meaning : (q.meaning || '');
    if (wordEl) wordEl.innerText = correctMeaning;
    if (phoneEl) {
        phoneEl.innerText = '';
        phoneEl.style.display = 'none';
    }

    if (!optionsContainer) return;

    optionsContainer.innerHTML = `
            <div class="phrase-container" style="margin:0 0 10px;">
                <div class="phrase-slots-row" id="arena-phrase-slots">
                    ${targetWords.map((tw, i) => {
        if (isFixedPhraseToken(tw)) {
            return `<div class="phrase-slot filled fixed" id="arena-slot-${i}">${escapeHtml(tw)}</div>`;
        }
        return `<div class="phrase-slot empty" id="arena-slot-${i}" onclick="handleArenaPhraseSlotClick(${i})"></div>`;
    }).join('')}
                </div>
                <div id="arena-phrase-compare" class="phrase-comparison-card" style="display: none;"></div>
                <div class="phrase-bank-card">
                    <div class="phrase-bank-header">
                        <span>备选词框：</span>
                        <button type="button" class="btn-clear-phrase" id="btn-clear-arena-phrase" onclick="clearArenaPhraseSlots()">
                            清空已选
                        </button>
                    </div>
                    <div class="phrase-chips-grid" id="arena-phrase-bank">
                        ${arenaPhraseState.chips.map(c => `
                            <button class="phrase-word-chip" id="arena-chip-${c.id}" onclick="handleArenaPhraseChipClick('${c.id}')">
                                ${c.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
}

function clearArenaPhraseSlots() {
    const state = p1State;
    if (state.frozen || state.answeringLock) return;
    arenaPhraseState.placed.forEach((chipId, idx) => {
        if (chipId && !String(chipId).startsWith('__fixed__')) {
            const slotEl = document.getElementById(`arena-slot-${idx}`);
            if (slotEl) {
                slotEl.classList.remove('filled', 'correct', 'wrong');
                slotEl.classList.add('empty');
                slotEl.innerText = '';
            }
            const chipEl = document.getElementById(`arena-chip-${chipId}`);
            if (chipEl) {
                chipEl.classList.remove('used');
                chipEl.disabled = false;
            }
            arenaPhraseState.placed[idx] = null;
        }
    });
    const comp = document.getElementById('arena-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function handleArenaPhraseChipClick(chipId) {
    const state = p1State;
    if (state.frozen || state.answeringLock) return;

    const emptyIdx = arenaPhraseState.placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    const chip = arenaPhraseState.chips.find(c => c.id === chipId);
    if (!chip) return;

    arenaPhraseState.placed[emptyIdx] = chipId;

    const slotEl = document.getElementById(`arena-slot-${emptyIdx}`);
    if (slotEl) {
        slotEl.classList.remove('empty');
        slotEl.classList.add('filled');
        slotEl.innerText = chip.text;
    }

    const chipEl = document.getElementById(`arena-chip-${chipId}`);
    if (chipEl) chipEl.classList.add('used');

    const comp = document.getElementById('arena-phrase-compare');
    if (comp) comp.style.display = 'none';

    if (!arenaPhraseState.placed.includes(null)) {
        checkArenaPhraseAnswer();
    }
}

function handleArenaPhraseSlotClick(slotIdx) {
    const state = p1State;
    if (state.frozen || state.answeringLock) return;

    const chipId = arenaPhraseState.placed[slotIdx];
    if (!chipId || String(chipId).startsWith('__fixed__')) return;

    arenaPhraseState.placed[slotIdx] = null;

    const slotEl = document.getElementById(`arena-slot-${slotIdx}`);
    if (slotEl) {
        slotEl.classList.remove('filled', 'correct', 'wrong');
        slotEl.classList.add('empty');
        slotEl.innerText = '';
    }

    const chipEl = document.getElementById(`arena-chip-${chipId}`);
    if (chipEl) chipEl.classList.remove('used');

    const comp = document.getElementById('arena-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function checkArenaPhraseAnswer() {
    const state = p1State;
    if (state.frozen || state.answeringLock) return;

    const placedWords = arenaPhraseState.placed.map((cid, i) => {
        if (String(cid).startsWith('__fixed__')) {
            return arenaPhraseState.targetWords[i].toLowerCase();
        }
        const c = arenaPhraseState.chips.find(item => item.id === cid);
        return c ? c.text.toLowerCase() : '';
    });
    const targetWordsLower = arenaPhraseState.targetWords.map(w => w.toLowerCase());
    const isRight = (placedWords.join(' ') === targetWordsLower.join(' '));

    const q = arenaPhraseState.q;
    userStats.total++;
    state.total++;

    if (isRight) {
        userStats.correct++;
        state.score++;
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
        saveCurrentUserData();

        arenaPhraseState.placed.forEach((cid, i) => {
            const slotEl = document.getElementById(`arena-slot-${i}`);
            if (slotEl && !String(cid).startsWith('__fixed__')) slotEl.classList.add('correct');
        });

        const comp = document.getElementById('arena-phrase-compare');
        if (comp) comp.style.display = 'none';
        const clearBtn = document.getElementById('btn-clear-arena-phrase');
        if (clearBtn) clearBtn.disabled = true;

        document.getElementById('arena-my-score').innerText = `${state.score}`;
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#146C2E');

        if (gameMode === 'online') {
            renderSnakeRing();
            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'score_update',
                    payload: { score: p1State.score, user: currentUser }
                });
            }
            if (checkOnlineWinCondition()) return;
        } else if (gameMode === 'ai_duel') {
            renderSnakeRing();
            if (checkAiDuelWinCondition()) return;
        }

        state.answeringLock = true;
        setTimeout(() => {
            state.answeringLock = false;
            state.currentIdx++;
            renderQuestion(state);
        }, 300);
    } else {
        recordUserMistake(currentUser, q.word, q.meaning, '');

        arenaPhraseState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`arena-slot-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            const chipId = arenaPhraseState.placed[i];
            const chip = chipId ? arenaPhraseState.chips.find(c => c.id === chipId) : null;
            const userWord = chip ? chip.text : '';
            const isSlotRight = (userWord.toLowerCase() === tw.toLowerCase());
            if (isSlotRight) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            } else {
                slotEl.classList.remove('correct');
                slotEl.classList.add('wrong');
            }
        });

        const comp = document.getElementById('arena-phrase-compare');
        if (comp) {
            comp.className = 'phrase-comparison-card wrong-state';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                        <div class="phrase-compare-row">
                            <span class="phrase-compare-badge wrong">✕ 搭配有误</span>
                            <span id="arena-penalty-tip" style="font-size:0.85rem; color:var(--md-sys-color-error); font-weight:600;">冷却 3 秒后可修改槽位重试</span>
                        </div>
                        <button type="button" class="btn-reveal-ten-sec" id="btn-arena-reveal-10s" onclick="revealArenaPhraseAnswerWithPenalty()">
                            跳过，惩罚 10 秒
                        </button>
                    </div>
                `;
        }

        const clearBtn = document.getElementById('btn-clear-arena-phrase');
        if (clearBtn) clearBtn.disabled = true;

        triggerArenaPhrase3sPenalty(state);
    }
}

function triggerArenaPhrase3sPenalty(state) {
    state.frozen = true;
    state.answeringLock = true;
    const banner = document.getElementById('p1-cooldown');
    const revEl = document.getElementById('p1-cooldown-reveal');
    const barWrap = document.getElementById('p1-cooldown-bar-wrap');
    const msgEl = document.getElementById('p1-cooldown-msg');

    if (revEl) revEl.style.display = 'none';
    if (barWrap) barWrap.style.display = 'none';
    if (banner) {
        banner.classList.add('active');
        if (msgEl) msgEl.innerHTML = `回答错误，请等待 <strong id="p1-timer">3</strong> 秒...`;
    }

    let sec = 3;
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(() => {
        sec--;
        const timerEl = document.getElementById('p1-timer');
        if (timerEl) timerEl.innerText = sec;
        if (sec <= 0) {
            clearInterval(state.timerId);
            state.timerId = null;
            if (banner) banner.classList.remove('active');
            state.frozen = false;
            state.answeringLock = false;

            const clearBtn = document.getElementById('btn-clear-arena-phrase');
            if (clearBtn) clearBtn.disabled = false;

            const tipEl = document.getElementById('arena-penalty-tip');
            if (tipEl) {
                tipEl.style.color = 'var(--md-sys-color-primary)';
                tipEl.innerText = '请重新调整，或点击下方【跳过】';
            }
        }
    }, 1000);
}

function revealArenaPhraseAnswerWithPenalty() {
    const state = p1State;
    if (state.timerId) clearInterval(state.timerId);

    state.frozen = true;
    state.answeringLock = true;
    const q = arenaPhraseState.q;
    recordUserMistake(currentUser, q.word, q.meaning, '');

    arenaPhraseState.targetWords.forEach((tw, i) => {
        const slotEl = document.getElementById(`arena-slot-${i}`);
        if (slotEl && !isFixedPhraseToken(tw)) {
            slotEl.classList.remove('empty', 'wrong');
            slotEl.classList.add('filled', 'correct');
            slotEl.innerText = tw;
        }
    });

    const comp = document.getElementById('arena-phrase-compare');
    if (comp) {
        comp.className = 'phrase-comparison-card';
        comp.style.display = 'block';
        comp.innerHTML = `
                <div class="phrase-compare-row">
                    <span class="phrase-compare-badge correct">✓ 正确词组</span>
                    <span class="phrase-compare-text correct">${q.word}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--md-sys-color-error); text-align:center; margin-top:6px; font-weight:600;">
                    已跳过本题，惩罚 10 秒
                </div>
            `;
    }

    arenaPhraseState.chips.forEach(c => {
        const chipEl = document.getElementById(`arena-chip-${c.id}`);
        if (chipEl) {
            chipEl.classList.add('used');
            chipEl.disabled = true;
        }
    });
    const clearBtn = document.getElementById('btn-clear-arena-phrase');
    if (clearBtn) clearBtn.disabled = true;

    const banner = document.getElementById('p1-cooldown');
    const revEl = document.getElementById('p1-cooldown-reveal');
    const pEl = document.getElementById('p1-cooldown-phrase');
    const mEl = document.getElementById('p1-cooldown-meaning');
    const barWrap = document.getElementById('p1-cooldown-bar-wrap');
    const barInner = document.getElementById('p1-cooldown-bar-inner');
    const msgEl = document.getElementById('p1-cooldown-msg');

    if (pEl) pEl.innerText = q.word;
    if (mEl) mEl.innerText = q.meaning || '';
    if (revEl) revEl.style.display = 'block';
    if (barWrap) barWrap.style.display = 'block';
    if (barInner) barInner.style.width = '100%';

    if (banner) {
        banner.classList.add('active');
        if (msgEl) msgEl.innerHTML = `已跳过，请等待 <strong id="p1-timer">10</strong> 秒...`;
    }

    let sec = 10;
    state.timerId = setInterval(() => {
        sec--;
        const timerEl = document.getElementById('p1-timer');
        if (timerEl) timerEl.innerText = sec;
        if (barInner) barInner.style.width = `${(sec / 10) * 100}%`;
        if (sec <= 0) {
            clearInterval(state.timerId);
            state.timerId = null;
            if (banner) banner.classList.remove('active');
            if (revEl) revEl.style.display = 'none';
            if (barWrap) barWrap.style.display = 'none';
            state.frozen = false;
            state.answeringLock = false;
            state.currentIdx++;
            renderQuestion(state);
        }
    }, 1000);
}

function handleAnswer(idx, clickX, clickY) {
    const state = p1State;
    if (state.frozen || state.answeringLock) return;

    state.answeringLock = true;
    const q = state.pool[state.currentIdx];
    const isRight = (idx === q.correctIdx);

    userStats.total++;
    state.total++;

    if (isRight) {
        userStats.correct++;
        state.score++;
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
    } else {
        if (q.isShiCi) {
            recordShiCiUserMistake(currentUser, {
                word: q.word,
                meaning: q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : (q.options[q.correctIdx]?.rawMeaning || q.options[q.correctIdx]?.meaning || q.meaning),
                pinyin: q.pinyin || q.phone || '',
                sentence: q.sentence || q.example?.sentence || '',
                highlightedSentence: q.highlightedSentence || '',
                source: q.source || q.example?.source || '',
                pos: q.pos || q.sense?.part_of_speech || q.options[q.correctIdx]?.pos || '',
                isShiCi: true
            });
        } else {
            recordUserMistake(currentUser, q.word, q.options[q.correctIdx]?.meaning || q.meaning, q.phone);
        }
    }
    saveCurrentUserData();

    for (let i = 0; i < q.options.length; i++) {
        const btn = document.getElementById(`opt-btn-${i}`);
        if (!btn) continue;
        btn.disabled = true;
        if (i === q.correctIdx) btn.classList.add('correct');
    }

    if (!isRight) {
        const wrongBtn = document.getElementById(`opt-btn-${idx}`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
    }

    if (clickX && clickY) {
        spawnParticles(clickX, clickY, isRight ? '#146C2E' : '#BA1A1A');
    }

    document.getElementById('arena-my-score').innerText = `${state.score}`;

    if (gameMode === 'online') {
        renderSnakeRing();
        if (realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'score_update',
                payload: { score: p1State.score, user: currentUser }
            });
        }
        if (checkOnlineWinCondition()) return;
    } else if (gameMode === 'ai_duel') {
        renderSnakeRing();
        if (checkAiDuelWinCondition()) return;
    }

    if (isRight) {
        setTimeout(() => {
            state.answeringLock = false;
            state.currentIdx++;
            renderQuestion(state);
        }, 200);
    } else {
        triggerPenalty(state);
    }
}

function triggerPenalty(state) {
    state.frozen = true;
    const banner = document.getElementById('p1-cooldown');
    if (banner) banner.classList.add('active');

    const q = state.pool ? state.pool[state.currentIdx] : null;
    const isShiCi = q && (q.isShiCi || q.highlightedSentence || q.sentence);

    const revEl = document.getElementById('p1-cooldown-reveal');
    const shiciRevEl = document.getElementById('p1-shici-cooldown-reveal');
    const barWrap = document.getElementById('p1-cooldown-bar-wrap');
    if (barWrap) barWrap.style.display = 'none';

    if (isShiCi) {
        if (revEl) revEl.style.display = 'none';
        if (shiciRevEl) {
            shiciRevEl.style.display = 'block';
            const senseEl = document.getElementById('p1-shici-cooldown-sense');
            const annotEl = document.getElementById('p1-shici-cooldown-annot');
            const correctOpt = q.options ? q.options[q.correctIdx] : null;
            const posStr = (q.sense?.part_of_speech || q.pos || correctOpt?.pos) ? `[${q.sense?.part_of_speech || q.pos || correctOpt?.pos}] ` : '';
            const meaningStr = (q.sense?.meaning || correctOpt?.rawMeaning || correctOpt?.meaning || q.meaning || '').replace(/★/g, '').trim();
            if (senseEl) senseEl.innerText = `${posStr}${meaningStr}`;

            let annotText = q.example?.annotation || q.annotation || '';
            if (!annotText && q.source && meaningStr) {
                annotText = `在《${q.source.replace(/[《》]/g, '')}》中${posStr ? `作${posStr.replace(/[\[\]\s]/g, '')}，` : ''}意为“${meaningStr}”。`;
            } else if (!annotText) {
                annotText = `作${posStr || '释义'}，意为“${meaningStr}”。`;
            }
            if (annotEl) annotEl.innerText = annotText;
        }
    } else {
        if (shiciRevEl) shiciRevEl.style.display = 'none';
        if (revEl) revEl.style.display = 'none';
    }

    let sec = 5;
    const timerEl = document.getElementById('p1-timer');
    if (timerEl) timerEl.innerText = sec;
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(() => {
        sec--;
        if (timerEl) timerEl.innerText = sec;
        if (sec <= 0) {
            clearInterval(state.timerId);
            if (banner) banner.classList.remove('active');
            if (shiciRevEl) shiciRevEl.style.display = 'none';
            state.frozen = false;
            state.answeringLock = false;
            state.currentIdx++;
            renderQuestion(state);
        }
    }, 1000);
}

function spawnParticles(x, y, color) {
    const emojis = ['✨', '⭐', '⚡', '💥'];
    for (let i = 0; i < 5; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
        p.style.setProperty('--dy', `${(Math.random() - 0.5) * 120 - 20}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 650);
    }
}

function drawDualEnergyRing(cvs, p1Score, p2Score, winLead, isP1Host, centerText) {
    if (!cvs) return;
    const cCtx = cvs.getContext('2d');
    if (!cCtx) return;
    cCtx.clearRect(0, 0, cvs.width, cvs.height);
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    const radius = (cvs.width / 2) - 16;
    const strokeWidth = 11;

    cCtx.beginPath();
    cCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    cCtx.strokeStyle = '#E1E2E8';
    cCtx.lineWidth = strokeWidth;
    cCtx.stroke();

    const lead = winLead || 6;
    const diff = p1Score - p2Score;
    const p1Units = Math.max(0, Math.min(lead * 2, lead + diff));
    const p1Ratio = p1Units / (lead * 2);

    const startAngle = -Math.PI / 2;
    const p1EndAngle = startAngle + (Math.PI * 2 * p1Ratio);

    if (p1Ratio > 0) {
        cCtx.beginPath();
        cCtx.arc(cx, cy, radius, startAngle, p1EndAngle);
        cCtx.strokeStyle = isP1Host ? '#B3261E' : '#006874';
        cCtx.lineWidth = strokeWidth;
        cCtx.lineCap = 'round';
        cCtx.stroke();
    }

    if (p1Ratio < 1) {
        cCtx.beginPath();
        cCtx.arc(cx, cy, radius, p1EndAngle, startAngle + (Math.PI * 2));
        cCtx.strokeStyle = isP1Host ? '#006874' : '#B3261E';
        cCtx.lineWidth = strokeWidth;
        cCtx.lineCap = 'round';
        cCtx.stroke();
    }

    if (centerText) {
        cCtx.fillStyle = '#191C20';
        cCtx.font = '700 16px "Roboto Mono", monospace';
        cCtx.textAlign = 'center';
        cCtx.textBaseline = 'middle';
        cCtx.fillText(centerText, cx, cy);
    }
}

function renderSnakeRing() {
    let m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const timerStr = `${m}:${s.toString().padStart(2, '0')}`;

    const cvs = document.getElementById('snakeCanvas');
    if (cvs) {
        if (gameMode === 'single') {
            const cCtx = cvs.getContext('2d');
            cCtx.clearRect(0, 0, cvs.width, cvs.height);
            cCtx.beginPath();
            cCtx.arc(cvs.width / 2, cvs.height / 2, 48, 0, Math.PI * 2);
            cCtx.strokeStyle = '#E1E2E8';
            cCtx.lineWidth = 11;
            cCtx.stroke();
            cCtx.fillStyle = '#191C20';
            cCtx.font = '700 16px "Roboto Mono", monospace';
            cCtx.textAlign = 'center';
            cCtx.textBaseline = 'middle';
            cCtx.fillText(`Lv.${p1State.score}`, cvs.width / 2, cvs.height / 2);
        } else {
            const winLead = (gameMode === 'ai_duel') ? (aiDuelConfig.winLead || 6) : (roomConfig.winLead || 6);
            drawDualEnergyRing(cvs, p1State.score, p2State.score, winLead, isHost || gameMode === 'ai_duel', timerStr);
        }
    }

    updateArenaTugGauge(timerStr);
}

function updateArenaTugGauge(timerStr) {
    const fillP1 = document.getElementById('arena-tug-p1');
    const fillP2 = document.getElementById('arena-tug-p2');
    const pin = document.getElementById('arena-tug-pin');
    const timerEl = document.getElementById('arena-tug-timer');
    const ruleSummary = document.getElementById('arena-tug-rule-summary');

    const winLead = (gameMode === 'ai_duel') ? (aiDuelConfig.winLead || 6) : (roomConfig.winLead || 6);
    if (ruleSummary) ruleSummary.innerText = `领先 ${winLead} 题胜出`;
    if (timerEl && timerStr) timerEl.innerText = timerStr;

    const diff = p1State.score - p2State.score;
    const ratio = 0.5 + (diff / (winLead * 2));
    const p1Width = Math.max(5, Math.min(95, ratio * 100));
    const p2Width = 100 - p1Width;

    if (fillP1) fillP1.style.width = `${p1Width}%`;
    if (fillP2) fillP2.style.width = `${p2Width}%`;
    if (pin) pin.style.left = `calc(${p1Width}% - 3px)`;
}

function checkOnlineWinCondition() {
    const winLead = roomConfig.winLead || 6;
    const diff = p1State.score - p2State.score;

    if (diff >= winLead) {
        const winMsg = `🎉 恭喜获胜！`;
        if (realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'game_over',
                payload: { msg: `💔 遗憾战败！` }
            });
        }
        endGame(winMsg, false);
        return true;
    } else if (diff <= -winLead) {
        const loseMsg = `💔 遗憾战败！`;
        endGame(loseMsg, false);
        return true;
    }
    return false;
}

function endGame(msg, broadcastToPeer) {
    clearInterval(gameTimer);
    if (p1State.timerId) clearInterval(p1State.timerId);
    if (aiDuelTimer) clearTimeout(aiDuelTimer);

    if (broadcastToPeer && realtimeChannel && gameMode === 'online') {
        let peerMsg = msg;
        if (msg === "🎉 恭喜获胜！") {
            peerMsg = "💔 遗憾战败！";
        } else if (msg === "💔 遗憾战败！") {
            peerMsg = "🎉 恭喜获胜！";
        } else {
            const diff = p1State.score - p2State.score;
            if (diff > 0) peerMsg = "💔 遗憾战败！";
            else if (diff < 0) peerMsg = "🎉 恭喜获胜！";
            else peerMsg = "🤝 势均力敌，握手言和！";
        }
        realtimeChannel.send({
            type: 'broadcast',
            event: 'game_over',
            payload: { msg: peerMsg }
        });
    }

    gameResult = {
        mode: gameMode,
        msg: msg,
        p1Score: p1State.score,
        p2Score: p2State.score
    };
    renderResult();
    switchView('view-result');
}

function renderResult() {
    if (!gameResult) return;
    document.getElementById('result-message').innerText = gameResult.msg;
    const details = document.getElementById('result-details');
    const btnBackRoom = document.getElementById('btn-back-room');
    const btnResultHub = document.getElementById('btn-result-hub');

    const resultCard = document.querySelector('#view-result .card');
    if (resultCard) {
        resultCard.style.maxWidth = (gameResult.mode === 'single' || gameResult.mode === 'shici') ? '720px' : '500px';
    }

    if (gameResult.mode === 'single') {
        const isReview = (gameResult.sessionName === '复习') || (singleState && singleState.sessionName === '复习');
        btnBackRoom.style.display = 'inline-flex';
        btnBackRoom.innerText = isReview ? '继续复习' : '再练一组';
        btnBackRoom.disabled = false;
        btnBackRoom.onclick = () => {
            if (isReview) {
                const targetBookId = gameResult.currentReviewBookId || (typeof currentReviewBookId !== 'undefined' ? currentReviewBookId : null);
                startSingleReview(targetBookId);
            } else {
                startSinglePlayerFromSelectedBooks();
            }
        };
        if (btnResultHub) btnResultHub.innerText = '返回主页';

        const pool = gameResult.pool || singleState.pool || [];
        if (isReview && pool && pool.length > 0 && typeof sessionReviewedWords !== 'undefined') {
            pool.forEach(p => {
                if (p && p.word) sessionReviewedWords.add(p.word.trim().toLowerCase());
            });
        }
        const totalCount = pool.length || singleState.total || 0;
        const correctCount = gameResult.p1Score !== undefined ? gameResult.p1Score : (singleState.score || 0);
        const rate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

        details.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">本次作答</span>
                        <span class="stat-value">${totalCount}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">正确率</span>
                        <span class="stat-value" style="color: ${rate >= 60 ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)'};">${rate}%</span>
                    </div>
                </div>
                ${renderSingleSummaryHtml(pool)}
            `;
    } else if (gameResult.mode === 'shici') {
        btnBackRoom.style.display = 'inline-flex';
        btnBackRoom.innerText = '再练一组';
        btnBackRoom.disabled = false;
        btnBackRoom.onclick = () => startShiCiLearning();
        if (btnResultHub) btnResultHub.innerText = '返回主页';

        const pool = gameResult.pool || [];
        const totalCount = pool.length;
        const correctCount = gameResult.p1Score !== undefined ? gameResult.p1Score : 0;
        const rate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

        details.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">本次实词</span>
                        <span class="stat-value">${totalCount}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">正确率</span>
                        <span class="stat-value" style="color: ${rate >= 60 ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)'};">${rate}%</span>
                    </div>
                </div>
                ${renderShiCiSummaryHtml(pool)}
            `;
    } else if (gameResult.mode === 'ai_duel') {
        btnBackRoom.style.display = 'inline-flex';
        btnBackRoom.innerText = '再战人机';
        btnBackRoom.disabled = false;
        btnBackRoom.onclick = () => startAiDuelFromModal();
        if (btnResultHub) btnResultHub.innerText = '返回主页';

        details.innerHTML = `
                <div style="display:flex; justify-content:space-around; align-items:center; background:var(--md-sys-color-surface-container); padding:16px; border-radius:var(--md-shape-l);">
                    <div>
                        <div style="font-weight:700; color:var(--p1-sys-color);">${currentUser} (我方)</div>
                        <div style="font-size:2rem; font-weight:800;">${gameResult.p1Score} 题</div>
                    </div>
                    <div style="font-weight:700; color:var(--md-sys-color-outline);">VS</div>
                    <div>
                        <div style="font-weight:700; color:var(--p2-sys-color);">系统AI</div>
                        <div style="font-size:2rem; font-weight:800;">${gameResult.p2Score} 题</div>
                    </div>
                </div>
            `;
    } else {
        btnBackRoom.style.display = 'inline-flex';
        if (isHost) {
            btnBackRoom.innerText = '返回房间';
            btnBackRoom.disabled = false;
            btnBackRoom.onclick = () => handleBackToRoom();
        } else {
            btnBackRoom.innerText = '等待房主操作...';
            btnBackRoom.disabled = true;
        }
        if (btnResultHub) {
            btnResultHub.innerText = isHost ? '解散房间并返回主页' : '退出对局并返回主页';
        }

        const oppoTitle = isHost ? guestName : hostName;
        details.innerHTML = `
                <div style="display:flex; justify-content:space-around; align-items:center; background:var(--md-sys-color-surface-container); padding:16px; border-radius:var(--md-shape-l);">
                    <div>
                        <div style="font-weight:700; color:var(--p1-sys-color);">${currentUser} (我方)</div>
                        <div style="font-size:2rem; font-weight:800;">${gameResult.p1Score} 题</div>
                    </div>
                    <div style="font-weight:700; color:var(--md-sys-color-outline);">VS</div>
                    <div>
                        <div style="font-weight:700; color:var(--p2-sys-color);">${oppoTitle || '对手'}</div>
                        <div style="font-size:2rem; font-weight:800;">${gameResult.p2Score} 题</div>
                    </div>
                </div>
            `;
    }
}

function handleBackToRoom() {
    resetAllGameAlertsAndFeedback();
    if (gameMode === 'online') {
        if (isHost) {
            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'sync_back_to_room',
                    payload: {}
                });
            }
            setupRoomLobbyUI(roomCode);
            switchView('view-online');
        }
    } else {
        switchView('view-hub');
    }
}

async function handleResultBackToHub() {
    const codeToClean = roomCode;
    const wasHost = isHost;

    if (gameMode === 'online') {
        if (wasHost && realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'room_closed',
                payload: { reason: 'host_left' }
            });
        } else if (!wasHost && realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'player_left',
                payload: { name: currentUser, role: 'guest' }
            });
        }

        // 房主从对决结算页面退出，彻底删除房间
        if (wasHost && codeToClean) {
            myCreatedRooms = myCreatedRooms.filter(r => r.code !== codeToClean);
            localStorage.setItem('my_created_rooms', JSON.stringify(myCreatedRooms));
            discoveredLobbyRooms = discoveredLobbyRooms.filter(r => r.code !== codeToClean);

            if (globalLobbyChannel) {
                globalLobbyChannel.send({
                    type: 'broadcast',
                    event: 'room_state_change',
                    payload: { action: 'delete', code: codeToClean }
                });
            }

            try {
                await sbClient.from('rooms').delete().eq('code', codeToClean);
            } catch (e) { }
        }
    }

    cleanUpAndBackToHub();
}

function confirmExitGame() {
    clearInterval(gameTimer);
    if (p1State.timerId) clearInterval(p1State.timerId);
    if (aiDuelTimer) clearTimeout(aiDuelTimer);

    if (gameMode === 'online') {
        leaveOnlineLobby(false);
    } else {
        switchView('view-hub');
    }
}

/* ==========================================================================
   13. 在线大厅、在线玩家卡片修复与房间1天过期清理
   ========================================================================== */
let globalLobbyChannel = null;
let myCreatedRooms = JSON.parse(localStorage.getItem('my_created_rooms') || '[]');
let discoveredLobbyRooms = [];
let selectedRoomCapacity = 2;
let customRoomName = '';
let matchInviteTimer = null;
let currentIncomingInvite = null;

const CLIENT_SESSION_ID = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
const recentlySwitchedAccounts = new Set();

function recordSwitchedAccount(username) {
    if (!username) return;
    recentlySwitchedAccounts.add(username);
    setTimeout(() => {
        recentlySwitchedAccounts.delete(username);
    }, 120000);
}
window.recordSwitchedAccount = recordSwitchedAccount;

function initGlobalPresence() {
    if (!currentUser || !sbClient) return;

    // 如果 channel 存在但 key 不属于当前用户，先彻底清理
    if (globalLobbyChannel) {
        if (globalLobbyChannel.params && globalLobbyChannel.params.config && globalLobbyChannel.params.config.presence && globalLobbyChannel.params.config.presence.key !== currentUser) {
            try {
                globalLobbyChannel.untrack();
                sbClient.removeChannel(globalLobbyChannel);
            } catch (e) { }
            globalLobbyChannel = null;
        } else {
            globalLobbyChannel.track({
                username: currentUser,
                sessionId: CLIENT_SESSION_ID,
                avatar: (typeof getUserAvatar === 'function' ? getUserAvatar(currentUser) : ''),
                status: 'idle',
                joinedAt: Date.now()
            });
            return;
        }
    }

    globalLobbyChannel = sbClient.channel('global_lobby', {
        config: { presence: { key: currentUser } }
    });

    globalLobbyChannel
        .on('presence', { event: 'sync' }, () => {
            syncGlobalPresenceState();
            fetchOnlineRoomsList();
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            if (Array.isArray(leftPresences)) {
                leftPresences.forEach(p => {
                    const leftUser = p.key;
                    discoveredLobbyRooms = discoveredLobbyRooms.filter(r => r.host !== leftUser);
                    sbClient.from('rooms').update({ status: 'closed', player_count: 0 }).eq('host', leftUser).eq('is_temporary', false).then(() => { }).catch(() => { });
                    sbClient.from('rooms').delete().eq('host', leftUser).eq('is_temporary', true).then(() => { }).catch(() => { });
                });
            }
            syncGlobalPresenceState();
            fetchOnlineRoomsList();
        })
        .on('broadcast', { event: 'invite_match' }, ({ payload }) => {
            handleReceivedMatchInvite(payload);
        })
        .on('broadcast', { event: 'invite_response' }, ({ payload }) => {
            handleMatchInviteResponse(payload);
        })
        .on('broadcast', { event: 'room_state_change' }, ({ payload }) => {
            handleRoomStateBroadcast(payload);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await globalLobbyChannel.track({
                    username: currentUser,
                    sessionId: CLIENT_SESSION_ID,
                    avatar: (typeof getUserAvatar === 'function' ? getUserAvatar(currentUser) : ''),
                    status: 'idle',
                    joinedAt: Date.now()
                });
                fetchOnlineRoomsList();
            }
        });
}

// 修复：在线玩家过滤掉自己、当前客户端会话及近期切换账号，并支持头像加载
function syncGlobalPresenceState() {
    if (!globalLobbyChannel) return;
    const state = globalLobbyChannel.presenceState();
    const onlineUsers = [];

    Object.keys(state).forEach(k => {
        const presList = state[k] || [];
        const pres = presList[0] || {};
        const pUsername = pres.username || k;

        // 1. 过滤当前用户名
        if (k === currentUser || pUsername === currentUser) return;
        // 2. 过滤当前浏览器会话的 presence（防止切换账号时旧 session 未过期）
        if (pres.sessionId && pres.sessionId === CLIENT_SESSION_ID) return;
        // 3. 过滤刚刚切换过的旧账号
        if (recentlySwitchedAccounts.has(k) || recentlySwitchedAccounts.has(pUsername)) return;

        let avatar = pres.avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(pUsername) : '');
        if (avatar && avatar.startsWith('//')) avatar = 'https:' + avatar;

        onlineUsers.push({
            username: pUsername,
            avatar: avatar,
            status: pres.status || 'idle',
            joinedAt: pres.joinedAt || Date.now()
        });
    });

    const cardsHtml = onlineUsers.length === 0 ? `
                <div style="text-align:center; padding:24px 10px; color:var(--md-sys-color-outline); width:100%; grid-column:1/-1;">
                    <p style="margin-top:6px; font-size:0.88rem;">当前暂无其他在线玩家</p>
                </div>
            ` : onlineUsers.map(u => `
            <div class="online-player-card">
                <div class="online-player-left">
                    <div class="online-player-avatar" style="position:relative; width:36px; height:36px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--md-sys-color-surface-container);">
                        <span class="material-symbols-rounded" style="font-size:22px; color:var(--md-sys-color-primary);">person</span>
                        ${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';" style="position:absolute; width:100%; height:100%; object-fit:cover; border-radius:50%;">` : ''}
                    </div>
                    <div class="online-player-meta">
                        <span class="online-player-name" title="${escapeHtml(u.username)}">${escapeHtml(u.username)}</span>
                        <span class="online-player-status">
                            <span class="online-status-dot"></span>
                            在线空闲
                        </span>
                    </div>
                </div>
                <button type="button" class="btn btn-filled btn-sm online-player-action-btn" onclick="openCreateMatchInviteModal('${escapeHtml(u.username)}')">
                    <span class="material-symbols-rounded" style="font-size:16px;">swords</span>
                    <span class="btn-label-text">发起对战</span>
                </button>
            </div>
            `).join('');

    const targetSlots = [
        { list: document.getElementById('hub-online-players-list'), badge: document.getElementById('hub-online-players-count') },
        { list: document.getElementById('online-lobby-players-list'), badge: document.getElementById('online-lobby-players-count') }
    ];

    targetSlots.forEach(slot => {
        if (slot.badge) slot.badge.innerText = `${onlineUsers.length} 人在线`;
        if (slot.list) slot.list.innerHTML = cardsHtml;
    });
}

function syncGlobalPresence() {
    if (globalLobbyChannel) {
        syncGlobalPresenceState();
        showToast('已刷新在线玩家列表');
    } else {
        initGlobalPresence();
    }
}

function openCreateMatchInviteModal(targetUser) {
    if (!targetUser || targetUser === currentUser) return;
    if (!globalLobbyChannel) {
        showToast('正在连接大厅服务器...');
        initGlobalPresence();
        return;
    }
    activeInviteTarget = targetUser;

    const modal = document.getElementById('modal-create-match-invite');
    const targetNameEl = document.getElementById('create-invite-target-name');
    const targetAvatarImg = document.getElementById('create-invite-target-avatar-img');
    const targetAvatarIcon = document.getElementById('create-invite-target-avatar-icon');
    const presetView = document.getElementById('create-invite-preset-view');
    const rulesEditor = document.getElementById('create-invite-rules-editor');
    const roomNameField = document.getElementById('create-invite-room-name-field');
    const roomNameInput = document.getElementById('create-invite-room-name');

    if (targetNameEl) targetNameEl.innerText = targetUser;
    let oppoAvatar = getUserAvatar(targetUser);
    if (oppoAvatar && oppoAvatar.startsWith('//')) oppoAvatar = 'https:' + oppoAvatar;
    if (oppoAvatar && targetAvatarImg && targetAvatarIcon) {
        targetAvatarImg.src = oppoAvatar;
        targetAvatarImg.style.display = 'block';
        targetAvatarIcon.style.display = 'none';
    } else if (targetAvatarImg && targetAvatarIcon) {
        targetAvatarImg.style.display = 'none';
        targetAvatarIcon.style.display = 'inline-flex';
    }

    const isLogged = isCurrentUserLoggedIn();
    if (isLogged) {
        // 使用专属房间预设
        const preset = getUserExclusivePreset();
        activeInviteRules = JSON.parse(JSON.stringify(preset));

        if (presetView) {
            presetView.style.display = 'block';
            const presetNameEl = document.getElementById('create-invite-preset-name');
            const presetSummaryEl = document.getElementById('create-invite-preset-summary');
            if (presetNameEl) presetNameEl.innerText = `专属房间预设：《${activeInviteRules.name || currentUser + '的房间'}》`;
            if (presetSummaryEl) {
                const gaugeName = activeInviteRules.gaugeStyle === 'snake' ? '盘龙' : '拔河';
                const bookSummary = getBookNamesSummary(activeInviteRules.selectedBooks);
                presetSummaryEl.innerText = `限时: ${Math.round((activeInviteRules.duration || 60) / 60)} 分钟 | 胜出: 领先 ${activeInviteRules.winLead || 6} 题 | 仪表盘: ${gaugeName} | 词书: ${bookSummary}`;
            }
        }
        if (rulesEditor) rulesEditor.style.display = 'none';
        const toggleBtnText = document.getElementById('text-toggle-invite-rules');
        const toggleBtnIcon = document.getElementById('icon-toggle-invite-rules');
        if (toggleBtnText) toggleBtnText.innerText = '修改规则';
        if (toggleBtnIcon) toggleBtnIcon.innerText = 'edit';
    } else {
        // 游客模式：直接显示规则编辑
        activeInviteRules = getDefaultRoomPreset(currentUser);
        activeInviteRules.name = `${currentUser}的挑战房`;
        if (presetView) presetView.style.display = 'none';
        if (rulesEditor) rulesEditor.style.display = 'flex';
        if (roomNameField) roomNameField.style.display = 'block';
        if (roomNameInput) roomNameInput.value = activeInviteRules.name;
    }

    renderInviteRuleChips();
    updateInviteBookSummaryUI();

    if (modal) modal.classList.add('active');
}

function closeCreateMatchInviteModal() {
    const modal = document.getElementById('modal-create-match-invite');
    if (modal) modal.classList.remove('active');
    activeInviteTarget = null;
    activeInviteRules = null;
}

function toggleEditInviteRules() {
    const rulesEditor = document.getElementById('create-invite-rules-editor');
    const toggleBtnText = document.getElementById('text-toggle-invite-rules');
    const toggleBtnIcon = document.getElementById('icon-toggle-invite-rules');
    if (!rulesEditor) return;
    const isHidden = rulesEditor.style.display === 'none' || !rulesEditor.style.display;
    rulesEditor.style.display = isHidden ? 'flex' : 'none';
    if (toggleBtnText) toggleBtnText.innerText = isHidden ? '收起规则' : '修改规则';
    if (toggleBtnIcon) toggleBtnIcon.innerText = isHidden ? 'expand_less' : 'edit';
    if (isHidden) {
        const roomNameInput = document.getElementById('create-invite-room-name');
        if (roomNameInput) roomNameInput.value = activeInviteRules.name || `${currentUser}的房间`;
        renderInviteRuleChips();
        updateInviteBookSummaryUI();
    }
}

function renderInviteRuleChips() {
    if (!activeInviteRules) return;
    document.querySelectorAll('#invite-chips-time .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-time'));
        el.classList.toggle('selected', val === (activeInviteRules.duration || 60));
    });

    document.querySelectorAll('#invite-chips-lead .md3-chip').forEach(el => {
        const val = parseInt(el.getAttribute('data-lead'));
        el.classList.toggle('selected', val === (activeInviteRules.winLead || 6));
    });

    document.querySelectorAll('#invite-chips-gauge .md3-chip').forEach(el => {
        const val = el.getAttribute('data-gauge');
        el.classList.toggle('selected', val === (activeInviteRules.gaugeStyle || 'tug'));
    });
}

function selectInviteRuleTime(val) {
    if (!activeInviteRules) return;
    activeInviteRules.duration = parseInt(val);
    renderInviteRuleChips();
}

function selectInviteRuleLead(val) {
    if (!activeInviteRules) return;
    activeInviteRules.winLead = parseInt(val);
    renderInviteRuleChips();
}

function selectInviteRuleGauge(val) {
    if (!activeInviteRules) return;
    activeInviteRules.gaugeStyle = val;
    renderInviteRuleChips();
}

function updateInviteBookSummaryUI() {
    if (!activeInviteRules) return;
    const books = activeInviteRules.selectedBooks || [];
    const titleEl = document.getElementById('invite-selected-book-title');
    const summaryEl = document.getElementById('invite-selected-book-summary');
    if (titleEl) titleEl.innerText = getBookNamesSummary(books);
    if (summaryEl) summaryEl.innerText = `已选 ${books.length} 本词书`;
}

async function confirmAndSendMatchInvite() {
    if (!activeInviteTarget || !globalLobbyChannel) return;

    const roomNameInput = document.getElementById('create-invite-room-name');
    const customName = (roomNameInput ? roomNameInput.value : '').trim();
    if (customName) activeInviteRules.name = customName;

    const isLogged = isCurrentUserLoggedIn();
    let finalRoomCode = '';
    let isTemp = false;

    if (isLogged) {
        finalRoomCode = getUserRoomCode(currentUser);
        isTemp = false;
    } else {
        finalRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        isTemp = true;
    }

    const finalRoomName = activeInviteRules.name || (isLogged ? `${currentUser}的专属房间` : `${currentUser}的挑战房`);
    const matchConfig = {
        name: finalRoomName,
        capacity: 2,
        duration: activeInviteRules.duration || 60,
        winLead: activeInviteRules.winLead || 6,
        gaugeStyle: activeInviteRules.gaugeStyle || 'tug',
        selectedBooks: activeInviteRules.selectedBooks || ['GaoKao3500']
    };

    // 保存到 Supabase 房间表
    try {
        await sbClient.from('rooms').upsert({
            code: finalRoomCode,
            name: finalRoomName,
            host: currentUser,
            capacity: 2,
            player_count: 1,
            status: 'waiting',
            is_temporary: isTemp,
            config: matchConfig,
            updated_at: new Date().toISOString()
        }, { onConflict: 'code' });
    } catch (e) { }

    globalLobbyChannel.send({
        type: 'broadcast',
        event: 'invite_match',
        payload: {
            from: currentUser,
            fromAvatar: getUserAvatar(currentUser),
            to: activeInviteTarget,
            roomCode: finalRoomCode,
            roomName: finalRoomName,
            config: matchConfig,
            bookNames: getBookNamesSummary(matchConfig.selectedBooks)
        }
    });

    const target = activeInviteTarget;
    closeCreateMatchInviteModal();
    showToast(`已向【${target}】发起对战邀请，等待对方接受...`);
}

function handleReceivedMatchInvite(payload) {
    if (!payload || payload.to !== currentUser) return;
    currentIncomingInvite = payload;

    const modal = document.getElementById('modal-match-invite');
    const fromEl = document.getElementById('invite-from-name');
    const roomEl = document.getElementById('invite-room-name-display');
    const timeEl = document.getElementById('invite-rule-time');
    const leadEl = document.getElementById('invite-rule-lead');
    const gaugeEl = document.getElementById('invite-rule-gauge');
    const bookEl = document.getElementById('invite-rule-book');
    const countdownEl = document.getElementById('invite-countdown');
    const avatarImg = document.getElementById('invite-from-avatar-img');
    const avatarIcon = document.getElementById('invite-from-avatar-icon');
    if (!modal) return;

    if (fromEl) fromEl.innerText = `${payload.from} 向你发起对决邀请！`;
    if (roomEl) roomEl.innerText = payload.roomName || '对决房间';

    const cfg = payload.config || {};
    if (timeEl) timeEl.innerText = `${Math.round((cfg.duration || 60) / 60)} 分钟`;
    if (leadEl) leadEl.innerText = `领先 ${cfg.winLead || 6} 题`;
    if (gaugeEl) gaugeEl.innerText = cfg.gaugeStyle === 'snake' ? '盘龙' : '拔河';
    if (bookEl) bookEl.innerText = payload.bookNames || getBookNamesSummary(cfg.selectedBooks);

    let avatarUrl = payload.fromAvatar || (payload.from ? getUserAvatar(payload.from) : '');
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
    if (avatarUrl && avatarImg && avatarIcon) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
        avatarIcon.style.display = 'none';
    } else if (avatarImg && avatarIcon) {
        avatarImg.style.display = 'none';
        avatarIcon.style.display = 'inline-flex';
    }

    let countdown = 15;
    if (countdownEl) countdownEl.innerText = countdown;

    if (matchInviteTimer) clearInterval(matchInviteTimer);
    matchInviteTimer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.innerText = countdown;
        if (countdown <= 0) {
            declineMatchInvite(true);
        }
    }, 1000);

    modal.classList.add('active');
}

function acceptMatchInvite() {
    if (!currentIncomingInvite) return;
    if (matchInviteTimer) clearInterval(matchInviteTimer);
    const modal = document.getElementById('modal-match-invite');
    if (modal) modal.classList.remove('active');

    const invite = currentIncomingInvite;
    currentIncomingInvite = null;

    if (globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'invite_response',
            payload: {
                from: currentUser,
                fromAvatar: getUserAvatar(currentUser),
                to: invite.from,
                accepted: true,
                roomCode: invite.roomCode,
                roomName: invite.roomName,
                config: invite.config
            }
        });
    }

    isHost = false;
    roomCode = invite.roomCode;
    hostName = invite.from;
    hostAvatar = invite.fromAvatar || (invite.from ? getUserAvatar(invite.from) : '');
    guestName = currentUser;
    guestAvatar = getUserAvatar(currentUser);
    customRoomName = invite.roomName;
    if (invite.config) roomConfig = invite.config;

    setupRoomLobbyUI(roomCode, invite.roomName);
    connectSupabaseChannel(roomCode);
    switchView('view-online');
    showToast(`已接受对战邀请，正在进入房间...`);
}

function declineMatchInvite(isTimeout = false) {
    if (matchInviteTimer) clearInterval(matchInviteTimer);
    const modal = document.getElementById('modal-match-invite');
    if (modal) modal.classList.remove('active');

    if (currentIncomingInvite && globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'invite_response',
            payload: {
                from: currentUser,
                to: currentIncomingInvite.from,
                accepted: false,
                isTimeout: isTimeout
            }
        });
    }
    currentIncomingInvite = null;
    if (isTimeout) showToast('对战邀请已超时关闭');
    else showToast('已拒绝该对战邀请');
}

function handleMatchInviteResponse(payload) {
    if (!payload || payload.to !== currentUser) return;
    if (payload.accepted) {
        showToast(`玩家【${payload.from}】接受了对战邀请！正在进入房间...`);
        isHost = true;
        roomCode = payload.roomCode;
        hostName = currentUser;
        hostAvatar = getUserAvatar(currentUser);
        guestName = payload.from;
        guestAvatar = payload.fromAvatar || (payload.from ? getUserAvatar(payload.from) : '');
        customRoomName = payload.roomName;
        if (payload.config) roomConfig = payload.config;

        setupRoomLobbyUI(roomCode, payload.roomName);
        connectSupabaseChannel(roomCode);
        switchView('view-online');
    } else {
        showToast(`玩家【${payload.from}】${payload.isTimeout ? '超时未应答' : '谢绝了对战邀请'}`);
        if (payload.roomCode && payload.roomCode !== getUserRoomCode(currentUser)) {
            sbClient.from('rooms').delete().eq('code', payload.roomCode).then(() => {}).catch(() => {});
        }
    }
}

async function handleHostDeleteRoom(targetCode) {
    const codeToDelete = targetCode || roomCode;
    if (!codeToDelete) return;

    const isLogged = isCurrentUserLoggedIn();
    const myExclusiveCode = isLogged ? getUserRoomCode(currentUser) : null;
    if (isLogged && codeToDelete === myExclusiveCode) {
        showToast('专属房间无法删除，若要离开请直接点击“退出房间”');
        return;
    }

    if (!confirm(`确定解散并删除房间 ${codeToDelete} 吗？`)) return;

    if (roomCode === codeToDelete) {
        if (realtimeChannel) {
            realtimeChannel.send({
                type: 'broadcast',
                event: 'room_disbanded',
                payload: { code: codeToDelete, message: '房主已解散并删除该房间' }
            });
            realtimeChannel.unsubscribe();
            realtimeChannel = null;
        }
        roomCode = null;
        isHost = false;
        hostName = '';
        guestName = '';
        document.getElementById('online-pre-join').style.display = 'flex';
        document.getElementById('online-in-room').style.display = 'none';
    }

    if (globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'room_state_change',
            payload: { action: 'delete', code: codeToDelete }
        });
    }

    try {
        await sbClient.from('rooms').delete().eq('code', codeToDelete);
    } catch (e) { }

    fetchOnlineRoomsList();
    showToast('房间已解散并删除');
}

function handleRoomStateBroadcast(payload) {
    if (!payload) return;
    if ((payload.action === 'ready' || payload.action === 'create') && payload.room) {
        const room = payload.room;
        const idx = discoveredLobbyRooms.findIndex(r => r.code === room.code);
        if (idx >= 0) {
            discoveredLobbyRooms[idx] = { ...discoveredLobbyRooms[idx], ...room, status: 'waiting' };
        } else {
            discoveredLobbyRooms.unshift({ ...room, status: 'waiting' });
        }
    } else if ((payload.action === 'hide' || payload.action === 'delete') && payload.code) {
        discoveredLobbyRooms = discoveredLobbyRooms.filter(r => r.code !== payload.code);
    }
    fetchOnlineRoomsList();
}

async function fetchOnlineRoomsList(manual = false) {
    const container = document.getElementById('online-rooms-container');
    if (!container) return;

    // 1. 获取大厅当前在线用户
    const presenceState = globalLobbyChannel ? globalLobbyChannel.presenceState() : {};
    const onlineUserSet = new Set(Object.keys(presenceState));
    if (currentUser) onlineUserSet.add(currentUser);

    // 2. 带防抖与缓存获取云端房间列表 (防止高并发击垮 Supabase)
    const now = Date.now();
    let dbRooms = cachedDbRooms;
    if (manual || (now - cachedDbRoomsTime > 4000) || !dbRooms || dbRooms.length === 0) {
        try {
            const { data, error } = await sbClient
                .from('rooms')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(40);
            if (!error && Array.isArray(data)) {
                cachedDbRooms = data;
                cachedDbRoomsTime = now;
                dbRooms = data;
            }
        } catch (e) { }
    }

    const roomMap = new Map();
    (dbRooms || []).forEach(r => {
        roomMap.set(r.code, {
            code: r.code,
            name: r.name || `${r.host}的房间`,
            host: r.host,
            capacity: r.capacity || 2,
            playerCount: r.player_count || 1,
            status: r.status || 'closed',
            is_temporary: r.is_temporary || false,
            config: r.config || {},
            createdAt: new Date(r.created_at || r.updated_at || Date.now()).getTime()
        });
    });

    discoveredLobbyRooms.forEach(r => {
        if (r.status === 'waiting') {
            roomMap.set(r.code, { ...roomMap.get(r.code), ...r });
        }
    });

    const isLogged = isCurrentUserLoggedIn();
    const myCode = isLogged ? getUserRoomCode(currentUser) : null;
    const isCurrentlyInMyRoom = (isHost && roomCode === myCode && document.getElementById('online-in-room')?.style.display !== 'none');

    const resultRooms = [];

    // 核心要求：在线房间列表中，将自己的房间放在第一个，可以编辑房间预设。
    if (isLogged) {
        const myPreset = getUserExclusivePreset();
        const myRoom = {
            code: myCode,
            name: myPreset.name || `${currentUser}的房间`,
            host: currentUser,
            capacity: 2,
            playerCount: isCurrentlyInMyRoom ? (guestName ? 2 : 1) : 0,
            status: isCurrentlyInMyRoom ? 'waiting' : 'closed',
            isMine: true,
            isExclusive: true,
            config: myPreset
        };
        resultRooms.push(myRoom);
    }

    // 其他在线房间：房主必须在线，且状态为 waiting，且不是自己的专属房间
    roomMap.forEach(r => {
        if (isLogged && r.code === myCode) return;
        if (r.host === currentUser) return;
        const isHostOnline = onlineUserSet.has(r.host);
        if (isHostOnline && r.status === 'waiting') {
            resultRooms.push(r);
        }
    });

    if (resultRooms.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:28px 12px; color:var(--md-sys-color-outline); width:100%; grid-column:1/-1;">
                <span class="material-symbols-rounded" style="font-size:40px; opacity:0.6;">meeting_room</span>
                <p style="margin-top:8px; font-size:0.9rem;">暂无在线房间</p>
            </div>
        `;
        if (manual) showToast('已刷新房间列表');
        return;
    }

    container.innerHTML = resultRooms.map((r) => {
        const isMine = r.isMine || (r.host === currentUser);
        const isFull = (r.playerCount || 1) >= (r.capacity || 2);
        const isHostInRoom = isMine ? isCurrentlyInMyRoom : (r.status === 'waiting');

        const cfg = r.config || {};
        const durationText = cfg.duration ? `${Math.round(cfg.duration / 60)}分钟` : '1分钟';
        const winLeadText = cfg.winLead ? `领先${cfg.winLead}题` : '领先6题';
        const gaugeText = cfg.gaugeStyle === 'snake' ? '盘龙' : '拔河';
        const bookText = getBookNamesSummary(cfg.selectedBooks || ['GaoKao3500']);

        return `
            <div class="online-room-card ${isMine ? 'my-exclusive-room-card' : ''}" style="${isMine ? 'border: 2px solid var(--md-sys-color-primary); background: var(--md-sys-color-surface-container-low);' : ''}">
                <div class="online-room-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:6px; max-width:180px; overflow:hidden;">
                        ${isMine ? `<span class="material-symbols-rounded" style="color:var(--md-sys-color-primary); font-size:18px;">star</span>` : ''}
                        <div style="font-weight:700; font-size:0.96rem; color:var(--md-sys-color-on-surface); text-overflow:ellipsis; white-space:nowrap; overflow:hidden;" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</div>
                    </div>
                    <span class="badge ${isMine ? (isHostInRoom ? 'badge-online' : '') : (isFull ? 'badge-p1' : 'badge-online')}" 
                          style="font-size:0.75rem; ${isMine && !isHostInRoom ? 'background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline);' : ''}">
                        ${isMine ? (isHostInRoom ? '我在房内' : '我的房间') : (isFull ? '已满员' : `${r.playerCount} / ${r.capacity || 2} 人`)}
                    </span>
                </div>
                <div class="online-room-body" style="display:flex; flex-direction:column; gap:4px; font-size:0.82rem; color:var(--md-sys-color-on-surface-variant); margin: 6px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="display:flex; align-items:center; gap:4px;">
                            <span class="material-symbols-rounded" style="font-size:15px; color:var(--md-sys-color-primary);">badge</span>
                            <span>房主：<strong>${escapeHtml(r.host)}</strong></span>
                        </span>
                        <span style="color:var(--md-sys-color-outline); font-size:0.78rem;">${durationText} · ${winLeadText} · ${gaugeText}</span>
                    </div>
                    <div style="font-size:0.78rem; color:var(--md-sys-color-outline); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        词书：${escapeHtml(bookText)}
                    </div>
                </div>
                <div class="online-room-actions" style="display:flex; gap:8px; margin-top:4px;">
                    ${isMine ? `
                        <button type="button" class="btn btn-filled btn-sm" style="flex:2;" onclick="enterMyExclusiveRoom()">
                            <span class="material-symbols-rounded" style="font-size:16px;">meeting_room</span>
                            <span>${isHostInRoom ? '返回房间' : '进入房间'}</span>
                        </button>
                        <button type="button" class="btn btn-outlined btn-sm" style="flex:1;" onclick="openRoomPresetModal()" title="编辑房间预设">
                            <span class="material-symbols-rounded" style="font-size:16px;">tune</span>
                            <span>编辑预设</span>
                        </button>
                    ` : `
                        <button type="button" class="btn btn-filled btn-sm" style="flex:1;" ${isFull ? 'disabled' : ''} onclick="quickJoinLobbyRoom('${r.code}')">
                            <span class="material-symbols-rounded" style="font-size:16px;">login</span>
                            <span>${isFull ? '房间已满' : '加入对战'}</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    if (manual) showToast('已刷新房间列表');
}

function quickJoinLobbyRoom(code) {
    const codeInput = document.getElementById('join-room-code');
    if (codeInput) codeInput.value = code;
    joinOnlineRoom();
}

function checkFirstOpenWelcome() {
    const lastSeen = localStorage.getItem('vocab_last_seen_version');
    if (lastSeen !== APP_VERSION) {
        const currentLog = APP_CHANGELOG.find(c => c.version === `v${APP_VERSION}`) || APP_CHANGELOG[0];
        if (currentLog && typeof showVersionUpdateCard === 'function') {
            const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            showVersionUpdateCard({
                version: APP_VERSION,
                releaseDate: currentLog.date || '近期',
                changelog: currentLog.items || []
            }, isLocal);
        }
        localStorage.setItem('vocab_last_seen_version', APP_VERSION);
    }
}

function closeWelcomeUpdateModal() {
    const modal = document.getElementById('modal-welcome-update');
    if (modal) modal.classList.remove('active');
    localStorage.setItem('vocab_last_seen_version', APP_VERSION);
}

window.addEventListener('beforeunload', () => {
    if (isHost && roomCode) {
        // 1. 立即向房间内的对手发送强制踢人广播
        if (realtimeChannel) {
            try {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'host_closed_and_kick',
                    payload: { roomCode: roomCode }
                });
            } catch (e) { }
        }

        // 2. 广播通知大厅其他人隐藏该房间
        if (globalLobbyChannel) {
            try {
                globalLobbyChannel.send({
                    type: 'broadcast',
                    event: 'room_state_change',
                    payload: { action: 'hide', code: roomCode }
                });
            } catch (e) { }
        }

        // 3. 将云端数据库房间状态设为 'closed'（关闭）；如果是临时房间则直接删除
        const isLogged = isCurrentUserLoggedIn();
        const myExclusiveCode = isLogged ? getUserRoomCode(currentUser) : null;
        const isTemp = (roomCode !== myExclusiveCode);
        const updateUrl = `${SUPABASE_URL}/rest/v1/rooms?code=eq.${roomCode}`;
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
        try {
            fetch(updateUrl, {
                method: isTemp ? 'DELETE' : 'PATCH',
                headers: headers,
                body: isTemp ? null : JSON.stringify({ status: 'closed', player_count: 0 }),
                keepalive: true // 保证网页关闭后请求依然能发出
            });
        } catch (e) { }
    }
});



