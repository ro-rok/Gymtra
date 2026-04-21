import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Expense } from "@/lib/types";

export const listExpensesRequest = async (): Promise<Expense[]> => {
  const data = await apiGet<{ items: Expense[]; total: number }>("/api/v1/expenses/");
  return data.items;
};

export const createExpenseRequest = (payload: Omit<Expense, "id" | "gymId">) =>
  apiPost<Expense>("/api/v1/expenses/", payload);

export const updateExpenseRequest = (expenseId: string, payload: Partial<Expense>) =>
  apiPatch<Expense>(`/api/v1/expenses/${expenseId}`, payload);

