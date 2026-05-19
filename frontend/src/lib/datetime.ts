const IST_TIMEZONE = "Asia/Kolkata";

export const getISTDateString = (value?: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value || new Date());

export const getISTMonthKey = (value?: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value || new Date());
  const year = parts.find((p) => p.type === "year")?.value || "0000";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  return `${year}-${month}`;
};

export const formatISTLongDate = (value?: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value || new Date());

/** Hour in Asia/Kolkata (0–23), independent of browser local timezone. */
export const getISTHour = (value?: Date): number => {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(value || new Date()).find((p) => p.type === "hour")?.value;
  return Number(hourPart ?? 0);
};

/**
 * Dashboard title greeting in IST.
 * 5:00–11:59 morning · 12:00–16:59 afternoon · 17:00–22:59 evening
 * 23:00–4:59 late-night recovery message
 */
export const getDashboardGreetingTitle = (
  firstName: string,
  fallbackName = "there",
): string => {
  const name = firstName.trim() || fallbackName;
  const hour = getISTHour();

  if (hour >= 23 || hour < 5) {
    return `Get some sleep ${name}, sleep is important for recovery`;
  }
  if (hour < 12) {
    return `Good morning, ${name}`;
  }
  if (hour < 17) {
    return `Good afternoon, ${name}`;
  }
  return `Good evening, ${name}`;
};
