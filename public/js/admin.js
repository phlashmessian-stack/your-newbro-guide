let adminUser=null,adminProfile=null,users=[],adminTab='overview';

const ICONS = {
  overview: `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  analytics:`<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M4 19V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 15l3-4 3 2 4-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  users:    `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M9.5 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 21a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="1.8" opacity="0.75"/><path d="M17.5 21a5.5 5.5 0 0 0-3.4-5.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/></svg>`,
  subscribers:`<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.9L12 16.9 6.8 19.3l1-5.9L3.5 9.2l5.9-.9L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  transactions:`<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M7 7h12l-2.5-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 17H5l2.5 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 7a7 7 0 0 0 0 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/><path d="M17 17a7 7 0 0 0 0-10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/></svg>`,
  payments: `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M4 9h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7.5 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  fraud:    `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M12 2.8 20 6.5V12c0 5-3.3 9.3-8 10.8C7.3 21.3 4 17 4 12V6.5L12 2.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8L15.8 9.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  crm:      `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 7a5 5 0 1 0 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  support:  `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 15H9l-4.5 3V6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 8h8M8 11h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  broadcast:`<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 7.5 12 12l5.5-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  settings: `<svg class="admin-ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a8.5 8.5 0 0 0 .1-1 8.5 8.5 0 0 0-.1-1l2-1.4-2-3.4-2.4.7a8.8 8.8 0 0 0-1.7-1l-.3-2.5H9l-.3 2.5a8.8 8.8 0 0 0-1.7 1L4.6 8.2l-2 3.4 2 1.4a8.5 8.5 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.4 2 3.4 2.4-.7a8.8 8.8 0 0 0 1.7 1l.3 2.5h6l.3-2.5a8.8 8.8 0 0 0 1.7-1l2.4.7 2-3.4-2-1.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`
};

const tabs=[
  {id:'overview',iconSvg:ICONS.overview,label:'Обзор'},
  {id:'analytics',iconSvg:ICONS.analytics,label:'Аналитика'},
  {id:'users',iconSvg:ICONS.users,label:'Пользователи'},
  {id:'subscribers',iconSvg:ICONS.subscribers,label:'Подписки'},
  {id:'transactions',iconSvg:ICONS.transactions,label:'Транзакции'},
  {id:'payments',iconSvg:ICONS.payments,label:'Платежи'},
  {id:'fraud',iconSvg:ICONS.fraud,label:'Безопасность'},
  {id:'crm',iconSvg:ICONS.crm,label:'CRM'},
  {id:'support',iconSvg:ICONS.support,label:'Поддержка'},
  {id:'broadcast',iconSvg:ICONS.broadcast,label:'Рассылка'},
  {id:'settings',iconSvg:ICONS.settings,label:'Настройки'}
];

(async()=>{
  const u=await getUser();if(!u){window.location.href='/';return}
  adminUser=u;
  const adm=await checkAdmin(u.id);if(!adm){window.location.href='/dashboard.html';return}
  adminProfile=await getProfile(u.id);
  await fetchUsers();renderNav();renderTab();
  sb.auth.onAuthStateChange((_,s)=>{if(!s)window.location.href='/'});
})();

function renderNav(){
  const mk=t=>`<button class="admin-nav-item ${adminTab===t.id?'active':''}" onclick="adminTab='${t.id}';renderNav();renderTab()">${t.iconSvg}<span>${t.label}</span></button>`;
  document.getElementById('sidebarNav').innerHTML=tabs.map(mk).join('');
  document.getElementById('mobileNav').innerHTML=tabs.map(t=>`<button class="admin-mobile-item ${adminTab===t.id?'active':''}" onclick="adminTab='${t.id}';renderNav();renderTab()">${t.iconSvg}<span>${t.label}</span></button>`).join('');
}

async function fetchUsers(){
  const{data}=await sb.from('profiles').select('id,email,tokens_balance,subscription,referral_code,created_at').order('created_at',{ascending:false});
  if(data)users=data;
}

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

function renderTab(){
  const m=document.getElementById('adminMain');
  if(adminTab==='overview')renderOverview(m);
  else if(adminTab==='analytics')renderAnalytics(m);
  else if(adminTab==='users')renderUsers(m);
  else if(adminTab==='subscribers')renderSubscribers(m);
  else if(adminTab==='transactions')renderTransactions(m);
  else if(adminTab==='payments')renderPayments(m);
  else if(adminTab==='fraud')renderFraud(m);
  else if(adminTab==='crm')renderCRM(m);
  else if(adminTab==='support')renderSupport(m);
  else if(adminTab==='broadcast')renderBroadcast(m);
  else if(adminTab==='settings')renderSettings(m);
}

