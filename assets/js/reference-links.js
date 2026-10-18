/**
 * ============================================================
 *  参考来源 / 延伸阅读 · 集中配置
 * ============================================================
 *
 *  【这个模块是做什么的】
 *  网站上的「参考来源 / 延伸阅读」板块由本文件统一渲染：
 *  科普主页（完整卡片）、博客页脚与全部文章页末尾（紧凑列表）
 *  都读取同一份配置，增删来源只需改下面这一处。
 *
 *  【以后如何添加新来源】
 *  在对应分组的 items 数组里追加一个对象，格式照抄现有条目：
 *
 *      {
 *        name: '机构名称',                     // 显示名（必填）
 *        desc: '一句话说明',                   // 补充说明（可留 ''）
 *        url:  'https://...',                  // 官网链接（必填）
 *        color:'#b3382e'                       // 左侧标识圆点颜色（可省略，默认灰）
 *      },
 *
 *  也可以新增一个分组：
 *
 *      { title: '分组标题', items: [ …条目对象… ] },
 *
 *  保存后全站自动生效，无需改动任何 HTML 或 CSS。
 *
 *  【如何移除某来源】删除对应对象即可。
 *
 *  【使用注意（合规）】
 *  - 本板块只做纯文字链接，不嵌入对方网站内容、不使用对方 Logo，
 *    也不宣称任何合作、背书或隶属关系；
 *  - 添加前请确认链接指向对方官网的公开页面；
 *  - 如对方明确不希望被链接，请尊重并及时移除。
 * ============================================================
 */
