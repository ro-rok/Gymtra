import { useParams, Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { WeightChart } from "@/components/Charts";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Activity, Target, Calendar, Flame, Salad, TrendingUp, ArrowLeft, Check } from "lucide-react";
import { getMemberRequest } from "@/lib/member-api";
import { listMembershipsRequest } from "@/lib/membership-api";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { assignDietTemplateRequest, getMemberActiveDietRequest, listDietTemplatesRequest } from "@/lib/diet-api";
import { listProgressLogsRequest } from "@/lib/progress-api";

const MemberProfile = () => {
  const { id, gymSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, force] = useState(0);
  const [m, setMember] = useState<any | null>(null);
  const [ms, setMs] = useState<any | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [assignedTemplate, setAssignedTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getMemberRequest(id),
      listMembershipsRequest(),
      listProgressLogsRequest(id),
      listDietTemplatesRequest(),
      getMemberActiveDietRequest(id),
    ])
      .then(([member, memberships, progressRows, templateRows, activeDiet]) => {
        setMember(member);
        setMs(memberships.find((entry) => entry.memberId === id) || null);
        setProgress(progressRows.items || []);
        setTemplates(templateRows || []);
        setAssignedTemplate(activeDiet.template || null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8">Loading member profile...</div>;
  }
  if (!m) {
    return (
      <EmptyState
        icon={Activity}
        title="Member not found"
        description="They might have been removed."
        action={<Button onClick={() => navigate(-1)} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Go back</Button>}
      />
    );
  }

  const chartData = progress.map(p => ({ date: p.date.slice(5), weight: p.weightKg }));
  const sessionCount = m.sessionCount ?? 0;

  const handleAssign = async (templateId: string) => {
    await assignDietTemplateRequest({ memberId: m.id, templateId });
    const activeDiet = await getMemberActiveDietRequest(m.id);
    setAssignedTemplate(activeDiet.template || null);
    toast({ title: "Diet assigned", description: `${m.name} now has a new active plan.` });
    force(n => n + 1);
  };

  return (
    <>
      <Link to={`/${gymSlug}/owner/members`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-3 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to members
      </Link>
      <PageHeader title={m.name} subtitle={`Joined ${m.joinDate} · ${m.phone}`} action={<StatusBadge status={m.status} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Goal" value={m.goalWeightKg ? `${m.goalWeightKg}kg` : "—"} icon={Target} accent="primary" animated={false} />
        <KpiCard label="Sessions" value={sessionCount} hint="all-time check-ins" icon={Activity} accent="success" />
        <KpiCard label="Plan ends" value={ms?.expiryDate?.slice(5) || "—"} icon={Calendar} accent="warning" animated={false} />
        <KpiCard label="Weight" value={m.currentWeightKg ? `${m.currentWeightKg}kg` : "—"} icon={Flame} accent="accent" animated={false} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile details */}
        <SectionCard title="Profile details" className="lg:col-span-2">
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              ["Phone", m.phone], ["Email", m.email], ["Age", m.age],
              ["Gender", m.gender], ["Height", m.heightCm && `${m.heightCm}cm`],
              ["Activity", m.activityLevel], ["Diet", m.foodPreference],
              ["Allergies", m.allergies], ["Medical", m.medicalConditions],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k}</div>
                <div className="font-medium mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Diet assignment */}
        <SectionCard title="Active diet plan" description={assignedTemplate ? assignedTemplate.name : "No plan assigned"}>
          <div className="p-5 space-y-3">
            {assignedTemplate ? (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                  <Check className="w-4 h-4" /> {assignedTemplate.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{assignedTemplate.calories} kcal · {assignedTemplate.meals} meals · goal: {assignedTemplate.goal}</div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">No plan assigned. Pick one below.</div>
            )}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {templates.map(t => {
                const isActive = assignedTemplate?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => !isActive && handleAssign(t.id)}
                    disabled={isActive}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-all ${isActive ? "border-primary bg-primary/5 cursor-default" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">{t.calories} kcal · {t.goal}</div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })}
              {templates.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No diet templates yet. Create some first.</div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {chartData.length > 0 && (
        <div className="mt-6">
          <SectionCard title="Weight trend" description={`${chartData.length} entries · ${(chartData[chartData.length - 1].weight - chartData[0].weight).toFixed(1)} kg change`}>
            <div className="p-5"><WeightChart data={chartData} /></div>
          </SectionCard>
        </div>
      )}
    </>
  );
};

export default MemberProfile;
