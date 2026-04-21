import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PageMeta } from "@/components/PageMeta";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "super_admin") {
      navigate("/admin", { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/admin");
    } else {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero text-secondary-foreground p-6 relative overflow-hidden">
      <PageMeta title="Super Admin Login | GymOS" description="Platform administration login for GymOS." canonicalPath="/admin/login" noindex />
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />

      <Link to="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="relative w-full max-w-sm bg-card text-card-foreground rounded-2xl p-8 shadow-2xl border border-border animate-scale-in">
        <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mb-5 shadow-lg">
          <Shield className="w-7 h-7 text-accent-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold">Super Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform team access only.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email</Label>
            <Input id="email" className="mt-1.5 h-11" placeholder="admin@gymos.app"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="pw" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="pw"
                type={showPassword ? "text" : "password"}
                className="h-11 pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loading || authLoading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Continue"}
          </Button>
        </form>

        <button onClick={() => { setEmail("admin@gymos.app"); setPassword("admin123"); }}
          className="mt-5 w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center py-2 rounded-lg border border-dashed border-border hover:border-primary/40">
          🔑 Use demo · admin@gymos.app
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
