import * as ejs from 'ejs';
import { join } from 'node:path';

/** Обходим named export ejs + promisify — в бандлере (rstest) renderFile бывает undefined. */
function renderFileAsync(
  path: string,
  data: BookingMailViewModel,
  opts: { views: string[] },
): Promise<string> {
  return new Promise((resolve, reject) => {
    ejs.renderFile(path, data, opts, (err, str) => {
      if (err) reject(err);
      else resolve(str ?? '');
    });
  });
}

export type BookingMailKind =
  | 'created'
  | 'reminder'
  | 'ending_soon'
  | 'ended'
  | 'cancelled';

export interface BookingMailViewModel {
  appName: string;
  pageTitle: string;
  headline: string;
  intro: string;
  badgeLabel: string;
  badgeBg: string;
  userName: string;
  resourceName: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

const SUBJECTS: Record<BookingMailKind, string> = {
  created: 'Бронирование подтверждено',
  reminder: 'Напоминание: бронирование через 15 минут',
  ending_soon: 'Скоро окончание бронирования',
  ended: 'Бронирование завершилось',
  cancelled: 'Бронирование отменено',
};

const KIND_META: Record<
  BookingMailKind,
  { headline: string; intro: string; badgeLabel: string; badgeBg: string }
> = {
  created: {
    headline: 'Бронирование подтверждено',
    intro:
      'Мы записали вашу встречу. Ниже детали — при необходимости перешлите письмо коллегам.',
    badgeLabel: 'Подтверждено',
    badgeBg: '#059669',
  },
  reminder: {
    headline: 'Скоро начало',
    intro:
      'Через 15 минут начнётся забронированное время — успейте занять ресурс или подключиться к звонку.',
    badgeLabel: '15 минут',
    badgeBg: '#d97706',
  },
  cancelled: {
    headline: 'Бронирование отменено',
    intro:
      'Слот снова доступен для других коллег. При необходимости выберите новое время в календаре.',
    badgeLabel: 'Отменено',
    badgeBg: '#64748b',
  },
  ending_soon: {
    headline: 'Скоро окончание слота',
    intro:
      'Через 15 минут закончится забронированное время — освободите ресурс или продлите бронь в календаре, если это возможно.',
    badgeLabel: '15 минут до конца',
    badgeBg: '#ea580c',
  },
  ended: {
    headline: 'Время бронирования истекло',
    intro:
      'Забронированный слот завершён. Ресурс снова доступен другим коллегам.',
    badgeLabel: 'Завершено',
    badgeBg: '#475569',
  },
};

export function bookingMailSubject(kind: BookingMailKind): string {
  return SUBJECTS[kind];
}

export function buildBookingMailViewModel(
  kind: BookingMailKind,
  params: {
    appName: string;
    userName: string;
    resourceName: string;
    title: string;
    startsAt: string;
    endsAt: string;
  },
): BookingMailViewModel {
  const meta = KIND_META[kind];
  return {
    appName: params.appName,
    pageTitle: SUBJECTS[kind],
    headline: meta.headline,
    intro: meta.intro,
    badgeLabel: meta.badgeLabel,
    badgeBg: meta.badgeBg,
    userName: params.userName,
    resourceName: params.resourceName,
    title: params.title,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  };
}

export async function renderBookingMail(
  kind: BookingMailKind,
  viewModel: BookingMailViewModel,
): Promise<{ html: string; text: string }> {
  const root = join(__dirname, '..', 'templates');
  const opts = { views: [root] };
  const base = `booking-${kind}`;
  const [html, text] = await Promise.all([
    renderFileAsync(join(root, `${base}.ejs`), viewModel, opts),
    renderFileAsync(join(root, `${base}.text.ejs`), viewModel, opts),
  ]);
  return { html, text };
}
