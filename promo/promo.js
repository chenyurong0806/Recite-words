/**
 * 【词迹】60秒顶级产品宣传片核心动效与时钟驱动引擎
 * 严格遵循 120 BPM 节拍（每拍 0.5s，每小节 2.0s），纯 requestAnimationFrame + audio.currentTime 驱动
 * 物理跟随指数平滑：pos += (target - pos) * (1 - Math.exp(-k * dt))
 */

(function () {
    'use strict';

    // DOM 元素引用
    const audio = document.getElementById('bgm');
    const standbyScrim = document.getElementById('standby-scrim');
    const standbyBtn = document.getElementById('standby-cue-btn');
    const pauseIndicator = document.getElementById('pause-indicator');
    const stealthProgress = document.getElementById('stealth-progress');
    const keywordDock = document.getElementById('keyword-dock');
    const virtualCursor = document.getElementById('virtual-cursor');
    const cameraRig = document.getElementById('camera-rig');

    // 场景层 DOM
    const scenes = {
        intro: document.getElementById('scene-intro'),
        search: document.getElementById('scene-search'),
        duel: document.getElementById('scene-duel'),
        book: document.getElementById('scene-book-select'),
        recite: document.getElementById('scene-recite'),
        wordle: document.getElementById('scene-wordle'),
        cloud: document.getElementById('scene-cloud'),
        outro: document.getElementById('scene-outro')
    };

    // 场景专属背景装饰层 DOM
    const decors = {
        intro: document.getElementById('decor-intro'),
        search: document.getElementById('decor-search'),
        duel: document.getElementById('decor-duel'),
        book: document.getElementById('decor-book'),
        recite: document.getElementById('decor-recite'),
        wordle: document.getElementById('decor-wordle'),
        cloud: document.getElementById('decor-cloud')
    };

    // 对决板块子场景
    const duelSubs = {
        remote: document.getElementById('duel-sub-remote'),
        room: document.getElementById('duel-sub-room'),
        bridge: document.getElementById('duel-transition-bridge'),
        ai: document.getElementById('duel-sub-ai'),
        local: document.getElementById('duel-sub-local')
    };

    // 动画运行状态
    let isPlaying = false;
    let hasStarted = false;
    let lastTimestamp = performance.now();

    // 摄像机物理状态 (实际渲染值 vs 目标值)
    const camera = {
        x: 0, y: 0, z: 0,
        rx: 0, ry: 0, rz: 0
    };
    const targetCamera = {
        x: 0, y: 0, z: 0,
        rx: 0, ry: 0, rz: 0
    };
    const CAMERA_SMOOTH_K = 7.5; // 指数平滑系数

    // 虚拟光标状态
    const cursorState = {
        x: -100, y: -100,
        targetX: -100, targetY: -100,
        visible: false,
        clicking: false,
        k: 12.0
    };

    // 灵动环境上下文标签时间表 (简化核心关键词，2~4个字)
    const CONTEXT_BADGES = [
        // 镜头 2：查词
        { id: 'badge-search-tabs', start: 8.5, end: 14.5 },
        { id: 'badge-search-phrase', start: 10.6, end: 14.5 },
        { id: 'badge-search-freedom', start: 12.4, end: 14.5 },
        // 镜头 3：对决
        { id: 'badge-duel-remote', start: 16.8, end: 19.6 },
        { id: 'badge-room-ready', start: 19.8, end: 22.0 },
        { id: 'badge-ai-config', start: 24.2, end: 27.0 },
        { id: 'badge-tug', start: 27.4, end: 32.2 },
        { id: 'badge-penalty', start: 29.8, end: 32.2 },
        // 镜头 3.5：选择词书
        { id: 'badge-book-select', start: 32.5, end: 35.4 },
        { id: 'badge-book-toggle', start: 33.6, end: 35.4 },
        // 镜头 4：背词
        { id: 'badge-recite-mastery', start: 35.5, end: 42.5 },
        { id: 'badge-recite-shici', start: 39.5, end: 42.5 },
        // 镜头 5：Wordle
        { id: 'badge-wordle-tech', start: 42.6, end: 49.8 },
        { id: 'badge-wordle-draft', start: 44.8, end: 49.8 },
        // 镜头 6：云端实时同步
        { id: 'badge-cloud-sync', start: 50.0, end: 56.8 },
        { id: 'badge-cloud-devices', start: 52.5, end: 56.8 }
    ];

    /**
     * 辅助数值工具
     */
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    function easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }

    function easeOutQuad(x) {
        return 1 - (1 - x) * (1 - x);
    }

    function easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    /**
     * 获取页面目标 DOM 元素在屏幕视口中的绝对中心坐标
     */
    function getElementCenter(target) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    /**
     * 设置光标点击缩放状态 (无涟漪，纯物理 scale 0.72 紧实手感)
     */
    function setCursorClicking(clicking) {
        if (cursorState.clicking === clicking) return;
        cursorState.clicking = clicking;
        if (clicking) {
            virtualCursor.classList.add('clicking');
        } else {
            virtualCursor.classList.remove('clicking');
        }
    }

    /**
     * 每一帧核心调度逻辑
     */
    function renderFrame(t, dt) {
        // 1. 进度条更新 (62秒终局)
        const progressPct = clamp((t / 62) * 100, 0, 100);
        stealthProgress.style.width = progressPct + '%';

        // 2. 计算当前镜头并配置目标摄像机
        updateCameraTarget(t);

        // 3. 指数平滑更新实际摄像机姿态：pos += (target - pos) * (1 - Math.exp(-k * dt))
        const cameraFactor = 1 - Math.exp(-CAMERA_SMOOTH_K * dt);
        camera.x += (targetCamera.x - camera.x) * cameraFactor;
        camera.y += (targetCamera.y - camera.y) * cameraFactor;
        camera.z += (targetCamera.z - camera.z) * cameraFactor;
        camera.rx += (targetCamera.rx - camera.rx) * cameraFactor;
        camera.ry += (targetCamera.ry - camera.ry) * cameraFactor;
        camera.rz += (targetCamera.rz - camera.rz) * cameraFactor;

        cameraRig.style.transform = `
            translate3d(${camera.x.toFixed(2)}px, ${camera.y.toFixed(2)}px, ${camera.z.toFixed(2)}px)
            rotateX(${camera.rx.toFixed(2)}deg)
            rotateY(${camera.ry.toFixed(2)}deg)
            rotateZ(${camera.rz.toFixed(2)}deg)
        `;

        // 4. 灵动环境上下文标签更新
        updateContextBadges(t);

        // 5. 各分镜专属内部物理与状态驱动
        renderScene1(t);
        renderScene2(t);
        renderScene3(t);
        renderSceneBook(t);
        renderScene4(t);
        renderScene5(t);
        renderScene6(t);
        renderScene7(t);

        // 6. 更新虚拟光标平滑位置
        if (cursorState.visible) {
            virtualCursor.style.display = 'block';
            const cursorFactor = 1 - Math.exp(-cursorState.k * dt);
            cursorState.x += (cursorState.targetX - cursorState.x) * cursorFactor;
            cursorState.y += (cursorState.targetY - cursorState.y) * cursorFactor;
            virtualCursor.style.left = `${cursorState.x.toFixed(1)}px`;
            virtualCursor.style.top = `${cursorState.y.toFixed(1)}px`;
        } else {
            virtualCursor.style.display = 'none';
        }
    }

    /**
     * 摄像机路径规划 (多轴 3D 运镜，Apple 空间感)
     */
    function updateCameraTarget(t) {
        // 重置所有场景层激活类
        Object.keys(scenes).forEach(k => {
            if (scenes[k]) {
                scenes[k].classList.remove('active');
                scenes[k].style.display = 'none';
            }
        });
        Object.keys(decors).forEach(k => {
            if (decors[k]) decors[k].classList.remove('active');
        });

        if (t < 7.5) {
            // 镜头 1：【开篇】(0.00 - 7.50s)
            scenes.intro.classList.add('active');
            scenes.intro.style.display = 'flex';
            if (decors.intro) decors.intro.classList.add('active');
            cursorState.visible = false;

            if (t < 1.8) {
                // 3D 掠过时有动态俯视运动
                const p = clamp(t / 1.8, 0, 1);
                targetCamera.x = 0; targetCamera.y = lerp(40, -10, p); targetCamera.z = lerp(-60, 20, p);
                targetCamera.rx = lerp(8, 2, p); targetCamera.ry = 0; targetCamera.rz = 0;
            } else if (t < 3.2) {
                // 收缩聚拢 Logo
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 0;
                targetCamera.rx = 0; targetCamera.ry = 0; targetCamera.rz = 0;
            } else {
                // 匀速后撤 (Dolly Out)
                const p = clamp((t - 3.2) / 4.3, 0, 1);
                targetCamera.z = -110 * easeOutQuad(p);
                targetCamera.rx = 3 * p;
            }
        } else if (t < 15.5) {
            // 镜头 2：【查词功能】(7.50 - 15.50s)
            scenes.search.classList.add('active');
            scenes.search.style.display = 'flex';
            if (decors.search) decors.search.classList.add('active');

            if (t < 12.0) {
                targetCamera.x = 0; targetCamera.y = 12; targetCamera.z = -20;
                targetCamera.rx = 2; targetCamera.ry = 0;
            } else if (t < 14.2) {
                const p = clamp((t - 12.0) / 1.0, 0, 1);
                targetCamera.x = lerp(0, -90, p);
                targetCamera.y = lerp(12, 40, p);
                targetCamera.z = lerp(-20, 140, p);
                targetCamera.rx = 4;
            } else {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = -80;
                targetCamera.rx = 0;
            }
        } else if (t < 32.5) {
            // 镜头 3：【爆发点 · 对决】(15.50 - 32.50s)
            scenes.duel.classList.add('active');
            scenes.duel.style.display = 'flex';
            if (decors.duel) decors.duel.classList.add('active');

            if (t < 19.8) {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 10;
                targetCamera.rx = 0; targetCamera.ry = 0;
            } else if (t < 22.0) {
                targetCamera.x = 0; targetCamera.y = 5; targetCamera.z = 40;
                targetCamera.rx = 2; targetCamera.ry = 0;
            } else if (t < 24.2) {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 60;
                targetCamera.rx = 0; targetCamera.ry = 0;
            } else if (t < 27.2) {
                targetCamera.x = 0; targetCamera.y = 10; targetCamera.z = 30;
                targetCamera.rx = 3; targetCamera.ry = 0;
            } else {
                targetCamera.x = 0; targetCamera.y = -10; targetCamera.z = -30;
                targetCamera.rx = 5; targetCamera.ry = 0;
            }
        } else if (t < 35.5) {
            // 镜头 3.5：【选择词书展示】(32.50 - 35.50s)
            scenes.book.classList.add('active');
            scenes.book.style.display = 'flex';
            if (decors.book) decors.book.classList.add('active');

            targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 10;
            targetCamera.rx = 2; targetCamera.ry = 0; targetCamera.rz = 0;
        } else if (t < 42.5) {
            // 镜头 4：【背单词与背实词】(35.50 - 42.50s)
            scenes.recite.classList.add('active');
            scenes.recite.style.display = 'flex';
            if (decors.recite) decors.recite.classList.add('active');

            if (t < 39.5) {
                // 聚焦左侧英语默写
                targetCamera.x = 180; targetCamera.y = -10; targetCamera.z = 40;
                targetCamera.ry = -6; targetCamera.rx = 0;
            } else {
                // 聚焦右侧背实词
                targetCamera.x = -180; targetCamera.y = -10; targetCamera.z = 40;
                targetCamera.ry = 6; targetCamera.rx = 0;
            }
        } else if (t < 50.0) {
            // 镜头 5：【Wordle 解谜】(42.50 - 50.00s)
            scenes.wordle.classList.add('active');
            scenes.wordle.style.display = 'flex';
            if (decors.wordle) decors.wordle.classList.add('active');

            if (t < 45.0) {
                targetCamera.x = 0; targetCamera.y = 30; targetCamera.z = 80;
                targetCamera.rx = 14; targetCamera.ry = 0;
            } else if (t < 48.0) {
                targetCamera.x = 0; targetCamera.y = -10; targetCamera.z = 120;
                targetCamera.rx = 16; targetCamera.ry = 0;
            } else {
                // 获胜卡片特写
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 140;
                targetCamera.rx = 4; targetCamera.ry = 0;
            }
        } else if (t < 57.0) {
            // 镜头 6：【云端同步与多端适配】(50.00 - 57.00s)
            scenes.cloud.classList.add('active');
            scenes.cloud.style.display = 'flex';
            if (decors.cloud) decors.cloud.classList.add('active');

            if (t < 52.5) {
                targetCamera.x = 0; targetCamera.y = 70; targetCamera.z = -10;
                targetCamera.rx = 4; targetCamera.ry = 0;
            } else {
                // 大范围后撤俯瞰三端画廊
                targetCamera.x = 0; targetCamera.y = -20; targetCamera.z = -180;
                targetCamera.rx = 12; targetCamera.ry = -6;
            }
        } else {
            // 镜头 7：【收束】(57.00 - 63.00s)
            scenes.outro.classList.add('active');
            scenes.outro.style.display = 'flex';
            cursorState.visible = false;

            targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 0;
            targetCamera.rx = 0; targetCamera.ry = 0; targetCamera.rz = 0;
        }
    }

    /**
     * 灵动上下文标签更新
     */
    function updateContextBadges(t) {
        CONTEXT_BADGES.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;
            if (t >= item.start && t <= item.end) {
                el.classList.add('pop');
            } else {
                el.classList.remove('pop');
            }
        });

        // 终局镜头确保右上角关键词停靠层完全清空
        if (keywordDock) {
            keywordDock.innerHTML = '';
        }
    }

    /**
     * =========================================================================
     * 镜头 1 内部驱动：高速 3D 掠过真实首页 DOM -> 聚拢 Logo 立方体 -> 亮色标题 -> 三胶囊弹出
     * =========================================================================
     */
    function renderScene1(t) {
        if (t >= 8.0) return;

        const stage = document.getElementById('intro-flyover-stage');
        const board = document.getElementById('intro-home-board');
        const scanline = document.getElementById('home-scanline');
        const heroLockup = document.getElementById('intro-hero-lockup');
        const logoCube = document.getElementById('intro-logo-cube');
        const pill1 = document.getElementById('intro-pill-1');
        const pill2 = document.getElementById('intro-pill-2');
        const pill3 = document.getElementById('intro-pill-3');

        // 0.0s - 1.8s：掠过首页，增加运动感与镜头感，从底部掠向顶部完整展示全貌
        if (t < 1.8) {
            const p = clamp(t / 1.8, 0, 1);
            const easeP = easeInOutQuad(p);

            stage.style.display = 'flex';
            stage.style.opacity = '1';

            const rotX = lerp(46, 6, easeP);
            const transY = lerp(200, -50, easeP);
            const scale = lerp(1.08, 0.98, easeP);

            board.style.transform = `rotateX(${rotX}deg) translateY(${transY}px) scale(${scale})`;
            board.style.opacity = '1';

            const scanTop = lerp(-30, 130, p);
            scanline.style.top = `${scanTop}%`;

            heroLockup.style.opacity = '0';
            heroLockup.style.transform = 'scale(0.6) translateY(40px)';
        } else if (t < 2.8) {
            // 1.8s - 2.8s：高速流畅收拢首页，并弹性弹出 Logo 和词迹
            const p = clamp((t - 1.8) / 1.0, 0, 1);
            const easeP = easeOutBack(p);

            board.style.transform = `rotateX(${lerp(6, 0, easeP)}deg) translateY(${lerp(-50, -20, easeP)}px) scale(${lerp(0.98, 0.15, easeP)})`;
            board.style.opacity = String(1 - p * p);
            stage.style.opacity = String(1 - p);

            // Logo 自然展开
            heroLockup.style.opacity = String(clamp(p * 1.5, 0, 1));
            heroLockup.style.transform = `scale(${lerp(0.6, 1, easeP)}) translateY(${lerp(40, 0, easeP)}px)`;
            logoCube.style.transform = `scale(${lerp(0.4, 1, easeP)})`;
        } else {
            stage.style.display = 'none';
            heroLockup.style.opacity = '1';
            heroLockup.style.transform = 'scale(1) translateY(0)';
            logoCube.style.transform = 'scale(1)';
        }

        // 3.4s, 4.0s, 4.6s 三个子胶囊依次灵动弹出
        if (t >= 3.4) pill1.classList.add('pop'); else pill1.classList.remove('pop');
        if (t >= 4.0) pill2.classList.add('pop'); else pill2.classList.remove('pop');
        if (t >= 4.6) pill3.classList.add('pop'); else pill3.classList.remove('pop');
    }

    /**
     * =========================================================================
     * 镜头 2 内部驱动：多标签页切换 + 词组 vs 链接对比 + 添加词书与编辑释义
     * =========================================================================
     */
    function renderScene2(t) {
        if (t < 7.0 || t > 16.0) return;

        const win = document.getElementById('search-mock-window');
        const tabAbandon = document.getElementById('tab-abandon');
        const tabCapability = document.getElementById('tab-capability');
        const searchInputText = document.getElementById('search-input-text');
        const cardWord = document.getElementById('search-card-word');
        const cardSenses = document.getElementById('search-card-senses');
        const phraseAudioBtn = document.getElementById('phrase-audio-btn');
        const modalAdd = document.getElementById('modal-add-book-demo');
        const modalEdit = document.getElementById('modal-edit-meaning-demo');
        const btnAdd = document.getElementById('btn-add-to-book-demo');
        const btnEdit = document.getElementById('btn-edit-meaning-demo');

        // 光标显示控制
        cursorState.visible = (t >= 8.2 && t <= 14.5);

        // 标签状态的函数式确定 (消除 seek 造成的瞬时状态不一致)
        if (t >= 9.1 && t < 10.2) {
            tabAbandon.classList.remove('active');
            tabCapability.classList.add('active');
            searchInputText.innerText = 'capability';
            cardWord.innerHTML = 'capability <span class="word-head-phone">/ˌkeɪpəˈbɪləti/</span>';
            cardSenses.innerHTML = '<strong>n.</strong> 才能，能力；容量；性能；生产力';
        } else {
            tabCapability.classList.remove('active');
            tabAbandon.classList.add('active');
            searchInputText.innerText = 'abandon';
            cardWord.innerHTML = 'abandon <span class="word-head-phone">/əˈbændən/</span>';
            cardSenses.innerHTML = '<strong>v.</strong> 放弃，舍弃；遗弃，离弃；沉溺于，纵情于<br><strong>n.</strong> 放任，纵情';
        }

        // 光标移动与点击轨迹
        if (t >= 8.2 && t < 9.5) {
            const pt = getElementCenter('tab-capability');
            cursorState.targetX = pt.x;
            cursorState.targetY = pt.y;
            setCursorClicking(t >= 9.1 && t < 9.35);
        } else if (t >= 9.5 && t < 11.2) {
            const pt = getElementCenter('tab-abandon');
            cursorState.targetX = pt.x;
            cursorState.targetY = pt.y;
            setCursorClicking(t >= 10.2 && t < 10.45);
        } else if (t >= 12.0 && t < 13.0) {
            const pt = getElementCenter('btn-add-to-book-demo');
            cursorState.targetX = pt.x;
            cursorState.targetY = pt.y;
            setCursorClicking(t >= 12.4 && t < 12.65);
        } else if (t >= 13.0 && t < 14.4) {
            const pt = getElementCenter('btn-edit-meaning-demo');
            cursorState.targetX = pt.x;
            cursorState.targetY = pt.y;
            setCursorClicking(t >= 13.4 && t < 13.65);
        } else {
            setCursorClicking(false);
        }

        // 音频图标联动
        if (t >= 10.8 && t <= 12.2) {
            phraseAudioBtn.style.transform = 'scale(1.15)';
            phraseAudioBtn.style.background = 'var(--md-sys-color-primary)';
            phraseAudioBtn.style.color = '#FFFFFF';
        } else {
            phraseAudioBtn.style.transform = 'scale(1)';
            phraseAudioBtn.style.background = 'var(--md-sys-color-primary-container)';
            phraseAudioBtn.style.color = 'var(--md-sys-color-primary)';
        }

        // 弹窗显隐
        if (t >= 12.4 && t < 13.1) {
            modalAdd.classList.add('show');
            btnAdd.classList.add('highlight');
        } else {
            modalAdd.classList.remove('show');
            btnAdd.classList.remove('highlight');
        }

        if (t >= 13.4 && t < 14.4) {
            modalEdit.classList.add('show');
            btnEdit.classList.add('highlight');
        } else {
            modalEdit.classList.remove('show');
            btnEdit.classList.remove('highlight');
        }

        // 14.4s 蓄力微缩
        if (t >= 14.4) {
            const p = clamp((t - 14.4) / 0.8, 0, 1);
            win.style.transform = `scale(${lerp(1, 0.9, p)})`;
            win.style.filter = `brightness(${lerp(1, 0.92, p)})`;
        } else {
            win.style.transform = 'scale(1)';
            win.style.filter = 'none';
        }
    }

    /**
     * =========================================================================
     * 镜头 3 内部驱动：远程联机 -> 真实房间 -> 逻辑过渡桥接 -> 人机对战设置 -> 希沃同屏拔河
     * =========================================================================
     */
    function renderScene3(t) {
        if (t < 15.0 || t > 33.0) return;

        // 切换子模式视图状态
        Object.keys(duelSubs).forEach(k => {
            if (duelSubs[k]) {
                duelSubs[k].classList.remove('active');
                duelSubs[k].style.display = 'none';
            }
        });

        // 阶段 1：远程联机大厅与实时对决弹窗 (15.50 - 19.80s)
        if (t < 19.8) {
            duelSubs.remote.classList.add('active');
            duelSubs.remote.style.display = 'block';

            const inviteModal = document.getElementById('modal-match-invite');
            const countdownNum = document.getElementById('invite-countdown-num');

            if (t >= 17.2) {
                inviteModal.classList.add('pop');
                const cd = Math.max(12, Math.floor(15 - (t - 17.2)));
                countdownNum.innerText = String(cd);
            } else {
                inviteModal.classList.remove('pop');
            }

            if (t >= 18.6 && t < 19.8) {
                cursorState.visible = true;
                const pt = getElementCenter('btn-invite-accept');
                cursorState.targetX = pt.x;
                cursorState.targetY = pt.y;

                if (t >= 19.4 && t < 19.65) {
                    setCursorClicking(true);
                    document.getElementById('btn-invite-accept').style.transform = 'scale(0.92)';
                } else {
                    setCursorClicking(false);
                    document.getElementById('btn-invite-accept').style.transform = 'scale(1)';
                }
            } else {
                cursorState.visible = false;
            }
        }
        // 阶段 2：进入真实房间 DOM (19.80 - 22.00s)
        else if (t < 22.0) {
            cursorState.visible = false;
            setCursorClicking(false);
            duelSubs.room.classList.add('active');
            duelSubs.room.style.display = 'block';
        }
        // 阶段 3：板块过渡桥接层：“没有人在线？ 🤔” -> “试试人机对战 🤖 →” (22.00 - 24.20s)
        else if (t < 24.2) {
            cursorState.visible = false;
            duelSubs.bridge.style.display = 'flex';

            const bridgeWonder = document.getElementById('bridge-wonder');
            const bridgePrompt = document.getElementById('bridge-prompt');

            if (t >= 22.1) bridgeWonder.classList.add('pop'); else bridgeWonder.classList.remove('pop');
            if (t >= 22.9) bridgePrompt.classList.add('pop'); else bridgePrompt.classList.remove('pop');
        }
        // 阶段 4：人机对战配置卡片与 1~9段滑块平滑拉升 (24.20 - 27.20s)
        else if (t < 27.2) {
            cursorState.visible = false;
            duelSubs.ai.classList.add('active');
            duelSubs.ai.style.display = 'block';

            const sliderFill = document.getElementById('ai-slider-fill');
            const sliderThumb = document.getElementById('ai-slider-thumb');
            const rankText = document.getElementById('ai-rank-text');

            if (t >= 24.6 && t <= 26.2) {
                const p = clamp((t - 24.6) / 1.6, 0, 1);
                const easeP = easeInOutQuad(p);
                const pct = lerp(11, 88, easeP);
                sliderFill.style.width = pct + '%';
                sliderThumb.style.left = pct + '%';

                const rankVal = Math.min(8, Math.floor(lerp(1, 8.9, easeP)));
                if (rankVal <= 3) {
                    rankText.innerText = `${rankVal}段 · ${rankVal * 80}/299分`;
                } else if (rankVal <= 6) {
                    rankText.innerText = `${rankVal}段 熟练 · 480/599分`;
                } else {
                    rankText.innerText = `8段 宗师进阶 · 720/799分`;
                }
            } else if (t > 26.2) {
                sliderFill.style.width = '88%';
                sliderThumb.style.left = '88%';
                rankText.innerText = '8段 宗师进阶 · 720/799分';
            }
        }
        // 阶段 5：希沃同屏拔河物理强拉与答错惩罚 (27.20 - 32.50s)
        else {
            cursorState.visible = false;
            duelSubs.local.classList.add('active');
            duelSubs.local.style.display = 'block';

            const tugFillP1 = document.getElementById('local-tug-fill-p1');
            const tugFillP2 = document.getElementById('local-tug-fill-p2');
            const tugPin = document.getElementById('local-tug-pin');
            const p2Overlay = document.getElementById('p2-freeze-overlay');
            const p2FreezeNum = document.getElementById('p2-freeze-num');
            const p2FreezeBar = document.getElementById('p2-freeze-bar-inner');
            const p1OptA = document.getElementById('p1-opt-a');
            const p2OptB = document.getElementById('p2-opt-b');

            // 28.2s 前红蓝双方保持初始中立配色
            // 28.2s 红方答对，红方领先！进度条红方占比扩大 (50% -> 64%)，指针移至 64%
            if (t >= 28.2) {
                const p = clamp((t - 28.2) / 0.5, 0, 1);
                const ep = easeOutBack(p);
                const redPct = lerp(50, 64, ep);
                tugPin.style.left = `calc(${redPct}% - 4px)`;
                tugFillP1.style.width = `${redPct}%`;
                tugFillP2.style.width = `${100 - redPct}%`;

                p1OptA.classList.add('highlight');
                p1OptA.style.background = '#146C2E';
                p1OptA.style.borderColor = '#146C2E';
                p1OptA.style.color = '#FFFFFF';
                p1OptA.innerText = 'A. 放弃，舍弃 ✓';
            } else {
                tugPin.style.left = 'calc(50% - 4px)';
                tugFillP1.style.width = '50%';
                tugFillP2.style.width = '50%';

                p1OptA.classList.remove('highlight');
                p1OptA.style.background = '';
                p1OptA.style.borderColor = '';
                p1OptA.style.color = '';
                p1OptA.innerText = 'A. 放弃，舍弃';
            }

            // 29.8s 蓝方答错触发惩罚冻结
            if (t >= 29.8) {
                p2OptB.style.background = '#FFDAD6';
                p2OptB.style.borderColor = '#BA1A1A';
                p2OptB.style.color = '#BA1A1A';
                p2OptB.innerText = 'B. 坚持 (答错) ✕';
                p2Overlay.classList.add('active');

                const elapsed = t - 29.8;
                const remaining = Math.max(0, 3.0 - elapsed);
                p2FreezeNum.innerText = String(Math.ceil(remaining));
                p2FreezeBar.style.width = `${(remaining / 3.0) * 100}%`;
            } else {
                p2OptB.style.background = '';
                p2OptB.style.borderColor = '';
                p2OptB.style.color = '';
                p2OptB.innerText = 'B. 坚持，保持';
                p2Overlay.classList.remove('active');
            }
        }
    }

    /**
     * =========================================================================
     * 镜头 3.5 内部驱动：【选择词书展示】(32.50 - 35.50s)
     * =========================================================================
     */
    function renderSceneBook(t) {
        if (t < 32.0 || t > 36.0) return;

        const stage = document.getElementById('book-selection-stage');
        if (!stage) return;

        if (t >= 32.5 && t <= 35.5) {
            const p = clamp((t - 32.5) / 0.8, 0, 1);
            const easeP = easeOutBack(p);
            stage.style.transform = `scale(${lerp(0.88, 1, easeP)}) rotateX(${lerp(10, 0, easeP)}deg)`;
            stage.style.opacity = String(p);

            // 33.2s - 34.2s 光标移向并点击《高考3500》
            if (t >= 33.2 && t <= 34.6) {
                cursorState.visible = true;
                // 点击高考3500卡片右上侧勾选框区域
                cursorState.targetX = window.innerWidth / 2 + 260;
                cursorState.targetY = window.innerHeight / 2 - 130;
                setCursorClicking(t >= 33.7 && t <= 33.95);
            } else {
                cursorState.visible = false;
                setCursorClicking(false);
            }
        }
    }

    /**
     * =========================================================================
     * 镜头 4 内部驱动：看中文释义写英文 + 逐字默写标绿 + 填完后加星动画 + 文言背实词动态选择
     * =========================================================================
     */
    function renderScene4(t) {
        if (t < 35.0 || t > 43.0) return;

        cursorState.visible = false;

        const dictationBar = document.getElementById('dictation-display-bar');
        const dictationBadge = document.getElementById('dictation-badge');
        const wordLetters = ['a', 'b', 'a', 'n', 'd', 'o', 'n'];

        // 35.8s - 37.6s 逐字输入 abandon
        const typeSchedule = [
            { time: 35.8, len: 1, key: 'key-a' },
            { time: 36.1, len: 2, key: 'key-b' },
            { time: 36.4, len: 3, key: 'key-a' },
            { time: 36.7, len: 4, key: 'key-n' },
            { time: 37.0, len: 5, key: 'key-d' },
            { time: 37.3, len: 6, key: 'key-o' },
            { time: 37.6, len: 7, key: 'key-n' }
        ];

        let currentLen = 0;
        let activeKeyId = null;

        typeSchedule.forEach(item => {
            if (t >= item.time) currentLen = item.len;
            if (t >= item.time && t < item.time + 0.16) activeKeyId = item.key;
        });

        // 渲染输入展示槽
        if (currentLen === 0) {
            dictationBar.innerText = '_ _ _ _ _ _ _';
            dictationBar.classList.remove('success-state');
            dictationBadge.innerText = '7 字符';
            dictationBadge.classList.remove('success-badge');
        } else if (currentLen < 7) {
            const typed = wordLetters.slice(0, currentLen).join(' ');
            const remaining = ' _'.repeat(7 - currentLen);
            dictationBar.innerText = typed + remaining;
            dictationBar.classList.remove('success-state');
            dictationBadge.innerText = `${currentLen} 字符`;
            dictationBadge.classList.remove('success-badge');
        } else {
            dictationBar.innerText = 'a b a n d o n';
            if (t >= 37.8) {
                dictationBar.classList.add('success-state');
                dictationBadge.innerText = '✓ 拼写正确 (7字符)';
                dictationBadge.classList.add('success-badge');
            } else {
                dictationBar.classList.remove('success-state');
                dictationBadge.innerText = '7 字符';
                dictationBadge.classList.remove('success-badge');
            }
        }

        // 高光按键
        ['key-a', 'key-b', 'key-d', 'key-n', 'key-o'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === activeKeyId) el.classList.add('pressed');
                else el.classList.remove('pressed');
            }
        });

        // 用户明确要求：提高加星动画速度，字母填完后极速连贯爆亮 (37.8s - 38.2s)
        for (let i = 1; i <= 5; i++) {
            const diamond = document.getElementById(`diamond-${i}`);
            const triggerTime = 37.8 + (i - 1) * 0.08;
            if (t >= triggerTime) {
                diamond.innerText = '◆';
                diamond.classList.add('filled', 'anim-gain');
            } else {
                diamond.innerText = '◇';
                diamond.classList.remove('filled', 'anim-gain');
            }
        }

        // 独创文言背实词：一开始不选中，聚焦在实词卡片时再动态选择 (40.2s 动态选中)
        const drawer = document.getElementById('shici-drawer-preview');
        const shiciOptA = document.getElementById('shici-opt-a');

        if (t >= 40.2) {
            shiciOptA.classList.add('highlight');
            shiciOptA.style.background = '#006874';
            shiciOptA.style.borderColor = '#006874';
            shiciOptA.style.color = '#FFFFFF';
            shiciOptA.innerHTML = '<span>A. [形容词] 悲伤，悲痛 ✓</span>';

            drawer.style.maxHeight = '140px';
            drawer.style.opacity = '1';
        } else {
            shiciOptA.classList.remove('highlight');
            shiciOptA.style.background = '';
            shiciOptA.style.borderColor = '';
            shiciOptA.style.color = '';
            shiciOptA.innerHTML = '<span>A. [形容词] 悲伤，悲痛</span>';

            drawer.style.maxHeight = '0px';
            drawer.style.opacity = '0';
        }
    }

    /**
     * =========================================================================
     * 镜头 5 内部驱动：Wordle 极速翻转 + 0:00正向计时 + 精确提示栏 + 草稿校验 + 顶部释义替换
     * =========================================================================
     */
    function renderScene5(t) {
        if (t < 42.0 || t > 51.0) return;

        // 1. 动态计时器从 00:00 开始递增
        const timerText = document.getElementById('riddle-timer-text');
        if (timerText) {
            const elapsed = Math.floor(Math.max(0, t - 42.5));
            timerText.innerText = '00:0' + Math.min(6, elapsed);
        }

        // 2. 第 1 行 3D 矩阵极速翻转 (猜词 SPENT: S=灰, P=黄, E=绿, N=灰, T=绿)
        const tilesRow1 = [
            { id: 'tile-1-1', type: 'absent', time: 42.80, keyId: 'rk-s' },
            { id: 'tile-1-2', type: 'present', time: 42.95, keyId: 'rk-p' },
            { id: 'tile-1-3', type: 'correct', time: 43.10, keyId: 'rk-e' },
            { id: 'tile-1-4', type: 'absent', time: 43.25, keyId: 'rk-n' },
            { id: 'tile-1-5', type: 'correct', time: 43.40, keyId: 'rk-t' }
        ];

        tilesRow1.forEach(item => {
            const tile = document.getElementById(item.id);
            const key = document.getElementById(item.keyId);
            if (t >= item.time) {
                tile.classList.add(item.type);
                if (key) {
                    if (item.type === 'correct') { key.style.background = '#146C2E'; key.style.color = '#fff'; }
                    else if (item.type === 'present') { key.style.background = '#B26A00'; key.style.color = '#fff'; }
                    else if (item.type === 'absent') { key.style.background = '#535F70'; key.style.color = '#fff'; }
                }
            } else {
                tile.classList.remove('correct', 'present', 'absent');
                if (key) { key.style.background = ''; key.style.color = ''; }
            }
        });

        // 3. 动态多态提示栏：默认阶梯提示 -> 猜中后替换为释义栏 (不遮挡棋盘)
        const promptBanner = document.getElementById('riddle-prompt-banner');
        const hintView = document.getElementById('prompt-hint-view');
        const successView = document.getElementById('prompt-success-view');

        if (t >= 48.2) {
            if (promptBanner) promptBanner.classList.add('success-mode');
            if (hintView) hintView.style.display = 'none';
            if (successView) successView.style.display = 'flex';
        } else {
            if (promptBanner) promptBanner.classList.remove('success-mode');
            if (hintView) hintView.style.display = 'flex';
            if (successView) successView.style.display = 'none';
        }

        // 4. 独创草稿行逐字输入 A-D-E-P-T (44.6s - 46.2s，按实际演示单词精确输入)
        const draftLetters = ['A', 'D', 'E', 'P', 'T'];
        const draftSchedule = [
            { time: 44.6, len: 1, key: 'rk-a' },
            { time: 45.0, len: 2, key: 'rk-d' },
            { time: 45.4, len: 3, key: 'rk-e' },
            { time: 45.8, len: 4, key: 'rk-p' },
            { time: 46.2, len: 5, key: 'rk-t' }
        ];

        let draftLen = 0;
        let activeRk = null;

        draftSchedule.forEach(item => {
            if (t >= item.time) draftLen = item.len;
            if (t >= item.time && t < item.time + 0.18) activeRk = item.key;
        });

        for (let i = 1; i <= 5; i++) {
            const dt = document.getElementById(`draft-${i}`);
            if (dt) {
                if (i <= draftLen) {
                    dt.innerText = draftLetters[i - 1];
                    dt.style.borderColor = 'var(--md-sys-color-primary)';
                    dt.style.background = '#FFFFFF';
                } else {
                    dt.innerText = '';
                    dt.style.borderColor = '';
                    dt.style.background = '';
                }
            }
        }

        // 键盘按键轻微下沉
        ['rk-a', 'rk-d', 'rk-e', 'rk-p', 'rk-t'].forEach(kId => {
            const el = document.getElementById(kId);
            if (el) {
                if (kId === activeRk) el.classList.add('pressed');
                else el.classList.remove('pressed');
            }
        });

        // 5. 提交草稿并触发第 2 行主阵列校验 (46.8s - 48.0s)
        const btnSubmit = document.getElementById('btn-submit-draft');
        if (t >= 46.5 && t < 47.3) {
            cursorState.visible = true;
            const pt = getElementCenter('btn-submit-draft');
            cursorState.targetX = pt.x;
            cursorState.targetY = pt.y;
            setCursorClicking(t >= 46.8 && t < 47.05);
        } else {
            setCursorClicking(false);
            if (t >= 47.3) cursorState.visible = false;
        }

        // 第 2 行接收单词 ADEPT 并校验全绿翻转
        const row2Tiles = [
            { id: 'tile-2-1', letter: 'A', type: 'correct', time: 47.4, keyId: 'rk-a' },
            { id: 'tile-2-2', letter: 'D', type: 'correct', time: 47.55, keyId: 'rk-d' },
            { id: 'tile-2-3', letter: 'E', type: 'correct', time: 47.7, keyId: 'rk-e' },
            { id: 'tile-2-4', letter: 'P', type: 'correct', time: 47.85, keyId: 'rk-p' },
            { id: 'tile-2-5', letter: 'T', type: 'correct', time: 48.0, keyId: 'rk-t' }
        ];

        if (t >= 47.1) {
            row2Tiles.forEach(item => {
                const t2 = document.getElementById(item.id);
                const k2 = document.getElementById(item.keyId);
                if (t2) {
                    t2.innerText = item.letter;
                    if (t >= item.time) {
                        t2.classList.add(item.type);
                        if (k2) {
                            k2.style.background = '#146C2E';
                            k2.style.color = '#fff';
                        }
                    } else {
                        t2.classList.remove('correct', 'present', 'absent');
                        t2.style.borderColor = 'var(--md-sys-color-primary)';
                        t2.style.background = '#FFFFFF';
                    }
                }
            });
        } else {
            for (let i = 1; i <= 5; i++) {
                const t2 = document.getElementById(`tile-2-${i}`);
                if (t2) {
                    t2.innerText = '';
                    t2.classList.remove('correct', 'present', 'absent');
                    t2.style.borderColor = '';
                    t2.style.background = '';
                }
            }
        }
    }

    /**
     * =========================================================================
     * 镜头 6 内部驱动：云端同步流 + 真实 DOM 截图多端 3D 悬浮画廊
     * =========================================================================
     */
    function renderScene6(t) {
        if (t < 49.5 || t > 57.5) return;

        cursorState.visible = false;

        const syncIcon = document.getElementById('sync-icon');
        const syncText = document.getElementById('sync-btn-text');

        // 逐个从中弹出的数据同步项胶囊：学习记录、等级分、词书 (50.4s - 51.6s)
        const pillRecord = document.getElementById('sync-pill-record');
        const pillRank = document.getElementById('sync-pill-rank');
        const pillBook = document.getElementById('sync-pill-book');

        if (pillRecord) {
            if (t >= 50.4) pillRecord.classList.add('pop');
            else pillRecord.classList.remove('pop');
        }
        if (pillRank) {
            if (t >= 51.0) pillRank.classList.add('pop');
            else pillRank.classList.remove('pop');
        }
        if (pillBook) {
            if (t >= 51.6) pillBook.classList.add('pop');
            else pillBook.classList.remove('pop');
        }

        // 50.0s - 52.2s 同步中 -> 52.2s 已同步
        if (t >= 52.2) {
            if (syncIcon) {
                syncIcon.innerText = 'check_circle';
                syncIcon.classList.remove('spinning');
                syncIcon.style.color = '#146C2E';
            }
            if (syncText) {
                syncText.innerText = '已同步';
                syncText.style.color = '#146C2E';
            }
        } else {
            if (syncIcon) {
                syncIcon.innerText = 'sync';
                syncIcon.classList.add('spinning');
                syncIcon.style.color = '';
            }
            if (syncText) {
                syncText.innerText = '同步数据中...';
                syncText.style.color = '';
            }
        }

        // 三端设备 3D 浮动视差
        const desktop = document.getElementById('device-desktop');
        const mobile = document.getElementById('device-mobile');
        const seewo = document.getElementById('device-seewo');

        const floatTime = t * 1.5;
        const dFloat = Math.sin(floatTime) * 6;
        const mFloat = Math.cos(floatTime * 1.2) * 8;
        const sFloat = Math.sin(floatTime * 0.8) * 5;

        if (desktop) desktop.style.transform = `translate3d(-240px, ${-10 + dFloat}px, -60px) rotateY(15deg) rotateX(${-dFloat * 0.5}deg)`;
        if (mobile) mobile.style.transform = `translate3d(300px, ${20 + mFloat}px, 80px) rotateY(-12deg) rotateX(${mFloat * 0.6}deg)`;
        if (seewo) seewo.style.transform = `translate3d(40px, ${-90 + sFloat}px, -180px) rotateX(${10 + sFloat * 0.4}deg)`;
    }

    /**
     * =========================================================================
     * 镜头 7 内部驱动：纯白Logo + 亮色标题 + 三大胶囊 + 商业网址淡入
     * =========================================================================
     */
    function renderScene7(t) {
        if (t < 56.5) return;

        cursorState.visible = false;

        const p1 = document.getElementById('outro-pill-1');
        const p2 = document.getElementById('outro-pill-2');
        const p3 = document.getElementById('outro-pill-3');
        const urlBanner = document.getElementById('outro-url');

        if (t >= 58.5) p1.classList.add('pop'); else p1.classList.remove('pop');
        if (t >= 59.2) p2.classList.add('pop'); else p2.classList.remove('pop');
        if (t >= 59.9) p3.classList.add('pop'); else p3.classList.remove('pop');
        if (t >= 60.6) urlBanner.classList.add('show'); else urlBanner.classList.remove('show');
    }

    /**
     * requestAnimationFrame 主时钟循环
     */
    function mainLoop(now) {
        const dt = clamp((now - lastTimestamp) / 1000, 0.001, 0.1);
        lastTimestamp = now;

        if (isPlaying && audio) {
            const currentTime = audio.currentTime;
            renderFrame(currentTime, dt);

            // 62.5秒播放完毕维持终局静帧
            if (currentTime >= 62.5) {
                audio.pause();
                isPlaying = false;
            }
        }

        requestAnimationFrame(mainLoop);
    }

    /**
     * 播放 / 暂停切换器
     */
    function togglePlayback() {
        if (!hasStarted) {
            hasStarted = true;
            standbyScrim.classList.add('dismissed');
        }

        if (audio.paused) {
            audio.play().then(() => {
                isPlaying = true;
                pauseIndicator.classList.remove('show');
            }).catch(err => {
                console.warn('播放被阻止或音频资源未就绪:', err);
            });
        } else {
            audio.pause();
            isPlaying = false;
            pauseIndicator.classList.add('show');
        }
    }

    // 事件监听绑定
    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayback();
        } else if (e.code === 'ArrowRight') {
            audio.currentTime = Math.min(62.5, audio.currentTime + 5);
            renderFrame(audio.currentTime, 0.016);
        } else if (e.code === 'ArrowLeft') {
            audio.currentTime = Math.max(0, audio.currentTime - 5);
            renderFrame(audio.currentTime, 0.016);
        }
    });

    standbyBtn.addEventListener('click', function () {
        togglePlayback();
    });

    document.body.addEventListener('click', function (e) {
        if (!hasStarted) {
            togglePlayback();
        }
    });

    // 暴露出测试探针与跳转探针 (遵循 SKILL.md verification harness 规范)
    window.__seek = function (t, immediate = true) {
        if (!hasStarted) {
            hasStarted = true;
            standbyScrim.classList.add('dismissed');
        }
        if (audio) {
            audio.currentTime = t;
        }

        // 先执行一帧状态计算以获取正确的 target 姿态与目标光标位置
        renderFrame(t, 0.016);

        if (immediate) {
            updateCameraTarget(t);
            camera.x = targetCamera.x;
            camera.y = targetCamera.y;
            camera.z = targetCamera.z;
            camera.rx = targetCamera.rx;
            camera.ry = targetCamera.ry;
            camera.rz = targetCamera.rz;
            cursorState.x = cursorState.targetX;
            cursorState.y = cursorState.targetY;

            if (cursorState.visible) {
                virtualCursor.style.display = 'block';
                virtualCursor.style.left = `${cursorState.x.toFixed(1)}px`;
                virtualCursor.style.top = `${cursorState.y.toFixed(1)}px`;
            } else {
                virtualCursor.style.display = 'none';
            }
        }

        renderFrame(t, 0.016);
    };

    window.__togglePlayback = togglePlayback;

    // 启动主时钟循环
    requestAnimationFrame(mainLoop);

    // 默认在待机帧执行一次静态渲染
    renderFrame(0, 0.016);

})();
