const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// 路径与目录配置
const userDataPath = app.getPath('userData');
const booksDir = path.join(userDataPath, 'books');
const backupsDir = path.join(userDataPath, 'backups');

// 确保专属词书文件夹与备份文件夹存在
function ensureAppDirectories() {
    if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
        const readmePath = path.join(booksDir, '词书存放说明.txt');
        if (!fs.existsSync(readmePath)) {
            const readmeContent = [
                '【词迹 - 本地词书专属存放目录】',
                '==================================================',
                '1. 您可以将任意下载或自建的 .json 词书直接放入此文件夹中。',
                '2. 应用启动时或在“管理词书”中点击“扫描本地词书”会自动识别并加载。',
                '3. 在应用中下载或导入的词书也会自动保存一份到此处，便于迁移和备份。',
                '4. 词书格式要求为 JSON 数组，例如：',
                '   [',
                '     { "word": "example", "trans": ["n. 例子，范例"] }',
                '   ]',
                '=================================================='
            ].join('\r\n');
            fs.writeFileSync(readmePath, readmeContent, 'utf8');
        }
    }

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
}

let mainWindow = null;

function createWindow() {
    ensureAppDirectories();

    const iconPath = path.join(__dirname, 'assets/images/icon-web.png');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 820,
        minWidth: 860,
        minHeight: 620,
        title: '词迹',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false // 允许本地 file:// 协议与跨域 CDN 资源无障碍通讯
        }
    });

    mainWindow.loadFile('index.html');

    // 外部链接在默认浏览器打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    setupAutoUpdater(mainWindow);
}

