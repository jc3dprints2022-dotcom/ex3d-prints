import { base44 } from '@/api/base44Client';

export async function generateShippingKitLabel({ kitOrderId }: { kitOrderId: string }) {
  return base44.functions.execute('generateShippingKitLabel', { kitOrderId });
}
