/* ============================================================
 * 站内搜索 —— 基于 Fuse.js 的客户端模糊检索
 * 索引来源：站点首页输出的 /index.json
 * ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("search-input");
  var meta = document.getElementById("search-meta");
  var resultsEl = document.getElementById("search-results");
  if (!input || !resultsEl) return;

  var fuse = null;
  var ready = false;

  // Fuse 配置：标题权重最高，其次标签/分类/摘要，最后正文
  var fuseOptions = {
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true, // 中文长文本必须关闭位置约束，否则难命中
    threshold: 0.4,       // 0=精确，1=全匹配；0.4 兼顾容错与准确
    minMatchCharLength: 1,
    keys: [
      { name: "title", weight: 0.5 },
      { name: "tags", weight: 0.2 },
      { name: "categories", weight: 0.15 },
      { name: "summary", weight: 0.1 },
      { name: "content", weight: 0.05 }
    ]
  };

  // 计算 index.json 的地址（相对站点根，兼容子路径部署）
  function indexURL() {
    var base = document.querySelector('link[rel="canonical"]');
    // 直接用绝对根路径最稳妥
    return "/index.json";
  }

  function escapeHTML(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 生成带关键词上下文的摘要片段
  function snippet(item, query) {
    var text = item.summary || item.content || "";
    if (!query) return escapeHTML(text.slice(0, 120));
    var idx = text.indexOf(query);
    if (idx === -1) {
      // 逐字符找首个命中
      for (var i = 0; i < query.length; i++) {
        idx = text.indexOf(query[i]);
        if (idx !== -1) break;
      }
    }
    if (idx === -1) return escapeHTML(text.slice(0, 120));
    var start = Math.max(0, idx - 30);
    var end = Math.min(text.length, idx + 90);
    var frag = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    // 高亮查询词
    var safe = escapeHTML(frag);
    var q = escapeHTML(query);
    if (q) {
      try {
        safe = safe.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          function (m) { return "<mark>" + m + "</mark>"; });
      } catch (e) {}
    }
    return safe;
  }

  function render(results, query) {
    resultsEl.innerHTML = "";
    if (!query) {
      meta.textContent = "";
      return;
    }
    if (!results.length) {
      meta.textContent = '未找到与「' + query + '」相关的文章。';
      return;
    }
    meta.textContent = '找到 ' + results.length + ' 篇相关文章：';
    results.forEach(function (r) {
      var item = r.item || r;
      var li = document.createElement("li");
      li.className = "search-result-item pv3 bb b--black-10";
      var tags = (item.tags || []).map(function (t) {
        return '<span class="search-tag">#' + escapeHTML(t) + "</span>";
      }).join(" ");
      li.innerHTML =
        '<a class="search-result-title link dark-gray hover-blue f4 fw6" href="' +
          escapeHTML(item.url) + '">' + escapeHTML(item.title) + "</a>" +
        '<div class="f6 mid-gray mt1">' + escapeHTML(item.date || "") +
          (tags ? '　' + tags : "") + "</div>" +
        '<p class="search-result-snippet f6 gray mt2 mb0 lh-copy">' +
          snippet(item, query) + "</p>";
      resultsEl.appendChild(li);
    });
  }

  function doSearch(query) {
    query = (query || "").trim();
    if (!ready) return;
    if (!query) {
      render([], "");
      return;
    }
    var results = fuse.search(query, { limit: 30 });
    render(results, query);
  }

  // 读取 URL 中的 ?q= 参数
  function getQueryParam() {
    var m = window.location.search.match(/[?&]q=([^&]*)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  // 加载索引
  meta.textContent = "正在加载搜索索引…";
  fetch(indexURL(), { credentials: "same-origin" })
    .then(function (res) {
      if (!res.ok) throw new Error("index.json 加载失败: " + res.status);
      return res.json();
    })
    .then(function (data) {
      fuse = new Fuse(data, fuseOptions);
      ready = true;
      meta.textContent = "";
      var initial = getQueryParam();
      if (initial) {
        input.value = initial;
        doSearch(initial);
      }
    })
    .catch(function (err) {
      meta.textContent = "搜索索引加载失败，请刷新重试。";
      console.error(err);
    });

  // 输入防抖
  var timer = null;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    var q = input.value;
    timer = setTimeout(function () { doSearch(q); }, 150);
  });

  // 回车即时搜索并同步 URL
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch(input.value);
      var q = input.value.trim();
      var newUrl = window.location.pathname + (q ? "?q=" + encodeURIComponent(q) : "");
      history.replaceState(null, "", newUrl);
    }
  });
})();
