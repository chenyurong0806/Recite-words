/**
 * 统一语音朗读与发音引擎 (差异化优化：英语单词 / 英语词组 / 中文)
 * Module: assets/js/core/audio.js
 */

// ==========================================================================
// 1. 内存音频缓存池与发音上下文管理
// ==========================================================================
const AudioCache = new Map(); // 缓存最近 60 个音频实例，实现 0 延迟二次秒播
const MAX_CACHE_SIZE = 60;
let currentActiveAudio = null;
let isAudioUnlocked = false;

// 移动端/Safari Web Audio 交互解锁
function ensureAudioContextUnlocked() {
    if (isAudioUnlocked) return;
    try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.resume();
        }
        isAudioUnlocked = true;
    } catch (e) { }
}
document.addEventListener('pointerdown', ensureAudioContextUnlocked, { once: true });

// ==========================================================================
// 2. 文本清洗与发音类型分类器
// ==========================================================================
function cleanAudioText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/\[.*?\]/g, '')
        .replace(/【.*?】/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/（.*?）/g, '')
        // 清洗词性前缀（如 n. / vt. / adj. / adv. / vi. 等），防止朗读系统生硬拼读缩写
        .replace(/^(?:adj|adv|prep|conj|pron|interj|abbr|art|num|aux|vi|vt|modal|n|v)\.\s*/i, '')
        .replace(/[=,，~…\.\/\\#@%&*+|<>"'^]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * 词组口语化清洗（将 sb. 转换为 somebody，sth. 转换为 something，one's 转换为 your）
 */
function normalizePhraseForSpeech(phrase) {
    return phrase
        .replace(/\bsb\b|\bsb\./gi, 'somebody')
        .replace(/\bsth\b|\bsth\./gi, 'something')
        .replace(/\bone's\b|\bone’s\b/gi, 'your')
        .replace(/\betc\b|\betc\./gi, 'etcetera')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * 判定发音场景类型：'chinese' | 'english_phrase' | 'english_word'
 */
function detectAudioCategory(text) {
    if (/[\u4e00-\u9fa5]/.test(text)) {
        return 'chinese';
    }
    const clean = text.replace(/[^a-zA-Z\s]/g, '').trim();
    if (clean.includes(' ') || clean.includes('-')) {
        return 'english_phrase';
    }
    return 'english_word';
}

// ==========================================================================
// 3. 原生本地离线语音合成引擎 (0 毫秒延迟，免网络请求)
// ==========================================================================
function speakNative(text, lang = 'en-US', rate = 0.95) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    try {
        window.speechSynthesis.cancel(); // 停止当前正在播放的声音，防止重叠
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate;
        u.pitch = 1.0;

        // 尝试选取更优质的自然人声
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
            const matched = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
            if (matched) u.voice = matched;
        }

        window.speechSynthesis.speak(u);
        return true;
    } catch (e) {
        console.warn('[Audio] speakNative error:', e);
        return false;
    }
}

// ==========================================================================
// 4. 发音口音偏好设置 (搜索页面以外的发音按钮默认英音 1，可在设置中调整为美音 2)
// ==========================================================================
function getDefaultPronunciationAccent() {
    try {
        const val = localStorage.getItem('vocab_default_pronunciation');
        if (val === '2') return 2; // 美音
        return 1; // 默认英音 (1)
    } catch (e) {
        return 1;
    }
}

function setDefaultPronunciationAccent(accent) {
    const val = Number(accent) === 2 ? 2 : 1;
    try {
        localStorage.setItem('vocab_default_pronunciation', String(val));
    } catch (e) { }
    updatePronunciationSettingsChips();
    if (typeof showToast === 'function') {
        showToast(val === 1 ? '已设为默认播放英音' : '已设为默认播放美音');
    }
}

function updatePronunciationSettingsChips() {
    const accent = getDefaultPronunciationAccent();
    document.querySelectorAll('#chips-default-pronunciation .md3-chip').forEach(c => {
        const chipVal = Number(c.getAttribute('data-accent'));
        c.classList.toggle('selected', chipVal === accent);
    });
}

// ==========================================================================
// 5. 差异化播放总路由：支持英语单词、英语词组、中文
// ==========================================================================
function playWordAudio(rawText, type = null) {
    if (type === null || type === undefined) {
        type = getDefaultPronunciationAccent();
    }
    if (!rawText) return;
    ensureAudioContextUnlocked();

    // 停止正在播放的实例
    if (currentActiveAudio) {
        try { currentActiveAudio.pause(); } catch (e) { }
        currentActiveAudio = null;
    }

    const cleanText = cleanAudioText(rawText);
    if (!cleanText) return;

    const category = detectAudioCategory(cleanText);

    // ----------------------------------------------------------------------
    // 场景 1：中文发音（文言实词、词条释义、例句）
    // 策略：使用高质量线上音频源 (百度TTS / 有道词典接口)，配合内存缓存池
    // ----------------------------------------------------------------------
    if (category === 'chinese') {
        const cacheKey = `zh_${cleanText}`;
        if (AudioCache.has(cacheKey)) {
            const cachedAudio = AudioCache.get(cacheKey);
            try {
                cachedAudio.currentTime = 0;
                currentActiveAudio = cachedAudio;
                cachedAudio.play().catch(() => {});
                return;
            } catch (e) {
                AudioCache.delete(cacheKey);
            }
        }

        const baiduUrl = `https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(cleanText)}&spd=5&source=web`;
        const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&le=zh`;
        const audio = new Audio(baiduUrl);
        currentActiveAudio = audio;

        let hasFallenBack = false;
        audio.onerror = () => {
            if (!hasFallenBack) {
                hasFallenBack = true;
                const fallbackAudio = new Audio(youdaoUrl);
                currentActiveAudio = fallbackAudio;
                fallbackAudio.play().then(() => {
                    AudioCache.set(cacheKey, fallbackAudio);
                }).catch(() => {});
            }
        };

        audio.play().then(() => {
            AudioCache.set(cacheKey, audio);
        }).catch(() => {
            if (!hasFallenBack) {
                hasFallenBack = true;
                const fallbackAudio = new Audio(youdaoUrl);
                currentActiveAudio = fallbackAudio;
                fallbackAudio.play().then(() => {
                    AudioCache.set(cacheKey, fallbackAudio);
                }).catch(() => {});
            }
        });
        return;
    }

    // ----------------------------------------------------------------------
    // 场景 2：英语词组 (English Phrases)
    // 策略：仅在无网环境下播放系统自带语音，有网环境下播放有道语音
    // ----------------------------------------------------------------------
    if (category === 'english_phrase') {
        const spokenPhrase = normalizePhraseForSpeech(cleanText);
        const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode()) || (typeof navigator !== 'undefined' && !navigator.onLine) || window._isDeviceOfflineForce;
        if (isOffline) {
            speakNative(spokenPhrase, type === 1 ? 'en-GB' : 'en-US', 0.92);
            return;
        }

        // 有网环境下播放有道网络音频
        const url = `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(spokenPhrase)}`;
        playNetworkAudioFallback(url);
        return;
    }

    // ----------------------------------------------------------------------
    // 场景 3：英语单词 (English Single Words)
    // 策略：仅在无网环境下播放系统自带语音；在线环境下仅播放有道语音，绝不重叠混音
    // ----------------------------------------------------------------------
    const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode()) || (typeof navigator !== 'undefined' && !navigator.onLine) || window._isDeviceOfflineForce;
    if (isOffline) {
        speakNative(cleanText, type === 1 ? 'en-GB' : 'en-US', 0.95);
        return;
    }

    const wordKey = `${cleanText.toLowerCase()}_type${type}`;

    // 命中缓存：直接 0 延迟秒播
    if (AudioCache.has(wordKey)) {
        const cachedAudio = AudioCache.get(wordKey);
        try {
            cachedAudio.currentTime = 0;
            currentActiveAudio = cachedAudio;
            cachedAudio.play().catch(() => {
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    speakNative(cleanText, type === 1 ? 'en-GB' : 'en-US', 0.95);
                }
            });
            return;
        } catch (e) {
            AudioCache.delete(wordKey);
        }
    }

    // 未命中缓存：在线环境下播放有道语音，不启动系统并发定时器，彻底防止混音
    const netUrl = `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(netUrl);
    currentActiveAudio = audio;

    audio.onended = () => {
        currentActiveAudio = null;
    };

    audio.onerror = () => {
        currentActiveAudio = null;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            speakNative(cleanText, type === 1 ? 'en-GB' : 'en-US', 0.95);
        }
    };

    audio.play().then(() => {
        if (AudioCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = AudioCache.keys().next().value;
            AudioCache.delete(oldestKey);
        }
        AudioCache.set(wordKey, audio);
    }).catch(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            speakNative(cleanText, type === 1 ? 'en-GB' : 'en-US', 0.95);
        }
    });
}

