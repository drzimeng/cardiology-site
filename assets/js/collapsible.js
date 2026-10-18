/**
 * ============================================================
 *  内容折叠模块 · Collapsible
 * ============================================================
 *
 *  【作用】
 *  让长列表板块默认只展示前几条，其余折叠，读者点「展开更多」平滑展开全部。
 *  避免页面过长，帮助读者快速把握站点结构与内容分布。
 *
 *  【如何给一个板块启用折叠】
 *  在该列表的**外层容器**上添加属性即可，无需改任何 JS：
 *
 *      <div class="recipes" data-collapse="3"> ... </div>
 *
 *  data-collapse 的值 = 默认展示几条（省略时默认 3）。
 *  模块会自动：
 *    1. 隐藏超出条数的条目；
 *    2. 在容器下方插入「展开更多（还有 N 条）」按钮；
 *    3. 点击后逐条淡入展开，按钮文字变为「收起」，可再次折叠。
 *
 *  【与筛选联动】
 *  若某板块带筛选（如食谱），筛选后调用：
 *      window.Collapsible.refresh(容器元素)
 *  即按当前可见条目重新计算折叠状态。
 *
 *  【无需折叠的板块】
 *  不加 data-collapse 属性即可，模块完全不会触碰。
 * ============================================================
 */
(function () {
  'use strict';

  var DEFAULT_VISIBLE = 3;
  var STAGGER_MS = 55;   // 逐条展开的间隔，营造平滑节奏

  var STYLE_ID = 'collapsible-style';

  var CSS = [
    /* 折叠隐藏：用 class 控制，与筛选的 inline display 互不干扰 */
    '[data-collapse] > .is-collapsed{display:none}',
    /* 展开按钮 */
    '.collapse-toggle{display:block;margin:26px auto 4px;padding:11px 28px;',
    '  font-family:inherit;font-size:.92rem;font-weight:600;line-height:1;',
    '  color:var(--crimson-deep,#8c2b23);background:#fff;',
    '  border:1.5px solid var(--crimson,#b3382e);border-radius:999px;cursor:pointer;',
    '  transition:background .2s ease,color .2s ease,box-shadow .2s ease,transform .2s ease}',
    '.collapse-toggle:hover{background:var(--crimson,#b3382e);color:#fff;',
    '  box-shadow:0 8px 20px rgba(179,56,46,.22);transform:translateY(-1px)}',
    '.collapse-toggle:active{transform:translateY(0)}',
    '.collapse-toggle:focus-visible{outline:2px solid var(--crimson,#b3382e);outline-offset:3px}',
    '.collapse-toggle[hidden]{display:none}',
    '.ct-arrow{display:inline-block;margin-left:7px;font-size:.72em;transition:transform .3s ease}',
    '.collapse-toggle[aria-expanded="true"] .ct-arrow{transform:rotate(180deg)}',
    /* 展开动画：淡入 + 轻微上移 */
    '.collapse-anim{opacity:0;transform:translateY(14px)}',
    '.collapse-anim.collapse-in{opacity:1;transform:none;',
    '  transition:opacity .4s ease,transform .4s ease}',
    /* 尊重用户的减少动画偏好 */
    '@media (prefers-reduced-motion: reduce){',
    '  .collapse-anim,.collapse-anim.collapse-in{opacity:1;transform:none;transition:none}',
    '  .collapse-toggle,.ct-arrow{transition:none}',
    '}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /** 容器直接子元素中的条目（排除按钮自身） */
  function getItems(box) {
    return Array.prototype.filter.call(box.children, function (el) {
      return el.nodeType === 1 && !el.classList.contains('collapse-toggle');
    });
  }

  /** 当前未被筛选隐藏的条目 */
  function visibleItems(box) {
    return getItems(box).filter(function (el) {
      return el.style.display !== 'none';
    });
  }

  function ensureToggle(box) {
    var toggle = box.nextElementSibling;
    if (toggle && toggle.classList.contains('collapse-toggle')) return toggle;

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'collapse-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML =
      '<span class="ct-label"></span>' +
      '<span class="ct-arrow" aria-hidden="true">&#9660;</span>';

    box.parentNode.insertBefore(toggle, box.nextSibling);

    toggle.addEventListener('click', function () {
      var expanded = box.dataset.collapseExpanded === 'true';
      setExpanded(box, !expanded);
    });

    return toggle;
  }

  function setExpanded(box, expanded) {
    box.dataset.collapseExpanded = expanded ? 'true' : 'false';
    apply(box, expanded, true);
  }

  /**
   * 应用折叠状态
   * @param {HTMLElement} box      列表容器
   * @param {boolean} expanded     是否展开
   * @param {boolean} animate      是否播放逐条展开动画
   */
  function apply(box, expanded, animate) {
    var limit = parseInt(box.dataset.collapse || DEFAULT_VISIBLE, 10);
    var items = visibleItems(box);
    var toggle = ensureToggle(box);

    // 清除上一次的动画痕迹
    items.forEach(function (it) {
      it.classList.remove('collapse-anim', 'collapse-in');
    });

    // 条目不足时：全部展示，按钮隐藏
    if (items.length <= limit) {
      items.forEach(function (it) { it.classList.remove('is-collapsed'); });
      toggle.hidden = true;
      return;
    }

    toggle.hidden = false;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    var animIndex = 0;
    items.forEach(function (it, i) {
      if (!expanded && i >= limit) {
        it.classList.add('is-collapsed');
        return;
      }
      it.classList.remove('is-collapsed');
      // 仅对「本次新展开」的条目做逐条淡入
      if (animate && expanded && i >= limit) {
        it.classList.add('collapse-anim');
        var delay = animIndex++;
        setTimeout(function () { it.classList.add('collapse-in'); }, STAGGER_MS * delay);
      }
    });

    var hidden = expanded ? 0 : items.length - limit;
    toggle.querySelector('.ct-label').textContent = expanded
      ? '收起'
      : '\u5c55\u5f00\u66f4\u591a\uff08\u8fd8\u6709 ' + hidden + ' \u6761\uff09';
  }

  /** 供筛选等外部逻辑调用：按当前可见条目重算折叠状态 */
  function refresh(box) {
    if (!box) return;
    apply(box, box.dataset.collapseExpanded === 'true', false);
  }

  function init() {
    injectStyle();
    var boxes = document.querySelectorAll('[data-collapse]');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].dataset.collapseExpanded = 'false';
      ensureToggle(boxes[i]);
      apply(boxes[i], false, false);
    }
  }

  window.Collapsible = {
    refresh: refresh,
    refreshAll: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
