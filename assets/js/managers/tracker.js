/**
 * 学习打卡记录器与周历热力图
 * Module: assets/js/managers/tracker.js
 */

let currentCalendarWeekOffset = 0;
let currentSelectedCalendarDate = null;

const DailyStudyTracker = {
    getLogs() {
        if (!currentUser) return {};
        try {
            return JSON.parse(localStorage.getItem(`vocab_daily_logs_${currentUser}`) || '{}');
        } catch (e) {
            return {};
        }
    },
    saveLogs(logs) {
        if (!currentUser) return;
        localStorage.setItem(`vocab_daily_logs_${currentUser}`, JSON.stringify(logs));
    },
    getTodayStr() {
        const d = new Date();
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
            logs[todayStr] = { learned: 0, reviewed: 0, riddle: 0, dictation: 0 };
        }
        logs[todayStr][type] = (logs[todayStr][type] || 0) + count;
        this.saveLogs(logs);
        this.renderWeekCalendar(currentCalendarWeekOffset);
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
