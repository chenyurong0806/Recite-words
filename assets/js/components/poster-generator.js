/**
 * 词迹 - Google MD3 风格海报生成与分享组件 (Toy平台专属)
 * Module: assets/js/components/poster-generator.js
 */

(function () {
    let currentPosterBase64 = '';

    /* ==========================================================================
       环境判断与 Toy 能力封装
       ========================================================================== */
    function isToyPlatform() {
        return (typeof isBilibiliToy !== 'undefined' && isBilibiliToy) ||
            (typeof window !== 'undefined' && Boolean(window.toy));
    }

    async function getToyQrCodeData() {
        let base64 = '';
        let url = 'https://www.bilibili.com/toy/cyr/index.html';
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
        return { base64, url };
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
                // 如果是超限或被拒绝
                const msg = e && e.message ? e.message : '相册保存失败';
                if (typeof showToast === 'function') showToast(`保存失败: ${msg}`);
                return false;
            }
        }

        // Web 端 / 浏览器备用保存能力 (通过 <a download>)
        try {
            const link = document.createElement('a');
            link.href = base64Data;
            link.download = `词迹海报_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (typeof showToast === 'function') showToast('已保存海报图片到下载目录');
            return true;
        } catch (e) {
            if (typeof showToast === 'function') showToast('无法保存海报');
            return false;
        }
    }

    async function sharePosterViaToy(base64Data) {
        if (typeof window !== 'undefined' && window.toy && typeof window.toy.isSupport === 'function') {
            try {
                const supported = await window.toy.isSupport('share');
                if (supported && typeof window.toy.share === 'function') {
                    await window.toy.share({ path: '' });
                    if (typeof showToast === 'function') showToast('已拉起分享面板');
                    return true;
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
                    url: 'https://www.bilibili.com/toy/cyr/index.html'
                });
                return true;
            } catch (e) { }
        }

        // 剪贴板分享备选
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText('https://www.bilibili.com/toy/cyr/index.html');
                if (typeof showToast === 'function') showToast('已复制应用网址，可直接粘贴分享！');
                return true;
            } catch (e) { }
        }

        if (typeof showToast === 'function') showToast('请使用保存到相册后发送给好友');
        return false;
    }

    /* ==========================================================================
       Canvas 绘图与 MD3 样式工具函数 (严格使用系统字体和MD3配色)
       ========================================================================== */
    const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

    function drawRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
        ctx.save();
        ctx.beginPath();
        let r = radius;
        if (typeof r === 'number') {
            r = { tl: r, tr: r, br: r, bl: r };
        } else {
            r = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, r);
        }
        ctx.moveTo(x + r.tl, y);
        ctx.lineTo(x + width - r.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
        ctx.lineTo(x + width, y + height - r.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
        ctx.lineTo(x + r.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
        ctx.lineTo(x, y + r.tl);
        ctx.quadraticCurveTo(x, y, x + r.tl, y);
        ctx.closePath();

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

    function drawBadge(ctx, text, x, y, bgColor, textColor, font, paddingX = 10, paddingY = 4, radius = 999) {
        ctx.save();
        ctx.font = font || `13px ${FONT_FAMILY}`;
        const metrics = ctx.measureText(text);
        const w = metrics.width + paddingX * 2;
        const h = 24;
        drawRoundRect(ctx, x, y, w, h, radius, bgColor);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
        ctx.restore();
        return w;
    }

    function drawCardShadow(ctx, x, y, w, h, radius) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        drawRoundRect(ctx, x, y, w, h, radius, '#FFFFFF');
        ctx.restore();
    }

    function loadImageAsync(src) {
        return new Promise((resolve) => {
            if (!src) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            // 3秒超时保底
            setTimeout(() => resolve(null), 3000);
            img.src = src;
        });
    }

    function drawAvatar(ctx, img, x, y, size, fallbackText = '学') {
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
            ctx.font = `bold ${Math.round(size * 0.45)}px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fallbackText, cx, cy);
        }
        ctx.restore();

        // 外层细腻边框
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    // 绘制标准海报顶部导航条与水印
    function drawPosterHeader(ctx, width, title, subTitle) {
        // 顶部品牌 Logo & 水印
        ctx.save();
        // Logo 渐变方块
        const logoGrad = ctx.createLinearGradient(40, 42, 80, 82);
        logoGrad.addColorStop(0, '#0061A4');
        logoGrad.addColorStop(1, '#00487D');
        drawRoundRect(ctx, 40, 42, 42, 42, 12, logoGrad);

        // Logo 图标 (纯画简笔卡片/星标)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 22px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('词', 61, 63);

        // 品牌文字
        drawText(ctx, '词迹', 94, 42, {
            font: `bold 20px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });
        drawText(ctx, 'Recite Words', 138, 46, {
            font: `600 13px ${FONT_FAMILY}`,
            color: '#0061A4'
        });
        drawText(ctx, subTitle || '沉浸式对决与多维记忆', 94, 66, {
            font: `12px ${FONT_FAMILY}`,
            color: '#72777F'
        });

        // 右上角当前日期水印
        const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
        drawText(ctx, dateStr, width - 40, 52, {
            font: `600 13px ${FONT_FAMILY}`,
            color: '#8E9199',
            align: 'right'
        });
        ctx.restore();
    }

    // 绘制底部 Toy 平台二维码与网址卡片
    async function drawPosterFooter(ctx, width, startY, qrData, sloganText) {
        const cardX = 40;
        const cardY = startY;
        const cardW = width - 80;
        const cardH = 150;

        // 底部白色卡片
        drawCardShadow(ctx, cardX, cardY, cardW, cardH, 20);
        drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        // 左侧文字区域
        drawText(ctx, '词迹 · Recite Words', cardX + 24, cardY + 28, {
            font: `bold 18px ${FONT_FAMILY}`,
            color: '#0061A4'
        });
        drawText(ctx, sloganText || '坚持学习，见证每一次进步', cardX + 24, cardY + 58, {
            font: `13px ${FONT_FAMILY}`,
            color: '#43474E'
        });

        // 网址条胶囊
        const displayUrl = qrData.url || 'https://www.bilibili.com/toy/cyr/index.html';
        drawRoundRect(ctx, cardX + 24, cardY + 92, 360, 30, 8, '#F0F4F8');
        drawText(ctx, `🔗 ${displayUrl}`, cardX + 34, cardY + 98, {
            font: `500 11px monospace, ${FONT_FAMILY}`,
            color: '#535F70'
        });

        // 右侧二维码
        const qrSize = 104;
        const qrX = cardX + cardW - qrSize - 22;
        const qrY = cardY + 20;

        let qrImg = null;
        if (qrData.base64) {
            qrImg = await loadImageAsync(qrData.base64);
        }

        if (qrImg) {
            drawRoundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 10, '#FFFFFF', '#E2E8F0', 1);
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } else {
            // 兜底二维码占位
            drawRoundRect(ctx, qrX, qrY, qrSize, qrSize, 8, '#F0F4F8', '#CBD5E1', 1);
            drawText(ctx, '扫码体验', qrX + qrSize / 2, qrY + 38, {
                font: `bold 12px ${FONT_FAMILY}`,
                color: '#0061A4',
                align: 'center'
            });
            drawText(ctx, 'B站 Toy', qrX + qrSize / 2, qrY + 58, {
                font: `11px ${FONT_FAMILY}`,
                color: '#64748B',
                align: 'center'
            });
        }

        drawText(ctx, '扫码即刻体验', qrX + qrSize / 2, qrY + qrSize + 10, {
            font: `500 10px ${FONT_FAMILY}`,
            color: '#8E9199',
            align: 'center'
        });
    }

    /* ==========================================================================
       1. 生成对局战果海报 (人机对战 / 远程联机)
       ========================================================================== */
    async function generateDuelPoster(options = {}) {
        const width = 750;
        const height = 1180;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 背景：MD3 Surface 背景配轻微微渐变
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#EDF2FA');
        bgGrad.addColorStop(0.3, '#F8FAFC');
        bgGrad.addColorStop(1, '#F1F5F9');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 顶栏水印
        const modeLabel = options.isAi ? '人机对战' : '远程联机';
        drawPosterHeader(ctx, width, modeLabel, '词迹 · 联机对决竞技场');

        // 结果状态卡片
        const outcomeCardY = 110;
        const isWin = options.playerWin;
        const isDraw = options.isDraw;

        let statusBg = isWin ? '#D1E4FF' : (isDraw ? '#E2E8F0' : '#FFDAD6');
        let statusFg = isWin ? '#001D36' : (isDraw ? '#1E293B' : '#410002');
        let statusTitle = isWin ? '🎉 恭喜获胜！' : (isDraw ? '🤝 势均力敌，握手言和' : '💔 遗憾战败');
        let statusIcon = isWin ? 'VICTORY' : (isDraw ? 'DRAW' : 'DEFEATED');

        drawRoundRect(ctx, 40, outcomeCardY, width - 80, 84, 20, statusBg);
        drawText(ctx, statusTitle, 68, outcomeCardY + 24, {
            font: `bold 26px ${FONT_FAMILY}`,
            color: statusFg
        });
        drawBadge(ctx, statusIcon, width - 150, outcomeCardY + 30, 'rgba(255,255,255,0.7)', statusFg, `bold 12px ${FONT_FAMILY}`, 12, 4);

        // 模式与规则 Chips
        let chipX = 42;
        const chipY = 208;
        const modeText = options.isAi ? '🤖 智能人机' : '⚔️ 远程联机';
        const ruleText = options.ruleSummary || '拔河对战';
        chipX += drawBadge(ctx, modeText, chipX, chipY, '#E0E7F1', '#2A4365', `500 13px ${FONT_FAMILY}`, 14, 4) + 10;
        chipX += drawBadge(ctx, ruleText, chipX, chipY, '#E0E7F1', '#2A4365', `500 13px ${FONT_FAMILY}`, 14, 4) + 10;

        // 对决核心分数卡片
        const duelCardY = 250;
        const duelCardH = 340;
        drawCardShadow(ctx, 40, duelCardY, width - 80, duelCardH, 24);
        drawRoundRect(ctx, 40, duelCardY, width - 80, duelCardH, 24, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        // 加载双方头像
        const myName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '我方学员';
        const myAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(myName) : '';
        const myAvatarImg = await loadImageAsync(myAvatarUrl);

        let oppoName = options.oppoName || (options.isAi ? `系统AI (${options.oppoRank || 1}段)` : '对手');
        let oppoAvatarImg = null;
        if (!options.isAi && options.oppoName) {
            const oppoAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(options.oppoName) : '';
            oppoAvatarImg = await loadImageAsync(oppoAvatarUrl);
        }

        // 我方区域 (左)
        const p1CenterX = 180;
        drawAvatar(ctx, myAvatarImg, p1CenterX - 45, duelCardY + 36, 90, myName.slice(0, 1));
        drawBadge(ctx, '🔴 我方', p1CenterX - 36, duelCardY + 138, '#FEE2E2', '#B91C1C', `bold 12px ${FONT_FAMILY}`, 10, 3);
        drawText(ctx, myName, p1CenterX, duelCardY + 172, {
            font: `bold 18px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            align: 'center'
        });
        drawText(ctx, `${options.p1Score || 0}`, p1CenterX, duelCardY + 208, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#B91C1C',
            align: 'center'
        });
        drawText(ctx, '得分', p1CenterX, duelCardY + 288, {
            font: `500 13px ${FONT_FAMILY}`,
            color: '#72777F',
            align: 'center'
        });

        // 中间 VS 勋章
        const vsCenterX = width / 2;
        drawRoundRect(ctx, vsCenterX - 28, duelCardY + 136, 56, 56, 28, '#F1F5F9', '#CBD5E1', 2);
        drawText(ctx, 'VS', vsCenterX, duelCardY + 152, {
            font: `bold 20px ${FONT_FAMILY}`,
            color: '#64748B',
            align: 'center'
        });

        // 对方区域 (右)
        const p2CenterX = width - 180;
        if (options.isAi) {
            // AI 专用头像卡
            ctx.save();
            ctx.beginPath();
            ctx.arc(p2CenterX, duelCardY + 81, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#0284C7';
            ctx.fill();
            ctx.restore();
            drawText(ctx, '🤖', p2CenterX, duelCardY + 62, {
                font: `40px ${FONT_FAMILY}`,
                align: 'center'
            });
        } else {
            drawAvatar(ctx, oppoAvatarImg, p2CenterX - 45, duelCardY + 36, 90, oppoName.slice(0, 1));
        }
        drawBadge(ctx, '🔵 对方', p2CenterX - 36, duelCardY + 138, '#E0F2FE', '#0369A1', `bold 12px ${FONT_FAMILY}`, 10, 3);
        drawText(ctx, oppoName, p2CenterX, duelCardY + 172, {
            font: `bold 18px ${FONT_FAMILY}`,
            color: '#1A1C1E',
            align: 'center'
        });
        drawText(ctx, `${options.p2Score || 0}`, p2CenterX, duelCardY + 208, {
            font: `bold 64px ${FONT_FAMILY}`,
            color: '#0369A1',
            align: 'center'
        });
        drawText(ctx, '得分', p2CenterX, duelCardY + 288, {
            font: `500 13px ${FONT_FAMILY}`,
            color: '#72777F',
            align: 'center'
        });

        // 排位分与段位变动卡片 (如果有排位数据)
        const rankCardY = 610;
        const rankCardH = 200;
        drawCardShadow(ctx, 40, rankCardY, width - 80, rankCardH, 20);
        drawRoundRect(ctx, 40, rankCardY, width - 80, rankCardH, 20, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        drawText(ctx, '🏆 段位评级与赛果分析', 64, rankCardY + 24, {
            font: `bold 17px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });

        const mRes = options.matchResult;
        let ratingText = mRes ? (mRes.ratingDelta >= 0 ? `+${mRes.ratingDelta} 分` : `${mRes.ratingDelta} 分`) : '---';
        let currentRankText = (typeof LevelManager !== 'undefined' && LevelManager.getUserRankData)
            ? `${LevelManager.getUserRankData(myName).rank} 段 (${LevelManager.getUserRankData(myName).rating} 分)`
            : '段位认证中';

        // 3列展示
        const colW = (width - 128) / 3;
        const c1X = 64;
        const c2X = c1X + colW;
        const c3X = c2X + colW;

        // 列1：积分变动
        drawRoundRect(ctx, c1X, rankCardY + 68, colW - 12, 104, 14, '#F8FAFC');
        drawText(ctx, '天梯积分变动', c1X + 16, rankCardY + 84, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, ratingText, c1X + 16, rankCardY + 114, {
            font: `bold 24px ${FONT_FAMILY}`,
            color: (mRes && mRes.ratingDelta >= 0) ? '#16A34A' : '#DC2626'
        });

        // 列2：当前段位
        drawRoundRect(ctx, c2X, rankCardY + 68, colW - 12, 104, 14, '#F8FAFC');
        drawText(ctx, '最新段位', c2X + 16, rankCardY + 84, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, currentRankText, c2X + 16, rankCardY + 114, {
            font: `bold 18px ${FONT_FAMILY}`,
            color: '#0061A4'
        });

        // 列3：对决状态
        drawRoundRect(ctx, c3X, rankCardY + 68, colW - 12, 104, 14, '#F8FAFC');
        drawText(ctx, '对局净胜', c3X + 16, rankCardY + 84, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        const leadDiff = (options.p1Score || 0) - (options.p2Score || 0);
        drawText(ctx, leadDiff >= 0 ? `+${leadDiff} 题` : `${leadDiff} 题`, c3X + 16, rankCardY + 114, {
            font: `bold 24px ${FONT_FAMILY}`,
            color: leadDiff >= 0 ? '#0284C7' : '#E11D48'
        });

        // 底部二维码卡片
        const qrData = await getToyQrCodeData();
        await drawPosterFooter(ctx, width, 835, qrData, '随时随地开局，与好友或AI一决高下');

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       2. 生成学习成绩海报 (背单词/背实词小结、“我”页面)
       ========================================================================== */
    async function generateStudyPoster(options = {}) {
        const width = 750;
        const height = 1260;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 背景
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#E8F3FA');
        bgGrad.addColorStop(0.25, '#F6F9FD');
        bgGrad.addColorStop(1, '#EDF3F8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 顶栏水印
        const titleStr = options.isSession ? '小结成绩单' : '学习成长报告';
        drawPosterHeader(ctx, width, titleStr, '词迹 · 多维度沉浸记忆平台');

        // 用户卡片
        const userCardY = 110;
        const userCardH = 130;
        drawCardShadow(ctx, 40, userCardY, width - 80, userCardH, 22);
        drawRoundRect(ctx, 40, userCardY, width - 80, userCardH, 22, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        const myName = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : '词迹学员';
        const myAvatarUrl = (typeof getUserAvatar === 'function') ? getUserAvatar(myName) : '';
        const myAvatarImg = await loadImageAsync(myAvatarUrl);

        drawAvatar(ctx, myAvatarImg, 64, userCardY + 25, 80, myName.slice(0, 1));

        drawText(ctx, myName, 164, userCardY + 34, {
            font: `bold 22px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });

        let rankTitle = '1段 · 0分';
        if (typeof LevelManager !== 'undefined' && LevelManager.getUserRankData) {
            const rData = LevelManager.getUserRankData(myName);
            rankTitle = `${rData.rank}段 · ${rData.rating}分`;
        }
        drawBadge(ctx, `🏆 段位：${rankTitle}`, 164, userCardY + 70, '#D1E4FF', '#001D36', `bold 13px ${FONT_FAMILY}`, 12, 4);

        let currentY = 260;

        // 若来自背单词/背实词的小结页面，优先展示本次作答成就
        if (options.isSession) {
            const sessCardH = 160;
            drawCardShadow(ctx, 40, currentY, width - 80, sessCardH, 20);
            drawRoundRect(ctx, 40, currentY, width - 80, sessCardH, 20, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

            const sessionBadge = options.sessionType === 'shici' ? '古诗文实词学习' : '多维单词学习';
            drawBadge(ctx, sessionBadge, 64, currentY + 20, '#DCFCE7', '#15803D', `bold 12px ${FONT_FAMILY}`, 12, 4);
            if (options.bookTitle) {
                drawText(ctx, `📖 ${options.bookTitle}`, 210, currentY + 24, {
                    font: `600 13px ${FONT_FAMILY}`,
                    color: '#64748B'
                });
            }

            const colW = (width - 128) / 3;
            // 本次答题
            drawText(ctx, `${options.sessionTotal || 0}`, 64 + colW * 0.5, currentY + 68, {
                font: `bold 38px ${FONT_FAMILY}`,
                color: '#0061A4',
                align: 'center'
            });
            drawText(ctx, '本次作答词数', 64 + colW * 0.5, currentY + 118, {
                font: `13px ${FONT_FAMILY}`,
                color: '#72777F',
                align: 'center'
            });

            // 本次正确率
            const accRate = options.sessionAccuracy !== undefined ? options.sessionAccuracy : 100;
            drawText(ctx, `${accRate}%`, 64 + colW * 1.5, currentY + 68, {
                font: `bold 38px ${FONT_FAMILY}`,
                color: accRate >= 60 ? '#16A34A' : '#DC2626',
                align: 'center'
            });
            drawText(ctx, '本次正确率', 64 + colW * 1.5, currentY + 118, {
                font: `13px ${FONT_FAMILY}`,
                color: '#72777F',
                align: 'center'
            });

            // 本次错题
            drawText(ctx, `${options.sessionMistakes || 0}`, 64 + colW * 2.5, currentY + 68, {
                font: `bold 38px ${FONT_FAMILY}`,
                color: (options.sessionMistakes || 0) > 0 ? '#E11D48' : '#16A34A',
                align: 'center'
            });
            drawText(ctx, '错词复测数', 64 + colW * 2.5, currentY + 118, {
                font: `13px ${FONT_FAMILY}`,
                color: '#72777F',
                align: 'center'
            });

            currentY += sessCardH + 18;
        }

        // 今日学习数据卡片
        const todayLogs = (typeof DailyStudyTracker !== 'undefined' && DailyStudyTracker.getLogs) ? DailyStudyTracker.getLogs() : {};
        const todayKey = (typeof DailyStudyTracker !== 'undefined' && DailyStudyTracker.getTodayStr) ? DailyStudyTracker.getTodayStr() : '';
        const todayData = (todayKey && todayLogs[todayKey]) ? todayLogs[todayKey] : { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };

        const todayCardH = 170;
        drawCardShadow(ctx, 40, currentY, width - 80, todayCardH, 20);
        drawRoundRect(ctx, 40, currentY, width - 80, todayCardH, 20, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        drawText(ctx, '📅 今日学习数据 (Today)', 64, currentY + 22, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });

        const todayColW = (width - 128) / 3;
        const t1X = 64;
        const t2X = t1X + todayColW;
        const t3X = t2X + todayColW;

        // 今日已学
        drawRoundRect(ctx, t1X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '今日新学', t1X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${todayData.learned || 0} 词`, t1X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: '#0061A4' });

        // 今日复习
        drawRoundRect(ctx, t2X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '今日复习', t2X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${todayData.reviewed || 0} 词`, t2X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: '#059669' });

        // 今日总动量
        const totalActions = (todayData.learned || 0) + (todayData.reviewed || 0) + (todayData.riddle || 0) + (todayData.dictation || 0);
        drawRoundRect(ctx, t3X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '今日打卡答题', t3X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${totalActions} 次`, t3X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: '#D97706' });

        currentY += todayCardH + 18;

        // 生涯累积数据卡片
        const stats = (typeof userStats !== 'undefined' && userStats) ? userStats : { total: 0, correct: 0, mistakes: {} };
        const totalWords = stats.total || 0;
        const totalAcc = totalWords > 0 ? Math.round((stats.correct / totalWords) * 100) : 0;
        const mistakeCount = Object.keys(stats.mistakes || {}).length;

        const careerCardH = 170;
        drawCardShadow(ctx, 40, currentY, width - 80, careerCardH, 20);
        drawRoundRect(ctx, 40, currentY, width - 80, careerCardH, 20, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        drawText(ctx, '🌟 生涯累积数据 (Lifetime)', 64, currentY + 22, {
            font: `bold 16px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });

        const c1X = 64;
        const c2X = c1X + todayColW;
        const c3X = c2X + todayColW;

        // 累积作答
        drawRoundRect(ctx, c1X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '累积作答总数', c1X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${totalWords} 词`, c1X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: '#0061A4' });

        // 生涯正确率
        drawRoundRect(ctx, c2X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '生涯总正确率', c2X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${totalAcc}%`, c2X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: totalAcc >= 60 ? '#16A34A' : '#DC2626' });

        // 错题收录
        drawRoundRect(ctx, c3X, currentY + 54, todayColW - 12, 94, 14, '#F8FAFC');
        drawText(ctx, '收录错词数', c3X + 16, currentY + 68, { font: `12px ${FONT_FAMILY}`, color: '#64748B' });
        drawText(ctx, `${mistakeCount} 题`, c3X + 16, currentY + 94, { font: `bold 24px ${FONT_FAMILY}`, color: '#64748B' });

        currentY += careerCardH + 20;

        // 底部二维码卡片
        const qrData = await getToyQrCodeData();
        await drawPosterFooter(ctx, width, Math.max(currentY, 1070), qrData, '学海无涯，词迹相伴 · 每天记忆一组词');

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       3. 生成 Wordle 挑战成功海报 (带完整答题记录矩阵)
       ========================================================================== */
    async function generateWordlePoster(options = {}) {
        const width = 750;
        const height = 1260;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 背景
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#E8F5E9');
        bgGrad.addColorStop(0.25, '#F9FBFA');
        bgGrad.addColorStop(1, '#EDF7ED');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 顶栏水印
        drawPosterHeader(ctx, width, 'Wordle 战报', '词迹 · 沉浸式单词猜谜挑战');

        // 通关横幅
        const bannerY = 110;
        drawRoundRect(ctx, 40, bannerY, width - 80, 84, 20, '#D6F5DE');
        drawText(ctx, '🎉 Wordle 挑战成功！', 68, bannerY + 24, {
            font: `bold 26px ${FONT_FAMILY}`,
            color: '#003919'
        });
        const attemptsCount = (options.attempts || []).length;
        const maxAttempts = options.maxAttempts || 6;
        drawBadge(ctx, `${attemptsCount}/${maxAttempts} 次猜中`, width - 170, bannerY + 30, '#FFFFFF', '#146C2E', `bold 13px ${FONT_FAMILY}`, 14, 4);

        // 目标单词展示大卡片
        const wordCardY = 210;
        const wordCardH = 170;
        drawCardShadow(ctx, 40, wordCardY, width - 80, wordCardH, 22);
        drawRoundRect(ctx, 40, wordCardY, width - 80, wordCardH, 22, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        const targetWord = (options.targetWord || 'SUCCESS').toUpperCase();
        // 字母字母间留白
        drawText(ctx, targetWord.split('').join('  '), 68, wordCardY + 28, {
            font: `bold 38px ${FONT_FAMILY}`,
            color: '#0061A4'
        });

        if (options.cluePhone) {
            drawText(ctx, options.cluePhone, 68, wordCardY + 84, {
                font: `600 16px monospace, ${FONT_FAMILY}`,
                color: '#64748B'
            });
        }

        if (options.clueMeaning) {
            const cleanMeaning = options.clueMeaning.length > 36 ? options.clueMeaning.slice(0, 36) + '...' : options.clueMeaning;
            drawText(ctx, cleanMeaning, 68, wordCardY + 118, {
                font: `500 16px ${FONT_FAMILY}`,
                color: '#1E293B'
            });
        }

        // 答题足迹矩阵卡片 (Wordle 彩砖矩阵)
        const matrixCardY = 400;
        const attempts = options.attempts || [];
        const matrixCardH = Math.max(380, attempts.length * 60 + 120);

        drawCardShadow(ctx, 40, matrixCardY, width - 80, matrixCardH, 22);
        drawRoundRect(ctx, 40, matrixCardY, width - 80, matrixCardH, 22, '#FFFFFF', 'rgba(0,0,0,0.06)', 1);

        drawText(ctx, '🧩 本次答题足迹 (Wordle Matrix)', 68, matrixCardY + 24, {
            font: `bold 17px ${FONT_FAMILY}`,
            color: '#1A1C1E'
        });

        const wordLen = targetWord.length || 5;
        const tileSize = wordLen >= 8 ? 44 : 50;
        const tileGap = wordLen >= 8 ? 6 : 8;
        const rowGap = 10;
        const totalRowW = wordLen * tileSize + (wordLen - 1) * tileGap;
        const startX = (width - totalRowW) / 2;

        let rowY = matrixCardY + 74;

        attempts.forEach((att, rIdx) => {
            const guess = (att.guess || '').toUpperCase();
            const evaluation = att.evaluation || [];

            for (let c = 0; c < wordLen; c++) {
                const char = guess[c] || '';
                const ev = evaluation[c] || 'absent';
                let tileBg = '#787C7E'; // absent
                if (ev === 'correct') tileBg = '#146C2E'; // green
                else if (ev === 'present') tileBg = '#B08800'; // yellow/amber

                const tileX = startX + c * (tileSize + tileGap);
                drawRoundRect(ctx, tileX, rowY, tileSize, tileSize, 8, tileBg);

                if (char) {
                    drawText(ctx, char, tileX + tileSize / 2, rowY + tileSize / 2 - 1, {
                        font: `bold ${Math.round(tileSize * 0.52)}px ${FONT_FAMILY}`,
                        color: '#FFFFFF',
                        align: 'center',
                        baseline: 'middle'
                    });
                }
            }
            rowY += tileSize + rowGap;
        });

        // 提示信息与通关数据
        const timeStr = options.timeStr ? ` · 用时 ${options.timeStr}` : '';
        const modeDesc = options.isDaily ? '每日 Wordle 挑战' : '自由词书解谜';
        drawText(ctx, `模式: ${modeDesc}${timeStr}`, width / 2, rowY + 12, {
            font: `500 13px ${FONT_FAMILY}`,
            color: '#72777F',
            align: 'center'
        });

        // 底部二维码卡片
        const qrData = await getToyQrCodeData();
        await drawPosterFooter(ctx, width, Math.max(matrixCardY + matrixCardH + 20, 1070), qrData, '每日猜词，点亮智慧 · 挑战你的词汇极限');

        return canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       预览弹窗与交互逻辑
       ========================================================================== */
    function showPosterPreviewModal(dataUrl, title = '分享海报') {
        currentPosterBase64 = dataUrl;
        const modal = document.getElementById('modal-poster-preview');
        const img = document.getElementById('poster-preview-image');
        const titleEl = document.getElementById('poster-modal-title');

        if (titleEl) titleEl.innerText = title;
        if (img) img.src = dataUrl;
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function closePosterPreviewModal() {
        const modal = document.getElementById('modal-poster-preview');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async function handlePosterSaveAlbumAction() {
        if (!currentPosterBase64) return;
        await savePosterToAlbum(currentPosterBase64);
    }

    async function handlePosterShareAction() {
        if (!currentPosterBase64) return;
        await sharePosterViaToy(currentPosterBase64);
    }

    /* ==========================================================================
       业务触发入口：供各业务视图一键调用
       ========================================================================== */

    // 1. 人机对战 / 远程联机战果海报
    async function handleShareDuelResultPoster() {
        if (!isToyPlatform()) {
            if (typeof showToast === 'function') showToast('该功能仅在 B站 Toy 平台可用');
            return;
        }

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

            showPosterPreviewModal(posterDataUrl, '对决战果海报');
        } catch (e) {
            console.error('[GenerateDuelPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 2. 背单词 / 背实词小结海报
    async function handleShareStudyScorePoster() {
        if (!isToyPlatform()) {
            if (typeof showToast === 'function') showToast('该功能仅在 B站 Toy 平台可用');
            return;
        }

        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const gRes = (typeof gameResult !== 'undefined' && gameResult) ? gameResult : {};
            const isShiCi = (gRes.mode === 'shici');

            let sessionTotal = 0;
            let sessionCorrect = 0;
            let sessionMistakes = 0;
            let sessionAccuracy = 100;
            let bookTitle = '';

            if (isShiCi) {
                const pool = gRes.pool || [];
                sessionTotal = pool.length;
                sessionCorrect = gRes.p1Score !== undefined ? gRes.p1Score : sessionTotal;
                sessionAccuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
                sessionMistakes = Math.max(0, sessionTotal - sessionCorrect);
                bookTitle = '高考古诗文必背实词辨析';
            } else {
                const pool = gRes.pool || (typeof singleState !== 'undefined' && singleState.pool) || [];
                const mistakeSet = new Set(Array.isArray(gRes.sessionMistakes) ? gRes.sessionMistakes : ((typeof singleState !== 'undefined' && singleState.sessionMistakes) ? Array.from(singleState.sessionMistakes) : []));
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
                bookTitle
            });

            showPosterPreviewModal(posterDataUrl, '学习小结成绩海报');
        } catch (e) {
            console.error('[GenerateStudyPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 3. “我” 个人中心页面成绩海报
    async function handleShareMeStudyPoster() {
        if (!isToyPlatform()) {
            if (typeof showToast === 'function') showToast('该功能仅在 B站 Toy 平台可用');
            return;
        }

        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const posterDataUrl = await generateStudyPoster({
                isSession: false
            });
            showPosterPreviewModal(posterDataUrl, '学习生涯成长报告');
        } catch (e) {
            console.error('[GenerateMeStudyPoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 4. Wordle 挑战成功战报海报
    async function handleShareWordlePoster() {
        if (!isToyPlatform()) {
            if (typeof showToast === 'function') showToast('该功能仅在 B站 Toy 平台可用');
            return;
        }

        if (typeof showToast === 'function') showToast('正在生成海报...');

        try {
            const rState = (typeof riddleState !== 'undefined' && riddleState) ? riddleState : {};
            const rConfig = (typeof riddleConfig !== 'undefined' && riddleConfig) ? riddleConfig : {};

            const isDaily = Boolean(typeof isDailyWordleMode !== 'undefined' && isDailyWordleMode);
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
                timeStr
            });

            showPosterPreviewModal(posterDataUrl, 'Wordle 挑战战报海报');
        } catch (e) {
            console.error('[GenerateWordlePoster error]', e);
            if (typeof showToast === 'function') showToast('生成海报失败，请稍后重试');
        }
    }

    // 暴露给全局调用
    if (typeof window !== 'undefined') {
        window.isToyPlatform = isToyPlatform;
        window.showPosterPreviewModal = showPosterPreviewModal;
        window.closePosterPreviewModal = closePosterPreviewModal;
        window.handlePosterSaveAlbumAction = handlePosterSaveAlbumAction;
        window.handlePosterShareAction = handlePosterShareAction;

        window.handleShareDuelResultPoster = handleShareDuelResultPoster;
        window.handleShareStudyScorePoster = handleShareStudyScorePoster;
        window.handleShareMeStudyPoster = handleShareMeStudyPoster;
        window.handleShareWordlePoster = handleShareWordlePoster;

        window.generateDuelPoster = generateDuelPoster;
        window.generateStudyPoster = generateStudyPoster;
        window.generateWordlePoster = generateWordlePoster;
    }
})();

