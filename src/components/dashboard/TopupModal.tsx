import { Diamond, X, CreditCard } from "lucide-react";

interface TopupModalProps {
  onClose: () => void;
  onBuy: (tokens: number) => void;
}

const packages = [
  { tokens: 100, price: "99 ₽" },
  { tokens: 500, price: "399 ₽" },
  { tokens: 2000, price: "1299 ₽" },
];

const TopupModal = ({ onClose, onBuy }: TopupModalProps) => (
  <div className="fixed inset-0 z-50">
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
    <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] glass border-border/50 rounded-lg p-6 space-y-4">
      <button onClick={onClose} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2">
        <Diamond className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Пополните баланс</h3>
      </div>
      <p className="text-sm text-muted-foreground">Для отправки запросов нужны токены. Выберите пакет:</p>
      <div className="space-y-2">
        {packages.map((pkg) => (
          <button
            key={pkg.tokens}
            onClick={() => onBuy(pkg.tokens)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-lg">{pkg.tokens}</span>
              <span className="text-sm text-muted-foreground">токенов</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{pkg.price}</span>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default TopupModal;
