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
