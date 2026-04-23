import { Zap, MapPin, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getMemberDashboardAttendanceTasksRequest, memberSelfCheckInRequest, verifyAttendanceQrRequest } from "@/lib/attendance-api";
import { useToast } from "@/hooks/use-toast";
import { Confetti } from "@/components/Confetti";
import { formatISTLongDate, getISTDateString } from "@/lib/datetime";

const CheckIn = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const today = getISTDateString();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [qrToken, setQrToken] = useState("");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [verifyingQr, setVerifyingQr] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const alreadyCheckedIn = attendance.some((a) => a.date === today && a.status === "present");
  const [done, setDone] = useState(alreadyCheckedIn);
  const [celebrate, setCelebrate] = useState(false);
  const [staticQrHandled, setStaticQrHandled] = useState(false);

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

  const handleQrCheckIn = async (tokenInput?: string) => {
    const token = (tokenInput ?? qrToken).trim();
    if (!token) return;
    setVerifyingQr(true);
    try {
      await verifyAttendanceQrRequest(token);
      setDone(true);
      toast({ title: "QR check-in successful", description: "Attendance marked from gym QR." });
    } catch {
      toast({ title: "QR check-in failed", description: "Please use a valid gym QR token.", variant: "destructive" });
    } finally {
      setVerifyingQr(false);
    }
  };

  const stopScanner = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerActive(false);
  };

  const startScanner = async () => {
    setScannerError(null);
    if (!("BarcodeDetector" in window)) {
      setScannerError("Camera scanner is not supported on this browser. Use manual token input.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      setScannerActive(true);
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || verifyingQr) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results?.[0]?.rawValue) {
            setQrToken(results[0].rawValue);
            stopScanner();
            await handleQrCheckIn(results[0].rawValue);
          }
        } catch {
          // Keep scanning loop alive even if one frame fails.
        }
      }, 700);
    } catch {
      setScannerError("Camera permission denied or unavailable.");
      stopScanner();
    }
  };

  useEffect(() => () => stopScanner(), []);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (!user || mode !== "static" || staticQrHandled || done) return;
    setStaticQrHandled(true);
    verifyAttendanceQrRequest("", "static")
      .then(() => {
        setDone(true);
        toast({ title: "Checked in from gym QR", description: "Attendance marked for today." });
      })
      .catch(() => {
        toast({ title: "QR check-in failed", description: "Please try again from your gym app.", variant: "destructive" });
      });
  }, [searchParams, user, staticQrHandled, done, toast]);

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
          <MapPin className="w-3.5 h-3.5" /> {formatISTLongDate()}
        </div>
        {done && <div className="mt-3 text-xs text-success font-semibold">{presentDays.size} sessions this month 🔥</div>}
      </div>

      <h2 className="text-lg font-display font-semibold mt-8 mb-3">This month</h2>
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="text-sm font-medium mb-2">QR check-in</div>
        <p className="text-xs text-muted-foreground mb-3">
          Static gym QR opens this page and auto check-ins signed-in members. Use scanner/manual token only for dynamic QR tokens.
        </p>
        <div className="mb-3 space-y-2">
          <video ref={videoRef} className="w-full max-h-56 rounded-lg border border-border bg-muted object-cover" muted playsInline />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={startScanner} disabled={scannerActive || verifyingQr}>Start camera</Button>
            <Button type="button" variant="ghost" onClick={stopScanner} disabled={!scannerActive}>Stop camera</Button>
          </div>
          {scannerError && <p className="text-xs text-destructive">{scannerError}</p>}
        </div>
        <div className="flex gap-2">
          <Input value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="Paste scanned token" />
          <Button variant="outline" onClick={handleQrCheckIn} disabled={verifyingQr}>{verifyingQr ? "Verifying..." : "Submit QR"}</Button>
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