function playNetworkAudioFallback(url) {
    try {
        const audio = new Audio(url);
        currentActiveAudio = audio;
        audio.play().catch(() => { });
    } catch (e) { }
}

// ==========================================================================
// 6. 静默后台预加载当前题目发音 (用于学习/默写/对决切题时预热)
// ==========================================================================
function preloadWordAudio(rawText, type = null) {
    if (type === null || type === undefined) {
        type = getDefaultPronunciationAccent();
    }
    if (!rawText || !navigator.onLine) return;
    const cleanText = cleanAudioText(rawText);
    if (!cleanText || detectAudioCategory(cleanText) !== 'english_word') return;

    const wordKey = `${cleanText.toLowerCase()}_type${type}`;
    if (AudioCache.has(wordKey)) return;

    const audio = new Audio(`https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(cleanText)}`);
    audio.preload = 'auto';
    AudioCache.set(wordKey, audio);
}

// 兼容别名导出
function playWordVoice(word, type = null) {
    if (type === null || type === undefined) {
        type = getDefaultPronunciationAccent();
    }
    playWordAudio(word, type);
}

function playCurrentSingleWordAudio() {
    if (singleState && singleState.pool && singleState.pool[singleState.currentIdx]) {
        playWordAudio(singleState.pool[singleState.currentIdx].word);
    }
}

function playDictationAudio() {
    if (dictationState && dictationState.currentQ) {
        const q = dictationState.currentQ;
        const isListenMode = (typeof dictationConfig !== 'undefined' && dictationConfig.type === 'listen') && !q.isPhrase;
        if (!dictationState.answered && !isListenMode) {
            if (typeof showToast === 'function') showToast('答题后方可发音');
            return;
        }
        playWordAudio(dictationState.currentQ.word);
    }
}