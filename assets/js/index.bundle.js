/* --- Begin: core/env.js --- */
/**
 * 环境检测与 B 站 Toy 容器判断
 * Module: assets/js/core/env.js
 */

/* ==========================================================================
环境检测：判断是否运行在 B 站 Toy 容器内
========================================================================== */
const isBilibiliToy = (() => {
    try {
        // 1. URL 参数标记（通常 B 站加载小工具会带特定参数或 referrer）
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('bilibili') || urlParams.has('bili_toy')) return true;

        // 2. 检测宿主环境 Referrer
        if (document.referrer && (document.referrer.includes('bilibili.com') || document.referrer.includes('bili'))) {
            return true;
        }

        // 3. 检测是否在 iframe 内嵌套运行
        const inIframe = window.self !== window.top;
        // 如果是在线上域名且嵌在 iframe 内，基本可判定为平台内嵌
        if (inIframe && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
})();


/* --- End: core/env.js --- */

/* --- Begin: core/supabase.js --- */
/**
 * Supabase 客户端与默认离线词库
 * Module: assets/js/core/supabase.js
 */

/* ==========================================================================
   1. SUPABASE CLIENT & CORE VOCABULARY DATABASE
   ========================================================================== */
const SUPABASE_URL = 'https://mamubvgmcetepllznifl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HEeNPSqD75cWlnmZjcVHKA_Pw-OdL_A';

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

const DEFAULT_WORDS = [
    { word: "abandon", phone: "/əˈbændən/", meanings: [{ pos: "v.", meaning: "放弃，抛弃" }] },
    { word: "abundant", phone: "/əˈbʌndənt/", meanings: [{ pos: "adj.", meaning: "丰富的，充裕的" }] },
    { word: "ability", phone: "/əˈbɪləti/", meanings: [{ pos: "n.", meaning: "能力，本领" }] },
    { word: "abnormal", phone: "/æbˈnɔːrml/", meanings: [{ pos: "adj.", meaning: "反常的，异常的" }] },
    { word: "absolute", phone: "/ˈæbsəluːt/", meanings: [{ pos: "adj.", meaning: "绝对的，完全的" }] },
    { word: "academic", phone: "/ˌækəˈdemɪk/", meanings: [{ pos: "adj.", meaning: "学术的；院校的" }] },
    { word: "accelerate", phone: "/əkˈseləreɪt/", meanings: [{ pos: "v.", meaning: "加速，促进" }] },
    { word: "accumulate", phone: "/əˈkjuːmjəleɪt/", meanings: [{ pos: "v.", meaning: "积累，积聚" }] },
    { word: "accomplish", phone: "/əˈkɑːmplɪʃ/", meanings: [{ pos: "v.", meaning: "达到，完成" }] },
    { word: "accurate", phone: "/ˈækjərət/", meanings: [{ pos: "adj.", meaning: "准确的，精确的" }] },
    { word: "acquire", phone: "/əˈkwaɪər/", meanings: [{ pos: "v.", meaning: "取得，获得" }] },
    { word: "require", phone: "/rɪˈkwaɪər/", meanings: [{ pos: "v.", meaning: "要求，需要" }] },
    { word: "inquire", phone: "/ɪnˈkwaɪər/", meanings: [{ pos: "v.", meaning: "询问，调查" }] },
    { word: "adapt", phone: "/əˈdæpt/", meanings: [{ pos: "v.", meaning: "使适应；改编" }] },
    { word: "adopt", phone: "/əˈdɑːpt/", meanings: [{ pos: "v.", meaning: "收养；采纳" }] },
    { word: "adept", phone: "/əˈdept/", meanings: [{ pos: "adj.", meaning: "熟练的，内行的" }] },
    { word: "adequate", phone: "/ˈædɪkwət/", meanings: [{ pos: "adj.", meaning: "充足的，适当的" }] },
    { word: "advocate", phone: "/ˈædvəkeɪt/", meanings: [{ pos: "v.", meaning: "提倡，主张" }] },
    { word: "aesthetic", phone: "/esˈθetɪk/", meanings: [{ pos: "adj.", meaning: "美学的，审美的" }] },
    { word: "affection", phone: "/əˈfekʃn/", meanings: [{ pos: "n.", meaning: "喜爱，钟爱" }] }, {
        word: "affect", phone: "/əˈfekt/", meanings: [{ pos: "v.", meaning: "影响；感动" }]
    }, {
        word: "effect", phone: "/ɪˈfekt/", meanings: [{
            pos: "n.", meaning: "效果，影响"
        }]
    }, {
        word: "aggressive", phone: "/əˈɡresɪv/", meanings: [{
            pos: "adj.",
            meaning: "侵略的；有进取心的"
        }]
    }, {
        word: "alleviate", phone: "/əˈliːvieɪt/", meanings:
            [{ pos: "v.", meaning: "减轻，缓和" }]
    }, {
        word: "elevate", phone: "/ˈelɪveɪt/",
        meanings: [{ pos: "v.", meaning: "提升；举起" }]
    }, {
        word: "ambiguous", phone:
            "/æmˈbɪɡjuəs/", meanings: [{ pos: "adj.", meaning: "模棱两可的" }]
    }, {
        word:
            "ambitious", phone: "/æmˈbɪʃəs/", meanings: [{
                pos: "adj.", meaning:
                    "有抱负的，雄心勃勃的"
            }]
    }, {
        word: "anticipate", phone: "/ænˈtɪsɪpeɪt/", meanings: [{
            pos: "v.", meaning: "预料，预期"
        }]
    }, {
        word: "apparent", phone: "/əˈpærənt/",
        meanings: [{ pos: "adj.", meaning: "明显的，显而易见的" }]
    }, {
        word: "appreciate",
        phone: "/əˈpriːʃieɪt/", meanings: [{ pos: "v.", meaning: "欣赏；感激" }]
    }, {
        word:
            "arbitrary", phone: "/ˈɑːrbətreri/", meanings: [{
                pos: "adj.", meaning:
                    "随意的，武断的"
            }]
    }, {
        word: "brilliant", phone: "/ˈbrɪliənt/", meanings: [{
            pos:
                "adj.", meaning: "光辉的；卓越的"
        }]
    }, {
        word: "campaign", phone: "/kæmˈpeɪn/",
        meanings: [{ pos: "n.", meaning: "战役；竞选运动" }]
    }, {
        word: "champion", phone:
            "/ˈtʃæmpiən/", meanings: [{ pos: "n.", meaning: "冠军；拥护者" }]
    }, {
        word:
            "candidate", phone: "/ˈkændɪdət/", meanings: [{ pos: "n.", meaning: "候选人，求职者" }]
    }, {
        word: "capacity", phone: "/kəˈpæsəti/", meanings: [{
            pos: "n.", meaning:
                "容量；才能"
        }]
    }, {
        word: "capture", phone: "/ˈkæptʃər/", meanings: [{
            pos: "v.",
            meaning: "捕获；夺取"
        }]
    }, {
        word: "casual", phone: "/ˈkæʒuəl/", meanings: [{
            pos:
                "adj.", meaning: "偶然的；随便的"
        }]
    }, {
        word: "causal", phone: "/ˈkɔːzl/", meanings:
            [{ pos: "adj.", meaning: "因果关系的" }]
    }, {
        word: "challenge", phone:
            "/ˈtʃælɪndʒ/", meanings: [{ pos: "n./v.", meaning: "挑战；质疑" }]
    }, {
        word:
            "characteristic", phone: "/ˌkærəktəˈrɪstɪk/", meanings: [{
                pos: "adj./n.",
                meaning: "特有的；特征"
            }]
    }, {
        word: "collaborate", phone: "/kəˈlæbəreɪt/", meanings:
            [{ pos: "v.", meaning: "合作，协作" }]
    }, {
        word: "elaborate", phone: "/ɪˈlæbərət/",
        meanings: [{ pos: "adj./v.", meaning: "详尽的；精心制作" }]
    }, {
        word: "compromise",
        phone: "/ˈkɑːmprəmaɪz/", meanings: [{ pos: "n./v.", meaning: "妥协，和解" }]
    }, {
        word: "promise", phone: "/ˈprɑːmɪs/", meanings: [{
            pos: "n./v.", meaning:
                "允许，诺言"
        }]
    }, {
        word: "crucial", phone: "/ˈkruːʃl/", meanings: [{
            pos: "adj.",
            meaning: "决定性的，至关重要的"
        }]
    }, {
        word: "deficiency", phone: "/dɪˈfɪʃnsi/",
        meanings: [{ pos: "n.", meaning: "缺乏，不足" }]
    }, {
        word: "efficiency", phone:
            "/ɪˈfɪʃnsi/", meanings: [{ pos: "n.", meaning: "效率，功效" }]
    }, {
        word:
            "demonstrate", phone: "/ˈdemənstreɪt/", meanings: [{
                pos: "v.", meaning: "说明，演示"
            }]
    }, {
        word: "eliminate", phone: "/ɪˈlɪmɪneɪt/", meanings: [{
            pos: "v.",
            meaning: "消灭，消除"
        }]
    }, {
        word: "fascinate", phone: "/ˈfæsɪneɪt/", meanings: [{
            pos: "v.", meaning: "迷住，吸引"
        }]
    }, {
        word: "guarantee", phone: "/ˌɡærənˈtiː/",
        meanings: [{ pos: "n./v.", meaning: "保证，担保" }]
    }, {
        word: "mechanism", phone:
            "/ˈmekənɪzəm/", meanings: [{ pos: "n.", meaning: "机械装置；机制，机理" }]
    }, {
        word:
            "organic", phone: "/ɔːrˈɡænɪk/", meanings: [{ pos: "adj.", meaning: "有机的；器官的" }]
    }, {
        word: "organism", phone: "/ˈɔːrɡənɪzəm/", meanings: [{
            pos: "n.", meaning:
                "生物体，有机体"
        }]
    }];

/* --- End: core/supabase.js --- */

/* --- Begin: core/storage.js --- */
/**
 * IndexedDB 缓存与本地持久化引擎
 * Module: assets/js/core/storage.js
 */

/* ==========================================================================
   2. 离线缓存、本地数据库与工具函数
   ========================================================================== */
function safeJsonParse(str) {
    if (typeof str !== 'string') return str;
    const trimmed = str.trim();
    try {
        return JSON.parse(trimmed);
    } catch (e1) {
        const cleaned = trimmed.replace(/,\s*([\]}])/g, '$1');
        try {
            return JSON.parse(cleaned);
        } catch (e2) {
            try {
                return (new Function('return (' + trimmed + ');'))();
            } catch (e3) {
                throw e1;
            }
        }
    }
}

let localFolders = [];
let folderTreeCollapseMap = {};

const VocabOfflineDB = {
    dbName: 'VocabLocalBooksDB',
    version: 1,
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('books')) {
                    db.createObjectStore('books', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('folders')) {
                    db.createObjectStore('folders', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => {
                resolve(null);
            };
        });
    },

    async getAllBooks() {
        await this.init();
        if (!this.db) {
            try {
                return JSON.parse(localStorage.getItem('vocab_offline_books') || '[]');
            } catch (e) { return []; }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readonly');
            const store = tx.objectStore('books');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async saveBook(book) {
        await this.init();
        if (!this.db) {
            const list = await this.getAllBooks();
            const idx = list.findIndex(b => b.id === book.id);
            if (idx >= 0) list[idx] = book; else list.push(book);
            try { localStorage.setItem('vocab_offline_books', JSON.stringify(list)); } catch (e) { }
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readwrite');
            const store = tx.objectStore('books');
            const req = store.put(book);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async deleteBook(bookId) {
        await this.init();
        if (!this.db) {
            const list = (await this.getAllBooks()).filter(b => b.id !== bookId);
            localStorage.setItem('vocab_offline_books', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('books', 'readwrite');
            const store = tx.objectStore('books');
            const req = store.delete(bookId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async getAllFolders() {
        await this.init();
        if (!this.db) {
            try {
                return JSON.parse(localStorage.getItem('vocab_offline_folders') || '[]');
            } catch (e) { return []; }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readonly');
            const store = tx.objectStore('folders');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    async saveFolder(folder) {
        await this.init();
        if (!this.db) {
            const list = await this.getAllFolders();
            const idx = list.findIndex(f => f.id === folder.id);
            if (idx >= 0) list[idx] = folder; else list.push(folder);
            localStorage.setItem('vocab_offline_folders', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.put(folder);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    },

    async deleteFolder(folderId) {
        await this.init();
        if (!this.db) {
            const list = (await this.getAllFolders()).filter(f => f.id !== folderId);
            localStorage.setItem('vocab_offline_folders', JSON.stringify(list));
            return true;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction('folders', 'readwrite');
            const store = tx.objectStore('folders');
            const req = store.delete(folderId);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    }
};

/* --- End: core/storage.js --- */

/* --- Begin: core/audio.js --- */
/**
 * 统一语音朗读与发音引擎
 * Module: assets/js/core/audio.js
 */

/* ==========================================================================
   统一语音朗读引擎 (支持英音/美音/中文字词/词组与系统语音降级回退)
   ========================================================================== */
let activeAudioObj = null;
function playWordAudio(text, type = 1) {
    if (!text || typeof text !== 'string') return;
    if (!navigator.onLine) {
        showToast('发音功能需连接网络');
        return;
    }
    const cleanText = text
        .replace(/\(.*?\)/g, '')
        .replace(/（.*?）/g, '')
        .replace(/[（）()…._\-~！？!?，,。]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanText) return;
    const isChinese = /[\u4e00-\u9fa5]/.test(cleanText);

    try {
        if (activeAudioObj) {
            try { activeAudioObj.pause(); } catch (e) { }
            activeAudioObj = null;
        }
        const url = isChinese
            ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&le=zh`
            : `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(cleanText)}`;
        activeAudioObj = new Audio(url);
        activeAudioObj.play().catch(err => {
            console.warn('[Audio] Playback failed:', err);
        });
    } catch (err) {
        console.warn('[Audio] Audio creation failed:', err);
    }
}

function playWordVoice(word, type = 1) {
    playWordAudio(word, type);
}

function playCurrentSingleWordAudio() {
    if (singleState && singleState.pool && singleState.pool[singleState.currentIdx]) {
        playWordAudio(singleState.pool[singleState.currentIdx].word);
    }
}

function playDictationAudio() {
    if (dictationState && dictationState.currentQ) {
        playWordAudio(dictationState.currentQ.word);
    }
}

/* --- End: core/audio.js --- */

/* --- Begin: core/state.js --- */
/**
 * 全局状态与用户数据持久化
 * Module: assets/js/core/state.js
 */

let allUsersList = JSON.parse(localStorage.getItem('vocab_users_list') || '[]');
let currentUser = localStorage.getItem('vocab_pk_user') || '';
let userStats = { total: 0, correct: 0, mistakes: {} };

let gameMode = 'single';
let realtimeChannel = null;
let roomCode = null;
let isHost = false;
let hostName = '';
let guestName = '';

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

const savedSingleBooks = localStorage.getItem('single_vocab_books');
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

function loadUserData(username) {
    if (!username) return;
    currentUser = username.trim();
    localStorage.setItem('vocab_pk_user', currentUser);
    if (!allUsersList.includes(currentUser)) {
        allUsersList.push(currentUser);
        localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    }
    try {
        const rawStats = localStorage.getItem(`vocab_stats_${currentUser}`);
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
    localStorage.setItem(`vocab_stats_${currentUser}`, JSON.stringify(userStats));
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

/* --- End: core/state.js --- */

/* --- Begin: managers/book-manager.js --- */
/**
 * 词书管理器 (云端/本地/缓存分类隔离)
 * Module: assets/js/managers/book-manager.js
 */

/* ==========================================================================
   3. 词书管理器 (云端/本地/缓存分类隔离)
   ========================================================================== */
// 全局通用：彻底剔除词书名中的所有 📂、📁 及前后多余空格
function cleanBookName(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[📂📁]/g, '').trim();
}

const BookManager = {
    API_BASE: 'https://vocab-api.chenyurong.qzz.io',
    availableBooks: [],
    bookCache: {},
    fallbackBooks: [
        { id: 'builtin_default', name: '默认词书', category: '内置', count: DEFAULT_WORDS.length, words: DEFAULT_WORDS, path: '', isCloud: false },
        { id: 'books/考纲/高考3500.json', name: '高考3500', category: '考纲', count: 3893, path: 'books/考纲/高考3500.json', isCloud: true },
        { id: 'books/考纲/518.json', name: '518', category: '考纲', count: 570, path: 'books/考纲/518.json', isCloud: true },
        { id: 'books/考纲/考纲词组.json', name: '考纲词组', category: '考纲', count: 1201, path: 'books/考纲/考纲词组.json', isCloud: true },
        { id: 'books/Doris/基础闯关a-as.json', name: '基础闯关a-as', category: 'Doris', count: 68, path: 'books/Doris/基础闯关a-as.json', isCloud: true },
        { id: 'books/Doris/翻译.json', name: '翻译', category: 'Doris', count: 58, path: 'books/Doris/翻译.json', isCloud: true },
        { id: 'books/Doris/词汇测试a-as.json', name: '词汇测试a-as', category: 'Doris', count: 25, path: 'books/Doris/词汇测试a-as.json', isCloud: true },
        { id: 'books/Doris/高一高二笔记.json', name: '高一高二笔记', category: 'Doris', count: 1039, path: 'books/Doris/高一高二笔记.json', isCloud: true },
        { id: 'books/Doris/高三笔记.json', name: '高三笔记', category: 'Doris', count: 31, path: 'books/Doris/高三笔记.json', isCloud: true },
        { id: 'books/其他/CET4.json', name: 'CET4', category: '其他', count: 2607, path: 'books/其他/CET4.json', isCloud: true },
        { id: 'books/其他/小学词汇.json', name: '小学词汇', category: '其他', count: 2991, path: 'books/其他/小学词汇.json', isCloud: true },
        { id: 'books/实词/实词.json', name: '实词', category: '实词', count: 300, path: 'books/实词/实词.json', isCloud: true }
    ],

    async init() {
        this.bookCache['builtin_default'] = this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        try {
            await VocabOfflineDB.init();
            const offlineBooks = await VocabOfflineDB.getAllBooks();
            if (!window.customBooks) window.customBooks = [];
            offlineBooks.forEach(ob => {
                // 强制清理历史缓存名称中的文件夹图标
                ob.name = cleanBookName(ob.name);
                ob.rawName = cleanBookName(ob.rawName || ob.name);
                if (ob.isCloud) {
                    if (ob.words && !this.bookCache[ob.id]) {
                        this.bookCache[ob.id] = ob.words;
                    }
                } else {
                    if (!window.customBooks.some(cb => cb.id === ob.id)) {
                        window.customBooks.push(ob);
                    }
                    if (ob.words && !this.bookCache[ob.id]) {
                        this.bookCache[ob.id] = ob.words;
                    }
                }
            });
            localFolders = await VocabOfflineDB.getAllFolders();
            localFolders.forEach(f => f.name = cleanBookName(f.name));
        } catch (e) {
            console.warn('[BookManager] Offline books load error:', e);
        }
        await this.fetchBookList();
        this.preloadAllWorkerBooks();
    },

    async preloadAllWorkerBooks() {
        try {
            await this.loadBookData('books/考纲/高考3500.json');
        } catch (e) { }
        if (!Array.isArray(this.availableBooks)) return;
        for (const book of this.availableBooks) {
            if (book.id !== 'builtin_default' && !this.bookCache[book.id]) {
                try {
                    await this.loadBookData(book.id);
                } catch (e) { }
            }
        }
        if (typeof _allDbWordsCache !== 'undefined') {
            _allDbWordsCache = null;
        }
    },

    async fetchBookList() {
        const banner = document.getElementById('worker-status-banner');
        let fetchedBooks = null;

        // 1. 优先直接从 GitHub 仓库读取 books 目录 (确保实时获取最新提交的词书)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);
            const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/git/trees/main?recursive=1', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                if (ghData.tree && Array.isArray(ghData.tree)) {
                    const books = ghData.tree
                        .filter(item => item.type === 'blob' && item.path.startsWith('books/') && item.path.endsWith('.json'))
                        .map(item => {
                            const parts = item.path.split('/');
                            const filename = parts[parts.length - 1];
                            const name = cleanBookName(filename.replace(/\.json$/i, ''));
                            const category = cleanBookName(parts.length > 2 ? parts[1] : '精选');
                            return {
                                id: item.path,
                                name: name,
                                category: category,
                                path: item.path,
                                size: item.size,
                                cdnUrl: `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(item.path)}`,
                                downloadUrl: `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(item.path)}`,
                                isCloud: true
                            };
                        });
                    if (books.length > 0) {
                        fetchedBooks = books;
                    }
                }
            }
        } catch (ghErr) {
            console.warn('[BookManager] Direct GitHub trees fetch failed, trying worker:', ghErr);
        }

        // 2. 若 GitHub API 受限或失败，尝试从 Cloudflare Worker 获取 (且必须是包含 books/ 规范路径的新结构)
        if (!fetchedBooks || fetchedBooks.length === 0) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const res = await fetch(`${this.API_BASE}/api/books`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const data = await res.json();
                    // 检查返回的是否为新的 GitHub books 结构（过滤掉旧版 KV 遗留的旧字典清单）
                    if (Array.isArray(data) && data.length > 0) {
                        const isNewFormat = data.some(b => (b.path && b.path.startsWith('books/')) || b.category);
                        if (isNewFormat) {
                            fetchedBooks = data;
                        } else {
                            console.warn('[BookManager] Worker returned legacy KV books, ignoring in favor of books/ folder.');
                        }
                    }
                }
            } catch (err) {
                console.warn('[BookManager] Worker fetch failed:', err);
            }
        }

        // 3. 处理获取到的词书或使用 fallbackBooks
        if (fetchedBooks && fetchedBooks.length > 0) {
            this.availableBooks = fetchedBooks.map(item => ({
                id: String(item.id || item.path || item.name),
                name: cleanBookName(item.name || item.title || item.id),
                category: cleanBookName(item.category || '精选'),
                count: item.count || (item.words ? item.words.length : null) || (item.size ? `${Math.round(item.size / 120)}` : null) || '多词',
                path: item.path || (String(item.id).startsWith('books/') ? item.id : `books/${item.category || '其他'}/${item.name || item.id}.json`),
                cdnUrl: item.cdnUrl || `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(item.path || item.id)}`,
                downloadUrl: item.downloadUrl || `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(item.path || item.id)}`,
                isCloud: true
            }));
            this.mergeCustomBooks();
            if (banner) banner.style.display = 'none';
            return { success: true, books: this.availableBooks };
        } else {
            this.availableBooks = [...this.fallbackBooks];
            this.mergeCustomBooks();
            if (banner) banner.style.display = 'block';
            return { success: false, error: 'Loaded fallback books', books: this.availableBooks };
        }
    },

    mergeCustomBooks() {
        if (window.customBooks && window.customBooks.length > 0) {
            window.customBooks.forEach(cb => {
                if (!this.availableBooks.some(b => b.id === cb.id)) {
                    this.availableBooks.push(cb);
                }
            });
        }
    },

    async loadBookData(bookId) {
        if (bookId === 'builtin_default' || bookId === 'DEFAULT_WORDS') {
            return this.bookCache['builtin_default'] || this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
        }
        if (this.bookCache[bookId]) return this.bookCache[bookId];

        const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
        if (isGaoKao) {
            if (this.bookCache['books/考纲/高考3500.json']) return this.bookCache['books/考纲/高考3500.json'];
            if (this.bookCache['GaoKao3500']) return this.bookCache['GaoKao3500'];
        }

        if (window.customBooks) {
            const custom = window.customBooks.find(b => b.id === bookId);
            if (custom && custom.words) {
                this.bookCache[bookId] = this.normalizeWords(custom.words, custom.name, custom.id);
                return this.bookCache[bookId];
            }
        }

        try {
            const offlineBook = await VocabOfflineDB.getBook(bookId);
            if (offlineBook && offlineBook.words && offlineBook.words.length > 0) {
                this.bookCache[bookId] = offlineBook.words;
                return offlineBook.words;
            }
        } catch (e) { }

        if (typeof isShiCiBook === 'function' && isShiCiBook({ id: bookId }) && typeof ShiCiManager !== 'undefined' && ShiCiManager.loadBooks) {
            try {
                const scData = await ShiCiManager.loadBooks([bookId]);
                if (Array.isArray(scData) && scData.length > 0) {
                    const normalized = this.normalizeWords(scData, '文言实词', bookId);
                    if (normalized && normalized.length > 0) {
                        this.bookCache[bookId] = normalized;
                        return normalized;
                    }
                }
            } catch (err) { }
        }

        const bookMeta = this.availableBooks.find(b => b.id === bookId || b.path === bookId) ||
            this.fallbackBooks.find(b => b.id === bookId || b.path === bookId) ||
            { id: bookId, name: bookId };

        let relPath = bookMeta.path || bookId;
        if (!relPath.startsWith('books/') && !relPath.includes('/')) {
            if (isGaoKao) relPath = 'books/考纲/高考3500.json';
            else relPath = `books/${bookMeta.category || '其他'}/${bookMeta.name || bookId}.json`;
        }

        const sources = [
            `./${relPath}`,
            `https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/${encodeURI(relPath)}`,
            `https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/${encodeURI(relPath)}`,
            `${this.API_BASE}/api/book?id=${encodeURIComponent(bookId)}`
        ];

        for (const url of sources) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const rawText = await res.text();
                    const rawData = safeJsonParse(rawText);
                    if (Array.isArray(rawData) && rawData.length > 0) {
                        const normalized = this.normalizeWords(rawData, bookMeta.name || bookId, bookId);
                        if (normalized.length > 0) {
                            this.bookCache[bookId] = normalized;
                            if (isGaoKao) {
                                this.bookCache['GaoKao3500'] = normalized;
                                this.bookCache['books/考纲/高考3500.json'] = normalized;
                            }
                            VocabOfflineDB.saveBook({
                                id: bookId,
                                name: bookMeta.name || bookId,
                                count: normalized.length,
                                words: normalized,
                                isCloud: true
                            }).catch(() => { });
                            return normalized;
                        }
                    }
                }
            } catch (e) { }
        }

        const fallback = this.fallbackBooks.find(b => b.id === bookId);
        if (fallback && fallback.words) {
            return this.normalizeWords(fallback.words, fallback.name, fallback.id);
        }
        return this.normalizeWords(DEFAULT_WORDS, '默认词书', 'builtin_default');
    },

    normalizeWords(rawData, bookName = '', bookId = '') {
        if (!Array.isArray(rawData)) return [];
        return rawData.map(item => {
            if (!item) return null;
            const word = (item.word || item.name || '').trim();
            if (!word) return null;

            let phone = item.phone || '';
            if (!phone && item.pinyin) phone = item.pinyin;
            else if (!phone && item.usphone) phone = `/${item.usphone}/`;
            else if (!phone && item.ukphone) phone = `/${item.ukphone}/`;

            let meanings = [];
            if (Array.isArray(item.senses) && item.senses.length > 0) {
                meanings = item.senses.map(s => ({
                    pos: s.part_of_speech || '',
                    meaning: (s.meaning || '').replace(/★/g, ''),
                    examples: s.examples || []
                }));
            } else if (Array.isArray(item.meanings) && item.meanings.length > 0) {
                meanings = item.meanings.map(m => {
                    if (typeof m === 'string') {
                        const match = m.match(/^([a-z]+\.)\s*(.+)/i);
                        return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: m.trim() };
                    }
                    return { pos: m.pos || '', meaning: m.meaning || '' };
                });
            } else if (Array.isArray(item.trans) && item.trans.length > 0) {
                meanings = item.trans.map(t => {
                    if (typeof t !== 'string') return null;
                    const match = t.match(/^([a-z]+\.)\s*(.+)/i);
                    return match ? { pos: match[1].trim(), meaning: match[2].trim() } : { pos: '', meaning: t.trim() };
                }).filter(Boolean);
            } else if (typeof item.trans === 'string') {
                meanings = [{ pos: '', meaning: item.trans }];
            }

            if (meanings.length === 0) return null;
            return {
                word,
                phone,
                meanings,
                senses: item.senses || null,
                pinyin: item.pinyin || phone,
                bookName: bookName || '练习词书',
                bookId: bookId || 'default'
            };
        }).filter(Boolean);
    },

    async loadMultipleBooks(bookIds = []) {
        if (!bookIds || bookIds.length === 0) {
            return [];
        }
        const loadPromises = bookIds.map(id => this.loadBookData(id));
        const results = await Promise.all(loadPromises);
        const combined = [];
        const seenWords = new Set();
        results.flat().forEach(item => {
            if (item && !seenWords.has(item.word.toLowerCase())) {
                seenWords.add(item.word.toLowerCase());
                combined.push(item);
            }
        });
        return combined;
    }
};

/* ==========================================================================
   词书工具与去重辅助
   ========================================================================== */
function getAllUniqueBooks() {
    const list = [];
    const seen = new Set();
    const candidates = [
        ...(BookManager.availableBooks || []),
        ...(BookManager.fallbackBooks || []),
        ...(window.customBooks || [])
    ];
    for (const b of candidates) {
        if (!b || !b.id) continue;
        if (!seen.has(b.id)) {
            seen.add(b.id);
            list.push(b);
        }
    }
    return list;
}

function isBookShiCi(b) {
    if (!b) return false;
    return b.category === '实词' || b.id === 'books/实词/实词.json' || (typeof isShiCiBook === 'function' && isShiCiBook(b));
}

/* --- End: managers/book-manager.js --- */

/* --- Begin: managers/tracker.js --- */
/**
 * 学习打卡记录器与周历热力图
 * Module: assets/js/managers/tracker.js
 */

let currentCalendarWeekOffset = 0;
let currentSelectedCalendarDate = null;

const DailyStudyTracker = {
    getLogs() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`vocab_daily_logs_${currentUser}`) || '{}');
        } catch (e) {
            return {};
        }
    },
    saveLogs(logs) {
        if (!currentUser) return;
        localStorage.setItem(`vocab_daily_logs_${currentUser}`, JSON.stringify(logs));
    },
    getTodayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    record(type, count = 1) {
        if (!currentUser) return;
        const logs = this.getLogs();
        const todayStr = this.getTodayStr();
        if (!logs[todayStr]) {
            logs[todayStr] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
        }
        logs[todayStr][type] = (logs[todayStr][type] || 0) + count;
        this.saveLogs(logs);
        this.renderWeekCalendar(currentCalendarWeekOffset);
    },
    getDaysOfWeek(offset = 0) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const distanceToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + distanceToMonday + offset * 7);
        monday.setHours(0, 0, 0, 0);

        const days = [];
        const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const todayStr = this.getTodayStr();

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dateNum = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dateNum}`;
            days.push({
                dateStr,
                dayName: dayNames[i],
                dayNum: d.getDate(),
                month: d.getMonth() + 1,
                year: y,
                isToday: dateStr === todayStr
            });
        }
        return days;
    },
    renderWeekCalendar(offset = 0) {
        const gridEl = document.getElementById('hub-week-calendar-grid');
        if (!gridEl) return;

        const days = this.getDaysOfWeek(offset);
        const logs = this.getLogs();

        const rangeLabel = document.getElementById('calendar-week-range-label');
        if (rangeLabel) {
            if (offset === 0) rangeLabel.innerText = '本周';
            else if (offset === -1) rangeLabel.innerText = '上周';
            else if (offset === 1) rangeLabel.innerText = '下周';
            else rangeLabel.innerText = `${days[0].month}/${days[0].dayNum} - ${days[6].month}/${days[6].dayNum}`;
        }

        if (!currentSelectedCalendarDate) {
            currentSelectedCalendarDate = this.getTodayStr();
        }

        let html = '';
        days.forEach(day => {
            const log = logs[day.dateStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
            const totalActions = (log.learned || 0) + (log.reviewed || 0) + (log.riddle || 0) + (log.dictation || 0);
            const hasRecord = totalActions > 0;
            const isSelected = (day.dateStr === currentSelectedCalendarDate);

            // 计算学习强度等级
            let intensityClass = 'day-intensity-0';
            if (totalActions > 30) intensityClass = 'day-intensity-4';
            else if (totalActions >= 16) intensityClass = 'day-intensity-3';
            else if (totalActions >= 6) intensityClass = 'day-intensity-2';
            else if (totalActions >= 1) intensityClass = 'day-intensity-1';

            // 核心规则：当天不用强度圆圈标注，而是使用蓝色卡片框与下方小绿点（对照图 4）
            let dayNumHtml = '';
            if (day.isToday) {
                dayNumHtml = `<span class="week-day-num">${day.dayNum}</span><span class="week-day-dot ${hasRecord ? 'has-record' : ''}"></span>`;
            } else {
                dayNumHtml = `<span class="week-day-num-circle ${intensityClass}">${day.dayNum}</span>`;
            }

            html += `
                    <div class="week-day-col ${day.isToday ? 'active-today' : ''} ${isSelected ? 'selected-day' : ''}" data-date="${day.dateStr}" onclick="DailyStudyTracker.selectCalendarDay('${day.dateStr}')">
                        <span class="week-day-name">${day.dayName}</span>
                        ${dayNumHtml}
                    </div>
                    `;
        });

        gridEl.innerHTML = html;
        this.renderDayDialog(currentSelectedCalendarDate);
    },
    selectCalendarDay(dateStr) {
        currentSelectedCalendarDate = dateStr;
        document.querySelectorAll('.week-day-col').forEach(col => {
            col.classList.toggle('selected-day', col.getAttribute('data-date') === dateStr);
        });
        this.renderDayDialog(dateStr);
    },
    renderDayDialog(dateStr) {
        const dialogEl = document.getElementById('hub-calendar-dialog');
        if (!dialogEl) return;

        const logs = this.getLogs();
        const log = logs[dateStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
        const totalActions = (log.learned || 0) + (log.reviewed || 0) + (log.riddle || 0) + (log.dictation || 0);
        const isPunched = totalActions > 0;
        const isToday = (dateStr === this.getTodayStr());

        const parts = dateStr.split('-');
        const formattedDate = `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;

        let commentText = '';
        if (isPunched) {
            commentText = `今日已完成 ${totalActions} 项背诵、复习与答题训练，加油吧！`;
        } else if (isToday) {
            commentText = '今天还没开始学习呢，选择一本词书开启今日的背词之旅吧！';
        } else {
            commentText = '该日暂无打卡记录。';
        }

        dialogEl.innerHTML = `
                <div class="calendar-chat-dialog">
                    <div class="chat-dialog-avatar">
                        <span class="material-symbols-rounded" style="font-size:22px;">${isPunched ? 'auto_awesome' : 'school'}</span>
                    </div>
                    <div class="chat-dialog-bubble">
                        <div class="chat-dialog-header">
                            <span class="chat-dialog-title">${formattedDate}</span>
                            <span class="chat-dialog-badge ${isPunched ? 'punched' : 'empty'}">
                                <span class="material-symbols-rounded" style="font-size:14px;">${isPunched ? 'check_circle' : 'radio_button_unchecked'}</span>
                                <span>${isPunched ? '已打卡' : '未打卡'}</span>
                            </span>
                        </div>
                        <div class="chat-stats-grid">
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:var(--md-sys-color-primary);">menu_book</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">新学</span>
                                    <span class="chat-stat-val">${log.learned || 0} 词</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#0284c7;">replay</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">已复习</span>
                                    <span class="chat-stat-val">${log.reviewed || 0} 词</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#16a34a;">sports_esports</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">Wordle</span>
                                    <span class="chat-stat-val">${log.riddle || 0} 次</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#d97706;">edit_note</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">默写</span>
                                    <span class="chat-stat-val">${log.dictation || 0} 词</span>
                                </div>
                            </div>
                        </div>
                        <div class="chat-dialog-motto">
                            ${commentText}
                        </div>
                    </div>
                </div>
                `;
    }
};
window.DailyStudyTracker = DailyStudyTracker;

function shiftCalendarWeek(direction) {
    currentCalendarWeekOffset += direction;
    DailyStudyTracker.renderWeekCalendar(currentCalendarWeekOffset);
}

/* --- End: managers/tracker.js --- */

/* --- Begin: managers/ebbinghaus.js --- */
/**
 * 艾宾浩斯抗遗忘记忆曲线引擎
 * Module: assets/js/managers/ebbinghaus.js
 */

const EBBINGHAUS_INTERVALS = [
    1 * 24 * 60 * 60 * 1000,   // 第 1 轮复习：1天后（第二天）
    4 * 24 * 60 * 60 * 1000,   // 第 2 轮复习：4天后
    7 * 24 * 60 * 60 * 1000,   // 第 3 轮复习：7天后（一周后）
    28 * 24 * 60 * 60 * 1000   // 第 4 轮复习：28天后（四周后）
];

const EbbinghausEngine = {
    getRecords() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`vocab_ebbinghaus_db_${currentUser}`) || '{}');
        } catch (e) { return {}; }
    },
    saveRecords(records) {
        if (!currentUser) return;
        localStorage.setItem(`vocab_ebbinghaus_db_${currentUser}`, JSON.stringify(records));
    },
    getDueWords() {
        const records = this.getRecords();
        const now = Date.now();
        return Object.values(records).filter(r => r && r.stage >= 1 && r.stage < 5 && r.nextReview && now >= r.nextReview && !isWordMastered(r.word));
    },
    getAllLearnedWords() {
        const records = this.getRecords();
        return Object.values(records).filter(r => r && (r.stage >= 1 || isWordMastered(r.word)));
    },
    getDueWordsForBooks(bookIds = []) {
        if (!bookIds || bookIds.length === 0) return [];
        const allDue = this.getDueWords();
        if (allDue.length === 0) return [];

        const wordSet = new Set();
        bookIds.forEach(id => {
            let words = BookManager.bookCache[id];
            if (!words && window.customBooks) {
                const cb = window.customBooks.find(b => b.id === id);
                if (cb && cb.words) words = cb.words;
            }
            if (!words && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')) {
                words = DEFAULT_WORDS;
            }
            if (words && Array.isArray(words)) {
                words.forEach(w => {
                    if (w && w.word) wordSet.add(w.word.trim().toLowerCase());
                });
            }
        });

        return allDue.filter(r => {
            const key = (r.word || '').trim().toLowerCase();
            return wordSet.has(key) || (r.bookId && bookIds.includes(r.bookId));
        });
    },
    getBookProgress(bookId, bookWords = null) {
        let words = bookWords;
        if (!words && BookManager.bookCache) {
            words = BookManager.bookCache[bookId];
        }
        if (!words && window.customBooks) {
            const cb = window.customBooks.find(b => b.id === bookId);
            if (cb && cb.words) words = cb.words;
        }
        if (!words && (bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json')) {
            words = DEFAULT_WORDS;
        }

        const records = this.getRecords();
        const now = Date.now();

        if (words && Array.isArray(words) && words.length > 0) {
            const total = words.length;
            let learned = 0;
            let due = 0;
            let mastered = 0;

            words.forEach(w => {
                if (!w || !w.word) return;
                const k = w.word.trim().toLowerCase();
                const isMast = isWordMastered(k);
                const rec = records[k];

                if (isMast || (rec && rec.stage >= 5)) {
                    learned++;
                    mastered++;
                } else if (rec && rec.stage >= 1) {
                    learned++;
                    if (rec.nextReview && now >= rec.nextReview) {
                        due++;
                    }
                }
            });

            const effective = Math.max(0, learned - due);
            const progressPercent = Math.min(100, Math.round((effective / total) * 100));
            return { total, learned, due, mastered, progressPercent };
        }

        // 若词汇列表尚未加载到内存，尝试通过元数据与已学记录计算
        let metaCount = 0;
        const meta = (BookManager.availableBooks || []).find(b => b.id === bookId) ||
            (BookManager.fallbackBooks || []).find(b => b.id === bookId) ||
            (window.customBooks || []).find(b => b.id === bookId);
        if (meta && meta.count) {
            metaCount = parseInt(meta.count) || 0;
        }

        const recs = Object.values(records).filter(r => r && r.bookId === bookId);
        let learned = 0;
        let due = 0;
        let mastered = 0;
        recs.forEach(r => {
            const isMast = isWordMastered(r.word);
            if (isMast || r.stage >= 5) {
                learned++;
                mastered++;
            } else if (r.stage >= 1) {
                learned++;
                if (r.nextReview && now >= r.nextReview) {
                    due++;
                }
            }
        });

        const total = metaCount || learned;
        const effective = Math.max(0, learned - due);
        const progressPercent = total > 0 ? Math.min(100, Math.round((effective / total) * 100)) : 0;
        return { total, learned, due, mastered, progressPercent };
    },
    async resetBookProgress(bookId) {
        if (!currentUser || !bookId) return;
        let words = await BookManager.loadBookData(bookId);
        if (!words || words.length === 0) {
            if (bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json') {
                words = DEFAULT_WORDS;
            }
        }
        const records = this.getRecords();
        if (words && Array.isArray(words)) {
            words.forEach(w => {
                if (!w || !w.word) return;
                const k = w.word.trim().toLowerCase();
                delete records[k];
                removeWordMastered(k);
            });
        }
        Object.keys(records).forEach(k => {
            if (records[k] && records[k].bookId === bookId) {
                removeWordMastered(records[k].word);
                delete records[k];
            }
        });
        this.saveRecords(records);
        this.updateDueBadge();
        if (typeof updateHubResumeButtons === 'function') updateHubResumeButtons();
    },
    recordWord(word, meaning, phone, isSuccess, bookId = null) {
        if (!word || !currentUser) return;
        const key = word.trim().toLowerCase();
        const records = this.getRecords();
        const now = Date.now();
        const isMast = isWordMastered(key);

        const record = records[key] || {
            word: word.trim(),
            meaning: meaning || '',
            phone: phone || '',
            stage: isMast ? 5 : 0,
            historyCount: 0
        };

        if (bookId) record.bookId = bookId;
        if (meaning) record.meaning = meaning;
        if (phone) record.phone = phone;
        record.lastPracticed = now;
        record.historyCount = (record.historyCount || 0) + 1;

        const currentStage = (typeof record.stage === 'number') ? record.stage : (isMast ? 5 : 0);

        if (currentStage === 0) {
            // 首次学习生词
            if (isSuccess) {
                // 首次答对直接跳到第 2 轮复习（4天后）
                record.stage = 2;
                record.nextReview = now + EBBINGHAUS_INTERVALS[1];
            } else {
                // 首次答错进入第 1 轮复习（第二天）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
            }
        } else {
            // 复习阶段 (Stage 1..4) 或熟词 (Stage 5)
            if (isSuccess) {
                if (currentStage === 1) {
                    record.stage = 2;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[1];
                } else if (currentStage === 2) {
                    record.stage = 3;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[2];
                } else if (currentStage === 3) {
                    record.stage = 4;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[3];
                } else {
                    // 第 4 轮复习答对 -> 标记为熟词
                    record.stage = 5;
                    record.nextReview = 0;
                    ensureWordMastered(word, phone, meaning);
                }
            } else {
                // 任何一轮答错，则回到第 1 轮复习（第二天）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
                removeWordMastered(word);
            }
        }

        records[key] = record;
        this.saveRecords(records);
        this.updateDueBadge();
    },
    updateDueBadge() {
        const badgeEl = document.getElementById('hub-review-due-count');
        const btnReview = document.getElementById('btn-hub-review');

        const filterIds = (typeof getReviewSelectedBookIds === 'function')
            ? getReviewSelectedBookIds()
            : ((singleSelectedBookIds && singleSelectedBookIds.length > 0) ? singleSelectedBookIds : []);
        const dueWords = filterIds.length > 0 ? this.getDueWordsForBooks(filterIds) : this.getDueWords();
        const isDueZero = (dueWords.length === 0);

        if (badgeEl) {
            badgeEl.innerText = dueWords.length;
        }

        if (btnReview) {
            btnReview.disabled = isDueZero;
            if (dueWords.length === 0) {
                btnReview.title = '当前没有待复习的单词';
            } else {
                btnReview.title = `共有 ${dueWords.length} 个单词待复习`;
            }
        }
    },
    // 新增：如果到期当天未复习，则掉一颗星
    checkOverduePenalties() {
        if (!currentUser) return;
        const records = this.getRecords();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStartMs = today.getTime();
        const todayStr = DailyStudyTracker.getTodayStr();

        let modified = false;
        Object.values(records).forEach(rec => {
            if (!rec || typeof rec.stage !== 'number') return;
            // 处于复习阶段 (Stage 1..4) 且有到期时间的单词
            if (rec.stage >= 1 && rec.stage <= 4 && rec.nextReview) {
                // 如果到期时间早于今日凌晨（即昨天或更早到期，但直至今天仍未复习）
                if (rec.nextReview < todayStartMs) {
                    // 保证一天只扣减一次，避免每次刷新重复掉星
                    if (rec.lastOverduePenalizedDate !== todayStr) {
                        rec.lastOverduePenalizedDate = todayStr;
                        // 掉一颗星 (最低保留为第 1 轮复习)
                        rec.stage = Math.max(1, rec.stage - 1);
                        // 调整为立即待复习
                        rec.nextReview = todayStartMs - 1000;
                        modified = true;
                    }
                }
            }
        });

        if (modified) {
            this.saveRecords(records);
            this.updateDueBadge();
        }
    }
};
window.EbbinghausEngine = EbbinghausEngine;
/* --- End: managers/ebbinghaus.js --- */

/* --- Begin: components/virtual-keyboard.js --- */
/**
 * MD3 底部滑入式虚拟键盘
 * Module: assets/js/components/virtual-keyboard.js
 */

/* ==========================================================================
   统一底部滑入式虚拟键盘 (MD3 规范，支持搜索与默写)
   ========================================================================== */
let activeVirtualKeyboardInput = null;

function initGlobalVirtualKeyboard() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initGlobalVirtualKeyboard());
        return;
    }
    const gvk = document.getElementById('global-virtual-keyboard');
    if (!gvk) return;
    if (gvk._initialized) return;
    gvk._initialized = true;

    gvk.addEventListener('pointerdown', (e) => {
        e.preventDefault();
    });
    gvk.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    gvk.querySelectorAll('.gvk-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            handleGlobalVirtualKeyPress(key);
        });
    });

    const attachInputListeners = (inputEl, isSearch = false) => {
        if (!inputEl) return;
        inputEl.addEventListener('focus', () => {
            if (isSearch) {
                const sc = (typeof getSearchConfig === 'function') ? getSearchConfig() : { enableVirtualKeyboard: false };
                if (sc.enableVirtualKeyboard) {
                    activeVirtualKeyboardInput = inputEl;
                    openGlobalVirtualKeyboard();
                }
            } else {
                if (typeof dictationVirtualKeyboardEnabled !== 'undefined' && dictationVirtualKeyboardEnabled) {
                    activeVirtualKeyboardInput = inputEl;
                    openGlobalVirtualKeyboard();
                }
            }
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement !== inputEl && (!gvk.contains(document.activeElement))) {
                    if (activeVirtualKeyboardInput === inputEl) {
                        closeGlobalVirtualKeyboard();
                    }
                }
            }, 180);
        });
    };

    attachInputListeners(document.getElementById('search-page-input'), true);
    attachInputListeners(document.getElementById('hub-search-input'), true);
    attachInputListeners(document.getElementById('dictation-word-input'), false);
}

function openGlobalVirtualKeyboard() {
    const gvk = document.getElementById('global-virtual-keyboard');
    if (gvk) gvk.classList.add('open');
}

function closeGlobalVirtualKeyboard() {
    const gvk = document.getElementById('global-virtual-keyboard');
    if (gvk) gvk.classList.remove('open');
    activeVirtualKeyboardInput = null;
}

function handleGlobalVirtualKeyPress(key) {
    if (!key) return;
    if (key === 'hide') {
        closeGlobalVirtualKeyboard();
        if (activeVirtualKeyboardInput) activeVirtualKeyboardInput.blur();
        return;
    }

    const inp = activeVirtualKeyboardInput || document.getElementById('search-page-input') || document.getElementById('hub-search-input') || document.getElementById('dictation-word-input');
    if (!inp) return;

    if (key === 'Backspace') {
        const start = inp.selectionStart;
        const end = inp.selectionEnd;
        if (start !== null && end !== null && start !== end) {
            const val = inp.value;
            inp.value = val.slice(0, start) + val.slice(end);
            inp.selectionStart = inp.selectionEnd = start;
        } else if (start !== null && start > 0) {
            const val = inp.value;
            inp.value = val.slice(0, start - 1) + val.slice(start);
            inp.selectionStart = inp.selectionEnd = start - 1;
        } else {
            inp.value = inp.value.slice(0, -1);
        }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.focus();
        return;
    }

    if (key === 'Enter') {
        if (inp.id === 'search-page-input' || inp.id === 'hub-search-input') {
            const q = inp.value.trim();
            if (q) executeHubSearch(q, true, true);
        } else if (inp.id === 'dictation-word-input') {
            if (typeof submitDictationAnswer === 'function') {
                submitDictationAnswer();
            } else {
                inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }
        }
        inp.focus();
        return;
    }

    const start = inp.selectionStart !== null ? inp.selectionStart : inp.value.length;
    const end = inp.selectionEnd !== null ? inp.selectionEnd : inp.value.length;
    const val = inp.value;
    inp.value = val.slice(0, start) + key + val.slice(end);
    inp.selectionStart = inp.selectionEnd = start + key.length;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.focus();
}
/* --- End: components/virtual-keyboard.js --- */

/* --- Begin: components/folder-tree.js --- */
/**
 * 文件夹分类树状选词书组件
 * Module: assets/js/components/folder-tree.js
 */

/* ==========================================================================
   4. 文件夹树形选词书组件 (完全修复：按分类分组、默认收起、英语与实词隔离、云端与未归类严格隔离)
   ========================================================================== */
function renderBookFolderTree(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedIds = options.selectedIds || [];
    const onToggleFn = options.onToggle || 'toggleSingleBook';
    const isSingle = options.isSingleSelect || false;
    const mode = options.mode || 'single';
    const isReadOnly = options.isReadOnly || (mode === 'room' && !isHost);
    const filterType = options.filterType || (mode === 'shici' ? 'shici' : 'english');

    const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;

    const bookMatches = (b) => (filterType === 'all' ? true : (filterType === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    // 云端词书：包括 Worker/GitHub 云端词书以及从云端下载到本地持久化的词书（过滤掉 GaoKao3500 重复项）
    const cloudBooks = allBooks.filter(b => (b.isCloud || !String(b.id).startsWith('custom_')) && b.id !== 'GaoKao3500' && bookMatches(b));
    // 本地词书：用户自主导入的本地词书
    const localCustomBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_') && bookMatches(b));

    if (cloudBooks.length === 0 && localCustomBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:36px; opacity:0.5;">menu_book</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${filterType === 'shici' ? '实词' : '英语'}词书</p>
                    </div>
                `;
        return;
    }

    let html = '<div class="book-tree-container">';

    // 1. 云端词书分类 (按 category 分组展示：Doris、考纲、其他等，默认收起)
    if (cloudBooks.length > 0) {
        const categories = {};
        cloudBooks.forEach(b => {
            const cat = b.category || '云端精选';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(b);
        });
        const catNames = Object.keys(categories);
        if (catNames.length > 1) {
            catNames.forEach(cat => {
                const booksInCat = categories[cat];
                const folderKey = `${containerId}_cloud_${cat}`;
                const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
                const catSelectedCount = booksInCat.filter(b => isBookIdSelected(selectedIds, b.id)).length;
                const safeCatId = encodeURIComponent(cat).replace(/%/g, '_');
                html += `
                        <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-cloud-${safeCatId}">
                            <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-cloud-${safeCatId}', '${folderKey}')">
                                <div class="tree-folder-left">
                                    <span class="material-symbols-rounded tree-folder-icon">cloud</span>
                                    <span class="tree-folder-name">${escapeHtml(cat)}</span>
                                    <span class="tree-folder-badge">${catSelectedCount}/${booksInCat.length} 本</span>
                                </div>
                                <div class="tree-folder-right">
                                    <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                                </div>
                            </div>
                            <div class="tree-folder-body">
                                ${booksInCat.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                            </div>
                        </div>
                        `;
            });
        } else {
            const defaultCollapsed = (localCustomBooks.length > 0);
            const isCollapsed = folderTreeCollapseMap[`${containerId}_cloud`] !== undefined
                ? folderTreeCollapseMap[`${containerId}_cloud`]
                : defaultCollapsed;
            const cloudSelectedCount = cloudBooks.filter(b => isBookIdSelected(selectedIds, b.id)).length;

            html += `
                    <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-cloud">
                        <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-cloud', '${containerId}_cloud')">
                            <div class="tree-folder-left">
                                <span class="material-symbols-rounded tree-folder-icon">cloud</span>
                                <span class="tree-folder-name">云端词书</span>
                                <span class="tree-folder-badge">${cloudSelectedCount}/${cloudBooks.length} 本</span>
                            </div>
                            <div class="tree-folder-right">
                                <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                            </div>
                        </div>
                        <div class="tree-folder-body">
                            ${cloudBooks.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                        </div>
                    </div>
                    `;
        }
    }

    // 2. 自建文件夹分类 (默认收起)
    localFolders.forEach(folder => {
        const booksInFolder = localCustomBooks.filter(b => b.folderId === folder.id);
        if (booksInFolder.length === 0) return;
        const folderKey = `${containerId}_folder_${folder.id}`;
        const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
        const folderSelectedCount = booksInFolder.filter(b => isBookIdSelected(selectedIds, b.id)).length;

        html += `
                <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-${folder.id}">
                    <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-${folder.id}', '${folderKey}')">
                        <div class="tree-folder-left">
                            <span class="material-symbols-rounded tree-folder-icon">folder</span>
                            <span class="tree-folder-name">${escapeHtml(folder.name)}</span>
                            <span class="tree-folder-badge">${folderSelectedCount}/${booksInFolder.length} 本</span>
                        </div>
                        <div class="tree-folder-right">
                            <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                        </div>
                    </div>
                    <div class="tree-folder-body">
                        ${booksInFolder.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                    </div>
                </div>
                `;
    });

    // 3. 未归类本地词书分类 (统一样式：带折叠箭头与复选框条目)
    const uncatBooks = localCustomBooks.filter(b => !b.folderId || !localFolders.some(f => f.id === b.folderId));
    if (uncatBooks.length > 0) {
        const folderKey = `${containerId}_uncat`;
        const isCollapsed = folderTreeCollapseMap[folderKey] !== false;
        const uncatSelectedCount = uncatBooks.filter(b => isBookIdSelected(selectedIds, b.id)).length;

        html += `
                <div class="tree-folder ${isCollapsed ? 'collapsed' : ''}" id="${containerId}-folder-uncat">
                    <div class="tree-folder-header" onclick="toggleTreeFolderCollapse('${containerId}-folder-uncat', '${folderKey}')">
                        <div class="tree-folder-left">
                            <span class="material-symbols-rounded tree-folder-icon" style="color:var(--md-sys-color-secondary);">folder_open</span>
                            <span class="tree-folder-name">未归类</span>
                            <span class="tree-folder-badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-on-surface);">${uncatSelectedCount}/${uncatBooks.length} 本</span>
                        </div>
                        <div class="tree-folder-right">
                            <span class="material-symbols-rounded tree-folder-chevron">expand_more</span>
                        </div>
                    </div>
                    <div class="tree-folder-body">
                        ${uncatBooks.map(b => renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly)).join('')}
                    </div>
                </div>
                `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderTreeBookItem(b, selectedIds, onToggleFn, isSingle, isReadOnly = false) {
    const isSel = isBookIdSelected(selectedIds, b.id);
    const displayName = escapeHtml(cleanBookName(b.rawName || b.name));
    const clickHandler = isReadOnly ? '' : `onclick="${onToggleFn}('${b.id}')"`;
    const cursorStyle = isReadOnly ? 'cursor:default;' : '';

    const prog = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
        ? EbbinghausEngine.getBookProgress(b.id, b.words)
        : { total: b.count || 0, learned: 0, due: 0, mastered: 0, progressPercent: 0 };

    const countText = prog.total ? `共${prog.total}词` : (b.count ? `共${b.count}词` : '多词');

    return `
            <div class="tree-book-item ${isSel ? 'selected' : ''}" ${clickHandler} style="${cursorStyle}">
                <div class="tree-book-info" style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <span class="tree-book-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</span>
                        <span class="tree-book-count" style="flex-shrink:0;">${countText}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; margin-top:5px;">
                        <div class="book-progress-mini" style="flex:1; height:4px;">
                            <div class="book-progress-mini-fill" style="width:${prog.progressPercent}%;"></div>
                        </div>
                        <span style="font-size:0.72rem; font-weight:700; color:var(--md-sys-color-primary); flex-shrink:0;">${prog.progressPercent}%</span>
                        ${prog.due > 0 ? `<span style="font-size:0.68rem; font-weight:700; background:var(--md-sys-color-primary-container, #e0f2fe); color:var(--md-sys-color-primary, #0284c7); border:1px solid rgba(2, 132, 199, 0.2); padding:1px 6px; border-radius:9999px; flex-shrink:0;">待复习: ${prog.due}</span>` : ''}
                    </div>
                </div>
                <div class="tree-book-check" style="margin-left:8px; flex-shrink:0;">
                    ${isSel ? '<span class="material-symbols-rounded" style="font-size:16px; color:white;">check</span>' : ''}
                </div>
            </div>
        `;
}

function toggleTreeFolderCollapse(elemId, folderKey) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const isCollapsed = el.classList.toggle('collapsed');
    folderTreeCollapseMap[folderKey] = isCollapsed;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* --- End: components/folder-tree.js --- */

/* --- Begin: components/md3-select.js --- */
/**
 * MD3 风格自定义下拉选择框组件
 * Module: assets/js/components/md3-select.js
 */

// ----------------- MD3 风格自定义下拉选择框组件 -----------------
function renderMd3SelectHtml({ id, options, defaultValue, onChange = '' }) {
    const currentVal = defaultValue !== undefined ? defaultValue : (options[0] ? options[0].value : '');
    const selectedOpt = options.find(o => String(o.value) === String(currentVal)) || options[0] || { value: '', label: '请选择' };

    return `
                <div class="md3-custom-select" id="${escapeHtml(id)}">
                    <input type="hidden" id="${escapeHtml(id)}-input" value="${escapeHtml(selectedOpt.value)}">
                    <button type="button" class="md3-custom-select-trigger" id="${escapeHtml(id)}-trigger" onclick="toggleMd3Select('${escapeHtml(id)}', event)">
                        <span id="${escapeHtml(id)}-label">${escapeHtml(selectedOpt.label)}</span>
                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-outline); transition:transform 0.2s;">arrow_drop_down</span>
                    </button>
                    <div class="md3-custom-select-menu" id="${escapeHtml(id)}-menu" onclick="event.stopPropagation()">
                        ${options.map(opt => `
                            <div class="md3-custom-select-option ${String(opt.value) === String(selectedOpt.value) ? 'selected' : ''}"
                                data-value="${escapeHtml(opt.value)}"
                                onclick="selectMd3Option('${escapeHtml(id)}', '${escapeHtml(opt.value)}', '${escapeHtml(opt.label)}', '${escapeHtml(onChange)}')">
                                <span>${escapeHtml(opt.label)}</span>
                                ${String(opt.value) === String(selectedOpt.value) ? '<span class="material-symbols-rounded" style="font-size:16px;">check</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
}

function toggleMd3Select(selectId, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(selectId + '-menu');
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeAllMd3Selects();
    if (!wasOpen) {
        menu.classList.add('open');
    }
}

function selectMd3Option(selectId, val, label, onChangeFnName) {
    const triggerLabel = document.getElementById(selectId + '-label');
    const hiddenInput = document.getElementById(selectId + '-input');
    const menu = document.getElementById(selectId + '-menu');
    if (triggerLabel) triggerLabel.textContent = label;
    if (hiddenInput) {
        hiddenInput.value = val;
        hiddenInput.dispatchEvent(new Event('change'));
    }
    if (menu) {
        menu.classList.remove('open');
        menu.querySelectorAll('.md3-custom-select-option').forEach(opt => {
            const isCur = opt.getAttribute('data-value') === String(val);
            opt.classList.toggle('selected', isCur);
            const checkIcon = opt.querySelector('.material-symbols-rounded');
            if (isCur && !checkIcon) {
                opt.insertAdjacentHTML('beforeend', '<span class="material-symbols-rounded" style="font-size:16px;">check</span>');
            } else if (!isCur && checkIcon) {
                checkIcon.remove();
            }
        });
    }
    if (onChangeFnName && typeof window[onChangeFnName] === 'function') {
        window[onChangeFnName](val, selectId);
    }
}

function closeAllMd3Selects() {
    document.querySelectorAll('.md3-custom-select-menu.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.md3-custom-select')) {
        closeAllMd3Selects();
    }
});

/* --- End: components/md3-select.js --- */

/* --- Begin: components/version-card.js --- */
/**
 * 版本检查更新浮动卡片组件
 * Module: assets/js/components/version-card.js
 */


function semverCompare(vA, vB) {
    const pA = String(vA || '').replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const pB = String(vB || '').replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
        const numA = pA[i] || 0;
        const numB = pB[i] || 0;
        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }
    return 0;
}

async function checkCloudVersion(manual = false) {
    let data = null;

    // 1. 优先从 Worker 获取 (不走任何浏览器本地缓存)
    try {
        const res = await fetch(`${BookManager.API_BASE}/api/version?t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (res.ok) data = await res.json();
    } catch (e) {
        console.warn('Worker version check failed:', e);
    }

    // 2. 备选：Worker 不可用时尝试直连
    if (!data) {
        try {
            const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases/latest');
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                const tag = (ghData.tag_name || '').replace(/^v/i, '');
                const releaseDate = (ghData.published_at || '').substring(0, 10);
                let changelogItems = [];
                if (ghData.body) {
                    changelogItems = ghData.body.replace(/\r\n/g, '\n').split('\n')
                        .map(line => line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''))
                        .filter(line => line.length > 0 && !line.startsWith('#'));
                }
                data = {
                    version: tag,
                    releaseDate: releaseDate,
                    changelog: changelogItems.length > 0 ? changelogItems : ['常规优化更新'],
                    // 自动加上 ghfast.top 镜像前缀，确保即使走备选，大陆下载也是满速
                    downloadUrl: `https://ghfast.top/https://github.com/chenyurong0806/Recite-words/releases/download/${ghData.tag_name}/index.html`
                };
            }
        } catch (e) { }
    }

    if (data && data.version) {
        const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const hasNewer = semverCompare(data.version, APP_VERSION) > 0;

        if (hasNewer) {
            showVersionUpdateCard(data, isLocal);
        } else {
            if (manual) showToast(`当前已是最新版本 v${APP_VERSION}`);
        }
    } else {
        if (manual) showToast(`当前已是最新离线版本 v${APP_VERSION}`);
    }
}

function showVersionUpdateCard(data, isLocal) {
    if (isBilibiliToy) return;

    const card = document.getElementById('version-update-card');
    if (!card) return;

    const titleEl = document.getElementById('version-card-title');
    const dateEl = document.getElementById('version-card-date');
    const descEl = document.getElementById('version-card-desc');
    const actionBtn = document.getElementById('btn-version-card-action');

    if (titleEl) titleEl.innerText = `发现新版本 v${data.version}`;
    if (dateEl) dateEl.innerText = `发布日期：${data.releaseDate}`;
    if (descEl && Array.isArray(data.changelog)) {
        descEl.innerHTML = `
                <div style="font-weight:600; margin-bottom:4px;">主要更新内容：</div>
                <ul style="padding-left:16px; margin:0; line-height:1.5;">
                    ${data.changelog.slice(0, 4).map(it => `<li>${escapeHtml(it)}</li>`).join('')}
                </ul>
            `;
    }

    if (actionBtn) {
        if (isLocal) {
            actionBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">download</span><span>下载最新版本</span>';
            actionBtn.onclick = () => handleDownloadLatestHtml(data.downloadUrl);
        } else {
            actionBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">refresh</span><span>刷新更新</span>';
            actionBtn.onclick = () => window.location.reload(true);
        }
    }

    card.style.display = 'block';
}

function dismissVersionUpdateCard() {
    const card = document.getElementById('version-update-card');
    if (card) card.style.display = 'none';
}

function openChangelogInSettings() {
    dismissVersionUpdateCard();
    switchView('view-settings');
    switchSettingsSubview('changelog');
}

function handleDownloadLatestHtml(downloadUrl) {
    if (!downloadUrl) return;
    showToast('正在启动下载，请稍候...');

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function handleVersionUpdateAction() {
    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
        handleDownloadLatestHtml();
    } else {
        window.location.reload(true);
    }
}
/* --- End: components/version-card.js --- */

/* --- Begin: views/auth.js --- */
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

/* --- End: views/auth.js --- */

/* --- Begin: views/hub.js --- */
/**
 * 学习主站大厅与导航中枢
 * Module: assets/js/views/hub.js
 */

function showToast(text) {
    const snackbar = document.getElementById('snackbar');
    snackbar.innerText = text;
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 2600);
}

let currentView = 'view-auth';
window.currentView = currentView;

function switchView(viewId) {
    currentView = viewId;
    window.currentView = viewId;
    if (typeof resetAllGameAlertsAndFeedback === 'function') {
        resetAllGameAlertsAndFeedback();
    }
    const hideNavViews = ['view-auth', 'view-single', 'view-game', 'view-local-duel', 'view-dictation', 'view-riddle', 'view-shici', 'view-search', 'view-book-selector'];

    const performSwitch = () => {
        currentView = viewId;
        window.currentView = viewId;
        const shouldHideNav = hideNavViews.includes(viewId) || !currentUser;

        // 纯类名控制，触发 CSS 3D 平滑移出/移入动画
        if (shouldHideNav) {
            document.body.classList.remove('has-nav');
            document.body.classList.add('nav-hidden');
        } else {
            document.body.classList.add('has-nav');
            document.body.classList.remove('nav-hidden');
        }

        if (typeof updateNavActive === 'function') {
            const navKey = viewId === 'view-settings' ? 'settings' : (viewId === 'view-me' ? 'me' : 'home');
            updateNavActive(navKey);
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    if (document.startViewTransition) {
        try {
            const transition = document.startViewTransition(performSwitch);
            if (transition && typeof transition.catch === 'function') {
                transition.catch(() => { });
            }
        } catch (e) {
            performSwitch();
        }
    } else {
        performSwitch();
    }

    if (viewId === 'view-hub') {
        updateHub();
        if (currentUser && typeof initGlobalPresence === 'function') {
            initGlobalPresence();
        }
    } else if (viewId === 'view-auth') {
        renderAuthUsersList();
    } else if (viewId === 'view-me') {
        if (typeof renderMeView === 'function') {
            renderMeView();
        }
    } else if (viewId === 'view-settings') {
        if (typeof switchSettingsSubview === 'function') {
            switchSettingsSubview('main');
        }
    } else if (viewId === 'view-online') {
        if (typeof fetchOnlineRoomsList === 'function') {
            fetchOnlineRoomsList();
            initGlobalPresence();
        }
    } else if (viewId === 'view-search') {
        const searchInp = document.getElementById('search-page-input');
        if (!searchInp || !searchInp.value || !searchInp.value.trim()) {
            if (typeof showSearchHistoryView === 'function') {
                showSearchHistoryView();
            }
        }
    }
}

let isNetworkOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;

function checkNetworkStatus(explicitState) {
    if (typeof explicitState === 'boolean') {
        isNetworkOnline = explicitState;
    } else {
        isNetworkOnline = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') ? navigator.onLine : true;
    }
    const badge = document.getElementById('hub-online-offline-badge');
    const badgeText = document.getElementById('hub-online-offline-text');
    const btnOnline = document.getElementById('btn-enter-online');

    if (badge && badgeText) {
        if (isNetworkOnline) {
            badge.className = 'network-status-badge online';
            badgeText.innerText = '在线';
        } else {
            badge.className = 'network-status-badge offline';
            badgeText.innerText = '离线';
        }
    }

    if (btnOnline) {
        if (isNetworkOnline) {
            btnOnline.disabled = false;
            btnOnline.title = '进入联机大厅';
            btnOnline.style.opacity = '1';
            btnOnline.style.cursor = 'pointer';
        } else {
            btnOnline.disabled = true;
            btnOnline.title = '当前无网络连接，联机不可用';
            btnOnline.style.opacity = '0.45';
            btnOnline.style.cursor = 'not-allowed';
        }
    }
}

function handleEnterOnlineClick() {
    if (!isNetworkOnline) {
        showToast('当前处于离线状态，远程联机不可用');
        return;
    }
    switchView('view-online');
}

window.addEventListener('online', () => {
    checkNetworkStatus(true);
    showToast('已恢复网络连接');
});

window.addEventListener('offline', () => {
    checkNetworkStatus(false);
    showToast('网络已断开');
});

function updateHub() {
    if (!currentUser) return switchView('view-auth');
    document.getElementById('hub-profile-tag').innerText = `${currentUser}`;
    document.getElementById('stat-total').innerText = userStats.total;
    document.getElementById('stat-acc').innerText = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) + '%' : '0%';
    document.getElementById('stat-mistakes').innerText = Object.keys(userStats.mistakes || {}).length;

    checkNetworkStatus();
    updateHubResumeButtons();

    if (window.EbbinghausEngine) {
        window.EbbinghausEngine.updateDueBadge();
    }
    if (window.DailyStudyTracker) {
        window.DailyStudyTracker.renderWeekCalendar(currentCalendarWeekOffset);
    }
    if (typeof updateHubShiCiBadge === 'function') {
        updateHubShiCiBadge();
    }
    if (typeof initSearchTabs === 'function') {
        initSearchTabs();
    }
}

// 刷新主页中单人学习与 Wordle 的按钮文本（有未完成进度时显示“继续学习” / “继续解谜”）
function updateHubResumeButtons() {
    if (!currentUser) return;
    const singleSaved = localStorage.getItem(`single_progress_${currentUser}`);
    const learnBtnText = document.getElementById('btn-hub-learn-text');
    if (learnBtnText) {
        if (singleSaved) {
            try {
                const parsed = JSON.parse(singleSaved);
                if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                    learnBtnText.innerText = `继续(${parsed.currentIdx + 1}/${parsed.pool.length})`;
                } else {
                    learnBtnText.innerText = '学习新词';
                }
            } catch (e) {
                learnBtnText.innerText = '学习新词';
            }
        } else {
            learnBtnText.innerText = '学习新词';
        }
    }

    const riddleSaved = localStorage.getItem(`riddle_progress_${currentUser}`);
    const riddleBtnText = document.getElementById('btn-hub-riddle-text');
    if (riddleBtnText) {
        if (riddleSaved) {
            try {
                const parsed = JSON.parse(riddleSaved);
                if (parsed && !parsed.gameOver && parsed.attempts && parsed.attempts.length > 0) {
                    riddleBtnText.innerText = `继续解谜`;
                } else {
                    riddleBtnText.innerText = '开始解谜';
                }
            } catch (e) {
                riddleBtnText.innerText = '开始解谜';
            }
        } else {
            riddleBtnText.innerText = '开始解谜';
        }
    }

    if (typeof updateHubShiCiResumeButton === 'function') {
        updateHubShiCiResumeButton();
    }
}

// 首页点击“管理本地词书”直接无弹窗进入个人中心-管理词书页面
function goToManageBooksInSettings() {
    openMeSubview('books');
}

async function loadCustomBook(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    const importedNames = [];

    if (!window.customBooks) window.customBooks = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const text = await file.text();
            const rawData = JSON.parse(text);
            // 禁止导入文言实词
            if (isShiCiBook(rawData) || (rawData && rawData.name && rawData.name.includes('实词')) || file.name.includes('实词') || file.name.includes('文言')) {
                alert('文言词书禁止导入！');
                continue;
            }
            if (Array.isArray(rawData) && rawData.some(it => it && (it.senses || it.isAncient || it.type === 'shici'))) {
                alert('文言词书禁止导入！');
                continue;
            }
            const bookName = file.name.replace(/\.json$/i, '');
            const bookId = 'custom_' + Date.now() + '_' + i;
            const normalized = BookManager.normalizeWords(rawData, bookName, bookId);
            if (normalized.length === 0) throw new Error('未解析到有效词条');

            const bookObj = {
                id: bookId,
                name: bookName,
                rawName: bookName,
                count: normalized.length,
                words: normalized,
                folderId: null,
                isCloud: false,
                createdAt: Date.now() + i
            };

            window.customBooks.push(bookObj);
            await VocabOfflineDB.saveBook(bookObj);

            BookManager.bookCache[bookId] = normalized;

            if (!singleSelectedBookIds.includes(bookId)) {
                singleSelectedBookIds.push(bookId);
            }
            importedNames.push(bookName);
            successCount++;
        } catch (err) {
            console.error('导入词书解析失败:', file.name, err);
            failCount++;
        }
    }

    // 重置 input value 以支持再次导入同名文件
    e.target.value = '';

    BookManager.mergeCustomBooks();

    // 立即刷新所有相关词书列表
    renderSingleBookList();
    renderRoomBookChips();
    renderLocalDuelBookChips();
    renderAiDuelBookChips();
    renderManageLocalBooksInSettings();
    renderSettingsBooksSummary();

    if (successCount > 0) {
        if (successCount === 1) {
            showToast(`成功导入本地词书“${importedNames[0]}”！`);
        } else {
            showToast(`成功导入 ${successCount} 本词书！` + (failCount > 0 ? ` (${failCount} 本失败)` : ''));
        }
    } else if (failCount > 0) {
        alert('所选词库解析失败，请确认为标准词典JSON格式。');
    }
}

function isBookIdSelected(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) return false;
    const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
    return selectedIds.some(id => id === bookId || (isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
}

function toggleBookIdInList(selectedIds, bookId) {
    if (!Array.isArray(selectedIds)) selectedIds = [];
    const isGaoKao = bookId === 'GaoKao3500' || bookId === 'books/考纲/高考3500.json';
    const hasIt = selectedIds.some(id => id === bookId || (isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
    if (hasIt) {
        return selectedIds.filter(id => id !== bookId && !(isGaoKao && (id === 'GaoKao3500' || id === 'books/考纲/高考3500.json')));
    } else {
        return [...selectedIds, bookId];
    }
}

function isShiCiBook(b) {
    if (!b) return false;
    if (b.type === 'shici' || b.isShiCi) return true;
    if (b.category === '实词' || (b.name && b.name.includes('实词')) || (b.id && String(b.id).includes('实词'))) return true;
    if (b.words && b.words.length > 0 && b.words[0].senses) return true;
    return false;
}

function isEnglishBook(b) {
    return !isShiCiBook(b);
}

/* --- End: views/hub.js --- */

/* --- Begin: views/book-selector.js --- */
/**
 * 独立选词书大屏视图 (封面与分类)
 * Module: assets/js/views/book-selector.js
 */

/* ==========================================================================
   全新独立“选择词书”页面控制器 (支持封面与文件夹分类，立即生效)
   ========================================================================== */
let bookSelectorMode = 'single';
let bookSelectorActiveCategory = 'english';
let bookSelectorPreviousView = 'view-hub';

function openBookSelectorPage(mode = 'single') {
    bookSelectorMode = mode;
    bookSelectorPreviousView = currentView || 'view-hub';
    if (mode === 'shici') {
        bookSelectorActiveCategory = 'shici';
    } else {
        bookSelectorActiveCategory = 'english';
    }
    const titleEl = document.getElementById('book-selector-page-title');
    const modeNames = {
        'single': '选择词书 (背单词)',
        'shici': '选择词书 (背实词)',
        'riddle': '选择词书 (Wordle)',
        'dictation': '选择词书 (英语默写)'
    };
    if (titleEl) titleEl.textContent = modeNames[mode] || '选择词书';

    document.querySelectorAll('.book-selector-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(bookSelectorActiveCategory === 'shici' ? 'tab-bs-shici' : 'tab-bs-en');
    if (activeTab) activeTab.classList.add('active');

    switchView('view-book-selector');
    renderBookSelectorPage();
}

function exitBookSelectorPage() {
    switchView(bookSelectorPreviousView || 'view-hub');
}

function switchBookSelectorCategory(cat) {
    bookSelectorActiveCategory = cat;
    document.querySelectorAll('.book-selector-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(cat === 'shici' ? 'tab-bs-shici' : 'tab-bs-en');
    if (activeTab) activeTab.classList.add('active');
    renderBookSelectorPage();
}

function getProceduralBookGradient(title, category = '') {
    const gradients = [
        'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        'linear-gradient(135deg, #065f46, #10b981)',
        'linear-gradient(135deg, #701a75, #ec4899)',
        'linear-gradient(135deg, #831843, #f43f5e)',
        'linear-gradient(135deg, #1e293b, #64748b)',
        'linear-gradient(135deg, #0f766e, #14b8a6)',
        'linear-gradient(135deg, #3730a3, #6366f1)',
        'linear-gradient(135deg, #7c2d12, #f97316)',
        'linear-gradient(135deg, #4c1d95, #8b5cf6)'
    ];
    let hash = 0;
    const str = (title || '') + (category || '');
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
}

function isBookIdSelectedInCurrentMode(bookId) {
    if (bookSelectorMode === 'single') {
        return Array.isArray(singleSelectedBookIds) && singleSelectedBookIds.includes(bookId);
    } else if (bookSelectorMode === 'shici') {
        return typeof shiciConfig !== 'undefined' && Array.isArray(shiciConfig.selectedBooks) && shiciConfig.selectedBooks.includes(bookId);
    } else if (bookSelectorMode === 'riddle') {
        return typeof riddleConfig !== 'undefined' && ((Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.includes(bookId)) || riddleConfig.bookId === bookId);
    } else if (bookSelectorMode === 'dictation') {
        return typeof dictationConfig !== 'undefined' && Array.isArray(dictationConfig.selectedBooks) && dictationConfig.selectedBooks.includes(bookId);
    }
    return false;
}

function renderBookSelectorPage() {
    const container = document.getElementById('book-selector-content-list');
    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (!container) return;

    const allBooks = getAllUniqueBooks();
    const isShiCi = (bookSelectorActiveCategory === 'shici');
    const filteredBooks = allBooks.filter(b => isShiCi ? isBookShiCi(b) : !isBookShiCi(b));

    let selectedCount = 0;
    if (bookSelectorMode === 'single') {
        selectedCount = (singleSelectedBookIds || []).length;
    } else if (bookSelectorMode === 'shici') {
        selectedCount = (typeof shiciConfig !== 'undefined' && shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
    } else if (bookSelectorMode === 'riddle') {
        selectedCount = (typeof riddleConfig !== 'undefined' && riddleConfig.selectedBooks) ? riddleConfig.selectedBooks.length : 1;
    } else if (bookSelectorMode === 'dictation') {
        selectedCount = (typeof dictationConfig !== 'undefined' && dictationConfig.selectedBooks) ? dictationConfig.selectedBooks.length : 0;
    }
    if (summaryChip) summaryChip.textContent = `已选 ${selectedCount} 本词书`;

    if (filteredBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem;">该分类下暂无词书</p>
                    </div>
                `;
        return;
    }

    const folderGroups = {};
    filteredBooks.forEach(b => {
        let folder = b.category || '精选';
        if (b.id === 'builtin_default') folder = '内置';
        else if (String(b.id).startsWith('custom_')) folder = '自定义词书';
        if (!folderGroups[folder]) folderGroups[folder] = [];
        folderGroups[folder].push(b);
    });

    const folderOrder = ['内置', '考纲', 'Doris', '精选', '实词', '其他', '自定义词书'];
    const sortedFolderKeys = Object.keys(folderGroups).sort((a, b) => {
        let idxA = folderOrder.indexOf(a);
        let idxB = folderOrder.indexOf(b);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
    });

    container.innerHTML = sortedFolderKeys.map(folderName => {
        const books = folderGroups[folderName];
        return `
                    <div class="book-folder-section" style="margin-bottom: 24px;">
                        <div class="book-folder-header" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--md-sys-color-outline-variant, #e2e8f0);">
                            <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary, #0061a4); font-size:22px;">folder</span>
                            <span class="book-folder-title" style="font-weight:700; font-size:1.02rem; color:var(--md-sys-color-on-surface);">${escapeHtml(folderName)}</span>
                            <span class="book-folder-count" style="font-size:0.8rem; color:var(--md-sys-color-outline); font-family:monospace;">(${books.length} 本)</span>
                        </div>
                        <div class="book-cover-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:12px;">
                            ${books.map(b => {
            const isSelected = isBookIdSelectedInCurrentMode(b.id);
            const gradient = getProceduralBookGradient(b.name, b.category);
            const coverUrl = b.cover || (b.path ? b.path.replace(/\.json$/i, '.png') : null) || (b.id && String(b.id).endsWith('.json') ? String(b.id).replace(/\.json$/i, '.png') : null);
            return `
                                    <div class="book-cover-card ${isSelected ? 'selected' : ''}" data-book-id="${escapeHtml(b.id)}" onclick="handleBookSelectorToggle('${escapeHtml(b.id)}')">
                                        <div class="book-cover-wrap">
                                            ${coverUrl ? `<img src="${coverUrl}" class="book-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                                            <div class="book-cover-art" style="background:${gradient}; ${coverUrl ? 'display:none;' : ''}">
                                                <span class="book-cover-art-cat">${escapeHtml(b.category || '精选')}</span>
                                                <span class="book-cover-art-title">${escapeHtml(b.name)}</span>
                                                <span class="book-cover-art-count">${b.count ? `${b.count}词` : ''}</span>
                                            </div>
                                        </div>
                                        <div class="book-card-info">
                                            <div class="book-card-header">
                                                <div class="book-card-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
                                                <div class="book-card-check-badge">
                                                    ${isSelected ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : ''}
                                                </div>
                                            </div>
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                                                <span class="badge" style="font-size:0.75rem;">${escapeHtml(b.category || '词书')}</span>
                                                <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-family:monospace;">${b.count ? `${b.count} 词` : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `;
    }).join('');
}

function updateBookSelectorDOM() {
    const cards = document.querySelectorAll('.book-cover-card[data-book-id]');
    cards.forEach(card => {
        const bId = card.getAttribute('data-book-id');
        const isSelected = isBookIdSelectedInCurrentMode(bId);
        card.classList.toggle('selected', isSelected);
        const checkBadge = card.querySelector('.book-card-check-badge');
        if (checkBadge) {
            checkBadge.innerHTML = isSelected ? '<span class="material-symbols-rounded" style="font-size:14px;">check</span>' : '';
        }
    });

    const summaryChip = document.getElementById('book-selector-summary-chip');
    if (summaryChip) {
        let selectedCount = 0;
        if (bookSelectorMode === 'single') {
            selectedCount = (typeof singleSelectedBookIds !== 'undefined') ? singleSelectedBookIds.length : 0;
        } else if (bookSelectorMode === 'shici') {
            selectedCount = (typeof shiciConfig !== 'undefined' && shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        } else if (bookSelectorMode === 'riddle') {
            selectedCount = (typeof riddleConfig !== 'undefined' && riddleConfig.selectedBooks) ? riddleConfig.selectedBooks.length : 1;
        } else if (bookSelectorMode === 'dictation') {
            selectedCount = (typeof dictationConfig !== 'undefined' && dictationConfig.selectedBooks) ? dictationConfig.selectedBooks.length : 0;
        }
        summaryChip.textContent = `已选 ${selectedCount} 本词书`;
    }
}

async function handleBookSelectorToggle(bookId) {
    const allBooks = getAllUniqueBooks();
    const bookMeta = allBooks.find(b => b.id === bookId) || { id: bookId, name: bookId };

    if (bookSelectorMode === 'single') {
        if (!Array.isArray(singleSelectedBookIds)) singleSelectedBookIds = [];
        if (singleSelectedBookIds.includes(bookId)) {
            if (singleSelectedBookIds.length > 1) {
                singleSelectedBookIds = singleSelectedBookIds.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本背单词词书');
                return;
            }
        } else {
            singleSelectedBookIds.push(bookId);
        }
        localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
        const badge = document.getElementById('single-book-badge');
        if (badge) badge.innerText = bookMeta.name;
        if (typeof singleState !== 'undefined' && singleState && typeof initSinglePlayerGame === 'function' && currentView === 'view-single') {
            initSinglePlayerGame();
        }
    } else if (bookSelectorMode === 'shici') {
        if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
        if (shiciConfig.selectedBooks.includes(bookId)) {
            if (shiciConfig.selectedBooks.length > 1) {
                shiciConfig.selectedBooks = shiciConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本实词词书');
                return;
            }
        } else {
            shiciConfig.selectedBooks.push(bookId);
        }
        saveShiCiState();
        const badge = document.getElementById('shici-book-badge');
        if (badge) badge.innerText = bookMeta.name;
    } else if (bookSelectorMode === 'riddle') {
        riddleConfig.selectedBooks = [bookId];
        riddleConfig.bookId = bookId;
        if (typeof riddleState !== 'undefined' && riddleState) {
            riddleState.bookName = bookMeta.name;
        }
        saveRiddleSettingsOnly();
        const bookTag = document.getElementById('riddle-book-tag');
        if (bookTag) bookTag.innerText = bookMeta.name;
        const topBookName = document.getElementById('riddle-top-book-name');
        if (topBookName) topBookName.innerText = bookMeta.name;
        if (currentView === 'view-riddle' && typeof startWordRiddleGame === 'function') {
            startWordRiddleGame(true);
        }
    } else if (bookSelectorMode === 'dictation') {
        if (!Array.isArray(dictationConfig.selectedBooks)) dictationConfig.selectedBooks = [];
        if (dictationConfig.selectedBooks.includes(bookId)) {
            if (dictationConfig.selectedBooks.length > 1) {
                dictationConfig.selectedBooks = dictationConfig.selectedBooks.filter(id => id !== bookId);
            } else {
                showToast('至少需保留一本默写词书');
                return;
            }
        } else {
            dictationConfig.selectedBooks.push(bookId);
        }
        saveDictationSettings();
        const badge = document.getElementById('dictation-book-badge');
        if (badge) badge.innerText = bookMeta.name;
    }

    updateBookSelectorDOM();
    showToast(`已切换词书：${bookMeta.name}，立即生效`);
}

/* --- End: views/book-selector.js --- */

/* --- Begin: views/riddle.js --- */
/**
 * Wordle 单词解谜与草稿行逻辑
 * Module: assets/js/views/riddle.js
 */

/* ==========================================================================
   Wordle 草稿行逻辑 (支持多行草稿，每格自由输入，一键填入答题格并验证)
   ========================================================================== */
let riddleDraftRows = [];
let activeRiddleDraft = null;

function initRiddleDraftRows() {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : (riddleConfig && riddleConfig.wordLength ? riddleConfig.wordLength : 5);
    riddleDraftRows = [new Array(len).fill('')];
    activeRiddleDraft = null;
    renderRiddleDraftRows();
}

function addRiddleDraftRow() {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    riddleDraftRows.push(new Array(len).fill(''));
    renderRiddleDraftRows();
    setTimeout(() => {
        const lastRowIndex = riddleDraftRows.length - 1;
        const firstTile = document.getElementById(`draft-tile-${lastRowIndex}-0`);
        if (firstTile) {
            firstTile.focus();
            firstTile.select();
        }
    }, 60);
}

function removeRiddleDraftRow(rowIndex) {
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    if (riddleDraftRows.length <= 1) {
        riddleDraftRows = [new Array(len).fill('')];
    } else {
        riddleDraftRows.splice(rowIndex, 1);
    }
    renderRiddleDraftRows();
}

function renderRiddleDraftRows() {
    const container = document.getElementById('riddle-draft-rows-container');
    if (!container) return;
    const len = (riddleState && riddleState.targetLength) ? riddleState.targetLength : 5;
    const compactClass = (len >= 9) ? 'compact-9' : ((len === 8) ? 'compact-8' : '');
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');

    if (!riddleDraftRows || riddleDraftRows.length === 0) {
        riddleDraftRows = [new Array(len).fill('')];
    }

    let html = '';
    riddleDraftRows.forEach((row, rIdx) => {
        while (row.length < len) row.push('');
        if (row.length > len) row.length = len;

        html += `<div class="riddle-draft-row" data-row="${rIdx}">`;
        html += `<div class="riddle-draft-tiles">`;
        for (let cIdx = 0; cIdx < len; cIdx++) {
            const val = row[cIdx] || '';
            const displayVal = isLower ? val.toLowerCase() : val.toUpperCase();
            html += `<input type="text"
                class="riddle-draft-tile ${compactClass} ${isLower ? 'lowercase' : ''}"
                id="draft-tile-${rIdx}-${cIdx}"
                data-row="${rIdx}"
                data-col="${cIdx}"
                maxlength="1"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                value="${escapeHtml(displayVal)}"
                onfocus="handleRiddleDraftFocus(${rIdx}, ${cIdx})"
                oninput="handleRiddleDraftInput(event, ${rIdx}, ${cIdx})"
                onkeydown="handleRiddleDraftKeydown(event, ${rIdx}, ${cIdx})"
            />`;
        }
        html += `</div>`;
        html += `<div class="riddle-draft-actions">
            <button type="button" class="btn btn-filled btn-sm riddle-draft-submit-btn" onclick="submitRiddleDraftRow(${rIdx})" title="填入答题格并验证">
                <span class="material-symbols-rounded" style="font-size:16px;">check</span>
                <span>提交</span>
            </button>
            <button type="button" class="riddle-draft-del-btn" onclick="removeRiddleDraftRow(${rIdx})" title="删除此草稿行">
                <span class="material-symbols-rounded" style="font-size:18px;">close</span>
            </button>
        </div>`;
        html += `</div>`;
    });
    container.innerHTML = html;
}

function handleRiddleDraftFocus(row, col) {
    activeRiddleDraft = { row, col };
    const input = document.getElementById(`draft-tile-${row}-${col}`);
    if (input) input.select();
}

function handleRiddleDraftInput(e, row, col) {
    const input = e.target;
    const raw = input.value || '';
    const char = raw.replace(/[^a-zA-Z]/g, '').slice(-1);
    const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
    if (char) {
        input.value = isLower ? char.toLowerCase() : char.toUpperCase();
        if (riddleDraftRows[row]) riddleDraftRows[row][col] = char.toUpperCase();
        const nextTile = document.getElementById(`draft-tile-${row}-${col + 1}`);
        if (nextTile) {
            nextTile.focus();
            nextTile.select();
        }
    } else {
        input.value = '';
        if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
    }
}

function handleRiddleDraftKeydown(e, row, col) {
    if (e.key === 'Backspace') {
        const input = e.target;
        if (!input.value || input.selectionStart === 0) {
            const prevTile = document.getElementById(`draft-tile-${row}-${col - 1}`);
            if (prevTile) {
                prevTile.focus();
                prevTile.select();
            }
        }
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevTile = document.getElementById(`draft-tile-${row}-${col - 1}`);
        if (prevTile) {
            prevTile.focus();
            prevTile.select();
        }
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextTile = document.getElementById(`draft-tile-${row}-${col + 1}`);
        if (nextTile) {
            nextTile.focus();
            nextTile.select();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitRiddleDraftRow(row);
    }
}

function submitRiddleDraftRow(rowIndex) {
    if (riddleState.gameOver) {
        showToast('本局已结束');
        return;
    }
    const row = riddleDraftRows[rowIndex];
    if (!row) return;
    const len = riddleState.targetLength;
    const guess = row.slice(0, len).map(c => (c || '').trim().toUpperCase()).join('');
    if (guess.length < len) {
        showToast(`草稿未填满，还缺少 ${len - guess.length} 个字母！`);
        for (let c = 0; c < len; c++) {
            if (!row[c] || !row[c].trim()) {
                const el = document.getElementById(`draft-tile-${rowIndex}-${c}`);
                if (el) el.focus();
                break;
            }
        }
        return;
    }
    riddleState.currentInput = guess;
    updateRiddleCurrentRow();
    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }
    activeRiddleDraft = null;
    submitRiddleRow();
}

/* ==========================================================================
   9. Wordle 单词解谜 (退出免确认、断点恢复与进度保存)
   ========================================================================== */
let riddleConfig = {
    bookId: "GaoKao3500",
    selectedBooks: ["GaoKao3500"],
    wordLength: 5,
    maxAttempts: 6,
    letterCase: "upper"
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_riddle_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.bookId) riddleConfig.bookId = saved.bookId;
        if (Array.isArray(saved.selectedBooks) && saved.selectedBooks.length > 0) {
            riddleConfig.selectedBooks = saved.selectedBooks;
        } else if (riddleConfig.bookId) {
            riddleConfig.selectedBooks = [riddleConfig.bookId];
        }
        if (saved.wordLength !== undefined) riddleConfig.wordLength = saved.wordLength;
        if (saved.maxAttempts) riddleConfig.maxAttempts = saved.maxAttempts;
        if (saved.letterCase) riddleConfig.letterCase = saved.letterCase;
    }
} catch (e) { }

let riddleState = {
    targetWord: '',
    clueMeaning: '',
    cluePhone: '',
    bookName: '',
    targetLength: 5,
    maxAttempts: 6,
    attempts: [],
    currentInput: '',
    gameOver: false,
    isWon: false,
    letterStatus: {},
    revealedPositions: new Set(),
    pendingHint: null,
    revealedMeaning: false
};

function saveRiddleProgress() {
    if (!currentUser) return;
    if (riddleState.gameOver) {
        localStorage.removeItem(`riddle_progress_${currentUser}`);
        updateHubResumeButtons();
        return;
    }
    const dataToSave = {
        targetWord: riddleState.targetWord,
        clueMeaning: riddleState.clueMeaning,
        cluePhone: riddleState.cluePhone,
        bookName: riddleState.bookName,
        targetLength: riddleState.targetLength,
        maxAttempts: riddleState.maxAttempts,
        attempts: riddleState.attempts,
        currentInput: riddleState.currentInput,
        gameOver: riddleState.gameOver,
        isWon: riddleState.isWon,
        letterStatus: riddleState.letterStatus,
        revealedPositions: Array.from(riddleState.revealedPositions || []),
        pendingHint: riddleState.pendingHint,
        revealedMeaning: riddleState.revealedMeaning,
        hintLevel: riddleState.hintLevel || 0
    };
    localStorage.setItem(`riddle_progress_${currentUser}`, JSON.stringify(dataToSave));
    updateHubResumeButtons();
}

function confirmExitRiddle() {
    saveRiddleProgress();
    switchView('view-hub');
}

function selectRiddleCase(letterCase) {
    riddleConfig.letterCase = letterCase;
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    updateRiddleCaseUI();
}

function formatRiddleCase(str) {
    if (!str || typeof str !== 'string') return str || '';
    return riddleConfig.letterCase === 'lower' ? str.toLowerCase() : str.toUpperCase();
}

function updateRiddleCaseUI() {
    document.querySelectorAll('#chips-riddle-case .md3-chip').forEach(c => {
        const cCase = c.getAttribute('data-case');
        c.classList.toggle('selected', cCase === riddleConfig.letterCase);
    });
    if (riddleState && riddleState.targetLength) {
        renderRiddleBoard();
        renderRiddleKeyboard();
        renderRiddleDraftRows();
        if (riddleState.hintLevel > 0) {
            renderRiddleHintContent();
        }
        if (riddleState.gameOver) {
            const wordEl = document.getElementById('riddle-result-word');
            if (wordEl) {
                wordEl.innerText = formatRiddleCase(riddleState.targetWord);
            }
        }
    }
}

function openRiddleSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-riddle-settings');
    if (!modal) return;
    renderRiddleBookChips();
    updateRiddleSettingsChips();
    modal.classList.add('active');
}

function closeRiddleSettings() {
    const modal = document.getElementById('modal-riddle-settings');
    if (modal) modal.classList.remove('active');
}

function toggleRiddleBook(bookId) {
    if (!Array.isArray(riddleConfig.selectedBooks)) {
        riddleConfig.selectedBooks = [riddleConfig.bookId || 'books/考纲/高考3500.json'];
    }
    const hasIt = isBookIdSelected(riddleConfig.selectedBooks, bookId);
    if (hasIt) {
        if (riddleConfig.selectedBooks.length <= 1) {
            showToast('至少保留一本词书！');
            return;
        }
        riddleConfig.selectedBooks = toggleBookIdInList(riddleConfig.selectedBooks, bookId);
    } else {
        riddleConfig.selectedBooks.push(bookId);
    }
    riddleConfig.bookId = riddleConfig.selectedBooks[0] || 'books/考纲/高考3500.json';
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    renderRiddleBookChips();
}

async function renderRiddleBookChips() {
    const container = document.getElementById('chips-riddle-books');
    if (!container) return;
    if (!Array.isArray(riddleConfig.selectedBooks) || riddleConfig.selectedBooks.length === 0) {
        riddleConfig.selectedBooks = [riddleConfig.bookId || 'GaoKao3500'];
    }
    renderBookFolderTree('chips-riddle-books', {
        selectedIds: riddleConfig.selectedBooks,
        onToggle: 'toggleRiddleBook',
        mode: 'riddle'
    });
}

function updateRiddleSettingsChips() {
    document.querySelectorAll('#chips-riddle-len .md3-chip').forEach(c => {
        const len = parseInt(c.getAttribute('data-len'));
        c.classList.toggle('selected', len === riddleConfig.wordLength);
    });
    document.querySelectorAll('#chips-riddle-attempts .md3-chip').forEach(c => {
        const att = parseInt(c.getAttribute('data-att'));
        c.classList.toggle('selected', att === riddleConfig.maxAttempts);
    });
    document.querySelectorAll('#chips-riddle-case .md3-chip').forEach(c => {
        const cCase = c.getAttribute('data-case');
        c.classList.toggle('selected', cCase === riddleConfig.letterCase);
    });
}

function selectRiddleLength(len) {
    riddleConfig.wordLength = len;
    updateRiddleSettingsChips();
}

function selectRiddleAttempts(att) {
    riddleConfig.maxAttempts = att;
    updateRiddleSettingsChips();
}

function saveRiddleSettingsOnly() {
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    updateRiddleCaseUI();
    closeRiddleSettings();
    showToast('设置已保存');
}

async function saveAndStartRiddle() {
    localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
    closeRiddleSettings();
    await startWordRiddleGame(true);
}

async function startWordRiddleGame(forceNew = false) {
    if (forceNew) {
        resetAllGameAlertsAndFeedback();
    }
    if (!forceNew && currentUser) {
        const saved = localStorage.getItem(`riddle_progress_${currentUser}`);
        if (saved) {
            try {
                const p = JSON.parse(saved);
                if (p && !p.gameOver && p.targetWord) {
                    riddleState = {
                        targetWord: p.targetWord,
                        clueMeaning: p.clueMeaning,
                        cluePhone: p.cluePhone || '',
                        bookName: p.bookName || '单词谜题',
                        targetLength: p.targetLength || p.targetWord.length,
                        maxAttempts: p.maxAttempts || 6,
                        attempts: p.attempts || [],
                        currentInput: p.currentInput || '',
                        gameOver: false,
                        isWon: false,
                        letterStatus: p.letterStatus || {},
                        hintLevel: p.hintLevel || 0,
                        isSubmitting: false,
                        revealedPositions: new Set(p.revealedPositions || []),
                        pendingHint: p.pendingHint || null,
                        revealedMeaning: p.revealedMeaning || false
                    };

                    const bookTag = document.getElementById('riddle-book-tag');
                    if (bookTag) bookTag.innerText = riddleState.bookName;
                    const topBookName = document.getElementById('riddle-top-book-name');
                    if (topBookName) topBookName.innerText = riddleState.bookName;
                    initRiddleDraftRows();
                    const hintBox = document.getElementById('riddle-hint-box');
                    if (hintBox) hintBox.style.display = riddleState.hintLevel > 0 ? 'block' : 'none';
                    const resbox = document.getElementById('riddle-result-box');
                    if (resbox) resbox.style.display = 'none';

                    renderRiddleBoard();
                    renderRiddleKeyboard();
                    if (riddleState.hintLevel > 0) renderRiddleHintContent();

                    switchView('view-riddle');
                    return;
                }
            } catch (e) { }
        }
    }

    let candidatePool = [];
    const selected = (Array.isArray(riddleConfig.selectedBooks) && riddleConfig.selectedBooks.length > 0)
        ? riddleConfig.selectedBooks
        : ['GaoKao3500'];

    candidatePool = await BookManager.loadMultipleBooks(selected);
    if (!candidatePool || candidatePool.length === 0) {
        candidatePool = (dictionary && dictionary.length > 0) ? dictionary : DEFAULT_WORDS;
    }

    const requiredLen = riddleConfig.wordLength || 0;
    const validWords = candidatePool.filter(w => {
        const wordStr = (w && w.word ? w.word : '').trim();
        if (wordStr.includes(' ') || !/^[a-zA-Z]+$/.test(wordStr)) return false;
        if (requiredLen > 0 && wordStr.length !== requiredLen) return false;
        if (requiredLen === 0 && (wordStr.length < 3 || wordStr.length > 9)) return false;
        return true;
    });

    if (validWords.length === 0) {
        showToast(`未找到长度为 ${requiredLen} 的单词，已切换为任意长度！`);
        riddleConfig.wordLength = 0;
        localStorage.setItem('vocab_riddle_config', JSON.stringify(riddleConfig));
        return startWordRiddleGame(true);
    }

    const chosen = validWords[Math.floor(Math.random() * validWords.length)];
    const targetWord = chosen.word.trim().toUpperCase();

    let meaningText = '---';
    if (chosen.meanings && chosen.meanings.length > 0) {
        meaningText = chosen.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
    } else if (chosen.meaning) {
        meaningText = chosen.meaning;
    }

    riddleState = {
        targetWord: targetWord,
        clueMeaning: meaningText,
        cluePhone: chosen.phone || '',
        bookName: chosen.bookName || '精选题库',
        targetLength: targetWord.length,
        maxAttempts: riddleConfig.maxAttempts || 6,
        attempts: [],
        currentInput: '',
        gameOver: false,
        isWon: false,
        letterStatus: {},
        hintLevel: 0,
        isSubmitting: false,
        revealedPositions: new Set(),
        pendingHint: null,
        revealedMeaning: false
    };

    saveRiddleProgress();

    resetAllGameAlertsAndFeedback();
    const bookTag = document.getElementById('riddle-book-tag');
    if (bookTag) bookTag.innerText = riddleState.bookName;
    const topBookName = document.getElementById('riddle-top-book-name');
    if (topBookName) topBookName.innerText = riddleState.bookName;
    initRiddleDraftRows();
    const hintCount = document.getElementById('riddle-hint-count');
    if (hintCount) hintCount.innerText = '0/4';

    renderRiddleBoard();
    renderRiddleKeyboard();
    switchView('view-riddle');
}

function renderRiddleBoard() {
    const grid = document.getElementById('riddle-grid');
    if (!grid) return;

    const attemptInd = document.getElementById('riddle-attempt-indicator');
    if (attemptInd) {
        const currentAtt = Math.min(riddleState.attempts.length + (riddleState.gameOver ? 0 : 1), riddleState.maxAttempts);
        attemptInd.innerText = `尝试: ${currentAtt} / ${riddleState.maxAttempts}`;
    }

    let html = '';
    const compactClass = (riddleState.targetLength >= 9) ? 'compact-9' : ((riddleState.targetLength === 8) ? 'compact-8' : '');
    for (let r = 0; r < riddleState.maxAttempts; r++) {
        html += '<div class="riddle-row">';
        if (r < riddleState.attempts.length) {
            const att = riddleState.attempts[r];
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = att.guess[c] || '';
                const displayLetter = (riddleConfig.letterCase === 'lower') ? letter.toLowerCase() : letter.toUpperCase();
                const evalClass = att.evaluation[c] || '';
                html += `<div class="riddle-tile ${evalClass} ${compactClass}">${displayLetter}</div>`;
            }
        } else if (r === riddleState.attempts.length && !riddleState.gameOver) {
            for (let c = 0; c < riddleState.targetLength; c++) {
                const letter = riddleState.currentInput[c] || '';
                const displayLetter = (riddleConfig.letterCase === 'lower') ? letter.toLowerCase() : letter.toUpperCase();
                const isCurrentActive = (c === riddleState.currentInput.length);
                html += `<div class="riddle-tile ${isCurrentActive ? 'active' : ''} ${compactClass}">${displayLetter}</div>`;
            }
        } else {
            for (let c = 0; c < riddleState.targetLength; c++) {
                html += `<div class="riddle-tile ${compactClass}"></div>`;
            }
        }
        html += '</div>';
    }
    grid.innerHTML = html;
}

function updateRiddleCurrentRow() {
    const grid = document.getElementById('riddle-grid');
    if (!grid) return;
    const currentRow = grid.children[riddleState.attempts.length];
    if (!currentRow) return;
    const tiles = currentRow.children;
    for (let c = 0; c < riddleState.targetLength; c++) {
        const tile = tiles[c];
        if (!tile) continue;
        const char = riddleState.currentInput[c] || '';
        tile.innerText = (riddleConfig.letterCase === 'lower') ? char.toLowerCase() : char.toUpperCase();
        if (c === riddleState.currentInput.length && !riddleState.gameOver) {
            tile.classList.add('active');
        } else {
            tile.classList.remove('active');
        }
    }
}

function renderRiddleKeyboard() {
    const kb = document.getElementById('riddle-keyboard');
    if (!kb) return;

    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    let html = '';
    rows.forEach(rowKeys => {
        html += '<div class="riddle-key-row">';
        rowKeys.forEach(k => {
            let extraClass = '';
            let label = k;
            if (k === 'ENTER') {
                extraClass = 'wide';
                label = '提交';
            } else if (k === 'BACKSPACE') {
                extraClass = 'wide';
                label = '⌫';
            } else {
                label = (riddleConfig.letterCase === 'lower') ? k.toLowerCase() : k.toUpperCase();
                const status = riddleState.letterStatus[k];
                if (status) extraClass = status;
            }

            html += `
                    <button type="button" class="riddle-key ${extraClass}" onclick="handleRiddleVirtualKey('${k}')">
                        ${label}
                    </button>
                `;
        });
        html += '</div>';
    });
    kb.innerHTML = html;
}

function handleRiddleVirtualKey(key) {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('riddle-draft-tile')) {
        const row = parseInt(activeEl.getAttribute('data-row'));
        const col = parseInt(activeEl.getAttribute('data-col'));
        if (key === 'ENTER') {
            submitRiddleDraftRow(row);
            return;
        } else if (key === 'BACKSPACE') {
            activeEl.value = '';
            if (riddleDraftRows[row]) riddleDraftRows[row][col] = '';
            const prev = document.getElementById(`draft-tile-${row}-${col - 1}`);
            if (prev) {
                prev.focus();
                prev.select();
            }
            return;
        } else if (/^[a-zA-Z]$/.test(key)) {
            const isLower = (typeof riddleConfig !== 'undefined' && riddleConfig.letterCase === 'lower');
            activeEl.value = isLower ? key.toLowerCase() : key.toUpperCase();
            if (riddleDraftRows[row]) riddleDraftRows[row][col] = key.toUpperCase();
            const next = document.getElementById(`draft-tile-${row}-${col + 1}`);
            if (next) {
                next.focus();
                next.select();
            }
            return;
        }
    }
    if (key === 'ENTER') {
        submitRiddleRow();
    } else if (key === 'BACKSPACE') {
        handleRiddleBackspace();
    } else {
        handleRiddleKey(key);
    }
}

// 实体键盘（物理键盘）事件监听
window.addEventListener('keydown', (e) => {
    const riddleView = document.getElementById('view-riddle');
    if (!riddleView || !riddleView.classList.contains('active')) return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }
    const openModals = document.querySelectorAll('.modal-overlay.active, .modal.active');
    if (openModals.length > 0) return;

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        handleRiddleKey(key.toUpperCase());
    } else if (key === 'Backspace') {
        e.preventDefault();
        handleRiddleBackspace();
    } else if (key === 'Enter') {
        e.preventDefault();
        submitRiddleRow();
    }
});

function handleRiddleKey(char) {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    if (riddleState.currentInput.length < riddleState.targetLength) {
        riddleState.currentInput += char.toUpperCase();
        updateRiddleCurrentRow();
        saveRiddleProgress();

        if (riddleState.currentInput.length === riddleState.targetLength) {
            riddleState.isSubmitting = true;
            setTimeout(() => {
                if (riddleState.currentInput.length === riddleState.targetLength && !riddleState.gameOver) {
                    submitRiddleRow();
                }
                riddleState.isSubmitting = false;
            }, 120);
        }
    }
}

function handleRiddleBackspace() {
    if (riddleState.gameOver || riddleState.isSubmitting) return;
    if (riddleState.currentInput.length > 0) {
        riddleState.currentInput = riddleState.currentInput.slice(0, -1);
        updateRiddleCurrentRow();
        saveRiddleProgress();
    }
}

function submitRiddleRow() {
    if (riddleState.gameOver) return;
    if (riddleState.currentInput.length < riddleState.targetLength) {
        showToast(`还缺少 ${riddleState.targetLength - riddleState.currentInput.length} 个字母！`);
        return;
    }

    const guess = riddleState.currentInput.toUpperCase();
    const target = riddleState.targetWord.toUpperCase();
    const len = riddleState.targetLength;

    const evaluation = new Array(len).fill('absent');
    const targetCounts = {};

    for (let i = 0; i < len; i++) {
        if (guess[i] === target[i]) {
            evaluation[i] = 'correct';
        } else {
            targetCounts[target[i]] = (targetCounts[target[i]] || 0) + 1;
        }
    }

    for (let i = 0; i < len; i++) {
        if (evaluation[i] !== 'correct') {
            const gChar = guess[i];
            if (targetCounts[gChar] && targetCounts[gChar] > 0) {
                evaluation[i] = 'present';
                targetCounts[gChar]--;
            } else {
                evaluation[i] = 'absent';
            }
        }
    }

    for (let i = 0; i < len; i++) {
        const gChar = guess[i];
        const res = evaluation[i];
        const curr = riddleState.letterStatus[gChar];
        if (res === 'correct') {
            riddleState.letterStatus[gChar] = 'correct';
        } else if (res === 'present' && curr !== 'correct') {
            riddleState.letterStatus[gChar] = 'present';
        } else if (res === 'absent' && !curr) {
            riddleState.letterStatus[gChar] = 'absent';
        }
    }

    const grid = document.getElementById('riddle-grid');
    const submittedRow = grid ? grid.children[riddleState.attempts.length] : null;
    if (submittedRow) {
        const tiles = submittedRow.children;
        for (let c = 0; c < len; c++) {
            const tile = tiles[c];
            if (tile) {
                tile.innerText = formatRiddleCase(guess[c]);
                tile.classList.remove('active');
                tile.classList.add(evaluation[c]);
                tile.classList.add('flip');
                tile.style.animationDelay = `${c * 80}ms`;
            }
        }
    }

    riddleState.attempts.push({ guess, evaluation });
    riddleState.currentInput = '';

    const attemptInd = document.getElementById('riddle-attempt-indicator');
    if (attemptInd) {
        const currentAtt = Math.min(riddleState.attempts.length + (riddleState.gameOver ? 0 : 1), riddleState.maxAttempts);
        attemptInd.innerText = `尝试: ${currentAtt} / ${riddleState.maxAttempts}`;
    }

    renderRiddleKeyboard();

    const isWin = (guess === target);
    if (isWin) {
        riddleState.gameOver = true;
        riddleState.isWon = true;
        saveRiddleProgress();
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record('riddle', 1);
        }
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#146C2E');
        renderRiddleResult(`🎉 恭喜猜中！用时 ${riddleState.attempts.length} 次尝试`, 'var(--md-sys-color-success)');
        return;
    }

    if (riddleState.attempts.length >= riddleState.maxAttempts) {
        riddleState.gameOver = true;
        riddleState.isWon = false;
        saveRiddleProgress();
        renderRiddleResult(`💔 失败！正确单词：`, 'var(--md-sys-color-error)');
        return;
    }

    saveRiddleProgress();

    if (grid && grid.children[riddleState.attempts.length]) {
        const nextRow = grid.children[riddleState.attempts.length];
        if (nextRow.children[0]) {
            nextRow.children[0].classList.add('active');
        }
    }
}

function getRiddleSolvedPositions() {
    let solved = new Set();
    if (riddleState.revealedPositions instanceof Set) {
        solved = new Set(riddleState.revealedPositions);
    } else if (Array.isArray(riddleState.revealedPositions)) {
        solved = new Set(riddleState.revealedPositions);
    }
    if (riddleState.attempts) {
        riddleState.attempts.forEach(att => {
            if (att.evaluation) {
                att.evaluation.forEach((ev, idx) => {
                    if (ev === 'correct') solved.add(idx);
                });
            }
        });
    }
    return solved;
}

function renderRiddleHintContent() {
    const hintContent = document.getElementById('riddle-hint-content');
    if (!hintContent) return;

    const target = riddleState.targetWord;
    const len = riddleState.targetLength;
    const solved = getRiddleSolvedPositions();

    const lettersArr = [];
    for (let i = 0; i < len; i++) {
        if (solved.has(i)) {
            lettersArr.push(formatRiddleCase(target[i]));
        } else {
            lettersArr.push('_');
        }
    }

    let html = `
            <div style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.85rem; color:var(--md-sys-color-outline);">已掌握格位：</span>
                <span class="riddle-hint-letters" style="font-size:1.15rem; font-weight:700; letter-spacing:4px;">${lettersArr.join(' ')}</span>
            </div>
        `;

    if (riddleState.pendingHint) {
        html += `
                <div style="margin-bottom:8px; display:inline-flex; align-items:center; gap:6px; background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); padding:4px 10px; border-radius:var(--md-shape-full); font-size:0.82rem; font-weight:600;">
                    <span class="material-symbols-rounded" style="font-size:16px;">lightbulb</span>
                    <span>待定位置字母：【${formatRiddleCase(riddleState.pendingHint.letter)}】（下次提示解锁具体位置）</span>
                </div>
            `;
    }

    if (riddleState.revealedMeaning) {
        html += `
                <div style="padding-top:6px; margin-top:4px; border-top:1px dashed var(--md-sys-color-outline-variant);">
                    <strong style="color:var(--md-sys-color-outline);">中文释义：</strong>
                    <span style="font-weight:600; color:var(--md-sys-color-primary); font-size:0.95rem;">${riddleState.clueMeaning}</span>
                </div>
            `;
    }

    hintContent.innerHTML = html;
}

function handleRiddleHint() {
    if (riddleState.gameOver) {
        showToast(`游戏已结束，答案为【${formatRiddleCase(riddleState.targetWord)}】`);
        return;
    }

    const target = riddleState.targetWord;
    const len = riddleState.targetLength;
    const hintBox = document.getElementById('riddle-hint-box');
    const hintTitle = document.getElementById('riddle-hint-title');
    const hintStepTip = document.getElementById('riddle-hint-step-tip');
    const hintCount = document.getElementById('riddle-hint-count');

    if (hintBox) hintBox.style.display = 'block';

    if (riddleState.revealedMeaning) {
        showToast(`提示已全部解锁！`);
        return;
    }

    const solved = getRiddleSolvedPositions();

    if (riddleState.pendingHint) {
        const pending = riddleState.pendingHint;
        if (!solved.has(pending.pos)) {
            if (!riddleState.revealedPositions) riddleState.revealedPositions = new Set();
            riddleState.revealedPositions.add(pending.pos);
            riddleState.pendingHint = null;
            riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

            if (hintTitle) hintTitle.innerText = `提示：字母位置揭晓`;
            if (hintStepTip) hintStepTip.innerText = `已指出该字母的精确格位`;
            if (hintCount) hintCount.innerText = `第 ${riddleState.hintLevel} 步`;
            renderRiddleHintContent();
            saveRiddleProgress();
            showToast(`第 ${pending.pos + 1} 个字母是【${formatRiddleCase(pending.letter)}】`);
            return;
        } else {
            riddleState.pendingHint = null;
        }
    }

    const currentSolved = getRiddleSolvedPositions();
    const unrevealed = [];
    for (let i = 0; i < len; i++) {
        if (!currentSolved.has(i)) unrevealed.push(i);
    }

    if (unrevealed.length <= 2) {
        riddleState.revealedMeaning = true;
        riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

        if (hintTitle) hintTitle.innerText = `终极线索：中文释义`;
        if (hintStepTip) hintStepTip.innerText = `仅剩 ${unrevealed.length} 个字母未填，直接给出中文释义`;
        if (hintCount) hintCount.innerText = `终极提示`;
        renderRiddleHintContent();
        saveRiddleProgress();
        showToast(`还有 ${unrevealed.length} 个字母未填`);
        return;
    }

    const randomPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = target[randomPos];
    riddleState.pendingHint = { letter, pos: randomPos };
    riddleState.hintLevel = (riddleState.hintLevel || 0) + 1;

    if (hintTitle) hintTitle.innerText = `提示：包含字母`;
    if (hintStepTip) hintStepTip.innerText = `包含该字母，下次提示将指出其具体格位`;
    if (hintCount) hintCount.innerText = `第 ${riddleState.hintLevel} 步`;
    renderRiddleHintContent();
    saveRiddleProgress();
    showToast(`提示：含有字母【${formatRiddleCase(letter)}】`);
}

function renderRiddleResult(title, titleColor) {
    const resbox = document.getElementById('riddle-result-box');
    if (!resbox) return;
    resbox.style.display = 'block';

    const titleEl = document.getElementById('riddle-result-title');
    if (titleEl) {
        titleEl.innerText = title;
        titleEl.style.color = titleColor || 'var(--md-sys-color-primary)';
    }

    const wordEl = document.getElementById('riddle-result-word');
    if (wordEl) wordEl.innerText = (riddleConfig.letterCase === 'lower') ? riddleState.targetWord.toLowerCase() : riddleState.targetWord.toUpperCase();

    const phoneEl = document.getElementById('riddle-result-phone');
    if (phoneEl) phoneEl.innerText = riddleState.cluePhone || '';

    const meaningEl = document.getElementById('riddle-result-meaning');
    if (meaningEl) meaningEl.innerText = riddleState.clueMeaning || '---';
}

function giveUpRiddle() {
    if (riddleState.gameOver) return;
    if (confirm(`确认揭晓答案吗？`)) {
        riddleState.gameOver = true;
        saveRiddleProgress();
        renderRiddleBoard();
        renderRiddleKeyboard();
        renderRiddleResult('揭晓答案', 'var(--md-sys-color-primary)');
    }
}

/* --- End: views/riddle.js --- */

/* --- Begin: views/single.js --- */
/**
 * 单人自学练习模式 (闪卡/选择/拼写/复习)
 * Module: assets/js/views/single.js
 */

/* ==========================================================================
   5. 学习练习模式核心控制 (免二次确认、进度保存与断点恢复)
   ========================================================================== */
function openSingleBookSelector() {
    // 每次打开弹窗时，重置所有分类文件夹默认收起
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-single-books');
    if (modal) {
        modal.classList.add('active');
        renderSingleBookList();
    }
}

function closeSingleBookSelector() {
    const modal = document.getElementById('modal-single-books');
    if (modal) modal.classList.remove('active');
}

function renderSingleBookList() {
    const listEl = document.getElementById('single-book-list');
    if (!listEl) return;

    if (!Array.isArray(singleSelectedBookIds)) {
        singleSelectedBookIds = ['books/考纲/高考3500.json'];
    }

    renderBookFolderTree('single-book-list', {
        selectedIds: singleSelectedBookIds,
        onToggle: 'toggleSingleBook',
        isSingleSelect: false,
        mode: 'single'
    });

    updateSingleSelectedSummary();
}

function toggleSingleBook(bookId) {
    singleSelectedBookIds = toggleBookIdInList(singleSelectedBookIds, bookId);
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    renderSingleBookList();
}

function selectAllSingleBooks(selectAll) {
    if (selectAll) {
        const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;
        singleSelectedBookIds = allBooks.filter(b => b.id !== 'GaoKao3500').map(b => b.id);
    } else {
        singleSelectedBookIds = [];
    }
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    renderSingleBookList();
}

async function refreshBooksFromWorker(notify = false) {
    if (notify) showToast('正在获取词书...');
    const res = await BookManager.fetchBookList();
    renderSingleBookList();
    renderRoomBookChips();
    if (notify) {
        if (res.success) {
            showToast(`成功同步 ${res.books.length} 本云端词书！`);
        } else {
            showToast('词书获取失败！');
        }
    }
}

function updateSingleSelectedSummary() {
    const count = (singleSelectedBookIds || []).length;
    const summary = document.getElementById('single-selected-summary');
    if (summary) {
        summary.innerText = count > 0 ? `已勾选 ${count} 本词书` : '未勾选任何词书';
        summary.style.color = count > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)';
    }
    const startBtn = document.getElementById('btn-start-single-quiz');
    if (startBtn) {
        startBtn.disabled = (count === 0);
    }
    const hubLearnBtn = document.getElementById('btn-hub-learn');
    if (hubLearnBtn) {
        hubLearnBtn.disabled = (count === 0);
    }
}

function openShiCiBookSelector() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-shici-books');
    if (modal) {
        modal.classList.add('active');
        renderShiCiBookList();
    }
}

function closeShiCiBookSelector() {
    const modal = document.getElementById('modal-shici-books');
    if (modal) modal.classList.remove('active');
    saveShiCiState();
    updateHubShiCiBadge();
}

function renderShiCiBookList() {
    const listEl = document.getElementById('shici-book-list');
    if (!listEl) return;

    loadShiCiSettings();
    if (!shiciConfig.selectedBooks || !Array.isArray(shiciConfig.selectedBooks) || shiciConfig.selectedBooks.length === 0) {
        shiciConfig.selectedBooks = ['books/实词/实词.json'];
    }

    renderBookFolderTree('shici-book-list', {
        selectedIds: shiciConfig.selectedBooks,
        onToggle: 'toggleShiCiBook',
        isSingleSelect: false,
        mode: 'shici',
        filterType: 'shici'
    });

    updateShiCiSelectedSummary();
}

function toggleShiCiBook(bookId) {
    loadShiCiSettings();
    if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
    shiciConfig.selectedBooks = toggleBookIdInList(shiciConfig.selectedBooks, bookId);
    saveShiCiState();
    renderShiCiBookList();
    updateShiCiSelectedSummary();
    updateHubShiCiBadge();
}

function selectAllShiCiBooks(selectAll) {
    loadShiCiSettings();
    const allBooks = BookManager.availableBooks.length > 0 ? BookManager.availableBooks : BookManager.fallbackBooks;
    const shiciBooks = allBooks.filter(b => isShiCiBook(b)).concat((window.customBooks || []).filter(b => isShiCiBook(b)));
    if (selectAll) {
        shiciConfig.selectedBooks = shiciBooks.map(b => b.id);
    } else {
        shiciConfig.selectedBooks = [];
    }
    saveShiCiState();
    renderShiCiBookList();
    updateShiCiSelectedSummary();
    updateHubShiCiBadge();
}

function updateShiCiSelectedSummary() {
    const el = document.getElementById('shici-selected-books-summary');
    if (el) {
        const count = Array.isArray(shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        el.innerText = count > 0 ? `已勾选 ${count} 本实词词书` : '未勾选实词词书';
        el.style.color = count > 0 ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-error)';
    }
    const learnBtn = document.getElementById('btn-hub-shici-learn');
    if (learnBtn) {
        const count = Array.isArray(shiciConfig.selectedBooks) ? shiciConfig.selectedBooks.length : 0;
        learnBtn.disabled = (count === 0);
    }
}

function loadCustomShiCiBook(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!Array.isArray(data)) throw new Error('实词词书必须是包含实词条目的JSON数组');
                const bookId = 'custom_shici_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
                const bookName = file.name.replace(/\.json$/i, '');
                const newBook = {
                    id: bookId,
                    name: bookName,
                    rawName: bookName,
                    category: '实词',
                    type: 'shici',
                    isShiCi: true,
                    isCloud: false,
                    count: data.length,
                    words: data
                };
                window.customBooks = window.customBooks || [];
                window.customBooks.push(newBook);
                localStorage.setItem('vocab_custom_books', JSON.stringify(window.customBooks));
                loadShiCiSettings();
                if (!Array.isArray(shiciConfig.selectedBooks)) shiciConfig.selectedBooks = [];
                shiciConfig.selectedBooks.push(bookId);
                saveShiCiState();
                renderShiCiBookList();
                updateShiCiSelectedSummary();
                updateHubShiCiBadge();
                showToast(`已成功导入实词词书《${bookName}》`);
            } catch (err) {
                alert('导入实词词书失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
    event.target.value = '';
}

let singleConfig = JSON.parse(localStorage.getItem('vocab_single_config') || '{"learnBatch":10,"reviewBatch":20,"immediateRetest":true,"autoPlayAudio":false}');
if (singleConfig.immediateRetest === undefined) singleConfig.immediateRetest = true;
if (singleConfig.autoPlayAudio === undefined) singleConfig.autoPlayAudio = false;

function openSingleSettings() {
    const modal = document.getElementById('modal-single-settings');
    if (!modal) return;
    const tip = document.getElementById('audio-online-tip');
    if (tip) {
        tip.innerText = navigator.onLine ? '(需联网)' : '(离线不可用)';
        tip.style.color = navigator.onLine ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-error)';
    }
    updateSingleSettingsChips();
    updateSingleProgressStatusUI(); // 检查并更新当前进度状态
    modal.classList.add('active');
}

// 检查当前是否有正在进行的断点进度，并更新提示与按钮状态
function updateSingleProgressStatusUI() {
    const tipEl = document.getElementById('single-progress-status-tip');
    const clearBtn = document.getElementById('btn-clear-single-progress');
    if (!tipEl || !clearBtn || !currentUser) return;

    const saved = localStorage.getItem(`single_progress_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                tipEl.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                tipEl.style.color = 'var(--md-sys-color-primary)';
                clearBtn.disabled = false;
                return;
            }
        } catch (e) { }
    }
    tipEl.innerText = '无';
    tipEl.style.color = 'var(--md-sys-color-outline)';
    clearBtn.disabled = true; // 无进度时禁用清除按钮
}

// 清除保存的学习进度
function clearCurrentSingleProgress() {
    if (!currentUser) return;
    localStorage.removeItem(`single_progress_${currentUser}`);
    updateHubResumeButtons();       // 首页按钮恢复为“学习新词”
    updateSingleProgressStatusUI(); // 更新当前弹窗内的提示
    showToast('已清除当前学习进度');
}

function closeSingleSettings() {
    const modal = document.getElementById('modal-single-settings');
    if (modal) modal.classList.remove('active');
}

function updateSingleSettingsChips() {
    document.querySelectorAll('#chips-learn-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === singleConfig.learnBatch);
    });
    document.querySelectorAll('#chips-review-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === singleConfig.reviewBatch);
    });
    const retestSwitch = document.getElementById('switch-single-retest');
    if (retestSwitch) {
        retestSwitch.checked = (singleConfig.immediateRetest !== false);
    }
    const autoplaySwitch = document.getElementById('switch-single-autoplay');
    if (autoplaySwitch) {
        autoplaySwitch.checked = (singleConfig.autoPlayAudio === true);
    }
}

function toggleSingleRetestSwitch(checked) {
    singleConfig.immediateRetest = checked;
    showToast(checked ? '即时复习已开启' : '即时复习已关闭');
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
}

function toggleSingleAutoplaySwitch(checked) {
    if (!navigator.onLine && checked) {
        showToast('当前未联网，无法开启发音');
        const autoplaySwitch = document.getElementById('switch-single-autoplay');
        if (autoplaySwitch) autoplaySwitch.checked = false;
        singleConfig.autoPlayAudio = false;
        localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
        return;
    }
    singleConfig.autoPlayAudio = checked;
    showToast(checked ? '自动发音已开启' : '自动发音已关闭');
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
}

function selectLearnBatch(val) {
    singleConfig.learnBatch = val;
    updateSingleSettingsChips();
}

function selectReviewBatch(val) {
    singleConfig.reviewBatch = val;
    updateSingleSettingsChips();
}

function selectImmediateRetest(val) {
    singleConfig.immediateRetest = val;
    updateSingleSettingsChips();
}

function selectAutoPlayAudio(val) {
    if (!navigator.onLine && val) {
        showToast('当前未联网，无法开启发音');
        return;
    }
    singleConfig.autoPlayAudio = val;
    updateSingleSettingsChips();
}

function saveSingleSettings() {
    localStorage.setItem('vocab_single_config', JSON.stringify(singleConfig));
    closeSingleSettings();
    showToast('设置已保存');
}


function renderCardMasteryDiamonds(word, animType = null) {
    const bar = document.getElementById('single-mastery-stars');
    if (!bar) return;

    let targetStage = 0;
    if (word) {
        if (isWordMastered(word)) {
            targetStage = 5;
        } else {
            const records = EbbinghausEngine.getRecords();
            const rec = records[word.trim().toLowerCase()];
            if (rec && typeof rec.stage === 'number') {
                targetStage = rec.stage;
            }
        }
    }

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`mastery-star-${i}`);
        if (star) {
            star.classList.remove('anim-gain', 'anim-loss');
            star.style.animation = 'none';
        }
    }
    void bar.offsetWidth; // 强制容器重排以重置所有子元素动效

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`mastery-star-${i}`);
        if (!star) continue;
        star.style.animation = '';

        const wasFilled = star.classList.contains('filled');
        const willFill = i <= targetStage;

        if (willFill) {
            star.innerText = '◆';
            star.classList.add('filled');
        } else {
            star.innerText = '◇';
            star.classList.remove('filled');
        }

        if (animType === 'gain' && willFill && !wasFilled) {
            star.style.animationDelay = `${(i - 1) * 80}ms`;
            star.classList.add('anim-gain');
        } else if (animType === 'loss' && !willFill && wasFilled) {
            star.style.animationDelay = `${(5 - i) * 60}ms`;
            star.classList.add('anim-loss');
        } else {
            star.style.animationDelay = '0ms';
        }
    }
}

function scheduleRetestForCurrentQuestion() {
    if (gameMode !== 'single') return;
    if (singleConfig.immediateRetest === false) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || q._retestScheduled) return;
    q._retestScheduled = true;

    const retestQ1 = { ...q, _isRetest: true, _retestScheduled: false };

    // 插入到当前题后第 4 题（过 3 题后重问）
    const insertPos = singleState.currentIdx + 4;
    if (insertPos < singleState.pool.length) {
        singleState.pool.splice(insertPos, 0, retestQ1);
    } else {
        singleState.pool.push(retestQ1);
    }

    // 优化即时复习：如果多次答错（当前本身已是复测题）或后续队列已包含该词，不再在组末多问一遍
    const alreadyScheduledLater = singleState.pool.slice(singleState.currentIdx + 1).some(item => item.word === q.word);
    if (!q._isRetest && !alreadyScheduledLater) {
        const retestQ2 = { ...q, _isRetest: true, _retestScheduled: false };
        singleState.pool.push(retestQ2);
    }
    saveSingleProgress();
}

// 保存学习模式当前进度
function saveSingleProgress() {
    if (!currentUser || gameMode !== 'single' || !singleState || !singleState.pool || singleState.pool.length === 0) return;
    if (singleState.currentIdx >= singleState.pool.length) {
        localStorage.removeItem(`single_progress_${currentUser}`);
        updateHubResumeButtons();
        return;
    }
    const dataToSave = {
        pool: singleState.pool,
        currentIdx: singleState.currentIdx,
        score: singleState.score,
        total: singleState.total,
        sessionName: singleState.sessionName,
        time: Date.now()
    };
    localStorage.setItem(`single_progress_${currentUser}`, JSON.stringify(dataToSave));
    updateHubResumeButtons();
}

// 学习新词入口 (支持断点恢复)
async function startSingleLearning() {
    if (currentUser) {
        const saved = localStorage.getItem(`single_progress_${currentUser}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.pool && parsed.currentIdx < parsed.pool.length) {
                    singleState = {
                        pool: parsed.pool,
                        currentIdx: parsed.currentIdx,
                        score: parsed.score || 0,
                        total: parsed.total || 0,
                        sessionName: parsed.sessionName || '新词学习',
                        answered: false,
                        selectedIdx: -1
                    };
                    gameMode = 'single';
                    const titleEl = document.getElementById('single-mode-title');
                    if (titleEl) titleEl.innerText = singleState.sessionName;
                    renderSingleQuestion();
                    switchView('view-single');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
            showToast('请至少选择一本词书！');
            openSingleBookSelector();
            return;
        }
        const words = await BookManager.loadMultipleBooks(singleSelectedBookIds);
        if (!words || words.length === 0) {
            showToast('未获取到词书词汇，请检查网络或选择词书！');
            return;
        }
        dictionary = words;

        const learnedMap = EbbinghausEngine.getRecords();
        const candidateWords = words.filter(w => {
            if (!w || !w.word) return false;
            const k = w.word.trim().toLowerCase();
            if (isWordMastered(k)) return false;
            const rec = learnedMap[k];
            if (rec && rec.stage >= 1) return false;
            return true;
        });

        if (candidateWords.length === 0) {
            showToast('所选词书中的生词已全部学完！请前往【复习】巩固，或在设置中重置词书进度。');
            return;
        }

        const batchSize = singleConfig.learnBatch || 10;
        const shuffled = [...candidateWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const pool = generateShuffledPoolFromWords(shuffled, shuffled.length);

        startSinglePlayerWithPool(pool, '新词学习');
    } catch (err) {
        alert('启动学习失败: ' + err.message);
    }
}

let currentReviewBookId = 'all';

function getBooksWithDueWords() {
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const all = allBooks.concat(window.customBooks || []);
    const seen = new Set();
    const uniqueBooks = [];
    all.forEach(b => {
        if (b && b.id && !seen.has(b.id)) {
            seen.add(b.id);
            uniqueBooks.push(b);
        }
    });

    return uniqueBooks.filter(b => {
        const due = EbbinghausEngine.getDueWordsForBooks([b.id]);
        return due && due.length > 0;
    });
}

function updateReviewPageActiveBookLabel() {
    const titleEl = document.getElementById('single-review-active-book-title');
    const container = document.getElementById('single-review-book-picker-container');
    if (!titleEl || !container) return;

    if (!singleState || singleState.sessionName !== '复习') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'inline-flex';

    if (currentReviewBookId === 'all') {
        titleEl.innerText = '全部词书';
    } else {
        const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
            ? BookManager.availableBooks
            : BookManager.fallbackBooks;
        const all = allBooks.concat(window.customBooks || []);
        const target = all.find(b => b.id === currentReviewBookId);
        const name = target ? (target.rawName || target.name || '当前词书').replace(/^[📂📁\s]+/, '') : '当前词书';
        titleEl.innerText = name;
    }
}

function toggleReviewPageBookDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('single-review-book-menu');
    if (!menu) return;
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    if (isHidden) {
        renderReviewPageBookDropdown();
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function renderReviewPageBookDropdown() {
    const menu = document.getElementById('single-review-book-menu');
    if (!menu) return;

    const booksWithDue = getBooksWithDueWords();
    const totalDue = EbbinghausEngine.getDueWords().length;

    let html = '';

    const isAllActive = currentReviewBookId === 'all';
    html += `
                <div class="md3-custom-select-option ${isAllActive ? 'selected' : ''}" onclick="switchReviewBook('all')" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="material-symbols-rounded" style="font-size:16px;">${isAllActive ? 'check' : 'layers'}</span>
                        <span style="font-weight:600; font-size:0.88rem;">全部待复习</span>
                    </div>
                    <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary);">${totalDue} 词</span>
                </div>
            `;

    if (booksWithDue.length === 0) {
        html += `<div style="padding:10px 12px; font-size:0.82rem; color:var(--md-sys-color-outline); text-align:center;">暂无待复习词书</div>`;
    } else {
        html += `<div style="height:1px; background:var(--md-sys-color-outline-variant, #e2e8f0); margin:4px 0;"></div>`;
        booksWithDue.forEach(b => {
            const isSelected = currentReviewBookId === b.id;
            const dueCount = EbbinghausEngine.getDueWordsForBooks([b.id]).length;
            const bName = escapeHtml(cleanBookName(b.rawName || b.name));
            html += `
                        <div class="md3-custom-select-option ${isSelected ? 'selected' : ''}" onclick="switchReviewBook('${escapeHtml(b.id)}')" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; cursor:pointer;">
                            <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                                <span class="material-symbols-rounded" style="font-size:16px; flex-shrink:0;">${isSelected ? 'check' : 'menu_book'}</span>
                                <span style="font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${bName}</span>
                            </div>
                            <span style="font-size:0.78rem; font-weight:600; color:var(--md-sys-color-primary); margin-left:6px; flex-shrink:0;">${dueCount} 词</span>
                        </div>
                    `;
        });
    }

    menu.innerHTML = html;
}

function switchReviewBook(bookId) {
    const menu = document.getElementById('single-review-book-menu');
    if (menu) menu.style.display = 'none';
    if (bookId === currentReviewBookId) return;
    startSingleReview(bookId);
}

// 记录本轮已复习单词，杜绝连续点击“继续复习”时无限重复上一轮单词
let sessionReviewedWords = new Set();

// 艾宾浩斯复习入口 (按所选词书或指定词书复习，当前词书复习完自动复习下一本)
async function startSingleReview(specificBookId = null) {
    try {
        currentReviewBookId = specificBookId || 'all';

        let targetBookIds = [];
        if (specificBookId && specificBookId !== 'all') {
            targetBookIds = [specificBookId];
        } else {
            const booksWithDue = getBooksWithDueWords();
            if (booksWithDue.length > 0) {
                targetBookIds = booksWithDue.map(b => b.id);
            } else {
                targetBookIds = (singleSelectedBookIds && singleSelectedBookIds.length > 0) ? singleSelectedBookIds : ['GaoKao3500'];
            }
        }

        let words = await BookManager.loadMultipleBooks(targetBookIds);
        if (!words || words.length === 0) {
            showToast('未获取到词书词汇，请检查网络或选择词书！');
            return;
        }

        let wordMap = new Map();
        words.forEach(w => {
            if (w && w.word) wordMap.set(w.word.trim().toLowerCase(), w);
        });

        let dueRecords = EbbinghausEngine.getDueWordsForBooks(targetBookIds);
        // 关键修复：排除本轮会话已复习过的词汇
        let unreviewedDue = dueRecords.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));

        // 如果指定词书的到期待复习词已在本会话全部复习完毕，自动尝试切换下一本有待复习词的词书
        if (unreviewedDue.length === 0 && specificBookId && specificBookId !== 'all') {
            const allBooksWithDue = getBooksWithDueWords().filter(b => {
                const dues = EbbinghausEngine.getDueWordsForBooks([b.id]);
                return dues.some(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));
            });
            if (allBooksWithDue.length > 0) {
                const nextBook = allBooksWithDue.find(b => b.id !== specificBookId) || allBooksWithDue[0];
                if (nextBook) {
                    const allBooks = (BookManager.availableBooks || []).concat(window.customBooks || []);
                    const oldBook = allBooks.find(b => b.id === specificBookId);
                    const oldName = (oldBook ? (oldBook.rawName || oldBook.name) : '当前词书').replace(/^[📂📁\s]+/, '');
                    const nextName = (nextBook.rawName || nextBook.name || '').replace(/^[📂📁\s]+/, '');
                    specificBookId = nextBook.id;
                    currentReviewBookId = nextBook.id;
                    targetBookIds = [specificBookId];
                    const reloadedWords = await BookManager.loadMultipleBooks(targetBookIds);
                    if (reloadedWords && reloadedWords.length > 0) {
                        wordMap.clear();
                        reloadedWords.forEach(w => {
                            if (w && w.word) wordMap.set(w.word.trim().toLowerCase(), w);
                        });
                        dueRecords = EbbinghausEngine.getDueWordsForBooks(targetBookIds);
                        unreviewedDue = dueRecords.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));
                        showToast(`《${oldName}》已复习完，自动继续复习《${nextName}》`);
                    }
                }
            }
        }

        let reviewTargets = [];
        if (unreviewedDue.length > 0) {
            reviewTargets = [...unreviewedDue].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
        } else {
            // 无急需待复习词汇时，抽取已学但尚未熟练掌握的词汇进行强化
            const allLearned = EbbinghausEngine.getAllLearnedWords().filter(r => {
                const k = (r.word || '').trim().toLowerCase();
                return wordMap.has(k) && !isWordMastered(k);
            });

            let unreviewedLearned = allLearned.filter(r => !sessionReviewedWords.has((r.word || '').trim().toLowerCase()));

            if (unreviewedLearned.length === 0) {
                if (allLearned.length === 0) {
                    showToast('🎉 所有词书均已完成复习！暂无待复习词汇');
                    return;
                }
                // 如果所有已学词汇在本会话中均已复习过至少一遍，重置会话去重集，允许开始新一轮强化
                sessionReviewedWords.clear();
                unreviewedLearned = allLearned;
            }

            reviewTargets = [...unreviewedLearned].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
        }

        const batchSize = singleConfig.reviewBatch || 20;
        const selectedBatch = reviewTargets.slice(0, batchSize);

        const wordsList = selectedBatch.map(r => {
            const existing = wordMap.get(r.word.toLowerCase());
            const bId = r.bookId || (targetBookIds.length > 0 ? targetBookIds[0] : null);
            if (existing) {
                return { ...existing, bookId: bId, bookName: '复习' };
            }
            return {
                word: r.word,
                phone: r.phone || '',
                bookId: bId,
                bookName: '复习',
                meanings: [{ pos: '', meaning: r.meaning || '---' }]
            };
        });

        const pool = generateShuffledPoolFromWords(wordsList, wordsList.length);
        startSinglePlayerWithPool(pool, '复习');
        updateReviewPageActiveBookLabel();
    } catch (err) {
        alert('启动复习失败: ' + err.message);
    }
}

async function startSinglePlayerFromSelectedBooks() {
    if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    const btn = document.getElementById('btn-start-single-quiz');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-label-text">正在加载题库...</span>';
    }

    try {
        const words = await BookManager.loadMultipleBooks(singleSelectedBookIds);
        const learnedMap = EbbinghausEngine.getRecords();

        // 核心修改：严格排除已经学过的词（已在记忆库中且 stage >= 1）以及熟词
        const candidateWords = words.filter(w => {
            if (!w || !w.word) return false;
            const k = w.word.trim().toLowerCase();
            if (isWordMastered(k)) return false;
            const rec = learnedMap[k];
            // stage >= 1 代表已经学过进入复习阶段，新学模式中不再抽取
            if (rec && rec.stage >= 1) return false;
            return true;
        });

        if (candidateWords.length === 0) {
            showToast('所选词书中的生词已全部学完！请前往【复习】巩固，或在设置中重置词书进度。');
            return;
        }

        closeSingleBookSelector();
        dictionary = words;
        const batchSize = singleConfig.learnBatch || 10;
        const shuffled = [...candidateWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const pool = generateShuffledPoolFromWords(shuffled, shuffled.length);
        startSinglePlayerWithPool(pool, '单人练习');
    } catch (err) {
        alert('加载词书失败：' + err.message);
    } finally {
        if (btn) {
            btn.disabled = (!singleSelectedBookIds || singleSelectedBookIds.length === 0);
            btn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span><span class="btn-label-text">开始练习</span>';
        }
    }
}

function startSinglePlayerWithPool(pool, defaultBookName = '单人练习') {
    resetAllGameAlertsAndFeedback();
    gameMode = 'single';
    singleState = {
        pool: pool,
        currentIdx: 0,
        answered: false,
        selectedIdx: -1,
        score: 0,
        total: 0,
        sessionName: defaultBookName
    };
    saveSingleProgress();
    const titleEl = document.getElementById('single-mode-title');
    if (titleEl) titleEl.innerText = defaultBookName;
    if (typeof updateReviewPageActiveBookLabel === 'function') {
        updateReviewPageActiveBookLabel();
    }
    renderSingleQuestion();
    switchView('view-single');
}

// 退出单人练习：直接退出无需二次确认，并实时保存进度
function confirmExitSingle() {
    saveSingleProgress();
    switchView('view-hub');
}

/* --- End: views/single.js --- */

/* --- Begin: views/words-engine.js --- */
/**
 * 形近词挖掘与固定搭配词组拼装引擎
 * Module: assets/js/views/words-engine.js
 */

/* ==========================================================================
   形近词挖掘与词组拼装引擎
   ========================================================================== */
function calcLevenshteinDist(s1, s2) {
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

let _allDbWordsCache = null;
let _allDbWordsCacheTime = 0;

function getAllDatabaseWords() {
    const now = Date.now();
    if (_allDbWordsCache && (now - _allDbWordsCacheTime < 10000)) {
        return _allDbWordsCache;
    }

    const wordSet = new Set();
    const addWord = (w) => {
        if (!w || typeof w !== 'string') return;
        const clean = w.trim().toLowerCase();
        if (clean.length >= 2 && clean.length <= 18 && !clean.includes(' ') && /^[a-z'-]+$/.test(clean)) {
            wordSet.add(clean);
        }
    };

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        Object.values(BookManager.bookCache).forEach(bookWords => {
            if (Array.isArray(bookWords)) {
                bookWords.forEach(item => {
                    if (item && item.word) addWord(item.word);
                });
            }
        });
    }

    if (typeof BookManager !== 'undefined' && Array.isArray(BookManager.fallbackBooks)) {
        BookManager.fallbackBooks.forEach(b => {
            if (Array.isArray(b.words)) {
                b.words.forEach(item => {
                    if (item && (item.word || item.name)) addWord(item.word || item.name);
                });
            }
        });
    }

    if (Array.isArray(window.customBooks)) {
        window.customBooks.forEach(b => {
            if (Array.isArray(b.words)) {
                b.words.forEach(item => {
                    if (item && (item.word || item.name)) addWord(item.word || item.name);
                });
            }
        });
    }

    if (typeof dictionary !== 'undefined' && Array.isArray(dictionary)) {
        dictionary.forEach(item => {
            if (item && item.word) addWord(item.word);
        });
    }
    if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS)) {
        DEFAULT_WORDS.forEach(item => {
            if (item && item.word) addWord(item.word);
        });
    }

    _allDbWordsCache = Array.from(wordSet);
    _allDbWordsCacheTime = now;
    return _allDbWordsCache;
}

const PREPOSITION_COLLOCATION_MAP = {
    'to': ['for', 'with', 'of', 'at', 'in', 'towards', 'into', 'by'],
    'on': ['in', 'at', 'upon', 'over', 'off', 'under', 'to', 'with'],
    'in': ['on', 'at', 'into', 'within', 'by', 'to', 'for', 'with'],
    'at': ['in', 'on', 'by', 'to', 'for', 'near', 'with'],
    'for': ['to', 'of', 'with', 'about', 'from', 'in', 'at'],
    'of': ['for', 'to', 'with', 'about', 'off', 'from', 'in'],
    'with': ['to', 'for', 'by', 'without', 'against', 'in', 'of'],
    'by': ['with', 'for', 'through', 'in', 'at', 'from', 'on'],
    'from': ['of', 'to', 'away', 'out', 'off', 'since', 'for'],
    'up': ['down', 'out', 'off', 'over', 'away', 'in', 'on'],
    'down': ['up', 'off', 'away', 'out', 'under', 'in'],
    'out': ['in', 'up', 'off', 'away', 'of', 'down', 'over'],
    'off': ['on', 'of', 'out', 'away', 'up', 'down', 'in'],
    'about': ['for', 'of', 'around', 'on', 'to', 'with'],
    'over': ['under', 'above', 'on', 'through', 'across', 'off'],
    'into': ['onto', 'in', 'to', 'through', 'inside', 'toward'],
    'away': ['back', 'out', 'off', 'up', 'from', 'down'],
    'after': ['before', 'for', 'at', 'behind', 'with'],
    'before': ['after', 'ago', 'until', 'since'],
    'through': ['across', 'over', 'throughout', 'by', 'in'],
    'against': ['for', 'with', 'towards', 'to'],
    'under': ['over', 'below', 'beneath', 'down', 'in'],
    'around': ['about', 'round', 'near', 'over', 'across'],
    'behind': ['before', 'after', 'beyond', 'back'],
    'between': ['among', 'amid', 'with'],
    'among': ['between', 'amid', 'in']
};

const PHRASE_LOOKALIKE_MAP = {
    'mail': ['male', 'nail', 'sail', 'rail', 'post'],
    'junk': ['trunk', 'pack', 'bunk', 'punk'],
    'look': ['book', 'took', 'lock', 'hook', 'loop'],
    'forward': ['foreword', 'toward', 'reward', 'backward'],
    'rely': ['relay', 'reply', 'delay', 'rally'],
    'break': ['brake', 'bread', 'bleak', 'brick'],
    'take': ['make', 'lake', 'bake', 'bring'],
    'give': ['live', 'dive', 'gift', 'gain'],
    'make': ['take', 'wake', 'mark', 'mask'],
    'turn': ['burn', 'tune', 'tour', 'torn'],
    'hold': ['cold', 'gold', 'bold', 'hole'],
    'stand': ['strand', 'spend', 'standard', 'start'],
    'fall': ['fill', 'fell', 'ball', 'call'],
    'come': ['comb', 'cone', 'calm', 'core'],
    'put': ['pot', 'pit', 'pat', 'pull'],
    'set': ['sit', 'seat', 'suit', 'sec'],
    'get': ['got', 'gut', 'gate', 'net'],
    'call': ['calm', 'cell', 'cool', 'coal'],
    'hand': ['hard', 'head', 'band', 'land'],
    'way': ['day', 'say', 'ray', 'may'],
    'time': ['tame', 'tide', 'team', 'item'],
    'care': ['cure', 'core', 'case', 'dare'],
    'run': ['ran', 'rain', 'ruin', 'ring'],
    'point': ['joint', 'paint', 'print', 'plant']
};

const STOP_FUNCTION_WORDS = new Set([
    'a', 'an', 'the', 'this', 'that', 'these', 'those', 'it', 'its',
    'he', 'his', 'him', 'she', 'her', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your',
    'and', 'or', 'but', 'so', 'if', 'then', 'as', 'than', 'nor', 'yet',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
    ...Object.keys(PREPOSITION_COLLOCATION_MAP)
]);

function findLookalikesFromDatabase(targetWord, maxCount = 2) {
    const allWords = getAllDatabaseWords();
    const target = targetWord.toLowerCase().replace(/[^a-z]/g, '');
    const tLen = target.length;
    if (tLen < 2) return [];

    const scored = [];
    const maxAllowedLenDiff = tLen >= 7 ? 3 : 2;
    const maxAllowedDist = tLen <= 4 ? 2 : (tLen <= 7 ? 3 : 4);

    for (const cand of allWords) {
        if (cand === target) continue;
        const cLen = cand.length;
        const lenDiff = Math.abs(cLen - tLen);
        if (lenDiff > maxAllowedLenDiff) continue;

        const sameFirst = target[0] === cand[0];
        const sameLast = target[tLen - 1] === cand[cLen - 1];
        if (!sameFirst && !sameLast && lenDiff > 1) continue;

        const dist = calcLevenshteinDist(target, cand);
        if (dist > maxAllowedDist) continue;

        let prefixBonus = 0;
        if (tLen >= 3 && cand.slice(0, 3) === target.slice(0, 3)) prefixBonus = 4;
        else if (cand.slice(0, 2) === target.slice(0, 2)) prefixBonus = 2.5;
        else if (sameFirst) prefixBonus = 1;

        let suffixBonus = 0;
        if (tLen >= 3 && cand.slice(-3) === target.slice(-3)) suffixBonus = 3;
        else if (cand.slice(-2) === target.slice(-2)) suffixBonus = 1.5;
        else if (sameLast) suffixBonus = 0.5;

        const score = (12 - dist * 2.5) + prefixBonus + suffixBonus - (lenDiff * 0.6);
        scored.push({ word: cand, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map(s => s.word);
}

function isFixedPhraseToken(token) {
    if (!token || typeof token !== 'string') return false;
    const clean = token.toLowerCase().trim();
    // 斜杠 '/' 和 ' / ' 表示同义替代槽位，绝不作为自动预填固定项！
    if (clean.includes('/')) return false;
    // 带有括号、以括号开头结尾的说明词（如 (someone)、(sb.)、(sth.)、(...)、( ) 等）
    if (/^[（(].*[）)]$/.test(clean) || clean === '()' || clean === '（）') return true;
    // 纯符号或常见连接符（等号、逗号、波浪号、省略号等）
    if (/^[=,，~…\.\-]+$/.test(clean)) return true;
    // 常见语法占位固定项自动预填
    const fixedSet = new Set([
        '...', '…', '……',
        'sb.', 'sb', "sb's", 'sbs',
        'sth.', 'sth',
        "one's", "one’s", 'ones',
        '=', ','
    ]);
    return fixedSet.has(clean) || clean.startsWith('...');
}

function extractPhraseTargetWords(rawWord) {
    if (!rawWord) return [];
    let str = rawWord.trim();

    // 紧凑处理 / 两侧空格，使 draw / reach 变成 draw/reach 作为单一槽位 token
    str = str.replace(/\s*\/\s*/g, '/');
    // 将等号、逗号隔开独立成 token
    str = str.replace(/([=,，])/g, ' $1 ');
    str = str.replace(/（/g, ' (').replace(/）/g, ') ');

    // 拆分为独立的 token 单元
    const tokens = [];
    const regex = /(\([^)]*\)|[^\s()]+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const item = match[1].trim();
        if (item) tokens.push(item);
    }

    return tokens.length > 0 ? tokens : rawWord.trim().split(/\s+/).filter(Boolean);
}

// 判断用户输入的词是否与槽位目标匹配（支持 / 分隔多候选，或 item.correct 中的任意一项）
function isPhraseSlotMatch(userWord, targetToken, item = null) {
    if (!userWord || !targetToken) return false;
    const u = userWord.trim().toLowerCase();
    const candidates = targetToken.toLowerCase().split('/').map(s => s.trim());
    if (item && Array.isArray(item.correct)) {
        item.correct.forEach(c => {
            if (c) candidates.push(String(c).trim().toLowerCase());
        });
    }
    return candidates.includes(u);
}

function generatePhraseDistractors(targetWords, currentPool = [], currentItem = null) {
    const chipsCandidates = new Set();

    // 1. 对于替代项（/ 分隔），随机选一个候选项放入备选 chips
    targetWords.forEach(token => {
        if (token.includes('/')) {
            const parts = token.split('/').map(p => p.trim()).filter(Boolean);
            if (parts.length > 0) {
                const pick = parts[Math.floor(Math.random() * parts.length)];
                chipsCandidates.add(pick.toLowerCase());
            }
        }
    });

    // 2. 如果词条含有 "correct": []，随机选一个放入候选词 chips
    if (currentItem && Array.isArray(currentItem.correct) && currentItem.correct.length > 0) {
        const pick = currentItem.correct[Math.floor(Math.random() * currentItem.correct.length)];
        if (pick) chipsCandidates.add(String(pick).trim().toLowerCase());
    }

    // 过滤掉固定词块，只针对核心词生成干扰项
    const nonFixedTargetWords = targetWords.filter(w => !isFixedPhraseToken(w));
    const rawTargetSet = new Set(targetWords.map(w => w.toLowerCase()));
    const distractors = new Set(chipsCandidates);

    // 3. 如果词条含有 "mistake": []，全部放入备选 chips 作为干扰项
    if (currentItem && Array.isArray(currentItem.mistake) && currentItem.mistake.length > 0) {
        currentItem.mistake.forEach(m => {
            if (m && typeof m === 'string') {
                distractors.add(m.trim().toLowerCase());
            }
        });
    }

    const targetTotal = Math.min(8, Math.max(nonFixedTargetWords.length + 3, 4));

    const REFLEXIVE_PRONOUNS = new Set([
        'oneself', 'himself', 'herself', 'themselves', 'myself', 'yourself', 'yourselves', 'itself', 'ourselves'
    ]);
    const POSSESSIVE_PRONOUNS = new Set(['his', 'her', 'their', 'my', 'your', 'our', 'its']);

    const hasOneself = rawTargetSet.has('oneself');
    const hasOnesPossessive = rawTargetSet.has("one's") || rawTargetSet.has('ones');

    const tryAddDistractor = (w) => {
        if (!w || typeof w !== 'string') return false;
        const clean = w.trim().toLowerCase();
        if (clean.length < 1 || isFixedPhraseToken(clean) || rawTargetSet.has(clean) || distractors.has(clean)) return false;

        if (hasOneself && REFLEXIVE_PRONOUNS.has(clean)) return false;
        if (hasOnesPossessive && POSSESSIVE_PRONOUNS.has(clean)) return false;

        distractors.add(clean);
        return true;
    };

    nonFixedTargetWords.forEach(w => {
        const lower = w.toLowerCase().replace(/[^a-z]/g, '');
        if (PREPOSITION_COLLOCATION_MAP[lower]) {
            const candidatePreps = PREPOSITION_COLLOCATION_MAP[lower];
            let added = 0;
            for (const cp of candidatePreps) {
                if (added >= 3) break;
                if (tryAddDistractor(cp)) added++;
            }
        }
    });

    const contentWords = nonFixedTargetWords
        .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
        .filter(w => w && (!STOP_FUNCTION_WORDS.has(w) || w.length >= 5))
        .sort((a, b) => b.length - a.length);

    const wordsToProcess = contentWords.length > 0
        ? contentWords
        : nonFixedTargetWords.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);

    wordsToProcess.forEach(cw => {
        if (distractors.size >= targetTotal) return;
        if (PHRASE_LOOKALIKE_MAP[cw]) {
            for (const sw of PHRASE_LOOKALIKE_MAP[cw]) {
                if (distractors.size >= targetTotal) break;
                tryAddDistractor(sw);
            }
        }
        if (distractors.size < targetTotal) {
            const dbLookalikes = findLookalikesFromDatabase(cw, 3);
            for (const sim of dbLookalikes) {
                if (distractors.size >= targetTotal) break;
                tryAddDistractor(sim);
            }
        }
    });

    if (distractors.size + nonFixedTargetWords.length < targetTotal && Array.isArray(currentPool)) {
        for (const item of currentPool) {
            if (distractors.size + nonFixedTargetWords.length >= targetTotal) break;
            const w = (item.word || '').trim().toLowerCase();
            if (w && !w.includes(' ') && !isFixedPhraseToken(w) && w.length <= 8 && /^[a-z]+$/.test(w)) {
                tryAddDistractor(w);
            }
        }
    }

    const safeFallbackWords = ['make', 'take', 'get', 'well', 'all', 'set', 'out', 'up', 'back', 'just'];
    for (const fw of safeFallbackWords) {
        if (distractors.size + nonFixedTargetWords.length >= targetTotal) break;
        tryAddDistractor(fw);
    }

    const chips = [
        ...nonFixedTargetWords.map((w, idx) => ({ id: `tw_${idx}`, text: w })),
        ...Array.from(distractors).map((w, idx) => ({ id: `dis_${idx}`, text: w }))
    ];

    for (let i = chips.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chips[i], chips[j]] = [chips[j], chips[i]];
    }

    return chips;
}

/* --- End: views/words-engine.js --- */

/* --- Begin: views/profile.js --- */
/**
 * 个人中心 (我)、熟词本、回收站与自建词书
 * Module: assets/js/views/profile.js
 */

/* ==========================================================================
   熟词本（Mastered Words）与本地词书回收站（Trash Bin）系统
   ========================================================================== */
function getMasteredWords() {
    if (!currentUser) return [];
    try {
        const raw = localStorage.getItem(`vocab_mastered_words_${currentUser}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveMasteredWords(words) {
    if (!currentUser) return;
    localStorage.setItem(`vocab_mastered_words_${currentUser}`, JSON.stringify(words));
}

function isWordMastered(word) {
    if (!word) return false;
    const clean = word.trim().toLowerCase();
    const list = getMasteredWords();
    return list.some(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
}

function toggleMasteredWord(word, phone = '', meaning = '') {
    if (!currentUser || !word) return false;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);

    let nowMastered = false;
    if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        nowMastered = false;
        showToast(`已取消“${word}”的熟词标记`);
    } else {
        list.push({
            word: word.trim(),
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        nowMastered = true;
        showToast(`已将“${word}”标为熟词`);
    }
    saveMasteredWords(list);
    return nowMastered;
}

function ensureWordMastered(word, phone = '', meaning = '') {
    if (!currentUser || !word) return;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
    if (existingIdx < 0) {
        list.push({
            word: word.trim(),
            phone: phone || '',
            meaning: meaning || '',
            markedAt: Date.now()
        });
        saveMasteredWords(list);
    }
}

function removeWordMastered(word) {
    if (!currentUser || !word) return;
    const clean = word.trim().toLowerCase();
    let list = getMasteredWords();
    const existingIdx = list.findIndex(item => (typeof item === 'string' ? item.toLowerCase() : (item.word || '').toLowerCase()) === clean);
    if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
        saveMasteredWords(list);
    }
}

function toggleCurrentWordMastered() {
    if (!singleState || !singleState.pool || singleState.currentIdx >= singleState.pool.length) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || !q.word) return;
    const nowMastered = toggleMasteredWord(q.word, q.phone, q.meaning);
    updateSingleCardToolbar(q);
    if (nowMastered) {
        // 用户需求：标注熟词后直接跳到下一题
        setTimeout(() => {
            nextSingleQuestion(true);
        }, 280);
    }
}

function confirmClearAllMasteredWords() {
    const list = getMasteredWords();
    if (list.length === 0) {
        showToast('熟词本为空');
        return;
    }
    if (!confirm("确定要清空全部熟词标记吗？")) return;
    saveMasteredWords([]);
    showToast('已清空全部熟词标记');
    renderMasteredWordsInSettings();
    if (gameMode === 'single' && singleState && singleState.pool) {
        const q = singleState.pool[singleState.currentIdx];
        if (q) updateSingleCardToolbar(q);
    }
}

function getTrashWords() {
    try {
        return JSON.parse(localStorage.getItem('vocab_trash_words') || '[]');
    } catch (e) {
        return [];
    }
}

function saveTrashWords(list) {
    try {
        localStorage.setItem('vocab_trash_words', JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save trash words', e);
    }
}

async function deleteWordFromCustomBook(word, bookId, showToastAlert = true) {
    if (!word || !bookId) return false;
    let book = (window.customBooks || []).find(b => b.id === bookId);
    if (!book) return false;

    const originalWords = book.words || [];
    const targetWordObj = originalWords.find(w => (w.word || '').toLowerCase() === word.toLowerCase());
    if (!targetWordObj) return false;

    const trashList = getTrashWords();
    trashList.unshift({
        id: 'trash_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        word: targetWordObj.word,
        phone: targetWordObj.phone || '',
        meaning: targetWordObj.meanings ? targetWordObj.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；') : (targetWordObj.meaning || ''),
        meanings: targetWordObj.meanings || null,
        originalBookId: book.id,
        originalBookName: book.rawName || book.name,
        deletedAt: Date.now()
    });
    saveTrashWords(trashList);

    book.words = originalWords.filter(w => (w.word || '').toLowerCase() !== word.toLowerCase());
    book.count = book.words.length;
    await BookManager.saveCustomBook(book);

    if (showToastAlert) showToast(`已将“${word}”从词书移入回收站`);
    return true;
}

async function deleteCurrentSingleWord() {
    if (!singleState || !singleState.pool || singleState.currentIdx >= singleState.pool.length) return;
    const q = singleState.pool[singleState.currentIdx];
    if (!q || !q.word) return;

    if (!confirm(`确定要将单词“${q.word}”移出该词书吗？`)) return;

    const ok = await deleteWordFromCustomBook(q.word, q.bookId);
    if (ok) {
        nextSingleQuestion(true);
    } else {
        showToast('移入回收站失败：未在本地词书中找到该词条');
    }
}

async function restoreTrashWord(trashId) {
    const trash = getTrashWords();
    const itemIdx = trash.findIndex(t => t.id === trashId);
    if (itemIdx < 0) return;
    const item = trash[itemIdx];

    let targetBook = (window.customBooks || []).find(b => b.id === item.originalBookId);
    if (!targetBook) {
        if (!window.customBooks || window.customBooks.length === 0) {
            alert('原词书已不存在，且当前无其他本地词书可供恢复。请先在词书管理中创建或导入本地词书。');
            return;
        }
        targetBook = window.customBooks[0];
    }

    if (!Array.isArray(targetBook.words)) targetBook.words = [];
    if (!targetBook.words.some(w => (w.word || '').toLowerCase() === item.word.toLowerCase())) {
        targetBook.words.push({
            word: item.word,
            phone: item.phone || '',
            meanings: item.meanings && item.meanings.length > 0 ? item.meanings : [{ pos: '', meaning: item.meaning || '' }],
            bookName: targetBook.rawName || targetBook.name,
            bookId: targetBook.id
        });
        targetBook.count = targetBook.words.length;
        await VocabOfflineDB.saveBook(targetBook);
        BookManager.bookCache[targetBook.id] = targetBook.words;
    }

    trash.splice(itemIdx, 1);
    saveTrashWords(trash);
    showToast(`已将 “${item.word}” 恢复至 “${targetBook.rawName || targetBook.name}”`);
    renderTrashWordsInSettings();
    renderManageLocalBooksInSettings();
}

async function moveTrashWordToAnotherBook(trashId, targetBookId) {
    const trash = getTrashWords();
    const itemIdx = trash.findIndex(t => t.id === trashId);
    if (itemIdx < 0) return;
    const item = trash[itemIdx];

    const targetBook = (window.customBooks || []).find(b => b.id === targetBookId);
    if (!targetBook) {
        alert('目标词书不存在');
        return;
    }

    if (!Array.isArray(targetBook.words)) targetBook.words = [];
    if (!targetBook.words.some(w => (w.word || '').toLowerCase() === item.word.toLowerCase())) {
        targetBook.words.push({
            word: item.word,
            phone: item.phone || '',
            meanings: item.meanings && item.meanings.length > 0 ? item.meanings : [{ pos: '', meaning: item.meaning || '' }],
            bookName: targetBook.rawName || targetBook.name,
            bookId: targetBook.id
        });
        targetBook.count = targetBook.words.length;
        await VocabOfflineDB.saveBook(targetBook);
        BookManager.bookCache[targetBook.id] = targetBook.words;
    }

    trash.splice(itemIdx, 1);
    saveTrashWords(trash);
    showToast(`已将“${item.word}”移动至“${targetBook.rawName || targetBook.name}”！`);
    renderTrashWordsInSettings();
    renderManageLocalBooksInSettings();
}

function permanentlyDeleteTrashWord(trashId) {
    let trash = getTrashWords();
    const item = trash.find(t => t.id === trashId);
    if (!item) return;
    if (!confirm(`确定要彻底删除“${item.word}”吗？此操作无法撤销。`)) return;
    trash = trash.filter(t => t.id !== trashId);
    saveTrashWords(trash);
    showToast(`已彻底删除“${item.word}”`);
    renderTrashWordsInSettings();
}

function confirmClearAllTrashWords() {
    const trash = getTrashWords();
    if (trash.length === 0) {
        showToast('回收站为空');
        return;
    }
    if (!confirm(`确定要永久删除所有回收站中的单词吗？此操作无法撤销。`)) return;
    saveTrashWords([]);
    showToast(`已彻底删除${trash.length}个单词`);
    renderTrashWordsInSettings();
}

function updateSingleCardToolbar(q) {
    if (!q) return;
    const isMastered = isWordMastered(q.word);
    const masterBtn = document.getElementById('btn-card-master');
    if (masterBtn) {
        masterBtn.classList.toggle('active', isMastered);
        masterBtn.title = isMastered ? '已标注熟词（点击取消）' : '标注熟词（不再抽取）';
        masterBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size:18px;">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>`;
    }

    const deleteBtn = document.getElementById('btn-card-delete');
    if (deleteBtn) {
        const isCustomBook = (q.bookId && String(q.bookId).startsWith('custom_')) ||
            (window.customBooks || []).some(cb => cb.id === q.bookId);

        if (isCustomBook) {
            deleteBtn.disabled = false;
            deleteBtn.title = "从当前本地词书删除并移入回收站";
            deleteBtn.style.cursor = "pointer";
        } else {
            deleteBtn.disabled = true;
            deleteBtn.title = "云端预置词书不支持删除词汇";
            deleteBtn.style.cursor = "not-allowed";
        }
        deleteBtn.style.display = 'inline-flex';
    }

    // 控制发音按钮：回答前禁用，回答后启用
    const audioBtn = document.getElementById('btn-card-audio');
    if (audioBtn) {
        audioBtn.style.display = 'inline-flex';
        if (singleState.answered) {
            audioBtn.disabled = false;
            audioBtn.style.opacity = '1';
            audioBtn.style.cursor = 'pointer';
            audioBtn.title = '朗读发音';
        } else {
            audioBtn.disabled = true;
            audioBtn.style.opacity = '0.35';
            audioBtn.style.cursor = 'not-allowed';
            audioBtn.title = '回答后方可播放发音';
        }
    }

    // 控制跳转搜索按钮：回答前禁用，回答后启用
    const searchBtn = document.getElementById('btn-card-search');
    if (searchBtn) {
        searchBtn.style.display = 'inline-flex';
        if (singleState.answered) {
            searchBtn.disabled = false;
            searchBtn.style.opacity = '1';
            searchBtn.style.cursor = 'pointer';
            searchBtn.title = '查询详细释义与例句';
        } else {
            searchBtn.disabled = true;
            searchBtn.style.opacity = '0.35';
            searchBtn.style.cursor = 'not-allowed';
            searchBtn.title = '回答后方可查询释义';
        }
    }
}

function toggleCardToolbarCollapse(event) {
    if (event) event.stopPropagation();
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (cluster) {
        cluster.classList.toggle('expanded');
    }
}

function checkCardToolbarOverflow() {
    const header = document.querySelector('.single-top-header-row');
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (!header || !cluster) return;
    if (header.scrollWidth > header.clientWidth) {
        cluster.classList.add('collapsed-overflow');
    } else if (window.innerWidth > 520) {
        cluster.classList.remove('collapsed-overflow');
    }
}

window.addEventListener('resize', checkCardToolbarOverflow);
document.addEventListener('pointerdown', (e) => {
    const cluster = document.getElementById('single-card-toolbar-cluster');
    if (cluster && cluster.classList.contains('expanded') && !cluster.contains(e.target)) {
        cluster.classList.remove('expanded');
    }
});

let singlePhraseTimer = null;
let singlePhraseState = {
    targetWords: [],
    placed: [],
    chips: [],
    q: null
};

function renderSingleQuestion() {
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    if (singleState.currentIdx >= singleState.pool.length) {
        endSingleGame();
        return;
    }

    const q = singleState.pool[singleState.currentIdx];
    singleState.answered = false;
    singleState.selectedIdx = -1;

    const isPhrase = !!(q.word && q.word.trim().includes(' '));

    if (singleConfig.autoPlayAudio && navigator.onLine && q && q.word && !isPhrase) {
        playWordAudio(q.word);
    }

    const audioBtn = document.getElementById('btn-single-audio');
    if (audioBtn) audioBtn.style.display = 'none';

    const badge = document.getElementById('single-book-badge');
    if (badge) badge.innerText = q.bookName || (singleState.sessionName || '单人练习');
    if (typeof updateReviewPageActiveBookLabel === 'function') {
        updateReviewPageActiveBookLabel();
    }

    const progEl = document.getElementById('single-progress-text');
    if (progEl) {
        progEl.innerText = `${singleState.currentIdx + 1} / ${singleState.pool.length}`;
    }

    const progFillEl = document.getElementById('single-progress-fill');
    if (progFillEl) {
        progFillEl.style.width = Math.round(((singleState.currentIdx + 1) / singleState.pool.length) * 100) + '%';
    }

    const retestTag = document.getElementById('single-retest-tag');
    if (retestTag) {
        retestTag.style.display = q._isRetest ? 'inline-flex' : 'none';
    }

    updateSingleCardToolbar(q);
    renderCardMasteryDiamonds(q.word);
    setTimeout(checkCardToolbarOverflow, 0);

    const wordEl = document.getElementById('single-word');
    const phoneEl = document.getElementById('single-phone');

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.style.display = 'flex';
        nextBtn.className = 'single-next-btn show-answer-mode';
        nextBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px;">skip_next</span><span class="btn-label-text">看答案</span>';
    }

    if (isPhrase) {
        renderSinglePhraseQuestion(q);
        return;
    }

    if (wordEl) {
        wordEl.style.display = 'block';
        wordEl.innerText = q.word;
        wordEl.style.color = '#111827';
    }
    if (phoneEl) {
        phoneEl.style.display = 'block';
        phoneEl.innerText = q.phone || '';
    }

    const optionsContainer = document.getElementById('single-options');
    if (!optionsContainer) return;

    let html = '';
    q.options.forEach((opt, idx) => {
        html += `
                <button class="single-opt-btn" id="single-opt-${idx}" onclick="handleSingleAnswer(${idx})">
                    <span class="opt-trans">${opt.meaning}</span>
                </button>
            `;
    });
    optionsContainer.innerHTML = html;
}

function renderSinglePhraseQuestion(q) {
    const targetWords = extractPhraseTargetWords(q.word);
    const placed = targetWords.map((w, idx) => isFixedPhraseToken(w) ? `__fixed__${idx}` : null);

    singlePhraseState = {
        targetWords: targetWords,
        placed: placed,
        chips: (q.phraseChips && q.phraseChips.length > 0)
            ? q.phraseChips.filter(c => !isFixedPhraseToken(c.text))
            : generatePhraseDistractors(targetWords, singleState.pool),
        q: q
    };

    updateSingleCardToolbar(q);

    // 【核心修复】：未作答前严禁提前剧透英文，必须隐藏！
    const wordEl = document.getElementById('single-word');
    const phoneEl = document.getElementById('single-phone');
    if (wordEl) {
        wordEl.style.display = 'none';
        wordEl.innerText = '';
    }
    if (phoneEl) {
        phoneEl.style.display = 'none';
        phoneEl.innerText = '';
    }

    const optionsContainer = document.getElementById('single-options');
    if (!optionsContainer) return;

    const correctMeaning = q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : '');

    optionsContainer.innerHTML = `
            <div class="phrase-container">
                <!-- 仅展示中文释义 -->
                <div class="phrase-trans-card" style="background:#f1f4f9; border-radius:14px; padding:16px 20px; border:1.5px solid #dce2eb;">
                    <div class="phrase-trans-title" style="font-size:1.45rem; font-weight:800; color:#1e293b;">
                        ${escapeHtml(correctMeaning)}
                    </div>
                </div>
                
                <!-- 待拼装槽位行 -->
                <div class="phrase-slots-row" id="single-phrase-slots" style="border:1.5px dashed #cbd5e1; border-radius:16px; padding:12px 10px; background:#fff;">
                    ${targetWords.map((tw, i) => {
        if (isFixedPhraseToken(tw)) {
            return `<div class="phrase-slot fixed" style="background:#dcfce7; color:#15803d; border-bottom:3px solid #16a34a; font-weight:700;" id="single-slot-${i}">${escapeHtml(tw)}</div>`;
        }
        return `<div class="phrase-slot empty" id="single-slot-${i}" onclick="handleSinglePhraseSlotClick(${i})"></div>`;
    }).join('')}
                </div>
                
                <div id="single-phrase-compare" class="phrase-comparison-card" style="display: none;"></div>

                <!-- 备选词网格框 -->
                <div class="phrase-bank-card" style="background:#f8faff; border:1.5px solid #e2e8f0; border-radius:20px; padding:16px;">
                    <div class="phrase-bank-header" style="margin-bottom:14px;">
                        <span style="font-weight:700; color:#475569; font-size:0.9rem;">备选词框：</span>
                        <button type="button" class="btn-clear-phrase" id="btn-clear-single-phrase" onclick="clearSinglePhraseSlots()" style="background:#f1f5f9; border:1.5px solid #cbd5e1; border-radius:9999px; padding:4px 12px; font-weight:600;">
                            清空已选
                        </button>
                    </div>
                    <div class="phrase-chips-grid" id="single-phrase-bank" style="gap:10px;">
                        ${singlePhraseState.chips.map(c => `
                            <button class="phrase-word-chip" id="single-chip-${c.id}" onclick="handleSinglePhraseChipClick('${c.id}')">
                                ${escapeHtml(c.text)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            `;
}

function clearSinglePhraseSlots() {
    if (singleState.answered) return;
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    singlePhraseState.placed.forEach((chipId, idx) => {
        if (chipId && !String(chipId).startsWith('__fixed__')) {
            const slotEl = document.getElementById(`single-slot-${idx}`);
            if (slotEl) {
                slotEl.classList.remove('filled', 'correct', 'wrong');
                slotEl.classList.add('empty');
                slotEl.innerText = '';
            }
            const chipEl = document.getElementById(`single-chip-${chipId}`);
            if (chipEl) {
                chipEl.classList.remove('used');
                chipEl.disabled = false;
            }
            singlePhraseState.placed[idx] = null;
        }
    });
    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function handleSinglePhraseChipClick(chipId) {
    if (singleState.answered) return;
    const emptyIdx = singlePhraseState.placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    const chip = singlePhraseState.chips.find(c => c.id === chipId);
    if (!chip) return;

    singlePhraseState.placed[emptyIdx] = chipId;

    const slotEl = document.getElementById(`single-slot-${emptyIdx}`);
    if (slotEl) {
        slotEl.classList.remove('empty');
        slotEl.classList.add('filled');
        slotEl.innerText = chip.text;
    }

    const chipEl = document.getElementById(`single-chip-${chipId}`);
    if (chipEl) chipEl.classList.add('used');

    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';

    if (!singlePhraseState.placed.includes(null)) {
        checkSinglePhraseAnswer();
    }
}

function handleSinglePhraseSlotClick(slotIdx) {
    if (singleState.answered) return;
    const chipId = singlePhraseState.placed[slotIdx];
    if (!chipId || String(chipId).startsWith('__fixed__')) return;

    singlePhraseState.placed[slotIdx] = null;

    const slotEl = document.getElementById(`single-slot-${slotIdx}`);
    if (slotEl) {
        slotEl.classList.remove('filled', 'correct', 'wrong');
        slotEl.classList.add('empty');
        slotEl.innerText = '';
    }

    const chipEl = document.getElementById(`single-chip-${chipId}`);
    if (chipEl) chipEl.classList.remove('used');

    const comp = document.getElementById('single-phrase-compare');
    if (comp) comp.style.display = 'none';
}

function checkSinglePhraseAnswer() {
    const placedWords = singlePhraseState.placed.map((cid, i) => {
        if (String(cid).startsWith('__fixed__')) {
            return singlePhraseState.targetWords[i].toLowerCase();
        }
        const c = singlePhraseState.chips.find(item => item.id === cid);
        return c ? c.text.toLowerCase() : '';
    });
    const q = singlePhraseState.q;
    let allSlotsRight = true;
    const wrongSlots = [];
    singlePhraseState.targetWords.forEach((targetToken, idx) => {
        const userWord = placedWords[idx] || '';
        if (String(singlePhraseState.placed[idx]).startsWith('__fixed__')) return;
        if (!isPhraseSlotMatch(userWord, targetToken, q)) {
            allSlotsRight = false;
            wrongSlots.push(idx);
        }
    });
    const isRight = allSlotsRight;

    userStats.total++;
    singleState.total++;
    q.isPhrase = true;
    q.targetWords = singlePhraseState.targetWords;
    q.userPlacedTokens = placedWords;

    if (isRight) {
        userStats.correct++;
        singleState.score++;
        q.isCorrect = true;
        q.wrongSlotIndices = [];

        // 槽位高亮为正确绿色
        singlePhraseState.placed.forEach((cid, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (slotEl && !String(cid).startsWith('__fixed__')) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            }
        });

        // 【核心】：回答正确后，才在顶部展示墨绿色英文完整句
        const wordEl = document.getElementById('single-word');
        if (wordEl) {
            wordEl.style.display = 'block';
            wordEl.innerText = q.word;
            wordEl.style.color = '#15803d';
            wordEl.style.fontSize = '2.1rem';
            wordEl.style.fontWeight = '800';
        }

        singleState.answered = true;
        saveSingleProgress();
        updateSingleCardToolbar(q); // 解禁发音与熟词按钮

        // 备选词按钮全部灰显锁定
        singlePhraseState.chips.forEach(c => {
            const chipEl = document.getElementById(`single-chip-${c.id}`);
            if (chipEl) {
                chipEl.classList.add('used');
                chipEl.disabled = true;
            }
        });
        const clearBtn = document.getElementById('btn-clear-single-phrase');
        if (clearBtn) clearBtn.disabled = true;

        // 按钮变成蓝色的【下一题 ->】
        const nextBtn = document.getElementById('single-next-btn');
        if (nextBtn) {
            nextBtn.className = 'single-next-btn';
            nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
            nextBtn.style.display = 'flex';
        }
        const comp = document.getElementById('single-phrase-compare');
        if (comp) comp.style.display = 'none';

        // 优化：答完词组不自动跳转下一题，保留界面给用户查看与跟读
        if (singlePhraseTimer) {
            clearTimeout(singlePhraseTimer);
            singlePhraseTimer = null;
        }
    } else {
        q.isCorrect = false;
        q.wrongSlotIndices = singlePhraseState.targetWords.map((tw, i) => {
            if (isFixedPhraseToken(tw)) return -1;
            const cid = singlePhraseState.placed[i];
            const chip = cid ? singlePhraseState.chips.find(c => c.id === cid) : null;
            const uWord = chip ? chip.text.toLowerCase() : '';
            return (uWord === tw.toLowerCase()) ? -1 : i;
        }).filter(idx => idx !== -1);
        recordUserMistake(currentUser, q.word, q.meaning, q.phone);
        scheduleRetestForCurrentQuestion();

        singlePhraseState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            slotEl.classList.add('wrong');
            const chipId = singlePhraseState.placed[i];
            const chip = chipId ? singlePhraseState.chips.find(c => c.id === chipId) : null;
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

        setTimeout(() => {
            singlePhraseState.placed.forEach((cid, i) => {
                const slotEl = document.getElementById(`single-slot-${i}`);
                if (slotEl && !String(cid).startsWith('__fixed__')) slotEl.classList.remove('wrong');
            });
        }, 600);
        const comp = document.getElementById('single-phrase-compare');
        if (comp) {
            comp.className = 'phrase-comparison-card wrong-state';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div class="phrase-compare-row">
                        <span class="phrase-compare-badge wrong">✕ 搭配有误</span>
                        <span style="font-size:0.85rem; color:var(--md-sys-color-error); font-weight:600;">请重新调整，或点击下方【跳过】</span>
                    </div>
                `;
        }
    }
}

function revealSingleAnswer() {
    if (singleState.answered) return;
    singleState.answered = true;
    const q = singleState.pool[singleState.currentIdx];
    q.userAnswerIdx = -1;
    q.isCorrect = false;
    q.skipped = true;
    q.answered = true;

    userStats.total++;
    singleState.total++;
    recordUserMistake(currentUser, q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone);
    scheduleRetestForCurrentQuestion();
    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    EbbinghausEngine.recordWord(q.word, q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : q.meaning, q.phone, false, currentBookId);
    renderCardMasteryDiamonds(q.word, 'loss');

    const isPhrase = q.word && q.word.trim().includes(' ');
    if (isPhrase) {
        q.isPhrase = true;
        q.targetWords = singlePhraseState.targetWords;
        q.wrongSlotIndices = singlePhraseState.targetWords.map((tw, i) => isFixedPhraseToken(tw) ? -1 : i).filter(i => i !== -1);
        singlePhraseState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`single-slot-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            const chipId = singlePhraseState.placed[i];
            const chip = chipId ? singlePhraseState.chips.find(c => c.id === chipId) : null;
            const userWord = chip ? chip.text : '';
            const isSlotRight = (userWord.toLowerCase() === tw.toLowerCase());

            slotEl.classList.remove('empty');
            if (isSlotRight) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('filled', 'correct');
                slotEl.innerText = userWord;
            } else {
                slotEl.classList.remove('correct');
                slotEl.classList.add('filled', 'wrong');
                slotEl.innerText = userWord || tw;
            }
        });

        const comp = document.getElementById('single-phrase-compare');
        if (comp) {
            comp.className = 'phrase-comparison-card';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div class="phrase-compare-row" style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span class="phrase-compare-badge correct">✓ 正确词组</span>
                        <span class="phrase-compare-text correct">${q.word}</span>
                    </div>
                `;
        }
        if (singleConfig.autoPlayAudio && navigator.onLine) {
            playWordAudio(q.word);
        }

        singlePhraseState.chips.forEach(c => {
            const chipEl = document.getElementById(`single-chip-${c.id}`);
            if (chipEl) {
                chipEl.classList.add('used');
                chipEl.disabled = true;
            }
        });
        const clearBtn = document.getElementById('btn-clear-single-phrase');
        if (clearBtn) clearBtn.disabled = true;

        const wordEl = document.getElementById('single-word');
        const phoneEl = document.getElementById('single-phone');
        if (wordEl) wordEl.style.display = 'none';
        if (phoneEl) {
            phoneEl.innerText = '';
            phoneEl.style.display = 'none';
        }
    } else {
        q.options.forEach((opt, i) => {
            const btn = document.getElementById(`single-opt-${i}`);
            if (!btn) return;
            btn.disabled = true;
            btn.innerHTML = `<span class="opt-word">${opt.word}</span> <span class="opt-trans">${opt.meaning}</span>`;
            if (i === q.correctIdx) {
                btn.classList.add('correct');
            }
        });
    }

    saveSingleProgress();
    updateSingleCardToolbar(q); // 解禁发音按钮

    // 核心：词组被跳过揭晓答案时，若开启自动发音则播放
    if (isPhrase && singleConfig.autoPlayAudio && navigator.onLine && q && q.word) {
        playWordAudio(q.word);
    }

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.className = 'single-next-btn';
        nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
        nextBtn.style.display = 'flex';
    }
}

function handleSingleAnswer(idx) {
    if (singleState.answered) return;
    singleState.answered = true;
    singleState.selectedIdx = idx;

    const q = singleState.pool[singleState.currentIdx];
    const isRight = (idx === q.correctIdx);
    q.userAnswerIdx = idx;
    q.isCorrect = isRight;
    q.answered = true;

    userStats.total++;
    singleState.total++;

    const currentBookId = q.bookId || (typeof currentReviewBookId !== 'undefined' && currentReviewBookId !== 'all' ? currentReviewBookId : null);
    if (isRight) {
        userStats.correct++;
        singleState.score++;
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
        EbbinghausEngine.recordWord(q.word, q.options[q.correctIdx]?.meaning, q.phone, true, currentBookId);
        renderCardMasteryDiamonds(q.word, 'gain');
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record(singleState.sessionName === '复习' ? 'reviewed' : 'learned', 1);
        }
    } else {
        recordUserMistake(currentUser, q.word, q.options[q.correctIdx]?.meaning, q.phone);
        scheduleRetestForCurrentQuestion();
        EbbinghausEngine.recordWord(q.word, q.options[q.correctIdx]?.meaning, q.phone, false, currentBookId);
        renderCardMasteryDiamonds(q.word, 'loss');
    }
    saveCurrentUserData();
    saveSingleProgress();
    updateSingleCardToolbar(q); // 解禁发音按钮
    saveSingleProgress();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`single-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = `<span class="opt-word">${opt.word}</span> <span class="opt-trans">${opt.meaning}</span>`;
        if (i === q.correctIdx) {
            btn.classList.add('correct');
        }
    });

    if (!isRight) {
        const wrongBtn = document.getElementById(`single-opt-${idx}`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
    }

    const nextBtn = document.getElementById('single-next-btn');
    if (nextBtn) {
        nextBtn.className = 'single-next-btn';
        nextBtn.innerHTML = '<span class="btn-label-text">下一题</span><span class="material-symbols-rounded" style="font-size:20px;">arrow_forward</span>';
        nextBtn.style.display = 'flex';
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function nextSingleQuestion(forceAdvance = false) {
    if (singlePhraseTimer) {
        clearTimeout(singlePhraseTimer);
        singlePhraseTimer = null;
    }
    if (!forceAdvance && !singleState.answered) {
        revealSingleAnswer();
        return;
    }
    singleState.currentIdx++;
    saveSingleProgress();
    renderSingleQuestion();
}

function endSingleGame() {
    if (currentUser) {
        localStorage.removeItem(`single_progress_${currentUser}`);
        updateHubResumeButtons();
    }
    if (window.EbbinghausEngine) {
        EbbinghausEngine.updateDueBadge();
    }
    const isReviewMode = (singleState && singleState.sessionName === '复习');
    gameResult = {
        mode: 'single',
        msg: isReviewMode ? '已完成本组复习！' : `已完成本组练习！`,
        sessionName: singleState ? singleState.sessionName : '',
        currentReviewBookId: typeof currentReviewBookId !== 'undefined' ? currentReviewBookId : null,
        p1Score: singleState.score,
        p2Score: 0,
        pool: singleState.pool,
        total: singleState.total || (singleState.pool ? singleState.pool.length : 0)
    };
    renderResult();
    switchView('view-result');
}

function getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride) {
    let pool = (poolOverride && poolOverride.length >= 4) ? poolOverride : [...(poolOverride || []), ...dictionary, ...DEFAULT_WORDS];
    const targetLower = targetWord.toLowerCase();
    const isSingleWord = !targetWord.trim().includes(' ');

    const seen = new Set();
    const candidates = [];
    for (const d of pool) {
        if (!d || !d.word) continue;
        if (isSingleWord && d.word.trim().includes(' ')) continue;
        const wl = d.word.toLowerCase();
        if (wl !== targetLower && !seen.has(wl)) {
            seen.add(wl);
            candidates.push(d);
        }
    }

    if (isSingleWord && candidates.length < 4) {
        for (const d of DEFAULT_WORDS) {
            if (!d || !d.word || d.word.trim().includes(' ')) continue;
            const wl = d.word.toLowerCase();
            if (wl !== targetLower && !seen.has(wl)) {
                seen.add(wl);
                candidates.push(d);
            }
        }
    }

    const scoredCandidates = candidates.map(d => {
        const candLower = d.word.toLowerCase();
        const dist = calcLevenshteinDist(targetLower, candLower);
        let prefixBonus = 0;
        if (targetLower.slice(0, 3) === candLower.slice(0, 3)) prefixBonus = 3;
        else if (targetLower.slice(0, 2) === candLower.slice(0, 2)) prefixBonus = 1.5;
        const lenDiff = Math.abs(targetLower.length - candLower.length);
        const score = (10 - dist) + prefixBonus - (lenDiff * 0.5);
        return { item: d, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    const topSlice = scoredCandidates.slice(0, 10).map(c => c.item);
    const chosen = topSlice.sort(() => 0.5 - Math.random()).slice(0, 3);

    let safeGuard = 0;
    while (chosen.length < 3 && candidates.length > chosen.length && safeGuard < 20) {
        safeGuard++;
        const rand = candidates[Math.floor(Math.random() * candidates.length)];
        if (isSingleWord && rand.word.trim().includes(' ')) continue;
        if (!chosen.some(c => c.word.toLowerCase() === rand.word.toLowerCase())) {
            chosen.push(rand);
        }
    }

    return chosen.map(d => {
        let meaningStr = '---';
        if (Array.isArray(d.meanings) && d.meanings.length > 0) {
            const randomM = d.meanings[Math.floor(Math.random() * d.meanings.length)] || { pos: '', meaning: '---' };
            meaningStr = (randomM.pos ? randomM.pos + ' ' : '') + (randomM.meaning || '');
        } else if (d.meaning) {
            meaningStr = d.meaning;
        }
        return { word: d.word, meaning: meaningStr };
    });
}

function generateOptions(targetWord, correctMeaning, poolOverride) {
    const distractors = getSimilarConfusingDistractors(targetWord, correctMeaning, poolOverride);
    const correctOption = { word: targetWord, meaning: correctMeaning };
    const options = [correctOption, ...distractors].sort(() => 0.5 - Math.random());
    const correctIdx = options.findIndex(o => o.word === targetWord && o.meaning === correctMeaning);
    return { options, correctIdx };
}

function shuffle(array) {
    if (!Array.isArray(array)) return [];
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateShuffledPoolFromWords(wordsList, count = 70) {
    const list = (wordsList && wordsList.length > 0) ? wordsList : dictionary;
    const unmastered = list.filter(w => !isWordMastered(w.word));
    const activeList = unmastered.length > 0 ? unmastered : list;
    const shuffled = shuffle(activeList);
    const sliceCount = Math.min(count, shuffled.length);
    return shuffled.slice(0, sliceCount).map(w => {
        let fullMeaning = '';
        let options = [];
        let correctIdx = 0;

        if (w.senses && Array.isArray(w.senses) && w.senses.length > 0) {
            const sq = typeof generateShiCiQuestion === 'function' ? generateShiCiQuestion(w, list) : null;
            if (sq) {
                const cleanMeaning = sq.sense ? `[${sq.sense.part_of_speech || ''}] ${(sq.sense.meaning || '').replace(/★/g, '').trim()}` : '';
                return {
                    word: sq.word,
                    phone: sq.pinyin || w.pinyin || '',
                    pinyin: sq.pinyin || w.pinyin || '',
                    bookName: w.bookName || '文言实词',
                    bookId: w.bookId || null,
                    sentence: sq.sentence || '',
                    highlightedSentence: sq.highlightedSentence || '',
                    source: sq.source || '《文言》',
                    sense: sq.sense,
                    example: sq.example,
                    meaning: cleanMeaning,
                    options: sq.options.map(o => ({
                        word: sq.word,
                        pos: o.pos || '',
                        rawMeaning: o.meaning,
                        meaning: (o.pos ? `[${o.pos}] ` : '') + o.meaning
                    })),
                    correctIdx: sq.correctIdx,
                    isShiCi: true
                };
            }
        }

        const selected = (w.meanings && w.meanings.length > 0) ? w.meanings[Math.floor(Math.random() * w.meanings.length)] : { pos: '', meaning: w.meaning || '---' };
        fullMeaning = (selected.pos ? selected.pos + ' ' : '') + (selected.meaning || '');
        const optData = generateOptions(w.word, fullMeaning, list);
        options = optData.options;
        correctIdx = optData.correctIdx;

        const isPhrase = w.word && w.word.trim().includes(' ') && !w.senses;
        const phraseChips = isPhrase ? generatePhraseDistractors(extractPhraseTargetWords(w.word), list) : null;
        return {
            word: w.word,
            phone: w.phone || w.pinyin || '',
            bookName: w.bookName || '对决词库',
            bookId: w.bookId || null,
            meanings: w.meanings || [{ pos: '', meaning: fullMeaning }],
            meaning: fullMeaning,
            options: options,
            correctIdx: correctIdx,
            phraseChips: phraseChips,
            isShiCi: false
        };
    });
}

/* ==========================================================================
   15. 新功能实现：我 (Profile)、搜索 (Search)、自定义词书与手动加词、复习过滤
   ========================================================================== */

// ----------------- 个人中心 (我) 渲染逻辑 -----------------
function renderMeView() {
    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%  |  错题数：${Object.keys(userStats.mistakes || {}).length} 词`;
    }

    // 更新个人中心的数据中心统计卡片
    const statTotalEl = document.getElementById('stat-total');
    const statAccEl = document.getElementById('stat-acc');
    const statMistakesEl = document.getElementById('stat-mistakes');
    if (statTotalEl) statTotalEl.innerText = userStats.total || 0;
    if (statAccEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statAccEl.innerText = `${acc}%`;
    }
    if (statMistakesEl) {
        statMistakesEl.innerText = Object.keys(userStats.mistakes || {}).length;
    }

    const quickUsersList = document.getElementById('settings-quick-users-list');
    if (quickUsersList) {
        quickUsersList.innerHTML = allUsersList.map(u => {
            const isCur = u === currentUser;
            return `
                    <div class="md3-chip ${isCur ? 'selected' : ''}" onclick="switchAccount('${escapeHtml(u)}')">
                        <span class="material-symbols-rounded" style="font-size:16px; margin-right:4px;">${isCur ? 'check' : 'person'}</span>
                        <span>${escapeHtml(u)}</span>
                    </div>
                `;
        }).join('');
    }

    const summaryEl = document.getElementById('settings-books-summary-text');
    if (summaryEl) {
        const customCount = (window.customBooks || []).length;
        const folderCount = (localFolders || []).length;
        summaryEl.innerText = `已创建 ${folderCount} 个文件夹，${customCount} 个本地词书`;
    }

    const masteredSummaryEl = document.getElementById('settings-mastered-summary-text');
    if (masteredSummaryEl) {
        const mCount = getMasteredWords().length;
        masteredSummaryEl.innerText = `已标注 ${mCount} 个熟词（练习与对战中不再抽取）`;
    }

    const trashSummaryEl = document.getElementById('settings-trash-summary-text');
    if (trashSummaryEl) {
        const tCount = getTrashWords().length;
        trashSummaryEl.innerText = `共 ${tCount} 个已删词汇`;
    }
}

// ----------------- 词书选择“确定”按钮 -----------------
function confirmSingleBookSelection() {
    if (!singleSelectedBookIds || singleSelectedBookIds.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    closeSingleBookSelector();
    updateHub();
    if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.updateDueBadge === 'function') {
        EbbinghausEngine.updateDueBadge();
    }
    showToast('已确认选择词书');
}

// ----------------- 复习词书多选过滤 -----------------
function getReviewSelectedBookIds() {
    if (!currentUser) return [];
    const saved = localStorage.getItem(`vocab_review_filter_${currentUser}`);
    if (saved !== null) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) { }
    }
    // 每次默认全选所有英语词书
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const englishBooks = allBooks.filter(isEnglishBook).concat((window.customBooks || []).filter(isEnglishBook));
    return englishBooks.map(b => b.id);
}

function handleReviewMainClick(event) {
    const badgeEl = document.getElementById('hub-review-due-count');
    const count = parseInt(badgeEl ? badgeEl.innerText : '0', 10);
    if (count <= 0) {
        showToast('暂无需要复习的词汇，点击可强化复习');
    }
    startSingleReview();
}

// 全局点击关闭复习页面词书切换下拉菜单
document.addEventListener('pointerdown', (e) => {
    const menu = document.getElementById('single-review-book-menu');
    const btn = document.getElementById('single-review-book-btn');
    if (menu && menu.style.display !== 'none') {
        if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
            menu.style.display = 'none';
        }
    }
});

// ----------------- 新建本地词书 -----------------
function promptCreateCustomBook() {
    const modal = document.getElementById('modal-create-custom-book');
    const nameInput = document.getElementById('input-new-book-name') || document.getElementById('input-create-book-name');
    if (nameInput) {
        nameInput.value = '';
        setTimeout(() => nameInput.focus(), 150);
    }
    if (modal) modal.classList.add('active');
}

function closeCreateCustomBookModal() {
    const modal = document.getElementById('modal-create-custom-book');
    if (modal) modal.classList.remove('active');
}

async function confirmCreateCustomBook() {
    const nameInput = document.getElementById('input-new-book-name') || document.getElementById('input-create-book-name');
    const name = (nameInput ? nameInput.value : '').trim();
    if (!name) {
        showToast('请输入词书名称！');
        if (nameInput) nameInput.focus();
        return;
    }
    const bookId = 'custom_' + Date.now();
    const newBook = {
        id: bookId,
        name: name,
        rawName: name,
        count: 0,
        words: [],
        folderId: null,
        isCloud: false,
        createdAt: Date.now()
    };
    if (!window.customBooks) window.customBooks = [];
    window.customBooks.push(newBook);
    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(newBook);
    }
    BookManager.mergeCustomBooks();
    closeCreateCustomBookModal();
    renderManageLocalBooksInSettings();
    showToast(`词书《${name}》创建成功！`);
    viewBookWordsInSettings(bookId);
}

/* --- End: views/profile.js --- */

/* --- Begin: views/duel.js --- */
/**
 * 联机大厅与实时对战引擎 (Supabase Realtime)
 * Module: assets/js/views/duel.js
 */

/* ==========================================================================
   6. 联机大厅与房间设置 (已修复跨房间聊天漏洞、仅列在线房间、1天后过期清理)
   ========================================================================== */
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

function renderRoomBookChips() {
    const container = document.getElementById('chips-books');
    if (!container) return;

    // P2 视角专属：隐藏分类切换 Tabs 和操作工具栏，只保留已选词书
    const catTabs = document.getElementById('room-book-category-tabs');
    if (catTabs) catTabs.style.display = isHost ? 'flex' : 'none';
    const roomToolbar = document.getElementById('room-book-toolbar');
    if (roomToolbar) roomToolbar.style.display = isHost ? 'flex' : 'none';

    // 统一的书名查找字典
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const bookMap = {};
    allBooks.forEach(b => {
        bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
    });
    (window.customBooks || []).forEach(b => {
        bookMap[b.id] = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
    });

    if (!isHost) {
        // P2 视角：优先从房主广播过来的 selectedBookNames 读取真实中文名
        const selectedNames = roomConfig.selectedBookNames || [];
        const selectedIds = roomConfig.selectedBooks || [];
        const displayItems = [];

        if (selectedNames.length > 0) {
            selectedNames.forEach(name => {
                const clean = String(name).replace(/^[📂📁\s]+/, '');
                displayItems.push(clean);
            });
        } else if (selectedIds.length > 0) {
            selectedIds.forEach(id => {
                const resolvedName = bookMap[id] || (String(id).startsWith('custom_') ? '自定义词书' : id);
                displayItems.push(String(resolvedName).replace(/^[📂📁\s]+/, ''));
            });
        }

        if (displayItems.length === 0) {
            container.innerHTML = `
                        <div style="padding:10px 14px; background:var(--md-sys-color-surface-container); border-radius:var(--md-shape-small); font-size:0.88rem; color:var(--md-sys-color-outline);">
                            房主暂未选定词书，等待房主设置中...
                        </div>
                    `;
        } else {
            let html = '<div style="display:flex; flex-wrap:wrap; gap:8px; padding:4px 0;">';
            displayItems.forEach(name => {
                html += `
                            <div style="display:inline-flex; align-items:center; gap:6px; background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); padding:6px 14px; border-radius:var(--md-shape-full); font-size:0.88rem; font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                                <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-primary);">menu_book</span>
                                <span>${escapeHtml(name)}</span>
                            </div>
                        `;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        const tip = document.getElementById('room-book-count-tip');
        if (tip) {
            tip.innerText = `房主已选择 ${displayItems.length} 本词书`;
        }
        return;
    }

    // 房主视角：不强迫每分类必须有书，选中的词书可自由跨分类存在
    const targetBooks = allBooks.filter(b => currentRoomBookCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b))
        .concat((window.customBooks || []).filter(b => currentRoomBookCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));
    const targetIds = new Set(targetBooks.map(b => b.id));
    const curCatSelectedCount = (roomConfig.selectedBooks || []).filter(id => targetIds.has(id)).length;
    const totalSelectedCount = (roomConfig.selectedBooks || []).length;

    renderBookFolderTree('chips-books', {
        selectedIds: roomConfig.selectedBooks || [],
        onToggle: 'toggleRoomBook',
        mode: 'room',
        filterType: 'all'
    });

    const tip = document.getElementById('room-book-count-tip');
    if (tip) {
        tip.innerText = `已选 ${totalSelectedCount} 本词书`;
    }
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
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    isHost = true;
    hostName = currentUser;
    guestName = '';
    roomConfig = {
        duration: 60,
        winLead: 6,
        gaugeStyle: 'tug',
        selectedBooks: (singleSelectedBookIds && singleSelectedBookIds.length > 0) ? [...singleSelectedBookIds] : ['GaoKao3500']
    };

    setupRoomLobbyUI(roomCode);
    connectSupabaseChannel(roomCode);
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
        delBtn.style.display = isHost ? 'inline-flex' : 'none';
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
    document.getElementById('room-p1-name').innerText = hostName || '等待房主...';
    document.getElementById('room-p2-name').innerText = guestName || '等待对手加入...';

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
                showToast(`玩家${guestName}已就位！`);
                refreshRoomPlayerCards();
                if (isHost) {
                    realtimeChannel.send({
                        type: 'broadcast',
                        event: 'room_sync',
                        payload: { hostName: currentUser, guestName: guestName, config: roomConfig }
                    });
                }
            }
        })
        .on('broadcast', { event: 'room_sync' }, ({ payload }) => {
            hostName = payload.hostName;
            guestName = payload.guestName;
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
        // === 核心新增：接收到房主解散/踢人广播时，所有人强制退出 ===
        .on('broadcast', { event: 'host_closed_and_kick' }, () => {
            if (!isHost) {
                alert('房主已关闭页面或离开房间，您已被移出房间。');
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
                        payload: { name: currentUser, role: 'guest' }
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
        // 1. 云端置为 closed（非 waiting 状态，对他人隐藏）
        try {
            await sbClient.from('rooms').update({ status: 'closed', player_count: 0 }).eq('code', codeToLeave);
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
        realtimeChannel.send({
            type: 'broadcast',
            event: 'game_start',
            payload: { pool: sharedPool, hostName: currentUser, guestName: guestName, config: roomConfig }
        });
        handleRemoteGameStart({ pool: sharedPool, hostName: currentUser, guestName: guestName, config: roomConfig });
    } catch (err) {
        alert('准备词库失败：' + err.message);
        refreshRoomPlayerCards();
    }
}

function handleRemoteGameStart(payload) {
    gameMode = 'online';
    if (payload.config) roomConfig = payload.config;

    const oppoName = isHost ? payload.guestName : payload.hostName;

    document.getElementById('arena-my-badge').innerText = isHost ? '🔴 ' + currentUser : oppoName || '对手';
    document.getElementById('arena-my-score').innerText = '0';

    document.getElementById('arena-oppo-badge').innerText = isHost ? '🔵 挑战者' : '🔴 ' + payload.hostName;
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

function initGlobalPresence() {
    if (!currentUser || !sbClient) return;
    if (globalLobbyChannel) {
        globalLobbyChannel.track({
            username: currentUser,
            status: 'idle',
            joinedAt: Date.now()
        });
        return;
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
            // 当有玩家离线，检查其是否为房主，是则立刻从本地移除并刷新视图
            if (Array.isArray(leftPresences)) {
                leftPresences.forEach(p => {
                    const leftUser = p.key;
                    // 从内存发现列表中剔除该离线用户开设的房间
                    discoveredLobbyRooms = discoveredLobbyRooms.filter(r => r.host !== leftUser);
                    // 同步清理云端数据
                    sbClient.from('rooms').delete().eq('host', leftUser).then(() => { });
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
                    status: 'idle',
                    joinedAt: Date.now()
                });
                fetchOnlineRoomsList();
            }
        });
}

// 修复：全新在线玩家卡片排版，彻底解决文字竖向排列问题
function syncGlobalPresenceState() {
    if (!globalLobbyChannel) return;
    const state = globalLobbyChannel.presenceState();
    const onlineUsers = [];

    Object.keys(state).forEach(k => {
        if (k && k !== currentUser) {
            const pres = state[k][0] || {};
            onlineUsers.push({
                username: k,
                status: pres.status || 'idle',
                joinedAt: pres.joinedAt || Date.now()
            });
        }
    });

    const cardsHtml = onlineUsers.length === 0 ? `
                <div style="text-align:center; padding:24px 10px; color:var(--md-sys-color-outline); width:100%; grid-column:1/-1;">
                    <p style="margin-top:6px; font-size:0.88rem;">当前暂无其他在线玩家</p>
                </div>
            ` : onlineUsers.map(u => `
            <div class="online-player-card">
                <div class="online-player-left">
                    <div class="online-player-avatar">
                        <span class="material-symbols-rounded" style="font-size:22px;">person</span>
                    </div>
                    <div class="online-player-meta">
                        <span class="online-player-name" title="${escapeHtml(u.username)}">${escapeHtml(u.username)}</span>
                        <span class="online-player-status">
                            <span class="online-status-dot"></span>
                            在线空闲
                        </span>
                    </div>
                </div>
                <button type="button" class="btn btn-filled btn-sm online-player-action-btn" onclick="sendMatchInvite('${escapeHtml(u.username)}')">
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

function sendMatchInvite(targetUser) {
    if (!targetUser || targetUser === currentUser) return;
    if (!globalLobbyChannel) {
        showToast('正在连接大厅服务器...');
        initGlobalPresence();
        return;
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const autoRoomName = `${currentUser}的挑战房`;

    globalLobbyChannel.send({
        type: 'broadcast',
        event: 'invite_match',
        payload: {
            from: currentUser,
            to: targetUser,
            roomCode: code,
            roomName: autoRoomName
        }
    });

    showToast(`已向 ${targetUser} 发起对战邀请，等待对方接受...`);
}

function handleReceivedMatchInvite(payload) {
    if (!payload || payload.to !== currentUser) return;
    currentIncomingInvite = payload;

    const modal = document.getElementById('modal-match-invite');
    const fromEl = document.getElementById('invite-from-name');
    const roomEl = document.getElementById('invite-room-name');
    const countdownEl = document.getElementById('invite-countdown');
    if (!modal) return;

    if (fromEl) fromEl.innerText = `${payload.from} 向你发起对决邀请！`;

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
                to: invite.from,
                accepted: true,
                roomCode: invite.roomCode,
                roomName: invite.roomName
            }
        });
    }

    isHost = false;
    roomCode = invite.roomCode;
    hostName = invite.from;
    guestName = currentUser;
    customRoomName = invite.roomName;

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
        showToast(`${payload.from} 接受了对战邀请！正在进入房间...`);
        isHost = true;
        roomCode = payload.roomCode;
        hostName = currentUser;
        guestName = payload.from;
        customRoomName = payload.roomName;

        setupRoomLobbyUI(roomCode, payload.roomName);
        connectSupabaseChannel(roomCode);
        switchView('view-online');
    } else {
        showToast(`玩家【${payload.from}】${payload.isTimeout ? '超时未应答' : '谢绝了对战邀请'}`);
    }
}

async function handleCreateCustomRoom() {
    const inputEl = document.getElementById('input-custom-room-name');
    const nameVal = (inputEl ? inputEl.value : '').trim();
    const finalRoomName = nameVal || `${currentUser}创建的房间`;

    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    isHost = true;
    hostName = currentUser;
    guestName = '';
    customRoomName = finalRoomName;
    roomConfig = {
        duration: 60,
        winLead: 6,
        gaugeStyle: 'tug',
        selectedBooks: (singleSelectedBookIds && singleSelectedBookIds.length > 0) ? [...singleSelectedBookIds] : ['GaoKao3500']
    };

    const roomMeta = {
        code: roomCode,
        name: finalRoomName,
        host: currentUser,
        capacity: selectedRoomCapacity || 2,
        player_count: 1,
        status: 'waiting',
        createdAt: Date.now()
    };

    if (!myCreatedRooms.some(r => r.code === roomCode)) {
        myCreatedRooms.push(roomMeta);
        localStorage.setItem('my_created_rooms', JSON.stringify(myCreatedRooms));
    }

    // 写入云端数据库
    try {
        await sbClient.from('rooms').upsert({
            code: roomCode,
            name: finalRoomName,
            host: currentUser,
            capacity: selectedRoomCapacity || 2,
            player_count: 1,
            status: 'waiting',
            created_at: new Date().toISOString()
        }, { onConflict: 'code' });
    } catch (e) { }

    setupRoomLobbyUI(roomCode, finalRoomName);
    connectSupabaseChannel(roomCode);

    // 广播给大厅全网
    if (globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'room_state_change',
            payload: { action: 'ready', room: roomMeta }
        });
    }

    showToast(`创建成功！房间码：${roomCode}`);
}

async function handleHostDeleteRoom(targetCode) {
    const codeToDelete = targetCode || roomCode;
    if (!codeToDelete) return;

    if (!confirm(`确定解散并删除房间 ${codeToDelete} 吗？`)) return;

    myCreatedRooms = myCreatedRooms.filter(r => r.code !== codeToDelete);
    localStorage.setItem('my_created_rooms', JSON.stringify(myCreatedRooms));

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
    showToast('房间已成功解散并删除');
}

function handleRoomStateBroadcast(payload) {
    if (!payload) return;

    // 收到房主就绪/创建广播：直接把该房间存入发现列表，并重新刷新
    if ((payload.action === 'ready' || payload.action === 'create') && payload.room) {
        const room = payload.room;
        const idx = discoveredLobbyRooms.findIndex(r => r.code === room.code);
        if (idx >= 0) {
            discoveredLobbyRooms[idx] = { ...discoveredLobbyRooms[idx], ...room, status: 'waiting' };
        } else {
            discoveredLobbyRooms.unshift({ ...room, status: 'waiting' });
        }
    } else if ((payload.action === 'hide' || payload.action === 'delete') && payload.code) {
        // 房主离房：立刻在列表中剔除
        discoveredLobbyRooms = discoveredLobbyRooms.filter(r => r.code !== payload.code);
    }

    // 立即重新执行渲染
    fetchOnlineRoomsList();
}

// 仅当房间中有人在线时展示，且超过 1 天 (24h) 的空闲房间自动清理
async function fetchOnlineRoomsList(manual = false) {
    const container = document.getElementById('online-rooms-container');
    if (!container) return;

    // 1. 获取大厅当前在线用户
    const presenceState = globalLobbyChannel ? globalLobbyChannel.presenceState() : {};
    const onlineUserSet = new Set(Object.keys(presenceState));
    if (currentUser) onlineUserSet.add(currentUser);

    // 2. 获取云端所有房间
    let dbRooms = [];
    try {
        const { data, error } = await sbClient
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);
        if (!error && Array.isArray(data)) {
            dbRooms = data.map(r => ({
                code: r.code,
                name: r.name || `${r.host}的房间`,
                host: r.host,
                capacity: r.capacity || 2,
                playerCount: r.player_count || 1,
                status: r.status || 'closed',
                createdAt: new Date(r.created_at).getTime()
            }));
        }
    } catch (e) { }

    // 3. 整合广播发现的房间与数据库房间
    const roomMap = new Map();
    dbRooms.forEach(r => roomMap.set(r.code, r));
    discoveredLobbyRooms.forEach(r => {
        if (r.status === 'waiting') roomMap.set(r.code, { ...roomMap.get(r.code), ...r });
    });

    // 房主自己本地创建的房间始终对房主保留
    myCreatedRooms.forEach(r => {
        if (!roomMap.has(r.code)) {
            roomMap.set(r.code, { ...r, status: 'closed' });
        }
    });

    // 4. 精准过滤：
    // - 房主本人：永远能看到自己的房间卡片
    // - 其他人：房主必须在线，且房间状态必须处于 'waiting'（即房主在房内等待对手）
    const activeRoomsList = Array.from(roomMap.values()).filter(r => {
        const isMine = r.host === currentUser;
        if (isMine) return true;

        const isHostOnline = onlineUserSet.has(r.host);
        const isWaiting = (r.status === 'waiting');
        return isHostOnline && isWaiting;
    });

    if (activeRoomsList.length === 0) {
        container.innerHTML = `
                <div style="text-align:center; padding:28px 12px; color:var(--md-sys-color-outline); width:100%; grid-column:1/-1;">
                    <span class="material-symbols-rounded" style="font-size:40px; opacity:0.6;">meeting_room</span>
                    <p style="margin-top:8px; font-size:0.9rem;">暂无在线房间</p>
                </div>
            `;
        if (manual) showToast('刷新成功');
        return;
    }

    // 当前房主是否真正处于房间内页面
    const isCurrentlyInRoomView = (isHost && roomCode && document.getElementById('online-in-room')?.style.display !== 'none');

    container.innerHTML = activeRoomsList.map(r => {
        const isMine = r.host === currentUser;
        const isFull = (r.playerCount || 1) >= (r.capacity || 2);
        const isHostInRoom = isMine ? isCurrentlyInRoomView : (r.status === 'waiting');

        return `
                <div class="online-room-card">
                    <div class="online-room-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:700; font-size:0.95rem; color:var(--md-sys-color-on-surface); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</div>
                        <span class="badge ${isMine ? (isHostInRoom ? 'badge-online' : '') : (isFull ? 'badge-p1' : 'badge-online')}" 
                              style="font-size:0.75rem; ${isMine && !isHostInRoom ? 'background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline);' : ''}">
                            ${isMine ? (isHostInRoom ? '在线' : '无人') : `${r.playerCount} / ${r.capacity || 2} 人`}
                        </span>
                    </div>
                    <div class="online-room-body" style="display:flex; justify-content:space-between; align-items:center; font-size:0.84rem; color:var(--md-sys-color-on-surface-variant);">
                        <div style="display:flex; align-items:center; gap:5px;">
                            <span class="material-symbols-rounded" style="font-size:16px; color:var(--md-sys-color-primary);">badge</span>
                            <span>房主：<strong>${escapeHtml(r.host)}</strong></span>
                        </div>
                    </div>
                    <div class="online-room-actions" style="display:flex; gap:8px; margin-top:4px;">
                        ${isMine ? `
                            <button type="button" class="btn btn-filled btn-sm" style="flex:1;" onclick="quickEnterMyRoom('${r.code}', '${escapeHtml(r.name)}')">
                                <span class="material-symbols-rounded" style="font-size:15px;">meeting_room</span>
                                <span>进入房间</span>
                            </button>
                            <button type="button" class="btn btn-danger btn-sm" onclick="handleHostDeleteRoom('${r.code}')" title="彻底删除房间">
                                <span class="material-symbols-rounded" style="font-size:15px;">delete</span>
                            </button>
                        ` : `
                            <button type="button" class="btn btn-filled btn-sm" style="flex:1;" ${isFull ? 'disabled' : ''} onclick="quickJoinLobbyRoom('${r.code}')">
                                <span class="material-symbols-rounded" style="font-size:15px;">login</span>
                                <span>${isFull ? '房间已满' : '加入对战'}</span>
                            </button>
                        `}
                    </div>
                </div>
            `;
    }).join('');
}

function quickJoinLobbyRoom(code) {
    const codeInput = document.getElementById('join-room-code');
    if (codeInput) codeInput.value = code;
    joinOnlineRoom();
}

async function quickEnterMyRoom(code, name) {
    roomCode = code;
    isHost = true;
    hostName = currentUser;
    guestName = '';
    customRoomName = name;

    // 1. 切换到具体房间等待页面
    setupRoomLobbyUI(roomCode, name);
    connectSupabaseChannel(roomCode);

    const roomData = {
        code: code,
        name: name,
        host: currentUser,
        capacity: 2,
        player_count: 1,
        status: 'waiting' // 标记为等待对手加入（即房主在房内就绪）
    };

    // 2. 将房间状态 upsert 写入云端数据库
    try {
        await sbClient.from('rooms').upsert(roomData, { onConflict: 'code' });
    } catch (e) {
        console.warn('[Rooms] Upsert failed:', e);
    }

    // 3. 广播给大厅里的所有其他人：房主已就绪，通知其他人立即添加该房间
    if (globalLobbyChannel) {
        globalLobbyChannel.send({
            type: 'broadcast',
            event: 'room_state_change',
            payload: {
                action: 'ready',
                room: roomData
            }
        });
    }
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

        // 3. 将云端数据库房间状态设为 'closed'（关闭），防止其他端再进入
        const updateUrl = `${SUPABASE_URL}/rest/v1/rooms?code=eq.${roomCode}`;
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
        try {
            fetch(updateUrl, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ status: 'closed', player_count: 0 }),
                keepalive: true // 保证网页关闭后请求依然能发出
            });
        } catch (e) { }
    }
});



/* --- End: views/duel.js --- */

/* --- Begin: views/ai-duel.js --- */
/**
 * 人机对战引擎 (拔河机制)
 * Module: assets/js/views/ai-duel.js
 */

/* ==========================================================================
   7. 人机对战核心引擎 (AI DUEL WITH TUG-OF-WAR)
   ========================================================================== */
let aiDuelConfig = {
    selectedBooks: ['GaoKao3500'],
    difficulty: 'normal',
    speedMode: 'smart',
    mode: 'lead', // 默认为拔河不限时模式 ('lead' 或 'timed')
    winLead: 6,
    duration: 60
};

try {
    const savedAi = JSON.parse(localStorage.getItem('vocab_ai_duel_config') || '{}');
    if (savedAi) Object.assign(aiDuelConfig, savedAi);
} catch (e) { }

function selectAiRule(rule) {
    aiDuelConfig.mode = rule;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

let aiDuelState = {
    pool: [],
    aiIdx: 0,
    aiScore: 0,
    aiFrozenUntil: 0
};
let aiDuelTimer = null;

function openAiDuelSettings() {
    // 打开弹窗时，默认折叠所有分类文件夹
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-ai-duel-settings');
    if (!modal) return;
    renderAiDuelBookChips();
    updateAiDuelSettingsChips();
    modal.classList.add('active');
}

function closeAiDuelSettings() {
    const modal = document.getElementById('modal-ai-duel-settings');
    if (modal) modal.classList.remove('active');
}

let currentAiDuelCategory = 'english';

function switchAiDuelBookCategory(cat) {
    currentAiDuelCategory = cat;
    document.querySelectorAll('#ai-duel-book-category-tabs .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    const importLabel = document.getElementById('ai-duel-import-label');
    if (importLabel) importLabel.innerText = cat === 'shici' ? '导入文言' : '导入词书';
    renderAiDuelBookChips();
}

function triggerAiDuelBookImport() {
    const input = document.getElementById('ai-duel-custom-book-input');
    if (input) input.click();
}

async function handleAiDuelCustomBookUpload(e) {
    if (currentAiDuelCategory === 'shici') {
        await loadCustomShiCiBook(e);
    } else {
        await loadCustomBook(e);
    }
    renderAiDuelBookChips();
}

function selectAllAiDuelBooks(selectAll = true) {
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const targetBooks = allBooks.filter(b => currentAiDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b))
        .concat((window.customBooks || []).filter(b => currentAiDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    if (selectAll) {
        targetBooks.forEach(b => {
            if (!aiDuelConfig.selectedBooks.includes(b.id)) {
                aiDuelConfig.selectedBooks.push(b.id);
            }
        });
    } else {
        const targetIds = new Set(targetBooks.map(b => b.id));
        aiDuelConfig.selectedBooks = (aiDuelConfig.selectedBooks || []).filter(id => !targetIds.has(id));
    }
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
    renderAiDuelBookChips();
}

function renderAiDuelBookChips() {
    const container = document.getElementById('chips-ai-duel-books');
    if (!container) return;
    if (!Array.isArray(aiDuelConfig.selectedBooks)) {
        aiDuelConfig.selectedBooks = [];
    }

    renderBookFolderTree('chips-ai-duel-books', {
        selectedIds: aiDuelConfig.selectedBooks,
        onToggle: 'toggleAiDuelBook',
        mode: 'ai_duel',
        filterType: 'all'
    });

    const summaryEl = document.getElementById('ai-duel-books-summary');
    if (summaryEl) {
        const totalCount = (aiDuelConfig.selectedBooks || []).length;
        summaryEl.innerText = `已选 ${totalCount} 本词书`;
    }
    updateAiDuelStartButtonState();
}

function updateAiDuelStartButtonState() {
    const startBtn = document.getElementById('btn-start-ai-duel');
    const selCount = (aiDuelConfig.selectedBooks || []).length;
    if (startBtn) {
        startBtn.disabled = (selCount === 0);
    }
}

function toggleAiDuelBook(bookId) {
    if (!Array.isArray(aiDuelConfig.selectedBooks)) {
        aiDuelConfig.selectedBooks = [];
    }
    const hasIt = isBookIdSelected(aiDuelConfig.selectedBooks, bookId);
    if (hasIt) {
        aiDuelConfig.selectedBooks = toggleBookIdInList(aiDuelConfig.selectedBooks, bookId);
    } else {
        aiDuelConfig.selectedBooks.push(bookId);
    }
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
    renderAiDuelBookChips();
}

function updateAiDuelSettingsChips() {
    document.querySelectorAll('#chips-ai-difficulty .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-diff') === aiDuelConfig.difficulty);
    });
    document.querySelectorAll('#chips-ai-speed-mode .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-speed') === aiDuelConfig.speedMode);
    });

    // 规则模式切换（不限时 vs 限时）
    document.querySelectorAll('#chips-ai-duel-rule .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-rule') === (aiDuelConfig.mode || 'lead'));
    });

    const groupLead = document.getElementById('group-ai-duel-lead');
    const groupTimed = document.getElementById('group-ai-duel-timed');
    if (groupLead) groupLead.style.display = (aiDuelConfig.mode === 'timed') ? 'none' : 'block';
    if (groupTimed) groupTimed.style.display = (aiDuelConfig.mode === 'timed') ? 'block' : 'none';

    document.querySelectorAll('#chips-ai-lead .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-lead')) === aiDuelConfig.winLead);
    });
    document.querySelectorAll('#chips-ai-duration .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-time')) === aiDuelConfig.duration);
    });
}

function selectAiDifficulty(diff) {
    aiDuelConfig.difficulty = diff;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiSpeedMode(speed) {
    aiDuelConfig.speedMode = speed;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiLead(lead) {
    aiDuelConfig.winLead = lead;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiDuration(dur) {
    aiDuelConfig.duration = dur;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

async function startAiDuelFromModal() {
    if (!aiDuelConfig.selectedBooks || aiDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    closeAiDuelSettings();
    await startAiDuel();
}

async function startAiDuel() {
    if (!aiDuelConfig.selectedBooks || aiDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    gameMode = 'ai_duel';
    let words = [];
    if (aiDuelConfig.selectedBooks && aiDuelConfig.selectedBooks.length > 0) {
        words = await BookManager.loadMultipleBooks(aiDuelConfig.selectedBooks);
    }
    if (!words || words.length === 0) {
        showToast('所选词书没有词汇，请先检查词书');
        return;
    }

    const sharedPool = generateShuffledPoolFromWords(words, 80);
    // 确保玩家与系统 AI 题库与出题顺序 100% 完全一致
    const questionSequence = [...sharedPool];
    resetPlayerState(p1State, [...questionSequence]);
    p2State.score = 0;
    p2State.total = 0;

    aiDuelState = {
        pool: [...questionSequence],
        aiIdx: 0,
        aiScore: 0,
        aiFrozenUntil: 0
    };

    document.getElementById('arena-my-badge').innerText = '🔴 ' + (currentUser || '我方');
    document.getElementById('arena-my-score').innerText = '0';
    document.getElementById('arena-oppo-badge').innerText = '🔵 系统AI';
    document.getElementById('arena-oppo-score').innerText = '0';

    const snakeWrap = document.getElementById('arena-gauge-snake-wrap');
    const tugWrap = document.getElementById('arena-gauge-tug-wrap');
    if (snakeWrap) snakeWrap.style.display = 'none';
    if (tugWrap) tugWrap.style.display = 'flex';

    const ruleSum = document.getElementById('arena-tug-rule-summary');
    const timerEl = document.getElementById('arena-tug-timer');

    const isTimed = (aiDuelConfig.mode === 'timed');
    if (ruleSum) {
        ruleSum.innerText = isTimed ? `限时抢分` : `领先 ${aiDuelConfig.winLead} 题胜出`;
    }
    if (timerEl) {
        timerEl.style.display = isTimed ? 'inline-block' : 'none';
    }

    renderQuestion(p1State);

    timeLeft = aiDuelConfig.duration || 60;
    renderSnakeRing();

    clearInterval(gameTimer);
    if (isTimed) {
        gameTimer = setInterval(() => {
            timeLeft--;
            renderSnakeRing();
            if (timeLeft <= 0) {
                clearInterval(gameTimer);
                if (aiDuelTimer) clearTimeout(aiDuelTimer);
                const diff = p1State.score - p2State.score;
                let myMsg = "🤝 势均力敌，握手言和！";
                if (diff > 0) myMsg = "🎉 恭喜战胜系统AI！";
                else if (diff < 0) myMsg = "💔 遗憾惜败系统AI！";
                endGame(myMsg, false);
            }
        }, 1000);
    }

    scheduleNextAiAnswer();
    switchView('view-game');
}

// 计算下一次 AI 作答时间 (兼顾单词与词组，并引入动态难度自适应调节)
function scheduleNextAiAnswer() {
    if (gameMode !== 'ai_duel' || timeLeft <= 0) return;
    if (aiDuelTimer) clearTimeout(aiDuelTimer);

    const q = aiDuelState.pool[aiDuelState.aiIdx % aiDuelState.pool.length];
    let delay = 3500;
    const isPhrase = q.word && q.word.trim().includes(' ') && !q.isShiCi;

    if (aiDuelConfig.speedMode === 'smart') {
        if (isPhrase) {
            const tokens = extractPhraseTargetWords(q.word);
            // 词组每增加一格词块，延长更多时间 (基础 4200ms + 每词块 1800ms)
            delay = 4200 + (tokens.length * 1800) + (Math.random() * 1000 - 500);
        } else {
            const len = (q.word || '').length;
            delay = 1800 + (len * 240) + (Math.random() * 600 - 300);
        }
    } else {
        if (isPhrase) {
            const tokens = extractPhraseTargetWords(q.word);
            delay = 4500 + (tokens.length * 1500) + (Math.random() * 800 - 400);
        } else {
            delay = 3200 + (Math.random() * 600 - 300);
        }
    }

    // 根据难度基准微调
    if (aiDuelConfig.difficulty === 'easy') delay *= 1.45;
    else if (aiDuelConfig.difficulty === 'hard') delay *= 0.85;

    // 动态难度系统：根据玩家领先/落后分差自适应调节 AI 作答速度
    const playerLead = p1State.score - p2State.score;
    if (playerLead >= 3) {
        // 玩家领先 3 题及以上，AI 适度提速追赶
        const speedFactor = Math.max(0.68, 1 - (playerLead - 2) * 0.08);
        delay *= speedFactor;
    } else if (playerLead <= -3) {
        // 玩家落后 3 题及以上，AI 适度降速放缓
        const slowFactor = Math.min(1.50, 1 + (Math.abs(playerLead) - 2) * 0.10);
        delay *= slowFactor;
    }

    delay = Math.max(isPhrase ? 3200 : 1500, delay);

    aiDuelTimer = setTimeout(() => {
        handleAiAnswerStep();
    }, delay);
}

function handleAiAnswerStep() {
    if (gameMode !== 'ai_duel' || timeLeft <= 0) return;

    // 如果当前处于答错冻结冷却期，跳过并进入下个周期
    if (Date.now() < aiDuelState.aiFrozenUntil) {
        scheduleNextAiAnswer();
        return;
    }

    let baseAccuracy = 0.80;
    if (aiDuelConfig.difficulty === 'easy') baseAccuracy = 0.65;
    else if (aiDuelConfig.difficulty === 'hard') baseAccuracy = 0.95;

    // 动态难度系统：根据玩家领先分差自适应调节 AI 正确率
    const playerLead = p1State.score - p2State.score;
    let dynamicAccuracy = baseAccuracy;
    if (playerLead >= 3) {
        // 玩家领先较大，适度提高 AI 正确率
        const boost = Math.min(0.18, (playerLead - 2) * 0.04);
        dynamicAccuracy = Math.min(0.98, baseAccuracy + boost);
    } else if (playerLead <= -3) {
        // 玩家落后较多，适度降低 AI 正确率
        const drop = Math.min(0.25, (Math.abs(playerLead) - 2) * 0.06);
        dynamicAccuracy = Math.max(0.50, baseAccuracy - drop);
    }

    const isCorrect = Math.random() < dynamicAccuracy;
    aiDuelState.aiIdx++;

    if (isCorrect) {
        p2State.score++;
        document.getElementById('arena-oppo-score').innerText = `${p2State.score}`;
        spawnParticles(window.innerWidth * 0.75, window.innerHeight * 0.4, '#006874');
        renderSnakeRing();

        if (checkAiDuelWinCondition()) return;
        scheduleNextAiAnswer();
    } else {
        // AI 答错冻结惩罚 3.5 秒
        aiDuelState.aiFrozenUntil = Date.now() + 3500;
        scheduleNextAiAnswer();
    }
}

function checkAiDuelWinCondition() {
    const winLead = aiDuelConfig.winLead || 6;
    const diff = p1State.score - p2State.score;

    if (diff >= winLead) {
        if (aiDuelTimer) clearTimeout(aiDuelTimer);
        endGame(`🎉 恭喜领先达到 ${winLead} 题，战胜系统AI！`, false);
        return true;
    } else if (diff <= -winLead) {
        if (aiDuelTimer) clearTimeout(aiDuelTimer);
        endGame(`💔 系统AI领先达到 ${winLead} 题，遗憾惜败！`, false);
        return true;
    }
    return false;
}

/* --- End: views/ai-duel.js --- */

/* --- Begin: views/mistakes.js --- */
/**
 * 错题本分类复习与消除视图
 * Module: assets/js/views/mistakes.js
 */

/* ==========================================================================
   8. 错题本复习与清除（支持英语与文言实词分类隔离、实词例句与出处完整呈现）
   ========================================================================== */
let currentMistakesCategory = 'english';

function switchMistakesCategory(cat) {
    currentMistakesCategory = cat;
    document.querySelectorAll('#mistakes-category-tabs .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    const restudyText = document.getElementById('btn-restudy-mistakes-text');
    if (restudyText) {
        restudyText.innerText = cat === 'shici' ? '重练实词错题' : '重练英语错题';
    }
    renderMistakesList();
}

function openMistakesView() {
    switchMistakesCategory(currentMistakesCategory || 'english');
    switchView('view-mistakes');
}

async function renderMistakesList() {
    const mistakes = userStats.mistakes || {};
    const container = document.getElementById('mistakes-container');
    if (!container) return;
    container.innerHTML = '';

    const allKeys = Object.keys(mistakes);
    const englishKeys = [];
    const shiciKeys = [];

    allKeys.forEach(k => {
        const item = mistakes[k];
        const isShiCi = Boolean(item.isShiCi || !/[a-zA-Z]/.test(k));
        if (isShiCi) {
            shiciKeys.push(k);
        } else {
            englishKeys.push(k);
        }
    });

    // 动态刷新顶部 Tab 数量提示
    const tabEn = document.getElementById('tab-mistakes-english');
    if (tabEn) tabEn.innerText = `【英语错题】(${englishKeys.length})`;
    const tabShici = document.getElementById('tab-mistakes-shici');
    if (tabShici) tabShici.innerText = `【实词错题】(${shiciKeys.length})`;

    if (currentMistakesCategory === 'english') {
        if (englishKeys.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 48px 0; color:var(--md-sys-color-outline); font-size:0.92rem;">暂无英语错题记录，继续保持！</p>';
            return;
        }
        englishKeys.sort((a, b) => mistakes[b].count - mistakes[a].count).forEach((word, idx) => {
            const item = mistakes[word];
            const div = document.createElement('div');
            div.style.cssText = 'background:var(--md-sys-color-surface-container-low); padding:12px 16px; margin-bottom:8px; border-radius:var(--md-shape-l); display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 2px rgba(0,0,0,0.04);';
            div.innerHTML = `
                        <div>
                            <div style="font-weight:700; font-size:1.05rem;">
                                #${idx + 1} ${escapeHtml(word)}
                                ${item.phone ? `<span style="font-size:0.84rem; color:var(--md-sys-color-outline); font-family:monospace; margin-left:6px;">${escapeHtml(item.phone)}</span>` : ''}
                            </div>
                            <div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:2px;">${escapeHtml(item.meaning || '---')}</div>
                        </div>
                        <span class="badge" style="background:var(--md-sys-color-error-container); color:var(--md-sys-color-on-error-container); font-size:0.75rem; font-weight:600;">错 ${item.count} 次</span>
                    `;
            container.appendChild(div);
        });
    } else {
        // 文言实词错题列表
        if (shiciKeys.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 48px 0; color:var(--md-sys-color-outline); font-size:0.92rem;">暂无文言实词错题记录，继续保持！</p>';
            return;
        }

        // 尝试加载实词词库补充旧版缺失的例句/出处
        let allShiCi = null;
        if (typeof ShiCiManager !== 'undefined' && typeof ShiCiManager.loadData === 'function') {
            try { allShiCi = await ShiCiManager.loadData(); } catch (e) { }
        }

        shiciKeys.sort((a, b) => mistakes[b].count - mistakes[a].count).forEach((word, idx) => {
            const item = mistakes[word];
            const foundWord = allShiCi ? allShiCi.find(w => w.word === word) : null;
            const pinyin = item.pinyin || (foundWord ? foundWord.pinyin : '');

            let sentence = item.sentence || '';
            let source = item.source || '';
            let highlightedSentence = item.highlightedSentence || '';
            let meaningText = item.meaning || '';

            if ((!sentence || !source) && foundWord && foundWord.senses && foundWord.senses.length > 0) {
                const matchedSense = foundWord.senses.find(s => (s.meaning && meaningText.includes(s.meaning.replace(/★/g, '').trim()))) || foundWord.senses[0];
                if (matchedSense) {
                    if (!meaningText) {
                        meaningText = `[${matchedSense.part_of_speech || ''}] ${(matchedSense.meaning || '').replace(/★/g, '').trim()}`;
                    }
                    if (matchedSense.examples && matchedSense.examples.length > 0) {
                        sentence = sentence || matchedSense.examples[0].sentence || '';
                        source = source || matchedSense.examples[0].source || '《文言》';
                    }
                }
            }

            if (!highlightedSentence && sentence) {
                const reg = new RegExp(escapeRegex(word), 'g');
                highlightedSentence = escapeHtml(sentence).replace(reg, `<strong class="shici-word-highlight">${escapeHtml(word)}</strong>`);
            } else if (!highlightedSentence) {
                highlightedSentence = `<strong class="shici-word-highlight">${escapeHtml(word)}</strong>`;
            }
            if (!source) source = '《文言典籍》';

            const div = document.createElement('div');
            div.style.cssText = 'background:var(--md-sys-color-surface-container-low); padding:14px 16px; margin-bottom:10px; border-radius:var(--md-shape-l); border-left:4px solid var(--md-sys-color-primary); box-shadow:0 1px 3px rgba(0,0,0,0.04);';
            div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="display:flex; align-items:baseline; gap:8px;">
                                <span style="font-weight:700; font-size:1.15rem; color:var(--md-sys-color-primary);">#${idx + 1} ${escapeHtml(word)}</span>
                                ${pinyin ? `<span style="font-size:0.85rem; color:var(--md-sys-color-outline); font-family:monospace;">${escapeHtml(pinyin)}</span>` : ''}
                            </div>
                            <span class="badge" style="background:var(--md-sys-color-error-container); color:var(--md-sys-color-on-error-container); font-size:0.75rem; font-weight:600;">错 ${item.count} 次</span>
                        </div>
                        <div style="background:var(--md-sys-color-surface-container); border-radius:var(--md-shape-small); padding:8px 12px; margin-bottom:8px; font-size:0.92rem; line-height:1.6;">
                            <div style="color:var(--md-sys-color-on-surface);">${highlightedSentence}</div>
                            <div style="text-align:right; font-size:0.8rem; color:var(--md-sys-color-outline); margin-top:3px;">—— ${escapeHtml(source)}</div>
                        </div>
                        <div style="font-size:0.88rem; color:var(--md-sys-color-on-surface-variant); display:flex; align-items:center; gap:6px;">
                            <strong style="color:var(--md-sys-color-on-surface); font-weight:600;">语境释义：</strong>
                            <span>${escapeHtml(meaningText || '---')}</span>
                        </div>
                    `;
            container.appendChild(div);
        });
    }
}

async function restudyMistakes() {
    const mistakes = userStats.mistakes || {};
    if (currentMistakesCategory === 'english') {
        const words = Object.keys(mistakes).filter(w => !mistakes[w].isShiCi && /[a-zA-Z]/.test(w));
        if (words.length === 0) return alert('当前没有待复习的英语错题！');

        const pool = words.map(w => {
            const item = dictionary.find(d => d.word === w) || { phone: '' };
            const optData = generateOptions(w, mistakes[w].meaning, dictionary);
            return {
                word: w,
                phone: item.phone || mistakes[w].phone || '',
                bookName: '错题本',
                meaning: mistakes[w].meaning,
                options: optData.options,
                correctIdx: optData.correctIdx
            };
        });
        startSinglePlayerWithPool(pool, '英语错题重练');
    } else {
        const words = Object.keys(mistakes).filter(w => mistakes[w].isShiCi || !/[a-zA-Z]/.test(w));
        if (words.length === 0) return alert('当前没有待复习的实词错题！');

        let allShiCi = [];
        if (typeof ShiCiManager !== 'undefined' && typeof ShiCiManager.loadData === 'function') {
            try { allShiCi = await ShiCiManager.loadData(); } catch (e) { }
        }

        const pool = [];
        for (const w of words) {
            const item = mistakes[w];
            const wordObj = allShiCi.find(sw => sw.word === w);
            if (wordObj) {
                const q = generateShiCiQuestion(wordObj, allShiCi);
                if (q) pool.push(q);
            } else {
                const pos = item.pos || '';
                const meaning = item.meaning || '';
                const example = { sentence: item.sentence || w, source: item.source || '文言典籍' };
                const pseudoWordObj = {
                    word: w,
                    pinyin: item.pinyin || '',
                    senses: [{
                        part_of_speech: pos,
                        meaning: meaning,
                        examples: [example]
                    }]
                };
                const q = generateShiCiQuestion(pseudoWordObj, allShiCi);
                if (q) pool.push(q);
            }
        }

        if (pool.length === 0) return alert('未能构建实词错题重练题目');

        shiciState = {
            pool: pool,
            currentIdx: 0,
            score: 0,
            total: pool.length,
            answered: false,
            isReview: true
        };
        renderShiCiQuestion();
        switchView('view-shici');
    }
}

function clearMistakes() {
    const isShici = (currentMistakesCategory === 'shici');
    const typeName = isShici ? '文言实词' : '英语';
    if (!confirm(`确认清空所有${typeName}错题记录？`)) return;

    const mistakes = userStats.mistakes || {};
    Object.keys(mistakes).forEach(w => {
        const matchesShici = Boolean(mistakes[w].isShiCi || !/[a-zA-Z]/.test(w));
        if (isShici && matchesShici) {
            delete mistakes[w];
        } else if (!isShici && !matchesShici) {
            delete mistakes[w];
        }
    });
    userStats.mistakes = mistakes;
    saveCurrentUserData();
    renderMistakesList();
    showToast(`已清空${typeName}错题记录`);
}

/* --- End: views/mistakes.js --- */

/* --- Begin: views/local-duel.js --- */
/**
 * 希沃同屏双人触控对决视图
 * Module: assets/js/views/local-duel.js
 */

/* ==========================================================================
   10. 希沃同屏多触控对决
   ========================================================================== */
let localDuelConfig = {
    selectedBooks: ['GaoKao3500'],
    opponentName: '挑战者',
    mode: 'lead',
    leadThreshold: 6,
    duration: 60,
    gaugeStyle: 'tug'
};

try {
    const saved = JSON.parse(localStorage.getItem('vocab_local_duel_config') || '{}');
    if (saved) {
        if (saved.bookId && !saved.selectedBooks) saved.selectedBooks = [saved.bookId];
        Object.assign(localDuelConfig, saved);
    }
} catch (e) { }

let localDuelState = {
    active: false,
    pool: [],
    mode: 'lead',
    leadThreshold: 6,
    duration: 60,
    timeLeft: 60,
    clockTimer: null,
    p1: { name: '红方', score: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false },
    p2: { name: '挑战者', score: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false }
};

let localPhraseState = {
    p1: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' },
    p2: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' }
};

function renderLocalDuelOpponents() {
    const container = document.getElementById('chips-local-duel-opponents');
    if (!container) return;

    const myName = currentUser || '红方';
    const otherUsers = (allUsersList || []).filter(u => u && u !== myName);
    const candidates = ['挑战者', ...otherUsers];

    if (!localDuelConfig.opponentName || localDuelConfig.opponentName === myName) {
        localDuelConfig.opponentName = candidates[0];
    } else if (!candidates.includes(localDuelConfig.opponentName)) {
        candidates.push(localDuelConfig.opponentName);
    }

    container.innerHTML = candidates.map(name => {
        const isSelected = (localDuelConfig.opponentName === name);
        return `
                <div class="md3-chip ${isSelected ? 'selected' : ''}" 
                     data-opp="${name}" 
                     onclick="selectLocalDuelOpponent('${name}')">
                    ${isSelected ? '✓ ' : ''} ${name}
                </div>
            `;
    }).join('');
}

function selectLocalDuelOpponent(name) {
    localDuelConfig.opponentName = name;
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelOpponents();
}

function toggleCreateOpponentInput(show) {
    const box = document.getElementById('local-duel-new-opp-box');
    if (!box) return;
    const willShow = (typeof show === 'boolean') ? show : (box.style.display === 'none');
    box.style.display = willShow ? 'block' : 'none';
    if (willShow) {
        const inp = document.getElementById('input-new-opponent');
        if (inp) {
            inp.value = '';
            setTimeout(() => inp.focus(), 100);
        }
    }
}

function createAndSelectLocalOpponent() {
    const inp = document.getElementById('input-new-opponent');
    if (!inp) return;
    const name = inp.value.trim();
    if (!name) {
        showToast('请输入账号昵称');
        return;
    }
    if (name === (currentUser || '红方')) {
        showToast('对手账号不能与当前登录玩家重名');
        return;
    }
    if (allUsersList.includes(name)) {
        showToast(`已有账号 “${name}”，已为您直接选中该对手`);
        localDuelConfig.opponentName = name;
        localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
        renderLocalDuelOpponents();
        toggleCreateOpponentInput(false);
        return;
    }

    allUsersList.push(name);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    localDuelConfig.opponentName = name;
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelOpponents();
    toggleCreateOpponentInput(false);
    inp.value = '';
    showToast(`成功创建并选中对手：“${name}”`);
}

function openLocalDuelSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-local-duel-settings');
    if (!modal) return;
    renderLocalDuelBookChips();
    renderLocalDuelOpponents();
    updateLocalDuelSettingsChips();
    modal.classList.add('active');
}

function closeLocalDuelSettings() {
    const modal = document.getElementById('modal-local-duel-settings');
    if (modal) modal.classList.remove('active');
}

let currentLocalDuelCategory = 'english';

function switchLocalDuelBookCategory(cat) {
    currentLocalDuelCategory = cat;
    document.querySelectorAll('#local-duel-book-category-tabs .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    const importLabel = document.getElementById('local-duel-import-label');
    if (importLabel) importLabel.innerText = cat === 'shici' ? '导入文言' : '导入词书';
    renderLocalDuelBookChips();
}

function triggerLocalDuelBookImport() {
    const input = document.getElementById('local-duel-custom-book-input');
    if (input) input.click();
}

async function handleLocalDuelCustomBookUpload(e) {
    if (currentLocalDuelCategory === 'shici') {
        await loadCustomShiCiBook(e);
    } else {
        await loadCustomBook(e);
    }
    renderLocalDuelBookChips();
}

function selectAllLocalDuelBooks(selectAll = true) {
    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0)
        ? BookManager.availableBooks
        : BookManager.fallbackBooks;
    const targetBooks = allBooks.filter(b => currentLocalDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b))
        .concat((window.customBooks || []).filter(b => currentLocalDuelCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b)));

    if (selectAll) {
        targetBooks.forEach(b => {
            if (!localDuelConfig.selectedBooks.includes(b.id)) {
                localDuelConfig.selectedBooks.push(b.id);
            }
        });
    } else {
        const targetIds = new Set(targetBooks.map(b => b.id));
        localDuelConfig.selectedBooks = (localDuelConfig.selectedBooks || []).filter(id => !targetIds.has(id));
    }
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelBookChips();
}

function renderLocalDuelBookChips() {
    const container = document.getElementById('chips-local-duel-books');
    if (!container) return;
    if (!Array.isArray(localDuelConfig.selectedBooks)) {
        localDuelConfig.selectedBooks = [];
    }

    renderBookFolderTree('chips-local-duel-books', {
        selectedIds: localDuelConfig.selectedBooks,
        onToggle: 'toggleLocalDuelBook',
        mode: 'local_duel',
        filterType: 'all'
    });

    const summaryEl = document.getElementById('local-duel-books-summary');
    if (summaryEl) {
        const totalCount = (localDuelConfig.selectedBooks || []).length;
        summaryEl.innerText = `已选 ${totalCount} 本词书`;
    }

    updateLocalDuelStartButtonState();
}

function toggleLocalDuelBook(bookId) {
    if (!Array.isArray(localDuelConfig.selectedBooks)) {
        localDuelConfig.selectedBooks = [];
    }
    const hasIt = isBookIdSelected(localDuelConfig.selectedBooks, bookId);
    if (hasIt) {
        localDuelConfig.selectedBooks = toggleBookIdInList(localDuelConfig.selectedBooks, bookId);
    } else {
        localDuelConfig.selectedBooks.push(bookId);
    }
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
    renderLocalDuelBookChips();
}

function updateLocalDuelStartButtonState() {
    const startBtn = document.getElementById('btn-start-local-duel');
    const selCount = (localDuelConfig.selectedBooks || []).length;
    if (startBtn) {
        startBtn.disabled = (selCount === 0);
    }
}

function updateLocalDuelSettingsChips() {
    document.querySelectorAll('#chips-local-duel-rule .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-rule') === localDuelConfig.mode);
    }); const groupLead =
        document.getElementById('group-local-duel-lead'); const groupTimed =
            document.getElementById('group-local-duel-timed'); if (groupLead)
        groupLead.style.display = (localDuelConfig.mode === 'lead') ? 'block' : 'none';
    if (groupTimed) groupTimed.style.display = (localDuelConfig.mode === 'timed') ?
        'block' : 'none';

    document.querySelectorAll('#chips-local-duel-lead .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-lead')) === localDuelConfig.leadThreshold);
    });
    document.querySelectorAll('#chips-local-duel-duration .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-time')) === localDuelConfig.duration);
    });
    document.querySelectorAll('#chips-local-duel-gauge-style .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-gauge') === (localDuelConfig.gaugeStyle || 'tug'));
    });
}

function selectLocalDuelRule(rule) {
    localDuelConfig.mode = rule;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelLead(lead) {
    localDuelConfig.leadThreshold = lead;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelDuration(duration) {
    localDuelConfig.duration = duration;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

function selectLocalDuelGaugeStyle(style) {
    localDuelConfig.gaugeStyle = style;
    updateLocalDuelSettingsChips();
    localStorage.setItem('vocab_local_duel_config', JSON.stringify(localDuelConfig));
}

async function startLocalDuelFromModal() {
    if (!localDuelConfig.selectedBooks || localDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    closeLocalDuelSettings();
    await startLocalDuel();
}

async function startLocalDuel() {
    if (!localDuelConfig.selectedBooks || localDuelConfig.selectedBooks.length === 0) {
        showToast('请至少选择一本词书！');
        return;
    }
    resetAllGameAlertsAndFeedback();
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1 && localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1 && localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2 && localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2 && localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);

    let words = [];
    if (localDuelConfig.selectedBooks && localDuelConfig.selectedBooks.length > 0) {
        words = await BookManager.loadMultipleBooks(localDuelConfig.selectedBooks);
    }
    if (!words || words.length === 0) {
        showToast('所选词书没有词汇，请先检查词书');
        return;
    }

    const matchPool = generateShuffledPoolFromWords(words, 80);

    const p1Name = currentUser || '红方';
    const p2Name = localDuelConfig.opponentName || '蓝方';
    localDuelState = {
        active: true,
        matchPool: matchPool,
        mode: localDuelConfig.mode || 'lead',
        leadThreshold: localDuelConfig.leadThreshold || 6,
        duration: localDuelConfig.duration || 60,
        timeLeft: localDuelConfig.duration || 60,
        clockTimer: null,
        p1: { name: p1Name, score: 0, round: 0, pool: shuffle([...matchPool]), currentIdx: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false },
        p2: { name: p2Name, score: 0, round: 0, pool: shuffle([...matchPool]), currentIdx: 0, currentQ: null, frozenUntil: 0, freezeTimer: null, freezeTick: null, answered: false }
    };

    localPhraseState = {
        p1: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' },
        p2: { targetWords: [], placed: [], chips: [], q: null, correctMeaning: '' }
    };

    const f1 = document.getElementById('local-freeze-p1');
    if (f1) f1.style.display = 'none';
    const f2 = document.getElementById('local-freeze-p2');
    if (f2) f2.style.display = 'none';
    const info1 = document.getElementById('local-freeze-info-p1');
    if (info1) info1.style.display = 'none';
    const info2 = document.getElementById('local-freeze-info-p2');
    if (info2) info2.style.display = 'none';

    const gaugeStyle = localDuelConfig.gaugeStyle || 'tug';
    const tugEl = document.getElementById('local-duel-gauge-tug');
    const snakeEl = document.getElementById('local-duel-gauge-snake');
    if (gaugeStyle === 'snake') {
        if (tugEl) tugEl.style.display = 'none';
        if (snakeEl) snakeEl.style.display = 'flex';
    } else {
        if (tugEl) tugEl.style.display = 'flex';
        if (snakeEl) snakeEl.style.display = 'none';
    }

    generateLocalDuelQuestion('p1');
    generateLocalDuelQuestion('p2');
    updateLocalDuelGauge();

    if (localDuelState.mode === 'timed') {
        localDuelState.clockTimer = setInterval(() => {
            if (!localDuelState.active) return;
            localDuelState.timeLeft--;
            updateLocalDuelGauge();
            if (localDuelState.timeLeft <= 0) {
                clearInterval(localDuelState.clockTimer);
                let winner = 'draw';
                if (localDuelState.p1.score > localDuelState.p2.score) winner = 'p1';
                else if (localDuelState.p2.score > localDuelState.p1.score) winner = 'p2';
                endLocalDuel(winner, '时间到！比赛结束');
            }
        }, 1000);
    }

    switchView('view-local-duel');
}

function generateLocalDuelQuestion(player) {
    const pState = localDuelState[player];
    if (!pState || !pState.pool || pState.pool.length === 0) return;

    if (pState.currentIdx >= pState.pool.length) {
        pState.pool = shuffle([...localDuelState.matchPool]);
        pState.currentIdx = 0;
    }

    const q = pState.pool[pState.currentIdx++];
    pState.round = (pState.round || 0) + 1;

    if (q.phraseChips && q.phraseChips.length > 0) {
        const targetWords = extractPhraseTargetWords(q.word);
        const placed = new Array(targetWords.length).fill(null);
        targetWords.forEach((tw, idx) => {
            if (isFixedPhraseToken(tw)) {
                placed[idx] = `__fixed__${idx}`;
            }
        });
        pState.currentQ = {
            isPhrase: true,
            isShiCi: false,
            word: q.word,
            meaning: q.meaning,
            targetWords: targetWords,
            chips: q.phraseChips,
            bookName: q.bookName || '对决词库'
        };
        pState.answered = false;

        localPhraseState[player] = {
            targetWords: targetWords,
            placed: placed,
            chips: q.phraseChips,
            q: pState.currentQ,
            correctMeaning: q.meaning
        };
    } else if (q.isShiCi) {
        pState.currentQ = {
            isPhrase: false,
            isShiCi: true,
            word: q.word,
            phone: q.pinyin || q.phone || '',
            pinyin: q.pinyin || q.phone || '',
            sentence: q.sentence || '',
            highlightedSentence: q.highlightedSentence || '',
            source: q.source || '《古文》',
            sense: q.sense,
            example: q.example,
            meaning: q.meaning || '',
            options: q.options,
            correctIdx: q.correctIdx,
            bookName: q.bookName || '文言实词'
        };
        pState.answered = false;
    } else {
        pState.currentQ = {
            isPhrase: false,
            isShiCi: false,
            word: q.word,
            phone: q.phone || '',
            meaning: q.meaning || '',
            options: q.options,
            correctIdx: q.correctIdx,
            bookName: q.bookName || '对决词库'
        };
        pState.answered = false;
    }

    renderLocalDuelSide(player);
}

function renderLocalDuelSide(player) {
    const pState = localDuelState[player];
    if (!pState || !pState.currentQ) return;

    const q = pState.currentQ;
    const tagEl = document.getElementById(`local-player-tag-${player}`);
    const wordEl = document.getElementById(`local-word-${player}`);
    const phoneEl = document.getElementById(`local-phone-${player}`);
    const scoreEl = document.getElementById(`local-score-${player}`);
    const roundEl = document.getElementById(`local-round-${player}`);
    const bookEl = document.getElementById(`local-book-badge-${player}`);
    const optContainer = document.getElementById(`local-options-${player}`);
    const shiciBadgeEl = document.getElementById(`local-shici-badge-${player}`);
    const shiciBoxEl = document.getElementById(`local-shici-box-${player}`);
    const shiciSentenceEl = document.getElementById(`local-shici-sentence-${player}`);
    const shiciSourceEl = document.getElementById(`local-shici-source-${player}`);
    const shiciFreezeRevealEl = document.getElementById(`local-shici-freeze-reveal-${player}`);
    if (shiciFreezeRevealEl) shiciFreezeRevealEl.style.display = 'none';

    if (tagEl) {
        tagEl.innerText = player === 'p1' ? `🔴 ${pState.name || '红方'}` : `🔵 ${pState.name || '蓝方'}`;
    }
    if (roundEl) roundEl.innerText = `第 ${pState.round || 1} 题`;
    if (bookEl) {
        bookEl.innerText = q.bookName || '对决词库';
    }
    if (scoreEl) scoreEl.innerText = pState.score;

    if (q.isPhrase) {
        if (shiciBadgeEl) shiciBadgeEl.style.display = 'none';
        if (shiciBoxEl) shiciBoxEl.style.display = 'none';
        if (wordEl) {
            wordEl.style.display = 'flex';
            wordEl.innerText = q.meaning || '请拼出对应英文词组';
        }
        if (phoneEl) {
            phoneEl.innerText = '';
            phoneEl.style.display = 'none';
        }

        const phrState = localPhraseState[player];
        if (!optContainer || !phrState) return;

        optContainer.className = 'options-grid';
        optContainer.innerHTML = `
                <div class="phrase-container" style="margin:0 0 10px;">
                    <div class="phrase-slots-row" id="local-phrase-slots-${player}">
                        ${phrState.targetWords.map((tw, i) => {
            if (isFixedPhraseToken(tw)) {
                return `<div class="phrase-slot filled fixed" id="local-slot-${player}-${i}">${escapeHtml(tw)}</div>`;
            }
            return `
                            <div class="phrase-slot empty" 
                                 id="local-slot-${player}-${i}" 
                                 onpointerdown="handleLocalPhraseSlotPointerDown(event, '${player}', ${i})"></div>
                        `;
        }).join('')}
                    </div>
                    <div id="local-phrase-compare-${player}" class="phrase-comparison-card" style="display: none;"></div>
                    <div class="phrase-bank-card">
                        <div class="phrase-bank-header">
                            <span>备选词框：</span>
                            <button type="button" class="btn-clear-phrase" id="btn-clear-local-phrase-${player}" onpointerdown="clearLocalPhraseSlots(event, '${player}')">
                                清空已选
                            </button>
                        </div>
                        <div class="phrase-chips-grid" id="local-phrase-bank-${player}">
                            ${phrState.chips.map(c => `
                                <button type="button" class="phrase-word-chip" id="local-chip-${player}-${c.id}" onpointerdown="handleLocalPhraseChipPointerDown(event, '${player}', '${c.id}')">
                                    ${c.text}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
    } else if (q.isShiCi) {
        if (wordEl) wordEl.style.display = 'none';
        if (phoneEl) phoneEl.style.display = 'none';
        if (shiciBadgeEl) {
            shiciBadgeEl.style.display = 'inline-flex';
            shiciBadgeEl.innerText = `${q.word} ${q.pinyin || ''}`.trim();
        }
        if (shiciBoxEl) {
            shiciBoxEl.style.display = 'block';
            if (shiciSentenceEl) shiciSentenceEl.innerHTML = q.highlightedSentence || escapeHtml(q.sentence || q.word);
            if (shiciSourceEl) shiciSourceEl.innerText = `—— ${q.source || '《古文》'}`;
        }

        if (optContainer) {
            optContainer.className = 'shici-options-grid';
            const letters = ['A', 'B', 'C', 'D'];
            optContainer.innerHTML = q.options.map((opt, idx) => `
                    <button class="shici-opt-btn" 
                            id="local-opt-${player}-${idx}" 
                            data-idx="${idx}" 
                            onpointerdown="handleLocalPointerDown(event, '${player}', ${idx})">
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.rawMeaning || (opt.meaning || '').replace(/^\[.*?\]\s*/, ''))}</span>
                    </button>
                `).join('');
        }
    } else {
        if (shiciBadgeEl) shiciBadgeEl.style.display = 'none';
        if (shiciBoxEl) shiciBoxEl.style.display = 'none';
        if (wordEl) {
            wordEl.style.display = 'flex';
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
                    <button class="single-opt-btn" 
                            id="local-opt-${player}-${idx}" 
                            data-idx="${idx}" 
                            onpointerdown="handleLocalPointerDown(event, '${player}', ${idx})">
                        <span class="opt-trans">${escapeHtml(opt.meaning || opt.word)}</span>
                    </button>
                `).join('');
        }
    }
}

function clearLocalPhraseSlots(e, player) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    phrState.placed.forEach((chipId, idx) => {
        if (chipId && !String(chipId).startsWith('__fixed__')) {
            const slotEl = document.getElementById(`local-slot-${player}-${idx}`);
            if (slotEl) {
                slotEl.classList.remove('filled', 'correct', 'wrong');
                slotEl.classList.add('empty');
                slotEl.innerText = '';
            }
            const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
            if (chipEl) {
                chipEl.classList.remove('used');
                chipEl.disabled = false;
            }
            phrState.placed[idx] = null;
        }
    });
    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';
}

function handleLocalPhraseChipPointerDown(e, player, chipId) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const emptyIdx = phrState.placed.findIndex(p => p === null);
    if (emptyIdx === -1) return;

    const chip = phrState.chips.find(c => c.id === chipId);
    if (!chip) return;

    phrState.placed[emptyIdx] = chipId;

    const slotEl = document.getElementById(`local-slot-${player}-${emptyIdx}`);
    if (slotEl) {
        slotEl.classList.remove('empty', 'correct', 'wrong');
        slotEl.classList.add('filled');
        slotEl.innerText = chip.text;
    }

    const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
    if (chipEl) chipEl.classList.add('used');

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';

    if (!phrState.placed.includes(null)) {
        checkLocalPhraseAnswer(player);
    }
}

function handleLocalPhraseSlotPointerDown(e, player, slotIdx) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const chipId = phrState.placed[slotIdx];
    if (!chipId || String(chipId).startsWith('__fixed__')) return;

    phrState.placed[slotIdx] = null;

    const slotEl = document.getElementById(`local-slot-${player}-${slotIdx}`);
    if (slotEl) {
        slotEl.classList.remove('filled', 'correct', 'wrong');
        slotEl.classList.add('empty');
        slotEl.innerText = '';
    }

    const chipEl = document.getElementById(`local-chip-${player}-${chipId}`);
    if (chipEl) chipEl.classList.remove('used');

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) comp.style.display = 'none';
}

function checkLocalPhraseAnswer(player) {
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState || pState.answered) return;
    if (Date.now() < pState.frozenUntil) return;

    const placedWords = phrState.placed.map((cid, i) => {
        if (String(cid).startsWith('__fixed__')) {
            return phrState.targetWords[i].toLowerCase();
        }
        const c = phrState.chips.find(item => item.id === cid);
        return c ? c.text.toLowerCase() : '';
    });
    const targetWordsLower = phrState.targetWords.map(w => w.toLowerCase());
    const isRight = (placedWords.join(' ') === targetWordsLower.join(' '));

    if (isRight) {
        pState.answered = true;
        pState.score++;

        phrState.placed.forEach((cid, i) => {
            const slotEl = document.getElementById(`local-slot-${player}-${i}`);
            if (slotEl && !String(cid).startsWith('__fixed__')) {
                slotEl.classList.remove('wrong');
                slotEl.classList.add('correct');
            }
        });

        const comp = document.getElementById(`local-phrase-compare-${player}`);
        if (comp) comp.style.display = 'none';
        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = true;

        const scoreEl = document.getElementById(`local-score-${player}`);
        if (scoreEl) scoreEl.innerText = pState.score;

        spawnParticles(
            player === 'p1' ? window.innerWidth * 0.25 : window.innerWidth * 0.75,
            window.innerHeight * 0.5,
            player === 'p1' ? '#B3261E' : '#006874'
        );

        updateLocalDuelGauge();
        if (checkLocalDuelWinCondition()) return;

        setTimeout(() => {
            if (!localDuelState.active) return;
            generateLocalDuelQuestion(player);
        }, 300);
    } else {
        const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
        recordUserMistake(pName, phrState.targetWords.join(' '), phrState.correctMeaning || phrState.q?.meaning, '');

        phrState.targetWords.forEach((tw, i) => {
            const slotEl = document.getElementById(`local-slot-${player}-${i}`);
            if (!slotEl || isFixedPhraseToken(tw)) return;
            const chipId = phrState.placed[i];
            const chip = chipId ? phrState.chips.find(c => c.id === chipId) : null;
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

        const comp = document.getElementById(`local-phrase-compare-${player}`);
        if (comp) {
            comp.className = 'phrase-comparison-card wrong-state';
            comp.style.display = 'block';
            comp.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                        <div class="phrase-compare-row">
                            <span class="phrase-compare-badge wrong">✕ 搭配有误</span>
                            <span id="local-penalty-tip-${player}" style="font-size:0.85rem; color:var(--md-sys-color-error); font-weight:600;">冷却 <strong id="local-phrase-cooldown-${player}">3</strong> 秒后可重试</span>
                        </div>
                        <button type="button" class="btn-reveal-ten-sec" id="btn-local-reveal-${player}" onpointerdown="handleLocalRevealPhrase(event, '${player}')">
                            跳过本题，惩罚 10 秒
                        </button>
                    </div>
                `;
        }

        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = true;

        triggerLocalPhrasePenalty(player);
    }
}

function triggerLocalPhrasePenalty(player) {
    const pState = localDuelState[player];
    if (!pState) return;

    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    if (freezeInfo) freezeInfo.style.display = 'none';

    pState.frozenUntil = Date.now() + 3000;
    let sec = 3;

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    pState.freezeTick = setInterval(() => {
        sec--;
        const tipNum = document.getElementById(`local-phrase-cooldown-${player}`);
        if (tipNum) tipNum.innerText = Math.max(0, sec);
        if (sec <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 1000);

    pState.freezeTimer = setTimeout(() => {
        pState.frozenUntil = 0;
        const tipEl = document.getElementById(`local-penalty-tip-${player}`);
        if (tipEl) {
            tipEl.innerText = '可点击槽位撤回并重新选择';
            tipEl.style.color = 'var(--md-sys-color-primary)';
        }
        const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
        if (clearBtn) clearBtn.disabled = false;
    }, 3000);
}

function handleLocalRevealPhrase(e, player) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const pState = localDuelState[player];
    const phrState = localPhraseState[player];
    if (!pState || !phrState) return;

    const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
    recordUserMistake(pName, phrState.targetWords.join(' '), phrState.correctMeaning || phrState.q?.meaning, '');

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    phrState.targetWords.forEach((tw, i) => {
        const slotEl = document.getElementById(`local-slot-${player}-${i}`);
        if (slotEl && !isFixedPhraseToken(tw)) {
            slotEl.classList.remove('empty', 'wrong');
            slotEl.classList.add('filled', 'correct');
            slotEl.innerText = tw;
        }
    });

    const clearBtn = document.getElementById(`btn-clear-local-phrase-${player}`);
    if (clearBtn) clearBtn.disabled = true;
    phrState.chips.forEach(c => {
        const chipEl = document.getElementById(`local-chip-${player}-${c.id}`);
        if (chipEl) {
            chipEl.classList.add('used');
            chipEl.disabled = true;
        }
    });

    const comp = document.getElementById(`local-phrase-compare-${player}`);
    if (comp) {
        comp.className = 'phrase-comparison-card';
        comp.style.display = 'block';
        comp.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <div class="phrase-compare-row">
                        <span class="phrase-compare-badge correct">✓ 正确词组</span>
                        <span class="phrase-compare-text correct" style="font-size:1.1rem;">${phrState.targetWords.join(' ')}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--md-sys-color-error); font-weight:700;">
                        跳过本题，惩罚 10 秒
                    </div>
                </div>
            `;
    }

    pState.frozenUntil = Date.now() + 10000;
    pState.answered = true;

    const overlay = document.getElementById(`local-freeze-${player}`);
    const numEl = document.getElementById(`local-freeze-num-${player}`);
    const barInner = document.getElementById(`local-freeze-bar-${player}`);
    const freezeTitle = overlay ? overlay.querySelector('.local-freeze-title') : null;
    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    const freezePhrase = document.getElementById(`local-freeze-phrase-${player}`);
    const freezeMeaning = document.getElementById(`local-freeze-meaning-${player}`);

    if (freezeTitle) freezeTitle.innerText = "跳过本题，惩罚 10 秒";
    if (freezePhrase) freezePhrase.innerText = phrState.targetWords.join(' ');
    if (freezeMeaning) freezeMeaning.innerText = phrState.correctMeaning || phrState.q?.meaning || '';
    if (freezeInfo) freezeInfo.style.display = 'flex';
    if (overlay) overlay.style.display = 'flex';
    if (numEl) numEl.innerText = '10';
    if (barInner) barInner.style.width = '100%';

    const startTime = Date.now();
    pState.freezeTick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainMs = Math.max(0, 10000 - elapsed);
        const remainSec = Math.ceil(remainMs / 1000);

        if (numEl) numEl.innerText = remainSec;
        if (barInner) barInner.style.width = `${(remainMs / 10000) * 100}%`;

        if (remainMs <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 100);

    pState.freezeTimer = setTimeout(() => {
        if (overlay) {
            overlay.style.display = 'none';
            if (freezeTitle) freezeTitle.innerText = "答错惩罚";
        }
        if (freezeInfo) freezeInfo.style.display = 'none';
        pState.frozenUntil = 0;
        pState.answered = false;

        if (localDuelState.active) {
            generateLocalDuelQuestion(player);
        }
    }, 10000);
}

function handleLocalPointerDown(e, player, optIdx) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    handleLocalDuelAnswer(player, optIdx);
}

function handleLocalDuelAnswer(player, optIdx) {
    if (!localDuelState.active) return;
    const pState = localDuelState[player];
    if (!pState || !pState.currentQ) return;

    if (Date.now() < pState.frozenUntil) return;
    if (pState.answered) return;

    const q = pState.currentQ;
    const optContainer = document.getElementById(`local-options-${player}`);
    const card = optContainer ? optContainer.querySelector(`[data-idx="${optIdx}"]`) : null;

    if (optIdx === q.correctIdx) {
        pState.answered = true;
        pState.score++;
        if (card) card.classList.add('correct');
        const scoreEl = document.getElementById(`local-score-${player}`);
        if (scoreEl) scoreEl.innerText = pState.score;

        spawnParticles(
            player === 'p1' ? window.innerWidth * 0.25 : window.innerWidth * 0.75,
            window.innerHeight * 0.5,
            player === 'p1' ? '#B3261E' : '#006874'
        );

        updateLocalDuelGauge();
        if (checkLocalDuelWinCondition()) return;

        setTimeout(() => {
            if (!localDuelState.active) return;
            generateLocalDuelQuestion(player);
        }, 180);
    } else {
        if (card) card.classList.add('wrong');
        const correctCard = optContainer ? optContainer.querySelector(`[data-idx="${q.correctIdx}"]`) : null;
        if (correctCard) correctCard.classList.add('correct');
        const pName = (pState && pState.name) || (player === 'p1' ? (currentUser || '红方') : (localDuelConfig.opponentName || '蓝方'));
        if (q.isShiCi) {
            const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : (q.options[q.correctIdx]?.rawMeaning || q.options[q.correctIdx]?.meaning || q.meaning);
            recordShiCiUserMistake(pName, {
                word: q.word,
                meaning: fullMeaning,
                pinyin: q.pinyin || q.phone || '',
                sentence: q.sentence || q.example?.sentence || '',
                highlightedSentence: q.highlightedSentence || '',
                source: q.source || q.example?.source || '',
                pos: q.sense?.part_of_speech || q.pos || q.options[q.correctIdx]?.pos || '',
                isShiCi: true
            });
        } else {
            recordUserMistake(pName, q.word, q.options[q.correctIdx]?.meaning || q.meaning, q.phone);
        }
        triggerLocalPenalty(player);
    }
}

function triggerLocalPenalty(player) {
    const pState = localDuelState[player];
    if (!pState) return;

    pState.frozenUntil = Date.now() + 3000;
    const overlay = document.getElementById(`local-freeze-${player}`);
    const numEl = document.getElementById(`local-freeze-num-${player}`);
    const barInner = document.getElementById(`local-freeze-bar-${player}`);
    const freezeInfo = document.getElementById(`local-freeze-info-${player}`);
    const freezeTitle = overlay ? overlay.querySelector('.local-freeze-title') : null;
    const shiciFreezeRevealEl = document.getElementById(`local-shici-freeze-reveal-${player}`);
    const shiciSenseEl = document.getElementById(`local-shici-freeze-sense-${player}`);
    const shiciAnnotEl = document.getElementById(`local-shici-freeze-annot-${player}`);

    const q = pState.currentQ;
    const isShiCi = Boolean(q && q.isShiCi);

    if (freezeTitle) freezeTitle.innerText = "答错惩罚";
    if (freezeInfo) freezeInfo.style.display = 'none';

    if (isShiCi && shiciFreezeRevealEl) {
        if (shiciSenseEl) {
            const posStr = (q.sense?.part_of_speech || q.pos || q.options?.[q.correctIdx]?.pos) ? `[${q.sense?.part_of_speech || q.pos || q.options?.[q.correctIdx]?.pos}] ` : '';
            const meaningStr = (q.sense?.meaning || q.options?.[q.correctIdx]?.rawMeaning || q.options?.[q.correctIdx]?.meaning || q.meaning || '').replace(/★/g, '');
            shiciSenseEl.innerText = `${posStr}${meaningStr}`;
        }
        if (shiciAnnotEl) {
            const annotStr = q.example?.annotation || (q.sentence ? `在“${q.sentence}”中作相应释义` : '');
            shiciAnnotEl.innerText = annotStr || '请注意该实词在语境中的释义与用法';
        }
        shiciFreezeRevealEl.style.display = 'block';
    } else if (shiciFreezeRevealEl) {
        shiciFreezeRevealEl.style.display = 'none';
    }

    if (overlay) overlay.style.display = 'flex';
    if (numEl) numEl.innerText = '3';
    if (barInner) barInner.style.width = '100%';

    if (pState.freezeTimer) clearTimeout(pState.freezeTimer);
    if (pState.freezeTick) clearInterval(pState.freezeTick);

    const startTime = Date.now();
    pState.freezeTick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainMs = Math.max(0, 3000 - elapsed);
        const remainSec = Math.ceil(remainMs / 1000);
        if (numEl) numEl.innerText = remainSec;
        if (barInner) barInner.style.width = `${(remainMs / 3000) * 100}%`;
        if (remainMs <= 0) {
            clearInterval(pState.freezeTick);
        }
    }, 50);

    pState.freezeTimer = setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        if (freezeInfo) freezeInfo.style.display = 'none';
        if (shiciFreezeRevealEl) shiciFreezeRevealEl.style.display = 'none';
        pState.frozenUntil = 0;
        if (localDuelState.active) {
            generateLocalDuelQuestion(player);
        }
    }, 3000);
}

function updateLocalDuelGauge() {
    const p1Score = localDuelState.p1.score;
    const p2Score = localDuelState.p2.score;

    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    const p1Label = document.getElementById('local-duel-p1-lead-label');
    const p2Label = document.getElementById('local-duel-p2-lead-label');
    const ruleBadge = document.getElementById('local-duel-rule-badge');
    const statusSub = document.getElementById('local-duel-status-sub');
    const tugP1 = document.getElementById('local-tug-p1');
    const tugP2 = document.getElementById('local-tug-p2');
    const tugPin = document.getElementById('local-tug-pin');

    if (p1Label) p1Label.innerText = `🔴 ${p1Name} ${p1Score}`;
    if (p2Label) p2Label.innerText = `${p2Name} ${p2Score} 🔵`;

    if (localDuelState.mode === 'timed') {
        if (ruleBadge) ruleBadge.innerText = `剩余时间: ${localDuelState.timeLeft}s`;
    } else {
        if (ruleBadge) ruleBadge.innerText = `领先 ${localDuelState.leadThreshold} 题胜出`;
    }

    let ratio = 50;
    if (localDuelState.mode === 'lead') {
        const diff = p1Score - p2Score;
        const maxDiff = localDuelState.leadThreshold;
        ratio = 50 + (diff / maxDiff) * 50;
        ratio = Math.max(0, Math.min(100, ratio));

        if (statusSub) {
            if (diff > 0) statusSub.innerText = `${p1Name} 领先 ${diff} 题！(还需 ${maxDiff - diff} 题胜出)`;
            else if (diff < 0) statusSub.innerText = `${p2Name} 领先 ${Math.abs(diff)} 题！(还需 ${maxDiff - Math.abs(diff)} 题胜出)`;
            else statusSub.innerText = '双方平分秋色，胜负未分！';
        }
    } else {
        const total = p1Score + p2Score;
        ratio = total > 0 ? (p1Score / total) * 100 : 50;
        if (statusSub) {
            const diff = p1Score - p2Score;
            if (diff > 0) statusSub.innerText = `${p1Name} 领先 ${diff} 分`;
            else if (diff < 0) statusSub.innerText = `${p2Name} 领先 ${Math.abs(diff)} 分`;
            else statusSub.innerText = '比分持平';
        }
    }

    if (tugP1) tugP1.style.width = `${ratio}%`;
    if (tugP2) tugP2.style.width = `${100 - ratio}%`;
    if (tugPin) tugPin.style.left = `calc(${ratio}% - 3px)`;

    const cvs = document.getElementById('localSnakeCanvas');
    if (cvs) {
        let centerText = '';
        if (localDuelState.mode === 'timed') {
            let m = Math.floor(localDuelState.timeLeft / 60), s = localDuelState.timeLeft % 60;
            centerText = `${m}:${s.toString().padStart(2, '0')}`;
        } else {
            const diff = p1Score - p2Score;
            if (diff > 0) centerText = `+${diff}🔴`;
            else if (diff < 0) centerText = `🔵+${Math.abs(diff)}`;
            else centerText = `平`;
        }
        drawDualEnergyRing(cvs, p1Score, p2Score, localDuelState.leadThreshold || 6, true, centerText);
    }
    const snakeRule = document.getElementById('local-snake-rule-summary');
    if (snakeRule) {
        if (localDuelState.mode === 'timed') {
            snakeRule.innerText = `剩余时间: ${localDuelState.timeLeft}s`;
        } else {
            snakeRule.innerText = `领先 ${localDuelState.leadThreshold} 题胜出`;
        }
    }
}

function checkLocalDuelWinCondition() {
    if (!localDuelState.active) return false;
    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    if (localDuelState.mode === 'lead') {
        const diff = localDuelState.p1.score - localDuelState.p2.score;
        if (diff >= localDuelState.leadThreshold) {
            endLocalDuel('p1', `🎉 ${p1Name} 领先达到 ${localDuelState.leadThreshold} 题，拔河获胜！`);
            return true;
        } else if (-diff >= localDuelState.leadThreshold) {
            endLocalDuel('p2', `🎉 ${p2Name} 领先达到 ${localDuelState.leadThreshold} 题，拔河获胜！`);
            return true;
        }
    }
    return false;
}

function endLocalDuel(winner, detailText) {
    localDuelState.active = false;
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);

    const p1Name = (localDuelState.p1 && localDuelState.p1.name) || '红方';
    const p2Name = (localDuelState.p2 && localDuelState.p2.name) || '蓝方';

    let title = '对决结束';
    let icon = '🏆';
    if (winner === 'p1') {
        title = `🔴 ${p1Name} 获胜！`;
        spawnParticles(window.innerWidth * 0.25, window.innerHeight * 0.5, '#B3261E');
    } else if (winner === 'p2') {
        title = `🔵 ${p2Name} 获胜！`;
        spawnParticles(window.innerWidth * 0.75, window.innerHeight * 0.5, '#006874');
    } else {
        title = '🤝 握手言和，双方平局！';
        icon = '⚖️';
    }

    const p1Final = localDuelState.p1 ? localDuelState.p1.score : 0;
    const p2Final = localDuelState.p2 ? localDuelState.p2.score : 0;

    document.getElementById('result-icon').innerText = icon;
    document.getElementById('result-message').innerText = title;
    document.getElementById('result-details').innerHTML = `
            <p style="font-size:1.15rem; font-weight:700; margin:10px 0;">${detailText || ''}</p>
            <div style="display:flex; justify-content:center; gap:24px; font-size:1.25rem; font-weight:800; margin:16px 0;">
                <span style="color:var(--p1-sys-color);">🔴 ${p1Name}: ${p1Final} 题</span>
                <span style="color:var(--md-sys-color-outline);">VS</span>
                <span style="color:var(--p2-sys-color);">🔵 ${p2Name}: ${p2Final} 题</span>
            </div>
        `;

    const btnBack = document.getElementById('btn-back-room');
    if (btnBack) {
        btnBack.innerHTML = `
                <span class="material-symbols-rounded" style="font-size:20px;">replay</span>
                <span class="btn-label-text">再战一局</span>
            `;
        btnBack.onclick = () => { startLocalDuel(); };
    }

    switchView('view-result');
}

function restartLocalDuel() {
    if (confirm('确认重新开始本局对决吗？比分将清零。')) {
        startLocalDuel();
    }
}

function confirmExitLocalDuel() {
    localDuelState.active = false;
    if (localDuelState.clockTimer) clearInterval(localDuelState.clockTimer);
    if (localDuelState.p1.freezeTimer) clearTimeout(localDuelState.p1.freezeTimer);
    if (localDuelState.p1.freezeTick) clearInterval(localDuelState.p1.freezeTick);
    if (localDuelState.p2.freezeTimer) clearTimeout(localDuelState.p2.freezeTimer);
    if (localDuelState.p2.freezeTick) clearInterval(localDuelState.p2.freezeTick);
    switchView('view-hub');
}

/* --- End: views/local-duel.js --- */

/* --- Begin: views/dictation.js --- */
/**
 * 听音/看义默写练习视图
 * Module: assets/js/views/dictation.js
 */

/* ==========================================================================
   11. 听音/看义默写模式
   ========================================================================== */
let dictationConfig = {
    type: 'listen',
    batchSize: 20,
    autoPlay: true,
    selectedBooks: []
};
try {
    const saved = JSON.parse(localStorage.getItem('vocab_dictation_config') || '{}');
    if (saved && typeof saved === 'object') {
        if (saved.type) dictationConfig.type = saved.type;
        if (saved.batchSize) dictationConfig.batchSize = saved.batchSize;
        if (saved.autoPlay !== undefined) dictationConfig.autoPlay = saved.autoPlay;
        if (Array.isArray(saved.selectedBooks)) dictationConfig.selectedBooks = saved.selectedBooks;
    }
} catch (e) { }

let dictationState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    currentQ: null,
    answered: false
};

function openDictationSettings() {
    folderTreeCollapseMap = {};
    const modal = document.getElementById('modal-dictation-settings');
    if (!modal) return;
    renderDictationBookChips();
    updateDictationSettingsChips();
    modal.classList.add('active');
}

function closeDictationSettings() {
    const modal = document.getElementById('modal-dictation-settings');
    if (modal) modal.classList.remove('active');
}

function renderDictationBookChips() {
    const container = document.getElementById('chips-dictation-books');
    if (!container) return;
    if (!Array.isArray(dictationConfig.selectedBooks) || dictationConfig.selectedBooks.length === 0) {
        dictationConfig.selectedBooks = [(BookManager.availableBooks[0]?.id || 'GaoKao3500')];
    }
    renderBookFolderTree('chips-dictation-books', {
        selectedIds: dictationConfig.selectedBooks,
        onToggle: 'toggleDictationBook',
        mode: 'dictation'
    });
}

function toggleDictationBook(bookId) {
    if (!Array.isArray(dictationConfig.selectedBooks)) {
        dictationConfig.selectedBooks = [];
    }
    const hasIt = isBookIdSelected(dictationConfig.selectedBooks, bookId);
    if (hasIt) {
        if (dictationConfig.selectedBooks.length <= 1) {
            showToast('至少保留一本词书！');
            return;
        }
        dictationConfig.selectedBooks = toggleBookIdInList(dictationConfig.selectedBooks, bookId);
    } else {
        dictationConfig.selectedBooks.push(bookId);
    }
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
    renderDictationBookChips();
}

function updateDictationSettingsChips() {
    document.querySelectorAll('#chips-dictation-type .md3-chip').forEach(c => {
        const type = c.getAttribute('data-type');
        c.classList.toggle('selected', type === dictationConfig.type);
    });
    document.querySelectorAll('#chips-dictation-batch .md3-chip').forEach(c => {
        const val = parseInt(c.getAttribute('data-val'));
        c.classList.toggle('selected', val === dictationConfig.batchSize);
    });

    // 同步 MD3 滑动开关状态
    const autoSwitch = document.getElementById('switch-dictation-autoplay');
    if (autoSwitch) autoSwitch.checked = !!dictationConfig.autoPlay;

    const kbSwitch = document.getElementById('switch-dictation-kb');
    if (kbSwitch) kbSwitch.checked = (dictationVirtualKeyboardEnabled !== false);
}

function toggleDictationAutoplaySwitch(checked) {
    if (!navigator.onLine && checked) {
        showToast('当前未联网，无法开启发音');
        const autoSwitch = document.getElementById('switch-dictation-autoplay');
        if (autoSwitch) autoSwitch.checked = false;
        return;
    }
    dictationConfig.autoPlay = Boolean(checked);
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
}

function toggleDictationKbSwitch(checked) {
    dictationVirtualKeyboardEnabled = Boolean(checked);
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    renderDictationKeyboard();
}

function selectDictationType(type) {
    dictationConfig.type = type;
    updateDictationSettingsChips();
}

function selectDictationBatch(val) {
    dictationConfig.batchSize = val;
    updateDictationSettingsChips();
}

function selectDictationAutoplay(val) {
    if (!navigator.onLine && val) {
        showToast('当前未联网，无法开启发音');
        return;
    }
    dictationConfig.autoPlay = val;
    updateDictationSettingsChips();
}

function saveDictationSettings() {
    localStorage.setItem('vocab_dictation_config', JSON.stringify(dictationConfig));
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    closeDictationSettings();
    showToast('默写设置已保存');
}

function confirmExitDictation() {
    switchView('view-hub');
}

async function startDictationPractice() {
    resetAllGameAlertsAndFeedback();
    let bookIds = dictationConfig.selectedBooks;
    if (!bookIds || bookIds.length === 0) {
        bookIds = (singleSelectedBookIds && singleSelectedBookIds.length > 0)
            ? singleSelectedBookIds
            : [(BookManager.availableBooks[0]?.id || 'GaoKao3500')];
    }
    const words = await BookManager.loadMultipleBooks(bookIds);
    if (!words || words.length === 0) {
        showToast('所选词书没有词汇，请先检查词书');
        return;
    }

    const unmastered = words.filter(w => !isWordMastered(w.word));
    const activeWords = unmastered.length > 0 ? unmastered : words;
    const shuffled = shuffle([...activeWords]);
    const batchCount = Math.min(dictationConfig.batchSize || 20, shuffled.length);
    const pool = shuffled.slice(0, batchCount).map(w => {
        const meaning = (w.meanings && w.meanings.length > 0)
            ? w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；')
            : (w.meaning || '---');
        const isPhrase = (w.word || '').trim().includes(' ');
        const targetTokens = isPhrase ? extractPhraseTargetWords(w.word) : [w.word.trim()];
        return {
            word: w.word.trim(),
            meaning: meaning,
            phone: w.phone || '',
            bookName: w.bookName || '默写词库',
            isPhrase: isPhrase,
            targetTokens: targetTokens
        };
    });

    dictationState = {
        pool: pool,
        currentIdx: 0,
        score: 0,
        total: 0,
        currentQ: null,
        answered: false
    };

    renderDictationQuestion();
    switchView('view-dictation');
}

function renderDictationQuestion() {
    if (dictationState.currentIdx >= dictationState.pool.length) {
        endDictationSession();
        return;
    }

    const q = dictationState.pool[dictationState.currentIdx];
    dictationState.currentQ = q;
    dictationState.answered = false;

    const badge = document.getElementById('dictation-book-badge');
    if (badge) badge.innerText = q.bookName;

    const progEl = document.getElementById('dictation-progress-text');
    if (progEl) progEl.innerText = `${dictationState.currentIdx + 1} / ${dictationState.pool.length}`;

    const dProgFillEl = document.getElementById('dictation-progress-fill');
    if (dProgFillEl) {
        dProgFillEl.style.width = Math.round(((dictationState.currentIdx + 1) / dictationState.pool.length) * 100) + '%';
    }

    const typeBadge = document.getElementById('dictation-type-badge');
    if (typeBadge) {
        if (q.isPhrase) {
            typeBadge.innerText = '词组看义默写';
        } else {
            typeBadge.innerText = (dictationConfig.type === 'listen') ? '听音写词' : '看义写词';
        }
    }

    const promptMain = document.getElementById('dictation-prompt-main');
    const promptSub = document.getElementById('dictation-prompt-sub');
    const audioBtn = document.getElementById('btn-dictation-audio');

    if (q.isPhrase) {
        if (promptMain) promptMain.innerText = q.meaning;
        if (promptSub) { promptSub.innerText = ''; promptSub.style.display = 'none'; }
        if (audioBtn) audioBtn.style.display = 'none';
    } else {
        if (dictationConfig.type === 'listen') {
            if (promptMain) promptMain.innerText = '请听发音输入单词';
            if (promptSub) {
                promptSub.innerText = '';
                promptSub.style.display = 'none';
            }
            if (audioBtn) audioBtn.style.display = 'inline-flex';
        } else {
            if (promptMain) promptMain.innerText = q.meaning;
            if (promptSub) { promptSub.innerText = ''; promptSub.style.display = 'none'; }
            if (audioBtn) audioBtn.style.display = 'none';
        }
    }

    const feedbackCard = document.getElementById('dictation-feedback-card');
    if (feedbackCard) feedbackCard.style.display = 'none';

    const submitBtn = document.getElementById('btn-dictation-submit');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');
    if (submitBtnText) submitBtnText.innerText = '确认';
    if (submitBtn) {
        submitBtn.onclick = () => submitDictationAnswer();
        submitBtn.className = 'btn btn-filled btn-sm';
    }

    const hintBtn = document.getElementById('btn-dictation-hint');
    if (hintBtn) {
        hintBtn.disabled = false;
        hintBtn.style.opacity = '1';
    }

    const inputArea = document.getElementById('dictation-input-area');
    if (!inputArea) return;

    if (!q.isPhrase) {
        inputArea.innerHTML = `
                <div class="dictation-slots-container">
                    <div class="dictation-slot-item">
                        <input type="text" id="dictation-word-input" class="dictation-slot-input" placeholder="输入英文单词..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key==='Enter') submitDictationAnswer()">
                        <span class="dictation-slot-len-badge">${q.word.length} 字母</span>
                    </div>
                </div>
            `;
        const wordInput = document.getElementById('dictation-word-input');
        if (wordInput) {
            setTimeout(() => wordInput.focus(), 150);
        }
    } else {
        let slotsHtml = '<div class="dictation-slots-container">';
        q.targetTokens.forEach((token, idx) => {
            if (isFixedPhraseToken(token)) {
                slotsHtml += `<div class="dictation-slot-block-fixed" id="dictation-slot-fixed-${idx}">${escapeHtml(token)}</div>`;
            } else {
                const lenHint = token.includes('/')
                    ? token.split('/').map(t => t.length).filter((v, i, a) => a.indexOf(v) === i).join('/') + ' 字母'
                    : token.length + ' 字母';
                slotsHtml += `
                        <div class="dictation-slot-item">
                            <input type="text" class="dictation-slot-input" id="dictation-slot-input-${idx}" data-idx="${idx}" data-token="${escapeHtml(token)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" onkeydown="handleDictationSlotKey(event, ${idx})" oninput="handleDictationSlotInput(event, ${idx})" onfocus="handleDictationSlotFocus(this)" onblur="handleDictationSlotBlur(this)">
                            <span class="dictation-slot-len-badge">${lenHint}</span>
                        </div>
                    `;
            }
        });
        slotsHtml += '</div>';
        inputArea.innerHTML = slotsHtml;

        setTimeout(() => {
            const firstInput = inputArea.querySelector('.dictation-slot-input');
            if (firstInput) firstInput.focus();
        }, 150);
    }

    if (dictationConfig.type === 'listen' && !q.isPhrase && dictationConfig.autoPlay && navigator.onLine) {
        setTimeout(() => playDictationAudio(), 250);
    }
    if (typeof renderDictationKeyboard === 'function') {
        renderDictationKeyboard();
    }
}

function handleDictationSlotKey(event, idx) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitDictationAnswer();
    } else if (event.key === ' ' || event.key === 'Tab') {
        event.preventDefault();
        const allInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        const currIdx = allInputs.findIndex(el => parseInt(el.getAttribute('data-idx')) === idx);
        if (currIdx >= 0 && currIdx < allInputs.length - 1) {
            allInputs[currIdx + 1].focus();
        }
    }
}

function handleDictationSlotInput(event, idx) {
    const el = event.target;
    const token = el.getAttribute('data-token') || '';
    if (el.value.length >= token.length) {
        const allInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        const currIdxInList = allInputs.indexOf(el);
        if (currIdxInList >= 0 && currIdxInList < allInputs.length - 1) {
            allInputs[currIdxInList + 1].focus();
        }
    }
}

function handleDictationHint() {
    if (!dictationState.currentQ || dictationState.answered) return;
    const q = dictationState.currentQ;

    if (!q.isPhrase) {
        const input = document.getElementById('dictation-word-input');
        if (!input) return;
        const currentVal = input.value.trim();
        const target = q.word;

        let matchLen = 0;
        while (matchLen < currentVal.length && matchLen < target.length && currentVal[matchLen].toLowerCase() === target[matchLen].toLowerCase()) {
            matchLen++;
        }
        if (matchLen < target.length) {
            const nextChar = target[matchLen];
            input.value = target.slice(0, matchLen + 1);
            showToast(`已补全第 ${matchLen + 1} 个字母「${nextChar}」`);
        } else {
            input.value = target;
            showToast('已补全完整单词');
        }
        input.focus();
    } else {
        const inputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        for (const input of inputs) {
            const token = input.getAttribute('data-token') || '';
            if (input.value.trim().toLowerCase() !== token.toLowerCase()) {
                input.value = token;
                const idx = parseInt(input.getAttribute('data-idx'));
                showToast(`已揭示第 ${idx + 1} 格词块「${token}」`);
                input.focus();
                return;
            }
        }
        showToast('所有词块已全部填出');
    }
}

function submitDictationAnswer() {
    if (!dictationState.currentQ) return;
    const q = dictationState.currentQ;

    if (dictationState.answered) {
        dictationState.currentIdx++;
        renderDictationQuestion();
        return;
    }

    let isCorrect = false;

    if (!q.isPhrase) {
        const input = document.getElementById('dictation-word-input');
        const userVal = (input ? input.value : '').trim();
        isCorrect = (userVal.toLowerCase() === q.word.toLowerCase());
        if (input) {
            input.classList.toggle('correct', isCorrect);
            input.classList.toggle('wrong', !isCorrect);
        }
    } else {
        const inputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
        isCorrect = inputs.length > 0 && inputs.every(inp => {
            const token = inp.getAttribute('data-token') || '';
            const ok = isPhraseSlotMatch(inp.value.trim(), token, q);
            inp.classList.toggle('correct', ok);
            inp.classList.toggle('wrong', !ok);
            return ok;
        });
    }

    dictationState.total++;
    dictationState.answered = true;

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');

    if (isCorrect) {
        dictationState.score++;
        if (window.DailyStudyTracker) {
            DailyStudyTracker.record('dictation', 1);
        }
        showToast('回答正确！');

        if (feedbackCard) {
            feedbackCard.style.display = 'block';
            if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
            if (feedbackWord) feedbackWord.innerText = q.word;
            if (feedbackMeaning) {
                feedbackMeaning.innerHTML = `
                        <span>${q.meaning}</span>
                        <button type="button" class="btn-audio-speak" style="width:28px; height:28px; margin-left:6px;" onclick="playWordAudio('${escapeHtml(q.word)}')" title="发音">
                            <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                        </button>
                    `;
            }
        }

        setTimeout(() => {
            if (dictationState.answered) {
                dictationState.currentIdx++;
                renderDictationQuestion();
            }
        }, 800);
    } else {
        recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');

        if (feedbackCard) {
            feedbackCard.style.display = 'block';
            feedbackCard.style.background = 'var(--md-sys-color-error-container)';
            feedbackCard.style.borderColor = 'var(--md-sys-color-error)';
            if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
            if (feedbackWord) {
                feedbackWord.innerText = q.word;
                feedbackWord.style.color = 'var(--md-sys-color-on-error-container)';
            }
            if (feedbackMeaning) feedbackMeaning.innerText = q.meaning;
        }

        if (submitBtnText) submitBtnText.innerText = '下一题';
    }
}

function skipDictationQuestion() {
    if (!dictationState.currentQ) return;
    const q = dictationState.currentQ;

    if (dictationState.answered) {
        dictationState.currentIdx++;
        renderDictationQuestion();
        return;
    }

    dictationState.total++;
    dictationState.answered = true;

    recordUserMistake(currentUser, q.word, q.meaning, q.phone || '');

    const wordInput = document.getElementById('dictation-word-input');
    if (wordInput) wordInput.classList.add('wrong');
    document.querySelectorAll('.dictation-slot-input').forEach(inp => inp.classList.add('wrong'));

    const feedbackCard = document.getElementById('dictation-feedback-card');
    const feedbackTitle = document.getElementById('dictation-feedback-title');
    const feedbackWord = document.getElementById('dictation-feedback-word');
    const feedbackMeaning = document.getElementById('dictation-feedback-meaning');
    const submitBtnText = document.getElementById('btn-dictation-submit-text');

    if (feedbackCard) {
        feedbackCard.style.display = 'block';
        if (feedbackTitle) feedbackTitle.innerText = '正确答案：';
        if (feedbackWord) feedbackWord.innerText = q.word;
        if (feedbackMeaning) {
            feedbackMeaning.innerHTML = `
                    <span>${q.meaning}</span>
                    <button type="button" class="btn-audio-speak" style="width:28px; height:28px; margin-left:6px;" onclick="playWordAudio('${escapeHtml(q.word)}')" title="发音">
                        <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                    </button>
                `;
        }
    }

    if (submitBtnText) submitBtnText.innerText = '下一题';
}

function endDictationSession() {
    const accuracy = dictationState.total > 0 ? Math.round((dictationState.score / dictationState.total) * 100) : 0;
    alert(`🎉 默写练习完成！\n\n总题数：${dictationState.total} 题\n正确数：${dictationState.score} 题\n正确率：${accuracy}%\n\n错题已自动录入个人错题本。`);
    switchView('view-hub');
}


let dictationVirtualKeyboardEnabled = localStorage.getItem('dictation_virtual_keyboard_enabled') !== 'false';

function setDictationKeyboardToggle(enabled) {
    dictationVirtualKeyboardEnabled = Boolean(enabled);
    localStorage.setItem('dictation_virtual_keyboard_enabled', dictationVirtualKeyboardEnabled ? 'true' : 'false');
    document.querySelectorAll('#chips-settings-dictation-kb .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-kb') === String(dictationVirtualKeyboardEnabled));
    });
    renderDictationKeyboard();
    showToast(dictationVirtualKeyboardEnabled ? '默写虚拟键盘已开启' : '默写虚拟键盘已关闭');
}

function renderDictationKeyboard() {
    const container = document.getElementById('dictation-keyboard-container');
    if (!container) return;
    if (dictationVirtualKeyboardEnabled === false) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
    const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
    const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

    container.innerHTML = `
        <div class="dictation-keyboard">
            <div class="dictation-keyboard-row">
                ${row1.map(k => `<button type="button" class="dictation-key" onclick="handleVirtualKeyPress('${k}')">${k}</button>`).join('')}
            </div>
            <div class="dictation-keyboard-row">
                ${row2.map(k => `<button type="button" class="dictation-key" onclick="handleVirtualKeyPress('${k}')">${k}</button>`).join('')}
            </div>
            <div class="dictation-keyboard-row">
                <button type="button" class="dictation-key key-wide" onclick="handleVirtualKeyPress('BACKSPACE')" title="退格删除">
                    <span class="material-symbols-rounded" style="font-size:18px;">backspace</span>
                </button>
                ${row3.map(k => `<button type="button" class="dictation-key" onclick="handleVirtualKeyPress('${k}')">${k}</button>`).join('')}
                <button type="button" class="dictation-key key-wide" onclick="handleVirtualKeyPress('ENTER')" title="确认提交" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-on-primary-container);">
                    <span class="material-symbols-rounded" style="font-size:18px;">check</span>
                </button>
            </div>
            <div class="dictation-keyboard-row">
                <button type="button" class="dictation-key key-space" onclick="handleVirtualKeyPress('SPACE')">空格 (Space)</button>
            </div>
        </div>
    `;
}

function handleVirtualKeyPress(key) {
    const wordInput = document.getElementById('dictation-word-input');
    if (wordInput && wordInput.offsetParent !== null) {
        if (key === 'BACKSPACE') {
            wordInput.value = wordInput.value.slice(0, -1);
        } else if (key === 'ENTER') {
            submitDictationAnswer();
        } else if (key === 'SPACE') {
            wordInput.value += ' ';
        } else {
            wordInput.value += key.toLowerCase();
        }
        wordInput.dispatchEvent(new Event('input'));
        wordInput.focus();
        return;
    }

    const allSlotInputs = Array.from(document.querySelectorAll('.dictation-slot-input'));
    if (allSlotInputs.length > 0) {
        let activeInput = document.activeElement;
        if (!allSlotInputs.includes(activeInput)) {
            activeInput = allSlotInputs.find(inp => inp.value.length < (inp.getAttribute('data-token') || '').length) || allSlotInputs[0];
        }
        const activeIdx = allSlotInputs.indexOf(activeInput);

        if (key === 'BACKSPACE') {
            if (activeInput.value.length > 0) {
                activeInput.value = activeInput.value.slice(0, -1);
            } else if (activeIdx > 0) {
                const prev = allSlotInputs[activeIdx - 1];
                prev.focus();
                prev.value = prev.value.slice(0, -1);
            }
        } else if (key === 'ENTER') {
            submitDictationAnswer();
        } else if (key === 'SPACE') {
            if (activeIdx < allSlotInputs.length - 1) {
                allSlotInputs[activeIdx + 1].focus();
            }
        } else {
            const token = activeInput.getAttribute('data-token') || '';
            activeInput.value += key.toLowerCase();
            activeInput.dispatchEvent(new Event('input'));
            if (activeInput.value.length >= token.length && activeIdx < allSlotInputs.length - 1) {
                allSlotInputs[activeIdx + 1].focus();
            }
        }
    }
}

// ----------------- 听写槽位 Tooltip -----------------
function handleDictationSlotFocus(inputEl) {
    const parent = inputEl.parentElement;
    if (!parent) return;
    const tooltip = parent.querySelector('.dictation-slot-tooltip');
    if (tooltip) tooltip.classList.add('visible');
}

function handleDictationSlotBlur(inputEl) {
    const parent = inputEl.parentElement;
    if (!parent) return;
    const tooltip = parent.querySelector('.dictation-slot-tooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

/* --- End: views/dictation.js --- */

/* --- Begin: views/shici.js --- */
/**
 * 文言实词数据、闯关与结算小结视图
 * Module: assets/js/views/shici.js
 */

/* ==========================================================================
   11.5 背实词模块 (ShiCiManager) & 结算小结生成引擎
   ========================================================================== */
function escapeRegex(str) {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========================
// 结算页面小结渲染函数
// ========================
function toggleSettlementDrawer(el) {
    if (!el) return;
    el.classList.toggle('open');
}

function filterSettlementList(filter, btn) {
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.settlement-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    const container = document.getElementById('settlement-list-container');
    if (!container) return;
    const items = container.querySelectorAll('.settlement-item');
    items.forEach(item => {
        if (filter === 'all') {
            item.style.display = 'block';
        } else if (filter === 'mistakes') {
            item.style.display = (item.getAttribute('data-mistake') === '1') ? 'block' : 'none';
        }
    });
}

function renderSingleSummaryHtml(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    let mistakeCount = pool.filter(q => !q.isCorrect).length;

    let itemsHtml = pool.map((q, idx) => {
        const isMistake = !q.isCorrect;
        const isPhrase = !!(q.isPhrase || (q.word && q.word.trim().includes(' ')));
        const targetMeaning = escapeHtml(q.meaning || (q.options && q.options[q.correctIdx] ? q.options[q.correctIdx].meaning : ''));

        let titleDisplay = '';
        let drawerContent = '';

        if (isPhrase) {
            // 词组规则：词组则将错的地方加粗
            const targetWords = q.targetWords || (typeof extractPhraseTargetWords === 'function' ? extractPhraseTargetWords(q.word) : q.word.split(' '));
            const wrongSlots = Array.isArray(q.wrongSlotIndices) ? q.wrongSlotIndices : [];

            if (isMistake) {
                titleDisplay = targetWords.map((w, i) => {
                    if (typeof isFixedPhraseToken === 'function' && isFixedPhraseToken(w)) return escapeHtml(w);
                    const isSlotWrong = wrongSlots.length === 0 || wrongSlots.includes(i);
                    return isSlotWrong
                        ? `<strong class="phrase-wrong-token-bold">${escapeHtml(w)}</strong>`
                        : escapeHtml(w);
                }).join(' ');
            } else {
                titleDisplay = escapeHtml(q.word);
            }

            drawerContent = `
                        <div style="font-weight:700; color:var(--md-sys-color-primary); margin-bottom:8px; font-size:0.86rem;">
                            词组搭配与释义：
                        </div>
                        <div style="font-size:0.92rem; line-height:1.6; background:var(--md-sys-color-surface-container); padding:10px 14px; border-radius:8px;">
                            完整词组：<strong>${escapeHtml(q.word)}</strong><br>
                            标准释义：<span style="color:var(--md-sys-color-on-surface-variant);">${targetMeaning}</span>
                        </div>
                    `;
        } else {
            // 单词规则：左边放四个选项的单词，右边展示释义；选错加粗标红前缀 ✕，正确前缀 ✓；删除“干扰辨析”“正确释义”“选错的辨析项”等文字标签
            const phoneDisplay = q.phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); margin-left:6px; font-weight:normal;">/${escapeHtml(q.phone)}/</span>` : '';
            if (isMistake) {
                titleDisplay = `<strong class="settlement-word-text mistake-word-bold">${escapeHtml(q.word)}</strong>${phoneDisplay}`;
            } else {
                titleDisplay = `<span class="settlement-word-text">${escapeHtml(q.word)}</span>${phoneDisplay}`;
            }

            let distractorsHtml = '';
            if (Array.isArray(q.options) && q.options.length > 0) {
                distractorsHtml = q.options.map((opt, optIdx) => {
                    const isCorrectOpt = (optIdx === q.correctIdx);
                    const isUserChosen = (optIdx === q.userAnswerIdx);
                    const isChosenWrong = isMistake && isUserChosen;

                    const optWord = escapeHtml(opt.word || (isCorrectOpt ? q.word : ''));
                    const optMeaning = escapeHtml(opt.meaning || '');

                    if (isCorrectOpt) {
                        return `
                                    <div class="distractor-grid-row correct-target-row">
                                        <span class="distractor-word-col">
                                            <span style="font-weight:700;">✓</span>
                                            <span>${optWord}</span>
                                        </span>
                                        <span class="distractor-meaning-col">${optMeaning}</span>
                                    </div>
                                `;
                    } else if (isChosenWrong) {
                        return `
                                    <div class="distractor-grid-row chosen-mistake-row">
                                        <span class="distractor-word-col">
                                            <span style="font-weight:800;">✕</span>
                                            <strong>${optWord}</strong>
                                        </span>
                                        <span class="distractor-meaning-col"><strong>${optMeaning}</strong></span>
                                    </div>
                                `;
                    } else {
                        return `
                                    <div class="distractor-grid-row">
                                        <span class="distractor-word-col">${optWord}</span>
                                        <span class="distractor-meaning-col">${optMeaning}</span>
                                    </div>
                                `;
                    }
                }).join('');
            } else {
                distractorsHtml = '<div style="color:var(--md-sys-color-outline); font-size:0.84rem;">暂无选项数据</div>';
            }

            drawerContent = `
                        <div style="font-weight:700; color:var(--md-sys-color-primary); margin-bottom:8px; font-size:0.86rem;">
                            选项辨析：
                        </div>
                        <div class="distractor-list">
                            ${distractorsHtml}
                        </div>
                    `;
        }

        return `
                    <div class="settlement-item ${isMistake ? 'item-mistake' : 'item-correct'}" onclick="toggleSettlementDrawer(this)" data-mistake="${isMistake ? '1' : '0'}">
                        <div class="settlement-item-header">
                            <div class="settlement-item-main">
                                <span class="material-symbols-rounded settlement-status-icon ${isMistake ? 'wrong' : 'correct'}">
                                    ${isMistake ? 'cancel' : 'check_circle'}
                                </span>
                                <div>
                                    <div>${titleDisplay}</div>
                                    <div class="settlement-trans-text">${targetMeaning}</div>
                                </div>
                            </div>
                            <span class="material-symbols-rounded settlement-item-chevron">expand_more</span>
                        </div>
                        <div class="settlement-item-drawer">
                            ${drawerContent}
                        </div>
                    </div>
                `;
    }).join('');

    return `
                <div class="settlement-summary-card">
                    <div class="settlement-summary-header">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem; font-weight:700;">本组题目小结</h3>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--md-sys-color-outline);">点击单词或词组可展开查看选项辨析与干扰项</p>
                        </div>
                        <div class="settlement-filter-group">
                            <button type="button" class="settlement-filter-btn active" onclick="filterSettlementList('all', this)">全部 (${pool.length})</button>
                            <button type="button" class="settlement-filter-btn" onclick="filterSettlementList('mistakes', this)">仅看错题 (${mistakeCount})</button>
                        </div>
                    </div>
                    <div class="settlement-list md3-scroll-view" id="settlement-list-container">
                        ${itemsHtml}
                    </div>
                </div>
            `;
}

function renderShiCiSummaryHtml(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    let mistakeCount = pool.filter(q => !q.isCorrect).length;

    let itemsHtml = pool.map((q, idx) => {
        const isMistake = !q.isCorrect;
        const wordTitle = isMistake
            ? `<strong class="settlement-word-text mistake-word-bold">${escapeHtml(q.word)}</strong> <span style="font-size:0.85rem; color:var(--md-sys-color-outline); font-weight:normal;">${escapeHtml(q.pinyin || '')}</span>`
            : `<span class="settlement-word-text">${escapeHtml(q.word)}</span> <span style="font-size:0.85rem; color:var(--md-sys-color-outline); font-weight:normal;">${escapeHtml(q.pinyin || '')}</span>`;

        const correctSenseText = `【${escapeHtml(q.sense?.part_of_speech || '')}】 ${escapeHtml((q.sense?.meaning || '').replace(/★/g, ''))}`;

        let optionsHtml = '';
        if (Array.isArray(q.options)) {
            optionsHtml = q.options.map((opt, optIdx) => {
                const isCorrect = (optIdx === q.correctIdx);
                const isUserChosen = (optIdx === q.userAnswerIdx);
                const isChosenWrong = isMistake && isUserChosen;

                if (isCorrect) {
                    return `
                                <div class="distractor-row correct-target-meaning" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px;">
                                    <span class="distractor-text">✓ [${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}</span>
                                    <span class="badge" style="background:#2E7D32; color:#fff; font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:600;">例句对应释义</span>
                                </div>
                            `;
                } else if (isChosenWrong) {
                    // 选错项：前缀加 ✕，加粗，展示选错释义对应的例句与出处
                    let wrongExampleHtml = '';
                    const ex = (opt.examples && opt.examples.length > 0) ? opt.examples[0] : null;
                    if (ex) {
                        wrongExampleHtml = `
                                    <div class="shici-wrong-example-box">
                                        <div style="font-weight:700; color:#BA1A1A; font-size:0.8rem; margin-bottom:2px;">选错释义对应例句：</div>
                                        <div style="line-height:1.5;">${escapeHtml(ex.sentence || '')} <span style="color:var(--md-sys-color-outline); font-size:0.78rem;">${escapeHtml(ex.source || '')}</span></div>
                                        ${ex.annotation ? `<div style="color:var(--md-sys-color-on-surface-variant); font-size:0.8rem; margin-top:2px;">句意：${escapeHtml(ex.annotation)}</div>` : ''}
                                    </div>
                                `;
                    } else if (Array.isArray(q.allSenses)) {
                        const matchedSense = q.allSenses.find(s => (s.meaning || '').replace(/★/g, '').trim() === opt.meaning);
                        if (matchedSense && matchedSense.examples && matchedSense.examples.length > 0) {
                            const mex = matchedSense.examples[0];
                            wrongExampleHtml = `
                                        <div class="shici-wrong-example-box">
                                            <div style="font-weight:700; color:#BA1A1A; font-size:0.8rem; margin-bottom:2px;">选错释义对应例句：</div>
                                            <div style="line-height:1.5;">${escapeHtml(mex.sentence || '')} <span style="color:var(--md-sys-color-outline); font-size:0.78rem;">${escapeHtml(mex.source || '')}</span></div>
                                            ${mex.annotation ? `<div style="color:var(--md-sys-color-on-surface-variant); font-size:0.8rem; margin-top:2px;">句意：${escapeHtml(mex.annotation)}</div>` : ''}
                                        </div>
                                    `;
                        }
                    }

                    return `
                                <div style="background:#FFDAD6; border:1.5px solid var(--md-sys-color-error); border-radius:8px; padding:10px 12px; margin-bottom:4px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <span class="distractor-text" style="font-weight:800; color:#BA1A1A; font-size:0.92rem;">
                                            ✕ [${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}
                                        </span>
                                        <span class="badge" style="background:#BA1A1A; color:#fff; font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:700;">选错的释义</span>
                                    </div>
                                    ${wrongExampleHtml}
                                </div>
                            `;
                } else {
                    // 其他干扰项：不加“该词其他释义”/“该词其他义项”标签
                    return `
                                <div class="distractor-row" style="padding:8px 12px;">
                                    <span class="distractor-text">[${escapeHtml(opt.pos || '')}] ${escapeHtml(opt.meaning || '')}</span>
                                </div>
                            `;
                }
            }).join('');
        }

        const annotationHtml = q.example?.annotation
            ? `<div style="font-size:0.88rem; color:var(--md-sys-color-on-surface-variant); margin-top:6px; background:rgba(0,104,116,0.06); padding:8px 12px; border-radius:8px; line-height:1.5;">💡 <strong>句意释义：</strong>${escapeHtml(q.example.annotation)}</div>`
            : '';

        return `
                    <div class="settlement-item ${isMistake ? 'item-mistake' : 'item-correct'}" onclick="toggleSettlementDrawer(this)" data-mistake="${isMistake ? '1' : '0'}">
                        <div class="settlement-item-header">
                            <div class="settlement-item-main">
                                <span class="material-symbols-rounded settlement-status-icon ${isMistake ? 'wrong' : 'correct'}">
                                    ${isMistake ? 'cancel' : 'check_circle'}
                                </span>
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div>${wordTitle}</div>
                                        <span class="badge" style="background:var(--md-sys-color-surface-container); color:var(--md-sys-color-on-surface); font-size:0.74rem;">${escapeHtml(q.example?.source || '文言例句')}</span>
                                    </div>
                                    <div style="font-size:0.95rem; margin-top:4px; line-height:1.5;">
                                        ${q.highlightedSentence || escapeHtml(q.example?.sentence || '')}
                                    </div>
                                    <div class="settlement-trans-text" style="color:var(--md-sys-color-primary); font-weight:600; margin-top:4px;">
                                        例句释义：${correctSenseText}
                                    </div>
                                </div>
                            </div>
                            <span class="material-symbols-rounded settlement-item-chevron">expand_more</span>
                        </div>
                        <div class="settlement-item-drawer">
                            ${annotationHtml}
                            <div style="font-weight:700; color:var(--md-sys-color-primary); margin:10px 0 6px 0; font-size:0.86rem;">
                                抽取的释义辨析项：
                            </div>
                            <div class="distractor-list">
                                ${optionsHtml}
                            </div>
                        </div>
                    </div>
                `;
    }).join('');

    return `
                <div class="settlement-summary-card">
                    <div class="settlement-summary-header">
                        <div>
                            <h3 style="margin:0; font-size:1.1rem; font-weight:700;">本组实词小结</h3>
                            <p style="margin:2px 0 0 0; font-size:0.8rem; color:var(--md-sys-color-outline);">列举本组所有实词及其在对应例句下的释义</p>
                        </div>
                        <div class="settlement-filter-group">
                            <button type="button" class="settlement-filter-btn active" onclick="filterSettlementList('all', this)">全部 (${pool.length})</button>
                            <button type="button" class="settlement-filter-btn" onclick="filterSettlementList('mistakes', this)">仅看错题 (${mistakeCount})</button>
                        </div>
                    </div>
                    <div class="settlement-list md3-scroll-view" id="settlement-list-container">
                        ${itemsHtml}
                    </div>
                </div>
            `;
}

// ========================
// 背实词数据与控制器 (ShiCiManager)
// ========================
let shiciConfig = {
    order: 'sequential', // 'sequential' or 'random'
    batchSize: 15,
    selectedBooks: ['books/实词/实词.json'],
    immediateRetest: true
};

let shiciProgress = {
    currentIndex: 0,
    learnedWords: {},
    masteredWords: {}
};

let shiciState = {
    pool: [],
    currentIdx: 0,
    score: 0,
    total: 0,
    answered: false,
    isReview: false
};

// ========================
// 背实词艾宾浩斯记忆遗忘曲线引擎 (与背单词复习规则保持完全一致)
// 生词(0颗钻) -> 第1轮(次日，1颗钻) -> 第2轮(4天后，2颗钻) -> 第3轮(8天后，3颗钻) -> 第4轮(15天后，4颗钻) -> 熟词(5颗钻)
// ========================
const ShiCiEbbinghausEngine = {
    getRecords() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`shici_ebbinghaus_db_${currentUser}`) || '{}');
        } catch (e) { return {}; }
    },
    saveRecords(records) {
        if (!currentUser) return;
        localStorage.setItem(`shici_ebbinghaus_db_${currentUser}`, JSON.stringify(records));
    },
    isWordMastered(word) {
        if (!word) return false;
        if (shiciProgress.masteredWords && shiciProgress.masteredWords[word]) return true;
        if (typeof isWordMastered === 'function' && isWordMastered(word)) return true;
        return false;
    },
    getDueWords() {
        const records = this.getRecords();
        const now = Date.now();
        return Object.values(records).filter(r => r && r.stage >= 1 && r.stage < 5 && r.nextReview && now >= r.nextReview && !this.isWordMastered(r.word));
    },
    getAllLearnedWords() {
        const records = this.getRecords();
        return Object.values(records).filter(r => r && (r.stage >= 1 || this.isWordMastered(r.word)));
    },
    recordWord(word, meaning, phone, isSuccess, forceMastered = false) {
        if (!word || !currentUser) return;
        const key = word.trim();
        const records = this.getRecords();
        const now = Date.now();
        const isMast = this.isWordMastered(key);

        const record = records[key] || {
            word: key,
            meaning: meaning || '',
            phone: phone || '',
            stage: isMast ? 5 : 0,
            historyCount: 0
        };

        if (meaning) record.meaning = meaning;
        if (phone) record.phone = phone;
        record.lastPracticed = now;
        record.historyCount = (record.historyCount || 0) + 1;

        if (forceMastered) {
            record.stage = 5;
            record.nextReview = 0;
            records[key] = record;
            this.saveRecords(records);
            this.updateDueBadge();
            return;
        }

        const currentStage = (typeof record.stage === 'number') ? record.stage : (isMast ? 5 : 0);

        if (currentStage === 0) {
            // 首次学习生词
            if (isSuccess) {
                // 首次答对直接跳到第 2 轮复习（4天后）
                record.stage = 2;
                record.nextReview = now + EBBINGHAUS_INTERVALS[1];
            } else {
                // 首次答错进入第 1 轮复习（次日）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
            }
        } else {
            // 复习阶段 (Stage 1..4) 或熟词 (Stage 5)
            if (isSuccess) {
                if (currentStage === 1) {
                    record.stage = 2;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[1];
                } else if (currentStage === 2) {
                    record.stage = 3;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[2];
                } else if (currentStage === 3) {
                    record.stage = 4;
                    record.nextReview = now + EBBINGHAUS_INTERVALS[3];
                } else {
                    // 第 4 轮复习答对 -> 标记为熟词
                    record.stage = 5;
                    record.nextReview = 0;
                    if (!shiciProgress.masteredWords) shiciProgress.masteredWords = {};
                    shiciProgress.masteredWords[key] = true;
                    saveShiCiState();
                    if (typeof toggleMasteredWord === 'function' && !isWordMastered(key)) {
                        toggleMasteredWord(key, phone || '', meaning || '', 'shici');
                    }
                }
            } else {
                // 任何一轮答错，回到第 1 轮复习（次日）
                record.stage = 1;
                record.nextReview = now + EBBINGHAUS_INTERVALS[0];
                if (shiciProgress.masteredWords) delete shiciProgress.masteredWords[key];
                saveShiCiState();
                if (typeof removeWordMastered === 'function') {
                    removeWordMastered(key);
                }
            }
        }

        records[key] = record;
        this.saveRecords(records);
        this.updateDueBadge();
    },
    unmarkMastered(word) {
        if (!word || !currentUser) return;
        const key = word.trim();
        const records = this.getRecords();
        if (records[key]) {
            records[key].stage = 4;
            records[key].nextReview = Date.now() + EBBINGHAUS_INTERVALS[0];
        }
        this.saveRecords(records);
        this.updateDueBadge();
    },
    updateDueBadge() {
        const badgeEl = document.getElementById('hub-shici-review-due-count');
        const btnShiCiReview = document.getElementById('btn-hub-shici-review');
        const dueWords = this.getDueWords();
        if (badgeEl) {
            badgeEl.innerText = dueWords.length;
        }
        if (btnShiCiReview) {
            btnShiCiReview.disabled = (dueWords.length === 0);
            if (dueWords.length === 0) {
                btnShiCiReview.title = '当前没有待复习的实词';
            } else {
                btnShiCiReview.title = `共有 ${dueWords.length} 个实词待复习`;
            }
        }
    },
    checkOverduePenalties() {
        if (!currentUser) return;
        const records = this.getRecords();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStartMs = today.getTime();
        const todayStr = typeof DailyStudyTracker !== 'undefined' ? DailyStudyTracker.getTodayStr() : new Date().toISOString().slice(0, 10);

        let modified = false;
        Object.values(records).forEach(rec => {
            if (!rec || typeof rec.stage !== 'number') return;
            if (rec.stage >= 1 && rec.stage <= 4 && rec.nextReview) {
                if (rec.nextReview < todayStartMs) {
                    if (rec.lastOverduePenalizedDate !== todayStr) {
                        rec.lastOverduePenalizedDate = todayStr;
                        rec.stage = Math.max(1, rec.stage - 1);
                        rec.nextReview = todayStartMs - 1000;
                        modified = true;
                    }
                }
            }
        });

        if (modified) {
            this.saveRecords(records);
            this.updateDueBadge();
        }
    }
};
window.ShiCiEbbinghausEngine = ShiCiEbbinghausEngine;

function renderShiCiMasteryDiamonds(word, animType = null) {
    const bar = document.getElementById('shici-mastery-stars');
    if (!bar) return;

    let targetStage = 0;
    if (word) {
        if (ShiCiEbbinghausEngine.isWordMastered(word)) {
            targetStage = 5;
        } else {
            const records = ShiCiEbbinghausEngine.getRecords();
            const rec = records[word.trim()];
            if (rec && typeof rec.stage === 'number') {
                targetStage = rec.stage;
            }
        }
    }

    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`shici-mastery-star-${i}`);
        if (!star) continue;

        star.classList.remove('anim-gain', 'anim-loss');

        const wasFilled = star.classList.contains('filled');
        const willFill = i <= targetStage;

        if (willFill) {
            star.innerText = '◆';
            star.classList.add('filled');
        } else {
            star.innerText = '◇';
            star.classList.remove('filled');
        }

        if (animType === 'gain' && willFill && !wasFilled) {
            void star.offsetWidth;
            star.style.animationDelay = `${(i - 1) * 80}ms`;
            star.classList.add('anim-gain');
        } else if (animType === 'loss' && !willFill && wasFilled) {
            void star.offsetWidth;
            star.style.animationDelay = `${(5 - i) * 60}ms`;
            star.classList.add('anim-loss');
        } else {
            star.style.animationDelay = '0ms';
        }
    }
}

function scheduleRetestForCurrentShiCiQuestion() {
    if (shiciConfig.immediateRetest === false) return;
    if (!shiciState || !shiciState.pool || shiciState.pool.length === 0) return;
    const q = shiciState.pool[shiciState.currentIdx];
    if (!q || q._retestScheduled) return;
    q._retestScheduled = true;

    const retestQ1 = { ...q, _isRetest: true, _retestScheduled: false };
    const insertPos = shiciState.currentIdx + 4;
    if (insertPos < shiciState.pool.length) {
        shiciState.pool.splice(insertPos, 0, retestQ1);
    } else {
        shiciState.pool.push(retestQ1);
    }

    const alreadyScheduledLater = shiciState.pool.slice(shiciState.currentIdx + 1).some(item => item.word === q.word);
    if (!q._isRetest && !alreadyScheduledLater) {
        const retestQ2 = { ...q, _isRetest: true, _retestScheduled: false };
        shiciState.pool.push(retestQ2);
    }
    saveShiCiSessionProgress();
}

function loadShiCiSettings() {
    try {
        const cfg = localStorage.getItem('shici_config_' + (currentUser || 'default'));
        if (cfg) Object.assign(shiciConfig, JSON.parse(cfg));
        if (shiciConfig.immediateRetest === undefined) shiciConfig.immediateRetest = true;
    } catch (e) { }
    try {
        const prog = localStorage.getItem('shici_progress_' + (currentUser || 'default'));
        if (prog) Object.assign(shiciProgress, JSON.parse(prog));
    } catch (e) { }
    if (!Array.isArray(shiciConfig.selectedBooks) || shiciConfig.selectedBooks.length === 0) {
        shiciConfig.selectedBooks = ['books/实词/实词.json'];
    }
}

function saveShiCiState() {
    try {
        localStorage.setItem('shici_config_' + (currentUser || 'default'), JSON.stringify(shiciConfig));
        localStorage.setItem('shici_progress_' + (currentUser || 'default'), JSON.stringify(shiciProgress));
    } catch (e) { }
}

const ShiCiManager = {
    data: null,
    loading: false,

    async loadData() {
        if (this.data && Array.isArray(this.data) && this.data.length > 0) {
            return this.data;
        }
        this.loading = true;

        // 1. 本地缓存读取
        try {
            const cached = localStorage.getItem('vocab_shici_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length >= 300) {
                    this.data = parsed;
                    this.loading = false;
                    return this.data;
                }
            }
        } catch (e) { }

        // 2. 候选加载路径
        const urls = [
            './books/实词/实词.json',
            'books/实词/实词.json',
            'https://cdn.jsdelivr.net/gh/chenyurong0806/Recite-words@main/books/%E5%AE%9E%E8%AF%8D/%E5%AE%9E%E8%AF%8D.json',
            'https://raw.githubusercontent.com/chenyurong0806/Recite-words/main/books/%E5%AE%9E%E8%AF%8D/%E5%AE%9E%E8%AF%8D.json',
            `${BookManager.API_BASE}/api/book?path=${encodeURIComponent('books/实词/实词.json')}`
        ];

        for (const u of urls) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const res = await fetch(u, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json) && json.length > 0) {
                        this.data = json;
                        try {
                            localStorage.setItem('vocab_shici_cache', JSON.stringify(json));
                        } catch (e) { }
                        this.loading = false;
                        return this.data;
                    }
                }
            } catch (err) { }
        }

        this.loading = false;
        throw new Error('未能加载实词库文件，请确保 books/实词/实词.json 存在或网络正常！');
    },

    async loadBooks(bookIds = ['books/实词/实词.json']) {
        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            bookIds = ['books/实词/实词.json'];
        }
        const results = [];
        for (const bId of bookIds) {
            const custom = (window.customBooks || []).find(b => b.id === bId);
            if (custom && Array.isArray(custom.words) && custom.words.length > 0) {
                results.push(...custom.words);
                continue;
            }
            try {
                const data = await this.loadData();
                if (Array.isArray(data)) results.push(...data);
            } catch (e) { }
        }
        return results.length > 0 ? results : (await this.loadData());
    }
};

function generateShiCiQuestion(wordItem, allWords) {
    const senses = wordItem.senses || [];
    if (senses.length === 0) return null;

    // 优先抽取考点★义项或随机义项
    const starredSenses = senses.filter(s => (s.meaning || '').includes('★'));
    const sense = (starredSenses.length > 0 && Math.random() < 0.6)
        ? starredSenses[Math.floor(Math.random() * starredSenses.length)]
        : senses[Math.floor(Math.random() * senses.length)];

    const examples = sense.examples || [{ sentence: wordItem.word, source: '《文言》' }];
    const example = examples[Math.floor(Math.random() * examples.length)];

    // 例句考察词加粗
    let sentence = example.sentence || '';
    let highlightedSentence = escapeHtml(sentence);

    if (sentence.includes(wordItem.word)) {
        const reg = new RegExp(escapeRegex(wordItem.word), 'g');
        highlightedSentence = escapeHtml(sentence).replace(reg, `<strong class="shici-word-highlight">${escapeHtml(wordItem.word)}</strong>`);
    } else {
        highlightedSentence = `<strong class="shici-word-highlight">${escapeHtml(wordItem.word)}</strong> · ${escapeHtml(sentence)}`;
    }

    // 易错项抽取该词的其他释义
    const otherSenses = senses.filter(s => s !== sense);
    const pickedDistractors = [];

    const shuffledOther = [...otherSenses].sort(() => 0.5 - Math.random());
    for (const os of shuffledOther) {
        if (pickedDistractors.length >= 3) break;
        pickedDistractors.push(os);
    }

    // 若该词释义少于4个，库内平滑补全其余选项
    if (pickedDistractors.length < 3 && Array.isArray(allWords)) {
        const otherWords = allWords.filter(w => w.word !== wordItem.word).sort(() => 0.5 - Math.random());
        for (const ow of otherWords) {
            if (pickedDistractors.length >= 3) break;
            if (ow.senses && ow.senses.length > 0) {
                const rs = ow.senses[Math.floor(Math.random() * ow.senses.length)];
                const cleanM = (rs.meaning || '').replace(/★/g, '').trim();
                const existingMeanings = [
                    sense.meaning.replace(/★/g, '').trim(),
                    ...pickedDistractors.map(d => (d.meaning || '').replace(/★/g, '').trim())
                ];
                if (!existingMeanings.includes(cleanM)) {
                    pickedDistractors.push(rs);
                }
            }
        }
    }

    const cleanTargetMeaning = (sense.meaning || '').replace(/★/g, '').trim();
    const correctOption = {
        pos: sense.part_of_speech || '',
        meaning: cleanTargetMeaning,
        isCorrect: true,
        sense: sense,
        examples: sense.examples || []
    };

    const distractorOptions = pickedDistractors.map(ds => ({
        pos: ds.part_of_speech || '',
        meaning: (ds.meaning || '').replace(/★/g, '').trim(),
        isCorrect: false,
        sense: ds,
        examples: ds.examples || []
    }));

    const options = [correctOption, ...distractorOptions].sort(() => 0.5 - Math.random());
    const correctIdx = options.findIndex(o => o.isCorrect);

    return {
        word: wordItem.word,
        pinyin: wordItem.pinyin || '',
        example: example,
        sentence: sentence,
        highlightedSentence: highlightedSentence,
        source: example.source || '文言典籍',
        sense: sense,
        options: options,
        correctIdx: correctIdx,
        allSenses: senses
    };
}

async function startShiCiLearning() {
    loadShiCiSettings();

    // 检查是否有未完成的断点进度
    if (currentUser) {
        const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                    shiciState = parsed;
                    renderShiCiQuestion();
                    switchView('view-shici');
                    return;
                }
            } catch (e) { }
        }
    }

    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/实词.json']);
        if (!allWords || allWords.length === 0) {
            alert('未获取到实词库数据！');
            return;
        }

        const batchSize = shiciConfig.batchSize || 15;
        let targetWords = [];

        if (shiciConfig.order === 'sequential') {
            let startIdx = shiciProgress.currentIndex || 0;
            if (startIdx >= allWords.length) startIdx = 0;
            for (let i = 0; i < batchSize; i++) {
                const idx = (startIdx + i) % allWords.length;
                targetWords.push(allWords[idx]);
            }
        } else {
            const unmastered = allWords.filter(w => !shiciProgress.masteredWords || !shiciProgress.masteredWords[w.word]);
            const poolSource = unmastered.length >= batchSize ? unmastered : allWords;
            targetWords = [...poolSource].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        }

        const questions = targetWords.map(w => generateShiCiQuestion(w, allWords)).filter(Boolean);

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
            answered: false,
            isReview: false
        };

        saveShiCiSessionProgress();
        updateShiCiSettingsModalUi();
        updateHubShiCiBadge();
        renderShiCiQuestion();
        switchView('view-shici');
    } catch (err) {
        alert('启动实词学习失败：' + err.message);
    }
}

// 实词复习功能（基于艾宾浩斯记忆遗忘曲线）
async function startShiCiReview() {
    loadShiCiSettings();
    try {
        const allWords = await ShiCiManager.loadBooks(shiciConfig.selectedBooks || ['books/实词/实词.json']);
        if (!allWords || allWords.length === 0) {
            alert('未获取到实词库数据！');
            return;
        }

        // 优先抽取到期复习实词
        const dueRecords = ShiCiEbbinghausEngine.getDueWords();
        const dueKeys = new Set(dueRecords.map(r => r.word));
        let reviewWords = allWords.filter(w => dueKeys.has(w.word));

        // 若暂无到期实词，但有已学实词，则允许复习所有已学实词
        if (reviewWords.length === 0) {
            const allLearned = ShiCiEbbinghausEngine.getAllLearnedWords();
            const learnedKeys = new Set(allLearned.map(r => r.word));
            reviewWords = allWords.filter(w => learnedKeys.has(w.word));
        }

        // 兼顾历史本地已学词
        if (reviewWords.length === 0 && shiciProgress.learnedWords) {
            const legacyKeys = new Set(Object.keys(shiciProgress.learnedWords));
            reviewWords = allWords.filter(w => legacyKeys.has(w.word));
        }

        if (reviewWords.length === 0) {
            showToast('暂无已学实词可复习，请先学习新实词！');
            return;
        }

        const batchSize = shiciConfig.batchSize || 15;
        const targets = [...reviewWords].sort(() => 0.5 - Math.random()).slice(0, batchSize);
        const questions = targets.map(w => generateShiCiQuestion(w, allWords)).filter(Boolean);

        shiciState = {
            pool: questions,
            currentIdx: 0,
            score: 0,
            total: questions.length,
            answered: false,
            isReview: true
        };

        updateShiCiSettingsModalUi();
        updateHubShiCiBadge();
        renderShiCiQuestion();
        switchView('view-shici');
    } catch (err) {
        alert('启动实词复习失败：' + err.message);
    }
}

function saveShiCiSessionProgress() {
    if (!currentUser || !shiciState || !shiciState.pool || shiciState.pool.length === 0) return;
    if (shiciState.currentIdx >= shiciState.pool.length) return;
    try {
        localStorage.setItem(`shici_progress_session_${currentUser}`, JSON.stringify({
            pool: shiciState.pool,
            currentIdx: shiciState.currentIdx,
            score: shiciState.score,
            total: shiciState.pool.length,
            isReview: !!shiciState.isReview,
            timestamp: Date.now()
        }));
    } catch (e) { }
    updateHubShiCiResumeButton();
}

function clearCurrentShiCiProgress() {
    if (!currentUser) return;
    localStorage.removeItem(`shici_progress_session_${currentUser}`);
    updateHubShiCiResumeButton();
    updateShiCiProgressStatusUI();
    showToast('已清除当前实词学习进度');
}

function updateShiCiProgressStatusUI() {
    const tipEl = document.getElementById('shici-progress-status-tip');
    const clearBtn = document.getElementById('btn-clear-shici-progress');
    if (!tipEl || !clearBtn || !currentUser) return;

    const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                tipEl.innerText = `已保存进度：第 ${parsed.currentIdx + 1} / ${parsed.pool.length} 题`;
                tipEl.style.color = 'var(--md-sys-color-primary)';
                clearBtn.disabled = false;
                return;
            }
        } catch (e) { }
    }
    tipEl.innerText = '无';
    tipEl.style.color = 'var(--md-sys-color-outline)';
    clearBtn.disabled = true;
}

function updateHubShiCiResumeButton() {
    const label = document.getElementById('btn-hub-shici-text');
    if (!label) return;
    if (!currentUser) {
        label.innerText = '学习新词';
        return;
    }
    const saved = localStorage.getItem(`shici_progress_session_${currentUser}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.pool) && parsed.currentIdx < parsed.pool.length) {
                label.innerText = `继续背诵 (${parsed.currentIdx + 1}/${parsed.pool.length})`;
                return;
            }
        } catch (e) { }
    }
    label.innerText = '学习新词';
}

function renderShiCiQuestion() {
    if (!shiciState || shiciState.currentIdx >= shiciState.pool.length) {
        endShiCiGame();
        return;
    }

    const q = shiciState.pool[shiciState.currentIdx];
    shiciState.answered = false;

    const progressEl = document.getElementById('shici-progress-text');
    if (progressEl) progressEl.innerText = `${shiciState.currentIdx + 1}/${shiciState.pool.length}`;

    const fillEl = document.getElementById('shici-progress-fill');
    if (fillEl) fillEl.style.width = Math.round(((shiciState.currentIdx + 1) / shiciState.pool.length) * 100) + '%';

    const bookBadge = document.getElementById('shici-book-badge');
    if (bookBadge) {
        const bMeta = (BookManager.availableBooks || []).find(b => b.id === shiciConfig.selectedBooks?.[0]);
        bookBadge.innerText = bMeta ? bMeta.name : '文言实词';
    }

    const wordTitleEl = document.getElementById('shici-current-word-title');
    if (wordTitleEl) wordTitleEl.innerText = `${q.word} ${q.pinyin || ''}`.trim();

    const retestTag = document.getElementById('shici-retest-tag');
    if (retestTag) retestTag.style.display = q._isRetest ? 'inline-flex' : 'none';

    renderShiCiMasteryDiamonds(q.word);
    updateShiCiMasterBtn(ShiCiEbbinghausEngine.isWordMastered(q.word));

    const sentenceEl = document.getElementById('shici-sentence-display');
    if (sentenceEl) sentenceEl.innerHTML = q.highlightedSentence;

    const sourceEl = document.getElementById('shici-source-display');
    if (sourceEl) sourceEl.innerText = `—— ${q.source || '《古文》'}`;

    const optContainer = document.getElementById('shici-options-container');
    if (optContainer) {
        const letters = ['A', 'B', 'C', 'D'];
        optContainer.innerHTML = q.options.map((opt, idx) => `
                    <button class="shici-opt-btn" id="shici-opt-${idx}" onclick="handleShiCiAnswer(${idx})">
                        <span class="opt-prefix">${letters[idx]}</span>
                        ${opt.pos ? `<span class="opt-pos-tag">${escapeHtml(opt.pos)}</span>` : ''}
                        <span class="opt-meaning-text">${escapeHtml(opt.meaning)}</span>
                    </button>
                `).join('');
    }

    const expCard = document.getElementById('shici-explanation-card');
    if (expCard) expCard.style.display = 'none';

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    if (actionBtn) {
        actionBtn.className = 'single-next-btn show-answer-mode';
        actionBtn.style.display = 'flex';
    }
    if (actionText) actionText.innerText = '看答案';
}

function handleShiCiAnswer(idx) {
    if (shiciState.answered) return;
    shiciState.answered = true;
    const q = shiciState.pool[shiciState.currentIdx];
    q.userAnswerIdx = idx;
    q.answered = true;

    const isRight = (idx === q.correctIdx);
    q.isCorrect = isRight;

    const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : '';

    if (isRight) {
        shiciState.score++;
        if (!shiciProgress.learnedWords) shiciProgress.learnedWords = {};
        shiciProgress.learnedWords[q.word] = (shiciProgress.learnedWords[q.word] || 0) + 1;
        ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, true);
        renderShiCiMasteryDiamonds(q.word, 'gain');
        if (userStats.mistakes && userStats.mistakes[q.word]) {
            delete userStats.mistakes[q.word];
        }
    } else {
        ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, false);
        renderShiCiMasteryDiamonds(q.word, 'loss');
        scheduleRetestForCurrentShiCiQuestion();
        recordShiCiUserMistake(currentUser, {
            word: q.word,
            meaning: fullMeaning,
            pinyin: q.pinyin,
            sentence: q.sentence || q.example?.sentence,
            highlightedSentence: q.highlightedSentence,
            source: q.source || q.example?.source,
            pos: q.sense?.part_of_speech || q.pos,
            isShiCi: true
        });
    }
    saveCurrentUserData();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`shici-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        if (i === q.correctIdx) {
            btn.classList.add('correct');
        }
    });

    if (!isRight) {
        const wrongBtn = document.getElementById(`shici-opt-${idx}`);
        if (wrongBtn) wrongBtn.classList.add('wrong');
    }

    displayShiCiExplanation(q, isRight);

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    const isLast = (shiciState.currentIdx === shiciState.pool.length - 1);
    if (actionBtn) actionBtn.className = 'single-next-btn';
    if (actionText) actionText.innerText = isLast ? '查看小结' : '下一题';

    saveShiCiSessionProgress();
}

function revealShiCiAnswer() {
    if (shiciState.answered) return;
    shiciState.answered = true;
    const q = shiciState.pool[shiciState.currentIdx];
    q.userAnswerIdx = -1;
    q.isCorrect = false;
    q.skipped = true;
    q.answered = true;

    const fullMeaning = q.sense ? `[${q.sense.part_of_speech || ''}] ${(q.sense.meaning || '').replace(/★/g, '')}` : '';
    ShiCiEbbinghausEngine.recordWord(q.word, fullMeaning, q.pinyin, false);
    renderShiCiMasteryDiamonds(q.word, 'loss');
    scheduleRetestForCurrentShiCiQuestion();

    recordShiCiUserMistake(currentUser, {
        word: q.word,
        meaning: fullMeaning,
        pinyin: q.pinyin,
        sentence: q.sentence || q.example?.sentence,
        highlightedSentence: q.highlightedSentence,
        source: q.source || q.example?.source,
        pos: q.sense?.part_of_speech || q.pos,
        isShiCi: true
    });
    saveCurrentUserData();

    q.options.forEach((opt, i) => {
        const btn = document.getElementById(`shici-opt-${i}`);
        if (!btn) return;
        btn.disabled = true;
        if (i === q.correctIdx) btn.classList.add('correct');
    });

    displayShiCiExplanation(q, false);

    const actionBtn = document.getElementById('btn-shici-action');
    const actionText = document.getElementById('btn-shici-action-text');
    const isLast = (shiciState.currentIdx === shiciState.pool.length - 1);
    if (actionBtn) actionBtn.className = 'single-next-btn';
    if (actionText) actionText.innerText = isLast ? '查看小结' : '下一题';

    saveShiCiSessionProgress();
}

function handleShiCiActionClick() {
    if (!shiciState.answered) {
        revealShiCiAnswer();
    } else {
        nextShiCiQuestion();
    }
}

function nextShiCiQuestion() {
    shiciState.currentIdx++;
    saveShiCiSessionProgress();
    renderShiCiQuestion();
}

function displayShiCiExplanation(q, isRight) {
    const expCard = document.getElementById('shici-explanation-card');
    if (!expCard) return;
    expCard.style.display = 'flex';

    const bannerEl = document.getElementById('shici-feedback-banner');
    const iconEl = document.getElementById('shici-feedback-icon');
    const textEl = document.getElementById('shici-feedback-text');

    if (bannerEl) {
        bannerEl.className = `shici-feedback-banner ${isRight ? 'correct' : 'wrong'}`;
    }
    if (iconEl) iconEl.innerText = isRight ? 'check_circle' : 'cancel';
    if (textEl) textEl.innerText = isRight ? '回答正确' : (q.skipped ? '已揭晓答案' : '回答错误');

    const fullMeaningEl = document.getElementById('shici-correct-meaning-full');
    if (fullMeaningEl) {
        fullMeaningEl.innerText = `[${q.sense.part_of_speech || ''}] ${q.sense.meaning || ''}`;
    }

    const annotRow = document.getElementById('shici-annotation-row');
    const annotContent = document.getElementById('shici-annotation-content');
    if (q.example && q.example.annotation) {
        if (annotRow) annotRow.style.display = 'block';
        if (annotContent) annotContent.innerText = q.example.annotation;
    } else {
        if (annotRow) annotRow.style.display = 'block';
        if (annotContent) annotContent.innerText = `在${q.source || ''}中作${q.sense.part_of_speech || '实词'}，意为“${(q.sense.meaning || '').replace(/★/g, '')}”。`;
    }
}

function endShiCiGame() {
    if (shiciConfig.order === 'sequential' && !shiciState.isReview) {
        shiciProgress.currentIndex = ((shiciProgress.currentIndex || 0) + (shiciConfig.batchSize || 15)) % 300;
    }
    saveShiCiState();
    if (currentUser) {
        localStorage.removeItem(`shici_progress_session_${currentUser}`);
    }
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();

    gameResult = {
        mode: 'shici',
        msg: shiciState.isReview ? '已完成本组实词复习！' : '已完成本组实词背诵！',
        p1Score: shiciState.score,
        p2Score: 0,
        pool: shiciState.pool,
        total: shiciState.pool.length
    };
    renderResult();
    switchView('view-result');
}

function confirmExitShiCi() {
    saveShiCiSessionProgress();
    saveShiCiState();
    updateHubShiCiBadge();
    updateHubShiCiResumeButton();
    switchView('view-hub');
}

function toggleCurrentShiCiMastered() {
    if (!shiciState || !shiciState.pool || !shiciState.pool[shiciState.currentIdx]) return;
    const currentQ = shiciState.pool[shiciState.currentIdx];
    const w = currentQ.word;
    if (!shiciProgress.masteredWords) shiciProgress.masteredWords = {};
    const isNow = !shiciProgress.masteredWords[w];
    const meaningStr = currentQ.sense ? `[${currentQ.sense.part_of_speech || ''}] ${(currentQ.sense.meaning || '').replace(/★/g, '')}` : '';

    if (isNow) {
        shiciProgress.masteredWords[w] = true;
        ShiCiEbbinghausEngine.recordWord(w, meaningStr, currentQ.pinyin, true, true);
        renderShiCiMasteryDiamonds(w, 'gain');
        showToast(`已将【${w}】标记为熟词`);
    } else {
        delete shiciProgress.masteredWords[w];
        ShiCiEbbinghausEngine.unmarkMastered(w);
        renderShiCiMasteryDiamonds(w, 'loss');
        showToast(`已取消【${w}】的熟词标记`);
    }
    saveShiCiState();
    updateShiCiMasterBtn(isNow);

    // 同时与全局熟词本打通
    if (typeof toggleMasteredWord === 'function') {
        toggleMasteredWord(w, currentQ.pinyin || '', meaningStr, 'shici');
    }
}

function updateShiCiMasterBtn(isMastered) {
    const btn = document.getElementById('btn-shici-master');
    const icon = document.getElementById('btn-shici-master-icon') || (btn ? btn.querySelector('.material-symbols-rounded') : null);
    if (!btn) return;
    if (isMastered) {
        btn.classList.add('active');
        if (icon) icon.innerText = 'check_circle';
        btn.title = '取消熟词标记';
    } else {
        btn.classList.remove('active');
        if (icon) icon.innerText = 'check_circle_outline';
        btn.title = '标注熟词（不再抽取）';
    }
}

function openShiCiSettings() {
    loadShiCiSettings();
    updateShiCiSettingsModalUi();
    const modal = document.getElementById('modal-shici-settings');
    if (modal) modal.classList.add('active');
}

function closeShiCiSettings() {
    const modal = document.getElementById('modal-shici-settings');
    if (modal) modal.classList.remove('active');
}

function saveShiCiSettings() {
    saveShiCiState();
    updateHubShiCiBadge();
    closeShiCiSettings();
    showToast('实词设置已保存');
}

function selectShiCiOrderMode(mode) {
    shiciConfig.order = mode;
    const seqEl = document.getElementById('chip-shici-seq');
    const randEl = document.getElementById('chip-shici-rand');
    if (seqEl) seqEl.classList.toggle('selected', mode === 'sequential');
    if (randEl) randEl.classList.toggle('selected', mode === 'random');
    saveShiCiState();
}

function selectShiCiBatch(batch) {
    shiciConfig.batchSize = batch;
    document.querySelectorAll('#chips-shici-batch .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-val')) === batch);
    });
    saveShiCiState();
}

function toggleShiCiRetestSwitch(checked) {
    shiciConfig.immediateRetest = !!checked;
    saveShiCiState();
}

function selectShiCiImmediateRetest(enabled) {
    shiciConfig.immediateRetest = !!enabled;
    const swEl = document.getElementById('switch-shici-retest');
    if (swEl) swEl.checked = shiciConfig.immediateRetest;
    saveShiCiState();
}

function updateShiCiSettingsModalUi() {
    const seqEl = document.getElementById('chip-shici-seq');
    const randEl = document.getElementById('chip-shici-rand');
    if (seqEl) seqEl.classList.toggle('selected', shiciConfig.order === 'sequential');
    if (randEl) randEl.classList.toggle('selected', shiciConfig.order === 'random');

    document.querySelectorAll('#chips-shici-batch .md3-chip').forEach(c => {
        c.classList.toggle('selected', parseInt(c.getAttribute('data-val')) === shiciConfig.batchSize);
    });

    const swEl = document.getElementById('switch-shici-retest');
    if (swEl) swEl.checked = shiciConfig.immediateRetest !== false;

    updateShiCiProgressStatusUI();
}

function updateHubShiCiBadge() {
    const badge = document.getElementById('hub-shici-badge');
    if (badge) {
        loadShiCiSettings();
        const count = shiciProgress.learnedWords ? Object.keys(shiciProgress.learnedWords).length : 0;
    }
    const reviewCountBadge = document.getElementById('hub-shici-review-due-count');
    const btnShiCiReview = document.getElementById('btn-hub-shici-review');
    if (reviewCountBadge || btnShiCiReview) {
        loadShiCiSettings();
        if (typeof ShiCiEbbinghausEngine !== 'undefined') {
            ShiCiEbbinghausEngine.checkOverduePenalties();
            const dueCount = ShiCiEbbinghausEngine.getDueWords().length;
            if (reviewCountBadge) {
                if (dueCount > 0) {
                    reviewCountBadge.style.display = 'inline-flex';
                    reviewCountBadge.innerText = dueCount;
                } else {
                    const learnedCount = ShiCiEbbinghausEngine.getAllLearnedWords().length || (shiciProgress.learnedWords ? Object.keys(shiciProgress.learnedWords).length : 0);
                    if (learnedCount > 0) {
                        reviewCountBadge.style.display = 'inline-flex';
                        reviewCountBadge.innerText = '0';
                    } else {
                        reviewCountBadge.style.display = 'none';
                    }
                }
            }
            if (btnShiCiReview) {
                btnShiCiReview.disabled = (dueCount === 0);
                if (dueCount === 0) {
                    btnShiCiReview.title = '当前没有待复习的实词';
                } else {
                    btnShiCiReview.title = `共有 ${dueCount} 个实词待复习`;
                }
            }
        }
    }
    updateHubShiCiResumeButton();
}

/* --- End: views/shici.js --- */

/* --- Begin: views/settings.js --- */
/**
 * MD3 系统设置、数据备份与更新日志
 * Module: assets/js/views/settings.js
 */

/* ==========================================================================
   12. MD3 系统设置与子页面管理
   ========================================================================== */
function handleNavClick(dest) {
    if (dest === 'settings') {
        switchView('view-settings');
    } else if (dest === 'me') {
        switchView('view-me');
        openMeSubview('main');
    } else {
        switchView('view-hub');
    }
}

function openMeSubview(subviewKey) {
    const viewMe = document.getElementById('view-me');
    if (viewMe && !viewMe.classList.contains('active')) {
        switchView('view-me');
    }
    const performSwitch = () => {
        const meSubviews = ['main', 'books', 'words', 'mastered', 'trash'];
        meSubviews.forEach(k => {
            const el = (k === 'main')
                ? document.getElementById('me-subview-main')
                : document.getElementById(`settings-subview-${k}`);
            if (el) {
                if (k === subviewKey) el.classList.add('active');
                else el.classList.remove('active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    if (document.startViewTransition) {
        document.startViewTransition(performSwitch);
    } else {
        performSwitch();
    }

    if (subviewKey === 'main') {
        renderMeView();
    } else if (subviewKey === 'books') {
        renderManageLocalBooksInSettings();
    } else if (subviewKey === 'mastered') {
        renderMasteredWordsInSettings();
    } else if (subviewKey === 'trash') {
        renderTrashWordsInSettings();
    }
}

function updateNavActive(current) {
    ['home', 'me', 'settings'].forEach(key => {
        const railEl = document.getElementById(`nav-rail-${key}`);
        const botEl = document.getElementById(`bottom-nav-${key}`);
        if (railEl) {
            if (key === current) railEl.classList.add('active');
            else railEl.classList.remove('active');
        }
        if (botEl) {
            if (key === current) botEl.classList.add('active');
            else botEl.classList.remove('active');
        }
    });
}

function setPageMaxWidth(width) {
    const allowed = ['720px', '960px', '1200px', '100%'];
    const val = allowed.includes(width) ? width : '960px';
    document.documentElement.style.setProperty('--container-max-width', val);
    localStorage.setItem('app_max_width', val);
    document.querySelectorAll('#chips-page-width .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-width') === val);
    });
}

function setAppZoom(zoom) {
    const allowed = ['0.9', '1', '1.1', '1.2'];
    const val = allowed.includes(zoom) ? zoom : '1';
    document.documentElement.style.setProperty('--app-zoom', val);
    document.body.style.zoom = val;
    localStorage.setItem('app_zoom', val);
    document.querySelectorAll('#chips-app-zoom .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-zoom') === val);
    });
}

function initDisplaySettings() {
    const savedWidth = localStorage.getItem('app_max_width') || '960px';
    document.documentElement.style.setProperty('--container-max-width', savedWidth);

    const savedZoom = localStorage.getItem('app_zoom') || '1';
    document.documentElement.style.setProperty('--app-zoom', savedZoom);
    document.body.style.zoom = savedZoom;
}

function switchSettingsSubview(subviewKey) {
    const meSubviews = ['books', 'words', 'mastered', 'trash'];
    if (meSubviews.includes(subviewKey)) {
        openMeSubview(subviewKey);
        return;
    }

    const performSubviewSwitch = () => {
        const subviews = ['main', 'changelog'];
        subviews.forEach(k => {
            const el = document.getElementById(`settings-subview-${k}`);
            if (el) {
                if (k === subviewKey) el.classList.add('active');
                else el.classList.remove('active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    if (document.startViewTransition) {
        document.startViewTransition(performSubviewSwitch);
    } else {
        performSubviewSwitch();
    }

    if (subviewKey === 'main') {
        renderSettingsMain();
    } else if (subviewKey === 'changelog') {
        renderChangelogInSettings();
    }
}

function renderSettingsMain() {
    const nameEl = document.getElementById('settings-current-user-name');
    const statEl = document.getElementById('settings-current-user-stat');
    const verLabel = document.getElementById('settings-version-label');
    if (verLabel) verLabel.innerText = `v${APP_VERSION}`;
    if (nameEl) nameEl.innerText = `当前登录：${currentUser || '未登录'}`;
    if (statEl) {
        const acc = userStats.total > 0 ? Math.round((userStats.correct / userStats.total) * 100) : 0;
        statEl.innerText = `作答词数：${userStats.total || 0} 词  |  正确率：${acc}%  |  错题数：${Object.keys(userStats.mistakes || {}).length} 词`;
    }

    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const webRow = document.getElementById('settings-online-web-row');
    const githubRow = document.querySelector('a[href*="github.com"]');
    const webBadge = document.getElementById('settings-online-badge');
    const webTip = document.getElementById('settings-online-tip');
    if (isBilibiliToy) {
        // 在 B 站端彻底隐藏外部链接，防止审核被拒
        if (webRow) webRow.style.display = 'none';
        if (githubRow) githubRow.style.display = 'none';
    } else {
        // 在个人站与离线端正常显示全部功能
        if (githubRow) githubRow.style.display = 'flex';
        if (webRow) {
            webRow.style.display = 'flex';
            if (isLocal) {
                webRow.href = 'https://word.chenyurong.qzz.io';
                if (webTip) webTip.innerText = '当前为本地环境，点击访问在线网页版';
            } else {
                webRow.href = getGithubAssetUrl('https://github.com/chenyurong0806/Recite-words/releases');
                const h4 = webRow.querySelector('h4');
                if (h4) h4.innerText = '下载离线版本';
                if (webTip) webTip.innerText = '下载 Windows / 离线单文件运行包，离线背单词';
            }
        }
    }

    const quickUsersList = document.getElementById('settings-quick-users-list');
    if (quickUsersList) {
        quickUsersList.innerHTML = allUsersList.map(u => {
            const isCur = u === currentUser;
            return `
                    <div class="md3-chip ${isCur ? 'selected' : ''}" onclick="switchAccount('${escapeHtml(u)}')">
                        <span class="material-symbols-rounded" style="font-size:16px; margin-right:4px;">${isCur ? 'check' : 'person'}</span>
                        <span>${escapeHtml(u)}</span>
                    </div>
                `;
        }).join('');
    }

    const savedWidth = localStorage.getItem('app_max_width') || '960px';
    document.querySelectorAll('#chips-page-width .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-width') === savedWidth);
    });

    const savedZoom = localStorage.getItem('app_zoom') || '1';
    document.querySelectorAll('#chips-app-zoom .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-zoom') === savedZoom);
    });

    const kbEnabled = localStorage.getItem('dictation_virtual_keyboard_enabled') !== 'false';
    document.querySelectorAll('#chips-settings-dictation-kb .md3-chip').forEach(chip => {
        chip.classList.toggle('selected', chip.getAttribute('data-kb') === String(kbEnabled));
    });

    const summaryEl = document.getElementById('settings-books-summary-text');
    if (summaryEl) {
        const customCount = (window.customBooks || []).length;
        const folderCount = (localFolders || []).length;
        summaryEl.innerText = `已创建 ${folderCount} 个文件夹，${customCount} 个本地词书`;
    }

    const masteredSummaryEl = document.getElementById('settings-mastered-summary-text');
    if (masteredSummaryEl) {
        const mCount = getMasteredWords().length;
        masteredSummaryEl.innerText = `已标注 ${mCount} 个熟词（练习与对战中不再抽取）`;
    }

    const trashSummaryEl = document.getElementById('settings-trash-summary-text');
    if (trashSummaryEl) {
        const tCount = getTrashWords().length;
        trashSummaryEl.innerText = `共 ${tCount} 个已删词汇`;
    }
}

function switchAccount(name) {
    if (!name || name === currentUser) return;
    loadUserData(name);
    renderSettingsMain();
    renderMeView();
    updateHub();
    if (globalLobbyChannel) {
        globalLobbyChannel.track({
            username: currentUser,
            status: 'idle',
            joinedAt: Date.now()
        });
    }
    showToast(`已切换至账号 ${name} `);
}

function createAndSwitchAccount() {
    const input = document.getElementById('settings-new-user-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return showToast('请输入有效的账号名称');
    if (allUsersList.includes(name)) {
        switchAccount(name);
        input.value = '';
        return;
    }
    allUsersList.push(name);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));
    loadUserData(name);
    input.value = '';
    renderSettingsMain();
    renderMeView();
    updateHub();
    if (globalLobbyChannel) {
        globalLobbyChannel.track({
            username: currentUser,
            status: 'idle',
            joinedAt: Date.now()
        });
    }
    showToast(`已新建并切换至账号【${name}】`);
}

function handleDeleteCurrentAccount() {
    if (!currentUser) return;
    const targetUser = currentUser;
    const isConfirmed = confirm(`确定要永久删除当前账号【${targetUser}】吗？\n\n警告：此操作不可撤销！该账号的所有学习统计、艾宾浩斯复习进度、错词记录及熟词数据将被彻底删除！`);
    if (!isConfirmed) return;

    // 清除该用户在 localStorage 中的所有相关数据
    const userSuffix = `_${targetUser}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.endsWith(userSuffix) || key === `shici_config_${targetUser}` || key === `shici_progress_${targetUser}` || key === `vocab_review_filter_${targetUser}`)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 从用户列表中移除
    allUsersList = allUsersList.filter(u => u !== targetUser);
    localStorage.setItem('vocab_users_list', JSON.stringify(allUsersList));

    if (allUsersList.length > 0) {
        const nextUser = allUsersList[0];
        loadUserData(nextUser);
        renderSettingsMain();
        renderMeView();
        updateHub();
        if (globalLobbyChannel) {
            globalLobbyChannel.track({
                username: currentUser,
                status: 'idle',
                joinedAt: Date.now()
            });
        }
        showToast(`已删除账号【${targetUser}】，已自动切换至【${nextUser}】`);
    } else {
        currentUser = '';
        localStorage.removeItem('vocab_pk_user');
        switchView('view-auth');
        showToast(`已删除账号【${targetUser}】`);
    }
}

let settingsManageBooksCategory = 'english';

function switchManageBooksCategory(cat) {
    settingsManageBooksCategory = cat;
    const tabEn = document.getElementById('tab-manage-books-en');
    const tabShiCi = document.getElementById('tab-manage-books-shici');
    if (tabEn) tabEn.classList.toggle('active', cat === 'english');
    if (tabShiCi) tabShiCi.classList.toggle('active', cat === 'shici');
    renderManageLocalBooksInSettings();
}

let settingsFolderCollapseMap = {};

function toggleSettingsFolderCollapse(folderKey) {
    settingsFolderCollapseMap[folderKey] = !settingsFolderCollapseMap[folderKey];
    renderManageLocalBooksInSettings();
}

function renderManageLocalBooksInSettings() {
    const container = document.getElementById('settings-manage-books-list');
    if (!container) return;

    const allBooks = (BookManager.availableBooks && BookManager.availableBooks.length > 0) ? BookManager.availableBooks : BookManager.fallbackBooks;
    const bookMatches = (b) => (settingsManageBooksCategory === 'shici' ? isShiCiBook(b) : isEnglishBook(b));
    const cloudBooks = allBooks.filter(b => (b.isCloud || !String(b.id).startsWith('custom_')) && b.id !== 'GaoKao3500' && bookMatches(b));
    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_') && bookMatches(b));

    if (cloudBooks.length === 0 && customBooks.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">auto_stories</span>
                        <p style="margin-top:10px; font-size:0.95rem;">暂无${settingsManageBooksCategory === 'shici' ? '实词' : '英语'}词书</p>
                    </div>
                `;
        return;
    }

    let html = '';

    const isBookProgressActive = (b) => {
        const p = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
            ? EbbinghausEngine.getBookProgress(b.id, b.words)
            : null;
        const hasProgress = p && (p.learned > 0 || p.due > 0 || p.progressPercent > 0);
        const isSelected = (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds) && isBookIdSelected(singleSelectedBookIds, b.id));
        return hasProgress || isSelected;
    };

    // 1. 云端词书分类药丸（参考图三，点击展开呈现图四）
    if (cloudBooks.length > 0) {
        const categories = {};
        cloudBooks.forEach(b => {
            const cat = b.category || '精选';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(b);
        });

        Object.keys(categories).forEach(cat => {
            const booksInCat = categories[cat];
            const folderKey = `cat_${cat}`;
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = booksInCat.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#0284c7; font-size:22px;">cloud</span>
                            <strong style="font-size:1rem; color:#0f172a;">${escapeHtml(cat)}</strong>
                            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; font-weight:700;">${activeCount}/${booksInCat.length} 本</span>
                        </div>
                        <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${booksInCat.map(b => renderSettingsManageBookRow(b, true, cat)).join('')}
                        </div>
                        `;
            }
        });
    }

    // 2. 自建文件夹
    if (customBooks.length > 0 || localFolders.length > 0) {
        localFolders.forEach(folder => {
            const booksInFolder = customBooks.filter(b => b.folderId === folder.id);
            const folderKey = `folder_${folder.id}`;
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = booksInFolder.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#2563eb; font-size:22px;">folder</span>
                            <strong style="font-size:1rem; color:#0f172a;">${escapeHtml(folder.name)}</strong>
                            <span class="badge" style="background:#dbeafe; color:#1d4ed8; font-size:0.75rem; font-weight:700;">${activeCount}/${booksInFolder.length} 本</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="display:inline-flex; gap:6px;" onclick="event.stopPropagation();">
                                <button type="button" class="btn btn-outlined btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="promptRenameFolder('${folder.id}', '${escapeHtml(folder.name)}')">重命名</button>
                                <button type="button" class="btn btn-danger btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="confirmDeleteFolder('${folder.id}')">解散</button>
                            </div>
                            <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                        </div>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${booksInFolder.length === 0 ? `<div style="font-size:0.84rem; color:var(--md-sys-color-outline); padding:10px 4px;">该文件夹暂无词书</div>` : ''}
                            ${booksInFolder.map(b => renderSettingsManageBookRow(b, false)).join('')}
                        </div>
                        `;
            }
        });

        const uncatBooks = customBooks.filter(b => !b.folderId || !localFolders.some(f => f.id === b.folderId));
        if (uncatBooks.length > 0) {
            const folderKey = 'folder_uncat';
            const isExpanded = !!settingsFolderCollapseMap[folderKey];
            const activeCount = uncatBooks.filter(isBookProgressActive).length;

            html += `
                    <div class="settings-folder-section-header" onclick="toggleSettingsFolderCollapse('${folderKey}')" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin: 4px 0 2px 0; border-radius:12px; cursor:pointer; user-select:none; transition:background 0.15s;" onmouseover="this.style.background='var(--md-sys-color-surface-container-high)'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-rounded" style="color:#475569; font-size:22px;">folder_open</span>
                            <strong style="font-size:1rem; color:#0f172a;">未归类</strong>
                            <span class="badge" style="background:#e2e8f0; color:#334155; font-size:0.75rem; font-weight:700;">${activeCount}/${uncatBooks.length} 本</span>
                        </div>
                        <span class="material-symbols-rounded" style="font-size:20px; color:#64748b; transition:transform 0.2s; transform:${isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};">chevron_right</span>
                    </div>
                    `;

            if (isExpanded) {
                html += `
                        <div class="settings-folder-expanded-list" style="margin-bottom: 12px;">
                            ${uncatBooks.map(b => renderSettingsManageBookRow(b, false)).join('')}
                        </div>
                        `;
            }
        }
    }

    container.innerHTML = html;
}

function renderSettingsManageBookRow(b, isCloud = false, categoryName = '') {
    const displayName = escapeHtml(cleanBookName(b.rawName || b.name));
    const prog = (window.EbbinghausEngine && typeof EbbinghausEngine.getBookProgress === 'function')
        ? EbbinghausEngine.getBookProgress(b.id, b.words)
        : { total: b.count || 0, learned: 0, due: 0, mastered: 0, progressPercent: 0 };
    const totalWords = prog.total || b.count || (b.words ? b.words.length : 0);
    const tag = isCloud ? (categoryName || b.category || '精选') : '本地';

    return `
            <div class="settings-book-item-card" style="background:#ffffff; border:1px solid #e8edf2; border-radius:16px; padding:16px 20px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div class="settings-book-item-main" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div class="settings-book-item-info" style="flex:1; min-width:0;">
                        <div class="settings-book-item-title-row" style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                            <span class="settings-book-item-name" style="font-weight:700; font-size:1.05rem; color:#0f172a;">
                                <span class="material-symbols-rounded" style="font-size:18px; color:#0284c7; vertical-align:middle; margin-right:4px;">${isCloud ? 'cloud' : 'folder'}</span>
                                ${displayName}
                            </span>
                            <span class="settings-book-item-tag" style="background:#f1f5f9; color:#475569; font-size:0.78rem; padding:2px 8px; border-radius:9999px; font-weight:600;">${escapeHtml(tag)}</span>
                        </div>
                        <div class="settings-book-item-sub" style="font-size:0.86rem; color:#64748b;">
                            共 ${totalWords} 词 | 已学 ${prog.learned} 词 | 待复习 ${prog.due} 词
                        </div>
                    </div>
                    <div class="settings-book-item-actions" style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                        <button type="button" class="settings-book-item-btn" style="border:1px solid #e2e8f0; background:#ffffff; border-radius:9999px; padding:6px 14px; font-size:0.85rem; font-weight:600; color:#1e293b; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="viewBookWordsInSettings('${b.id}')">
                            <span class="material-symbols-rounded" style="font-size:17px; color:#334155;">visibility</span>
                            <span>查看内容</span>
                        </button>
                        <button type="button" class="settings-book-item-btn" style="border:1px solid #e2e8f0; background:#ffffff; border-radius:9999px; padding:6px 14px; font-size:0.85rem; font-weight:600; color:#1e293b; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" onclick="confirmResetBookProgress('${b.id}', '${displayName}')" title="重学该词书">
                            <span class="material-symbols-rounded" style="font-size:17px; color:#ea580c;">refresh</span>
                            <span>重学</span>
                        </button>
                        ${!isCloud ? `
                        <button type="button" class="btn btn-danger btn-sm" style="width:34px; height:34px; padding:0; border-radius:9999px;" onclick="confirmDeleteCustomBook('${b.id}', '${displayName}')" title="删除词书">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 14px; margin-top: 12px;">
                    <div class="book-progress-mini" style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin: 0;">
                        <div class="book-progress-mini-fill" style="width: ${prog.progressPercent}%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 9999px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="font-size: 0.92rem; font-weight: 800; color: #0284c7; min-width: 36px; text-align: right; flex-shrink: 0;">
                        ${prog.progressPercent}%
                    </div>
                </div>
            </div>
            `;
}

async function confirmResetBookProgress(bookId, bookName) {
    if (!currentUser) return;
    if (!confirm(`确定要重置词书“${bookName}”的学习进度吗？\n\n重置后，该词书的所有复习记录与相关熟词标记将被清空，恢复为全新未学状态。`)) {
        return;
    }
    await EbbinghausEngine.resetBookProgress(bookId);
    showToast(`已重置词书“${bookName}”的学习进度`);
    renderManageLocalBooksInSettings();
}

function exportUserConfigAndProgress() {
    if (!currentUser) return showToast('请先登录后再导出备份');
    try {
        const backupObj = {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.1.0',
            exportedAt: new Date().toISOString(),
            user: currentUser,
            data: {
                ebbinghaus: localStorage.getItem(`vocab_ebbinghaus_db_${currentUser}`),
                mastered: localStorage.getItem(`vocab_mastered_words_${currentUser}`),
                dailyLogs: localStorage.getItem(`vocab_daily_logs_${currentUser}`),
                userStats: localStorage.getItem(`user_stats_${currentUser}`),
                singleSelectedBooks: localStorage.getItem(`vocab_single_selected_books_${currentUser}`),
                singleConfig: localStorage.getItem('vocab_single_config'),
                dictationConfig: localStorage.getItem('vocab_dictation_config'),
                riddleHistory: localStorage.getItem(`vocab_riddle_daily_history_${currentUser}`)
            }
        };

        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentUser}的学习记录 ${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('已导出备份文件！');
    } catch (err) {
        alert('导出备份失败：' + err.message);
    }
}

function importUserConfigAndProgress(event) {
    if (!currentUser) return showToast('请先登录后再导入备份');
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed || !parsed.data) {
                throw new Error('备份文件格式不符合要求');
            }

            if (!confirm(`确定要恢复备份文件吗？\n导出时间: ${parsed.exportedAt || '未知'}\n用户名: ${parsed.user || '未知'}\n当前用户的复习进度与配置将被覆盖。`)) {
                event.target.value = '';
                return;
            }

            const d = parsed.data;
            if (d.ebbinghaus !== undefined && d.ebbinghaus !== null) {
                localStorage.setItem(`vocab_ebbinghaus_db_${currentUser}`, d.ebbinghaus);
            }
            if (d.mastered !== undefined && d.mastered !== null) {
                localStorage.setItem(`vocab_mastered_words_${currentUser}`, d.mastered);
            }
            if (d.dailyLogs !== undefined && d.dailyLogs !== null) {
                localStorage.setItem(`vocab_daily_logs_${currentUser}`, d.dailyLogs);
            }
            if (d.userStats !== undefined && d.userStats !== null) {
                localStorage.setItem(`user_stats_${currentUser}`, d.userStats);
            }
            if (d.singleSelectedBooks !== undefined && d.singleSelectedBooks !== null) {
                localStorage.setItem(`vocab_single_selected_books_${currentUser}`, d.singleSelectedBooks);
            }
            if (d.singleConfig) {
                localStorage.setItem('vocab_single_config', d.singleConfig);
            }
            if (d.dictationConfig) {
                localStorage.setItem('vocab_dictation_config', d.dictationConfig);
            }
            if (d.riddleHistory) {
                localStorage.setItem(`vocab_riddle_daily_history_${currentUser}`, d.riddleHistory);
            }

            showToast('备份数据恢复成功！正在刷新应用...');
            setTimeout(() => location.reload(), 600);
        } catch (err) {
            alert('导入备份失败：' + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function promptCreateFolder() {
    const name = prompt('请输入新文件夹名称：');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    if (localFolders.some(f => f.name === cleanName)) {
        showToast('该文件夹名称已存在');
        return;
    }
    const newFolder = { id: 'folder_' + Date.now(), name: cleanName, createdAt: Date.now() };
    localFolders.push(newFolder);
    await VocabOfflineDB.saveFolder(newFolder);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast(`已创建文件夹【${cleanName}】`);
}

async function promptRenameFolder(folderId, oldName) {
    const name = prompt('修改文件夹名称：', oldName);
    if (!name || !name.trim() || name.trim() === oldName) return;
    const folder = localFolders.find(f => f.id === folderId);
    if (folder) {
        folder.name = name.trim();
        await VocabOfflineDB.saveFolder(folder);
        renderManageLocalBooksInSettings();
        renderSingleBookList();
        showToast('文件夹名称已更新');
    }
}

async function confirmDeleteFolder(folderId) {
    if (!confirm('确定删除此文件夹吗？')) return;
    if (window.customBooks) {
        for (const b of window.customBooks) {
            if (b.folderId === folderId) {
                b.folderId = null;
                await VocabOfflineDB.saveBook(b);
            }
        }
    }
    localFolders = localFolders.filter(f => f.id !== folderId);
    await VocabOfflineDB.deleteFolder(folderId);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast('文件夹已删除');
}

async function changeBookFolder(bookId, targetFolderId) {
    const book = (window.customBooks || []).find(b => b.id === bookId);
    if (!book) return;
    book.folderId = targetFolderId || null;
    await VocabOfflineDB.saveBook(book);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    showToast('更改成功');
}

async function confirmDeleteCustomBook(bookId, bookName) {
    if (!confirm(`确定删除本地词书【${bookName}】吗？`)) return;
    if (window.customBooks) {
        window.customBooks = window.customBooks.filter(b => b.id !== bookId);
    }
    delete BookManager.bookCache[bookId];
    BookManager.availableBooks = BookManager.availableBooks.filter(b => b.id !== bookId);
    singleSelectedBookIds = (singleSelectedBookIds || []).filter(id => id !== bookId);
    localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
    await VocabOfflineDB.deleteBook(bookId);
    renderManageLocalBooksInSettings();
    renderSingleBookList();
    renderRoomBookChips();
    renderLocalDuelBookChips();
    renderAiDuelBookChips();
    showToast(`已删除本地词书【${bookName}】`);
}

async function syncLocalBooksWithCloud(notify = false) {
    if (!navigator.onLine) {
        if (notify) showToast('当前处于离线状态，词书已保存在本地');
        return;
    }
    try {
        const customBooks = window.customBooks || [];
        if (notify) {
            showToast(`${customBooks.length} 本词书已完成同步！`);
        }
    } catch (e) {
        if (notify) showToast('同步完成');
    }
}

let settingsViewingBookId = null;
let settingsViewingBookWords = [];
let settingsViewingCurrentWordsList = [];
let settingsViewingWordsExpanded = false;
let settingsViewingExpandedShiCiWords = new Set();

async function viewBookWordsInSettings(bookId) {
    const book = (window.customBooks || []).find(b => b.id === bookId) ||
        BookManager.availableBooks.find(b => b.id === bookId) ||
        BookManager.fallbackBooks.find(b => b.id === bookId);
    if (!book) return;

    settingsViewingBookId = bookId;
    settingsViewingWordsExpanded = false;
    settingsViewingExpandedShiCiWords = new Set();

    let words = [];
    if (isShiCiBook(book)) {
        words = await ShiCiManager.loadBooks([bookId]);
        if (words && words.length > 0) {
            settingsViewingExpandedShiCiWords.add(words[0].word);
        }
    } else {
        words = await BookManager.loadBookData(bookId);
    }
    settingsViewingBookWords = words || [];
    settingsViewingCurrentWordsList = settingsViewingBookWords;

    const titleEl = document.getElementById('settings-view-book-title');
    const countEl = document.getElementById('settings-view-book-count');
    const searchEl = document.getElementById('settings-view-book-search');

    if (titleEl) titleEl.innerText = book.rawName || book.name;
    if (countEl) countEl.innerText = `共 ${settingsViewingBookWords.length} 词`;
    if (searchEl) searchEl.value = '';

    renderSettingsViewingWordsList(settingsViewingBookWords);
    const addWordBtn = document.getElementById('btn-settings-add-word');
    if (addWordBtn) {
        const isCustom = String(bookId).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === bookId));
        addWordBtn.style.display = isCustom ? 'inline-flex' : 'none';
    }
    switchSettingsSubview('words');
}

function toggleShiCiWordCard(word) {
    if (settingsViewingExpandedShiCiWords.has(word)) {
        settingsViewingExpandedShiCiWords.delete(word);
    } else {
        settingsViewingExpandedShiCiWords.add(word);
    }
    const safeWordId = encodeURIComponent(word).replace(/%/g, '_');
    const card = document.getElementById(`shici-word-card-${safeWordId}`);
    if (card) {
        const isExp = settingsViewingExpandedShiCiWords.has(word);
        card.classList.toggle('expanded', isExp);
        updateShiCiExpandAllButton();
    } else {
        const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
        if (query) filterSettingsBookWordsDisplay();
        else renderSettingsViewingWordsList(settingsViewingBookWords);
    }
}

function toggleAllShiCiWordCards(expand) {
    const currentList = settingsViewingCurrentWordsList && settingsViewingCurrentWordsList.length > 0
        ? settingsViewingCurrentWordsList
        : settingsViewingBookWords;
    if (expand) {
        currentList.forEach(w => {
            if (w && w.word) settingsViewingExpandedShiCiWords.add(w.word);
        });
    } else {
        settingsViewingExpandedShiCiWords.clear();
    }
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) filterSettingsBookWordsDisplay();
    else renderSettingsViewingWordsList(settingsViewingBookWords);
}

function updateShiCiExpandAllButton() {
    const btn = document.getElementById('btn-shici-toggle-all-cards');
    if (!btn) return;
    const currentList = settingsViewingCurrentWordsList && settingsViewingCurrentWordsList.length > 0
        ? settingsViewingCurrentWordsList
        : settingsViewingBookWords;
    const anyExpanded = currentList.some(w => w && settingsViewingExpandedShiCiWords.has(w.word));
    btn.setAttribute('onclick', `toggleAllShiCiWordCards(${!anyExpanded})`);
    const icon = btn.querySelector('.material-symbols-rounded');
    const text = btn.querySelector('.btn-label-text');
    if (icon) icon.innerText = anyExpanded ? 'unfold_less' : 'unfold_more';
    if (text) text.innerText = anyExpanded ? '收起详情' : '全部展开';
}

function filterSettingsBookWordsDisplay() {
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim().toLowerCase();
    if (!query) {
        renderSettingsViewingWordsList(settingsViewingBookWords);
        return;
    }
    const filtered = settingsViewingBookWords.filter(w => {
        const wordMatch = (w.word || '').toLowerCase().includes(query);
        const pinyinMatch = (w.pinyin || '').toLowerCase().includes(query);
        let meaningStr = '';
        if (w.senses && Array.isArray(w.senses)) {
            meaningStr = w.senses.map(s => (s.meaning || '') + ' ' + (s.examples || []).map(e => (e.sentence || '') + ' ' + (e.source || '')).join(' ')).join(' ');
        } else {
            meaningStr = w.meanings ? w.meanings.map(m => m.meaning).join(' ') : (w.meaning || '');
        }
        const meaningMatch = meaningStr.toLowerCase().includes(query);
        return wordMatch || pinyinMatch || meaningMatch;
    });
    filtered.forEach(w => {
        if (w && w.word) settingsViewingExpandedShiCiWords.add(w.word);
    });
    renderSettingsViewingWordsList(filtered);
}

function expandSettingsViewingWords() {
    settingsViewingWordsExpanded = true;
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) {
        filterSettingsBookWordsDisplay();
    } else {
        renderSettingsViewingWordsList(settingsViewingBookWords);
    }
}

function handleToggleMasteredInWordList(word, phone, meaning, type = 'word') {
    const nowMastered = toggleMasteredWord(word, phone, meaning, type);
    if (type === 'shici' && typeof ShiCiEbbinghausEngine !== 'undefined') {
        if (nowMastered) {
            ShiCiEbbinghausEngine.recordWord(word, meaning, phone, true, true);
        } else {
            ShiCiEbbinghausEngine.unmarkMastered(word);
        }
        ShiCiEbbinghausEngine.updateDueBadge();
    }
    const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
    if (query) filterSettingsBookWordsDisplay();
    else renderSettingsViewingWordsList(settingsViewingBookWords);
}

async function handleDeleteWordFromBookList(word) {
    if (!confirm(`确定将词汇【${word}】从当前词书移除并移入回收站吗？可在回收站中随时恢复。`)) return;
    const ok = await deleteWordFromCustomBook(word, settingsViewingBookId);
    if (ok) {
        settingsViewingBookWords = settingsViewingBookWords.filter(w => (w.word || '').toLowerCase() !== word.toLowerCase());
        const query = (document.getElementById('settings-view-book-search')?.value || '').trim();
        if (query) filterSettingsBookWordsDisplay();
        else renderSettingsViewingWordsList(settingsViewingBookWords);
        renderManageLocalBooksInSettings();
    }
}

function renderSettingsViewingWordsList(words) {
    const container = document.getElementById('settings-view-book-words-container');
    const countEl = document.getElementById('settings-view-book-count');
    if (!container) return;

    settingsViewingCurrentWordsList = words || [];
    const isLocalCustomBook = settingsViewingBookId && String(settingsViewingBookId).startsWith('custom_');
    const book = (window.customBooks || []).find(b => b.id === settingsViewingBookId) ||
        BookManager.availableBooks.find(b => b.id === settingsViewingBookId) ||
        BookManager.fallbackBooks.find(b => b.id === settingsViewingBookId);

    const isShiCi = isShiCiBook(book) || (words.length > 0 && Array.isArray(words[0].senses));

    const totalCount = settingsViewingBookWords.length;
    const currentMatchCount = words.length;

    if (countEl) {
        countEl.innerText = `显示 ${Math.min(settingsViewingWordsExpanded ? currentMatchCount : 200, currentMatchCount)} / ${totalCount} 词`;
    }

    if (words.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的词汇</div>`;
        return;
    }

    // 实词词书专属展示：自适应单列卡片手风琴（一行只显示一个字）
    if (isShiCi) {
        const displayedWords = settingsViewingWordsExpanded ? words : words.slice(0, 200);
        const anyExpanded = displayedWords.some(w => settingsViewingExpandedShiCiWords.has(w.word));

        const cardsHtml = displayedWords.map((w, idx) => {
            const isMastered = typeof ShiCiEbbinghausEngine !== 'undefined'
                ? ShiCiEbbinghausEngine.isWordMastered(w.word)
                : isWordMastered(w.word);
            const isExpanded = settingsViewingExpandedShiCiWords.has(w.word);
            const sensesList = w.senses || [];
            const safeWordId = encodeURIComponent(w.word).replace(/%/g, '_');

            return `
                    <div class="shici-word-card ${isExpanded ? 'expanded' : ''}" id="shici-word-card-${safeWordId}">
                        <div class="shici-card-header" onclick="toggleShiCiWordCard('${escapeHtml(w.word)}')">
                            <div class="shici-card-header-left">
                                <span class="shici-card-char-name">【${escapeHtml(w.word)}】</span>
                                <span class="shici-card-char-pinyin">${escapeHtml(w.pinyin || '')}</span>
                                <span class="shici-card-senses-badge">${sensesList.length} 个义项</span>
                            </div>
                            <div class="shici-card-header-right">
                                <button type="button" class="btn btn-sm ${isMastered ? 'btn-filled' : 'btn-outlined'}"
                                    style="${isMastered ? 'background:var(--md-sys-color-success); color:#fff; border-color:transparent;' : ''}"
                                    onclick="event.stopPropagation(); handleToggleMasteredInWordList('${escapeHtml(w.word)}', '${escapeHtml(w.pinyin || '')}', '', 'shici')">
                                    <span class="material-symbols-rounded" style="font-size:16px;">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                                    <span>${isMastered ? '已掌握' : '标记熟词'}</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-outlined" onclick="event.stopPropagation(); jumpToSearch('${escapeHtml(w.word)}')" title="在词典中查询该词" style="gap:3px; padding:0 8px;">
                                    <span class="material-symbols-rounded" style="font-size:16px;">search</span>
                                    <span>查词</span>
                                </button>
                                ${isLocalCustomBook ? `
                                <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); handleDeleteWordFromBookList('${escapeHtml(w.word)}')">
                                    <span class="material-symbols-rounded">delete</span>
                                </button>
                                ` : ''}
                                <span class="material-symbols-rounded shici-card-chevron">expand_more</span>
                            </div>
                        </div>
                        <div class="shici-card-body">
                            ${sensesList.map((s, sIdx) => {
                const cleanMeaning = (s.meaning || '').replace(/★/g, '').trim();
                const isStar = (s.meaning || '').includes('★');
                const examples = s.examples || [];
                return `
                                <div class="shici-sense-card-item">
                                    <div class="shici-sense-meta-box">
                                        <div class="shici-sense-meta-header">
                                            <span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-weight:700; border-radius:6px; padding:2px 8px; font-size:0.8rem;">${escapeHtml(s.part_of_speech || '实词')}</span>
                                            <strong style="font-size:0.98rem; font-weight:700; color:var(--md-sys-color-on-surface); line-height:1.4;">${escapeHtml(cleanMeaning)}</strong>
                                            ${isStar ? '<span class="badge" style="background:#FFF3E0; color:#E65100; font-weight:700; border:1px solid #FFE0B2; font-size:0.75rem;">★ 核心考点</span>' : ''}
                                        </div>
                                        <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-weight:600;">义项 #${sIdx + 1}</span>
                                    </div>
                                    <div class="shici-sense-examples-box">
                                        ${examples.length > 0 ? examples.map(ex => {
                    let highSent = escapeHtml(ex.sentence || '');
                    if (w.word && ex.sentence && ex.sentence.includes(w.word)) {
                        const reg = new RegExp(escapeRegex(w.word), 'g');
                        highSent = escapeHtml(ex.sentence).replace(reg, `<strong style="color:var(--md-sys-color-primary); font-weight:800;">${escapeHtml(w.word)}</strong>`);
                    }
                    return `
                                                <div class="shici-sense-example-line">
                                                    <span>${highSent}</span>
                                                    <span class="shici-sense-example-source">${escapeHtml(ex.source || '')}</span>
                                                    ${ex.annotation ? `<div style="font-size:0.82rem; color:var(--md-sys-color-on-surface-variant); margin-top:3px;">💡 译文释义：${escapeHtml(ex.annotation)}</div>` : ''}
                                                </div>
                                            `;
                }).join('') : '<div style="font-size:0.82rem; color:var(--md-sys-color-outline);">暂为例句数据</div>'}
                                    </div>
                                </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                    `;
        }).join('');

        container.innerHTML = `
                    <div class="shici-cards-list">
                        ${cardsHtml}
                    </div>
                    ${!settingsViewingWordsExpanded && words.length > 200 ? `
                        <div style="text-align:center; margin-top:16px;">
                            <button type="button" class="btn btn-outlined btn-sm" onclick="expandSettingsViewingWords()">
                                <span class="material-symbols-rounded" style="font-size:18px;">expand_more</span>
                                <span class="btn-label-text">查看全部 (共 ${words.length} 词)</span>
                            </button>
                        </div>
                    ` : (words.length > 200 ? `<div style="text-align:center; padding:12px; font-size:0.82rem; color:var(--md-sys-color-outline);">已展示全部 ${words.length} 词</div>` : '')}
                `;
        return;
    }

    const displayedWords = settingsViewingWordsExpanded ? words : words.slice(0, 200);

    container.innerHTML = displayedWords.map((w, idx) => {
        const isMastered = isWordMastered(w.word);
        const meaningStr = w.meanings ? w.meanings.map(m => (m.pos ? `<span style="color:var(--md-sys-color-primary); font-weight:700;">${m.pos}</span> ` : '') + m.meaning).join('；') : (w.meaning || '');
        const meaningPlain = w.meanings ? w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；') : (w.meaning || '');

        return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant); gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.02rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(w.word)}</span>
                            ${w.phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(w.phone)}</span>` : ''}
                            <span style="font-size:0.75rem; color:var(--md-sys-color-outline); font-family:monospace;">#${idx + 1}</span>
                        </div>
                        <div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px; line-height:1.4;">${meaningStr}</div>
                    </div>
                    <div class="word-item-toolbar">
                        <button type="button" class="word-item-tool-btn" onclick="playWordAudio('${escapeHtml(w.word)}')" title="播放发音">
                            <span class="material-symbols-rounded">volume_up</span>
                        </button>
                        <button type="button" class="word-item-tool-btn" onclick="jumpToSearch('${escapeHtml(w.word)}')" title="查询详细释义">
                            <span class="material-symbols-rounded">search</span>
                        </button>
                        <button type="button" class="word-item-tool-btn ${isMastered ? 'active' : ''}" onclick="handleToggleMasteredInWordList('${escapeHtml(w.word)}', '${escapeHtml(w.phone || '')}', '${escapeHtml(meaningPlain)}')" title="${isMastered ? '已标注熟词（点击取消）' : '标注熟词（不再抽取）'}">
                            <span class="material-symbols-rounded">${isMastered ? 'check_circle' : 'check_circle_outline'}</span>
                        </button>
                        ${isLocalCustomBook ? `
                        <button type="button" class="word-item-tool-btn danger" onclick="handleDeleteWordFromBookList('${escapeHtml(w.word)}')" title="移出词书并放入回收站">
                            <span class="material-symbols-rounded">delete</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
    }).join('') + (!settingsViewingWordsExpanded && words.length > 200 ? `
                <div style="text-align:center; margin-top:16px;">
                    <button type="button" class="btn btn-outlined btn-sm" onclick="expandSettingsViewingWords()">
                        <span class="material-symbols-rounded" style="font-size:18px;">expand_more</span>
                        <span class="btn-label-text">查看全部 (共 ${words.length} 词)</span>
                    </button>
                </div>
            ` : (words.length > 200 ? `<div style="text-align:center; padding:12px; font-size:0.82rem; color:var(--md-sys-color-outline);">已展示全部 ${words.length} 词</div>` : ''));
}

let settingsMasteredCategory = 'all';
let settingsTrashCategory = 'all';

function isShiCiItem(item) {
    if (!item) return false;
    if (item.type === 'shici' || item.isShiCi) return true;
    const w = (typeof item === 'string') ? item : (item.word || '');
    if (/[\u4e00-\u9fa5]/.test(w) && !/[a-zA-Z]/.test(w)) return true;
    return false;
}

function filterMasteredCategory(cat) {
    settingsMasteredCategory = cat;
    ['all', 'en', 'shici'].forEach(k => {
        const btn = document.getElementById(`tab-mastered-${k}`);
        if (btn) btn.classList.toggle('active', (k === 'all' && cat === 'all') || (k === 'en' && cat === 'english') || (k === 'shici' && cat === 'shici'));
    });
    renderMasteredWordsInSettings();
}

function filterTrashCategory(cat) {
    settingsTrashCategory = cat;
    ['all', 'en', 'shici'].forEach(k => {
        const btn = document.getElementById(`tab-trash-${k}`);
        if (btn) btn.classList.toggle('active', (k === 'all' && cat === 'all') || (k === 'en' && cat === 'english') || (k === 'shici' && cat === 'shici'));
    });
    renderTrashWordsInSettings();
}

/* Settings 熟词本页面渲染逻辑 (Task 22) */
function renderMasteredWordsInSettings() {
    const container = document.getElementById('settings-mastered-container');
    const countEl = document.getElementById('settings-mastered-count');
    if (!container) return;

    let list = getMasteredWords();
    if (settingsMasteredCategory === 'english') {
        list = list.filter(item => !isShiCiItem(item));
    } else if (settingsMasteredCategory === 'shici') {
        list = list.filter(item => isShiCiItem(item));
    }

    if (countEl) countEl.innerText = `共 ${list.length} 词`;

    if (list.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">check_circle</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${settingsMasteredCategory === 'shici' ? '实词' : (settingsMasteredCategory === 'english' ? '英语' : '')}熟词</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = list.map((item, idx) => {
        const word = typeof item === 'string' ? item : item.word;
        const phone = typeof item === 'string' ? '' : (item.phone || '');
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        const isShiCi = isShiCiItem(item);

        return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant);">
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.1rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(word)}</span>
                                ${phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(phone)}</span>` : ''}
                                ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.72rem; font-weight:700;">文言实词</span>` : ''}
                                ${!isShiCi ? `
                                <button type="button" class="btn-audio-speak" style="width:26px; height:26px; margin-left:4px;" onclick="playWordAudio('${escapeHtml(word)}')" title="发音">
                                    <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                                </button>
                                ` : ''}
                            </div>
                            ${meaning ? `<div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px;">${escapeHtml(meaning)}</div>` : ''}
                        </div>
                        <button type="button" class="btn btn-outlined btn-sm" onclick="handleUnmarkMastered('${escapeHtml(word)}')" title="取消熟词标记">
                            <span class="material-symbols-rounded" style="font-size:16px;">remove_done</span>
                            <span class="btn-label-text">取消熟词</span>
                        </button>
                    </div>
                `;
    }).join('');
}

function handleUnmarkMastered(word) {
    toggleMasteredWord(word);
    renderMasteredWordsInSettings();
    if (gameMode === 'single' && singleState && singleState.pool) {
        const q = singleState.pool[singleState.currentIdx];
        if (q) updateSingleCardToolbar(q);
    }
    if (shiciProgress.masteredWords && shiciProgress.masteredWords[word]) {
        delete shiciProgress.masteredWords[word];
        saveShiCiState();
    }
}

function filterMasteredWordsDisplay() {
    const query = (document.getElementById('settings-mastered-search')?.value || '').trim().toLowerCase();
    const container = document.getElementById('settings-mastered-container');
    if (!container) return;

    let list = getMasteredWords();
    if (settingsMasteredCategory === 'english') {
        list = list.filter(item => !isShiCiItem(item));
    } else if (settingsMasteredCategory === 'shici') {
        list = list.filter(item => isShiCiItem(item));
    }

    if (!query) {
        renderMasteredWordsInSettings();
        return;
    }

    const filtered = list.filter(item => {
        const word = typeof item === 'string' ? item : item.word;
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        return word.toLowerCase().includes(query) || meaning.toLowerCase().includes(query);
    });

    const countEl = document.getElementById('settings-mastered-count');
    if (countEl) countEl.innerText = `显示 ${filtered.length} / ${list.length} 词`;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的熟词</div>`;
        return;
    }

    container.innerHTML = filtered.map((item, idx) => {
        const word = typeof item === 'string' ? item : item.word;
        const phone = typeof item === 'string' ? '' : (item.phone || '');
        const meaning = typeof item === 'string' ? '' : (item.meaning || '');
        const isShiCi = isShiCiItem(item);

        return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); border:1px solid var(--md-sys-color-outline-variant);">
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.1rem; font-weight:700; color:var(--md-sys-color-on-surface);">${escapeHtml(word)}</span>
                                ${phone ? `<span style="font-size:0.82rem; color:var(--md-sys-color-outline); font-family:'Roboto Mono',monospace;">${escapeHtml(phone)}</span>` : ''}
                                ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.72rem; font-weight:700;">文言实词</span>` : ''}
                                ${!isShiCi ? `
                                <button type="button" class="btn-audio-speak" style="width:26px; height:26px; margin-left:4px;" onclick="playWordAudio('${escapeHtml(word)}')" title="发音">
                                    <span class="material-symbols-rounded" style="font-size:16px;">volume_up</span>
                                </button>
                                ` : ''}
                            </div>
                            ${meaning ? `<div style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant); margin-top:4px;">${escapeHtml(meaning)}</div>` : ''}
                        </div>
                        <button type="button" class="btn btn-outlined btn-sm" onclick="handleUnmarkMastered('${escapeHtml(word)}')" title="取消熟词标记">
                            <span class="material-symbols-rounded" style="font-size:16px;">remove_done</span>
                            <span class="btn-label-text">取消熟词</span>
                        </button>
                    </div>
                `;
    }).join('');
}
function toggleTrashMoveDropdown(e, trashId) {
    if (e) e.stopPropagation();
    const dropdownId = `dropdown-trash-move-${trashId}`;
    const targetEl = document.getElementById(dropdownId);
    if (!targetEl) return;
    const isAlreadyOpen = targetEl.classList.contains('open');
    document.querySelectorAll('.md3-custom-dropdown.open').forEach(el => el.classList.remove('open'));
    if (!isAlreadyOpen) {
        targetEl.classList.add('open');
    }
}

function selectMoveTrashWordOption(trashId, targetBookId) {
    document.querySelectorAll('.md3-custom-dropdown.open').forEach(el => el.classList.remove('open'));
    moveTrashWordToAnotherBook(trashId, targetBookId);
}

/* ==========================================================================
   回收站公用单行模板函数（统一防挤压、自适应图层展开）
   ========================================================================== */
function renderTrashWordRow(item, customBooks) {
    const deletedTimeStr = item.deletedAt
        ? new Date(item.deletedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const cleanBookName = String(item.originalBookName || '未知').replace(/^[📂📁\s]+/, '');
    const isShiCi = isShiCiItem(item);

    return `
                <div class="trash-word-row">
                    <!-- 左侧信息区：自适应伸缩，自动折行，绝不挤压右侧按钮 -->
                    <div class="trash-word-info">
                        <div class="trash-word-header">
                            <span class="trash-word-title">${escapeHtml(item.word)}</span>
                            ${item.phone ? `<span class="trash-word-phone">${escapeHtml(item.phone)}</span>` : ''}
                            ${isShiCi ? `<span class="badge" style="background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); font-size:0.75rem; font-weight:700;">文言实词</span>` : ''}
                            <span class="badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline); font-size:0.75rem;">原词书: ${escapeHtml(cleanBookName)}</span>
                            ${deletedTimeStr ? `<span style="font-size:0.75rem; color:var(--md-sys-color-outline);">${deletedTimeStr}</span>` : ''}
                        </div>
                        <div class="trash-word-meaning">${escapeHtml(item.meaning || '')}</div>
                    </div>

                    <!-- 右侧操作区：flex-shrink: 0 彻底防止挤压变形 -->
                    <div class="trash-word-actions">
                        <button type="button" class="btn btn-tonal btn-sm" onclick="restoreTrashWord('${item.id}')" title="恢复到原词书">
                            <span class="material-symbols-rounded" style="font-size:16px;">restore</span>
                            <span class="btn-label-text">恢复</span>
                        </button>

                        ${customBooks.length > 0 ? `
                        <div class="md3-custom-dropdown" id="dropdown-trash-move-${item.id}">
                            <button type="button" class="md3-dropdown-btn" style="height:34px; font-size:0.82rem; padding:0 12px;" onclick="toggleTrashMoveDropdown(event, '${item.id}')">
                                <span>移动到...</span>
                                <span class="material-symbols-rounded dropdown-chevron" style="font-size:16px;">expand_more</span>
                            </button>
                            <div class="md3-dropdown-menu">
                                ${customBooks.map(cb => `
                                    <div class="md3-dropdown-item" onclick="selectMoveTrashWordOption('${item.id}', '${cb.id}')">
                                        <span class="material-symbols-rounded">menu_book</span>
                                        <span>${escapeHtml((cb.rawName || cb.name).replace(/^[📂📁\s]+/, ''))}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <button type="button" class="btn btn-danger btn-sm" style="padding:0 10px; height:34px;" onclick="permanentlyDeleteTrashWord('${item.id}')" title="彻底删除">
                            <span class="material-symbols-rounded" style="font-size:16px;">delete_forever</span>
                        </button>
                    </div>
                </div>
            `;
}

/* 渲染回收站完整列表 */
function renderTrashWordsInSettings() {
    const container = document.getElementById('settings-trash-container');
    const countEl = document.getElementById('settings-trash-count');
    if (!container) return;

    let trash = getTrashWords();
    if (settingsTrashCategory === 'english') {
        trash = trash.filter(item => !isShiCiItem(item));
    } else if (settingsTrashCategory === 'shici') {
        trash = trash.filter(item => isShiCiItem(item));
    }

    if (countEl) countEl.innerText = `共 ${trash.length} 词`;

    if (trash.length === 0) {
        container.innerHTML = `
                    <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:42px; opacity:0.5;">delete</span>
                        <p style="margin-top:8px; font-size:0.92rem;">暂无${settingsTrashCategory === 'shici' ? '实词' : (settingsTrashCategory === 'english' ? '英语' : '')}已删词汇</p>
                    </div>
                `;
        return;
    }

    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_'));
    container.innerHTML = trash.map(item => renderTrashWordRow(item, customBooks)).join('');
}

/* 搜索过滤回收站词汇（完美同步一致模板） */
function filterTrashWordsDisplay() {
    const query = (document.getElementById('settings-trash-search')?.value || '').trim().toLowerCase();
    const container = document.getElementById('settings-trash-container');
    if (!container) return;

    let trash = getTrashWords();
    if (settingsTrashCategory === 'english') {
        trash = trash.filter(item => !isShiCiItem(item));
    } else if (settingsTrashCategory === 'shici') {
        trash = trash.filter(item => isShiCiItem(item));
    }

    if (!query) {
        renderTrashWordsInSettings();
        return;
    }

    const filtered = trash.filter(item => {
        const w = (item.word || '').toLowerCase();
        const m = (item.meaning || '').toLowerCase();
        const b = (item.originalBookName || '').toLowerCase();
        return w.includes(query) || m.includes(query) || b.includes(query);
    });

    const countEl = document.getElementById('settings-trash-count');
    if (countEl) countEl.innerText = `显示 ${filtered.length} / ${trash.length} 词`;

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:32px; color:var(--md-sys-color-outline);">未找到匹配的已删词汇</div>`;
        return;
    }

    const customBooks = (window.customBooks || []).filter(b => !b.isCloud && String(b.id).startsWith('custom_'));
    container.innerHTML = filtered.map(item => renderTrashWordRow(item, customBooks)).join('');
}



const APP_VERSION = '2.1.0';
const APP_CHANGELOG = [
    {
        version: 'v2.1.0',
        date: '2026-09-19',
        badge: '当前版本',
        items: [
            '添加搜索功能。',
            '优化人机对战。',
            '优化UI：新增“我”页面。',
            '优化复习功能。',
            '优化易错项抽取。'
        ]
    },
    {
        version: 'v2.0.0',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '更新背实词功能。',
            '更新每组小结。',
            '优化词书。',
            '修复自定义页面宽度对设置页没有作用的问题。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.9.2',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '优化词书。',
            '优化抽词："/"、"="、"( )"、","、"one’s"等自动预填。',
            '优化◇◇◇◇◇动画。',
            '优化窄屏UI。'
        ]
    },
    {
        version: 'v1.9.1',
        date: '2026-09-13',
        badge: '历史版本',
        items: [
            '优化版本更新。',
        ]
    },
    {
        version: 'v1.9.0',
        date: '2026-09-12',
        badge: '历史版本',
        items: [
            '更新学习日历。',
            '云端词书也支持在设置中查看。',
            '更新复习规则：学习一个词汇/词组分为生词-第 1-4 轮复习-熟词共 5 个阶段，对应掌握程度，在单词卡片中用◇◇◇◇◇标识。第一轮复习为第二天，第二轮复习为第四天，第三轮复习为一周后，第四轮复习为四周后。如果有一轮答错，则回到第一轮复习。第一次如果答对则直接跳到第二轮复习。如果需要复习那一天未复习，则掉一颗星。',
            '在选择词书界面支持显示每本词书的学习进度条、待复习词数，学习进度动态更新。',
            '按照选择的词书进行复习。',
            '在设置中支持导入、导出个人配置与学习记录。'
        ]
    },
    {
        version: 'v1.8.1',
        date: '2026-09-12',
        badge: '历史版本',
        items: [
            '更新词汇卡片工具栏：支持播放发音、标注熟词、删除词汇功能。',
            '从 GitHub 加载词书。',
            '从GitHub Releases 获取更新日志，并一键下载最新版本。',
            '优化即时复习，如果多次答错，不用再在组末多问一遍。',
            '优化联机对战：解决双方本地词书不一致时的显示问题。',
            '优化词书管理。',
            '优化词组背诵："..."、"sb."、"sth."、"one’s"等自动预填。',
            '优化人机对战。',
            '所有“开启/关闭”设置改为滑动开关。',
            '听音写词模式隐藏音标。',
            '单人模式答完词组不会自动跳到下一题。',
            '添加 GitHub 开源仓库链接。',
            '修复Wordle 填词无法使用实体键盘输入的问题。',
            '修复无人在线房间意外显示的问题。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.7.0',
        date: '2026-09-09',
        badge: '历史版本',
        items: [
            '更新人机对战模式。',
            '优化联机功能。',
            '优化版本更新和日志功能。',
            '支持保存学习进度。',
            '优化UI'
        ]
    },
    {
        version: 'v1.6.0',
        date: '2026-09-08',
        badge: '历史版本',
        items: [
            '添加设置页，可以调整页面尺寸、管理词书、查看更新日志。',
            '支持自动更新版本。',
            '优化联机体验。',
            '默写模式添加键盘。',
            '修复学习模式拼出正确词组后卡住的bug。',
            '优化UI：添加左侧导航栏。'
        ]
    },
    {
        version: 'v1.5.0',
        date: '2026-09-01',
        badge: '历史版本',
        items: [
            '更新默写模式。',
            '更新管理本地词书功能。',
            '更新wordle提示功能。',
            '远程联机房间支持实时聊天。',
            '添加读音功能，调用有道词典api。',
            '修复wordle只读取云端词书的bug。',
            '优化UI。'
        ]
    },
    {
        version: 'v1.4.0',
        date: '2026-08-31',
        badge: '历史版本',
        items: [
            '更新同屏对战、即时复习功能。',
            '远程联机、同屏对决的错题将自动放入错题本中。',
            '优化词组划分和易错项抽取。',
            '更新网页、app图标。',
            '更新World riddle切换大小写功能。',
            '修复World riddle的若干bug。',
            '优化、美化UI。'
        ]
    },
    {
        version: 'v1.3.0',
        date: '2026-08-30',
        badge: '历史版本',
        items: [
            '加入更多词书。',
            'World riddle更新提示功能。'
        ]
    },
    {
        version: 'v1.2.0',
        date: '2026-08-29',
        badge: '历史版本',
        items: [
            '加入Wordle小游戏。',
            '优化背词功能。'
        ]
    },
    {
        version: 'v1.1.0',
        date: '2026-08-28',
        badge: '历史版本',
        items: [
            '更新导入本地词库功能。',
            '添加词组支持。',
            '优化单人模式UI。'
        ]
    },
    {
        version: 'v1.0.0',
        date: '2026-08-27',
        badge: '历史版本',
        items: [
            '完成联机功能。',
            '完成UI适配。'
        ]
    }
];

async function renderChangelogInSettings() {
    const container = document.getElementById('settings-changelog-container');
    if (!container) return;

    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const actionText = document.getElementById('btn-changelog-action-text');
    if (actionText) actionText.innerText = isLocal ? '下载最新版本' : '同步';

    // 1. 先用本地 APP_CHANGELOG 立即秒级渲染，杜绝白屏
    renderChangelogItems(container, APP_CHANGELOG);

    // 2. 异步获取全量历史日志 (优先走 Worker 代理，避免大陆直连 GitHub 失败)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // 关键改动：优先从自己的 Worker API 获取，Worker 连 GitHub 无论在何处都不受墙影响
        let ghRes = await fetch(`${BookManager.API_BASE}/api/releases`, {
            signal: controller.signal
        }).catch(() => null);

        // 如果 Worker 没有这个接口，则降级尝试走 GitHub 直连（针对海外网络）
        if (!ghRes || !ghRes.ok) {
            ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases?per_page=15', {
                signal: controller.signal
            }).catch(() => null);
        }

        clearTimeout(timeoutId);

        if (ghRes && ghRes.ok) {
            const releases = await ghRes.json();
            if (Array.isArray(releases) && releases.length > 0) {
                const dynamicLogs = releases.map((rel, idx) => {
                    const version = rel.tag_name || `v${rel.name || ''}`;
                    const isCurrent = semverCompare(version, APP_VERSION) === 0;
                    const isNewer = semverCompare(version, APP_VERSION) > 0;
                    const badge = isCurrent ? '当前版本' : (isNewer ? '最新版本' : '历史版本');
                    const date = (rel.published_at || '').substring(0, 10);
                    let items = [];
                    if (rel.body) {
                        items = rel.body.replace(/\r\n/g, '\n').split('\n')
                            .map(l => l.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''))
                            .filter(l => l.length > 0 && !l.startsWith('#'));
                    }
                    if (items.length === 0) items = ['查看 GitHub Release 获取完整详情'];
                    return {
                        version,
                        date,
                        badge,
                        items,
                        htmlUrl: rel.html_url,
                        isHighlight: isCurrent || isNewer
                    };
                });
                renderChangelogItems(container, dynamicLogs);
            }
        }
    } catch (err) {
        console.warn('Failed to load changelog:', err);
    }
}

function renderChangelogItems(container, list) {
    container.innerHTML = list.map((entry, idx) => {
        const isHighlight = entry.isHighlight !== undefined ? entry.isHighlight : (idx === 0);
        return `
                <div class="card" style="padding:18px 20px; border-left: 4px solid ${isHighlight ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 style="margin:0; font-size:1.1rem; font-weight:700;">${escapeHtml(entry.version)}</h3>
                            <span class="badge" style="background:${isHighlight ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container-high)'}; color:${isHighlight ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)'}; font-size:0.75rem;">${escapeHtml(entry.badge)}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.82rem; color:var(--md-sys-color-outline);">${escapeHtml(entry.date)}</span>
                            ${entry.htmlUrl ? `<a href="${entry.htmlUrl}" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem; color:var(--md-sys-color-primary); text-decoration:none; display:inline-flex; align-items:center; gap:2px;"><span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>Release</a>` : ''}
                        </div>
                    </div>
                    <ul style="padding-left:20px; font-size:0.88rem; line-height:1.7; color:var(--md-sys-color-on-surface-variant); margin:0;">
                        ${entry.items.map(it => `<li style="margin-bottom:6px;">${escapeHtml(it)}</li>`).join('')}
                    </ul>
                </div>
            `;
    }).join('');
}
/* --- End: views/settings.js --- */

/* --- Begin: views/search.js --- */
/**
 * 独立查词、有道建议、词块拖拽与加词视图
 * Module: assets/js/views/search.js
 */

// ----------------- 手动添加词汇与有道自动查词 -----------------
let manualAddWordState = {
    word: '',
    chips: [], // Array of { id, pos, text, selected: boolean, isCustom: boolean }
    debounceTimer: null
};

function openManualAddWordModal() {
    const modal = document.getElementById('modal-manual-add-word');
    const wordInput = document.getElementById('input-manual-word');
    const labelEl = document.getElementById('manual-add-word-book-label');
    const candidatesWrap = document.getElementById('manual-word-youdao-candidates');
    const customInput = document.getElementById('input-manual-custom-meaning');

    const currentBook = (window.customBooks || []).find(b => b.id === settingsViewingBookId);
    if (labelEl) {
        labelEl.innerText = `目标词书：《${currentBook ? (currentBook.rawName || currentBook.name) : '当前词书'}》`;
    }

    if (wordInput) wordInput.value = '';
    if (customInput) customInput.value = '';
    manualAddWordState = { word: '', chips: [], debounceTimer: null };

    if (candidatesWrap) {
        candidatesWrap.innerHTML = `<div style="font-size: 0.82rem; color: var(--md-sys-color-outline); padding: 12px 0; text-align: center;">输入英文单词后自动获取释义词块...</div>`;
    }
    const actions = document.getElementById('manual-word-chips-actions');
    if (actions) actions.style.display = 'none';

    if (modal) modal.classList.add('active');
    if (wordInput) setTimeout(() => wordInput.focus(), 150);
}

function closeManualAddWordModal() {
    const modal = document.getElementById('modal-manual-add-word');
    if (modal) modal.classList.remove('active');
    if (manualAddWordState.debounceTimer) clearTimeout(manualAddWordState.debounceTimer);
}

function handleManualWordInputChange(val) {
    if (manualAddWordState.debounceTimer) clearTimeout(manualAddWordState.debounceTimer);
    const clean = (val || '').trim();
    manualAddWordState.word = clean;
    if (!clean) {
        const candidatesWrap = document.getElementById('manual-word-youdao-candidates');
        if (candidatesWrap) {
            candidatesWrap.innerHTML = `<div style="font-size: 0.82rem; color: var(--md-sys-color-outline); padding: 12px 0; text-align: center;">输入英文单词后自动获取释义词块...</div>`;
        }
        const actions = document.getElementById('manual-word-chips-actions');
        if (actions) actions.style.display = 'none';
        return;
    }

    manualAddWordState.debounceTimer = setTimeout(() => {
        triggerAutoFetchYoudaoForManual();
    }, 350);
}

async function triggerAutoFetchYoudaoForManual() {
    const wordInput = document.getElementById('input-manual-word');
    const query = wordInput ? wordInput.value.trim() : manualAddWordState.word;
    if (!query) return;

    const candidatesWrap = document.getElementById('manual-word-youdao-candidates');
    if (candidatesWrap) {
        candidatesWrap.innerHTML = `<div style="font-size: 0.82rem; color: var(--md-sys-color-outline); padding: 12px 0; text-align: center;">正在查询有道释义...</div>`;
    }

    const res = await searchYoudaoSuggest(query);
    const chips = [];
    let counter = 0;

    if (res && Array.isArray(res.entries) && res.entries.length > 0) {
        const queryLower = query.toLowerCase();
        const matchedEntries = res.entries.filter(e => e && e.entry && e.entry.trim().toLowerCase() === queryLower);
        const entriesToUse = matchedEntries.length > 0 ? matchedEntries : res.entries.slice(0, 3);

        entriesToUse.forEach(e => {
            const segs = parseMeaningPosSegments(cleanMeaningText(e.explain || '', e.entry));
            segs.forEach(s => {
                const pieces = s.meaning.split(/[；;]\s*/).map(p => p.trim()).filter(Boolean);
                pieces.forEach(p => {
                    chips.push({
                        id: `mchip_${++counter}`,
                        pos: s.pos || '',
                        text: p,
                        selected: true, // 默认全部勾选
                        isCustom: false
                    });
                });
            });
        });
    }

    const existingCustom = manualAddWordState.chips.filter(c => c.isCustom);
    manualAddWordState.chips = [...chips, ...existingCustom];

    renderManualWordChips();
}

function renderManualWordChips() {
    const candidatesWrap = document.getElementById('manual-word-youdao-candidates');
    const actions = document.getElementById('manual-word-chips-actions');
    if (!candidatesWrap) return;

    if (manualAddWordState.chips.length === 0) {
        candidatesWrap.innerHTML = `<div style="font-size: 0.82rem; color: var(--md-sys-color-outline); padding: 12px 0; text-align: center;">未查找到有道释义，请在下方直接输入自定义释义</div>`;
        if (actions) actions.style.display = 'none';
        return;
    }

    if (actions) actions.style.display = 'flex';

    const posGroups = {};
    manualAddWordState.chips.forEach(c => {
        const p = c.pos || '';
        if (!posGroups[p]) posGroups[p] = [];
        posGroups[p].push(c);
    });

    let html = '';
    Object.keys(posGroups).forEach(posKey => {
        const groupChips = posGroups[posKey];
        html += `
                    <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                        ${posKey ? `<span class="unified-source-badge pos" style="margin-top: 2px;">${escapeHtml(posKey)}</span>` : ''}
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; flex: 1;">
                            ${groupChips.map(c => `
                                <div class="selectable-meaning-chip ${c.selected ? 'selected' : ''}" onclick="toggleManualWordChip('${c.id}')" title="点击切换勾选">
                                    <span>${escapeHtml(c.text)}</span>
                                    ${c.selected ? '<span class="material-symbols-rounded" style="font-size:15px; margin-left:2px;">check</span>' : ''}
                                    ${c.isCustom ? `<span class="meaning-chip-remove" onclick="event.stopPropagation(); removeManualCustomChip('${c.id}')" title="删除">&times;</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
    });

    candidatesWrap.innerHTML = html;
}

function toggleManualWordChip(chipId) {
    const c = manualAddWordState.chips.find(item => item.id === chipId);
    if (c) {
        c.selected = !c.selected;
        renderManualWordChips();
    }
}

function selectAllManualWordChips(selectAll) {
    manualAddWordState.chips.forEach(c => c.selected = selectAll);
    renderManualWordChips();
}

function addManualCustomChip() {
    const posSelect = document.getElementById('input-manual-custom-pos');
    const textInput = document.getElementById('input-manual-custom-meaning');
    const rawText = (textInput ? textInput.value : '').trim();
    if (!rawText) {
        showToast('请输入释义内容');
        return;
    }

    const pos = posSelect ? posSelect.value : '';
    const pieces = rawText.split(/[；;]\s*/).map(p => p.trim()).filter(Boolean);
    pieces.forEach((p, idx) => {
        manualAddWordState.chips.push({
            id: `custom_mchip_${Date.now()}_${idx}`,
            pos: pos,
            text: p,
            selected: true,
            isCustom: true
        });
    });

    textInput.value = '';
    renderManualWordChips();
}

function removeManualCustomChip(chipId) {
    manualAddWordState.chips = manualAddWordState.chips.filter(c => c.id !== chipId);
    renderManualWordChips();
}

async function confirmManualAddWord() {
    const wordInput = document.getElementById('input-manual-word');
    const word = (wordInput ? wordInput.value : '').trim();
    if (!word) {
        showToast('请输入英文单词或词组！');
        if (wordInput) wordInput.focus();
        return;
    }

    const selectedChips = manualAddWordState.chips.filter(c => c.selected);
    const customInput = document.getElementById('input-manual-custom-meaning');
    const extraCustomText = (customInput ? customInput.value : '').trim();

    if (selectedChips.length === 0 && !extraCustomText) {
        showToast('请至少勾选一个释义或添加自定义释义！');
        return;
    }

    if (extraCustomText) {
        const posSelect = document.getElementById('input-manual-custom-pos');
        const pos = posSelect ? posSelect.value : '';
        extraCustomText.split(/[；;]\s*/).map(p => p.trim()).filter(Boolean).forEach((p, idx) => {
            selectedChips.push({
                id: `temp_${idx}`,
                pos: pos,
                text: p
            });
        });
    }

    const posGroups = {};
    selectedChips.forEach(c => {
        const p = c.pos || '';
        if (!posGroups[p]) posGroups[p] = [];
        if (!posGroups[p].includes(c.text)) {
            posGroups[p].push(c.text);
        }
    });

    const segStrings = [];
    Object.keys(posGroups).forEach(p => {
        const joined = posGroups[p].join('；');
        segStrings.push(p ? `${p} ${joined}` : joined);
    });
    const finalMeaning = segStrings.join(' ');

    const currentBook = (window.customBooks || []).find(b => b.id === settingsViewingBookId);
    if (!currentBook) {
        showToast('未找到目标词书！');
        return;
    }

    const newWordObj = {
        word: word,
        phone: '',
        meaning: finalMeaning,
        bookName: currentBook.name,
        bookId: currentBook.id
    };

    if (!Array.isArray(currentBook.words)) currentBook.words = [];
    const existingIdx = currentBook.words.findIndex(w => (w.word || w.name || '').toLowerCase() === word.toLowerCase());
    if (existingIdx !== -1) {
        currentBook.words[existingIdx].meaning = finalMeaning;
        currentBook.words[existingIdx].trans = [finalMeaning];
    } else {
        currentBook.words.push(newWordObj);
    }
    currentBook.count = currentBook.words.length;

    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(currentBook);
    }
    if (BookManager.bookCache) {
        BookManager.bookCache[currentBook.id] = currentBook.words;
    }

    closeManualAddWordModal();
    viewBookWordsInSettings(currentBook.id);
    showToast(`已成功添加「${word}」！`);
}

// ----------------- 搜索功能：有道词典与本地词书 -----------------
let hubSearchDebounceTimer = null;
let hubSearchBlurTimer = null;
let lastYoudaoSearchResult = null;

// ----------------- 搜索标签页体系 (Search Tabs) -----------------
let searchTabs = [];
let activeSearchTabId = null;

function initSearchTabs() {
    try {
        const savedTabs = localStorage.getItem('vocab_hub_search_tabs');
        const savedActiveId = localStorage.getItem('vocab_hub_search_active_tab');
        const wasSearchOpen = localStorage.getItem('vocab_hub_search_open') === '1';
        if (savedTabs) {
            const parsed = JSON.parse(savedTabs);
            if (Array.isArray(parsed) && parsed.length > 0) {
                searchTabs = parsed;
                activeSearchTabId = savedActiveId || parsed[0].id;
                const isSearchPageActive = (typeof currentView !== 'undefined' && currentView === 'view-search') || (document.getElementById('view-search') && document.getElementById('view-search').classList.contains('active'));
                if (wasSearchOpen && isSearchPageActive) {
                    const activeTab = searchTabs.find(t => t.id === activeSearchTabId) || searchTabs[0];
                    if (activeTab && activeTab.word) {
                        executeHubSearch(activeTab.word, false, false);
                    }
                }
            }
        }
    } catch (e) { }
}

function saveSearchTabs() {
    try {
        localStorage.setItem('vocab_hub_search_tabs', JSON.stringify(searchTabs));
        if (activeSearchTabId) {
            localStorage.setItem('vocab_hub_search_active_tab', activeSearchTabId);
        } else {
            localStorage.removeItem('vocab_hub_search_active_tab');
        }
    } catch (e) { }
}

function renderSearchTabsRow() {
    const tabsRows = [document.getElementById('search-page-tabs-row'), document.getElementById('hub-search-tabs-row')].filter(Boolean);
    if (tabsRows.length === 0) return;
    const cfg = getSearchConfig();
    if (!cfg.enableTabs || !searchTabs || searchTabs.length === 0) {
        tabsRows.forEach(el => {
            el.style.display = 'none';
            el.innerHTML = '';
        });
        return;
    }
    const tabsHtml = searchTabs.map(tab => {
        const isActive = tab.id === activeSearchTabId;
        return `
                    <div class="hub-search-tab ${isActive ? 'active' : ''}" onclick="switchSearchTab('${escapeHtml(tab.id)}')">
                        <span>${escapeHtml(tab.word)}</span>
                        <span class="hub-search-tab-close" onclick="closeSearchTab(event, '${escapeHtml(tab.id)}')" title="关闭标签页">&times;</span>
                    </div>
                `;
    }).join('');
    tabsRows.forEach(el => {
        el.style.display = 'flex';
        el.innerHTML = tabsHtml;
    });
}

function addOrActivateSearchTab(word) {
    if (!word) return;
    const cfg = getSearchConfig();
    if (!cfg.enableTabs) {
        searchTabs = [];
        activeSearchTabId = null;
        renderSearchTabsRow();
        return;
    }
    const clean = word.trim();
    const cleanLower = clean.toLowerCase();
    const existing = searchTabs.find(t => t.word.toLowerCase() === cleanLower);
    if (existing) {
        activeSearchTabId = existing.id;
    } else {
        const newTab = {
            id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            word: clean
        };
        searchTabs.push(newTab);
        activeSearchTabId = newTab.id;
    }
    saveSearchTabs();
    renderSearchTabsRow();
}

function switchSearchTab(tabId) {
    const tab = searchTabs.find(t => t.id === tabId);
    if (!tab) return;
    activeSearchTabId = tabId;
    saveSearchTabs();
    renderSearchTabsRow();
    executeHubSearch(tab.word, false, false);
}

function closeSearchTab(event, tabId) {
    if (event) event.stopPropagation();
    const idx = searchTabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    const isClosingActive = activeSearchTabId === tabId;
    searchTabs.splice(idx, 1);

    if (searchTabs.length === 0) {
        activeSearchTabId = null;
        saveSearchTabs();
        renderSearchTabsRow();
        closeInpageSearchResults();
        return;
    }

    if (isClosingActive) {
        const nextIdx = Math.min(idx, searchTabs.length - 1);
        const nextTab = searchTabs[nextIdx];
        activeSearchTabId = nextTab ? nextTab.id : null;
        saveSearchTabs();
        renderSearchTabsRow();
        if (nextTab) {
            executeHubSearch(nextTab.word, false, false);
        }
    } else {
        saveSearchTabs();
        renderSearchTabsRow();
    }
}

// ----------------- 词性规范化与智能解析 -----------------
function normalizePos(pos) {
    if (!pos) return '';
    const p = pos.toLowerCase().trim().replace(/[:：]$/, '');
    if (p === 'a.' || p === 'a') return 'adj.';
    if (p === 'ad.' || p === 'ad') return 'adv.';
    if (p === 'n.' || p === 'n') return 'n.';
    if (p === 'v.' || p === 'v') return 'v.';
    if (p === 'vt.' || p === 'vt') return 'vt.';
    if (p === 'vi.' || p === 'vi') return 'vi.';
    if (p === 'prep.' || p === 'prep') return 'prep.';
    if (p === 'conj.' || p === 'conj' || p === 'c.' || p === 'c') return 'conj.';
    if (p === 'pron.' || p === 'pron') return 'pron.';
    if (p === 'num.' || p === 'num') return 'num.';
    if (p === 'art.' || p === 'art') return 'art.';
    if (p === 'int.' || p === 'interj.' || p === 'int' || p === 'interj') return 'int.';
    if (p === 'adj.' || p === 'adj') return 'adj.';
    if (p === 'adv.' || p === 'adv') return 'adv.';
    return p.endsWith('.') ? p : p + '.';
}

function parseMeaningPosSegments(text) {
    if (!text) return [];
    // 去除末尾截断的省略号与悬挂标点
    const cleanText = String(text).trim().replace(/[;,，；\s]*\.\.\.$/, '').replace(/[;,，；\s]*…$/, '');
    const posPattern = '(?:adj|adv|prep|conj|pron|interj|abbr|art|num|aux|vi|vt|modal|ad|int|[avndc])';
    const posRegex = new RegExp('(?:^|[;\\s,，；])(?<pos>' + posPattern + '\\.(?:\\s*\\[[^\\]]+\\])?)(?:\\s*[:：])?', 'gi');
    const matches = [...cleanText.matchAll(posRegex)];
    if (matches.length === 0) {
        return [{ pos: '', meaning: cleanText }];
    }
    const parts = [];
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const rawPos = m.groups.pos;
        const normPos = normalizePos(rawPos);
        const start = m.index + m[0].length;
        const end = (i + 1 < matches.length) ? matches[i + 1].index : cleanText.length;
        const segMeaning = cleanText.substring(start, end).replace(/^[:：\\s；;,，]+|[:：\\s；;,，]+$/g, '').trim();
        if (segMeaning) {
            parts.push({ pos: normPos, meaning: segMeaning });
        }
    }
    return parts.length > 0 ? parts : [{ pos: '', meaning: cleanText }];
}

// ----------------- 释义词块拖拽与修改引擎 (按词性归类) -----------------
let isEditingMeanings = false;
let editingMeaningsState = {
    word: '',
    lanes: [] // Array of { id, title, type: 'youdao'|'book', bookId, chips: [{ id, pos, text }] }
};
let activeInlineAddLaneId = null;

function enterEditMeaningsMode() {
    if (!lastYoudaoSearchResult) return;
    if (typeof closeInlineAddToBookPanel === 'function') closeInlineAddToBookPanel();
    isEditingMeanings = true;
    activeInlineAddLaneId = null;
    const currentWord = lastYoudaoSearchResult.word;
    const cleanLower = currentWord.toLowerCase();

    // 提取本地词书中包含该词的释义并按词性切分为词块
    const allTargetBooks = getAllUniqueBooks();
    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
    } catch (e) { }

    const bookLanes = [];
    allTargetBooks.forEach(b => {
        const words = b.words || (BookManager.bookCache && BookManager.bookCache[b.id]) || [];
        const matched = words.find(w => w && (w.word || w.name || '').trim().toLowerCase() === cleanLower);
        if (matched) {
            const rawMeaning = extractWordMeaning(matched, overrides, b.id);
            const segs = parseMeaningPosSegments(rawMeaning);
            const bookChips = [];
            segs.forEach(seg => {
                const pieces = seg.meaning.split(/[；;]\s*/).map(s => s.trim()).filter(Boolean);
                pieces.forEach((p, idx) => {
                    bookChips.push({
                        id: `chip_${b.id}_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
                        pos: seg.pos || '',
                        text: p
                    });
                });
            });
            const bookName = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
            bookLanes.push({
                id: 'lane_book_' + b.id,
                title: `${bookName}`,
                type: 'book',
                bookId: b.id,
                bookName: bookName,
                chips: bookChips
            });
        }
    });

    // 若尚未收录于任何词书，默认追加自定义词书栏
    if (bookLanes.length === 0) {
        const customBooks = window.customBooks || [];
        const firstCustom = customBooks[0] || { id: 'custom_default', name: '生词本', words: [], count: 0 };
        if (!window.customBooks || !window.customBooks.some(b => b.id === firstCustom.id)) {
            if (!window.customBooks) window.customBooks = [];
            window.customBooks.push(firstCustom);
            if (typeof VocabOfflineDB !== 'undefined') {
                VocabOfflineDB.saveBook(firstCustom).catch(() => { });
            }
        }
        bookLanes.push({
            id: 'lane_book_' + firstCustom.id,
            title: `${firstCustom.name}`,
            type: 'book',
            bookId: firstCustom.id,
            bookName: firstCustom.name,
            chips: []
        });
    }

    // 提取有道词典参考词块并保留词性归类
    const youdaoChips = [];
    if (lastYoudaoSearchResult.entries && lastYoudaoSearchResult.entries.length > 0) {
        lastYoudaoSearchResult.entries.forEach(e => {
            const cleanExp = (e.explain || '').trim();
            if (cleanExp) {
                const segs = parseMeaningPosSegments(cleanExp);
                segs.forEach(seg => {
                    const pieces = seg.meaning.split(/[；;]\s*/).map(s => s.trim()).filter(Boolean);
                    pieces.forEach((p, idx) => {
                        youdaoChips.push({
                            id: `chip_yd_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                            pos: seg.pos || '',
                            text: p
                        });
                    });
                });
            }
        });
    }

    const lanes = [];
    if (youdaoChips.length > 0) {
        lanes.push({
            id: 'lane_youdao',
            title: '有道词典参考释义',
            type: 'youdao',
            bookId: null,
            chips: youdaoChips
        });
    }
    bookLanes.forEach(bl => lanes.push(bl));

    editingMeaningsState = {
        word: currentWord,
        lanes: lanes
    };

    renderEditMeaningsContainer();
}

function cancelEditMeanings() {
    isEditingMeanings = false;
    activeInlineAddLaneId = null;
    if (editingMeaningsState && editingMeaningsState.word) {
        executeHubSearch(editingMeaningsState.word, false, false);
    }
}

async function saveEditMeanings() {
    if (!editingMeaningsState || !editingMeaningsState.lanes) return;
    const word = editingMeaningsState.word;
    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
    } catch (e) { }

    for (const lane of editingMeaningsState.lanes) {
        if (lane.type === 'book' && lane.bookId) {
            // 按照词性分组整理保存为规范释义字符串
            const posGroups = {};
            lane.chips.forEach(c => {
                const p = c.pos || '';
                if (!posGroups[p]) posGroups[p] = [];
                if (c.text && c.text.trim()) posGroups[p].push(c.text.trim());
            });

            const segStrings = [];
            Object.keys(posGroups).forEach(p => {
                const texts = posGroups[p];
                if (texts.length > 0) {
                    if (p) {
                        segStrings.push(`${p} ${texts.join('；')}`);
                    } else {
                        segStrings.push(texts.join('；'));
                    }
                }
            });

            const newMeaning = segStrings.join(' ');
            const customBook = (window.customBooks || []).find(b => b.id === lane.bookId);

            if (customBook) {
                if (!Array.isArray(customBook.words)) customBook.words = [];
                const targetWord = customBook.words.find(w => (w.word || w.name || '').toLowerCase() === word.toLowerCase());
                if (targetWord) {
                    targetWord.meaning = newMeaning;
                    targetWord.trans = [newMeaning];
                    delete targetWord.meanings;
                    delete targetWord.senses;
                } else if (newMeaning) {
                    customBook.words.push({
                        word: word,
                        phone: '',
                        meaning: newMeaning,
                        trans: [newMeaning],
                        bookName: customBook.name,
                        bookId: customBook.id
                    });
                }
                customBook.count = customBook.words.length;
                if (typeof VocabOfflineDB !== 'undefined') {
                    await VocabOfflineDB.saveBook(customBook);
                }
                if (BookManager.bookCache) {
                    BookManager.bookCache[customBook.id] = customBook.words;
                }
                const overrideKey = `${lane.bookId}::${word.toLowerCase()}`;
                overrides[overrideKey] = newMeaning;
            } else {
                const overrideKey = `${lane.bookId}::${word.toLowerCase()}`;
                overrides[overrideKey] = newMeaning;
                if (BookManager.bookCache && BookManager.bookCache[lane.bookId]) {
                    const w = BookManager.bookCache[lane.bookId].find(item => (item.word || item.name || '').toLowerCase() === word.toLowerCase());
                    if (w) {
                        w.meaning = newMeaning;
                        w.trans = [newMeaning];
                        delete w.meanings;
                        delete w.senses;
                    }
                }
            }
        }
    }

    localStorage.setItem('vocab_word_meaning_overrides', JSON.stringify(overrides));
    isEditingMeanings = false;
    activeInlineAddLaneId = null;
    showToast('已保存释义修改！');
    executeHubSearch(word, false, false);
}

// ----------------- 修改释义视图渲染 (去嵌套、虚线框) -----------------
function renderEditMeaningsContainer() {
    const container = document.getElementById('search-explains-dynamic-container');
    const actionsContainer = document.getElementById('search-explains-actions-container');
    if (!container) return;

    if (actionsContainer) {
        actionsContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; width: 100%; flex-wrap: wrap;">
                        <span style="font-size: 0.82rem; color: var(--md-sys-color-outline); margin-right: auto;">
                            拖拽词块编辑释义
                        </span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" class="btn btn-tonal btn-sm" onclick="cancelEditMeanings()">
                                <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
                                <span>取消</span>
                            </button>
                            <button type="button" class="btn btn-filled btn-sm" onclick="saveEditMeanings()">
                                <span class="material-symbols-rounded" style="font-size: 16px;">check</span>
                                <span>保存</span>
                            </button>
                        </div>
                    </div>
                `;
    }

    const posSelectOptions = [
        { value: 'adj.', label: 'adj. 形容词' },
        { value: 'adv.', label: 'adv. 副词' },
        { value: 'n.', label: 'n. 名词' },
        { value: 'v.', label: 'v. 动词' },
        { value: 'vt.', label: 'vt. 及物动词' },
        { value: 'vi.', label: 'vi. 不及物动词' },
        { value: 'prep.', label: 'prep. 介词' },
        { value: 'conj.', label: 'conj. 连词' },
        { value: 'pron.', label: 'pron. 代词' },
        { value: 'num.', label: 'num. 数词' },
        { value: 'art.', label: 'art. 冠词' },
        { value: 'int.', label: 'int. 感叹词' },
        { value: '', label: '通用 / 无词性' }
    ];

    container.innerHTML = editingMeaningsState.lanes.map(lane => {
        const isYoudao = lane.type === 'youdao';
        const posGroups = {};
        lane.chips.forEach(c => {
            const p = c.pos || '';
            if (!posGroups[p]) posGroups[p] = [];
            posGroups[p].push(c);
        });

        const groupKeys = Object.keys(posGroups);
        if (groupKeys.length === 0) groupKeys.push('');

        const isAddingHere = activeInlineAddLaneId === lane.id;

        return `
                    <div class="unified-explain-card" style="margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <span class="unified-source-badge ${isYoudao ? 'youdao' : 'book'}">${escapeHtml(lane.title)}</span>
                            ${!isYoudao ? `
                                <button type="button" class="add-chip-btn" onclick="toggleInlineAddChipForm('${escapeHtml(lane.id)}')">
                                    <span class="material-symbols-rounded" style="font-size: 15px;">add</span>
                                    <span>添加词块</span>
                                </button>
                            ` : ''}
                        </div>

                        ${isAddingHere ? `
                            <div class="inline-add-chip-form" style="margin-bottom: 10px;">
                                ${renderMd3SelectHtml({
            id: 'inline-add-pos-' + lane.id,
            options: posSelectOptions,
            defaultValue: 'adj.'
        })}
                                <input type="text" id="inline-add-text-${escapeHtml(lane.id)}" class="input-field" placeholder="输入释义内容..." style="height:36px; font-size:0.86rem; border-radius:8px; flex:1; min-width:0;" onkeydown="if(event.key==='Enter') confirmInlineAddChip('${escapeHtml(lane.id)}')">
                                <button type="button" class="btn btn-filled btn-sm" style="white-space:nowrap; height:36px; flex-shrink:0;" onclick="confirmInlineAddChip('${escapeHtml(lane.id)}')">添加</button>
                                <button type="button" class="btn btn-tonal btn-sm" style="white-space:nowrap; height:36px; flex-shrink:0;" onclick="cancelInlineAddChip()">取消</button>
                            </div>
                        ` : ''}

                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${groupKeys.map(p => {
            const chipsInGroup = posGroups[p] || [];
            return `
                                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                                        ${p ? `<span class="unified-source-badge pos" style="margin-top: 5px;">${escapeHtml(p)}</span>` : ''}
                                        <div class="droppable-pos-dashed-box"
                                            ${!isYoudao ? `
                                                ondragover="handleGroupDragOver(event)"
                                                ondragleave="handleGroupDragLeave(event)"
                                                ondrop="handleGroupDrop(event, '${escapeHtml(lane.id)}', '${escapeHtml(p)}')"
                                            ` : ''}>
                                            ${chipsInGroup.length === 0 ? `
                                                <span style="color:var(--md-sys-color-outline); font-size:0.8rem; padding:4px;">${isYoudao ? '无释义词块' : '可拖入词块至此'}</span>
                                            ` : chipsInGroup.map(chip => `
                                                <div class="meaning-chip" draggable="true"
                                                    ondragstart="handleChipDragStart(event, '${escapeHtml(lane.id)}', '${escapeHtml(chip.id)}', '${escapeHtml(chip.text)}', '${escapeHtml(chip.pos || '')}')"
                                                    ondragend="handleChipDragEnd(event)">
                                                    <span>${escapeHtml(chip.text)}</span>
                                                    ${!isYoudao ? `<span class="meaning-chip-remove" onclick="removeMeaningChip('${escapeHtml(lane.id)}', '${escapeHtml(chip.id)}')" title="删除词块">&times;</span>` : ''}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `;
    }).join('');
}

let draggedChipData = null;

function handleChipDragStart(event, sourceLaneId, chipId, text, pos) {
    draggedChipData = { sourceLaneId, chipId, text, pos };
    if (event.dataTransfer) {
        event.dataTransfer.setData('application/json', JSON.stringify(draggedChipData));
        event.dataTransfer.effectAllowed = 'copyMove';
    }
    if (event.target && event.target.classList) {
        event.target.classList.add('dragging');
    }
}

function handleChipDragEnd(event) {
    if (event.target && event.target.classList) {
        event.target.classList.remove('dragging');
    }
    document.querySelectorAll('.droppable-pos-dashed-box').forEach(el => el.classList.remove('drag-over-group'));
    draggedChipData = null;
}

function handleGroupDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('drag-over-group');
}

function handleGroupDragLeave(event) {
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over-group');
}

function handleGroupDrop(event, targetLaneId, targetPos) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over-group');
    executeChipDrop(targetLaneId, targetPos);
}

function executeChipDrop(targetLaneId, targetPos) {
    let data = draggedChipData;
    if (!data || !data.sourceLaneId || !data.text) return;

    const sourceLane = editingMeaningsState.lanes.find(l => l.id === data.sourceLaneId);
    const targetLane = editingMeaningsState.lanes.find(l => l.id === targetLaneId);
    if (!sourceLane || !targetLane) return;
    if (targetLane.type === 'youdao') return; // 严禁将词块拖入/复制回有道参考栏！

    const finalPos = targetPos !== null && targetPos !== undefined ? targetPos : (data.pos || '');

    // 查重：防止目标词书同一词性下重复添加相同文字
    const alreadyExists = targetLane.chips.some(c => (c.pos || '') === finalPos && c.text.trim().toLowerCase() === data.text.trim().toLowerCase());
    if (alreadyExists && sourceLane.id !== targetLane.id) {
        showToast('该释义已存在于目标词书中');
        return;
    }

    // 如果源自普通本地词书，则移出源位置
    if (sourceLane.type === 'book') {
        const sIdx = sourceLane.chips.findIndex(c => c.id === data.chipId);
        if (sIdx !== -1) {
            sourceLane.chips.splice(sIdx, 1);
        }
    }

    // 同词书内换词性时，如果已存在相同词性内容则不重复追加
    if (sourceLane.id === targetLane.id && alreadyExists) {
        renderEditMeaningsContainer();
        return;
    }

    targetLane.chips.push({
        id: 'chip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        pos: finalPos,
        text: data.text.trim()
    });

    renderEditMeaningsContainer();
}

function removeMeaningChip(laneId, chipId) {
    const lane = editingMeaningsState.lanes.find(l => l.id === laneId);
    if (!lane) return;
    const cIdx = lane.chips.findIndex(c => c.id === chipId);
    if (cIdx !== -1) {
        lane.chips.splice(cIdx, 1);
        renderEditMeaningsContainer();
    }
}

function toggleInlineAddChipForm(laneId) {
    if (activeInlineAddLaneId === laneId) {
        activeInlineAddLaneId = null;
    } else {
        activeInlineAddLaneId = laneId;
    }
    renderEditMeaningsContainer();
    if (activeInlineAddLaneId) {
        const inputEl = document.getElementById('inline-add-text-' + laneId);
        if (inputEl) setTimeout(() => inputEl.focus(), 80);
    }
}

function cancelInlineAddChip() {
    activeInlineAddLaneId = null;
    renderEditMeaningsContainer();
}

function confirmInlineAddChip(laneId) {
    const lane = editingMeaningsState.lanes.find(l => l.id === laneId);
    if (!lane) return;
    const posInput = document.getElementById('inline-add-pos-' + laneId + '-input') || document.getElementById('inline-add-pos-' + laneId);
    const textInput = document.getElementById('inline-add-text-' + laneId);
    const rawText = (textInput ? textInput.value : '').trim();
    if (!rawText) {
        showToast('请输入释义内容！');
        return;
    }

    let pos = posInput ? posInput.value : '';
    const parsedSegs = parseMeaningPosSegments(rawText);
    if (parsedSegs.length > 0 && parsedSegs[0].pos) {
        pos = parsedSegs[0].pos;
    }

    const cleanContent = parsedSegs.length > 0 ? parsedSegs[0].meaning : rawText;

    lane.chips.push({
        id: 'chip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        pos: pos,
        text: cleanContent
    });

    activeInlineAddLaneId = null;
    renderEditMeaningsContainer();
}

function getSearchConfig() {
    const key = currentUser ? `vocab_search_config_${currentUser}` : 'vocab_search_config_guest';
    let cfg = {
        enableTabs: true,
        enablePhrases: true,
        enableRelatedLinks: true
    };
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            cfg = { ...cfg, ...JSON.parse(saved) };
        }
    } catch (e) { }
    return cfg;
}

function saveSearchConfig(cfg) {
    const key = currentUser ? `vocab_search_config_${currentUser}` : 'vocab_search_config_guest';
    try {
        localStorage.setItem(key, JSON.stringify(cfg));
    } catch (e) { }
}

function openSearchSettingsModal() {
    const cfg = getSearchConfig();
    const swTabs = document.getElementById('switch-search-enable-tabs');
    const swPhrases = document.getElementById('switch-search-enable-phrases');
    const swRelated = document.getElementById('switch-search-enable-related');
    const swKeyboard = document.getElementById('switch-search-enable-keyboard');
    if (swTabs) swTabs.checked = cfg.enableTabs !== false;
    if (swPhrases) swPhrases.checked = cfg.enablePhrases !== false;
    if (swRelated) swRelated.checked = cfg.enableRelatedLinks !== false;
    if (swKeyboard) swKeyboard.checked = !!cfg.enableVirtualKeyboard;
    const modal = document.getElementById('modal-search-settings');
    if (modal) modal.classList.add('active');
}

function closeSearchSettingsModal() {
    const modal = document.getElementById('modal-search-settings');
    if (modal) modal.classList.remove('active');
}

function updateSearchSetting(key, val) {
    const cfg = getSearchConfig();
    cfg[key] = val;
    saveSearchConfig(cfg);

    const tabsRow = document.getElementById('search-page-tabs-row');
    if (tabsRow) {
        tabsRow.style.display = cfg.enableTabs ? (searchTabs && searchTabs.length > 0 ? 'flex' : 'none') : 'none';
    }
    const phrasesBlock = document.getElementById('search-phrases-block');
    if (phrasesBlock) {
        phrasesBlock.style.display = cfg.enablePhrases ? 'block' : 'none';
    }
    const relatedBlock = document.getElementById('search-related-block');
    if (relatedBlock) {
        relatedBlock.style.display = cfg.enableRelatedLinks ? 'block' : 'none';
    }
}

const SEARCH_HISTORY_KEY = 'vocab_search_history';

function getSearchHistory() {
    try {
        return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function addSearchHistoryItem(word, meaning = '') {
    if (!word || !word.trim()) return;
    const cleanWord = word.trim();
    let history = getSearchHistory();
    history = history.filter(h => (typeof h === 'string' ? h : h.word).toLowerCase() !== cleanWord.toLowerCase());
    history.unshift({
        word: cleanWord,
        meaning: (meaning || '').trim(),
        time: Date.now()
    });
    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory();
}

function removeSearchHistoryItem(word, e) {
    if (e) e.stopPropagation();
    let history = getSearchHistory();
    history = history.filter(h => (typeof h === 'string' ? h : h.word).toLowerCase() !== word.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    renderSearchHistory();
}

function clearSearchHistory() {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    renderSearchHistory();
}

function renderSearchHistory() {
    const container = document.getElementById('search-history-container');
    if (!container) return;
    const history = getSearchHistory();
    if (history.length === 0) {
        container.innerHTML = `
                    <div class="search-history-section">
                        <div class="search-history-header">
                            <span class="search-history-title">搜索历史</span>
                        </div>
                        <div style="font-size:0.88rem; color:var(--md-sys-color-outline); padding:20px 0; text-align:center;">暂无搜索历史</div>
                    </div>
                `;
        return;
    }

    const itemsHtml = history.map(item => {
        const w = typeof item === 'string' ? item : item.word;
        const m = typeof item === 'object' && item.meaning ? item.meaning : '';
        const tag = (w.includes(' ') || w.includes('-')) ? '词组' : '中英';
        return `
                    <div class="search-history-item" onclick="executeHubSearch('${escapeHtml(w)}', true, true)">
                        <span class="search-history-tag">${tag}</span>
                        <span class="search-history-word">${escapeHtml(w)}</span>
                        ${m ? `<span class="search-history-meaning" title="${escapeHtml(m)}">${escapeHtml(m)}</span>` : ''}
                        <button type="button" class="search-history-del-one" onclick="removeSearchHistoryItem('${escapeHtml(w)}', event)" title="删除此条">
                            <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                        </button>
                    </div>
                `;
    }).join('');

    container.innerHTML = `
                <div class="search-history-section">
                    <div class="search-history-header">
                        <span class="search-history-title">搜索历史</span>
                        <button type="button" class="search-history-clear-btn" onclick="clearSearchHistory()" title="清空所有历史">
                            <span class="material-symbols-rounded" style="font-size:20px;">delete_outline</span>
                        </button>
                    </div>
                    <div class="search-history-list">
                        ${itemsHtml}
                    </div>
                </div>
            `;
}

function showSearchHistoryView() {
    renderSearchHistory();
    const historyContainer = document.getElementById('search-history-container');
    const resultsContainer = document.getElementById('search-page-results');
    if (historyContainer) historyContainer.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'none';
}

function focusSearchFromHub() {
    switchView('view-search');
    showSearchHistoryView();
    setTimeout(() => {
        const inp = document.getElementById('search-page-input');
        if (inp) inp.focus();
    }, 50);
}

let searchPreviousView = null;
let searchPreviousSettingsBookId = null;

function jumpToSearch(word) {
    if (!word) return;
    searchPreviousView = (typeof currentView !== 'undefined' && currentView) ? currentView : 'view-hub';
    if (searchPreviousView === 'view-settings') {
        searchPreviousSettingsBookId = (typeof settingsViewingBookId !== 'undefined') ? settingsViewingBookId : null;
    } else {
        searchPreviousSettingsBookId = null;
    }
    executeHubSearch(word, true, true);
}

function jumpToSearchFromSingle() {
    if (!singleState || !singleState.answered) {
        showToast('答题后方可跳转查词');
        return;
    }
    const q = (singleState.pool && singleState.pool[singleState.currentIdx]) ? singleState.pool[singleState.currentIdx] : null;
    if (q && q.word) {
        jumpToSearch(q.word);
    }
}

function exitSearchPage() {
    const suggs = document.getElementById('search-page-suggestions');
    if (suggs) suggs.style.display = 'none';
    const targetView = searchPreviousView || 'view-hub';
    const targetBookId = searchPreviousSettingsBookId;
    searchPreviousView = null;
    searchPreviousSettingsBookId = null;
    switchView(targetView);
    if (targetView === 'view-settings' && targetBookId) {
        setTimeout(() => viewBookWordsInSettings(targetBookId), 50);
    }
}

function handleSearchPageInput(query) {
    const clearBtn = document.getElementById('search-page-clear-btn');
    const suggs = document.getElementById('search-page-suggestions');
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

    clearTimeout(hubSearchDebounceTimer);
    if (!query || !query.trim()) {
        if (suggs) suggs.style.display = 'none';
        showSearchHistoryView();
        return;
    }

    hubSearchDebounceTimer = setTimeout(() => {
        renderHubSearchSuggestions(query.trim());
    }, 180);
}

function handleSearchPageEnter(inputEl) {
    if (!inputEl) return;
    clearTimeout(hubSearchDebounceTimer);
    const suggs = document.getElementById('search-page-suggestions');
    if (suggs) suggs.style.display = 'none';
    inputEl.blur();
    executeHubSearch(inputEl.value, true, true);
}

function clearSearchPageInput(e) {
    if (e) e.stopPropagation();
    const inp = document.getElementById('search-page-input');
    const clearBtn = document.getElementById('search-page-clear-btn');
    const suggs = document.getElementById('search-page-suggestions');
    if (inp) {
        inp.value = '';
        inp.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
    if (suggs) suggs.style.display = 'none';
    showSearchHistoryView();
}

function focusHubSearchInput() {
    const inp = document.getElementById('hub-search-input');
    if (inp) inp.focus();
}

function handleHubSearchFocus() {
    const inp = document.getElementById('hub-search-input');
    if (inp && inp.value && inp.value.trim()) {
        renderHubSearchSuggestions(inp.value.trim());
    }
}

function handleHubSearchBlur() {
    clearTimeout(hubSearchBlurTimer);
    hubSearchBlurTimer = setTimeout(() => {
        const suggs = document.getElementById('hub-search-suggestions');
        if (suggs) suggs.style.display = 'none';
    }, 220);
}

function clearHubSearch(e) {
    if (e) e.stopPropagation();
    clearTimeout(hubSearchBlurTimer);
    const inp = document.getElementById('hub-search-input');
    const clearBtn = document.getElementById('hub-search-clear-btn');
    const suggs = document.getElementById('hub-search-suggestions');
    if (inp) {
        inp.value = '';
        inp.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
    if (suggs) suggs.style.display = 'none';
}

function handleHubSearchInput(query) {
    const clearBtn = document.getElementById('hub-search-clear-btn');
    const suggs = document.getElementById('hub-search-suggestions');
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

    clearTimeout(hubSearchDebounceTimer);
    if (!query || !query.trim()) {
        if (suggs) suggs.style.display = 'none';
        return;
    }

    hubSearchDebounceTimer = setTimeout(() => {
        renderHubSearchSuggestions(query.trim());
    }, 180);
}

function handleHubSearchEnter(inputEl) {
    if (!inputEl) return;
    clearTimeout(hubSearchDebounceTimer);
    const suggs = document.getElementById('hub-search-suggestions');
    if (suggs) suggs.style.display = 'none';
    inputEl.blur();
    executeHubSearch(inputEl.value, true, true);
}

function handleHubSearchModalInput(val) {
    handleHubSearchInput(val);
}

function openHubSearchModal() {
    const modal = document.getElementById('hub-search-modal');
    if (modal) modal.classList.add('active');
    const inp = document.getElementById('modal-search-input');
    if (inp) setTimeout(() => inp.focus(), 150);
}

function closeHubSearchModal() {
    const modal = document.getElementById('hub-search-modal');
    if (modal) modal.classList.remove('active');
}

document.addEventListener('pointerdown', (e) => {
    const wrapHub = document.getElementById('hub-search-wrapper');
    const suggsHub = document.getElementById('hub-search-suggestions');
    if (wrapHub && !wrapHub.contains(e.target)) {
        if (suggsHub) suggsHub.style.display = 'none';
    }

    const wrapPage = document.getElementById('search-page-wrapper');
    const suggsPage = document.getElementById('search-page-suggestions');
    if (wrapPage && !wrapPage.contains(e.target)) {
        if (suggsPage) suggsPage.style.display = 'none';
    }
});

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractWordMeaning(w, overrides = {}, bookId = '') {
    if (!w) return '';
    const wordRaw = (w.word || w.name || '').trim().toLowerCase();
    const overrideKey = bookId ? `${bookId}::${wordRaw}` : '';
    if (overrideKey && overrides[overrideKey]) {
        return overrides[overrideKey];
    }
    if (w.meaning && typeof w.meaning === 'string' && w.meaning.trim()) {
        return w.meaning.trim();
    }
    if (Array.isArray(w.meanings) && w.meanings.length > 0) {
        return w.meanings.map(m => (m.pos ? m.pos + ' ' : '') + (m.meaning || '')).join('； ').trim();
    }
    if (Array.isArray(w.trans) && w.trans.length > 0) {
        return w.trans.join('； ').trim();
    }
    if (typeof w.trans === 'string' && w.trans.trim()) {
        return w.trans.trim();
    }
    if (Array.isArray(w.senses) && w.senses.length > 0) {
        return w.senses.map(s => (s.part_of_speech ? s.part_of_speech + ' ' : '') + (s.meaning || '')).join('； ').trim();
    }
    return '';
}

function fetchYoudaoSuggestJsonp(query, num = 8) {
    return new Promise((resolve) => {
        if (!query) return resolve(null);
        const cbName = 'youdao_suggest_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const script = document.createElement('script');
        let timer = null;

        window[cbName] = function (data) {
            cleanup();
            if (data && data.data && Array.isArray(data.data.entries)) {
                resolve(data.data);
            } else {
                resolve(null);
            }
        };

        function cleanup() {
            if (timer) clearTimeout(timer);
            delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        script.onerror = function () {
            cleanup();
            resolve(null);
        };

        timer = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 3500);

        script.src = `https://dict.youdao.com/suggest?q=${encodeURIComponent(query)}&num=${num}&doctype=json&callback=${cbName}`;
        document.head.appendChild(script);
    });
}

async function searchYoudaoSuggest(query) {
    if (!query) return null;
    const clean = query.trim();

    // 优先通过 Cloudflare Worker 代理拉取完整非截断释义
    try {
        const res = await fetch(`/api/youdao?q=${encodeURIComponent(clean)}&num=8&doctype=json`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data.entries)) {
                return data.data;
            }
        }
    } catch (e) { }

    // 备用通过 JSONP 直连有道接口
    try {
        const jsonpData = await fetchYoudaoSuggestJsonp(clean, 8);
        if (jsonpData && jsonpData.entries && jsonpData.entries.length > 0) {
            return jsonpData;
        }
    } catch (e) { }

    return null;
}

function searchLocalBooks(query) {
    if (!query) return [];
    const clean = query.trim().toLowerCase();
    const allTargetBooks = getAllUniqueBooks();
    const results = [];

    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
    } catch (e) { }

    const seenBookWord = new Set();

    allTargetBooks.forEach(b => {
        const bookName = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
        const words = b.words || (BookManager.bookCache && BookManager.bookCache[b.id]) || [];
        words.forEach(w => {
            if (!w) return;
            const wordRaw = (w.word || w.name || '').trim();
            if (!wordRaw) return;
            const wordLower = wordRaw.toLowerCase();
            const meaning = extractWordMeaning(w, overrides, b.id);
            const meaningLower = String(meaning).toLowerCase();

            if (wordLower === clean || wordLower.includes(clean) || meaningLower.includes(clean)) {
                const pairKey = `${b.id}::${wordLower}`;
                if (!seenBookWord.has(pairKey)) {
                    seenBookWord.add(pairKey);
                    results.push({
                        bookId: b.id,
                        bookName: bookName,
                        isCustom: String(b.id).startsWith('custom_') || (window.customBooks && window.customBooks.some(cb => cb.id === b.id)),
                        word: wordRaw,
                        phone: w.phone || w.pinyin || '',
                        meaning: meaning,
                        exact: wordLower === clean || meaningLower === clean
                    });
                }
            }
        });
    });

    results.sort((a, b) => {
        if (a.exact && !b.exact) return -1;
        if (!a.exact && b.exact) return 1;
        return 0;
    });

    return results.slice(0, 50);
}

function findPhrasesContainingWord(searchWord) {
    if (!searchWord) return [];
    const cleanWord = searchWord.trim().toLowerCase();
    const wholeWordRegex = new RegExp('(?:^|[;\\s,，；.。!?;:\'\"\\(\\[{])' + escapeRegExp(cleanWord) + '(?:$|[;\\s,，；.。!?;:\'\"\\)\\]}])', 'i');

    const allTargetBooks = getAllUniqueBooks();
    const phrases = [];
    const seenPhraseKeys = new Set();

    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
    } catch (e) { }

    allTargetBooks.forEach(b => {
        const bookName = (b.rawName || b.name || '').replace(/^[📂📁\s]+/, '');
        const words = b.words || (BookManager.bookCache && BookManager.bookCache[b.id]) || [];
        words.forEach(w => {
            if (!w) return;
            const wName = (w.word || w.name || '').trim();
            if (!wName) return;
            const isMultiWord = wName.includes(' ') || wName.includes('-');
            if (!isMultiWord) return;

            if (wholeWordRegex.test(wName)) {
                const uniqueKey = wName.toLowerCase() + '_' + b.id;
                if (!seenPhraseKeys.has(uniqueKey)) {
                    seenPhraseKeys.add(uniqueKey);
                    const meaning = extractWordMeaning(w, overrides, b.id);
                    phrases.push({
                        phrase: wName,
                        meaning: meaning,
                        bookId: b.id,
                        bookName: bookName
                    });
                }
            }
        });
    });

    return phrases.slice(0, 30);
}

function highlightPhraseKeyword(phrase, keyword) {
    if (!phrase) return '';
    if (!keyword || !keyword.trim()) return escapeHtml(phrase);
    const escapedPhrase = escapeHtml(phrase);
    const escapedKw = escapeHtml(keyword.trim());
    const regex = new RegExp('(' + escapeRegExp(escapedKw) + ')', 'gi');
    return escapedPhrase.replace(regex, '<span class="phrase-keyword-highlight">$1</span>');
}

function findRelatedWords(searchWord, ydEntries = []) {
    if (!searchWord) return [];
    const cleanWord = searchWord.trim().toLowerCase();
    const related = [];
    const seenWords = new Set();

    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
    } catch (e) { }

    const scanWord = (w, bookId = '') => {
        if (!w) return;
        const wName = (w.word || w.name || '').trim();
        if (!wName) return;
        const wLower = wName.toLowerCase();
        if (wLower === cleanWord) return;
        if (wName.includes(' ') || wName.includes('-')) return;

        const isVariant = (wLower.startsWith(cleanWord) || cleanWord.startsWith(wLower)) && Math.abs(wLower.length - cleanWord.length) <= 6;
        if (isVariant && !seenWords.has(wLower)) {
            seenWords.add(wLower);
            const meaning = extractWordMeaning(w, overrides, bookId);
            related.push({
                word: wName,
                meaning: meaning
            });
        }
    };

    // 1. 检索默认词书
    if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS)) {
        DEFAULT_WORDS.forEach(w => scanWord(w, 'builtin_default'));
    }

    // 2. 检索所有去重词书 (含高考3500完整词库与自定义词书)
    const booksToScan = getAllUniqueBooks();
    booksToScan.forEach(b => {
        if (!b) return;
        const words = b.words || (BookManager.bookCache && BookManager.bookCache[b.id]) || [];
        words.forEach(w => scanWord(w, b.id));
    });

    // 3. 有道搜索联想补充 (词根衍生、变化形式)
    if (Array.isArray(ydEntries)) {
        ydEntries.forEach(e => {
            if (!e || !e.entry) return;
            const eName = e.entry.trim();
            const eLower = eName.toLowerCase();
            if (eLower === cleanWord) return;
            if (eName.includes(' ') || eName.includes('-')) return;

            const isVariant = (eLower.startsWith(cleanWord) || cleanWord.startsWith(eLower)) && Math.abs(eLower.length - cleanWord.length) <= 7;
            if (isVariant && !seenWords.has(eLower)) {
                seenWords.add(eLower);
                related.push({
                    word: eName,
                    meaning: cleanMeaningText(e.explain || '', eName)
                });
            }
        });
    }

    return related.slice(0, 16);
}

async function renderHubSearchSuggestions(query) {
    const suggsHub = document.getElementById('hub-search-suggestions');
    const suggsPage = document.getElementById('search-page-suggestions');
    const inpPage = document.getElementById('search-page-input');
    const inpHub = document.getElementById('hub-search-input');
    const isSearchActive = (typeof currentView !== 'undefined' && currentView === 'view-search') || (document.getElementById('view-search') && document.getElementById('view-search').classList.contains('active'));
    const activeSuggs = (document.activeElement === inpPage || isSearchActive) ? suggsPage : suggsHub;
    if (!activeSuggs) return;
    const clean = query.trim();
    if (!clean) {
        if (suggsHub) suggsHub.style.display = 'none';
        if (suggsPage) suggsPage.style.display = 'none';
        return;
    }

    const [ydData, localMatches, localPhrases] = await Promise.all([
        fetchYoudaoSuggestJsonp(clean, 7).catch(() => null),
        Promise.resolve(searchLocalBooks(clean).slice(0, 8)),
        Promise.resolve(findPhrasesContainingWord(clean).slice(0, 8))
    ]);

    const candidateItems = [];
    const seenEntries = new Set();

    if (ydData && Array.isArray(ydData.entries)) {
        ydData.entries.forEach(e => {
            if (e && e.entry && !seenEntries.has(e.entry.toLowerCase())) {
                seenEntries.add(e.entry.toLowerCase());
                candidateItems.push({
                    word: e.entry,
                    explain: e.explain || '',
                    bookName: null
                });
            }
        });
    }

    localMatches.forEach(m => {
        if (m && m.word && !seenEntries.has(m.word.toLowerCase())) {
            seenEntries.add(m.word.toLowerCase());
            candidateItems.push({
                word: m.word,
                explain: m.meaning || '',
                bookName: m.bookName
            });
        }
    });

    localPhrases.forEach(p => {
        if (p && p.phrase && !seenEntries.has(p.phrase.toLowerCase())) {
            seenEntries.add(p.phrase.toLowerCase());
            candidateItems.push({
                word: p.phrase,
                explain: p.meaning || '',
                bookName: p.bookName
            });
        }
    });

    if (candidateItems.length === 0) {
        const emptyHtml = `
                    <div class="hub-search-suggestion-item" onclick="executeHubSearch('${escapeHtml(clean)}')">
                        <span class="material-symbols-rounded suggestion-icon">search</span>
                        <span class="suggestion-word">${escapeHtml(clean)}</span>
                        <span class="suggestion-explain">按回车直接搜索有道词典与词库</span>
                    </div>
                `;
        activeSuggs.innerHTML = emptyHtml;
        activeSuggs.style.display = 'block';
        return;
    }

    const suggHtml = candidateItems.slice(0, 9).map(it => `
                <div class="hub-search-suggestion-item" onclick="executeHubSearch('${escapeHtml(it.word)}')">
                    <span class="material-symbols-rounded suggestion-icon">search</span>
                    <span class="suggestion-word">${escapeHtml(it.word)}</span>
                    <span class="suggestion-explain" title="${escapeHtml(it.explain)}">${escapeHtml(it.explain)}</span>
                    ${it.bookName ? `<span class="suggestion-badge" title="收录于《${escapeHtml(it.bookName)}》">《${escapeHtml(it.bookName)}》</span>` : ''}
                </div>
            `).join('');
    activeSuggs.innerHTML = suggHtml;
    activeSuggs.style.display = 'block';
}

function playWordVoice(word, type = 2) {
    if (!word) return;
    try {
        const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`);
        audio.play().catch(() => {
            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance(word);
                u.lang = (type === 1) ? 'en-GB' : 'en-US';
                window.speechSynthesis.speak(u);
            }
        });
    } catch (err) {
        if (window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(word);
            u.lang = (type === 1) ? 'en-GB' : 'en-US';
            window.speechSynthesis.speak(u);
        }
    }
}

// ----------------- 释义清洗与精准过滤 -----------------
function cleanMeaningText(meaning, word) {
    if (!meaning) return '';
    const parts = meaning.split(/[；;]\s*/);
    const cleanedParts = [];
    const lowerWord = (word || '').toLowerCase();
    let justSawPersonName = false;

    for (let part of parts) {
        let p = part.trim().replace(/[.\s…]+$/, '');
        if (!p) continue;
        // 过滤人名条目
        if (/人名/.test(p)) {
            justSawPersonName = true;
            continue;
        }
        if (justSawPersonName) {
            if (/^[（\(][^）\)]+[）\)]\s*[\u4e00-\u9fa5]+$/.test(p)) {
                continue;
            }
            justSawPersonName = false;
        }
        // 过滤特殊专业代码/缩写碎片（如字母a搜索时混入的干线公路、最高收入群体、第一已知量、表层土壤等）
        if (lowerWord === 'a' && /^(A音|A类|干线公路|最高收入群体|第一列|第一已知量|表层土壤|A型)$/i.test(p)) {
            continue;
        }
        // 过滤天气短语释义（如风词条下的短语释义）
        if (lowerWord === 'wind' && /^(有风的日子|大风天)$/.test(p)) {
            continue;
        }
        // 过滤无意义省略号
        if (p === '...' || p === '…') continue;

        cleanedParts.push(p);
    }
    return cleanedParts.join('；');
}

function toggleSectionCollapse(contentId, headerEl) {
    const content = document.getElementById(contentId);
    const chevron = headerEl ? headerEl.querySelector('.search-section-chevron') : null;
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? '' : 'none';
    if (chevron) {
        chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
}

async function executeHubSearch(query, shouldUpdateTab = true, shouldScroll = true) {
    if (!query || !query.trim()) return;
    const clean = query.trim();
    const cleanLower = clean.toLowerCase();
    const isQueryPhrase = clean.includes(' ') || clean.includes('-');

    const isSearchPageActive = (typeof currentView !== 'undefined' && currentView === 'view-search') || (document.getElementById('view-search') && document.getElementById('view-search').classList.contains('active'));
    if (!isSearchPageActive) {
        switchView('view-search');
    }

    clearTimeout(hubSearchDebounceTimer);
    const inpPage = document.getElementById('search-page-input');
    const clearBtnPage = document.getElementById('search-page-clear-btn');
    const suggsPage = document.getElementById('search-page-suggestions');
    const inpageResults = document.getElementById('search-page-results') || document.getElementById('hub-search-inpage-results');

    if (inpPage) inpPage.value = clean;
    if (clearBtnPage) clearBtnPage.style.display = 'flex';
    if (suggsPage) suggsPage.style.display = 'none';

    const inpHub = document.getElementById('hub-search-input');
    const clearBtnHub = document.getElementById('hub-search-clear-btn');
    const suggsHub = document.getElementById('hub-search-suggestions');
    if (inpHub) inpHub.value = clean;
    if (clearBtnHub) clearBtnHub.style.display = 'flex';
    if (suggsHub) suggsHub.style.display = 'none';

    const searchConfig = getSearchConfig();
    if (searchConfig.enableTabs) {
        if (shouldUpdateTab) {
            addOrActivateSearchTab(clean);
        } else {
            renderSearchTabsRow();
        }
    } else {
        renderSearchTabsRow();
    }

    if (inpageResults) {
        inpageResults.style.display = 'block';
        inpageResults.innerHTML = `
                    <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:36px; animation:spin 1s linear infinite;">sync</span>
                        <p style="margin-top:10px; font-size:0.95rem;">正在检索“${escapeHtml(clean)}”...</p>
                    </div>
                `;
    }

    // 并行检索：有道词典 + 本地词库 + 相关词组
    const [ydData, localResults, phrasesResults] = await Promise.all([
        searchYoudaoSuggest(clean),
        Promise.resolve(searchLocalBooks(clean)),
        Promise.resolve(findPhrasesContainingWord(clean))
    ]);
    const relatedResults = findRelatedWords(clean, ydData?.entries);

    const isChineseQuery = /[\u4e00-\u9fa5]/.test(clean);
    if (isChineseQuery) {
        // 中文搜索独立分支：分开展示所有英文结果，并在每个结果旁添加发音功能，点击结果可以跳转搜索
        const chineseMatchCards = [];
        const seenEnglishWords = new Set();

        // 1. 本地词库匹配
        localResults.forEach(r => {
            const wRaw = (r.word || '').trim();
            const wLower = wRaw.toLowerCase();
            if (!seenEnglishWords.has(wLower) && /[a-zA-Z]/.test(wRaw)) {
                seenEnglishWords.add(wLower);
                chineseMatchCards.push({
                    word: wRaw,
                    phone: r.phone || '',
                    meaning: r.meaning || '',
                    source: r.bookName || '本地词书'
                });
            }
        });

        // 2. 有道词典联想补充 (支持 explain 中返回的英文对应词/词组)
        if (ydData && Array.isArray(ydData.entries)) {
            ydData.entries.forEach(e => {
                if (!e) return;
                const entry = (e.entry || '').trim();
                const explain = (e.explain || '').trim();

                // 2.1 entry 本身是英文条目
                if (entry && /[a-zA-Z]/.test(entry)) {
                    const eLower = entry.toLowerCase();
                    if (!seenEnglishWords.has(eLower)) {
                        seenEnglishWords.add(eLower);
                        chineseMatchCards.push({
                            word: entry,
                            phone: '',
                            meaning: cleanMeaningText(explain, entry) || clean,
                            source: '有道词典'
                        });
                    }
                }

                // 2.2 explain 包含英文翻译 (有道中文搜索的主要返回格式，如 entry: "苹果", explain: "apple; IPHONE; Apple Inc")
                if (explain && /[a-zA-Z]/.test(explain)) {
                    const candidates = explain.split(/[;；]/).map(s => s.trim()).filter(s => s && /[a-zA-Z]/.test(s));
                    candidates.forEach(cand => {
                        const cleanCand = cand.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();
                        if (!cleanCand) return;
                        const candLower = cleanCand.toLowerCase();
                        if (!seenEnglishWords.has(candLower)) {
                            seenEnglishWords.add(candLower);
                            chineseMatchCards.push({
                                word: cleanCand,
                                phone: '',
                                meaning: entry || clean,
                                source: '有道词典'
                            });
                        }
                    });
                }
            });
        }

        inpageResults.innerHTML = `
                    <div class="search-result-main-card">
                        <!-- 1. 中文搜索词头部与中文发音 -->
                        <div class="search-word-header">
                            <div class="search-word-title-row">
                                <h1 class="search-word-title">${escapeHtml(clean)}</h1>
                                <div class="search-word-pron-row">
                                    <button type="button" class="search-pron-btn" onclick="playWordAudio('${escapeHtml(clean)}')" title="点击发音 (中文朗读)">
                                        <span style="font-weight:700;">中</span>
                                        <span class="material-symbols-rounded" style="font-size:17px; color:#0284c7;">volume_up</span>
                                    </button>
                                </div>
                            </div>
                            <div style="font-size:0.86rem; color:var(--md-sys-color-outline); margin-top:6px;">
                                ${chineseMatchCards.length > 0 ? `共找到 <strong>${chineseMatchCards.length}</strong> 个对应英文结果，点击结果可跳转查询详细释义：` : '暂未在词书或词典中找到对应英文条目'}
                            </div>
                        </div>

                        <!-- 2. 分开展示所有英文结果卡片列表 -->
                        ${chineseMatchCards.length > 0 ? `
                            <div class="chinese-search-results-list">
                                ${chineseMatchCards.map(item => `
                                    <div class="chinese-result-card" onclick="executeHubSearch('${escapeHtml(item.word)}', true, true)">
                                        <div class="chinese-result-main">
                                            <div class="chinese-result-word-row">
                                                <span class="chinese-result-word">${escapeHtml(item.word)}</span>
                                                ${item.phone ? `<span class="chinese-result-phone">/${escapeHtml(item.phone)}/</span>` : ''}
                                                <span class="badge" style="font-size:0.75rem;">${escapeHtml(item.source)}</span>
                                            </div>
                                            <div class="chinese-result-meaning">${escapeHtml(item.meaning)}</div>
                                        </div>
                                        <button type="button" class="chinese-result-voice-btn" onclick="event.stopPropagation(); playWordAudio('${escapeHtml(item.word)}')" title="播放英文发音">
                                            <span class="material-symbols-rounded" style="font-size:20px;">volume_up</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="text-align:center; padding:36px 16px; color:var(--md-sys-color-outline);">
                                <span class="material-symbols-rounded" style="font-size:42px; opacity:0.35;">search_off</span>
                                <p style="margin-top:10px; font-size:0.95rem;">未检索到与“${escapeHtml(clean)}”相关的英文释义</p>
                            </div>
                        `}
                    </div>
                `;

        if (typeof addSearchHistoryItem === 'function') {
            addSearchHistoryItem(clean, chineseMatchCards.length > 0 ? `${chineseMatchCards[0].word}: ${chineseMatchCards[0].meaning}` : '');
        }

        const historyContainer = document.getElementById('search-history-container');
        if (historyContainer) historyContainer.style.display = 'none';
        if (inpageResults) inpageResults.style.display = 'block';

        if (shouldScroll) {
            inpageResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
    }

    // 提取音标并严格去除首尾斜杠与多余符号，杜绝 // 双斜杠
    let phonetic = '';
    if (localResults.length > 0 && localResults[0].phone) {
        phonetic = (localResults[0].phone || '')
            .replace(/^[\s/\[]+|[\s/\]]+$/g, '')
            .replace(/\/+/g, '/')
            .trim();
    }

    // 严格过滤有道条目并优先完全匹配大小写
    let exactYoudaoEntries = [];
    let youdaoPhrases = [];
    if (ydData && Array.isArray(ydData.entries)) {
        const hasExactCase = ydData.entries.some(e => e && e.entry && e.entry.trim() === clean);

        ydData.entries.forEach(e => {
            if (!e || !e.entry) return;
            const entryTrimmed = e.entry.trim();
            const entryLower = entryTrimmed.toLowerCase();
            const isMatchedWord = hasExactCase ? (entryTrimmed === clean) : (entryLower === cleanLower);

            if (isMatchedWord) {
                const cleanedExplain = cleanMeaningText(e.explain || '', entryTrimmed);
                if (cleanedExplain) {
                    exactYoudaoEntries.push({
                        entry: entryTrimmed,
                        explain: cleanedExplain
                    });
                }
            } else if (entryTrimmed.includes(' ') || entryTrimmed.includes('-')) {
                const wholeWordRegex = new RegExp('(?:^|[;\\s,，；.。!?;:\'\"\\(\\[{])' + escapeRegExp(cleanLower) + '(?:$|[;\\s,，；.。!?;:\'\"\\)\\]}])', 'i');
                if (wholeWordRegex.test(entryTrimmed)) {
                    const cleanedExplain = cleanMeaningText(e.explain || '', entryTrimmed);
                    if (cleanedExplain) {
                        youdaoPhrases.push({
                            phrase: entryTrimmed,
                            meaning: cleanedExplain,
                            bookName: null
                        });
                    }
                }
            }
        });
    }

    if (exactYoudaoEntries.length === 0 && ydData && Array.isArray(ydData.entries) && ydData.entries.length > 0) {
        const first = ydData.entries[0];
        if (first && first.entry && first.entry.trim().toLowerCase() === cleanLower) {
            const cleanedExplain = cleanMeaningText(first.explain || '', first.entry);
            if (cleanedExplain) {
                exactYoudaoEntries.push({
                    entry: first.entry,
                    explain: cleanedExplain
                });
            }
        }
    }

    const searchWordDisplay = (exactYoudaoEntries.length > 0 ? exactYoudaoEntries[0].entry : null) || clean;
    lastYoudaoSearchResult = {
        word: searchWordDisplay,
        entries: exactYoudaoEntries.length > 0 ? exactYoudaoEntries : localResults.map(r => ({ entry: r.word, explain: cleanMeaningText(r.meaning, r.word) }))
    };

    // ----------------- 聚合释义数据结构 -----------------
    const sourcesList = [];
    let chipCounter = 0;

    // 1. 有道词典
    if (exactYoudaoEntries.length > 0) {
        const segs = [];
        exactYoudaoEntries.forEach(e => {
            const parsed = parseMeaningPosSegments(e.explain || '');
            parsed.forEach(s => {
                const pieces = s.meaning.split(/[；;]\s*/).map(p => p.trim()).filter(Boolean);
                if (pieces.length > 0) {
                    segs.push({
                        pos: s.pos || '',
                        pieces: pieces.map(p => ({
                            id: `chip_${++chipCounter}`,
                            pos: s.pos || '',
                            text: p
                        }))
                    });
                }
            });
        });
        if (segs.length > 0) {
            sourcesList.push({
                name: '有道词典',
                type: 'youdao',
                segments: segs
            });
        }
    }

    // 2. 本地词库
    const exactLocalMatches = localResults.filter(r => r.word.toLowerCase() === cleanLower);
    const seenBookNames = new Set();
    exactLocalMatches.forEach(r => {
        if (seenBookNames.has(r.bookName)) return;
        seenBookNames.add(r.bookName);

        const parsed = parseMeaningPosSegments(r.meaning || '');
        const segs = [];
        parsed.forEach(s => {
            const pieces = s.meaning.split(/[；;]\s*/).map(p => p.trim()).filter(Boolean);
            if (pieces.length > 0) {
                segs.push({
                    pos: s.pos || '',
                    pieces: pieces.map(p => ({
                        id: `chip_${++chipCounter}`,
                        pos: s.pos || '',
                        text: p
                    }))
                });
            }
        });
        if (segs.length > 0) {
            sourcesList.push({
                name: `《${r.bookName}》`,
                type: 'book',
                bookId: r.bookId,
                bookName: r.bookName,
                segments: segs
            });
        }
    });

    currentSearchExplainsData = {
        word: searchWordDisplay,
        sources: sourcesList
    };
    isInlineAddToBookOpen = false;
    inlineSelectedChipIds.clear();

    // 3. 相关词组 (过滤合并)
    const allPhrases = [];
    const seenPhraseName = new Set();
    phrasesResults.forEach(p => {
        const pKey = p.phrase.toLowerCase();
        if (!seenPhraseName.has(pKey)) {
            seenPhraseName.add(pKey);
            allPhrases.push(p);
        }
    });
    youdaoPhrases.forEach(yp => {
        const pKey = yp.phrase.toLowerCase();
        if (!seenPhraseName.has(pKey)) {
            seenPhraseName.add(pKey);
            allPhrases.push(yp);
        }
    });

    let phrasesHtml = '';
    if (allPhrases.length > 0) {
        phrasesHtml = allPhrases.map(p => `
                    <div class="search-phrase-item" onclick="executeHubSearch('${escapeHtml(p.phrase)}', true, true)">
                        <div style="flex:1; min-width:0;">
                            <div class="search-phrase-name">${highlightPhraseKeyword(p.phrase, clean)}</div>
                            <div class="search-phrase-meaning">${escapeHtml(p.meaning)}</div>
                        </div>
                        <span class="badge" style="font-size:0.75rem;">${p.bookName ? `《${escapeHtml(p.bookName)}》` : '有道词典'}</span>
                    </div>
                `).join('');
    } else {
        phrasesHtml = `<div style="font-size:0.9rem; color:var(--md-sys-color-outline); padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:12px;">未找到相关词组</div>`;
    }

    // 发音与音标展示逻辑
    let pronHtml = '';
    if (isQueryPhrase) {
        pronHtml = `
                    <button type="button" class="search-phrase-voice-btn" onclick="playWordVoice('${escapeHtml(searchWordDisplay)}', 2)" title="播放发音">
                        <span class="material-symbols-rounded" style="font-size: 20px;">volume_up</span>
                    </button>
                `;
    } else {
        const hasValidPhonetic = phonetic && phonetic.toLowerCase() !== cleanLower;
        pronHtml = `
                    <div class="search-word-pron-row">
                        <button type="button" class="search-pron-btn" onclick="playWordVoice('${escapeHtml(searchWordDisplay)}', 1)" title="点击发音 (英音)">
                            <span style="font-weight:700;">英</span>
                            ${hasValidPhonetic ? `<span class="search-phonetic">/${escapeHtml(phonetic)}/</span>` : ''}
                            <span class="material-symbols-rounded" style="font-size:17px; color:#0284c7;">volume_up</span>
                        </button>
                        <button type="button" class="search-pron-btn" onclick="playWordVoice('${escapeHtml(searchWordDisplay)}', 2)" title="点击发音 (美音)">
                            <span style="font-weight:700;">美</span>
                            ${hasValidPhonetic ? `<span class="search-phonetic">/${escapeHtml(phonetic)}/</span>` : ''}
                            <span class="material-symbols-rounded" style="font-size:17px; color:#0284c7;">volume_up</span>
                        </button>
                    </div>
                `;
    }

    inpageResults.innerHTML = `
                <div class="search-result-main-card">
                    <!-- 1. 单词/词组头部与发音 -->
                    <div class="search-word-header">
                        <div class="search-word-title-row">
                            <h1 class="search-word-title">${escapeHtml(searchWordDisplay)}</h1>
                            ${pronHtml}
                        </div>
                    </div>

                    <!-- 2. 统一释义 (三个图标光学平衡) -->
                    <div class="search-section-block">
                        <div class="search-section-header">
                            <div class="search-section-title">
                                <span class="material-symbols-rounded" style="color:#0061a4; font-size:20px; width:20px; height:20px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">menu_book</span>
                                <span>释义</span>
                            </div>
                            <div id="search-explains-actions-container" style="display: flex; align-items: center; gap: 8px;">
                                <button type="button" class="search-action-icon-btn" id="btn-toggle-inline-add-to-book" onclick="toggleInlineAddToBookPanel()" title="添加到本地词书">
                                    <span class="material-symbols-rounded">bookmark_add</span>
                                </button>
                                <button type="button" class="search-action-icon-btn" onclick="enterEditMeaningsMode()" title="修改释义">
                                    <span class="material-symbols-rounded">edit_note</span>
                                </button>
                            </div>
                        </div>

                        <!-- 页面内嵌“添加到本地词书”极简控制条 (免弹窗) -->
                        <div id="search-inline-add-to-book-panel" style="display:none; margin-bottom:12px;"></div>

                        <!-- 动态释义展示容器 (支持普通查看、极简勾选添加、修改释义) -->
                        <div id="search-explains-dynamic-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>

                    <!-- 3. 相关词组 (受设置开关控制，已去除个数) -->
                    <div class="search-section-block" id="search-phrases-block" style="${searchConfig.enablePhrases !== false ? '' : 'display:none;'}">
                        <div class="search-section-header" onclick="toggleSectionCollapse('search-phrases-content', this)" style="cursor:pointer; user-select:none;">
                            <div class="search-section-title">
                                <span class="material-symbols-rounded" style="color:#7c3aed; font-size:20px;">link</span>
                                <span>相关词组</span>
                            </div>
                            <span class="material-symbols-rounded search-section-chevron" style="font-size:20px; color:var(--md-sys-color-outline); transition:transform 0.2s;">expand_more</span>
                        </div>
                        <div class="search-phrases-list" id="search-phrases-content">
                            ${phrasesHtml}
                        </div>
                    </div>

                    <!-- 4. 相关链接 (受设置开关控制，已去除个数) -->
                    <div class="search-section-block" id="search-related-block" style="${searchConfig.enableRelatedLinks !== false && relatedResults.length > 0 ? '' : 'display:none;'}">
                        <div class="search-section-header" onclick="toggleSectionCollapse('search-related-content', this)" style="cursor:pointer; user-select:none;">
                            <div class="search-section-title">
                                <span class="material-symbols-rounded" style="color:#0284c7; font-size:20px;">hub</span>
                                <span>相关链接</span>
                            </div>
                            <span class="material-symbols-rounded search-section-chevron" style="font-size:20px; color:var(--md-sys-color-outline); transition:transform 0.2s;">expand_more</span>
                        </div>
                        <div class="search-related-grid" id="search-related-content">
                            ${relatedResults.map(r => `
                                <div class="search-related-card" onclick="executeHubSearch('${escapeHtml(r.word)}', true, true)">
                                    <div class="search-related-word">${escapeHtml(r.word)}</div>
                                    <div class="search-related-meaning" title="${escapeHtml(r.meaning)}">${escapeHtml(r.meaning || '点击查看释义')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

    renderSearchExplainsList();

    // 隐藏搜索历史，显示搜索结果
    const historyContainer = document.getElementById('search-history-container');
    if (historyContainer) historyContainer.style.display = 'none';
    if (inpageResults) inpageResults.style.display = 'block';

    let firstMeaning = '';
    if (exactYoudaoEntries.length > 0) {
        firstMeaning = exactYoudaoEntries[0].explain || '';
    } else if (localResults.length > 0) {
        firstMeaning = localResults[0].meaning || '';
    }
    if (typeof addSearchHistoryItem === 'function') {
        addSearchHistoryItem(clean, firstMeaning);
    }

    if (shouldScroll) {
        inpageResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function closeInpageSearchResults() {
    const inpageResults = document.getElementById('search-page-results') || document.getElementById('hub-search-inpage-results');
    const searchInput = document.getElementById('search-page-input');
    const clearBtn = document.getElementById('search-page-clear-btn');
    const tabsRow = document.getElementById('search-page-tabs-row');

    if (inpageResults) {
        inpageResults.innerHTML = `
                    <div style="text-align:center; padding:60px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">search</span>
                        <p style="margin-top:12px; font-size:0.95rem;">输入单词或词组开始搜索</p>
                    </div>
                `;
        inpageResults.style.display = 'none';
    }
    if (tabsRow) tabsRow.style.display = 'none';
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    activeSearchTabId = null;
    saveSearchTabs();
    renderSearchTabsRow();
    if (typeof showSearchHistoryView === 'function') {
        showSearchHistoryView();
    }
}

// ----------------- 添加到本地词书 (极简化：勾选原生透明虚线词块 + 自定义输入) -----------------
let currentSearchExplainsData = null;
let isInlineAddToBookOpen = false;
let inlineSelectedChipIds = new Set();
let inlineAddSelectedBookId = null;

function renderSearchExplainsList() {
    const container = document.getElementById('search-explains-dynamic-container');
    if (!container) return;

    if (!currentSearchExplainsData || !currentSearchExplainsData.sources || currentSearchExplainsData.sources.length === 0) {
        container.innerHTML = `<div style="font-size:0.9rem; color:var(--md-sys-color-outline); padding:12px 16px; background:var(--md-sys-color-surface-container-low); border-radius:12px;">有道词典与本地词书暂未收录该词具体释义</div>`;
        return;
    }

    container.innerHTML = currentSearchExplainsData.sources.map(src => `
                <div class="unified-explain-card" style="margin-bottom:10px;">
                    <div class="unified-card-source-row">
                        <span class="unified-source-badge ${src.type === 'youdao' ? 'youdao' : 'book'}">${escapeHtml(src.name)}</span>
                    </div>
                    <div class="unified-card-content">
                        ${src.segments.map(seg => {
        if (isInlineAddToBookOpen) {
            return `
                                    <div class="unified-explain-row" style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
                                        ${seg.pos ? `<span class="unified-source-badge pos" style="margin-top:2px;">${escapeHtml(seg.pos)}</span>` : ''}
                                        <div style="display:inline-flex; flex-wrap:wrap; gap:6px; align-items:center; flex:1;">
                                            ${seg.pieces.map(chip => {
                const isSel = inlineSelectedChipIds.has(chip.id);
                return `
                                                    <div class="selectable-meaning-chip ${isSel ? 'selected' : ''}"
                                                        onclick="toggleInlineSelectChip('${chip.id}')"
                                                        title="点击勾选/取消勾选">
                                                        <span>${escapeHtml(chip.text)}</span>
                                                        ${isSel ? '<span class="material-symbols-rounded" style="font-size:15px; margin-left:2px;">check</span>' : ''}
                                                    </div>
                                                `;
            }).join('')}
                                        </div>
                                    </div>
                                `;
        } else {
            // 正常状态下自然连续排布，以中文分号连接，杜绝各个词条间的分裂巨大间隙
            const fluidText = seg.pieces.map(p => escapeHtml(p.text)).join('； ');
            return `
                                    <div class="unified-explain-row">
                                        ${seg.pos ? `<span class="unified-source-badge pos">${escapeHtml(seg.pos)}</span>` : ''}
                                        <div class="unified-explain-text">${fluidText}</div>
                                    </div>
                                `;
        }
    }).join('')}
                    </div>
                </div>
            `).join('');
}

function toggleInlineSelectChip(chipId) {
    if (inlineSelectedChipIds.has(chipId)) {
        inlineSelectedChipIds.delete(chipId);
    } else {
        inlineSelectedChipIds.add(chipId);
    }
    renderSearchExplainsList();
    renderInlineAddToBookHeader();
}

function toggleInlineAddToBookPanel() {
    if (isEditingMeanings) {
        isEditingMeanings = false;
    }
    isInlineAddToBookOpen = !isInlineAddToBookOpen;
    const panel = document.getElementById('search-inline-add-to-book-panel');
    if (!panel) return;
    if (!isInlineAddToBookOpen) {
        panel.style.display = 'none';
        renderSearchExplainsList();
        return;
    }

    // 默认勾选首个来源的词块
    inlineSelectedChipIds.clear();
    if (currentSearchExplainsData && currentSearchExplainsData.sources && currentSearchExplainsData.sources.length > 0) {
        const firstSrc = currentSearchExplainsData.sources[0];
        firstSrc.segments.forEach(seg => {
            seg.pieces.forEach(p => inlineSelectedChipIds.add(p.id));
        });
    }

    renderInlineAddToBookHeader();
    panel.style.display = 'block';
    renderSearchExplainsList();
}

function closeInlineAddToBookPanel() {
    isInlineAddToBookOpen = false;
    const panel = document.getElementById('search-inline-add-to-book-panel');
    if (panel) panel.style.display = 'none';
    renderSearchExplainsList();
}

function handleInlineAddBookSelectChange(val) {
    inlineAddSelectedBookId = val;
    if (val === '__create_new__') {
        promptCreateCustomBookForInline();
    }
}

async function promptCreateCustomBookForInline() {
    const name = prompt('请输入新词书名称：', '生词本');
    if (!name || !name.trim()) return;
    const newBookId = 'custom_' + Date.now();
    const newBook = {
        id: newBookId,
        name: name.trim(),
        rawName: name.trim(),
        count: 0,
        words: [],
        folderId: null,
        isCloud: false,
        createdAt: Date.now()
    };
    if (!window.customBooks) window.customBooks = [];
    window.customBooks.push(newBook);
    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(newBook);
    }
    BookManager.mergeCustomBooks();
    inlineAddSelectedBookId = newBookId;
    renderInlineAddToBookHeader();
}

let customMeaningDraft = '';
function renderInlineAddToBookHeader() {
    const panel = document.getElementById('search-inline-add-to-book-panel');
    if (!panel || !currentSearchExplainsData) return;

    const customBooks = window.customBooks || [];
    if (!inlineAddSelectedBookId || !customBooks.some(b => b.id === inlineAddSelectedBookId)) {
        inlineAddSelectedBookId = customBooks.length > 0 ? customBooks[0].id : '__create_new__';
    }

    const bookOptions = customBooks.map(b => ({
        value: b.id,
        label: `${cleanBookName(b.rawName || b.name)} (${b.count || 0} 词)`
    }));
    bookOptions.push({ value: '__create_new__', label: '＋ 新建词书并添加...' });

    const selectedChips = [];
    if (currentSearchExplainsData && currentSearchExplainsData.sources) {
        currentSearchExplainsData.sources.forEach(src => {
            src.segments.forEach(seg => {
                seg.pieces.forEach(p => {
                    if (inlineSelectedChipIds.has(p.id)) {
                        selectedChips.push(p);
                    }
                });
            });
        });
    }

    panel.innerHTML = `
                <div class="inline-add-to-book-card" style="background:var(--md-sys-color-surface-container-low, #f8fafc); border:1.5px solid var(--md-sys-color-primary, #0061a4); border-radius:14px; padding:12px 16px; margin-bottom:12px; animation:fadeIn 0.2s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; min-width:0;">
                            <span style="font-weight:700; font-size:0.92rem; color:var(--md-sys-color-on-surface); white-space:nowrap;">添加到：</span>
                            ${renderMd3SelectHtml({
        id: 'inline-add-book-select',
        options: bookOptions,
        defaultValue: inlineAddSelectedBookId,
        onChange: 'handleInlineAddBookSelectChange'
    })}
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <button type="button" class="btn btn-tonal btn-sm" onclick="closeInlineAddToBookPanel()">
                                <span class="material-symbols-rounded" style="font-size:16px;">close</span>
                                <span>取消</span>
                            </button>
                            <button type="button" class="btn btn-filled btn-sm" onclick="confirmInlineAddToBook()">
                                <span class="material-symbols-rounded" style="font-size:16px;">check</span>
                                <span>确认添加</span>
                            </button>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding-top:8px; border-top:1px dashed var(--md-sys-color-outline-variant, #cbd5e1);">
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <span style="font-weight:700; font-size:0.84rem; color:var(--md-sys-color-on-surface-variant); white-space:nowrap;">已选释义：</span>
                            ${selectedChips.length > 0 ? selectedChips.map(c => `
                                <span class="meaning-chip selected" style="cursor:default; font-size:0.82rem; padding:3px 8px;">
                                    ${c.pos ? `<strong style="color:var(--md-sys-color-primary);">${escapeHtml(c.pos)}</strong> ` : ''}${escapeHtml(c.text)}
                                </span>
                            `).join('') : '<span style="font-size:0.82rem; color:var(--md-sys-color-outline);">(在下方点击勾选词块)</span>'}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
                            <input type="text" id="input-inline-add-custom-meaning" class="input-field" placeholder="＋ 添加自定义释义 (可选)..." style="height:32px; font-size:0.84rem; padding:4px 10px; border-radius:8px; flex:1;" value="${escapeHtml(customMeaningDraft || '')}" oninput="customMeaningDraft = this.value" onkeydown="if(event.key==='Enter') confirmInlineAddToBook()">
                        </div>
                    </div>
                </div>
            `;
}

async function confirmInlineAddToBook() {
    if (!currentSearchExplainsData) return;
    const word = currentSearchExplainsData.word;

    // 收集所有勾选的词块
    const selectedChips = [];
    if (currentSearchExplainsData.sources) {
        currentSearchExplainsData.sources.forEach(src => {
            src.segments.forEach(seg => {
                seg.pieces.forEach(p => {
                    if (inlineSelectedChipIds.has(p.id)) {
                        selectedChips.push(p);
                    }
                });
            });
        });
    }

    const customText = (document.getElementById('input-inline-add-custom-meaning')?.value || '').trim();

    if (selectedChips.length === 0 && !customText) {
        showToast('请至少勾选一个释义词块或输入自定义释义！');
        return;
    }

    let targetBookId = inlineAddSelectedBookId;
    if (targetBookId === '__create_new__') {
        await promptCreateCustomBookForInline();
        targetBookId = inlineAddSelectedBookId;
        if (targetBookId === '__create_new__') return;
    }

    const targetBook = (window.customBooks || []).find(b => b.id === targetBookId);
    if (!targetBook) {
        showToast('请选择有效目标词书！');
        return;
    }

    // 按词性整理释义
    const posGroups = {};
    selectedChips.forEach(c => {
        const p = c.pos || '';
        if (!posGroups[p]) posGroups[p] = [];
        if (!posGroups[p].includes(c.text)) {
            posGroups[p].push(c.text);
        }
    });

    if (customText) {
        const customSegs = parseMeaningPosSegments(customText);
        customSegs.forEach(cs => {
            const p = cs.pos || '';
            if (!posGroups[p]) posGroups[p] = [];
            const pieces = cs.meaning.split(/[；;]\s*/).map(x => x.trim()).filter(Boolean);
            pieces.forEach(px => {
                if (!posGroups[p].includes(px)) posGroups[p].push(px);
            });
        });
    }

    const segStrings = [];
    Object.keys(posGroups).forEach(p => {
        const joined = posGroups[p].join('；');
        segStrings.push(p ? `${p} ${joined}` : joined);
    });
    const finalMeaning = segStrings.join(' ');

    const wordObj = {
        word: word,
        phone: '',
        meaning: finalMeaning,
        bookName: targetBook.name,
        bookId: targetBook.id
    };

    if (!Array.isArray(targetBook.words)) targetBook.words = [];
    const existingWordIdx = targetBook.words.findIndex(w => (w.word || w.name || '').toLowerCase() === word.toLowerCase());
    if (existingWordIdx !== -1) {
        targetBook.words[existingWordIdx].meaning = finalMeaning;
        targetBook.words[existingWordIdx].trans = [finalMeaning];
    } else {
        targetBook.words.push(wordObj);
    }
    targetBook.count = targetBook.words.length;

    if (typeof VocabOfflineDB !== 'undefined') {
        await VocabOfflineDB.saveBook(targetBook);
    }
    if (BookManager.bookCache) {
        BookManager.bookCache[targetBook.id] = targetBook.words;
    }

    closeInlineAddToBookPanel();
    showToast(`已添加「${word}」至《${targetBook.name}》`);
    executeHubSearch(word, false, false);
}

// 保留旧弹窗接口兼容
function closeAddToBookModal() {
    const modal = document.getElementById('modal-add-to-book');
    if (modal) modal.classList.remove('active');
}

// ----------------- 编辑本地词书中的词条释义 -----------------
let editingMeaningContext = null;

function openEditMeaningModal(bookId, word, meaning) {
    editingMeaningContext = { bookId, word, meaning };
    const modal = document.getElementById('modal-edit-meaning');
    const titleEl = document.getElementById('edit-meaning-word-title');
    const inputEl = document.getElementById('input-edit-meaning-text');

    if (titleEl) titleEl.innerText = `编辑「${word}」释义`;
    if (inputEl) inputEl.value = meaning;
    if (modal) modal.classList.add('active');
    if (inputEl) setTimeout(() => inputEl.focus(), 150);
}

function closeEditMeaningModal() {
    const modal = document.getElementById('modal-edit-meaning');
    if (modal) modal.classList.remove('active');
    editingMeaningContext = null;
}

async function confirmEditMeaning() {
    if (!editingMeaningContext) return;
    const inputEl = document.getElementById('input-edit-meaning-text');
    const newMeaning = (inputEl ? inputEl.value : '').trim();
    if (!newMeaning) {
        showToast('释义不能为空！');
        return;
    }

    const { bookId, word } = editingMeaningContext;
    const targetBook = (window.customBooks || []).find(b => b.id === bookId);

    if (targetBook && Array.isArray(targetBook.words)) {
        const targetWord = targetBook.words.find(w => (w.word || w.name || '').toLowerCase() === word.toLowerCase());
        if (targetWord) {
            targetWord.meaning = newMeaning;
            targetWord.trans = [newMeaning];
            if (typeof VocabOfflineDB !== 'undefined') {
                await VocabOfflineDB.saveBook(targetBook);
            }
            if (BookManager.bookCache) {
                BookManager.bookCache[targetBook.id] = targetBook.words;
            }
        }
    } else {
        // 内置/云端词书：保存持久化词义覆盖
        let overrides = {};
        try {
            overrides = JSON.parse(localStorage.getItem('vocab_word_meaning_overrides') || '{}');
        } catch (e) { }
        const overrideKey = `${bookId}::${word.toLowerCase()}`;
        overrides[overrideKey] = newMeaning;
        localStorage.setItem('vocab_word_meaning_overrides', JSON.stringify(overrides));

        if (BookManager.bookCache && BookManager.bookCache[bookId]) {
            const w = BookManager.bookCache[bookId].find(item => (item.word || item.name || '').toLowerCase() === word.toLowerCase());
            if (w) {
                w.meaning = newMeaning;
                w.trans = [newMeaning];
            }
        }
    }

    closeEditMeaningModal();
    showToast(`已更新「${word}」的释义`);
    executeHubSearch(word);
    if (settingsViewingBookId === bookId) {
        viewBookWordsInSettings(bookId);
    }
}
/* --- End: views/search.js --- */

/* --- Begin: app.js --- */
/**
 * 系统初始化生命周期与网络字体检测
 * Module: assets/js/app.js
 */

/* ==========================================================================
   14. 系统初始化启动逻辑
   ========================================================================== */
initDisplaySettings();
BookManager.init();
renderAuthUsersList();
checkCloudVersion(false);
checkFirstOpenWelcome();
checkIosSafariPwa();
checkLocalIconFontAvailability();
initGlobalVirtualKeyboard();

const isLocalStartup = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (!isLocalStartup && typeof BookManager !== 'undefined' && typeof BookManager.fetchBookList === 'function') {
    BookManager.fetchBookList(true);
}

if (currentUser && allUsersList.includes(currentUser)) {
    loadUserData(currentUser);
    switchView('view-hub');
} else {
    currentUser = '';
    localStorage.removeItem('vocab_pk_user');
    switchView('view-auth');
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

    try {
        const res = await fetch('./assets/fonts/material-symbols-rounded.woff2', { method: 'HEAD' });
        if (!res.ok) {
            showMissingIconsModal();
        }
    } catch (e) {
        if (document.fonts && document.fonts.check) {
            setTimeout(() => {
                if (!document.fonts.check('16px "Material Symbols Rounded"')) {
                    showMissingIconsModal();
                }
            }, 1200);
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

/* --- End: app.js --- */
