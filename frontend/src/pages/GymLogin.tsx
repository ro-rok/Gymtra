import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, Crown, Users, User as UserIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mockGyms } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const demoAccounts = [
  { role: "Owner", email: "owner@ironparadise.com", password: "owner123", icon: Crown, color: "primary", desc: "Full operational control" },
  { role: "Trainer", email: "trainer@ironparadise.com", password: "trainer123", icon: Users, color: "accent", desc: "Members + diet + attendance" },
  { role: "Member", email: "aarav@email.com", password: "member123", icon: UserIcon, color: "warning", desc: "Personal dashboard view" },
];

const GymLogin = () => {
  const { gymSlug } = useParams();
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { toast } = useToast();
  const gym = mockGyms.find((g) => g.slug === gymSlug) || mockGyms[0];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.gymSlug === gymSlug) {
    const rolePath = user.role === "owner" ? "owner" : user.role === "trainer" ? "trainer" : "member";
    navigate(`/${gymSlug}/${rolePath}`, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const stored = JSON.parse(localStorage.getItem("gymos_auth_user") || "{}");
      const rolePath = stored.role === "owner" ? "owner" : stored.role === "trainer" ? "trainer" : "member";
      navigate(`/${gymSlug}/${rolePath}`);
    } else {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    }
  };

  const useDemo = (e: string, p: string) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Brand panel */}
      <div className="lg:w-1/2 relative overflow-hidden gradient-hero text-secondary-foreground p-8 md:p-12 lg:p-16 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />

        <Link to="/" className="relative inline-flex items-center gap-2 text-sm text-secondary-foreground/70 hover:text-secondary-foreground transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> All gyms
        </Link>

        <div className="relative animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center text-5xl mb-6 shadow-glow">
            {gym.logo}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">{gym.name}</h1>
          <p className="text-secondary-foreground/70 mt-3 text-lg">{gym.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
              <Dumbbell className="w-3.5 h-3.5 text-primary" /> {gym.members} members
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
              📍 {gym.city}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Open
            </span>
          </div>
        </div>

        <div className="relative text-xs text-secondary-foreground/40 hidden lg:block">Powered by GymOS · gymos.app</div>
      </div>

      {/* Login form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-display font-bold">Welcome back 👋</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Sign in to continue your journey at {gym.name}.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" placeholder="you@email.com" className="mt-1.5 h-11"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" className="mt-1.5 h-11"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
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
