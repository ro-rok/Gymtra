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
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { animated, useSpring } from "@react-spring/web";
import { useButton, useFocusRing } from "react-aria";
import Balance from "react-wrap-balancer";
import Lenis from "lenis";
import clsx from "clsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchPublicGyms } from "@/lib/tenant-api";
import type { Gym } from "@/lib/types";
import { PageMeta } from "@/components/PageMeta";
import { GymIdentity } from "@/components/GymIdentity";
import { hasCompletedOnboardingAny, hasSeenDemoAny } from "@/lib/onboarding-state";
import { EASING, UI_TIMING } from "@/lib/ui-timing";

const features = [
  { icon: Users, title: "Member CRM", desc: "Profiles, goals, allergies, and plans in one place." },
  { icon: CalendarCheck, title: "Attendance & streaks", desc: "Self check-in with a clean streak and attendance view." },
  { icon: Salad, title: "Diet templates", desc: "Build once, tag by goal, and assign in seconds." },
  { icon: BarChart3, title: "Progress tracking", desc: "Weight, body fat, and water trends your team can act on." },
  { icon: MessageCircle, title: "WhatsApp reminders", desc: "Prewritten reminders that drive timely follow-through." },
  { icon: Bell, title: "Operations pulse", desc: "Renewals, expenses, payroll, and leave in one view." },
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
  { id: "01", title: "Scan QR", copy: "Members check in instantly. No front-desk bottlenecks." },
  { id: "02", title: "Assign diet", copy: "Trainers assign goal-matched plans. Adherence stays visible." },
  { id: "03", title: "Track progress", copy: "Owners track streaks and health signals in one flow." },
] as const;

const sublineVariants = [
  "Know who’s slipping before they leave.",
  "See what needs action — instantly.",
  "Your gym runs itself, daily.",
] as const;

const intelligenceSignals = [
  "3 renewals due this week",
  "Attendance dropped 12% yesterday",
  "2 members missed 3 sessions",
  "4 diets auto-assigned this morning",
  "7 streak recoveries triggered",
] as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const ramp = (time: number, start: number, duration: number) => clamp01((time - start) / duration);
const randomSignedRange = (min: number, max: number) => {
  const magnitude = min + Math.random() * (max - min);
  return (Math.random() > 0.5 ? 1 : -1) * magnitude;
};

const IconClearButton = ({ onPress }: { onPress: () => void }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const { buttonProps, isPressed } = useButton({ "aria-label": "Clear gym search", onPress }, ref);
  const { isFocusVisible, focusProps } = useFocusRing();

  return (
    <button
      {...buttonProps}
      {...focusProps}
      ref={ref}
      type="button"
      className={clsx(
        "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out",
        isPressed && "scale-95",
        isFocusVisible && "ring-2 ring-primary-neon/45 rounded-md"
      )}
    >
      <X className="w-4 h-4" />
    </button>
  );
};

