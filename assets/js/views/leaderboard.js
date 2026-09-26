/**
 * 风云排行榜视图 (用户等级榜 & 今日/历史 Wordle 竞速榜)
 * Module: assets/js/views/leaderboard.js
 */

let leaderboardActiveTab = 'level'; // 'level' | 'wordle'
let leaderboardPreviousView = 'view-hub';
let wordleLeaderboardDate = (new Date()).toISOString().slice(0, 10);
let wordleLeaderboardSort = 'time'; // 'time' | 'attempts'

function openLeaderboardView(tab = 'level') {
    leaderboardPreviousView = (typeof currentView !== 'undefined' && currentView !== 'view-leaderboard') ? currentView : 'view-hub';
    leaderboardActiveTab = tab;
    wordleLeaderboardDate = (new Date()).toISOString().slice(0, 10);

    // 在今日wordle中打开排行榜时暂停计时
    if (typeof stopDailyTimer === 'function' && typeof isDailyWordleMode !== 'undefined' && isDailyWordleMode) {
        stopDailyTimer();
    }

    if (typeof switchView === 'function') {
        switchView('view-leaderboard');
    }
    switchLeaderboardTab(leaderboardActiveTab);
}

function exitLeaderboardView() {
    if (typeof switchView === 'function') {
        switchView(leaderboardPreviousView || 'view-hub');
    }
    // 退出排行榜返回正在进行的今日wordle时，恢复计时
    if (leaderboardPreviousView === 'view-riddle' && typeof isDailyWordleMode !== 'undefined' && isDailyWordleMode && typeof riddleState !== 'undefined' && !riddleState.gameOver) {
        if (typeof startDailyTimer === 'function') {
            startDailyTimer();
        }
    }
}

function switchLeaderboardTab(tab) {
    leaderboardActiveTab = tab;
    const tabLevelBtn = document.getElementById('tab-lb-level');
    const tabWordleBtn = document.getElementById('tab-lb-wordle');
    const levelSection = document.getElementById('lb-level-section');
    const wordleSection = document.getElementById('lb-wordle-section');

    if (tabLevelBtn) tabLevelBtn.classList.toggle('active', tab === 'level');
    if (tabWordleBtn) tabWordleBtn.classList.toggle('active', tab === 'wordle');

    if (levelSection) levelSection.style.display = (tab === 'level') ? 'block' : 'none';
    if (wordleSection) wordleSection.style.display = (tab === 'wordle') ? 'block' : 'none';

    if (tab === 'level') {
        renderLevelLeaderboard();
    } else {
        renderWordleLeaderboard();
    }
}

