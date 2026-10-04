/**
 * 全局状态与用户数据持久化
 * Module: assets/js/core/state.js
 */

let allUsersList = [];
try {
    allUsersList = JSON.parse(SafeStorage.getItem('vocab_users_list') || '[]');
} catch (e) {
    allUsersList = [];
}

// 获取或生成专属的游客名称（如：游客_7214），多层持久化确保苹果设备不丢编号与数据
function getUniqueGuestName() {
    let guestId = SafeStorage.getItem('vocab_guest_name');
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        const pkUser = SafeStorage.getItem('vocab_pk_user');
        if (pkUser && /^游客_\d{4,}$/.test(pkUser)) guestId = pkUser;
    }
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        if (typeof getCookie === 'function') {
            const cId = getCookie('vocab_guest_name') || getCookie('vocab_pk_user');
            if (cId && /^游客_\d{4,}$/.test(cId)) guestId = cId;
        }
    }
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        if (typeof window !== 'undefined' && window.__cachedToyGuestId && /^游客_\d{4,}$/.test(window.__cachedToyGuestId)) {
            guestId = window.__cachedToyGuestId;
        }
    }
    // 检查历史用户列表是否有已保存的游客
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        if (Array.isArray(allUsersList)) {
            const foundInList = allUsersList.find(u => typeof u === 'string' && /^游客_\d{4,}$/.test(u));
            if (foundInList) guestId = foundInList;
        }
    }
    // 检查本地存储中是否存在带统计记录的游客key
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                for (let i = 0; i < window.localStorage.length; i++) {
                    const k = window.localStorage.key(i);
                    if (k && k.startsWith('vocab_stats_游客_')) {
                        const candidate = k.replace('vocab_stats_', '');
                        if (/^游客_\d{4,}$/.test(candidate)) {
                            guestId = candidate;
                            break;
                        }
                    }
                }
            }
        } catch (e) { }
    }
    if (!guestId || !/^游客_\d{4,}$/.test(guestId)) {
        guestId = '游客_' + Math.floor(1000 + Math.random() * 9000);
    }
    SafeStorage.setItem('vocab_guest_name', guestId);
    const existingPk = SafeStorage.getItem('vocab_pk_user');
    if (!existingPk || existingPk.startsWith('游客')) {
        SafeStorage.setItem('vocab_pk_user', guestId);
    }
    if (typeof setCookie === 'function') {
        setCookie('vocab_guest_name', guestId, 365);
        if (!existingPk || existingPk.startsWith('游客')) {
            setCookie('vocab_pk_user', guestId, 365);
        }
    }
    if (typeof window !== 'undefined' && window.toy && typeof window.toy.setCloudStorage === 'function' && (window.self !== window.top || (typeof isBilibiliToy !== 'undefined' && isBilibiliToy))) {
        try {
            const p = window.toy.setCloudStorage({ 'guest_id': guestId });
            if (p && typeof p.catch === 'function') p.catch(() => { });
        } catch (e) { }
    }
    return guestId;
}

const defaultGuestName = getUniqueGuestName();

let currentUserProfile = {
    isLoggedIn: false,
    type: 'guest', // 'guest' | 'cloud' | 'bilibili'
    username: defaultGuestName,
    avatar: '',
    openId: ''
};