const Landing = () => {
  const [q, setQ] = useState("");
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [gymsError, setGymsError] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [streakDays, setStreakDays] = useState(12);
  const [heroTimeMs, setHeroTimeMs] = useState(0);
  const [sublineIndex, setSublineIndex] = useState(0);
  const [sublinePhase, setSublinePhase] = useState<"visible" | "exit" | "enter">("visible");
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isHeroPreviewHovered, setIsHeroPreviewHovered] = useState(false);
  const [heroScrollY, setHeroScrollY] = useState(0);
  const [ctaProximity, setCtaProximity] = useState(0);
  const [howTilt, setHowTilt] = useState({ x: 0, y: 0 });
  const [loopVariance, setLoopVariance] = useState({
    eventJitterA: randomSignedRange(150, 300),
    eventJitterB: randomSignedRange(150, 300),
    eventJitterC: randomSignedRange(150, 300),
    glowVariance: 1 + (Math.random() * 0.16 - 0.08),
    floatVariance: randomSignedRange(0.4, 2),
    latencyMs: 80 + Math.random() * 60,
  });
  const ctaWrapRef = useRef<HTMLDivElement | null>(null);
  const prevHeroTimeRef = useRef(0);
  const [landingCta, setLandingCta] = useState<{ label: string; href: string; isRoute?: boolean }>({
    label: "Find your gym",
    href: "#gyms",
  });

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
    if (hasCompletedOnboardingAny()) {
      setLandingCta({ label: "Continue setup", href: "/demo/star-fitness", isRoute: true });
      return;
    }
    if (hasSeenDemoAny()) {
      setLandingCta({ label: "Continue setup", href: "/demo/star-fitness", isRoute: true });
    }
  }, []);
  useEffect(() => {
    const mediaMobile = window.matchMedia("(max-width: 768px)");
    const mediaReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMediaState = () => {
      setIsMobileViewport(mediaMobile.matches);
      setPrefersReducedMotion(mediaReduced.matches);
    };
    applyMediaState();
    mediaMobile.addEventListener("change", applyMediaState);
    mediaReduced.addEventListener("change", applyMediaState);
    return () => {
      mediaMobile.removeEventListener("change", applyMediaState);
      mediaReduced.removeEventListener("change", applyMediaState);
    };
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: isMobileViewport ? 0.95 : 1.02,
      smoothWheel: true,
      touchMultiplier: 1.1,
    });

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };
    frameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [isMobileViewport]);

  useEffect(() => {
    const timer = window.setInterval(() => setDemoStep((prev) => (prev + 1) % workflowSteps.length), 2800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isPageVisible) return;
    let raf = 0;
    const loop = (time: number) => {
      const nextTime = time % UI_TIMING.landing.heroLoopMs;
      if (nextTime < prevHeroTimeRef.current) {
        setLoopVariance({
          eventJitterA: randomSignedRange(150, 300),
          eventJitterB: randomSignedRange(150, 300),
          eventJitterC: randomSignedRange(150, 300),
          glowVariance: 1 + (Math.random() * 0.16 - 0.08),
          floatVariance: randomSignedRange(0.4, 2),
          latencyMs: 80 + Math.random() * 60,
        });
      }
      prevHeroTimeRef.current = nextTime;
      setHeroTimeMs(nextTime);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [isPageVisible]);

  useEffect(() => {
    const onScroll = () => setHeroScrollY(window.scrollY || 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isPageVisible) return;
    const cadence = UI_TIMING.landing.sublineIntervalMs;
    const cycle = window.setInterval(() => {
      setSublinePhase("exit");
      window.setTimeout(() => {
        setSublineIndex((prev) => (prev + 1) % sublineVariants.length);
        setSublinePhase("enter");
        window.setTimeout(() => setSublinePhase("visible"), UI_TIMING.landing.sublineEnterMs);
      }, UI_TIMING.landing.sublineExitMs);
    }, cadence);
    return () => window.clearInterval(cycle);
  }, [isPageVisible]);

  useEffect(() => {
    const progress = heroTimeMs / UI_TIMING.landing.heroLoopMs;
    const nextDays = progress > 0.57 ? 14 : 12;
    setStreakDays(nextDays);
  }, [heroTimeMs]);

  const filtered = gyms.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()) || g.city.toLowerCase().includes(q.toLowerCase()));
  const hasQuery = q.trim().length > 0;
  const activeDemo = workflowSteps[demoStep];
  const dampen =
    prefersReducedMotion
      ? UI_TIMING.landing.reducedMotionDampenFactor
      : isMobileViewport
        ? UI_TIMING.landing.mobileDampenFactor
        : 1;
  const eventOneStart = UI_TIMING.landing.event1StartMs + loopVariance.eventJitterA;
  const eventTwoStart = UI_TIMING.landing.event2StartMs + loopVariance.eventJitterB;
  const eventThreeStart = UI_TIMING.landing.event3StartMs + loopVariance.eventJitterC;
  const snapStart = 300 + Math.max(0, loopVariance.eventJitterA * 0.12);
  const eventOneProgress = ramp(heroTimeMs, eventOneStart, UI_TIMING.landing.eventBlendMs);
  const eventTwoProgress = ramp(heroTimeMs, eventTwoStart, UI_TIMING.landing.eventBlendMs);
  const eventTwoDelayedProgress = ramp(heroTimeMs, eventTwoStart + loopVariance.latencyMs, UI_TIMING.landing.eventBlendMs);
  const eventThreeProgress = ramp(heroTimeMs, eventThreeStart, UI_TIMING.landing.eventBlendMs);
  const eventFourProgress = ramp(heroTimeMs, UI_TIMING.landing.event4StartMs, UI_TIMING.landing.eventBlendMs);
  const isEventOne = eventOneProgress > 0.08;
  const isEventTwo = eventTwoProgress > 0.08;
  const isEventThree = eventThreeProgress > 0.08;
  const isEventFour = eventFourProgress > 0.08;
  const isHeroReset = heroTimeMs >= UI_TIMING.landing.resetStartMs;
  const heroKpi = eventTwoDelayedProgress > 0.08 ? 87 : 86;
  const heroSignalIndex = Math.floor((heroTimeMs % UI_TIMING.landing.heroLoopMs) / 1300) % intelligenceSignals.length;
  const glowRise = ramp(heroTimeMs, UI_TIMING.landing.event1StartMs, UI_TIMING.landing.glowEnvelopeRiseMs);
  const glowFall = 1 - ramp(heroTimeMs, UI_TIMING.landing.event4StartMs, UI_TIMING.landing.glowEnvelopeFallMs);
  const snapIn = ramp(heroTimeMs, snapStart, 110);
  const snapOut = 1 - ramp(heroTimeMs, snapStart + 142, 150);
  const snapPulse = clamp01(snapIn * snapOut);
  const glowEnvelope = clamp01((0.35 + glowRise * 0.7) * Math.max(0.5, glowFall) * loopVariance.glowVariance + snapPulse * 0.148);
  const ctaAttention = clamp01(eventOneProgress * 0.45 + eventTwoDelayedProgress * 0.6 + snapPulse * 0.9);
  const heroSceneProgress = clamp01(heroScrollY / 320);
  const heroSceneScale = 1 - heroSceneProgress * 0.015;
  const heroSceneOpacity = 1 - heroSceneProgress * 0.08;
  const separatorBlur = 8 - heroSceneProgress * 8;
  const separatorOpacity = 0.45 + heroSceneProgress * 0.45;
  const sublineStyle =
    sublinePhase === "exit"
      ? { opacity: 0, y: -6 }
      : sublinePhase === "enter"
        ? { opacity: 1, y: 0 }
        : { opacity: 1, y: 0 };
  const heroSpring = useSpring({
    transform: isHeroPreviewHovered ? `translateY(${(-4 - loopVariance.floatVariance) * dampen}px) scale(${1 + 0.008 * dampen})` : "translateY(0px) scale(1)",
    config: { tension: 220, friction: 24, mass: 0.75 },
  });

  return (
    <div className="min-h-screen bg-background-base text-text-primary relative overflow-hidden">
      <div className="ambient-glow w-[24rem] h-[24rem] -top-44 -left-28" />
      <div className="ambient-glow w-[20rem] h-[20rem] top-[38rem] -right-24 opacity-15" />
      <PageMeta title="Gymtra - Multi-tenant gym management" description="Find your gym, sign in, and manage modern gym operations." canonicalPath="/" />

      <section className="relative overflow-hidden gradient-hero gradient-drift text-text-primary section-depth-hero">
        <motion.div
          className="absolute inset-0 gradient-mesh opacity-80 hero-parallax-layer"
          animate={{ y: -4 * eventThreeProgress * dampen, opacity: isHeroReset ? 0.76 : 0.84 + glowEnvelope * 0.05 }}
          transition={{ duration: 0.56, ease: EASING.standard }}
        />
        <motion.div
          className="absolute -left-20 top-16 h-52 w-52 rounded-full bg-primary/20 blur-[82px]"
          animate={{
            opacity: 0.12 + glowEnvelope * 0.22,
            scale: 1 + (eventTwoProgress * 0.08 + eventThreeProgress * 0.04) * dampen,
          }}
          transition={{ duration: 0.46, ease: EASING.standard }}
        />
        <motion.div
          className="container relative"
          style={{ scale: heroSceneScale, opacity: heroSceneOpacity }}
          transition={{ duration: 0.18, ease: EASING.standard }}
        >
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
                <Balance>
                  Stop chasing members.
                  <br />
                  <span className="text-highlight">Run retention as a system.</span>
                </Balance>
              </h1>
              <AnimatePresence mode="wait">
                <motion.p
                  key={sublineVariants[sublineIndex]}
                  className="mt-6 text-base md:text-lg text-text-secondary max-w-2xl"
                  initial={{ opacity: 0, y: 6 }}
                  animate={sublineStyle}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    duration: sublinePhase === "exit" ? UI_TIMING.landing.sublineExitMs / 1000 : UI_TIMING.landing.sublineEnterMs / 1000,
                    ease: EASING.entrance,
                  }}
                >
                  {sublineVariants[sublineIndex]}
                </motion.p>
              </AnimatePresence>
              <div
                ref={ctaWrapRef}
                className="mt-10 flex flex-wrap gap-3.5 items-center"
                onMouseMove={(event) => {
                  if (!ctaWrapRef.current) return;
                  const rect = ctaWrapRef.current.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
                  setCtaProximity(clamp01(1 - distance / 220));
                }}
                onMouseLeave={() => setCtaProximity(0)}
              >
                {landingCta.isRoute ? (
                  <Link to={landingCta.href}>
                    <Button
                      size="lg"
                      className="h-12 px-6 gap-2 font-semibold cta-glow cta-glow-idle cta-gravity interactive-ripple"
                      style={{
                        boxShadow: `0 12px 30px -18px hsl(var(--primary-neon)/${0.36 + ctaAttention * 0.258 + ctaProximity * 0.202})`,
                        transform: `scale(${1 + ctaAttention * 0.011 + ctaProximity * 0.0092})`,
                      }}
                    >
                      <Dumbbell className="w-4 h-4" /> Start free trial
                    </Button>
                  </Link>
                ) : (
                  <a href={landingCta.href}>
                    <Button
                      size="lg"
                      className="h-12 px-6 gap-2 font-semibold cta-glow cta-glow-idle cta-gravity interactive-ripple"
                      style={{
                        boxShadow: `0 12px 30px -18px hsl(var(--primary-neon)/${0.36 + ctaAttention * 0.258 + ctaProximity * 0.202})`,
                        transform: `scale(${1 + ctaAttention * 0.011 + ctaProximity * 0.0092})`,
                      }}
                    >
                      <Dumbbell className="w-4 h-4" /> Start free trial
                    </Button>
                  </a>
                )}
                <Link to="/demo/star-fitness">
                  <Button size="lg" variant="secondary" className="h-12 px-6 interactive-ripple">Watch demo</Button>
                </Link>
                <a href="#gyms">
                  <Button size="lg" variant="outline" className="h-12 px-6 interactive-ripple">Explore gyms</Button>
                </a>
              </div>
              <p className="mt-3 text-xs text-text-muted">Takes ~2 minutes to set up</p>
              <p className="mt-2 text-xs text-primary-neon/90">Try it like a real gym owner. Takes under 60 seconds.</p>
              <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-7">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-2xl font-bold text-primary-neon">{s.value}</div>
                    <div className="text-xs text-text-muted mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <animated.div
              className="relative animate-scale-in lg:pl-4"
              style={heroSpring}
              onMouseEnter={() => setIsHeroPreviewHovered(true)}
              onMouseLeave={() => setIsHeroPreviewHovered(false)}
            >
              <motion.div
                className="absolute -inset-10 gradient-primary opacity-12 blur-3xl rounded-full"
                animate={{
                  opacity: 0.09 + glowEnvelope * 0.14,
                  scale: 1 + (eventThreeProgress * 0.04 + eventTwoProgress * 0.02) * dampen,
                }}
                transition={{ duration: 0.52, ease: EASING.standard }}
              />
              <motion.div
                className="hero-system-preview hero-card-float animate-in fade-in-0 zoom-in-[0.99] duration-700 lg:w-[108%] lg:max-w-[42rem] lg:ml-auto"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: EASING.entrance }}
              >
                <div className="hero-system-grid" />
                <motion.div
                  className="hero-system-card hero-system-card-top animate-in slide-in-from-top-1 fade-in-0 duration-500"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASING.entrance }}
                >
                  <div className="text-[11px] text-text-muted">Retention Pulse</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Auto reminders sent</span>
                    <span className="text-primary-neon text-xs font-semibold">+19%</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={intelligenceSignals[heroSignalIndex]}
                      className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-2.5 py-1 text-[10px] text-text-secondary"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: EASING.standard }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-neon/85" />
                      <span className="truncate">{intelligenceSignals[heroSignalIndex]}</span>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
                <motion.div
                  className="hero-system-card hero-system-card-mid animate-in slide-in-from-right-2 fade-in-0 duration-700"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1 - eventThreeProgress * 0.45, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease: EASING.entrance }}
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      className={clsx("h-2 w-2 rounded-full", isEventTwo ? "bg-success" : "bg-muted-foreground")}
                      animate={snapPulse > 0.1 ? { scale: [1, 1.22, 1], opacity: [0.65, 1, 0.8] } : { scale: 1, opacity: 0.78 }}
                      transition={{ duration: 0.128, ease: [0.2, 0.9, 0.2, 1] }}
                    />
                    <div className={clsx("h-1.5 w-28 rounded-full transition-colors duration-300", isEventTwo ? "bg-success/70" : "bg-primary-neon/45")} />
                  </div>
                  <div className="mt-3 h-1.5 w-40 rounded-full bg-white/15" />
                  <div className="mt-3 h-1.5 w-24 rounded-full bg-white/10" />
                </motion.div>
                <motion.div
                  className="hero-system-card hero-system-card-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.92 - eventThreeProgress * 0.18, y: 0 }}
                  transition={{ duration: 0.46, delay: 0.12, ease: EASING.entrance }}
                >
                  <div className="text-[10px] text-text-muted">Live activity queue</div>
                  <div className="mt-2.5 space-y-2">
                    <motion.div className="flex items-center gap-2 text-[11px] text-text-secondary" animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-neon/90" />
                      <span className="truncate">Check-ins syncing from floor</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2 text-[11px] text-text-secondary" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2.5, delay: 0.3, repeat: Infinity, ease: "easeInOut" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-success/90" />
                      <span className="truncate">Plans assigned automatically</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2 text-[11px] text-text-secondary" animate={{ opacity: [0.45, 0.85, 0.45] }} transition={{ duration: 2.8, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-warning/90" />
                      <span className="truncate">Owners notified on risk</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2 text-[11px] text-text-secondary" animate={{ opacity: [0.4, 0.92, 0.4] }} transition={{ duration: 2.45, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-neon/80" />
                      <span className="truncate">Riya checked in 8 sec ago</span>
                    </motion.div>
                  </div>
                </motion.div>
                <motion.div
                  className="hero-system-card hero-system-card-bottom animate-in slide-in-from-bottom-2 fade-in-0 duration-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isHeroReset ? 0.92 : 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.16, ease: EASING.entrance }}
                >
                  <div className="text-[11px] text-text-muted">Today</div>
                  <div className="mt-2 text-sm font-medium flex items-center justify-between">
                    <span>{heroKpi}/124 checked in</span>
                    <motion.span
                      className="text-xs text-primary-neon"
                      animate={isEventTwo ? { scale: [1, 1 + 0.08 * dampen, 1] } : { scale: 1 }}
                      transition={{ duration: 0.22, ease: EASING.standard }}
                    >
                      Live
                    </motion.span>
                  </div>
                  <div className="hero-progress mt-3">
                    <motion.div
                      className="hero-progress-fill"
                      initial={{ opacity: 0.5, scaleX: 0.5 }}
                      animate={{ opacity: 1, scaleX: 0.81 + eventTwoProgress * 0.06 }}
                      transition={{ duration: 0.34, ease: EASING.standard }}
                    />
                  </div>
                  <AnimatePresence>
                    {isEventThree && (
                      <motion.div
                        className="mt-3 rounded-xl border border-warning/55 bg-warning/18 p-2.5 text-xs text-warning"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1 - eventFourProgress * 0.35, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.42, ease: EASING.entrance }}
                      >
                        2 members missed yesterday
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </animated.div>
          </div>
        </motion.div>
      </section>

      <motion.div className="section-separator" style={{ filter: `blur(${separatorBlur}px)`, opacity: separatorOpacity }} />
      <section className="container py-20 md:py-28 fade-section section-depth-demo">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <div className="type-eyebrow mb-3">How it works</div>
          <h2 className="type-section text-balance"><Balance>Input, system response, and measurable outcomes.</Balance></h2>
        </div>
        <div className="grid lg:grid-cols-[1fr_360px_1fr] gap-6 lg:gap-8 items-center">
          <div className="space-y-4 order-2 lg:order-1">
            {workflowSteps.slice(0, 2).map((step) => (
              <div key={step.id} className={clsx("p-5 md:p-6 transition-colors duration-500 ease-in-out step-flow", activeDemo.id === step.id ? "surface-card step-active" : "surface-card-background step-muted")}>
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-4", activeDemo.id === step.id ? "bg-primary-neon/16 text-primary-neon" : "bg-background-elevated text-text-secondary")}>{step.id}</div>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="type-body mt-2">{step.copy}</p>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2 mx-auto w-full max-w-[22rem]">
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: EASING.entrance }}
            >
              <div className="absolute inset-x-4 -bottom-3 h-10 rounded-full bg-black/35 blur-2xl" />
              <motion.div
                className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-background-elevated/80 p-4 demo-surface"
                animate={{
                  y: -2 * eventOneProgress * dampen,
                  rotateX: (howTilt.y * 1.6 + heroSceneProgress * 0.9) * dampen,
                  rotateY: howTilt.x * 1.8 * dampen,
                }}
                transition={{ duration: 0.42, ease: EASING.standard }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const px = (event.clientX - rect.left) / rect.width - 0.5;
                  const py = (event.clientY - rect.top) / rect.height - 0.5;
                  setHowTilt({ x: Math.max(-1, Math.min(1, px * 2)), y: Math.max(-1, Math.min(1, py * 2)) });
                }}
                onMouseLeave={() => setHowTilt({ x: 0, y: 0 })}
              >
                <div className="noise-texture" />
                <motion.div
                  className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary-neon)/0.13),transparent_45%)]"
                  animate={{ opacity: 0.22 + glowEnvelope * 0.35, scale: 1 + eventTwoProgress * 0.03 }}
                  transition={{ duration: 0.5, ease: EASING.standard }}
                />
                <motion.div className="device-edge-light" animate={{ opacity: 0.2 + glowEnvelope * 0.28 }} transition={{ duration: 0.28, ease: EASING.standard }} />
                <motion.div
                  className="phone-reflection reflection-sweep"
                  animate={{ x: 8 * eventTwoProgress * dampen, opacity: 0.24 + glowEnvelope * 0.15 }}
                  transition={{ duration: 0.62, ease: EASING.standard }}
                />
                <motion.div className="relative z-10 subpixel-text-shift" animate={{ y: [0, -0.3, 0.25, 0] }} transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Live system flow</span>
                    <span className="text-primary-neon/90">Realtime</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <motion.div className={clsx("rounded-lg border p-2 text-center", demoStep === 0 ? "border-primary-neon/40 bg-primary/10" : "border-border/70 bg-background/55")} animate={{ scale: demoStep === 0 ? 1.03 : 1 }}>
                      <QrCode className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <div className="text-[10px]">Scan</div>
                    </motion.div>
                    <motion.div className={clsx("rounded-lg border p-2 text-center", demoStep === 1 ? "border-success/40 bg-success/10" : "border-border/70 bg-background/55")} animate={{ scale: demoStep === 1 ? 1.03 : 1 }}>
                      <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-success" />
                      <div className="text-[10px]">Assign</div>
                    </motion.div>
                    <motion.div className={clsx("rounded-lg border p-2 text-center", demoStep === 2 ? "border-warning/40 bg-warning/10" : "border-border/70 bg-background/55")} animate={{ scale: demoStep === 2 ? 1.03 : 1 }}>
                      <BarChart3 className="w-4 h-4 mx-auto mb-1 text-warning" />
                      <div className="text-[10px]">Track</div>
                    </motion.div>
                  </div>
                  <div className="mt-3 h-[1px] bg-gradient-to-r from-primary-neon/30 via-primary-neon/80 to-primary-neon/30" />
                  <AnimatePresence mode="wait">
                      {demoStep === 0 && (
                        <motion.div key="scan-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.24, ease: EASING.standard }} className="mt-3 rounded-xl border border-border/80 bg-background/60 p-3 text-center">
                          <div className="text-xs font-semibold">Member scans QR</div>
                          <div className="relative mt-2 h-6 overflow-hidden rounded-md bg-background-elevated">
                            <ScanLine className="w-full text-primary-neon/65" />
                            <motion.div className="absolute inset-x-0 h-[2px] bg-primary-neon/85 shadow-[0_0_14px_hsl(var(--primary-neon)/0.5)]" animate={{ y: ["0%", "110%"] }} transition={{ duration: 0.8, ease: EASING.standard, repeat: Infinity, repeatDelay: 0.3 }} />
                          </div>
                        </motion.div>
                      )}
                      {demoStep === 1 && (
                        <motion.div key="plan-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.24, ease: EASING.standard }} className="mt-3 space-y-2">
                          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                            <div className="text-xs font-semibold">Diet assigned automatically</div>
                          </div>
                          <motion.div className="rounded-xl border border-border/80 bg-background/60 p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASING.standard }}>
                            <div className="text-[11px] text-text-muted">Plan</div>
                            <div className="text-xs font-medium mt-1">Lean strength, high-protein phase</div>
                          </motion.div>
                        </motion.div>
                      )}
                      {demoStep === 2 && (
                        <motion.div key="progress-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.24, ease: EASING.standard }} className="mt-3 space-y-2">
                          <div className="rounded-xl border border-border/80 bg-background/60 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-text-muted">Current streak</span>
                              <span className="inline-flex items-center gap-1 text-warning text-[11px] font-semibold"><Flame className="w-3.5 h-3.5" /> {streakDays} days</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                              <motion.div className="h-full bg-primary rounded-full origin-left" animate={{ scaleX: 0.68 }} initial={{ scaleX: 0.42 }} transition={{ duration: 0.42, ease: EASING.standard }} />
                            </div>
                          </div>
                          <div className="rounded-xl border border-border/80 bg-background/60 p-3 flex items-center justify-between">
                            <span className="text-xs font-medium">Owner sees momentum instantly</span>
                            <MapPin className="w-4 h-4 text-text-muted" />
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
          <div className="space-y-4 order-3">
            <div className={clsx("p-5 md:p-6 transition-colors duration-500 ease-in-out", activeDemo.id === workflowSteps[2].id ? "surface-card step-active" : "surface-card-background step-muted")}>
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-4", activeDemo.id === workflowSteps[2].id ? "bg-primary-neon/16 text-primary-neon" : "bg-background-elevated text-text-secondary")}>{workflowSteps[2].id}</div>
              <h3 className="font-display text-lg font-semibold">{workflowSteps[2].title}</h3>
              <p className="type-body mt-2">{workflowSteps[2].copy}</p>
            </div>
            <div className="surface-card-background p-5 md:p-6">
              <div className="type-eyebrow mb-2">Live mechanism</div>
              <h3 className="font-display text-xl font-semibold"><Balance>System reacts before churn becomes visible.</Balance></h3>
              <p className="type-body mt-2">Floor actions trigger updates instantly. Owners see exactly who needs attention next.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-separator" />
      <section id="features" className="container py-20 md:py-28 fade-section section-depth-features">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-9 items-start">
          <div className="max-w-xl">
            <div className="type-eyebrow mb-3">What you get</div>
            <h2 className="type-section text-balance"><Balance>Capabilities built for daily operations.</Balance></h2>
            <p className="type-body mt-4">Gymtra reduces admin drag and keeps progress visible.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.slice(0, 4).map((f, i) => (
              <motion.div
                key={f.title}
                className={clsx("group p-5 capability-card", i === 0 ? "surface-card-primary" : "surface-card")}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.3, delay: i * 0.12, ease: EASING.entrance }}
              >
                <motion.div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4" whileHover={{ scale: 1.1 }} transition={{ duration: 0.22, ease: EASING.standard }}>
                  <f.icon className="w-5 h-5" />
                </motion.div>
                <h3 className="font-display font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-text-secondary mt-1.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-separator" />
      <section id="gyms" className="container py-20 md:py-28 fade-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"><div><div className="type-eyebrow mb-2">Gym discovery</div><h2 className="type-section"><Balance>Browse gyms live on Gymtra</Balance></h2><p className="text-sm text-text-secondary mt-2">{loadingGyms ? "Loading gyms..." : gymsError ? "Could not load gyms right now." : `${filtered.length} gym${filtered.length === 1 ? "" : "s"} available`}</p></div><div className="relative md:w-80"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by gym or city..." className="pl-10 pr-10 h-11" />{hasQuery && <IconClearButton onPress={() => setQ("")} />}</div></div>
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
            <p className="text-sm text-text-secondary mt-1">We could not load gyms right now.</p>
            <p className="text-xs text-text-muted mt-2">Retry to keep exploring nearby gyms.</p>
            <Button variant="outline" className="mt-4" onClick={loadGyms}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card-background border-dashed p-12 text-center">
            <h3 className="font-display font-semibold">No gyms found for "{q}"</h3>
            <p className="text-sm text-text-secondary mt-1">Try another city or a shorter name.</p>
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
                <p className="text-sm text-text-muted mt-2 line-clamp-2">{gym.tagline || "Fitness, coaching, and accountability in one flow."}</p>
                {typeof gym.members === "number" && gym.members > 0 && (
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
            <h2 className="type-section"><Balance>Simple pricing, built for gyms.</Balance></h2>
            <p className="mt-4 text-sm md:text-base text-text-secondary">Start free. Set up in under 2 minutes.</p>
            <p className="mt-2 text-xs text-text-muted">Trusted by independent studios and multi-branch operators.</p>
            <p className="mt-2 text-xs text-text-muted">No setup fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tiers.map((t) => (
              <div key={t.name} className={clsx("p-6 hover-lift relative", t.highlight ? "surface-card-primary pricing-focus-card pricing-spotlight" : "surface-card-background")}>
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    Most gyms choose this
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
        <div className="relative rounded-3xl overflow-hidden gradient-hero gradient-drift final-cta-pulse text-secondary-foreground p-12 md:p-20 text-center border border-white/10">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/18 blur-3xl" /><div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/18 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-balance max-w-3xl mx-auto">Ready to run your gym with clarity?</h2>
            <p className="text-text-secondary mt-5 max-w-2xl mx-auto">Set up once. Your system handles the rest.</p>
            <div className="mt-9 flex flex-wrap gap-3.5 justify-center">
              <Button size="lg" className="h-[52px] px-8 font-semibold gap-2 cta-glow cta-glow-idle interactive-ripple">Start free trial <ArrowRight className="w-4 h-4" /></Button>
              <a href="#gyms"><Button size="lg" variant="outline" className="h-[52px] px-8 interactive-ripple">Explore gyms</Button></a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 fade-section"><div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm"><div className="flex items-center gap-2 text-text-muted"><div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center"><Dumbbell className="w-3.5 h-3.5 text-primary-foreground" /></div><span>© 2026 Gymtra - Built with strength for gyms.</span></div><div className="flex items-center gap-6 text-text-muted text-xs"><a href="#" className="hover:text-text-primary">Terms</a><a href="#" className="hover:text-text-primary">Privacy</a><Link to="/admin/login" className="hover:text-text-primary">Admin</Link></div></div></footer>
    </div>
  );
};

export default Landing;
