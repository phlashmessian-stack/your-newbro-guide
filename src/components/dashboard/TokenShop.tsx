import { Diamond, Zap, Crown, MessageSquare, Palette, Film, Sparkles, Check } from "lucide-react";

interface TokenShopProps {
  tokenBalance: number;
  onShowTopup: () => void;
}

const tokenPackages = [
  { tokens: 5000, price: 99, label: "5K", popular: false },
  { tokens: 20000, price: 299, label: "20K", popular: true },
  { tokens: 50000, price: 699, label: "50K", popular: false },
];

const subscriptions = [
  {
    name: "Lite",
    price: 299,
    icon: Sparkles,
    colorClass: "text-neon-green",
    bgClass: "bg-neon-green/10",
    borderClass: "border-neon-green/20 hover:border-neon-green/40",
    glowClass: "",
    features: ["Безлимит AI-чата", "Все чат-модели", "История сообщений"],
  },
  {
    name: "Pro",
    price: 599,
    icon: Crown,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/30 hover:border-primary/50",
    glowClass: "glow-purple",
    features: ["Всё из Lite", "+2 картинки/день", "+1 видео/месяц", "Приоритет"],
  },
  {
    name: "Ultra",
    price: 999,
    icon: Diamond,
    colorClass: "text-neon-cyan",
    bgClass: "bg-neon-cyan/10",
    borderClass: "border-neon-cyan/30 hover:border-neon-cyan/50",
    glowClass: "glow-cyan",
    features: ["Всё из Pro", "+5 картинок/день", "+2 видео/месяц", "Ранний доступ"],
  },
];

const TokenShop = ({ tokenBalance, onShowTopup }: TokenShopProps) => (
  <div className="max-w-3xl mx-auto space-y-5">
    {/* Balance Card */}
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="relative">
        <p className="text-sm text-muted-foreground mb-1">Текущий баланс</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold text-gradient">{tokenBalance.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">токенов</span>
        </div>
      </div>
    </div>

    {/* Subscriptions */}
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Подписки</h3>
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <button
            key={sub.name}
            onClick={onShowTopup}
            className={`w-full glass rounded-2xl p-4 border text-left transition-all active:scale-[0.98] ${sub.borderClass} ${sub.glowClass}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${sub.bgClass} flex items-center justify-center`}>
                  <sub.icon className={`w-5 h-5 ${sub.colorClass}`} />
                </div>
                <div>
                  <p className="font-semibold">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">ежемесячно</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-lg">{sub.price}₽</p>
                <p className="text-[10px] text-muted-foreground">/мес</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {sub.features.map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className={`w-3 h-3 ${sub.colorClass}`} />
                  {f}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* Token Packages */}
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Пакеты токенов</h3>
      <div className="grid grid-cols-3 gap-3">
        {tokenPackages.map((pkg) => (
          <button
            key={pkg.tokens}
            onClick={onShowTopup}
            className={`relative glass rounded-2xl p-4 border transition-all active:scale-[0.98] text-center ${
              pkg.popular
                ? "border-primary/30 hover:border-primary/50 glow-purple"
                : "border-border/30 hover:border-border/60"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold">
                ХИТ
              </div>
            )}
            <p className="font-mono font-bold text-xl text-gradient">{pkg.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">токенов</p>
            <div className="mt-2 pt-2 border-t border-border/20">
              <p className="font-semibold text-sm">{pkg.price}₽</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* Pricing Info */}
    <div className="glass rounded-2xl p-4 space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Расход токенов</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/40 p-3 text-center">
          <MessageSquare className="w-4 h-4 text-neon-purple mx-auto mb-1.5" />
          <p className="text-xs font-medium">Чат</p>
          <p className="text-[10px] text-muted-foreground">1 токен</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3 text-center">
          <Palette className="w-4 h-4 text-neon-cyan mx-auto mb-1.5" />
          <p className="text-xs font-medium">Картинка</p>
          <p className="text-[10px] text-muted-foreground">от 5 токенов</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3 text-center">
          <Film className="w-4 h-4 text-neon-pink mx-auto mb-1.5" />
          <p className="text-xs font-medium">Видео</p>
          <p className="text-[10px] text-muted-foreground">от 20 токенов</p>
        </div>
      </div>
    </div>
  </div>
);

export default TokenShop;
