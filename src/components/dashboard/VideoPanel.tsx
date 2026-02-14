import { useState, useEffect } from "react";
import { Film, ChevronDown, Sparkles, Video, Move3d, Sun, Clapperboard, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SelectGrid from "./SelectGrid";

export interface VideoGeneration {
  id: string;
  prompt: string;
  duration: string;
  quality: string;
  aspect: string;
  cost: number;
  createdAt: number;
  status: "pending" | "done" | "error";
  resultUrl?: string;
}

const STORAGE_KEY = "neurobro_video_history";

function loadHistory(): VideoGeneration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(items: VideoGeneration[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const tips = [
  { icon: Video, text: "Опиши сцену детально", example: "\"кот играет с мячом на зелёной траве\"", color: "text-neon-pink" },
  { icon: Move3d, text: "Укажи движение камеры", example: "\"камера медленно облетает вокруг\"", color: "text-neon-cyan" },
  { icon: Sun, text: "Добавь атмосферу и стиль", example: "\"кинематографично, золотой час\"", color: "text-neon-purple" },
];

const VideoPanel = () => {
  const [videoDuration, setVideoDuration] = useState("5");
  const [videoQualitySt, setVideoQualitySt] = useState("720");
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<VideoGeneration[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { saveHistory(history); }, [history]);

  const videoCost = videoQualitySt === "1080" ? 30 : 20;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const gen: VideoGeneration = {
      id: crypto.randomUUID(),
      prompt: prompt.trim(),
      duration: videoDuration,
      quality: videoQualitySt,
      aspect: videoAspect,
      cost: videoCost,
      createdAt: Date.now(),
      status: "done",
      resultUrl: undefined,
    };
    setHistory((prev) => [gen, ...prev]);
    setPrompt("");
  };

  const deleteItem = (id: string) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-3xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pb-2">
        {/* Settings toggle */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl glass transition-all hover:border-primary/30"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-pink" />
            <span className="text-sm font-medium">Настройки</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {videoDuration}с · {videoQualitySt}p · {videoAspect}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-neon-green">{videoCost} ток.</span>
            <motion.div animate={{ rotate: settingsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </motion.button>

        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-4 glass rounded-2xl p-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Длительность</p>
                  <SelectGrid items={[{ value: "5", label: "5 сек" }, { value: "10", label: "10 сек" }]} value={videoDuration} onChange={setVideoDuration} cols={2} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Качество</p>
                  <SelectGrid items={[{ value: "720", label: "720p · 20 ток." }, { value: "1080", label: "1080p · 30 ток." }]} value={videoQualitySt} onChange={setVideoQualitySt} cols={2} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Формат</p>
                  <SelectGrid items={[{ value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "1:1", label: "1:1" }]} value={videoAspect} onChange={setVideoAspect} cols={3} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          История генераций ({history.length})
        </button>

        {showHistory && history.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button onClick={clearHistory} className="text-[10px] text-destructive hover:underline">Очистить всю историю</button>
            </div>
            {history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-3 space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-foreground leading-snug flex-1">{item.prompt}</p>
                  <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{item.duration}с</span>
                  <span>·</span>
                  <span>{item.quality}p</span>
                  <span>·</span>
                  <span>{item.aspect}</span>
                  <span>·</span>
                  <span className="font-mono text-neon-green">-{item.cost}</span>
                  <span>·</span>
                  <span>{new Date(item.createdAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state with tips */}
        {(!showHistory || history.length === 0) && (
          <div className="flex flex-col items-center py-8 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-neon-pink/10 flex items-center justify-center">
                <Clapperboard className="w-10 h-10 text-neon-pink/40" />
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-sm">Генерация видео</h3>
              <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                Опиши сцену и AI создаст видеоролик
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {tips.map((tip) => (
                <div key={tip.text} className="flex items-center gap-3 glass rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                    <tip.icon className={`w-3.5 h-3.5 ${tip.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{tip.text}</p>
                    <p className="text-[10px] text-muted-foreground/50 truncate">{tip.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-2 pb-1">
        <div className="flex items-end gap-2 glass rounded-2xl p-2 border border-border/30 focus-within:border-neon-pink/40 focus-within:shadow-[0_0_20px_-8px_hsl(var(--neon-pink)/0.2)] transition-all min-h-[56px]">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="Опиши сцену для видео..."
            rows={1}
            className="flex-1 bg-transparent resize-none px-3 py-2.5 text-foreground placeholder:text-muted-foreground/40 outline-none text-sm max-h-32 scrollbar-thin"
            style={{ minHeight: '40px' }}
            onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px'; }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="bg-primary hover:bg-primary/90 disabled:opacity-30 shrink-0 rounded-xl w-10 h-10 flex items-center justify-center text-primary-foreground transition-all shadow-lg shadow-primary/25"
          >
            <Film className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;
