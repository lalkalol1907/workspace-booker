/** Инициалы для аватара из отображаемого имени. */
export function userInitialsFromDisplayName(
  name: string | undefined | null,
): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return '?';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)
    ).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