function refreshCurrentUserProfileFromStorage() {
    const isExplicitLoggedOut = SafeStorage.getItem('vocab_user_logged_out') === 'true';
    if (isExplicitLoggedOut) {
        // 用户明确点击了退出登录，不自动从 session、device_accounts 或历史缓存中还原已登录账号
        const guestId = SafeStorage.getItem('vocab_guest_name') || SafeStorage.getItem('vocab_pk_user') || getUniqueGuestName();
        currentUser = guestId;
        currentUserProfile = {
            isLoggedIn: false,
            type: 'guest',
            username: guestId,
            avatar: '',
            openId: ''
        };
        window.currentUser = currentUser;
        window.currentUserProfile = currentUserProfile;
        return false;
    }

    try {
        const savedSession = SafeStorage.getItem('vocab_auth_session');
        if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed && parsed.isLoggedIn && parsed.username) {
                currentUserProfile = { ...currentUserProfile, ...parsed };
                currentUser = currentUserProfile.username;
                window.currentUser = currentUser;
                window.currentUserProfile = currentUserProfile;
                return true;
            }
        }
    } catch (e) { }

    const pkUser = SafeStorage.getItem('vocab_pk_user');
    if (pkUser && !pkUser.startsWith('游客')) {
        currentUser = pkUser;
        currentUserProfile.username = pkUser;
        currentUserProfile.isLoggedIn = true;
        currentUserProfile.type = 'cloud';
        window.currentUser = currentUser;
        window.currentUserProfile = currentUserProfile;
        return true;
    }

    // 检查是否有保存的设备登录账号 (防止 session 单项丢失或独立容器还原时登录态丢失)
    try {
        const rawAccounts = SafeStorage.getItem('vocab_device_accounts');
        if (rawAccounts) {
            const list = JSON.parse(rawAccounts);
            if (Array.isArray(list) && list.length > 0) {
                const latestAcc = list.find(a => a && a.username && !a.username.startsWith('游客'));
                if (latestAcc) {
                    currentUser = latestAcc.username;
                    currentUserProfile = {
                        isLoggedIn: true,
                        type: latestAcc.type || 'cloud',
                        username: latestAcc.username,
                        avatar: latestAcc.avatar || '',
                        openId: latestAcc.openId || ''
                    };
                    window.currentUser = currentUser;
                    window.currentUserProfile = currentUserProfile;
                    SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
                    return true;
                }
            }
        }
    } catch (e) { }

    const guestId = SafeStorage.getItem('vocab_guest_name') || SafeStorage.getItem('vocab_pk_user');
    if (guestId) {
        currentUser = guestId;
        currentUserProfile.username = guestId;
        window.currentUser = currentUser;
        window.currentUserProfile = currentUserProfile;
    }
    return false;
}
window.refreshCurrentUserProfileFromStorage = refreshCurrentUserProfileFromStorage;

try {
    refreshCurrentUserProfileFromStorage();
} catch (e) { }

let currentUser = currentUserProfile.username || defaultGuestName;
let userStats = { total: 0, correct: 0, mistakes: {} };
let dictionary = [];

let gameMode = 'single';
let realtimeChannel = null;
let roomCode = null;
let isHost = false;
let hostName = '';
let guestName = '';
let hostAvatar = '';
let guestAvatar = '';

let roomConfig = {
    duration: 60,
    winLead: 6,
    gaugeStyle: 'tug',
    selectedBooks: ['GaoKao3500']
};

let p1State = { score: 0, total: 0, pool: [], currentIdx: 0, frozen: false, answeringLock: false, timerId: null };
let p2State = { score: 0, total: 0 };
let timeLeft = 60;
let gameTimer = null;
let gameResult = null;

const savedSingleBooks = SafeStorage.getItem('single_vocab_books');
let singleSelectedBookIds = ['books/考纲/高考3500.json'];
if (savedSingleBooks) {
    try {
        const parsed = JSON.parse(savedSingleBooks);
        if (Array.isArray(parsed) && parsed.length > 0) singleSelectedBookIds = parsed;
        else singleSelectedBookIds = ['books/考纲/高考3500.json'];
    } catch (e) { }
}

let singleState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    answered: false,
    selectedIdx: -1,
    sessionName: '新词学习'
};

function getUserAvatar(username) {
    if (!username) return '';
    let avatar = '';
    // 如果是游客账号，游客不分配自定义上传头像，防止取到其他用户的头像
    if (username.startsWith('游客')) {
        if (currentUserProfile && currentUserProfile.username === username) {
            avatar = currentUserProfile.avatar || '';
        }
    } else if (currentUserProfile && currentUserProfile.username === username && currentUserProfile.avatar) {
        avatar = currentUserProfile.avatar;
    } else {
        try {
            avatar = SafeStorage.getItem(`vocab_user_avatar_${username}`) || '';
        } catch (e) {
            avatar = '';
        }
    }
    if (avatar && typeof avatar === 'string' && avatar.startsWith('//')) {
        avatar = 'https:' + avatar;
    }
    return avatar;
}

