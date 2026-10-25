// Número comercial vem da variável NEXT_PUBLIC_WHATSAPP (somente dígitos, com DDI+DDD).
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '558195427772';

export function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}
