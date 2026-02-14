// Landing page logic
document.getElementById('year').textContent = new Date().getFullYear();

let authMode = 'register';
let lastAuthAttempt = 0;
const AUTH_COOLDOWN = 15000; // 15 seconds between attempts

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('tabRegister').className = `auth-tab ${mode === 'register' ? 'active' : ''}`;
  document.getElementById('tabLogin').className = `auth-tab ${mode === 'login' ? 'active' : ''}`;
  document.getElementById('authPassword').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent = mode === 'register' ? 'Создать аккаунт →' : 'Войти →';
  document.getElementById('authHint').textContent = mode === 'register' ? 'Пароль придёт на почту · Без VPN' : 'Введите email и пароль';
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authSubmit');
  if (!email) return;

  // Rate limiting
  const now = Date.now();
  if (now - lastAuthAttempt < AUTH_COOLDOWN) {
    const wait = Math.ceil((AUTH_COOLDOWN - (now - lastAuthAttempt)) / 1000);
    showToast(`Подождите ${wait} сек. перед повторной попыткой`, 'error');
    return;
  }
  lastAuthAttempt = now;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Подождите...';

  try {
    if (authMode === 'register') {
      const pwd = generatePassword();
      const { error } = await signUp(email, pwd);
      if (error) {
        showToast(error, 'error');
      } else {
        showPasswordModal(pwd, email);
      }
    } else {
      if (!password) { showToast('Введите пароль', 'error'); btn.disabled = false; btn.textContent = 'Войти →'; return; }
      const { error } = await signIn(email, password);
      if (error) {
        showToast(error, 'error');
      } else {
        window.location.href = '/dashboard.html';
        return;
      }
    }
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = authMode === 'register' ? 'Создать аккаунт →' : 'Войти →';
}

function scrollToEl(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('active');
}

// Render models
const models = [
  { name: 'AI Чат', desc: 'Умный ассистент — ответит на любой вопрос, напишет код, поможет с задачами', tag: 'Чат', icon: '💬', color: 'primary' },
  { name: 'Генерация картинок', desc: 'Фотореалистичные изображения по текстовому описанию, 6 стилей', tag: 'Картинки', icon: '🎨', color: 'cyan' },
  { name: 'Генерация видео', desc: 'Создание видеороликов из текста с настройкой качества и длительности', tag: 'Видео', icon: '🎬', color: 'pink' },
];

const colorMap = { primary: 'var(--primary)', cyan: 'var(--neon-cyan)', pink: 'var(--neon-pink)' };
const bgColorMap = { primary: 'rgba(124,58,237,0.1)', cyan: 'rgba(34,211,238,0.1)', pink: 'rgba(236,72,153,0.1)' };
const tagBgMap = { primary: 'rgba(124,58,237,0.1)', cyan: 'rgba(34,211,238,0.1)', pink: 'rgba(236,72,153,0.1)' };

document.getElementById('modelsGrid').innerHTML = models.map(m => `
  <div class="card model-card">
    <div class="model-icon" style="background:${bgColorMap[m.color]};color:${colorMap[m.color]}">${m.icon}</div>
    <div style="min-width:0">
      <div style="display:flex;align-items:center;flex-wrap:wrap">
        <h3>${m.name}</h3>
        <span class="model-tag" style="background:${tagBgMap[m.color]};color:${colorMap[m.color]}">${m.tag}</span>
      </div>
      <p>${m.desc}</p>
    </div>
  </div>
`).join('');

// Reviews
const reviews = [
  { name: 'Алексей К.', role: 'Разработчик', text: 'Перестал мучаться с VPN. Все модели работают стабильно, код пишет как зверь.' },
  { name: 'Мария С.', role: 'Дизайнер', text: 'Генерация картинок в разных стилях — мечта. Создаю концепты за минуты.' },
  { name: 'Дмитрий Н.', role: 'Маркетолог', text: 'Использую для контента каждый день. Окупается за первый же пост.' },
  { name: 'Анна В.', role: 'Студентка', text: 'AI-чат помогает с учёбой, а видеогенерация — делать презентации. Лучшая подписка.' },
];

document.getElementById('reviewsGrid').innerHTML = reviews.map(r => `
  <div class="card review-card">
    <div class="review-stars">★★★★★</div>
    <p class="review-text">${r.text}</p>
    <div class="review-author">
      <div class="review-avatar">👤</div>
      <div><p class="review-name">${r.name}</p><p class="review-role">${r.role}</p></div>
    </div>
  </div>
`).join('');

