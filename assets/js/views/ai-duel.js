/**
 * 人机对战引擎 (拔河机制 & 段位匹配)
 * Module: assets/js/views/ai-duel.js
 */

/* ==========================================================================
   7. 人机对战核心引擎 (AI DUEL WITH TUG-OF-WAR & RANK MATCHING)
   ========================================================================== */
let aiDuelConfig = {
    selectedBooks: ['books/考纲/高考3500.json'],
    matchType: 'ranked', // 'ranked' (排位赛) | 'friendly' (友谊赛)
    aiRank: 1, // 1段 ~ 9段
    speedMode: 'smart',
    mode: 'lead', // 默认为拔河不限时模式 ('lead' 或 'timed')
    winLead: 6,
    duration: 60
};

try {
    const savedAi = JSON.parse(localStorage.getItem('vocab_ai_duel_config') || '{}');
    if (savedAi) {
        Object.assign(aiDuelConfig, savedAi);
        // 确保过滤掉本地自定义词书
        if (Array.isArray(aiDuelConfig.selectedBooks)) {
            aiDuelConfig.selectedBooks = aiDuelConfig.selectedBooks.filter(id => !String(id).startsWith('custom_') && id !== 'builtin_default');
            if (aiDuelConfig.selectedBooks.length === 0) {
                aiDuelConfig.selectedBooks = ['books/考纲/高考3500.json'];
            }
        }
        if (typeof aiDuelConfig.aiRank !== 'number') {
            aiDuelConfig.aiRank = 1;
        }
        aiDuelConfig.aiRank = Math.max(1, Math.min(9, aiDuelConfig.aiRank));
        if (!aiDuelConfig.matchType) aiDuelConfig.matchType = 'ranked';
    }
} catch (e) { }

