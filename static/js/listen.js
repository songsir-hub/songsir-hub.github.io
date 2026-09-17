(function () {
  'use strict';

  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  var content = document.querySelector('.post-content');
  if (!content) return;

  var SEL = 'p, h2, h3, h4, h5, li, blockquote';
  var SKIP = 'pre, code, figure, script, style, .tts-bar, .tts-voice-row';
  var MAXLEN = 100;
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
    var rough = t.match(/[^。\uff01\uff00\uff1f\uff1b\u003b]+[.\uff01\uff00\uff1f\uff1b\u003b]?/g) || [t];
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
  var watchDog = null;
  var activeEl = null;

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
    keepAlive = setInterval(function () {
      var sp = window.speechSynthesis;
      if (sp.speaking && !sp.paused) { sp.pause(); sp.resume(); }
    }, 9000);
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
        try { s.lastEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      }
    }

    function speakCurrent() {
      if (s.idx >= chunks.length) { finish(); return; }
      var voice = (voiceOverride && voiceOverride.lang === s.lang) ? voiceOverride : pickVoice(s.lang);
      var u = new window.SpeechSynthesisUtterance(chunks[s.idx].text);
      u.lang = (voice && voice.lang) || (s.lang === 'en' ? 'en-US' : 'zh-CN');
      if (voice) u.voice = voice;
      u.rate = RATES[rateIdx];
      u.pitch = 1;
      u.onstart = function () { if (watchDog) { clearTimeout(watchDog); watchDog = null; } };
      u.onend = function () { if (!s.playing) return; s.idx++; if (s.idx >= chunks.length) finish(); else speakCurrent(); };
      u.onerror = function () { if (!s.playing) return; s.idx++; if (s.idx >= chunks.length) finish(); else speakCurrent(); };
      markNow();
      window.speechSynthesis.speak(u);
      if (!watchDog) {
        watchDog = setTimeout(function () {
          watchDog = null;
          if (s.playing && !window.speechSynthesis.speaking) {
            s.nowEl.textContent = (s.lang === 'en') ? 'No English voice detected' : '\u5f53\u524d\u6d4f\u89c8\u5668\u672a\u68c0\u6d4b\u5230\u53ef\u7528\u8bed\u97f3';
          }
        }, 3000);
      }
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
      '<button type="button" class="tts-rate" aria-label="' + (lang === 'en' ? 'Adjust speed' : '\u8c03\u6574\u8bed\u901f') + '">' + RATES[rateIdx].toFixed(2).replace(/0$/, '') + '\u00d7</button>' +
      '<span class="tts-prog"><i></i></span>' +
      '<button type="button" class="tts-stop" aria-label="' + l.stop + '">' + l.stop + '</button>' +
      '<span class="tts-now"></span>';
    bar.appendChild(host);
    var rateEl = host.querySelector('.tts-rate');
    var sess = {
      chunks: chunks, lang: lang, idx: 0, playing: false, lastEl: null,
      btn: host.querySelector('.tts-btn'),
      stopEl: host.querySelector('.tts-stop'),
      nowEl: host.querySelector('.tts-now'),
      progEl: host.querySelector('.tts-prog i')
    };
    wireSession(sess, chunks);
    rateEl.addEventListener('click', function () {
      rateIdx = (rateIdx + 1) % RATES.length;
      var all = bar.querySelectorAll('.tts-rate');
      for (var i = 0; i < all.length; i++) all[i].textContent = RATES[rateIdx].toFixed(2).replace(/0$/, '') + '\u00d7';
    });
    sessions.push(sess);
    return sess;
  }

  if (hasZH) buildSession('zh', zhChunks);
  if (hasEN) buildSession('en', enChunks);

  /* ---- voice picker (shared) ---- */
  var voiceRow = document.createElement('div');
  voiceRow.className = 'tts-voice-row';
  voiceRow.innerHTML =
    '<label class="tts-voice-label" for="ttsVoiceSel">\u97f3\u8272 / Voice</label>' +
    '<select id="ttsVoiceSel" class="tts-voice"><option value="">\u81ea\u52a8 / Auto</option></select>';
  bar.insertBefore(voiceRow, bar.firstChild);
  var voiceSel = voiceRow.querySelector('#ttsVoiceSel');
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
