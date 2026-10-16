/**
 * 下载学习数据与 PDF 导出页面
 * Module: assets/js/views/export-data.js
 */

let exportCurrentDatePreset = 'today';
let exportCustomStartDate = '';
let exportCustomEndDate = '';
let exportFilteredData = {
    words: [],
    phrases: [],
    shici: [],
    mistakes: []
};

let _exportDetailsLoadingPromise = null;
async function ensureExportWordDetailsReady() {
    if (_exportDetailsLoadingPromise) return _exportDetailsLoadingPromise;
    _exportDetailsLoadingPromise = (async () => {
        try {
            // 1. 如果 ShiCiManager 存在但 data 未载入，尝试通过 loadSingleBook 加载高中300实词
            if (typeof ShiCiManager !== 'undefined') {
                if (!ShiCiManager.data || ShiCiManager.data.length === 0) {
                    if (typeof ShiCiManager.loadSingleBook === 'function') {
                        const loaded = await ShiCiManager.loadSingleBook('books/实词/高中300实词.json');
                        if (loaded && Array.isArray(loaded) && loaded.length > 0) {
                            ShiCiManager.data = loaded;
                        }
                    }
                }
            }
            // 2. 如果 localStorage 存有实词缓存，载入到 ShiCiManager
            try {
                const cachedShici = localStorage.getItem('vocab_shici_cache') || localStorage.getItem('vocab_shici_cache_books/实词/高中300实词.json');
                if (cachedShici && typeof ShiCiManager !== 'undefined' && (!ShiCiManager.data || ShiCiManager.data.length === 0)) {
                    const parsed = JSON.parse(cachedShici);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        ShiCiManager.data = parsed;
                        ShiCiManager.bookCache['books/实词/高中300实词.json'] = parsed;
                    }
                }
            } catch (e) { }

            // 3. 兜底直接 fetch 本地实词 JSON
            if (typeof ShiCiManager !== 'undefined' && (!ShiCiManager.data || ShiCiManager.data.length === 0)) {
                try {
                    const res = await fetch('./books/实词/高中300实词.json');
                    if (res.ok) {
                        const json = await res.json();
                        if (Array.isArray(json) && json.length > 0) {
                            ShiCiManager.data = json;
                            ShiCiManager.bookCache['books/实词/高中300实词.json'] = json;
                            try { localStorage.setItem('vocab_shici_cache', JSON.stringify(json)); } catch (e) { }
                        }
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.warn('[ensureExportWordDetailsReady error]', err);
        }
    })();
    return _exportDetailsLoadingPromise;
}

/**
 * 进入“下载学习数据”页面
 */
function openExportStudyDataView() {
    if (typeof openMeSubview === 'function') {
        openMeSubview('export-data');
    }
    initExportStudyDataView();
    ensureExportWordDetailsReady().then(() => {
        collectAndFilterExportData();
        renderExportPreview();
    }).catch(() => {});
}

/**
 * 初始化导出页面默认配置
 */
function initExportStudyDataView() {
    const todayStr = getTodayDateString();
    exportCustomStartDate = todayStr;
    exportCustomEndDate = todayStr;

    const startInput = document.getElementById('export-date-start');
    const endInput = document.getElementById('export-date-end');
    if (startInput) startInput.value = todayStr;
    if (endInput) endInput.value = todayStr;

    selectExportDatePreset(exportCurrentDatePreset || 'today');
}

function getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getYesterdayDateString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * 切换日期范围预设
 */
function selectExportDatePreset(preset) {
    exportCurrentDatePreset = preset;
    document.querySelectorAll('#export-date-presets .settings-cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-range') === preset);
    });

    const customRow = document.getElementById('export-custom-date-row');
    if (customRow) {
        customRow.style.display = (preset === 'custom') ? 'flex' : 'none';
    }

    const descEl = document.getElementById('export-selected-date-desc');
    const today = getTodayDateString();

    if (preset === 'today') {
        if (descEl) descEl.textContent = `今天 (${today})`;
    } else if (preset === 'yesterday') {
        const yest = getYesterdayDateString();
        if (descEl) descEl.textContent = `昨天 (${yest})`;
    } else if (preset === 'week') {
        if (descEl) descEl.textContent = '本周内所有记录';
    } else if (preset === 'month') {
        if (descEl) descEl.textContent = '本月内所有记录';
    } else if (preset === 'all') {
        if (descEl) descEl.textContent = '历史全部学习数据';
    } else if (preset === 'custom') {
        const s = document.getElementById('export-date-start')?.value || today;
        const e = document.getElementById('export-date-end')?.value || today;
        if (descEl) descEl.textContent = `${s} 至 ${e}`;
    }

    collectAndFilterExportData();
    renderExportPreview();
}

function onExportDateRangeChanged() {
    const s = document.getElementById('export-date-start')?.value;
    const e = document.getElementById('export-date-end')?.value;
    if (s) exportCustomStartDate = s;
    if (e) exportCustomEndDate = e;

    const descEl = document.getElementById('export-selected-date-desc');
    if (descEl) descEl.textContent = `${exportCustomStartDate} 至 ${exportCustomEndDate}`;

    collectAndFilterExportData();
    renderExportPreview();
}

function toggleExportContentSection(type, checked) {
    const subfields = document.getElementById(`export-subfields-${type}`);
    if (subfields) {
        subfields.style.opacity = checked ? '1' : '0.4';
        subfields.style.pointerEvents = checked ? 'auto' : 'none';
    }
    renderExportPreview();
}

function onExportFormatChanged(fmt) {
    const sizeCol = document.getElementById('export-size-select-col');
    const themeCol = document.getElementById('export-theme-select-col');
    if (sizeCol) {
        sizeCol.style.display = (fmt === 'pdf') ? 'block' : 'none';
    }
    if (themeCol) {
        themeCol.style.display = (fmt === 'pdf') ? 'block' : 'none';
    }
    const labelEl = document.getElementById('export-download-btn-label');
    if (labelEl) {
        if (fmt === 'pdf') labelEl.textContent = '下载 PDF 文件';
        else if (fmt === 'md') labelEl.textContent = '下载 Markdown 文件';
        else if (fmt === 'txt') labelEl.textContent = '下载纯文本文件';
        else labelEl.textContent = '下载文件';
    }
    renderExportPreview();
}

/**
 * 计算选定日期区间的毫秒级范围
 */
function getSelectedTimeRange() {
    const now = new Date();
    let startTime = 0;
    let endTime = Infinity;

    if (exportCurrentDatePreset === 'today') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        startTime = d.getTime();
        endTime = startTime + 24 * 60 * 60 * 1000 - 1;
    } else if (exportCurrentDatePreset === 'yesterday') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        startTime = d.getTime();
        endTime = startTime + 24 * 60 * 60 * 1000 - 1;
    } else if (exportCurrentDatePreset === 'week') {
        const dayOfWeek = now.getDay();
        const distToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distToMonday, 0, 0, 0, 0);
        startTime = monday.getTime();
        endTime = startTime + 7 * 24 * 60 * 60 * 1000 - 1;
    } else if (exportCurrentDatePreset === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        startTime = firstDay.getTime();
        endTime = nextMonthFirst.getTime() - 1;
    } else if (exportCurrentDatePreset === 'custom') {
        const sVal = document.getElementById('export-date-start')?.value || exportCustomStartDate;
        const eVal = document.getElementById('export-date-end')?.value || exportCustomEndDate;
        if (sVal) {
            const sd = new Date(`${sVal}T00:00:00`);
            startTime = sd.getTime() || 0;
        }
        if (eVal) {
            const ed = new Date(`${eVal}T23:59:59.999`);
            endTime = ed.getTime() || Infinity;
        }
    } else {
        // all
        startTime = 0;
        endTime = Infinity;
    }

    return { startTime, endTime };
}

