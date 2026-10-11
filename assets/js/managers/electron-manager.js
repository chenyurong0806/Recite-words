/**
 * Electron 专属能力桥接与管理模块
 * 包括：专属词书目录同步、本地数据安全备份与还原、GitHub Releases 自动更新
 * Module: assets/js/managers/electron-manager.js
 */

const ElectronManager = {
    isAvailable() {
        return Boolean(typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron);
    },

    updateState: {
        checking: false,
        updateAvailable: false,
        versionInfo: null,
        downloading: false,
        downloadProgress: 0,
        downloadSpeed: '',
        downloaded: false
    },

    async init() {
        if (!this.isAvailable()) return;

        console.log('[ElectronManager] Initializing Electron integration...');
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.add('is-electron');
        }

        // 1. 获取 Electron 应用版本同步给前端
        try {
            const ver = await window.electronAPI.getAppVersion();
            if (ver) {
                window.APP_VERSION = ver;
                if (typeof APP_VERSION !== 'undefined') APP_VERSION = ver;
                const verLabel = document.getElementById('settings-version-label');
                if (verLabel) verLabel.innerText = `v${ver} (桌面客户端)`;
            }
        } catch (e) {
            console.warn('[ElectronManager] Failed to get app version:', e);
        }

        // 2. 注册自动更新监听事件
        this.setupUpdateListener();

        // 3. 启动时自动静默扫描本地专属词书文件夹
        setTimeout(() => {
            this.scanAndSyncLocalBooks(true);
        }, 1500);

        // 4. 启动静默检查更新 (延迟 3 秒，避免干扰首页加载)
        setTimeout(() => {
            this.checkForUpdates(false);
        }, 3000);

        // 5. 注册自动备份机制 (每 15 分钟或学习数据变更时静默备份)
        this.setupAutoBackupSchedule();
    },

    // =========================================================================
    // 1. 专属词书文件夹管理 (存放下载/导入的词书，支持在 App 中打开)
    // =========================================================================

    /**
     * 在系统资源管理器中打开专属词书文件夹
     */
    async openBooksFolder() {
        if (!this.isAvailable()) {
            return showToast('当前处于网页模式，无法打开系统文件夹');
        }
        try {
            await window.electronAPI.openBooksFolder();
        } catch (e) {
            console.error('[ElectronManager] openBooksFolder error:', e);
            showToast('打开词书文件夹失败：' + e.message);
        }
    },

    /**
     * 保存词书内容到本地词书文件夹
     */
    async saveBookToDisk(fileName, jsonString) {
        if (!this.isAvailable() || !fileName || !jsonString) return false;
        try {
            const res = await window.electronAPI.saveBookToFolder(fileName, jsonString);
            return res && res.success;
        } catch (e) {
            console.warn('[ElectronManager] saveBookToDisk error:', e);
            return false;
        }
    },

    /**
     * 扫描本地专属词书目录，并将发现的词书自动注册到应用中
     */
    async scanAndSyncLocalBooks(silent = false) {
        if (!this.isAvailable()) return;
        try {
            const res = await window.electronAPI.scanBooksFolder();
            if (!res || !res.success || !Array.isArray(res.books) || res.books.length === 0) {
                if (!silent) showToast('词书文件夹中暂无新的 .json 词书');
                return;
            }

            if (!window.customBooks) window.customBooks = [];
            let addedCount = 0;

            for (const diskBook of res.books) {
                // 如果已存在同名或同 ID 的词书，对比词数或更新
                const existingIndex = window.customBooks.findIndex(b => b.name === diskBook.name || b.id === diskBook.id);
                if (existingIndex >= 0) {
                    window.customBooks[existingIndex].words = diskBook.words;
                    window.customBooks[existingIndex].count = diskBook.count;
                    if (typeof VocabOfflineDB !== 'undefined') {
                        await VocabOfflineDB.saveBook(window.customBooks[existingIndex]);
                    }
                    BookManager.bookCache[window.customBooks[existingIndex].id] = diskBook.words;
                } else {
                    const normalized = BookManager.normalizeWords(diskBook.words, diskBook.name, diskBook.id);
                    const bookObj = {
                        id: diskBook.id,
                        name: cleanBookName(diskBook.name),
                        rawName: cleanBookName(diskBook.name),
                        category: diskBook.category || '本地',
                        count: normalized.length,
                        words: normalized,
                        folderId: null,
                        isCloud: false,
                        isDiskBook: true,
                        syncStatus: 'downloaded',
                        createdAt: diskBook.updatedAt || Date.now()
                    };
                    window.customBooks.push(bookObj);
                    if (typeof VocabOfflineDB !== 'undefined') {
                        await VocabOfflineDB.saveBook(bookObj);
                    }
                    BookManager.bookCache[bookObj.id] = normalized;
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                console.log(`[ElectronManager] 自动从专属词书目录加载了 ${addedCount} 本词书`);
                if (!silent) showToast(`已从本地词书文件夹同步 ${addedCount} 本词书！`);
                if (typeof renderManageLocalBooksInSettings === 'function') {
                    renderManageLocalBooksInSettings();
                }
                if (typeof renderBookSelectorPage === 'function' && window.currentView === 'view-book-selector') {
                    renderBookSelectorPage();
                }
            } else if (!silent) {
                showToast('已完成词书目录扫描，所有词书已是最新状态');
            }
        } catch (e) {
            console.error('[ElectronManager] scanAndSyncLocalBooks error:', e);
            if (!silent) showToast('扫描词书目录出错：' + e.message);
        }
    },

    // =========================================================================
    // 2. 本地用户数据安全备份与还原
    // =========================================================================

    /**
     * 在系统资源管理器中打开备份文件夹
     */
    async openBackupsFolder() {
        if (!this.isAvailable()) {
            return showToast('当前处于网页模式，无法打开系统文件夹');
        }
        try {
            await window.electronAPI.openBackupsFolder();
        } catch (e) {
            showToast('打开备份文件夹失败：' + e.message);
        }
    },

    /**
     * 生成当前用户的完整数据备份对象
     */
    buildBackupObject() {
        const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
        return {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.7.0',
            exportedAt: new Date().toISOString(),
            user: user,
            data: {
                ebbinghaus: localStorage.getItem(`vocab_ebbinghaus_db_${user}`),
                mastered: localStorage.getItem(`vocab_mastered_words_${user}`),
                dailyLogs: localStorage.getItem(`vocab_daily_logs_${user}`),
                userStats: localStorage.getItem(`user_stats_${user}`),
                singleSelectedBooks: localStorage.getItem(`vocab_single_selected_books_${user}`),
                singleConfig: localStorage.getItem('vocab_single_config'),
                dictationConfig: localStorage.getItem('vocab_dictation_config'),
                riddleHistory: localStorage.getItem(`vocab_riddle_daily_history_${user}`),
                customBooks: JSON.stringify(window.customBooks || []),
                localFolders: JSON.stringify(window.localFolders || [])
            }
        };
    },

    /**
     * 保存备份到本地专属备份目录
     */
    async saveLocalBackup(isAuto = false, silent = false) {
        if (!this.isAvailable()) return;
        const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '';
        if (!user && !isAuto) {
            return showToast('请先登录账号后再备份数据');
        }
        try {
            const backupObj = this.buildBackupObject();
            const res = await window.electronAPI.saveLocalBackup(backupObj, user || 'guest', isAuto);
            if (res && res.success) {
                if (!silent && !isAuto) {
                    showToast(`本地安全备份已生成：${res.fileName}`);
                }
                return true;
            } else {
                if (!silent && !isAuto) showToast('备份失败：' + (res ? res.error : '未知错误'));
            }
        } catch (e) {
            console.error('[ElectronManager] saveLocalBackup error:', e);
            if (!silent && !isAuto) showToast('备份出错：' + e.message);
        }
        return false;
    },

    /**
     * 自动定时静默备份调度
     */
    setupAutoBackupSchedule() {
        // 每 20 分钟执行一次自动安全备份 (如果用户已登录)
        setInterval(() => {
            const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '';
            if (user) {
                this.saveLocalBackup(true, true);
            }
        }, 20 * 60 * 1000);
    },

    /**
     * 打开本地备份管理与还原弹窗
     */
    async openBackupsModal() {
        if (!this.isAvailable()) {
            return showToast('当前处于网页模式，请使用导入备份功能');
        }

        const modal = document.getElementById('modal-electron-backups');
        if (!modal) {
            this.createBackupsModalElement();
        }

        await this.renderBackupsList();
        const m = document.getElementById('modal-electron-backups');
        if (m) m.classList.add('active');
    },

    createBackupsModalElement() {
        const div = document.createElement('div');
        div.id = 'modal-electron-backups';
        div.className = 'modal-overlay';
        div.innerHTML = `
            <div class="modal-card" style="max-width: 560px; width:92%; max-height:85vh; display:flex; flex-direction:column; border-radius: var(--md-shape-xl, 28px); padding: 24px; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="material-symbols-rounded" style="color:var(--md-sys-color-primary); font-size:26px;">inventory_2</span>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700;">本地数据备份管理</h3>
                    </div>
                    <button class="modal-close-btn" onclick="document.getElementById('modal-electron-backups').classList.remove('active')" style="background:none; border:none; cursor:pointer;">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
                    <button type="button" class="btn btn-filled btn-sm" onclick="ElectronManager.saveLocalBackup(false, false).then(() => ElectronManager.renderBackupsList())">
                        <span class="material-symbols-rounded" style="font-size:16px;">add_circle</span>
                        <span>立即生成新备份</span>
                    </button>
                    <button type="button" class="btn btn-outlined btn-sm" onclick="ElectronManager.openBackupsFolder()">
                        <span class="material-symbols-rounded" style="font-size:16px;">folder_open</span>
                        <span>打开备份文件夹</span>
                    </button>
                </div>
                <div id="electron-backups-list-container" style="flex:1; overflow-y:auto; min-height:180px; max-height:420px; border:1px solid var(--md-sys-color-outline-variant); border-radius:16px; padding:12px; background:var(--md-sys-color-surface-container-low);">
                    <div style="text-align:center; padding:30px; color:var(--md-sys-color-outline);">加载中...</div>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    },

    async renderBackupsList() {
        const container = document.getElementById('electron-backups-list-container');
        if (!container) return;

        try {
            const res = await window.electronAPI.listLocalBackups();
            if (!res || !res.success || !Array.isArray(res.backups) || res.backups.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px 10px; color:var(--md-sys-color-outline);">
                        <span class="material-symbols-rounded" style="font-size:40px; opacity:0.4;">history_toggle_off</span>
                        <p style="margin-top:8px; font-size:0.9rem;">暂无本地备份文件，点击上方“立即生成新备份”即可创建</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = res.backups.map(b => {
                const dateStr = new Date(b.createdAt).toLocaleString();
                const sizeKb = (b.size / 1024).toFixed(1) + ' KB';
                const isAuto = b.isAuto;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; margin-bottom:8px; background:var(--md-sys-color-surface); border:1px solid var(--md-sys-color-outline-variant); border-radius:12px; gap:8px;">
                        <div style="min-width:0; flex:1;">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
                                <span class="material-symbols-rounded" style="font-size:18px; color:${isAuto ? '#0284c7' : '#16a34a'};">${isAuto ? 'schedule' : 'verified_user'}</span>
                                <strong style="font-size:0.92rem; color:var(--md-sys-color-on-surface); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${b.fileName}</strong>
                            </div>
                            <div style="font-size:0.78rem; color:var(--md-sys-color-outline);">
                                <span>${dateStr}</span> | <span>${sizeKb}</span> ${isAuto ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.7rem; padding:1px 6px; border-radius:4px; margin-left:4px;">自动</span>' : '<span class="badge" style="background:#dcfce7; color:#15803d; font-size:0.7rem; padding:1px 6px; border-radius:4px; margin-left:4px;">手动</span>'}
                            </div>
                        </div>
                        <button type="button" class="btn btn-tonal btn-sm" onclick="ElectronManager.restoreBackupFromFile('${b.fileName}')" style="flex-shrink:0;">
                            <span class="material-symbols-rounded" style="font-size:16px;">restore</span>
                            <span>还原</span>
                        </button>
                    </div>
                `;
            }).join('');
        } catch (e) {
            container.innerHTML = `<div style="color:var(--md-sys-color-error); padding:20px; text-align:center;">读取备份列表失败: ${e.message}</div>`;
        }
    },

    /**
     * 从本地指定文件恢复备份
     */
    async restoreBackupFromFile(fileName) {
        if (!confirm(`确定要从备份“${fileName}”恢复数据吗？\n当前账号的复习进度与本地设置将被该备份覆盖。`)) {
            return;
        }

        try {
            const res = await window.electronAPI.readLocalBackup(fileName);
            if (!res || !res.success || !res.data) {
                throw new Error(res ? res.error : '无法读取备份数据');
            }

            const parsed = res.data;
            const targetUser = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : parsed.user;
            const d = parsed.data || {};

            if (d.ebbinghaus !== undefined && d.ebbinghaus !== null) {
                localStorage.setItem(`vocab_ebbinghaus_db_${targetUser}`, d.ebbinghaus);
            }
            if (d.mastered !== undefined && d.mastered !== null) {
                localStorage.setItem(`vocab_mastered_words_${targetUser}`, d.mastered);
            }
            if (d.dailyLogs !== undefined && d.dailyLogs !== null) {
                localStorage.setItem(`vocab_daily_logs_${targetUser}`, d.dailyLogs);
            }
            if (d.userStats !== undefined && d.userStats !== null) {
                localStorage.setItem(`user_stats_${targetUser}`, d.userStats);
            }
            if (d.singleSelectedBooks !== undefined && d.singleSelectedBooks !== null) {
                localStorage.setItem(`vocab_single_selected_books_${targetUser}`, d.singleSelectedBooks);
            }
            if (d.singleConfig) {
                localStorage.setItem('vocab_single_config', d.singleConfig);
            }
            if (d.dictationConfig) {
                localStorage.setItem('vocab_dictation_config', d.dictationConfig);
            }
            if (d.riddleHistory) {
                localStorage.setItem(`vocab_riddle_daily_history_${targetUser}`, d.riddleHistory);
            }

            showToast('备份恢复成功！应用即将刷新...');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            alert('恢复备份失败：' + e.message);
        }
    },

    // =========================================================================
    // 3. GitHub Releases 自动更新管理 (对接 electron-updater)
    // =========================================================================

    /**
     * 注册来自主进程的 updater 状态广播
     */
    setupUpdateListener() {
        if (!this.isAvailable()) return;

        window.electronAPI.onUpdateMessage((msg) => {
            console.log('[AutoUpdater Message]', msg);
            const status = msg.status;

            if (status === 'checking') {
                this.updateState.checking = true;
            } else if (status === 'available') {
                this.updateState.checking = false;
                this.updateState.updateAvailable = true;
                this.updateState.versionInfo = msg;
                this.showUpdateDialog(msg);
            } else if (status === 'not-available') {
                this.updateState.checking = false;
                if (this._manualChecking) {
                    showToast(`当前客户端已是最新版本 v${msg.version || APP_VERSION}`);
                    this._manualChecking = false;
                }
            } else if (status === 'downloading') {
                this.updateState.downloading = true;
                this.updateState.downloadProgress = msg.percent;
                const speedMb = (msg.bytesPerSecond / (1024 * 1024)).toFixed(2);
                this.updateState.downloadSpeed = `${speedMb} MB/s`;
                this.updateDownloadProgressUI(msg);
            } else if (status === 'downloaded') {
                this.updateState.downloading = false;
                this.updateState.downloaded = true;
                this.showUpdateDownloadedDialog(msg);
            } else if (status === 'error') {
                this.updateState.checking = false;
                this.updateState.downloading = false;
                if (this._manualChecking) {
                    showToast('检查更新失败：' + (msg.message || '网络连接超时'));
                    this._manualChecking = false;
                }
            }
        });
    },

    /**
     * 触发检查更新
     */
    async checkForUpdates(manual = false) {
        if (!this.isAvailable()) {
            if (typeof checkCloudVersion === 'function') {
                return checkCloudVersion(manual);
            }
            return;
        }

        this._manualChecking = manual;
        if (manual) {
            showToast('正在对接 GitHub 检查新版本...');
        }

        try {
            const res = await window.electronAPI.checkForUpdates();
            if (res && res.isDev && manual) {
                showToast('当前处于 Electron 开发模式：已就绪 GitHub Releases 更新通道');
            }
        } catch (e) {
            console.warn('[ElectronManager] Check updates error:', e);
            if (manual) showToast('检查更新出错：' + e.message);
        }
    },

    /**
     * 开始下载更新
     */
    async startDownload() {
        if (!this.isAvailable()) return;
        try {
            showToast('开始下载新版本，请稍候...');
            await window.electronAPI.startDownloadUpdate();
        } catch (e) {
            showToast('启动下载更新失败：' + e.message);
        }
    },

    /**
     * 重启并安装更新
     */
    quitAndInstall() {
        if (!this.isAvailable()) return;
        window.electronAPI.quitAndInstall();
    },

    /**
     * 弹出发现新版本的模态框
     */
    showUpdateDialog(info) {
        let modal = document.getElementById('modal-electron-update');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-electron-update';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const rawNotes = info.releaseNotes || '性能提升及常规问题修复';
        const notes = Array.isArray(rawNotes)
            ? rawNotes.map(n => `<li>${escapeHtml(n)}</li>`).join('')
            : `<p>${escapeHtml(rawNotes).replace(/\n/g, '<br>')}</p>`;

        modal.innerHTML = `
            <div class="modal-card" style="max-width: 480px; width:92%; border-radius: var(--md-shape-xl, 28px); padding: 26px; box-sizing:border-box;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                    <div style="width:48px; height:48px; border-radius:50%; background:var(--md-sys-color-primary-container); color:var(--md-sys-color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-symbols-rounded" style="font-size:26px;">system_update</span>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:1.2rem; font-weight:700;">发现新版本 v${info.version}</h3>
                        <div style="font-size:0.8rem; color:var(--md-sys-color-outline);">发布时间：${info.releaseDate ? info.releaseDate.substring(0, 10) : '刚刚'}</div>
                    </div>
                </div>

                <div style="margin: 14px 0; max-height: 180px; overflow-y: auto; background: var(--md-sys-color-surface-container-low); padding: 12px 14px; border-radius: 14px; font-size: 0.88rem; line-height: 1.6; color: var(--md-sys-color-on-surface-variant);">
                    <strong style="display:block; margin-bottom:6px; color:var(--md-sys-color-on-surface);">更新日志：</strong>
                    ${notes}
                </div>

                <!-- 下载进度条容器 (默认隐藏，下载时激活) -->
                <div id="electron-update-progress-area" style="display:none; margin: 16px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:6px; color:var(--md-sys-color-outline);">
                        <span id="electron-update-progress-text">正在下载更新... 0%</span>
                        <span id="electron-update-speed-text">0 MB/s</span>
                    </div>
                    <div style="height: 8px; background: var(--md-sys-color-surface-container-high); border-radius: 9999px; overflow: hidden;">
                        <div id="electron-update-progress-bar" style="width: 0%; height: 100%; background: var(--md-sys-color-primary); transition: width 0.2s;"></div>
                    </div>
                </div>

                <div id="electron-update-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                    <button type="button" class="btn btn-text" onclick="document.getElementById('modal-electron-update').classList.remove('active')">稍后提醒</button>
                    <button type="button" class="btn btn-filled" id="btn-electron-start-download" onclick="ElectronManager.onUserClickStartDownload()">
                        <span class="material-symbols-rounded" style="font-size:18px;">cloud_download</span>
                        <span>立即更新</span>
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    },

    onUserClickStartDownload() {
        const btn = document.getElementById('btn-electron-start-download');
        const progressArea = document.getElementById('electron-update-progress-area');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">hourglass_top</span><span>下载中...</span>';
        }
        if (progressArea) {
            progressArea.style.display = 'block';
        }
        this.startDownload();
    },

    updateDownloadProgressUI(msg) {
        const bar = document.getElementById('electron-update-progress-bar');
        const progressText = document.getElementById('electron-update-progress-text');
        const speedText = document.getElementById('electron-update-speed-text');
        const progressArea = document.getElementById('electron-update-progress-area');

        if (progressArea && progressArea.style.display === 'none') {
            progressArea.style.display = 'block';
        }
        if (bar) bar.style.width = `${msg.percent}%`;
        if (progressText) progressText.innerText = `正在下载更新... ${msg.percent}%`;
        if (speedText && msg.bytesPerSecond) {
            const speed = (msg.bytesPerSecond / (1024 * 1024)).toFixed(2);
            speedText.innerText = `${speed} MB/s`;
        }
    },

    showUpdateDownloadedDialog(info) {
        let modal = document.getElementById('modal-electron-update');
        if (!modal) {
            this.showUpdateDialog(info);
            modal = document.getElementById('modal-electron-update');
        }

        const actions = document.getElementById('electron-update-actions');
        const progressArea = document.getElementById('electron-update-progress-area');
        if (progressArea) progressArea.style.display = 'none';

        if (actions) {
            actions.innerHTML = `
                <button type="button" class="btn btn-text" onclick="document.getElementById('modal-electron-update').classList.remove('active')">稍后重启</button>
                <button type="button" class="btn btn-filled" onclick="ElectronManager.quitAndInstall()" style="background:#16a34a;">
                    <span class="material-symbols-rounded" style="font-size:18px;">restart_alt</span>
                    <span>立即重启并安装更新</span>
                </button>
            `;
        }

        modal.classList.add('active');
        showToast('新版本已下载完毕，重启即可完成安装！');
    }
};

window.ElectronManager = ElectronManager;

// 页面 DOM 加载完成后自动初始化
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ElectronManager.init());
    } else {
        ElectronManager.init();
    }
}

