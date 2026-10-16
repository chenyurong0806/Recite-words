const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

// 路径与目录配置
const userDataPath = app.getPath('userData');
const booksDir = path.join(userDataPath, 'books');
const cloudBooksDir = path.join(booksDir, 'cloud_books');
const localBooksDir = path.join(booksDir, 'local_books');
const backupsDir = path.join(userDataPath, 'backups');

// 确保专属词书文件夹与备份文件夹存在，以及云端词书和本地词书子文件夹
function ensureAppDirectories() {
    if (!fs.existsSync(booksDir)) {
        fs.mkdirSync(booksDir, { recursive: true });
    }
    if (!fs.existsSync(cloudBooksDir)) {
        fs.mkdirSync(cloudBooksDir, { recursive: true });
    }
    if (!fs.existsSync(localBooksDir)) {
        fs.mkdirSync(localBooksDir, { recursive: true });
    }
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }

    // 迁移旧版直接存放在 booksDir 根目录下的词书到 local_books
    try {
        const rootEntries = fs.readdirSync(booksDir);
        for (const entry of rootEntries) {
            if (entry === 'cloud_books' || entry === 'local_books' || entry.endsWith('.txt')) continue;
            const fullEntryPath = path.join(booksDir, entry);
            const stat = fs.statSync(fullEntryPath);
            if (stat.isFile() && entry.toLowerCase().endsWith('.json') && entry !== 'books-index.json') {
                const targetLocalPath = path.join(localBooksDir, entry);
                if (!fs.existsSync(targetLocalPath)) {
                    fs.renameSync(fullEntryPath, targetLocalPath);
                }
            }
        }
    } catch (migErr) {
        console.warn('[ensureAppDirectories] 迁移根目录词书失败:', migErr);
    }

    const readmePath = path.join(booksDir, '词书存放说明.txt');
    if (!fs.existsSync(readmePath)) {
        const readmeContent = [
            '【词迹 - 本地词书专属存放目录】',
            '==================================================',
            '1. local_books 文件夹：用于存放用户本地导入或自建的词书。',
            '2. cloud_books 文件夹：用于存放从云端下载的词书，按分类子文件夹组织。',
            '3. 应用启动时或在“管理词书”中点击“刷新”会自动识别并分类加载。',
            '4. 词书格式要求为 JSON 数组，例如：',
            '   [',
            '     { "word": "example", "trans": ["n. 例子，范例"] }',
            '   ]',
            '=================================================='
        ].join('\r\n');
        fs.writeFileSync(readmePath, readmeContent, 'utf8');
    }
}

let mainWindow = null;

function createWindow() {
    ensureAppDirectories();

    const icoPath = path.join(__dirname, 'assets/images/icon.ico');
    const pngPath = path.join(__dirname, 'assets/images/icon-web.png');
    const appIcon = (process.platform === 'win32' && fs.existsSync(icoPath))
        ? icoPath
        : (fs.existsSync(pngPath) ? pngPath : undefined);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 820,
        title: '词迹',
        icon: appIcon,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false // 允许本地 file:// 协议与跨域 CDN 资源无障碍通讯
        }
    });

    // 拦截 Chromium 原生下载请求，防止连续点击多次触发弹窗循环卡死
    let isChromiumDownloading = false;
    mainWindow.webContents.session.on('will-download', (event, item) => {
        if (isChromiumDownloading) {
            event.preventDefault();
            return;
        }
        isChromiumDownloading = true;
        item.once('done', () => {
            setTimeout(() => { isChromiumDownloading = false; }, 1000);
        });
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

    // 监听专属词书目录变动 (用户在文件资源管理器中新建/移动/删除/重命名文件或文件夹时立刻自动通知前端刷新)
    try {
        let debounceTimer = null;
        const notifyBooksChanged = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('local-books-changed');
                }
            }, 60);
        };
        fs.watch(booksDir, { recursive: true }, notifyBooksChanged);
    } catch (watchErr) {
        console.warn('[fs.watch booksDir]', watchErr);
        try {
            fs.watch(localBooksDir, { recursive: true }, () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('local-books-changed');
                }
            });
        } catch (e) {
            console.warn('[fs.watch localBooksDir]', e);
        }
    }
}

// ----------------------------------------------------
// 自动更新逻辑配置 (对接 GitHub Releases)
// ----------------------------------------------------
function setupAutoUpdater(win) {
    autoUpdater.autoDownload = true; // 自动获取最新安装包
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
        // 自动开始下载更新
        try {
            autoUpdater.downloadUpdate();
        } catch (e) {
            console.warn('[AutoUpdater] auto downloadUpdate error:', e);
        }
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
        // 检测到新版本并下载完成后，自动启动更新安装程序
        console.log('[AutoUpdater] 新版本下载完成，即将自动启动更新安装程序...');
        setTimeout(() => {
            try {
                autoUpdater.quitAndInstall(false, true);
            } catch (err) {
                console.error('[AutoUpdater] quitAndInstall error:', err);
            }
        }, 1500);
    });
}

