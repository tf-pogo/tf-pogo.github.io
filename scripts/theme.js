/* 主题切换：html.dark 是唯一真源（head 里的内联脚本在首屏前就已设好） */
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

    function sync() {
        var dark = root.classList.contains('dark');
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        var label = dark ? '切换到浅色模式' : '切换到深色模式';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
    }

    function apply(dark) {
        root.classList.toggle('dark', dark);
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
        sync();
    }

    function toggle() {
        var dark = !root.classList.contains('dark');

        // 不支持 View Transitions 或用户要求减少动效时，直接切换
        if (!document.startViewTransition || (reduce && reduce.matches)) {
            apply(dark);
            return;
        }

        var rect = btn.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

        var transition = document.startViewTransition(function () { apply(dark); });
        transition.ready.then(function () {
            root.animate(
                { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)'] },
                { duration: 600, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
            );
        }).catch(function () {});
    }

    sync();
    btn.addEventListener('click', toggle);
})();
