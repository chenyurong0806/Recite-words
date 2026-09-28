/**
 * 用户等级与经验成长系统 (段位与等级分竞技系统 1段 - 9段)
 * Module: assets/js/managers/level-manager.js
 */

const LevelManager = {
    MAX_LEVEL: 9,
    MIN_LEVEL: 1,
    MIN_RANK: 1,
    MAX_RANK: 9,
    MAX_RATING: 900, // 9段满分为 900 分 (每段100分)

    // 检查是否为游客
    isGuestUser(username) {
        if (!username) return true;
        if (username.startsWith('游客')) return true;
        if (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.username === username) {
            return !currentUserProfile.isLoggedIn || currentUserProfile.type === 'guest';
        }
        return false;
    },

    // 根据总等级分反推段位 (1段: 1-100, 2段: 101-200, ..., 9段: 801-900)
    getRankFromRating(rating) {
        const r = parseInt(rating) || 0;
        if (r <= 0) return 1;
        return Math.min(this.MAX_RANK, Math.max(1, Math.ceil(r / 100)));
    },

    // 获取某段位的中间等级分 (如 1段 50分, 2段 150分, 3段 250分)
    getRankMidpointRating(rank) {
        const r = Math.max(1, Math.min(this.MAX_RANK, parseInt(rank) || 1));
        return (r - 1) * 100 + 50;
    },

    // 获取用户段位数据
    getUserRankData(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        if (!u || this.isGuestUser(u)) {
            return {
                isGuest: true,
                rank: 1,
                rating: 0,
                isPromotionReady: false,
                battles: { total: 0, wins: 0, losses: 0, draws: 0 },
                level: 1,
                score: 0,
                progressPercent: 0,
                comparisonText: '游客状态下不参与排位'
            };
        }

        const key = `vocab_rank_data_${u}`;
        let data = null;
        try {
            const raw = SafeStorage.getItem(key);
            if (raw) data = JSON.parse(raw);
        } catch (e) { }

        // 如果本地没有但 currentUserProfile 里有，从 profile 恢复
        if (!data && typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.user_data && currentUserProfile.user_data.rank_data) {
            data = currentUserProfile.user_data.rank_data;
        }

        if (!data || typeof data.rank !== 'number') {
            data = {
                rank: 1,
                rating: 0,
                isPromotionReady: false,
                battles: { total: 0, wins: 0, losses: 0, draws: 0 }
            };
            this.saveUserRankData(u, data);
        }

        // 数据迁移与范围安全保护
        data.rating = Math.max(0, parseInt(data.rating) || 0);
        // 如果旧数据中 rank > 1 但 rating <= 100，自动平滑迁移为连续等级分
        if (data.rank > 1 && data.rating <= 100) {
            data.rating = (data.rank - 1) * 100 + data.rating;
        }
        data.rank = this.getRankFromRating(data.rating);
        const withinTier = data.rating <= 0 ? 0 : ((data.rating - 1) % 100) + 1;
        const progressPercent = Math.max(0, Math.min(100, withinTier));
        const tierMax = data.rank * 100;
        const isPromotionReady = (data.rank < this.MAX_RANK && data.rating >= tierMax);

        return {
            isGuest: false,
            rank: data.rank,
            rating: data.rating,
            isPromotionReady: isPromotionReady,
            battles: data.battles || { total: 0, wins: 0, losses: 0, draws: 0 },
            level: data.rank, // 兼容现有调用 level 的字段
            score: data.rating, // 兼容 score
            progressPercent: progressPercent, // 当前段位内百分比 (0~100%)
            comparisonText: `${data.rating} 分 (当前段位 ${progressPercent}/100)`
        };
    },

    // 保存用户段位数据
    saveUserRankData(username, data) {
        if (!username || this.isGuestUser(username)) return;
        try {
            SafeStorage.setItem(`vocab_rank_data_${username}`, JSON.stringify(data));
        } catch (e) { }
    },

    // 仅获取当前段位数 (1 ~ 9)
    getUserLevel(username) {
        return this.getUserRankData(username).rank;
    },

    // 仅获取当前等级分
    getUserRating(username) {
        return this.getUserRankData(username).rating;
    },

    // 获取完整等级与段位信息
    getLevelData(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        const rankData = this.getUserRankData(u);
        const withinTier = rankData.rating <= 0 ? 0 : ((rankData.rating - 1) % 100) + 1;
        return {
            ...rankData,
            title: `${rankData.rank}段`,
            neededExp: 100,
            currentLevelExp: withinTier,
            currentThreshold: (rankData.rank - 1) * 100,
            nextThreshold: rankData.rank * 100
        };
    },

    // 根据分值反推等级（兼容旧接口）
    getLevelFromScore(score) {
        return this.getRankFromRating(score);
    },

    /**
     * 智能计算排位对局得分与失分
     * @param {Object} params
     * @param {boolean} params.isRanked - 是否为排位赛模式
     * @param {boolean} params.isAi - 是否为人机对战
     * @param {boolean} params.playerWin - 我方是否获胜
     * @param {boolean} params.isDraw - 是否平局
     * @param {number} params.userRank - 我方段位 (1~9)
     * @param {number} params.userRating - 我方等级分
     * @param {number} params.oppoRank - 对手段位 (1~9)
     * @param {number} params.oppoRating - 对手等级分
     */
    calculateMatchResult({
        isRanked = true,
        isAi = false,
        playerWin = false,
        isDraw = false,
        userRank = 1,
        userRating = 0,
        oppoRank = 1,
        oppoRating = 50
    } = {}) {
        // 0. 游客禁止参与排位赛
        if (typeof currentUser !== 'undefined' && this.isGuestUser(currentUser)) {
            isRanked = false;
        }

        // 人机等级分固定在每段中间（例如 1段为50分，2段为150分），不受输赢影响
        if (isAi) {
            oppoRating = this.getRankMidpointRating(oppoRank);
        }

        // 1. 友谊赛模式不增减积分
        if (!isRanked) {
            return {
                isRanked: false,
                playerWin: Boolean(playerWin),
                isDraw: Boolean(isDraw),
                deltaPoints: 0,
                oldRank: userRank,
                oldRating: userRating,
                newRank: userRank,
                newRating: userRating,
                isPromoted: false,
                isDemoted: false,
                isPromotionMatch: false,
                reason: '友谊赛模式：不计段位与等级分'
            };
        }

        // 2. 平局不增减积分
        if (isDraw) {
            return {
                isRanked: true,
                playerWin: false,
                isDraw: true,
                deltaPoints: 0,
                oldRank: userRank,
                oldRating: userRating,
                newRank: userRank,
                newRating: userRating,
                isPromoted: false,
                isDemoted: false,
                isPromotionMatch: false,
                reason: '双方战平：等级分保持不变'
            };
        }

        // 3. 特殊零分规则：
        // (1) 当赢了等级分为 0 的用户时，不加分
        if (playerWin && oppoRating === 0) {
            return {
                isRanked: true,
                playerWin: true,
                isDraw: false,
                deltaPoints: 0,
                oldRank: userRank,
                oldRating: userRating,
                newRank: userRank,
                newRating: userRating,
                isPromoted: false,
                isDemoted: false,
                isPromotionMatch: false,
                reason: '对手等级分为 0，获胜不增加等级分'
            };
        }

        // (2) 如果自己等级分为 0，则输了不扣分
        if (!playerWin && userRating === 0) {
            return {
                isRanked: true,
                playerWin: false,
                isDraw: false,
                deltaPoints: 0,
                oldRank: userRank,
                oldRating: userRating,
                newRank: userRank,
                newRating: userRating,
                isPromoted: false,
                isDemoted: false,
                isPromotionMatch: false,
                reason: '我方等级分为 0，战败不扣除等级分'
            };
        }

        // 双方分差
        const ratingDiff = oppoRating - userRating;

        if (playerWin) {
            // 基础加分：根据双方分差自适应浮动 [12, 36]
            const baseGain = Math.max(12, Math.min(36, Math.round(20 + ratingDiff * 0.08)));
            // 随段位提升放慢加分速度 (1段 100% 速度，逐步递减至 9段 40% 速度)
            const rankSlowdownFactor = Math.max(0.40, 1.0 - (userRank - 1) * 0.075);
            const winGain = Math.max(3, Math.round(baseGain * rankSlowdownFactor));

            const newRating = userRating + winGain;
            const newRank = this.getRankFromRating(newRating);
            const isPromoted = (newRank > userRank);

            return {
                isRanked: true,
                playerWin: true,
                isDraw: false,
                deltaPoints: winGain,
                oldRank: userRank,
                oldRating: userRating,
                newRank: newRank,
                newRating: newRating,
                isPromoted: isPromoted,
                isDemoted: false,
                isPromotionMatch: false,
                reason: isPromoted
                    ? `🔥 突破晋升！成功升至 ${newRank}段 (+${winGain}分)`
                    : `排位胜利，获得 +${winGain} 分！`
            };
        } else {
            // 战败扣分：根据双方分差自适应浮动 [6, 26]
            const baseLoss = Math.max(6, Math.min(26, Math.round(15 - ratingDiff * 0.08)));
            const lossDeduct = Math.min(userRating, baseLoss);

            const newRating = Math.max(0, userRating - lossDeduct);
            const newRank = this.getRankFromRating(newRating);
            const isDemoted = (newRank < userRank);

            return {
                isRanked: true,
                playerWin: false,
                isDraw: false,
                deltaPoints: -lossDeduct,
                oldRank: userRank,
                oldRating: userRating,
                newRank: newRank,
                newRating: newRating,
                isPromoted: false,
                isDemoted: isDemoted,
                isPromotionMatch: false,
                reason: isDemoted
                    ? `💔 积分不足已自动降至 ${newRank}段 (-${lossDeduct}分)`
                    : `排位战败，扣除 ${lossDeduct} 分`
            };
        }
    },

    // 应用结算结果并持久化与云端同步
    async applyMatchResult(username, matchResult) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        if (!u || this.isGuestUser(u)) return matchResult;

        const current = this.getUserRankData(u);
        const battles = current.battles || { total: 0, wins: 0, losses: 0, draws: 0 };
        battles.total = (battles.total || 0) + 1;

        if (matchResult.isRanked) {
            if (matchResult.playerWin) {
                battles.wins = (battles.wins || 0) + 1;
            } else if (matchResult.isDraw) {
                battles.draws = (battles.draws || 0) + 1;
            } else {
                battles.losses = (battles.losses || 0) + 1;
            }
        }

        const updatedData = {
            rank: matchResult.newRank,
            rating: matchResult.newRating,
            isPromotionReady: (matchResult.newRank < this.MAX_RANK && matchResult.newRating >= this.MAX_RATING),
            battles: battles
        };

        this.saveUserRankData(u, updatedData);

        if (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.isLoggedIn) {
            currentUserProfile.level = matchResult.newRank;
            if (!currentUserProfile.user_data) currentUserProfile.user_data = {};
            currentUserProfile.user_data.rank_data = updatedData;
        }

        // 同步至 Supabase 云端
        await this.syncUserLevelCloud(u);

        // 刷新 Hub 与 Profile 界面展示
        if (typeof updateHub === 'function') {
            try { updateHub(); } catch (e) { }
        }
        if (typeof renderMeView === 'function') {
            try { renderMeView(); } catch (e) { }
        }

        return matchResult;
    },

    // 更新并在必要时同步到 Supabase 云端
    async syncUserLevelCloud(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        if (!u || this.isGuestUser(u)) return;

        const data = this.getUserRankData(u);
        if (typeof sbClient !== 'undefined' && sbClient) {
            try {
                await sbClient.from('user_accounts').update({
                    level: data.rank,
                    updated_at: new Date().toISOString()
                }).eq('username', u);
            } catch (e) {
                console.warn('[LevelManager] Failed to sync rank column to Supabase:', e);
            }
        }

        if (typeof syncAllUserDataToCloud === 'function') {
            syncAllUserDataToCloud(u);
        }
    },

    // 记录每日任务并触发等级云端同步 (保持兼容)
    recordDailyTask(taskType) {
        if (!currentUser || this.isGuestUser(currentUser)) return;
        this.syncUserLevelCloud(currentUser);
    }
};

window.LevelManager = LevelManager;
