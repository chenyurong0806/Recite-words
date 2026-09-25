/**
 * MD3 底部滑入式虚拟键盘
 * Module: assets/js/components/virtual-keyboard.js
 */

/* ==========================================================================
   统一底部滑入式虚拟键盘 (MD3 规范，支持搜索与默写，支持大小写切换与符号键)
   ========================================================================== */
let activeVirtualKeyboardInput = null;
let isGlobalVirtualKeyboardShift = false;

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

    // 全局事件委托：监听搜索与默写输入框的聚焦/失焦
    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (!target || !target.tagName || target.tagName.toLowerCase() !== 'input') return;

        if (target.id === 'search-page-input' || target.id === 'hub-search-input') {
            const sc = (typeof getSearchConfig === 'function') ? getSearchConfig() : { enableVirtualKeyboard: false };
            if (sc.enableVirtualKeyboard) {
                activeVirtualKeyboardInput = target;
                openGlobalVirtualKeyboard();
            }
        } else if (target.id === 'dictation-word-input' || target.classList.contains('dictation-slot-input')) {
            if (typeof dictationVirtualKeyboardEnabled === 'undefined' || dictationVirtualKeyboardEnabled !== false) {
                activeVirtualKeyboardInput = target;
                openGlobalVirtualKeyboard();
            }
        }
    });

    document.addEventListener('focusout', (e) => {
        setTimeout(() => {
            const activeEl = document.activeElement;
            const currentGvk = document.getElementById('global-virtual-keyboard');
            if (currentGvk && (currentGvk.contains(activeEl) || activeEl === activeVirtualKeyboardInput)) {
                return;
            }
            if (activeVirtualKeyboardInput && activeVirtualKeyboardInput === e.target) {
                const isAnotherValidInput = activeEl && activeEl.tagName === 'INPUT' && (
                    activeEl.id === 'search-page-input' ||
                    activeEl.id === 'hub-search-input' ||
                    activeEl.id === 'dictation-word-input' ||
                    activeEl.classList?.contains('dictation-slot-input')
                );
                if (!isAnotherValidInput) {
                    closeGlobalVirtualKeyboard();
                }
            }
        }, 180);
    });

    updateSearchKeyboardButtonsVisibility();
}

function toggleGlobalVirtualKeyboardShift() {
    isGlobalVirtualKeyboardShift = !isGlobalVirtualKeyboardShift;
    const shiftBtn = document.getElementById('gvk-key-shift');
    if (shiftBtn) {
        shiftBtn.classList.toggle('active', isGlobalVirtualKeyboardShift);
    }
    const gvk = document.getElementById('global-virtual-keyboard');
    if (!gvk) return;
    gvk.querySelectorAll('.gvk-key[data-letter]').forEach(btn => {
        const letter = btn.getAttribute('data-letter');
        if (!letter) return;
        const targetChar = isGlobalVirtualKeyboardShift ? letter.toUpperCase() : letter.toLowerCase();
        btn.textContent = targetChar;
        btn.setAttribute('data-key', targetChar);
    });
}

function updateSearchKeyboardButtonsVisibility() {
    const sc = (typeof getSearchConfig === 'function') ? getSearchConfig() : { enableVirtualKeyboard: false };
    const alwaysPopup = !!sc.enableVirtualKeyboard;
    document.querySelectorAll('.hub-search-keyboard-btn').forEach(btn => {
        if (alwaysPopup) {
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
        }
    });
}

function toggleVirtualKeyboardFromSearch(e, inputId) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const inputEl = document.getElementById(inputId);
    const gvk = document.getElementById('global-virtual-keyboard');
    if (!gvk) return;
    if (gvk.classList.contains('open') && activeVirtualKeyboardInput === inputEl) {
        closeGlobalVirtualKeyboard();
    } else {
        if (inputEl) {
            activeVirtualKeyboardInput = inputEl;
            inputEl.focus();
        }
        openGlobalVirtualKeyboard();
    }
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

    if (key === 'Shift') {
        toggleGlobalVirtualKeyboardShift();
        return;
    }

    const inp = activeVirtualKeyboardInput || document.getElementById('search-page-input') || document.getElementById('hub-search-input') || document.getElementById('dictation-word-input') || document.querySelector('.dictation-slot-input');
    if (!inp) return;

    if (key === 'Backspace') {
        const isSlot = inp.classList && inp.classList.contains('dictation-slot-input');
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
        } else if (inp.value.length > 0) {
            inp.value = inp.value.slice(0, -1);
        } else if (isSlot) {
            // 当前格为空，退回到上一格并删去其最后一个字母
            const allSlots = Array.from(document.querySelectorAll('.dictation-slot-input'));
            const idx = allSlots.indexOf(inp);
            if (idx > 0) {
                const prev = allSlots[idx - 1];
                prev.focus();
                activeVirtualKeyboardInput = prev;
                if (prev.value.length > 0) {
                    prev.value = prev.value.slice(0, -1);
                    prev.dispatchEvent(new Event('input', { bubbles: true }));
                    if (typeof autoResizeDictationInput === 'function') autoResizeDictationInput(prev);
                }
                return;
            }
        }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof autoResizeDictationInput === 'function') autoResizeDictationInput(inp);
        inp.focus();
        return;
    }

    if (key === 'Enter') {
        if (inp.id === 'search-page-input' || inp.id === 'hub-search-input') {
            const q = inp.value.trim();
            if (q && typeof executeHubSearch === 'function') executeHubSearch(q, true, true);
        } else if (inp.id === 'dictation-word-input' || (inp.classList && inp.classList.contains('dictation-slot-input'))) {
            if (typeof submitDictationAnswer === 'function') {
                submitDictationAnswer();
            } else {
                inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }
        }
        inp.focus();
        return;
    }

    if (key === ' ') {
        if (inp.classList && inp.classList.contains('dictation-slot-input')) {
            // 词组默写时按空格跳到下一格
            const allSlots = Array.from(document.querySelectorAll('.dictation-slot-input'));
            const idx = allSlots.indexOf(inp);
            if (idx >= 0 && idx < allSlots.length - 1) {
                allSlots[idx + 1].focus();
                activeVirtualKeyboardInput = allSlots[idx + 1];
                return;
            }
        }
        const start = inp.selectionStart !== null ? inp.selectionStart : inp.value.length;
        const end = inp.selectionEnd !== null ? inp.selectionEnd : inp.value.length;
        const val = inp.value;
        inp.value = val.slice(0, start) + ' ' + val.slice(end);
        inp.selectionStart = inp.selectionEnd = start + 1;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        if (typeof autoResizeDictationInput === 'function') autoResizeDictationInput(inp);
        inp.focus();
        return;
    }

    // 普通按键 (字母、-、')
    const start = inp.selectionStart !== null ? inp.selectionStart : inp.value.length;
    const end = inp.selectionEnd !== null ? inp.selectionEnd : inp.value.length;
    const val = inp.value;
    inp.value = val.slice(0, start) + key + val.slice(end);
    inp.selectionStart = inp.selectionEnd = start + key.length;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof autoResizeDictationInput === 'function') autoResizeDictationInput(inp);
    inp.focus();

    if (inp.classList && inp.classList.contains('dictation-slot-input')) {
        const token = inp.getAttribute('data-token') || '';
        if (token && inp.value.length >= token.length) {
            const allSlots = Array.from(document.querySelectorAll('.dictation-slot-input'));
            const idx = allSlots.indexOf(inp);
            if (idx >= 0 && idx < allSlots.length - 1) {
                allSlots[idx + 1].focus();
                activeVirtualKeyboardInput = allSlots[idx + 1];
            }
        }
    }
}
