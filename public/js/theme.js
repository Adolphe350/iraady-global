/*
 * Theme: loaded synchronously in <head> so the right palette is stamped on
 * <html data-theme> before first paint (no white flash in dark mode).
 * The visitor's choice is remembered; otherwise the system setting wins.
 * Any element with [data-theme-toggle] flips it.
 */
(function () {
    var KEY = 'ir-theme';
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function apply(theme) { root.setAttribute('data-theme', theme); }
    apply(saved || (media && media.matches ? 'dark' : 'light'));

    if (media && media.addEventListener) {
        media.addEventListener('change', function (e) {
            var stored = null;
            try { stored = localStorage.getItem(KEY); } catch (err) {}
            if (!stored) apply(e.matches ? 'dark' : 'light');
        });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
        if (!btn) return;
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem(KEY, next); } catch (err) {}
    });
})();
