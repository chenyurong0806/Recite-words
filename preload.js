const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    // 应用信息
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    isNetworkOnline: () => ipcRenderer.invoke('is-network-online'),

    // 词书目录相关 (用户本地专属词书存放文件夹)
    openBooksFolder: (subfolder = '') => ipcRenderer.invoke('open-books-folder', subfolder),
    getBooksFolderPath: () => ipcRenderer.invoke('get-books-folder-path'),
    saveBookToFolder: (fileName, jsonString) => ipcRenderer.invoke('save-book-to-folder', { fileName, jsonString }),
    saveCloudBook: (category, fileName, jsonString) => ipcRenderer.invoke('save-cloud-book', { category, fileName, jsonString }),
    saveLocalBook: (folder, fileName, jsonString) => ipcRenderer.invoke('save-local-book', { folder, fileName, jsonString }),
    deleteBookFile: (params) => ipcRenderer.invoke('delete-book-file', params),
    readBookFile: (filePath) => ipcRenderer.invoke('read-book-file', { filePath }),
    scanBooksFolder: (options = {}) => ipcRenderer.invoke('scan-books-folder', options),
    createLocalCategory: (categoryName) => ipcRenderer.invoke('create-local-category', { categoryName }),
    renameLocalCategory: (oldName, newName) => ipcRenderer.invoke('rename-local-category', { oldName, newName }),
    deleteLocalCategory: (categoryName, deleteFiles = false) => ipcRenderer.invoke('delete-local-category', { categoryName, deleteFiles }),
    moveBookFile: (params) => ipcRenderer.invoke('move-book-file', params),
    savePosterImage: (base64Data, filename) => ipcRenderer.invoke('save-poster-image', { base64Data, filename }),

    // 本地数据备份相关
    openBackupsFolder: () => ipcRenderer.invoke('open-backups-folder'),
    getBackupsFolderPath: () => ipcRenderer.invoke('get-backups-folder-path'),
    saveLocalBackup: (backupObj, username, isAuto = false) => ipcRenderer.invoke('save-local-backup', { backupObj, username, isAuto }),
    listLocalBackups: () => ipcRenderer.invoke('list-local-backups'),
    readLocalBackup: (fileName) => ipcRenderer.invoke('read-local-backup', fileName),

    // 自动更新相关 (对接 GitHub Releases)
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdateMessage: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('updater-message', handler);
        return () => {
            ipcRenderer.removeListener('updater-message', handler);
        };
    },
    onLocalBooksChanged: (callback) => {
        const handler = () => callback();
        ipcRenderer.on('local-books-changed', handler);
        return () => {
            ipcRenderer.removeListener('local-books-changed', handler);
        };
    }
});

