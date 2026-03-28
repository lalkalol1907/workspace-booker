import { HttpErrorResponse } from '@angular/common/http';
import { parseErrorCodeFromBody } from './api-error';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  TENANT_NOT_FOUND:
    'Для этого адреса не настроена организация. Откройте приложение по ссылке от администратора.',
  TOKEN_INVALID: 'Сессия истекла — войдите снова',
  USER_NOT_FOUND: 'Пользователь не найден',
  USER_ALREADY_EXISTS: 'Пользователь с таким email уже существует',
  INSUFFICIENT_ROLE: 'Недостаточно прав для этого действия',
  SLUG_TAKEN: 'Этот slug уже занят другой организацией',
  HOST_TAKEN: 'Один из доменов уже используется другой организацией',
  HOST_RESERVED:
    'Этот домен зарезервирован для платформы, лендинга или служебного хоста',
  PLATFORM_ADMIN_EMAIL_AMBIGUOUS: 'Найдено несколько пользователей с таким email',
  VALIDATION_ERROR: 'Ошибка валидации — проверьте введённые данные',
};

export function apiErrorMessage(
  e: unknown,
  fallback = 'Произошла ошибка. Попробуйте ещё раз.',
): string {
  if (e instanceof HttpErrorResponse) {
    const code = parseErrorCodeFromBody(e.error);
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
    if (e.status >= 500) {
      return 'Ошибка сервера. Попробуйте позже.';
    }
    if (e.status === 401) {
      return ERROR_MESSAGES['INVALID_CREDENTIALS'];
    }
    if (e.status === 403) {
      return 'Недостаточно прав для этого действия.';
    }
    if (e.status === 404 && !code) {
      return 'Запрашиваемые данные не найдены.';
    }
  }
  return fallback;
}
