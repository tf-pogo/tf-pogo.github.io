/* =========================================
   全站深色模式记忆感应器
   ========================================= */
(function() {
    // 网页一加载，立刻检查 localStorage 里的主题设置
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
})();

/* =========================================
   Pogo 的专属成绩数据库
   ========================================= */
const scoreDB = {
    '语文': { '绵阳二诊': 91, '成都三诊': 80, '德阳三诊': 82 },
    '数学': { '绵阳二诊': 108, '成都三诊': 96, '德阳三诊': 99 },
    '英语': { '绵阳二诊': 117, '成都三诊': 116.5, '德阳三诊': 113 },
    '物理': { '绵阳二诊': 54, '成都三诊': 44, '德阳三诊': 72 },
    '化学': { '绵阳二诊': 34, '成都三诊': 49, '德阳三诊': 49 },
    '生物': { '绵阳二诊': 56, '成都三诊': 50, '德阳三诊': 60 }
};

// =========================================
// 核心逻辑：自动计算趋势并生成时间轴
// =========================================
function openModal(subject) {
    const data = scoreDB[subject];
    const modal = document.getElementById('historyModal');
    document.getElementById('modalTitle').innerText = `${subject} · 历次成绩全记录`;
    
    let htmlStr = '';
    let prevScore = null;

    // 自动遍历数据库里该科目的所有考试成绩
    for (const [examName, score] of Object.entries(data)) {
        let trend = '';
        // 自动计算和上一次考试的分差
        if (prevScore !== null) {
            let diff = score - prevScore;
            if (diff > 0) trend = `<span class="trend-up" style="margin-left:10px;">(↑ 进步 ${diff} 分 🔥)</span>`;
            else if (diff < 0) trend = `<span class="trend-down" style="margin-left:10px;">(↓ 退步 ${Math.abs(diff)} 分 ⚠️)</span>`;
            else trend = `<span style="color: #94a3b8; margin-left:10px;">(持平 🛡️)</span>`;
        }
        
        // 生成每一行的数据
        htmlStr += `
            <div style="padding: 12px 0; border-bottom: 1px dashed rgba(150,150,150,0.3); display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">${examName}</span>
                <div>
                    <strong style="font-size: 1.2em; color: #4f46e5;">${score} 分</strong>
                    ${trend}
                </div>
            </div>`;
        prevScore = score;
    }

    // 以后高考出了，这里还可以加一句霸气的话
    if (Object.keys(data).length >= 3) {
        htmlStr += `<div style="text-align: center; margin-top: 15px; color: #ec4899; font-weight: bold;">高考必胜！🚀</div>`;
    }

    document.getElementById('modalData').innerHTML = htmlStr;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('historyModal').classList.remove('active');
}

// 点击背景也可以关闭弹窗
window.onclick = function(event) {
    const modal = document.getElementById('historyModal');
    if (event.target === modal) closeModal();
}