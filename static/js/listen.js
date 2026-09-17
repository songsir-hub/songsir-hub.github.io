(function () {
  'use strict';

  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  var content = document.querySelector('.post-content');
  if (!content) return;

  var SEL = 'p, h2, h3, h4, h5, li, blockquote';
  var SKIP = 'pre, code, figure, script, style, .tts-bar';
  var MAXLEN = 100;
  var RATES = [0.8, 1.0, 1.25, 1.5];

  var chunks = [];
  var idx = 0;
  var playing = false;
  var rateIdx = 1;
  var voice = null;
  var lastEl = null;
  var keepAlive = null;
  var watchDog = null;

  function textOf(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function hardSplit(s) {
    var out = [], buf = '';
    for (var i = 0; i < s.length; i++) {
      buf += s.charAt(i);
      if ('，,、'.indexOf(s.charAt(i)) >= 0 && buf.length > 40) { out.push(buf); buf = ''; }
      else if (buf.length >= MAXLEN) { out.push(buf); buf = ''; }
    }
    if (buf) out.push(buf);
    return out;
  }

  function splitText(t) {
    var rough = t.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [t];
    var out = [];
    rough.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (s.length <= MAXLEN) out.push(s);
      else out = out.concat(hardSplit(s));
    });
    return out;
  }

  Array.prototype.forEach.call(content.querySelectorAll(SEL), function (el) {
    if (el.querySelector(SKIP)) return;
    var t = textOf(el);
    if (t.length < 2) return;
    splitText(t).forEach(function (s) { chunks.push({ text: s, el: el }); });
  });
  if (!chunks.length) return;

  var ICON_PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2" width="2.2" height="8" rx="1"/><rect x="6.8" y="2" width="2.2" height="8" rx="1"/></svg>';

  var bar = document.createElement('div');
  bar.className = 'tts-bar';
  bar.innerHTML =
    '<button type="button" class="tts-btn" aria-label="播放或暂停朗读">' + ICON_PLAY +
    '<span class="tts-btn-text">听全文</span></button>' +
    '<span class="tts-meta">共 ' + chunks.length + ' 句</span>' +
    '<span class="tts-now"></span>' +
    '<span class="tts-prog"><i></i></span>' +
    '<button type="button" class="tts-rate" aria-label="调整语速">' + RATES[rateIdx].toFixed(2).replace(/0$/, '') + '×</button>' +
    '<button type="button" class="tts-stop" aria-label="停止朗读">停止</button>';

  if (content.parentNode) content.parentNode.insertBefore(bar, content);
  else return;

  var btn = bar.querySelector('.tts-btn');
  var btnText = bar.querySelector('.tts-btn-text');
  var nowEl = bar.querySelector('.tts-now');
  var progEl = bar.querySelector('.tts-prog i');
  var rateEl = bar.querySelector('.tts-rate');
  var stopEl = bar.querySelector('.tts-stop');

  function pickVoice() {
    var vs = window.speechSynthesis.getVoices() || [];
    if (!vs.length) return null;
    var zh = vs.filter(function (v) { return /^zh/i.test(v.lang || ''); });
    if (!zh.length) return vs[0] || null;
    var pref = ['Xiaoxiao', 'Yaoyao', 'Huihui', 'Xiaoyi', 'Tingting', 'Ting-Ting', 'Chinese', '普通话'];
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < zh.length; j++) {
        if ((zh[j].name || '').indexOf(pref[i]) >= 0) return zh[j];
      }
    }
    return zh[0];
  }

  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
  function startKeepAlive() {
    stopKeepAlive();
    keepAlive = setInterval(function () {
      var s = window.speechSynthesis;
      if (playing && s.speaking && !s.paused) { s.pause(); s.resume(); }
    }, 9000);
  }

  function clearMark() {
    if (lastEl) lastEl.className = (lastEl.className || '').replace(/\s*tts-active/g, '');
    lastEl = null;
  }

  function render() {
    var c = chunks[idx];
    if (c) {
      nowEl.textContent = c.text.length > 28 ? c.text.slice(0, 28) + '…' : c.text;
      progEl.style.width = Math.round(((idx + 1) / chunks.length) * 100) + '%';
      if (c.el !== lastEl) {
        clearMark();
        lastEl = c.el;
        lastEl.className = (lastEl.className || '') + ' tts-active';
        try { lastEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      }
    }
  }

  function speakCurrent() {
    if (idx >= chunks.length) { finish(); return; }
    voice = pickVoice();
    var u = new window.SpeechSynthesisUtterance(chunks[idx].text);
    u.lang = (voice && voice.lang) || 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = RATES[rateIdx];
    u.pitch = 1;
    u.onstart = function () { if (watchDog) { clearTimeout(watchDog); watchDog = null; } };
    u.onend = function () { if (!playing) return; idx++; if (idx >= chunks.length) finish(); else speakCurrent(); };
    u.onerror = function () { if (!playing) return; idx++; if (idx >= chunks.length) finish(); else speakCurrent(); };
    render();
    window.speechSynthesis.speak(u);
    if (!watchDog) {
      watchDog = setTimeout(function () {
        watchDog = null;
        if (playing && !window.speechSynthesis.speaking) {
          nowEl.textContent = '当前浏览器未检测到可用中文语音';
        }
      }, 3000);
    }
  }

  function start() {
    playing = true;
    btn.innerHTML = ICON_PAUSE + '<span class="tts-btn-text">暂停</span>';
    btnText = bar.querySelector('.tts-btn-text');
    if (idx >= chunks.length) idx = 0;
    speakCurrent();
    startKeepAlive();
  }

  function pause() {
    playing = false;
    window.speechSynthesis.pause();
    btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">继续</span>';
    btnText = bar.querySelector('.tts-btn-text');
    stopKeepAlive();
  }

  function resume() {
    playing = true;
    window.speechSynthesis.resume();
    btn.innerHTML = ICON_PAUSE + '<span class="tts-btn-text">暂停</span>';
    btnText = bar.querySelector('.tts-btn-text');
    startKeepAlive();
  }

  function finish() {
    playing = false;
    stopKeepAlive();
    idx = 0;
    clearMark();
    nowEl.textContent = '已读完';
    progEl.style.width = '100%';
    btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">重新朗读</span>';
    btnText = bar.querySelector('.tts-btn-text');
  }

  function stop() {
    playing = false;
    stopKeepAlive();
    idx = 0;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    clearMark();
    nowEl.textContent = '';
    progEl.style.width = '0%';
    btn.innerHTML = ICON_PLAY + '<span class="tts-btn-text">听全文</span>';
    btnText = bar.querySelector('.tts-btn-text');
  }

  btn.addEventListener('click', function () {
    var s = window.speechSynthesis;
    if (!playing && idx === 0 && !s.speaking) start();
    else if (!playing && s.speaking) resume();
    else if (!playing && idx > 0) { playing = true; btn.innerHTML = ICON_PAUSE + '<span class="tts-btn-text">暂停</span>'; speakCurrent(); startKeepAlive(); }
    else pause();
  });

  stopEl.addEventListener('click', stop);

  rateEl.addEventListener('click', function () {
    rateIdx = (rateIdx + 1) % RATES.length;
    rateEl.textContent = RATES[rateIdx].toFixed(2).replace(/0$/, '') + '×';
    var wasPlaying = playing;
    if (wasPlaying || window.speechSynthesis.speaking) {
      var cur = idx;
      stop();
      idx = cur;
      playing = true;
      btn.innerHTML = ICON_PAUSE + '<span class="tts-btn-text">暂停</span>';
      btnText = bar.querySelector('.tts-btn-text');
      speakCurrent();
      startKeepAlive();
    }
  });

  window.addEventListener('beforeunload', function () {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  });

  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = function () { voice = pickVoice(); };
  }
  voice = pickVoice();
})();
