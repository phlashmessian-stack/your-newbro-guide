// Supabase-compat client backed by PHP+SQLite API (no external Supabase).
// This file defines `sb` with a minimal subset used by this project:
// - sb.auth.signUp / signInWithPassword / signOut / getSession / onAuthStateChange
// - sb.from(table)...select/eq/order/limit/update/upsert (thenable)
// - sb.rpc(name, args)
// - sb.functions.invoke(name, { body })

const _nbDebug = new URLSearchParams(location.search).has("nb_debug");

function apiFetch(path, body) {
  const t0 = performance.now();
  return fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  }).then(async (r) => {
    let data = null;
    try { data = await r.json(); } catch { /* ignore */ }
    if (_nbDebug) {
      const ms = Math.round(performance.now() - t0);
      // eslint-disable-next-line no-console
      console.log(`[nb] ${r.status} ${path} ${ms}ms`);
    }
    if (!r.ok) {
      const msg = (data && (data.error || data.message)) || ("HTTP " + r.status);
      const err = new Error(msg);
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

// Toast system
const toastContainer = document.createElement("div");
toastContainer.className = "toast-container";
document.body.appendChild(toastContainer);

function showToast(message, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3000);
}

// Generate password
function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Auth state listeners
const _authListeners = new Set();
function _emitAuth(event, session) {
  _authListeners.forEach((cb) => {
    try { cb(event, session); } catch (e) { console.error(e); }
  });
}

async function _getSession() {
  // Deduplicate in-flight session requests (Safari can be sensitive to extra fetches).
  if (_getSession._inflight) return _getSession._inflight;
  _getSession._inflight = apiFetch("/api/auth/session.php").then((res) => {
    // { session: { user: { id, email } } | null }
    return res.session || null;
  }).finally(() => {
    _getSession._inflight = null;
  });
  return _getSession._inflight;
}
_getSession._inflight = null;

function makeQuery(table) {
  const state = {
    table,
    action: "select",
    select: "*",
    filters: [],
    order: null,
    limit: null,
    single: false,
    values: null,
    upsertOnConflict: null,
  };

  function execute() {
    // Translate known table+action combos into concrete endpoints.
    const t = state.table;
    if (state.action === "select") {
      if (t === "profiles") {
        const idEq = state.filters.find((f) => f.col === "id");
        if (idEq) {
          return apiFetch("/api/profiles/get.php", { id: idEq.val }).then((r) => ({ data: state.single ? r.profile : [r.profile], error: null }));
        }
        // admin list
        return apiFetch("/api/admin/users_list.php", {
          order: state.order,
          limit: state.limit,
          select: state.select,
        }).then((r) => ({ data: r.users, error: null }));
      }
      if (t === "user_roles") {
        const userId = state.filters.find((f) => f.col === "user_id")?.val;
        const role = state.filters.find((f) => f.col === "role")?.val;
        return apiFetch("/api/roles/check.php", { user_id: userId, role }).then((r) => ({ data: r.rows, error: null }));
      }
      if (t === "token_transactions") {
        return apiFetch("/api/admin/transactions_list.php", {
          order: state.order,
          limit: state.limit,
          select: state.select,
        }).then((r) => ({ data: r.transactions, error: null }));
      }
      if (t === "site_settings") {
        return apiFetch("/api/admin/site_settings_list.php", { limit: state.limit }).then((r) => ({ data: r.rows, error: null }));
      }
      return Promise.resolve({ data: null, error: { message: "Unsupported table: " + t } });
    }

    if (state.action === "update") {
      if (t === "profiles") {
        const idEq = state.filters.find((f) => f.col === "id")?.val;
        return apiFetch("/api/admin/profile_update.php", { id: idEq, values: state.values }).then(() => ({ data: null, error: null }));
      }
      return Promise.resolve({ data: null, error: { message: "Unsupported update: " + t } });
    }

    if (state.action === "upsert") {
      if (t === "site_settings") {
        return apiFetch("/api/admin/site_settings_upsert.php", { row: state.values }).then(() => ({ data: null, error: null }));
      }
      return Promise.resolve({ data: null, error: { message: "Unsupported upsert: " + t } });
    }

    return Promise.resolve({ data: null, error: { message: "Unsupported action" } });
  }

  const q = {
    select(sel) { state.select = sel || "*"; return q; },
    eq(col, val) { state.filters.push({ col, val }); return q; },
    order(col, opts) { state.order = { col, ascending: !!(opts && opts.ascending) }; return q; },
    limit(n) { state.limit = n; return q; },
    single() { state.single = true; return q; },
    update(values) { state.action = "update"; state.values = values || {}; return q; },
    upsert(values, opts) { state.action = "upsert"; state.values = values || {}; state.upsertOnConflict = opts?.onConflict || null; return q; },
    then(onFulfilled, onRejected) { return execute().then(onFulfilled, onRejected); },
    catch(onRejected) { return execute().catch(onRejected); },
  };
  return q;
}

const sb = {
  auth: {
    async signUp({ email, password }) {
      try {
        const ref = new URLSearchParams(window.location.search).get("ref");
        const sp = new URLSearchParams(window.location.search);
        const utm = {
          utm_source: sp.get("utm_source") || "",
          utm_medium: sp.get("utm_medium") || "",
          utm_campaign: sp.get("utm_campaign") || "",
          utm_content: sp.get("utm_content") || "",
          utm_term: sp.get("utm_term") || "",
        };
        const res = await apiFetch("/api/auth/signup.php", {
          email,
          password,
          ref,
          utm,
          landing_path: (location.pathname || "/") + (location.search || ""),
          referrer: document.referrer || "",
        });
        const session = res.session || null;
        _emitAuth("SIGNED_IN", session);
        return { data: { session }, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    async signInWithPassword({ email, password }) {
      try {
        const res = await apiFetch("/api/auth/signin.php", { email, password });
        const session = res.session || null;
        _emitAuth("SIGNED_IN", session);
        return { data: { session }, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    async signOut() {
      try {
        await apiFetch("/api/auth/signout.php");
      } finally {
        _emitAuth("SIGNED_OUT", null);
      }
      return { error: null };
    },
    async getSession() {
      const session = await _getSession();
      return { data: { session } };
    },
    onAuthStateChange(cb) {
      _authListeners.add(cb);
      // Fire initial session async (best-effort).
      _getSession().then((s) => cb("INITIAL_SESSION", s)).catch(() => cb("INITIAL_SESSION", null));
      return { data: { subscription: { unsubscribe: () => _authListeners.delete(cb) } } };
    },
  },
  from(table) {
    return makeQuery(table);
  },
  async rpc(name, args) {
    try {
      if (name === "claim_daily_bonus") {
        const res = await apiFetch("/api/tokens/claim_daily_bonus.php", { user_id: args?._user_id });
        return { data: res.ok, error: null };
      }
      if (name === "spend_tokens") {
        const res = await apiFetch("/api/tokens/spend.php", {
          user_id: args?._user_id,
          amount: args?._amount,
          description: args?._description,
        });
        return { data: res.ok, error: null };
      }
      if (name === "add_tokens") {
        const res = await apiFetch("/api/admin/add_tokens.php", {
          user_id: args?._user_id,
          amount: args?._amount,
          type: args?._type,
          description: args?._description,
        });
        return { data: res.ok ?? true, error: null };
      }
      return { data: null, error: { message: "Unsupported rpc: " + name } };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  },
  functions: {
    async invoke(name, { body } = {}) {
      // Optional features. Keep non-fatal for now.
      if (name === "send-welcome-email") {
        try {
          const res = await apiFetch("/api/mail/send_welcome.php", body || {});
          return { data: res, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
      if (name === "send-broadcast") {
        try {
          const res = await apiFetch("/api/admin/send_broadcast.php", body || {});
          return { data: res, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
      return { data: null, error: { message: "Function not available: " + name } };
    },
  },
};
