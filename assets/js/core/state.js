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

let currentUserProfile = {
    isLoggedIn: false,
    type: 'guest', // 'guest' | 'cloud' | 'bilibili'
    username: '游客',
    avatar: '',
    openId: ''
};

try {
    const savedSession = SafeStorage.getItem('vocab_auth_session');
    if (savedSession) {
        currentUserProfile = { ...currentUserProfile, ...JSON.parse(savedSession) };
    }
} catch (e) { }

let currentUser = currentUserProfile.username || '游客';
let userStats = { total: 0, correct: 0, mistakes: {} };

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
let singleSelectedBookIds = ['GaoKao3500'];
if (savedSingleBooks) {
    try {
        const parsed = JSON.parse(savedSingleBooks);
        if (parsed.length > 0) singleSelectedBookIds = parsed;
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
    if (!username || username === '游客') {
        return currentUserProfile.avatar || '';
    }
    if (currentUserProfile && currentUserProfile.username === username && currentUserProfile.avatar) {
        return currentUserProfile.avatar;
    }
    try {
        return SafeStorage.getItem(`vocab_user_avatar_${username}`) || '';
    } catch (e) {
        return '';
    }
}

function loadUserData(username, profile = null) {
    currentUser = (username || '游客').trim();
    if (profile) {
        currentUserProfile = { ...currentUserProfile, ...profile, username: currentUser };
        SafeStorage.setItem('vocab_auth_session', JSON.stringify(currentUserProfile));
        if (profile.avatar) {
            SafeStorage.setItem(`vocab_user_avatar_${currentUser}`, profile.avatar);
        }
    } else {
        // If not explicit profile and username matches profile session, keep profile
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
        const rawStats = SafeStorage.getItem(`vocab_stats_${currentUser}`);
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
    SafeStorage.setItem(`vocab_stats_${currentUser}`, JSON.stringify(userStats));
    // 同步到云端
    if (currentUserProfile && currentUserProfile.isLoggedIn) {
        if (currentUserProfile.type === 'cloud' && typeof supabaseSyncUserData === 'function') {
            supabaseSyncUserData(currentUser, { stats: userStats, updated: Date.now() });
        } else if (currentUserProfile.type === 'bilibili' && typeof biliSaveCloudData === 'function') {
            biliSaveCloudData({ stats: userStats, updated: Date.now() });
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

