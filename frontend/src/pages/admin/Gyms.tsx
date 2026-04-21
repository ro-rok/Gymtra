import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { createAdminGymRequest, listAdminGymsRequest, updateAdminGymStatusRequest } from "@/lib/admin-api";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const AdminGyms = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", city: "", tagline: "" });
  const [gyms, setGyms] = useState<any[]>([]);

  const loadGyms = () =>
    listAdminGymsRequest()
      .then(setGyms)
      .catch(() => toast({ title: "Unable to load gyms", variant: "destructive" }));

  useEffect(() => {
    loadGyms();
  }, []);

  const handleAdd = async () => {
    await createAdminGymRequest({ name: form.name, slug: form.slug, city: form.city, tagline: form.tagline });
    toast({ title: "Gym created!" });
    setShowForm(false);
    setForm({ name: "", slug: "", city: "", tagline: "" });
    loadGyms();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateAdminGymStatusRequest(id, !active);
    toast({ title: active ? "Gym deactivated" : "Gym activated" });
    loadGyms();
  };

  return (
    <>
      <PageHeader title="Gyms" subtitle="Manage tenant gyms and seats."
        action={<Button className="gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> New Gym</Button>} />

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-3">
          <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Slug</Label><Input className="mt-1" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="my-gym" /></div>
          <div><Label>City</Label><Input className="mt-1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={handleAdd} disabled={!form.name || !form.slug}>Create</Button></div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Gym</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">City</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {gyms.map((g) => (
              <tr key={g.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">{g.logo}</div>
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">/{g.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">{g.city}</td>
                <td className="px-4 py-3"><StatusBadge status={g.isActive ? "active" : "expired"} /></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(g.id, g.isActive)}>
                    {g.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
export default AdminGyms;
