import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Dumbbell, Crown, Users, User as UserIcon, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { PageMeta } from "@/components/PageMeta";
import { GymIdentity } from "@/components/GymIdentity";
import { createPasswordResetRequest, ownerForgotPasswordRequest } from "@/lib/auth-api";

const demoAccounts = [
  { role: "Owner", email: "owner@ironparadise.com", password: "owner123", icon: Crown, color: "primary", desc: "Full operational control" },
  { role: "Trainer", email: "trainer@ironparadise.com", password: "trainer123", icon: Users, color: "accent", desc: "Members + diet + attendance" },
  { role: "Member", email: "aarav@email.com", password: "member123", icon: UserIcon, color: "warning", desc: "Personal dashboard view" },
];

const GymLogin = () => {
  const { gymSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithPhone, user, loading: authLoading } = useAuth();
  const { gym, loading: tenantLoading, error: tenantError, invalidTenant } = useTenant();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [ownerResetEmail, setOwnerResetEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState<"member" | "owner">("member");
  const phoneError = loginMode === "phone" && phone.trim() && !/^\+?[0-9]{10,15}$/.test(phone.trim());
  const redirectTo = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;

  useEffect(() => {
    if (user && user.gymSlug === gymSlug) {
      const rolePath = user.role === "owner" ? "owner" : user.role === "trainer" ? "trainer" : "member";
      navigate(`/${gymSlug}/${rolePath}`, { replace: true });
    }
  }, [gymSlug, navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymSlug) return;
    if (loginMode === "phone" && phoneError) return;
    setLoading(true);
    const result =
      loginMode === "phone"
        ? await loginWithPhone(phone, password, gymSlug)
        : await login(email, password, gymSlug);
    setLoading(false);
    if (result.success) {
      const role = result.user?.role;
      const rolePath = role === "owner" ? "owner" : role === "trainer" ? "trainer" : "member";
      const safeRedirect =
        redirectTo?.pathname?.startsWith(`/${gymSlug}/`) && redirectTo.pathname.includes(`/${rolePath}`)
          ? `${redirectTo.pathname}${redirectTo.search || ""}`
          : `/${gymSlug}/${rolePath}`;
      navigate(safeRedirect);
    } else {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    }
  };

  const useDemo = (e: string, p: string) => { setEmail(e); setPassword(p); setLoginMode("email"); };

  const handleForgotPassword = async () => {
    if (!gymSlug || !resetIdentifier.trim()) return;
    setRequestingReset(true);
    try {
      await createPasswordResetRequest({ gymSlug, identifier: resetIdentifier.trim() });
      toast({ title: "Request sent", description: "Owner has been notified. You will receive an email update." });
      setShowForgotPassword(false);
      setResetIdentifier("");
    } catch (error) {
      toast({ title: "Could not create request", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setRequestingReset(false);
    }
  };

  const handleOwnerForgotPassword = async () => {
    if (!gymSlug || !ownerResetEmail.trim()) return;
    setRequestingReset(true);
    try {
      await ownerForgotPasswordRequest({ gymSlug, email: ownerResetEmail.trim() });
      toast({
        title: "Request submitted",
        description: "Super admin has been notified. They will share a temporary password manually.",
      });
      setOwnerResetEmail("");
      setShowForgotPassword(false);
    } catch (error) {
      toast({ title: "Could not send reset link", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setRequestingReset(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PageMeta title="Gym Login | Gymtra" canonicalPath={`/${gymSlug || ""}`} noindex />
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading gym details...
        </div>
      </div>
    );
  }

  if (invalidTenant || !gym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <PageMeta title="Gym Not Found | Gymtra" canonicalPath={`/${gymSlug || ""}`} noindex />
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground">
          <h1 className="text-xl font-semibold">Invalid gym link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {tenantError || "We could not find this gym. Please verify the URL and try again."}
          </p>
          <Link to="/" className="inline-flex mt-4 text-sm text-primary hover:underline">
            Back to gym directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background relative overflow-hidden">
      <div className="ambient-glow w-[22rem] h-[22rem] -top-32 -left-24 opacity-15" />
      <PageMeta
        title={gym.metaTitle || `${gym.name} | Gym Login`}
        description={gym.metaDescription || `Sign in to ${gym.name} on Gymtra.`}
        canonicalPath={`/${gym.slug}`}
      />
      {/* Brand panel */}
      <div className="lg:w-1/2 relative overflow-hidden gradient-hero text-secondary-foreground p-8 md:p-12 lg:p-16 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
        <div className="absolute inset-0 gradient-mesh opacity-70" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/16 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-accent/14 blur-3xl" />

        <Link to="/" className="relative inline-flex items-center gap-2 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> All gyms
        </Link>

        <div className="relative animate-fade-in-up max-w-2xl">
          <GymIdentity name={gym.name} logo={gym.logo} brandColor={gym.brandColor} size="lg" className="mb-6 shadow-glow bg-white/10" />
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">{gym.name}</h1>
          <p className="text-secondary-foreground/70 mt-4 text-lg max-w-2xl">{gym.tagline}</p>
          <div className="mt-10 flex flex-wrap gap-3.5">
            {typeof gym.members === "number" && gym.members > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
                <Dumbbell className="w-3.5 h-3.5 text-primary" /> {gym.members} members
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
              📍 {gym.city}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
              Member sign-in
            </span>
          </div>
        </div>

        <div className="relative text-xs text-secondary-foreground/40 hidden lg:block">Powered by Gymtra · gymtra.app</div>
      </div>

      {/* Login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 md:p-14 bg-background">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-display font-bold">Welcome back 👋</h2>
          <p className="text-sm text-muted-foreground mt-2.5">Sign in to continue your journey at {gym.name}.</p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <div className="inline-flex rounded-lg border border-border p-1 text-xs">
              <button type="button" className={`px-3 py-1.5 rounded-md ${loginMode === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setLoginMode("phone")}>Phone</button>
              <button type="button" className={`px-3 py-1.5 rounded-md ${loginMode === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setLoginMode("email")}>Email</button>
            </div>
            {loginMode === "phone" ? (
              <div>
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider">Phone</Label>
                <Input id="phone" type="tel" placeholder="+919876543210" className="mt-1.5 h-11"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required />
                {phoneError && <p className="mt-1 text-xs text-destructive">Enter a valid phone number.</p>}
              </div>
            ) : (
              <div>
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email</Label>
                <Input id="email" type="email" placeholder="you@email.com" className="mt-1.5 h-11"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 pr-10"
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
            <Button type="submit" className="w-full h-11 font-semibold gap-2 cta-glow hover:shadow-glow" disabled={loading || authLoading || phoneError}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowForgotPassword((prev) => !prev)}
            >
              Forgot password?
            </button>
            {showForgotPassword && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="inline-flex rounded-lg border border-border p-1 text-xs">
                  <button type="button" className={`px-3 py-1.5 rounded-md ${forgotMode === "member" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setForgotMode("member")}>Member</button>
                  <button type="button" className={`px-3 py-1.5 rounded-md ${forgotMode === "owner" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setForgotMode("owner")}>Owner</button>
                </div>
                {forgotMode === "member" ? (
                  <>
                    <Label htmlFor="reset-identifier" className="text-xs font-semibold uppercase tracking-wider">Email or phone</Label>
                    <Input
                      id="reset-identifier"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="member@email.com or +919876543210"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleForgotPassword} disabled={requestingReset || !resetIdentifier.trim()}>
                      {requestingReset ? "Submitting..." : "Request member reset"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Label htmlFor="owner-reset-email" className="text-xs font-semibold uppercase tracking-wider">Owner email</Label>
                    <Input
                      id="owner-reset-email"
                      type="email"
                      value={ownerResetEmail}
                      onChange={(e) => setOwnerResetEmail(e.target.value)}
                      placeholder="owner@yourgym.com"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleOwnerForgotPassword} disabled={requestingReset || !ownerResetEmail.trim()}>
                      {requestingReset ? "Sending..." : "Send owner reset link"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Try a demo role</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  onClick={() => useDemo(d.email, d.password)}
                  className="group w-full text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all px-3 py-2.5 flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${d.color === "primary" ? "bg-primary/10 text-primary" : d.color === "accent" ? "bg-accent/10 text-accent" : "bg-warning/15 text-warning"}`}>
                    <d.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{d.role}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.desc}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Fill →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymLogin;
