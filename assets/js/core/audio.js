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
