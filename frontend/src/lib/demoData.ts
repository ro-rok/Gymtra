export type DemoMemberStatus = "active" | "expired" | "pending_renewal";

export interface DemoMember {
  id: string;
  gymId: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: DemoMemberStatus;
  avatar: string;
}

export interface DemoMembership {
  id: string;
  memberId: string;
  gymId: string;
  plan: "monthly" | "quarterly";
  amount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "pending_renewal";
}

export interface DemoAttendance {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  status: "present" | "skipped";
  markedBy: string;
  source: "manual" | "member_self";
  trustLevel: "high" | "low";
}

export interface DemoTask {
  id: string;
  label: string;
  done: boolean;
}

export interface DemoGym {
  id: string;
  slug: string;
  name: string;
  city: string;
  logo: string;
}

export interface DemoDataset {
  gym: DemoGym;
  members: DemoMember[];
  memberships: DemoMembership[];
  attendance: DemoAttendance[];
  tasks: DemoTask[];
  expenses: Array<{ id: string; amount: number; date: string; category: string }>;
}

const iso = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
};

const mkMember = (idx: number, name: string, status: DemoMemberStatus): DemoMember => ({
  id: `demo-member-${idx}`,
  gymId: "demo-gym-star-fitness",
  name,
  email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
  phone: `+91990000${String(100 + idx)}`,
  joinDate: iso(-(20 + idx * 3)),
  status,
  avatar: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
});

export const createDemoData = (gymSlug: string): DemoDataset => {
  const gymName = gymSlug === "star-fitness" ? "Star Fitness" : `${gymSlug.replace(/-/g, " ")} Gym`;
  const members: DemoMember[] = [
    mkMember(1, "Aarav Mehta", "active"),
    mkMember(2, "Riya Kapoor", "active"),
    mkMember(3, "Ishaan Nair", "pending_renewal"),
    mkMember(4, "Kiara Shah", "active"),
    mkMember(5, "Dev Patel", "expired"),
    mkMember(6, "Neha Joshi", "active"),
    mkMember(7, "Vihaan Rao", "active"),
    mkMember(8, "Anaya Sethi", "pending_renewal"),
    mkMember(9, "Kabir Bansal", "active"),
    mkMember(10, "Mira Verma", "expired"),
    mkMember(11, "Yuvraj Singh", "active"),
    mkMember(12, "Tara Kulkarni", "active"),
  ];

  const memberships: DemoMembership[] = members.map((m, i) => {
    const plan = i % 3 === 0 ? "quarterly" : "monthly";
    const start = iso(-(30 + i * 2));
    const end = iso((i % 4) - 2);
    const status = m.status === "expired" ? "expired" : m.status === "pending_renewal" ? "pending_renewal" : "active";
    return {
      id: `demo-membership-${m.id}`,
      memberId: m.id,
      gymId: m.gymId,
      plan,
      amount: plan === "monthly" ? 1800 : 4800,
      startDate: start,
      endDate: end,
      status,
    };
  });

  const attendance: DemoAttendance[] = [];
  members.forEach((member, index) => {
    for (let day = 0; day < 7; day += 1) {
      if ((index + day) % 4 === 0) continue;
      attendance.push({
        id: `att-${member.id}-${day}`,
        memberId: member.id,
        gymId: member.gymId,
        date: iso(-day),
        status: "present",
        markedBy: "owner-demo",
        source: day % 2 === 0 ? "manual" : "member_self",
        trustLevel: "high",
      });
    }
  });

  return {
    gym: {
      id: "demo-gym-star-fitness",
      slug: gymSlug,
      name: gymName,
      city: "Mumbai",
      logo: "",
    },
    members,
    memberships,
    attendance,
    tasks: [
      { id: "task-1", label: "Call pending renewals", done: false },
      { id: "task-2", label: "Review absences from yesterday", done: false },
      { id: "task-3", label: "Send welcome to new members", done: true },
    ],
    expenses: [
      { id: "exp-1", amount: 22000, date: iso(-5), category: "rent" },
      { id: "exp-2", amount: 4500, date: iso(-3), category: "equipment" },
    ],
  };
};

