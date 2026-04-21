import { Zap, MapPin, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberDashboardAttendanceTasksRequest, memberSelfCheckInRequest, verifyAttendanceQrRequest } from "@/lib/attendance-api";
import { useToast } from "@/hooks/use-toast";
import { Confetti } from "@/components/Confetti";

const CheckIn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [attendance, setAttendance] = useState<any[]>([]);
  const [qrToken, setQrToken] = useState("");
  const alreadyCheckedIn = attendance.some((a) => a.date === today && a.status === "present");
  const [done, setDone] = useState(alreadyCheckedIn);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    getMemberDashboardAttendanceTasksRequest()
      .then((data) => {
        setAttendance(data.attendance);
        if (data.attendance.some((a) => a.date === today && a.status === "present")) setDone(true);
      })
      .catch(() => undefined);
  }, [today]);

  const handleCheckIn = async () => {
    await memberSelfCheckInRequest(today);
    setDone(true);
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 100);
    toast({ title: "Checked in! 💪", description: "Have a great session." });
  };

  const handleQrCheckIn = async () => {
    if (!qrToken.trim()) return;
    await verifyAttendanceQrRequest(qrToken.trim());
    setDone(true);
    toast({ title: "QR check-in successful", description: "Attendance marked from gym QR." });
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const presentDays = new Set(
    attendance
      .filter(a => a.status === "present" && a.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`))
      .map(a => Number(a.date.split("-")[2]))
  );

  return (
    <>
      <Confetti trigger={celebrate} />
      <PageHeader title="Check-in" subtitle="One tap. One workout logged." />

      <div className="rounded-3xl bg-card border border-border p-8 md:p-12 text-center relative overflow-hidden">
        {!done && <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />}
        <button
          onClick={handleCheckIn}
          disabled={done}
          className={cn(
            "relative w-44 h-44 rounded-full mx-auto flex flex-col items-center justify-center gap-2 font-display font-bold text-lg transition-all",
            done ? "bg-success text-success-foreground animate-celebrate" : "gradient-primary text-primary-foreground shadow-glow animate-pulse-glow hover:scale-105"
          )}
        >
          {done ? <CheckCircle2 className="w-12 h-12" /> : <Zap className="w-12 h-12" />}
          {done ? "Logged!" : "I'm here"}
        </button>
        <div className="mt-5 text-sm text-muted-foreground inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {done && <div className="mt-3 text-xs text-success font-semibold">{presentDays.size} sessions this month 🔥</div>}
      </div>

      <h2 className="text-lg font-display font-semibold mt-8 mb-3">This month</h2>
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="text-sm font-medium mb-2">QR check-in</div>
        <div className="flex gap-2">
          <Input value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="Paste scanned token" />
          <Button variant="outline" onClick={handleQrCheckIn}>Submit QR</Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-7 gap-2 text-xs">
          {days.map((d) => (
            <div key={d}
              className={cn("aspect-square rounded-lg flex items-center justify-center font-semibold transition-colors",
                presentDays.has(d) ? "bg-success/15 text-success ring-1 ring-success/30" :
                d <= now.getDate() ? "bg-destructive/10 text-destructive/70" :
                "bg-muted text-muted-foreground"
              )}>
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-success/60" /> Present ({presentDays.size})</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-destructive/60" /> Missed</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-muted-foreground/30" /> Upcoming</span>
        </div>
      </div>
    </>
  );
};
export default CheckIn;
