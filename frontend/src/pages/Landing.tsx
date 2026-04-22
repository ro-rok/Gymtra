import { Link } from "react-router-dom";
import {
  Search,
  Dumbbell,
  ArrowRight,
  Shield,
  Users,
  MessageCircle,
  BarChart3,
  Salad,
  CalendarCheck,
  Bell,
  Check,
  Sparkles,
  AlertCircle,
  X,
  QrCode,
  ScanLine,
  CheckCircle2,
  Flame,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchPublicGyms } from "@/lib/tenant-api";
import type { Gym } from "@/lib/types";
import { PageMeta } from "@/components/PageMeta";
import { GymIdentity } from "@/components/GymIdentity";

const features = [
  { icon: Users, title: "Member CRM", desc: "Profiles, goals, allergies, and plans in one place." },
  { icon: CalendarCheck, title: "Attendance & streaks", desc: "Self check-in with a clean streak and attendance view." },
  { icon: Salad, title: "Diet templates", desc: "Build once, tag by goal, and assign in seconds." },
  { icon: BarChart3, title: "Progress tracking", desc: "Weight, body fat, and water trends your team can act on." },
  { icon: MessageCircle, title: "WhatsApp reminders", desc: "Prewritten reminders that drive timely follow-through." },
  { icon: Bell, title: "Operations pulse", desc: "Renewals, expenses, payroll, and leave in one calm view." },
];

const stats = [
  { value: "12k+", label: "Members tracked" },
  { value: "98%", label: "Renewal visibility" },
  { value: "4.9*", label: "Owner rating" },
  { value: "<2 min", label: "Daily owner time" },
];

