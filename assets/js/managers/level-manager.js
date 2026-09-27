/**
 * 用户等级与经验成长系统 (段位与等级分竞技系统 1段 - 9段)
 * Module: assets/js/managers/level-manager.js
 */

const LevelManager = {
    MAX_LEVEL: 9,
    MIN_LEVEL: 1,
    MIN_RANK: 1,
    MAX_RANK: 9,
    MAX_RATING: 100, // 每一段满分为 100 分

    // 检查是否为游客
    isGuestUser(username) {
        if (!username) return true;
        if (username.startsWith('游客')) return true;
        if (typeof currentUserProfile !== 'undefined' && currentUserProfile && currentUserProfile.username === username) {
            return !currentUserProfile.isLoggedIn || currentUserProfile.type === 'guest';
        }
        return false;
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

        // 数据范围安全保护
        data.rank = Math.max(this.MIN_RANK, Math.min(this.MAX_RANK, parseInt(data.rank) || 1));
        data.rating = Math.max(0, Math.min(this.MAX_RATING, parseInt(data.rating) || 0));
        data.isPromotionReady = (data.rank < this.MAX_RANK && data.rating >= this.MAX_RATING);

        return {
            isGuest: false,
            rank: data.rank,
            rating: data.rating,
            isPromotionReady: data.isPromotionReady,
            battles: data.battles || { total: 0, wins: 0, losses: 0, draws: 0 },
            level: data.rank, // 兼容现有调用 level 的字段
            score: data.rating, // 兼容 score
            progressPercent: data.rating, // 满分 100，百分比即当前分数
            comparisonText: data.isPromotionReady ? '请完成升段赛' : `${data.rating} / 100 分`
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

    // 仅获取当前等级分 (0 ~ 100)
    getUserRating(username) {
        return this.getUserRankData(username).rating;
    },

    // 获取完整等级与段位信息
    getLevelData(username) {
        const u = username || (typeof currentUser !== 'undefined' ? currentUser : '');
        const rankData = this.getUserRankData(u);
        return {
            ...rankData,
            title: `${rankData.rank}段`,
            neededExp: this.MAX_RATING,
            currentLevelExp: rankData.rating,
            currentThreshold: 0,
            nextThreshold: this.MAX_RATING
        };
    },

    // 根据分值反推等级（兼容旧接口）
    getLevelFromScore(score) {
        if (!score || score <= 0) return 1;
        const r = Math.floor(score / 100) + 1;
        return Math.max(1, Math.min(9, r));
    },

    /**
     * 智能计算排位对局得分与失分
     * @param {Object} params
     * @param {boolean} params.isRanked - 是否为排位赛模式
     * @param {boolean} params.isAi - 是否为人机对战
     * @param {boolean} params.playerWin - 我方是否获胜
     * @param {boolean} params.isDraw - 是否平局
     * @param {number} params.userRank - 我方段位 (1~9)
     * @param {number} params.userRating - 我方等级分 (0~100)
     * @param {number} params.oppoRank - 对手段位 (1~9)
     * @param {number} params.oppoRating - 对手等级分 (0~100)
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

        const isPromotionState = (userRating >= this.MAX_RATING && userRank < this.MAX_RANK);
        // 升段赛条件：对局对手为人机且高于自己1段，或玩家且高于自己段位
        const isPromotionMatch = isPromotionState && (isAi ? (oppoRank === userRank + 1) : (oppoRank > userRank));

        // 双方综合评分差值 (每段等于 100 分)
        const myTotal = (userRank - 1) * 100 + userRating;
        const oppoTotal = (oppoRank - 1) * 100 + oppoRating;
        const ratingDiff = oppoTotal - myTotal; // 正数表示对手更强，负数表示对手更弱

        // 3. 升段赛专属结算
        if (isPromotionMatch) {
            if (playerWin) {
                // 如果一方等级分是0，则另一方赢了不得分且不晋级
                if (userRating === 0 || oppoRating === 0) {
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
                        isPromotionMatch: true,
                        reason: '对局一方等级分为0，升段赛获胜不予加分与晋升'
                    };
                }
                // 升段赛获胜：成功升至下一段，并获得升段初始积分（按分差智能计算获胜得分）
                const bonusGain = Math.max(15, Math.min(35, Math.round(20 + ratingDiff * 0.1)));
                const newRank = Math.min(this.MAX_RANK, userRank + 1);
                const newRating = bonusGain;
                return {
                    isRanked: true,
                    playerWin: true,
                    isDraw: false,
                    deltaPoints: bonusGain,
                    oldRank: userRank,
                    oldRating: userRating,
                    newRank: newRank,
                    newRating: newRating,
                    isPromoted: true,
                    isDemoted: false,
                    isPromotionMatch: true,
                    reason: `🔥 升段赛大捷！成功晋升至 ${newRank}段，奖励 ${bonusGain} 分！`
                };
            } else {
                // 升段赛失败：“输了不会倒扣等级分”
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
                    isPromotionMatch: true,
                    reason: '升段赛惜败：等级分受段位保护，不扣除分值'
                };
            }
        }

        // 如果处于满分升段就绪状态，但挑战的对手不符合升段要求（未挑战更高段位）：
        if (isPromotionState) {
            if (playerWin) {
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
                    reason: '当前等级分已达上限 (100分)，请挑战更高段位进行升段赛！'
                };
            } else {
                // 非升段赛对局战败扣分，退出满分状态
                const lossBase = Math.max(5, Math.min(30, Math.round(15 - ratingDiff * 0.1)));
                const newRating = Math.max(0, userRating - lossBase);
                return {
                    isRanked: true,
                    playerWin: false,
                    isDraw: false,
                    deltaPoints: -lossBase,
                    oldRank: userRank,
                    oldRating: userRating,
                    newRank: userRank,
                    newRating: newRating,
                    isPromoted: false,
                    isDemoted: false,
                    isPromotionMatch: false,
                    reason: `战败扣除 ${lossBase} 分`
                };
            }
        }

        // 4. 常规排位赛结算
        if (playerWin) {
            // 如果一方等级分是0，则另一方赢了不得分
            if (userRating === 0 || oppoRating === 0) {
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
                    isPromotionReady: false,
                    reason: '对局一方等级分为0，获胜不增加等级分'
                };
            }

            // 获胜加分：根据双方分差自适应浮动 [10, 40]
            const winGain = Math.max(10, Math.min(40, Math.round(20 + ratingDiff * 0.1)));
            const prospective = userRating + winGain;
            let newRank = userRank;
            let newRating = prospective;
            let promotionReady = false;

            if (prospective >= this.MAX_RATING) {
                newRating = this.MAX_RATING;
                if (userRank < this.MAX_RANK) {
                    promotionReady = true;
                }
            }

            return {
                isRanked: true,
                playerWin: true,
                isDraw: false,
                deltaPoints: winGain,
                oldRank: userRank,
                oldRating: userRating,
                newRank: newRank,
                newRating: newRating,
                isPromoted: false,
                isDemoted: false,
                isPromotionMatch: false,
                isPromotionReady: promotionReady,
                reason: promotionReady ? '🎉 满分达成！已解锁升段赛资格！' : `排位胜利，获得 +${winGain} 分！`
            };
        } else {
            // 战败扣分：根据双方分差自适应浮动 [5, 30]
            const lossDeduct = Math.max(5, Math.min(30, Math.round(15 - ratingDiff * 0.1)));
            const prospective = userRating - lossDeduct;

            if (prospective < 0) {
                // 等级分掉光自动掉段
                if (userRank > this.MIN_RANK) {
                    const newRank = userRank - 1;
                    // 掉段后降到前一段位，保留基础分数（如 80分 或 100 - 超出扣除分）
                    const newRating = Math.max(0, Math.min(90, 100 + prospective));
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
                        isDemoted: true,
                        isPromotionMatch: false,
                        reason: `💔 积分不足已自动掉段至 ${newRank}段 (${newRating}分)`
                    };
                } else {
                    // 1段最低分保护
                    return {
                        isRanked: true,
                        playerWin: false,
                        isDraw: false,
                        deltaPoints: -userRating,
                        oldRank: 1,
                        oldRating: userRating,
                        newRank: 1,
                        newRating: 0,
                        isPromoted: false,
                        isDemoted: false,
                        isPromotionMatch: false,
                        reason: `积分已归零 (1段保底)`
                    };
                }
            } else {
                return {
                    isRanked: true,
                    playerWin: false,
                    isDraw: false,
                    deltaPoints: -lossDeduct,
                    oldRank: userRank,
                    oldRating: userRating,
                    newRank: userRank,
                    newRating: prospective,
                    isPromoted: false,
                    isDemoted: false,
                    isPromotionMatch: false,
                    reason: `排位战败，扣除 ${lossDeduct} 分`
                };
            }
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
