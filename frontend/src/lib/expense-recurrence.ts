import { getISTDateString, getISTMonthKey } from "@/lib/datetime";

export type RecurrenceInterval =
  | "one_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type AmountMode = "fixed" | "varied";

export const RECURRENCE_OPTIONS: {
  value: RecurrenceInterval;
  label: string;
  hint: string;
}[] = [
  { value: "one_time", label: "One-time", hint: "e.g. protein stock, equipment" },
  { value: "daily", label: "Daily", hint: "e.g. daily supplies" },
  { value: "weekly", label: "Weekly", hint: "e.g. weekly cleaning" },
  { value: "monthly", label: "Monthly", hint: "e.g. rent, salary, utilities" },
  { value: "quarterly", label: "Quarterly", hint: "e.g. quarterly maintenance" },
  { value: "yearly", label: "Yearly", hint: "e.g. annual insurance" },
];

export const CATEGORY_PRESETS = [
  "Rent",
  "Salary",
  "Electricity",
  "Water",
  "Maintenance",
  "Protein",
  "Misc",
] as const;

export const API_EXPENSE_CATEGORIES = ["Rent", "Electricity", "Water", "Maintenance", "Misc"] as const;

export type ApiExpenseCategory = (typeof API_EXPENSE_CATEGORIES)[number];

export const resolveExpenseCategoryForApi = (
  label: string,
): { category: ApiExpenseCategory; notesExtra?: string } => {
  if ((API_EXPENSE_CATEGORIES as readonly string[]).includes(label)) {
    return { category: label as ApiExpenseCategory };
  }
  return { category: "Misc", notesExtra: `label:${label}` };
};

export const CATEGORY_DEFAULT_RECURRENCE: Record<string, RecurrenceInterval> = {
  Rent: "monthly",
  Salary: "monthly",
  Electricity: "monthly",
  Water: "monthly",
  Maintenance: "monthly",
  Protein: "one_time",
  Misc: "one_time",
};

export const VARIABLE_MONTHLY_PRESETS = ["Electricity", "Water"] as const;

const RECURRENCE_PREFIX = "recurrence:";

export type RecurrenceNoteMeta = {
  amountMode?: AmountMode;
  defaultAmount?: number;
};

export const encodeRecurrenceNote = (
  interval: RecurrenceInterval,
  extra?: string,
  meta?: RecurrenceNoteMeta,
): string | undefined => {
  const parts: string[] = [];
  if (extra) parts.push(extra);
  if (meta?.amountMode) parts.push(`amountMode:${meta.amountMode}`);
  if (meta?.defaultAmount != null && meta.defaultAmount > 0) {
    parts.push(`defaultAmount:${meta.defaultAmount}`);
  }
  if (interval !== "one_time") parts.push(`${RECURRENCE_PREFIX}${interval}`);
  return parts.length ? parts.join(";") : undefined;
};

export const parseRecurrenceMeta = (notes?: string | null): RecurrenceNoteMeta => {
  if (!notes) return {};
  const amountMode = notes.match(/amountMode:(fixed|varied)/)?.[1] as AmountMode | undefined;
  const defaultAmountRaw = notes.match(/defaultAmount:([\d.]+)/)?.[1];
  const defaultAmount = defaultAmountRaw ? Number(defaultAmountRaw) : undefined;
  return {
    amountMode,
    defaultAmount: Number.isFinite(defaultAmount) ? defaultAmount : undefined,
  };
};

export const displayCategoryLabel = (category: string, notes?: string | null): string => {
  const labelMatch = notes?.match(/label:([^;]+)/);
  return labelMatch?.[1] || category;
};

export const parseRecurrenceFromNotes = (notes?: string | null): RecurrenceInterval => {
  if (!notes) return "one_time";
  const match = notes.match(/recurrence:(one_time|daily|weekly|monthly|quarterly|yearly)/);
  return (match?.[1] as RecurrenceInterval) || "one_time";
};

export const formatRecurrenceLabel = (interval: RecurrenceInterval, recurring: boolean): string => {
  if (!recurring && interval === "one_time") return "One-time";
  const option = RECURRENCE_OPTIONS.find((o) => o.value === interval);
  return option?.label ?? "Recurring";
};