// ----------------- 等级榜控制器 -----------------
async function renderLevelLeaderboard() {
    const listContainer = document.getElementById('lb-level-list');
    const myRankBanner = document.getElementById('lb-level-my-rank');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
            <span class="material-symbols-rounded rotating" style="font-size:32px;">sync</span>
            <p style="margin-top:8px; font-size:0.9rem;">正在获取榜单...</p>
        </div>
    `;

    let accounts = [];

    // 1. 从 Supabase 拉取已注册云端账号
    try {
        if (typeof sbClient !== 'undefined' && sbClient) {
            const { data, error } = await sbClient
                .from('user_accounts')
                .select('username, avatar_url, level, user_data, updated_at')
                .limit(100);
            if (!error && Array.isArray(data)) {
                accounts = data;
            }
        }
    } catch (e) {
        console.warn('[Leaderboard] Failed to fetch accounts from Supabase:', e);
    }

    // 2. 本地用户补充（若当前用户已登录且不在云端列表中）
    const currUser = typeof currentUser !== 'undefined' ? currentUser : '';
    const hasCurrent = accounts.some(a => a.username === currUser);
    if (!hasCurrent && currUser && !currUser.startsWith('游客')) {
        let currAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar(currUser) : '';
        let currLevelData = (typeof LevelManager !== 'undefined') ? LevelManager.getLevelData(currUser) : null;
        accounts.push({
            username: currUser,
            avatar_url: currAvatar,
            level: currLevelData ? currLevelData.level : 1,
            user_data: {
                levelData: currLevelData ? { level: currLevelData.level, score: currLevelData.score } : null
            }
        });
    }

    // 3. 计算所有玩家等级数据并排序（不显示称号与具体经验）
    const userScores = accounts.map(acc => {
        let level = acc.level || 1;
        let score = 0;

        if (acc.username === currUser && typeof LevelManager !== 'undefined') {
            const lData = LevelManager.getLevelData(currUser);
            level = lData.level || 1;
            score = lData.score || 0;
        } else if (acc.user_data && acc.user_data.levelData) {
            level = acc.user_data.levelData.level || acc.level || 1;
            score = acc.user_data.levelData.score || 0;
        } else if (acc.user_data && acc.user_data.stats) {
            const stats = acc.user_data.stats;
            score = (stats.correct || 0) * 5 + (stats.total || 0) * 2;
            level = (typeof LevelManager !== 'undefined') ? LevelManager.getLevelFromScore(score) : Math.min(60, Math.max(1, Math.floor(score / 50)));
        }

        return {
            username: acc.username,
            avatar: acc.avatar_url || '',
            level,
            score,
            isMe: acc.username === currUser
        };
    });

    // 降序排序：等级优先，经验次之
    userScores.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.score - a.score;
    });

    if (userScores.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:36px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:36px; opacity:0.4;">military_tech</span>
                <p style="margin-top:8px;">暂无等级排行数据</p>
            </div>
        `;
        if (myRankBanner) myRankBanner.style.display = 'none';
        return;
    }

    // 渲染“我的排名”横幅（完全贴合设计图：无称号，无经验数字）
    const myIndex = userScores.findIndex(u => u.isMe);
    if (myRankBanner) {
        if (myIndex >= 0 && !currUser.startsWith('游客')) {
            const myData = userScores[myIndex];
            myRankBanner.style.display = 'flex';
            myRankBanner.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-radius:18px; background:#e0f2fe; color:#0369a1; margin-bottom:14px;';
            myRankBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:38px; height:38px; border-radius:50%; background:#0284c7; color:white; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:1.05rem; flex-shrink:0;">
                        #${myIndex + 1}
                    </div>
                    <div>
                        <div style="font-weight:700; font-size:1rem; color:#0f172a;">我的当前排名</div>
                        <div style="font-size:0.82rem; color:#64748b; margin-top:2px;">${escapeHtml(currUser)}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.05rem; font-weight:800; color:#0f172a;">Lv.${myData.level}</span>
                </div>
            `;
        } else {
            myRankBanner.style.display = 'flex';
            myRankBanner.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-radius:18px; background:#f1f5f9; color:#475569; margin-bottom:14px;';
            myRankBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem;">
                    <span class="material-symbols-rounded" style="font-size:20px; color:#0284c7;">info</span>
                    <span>当前为游客模式，登录账号后即可上榜</span>
                </div>
                <button type="button" class="btn btn-filled btn-sm" onclick="switchView('view-auth')" style="border-radius:9999px;">去登录</button>
            `;
        }
    }

    // 渲染排行榜列表（完全贴合设计图：金银铜勋章图标，圆角列表，Lv.X右对齐，无称号，无经验）
    listContainer.innerHTML = userScores.map((u, idx) => {
        const rank = idx + 1;
        let rankBadge = '';
        if (rank === 1) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#eab308; font-size:26px;">workspace_premium</span>`;
        } else if (rank === 2) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#94a3b8; font-size:26px;">workspace_premium</span>`;
        } else if (rank === 3) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#d97706; font-size:26px;">workspace_premium</span>`;
        } else {
            rankBadge = `<span style="font-weight:800; font-size:0.95rem; color:#64748b; width:26px; text-align:center;">${rank}</span>`;
        }

        let avatarSrc = u.avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(u.username) : '');
        if (avatarSrc && avatarSrc.startsWith('//')) avatarSrc = 'https:' + avatarSrc;

        return `
            <div class="lb-user-row ${u.isMe ? 'is-me' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-radius:16px; margin-bottom:10px; background:#f8fafc; border:${u.isMe ? '1.5px solid #0284c7' : '1px solid #e2e8f0'}; transition:all 0.2s ease;">
                <div style="display:flex; align-items:center; gap:14px; min-width:0; flex:1;">
                    <div style="width:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${rankBadge}
                    </div>
                    <div style="position:relative; width:42px; height:42px; border-radius:50%; overflow:hidden; background:#e2e8f0; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:24px; color:#94a3b8;">person</span>
                        ${avatarSrc ? `<img src="${escapeHtml(avatarSrc)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';" style="position:absolute; width:100%; height:100%; object-fit:cover;">` : ''}
                    </div>
                    <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-weight:700; font-size:1.02rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#0f172a;">${escapeHtml(u.username)}</span>
                            ${u.isMe ? `<span style="font-size:0.72rem; background:#dbeafe; color:#0284c7; padding:1px 7px; border-radius:9999px; font-weight:700;">我</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; flex-shrink:0;">
                    <span style="font-size:1.05rem; font-weight:800; color:#0f172a;">Lv.${u.level}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ----------------- Wordle 榜控制器 -----------------
