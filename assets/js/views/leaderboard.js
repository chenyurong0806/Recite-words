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

const LEADERBOARD_BILI_BADGE_HTML = `<span class="bili-badge" style="display:inline-flex; align-items:center; gap:2px; font-size:0.68rem; font-weight:700; color:#fff; background:linear-gradient(135deg, #fb7299, #ff85ad); padding:1px 5px; border-radius:8px; line-height:1.2; flex-shrink:0;"><svg style="width:10px; height:10px; fill:currentColor;" viewBox="0 0 24 24"><path d="M17.813 4.653h.854c1.51 0 2.733 1.224 2.733 2.734v10.36c0 1.51-1.223 2.734-2.733 2.734H5.333C3.823 20.48 2.6 19.257 2.6 17.747V7.387c0-1.51 1.223-2.734 2.733-2.734h.854L4.35 2.816a.8.8 0 1 1 1.132-1.132L8.27 4.47h7.46l2.788-2.786a.8.8 0 1 1 1.132 1.132l-1.837 1.837zM5.333 6.253a1.133 1.133 0 0 0-1.133 1.134v10.36c0 .626.507 1.134 1.133 1.134h13.334c.626 0 1.133-.508 1.133-1.134V7.387c0-.626-.507-1.134-1.133-1.134H5.333zm3.2 4.267c.59 0 1.067.477 1.067 1.067v2.133a1.067 1.067 0 1 1-2.134 0v-2.133c0-.59.478-1.067 1.067-1.067zm6.934 0c.59 0 1.066.477 1.066 1.067v2.133a1.067 1.067 0 1 1-2.133 0v-2.133c0-.59.477-1.067 1.067-1.067z"/></svg>B站</span>`;
let cachedBiliUsernamesSet = new Set();

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
                data.forEach(acc => {
                    const ud = acc.user_data || {};
                    if (ud.account_type === 'bilibili' || ud.isBili === true || acc.account_type === 'bilibili') {
                        cachedBiliUsernamesSet.add(acc.username);
                    }
                });
            }
        }
    } catch (e) {
        console.warn('[Leaderboard] Failed to fetch accounts from Supabase:', e);
    }

    // 2. 本地用户补充（若当前用户已登录且不在云端列表中）
    const currUser = typeof currentUser !== 'undefined' ? currentUser : '';
    const isCurrBili = (typeof currentUserProfile !== 'undefined' && currentUserProfile && (currentUserProfile.type === 'bilibili' || currentUserProfile.isBili)) || false;
    if (isCurrBili && currUser) {
        cachedBiliUsernamesSet.add(currUser);
    }
    const hasCurrent = accounts.some(a => a.username === currUser);
    if (!hasCurrent && currUser && !currUser.startsWith('游客')) {
        let currAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar(currUser) : '';
        let currLevelData = (typeof LevelManager !== 'undefined') ? LevelManager.getLevelData(currUser) : null;
        accounts.push({
            username: currUser,
            avatar_url: currAvatar,
            level: currLevelData ? currLevelData.level : 1,
            user_data: {
                levelData: currLevelData ? { level: currLevelData.level, score: currLevelData.score } : null,
                account_type: isCurrBili ? 'bilibili' : 'cloud',
                isBili: isCurrBili
            }
        });
    }

    // 3. 计算所有玩家段位和等级分数据并排序
    const userScores = accounts.map(acc => {
        let rank = 1;
        let rating = 0;

        if (acc.username === currUser && typeof LevelManager !== 'undefined') {
            const rData = LevelManager.getUserRankData(currUser);
            rank = rData.rank || 1;
            rating = rData.rating || 0;
        } else if (acc.user_data && acc.user_data.rank_data) {
            rank = acc.user_data.rank_data.rank || acc.level || 1;
            rating = acc.user_data.rank_data.rating || 0;
        } else if (acc.user_data && acc.user_data.levelData) {
            rank = acc.user_data.levelData.level || acc.level || 1;
            rating = acc.user_data.levelData.score || 0;
        } else if (acc.level) {
            rank = acc.level || 1;
            if (acc.user_data && typeof acc.user_data.score === 'number') {
                rating = acc.user_data.score;
            }
        }

        rating = Math.max(0, parseInt(rating) || 0);
        // 如果旧数据中 rank > 1 但 rating <= 100，自动平滑迁移为连续等级分
        if (rank > 1 && rating <= 100) {
            rating = (rank - 1) * 100 + rating;
        }
        // 等级分无上限，达到9段后继续增加
        if (typeof LevelManager !== 'undefined') {
            rank = LevelManager.getRankFromRating(rating);
        } else {
            rank = Math.min(9, Math.max(1, Math.ceil(rating / 100)));
        }

        const uData = acc.user_data || {};
        const isBili = Boolean(
            acc.isBili ||
            uData.account_type === 'bilibili' ||
            uData.isBili === true ||
            acc.account_type === 'bilibili' ||
            cachedBiliUsernamesSet.has(acc.username) ||
            (acc.username === currUser && isCurrBili)
        );

        return {
            username: acc.username,
            avatar: acc.avatar_url || '',
            rank,
            rating,
            isBili,
            isMe: acc.username === currUser
        };
    });

    // 降序排序：按总等级分排序 (到达9段后无上限，越高排名越前)
    userScores.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.rank - a.rank;
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

    // 渲染“我的排名”横幅（展示段位与当前账号在全服的真实排名与实际等级分）
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
                        <div style="display:flex; align-items:center; gap:6px; font-size:0.82rem; color:#64748b; margin-top:2px;">
                            <span>${escapeHtml(currUser)}</span>
                            ${myData.isBili ? LEADERBOARD_BILI_BADGE_HTML : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.05rem; font-weight:800; color:#0369a1;">${myData.rank}段   ${myData.rating}分</span>
                </div>
            `;
        } else {
            myRankBanner.style.display = 'flex';
            myRankBanner.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-radius:18px; background:#f1f5f9; color:#475569; margin-bottom:14px;';
            myRankBanner.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem;">
                    <span class="material-symbols-rounded" style="font-size:20px; color:#0284c7;">info</span>
                    <span>当前为游客模式，请先登录</span>
                </div>
                <button type="button" class="btn btn-filled btn-sm" onclick="switchView('view-auth')" style="border-radius:9999px;">去登录</button>
            `;
        }
    }

    // 仅列出全服前 10 名
    const top10 = userScores.slice(0, 10);

    // 渲染排行榜列表（展示段位和实际等级分，无100分上限）
    listContainer.innerHTML = top10.map((u, idx) => {
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
                            ${u.isBili ? LEADERBOARD_BILI_BADGE_HTML : ''}
                            ${u.isMe ? `<span style="font-size:0.72rem; background:#dbeafe; color:#0284c7; padding:1px 7px; border-radius:9999px; font-weight:700;">我</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; flex-shrink:0;">
                    <span style="font-size:1.05rem; font-weight:800; color:#0f172a;">${u.rank}段   ${u.rating}分</span>
                </div>
            </div>
        `;
    }).join('');
}