// ----------------------------------------------------
// IPC 通信事件处理
// ----------------------------------------------------

// 1. 系统与基础信息
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('is-network-online', async () => {
    try {
        const dns = require('dns').promises;
        await Promise.any([
            dns.lookup('baidu.com'),
            dns.lookup('qq.com'),
            dns.lookup('bilibili.com')
        ]);
        return true;
    } catch (e) {
        return false;
    }
});

// 2. 专属词书文件夹
ipcMain.handle('open-books-folder', async (_event, subfolder = '') => {
    ensureAppDirectories();
    let targetDir = localBooksDir;
    if (subfolder === 'cloud') targetDir = cloudBooksDir;
    else if (subfolder === 'books_root') targetDir = booksDir;
    await shell.openPath(targetDir);
    return { success: true, path: targetDir };
});

ipcMain.handle('get-books-folder-path', () => {
    ensureAppDirectories();
    return {
        booksDir,
        cloudBooksDir,
        localBooksDir
    };
});

// 保存云端下载词书到 cloud_books 目录并按文件夹分类
ipcMain.handle('save-cloud-book', async (_event, { category, fileName, jsonString }) => {
    try {
        ensureAppDirectories();
        if (!fileName || !jsonString) throw new Error('文件名或内容为空');

        const cat = (category || '其他').replace(/[\\/:*?"<>|]/g, '').trim() || '其他';
        const targetCategoryDir = path.join(cloudBooksDir, cat);
        if (!fs.existsSync(targetCategoryDir)) {
            fs.mkdirSync(targetCategoryDir, { recursive: true });
        }

        let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
        if (!cleanName.endsWith('.json')) cleanName += '.json';

        const targetFile = path.join(targetCategoryDir, cleanName);
        fs.writeFileSync(targetFile, jsonString, 'utf8');

        return { success: true, filePath: targetFile, fileName: cleanName, category: cat };
    } catch (err) {
        console.error('[IPC save-cloud-book error]:', err);
        return { success: false, error: err.message };
    }
});

// 保存本地导入或自建词书到 local_books 目录
ipcMain.handle('save-local-book', async (_event, { folder, fileName, jsonString }) => {
    try {
        ensureAppDirectories();
        if (!fileName || !jsonString) throw new Error('文件名或内容为空');

        let targetDir = localBooksDir;
        if (folder) {
            const cleanFolder = folder.replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
            if (cleanFolder) {
                targetDir = path.join(localBooksDir, ...cleanFolder.split('/'));
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
            }
        }

        let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
        if (!cleanName.endsWith('.json')) cleanName += '.json';

        const targetFile = path.join(targetDir, cleanName);
        fs.writeFileSync(targetFile, jsonString, 'utf8');

        return { success: true, filePath: targetFile, fileName: cleanName };
    } catch (err) {
        console.error('[IPC save-local-book error]:', err);
        return { success: false, error: err.message };
    }
});

// 兼容旧接口 save-book-to-folder
ipcMain.handle('save-book-to-folder', async (_event, { fileName, jsonString }) => {
    try {
        ensureAppDirectories();
        if (!fileName || !jsonString) throw new Error('文件名或内容为空');

        let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
        if (!cleanName.endsWith('.json')) cleanName += '.json';

        const targetFile = path.join(localBooksDir, cleanName);
        fs.writeFileSync(targetFile, jsonString, 'utf8');

        return { success: true, filePath: targetFile, fileName: cleanName };
    } catch (err) {
        console.error('[IPC save-book-to-folder error]:', err);
        return { success: false, error: err.message };
    }
});

// 递归扫描目录读取 .json 词书文件
// 将用户直接存放在 books 根目录的松散 json 词书自动整理/同步至 local_books 目录
function migrateLooseBooksFromRootDir() {
    try {
        if (!fs.existsSync(booksDir)) return;
        const entries = fs.readdirSync(booksDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.json') && entry.name !== 'books-index.json') {
                const srcPath = path.join(booksDir, entry.name);
                const destPath = path.join(localBooksDir, entry.name);
                try {
                    if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(srcPath, destPath);
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

function scanDirForBooks(baseDir, isCloud = false) {
    if (!fs.existsSync(baseDir)) return [];
    const books = [];

    function walk(currentDir, currentCategory) {
        let entries = [];
        try {
            entries = fs.readdirSync(currentDir, { withFileTypes: true });
        } catch (e) {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.')) continue;
                const subCategory = currentCategory ? `${currentCategory}/${entry.name}` : entry.name;
                walk(fullPath, subCategory);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json') && entry.name !== 'books-index.json') {
                try {
                    const stat = fs.statSync(fullPath);
                    let content = fs.readFileSync(fullPath, 'utf8');
                    // 移除 UTF-8 BOM，防止 JSON.parse 崩溃
                    if (content.charCodeAt(0) === 0xFEFF) {
                        content = content.slice(1);
                    }
                    let data = JSON.parse(content);
                    let words = [];

                    if (Array.isArray(data)) {
                        words = data;
                    } else if (data && typeof data === 'object') {
                        if (Array.isArray(data.words)) words = data.words;
                        else if (Array.isArray(data.list)) words = data.list;
                        else if (Array.isArray(data.items)) words = data.items;
                        else if (Array.isArray(data.data)) words = data.data;
                        else {
                            // 键值对词典结构 { "abandon": "放弃", ... }
                            words = Object.keys(data).map(k => ({ word: k, trans: data[k] }));
                        }
                    }

                    // 分类逻辑：如果在子文件夹中，以当前相对路径作为分类（支持嵌套文件夹）；如果在根目录无文件夹，则归入“未分类”
                    let category = currentCategory ? currentCategory.replace(/\\/g, '/') : (isCloud ? '云端' : '未分类');

                    const bookName = entry.name.replace(/\.json$/i, '');
                    const relKey = (currentCategory ? `${currentCategory}/${entry.name}` : entry.name).toLowerCase();
                    const bookHash = crypto.createHash('md5').update(relKey).digest('hex').slice(0, 16);
                    books.push({
                        id: (isCloud ? 'cloud_disk_' : 'local_disk_') + bookHash,
                        name: bookName,
                        rawName: bookName,
                        category: category,
                        path: fullPath,
                        count: words.length,
                        words: words,
                        size: stat.size,
                        updatedAt: Math.round(stat.mtimeMs),
                        isDiskBook: true,
                        isCloud: isCloud,
                        syncStatus: 'downloaded'
                    });
                } catch (e) {
                    console.warn(`[scanDirForBooks] 解析词书文件 ${entry.name} 失败:`, e.message);
                }
            }
        }
    }

    walk(baseDir, '');
    return books;
}

// 扫描所有本地专属词书目录 (离线模式下同样读取 cloud_books 本地已下载文件，以及 local_books)
ipcMain.handle('scan-books-folder', async (_event, options = {}) => {
    try {
        ensureAppDirectories();
        migrateLooseBooksFromRootDir();
        const isOffline = !!(options && options.isOffline);
        const cloudBooks = scanDirForBooks(cloudBooksDir, true);
        const localBooks = scanDirForBooks(localBooksDir, false);

        // 直接读取 local_books 下的所有物理子文件夹作为分类（递归识别所有嵌套文件夹）
        let localFolders = [];
        try {
            if (fs.existsSync(localBooksDir)) {
                const getDirsRecursive = (dir, prefix = '') => {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    let res = [];
                    for (const e of entries) {
                        if (e.isDirectory() && !e.name.startsWith('.')) {
                            const rel = prefix ? `${prefix}/${e.name}` : e.name;
                            res.push(rel.replace(/\\/g, '/'));
                            res = res.concat(getDirsRecursive(path.join(dir, e.name), rel));
                        }
                    }
                    return res;
                };
                localFolders = getDirsRecursive(localBooksDir);
            }
        } catch (fErr) {
            console.warn('[scan-books-folder] 读取文件夹失败:', fErr);
        }

        // 统一合并
        const books = [...cloudBooks, ...localBooks];
        return { success: true, books, cloudBooks, localBooks, folders: localFolders, isOffline };
    } catch (err) {
        console.error('[IPC scan-books-folder error]:', err);
        return { success: false, error: err.message, books: [], cloudBooks: [], localBooks: [], folders: [] };
    }
});

// 新建本地分类文件夹
ipcMain.handle('create-local-category', async (_event, { categoryName }) => {
    try {
        ensureAppDirectories();
        if (!categoryName || typeof categoryName !== 'string') throw new Error('分类名称不能为空');
        const cleanName = categoryName.replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (!cleanName) throw new Error('分类名称包含非法字符');
        const reserved = ['全部', '未分类', '云端', '本地', '我的', 'Doris', 'cloud_books', 'local_books'];
        if (reserved.includes(cleanName)) throw new Error(`「${cleanName}」为系统保留分类，无法创建`);
        const targetDir = path.join(localBooksDir, ...cleanName.split('/'));
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return { success: true, folderName: cleanName };
    } catch (err) {
        console.error('[IPC create-local-category error]:', err);
        return { success: false, error: err.message };
    }
});

// 重命名本地分类文件夹
ipcMain.handle('rename-local-category', async (_event, { oldName, newName }) => {
    try {
        ensureAppDirectories();
        if (!oldName || !newName) throw new Error('旧分类名称或新分类名称不能为空');
        const cleanOld = oldName.replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
        const cleanNew = newName.replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (!cleanOld || !cleanNew) throw new Error('分类名称包含非法字符');
        const reserved = ['全部', '未分类', '云端', '本地', '我的', 'Doris', 'cloud_books', 'local_books'];
        if (reserved.includes(cleanNew)) throw new Error(`「${cleanNew}」为系统保留分类`);
        const oldDir = path.join(localBooksDir, ...cleanOld.split('/'));
        const newDir = path.join(localBooksDir, ...cleanNew.split('/'));
        if (!fs.existsSync(oldDir)) throw new Error(`分类「${cleanOld}」不存在`);
        if (fs.existsSync(newDir)) throw new Error(`分类「${cleanNew}」已存在`);
        const parentNew = path.dirname(newDir);
        if (!fs.existsSync(parentNew)) {
            fs.mkdirSync(parentNew, { recursive: true });
        }
        fs.renameSync(oldDir, newDir);
        return { success: true, oldName: cleanOld, newName: cleanNew };
    } catch (err) {
        console.error('[IPC rename-local-category error]:', err);
        return { success: false, error: err.message };
    }
});

// 删除本地分类文件夹 (默认将其中的词书移入根目录未分类)
ipcMain.handle('delete-local-category', async (_event, { categoryName, deleteFiles = false }) => {
    try {
        ensureAppDirectories();
        if (!categoryName) throw new Error('分类名称不能为空');
        const cleanName = categoryName.replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
        const targetDir = path.join(localBooksDir, ...cleanName.split('/'));
        if (!fs.existsSync(targetDir)) {
            return { success: true };
        }
        if (!deleteFiles) {
            const moveAllJsonToRoot = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        moveAllJsonToRoot(full);
                    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                        let dest = path.join(localBooksDir, entry.name);
                        if (fs.existsSync(dest)) {
                            dest = path.join(localBooksDir, `${path.parse(entry.name).name}_${Date.now()}.json`);
                        }
                        try {
                            fs.renameSync(full, dest);
                        } catch (mErr) {
                            console.warn('[delete-local-category] 移动文件失败:', mErr);
                        }
                    }
                }
            };
            moveAllJsonToRoot(targetDir);
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
        return { success: true, categoryName: cleanName };
    } catch (err) {
        console.error('[IPC delete-local-category error]:', err);
        return { success: false, error: err.message };
    }
});

// 移动本地词书到指定分类文件夹
ipcMain.handle('move-book-file', async (_event, { bookId, filePath, fileName, targetCategory }) => {
    try {
        ensureAppDirectories();
        let sourcePath = filePath;
        if (!sourcePath && fileName) {
            let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
            if (!cleanName.endsWith('.json')) cleanName += '.json';
            const findInDir = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const e of entries) {
                    const full = path.join(dir, e.name);
                    if (e.isDirectory() && !e.name.startsWith('.')) {
                        const found = findInDir(full);
                        if (found) return found;
                    } else if (e.isFile() && e.name.toLowerCase() === cleanName.toLowerCase()) {
                        return full;
                    }
                }
                return null;
            };
            sourcePath = findInDir(localBooksDir) || findInDir(cloudBooksDir);
        }

        if (!sourcePath || !fs.existsSync(sourcePath)) {
            throw new Error('未找到要移动的词书文件');
        }

        const resolvedSource = path.resolve(sourcePath);
        const isInLocal = resolvedSource.startsWith(path.resolve(localBooksDir));
        const isInCloud = resolvedSource.startsWith(path.resolve(cloudBooksDir));
        if (!isInLocal && !isInCloud) {
            throw new Error('只能移动本地或已下载词书');
        }

        const baseFileName = path.basename(resolvedSource);
        let targetDir = localBooksDir;
        const cleanCat = (targetCategory || '').replace(/[\\:*?"<>|]/g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
        if (cleanCat && cleanCat !== '未分类' && cleanCat !== '全部') {
            targetDir = path.join(localBooksDir, ...cleanCat.split('/'));
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }

        let targetPath = path.join(targetDir, baseFileName);
        if (path.resolve(targetPath) === resolvedSource) {
            return { success: true, oldPath: resolvedSource, newPath: targetPath, newCategory: cleanCat || '未分类' };
        }

        if (fs.existsSync(targetPath)) {
            const ext = path.extname(baseFileName);
            const base = path.basename(baseFileName, ext);
            targetPath = path.join(targetDir, `${base}_${Date.now()}${ext}`);
        }

        try {
            fs.renameSync(resolvedSource, targetPath);
        } catch (renameErr) {
            fs.copyFileSync(resolvedSource, targetPath);
            fs.unlinkSync(resolvedSource);
        }
        return {
            success: true,
            oldPath: resolvedSource,
            newPath: targetPath,
            fileName: path.basename(targetPath),
            newCategory: cleanCat || '未分类'
        };
    } catch (err) {
        console.error('[IPC move-book-file error]:', err);
        return { success: false, error: err.message };
    }
});

// 删除指定词书文件
ipcMain.handle('delete-book-file', async (_event, { filePath, fileName, isCloud, category }) => {
    try {
        ensureAppDirectories();
        let targetPath = filePath;

        if (!targetPath && fileName) {
            let cleanName = fileName.replace(/[\\/:*?"<>|]/g, '').trim();
            if (!cleanName.endsWith('.json')) cleanName += '.json';
            if (isCloud) {
                targetPath = path.join(cloudBooksDir, category || '其他', cleanName);
            } else {
                targetPath = path.join(localBooksDir, cleanName);
            }
        }

        if (!targetPath) throw new Error('未提供有效的文件路径');

        // 安全检查：防止删除 booksDir 以外的文件
        const resolvedPath = path.resolve(targetPath);
        if (!resolvedPath.startsWith(path.resolve(booksDir))) {
            throw new Error('非法的文件删除路径');
        }

        if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
        }

        return { success: true, filePath: resolvedPath };
    } catch (err) {
        console.error('[IPC delete-book-file error]:', err);
        return { success: false, error: err.message };
    }
});

// 读取本地词书文件内容
ipcMain.handle('read-book-file', async (_event, { filePath }) => {
    try {
        if (!filePath || !fs.existsSync(filePath)) throw new Error('词书文件不存在');
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let words = [];
        if (Array.isArray(data)) words = data;
        else if (data && Array.isArray(data.words)) words = data.words;
        return { success: true, words };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// 保存并调用系统工具直接打开导出文件（PDF、Markdown、TXT）
ipcMain.handle('save-and-open-export-file', async (_event, { fileName, content, format, htmlContent, printOptions }) => {
    try {
        const downloadsDir = app.getPath('downloads');
        const safeName = (fileName || `export_${Date.now()}`).replace(/[/\\?%*:|"<>]/g, '_');
        const targetPath = path.join(downloadsDir, safeName);

        if (format === 'pdf') {
            const printWin = new BrowserWindow({
                show: false,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent || '')}`);
            const pdfBuffer = await printWin.webContents.printToPDF({
                pageSize: printOptions?.pageSize || 'A4',
                printBackground: true
            });
            try { printWin.destroy(); } catch (e) { }
            await fs.promises.writeFile(targetPath, pdfBuffer);
        } else {
            await fs.promises.writeFile(targetPath, content || '', 'utf8');
        }

        await shell.openPath(targetPath);
        return { success: true, filePath: targetPath };
    } catch (err) {
        console.error('[IPC save-and-open-export-file error]:', err);
        return { success: false, error: err.message };
    }
});

// 保存海报图片 (原生安全写入，解决连续点击循环打开文件资源管理器卡死)
let isPosterSavingDialog = false;
ipcMain.handle('save-poster-image', async (_event, { base64Data, filename }) => {
    if (isPosterSavingDialog) {
        return { success: false, error: '正在保存中，请勿重复操作' };
    }
    isPosterSavingDialog = true;
    try {
        const { dialog } = require('electron');
        const parts = (base64Data || '').split(';base64,');
        const buffer = Buffer.from(parts[1] || parts[0], 'base64');
        const defaultName = filename || `词迹海报_${Date.now()}.png`;

        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: '保存海报图片',
            defaultPath: path.join(app.getPath('pictures') || app.getPath('downloads'), defaultName),
            filters: [{ name: 'PNG 图片', extensions: ['png'] }]
        });

        if (canceled || !filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(filePath, buffer);
        return { success: true, filePath };
    } catch (err) {
        console.error('[IPC save-poster-image error]:', err);
        return { success: false, error: err.message };
    } finally {
        setTimeout(() => { isPosterSavingDialog = false; }, 1000);
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

