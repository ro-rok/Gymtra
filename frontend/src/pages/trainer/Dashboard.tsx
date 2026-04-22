import { Users, CalendarCheck, Salad, ArrowRight, AlertCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard, SectionCardSkeletonRows } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAttendanceForDayRequest } from "@/lib/attendance-api";
import { listMembersRequest } from "@/lib/member-api";
import { useEffect, useState } from "react";

const TrainerDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    const today = new Date().toISOString().split("T")[0];
    Promise.all([listMembersRequest(), getAttendanceForDayRequest(today)])
      .then(([memberRows, dayAttendance]) => {
        setMembers(memberRows);
        setAttendance(dayAttendance.items);
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reloadKey]);

  const membersNeedingAttention = members.filter((m) => m.status !== "active");
  const noAttendanceMembers = members.filter((m) => {
    if (m.status !== "active") return false;
    return !attendance.some((a) => a.memberId === m.id);
  });
  const priorityMembers = [...membersNeedingAttention, ...noAttendanceMembers].slice(0, 5);

  return (
    <>
      <PageHeader title={`Hi Coach ${user?.name?.split(" ")[0] || "Coach"}`} subtitle="Start with action items for today's sessions." />

      <div className="md:hidden grid grid-cols-2 gap-2 mb-6">
        <Link to={`/${gymSlug}/trainer/attendance`}><Button className="w-full h-10 text-xs">Mark attendance</Button></Link>
        <Link to={`/${gymSlug}/trainer/diet`}><Button variant="outline" className="w-full h-10 text-xs">Assign diet</Button></Link>
      </div>

      {hasError && !isLoading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Unable to load trainer workflow</div>
            <div className="text-xs text-muted-foreground">Retry to load assigned members and attendance for today.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Quick actions" description="Pick your next operational task" bodyPadding="default">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to={`/${gymSlug}/trainer/attendance`}><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><CalendarCheck className="w-5 h-5" /> Mark attendance</Button></Link>
            <Link to={`/${gymSlug}/trainer/diet`}><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><Salad className="w-5 h-5" /> Assign diet</Button></Link>
            <Link to={`/${gymSlug}/trainer/members`} className="sm:col-span-2"><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><Users className="w-5 h-5" /> View members</Button></Link>
          </div>
        </SectionCard>

        <SectionCard title="Members needing action" description={isLoading ? "Loading..." : `${priorityMembers.length} to review`} viewAllLink={`/${gymSlug}/trainer/members`}>
          {isLoading ? (
            <SectionCardSkeletonRows rows={4} />
          ) : priorityMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Start your coaching queue"
              description="No assigned members currently need attention."
              secondaryHint="Open your member directory to begin assigning plans."
              variant="embedded"
              className="border-0 bg-transparent"
              action={<Link to={`/${gymSlug}/trainer/members`}><Button size="sm">Open members directory</Button></Link>}
            />
          ) : (
            <div className="divide-y divide-border">
              {priorityMembers.map((m) => (
                <Link key={m.id} to={`/${gymSlug}/trainer/members/${m.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.status !== "active" ? "Membership follow-up needed" : "No attendance marked today"}
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
};

export default TrainerDashboard;
