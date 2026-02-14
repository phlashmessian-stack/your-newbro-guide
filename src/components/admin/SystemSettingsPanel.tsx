import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface SiteSettings {
  daily_bonus_amount: number;
  referral_bonus_amount: number;
  registration_bonus: number;
  chat_token_cost: number;
  image_token_cost: number;
  video_token_cost: number;
  // Subscription prices
  sub_lite_price: number;
  sub_pro_price: number;
  sub_ultra_price: number;
  // Token packages
  pack_small_tokens: number;
  pack_small_price: number;
  pack_medium_tokens: number;
  pack_medium_price: number;
  pack_large_tokens: number;
  pack_large_price: number;
  // Modes
  maintenance_mode: boolean;
  demo_mode: boolean;
}

const defaults: SiteSettings = {
  daily_bonus_amount: 10,
  referral_bonus_amount: 3000,
  registration_bonus: 100,
  chat_token_cost: 1,
  image_token_cost: 5,
  video_token_cost: 20,
  sub_lite_price: 299,
  sub_pro_price: 599,
  sub_ultra_price: 999,
  pack_small_tokens: 5000,
  pack_small_price: 99,
  pack_medium_tokens: 20000,
  pack_medium_price: 299,
  pack_large_tokens: 50000,
  pack_large_price: 699,
  maintenance_mode: false,
  demo_mode: true,
};

type FieldGroup = { title: string; icon: string; fields: { key: keyof SiteSettings; label: string; type: "number" | "boolean"; description: string; suffix?: string }[] };

const settingGroups: FieldGroup[] = [
  {
    title: "🎁 Бонусы",
    icon: "🎁",
    fields: [
      { key: "daily_bonus_amount", label: "Ежедневный бонус", type: "number", description: "Кол-во токенов за ежедневный бонус", suffix: "токенов" },
      { key: "referral_bonus_amount", label: "Реферальный бонус", type: "number", description: "Токенов за приглашённого друга", suffix: "токенов" },
      { key: "registration_bonus", label: "Бонус за регистрацию", type: "number", description: "Токенов при создании аккаунта", suffix: "токенов" },
    ],
  },
  {
    title: "⚡ Стоимость генерации",
    icon: "⚡",
    fields: [
      { key: "chat_token_cost", label: "Чат-сообщение", type: "number", description: "Токенов за одно сообщение AI", suffix: "токенов" },
      { key: "image_token_cost", label: "Генерация картинки", type: "number", description: "Токенов за одну картинку", suffix: "токенов" },
      { key: "video_token_cost", label: "Генерация видео", type: "number", description: "Токенов за одно видео", suffix: "токенов" },
    ],
  },
  {
    title: "📋 Подписки (цены)",
    icon: "📋",
    fields: [
      { key: "sub_lite_price", label: "Lite подписка", type: "number", description: "Цена ежемесячной подписки Lite", suffix: "₽/мес" },
      { key: "sub_pro_price", label: "Pro подписка", type: "number", description: "Цена ежемесячной подписки Pro", suffix: "₽/мес" },
      { key: "sub_ultra_price", label: "Ultra подписка", type: "number", description: "Цена ежемесячной подписки Ultra", suffix: "₽/мес" },
    ],
  },
  {
    title: "💎 Пакеты токенов",
    icon: "💎",
    fields: [
      { key: "pack_small_tokens", label: "Пакет S — токены", type: "number", description: "Кол-во токенов в малом пакете", suffix: "токенов" },
      { key: "pack_small_price", label: "Пакет S — цена", type: "number", description: "Цена малого пакета", suffix: "₽" },
      { key: "pack_medium_tokens", label: "Пакет M — токены", type: "number", description: "Кол-во токенов в среднем пакете", suffix: "токенов" },
      { key: "pack_medium_price", label: "Пакет M — цена", type: "number", description: "Цена среднего пакета", suffix: "₽" },
      { key: "pack_large_tokens", label: "Пакет L — токены", type: "number", description: "Кол-во токенов в большом пакете", suffix: "токенов" },
      { key: "pack_large_price", label: "Пакет L — цена", type: "number", description: "Цена большого пакета", suffix: "₽" },
    ],
  },
  {
    title: "🔧 Режимы",
    icon: "🔧",
    fields: [
      { key: "maintenance_mode", label: "Режим обслуживания", type: "boolean", description: "Отключить доступ для обычных пользователей" },
      { key: "demo_mode", label: "Демо-режим", type: "boolean", description: "Показывать уведомление о демо-режиме" },
    ],
  },
];

const allFields = settingGroups.flatMap((g) => g.fields);

const SystemSettingsPanel = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .limit(50);
      if (data && data.length > 0) {
        const loaded = { ...defaults };
        data.forEach((row: { key: string; value: string }) => {
          const field = allFields.find((f) => f.key === row.key);
          if (field) {
            if (field.type === "boolean") {
              (loaded as any)[row.key] = row.value === "true";
            } else {
              (loaded as any)[row.key] = Number(row.value) || 0;
            }
          }
        });
        setSettings(loaded);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const field of allFields) {
      const val = String(settings[field.key]);
      await supabase
        .from("site_settings")
        .upsert({ key: field.key, value: val }, { onConflict: "key" });
    }
    toast({ title: "✅ Настройки сохранены" });
    setSaving(false);
  };

  if (!loaded) return <p className="text-muted-foreground text-sm py-8 text-center">Загрузка настроек...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⚙️ Системные настройки</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
      </div>

      {settingGroups.map((group) => (
        <div key={group.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{group.title}</h3>
          {group.fields.map((field) => (
            <div key={field.key} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{field.label}</p>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
              {field.type === "boolean" ? (
                <button
                  onClick={() => setSettings((s) => ({ ...s, [field.key]: !s[field.key] }))}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                    settings[field.key] ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full transition-transform ${
                      settings[field.key] ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={settings[field.key] as number}
                    onChange={(e) => setSettings((s) => ({ ...s, [field.key]: Number(e.target.value) }))}
                    className="w-24 bg-secondary/50 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground font-mono text-right outline-none focus:border-primary/50 transition-colors"
                  />
                  {field.suffix && <span className="text-xs text-muted-foreground">{field.suffix}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="glass rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          💡 Все настройки сохраняются в таблицу <code className="text-primary">site_settings</code>. 
          Подробности — в файле <code className="text-primary">DEPLOY.md</code>.
        </p>
      </div>
    </div>
  );
};

export default SystemSettingsPanel;