// ----------------- Wordle 榜控制器 -----------------
function renderWordleSevenDaysPicker() {
    const container = document.getElementById('lb-wordle-days-chips');
    if (!container) return;

    const days = [];
    const today = new Date();
    // 过去 6 天至今天，共 7 天
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const dayNumber = d.getDate();
        days.push({ dateStr, dayNumber, isToday: i === 0 });
    }

    container.innerHTML = days.map(item => {
        const isSelected = (item.dateStr === wordleLeaderboardDate);
        return `<button type="button" class="lb-day-circle-btn ${isSelected ? 'active' : ''}" onclick="selectWordleLeaderboardDate('${item.dateStr}')" title="${item.dateStr}${item.isToday ? ' (今日)' : ''}"><span class="lb-day-label">${item.isToday ? '今' : item.dayNumber}</span></button>`;
    }).join('');
}

function selectWordleLeaderboardDate(dateStr) {
    const todayStr = (new Date()).toISOString().slice(0, 10);
    if (dateStr > todayStr) return;
    wordleLeaderboardDate = dateStr;
    renderWordleLeaderboard();
}
window.selectWordleLeaderboardDate = selectWordleLeaderboardDate;

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

function toggleWordleSortDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('menu-lb-wordle-sort');
    if (!menu) return;
    const isHidden = menu.style.display === 'none' || !menu.style.display;
    if (isHidden) {
        updateWordleSortDropdownUI();
        menu.style.display = 'flex';
        menu.classList.add('open');
    } else {
        menu.style.display = 'none';
        menu.classList.remove('open');
    }
}

function chooseWordleLeaderboardSort(sortType) {
    const menu = document.getElementById('menu-lb-wordle-sort');
    if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('open');
    }
    setWordleLeaderboardSort(sortType);
}

