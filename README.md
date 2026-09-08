# Portfolio — оркестрация

Локальный стек: **nginx-прокси**, **MongoDB**, **лендинг** (Next.js standalone) и демо-SPA под `/demos/<id>/`.

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

## Манифест и sync

1. Папка + `Dockerfile` + `portfolio.project.json`
2. `node scripts/portfolio-sync.mjs`
3. `docker compose up -d --build`

```json
{
  "id": "flowcrm",
  "title": "FlowCRM",
  "demoBase": "/demos/flowcrm",
  "folder": "FlowCRM",
  "stack": ["React", "Vite"],
  "summary": "CRM для воронки продаж",
  "featured": true,
  "status": "online"
}
```

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
