import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getTaskStreak } from "@/lib/data-service";
import { getMemberRequest, updateSelfMemberProfileRequest } from "@/lib/member-api";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Flame, Activity, Target, Save, User as UserIcon, Apple, Heart, Bell } from "lucide-react";
import { ProfileNotificationSettings } from "@/components/ProfileNotificationSettings";
import { EM_DASH, ELLIPSIS, MIDDLE_DOT } from "@/lib/format-currency";

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

const formatActivityLevel = (value?: string) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const memberToForm = (member: {
  name?: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  currentWeightKg?: number;
  goalWeightKg?: number;
  activityLevel?: string;
  foodPreference?: string;
  allergies?: string;
  medicalConditions?: string;
}, fallbackName?: string) => ({
  name: member.name || fallbackName || "",
  phone: member.phone || "",
  email: member.email || "",
  age: member.age != null ? String(member.age) : "",
  gender: member.gender || "",
  heightCm: member.heightCm != null ? String(member.heightCm) : "",
  currentWeightKg: member.currentWeightKg != null ? String(member.currentWeightKg) : "",
  goalWeightKg: member.goalWeightKg != null ? String(member.goalWeightKg) : "",
  activityLevel: formatActivityLevel(member.activityLevel),
  foodPreference: member.foodPreference || "",
  allergies: member.allergies || "",
  medicalConditions: member.medicalConditions || "",
});

const MemberProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const memberId = user?.id || "";
  const [member, setMember] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => memberToForm({}, user?.name));

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getMemberRequest(memberId)
      .then((data) => {
        setMember(data);
        setForm(memberToForm(data, user?.name));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [memberId, user?.name]);

  const sessionCount = member?.sessionCount ?? 0;
  const streak = getTaskStreak(memberId);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSelfMemberProfileRequest({
        age: form.age ? Number(form.age) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : undefined,
        goalWeightKg: form.goalWeightKg ? Number(form.goalWeightKg) : undefined,
        activityLevel: form.activityLevel
          ? (form.activityLevel.toLowerCase().replace(/\s+/g, "_") as "sedentary" | "lightly_active" | "active" | "athlete")
          : undefined,
        foodPreference: form.foodPreference || undefined,
        allergies: form.allergies || undefined,
        medicalConditions: form.medicalConditions || undefined,
      });
      setMember(updated);
      setForm(memberToForm(updated, user?.name));
      toast({ title: "Profile saved", description: "Your details are up to date." });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.name || user?.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const bmi = form.heightCm && form.currentWeightKg
    ? (Number(form.currentWeightKg) / ((Number(form.heightCm) / 100) ** 2)).toFixed(1)
    : EM_DASH;

  return (
    <>
      <PageHeader title="Your Profile" subtitle={`Keep this fresh ${EM_DASH} your trainer plans around it.`} />
      {loading && <p className="mb-4 text-sm text-muted-foreground">Loading profile{ELLIPSIS}</p>}
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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
              Member since {member?.joinDate || EM_DASH} {MIDDLE_DOT} {member?.foodPreference || "Diet not set"}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Flame className="w-3 h-3 text-warning" /> {streak}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Activity className="w-3 h-3 text-primary" /> {sessionCount} sessions
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full glass">
                <Target className="w-3 h-3 text-accent" /> BMI {bmi}
              </span>
            </div>
          </div>
        </div>
      </div>

      
      
      <div className="space-y-5">
        <Section icon={Bell} title="Notifications">
          <div className="sm:col-span-2">
            <ProfileNotificationSettings showReminderLink />
          </div>
        </Section>

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
          <Field label="Allergies"><Input value={form.allergies} onChange={set("allergies")} placeholder={`Peanuts, dairy${ELLIPSIS}`} /></Field>
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
        <Button onClick={handleSave} className="gap-2 h-11 px-6" disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </>
  );
};
export default MemberProfile;