function updateWordleSortDropdownUI() {
    const labelEl = document.getElementById('lb-wordle-sort-label');
    if (labelEl) {
        labelEl.innerText = wordleLeaderboardSort === 'attempts' ? '按次数最少' : '按用时最快';
    }
    const optTime = document.getElementById('opt-wordle-sort-time');
    const optAttempts = document.getElementById('opt-wordle-sort-attempts');
    if (optTime) {
        const isTime = wordleLeaderboardSort === 'time';
        optTime.className = `md3-custom-select-option ${isTime ? 'selected' : ''}`;
        optTime.innerHTML = `<span>按用时最快</span>${isTime ? '<span class="material-symbols-rounded" style="font-size:16px;">check</span>' : ''}`;
    }
    if (optAttempts) {
        const isAtt = wordleLeaderboardSort === 'attempts';
        optAttempts.className = `md3-custom-select-option ${isAtt ? 'selected' : ''}`;
        optAttempts.innerHTML = `<span>按次数最少</span>${isAtt ? '<span class="material-symbols-rounded" style="font-size:16px;">check</span>' : ''}`;
    }
}

function setWordleLeaderboardSort(sortType) {
    wordleLeaderboardSort = sortType;
    const sortSelect = document.getElementById('select-lb-wordle-sort');
    if (sortSelect && sortSelect.value !== sortType) {
        sortSelect.value = sortType;
    }
    updateWordleSortDropdownUI();
    renderWordleLeaderboard();
}

function checkUserFinishedWordleForDate(dateStr, currUser) {
    if (!currUser) return false;
    // 1. 本地当日专属进度
    try {
        const k = `vocab_daily_wordle_${currUser}_${dateStr}`;
        const raw = SafeStorage.getItem(k) || localStorage.getItem(k);
        if (raw) {
            const p = JSON.parse(raw);
            if (p && (p.gameOver || p.isWon)) return true;
        }
    } catch (e) { }

    // 2. 本地历史记录
    try {
        const histKey = `vocab_wordle_history_${currUser}`;
        const rawHist = SafeStorage.getItem(histKey) || localStorage.getItem(histKey);
        if (rawHist) {
            const h = JSON.parse(rawHist);
            if (h && h[dateStr]) return true;
        }
    } catch (e) { }

    // 3. 当前运行中的 riddleState 判定
    if (typeof isDailyWordleMode !== 'undefined' && isDailyWordleMode && typeof riddleState !== 'undefined' && riddleState) {
        const todayStr = (new Date()).toISOString().slice(0, 10);
        if (dateStr === todayStr && riddleState.gameOver) return true;
    }

    return false;
}

