import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { MacroLineChart, WeightChart, WaterChart } from "@/components/Charts";
import { TrendingDown, Activity, Droplets, Plus, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { listProgressLogsRequest, addProgressLogRequest, getProgressSeriesRequest } from "@/lib/progress-api";
import { getMemberDashboardAttendanceTasksRequest } from "@/lib/attendance-api";
import { getMemberMacroSeriesRequest } from "@/lib/diet-api";
import type { ProgressLog } from "@/lib/types";

const Progress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<ProgressLog[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [waterChartData, setWaterChartData] = useState<Array<{ day: string; liters: number }>>([]);
  const [seriesDelta, setSeriesDelta] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight: "", bodyFat: "", notes: "" });
  const [macroSeries, setMacroSeries] = useState<Array<{ day: string; protein: number; carbs: number; fat: number }>>([]);

  useEffect(() => {
    Promise.all([
      listProgressLogsRequest(),
      getProgressSeriesRequest(),
      getMemberDashboardAttendanceTasksRequest(),
      getMemberMacroSeriesRequest(),
    ])
      .then(([logs, series, dashboard, macros]) => {
        setProgress(logs.items);
        setSeriesDelta(series.deltaWeight || 0);
        setAttendance(dashboard.attendance || []);
        setMacroSeries((macros.items || []).map((m) => ({ day: m.day.slice(8), protein: m.protein, carbs: m.carbs, fat: m.fat })));
        const recent = (dashboard.attendance || []).slice(0, 7).map((row: any) => ({
          day: new Date(row.date).toLocaleDateString("en-US", { weekday: "short" }),
          liters: 0,
        }));
        setWaterChartData(recent);
      })
      .catch(() => {
        setProgress([]);
        setAttendance([]);
        setWaterChartData([]);
        setSeriesDelta(0);
        setMacroSeries([]);
      });
  }, []);
  const avgWater = waterChartData.reduce((s, t) => s + (t.liters || 0), 0) / Math.max(1, waterChartData.length);

  const chartData = progress.map(p => ({ date: p.date.slice(5), weight: p.weightKg }));
  const firstWeight = progress[0]?.weightKg || 0;
  const lastWeight = progress[progress.length - 1]?.weightKg || 0;
  const diff = firstWeight ? lastWeight - firstWeight : seriesDelta;

  const handleAdd = async () => {
    await addProgressLogRequest({
      date: new Date().toISOString().split("T")[0],
      weightKg: Number(form.weight),
      bodyFatPct: form.bodyFat ? Number(form.bodyFat) : undefined,
      notes: form.notes || undefined,
    });
    const latest = await listProgressLogsRequest();
    setProgress(latest.items);
    toast({ title: "Progress logged 💪" });
    setShowForm(false);
    setForm({ weight: "", bodyFat: "", notes: "" });
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
        <SectionCard title="Macros this month" description="protein / carbs / fat">
          <div className="p-5">
            {macroSeries.length > 0 ? (
              <MacroLineChart data={macroSeries} />
            ) : (
              <EmptyState icon={BarChart3} title="No macro tracking yet" description="Mark meals in Diet page to see this chart." className="border-0 bg-transparent" />
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
};

export default Progress;
