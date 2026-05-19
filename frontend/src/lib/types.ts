export type Role = "super_admin" | "owner" | "trainer" | "member";

// ── Auth ──
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  gymId?: string;
  gymSlug?: string;
  avatar?: string;
  mustChangePassword?: boolean;
}

// ── Gym / Tenant ──
export interface Gym {
  id: string;
  slug: string;
  name: string;
  logo: string;
  city: string;
  members?: number;
  tagline: string;
  isActive: boolean;
  seatCount?: number;
  ownerId?: string;
  adminUserId?: string;
  createdAt: string;
  brandColor?: string;
  metaTitle?: string;
  metaDescription?: string;
  planPricing?: {
    monthly: number;
    quarterly: number;
    halfYearly: number;
  };
}

// ── Member ──
export interface MemberProfile {
  id: string;
  userId: string;
  gymId: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  currentWeightKg?: number;
  goalWeightKg?: number;
  activityLevel?: string;
  allergies?: string;
  foodPreference?: string;
  medicalConditions?: string;
  mealTimings?: string;
  bodyFatPct?: number;
  joinDate: string;
  avatar: string;
  status: "active" | "expired" | "pending_renewal";
  sessionCount?: number;
}

// ── Membership ──
export type PlanType = "Monthly" | "Quarterly" | "Half-Yearly";

export interface Membership {
  id: string;
  memberId: string;
  gymId: string;
  renewedFromId?: string;
  plan: PlanType;
  amount: number;
  startDate: string;
  expiryDate: string;
  status: "active" | "expired" | "pending_renewal";
}

// ── Attendance ──
export interface AttendanceLog {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  status: "present" | "skipped";
  markedBy: string;
}

// ── Daily Tasks ──
export interface DailyTaskLog {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  workout: boolean;
  meal: boolean;
  water: boolean;
  waterLiters?: number;
}

// ── Diet ──
export interface DietTemplate {
  id: string;
  gymId: string;
  name: string;
  goal: "loss" | "gain" | "maintain";
  weekday?: number;
  calories: number;
  meals: number;
  tags: string[];
  mealPlan?: DietMeal[];
  macros?: { protein?: number; carbs?: number; fat?: number };
  notes?: string;
  preferenceTags?: string[];
  allergyTags?: string[];
  createdBy: string;
}

export interface DietMeal {
  time: string;
  name: string;
  cal: number;
  macros: string;
}

export interface MemberDietAssignment {
  id: string;
  memberId: string;
  templateId: string;
  gymId: string;
  assignedBy: string;
  assignedAt: string;
  active: boolean;
}

// ── Progress ──
export interface ProgressLog {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  notes?: string;
}

// ── Expenses ──
export type ExpenseCategory = "Rent" | "Electricity" | "Water" | "Maintenance" | "Misc";

export interface Expense {
  id: string;
  gymId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  recurring: boolean;
  notes?: string;
}

// ── Staff / Payroll ──
export interface StaffMember {
  id: string;
  gymId: string;
  userId?: string;
  name: string;
  role: string;
  salary: number;
  status: "paid" | "pending";
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  gymId: string;
  month: string;
  amount: number;
  status: "paid" | "pending";
  paidAt?: string;
}

export interface LeaveRecord {
  id: string;
  staffId: string;
  staffName?: string;
  gymId: string;
  date: string;
  reason?: string;
  type?: "sick" | "vacation" | "personal";
}

// ── Subscription (platform-level) ──
export interface Subscription {
  id: string;
  gymId: string;
  plan: string;
  seats: number;
  usedSeats: number;
  status: "active" | "expired" | "trial";
  startDate: string;
  endDate: string;
  monthlyAmount?: number;
  extraSeatPrice?: number;
}

// ── Notification / Reminder ──
export type ReminderType = "expiry" | "overdue" | "missed_workout" | "absence";

export interface ReminderLog {
  id: string;
  gymId: string;
  memberId: string;
  type: ReminderType;
  channel: "whatsapp" | "browser";
  message: string;
  sentAt: string;
  sentBy: string;
}