function selectAiRule(rule) {
    aiDuelConfig.mode = rule;
    if (aiDuelConfig.matchType === 'ranked') {
        if (rule === 'lead') {
            aiDuelConfig.winLead = 6;
        } else if (rule === 'timed') {
            aiDuelConfig.duration = 120;
        }
    }
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiMatchType(type) {
    if (type === 'ranked') {
        const isGuest = (typeof LevelManager !== 'undefined') ? LevelManager.isGuestUser(currentUser) : (!currentUser || currentUser.startsWith('游客'));
        if (isGuest) {
            showToast('游客禁止参与排位赛，请先登录账号');
            return;
        }
    }
    aiDuelConfig.matchType = type;
    const userRank = (typeof LevelManager !== 'undefined') ? LevelManager.getUserLevel(currentUser) : 1;
    if (type === 'ranked') {
        const minR = Math.max(1, userRank - 1);
        const maxR = Math.min(9, userRank + 1);
        if (aiDuelConfig.aiRank < minR || aiDuelConfig.aiRank > maxR) {
            aiDuelConfig.aiRank = userRank;
        }
        aiDuelConfig.speedMode = 'smart';
        if (aiDuelConfig.mode === 'lead') {
            aiDuelConfig.winLead = 6;
        } else if (aiDuelConfig.mode === 'timed') {
            aiDuelConfig.duration = 120;
        }
    }
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}
window.selectAiMatchType = selectAiMatchType;

function handleAiDifficultySliderChange(val) {
    let num = Math.max(1, Math.min(9, parseInt(val) || 1));
    const userRank = (typeof LevelManager !== 'undefined') ? LevelManager.getUserLevel(currentUser) : 1;
    if (aiDuelConfig.matchType === 'ranked') {
        const minR = Math.max(1, userRank - 1);
        const maxR = Math.min(9, userRank + 1);
        if (num < minR) {
            num = minR;
        } else if (num > maxR) {
            num = maxR;
        }
        const slider = document.getElementById('ai-difficulty-slider');
        if (slider && parseInt(slider.value) !== num) {
            slider.value = num;
        }
    }
    aiDuelConfig.aiRank = num;
    const disp = document.getElementById('ai-difficulty-display');
    if (disp) disp.innerText = `${num}段`;
    updateAiDuelSliderHint();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}
window.handleAiDifficultySliderChange = handleAiDifficultySliderChange;

let aiDuelState = {
    pool: [],
    aiIdx: 0,
    aiScore: 0,
    aiFrozenUntil: 0
};
let aiDuelTimer = null;
window.aiDuelTimer = null;

function openAiDuelSettings() {
    const modal = document.getElementById('modal-ai-duel-settings');
    if (!modal) return;

    // 清理可能误存的本地词书
    if (Array.isArray(aiDuelConfig.selectedBooks)) {
        aiDuelConfig.selectedBooks = aiDuelConfig.selectedBooks.filter(id => !String(id).startsWith('custom_') && id !== 'builtin_default');
        if (aiDuelConfig.selectedBooks.length === 0) {
            aiDuelConfig.selectedBooks = ['books/考纲/高考3500.json'];
        }
    }

    // 游客禁止参与排位赛
    const isGuest = (typeof LevelManager !== 'undefined') ? LevelManager.isGuestUser(currentUser) : (!currentUser || currentUser.startsWith('游客'));
    if (isGuest) {
        aiDuelConfig.matchType = 'friendly';
    }

    // 初始化段位：如果在排位赛，限制在玩家段位 ±1 段以内
    const userRank = (typeof LevelManager !== 'undefined') ? LevelManager.getUserLevel(currentUser) : 1;
    if (aiDuelConfig.matchType === 'ranked') {
        const minR = Math.max(1, userRank - 1);
        const maxR = Math.min(9, userRank + 1);
        if (aiDuelConfig.aiRank < minR || aiDuelConfig.aiRank > maxR) {
            aiDuelConfig.aiRank = userRank;
        }
    }

    updateAiDuelBookSummaryUI();
    updateAiDuelSettingsChips();
    modal.classList.add('active');
}

function closeAiDuelSettings() {
    const modal = document.getElementById('modal-ai-duel-settings');
    if (modal) modal.classList.remove('active');
}

function updateAiDuelBookSummaryUI() {
    const titleEl = document.getElementById('ai-duel-selected-book-title');
    const summaryEl = document.getElementById('ai-duel-books-summary');
    if (!aiDuelConfig || !Array.isArray(aiDuelConfig.selectedBooks)) return;
    // 过滤本地词书
    aiDuelConfig.selectedBooks = aiDuelConfig.selectedBooks.filter(id => !String(id).startsWith('custom_') && id !== 'builtin_default');
    const allBooks = (typeof getAllUniqueBooks === 'function')
        ? getAllUniqueBooks()
        : ((BookManager.availableBooks && BookManager.availableBooks.length > 0) ? BookManager.availableBooks : (BookManager.fallbackBooks || []));
    const count = aiDuelConfig.selectedBooks.length;
    if (summaryEl) {
        summaryEl.innerText = `已选 ${count} 本词书 (仅支持云端词书)`;
    }
    if (titleEl) {
        if (count === 0) {
            titleEl.innerText = '未选择词书';
        } else if (count === 1) {
            const b = allBooks.find(x => x.id === aiDuelConfig.selectedBooks[0]);
            titleEl.innerText = b ? (b.name || b.title || b.id) : aiDuelConfig.selectedBooks[0];
        } else {
            const b = allBooks.find(x => x.id === aiDuelConfig.selectedBooks[0]);
            const firstName = b ? (b.name || b.title || b.id) : aiDuelConfig.selectedBooks[0];
            titleEl.innerText = `${firstName} 等 ${count} 本词书`;
        }
    }
    updateAiDuelStartButtonState();
}
window.updateAiDuelBookSummaryUI = updateAiDuelBookSummaryUI;

function updateAiDuelStartButtonState() {
    const startBtn = document.getElementById('btn-start-ai-duel');
    const selCount = (aiDuelConfig.selectedBooks || []).length;
    if (startBtn) {
        startBtn.disabled = (selCount === 0);
    }
}

function updateAiDuelSliderHint() {
    const hintEl = document.getElementById('ai-difficulty-hint');
    if (!hintEl) return;
    const userRank = (typeof LevelManager !== 'undefined') ? LevelManager.getUserLevel(currentUser) : 1;
    const rankData = (typeof LevelManager !== 'undefined') ? LevelManager.getUserRankData(currentUser) : { rank: 1, rating: 0, isPromotionReady: false };
    const aiRank = aiDuelConfig.aiRank || 1;

    if (aiDuelConfig.matchType === 'ranked') {
        if (rankData.isPromotionReady) {
            if (aiRank === userRank + 1) {
                hintEl.innerHTML = `<span style="color:#16a34a; font-weight:700;">升段赛目标：挑战 ${userRank + 1}段 人机并获胜即可成功晋升！(输了不扣分)</span>`;
            } else {
                hintEl.innerHTML = `<span style="color:#eab308; font-weight:700;">升段赛就绪：需挑战高于自身1段（${userRank + 1}段）人机才能升段！</span>`;
            }
        } else {
            const diff = aiRank - userRank;
            let diffTxt = '';
            if (diff > 0) diffTxt = '(获胜加分更多)';
            else if (diff < 0) diffTxt = '(战败扣分更多)';
            hintEl.innerHTML = `<span>限制：±1 段  当前：${userRank}段 vs ${aiRank}段(AI)  ${diffTxt}</span>`;
        }
    } else {
        hintEl.innerHTML = `<span style="color:var(--md-sys-color-outline);">无段位限制，输赢不影响等级分</span>`;
    }
}

function updateAiDuelSettingsChips() {
    const isGuest = (typeof LevelManager !== 'undefined') ? LevelManager.isGuestUser(currentUser) : (!currentUser || currentUser.startsWith('游客'));
    if (isGuest && aiDuelConfig.matchType === 'ranked') {
        aiDuelConfig.matchType = 'friendly';
    }
    const isRanked = (aiDuelConfig.matchType === 'ranked');
    const userRank = (typeof LevelManager !== 'undefined') ? LevelManager.getUserLevel(currentUser) : 1;

    // 对战模式切换 (排位赛 vs 友谊赛)
    const currentAiType = aiDuelConfig.matchType || 'ranked';
    document.querySelectorAll('#chips-ai-match-type .md3-chip').forEach(c => {
        const t = c.getAttribute('data-type');
        c.classList.toggle('selected', t === currentAiType);
        if (isGuest && t === 'ranked') {
            c.classList.add('disabled');
            c.style.pointerEvents = 'none';
            c.style.opacity = '0.4';
            c.title = '游客无法参与排位赛';
        } else if (t === 'ranked') {
            c.classList.remove('disabled');
            c.style.pointerEvents = 'auto';
            c.style.opacity = '1';
            c.title = '';
        }
    });

    // 段位滑块更新：物理滑动条始终固定为 1~9，绝不缩短滑块轨道
    const slider = document.getElementById('ai-difficulty-slider');
    const disp = document.getElementById('ai-difficulty-display');

    if (slider) {
        slider.min = 1;
        slider.max = 9;
        if (isRanked) {
            const minR = Math.max(1, userRank - 1);
            const maxR = Math.min(9, userRank + 1);
            if (aiDuelConfig.aiRank < minR || aiDuelConfig.aiRank > maxR) {
                aiDuelConfig.aiRank = userRank;
            }
        }
        slider.value = aiDuelConfig.aiRank || 1;
    }
    if (disp) {
        disp.innerText = `${aiDuelConfig.aiRank || 1}段`;
    }
    updateAiDuelSliderHint();

    // 排位模式下固定规则强制设置
    if (isRanked) {
        aiDuelConfig.speedMode = 'smart';
        if (aiDuelConfig.mode === 'timed') {
            aiDuelConfig.duration = 120; // 2分钟
        } else {
            aiDuelConfig.winLead = 6; // 领先6题
        }
    }

    // AI 答题速度
    document.querySelectorAll('#chips-ai-speed-mode .md3-chip').forEach(c => {
        const spd = c.getAttribute('data-speed');
        c.classList.toggle('selected', spd === (aiDuelConfig.speedMode || 'smart'));
        if (isRanked) {
            const isSmart = (spd === 'smart');
            c.classList.toggle('disabled', !isSmart);
            c.style.pointerEvents = isSmart ? 'auto' : 'none';
            c.style.opacity = isSmart ? '1' : '0.4';
        } else {
            c.classList.remove('disabled');
            c.style.pointerEvents = 'auto';
            c.style.opacity = '1';
        }
    });

    // 规则模式切换（不限时 vs 限时）
    document.querySelectorAll('#chips-ai-duel-rule .md3-chip').forEach(c => {
        c.classList.toggle('selected', c.getAttribute('data-rule') === (aiDuelConfig.mode || 'lead'));
    });

    const groupLead = document.getElementById('group-ai-duel-lead');
    const groupTimed = document.getElementById('group-ai-duel-timed');
    if (groupLead) groupLead.style.display = (aiDuelConfig.mode === 'timed') ? 'none' : 'block';
    if (groupTimed) groupTimed.style.display = (aiDuelConfig.mode === 'timed') ? 'block' : 'none';

    // 领先题数选择
    document.querySelectorAll('#chips-ai-lead .md3-chip').forEach(c => {
        const leadVal = parseInt(c.getAttribute('data-lead'));
        c.classList.toggle('selected', leadVal === (aiDuelConfig.winLead || 6));
        if (isRanked) {
            const isFixedLead = (leadVal === 6);
            c.classList.toggle('disabled', !isFixedLead);
            c.style.pointerEvents = isFixedLead ? 'auto' : 'none';
            c.style.opacity = isFixedLead ? '1' : '0.4';
        } else {
            c.classList.remove('disabled');
            c.style.pointerEvents = 'auto';
            c.style.opacity = '1';
        }
    });

    // 限时时长选择
    document.querySelectorAll('#chips-ai-duration .md3-chip').forEach(c => {
        const durVal = parseInt(c.getAttribute('data-time'));
        c.classList.toggle('selected', durVal === (aiDuelConfig.duration || 120));
        if (isRanked) {
            const isFixedDur = (durVal === 120);
            c.classList.toggle('disabled', !isFixedDur);
            c.style.pointerEvents = isFixedDur ? 'auto' : 'none';
            c.style.opacity = isFixedDur ? '1' : '0.4';
        } else {
            c.classList.remove('disabled');
            c.style.pointerEvents = 'auto';
            c.style.opacity = '1';
        }
    });
}

function selectAiSpeedMode(speed) {
    if (aiDuelConfig.matchType === 'ranked' && speed !== 'smart') {
        showToast('排位模式下AI答题速度固定为智能');
        return;
    }
    aiDuelConfig.speedMode = speed;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiLead(lead) {
    if (aiDuelConfig.matchType === 'ranked' && lead !== 6) {
        showToast('排位模式下获胜条件固定为领先6题');
        return;
    }
    aiDuelConfig.winLead = lead;
    updateAiDuelSettingsChips();
    localStorage.setItem('vocab_ai_duel_config', JSON.stringify(aiDuelConfig));
}

function selectAiDuration(dur) {
    if (aiDuelConfig.matchType === 'ranked' && dur !== 120) {
        showToast('排位模式下限时固定为2分钟');
        return;
    }
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
    if (aiDuelConfig.matchType === 'ranked') {
        const isGuest = (typeof LevelManager !== 'undefined') ? LevelManager.isGuestUser(currentUser) : (!currentUser || currentUser.startsWith('游客'));
        if (isGuest) {
            showToast('游客禁止参与排位赛，已自动切换为友谊赛');
            aiDuelConfig.matchType = 'friendly';
        }
    }
    // 强制过滤掉本地词书
    if (Array.isArray(aiDuelConfig.selectedBooks)) {
        aiDuelConfig.selectedBooks = aiDuelConfig.selectedBooks.filter(id => !String(id).startsWith('custom_') && id !== 'builtin_default');
    }
    if (!aiDuelConfig.selectedBooks || aiDuelConfig.selectedBooks.length === 0) {
        showToast('请选择词书');
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
        basePool: questionSequence.map(q => {
            try { return JSON.parse(JSON.stringify(q)); } catch (e) { return Object.assign({}, q); }
        }),
        pool: [...questionSequence],
        aiIdx: 0,
        aiScore: 0,
        aiFrozenUntil: 0
    };

    currentMatchOppoRank = aiDuelConfig.aiRank || 1;
    currentMatchOppoRating = (currentMatchOppoRank - 1) * 100 + 50;

    const aiTitle = `系统AI (${aiDuelConfig.aiRank || 1}段)`;
    if (typeof renderArenaPlayersUI === 'function') {
        renderArenaPlayersUI(currentUser || '我方', getUserAvatar(currentUser), aiTitle, 'robot');
    } else {
        const myBadge = document.getElementById('arena-my-badge');
        const oppoBadge = document.getElementById('arena-oppo-badge');
        if (myBadge) myBadge.innerText = '🔴 ' + (currentUser || '我方');
        if (oppoBadge) oppoBadge.innerText = '🔵 ' + aiTitle;
    }
    document.getElementById('arena-my-score').innerText = '0';
    document.getElementById('arena-oppo-score').innerText = '0';

    const snakeWrap = document.getElementById('arena-gauge-snake-wrap');
    const tugWrap = document.getElementById('arena-gauge-tug-wrap');
    if (snakeWrap) snakeWrap.style.display = 'none';
    if (tugWrap) tugWrap.style.display = 'flex';

    const ruleSum = document.getElementById('arena-tug-rule-summary');
    const timerEl = document.getElementById('arena-tug-timer');

    const isTimed = (aiDuelConfig.mode === 'timed');
    const modeBadgeTxt = (aiDuelConfig.matchType === 'ranked') ? '【排位赛】' : '【友谊赛】';
    if (ruleSum) {
        ruleSum.innerText = isTimed ? `${modeBadgeTxt} 限时抢分` : `${modeBadgeTxt} 领先 ${aiDuelConfig.winLead} 题胜出`;
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
                window.aiDuelTimer = null;
                const diff = p1State.score - p2State.score;
                let myMsg = "🤝 势均力敌，握手言和！";
                if (diff > 0) myMsg = `🎉 恭喜战胜系统AI (${aiDuelConfig.aiRank}段)！`;
                else if (diff < 0) myMsg = `💔 遗憾惜败系统AI (${aiDuelConfig.aiRank}段)！`;
                endGame(myMsg, false);
            }
        }, 1000);
    }

    isPlayingMatch = true;
    if (typeof updateMyLobbyPresence === 'function') updateMyLobbyPresence();
    scheduleNextAiAnswer();
    switchView('view-game');
}

