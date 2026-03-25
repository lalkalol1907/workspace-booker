import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTenantContextStore } from '@/stores/tenant-context';

const FALLBACK = 'Организация';

/** Заголовок приложения: имя текущей организации. */
export function useOrganizationDisplayName() {
  const auth = useAuthStore();
  const tenant = useTenantContextStore();

  return computed(() => {
    const user = auth.user;
    if (!user) {
      return FALLBACK;
    }
    if (user.role === 'super_admin') {
      const id = tenant.selectedOrgId;
      if (!id) {
        return FALLBACK;
      }
      const name = tenant.organizations.find((o) => o.id === id)?.name;
      return name ?? FALLBACK;
    }
    if (user.organizationName) {
      return user.organizationName;
    }
    return FALLBACK;
  });
}
