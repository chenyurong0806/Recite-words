/**
 * 版本检查更新浮动卡片组件
 * Module: assets/js/components/version-card.js
 */


function semverCompare(vA, vB) {
    const pA = String(vA || '').replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const pB = String(vB || '').replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
        const numA = pA[i] || 0;
        const numB = pB[i] || 0;
        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }
    return 0;
}

async function checkCloudVersion(manual = false) {
    let data = null;

    // 1. 优先从 Worker 获取 (不走任何浏览器本地缓存)
    try {
        const res = await fetch(`${BookManager.API_BASE}/api/version?t=${Date.now()}`, {
            cache: 'no-store'
        });
        if (res.ok) data = await res.json();
    } catch (e) {
        console.warn('Worker version check failed:', e);
    }

    // 2. 备选：Worker 不可用时尝试直连
    if (!data) {
        try {
            const ghRes = await fetch('https://api.github.com/repos/chenyurong0806/Recite-words/releases/latest');
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                const tag = (ghData.tag_name || '').replace(/^v/i, '');
                const releaseDate = (ghData.published_at || '').substring(0, 10);
                let changelogItems = [];
                if (ghData.body) {
                    changelogItems = ghData.body.replace(/\r\n/g, '\n').split('\n')
                        .map(line => line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, ''))
                        .filter(line => line.length > 0 && !line.startsWith('#'));
                }
                const zipAsset = Array.isArray(ghData.assets) ? ghData.assets.find(a => a.name && a.name.endsWith('.zip')) : null;
                const zipRawUrl = zipAsset ? zipAsset.browser_download_url : `https://github.com/chenyurong0806/Recite-words/archive/refs/tags/${ghData.tag_name}.zip`;
                data = {
                    version: tag,
                    releaseDate: releaseDate,
                    changelog: changelogItems.length > 0 ? changelogItems : ['常规优化更新'],
                    // 自动加上 ghfast.top 镜像前缀，确保离线版在大陆下载 zip 也是满速
                    downloadUrl: `https://ghfast.top/${zipRawUrl}`
                };
            }
        } catch (e) { }
    }

    if (data && data.version) {
        // 保证离线版本下载链接始终是 zip 压缩包
        if (!data.downloadUrl || !data.downloadUrl.includes('.zip')) {
            const tag = data.version.startsWith('v') ? data.version : `v${data.version}`;
            data.downloadUrl = `https://ghfast.top/https://github.com/chenyurong0806/Recite-words/archive/refs/tags/${tag}.zip`;
        }

        const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const hasNewer = semverCompare(data.version, APP_VERSION) > 0;

        if (hasNewer) {
            showVersionUpdateCard(data, isLocal);
        } else {
            if (manual) showToast(`当前已是最新版本 v${APP_VERSION}`);
        }
    } else {
        if (manual) showToast(`当前已是最新离线版本 v${APP_VERSION}`);
    }
}

function showVersionUpdateCard(data, isLocal) {
    if (isBilibiliToy) return;

    const card = document.getElementById('version-update-card');
    if (!card) return;

    const titleEl = document.getElementById('version-card-title');
    const dateEl = document.getElementById('version-card-date');
    const descEl = document.getElementById('version-card-desc');
    const actionBtn = document.getElementById('btn-version-card-action');

    if (titleEl) titleEl.innerText = `发现新版本 v${data.version}`;
    if (dateEl) dateEl.innerText = `发布日期：${data.releaseDate}`;
    if (descEl && Array.isArray(data.changelog)) {
        descEl.innerHTML = `
                <div style="font-weight:600; margin-bottom:4px;">主要更新内容：</div>
                <ul style="padding-left:16px; margin:0; line-height:1.5;">
                    ${data.changelog.slice(0, 4).map(it => `<li>${escapeHtml(it)}</li>`).join('')}
                </ul>
            `;
    }

    if (actionBtn) {
        if (isLocal) {
            actionBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">download</span><span>下载更新压缩包 (.zip)</span>';
            actionBtn.onclick = () => handleDownloadLatestZip(data.downloadUrl, data.version);
        } else {
            actionBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">refresh</span><span>刷新更新</span>';
            actionBtn.onclick = () => window.location.reload(true);
        }
    }

    card.style.display = 'block';
}

function dismissVersionUpdateCard() {
    const card = document.getElementById('version-update-card');
    if (card) card.style.display = 'none';
}

function openChangelogInSettings() {
    dismissVersionUpdateCard();
    switchView('view-settings');
    switchSettingsSubview('changelog');
}

function handleDownloadLatestZip(downloadUrl, version) {
    if (!downloadUrl) return;
    showToast('正在启动下载离线更新压缩包，请稍候...');

    const a = document.createElement('a');
    a.href = downloadUrl;
    const vStr = version ? `v${version}` : 'latest';
    a.download = `Recite-words-${vStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 兼容旧方法名
function handleDownloadLatestHtml(downloadUrl) {
    handleDownloadLatestZip(downloadUrl);
}

function handleVersionUpdateAction() {
    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
        handleDownloadLatestZip();
    } else {
        window.location.reload(true);
    }
}
