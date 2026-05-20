const INDIA_COUNTRY_CODE = "91";

/** Digits for wa.me — prepends 91 when the number is a local 10-digit Indian mobile. */
export const normalizeWhatsAppDigits = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(INDIA_COUNTRY_CODE) && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `${INDIA_COUNTRY_CODE}${digits.slice(1)}`;
  if (digits.length === 10) return `${INDIA_COUNTRY_CODE}${digits}`;
  return digits;
};

export const whatsAppUrl = (phone: string, message: string): string =>
  `https://wa.me/${normalizeWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;
