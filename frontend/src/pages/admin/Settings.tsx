import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as Cog, IndianRupee, Bell, Shield, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Section = ({ icon: Icon, title, hint, children }: any) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-muted/30">
      <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
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

const AdminSettings = () => {
  const { toast } = useToast();
  const save = (what: string) => () => toast({ title: `${what} saved` });
  return (
    <>
      <PageHeader title="Platform Settings" subtitle="Pricing, defaults, integrations." />
      <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
        <Section icon={IndianRupee} title="Subscription pricing" hint="Defaults used when provisioning a new gym.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starter base / mo (₹)"><Input type="number" defaultValue={999} /></Field>
            <Field label="Pro base / mo (₹)"><Input type="number" defaultValue={1999} /></Field>
            <Field label="Per-extra-seat (₹)"><Input type="number" defaultValue={50} /></Field>
            <Field label="GST %"><Input type="number" defaultValue={18} /></Field>
          </div>
          <Button onClick={save("Pricing")} className="gap-2"><Save className="w-4 h-4" /> Save pricing</Button>
        </Section>

        <Section icon={Bell} title="Default reminder cadence" hint="Applied to all new tenants.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Renewal alert (days)"><Input type="number" defaultValue={7} /></Field>
            <Field label="Absence flag (days)"><Input type="number" defaultValue={3} /></Field>
          </div>
          <Button onClick={save("Cadence")} className="gap-2"><Save className="w-4 h-4" /> Save defaults</Button>
        </Section>

        <Section icon={Shield} title="Trial & billing" hint="How do new gyms come on board?">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trial length (days)"><Input type="number" defaultValue={14} /></Field>
            <Field label="Auto-suspend after (days overdue)"><Input type="number" defaultValue={7} /></Field>
          </div>
          <Button onClick={save("Trial settings")} className="gap-2"><Save className="w-4 h-4" /> Save trial rules</Button>
        </Section>

        <Section icon={Cog} title="Integrations" hint="Surface these on owner dashboards once connected.">
          <div className="space-y-2">
            {["WhatsApp Business API", "Razorpay payments", "Meta Pixel analytics"].map(name => (
              <div key={name} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-[11px] text-muted-foreground">Not connected</div>
                </div>
                <Button size="sm" variant="outline">Connect</Button>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
};
export default AdminSettings;
