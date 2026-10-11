const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    // 应用信息
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),

    // 词书目录相关 (用户本地专属词书存放文件夹)
    openBooksFolder: () => ipcRenderer.invoke('open-books-folder'),
    getBooksFolderPath: () => ipcRenderer.invoke('get-books-folder-path'),
    saveBookToFolder: (fileName, jsonString) => ipcRenderer.invoke('save-book-to-folder', { fileName, jsonString }),
    scanBooksFolder: () => ipcRenderer.invoke('scan-books-folder'),

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
    }
});

