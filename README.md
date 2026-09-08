# portfolio-stack

Оркестрация портфолио: **nginx-прокси**, **MongoDB**, **лендинг** (Next.js standalone) и демо-SPA под `/demos/<id>/`.

Публичный домен: `igor-edison-personal.ru` (локально — `http://localhost`).

## Архитектура

```
Visitor → proxy (nginx :80)
            ├─ /                    → landing:3000
            ├─ /demos/flowcrm/      → demo-flowcrm
            └─ /demos/shopadmin/    → demo-shopadmin

landing → mongo
landing → Telegram Bot API (опционально)
landing ← ./:/projects:ro  (*/portfolio.project.json)
```

Дочерние репо (`igor-edison-personal`, `FlowCRM`, `ShopAdmiin`) — отдельные git; корень — только compose / proxy / sync.  
`igor_edison_back` удалён (API внутри Next).

## Быстрый старт

```bash
cp .env.example .env
# ADMIN_SECRET обязателен для /api/requests; BOT_TOKEN / CHAT_ID — по желанию

node scripts/portfolio-sync.mjs
docker compose up -d --build
```

| Проверка | Ожидание |
|----------|----------|
| http://localhost/ | SSR лендинг |
| `/en/`, `/de/` | локали |
| `/api/projects/` | JSON манифестов |
| `/api/requests/` без секрета | 401 |
| `/demos/flowcrm/`, `/demos/shopadmin/` | SPA + F5 на вложенном пути |
| `/sitemap.xml`, `/robots.txt` | SEO |

Остановка: `docker compose down`.

## Новый проект (только папка + конфиг)

Лендинг не знает о проектах заранее: карточка, кейс и демо берутся из папки проекта.

1. Папка рядом с корнем + запись в `.gitignore` корня  
2. `portfolio.project.json` (`show`, опционально `case` для View case)  
3. `Dockerfile` + `nginx.conf`, Vite `base: '/demos/<id>/'`  
4. `node scripts/portfolio-sync.mjs`  
5. `docker compose up -d --build`

```json
{
  "id": "flowcrm",
  "title": "FlowCRM",
  "demoBase": "/demos/flowcrm",
  "folder": "FlowCRM",
  "stack": ["React", "Vite"],
  "summary": "CRM для воронки продаж",
  "show": true,
  "featured": true,
  "status": "online",
  "case": {
    "ru": {
      "summary": "…",
      "problem": "…",
      "solution": "…",
      "result": "…",
      "metaTitle": "…",
      "metaDescription": "…"
    },
    "en": {},
    "de": {}
  }
}
```

| Поле | Эффект |
|------|--------|
| `show: false` | карточка скрыта, демо в proxy может остаться |
| без `case` | только демо, кнопки View case нет |
| с `case.ru/en/de` | страница `/work/<id>` |

Без `Dockerfile` — заглушка `503` на `/demos/<id>/`. С ним — сервис `demo-<id>`, `proxy_pass` со strip префикса.

## Файлы

| Путь | Назначение |
|------|------------|
| `docker-compose.yml` | proxy, mongo, landing |
| `docker-compose.demos.generated.yml` | демо (sync) |
| `proxy/nginx.conf` | `/` + include демо |
| `proxy/demos.generated.conf` | `/demos/...` (sync) |
| `scripts/portfolio-sync.mjs` | генерация по манифестам |
| `.env.example` | mongo, telegram, admin, порт |

## Env

| Переменная | Описание |
|------------|----------|
| `PROXY_PORT` | внешний порт nginx (80) |
| `MONGO_URI` | `mongodb://mongo:27017` в compose |
| `MONGO_DB` | имя БД |
| `BOT_TOKEN` / `CHAT_ID` | Telegram |
| `ADMIN_SECRET` | заголовок `x-admin-secret` для `/api/requests` |
| `DOMAIN` | публичный домен |

## Admin

```bash
curl -H "x-admin-secret: $ADMIN_SECRET" http://localhost/api/requests/
```

## Дальше

- Карточки Kwork / Upwork (заказ через биржи) — отдельная итерация
