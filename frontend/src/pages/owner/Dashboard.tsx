import { Link, useParams } from "react-router-dom";
import { Users, AlertCircle, CalendarCheck, Receipt, MessageCircle, Plus, ArrowUpRight, UserMinus, Sparkles, Bell } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, getMemberships, getAttendance, getExpenses } from "@/lib/data-service";

const waLink = (phone: string, msg: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`;

const OwnerDashboard = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const gymId = user?.gymId || "1";
  const members = getMembers(gymId);
  const memberships = getMemberships(gymId);
  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = getAttendance(gymId, today);
  const exps = getExpenses(gymId);
  const monthTotal = exps.reduce((s, e) => s + e.amount, 0);

  const expiring = members.filter((m) => m.status !== "active");
  const ghosts = members.filter((m) => {
    const att = todayAttendance.filter(a => a.memberId === m.id);
    return att.length === 0 && m.status === "active";
  }).slice(0, 5);

  const checkInRate = members.length > 0 ? Math.round((todayAttendance.length / members.length) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0] || "Coach"} 💪`}
        subtitle="Here's what needs your attention today."
        action={
          <>
            <Link to={`/${gymSlug}/owner/reminders`}>
              <Button variant="outline" className="gap-2"><Bell className="w-4 h-4" /> Reminders</Button>
            </Link>
            <Link to={`/${gymSlug}/owner/members/new`}>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Member</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Members" value={members.filter(m => m.status === "active").length} icon={Users} accent="primary" trend="up" trendValue="+3 this wk" />
        <KpiCard label="Renewals due" value={expiring.length} hint="needs follow-up" icon={AlertCircle} accent="warning" />
        <KpiCard label="Today's check-ins" value={todayAttendance.length} hint={`${checkInRate}% of active`} icon={CalendarCheck} accent="success" />
        <KpiCard label="Monthly expenses" value={`₹${(monthTotal / 1000).toFixed(0)}K`} icon={Receipt} accent="accent" animated={false} />
      </div>

      {/* Priority actions strip */}
      {(expiring.length > 0 || ghosts.length > 3) && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 mb-6 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Today's priority</div>
            <div className="text-xs text-muted-foreground">
              {expiring.length} member{expiring.length === 1 ? "" : "s"} need renewal · {ghosts.length} haven't checked in today
            </div>
          </div>
          <Link to={`/${gymSlug}/owner/reminders`} className="hidden sm:block">
            <Button size="sm" variant="outline" className="gap-1.5">Send reminders <ArrowUpRight className="w-3.5 h-3.5" /></Button>
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Renewal queue" description={`${expiring.length} action items`} viewAllLink={`/${gymSlug}/owner/memberships`}>
          {expiring.length === 0 ? (
            <EmptyState icon={Users} title="All caught up!" description="Every active member is in good standing 🎉" className="border-0 bg-transparent" />
          ) : (
            <div className="divide-y divide-border">
              {expiring.slice(0, 5).map((m) => {
                const ms = memberships.find(ms => ms.memberId === m.id);
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">Expires {ms?.expiryDate || "—"}</div>
                    </div>
                    <StatusBadge status={m.status} />
                    <a href={waLink(m.phone, `Hey ${m.name} 👋 Your membership ends soon. Renew so we don't have to pretend we don't know you at the door 😄`)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5 hidden sm:inline-flex"><MessageCircle className="w-3.5 h-3.5" /> Nudge</Button>
                      <Button size="icon" variant="outline" className="sm:hidden h-8 w-8"><MessageCircle className="w-3.5 h-3.5" /></Button>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Not checked in today 👻" description={`${ghosts.length} active members`}>
          {ghosts.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Everyone's here!" description="All active members checked in today." className="border-0 bg-transparent" />
          ) : (
            <div className="divide-y divide-border">
              {ghosts.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{m.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">No check-in today</div>
                  </div>
                  <a href={waLink(m.phone, `Hey ${m.name}, we noticed you've been away. Whenever you're ready, your spot is waiting. ❤️`)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 hidden sm:inline-flex"><MessageCircle className="w-3.5 h-3.5" /> Nudge</Button>
                    <Button size="icon" variant="outline" className="sm:hidden h-8 w-8"><MessageCircle className="w-3.5 h-3.5" /></Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
};

export default OwnerDashboard;
