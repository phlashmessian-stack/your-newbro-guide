import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, Sparkles, Globe, Lock, Zap, Clock, Check, Star, ArrowRight, Shield,
  MessageSquare, Palette, Film, Loader2, Menu, X, ChevronDown, Users, Rocket,
  CreditCard, MousePointerClick, Quote
} from "lucide-react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/* ───────── DATA ───────── */

const models = [
  { name: "ChatGPT-5", desc: "Самая мощная языковая модель OpenAI", icon: MessageSquare, tag: "Чат", color: "neon-purple" },
  { name: "Gemini Pro", desc: "Google AI нового поколения", icon: MessageSquare, tag: "Чат", color: "neon-purple" },
  { name: "Claude 4", desc: "Anthropic — глубокий анализ и код", icon: MessageSquare, tag: "Чат", color: "neon-purple" },
  { name: "DALL·E 3", desc: "Фотореалистичные изображения от OpenAI", icon: Palette, tag: "Картинки", color: "neon-cyan" },
  { name: "Midjourney v7", desc: "Лучший арт и дизайн", icon: Palette, tag: "Картинки", color: "neon-cyan" },
  { name: "Stable Diffusion 3", desc: "Открытая модель, любые стили", icon: Palette, tag: "Картинки", color: "neon-cyan" },
  { name: "Veo 3", desc: "Видеогенерация от Google DeepMind", icon: Film, tag: "Видео", color: "neon-pink" },
  { name: "Sora", desc: "Кинематографичное видео от OpenAI", icon: Film, tag: "Видео", color: "neon-pink" },
  { name: "Kling AI", desc: "Реалистичное видео из текста", icon: Film, tag: "Видео", color: "neon-pink" },
];

const features = [
  { icon: Globe, title: "Без VPN", desc: "Работает из России напрямую" },
  { icon: Lock, title: "Анонимно", desc: "Только email, никаких паспортов" },
  { icon: Zap, title: "Мгновенно", desc: "Регистрация за 5 секунд" },
  { icon: Clock, title: "24/7", desc: "Доступно круглосуточно" },
];

const steps = [
  { icon: MousePointerClick, title: "Регистрация", desc: "Введи email — пароль придёт на почту. Всё, 5 секунд.", num: "01" },
  { icon: Bot, title: "Выбери модель", desc: "ChatGPT, DALL·E, Midjourney, Sora — всё в одном месте.", num: "02" },
  { icon: Rocket, title: "Генерируй", desc: "Пиши текст, создавай картинки и видео без VPN и лимитов.", num: "03" },
];

const reviews = [
  { name: "Алексей К.", role: "Разработчик", text: "Перестал мучаться с VPN. Все модели работают стабильно, код пишет как зверь.", rating: 5 },
  { name: "Мария С.", role: "Дизайнер", text: "Midjourney и DALL·E в одном месте — мечта. Генерирую концепты за минуты.", rating: 5 },
  { name: "Дмитрий Н.", role: "Маркетолог", text: "Использую для контента каждый день. Окупается за первый же пост.", rating: 5 },
  { name: "Анна В.", role: "Студентка", text: "Claude помогает с учёбой, а Sora — делать презентации. Лучшая подписка.", rating: 5 },
];

const plans = [
  {
    name: "Lite", price: "299₽", features: ["Безлимит AI-чата", "ChatGPT-5 + Gemini + Claude", "История сообщений"],
    popular: false,
  },
  {
    name: "Pro", price: "599₽", features: ["Всё из Lite", "+ 2 картинки/день", "+ 1 видео/месяц", "Приоритетная очередь"],
    popular: true,
  },
  {
    name: "Ultra", price: "999₽", features: ["Всё из Pro", "+ 5 картинок/день", "+ 2 видео/месяц", "Ранний доступ к новинкам"],
    popular: false,
  },
];

const faqs = [
  { q: "Нужен ли VPN?", a: "Нет. NeuroBro работает из России напрямую — никаких VPN, прокси или танцев с бубном." },
  { q: "Какие модели доступны?", a: "ChatGPT-5, Gemini Pro, Claude 4, DALL·E 3, Midjourney v7, Stable Diffusion 3, Sora, Veo 3, Kling AI — и список растёт." },
  { q: "Как работает оплата?", a: "Подписка или токены. Можно попробовать бесплатно — 10 токенов при регистрации." },
  { q: "Безопасно ли это?", a: "Да. Мы не храним ваши запросы, данные шифруются, регистрация только по email." },
];

/* ───────── COMPONENTS ───────── */

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left group">
        <span className="text-sm font-medium pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
}

/* ───────── LANDING ───────── */

