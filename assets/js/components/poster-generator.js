/**
 * 词迹 - 极简艺术风格海报生成与分享组件 (全平台适配 / Toy平台增强)
 * Module: assets/js/components/poster-generator.js
 */

(function () {
    let currentPosterBase64 = '';

    /* ==========================================================================
       环境判断与 Toy 能力封装
       ========================================================================== */
    let _cachedIsBiliApp = null;

    async function checkIsBilibiliApp() {
        if (_cachedIsBiliApp !== null) return _cachedIsBiliApp;
        if (typeof window !== 'undefined' && window.toy && typeof window.toy.isSupport === 'function') {
            try {
                const hasAlbum = await window.toy.isSupport('saveImageToAlbum');
                const hasShare = await window.toy.isSupport('share');
                if (hasAlbum || hasShare) {
                    _cachedIsBiliApp = true;
                    return true;
                }
            } catch (e) { }
        }
        if (typeof navigator !== 'undefined' && navigator.userAgent) {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('biliapp') || (ua.includes('bili') && typeof window !== 'undefined' && Boolean(window.toy))) {
                _cachedIsBiliApp = true;
                return true;
            }
        }
        _cachedIsBiliApp = false;
        return false;
    }

    function isBilibiliAppSync() {
        if (_cachedIsBiliApp !== null) return _cachedIsBiliApp;
        if (typeof navigator !== 'undefined' && navigator.userAgent) {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('biliapp') || (ua.includes('bili') && typeof window !== 'undefined' && Boolean(window.toy))) {
                return true;
            }
        }
        return false;
    }

    function isToyPlatform() {
        if (typeof window !== 'undefined' && typeof window.isToyPlatform === 'function' && window.isToyPlatform !== isToyPlatform) {
            try { return Boolean(window.isToyPlatform()); } catch (e) { }
        }
        return (typeof isBilibiliToy !== 'undefined' && Boolean(isBilibiliToy)) ||
            (typeof window !== 'undefined' && Boolean(window.toy));
    }

    /* ==========================================================================
       图片资源预加载与 localStorage 持久缓存 (彻底解决 CORS / 404 / 连续生成失败)
       ========================================================================== */
    const _POSTER_BG_STORAGE_KEY = 'poster_bg_cached_base64';
    const APP_ICON_URL = './assets/images/icon-web.png';

    let _cachedBgImage = null;
    let _bgPreloadPromise = null;
    let _cachedAppIcon = null;
    let _appIconPreloadPromise = null;
    let _cachedToyQrData = null;
    let _cachedToyQrImg = null;

    // 换背景按钮 6 秒冷却控制
    let _lastBgChangeTime = 0;
    const _BG_CHANGE_CD_MS = 6000;

    // 当前海报使用的 generate 函数与 options，用于换背景后重新生成
    let _currentPosterGenerator = null;
    let _currentPosterOptions = null;
    let _currentPosterTitle = '';

    /**
     * 异步加载单张图片（带超时与跨域保护）
     */
    function loadImageAsync(src, timeoutMs = 2000) {
        return new Promise((resolve) => {
            if (!src || typeof src !== 'string') return resolve(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            let timer = null;
            let finished = false;

            const cleanup = () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                img.onload = null;
                img.onerror = null;
            };

            img.onload = () => {
                if (!finished) {
                    finished = true;
                    cleanup();
                    resolve(img);
                }
            };

            img.onerror = () => {
                if (!finished) {
                    finished = true;
                    cleanup();
                    resolve(null);
                }
            };

            timer = setTimeout(() => {
                if (!finished) {
                    finished = true;
                    cleanup();
                    resolve(null);
                }
            }, timeoutMs);

            try {
                img.src = src;
            } catch (e) {
                if (!finished) {
                    finished = true;
                    cleanup();
                    resolve(null);
                }
            }
        });
    }

    /**
     * 将 Image 对象转为 base64 字符串 (用于 localStorage 持久缓存)
     */
    function imageToBase64(img) {
        try {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            const cx = c.getContext('2d');
            cx.drawImage(img, 0, 0);
            return c.toDataURL('image/jpeg', 0.85);
        } catch (e) {
            return '';
        }
    }

    /**
     * 从 localStorage 读取已缓存的背景图
     */
    function loadBgFromLocalStorage() {
        try {
            const b64 = localStorage.getItem(_POSTER_BG_STORAGE_KEY);
            if (b64 && b64.startsWith('data:')) {
                return loadImageAsync(b64, 500);
            }
        } catch (e) { }
        return Promise.resolve(null);
    }

    /**
     * 将 Image 对象写入 localStorage 持久缓存
     */
    function saveBgToLocalStorage(img) {
        try {
            const b64 = imageToBase64(img);
            if (b64 && b64.length < 2 * 1024 * 1024) {
                localStorage.setItem(_POSTER_BG_STORAGE_KEY, b64);
            }
        } catch (e) { }
    }

    /**
     * 预加载 App 实际本地图标
     */
    function preloadAppIcon() {
        if (_cachedAppIcon) return Promise.resolve(_cachedAppIcon);
        if (_appIconPreloadPromise) return _appIconPreloadPromise;

        _appIconPreloadPromise = loadImageAsync(APP_ICON_URL, 2000).then((img) => {
            if (img) _cachedAppIcon = img;
            _appIconPreloadPromise = null;
            return img;
        });
        return _appIconPreloadPromise;
    }

    /**
     * 从远程 API 获取一张新的风景背景图 (双线 CORS 代理)
     */
    function fetchRemoteBgImage() {
        const seed = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        const url1 = `https://wsrv.nl/?url=imgapi.cn/api.php?zd=mobile%26fl=fengjing%26gs=images%26t=${seed}`;
        const url2 = `https://images.weserv.nl/?url=imgapi.cn/api.php?zd=mobile%26fl=fengjing%26gs=images%26t=${seed}`;
        return (async () => {
            let img = await loadImageAsync(url1, 4000);
            if (!img) {
                img = await loadImageAsync(url2, 4000);
            }
            return img;
        })();
    }

    /**
     * 预加载海报背景图：优先使用内存缓存 → localStorage 缓存 → 渐变兜底
     * 不再每次强制请求远程 API，彻底消除 404 和加载延迟
     */
    function preloadBackgroundImage() {
        if (_cachedBgImage) return Promise.resolve(_cachedBgImage);
        if (_bgPreloadPromise) return _bgPreloadPromise;

        _bgPreloadPromise = (async () => {
            // 1. 尝试从 localStorage 读取
            let img = await loadBgFromLocalStorage();
            if (img) {
                _cachedBgImage = img;
                _bgPreloadPromise = null;
                _silentRefreshBg();
                return img;
            }
            // 2. 首次使用：尝试远程获取
            img = await fetchRemoteBgImage();
            if (img) {
                _cachedBgImage = img;
                saveBgToLocalStorage(img);
            }
            _bgPreloadPromise = null;
            return img;
        })();

        return _bgPreloadPromise;
    }

    /**
     * 后台静默刷新一张新图写入 localStorage（不影响当前海报）
     */
    function _silentRefreshBg() {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => {
                fetchRemoteBgImage().then(img => {
                    if (img) saveBgToLocalStorage(img);
                });
            });
        } else {
            setTimeout(() => {
                fetchRemoteBgImage().then(img => {
                    if (img) saveBgToLocalStorage(img);
                });
            }, 2000);
        }
    }

    /**
     * 换背景：从远程获取新图并重新生成当前海报 (6 秒冷却)
     */
    async function changePosterBackground() {
        const now = Date.now();
        const elapsed = now - _lastBgChangeTime;
        if (elapsed < _BG_CHANGE_CD_MS) {
            const remaining = Math.ceil((_BG_CHANGE_CD_MS - elapsed) / 1000);
            if (typeof showToast === 'function') showToast(`请 ${remaining} 秒后再换背景`);
            return;
        }
        _lastBgChangeTime = now;

        // 启动按钮冷却 UI
        const btn = document.getElementById('btn-poster-change-bg');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('poster-bg-cd');
            let cdLeft = 6;
            const cdLabel = btn.querySelector('.poster-bg-cd-label');
            if (cdLabel) cdLabel.textContent = `${cdLeft}s`;
            const cdTimer = setInterval(() => {
                cdLeft--;
                if (cdLeft <= 0) {
                    clearInterval(cdTimer);
                    btn.disabled = false;
                    btn.classList.remove('poster-bg-cd');
                    if (cdLabel) cdLabel.textContent = '';
                } else {
                    if (cdLabel) cdLabel.textContent = `${cdLeft}s`;
                }
            }, 1000);
        }

        if (typeof showToast === 'function') showToast('正在更换背景...');

        const newImg = await fetchRemoteBgImage();
        if (!newImg) {
            if (typeof showToast === 'function') showToast('换背景失败，请稍后重试');
            return;
        }

        _cachedBgImage = newImg;
        saveBgToLocalStorage(newImg);

        // 重新生成当前海报
        if (_currentPosterGenerator && typeof _currentPosterGenerator === 'function') {
            try {
                const dataUrl = await _currentPosterGenerator(_currentPosterOptions || {});
                currentPosterBase64 = dataUrl;
                const imgEl = document.getElementById('poster-preview-image');
                if (imgEl) imgEl.src = dataUrl;
            } catch (e) {
                console.error('[changePosterBackground] regenerate error:', e);
            }
        }
    }

    /**
     * 获取或预加载 Toy 平台二维码
     */
    async function getToyQrCodeData() {
        if (_cachedToyQrData) return _cachedToyQrData;
        let base64 = '';
        let url = (typeof window !== 'undefined' && window.location && window.location.href && !window.location.href.startsWith('about:'))
            ? window.location.href
            : 'https://www.bilibili.com/toy/cyr/index.html';

        if (typeof window !== 'undefined' && window.toy && typeof window.toy.getQrCode === 'function') {
            try {
                const res = await window.toy.getQrCode({ path: '' });
                if (res) {
                    if (res.base64) base64 = res.base64;
                    if (res.url) url = res.url;
                }
            } catch (e) {
                console.warn('[Toy] getQrCode error:', e);
            }
        }
        _cachedToyQrData = { base64, url };
        return _cachedToyQrData;
    }

    async function getOrLoadToyQrImage() {
        if (!isToyPlatform()) return null;
        if (_cachedToyQrImg) return _cachedToyQrImg;
        const qrData = await getToyQrCodeData();
        if (qrData && qrData.base64) {
            _cachedToyQrImg = await loadImageAsync(qrData.base64, 1500);
            return _cachedToyQrImg;
        }
        return null;
    }

    /**
     * 全局主动预加载入口：在应用启动、进入游戏或结算时提前预热
     */
    function preloadPosterAssets() {
        try {
            preloadAppIcon();
            preloadBackgroundImage();
            if (isToyPlatform()) {
                getOrLoadToyQrImage();
            }
        } catch (e) { }
    }

    // 页面就绪后立即触发后台预加载，不卡顿首屏
    if (typeof window !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(preloadPosterAssets, 600));
        } else {
            setTimeout(preloadPosterAssets, 600);
        }
    }

    /* ==========================================================================
       文件下载与保存到相册
       ========================================================================== */
    function downloadPosterImage(base64Data, filename) {
        if (!base64Data) {
            if (typeof showToast === 'function') showToast('海报数据无效');
            return false;
        }
        const fname = filename || `词迹海报_${Date.now()}.png`;
        try {
            const parts = base64Data.split(';base64,');
            const contentType = (parts[0] && parts[0].split(':')[1]) || 'image/png';
            const raw = window.atob(parts[1] || parts[0]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }
            const blob = new Blob([uInt8Array], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                try {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                } catch (e) { }
            }, 1500);
            if (typeof showToast === 'function') showToast('海报已开始下载');
            return true;
        } catch (e) {
            try {
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = base64Data;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    try { document.body.removeChild(a); } catch (e) { }
                }, 1000);
                if (typeof showToast === 'function') showToast('海报已开始下载');
                return true;
            } catch (err) {
                console.error('[Download poster error]', err);
                if (typeof showToast === 'function') showToast('下载失败，请长按图片保存');
                return false;
            }
        }
    }

    async function handlePosterDownloadWebAction() {
        if (!currentPosterBase64) {
            if (typeof showToast === 'function') showToast('请先生成海报');
            return;
        }
        downloadPosterImage(currentPosterBase64);
    }

    async function savePosterToAlbum(base64Data) {
        if (!base64Data) {
            if (typeof showToast === 'function') showToast('海报数据无效');
            return false;
        }

        if (typeof window !== 'undefined' && window.toy && typeof window.toy.isSupport === 'function') {
            try {
                const supported = await window.toy.isSupport('saveImageToAlbum');
                if (supported && typeof window.toy.saveImageToAlbum === 'function') {
                    await window.toy.saveImageToAlbum({
                        base64Data: base64Data,
                        hintMsg: '保存海报需要相册访问权限'
                    });
                    if (typeof showToast === 'function') showToast('🎉 海报已成功保存至本地相册！');
                    return true;
                }
            } catch (e) {
                console.error('[Toy saveImageToAlbum error]', e);
                const msg = e && e.message ? e.message : '相册保存失败';
                if (typeof showToast === 'function') showToast(`保存失败: ${msg}`);
                return false;
            }
        }

        return downloadPosterImage(base64Data);
    }

    async function sharePosterViaToy(base64Data) {
        if (typeof window !== 'undefined' && window.toy && typeof window.toy.isSupport === 'function') {
            try {
                const supported = await window.toy.isSupport('share');
                if (supported && typeof window.toy.share === 'function') {
                    try {
                        await window.toy.share({ path: 'index.html' });
                        if (typeof showToast === 'function') showToast('已拉起分享面板');
                        return true;
                    } catch (err1) {
                        await window.toy.share({ path: '' });
                        if (typeof showToast === 'function') showToast('已拉起分享面板');
                        return true;
                    }
                }
            } catch (e) {
                console.warn('[Toy share error]', e);
            }
        }

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: '词迹 Recite Words',
                    text: '我在「词迹」沉浸式背单词与联机对战，快来一起玩吧！',
                    url: (typeof window !== 'undefined' && window.location && window.location.href) || 'https://www.bilibili.com/toy/cyr/index.html'
                });
                return true;
            } catch (e) { }
        }

        if (typeof showToast === 'function') showToast('请在 B站 App 内使用直接分享，或保存图片后发送给好友');
        return false;
    }

    /* ==========================================================================
       Canvas 绘图辅助函数
       ========================================================================== */
    const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

    function formatPosterDate(d = new Date()) {
        const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month}${year}`;
    }

    function drawRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
        ctx.save();
        ctx.beginPath();
        const maxR = Math.min(Math.abs(width), Math.abs(height)) / 2;
        let r = radius;
        if (typeof r === 'number') {
            r = Math.min(Math.max(0, r), maxR);
        } else if (typeof r === 'object' && r !== null) {
            r = {
                tl: Math.min(Math.max(0, r.tl || 0), maxR),
                tr: Math.min(Math.max(0, r.tr || 0), maxR),
                br: Math.min(Math.max(0, r.br || 0), maxR),
                bl: Math.min(Math.max(0, r.bl || 0), maxR)
            };
        } else {
            r = 0;
        }

        if (typeof ctx.roundRect === 'function') {
            if (typeof r === 'number') {
                ctx.roundRect(x, y, width, height, r);
            } else {
                ctx.roundRect(x, y, width, height, [r.tl, r.tr, r.br, r.bl]);
            }
        } else {
            const tl = typeof r === 'number' ? r : r.tl;
            const tr = typeof r === 'number' ? r : r.tr;
            const br = typeof r === 'number' ? r : r.br;
            const bl = typeof r === 'number' ? r : r.bl;
            ctx.moveTo(x + tl, y);
            ctx.arcTo(x + width, y, x + width, y + height, tr);
            ctx.arcTo(x + width, y + height, x, y + height, br);
            ctx.arcTo(x, y + height, x, y, bl);
            ctx.arcTo(x, y, x + width, y, tl);
            ctx.closePath();
        }

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle && lineWidth) {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawText(ctx, text, x, y, options = {}) {
        ctx.save();
        const font = options.font || `16px ${FONT_FAMILY}`;
        ctx.font = font;
        ctx.fillStyle = options.color || '#1A1C1E';
        ctx.textAlign = options.align || 'left';
        ctx.textBaseline = options.baseline || 'top';
        ctx.fillText(String(text), x, y);
        ctx.restore();
    }

    function drawAvatarCircle(ctx, img, x, y, size, fallbackText = '学') {
        ctx.save();
        const radius = size / 2;
        const cx = x + radius;
        const cy = y + radius;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (img) {
            ctx.drawImage(img, x, y, size, size);
        } else {
            ctx.fillStyle = '#0061A4';
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${Math.round(size * 0.46)}px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fallbackText, cx, cy);
        }
        ctx.restore();

        // 细腻外圈边框
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * 绘制海报顶部大面积风景图 (上部约 58% 高度)
     */
    function drawPosterTopScenery(ctx, width, topH, bgImg) {
        if (bgImg && bgImg.naturalWidth && bgImg.naturalHeight) {
            const imgW = bgImg.naturalWidth;
            const imgH = bgImg.naturalHeight;
            const scale = Math.max(width / imgW, topH / imgH);
            const sw = width / scale;
            const sh = topH / scale;
            const sx = (imgW - sw) / 2;
            const sy = (imgH - sh) / 2;

            ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, topH);
        } else {
            // 优雅艺术渐变兜底 (莫奈蓝雾/晨曦)
            const bgGrad = ctx.createLinearGradient(0, 0, 0, topH);
            bgGrad.addColorStop(0, '#78A09A');
            bgGrad.addColorStop(0.5, '#99BDB6');
            bgGrad.addColorStop(1, '#8BAFA9');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, topH);
        }
    }

    /**
     * 绘制极简对齐的 App 信息底栏
     * 规范：最下方显示app信息（app实际图标、“词迹”、“让背词更有趣”）。
     * 图标无需外容器包裹，直接绘制；如果是toy平台，右侧显示toy二维码，如果不是toy平台，右下角提供网页链接 (https://www.bilibili.com/toy/cyr)。
     */
    function drawSimplifiedBottomBar(ctx, width, footerY, footerH, appIconImg, qrImg, isToy) {
        const iconSize = 48;
        const iconX = 48;
        const centerY = footerY + footerH / 2;
        const iconY = centerY - iconSize / 2;

        // 左侧：App 真实图标 (无外容器包裹，直接绘制原始图标)
        if (appIconImg) {
            ctx.drawImage(appIconImg, iconX, iconY, iconSize, iconSize);
        } else {
            const logoGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
            logoGrad.addColorStop(0, '#0061A4');
            logoGrad.addColorStop(1, '#00487D');
            drawRoundRect(ctx, iconX, iconY, iconSize, iconSize, 12, logoGrad);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold 22px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('词', iconX + iconSize / 2, iconY + iconSize / 2);
        }

        // 左侧文字：与图标垂直居中精确对齐
        const textX = iconX + iconSize + 14;
        drawText(ctx, '词迹', textX, centerY - 9, {
            font: `bold 18px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            baseline: 'middle'
        });
        drawText(ctx, '让背词更有趣', textX, centerY + 13, {
            font: `500 13px ${FONT_FAMILY}`,
            color: '#74777F',
            baseline: 'middle'
        });

        // 右侧：如果是 Toy 平台显示 Toy 真实二维码，非 Toy 平台显示网页链接 (带精美白底圆角线框)
        if (isToy && qrImg) {
            const qrSize = 54;
            const qrX = width - 48 - qrSize;
            const qrY = centerY - qrSize / 2;

            drawRoundRect(ctx, qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 6, '#FFFFFF', '#E2E8F0', 1);
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } else if (!isToy) {
            const urlText = 'https://www.bilibili.com/toy/cyr';
            ctx.font = `600 13px ${FONT_FAMILY}`;
            const urlW = ctx.measureText(urlText).width;
            const pillW = urlW + 28;
            const pillH = 34;
            const pillX = width - 48 - pillW;
            const pillY = centerY - pillH / 2;
            drawRoundRect(ctx, pillX, pillY, pillW, pillH, 8, '#FFFFFF', '#CBD5E1', 1.5);
            drawText(ctx, urlText, pillX + pillW / 2, centerY, {
                font: `600 13px ${FONT_FAMILY}`,
                color: '#1E293B',
                align: 'center',
                baseline: 'middle'
            });
        }
    }

    /**
     * 辅助查找单词音标与释义 (优先从本地内置库与词书缓存查找)
     */
    function findWordDetail(rawWord) {
        if (!rawWord) return null;
        const wClean = String(rawWord).trim().toLowerCase();

        // 1. DEFAULT_WORDS 内置词库
        if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS)) {
            const found = DEFAULT_WORDS.find(item => item && (item.word || '').trim().toLowerCase() === wClean);
            if (found) {
                let meaning = '';
                if (found.meanings && found.meanings.length > 0) {
                    meaning = found.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
                } else if (found.meaning) {
                    meaning = found.meaning;
                }
                return {
                    word: found.word,
                    phone: found.phone || '',
                    meaning: meaning
                };
            }
        }

        // 2. BookManager 词书缓存
        if (typeof BookManager !== 'undefined' && BookManager.bookCache) {
            for (const bId of Object.keys(BookManager.bookCache)) {
                const list = BookManager.bookCache[bId];
                if (Array.isArray(list)) {
                    const found = list.find(item => item && (item.word || '').trim().toLowerCase() === wClean);
                    if (found) {
                        let meaning = '';
                        if (found.meanings && found.meanings.length > 0) {
                            meaning = found.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
                        } else if (found.meaning) {
                            meaning = found.meaning;
                        }
                        return {
                            word: found.word,
                            phone: found.phone || '',
                            meaning: meaning
                        };
                    }
                }
            }
        }

        return null;
    }

    /**
     * 规范化单个单词对象
     */
    function normalizeWordCandidate(candidate) {
        if (!candidate) return null;
        let wordStr = '';
        let phoneStr = '';
        let meaningStr = '';
        let sentenceStr = '';

        if (typeof candidate === 'string') {
            wordStr = candidate.trim();
        } else if (typeof candidate === 'object') {
            wordStr = (candidate.word || '').trim();
            phoneStr = candidate.phone || candidate.pinyin || '';
            sentenceStr = candidate.sentence || candidate.example || '';
            if (candidate.meanings && candidate.meanings.length > 0) {
                meaningStr = candidate.meanings.map(m => (m.pos ? m.pos + ' ' : '') + m.meaning).join('；');
                if (!sentenceStr && candidate.meanings[0].examples && candidate.meanings[0].examples.length > 0) {
                    const ex = candidate.meanings[0].examples[0];
                    sentenceStr = ex.sentence + (ex.source ? ` 《${ex.source.replace(/[《》]/g, '')}》` : '');
                }
            } else if (candidate.meaning) {
                meaningStr = candidate.meaning;
            }
            if (!sentenceStr && candidate.senses && candidate.senses.length > 0) {
                for (const s of candidate.senses) {
                    if (s.examples && s.examples.length > 0 && s.examples[0].sentence) {
                        sentenceStr = s.examples[0].sentence + (s.examples[0].source ? ` 《${s.examples[0].source.replace(/[《》]/g, '')}》` : '');
                        break;
                    }
                }
            }
        }

        if (!wordStr) return null;

        // 如果缺失音标或释义，尝试从全局词典补全
        if (!phoneStr || !meaningStr) {
            const detail = findWordDetail(wordStr);
            if (detail) {
                if (!phoneStr) phoneStr = detail.phone || '';
                if (!meaningStr) meaningStr = detail.meaning || '';
            }
        }

        return {
            word: wordStr,
            phone: phoneStr,
            meaning: meaningStr,
            sentence: sentenceStr
        };
    }

    /**
     * 随机抽取一个词展示
     * 严格优先级：今日错词 > 本次学习词库 > 生涯高频错词 > 学过的单词 > 默认词库
     */
    function pickPosterHighlightWord(options = {}) {
        const isShiCi = (options.sessionType === 'shici');

        // 优先级 1: 本次学习小结中的错词
        const candidatesP1 = [];
        if (options.sessionMistakesList && Array.isArray(options.sessionMistakesList)) {
            options.sessionMistakesList.forEach(w => {
                if (w) candidatesP1.push(w);
            });
        }
        if (candidatesP1.length === 0 && options.pool && Array.isArray(options.pool)) {
            options.pool.forEach(p => {
                if (p && (!p.isCorrect || p._isWrong)) {
                    candidatesP1.push(p);
                }
            });
        }
        if (candidatesP1.length > 0) {
            const picked = candidatesP1[Math.floor(Math.random() * candidatesP1.length)];
            const norm = normalizeWordCandidate(picked);
            if (norm && norm.word) return norm;
        }

        // 优先级 2: 如果是本次学习小结 (isSession)，优先从本次实际学习的词库 pool 中抽取一个词
        if (options.isSession && options.pool && Array.isArray(options.pool) && options.pool.length > 0) {
            const picked = options.pool[Math.floor(Math.random() * options.pool.length)];
            const norm = normalizeWordCandidate(picked);
            if (norm && norm.word) return norm;
        }

        // 优先级 3: 生涯高频错词 (若为实词模式则避免抽取英文历史错词)
        if (!isShiCi) {
            const mistakes = (typeof userStats !== 'undefined' && userStats.mistakes) ? userStats.mistakes : {};
            const mistakeEntries = Object.entries(mistakes).filter(([k, v]) => v && (v.count || 0) >= 1);
            if (mistakeEntries.length > 0) {
                let maxCount = 0;
                mistakeEntries.forEach(([k, v]) => {
                    if ((v.count || 0) > maxCount) maxCount = v.count;
                });
                const topTierMistakes = mistakeEntries.filter(([k, v]) => (v.count || 0) >= Math.max(1, maxCount - 1));
                const chosenMistake = topTierMistakes[Math.floor(Math.random() * topTierMistakes.length)];
                const norm = normalizeWordCandidate({
                    word: chosenMistake[0],
                    phone: chosenMistake[1].phone || chosenMistake[1].pinyin || '',
                    meaning: chosenMistake[1].meaning || ''
                });
                if (norm && norm.word) return norm;
            }
        }

        // 优先级 4: 学过的单词 (实词模式下跳过英文复习库)
        const candidatesP4 = [];
        if (!isShiCi && typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.getAllLearnedWords === 'function') {
            const learned = EbbinghausEngine.getAllLearnedWords();
            if (Array.isArray(learned) && learned.length > 0) {
                candidatesP4.push(...learned);
            }
        }
        if (candidatesP4.length === 0 && options.pool && Array.isArray(options.pool) && options.pool.length > 0) {
            candidatesP4.push(...options.pool);
        }
        if (candidatesP4.length > 0) {
            const picked = candidatesP4[Math.floor(Math.random() * candidatesP4.length)];
            const norm = normalizeWordCandidate(picked);
            if (norm && norm.word) return norm;
        }

        // 优先级 5: 默认词库
        if (!isShiCi) {
            const candidatesP5 = [];
            if (typeof DEFAULT_WORDS !== 'undefined' && Array.isArray(DEFAULT_WORDS) && DEFAULT_WORDS.length > 0) {
                candidatesP5.push(...DEFAULT_WORDS);
            }
            if (candidatesP5.length > 0) {
                const picked = candidatesP5[Math.floor(Math.random() * candidatesP5.length)];
                const norm = normalizeWordCandidate(picked);
                if (norm && norm.word) return norm;
            }
        }

        // 最终兜底 (实词与英文各自专用兜底)
        if (isShiCi) {
            return {
                word: '按',
                phone: '',
                meaning: '[动词] 巡行，巡视',
                sentence: '项王按剑而跽曰：“客何为者？” 《鸿门宴》'
            };
        }
        return {
            word: 'adept',
            phone: "/əˈdept/",
            meaning: 'adj. 熟练的，内行的'
        };
    }

    /**
     * 动态检测背景区域像素亮度 (感知亮度 > 140 为浅色背景，否则为深色背景)
     */
    function getBackgroundBrightness(ctx, x, y, width, height) {
        try {
            const sampleX = Math.max(0, Math.round(x));
            const sampleY = Math.max(0, Math.round(y));
            const sampleW = Math.min(Math.max(10, Math.round(width)), 450);
            const sampleH = Math.min(Math.max(10, Math.round(height)), 260);
            const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
            const data = imgData.data;
            let totalLuminance = 0;
            const count = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                totalLuminance += lum;
            }
            return totalLuminance / (count || 1);
        } catch (e) {
            return 100;
        }
    }

    /**
     * 在海报风景背景上绘制抽取的单词或实词
     * 规范：
     * 1. 单词不要大写，保持原始大小写或自然小写；
     * 2. 更改音标字体，确保美观（使用优选排印字体栈）；
     * 3. 删除毛玻璃边框；
     * 4. 动态对比度：背景浅色用黑色字体，背景深色用白色字体；
     * 5. 实词不显示拼音，并在释义下方展示对应例句。
     */
    function drawPosterWordOverlay(ctx, width, wordInfo, topH) {
        if (!wordInfo || !wordInfo.word) return;

        ctx.save();
        const rawWord = String(wordInfo.word || '').trim();
        const isChinese = /[\u4e00-\u9fa5]/.test(rawWord);
        // 单词不要大写，保持自然小写 (实词保持汉字)
        const wordText = isChinese ? rawWord : rawWord.toLowerCase();

        // 实词不需要显示拼音/音标，英文显示美观音标
        let phoneText = isChinese ? '' : (wordInfo.phone ? String(wordInfo.phone).trim() : '');
        if (phoneText && !phoneText.startsWith('/') && !phoneText.startsWith('[')) {
            phoneText = `/${phoneText}/`;
        }

        let meaningText = wordInfo.meaning ? String(wordInfo.meaning).replace(/★/g, '').trim() : '';
        if (meaningText.length > 28) {
            meaningText = meaningText.slice(0, 28) + '...';
        }

        // 实词例句 (仅实词展示在释义下方)
        let exampleText = '';
        if (isChinese) {
            exampleText = wordInfo.sentence || wordInfo.example || '';
            if (!exampleText && wordInfo.senses && wordInfo.senses.length > 0) {
                for (const s of wordInfo.senses) {
                    if (s.examples && s.examples.length > 0 && s.examples[0].sentence) {
                        exampleText = s.examples[0].sentence + (s.examples[0].source ? ` 《${s.examples[0].source.replace(/[《》]/g, '')}》` : '');
                        break;
                    }
                }
            }
            if (exampleText && exampleText.length > 32) {
                exampleText = exampleText.slice(0, 32) + '...';
            }
        }

        const textX = 48;
        const textY = 110;

        // 动态检测背景区域亮度 (感知亮度 > 140 为浅色背景，否则为深色背景)
        const lum = getBackgroundBrightness(ctx, textX, textY, 360, 220);
        const isLightBg = lum > 140;

        const mainColor = isLightBg ? '#0F172A' : '#FFFFFF';
        const subColor = isLightBg ? '#334155' : 'rgba(255, 255, 255, 0.92)';
        const exampleColor = isLightBg ? '#475569' : 'rgba(255, 255, 255, 0.82)';
        const shadowColor = isLightBg ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.65)';
        const shadowBlur = isLightBg ? 6 : 10;

        // 文字柔和阴影，确保在任何复杂自然光下都清晰易读
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = isLightBg ? 1 : 2;

        // 1. 单词大字 (不强制大写，优雅自然)
        drawText(ctx, wordText, textX, textY, {
            font: `bold ${isChinese ? 58 : 52}px ${FONT_FAMILY}`,
            color: mainColor
        });

        let nextY = textY + (isChinese ? 72 : 68);

        // 2. 音标 (使用专用美观排印字体)
        if (phoneText) {
            const PHONETIC_FONT = '"Segoe UI", -apple-system, BlinkMacSystemFont, "Lucida Sans Unicode", "Arial Unicode MS", "PingFang SC", sans-serif';
            drawText(ctx, phoneText, textX, nextY, {
                font: `500 22px ${PHONETIC_FONT}`,
                color: subColor
            });
            nextY += 38;
        }

        // 3. 中文释义
        if (meaningText) {
            drawText(ctx, meaningText, textX, nextY, {
                font: `bold 22px ${FONT_FAMILY}`,
                color: mainColor
            });
            nextY += 36;
        }

        // 4. 实词例句 (仅在实词时显示在释义下方)
        if (exampleText) {
            drawText(ctx, exampleText, textX, nextY, {
                font: `500 17px ${FONT_FAMILY}`,
                color: exampleColor
            });
        }

        ctx.restore();
    }

    /* ==========================================================================
       1. 生成学习成绩海报 (背单词小结 / 个人中心成长报告) - 极简结构
       ========================================================================== */
    async function generateStudyPoster(options = {}) {
        const width = 750;
        const height = 1334;
        const dpr = 2; // 2x 超清渲染
        const isToy = isToyPlatform();

        const myName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '词迹学员';
        const myAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(myName) : '';

        // 并行加载全部资源
        const [bgImg, appIconImg, myAvatarImg, qrImg] = await Promise.all([
            preloadBackgroundImage(),
            preloadAppIcon(),
            loadImageAsync(myAvatarUrl, 1200),
            isToy ? getOrLoadToyQrImage() : Promise.resolve(null)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 结构设计：海报信息整体靠下显示，上方大面积显示风景背景图
        // topH = 840 (上方约 63% 纯风景图), 下部 494px 纯白数据区
        const topH = 840;
        const bottomY = topH;
        const bottomH = height - bottomY;

        // 1. 上部大面积完整风景图
        drawPosterTopScenery(ctx, width, topH, bgImg);

        // 2. 在背景图中抽取并展示一个词（优先级：今日错词 > 生涯高频错词 > 学过的单词 > 随机单词）
        const highlightWord = pickPosterHighlightWord(options);
        drawPosterWordOverlay(ctx, width, highlightWord, topH);

        // 3. 下部白底信息区 (干净纯粹，无任何多余嵌套卡片)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, bottomY, width, bottomH);

        // 顶部分界柔和线
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, bottomY);
        ctx.lineTo(width, bottomY);
        ctx.stroke();

        // 用户头像与日期行
        const userRowY = bottomY + 38;
        drawAvatarCircle(ctx, myAvatarImg, 48, userRowY - 18, 36, myName.slice(0, 1));
        drawText(ctx, formatPosterDate(), 96, userRowY, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            baseline: 'middle'
        });

        // 4. 只显示今日已学词数、累计学习词数 (超大数字排版，完全平铺无外框)
        const todayLogs = (typeof DailyStudyTracker !== 'undefined' && DailyStudyTracker.getLogs) ? DailyStudyTracker.getLogs() : {};
        const todayKey = (typeof DailyStudyTracker !== 'undefined' && DailyStudyTracker.getTodayStr) ? DailyStudyTracker.getTodayStr() : '';
        const todayData = (todayKey && todayLogs[todayKey]) ? todayLogs[todayKey] : { learned: 0 };

        const stats = (typeof userStats !== 'undefined' && userStats) ? userStats : { total: 0 };
        const totalWords = stats.total || 0;
        const todayLearned = (todayData && typeof todayData.learned === 'number') ? todayData.learned : (options.sessionTotal || 0);

        const dataY = bottomY + 105;
        const col1X = 48;
        const col2X = width / 2 + 20;

        // 列1：今日已学词数
        drawText(ctx, `${todayLearned}`, col1X, dataY, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, '今日已学词数', col1X, dataY + 76, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, 'TODAY I LEARNED', col1X, dataY + 104, {
            font: `600 11px ${FONT_FAMILY}`,
            color: '#74777F'
        });

        // 列2：累计学习词数
        drawText(ctx, `${totalWords}`, col2X, dataY, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, '累计学习词数', col2X, dataY + 76, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, 'WORDS LEARNED', col2X, dataY + 104, {
            font: `600 11px ${FONT_FAMILY}`,
            color: '#74777F'
        });

        // 5. 最下方 App 信息底栏 (App真实图标+名称+Slogan，Toy显示二维码，非Toy显示网页链接)
        const footerH = 90;
        const footerY = height - footerH - 18;
        drawSimplifiedBottomBar(ctx, width, footerY, footerH, appIconImg, qrImg, isToy);

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       2. 生成对局战果海报 (人机对战 / 远程联机) - 极简结构
       ========================================================================== */
    async function generateDuelPoster(options = {}) {
        const width = 750;
        const height = 1334;
        const dpr = 2; // 2x 超清渲染
        const isToy = isToyPlatform();

        const myName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '我方学员';
        const myAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(myName) : '';

        let oppoName = options.oppoName || (options.isAi ? `系统AI (${options.oppoRank || 1}段)` : '对手');
        let oppoAvatarUrl = '';
        if (!options.isAi && options.oppoName) {
            oppoAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(options.oppoName) : '';
        }

        const [bgImg, appIconImg, myAvatarImg, oppoAvatarImg, qrImg] = await Promise.all([
            preloadBackgroundImage(),
            preloadAppIcon(),
            loadImageAsync(myAvatarUrl, 1200),
            oppoAvatarUrl ? loadImageAsync(oppoAvatarUrl, 1200) : Promise.resolve(null),
            isToy ? getOrLoadToyQrImage() : Promise.resolve(null)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const topH = 770;
        const bottomY = topH;
        const bottomH = height - bottomY;

        // 1. 上部风景图
        drawPosterTopScenery(ctx, width, topH, bgImg);

        // 胜负状态以极简高级文字直接呈现在风景下边缘之上
        ctx.save();
        const isWin = options.playerWin;
        const isDraw = options.isDraw;
        let outcomeEn = isWin ? 'VICTORY' : (isDraw ? 'DRAW' : 'DEFEATED');
        let outcomeZh = isWin ? '恭喜获胜' : (isDraw ? '势均力敌' : '遗憾战败');
        let outcomeColor = isWin ? '#FFFFFF' : (isDraw ? '#E2E8F0' : '#FFDAD6');

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 16;
        drawText(ctx, outcomeEn, 48, topH - 100, {
            font: `bold 44px ${FONT_FAMILY}`,
            color: outcomeColor
        });
        drawText(ctx, outcomeZh, 48, topH - 46, {
            font: `600 20px ${FONT_FAMILY}`,
            color: 'rgba(255, 255, 255, 0.95)'
        });
        ctx.restore();

        // 2. 下部纯净白底数据区
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, bottomY, width, bottomH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, bottomY);
        ctx.lineTo(width, bottomY);
        ctx.stroke();

        // 用户与日期行
        const userRowY = bottomY + 44;
        drawAvatarCircle(ctx, myAvatarImg, 48, userRowY - 18, 36, myName.slice(0, 1));
        const modeDesc = options.isAi ? '人机对战' : '远程联机';
        drawText(ctx, `${formatPosterDate()} · ${modeDesc}`, 96, userRowY, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            baseline: 'middle'
        });

        // 3. 双方得分超大字体并列
        const dataY = bottomY + 115;
        const col1X = 48;
        const col2X = width / 2 + 20;

        // 我方
        drawText(ctx, `${options.p1Score || 0}`, col1X, dataY, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#DC2626'
        });
        drawText(ctx, `我方得分 · ${myName}`, col1X, dataY + 76, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, 'MY SCORE', col1X, dataY + 104, {
            font: `600 11px ${FONT_FAMILY}`,
            color: '#74777F'
        });

        // 对方
        drawText(ctx, `${options.p2Score || 0}`, col2X, dataY, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#0284C7'
        });
        drawText(ctx, `对方得分 · ${oppoName}`, col2X, dataY + 76, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, 'OPPONENT SCORE', col2X, dataY + 104, {
            font: `600 11px ${FONT_FAMILY}`,
            color: '#74777F'
        });

        // 简练对决信息单行 (无嵌套卡片)
        const mRes = options.matchResult;
        let ratingText = mRes ? (mRes.ratingDelta >= 0 ? `+${mRes.ratingDelta} 分` : `${mRes.ratingDelta} 分`) : '---';
        const leadDiff = (options.p1Score || 0) - (options.p2Score || 0);
        const rankSummary = `天梯 ${ratingText}  ·  净胜 ${leadDiff >= 0 ? '+' + leadDiff : leadDiff} 题`;
        drawText(ctx, rankSummary, 48, dataY + 140, {
            font: `500 13px ${FONT_FAMILY}`,
            color: '#535F70'
        });

        // 4. 最下方 App 信息底栏
        const footerH = 100;
        const footerY = height - footerH - 15;
        drawSimplifiedBottomBar(ctx, width, footerY, footerH, appIconImg, qrImg, isToy);

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       3. 生成 Wordle 挑战成功海报 (画作单词大字排版 + 纯净矩阵) - 极简结构
       ========================================================================== */
    async function generateWordlePoster(options = {}) {
        const width = 750;
        const height = 1334;
        const dpr = 2; // 2x 超清渲染
        const isToy = isToyPlatform();

        const myName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '词迹学员';
        const myAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(myName) : '';

        const [bgImg, appIconImg, myAvatarImg, qrImg] = await Promise.all([
            preloadBackgroundImage(),
            preloadAppIcon(),
            loadImageAsync(myAvatarUrl, 1200),
            isToy ? getOrLoadToyQrImage() : Promise.resolve(null)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 目标单词与释义展示在风景背景中 (自动补充音标与释义，规范大小写)
        const wordCandidate = normalizeWordCandidate({
            word: options.targetWord || 'SUCCESS',
            phone: options.cluePhone || '',
            meaning: options.clueMeaning || ''
        }) || {
            word: options.targetWord || 'SUCCESS',
            phone: options.cluePhone || '',
            meaning: options.clueMeaning || ''
        };

        const attempts = options.attempts || [];
        const attemptsCount = attempts.length || 1;
        const wordLen = (wordCandidate.word || 'WORDS').length || 5;

        // 彩砖尺寸：根据用户反馈大幅放大，更具冲击力与视觉质感
        let tileSize = 62;
        let tileGap = 10;
        let rowGap = 9;
        if (wordLen <= 4) {
            tileSize = 66;
            tileGap = 10;
        } else if (wordLen === 5) {
            tileSize = 62;
            tileGap = 10;
        } else if (wordLen === 6) {
            tileSize = 56;
            tileGap = 8;
        } else if (wordLen === 7) {
            tileSize = 48;
            tileGap = 8;
        } else {
            tileSize = 42;
            tileGap = 6;
        }

        const matrixH = attempts.length > 0 ? (attempts.length * tileSize + (attempts.length - 1) * rowGap) : 0;
        const footerH = 90;
        const footerY = height - footerH - 18;

        // 整体移动到下方：根据尝试行数自适应计算卡片起点，确保紧凑自然且紧贴底栏
        const neededContentH = 220 + matrixH + 28;
        const topH = Math.max(540, Math.min(840, footerY - neededContentH));
        const bottomY = topH;
        const bottomH = height - bottomY;

        // 1. 上部风景画作
        drawPosterTopScenery(ctx, width, topH, bgImg);

        // 目标单词展示
        drawPosterWordOverlay(ctx, width, wordCandidate, topH);

        // 2. 下部白底信息区
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, bottomY, width, bottomH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, bottomY);
        ctx.lineTo(width, bottomY);
        ctx.stroke();

        // 第1行：用户头像和日期
        const userRowY = bottomY + 38;
        drawAvatarCircle(ctx, myAvatarImg, 48, userRowY - 18, 36, myName.slice(0, 1));
        drawText(ctx, formatPosterDate(), 96, userRowY, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            baseline: 'middle'
        });

        // 第2行：展示尝试次数与用时 (如果未开启计时器，则不用显示用时，直接居中显示尝试次数)
        let timeDisplay = '';
        let rawSeconds = typeof options.timeSpent === 'number' ? options.timeSpent : 0;
        if (!rawSeconds && options.timeStr && options.timeStr.includes(':')) {
            const p = options.timeStr.split(':');
            rawSeconds = (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
        }
        if (rawSeconds > 0) {
            if (rawSeconds < 60) {
                timeDisplay = `${rawSeconds}s`;
            } else {
                const m = Math.floor(rawSeconds / 60);
                const s = rawSeconds % 60;
                timeDisplay = `${m}m ${s}s`;
            }
        } else if (options.timeStr && options.timeStr !== '00:00' && options.timeStr !== '--') {
            timeDisplay = options.timeStr;
        }

        const isTimerOn = Boolean(options.isTimerEnabled && timeDisplay);
        const dataY = bottomY + 102;

        if (!isTimerOn) {
            // 未开启计时器：直接居中显示尝试次数
            const centerX = width / 2;
            drawText(ctx, `${attemptsCount}`, centerX, dataY, {
                font: `bold 64px ${FONT_FAMILY}`,
                color: '#1A1C1E',
                align: 'center'
            });
            drawText(ctx, '尝试次数', centerX, dataY + 76, {
                font: `bold 16px ${FONT_FAMILY}`,
                color: '#1A1C1E',
                align: 'center'
            });
            drawText(ctx, 'ATTEMPTS', centerX, dataY + 104, {
                font: `600 11px ${FONT_FAMILY}`,
                color: '#74777F',
                align: 'center'
            });
        } else {
            // 开启计时器：双列并排显示
            const col1X = 54;
            const col2X = width / 2 + 30;

            // 尝试次数
            drawText(ctx, `${attemptsCount}`, col1X, dataY, {
                font: `bold 64px ${FONT_FAMILY}`,
                color: '#1A1C1E'
            });
            drawText(ctx, '尝试次数', col1X, dataY + 76, {
                font: `bold 16px ${FONT_FAMILY}`,
                color: '#1A1C1E'
            });
            drawText(ctx, 'ATTEMPTS', col1X, dataY + 104, {
                font: `600 11px ${FONT_FAMILY}`,
                color: '#74777F'
            });

            // 用时
            drawText(ctx, `${timeDisplay}`, col2X, dataY, {
                font: `bold 64px ${FONT_FAMILY}`,
                color: '#1A1C1E'
            });
            drawText(ctx, '用时', col2X, dataY + 76, {
                font: `bold 16px ${FONT_FAMILY}`,
                color: '#1A1C1E'
            });
            drawText(ctx, 'TIME SPENT', col2X, dataY + 104, {
                font: `600 11px ${FONT_FAMILY}`,
                color: '#74777F'
            });
        }

        // 第3行：展示具体记录 (Wordle 彩砖矩阵)
        const totalRowW = wordLen * tileSize + (wordLen - 1) * tileGap;
        const startX = (width - totalRowW) / 2;
        let rowY = dataY + 132;

        attempts.forEach((att) => {
            const guess = (att.guess || '').toUpperCase();
            const evaluation = att.evaluation || [];

            for (let c = 0; c < wordLen; c++) {
                const char = guess[c] || '';
                const ev = evaluation[c] || 'absent';
                let tileBg = '#787C7E';
                if (ev === 'correct') tileBg = '#146C2E';
                else if (ev === 'present') tileBg = '#B08800';

                const tileX = startX + c * (tileSize + tileGap);
                drawRoundRect(ctx, tileX, rowY, tileSize, tileSize, 8, tileBg);

                if (char) {
                    drawText(ctx, char, tileX + tileSize / 2, rowY + tileSize / 2, {
                        font: `bold ${Math.round(tileSize * 0.54)}px ${FONT_FAMILY}`,
                        color: '#FFFFFF',
                        align: 'center',
                        baseline: 'middle'
                    });
                }
            }
            rowY += tileSize + rowGap;
        });

        // 4. 最下方 App 信息底栏 (App真实图标+名称+Slogan，Toy显示二维码，非Toy显示网页链接)
        drawSimplifiedBottomBar(ctx, width, footerY, footerH, appIconImg, qrImg, isToy);

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       预览弹窗与交互逻辑
       ========================================================================== */
    async function showPosterPreviewModal(dataUrl, title = '分享海报') {
        currentPosterBase64 = dataUrl;
        const modal = document.getElementById('modal-poster-preview');
        const img = document.getElementById('poster-preview-image');
        const titleEl = document.getElementById('poster-modal-title');
        const btnShare = document.getElementById('btn-poster-share-direct');
        const btnSaveAlbum = document.getElementById('btn-poster-save-album');
        const btnDownload = document.getElementById('btn-poster-download-web');

        if (titleEl) titleEl.innerText = title;
        if (img) img.src = dataUrl;

        // 根据平台环境动态决定功能按钮：B站 App 内展示“直接分享”与“保存到相册”，普通网页展示“下载海报”
        const isBiliApp = await checkIsBilibiliApp();
        if (btnShare) btnShare.style.display = isBiliApp ? 'inline-flex' : 'none';
        if (btnSaveAlbum) btnSaveAlbum.style.display = isBiliApp ? 'inline-flex' : 'none';
        if (btnDownload) btnDownload.style.display = isBiliApp ? 'none' : 'inline-flex';

        // 换背景按钮：始终显示，检查冷却状态
        const btnChangeBg = document.getElementById('btn-poster-change-bg');
        if (btnChangeBg) {
            btnChangeBg.style.display = 'inline-flex';
            const elapsed = Date.now() - _lastBgChangeTime;
            if (elapsed < _BG_CHANGE_CD_MS) {
                btnChangeBg.disabled = true;
                btnChangeBg.classList.add('poster-bg-cd');
                let cdLeft = Math.ceil((_BG_CHANGE_CD_MS - elapsed) / 1000);
                const cdLabel = btnChangeBg.querySelector('.poster-bg-cd-label');
                if (cdLabel) cdLabel.textContent = `${cdLeft}s`;
                const cdTimer = setInterval(() => {
                    cdLeft--;
                    if (cdLeft <= 0) {
                        clearInterval(cdTimer);
                        btnChangeBg.disabled = false;
                        btnChangeBg.classList.remove('poster-bg-cd');
                        if (cdLabel) cdLabel.textContent = '';
                    } else {
                        if (cdLabel) cdLabel.textContent = `${cdLeft}s`;
                    }
                }, 1000);
            } else {
                btnChangeBg.disabled = false;
                btnChangeBg.classList.remove('poster-bg-cd');
                const cdLabel = btnChangeBg.querySelector('.poster-bg-cd-label');
                if (cdLabel) cdLabel.textContent = '';
            }
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }

    function closePosterPreviewModal() {
        const modal = document.getElementById('modal-poster-preview');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    async function handlePosterSaveAlbumAction() {
        if (!currentPosterBase64) return;
        await savePosterToAlbum(currentPosterBase64);
    }

    async function sharePosterAction() {
        if (!currentPosterBase64) return;
        await sharePosterViaToy(currentPosterBase64);
    }

    /* ==========================================================================
       业务触发入口：供各业务视图一键调用 (全环境支持：B站App与普通网页均可生成海报)
       ========================================================================== */

    // 1. 人机对战 / 远程联机战果海报
    async function handleShareDuelResultPoster() {
        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const isAi = (typeof gameMode !== 'undefined' && gameMode === 'ai_duel') || (typeof gameResult !== 'undefined' && gameResult && gameResult.mode === 'ai_duel');
            const gRes = (typeof gameResult !== 'undefined' && gameResult) ? gameResult : {};

            let p1Score = gRes.p1Score !== undefined ? gRes.p1Score : ((typeof p1State !== 'undefined') ? p1State.score : 0);
            let p2Score = gRes.p2Score !== undefined ? gRes.p2Score : ((typeof p2State !== 'undefined') ? p2State.score : 0);
            let msg = gRes.msg || '';
            let playerWin = msg.includes('获胜') || (p1Score > p2Score);
            let isDraw = msg.includes('言和') || (p1Score === p2Score);

            let oppoName = '系统AI';
            let oppoRank = 1;
            if (isAi) {
                oppoRank = (typeof aiDuelConfig !== 'undefined' && aiDuelConfig.aiRank) ? aiDuelConfig.aiRank : 1;
                oppoName = `系统AI (${oppoRank}段)`;
            } else {
                oppoName = (typeof isHost !== 'undefined' && isHost)
                    ? ((typeof guestName !== 'undefined' && guestName) ? guestName : '对手')
                    : ((typeof hostName !== 'undefined' && hostName) ? hostName : '房主');
            }

            const ruleSummary = (typeof arenaTugRuleSummary !== 'undefined' && arenaTugRuleSummary)
                ? arenaTugRuleSummary
                : (document.getElementById('arena-tug-rule-summary') ? document.getElementById('arena-tug-rule-summary').innerText : '领先 6 题胜出');

            const posterDataUrl = await generateDuelPoster({
                isAi,
                playerWin,
                isDraw,
                p1Score,
                p2Score,
                oppoName,
                oppoRank,
                matchResult: gRes.matchResult || null,
                ruleSummary
            });

            _currentPosterGenerator = generateDuelPoster;
            _currentPosterOptions = { isAi, playerWin, isDraw, p1Score, p2Score, oppoName, oppoRank, matchResult: gRes.matchResult || null, ruleSummary };
            _currentPosterTitle = '对决战果海报';
            await showPosterPreviewModal(posterDataUrl, '对决战果海报');
        } catch (e) {
            console.error('[GenerateDuelPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 2. 背单词 / 背实词小结海报
    async function handleShareStudyScorePoster() {
        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const gRes = (typeof gameResult !== 'undefined' && gameResult) ? gameResult : {};
            const isShiCi = (gRes.mode === 'shici');

            let sessionTotal = 0;
            let sessionCorrect = 0;
            let sessionMistakes = 0;
            let sessionAccuracy = 100;
            let bookTitle = '';
            let pool = [];
            let mistakeSet = new Set();

            if (isShiCi) {
                pool = gRes.pool || [];
                sessionTotal = pool.length;
                sessionCorrect = gRes.p1Score !== undefined ? gRes.p1Score : sessionTotal;
                sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
                sessionMistakes = Math.max(0, sessionTotal - sessionCorrect);
                bookTitle = '高考古诗文必背实词辨析';
                if (Array.isArray(gRes.sessionMistakes)) {
                    mistakeSet = new Set(gRes.sessionMistakes);
                }
            } else {
                pool = gRes.pool || (typeof singleState !== 'undefined' && singleState.pool) || [];
                mistakeSet = new Set(Array.isArray(gRes.sessionMistakes) ? gRes.sessionMistakes : ((typeof singleState !== 'undefined' && singleState.sessionMistakes) ? Array.from(singleState.sessionMistakes) : []));
                const uniqueWordsMap = new Map();
                (pool || []).forEach(p => {
                    if (p && p.word) {
                        const k = p.word.trim().toLowerCase();
                        if (!uniqueWordsMap.has(k)) uniqueWordsMap.set(k, p);
                    }
                });
                sessionTotal = uniqueWordsMap.size || (pool ? pool.length : 0);
                uniqueWordsMap.forEach((p, k) => {
                    if (mistakeSet.has(k) || !p.isCorrect) sessionMistakes++;
                });
                sessionCorrect = Math.max(0, sessionTotal - sessionMistakes);
                sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
                bookTitle = (typeof currentBook !== 'undefined' && currentBook && currentBook.name) ? currentBook.name : '词迹精选词书';
            }

            const posterDataUrl = await generateStudyPoster({
                isSession: true,
                sessionType: isShiCi ? 'shici' : 'words',
                sessionTotal,
                sessionCorrect,
                sessionMistakes,
                sessionAccuracy,
                bookTitle,
                pool,
                sessionMistakesList: Array.from(mistakeSet)
            });

            _currentPosterGenerator = generateStudyPoster;
            _currentPosterOptions = { isSession: true, sessionType: isShiCi ? 'shici' : 'words', sessionTotal, sessionCorrect, sessionMistakes, sessionAccuracy, bookTitle, pool, sessionMistakesList: Array.from(mistakeSet) };
            _currentPosterTitle = '晒成绩';
            await showPosterPreviewModal(posterDataUrl, '晒成绩');
        } catch (e) {
            console.error('[GenerateStudyPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 3. “我” 个人中心页面成绩海报
    async function handleShareMeStudyPoster() {
        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const posterDataUrl = await generateStudyPoster({
                isSession: false
            });
            _currentPosterGenerator = generateStudyPoster;
            _currentPosterOptions = { isSession: false };
            _currentPosterTitle = '晒成绩';
            await showPosterPreviewModal(posterDataUrl, '晒成绩');
        } catch (e) {
            console.error('[GenerateMeStudyPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 4. Wordle 挑战成功战报海报
    async function handleShareWordlePoster() {
        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const rState = (typeof riddleState !== 'undefined' && riddleState) ? riddleState : {};
            const isDaily = Boolean(typeof isDailyWordleMode !== 'undefined' && isDailyWordleMode);
            const rCfg = (typeof riddleConfig !== 'undefined' && riddleConfig) ? riddleConfig : {};
            const isTimerEnabled = Boolean(isDaily || rCfg.enableTimer);
            const elapsed = (typeof dailyWordleElapsedSeconds !== 'undefined') ? dailyWordleElapsedSeconds : 0;
            const timeStr = (typeof formatDailyTimer === 'function' && typeof dailyWordleElapsedSeconds !== 'undefined')
                ? formatDailyTimer(dailyWordleElapsedSeconds)
                : '';

            const posterDataUrl = await generateWordlePoster({
                targetWord: rState.targetWord || '',
                cluePhone: rState.cluePhone || '',
                clueMeaning: rState.clueMeaning || '',
                attempts: rState.attempts || [],
                maxAttempts: rState.maxAttempts || 6,
                isDaily,
                isTimerEnabled,
                timeSpent: (typeof elapsed === 'number' && elapsed > 0) ? elapsed : (rState.timeSpent || 0),
                timeStr
            });

            _currentPosterGenerator = generateWordlePoster;
            _currentPosterOptions = { targetWord: rState.targetWord || '', cluePhone: rState.cluePhone || '', clueMeaning: rState.clueMeaning || '', attempts: rState.attempts || [], maxAttempts: rState.maxAttempts || 6, isDaily, isTimerEnabled, timeSpent: (typeof elapsed === 'number' && elapsed > 0) ? elapsed : (rState.timeSpent || 0), timeStr };
            _currentPosterTitle = '晒成绩';
            await showPosterPreviewModal(posterDataUrl, '晒成绩');
        } catch (e) {
            console.error('[GenerateWordlePoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 绑定弹窗背景点击关闭
    function bindPosterModalEvents() {
        const modal = document.getElementById('modal-poster-preview');
        if (modal && !modal._boundClose) {
            modal._boundClose = true;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closePosterPreviewModal();
                }
            });
        }
    }
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindPosterModalEvents);
        } else {
            bindPosterModalEvents();
        }
    }

    // 暴露给全局调用
    if (typeof window !== 'undefined') {
        window.checkIsBilibiliApp = checkIsBilibiliApp;
        window.isBilibiliAppSync = isBilibiliAppSync;
        window.isToyPlatform = isToyPlatform;
        window.downloadPosterImage = downloadPosterImage;
        window.showPosterPreviewModal = showPosterPreviewModal;
        window.closePosterPreviewModal = closePosterPreviewModal;
        window.handlePosterSaveAlbumAction = handlePosterSaveAlbumAction;
        window.handlePosterShareAction = sharePosterAction;
        window.handlePosterDownloadWebAction = handlePosterDownloadWebAction;

        window.handleShareDuelResultPoster = handleShareDuelResultPoster;
        window.handleShareStudyScorePoster = handleShareStudyScorePoster;
        window.handleShareMeStudyPoster = handleShareMeStudyPoster;
        window.handleShareWordlePoster = handleShareWordlePoster;

        window.generateDuelPoster = generateDuelPoster;
        window.generateStudyPoster = generateStudyPoster;
        window.generateWordlePoster = generateWordlePoster;
        window.preloadPosterAssets = preloadPosterAssets;
        window.changePosterBackground = changePosterBackground;
    }
})();
