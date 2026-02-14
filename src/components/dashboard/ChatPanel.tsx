import { useRef, useEffect, useState } from "react";
import { Send, Plus, MessageSquare, Bot, Trash2, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatLoading: boolean;
  onSend: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

const quickPrompts = [
  { emoji: "✍️", text: "Напиши пост для соцсети" },
  { emoji: "🧠", text: "Объясни квантовую физику" },
  { emoji: "💡", text: "Придумай бизнес-идею" },
  { emoji: "💻", text: "Напиши код на Python" },
];

const ChatPanel = ({
  messages,
  chatInput,
  setChatInput,
  chatLoading,
  onSend,
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ChatPanelProps) => {
  const chatRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const hasMessages = messages.length > 1 || (messages.length === 1 && messages[0].role === "user");

  return (
    <div className="flex flex-1 min-h-0 max-w-4xl mx-auto gap-0 sm:gap-3">
      {/* History sidebar */}
      <div className={`${showHistory ? "fixed inset-0 z-50 sm:relative sm:inset-auto" : "hidden"} sm:block sm:w-56 md:w-64 shrink-0`}>
        {showHistory && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm sm:hidden" onClick={() => setShowHistory(false)} />}

        <div className={`${showHistory ? "fixed left-0 top-0 h-full w-72 z-50 sm:relative sm:w-full" : ""} flex flex-col h-full bg-card/80 sm:bg-transparent rounded-none sm:rounded-2xl border-r sm:border border-border/20 sm:glass overflow-hidden`}>
          <div className="p-3 border-b border-border/20 flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onNewConversation}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-medium transition-colors flex-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Новый чат
            </motion.button>
            <button onClick={() => setShowHistory(false)} className="sm:hidden ml-2 p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
            {conversations.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground/40">Нет чатов</p>
              </div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  conv.id === activeConversationId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
                onClick={() => { onSelectConversation(conv.id); setShowHistory(false); }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile history button */}
        <button
          onClick={() => setShowHistory(true)}
          className="sm:hidden flex items-center gap-2 px-3 py-2 mb-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          История ({conversations.length})
        </button>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pb-4 px-1">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Bot className="w-10 h-10 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-neon-green" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="font-bold text-base">NeuroBro AI</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                  Задай любой вопрос — от написания кода до генерации идей
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                {quickPrompts.map((q) => (
                  <motion.button
                    key={q.text}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setChatInput(q.text)}
                    className="flex items-start gap-2 px-3 py-3 rounded-xl glass text-left hover:border-primary/30 transition-all group"
                  >
                    <span className="text-sm">{q.emoji}</span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-snug">{q.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i > messages.length - 3 ? 0.05 : 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                      : "glass rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 pt-2 pb-1">
          <div className="flex items-end gap-2 glass rounded-2xl p-2 border border-border/30 focus-within:border-primary/40 focus-within:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.2)] transition-all min-h-[56px]">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Напишите сообщение..."
              rows={1}
              className="flex-1 bg-transparent resize-none px-3 py-2.5 text-foreground placeholder:text-muted-foreground/40 outline-none text-sm max-h-32 scrollbar-thin"
              style={{ minHeight: '40px' }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px'; }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onSend}
              disabled={!chatInput.trim() && !chatLoading}
              className="bg-primary hover:bg-primary/90 disabled:opacity-30 shrink-0 rounded-xl w-10 h-10 flex items-center justify-center text-primary-foreground transition-all shadow-lg shadow-primary/25"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
export type { ChatMessage, Conversation };
