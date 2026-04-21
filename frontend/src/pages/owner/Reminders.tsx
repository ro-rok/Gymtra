import { useState } from "react";
import { Bell, MessageCircle, Filter, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, getMemberships, logReminder, getReminderLogs } from "@/lib/data-service";
import type { ReminderType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const wa = (phone: string, msg: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;

const TYPE_META: Record<ReminderType, { label: string; color: string; emoji: string }> = {
  expiry: { label: "Expiring soon", color: "warning", emoji: "⏳" },
  overdue: { label: "Overdue", color: "destructive", emoji: "🔥" },
  missed_workout: { label: "Missed workout", color: "accent", emoji: "💤" },
  absence: { label: "Long absence", color: "destructive", emoji: "👻" },
};

const Reminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const gymId = user?.gymId || "1";
  const [, setRefresh] = useState(0);
  const [filter, setFilter] = useState<"all" | ReminderType>("all");
  const [tab, setTab] = useState<"queue" | "history">("queue");

  const members = getMembers(gymId);
  const memberships = getMemberships(gymId);
  const history = getReminderLogs(gymId);

  const items = members.flatMap((m) => {
    const ms = memberships.find(ms => ms.memberId === m.id);
    const list: { m: typeof m; msg: string; type: ReminderType }[] = [];
    if (m.status === "expired") {
      list.push({ m, type: "overdue", msg: `Hi ${m.name}, your plan expired on ${ms?.expiryDate || "recently"}. The treadmills are filing a missing person report 😅 Ready to renew?` });
    } else if (m.status === "pending_renewal") {
      list.push({ m, type: "expiry", msg: `Hey ${m.name} 👋 Your membership ends ${ms?.expiryDate || "soon"}. Renew before then so we don't have to pretend we don't know you at the door 😄` });
    }
    return list;
  });

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const counts = {
    all: items.length,
    expiry: items.filter(i => i.type === "expiry").length,
    overdue: items.filter(i => i.type === "overdue").length,
    missed_workout: 0,
    absence: 0,
  };

  const handleSend = (memberId: string, msg: string, type: ReminderType, channel: "whatsapp" | "browser") => {
    logReminder({
      gymId, memberId, type, channel, message: msg,
      sentAt: new Date().toISOString(), sentBy: user?.id || "",
    });
    toast({ title: channel === "whatsapp" ? "Opening WhatsApp…" : "Reminder logged" });
    setRefresh(n => n + 1);
  };

  return (
    <>
      <PageHeader title="Reminder Center" subtitle="Pre-drafted, witty, respectful." />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-muted w-fit">
        <button onClick={() => setTab("queue")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "queue" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          Queue · {items.length}
        </button>
        <button onClick={() => setTab("history")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          History · {history.length}
        </button>
      </div>

      {tab === "queue" && (
        <>
          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {(["all", "expiry", "overdue"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {f === "all" ? "All" : TYPE_META[f].label} · {counts[f]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up! 🎉"
              description="No reminders needed right now. Members are on track."
            />
          ) : (
            <div className="grid gap-3">
              {filtered.map(({ m, msg, type }) => {
                const meta = TYPE_META[type];
                return (
                  <div key={`${m.id}-${type}`} className="rounded-2xl border border-border bg-card p-5 hover-lift">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">{m.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold">{m.name}</div>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            meta.color === "warning" && "bg-warning/15 text-warning",
                            meta.color === "destructive" && "bg-destructive/10 text-destructive",
                            meta.color === "accent" && "bg-accent/10 text-accent",
                          )}>
                            {meta.emoji} {meta.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.phone}</div>
                        <p className="text-sm text-foreground/80 bg-muted/40 rounded-lg p-3 mt-3 leading-relaxed">{msg}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => handleSend(m.id, msg, type, "browser")}>
                        <Bell className="w-3.5 h-3.5" /> Log only
                      </Button>
                      <a href={wa(m.phone, msg)} target="_blank" rel="noreferrer"
                        onClick={() => handleSend(m.id, msg, type, "whatsapp")}>
                        <Button size="sm" className="gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <SectionCard title="Sent reminders" description={`${history.length} total`}>
          {history.length === 0 ? (
            <EmptyState icon={Clock} title="No history yet" description="Reminders you send will show up here." className="border-0 bg-transparent" />
          ) : (
            <div className="divide-y divide-border">
              {history.slice(0, 30).map(r => {
                const m = members.find(mm => mm.id === r.memberId);
                const meta = TYPE_META[r.type];
                return (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">{m?.avatar || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{m?.name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.sentAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.emoji} {meta.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{r.channel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
};

export default Reminders;
