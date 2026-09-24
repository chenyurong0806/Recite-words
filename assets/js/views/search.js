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