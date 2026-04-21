import { Link } from "react-router-dom";
import { Search, Dumbbell, ArrowRight, Shield, Zap, Users, MessageCircle, BarChart3, Salad, CalendarCheck, Bell, Building2, Star, Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchPublicGyms } from "@/lib/tenant-api";
import type { Gym } from "@/lib/types";
import heroImg from "@/assets/hero-fitness.jpg";
import { PageMeta } from "@/components/PageMeta";

const features = [
  { icon: Users, title: "Member CRM", desc: "Profiles, goals, allergies, plans — every member, one tap away." },
  { icon: CalendarCheck, title: "Attendance & streaks", desc: "Self check-in, calendar view, ghost-detection for owners." },
  { icon: Salad, title: "Diet templates", desc: "Build, tag, and assign meal plans matched to member goals." },
  { icon: BarChart3, title: "Progress tracking", desc: "Weight, body-fat, and water — beautiful charts members actually open." },
  { icon: MessageCircle, title: "WhatsApp reminders", desc: "Witty, pre-drafted nudges that get members back on the floor." },
  { icon: Bell, title: "Operations pulse", desc: "Renewals, expenses, payroll, leave — all in one calm dashboard." },
];

const stats = [
  { value: "12k+", label: "Members tracked" },
  { value: "98%", label: "Renewal visibility" },
  { value: "4.9★", label: "Owner rating" },
  { value: "<2 min", label: "Daily owner time" },
];

const tiers = [
  { name: "Starter", price: "₹999", period: "/mo", features: ["Up to 100 members", "Attendance & memberships", "WhatsApp reminders", "Mobile + web access"], highlight: false },
  { name: "Pro", price: "₹1,999", period: "/mo", features: ["Unlimited members", "Diet & progress tracking", "Trainer & staff seats", "Expense + payroll modules", "Priority support"], highlight: true },
  { name: "Scale", price: "Custom", period: "", features: ["Multi-branch", "Custom branding", "API access", "Dedicated success manager"], highlight: false },
];

