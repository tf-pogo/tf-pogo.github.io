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
    '语文': { '绵阳二诊': 91, '成都三诊': 80, '德阳三诊': 82, '五月模考': 86 },
    '数学': { '绵阳二诊': 108, '成都三诊': 96, '德阳三诊': 99, '五月模考': 87 },
    '英语': { '绵阳二诊': 117, '成都三诊': 116.5, '德阳三诊': 113, '五月模考': 112 },
    '物理': { '绵阳二诊': 54, '成都三诊': 44, '德阳三诊': 72, '五月模考': 62 },
    '化学': { '绵阳二诊': 34, '成都三诊': 49, '德阳三诊': 49, '五月模考': 40 },
    '生物': { '绵阳二诊': 56, '成都三诊': 50, '德阳三诊': 60, '五月模考': 41 }
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
/* =========================================
   Pogo 的文章索引库 (以后新文章写在这里即可！)
   ========================================= */
const articleList = [
    {
        title: "五月模考复盘：物理的高光时刻 ⚡",
        date: "2026-05-16",
        desc: "物理班排第4！点击查看最新数据对冲",
        link: "./post/wu-yue-mo-kao/index.html"
    },
    // ... 下面保留你之前的成都三诊、德阳三诊等数据 ...
    {
        title: "成都三诊：冰火两重天的成绩单 🔥",
        date: "2026-05-02",
        desc: "英语班排第2，快来看轨迹",
        link: "./post/cheng-du-san-zhen/index.html"
    },
    {
        title: "德阳三诊成绩复盘 📊",
        date: "2026-05-01",
        desc: "点击学科查看与绵阳二诊的对比",
        link: "./post/gao-san-san-zhen/index.html"
    },
    {
        title: "绵阳二诊成绩复盘 & 学科追踪",
        date: "2026-05-01",
        desc: "内含可交互轨迹分析",
        link: "./post/mian-yang-er-zhen/index.html"
    },
    // 👆 以后写了新文章，只需要在这里复制粘贴加大括号就行了！
];
/* =========================================
   Pogo 的懒人魔法：终极防错版本
   ========================================= */
/* =========================================
   Pogo 的懒人魔法：即刻执行版 (绝对生效)
   ========================================= */
(function() {
    // 立即寻找页面里所有需要抢救的错位 td
    const oldSubjectCells = document.querySelectorAll('td.subject-link');
    
    // 给控制台打个报告，你可以按 F12 看看它抓到了几个
    console.log(`[Pogo专属修复机器人] 滴滴，扫描到 ${oldSubjectCells.length} 个老表格，正在执行物理切割...`);

    oldSubjectCells.forEach(td => {
        // 1. 把里面的文字和点击事件拿出来
        const content = td.innerHTML;
        const clickEvent = td.getAttribute('onclick') || '';
        
        // 2. 彻底扒掉 td 的属性
        td.removeAttribute('class');
        td.removeAttribute('onclick');
        
        // 3. 重生为完美的居中药丸！
        td.innerHTML = `<span class="subject-link" style="display: inline-flex;" onclick="${clickEvent}">${content}</span>`;
    });
})();