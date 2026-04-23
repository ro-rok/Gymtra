import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createMemberRequest } from "@/lib/member-api";
import { createMembershipRequest } from "@/lib/membership-api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Activity, Apple, CreditCard, Save, Sparkles } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { getGymPlanPricing } from "@/lib/plan-pricing";

const PLAN_ORDER = ["Monthly", "Quarterly", "Half-Yearly"] as const;

const Section = ({ icon: Icon, title, hint, children }: any) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-muted/30">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display font-semibold text-sm">{title}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
    <div className="p-5 grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, required, children }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const AddMember = () => {
  const navigate = useNavigate();
  const { gymSlug } = useParams();
  const { toast } = useToast();
  const { gym } = useTenant();
  const planPrices = getGymPlanPricing(gym);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", age: "", gender: "",
    heightCm: "", currentWeightKg: "", goalWeightKg: "",
    activityLevel: "", allergies: "", foodPreference: "",
    medicalConditions: "", plan: "Monthly", startDate: new Date().toISOString().split("T")[0],
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const normalizedEmail = form.email.trim();
      if (!normalizedEmail) {
        setFormError("Email is required");
        setSaving(false);
        return;
      }
      const member = await createMemberRequest({
        name: form.name,
        phone: form.phone,
        email: normalizedEmail,
        password: "member123",
        joinDate: form.startDate,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender ? (form.gender.toLowerCase() as "male" | "female" | "other") : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : undefined,
        goalWeightKg: form.goalWeightKg ? Number(form.goalWeightKg) : undefined,
        activityLevel: form.activityLevel
          ? (form.activityLevel === "Lightly active"
              ? "lightly_active"
              : form.activityLevel.toLowerCase().replace(" ", "_")) as
              | "sedentary"
              | "lightly_active"
              | "active"
              | "athlete"
          : undefined,
        allergies: form.allergies || undefined,
        foodPreference: form.foodPreference || undefined,
        medicalConditions: form.medicalConditions || undefined,
      });

      await createMembershipRequest({
        memberId: member.id,
        plan: form.plan as any,
        amount: planPrices[form.plan as keyof typeof planPrices],
        startDate: form.startDate,
      });
      toast({ title: "Member added", description: `${form.name} is on the ${form.plan} plan.` });
      navigate(`/${gymSlug}/owner/members`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save member");
    } finally {
      setSaving(false);
    }
  };

  const initials = form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const completion = Math.round(
    (Object.values(form).filter(v => v && v !== "Monthly").length / Object.keys(form).length) * 100
  );

  return (
    <>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-3 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <PageHeader title="Add Member" subtitle="Required fields are marked with *" />

      {/* Live preview card */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6 flex items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-sm font-display font-bold text-primary-foreground shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{form.name || "New member"}</div>
          <div className="text-xs text-muted-foreground">{form.plan} plan · {form.phone || "no phone yet"}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Form</div>
          <div className="text-sm font-display font-bold text-primary">{completion}%</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && <div className="text-sm text-destructive">{formError}</div>}
        <Section icon={User} title="Personal info" hint="Who's joining?">
          <Field label="Full name" required><Input placeholder="Aarav Sharma" required value={form.name} onChange={set("name")} /></Field>
          <Field label="Phone" required><Input placeholder="+91 98765 43210" required value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Email" required><Input type="email" placeholder="member@example.com" required value={form.email} onChange={set("email")} /></Field>
          <Field label="Age"><Input type="number" placeholder="28" value={form.age} onChange={set("age")} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section icon={Activity} title="Body & goals" hint="For diet planning and progress.">
          <Field label="Height (cm)" required><Input type="number" required value={form.heightCm} onChange={set("heightCm")} /></Field>
          <Field label="Current weight (kg)" required><Input type="number" required value={form.currentWeightKg} onChange={set("currentWeightKg")} /></Field>
          <Field label="Goal weight (kg)"><Input type="number" value={form.goalWeightKg} onChange={set("goalWeightKg")} /></Field>
          <Field label="Activity level">
            <Select value={form.activityLevel} onValueChange={(v) => setForm({ ...form, activityLevel: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Sedentary">Sedentary</SelectItem>
                <SelectItem value="Lightly active">Lightly active</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section icon={Apple} title="Diet & medical" hint="Helps the trainer keep them safe.">
          <Field label="Food preference">
            <Select value={form.foodPreference} onValueChange={(v) => setForm({ ...form, foodPreference: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Veg">Veg</SelectItem>
                <SelectItem value="Egg">Egg</SelectItem>
                <SelectItem value="Non-veg">Non-veg</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Allergies"><Input placeholder="Peanuts, dairy…" value={form.allergies} onChange={set("allergies")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Medical conditions"><Input placeholder="Optional — anything to know about" value={form.medicalConditions} onChange={set("medicalConditions")} /></Field>
          </div>
        </Section>

        <Section icon={CreditCard} title="Membership plan" hint="A plan is created automatically.">
          <Field label="Plan" required>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_ORDER.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan} · ₹{planPrices[plan].toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Start date" required><Input type="date" value={form.startDate} onChange={set("startDate")} /></Field>
          <div className="sm:col-span-2 rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <div className="text-xs text-foreground/80">
              <span className="font-semibold">{form.plan} plan</span> · ₹{planPrices[form.plan as keyof typeof planPrices].toLocaleString("en-IN")} · ends{" "}
              {new Date(new Date(form.startDate).setMonth(new Date(form.startDate).getMonth() + (form.plan === "Monthly" ? 1 : form.plan === "Quarterly" ? 3 : 6))).toISOString().split("T")[0]}
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" className="gap-2" disabled={saving}><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save member"}</Button>
        </div>
      </form>
    </>
  );
};
export default AddMember;
