import type { ReactNode } from 'react';

function FeatureCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Workspace Booker
          </span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">
            Бронирование рабочих мест
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Места и переговорки — в одном календаре
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            Мультитенантная платформа для команд: роли, локации, напоминания по
            почте и прозрачные статусы бронирований.
          </p>
          <div className="mt-10">
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Возможности
            </a>
          </div>
        </section>

        <section
          id="features"
          className="border-t border-slate-200/80 bg-white/50 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Что внутри
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Всё необходимое для организации офиса или коворкинга без лишней
              бюрократии.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard title="Мультитенантность">
                Организации с привязкой к доменам и изоляцией данных — удобно
                для партнёров и филиалов.
              </FeatureCard>
              <FeatureCard title="Роли">
                От сотрудника до администратора организации и платформенного
                супер-админа — понятная модель доступа.
              </FeatureCard>
              <FeatureCard title="Календарь и слоты">
                Переговорки и рабочие места в одном виде: пересечения и статусы
                под контролем.
              </FeatureCard>
              <FeatureCard title="Уведомления">
                Письма при создании и отмене брони, напоминания до начала и
                окончания слота.
              </FeatureCard>
              <FeatureCard title="Локации">
                Иерархия помещений — проще ориентироваться в крупных офисах.
              </FeatureCard>
              <FeatureCard title="Безопасность">
                JWT и инвалидация сессий при смене пароля — привычный уровень для
                корпоративного контура.
              </FeatureCard>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-slate-900 px-8 py-12 text-center shadow-xl sm:px-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Доступ для вашей организации
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-indigo-100">
              Вход выполняется на домене вашей организации — адрес выдаёт
              администратор. Эта страница только знакомит с возможностями
              платформы.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-slate-50/80 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-slate-500 sm:px-6">
          Workspace Booker — платформа бронирования рабочих мест и переговорных
          комнат.
        </div>
      </footer>
    </div>
  );
}
