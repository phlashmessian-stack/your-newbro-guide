# NeuroBro — Деплой (чистый HTML/CSS/JS)

## Файлы для загрузки на shared-хостинг (Apache)

Из папки `dist/` загрузите на хостинг:

```
home.html          → переименуйте в index.html на сервере!
dashboard.html     → дашборд
admin.html         → админка
.htaccess          → Apache конфиг (автоматически home.html → /)
favicon.ico
css/style.css
js/supabase-config.js
js/auth.js
js/landing.js
js/dashboard.js
js/admin.js
```

## Регистрация админа

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'ВАШ@EMAIL.COM'
ON CONFLICT DO NOTHING;
```

## Зависимости: ТОЛЬКО Supabase + Resend. Никакого React/Node/Lovable.

---

## Оглавление (старая инструкция ниже)
1. [Сборка проекта](#1-сборка-проекта)
2. [Деплой фронтенда](#2-деплой-фронтенда)
3. [Supabase — База данных](#3-supabase--база-данных)
4. [Supabase — Edge Functions](#4-supabase--edge-functions)
5. [Resend — Email рассылки](#5-resend--email-рассылки)
6. [DNS и домен](#6-dns-и-домен)
7. [API ключи нейросетей](#7-api-ключи-нейросетей)
8. [OpenRouter (альтернатива)](#8-openrouter-альтернатива)
9. [Платёжная система](#9-платёжная-система)
10. [Таблица site_settings](#10-таблица-site_settings)
11. [Администрирование](#11-администрирование)
12. [Чек-лист перед запуском](#12-чек-лист-перед-запуском)

---

## 1. Сборка проекта

```bash
# Установить зависимости
npm install

# Собрать production-версию
npm run build

