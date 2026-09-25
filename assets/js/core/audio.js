/**
 * 统一语音朗读与发音引擎
 * Module: assets/js/core/audio.js
 */

/* ==========================================================================
   统一语音朗读引擎 (支持英音/美音/中文字词/词组与系统语音降级回退)
   ========================================================================== */
function speakWithSpeechSynthesis(text, isChinese, type = 1) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (isChinese) {
            u.lang = 'zh-CN';
        } else {
            u.lang = (type === 1) ? 'en-GB' : 'en-US';
        }
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn('[Audio] SpeechSynthesis fallback failed:', e);
    }
}

function playWordAudio(text, type = 1) {
    if (!text || typeof text !== 'string') return;
    
    // 清洗各类括号内容及标点
    let cleanText = text
        .replace(/\[.*?\]/g, '')
        .replace(/【.*?】/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/（.*?）/g, '')
        .replace(/[（）()…._\-~！？!?，,。；;、/\\#@%&*+=|<>:"'^]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanText) return;
    const isChinese = /[\u4e00-\u9fa5]/.test(cleanText);

    // 对于中文释义，若包含多个空格分隔的词，优先提取首个有效词组尝试有道，避免有道接口 500
    let youdaoQuery = cleanText;
    if (isChinese) {
        const parts = cleanText.split(/\s+/).filter(Boolean);
        if (parts.length > 0) youdaoQuery = parts[0];
    } else {
        // 英文短语中去除可能多余的符号
        youdaoQuery = cleanText.replace(/[\/]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    try {
        if (activeAudioObj) {
            try { activeAudioObj.pause(); } catch (e) { }
            activeAudioObj = null;
        }

        const url = isChinese
            ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(youdaoQuery)}&le=zh`
            : `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(youdaoQuery)}`;
        
        activeAudioObj = new Audio(url);
        let fallbackTriggered = false;
        const triggerFallback = () => {
            if (fallbackTriggered) return;
            fallbackTriggered = true;
            speakWithSpeechSynthesis(cleanText, isChinese, type);
        };

        activeAudioObj.onerror = () => {
            triggerFallback();
        };

        const playPromise = activeAudioObj.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(err => {
                triggerFallback();
            });
        }
    } catch (err) {
        speakWithSpeechSynthesis(cleanText, isChinese, type);
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

