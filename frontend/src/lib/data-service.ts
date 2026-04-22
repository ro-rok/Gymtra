/**
 * Data service layer — currently backed by localStorage + mock data.
 * Replace individual functions with API calls when connecting your backend.
 */
import type {
  MemberProfile, Membership, AttendanceLog, DailyTaskLog,
  DietTemplate, MemberDietAssignment, ProgressLog, Expense,
  StaffMember, ReminderLog, Gym, Subscription, PayrollRecord, LeaveRecord
} from "./types";
import {
  mockMembers, mockGyms, dietTemplates, expenses, staff,
  todayMeals, weightTrend
} from "./mock-data";

// ── Helpers ──
const store = <T>(key: string, data: T) => localStorage.setItem(`gymtra_${key}`, JSON.stringify(data));
const load = <T>(key: string, fallback: T): T => {
  try { const d = localStorage.getItem(`gymtra_${key}`); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
};
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const today = () => new Date().toISOString().split("T")[0];

// ── Seed data on first load ──
function seedIfNeeded() {
  if (load<MemberProfile[]>("members", []).length > 0) return;

  const members: MemberProfile[] = mockMembers.map(m => ({
    id: m.id, userId: `user-${m.id}`, gymId: "1", name: m.name, phone: m.phone,
    joinDate: m.joinDate, avatar: m.avatar, status: m.status as any,
    age: 25 + Math.floor(Math.random() * 15), gender: Math.random() > 0.5 ? "Male" : "Female",
    heightCm: 160 + Math.floor(Math.random() * 25),
    currentWeightKg: 60 + Math.floor(Math.random() * 30),
    goalWeightKg: 65 + Math.floor(Math.random() * 15),
    activityLevel: "Active", foodPreference: "Veg",
  }));
  store("members", members);

  const memberships: Membership[] = mockMembers.map(m => ({
    id: `ms-${m.id}`, memberId: m.id, gymId: "1",
    plan: m.plan as any, amount: m.plan === "Monthly" ? 1500 : m.plan === "Quarterly" ? 4000 : 7000,
    startDate: m.joinDate, expiryDate: m.expiry,
    status: m.status as any,
  }));
  store("memberships", memberships);

  const diets = dietTemplates.map(d => ({
    ...d, gymId: "1", createdBy: "u-owner-1",
    goal: d.goal as "loss" | "gain" | "maintain",
    mealPlan: todayMeals,
  }));
  store("diet_templates", diets);

  const exps = expenses.map(e => ({
    ...e, gymId: "1", notes: "",
    category: e.category as Expense["category"],
  }));
  store("expenses", exps);

  const staffList = staff.map(s => ({
    ...s, gymId: "1",
    status: s.status as "paid" | "pending",
  }));
  store("staff", staffList);

  // Seed last 14 days of attendance for first 4 members (~70% attendance)
  const logs: AttendanceLog[] = [];
  for (let d = 0; d < 14; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const date = dt.toISOString().split("T")[0];
    mockMembers.slice(0, 4).forEach((m, i) => {
      if (Math.random() > 0.3) {
        logs.push({ id: uid(), memberId: m.id, gymId: "1", date, status: "present", markedBy: m.id });
      }
    });
  }
  store("attendance", logs);

  // Seed progress data
  const progress: ProgressLog[] = weightTrend.map((w, i) => ({
    id: `pl-${i}`, memberId: "m1", gymId: "1",
    date: `2026-${String(i + 1).padStart(2, "0")}-15`,
    weightKg: w.weight,
  }));
  store("progress", progress);

  // Seed water for last 7 days for member m1
  const water: DailyTaskLog[] = [];
  for (let d = 0; d < 7; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    water.push({
      id: uid(), memberId: "m1", gymId: "1", date: dt.toISOString().split("T")[0],
      workout: Math.random() > 0.3, meal: Math.random() > 0.3, water: Math.random() > 0.3,
      waterLiters: Number((1.8 + Math.random() * 1.6).toFixed(1)),
    });
  }
  store("daily_tasks", water);
}
seedIfNeeded();

// ── One-time migration: normalize all member phones to +919654102758 ──
function migratePhonesV1() {
  const KEY = "migration_phones_v1";
  if (localStorage.getItem(`gymtra_${KEY}`)) return;
  const members = load<MemberProfile[]>("members", []);
  if (members.length) {
    const updated = members.map(m => ({ ...m, phone: "+919654102758" }));
    store("members", updated);
  }
  localStorage.setItem(`gymtra_${KEY}`, "1");
}
migratePhonesV1();

// ── Members ──
export const getMembers = (gymId: string): MemberProfile[] =>
  load<MemberProfile[]>("members", []).filter(m => m.gymId === gymId);

export const getMember = (id: string): MemberProfile | undefined =>
  load<MemberProfile[]>("members", []).find(m => m.id === id);

export const createMember = (data: Omit<MemberProfile, "id">): MemberProfile => {
  const all = load<MemberProfile[]>("members", []);
  const member = { ...data, id: uid() };
  all.push(member);
  store("members", all);
  return member;
};

export const updateMember = (id: string, data: Partial<MemberProfile>): MemberProfile | undefined => {
  const all = load<MemberProfile[]>("members", []);
  const idx = all.findIndex(m => m.id === id);
  if (idx < 0) return undefined;
  all[idx] = { ...all[idx], ...data };
  store("members", all);
  return all[idx];
};

// ── Memberships ──
export const getMemberships = (gymId: string): Membership[] =>
  load<Membership[]>("memberships", []).filter(m => m.gymId === gymId);

export const getMemberMembership = (memberId: string): Membership | undefined =>
  load<Membership[]>("memberships", []).find(m => m.memberId === memberId);

export const createMembership = (data: Omit<Membership, "id">): Membership => {
  const all = load<Membership[]>("memberships", []);
  const ms = { ...data, id: uid() };
  all.push(ms);
  store("memberships", all);
  return ms;
};

export const renewMembership = (memberId: string, plan: string, amount: number): Membership => {
  const all = load<Membership[]>("memberships", []);
  all.forEach(m => { if (m.memberId === memberId) m.status = "expired"; });
  const t = new Date();
  const months = plan === "Monthly" ? 1 : plan === "Quarterly" ? 3 : 6;
  const expiry = new Date(t);
  expiry.setMonth(expiry.getMonth() + months);
  const ms: Membership = {
    id: uid(), memberId, gymId: all.find(m => m.memberId === memberId)?.gymId || "1",
    plan: plan as any, amount, startDate: t.toISOString().split("T")[0],
    expiryDate: expiry.toISOString().split("T")[0], status: "active",
  };
  all.push(ms);
  store("memberships", all);
  const members = load<MemberProfile[]>("members", []);
  const mi = members.findIndex(m => m.id === memberId);
  if (mi >= 0) { members[mi].status = "active"; store("members", members); }
  return ms;
};

// ── Attendance ──
export const getAttendance = (gymId: string, date?: string): AttendanceLog[] => {
  const all = load<AttendanceLog[]>("attendance", []);
  return all.filter(a => a.gymId === gymId && (!date || a.date === date));
};

export const getMemberAttendance = (memberId: string): AttendanceLog[] =>
  load<AttendanceLog[]>("attendance", []).filter(a => a.memberId === memberId);

export const markAttendance = (data: Omit<AttendanceLog, "id">): AttendanceLog => {
  const all = load<AttendanceLog[]>("attendance", []);
  const existing = all.findIndex(a => a.memberId === data.memberId && a.date === data.date);
  const log = { ...data, id: existing >= 0 ? all[existing].id : uid() };
  if (existing >= 0) all[existing] = log; else all.push(log);
  store("attendance", all);
  return log;
};

// ── Daily Tasks ──
export const getDailyTasks = (memberId: string, date: string): DailyTaskLog | undefined =>
  load<DailyTaskLog[]>("daily_tasks", []).find(t => t.memberId === memberId && t.date === date);

export const getDailyTaskHistory = (memberId: string, days = 7): DailyTaskLog[] => {
  const all = load<DailyTaskLog[]>("daily_tasks", []).filter(t => t.memberId === memberId);
  const out: DailyTaskLog[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const date = dt.toISOString().split("T")[0];
    const found = all.find(t => t.date === date);
    out.push(found || { id: "", memberId, gymId: "1", date, workout: false, meal: false, water: false, waterLiters: 0 });
  }
  return out;
};

export const saveDailyTasks = (data: Omit<DailyTaskLog, "id">): DailyTaskLog => {
  const all = load<DailyTaskLog[]>("daily_tasks", []);
  const existing = all.findIndex(t => t.memberId === data.memberId && t.date === data.date);
  const log = { ...data, id: existing >= 0 ? all[existing].id : uid() };
  if (existing >= 0) all[existing] = log; else all.push(log);
  store("daily_tasks", all);
  return log;
};

export const logWaterIntake = (memberId: string, gymId: string, liters: number) => {
  const t = today();
  const existing = getDailyTasks(memberId, t);
  const newLiters = (existing?.waterLiters || 0) + liters;
  return saveDailyTasks({
    memberId, gymId, date: t,
    workout: existing?.workout || false,
    meal: existing?.meal || false,
    water: newLiters >= 2.5,
    waterLiters: Number(newLiters.toFixed(1)),
  });
};

export const getTaskStreak = (memberId: string): number => {
  const all = load<DailyTaskLog[]>("daily_tasks", [])
    .filter(t => t.memberId === memberId && t.workout && t.meal && t.water)
    .map(t => t.date).sort().reverse();
  let streak = 0;
  const d = new Date();
  for (const date of all) {
    const check = d.toISOString().split("T")[0];
    if (date === check) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
};

// ── Diet Templates ──
export const getDietTemplates = (gymId: string): DietTemplate[] =>
  load<DietTemplate[]>("diet_templates", []).filter(d => d.gymId === gymId);

export const createDietTemplate = (data: Omit<DietTemplate, "id">): DietTemplate => {
  const all = load<DietTemplate[]>("diet_templates", []);
  const t = { ...data, id: uid() };
  all.push(t);
  store("diet_templates", all);
  return t;
};

export const assignDiet = (data: Omit<MemberDietAssignment, "id">): MemberDietAssignment => {
  const all = load<MemberDietAssignment[]>("diet_assignments", []);
  all.forEach(a => { if (a.memberId === data.memberId) a.active = false; });
  const a = { ...data, id: uid() };
  all.push(a);
  store("diet_assignments", all);
  return a;
};

export const getMemberDiet = (memberId: string): { assignment?: MemberDietAssignment; template?: DietTemplate } => {
  const assignments = load<MemberDietAssignment[]>("diet_assignments", []);
  const assignment = assignments.find(a => a.memberId === memberId && a.active);
  if (!assignment) return {};
  const templates = load<DietTemplate[]>("diet_templates", []);
  const template = templates.find(t => t.id === assignment.templateId);
  return { assignment, template };
};

// ── Progress ──
export const getProgress = (memberId: string): ProgressLog[] =>
  load<ProgressLog[]>("progress", []).filter(p => p.memberId === memberId).sort((a, b) => a.date.localeCompare(b.date));

export const addProgress = (data: Omit<ProgressLog, "id">): ProgressLog => {
  const all = load<ProgressLog[]>("progress", []);
  const p = { ...data, id: uid() };
  all.push(p);
  store("progress", all);
  return p;
};

// ── Expenses ──
export const getExpenses = (gymId: string): Expense[] =>
  load<Expense[]>("expenses", []).filter(e => e.gymId === gymId);

export const addExpense = (data: Omit<Expense, "id">): Expense => {
  const all = load<Expense[]>("expenses", []);
  const e = { ...data, id: uid() };
  all.push(e);
  store("expenses", all);
  return e;
};

// ── Staff ──
export const getStaff = (gymId: string): StaffMember[] =>
  load<StaffMember[]>("staff", []).filter(s => s.gymId === gymId);

export const addStaffMember = (data: Omit<StaffMember, "id">): StaffMember => {
  const all = load<StaffMember[]>("staff", []);
  const s = { ...data, id: uid() };
  all.push(s);
  store("staff", all);
  return s;
};

export const updateStaffPaymentStatus = (id: string, status: "paid" | "pending") => {
  const all = load<StaffMember[]>("staff", []);
  const idx = all.findIndex(s => s.id === id);
  if (idx < 0) return;
  all[idx].status = status;
  store("staff", all);
  // Add payroll record
  if (status === "paid") {
    const records = load<PayrollRecord[]>("payroll", []);
    records.push({
      id: uid(), staffId: id, gymId: all[idx].gymId,
      month: new Date().toISOString().slice(0, 7),
      amount: all[idx].salary, status: "paid", paidAt: new Date().toISOString(),
    });
    store("payroll", records);
  }
};

export const getPayrollRecords = (gymId: string): PayrollRecord[] =>
  load<PayrollRecord[]>("payroll", []).filter(p => p.gymId === gymId);

// ── Leave ──
export const getLeaveRecords = (gymId: string): LeaveRecord[] =>
  load<LeaveRecord[]>("leave", []).filter(l => l.gymId === gymId).sort((a, b) => b.date.localeCompare(a.date));

export const addLeaveRecord = (data: Omit<LeaveRecord, "id">): LeaveRecord => {
  const all = load<LeaveRecord[]>("leave", []);
  const l = { ...data, id: uid() };
  all.push(l);
  store("leave", all);
  return l;
};

export const deleteLeaveRecord = (id: string) => {
  const all = load<LeaveRecord[]>("leave", []).filter(l => l.id !== id);
  store("leave", all);
};

// ── Reminders ──
export const logReminder = (data: Omit<ReminderLog, "id">): ReminderLog => {
  const all = load<ReminderLog[]>("reminders", []);
  const r = { ...data, id: uid() };
  all.push(r);
  store("reminders", all);
  return r;
};

export const getReminderLogs = (gymId: string): ReminderLog[] =>
  load<ReminderLog[]>("reminders", []).filter(r => r.gymId === gymId).sort((a, b) => b.sentAt.localeCompare(a.sentAt));

// ── Gyms (Super Admin) ──
export const getGyms = (): Gym[] => {
  const stored = load<Gym[]>("gyms", []);
  if (stored.length > 0) return stored;
  const gyms: Gym[] = mockGyms.map(g => ({ ...g, isActive: true, createdAt: "2025-01-01" }));
  store("gyms", gyms);
  return gyms;
};

export const createGym = (data: Omit<Gym, "id">): Gym => {
  const all = getGyms();
  const g = { ...data, id: uid() };
  all.push(g);
  store("gyms", all);
  return g;
};

export const updateGym = (id: string, data: Partial<Gym>): Gym | undefined => {
  const all = getGyms();
  const idx = all.findIndex(g => g.id === id);
  if (idx < 0) return undefined;
  all[idx] = { ...all[idx], ...data };
  store("gyms", all);
  return all[idx];
};

// ── Subscriptions ──
const SEED_SUBS: Subscription[] = [
  { id: "sub-1", gymId: "1", plan: "Pro", seats: 10, usedSeats: 5, status: "active", startDate: "2025-01-01", endDate: "2026-01-01", monthlyAmount: 1500, extraSeatPrice: 50 },
  { id: "sub-2", gymId: "2", plan: "Starter", seats: 5, usedSeats: 3, status: "active", startDate: "2025-03-01", endDate: "2026-03-01", monthlyAmount: 1000, extraSeatPrice: 50 },
  { id: "sub-3", gymId: "3", plan: "Pro", seats: 15, usedSeats: 12, status: "active", startDate: "2025-02-01", endDate: "2026-02-01", monthlyAmount: 2000, extraSeatPrice: 50 },
  { id: "sub-4", gymId: "4", plan: "Starter", seats: 5, usedSeats: 4, status: "trial", startDate: "2026-04-01", endDate: "2026-05-01", monthlyAmount: 0, extraSeatPrice: 50 },
];

export const getSubscriptions = (): Subscription[] => {
  const stored = load<Subscription[]>("subscriptions", []);
  if (stored.length > 0) return stored;
  store("subscriptions", SEED_SUBS);
  return SEED_SUBS;
};

export const updateSubscription = (id: string, data: Partial<Subscription>) => {
  const all = getSubscriptions();
  const idx = all.findIndex(s => s.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...data };
  store("subscriptions", all);
};
