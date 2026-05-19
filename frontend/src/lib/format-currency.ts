/** Typography tokens as Unicode escapes — avoids mojibake when files are saved as non-UTF-8. */
export const EM_DASH = "\u2014";
export const MIDDLE_DOT = "\u00b7";
export const ELLIPSIS = "\u2026";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatterWithDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format amount as Indian Rupees (e.g. "₹12,345"). */
export function formatInr(amount: number, options?: { decimals?: boolean }): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return inrFormatter.format(0);
  }
  return options?.decimals ? inrFormatterWithDecimals.format(value) : inrFormatter.format(value);
}