const tiers = [
  {
    name: "Starter",
    price: "Rs 999",
    period: "/mo",
    features: ["Up to 100 members", "Attendance & memberships", "WhatsApp reminders", "Mobile + web access"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "Rs 1,999",
    period: "/mo",
    features: ["Unlimited members", "Diet & progress tracking", "Trainer & staff seats", "Expense + payroll modules", "Priority support"],
    highlight: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    features: ["Multi-branch", "Custom branding", "API access", "Dedicated success manager"],
    highlight: false,
  },
];

const workflowSteps = [
  { id: "01", title: "Scan QR", copy: "Members check in instantly without front-desk bottlenecks." },
  { id: "02", title: "Assign diet", copy: "Trainers assign goal-matched plans from templates and track adherence." },
  { id: "03", title: "Track progress", copy: "Owners track streak momentum and daily health signals in one flow." },
] as const;

const Landing = () => {
  const [q, setQ] = useState("");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [gymsError, setGymsError] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [streakDays, setStreakDays] = useState(10);

  const loadGyms = () => {
    setLoadingGyms(true);
    setGymsError(false);
    let mounted = true;
    fetchPublicGyms()
      .then((items) => mounted && setGyms(items))
      .catch(() => {
        if (mounted) {
          setGyms([]);
          setGymsError(true);
        }
      })
      .finally(() => mounted && setLoadingGyms(false));
    return () => {
      mounted = false;
    };
  };

  useEffect(() => loadGyms(), []);
  useEffect(() => {
    const timer = window.setInterval(() => setDemoStep((prev) => (prev + 1) % workflowSteps.length), 3800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (demoStep !== 2) return;
    const target = 14;
    let current = 10;
    setStreakDays(current);
    const timer = window.setInterval(() => {
      current += 1;
      setStreakDays(current);
      if (current >= target) {
        window.clearInterval(timer);
      }
    }, 140);
    return () => window.clearInterval(timer);
  }, [demoStep]);

  const filtered = gyms.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()) || g.city.toLowerCase().includes(q.toLowerCase()));
  const hasQuery = q.trim().length > 0;
  const activeDemo = workflowSteps[demoStep];

  return (
    <div className="min-h-screen bg-background-base text-text-primary relative overflow-hidden">
      <div className="ambient-glow w-[24rem] h-[24rem] -top-44 -left-28" />
      <div className="ambient-glow w-[20rem] h-[20rem] top-[38rem] -right-24 opacity-15" />
      <PageMeta title="Gymtra - Multi-tenant gym management" description="Find your gym, sign in, and manage modern gym operations." canonicalPath="/" />

      <section className="relative overflow-hidden gradient-hero text-text-primary section-depth-hero">
        <div className="absolute inset-0 gradient-mesh opacity-80" />
        <div className="container relative">
          <nav className="flex items-center justify-between py-7">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">Gymtra</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
              <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
              <a href="#gyms" className="hover:text-text-primary transition-colors">Gyms</a>
              <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Shield className="w-4 h-4" /> Admin
                </Button>
              </Link>
              <a href="#gyms">
                <Button size="sm" className="gap-1.5">
                  Find your gym <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </nav>
          <div className="grid lg:grid-cols-2 gap-14 md:gap-16 items-center py-14 md:py-24 lg:py-28">
            <div className="animate-fade-in-up max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full surface-glass text-xs font-medium mb-6 text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> The operating system for modern gyms
              </div>
              <h1 className="type-hero text-balance max-w-2xl">
                Stop chasing members.
                <br />
                <span className="text-highlight">Run retention as a system.</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-text-secondary max-w-2xl">
                Gymtra connects check-ins, reminders, and coach actions so owners finally see momentum clearly instead of reacting late.
              </p>
              <div className="mt-10 flex flex-wrap gap-3.5">
                <a href="#gyms">
                  <Button size="lg" className="h-12 px-6 gap-2 font-semibold cta-glow">
                    <Dumbbell className="w-4 h-4" /> Find your gym
                  </Button>
                </a>
                <a href="#pricing">
                  <Button size="lg" variant="outline" className="h-12 px-6">List your gym</Button>
                </a>
              </div>
              <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-7">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-2xl font-bold text-primary-neon">{s.value}</div>
                    <div className="text-xs text-text-muted mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative animate-scale-in">
              <div className="absolute -inset-10 gradient-primary opacity-12 blur-3xl rounded-full" />
              <div className="hero-system-preview">
                <div className="hero-system-grid" />
                <motion.div
                  className="hero-system-card hero-system-card-top"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="text-[11px] text-text-muted">Retention Pulse</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Auto reminders sent</span>
                    <span className="text-primary-neon text-xs font-semibold">+18%</span>
                  </div>
                </motion.div>
                <motion.div
                  className="hero-system-card hero-system-card-mid"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="h-1.5 w-28 rounded-full bg-primary-neon/45" />
                  <div className="mt-3 h-1.5 w-40 rounded-full bg-white/15" />
                  <div className="mt-3 h-1.5 w-24 rounded-full bg-white/10" />
                </motion.div>
                <motion.div
                  className="hero-system-card hero-system-card-bottom"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.95, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="text-[11px] text-text-muted">Today</div>
                  <div className="mt-2 text-sm font-medium">87/124 checked in</div>
                  <div className="hero-progress mt-3">
                    <motion.div
                      className="hero-progress-fill"
                      initial={{ opacity: 0.5, scaleX: 0.5 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-separator" />
      <section className="container py-20 md:py-28 fade-section section-depth-demo">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16"><div className="type-eyebrow mb-3">How it works</div><h2 className="type-section text-balance">A real workflow, from floor action to owner insight.</h2></div>
        <div className="grid lg:grid-cols-[1fr_360px_1fr] gap-6 lg:gap-8 items-center">
          <div className="space-y-4 order-2 lg:order-1">{workflowSteps.slice(0, 2).map((step) => (<div key={step.id} className={`p-5 md:p-6 transition-colors duration-500 ease-in-out ${activeDemo.id === step.id ? "surface-card step-active" : "surface-card-background step-muted"}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-4 ${activeDemo.id === step.id ? "bg-primary-neon/16 text-primary-neon" : "bg-background-elevated text-text-secondary"}`}>{step.id}</div><h3 className="font-display text-lg font-semibold">{step.title}</h3><p className="type-body mt-2">{step.copy}</p></div>))}</div>
          <div className="order-1 lg:order-2 mx-auto w-full max-w-[22rem]">
            <div className="surface-card p-2.5 md:p-3 rounded-[2.2rem] bg-background/90 demo-surface">
              <div className="relative rounded-[1.8rem] border border-border/80 bg-secondary overflow-hidden shadow-md">
                <div className="h-7 flex items-center justify-center border-b border-border/70 bg-background-elevated/70">
                  <div className="w-20 h-1.5 rounded-full bg-border/70" />
                </div>
                <div className="p-4 md:p-5 min-h-[24rem]">
                  <div className="rounded-2xl gradient-hero border border-white/10 p-4">
                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span>Member Check-in</span>
                      <span>Today</span>
                    </div>
                    <AnimatePresence mode="wait">
                      {demoStep === 0 && (
                        <motion.div
                          key="qr"
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-4"
                        >
                          <div className="rounded-2xl border border-border/80 bg-background-elevated p-4 text-center">
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <QrCode className="w-8 h-8 text-primary" />
                            </div>
                            <div className="mt-3 font-semibold">Scan gym QR</div>
                            <div className="relative mt-4 mx-auto w-24 h-6 overflow-hidden rounded-lg">
                              <motion.div
                                className="absolute inset-x-0 h-[2px] bg-primary-neon/80 shadow-[0_0_16px_hsl(var(--primary-neon)/0.5)]"
                                animate={{ y: ["0%", "120%", "0%"], opacity: [0.5, 0.95, 0.5] }}
                                transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
                              />
                              <ScanLine className="w-full text-primary-neon/65" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {demoStep === 1 && (
                        <motion.div
                          key="ok"
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-4"
                        >
                          <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-center relative overflow-hidden">
                            <motion.div
                              className="absolute inset-0 rounded-2xl border border-success/35"
                              initial={{ opacity: 0.35, scale: 0.92 }}
                              animate={{ opacity: 0, scale: 1.15 }}
                              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            />
                            <motion.div
                              className="mx-auto w-14 h-14 rounded-full bg-success/25 flex items-center justify-center"
                              initial={{ y: 5, scale: 0.88 }}
                              animate={{ y: 0, scale: [0.92, 1.08, 1] }}
                              transition={{ duration: 0.95, ease: [0.2, 0.8, 0.2, 1] }}
                            >
                              <CheckCircle2 className="w-7 h-7 text-success" />
                            </motion.div>
                            <div className="mt-3 font-semibold">Check-in successful</div>
                          </div>
                          <div className="mt-3 rounded-xl border border-border/80 bg-background-elevated p-3">
                            <div className="text-xs text-text-muted">Assigned plan</div>
                            <div className="mt-1 text-sm font-medium">Lean strength, high-protein phase</div>
                          </div>
                        </motion.div>
                      )}
                      {demoStep === 2 && (
                        <motion.div
                          key="streak"
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-4 space-y-3"
                        >
                          <div className="rounded-xl border border-border/80 bg-background-elevated p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">Current streak</span>
                              <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
                                <Flame className="w-3.5 h-3.5" /> {streakDays} days
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
                              <motion.div
                                initial={{ opacity: 0.45, scaleX: 0.58 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full bg-primary rounded-full origin-left"
                                style={{ width: "78%" }}
                              />
                            </div>
                          </div>
                          <div className="rounded-xl border border-border/80 bg-background-elevated p-3 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-text-muted">Owner view</div>
                              <div className="text-sm font-medium">87 / 124 checked in</div>
                            </div>
                            <MapPin className="w-4 h-4 text-text-muted" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 order-3"><div className={`p-5 md:p-6 transition-colors duration-500 ease-in-out ${activeDemo.id === workflowSteps[2].id ? "surface-card step-active" : "surface-card-background step-muted"}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-4 ${activeDemo.id === workflowSteps[2].id ? "bg-primary-neon/16 text-primary-neon" : "bg-background-elevated text-text-secondary"}`}>{workflowSteps[2].id}</div><h3 className="font-display text-lg font-semibold">{workflowSteps[2].title}</h3><p className="type-body mt-2">{workflowSteps[2].copy}</p></div><div className="surface-card-background p-5 md:p-6"><div className="type-eyebrow mb-2">Live mechanism</div><h3 className="font-display text-xl font-semibold">One source of truth for every role.</h3><p className="type-body mt-2">Members complete actions, trainers guide outcomes, and owners monitor momentum in one connected loop.</p></div></div>
        </div>
      </section>

      <div className="section-separator" />
      <section id="features" className="container py-20 md:py-28 fade-section section-depth-features">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-9 items-start"><div className="max-w-xl"><div className="type-eyebrow mb-3">What you get</div><h2 className="type-section text-balance">Capabilities built for daily operations.</h2><p className="type-body mt-4">Gymtra reduces admin drag and keeps member progress visible.</p></div><div className="grid sm:grid-cols-2 gap-4">{features.slice(0, 4).map((f, i) => (<div key={f.title} className={`group p-5 ${i === 0 ? "surface-card-primary" : "surface-card"}`}><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform duration-500 ease-in-out group-hover:scale-105"><f.icon className="w-5 h-5" /></div><h3 className="font-display font-semibold text-base">{f.title}</h3><p className="text-sm text-text-secondary mt-1.5">{f.desc}</p></div>))}</div></div>
      </section>

      <div className="section-separator" />
      <section id="gyms" className="container py-20 md:py-28 fade-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"><div><div className="type-eyebrow mb-2">Gym discovery</div><h2 className="type-section">Browse gyms live on Gymtra</h2><p className="text-sm text-text-secondary mt-2">{loadingGyms ? "Loading gyms..." : gymsError ? "Could not load gyms right now." : `${filtered.length} gym${filtered.length === 1 ? "" : "s"} available`}</p></div><div className="relative md:w-80"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by gym or city..." className="pl-10 pr-10 h-11" />{hasQuery && <button type="button" aria-label="Clear gym search" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>}</div></div>
        {loadingGyms ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`gym-skeleton-${i}`} className="surface-card p-6">
                <div className="w-14 h-14 rounded-2xl bg-muted mb-4" />
                <div className="h-5 w-40 rounded bg-muted mb-2" />
                <div className="h-4 w-52 rounded bg-muted mb-4" />
                <div className="h-4 w-32 rounded bg-muted mb-3" />
                <div className="h-4 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : gymsError ? (
          <div className="surface-card-background border-destructive/35 p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold">Directory is temporarily unavailable</h3>
            <p className="text-sm text-text-secondary mt-1">We could not load live gyms right now.</p>
            <p className="text-xs text-text-muted mt-2">Retry to continue discovering gyms near you.</p>
            <Button variant="outline" className="mt-4" onClick={loadGyms}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card-background border-dashed p-12 text-center">
            <h3 className="font-display font-semibold">No gyms found for "{q}"</h3>
            <p className="text-sm text-text-secondary mt-1">Try another city or a shorter gym name.</p>
            <Button variant="outline" className="mt-4" onClick={() => setQ("")}>Clear search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((gym) => (
              <Link
                key={gym.id}
                to={`/${gym.slug}`}
                className="group relative p-6 overflow-hidden surface-card gym-card-premium transition-all duration-500 ease-in-out"
              >
                <div className="flex items-start justify-between mb-4">
                  <GymIdentity name={gym.name} logo={gym.logo} brandColor={gym.brandColor} size="md" />
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">Nearby</span>
                </div>
                <h3 className="font-display font-bold text-lg">{gym.name}</h3>
                <div className="mt-3 text-sm text-text-secondary inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-neon/90" /> {gym.city}
                </div>
                <p className="text-sm text-text-muted mt-2 line-clamp-2">{gym.tagline || "Fitness, coaching, and accountability in one place."}</p>
                {typeof gym.members === "number" && (
                  <div className="mt-3 text-xs text-text-muted">{gym.members} members on Gymtra</div>
                )}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-sm font-semibold text-text-primary">
                  <span className="inline-flex items-center gap-2">
                    Enter gym workspace
                    <ArrowRight className="w-4 h-4 transition-transform duration-500 ease-in-out group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="section-separator" />
      <section id="pricing" className="bg-background-elevated/40 border-y border-border py-20 md:py-28 fade-section section-depth-pricing">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
            <div className="type-eyebrow mb-3">Pricing</div>
            <h2 className="type-section">Simple pricing, built for gyms.</h2>
            <p className="mt-4 text-sm md:text-base text-text-secondary">Start free. No setup required.</p>
            <p className="mt-2 text-xs text-text-muted">Trusted by independent studios and multi-branch operators.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tiers.map((t) => (
              <div key={t.name} className={`p-6 hover-lift relative ${t.highlight ? "surface-card-primary pricing-focus-card" : "surface-card-background"}`}>
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    Most popular
                  </span>
                )}
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">{t.price}</span>
                  <span className="text-sm text-text-muted">{t.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant={t.highlight ? "default" : "secondary"} className={`w-full mt-7 ${t.highlight ? "cta-glow" : ""}`}>
                  {t.name === "Scale" ? "Talk to us" : "Start trial"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-separator" />
      <section className="container py-20 md:py-28 fade-section">
        <div className="relative rounded-3xl overflow-hidden gradient-hero text-secondary-foreground p-12 md:p-20 text-center border border-white/10">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/18 blur-3xl" /><div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/18 blur-3xl" />
          <div className="relative"><h2 className="text-3xl md:text-5xl font-display font-bold text-balance max-w-3xl mx-auto">Ready to run your gym with calm, clear control?</h2><p className="text-text-secondary mt-5 max-w-2xl mx-auto">Go live in minutes, align every role, and keep retention visible from day one.</p><div className="mt-9 flex flex-wrap gap-3.5 justify-center"><Button size="lg" className="h-[52px] px-8 font-semibold gap-2 cta-glow">Start free trial <ArrowRight className="w-4 h-4" /></Button><a href="#gyms"><Button size="lg" variant="outline" className="h-[52px] px-8">Explore gyms</Button></a></div></div>
        </div>
      </section>

      <footer className="border-t border-border py-12 fade-section"><div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm"><div className="flex items-center gap-2 text-text-muted"><div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center"><Dumbbell className="w-3.5 h-3.5 text-primary-foreground" /></div><span>© 2026 Gymtra - Built with strength for gyms.</span></div><div className="flex items-center gap-6 text-text-muted text-xs"><a href="#" className="hover:text-text-primary">Terms</a><a href="#" className="hover:text-text-primary">Privacy</a><Link to="/admin/login" className="hover:text-text-primary">Admin</Link></div></div></footer>
    </div>
  );
};

export default Landing;
