/**
 * 道具系统管理器 (ItemManager)
 * Module: assets/js/managers/item-manager.js
 * 
 * 核心功能：
 * 1. 道具云端存储 (Supabase user_items 表) 与本地安全缓存
 * 2. 道具定义与图鉴（排位保护卡、段位保护卡）
 * 3. 道具有效期与生效时限控制、不可叠加规则
 * 4. 战败扣分与掉段保护逻辑（优先级：排位保护卡 ＞ 段位保护卡）
 * 5. 活动任务系统（完成任务获取道具）
 */

(function (window) {
    'use strict';

    // 道具定义与图鉴数据库
    const ITEM_DEFINITIONS = {
        rank_protect: {
            type: 'rank_protect',
            name: '排位保护卡',
            icon: 'shield',
            color: '#d97706',
            bgColor: '#fef3c7',
            borderColor: '#fde68a',
            badgeText: '战败不扣分',
            validityDays: 30, // 领取后 1 个月内
            activeLimitHours: 720, // 使用后若有时限（最长 30 天或单次消耗）
            shortDesc: '下一次排位赛输了不扣分',
            detailDesc: '排位赛专属保分道具。使用后进入生效状态，下一次排位赛（无论人机还是联机排位）若不幸战败，自动免除本次对局的所有等级分扣除惩罚。战败触发一次后自动消耗。',
            priority: 1,
            rules: [
                '【有效期】自领取之时起 1 个月（30天）内有效，过期失效且无法使用。',
                '【生效规则】点击使用后进入“生效中”状态；在下一次排位赛战败时自动抵扣扣分惩罚。',
                '【单次消耗】生效后战败保护一次即消耗移除。',
                '【禁止叠加】相同道具不能叠加使用，当前有排位保护卡生效时无法再次使用。',
                '【优先级】使用优先级：排位保护卡 ＞ 段位保护卡。若同时处于生效状态，优先触发排位保护卡免除扣分。'
            ]
        },
        tier_protect: {
            type: 'tier_protect',
            name: '段位保护卡',
            icon: 'security',
            color: '#2563eb',
            bgColor: '#dbeafe',
            borderColor: '#bfdbfe',
            badgeText: '免受一次掉段',
            validityDays: 30, // 领取后 1 个月内
            activeLimitHours: 720,
            shortDesc: '免受一次掉段',
            detailDesc: '段位阶梯守护道具。使用后进入生效状态，当排位赛战败扣分将导致段位降低（如2段跌回1段）时，自动触发段位保护，将积分保存在当前段位最低分（如2段1分），免受降段惩罚。若战败未导致降段，则继续保留生效中状态。',
            priority: 2,
            rules: [
                '【有效期】自领取之时起有效，临期（<24h）会标注提醒，过期失效且无法使用。',
                '【生效规则】点击使用后进入“生效中”状态；仅在战败扣分会导致掉段时触发保护。',
                '【保留生效】若战败扣分但未降段，则不触发消耗，继续保留生效中状态。',
                '【禁止叠加】相同道具不能叠加使用。',
                '【优先级】使用优先级：排位保护卡 ＞ 段位保护卡。若排位保护卡已免除扣分，则段位保护卡不消耗。'
            ]
        },
        rank_double: {
            type: 'rank_double',
            name: '排位翻倍卡',
            icon: 'trending_up',
            color: '#7e22ce',
            bgColor: '#f3e8ff',
            borderColor: '#e9d5ff',
            badgeText: '一次性',
            validityDays: 30,
            activeLimitHours: 720,
            shortDesc: '下一次排位赛获取的等级分翻倍',
            detailDesc: '排位赛冲分专属道具。使用后进入生效状态，下一次排位赛（无论人机还是联机排位）若取得胜利，获得的等级分自动翻倍！战胜触发一次后自动消耗。战败不触发且不消耗。',
            priority: 3,
            rules: [
                '【有效期】自领取之时起有效（不同活动奖励时限可能不同），临期（<24h）会标注提醒，过期失效且无法使用。',
                '【生效规则】点击使用后进入“生效中”状态；在下一次排位赛胜利时，获得的等级分翻倍。',
                '【单次消耗】生效后在取得排位赛胜利并翻倍积分后自动消耗移除；战败不消耗。',
                '【禁止叠加】相同道具不能叠加使用，当前有排位翻倍卡生效时无法再次使用。'
            ]
        }
    };

    const ItemManager = {
        DEFINITIONS: ITEM_DEFINITIONS,
        _itemsCache: [],
        _activeTab: 'items', // 'items' | 'handbook'
        _itemsCacheUser: '',

        // 检查用户是否具有使用道具资格（已登录云端账号或B站授权且非离线模式）
        isAvailable() {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return false;
            const profile = (typeof currentUserProfile !== 'undefined' && currentUserProfile)
                ? currentUserProfile
                : (window.currentUserProfile || null);
            if (profile && profile.isLoggedIn && (profile.type === 'cloud' || profile.type === 'bilibili')) return true;
            if (typeof currentUser !== 'undefined' && currentUser && !currentUser.startsWith('游客')) return true;
            return false;
        },

        getCurrentUsername() {
            const profile = (typeof currentUserProfile !== 'undefined' && currentUserProfile)
                ? currentUserProfile
                : (window.currentUserProfile || null);
            if (profile && profile.username && !profile.username.startsWith('游客')) {
                return profile.username;
            }
            if (typeof currentUser !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
                return currentUser;
            }
            return '';
        },

        // 从云端 Supabase 获取当前用户拥有的所有道具
        async fetchUserItems(silent = false) {
            const username = this.getCurrentUsername();
            if (!username || !this.isAvailable()) {
                this._itemsCache = [];
                this._itemsCacheUser = username || '';
                this.updateBadge();
                return [];
            }

            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    const { data, error } = await sbClient
                        .from('user_items')
                        .select('*')
                        .eq('username', username)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.warn('[ItemManager] fetchUserItems error:', error);
                    } else if (Array.isArray(data)) {
                        this._itemsCache = this._processItemsExpiry(data);
                        this._itemsCacheUser = username;
                        this._saveLocalCache(username, this._itemsCache);
                        this.updateBadge();
                        this.renderItemsView();
                        return this._itemsCache;
                    }
                }
            } catch (e) {
                console.warn('[ItemManager] fetchUserItems exception:', e);
            }

            // 失败时从本地安全缓存读取兜底
            this._itemsCache = this._loadLocalCache(username);
            this._itemsCache = this._processItemsExpiry(this._itemsCache);
            this._itemsCacheUser = username;
            this.updateBadge();
            this.renderItemsView();
            return this._itemsCache;
        },

        // 检查并修正道具过期状态
        _processItemsExpiry(items) {
            if (!Array.isArray(items)) return [];
            const now = Date.now();
            return items.map(item => {
                const itemCopy = { ...item };
                // 1. 检查道具自身有效期 (expire_at)
                if (itemCopy.expire_at) {
                    const expireTime = new Date(itemCopy.expire_at).getTime();
                    if (!isNaN(expireTime) && expireTime <= now) {
                        if (itemCopy.status !== 'used') {
                            itemCopy.status = 'expired';
                        }
                    }
                }
                // 2. 检查使用后的时限 (active_until)
                if (itemCopy.status === 'active' && itemCopy.active_until) {
                    const activeUntilTime = new Date(itemCopy.active_until).getTime();
                    if (!isNaN(activeUntilTime) && activeUntilTime <= now) {
                        itemCopy.status = 'expired';
                    }
                }
                return itemCopy;
            });
        },

        _loadLocalCache(username) {
            try {
                const raw = localStorage.getItem(`vocab_user_items_${username}`);
                if (raw) return JSON.parse(raw);
            } catch (e) { }
            return [];
        },

        _saveLocalCache(username, items) {
            try {
                localStorage.setItem(`vocab_user_items_${username}`, JSON.stringify(items));
            } catch (e) { }
        },

        // 获取用户当前的道具列表（过滤已移除或根据状态）
        getUserItems(username) {
            const u = username || this.getCurrentUsername();
            if (!u) return [];
            if (this._itemsCache && this._itemsCache.length > 0 && this._itemsCacheUser === u) {
                return this._itemsCache;
            }
            const local = this._loadLocalCache(u);
            this._itemsCache = this._processItemsExpiry(local);
            this._itemsCacheUser = u;
            return this._itemsCache;
        },

        // 检查某类型道具是否正在生效中
        hasActiveCard(itemType, username) {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return false;
            if (!this.isAvailable()) return false;
            const items = this.getUserItems(username);
            const now = Date.now();
            return items.some(item => {
                if (item.item_type !== itemType) return false;
                if (item.status !== 'active') return false;
                // 必须在有效期和时限内
                if (item.expire_at && new Date(item.expire_at).getTime() <= now) return false;
                if (item.active_until && new Date(item.active_until).getTime() <= now) return false;
                return true;
            });
        },

        // 使用道具
        async useItem(itemId) {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) {
                if (typeof showToast === 'function') showToast('离线模式下已禁用道具功能');
                return false;
            }
            if (!this.isAvailable()) {
                if (typeof showToast === 'function') showToast('当前状态无法使用道具，请登录云端账号');
                return false;
            }

            const username = this.getCurrentUsername();
            if (!username) {
                if (typeof showToast === 'function') showToast('请先登录云端账号');
                return false;
            }

            const items = this.getUserItems(username);
            const item = items.find(it => String(it.id) === String(itemId));
            if (!item) {
                if (typeof showToast === 'function') showToast('未找到该道具');
                return false;
            }

            const def = ITEM_DEFINITIONS[item.item_type] || {};
            const now = Date.now();

            // 1. 检查是否已过期
            if (item.status === 'expired' || (item.expire_at && new Date(item.expire_at).getTime() <= now)) {
                item.status = 'expired';
                this._saveLocalCache(username, items);
                this.renderItemsView();
                if (typeof showToast === 'function') showToast('该道具已过有效期，无法使用！');
                return false;
            }

            // 2. 检查是否已在生效中
            if (item.status === 'active') {
                if (typeof showToast === 'function') showToast(`该【${item.item_name || '道具'}】已处于生效中！`);
                return false;
            }

            // 3. 检查不可叠加规则：同类道具不可叠加使用
            const alreadyActive = items.some(it => 
                String(it.id) !== String(itemId) &&
                it.item_type === item.item_type &&
                it.status === 'active' &&
                (!it.expire_at || new Date(it.expire_at).getTime() > now) &&
                (!it.active_until || new Date(it.active_until).getTime() > now)
            );

            if (alreadyActive) {
                if (typeof showToast === 'function') {
                    showToast(`相同道具不可叠加使用！`);
                }
                return false;
            }

            // 4. 设置生效状态及使用时限
            const nowIso = new Date().toISOString();
            const activeHours = def.activeLimitHours || 720;
            const activeUntilIso = new Date(now + activeHours * 3600 * 1000).toISOString();

            item.status = 'active';
            item.used_at = nowIso;
            item.active_until = activeUntilIso;

            this._saveLocalCache(username, items);
            this.renderItemsView();
            if (typeof showToast === 'function') {
                showToast(`“${item.item_name}”已生效！`);
            }

            // 同步云端 Supabase
            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    await sbClient
                        .from('user_items')
                        .update({
                            status: 'active',
                            used_at: nowIso,
                            active_until: activeUntilIso
                        })
                        .eq('id', item.id);
                }
            } catch (e) {
                console.warn('[ItemManager] useItem cloud sync warning:', e);
            }

            this.updateBadge();
            return true;
        },

        // 在排位赛结算中消耗生效中的保护卡
        async consumeProtectionCard(itemType, username) {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return false;
            const u = username || this.getCurrentUsername();
            if (!u) return false;

            const items = this.getUserItems(u);
            const activeCard = items.find(it => it.item_type === itemType && it.status === 'active');
            if (!activeCard) return false;

            const nowIso = new Date().toISOString();
            activeCard.status = 'used';
            activeCard.consumed_at = nowIso;

            this._saveLocalCache(u, items);
            this.updateBadge();

            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    await sbClient
                        .from('user_items')
                        .update({
                            status: 'used'
                        })
                        .eq('id', activeCard.id);
                }
            } catch (e) {
                console.warn('[ItemManager] consumeProtectionCard cloud error:', e);
            }

            return true;
        },

        // 给指定用户发放道具（支持 Supabase 后台写入，也可由前端发放/完成活动发放）
        async grantItem(username, itemType, durationDays = 30) {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) {
                console.warn('[ItemManager] 离线模式下禁止发放道具');
                return null;
            }
            const u = username || this.getCurrentUsername();
            if (!u) return null;

            const def = ITEM_DEFINITIONS[itemType];
            if (!def) throw new Error(`未知的道具类型: ${itemType}`);

            const now = new Date();
            const expireAt = new Date(now.getTime() + durationDays * 24 * 3600 * 1000).toISOString();

            const newItem = {
                username: u,
                item_type: itemType,
                item_name: def.name,
                status: 'unused',
                obtained_at: now.toISOString(),
                expire_at: expireAt,
                created_at: now.toISOString()
            };

            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    const { data, error } = await sbClient
                        .from('user_items')
                        .insert([newItem])
                        .select()
                        .single();

                    if (!error && data) {
                        this._itemsCache.unshift(data);
                        this._itemsCacheUser = u;
                        this._saveLocalCache(u, this._itemsCache);
                        this.updateBadge();
                        this.renderItemsView();
                        return data;
                    }
                }
            } catch (e) {
                console.warn('[ItemManager] grantItem error:', e);
            }

            // 本地 fallback
            newItem.id = 'local_' + Date.now();
            this._itemsCache.unshift(newItem);
            this._itemsCacheUser = u;
            this._saveLocalCache(u, this._itemsCache);
            this.updateBadge();
            this.renderItemsView();
            return newItem;
        },

        // 空实现，兼容旧模块调用
        recordTaskProgress(taskId, count = 1) {},

        // 更新账号管理中的我的道具入口徽标
        updateBadge() {
            const badgeEl = document.getElementById('me-items-badge');
            if (!badgeEl) return;

            if (!this.isAvailable()) {
                badgeEl.style.display = 'none';
                return;
            }

            const u = this.getCurrentUsername();
            const items = this.getUserItems(u);
            const activeCount = items.filter(it => it.status === 'active').length;
            const unusedCount = items.filter(it => it.status === 'unused' && (!it.expire_at || new Date(it.expire_at).getTime() > Date.now())).length;

            if (activeCount > 0) {
                badgeEl.style.display = 'inline-flex';
                badgeEl.style.background = '#dcfce7';
                badgeEl.style.color = '#15803d';
                badgeEl.innerText = `${activeCount}个生效中`;
            } else if (unusedCount > 0) {
                badgeEl.style.display = 'inline-flex';
                badgeEl.style.background = 'var(--md-sys-color-primary-container)';
                badgeEl.style.color = 'var(--md-sys-color-primary)';
                badgeEl.innerText = `${unusedCount}个可用`;
            } else {
                badgeEl.style.display = 'none';
            }
        },

        // =========================================================================
        // 渲染“我的道具”全页面与各个选项卡
        // =========================================================================
        renderItemsView(targetTab = null) {
            if (targetTab) this._activeTab = targetTab;
            const container = document.getElementById('settings-subview-items-content');
            if (!container) return;

            const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
            if (isOffline) {
                container.innerHTML = `
                    <div style="text-align:center; padding:60px 20px;">
                        <div style="width:64px; height:64px; border-radius:50%; background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline); display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                            <span class="material-symbols-rounded" style="font-size:36px;">cloud_off</span>
                        </div>
                        <h3 style="margin:0 0 8px; font-weight:700;">离线模式已禁用道具功能</h3>
                        <p style="color:var(--md-sys-color-outline); font-size:0.9rem; max-width:340px; margin:0 auto 20px; line-height:1.5;">
                            当前处于离线模式，道具功能仅支持在联网状态及云端排位赛中使用。请在设置中退出离线模式后重试。
                        </p>
                    </div>
                `;
                return;
            }

            const u = this.getCurrentUsername();
            const isAvail = this.isAvailable();

            if (!isAvail) {
                container.innerHTML = `
                    <div style="text-align:center; padding:60px 20px;">
                        <span class="material-symbols-rounded" style="font-size:64px; color:var(--md-sys-color-outline);">lock</span>
                        <h3 style="margin:16px 0 8px; font-weight:700;">道具系统未解锁</h3>
                        <p style="color:var(--md-sys-color-outline); font-size:0.9rem; max-width:320px; margin:0 auto 20px;">
                            道具为云端排位赛专属特权，请登录词迹云端账号后解锁道具背包与活动任务！
                        </p>
                        <button type="button" class="btn btn-filled" onclick="switchView('view-auth')" style="border-radius:999px; padding:0 24px;">
                            <span class="material-symbols-rounded" style="font-size:18px;">login</span>
                            <span>去登录云端账号</span>
                        </button>
                    </div>
                `;
                return;
            }

            const items = this.getUserItems(u);
            const activeCount = items.filter(it => it.status === 'active').length;
            const unusedCount = items.filter(it => it.status === 'unused' && (!it.expire_at || new Date(it.expire_at).getTime() > Date.now())).length;

            // Tab 头部切换条（精简为我的道具与道具图鉴，右侧放置刷新按钮）
            const tabsHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
                    <div class="settings-category-tabs" style="display:flex; gap:8px; margin:0;">
                        <button type="button" class="settings-cat-tab ${this._activeTab === 'items' ? 'active' : ''}" onclick="ItemManager.switchTab('items')" style="display:flex; align-items:center; gap:6px;">
                            <span class="material-symbols-rounded" style="font-size:18px;">backpack</span>
                            <span>我的道具</span>
                        </button>
                        <button type="button" class="settings-cat-tab ${this._activeTab === 'handbook' ? 'active' : ''}" onclick="ItemManager.switchTab('handbook')" style="display:flex; align-items:center; gap:6px;">
                            <span class="material-symbols-rounded" style="font-size:18px;">auto_stories</span>
                            <span>道具图鉴</span>
                        </button>
                    </div>
                    <button type="button" class="btn btn-text btn-sm" onclick="ItemManager.fetchUserItems()" title="刷新道具" style="display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 10px; border-radius:var(--md-shape-full);">
                        <span class="material-symbols-rounded" style="font-size:17px;">refresh</span>
                        <span>刷新</span>
                    </button>
                </div>
            `;

            let bodyHtml = '';
            if (this._activeTab === 'items') {
                bodyHtml = this._renderMyItemsList(items);
            } else {
                bodyHtml = this._renderHandbook();
            }

            container.innerHTML = tabsHtml + bodyHtml;
        },

        switchTab(tab) {
            this._activeTab = tab;
            this.renderItemsView();
        },

        // 渲染“我的道具”列表
        _renderMyItemsList(items) {
            const now = Date.now();
            const validItems = items.filter(it => it.status !== 'used');

            if (!validItems || validItems.length === 0) {
                return `
                    <div class="card" style="text-align:center; padding:50px 20px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface-container-low);">
                        <div style="width:64px; height:64px; border-radius:50%; background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-outline); display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
                            <span class="material-symbols-rounded" style="font-size:32px;">inventory_2</span>
                        </div>
                        <h4 style="margin:0 0 6px; font-weight:700;">背包空空如也</h4>
                        <p style="color:var(--md-sys-color-outline); font-size:0.85rem; margin:0 auto 16px; max-width:320px;">
                            参与活动可以获取道具哟~
                        </p>
                        <div style="display:flex; justify-content:center; gap:10px;">
                            <button type="button" class="btn btn-filled btn-sm" onclick="if(typeof openActivityView==='function')openActivityView();else if(typeof openActivityModal==='function')openActivityModal();else if(window.ActivityManager&&ActivityManager.openActivityModal)ActivityManager.openActivityModal();">
                                <span class="material-symbols-rounded" style="font-size:16px;">celebration</span>
                                <span>前往活动中心</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            const cardsHtml = validItems.map(item => {
                const def = ITEM_DEFINITIONS[item.item_type] || {
                    name: item.item_name || '道具',
                    icon: 'shield',
                    color: '#0284c7',
                    bgColor: '#e0f2fe',
                    shortDesc: '排位辅助道具'
                };

                const isExpired = (item.status === 'expired') || (item.expire_at && new Date(item.expire_at).getTime() <= now);
                const isActive = (item.status === 'active') && !isExpired;

                const expireMs = item.expire_at ? new Date(item.expire_at).getTime() : null;
                const isExpiringSoon = !isExpired && expireMs && (expireMs - now > 0) && (expireMs - now < 24 * 3600 * 1000);
                let remainingHoursText = '';
                if (isExpiringSoon) {
                    const hoursLeft = Math.max(1, Math.ceil((expireMs - now) / 3600000));
                    remainingHoursText = `仅剩 ${hoursLeft} 小时`;
                }

                let expireDateStr = '永久有效';
                let expireTimeStr = '';
                if (item.expire_at) {
                    const exp = new Date(item.expire_at);
                    if (!isNaN(exp.getTime())) {
                        const month = String(exp.getMonth() + 1).padStart(2, '0');
                        const day = String(exp.getDate()).padStart(2, '0');
                        const hours = String(exp.getHours()).padStart(2, '0');
                        const minutes = String(exp.getMinutes()).padStart(2, '0');
                        expireDateStr = `${exp.getFullYear()}-${month}-${day}`;
                        expireTimeStr = `${hours}:${minutes}`;
                    }
                }

                let statusBadge = '';
                let actionBtn = '';

                if (isActive) {
                    statusBadge = `
                        <span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700; display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px;">
                            <span class="material-symbols-rounded" style="font-size:14px;">check_circle</span>
                            <span>生效中</span>
                        </span>
                    `;
                    actionBtn = `
                        <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.85; cursor:default; background:#dcfce7; color:#15803d; font-weight:700; height:32px; min-height:32px; padding:0 12px; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px;">
                            <span class="material-symbols-rounded" style="font-size:16px;">offline_bolt</span>
                            <span>生效中</span>
                        </button>
                    `;
                } else if (isExpired) {
                    statusBadge = `
                        <span class="badge" style="background:#f1f5f9; color:#94a3b8; font-weight:600; padding:3px 10px; border-radius:99px;">已过期</span>
                    `;
                    actionBtn = `
                        <button type="button" class="btn btn-outlined btn-sm" disabled style="opacity:0.5; height:32px; min-height:32px; padding:0 12px; font-size:0.8rem;">
                            <span>已过期</span>
                        </button>
                    `;
                } else {
                    statusBadge = `
                        <span class="badge" style="background:var(--md-sys-color-surface-container-high); color:var(--md-sys-color-on-surface); font-weight:600; padding:3px 10px; border-radius:99px;">未使用</span>
                    `;
                    actionBtn = `
                        <button type="button" class="btn btn-filled btn-sm" onclick="ItemManager.useItem('${item.id}')" style="box-shadow: 0 2px 8px rgba(0,97,164,0.2); height:32px; min-height:32px; padding:0 14px; font-size:0.82rem; display:inline-flex; align-items:center; gap:4px;">
                            <span class="material-symbols-rounded" style="font-size:16px;">play_arrow</span>
                            <span>使用</span>
                        </button>
                    `;
                }

                return `
                    <div class="card" style="padding:16px 18px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid var(--md-sys-color-outline-variant); display:flex; flex-direction:column; justify-content:space-between; gap:12px; position:relative; overflow:hidden;">
                        ${isActive ? '<div style="position:absolute; top:0; left:0; right:0; height:3px; background:#16a34a;"></div>' : ''}
                        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:48px; height:48px; border-radius:14px; background:${def.bgColor || '#f1f5f9'}; color:${def.color || '#0284c7'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <span class="material-symbols-rounded" style="font-size:26px;">${def.icon || 'shield'}</span>
                                </div>
                                <div>
                                    <h4 style="margin:0; font-size:1.05rem; font-weight:700;">${item.item_name || def.name}</h4>
                                    <p style="margin:4px 0 0; font-size:0.84rem; color:var(--md-sys-color-on-surface-variant); line-height:1.4;">${def.shortDesc || ''}</p>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--md-sys-color-outline-variant); display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
                                <div style="display:flex; align-items:center; gap:5px; font-size:0.76rem; color:${isExpiringSoon ? '#dc2626' : 'var(--md-sys-color-outline)'}; line-height:1.3;">
                                    <span class="material-symbols-rounded" style="font-size:15px; flex-shrink:0; ${isExpiringSoon ? 'color:#dc2626;' : ''}">schedule</span>
                                    <span style="font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">有效期至：${expireDateStr}</span>
                                </div>
                                <div style="padding-left:20px; font-size:0.76rem; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${isExpiringSoon ? `
                                        <span style="font-weight:700; color:#dc2626;">${expireTimeStr}到期 (${remainingHoursText})</span>
                                    ` : (expireTimeStr ? `
                                        <span style="color:var(--md-sys-color-outline);">${expireTimeStr}到期</span>
                                    ` : `
                                        <span style="color:var(--md-sys-color-outline);">长期有效</span>
                                    `)}
                                </div>
                            </div>
                            <div style="flex-shrink:0;">${actionBtn}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
                    ${cardsHtml}
                </div>
            `;
        },

        // 渲染“道具图鉴” (精简清晰版)
        _renderHandbook() {
            return `
                <div style="margin-bottom:14px; padding:10px 14px; background:var(--md-sys-color-surface-container-low); border-radius:var(--md-shape-m); font-size:0.83rem; color:var(--md-sys-color-outline); display:flex; align-items:center; gap:8px;">
                    <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-primary);">info</span>
                    <span>道具使用后自动生效，同类道具不可叠加。</span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
                    <!-- 排位保护卡 -->
                    <div class="card" style="padding:16px 18px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid var(--md-sys-color-outline-variant); display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:44px; height:44px; border-radius:12px; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <span class="material-symbols-rounded" style="font-size:24px;">shield</span>
                                </div>
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <h4 style="margin:0; font-size:1.02rem; font-weight:700;">排位保护卡</h4>
                                    </div>
                                    <div style="font-size:0.78rem; color:#d97706; font-weight:700; margin-top:3px;">一次性</div>
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--md-sys-color-surface-container-low); padding:10px 12px; border-radius:var(--md-shape-s); font-size:0.83rem; line-height:1.5; color:var(--md-sys-color-on-surface-variant);">
                            使用后，下一次排位赛战败免受扣分惩罚。一次性使用。
                        </div>
                    </div>

                    <!-- 段位保护卡 -->
                    <div class="card" style="padding:16px 18px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid var(--md-sys-color-outline-variant); display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:44px; height:44px; border-radius:12px; background:#dbeafe; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <span class="material-symbols-rounded" style="font-size:24px;">security</span>
                                </div>
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <h4 style="margin:0; font-size:1.02rem; font-weight:700;">段位保护卡</h4>
                                    </div>
                                    <div style="font-size:0.78rem; color:#2563eb; font-weight:700; margin-top:3px;">一次性</div>
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--md-sys-color-surface-container-low); padding:10px 12px; border-radius:var(--md-shape-s); font-size:0.83rem; line-height:1.5; color:var(--md-sys-color-on-surface-variant);">
                            使用后，当扣分会导致掉段时，积分将保存在当前段位最低分，免受掉段惩罚。一次性使用。
                        </div>
                    </div>

                    <!-- 排位翻倍卡 -->
                    <div class="card" style="padding:16px 18px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid var(--md-sys-color-outline-variant); display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:44px; height:44px; border-radius:12px; background:#f3e8ff; color:#7e22ce; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <span class="material-symbols-rounded" style="font-size:24px;">trending_up</span>
                                </div>
                                <div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <h4 style="margin:0; font-size:1.02rem; font-weight:700;">排位翻倍卡</h4>
                                    </div>
                                    <div style="font-size:0.78rem; color:#7e22ce; font-weight:700; margin-top:3px;">一次性</div>
                                </div>
                            </div>
                        </div>

                        <div style="background:var(--md-sys-color-surface-container-low); padding:10px 12px; border-radius:var(--md-shape-s); font-size:0.83rem; line-height:1.5; color:var(--md-sys-color-on-surface-variant);">
                            使用后，下一次排位赛获取的等级分翻倍。一次性使用，战败不消耗。
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.ItemManager = ItemManager;

    // 全局快捷打开道具页面函数
    window.openMyItemsPage = function () {
        if (typeof isOfflineMode === 'function' && isOfflineMode()) {
            if (typeof showToast === 'function') {
                showToast('离线模式下已禁用道具功能');
            }
            return;
        }
        if (!ItemManager.isAvailable()) {
            if (typeof showToast === 'function') {
                showToast('未登录状态无法使用道具，请登录云端账号或B站授权');
            }
            return;
        }
        if (typeof openMeSubview === 'function') {
            openMeSubview('items');
        }
        ItemManager.renderItemsView();
        ItemManager.fetchUserItems();
    };

})(window);
