import { useParams } from "react-router-dom";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, IndianRupee, Bell, Save, Building2 } from "lucide-react";
import { ProfileNotificationSettings } from "@/components/ProfileNotificationSettings";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { signTenantLogoUploadRequest, updateTenantLogoRequest, updateTenantPricingRequest } from "@/lib/tenant-api";
import { getGymPlanPricing } from "@/lib/plan-pricing";

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
  const { gym, updateGymPlanPricing } = useTenant();
  const { toast } = useToast();
  const save = (what: string) => () => toast({ title: `${what} saved`, description: "Changes are live for your gym." });
  const [logoPreview, setLogoPreview] = useState<string>(gym?.logo || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const currentPricing = getGymPlanPricing(gym);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(currentPricing.Monthly);
  const [quarterlyPrice, setQuarterlyPrice] = useState<number>(currentPricing.Quarterly);
  const [halfYearlyPrice, setHalfYearlyPrice] = useState<number>(currentPricing["Half-Yearly"]);
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    setMonthlyPrice(currentPricing.Monthly);
    setQuarterlyPrice(currentPricing.Quarterly);
    setHalfYearlyPrice(currentPricing["Half-Yearly"]);
  }, [currentPricing.Monthly, currentPricing.Quarterly, currentPricing["Half-Yearly"]]);

  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 4 MB.", variant: "destructive" });
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fileInput = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!gymSlug || !file) return;
    setUploadingLogo(true);
    try {
      const signed = await signTenantLogoUploadRequest(gymSlug, { fileName: file.name, contentType: file.type });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signed.apiKey);
      formData.append("timestamp", String(signed.timestamp));
      formData.append("signature", signed.signature);
      formData.append("folder", signed.folder);
      formData.append("public_id", signed.publicId);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: formData });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok || !cloudData.secure_url) throw new Error("Cloudinary upload failed");
      await updateTenantLogoRequest(gymSlug, cloudData.secure_url);
      toast({ title: "Logo updated", description: "Brand logo is now live." });
    } catch {
      toast({ title: "Logo upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePricingSave = async () => {
    if (!gymSlug) return;
    if (monthlyPrice <= 0 || quarterlyPrice <= 0 || halfYearlyPrice <= 0) {
      toast({ title: "Invalid pricing", description: "All plan prices must be greater than zero.", variant: "destructive" });
      return;
    }
    setSavingPricing(true);
    try {
      await updateTenantPricingRequest(gymSlug, {
        monthly: monthlyPrice,
        quarterly: quarterlyPrice,
        halfYearly: halfYearlyPrice,
      });
      updateGymPlanPricing({ monthly: monthlyPrice, quarterly: quarterlyPrice, halfYearly: halfYearlyPrice });
      toast({ title: "Pricing saved", description: "Plan prices are now default across this gym." });
    } catch (err) {
      toast({
        title: "Failed to save pricing",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Branding, pricing, and operational defaults." />

      <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
        <Section icon={Building2} title="Brand identity" hint="What members see across the app.">
          <Field label="Display name"><Input defaultValue={gym?.name || gymSlug} /></Field>
          <Field label="Tagline"><Input defaultValue={gym?.tagline || ""} /></Field>
          <Field label="Logo upload" hint="Image upload uses signed Cloudinary request.">
            <form onSubmit={handleLogoUpload} className="space-y-3">
              <Input type="file" accept="image/*" onChange={handleLogoSelect} />
              {logoPreview && <img src={logoPreview} alt="Gym logo preview" className="h-16 w-16 rounded-xl border border-border object-cover" />}
              <Button type="submit" disabled={uploadingLogo} className="gap-2">
                <Save className="w-4 h-4" /> {uploadingLogo ? "Uploading..." : "Upload logo"}
              </Button>
            </form>
          </Field>
          <Field label="Primary color (HSL)" hint='Tailwind format, e.g. "88 86% 52%".'><Input defaultValue="88 86% 52%" /></Field>
          <Button onClick={save("Branding")} className="gap-2"><Save className="w-4 h-4" /> Save branding</Button>
        </Section>

        <Section icon={IndianRupee} title="Plan pricing" hint="Used when creating new members.">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly"><Input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(Number(e.target.value) || 0)} /></Field>
            <Field label="Quarterly"><Input type="number" value={quarterlyPrice} onChange={(e) => setQuarterlyPrice(Number(e.target.value) || 0)} /></Field>
            <Field label="Half-yearly"><Input type="number" value={halfYearlyPrice} onChange={(e) => setHalfYearlyPrice(Number(e.target.value) || 0)} /></Field>
          </div>
          <Field label="Currency"><Input defaultValue="INR" /></Field>
          <Button onClick={handlePricingSave} className="gap-2" disabled={savingPricing}>
            <Save className="w-4 h-4" /> {savingPricing ? "Saving..." : "Save pricing"}
          </Button>
        </Section>

        <Section icon={Bell} title="Push notifications" hint="Alerts on this device for your gym.">
          <ProfileNotificationSettings />
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
