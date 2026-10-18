/**
 * 邮件系统管理器 (MailManager)
 * Module: assets/js/managers/mail-manager.js
 * 
 * 核心功能：
 * 1. 首页右上角“邮箱”入口徽标与未读邮件数管理（离线模式不显示）
 * 2. 云端 Supabase 邮件数据同步与多目标筛选 (全体用户 / B站用户 / Supabase云端账号 / 指定用户)
 * 3. 邮件详情查看、自动标记已读
 * 4. 邮件附件道具领取并自动存入“我的道具” (支持排位保护卡、段位保护卡等)
 */

(function (window) {
    'use strict';

    function formatMailContent(rawContent) {
        if (!rawContent) return '';
        const escaped = String(rawContent)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        return escaped.replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--md-sys-color-primary); text-decoration:underline; font-weight:600; word-break:break-all;">$1</a>'
        );
    }

    const MailManager = {
        _mails: [],
        _mailStatusMap: {}, // mailId -> { is_read, is_claimed, is_deleted, read_at, claimed_at, deleted_at }
        _deletedMailIds: new Set(),
        _claimedMailIds: new Set(), // 严格持久化已领取的邮件ID，杜绝重复领取与按钮反复跳变
        _claimingIds: new Set(),    // 正在领取的事务锁
        _currentUsername: null,
        _isFetching: false,

        // 检查环境是否允许邮件系统（离线模式不显示）
        isAvailable() {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return false;
            return true;
        },

        getCurrentUser() {
            const profile = (typeof currentUserProfile !== 'undefined' && currentUserProfile)
                ? currentUserProfile
                : (window.currentUserProfile || null);

            let username = '';
            let type = 'guest';
            let isLoggedIn = false;

            if (profile && profile.isLoggedIn) {
                isLoggedIn = true;
                username = profile.username || '';
                type = profile.type || 'guest';
            } else if (typeof currentUser !== 'undefined' && currentUser && !currentUser.startsWith('游客')) {
                username = currentUser;
                type = 'cloud';
                isLoggedIn = true;
            }

            return { username, type, isLoggedIn };
        },

        // 初始化
        async init() {
            const user = this.getCurrentUser();
            if (user.isLoggedIn && user.username) {
                this.loadLocalCache(user.username);
            } else {
                this._mails = [];
                this._mailStatusMap = {};
                this._deletedMailIds = new Set();
                this._claimedMailIds = new Set();
                this._claimingIds = new Set();
                this._currentUsername = '';
            }
            this.updateBadge();
            if (this.isAvailable() && user.isLoggedIn && user.username) {
                await this.fetchMails(true);
            }
        },

        // 账号切换或登出时彻底重置当前用户的邮件内存状态
        resetForUser(username) {
            const u = (username && !String(username).startsWith('游客')) ? String(username).trim() : '';
            this._currentUsername = u;
            this._mails = [];
            this._mailStatusMap = {};
            this._deletedMailIds = new Set();
            this._claimedMailIds = new Set();
            this._claimingIds = new Set();
            if (u) {
                this.loadLocalCache(u);
            } else {
                this.updateBadge();
            }
        },

        loadLocalCache(targetUser) {
            const user = this.getCurrentUser();
            const u = targetUser || (user.isLoggedIn && user.username ? user.username : '');
            this._currentUsername = u;
            this._deletedMailIds = new Set();
            this._claimedMailIds = new Set();
            this._claimingIds = new Set();
            this._mailStatusMap = {};
            this._mails = [];

            if (!u || u.startsWith('游客')) {
                this.updateBadge();
                return;
            }

            try {
                const rawDel = localStorage.getItem(`vocab_deleted_mails_${u}`);
                if (rawDel) {
                    const parsedDel = JSON.parse(rawDel);
                    if (Array.isArray(parsedDel)) {
                        parsedDel.forEach(id => {
                            if (id && String(id) !== 'sys_welcome_new_user') {
                                this._deletedMailIds.add(String(id));
                            }
                        });
                    }
                }
            } catch (e) {
                this._deletedMailIds = new Set();
            }

            try {
                const rawClaimed = localStorage.getItem(`vocab_claimed_mails_${u}`);
                if (rawClaimed) {
                    const parsedClaimed = JSON.parse(rawClaimed);
                    if (Array.isArray(parsedClaimed)) {
                        parsedClaimed.forEach(id => {
                            if (id && String(id) !== 'sys_welcome_new_user') {
                                this._claimedMailIds.add(String(id));
                            }
                        });
                    }
                }
            } catch (e) {
                this._claimedMailIds = new Set();
            }

            try {
                const rawStatus = localStorage.getItem(`vocab_mail_status_${u}`);
                if (rawStatus) {
                    const parsedStatus = JSON.parse(rawStatus);
                    if (parsedStatus && typeof parsedStatus === 'object') {
                        delete parsedStatus['sys_welcome_new_user'];
                        this._mailStatusMap = parsedStatus;
                        Object.keys(parsedStatus).forEach(mId => {
                            if (parsedStatus[mId] && parsedStatus[mId].is_claimed) {
                                this._claimedMailIds.add(String(mId));
                            }
                        });
                    }
                }
            } catch (e) {
                this._mailStatusMap = {};
            }

            try {
                const rawMails = localStorage.getItem(`vocab_mails_${u}`);
                if (rawMails) {
                    const parsed = JSON.parse(rawMails);
                    if (Array.isArray(parsed)) {
                        this._mails = parsed.filter(m => 
                            m && 
                            String(m.id) !== 'sys_welcome_new_user' && 
                            !this._deletedMailIds.has(String(m.id))
                        );
                    }
                }
            } catch (e) {
                this._mails = [];
            }
        },

        saveLocalCache() {
            const user = this.getCurrentUser();
            const u = (user.isLoggedIn && user.username) ? user.username : '';
            if (!u || u.startsWith('游客')) return;
            try {
                localStorage.setItem(`vocab_mails_${u}`, JSON.stringify(this._mails || []));
                localStorage.setItem(`vocab_mail_status_${u}`, JSON.stringify(this._mailStatusMap || {}));
                localStorage.setItem(`vocab_deleted_mails_${u}`, JSON.stringify(Array.from(this._deletedMailIds || [])));
                localStorage.setItem(`vocab_claimed_mails_${u}`, JSON.stringify(Array.from(this._claimedMailIds || [])));
            } catch (e) { }
        },

        // 从 Supabase 获取系统邮件
        async fetchMails(silent = false) {
            if (!this.isAvailable()) {
                this._mails = [];
                this._mailStatusMap = {};
                this._deletedMailIds = new Set();
                this._currentUsername = '';
                this.updateBadge();
                return [];
            }

            const user = this.getCurrentUser();
            if (!user.isLoggedIn || !user.username || user.username.startsWith('游客')) {
                // 未登录状态：不拉取专属邮件，清空邮件数据与未读徽标
                this._mails = [];
                this._mailStatusMap = {};
                this._deletedMailIds = new Set();
                this._currentUsername = '';
                this.updateBadge();
                return [];
            }

            // 若当前用户与内存中记录的用户不一致，彻底重置为新用户
            if (this._currentUsername !== user.username) {
                this.resetForUser(user.username);
            }

            if (this._isFetching) return this._mails;
            this._isFetching = true;

            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    // 1. 获取所有有效的系统邮件
                    const { data: mailsData, error: mailsError } = await sbClient
                        .from('system_mails')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (mailsError) {
                        console.warn('[MailManager] fetch system_mails error:', mailsError);
                    } else if (Array.isArray(mailsData)) {
                        const now = Date.now();

                        // 2. 根据目标群体过滤用户可见的邮件
                        const filteredMails = mailsData.filter(mail => {
                            if (!mail) return false;
                            // 检查邮件有效期
                            if (mail.expires_at) {
                                const exp = new Date(mail.expires_at).getTime();
                                if (!isNaN(exp) && exp < now) return false;
                            }

                            const target = (mail.target_type || 'all').toLowerCase();

                            // 全体用户
                            if (target === 'all') return true;

                            // B站授权用户
                            if (target === 'bilibili') {
                                return user.type === 'bilibili';
                            }

                            // Supabase云端账号用户
                            if (target === 'cloud') {
                                return user.type === 'cloud';
                            }

                            // 指定特定用户名单 (JSON 数组、逗号分隔字符串或单一用户名)
                            if (target === 'users') {
                                if (!mail.target_users) return false;
                                if (Array.isArray(mail.target_users)) {
                                    return mail.target_users.includes(user.username);
                                }
                                if (typeof mail.target_users === 'string') {
                                    try {
                                        const parsed = JSON.parse(mail.target_users);
                                        if (Array.isArray(parsed)) {
                                            return parsed.includes(user.username);
                                        }
                                    } catch (e) { }
                                    // 逗号分隔判断
                                    const userList = mail.target_users.split(',').map(s => s.trim());
                                    return userList.includes(user.username);
                                }
                                return false;
                            }

                            return false;
                        });

                        // 3. 获取当前用户已有的阅读/领取/删除状态（云端数据库为当前账号唯一真实来源，避免不同账号状态串扰）
                        const { data: statusData, error: statusError } = await sbClient
                            .from('user_mail_status')
                            .select('*')
                            .eq('username', user.username);

                        if (!statusError && Array.isArray(statusData)) {
                            const cloudStatusMap = {};
                            const cloudDeletedIds = new Set();
                            statusData.forEach(st => {
                                if (st && st.mail_id != null) {
                                    const idStr = String(st.mail_id);
                                    if (st.is_deleted) {
                                        cloudDeletedIds.add(idStr);
                                    }
                                    const isClaimed = Boolean(st.is_claimed) || this._claimedMailIds.has(idStr);
                                    if (isClaimed) {
                                        this._claimedMailIds.add(idStr);
                                    }
                                    cloudStatusMap[idStr] = {
                                        is_read: Boolean(st.is_read),
                                        is_claimed: isClaimed,
                                        is_deleted: Boolean(st.is_deleted),
                                        read_at: st.read_at || null,
                                        claimed_at: st.claimed_at || null,
                                        deleted_at: st.deleted_at || null
                                    };
                                }
                            });
                            // 确保本地已领取的ID绝对不会因为网络往返延迟被冲刷为未领取
                            this._claimedMailIds.forEach(idStr => {
                                if (!cloudStatusMap[idStr]) {
                                    cloudStatusMap[idStr] = {
                                        is_read: true,
                                        is_claimed: true,
                                        is_deleted: false,
                                        claimed_at: new Date().toISOString()
                                    };
                                } else {
                                    cloudStatusMap[idStr].is_claimed = true;
                                }
                            });
                            this._mailStatusMap = cloudStatusMap;
                            this._deletedMailIds = cloudDeletedIds;
                        }

                        // 4. 将状态合入邮件列表中，并排除已删除的邮件
                        this._mails = filteredMails
                            .filter(mail => !this._deletedMailIds.has(String(mail.id)))
                            .map(mail => {
                                const idStr = String(mail.id);
                                const st = this._mailStatusMap[idStr] || {};
                                const isClaimed = Boolean(st.is_claimed || this._claimedMailIds.has(idStr));
                                return {
                                    ...mail,
                                    is_read: Boolean(st.is_read),
                                    is_claimed: isClaimed,
                                    read_at: st.read_at || null,
                                    claimed_at: st.claimed_at || null
                                };
                            });

                        this.saveLocalCache();
                        this.updateBadge();
                        if (!silent) {
                            this.renderMailboxView();
                        }
                        this._isFetching = false;
                        return this._mails;
                    }
                }
            } catch (e) {
                console.warn('[MailManager] fetchMails exception:', e);
            }

            this._isFetching = false;
            this.updateBadge();
            return this._mails;
        },

        // 获取未读邮件数量
        getUnreadCount() {
            if (!this.isAvailable()) return 0;
            return this._mails.filter(m => !m.is_read).length;
        },

        // 获取待领取附件的邮件数量
        getUnclaimedCount() {
            if (!this.isAvailable()) return 0;
            return this._mails.filter(m => m.reward_item_type && !m.is_claimed).length;
        },

        // 更新未读徽标
        updateBadge() {
            const badge = document.getElementById('hub-mailbox-unread-badge');
            if (!badge) return;

            if (!this.isAvailable()) {
                badge.style.display = 'none';
                return;
            }

            const unreadCount = this.getUnreadCount();
            if (unreadCount > 0) {
                badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        },

        // 渲染邮箱页面列表
        renderMailboxView() {
            const listEl = document.getElementById('mailbox-list-container');
            if (!listEl) return;

            const user = this.getCurrentUser();
            if (!user.isLoggedIn) {
                listEl.innerHTML = `
                    <div style="text-align:center; padding:60px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:52px; opacity:0.35;">mark_email_unread</span>
                        <h4 style="margin:12px 0 6px; font-weight:700; color:var(--md-sys-color-on-surface);">请先登录账号</h4>
                        <p style="margin:0 0 16px; font-size:0.85rem;">登录账号后，即可接收邮件与奖励</p>
                        <button type="button" class="btn btn-filled btn-sm" onclick="switchView('view-auth')" style="margin:0 auto;">
                            <span class="material-symbols-rounded" style="font-size:16px;">login</span>
                            <span>前往登录</span>
                        </button>
                    </div>
                `;
                return;
            }

            if (!this._mails || this._mails.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align:center; padding:60px 16px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:52px; opacity:0.35;">mail</span>
                        <h4 style="margin:12px 0 4px; font-weight:700; color:var(--md-sys-color-on-surface);">暂无新邮件</h4>
                    </div>
                `;
                return;
            }

            const html = this._mails.map(mail => {
                const idStr = String(mail.id);
                const isRead = Boolean(mail.is_read);
                const hasReward = Boolean(mail.reward_item_type);
                const isClaimed = Boolean(mail.is_claimed || (this._claimedMailIds && this._claimedMailIds.has(idStr)));

                // 格式化时间
                let timeStr = '刚刚';
                if (mail.created_at) {
                    const d = new Date(mail.created_at);
                    if (!isNaN(d.getTime())) {
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        timeStr = `${d.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
                    }
                }

                const sender = mail.sender || '系统管理员';

                return `
                    <div class="card mail-item-card clickable" onclick="MailManager.openMailDetail('${mail.id}')" style="padding:16px 18px; border-radius:var(--md-shape-l); background:var(--md-sys-color-surface); border:1.5px solid var(--md-sys-color-outline-variant); display:flex; flex-direction:column; gap:10px; cursor:pointer; position:relative; overflow:hidden; transition:all 0.2s ease;">
                        ${!isRead ? '<span style="position:absolute; top:12px; right:12px; width:8px; height:8px; border-radius:50%; background:#ef4444;" title="未读邮件"></span>' : ''}
                        <div style="display:flex; align-items:flex-start; gap:12px;">
                            <div style="width:44px; height:44px; border-radius:12px; background:${!isRead ? '#fee2e2' : 'var(--md-sys-color-surface-container)'}; color:${!isRead ? '#dc2626' : 'var(--md-sys-color-primary)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                <span class="material-symbols-rounded" style="font-size:24px;">${!isRead ? 'mark_email_unread' : 'mail'}</span>
                            </div>
                            <div style="min-width:0; flex:1; display:flex; flex-direction:column; gap:4px;">
                                <!-- 第一行：标题在左，删除按钮在右（已读时显示） -->
                                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                                    <h3 style="margin:0; font-size:1.02rem; font-weight:${!isRead ? '800' : '700'}; color:var(--md-sys-color-on-surface); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">${mail.title || '系统通知'}</h3>
                                    ${isRead ? `
                                        <button type="button" class="mail-card-delete-btn" onclick="MailManager.deleteMail('${mail.id}', event)" title="删除邮件" style="flex-shrink:0;">
                                            <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                                        </button>
                                    ` : ''}
                                </div>
                                <!-- 第二行：发件人在左，时间紧随其后（无圆点、不加粗、基线对齐，放不下时优雅换行） -->
                                <div style="display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 12px; font-size:0.76rem; color:var(--md-sys-color-outline); line-height:1.4; margin-top:2px; width:100%; box-sizing:border-box;">
                                    <span style="font-weight:normal; color:var(--md-sys-color-outline); white-space:nowrap;">发件人：${sender}</span>
                                    <span style="font-weight:normal; color:var(--md-sys-color-outline); white-space:nowrap; font-variant-numeric:tabular-nums;">${timeStr}</span>
                                </div>
                            </div>
                        </div>

                        ${hasReward ? `
                            <div style="background:${isClaimed ? '#f1f5f9' : '#f0fdf4'}; border:1px solid ${isClaimed ? '#cbd5e1' : '#bbf7d0'}; border-radius:var(--md-shape-s); padding:5px 10px; display:inline-flex; align-items:center; gap:6px; font-size:0.78rem; color:${isClaimed ? '#64748b' : '#166534'}; font-weight:600; width:fit-content;">
                                <span class="material-symbols-rounded" style="font-size:16px; color:${isClaimed ? '#94a3b8' : '#16a34a'};">${isClaimed ? 'check_circle' : 'featured_seasonal_and_gifts'}</span>
                                <span>${isClaimed ? '' : '可领取：'}${mail.reward_item_name || ((typeof ItemManager !== 'undefined' && ItemManager.DEFINITIONS && ItemManager.DEFINITIONS[mail.reward_item_type]?.name) || '道具')} ×${mail.reward_item_count || 1}${isClaimed ? '（已领取）' : ''}</span>
                            </div>
                        ` : ''}

                        <div style="font-size:0.83rem; color:var(--md-sys-color-on-surface-variant); line-height:1.45; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                            ${(mail.content || '').replace(/<[^>]+>/g, '')}
                        </div>
                    </div>
                `;
            }).join('');

            listEl.innerHTML = html;
        },

        // 打开邮件详情弹窗
        async openMailDetail(mailId) {
            const idStr = String(mailId);
            const mail = this._mails.find(m => String(m.id) === idStr);
            if (!mail) return;

            // 自动标记为已读
            if (!mail.is_read) {
                mail.is_read = true;
                const nowIso = new Date().toISOString();
                mail.read_at = nowIso;

                if (!this._mailStatusMap[idStr]) {
                    this._mailStatusMap[idStr] = { is_read: true, is_claimed: false, read_at: nowIso };
                } else {
                    this._mailStatusMap[idStr].is_read = true;
                    this._mailStatusMap[idStr].read_at = nowIso;
                }

                this.saveLocalCache();
                this.updateBadge();

                // 异步同步已读状态至云端 Supabase
                this._syncStatusToCloud(idStr, { is_read: true, read_at: nowIso });
            }

            this.renderMailDetailContent(mail);

            const modal = document.getElementById('modal-mail-detail');
            if (modal) modal.classList.add('active');
        },

        closeMailDetail() {
            const modal = document.getElementById('modal-mail-detail');
            if (modal) modal.classList.remove('active');
            this.renderMailboxView();
        },

        // 渲染详情模态框内容
        renderMailDetailContent(mail) {
            const container = document.getElementById('mail-detail-content');
            if (!container) return;

            const sender = mail.sender || '系统管理员';
            let timeStr = '刚刚';
            if (mail.created_at) {
                const d = new Date(mail.created_at);
                if (!isNaN(d.getTime())) {
                    timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                }
            }

            const hasReward = Boolean(mail.reward_item_type);
            const isClaimed = Boolean(mail.is_claimed || (this._claimedMailIds && this._claimedMailIds.has(String(mail.id))));

            let rewardHtml = '';
            if (hasReward) {
                const itemName = mail.reward_item_name || ((typeof ItemManager !== 'undefined' && ItemManager.DEFINITIONS && ItemManager.DEFINITIONS[mail.reward_item_type]?.name) || (mail.reward_item_type === 'rank_protect' ? '排位保护卡' : (mail.reward_item_type === 'rank_double' ? '排位翻倍卡' : '段位保护卡')));
                const itemCount = mail.reward_item_count || 1;
                const days = mail.reward_days || 30;

                rewardHtml = `
                    <div style="margin-top:20px; padding:14px 16px; background:#f0fdf4; border:1.5px solid #86efac; border-radius:var(--md-shape-m);">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:44px; height:44px; border-radius:12px; background:#dcfce7; color:#15803d; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <span class="material-symbols-rounded" style="font-size:26px;">featured_seasonal_and_gifts</span>
                                </div>
                                <div>
                                    <div style="font-weight:700; font-size:0.95rem; color:#166534;">
                                        【${itemName}】×${itemCount}
                                    </div>
                                    <div style="font-size:0.78rem; color:#15803d; margin-top:2px;">
                                        领取后 ${days} 天内有效
                                    </div>
                                </div>
                            </div>
                            <div>
                                ${isClaimed ? `
                                    <button type="button" class="btn btn-tonal btn-sm" disabled style="opacity:0.65; cursor:not-allowed;">
                                        <span class="material-symbols-rounded" style="font-size:16px;">check</span>
                                        <span>已领取</span>
                                    </button>
                                ` : `
                                    <button type="button" class="btn btn-filled btn-sm" onclick="MailManager.claimMailReward('${mail.id}')" style="background:#16a34a; color:#fff; font-weight:700; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                                        <span class="material-symbols-rounded" style="font-size:16px;">redeem</span>
                                        <span>立即领取</span>
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `<div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:14px;"><div style="width:48px; height:48px; border-radius:14px; background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><span class="material-symbols-rounded" style="font-size:26px;">mail</span></div><div><h3 style="margin:0; font-size:1.2rem; font-weight:800; color:var(--md-sys-color-on-surface); line-height:1.35;">${mail.title || '系统通知'}</h3><div style="display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 12px; font-size:0.8rem; color:var(--md-sys-color-outline); margin-top:4px;"><span style="font-weight:normal; color:var(--md-sys-color-outline);">发件人：${sender}</span><span style="font-weight:normal; color:var(--md-sys-color-outline); font-variant-numeric:tabular-nums;">${timeStr}</span></div></div></div><div style="padding:0 !important; margin:0 !important; background:var(--md-sys-color-surface-container-lowest, #fbfcfe); border-radius:var(--md-shape-m); font-size:0.92rem; line-height:1.7; color:var(--md-sys-color-on-surface); white-space:pre-wrap; word-break:break-word; min-height:80px; text-align:left !important; display:block; width:100%; box-sizing:border-box;">${formatMailContent(mail.content)}</div>${rewardHtml}`;

            // 更新模态框底部（给已读邮件提供删除邮件按钮，居右与关闭对齐）
            const footer = document.querySelector('#modal-mail-detail .modal-footer');
            if (footer) {
                footer.style.display = 'flex';
                footer.style.justifyContent = 'flex-end';
                footer.style.alignItems = 'center';
                footer.style.gap = '10px';
                footer.innerHTML = `
                    <button type="button" class="btn btn-text btn-sm" onclick="MailManager.deleteMail('${mail.id}')" style="color:#dc2626; display:inline-flex; align-items:center; gap:4px; padding:0 12px; height:36px; min-height:36px;">
                        <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                        <span>删除邮件</span>
                    </button>
                    <button type="button" class="btn btn-outlined btn-sm" onclick="MailManager.closeMailDetail()" style="height:36px; min-height:36px; padding:0 16px;">关闭</button>
                `;
            }
        },

        // 删除已读邮件
        async deleteMail(mailId, event) {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            }

            const idStr = String(mailId);
            const mail = this._mails.find(m => String(m.id) === idStr);
            if (!mail) return;

            // 仅已读邮件允许删除
            if (!mail.is_read) {
                if (typeof showToast === 'function') showToast('未读邮件暂不支持删除');
                return;
            }

            // 若有未领取的道具，弹出确认
            if (mail.reward_item_type && !mail.is_claimed) {
                const confirmed = window.confirm('该邮件内含有未领取的奖励，删除后将无法领取。确定要删除吗？');
                if (!confirmed) return;
            }

            if (!this._deletedMailIds) this._deletedMailIds = new Set();
            this._deletedMailIds.add(idStr);

            // 从当前列表中移除
            this._mails = this._mails.filter(m => String(m.id) !== idStr);

            // 记录已删除状态
            if (!this._mailStatusMap[idStr]) {
                this._mailStatusMap[idStr] = { is_read: true, is_deleted: true, deleted_at: new Date().toISOString() };
            } else {
                this._mailStatusMap[idStr].is_deleted = true;
                this._mailStatusMap[idStr].deleted_at = new Date().toISOString();
            }

            this.saveLocalCache();
            this.updateBadge();

            // 若详情弹窗打开，则关闭
            const modal = document.getElementById('modal-mail-detail');
            if (modal && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }

            this.renderMailboxView();

            if (typeof showToast === 'function') {
                showToast('邮件已删除');
            }

            // 异步同步至云端
            await this._syncStatusToCloud(idStr, { is_deleted: true, deleted_at: new Date().toISOString() });
        },

        // 领取邮件附件中的道具
        async claimMailReward(mailId) {
            const idStr = String(mailId);
            const mail = this._mails.find(m => String(m.id) === idStr);
            if (!mail) return;

            // 1. 严格检查是否已领取或正在处理，杜绝网络延迟期间重复点击
            if (mail.is_claimed || (this._claimedMailIds && this._claimedMailIds.has(idStr)) || (this._claimingIds && this._claimingIds.has(idStr))) {
                if (typeof showToast === 'function') showToast('该邮件的附件道具已经领取过了！');
                return;
            }

            if (!mail.reward_item_type) {
                if (typeof showToast === 'function') showToast('此邮件无附件道具');
                return;
            }

            const user = this.getCurrentUser();
            if (!user.isLoggedIn || !user.username) {
                if (typeof showToast === 'function') showToast('请先登录账号后再领取道具！');
                return;
            }

            // 2. 立即上锁并记录已领取状态，杜绝任何并发冲突与界面闪烁
            if (!this._claimingIds) this._claimingIds = new Set();
            if (!this._claimedMailIds) this._claimedMailIds = new Set();
            this._claimingIds.add(idStr);
            this._claimedMailIds.add(idStr);

            const nowIso = new Date().toISOString();
            mail.is_claimed = true;
            mail.claimed_at = nowIso;

            if (!this._mailStatusMap[idStr]) {
                this._mailStatusMap[idStr] = { is_read: true, is_claimed: true, claimed_at: nowIso };
            } else {
                this._mailStatusMap[idStr].is_claimed = true;
                this._mailStatusMap[idStr].claimed_at = nowIso;
            }

            this.saveLocalCache();

            // 3. 立即重绘弹窗和邮件列表，使“领取奖励”按钮毫秒级锁定为“已领取”禁用状态
            this.renderMailDetailContent(mail);
            this.renderMailboxView();
            this.updateBadge();

            const itemType = mail.reward_item_type;
            const days = mail.reward_days || 30;
            const count = mail.reward_item_count || 1;

            try {
                // 4. 调用道具管理器发放道具
                if (typeof ItemManager !== 'undefined' && typeof ItemManager.grantItem === 'function') {
                    for (let i = 0; i < count; i++) {
                        await ItemManager.grantItem(user.username, itemType, days);
                    }
                }

                // 5. 异步同步 Supabase user_mail_status
                await this._syncStatusToCloud(idStr, { is_claimed: true, claimed_at: nowIso });

                if (typeof showToast === 'function') {
                    showToast('领取成功！', 4500);
                }
            } catch (e) {
                console.error('[MailManager] claimMailReward error:', e);
                if (typeof showToast === 'function') showToast('领取过程中网络波动，请检查背包');
            } finally {
                if (this._claimingIds) {
                    this._claimingIds.delete(idStr);
                }
            }
        },

        // 将阅读/领取状态同步更新至 Supabase 数据库
        async _syncStatusToCloud(mailId, updates) {
            const user = this.getCurrentUser();
            if (!user.isLoggedIn || !user.username) return;
            const idStr = String(mailId);

            try {
                if (typeof sbClient !== 'undefined' && sbClient && typeof sbClient.from === 'function') {
                    // 查询该记录是否存在
                    const { data: existing } = await sbClient
                        .from('user_mail_status')
                        .select('id')
                        .eq('mail_id', idStr)
                        .eq('username', user.username)
                        .maybeSingle();

                    if (existing && existing.id) {
                        await sbClient
                            .from('user_mail_status')
                            .update(updates)
                            .eq('id', existing.id);
                    } else {
                        await sbClient
                            .from('user_mail_status')
                            .insert([{
                                mail_id: idStr,
                                username: user.username,
                                is_read: true,
                                is_claimed: false,
                                read_at: new Date().toISOString(),
                                ...updates
                            }]);
                    }
                }
            } catch (e) {
                console.warn('[MailManager] _syncStatusToCloud error:', e);
            }
        }
    };

    window.MailManager = MailManager;

    // 全局快捷函数
    window.openMailboxView = function () {
        if (!MailManager.isAvailable()) {
            if (typeof showToast === 'function') showToast('离线模式下无法查看邮箱');
            return;
        }
        if (typeof switchView === 'function') {
            switchView('view-mailbox');
        }
        MailManager.renderMailboxView();
        MailManager.fetchMails();
    };

    window.exitMailboxView = function () {
        if (typeof switchView === 'function') {
            switchView('view-hub');
        }
        MailManager.updateBadge();
    };

})(window);
