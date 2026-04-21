import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, IndianRupee, Bell, Save, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";

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
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, hint, children }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <div className="mt-1.5">{children}</div>
    {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
  </div>
);

const Settings = () => {
  const { gymSlug } = useParams();
  const { gym } = useTenant();
  const { toast } = useToast();
  const save = (what: string) => () => toast({ title: `${what} saved`, description: "Changes are live for your gym." });

  return (
    <>
      <PageHeader title="Settings" subtitle="Branding, pricing, and operational defaults." />

      <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
        <Section icon={Building2} title="Brand identity" hint="What members see across the app.">
          <Field label="Display name"><Input defaultValue={gym?.name || gymSlug} /></Field>
          <Field label="Tagline"><Input defaultValue={gym?.tagline || ""} /></Field>
          <Field label="Logo emoji / URL" hint="An emoji works great. Image upload coming soon."><Input defaultValue={gym?.logo || "🏋️"} /></Field>
          <Field label="Primary color (HSL)" hint='Tailwind format, e.g. "88 86% 52%".'><Input defaultValue="88 86% 52%" /></Field>
          <Button onClick={save("Branding")} className="gap-2"><Save className="w-4 h-4" /> Save branding</Button>
        </Section>

        <Section icon={IndianRupee} title="Plan pricing" hint="Used when creating new members.">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly"><Input type="number" defaultValue={1500} /></Field>
            <Field label="Quarterly"><Input type="number" defaultValue={4000} /></Field>
            <Field label="Half-yearly"><Input type="number" defaultValue={7000} /></Field>
          </div>
          <Field label="Currency"><Input defaultValue="INR" /></Field>
          <Button onClick={save("Pricing")} className="gap-2"><Save className="w-4 h-4" /> Save pricing</Button>
        </Section>

        <Section icon={Bell} title="Reminders & cadence" hint="When should members hear from you?">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Renewal alert (days before)"><Input type="number" defaultValue={7} /></Field>
            <Field label="Absence flag (days)"><Input type="number" defaultValue={3} /></Field>
          </div>
          <Field label="Default channel"><Input defaultValue="WhatsApp" /></Field>
          <Button onClick={save("Reminder cadence")} className="gap-2"><Save className="w-4 h-4" /> Save cadence</Button>
        </Section>

        <Section icon={Palette} title="Appearance" hint="Theme switching coming soon.">
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            🎨 Light + dark themes ready behind the scenes. Member-facing theme picker arrives in the next release.
          </div>
        </Section>
      </div>
    </>
  );
};
export default Settings;
