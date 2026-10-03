/**
 * 【词迹】60秒顶级产品宣传片核心动效与时钟驱动引擎（120 BPM 精准卡点版）
 * 严格遵循 120 BPM 节拍（每拍 0.5s，半拍 0.25s，每小节 2.0s，乐句 8.0s）
 */

(function () {
    'use strict';

    // DOM 元素引用
    const audio = document.getElementById('bgm');
    const standbyScrim = document.getElementById('standby-scrim');
    const standbyBtn = document.getElementById('standby-cue-btn');
    const pauseIndicator = document.getElementById('pause-indicator');
    const stealthProgress = document.getElementById('stealth-progress');
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

    // 摄像机物理状态
    const camera = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    const targetCamera = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    const CAMERA_SMOOTH_K = 8.5;

    // 虚拟光标状态
    const cursorState = {
        x: -100, y: -100,
        targetX: -100, targetY: -100,
        visible: false,
        clicking: false,
        k: 14.0
    };

    // 严格按 120 BPM 乐句对齐的环境上下文胶囊
    const CONTEXT_BADGES = [
        // 镜头 2：查词 (8.0s - 16.0s)
        { id: 'badge-search-tabs', start: 8.5, end: 15.5 },
        { id: 'badge-search-phrase', start: 11.0, end: 15.5 },
        { id: 'badge-search-freedom', start: 13.0, end: 15.5 },
        // 镜头 3：对决 (16.0s - 32.0s)
        { id: 'badge-duel-remote', start: 16.2, end: 19.8 },
        { id: 'badge-room-ready', start: 18.5, end: 20.4 }, // 保持显示到 20.4s
        { id: 'badge-ai-config', start: 22.0, end: 24.8 },
        { id: 'badge-tug', start: 25.0, end: 31.5 },
        { id: 'badge-penalty', start: 27.5, end: 31.5 },
        // 镜头 3.5：选择词书 (32.0s - 36.0s)
        { id: 'badge-book-select', start: 32.5, end: 35.8 },
        { id: 'badge-book-toggle', start: 34.0, end: 35.8 },
        // 镜头 4：背词 (36.0s - 44.0s)
        { id: 'badge-recite-mastery', start: 36.5, end: 43.8 },
        { id: 'badge-recite-shici', start: 40.5, end: 43.8 },
        // 镜头 5：Wordle (44.0s - 52.0s)
        { id: 'badge-wordle-tech', start: 44.5, end: 51.5 },
        { id: 'badge-wordle-draft', start: 46.5, end: 51.5 },
        // 镜头 6：云端实时同步 (52.0s - 58.0s) - 52.0s 先出现
        { id: 'badge-cloud-sync', start: 52.0, end: 57.5 },
        { id: 'badge-cloud-devices', start: 54.5, end: 57.5 }
    ];

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function lerp(start, end, p) { return start + (end - start) * p; }
    function easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    function easeInOutQuad(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

    function getElementCenter(target) {
        const el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function setCursorClicking(clicking) {
        if (cursorState.clicking === clicking) return;
        cursorState.clicking = clicking;
        if (clicking) virtualCursor.classList.add('clicking');
        else virtualCursor.classList.remove('clicking');
    }

    function renderFrame(t, dt) {
        const progressPct = clamp((t / 61.5) * 100, 0, 100);
        stealthProgress.style.width = progressPct + '%';

        updateCameraTarget(t);

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

        updateContextBadges(t);

        renderScene1(t);
        renderScene2(t);
        renderScene3(t);
        renderSceneBook(t);
        renderScene4(t);
        renderScene5(t);
        renderScene6(t);
        renderScene7(t);

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
     * 摄像机轨迹调度
     */
    function updateCameraTarget(t) {
        Object.keys(scenes).forEach(k => {
            if (scenes[k]) {
                scenes[k].classList.remove('active');
                scenes[k].style.display = 'none';
            }
        });
        Object.keys(decors).forEach(k => {
            if (decors[k]) decors[k].classList.remove('active');
        });

        // 镜头 1：开篇 (0.0s - 8.0s)
        if (t < 8.0) {
            scenes.intro.classList.add('active');
            scenes.intro.style.display = 'flex';
            if (decors.intro) decors.intro.classList.add('active');
            cursorState.visible = false;

            if (t < 3.5) {
                const p = clamp(t / 3.5, 0, 1);
                targetCamera.x = 0; targetCamera.y = lerp(45, -5, p); targetCamera.z = lerp(-50, 15, p);
                targetCamera.rx = lerp(8, 2, p); targetCamera.ry = 0;
            } else if (t < 4.5) {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 0;
                targetCamera.rx = 0; targetCamera.ry = 0;
            } else {
                const p = clamp((t - 4.5) / 3.5, 0, 1);
                targetCamera.z = -90 * p;
                targetCamera.rx = 2 * p;
            }
        }
        // 镜头 2：查词 (8.0s - 16.0s)
        else if (t < 16.0) {
            scenes.search.classList.add('active');
            scenes.search.style.display = 'flex';
            if (decors.search) decors.search.classList.add('active');

            if (t < 12.0) {
                targetCamera.x = 0; targetCamera.y = 10; targetCamera.z = -10;
                targetCamera.rx = 2; targetCamera.ry = 0;
            } else {
                targetCamera.x = -60; targetCamera.y = 25; targetCamera.z = 80;
                targetCamera.rx = 3;
            }
        }
        // 镜头 3：对决 (16.0s - 32.0s)
        else if (t < 32.0) {
            scenes.duel.classList.add('active');
            scenes.duel.style.display = 'flex';
            if (decors.duel) decors.duel.classList.add('active');

            if (t < 18.0) {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 30;
                targetCamera.rx = 0;
            } else if (t < 20.4) {
                // 延长到 20.4s，与房间停留时间契合
                targetCamera.x = 0; targetCamera.y = 10; targetCamera.z = 50;
                targetCamera.rx = 2;
            } else if (t < 24.5) {
                targetCamera.x = 0; targetCamera.y = 5; targetCamera.z = 40;
                targetCamera.rx = 1;
            } else {
                targetCamera.x = 0; targetCamera.y = -10; targetCamera.z = -20;
                targetCamera.rx = 4;
            }
        }
        // 镜头 3.5：选择词书 (32.0s - 36.0s)
        else if (t < 36.0) {
            scenes.book.classList.add('active');
            scenes.book.style.display = 'flex';
            if (decors.book) decors.book.classList.add('active');

            targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 15;
            targetCamera.rx = 2; targetCamera.ry = 0;
        }
        // 镜头 4：背词与实词 (36.0s - 44.0s)
        else if (t < 44.0) {
            scenes.recite.classList.add('active');
            scenes.recite.style.display = 'flex';
            if (decors.recite) decors.recite.classList.add('active');

            if (t < 40.0) {
                targetCamera.x = 180; targetCamera.y = -10; targetCamera.z = 40;
                targetCamera.ry = -6; targetCamera.rx = 0;
            } else {
                targetCamera.x = -180; targetCamera.y = -10; targetCamera.z = 40;
                targetCamera.ry = 6; targetCamera.rx = 0;
            }
        }
        // 镜头 5：Wordle (44.0s - 52.0s)
        else if (t < 52.0) {
            scenes.wordle.classList.add('active');
            scenes.wordle.style.display = 'flex';
            if (decors.wordle) decors.wordle.classList.add('active');

            if (t < 48.0) {
                targetCamera.x = 0; targetCamera.y = 20; targetCamera.z = 90;
                targetCamera.rx = 12; targetCamera.ry = 0;
            } else {
                targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 130;
                targetCamera.rx = 3; targetCamera.ry = 0;
            }
        }
        // 镜头 6：云端多端 (52.0s - 58.0s)
        else if (t < 58.0) {
            scenes.cloud.classList.add('active');
            scenes.cloud.style.display = 'flex';
            if (decors.cloud) decors.cloud.classList.add('active');

            if (t < 54.5) {
                targetCamera.x = 0; targetCamera.y = 50; targetCamera.z = 10;
                targetCamera.rx = 4; targetCamera.ry = 0;
            } else {
                targetCamera.x = 0; targetCamera.y = -20; targetCamera.z = -160;
                targetCamera.rx = 10; targetCamera.ry = -5;
            }
        }
        // 镜头 7：收束 (58.0s - 62.5s)
        else {
            scenes.outro.classList.add('active');
            scenes.outro.style.display = 'flex';
            cursorState.visible = false;
            targetCamera.x = 0; targetCamera.y = 0; targetCamera.z = 0;
            targetCamera.rx = 0; targetCamera.ry = 0; targetCamera.rz = 0;
        }
    }

    function updateContextBadges(t) {
        CONTEXT_BADGES.forEach(item => {
            const el = document.getElementById(item.id);
            if (!el) return;
            if (t >= item.start && t <= item.end) el.classList.add('pop');
            else el.classList.remove('pop');
        });
    }

    /**
     * 镜头 1 (0.0s - 8.0s)
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

        if (t < 3.2) {
            const p = clamp(t / 3.2, 0, 1);
            const ep = easeInOutQuad(p);
            stage.style.display = 'flex';
            stage.style.opacity = '1';
            board.style.transform = `rotateX(${lerp(42, 6, ep)}deg) translateY(${lerp(180, -30, ep)}px) scale(${lerp(1.06, 0.98, ep)})`;
            scanline.style.top = `${lerp(-30, 130, p)}%`;
            heroLockup.style.opacity = '0';
        } else if (t < 4.2) {
            const p = clamp((t - 3.2) / 1.0, 0, 1);
            const ep = easeOutBack(p);
            board.style.transform = `rotateX(${lerp(6, 0, ep)}deg) translateY(${lerp(-30, -10, ep)}px) scale(${lerp(0.98, 0.1, ep)})`;
            board.style.opacity = String(1 - p * p);
            stage.style.opacity = String(1 - p);
            heroLockup.style.opacity = String(clamp(p * 1.5, 0, 1));
            heroLockup.style.transform = `scale(${lerp(0.6, 1, ep)}) translateY(${lerp(40, 0, ep)}px)`;
            logoCube.style.transform = `scale(${lerp(0.4, 1, ep)})`;
        } else {
            stage.style.display = 'none';
            heroLockup.style.opacity = '1';
            heroLockup.style.transform = 'scale(1) translateY(0)';
            logoCube.style.transform = 'scale(1)';
        }

        if (t >= 5.0) pill1.classList.add('pop'); else pill1.classList.remove('pop');
        if (t >= 5.5) pill2.classList.add('pop'); else pill2.classList.remove('pop');
        if (t >= 6.0) pill3.classList.add('pop'); else pill3.classList.remove('pop');
    }

    /**
     * 镜头 2 (8.0s - 16.0s)
     */
    function renderScene2(t) {
        if (t < 7.5 || t > 16.5) return;
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

        cursorState.visible = (t >= 8.5 && t <= 15.0);

        if (t >= 9.5 && t < 11.5) {
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
            cardSenses.innerHTML = '<strong>v.</strong> 放弃，舍弃；遗弃，离弃；沉溺于<br><strong>n.</strong> 放任，纵情';
        }

        if (t >= 8.5 && t < 10.0) {
            const pt = getElementCenter('tab-capability');
            cursorState.targetX = pt.x; cursorState.targetY = pt.y;
            setCursorClicking(t >= 9.5 && t < 9.75);
        } else if (t >= 10.0 && t < 11.8) {
            const pt = getElementCenter('tab-abandon');
            cursorState.targetX = pt.x; cursorState.targetY = pt.y;
            setCursorClicking(t >= 11.5 && t < 11.75);
        } else if (t >= 11.8 && t < 13.5) {
            const pt = getElementCenter('btn-add-to-book-demo');
            cursorState.targetX = pt.x; cursorState.targetY = pt.y;
            setCursorClicking(t >= 12.5 && t < 12.75);
        } else if (t >= 13.5 && t < 15.2) {
            const pt = getElementCenter('btn-edit-meaning-demo');
            cursorState.targetX = pt.x; cursorState.targetY = pt.y;
            setCursorClicking(t >= 14.0 && t < 14.25);
        } else {
            setCursorClicking(false);
        }

        if (t >= 12.0 && t <= 13.2) {
            phraseAudioBtn.style.transform = 'scale(1.15)';
            phraseAudioBtn.style.background = 'var(--md-sys-color-primary)';
            phraseAudioBtn.style.color = '#FFFFFF';
        } else {
            phraseAudioBtn.style.transform = 'scale(1)';
            phraseAudioBtn.style.background = '';
            phraseAudioBtn.style.color = '';
        }

        if (t >= 12.5 && t < 13.8) {
            modalAdd.classList.add('show'); btnAdd.classList.add('highlight');
        } else {
            modalAdd.classList.remove('show'); btnAdd.classList.remove('highlight');
        }

        if (t >= 14.0 && t < 15.5) {
            modalEdit.classList.add('show'); btnEdit.classList.add('highlight');
        } else {
            modalEdit.classList.remove('show'); btnEdit.classList.remove('highlight');
        }
    }

    /**
     * 镜头 3 (16.0s - 32.0s)
     */
    function renderScene3(t) {
        if (t < 15.5 || t > 32.5) return;
        Object.keys(duelSubs).forEach(k => {
            if (duelSubs[k]) {
                duelSubs[k].classList.remove('active');
                duelSubs[k].style.display = 'none';
            }
        });

        // 16.0s - 18.0s：对决邀请弹窗
        if (t < 18.0) {
            duelSubs.remote.classList.add('active');
            duelSubs.remote.style.display = 'block';
            const inviteModal = document.getElementById('modal-match-invite');
            const countdownNum = document.getElementById('invite-countdown-num');

            inviteModal.classList.add('pop');
            const cd = Math.max(12, Math.floor(15 - (t - 16.0)));
            countdownNum.innerText = String(cd);

            if (t >= 16.8 && t < 18.0) {
                cursorState.visible = true;
                const pt = getElementCenter('btn-invite-accept');
                cursorState.targetX = pt.x; cursorState.targetY = pt.y;
                setCursorClicking(t >= 17.5 && t < 17.8);
            }
        }
        // 18.0s - 20.4s：进入真实房间（并在 20.0s 入场动画结束后多停留 0.4s！）
        else if (t < 20.4) {
            cursorState.visible = false;
            duelSubs.room.classList.add('active');
            duelSubs.room.style.display = 'block';
            const roomCard = document.getElementById('real-room-card');
            if (roomCard) {
                // 入场动画耗时 2.0s (18.0s - 20.0s)，在 20.0s - 20.4s 保持 p = 1 完美静止停留 0.4s
                const p = clamp((t - 18.0) / 2.0, 0, 1);
                const ep = easeInOutQuad(p);
                roomCard.style.transform = `translateY(${lerp(600, -120, ep)}px) rotateX(${lerp(24, 0, ep)}deg) scale(${lerp(1.1, 1.0, ep)})`;
            }
        }
        // 20.4s - 22.0s：没有人在线过渡渡桥
        else if (t < 22.0) {
            cursorState.visible = false;
            duelSubs.bridge.style.display = 'flex';
            const bridgeWonder = document.getElementById('bridge-wonder');
            const bridgePrompt = document.getElementById('bridge-prompt');
            if (t >= 20.5) bridgeWonder.classList.add('pop'); else bridgeWonder.classList.remove('pop');
            if (t >= 21.1) bridgePrompt.classList.add('pop'); else bridgePrompt.classList.remove('pop');
        }
        // 22.0s - 25.0s：自适应人机配置
        else if (t < 25.0) {
            cursorState.visible = false;
            duelSubs.ai.classList.add('active');
            duelSubs.ai.style.display = 'block';
            const sliderFill = document.getElementById('ai-slider-fill');
            const sliderThumb = document.getElementById('ai-slider-thumb');
            const rankText = document.getElementById('ai-rank-text');

            if (t >= 22.5 && t <= 24.0) {
                const p = clamp((t - 22.5) / 1.5, 0, 1);
                const ep = easeInOutQuad(p);
                const pct = lerp(0, 88, ep);
                sliderFill.style.width = pct + '%';
                sliderThumb.style.left = pct + '%';
                rankText.innerText = `${Math.min(8, Math.floor(lerp(1, 8.9, ep)))}段`;
            } else if (t > 24.0) {
                sliderFill.style.width = '88%'; sliderThumb.style.left = '88%'; rankText.innerText = '8段';
            }
        }
        // 25.0s - 32.0s：同屏拔河
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

            if (t >= 26.0) {
                const p = clamp((t - 26.0) / 0.5, 0, 1);
                const redPct = lerp(50, 64, easeOutBack(p));
                tugPin.style.left = `calc(${redPct}% - 4px)`;
                tugFillP1.style.width = `${redPct}%`;
                tugFillP2.style.width = `${100 - redPct}%`;
                p1OptA.classList.add('highlight');
                p1OptA.style.background = '#146C2E';
                p1OptA.innerText = 'A. 放弃，舍弃 ✓';
            } else {
                tugPin.style.left = 'calc(50% - 4px)';
                tugFillP1.style.width = '50%';
                tugFillP2.style.width = '50%';
                p1OptA.classList.remove('highlight');
                p1OptA.style.background = '';
                p1OptA.innerText = 'A. 放弃，舍弃';
            }

            if (t >= 27.5) {
                p2OptB.style.background = '#FFDAD6';
                p2OptB.style.color = '#BA1A1A';
                p2OptB.innerText = 'B. 坚持 (答错) ✕';
                p2Overlay.classList.add('active');
                const remaining = Math.max(0, 3.0 - (t - 27.5));
                p2FreezeNum.innerText = String(Math.ceil(remaining));
                p2FreezeBar.style.width = `${(remaining / 3.0) * 100}%`;
            } else {
                p2OptB.style.background = '';
                p2OptB.style.color = '';
                p2OptB.innerText = 'B. 坚持，保持';
                p2Overlay.classList.remove('active');
            }
        }
    }

    /**
     * 镜头 3.5：选择词书 (32.0s - 36.0s)
     */
    function renderSceneBook(t) {
        if (t < 31.5 || t > 36.5) return;
        const stage = document.getElementById('book-selection-stage');
        if (!stage) return;

        if (t >= 32.0 && t <= 36.0) {
            const p = clamp((t - 32.0) / 0.8, 0, 1);
            stage.style.transform = `scale(${lerp(0.88, 1, easeOutBack(p))}) rotateX(${lerp(8, 0, p)}deg)`;
            stage.style.opacity = String(p);

            if (t >= 33.2 && t <= 34.8) {
                cursorState.visible = true;
                cursorState.targetX = window.innerWidth / 2 + 250;
                cursorState.targetY = window.innerHeight / 2 - 120;
                setCursorClicking(t >= 34.0 && t <= 34.25);
            } else {
                cursorState.visible = false;
            }
        }
    }

    /**
     * 镜头 4：背词与实词 (36.0s - 44.0s)
     */
    function renderScene4(t) {
        if (t < 35.5 || t > 44.5) return;
        cursorState.visible = false;
        const dictationBar = document.getElementById('dictation-display-bar');
        const dictationBadge = document.getElementById('dictation-badge');
        const wordLetters = ['a', 'b', 'a', 'n', 'd', 'o', 'n'];

        const typeSchedule = [
            { time: 36.5, len: 1, key: 'key-a' },
            { time: 36.9, len: 2, key: 'key-b' },
            { time: 37.3, len: 3, key: 'key-a' },
            { time: 37.7, len: 4, key: 'key-n' },
            { time: 38.1, len: 5, key: 'key-d' },
            { time: 38.5, len: 6, key: 'key-o' },
            { time: 38.9, len: 7, key: 'key-n' }
        ];

        let currentLen = 0;
        let activeKeyId = null;
        typeSchedule.forEach(item => {
            if (t >= item.time) currentLen = item.len;
            if (t >= item.time && t < item.time + 0.18) activeKeyId = item.key;
        });

        if (currentLen === 0) {
            dictationBar.innerText = '_ _ _ _ _ _ _';
            dictationBar.classList.remove('success-state');
            dictationBadge.innerText = '7 字符';
        } else if (currentLen < 7) {
            dictationBar.innerText = wordLetters.slice(0, currentLen).join(' ') + ' _'.repeat(7 - currentLen);
            dictationBar.classList.remove('success-state');
            dictationBadge.innerText = `${currentLen} 字符`;
        } else {
            dictationBar.innerText = 'a b a n d o n';
            dictationBar.classList.add('success-state');
            dictationBadge.innerText = '✓ 拼写正确';
            dictationBadge.classList.add('success-badge');
        }

        ['key-a', 'key-b', 'key-d', 'key-n', 'key-o'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === activeKeyId) el.classList.add('pressed');
                else el.classList.remove('pressed');
            }
        });

        for (let i = 1; i <= 5; i++) {
            const diamond = document.getElementById(`diamond-${i}`);
            const triggerTime = 39.2 + (i - 1) * 0.1;
            if (t >= triggerTime) {
                diamond.innerText = '◆'; diamond.classList.add('filled', 'anim-gain');
            } else {
                diamond.innerText = '◇'; diamond.classList.remove('filled', 'anim-gain');
            }
        }

        const drawer = document.getElementById('shici-drawer-preview');
        const shiciOptA = document.getElementById('shici-opt-a');
        if (t >= 41.5) {
            shiciOptA.classList.add('highlight');
            shiciOptA.style.background = '#006874';
            shiciOptA.innerHTML = '<span>A. [形容词] 悲伤，悲痛 ✓</span>';
            drawer.style.maxHeight = '140px';
            drawer.style.opacity = '1';
        } else {
            shiciOptA.classList.remove('highlight');
            shiciOptA.style.background = '';
            shiciOptA.innerHTML = '<span>A. [形容词] 悲伤，悲痛</span>';
            drawer.style.maxHeight = '0px';
            drawer.style.opacity = '0';
        }
    }

    /**
     * 镜头 5：Wordle (44.0s - 52.0s)
     */
    function renderScene5(t) {
        if (t < 43.5 || t > 52.5) return;
        const timerText = document.getElementById('riddle-timer-text');
        if (timerText) {
            timerText.innerText = '00:0' + Math.min(8, Math.floor(Math.max(0, t - 44.0)));
        }

        const tilesRow1 = [
            { id: 'tile-1-1', type: 'absent', time: 44.5, keyId: 'rk-s' },
            { id: 'tile-1-2', type: 'present', time: 44.6, keyId: 'rk-p' },
            { id: 'tile-1-3', type: 'correct', time: 44.7, keyId: 'rk-e' },
            { id: 'tile-1-4', type: 'absent', time: 44.8, keyId: 'rk-n' },
            { id: 'tile-1-5', type: 'correct', time: 44.9, keyId: 'rk-t' }
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

        const draftLetters = ['A', 'D', 'E', 'P', 'T'];
        const draftSchedule = [
            { time: 46.5, len: 1, key: 'rk-a' },
            { time: 46.7, len: 2, key: 'rk-d' },
            { time: 46.9, len: 3, key: 'rk-e' },
            { time: 47.1, len: 4, key: 'rk-p' },
            { time: 47.3, len: 5, key: 'rk-t' }
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
                } else {
                    dt.innerText = '';
                    dt.style.borderColor = '';
                }
            }
        }

        if (t >= 48.2 && t < 49.2) {
            cursorState.visible = true;
            const pt = getElementCenter('btn-submit-draft');
            cursorState.targetX = pt.x; cursorState.targetY = pt.y;
            setCursorClicking(t >= 48.8 && t < 49.05);
        } else {
            cursorState.visible = false;
        }

        const row2Tiles = [
            { id: 'tile-2-1', letter: 'A', time: 49.0 },
            { id: 'tile-2-2', letter: 'D', time: 49.1 },
            { id: 'tile-2-3', letter: 'E', time: 49.2 },
            { id: 'tile-2-4', letter: 'P', time: 49.3 },
            { id: 'tile-2-5', letter: 'T', time: 49.4 }
        ];

        if (t >= 49.0) {
            row2Tiles.forEach(item => {
                const t2 = document.getElementById(item.id);
                if (t2) {
                    t2.innerText = item.letter;
                    if (t >= item.time) t2.classList.add('correct');
                }
            });
        }

        const promptBanner = document.getElementById('riddle-prompt-banner');
        const hintView = document.getElementById('prompt-hint-view');
        const successView = document.getElementById('prompt-success-view');
        if (t >= 50.0) {
            if (promptBanner) promptBanner.classList.add('success-mode');
            if (hintView) hintView.style.display = 'none';
            if (successView) successView.style.display = 'flex';
        } else {
            if (promptBanner) promptBanner.classList.remove('success-mode');
            if (hintView) hintView.style.display = 'flex';
            if (successView) successView.style.display = 'none';
        }
    }

    /**
     * 镜头 6：云端多端 (52.0s - 58.0s)
     * 【修复图 1】严格控制先后次序：
     * 1. 52.0s: “云端实时同步”标签先弹出
     * 2. 52.8s, 53.3s, 53.8s: 学习记录、等级分、词书 依次逐个弹出
     */
    function renderScene6(t) {
        if (t < 51.5 || t > 58.5) return;
        cursorState.visible = false;

        const pillRecord = document.getElementById('sync-pill-record');
        const pillRank = document.getElementById('sync-pill-rank');
        const pillBook = document.getElementById('sync-pill-book');
        const syncIcon = document.getElementById('sync-icon');
        const syncText = document.getElementById('sync-btn-text');

        // 后逐个出现
        if (t >= 52.8) pillRecord.classList.add('pop'); else pillRecord.classList.remove('pop');
        if (t >= 53.3) pillRank.classList.add('pop'); else pillRank.classList.remove('pop');
        if (t >= 53.8) pillBook.classList.add('pop'); else pillBook.classList.remove('pop');

        if (t >= 54.3) {
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

        const desktop = document.getElementById('device-desktop');
        const mobile = document.getElementById('device-mobile');
        const seewo = document.getElementById('device-seewo');
        const floatTime = t * 1.5;
        if (desktop) desktop.style.transform = `translate3d(-240px, ${-10 + Math.sin(floatTime) * 6}px, -60px) rotateY(15deg)`;
        if (mobile) mobile.style.transform = `translate3d(300px, ${20 + Math.cos(floatTime * 1.2) * 8}px, 80px) rotateY(-12deg)`;
        if (seewo) seewo.style.transform = `translate3d(40px, ${-90 + Math.sin(floatTime * 0.8) * 5}px, -180px) rotateX(10deg)`;
    }

    /**
     * 镜头 7：收束 (58.0s - 62.5s)
     */
    function renderScene7(t) {
        if (t < 57.5) return;
        cursorState.visible = false;

        const p1 = document.getElementById('outro-pill-1');
        const p2 = document.getElementById('outro-pill-2');
        const p3 = document.getElementById('outro-pill-3');
        const urlBanner = document.getElementById('outro-url');

        if (t >= 58.5) p1.classList.add('pop'); else p1.classList.remove('pop');
        if (t >= 59.0) p2.classList.add('pop'); else p2.classList.remove('pop');
        if (t >= 59.5) p3.classList.add('pop'); else p3.classList.remove('pop');
        if (t >= 60.0) urlBanner.classList.add('show'); else urlBanner.classList.remove('show');
    }

    function mainLoop(now) {
        const dt = clamp((now - lastTimestamp) / 1000, 0.001, 0.1);
        lastTimestamp = now;

        if (isPlaying && audio) {
            const currentTime = audio.currentTime;
            renderFrame(currentTime, dt);
            if (currentTime >= 62.0) {
                audio.pause();
                isPlaying = false;
            }
        }
        requestAnimationFrame(mainLoop);
    }

    function togglePlayback() {
        if (!hasStarted) {
            hasStarted = true;
            standbyScrim.classList.add('dismissed');
        }
        if (audio.paused) {
            audio.play().then(() => {
                isPlaying = true;
                pauseIndicator.classList.remove('show');
            }).catch(err => console.warn(err));
        } else {
            audio.pause();
            isPlaying = false;
            pauseIndicator.classList.add('show');
        }
    }

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayback();
        } else if (e.code === 'ArrowRight') {
            audio.currentTime = Math.min(62.5, audio.currentTime + 4);
            renderFrame(audio.currentTime, 0.016);
        } else if (e.code === 'ArrowLeft') {
            audio.currentTime = Math.max(0, audio.currentTime - 4);
            renderFrame(audio.currentTime, 0.016);
        }
    });

    standbyBtn.addEventListener('click', togglePlayback);
    document.body.addEventListener('click', function () { if (!hasStarted) togglePlayback(); });

    window.__seek = function (t, immediate = true) {
        if (!hasStarted) {
            hasStarted = true;
            standbyScrim.classList.add('dismissed');
        }
        if (audio) audio.currentTime = t;
        renderFrame(t, 0.016);
        if (immediate) {
            updateCameraTarget(t);
            camera.x = targetCamera.x; camera.y = targetCamera.y; camera.z = targetCamera.z;
            camera.rx = targetCamera.rx; camera.ry = targetCamera.ry; camera.rz = targetCamera.rz;
        }
        renderFrame(t, 0.016);
    };
    window.__togglePlayback = togglePlayback;

    requestAnimationFrame(mainLoop);
    renderFrame(0, 0.016);
})();