function renderOverview(m){
  const total=users.length,today=users.filter(u=>new Date(u.created_at).toDateString()===new Date().toDateString()).length;
  const withSub=users.filter(u=>u.subscription).length,totalTok=users.reduce((s,u)=>s+u.tokens_balance,0);
  m.innerHTML=`<div class="space-y-6">
    <div class="flex items-center justify-between"><h1 style="font-size:1.5rem;font-weight:700">Обзор</h1><button class="btn-secondary btn-sm" onclick="fetchUsers().then(()=>renderTab())">Обновить</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem">
      <div class="card stat-card"><p class="stat-label">Всего</p><p class="stat-value">${total}</p></div>
      <div class="card stat-card"><p class="stat-label">Сегодня</p><p class="stat-value">${today}</p></div>
      <div class="card stat-card"><p class="stat-label">С подпиской</p><p class="stat-value">${withSub}</p></div>
      <div class="card stat-card"><p class="stat-label">Токены</p><p class="stat-value">${totalTok.toLocaleString()}</p></div>
    </div>
    <div class="card" style="padding:1rem"><p style="font-weight:600;margin-bottom:0.75rem">Быстрые действия</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary btn-sm" onclick="adminTab='analytics';renderNav();renderTab()">Аналитика</button>
        <button class="btn-secondary btn-sm" onclick="adminTab='payments';renderNav();renderTab()">Платежи</button>
        <button class="btn-secondary btn-sm" onclick="adminTab='crm';renderNav();renderTab()">CRM</button>
        <button class="btn-secondary btn-sm" onclick="adminTab='settings';renderNav();renderTab()">Настройки</button>
      </div>
    </div>
    <div class="card"><div style="padding:1rem;border-bottom:1px solid rgba(42,41,53,0.2)"><p style="font-weight:600">Последние регистрации</p></div>
      <div style="padding:1rem" class="space-y-2">${users.slice(0,8).map(u=>`<div class="flex items-center justify-between text-sm" style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)"><div style="min-width:0"><span class="truncate" style="display:block;max-width:200px">${esc(u.email)}</span><span style="font-size:0.625rem;color:var(--muted)">${new Date(u.created_at).toLocaleString('ru-RU')}</span></div><div class="flex items-center gap-3 shrink-0"><span class="font-mono text-xs text-muted">${u.tokens_balance.toLocaleString()}</span>${u.subscription?`<span style="padding:0.125rem 0.5rem;border-radius:999px;font-size:0.75rem;background:rgba(34,197,94,0.1);color:var(--neon-green)">${u.subscription}</span>`:''}</div></div>`).join('')}</div>
    </div>
  </div>`;
}

async function renderAnalytics(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка аналитики...</p>';
  const days = Number(window.__anDays||30) || 30;
  let j=null;
  try{
    const r=await fetch('/api/admin/analytics.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({days})});
    j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
  }catch(e){
    m.innerHTML=`<div class="card" style="padding:1rem;border-left:4px solid rgba(236,72,153,0.5)"><p class="text-sm font-bold">Ошибка</p><p class="text-xs text-muted">${esc(e.message||String(e))}</p></div>`;
    return;
  }
  const s=j.sales||{}, f=j.funnel||{};
  const byDay=s.by_day||[];
  const maxRev=Math.max(1,...byDay.map(x=>Number(x.revenue||0)));
  const bars=byDay.slice(-14).map(x=>{
    const r=Number(x.revenue||0);
    const h=Math.max(2,Math.round((r/maxRev)*48));
    return `<div title="${esc(x.day)}: ${r.toFixed(0)} ₽" style="flex:1;min-width:10px;display:flex;align-items:flex-end"><div style="height:${h}px;width:100%;border-radius:10px;background:linear-gradient(180deg, rgba(124,58,237,0.9), rgba(34,211,238,0.6));opacity:0.9"></div></div>`;
  }).join('');
  const byPay=(s.by_payment||[]).slice(0,20).map(x=>`<div class="flex items-center justify-between text-sm" style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)"><div style="min-width:0"><span class="font-bold">${esc(x.provider||'')}</span> <span class="text-xs text-muted">i=${esc(String(x.method_i||''))}</span></div><div class="font-mono text-xs text-muted">${Number(x.cnt||0)} · ${Number(x.revenue||0).toFixed(0)}₽</div></div>`).join('');
  const utm=(j.attribution?.signups_by_utm||[]).slice(0,12).map(x=>`<div class="flex items-center justify-between text-sm" style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)"><div style="min-width:0"><p class="truncate font-bold">${esc(x.utm_source||'')}</p><p class="text-xs text-muted truncate">${esc(x.utm_campaign||'')}</p></div><div class="font-mono text-xs text-muted">${Number(x.signups||0)}</div></div>`).join('');

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">Аналитика</h1>
      <div class="flex items-center gap-2">
        <select class="input" style="max-width:160px" onchange="window.__anDays=Number(this.value);renderAnalytics(document.getElementById('adminMain'))">
          ${[7,14,30,60,90].map(d=>`<option value="${d}" ${d===days?'selected':''}>${d} дней</option>`).join('')}
        </select>
        <button class="btn-secondary btn-sm" onclick="renderAnalytics(document.getElementById('adminMain'))">Обновить</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.75rem">
      <div class="card stat-card"><p class="stat-label">Оплат</p><p class="stat-value">${Number(s.paid_orders||0)}</p></div>
      <div class="card stat-card"><p class="stat-label">Выручка</p><p class="stat-value">${Number(s.revenue||0).toFixed(0)}₽</p></div>
      <div class="card stat-card"><p class="stat-label">Средний чек</p><p class="stat-value">${Number(s.avg_check||0).toFixed(0)}₽</p></div>
      <div class="card stat-card"><p class="stat-label">Повторные</p><p class="stat-value">${Number(f.repeat_purchase||0)}</p></div>
    </div>
    <div class="card" style="padding:1rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">Выручка по дням (последние 14)</p>
      <div style="display:flex;gap:6px;align-items:flex-end;height:56px">${bars||''}</div>
      <p class="text-xs text-muted" style="margin-top:0.5rem">Данные: оплаченные заказы (status=PAID)</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div class="card" style="padding:1rem">
        <p class="text-sm font-bold" style="margin-bottom:0.5rem">Воронка</p>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm"><span>Регистрации</span><span class="font-mono text-xs">${Number(f.registrations||0)}</span></div>
          <div class="flex items-center justify-between text-sm"><span>Первый вход</span><span class="font-mono text-xs">${Number(f.first_login||0)}</span></div>
          <div class="flex items-center justify-between text-sm"><span>Первая покупка</span><span class="font-mono text-xs">${Number(f.first_purchase||0)}</span></div>
          <div class="flex items-center justify-between text-sm"><span>Подписчики</span><span class="font-mono text-xs">${Number(f.subscribers||0)}</span></div>
        </div>
      </div>
      <div class="card" style="padding:1rem">
        <p class="text-sm font-bold" style="margin-bottom:0.5rem">Провайдер / метод</p>
        <div class="space-y-1" style="max-height:220px;overflow:auto">${byPay||'<p class="text-xs text-muted">Нет данных</p>'}</div>
      </div>
    </div>
    <div class="card" style="padding:1rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">Источники (UTM по регистрациям)</p>
      <div class="space-y-1" style="max-height:260px;overflow:auto">${utm||'<p class="text-xs text-muted">Нет данных</p>'}</div>
    </div>
  </div>`;
}

function renderUsers(m){
  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between"><h1 style="font-size:1.5rem;font-weight:700">Пользователи (${users.length})</h1><button class="btn-secondary btn-sm" onclick="fetchUsers().then(()=>renderTab())">Обновить</button></div>
    <input class="input" placeholder="Поиск по email..." id="userSearch" oninput="filterUsers()">
    <div id="usersList" class="space-y-2"></div>
  </div>`;
  filterUsers();
}

