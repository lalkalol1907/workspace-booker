import * as ejs from 'ejs';
import { join } from 'node:path';
import type { MailerConfig } from '../config/mailer.config';

function renderFileAsync(
  path: string,
  data: PlatformAdminWelcomeViewModel,
  opts: { views: string[] },
): Promise<string> {
  return new Promise((resolve, reject) => {
    ejs.renderFile(path, data, opts, (err, str) => {
      if (err) reject(err);
      else resolve(str ?? '');
    });
  });
}

export interface PlatformAdminWelcomeViewModel {
  appName: string;
  pageTitle: string;
  headline: string;
  intro: string;
  badgeLabel: string;
  badgeBg: string;
  displayName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

const SUBJECT = 'Доступ к панели платформы';

export function platformAdminWelcomeSubject(): string {
  return SUBJECT;
}

export function buildPlatformAdminWelcomeViewModel(
  mail: MailerConfig,
  params: {
    displayName: string;
    email: string;
    temporaryPassword: string;
  },
): PlatformAdminWelcomeViewModel {
  return {
    appName: mail.appName,
    pageTitle: SUBJECT,
    headline: 'Вы добавлены как администратор платформы',
    intro:
      'Используйте email и временный пароль ниже. При первом входе система попросит задать новый пароль.',
    badgeLabel: 'Новый доступ',
    badgeBg: '#059669',
    displayName: params.displayName,
    email: params.email,
    temporaryPassword: params.temporaryPassword,
    loginUrl: mail.platformLoginUrl,
  };
}

export async function renderPlatformAdminWelcomeMail(
  viewModel: PlatformAdminWelcomeViewModel,
): Promise<{ html: string; text: string }> {
  const root = join(__dirname, '..', 'templates');
  const opts = { views: [root] };
  const base = 'platform-admin-welcome';
  const [html, text] = await Promise.all([
    renderFileAsync(join(root, `${base}.ejs`), viewModel, opts),
    renderFileAsync(join(root, `${base}.text.ejs`), viewModel, opts),
  ]);
  return { html, text };
}
