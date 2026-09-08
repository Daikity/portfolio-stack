# Portfolio — оркестрация

Локальный стек портфолио: **nginx-прокси**, **MongoDB**, **лендинг** (Next.js) и демо-SPA под `/demos/<id>/`.

Домен входа: `igor-edison-personal.ru` (локально — `http://localhost`).

## Архитектура

```
Visitor → proxy (nginx :80)
            ├─ /              → landing:3000 (Next standalone)
            ├─ /demos/flowcrm/   → demo-flowcrm (этап 5)
            └─ /demos/shopadmin/ → demo-shopadmin (этап 5)

landing → mongo
landing → Telegram Bot API (опционально)
landing ← volume ./:/projects:ro  (читает */portfolio.project.json)
```

Дочерние репозитории (`igor-edison-personal`, `FlowCRM`, `ShopAdmiin`) остаются отдельными; этот корень — только compose / proxy / sync (gitignore на папки приложений).

## Быстрый старт

```bash
cp .env.example .env
# заполнить ADMIN_SECRET, при необходимости BOT_TOKEN / CHAT_ID

node scripts/portfolio-sync.mjs
docker compose up -d --build
```

Открыть: [http://localhost](http://localhost) (или `PROXY_PORT` из `.env`).

Проверки:

- лендинг отдаёт HTML на `/`, `/en/`, `/de/`
- `GET /api/projects` — список из манифестов
- `GET /api/requests` без `x-admin-secret` → 401
- Mongo: контейнер `portfolio-mongo-1` в `Up`

Остановка: `docker compose down`.

## Добавить демо-проект

1. Папка в корне + `Dockerfile` + `portfolio.project.json`
2. `node scripts/portfolio-sync.mjs` — обновит nginx и compose-фрагмент
3. `docker compose up -d --build`

Пример манифеста:

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

Пока нет `Dockerfile`, sync пишет заглушку `503` на `/demos/<id>/` (демо подключаются на этапе 5).

## Файлы

| Путь | Назначение |
|------|------------|
| `docker-compose.yml` | proxy, mongo, landing |
| `docker-compose.demos.generated.yml` | сервисы демо (sync) |
| `proxy/nginx.conf` | маршруты `/` и include демо |
| `proxy/demos.generated.conf` | location `/demos/...` (sync) |
| `scripts/portfolio-sync.mjs` | генерация по манифестам |
| `.env.example` | mongo, telegram, admin, порт |

## Env

| Переменная | Описание |
|------------|----------|
| `PROXY_PORT` | внешний порт nginx (по умолчанию 80) |
| `MONGO_URI` | для лендинга, в compose: `mongodb://mongo:27017` |
| `MONGO_DB` | имя БД |
| `BOT_TOKEN` / `CHAT_ID` | Telegram |
| `ADMIN_SECRET` | заголовок `x-admin-secret` для `/api/requests` |
| `DOMAIN` | публичный домен (документация) |

## Дальше

- Этап 5: Dockerfile + `base`/`basename` для FlowCRM и ShopAdmiin
- Карточки Kwork / Upwork (заказ через биржи) — отдельная итерация
