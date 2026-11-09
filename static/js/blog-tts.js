(function () {
  'use strict';

  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  var content = document.querySelector('.post-content');
  if (!content) return;

  var SEL = 'p, h2, h3, h4, h5, li, blockquote';
  var SKIP = 'pre, code, figure, script, style, .tts-bar, .tts-voice-row';
  var MAXLEN = 80;
  var RATES = [0.8, 1.0, 1.25, 1.5, 1.75];

  /* ---- language detection: CJK vs Latin char ratio ---- */
  function detectLang(text) {
    var cjk = 0, latin = 0, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (ch >= '\u4e00' && ch <= '\u9fff') cjk++;
      else if (ch >= '\u3400' && ch <= '\u4dbf') cjk++;
      else if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) latin++;
    }
    if (cjk + latin < 4) return 'zh';
    return cjk > latin ? 'zh' : 'en';
  }

  /* ---- text splitting ---- */
  function textOf(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function hardSplit(s) {
    var out = [], buf = '';
    for (var i = 0; i < s.length; i++) {
      buf += s.charAt(i);
      if ('\u3001\uFF0C\u002C\u3002\uFF1F\uFF01\u3003\uFF1B\u003B'.indexOf(s.charAt(i)) >= 0 && buf.length > 40) {
        out.push(buf); buf = '';
      } else if (buf.length >= MAXLEN) {
        out.push(buf); buf = '';
      }
    }
    if (buf) out.push(buf);
    return out;
  }
  function splitText(t) {
    /* 逗号也参与切分：安卓上对长句 cut-out 概率更高，单句越短越稳 */
    var rough = t.match(/[^。\uff01\uff00\uff1f\uff1b\u003b\uff0c\u002c]+[。\uff01\uff00\uff1f\uff1b\u003b\uff0c\u002c]?/g) || [t];
    var out = [];
    rough.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (s.length <= MAXLEN) out.push(s);
      else out = out.concat(hardSplit(s));
    });
    return out;
  }

  /* ---- collect chunks by language ---- */
  var zhChunks = [], enChunks = [];
  Array.prototype.forEach.call(content.querySelectorAll(SEL), function (el) {
    if (el.querySelector(SKIP)) return;
    var t = textOf(el);
    if (t.length < 2) return;
    var lang = detectLang(t);
    var target = (lang === 'en') ? enChunks : zhChunks;
    splitText(t).forEach(function (s) { target.push({ text: s, el: el }); });
  });
  var hasZH = zhChunks.length > 0;
  var hasEN = enChunks.length > 0;
  if (!hasZH && !hasEN) return;

  var ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2" width="2.2" height="8" rx="1"/><rect x="6.8" y="2" width="2.2" height="8" rx="1"/></svg>';

  /* ---- shared state ---- */
  var rateIdx = 1;
  var voiceOverride = null;
  var keepAlive = null;
  var activeEl = null;
  /* 触屏设备（手机/平板）判定：用于禁用安卓上会破坏状态机的 pause/resume 保活 */
  var IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  /* 防止 SpeechSynthesisUtterance 被 GC 回收导致 onend/onstart 不触发（Chromium bug #509488） */
  var liveUtts = [];

  /* ---- labels per language ---- */
  var LABEL = {
    zh: { play: '\u8bfb\u4e2d\u6587', pause: '\u6682\u505c', resume: '\u7eed\u8bfb', restart: '\u91cd\u8bfb', stop: '\u505c\u6b62', done: '\u5df2\u8bfb\u5b8c' },
    en: { play: 'Read English', pause: 'Pause', resume: 'Resume', restart: 'Re-read', stop: 'Stop', done: 'Finished' }
  };

  function pickVoice(lang) {
    var vs = window.speechSynthesis.getVoices() || [];
    if (!vs.length) return null;
    var pref = (lang === 'en')
      ? ['US English', 'en-US', 'Aria', 'Jenny', 'Samantha', 'Google US English', 'British English', 'en-GB']
      : ['Xiaoxiao', 'Yaoyao', 'Huihui', 'Xiaoyi', 'Tingting', 'Ting-Ting', 'Chinese', 'Mandarin', 'zh-CN'];
    var cand = vs.filter(function (v) { return new RegExp('^' + lang, 'i').test(v.lang || ''); });
    var pool = cand.length ? cand : vs;
    if (!pool.length) return null;
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < pool.length; j++) {
        var name = (pool[j].name || '') + ' ' + (pool[j].lang || '');
        if (name.indexOf(pref[i]) >= 0) return pool[j];
      }
    }
    return pool[0];
  }

  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
  function startKeepAlive() {
    stopKeepAlive();
    /* 安卓 Chrome 的 pause()/resume() 会破坏状态机，导致后续 speak 掉进 pending 卡死；
       社区一致结论：此保活仅桌面可用，触屏设备必须禁用 */
    if (IS_TOUCH) return;
    keepAlive = setInterval(function () {
      var sp = window.speechSynthesis;
      /* 页面不可见时不做 pause/resume，避免切后台仍反复扰动 TTS */
      if (document.visibilityState !== 'visible') return;
      if (sp.speaking && !sp.paused) { sp.pause(); sp.resume(); }
    }, 13000);
  }

  /* ---- per-button session: wire up state machine on an already-built s object ---- */
  function wireSession(s, chunks) {

    function label() { return LABEL[s.lang]; }

    function setBtn() {
      var l = label();
      if (s.playing) s.btn.innerHTML = ICON_PAUSE + '<span class="tts-btn-text">' + l.pause + '</span>';
      else if (s.idx >= chunks.length) s.btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">' + l.restart + '</span>';
      else if (s.idx > 0) s.btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">' + l.resume + '</span>';
      else s.btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">' + l.play + '</span>';
    }

    function clearMark() {
      if (s.lastEl) s.lastEl.className = (s.lastEl.className || '').replace(/\s*tts-active/g, '');
      s.lastEl = null;
      if (activeEl === s.lastEl) activeEl = null;
    }

    function markNow() {
      var c = chunks[s.idx];
      if (!c) return;
      s.nowEl.textContent = c.text.length > 24 ? c.text.slice(0, 24) + '\u2026' : c.text;
      s.progEl.style.width = Math.round(((s.idx + 1) / chunks.length) * 100) + '%';
      if (c.el !== s.lastEl) {
        clearMark();
        s.lastEl = c.el;
        s.lastEl.className = (s.lastEl.className || '') + ' tts-active';
        activeEl = s.lastEl;
        /* 滚动优化：每 3 句才考虑滚一次，且仅在当前句已滚出可视区时才滚；
           用 auto 而非 smooth，避免手机端高频平滑滚动造成卡顿 */
        if ((s.idx % 3 === 0)) {
          try {
            var r = s.lastEl.getBoundingClientRect();
            if (r.bottom < 0 || r.top > (window.innerHeight || document.documentElement.clientHeight)) {
              s.lastEl.scrollIntoView({ block: 'center', behavior: 'auto' });
            }
          } catch (e) {}
        }
      }
    }

    var stuckTimer = null;
    function clearStuck() { if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; } }
    function advance() {
      s.idx++;
      if (s.idx >= chunks.length) { finish(); return; }
      /* 安卓 Chrome 在 onend 内同步 speak 常导致下一句不发音 / 卡死；
         用极短延时让事件循环回到空闲态再朗读（社区公认的连续朗读修复） */
      setTimeout(function () { if (s.playing) speakCurrent(); }, 120);
    }

    function speakCurrent() {
      clearStuck();
      if (s.idx >= chunks.length) { finish(); return; }
      var voice = (voiceOverride && voiceOverride.lang === s.lang) ? voiceOverride : pickVoice(s.lang);
      var text = chunks[s.idx].text;
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = (voice && voice.lang) || (s.lang === 'en' ? 'en-US' : 'zh-CN');
      if (voice) u.voice = voice;
      u.rate = RATES[rateIdx];
      u.pitch = 1;
      /* 防 GC：把 utterance 存进高作用域数组，避免朗读中被回收导致 onend 不触发（Chromium #509488） */
      s.utt = u;
      liveUtts.push(u);
      if (liveUtts.length > 8) liveUtts.shift();
      /* 真正开始读了就取消卡死计时 */
      u.onstart = function () { clearStuck(); };
      u.onend = function () { if (!s.playing) return; advance(); };
      u.onerror = function (e) {
        if (!s.playing) return;
        /* 我们自己 cancel() 触发的 interrupted 交给 stuck 兜底，避免重复推进 */
        if (e && e.error === 'interrupted') return;
        advance();
      };
      markNow();
      /* 每次 speak 前 cancel() 清空 pending 队列（安卓 pending 堆积是卡死主因之一），
         并用 setTimeout(0) 包裹 speak，修复 onend 顺序/触发问题（社区验证） */
      try { window.speechSynthesis.cancel(); } catch (e2) {}
      setTimeout(function () {
        try { window.speechSynthesis.speak(u); } catch (e2) {}
      }, 0);
      /* 每句独立的卡死检测：移动端常因某句合成静默卡死（onend/onerror 都不触发），
         超时则强制取消并推进下一句，避免"读几行就停"停在某一句 */
      var est = Math.max(6000, Math.min(30000, text.length * 90 + 4000));
      stuckTimer = setTimeout(function () {
        stuckTimer = null;
        if (!s.playing) return;
        /* 先临时置 false，避免 cancel() 同步触发的 onend/onerror 重复 advance 导致跳句 */
        s.playing = false;
        try { window.speechSynthesis.cancel(); } catch (e2) {}
        s.playing = true;
        advance();
      }, est);
    }

    function start() {
      if (s.idx >= chunks.length) s.idx = 0;
      s.playing = true;
      setBtn();
      speakCurrent();
      startKeepAlive();
    }

    function pause() {
      if (!s.playing) return;
      s.playing = false;
      try { window.speechSynthesis.pause(); } catch (e) {}
      setBtn();
      stopKeepAlive();
    }

    function resume() {
      s.playing = true;
      try { window.speechSynthesis.resume(); } catch (e) { speakCurrent(); }
      setBtn();
      startKeepAlive();
    }

    function restart() {
      stopKeepAlive();
      try { window.speechSynthesis.cancel(); } catch (e) {}
      s.idx = 0;
      clearMark();
      s.progEl.style.width = '0%';
      s.playing = true;
      setBtn();
      speakCurrent();
      startKeepAlive();
    }

    function stop() {
      s.playing = false;
      stopKeepAlive();
      s.idx = 0;
      try { window.speechSynthesis.cancel(); } catch (e) {}
      clearMark();
      s.nowEl.textContent = '';
      s.progEl.style.width = '0%';
      setBtn();
    }

    function finish() {
      s.playing = false;
      stopKeepAlive();
      clearMark();
      s.nowEl.textContent = label().done;
      s.progEl.style.width = '100%';
      setBtn();
    }

    s.btn.addEventListener('click', function () {
      if (s.playing) pause();
      else if (s.idx >= chunks.length) restart();
      else if (s.idx > 0) resume();
      else start();
    });

    s.stopEl.addEventListener('click', stop);
    s.speakAt = speakCurrent;   /* expose for shared rate-change handler */
    return s;
  }

  /* ---- build UI ---- */
  var bar = document.createElement('div');
  bar.className = 'tts-bar';
  var sessions = [];

  function buildSession(lang, chunks) {
    var l = LABEL[lang];
    var host = document.createElement('div');
    host.className = 'tts-btn-group';
    host.innerHTML =
      '<button type="button" class="tts-btn" aria-label="' + l.play + '">' + ICON_PLAY +
      '<span class="tts-btn-text">' + l.play + '</span></button>' +
      '<span class="tts-prog"><i></i></span>' +
      '<button type="button" class="tts-stop" aria-label="' + l.stop + '">' + l.stop + '</button>' +
      '<span class="tts-now"></span>';
    bar.appendChild(host);
    var sess = {
      chunks: chunks, lang: lang, idx: 0, playing: false, lastEl: null,
      btn: host.querySelector('.tts-btn'),
      stopEl: host.querySelector('.tts-stop'),
      nowEl: host.querySelector('.tts-now'),
      progEl: host.querySelector('.tts-prog i')
    };
    wireSession(sess, chunks);
    sessions.push(sess);
    return sess;
  }

  if (hasZH) buildSession('zh', zhChunks);
  if (hasEN) buildSession('en', enChunks);

  /* ---- shared control row: 语速 + 音色 两个下拉并排 ---- */
  var speedOpts = RATES.map(function (r, i) {
    return '<option value="' + i + '"' + (i === rateIdx ? ' selected' : '') + '>' + r.toFixed(2).replace(/0$/, '') + '\u00d7</option>';
  }).join('');
  var ctlRow = document.createElement('div');
  ctlRow.className = 'tts-ctl-row';
  ctlRow.innerHTML =
    '<label class="tts-voice-label" for="ttsSpeedSel">\u901f\u7387 / Speed</label>' +
    '<select id="ttsSpeedSel" class="tts-voice tts-speed">' + speedOpts + '</select>' +
    '<label class="tts-voice-label" for="ttsVoiceSel">\u97f3\u8272 / Voice</label>' +
    '<select id="ttsVoiceSel" class="tts-voice"><option value="">\u81ea\u52a8 / Auto</option></select>';
  bar.insertBefore(ctlRow, bar.firstChild);
  var speedSel = ctlRow.querySelector('#ttsSpeedSel');
  var voiceSel = ctlRow.querySelector('#ttsVoiceSel');
  speedSel.addEventListener('change', function () {
    rateIdx = parseInt(speedSel.value, 10);
    var wasSpeaking = window.speechSynthesis.speaking || sessions.some(function (s) { return s.playing; });
    if (wasSpeaking) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      sessions.forEach(function (s) {
        if (s.playing) { s.speakAt(); startKeepAlive(); }
      });
    }
  });

  /* ---- populate voice picker options (voiceSel is in ctlRow) ---- */
  function populateVoices() {
    var vs = window.speechSynthesis.getVoices() || [];
    var zh = vs.filter(function (v) { return /^zh/i.test(v.lang || ''); });
    var en = vs.filter(function (v) { return /^en/i.test(v.lang || ''); });
    var opts = '<option value="">\u81ea\u52a8 / Auto</option>';
    if (zh.length) opts += '<optgroup label="\u4e2d\u6587 zh">' + zh.map(function (v) { return '<option value="' + encodeURIComponent(v.name + '|' + v.lang) + '">' + v.name + '</option>'; }).join('') + '</optgroup>';
    if (en.length) opts += '<optgroup label="English en">' + en.map(function (v) { return '<option value="' + encodeURIComponent(v.name + '|' + v.lang) + '">' + v.name + '</option>'; }).join('') + '</optgroup>';
    voiceSel.innerHTML = opts;
  }
  voiceSel.addEventListener('change', function () {
    var v = voiceSel.value;
    if (!v) { voiceOverride = null; return; }
    var parts = v.split('|');
    voiceOverride = (window.speechSynthesis.getVoices() || []).filter(function (x) { return x.name === parts[0]; })[0] || null;
  });
  populateVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  if (content.parentNode) content.parentNode.insertBefore(bar, content);
  else return;

  window.addEventListener('beforeunload', function () {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  });
})();
