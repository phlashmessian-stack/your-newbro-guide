import { ArrowLeft } from "lucide-react";

const roles = [
  { id: "programmer", label: "Программист", icon: "👨‍💻", desc: "Помогает с кодом, алгоритмами, дебагом" },
  { id: "copywriter", label: "Копирайтер", icon: "✍️", desc: "Пишет тексты, посты, рекламу" },
  { id: "english_tutor", label: "English Репетитор", icon: "🇬🇧", desc: "Обучает английскому, исправляет ошибки" },
  { id: "tarot", label: "Таролог", icon: "🔮", desc: "Гадания на таро, мистика" },
  { id: "universal", label: "Универсальный ассистент", icon: "🤖", desc: "Помощник на все случаи жизни" },
];

interface RoleSelectorProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onBack: () => void;
}

const RoleSelector = ({ currentRole, onRoleChange, onBack }: RoleSelectorProps) => {
  const currentRoleObj = roles.find((r) => r.id === currentRole) || roles[roles.length - 1];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="glass rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-bold">🤖 Выбор роли</h2>
        <p className="text-sm">Текущая роль: <strong>{currentRoleObj.icon} {currentRoleObj.label}</strong></p>
        <p className="text-sm text-muted-foreground">Роль задаёт AI специализацию и стиль ответов. Выбери подходящую:</p>
        <div className="glass rounded-lg p-3 border-l-4 border-neon-pink/50">
          <p className="text-sm italic text-muted-foreground">{currentRoleObj.desc}</p>
        </div>
      </div>

      <div className="space-y-2">
        {roles.map((role) => {
          const active = role.id === currentRole;
          return (
            <button
              key={role.id}
              onClick={() => onRoleChange(role.id)}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-sm font-medium ${
                active
                  ? "border-primary/50 bg-primary/10 text-primary glow-purple"
                  : "border-border/50 bg-secondary/40 hover:bg-secondary/70 hover:border-primary/30"
              }`}
            >
              {role.icon} {role.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onRoleChange("")} className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all">
          ❌ Без роли
        </button>
        <button onClick={onBack} className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-border/50 bg-secondary/40 text-sm font-medium hover:bg-secondary/70 transition-all">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;
