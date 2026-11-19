/* =========================================
   全站成绩数据库 + 学科轨迹弹窗
   注意：主题由 <head> 里的内联脚本负责，这里不再处理深色模式。
   ========================================= */
const scoreDB = {
    '语文': { '绵阳二诊': 91, '成都三诊': 80, '德阳三诊': 82, '五月模考': 86, '高考': 96 },
    '数学': { '绵阳二诊': 108, '成都三诊': 96, '德阳三诊': 99, '五月模考': 87, '高考': 107 },
    '英语': { '绵阳二诊': 117, '成都三诊': 116.5, '德阳三诊': 113, '五月模考': 112, '高考': 119 },
    '物理': { '绵阳二诊': 54, '成都三诊': 44, '德阳三诊': 72, '五月模考': 62, '高考': 57 },
    '化学': { '绵阳二诊': 34, '成都三诊': 49, '德阳三诊': 49, '五月模考': 40, '高考': 76 },
    '生物': { '绵阳二诊': 56, '成都三诊': 50, '德阳三诊': 60, '五月模考': 41, '高考': 55 }
};

var lastFocused = null;

function openModal (subject) {
    var data = scoreDB[subject];
    if (!data) return;
    var modal = document.getElementById('historyModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = subject + ' · 历次成绩全记录';

    var htmlStr = '';
    var prevScore = null;

    Object.keys(data).forEach(function (examName) {
        var score = data[examName];
        var trend = '';
        if (prevScore !== null) {
            var diff = score - prevScore;
            if (diff > 0) {
                trend = '<span class="trend-up" style="margin-left:10px;">(↑ 进步 ' + diff + ' 分 🔥)</span>';
            } else if (diff < 0) {
                trend = '<span class="trend-down" style="margin-left:10px;">(↓ 退步 ' + Math.abs(diff) + ' 分 ⚠️)</span>';
            } else {
                trend = '<span style="color: var(--text-tertiary); margin-left:10px;">(持平 🛡️)</span>';
            }
        }
        htmlStr += '<div style="padding: 12px 0; border-bottom: 1px dashed rgba(150,150,150,0.3); display: flex; justify-content: space-between; align-items: center;">' +
            '<span style="color: var(--text-secondary);">' + examName + '</span>' +
            '<div><strong style="font-size: 1.2em; color: var(--color-primary);">' + score + ' 分</strong>' + trend + '</div>' +
            '</div>';
        prevScore = score;
    });

    if (Object.keys(data).length >= 5) {
        htmlStr += '<div style="text-align: center; margin-top: 15px; color: var(--color-primary); font-weight: 600;">高中三年，到此杀青。🎬</div>';
    }

    document.getElementById('modalData').innerHTML = htmlStr;

    lastFocused = document.activeElement;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // 等 .active 的 visibility 从 hidden 切成 visible 再聚焦，否则 focus() 会被浏览器忽略
    var closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
}

function closeModal () {
    var modal = document.getElementById('historyModal');
    if (!modal || !modal.classList.contains('active')) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
}

/* 点遮罩关闭 */
document.addEventListener('click', function (event) {
    var modal = document.getElementById('historyModal');
    if (modal && event.target === modal) closeModal();
});

/* Esc 关闭 + Tab 焦点循环 */
document.addEventListener('keydown', function (event) {
    var modal = document.getElementById('historyModal');
    if (!modal || !modal.classList.contains('active')) return;

    if (event.key === 'Escape') {
        closeModal();
        return;
    }
    if (event.key !== 'Tab') return;

    var focusables = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});
