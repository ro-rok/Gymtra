import { CalendarPlus, Pencil, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { createExpenseRequest, listExpensesRequest, updateExpenseRequest } from "@/lib/expenses-api";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { ExpenseDatePicker } from "@/components/ExpenseDatePicker";
import {
  CATEGORY_DEFAULT_RECURRENCE,
  CATEGORY_PRESETS,
  RECURRENCE_OPTIONS,
  displayCategoryLabel,
  encodeRecurrenceNote,
  formatRecurrenceLabel,
  formatLogPeriodLabel,
  getDefaultLogAmount,
  getPeriodKeyForInterval,
  buildRecurringBillTemplates,
  isBillLoggedInPeriod,
  parseRecurrenceFromNotes,
  resolveExpenseCategoryForApi,
  type AmountMode,
  type RecurrenceInterval,
  type RecurringBillTemplate,
} from "@/lib/expense-recurrence";
import { getISTDateString } from "@/lib/datetime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const defaultForm = () => ({
  category: "Misc" as ExpenseCategory | string,
  amount: "",
  date: getISTDateString(),
  recurrence: "one_time" as RecurrenceInterval,
  amountMode: "varied" as AmountMode,
  customCategory: false,
});

const Expenses = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  const refreshExpenses = () => listExpensesRequest().then(setAllExpenses).catch(() => setAllExpenses([]));

  useEffect(() => {
    refreshExpenses();
  }, []);

  const total = allExpenses.reduce((s, e) => s + e.amount, 0);
  const recurringCount = allExpenses.filter((e) => e.recurring).length;
  const avgPerDay =
    allExpenses.length >= 7
      ? Math.round(total / Math.max(1, new Set(allExpenses.map((e) => e.date)).size))
      : null;

  const applyCategory = (category: string) => {
    const recurrence = CATEGORY_DEFAULT_RECURRENCE[category] ?? "one_time";
    const amountMode: AmountMode =
      category === "Rent" || category === "Salary" ? "fixed" : recurrence !== "one_time" ? "varied" : "varied";
    setForm((prev) => ({ ...prev, category, recurrence, amountMode, customCategory: false }));
  };

  const findPeriodExpense = (template: RecurringBillTemplate) => {
    const periodKey = getPeriodKeyForInterval(template.interval);
    return allExpenses.find((e) => {
      if (displayCategoryLabel(e.category, e.notes) !== template.displayLabel) return false;
      if (parseRecurrenceFromNotes(e.notes) !== template.interval) return false;
      return getPeriodKeyForInterval(template.interval, e.date) === periodKey;
    });
  };

  const openLogPayment = (template: RecurringBillTemplate, fixExisting = false) => {
    const existing = fixExisting ? findPeriodExpense(template) : undefined;
    const amountMode = template.amountMode ?? "varied";
    const defaultAmount = existing
      ? String(existing.amount)
      : getDefaultLogAmount({ ...template, amountMode });

    setForm({
      category: template.formCategory,
      amount: defaultAmount,
      date: existing?.date ?? getISTDateString(),
      recurrence: template.interval,
      amountMode,
      customCategory: !(CATEGORY_PRESETS as readonly string[]).includes(template.formCategory),
    });
    setEditingExpenseId(existing?.id ?? null);
    setActiveTemplateId(template.id);
    setShowForm(true);
    window.setTimeout(() => document.getElementById("expense-amount-input")?.focus(), 80);
  };

  const handleSave = async () => {
    const interval = form.recurrence;
    const { category, notesExtra } = resolveExpenseCategoryForApi(form.category);
    const meta =
      interval !== "one_time"
        ? {
            amountMode: form.amountMode,
            defaultAmount: form.amountMode === "fixed" ? Number(form.amount) : undefined,
          }
        : undefined;

    const payload = {
      category: category as ExpenseCategory,
      amount: Number(form.amount),
      date: form.date,
      recurring: interval !== "one_time",
      notes: encodeRecurrenceNote(interval, notesExtra, meta),
    };

    if (editingExpenseId) {
      await updateExpenseRequest(editingExpenseId, payload);
      toast({ title: "Payment updated" });
    } else {
      await createExpenseRequest(payload);
      toast({ title: "Payment logged" });
    }

    await refreshExpenses();
    setShowForm(false);
    setEditingExpenseId(null);
    setActiveTemplateId(null);
    setForm(defaultForm());
  };

  const selectedRecurrence = RECURRENCE_OPTIONS.find((o) => o.value === form.recurrence);
  const recurringTemplates = buildRecurringBillTemplates(allExpenses);
  const isRecurringForm = form.recurrence !== "one_time";

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track rent, utilities, and ops costs."
        action={
          <Button
            className="gap-2 min-h-10"
            onClick={() => {
              setEditingExpenseId(null);
              setActiveTemplateId(null);
              setForm(defaultForm());
              setShowForm((v) => !v);
            }}
          >
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        }
      />

      {recurringTemplates.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-6">
          <div>
            <h2 className="font-display font-semibold text-base">Recurring payments</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Log each payment when it happens. Use <strong>Fixed</strong> when the amount is the same every cycle (rent,
              salary). Use <strong>Varied</strong> when it changes (electricity, water). Last paid amount is pre-filled
              for you to adjust.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
            {recurringTemplates.map((template) => {
              const logged = isBillLoggedInPeriod(allExpenses, template.displayLabel, template.interval);
              const periodLabel = formatLogPeriodLabel(template.interval);
              const isActive = activeTemplateId === template.id && showForm;
              return (
                <div
                  key={template.id}
                  className={cn(
                    "rounded-xl border p-3 flex flex-col gap-2",
                    logged ? "border-success/30 bg-success/5" : "border-border bg-muted/20",
                    isActive && "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{template.displayLabel}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatRecurrenceLabel(template.interval, true)}
                        {template.amountMode === "fixed" ? " · fixed amount" : " · varied amount"}
                      </div>
                      {template.lastAmount != null && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Last paid: ₹{template.lastAmount.toLocaleString("en-IN")}
                          {template.lastDate ? ` (${template.lastDate})` : ""}
                        </div>
                      )}
                    </div>
                    {logged && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-success shrink-0">
                        Paid
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={logged ? "outline" : "default"}
                      className="w-full min-h-9 gap-1.5"
                      onClick={() => openLogPayment(template, false)}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      {logged ? `Log again for ${periodLabel}` : `Log payment for ${periodLabel}`}
                    </Button>
                    {logged && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full min-h-9 gap-1.5 text-xs"
                        onClick={() => openLogPayment(template, true)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Fix {periodLabel}&apos;s payment
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-6 space-y-4">
          {editingExpenseId && (
            <p className="text-xs font-medium text-primary">Editing an existing payment</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              {!form.customCategory ? (
                <Select value={form.category} onValueChange={applyCategory}>
                  <SelectTrigger className="mt-1 min-h-10">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_PRESETS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1 min-h-10"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Custom category"
                />
              )}
              <button
                type="button"
                className="text-xs text-primary mt-1.5 hover:underline"
                onClick={() => setForm({ ...form, customCategory: !form.customCategory })}
              >
                {form.customCategory ? "Use preset categories" : "Enter custom category"}
              </button>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                id="expense-amount-input"
                className="mt-1 min-h-10"
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={form.amountMode === "fixed" ? "Fixed amount each cycle" : "Amount paid this time"}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {form.amountMode === "fixed"
                  ? "Saved as your default for this recurring bill. You can still change it when logging."
                  : "Pre-filled from last payment — update if this bill is different."}
              </p>
            </div>
            <div className="sm:col-span-2 sm:max-w-xs">
              <Label>Payment date</Label>
              <div className="mt-1">
                <ExpenseDatePicker
                  id="expense-date-picker"
                  value={form.date}
                  onChange={(date) => setForm({ ...form, date })}
                />
              </div>
            </div>
          </div>

          {isRecurringForm && (
            <div>
              <Label className="mb-2 block">Amount type for this recurring bill</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amountMode: "fixed" })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors min-h-[3.5rem]",
                    form.amountMode === "fixed" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                  )}
                >
                  <div className="text-sm font-medium">Fixed amount</div>
                  <div className="text-[11px] text-muted-foreground">Same each cycle — rent, salary</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amountMode: "varied" })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors min-h-[3.5rem]",
                    form.amountMode === "varied" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                  )}
                >
                  <div className="text-sm font-medium">Varied amount</div>
                  <div className="text-[11px] text-muted-foreground">Changes each time — electricity, water</div>
                </button>
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">How often does this expense repeat?</Label>
            <RadioGroup
              value={form.recurrence}
              onValueChange={(v) => setForm({ ...form, recurrence: v as RecurrenceInterval })}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-colors min-h-[3.5rem]",
                    form.recurrence === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                  )}
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <span>
                    <span className="text-sm font-medium block">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            {selectedRecurrence && isRecurringForm && (
              <p className="text-xs text-muted-foreground mt-2">
                Log a new row each {selectedRecurrence.label.toLowerCase()} when you pay — use the cards above for quick
                entry.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={!form.amount} className="min-h-10">
              {editingExpenseId ? "Update payment" : "Save payment"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-10"
              onClick={() => {
                setShowForm(false);
                setEditingExpenseId(null);
                setActiveTemplateId(null);
                setForm(defaultForm());
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard label="Total" value={`₹${total.toLocaleString("en-IN")}`} icon={Receipt} accent="accent" animated={false} />
        <KpiCard label="Recurring" value={recurringCount} icon={Receipt} accent="primary" animated={false} />
        <KpiCard label="One-off" value={allExpenses.filter((e) => !e.recurring).length} icon={Receipt} accent="warning" animated={false} />
        <KpiCard
          label="Avg / active day"
          value={avgPerDay != null ? `₹${avgPerDay.toLocaleString("en-IN")}` : "—"}
          hint={avgPerDay != null ? "Across logged days" : "Add 7+ expenses"}
          icon={Receipt}
          accent="success"
          animated={false}
        />
      </div>

      <ResponsiveTable
        rows={allExpenses}
        rowKey={(e) => e.id}
        emptyMessage="No expenses logged yet. Add your first expense above."
        columns={[
          {
            key: "category",
            header: "Category",
            cell: (e) => displayCategoryLabel(e.category, e.notes),
          },
          {
            key: "date",
            header: "Date",
            cell: (e) => e.date,
          },
          {
            key: "type",
            header: "Type",
            cell: (e) => {
              const interval = parseRecurrenceFromNotes(e.notes);
              return (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {formatRecurrenceLabel(interval, e.recurring)}
                </span>
              );
            },
          },
          {
            key: "amount",
            header: "Amount",
            className: "text-right font-display font-semibold",
            cell: (e) => `₹${e.amount.toLocaleString("en-IN")}`,
          },
        ]}
      />
    </>
  );
};
export default Expenses;