const Landing = () => {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };
  const [menuOpen, setMenuOpen] = useState(false);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthLoading(true);
    try {
      if (mode === "register") {
        const generatedPwd = generatePassword();
        const { error } = await signUp(email, generatedPwd);
        if (error) {
          toast({ title: "Ошибка регистрации", description: error, variant: "destructive" });
        } else {
          toast({ title: "Готово! 🎉", description: "Логин и пароль отправлены на " + email });
        }
      } else {
        if (!password) {
          toast({ title: "Ошибка", description: "Введите пароль", variant: "destructive" });
          setAuthLoading(false);
          return;
        }
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Ошибка входа", description: error, variant: "destructive" });
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-2xl border-b border-border/20">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight">NeuroBro</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {["models", "pricing", "faq"].map((id) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-muted-foreground text-sm px-3 py-1.5 rounded-lg hover:text-foreground hover:bg-secondary/40 transition-all">
                {id === "models" ? "Модели" : id === "pricing" ? "Цены" : "FAQ"}
              </button>
            ))}
            <button onClick={() => scrollTo("register")} className="ml-2 text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
              Начать
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary/50 transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-14 right-0 w-64 bg-card/95 backdrop-blur-xl border-l border-border/20 h-[calc(100vh-3.5rem)] p-5 space-y-1 z-50"
          >
            {[{ id: "models", label: "Модели" }, { id: "pricing", label: "Цены" }, { id: "faq", label: "FAQ" }].map((item) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-colors">
                {item.label}
              </button>
            ))}
            <button onClick={() => scrollTo("register")} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
              Начать бесплатно
            </button>
          </motion.div>
        </div>
      )}

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/[0.06] blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-neon-cyan/[0.04] blur-[120px]" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-neon-pink/[0.04] blur-[100px]" />
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="container mx-auto max-w-5xl relative">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs sm:text-sm text-primary mb-6 sm:mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>9 моделей · Без VPN · Из России</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-5 sm:mb-6"
            >
              <span className="text-gradient">Все нейросети</span>
              <br />
              <span className="text-foreground">в одном окне</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed"
            >
              ChatGPT-5, DALL·E, Midjourney, Sora и ещё 5 моделей.
              <br className="hidden sm:block" />
              Без VPN, без карты, за 5 секунд.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center justify-center gap-8 sm:gap-12 mb-10 sm:mb-14"
            >
              {[
                { value: "15K+", label: "пользователей" },
                { value: "1.2M+", label: "запросов" },
                { value: "99.9%", label: "аптайм" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-gradient">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Auth Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            id="register"
            className="max-w-md mx-auto"
          >
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 sm:p-6 border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.2)]">
              <div className="flex gap-1 mb-4 p-1 rounded-xl bg-secondary/40">
                {(["register", "login"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === m ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m === "register" ? "Регистрация" : "Вход"}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <input
                  type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/40 focus:border-primary/60 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-sm focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                />
                {mode === "login" && (
                  <input
                    type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-secondary/40 border border-border/40 focus:border-primary/60 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-sm focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                  />
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-4 py-3 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/25"
                >
                  {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === "register" ? "Создать аккаунт" : "Войти"}
                  {!authLoading && <ArrowRight className="w-4 h-4" />}
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-3 text-center">
                {mode === "register" ? "Пароль придёт на почту · Без VPN" : "Введите email и пароль"}
              </p>
            </form>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Features strip ─── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-border/10">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div className="text-center p-4 rounded-2xl hover:bg-secondary/20 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-0.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <FadeIn className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Как это <span className="text-gradient">работает</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Три шага — и ты в деле</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.12}>
                <div className="glass rounded-2xl p-5 sm:p-6 relative group hover:border-primary/30 transition-all">
                  <span className="text-4xl font-black text-primary/10 absolute top-4 right-5 font-mono">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Models ─── */}
      <section id="models" className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>
        <div className="container mx-auto max-w-5xl relative">
          <FadeIn className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Все топовые модели <span className="text-gradient">в одном месте</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Не нужно 10 подписок — всё через NeuroBro</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((m, i) => (
              <FadeIn key={m.name} delay={i * 0.05}>
                <div className="glass rounded-2xl p-4 hover:border-primary/20 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${m.color}/10 flex items-center justify-center shrink-0`}>
                      <m.icon className={`w-4 h-4 text-${m.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{m.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-${m.color}/10 text-${m.color}`}>{m.tag}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Reviews ─── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <FadeIn className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Что говорят <span className="text-gradient">пользователи</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Реальные отзывы наших юзеров</p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <FadeIn key={r.name} delay={i * 0.08}>
                <div className="glass rounded-2xl p-5 sm:p-6 relative">
                  <Quote className="w-8 h-8 text-primary/10 absolute top-4 right-5" />
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 text-neon-green fill-neon-green" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4">{r.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] blur-[140px]" />
        </div>
        <div className="container mx-auto max-w-4xl relative">
          <FadeIn className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Простые <span className="text-gradient">тарифы</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Или покупай токены отдельно</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div className={`glass rounded-2xl p-5 sm:p-6 relative transition-all hover:scale-[1.02] ${
                  plan.popular ? "border-primary/40 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.25)]" : "border-border/30"
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 shadow-lg shadow-primary/30">
                      <Star className="w-3 h-3" /> Популярный
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-mono font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/мес</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-neon-green shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => scrollTo("register")}
                    className={`w-full rounded-xl px-4 py-3 transition-all text-sm font-semibold ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-secondary/60 hover:bg-secondary/80 text-foreground"
                    }`}
                  >
                    Начать
                  </motion.button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl">
          <FadeIn className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Частые <span className="text-gradient">вопросы</span>
            </h2>
          </FadeIn>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <FadeIn key={faq.q} delay={i * 0.06}>
                <FAQItem q={faq.q} a={faq.a} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.05] blur-[130px]" />
        </div>
        <FadeIn className="container mx-auto max-w-2xl text-center relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
            Хватит мучаться
            <br />
            <span className="text-gradient">с VPN</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8">
            15,000+ пользователей уже генерируют контент без ограничений
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => scrollTo("register")}
            className="bg-primary hover:bg-primary/90 px-8 py-3.5 rounded-xl text-primary-foreground inline-flex items-center gap-2.5 transition-all font-semibold text-base shadow-[0_0_40px_-8px_hsl(var(--primary)/0.4)]"
          >
            Попробовать бесплатно <ArrowRight className="w-5 h-5" />
          </motion.button>
        </FadeIn>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/10 py-8 sm:py-10 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-bold text-sm">NeuroBro</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Безопасно</span>
              <span>·</span>
              <span>© {new Date().getFullYear()} NeuroBro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
