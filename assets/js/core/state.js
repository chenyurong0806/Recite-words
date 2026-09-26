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

// 获取或生成专属的游客名称（如：游客_7214），多层持久化确保苹果设备不丢编号
function getUniqueGuestName() {
    let guestId = SafeStorage.getItem('vocab_guest_name');
    if (!guestId || !/^游客_\d{4}$/.test(guestId)) {
        if (typeof getCookie === 'function') {
            const cId = getCookie('vocab_guest_name');
            if (cId && /^游客_\d{4}$/.test(cId)) guestId = cId;
        }
    }
    if (!guestId || !/^游客_\d{4}$/.test(guestId)) {
        if (typeof window !== 'undefined' && window.__cachedToyGuestId && /^游客_\d{4}$/.test(window.__cachedToyGuestId)) {
            guestId = window.__cachedToyGuestId;
        }
    }
    if (!guestId || !/^游客_\d{4}$/.test(guestId)) {
        guestId = '游客_' + Math.floor(1000 + Math.random() * 9000);
    }
    SafeStorage.setItem('vocab_guest_name', guestId);
    if (typeof setCookie === 'function') {
        setCookie('vocab_guest_name', guestId, 365);
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

try {
    const savedSession = SafeStorage.getItem('vocab_auth_session');
    if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.isLoggedIn && parsed.username) {
            currentUserProfile = { ...currentUserProfile, ...parsed };
        }
    }
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
}

function saveCurrentUserData() {
    if (!currentUser) return;
    const statsStr = JSON.stringify(userStats);
    SafeStorage.setItem(`vocab_stats_${currentUser}`, statsStr);
    if (currentUser.startsWith('游客_') && typeof setCookie === 'function') {
        setCookie(`vocab_stats_${currentUser}`, statsStr, 365);
    }

    // 同步到云端
    if (currentUserProfile && currentUserProfile.isLoggedIn) {
        if (currentUserProfile.type === 'cloud' && typeof supabaseSyncUserData === 'function') {
            supabaseSyncUserData(currentUser, { stats: userStats, updated: Date.now() });
        } else if (currentUserProfile.type === 'bilibili') {
            if (typeof biliSaveCloudData === 'function') {
                biliSaveCloudData({ stats: userStats, updated: Date.now() });
            }
            if (typeof supabaseSyncUserData === 'function') {
                supabaseSyncUserData(currentUser, { stats: userStats, updated: Date.now(), isBiliUser: true });
            }
        }
    } else if (currentUser.startsWith('游客_') && typeof window !== 'undefined' && window.toy && typeof window.toy.setCloudStorage === 'function' && (window.self !== window.top || (typeof isBilibiliToy !== 'undefined' && isBilibiliToy))) {
        // 在 Toy 平台中以微型体积 (< 80 字节) 持久化游客概要与编号
        try {
            const p = window.toy.setCloudStorage({
                'guest_id': currentUser,
                'toy_stats': JSON.stringify({ t: userStats.total || 0, c: userStats.correct || 0, u: Date.now() })
            });
            if (p && typeof p.catch === 'function') p.catch(() => { });
        } catch (e) { }
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