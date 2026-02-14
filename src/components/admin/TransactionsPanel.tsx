import { useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  profiles?: { email: string } | null;
}

const TransactionsPanel = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("token_transactions")
      .select("*, profiles:user_id(email)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const types = [...new Set(transactions.map((t) => t.type))];

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      (t.profiles as any)?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalSpent = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const totalAdded = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Транзакции</h1>
        <button onClick={fetchTransactions} className="border border-border/50 rounded-md px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Обновить
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-4 h-4 text-neon-green" />
            <span className="text-xs text-muted-foreground">Начислено</span>
          </div>
          <p className="font-mono font-bold text-lg text-neon-green">+{totalAdded.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-4 h-4 text-neon-pink" />
            <span className="text-xs text-muted-foreground">Потрачено</span>
          </div>
          <p className="font-mono font-bold text-lg text-neon-pink">{totalSpent.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email или описанию..."
            className="w-full pl-10 bg-secondary/50 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-secondary/50 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
        >
          <option value="all">Все типы</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
        {filtered.map((t) => (
          <div key={t.id} className="glass rounded-lg px-4 py-3 flex items-center justify-between text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{(t.profiles as any)?.email ?? t.user_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(t.created_at).toLocaleString("ru-RU")} · {t.type}
              </p>
            </div>
            <span className={`font-mono font-bold shrink-0 ml-3 ${t.amount > 0 ? "text-neon-green" : "text-neon-pink"}`}>
              {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Транзакций нет</p>
        )}
      </div>
    </div>
  );
};

export default TransactionsPanel;