function filterUsers(){
  const q=(document.getElementById('userSearch')?.value||'').toLowerCase();
  const f=users.filter(u=>u.email.toLowerCase().includes(q)||u.referral_code.toLowerCase().includes(q));
  document.getElementById('usersList').innerHTML=f.map(u=>`
    <div class="card user-card">
      <div class="flex items-center justify-between"><div style="min-width:0"><p class="text-sm font-bold truncate" style="max-width:250px">${esc(u.email)}</p><p class="text-xs text-muted">Реф: ${u.referral_code} · ${new Date(u.created_at).toLocaleDateString('ru-RU')}</p></div><div style="text-align:right;flex-shrink:0"><p class="font-mono text-sm">${u.tokens_balance.toLocaleString()}</p><p class="text-xs text-muted">${u.subscription?u.subscription:'Нет подписки'}</p></div></div>
      <div class="user-actions">
        <button class="btn-secondary btn-sm" onclick="adminAddTok('${u.id}',100)">+100</button>
        <button class="btn-secondary btn-sm" onclick="adminAddTok('${u.id}',1000)">+1K</button>
        <button class="btn-secondary btn-sm" onclick="adminAddTok('${u.id}',10000)">+10K</button>
        ${u.subscription?`<button class="btn-secondary btn-sm btn-danger" onclick="adminSetSub('${u.id}',null)">Снять подписку</button>`:`<button class="btn-secondary btn-sm" onclick="adminSetSub('${u.id}','lite')">Lite</button><button class="btn-secondary btn-sm" onclick="adminSetSub('${u.id}','pro')">Pro</button><button class="btn-secondary btn-sm" onclick="adminSetSub('${u.id}','ultra')">Ultra</button>`}
        <button class="btn-secondary btn-sm btn-danger" onclick="adminReset('${u.id}')">Обнулить</button>
        <button class="btn-secondary btn-sm btn-danger" onclick="adminDeleteUser('${u.id}','${esc(u.email)}')">Удалить</button>
      </div>
    </div>
  `).join('');
}

async function adminAddTok(uid,amt){await sb.rpc('add_tokens',{_user_id:uid,_amount:amt,_type:'bonus',_description:'Админ +'+amt});await fetchUsers();renderTab();showToast('+'+amt+' токенов начислено','success')}
async function adminSetSub(uid,sub){await sb.from('profiles').update({subscription:sub}).eq('id',uid);await fetchUsers();renderTab();showToast(sub?'Подписка '+sub+' установлена':'Подписка снята','success')}
async function adminReset(uid){await sb.from('profiles').update({tokens_balance:0}).eq('id',uid);await fetchUsers();renderTab();showToast('Баланс обнулён','success')}
async function adminDeleteUser(uid,email){
  if(!uid)return;
  const ok=confirm(`Удалить пользователя полностью?\n\nEmail: ${email||uid}\n\nЭто удалит аккаунт, профиль, роли, сессии, транзакции и заказы. Email освободится для повторной регистрации.`);
  if(!ok)return;
  try{
    const res=await fetch('/api/admin/user_delete.php',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({user_id:uid})
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok){
      const msg=(data&&(data.error||data.message||data.detail))||('HTTP '+res.status);
      throw new Error(msg);
    }
    await fetchUsers();
    renderTab();
    showToast('Пользователь удалён','success');
  }catch(e){
    showToast('Ошибка удаления: '+(e.message||e),'error');
  }
}

async function renderTransactions(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка...</p>';
  const{data}=await sb.from('token_transactions').select('*,profiles:user_id(email)').order('created_at',{ascending:false}).limit(200);
  let txs=data||[];
  const mode = (window.__txMode||'all');
  if (mode === 'topup') txs = txs.filter(t => t.amount > 0 && (t.type === 'purchase' || t.type === 'bonus'));
  if (mode === 'purchases') txs = txs.filter(t => t.type === 'purchase' || t.type === 'subscription');
  const spent=txs.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0);
  const added=txs.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  m.innerHTML=`<div class="space-y-4">
    <h1 style="font-size:1.5rem;font-weight:700">Транзакции</h1>
    <div class="flex flex-wrap gap-2">
      <button class="btn-secondary btn-sm" onclick="window.open('/api/admin/transactions_export.php?limit=50000','_blank')">CSV</button>
    </div>
    <div class="flex flex-wrap gap-2">
      <button class="btn-secondary btn-sm" onclick="window.__txMode='all';renderTransactions(document.getElementById('adminMain'))" style="${mode==='all'?'border-color:rgba(124,58,237,0.5);color:var(--primary)':''}">Все</button>
      <button class="btn-secondary btn-sm" onclick="window.__txMode='purchases';renderTransactions(document.getElementById('adminMain'))" style="${mode==='purchases'?'border-color:rgba(124,58,237,0.5);color:var(--primary)':''}">Покупки (пакеты/подписки)</button>
      <button class="btn-secondary btn-sm" onclick="window.__txMode='topup';renderTransactions(document.getElementById('adminMain'))" style="${mode==='topup'?'border-color:rgba(124,58,237,0.5);color:var(--primary)':''}">Пополнения (только +)</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div class="card" style="padding:1rem"><p class="text-xs text-muted">Начислено</p><p class="font-mono font-bold text-green" style="font-size:1.125rem">+${added.toLocaleString()}</p></div>
      <div class="card" style="padding:1rem"><p class="text-xs text-muted">Потрачено</p><p class="font-mono font-bold text-pink" style="font-size:1.125rem">${spent.toLocaleString()}</p></div>
    </div>
    <div class="space-y-1" style="max-height:500px;overflow-y:auto">${txs.map(t=>`<div class="card flex items-center justify-between text-sm" style="padding:0.75rem 1rem"><div style="min-width:0;flex:1"><p class="truncate font-bold">${esc(t.profiles?.email||t.user_id.slice(0,8))}</p><p class="text-xs text-muted truncate">${esc(t.description||'')}</p><p style="font-size:0.625rem;color:var(--muted)">${new Date(t.created_at).toLocaleString('ru-RU')} · ${t.type}</p></div><span class="font-mono font-bold shrink-0" style="margin-left:0.75rem;color:${t.amount>0?'var(--neon-green)':'var(--neon-pink)'}">${t.amount>0?'+':''}${t.amount.toLocaleString()}</span></div>`).join('')}
    ${txs.length===0?'<p class="text-center text-muted" style="padding:2rem">Транзакций нет</p>':''}
    </div>
  </div>`;
}

