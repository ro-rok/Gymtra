import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changePasswordRequiredRequest } from "@/lib/auth-api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ChangePasswordRequired = () => {
  const { gymSlug } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await changePasswordRequiredRequest({ newPassword });
      await refreshUser();
      toast({ title: "Password updated", description: "Please continue to your dashboard." });
      const rolePath = user?.role === "owner" ? "owner" : user?.role === "trainer" ? "trainer" : "member";
      navigate(`/${gymSlug}/${rolePath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <PageHeader title="Change password" subtitle="This is required before continuing." />
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> You are using a default password. Set a secure one now.
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div>
          <Label>New password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        <div>
          <Label>Confirm password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
};

export default ChangePasswordRequired;