# Результат — папка dist/
# Она полностью автономна, без зависимостей от Lovable
```

### Проверка локально:
```bash
npx serve dist
# Откроется на http://localhost:3000
```

---

## 2. Деплой фронтенда

### Вариант A: VPS (nginx)
```nginx
server {
    listen 80;
    server_name neurobro.ru www.neurobro.ru;
    root /var/www/neurobro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Вариант B: Vercel
```bash
npm i -g vercel
vercel --prod
```

### Вариант C: Cloudflare Pages
- Подключить GitHub-репозиторий
- Build command: `npm run build`
- Output directory: `dist`

---

## 3. Supabase — База данных

### 3.1 Подключение
Файл `src/lib/supabase.ts` содержит URL и anon key вашего Supabase-проекта.  
Если нужно изменить — отредактируйте перед сборкой:

```typescript
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY';
```

### 3.2 Необходимые таблицы

Если таблицы ещё не созданы, выполните в SQL Editor Supabase:

```sql
-- Профили пользователей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tokens_balance INTEGER DEFAULT 100,
  subscription TEXT DEFAULT NULL,
  referral_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  referred_by TEXT DEFAULT NULL,
  last_daily_bonus TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Роли (RBAC)
CREATE TYPE app_role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Транзакции токенов
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Системные настройки
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Дефолтные настройки
INSERT INTO site_settings (key, value) VALUES
  ('daily_bonus_amount', '10'),
  ('referral_bonus_amount', '3000'),
  ('registration_bonus', '100'),
  ('chat_token_cost', '1'),
  ('image_token_cost', '5'),
  ('video_token_cost', '20'),
  ('sub_lite_price', '299'),
  ('sub_pro_price', '599'),
  ('sub_ultra_price', '999'),
  ('pack_small_tokens', '5000'),
  ('pack_small_price', '99'),
  ('pack_medium_tokens', '20000'),
  ('pack_medium_price', '299'),
  ('pack_large_tokens', '50000'),
  ('pack_large_price', '699'),
  ('maintenance_mode', 'false'),
  ('demo_mode', 'true')
ON CONFLICT (key) DO NOTHING;
```

### 3.3 RLS-политики

```sql
-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- Token Transactions
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transactions" ON token_transactions FOR SELECT USING (auth.uid() = user_id);

-- Site Settings (read for all auth users, write only admin via service_role)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON site_settings FOR SELECT TO authenticated USING (true);

-- Функция проверки роли (security definer, без рекурсии)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Админам — полный доступ к profiles
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Админам — доступ к транзакциям
CREATE POLICY "Admins can read all transactions" ON token_transactions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Админам — управление настройками
CREATE POLICY "Admins can manage settings" ON site_settings FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

### 3.4 Хранимые процедуры (RPC)

```sql
-- Начисление токенов
CREATE OR REPLACE FUNCTION add_tokens(
  _user_id UUID, _amount INTEGER, _type TEXT, _description TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET tokens_balance = tokens_balance + _amount WHERE id = _user_id;
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (_user_id, _amount, _type, _description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Списание токенов
CREATE OR REPLACE FUNCTION spend_tokens(
  _user_id UUID, _amount INTEGER, _description TEXT
) RETURNS BOOLEAN AS $$
DECLARE current_balance INTEGER;
BEGIN
  SELECT tokens_balance INTO current_balance FROM profiles WHERE id = _user_id;
  IF current_balance < _amount THEN RETURN FALSE; END IF;
  UPDATE profiles SET tokens_balance = tokens_balance - _amount WHERE id = _user_id;
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (_user_id, -_amount, 'spend', _description);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ежедневный бонус
CREATE OR REPLACE FUNCTION claim_daily_bonus(_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE last_claim TIMESTAMPTZ;
BEGIN
  SELECT last_daily_bonus INTO last_claim FROM profiles WHERE id = _user_id;
  IF last_claim IS NOT NULL AND last_claim > now() - interval '24 hours' THEN
    RETURN FALSE;
  END IF;
  UPDATE profiles SET tokens_balance = tokens_balance + 10, last_daily_bonus = now() WHERE id = _user_id;
  INSERT INTO token_transactions (user_id, amount, type, description)
  VALUES (_user_id, 10, 'daily_bonus', 'Ежедневный бонус');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.5 Триггер для автосоздания профиля при регистрации

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, tokens_balance, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    100,
    encode(gen_random_bytes(4), 'hex')
  );
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.6 Регистрация и назначение администратора

**Шаг 1: Зарегистрируйтесь как обычный пользователь**
1. Перейдите на сайт (neurobro.ru)
2. Введите email и нажмите «Создать аккаунт»
3. Пароль придёт на почту — войдите с ним

**Шаг 2: Назначьте себя администратором через SQL**
Откройте Supabase Dashboard → SQL Editor и выполните:

```sql
-- Замените email на свой
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'your-admin@email.com'
ON CONFLICT DO NOTHING;
```

**Шаг 3: Перезайдите в аккаунт**
Выйдите и войдите снова — в хедере появится иконка ⚙️ (шестерёнка), ведущая в `/admin`.

### 3.7 Добавление нового админа

Повторите шаги 1-3 для нового пользователя, заменив email:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'new-admin@email.com'
ON CONFLICT DO NOTHING;
```

### 3.8 Снятие прав администратора

```sql
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@email.com')
  AND role = 'admin';
```

### 3.9 Просмотр всех администраторов

```sql
SELECT u.email, ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

---

## 4. Supabase — Edge Functions

### 4.1 Установка Supabase CLI

```bash
npm install -g supabase
supabase login
```

### 4.2 Деплой функций

```bash
# Привязать к проекту
supabase link --project-ref YOUR_PROJECT_REF

# Деплой отправки писем
supabase functions deploy send-welcome-email --project-ref YOUR_PROJECT_REF

# Деплой рассылки
supabase functions deploy send-broadcast --project-ref YOUR_PROJECT_REF
```

### 4.3 Секреты для Edge Functions

```bash
# Resend API ключ
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx --project-ref YOUR_PROJECT_REF

# Проверить установленные секреты
supabase secrets list --project-ref YOUR_PROJECT_REF
```

> ⚠️ `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны автоматически в Edge Functions.

---

## 5. Resend — Email рассылки

### 5.1 Настройка домена
1. Зайдите на https://resend.com → Domains → Add Domain
2. Введите: `send.neuro-bro.ru`
3. Добавьте DNS-записи у хостера:
   - **MX** → `send.neuro-bro.ru` → `feedback-smtp.eu-west-1.amazonses.com` (priority 10)
   - **TXT (SPF)** → `send.neuro-bro.ru` → `v=spf1 include:amazonses.com ~all`
   - **TXT (DKIM)** → `resend._domainkey.send.neuro-bro.ru` → *(ключ из Resend)*
   - **TXT (DMARC)** → `_dmarc.send.neuro-bro.ru` → `v=DMARC1; p=none;`
4. Дождитесь статуса **Verified** в Resend

### 5.2 API ключ
1. Resend → API Keys → Create
2. Сохраните ключ: `re_xxxxxxxxxxxx`
3. Установите как секрет Supabase (см. раздел 4.3)

### 5.3 Отправитель
Текущий адрес отправки: `noreply@send.neuro-bro.ru`  
Изменить можно в файлах:
- `supabase/functions/send-welcome-email/index.ts` (строка `from:`)
- `supabase/functions/send-broadcast/index.ts` (строка `from:`)

---

## 6. DNS и домен

### Для neurobro.ru → хостинг фронтенда:
```
A     @              → IP_ВАШЕГО_СЕРВЕРА
A     www            → IP_ВАШЕГО_СЕРВЕРА
```

### Для Resend (отправка писем):
```
MX    send           → feedback-smtp.eu-west-1.amazonses.com (priority 10)
TXT   send           → v=spf1 include:amazonses.com ~all
TXT   resend._domainkey.send → [DKIM ключ из Resend]
TXT   _dmarc.send    → v=DMARC1; p=none;
```

### SSL
- При использовании nginx — настройте через Let's Encrypt / certbot
- При Vercel/Cloudflare — SSL автоматический

---

## 7. API ключи нейросетей

Для подключения AI-моделей к чату/картинкам/видео нужно:

### 7.1 Создать Edge Function для AI

Создайте `supabase/functions/ai-chat/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders, status: 200 });

  try {
    const API_KEY = Deno.env.get("AI_API_KEY");
    const AI_BASE_URL = Deno.env.get("AI_BASE_URL") || "https://openrouter.ai/api/v1";
    const AI_MODEL = Deno.env.get("AI_MODEL") || "openai/gpt-4o-mini";

    if (!API_KEY) throw new Error("AI_API_KEY is not configured");

    const { messages, stream } = await req.json();

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        stream: stream ?? true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI API error [${response.status}]: ${text}`);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 7.2 Установить секреты

```bash
# Вариант 1: OpenAI напрямую
supabase secrets set AI_API_KEY=sk-xxxxx AI_BASE_URL=https://api.openai.com/v1 AI_MODEL=gpt-4o-mini

# Вариант 2: OpenRouter (доступ ко всем моделям через один ключ)
supabase secrets set AI_API_KEY=sk-or-xxxxx AI_BASE_URL=https://openrouter.ai/api/v1 AI_MODEL=openai/gpt-4o-mini

# Вариант 3: Anthropic через OpenRouter
supabase secrets set AI_API_KEY=sk-or-xxxxx AI_BASE_URL=https://openrouter.ai/api/v1 AI_MODEL=anthropic/claude-3.5-sonnet
```

### 7.3 Деплой
```bash
supabase functions deploy ai-chat --project-ref YOUR_PROJECT_REF
```

### 7.4 Поддерживаемые провайдеры

| Провайдер | BASE_URL | Модели |
|-----------|----------|--------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| OpenRouter | `https://openrouter.ai/api/v1` | Все (openai/*, anthropic/*, google/*, meta/*) |
| Anthropic | `https://api.anthropic.com/v1` | claude-3.5-sonnet, claude-3-haiku |
| Together AI | `https://api.together.xyz/v1` | llama-3.1, mixtral |
| Groq | `https://api.groq.com/openai/v1` | llama-3.1-70b, mixtral |

---

## 8. OpenRouter (альтернатива)

OpenRouter — это единый шлюз ко всем моделям AI. Рекомендуется для NeuroBro.

### 8.1 Получить ключ
1. Зайдите на https://openrouter.ai
2. Settings → API Keys → Create Key
3. Пополните баланс (от $5)

### 8.2 Преимущества
- Один API ключ для OpenAI, Anthropic, Google, Meta, Mistral
- Автоматический fallback между моделями
- Единый биллинг
- Не нужен VPN из РФ

### 8.3 Популярные модели через OpenRouter

| Модель | ID | Цена за 1M tokens |
|--------|----|--------------------|
| GPT-4o mini | `openai/gpt-4o-mini` | $0.15 |
| GPT-4o | `openai/gpt-4o` | $2.50 |
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` | $3.00 |
| Claude 3 Haiku | `anthropic/claude-3-haiku` | $0.25 |
| Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | $0.10 |
| Llama 3.1 70B | `meta-llama/llama-3.1-70b-instruct` | $0.52 |

---

## 9. Платёжная система — CloudPayments

### 9.1 Регистрация
1. Зайдите на https://cloudpayments.ru → Зарегистрируйтесь как ИП/ООО
2. Подтвердите домен `neuro-bro.ru`
3. Дождитесь модерации (1-3 дня)

### 9.2 Получите ключи
В ЛК CloudPayments → Настройки сайта:
- **Public ID** (начинается с `pk_...`) — публичный, используется в виджете
- **API Secret** — секретный, для проверки подписи webhook

### 9.3 Настройте файлы на хостинге

**Файл `api/payment.php`** — создание платёжной сессии:
```php
$CP_PUBLIC_ID  = 'pk_ВАШ_PUBLIC_ID';
$CP_API_SECRET = 'ВАШ_API_SECRET';
```

**Файл `api/webhook.php`** — обработка уведомлений об оплате:
```php
$CP_API_SECRET       = 'ВАШ_API_SECRET';
$SUPABASE_URL        = 'https://YOUR_PROJECT.supabase.co';
$SUPABASE_SERVICE_KEY = 'ВАШ_SERVICE_ROLE_KEY';
```

> ⚠️ `SUPABASE_SERVICE_KEY` — это **service_role** ключ из Supabase Dashboard → Settings → API.
> Он даёт полный доступ к БД, храните его только на сервере!

### 9.4 Настройте Webhook в ЛК CloudPayments

1. ЛК CloudPayments → **Настройки сайта** → **Уведомления**
2. **Pay (успешная оплата)**:
   - URL: `https://neuro-bro.ru/api/webhook.php`
   - Метод: POST
   - Формат: CloudPayments
   - ✅ Включить проверку HMAC-подписи
3. Сохраните

### 9.5 Как это работает

```
Пользователь нажимает «Купить»
        ↓
dashboard.js → POST /api/payment.php (product_id, user_id, email)
        ↓
payment.php возвращает данные для виджета
        ↓
Открывается виджет CloudPayments (форма оплаты карты)
        ↓
Пользователь оплачивает
        ↓
CloudPayments → POST /api/webhook.php (уведомление)
        ↓
webhook.php проверяет подпись → Supabase RPC add_tokens()
        ↓
Токены зачислены, баланс обновлён ✅
```

### 9.6 Доступные продукты

| ID продукта | Название | Цена | Токены |
|-------------|----------|------|--------|
| `pack_small` | 5,000 токенов | 99₽ | 5,000 |
| `pack_medium` | 20,000 токенов | 299₽ | 20,000 |
| `pack_large` | 50,000 токенов | 699₽ | 50,000 |
| `sub_lite` | Подписка Lite | 299₽/мес | безлимит чата |
| `sub_pro` | Подписка Pro | 599₽/мес | + картинки/видео |
| `sub_ultra` | Подписка Ultra | 999₽/мес | максимум |

### 9.7 Тестирование
1. В ЛК CloudPayments включите **тестовый режим**
2. Используйте тестовую карту: `4242 4242 4242 4242`, срок любой, CVC любой
3. Проверьте что webhook приходит и токены зачисляются
4. После проверки — выключите тестовый режим

### 9.8 Файлы на хостинге
```
api/
├── payment.php    ← создаёт платёж (вставить CP_PUBLIC_ID + CP_API_SECRET)
├── webhook.php    ← принимает уведомления (вставить CP_API_SECRET + SUPABASE ключи)
└── chat.php       ← AI прокси (вставить OPENROUTER_API_KEY)
```

---

## 10. Таблица site_settings

Настройки системы хранятся в таблице `site_settings` и управляются из админ-панели.

| Ключ | Описание | Значение по умолчанию |
|------|----------|----------------------|
| `daily_bonus_amount` | Токенов за ежедневный бонус | 10 |
| `referral_bonus_amount` | Токенов за реферала | 3000 |
| `registration_bonus` | Токенов при регистрации | 100 |
| `chat_token_cost` | Стоимость чат-сообщения | 1 |
| `image_token_cost` | Стоимость генерации картинки | 5 |
| `video_token_cost` | Стоимость генерации видео | 20 |
| `maintenance_mode` | Режим обслуживания | false |
| `demo_mode` | Демо-режим | true |

> Для применения настроек в клиентском коде — загружайте их через `supabase.from("site_settings").select("*")` при инициализации.

---

## 11. Администрирование

### Админ-панель доступна по адресу: `/admin`

**Функции:**
- 📊 **Обзор** — статистика пользователей, токенов, подписок
- 👥 **Пользователи** — поиск, начисление/списание токенов, управление подписками
- 📈 **Транзакции** — полная история транзакций с фильтрами
- 📧 **Рассылка** — отправка email через Resend с шаблонами и фильтрацией аудитории
- ⚙️ **Настройки** — управление параметрами системы (бонусы, стоимости, режимы)

### Назначение нового админа:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'new-admin@email.com';
```

### Снятие прав админа:
```sql
DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@email.com') AND role = 'admin';
```

---

## 12. Чек-лист перед запуском

- [ ] `npm run build` собирается без ошибок
- [ ] `dist/` содержит `index.html` и все ассеты
- [ ] Supabase URL и anon key корректные в `src/lib/supabase.ts`
- [ ] Таблицы `profiles`, `user_roles`, `token_transactions`, `site_settings` созданы
- [ ] RLS-политики установлены
- [ ] Триггер `on_auth_user_created` работает
- [ ] Хранимые процедуры (`add_tokens`, `spend_tokens`, `claim_daily_bonus`) созданы
- [ ] Edge Functions задеплоены (`send-welcome-email`, `send-broadcast`)
- [ ] Секрет `RESEND_API_KEY` установлен в Supabase
- [ ] DNS-записи для `send.neuro-bro.ru` настроены и верифицированы
- [ ] DMARC запись добавлена
- [ ] Назначен хотя бы один админ
- [ ] SSL-сертификат настроен
- [ ] Если подключаете AI — `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` установлены
- [ ] Тестовая регистрация проходит, письмо приходит
- [ ] Админ-панель открывается под админским аккаунтом

---

## Полезные команды

```bash
# Логи Edge Function
supabase functions logs send-welcome-email --project-ref YOUR_PROJECT_REF

# Перезалить функцию
supabase functions deploy send-welcome-email --project-ref YOUR_PROJECT_REF --no-verify-jwt

# Список секретов
supabase secrets list --project-ref YOUR_PROJECT_REF

# Backup базы
pg_dump postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres > backup.sql
```

---

> 📧 Поддержка: Все вопросы — в issue на GitHub или на email администратора.