function shiftWordleLeaderboardDate(delta) {
    const todayStr = (new Date()).toISOString().slice(0, 10);
    const cur = new Date(wordleLeaderboardDate);
    cur.setDate(cur.getDate() + delta);
    const targetDate = cur.toISOString().slice(0, 10);

    // 禁止查看未来的榜单和单词
    if (targetDate > todayStr) {
        if (typeof showToast === 'function') {
            showToast('未来日期的挑战尚未开启，无法查看');
        }
        return;
    }
    wordleLeaderboardDate = targetDate;
    renderWordleLeaderboard();
}

function resetWordleLeaderboardDate() {
    wordleLeaderboardDate = (new Date()).toISOString().slice(0, 10);
    renderWordleLeaderboard();
}

function setWordleLeaderboardSort(sortType) {
    wordleLeaderboardSort = sortType;
    const sortSelect = document.getElementById('select-lb-wordle-sort');
    if (sortSelect && sortSelect.value !== sortType) {
        sortSelect.value = sortType;
    }
    renderWordleLeaderboard();
}

async function renderWordleLeaderboard() {
    const listContainer = document.getElementById('lb-wordle-list');
    const dateLabel = document.getElementById('lb-wordle-date-label');
    const wordCard = document.getElementById('lb-wordle-word-card');
    const todayBtn = document.getElementById('btn-lb-wordle-today');
    const nextBtn = document.getElementById('btn-lb-wordle-next');

    const todayStr = (new Date()).toISOString().slice(0, 10);
    // 强制限制无法超过今天
    if (wordleLeaderboardDate > todayStr) {
        wordleLeaderboardDate = todayStr;
    }
    const isToday = wordleLeaderboardDate === todayStr;

    const sortSelect = document.getElementById('select-lb-wordle-sort');
    if (sortSelect) sortSelect.value = wordleLeaderboardSort;

    if (dateLabel) {
        dateLabel.innerText = `${wordleLeaderboardDate} ${isToday ? '(今日)' : ''}`;
    }

    // 后一天按钮状态：若是今日则完全禁用
    if (nextBtn) {
        if (isToday) {
            nextBtn.setAttribute('disabled', 'true');
            nextBtn.style.opacity = '0.35';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.pointerEvents = 'none';
        } else {
            nextBtn.removeAttribute('disabled');
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
            nextBtn.style.pointerEvents = 'auto';
        }
    }

    // “回到今日” 按钮：在今天时隐藏，在历史日期时展示
    if (todayBtn) {
        todayBtn.style.display = isToday ? 'none' : 'inline-flex';
    }

    // 1. 渲染今日保密提示 或 历史揭晓单词卡片 (不要在榜单列表中泄露目标词，但支持查看历史词)
    if (wordCard) {
        if (isToday) {
            wordCard.innerHTML = `
                <div style="background:var(--md-sys-color-surface-container-low, #f8fafc); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); border-radius:16px; padding:12px 18px; display:flex; align-items:center; gap:10px; font-size:0.86rem; color:var(--md-sys-color-outline, #64748b);">
                    <span class="material-symbols-rounded" style="font-size:20px; color:var(--md-sys-color-primary, #0284c7);">lock</span>
                    <span>通关或挑战结束后可查看今日词汇</span>
                </div>
            `;
        } else {
            wordCard.innerHTML = `
                <div style="background:var(--md-sys-color-surface-container-low, #f8fafc); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); border-radius:16px; padding:12px 18px; display:flex; align-items:center; gap:8px; color:var(--md-sys-color-outline);">
                    <span class="material-symbols-rounded rotating" style="font-size:18px;">sync</span>
                    <span style="font-size:0.85rem;">正在查询历史单词...</span>
                </div>
            `;
            try {
                const histWord = (typeof getDailyWordForDate === 'function') 
                    ? await getDailyWordForDate(wordleLeaderboardDate) 
                    : null;
                if (histWord && histWord.word) {
                    const lowerWord = histWord.word.toLowerCase();
                    wordCard.innerHTML = `
                        <div style="background:var(--md-sys-color-surface-container-low, #f8fafc); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:0.75rem; font-weight:700; color:var(--md-sys-color-outline, #64748b); letter-spacing:0.5px; margin-bottom:4px;">该日挑战单词</div>
                                <div style="display:flex; align-items:baseline; flex-wrap:wrap; gap:10px;">
                                    <span style="font-size:1.25rem; font-weight:800; color:var(--md-sys-color-primary, #0284c7); letter-spacing:0.5px; text-transform:lowercase; font-family:var(--md-sys-typescale-body-font, inherit);">${escapeHtml(lowerWord)}</span>
                                    <span style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant, #475569);">${escapeHtml(histWord.meaning || '')}</span>
                                </div>
                            </div>
                            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; font-weight:700; padding:4px 12px; border-radius:9999px; flex-shrink:0;">历史已揭晓</span>
                        </div>
                    `;
                } else {
                    wordCard.innerHTML = '';
                }
            } catch (e) {
                wordCard.innerHTML = '';
            }
        }
    }

    if (!listContainer) return;

    listContainer.innerHTML = `
        <div style="text-align:center; padding:36px 12px; color:var(--md-sys-color-outline);">
            <span class="material-symbols-rounded rotating" style="font-size:32px;">sync</span>
            <p style="margin-top:8px; font-size:0.9rem;">正在加载 ${wordleLeaderboardDate} 榜单...</p>
        </div>
    `;

    const records = [];
    const currUser = typeof currentUser !== 'undefined' ? currentUser : '';

    // 2. 优先从 Supabase 专用表 daily_wordle_records 查询
    try {
        if (typeof sbClient !== 'undefined' && sbClient) {
            const { data: cloudRecs, error: recErr } = await sbClient
                .from('daily_wordle_records')
                .select('username, is_won, attempts, time_spent, created_at')
                .eq('date', wordleLeaderboardDate)
                .eq('is_won', true);

            if (!recErr && Array.isArray(cloudRecs) && cloudRecs.length > 0) {
                cloudRecs.forEach(r => {
                    records.push({
                        username: r.username,
                        avatar: (typeof getUserAvatar === 'function' ? getUserAvatar(r.username) : ''),
                        attempts: r.attempts || 6,
                        timeSpent: r.time_spent || 60,
                        completedAt: r.created_at ? new Date(r.created_at).getTime() : 0,
                        isMe: r.username === currUser
                    });
                });
            } else {
                // 兼容：查询 user_accounts 中的 user_data.wordle
                const { data: userAccounts, error: uErr } = await sbClient
                    .from('user_accounts')
                    .select('username, avatar_url, user_data')
                    .limit(100);
                if (!uErr && Array.isArray(userAccounts)) {
                    userAccounts.forEach(acc => {
                        if (acc.user_data && acc.user_data.wordle && acc.user_data.wordle[wordleLeaderboardDate]) {
                            const rec = acc.user_data.wordle[wordleLeaderboardDate];
                            if (rec && rec.isWon) {
                                records.push({
                                    username: acc.username,
                                    avatar: acc.avatar_url || '',
                                    attempts: rec.attempts || 6,
                                    timeSpent: rec.timeSpent || 60,
                                    completedAt: rec.timestamp || 0,
                                    isMe: acc.username === currUser
                                });
                            }
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn('[Leaderboard] Wordle fetch failed:', e);
    }

    // 3. 本地用户记录合并（若本地已通关且列表未包含）
    try {
        const rawLocal = localStorage.getItem(`vocab_wordle_history_${currUser}`);
        if (rawLocal) {
            const localHist = JSON.parse(rawLocal);
            const myDayRec = localHist[wordleLeaderboardDate];
            if (myDayRec && myDayRec.isWon) {
                const existingIdx = records.findIndex(r => r.username === currUser);
                const item = {
                    username: currUser,
                    avatar: (typeof getUserAvatar === 'function' ? getUserAvatar(currUser) : ''),
                    attempts: myDayRec.attempts || 6,
                    timeSpent: myDayRec.timeSpent || 60,
                    completedAt: myDayRec.timestamp || 0,
                    isMe: true
                };
                if (existingIdx >= 0) {
                    records[existingIdx] = item;
                } else {
                    records.push(item);
                }
            }
        }
    } catch (e) { }

    if (records.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:48px 16px; color:var(--md-sys-color-outline);">
                <span class="material-symbols-rounded" style="font-size:42px; opacity:0.35;">grid_view</span>
                <p style="margin-top:10px; font-size:0.95rem;">${wordleLeaderboardDate} 暂无玩家通关上榜</p>
                ${isToday ? `
                <button type="button" class="btn btn-filled btn-sm" onclick="startDailyWordleGame()" style="margin-top:12px; border-radius:9999px;">
                    <span class="material-symbols-rounded" style="font-size:16px;">play_arrow</span>
                    <span>立即挑战今日 Wordle</span>
                </button>
                ` : ''}
            </div>
        `;
        return;
    }

    // 4. 排序
    records.sort((a, b) => {
        if (wordleLeaderboardSort === 'time') {
            if (a.timeSpent !== b.timeSpent) return a.timeSpent - b.timeSpent;
            return a.attempts - b.attempts;
        } else {
            if (a.attempts !== b.attempts) return a.attempts - b.attempts;
            return a.timeSpent - b.timeSpent;
        }
    });

    // 5. 渲染排行榜用户行（完全去除“目标词”文字，显示名次、头像、用户名、X/6猜出、用时）
    listContainer.innerHTML = records.map((r, idx) => {
        const rank = idx + 1;
        let rankBadge = '';
        if (rank === 1) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#eab308; font-size:26px;">workspace_premium</span>`;
        } else if (rank === 2) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#94a3b8; font-size:26px;">workspace_premium</span>`;
        } else if (rank === 3) {
            rankBadge = `<span class="material-symbols-rounded" style="color:#d97706; font-size:26px;">workspace_premium</span>`;
        } else {
            rankBadge = `<span style="font-weight:800; font-size:0.95rem; color:#64748b; width:26px; text-align:center;">${rank}</span>`;
        }

        const mins = Math.floor(r.timeSpent / 60);
        const secs = r.timeSpent % 60;
        const timeFormatted = mins > 0 ? `${mins}分${String(secs).padStart(2, '0')}秒` : `${secs}秒`;

        let avatarSrc = r.avatar || (typeof getUserAvatar === 'function' ? getUserAvatar(r.username) : '');
        if (avatarSrc && avatarSrc.startsWith('//')) avatarSrc = 'https:' + avatarSrc;

        return `
            <div class="lb-user-row ${r.isMe ? 'is-me' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-radius:16px; margin-bottom:10px; background:#f8fafc; border:${r.isMe ? '1.5px solid #0284c7' : '1px solid #e2e8f0'}; transition:all 0.2s ease;">
                <div style="display:flex; align-items:center; gap:14px; min-width:0; flex:1;">
                    <div style="width:28px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${rankBadge}
                    </div>
                    <div style="position:relative; width:42px; height:42px; border-radius:50%; overflow:hidden; background:#e2e8f0; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-rounded" style="font-size:24px; color:#94a3b8;">person</span>
                        ${avatarSrc ? `<img src="${escapeHtml(avatarSrc)}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';" style="position:absolute; width:100%; height:100%; object-fit:cover;">` : ''}
                    </div>
                    <div style="min-width:0; flex:1;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-weight:700; font-size:1.02rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#0f172a;">${escapeHtml(r.username)}</span>
                            ${r.isMe ? `<span style="font-size:0.72rem; background:#dbeafe; color:#0284c7; padding:1px 7px; border-radius:9999px; font-weight:700;">我</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:9999px;">${r.attempts}/6 猜出</span>
                    <span style="font-size:0.9rem; font-weight:800; color:#0284c7;">${timeFormatted}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.openLeaderboardView = openLeaderboardView;
window.exitLeaderboardView = exitLeaderboardView;
window.switchLeaderboardTab = switchLeaderboardTab;
window.shiftWordleLeaderboardDate = shiftWordleLeaderboardDate;
window.resetWordleLeaderboardDate = resetWordleLeaderboardDate;
window.setWordleLeaderboardSort = setWordleLeaderboardSort;
window.renderLevelLeaderboard = renderLevelLeaderboard;
window.renderWordleLeaderboard = renderWordleLeaderboard;
