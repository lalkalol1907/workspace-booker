# Workspace Booker

Мультитенантная платформа для бронирования рабочих мест и переговорных комнат.

## Архитектура

Монорепозиторий (pnpm workspaces) с четырьмя приложениями:

```
apps/
├── api/       NestJS REST API (Fastify, TypeORM, PostgreSQL)
├── web/       Vue 3 SPA — интерфейс сотрудников и админов организации
├── admin/     Vue 3 SPA — интерфейс платформенных администраторов
└── worker/    NestJS Worker — обработка очередей и email-уведомления
```

### Стек технологий

**Backend**

| Технология | Назначение |
|------------|------------|
| TypeScript | Язык |
| NestJS + Fastify | HTTP-фреймворк |
| TypeORM | ORM, миграции |
| PostgreSQL | База данных |
| Redis + BullMQ | Очередь задач (уведомления, напоминания) |
| Nodemailer | Отправка email |
| JWT (Passport) | Аутентификация с версионированием токенов |
| Swagger | API-документация (`/api/docs`) |

**Frontend**

| Технология | Назначение |
|------------|------------|
| Vue 3 (Composition API) | UI-фреймворк |
| Vite | Сборка |
| Pinia | State management |
| Tailwind CSS 4 | Стилизация |
| FullCalendar | Календарь бронирований |
| Reka UI | UI-компоненты |
| Lucide | Иконки |
| PWA (Workbox) | Оффлайн-поддержка (web) |

**Инфраструктура**

| Технология | Назначение |
|------------|------------|
| Docker | Контейнеризация (multi-stage builds) |
| Docker Compose | Оркестрация сервисов |
| Nginx | Проксирование API, раздача SPA, SSL |
| GitHub Actions | CI/CD (тесты, сборка образов) |

**Тестирование**

| Технология | Назначение |
|------------|------------|
| Rstest | Unit-тесты API и Worker |
| Vitest | Unit-тесты фронтендов |
| Vue Test Utils | Тестирование Vue-компонентов и composables |

## Функциональность

- **Мультитенантность** — организации с привязкой к доменам, изоляция данных
- **Ролевая модель** — super_admin (платформа), admin (организация), member (сотрудник)
- **Ресурсы** — рабочие места, переговорки, прочее; лимиты по длительности бронирования
- **Бронирования** — создание, отмена, проверка пересечений, календарь
- **Локации** — иерархическая структура помещений
- **Уведомления** — email при создании, отмене и за 15 минут до начала
- **Инвалидация токенов** — версионирование JWT при смене пароля
- **Платформенная панель** — управление организациями и платформенными администраторами

## Быстрый старт

### Требования

- Node.js 25+
- pnpm 10+
- PostgreSQL 15+
- Redis 7+

### Установка

```bash
git clone https://github.com/lalkalol1907/workspace-booker.git
cd workspace-booker
pnpm install
```

### Настройка окружения

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Основные переменные:

| Переменная            | Описание                                    | Пример                                       |
|-----------------------|---------------------------------------------|----------------------------------------------|
| `DATABASE_URL`        | Подключение к PostgreSQL                    | `postgres://user:pass@localhost:5432/booker` |
| `JWT_SECRET`          | Секрет для подписи токенов                  | `my-secret-key`                              |
| `JWT_EXPIRES_IN`      | Время жизни access-токена                   | `15m`                                        |
| `REDIS_URL`           | Подключение к Redis                         | `redis://localhost:6379`                     |
| `DEFAULT_TENANT_HOST` | Хост по умолчанию для тенанта               | `localhost`                                  |
| `PLATFORM_HOST`       | Хост по умолчанию для платформенной админки | `platform.localhost`                         |
| `SMTP_HOST`           | SMTP-сервер                                 | `smtp.example.com`                           |
| `SMTP_PORT`           | Порт SMTP                                   | `587`                                        |
| `SMTP_USER`           | Логин SMTP                                  |                                              |
| `SMTP_PASS`           | Пароль SMTP                                 |                                              |
| `SMTP_FROM`           | Адрес отправителя                           | `noreply@example.com`                        |

### Запуск в dev-режиме

```bash
# API
pnpm --filter api run start:dev

# Web
pnpm --filter web run dev

# Admin
pnpm --filter admin run dev

# Worker
pnpm --filter worker run start:dev
```

### Тесты

```bash
# Все тесты
pnpm test

# С покрытием
pnpm test:cov

# Отдельное приложение
pnpm --filter api run test
pnpm --filter web run test
```

### Линтинг

```bash
pnpm lint
pnpm lint:fix
```

## Docker

### Сборка образов

```bash
docker build --target api -t workspace-booker-api .
docker build --target web -t workspace-booker-web .
docker build --target worker -t workspace-booker-worker .
```

### Запуск через Docker Compose

```bash
cp .env.example .env
# Заполнить .env

docker compose up -d
```

Сервисы:

| Сервис | Порт | Описание |
|--------|------|----------|
| `api` | 3000 | REST API |
| `web` | 80/443 | Nginx: web SPA + admin SPA + API proxy |
| `worker` | — | Обработчик очередей |
| `postgres` | 5432 | База данных |
| `redis` | 6379 | Очередь задач |

Nginx маршрутизирует запросы:
- Основной домен → web SPA (интерфейс организации)
- `PLATFORM_HOST` → admin SPA (платформенная панель)
- `/api/*` → API сервер

## CI/CD

| Workflow | Триггер | Описание |
|----------|---------|----------|
| **Test** | Любой push, PR | Запуск тестов с покрытием |
| **Build** | Тег `v*` | Сборка и push Docker-образов в Docker Hub |

## API-документация

При запущенном API доступна по адресу: `http://localhost:3000/api/docs` (Swagger UI).

## Структура базы данных

```
organizations ──< organization_hosts
      │
      ├──< users
      ├──< locations
      └──< resources ──< bookings ──> users
```

## Лицензия

ISC
