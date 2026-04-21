import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Search, Users, CalendarCheck, UserMinus, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { listMembersRequest } from "@/lib/member-api";
import { createAttendanceQrTokenRequest, getAttendanceForDayRequest, markAttendanceRequest } from "@/lib/attendance-api";
import { useToast } from "@/hooks/use-toast";

const Attendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [existing, setExisting] = useState<any[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const initial = useMemo(() => {
    const o: Record<string, "present" | "skipped"> = {};
    existing.forEach(a => { o[a.memberId] = a.status; });
    return o;
  }, [existing.length]);

  const [marks, setMarks] = useState<Record<string, "present" | "skipped" | undefined>>(initial);
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([listMembersRequest(), getAttendanceForDayRequest(today)])
      .then(([members, attendance]) => {
        setAllMembers(members.filter((m) => m.status !== "expired"));
        setExisting(attendance.items);
      })
      .catch(() => {
        setAllMembers([]);
        setExisting([]);
      });
  }, [today]);

  const visible = allMembers.filter(m =>
    !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q)
  );

  const presentCount = Object.values(marks).filter(v => v === "present").length;
  const skippedCount = Object.values(marks).filter(v => v === "skipped").length;
  const unmarked = allMembers.length - presentCount - skippedCount;

  const handleSave = async () => {
    const payloads = Object.entries(marks).filter(([, status]) => Boolean(status));
    await Promise.all(
      payloads.map(([memberId, status]) =>
        markAttendanceRequest({ memberId, date: today, status: status as "present" | "skipped" }),
      ),
    );
    const count = payloads.length;
    toast({ title: "Attendance saved", description: `${count} member${count === 1 ? "" : "s"} updated for today.` });
  };

  const markAllPresent = () => {
    const next: typeof marks = {};
    visible.forEach(m => { next[m.id] = "present"; });
    setMarks({ ...marks, ...next });
    toast({ title: `Marked ${visible.length} present` });
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const handleGenerateQr = async () => {
    try {
      const data = await createAttendanceQrTokenRequest();
      setQrToken(data.token);
      toast({ title: "QR token generated", description: "Members can scan this token to check in." });
    } catch {
      toast({ title: "Could not generate QR token", description: "Please try again shortly." });
    }
  };

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={todayLabel}
        action={
          <>
            <Button variant="outline" onClick={markAllPresent} className="gap-2">
              <Check className="w-4 h-4" /> Mark all present
            </Button>
            <Button variant="outline" onClick={handleGenerateQr}>Generate QR</Button>
            <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
          </>
        }
      />
      {qrToken && <div className="mb-4 rounded-xl border border-border bg-card p-3 text-xs break-all">{qrToken}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Members" value={allMembers.length} icon={Users} accent="primary" />
        <KpiCard label="Present" value={presentCount} icon={CalendarCheck} accent="success" />
        <KpiCard label="Skipped" value={skippedCount} icon={UserMinus} accent="destructive" />
        <KpiCard label="Unmarked" value={unmarked} icon={Sparkles} accent="warning" />
      </div>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search members…" className="pl-10" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No members match "${q}"` : "No members to mark"}
          description={q ? "Try a different search." : "Add active members to start marking attendance."}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {visible.map((m) => {
            const v = marks[m.id];
            return (
              <div key={m.id} className={cn(
                "px-4 py-3 flex items-center gap-3 transition-colors",
                v === "present" && "bg-success/5",
                v === "skipped" && "bg-destructive/5",
                !v && "hover:bg-muted/30"
              )}>
                <div className="w-9 h-9 rounded-full gradient-card border border-border flex items-center justify-center text-xs font-bold shrink-0">{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.phone}</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setMarks({ ...marks, [m.id]: "present" })}
                    className={cn(
                      "w-9 h-9 rounded-lg border flex items-center justify-center transition-all",
                      v === "present"
                        ? "bg-success text-success-foreground border-success scale-105"
                        : "border-border hover:border-success hover:bg-success/5"
                    )}
                    title="Present"
                  ><Check className="w-4 h-4" /></button>
                  <button
                    onClick={() => setMarks({ ...marks, [m.id]: "skipped" })}
                    className={cn(
                      "w-9 h-9 rounded-lg border flex items-center justify-center transition-all",
                      v === "skipped"
                        ? "bg-destructive text-destructive-foreground border-destructive scale-105"
                        : "border-border hover:border-destructive hover:bg-destructive/5"
                    )}
                    title="Skipped"
                  ><X className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(presentCount + skippedCount) > 0 && (
        <div className="mt-4 sticky bottom-24 md:bottom-4 z-30 flex justify-end">
          <Button onClick={handleSave} className="gap-2 shadow-lg h-11 px-6">
            <Save className="w-4 h-4" /> Save {presentCount + skippedCount} change{presentCount + skippedCount === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </>
  );
};
export default Attendance;
