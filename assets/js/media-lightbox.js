/**
 * 图示/视频放大弹窗 · Media Lightbox
 * 缩略卡片点击后在弹窗中放大；视频自动播放，关闭时暂停。
 */
(function () {
  'use strict';

  var modal = document.getElementById('mediaModal');
  if (!modal) return;

  var body = modal.querySelector('.mm-body');
  var cap = modal.querySelector('.mm-cap');
  var closeBtn = modal.querySelector('.mm-close');
  var lastFocus = null;
  var currentVideo = null;

  function open(btn) {
    lastFocus = btn;
    body.innerHTML = '';
    stopVideo();

    var src = btn.getAttribute('data-src') || '';
    var kind = btn.getAttribute('data-media');
    var caption = btn.getAttribute('data-caption') || '';

    if (kind === 'video') {
      var v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.playsInline = true;
      v.setAttribute('webkit-playsinline', '');
      v.preload = 'auto';
      body.appendChild(v);
      currentVideo = v;
      var p = v.play();
      if (p && p.catch) p.catch(function () {}); // 浏览器拦截自动播放时保留控件，用户点播放即可
    } else {
      var img = document.createElement('img');
      img.src = src;
      img.alt = btn.getAttribute('aria-label') || 'PFO 图示放大';
      body.appendChild(img);
    }

    cap.innerHTML = caption;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function stopVideo() {
    if (!currentVideo) return;
    try {
      currentVideo.pause();
      currentVideo.currentTime = 0;
      currentVideo.removeAttribute('src');
      currentVideo.load();
    } catch (e) {}
    currentVideo = null;
  }

  function close() {
    stopVideo();
    body.innerHTML = '';
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  var thumbs = document.querySelectorAll('.media-thumb');
  for (var i = 0; i < thumbs.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () { open(btn); });
    })(thumbs[i]);
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();