async function renderWordleLeaderboard() {
    const listContainer = document.getElementById('lb-wordle-list');
    const wordCard = document.getElementById('lb-wordle-word-card');

    const todayStr = (new Date()).toISOString().slice(0, 10);
    // 强制限制无法超过今天
    if (wordleLeaderboardDate > todayStr) {
        wordleLeaderboardDate = todayStr;
    }
    const isToday = wordleLeaderboardDate === todayStr;

    // 渲染最近 7 天快捷圆圈选择器
    renderWordleSevenDaysPicker();
    updateWordleSortDropdownUI();
    const sortSelect = document.getElementById('select-lb-wordle-sort');
    if (sortSelect) sortSelect.value = wordleLeaderboardSort;

    const currUser = typeof currentUser !== 'undefined' ? currentUser : '';
    const hasCompletedWordle = !isToday || checkUserFinishedWordleForDate(todayStr, currUser);

    // 1. 渲染今日/历史单词卡片 (通关后或历史日期直接展示该词及释义)
    if (wordCard) {
        if (!hasCompletedWordle) {
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
                    <span style="font-size:0.85rem;">正在查询词汇...</span>
                </div>
            `;
            try {
                const targetWordObj = (typeof getDailyWordForDate === 'function') 
                    ? await getDailyWordForDate(wordleLeaderboardDate) 
                    : null;
                if (targetWordObj && targetWordObj.word) {
                    const lowerWord = targetWordObj.word.toLowerCase();
                    const badgeText = '已揭晓';
                    wordCard.innerHTML = `
                        <div style="background:var(--md-sys-color-surface-container-low, #f8fafc); border:1px solid var(--md-sys-color-outline-variant, #e2e8f0); border-radius:16px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:0.75rem; font-weight:700; color:var(--md-sys-color-outline, #64748b); letter-spacing:0.5px; margin-bottom:4px;">${isToday ? '今日挑战单词' : '该日挑战单词'}</div>
                                <div style="display:flex; align-items:baseline; flex-wrap:wrap; gap:10px;">
                                    <span style="font-size:1.25rem; font-weight:800; color:var(--md-sys-color-primary, #0284c7); letter-spacing:0.5px; text-transform:lowercase; font-family:var(--md-sys-typescale-body-font, inherit);">${escapeHtml(lowerWord)}</span>
                                    <span style="font-size:0.86rem; color:var(--md-sys-color-on-surface-variant, #475569);">${escapeHtml(targetWordObj.meaning || '')}</span>
                                </div>
                            </div>
                            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.75rem; font-weight:700; padding:4px 12px; border-radius:9999px; flex-shrink:0;">${badgeText}</span>
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

    // 2. 优先从 Supabase 专用表 daily_wordle_records 查询
    try {
        if (typeof sbClient !== 'undefined' && sbClient) {
            let cloudRecs = null;
            let recErr = null;

            // 优先尝试查询包含 avatar_url，若表尚未新增该列则回退基础字段
            const resWithAvatar = await sbClient
                .from('daily_wordle_records')
                .select('username, avatar_url, is_won, attempts, time_spent, created_at')
                .eq('date', wordleLeaderboardDate)
                .eq('is_won', true);

            if (!resWithAvatar.error) {
                cloudRecs = resWithAvatar.data;
            } else {
                const resBasic = await sbClient
                    .from('daily_wordle_records')
                    .select('username, is_won, attempts, time_spent, created_at')
                    .eq('date', wordleLeaderboardDate)
                    .eq('is_won', true);
                cloudRecs = resBasic.data;
                recErr = resBasic.error;
            }

            if (!recErr && Array.isArray(cloudRecs) && cloudRecs.length > 0) {
                // 批量从 user_accounts 表查询用户头像以补全（保障跨用户、历史打卡头像展示）
                const usernamesNeeded = [...new Set(cloudRecs.map(r => r.username).filter(Boolean))];
                const avatarMap = {};
                if (usernamesNeeded.length > 0) {
                    try {
                        const { data: userRows } = await sbClient
                            .from('user_accounts')
                            .select('username, avatar_url')
                            .in('username', usernamesNeeded);
                        if (Array.isArray(userRows)) {
                            userRows.forEach(u => {
                                if (u && u.username && u.avatar_url) {
                                    avatarMap[u.username] = u.avatar_url;
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('[Leaderboard] Failed to fetch user_accounts avatars:', e);
                    }
                }

                cloudRecs.forEach(r => {
                    const avatarVal = r.avatar_url || avatarMap[r.username] || (typeof getUserAvatar === 'function' ? getUserAvatar(r.username) : '');
                    records.push({
                        username: r.username,
                        avatar: avatarVal,
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
                                    avatar: acc.avatar_url || (typeof getUserAvatar === 'function' ? getUserAvatar(acc.username) : ''),
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
                const myAvatar = (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.avatar)
                    ? currentUserProfile.avatar
                    : (typeof getUserAvatar === 'function' ? getUserAvatar(currUser) : '');
                const item = {
                    username: currUser,
                    avatar: myAvatar,
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
                <p style="margin-top:10px; font-size:0.95rem;">${wordleLeaderboardDate} 无玩家上榜</p>
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

        const isBili = Boolean(
            r.isBili ||
            cachedBiliUsernamesSet.has(r.username) ||
            (r.username === currUser && typeof currentUserProfile !== 'undefined' && currentUserProfile && (currentUserProfile.type === 'bilibili' || currentUserProfile.isBili))
        );

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
                            ${isBili ? LEADERBOARD_BILI_BADGE_HTML : ''}
                            ${r.isMe ? `<span style="font-size:0.72rem; background:#dbeafe; color:#0284c7; padding:1px 7px; border-radius:9999px; font-weight:700;">我</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.8rem; font-weight:700; padding:4px 10px; border-radius:9999px;">${r.attempts}次猜出</span>
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
window.toggleWordleSortDropdown = toggleWordleSortDropdown;
window.chooseWordleLeaderboardSort = chooseWordleLeaderboardSort;
window.renderLevelLeaderboard = renderLevelLeaderboard;
window.renderWordleLeaderboard = renderWordleLeaderboard;