function loadUserData(username, profile = null) {
    const fallbackName = getUniqueGuestName();
    currentUser = (username || fallbackName).trim();
    if (currentUser === '游客') {
        currentUser = fallbackName;
    }

    if (profile) {
        currentUserProfile = { ...currentUserProfile, ...profile, username: currentUser };
        SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
        if (profile.avatar) {
            SafeStorage.setItem(`vocab_user_avatar_${currentUser}`, profile.avatar);
        }
    } else {
        if (currentUserProfile.username !== currentUser) {
            currentUserProfile = {
                isLoggedIn: false,
                type: 'guest',
                username: currentUser,
                avatar: getUserAvatar(currentUser)
            };
        }
    }

    SafeStorage.setItem('vocab_pk_user', currentUser);
    if (!allUsersList.includes(currentUser) && currentUser !== '游客') {
        allUsersList.push(currentUser);
        SafeStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    }

    try {
        let rawStats = SafeStorage.getItem(`vocab_stats_${currentUser}`);
        if (!rawStats && typeof getCookie === 'function') {
            rawStats = getCookie(`vocab_stats_${currentUser}`);
        }
        // 若当前游客无记录，尝试在本地恢复最近有数据的游客统计
        if (!rawStats && currentUser.startsWith('游客_')) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith('vocab_stats_游客_') && k !== `vocab_stats_${currentUser}`) {
                            const candidateStats = window.localStorage.getItem(k);
                            if (candidateStats && candidateStats.includes('"total"') && !candidateStats.includes('"total":0')) {
                                rawStats = candidateStats;
                                break;
                            }
                        }
                    }
                }
            } catch (e) { }
        }
        userStats = rawStats ? JSON.parse(rawStats) : { total: 0, correct: 0, mistakes: {} };
        if (!userStats.mistakes) userStats.mistakes = {};
    } catch (e) {
        userStats = { total: 0, correct: 0, mistakes: {} };
    }

    if (window.EbbinghausEngine) {
        window.EbbinghausEngine.checkOverduePenalties();
        window.EbbinghausEngine.updateDueBadge();
    }
    updateHubResumeButtons();

    // 如果为云端或B站已登录用户，主动从云端恢复与同步全量数据（包括艾宾浩斯待复习词数）
    if (currentUserProfile && currentUserProfile.isLoggedIn && typeof supabaseFetchUserData === 'function') {
        supabaseFetchUserData(currentUser).then(cloudUser => {
            if (cloudUser && typeof restoreUserDataFromCloud === 'function') {
                restoreUserDataFromCloud(cloudUser);
            }
        }).catch(() => { });
    }
}

function saveCurrentUserData(options = { immediate: false }) {
    if (!currentUser) return;
    const statsStr = JSON.stringify(userStats);
    SafeStorage.setItem(`vocab_stats_${currentUser}`, statsStr);
    if (currentUser.startsWith('游客_') && typeof setCookie === 'function') {
        setCookie(`vocab_stats_${currentUser}`, statsStr, 365);
    }

    // 本地优先：排队进入 SyncManager 进行批量异步同步，彻底废除逐题写库
    if (currentUserProfile && currentUserProfile.isLoggedIn) {
        if (currentUserProfile.type === 'cloud' || currentUserProfile.type === 'bilibili') {
            if (window.SyncManager) {
                window.SyncManager.enqueue('stats_update', {
                    timestamp: Date.now()
                }, !!options.immediate);
            } else if (typeof syncAllUserDataToCloud === 'function') {
                syncAllUserDataToCloud(currentUser, options);
            }
        }
    }
}

function recordUserMistake(username, word, meaning, phone) {
    if (!username || !word) return;
    const cleanWord = String(word).trim();
    const cleanMeaning = meaning || '';
    const cleanPhone = phone || '';
    const isChinese = !/[a-zA-Z]/.test(cleanWord);

    if (username === currentUser) {
        if (!userStats.mistakes) userStats.mistakes = {};
        if (!userStats.mistakes[cleanWord]) {
            userStats.mistakes[cleanWord] = { count: 0, meaning: cleanMeaning, phone: cleanPhone, isShiCi: isChinese };
        }
        userStats.mistakes[cleanWord].count++;
        if (cleanMeaning) userStats.mistakes[cleanWord].meaning = cleanMeaning;
        if (cleanPhone) userStats.mistakes[cleanWord].phone = cleanPhone;
        if (isChinese) userStats.mistakes[cleanWord].isShiCi = true;
        saveCurrentUserData();
        if (!isChinese && window.EbbinghausEngine) {
            window.EbbinghausEngine.recordWord(cleanWord, cleanMeaning, cleanPhone, false);
        }
    } else {
        try {
            const rawStats = localStorage.getItem(`vocab_stats_${username}`);
            const stats = rawStats ? JSON.parse(rawStats) : { total: 0, correct: 0, mistakes: {} };
            if (!stats.mistakes) stats.mistakes = {};
            if (!stats.mistakes[cleanWord]) {
                stats.mistakes[cleanWord] = { count: 0, meaning: cleanMeaning, phone: cleanPhone, isShiCi: isChinese };
            }
            stats.mistakes[cleanWord].count++;
            if (cleanMeaning) stats.mistakes[cleanWord].meaning = cleanMeaning;
            if (cleanPhone) stats.mistakes[cleanWord].phone = cleanPhone;
            if (isChinese) stats.mistakes[cleanWord].isShiCi = true;
            localStorage.setItem(`vocab_stats_${username}`, JSON.stringify(stats));

            if (!isChinese) {
                const rawEbb = localStorage.getItem(`vocab_ebbinghaus_db_${username}`);
                const ebb = rawEbb ? JSON.parse(rawEbb) : {};
                const key = cleanWord.toLowerCase();
                const record = ebb[key] || {
                    word: cleanWord,
                    meaning: cleanMeaning,
                    phone: cleanPhone,
                    stage: 0,
                    historyCount: 0
                };
                record.historyCount = (record.historyCount || 0) + 1;
                record.lastStudied = Date.now();
                if (cleanMeaning) record.meaning = cleanMeaning;
                if (cleanPhone) record.phone = cleanPhone;
                record.stage = 1;
                record.nextReview = Date.now() + 5 * 60 * 1000;
                ebb[key] = record;
                localStorage.setItem(`vocab_ebbinghaus_db_${username}`, JSON.stringify(ebb));
            }
        } catch (e) {
            console.error('Failed to record mistake for user', username, e);
        }
    }
}

