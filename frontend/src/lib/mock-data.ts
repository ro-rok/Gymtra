export type Gym = { id: string; slug: string; name: string; logo: string; city: string; members: number; tagline: string };

export const mockGyms: Gym[] = [
  { id: "1", slug: "iron-paradise", name: "Iron Paradise", logo: "🏋️", city: "Mumbai", members: 342, tagline: "Where strength is forged" },
  { id: "2", slug: "fit-republic", name: "Fit Republic", logo: "💪", city: "Bengaluru", members: 218, tagline: "Your daily revolution" },
  { id: "3", slug: "pulse-fitness", name: "Pulse Fitness", logo: "⚡", city: "Delhi", members: 487, tagline: "Feel the pulse" },
  { id: "4", slug: "zen-strength", name: "Zen Strength", logo: "🧘", city: "Pune", members: 156, tagline: "Mind. Body. Iron." },
  { id: "5", slug: "alpha-arena", name: "Alpha Arena", logo: "🦁", city: "Hyderabad", members: 295, tagline: "Lead the pack" },
  { id: "6", slug: "core-club", name: "Core Club", logo: "🔥", city: "Chennai", members: 178, tagline: "Burn. Build. Become." },
];

export const mockMembers = [
  { id: "m1", name: "Aarav Sharma", phone: "+919654102758", plan: "Quarterly", status: "active", expiry: "2026-06-15", joinDate: "2025-11-01", avatar: "AS", goal: "loss", attendance: 22 },
  { id: "m2", name: "Priya Patel", phone: "+919654102758", plan: "Monthly", status: "expired", expiry: "2026-04-10", joinDate: "2025-09-12", avatar: "PP", goal: "gain", attendance: 8 },
  { id: "m3", name: "Rohan Verma", phone: "+919654102758", plan: "Half-Yearly", status: "active", expiry: "2026-09-22", joinDate: "2025-03-15", avatar: "RV", goal: "loss", attendance: 25 },
  { id: "m4", name: "Sneha Iyer", phone: "+919654102758", plan: "Monthly", status: "pending_renewal", expiry: "2026-04-22", joinDate: "2026-01-08", avatar: "SI", goal: "maintain", attendance: 18 },
  { id: "m5", name: "Karan Singh", phone: "+919654102758", plan: "Quarterly", status: "active", expiry: "2026-07-01", joinDate: "2025-12-20", avatar: "KS", goal: "gain", attendance: 24 },
  { id: "m6", name: "Ananya Rao", phone: "+919654102758", plan: "Monthly", status: "expired", expiry: "2026-03-30", joinDate: "2025-08-05", avatar: "AR", goal: "loss", attendance: 0 },
  { id: "m7", name: "Vikram Joshi", phone: "+919654102758", plan: "Half-Yearly", status: "active", expiry: "2026-10-12", joinDate: "2025-04-18", avatar: "VJ", goal: "loss", attendance: 27 },
  { id: "m8", name: "Meera Kapoor", phone: "+919654102758", plan: "Quarterly", status: "active", expiry: "2026-08-05", joinDate: "2025-11-25", avatar: "MK", goal: "gain", attendance: 20 },
];

export const weightTrend = [
  { date: "Nov", weight: 82 }, { date: "Dec", weight: 80.5 }, { date: "Jan", weight: 79 },
  { date: "Feb", weight: 77.8 }, { date: "Mar", weight: 76.2 }, { date: "Apr", weight: 75 },
];

export const waterWeek = [
  { day: "Mon", liters: 2.5 }, { day: "Tue", liters: 3.1 }, { day: "Wed", liters: 2.8 },
  { day: "Thu", liters: 3.4 }, { day: "Fri", liters: 2.2 }, { day: "Sat", liters: 3.0 }, { day: "Sun", liters: 2.7 },
];

export const dietTemplates = [
  { id: "d1", name: "Lean Cut Plan", goal: "loss", calories: 1800, meals: 5, tags: ["veg", "no-dairy"] },
  { id: "d2", name: "Bulk Builder", goal: "gain", calories: 3200, meals: 6, tags: ["non-veg", "high-protein"] },
  { id: "d3", name: "Balanced Maintain", goal: "maintain", calories: 2400, meals: 4, tags: ["veg", "egg"] },
  { id: "d4", name: "Keto Shred", goal: "loss", calories: 1600, meals: 4, tags: ["non-veg", "low-carb"] },
];

export const expenses = [
  { id: "e1", category: "Rent", amount: 85000, date: "2026-04-01", recurring: true },
  { id: "e2", category: "Electricity", amount: 18500, date: "2026-04-05", recurring: true },
  { id: "e3", category: "Water", amount: 4200, date: "2026-04-05", recurring: true },
  { id: "e4", category: "Maintenance", amount: 12000, date: "2026-04-12", recurring: false },
  { id: "e5", category: "Misc", amount: 3500, date: "2026-04-15", recurring: false },
];

export const staff = [
  { id: "s1", name: "Rahul Mehra", role: "Trainer", salary: 35000, status: "paid" },
  { id: "s2", name: "Neha Gupta", role: "Trainer", salary: 32000, status: "pending" },
  { id: "s3", name: "Arjun Das", role: "Receptionist", salary: 22000, status: "paid" },
];

export const todayMeals = [
  { time: "7:00 AM", name: "Oats + Banana + Almonds", cal: 420, macros: "P32 C58 F12" },
  { time: "11:00 AM", name: "Greek Yogurt Bowl", cal: 280, macros: "P22 C30 F8" },
  { time: "1:30 PM", name: "Grilled Chicken + Quinoa", cal: 580, macros: "P45 C50 F14" },
  { time: "5:00 PM", name: "Protein Shake + Apple", cal: 320, macros: "P30 C32 F6" },
  { time: "8:30 PM", name: "Paneer Tikka + Salad", cal: 480, macros: "P38 C20 F22" },
];
