(function () {
  'use strict';

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Accessible Tabs (Workbenches & Pipeline Steps) ---------- */
  function initTablist(list) {
    var tabs = qsa('[role="tab"]', list);
    function select(tab, moveFocus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panelId = t.getAttribute('aria-controls');
        var panel = panelId ? document.getElementById(panelId) : null;
        if (panel) panel.hidden = !on;
      });
      if (moveFocus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(tabs[next], true);
        }
      });
    });
  }
  qsa('[role="tablist"]').forEach(initTablist);

  /* ---------- Mobile Menu ---------- */
  var menuBtn = qs('#menu-btn');
  var mobileMenu = qs('#mobile-menu');
  if (menuBtn && mobileMenu) {
    var setMenu = function (open) {
      mobileMenu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', function () { setMenu(mobileMenu.hidden); });
    qsa('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768 && !mobileMenu.hidden) setMenu(false);
    });
  }

  /* ---------- cryPito Browser Frame Controller ---------- */
  var cryFrame = qs('#crypito-iframe');
  var cryUrl = qs('#crypito-url');
  var cryOpenLink = qs('#crypito-open-new');
  var cryViewport = qs('#crypito-viewport');

  function updateCrypitoChrome(pageFile) {
    var relPath = 'assets/crypito/HTML/' + pageFile;
    if (cryUrl) cryUrl.textContent = 'crypito.app/HTML/' + pageFile;
    if (cryOpenLink) cryOpenLink.href = relPath;
    qsa('[data-crypito-page]').forEach(function (btn) {
      var match = btn.getAttribute('data-crypito-page') === pageFile;
      btn.setAttribute('aria-pressed', String(match));
    });
  }

  qsa('[data-crypito-page]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pageFile = btn.getAttribute('data-crypito-page');
      if (cryFrame) cryFrame.src = 'assets/crypito/HTML/' + pageFile;
      updateCrypitoChrome(pageFile);
    });
  });

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'crypito-page' && e.data.page) {
      updateCrypitoChrome(e.data.page);
    }
  });

  qsa('[data-crypito-width]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var w = btn.getAttribute('data-crypito-width');
      if (cryViewport) cryViewport.style.maxWidth = w;
      qsa('[data-crypito-width]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  /* ---------- Copy Email ---------- */
  var copyBtn = qs('#copy-email');
  var copyLabel = copyBtn ? qs('[data-copy-label]', copyBtn) : null;
  var copyStatus = qs('#copy-status');
  var copyTimer = null;

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function showCopyResult(ok) {
    if (!copyBtn || !copyLabel) return;
    var msg = ok ? 'Copied to clipboard' : 'Copy failed';
    copyLabel.textContent = msg;
    if (copyStatus) copyStatus.textContent = msg;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      copyLabel.textContent = 'Copy Email';
      if (copyStatus) copyStatus.textContent = '';
    }, 2200);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () { showCopyResult(true); },
          function () { showCopyResult(fallbackCopy(text)); }
        );
      } else {
        showCopyResult(fallbackCopy(text));
      }
    });
  }
})();