export const getPeriodKeyForInterval = (interval: RecurrenceInterval, dateStr?: string): string => {
  const iso = dateStr || getISTDateString();
  const [year, month, day] = iso.split("-").map(Number);

  switch (interval) {
    case "daily":
      return iso;
    case "weekly": {
      const utc = new Date(Date.UTC(year, month - 1, day));
      const dayNum = utc.getUTCDay() || 7;
      utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    }
    case "monthly":
      return getISTMonthKey(new Date(`${iso}T12:00:00`));
    case "quarterly": {
      const q = Math.ceil(month / 3);
      return `${year}-Q${q}`;
    }
    case "yearly":
      return String(year);
    default:
      return iso;
  }
};

export const formatLogPeriodLabel = (interval: RecurrenceInterval): string => {
  switch (interval) {
    case "daily":
      return "today";
    case "weekly":
      return "this week";
    case "monthly":
      return "this month";
    case "quarterly":
      return "this quarter";
    case "yearly":
      return "this year";
    default:
      return "now";
  }
};

export type RecurringBillTemplate = {
  id: string;
  displayLabel: string;
  formCategory: string;
  interval: RecurrenceInterval;
  lastAmount?: number;
  lastDate?: string;
  amountMode?: AmountMode;
  defaultAmount?: number;
};

export const buildRecurringBillTemplates = (expenses: {
  category: string;
  amount: number;
  date: string;
  recurring: boolean;
  notes?: string | null;
}[]): RecurringBillTemplate[] => {
  const byLabel = new Map<string, RecurringBillTemplate>();

  const upsert = (entry: RecurringBillTemplate, date: string) => {
    const existing = byLabel.get(entry.displayLabel);
    if (!existing || date > (existing.lastDate || "")) {
      byLabel.set(entry.displayLabel, entry);
    } else if (existing && date === existing.lastDate) {
      byLabel.set(entry.displayLabel, { ...existing, ...entry, lastDate: date });
    }
  };

  for (const e of expenses) {
    const interval = parseRecurrenceFromNotes(e.notes);
    if (!e.recurring && interval === "one_time") continue;
    const displayLabel = displayCategoryLabel(e.category, e.notes);
    const meta = parseRecurrenceMeta(e.notes);
    upsert(
      {
        id: displayLabel,
        displayLabel,
        formCategory: displayLabel,
        interval,
        lastAmount: e.amount,
        lastDate: e.date,
        amountMode:
          meta.amountMode ??
          ((VARIABLE_MONTHLY_PRESETS as readonly string[]).includes(displayLabel)
            ? "varied"
            : displayLabel === "Rent" || displayLabel === "Salary"
              ? "fixed"
              : undefined),
        defaultAmount: meta.defaultAmount,
      },
      e.date,
    );
  }

  for (const preset of VARIABLE_MONTHLY_PRESETS) {
    if (!byLabel.has(preset)) {
      byLabel.set(preset, {
        id: preset,
        displayLabel: preset,
        formCategory: preset,
        interval: CATEGORY_DEFAULT_RECURRENCE[preset] ?? "monthly",
        amountMode: "varied",
      });
    }
  }

  return [...byLabel.values()]
    .filter((t) => t.interval !== "one_time")
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
};

export const isBillLoggedInPeriod = (
  expenses: { category: string; date: string; notes?: string | null }[],
  displayLabel: string,
  interval: RecurrenceInterval,
  periodKey?: string,
) => {
  const key = periodKey ?? getPeriodKeyForInterval(interval);
  return expenses.some((e) => {
    if (displayCategoryLabel(e.category, e.notes) !== displayLabel) return false;
    const eInterval = parseRecurrenceFromNotes(e.notes);
    if (eInterval !== interval) return false;
    return getPeriodKeyForInterval(interval, e.date) === key;
  });
};

export const getDefaultLogAmount = (template: RecurringBillTemplate): string => {
  if (template.amountMode === "fixed" && template.defaultAmount != null) {
    return String(template.defaultAmount);
  }
  if (template.lastAmount != null) {
    return String(template.lastAmount);
  }
  return "";
};

/** @deprecated use isBillLoggedInPeriod */
export const isBillLoggedThisMonth = (
  expenses: { category: string; date: string; notes?: string | null }[],
  displayLabel: string,
  monthPrefix: string,
) =>
  expenses.some(
    (e) => displayCategoryLabel(e.category, e.notes) === displayLabel && e.date.startsWith(monthPrefix),
  );
