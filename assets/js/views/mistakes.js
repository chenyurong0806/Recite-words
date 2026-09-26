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

        const currentDict = (typeof dictionary !== 'undefined' && Array.isArray(dictionary)) ? dictionary : [];
        const pool = words.map(w => {
            const item = currentDict.find(d => d.word === w) || { phone: '' };
            const optData = generateOptions(w, mistakes[w].meaning, currentDict.length >= 4 ? currentDict : (typeof DEFAULT_WORDS !== 'undefined' ? DEFAULT_WORDS : []));
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

