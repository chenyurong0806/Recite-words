/**
 * 学习打卡记录器与周历热力图
 * Module: assets/js/managers/tracker.js
 */

let currentCalendarWeekOffset = 0;
let currentSelectedCalendarDate = null;

const DailyStudyTracker = {
    _sessionStartTime: null,
    _sessionTickTimer: null,
    getRawLogs() {
        if (!currentUser) return {};
        try {
            const raw = (typeof SafeStorage !== 'undefined' && SafeStorage.getItem)
                ? (SafeStorage.getItem(`vocab_daily_logs_${currentUser}`) || localStorage.getItem(`vocab_daily_logs_${currentUser}`))
                : localStorage.getItem(`vocab_daily_logs_${currentUser}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },
    getLogs() {
        if (!currentUser) return {};
        const logs = this.getRawLogs();
        let modified = false;

        // 结合艾宾浩斯词汇记忆时间戳自动对齐每日学习与复习数（防止云端恢复或旧版本缺失每日明细）
        try {
            if (typeof EbbinghausEngine !== 'undefined' && typeof EbbinghausEngine.getRecords === 'function') {
                const records = EbbinghausEngine.getRecords() || {};
                const ebByDate = {};
                Object.values(records).forEach(r => {
                    if (!r || !r.lastPracticed) return;
                    const ds = this.getDateStrFromTimestamp(r.lastPracticed);
                    if (!ebByDate[ds]) ebByDate[ds] = { learned: 0, reviewed: 0 };
                    if ((r.historyCount || 1) > 1 || (r.stage && r.stage >= 3)) {
                        ebByDate[ds].reviewed++;
                    } else {
                        ebByDate[ds].learned++;
                    }
                });
                Object.keys(ebByDate).forEach(ds => {
                    if (!logs[ds]) {
                        logs[ds] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
                        modified = true;
                    }
                    const eb = ebByDate[ds];
                    if ((logs[ds].learned || 0) < eb.learned) {
                        logs[ds].learned = eb.learned;
                        modified = true;
                    }
                    if ((logs[ds].reviewed || 0) < eb.reviewed) {
                        logs[ds].reviewed = eb.reviewed;
                        modified = true;
                    }
                });
            }
            if (typeof ShiCiEbbinghausEngine !== 'undefined' && typeof ShiCiEbbinghausEngine.getRecords === 'function') {
                const shiciRecs = ShiCiEbbinghausEngine.getRecords() || {};
                const scByDate = {};
                Object.values(shiciRecs).forEach(r => {
                    if (!r || !r.lastPracticed) return;
                    const ds = this.getDateStrFromTimestamp(r.lastPracticed);
                    scByDate[ds] = (scByDate[ds] || 0) + 1;
                });
                Object.keys(scByDate).forEach(ds => {
                    if (!logs[ds]) {
                        logs[ds] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
                        modified = true;
                    }
                    const totalNow = (logs[ds].learned || 0) + (logs[ds].reviewed || 0) + (logs[ds].shici || 0);
                    if (totalNow < scByDate[ds]) {
                        logs[ds].learned = (logs[ds].learned || 0) + (scByDate[ds] - totalNow);
                        modified = true;
                    }
                });
            }
            const rawWordle = (typeof SafeStorage !== 'undefined' && SafeStorage.getItem)
                ? (SafeStorage.getItem(`vocab_wordle_history_${currentUser}`) || localStorage.getItem(`vocab_wordle_history_${currentUser}`))
                : localStorage.getItem(`vocab_wordle_history_${currentUser}`);
            if (rawWordle) {
                const wHist = JSON.parse(rawWordle) || {};
                Object.keys(wHist).forEach(ds => {
                    if (!wHist[ds]) return;
                    if (!logs[ds]) {
                        logs[ds] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
                        modified = true;
                    }
                    if (!logs[ds].riddle) {
                        logs[ds].riddle = 1;
                        modified = true;
                    }
                });
            }
        } catch (e) { }

        if (modified) {
            this.saveLogs(logs, true);
        }
        return logs;
    },
    saveLogs(logs, skipSyncEnqueue = false) {
        if (!currentUser) return;
        const str = JSON.stringify(logs);
        try {
            if (typeof SafeStorage !== 'undefined' && SafeStorage.setItem) {
                SafeStorage.setItem(`vocab_daily_logs_${currentUser}`, str);
            }
            localStorage.setItem(`vocab_daily_logs_${currentUser}`, str);
        } catch (e) { }
        if (!skipSyncEnqueue && window.SyncManager && typeof window.SyncManager.enqueue === 'function') {
            window.SyncManager.enqueue('daily_logs_update', { date: this.getTodayStr() });
        }
    },
    getTodayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    getDateStrFromTimestamp(ts) {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },
    record(type, count = 1) {
        if (!currentUser) return;
        const logs = this.getLogs();
        const todayStr = this.getTodayStr();
        if (!logs[todayStr]) {
            logs[todayStr] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
        }
        logs[todayStr][type] = (logs[todayStr][type] || 0) + count;
        if (!logs[todayStr].durationSeconds) {
            logs[todayStr].durationSeconds = 0;
        }
        this.saveLogs(logs);
        this.renderWeekCalendar(currentCalendarWeekOffset);

        if (typeof ItemManager !== 'undefined') {
            if (type === 'learned' || type === 'reviewed') {
                ItemManager.recordTaskProgress('task_learn_words', count);
            } else if (type === 'riddle') {
                ItemManager.recordTaskProgress('task_wordle', count);
            }
        }
    },
    recordDurationSeconds(seconds = 0) {
        if (!currentUser || !seconds || seconds <= 0) return;
        const logs = this.getLogs();
        const todayStr = this.getTodayStr();
        if (!logs[todayStr]) {
            logs[todayStr] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
        }
        logs[todayStr].durationSeconds = Math.round((logs[todayStr].durationSeconds || 0) + seconds);
        this.saveLogs(logs);
    },
    startSessionTimer() {
        this.flushSessionTimer();
        this._sessionStartTime = Date.now();
        if (this._sessionTickTimer) clearInterval(this._sessionTickTimer);
        this._sessionTickTimer = setInterval(() => {
            this.flushSessionTimer(true);
        }, 15000);
    },
    flushSessionTimer(keepRunning = false) {
        if (this._sessionStartTime) {
            const elapsedSec = Math.floor((Date.now() - this._sessionStartTime) / 1000);
            if (elapsedSec > 0 && elapsedSec < 3600) {
                this.recordDurationSeconds(elapsedSec);
            }
            this._sessionStartTime = keepRunning ? Date.now() : null;
        }
        if (!keepRunning && this._sessionTickTimer) {
            clearInterval(this._sessionTickTimer);
            this._sessionTickTimer = null;
        }
    },
    formatDuration(seconds, compact = false) {
        const sec = Math.max(0, Math.round(seconds || 0));
        if (sec === 0) return compact ? '0分钟' : '0 分钟';
        const hours = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        if (hours > 0) {
            return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
        }
        if (mins > 0) {
            return `${mins}分钟`;
        }
        return '< 1分钟';
    },
    getSummaryStats() {
        this.flushSessionTimer(Boolean(this._sessionStartTime));
        const logs = this.getLogs();
        const todayStr = this.getTodayStr();
        const todayLog = logs[todayStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };

        const todayLearned = (todayLog.learned || 0);
        const todayReviewed = (todayLog.reviewed || 0);
        const todayLearnAndReview = todayLearned + todayReviewed;
        let todayDurationSec = todayLog.durationSeconds || 0;
        if (todayDurationSec === 0 && (todayLearnAndReview + (todayLog.riddle || 0) + (todayLog.dictation || 0)) > 0) {
            todayDurationSec = (todayLearnAndReview * 8) + ((todayLog.dictation || 0) * 12) + ((todayLog.riddle || 0) * 45);
        }

        let totalLearned = 0;
        let totalReviewed = 0;
        let totalDurationSec = 0;
        let totalDictation = 0;
        let totalRiddle = 0;
        let activeDays = 0;

        Object.values(logs).forEach(l => {
            if (!l) return;
            const lc = (l.learned || 0);
            const rc = (l.reviewed || 0);
            const dc = (l.dictation || 0);
            const wc = (l.riddle || 0);
            let dur = (l.durationSeconds || 0);
            if (dur === 0 && (lc + rc + dc + wc) > 0) {
                dur = (lc + rc) * 8 + dc * 12 + wc * 45;
            }
            totalLearned += lc;
            totalReviewed += rc;
            totalDictation += dc;
            totalRiddle += wc;
            totalDurationSec += dur;
            if ((lc + rc + dc + wc + dur) > 0) activeDays++;
        });

        // 兜底：若历史学习记录多于日志统计，自动对齐已学词条总数
        if (typeof EbbinghausEngine !== 'undefined') {
            const ebLearnedCount = EbbinghausEngine.getAllLearnedWords().length;
            if (ebLearnedCount > (totalLearned + totalReviewed)) {
                const diff = ebLearnedCount - (totalLearned + totalReviewed);
                totalLearned += diff;
                totalDurationSec += diff * 8;
            }
        }

        const totalWords = Math.max(totalLearned + totalReviewed, (typeof userStats !== 'undefined' && userStats && userStats.total) ? userStats.total : 0);
        if (totalDurationSec === 0 && totalWords > 0) {
            totalDurationSec = totalWords * 8;
        }

        return {
            todayLearned,
            todayReviewed,
            todayLearnAndReview,
            todayWords: todayLearnAndReview,
            todayDurationSeconds: todayDurationSec,
            todayDurationFormatted: this.formatDuration(todayDurationSec, true),
            totalLearned,
            totalReviewed,
            totalLearnAndReview: totalWords,
            totalWords,
            totalDurationSeconds: totalDurationSec,
            totalDurationFormatted: this.formatDuration(totalDurationSec, true),
            totalDictation,
            totalRiddle,
            activeDays
        };
    },
    getRangeSeries(daysCount = 7) {
        this.flushSessionTimer(Boolean(this._sessionStartTime));
        const logs = this.getLogs();
        const result = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;
            const l = logs[dateStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0, durationSeconds: 0 };
            const learned = (l.learned || 0) + (l.shici || 0);
            const reviewed = l.reviewed || 0;
            const dictation = l.dictation || 0;
            const riddle = l.riddle || 0;
            let durationSec = l.durationSeconds || 0;
            if (durationSec === 0 && (learned + reviewed + dictation + riddle) > 0) {
                durationSec = (learned + reviewed) * 8 + dictation * 12 + riddle * 45;
            }
            const shortLabel = daysCount <= 7 ? dayNames[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`;
            result.push({
                dateStr,
                dateKey: dateStr,
                shortLabel,
                label: shortLabel,
                dateLabel: `${d.getMonth() + 1}月${d.getDate()}日`,
                learned,
                reviewed,
                shici: 0,
                dictation,
                riddle,
                learnAndReview: learned + reviewed,
                durationSeconds: durationSec,
                durationMinutes: Number((durationSec / 60).toFixed(1))
            });
        }
        return result;
    },
    getDaysOfWeek(offset = 0) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const distanceToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + distanceToMonday + offset * 7);
        monday.setHours(0, 0, 0, 0);

        const days = [];
        const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const todayStr = this.getTodayStr();

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dateNum = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dateNum}`;
            days.push({
                dateStr,
                dayName: dayNames[i],
                dayNum: d.getDate(),
                month: d.getMonth() + 1,
                year: y,
                isToday: dateStr === todayStr
            });
        }
        return days;
    },
    renderWeekCalendar(offset = 0) {
        const gridEl = document.getElementById('hub-week-calendar-grid');
        if (!gridEl) return;

        const days = this.getDaysOfWeek(offset);
        const logs = this.getLogs();

        const rangeLabel = document.getElementById('calendar-week-range-label');
        if (rangeLabel) {
            if (offset === 0) rangeLabel.innerText = '本周';
            else if (offset === -1) rangeLabel.innerText = '上周';
            else if (offset === 1) rangeLabel.innerText = '下周';
            else rangeLabel.innerText = `${days[0].month}/${days[0].dayNum} - ${days[6].month}/${days[6].dayNum}`;
        }

        if (!currentSelectedCalendarDate) {
            currentSelectedCalendarDate = this.getTodayStr();
        }

        let html = '';
        days.forEach(day => {
            const log = logs[day.dateStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
            const totalActions = (log.learned || 0) + (log.reviewed || 0) + (log.riddle || 0) + (log.dictation || 0);
            const hasRecord = totalActions > 0;
            const isSelected = (day.dateStr === currentSelectedCalendarDate);

            // 计算学习强度等级
            let intensityClass = 'day-intensity-0';
            if (totalActions > 30) intensityClass = 'day-intensity-4';
            else if (totalActions >= 16) intensityClass = 'day-intensity-3';
            else if (totalActions >= 6) intensityClass = 'day-intensity-2';
            else if (totalActions >= 1) intensityClass = 'day-intensity-1';

            // 核心规则：当天不用强度圆圈标注，而是使用蓝色卡片框与下方小绿点（对照图 4）
            let dayNumHtml = '';
            if (day.isToday) {
                dayNumHtml = `<span class="week-day-num">${day.dayNum}</span><span class="week-day-dot ${hasRecord ? 'has-record' : ''}"></span>`;
            } else {
                dayNumHtml = `<span class="week-day-num-circle ${intensityClass}">${day.dayNum}</span>`;
            }

            html += `
                    <div class="week-day-col ${day.isToday ? 'active-today' : ''} ${isSelected ? 'selected-day' : ''}" data-date="${day.dateStr}" onclick="DailyStudyTracker.selectCalendarDay('${day.dateStr}')">
                        <span class="week-day-name">${day.dayName}</span>
                        ${dayNumHtml}
                    </div>
                    `;
        });

        gridEl.innerHTML = html;
        this.renderDayDialog(currentSelectedCalendarDate);
    },
    selectCalendarDay(dateStr) {
        currentSelectedCalendarDate = dateStr;
        document.querySelectorAll('.week-day-col').forEach(col => {
            col.classList.toggle('selected-day', col.getAttribute('data-date') === dateStr);
        });
        this.renderDayDialog(dateStr);
    },
    renderDayDialog(dateStr) {
        const dialogEl = document.getElementById('hub-calendar-dialog');
        if (!dialogEl) return;

        const logs = this.getLogs();
        const log = logs[dateStr] || { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
        const totalActions = (log.learned || 0) + (log.reviewed || 0) + (log.riddle || 0) + (log.dictation || 0);
        const isPunched = totalActions > 0;
        const isToday = (dateStr === this.getTodayStr());

        const parts = dateStr.split('-');
        const formattedDate = `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;

        let commentText = '';
        if (isPunched) {
            commentText = `今日已完成 ${totalActions} 项背诵、复习与答题训练，加油吧！`;
        } else if (isToday) {
            commentText = '今天还没开始学习呢，选择一本词书开启今日的背词之旅吧！';
        } else {
            commentText = '该日暂无打卡记录。';
        }

        dialogEl.innerHTML = `
                <div class="calendar-chat-dialog">
                    <div class="chat-dialog-avatar">
                        <span class="material-symbols-rounded" style="font-size:22px;">${isPunched ? 'auto_awesome' : 'school'}</span>
                    </div>
                    <div class="chat-dialog-bubble">
                        <div class="chat-dialog-header">
                            <span class="chat-dialog-title">${formattedDate}</span>
                            <span class="chat-dialog-badge ${isPunched ? 'punched' : 'empty'}">
                                <span class="material-symbols-rounded" style="font-size:14px;">${isPunched ? 'check_circle' : 'radio_button_unchecked'}</span>
                                <span>${isPunched ? '已打卡' : '未打卡'}</span>
                            </span>
                        </div>
                        <div class="chat-stats-grid">
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:var(--md-sys-color-primary);">menu_book</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">新学</span>
                                    <span class="chat-stat-val">${log.learned || 0} 词</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#0284c7;">replay</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">已复习</span>
                                    <span class="chat-stat-val">${log.reviewed || 0} 词</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#16a34a;">sports_esports</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">Wordle</span>
                                    <span class="chat-stat-val">${log.riddle || 0} 次</span>
                                </div>
                            </div>
                            <div class="chat-stat-item">
                                <span class="material-symbols-rounded chat-stat-icon" style="color:#d97706;">edit_note</span>
                                <div class="chat-stat-info">
                                    <span class="chat-stat-label">默写</span>
                                    <span class="chat-stat-val">${log.dictation || 0} 词</span>
                                </div>
                            </div>
                        </div>
                        <div class="chat-dialog-motto">
                            ${commentText}
                        </div>
                    </div>
                </div>
                `;
    }
};
window.DailyStudyTracker = DailyStudyTracker;

function shiftCalendarWeek(direction) {
    currentCalendarWeekOffset += direction;
    DailyStudyTracker.renderWeekCalendar(currentCalendarWeekOffset);
}
