// Nhận diện máy yếu để tắt bớt hiệu ứng nặng (blur, animation vô hạn...)
let cached: boolean | null = null;
export function isLiteDevice(): boolean {
  if (cached !== null) return cached;
  try {
    const nav: any = navigator;
    const cores = nav.hardwareConcurrency || 8;
    const mem = nav.deviceMemory || 8;
    const saveData = !!nav.connection?.saveData;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cached = cores <= 4 || mem <= 4 || saveData || !!reduce;
  } catch { cached = false; }
  return cached;
}
