// Auth helper functions
async function signUp(email, password) {
  const { error } = await sb.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin }
  });
  if (!error) {
    try {
      await sb.functions.invoke('send-welcome-email', { body: { email, password } });
    } catch (e) { console.error('Failed to send welcome email:', e); }
  }
  return { error: error?.message || null };
}

async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message || null };
}

async function signOut() {
  await sb.auth.signOut();
}

async function getUser() {
  const { data: { session } } = await sb.auth.getSession();
  return session?.user || null;
}

async function getProfile(userId) {
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function checkAdmin(userId) {
  const { data } = await sb.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin');
  return !!(data && data.length > 0);
}

async function claimDailyBonus(userId) {
  const { data } = await sb.rpc('claim_daily_bonus', { _user_id: userId });
  return !!data;
}

async function spendTokens(userId, amount, description) {
  const { data } = await sb.rpc('spend_tokens', { _user_id: userId, _amount: amount, _description: description });
  return !!data;
}

async function addTokens(userId, amount, type, description) {
  await sb.rpc('add_tokens', { _user_id: userId, _amount: amount, _type: type, _description: description });
}

// Auth state listener — redirect based on page
function initAuthRedirect(requireAuth, redirectTo) {
  sb.auth.onAuthStateChange((_event, session) => {
    if (requireAuth && !session) {
      window.location.href = '/';
    }
    if (!requireAuth && session) {
      window.location.href = redirectTo || '/dashboard.html';
    }
  });
}
