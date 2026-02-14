import { useState } from "react";
import { Send, Users, UserCheck, UserX, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type Filter = "all" | "with_subscription" | "without_subscription";

const filterOptions: { id: Filter; label: string; icon: typeof Users }[] = [
  { id: "all", label: "Все пользователи", icon: Users },
  { id: "with_subscription", label: "С подпиской", icon: UserCheck },
  { id: "without_subscription", label: "Без подписки", icon: UserX },
];

const templates = [
  {
    name: "🎉 Новая функция",
    subject: "Новая функция в NeuroBro!",
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px 24px;text-align:center"><h1 style="margin:0;font-size:28px;color:#fff">🤖 NeuroBro</h1></div><div style="padding:32px 24px"><h2 style="margin:0 0 16px;color:#fff">Новая функция! 🎉</h2><p style="color:#a0a0b0;line-height:1.6">Мы добавили [описание функции]. Попробуйте прямо сейчас!</p><a href="https://neurobro.app/dashboard" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:600;margin-top:24px">Попробовать →</a></div></div>`,
  },
  {
    name: "🎁 Бонусные токены",
    subject: "Бонусные токены для вас! 🎁",
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px 24px;text-align:center"><h1 style="margin:0;font-size:28px;color:#fff">🤖 NeuroBro</h1></div><div style="padding:32px 24px"><h2 style="margin:0 0 16px;color:#fff">Подарок от NeuroBro! 🎁</h2><p style="color:#a0a0b0;line-height:1.6">Мы начислили вам бонусные токены. Зайдите и проверьте баланс!</p><a href="https://neurobro.app/dashboard" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:600;margin-top:24px">Проверить баланс →</a></div></div>`,
  },
  {
    name: "📢 Акция",
    subject: "Специальная акция в NeuroBro! 📢",
    html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px 24px;text-align:center"><h1 style="margin:0;font-size:28px;color:#fff">🤖 NeuroBro</h1></div><div style="padding:32px 24px"><h2 style="margin:0 0 16px;color:#fff">Специальное предложение! 📢</h2><p style="color:#a0a0b0;line-height:1.6">Только сегодня — скидка на подписку! Не упустите шанс.</p><a href="https://neurobro.app/dashboard" style="display:block;text-align:center;background:#7c3aed;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:600;margin-top:24px">Подробнее →</a></div></div>`,
  },
];

const BroadcastPanel = () => {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; total: number } | null>(null);

  const applyTemplate = (t: typeof templates[0]) => {
    setSubject(t.subject);
    setHtml(t.html);
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !html.trim()) {
      toast({ title: "Ошибка", description: "Заполните тему и HTML письма", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: { subject, html, filter },
      });
      if (error) throw error;
      setLastResult({ sent: data.sent, total: data.total });
      toast({ title: `✉️ Отправлено: ${data.sent} из ${data.total}` });
    } catch (e: unknown) {
      toast({ title: "Ошибка рассылки", description: e instanceof Error ? e.message : "Неизвестная ошибка", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📧 Рассылка</h1>

      {/* Templates */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">Шаблоны</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="text-xs border border-border/50 rounded-lg px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">Получатели</p>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-2 transition-colors ${
                filter === opt.id
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 hover:bg-secondary/50"
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Тема письма</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Тема..."
          className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* HTML Body */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">HTML тело письма</label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          placeholder="<div>Ваше письмо...</div>"
          className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors font-mono text-xs resize-y"
        />
      </div>

      {/* Send */}
      <button
        onClick={sendBroadcast}
        disabled={sending}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? "Отправка..." : "Отправить рассылку"}
      </button>

      {lastResult && (
        <div className="glass rounded-xl p-4 text-sm">
          <p>✅ Последняя рассылка: <strong>{lastResult.sent}</strong> из <strong>{lastResult.total}</strong> писем отправлено</p>
        </div>
      )}
    </div>
  );
};

export default BroadcastPanel;