// ----------------------------------------------------
// 自动更新逻辑配置 (对接 GitHub Releases)
// ----------------------------------------------------
function setupAutoUpdater(win) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    const notifyRenderer = (status, payload = {}) => {
        if (win && !win.isDestroyed()) {
            win.webContents.send('updater-message', { status, ...payload });
        }
    };

    autoUpdater.on('checking-for-update', () => {
        notifyRenderer('checking');
    });

    autoUpdater.on('update-available', (info) => {
        notifyRenderer('available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes || '性能优化与体验升级'
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        notifyRenderer('not-available', {
            version: info ? info.version : app.getVersion()
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater Error]', err);
        notifyRenderer('error', {
            message: err == null ? '未知错误' : (err.message || String(err))
        });
    });

    autoUpdater.on('download-progress', (progressObj) => {
        notifyRenderer('downloading', {
            percent: Math.floor(progressObj.percent || 0),
            bytesPerSecond: progressObj.bytesPerSecond || 0,
            transferred: progressObj.transferred || 0,
            total: progressObj.total || 0
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        notifyRenderer('downloaded', {
            version: info.version
        });
    });
}

// ----------------------------------------------------
// IPC 通信事件处理
// ----------------------------------------------------

// 1. 系统与基础信息
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);

// 2. 专属词书文件夹
ipcMain.handle('open-books-folder', async () => {
    ensureAppDirectories();
    await shell.openPath(booksDir);
    return { success: true, path: booksDir };
});

ipcMain.handle('get-books-folder-path', () => {
    ensureAppDirectories();
    return booksDir;
});

ipcMain.handle('save-book-to-folder', async (_event, { fileName, jsonString }) => {
    try {
        ensureAppDirectories();
        if (!fileName || !jsonString) throw new Error('文件名或内容为空');

        let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
        if (!cleanName.endsWith('.json')) cleanName += '.json';

        const targetFile = path.join(booksDir, cleanName);
        fs.writeFileSync(targetFile, jsonString, 'utf8');

        return { success: true, filePath: targetFile, fileName: cleanName };
    } catch (err) {
        console.error('[IPC save-book-to-folder error]:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('scan-books-folder', async () => {
    try {
        ensureAppDirectories();
        const files = fs.readdirSync(booksDir);
        const books = [];

        for (const file of files) {
            if (file.toLowerCase().endsWith('.json') && file !== 'books-index.json') {
                const fullPath = path.join(booksDir, file);
                try {
                    const stat = fs.statSync(fullPath);
                    const content = fs.readFileSync(fullPath, 'utf8');
                    let data = JSON.parse(content);
                    let words = [];
                    let category = '本地';

                    if (Array.isArray(data)) {
                        words = data;
                    } else if (data && Array.isArray(data.words)) {
                        words = data.words;
                        if (data.category) category = data.category;
                    }

                    const bookName = file.replace(/\.json$/i, '');
                    books.push({
                        id: 'local_disk_' + Buffer.from(file).toString('hex').slice(0, 16),
                        name: bookName,
                        rawName: bookName,
                        category: category,
                        path: fullPath,
                        count: words.length,
                        words: words,
                        size: stat.size,
                        updatedAt: Math.round(stat.mtimeMs),
                        isDiskBook: true,
                        isCloud: false,
                        syncStatus: 'downloaded'
                    });
                } catch (e) {
                    console.warn(`[scan-books-folder] 解析词书文件 ${file} 失败:`, e.message);
                }
            }
        }

        return { success: true, books };
    } catch (err) {
        console.error('[IPC scan-books-folder error]:', err);
        return { success: false, error: err.message, books: [] };
    }
});

// 3. 本地用户数据备份
ipcMain.handle('open-backups-folder', async () => {
    ensureAppDirectories();
    await shell.openPath(backupsDir);
    return { success: true, path: backupsDir };
});

ipcMain.handle('get-backups-folder-path', () => {
    ensureAppDirectories();
    return backupsDir;
});

ipcMain.handle('save-local-backup', async (_event, { backupObj, username, isAuto }) => {
    try {
        ensureAppDirectories();
        if (!backupObj) throw new Error('备份数据为空');

        const now = new Date();
        const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const safeUser = (username || backupObj.user || 'user').replace(/[\\/:*?"<>|]/g, '');

        const fileName = isAuto
            ? `auto_backup_${safeUser}_${timeStr}.json`
            : `backup_${safeUser}_${timeStr}.json`;

        const filePath = path.join(backupsDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(backupObj, null, 2), 'utf8');

        // 如果是自动备份，保留最近 15 份自动备份，清理更早的自动备份
        if (isAuto) {
            try {
                const allFiles = fs.readdirSync(backupsDir);
                const autoFiles = allFiles
                    .filter(f => f.startsWith('auto_backup_') && f.endsWith('.json'))
                    .map(f => ({ name: f, path: path.join(backupsDir, f), time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
                    .sort((a, b) => b.time - a.time);

                if (autoFiles.length > 15) {
                    for (let i = 15; i < autoFiles.length; i++) {
                        fs.unlinkSync(autoFiles[i].path);
                    }
                }
            } catch (cleanErr) {
                console.warn('清理过期自动备份失败:', cleanErr);
            }
        }

        return { success: true, filePath, fileName };
    } catch (err) {
        console.error('[IPC save-local-backup error]:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('list-local-backups', async () => {
    try {
        ensureAppDirectories();
        const files = fs.readdirSync(backupsDir);
        const list = [];

        for (const file of files) {
            if (file.toLowerCase().endsWith('.json')) {
                const fullPath = path.join(backupsDir, file);
                try {
                    const stat = fs.statSync(fullPath);
                    list.push({
                        fileName: file,
                        filePath: fullPath,
                        size: stat.size,
                        createdAt: Math.round(stat.birthtimeMs || stat.mtimeMs),
                        isAuto: file.startsWith('auto_backup_')
                    });
                } catch (e) {}
            }
        }

        // 按创建时间倒序排列
        list.sort((a, b) => b.createdAt - a.createdAt);
        return { success: true, backups: list };
    } catch (err) {
        return { success: false, error: err.message, backups: [] };
    }
});

ipcMain.handle('read-local-backup', async (_event, fileName) => {
    try {
        ensureAppDirectories();
        const safeName = path.basename(fileName);
        const targetPath = path.join(backupsDir, safeName);
        if (!fs.existsSync(targetPath)) throw new Error('备份文件不存在');

        const content = fs.readFileSync(targetPath, 'utf8');
        const parsed = JSON.parse(content);
        return { success: true, data: parsed };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// 4. 自动更新触发
ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
        // 开发模式下模拟或提醒
        console.log('[AutoUpdater] 开发模式下触发检查更新');
        return { success: true, isDev: true, message: '当前处于开发模式，已配置 GitHub Releases 更新源' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result ? result.updateInfo : null };
    } catch (err) {
        console.error('[Check for updates error]:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('start-download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

// ----------------------------------------------------
// 应用生命周期事件
// ----------------------------------------------------
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