const Landing = () => {
  const [q, setQ] = useState("");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPublicGyms()
      .then((items) => {
        if (mounted) setGyms(items);
      })
      .catch(() => {
        if (mounted) setGyms([]);
      })
      .finally(() => {
        if (mounted) setLoadingGyms(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = gyms.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()) || g.city.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="GymOS - Multi-tenant gym management"
        description="Find your gym, sign in, and manage modern gym operations."
        canonicalPath="/"
      />
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden gradient-hero text-secondary-foreground">
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(88_86%_52%/0.25),_transparent_50%)]" />

        <div className="container relative">
          {/* Nav */}
          <nav className="flex items-center justify-between py-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">GymOS</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-secondary-foreground/70">
              <a href="#features" className="hover:text-secondary-foreground transition-colors">Features</a>
              <a href="#gyms" className="hover:text-secondary-foreground transition-colors">Gyms</a>
              <a href="#pricing" className="hover:text-secondary-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-secondary-foreground hover:bg-white/10 hover:text-secondary-foreground gap-2">
                  <Shield className="w-4 h-4" /> Admin
                </Button>
              </Link>
              <a href="#gyms"><Button size="sm" className="gap-1.5">Find your gym <ArrowRight className="w-3.5 h-3.5" /></Button></a>
            </div>
          </nav>

          {/* Hero content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center py-12 md:py-20 lg:py-24">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> The operating system for modern gyms
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-[1.05] text-balance">
                Run your gym.<br />
                <span className="text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.45)]">Grow your members.</span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-secondary-foreground/70 max-w-xl">
                One platform for owners, trainers, and members. Smart tracking, witty reminders, real retention. Built mobile-first for the way gyms actually work.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#gyms"><Button size="lg" className="h-12 px-6 gap-2 font-semibold">
                  <Dumbbell className="w-4 h-4" /> Browse gyms
                </Button></a>
                <a href="#pricing"><Button size="lg" variant="outline" className="h-12 px-6 bg-white/5 border-white/20 text-secondary-foreground hover:bg-white/10 hover:text-secondary-foreground">
                  List your gym
                </Button></a>
              </div>

              {/* Stats strip */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
                    <div className="text-xs text-secondary-foreground/60 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="relative animate-scale-in">
              <div className="absolute -inset-4 gradient-primary opacity-30 blur-3xl rounded-full" />
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/5]">
                <img src={heroImg} alt="Athlete training in modern gym" className="w-full h-full object-cover" width={1600} height={1200} />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent" />
                {/* Floating cards */}
                <div className="absolute top-6 left-6 glass rounded-xl px-3 py-2 flex items-center gap-2 animate-float">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-[10px] text-secondary-foreground/60 uppercase tracking-wider">Streak</div>
                    <div className="text-sm font-bold">14 days 🔥</div>
                  </div>
                </div>
                <div className="absolute bottom-6 right-6 glass rounded-xl px-3 py-2 animate-float" style={{ animationDelay: "1s" }}>
                  <div className="text-[10px] text-secondary-foreground/60 uppercase tracking-wider">Today's check-ins</div>
                  <div className="text-lg font-display font-bold">87 / 124</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="container py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">What you get</div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-balance">Everything to run a modern gym, nothing you don't need.</h2>
          <p className="text-muted-foreground mt-3">Built with owners, trainers, and members in mind. No bloat, no fluff.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 hover-lift"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ROLES ─── */}
      <section className="bg-muted/30 border-y border-border py-16 md:py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">One platform · three experiences</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Designed for everyone in your gym.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { role: "Owners", icon: Building2, color: "primary", title: "Operate calmly", points: ["Renewals & expiry alerts", "Expense + payroll", "Reminder center", "Multi-staff seats"] },
              { role: "Trainers", icon: Dumbbell, color: "accent", title: "Coach better", points: ["Member performance", "Diet assignment", "Attendance marking", "Goal tracking"] },
              { role: "Members", icon: Zap, color: "warning", title: "Stay consistent", points: ["Daily task streaks", "Self check-in", "Diet & progress", "Plan visibility"] },
            ].map((r) => (
              <div key={r.role} className="rounded-2xl bg-card border border-border p-6 hover-lift">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${r.color === "primary" ? "bg-primary/10 text-primary" : r.color === "accent" ? "bg-accent/10 text-accent" : "bg-warning/15 text-warning"}`}>
                  <r.icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{r.role}</div>
                <h3 className="font-display font-bold text-xl mt-1">{r.title}</h3>
                <ul className="mt-4 space-y-2">
                  {r.points.map((p) => (
                    <li key={p} className="text-sm text-foreground/80 flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GYM DIRECTORY ─── */}
      <section id="gyms" className="container py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Gym directory</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Find your gym</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {loadingGyms ? "Loading gyms..." : `${filtered.length} gym${filtered.length === 1 ? "" : "s"} live on the platform`}
            </p>
          </div>
          <div className="relative md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by gym or city…"
              className="pl-10 h-11"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold">No gyms match "{q}"</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different city or gym name.</p>
            <Button variant="outline" className="mt-4" onClick={() => setQ("")}>Clear search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((gym, i) => (
              <Link
                key={gym.id}
                to={`/${gym.slug}`}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover-lift overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl gradient-card border border-border flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      {gym.logo}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                      <Star className="w-3.5 h-3.5 fill-current" /> 4.{8 - (i % 3)}
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-lg">{gym.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{gym.tagline}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">📍 {gym.city}</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{gym.members ?? 0} members</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm font-semibold text-primary">
                    Enter gym <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="bg-muted/30 border-y border-border py-16 md:py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">Pricing</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Simple, gym-friendly pricing.</h2>
            <p className="text-muted-foreground mt-3">No setup fees. Cancel anytime. 14-day free trial on every plan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tiers.map((t) => (
              <div key={t.name} className={`rounded-2xl border p-6 hover-lift ${t.highlight ? "border-primary bg-card shadow-glow relative" : "border-border bg-card"}`}>
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">Most popular</span>
                )}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">{t.price}</span>
                  <span className="text-sm text-muted-foreground">{t.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full mt-6 ${t.highlight ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}>
                  {t.name === "Scale" ? "Talk to us" : "Start trial"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="container py-16 md:py-24">
        <div className="relative rounded-3xl overflow-hidden gradient-hero text-secondary-foreground p-10 md:p-16 text-center">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-balance max-w-2xl mx-auto">
              Ready to make your gym feel <span className="text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.45)]">effortless?</span>
            </h2>
            <p className="text-secondary-foreground/70 mt-4 max-w-xl mx-auto">Get your gym live in under 10 minutes. Owners, trainers, and members onboarded in one flow.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button size="lg" className="h-12 px-7 font-semibold gap-2">Start free trial <ArrowRight className="w-4 h-4" /></Button>
              <a href="#gyms"><Button size="lg" variant="outline" className="h-12 px-7 bg-white/5 border-white/20 text-secondary-foreground hover:bg-white/10 hover:text-secondary-foreground">Explore gyms</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span>© 2026 GymOS · Built with 💪 for gyms.</span>
          </div>
          <div className="flex items-center gap-6 text-muted-foreground text-xs">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <Link to="/admin/login" className="hover:text-foreground">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
