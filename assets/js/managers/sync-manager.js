/**
 * SyncManager: 本地优先与批量数据同步器
 * Module: assets/js/managers/sync-manager.js
 * 
 * 核心优化：
 * 1. 本地优先 (Local-First)：做题与答题记录优先存入内存与 LocalStorage，零延迟响应用户操作。
 * 2. 批量同步 (Batch Sync)：废除逐题向 Supabase DB 发起写请求，聚合答题数据后定时或定容批量提交。
 * 3. 离线缓存与弱网退避重试：断网或网络波动时，数据安全保存在本地队列中，网络恢复或空闲时自动重试。
 */

const SyncManager = {
    // 内存队列
    pendingQueue: [],
    // 同步中锁
    isSyncing: false,
    debounceTimer: null,
    intervalTimer: null,
    retryDelay: 5000,
    maxRetryDelay: 60000,

    init() {
        this.loadQueue();
        if (typeof window !== 'undefined') {
            // 页面隐藏或关闭时利用 keepalive 发送最终批量
            window.addEventListener('beforeunload', () => {
                this.flush({ keepalive: true, silent: true });
            });
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.flush({ keepalive: true, silent: true });
                }
            });
            // 弱网恢复在线时自动重试
            window.addEventListener('online', () => {
                console.log('[SyncManager] 网络已恢复，自动触发批量数据同步...');
                this.flush({ silent: true });
            });
        }
        // 定期检查与同步 (每 25 秒检查一次)
        if (this.intervalTimer) clearInterval(this.intervalTimer);
        this.intervalTimer = setInterval(() => {
            if (this.pendingQueue.length > 0 && !this.isSyncing) {
                this.flush({ silent: true });
            }
        }, 25000);
    },

    getStorageKey(user) {
        const u = user || (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'default';
        return `vocab_sync_queue_${u}`;
    },

    loadQueue() {
        try {
            const raw = localStorage.getItem(this.getStorageKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this.pendingQueue = parsed;
                }
            }
        } catch (e) {
            this.pendingQueue = [];
        }
        if (typeof updateSyncButtonStatus === 'function') {
            updateSyncButtonStatus();
        }
    },

    saveQueue() {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(this.pendingQueue));
        } catch (e) {}
    },

    /**
     * 将答题或数据变更入队 (本地优先，无任何阻塞与网络开销)
     * @param {string} type - 变更类型 (如 'stats_update', 'answer', 'level_up')
     * @param {object} payload - 附加载荷
     * @param {boolean} immediate - 是否立刻刷新队列 (如对决完成/退出)
     */
    enqueue(type, payload = {}, immediate = false) {
        const u = (typeof currentUser !== 'undefined') ? currentUser : null;
        if (!u || u.startsWith('游客')) return;

        const record = {
            id: 'sync_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            type,
            user: u,
            timestamp: Date.now(),
            payload
        };

        this.pendingQueue.push(record);
        this.saveQueue();

        if (typeof updateSyncButtonStatus === 'function') {
            updateSyncButtonStatus();
        }

        const autoSync = (typeof isAutoSyncEnabled === 'function')
            ? isAutoSyncEnabled()
            : (localStorage.getItem('vocab_auto_sync_enabled') !== 'false');

        if (!autoSync && !immediate) {
            // 用户在设置中关闭了自动同步：数据安全保留在本地队列中，等待手动同步
            return;
        }

        if (immediate) {
            this.flush({ silent: false, force: true });
        } else {
            // 防抖机制：连续答题时合并在 4 秒空闲后触发；若积压超过 10 条且未在同步中则推送
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            if (this.pendingQueue.length >= 10 && !this.isSyncing) {
                this.flush({ silent: true });
            } else {
                this.debounceTimer = setTimeout(() => {
                    this.flush({ silent: true });
                }, 4000);
            }
        }
    },

    /**
     * 批量推送到云端 (使用单次批量写入，失败自动保留重试)
     */
    async flush(options = {}) {
        if (this.isSyncing) return;
        const u = (typeof currentUser !== 'undefined') ? currentUser : null;
        if (!u || u.startsWith('游客')) {
            this.pendingQueue = [];
            return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log('[SyncManager] 当前网络离线，数据安全保存在本地队列中');
            return;
        }

        // 如果队列为空且非强制即时全量同步，则无需发送请求
        if (this.pendingQueue.length === 0 && !options.force) {
            return;
        }

        this.isSyncing = true;
        if (typeof updateSyncButtonStatus === 'function') {
            updateSyncButtonStatus();
        }
        const snapshot = [...this.pendingQueue];

        try {
            if (typeof syncAllUserDataToCloud === 'function') {
                const res = await syncAllUserDataToCloud(u, {
                    keepalive: !!options.keepalive,
                    silent: options.silent !== false,
                    batchCount: snapshot.length
                });

                if (res && res.success) {
                    const syncedIds = new Set(snapshot.map(i => i.id));
                    this.pendingQueue = this.pendingQueue.filter(i => !syncedIds.has(i.id));
                    this.saveQueue();
                    this.retryDelay = 5000;
                    this.isSyncing = false;
                    if (typeof updateSyncButtonStatus === 'function') {
                        updateSyncButtonStatus(true);
                    }
                    console.log(`[SyncManager] 成功批量同步 ${snapshot.length} 条记录至 Supabase 云端`);
                } else {
                    console.warn('[SyncManager] 批量同步未完成，数据留在本地队列将在下次重试:', res ? res.error : '未知错误');
                    const curDelay = this.retryDelay;
                    this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
                    setTimeout(() => {
                        this.isSyncing = false;
                        if (typeof updateSyncButtonStatus === 'function') {
                            updateSyncButtonStatus(false);
                        }
                    }, curDelay);
                    return;
                }
            } else {
                this.isSyncing = false;
                if (typeof updateSyncButtonStatus === 'function') {
                    updateSyncButtonStatus();
                }
            }
        } catch (e) {
            console.warn('[SyncManager] 批量同步异常，数据保留在本地队列:', e);
            const curDelay = this.retryDelay;
            this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
            setTimeout(() => {
                this.isSyncing = false;
                if (typeof updateSyncButtonStatus === 'function') {
                    updateSyncButtonStatus(false);
                }
            }, curDelay);
        }
    }
};

window.SyncManager = SyncManager;

if (typeof window.isAutoSyncEnabled !== 'function') {
    window.isAutoSyncEnabled = function() {
        try {
            const val = localStorage.getItem('vocab_auto_sync_enabled');
            if (val === null) return true;
            return val === 'true' || val === true || val === '1';
        } catch (e) {
            return true;
        }
    };
}

// 自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SyncManager.init());
    } else {
        SyncManager.init();
    }
}

