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

**Монорепозиторий**

| Технология | Назначение |
|------------|------------|
| pnpm (workspaces) | Пакеты и зависимости между `apps/*` |
| TypeScript 5.9+ (web/admin), 5.7+ (api/worker) | Язык |
| ESLint 9 + typescript-eslint + eslint-plugin-vue | Линтинг |
| Prettier | Форматирование (через ESLint) |

**API (`apps/api`)**

| Технология | Назначение |
|------------|------------|
| NestJS 11 | Модульный бэкенд |
| Fastify 5 | HTTP-адаптер |
| TypeORM | ORM, сущности PostgreSQL |
| class-validator / class-transformer | DTO и валидация |
| Passport JWT | Аутентификация |
| bcrypt | Хэширование паролей |
| `@nestjs/jwt`, `@nestjs/swagger` | JWT и OpenAPI (Swagger UI на `/api/docs`) |
| `@nestjs/bullmq`, BullMQ, ioredis | Постановка задач в Redis |
| `package.json` `exports` | Публичные пути к сущностям и enum для воркера |

**Worker (`apps/worker`)**

| Технология | Назначение |
|------------|------------|
| NestJS (application context) | Точка входа без HTTP |
| TypeORM | Те же сущности, что у API (workspace-зависимость `api`) |
| BullMQ | Потребление очереди `booking-notifications` |
| `@nestjs-modules/mailer`, Nodemailer | Отправка писем по SMTP |
| EJS | HTML- и текстовые шаблоны писем |
| Зависимость `api` | Типы сущностей и enum без дублирования модели |

Обработчики очереди помимо писем обновляют статусы бронирований (например, переход в «идёт сейчас» по `startsAt` и в «завершена» по `endsAt`).

**Web (`apps/web`)**

| Технология | Назначение |
|------------|------------|
| Vue 3, Vue Router 5 | SPA |
| Vite 8 | Сборка и dev-сервер |
| Pinia | Состояние |
| Tailwind CSS 4 + `@tailwindcss/vite` | Стили |
| FullCalendar 6 + `@fullcalendar/vue3` | Календарь |
| `tw-animate-css` | Готовые анимации под Tailwind |
| Reka UI, class-variance-authority, clsx, tailwind-merge | UI и утилиты классов |
| Lucide Vue | Иконки |
| vue-sonner | Тосты |
| vite-plugin-pwa, Workbox | PWA |
| Vitest 4, Vue Test Utils, happy-dom, `@pinia/testing` | Тесты |

**Admin (`apps/admin`)**

| Технология | Назначение |
|------------|------------|
| Vue 3, Vite, Pinia, Tailwind 4, Reka UI | Как у web, без FullCalendar и PWA |
| Vitest, Vue Test Utils, happy-dom, `@pinia/testing` | Тесты |

**Инфраструктура**

| Технология | Назначение |
|------------|------------|
| Docker (multi-stage) | Образы `api`, `web` (nginx + статика), `worker` |
| Docker Compose | PostgreSQL, Redis, api, web, worker |
| Nginx (в образе web) | Статика SPA, прокси `/api`, отдельный хост админки |
| GitHub Actions | `test` (push/PR), `build` (теги `v*`, Docker Hub) |

**Тестирование**

| Технология | Назначение |
|------------|------------|
| Rstest (`@rstest/core`, покрытие Istanbul) | Unit-тесты `api` и `worker` |
| Vitest + v8 coverage | Unit-тесты `web` и `admin` |
| Vue Test Utils | Монтирование компонентов и composables |
| happy-dom | DOM в тестах фронтенда |

## Функциональность

- **Мультитенантность** — организации с привязкой к доменам, изоляция данных
- **Ролевая модель** — super_admin (платформа), admin (организация), member (сотрудник)
- **Ресурсы** — рабочие места, переговорки, прочее; лимиты по длительности бронирования
- **Бронирования** — создание, редактирование времени и названия, отмена, проверка пересечений по активным слотам, календарь; статусы: подтверждена, идёт сейчас, завершена, отменена
- **Локации** — иерархическая структура помещений
- **Уведомления** — письма (HTML/text, шаблоны EJS) при создании, отмене, за 15 минут до начала, за 15 минут до конца и по окончании слота; отложенные задачи BullMQ пересчитываются при смене времени брони
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
| `MAIL_APP_NAME`       | Имя в шапке писем (worker)                  | `Бронирование рабочих мест`                  |

### Запуск в dev-режиме

```bash
# API
pnpm --filter api run start:dev

# Web
pnpm --filter web run dev

# Admin
pnpm --filter admin run dev

# Worker (сначала соберите API — worker подключает скомпилированные сущности из пакета `api`)
pnpm --filter api run build
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

### Миграции SQL (продакшен)

В `apps/api/migrations/` лежат **ручные** SQL-скрипты для окружений с отключённым `synchronize` у TypeORM (см. `postgres.config.ts`). Их нужно выполнять на базе при изменении схемы, которую синхронизация в dev подхватывает сама (например, новые значения enum PostgreSQL). Порядок и содержание — в комментариях внутри файлов.

## Лицензия

ISC
