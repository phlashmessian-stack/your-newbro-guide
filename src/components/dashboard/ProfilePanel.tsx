import { User, Diamond, Star, Calendar, Shield as ShieldIcon, Crown, Gift, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@/hooks/useProfile";

interface ProfilePanelProps {
  profile: Profile | null;
  onClaimBonus: () => void;
  onSelectRole: () => void;
  onSignOut: () => void;
}

const ProfilePanel = ({ profile, onClaimBonus, onSelectRole, onSignOut }: ProfilePanelProps) => {
  const copyRefLink = () => {
    if (!profile) return;
    navigator.clipboard.writeText(`https://neurobro.ru/?ref=${profile.referral_code}`);
    toast({ title: "Скопировано!", description: "Реферальная ссылка в буфере обмена" });
  };

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg">Личный кабинет</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email ?? "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/50 border border-border/30 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Diamond className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-muted-foreground">Баланс</span>
            </div>
            <p className="font-mono font-bold text-xl">{(profile?.tokens_balance ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">токенов</p>
          </div>
          <div className="rounded-xl bg-secondary/50 border border-border/30 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-neon-green" />
              <span className="text-xs text-muted-foreground">Подписка</span>
            </div>
            <p className="font-bold text-lg">{profile?.subscription ? profile.subscription.charAt(0).toUpperCase() + profile.subscription.slice(1) : <span className="text-muted-foreground">Нет</span>}</p>
            <p className="text-xs text-muted-foreground">{profile?.subscription ? "активна" : "не активна"}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm border-t border-border/30 pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Аккаунт создан: {createdAt}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldIcon className="w-3.5 h-3.5" />
            <span>Реферальный код: <code className="font-mono text-foreground">{profile?.referral_code ?? "—"}</code></span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5 border-l-4 border-neon-green/50">
        <p className="text-sm font-semibold mb-2">✨ Подключи подписку и получи больше возможностей:</p>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">Lite</strong> — 299₽/мес — безлимит AI-чата</p>
          <p>• <strong className="text-foreground">Pro</strong> — 599₽/мес — + 2 картинки/день + 1 видео/мес</p>
          <p>• <strong className="text-foreground">Ultra</strong> — 999₽/мес — + 5 картинок/день + 2 видео/мес</p>
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={onSelectRole} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 hover:border-primary/30 transition-all text-sm font-medium">
          <Crown className="w-4 h-4 text-muted-foreground" /> Выбрать роль AI
        </button>
        <button onClick={onClaimBonus} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 hover:border-primary/30 transition-all text-sm font-medium">
          <Gift className="w-4 h-4 text-muted-foreground" /> Ежедневный бонус (+10 токенов)
        </button>
        <button onClick={copyRefLink} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 hover:border-primary/30 transition-all text-sm font-medium">
          <Link2 className="w-4 h-4 text-muted-foreground" /> Скопировать реферальную ссылку
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        <p className="text-sm mb-2">🔗 <strong>Реферальная программа</strong></p>
        <p className="text-sm text-primary break-all">https://neurobro.ru/?ref={profile?.referral_code ?? "..."}</p>
        <p className="text-xs text-muted-foreground mt-2">Приглашай друзей — получай <strong className="text-neon-green">+3,000 токенов</strong> за каждого!</p>
      </div>

      <button onClick={onSignOut} className="w-full border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-md px-3 py-2 transition-colors">
        Выйти из аккаунта
      </button>
    </div>
  );
};

export default ProfilePanel;
