/*
 * 孟自力心血管科普 · 读者互动（留言板 + AI 智能问答）
 * 云就绪 / 本地兜底：
 *   - 默认本地模式：留言写入浏览器 localStorage，无需任何后端即可使用。
 *   - 云端模式：将 window.WORKBUDDY_CLOUD_CONFIG 设为真实 publicConfig 后，
 *     留言自动改用云端 Database，AI 改用云端 LLM API，业务逻辑无需改动。
 * 说明：当前云应用配额受限、开通确认被关闭，平台授权以本地实现兜底；
 *       待真实云服务开通后填入配置即可无缝切换。
 */
(function () {
  'use strict';

  // ---------- 云服务配置（占位，开通后填入） ----------
  var CLOUD_CONFIG = (typeof window !== 'undefined' && window.WORKBUDDY_CLOUD_CONFIG) || null;
  var _cloudClient = null;
  function getCloud() {
    if (_cloudClient) return _cloudClient;
    if (!CLOUD_CONFIG || typeof window === 'undefined' || !window.WorkBuddyCloud) return null;
    try {
      _cloudClient = window.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CLOUD_CONFIG.endpoint,
        oauthRelayBaseUrl: CLOUD_CONFIG.oauthRelayBaseUrl,
        publishableKey: CLOUD_CONFIG.publishableKey,
      });
    } catch (e) { _cloudClient = null; }
    return _cloudClient;
  }

  // ---------- 安全的本地存储（浏览器 localStorage，Node 下回退到内存垫片） ----------
  function getLS() {
    try { if (typeof localStorage !== 'undefined') return localStorage; } catch (e) {}
    if (!globalThis.__wbLS) {
      var _s = {};
      globalThis.__wbLS = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(_s, k) ? _s[k] : null; },
        setItem: function (k, v) { _s[k] = String(v); },
        removeItem: function (k) { delete _s[k]; },
      };
    }
    return globalThis.__wbLS;
  }
  var LS_KEY = 'meng_cardio_messages_v1';
  function loadLocal() {
    try { return JSON.parse(getLS().getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveLocal(list) {
    try { getLS().setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  // ---------- 留言存储（云就绪 + 本地兜底） ----------
  var MessageStore = {
    isCloud: function () { return !!getCloud(); },
    list: async function () {
      var c = getCloud();
      if (!c) return loadLocal();
      var r = await c.database.from('messages')
        .select('id, name, content, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (r.error) throw r.error;
      return (r.data || []).map(function (row) {
        return { id: row.id, name: row.name, content: row.content, createdAt: row.created_at };
      });
    },
    add: async function (msg) {
      var c = getCloud();
      if (!c) {
        // 本地模式：直接写入浏览器存储
        var list = loadLocal();
        list.unshift({
          id: 'l_' + Date.now(),
          name: msg.name || '匿名读者',
          content: msg.content,
          createdAt: new Date().toISOString(),
        });
        saveLocal(list.slice(0, 200));
        return { ok: true, source: 'local' };
      }
      // 云端模式：写入真实 Database；失败则明确报错，不静默降级到本地
      var r = await c.database.from('messages').insert({
        name: msg.name || '匿名读者',
        content: msg.content,
        created_at: new Date().toISOString(),
      }).select();
      if (r.error) return { ok: false, source: 'cloud', error: r.error };
      return { ok: true, source: 'cloud' };
    },
  };

  // ---------- AI 智能问答（仅云端 LLM；本地模式不伪造回复） ----------
  var AI_SYSTEM = '你是「孟自力心血管健康科普平台」的 AI 健康助手，由心血管病专家孟自力医生团队打造。' +
    '请用通俗易懂、严谨准确的中文回答心血管健康与疾病防治的常识性问题；' +
    '明确提示本回答仅为健康科普、不能替代医生的当面诊疗；' +
    '如涉及急症（如剧烈胸痛、呼吸困难、卒中征象）须提醒立即拨打 120 或前往医院；' +
    '不提供具体用药处方与剂量；不编造医学数据。';
  async function askAI(question) {
    var c = getCloud();
    if (!c) return { ok: false, reason: 'cloud_unavailable' };
    var models = await c.llm.models.list();
    if (!models || models.length === 0) return { ok: false, reason: 'no_model' };
    var model = models.find(function (m) { return m.disabled !== true; });
    if (!model) return { ok: false, reason: 'no_model' };
    var answer = '';
    try {
      for await (var chunk of c.llm.chat.completions.create({
        model: model.id,
        messages: [
          { role: 'system', content: AI_SYSTEM },
          { role: 'user', content: question },
        ],
        stream: true,
        temperature: 0.6,
      })) {
        var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (delta && delta.content) answer += delta.content;
      }
    } catch (e) { return { ok: false, reason: 'error', error: e }; }
    return { ok: true, text: answer };
  }

  // ---------- 浏览器 DOM 绑定 ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return ''; }
  }
  function $(id) { return document.getElementById(id); }

  function renderMessages(list) {
    var box = $('msgList');
    if (!box) return;
    if (!list || list.length === 0) {
      box.innerHTML = '<div class="msg-empty">还没有留言，来做第一个吧～</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      return '<div class="msg-item">' +
        '<div class="mi-head"><span class="mi-name">' + esc(m.name || '匿名读者') + '</span>' +
        '<span>' + esc(fmtTime(m.createdAt)) + '</span></div>' +
        '<div>' + esc(m.content) + '</div></div>';
    }).join('');
  }

  function setMode() {
    var cloud = MessageStore.isCloud();
    var m = $('msgMode');
    if (m) { m.textContent = cloud ? '云端模式' : '本地模式'; m.className = 'mode-pill' + (cloud ? ' cloud' : ''); }
    var a = $('aiMode');
    if (a) { a.textContent = cloud ? '云端模式' : '本地模式'; a.className = 'mode-pill' + (cloud ? ' cloud' : ''); }
  }

  function bindUI() {
    setMode();
    // 加载已有留言
    MessageStore.list().then(renderMessages).catch(function () {
      renderMessages(loadLocal());
    });

    // 提交留言
    var form = $('msgForm');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var nameEl = $('msgName'), contentEl = $('msgContent');
        var errEl = $('msgErr'), okEl = $('msgOk');
        if (errEl) errEl.hidden = true;
        if (okEl) okEl.hidden = true;
        var content = (contentEl && contentEl.value || '').trim();
        if (!content) {
          if (errEl) { errEl.textContent = '请先填写留言内容。'; errEl.hidden = false; }
          return;
        }
        var btn = $('msgSubmit');
        if (btn) btn.disabled = true;
        MessageStore.add({ name: (nameEl && nameEl.value || '').trim(), content: content })
          .then(function (res) {
            if (res.ok) {
              if (contentEl) contentEl.value = '';
              if (okEl) {
                okEl.textContent = res.source === 'cloud' ? '留言已提交至云端 ✓' : '留言已保存（本地）✓';
                okEl.hidden = false;
              }
              return MessageStore.list().then(renderMessages);
            }
            if (errEl) { errEl.textContent = '提交失败：' + (res.error && res.error.message ? res.error.message : '请稍后再试'); errEl.hidden = false; }
          })
          .catch(function (e) {
            if (errEl) { errEl.textContent = '提交出错：' + (e && e.message ? e.message : '未知错误'); errEl.hidden = false; }
          })
          .then(function () { if (btn) btn.disabled = false; });
      });
    }

    // AI 问答
    var askBtn = $('aiAsk');
    if (askBtn) {
      askBtn.addEventListener('click', function () {
        var qEl = $('aiQuestion'), aEl = $('aiAnswer'), errEl = $('aiErr');
        if (errEl) errEl.hidden = true;
        var q = (qEl && qEl.value || '').trim();
        if (!q) {
          if (errEl) { errEl.textContent = '请先输入您的问题。'; errEl.hidden = false; }
          return;
        }
        askBtn.disabled = true;
        if (aEl) { aEl.className = 'ai-answer'; aEl.textContent = '正在思考…'; }
        askAI(q)
          .then(function (res) {
            if (!res.ok) {
              if (aEl) { aEl.className = 'ai-answer placeholder'; aEl.textContent = 'AI 功能需要开通云服务。当前为本地模式，请在开通云服务并填入配置后使用。'; }
              if (res.reason === 'no_model') { if (errEl) { errEl.textContent = '云端暂无可用的模型。'; errEl.hidden = false; } }
              return;
            }
            if (aEl) { aEl.className = 'ai-answer'; aEl.textContent = res.text; }
          })
          .catch(function (e) {
            if (aEl) { aEl.className = 'ai-answer'; aEl.textContent = '抱歉，AI 暂时无法回答（' + (e && e.message ? e.message : '未知错误') + '）。'; }
          })
          .then(function () { askBtn.disabled = false; });
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUI);
    else bindUI();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessageStore: MessageStore, askAI: askAI, _loadLocal: loadLocal, _saveLocal: saveLocal };
  }
})();