// Pricing
const plans = [
  { name: 'Lite', price: '299₽', features: ['Безлимит AI-чата', 'Все чат-модели', 'История сообщений'], popular: false },
  { name: 'Pro', price: '599₽', features: ['Всё из Lite', '+ 2 картинки/день', '+ 1 видео/месяц', 'Приоритетная очередь'], popular: true },
  { name: 'Ultra', price: '999₽', features: ['Всё из Pro', '+ 5 картинок/день', '+ 2 видео/месяц', 'Ранний доступ к новинкам'], popular: false },
];

document.getElementById('pricingGrid').innerHTML = plans.map(p => `
  <div class="card plan-card ${p.popular ? 'plan-popular' : ''}">
    ${p.popular ? '<div class="plan-badge">⭐ Популярный</div>' : ''}
    <h3>${p.name}</h3>
    <div class="plan-price">${p.price} <span>/мес</span></div>
    <ul class="plan-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
    <button class="btn-primary w-full" onclick="scrollToEl('register')">Начать</button>
  </div>
`).join('');

// FAQ
const faqs = [
  { q: 'Нужен ли VPN?', a: 'Нет. NeuroBro работает из России напрямую — никаких VPN, прокси или танцев с бубном.' },
  { q: 'Какие возможности доступны?', a: 'AI-чат для текстовых задач, генерация картинок в 6 стилях (фото, арт, живопись, скетч, кино, аниме) и генерация видео с настройкой качества.' },
  { q: 'Как работает оплата?', a: 'Подписка или токены. Можно попробовать бесплатно — 10 токенов при регистрации.' },
  { q: 'Безопасно ли это?', a: 'Да. Мы не храним ваши запросы, данные шифруются, регистрация только по email.' },
];

document.getElementById('faqList').innerHTML = faqs.map(f => `
  <div class="glass faq-item" onclick="this.classList.toggle('active')">
    <button class="faq-question"><span>${f.q}</span><span class="faq-arrow">▼</span></button>
    <div class="faq-answer">${f.a}</div>
  </div>
`).join('');

// Password modal after registration
function showPasswordModal(password, email) {
  // Remove existing modal if any
  const existing = document.getElementById('passwordModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'passwordModal';
  modal.className = 'pwd-modal-overlay';
  modal.innerHTML = `
    <div class="pwd-modal glass">
      <div class="pwd-modal-icon">✅</div>
      <h3>Аккаунт создан!</h3>
      <p class="text-muted text-sm" style="margin-top:0.25rem">Не забудьте сохранить пароль. Также отправили его на <strong style="color:var(--fg)">${email}</strong></p>
      <div class="pwd-modal-box">
        <span class="font-mono" id="pwdValue">${password}</span>
        <button class="pwd-copy-btn" onclick="copyPassword()" id="pwdCopyBtn" title="Скопировать">📋</button>
      </div>
      <p class="text-xs text-muted" id="pwdCopyHint" style="min-height:1.25rem"></p>
      <button class="btn-primary w-full" onclick="goToDashboard()" style="margin-top:0.5rem">Перейти в кабинет →</button>
      <button class="text-muted text-sm" onclick="closePasswordModal()" style="margin-top:0.5rem;opacity:0.7">Закрыть</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function copyPassword() {
  const pwd = document.getElementById('pwdValue').textContent;
  navigator.clipboard.writeText(pwd).then(() => {
    document.getElementById('pwdCopyBtn').textContent = '✅';
    document.getElementById('pwdCopyHint').textContent = 'Скопировано!';
    setTimeout(() => {
      document.getElementById('pwdCopyBtn').textContent = '📋';
      document.getElementById('pwdCopyHint').textContent = '';
    }, 2000);
  });
}

function goToDashboard() {
  window.location.href = '/dashboard.html';
}

function closePasswordModal() {
  const m = document.getElementById('passwordModal');
  if (m) m.remove();
}

// Check auth — redirect if logged in
// On iOS Safari the initial TCP/TLS handshake can be noticeably slow.
// Don't block first paint/interaction on this check; do it asynchronously.
setTimeout(() => {
  Promise.resolve()
    .then(() => getUser())
    .then((user) => { if (user) window.location.href = '/dashboard.html'; })
    .catch(() => {});
}, 0);
