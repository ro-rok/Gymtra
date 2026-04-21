import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { WeightChart, WaterChart } from "@/components/Charts";
import { TrendingDown, Activity, Droplets, Plus, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getProgress, addProgress, getMemberAttendance, getDailyTaskHistory } from "@/lib/data-service";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Progress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const memberId = user?.id === "u-member-1" ? "m1" : user?.id || "";
  const gymId = user?.gymId || "1";
  const [, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: "", bodyFat: "", notes: "" });

  const progress = getProgress(memberId);
  const attendance = getMemberAttendance(memberId);
  const waterHistory = getDailyTaskHistory(memberId, 7);
  const waterChartData = waterHistory.map(t => ({
    day: new Date(t.date).toLocaleDateString("en-US", { weekday: "short" }),
    liters: t.waterLiters || 0,
  }));
  const avgWater = waterHistory.reduce((s, t) => s + (t.waterLiters || 0), 0) / Math.max(1, waterHistory.length);

  const chartData = progress.map(p => ({ date: p.date.slice(5), weight: p.weightKg }));
  const firstWeight = progress[0]?.weightKg || 0;
  const lastWeight = progress[progress.length - 1]?.weightKg || 0;
  const diff = firstWeight ? lastWeight - firstWeight : 0;

  const handleAdd = () => {
    addProgress({
      memberId, gymId, date: new Date().toISOString().split("T")[0],
      weightKg: Number(form.weight),
      bodyFatPct: form.bodyFat ? Number(form.bodyFat) : undefined,
      notes: form.notes || undefined,
    });
    toast({ title: "Progress logged 💪" });
    setShowForm(false);
    setForm({ weight: "", bodyFat: "", notes: "" });
    setRefresh(n => n + 1);
  };

  return (
    <>
      <PageHeader title="Your Progress" subtitle={`${progress.length} entries · keep showing up.`}
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> Log weight</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-3 animate-scale-in">
          <div><Label>Weight (kg)</Label><Input className="mt-1" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
          <div><Label>Body fat %</Label><Input className="mt-1" type="number" value={form.bodyFat} onChange={e => setForm({ ...form, bodyFat: e.target.value })} /></div>
          <div><Label>Notes</Label><Input className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={handleAdd} disabled={!form.weight}>Save</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Weight change" value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`} icon={TrendingDown} accent={diff < 0 ? "success" : "warning"} animated={false} />
        <KpiCard label="Workouts" value={attendance.length} hint="all-time" icon={Activity} accent="primary" />
        <KpiCard label="Water avg" value={`${avgWater.toFixed(1)}L`} hint="last 7 days" icon={Droplets} accent="accent" animated={false} />
        <KpiCard label="Entries" value={progress.length} icon={BarChart3} accent="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard title="Weight trend" description="kg">
          <div className="p-5">
            {chartData.length > 0 ? <WeightChart data={chartData} /> : (
              <EmptyState icon={BarChart3} title="No entries yet" description="Log your first weight to see trends here." className="border-0 bg-transparent" />
            )}
          </div>
        </SectionCard>
        <SectionCard title="Water this week" description="liters / day">
          <div className="p-5"><WaterChart data={waterChartData} /></div>
        </SectionCard>
      </div>
    </>
  );
};

export default Progress;
