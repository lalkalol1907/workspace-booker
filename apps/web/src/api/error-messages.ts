import { isApiError } from './http';

const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  TENANT_NOT_FOUND:
    'Для этого адреса не настроена организация. Откройте приложение по ссылке от администратора.',
  INCORRECT_CURRENT_PASSWORD: 'Неверный текущий пароль',
  SAME_PASSWORD: 'Новый пароль совпадает с текущим',
  TOKEN_INVALID: 'Сессия истекла — войдите снова',

  // Bookings
  BOOKING_NOT_FOUND: 'Бронирование не найдено',
  BOOKING_FORBIDDEN: 'Нет прав на управление этим бронированием',
  BOOKING_CONFLICT: 'Это время уже занято — выберите другой слот',
  BOOKING_DURATION_EXCEEDED: 'Превышена максимальная длительность брони для этого ресурса',
  BOOKING_NOT_EDITABLE: 'Нельзя изменить отменённое бронирование',
  RESOURCE_NOT_AVAILABLE: 'Ресурс недоступен для бронирования',

  // Users
  USER_NOT_FOUND: 'Пользователь не найден',
  USER_ALREADY_EXISTS: 'Пользователь с таким email уже существует',
  CANNOT_MODIFY_SELF: 'Это действие нельзя применить к себе',
  INSUFFICIENT_ROLE: 'Недостаточно прав для этого действия',

  // Locations
  LOCATION_NOT_FOUND: 'Локация не найдена',
  LOCATION_HAS_DEPENDENTS: 'Нельзя удалить: сначала удалите дочерние локации и привязанные ресурсы',
  LOCATION_PARENT_NOT_FOUND: 'Родительская локация не найдена',

  // Resources
  RESOURCE_NOT_FOUND: 'Ресурс не найден',

  // Platform
  SLUG_TAKEN: 'Этот slug уже занят другой организацией',
  HOST_TAKEN: 'Один из доменов уже используется другой организацией',
  HOST_RESERVED:
    'Этот домен зарезервирован для платформы, лендинга или служебного хоста',
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