/**
 * 统一提取单词/实词词条的详细信息（音标/拼音、词性、释义、例句与出处）
 */
function extractWordDetails(wordKey, details, userItemMeaning) {
    let meaningStr = userItemMeaning || '';
    let posStr = '';
    let exampleStr = details.example || '';
    let sourceStr = details.source || '';
    let phoneStr = details.phone || details.usphone || details.pinyin || '';

    // 1. 实词 senses 结构解析
    if (details.senses && Array.isArray(details.senses) && details.senses.length > 0) {
        let matchedSense = null;
        if (meaningStr) {
            const cleanUserMeaning = meaningStr.replace(/[★\[\]（）()]/g, '').trim();
            matchedSense = details.senses.find(s => {
                const cleanS = (s.meaning || '').replace(/[★\[\]（）()]/g, '').trim();
                return cleanS && (cleanUserMeaning.includes(cleanS) || cleanS.includes(cleanUserMeaning));
            });
        }
        if (!matchedSense) {
            matchedSense = details.senses.find(s => s.examples && s.examples.length > 0) || details.senses[0];
        }
        if (!posStr) posStr = matchedSense.part_of_speech || matchedSense.pos || '';
        if (!meaningStr) meaningStr = (matchedSense.meaning || '').replace(/★/g, '');
        if (!exampleStr && matchedSense.examples && matchedSense.examples.length > 0) {
            exampleStr = matchedSense.examples[0].sentence || matchedSense.examples[0].text || '';
            sourceStr = matchedSense.examples[0].source || '';
        }
        if (!exampleStr) {
            for (const s of details.senses) {
                if (s.examples && s.examples.length > 0 && s.examples[0].sentence) {
                    exampleStr = s.examples[0].sentence;
                    sourceStr = s.examples[0].source || '';
                    break;
                }
            }
        }
    }

    // 2. 英语单词 meanings 结构解析
    if (details.meanings && Array.isArray(details.meanings) && details.meanings.length > 0) {
        let matchedM = null;
        if (meaningStr) {
            matchedM = details.meanings.find(m => m.meaning && (meaningStr.includes(m.meaning) || m.meaning.includes(meaningStr)));
        }
        if (!matchedM) matchedM = details.meanings[0];
        if (!posStr) posStr = matchedM.pos || '';
        if (!meaningStr) meaningStr = matchedM.meaning || '';
        if (!exampleStr && matchedM.examples && matchedM.examples.length > 0) {
            exampleStr = matchedM.examples[0].sentence || matchedM.examples[0].text || '';
        }
    }

    // 3. 顶层 examples 兼容
    if (!exampleStr && details.examples && Array.isArray(details.examples) && details.examples.length > 0) {
        const ex0 = details.examples[0];
        if (typeof ex0 === 'string') {
            exampleStr = ex0;
        } else if (ex0 && typeof ex0 === 'object') {
            exampleStr = ex0.sentence || ex0.text || '';
            if (!sourceStr) sourceStr = ex0.source || '';
        }
    }

    if (details.pinyin && !phoneStr) {
        phoneStr = details.pinyin;
    }
    return { pos: posStr, meaning: meaningStr, example: exampleStr, source: sourceStr, phone: phoneStr };
}

/**
 * 汇总并按日期范围过滤学习数据
 */
