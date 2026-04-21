import { Users, CalendarCheck, Salad, AlertCircle, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, getAttendance } from "@/lib/data-service";

const TrainerDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const gymId = user?.gymId || "1";
  const members = getMembers(gymId);
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = getAttendance(gymId, today);
  const checkedIn = todayAttendance.length;
  const lowCompliance = members.filter(m => m.status !== "active").length;

  return (
    <>
      <PageHeader title={`Hi Coach ${user?.name?.split(" ")[0] || "Rahul"} 🏋️`} subtitle="Your members, today's plan." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Assigned" value={members.length} icon={Users} accent="primary" />
        <KpiCard label="Checked in" value={checkedIn} hint="today" icon={CalendarCheck} accent="success" />
        <KpiCard label="Diet pending" value={3} icon={Salad} accent="warning" />
        <KpiCard label="Low compliance" value={lowCompliance} icon={AlertCircle} accent="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Quick actions">
          <div className="p-5 grid sm:grid-cols-2 gap-3">
            <Link to={`/${gymSlug}/trainer/attendance`}><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><CalendarCheck className="w-5 h-5" /> Mark attendance</Button></Link>
            <Link to={`/${gymSlug}/trainer/diet`}><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><Salad className="w-5 h-5" /> Assign diet</Button></Link>
            <Link to={`/${gymSlug}/trainer/members`}><Button variant="outline" className="w-full h-auto py-4 flex-col gap-2"><Users className="w-5 h-5" /> View members</Button></Link>
          </div>
        </SectionCard>

        <SectionCard title="Member spotlight" viewAllLink={`/${gymSlug}/trainer/members`}>
          <div className="divide-y divide-border">
            {members.slice(0, 5).map(m => (
              <Link key={m.id} to={`/${gymSlug}/trainer/members/${m.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.foodPreference || "—"} · {m.activityLevel || "—"}</div>
                </div>
                <StatusBadge status={m.status} />
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
};

export default TrainerDashboard;
