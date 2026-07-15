/* ============================================================
 * 语言自动切换：依据浏览者系统语言显示 简中 / 繁中 / 英文
 * - navigator.language 含 zh-Hant / zh-TW / zh-HK / zh-MO  → 繁中
 * - 含 zh（其他）                                          → 简中
 * - 其他语言                                               → 英文
 * - 同时记住用户手动选择（localStorage），并渲染切换按钮
 * ============================================================ */
(function () {
  'use strict';

  // 页面标题（浏览器标签 + h1）按语言切换
  var TITLES = { 'zh-Hans': '关于', 'zh-Hant': '關於', 'en': 'About' };

  function detectLang() {
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav === 'zh-tw' || nav === 'zh-hk' || nav === 'zh-mo' || nav.indexOf('zh-hant') === 0) {
      return 'zh-Hant';
    }
    if (nav.indexOf('zh') === 0) {
      return 'zh-Hans';
    }
    return 'en';
  }

  function applyLang(lang) {
    var spans = document.querySelectorAll('.i18n');
    for (var i = 0; i < spans.length; i++) {
      spans[i].style.display = (spans[i].getAttribute('data-lang') === lang) ? '' : 'none';
    }
    if (TITLES[lang]) {
      document.title = TITLES[lang];
      var h1 = document.querySelector('article.post h1') || document.querySelector('h1');
      if (h1) { h1.textContent = TITLES[lang]; }
    }
    try { localStorage.setItem('site-lang', lang); } catch (e) {}
    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('active', btns[j].getAttribute('data-lang') === lang);
    }
  }

  function buildSwitcher() {
    if (!document.querySelector('.i18n')) { return; }          // 无多语言内容则不显示
    if (document.querySelector('.lang-switcher')) { return; }
    var wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    var defs = [['zh-Hans', '简'], ['zh-Hant', '繁'], ['en', 'EN']];
    defs.forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'lang-btn';
      b.setAttribute('data-lang', d[0]);
      b.textContent = d[1];
      b.addEventListener('click', function () { applyLang(d[0]); });
      wrap.appendChild(b);
    });
    var main = document.querySelector('main') || document.body;
    main.insertBefore(wrap, main.firstChild);
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem('site-lang'); } catch (e) {}
    applyLang(saved || detectLang());
    buildSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