function collectAndFilterExportData() {
    const { startTime, endTime } = getSelectedTimeRange();
    const isAll = (exportCurrentDatePreset === 'all');

    // 1. 获取艾宾浩斯复习记录与已学词汇
    let ebbingRecords = {};
    if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.getRecords === 'function') {
        ebbingRecords = EbbinghausEngine.getRecords() || {};
    }

    // 2. 获取熟词本
    let masteredList = [];
    if (typeof getMasteredWords === 'function') {
        masteredList = getMasteredWords() || [];
    }

    // 3. 获取错题本
    let mistakesMap = (typeof userStats !== 'undefined' && userStats.mistakes) ? userStats.mistakes : {};

    // 4. 获取词书词典中可能存在的详细释义/例句对照
    // 4. 获取词书词典中可能存在的详细释义/例句对照（涵盖英语词书、文言实词、自定义词书与本地缓存）
    const wordDetailsCache = new Map();
    const registerWordDetail = (w) => {
        if (!w || !w.word) return;
        const key = String(w.word).trim().toLowerCase();
        if (!wordDetailsCache.has(key)) {
            wordDetailsCache.set(key, w);
        }
    };

    if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
        Object.values(BookManager.bookCache).forEach(bookWords => {
            if (Array.isArray(bookWords)) {
                bookWords.forEach(w => {
                    if (w && w.word && !wordDetailsCache.has(w.word.toLowerCase())) {
                        wordDetailsCache.set(w.word.toLowerCase(), w);
                    }
                });
            }
            if (Array.isArray(bookWords)) bookWords.forEach(registerWordDetail);
        });
    }

    if (typeof ShiCiManager !== 'undefined') {
        if (Array.isArray(ShiCiManager.data)) {
            ShiCiManager.data.forEach(registerWordDetail);
        }
        if (ShiCiManager.bookCache && typeof ShiCiManager.bookCache === 'object') {
            Object.values(ShiCiManager.bookCache).forEach(bookWords => {
                if (Array.isArray(bookWords)) bookWords.forEach(registerWordDetail);
            });
        }
    }

    if (window.customBooks && Array.isArray(window.customBooks)) {
        window.customBooks.forEach(b => {
            if (b && Array.isArray(b.words)) b.words.forEach(registerWordDetail);
        });
    }

    try {
        const rawShici = localStorage.getItem('vocab_shici_cache');
        if (rawShici) {
            const list = JSON.parse(rawShici);
            if (Array.isArray(list)) list.forEach(registerWordDetail);
        }
        for (let i = 0; i < localStorage.length; i++) {
            const lk = localStorage.key(i);
            if (lk && lk.startsWith('vocab_shici_cache_')) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(lk));
                    if (Array.isArray(parsed)) parsed.forEach(registerWordDetail);
                } catch (e) { }
            }
        }
    } catch (e) { }

    const wordsList = [];
    const phrasesList = [];
    const shiciList = [];
    const seenWords = new Set();

    // 整合已背/已复习的词条
    Object.values(ebbingRecords).forEach(rec => {
        if (!rec || !rec.word) return;
        const wordKey = rec.word.trim().toLowerCase();
        if (seenWords.has(wordKey)) return;

        const practicedTime = rec.lastPracticed || rec.updatedAt || 0;
        if (!isAll && (practicedTime < startTime || practicedTime > endTime)) {
            return;
        }

        const details = wordDetailsCache.get(wordKey) || {};
        const isChinese = Boolean(rec.isShiCi || /[\u4e00-\u9fa5]/.test(rec.word));
        const isPhrase = !isChinese && (rec.word.includes(' ') || (rec.meaning && rec.meaning.includes('词组')));

        const extracted = extractWordDetails(wordKey, details, rec.meaning);

        const item = {
            word: rec.word.trim(),
            phone: rec.phone || extracted.phone,
            pos: extracted.pos,
            meaning: extracted.meaning,
            example: extracted.example,
            source: extracted.source,
            lastPracticed: practicedTime,
            stage: rec.stage || 1,
            isShiCi: isChinese,
            isPhrase: isPhrase
        };

        seenWords.add(wordKey);

        if (isChinese) {
            shiciList.push(item);
        } else if (isPhrase) {
            phrasesList.push(item);
        } else {
            wordsList.push(item);
        }
    });

    // 整合熟词列表
    masteredList.forEach(m => {
        const wStr = (typeof m === 'string' ? m : m.word || '').trim();
        if (!wStr) return;
        const wordKey = wStr.toLowerCase();
        if (seenWords.has(wordKey)) return;

        const markedTime = (typeof m === 'object' && m.markedAt) ? m.markedAt : 0;
        if (!isAll && markedTime && (markedTime < startTime || markedTime > endTime)) {
            return;
        }

        const details = wordDetailsCache.get(wordKey) || {};
        const isChinese = Boolean((typeof m === 'object' && m.isShiCi) || /[\u4e00-\u9fa5]/.test(wStr));
        const isPhrase = !isChinese && wStr.includes(' ');

        const userMeaning = (typeof m === 'object' ? m.meaning : '') || '';
        const extracted = extractWordDetails(wordKey, details, userMeaning);

        const item = {
            word: wStr,
            phone: (typeof m === 'object' ? m.phone : '') || extracted.phone,
            pos: extracted.pos,
            meaning: extracted.meaning,
            example: extracted.example,
            source: extracted.source,
            lastPracticed: markedTime || Date.now(),
            stage: 5,
            isShiCi: isChinese,
            isPhrase: isPhrase
        };

        seenWords.add(wordKey);

        if (isChinese) {
            shiciList.push(item);
        } else if (isPhrase) {
            phrasesList.push(item);
        } else {
            wordsList.push(item);
        }
    });

    // 整合错题本
    const mistakesList = [];
    Object.keys(mistakesMap).forEach(key => {
        const m = mistakesMap[key];
        if (!m) return;
        const mTime = m.updatedAt || m.lastMistakeTime || 0;
        if (!isAll && mTime && (mTime < startTime || mTime > endTime)) {
            return;
        }

        const wordDetails = wordDetailsCache.get(key.toLowerCase()) || {};
        const wordKey = key.trim().toLowerCase();
        const details = wordDetailsCache.get(wordKey) || {};
        const isChinese = Boolean(m.isShiCi || /[\u4e00-\u9fa5]/.test(key));
        const isPhrase = !isChinese && (key.includes(' ') || (m.meaning && m.meaning.includes('词组')));

        const extracted = extractWordDetails(wordKey, details, m.meaning || m.correctAnswer);

        mistakesList.push({
            word: key.trim(),
            count: m.count || 1,
            meaning: extracted.meaning,
            phone: m.phone || extracted.phone,
            pos: extracted.pos,
            example: extracted.example,
            source: extracted.source,
            isShiCi: isChinese,
            isPhrase: isPhrase,
            wrongAnswer: m.wrongAnswer || '',
            correctAnswer: m.correctAnswer || extracted.meaning
        });
    });

    // 按掌握度或字母排序
    wordsList.sort((a, b) => a.word.localeCompare(b.word));
    phrasesList.sort((a, b) => a.word.localeCompare(b.word));
    shiciList.sort((a, b) => a.word.localeCompare(b.word, 'zh-Hans-CN'));
    mistakesList.sort((a, b) => b.count - a.count);

    exportFilteredData = {
        words: wordsList,
        phrases: phrasesList,
        shici: shiciList,
        mistakes: mistakesList
    };

    // 动态更新选项卡片上的计数 Badge
    const countWordsEl = document.getElementById('export-count-words');
    const countPhrasesEl = document.getElementById('export-count-phrases');
    const countShiciEl = document.getElementById('export-count-shici');
    const countMistakesEl = document.getElementById('export-count-mistakes');

    if (countWordsEl) countWordsEl.textContent = `${wordsList.length} 条`;
    if (countPhrasesEl) countPhrasesEl.textContent = `${phrasesList.length} 条`;
    if (countShiciEl) countShiciEl.textContent = `${shiciList.length} 条`;
    if (countMistakesEl) countMistakesEl.textContent = `${mistakesList.length} 条`;
}

const exportPhraseCache = new Map();

function escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 为单词查找包含该词的词组：
 * 1. 优先在本地与云端词书库中查找包含该词的词组 (含空格且包含目标单词)
 * 2. 如果本地无，再使用有道词典 suggest API 查找相关词组
 */
