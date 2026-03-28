import { registerAs } from '@nestjs/config';

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  /** Отображаемое имя приложения в шапке писем */
  appName: string;
  /** Полный URL страницы входа платформенной админки (для писем новому super_admin). */
  platformLoginUrl: string;
}

export const mailerConfig = registerAs(
  'mailer',
  (): MailerConfig => ({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '"Workspace Booker" <noreply@example.com>',
    appName: process.env.MAIL_APP_NAME ?? 'Бронирование рабочих мест',
    platformLoginUrl: (process.env.PLATFORM_ADMIN_LOGIN_URL ?? '').trim(),
  }),
);
