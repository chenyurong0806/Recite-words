/**
 * 版本检查更新浮动卡片组件
 * Module: assets/js/components/version-card.js
 */

/* ============================================================
 * 常量
 * ============================================================ */
const GH_REPO   = 'chenyurong0806/Recite-words';
const GH_MIRROR = 'https://ghfast.top/';

/* ============================================================
 * 工具函数
 * ============================================================ */

/** 语义化版本比较：A > B 返回 1，A < B 返回 -1，相等返回 0 */
function semverCompare(vA, vB) {
    const pA = String(vA || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const pB = String(vB || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pA.length, pB.length);
    for (let i = 0; i < len; i++) {
        const numA = pA[i] || 0;
        const numB = pB[i] || 0;
        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }
    return 0;
}

/** 去掉 v / V 前缀，返回纯净版本号 */
function normalizeTag(v) {
    return String(v || '').replace(/^v/i, '');
}

/** 构造 assets.zip 的镜像下载地址 */
function buildZipUrl(rawTag) {
    return `${GH_MIRROR}https://github.com/${GH_REPO}/releases/download/v${rawTag}/assets.zip`;
}

/** 解析 release body 为 changelog 数组 */
function parseChangelog(body) {
    if (!body) return ['常规优化更新'];
    const items = body
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''))
        .filter(line => line.length > 0 && !line.startsWith('#'));
    return items.length > 0 ? items : ['常规优化更新'];
}

/** 判断 URL 是否无效（空 / index.html） */
function isBadDownloadUrl(u) {
    return !u || u.includes('index.html');
}

/* ============================================================
 * 版本检查
 * ============================================================ */
let cachedLatestVersionData = null;

async function checkCloudVersion(manual = false) {
    // B 站小游戏环境下跳过
    if (typeof isBilibiliToy !== 'undefined' && isBilibiliToy) {
        if (manual) showToast(`当前已是最新离线版本 v${APP_VERSION}`);
        return;
    }

    let data = null;

    /* ---------- 1. GitHub Releases API（首选） ---------- */
    try {
        const ghRes = await fetch(
            `https://api.github.com/repos/${GH_REPO}/releases/latest`,
            { headers: { 'Accept': 'application/vnd.github.v3+json' } }
        );
        if (ghRes.ok) {
            const ghData = await ghRes.json();
            const rawTag = normalizeTag(ghData.tag_name);
            const releaseDate = (ghData.published_at || '').substring(0, 10);

            const assets = Array.isArray(ghData.assets) ? ghData.assets : [];
            const zipAsset =
                assets.find(a => a.name === 'assets.zip') ||
                assets.find(a => a.name && a.name.endsWith('.zip'));

            const zipRawUrl = (zipAsset && zipAsset.browser_download_url)
                ? zipAsset.browser_download_url
                : `https://github.com/${GH_REPO}/releases/download/v${rawTag}/assets.zip`;

            data = {
                version: rawTag,
                releaseDate,
                changelog: parseChangelog(ghData.body),
                downloadUrl: `${GH_MIRROR}${zipRawUrl}`,
                mirrorDownloadUrl: `${GH_MIRROR}${zipRawUrl}`
            };
        }
    } catch (e) {
        console.warn('GitHub releases API check failed:', e);
    }

    /* ---------- 2. 统一规范化 URL ---------- */
    if (data && data.version) {
        const rawTag = normalizeTag(data.version);
        data.version = rawTag;

        if (isBadDownloadUrl(data.downloadUrl)) {
            data.downloadUrl = buildZipUrl(rawTag);
        }
        if (isBadDownloadUrl(data.mirrorDownloadUrl)) {
            data.mirrorDownloadUrl = buildZipUrl(rawTag);
        }

        cachedLatestVersionData = data;

        const isLocal = window.location.protocol === 'file:'
            || window.location.hostname === 'localhost'
            || window.location.hostname === '127.0.0.1';

        const hasNewer = semverCompare(data.version, APP_VERSION) > 0;

        if (hasNewer) {
            if (manual) {
                showToast(`发现新版本 v${data.version}，可在设置-更新日志中查阅详情`);
            }
        } else if (manual) {
            showToast(`当前已是最新版本 v${APP_VERSION}`);
        }
    } else if (manual) {
        showToast(`当前已是最新版本 v${APP_VERSION}`);
    }
}

/* ============================================================
 * 导出到 window
 * ============================================================ */
window.checkCloudVersion = checkCloudVersion;