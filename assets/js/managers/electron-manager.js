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

        // 3. 启动时自动静默扫描本地专属词书文件夹并监听磁盘文件变动与焦点唤醒
        setTimeout(() => {
            this.scanAndSyncLocalBooks(true);
        }, 800);

        if (window.electronAPI && typeof window.electronAPI.onLocalBooksChanged === 'function') {
            window.electronAPI.onLocalBooksChanged(() => {
                this.scanAndSyncLocalBooks(true);
            });
        }
        window.addEventListener('focus', () => {
            this.scanAndSyncLocalBooks(true);
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.scanAndSyncLocalBooks(true);
            }
        });

        // 4. 启动静默检查更新 (延迟 3 秒，且仅在非离线模式下检查)
        setTimeout(() => {
            if (typeof isOfflineMode === 'function' && isOfflineMode()) return;
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
     * 保存词书内容到本地词书文件夹 (cloud_books 或 local_books)
     */
    async saveBookToDisk(fileName, jsonString, type = 'local', category = '') {
        if (!this.isAvailable() || !fileName || !jsonString) return false;
        try {
            if (type === 'cloud' && window.electronAPI && typeof window.electronAPI.saveCloudBook === 'function') {
                const res = await window.electronAPI.saveCloudBook(category || '高中', fileName, jsonString);
                return res && res.success;
            } else if (window.electronAPI && typeof window.electronAPI.saveLocalBook === 'function') {
                const res = await window.electronAPI.saveLocalBook(category || '', fileName, jsonString);
                return res && res.success;
            } else if (window.electronAPI && typeof window.electronAPI.saveBookToFolder === 'function') {
                const res = await window.electronAPI.saveBookToFolder(fileName, jsonString);
                return res && res.success;
            }
        } catch (e) {
            console.warn('[ElectronManager] saveBookToDisk error:', e);
            return false;
        }
        return false;
    },

    /**
     * 扫描本地专属词书目录，并将发现的词书自动注册到应用中，支持刷新同步与删除同步
     */
    async scanAndSyncLocalBooks(silent = false) {
        if (!this.isAvailable()) {
            if (typeof BookManager !== 'undefined') {
                BookManager.mergeCustomBooks();
            }
            if (typeof renderManageLocalBooksInSettings === 'function') renderManageLocalBooksInSettings();
            if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
            if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
            if (!silent) showToast('词书列表已刷新');
            return;
        }

        try {
            const isOffline = (typeof isOfflineMode === 'function' && isOfflineMode());
            const res = await window.electronAPI.scanBooksFolder({ isOffline });
            if (!res || !res.success) {
                if (!silent) showToast('扫描词书目录失败：' + (res ? res.error : '未知错误'));
                return;
            }

            const diskBooks = Array.isArray(res.books) ? res.books : [];
            window.localDiskFolders = Array.isArray(res.folders) ? res.folders : [];
            try {
                localStorage.setItem('vocab_local_disk_folders', JSON.stringify(window.localDiskFolders));
            } catch (e) { }

            // 1. 同步物理删除：如果之前标记为来自磁盘的词书已经从本地磁盘删除，则同步剔除 (通过 ID、路径或名称校验)
            const booksToRemove = window.customBooks.filter(cb => {
                if (!cb.isDiskBook) return false;
                const matchInDisk = diskBooks.some(db => db.id === cb.id || (db.path && cb.path && db.path === cb.path) || db.name === cb.name || db.rawName === cb.rawName);
                return !matchInDisk;
            });
            if (booksToRemove.length > 0) {
                for (const b of booksToRemove) {
                    delete BookManager.bookCache[b.id];
                    if (typeof VocabOfflineDB !== 'undefined') {
                        await VocabOfflineDB.deleteBook(b.id);
                    }
                }
                window.customBooks = window.customBooks.filter(cb => !booksToRemove.some(r => r.id === cb.id));
                if (typeof BookManager !== 'undefined' && Array.isArray(BookManager.availableBooks)) {
                    BookManager.availableBooks = BookManager.availableBooks.filter(ab => !booksToRemove.some(r => r.id === ab.id));
                }
                console.log(`[ElectronManager] 已从应用中移除已在磁盘删除的 ${booksToRemove.length} 本词书`);
            }

            // 同步云端已下载状态：如果在 cloud_books 删除了文件，相应重置 syncStatus (仅非离线模式)
            if (!isOffline && BookManager && Array.isArray(BookManager.availableBooks)) {
                BookManager.availableBooks.forEach(ab => {
                    if (ab.isCloud && ab.syncStatus === 'downloaded') {
                        const matched = diskBooks.find(db => db.isCloud && (db.name === ab.name || db.id === ab.id));
                        if (!matched) {
                            ab.syncStatus = 'not_downloaded';
                            delete BookManager.bookCache[ab.id];
                            if (typeof VocabOfflineDB !== 'undefined') {
                                VocabOfflineDB.deleteBook(ab.id).catch(() => {});
                            }
                        }
                    }
                });
            }

            let updatedCount = 0;
            let addedCount = 0;

            for (const diskBook of diskBooks) {
                // 如果是 cloud_books 里的词书，同步给 BookManager (无论是否离线，已在本地磁盘的云端词书均正常加载)
                if (diskBook.isCloud) {
                    const normalized = BookManager.normalizeWords(diskBook.words, diskBook.name, diskBook.id);
                    BookManager.bookCache[diskBook.id] = normalized;

                    let cloudTarget = BookManager.availableBooks.find(b => b.name === diskBook.name || b.id === diskBook.id);
                    if (cloudTarget) {
                        cloudTarget.syncStatus = 'downloaded';
                        cloudTarget.words = normalized;
                        cloudTarget.count = normalized.length;
                        if (diskBook.category) cloudTarget.category = diskBook.category;
                    } else {
                        BookManager.availableBooks.push({
                            id: diskBook.id,
                            name: cleanBookName(diskBook.name),
                            category: diskBook.category || '高中',
                            count: normalized.length,
                            words: normalized,
                            path: diskBook.relPath || diskBook.id,
                            isCloud: true,
                            isDiskBook: true,
                            syncStatus: 'downloaded'
                        });
                    }

                    if (typeof VocabOfflineDB !== 'undefined') {
                        await VocabOfflineDB.saveBook({
                            id: diskBook.id,
                            name: diskBook.name,
                            category: diskBook.category || '高中',
                            count: normalized.length,
                            words: normalized,
                            updatedAt: diskBook.updatedAt || Date.now(),
                            isCloud: true
                        });
                    }
                    continue;
                }

                // 如果是 local_books 里的本地词书
                const cleanDiskName = cleanBookName(diskBook.name || diskBook.rawName).toLowerCase();
                const existingIndex = window.customBooks.findIndex(b => b.id === diskBook.id || (b.path && b.path === diskBook.path) || (cleanBookName(b.name || b.rawName).toLowerCase() === cleanDiskName));
                const normalized = (typeof BookManager !== 'undefined' && typeof BookManager.normalizeWords === 'function')
                    ? BookManager.normalizeWords(diskBook.words, diskBook.name, diskBook.id)
                    : (diskBook.words || []);

                // 自动识别英语词书与实词词书
                const isAncient = (typeof isShiCiBook === 'function' && isShiCiBook(diskBook)) || 
                    diskBook.name.includes('实词') || diskBook.name.includes('文言');

                // 分类完全依据文件夹命名：子文件夹名作为分类；根目录直接放置的为“未分类”
                let detectedCategory = diskBook.category || '未分类';

                if (existingIndex >= 0) {
                    const oldId = window.customBooks[existingIndex].id;
                    window.customBooks[existingIndex].id = diskBook.id;
                    window.customBooks[existingIndex].name = cleanBookName(diskBook.name);
                    window.customBooks[existingIndex].rawName = cleanBookName(diskBook.name);
                    window.customBooks[existingIndex].path = diskBook.path;
                    window.customBooks[existingIndex].words = normalized;
                    window.customBooks[existingIndex].count = normalized.length;
                    window.customBooks[existingIndex].category = detectedCategory;
                    window.customBooks[existingIndex].isShiCi = isAncient;
                    window.customBooks[existingIndex].isDiskBook = true;
                    if (typeof VocabOfflineDB !== 'undefined') {
                        if (oldId && oldId !== diskBook.id) {
                            await VocabOfflineDB.deleteBook(oldId);
                        }
                        await VocabOfflineDB.saveBook(window.customBooks[existingIndex]);
                    }
                    if (typeof BookManager !== 'undefined') {
                        if (oldId && oldId !== diskBook.id) {
                            delete BookManager.bookCache[oldId];
                            if (Array.isArray(BookManager.availableBooks)) {
                                BookManager.availableBooks = BookManager.availableBooks.filter(ab => ab.id !== oldId);
                            }
                        }
                        BookManager.bookCache[diskBook.id] = normalized;
                        BookManager.bookCache[window.customBooks[existingIndex].id] = normalized;
                    }
                    if (oldId && oldId !== diskBook.id) {
                        if (typeof singleSelectedBookIds !== 'undefined' && Array.isArray(singleSelectedBookIds)) {
                            singleSelectedBookIds = singleSelectedBookIds.map(id => id === oldId ? diskBook.id : id);
                            localStorage.setItem('single_vocab_books', JSON.stringify(singleSelectedBookIds));
                        }
                    }
                    updatedCount++;
                } else {
                    const bookObj = {
                        id: diskBook.id,
                        name: cleanBookName(diskBook.name),
                        rawName: cleanBookName(diskBook.name),
                        category: detectedCategory,
                        isShiCi: isAncient,
                        count: normalized.length,
                        words: normalized,
                        path: diskBook.path,
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
                    if (typeof BookManager !== 'undefined') {
                        BookManager.bookCache[diskBook.id] = normalized;
                    }
                    addedCount++;
                }

                // 清理历史遗留的同名同分类重复项
                const cleanTargetId = diskBook.id;
                const toPrune = window.customBooks.filter(b => b.id !== cleanTargetId && cleanBookName(b.name || b.rawName).toLowerCase() === cleanDiskName && (b.category || '未分类') === detectedCategory);
                for (const p of toPrune) {
                    if (typeof VocabOfflineDB !== 'undefined') {
                        await VocabOfflineDB.deleteBook(p.id).catch(() => {});
                    }
                    if (typeof BookManager !== 'undefined') {
                        delete BookManager.bookCache[p.id];
                    }
                }
                if (toPrune.length > 0) {
                    window.customBooks = window.customBooks.filter(b => !toPrune.some(p => p.id === b.id));
                }
            }

            if (isOffline) {
                window.customBooks = window.customBooks.filter(b => !b.isCloud);
            }

            if (typeof BookManager !== 'undefined') {
                BookManager.mergeCustomBooks();
            }

            // 全量重新渲染所有词书展示视图
            if (typeof renderManageLocalBooksInSettings === 'function') {
                renderManageLocalBooksInSettings();
            }
            if (typeof renderManageBooksPage === 'function') {
                renderManageBooksPage();
            }
            if (typeof renderBookSelectorPage === 'function') {
                renderBookSelectorPage();
            }
            if (typeof renderSingleBookList === 'function') {
                renderSingleBookList();
            }
            if (typeof renderLocalDuelBookChips === 'function') {
                renderLocalDuelBookChips();
            } else if (typeof updateLocalDuelBookSummaryUI === 'function') {
                updateLocalDuelBookSummaryUI();
            }
            if (typeof renderAiDuelBookChips === 'function') {
                renderAiDuelBookChips();
            } else if (typeof updateAiDuelBookSummaryUI === 'function') {
                updateAiDuelBookSummaryUI();
            }
            if (typeof renderBookSelectorCategoryTabs === 'function') {
                renderBookSelectorCategoryTabs();
            }
            if (typeof renderManageBooksCategoryTabs === 'function') {
                renderManageBooksCategoryTabs();
            }
            if (typeof renderHub === 'function') {
                renderHub();
            }
            if (typeof updateHubBookDisplay === 'function') {
                updateHubBookDisplay();
            }

            if (!silent) {
                if (addedCount > 0 || booksToRemove.length > 0) {
                    showToast(`词书刷新完成：新增 ${addedCount} 本，移除 ${booksToRemove.length} 本，更新 ${updatedCount} 本`);
                } else {
                    showToast('词书列表已刷新，当前已是最新状态');
                }
            }
        } catch (e) {
            console.error('[ElectronManager] scanAndSyncLocalBooks error:', e);
            if (!silent) showToast('刷新词书列表出错：' + e.message);
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
        const isLocal = typeof isLocalAccount === 'function' && isLocalAccount();
        const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : 'guest';
        return {
            version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.9.0',
            exportedAt: new Date().toISOString(),
            user: user,
            accountType: isLocal ? 'local' : 'online',
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
            const currentIsLocal = typeof isLocalAccount === 'function' && isLocalAccount();
            const backupIsLocal = parsed.accountType === 'local' || (typeof parsed.user === 'string' && parsed.user.startsWith('local_'));
            if (currentIsLocal !== backupIsLocal) {
                alert(currentIsLocal
                    ? '无法还原：该备份是在线账号数据，离线本地账号不允许导入在线账号数据！'
                    : '无法还原：该备份是离线本地账号数据，在线账号不允许导入本地账号数据！');
                return;
            }

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
                showToast(`发现新版本 v${msg.version}，正在自动获取并启动更新程序...`);
                this.showUpdateDialog(msg, true);
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
                showToast('新版本下载完毕，正在自动启动更新安装程序...');
                setTimeout(() => {
                    this.quitAndInstall();
                }, 2000);
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

        if (typeof isOfflineMode === 'function' && isOfflineMode()) {
            if (manual) showToast('当前处于离线模式，已禁用检查更新');
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
    showUpdateDialog(info, autoDownloading = false) {
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

                <!-- 下载进度条容器 (检测到更新时自动激活) -->
                <div id="electron-update-progress-area" style="display:${autoDownloading ? 'block' : 'none'}; margin: 16px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:6px; color:var(--md-sys-color-outline);">
                        <span id="electron-update-progress-text">正在自动获取更新... 0%</span>
                        <span id="electron-update-speed-text">0 MB/s</span>
                    </div>
                    <div style="height: 8px; background: var(--md-sys-color-surface-container-high); border-radius: 9999px; overflow: hidden;">
                        <div id="electron-update-progress-bar" style="width: 0%; height: 100%; background: var(--md-sys-color-primary); transition: width 0.2s;"></div>
                    </div>
                </div>

                <div id="electron-update-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                    <button type="button" class="btn btn-text" onclick="document.getElementById('modal-electron-update').classList.remove('active')">稍后提醒</button>
                    <button type="button" class="btn btn-filled" id="btn-electron-start-download" ${autoDownloading ? 'disabled' : ''} onclick="ElectronManager.onUserClickStartDownload()">
                        <span class="material-symbols-rounded" style="font-size:18px;">${autoDownloading ? 'hourglass_top' : 'cloud_download'}</span>
                        <span>${autoDownloading ? '正在自动更新...' : '立即更新'}</span>
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
    },

    /**
     * 新建本地分类
     */
    async createCategory(categoryName) {
        if (!categoryName || !categoryName.trim()) {
            showToast('分类名称不能为空');
            return false;
        }
        const cleanName = categoryName.trim();
        if (this.isAvailable() && window.electronAPI && typeof window.electronAPI.createLocalCategory === 'function') {
            const res = await window.electronAPI.createLocalCategory(cleanName);
            if (!res || !res.success) {
                showToast(res && res.error ? res.error : '新建分类失败');
                return false;
            }
            await this.scanAndSyncLocalBooks(true);
            showToast(`已创建分类「${cleanName}」`);
            return true;
        } else {
            let customFolders = [];
            try {
                customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
            } catch (e) { customFolders = []; }
            if (!customFolders.includes(cleanName)) {
                customFolders.push(cleanName);
                localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
            }
            window.localDiskFolders = customFolders;
            showToast(`已创建分类「${cleanName}」`);
            if (typeof renderManageBooksCategoryTabs === 'function') renderManageBooksCategoryTabs();
            if (typeof renderBookSelectorCategoryTabs === 'function') renderBookSelectorCategoryTabs();
            return true;
        }
    },

    /**
     * 重命名本地分类
     */
    async renameCategory(oldName, newName) {
        if (!oldName || !newName || !newName.trim()) {
            showToast('分类名称不能为空');
            return false;
        }
        const cleanOld = oldName.trim();
        const cleanNew = newName.trim();
        if (cleanOld === cleanNew) return true;

        if (this.isAvailable() && window.electronAPI && typeof window.electronAPI.renameLocalCategory === 'function') {
            const res = await window.electronAPI.renameLocalCategory(cleanOld, cleanNew);
            if (!res || !res.success) {
                showToast(res && res.error ? res.error : '重命名分类失败');
                return false;
            }
            await this.scanAndSyncLocalBooks(true);
            showToast(`已将分类「${cleanOld}」重命名为「${cleanNew}」`);
            return true;
        } else {
            let customFolders = [];
            try {
                customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
            } catch (e) { customFolders = []; }
            const idx = customFolders.indexOf(cleanOld);
            if (idx >= 0) {
                customFolders[idx] = cleanNew;
                localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
            }
            window.localDiskFolders = customFolders;
            (window.customBooks || []).forEach(b => {
                if (b.category === cleanOld) {
                    b.category = cleanNew;
                    if (typeof VocabOfflineDB !== 'undefined') VocabOfflineDB.saveBook(b);
                }
            });
            showToast(`已将分类重命名为「${cleanNew}」`);
            if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
            return true;
        }
    },

    /**
     * 删除本地分类
     */
    async deleteCategory(categoryName) {
        if (!categoryName) return false;
        const cleanName = categoryName.trim();
        if (this.isAvailable() && window.electronAPI && typeof window.electronAPI.deleteLocalCategory === 'function') {
            const res = await window.electronAPI.deleteLocalCategory(cleanName, false);
            if (!res || !res.success) {
                showToast(res && res.error ? res.error : '删除分类失败');
                return false;
            }
            await this.scanAndSyncLocalBooks(true);
            showToast(`已删除分类「${cleanName}」，其下的词书已移至未分类`);
            return true;
        } else {
            let customFolders = [];
            try {
                customFolders = JSON.parse(localStorage.getItem('vocab_local_disk_folders') || '[]');
            } catch (e) { customFolders = []; }
            customFolders = customFolders.filter(f => f !== cleanName);
            localStorage.setItem('vocab_local_disk_folders', JSON.stringify(customFolders));
            window.localDiskFolders = customFolders;
            (window.customBooks || []).forEach(b => {
                if (b.category === cleanName) {
                    b.category = '未分类';
                    if (typeof VocabOfflineDB !== 'undefined') VocabOfflineDB.saveBook(b);
                }
            });
            showToast(`已删除分类「${cleanName}」`);
            if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
            return true;
        }
    },

    /**
     * 移动词书到指定分类文件夹
     */
    async moveBook(bookId, targetCategory) {
        const bookMeta = (typeof BookManager !== 'undefined' && BookManager.getBookMeta) ? BookManager.getBookMeta(bookId) : null;
        if (!bookMeta) {
            showToast('词书不存在');
            return false;
        }
        const cleanCat = (targetCategory || '').trim() || '未分类';
        if (this.isAvailable() && window.electronAPI && typeof window.electronAPI.moveBookFile === 'function') {
            const res = await window.electronAPI.moveBookFile({
                bookId: bookId,
                filePath: bookMeta.path,
                fileName: bookMeta.name || bookMeta.rawName,
                targetCategory: cleanCat
            });
            if (!res || !res.success) {
                showToast(res && res.error ? res.error : '移动词书失败');
                return false;
            }
            await this.scanAndSyncLocalBooks(true);
            showToast(`已成功将《${bookMeta.name}》移至「${cleanCat}」`);
            return true;
        } else {
            const b = (window.customBooks || []).find(x => x.id === bookId);
            if (b) {
                b.category = cleanCat;
                if (typeof VocabOfflineDB !== 'undefined') {
                    await VocabOfflineDB.saveBook(b);
                }
            }
            if (typeof BookManager !== 'undefined') {
                BookManager.mergeCustomBooks();
            }
            if (typeof renderManageBooksPage === 'function') renderManageBooksPage();
            if (typeof renderBookSelectorPage === 'function') renderBookSelectorPage();
            showToast(`已成功将《${bookMeta.name}》移至「${cleanCat}」`);
            return true;
        }
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

