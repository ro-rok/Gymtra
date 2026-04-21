import { Link, useParams } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers } from "@/lib/data-service";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Members = () => {
  const { gymSlug } = useParams();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "pending_renewal">("all");
  const allMembers = getMembers(user?.gymId || "1");
  const members = allMembers.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(q.toLowerCase()) || m.phone.includes(q);
    const matchFilter = filter === "all" || m.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: allMembers.length,
    active: allMembers.filter(m => m.status === "active").length,
    expired: allMembers.filter(m => m.status === "expired").length,
    pending_renewal: allMembers.filter(m => m.status === "pending_renewal").length,
  };

  return (
    <>
      <PageHeader
        title="Members"
        subtitle={`${allMembers.length} total · ${counts.active} active`}
        action={<Link to={`/${gymSlug}/owner/members/new`}><Button className="gap-2"><Plus className="w-4 h-4" /> Add Member</Button></Link>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone…" className="pl-10" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {(["all", "active", "pending_renewal", "expired"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3 h-9 rounded-lg text-xs font-medium border transition-all",
                filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {f === "all" ? "All" : f === "pending_renewal" ? "Renewal" : f.charAt(0).toUpperCase() + f.slice(1)} · {counts[f]}
            </button>
          ))}
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? `No members match "${q}"` : "No members yet"}
          description={q ? "Try a different search." : "Add your first member to get started."}
          action={!q && <Link to={`/${gymSlug}/owner/members/new`}><Button className="gap-2"><Plus className="w-4 h-4" /> Add member</Button></Link>}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-card border border-border flex items-center justify-center text-xs font-bold">{m.avatar}</div>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{m.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground tabular-nums">{m.phone}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{m.joinDate}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/${gymSlug}/owner/members/${m.id}`}><Button size="sm" variant="ghost" className="hover:text-primary">View →</Button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
export default Members;
