// Dashboard logic
// iOS Safari keyboard fix — overlay composer approach:
// The mobile composer (#mobileComposer) lives OUTSIDE .dashboard (at end of <body>).
// JS positions it directly using visualViewport so iOS can't scroll it away.
(function setupMobileViewportFix() {
  const root = document.documentElement;
  const isMobile = () => window.innerWidth <= 768;

  const set = () => {
    const vv = window.visualViewport;
    const h = vv && vv.height ? vv.height : window.innerHeight;
    root.style.setProperty("--nb-vh", `${Math.round(h)}px`);

    const layoutH = window.innerHeight || h;
    // Lower threshold (50px) to detect keyboard earlier during animation
    const kbDiff = vv && vv.height ? (layoutH - vv.height) : 0;
    const keyboardOpen = kbDiff > 50;
    try { document.body.classList.toggle("nb-kb-open", !!keyboardOpen); } catch (e) {}

    // Position overlay composer directly
    const composer = document.getElementById("mobileComposer");
    if (composer && isMobile()) {
      const nav = document.querySelector(".bottom-nav");
      const navH = nav ? nav.getBoundingClientRect().height : 0;

      if (keyboardOpen) {
        // Keyboard open: position fixed bottom = keyboard height.
        // This places composer exactly above the keyboard with no gap.
        const kbHeight = Math.round(layoutH - h);
        composer.style.top = "auto";
        composer.style.bottom = kbHeight + "px";
      } else {
        // Keyboard closed: place composer above the bottom nav
        composer.style.top = "auto";
        composer.style.bottom = Math.round(navH) + "px";
      }
      composer.style.position = "fixed";
      composer.style.left = "0";
      composer.style.right = "0";
    }

    // Measure nav/composer for padding
    try {
      const nav = document.querySelector(".bottom-nav");
      if (nav) root.style.setProperty("--nb-nav-h", `${Math.round(nav.getBoundingClientRect().height)}px`);
      const comp = document.getElementById("mobileComposer");
      if (comp && isMobile()) root.style.setProperty("--nb-composer-h", `${Math.round(comp.getBoundingClientRect().height)}px`);
    } catch (e) {}
  };

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; set(); });
  };

  schedule();
  window.addEventListener("resize", schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
    // Also listen to scroll — needed for offsetTop when keyboard pushes viewport
    window.visualViewport.addEventListener("scroll", schedule, { passive: true });
  }

  // Scroll lock on focus
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const lockScroll = () => {
      try {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch (err) {}
    };
    setTimeout(() => {
      lockScroll();
      schedule();
      requestAnimationFrame(() => { lockScroll(); schedule(); });
    }, 0);
  }, { passive: true });
})();

// Helper: get correct input element (mobile overlay vs desktop inline)
function getChatInput() {
  if (window.innerWidth <= 768) return document.getElementById("chatInput");
  return document.getElementById("chatInputDesktop") || document.getElementById("chatInput");
}
function getImageInput() {
  if (window.innerWidth <= 768) return document.getElementById("chatInput"); // reused on mobile
  return document.getElementById("imageInputDesktop");
}
function getVideoInput() {
  if (window.innerWidth <= 768) return document.getElementById("chatInput"); // reused on mobile
  return document.getElementById("videoInputDesktop");
}
let profile = null;
let isAdmin = false;
let activePanel = 'chat';
let currentRole = 'universal';
let nbSettings = null;
let supportTickets = [];
let supportActiveId = null;
let supportPollTimer = null;

function getSetting(key, defVal) {
  try {
    if (nbSettings && nbSettings[key] !== undefined && nbSettings[key] !== null) return nbSettings[key];
  } catch (e) { /* ignore */ }
  return defVal;
}

async function loadPublicSettings() {
  try {
    const r = await fetch('/api/settings/public.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    const j = await r.json().catch(() => null);
    if (r.ok && j && j.settings) nbSettings = j.settings;
  } catch (e) { /* ignore */ }
}

async function supportApi(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (j && (j.error || j.detail || j.message)) || ('HTTP ' + r.status);
    const e = new Error(msg);
    e.data = j;
    throw e;
  }
  return j;
}

function supportFmtStatus(st) {
  if (st === 'closed') return 'Закрыт';
  if (st === 'pending') return 'В работе';
  return 'Открыт';
}

async function supportRefreshList() {
  const j = await supportApi('/api/support/tickets_list.php', { limit: 50 });
  supportTickets = j.tickets || [];
  return supportTickets;
}

async function supportOpenTicket(id) {
  supportActiveId = id;
  const j = await supportApi('/api/support/tickets_messages.php', { ticket_id: id });
  return j;
}

function supportSeenKey(id) { return 'nb_ticket_seen_' + id; }

function supportMarkSeen(id, updatedAt) {
  try { localStorage.setItem(supportSeenKey(id), String(updatedAt || '')); } catch (e) { /* ignore */ }
}

function supportHasNew(t) {
  try {
    const seen = localStorage.getItem(supportSeenKey(t.id)) || '';
    return (t.updated_at || '') && (t.updated_at !== seen);
  } catch (e) {
    return false;
  }
}

// Payment method (FreeKassa): 44=SBP QR, 36=cards РФ, 43=SberPay
let payMethod = parseInt(localStorage.getItem('nb_pay_method') || '44', 10);
if (![44, 36, 43].includes(payMethod)) payMethod = 44;

// Payment provider: freekassa | yookassa
let payProvider = (localStorage.getItem('nb_pay_provider') || 'freekassa').toLowerCase();
if (!['freekassa', 'yookassa'].includes(payProvider)) payProvider = 'freekassa';

function setPayProvider(p) {
  payProvider = (String(p || '')).toLowerCase() === 'yookassa' ? 'yookassa' : 'freekassa';
  localStorage.setItem('nb_pay_provider', payProvider);
  renderTokenShop();
  showToast('Платежная система: ' + (payProvider === 'yookassa' ? 'YooKassa' : 'FreeKassa'), 'info');
}

