import type { ResourceType } from '@/api/types';

export const resourceTypeOptions: { label: string; value: ResourceType }[] = [
  { label: 'Рабочее место', value: 'desk' },
  { label: 'Переговорка', value: 'room' },
  { label: 'Другое', value: 'other' },
];

export function resourceTypeLabel(type: ResourceType): string {
  return resourceTypeOptions.find((o) => o.value === type)?.label ?? type;
}
