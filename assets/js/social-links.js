/**
 * ============================================================
 *  社交平台链接 · 集中配置
 * ============================================================
 *
 *  【以后如何添加新平台】（抖音 / 快手 / 头条 / 知乎 等）
 *  只需在下方 SOCIAL_LINKS 数组中追加一个对象，格式照抄现有条目：
 *
 *      {
 *        name:  '抖音',                        // 平台显示名
 *        handle:'mengzili',                    // 账号标识（可留 ''）
 *        desc:  '短视频科普',                   // 一句话说明（可留 ''）
 *        url:   'https://www.douyin.com/...',  // 主页链接；微信类无外链填 ''
 *        note:  '微信 App 内搜索名称关注',       // 补充提示（不需要就删掉这行）
 *        color: '#161823'                      // 标识色（左侧圆点）
 *      },
 *
 *  保存后全站自动生效（科普主页 / 博客列表 / 全部文章页），
 *  无需改动任何 HTML 或 CSS。
 *
 *  【如何移除某平台】删除对应对象即可。
 *
 *  【各平台主页链接怎么找】
 *  - 抖音：抖音 App → 我 → 右上角「≡」→ 我的二维码 / 分享 → 复制链接
 *  - 快手：快手 App → 我 → 分享主页 → 复制链接
 *  - 头条：今日头条 App → 我的 → 个人主页 → 分享 → 复制链接
 *  - 知乎：知乎 App → 我的 → 个人主页 → 分享 → 复制链接
 * ============================================================
 */
(function () {
  'use strict';

  var SOCIAL_LINKS = [
    {
      name: '哔哩哔哩',
      handle: '孟自力',
      desc: '中长视频 · 系统讲解',
      url: 'https://space.bilibili.com/670033772',
      color: '#FB7299'
    },
    {
      name: '微博',
      handle: '孟自力',
      desc: '日常动态 · 健康资讯',
      url: 'https://weibo.com/u/6466313405',
      color: '#E6162D'
    },
    {
      name: '微信公众号',
      handle: '心血管前沿',
      desc: '图文讲座 · 系列科普',
      url: '',
      note: '请在微信 App 内搜索名称关注',
      color: '#07C160'
    }
    // ↓↓↓ 以后在这里追加新平台（注意上一行末尾要加英文逗号）↓↓↓
    // { name:'抖音',     handle:'mengzili', desc:'短视频科普', url:'https://www.douyin.com/user/xxxx',         color:'#161823' },
    // { name:'快手',     handle:'mengzili', desc:'短视频科普', url:'https://www.kuaishou.com/profile/xxxx',     color:'#FF4906' },
    // { name:'今日头条', handle:'孟自力',   desc:'图文分发',   url:'https://www.toutiao.com/c/user/token/xxxx',  color:'#F04142' },
    // { name:'知乎',     handle:'孟自力',   desc:'问答科普',   url:'https://www.zhihu.com/people/xxxx',          color:'#0084FF' }
  ];

  /* ---------- 以下为渲染逻辑，一般无需修改 ---------- */

  var STYLE_ID = 'social-links-style';

  var CSS = [
    '.social-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}',
    '.social-item{display:flex;align-items:center;gap:11px;padding:9px 13px;border-radius:11px;',
    '  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);',
    '  color:#fff;text-decoration:none;',
    '  transition:background .2s ease,transform .2s ease,border-color .2s ease}',
    'a.social-item:hover{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.32);transform:translateX(3px)}',
    'a.social-item:focus-visible{outline:2px solid rgba(255,255,255,.6);outline-offset:2px}',
    '.social-item--static{cursor:default}',
    '.social-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 0 3px rgba(255,255,255,.09)}',
    '.social-body{display:flex;flex-direction:column;line-height:1.4;min-width:0}',
    '.social-name{font-size:.92rem;font-weight:600;color:#fff;display:flex;align-items:center;gap:6px}',
    '.social-handle{font-weight:400;font-size:.8rem;opacity:.62}',
    '.social-desc{font-size:.76rem;opacity:.7}',
    '.social-note{font-size:.72rem;opacity:.58;margin-top:2px}',
    '.social-arrow{font-size:.78em;opacity:.6}'
  ].join('\n');

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildItem(item) {
    var inner =
      '<span class="social-dot" style="background:' + escapeHtml(item.color || '#888888') + '"></span>' +
      '<span class="social-body">' +
        '<span class="social-name">' + escapeHtml(item.name) +
          (item.handle ? ' <span class="social-handle">' + escapeHtml(item.handle) + '</span>' : '') +
          (item.url ? ' <span class="social-arrow" aria-hidden="true">&#8600;</span>' : '') +
        '</span>' +
        (item.desc ? '<span class="social-desc">' + escapeHtml(item.desc) + '</span>' : '') +
        (item.note ? '<span class="social-note">' + escapeHtml(item.note) + '</span>' : '') +
      '</span>';

    if (item.url) {
      return '<a class="social-item" href="' + escapeHtml(item.url) +
        '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
    }
    return '<div class="social-item social-item--static">' + inner + '</div>';
  }

  function render() {
    injectStyle();
    var boxes = document.querySelectorAll('[data-social-links]');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].innerHTML = '<div class="social-list">' +
        SOCIAL_LINKS.map(buildItem).join('') + '</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
