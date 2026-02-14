import { useState, useCallback, useEffect } from "react";
import { Bot, Coins, Settings, LogOut, Image, Video, Diamond, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import ChatPanel, { type ChatMessage, type Conversation } from "@/components/dashboard/ChatPanel";
import ImagePanel from "@/components/dashboard/ImagePanel";
import VideoPanel from "@/components/dashboard/VideoPanel";
import TokenShop from "@/components/dashboard/TokenShop";
import ProfilePanel from "@/components/dashboard/ProfilePanel";
import RoleSelector from "@/components/dashboard/RoleSelector";
import TopupModal from "@/components/dashboard/TopupModal";

type Panel = "chat" | "image" | "video" | "tokens" | "profile" | "role";

const navItems: { id: Panel; icon: typeof Bot; label: string }[] = [
  { id: "chat", icon: Bot, label: "Чат" },
  { id: "image", icon: Image, label: "Картинки" },
  { id: "video", icon: Video, label: "Видео" },
  { id: "tokens", icon: Diamond, label: "Магазин" },
  { id: "profile", icon: User, label: "Профиль" },
];

const STORAGE_KEY = "neurobro_conversations";

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

const welcomeMessage: ChatMessage = {
  role: "assistant",
  content: "Привет! Я NeuroBro 🤖 Задай мне любой вопрос.\n\n⚠️ Сейчас работает демо-режим.",
};

const panelVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, isAdmin, spendTokens, claimDailyBonus } = useProfile();
  const [activePanel, setActivePanel] = useState<Panel>("chat");
  const [showTopup, setShowTopup] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(conversations[0]?.id ?? null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState("universal");

  const tokenBalance = profile?.tokens_balance ?? 0;

  useEffect(() => { saveConversations(conversations); }, [conversations]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages ?? [welcomeMessage];

  const createConversation = useCallback(() => {
    const id = crypto.randomUUID();
    const conv: Conversation = { id, title: "Новый чат", messages: [welcomeMessage], updatedAt: Date.now() };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  }, [activeConvId]);

  const handleSpend = async (cost: number, desc: string) => {
    if (tokenBalance < cost) { setShowTopup(true); return false; }
    const ok = await spendTokens(cost, desc);
    if (!ok) { setShowTopup(true); return false; }
    return true;
  };

  const sendChat = async () => {
    if (chatLoading || !chatInput.trim()) return;
    if (!(await handleSpend(1, "AI чат запрос"))) return;

    const text = chatInput.trim();
    let convId = activeConvId;

    if (!convId) {
      const id = crypto.randomUUID();
      const conv: Conversation = { id, title: text.slice(0, 30), messages: [welcomeMessage], updatedAt: Date.now() };
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(id);
      convId = id;
    }

    setChatInput("");
    setChatLoading(true);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, title: c.title === "Новый чат" ? text.slice(0, 30) : c.title, messages: [...c.messages, { role: "user" as const, content: text }], updatedAt: Date.now() }
          : c
      )
    );

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, { role: "assistant" as const, content: "Это демо-ответ. После подключения AI здесь будут реальные ответы. Токен списан ✅" }], updatedAt: Date.now() }
            : c
        )
      );
      setChatLoading(false);
    }, 1000);
  };

  const handleDailyBonus = async () => {
    const ok = await claimDailyBonus();
    toast({
      title: ok ? "Бонус получен! 🎁" : "Бонус уже получен",
      description: ok ? "+10 токенов зачислено" : "Приходите через 24 часа",
      variant: ok ? "default" : "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[500px] h-[500px] rounded-full bg-neon-cyan/[0.02] blur-[100px]" />
      </div>

      <header className="glass border-b border-border/30 px-4 h-14 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center glow-purple">
            <Bot className="w-4.5 h-4.5 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight">NeuroBro</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActivePanel("tokens")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-sm hover:border-primary/30 transition-colors"
          >
            <Coins className="w-4 h-4 text-neon-green" />
            <span className="font-mono font-semibold text-xs">{tokenBalance.toLocaleString()}</span>
          </motion.button>
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="h-8 w-8 text-muted-foreground rounded-lg hover:bg-secondary/60 flex items-center justify-center transition-colors" title="Админ">
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button onClick={async () => { await signOut(); navigate("/"); }} className="h-8 w-8 text-muted-foreground rounded-lg hover:bg-secondary/60 flex items-center justify-center transition-colors" title="Выйти">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-hidden px-3 pt-3 pb-1 sm:px-4 sm:pt-4 sm:pb-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col min-h-0"
            >
              {activePanel === "chat" && (
                <ChatPanel
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  chatLoading={chatLoading}
                  onSend={sendChat}
                  conversations={conversations}
                  activeConversationId={activeConvId}
                  onNewConversation={createConversation}
                  onSelectConversation={setActiveConvId}
                  onDeleteConversation={deleteConversation}
                />
              )}
              {activePanel === "image" && <ImagePanel />}
              {activePanel === "video" && <VideoPanel />}
              {activePanel === "tokens" && <TokenShop tokenBalance={tokenBalance} onShowTopup={() => setShowTopup(true)} />}
              {activePanel === "profile" && (
                <ProfilePanel
                  profile={profile}
                  onClaimBonus={handleDailyBonus}
                  onSelectRole={() => setActivePanel("role")}
                  onSignOut={async () => { await signOut(); navigate("/"); }}
                />
              )}
              {activePanel === "role" && (
                <RoleSelector currentRole={currentRole} onRoleChange={setCurrentRole} onBack={() => setActivePanel("profile")} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Premium bottom nav */}
        <div className="shrink-0 bg-background/80 backdrop-blur-2xl border-t border-border/10 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center max-w-xs mx-auto relative">
            {navItems.map((item) => {
              const active = activePanel === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePanel(item.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 relative min-w-0 group"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-[18px] h-[18px] relative z-10 transition-all duration-200 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70"}`} />
                  <span className={`text-[9px] font-semibold tracking-wider uppercase relative z-10 transition-colors duration-200 truncate ${active ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showTopup && (
        <TopupModal onClose={() => setShowTopup(false)} onBuy={async () => { setShowTopup(false); }} />
      )}
    </div>
  );
};

export default Dashboard;
