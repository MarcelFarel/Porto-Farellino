(function () {
  'use strict';

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. Bidirectional Scroll-Driven Reveal Engine ---------- */
  var revealEls = qsa('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          /* Re-trigger transition whether scrolling up or down */
          entry.target.classList.remove('is-visible');
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 2. Scroll Progress Bar & Floating Section Dock ---------- */
  var scrollBar = qs('#scroll-progress');
  var dockLinks = qsa('[data-dock-link]');
  var trackedSections = ['top', 'showcase', 'stack', 'projects', 'experience', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function onWindowScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollBar && docHeight > 0) {
      var pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      scrollBar.style.width = pct.toFixed(1) + '%';
    }

    if (trackedSections.length && dockLinks.length) {
      var activeId = trackedSections[0].id;
      var probeY = scrollTop + window.innerHeight * 0.34;
      trackedSections.forEach(function (sec) {
        if (sec.offsetTop <= probeY) {
          activeId = sec.id;
        }
      });
      dockLinks.forEach(function (link) {
        var match = link.getAttribute('data-dock-link') === activeId;
        link.classList.toggle('is-active', match);
      });
    }
  }
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  onWindowScroll();

  /* ---------- 3. Hero Dynamic Role Rotator ---------- */
  var roleEl = qs('#role-rotator');
  if (roleEl) {
    var roles = [
      'Database Technology & OLAP',
      'Data Engineering & Pentaho ETL',
      'Backend Systems & SQL Optimization',
      'Python Machine Learning & Analytics'
    ];
    var roleIdx = 0;
    setInterval(function () {
      if (document.hidden) return;
      roleIdx = (roleIdx + 1) % roles.length;
      roleEl.style.opacity = '0';
      roleEl.style.transform = 'translateY(6px)';
      setTimeout(function () {
        roleEl.textContent = roles[roleIdx];
        roleEl.style.opacity = '1';
        roleEl.style.transform = 'translateY(0)';
      }, 220);
    }, 2900);
  }

  /* ---------- 4. Interactive 3D-Tilt Portrait Card & Photo Loader ---------- */
  var portraitCard = qs('#portrait-card');
  var photoImg = qs('#profile-photo-img');
  var uploadBtn = qs('#profile-upload-btn');
  var fileInput = qs('#profile-file-input');

  if (portraitCard) {
    portraitCard.addEventListener('mousemove', function (e) {
      var rect = portraitCard.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      portraitCard.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      portraitCard.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
    });
    portraitCard.addEventListener('mouseleave', function () {
      portraitCard.style.setProperty('--rx', '0deg');
      portraitCard.style.setProperty('--ry', '0deg');
    });
  }

  if (photoImg) {
    try {
      var savedPhoto = localStorage.getItem('farellino_profile_photo');
      if (savedPhoto) {
        photoImg.src = savedPhoto;
      } else {
        /* Automatically check if user placed assets/img/profile.jpg */
        var probeImg = new Image();
        probeImg.onload = function () { photoImg.src = 'assets/img/profile.jpg'; };
        probeImg.src = 'assets/img/profile.jpg';
      }
    } catch (err) {}
  }

  if (uploadBtn && fileInput && photoImg) {
    uploadBtn.addEventListener('click', function () {
      fileInput.click();
    });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var dataUrl = ev.target.result;
        photoImg.src = dataUrl;
        try { localStorage.setItem('farellino_profile_photo', dataUrl); } catch (err) {}
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 5. Bento Grid Cursor Spotlight ---------- */
  qsa('.bento-cell').forEach(function (cell) {
    cell.addEventListener('mousemove', function (e) {
      var r = cell.getBoundingClientRect();
      cell.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      cell.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- 6. Accessible Tabs (Workbenches & Pipeline Steps) ---------- */
  function initTablist(list) {
    if (list.classList.contains('carousel-tabs') || list.classList.contains('slider-dots')) return;
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

  /* ---------- 7. Auto-Playing Showcase Carousel ---------- */
  var heroCarousel = qs('#hero-carousel');
  if (heroCarousel) {
    var heroTabs = qsa('[data-hero-tab]', heroCarousel);
    var heroSlides = qsa('[data-hero-slide]', heroCarousel);
    var heroBars = qsa('[data-hero-progress]', heroCarousel);
    var heroPrev = qs('#hero-carousel-prev', heroCarousel);
    var heroNext = qs('#hero-carousel-next', heroCarousel);
    var heroToggle = qs('#hero-carousel-toggle', heroCarousel);
    var heroCaption = qs('#hero-carousel-caption', heroCarousel);
    var heroCta = qs('#hero-carousel-cta', heroCarousel);

    var slideTargets = [
      { href: '#project-grocery', label: 'Open Grocery OLAP Workbench' },
      { href: '#project-flood', label: 'Open Flood Risk Simulator' },
      { href: '#project-crypito', label: 'Open cryPito Live App' }
    ];

    var heroIdx = 0;
    var heroDuration = 4600;
    var heroElapsed = 0;
    var heroLastTick = performance.now();
    var heroAuto = true;
    var heroHover = false;

    function setHeroSlide(idx) {
      heroIdx = (idx + heroSlides.length) % heroSlides.length;
      heroElapsed = 0;
      heroTabs.forEach(function (t, i) {
        t.setAttribute('aria-selected', String(i === heroIdx));
      });
      heroSlides.forEach(function (s, i) {
        s.hidden = i !== heroIdx;
      });
      heroBars.forEach(function (b, i) {
        b.style.width = i < heroIdx ? '100%' : '0%';
      });
      if (heroCaption) {
        heroCaption.textContent = 'Slide ' + (heroIdx + 1) + ' of ' + heroSlides.length + (heroAuto ? ' • Hover to pause' : ' • Paused');
      }
      if (heroCta && slideTargets[heroIdx]) {
        heroCta.href = slideTargets[heroIdx].href;
        heroCta.textContent = slideTargets[heroIdx].label;
      }
    }

    heroTabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        setHeroSlide(i);
      });
    });

    if (heroPrev) {
      heroPrev.addEventListener('click', function () {
        setHeroSlide(heroIdx - 1);
      });
    }
    if (heroNext) {
      heroNext.addEventListener('click', function () {
        setHeroSlide(heroIdx + 1);
      });
    }
    if (heroToggle) {
      heroToggle.addEventListener('click', function () {
        heroAuto = !heroAuto;
        heroToggle.textContent = heroAuto ? 'Auto: ON' : 'Auto: OFF';
        heroToggle.setAttribute('aria-pressed', String(!heroAuto));
        if (heroCaption) {
          heroCaption.textContent = 'Slide ' + (heroIdx + 1) + ' of ' + heroSlides.length + (heroAuto ? ' • Hover to pause' : ' • Paused');
        }
      });
    }

    heroCarousel.addEventListener('mouseenter', function () { heroHover = true; });
    heroCarousel.addEventListener('mouseleave', function () { heroHover = false; });

    function tickHero(now) {
      var dt = now - heroLastTick;
      heroLastTick = now;
      if (heroAuto && !heroHover && !document.hidden) {
        heroElapsed += dt;
        var pct = Math.min(100, (heroElapsed / heroDuration) * 100);
        if (heroBars[heroIdx]) {
          heroBars[heroIdx].style.width = pct.toFixed(1) + '%';
        }
        if (heroElapsed >= heroDuration) {
          setHeroSlide(heroIdx + 1);
        }
      }
      requestAnimationFrame(tickHero);
    }
    requestAnimationFrame(tickHero);
  }

  /* ---------- 8. Auto-Playing Project Media Sliders ---------- */
  qsa('[data-auto-slider]').forEach(function (slider) {
    var items = qsa('.media-slide-item', slider);
    var dots = qsa('[data-slider-dot]', slider);
    var titleEl = qs('[data-slider-title]', slider);
    var prevBtn = qs('[data-slider-prev]', slider);
    var nextBtn = qs('[data-slider-next]', slider);
    if (!items.length) return;

    var cur = 0;
    var paused = false;

    function showSlide(n) {
      cur = (n + items.length) % items.length;
      items.forEach(function (item, i) {
        item.hidden = i !== cur;
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-selected', String(i === cur));
      });
      if (titleEl && items[cur]) {
        var lbl = items[cur].getAttribute('data-slide-label');
        if (lbl) titleEl.textContent = lbl;
      }
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { showSlide(i); });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { showSlide(cur - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showSlide(cur + 1); });

    slider.addEventListener('mouseenter', function () { paused = true; });
    slider.addEventListener('mouseleave', function () { paused = false; });

    setInterval(function () {
      if (!paused && !document.hidden) {
        showSlide(cur + 1);
      }
    }, 4200);
  });

  /* ---------- 9. Full-Screen Image Lightbox ---------- */
  var lightboxModal = qs('#lightbox-modal');
  var lightboxImg = qs('#lightbox-img');
  var lightboxCaption = qs('#lightbox-caption');
  var lightboxClose = qs('#lightbox-close');

  function openLightbox(src, caption, alt) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || caption || 'Architecture diagram';
    if (lightboxCaption) lightboxCaption.textContent = caption || alt || 'Preview';
    lightboxModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.hidden = true;
    document.body.style.overflow = '';
  }

  qsa('[data-lightbox-src]').forEach(function (el) {
    el.addEventListener('click', function () {
      openLightbox(
        el.getAttribute('data-lightbox-src'),
        el.getAttribute('data-lightbox-caption'),
        el.getAttribute('alt')
      );
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', function (e) {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  /* ---------- 10. Quick Command Palette (Ctrl+K / Cmd+K) ---------- */
  var cmdModal = qs('#cmd-modal');
  var cmdTrigger = qs('#cmd-trigger');
  var cmdClose = qs('#cmd-close');

  function openCmd() {
    if (!cmdModal) return;
    cmdModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCmd() {
    if (!cmdModal) return;
    cmdModal.hidden = true;
    document.body.style.overflow = '';
  }

  if (cmdTrigger) cmdTrigger.addEventListener('click', openCmd);
  if (cmdClose) cmdClose.addEventListener('click', closeCmd);
  if (cmdModal) {
    cmdModal.addEventListener('click', function (e) {
      if (e.target === cmdModal) closeCmd();
    });
  }

  qsa('[data-cmd-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var act = btn.getAttribute('data-cmd-action');
      closeCmd();
      if (act === 'grocery-bi') {
        var t1 = qs('#g-tab-dash');
        if (t1) t1.click();
        var p1 = qs('#project-grocery');
        if (p1) p1.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'grocery-sql') {
        var t2 = qs('#g-tab-sql');
        if (t2) t2.click();
        var p2 = qs('#project-grocery');
        if (p2) p2.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'flood-sim') {
        var t3 = qs('#f-tab-sim');
        if (t3) t3.click();
        var p3 = qs('#project-flood');
        if (p3) p3.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'flood-scatter') {
        var t4 = qs('#f-tab-fit');
        if (t4) t4.click();
        var p4 = qs('#project-flood');
        if (p4) p4.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'crypito-live') {
        var t5 = qs('#c-tab-live');
        if (t5) t5.click();
        var p5 = qs('#project-crypito');
        if (p5) p5.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'copy-email') {
        var cBtn = qs('#copy-email');
        if (cBtn) cBtn.click();
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModal && cmdModal.hidden) openCmd();
      else closeCmd();
    } else if (e.key === 'Escape') {
      if (lightboxModal && !lightboxModal.hidden) closeLightbox();
      if (cmdModal && !cmdModal.hidden) closeCmd();
    }
  });

  /* ---------- 11. Mobile Menu ---------- */
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
      if (window.innerWidth >= 820 && !mobileMenu.hidden) setMenu(false);
    });
  }

  /* ---------- 12. cryPito Browser Frame Controller ---------- */
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

  /* ---------- 13. Copy Email ---------- */
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