(function () {
  'use strict';

  var REFERENCE_GROUPS = [
    {
      title: '国内医疗机构与学术组织',
      items: [
        {
          name: '河北医科大学第一医院',
          desc: '本人执业单位 · 心脏中心',
          url: 'https://www.jyyy.com.cn/',
          color: '#4a7c59'
        },
        {
          name: '中国医学科学院阜外医院',
          desc: '国家级心血管病专科中心',
          url: 'https://www.fuwai.com/',
          color: '#b3382e'
        },
        {
          name: '国家心血管病中心',
          desc: '行业质控 · 年度心血管报告',
          url: 'https://www.nccd.org.cn/',
          color: '#b3382e'
        },
        {
          name: '中华医学会心血管病学分会',
          desc: 'CSC · 指南与共识发布',
          url: 'https://csc.cma.org.cn/',
          color: '#b3382e'
        }
      ]
    },
    {
      title: '国际权威健康资讯',
      items: [
        {
          name: 'Cleveland Clinic Health Essentials',
          desc: '心脏健康专栏 · 通俗科普',
          url: 'https://health.clevelandclinic.org/health-conditions/heart-health',
          color: '#0a5c36'
        },
        {
          name: '美国心脏协会（AHA）',
          desc: 'heart.org · 指南与健康教育',
          url: 'https://www.heart.org/',
          color: '#a63226'
        },
        {
          name: 'Mayo Clinic 妙佑医疗国际',
          desc: '心血管诊疗与预防 · 有中文页面',
          url: 'https://www.mayoclinic.org/',
          color: '#1c4f8f'
        }
      ]
    },
    {
      title: '医学参考工具书',
      items: [
        {
          name: '默沙东诊疗手册',
          desc: '专业版 / 大众版 · 中文免费阅读',
          url: 'https://www.msdmanuals.cn/',
          color: '#5c5c66'
        }
      ]
    }
    // ↓↓↓ 以后在这里追加新分组或新来源（注意上一行末尾要加英文逗号）↓↓↓
  ];

  /* ---------- 以下为渲染逻辑，一般无需修改 ---------- */

  var STYLE_ID = 'reference-links-style';

  var CSS = [
    /* ---- 完整卡片形态（浅色主题，科普主页用） ---- */
    '.ref-block{margin-top:6px}',
    '.ref-group{margin-bottom:28px}',
    '.ref-group:last-child{margin-bottom:0}',
    '.ref-group-title{display:flex;align-items:center;gap:10px;font-size:.98rem;font-weight:700;',
    '  color:var(--ink,#2b2b2f);margin-bottom:13px;letter-spacing:.02em}',
    '.ref-group-title::before{content:"";width:22px;height:2px;border-radius:2px;background:var(--crimson,#b3382e);flex:none}',
    '.ref-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:13px}',
    'a.ref-card{display:flex;flex-direction:column;gap:4px;padding:15px 17px 14px;',
    '  background:var(--card,#fff);border:1px solid var(--line,#e8e2da);border-radius:14px;',
    '  color:inherit;text-decoration:none;',
    '  transition:border-color .22s ease,box-shadow .22s ease,transform .22s ease}',
    'a.ref-card:hover{border-color:var(--crimson,#b3382e);box-shadow:0 8px 22px rgba(179,56,46,.10);transform:translateY(-2px)}',
    'a.ref-card:focus-visible{outline:2px solid var(--crimson,#b3382e);outline-offset:2px}',
    '.ref-head{display:flex;align-items:center;gap:9px}',
    '.ref-dot{width:8px;height:8px;border-radius:50%;flex:none;box-shadow:0 0 0 3px rgba(0,0,0,.05)}',
    '.ref-name{font-weight:600;font-size:.95rem;color:var(--ink,#2b2b2f);line-height:1.45}',
    '.ref-arrow{margin-left:auto;font-size:.78em;opacity:.45;flex:none}',
    '.ref-url{font-size:.76rem;color:var(--ink-soft,#5c5c66);opacity:.72;word-break:break-all;line-height:1.5}',
    '.ref-desc{font-size:.85rem;color:var(--ink-soft,#5c5c66);line-height:1.6}',
    '@media(max-width:640px){.ref-grid{grid-template-columns:1fr}}',

    /* ---- 深色主题（自动识别：容器位于页脚内时启用） ---- */
    '.ref-dark .ref-group-title{color:#fff}',
    '.ref-dark .ref-group-title::before{background:#ffb3ab}',
    '.ref-dark a.ref-card{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16);color:#fff}',
    '.ref-dark a.ref-card:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.34);',
    '  box-shadow:0 8px 22px rgba(0,0,0,.22);transform:translateY(-2px)}',
    '.ref-dark a.ref-card:focus-visible{outline:2px solid rgba(255,255,255,.65);outline-offset:2px}',
    '.ref-dark .ref-name{color:#fff}',
    '.ref-dark .ref-url,.ref-dark .ref-desc{color:rgba(255,255,255,.66)}',
    '.ref-dark .ref-arrow{opacity:.6}',

    /* ---- 紧凑列表形态（博客页脚 / 文章页末尾用） ---- */
    '.ref-compact .ref-group{margin-bottom:15px}',
    '.ref-compact .ref-group:last-child{margin-bottom:0}',
    '.ref-compact .ref-group-title{font-size:.78rem;font-weight:700;margin-bottom:7px;letter-spacing:.08em}',
    '.ref-compact .ref-list{list-style:none;display:flex;flex-direction:column;gap:4px}',
    '.ref-compact .ref-item{display:flex;align-items:baseline;gap:7px;font-size:.88rem;line-height:1.7;flex-wrap:wrap}',
    '.ref-compact .ref-item .ref-dot{width:6px;height:6px;flex:none;align-self:center}',
    '.ref-compact a.ref-link{color:inherit;text-decoration:none;display:inline-flex;align-items:baseline;gap:7px;flex-wrap:wrap}',
    '.ref-compact a.ref-link:hover .ref-name{text-decoration:underline;text-underline-offset:3px}',
    '.ref-compact .ref-name{font-weight:600;font-size:.88rem}',
    '.ref-compact .ref-desc{font-size:.8rem;opacity:.85}',
    '.ref-compact .ref-url{display:none}',
    '.ref-compact.ref-dark .ref-group-title{color:rgba(255,255,255,.85)}',
    '.ref-compact.ref-dark a.ref-link:hover .ref-name{color:#ffd9d4}',
    '.ref-compact:not(.ref-dark) a.ref-link:hover .ref-name{color:var(--crimson,#b3382e)}'
  ].join('\n');

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 把 https://www.xxx.com/yyy 显示成 www.xxx.com/yyy（路径过长时只保留域名）
  function prettyUrl(u) {
    var s = String(u || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    var m = s.match(/^([^\/]+)(\/.*)?$/);
    if (!m) return s;
    var path = m[2] || '';
    return path.length > 30 ? m[1] + '/…' : s;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // 完整卡片：一组一个网格
  function buildGroupCard(group) {
    var cards = group.items.map(function (item) {
      return '<a class="ref-card" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="ref-head">' +
          '<span class="ref-dot" style="background:' + escapeHtml(item.color || '#8a8a92') + '"></span>' +
          '<span class="ref-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="ref-arrow" aria-hidden="true">&#8599;</span>' +
        '</span>' +
        '<span class="ref-url">' + escapeHtml(prettyUrl(item.url)) + '</span>' +
        (item.desc ? '<span class="ref-desc">' + escapeHtml(item.desc) + '</span>' : '') +
      '</a>';
    }).join('');
    return '<div class="ref-group">' +
      '<h3 class="ref-group-title">' + escapeHtml(group.title) + '</h3>' +
      '<div class="ref-grid">' + cards + '</div>' +
    '</div>';
  }

  // 紧凑列表：一组一段，条目为一行文字链接
  function buildGroupCompact(group) {
    var items = group.items.map(function (item) {
      return '<li class="ref-item">' +
        '<a class="ref-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="ref-dot" style="background:' + escapeHtml(item.color || '#8a8a92') + '"></span>' +
          '<span class="ref-name">' + escapeHtml(item.name) + '</span>' +
          (item.desc ? '<span class="ref-desc">' + escapeHtml(item.desc) + '</span>' : '') +
        '</a>' +
      '</li>';
    }).join('');
    return '<div class="ref-group">' +
      '<h3 class="ref-group-title">' + escapeHtml(group.title) + '</h3>' +
      '<ul class="ref-list">' + items + '</ul>' +
    '</div>';
  }

  function render() {
    injectStyle();
    var boxes = document.querySelectorAll('[data-reference-links]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (box.getAttribute('data-ref-rendered') === '1') continue; // 幂等，防重复渲染
      var compact = box.getAttribute('data-reference-links') === 'compact';
      // 容器位于页脚内时自动切换深色主题；也可用 data-ref-theme="dark|light" 强制指定
      var forced = box.getAttribute('data-ref-theme');
      var dark = forced === 'dark' || (forced !== 'light' && !!(box.closest && box.closest('footer')));
      var cls = 'ref-block' + (compact ? ' ref-compact' : '') + (dark ? ' ref-dark' : '');
      box.className = (box.className ? box.className + ' ' : '') + cls;
      box.innerHTML = REFERENCE_GROUPS.map(compact ? buildGroupCompact : buildGroupCard).join('');
      box.setAttribute('data-ref-rendered', '1');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
