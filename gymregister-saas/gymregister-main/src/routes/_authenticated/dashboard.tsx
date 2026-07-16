import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMemberStatus, statusMeta, type Member } from "@/lib/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, AlertTriangle, XCircle, ArrowRight, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
  });

  const stats = members.reduce(
    (acc, m) => {
      const s = getMemberStatus(m.end_date);
      acc.total++;
      acc[s]++;
      return acc;
    },
    { total: 0, active: 0, expiring: 0, expired: 0 },
  );

  const recent = members.slice(0, 5);

  const cards = [
    { label: "Total de socios", value: stats.total, icon: Users, color: "text-foreground", bg: "bg-secondary" },
    { label: "Activos", value: stats.active, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
    { label: "Próximos a vencer", value: stats.expiring, icon: AlertTriangle, color: "text-warning-foreground", bg: "bg-warning/15" },
    { label: "Vencidos", value: stats.expired, icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estado general de tus socios en tiempo real.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/members/new">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Registrar socio</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold mt-2 tabular-nums">
                    {isLoading ? "—" : c.value}
                  </p>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${c.bg}`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimos socios registrados</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/members">
              Ver todos <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-muted-foreground">Aún no hay socios registrados.</p>
              <Button asChild className="mt-4">
                <Link to="/members/new">
                  <UserPlus className="h-4 w-4 mr-2" /> Registrar el primer socio
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Nombre</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Vence</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => {
                    const s = getMemberStatus(m.end_date);
                    const meta = statusMeta[s];
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-3 font-medium">{m.full_name}</td>
                        <td className="px-6 py-3 text-muted-foreground">{m.plan}</td>
                        <td className="px-6 py-3 text-muted-foreground tabular-nums">
                          {format(parseISO(m.end_date), "d MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
