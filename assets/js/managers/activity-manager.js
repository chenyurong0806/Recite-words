/**
 * 活动系统管理器 (ActivityManager)
 * Module: assets/js/managers/activity-manager.js
 * 
 * 核心功能：
 * 1. 首页“活动”入口状态与未读数徽标管理（仅在支持该活动的平台显示，离线模式不显示）
 * 2. 平台活动过滤：关注和互动两个活动仅在 Toy 平台显示
 * 3. 简化活动详情弹窗 UI，打开后自动更新任务完成情况
 * 4. 简化任务列表：未完成显示“前往”或当前进度，完成显示“领取奖励”，领完显示“已领取”
 * 5. 活动 1: 关注作者 B 站账号 (Toy平台，一次性，通过 toy.getAuthorRelation() 检测，奖励段位保护卡)
 * 6. 活动 2: 给关联视频互动 (Toy平台，周期任务，点赞收藏奖排位保护卡，投币奖排位保护卡，关联视频变化时动态更新)
 */

(function (window) {
    'use strict';

    const AUTHOR_MID = '1569750390';
    const DEFAULT_VIDEO_BVID = 'BV1ieH96NERu';

    const ActivityManager = {
        _activities: [],
        _records: {},
        _readActivityIds: new Set(),
        _hasNotifiedCompleted: {},

        // 检查环境是否允许活动系统（离线模式不显示）
        isAvailable() {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return false;
            return true;
        },

        // 判断当前是否处于 B站 Toy 平台
        isToyPlatform() {
            return Boolean(
                (typeof isBilibiliToy !== 'undefined' && isBilibiliToy) ||
                (typeof window !== 'undefined' && (window.isBilibiliToy || window.toy || window.__cachedToyGuestId))
            );
        },

        // 检查当前用户是否为游客模式
        isGuest() {
            const u = this.getCurrentUsername();
            if (!u) return true;
            if (typeof LevelManager !== 'undefined' && typeof LevelManager.isGuestUser === 'function') {
                return LevelManager.isGuestUser(u);
            }
            return u.startsWith('游客') || u === 'guest';
        },

        // 谨慎检测是否真正运行在 B 站 App 容器内（避免普通网页触发 SDK 强行弹出“请在哔哩哔哩App中使用”弹窗）
        isBiliAppEnv() {
            if (typeof window === 'undefined') return false;
            if (typeof window.toy === 'undefined') return false;
            const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
            return /bili/i.test(ua) || Boolean(window.toy && window.toy.platform === 'app');
        },

        isToyBiliUser() {
            const isToy = this.isToyPlatform();
            const profile = (typeof currentUserProfile !== 'undefined' && currentUserProfile)
                ? currentUserProfile
                : (window.currentUserProfile || null);
            const isBili = Boolean(profile && profile.isLoggedIn && profile.type === 'bilibili');
            return isToy && isBili;
        },

        getCurrentUsername() {
            if (typeof currentUser !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
                return currentUser;
            }
            const profile = (typeof currentUserProfile !== 'undefined' && currentUserProfile) ? currentUserProfile : null;
            if (profile && profile.username) return profile.username;
            return '';
        },

        // 获取当前关联视频 BVID (支持 URL 查询参数、配置或默认视频)
        getAssociatedVideoBvid() {
            try {
                if (typeof window !== 'undefined' && window.location && window.location.search) {
                    const params = new URLSearchParams(window.location.search);
                    const bvidParam = params.get('bvid') || params.get('bv');
                    if (bvidParam) return bvidParam.trim();
                }
            } catch (e) { }

            if (typeof window !== 'undefined' && window.toyAssociatedVideo) {
                return String(window.toyAssociatedVideo).trim();
            }

            try {
                const stored = localStorage.getItem('vocab_toy_associated_bvid');
                if (stored) return stored.trim();
            } catch (e) { }

            return DEFAULT_VIDEO_BVID;
        },

        setAssociatedVideoBvid(bvid) {
            if (!bvid) return;
            const cleanBvid = bvid.trim();
            try {
                localStorage.setItem('vocab_toy_associated_bvid', cleanBvid);
            } catch (e) { }
            this.checkAssociatedVideoChange(cleanBvid);
        },

        // 初始化活动系统
        async init() {
            this.loadState();
            this.initActivitiesList();
            this.updateBadge();

            // 记录当前关联视频，不在此处自动调用 SDK 检测，避免一进网页就弹出 App 提示
            const currentBvid = this.getAssociatedVideoBvid();
            this._records.lastCheckedBvid = currentBvid;
            this.saveState();
        },

        loadState() {
            const u = this.getCurrentUsername() || 'guest';
            try {
                const raw = localStorage.getItem(`vocab_activity_records_${u}`);
                this._records = raw ? JSON.parse(raw) : {};
            } catch (e) {
                this._records = {};
            }

            try {
                const rawRead = localStorage.getItem(`vocab_read_activities_${u}`);
                this._readActivityIds = rawRead ? new Set(JSON.parse(rawRead)) : new Set();
            } catch (e) {
                this._readActivityIds = new Set();
            }
        },

        saveState() {
            const u = this.getCurrentUsername() || 'guest';
            try {
                localStorage.setItem(`vocab_activity_records_${u}`, JSON.stringify(this._records));
                localStorage.setItem(`vocab_read_activities_${u}`, JSON.stringify(Array.from(this._readActivityIds)));
            } catch (e) { }
        },

        initActivitiesList() {
            this._activities = [
                {
                    id: 'act_bili_follow',
                    title: '关注 up 主',
                    type: 'once',
                    typeLabel: '一次性',
                    icon: 'person_add',
                    platform: 'toy',
                    summary: '关注 up 主，即可领取一张【段位保护卡】！',
                    tasks: [
                        {
                            taskId: 'task_follow_author',
                            title: '关注 up 主',
                            rewardType: 'tier_protect',
                            rewardDesc: '段位保护卡 x1 (1个月有效)'
                        }
                    ]
                },
                {
                    id: 'act_bili_video_interaction',
                    title: '视频互动',
                    type: 'periodic',
                    typeLabel: '长期任务',
                    icon: 'thumb_up',
                    platform: 'toy',
                    summary: '给作者最新点赞、收藏、投币，即可领取【排位翻倍卡】！',
                    tasks: [
                        {
                            taskId: 'task_video_like',
                            title: '给关联视频点赞',
                            rewardType: 'rank_double',
                            rewardDesc: '排位翻倍卡 x1 (1个月有效)'
                        },
                        {
                            taskId: 'task_video_fav',
                            title: '给关联视频收藏',
                            rewardType: 'rank_double',
                            rewardDesc: '排位翻倍卡 x1 (1个月有效)'
                        },
                        {
                            taskId: 'task_video_coin',
                            title: '给关联视频投币',
                            rewardType: 'rank_double',
                            rewardDesc: '排位翻倍卡 x1 (1个月有效)'
                        }
                    ]
                }
            ];
        },

        // 判断该活动是否支持当前平台运行
        isActivitySupported(act) {
            if (!act) return false;
            const isToy = this.isToyPlatform();
            const p = act.platform || act.targetPlatform;
            if (!p || p === 'all') return true;
            if (p === 'toy' || p === 'bilibili_toy') return isToy;
            if (p === 'web') return !isToy;
            return true;
        },

        // 获取当前平台支持的活动列表（若活动不支持此平台，则不要在此平台中显示）
        getAvailableActivities() {
            return this._activities.filter(act => this.isActivitySupported(act));
        },

        // 检查关联视频变动
        async checkAssociatedVideoChange(bvid) {
            const prevBvid = this._records.lastCheckedBvid || '';
            if (bvid && bvid !== prevBvid) {
                this._records.lastCheckedBvid = bvid;
                this.saveState();

                // 关联视频变化时，仅在真实处于 B 站 App 环境且非游客时静默更新检测
                if (this.isBiliAppEnv() && !this.isGuest()) {
                    await this.detectVideoInteractionTasks(bvid, true);
                }
            }
        },

        // 检测关注作者任务完成情况（仅在 B 站 App 内有效）
        async detectFollowTask() {
            if (!this.isBiliAppEnv() || this.isGuest()) return false;

            const record = this._records.act_bili_follow || { completed: false, claimed: false };
            if (record.claimed) return true;

            try {
                if (typeof window.toy !== 'undefined' && typeof window.toy.getAuthorRelation === 'function') {
                    const res = await window.toy.getAuthorRelation();
                    const isFollowing = Boolean(res && res.status === 'ok' && res.data && (res.data.isFollowing || res.data.is_following));
                    if (isFollowing && !record.completed) {
                        record.completed = true;
                        this._records.act_bili_follow = record;
                        this.saveState();
                        this.notifyTaskStatusChange('关注作者 B 站账号');
                        this.updateBadge();
                    }
                    return isFollowing;
                }
            } catch (e) {
                console.warn('[ActivityManager] detectFollowTask error:', e);
            }
            return false;
        },

        // 检测关联视频互动任务完成情况（仅在 B 站 App 内有效）
        async detectVideoInteractionTasks(targetBvid = null, notifyOnUpdate = false) {
            if (!this.isBiliAppEnv() || this.isGuest()) return;

            const bvid = targetBvid || this.getAssociatedVideoBvid();
            if (!this._records.videoTasks) this._records.videoTasks = {};
            if (!this._records.videoTasks[bvid]) {
                this._records.videoTasks[bvid] = {
                    likeCompleted: false,
                    likeClaimed: false,
                    favCompleted: false,
                    favClaimed: false,
                    coinCompleted: false,
                    coinClaimed: false,
                    isLiked: false,
                    isFavorited: false,
                    coinCount: 0
                };
            }

            const videoRec = this._records.videoTasks[bvid];

            try {
                if (typeof window.toy !== 'undefined' && typeof window.toy.getVideoUserActions === 'function') {
                    const res = await window.toy.getVideoUserActions({
                        videos: [{ bvid: bvid }]
                    });

                    if (res && Array.isArray(res.items) && res.items.length > 0) {
                        const item = res.items[0];
                        if (item.status === 'ok') {
                            const isLiked = Boolean(item.liked);
                            const isFavorited = Boolean(item.favorited);
                            const coinCount = parseInt(item.coinCount || item.coin_count || 0);

                            videoRec.isLiked = isLiked;
                            videoRec.isFavorited = isFavorited;
                            videoRec.coinCount = coinCount;

                            let stateChanged = false;

                            // 任务1: 点赞
                            if (isLiked) {
                                if (!videoRec.likeCompleted) {
                                    videoRec.likeCompleted = true;
                                    stateChanged = true;
                                    if (notifyOnUpdate && !videoRec.likeClaimed) {
                                        this.notifyTaskStatusChange('给关联视频点赞');
                                    }
                                }
                            }

                            // 任务2: 收藏
                            if (isFavorited) {
                                if (!videoRec.favCompleted) {
                                    videoRec.favCompleted = true;
                                    stateChanged = true;
                                    if (notifyOnUpdate && !videoRec.favClaimed) {
                                        this.notifyTaskStatusChange('给关联视频收藏');
                                    }
                                }
                            }

                            // 任务3: 投币
                            if (coinCount > 0) {
                                if (!videoRec.coinCompleted) {
                                    videoRec.coinCompleted = true;
                                    stateChanged = true;
                                    if (notifyOnUpdate && !videoRec.coinClaimed) {
                                        this.notifyTaskStatusChange('给关联视频投币');
                                    }
                                }
                            }

                            this.saveState();
                            if (stateChanged) {
                                this.updateBadge();
                                if (document.getElementById('view-activity') && document.getElementById('view-activity').classList.contains('active')) {
                                    this.renderActivitiesView();
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[ActivityManager] detectVideoInteractionTasks error:', e);
            }
        },

        // 任务状态发生更新时的醒目提醒
        notifyTaskStatusChange(taskName) {
            const now = Date.now();
            if (this._hasNotifiedCompleted[taskName] && now - this._hasNotifiedCompleted[taskName] < 60000) {
                return;
            }
            this._hasNotifiedCompleted[taskName] = now;

            if (typeof showToast === 'function') {
                showToast(`活动任务【${taskName}】已完成，快去领取奖励吧！`, 4500);
            }
        },

        // 领取活动任务奖励
        async claimActivityTaskReward(activityId, taskId) {
            if (this.isGuest()) {
                if (typeof showToast === 'function') {
                    showToast('登录账号才可以参与活动！');
                }
                return;
            }

            const u = this.getCurrentUsername();
            if (!u) {
                if (typeof showToast === 'function') showToast('登录账号才可以领取奖励！');
                return;
            }

            const act = this._activities.find(a => a.id === activityId);
            if (!act) return;

            const bvid = this.getAssociatedVideoBvid();

            if (activityId === 'act_bili_follow') {
                const r = this._records.act_bili_follow || {};
                if (r.claimed) {
                    if (typeof showToast === 'function') showToast('该奖励已经领取过了');
                    return;
                }
                if (!r.completed) {
                    if (!this.isBiliAppEnv()) {
                        if (typeof showToast === 'function') showToast('关注检测仅在哔哩哔哩 App 内支持，请在 App 内操作');
                        return;
                    }
                    const isFollow = await this.detectFollowTask();
                    if (!isFollow) {
                        if (typeof showToast === 'function') showToast('检测到您尚未关注作者账号，请关注后重试');
                        return;
                    }
                }

                r.claimed = true;
                this._records.act_bili_follow = r;
                this.saveState();

                if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                    await ItemManager.grantItem(u, 'tier_protect', 30);
                }

                this.renderActivityDetail(activityId);
                this.renderActivitiesView();
                this.updateBadge();

                if (typeof showToast === 'function') {
                    showToast('领取成功！', 4000);
                }
            } else if (activityId === 'act_bili_video_interaction') {
                if (!this._records.videoTasks) this._records.videoTasks = {};
                if (!this._records.videoTasks[bvid]) {
                    this._records.videoTasks[bvid] = {
                        likeCompleted: false,
                        likeClaimed: false,
                        favCompleted: false,
                        favClaimed: false,
                        coinCompleted: false,
                        coinClaimed: false
                    };
                }
                const vt = this._records.videoTasks[bvid];

                // 1. 点赞任务
                if (taskId === 'task_video_like') {
                    if (vt.likeClaimed) {
                        if (typeof showToast === 'function') showToast('该任务奖励已领取');
                        return;
                    }
                    if (!vt.likeCompleted) {
                        if (!this.isBiliAppEnv()) {
                            if (typeof showToast === 'function') showToast('互动检测仅在哔哩哔哩 App 内支持，请在 App 内操作');
                            return;
                        }
                        await this.detectVideoInteractionTasks(bvid);
                        if (!vt.likeCompleted) {
                            if (typeof showToast === 'function') showToast('尚未完成点赞，请点赞后重试');
                            return;
                        }
                    }

                    vt.likeClaimed = true;
                    this.saveState();

                    if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                        await ItemManager.grantItem(u, 'rank_double', 30);
                    }

                    this.renderActivityDetail(activityId);
                    this.renderActivitiesView();
                    this.updateBadge();

                    if (typeof showToast === 'function') {
                        showToast('领取成功！', 4000);
                    }
                }
                // 2. 收藏任务
                else if (taskId === 'task_video_fav') {
                    if (vt.favClaimed) {
                        if (typeof showToast === 'function') showToast('该任务奖励已领取');
                        return;
                    }
                    if (!vt.favCompleted) {
                        if (!this.isBiliAppEnv()) {
                            if (typeof showToast === 'function') showToast('互动检测仅在哔哩哔哩 App 内支持，请在 App 内操作');
                            return;
                        }
                        await this.detectVideoInteractionTasks(bvid);
                        if (!vt.favCompleted) {
                            if (typeof showToast === 'function') showToast('尚未完成收藏，请收藏后重试');
                            return;
                        }
                    }

                    vt.favClaimed = true;
                    this.saveState();

                    if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                        await ItemManager.grantItem(u, 'rank_double', 30);
                    }

                    this.renderActivityDetail(activityId);
                    this.renderActivitiesView();
                    this.updateBadge();

                    if (typeof showToast === 'function') {
                        showToast('领取成功！', 4000);
                    }
                }
                // 3. 投币任务
                else if (taskId === 'task_video_coin') {
                    if (vt.coinClaimed) {
                        if (typeof showToast === 'function') showToast('该任务奖励已领取');
                        return;
                    }
                    if (!vt.coinCompleted) {
                        if (!this.isBiliAppEnv()) {
                            if (typeof showToast === 'function') showToast('互动检测仅在哔哩哔哩 App 内支持，请在 App 内操作');
                            return;
                        }
                        await this.detectVideoInteractionTasks(bvid);
                        if (!vt.coinCompleted) {
                            if (typeof showToast === 'function') showToast('尚未完成投币，请投币支持后重试');
                            return;
                        }
                    }

                    vt.coinClaimed = true;
                    this.saveState();

                    if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                        await ItemManager.grantItem(u, 'rank_double', 30);
                    }

                    this.renderActivityDetail(activityId);
                    this.renderActivitiesView();
                    this.updateBadge();

                    if (typeof showToast === 'function') {
                        showToast('领取成功！', 4000);
                    }
                }
                // 兼容旧 task_video_like_fav
                else if (taskId === 'task_video_like_fav') {
                    if (vt.likeClaimed && vt.favClaimed) {
                        if (typeof showToast === 'function') showToast('该任务奖励已领取');
                        return;
                    }
                    vt.likeClaimed = true;
                    vt.favClaimed = true;
                    this.saveState();
                    if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                        await ItemManager.grantItem(u, 'rank_double', 30);
                    }
                    this.renderActivityDetail(activityId);
                    this.renderActivitiesView();
                    this.updateBadge();
                    if (typeof showToast === 'function') showToast('领取成功！', 4000);
                }
            }
        },

        // 执行前往动作
        doActivityAction(action) {
            if (this.isGuest()) {
                if (typeof showToast === 'function') {
                    showToast('游客模式仅支持查看活动，请登录账号后参与！');
                }
                return;
            }

            if (action === 'follow_author') {
                if (typeof window.toy !== 'undefined' && typeof window.toy.navigate === 'function') {
                    try {
                        window.toy.navigate({
                            type: 'space',
                            id: String(AUTHOR_MID)
                        });
                        return;
                    } catch (e) {
                        console.warn('[Toy] navigate to space failed:', e);
                    }
                }
                window.open(`https://space.bilibili.com/${AUTHOR_MID}`, '_blank');
                return;
            }

            if (action === 'open_video') {
                const bvid = this.getAssociatedVideoBvid();
                if (typeof window.toy !== 'undefined' && typeof window.toy.navigate === 'function') {
                    try {
                        window.toy.navigate({
                            type: 'video',
                            id: String(bvid)
                        });
                        return;
                    } catch (e) {
                        console.warn('[Toy] navigate to video failed:', e);
                    }
                }
                window.open(`https://www.bilibili.com/video/${bvid}`, '_blank');
                return;
            }
        },

        // 计算未读与待领取提醒数量（仅计算当前平台可用的活动）
        getUnreadAndPendingCount() {
            if (!this.isAvailable()) return 0;
            let count = 0;

            const bvid = this.getAssociatedVideoBvid();
            const availActivities = this.getAvailableActivities();

            availActivities.forEach(act => {
                // 1. 新活动未读
                if (!this._readActivityIds.has(act.id)) {
                    count++;
                }

                // 2. 有已达成待领取的任务
                if (act.id === 'act_bili_follow') {
                    const r = this._records.act_bili_follow;
                    if (r && r.completed && !r.claimed) {
                        count++;
                    }
                } else if (act.id === 'act_bili_video_interaction') {
                    const vt = this._records.videoTasks && this._records.videoTasks[bvid];
                    if (vt) {
                        if ((vt.likeCompleted || vt.isLiked) && !vt.likeClaimed) count++;
                        if ((vt.favCompleted || vt.isFavorited) && !vt.favClaimed) count++;
                        if ((vt.coinCompleted || (vt.coinCount > 0)) && !vt.coinClaimed) count++;
                    }
                }
            });

            return count;
        },

        // 更新首页活动图标右上角的徽标及卡片显示
        updateBadge() {
            const badgeEl = document.getElementById('hub-activity-unread-badge');
            const entryCard = document.getElementById('hub-activity-entry-card');

            if (!this.isAvailable()) {
                if (entryCard) entryCard.style.display = 'none';
                if (badgeEl) badgeEl.style.display = 'none';
                return;
            }

            const availActivities = this.getAvailableActivities();

            // 非离线模式下，始终显示活动入口卡片（无论是否为 toy 平台）
            if (entryCard) {
                entryCard.style.display = 'flex';
            }

            if (!badgeEl) return;

            if (availActivities.length === 0) {
                badgeEl.style.display = 'none';
                return;
            }

            const count = this.getUnreadAndPendingCount();
            if (count > 0) {
                badgeEl.style.display = 'inline-flex';
                badgeEl.innerText = count > 99 ? '99+' : String(count);
            } else {
                badgeEl.style.display = 'none';
            }
        },

        // 标记某活动为已读
        markActivityAsRead(activityId) {
            this._readActivityIds.add(activityId);
            this.saveState();
            this.updateBadge();
        },

        // 渲染活动主页面
        renderActivitiesView() {
            const listEl = document.getElementById('activity-list-container');
            if (!listEl) return;

            const availActivities = this.getAvailableActivities();
            if (availActivities.length === 0) {
                listEl.innerHTML = `
                    <div class="card" style="text-align:center; padding:60px 16px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant);">
                        <span class="material-symbols-rounded" style="font-size:52px; color:var(--md-sys-color-outline); opacity:0.5;">campaign</span>
                        <h4 style="margin:12px 0 4px; font-weight:700; color:var(--md-sys-color-on-surface);">暂无进行中的活动</h4>
                    </div>
                `;
                return;
            }

            const bvid = this.getAssociatedVideoBvid();

            const cardsHtml = availActivities.map(act => {
                const isRead = this._readActivityIds.has(act.id);
                let statusBadge = '';
                let claimableNotice = false;

                if (act.id === 'act_bili_follow') {
                    const r = this._records.act_bili_follow || {};
                    if (r.claimed) {
                        statusBadge = `<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:700;">已参与并领取</span>`;
                    } else if (r.completed) {
                        statusBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700; border:1px solid #86efac;">可领取奖励</span>`;
                        claimableNotice = true;
                    } else {
                        statusBadge = `<span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-weight:700;">${act.typeLabel}</span>`;
                    }
                } else if (act.id === 'act_bili_video_interaction') {
                    const vt = (this._records.videoTasks && this._records.videoTasks[bvid]) || {};
                    const isLikeDone = Boolean(vt.likeCompleted || vt.isLiked);
                    const isFavDone = Boolean(vt.favCompleted || vt.isFavorited);
                    const isCoinDone = Boolean(vt.coinCompleted || (vt.coinCount > 0));

                    const hasClaimable = (isLikeDone && !vt.likeClaimed) || (isFavDone && !vt.favClaimed) || (isCoinDone && !vt.coinClaimed);
                    const allClaimed = vt.likeClaimed && vt.favClaimed && vt.coinClaimed;

                    if (allClaimed) {
                        statusBadge = `<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:700;">本期已领完</span>`;
                    } else if (hasClaimable) {
                        statusBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700; border:1px solid #86efac;">有奖励待领</span>`;
                        claimableNotice = true;
                    } else {
                        statusBadge = `<span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-weight:700;">${act.typeLabel}</span>`;
                    }
                }

                return `
                    <div class="card activity-item-card clickable" onclick="ActivityManager.openDetailModal('${act.id}')" style="padding:16px 20px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid ${claimableNotice ? '#86efac' : 'var(--md-sys-color-outline-variant)'}; display:flex; align-items:center; justify-content:space-between; gap:16px; cursor:pointer; position:relative; overflow:hidden; transition:all 0.2s ease;">
                        <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
                            <div style="width:48px; height:48px; border-radius:14px; background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <span class="material-symbols-rounded" style="font-size:26px;">${act.icon}</span>
                            </div>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:var(--md-sys-color-on-surface);">${act.title}</h3>
                                    ${statusBadge}
                                </div>
                                <p style="margin:4px 0 0; font-size:0.83rem; color:var(--md-sys-color-on-surface-variant); line-height:1.4;">${act.summary}</p>
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:4px; font-size:0.85rem; font-weight:700; color:var(--md-sys-color-primary); flex-shrink:0;">
                            <span>查看详情</span>
                            <span class="material-symbols-rounded entry-card-arrow" style="font-size:16px;">arrow_forward</span>
                        </div>
                    </div>
                `;
            }).join('');

            listEl.innerHTML = cardsHtml;
        },

        // 打开活动详情弹窗（自动更新任务完成情况）
        openDetailModal(activityId) {
            const act = this._activities.find(a => a.id === activityId);
            if (!act || !this.isActivitySupported(act)) return;

            this.markActivityAsRead(activityId);
            this.renderActivityDetail(activityId);
            const modal = document.getElementById('modal-activity-detail');
            if (modal) {
                modal.dataset.activityId = activityId;
                modal.classList.add('active');
            }

            // 仅在真正的 B 站 App 且非游客环境下自动触发检测，普通网页端严禁调用，防止强行弹出 App 弹窗
            if (this.isBiliAppEnv() && !this.isGuest()) {
                if (activityId === 'act_bili_follow') {
                    this.detectFollowTask().then(() => {
                        this.renderActivityDetail(activityId);
                    });
                } else if (activityId === 'act_bili_video_interaction') {
                    this.detectVideoInteractionTasks().then(() => {
                        this.renderActivityDetail(activityId);
                    });
                }
            }
        },

        closeDetailModal() {
            const modal = document.getElementById('modal-activity-detail');
            if (modal) {
                delete modal.dataset.activityId;
                modal.classList.remove('active');
            }
        },

        // 渲染简化的活动详情内容
        renderActivityDetail(activityId) {
            const container = document.getElementById('activity-detail-content');
            if (!container) return;

            const act = this._activities.find(a => a.id === activityId);
            if (!act || !this.isActivitySupported(act)) return;

            const bvid = this.getAssociatedVideoBvid();
            const isGuestUser = this.isGuest();
            const isBiliApp = this.isBiliAppEnv();

            let guestNoticeHtml = '';
            if (isGuestUser) {
                guestNoticeHtml = `
                    <div style="margin-bottom:12px; padding:10px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:var(--md-shape-m); font-size:0.83rem; color:#c2410c; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-rounded" style="font-size:18px;">lock</span>
                        <span>当前为游客模式，仅支持浏览活动。请登录账号后参与任务并领取奖励！</span>
                    </div>
                `;
            } else if (!isBiliApp) {
                guestNoticeHtml = `
                    <div style="margin-bottom:12px; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); border-radius:var(--md-shape-m); font-size:0.82rem; color:var(--md-sys-color-outline); display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-primary);">info</span>
                        <span>提示：该任务需要在哔哩哔哩 App 内完成</span>
                    </div>
                `;
            }

            let tasksHtml = '';

            if (act.id === 'act_bili_follow') {
                const r = this._records.act_bili_follow || {};
                const isCompleted = Boolean(r.completed);
                const isClaimed = Boolean(r.claimed);

                let rightActionHtml = '';
                if (isClaimed) {
                    rightActionHtml = `
                        <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.6; height:32px; padding:0 12px; cursor:default;">
                            <span class="material-symbols-rounded" style="font-size:15px;">check</span>
                            <span>已领取</span>
                        </button>
                    `;
                } else if (isCompleted) {
                    rightActionHtml = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.claimActivityTaskReward('act_bili_follow', 'task_follow_author')" style="background:#16a34a; color:#fff; font-weight:700; height:32px; padding:0 12px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                            <span class="material-symbols-rounded" style="font-size:15px;">redeem</span>
                            <span>领取奖励</span>
                        </button>
                    `;
                } else {
                    rightActionHtml = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.doActivityAction('follow_author')" style="height:32px; padding:0 14px;">
                            <span>前往</span>
                            <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>
                        </button>
                    `;
                }

                tasksHtml = `
                    <div class="card" style="padding:14px 16px; border-radius:var(--md-shape-m); background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <div style="min-width:0; flex:1;">
                            <div style="font-size:0.92rem; font-weight:700; color:var(--md-sys-color-on-surface);">关注作者 B 站官方账号</div>
                            <div style="font-size:0.78rem; color:#b45309; font-weight:600; margin-top:3px; display:inline-flex; align-items:center; gap:4px;">
                                <span class="material-symbols-rounded" style="font-size:14px;">featured_seasonal_and_gifts</span>
                                <span>奖励：段位保护卡 x1 (1个月有效)</span>
                            </div>
                        </div>
                        <div style="flex-shrink:0;">${rightActionHtml}</div>
                    </div>
                `;
            } else if (act.id === 'act_bili_video_interaction') {
                const vt = (this._records.videoTasks && this._records.videoTasks[bvid]) || {};

                // 任务1：点赞（进度类，target: 1）
                const likeProgress = (vt.likeCompleted || vt.isLiked) ? 1 : 0;
                const isLikeCompleted = vt.likeCompleted || vt.isLiked;
                const isLikeClaimed = Boolean(vt.likeClaimed);

                let rightAction1 = '';
                if (isLikeClaimed) {
                    rightAction1 = `
                        <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.6; height:32px; padding:0 12px; cursor:default;">
                            <span class="material-symbols-rounded" style="font-size:15px;">check</span>
                            <span>已领取</span>
                        </button>
                    `;
                } else if (isLikeCompleted) {
                    rightAction1 = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.claimActivityTaskReward('act_bili_video_interaction', 'task_video_like')" style="background:#16a34a; color:#fff; font-weight:700; height:32px; padding:0 12px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                            <span class="material-symbols-rounded" style="font-size:15px;">redeem</span>
                            <span>领取奖励</span>
                        </button>
                    `;
                } else {
                    rightAction1 = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary); background:var(--md-sys-color-primary-container); padding:3px 8px; border-radius:99px; white-space:nowrap;">
                                进度 ${likeProgress}/1
                            </span>
                            <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.doActivityAction('open_video')" style="height:32px; padding:0 12px;">
                                <span>前往</span>
                                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>
                            </button>
                        </div>
                    `;
                }

                // 任务2：收藏（进度类，target: 1）
                const favProgress = (vt.favCompleted || vt.isFavorited) ? 1 : 0;
                const isFavCompleted = vt.favCompleted || vt.isFavorited;
                const isFavClaimed = Boolean(vt.favClaimed);

                let rightAction2 = '';
                if (isFavClaimed) {
                    rightAction2 = `
                        <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.6; height:32px; padding:0 12px; cursor:default;">
                            <span class="material-symbols-rounded" style="font-size:15px;">check</span>
                            <span>已领取</span>
                        </button>
                    `;
                } else if (isFavCompleted) {
                    rightAction2 = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.claimActivityTaskReward('act_bili_video_interaction', 'task_video_fav')" style="background:#16a34a; color:#fff; font-weight:700; height:32px; padding:0 12px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                            <span class="material-symbols-rounded" style="font-size:15px;">redeem</span>
                            <span>领取奖励</span>
                        </button>
                    `;
                } else {
                    rightAction2 = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary); background:var(--md-sys-color-primary-container); padding:3px 8px; border-radius:99px; white-space:nowrap;">
                                进度 ${favProgress}/1
                            </span>
                            <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.doActivityAction('open_video')" style="height:32px; padding:0 12px;">
                                <span>前往</span>
                                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>
                            </button>
                        </div>
                    `;
                }

                // 任务3：投币（进度类，target: 1）
                const coinProgress = (vt.coinCount && vt.coinCount > 0) ? 1 : 0;
                const isTask3Completed = vt.coinCompleted || coinProgress >= 1;
                const isTask3Claimed = Boolean(vt.coinClaimed);

                let rightAction3 = '';
                if (isTask3Claimed) {
                    rightAction3 = `
                        <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.6; height:32px; padding:0 12px; cursor:default;">
                            <span class="material-symbols-rounded" style="font-size:15px;">check</span>
                            <span>已领取</span>
                        </button>
                    `;
                } else if (isTask3Completed) {
                    rightAction3 = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.claimActivityTaskReward('act_bili_video_interaction', 'task_video_coin')" style="background:#16a34a; color:#fff; font-weight:700; height:32px; padding:0 12px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                            <span class="material-symbols-rounded" style="font-size:15px;">redeem</span>
                            <span>领取奖励</span>
                        </button>
                    `;
                } else {
                    rightAction3 = `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.78rem; font-weight:700; color:var(--md-sys-color-primary); background:var(--md-sys-color-primary-container); padding:3px 8px; border-radius:99px; white-space:nowrap;">
                                进度 ${coinProgress}/1
                            </span>
                            <button type="button" class="btn btn-filled btn-sm" onclick="ActivityManager.doActivityAction('open_video')" style="height:32px; padding:0 12px;">
                                <span>前往</span>
                                <span class="material-symbols-rounded" style="font-size:14px;">open_in_new</span>
                            </button>
                        </div>
                    `;
                }

                tasksHtml = `
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <!-- 任务1：点赞 -->
                        <div class="card" style="padding:14px 16px; border-radius:var(--md-shape-m); background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:0.92rem; font-weight:700; color:var(--md-sys-color-on-surface);">给关联视频点赞</div>
                                <div style="font-size:0.78rem; color:#7e22ce; font-weight:600; margin-top:3px; display:inline-flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-rounded" style="font-size:14px;">featured_seasonal_and_gifts</span>
                                    <span>奖励：排位翻倍卡 x1 (1个月有效)</span>
                                </div>
                            </div>
                            <div style="flex-shrink:0;">${rightAction1}</div>
                        </div>

                        <!-- 任务2：收藏 -->
                        <div class="card" style="padding:14px 16px; border-radius:var(--md-shape-m); background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:0.92rem; font-weight:700; color:var(--md-sys-color-on-surface);">给关联视频收藏</div>
                                <div style="font-size:0.78rem; color:#7e22ce; font-weight:600; margin-top:3px; display:inline-flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-rounded" style="font-size:14px;">featured_seasonal_and_gifts</span>
                                    <span>奖励：排位翻倍卡 x1 (1个月有效)</span>
                                </div>
                            </div>
                            <div style="flex-shrink:0;">${rightAction2}</div>
                        </div>

                        <!-- 任务3：投币 -->
                        <div class="card" style="padding:14px 16px; border-radius:var(--md-shape-m); background:var(--md-sys-color-surface-container-low); border:1px solid var(--md-sys-color-outline-variant); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <div style="min-width:0; flex:1;">
                                <div style="font-size:0.92rem; font-weight:700; color:var(--md-sys-color-on-surface);">给关联视频投币</div>
                                <div style="font-size:0.78rem; color:#7e22ce; font-weight:600; margin-top:3px; display:inline-flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-rounded" style="font-size:14px;">featured_seasonal_and_gifts</span>
                                    <span>奖励：排位翻倍卡 x1 (1个月有效)</span>
                                </div>
                            </div>
                            <div style="flex-shrink:0;">${rightAction3}</div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div style="margin-bottom:14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--md-sys-color-on-surface);">${act.title}</h3>
                        <span class="badge" style="background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); font-weight:700; font-size:0.75rem;">${act.typeLabel}</span>
                    </div>
                    <div style="font-size:0.83rem; color:var(--md-sys-color-outline); margin-top:4px; line-height:1.45;">${act.summary}</div>
                </div>

                ${guestNoticeHtml}

                <div style="margin-top:14px;">
                    ${tasksHtml}
                </div>
            `;
        },

        // 手动测试或切换关联视频
        promptChangeVideo() {
            const current = this.getAssociatedVideoBvid();
            const input = window.prompt('请输入新的关联视频 BV 号（如 BV1ieH96NERu）：', current);
            if (input && input.trim() && input.trim() !== current) {
                this.setAssociatedVideoBvid(input.trim());
                this.renderActivityDetail('act_bili_video_interaction');
                if (typeof showToast === 'function') {
                    showToast(`已切换关联视频为 ${input.trim()}，任务状态已重置更新！`);
                }
            }
        }
    };

    window.ActivityManager = ActivityManager;

    // 窗口聚焦时若详情弹窗处于打开状态，自动触发状态刷新（仅在 B 站 App 环境且非游客）
    if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
            const modal = document.getElementById('modal-activity-detail');
            if (modal && modal.classList.contains('active') && modal.dataset.activityId) {
                const actId = modal.dataset.activityId;
                if (ActivityManager.isBiliAppEnv() && !ActivityManager.isGuest()) {
                    if (actId === 'act_bili_follow') {
                        ActivityManager.detectFollowTask().then(() => ActivityManager.renderActivityDetail(actId));
                    } else if (actId === 'act_bili_video_interaction') {
                        ActivityManager.detectVideoInteractionTasks().then(() => ActivityManager.renderActivityDetail(actId));
                    }
                }
            }
        });
    }

    // 全局快捷打开活动页面
    window.openActivityView = function () {
        if (!ActivityManager.isAvailable()) {
            if (typeof showToast === 'function') showToast('离线模式下无法查看活动');
            return;
        }
        if (typeof switchView === 'function') {
            switchView('view-activity');
        }
        ActivityManager.renderActivitiesView();
    };
    window.openActivityModal = window.openActivityView;
    ActivityManager.openActivityModal = window.openActivityView;

    window.exitActivityView = function () {
        if (typeof switchView === 'function') {
            switchView('view-hub');
        }
        ActivityManager.updateBadge();
    };

})(window);
