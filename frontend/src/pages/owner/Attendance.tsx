import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Search, Users, CalendarCheck, UserMinus, Save, Sparkles, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { listMembersRequest } from "@/lib/member-api";
import { getAttendanceForDayRequest, markAttendanceRequest } from "@/lib/attendance-api";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { formatISTLongDate, getISTDateString } from "@/lib/datetime";

const Attendance = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const { gym } = useTenant();
  const { toast } = useToast();
  const today = getISTDateString();
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [existing, setExisting] = useState<any[]>([]);
  const [staticQrDataUrl, setStaticQrDataUrl] = useState<string | null>(null);

  const initial = useMemo(() => {
    const o: Record<string, "present" | "skipped"> = {};
    existing.forEach(a => { o[a.memberId] = a.status; });
    return o;
  }, [existing.length]);

  const [marks, setMarks] = useState<Record<string, "present" | "skipped" | undefined>>(initial);
  const [q, setQ] = useState("");
  const lockedPresentIds = useMemo(
    () => new Set(existing.filter((row) => row.status === "present").map((row) => row.memberId)),
    [existing]
  );

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

  useEffect(() => {
    if (!gymSlug) return;
    const staticQrUrl = `${window.location.origin}/${gymSlug}/member/checkin?mode=static`;
    QRCode.toDataURL(staticQrUrl, { width: 320, margin: 1 })
      .then(setStaticQrDataUrl)
      .catch(() => setStaticQrDataUrl(null));
  }, [gymSlug]);

  const visible = allMembers.filter(m =>
    !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q)
  );

  useEffect(() => {
    setMarks(initial);
  }, [initial]);

  const statusByMemberId = useMemo(() => {
    const map: Record<string, "present" | "skipped" | undefined> = {};
    allMembers.forEach((m) => {
      map[m.id] = marks[m.id] ?? initial[m.id];
    });
    return map;
  }, [allMembers, marks, initial]);

  const presentCount = Object.values(statusByMemberId).filter(v => v === "present").length;
  const skippedCount = Object.values(statusByMemberId).filter(v => v === "skipped").length;
  const unmarked = allMembers.length - presentCount - skippedCount;

  const handleSave = async () => {
    const payloads = Object.entries(marks).filter(([memberId, status]) => Boolean(status) && !lockedPresentIds.has(memberId));
    await Promise.all(
      payloads.map(([memberId, status]) =>
        markAttendanceRequest({ memberId, date: today, status: status as "present" | "skipped" }),
      ),
    );
    const refreshed = await getAttendanceForDayRequest(today);
    setExisting(refreshed.items);
    const count = payloads.length;
    toast({ title: "Attendance saved", description: `${count} member${count === 1 ? "" : "s"} updated for today.` });
  };

  const markAllPresent = () => {
    const next: typeof marks = {};
    visible.forEach(m => {
      if (!lockedPresentIds.has(m.id)) next[m.id] = "present";
    });
    setMarks({ ...marks, ...next });
    toast({ title: "Marked visible members present" });
  };

  const todayLabel = formatISTLongDate();
  const handleDownloadStaticQr = () => {
    if (!staticQrDataUrl || !gymSlug) return;
    const link = document.createElement("a");
    link.href = staticQrDataUrl;
    link.download = `${gymSlug}-attendance-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPoster = () => {
    if (!staticQrDataUrl) return;
    const posterTitle = `${gym?.name || "Gym"} Attendance QR`;
    const posterUrl = gymSlug ? `${window.location.origin}/${gymSlug}/member/checkin?mode=static` : "";
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print poster." });
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${posterTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
            .poster { max-width: 700px; margin: 0 auto; border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; }
            h1 { margin: 0 0 8px; font-size: 34px; }
            .sub { margin: 0 0 20px; color: #4b5563; font-size: 16px; }
            .qr-wrap { background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; display: inline-block; padding: 12px; }
            img { width: 340px; height: 340px; object-fit: contain; }
            ol { text-align: left; margin: 20px auto 0; max-width: 560px; font-size: 16px; line-height: 1.45; }
            .url { margin-top: 16px; font-size: 12px; color: #6b7280; word-break: break-all; }
            .hint { margin-top: 10px; color: #047857; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="poster">
            <h1>${posterTitle}</h1>
            <p class="sub">Scan to mark attendance instantly</p>
            <div class="qr-wrap">
              <img src="${staticQrDataUrl}" alt="Attendance QR" />
            </div>
            <ol>
              <li>Open your phone camera and scan this QR.</li>
              <li>Sign in as a member if asked.</li>
              <li>Attendance is marked automatically for today.</li>
            </ol>
            <div class="hint">Show this at reception / gym entrance</div>
            <div class="url">${posterUrl}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
            <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
          </>
        }
      />
      <div className="mb-5 rounded-2xl border border-border bg-card p-4 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="w-40 h-40 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
          {staticQrDataUrl ? <img src={staticQrDataUrl} alt="Gym attendance QR" className="w-full h-full object-contain" /> : <span className="text-xs text-muted-foreground">QR unavailable</span>}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Gym attendance QR (static)</div>
          <div className="text-xs text-muted-foreground mt-1">
            Members can scan this QR to open check-in. If not logged in, they will sign in first.
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 break-all">
            {gymSlug ? `${window.location.origin}/${gymSlug}/member/checkin?mode=static` : ""}
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadStaticQr} disabled={!staticQrDataUrl}>
                <Download className="w-3.5 h-3.5" /> Download QR image
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintPoster} disabled={!staticQrDataUrl}>
                Print poster
              </Button>
            </div>
          </div>
        </div>
      </div>

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
            const isLockedPresent = lockedPresentIds.has(m.id);
            const isPresentState = isLockedPresent || v === "present";
            return (
              <div key={m.id} className={cn(
                "px-4 py-3 flex items-center gap-3 transition-colors",
                isPresentState && "bg-success/10",
                v === "skipped" && "bg-destructive/5",
                !v && "hover:bg-muted/30"
              )}>
                <div className="w-9 h-9 rounded-full gradient-card border border-border flex items-center justify-center text-xs font-bold shrink-0">{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.phone}</div>
                </div>
                {isPresentState ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-success text-success-foreground font-semibold">
                    Present today
                  </span>
                ) : (
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
                )}
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
