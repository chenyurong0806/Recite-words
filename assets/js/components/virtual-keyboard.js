/**
 * MD3 底部滑入式虚拟键盘
 * Module: assets/js/components/virtual-keyboard.js
 */

/* ==========================================================================
   统一底部滑入式虚拟键盘 (MD3 规范，支持搜索与默写)
   ========================================================================== */
let activeVirtualKeyboardInput = null;

function initGlobalVirtualKeyboard() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initGlobalVirtualKeyboard());
        return;
    }
    const gvk = document.getElementById('global-virtual-keyboard');
    if (!gvk) return;
    if (gvk._initialized) return;
    gvk._initialized = true;

    gvk.addEventListener('pointerdown', (e) => {
        e.preventDefault();
    });
    gvk.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    gvk.querySelectorAll('.gvk-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            handleGlobalVirtualKeyPress(key);
        });
    });

    const attachInputListeners = (inputEl, isSearch = false) => {
        if (!inputEl) return;
        inputEl.addEventListener('focus', () => {
            if (isSearch) {
                const sc = (typeof getSearchConfig === 'function') ? getSearchConfig() : { enableVirtualKeyboard: false };
                if (sc.enableVirtualKeyboard) {
                    activeVirtualKeyboardInput = inputEl;
                    openGlobalVirtualKeyboard();
                }
            } else {
                if (typeof dictationVirtualKeyboardEnabled !== 'undefined' && dictationVirtualKeyboardEnabled) {
                    activeVirtualKeyboardInput = inputEl;
                    openGlobalVirtualKeyboard();
                }
            }
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement !== inputEl && (!gvk.contains(document.activeElement))) {
                    if (activeVirtualKeyboardInput === inputEl) {
                        closeGlobalVirtualKeyboard();
                    }
                }
            }, 180);
        });
    };

    attachInputListeners(document.getElementById('search-page-input'), true);
    attachInputListeners(document.getElementById('hub-search-input'), true);
    attachInputListeners(document.getElementById('dictation-word-input'), false);
}

function openGlobalVirtualKeyboard() {
    const gvk = document.getElementById('global-virtual-keyboard');
    if (gvk) gvk.classList.add('open');
}

function closeGlobalVirtualKeyboard() {
    const gvk = document.getElementById('global-virtual-keyboard');
    if (gvk) gvk.classList.remove('open');
    activeVirtualKeyboardInput = null;
}

function handleGlobalVirtualKeyPress(key) {
    if (!key) return;
    if (key === 'hide') {
        closeGlobalVirtualKeyboard();
        if (activeVirtualKeyboardInput) activeVirtualKeyboardInput.blur();
        return;
    }

    const inp = activeVirtualKeyboardInput || document.getElementById('search-page-input') || document.getElementById('hub-search-input') || document.getElementById('dictation-word-input');
    if (!inp) return;

    if (key === 'Backspace') {
        const start = inp.selectionStart;
        const end = inp.selectionEnd;
        if (start !== null && end !== null && start !== end) {
            const val = inp.value;
            inp.value = val.slice(0, start) + val.slice(end);
            inp.selectionStart = inp.selectionEnd = start;
        } else if (start !== null && start > 0) {
            const val = inp.value;
            inp.value = val.slice(0, start - 1) + val.slice(start);
            inp.selectionStart = inp.selectionEnd = start - 1;
        } else {
            inp.value = inp.value.slice(0, -1);
        }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.focus();
        return;
    }

    if (key === 'Enter') {
        if (inp.id === 'search-page-input' || inp.id === 'hub-search-input') {
            const q = inp.value.trim();
            if (q) executeHubSearch(q, true, true);
        } else if (inp.id === 'dictation-word-input') {
            if (typeof submitDictationAnswer === 'function') {
                submitDictationAnswer();
            } else {
                inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }
        }
        inp.focus();
        return;
    }

    const start = inp.selectionStart !== null ? inp.selectionStart : inp.value.length;
    const end = inp.selectionEnd !== null ? inp.selectionEnd : inp.value.length;
    const val = inp.value;
    inp.value = val.slice(0, start) + key + val.slice(end);
    inp.selectionStart = inp.selectionEnd = start + key.length;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.focus();
}