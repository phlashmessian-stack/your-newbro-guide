import { useState, useEffect } from "react";
import { Bot, LayoutDashboard, Users, CreditCard, Settings, ArrowLeft, RefreshCw, Search, UserCheck, Coins, Mail, BarChart3, Trash2, Ban, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import BroadcastPanel from "@/components/admin/BroadcastPanel";
import TransactionsPanel from "@/components/admin/TransactionsPanel";
import SystemSettingsPanel from "@/components/admin/SystemSettingsPanel";

type AdminTab = "overview" | "users" | "transactions" | "broadcast" | "settings";

interface UserRow {
  id: string;
  email: string;
  tokens_balance: number;
  subscription: string | null;
  referral_code: string;
  created_at: string;
}

const sidebarItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "overview", icon: LayoutDashboard, label: "Обзор" },
  { id: "users", icon: Users, label: "Пользователи" },
  { id: "transactions", icon: BarChart3, label: "Транзакции" },
  { id: "broadcast", icon: Mail, label: "Рассылка" },
  { id: "settings", icon: Settings, label: "Настройки" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [tokenInput, setTokenInput] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from("profiles").select("id, email, tokens_balance, subscription, referral_code, created_at").order("created_at", { ascending: false });
    if (data) setUsers(data as UserRow[]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (isAdmin) fetchUsers();
  }, [isAdmin, profileLoading, navigate]);

  const totalTokens = users.reduce((s, u) => s + u.tokens_balance, 0);
  const withSub = users.filter((u) => u.subscription).length;
  const todayCount = users.filter((u) => {
    const d = new Date(u.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const filtered = users.filter(
    (u) => u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminAddTokens = async (userId: string, amount: number) => {
    await supabase.rpc("add_tokens", { _user_id: userId, _amount: amount, _type: "bonus", _description: `Админ начисление +${amount}` });
    await fetchUsers();
    toast({ title: `+${amount} токенов начислено` });
  };

  const adminSetSub = async (userId: string, sub: string | null) => {
    await supabase.from("profiles").update({ subscription: sub }).eq("id", userId);
    await fetchUsers();
    toast({ title: sub ? `Подписка ${sub} установлена` : "Подписка снята" });
  };

  const adminResetTokens = async (userId: string) => {
    await supabase.from("profiles").update({ tokens_balance: 0 }).eq("id", userId);
    await fetchUsers();
    toast({ title: "Баланс обнулён" });
  };

  const adminCustomTokens = async (userId: string) => {
    const val = parseInt(tokenInput[userId] || "0");
    if (!val) return;
    await supabase.rpc("add_tokens", { _user_id: userId, _amount: val, _type: "bonus", _description: `Админ: ${val > 0 ? "+" : ""}${val}` });
    setTokenInput((prev) => ({ ...prev, [userId]: "" }));
    await fetchUsers();
    toast({ title: `${val > 0 ? "+" : ""}${val} токенов` });
  };

  if (profileLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border/30 glass p-4 flex-col shrink-0 hidden md:flex">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">NeuroBro</p>
            <p className="text-xs text-muted-foreground">Админ-панель</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          {sidebarItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </nav>
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground justify-start text-sm py-2 px-2 rounded-md hover:bg-secondary/50 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> Назад
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/30 bg-card/90 backdrop-blur-sm p-2">
        <div className="grid grid-cols-5 gap-1">
          {sidebarItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] ${active ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
        <div className="md:hidden flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Админ-панель</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="text-muted-foreground rounded-md px-2 py-1 hover:bg-secondary/50">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Обзор</h1>
              <button onClick={fetchUsers} className="border border-border/50 rounded-md px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} /> Обновить
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass border-border/30 border rounded-lg p-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-medium text-muted-foreground">Всего</p>
                  <Users className="w-4 h-4 text-neon-purple" />
                </div>
                <p className="text-2xl font-bold font-mono">{users.length}</p>
              </div>
              <div className="glass border-border/30 border rounded-lg p-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-medium text-muted-foreground">Сегодня</p>
                  <CheckCircle className="w-4 h-4 text-neon-green" />
                </div>
                <p className="text-2xl font-bold font-mono">{todayCount}</p>
              </div>
              <div className="glass border-border/30 border rounded-lg p-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-medium text-muted-foreground">С подпиской</p>
                  <UserCheck className="w-4 h-4 text-neon-cyan" />
                </div>
                <p className="text-2xl font-bold font-mono">{withSub}</p>
              </div>
              <div className="glass border-border/30 border rounded-lg p-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-medium text-muted-foreground">Токенов в системе</p>
                  <Coins className="w-4 h-4 text-neon-green" />
                </div>
                <p className="text-2xl font-bold font-mono">{totalTokens.toLocaleString()}</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="glass border-border/30 border rounded-lg p-4">
              <p className="text-base font-semibold mb-3">⚡ Быстрые действия</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveTab("broadcast")} className="text-xs border border-border/50 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Создать рассылку
                </button>
                <button onClick={() => setActiveTab("transactions")} className="text-xs border border-border/50 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" /> Транзакции
                </button>
                <button onClick={() => setActiveTab("settings")} className="text-xs border border-border/50 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Настройки
                </button>
              </div>
            </div>

            {/* Latest users */}
            <div className="glass border-border/30 border rounded-lg">
              <div className="p-4 border-b border-border/20">
                <p className="text-base font-semibold">Последние регистрации</p>
              </div>
              <div className="p-4 space-y-2">
                {users.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm py-2 border-b border-border/20 last:border-0">
                    <div className="min-w-0">
                      <span className="truncate block max-w-[200px]">{u.email}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-muted-foreground text-xs">{u.tokens_balance.toLocaleString()}</span>
                      {u.subscription && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-neon-green/10 text-neon-green">{u.subscription}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Пользователи ({users.length})</h1>
              <button onClick={fetchUsers} className="border border-border/50 rounded-md px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} /> Обновить
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по email или реф. коду..."
                className="w-full pl-10 bg-secondary/50 border border-border/50 rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div className="space-y-2">
              {filtered.map((u) => (
                <div key={u.id} className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate max-w-[250px]">{u.email}</p>
                      <p className="text-xs text-muted-foreground">Реф: {u.referral_code} · {new Date(u.created_at).toLocaleDateString("ru-RU")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm">{u.tokens_balance.toLocaleString()} 💎</p>
                      <p className="text-xs text-muted-foreground">{u.subscription ? `📋 ${u.subscription}` : "Нет подписки"}</p>
                    </div>
                  </div>
                  {/* Quick token add */}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => adminAddTokens(u.id, 100)} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">+100</button>
                    <button onClick={() => adminAddTokens(u.id, 1000)} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">+1K</button>
                    <button onClick={() => adminAddTokens(u.id, 10000)} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">+10K</button>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={tokenInput[u.id] || ""}
                        onChange={(e) => setTokenInput((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        placeholder="±N"
                        className="w-20 text-xs h-8 bg-secondary/50 border border-border/50 rounded-md px-2 font-mono outline-none focus:border-primary/50"
                      />
                      <button onClick={() => adminCustomTokens(u.id)} className="text-xs h-8 border border-primary/30 text-primary rounded-md px-2 hover:bg-primary/10 transition-colors">OK</button>
                    </div>
                  </div>
                  {/* Subscription management */}
                  <div className="flex gap-2 flex-wrap">
                    {u.subscription
                      ? <button onClick={() => adminSetSub(u.id, null)} className="text-xs h-8 border border-destructive/30 text-destructive rounded-md px-3 py-1 hover:bg-destructive/10 transition-colors">Снять подписку</button>
                      : <>
                          <button onClick={() => adminSetSub(u.id, "lite")} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">⭐ Lite</button>
                          <button onClick={() => adminSetSub(u.id, "pro")} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">👑 Pro</button>
                          <button onClick={() => adminSetSub(u.id, "ultra")} className="text-xs h-8 border border-border/50 rounded-md px-3 py-1 hover:bg-secondary/50 transition-colors">💎 Ultra</button>
                        </>
                    }
                    <button onClick={() => adminResetTokens(u.id)} className="text-xs h-8 border border-destructive/30 text-destructive rounded-md px-3 py-1 hover:bg-destructive/10 transition-colors flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Обнулить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "transactions" && <TransactionsPanel />}
        {activeTab === "broadcast" && <BroadcastPanel />}
        {activeTab === "settings" && <SystemSettingsPanel />}
      </main>
    </div>
  );
};

export default Admin;