function setPayMethod(i) {
  const v = parseInt(i, 10);
  payMethod = [44, 36, 43].includes(v) ? v : 44;
  localStorage.setItem('nb_pay_method', String(payMethod));
  renderTokenShop();
  showToast('Способ оплаты: ' + (payMethod === 44 ? 'СБП' : (payMethod === 36 ? 'Карта РФ' : 'SberPay')), 'info');
}

// Chat state
const CONV_KEY = 'neurobro_conversations';
let conversations = [];
let activeConvId = null;
let chatLoading = false;

// Image state
const IMG_KEY = 'neurobro_image_history';
let imageHistory = [];
let imageAspect = '1:1';
let imageQuality = 'standard';
let imageStyle = 'photo';
const imageAspects = ['1:1', '9:16', '16:9', '21:9'];
const imageQualities = [
  { value: 'standard', label: 'Стандарт', cost: 5 },
  { value: 'high', label: 'Высокое', cost: 8 },
  { value: 'ultra', label: 'Ультра', cost: 12 },
];
const imageStyles = [
  { value: 'photo', label: 'Фото' }, { value: 'art', label: 'Арт' },
  { value: 'painting', label: 'Живопись' }, { value: 'sketch', label: 'Скетч' },
  { value: 'cinema', label: 'Кино' }, { value: 'anime', label: 'Аниме' },
];

// Video state
const VID_KEY = 'neurobro_video_history';
let videoHistory = [];
let videoDuration = '5';
let videoQualitySt = '720';
let videoAspect = '16:9';

const welcomeMsg = { role: 'assistant', content: 'Привет! Я NeuroBro 🤖 Задай мне любой вопрос.\n\n⚠️ Сейчас работает демо-режим.' };

// Init
(async () => {
  const user = await getUser();
  if (!user) { window.location.href = '/'; return; }
  currentUser = user;

  profile = await getProfile(user.id);
  isAdmin = await checkAdmin(user.id);
  await loadPublicSettings();
  // Preload support list to allow nav dot even before opening Profile.
  supportPollOnce().catch(() => {});

  updateBalance();
  if (isAdmin) document.getElementById('adminBtn').style.display = 'flex';

  // Load conversations
  try { conversations = JSON.parse(localStorage.getItem(CONV_KEY) || '[]'); } catch { conversations = []; }
  activeConvId = conversations[0]?.id || null;

  // Load histories
  try { imageHistory = JSON.parse(localStorage.getItem(IMG_KEY) || '[]'); } catch { imageHistory = []; }
  try { videoHistory = JSON.parse(localStorage.getItem(VID_KEY) || '[]'); } catch { videoHistory = []; }

  renderConvList();
  renderChat();
  renderImagePanel();
  renderVideoPanel();
  renderTokenShop();
  renderProfile();
  renderRoles();

  // Payment redirect status (success/fail pages redirect back with ?pay=...)
  try {
    const p = new URLSearchParams(window.location.search).get('pay');
    if (p === 'success') {
      showToast('Оплата принята. Зачисление токенов может занять до 1–2 минут.', 'success');
      // Give webhook time, then refresh.
      setTimeout(() => refreshProfile().then(() => { renderTokenShop(); renderProfile(); }), 4000);
      setTimeout(() => refreshProfile().then(() => { renderTokenShop(); renderProfile(); }), 15000);
    } else if (p === 'fail') {
      showToast('Оплата не завершена или отменена.', 'error');
    }
  } catch (e) { /* ignore */ }

  // Auth state listener
  sb.auth.onAuthStateChange((_e, session) => {
    if (!session) window.location.href = '/';
  });
})();

function updateBalance() {
  document.getElementById('headerBalance').textContent = (profile?.tokens_balance ?? 0).toLocaleString();
}

async function refreshProfile() {
  if (!currentUser) return;
  profile = await getProfile(currentUser.id);
  updateBalance();
}

async function doSignOut() { await signOut(); window.location.href = '/'; }

// ═══ PANEL SWITCHING ═══
function switchPanel(panel) {
  activePanel = panel;
  document.querySelectorAll('.panel').forEach(p => p.hidden = true);
  const el = document.getElementById('panel-' + panel);
  if (el) el.hidden = false;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === panel));
  if (panel === 'profile') renderProfile();
  if (panel === 'tokens') renderTokenShop();

  // Start/stop support polling to surface admin replies quickly.
  if (panel === 'profile') supportStartPolling();
  else supportStopPolling();

  // Update mobile overlay composer for active panel
  updateMobileComposer(panel);
}

function updateMobileComposer(panel) {
  const overlay = document.getElementById('mobileComposer');
  if (!overlay || window.innerWidth > 768) return;
  const input = overlay.querySelector('.chat-input');
  const btn = overlay.querySelector('.send-btn');
  if (!input || !btn) return;

  // Panels with input: chat, image, video. Others: hide composer.
  const hasInput = ['chat', 'image', 'video'].includes(panel);
  overlay.style.display = hasInput ? 'block' : 'none';

  if (panel === 'chat') {
    input.placeholder = 'Напишите сообщение...';
    btn.textContent = '➤';
    btn.onclick = () => sendChat();
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } };
  } else if (panel === 'image') {
    input.placeholder = 'Опиши что хочешь увидеть...';
    btn.textContent = '🪄';
    btn.onclick = () => generateImage();
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateImage(); } };
  } else if (panel === 'video') {
    input.placeholder = 'Опиши сцену для видео...';
    btn.textContent = '🎬';
    btn.onclick = () => generateVideo();
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateVideo(); } };
  }
}

function supportSetNavDot(on) {
  try {
    const btn = document.querySelector('.nav-item[data-panel="profile"]');
    if (btn) btn.dataset.hasNew = on ? '1' : '0';
  } catch (e) { /* ignore */ }
}

