import { useState } from "react";
import { Bell, MessageCircle, Filter, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import type { ReminderType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { listReminderLogsRequest, listReminderQueueRequest, sendReminderRequest } from "@/lib/reminder-api";

const TYPE_META: Record<ReminderType, { label: string; color: string; emoji: string }> = {
  expiry: { label: "Expiring soon", color: "warning", emoji: "⏳" },
  overdue: { label: "Overdue", color: "destructive", emoji: "🔥" },
  missed_workout: { label: "Missed workout", color: "accent", emoji: "💤" },
  absence: { label: "Long absence", color: "destructive", emoji: "👻" },
};

const Reminders = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | ReminderType>("all");
  const [tab, setTab] = useState<"queue" | "history">("queue");

  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    Promise.all([listReminderQueueRequest(), listReminderLogsRequest()])
      .then(([queueRes, logRes]) => {
        setItems(queueRes.items);
        setHistory(logRes.items);
      })
      .catch(() => undefined);
  }, []);

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);

  const counts = {
    all: items.length,
    expiry: items.filter(i => i.type === "expiry").length,
    overdue: items.filter(i => i.type === "overdue").length,
    missed_workout: items.filter(i => i.type === "missed_workout").length,
    absence: 0,
  };

  const handleSend = async (item: any, msg: string, type: ReminderType, channel: "whatsapp" | "browser") => {
    await sendReminderRequest({ memberId: item.memberId, message: msg, type, channel });
    const logs = await listReminderLogsRequest();
    setHistory(logs.items);
    toast({ title: channel === "whatsapp" ? "Opening WhatsApp…" : "Reminder sent" });
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
            {(["all", "expiry", "overdue", "missed_workout"] as const).map(f => (
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
              {filtered.map((item) => {
                const { message: msg, type } = item;
                const meta = TYPE_META[type];
                return (
                  <div key={`${item.memberId}-${type}`} className="rounded-2xl border border-border bg-card p-5 hover-lift">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">{item.memberName.split(" ").map((v: string) => v[0]).slice(0, 2).join("")}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold">{item.memberName}</div>
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            meta.color === "warning" && "bg-warning/15 text-warning",
                            meta.color === "destructive" && "bg-destructive/10 text-destructive",
                            meta.color === "accent" && "bg-accent/10 text-accent",
                          )}>
                            {meta.emoji} {meta.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{item.phone}</div>
                        <p className="text-sm text-foreground/80 bg-muted/40 rounded-lg p-3 mt-3 leading-relaxed">{msg}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => handleSend(item, msg, type, "browser")}>
                        <Bell className="w-3.5 h-3.5" /> Log only
                      </Button>
                      <a href={item.waUrl} target="_blank" rel="noreferrer"
                        onClick={() => handleSend(item, msg, type, "whatsapp")}>
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
                const meta = TYPE_META[(r.eventType || r.type) as ReminderType] || TYPE_META.missed_workout;
                return (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">RM</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{r.userId || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt || r.sentAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{meta.emoji} {meta.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{r.channel || "push"}</span>
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
