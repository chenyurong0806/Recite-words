/**
 * MD3 风格自定义下拉选择框组件
 * Module: assets/js/components/md3-select.js
 */

// ----------------- MD3 风格自定义下拉选择框组件 -----------------
function renderMd3SelectHtml({ id, options, defaultValue, onChange = '' }) {
    const currentVal = defaultValue !== undefined ? defaultValue : (options[0] ? options[0].value : '');
    const selectedOpt = options.find(o => String(o.value) === String(currentVal)) || options[0] || { value: '', label: '请选择' };

    return `
                <div class="md3-custom-select" id="${escapeHtml(id)}">
                    <input type="hidden" id="${escapeHtml(id)}-input" value="${escapeHtml(selectedOpt.value)}">
                    <button type="button" class="md3-custom-select-trigger" id="${escapeHtml(id)}-trigger" onclick="toggleMd3Select('${escapeHtml(id)}', event)">
                        <span id="${escapeHtml(id)}-label">${escapeHtml(selectedOpt.label)}</span>
                        <span class="material-symbols-rounded" style="font-size:18px; color:var(--md-sys-color-outline); transition:transform 0.2s;">arrow_drop_down</span>
                    </button>
                    <div class="md3-custom-select-menu" id="${escapeHtml(id)}-menu" onclick="event.stopPropagation()">
                        ${options.map(opt => `
                            <div class="md3-custom-select-option ${String(opt.value) === String(selectedOpt.value) ? 'selected' : ''}"
                                data-value="${escapeHtml(opt.value)}"
                                onclick="selectMd3Option('${escapeHtml(id)}', '${escapeHtml(opt.value)}', '${escapeHtml(opt.label)}', '${escapeHtml(onChange)}')">
                                <span>${escapeHtml(opt.label)}</span>
                                ${String(opt.value) === String(selectedOpt.value) ? '<span class="material-symbols-rounded" style="font-size:16px;">check</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
}

function toggleMd3Select(selectId, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(selectId + '-menu');
    if (!menu) return;
    const wasOpen = menu.classList.contains('open');
    closeAllMd3Selects();
    if (!wasOpen) {
        menu.classList.add('open');
    }
}

function selectMd3Option(selectId, val, label, onChangeFnName) {
    const triggerLabel = document.getElementById(selectId + '-label');
    const hiddenInput = document.getElementById(selectId + '-input');
    const menu = document.getElementById(selectId + '-menu');
    if (triggerLabel) triggerLabel.textContent = label;
    if (hiddenInput) {
        hiddenInput.value = val;
        hiddenInput.dispatchEvent(new Event('change'));
    }
    if (menu) {
        menu.classList.remove('open');
        menu.querySelectorAll('.md3-custom-select-option').forEach(opt => {
            const isCur = opt.getAttribute('data-value') === String(val);
            opt.classList.toggle('selected', isCur);
            const checkIcon = opt.querySelector('.material-symbols-rounded');
            if (isCur && !checkIcon) {
                opt.insertAdjacentHTML('beforeend', '<span class="material-symbols-rounded" style="font-size:16px;">check</span>');
            } else if (!isCur && checkIcon) {
                checkIcon.remove();
            }
        });
    }
    if (onChangeFnName && typeof window[onChangeFnName] === 'function') {
        window[onChangeFnName](val, selectId);
    }
}

function closeAllMd3Selects() {
    document.querySelectorAll('.md3-custom-select-menu.open').forEach(m => m.classList.remove('open'));
}

document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.md3-custom-select')) {
        closeAllMd3Selects();
    }
});
