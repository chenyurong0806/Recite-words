/**
 * 用户等级与经验成长系统 (Lv.1 - Lv.60)
 * Module: assets/js/managers/level-manager.js
 */

const LevelManager = {
    MAX_LEVEL: 60,
    MIN_LEVEL: 1,

    // 计算特定等级所需的累计经验阈值 (平滑指数曲线)
    getExpThresholdForLevel(level) {
        if (level <= 1) return 0;
        if (level > this.MAX_LEVEL) level = this.MAX_LEVEL;
        return Math.floor(25 * Math.pow(level - 1, 1.4));
    },

    // 等级称号 (已停用)
    getLevelTitle(level) {
        return '';
    },

    // 检查是否为游客
    isGuestUser(username) {
        if (!username) return true;
        if (username.startsWith('游客')) return true;
        if (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.username === username) {
            return !currentUserProfile.isLoggedIn || currentUserProfile.type === 'guest';
        }
        return false;
    },

    // 计算用户的总经验分值 (可增加和减少)
    calculateUserScore(username) {
        if (!username || this.isGuestUser(username)) return 0;

        let totalScore = 0;

        // 1. 学习打卡与复习活跃度 (+分)
        let studyActions = 0;
        try {
            const rawLogs = localStorage.getItem(`vocab_daily_logs_${username}`);
            if (rawLogs) {
                const logs = JSON.parse(rawLogs);
                Object.values(logs).forEach(log => {
                    studyActions += (log.learned || 0) + (log.reviewed || 0) + (log.riddle || 0) + (log.dictation || 0);
                });
            }
        } catch (e) { }
        totalScore += Math.floor(studyActions * 2.5);

        // 2. 学习词数与熟词掌握 (+分)
        let learnedCount = 0;
        let overdueCount = 0;
        try {
            const rawEbb = localStorage.getItem(`vocab_ebbinghaus_db_${username}`);
            if (rawEbb) {
                const ebb = JSON.parse(rawEbb);
                const now = Date.now();
                Object.values(ebb).forEach(r => {
                    if (r && r.stage >= 1) {
                        learnedCount++;
                        // 逾期未复习惩罚扣分 (-分)
                        if (r.stage < 5 && r.nextReview && now > r.nextReview) {
                            overdueCount++;
                        }
                    }
                });
            }
        } catch (e) { }
        totalScore += learnedCount * 8;
        totalScore -= overdueCount * 5; // 逾期扣分

        // 3. 熟词记录 (+分)
        let masteredCount = 0;
        try {
            const rawMast = localStorage.getItem(`vocab_mastered_words_${username}`);
            if (rawMast) {
                const mast = JSON.parse(rawMast);
                masteredCount = Array.isArray(mast) ? mast.length : 0;
            }
        } catch (e) { }
        totalScore += masteredCount * 12;

        // 4. 正确答题数与错题堆积惩罚
        try {
            let stats = null;
            if (typeof userStats !== 'undefined' && currentUser === username) {
                stats = userStats;
            } else {
                const rawStats = localStorage.getItem(`vocab_stats_${username}`);
                if (rawStats) stats = JSON.parse(rawStats);
            }
            if (stats) {
                totalScore += (stats.correct || 0) * 3;
                const mistakesCount = Object.keys(stats.mistakes || {}).length;
                totalScore -= mistakesCount * 4; // 错题过多未消灭扣分 (-分)
            }
        } catch (e) { }

        // 5. 今日 Wordle 成果 (+分)
        try {
            const rawWordle = localStorage.getItem(`vocab_wordle_history_${username}`);
            if (rawWordle) {
                const history = JSON.parse(rawWordle);
                const wonCount = Object.values(history).filter(h => h && h.isWon).length;
                totalScore += wonCount * 25;
            }
        } catch (e) { }

        return Math.max(0, Math.floor(totalScore));
    },

    // 根据分值反推等级
    getLevelFromScore(score) {
        if (score <= 0) return this.MIN_LEVEL;
        for (let l = this.MAX_LEVEL; l >= 1; l--) {
            if (score >= this.getExpThresholdForLevel(l)) {
                return l;
            }
        }
        return this.MIN_LEVEL;
    },

    // 获取完整等级数据包
    getLevelData(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        if (!u || this.isGuestUser(u)) {
            return {
                isGuest: true,
                level: 0,
                score: 0,
                title: '',
                progressPercent: 0,
                currentLevelExp: 0,
                neededExp: 0,
                comparisonText: '游客状态下不支持等级功能'
            };
        }

        const score = this.calculateUserScore(u);
        const level = this.getLevelFromScore(score);
        const title = '';

        const currentThreshold = this.getExpThresholdForLevel(level);
        const nextThreshold = level < this.MAX_LEVEL ? this.getExpThresholdForLevel(level + 1) : currentThreshold;
        const neededExp = Math.max(1, nextThreshold - currentThreshold);
        const currentLevelExp = Math.max(0, score - currentThreshold);
        const progressPercent = level >= this.MAX_LEVEL ? 100 : Math.min(100, Math.floor((currentLevelExp / neededExp) * 100));

        // 对比昨日 / 上一次登录数据
        const comparison = this.getHistoryComparison(u, level, score);

        return {
            isGuest: false,
            level,
            score,
            title,
            currentThreshold,
            nextThreshold,
            currentLevelExp,
            neededExp,
            progressPercent,
            deltaLevel: comparison.deltaLevel,
            deltaScore: comparison.deltaScore,
            comparisonText: comparison.text,
            comparisonType: comparison.type // 'up' | 'down' | 'neutral'
        };
    },

    // 仅获取等级数字
    getUserLevel(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        if (!u || this.isGuestUser(u)) return 0;
        const score = this.calculateUserScore(u);
        return this.getLevelFromScore(score);
    },

    // 记录并对比昨日与上一次登录 (简化显示，不展示具体经验值)
    getHistoryComparison(username, currentLevel, currentScore) {
        const todayStr = (new Date()).toISOString().slice(0, 10);
        const key = `vocab_level_history_${username}`;
        let history = null;
        try {
            history = JSON.parse(localStorage.getItem(key) || 'null');
        } catch (e) { }

        if (!history) {
            // 初次初始化记录
            const initRecord = {
                lastLoginDate: todayStr,
                yesterdayDate: '',
                yesterdayLevel: currentLevel,
                yesterdayScore: currentScore,
                prevLoginLevel: currentLevel,
                prevLoginScore: currentScore
            };
            try {
                localStorage.setItem(key, JSON.stringify(initRecord));
            } catch (e) { }
            return { deltaLevel: 0, deltaScore: 0, text: '与昨日持平', type: 'neutral' };
        }

        // 判断日期更替
        if (history.lastLoginDate !== todayStr) {
            // 发生跨日，将上一日的记录归档为 yesterday
            history.yesterdayDate = history.lastLoginDate;
            history.yesterdayLevel = history.prevLoginLevel || currentLevel;
            history.yesterdayScore = history.prevLoginScore || currentScore;
            history.prevLoginLevel = currentLevel;
            history.prevLoginScore = currentScore;
            history.lastLoginDate = todayStr;
            try {
                localStorage.setItem(key, JSON.stringify(history));
            } catch (e) { }
        }

        const baseLevel = history.yesterdayLevel || history.prevLoginLevel || currentLevel;
        const deltaLevel = currentLevel - baseLevel;

        let text = '与昨日持平';
        let type = 'neutral';

        if (deltaLevel > 0) {
            text = `较昨日 +${deltaLevel} 级`;
            type = 'up';
        } else if (deltaLevel < 0) {
            text = `较昨日 -${deltaLevel} 级`;
            type = 'down';
        } else {
            text = '与昨日持平';
            type = 'neutral';
        }

        return { deltaLevel, deltaScore: 0, text, type };
    },

    // 更新并在必要时同步到 Supabase 云端
    async syncUserLevelCloud(username) {
        if (!username || this.isGuestUser(username)) return;
        const data = this.getLevelData(username);
        if (typeof sbClient !== 'undefined' && sbClient) {
            try {
                await sbClient.from('user_accounts').update({
                    level: data.level,
                    updated_at: new Date().toISOString()
                }).eq('username', username);
            } catch (e) {
                console.warn('[LevelManager] Failed to sync level column to Supabase:', e);
            }
        }
        if (typeof supabaseSyncUserData === 'function') {
            supabaseSyncUserData(username, {
                levelData: {
                    level: data.level,
                    score: data.score,
                    updatedAt: Date.now()
                }
            });
        }
    }
};

window.LevelManager = LevelManager;