async function supportPollOnce() {
  try {
    const list = await supportRefreshList();
    const anyNew = list.some(t => supportHasNew(t));
    supportSetNavDot(anyNew);
    // If support UI is rendered, refresh list quietly.
    if (activePanel === 'profile') {
      const el = document.getElementById('supportList');
      if (el) renderSupportProfile().catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

function supportStartPolling() {
  supportStopPolling();
  supportPollOnce().catch(() => {});
  supportPollTimer = setInterval(() => { supportPollOnce().catch(() => {}); }, 15000);
}

function supportStopPolling() {
  if (supportPollTimer) { clearInterval(supportPollTimer); supportPollTimer = null; }
  // Keep the nav dot state; new replies can arrive while user is on other tabs.
}

// ═══ CHAT ═══
function saveConversations() { localStorage.setItem(CONV_KEY, JSON.stringify(conversations)); }

function renderConvList() {
  const list = document.getElementById('convList');
  document.getElementById('convCount').textContent = conversations.length;
  if (!conversations.length) {
    list.innerHTML = '<div class="empty-state" style="padding:2rem 0"><span style="font-size:1.5rem;opacity:0.3">💬</span><p class="text-xs text-muted">Нет чатов</p></div>';
    return;
  }
  list.innerHTML = conversations.map(c => `
    <div class="chat-sidebar-item ${c.id === activeConvId ? 'active' : ''}" onclick="selectConv('${c.id}')">
      <span>💬</span>
      <span class="truncate flex-1">${esc(c.title)}</span>
      <button class="delete-btn" onclick="event.stopPropagation();deleteConv('${c.id}')">🗑</button>
    </div>
  `).join('');
}

function selectConv(id) {
  activeConvId = id;
  renderConvList();
  renderChat();
  if (window.innerWidth < 640) toggleChatSidebar();
}

function newConversation() {
  const id = crypto.randomUUID();
  conversations.unshift({ id, title: 'Новый чат', messages: [welcomeMsg], updatedAt: Date.now() });
  activeConvId = id;
  saveConversations();
  renderConvList();
  renderChat();
}

function deleteConv(id) {
  conversations = conversations.filter(c => c.id !== id);
  if (activeConvId === id) activeConvId = conversations[0]?.id || null;
  saveConversations();
  renderConvList();
  renderChat();
}

function toggleChatSidebar() {
  document.getElementById('chatSidebar').classList.toggle('mobile-open');
}

function renderChat() {
  const conv = conversations.find(c => c.id === activeConvId);
  const msgs = conv?.messages || [welcomeMsg];
  const container = document.getElementById('chatMessages');
  const hasUserMsg = msgs.some(m => m.role === 'user');

  if (!hasUserMsg && msgs.length <= 1) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="background:rgba(124,58,237,0.1)">🤖</div>
        <div class="text-center">
          <h3 style="font-weight:700;font-size:1rem">NeuroBro AI</h3>
          <p class="text-xs text-muted" style="max-width:280px;margin:0.375rem auto 0">Задай любой вопрос — от написания кода до генерации идей</p>
        </div>
        <div class="quick-prompts">
          <button class="glass quick-prompt" onclick="document.getElementById('chatInput').value='Напиши пост для соцсети'"><span>✍️</span><span>Напиши пост для соцсети</span></button>
          <button class="glass quick-prompt" onclick="document.getElementById('chatInput').value='Объясни квантовую физику'"><span>🧠</span><span>Объясни квантовую физику</span></button>
          <button class="glass quick-prompt" onclick="document.getElementById('chatInput').value='Придумай бизнес-идею'"><span>💡</span><span>Придумай бизнес-идею</span></button>
          <button class="glass quick-prompt" onclick="document.getElementById('chatInput').value='Напиши код на Python'"><span>💻</span><span>Напиши код на Python</span></button>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = msgs.map(m => `
    <div class="msg ${m.role}">
      ${m.role === 'assistant' ? '<div class="msg-avatar">🤖</div>' : ''}
      <div class="msg-bubble">${esc(m.content)}</div>
    </div>
  `).join('');

  if (chatLoading) {
    container.innerHTML += '<div class="msg assistant"><div class="msg-avatar">🤖</div><div class="msg-bubble glass"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>';
  }

  container.scrollTop = container.scrollHeight;
}

async function sendChat() {
  if (chatLoading) return;
  const input = getChatInput();
  const text = input.value.trim();
  if (!text) return;

  // Spend token
  if ((profile?.tokens_balance ?? 0) < 1) { openTopup(); return; }
  const ok = await spendTokens(currentUser.id, 1, 'AI чат запрос');
  if (!ok) { openTopup(); return; }
  await refreshProfile();

  if (!activeConvId) newConversation();

  const conv = conversations.find(c => c.id === activeConvId);
  if (conv) {
    if (conv.title === 'Новый чат') conv.title = text.slice(0, 30);
    conv.messages.push({ role: 'user', content: text });
    conv.updatedAt = Date.now();
  }

  input.value = '';
  chatLoading = true;
  saveConversations();
  renderConvList();
  renderChat();

  // Demo response
  setTimeout(() => {
    const c = conversations.find(c => c.id === activeConvId);
    if (c) {
      c.messages.push({ role: 'assistant', content: 'Это демо-ответ. После подключения AI здесь будут реальные ответы. Токен списан ✅' });
      c.updatedAt = Date.now();
    }
    chatLoading = false;
    saveConversations();
    renderConvList();
    renderChat();
  }, 1000);
}

// ═══ IMAGE ═══
function renderImagePanel() {
  renderSelectGrid('imageAspectGrid', imageAspects.map(v => ({ value: v, label: v })), imageAspect, v => { imageAspect = v; updateImageSummary(); });
  renderSelectGrid('imageQualityGrid', imageQualities.map(q => ({ value: q.value, label: `${q.label} · ${q.cost}` })), imageQuality, v => { imageQuality = v; updateImageSummary(); });
  renderSelectGrid('imageStyleGrid', imageStyles, imageStyle, v => { imageStyle = v; updateImageSummary(); });
  updateImageSummary();
  renderImageHistory();
  renderImageEmpty();
}

function updateImageSummary() {
  const q = imageQualities.find(q => q.value === imageQuality);
  const s = imageStyles.find(s => s.value === imageStyle);
  document.getElementById('imageSettingsSummary').textContent = `${imageAspect} · ${q.label} · ${s.label}`;
  document.getElementById('imageCostDisplay').textContent = `${q.cost} ток.`;
}

function renderImageHistory() {
  document.getElementById('imageHistoryCount').textContent = imageHistory.length;
  const el = document.getElementById('imageHistory');
  if (!imageHistory.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="text-align:right"><button class="text-xs" style="color:var(--destructive)" onclick="imageHistory=[];localStorage.setItem('${IMG_KEY}','[]');renderImageHistory()">Очистить всю историю</button></div>` +
    imageHistory.map(i => `
      <div class="card history-item">
        <button class="history-delete" onclick="deleteImageItem('${i.id}')">🗑</button>
        <p class="text-xs">${esc(i.prompt)}</p>
        <div class="history-meta">
          <span>${i.aspect}</span><span>·</span>
          <span>${imageQualities.find(q=>q.value===i.quality)?.label||i.quality}</span><span>·</span>
          <span>${imageStyles.find(s=>s.value===i.style)?.label||i.style}</span><span>·</span>
          <span class="font-mono text-green">-${i.cost}</span><span>·</span>
          <span>${new Date(i.createdAt).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</span>
        </div>
      </div>
    `).join('');
}

function deleteImageItem(id) {
  imageHistory = imageHistory.filter(i => i.id !== id);
  localStorage.setItem(IMG_KEY, JSON.stringify(imageHistory));
  renderImageHistory();
}

function renderImageEmpty() {
  document.getElementById('imageEmptyState').innerHTML = `
    <div class="empty-state" style="padding:2rem 0">
      <div class="empty-icon" style="background:rgba(34,211,238,0.1)">🖼️</div>
      <div class="text-center">
        <h3 style="font-weight:700;font-size:0.875rem">Генерация изображений</h3>
        <p class="text-xs text-muted" style="max-width:260px;margin:0.375rem auto 0">Опиши что хочешь увидеть и AI создаст картинку</p>
      </div>
      <div style="max-width:24rem;width:100%" class="space-y-2">
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--neon-cyan)">📝</div>
          <div><p class="text-xs font-bold">Пиши конкретно</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"рыжий кот на подоконнике"</p></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary)">🎨</div>
          <div><p class="text-xs font-bold">Укажи стиль</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"в стиле Ван Гога, маслом"</p></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--neon-pink)">☀️</div>
          <div><p class="text-xs font-bold">Добавь атмосферу</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"закат, мягкий свет, боке"</p></div>
        </div>
      </div>
    </div>`;
}

async function generateImage() {
  const input = window.innerWidth <= 768 ? document.getElementById('chatInput') : (document.getElementById('imageInputDesktop') || document.getElementById('chatInput'));
  const text = input.value.trim();
  if (!text) return;
  const cost = imageQualities.find(q => q.value === imageQuality).cost;

  if ((profile?.tokens_balance ?? 0) < cost) { openTopup(); return; }
  const ok = await spendTokens(currentUser.id, cost, 'Генерация картинки');
  if (!ok) { openTopup(); return; }
  await refreshProfile();

  imageHistory.unshift({
    id: crypto.randomUUID(), prompt: text, aspect: imageAspect,
    quality: imageQuality, style: imageStyle, cost, createdAt: Date.now(), status: 'done'
  });
  localStorage.setItem(IMG_KEY, JSON.stringify(imageHistory));
  input.value = '';
  renderImageHistory();
  showToast(`Картинка сгенерирована (демо). -${cost} токенов`, 'success');
}

// ═══ VIDEO ═══
function renderVideoPanel() {
  renderSelectGrid('videoDurationGrid', [{ value: '5', label: '5 сек' }, { value: '10', label: '10 сек' }], videoDuration, v => { videoDuration = v; updateVideoSummary(); });
  renderSelectGrid('videoQualityGrid', [{ value: '720', label: '720p · 20 ток.' }, { value: '1080', label: '1080p · 30 ток.' }], videoQualitySt, v => { videoQualitySt = v; updateVideoSummary(); });
  renderSelectGrid('videoAspectGrid', [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }], videoAspect, v => { videoAspect = v; updateVideoSummary(); });
  updateVideoSummary();
  renderVideoHistory();
  renderVideoEmpty();
}

function updateVideoSummary() {
  const cost = videoQualitySt === '1080' ? 30 : 20;
  document.getElementById('videoSettingsSummary').textContent = `${videoDuration}с · ${videoQualitySt}p · ${videoAspect}`;
  document.getElementById('videoCostDisplay').textContent = `${cost} ток.`;
}

function renderVideoHistory() {
  document.getElementById('videoHistoryCount').textContent = videoHistory.length;
  const el = document.getElementById('videoHistory');
  if (!videoHistory.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="text-align:right"><button class="text-xs" style="color:var(--destructive)" onclick="videoHistory=[];localStorage.setItem('${VID_KEY}','[]');renderVideoHistory()">Очистить всю историю</button></div>` +
    videoHistory.map(i => `
      <div class="card history-item">
        <button class="history-delete" onclick="deleteVideoItem('${i.id}')">🗑</button>
        <p class="text-xs">${esc(i.prompt)}</p>
        <div class="history-meta">
          <span>${i.duration}с</span><span>·</span>
          <span>${i.quality}p</span><span>·</span>
          <span>${i.aspect}</span><span>·</span>
          <span class="font-mono text-green">-${i.cost}</span><span>·</span>
          <span>${new Date(i.createdAt).toLocaleString('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</span>
        </div>
      </div>
    `).join('');
}

function deleteVideoItem(id) {
  videoHistory = videoHistory.filter(i => i.id !== id);
  localStorage.setItem(VID_KEY, JSON.stringify(videoHistory));
  renderVideoHistory();
}

function renderVideoEmpty() {
  document.getElementById('videoEmptyState').innerHTML = `
    <div class="empty-state" style="padding:2rem 0">
      <div class="empty-icon" style="background:rgba(236,72,153,0.1)">🎬</div>
      <div class="text-center">
        <h3 style="font-weight:700;font-size:0.875rem">Генерация видео</h3>
        <p class="text-xs text-muted" style="max-width:260px;margin:0.375rem auto 0">Опиши сцену и AI создаст видеоролик</p>
      </div>
      <div style="max-width:24rem;width:100%" class="space-y-2">
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--neon-pink)">🎥</div>
          <div><p class="text-xs font-bold">Опиши сцену детально</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"кот играет с мячом на зелёной траве"</p></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--neon-cyan)">📐</div>
          <div><p class="text-xs font-bold">Укажи движение камеры</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"камера медленно облетает вокруг"</p></div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem 0.75rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:0.5rem;background:rgba(37,36,48,0.6);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--primary)">☀️</div>
          <div><p class="text-xs font-bold">Добавь атмосферу и стиль</p><p style="font-size:0.625rem;color:rgba(122,127,147,0.5)">"кинематографично, золотой час"</p></div>
        </div>
      </div>
    </div>`;
}

async function generateVideo() {
  const input = window.innerWidth <= 768 ? document.getElementById('chatInput') : (document.getElementById('videoInputDesktop') || document.getElementById('chatInput'));
  const text = input.value.trim();
  if (!text) return;
  const cost = videoQualitySt === '1080' ? 30 : 20;

  if ((profile?.tokens_balance ?? 0) < cost) { openTopup(); return; }
  const ok = await spendTokens(currentUser.id, cost, 'Генерация видео');
  if (!ok) { openTopup(); return; }
  await refreshProfile();

  videoHistory.unshift({
    id: crypto.randomUUID(), prompt: text, duration: videoDuration,
    quality: videoQualitySt, aspect: videoAspect, cost, createdAt: Date.now(), status: 'done'
  });
  localStorage.setItem(VID_KEY, JSON.stringify(videoHistory));
  input.value = '';
  renderVideoHistory();
  showToast(`Видео сгенерировано (демо). -${cost} токенов`, 'success');
}

// ═══ TOKEN SHOP ═══
function renderTokenShop() {
  const bal = profile?.tokens_balance ?? 0;
  const subLitePrice = getSetting('sub_lite_price', 299);
  const subProPrice = getSetting('sub_pro_price', 599);
  const subUltraPrice = getSetting('sub_ultra_price', 999);
  const packSmallTokens = getSetting('pack_small_tokens', 5000);
  const packSmallPrice = getSetting('pack_small_price', 99);
  const packMedTokens = getSetting('pack_medium_tokens', 20000);
  const packMedPrice = getSetting('pack_medium_price', 299);
  const packLargeTokens = getSetting('pack_large_tokens', 50000);
  const packLargePrice = getSetting('pack_large_price', 699);
  const chatCost = getSetting('chat_token_cost', 1);
  const imgCost = getSetting('image_token_cost', 5);
  const vidCost = getSetting('video_token_cost', 20);

  const fmtK = (n) => {
    const x = Number(n || 0);
    if (x >= 1000000) return Math.round(x / 100000) / 10 + 'M';
    if (x >= 1000) return Math.round(x / 100) / 10 + 'K';
    return String(x);
  };
  document.getElementById('tokenShopContent').innerHTML = `
    <div class="card" style="position:relative;overflow:hidden">
      <p class="text-sm text-muted" style="margin-bottom:0.25rem">Текущий баланс</p>
      <div style="display:flex;align-items:baseline;gap:0.5rem">
        <span class="font-mono font-bold text-gradient" style="font-size:1.75rem">${bal.toLocaleString()}</span>
        <span class="text-sm text-muted">токенов</span>
      </div>
    </div>

    <div class="card" style="padding:0.9rem">
      <p class="text-xs text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Платежная система</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.5rem">
        <button class="btn-secondary btn-sm ${payProvider === 'freekassa' ? 'glow-cyan' : ''}" onclick="setPayProvider('freekassa')">FreeKassa</button>
        <button class="btn-secondary btn-sm ${payProvider === 'yookassa' ? 'glow-purple' : ''}" onclick="setPayProvider('yookassa')">YooKassa</button>
      </div>

      ${payProvider === 'freekassa' ? `
        <div style="margin-top:0.75rem">
          <p class="text-xs text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Способ оплаты</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem">
            <button class="btn-secondary btn-sm ${payMethod === 44 ? 'glow-cyan' : ''}" onclick="setPayMethod(44)">СБП</button>
            <button class="btn-secondary btn-sm ${payMethod === 36 ? 'glow-purple' : ''}" onclick="setPayMethod(36)">Карта РФ</button>
            <button class="btn-secondary btn-sm ${payMethod === 43 ? 'glow-purple' : ''}" onclick="setPayMethod(43)">SberPay</button>
          </div>
        </div>
        <p class="text-xs text-muted" style="margin-top:0.5rem">Оплата откроется на странице FreeKassa.</p>
      ` : `
        <p class="text-xs text-muted" style="margin-top:0.5rem">Оплата откроется на странице YooKassa.</p>
      `}
    </div>

    <div>
      <h3 class="text-xs text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.05em;padding:0 0.25rem;margin-bottom:0.75rem">Подписки</h3>
      <div class="subs-grid">
        <button class="card sub-card" onclick="buyProduct('sub_lite')" style="border-color:rgba(34,197,94,0.2)">
          <div class="sub-header"><div style="display:flex;align-items:center;gap:0.75rem"><div class="sub-icon" style="background:rgba(34,197,94,0.1);color:var(--neon-green)">✨</div><div><p style="font-weight:600">Lite</p><p class="text-xs text-muted">ежемесячно</p></div></div><div style="text-align:right"><p class="font-mono font-bold" style="font-size:1.125rem">${subLitePrice}₽</p><p style="font-size:0.625rem;color:var(--muted)">/мес</p></div></div>
          <div class="sub-features"><span style="color:var(--neon-green)">Безлимит AI-чата</span><span style="color:var(--neon-green)">Все чат-модели</span><span style="color:var(--neon-green)">История сообщений</span></div>
        </button>
        <button class="card sub-card glow-purple" onclick="buyProduct('sub_pro')" style="border-color:rgba(124,58,237,0.3)">
          <div class="sub-header"><div style="display:flex;align-items:center;gap:0.75rem"><div class="sub-icon" style="background:rgba(124,58,237,0.1);color:var(--primary)">👑</div><div><p style="font-weight:600">Pro</p><p class="text-xs text-muted">ежемесячно</p></div></div><div style="text-align:right"><p class="font-mono font-bold" style="font-size:1.125rem">${subProPrice}₽</p><p style="font-size:0.625rem;color:var(--muted)">/мес</p></div></div>
          <div class="sub-features"><span style="color:var(--primary)">Всё из Lite</span><span style="color:var(--primary)">+2 картинки/день</span><span style="color:var(--primary)">+1 видео/месяц</span><span style="color:var(--primary)">Приоритет</span></div>
        </button>
        <button class="card sub-card glow-cyan" onclick="buyProduct('sub_ultra')" style="border-color:rgba(34,211,238,0.3)">
          <div class="sub-header"><div style="display:flex;align-items:center;gap:0.75rem"><div class="sub-icon" style="background:rgba(34,211,238,0.1);color:var(--neon-cyan)">💎</div><div><p style="font-weight:600">Ultra</p><p class="text-xs text-muted">ежемесячно</p></div></div><div style="text-align:right"><p class="font-mono font-bold" style="font-size:1.125rem">${subUltraPrice}₽</p><p style="font-size:0.625rem;color:var(--muted)">/мес</p></div></div>
          <div class="sub-features"><span style="color:var(--neon-cyan)">Всё из Pro</span><span style="color:var(--neon-cyan)">+5 картинок/день</span><span style="color:var(--neon-cyan)">+2 видео/месяц</span><span style="color:var(--neon-cyan)">Ранний доступ</span></div>
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-xs text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.05em;padding:0 0.25rem;margin-bottom:0.75rem">Пакеты токенов</h3>
      <div class="packs-grid">
        <button class="card pack-card" onclick="buyProduct('pack_small')"><p class="font-mono font-bold text-gradient" style="font-size:1.25rem">${fmtK(packSmallTokens)}</p><p style="font-size:0.625rem;color:var(--muted)">токенов</p><div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(42,41,53,0.2)"><p style="font-weight:600;font-size:0.875rem">${packSmallPrice}₽</p></div></button>
        <button class="card pack-card glow-purple" onclick="buyProduct('pack_medium')" style="border-color:rgba(124,58,237,0.3)"><div class="pack-badge">ХИТ</div><p class="font-mono font-bold text-gradient" style="font-size:1.25rem">${fmtK(packMedTokens)}</p><p style="font-size:0.625rem;color:var(--muted)">токенов</p><div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(42,41,53,0.2)"><p style="font-weight:600;font-size:0.875rem">${packMedPrice}₽</p></div></button>
        <button class="card pack-card" onclick="buyProduct('pack_large')"><p class="font-mono font-bold text-gradient" style="font-size:1.25rem">${fmtK(packLargeTokens)}</p><p style="font-size:0.625rem;color:var(--muted)">токенов</p><div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(42,41,53,0.2)"><p style="font-weight:600;font-size:0.875rem">${packLargePrice}₽</p></div></button>
      </div>
    </div>

    <div class="card space-y-3" style="padding:1rem">
      <p class="text-xs font-bold text-muted" style="text-transform:uppercase;letter-spacing:0.05em">Расход токенов</p>
      <div class="cost-grid">
        <div class="cost-item"><p style="margin-bottom:0.25rem">💬</p><p>Чат</p><p>${chatCost} токен</p></div>
        <div class="cost-item"><p style="margin-bottom:0.25rem">🎨</p><p>Картинка</p><p>от ${imgCost} токенов</p></div>
        <div class="cost-item"><p style="margin-bottom:0.25rem">🎬</p><p>Видео</p><p>от ${vidCost} токенов</p></div>
      </div>
    </div>
  `;
}

// ═══ PROFILE ═══
function renderProfile() {
  const bal = profile?.tokens_balance ?? 0;
  const sub = profile?.subscription;
  const created = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const ref = profile?.referral_code ?? '...';

  document.getElementById('profileContent').innerHTML = `
    <div class="card space-y-4" style="padding:1.5rem">
      <div style="display:flex;align-items:center;gap:1rem">
        <div class="profile-avatar">👤</div>
        <div style="min-width:0"><p style="font-weight:600;font-size:1.125rem">Личный кабинет</p><p class="text-sm text-muted truncate">${esc(profile?.email ?? '—')}</p></div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem"><span style="color:var(--neon-cyan)">💎</span><span class="text-xs text-muted">Баланс</span></div><p class="font-mono font-bold" style="font-size:1.25rem">${bal.toLocaleString()}</p><p class="text-xs text-muted">токенов</p></div>
        <div class="profile-stat"><div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem"><span style="color:var(--neon-green)">⭐</span><span class="text-xs text-muted">Подписка</span></div><p style="font-weight:700;font-size:1.125rem">${sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : '<span class="text-muted">Нет</span>'}</p><p class="text-xs text-muted">${sub ? 'активна' : 'не активна'}</p></div>
      </div>
      <div class="space-y-2 text-sm" style="border-top:1px solid rgba(42,41,53,0.3);padding-top:0.75rem">
        <p class="text-muted">📅 Аккаунт создан: ${created}</p>
        <p class="text-muted">🔒 Реферальный код: <code class="font-mono" style="color:var(--fg)">${ref}</code></p>
      </div>
    </div>

    <div class="card" style="border-left:4px solid rgba(34,197,94,0.5);padding:1.25rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">✨ Подключи подписку и получи больше возможностей:</p>
      <div class="text-sm text-muted space-y-2">
        <p>• <strong style="color:var(--fg)">Lite</strong> — 299₽/мес — безлимит AI-чата</p>
        <p>• <strong style="color:var(--fg)">Pro</strong> — 599₽/мес — + 2 картинки/день + 1 видео/мес</p>
        <p>• <strong style="color:var(--fg)">Ultra</strong> — 999₽/мес — + 5 картинок/день + 2 видео/мес</p>
      </div>
    </div>

    <div class="profile-actions">
      <button class="profile-action" onclick="switchPanel('role')">👑 Выбрать роль AI</button>
      <button class="profile-action" onclick="doDailyBonus()">🎁 Ежедневный бонус (+10 токенов)</button>
      <button class="profile-action" onclick="copyRefLink()">🔗 Скопировать реферальную ссылку</button>
      <button class="profile-action" onclick="openSupportTicket()">🆘 Написать в поддержку</button>
    </div>

    <div class="card" style="padding:1rem" id="supportCard">
      <div class="flex items-center justify-between" style="gap:0.75rem;margin-bottom:0.75rem">
        <div>
          <p class="text-sm font-bold">🎫 Поддержка</p>
          <p class="text-xs text-muted">Ответы админа будут здесь, во вкладке Профиль.</p>
        </div>
        <button class="btn-secondary btn-sm" onclick="openSupportTicket()">➕</button>
      </div>
      <div id="supportList" class="space-y-2"></div>
      <div id="supportThread" class="space-y-2" style="margin-top:0.75rem"></div>
    </div>

    <div class="card" style="padding:1rem">
      <p class="text-sm" style="margin-bottom:0.5rem">🔗 <strong>Реферальная программа</strong></p>
      <p class="text-sm text-primary" style="word-break:break-all">https://neuro-bro.ru/?ref=${ref}</p>
      <p class="text-xs text-muted" style="margin-top:0.5rem">Приглашай друзей — получай <strong style="color:var(--neon-green)">+3,000 токенов</strong> за каждого!</p>
    </div>

    <button class="btn-danger btn-secondary w-full" onclick="doSignOut()">Выйти из аккаунта</button>
  `;

  // Async load support tickets.
  renderSupportProfile().catch(() => {});
}

async function renderSupportProfile() {
  const listEl = document.getElementById('supportList');
  const threadEl = document.getElementById('supportThread');
  if (!listEl || !threadEl) return;
  listEl.innerHTML = `<p class="text-xs text-muted">Загрузка обращений...</p>`;
  threadEl.innerHTML = '';

  let tickets = [];
  try { tickets = await supportRefreshList(); } catch (e) { listEl.innerHTML = `<p class="text-xs" style="color:var(--destructive)">Ошибка: ${esc(e.message||String(e))}</p>`; return; }

  if (!tickets.length) {
    listEl.innerHTML = `<p class="text-xs text-muted">Обращений пока нет. Нажми “🆘 Написать в поддержку”.</p>`;
    return;
  }

  const renderItem = (t) => {
    const isActive = supportActiveId === t.id;
    const newDot = supportHasNew(t) ? `<span class="support-dot" title="Есть обновление"></span>` : '';
    return `
      <button class="support-item ${isActive ? 'active' : ''}" onclick="(async()=>{try{const j=await supportOpenTicket('${t.id}'); supportMarkSeen('${t.id}', '${t.updated_at||''}'); renderSupportProfile(); renderSupportThread(j);}catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">
        <div class="flex items-center justify-between" style="gap:0.75rem">
          <div style="min-width:0">
            <p class="text-sm font-bold truncate">${esc(t.subject||'Без темы')}</p>
            <p class="text-xs text-muted truncate">${supportFmtStatus(t.status)} · ${new Date(t.updated_at||t.created_at).toLocaleString('ru-RU')}</p>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0">${newDot}<span class="text-xs text-muted">→</span></div>
        </div>
      </button>
    `;
  };

  listEl.innerHTML = tickets.slice(0, 8).map(renderItem).join('');

  // Auto-open first ticket if none selected.
  if (!supportActiveId) {
    try {
      const first = tickets[0];
      const j = await supportOpenTicket(first.id);
      supportMarkSeen(first.id, first.updated_at || '');
      renderSupportThread(j);
    } catch (e) { /* ignore */ }
  } else {
    try {
      const j = await supportOpenTicket(supportActiveId);
      renderSupportThread(j);
    } catch (e) { /* ignore */ }
  }
}

function renderSupportThread(j) {
  const threadEl = document.getElementById('supportThread');
  if (!threadEl) return;
  const msgs = j.messages || [];
  const ticketId = j.ticket_id || supportActiveId;

  const bubbles = msgs.map(m => {
    const who = m.author === 'admin' ? 'support-admin' : 'support-user';
    const label = m.author === 'admin' ? 'Поддержка' : 'Вы';
    return `
      <div class="support-msg ${who}">
        <div class="support-msg-meta">
          <span>${label}</span>
          <span class="text-xs text-muted">${new Date(m.created_at).toLocaleString('ru-RU')}</span>
        </div>
        <div class="support-msg-bubble">${esc(m.message||'')}</div>
      </div>
    `;
  }).join('');

  threadEl.innerHTML = `
    <div class="support-thread">
      <div class="support-thread-messages scrollbar-thin">${bubbles || ''}</div>
      <div class="support-thread-input">
        <textarea class="input" id="supportReply" placeholder="Написать ответ..." style="min-height:44px;resize:none"></textarea>
        <button class="btn-primary btn-sm" onclick="(async()=>{const v=(document.getElementById('supportReply').value||'').trim(); if(!v){showToast('Введите сообщение','error');return;} try{await supportApi('/api/support/tickets_messages.php',{ticket_id:'${ticketId}',message:v}); document.getElementById('supportReply').value=''; const jj=await supportOpenTicket('${ticketId}'); renderSupportThread(jj);}catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">Отправить</button>
      </div>
    </div>
  `;
}

async function openSupportTicket(){
  const subject = (prompt('Тема обращения в поддержку:', 'Вопрос по оплате') || '').trim();
  if (!subject) return;
  const message = (prompt('Сообщение (коротко):', '') || '').trim();
  if (!message) return;
  try{
    const j = await supportApi('/api/support/tickets_create.php', { subject, message, priority: 'normal' });
    showToast('✅ Обращение создано. Ответ придет в админку поддержки.', 'success');
    // Refresh UI if profile is open.
    if (activePanel === 'profile') {
      supportActiveId = j.ticket_id || null;
      renderSupportProfile().catch(()=>{});
    }
  }catch(e){
    showToast('Ошибка: ' + (e.message || e), 'error');
  }
}

async function doDailyBonus() {
  if (!currentUser) return;
  const ok = await claimDailyBonus(currentUser.id);
  showToast(ok ? 'Бонус получен! 🎁 +10 токенов' : 'Бонус уже получен. Приходите через 24 часа', ok ? 'success' : 'error');
  if (ok) { await refreshProfile(); renderProfile(); }
}

function copyRefLink() {
  if (!profile) return;
  navigator.clipboard.writeText(`https://neuro-bro.ru/?ref=${profile.referral_code}`);
  showToast('Скопировано! Реферальная ссылка в буфере обмена', 'success');
}

// ═══ ROLES ═══
const roles = [
  { id: 'programmer', label: 'Программист', icon: '👨‍💻', desc: 'Помогает с кодом, алгоритмами, дебагом' },
  { id: 'copywriter', label: 'Копирайтер', icon: '✍️', desc: 'Пишет тексты, посты, рекламу' },
  { id: 'english_tutor', label: 'English Репетитор', icon: '🇬🇧', desc: 'Обучает английскому, исправляет ошибки' },
  { id: 'tarot', label: 'Таролог', icon: '🔮', desc: 'Гадания на таро, мистика' },
  { id: 'universal', label: 'Универсальный ассистент', icon: '🤖', desc: 'Помощник на все случаи жизни' },
];

function renderRoles() {
  const cur = roles.find(r => r.id === currentRole) || roles[roles.length - 1];
  document.getElementById('roleContent').innerHTML = `
    <div class="card space-y-3" style="padding:1.25rem">
      <h2 style="font-size:1.125rem;font-weight:700">🤖 Выбор роли</h2>
      <p class="text-sm">Текущая роль: <strong>${cur.icon} ${cur.label}</strong></p>
      <p class="text-sm text-muted">Роль задаёт AI специализацию и стиль ответов. Выбери подходящую:</p>
      <div class="card" style="border-left:4px solid rgba(236,72,153,0.5);padding:0.75rem"><p class="text-sm text-muted" style="font-style:italic">${cur.desc}</p></div>
    </div>
    <div class="space-y-2">
      ${roles.map(r => `<button class="role-btn ${r.id === currentRole ? 'active glow-purple' : ''}" onclick="setRole('${r.id}')">${r.icon} ${r.label}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
      <button class="btn-secondary btn-danger" onclick="setRole('')">❌ Без роли</button>
      <button class="btn-secondary" onclick="switchPanel('profile')">← Назад</button>
    </div>
  `;
}

function setRole(id) {
  currentRole = id || 'universal';
  renderRoles();
}

// ═══ UTILITIES ═══
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 128) + 'px'; }

function toggleSettings(id) {
  document.getElementById(id).classList.toggle('open');
}

function toggleEl(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function openTopup() { document.getElementById('topupModal').style.display = 'block'; }
function closeTopup() { document.getElementById('topupModal').style.display = 'none'; }

// ═══ PAYMENT (FreeKassa API) ═══
async function buyProduct(productId) {
  if (!currentUser || !profile) { showToast('Авторизуйтесь для покупки', 'error'); return; }
  closeTopup();

  try {
    const res = await fetch('/api/payment.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        user_id: currentUser.id,
        email: profile.email,
        provider: payProvider,
        // FreeKassa payment method:
        // 44 = SBP QR, 36 = cards РФ, 43 = SberPay
        i: payMethod,
      }),
    });
    const data = await res.json();
    if (!data.success || !data.location) { showToast(data.error || 'Ошибка создания платежа', 'error'); return; }

    // Redirect to payment page. Tokens/subscription will be applied via webhook.
    window.location.href = data.location;
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
}

function renderSelectGrid(containerId, items, activeValue, onChange) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map(item => `
    <button class="select-option ${item.value === activeValue ? 'active' : ''}"
            onclick="this.parentNode.querySelectorAll('.select-option').forEach(o=>o.classList.remove('active'));this.classList.add('active');(${onChange.toString()})('${item.value}')">
      ${item.label || item.value}
    </button>
  `).join('');
}
