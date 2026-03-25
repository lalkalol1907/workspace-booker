import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/** Совпадение CSS media query, обновляется при изменении размера окна. */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true,
  );

  onMounted(() => {
    const mql = window.matchMedia(query);
    const sync = () => {
      matches.value = mql.matches;
    };
    sync();
    mql.addEventListener('change', sync);
    onUnmounted(() => mql.removeEventListener('change', sync));
  });

  return matches;
}

/** Tailwind `md` — основной порог «десктопный» layout. */
export function useIsMdUp(): Ref<boolean> {
  return useMediaQuery('(min-width: 768px)');
}
