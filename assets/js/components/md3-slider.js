/**
 * Google Material Design 3 风格滑动条组件 (MD3 Slider)
 * Module: assets/js/components/md3-slider.js
 */

function updateMd3SliderUI(sliderInput, formatFn) {
    if (typeof sliderInput === 'string') {
        sliderInput = document.getElementById(sliderInput);
    }
    if (!sliderInput) return;

    const min = parseFloat(sliderInput.min) || 0;
    const max = parseFloat(sliderInput.max) || 100;
    const val = parseFloat(sliderInput.value);
    const safeVal = isNaN(val) ? min : val;
    const range = max - min;
    const pct = range > 0 ? Math.max(0, Math.min(1, (safeVal - min) / range)) : 0;
    const pctPct = pct * 100;

    const wrap = sliderInput.closest('.md3-slider-component') || sliderInput.parentElement;
    if (wrap) {
        const activeBar = wrap.querySelector('.md3-slider-active-bar');
        const thumbHandle = wrap.querySelector('.md3-slider-thumb-handle');
        const inactiveBar = wrap.querySelector('.md3-slider-inactive-bar');
        const stopDot = wrap.querySelector('.md3-slider-stop-dot');

        // MD3 标准规格: 4px 细长拇指手柄 (半宽 2px), 轨道高 16px, 与激活/未激活轨道保留 6px 精准间隔
        const gap = 6;
        const thumbHalfWidth = 2; // 拇指条 4px 宽度的一半

        if (thumbHandle) {
            // 使拇指几何中心在 0% 时处于 2px，在 100% 时处于 calc(100% - 2px)，彻底避免两端溢出
            thumbHandle.style.left = `calc(${pctPct}% + ${thumbHalfWidth}px - ${pct * (thumbHalfWidth * 2)}px)`;
        }

        if (activeBar) {
            if (pct <= 0) {
                activeBar.style.width = '0px';
                activeBar.style.opacity = '0';
            } else if (pct >= 1) {
                // 100% 满值状态 (图4规范)：激活条止于拇指左侧 6px 处，保留利落的截断间隙，绝不吞没拇指
                activeBar.style.width = `calc(100% - ${thumbHalfWidth * 2 + gap}px)`;
                activeBar.style.opacity = '1';
            } else {
                activeBar.style.width = `calc(${pctPct}% - ${pct * 4}px - ${gap}px)`;
                activeBar.style.opacity = '1';
            }
        }

        if (inactiveBar) {
            if (pct >= 1) {
                inactiveBar.style.left = '100%';
                inactiveBar.style.opacity = '0';
            } else if (pct <= 0) {
                // 0% 零值状态：未激活条从拇指右侧 6px 处起始
                inactiveBar.style.left = `${thumbHalfWidth * 2 + gap}px`;
                inactiveBar.style.opacity = '1';
            } else {
                inactiveBar.style.left = `calc(${pctPct}% - ${pct * 4}px + ${thumbHalfWidth * 2 + gap}px)`;
                inactiveBar.style.opacity = '1';
            }
        }

        if (stopDot) {
            stopDot.style.opacity = (pct >= 0.98) ? '0' : '0.5';
        }
    }

    const row = sliderInput.closest('.md3-slider-row');
    if (row) {
        const badge = row.querySelector('.md3-slider-value-badge');
        if (badge) {
            badge.textContent = formatFn ? formatFn(safeVal) : String(safeVal);
        }
    }

    // 适配 AI 难度段位与界面缩放专用展示标签
    if (sliderInput.id === 'ai-difficulty-slider') {
        const disp = document.getElementById('ai-difficulty-display');
        if (disp) disp.textContent = formatFn ? formatFn(safeVal) : `${safeVal}段`;
    } else if (sliderInput.id === 'slider-app-zoom') {
        const disp = document.getElementById('app-zoom-val-text');
        if (disp) disp.textContent = formatFn ? formatFn(safeVal) : `${Math.round(safeVal * 100)}%`;
    }
}

// 辅助获取各类型滑块对应的默认文本格式化函数
function getSliderFormatter(id) {
    if (id === 'slider-riddle-len') {
        return v => `${v} 字母`;
    } else if (id === 'slider-riddle-att') {
        return v => `${v} 次`;
    } else if (id === 'slider-single-learn-batch' || id === 'slider-dictation-batch') {
        return v => `${v} 词`;
    } else if (id === 'slider-single-review-batch') {
        return v => v >= 45 ? '全部' : `${v} 词`;
    } else if (id === 'slider-shici-batch') {
        return v => `${v} 题`;
    } else if (id === 'slider-shici-review-batch') {
        return v => v >= 45 ? '全部' : `${v} 题`;
    } else if (id === 'ai-difficulty-slider') {
        return v => `${v}段`;
    } else if (id === 'slider-app-zoom') {
        return v => `${Math.round(parseFloat(v) * 100)}%`;
    }
    return null;
}

// 全局委托 input 事件，使得滑动时视觉即时高帧率跟随
document.addEventListener('input', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('md3-slider-native-input')) {
        const input = e.target;
        updateMd3SliderUI(input, getSliderFormatter(input.id));
    }
});

// 全局滑块交互与点击反馈动效系统 (Touch / Click / Drag Feedback)
let currentActiveSliderWrap = null;
let sliderPointerStartX = 0;
let isDraggingSliderMode = false;

document.addEventListener('pointerdown', (e) => {
    const input = e.target && e.target.classList && e.target.classList.contains('md3-slider-native-input') ? e.target : null;
    if (!input) return;
    const wrap = input.closest('.md3-slider-component');
    if (!wrap) return;

    currentActiveSliderWrap = wrap;
    sliderPointerStartX = e.clientX;
    isDraggingSliderMode = false;

    wrap.classList.add('is-active', 'is-pressed');

    // 在点击点触发 Material Design 3 水波纹扩散涟漪
    const track = wrap.querySelector('.md3-slider-visual-track');
    if (track) {
        const rect = track.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const ripple = document.createElement('span');
        ripple.className = 'md3-slider-click-ripple';
        ripple.style.left = `${clickX}px`;
        track.appendChild(ripple);
        setTimeout(() => {
            if (ripple.parentElement) ripple.parentElement.removeChild(ripple);
        }, 440);
    }
});

document.addEventListener('pointermove', (e) => {
    if (!currentActiveSliderWrap) return;
    if (!isDraggingSliderMode && Math.abs(e.clientX - sliderPointerStartX) > 2) {
        isDraggingSliderMode = true;
        currentActiveSliderWrap.classList.add('is-dragging');
    }
});

function finishSliderInteraction() {
    if (currentActiveSliderWrap) {
        currentActiveSliderWrap.classList.remove('is-active', 'is-pressed', 'is-dragging');
        currentActiveSliderWrap = null;
    }
    isDraggingSliderMode = false;
}

document.addEventListener('pointerup', finishSliderInteraction);
document.addEventListener('pointercancel', finishSliderInteraction);

// 初始化页面中所有现存的 MD3 滑动条
function initAllMd3Sliders() {
    document.querySelectorAll('.md3-slider-component .md3-slider-native-input').forEach(input => {
        updateMd3SliderUI(input, getSliderFormatter(input.id));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllMd3Sliders);
} else {
    initAllMd3Sliders();
}

window.updateMd3SliderUI = updateMd3SliderUI;
window.initAllMd3Sliders = initAllMd3Sliders;
