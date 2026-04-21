import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMember, updateMember, getMemberAttendance, getTaskStreak } from "@/lib/data-service";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Flame, Activity, Target, Save, User as UserIcon, Apple, Heart } from "lucide-react";

const Section = ({ icon: Icon, title, children }: any) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="px-5 py-3 border-b border-border flex items-center gap-2.5 bg-muted/30">
      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="font-display font-semibold text-sm">{title}</div>
    </div>
    <div className="p-5 grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const MemberProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const memberId = user?.id === "u-member-1" ? "m1" : user?.id || "";
  const member = getMember(memberId);
  const attendance = getMemberAttendance(memberId);
  const streak = getTaskStreak(memberId);

  const [form, setForm] = useState({
    name: member?.name || user?.name || "",
    phone: member?.phone || "",
    email: member?.email || "",
    age: member?.age?.toString() || "",
    gender: member?.gender || "",
    heightCm: member?.heightCm?.toString() || "",
    currentWeightKg: member?.currentWeightKg?.toString() || "",
    goalWeightKg: member?.goalWeightKg?.toString() || "",
    activityLevel: member?.activityLevel || "",
    foodPreference: member?.foodPreference || "",
    allergies: member?.allergies || "",
    medicalConditions: member?.medicalConditions || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = () => {
    if (member) {
      updateMember(member.id, {
        name: form.name, phone: form.phone, email: form.email || undefined,
        age: form.age ? Number(form.age) : undefined, gender: form.gender || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : undefined,
        goalWeightKg: form.goalWeightKg ? Number(form.goalWeightKg) : undefined,
        activityLevel: form.activityLevel || undefined,
        foodPreference: form.foodPreference || undefined,
        allergies: form.allergies || undefined,
        medicalConditions: form.medicalConditions || undefined,
      });
    }
    toast({ title: "Profile saved", description: "Your details are up to date." });
  };

  const initials = (form.name || user?.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const bmi = form.heightCm && form.currentWeightKg
    ? (Number(form.currentWeightKg) / ((Number(form.heightCm) / 100) ** 2)).toFixed(1)
    : "—";

  return (
    <>
      <PageHeader title="Your Profile" subtitle="Keep this fresh — your trainer plans around it." />

      {/* Hero card */}
      <div className="rounded-3xl gradient-hero text-secondary-foreground p-6 md:p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center text-2xl font-display font-bold text-primary-foreground shadow-glow shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-display font-bold">{form.name || "Add your name"}</h2>
            <p className="text-secondary-foreground/70 text-sm mt-1">
              Member since {member?.joinDate || "—"} · {member?.foodPreference || "Diet not set"}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Flame className="w-3 h-3 text-warning" /> {streak}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Activity className="w-3 h-3 text-primary" /> {attendance.length} sessions
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Target className="w-3 h-3 text-accent" /> BMI {bmi}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sectioned form */}
      <div className="space-y-5">
        <Section icon={UserIcon} title="Personal info">
          <Field label="Full name"><Input value={form.name} onChange={set("name")} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} placeholder="optional" /></Field>
          <Field label="Age"><Input type="number" value={form.age} onChange={set("age")} placeholder="28" /></Field>
          <Field label="Gender"><Input value={form.gender} onChange={set("gender")} placeholder="Male / Female / Other" /></Field>
        </Section>

        <Section icon={Activity} title="Body & goals">
          <Field label="Height (cm)"><Input type="number" value={form.heightCm} onChange={set("heightCm")} /></Field>
          <Field label="Current weight (kg)"><Input type="number" value={form.currentWeightKg} onChange={set("currentWeightKg")} /></Field>
          <Field label="Goal weight (kg)"><Input type="number" value={form.goalWeightKg} onChange={set("goalWeightKg")} /></Field>
          <Field label="Activity level"><Input value={form.activityLevel} onChange={set("activityLevel")} placeholder="Sedentary / Active / Athlete" /></Field>
        </Section>

        <Section icon={Apple} title="Diet & allergies">
          <Field label="Food preference"><Input value={form.foodPreference} onChange={set("foodPreference")} placeholder="Veg / Non-veg / Egg" /></Field>
          <Field label="Allergies"><Input value={form.allergies} onChange={set("allergies")} placeholder="Peanuts, dairy…" /></Field>
        </Section>

        <Section icon={Heart} title="Medical">
          <div className="sm:col-span-2">
            <Field label="Conditions to know about">
              <Input value={form.medicalConditions} onChange={set("medicalConditions")} placeholder="Helps your trainer keep you safe" />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sticky-ish save bar */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} className="gap-2 h-11 px-6">
          <Save className="w-4 h-4" /> Save changes
        </Button>
      </div>
    </>
  );
};
export default MemberProfile;
