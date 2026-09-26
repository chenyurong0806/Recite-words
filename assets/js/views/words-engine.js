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
    if (clean === '=' || clean === '/') return true;
    if (clean.includes('/')) return false;
    // 带有括号、以括号开头结尾的说明词（如 (someone)、(sb.)、(sth.)、(...)、( ) 等）
    if (/^[（(].*[）)]$/.test(clean) || clean === '()' || clean === '（）') return true;
    // 纯符号或常见连接符（等号、斜杠、逗号、波浪号、省略号等）
    if (/^[=,，~…\.\-/]+$/.test(clean)) return true;
    // 常见语法占位固定项自动预填
    const fixedSet = new Set([
        '...', '…', '……',
        'sb.', 'sb', "sb's", 'sbs',
        'sth.', 'sth',
        "one's", "one’s", 'ones',
        '=', ',', '/'
    ]);
    return fixedSet.has(clean) || clean.startsWith('...');
}

function extractPhraseTargetWords(rawWord) {
    if (!rawWord) return [];
    let str = rawWord.trim();

    // 将等号、斜杠、逗号隔开独立成 token
    str = str.replace(/([=,，/])/g, ' $1 ');
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

// 判定词组作答是否正确（支持带有 =、/ 的题目左右两边互换）
function isPhraseAnswerMatching(placedWords, targetWords) {
    if (!Array.isArray(placedWords) || !Array.isArray(targetWords)) return false;
    if (placedWords.length !== targetWords.length) return false;

    const pLower = placedWords.map(w => (w || '').trim().toLowerCase());
    const tLower = targetWords.map(w => (w || '').trim().toLowerCase());

    // 1. 完全一致
    if (pLower.join(' ') === tLower.join(' ')) {
        return true;
    }

    // 2. 带有 '=' 或 '/' 的词组，左右两边互换也算对
    const separators = ['=', '/'];
    for (const sep of separators) {
        if (tLower.includes(sep)) {
            const targetSegments = [];
            let curSeg = [];
            for (const token of tLower) {
                if (token === sep) {
                    targetSegments.push(curSeg.join(' '));
                    curSeg = [];
                } else {
                    curSeg.push(token);
                }
            }
            targetSegments.push(curSeg.join(' '));

            const placedSegments = [];
            curSeg = [];
            let placedSepMatches = true;
            for (let i = 0; i < pLower.length; i++) {
                if (tLower[i] === sep) {
                    if (pLower[i] !== sep) {
                        placedSepMatches = false;
                        break;
                    }
                    placedSegments.push(curSeg.join(' '));
                    curSeg = [];
                } else {
                    curSeg.push(pLower[i]);
                }
            }
            placedSegments.push(curSeg.join(' '));

            if (!placedSepMatches || placedSegments.length !== targetSegments.length) {
                continue;
            }

            const sortedTarget = [...targetSegments].sort();
            const sortedPlaced = [...placedSegments].sort();
            if (sortedTarget.join('::') === sortedPlaced.join('::')) {
                return true;
            }

            // 嵌套分隔符（如 A = B / C）内部互换匹配
            const otherSep = (sep === '=' ? '/' : '=');
            const normalizeSegment = (seg) => {
                if (seg.includes(otherSep)) {
                    return seg.split(otherSep).map(s => s.trim()).sort().join(` ${otherSep} `);
                }
                return seg;
            };
            const deepSortedTarget = targetSegments.map(normalizeSegment).sort();
            const deepSortedPlaced = placedSegments.map(normalizeSegment).sort();
            if (deepSortedTarget.join('::') === deepSortedPlaced.join('::')) {
                return true;
            }
        }
    }

    return false;
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