// 计算下一次 AI 作答时间 (兼顾单词与词组，按 1段~9段 指数式调整基准延迟)
function scheduleNextAiAnswer() {
    if (gameMode !== 'ai_duel' || timeLeft <= 0) return;
    if (aiDuelTimer) clearTimeout(aiDuelTimer);
    window.aiDuelTimer = null;

    if (typeof ensurePoolCapacity === 'function') {
        ensurePoolCapacity(aiDuelState, aiDuelState.aiIdx);
    }
    const q = aiDuelState.pool[aiDuelState.aiIdx] || (aiDuelState.basePool && aiDuelState.basePool[0]);
    if (!q) return;
    let delay = 3500;
    const isShiCi = Boolean(q && (q.isShiCi || q.senses || q.highlightedSentence || (q.word && /[\u4e00-\u9fa5]/.test(q.word))));
    const isPhrase = !isShiCi && q.word && q.word.trim().includes(' ');

    if (aiDuelConfig.speedMode === 'smart') {
        if (isShiCi) {
            // 实词包含长例句、多种释义辨析，显著增加AI思考与作答时间
            delay = 4800 + (Math.random() * 1200);
        } else if (isPhrase) {
            const tokens = extractPhraseTargetWords(q.word);
            // 长词组额外小幅度降低速度
            const longPhraseExtra = tokens.length >= 4 ? (tokens.length - 3) * 600 : 0;
            delay = 4500 + (tokens.length * 2000) + longPhraseExtra + (Math.random() * 1000 - 500);
        } else {
            const len = (q.word || '').length;
            delay = 1800 + (len * 240) + (Math.random() * 600 - 300);
        }
    } else {
        if (isShiCi) {
            delay = 5200 + (Math.random() * 1000);
        } else if (isPhrase) {
            const tokens = extractPhraseTargetWords(q.word);
            const longPhraseExtra = tokens.length >= 4 ? (tokens.length - 3) * 500 : 0;
            delay = 4800 + (tokens.length * 1700) + longPhraseExtra + (Math.random() * 800 - 400);
        } else {
            delay = 3200 + (Math.random() * 600 - 300);
        }
    }

    // 1段~9段速度倍率：1段为 1.6 倍慢速，9段为 0.65 倍超快速
    const aiRank = aiDuelConfig.aiRank || 1;
    const delayFactor = Math.max(0.60, 1.60 - (aiRank - 1) * 0.11875);
    delay *= delayFactor;

    // 动态自适应追赶/放缓调节
    const playerLead = p1State.score - p2State.score;
    if (playerLead >= 3) {
        const speedFactor = Math.max(0.68, 1 - (playerLead - 2) * 0.08);
        delay *= speedFactor;
    } else if (playerLead <= -3) {
        const slowFactor = Math.min(1.50, 1 + (Math.abs(playerLead) - 2) * 0.10);
        delay *= slowFactor;
    }

    delay = Math.max(isShiCi ? 3200 : (isPhrase ? 3200 : 1300), delay);

    aiDuelTimer = setTimeout(() => {
        handleAiAnswerStep();
    }, delay);
    window.aiDuelTimer = aiDuelTimer;
}

