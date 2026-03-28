import { isApiError } from './http';

const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  TENANT_NOT_FOUND:
    'Для этого адреса не настроена организация. Откройте приложение по ссылке от администратора.',
  TOKEN_INVALID: 'Сессия истекла — войдите снова',

  // Users
  USER_NOT_FOUND: 'Пользователь не найден',
  USER_ALREADY_EXISTS: 'Пользователь с таким email уже существует',
  CANNOT_MODIFY_SELF: 'Это действие нельзя применить к себе',
  INSUFFICIENT_ROLE: 'Недостаточно прав для этого действия',

  // Platform
  SLUG_TAKEN: 'Этот slug уже занят другой организацией',
  HOST_TAKEN: 'Один из доменов уже используется другой организацией',
  HOST_RESERVED: 'Этот домен зарезервирован для платформы',
  PLATFORM_ADMIN_EMAIL_AMBIGUOUS: 'Найдено несколько пользователей с таким email',

  // General
  VALIDATION_ERROR: 'Ошибка валидации — проверьте введённые данные',
};

/**
 * Возвращает читаемое сообщение об ошибке.
 * Приоритет: errorCode → 5xx → 401/403 без кода → fallback.
 */
export function apiErrorMessage(
  e: unknown,
  fallback = 'Произошла ошибка. Попробуйте ещё раз.',
): string {
  if (e instanceof TypeError) {
    return 'Не удалось подключиться к серверу. Проверьте подключение к сети.';
  }
  if (isApiError(e)) {
    if (e.errorCode && ERROR_MESSAGES[e.errorCode]) {
      return ERROR_MESSAGES[e.errorCode];
    }
    if (e.status >= 500) {
      return 'Ошибка сервера. Попробуйте позже.';
    }
    if (e.status === 401) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    if (e.status === 403) {
      return 'Недостаточно прав для этого действия.';
    }
    if (e.status === 404 && !e.errorCode) {
      return 'Запрашиваемые данные не найдены.';
    }
  }
  return fallback;
}
