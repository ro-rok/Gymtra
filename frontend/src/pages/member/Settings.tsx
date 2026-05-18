import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Bell, Droplets, Apple, Dumbbell, Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import {
  getReminderPreferencesRequest,
  updateReminderPreferencesRequest,
  type ReminderPreferences,
} from "@/lib/reminder-preferences-api";
import { setNotificationDontAskAgain } from "@/lib/notification-prompt-storage";

const SettingsSection = ({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2.5 bg-muted/30">
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="font-display font-semibold text-sm">{title}</div>
          {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  
);

const ToggleRow = ({
  label,
  helper,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  helper: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground mt-1">{helper}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

const defaultPrefs: ReminderPreferences = {
  pushEnabled: true,
  waterEnabled: true,
  dietEnabled: true,
  workoutEnabled: true,
  waterTimes: ["10:00", "14:00", "18:00"],
  mealTimes: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
};

const MemberSettings = () => {
  const { gymSlug } = useParams();
  const { toast } = useToast();
  const { registerPushSubscription } = usePushRegistration();
  const [prefs, setPrefs] = useState<ReminderPreferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReminderPreferencesRequest()
      .then(setPrefs)
      .catch(() => toast({ title: "Could not load preferences", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateReminderPreferencesRequest(prefs);
      setPrefs(updated);
      if (updated.pushEnabled) {
        setNotificationDontAskAgain(false);
        const ok = await registerPushSubscription(true);
        if (!ok && Notification.permission !== "granted") {
          toast({
            title: "Preferences saved",
            description: "Enable notifications in the banner at the top of the app to receive pushes.",
          });
          return;
        }
      }
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reminders & notifications"
        subtitle="Control how Gymtra nudges you throughout the day."
        action={
          <Link to={`/${gymSlug}/member/profile`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Profile
            </Button>
          </Link>
        }
      />

      <div className="max-w-2xl space-y-5 pb-safe">
        <SettingsSection icon={Bell} title="Push notifications" hint="Required for water and meal reminders on this device.">
          <ToggleRow
            label="Push notifications"
            helper="Enable alerts on this device. We will ask for permission when you turn this on."
            checked={prefs.pushEnabled}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, pushEnabled: v }))}
            disabled={loading}
          />
        </SettingsSection>

        <SettingsSection icon={Droplets} title="Water reminders" hint="Gentle nudges at your preferred times.">
          <ToggleRow
            label="Water reminders"
            helper="Water reminders help maintain daily consistency."
            checked={prefs.waterEnabled}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, waterEnabled: v }))}
            disabled={loading || !prefs.pushEnabled}
          />
        </SettingsSection>

        <SettingsSection icon={Apple} title="Diet reminders" hint="Breakfast, lunch, and dinner check-ins.">
          <ToggleRow
            label="Diet reminders"
            helper="Get reminded to log meals at breakfast, lunch, and dinner."
            checked={prefs.dietEnabled}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, dietEnabled: v }))}
            disabled={loading || !prefs.pushEnabled}
          />
        </SettingsSection>

        <SettingsSection icon={Dumbbell} title="Workout reminders" hint="Coming soon — preference is saved for when scheduling launches.">
          <ToggleRow
            label="Workout reminders"
            helper="Saved for a future release. No scheduled workout pushes yet."
            checked={prefs.workoutEnabled}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, workoutEnabled: v }))}
            disabled={loading || !prefs.pushEnabled}
          />
        </SettingsSection>

        <Button onClick={save} disabled={saving || loading} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </>
  );
};

export default MemberSettings;
