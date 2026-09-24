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