function recordShiCiUserMistake(username, data) {
    if (!username || !data || !data.word) return;
    const cleanWord = String(data.word).trim();
    const targetUsername = username || currentUser;

    const updateRecord = (stats) => {
        if (!stats.mistakes) stats.mistakes = {};
        if (!stats.mistakes[cleanWord]) {
            stats.mistakes[cleanWord] = {
                count: 0,
                meaning: data.meaning || '',
                pinyin: data.pinyin || '',
                sentence: data.sentence || '',
                highlightedSentence: data.highlightedSentence || '',
                source: data.source || '',
                pos: data.pos || '',
                isShiCi: true
            };
        }
        const entry = stats.mistakes[cleanWord];
        entry.count = (entry.count || 0) + 1;
        entry.isShiCi = true;
        if (data.meaning) entry.meaning = data.meaning;
        if (data.pinyin) entry.pinyin = data.pinyin;
        if (data.sentence) entry.sentence = data.sentence;
        if (data.highlightedSentence) entry.highlightedSentence = data.highlightedSentence;
        if (data.source) entry.source = data.source;
        if (data.pos) entry.pos = data.pos;
    };

    if (targetUsername === currentUser) {
        updateRecord(userStats);
        saveCurrentUserData();
    } else {
        try {
            const raw = localStorage.getItem(`vocab_stats_${targetUsername}`);
            const stats = raw ? JSON.parse(raw) : { total: 0, correct: 0, mistakes: {} };
            updateRecord(stats);
            localStorage.setItem(`vocab_stats_${targetUsername}`, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to record shici mistake for', targetUsername, e);
        }
    }
}

let appConfirmResolve = null;

function showConfirmModal({
    title = '确认操作',
    message = '确认继续此操作吗？',
    confirmText = '确认',
    cancelText = '取消',
    isDanger = false,
    icon = 'check'
} = {}) {
    return new Promise(resolve => {
        appConfirmResolve = resolve;
        const modal = document.getElementById('modal-app-confirm');
        const titleEl = document.getElementById('app-confirm-title');
        const msgEl = document.getElementById('app-confirm-message');
        const okTextEl = document.getElementById('app-confirm-ok-text');
        const cancelTextEl = document.getElementById('app-confirm-cancel-text');
        const okBtn = document.getElementById('app-confirm-btn-ok');
        const iconEl = document.getElementById('app-confirm-ok-icon');

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (okTextEl) okTextEl.innerText = confirmText;
        if (cancelTextEl) cancelTextEl.innerText = cancelText;
        if (iconEl) iconEl.innerText = icon;

        if (okBtn) {
            if (isDanger) {
                okBtn.className = 'btn btn-filled btn-danger btn-touch-large';
            } else {
                okBtn.className = 'btn btn-filled btn-touch-large';
            }
        }

        if (modal) modal.classList.add('active');
    });
}

function resolveAppConfirm(result) {
    const modal = document.getElementById('modal-app-confirm');
    if (modal) modal.classList.remove('active');
    if (typeof appConfirmResolve === 'function') {
        const cb = appConfirmResolve;
        appConfirmResolve = null;
        cb(!!result);
    }
}