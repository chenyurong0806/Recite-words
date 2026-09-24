/**
 * 环境检测与 B 站 Toy 容器判断
 * Module: assets/js/core/env.js
 */

/* ==========================================================================
环境检测：判断是否运行在 B 站 Toy 容器内
========================================================================== */
const isBilibiliToy = (() => {
    try {
        // 1. URL 参数标记（通常 B 站加载小工具会带特定参数或 referrer）
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('bilibili') || urlParams.has('bili_toy')) return true;

        // 2. 检测宿主环境 Referrer
        if (document.referrer && (document.referrer.includes('bilibili.com') || document.referrer.includes('bili'))) {
            return true;
        }

        // 3. 检测是否在 iframe 内嵌套运行
        const inIframe = window.self !== window.top;
        // 如果是在线上域名且嵌在 iframe 内，基本可判定为平台内嵌
        if (inIframe && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
})();