async function renderPayments(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка платежей...</p>';
  let data=null;
  try{
    const r=await fetch('/api/admin/orders_list.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({limit:200})});
    data=await r.json();
    if(!r.ok) throw new Error(data?.error||('HTTP '+r.status));
  }catch(e){
    m.innerHTML=`<div class="card" style="padding:1rem;border-left:4px solid rgba(236,72,153,0.5)"><p class="text-sm font-bold">Ошибка загрузки платежей</p><p class="text-xs text-muted">${esc(e.message||String(e))}</p></div>`;
    return;
  }
  const orders = data?.orders || [];
  const paid = orders.filter(o=>o.status===1).length;
  const pending = orders.filter(o=>o.status!==1).length;

  function providerLabel(p){
    if(p==='yookassa')return 'YooKassa';
    return 'FreeKassa';
  }
  function statusBadge(o){
    return o.status===1
      ? `<span style="padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;background:rgba(34,197,94,0.12);color:var(--neon-green)">PAID</span>`
      : `<span style="padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;background:rgba(236,72,153,0.12);color:var(--neon-pink)">PENDING</span>`;
  }
  async function reconcile(id){
    const ok=confirm('Проверить оплату и применить заказ #' + id + '?');
    if(!ok)return;
    try{
      const r=await fetch('/api/admin/order_reconcile.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({order_id:id})});
      const j=await r.json().catch(()=>null);
      if(!r.ok) throw new Error((j&&(j.error||j.detail))||('HTTP '+r.status));
      if(j.ok && j.paid) showToast('Заказ применен','success'); else showToast('Оплата не подтверждена','error');
      renderPayments(document.getElementById('adminMain'));
      fetchUsers().then(()=>{}); // refresh stats silently
    }catch(e){
      showToast('Ошибка проверки: '+(e.message||e),'error');
    }
  }
  window.__reconcileOrder = reconcile;

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">Платежи</h1>
      <div class="flex items-center gap-2">
        <button class="btn-secondary btn-sm" onclick="window.open('/api/admin/orders_export.php?limit=20000','_blank')">CSV</button>
        <button class="btn-secondary btn-sm" onclick="renderPayments(document.getElementById('adminMain'))">Обновить</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div class="card" style="padding:1rem"><p class="text-xs text-muted">Оплачено</p><p class="font-mono font-bold text-green" style="font-size:1.125rem">${paid}</p></div>
      <div class="card" style="padding:1rem"><p class="text-xs text-muted">Ожидают</p><p class="font-mono font-bold text-pink" style="font-size:1.125rem">${pending}</p></div>
    </div>
    <div class="space-y-2" style="max-height:520px;overflow-y:auto">
      ${orders.map(o=>`
        <div class="card" style="padding:0.75rem 1rem">
          <div class="flex items-center justify-between" style="gap:0.75rem">
            <div style="min-width:0;flex:1">
              <div class="flex items-center gap-2" style="flex-wrap:wrap">
                <span class="font-mono text-xs text-muted">#${o.id}</span>
                ${statusBadge(o)}
                <span style="font-size:0.75rem;color:var(--muted)">${providerLabel(o.provider)}</span>
              </div>
              <p class="text-sm font-bold truncate" style="margin:0.25rem 0 0.15rem">${esc((o.profiles&&o.profiles.email)||o.email||o.user_id)}</p>
              <p class="text-xs text-muted" style="margin:0">${esc(o.product_id)} · ${Number(o.amount||0).toFixed(2)} ${esc(o.currency||'RUB')}</p>
              <p class="text-xs text-muted" style="margin:0.15rem 0 0">Создан: ${new Date(o.created_at).toLocaleString('ru-RU')}${o.paid_at?` · Оплачен: ${new Date(o.paid_at).toLocaleString('ru-RU')}`:''}</p>
            </div>
            <div class="flex items-center gap-2" style="flex-shrink:0">
              ${o.status===1?'':
                `<button class="btn-secondary btn-sm" onclick="__reconcileOrder(${o.id})">Проверить</button>`
              }
            </div>
          </div>
        </div>
      `).join('')}
      ${orders.length===0?'<p class="text-center text-muted" style="padding:2rem">Платежей нет</p>':''}
    </div>
    <div class="card" style="padding:1rem;border-left:4px solid rgba(34,211,238,0.35)">
      <p class="text-xs text-muted" style="margin:0">
        Если деньги списались, но токены/подписка не применились, откройте заказ со статусом PENDING и нажмите "Проверить".
      </p>
    </div>
  </div>`;
}

async function renderSubscribers(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка подписчиков...</p>';
  let j=null;
  try{
    const r=await fetch('/api/admin/subscribers_list.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({limit:500})});
    j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
  }catch(e){
    m.innerHTML=`<div class="card" style="padding:1rem;border-left:4px solid rgba(236,72,153,0.5)"><p class="text-sm font-bold">Ошибка</p><p class="text-xs text-muted">${esc(e.message||String(e))}</p></div>`;
    return;
  }
  const subs=j.subscribers||[];

  async function act(uid,action,extra){
    try{
      const r=await fetch('/api/admin/subscription_update.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({user_id:uid,action,...(extra||{})})});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.error||('HTTP '+r.status));
      showToast('Готово','success');
      renderSubscribers(document.getElementById('adminMain'));
      fetchUsers().then(()=>{});
    }catch(e){
      showToast('Ошибка: '+(e.message||e),'error');
    }
  }
  window.__subAct=act;

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">Подписки</h1>
      <button class="btn-secondary btn-sm" onclick="renderSubscribers(document.getElementById('adminMain'))">Обновить</button>
    </div>
    <div class="card" style="padding:1rem;border-left:4px solid rgba(124,58,237,0.35)">
      <p class="text-xs text-muted" style="margin:0">Здесь можно вручную: поставить план, продлить, поставить на паузу или снять подписку. Все действия пишутся в историю.</p>
    </div>
    <div class="space-y-2" style="max-height:560px;overflow:auto">
      ${subs.map(s=>`
        <div class="card" style="padding:0.75rem 1rem">
          <div class="flex items-center justify-between" style="gap:0.75rem">
            <div style="min-width:0;flex:1">
              <p class="text-sm font-bold truncate">${esc(s.email||s.id)}</p>
              <p class="text-xs text-muted" style="margin-top:0.15rem">
                План: <strong style="color:var(--fg)">${esc(s.subscription||'—')}</strong>
                · Статус: <strong style="color:var(--fg)">${esc(s.subscription_status||'—')}</strong>
              </p>
              <p class="text-xs text-muted" style="margin-top:0.15rem">
                Начало: ${s.subscription_started_at?esc(new Date(s.subscription_started_at).toLocaleString('ru-RU')):'—'}
                · До: ${s.subscription_until?esc(new Date(s.subscription_until).toLocaleString('ru-RU')):'—'}
              </p>
              <p class="text-xs text-muted" style="margin-top:0.15rem">
                Входов: ${Number(s.login_count||0)} · Последний вход: ${s.last_login_at?esc(new Date(s.last_login_at).toLocaleString('ru-RU')):'—'}
              </p>
            </div>
            <div class="flex flex-wrap gap-2" style="justify-content:flex-end;max-width:320px">
              <button class="btn-secondary btn-sm" onclick="__subAct('${s.id}','pause')">Пауза</button>
              <button class="btn-secondary btn-sm" onclick="__subAct('${s.id}','resume')">Возобн.</button>
              <button class="btn-secondary btn-sm" onclick="(function(){const d=prompt('Продлить на сколько дней?', '30'); if(!d)return; __subAct('${s.id}','extend_days',{days:Number(d)});})()">+дни</button>
              <button class="btn-secondary btn-sm" onclick="__subAct('${s.id}','set_plan',{plan:'lite'})">Lite</button>
              <button class="btn-secondary btn-sm" onclick="__subAct('${s.id}','set_plan',{plan:'pro'})">Pro</button>
              <button class="btn-secondary btn-sm" onclick="__subAct('${s.id}','set_plan',{plan:'ultra'})">Ultra</button>
              <button class="btn-secondary btn-sm btn-danger" onclick="__subAct('${s.id}','clear')">Снять</button>
            </div>
          </div>
        </div>
      `).join('')}
      ${subs.length===0?'<p class="text-center text-muted" style="padding:2rem">Подписчиков нет</p>':''}
    </div>
  </div>`;
}

async function renderFraud(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка...</p>';
  let j=null;
  try{
    const r=await fetch('/api/admin/fraud_report.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:'{}'});
    j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
  }catch(e){
    m.innerHTML=`<div class="card" style="padding:1rem;border-left:4px solid rgba(236,72,153,0.5)"><p class="text-sm font-bold">Ошибка</p><p class="text-xs text-muted">${esc(e.message||String(e))}</p></div>`;
    return;
  }
  const ips=j.signup_ips||[];
  const oips=j.orders_by_ip||[];
  const banned=j.banned||[];

  async function ban(uid){
    const reason=prompt('Причина бана (необязательно):','');
    try{
      const r=await fetch('/api/admin/ban_user.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({user_id:uid,reason:reason||''})});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.error||('HTTP '+r.status));
      showToast('Пользователь забанен','success');
      renderFraud(document.getElementById('adminMain'));
    }catch(e){showToast('Ошибка: '+(e.message||e),'error')}
  }
  async function unban(uid){
    try{
      const r=await fetch('/api/admin/unban_user.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({user_id:uid})});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.error||('HTTP '+r.status));
      showToast('Разбанено','success');
      renderFraud(document.getElementById('adminMain'));
    }catch(e){showToast('Ошибка: '+(e.message||e),'error')}
  }
  window.__banUser=ban; window.__unbanUser=unban;

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">Безопасность</h1>
      <button class="btn-secondary btn-sm" onclick="renderFraud(document.getElementById('adminMain'))">Обновить</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div class="card" style="padding:1rem">
        <p class="text-sm font-bold" style="margin-bottom:0.5rem">Много регистраций с IP</p>
        <div style="max-height:260px;overflow:auto" class="space-y-1">
          ${ips.map(x=>`<div class="flex items-center justify-between text-sm" style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)"><span class="font-mono text-xs">${esc(x.ip||'')}</span><span class="text-xs text-muted">${Number(x.signups||0)} regs · ${Number(x.logged_in||0)} login</span></div>`).join('')||'<p class="text-xs text-muted">Нет данных</p>'}
        </div>
      </div>
      <div class="card" style="padding:1rem">
        <p class="text-sm font-bold" style="margin-bottom:0.5rem">Много оплат с IP</p>
        <div style="max-height:260px;overflow:auto" class="space-y-1">
          ${oips.map(x=>`<div class="flex items-center justify-between text-sm" style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)"><span class="font-mono text-xs">${esc(x.ip||'')}</span><span class="text-xs text-muted">${Number(x.orders||0)} orders · ${Number(x.paid||0)} paid</span></div>`).join('')||'<p class="text-xs text-muted">Нет данных</p>'}
        </div>
      </div>
    </div>
    <div class="card" style="padding:1rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">Забаненные</p>
      <div style="max-height:320px;overflow:auto" class="space-y-1">
        ${banned.map(u=>`
          <div class="card" style="padding:0.75rem 1rem">
            <div class="flex items-center justify-between" style="gap:0.75rem">
              <div style="min-width:0;flex:1">
                <p class="text-sm font-bold truncate">${esc(u.email||u.id)}</p>
                <p class="text-xs text-muted">Причина: ${esc(u.ban_reason||'—')} · IP: <span class="font-mono">${esc(u.signup_ip||'')}</span></p>
                <p class="text-xs text-muted">Забанен: ${u.banned_at?esc(new Date(u.banned_at).toLocaleString('ru-RU')):'—'}</p>
              </div>
              <div class="flex items-center gap-2" style="flex-shrink:0">
                <button class="btn-secondary btn-sm" onclick="__unbanUser('${u.id}')">Разбан</button>
              </div>
            </div>
          </div>
        `).join('')||'<p class="text-xs text-muted">Никого нет</p>'}
      </div>
    </div>
  </div>`;
}

async function renderCRM(m){
  const segs=[
    {id:'never_paid',label:'Не платили'},
    {id:'paid_any',label:'Платили (любая оплата)'},
    {id:'paid_tokens',label:'Покупали токены'},
    {id:'subscribers_active',label:'Подписчики активные'},
    {id:'subscribers_paused',label:'Подписчики пауза'},
    {id:'inactive_7',label:'Не заходили 7 дней'},
    {id:'inactive_14',label:'Не заходили 14 дней'},
    {id:'inactive_30',label:'Не заходили 30 дней'},
  ];
  window.__crmSeg = window.__crmSeg || 'never_paid';
  m.innerHTML='<p class="text-muted text-center">Загрузка CRM...</p>';

  let templates=[];
  try{
    const r=await fetch('/api/admin/templates_list.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:'{}'});
    const j=await r.json().catch(()=>null);
    if(r.ok) templates=j.templates||[];
  }catch(e){ /* ignore */ }
  window.__crmTemplates = templates;

  async function previewSegment(seg){
    const r=await fetch('/api/admin/segments_preview.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({segment:seg,limit:20})});
    const j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }
  async function sendSegment(seg,subject,html){
    const r=await fetch('/api/admin/send_broadcast.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({segment:seg,subject,html})});
    const j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }
  window.__crmPreview=previewSegment;
  window.__crmSend=sendSegment;

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">CRM</h1>
      <button class="btn-secondary btn-sm" onclick="renderCRM(document.getElementById('adminMain'))">Обновить</button>
    </div>
    <div class="card" style="padding:1rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">Сегмент</p>
      <select class="input" onchange="window.__crmSeg=this.value">
        ${segs.map(s=>`<option value="${s.id}" ${s.id===window.__crmSeg?'selected':''}>${esc(s.label)}</option>`).join('')}
      </select>
      <div class="flex flex-wrap gap-2" style="margin-top:0.75rem">
        <button class="btn-secondary btn-sm" onclick="(async()=>{try{const j=await __crmPreview(window.__crmSeg);document.getElementById('crmPreview').innerHTML='<p class=\\'text-xs text-muted\\'>Найдено: <b style=\\'color:var(--fg)\\'>'+j.count+'</b></p><div class=\\'space-y-1\\' style=\\'max-height:120px;overflow:auto\\'>'+j.emails.map(e=>'<div class=\\'text-xs font-mono\\'>'+esc(e)+'</div>').join('')+'</div>'; }catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">Предпросмотр</button>
        <button class="btn-secondary btn-sm" onclick="(async()=>{const subject=(document.getElementById('crmSubject').value||'').trim();const html=(document.getElementById('crmHtml').value||'').trim();if(!subject||!html){showToast('Заполни тему и HTML','error');return;} if(!confirm('Отправить письма в сегмент: '+window.__crmSeg+' ?'))return; try{const r=await __crmSend(window.__crmSeg,subject,html); showToast('Отправлено: '+r.sent+' из '+r.total,(r.sent>0)?'success':'error'); if(r.errors&&r.errors.length)document.getElementById('crmErrors').textContent=r.errors.join('\\n'); else document.getElementById('crmErrors').textContent='';}catch(e){showToast('Ошибка: '+(e.message||e),'error');}})()">Отправить</button>
      </div>
      <div id="crmPreview" style="margin-top:0.75rem"></div>
      <pre id="crmErrors" style="white-space:pre-wrap;color:rgba(236,72,153,0.95);font-size:12px;margin-top:0.75rem"></pre>
    </div>
    <div class="card" style="padding:1rem">
      <p class="text-sm font-bold" style="margin-bottom:0.5rem">Шаблон письма</p>
      <div class="flex flex-wrap gap-2" style="margin-bottom:0.75rem">
        <select class="input" id="crmTplSel" style="flex:1;min-width:220px" onchange="(function(){const n=this.value; const t=(window.__crmTemplates||[]).find(x=>x.name===n); if(t){document.getElementById('crmSubject').value=t.subject; fetch('/api/admin/templates_get.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({name:n})}).then(r=>r.json()).then(j=>{if(j&&j.template){document.getElementById('crmHtml').value=j.template.html||'';}}).catch(()=>{});} })()">
          <option value="">(не выбран)</option>
          ${templates.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('')}
        </select>
        <button class="btn-secondary btn-sm" onclick="adminTab='templates';renderNav();renderTab()" style="display:none">Шаблоны</button>
      </div>
      <input class="input" id="crmSubject" placeholder="Тема письма">
      <textarea class="input" id="crmHtml" placeholder="HTML тела письма" style="margin-top:0.75rem;min-height:180px"></textarea>
      <div class="flex flex-wrap gap-2" style="margin-top:0.75rem">
        <button class="btn-secondary btn-sm" onclick="(function(){const name=prompt('Имя шаблона (уникально):','promo_'+Date.now()); if(!name)return; const subject=(document.getElementById('crmSubject').value||'').trim(); const html=(document.getElementById('crmHtml').value||'').trim(); if(!subject||!html){showToast('Заполни тему и HTML','error');return;} fetch('/api/admin/templates_upsert.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({name,subject,html})}).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>{if(!ok)throw new Error(j?.error||'HTTP'); showToast('Шаблон сохранен','success'); renderCRM(document.getElementById('adminMain'));}).catch(e=>showToast('Ошибка: '+(e.message||e),'error'));})()">Сохранить как шаблон</button>
      </div>
    </div>
  </div>`;
}

async function renderSupport(m){
  window.__tkStatus = window.__tkStatus || 'open';
  m.innerHTML='<p class="text-muted text-center">Загрузка тикетов...</p>';
  let j=null;
  try{
    const r=await fetch('/api/admin/tickets_list.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({status:window.__tkStatus,limit:200})});
    j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
  }catch(e){
    m.innerHTML=`<div class="card" style="padding:1rem;border-left:4px solid rgba(236,72,153,0.5)"><p class="text-sm font-bold">Ошибка</p><p class="text-xs text-muted">${esc(e.message||String(e))}</p></div>`;
    return;
  }
  const tickets=j.tickets||[];

  async function openTicket(id){
    const r=await fetch('/api/admin/ticket_messages.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({ticket_id:id})});
    const j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }
  async function replyTicket(id,msg,status){
    const r=await fetch('/api/admin/ticket_reply.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({ticket_id:id,message:msg,status:status||''})});
    const j=await r.json().catch(()=>null);
    if(!r.ok) throw new Error(j?.error||('HTTP '+r.status));
    return j;
  }
  window.__openTicket=openTicket;
  window.__replyTicket=replyTicket;

  m.innerHTML=`<div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 style="font-size:1.5rem;font-weight:700">Поддержка</h1>
      <div class="flex items-center gap-2">
        <select class="input" style="max-width:160px" onchange="window.__tkStatus=this.value;renderSupport(document.getElementById('adminMain'))">
          ${['open','pending','closed',''].map(s=>`<option value="${s}" ${(s||'')===(window.__tkStatus||'')?'selected':''}>${s===''?'Все':s}</option>`).join('')}
        </select>
        <button class="btn-secondary btn-sm" onclick="renderSupport(document.getElementById('adminMain'))">Обновить</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:0.75rem">
      <div class="card" style="padding:1rem;max-height:560px;overflow:auto">
        ${tickets.map(t=>`
          <button class="btn-secondary" style="width:100%;text-align:left;margin-bottom:0.5rem" onclick="(async()=>{try{const j=await __openTicket('${t.id}'); window.__curTicket=j; document.getElementById('tkView').innerHTML=renderTicketView(j);}catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">
            <div class="flex items-center justify-between" style="gap:0.5rem">
              <span class="text-xs font-mono text-muted">#${esc(t.id.slice(0,8))}</span>
              <span class="text-xs text-muted">${esc(t.status)}</span>
            </div>
            <div class="text-sm font-bold truncate" style="margin-top:0.15rem">${esc(t.subject||'')}</div>
            <div class="text-xs text-muted truncate">${esc(t.email||'')}</div>
            <div class="text-xs text-muted truncate">${esc(t.last_author||'')} · ${esc(t.last_message||'')}</div>
          </button>
        `).join('')||'<p class="text-xs text-muted">Тикетов нет</p>'}
      </div>
      <div class="card" style="padding:1rem;max-height:560px;overflow:auto" id="tkView">
        <p class="text-xs text-muted">Выберите тикет слева</p>
      </div>
    </div>
  </div>`;
}

function renderTicketView(j){
  const t=j.ticket||{};
  const tid=String(t.id||'');
  const msgs=j.messages||[];
  const thread=msgs.map(m=>`
    <div style="padding:0.5rem 0;border-bottom:1px solid rgba(42,41,53,0.2)">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold">${m.author==='admin'?'Админ':'Пользователь'}</span>
        <span class="text-xs text-muted">${new Date(m.created_at).toLocaleString('ru-RU')}</span>
      </div>
      <div class="text-sm" style="white-space:pre-wrap;margin-top:0.25rem">${esc(m.message||'')}</div>
    </div>
  `).join('');

  return `
    <div class="space-y-3">
      <div>
        <p class="text-sm font-bold">${esc(t.subject||'')}</p>
        <p class="text-xs text-muted">${esc(t.email||'')} · статус: ${esc(t.status||'')}</p>
      </div>
      <div>${thread||''}</div>
      <textarea class="input" id="tkReply" placeholder="Ответ..." style="min-height:120px"></textarea>
      <div class="flex flex-wrap gap-2">
        <button class="btn-secondary btn-sm" onclick="(async()=>{const msg=(document.getElementById('tkReply').value||'').trim(); if(!msg){showToast('Введите ответ','error');return;} try{await __replyTicket('${tid}',msg,'pending'); showToast('Отправлено','success'); const jj=await __openTicket('${tid}'); document.getElementById('tkView').innerHTML=renderTicketView(jj); }catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">Ответить</button>
        <button class="btn-secondary btn-sm" onclick="(async()=>{const msg=(document.getElementById('tkReply').value||'').trim(); if(!msg){showToast('Введите ответ','error');return;} try{await __replyTicket('${tid}',msg,'closed'); showToast('Закрыто','success'); renderSupport(document.getElementById('adminMain')); }catch(e){showToast('Ошибка: '+(e.message||e),'error')}})()">Ответить и закрыть</button>
      </div>
    </div>
  `;
}

// Settings
const settingGroups=[
  {title:'Бонусы',fields:[{key:'daily_bonus_amount',label:'Ежедневный бонус',type:'number',suffix:'токенов',def:10},{key:'referral_bonus_amount',label:'Реферальный бонус',type:'number',suffix:'токенов',def:3000},{key:'registration_bonus',label:'Бонус за регистрацию',type:'number',suffix:'токенов',def:100}]},
  {title:'Стоимость генерации',fields:[{key:'chat_token_cost',label:'Чат-сообщение',type:'number',suffix:'токенов',def:1},{key:'image_token_cost',label:'Картинка',type:'number',suffix:'токенов',def:5},{key:'video_token_cost',label:'Видео',type:'number',suffix:'токенов',def:20}]},
  {title:'Подписки',fields:[{key:'sub_lite_price',label:'Lite',type:'number',suffix:'₽/мес',def:299},{key:'sub_pro_price',label:'Pro',type:'number',suffix:'₽/мес',def:599},{key:'sub_ultra_price',label:'Ultra',type:'number',suffix:'₽/мес',def:999}]},
  {title:'Пакеты токенов',fields:[{key:'pack_small_tokens',label:'Пакет S — токены',type:'number',suffix:'токенов',def:5000},{key:'pack_small_price',label:'Пакет S — цена',type:'number',suffix:'₽',def:99},{key:'pack_medium_tokens',label:'Пакет M — токены',type:'number',suffix:'токенов',def:20000},{key:'pack_medium_price',label:'Пакет M — цена',type:'number',suffix:'₽',def:299},{key:'pack_large_tokens',label:'Пакет L — токены',type:'number',suffix:'токенов',def:50000},{key:'pack_large_price',label:'Пакет L — цена',type:'number',suffix:'₽',def:699}]},
  {title:'Режимы',fields:[{key:'maintenance_mode',label:'Режим обслуживания',type:'boolean',def:false},{key:'demo_mode',label:'Демо-режим',type:'boolean',def:true}]}
];
const allFields=settingGroups.flatMap(g=>g.fields);
let settingsData={};

async function renderSettings(m){
  m.innerHTML='<p class="text-muted text-center">Загрузка настроек...</p>';
  allFields.forEach(f=>settingsData[f.key]=f.def);
  const{data}=await sb.from('site_settings').select('key,value').limit(50);
  if(data)data.forEach(r=>{const f=allFields.find(f=>f.key===r.key);if(f){settingsData[r.key]=f.type==='boolean'?r.value==='true':Number(r.value)||0}});
  m.innerHTML=`<div class="space-y-6">
    <div class="flex items-center justify-between"><h1 style="font-size:1.5rem;font-weight:700">Настройки</h1><button class="btn-primary btn-sm" id="saveSettingsBtn" onclick="saveSettings()">Сохранить</button></div>
    ${settingGroups.map(g=>`<div class="setting-group"><h3>${g.title}</h3>${g.fields.map(f=>`
      <div class="card setting-row">
        <div class="setting-label"><p>${f.label}</p></div>
        ${f.type==='boolean'?`<button class="toggle ${settingsData[f.key]?'on':'off'}" onclick="settingsData['${f.key}']=!settingsData['${f.key}'];this.className='toggle '+(settingsData['${f.key}']?'on':'off')"><div class="toggle-knob"></div></button>`
        :`<div class="flex items-center gap-2 shrink-0"><input type="number" class="input setting-input" value="${settingsData[f.key]}" onchange="settingsData['${f.key}']=Number(this.value)">${f.suffix?`<span class="setting-suffix">${f.suffix}</span>`:''}</div>`}
      </div>`).join('')}</div>`).join('')}
  </div>`;
}

async function saveSettings(){
  const btn=document.getElementById('saveSettingsBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span>';
  for(const f of allFields){await sb.from('site_settings').upsert({key:f.key,value:String(settingsData[f.key])},{onConflict:'key'})}
  showToast('Настройки сохранены','success');
  btn.disabled=false;btn.textContent='Сохранить';
}
function renderBroadcast(m){
  m.innerHTML=`<div class="space-y-6">
    <h1 style="font-size:1.5rem;font-weight:700">Рассылка</h1>
    <div><p class="text-sm font-bold text-muted" style="margin-bottom:0.5rem">Получатели</p><div class="flex flex-wrap gap-2">
      <button class="btn-secondary btn-sm" id="fAll" onclick="setBcFilter('all')" style="border-color:rgba(124,58,237,0.5);color:var(--primary)">Все</button>
      <button class="btn-secondary btn-sm" id="fSub" onclick="setBcFilter('with_subscription')">С подпиской</button>
      <button class="btn-secondary btn-sm" id="fNoSub" onclick="setBcFilter('without_subscription')">Без подписки</button>
    </div></div>
    <div><label class="text-sm text-muted" style="margin-bottom:0.25rem;display:block">Тема письма</label><input class="input" id="bcSubject" placeholder="Тема..."></div>
    <div><label class="text-sm text-muted" style="margin-bottom:0.25rem;display:block">HTML тело письма</label><textarea class="input font-mono" id="bcHtml" rows="10" placeholder="<div>Ваше письмо...</div>" style="font-size:0.75rem"></textarea></div>
    <button class="btn-primary" id="bcSendBtn" onclick="sendBroadcast()">Отправить рассылку</button>
    <div id="bcResult"></div>
  </div>`;
}

let bcFilter='all';
function setBcFilter(f){
  bcFilter=f;
  const map={all:'All',with_subscription:'Sub',without_subscription:'NoSub'};
  ['fAll','fSub','fNoSub'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const active = el.id === ('f'+map[f]);
    el.style.borderColor = active ? 'rgba(124,58,237,0.5)' : '';
    el.style.color = active ? 'var(--primary)' : '';
  });
}

async function sendBroadcast(){
  const subject=document.getElementById('bcSubject').value.trim();
  const html=document.getElementById('bcHtml').value.trim();
  if(!subject||!html){showToast('Заполните тему и HTML','error');return}
  const btn=document.getElementById('bcSendBtn');btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Отправка...';
  try{
    const{data,error}=await sb.functions.invoke('send-broadcast',{body:{subject,html,filter:bcFilter}});
    if(error)throw new Error(error.message||'Broadcast error');
    const sent = Number(data?.sent||0);
    const total = Number(data?.total||0);
    const errs = Array.isArray(data?.errors) ? data.errors : [];
    const ok = !!data?.success && sent > 0;
    const msg = data?.message ? String(data.message) : '';

    document.getElementById('bcResult').innerHTML = `
      <div class="card" style="padding:1rem;border-left:4px solid ${ok?'rgba(34,197,94,0.5)':'rgba(236,72,153,0.5)'}">
        <p class="text-sm">${ok?'Успешно':'Ошибка'} · Отправлено: <strong>${sent}</strong> из <strong>${total}</strong></p>
        ${msg?`<p class="text-xs text-muted" style="margin-top:0.5rem">${esc(msg)}</p>`:''}
        ${errs.length?`
          <details style="margin-top:0.75rem">
            <summary class="text-xs" style="cursor:pointer;color:var(--muted)">Показать ошибки (${errs.length})</summary>
            <div class="card" style="margin-top:0.5rem;padding:0.75rem;background:rgba(37,36,48,0.5)">
              <pre class="font-mono" style="white-space:pre-wrap;font-size:0.7rem;line-height:1.35;margin:0;color:rgba(255,255,255,0.85)">${esc(errs.join('\n\n'))}</pre>
            </div>
          </details>
        `:''}
      </div>
    `;

    showToast(ok ? 'Рассылка отправлена!' : 'Рассылка не отправлена (см. ошибки)', ok ? 'success' : 'error');
  }catch(e){showToast('Ошибка: '+(e.message||e),'error')}
  btn.disabled=false;btn.textContent='Отправить рассылку';
}