function handleAiAnswerStep() {
    if (gameMode !== 'ai_duel' || timeLeft <= 0) return;

    if (Date.now() < aiDuelState.aiFrozenUntil) {
        scheduleNextAiAnswer();
        return;
    }

    // 1段~9段基础正确率：1段 60%，5段 79%，9段 98%
    const aiRank = aiDuelConfig.aiRank || 1;
    let baseAccuracy = Math.min(0.98, Math.max(0.58, 0.58 + (aiRank - 1) * 0.05));

    // 动态自适应调节
    const playerLead = p1State.score - p2State.score;
    let dynamicAccuracy = baseAccuracy;
    if (playerLead >= 3) {
        const boost = Math.min(0.15, (playerLead - 2) * 0.03);
        dynamicAccuracy = Math.min(0.99, baseAccuracy + boost);
    } else if (playerLead <= -3) {
        const drop = Math.min(0.25, (Math.abs(playerLead) - 2) * 0.05);
        dynamicAccuracy = Math.max(0.45, baseAccuracy - drop);
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
    if (aiDuelConfig.mode === 'timed') {
        return false;
    }
    const winLead = aiDuelConfig.winLead || 6;
    const diff = p1State.score - p2State.score;

    if (diff >= winLead) {
        if (aiDuelTimer) clearTimeout(aiDuelTimer);
        endGame(`🎉 恭喜战胜系统AI (${aiDuelConfig.aiRank}段)！`, false);
        return true;
    } else if (diff <= -winLead) {
        if (aiDuelTimer) clearTimeout(aiDuelTimer);
        endGame(`💔 遗憾惜败！`, false);
        return true;
    }
    return false;
}

window.openAiDuelSettings = openAiDuelSettings;
window.closeAiDuelSettings = closeAiDuelSettings;
window.selectAiSpeedMode = selectAiSpeedMode;
window.selectAiRule = selectAiRule;
window.selectAiLead = selectAiLead;
window.selectAiDuration = selectAiDuration;
window.startAiDuelFromModal = startAiDuelFromModal;
