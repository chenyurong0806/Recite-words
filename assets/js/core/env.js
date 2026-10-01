/**
 * 环境检测与全局版本常量
 * Module: assets/js/core/env.js
 */

if (typeof window !== 'undefined') {
    window.APP_VERSION = '2.4.11';
}
var APP_VERSION = (typeof window !== 'undefined' && window.APP_VERSION) ? window.APP_VERSION : '2.4.11';

/* ==========================================================================
环境检测：判断是否运行在 B 站 Toy 容器内
========================================================================== */
const isBilibiliToy = (() => {
    try {
        // 0. window.toy SDK 或缓存凭证存在
        if (typeof window !== 'undefined' && (Boolean(window.toy) || Boolean(window.__cachedToyGuestId))) return true;

        // 1. URL 参数标记 (支持测试 ?bilibili=1 / ?bili_toy=1 / ?toy=1)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('bilibili') || urlParams.has('bili_toy') || urlParams.has('toy')) return true;

        // 2. 域名检测 (运行在 B 站官方域名下)
        const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
        if (host.includes('bilibili.com') || host.includes('hdslb.com')) return true;

        // 3. 路径特征 (B 站 Toy 专属运行路径 /toy/<slug>/)
        const pathname = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        if (pathname.includes('/toy/')) return true;

        // 4. 宿主环境 Referrer 检测
        if (document.referrer && (document.referrer.includes('bilibili.com') || document.referrer.includes('bili'))) {
            return true;
        }

        // 5. 客户端 UserAgent 检测 (B 站 App WebView 容器内)
        if (typeof navigator !== 'undefined' && navigator.userAgent && /bili/i.test(navigator.userAgent)) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
})();

// 沙箱环境（如 B 站 Toy）防护：避免 alert() 在无 allow-modals 的 iframe 中报错
if (typeof window !== 'undefined') {
    const _origAlert = window.alert;
    window.alert = function (msg) {
        if (typeof showToast === 'function') {
            showToast(String(msg));
        } else {
            try {
                if (_origAlert) _origAlert.call(window, msg);
            } catch (e) {
                console.warn('[Sandbox Alert Ignored]:', msg);
            }
        }
    };
}


