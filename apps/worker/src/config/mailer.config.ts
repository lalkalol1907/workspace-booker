import { registerAs } from '@nestjs/config';

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export const mailerConfig = registerAs(
  'mailer',
  (): MailerConfig => ({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '"Workspace Booker" <noreply@example.com>',
  }),
);
