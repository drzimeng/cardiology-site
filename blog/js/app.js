/* ============================================================
   孟自力医生博客 · 文章系统（内容与展示分离）
   - 内容数据：posts.js（window.POSTS，Markdown 正文）
   - 本文件仅负责路由与渲染，不含任何文章内容
   路由：
     #/                 文章列表（第 1 页，倒序）
     #/page/2           文章列表（第 N 页，每页 10 篇）
     #/post/<slug>      文章详情
     #/tags             标签汇总 + 多选 AND 组合筛选
     #/tag/<标签>       某标签下全部文章
     #/filter/<t1>,<t2> 多标签 AND 筛选结果
     #/search/<关键词>  搜索结果（高亮）
     #/about            关于页
   ============================================================ */
(function () {
  "use strict";

  var POSTS = (window.POSTS || []).map(function (p, i) { p._i = i; return p; });
  var PAGE_SIZE = 10;

  /* ---------- Markdown 配置 ---------- */
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true, headerIds: false });
  }

  /* ---------- 工具函数 ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function plainLen(s) { return String(s || "").replace(/\s/g, "").length; }
  function fmtDate(d) { return String(d || "").replace(/-/g, "."); }
  function readingTime(p) { return Math.max(1, Math.round(plainLen(p.body) / 400)); }
  function cutSummary(s, n) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n) + "…" : s;
  }
  function byDateIndex(a, b) {
    return String(b.date).localeCompare(String(a.date)) || a._i - b._i;
  }
  function sortedPosts() { return POSTS.slice().sort(byDateIndex); }
  function findPost(slug) {
    for (var i = 0; i < POSTS.length; i++) if (POSTS[i].slug === slug) return POSTS[i];
    return null;
  }
  function tagCounts() {
    var m = {};
    POSTS.forEach(function (p) {
      (p.tags || []).forEach(function (t) { m[t] = (m[t] || 0) + 1; });
    });
    return Object.keys(m).map(function (t) { return { tag: t, n: m[t] }; })
      .sort(function (a, b) { return b.n - a.n || a.tag.localeCompare(b.tag, "zh"); });
  }

  /* 关键词高亮：先转义 HTML，再包裹 <mark> */
  function hl(text, q) {
    var t = esc(text);
    if (!q) return t;
    var eq = esc(q), idx = t.toLowerCase().indexOf(eq.toLowerCase());
    if (idx < 0) return t;
    return t.slice(0, idx) + "<mark>" + t.slice(idx, idx + eq.length) + "</mark>" +
      hl(t.slice(idx + eq.length), q);
  }

  /* 相关文章：按标签重合度取 3–5 篇 */
  function relatedPosts(post) {
    var others = POSTS.filter(function (p) { return p.slug !== post.slug; });
    var scored = others.map(function (p) {
      var s = (p.tags || []).filter(function (t) { return (post.tags || []).indexOf(t) >= 0; }).length;
      return { p: p, s: s };
    }).filter(function (x) { return x.s > 0; });
    scored.sort(function (a, b) { return b.s - a.s || byDateIndex(a.p, b.p); });
    var list = scored.slice(0, 5).map(function (x) { return x.p; });
    if (list.length < 3) {
      var have = {};
      list.forEach(function (p) { have[p.slug] = 1; });
      var fill = others.filter(function (p) { return !have[p.slug]; })
        .sort(byDateIndex).slice(0, 3 - list.length);
      list = list.concat(fill);
    }
    return list;
  }

  /* ---------- 组件 ---------- */
  function chip(tag, href) {
    return '<a class="chip" href="' + (href || ("#/tag/" + encodeURIComponent(tag))) + '">' + esc(tag) + "</a>";
  }
  function postCard(p, q) {
    var tags = (p.tags || []).map(function (t) { return chip(t); }).join("");
    var title = q ? hl(p.title, q) : esc(p.title);
    var sum = q ? hl(cutSummary(p.summary, 150), q) : esc(cutSummary(p.summary, 150));
    return '' +
      '<article class="pc">' +
      '  <div class="pc-tags">' + tags + "</div>" +
      '  <h3><a href="#/post/' + encodeURIComponent(p.slug) + '">' + title + "</a></h3>" +
      '  <p class="pc-sum">' + sum + "</p>" +
      '  <div class="pc-meta">' + fmtDate(p.date) + " · " + esc(p.author || "孟自力") + " · 阅读约 " + readingTime(p) + " 分钟</div>" +
      '  <a class="pc-more" href="#/post/' + encodeURIComponent(p.slug) + '">阅读全文 →</a>' +
      "</article>";
  }
  function pager(page, totalPages, base) {
    if (totalPages <= 1) return "";
    var h = '<nav class="pager" aria-label="分页">';
    h += page > 1
      ? '<a class="nav-btn" href="' + base + (page - 1) + '">← 上一页</a>'
      : '<span class="nav-btn" style="opacity:.4">← 上一页</span>';
    for (var i = 1; i <= totalPages; i++) {
      h += i === page
        ? '<span class="cur">' + i + "</span>"
        : '<a href="' + base + i + '">' + i + "</a>";
    }
    h += page < totalPages
      ? '<a class="nav-btn" href="' + base + (page + 1) + '">下一页 →</a>'
      : '<span class="nav-btn" style="opacity:.4">下一页 →</span>';
    return h + "</nav>";
  }
  function emptyBlock(msg) {
    return '<div class="empty"><div class="em-ico">◎</div><p>' + esc(msg) + "</p></div>";
  }

  /* ---------- 视图：文章列表 ---------- */
  function viewList(page) {
    var all = sortedPosts();
    var totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    if (page < 1 || page > totalPages) page = 1;
    var slice = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    var h = "";
    if (page === 1) {
      h += '<div class="list-intro">' +
        "<h1>诊室之外，<em>把话慢慢说</em></h1>" +
        "<p>这里是我的个人博客：临床诊疗的思路与路径、门诊里的真实故事、护心饮食与诊室高频答疑。内容力求循证、通俗——既写给同行参考，也写给关心健康的您。</p>" +
        '<div class="intro-links">' +
        '<a href="#/tags">按标签浏览</a>' +
        '<a href="#/about">关于我</a>' +
        '<a href="../index.html">回到科普主页</a>' +
        "</div></div>";
    }
    h += '<div class="page-head"><span class="eyebrow">全部文章 · 按发布时间倒序</span>' +
      '<h2 class="page-title">最新文章</h2>' +
      '<p class="page-sub">共 ' + all.length + " 篇，第 " + page + " / " + totalPages + " 页。</p></div>";
    h += '<div class="posts">' + slice.map(function (p) { return postCard(p); }).join("") + "</div>";
    h += pager(page, totalPages, "#/page/");
    return h;
  }

  /* ---------- 视图：文章详情 ---------- */
  function viewPost(slug) {
    var p = findPost(slug);
    if (!p) return emptyBlock("未找到这篇文章，它可能已被移除。") +
      '<div class="back-row"><a class="back" href="#/">← 返回文章列表</a></div>';
    var html = window.marked ? marked.parse(p.body) : "<pre>" + esc(p.body) + "</pre>";
    var tags = (p.tags || []).map(function (t) { return chip(t); }).join("");
    var rel = relatedPosts(p);
    var h = '<article class="detail">' +
      '<div class="dtags pc-tags">' + tags + "</div>" +
      '<h1 class="dtitle">' + esc(p.title) + "</h1>" +
      '<div class="meta">' + esc(p.author || "孟自力") + " · 主任医师 · " + fmtDate(p.date) +
      " · 阅读约 " + readingTime(p) + " 分钟</div>" +
      '<p class="lead">' + esc(p.summary) + "</p>" +
      '<div class="content" id="post-body">' + html + "</div>" +
      '<div class="post-foot">' +
      '  <div class="pf-tags"><span class="pf-label">标签：</span>' + tags + "</div>" +
      '  <section class="related"><h3 class="rel-title">相关文章推荐</h3>' +
      '    <div class="posts">' + rel.map(function (r) { return postCard(r); }).join("") + "</div>" +
      "  </section>" +
      "</div>" +
      '<div class="back-row"><a class="back" href="#/">← 返回文章列表</a></div>' +
      "</article>";
    return h;
  }

  /* ---------- 视图：标签汇总 + AND 筛选 ---------- */
  function viewTags() {
    var counts = tagCounts();
    var h = '<div class="page-head"><span class="eyebrow">标签系统</span>' +
      '<h1 class="page-title">全部标签</h1>' +
      '<p class="page-sub">点击标签查看该标签下全部文章；也可勾选多个标签，按"同时包含"（AND）组合筛选。</p></div>';
    h += '<div class="tag-cloud">' + counts.map(function (c) {
      return '<a class="chip" href="#/tag/' + encodeURIComponent(c.tag) + '">' + esc(c.tag) +
        "<b>" + c.n + "</b></a>";
    }).join("") + "</div>";
    h += '<div class="filter-bar">' +
      "<h3>多选组合筛选（AND 逻辑）</h3>" +
      '<p class="fhint">勾选 2 个及以上标签，只显示<strong>同时包含全部所选标签</strong>的文章。</p>' +
      '<div class="filter-grid">' + counts.map(function (c) {
        return '<label class="filter-item"><input type="checkbox" value="' + esc(c.tag) + '">' +
          "<span>" + esc(c.tag) + '</span><span class="cnt">' + c.n + " 篇</span></label>";
      }).join("") + "</div>" +
      '<div class="filter-actions">' +
      '<button class="btn-apply" id="filter-apply" type="button">应用组合筛选</button>' +
      '<button class="btn-clear" id="filter-clear" type="button">清除选择</button>' +
      "</div></div>";
    return h;
  }
  function viewTagOne(tag) {
    var list = sortedPosts().filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; });
    var h = '<div class="page-head"><span class="eyebrow">标签</span>' +
      '<h1 class="page-title">#' + esc(tag) + "</h1>" +
      '<p class="page-sub">该标签下共 ' + list.length + " 篇文章。</p></div>";
    if (!list.length) h += emptyBlock("该标签下暂无文章。");
    else h += '<div class="posts">' + list.map(function (p) { return postCard(p); }).join("") + "</div>";
    h += '<div class="back-row"><a class="back" href="#/tags">← 查看全部标签</a></div>';
    return h;
  }
  function viewFilter(tags) {
    var list = sortedPosts().filter(function (p) {
      return tags.every(function (t) { return (p.tags || []).indexOf(t) >= 0; });
    });
    var h = '<div class="page-head"><span class="eyebrow">组合筛选 · AND</span>' +
      '<h1 class="page-title">' + tags.map(function (t) { return "#" + esc(t); }).join(" + ") + "</h1></div>";
    h += '<p class="filter-state">同时满足以上 <b>' + tags.length + "</b> 个标签的文章，共 <b>" + list.length + "</b> 篇。</p>";
    if (!list.length) h += emptyBlock("没有同时包含这些标签的文章，试试减少标签。");
    else h += '<div class="posts">' + list.map(function (p) { return postCard(p); }).join("") + "</div>";
    h += '<div class="back-row"><a class="back" href="#/tags">← 返回标签页</a></div>';
    return h;
  }

  /* ---------- 视图：搜索 ---------- */
  function viewSearch(q) {
    var qq = String(q || "").trim();
    var h = '<div class="page-head"><span class="eyebrow">搜索</span>' +
      '<h1 class="page-title">搜索结果</h1></div>';
    if (!qq) {
      return h + '<p class="search-info">请输入关键词后搜索（支持标题、摘要与正文，适配中文）。</p>';
    }
    var low = qq.toLowerCase();
    var hits = sortedPosts().filter(function (p) {
      return String(p.title).toLowerCase().indexOf(low) >= 0 ||
        String(p.summary).toLowerCase().indexOf(low) >= 0 ||
        String(p.body).toLowerCase().indexOf(low) >= 0;
    });
    h += '<p class="search-info">关键词「<b>' + esc(qq) + "</b>」共找到 <b>" + hits.length + "</b> 篇文章。</p>";
    if (!hits.length) {
      h += emptyBlock("没有找到匹配的文章，换个关键词试试。");
    } else {
      h += '<div class="posts">' + hits.map(function (p) {
        var card = postCard(p, qq);
        /* 正文命中时附上下文摘要 */
        var bi = String(p.body).toLowerCase().indexOf(low);
        if (bi >= 0) {
          var s = Math.max(0, bi - 50), seg = p.body.slice(s, bi + qq.length + 70).replace(/[#*`>\-|]/g, " ").replace(/\s+/g, " ").trim();
          card = card.replace("</article>",
            '<p class="snippet">… ' + hl(seg, qq) + " …</p></article>");
        }
        return card;
      }).join("") + "</div>";
    }
    h += '<div class="back-row"><a class="back" href="#/">← 返回文章列表</a></div>';
    return h;
  }

  /* ---------- 视图：关于 ---------- */
  function viewAbout() {
    return "" +
      '<div class="page-head"><span class="eyebrow">关于</span>' +
      '<h1 class="page-title">关于我与这个博客</h1></div>' +
      '<div class="about-card">' +
      '  <div class="ab-head">' +
      '    <div class="avatar">孟</div>' +
      '    <div><div class="ab-name">孟自力</div>' +
      '    <div class="ab-title">心血管病专家 · 主任医师 · 河北医科大学第一医院</div></div>' +
      "  </div>" +
      '  <div class="content">' +
      "  <h2>我是谁</h2>" +
      "  <p>我是一名从事心血管内科临床工作三十余年的主任医师，现执业于河北医科大学第一医院心脏中心，出诊时间为<strong>每周二全天、周五上午</strong>。临床方向上，长期专注于冠心病、高血压、心脏瓣膜病、先天性心脏病（含卵圆孔未闭 PFO）及大血管疾病的诊治。</p>" +
      "  <h2>我在做什么</h2>" +
      "  <p>临床之外，我持续做两件事：一是<strong>临床研究</strong>——正推进卵圆孔未闭（PFO）封堵器的临床研究（含 215 例患者前后对照设计），并撰写论文投稿；二是<strong>医学科普</strong>——通过微信公众号「心血管前沿」及快手、抖音、微信视频号等平台，把心血管健康知识讲给更多人听。</p>" +
      "  <h2>这个博客的宗旨</h2>" +
      "  <p>这是一个<strong>面向医生与患者的专业科普与诊疗经验分享</strong>阵地：把诊室里讲不完的话，写成可以慢慢读的文字。内容定位有三：</p>" +
      "  <ul>" +
      "    <li><strong>诊疗路径与思路</strong>：从诊断标准、危险分层到治疗选择，讲清临床决策的「所以然」，既供同行参考，也帮患者理解医生为何这样决定；</li>" +
      "    <li><strong>门诊故事与病例</strong>：匿名化处理的真实门诊病例，讲清检查、诊断与长期管理的逻辑；</li>" +
      "    <li><strong>日常护心</strong>：饮食营养、运动康复与高频答疑，把「护心」过成生活。</li>" +
      "  </ul>" +
      "  <h2>内容原则</h2>" +
      "  <ul>" +
      "    <li><strong>循证为基</strong>：以指南与主流共识为依据，不夸大、不贩卖焦虑；</li>" +
      "    <li><strong>通俗表达</strong>：尽量说人话，让没有医学背景的人也能读懂；</li>" +
      "    <li><strong>边界清晰</strong>：科普不能替代面诊，具体诊疗请以医生意见为准；涉及仍在探索的问题，会如实标注。</li>" +
      "  </ul>" +
      '  <dl class="kv-list">' +
      "    <dt>执业机构</dt><dd>河北医科大学第一医院 · 心脏中心</dd>" +
      "    <dt>出诊时间</dt><dd>每周二全天 · 每周五上午</dd>" +
      "    <dt>专业方向</dt><dd>冠心病、高血压、心脏瓣膜病、先天性心脏病（PFO）、大血管疾病</dd>" +
      "    <dt>微信公众号</dt><dd>心血管前沿</dd>" +
      "    <dt>联系邮箱</dt><dd>mengzili@163.com</dd>" +
      "  </dl>" +
      "  <blockquote><p>如果您觉得这些文字有用，欢迎转发给需要的人；也欢迎把想听的话题告诉我，我会在后续文章里慢慢写。</p></blockquote>" +
      "  </div>" +
      '  <div class="back-row"><a class="back" href="#/">← 返回文章列表</a></div>' +
      "</div>";
  }

  /* ---------- 路由 ---------- */
  function setActive(route) {
    $all("nav.mainnav a").forEach(function (a) {
      var r = a.getAttribute("data-route");
      a.classList.toggle("active", !!r && route.indexOf(r) === 0);
    });
  }
  function setDocTitle(t) { document.title = t + " | 孟自力医生博客"; }

  function route() {
    var app = $("#app");
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    var head = parts[0] || "";
    var html = "", title = "文章列表";

    if (head === "" || head === "page") {
      var page = head === "page" ? parseInt(parts[1], 10) || 1 : 1;
      html = viewList(page); title = page > 1 ? "文章列表 · 第 " + page + " 页" : "文章列表";
      setActive("list");
    } else if (head === "post") {
      html = viewPost(parts[1] || "");
      var p = findPost(parts[1] || "");
      title = p ? p.title : "文章未找到";
      setActive("list");
    } else if (head === "tags") {
      html = viewTags(); title = "标签"; setActive("tags");
    } else if (head === "tag") {
      html = viewTagOne(parts[1] || ""); title = "标签：" + (parts[1] || ""); setActive("tags");
    } else if (head === "filter") {
      var tags = (parts[1] || "").split(",").filter(Boolean);
      html = viewFilter(tags); title = "组合筛选"; setActive("tags");
    } else if (head === "search") {
      html = viewSearch(parts[1] || ""); title = "搜索：" + (parts[1] || ""); setActive("search");
    } else if (head === "about") {
      html = viewAbout(); title = "关于"; setActive("about");
    } else {
      html = emptyBlock("页面不存在。") + '<div class="back-row"><a class="back" href="#/">← 返回文章列表</a></div>';
      title = "页面不存在";
    }

    app.innerHTML = html;
    setDocTitle(title);
    window.scrollTo(0, 0);

    /* 表格移动端横滑容器 */
    $all("#post-body table").forEach(function (tb) {
      var w = document.createElement("div");
      w.className = "table-wrap";
      tb.parentNode.insertBefore(w, tb);
      w.appendChild(tb);
    });

    /* 标签页：组合筛选按钮 */
    var apply = $("#filter-apply");
    if (apply) {
      apply.addEventListener("click", function () {
        var sel = $all('.filter-item input[type="checkbox"]:checked').map(function (c) { return c.value; });
        if (sel.length < 2) { alert("请至少勾选 2 个标签（AND 组合筛选需要 2 个及以上）。"); return; }
        location.hash = "#/filter/" + sel.map(encodeURIComponent).join(",");
      });
    }
    var clear = $("#filter-clear");
    if (clear) {
      clear.addEventListener("click", function () {
        $all('.filter-item input[type="checkbox"]').forEach(function (c) { c.checked = false; });
      });
    }
  }

  /* ---------- 搜索框 ---------- */
  function initSearch() {
    var input = $("#q"), btn = $("#q-btn");
    function go() {
      var v = input.value.trim();
      if (!v) { location.hash = "#/"; return; }
      location.hash = "#/search/" + encodeURIComponent(v);
    }
    btn.addEventListener("click", go);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    input.addEventListener("input", function () {
      var input = $("#q");
      if (location.hash.indexOf("#/search/") !== 0 && input.value === "") { /* 保持 */ }
    });
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initSearch();
    route();
    window.addEventListener("hashchange", route);
  });
})();