async function findRelatedPhraseForWord(targetWord) {
    if (!targetWord) return null;
    const cleanWord = targetWord.trim();
    const wordLower = cleanWord.toLowerCase();

    if (exportPhraseCache.has(wordLower)) {
        return exportPhraseCache.get(wordLower);
    }

    let localPhrase = null;
    try {
        const wordRegex = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'i');

        const scanList = (list) => {
            if (!Array.isArray(list)) return null;
            for (const item of list) {
                if (!item) continue;
                const w = (item.word || item.name || '').trim();
                if (w.includes(' ') && wordRegex.test(w) && w.toLowerCase() !== wordLower) {
                    const m = item.meaning || (item.meanings && item.meanings[0]?.meaning) || '';
                    return { phrase: w, meaning: m };
                }
            }
            return null;
        };

        if (typeof BookManager !== 'undefined') {
            if (BookManager.bookCache) {
                for (const bookWords of Object.values(BookManager.bookCache)) {
                    localPhrase = scanList(bookWords);
                    if (localPhrase) break;
                }
            }
            if (!localPhrase && Array.isArray(BookManager.availableBooks)) {
                for (const b of BookManager.availableBooks) {
                    if (b.words && Array.isArray(b.words)) {
                        localPhrase = scanList(b.words);
                        if (localPhrase) break;
                    }
                }
            }
            if (!localPhrase && Array.isArray(BookManager.dorisBooks)) {
                for (const b of BookManager.dorisBooks) {
                    if (b.words && Array.isArray(b.words)) {
                        localPhrase = scanList(b.words);
                        if (localPhrase) break;
                    }
                }
            }
        }

        if (!localPhrase && typeof window !== 'undefined' && Array.isArray(window.customBooks)) {
            for (const b of window.customBooks) {
                if (b.words && Array.isArray(b.words)) {
                    localPhrase = scanList(b.words);
                    if (localPhrase) break;
                }
            }
        }
    } catch (e) {
        console.warn('[export-data] local phrase search error', e);
    }

    if (localPhrase) {
        exportPhraseCache.set(wordLower, localPhrase);
        return localPhrase;
    }

    // 2. 本地与云端词书无，使用有道词典相关词组 (在线且非离线模式)
    if (typeof isOfflineMode === 'function' && isOfflineMode()) {
        exportPhraseCache.set(wordLower, null);
        return null;
    }

    try {
        const fetchFn = (typeof fetchYoudaoSuggestJsonp === 'function')
            ? fetchYoudaoSuggestJsonp
            : (window.fetchYoudaoSuggestJsonp || null);

        if (fetchFn) {
            const data = await fetchFn(cleanWord, 10);
            if (data && Array.isArray(data.entries)) {
                const wordRegex = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'i');
                for (const entry of data.entries) {
                    const eText = (entry.entry || '').trim();
                    if (eText.includes(' ') && wordRegex.test(eText) && eText.toLowerCase() !== wordLower) {
                        const res = { phrase: eText, meaning: entry.explain || '' };
                        exportPhraseCache.set(wordLower, res);
                        return res;
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[export-data] youdao phrase search error', err);
    }

    exportPhraseCache.set(wordLower, null);
    return null;
}

/**
 * 实时渲染文档排版预览 (支持 PDF, Markdown, TXT 实时渲染)
 */
async function renderExportPreview() {
    const paperEl = document.getElementById('export-preview-paper');
    if (!paperEl) return;

    const fmt = document.getElementById('export-format-select')?.value || 'pdf';
    const paperSize = document.getElementById('export-paper-size')?.value || 'a4';
    const themePreset = document.getElementById('export-theme-preset')?.value || 'blue';
    const docTitle = (document.getElementById('export-custom-title-input')?.value || '').trim() || '词迹 · 学习数据';

    // 选中内容项
    const showWords = document.getElementById('export-check-words')?.checked !== false;
    const showPhrases = document.getElementById('export-check-phrases')?.checked !== false;
    const showShici = document.getElementById('export-check-shici')?.checked !== false;
    const showMistakes = document.getElementById('export-check-mistakes')?.checked !== false;

    // 字段勾选项
    const fieldWordsPhone = document.getElementById('field-words-phone')?.checked !== false;
    const fieldWordsPos = document.getElementById('field-words-pos')?.checked !== false;
    const fieldWordsMeaning = document.getElementById('field-words-meaning')?.checked !== false;
    const fieldWordsExample = document.getElementById('field-words-example')?.checked !== false;

    const fieldPhrasesMeaning = document.getElementById('field-phrases-meaning')?.checked !== false;

    const fieldShiciMeaning = document.getElementById('field-shici-meaning')?.checked !== false;
    const fieldShiciExample = document.getElementById('field-shici-example')?.checked !== false;

    const fieldMistakesWrong = document.getElementById('field-mistakes-wrong')?.checked !== false;
    const fieldMistakesCorrect = document.getElementById('field-mistakes-correct')?.checked !== false;

    let totalSelectedItems = 0;
    if (showWords) totalSelectedItems += exportFilteredData.words.length;
    if (showPhrases) totalSelectedItems += exportFilteredData.phrases.length;
    if (showShici) totalSelectedItems += exportFilteredData.shici.length;
    if (showMistakes) totalSelectedItems += exportFilteredData.mistakes.length;

    const totalBadge = document.getElementById('export-live-total-badge');
    if (totalBadge) totalBadge.textContent = `共 ${totalSelectedItems} 项`;

    const dateRangeLabel = document.getElementById('export-selected-date-desc')?.textContent || '学习数据报告';

    // 例句选项勾选后，异步查找含有该词的词组（本地/云端优先，再有道）
    if (showWords && fieldWordsExample && exportFilteredData.words.length > 0) {
        const needsLookup = exportFilteredData.words.filter(w => w.relatedPhrase === undefined);
        if (needsLookup.length > 0) {
            await Promise.all(needsLookup.slice(0, 60).map(async (w) => {
                const p = await findRelatedPhraseForWord(w.word);
                w.relatedPhrase = p ? p.phrase : null;
                w.relatedPhraseMeaning = p ? p.meaning : null;
            }));
        }
    }

    // --- 分格式实时渲染 ---
    if (fmt === 'md') {
        renderMarkdownPreview(paperEl, docTitle, dateRangeLabel, {
            showWords, showPhrases, showShici, showMistakes,
            fieldWordsPhone, fieldWordsPos, fieldWordsMeaning, fieldWordsExample,
            fieldPhrasesMeaning, fieldShiciMeaning, fieldShiciExample,
            fieldMistakesWrong, fieldMistakesCorrect, totalSelectedItems
        });
        return;
    }

    if (fmt === 'txt') {
        renderTxtPreview(paperEl, docTitle, dateRangeLabel, {
            showWords, showPhrases, showShici, showMistakes,
            fieldWordsPhone, fieldWordsPos, fieldWordsMeaning, fieldWordsExample,
            fieldPhrasesMeaning, fieldShiciMeaning, fieldShiciExample,
            fieldMistakesWrong, fieldMistakesCorrect, totalSelectedItems
        });
        return;
    }

    // --- PDF 模式模拟纸张预览 ---
    paperEl.className = `export-preview-paper size-${paperSize} theme-${themePreset}`;

    // 水印栏生成 (标准模式下图标+词迹左侧，URL右侧；Toy平台下词迹+二维码居右)
    const isToy = (typeof isToyPlatform === 'function' ? isToyPlatform() : (typeof isBilibiliToy !== 'undefined' && isBilibiliToy));
    let watermarkHtml = '';

    if (isToy) {
        let toyQrBase64 = '';
        if (typeof getToyQrCodeData === 'function') {
            try {
                const qrRes = await getToyQrCodeData();
                if (qrRes && qrRes.base64) toyQrBase64 = qrRes.base64;
            } catch (e) { }
        }
        watermarkHtml = `
            <div class="pdf-watermark-bar toy-watermark">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="display:flex; flex-direction:column; line-height:1.2; text-align:right;">
                        <span style="font-weight:700; font-size:11px; color:#1e293b;">词迹</span>
                        <span style="font-size:9px; color:#64748b;">让背词更有趣</span>
                    </div>
                    ${toyQrBase64 ? `<img src="${toyQrBase64}" alt="Toy QR" style="width:34px; height:34px; border-radius:4px; border:1px solid #cbd5e1; background:#ffffff; padding:1px; object-fit:contain;">` : `<span style="font-size:9px; color:#0061a4; font-weight:600; padding:2px 6px; border:1px solid #0061a4; border-radius:4px;">Toy</span>`}
                </div>
            </div>
        `;
    } else {
        watermarkHtml = `
            <div class="pdf-watermark-bar standard-watermark">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="./assets/images/icon-web.png" alt="App Icon" style="width:22px; height:22px; border-radius:5px; object-fit:contain;">
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                        <span style="font-weight:700; font-size:11px; color:#1e293b;">词迹</span>
                        <span style="font-size:9px; color:#64748b;">让背词更有趣</span>
                    </div>
                </div>
                <span style="font-size:9px; color:#475569; padding:2px 6px; border:1px solid #cbd5e1; border-radius:4px; font-family:monospace; background:rgba(255,255,255,0.85);">https://www.bilibili.com/toy/cyr</span>
            </div>
        `;
    }

    if (totalSelectedItems === 0) {
        paperEl.innerHTML = `
            <div style="text-align:center; padding:90px 20px; color:#64748b;">
                <span class="material-symbols-rounded" style="font-size:48px; opacity:0.4;">folder_off</span>
                <h4 style="margin:12px 0 6px; font-weight:700; font-size:1.1rem; color:#334155;">所选时间段暂无学习记录</h4>
                <p style="font-size:0.88rem; margin:0 auto; max-width:320px;">
                    你可以选择“全部数据”查看历史词库，或在背词、对战后再次导出今日的学习清单。
                </p>
            </div>
            ${watermarkHtml}
        `;
        return;
    }

    // 头部大标题（已删除右侧生成日期与合计次要信息，支持自定义大标题）
    let bodyHtml = `
        <div style="border-bottom: 2px solid var(--paper-primary, #0061a4); padding-bottom: 14px; margin-bottom: 22px;">
            <h2 style="margin:0 0 6px; font-size:1.45rem; font-weight:800; color:var(--paper-primary, #0061a4); letter-spacing:-0.5px;">
                ${escapeHtml(docTitle)}
            </h2>
            <div style="font-size:0.84rem; color:#64748b;">
                <span>范围：${escapeHtml(dateRangeLabel)}</span>
            </div>
        </div>
    `;

    // 1. 单词部分
    if (showWords && exportFilteredData.words.length > 0) {
        bodyHtml += `
            <div class="pdf-section" style="margin-bottom:24px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:1.02rem; font-weight:700; color:var(--paper-primary, #0061a4);">
                    <span style="display:inline-block; width:4px; height:15px; background:var(--paper-primary, #0061a4); border-radius:2px;"></span>
                    <span>单词列表 (${exportFilteredData.words.length})</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr; gap:8px;">
                    ${exportFilteredData.words.map((item, idx) => {
                        return `
                            <div style="background:var(--paper-card-bg, #f8fafc); border:1px solid var(--paper-card-border, #e2e8f0); border-radius:6px; padding:8px 12px; font-size:0.88rem;">
                                <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
                                    <span style="font-weight:700; font-size:0.98rem; color:#0f172a;">${idx + 1}. ${escapeHtml(item.word)}</span>
                                    ${fieldWordsPhone && item.phone ? `<span style="font-size:0.82rem; color:#64748b; font-family:monospace;">${escapeHtml(item.phone)}</span>` : ''}
                                    ${fieldWordsPos && item.pos ? `<span style="font-size:0.75rem; font-weight:600; color:var(--paper-accent, #0284c7); background:rgba(2,132,199,0.08); padding:1px 5px; border-radius:3px;">${escapeHtml(item.pos)}</span>` : ''}
                                </div>
                                ${fieldWordsMeaning && item.meaning ? `<div style="color:#334155; margin-top:3px; line-height:1.45;">${escapeHtml(item.meaning)}</div>` : ''}
                                ${fieldWordsExample ? (
                                    item.relatedPhrase ? `
                                        <div style="color:#64748b; font-size:0.82rem; margin-top:3px; padding-left:8px; border-left:2px solid var(--paper-primary, #0061a4);">
                                            <strong style="color:var(--paper-primary, #0061a4); font-weight:600;">相关词组：</strong>
                                            <span style="font-weight:600; color:#334155;">${escapeHtml(item.relatedPhrase)}</span>
                                            ${item.relatedPhraseMeaning ? `<span style="color:#64748b; margin-left:6px;">(${escapeHtml(item.relatedPhraseMeaning)})</span>` : ''}
                                        </div>
                                    ` : (item.example ? `
                                        <div style="color:#64748b; font-size:0.82rem; font-style:italic; margin-top:3px; padding-left:8px; border-left:2px solid #cbd5e1;">
                                            例句：${escapeHtml(item.example)}
                                        </div>
                                    ` : '')
                                ) : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 2. 词组部分
    if (showPhrases && exportFilteredData.phrases.length > 0) {
        bodyHtml += `
            <div class="pdf-section" style="margin-bottom:24px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:1.02rem; font-weight:700; color:var(--paper-primary, #0061a4);">
                    <span style="display:inline-block; width:4px; height:15px; background:var(--paper-primary, #0061a4); border-radius:2px;"></span>
                    <span>词组与搭配 (${exportFilteredData.phrases.length})</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr; gap:8px;">
                    ${exportFilteredData.phrases.map((item, idx) => {
                        return `
                            <div style="background:var(--paper-card-bg, #f8fafc); border:1px solid var(--paper-card-border, #e2e8f0); border-radius:6px; padding:8px 12px; font-size:0.88rem;">
                                <div style="font-weight:700; font-size:0.96rem; color:#0f172a;">${idx + 1}. ${escapeHtml(item.word)}</div>
                                ${fieldPhrasesMeaning && item.meaning ? `<div style="color:#334155; margin-top:2px;">${escapeHtml(item.meaning)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 3. 实词部分 (使用页面统一字体，不使用 serif)
    if (showShici && exportFilteredData.shici.length > 0) {
        bodyHtml += `
            <div class="pdf-section" style="margin-bottom:24px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:1.02rem; font-weight:700; color:var(--paper-primary, #0061a4);">
                    <span style="display:inline-block; width:4px; height:15px; background:var(--paper-primary, #0061a4); border-radius:2px;"></span>
                    <span>文言实词 (${exportFilteredData.shici.length})</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr; gap:8px;">
                    ${exportFilteredData.shici.map((item, idx) => {
                        return `
                            <div style="background:var(--paper-card-bg, #f8fafc); border:1px solid var(--paper-card-border, #e2e8f0); border-radius:6px; padding:9px 12px; font-size:0.88rem;">
                                <div style="display:flex; align-items:baseline; gap:8px;">
                                    <span style="font-weight:700; font-size:1.02rem; color:var(--paper-primary, #0061a4);">${idx + 1}. ${escapeHtml(item.word)}</span>
                                    ${item.phone ? `<span style="font-size:0.82rem; color:#64748b;">[${escapeHtml(item.phone)}]</span>` : ''}
                                </div>
                                ${fieldShiciMeaning && item.meaning ? `<div style="color:#334155; margin-top:3px; line-height:1.45;"><strong>释义：</strong>${escapeHtml(item.meaning)}</div>` : ''}
                                ${fieldShiciExample && item.example ? `<div style="color:#475569; font-size:0.84rem; margin-top:4px; padding:4px 8px; background:rgba(0,0,0,0.02); border-radius:4px;">“${escapeHtml(item.example)}” ${item.source ? `<span style="color:#94a3b8; font-size:0.78rem;">—— ${escapeHtml(item.source)}</span>` : ''}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // 4. 错题部分
    if (showMistakes && exportFilteredData.mistakes.length > 0) {
        bodyHtml += `
            <div class="pdf-section" style="margin-bottom:24px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:1.02rem; font-weight:700; color:#ba1a1a;">
                    <span style="display:inline-block; width:4px; height:15px; background:#ba1a1a; border-radius:2px;"></span>
                    <span>错题归纳 (${exportFilteredData.mistakes.length})</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr; gap:8px;">
                    ${exportFilteredData.mistakes.map((item, idx) => {
                        return `
                            <div style="background:var(--paper-card-bg, #f8fafc); border:1px solid var(--paper-card-border, #e2e8f0); border-left:3px solid #ba1a1a; border-radius:6px; padding:8px 12px; font-size:0.88rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-weight:700; font-size:0.96rem; color:#0f172a;">${idx + 1}. ${escapeHtml(item.word)}</span>
                                    <span style="font-size:0.75rem; color:#ba1a1a; font-weight:600; background:rgba(239,68,68,0.08); padding:1px 6px; border-radius:9999px;">错 ${item.count} 次</span>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:3px; margin-top:4px;">
                                    ${fieldMistakesWrong ? `<div style="font-size:0.82rem; color:#e11d48;"><strong style="font-weight:600;">错误搭配：</strong>${escapeHtml(item.wrongAnswer || '---')}</div>` : ''}
                                    ${fieldMistakesCorrect ? `<div style="font-size:0.82rem; color:#15803d;"><strong style="font-weight:600;">正确搭配：</strong>${escapeHtml(item.correctAnswer || item.meaning || '---')}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    bodyHtml += watermarkHtml;
    paperEl.innerHTML = bodyHtml;
}

/**
 * 渲染 Markdown 实时预览
 */
function renderMarkdownPreview(paperEl, docTitle, dateRangeLabel, opts) {
    paperEl.className = 'export-markdown-preview';
    const mdText = generateMarkdownExportContent(docTitle, dateRangeLabel, opts);

    let html = `
        <div style="border-bottom: 2px solid var(--md-sys-color-primary, #0061a4); padding-bottom: 12px; margin-bottom: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h1 style="margin:0 0 6px; font-size:1.45rem; font-weight:800; color:var(--md-sys-color-primary, #0061a4);">${escapeHtml(docTitle)}</h1>
                <span class="badge" style="background:var(--md-sys-color-surface-container-high); font-size:0.78rem;">Markdown 预览</span>
            </div>
            <div style="font-size:0.84rem; color:#64748b; margin-top:4px; padding:6px 10px; background:#f8fafc; border-left:3px solid #cbd5e1; border-radius:3px;">
                范围：${escapeHtml(dateRangeLabel)}
            </div>
        </div>
    `;

    if (opts.totalSelectedItems === 0) {
        html += `<div style="text-align:center; padding:60px 20px; color:#64748b;">所选时间段暂无学习记录</div>`;
        paperEl.innerHTML = html;
        return;
    }

    if (opts.showWords && exportFilteredData.words.length > 0) {
        html += `<h2 style="font-size:1.1rem; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin:20px 0 12px;">## 单词列表 (${exportFilteredData.words.length})</h2><div style="display:flex; flex-direction:column; gap:8px;">`;
        exportFilteredData.words.forEach((w, i) => {
            html += `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:0.88rem;">`;
            html += `<div><strong>${i + 1}. ${escapeHtml(w.word)}</strong> ${opts.fieldWordsPhone && w.phone ? `<code style="background:#e2e8f0; padding:1px 4px; border-radius:3px; font-size:0.82rem;">${escapeHtml(w.phone)}</code>` : ''} ${opts.fieldWordsPos && w.pos ? `<em>${escapeHtml(w.pos)}</em>` : ''}</div>`;
            if (opts.fieldWordsMeaning && w.meaning) html += `<div style="color:#334155; margin-top:2px;">• 释义：${escapeHtml(w.meaning)}</div>`;
            if (opts.fieldWordsExample) {
                if (w.relatedPhrase) {
                    html += `<div style="color:#0061a4; margin-top:2px; font-size:0.82rem;">• 相关词组：<strong>${escapeHtml(w.relatedPhrase)}</strong> ${w.relatedPhraseMeaning ? `(${escapeHtml(w.relatedPhraseMeaning)})` : ''}</div>`;
                } else if (w.example) {
                    html += `<div style="color:#64748b; margin-top:2px; font-size:0.82rem;">• 例句：${escapeHtml(w.example)}</div>`;
                }
            }
            html += `</div>`;
        });
        html += `</div>`;
    }

    if (opts.showPhrases && exportFilteredData.phrases.length > 0) {
        html += `<h2 style="font-size:1.1rem; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin:24px 0 12px;">## 词组列表 (${exportFilteredData.phrases.length})</h2><div style="display:flex; flex-direction:column; gap:8px;">`;
        exportFilteredData.phrases.forEach((p, i) => {
            html += `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:0.88rem;"><strong>${i + 1}. ${escapeHtml(p.word)}</strong>：${escapeHtml(p.meaning)}</div>`;
        });
        html += `</div>`;
    }

    if (opts.showShici && exportFilteredData.shici.length > 0) {
        html += `<h2 style="font-size:1.1rem; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin:24px 0 12px;">## 文言实词 (${exportFilteredData.shici.length})</h2><div style="display:flex; flex-direction:column; gap:8px;">`;
        exportFilteredData.shici.forEach((s, i) => {
            html += `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:0.88rem;">`;
            html += `<div><strong>${i + 1}. ${escapeHtml(s.word)}</strong> ${s.phone ? `[${escapeHtml(s.phone)}]` : ''}</div>`;
            if (opts.fieldShiciMeaning && s.meaning) html += `<div style="color:#334155; margin-top:2px;">• 释义：${escapeHtml(s.meaning)}</div>`;
            if (opts.fieldShiciExample && s.example) html += `<div style="color:#64748b; margin-top:2px; font-size:0.82rem;">• 出处：“${escapeHtml(s.example)}” ${s.source ? `—— ${escapeHtml(s.source)}` : ''}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    }

    if (opts.showMistakes && exportFilteredData.mistakes.length > 0) {
        html += `<h2 style="font-size:1.1rem; color:#ba1a1a; border-bottom:1px solid #fed7aa; padding-bottom:6px; margin:24px 0 12px;">## 错题汇总 (${exportFilteredData.mistakes.length})</h2><div style="display:flex; flex-direction:column; gap:8px;">`;
        exportFilteredData.mistakes.forEach((m, i) => {
            html += `<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:8px 12px; font-size:0.88rem;">`;
            html += `<div style="display:flex; justify-content:space-between;"><strong>${i + 1}. ${escapeHtml(m.word)}</strong> <span style="color:#ba1a1a; font-size:0.78rem;">错 ${m.count} 次</span></div>`;
            if (opts.fieldMistakesWrong) html += `<div style="color:#e11d48; font-size:0.82rem; margin-top:2px;">• 错误搭配：${escapeHtml(m.wrongAnswer || '---')}</div>`;
            if (opts.fieldMistakesCorrect) html += `<div style="color:#15803d; font-size:0.82rem; margin-top:2px;">• 正确搭配：${escapeHtml(m.correctAnswer || m.meaning || '---')}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
    }

    // 附带源码折叠面板
    html += `
        <details style="margin-top:26px; border:1px solid #cbd5e1; border-radius:6px; padding:10px 14px; background:#f1f5f9;">
            <summary style="cursor:pointer; font-weight:600; font-size:0.85rem; color:#475569;">查看原始 Markdown 代码</summary>
            <pre style="margin-top:10px; font-size:0.8rem; line-height:1.5; white-space:pre-wrap; background:#ffffff; padding:12px; border-radius:4px; border:1px solid #e2e8f0; max-height:280px; overflow-y:auto;">${escapeHtml(mdText)}</pre>
        </details>
    `;

    paperEl.innerHTML = html;
}

/**
 * 渲染纯文本 TXT 实时预览
 */
function renderTxtPreview(paperEl, docTitle, dateRangeLabel, opts) {
    paperEl.className = 'export-txt-preview';
    const txt = generateTxtExportContent(docTitle, dateRangeLabel, opts);
    paperEl.innerHTML = `<pre style="font-family:inherit; margin:0; line-height:1.55; white-space:pre-wrap; word-break:break-word;">${escapeHtml(txt)}</pre>`;
}

/**
 * 生成 Markdown 字符串
 */
function generateMarkdownExportContent(docTitle, dateRangeLabel, opts) {
    const showWords = opts ? opts.showWords : (document.getElementById('export-check-words')?.checked !== false);
    const showPhrases = opts ? opts.showPhrases : (document.getElementById('export-check-phrases')?.checked !== false);
    const showShici = opts ? opts.showShici : (document.getElementById('export-check-shici')?.checked !== false);
    const showMistakes = opts ? opts.showMistakes : (document.getElementById('export-check-mistakes')?.checked !== false);

    const fieldWordsPhone = opts ? opts.fieldWordsPhone : (document.getElementById('field-words-phone')?.checked !== false);
    const fieldWordsPos = opts ? opts.fieldWordsPos : (document.getElementById('field-words-pos')?.checked !== false);
    const fieldWordsMeaning = opts ? opts.fieldWordsMeaning : (document.getElementById('field-words-meaning')?.checked !== false);
    const fieldWordsExample = opts ? opts.fieldWordsExample : (document.getElementById('field-words-example')?.checked !== false);

    const fieldPhrasesMeaning = opts ? opts.fieldPhrasesMeaning : (document.getElementById('field-phrases-meaning')?.checked !== false);

    const fieldShiciMeaning = opts ? opts.fieldShiciMeaning : (document.getElementById('field-shici-meaning')?.checked !== false);
    const fieldShiciExample = opts ? opts.fieldShiciExample : (document.getElementById('field-shici-example')?.checked !== false);

    const fieldMistakesWrong = opts ? opts.fieldMistakesWrong : (document.getElementById('field-mistakes-wrong')?.checked !== false);
    const fieldMistakesCorrect = opts ? opts.fieldMistakesCorrect : (document.getElementById('field-mistakes-correct')?.checked !== false);

    let md = `# ${docTitle}\n\n`;
    md += `> 范围：${dateRangeLabel}\n\n`;

    if (showWords && exportFilteredData.words.length > 0) {
        md += `## 单词列表 (${exportFilteredData.words.length})\n\n`;
        exportFilteredData.words.forEach((w, i) => {
            md += `${i + 1}. **${w.word}** ${fieldWordsPhone && w.phone ? `\`${w.phone}\`` : ''} ${fieldWordsPos && w.pos ? `*${w.pos}*` : ''}\n`;
            if (fieldWordsMeaning && w.meaning) md += `   - 释义：${w.meaning}\n`;
            if (fieldWordsExample) {
                if (w.relatedPhrase) {
                    md += `   - 相关词组：**${w.relatedPhrase}** ${w.relatedPhraseMeaning ? `(${w.relatedPhraseMeaning})` : ''}\n`;
                } else if (w.example) {
                    md += `   - 例句：${w.example}\n`;
                }
            }
        });
        md += `\n`;
    }

    if (showPhrases && exportFilteredData.phrases.length > 0) {
        md += `## 词组列表 (${exportFilteredData.phrases.length})\n\n`;
        exportFilteredData.phrases.forEach((p, i) => {
            md += `${i + 1}. **${p.word}**${fieldPhrasesMeaning && p.meaning ? `：${p.meaning}` : ''}\n`;
        });
        md += `\n`;
    }

    if (showShici && exportFilteredData.shici.length > 0) {
        md += `## 文言实词 (${exportFilteredData.shici.length})\n\n`;
        exportFilteredData.shici.forEach((s, i) => {
            md += `${i + 1}. **${s.word}** ${s.phone ? `[${s.phone}]` : ''}\n`;
            if (fieldShiciMeaning && s.meaning) md += `   - 释义：${s.meaning}\n`;
            if (fieldShiciExample && s.example) md += `   - 出处：“${s.example}” ${s.source ? `—— ${s.source}` : ''}\n`;
        });
        md += `\n`;
    }

    if (showMistakes && exportFilteredData.mistakes.length > 0) {
        md += `## 错题汇总 (${exportFilteredData.mistakes.length})\n\n`;
        exportFilteredData.mistakes.forEach((m, i) => {
            md += `${i + 1}. **${m.word}** (错 ${m.count} 次)\n`;
            if (fieldMistakesWrong) md += `   - 错误搭配：${m.wrongAnswer || '---'}\n`;
            if (fieldMistakesCorrect) md += `   - 正确搭配：${m.correctAnswer || m.meaning || '---'}\n`;
        });
        md += `\n`;
    }

    return md;
}

/**
 * 生成纯文本 TXT 字符串
 */
function generateTxtExportContent(docTitle, dateRangeLabel, opts) {
    const showWords = opts ? opts.showWords : (document.getElementById('export-check-words')?.checked !== false);
    const showPhrases = opts ? opts.showPhrases : (document.getElementById('export-check-phrases')?.checked !== false);
    const showShici = opts ? opts.showShici : (document.getElementById('export-check-shici')?.checked !== false);
    const showMistakes = opts ? opts.showMistakes : (document.getElementById('export-check-mistakes')?.checked !== false);

    const fieldWordsPhone = opts ? opts.fieldWordsPhone : (document.getElementById('field-words-phone')?.checked !== false);
    const fieldWordsPos = opts ? opts.fieldWordsPos : (document.getElementById('field-words-pos')?.checked !== false);
    const fieldWordsMeaning = opts ? opts.fieldWordsMeaning : (document.getElementById('field-words-meaning')?.checked !== false);
    const fieldWordsExample = opts ? opts.fieldWordsExample : (document.getElementById('field-words-example')?.checked !== false);

    const fieldPhrasesMeaning = opts ? opts.fieldPhrasesMeaning : (document.getElementById('field-phrases-meaning')?.checked !== false);

    const fieldShiciMeaning = opts ? opts.fieldShiciMeaning : (document.getElementById('field-shici-meaning')?.checked !== false);
    const fieldShiciExample = opts ? opts.fieldShiciExample : (document.getElementById('field-shici-example')?.checked !== false);

    const fieldMistakesWrong = opts ? opts.fieldMistakesWrong : (document.getElementById('field-mistakes-wrong')?.checked !== false);
    const fieldMistakesCorrect = opts ? opts.fieldMistakesCorrect : (document.getElementById('field-mistakes-correct')?.checked !== false);

    let txt = `============================================================\n`;
    txt += `${docTitle}\n`;
    txt += `范围：${dateRangeLabel}\n`;
    txt += `============================================================\n\n`;

    if (showWords && exportFilteredData.words.length > 0) {
        txt += `[ 单词列表 ] (共 ${exportFilteredData.words.length} 条)\n`;
        txt += `------------------------------------------------------------\n`;
        exportFilteredData.words.forEach((w, i) => {
            txt += `${i + 1}. ${w.word} ${fieldWordsPhone && w.phone ? `[${w.phone}]` : ''} ${fieldWordsPos && w.pos ? `[${w.pos}]` : ''}\n`;
            if (fieldWordsMeaning && w.meaning) txt += `   释义: ${w.meaning}\n`;
            if (fieldWordsExample) {
                if (w.relatedPhrase) {
                    txt += `   相关词组: ${w.relatedPhrase} ${w.relatedPhraseMeaning ? `(${w.relatedPhraseMeaning})` : ''}\n`;
                } else if (w.example) {
                    txt += `   例句: ${w.example}\n`;
                }
            }
        });
        txt += `\n`;
    }

    if (showPhrases && exportFilteredData.phrases.length > 0) {
        txt += `[ 词组列表 ] (共 ${exportFilteredData.phrases.length} 条)\n`;
        txt += `------------------------------------------------------------\n`;
        exportFilteredData.phrases.forEach((p, i) => {
            txt += `${i + 1}. ${p.word}${fieldPhrasesMeaning && p.meaning ? ` : ${p.meaning}` : ''}\n`;
        });
        txt += `\n`;
    }

    if (showShici && exportFilteredData.shici.length > 0) {
        txt += `[ 文言实词 ] (共 ${exportFilteredData.shici.length} 条)\n`;
        txt += `------------------------------------------------------------\n`;
        exportFilteredData.shici.forEach((s, i) => {
            txt += `${i + 1}. ${s.word} ${s.phone ? `[${s.phone}]` : ''}\n`;
            if (fieldShiciMeaning && s.meaning) txt += `   释义: ${s.meaning}\n`;
            if (fieldShiciExample && s.example) txt += `   出处: “${s.example}” ${s.source ? `—— ${s.source}` : ''}\n`;
        });
        txt += `\n`;
    }

    if (showMistakes && exportFilteredData.mistakes.length > 0) {
        txt += `[ 错题汇总 ] (共 ${exportFilteredData.mistakes.length} 条)\n`;
        txt += `------------------------------------------------------------\n`;
        exportFilteredData.mistakes.forEach((m, i) => {
            txt += `${i + 1}. ${m.word} (错 ${m.count} 次)\n`;
            if (fieldMistakesWrong) txt += `   错误搭配: ${m.wrongAnswer || '---'}\n`;
            if (fieldMistakesCorrect) txt += `   正确搭配: ${m.correctAnswer || m.meaning || '---'}\n`;
        });
        txt += `\n`;
    }

    return txt;
}

/**
 * 导出 PDF / 启动高保真打印
 */
async function exportStudyDataPDF() {
    await renderExportPreview();

    const paperEl = document.getElementById('export-preview-paper');
    if (!paperEl) return;

    const paperSize = document.getElementById('export-paper-size')?.value || 'a4';
    const themePreset = document.getElementById('export-theme-preset')?.value || 'blue';
    const docTitle = (document.getElementById('export-custom-title-input')?.value || '').trim() || '词迹 · 学习数据';

    const isToy = (typeof isToyPlatform === 'function' ? isToyPlatform() : (typeof isBilibiliToy !== 'undefined' && isBilibiliToy));
    let watermarkCornerHtml = '';

    if (isToy) {
        let toyQrBase64 = '';
        if (typeof getToyQrCodeData === 'function') {
            try {
                const qrRes = await getToyQrCodeData();
                if (qrRes && qrRes.base64) toyQrBase64 = qrRes.base64;
            } catch (e) { }
        }
        watermarkCornerHtml = `
            <div class="print-page-watermark toy-watermark">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="display:flex; flex-direction:column; line-height:1.2; text-align:right;">
                        <span style="font-weight:700; font-size:11px; color:#1e293b;">词迹</span>
                        <span style="font-size:9px; color:#64748b;">让背词更有趣</span>
                    </div>
                    ${toyQrBase64 ? `<img src="${toyQrBase64}" alt="Toy QR" style="width:34px; height:34px; border-radius:4px; border:1px solid #cbd5e1; background:#ffffff; padding:1px;">` : `<span style="font-size:9px; color:#0061a4; font-weight:600; padding:2px 6px; border:1px solid #0061a4; border-radius:4px;">Toy</span>`}
                </div>
            </div>
        `;
    } else {
        watermarkCornerHtml = `
            <div class="print-page-watermark standard-watermark">
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="./assets/images/icon-web.png" alt="App Icon" style="width:22px; height:22px; border-radius:5px; object-fit:contain;">
                    <div style="display:flex; flex-direction:column; line-height:1.2;">
                        <span style="font-weight:700; font-size:11px; color:#1e293b;">词迹</span>
                        <span style="font-size:9px; color:#64748b;">让背词更有趣</span>
                    </div>
                </div>
                <span style="font-size:9px; color:#475569; padding:2px 6px; border:1px solid #cbd5e1; border-radius:4px; font-family:monospace; background:rgba(255,255,255,0.85);">https://www.bilibili.com/toy/cyr</span>
            </div>
        `;
    }

    // 克隆纸张内容作为打印体
    const printContentHtml = paperEl.innerHTML;

    // 创建隔离打印 iframe
    let printIframe = document.getElementById('export-print-hidden-frame');
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'export-print-hidden-frame';
        printIframe.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:0; height:0; border:none;';
        document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${escapeHtml(docTitle)}</title>
            <style>
                @page {
                    size: ${paperSize} portrait;
                    margin: 12mm 15mm 16mm 15mm;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff;
                    color: #1e293b;
                    font-family: 'Google Sans', 'Roboto', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
                    line-height: 1.5;
                }
                .theme-blue {
                    --paper-primary: #0061a4;
                    --paper-accent: #0284c7;
                    --paper-card-bg: #f8fafc;
                    --paper-card-border: #e2e8f0;
                }
                .theme-minimal {
                    --paper-primary: #0f172a;
                    --paper-accent: #334155;
                    --paper-card-bg: #ffffff;
                    --paper-card-border: #cbd5e1;
                }
                .theme-green {
                    --paper-primary: #0f766e;
                    --paper-accent: #059669;
                    --paper-card-bg: #f0fdf4;
                    --paper-card-border: #bbf7d0;
                }
                .theme-warm {
                    --paper-primary: #9a3412;
                    --paper-accent: #ea580c;
                    --paper-card-bg: #fffbeb;
                    --paper-card-border: #fed7aa;
                }
                .pdf-section {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .print-page-watermark {
                    position: fixed;
                    bottom: 4mm;
                    left: 15mm;
                    right: 15mm;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    pointer-events: none;
                    user-select: none;
                }
                .print-page-watermark.toy-watermark {
                    justify-content: flex-end;
                }
                .pdf-watermark-bar {
                    display: none !important;
                }
            </style>
        </head>
        <body class="theme-${themePreset}">
            <div style="padding: 10px 0;">
                ${printContentHtml}
            </div>
            ${watermarkCornerHtml}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        try {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        } catch (e) {
            console.warn('[exportStudyDataPDF print error]', e);
            window.print();
        }
    }, 400);
}

/**
 * 导出 Markdown 文件
 */
function exportStudyDataMarkdown() {
    const dateLabel = document.getElementById('export-selected-date-desc')?.textContent || '学习数据';
    const docTitle = (document.getElementById('export-custom-title-input')?.value || '').trim() || '词迹 · 学习数据';
    const dateStr = getTodayDateString();
    const md = generateMarkdownExportContent(docTitle, dateLabel);
    const safeTitle = docTitle.replace(/[/\\?%*:|"<>]/g, '_');
    downloadFileBlob(md, `${safeTitle}_${dateStr}.md`, 'text/markdown;charset=utf-8');
}

/**
 * 导出纯文本 TXT 文件
 */
function exportStudyDataTxt() {
    const dateLabel = document.getElementById('export-selected-date-desc')?.textContent || '学习数据';
    const docTitle = (document.getElementById('export-custom-title-input')?.value || '').trim() || '词迹 · 学习数据';
    const dateStr = getTodayDateString();
    const txt = generateTxtExportContent(docTitle, dateLabel);
    const safeTitle = docTitle.replace(/[/\\?%*:|"<>]/g, '_');
    downloadFileBlob(txt, `${safeTitle}_${dateStr}.txt`, 'text/plain;charset=utf-8');
}

/**
 * 根据当前选择的格式（PDF / MD / TXT）一键下载对应文件
 */
function handleExportDownloadClick() {
    const fmt = document.getElementById('export-format-select')?.value || 'pdf';
    if (fmt === 'pdf') {
        exportStudyDataPDF();
    } else if (fmt === 'md') {
        exportStudyDataMarkdown();
    } else if (fmt === 'txt') {
        exportStudyDataTxt();
    }
}

function downloadFileBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 150);
    showToast(`已开始下载 ${filename}`);
}

// 全局暴露
window.openExportStudyDataView = openExportStudyDataView;
window.selectExportDatePreset = selectExportDatePreset;
window.onExportDateRangeChanged = onExportDateRangeChanged;
window.toggleExportContentSection = toggleExportContentSection;
window.onExportFormatChanged = onExportFormatChanged;
window.renderExportPreview = renderExportPreview;
window.exportStudyDataPDF = exportStudyDataPDF;
window.handleStartExportPDF = exportStudyDataPDF;
window.exportStudyDataMarkdown = exportStudyDataMarkdown;
window.exportStudyDataTxt = exportStudyDataTxt;
window.handleExportDownloadClick = handleExportDownloadClick;
window.findRelatedPhraseForWord = findRelatedPhraseForWord;

