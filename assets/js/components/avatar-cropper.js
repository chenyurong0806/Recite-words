/**
 * avatar-cropper.js
 * 纯前端轻量级头像裁切与缩放调整组件
 * 支持鼠标拖拽、触控手势、滑动缩放、滚轮缩放、90°旋转与圆形裁切预览
 */

let cropperState = {
    img: null,
    baseScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    callback: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0
};

const CROPPER_VIEW_SIZE = 260; // 视口大小 260x260
const CROPPER_TARGET_DIAMETER = 220; // 裁切圆直径 220px
const CROPPER_OUTPUT_SIZE = 160; // 输出头像统一规格 160x160

function openAvatarCropper(file, onConfirm) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        showToast('请选择有效的图片文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            initCropperWithImage(img, onConfirm);
        };
        img.onerror = () => {
            showToast('图片加载失败，请换一张试试');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showToast('读取图片文件失败');
    };
    reader.readAsDataURL(file);
}

function initCropperWithImage(img, onConfirm) {
    cropperState.img = img;
    cropperState.callback = onConfirm;
    cropperState.rotation = 0;
    cropperState.offsetX = 0;
    cropperState.offsetY = 0;
    cropperState.isDragging = false;

    // 计算初识 baseScale，使得图片的短边刚好填满裁切圆 (220px)
    const minDim = Math.min(img.width, img.height);
    cropperState.baseScale = CROPPER_TARGET_DIAMETER / minDim;
    cropperState.zoom = 1.0;

    const slider = document.getElementById('cropper-zoom-slider');
    if (slider) {
        slider.value = '1';
        slider.min = '1';
        slider.max = '3.5';
        slider.step = '0.01';
    }

    const modal = document.getElementById('modal-avatar-cropper');
    if (modal) modal.classList.add('active');

    setupCropperEvents();
    renderCropperCanvas();
}

function setupCropperEvents() {
    const wrap = document.getElementById('cropper-viewport-wrap');
    if (!wrap || wrap.dataset.eventsBound === 'true') return;
    wrap.dataset.eventsBound = 'true';

    // 触控与鼠标事件统一通过 Pointer Events 处理
    wrap.addEventListener('pointerdown', (e) => {
        if (!cropperState.img) return;
        cropperState.isDragging = true;
        cropperState.startX = e.clientX;
        cropperState.startY = e.clientY;
        cropperState.initialOffsetX = cropperState.offsetX;
        cropperState.initialOffsetY = cropperState.offsetY;
        try {
            wrap.setPointerCapture(e.pointerId);
        } catch (err) { }
        wrap.style.cursor = 'grabbing';
    });

    wrap.addEventListener('pointermove', (e) => {
        if (!cropperState.isDragging || !cropperState.img) return;
        const dx = e.clientX - cropperState.startX;
        const dy = e.clientY - cropperState.startY;
        cropperState.offsetX = cropperState.initialOffsetX + dx;
        cropperState.offsetY = cropperState.initialOffsetY + dy;
        renderCropperCanvas();
    });

    const stopDrag = (e) => {
        if (!cropperState.isDragging) return;
        cropperState.isDragging = false;
        try {
            wrap.releasePointerCapture(e.pointerId);
        } catch (err) { }
        wrap.style.cursor = 'grab';
    };

    wrap.addEventListener('pointerup', stopDrag);
    wrap.addEventListener('pointercancel', stopDrag);

    // 鼠标滚轮缩放
    wrap.addEventListener('wheel', (e) => {
        if (!cropperState.img) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        const newZoom = Math.max(1.0, Math.min(3.5, cropperState.zoom + delta));
        if (newZoom !== cropperState.zoom) {
            cropperState.zoom = newZoom;
            const slider = document.getElementById('cropper-zoom-slider');
            if (slider) slider.value = newZoom.toFixed(2);
            renderCropperCanvas();
        }
    }, { passive: false });
}

function onCropperZoomChange(val) {
    cropperState.zoom = parseFloat(val) || 1.0;
    renderCropperCanvas();
}

function rotateCropperImage() {
    cropperState.rotation = (cropperState.rotation + 90) % 360;
    renderCropperCanvas();
}

function renderCropperCanvas() {
    const canvas = document.getElementById('cropper-canvas');
    if (!canvas || !cropperState.img) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CROPPER_VIEW_SIZE * dpr) {
        canvas.width = CROPPER_VIEW_SIZE * dpr;
        canvas.height = CROPPER_VIEW_SIZE * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, CROPPER_VIEW_SIZE, CROPPER_VIEW_SIZE);

    // 绘制中心
    const center = CROPPER_VIEW_SIZE / 2;
    ctx.translate(center + cropperState.offsetX, center + cropperState.offsetY);
    ctx.rotate((cropperState.rotation * Math.PI) / 180);

    const scale = cropperState.baseScale * cropperState.zoom;
    ctx.scale(scale, scale);

    const img = cropperState.img;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
}

function confirmCropperImage() {
    if (!cropperState.img) {
        closeAvatarCropperModal();
        return;
    }

    try {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = CROPPER_OUTPUT_SIZE;
        outCanvas.height = CROPPER_OUTPUT_SIZE;
        const ctx = outCanvas.getContext('2d');

        // 输出缩放比 (160 / 220)
        const ratio = CROPPER_OUTPUT_SIZE / CROPPER_TARGET_DIAMETER;
        const outCenter = CROPPER_OUTPUT_SIZE / 2;

        ctx.save();
        ctx.translate(outCenter + cropperState.offsetX * ratio, outCenter + cropperState.offsetY * ratio);
        ctx.rotate((cropperState.rotation * Math.PI) / 180);

        const scale = (cropperState.baseScale * cropperState.zoom) * ratio;
        ctx.scale(scale, scale);

        const img = cropperState.img;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const dataUrl = outCanvas.toDataURL('image/jpeg', 0.86);

        if (typeof cropperState.callback === 'function') {
            cropperState.callback(dataUrl);
        }
    } catch (e) {
        console.error('Failed to crop avatar:', e);
        showToast('头像裁切生成失败');
    } finally {
        closeAvatarCropperModal();
    }
}

function closeAvatarCropperModal() {
    const modal = document.getElementById('modal-avatar-cropper');
    if (modal) modal.classList.remove('active');
    cropperState.img = null;
    cropperState.callback = null;
}

