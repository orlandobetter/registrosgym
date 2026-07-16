import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformStats, setGymStatus } from "@/lib/admin-actions";
import { gymStatusMeta, isSubscriptionExpired, isSubscriptionExpiringSoon, type Gym } from "@/lib/gyms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, CheckCircle2, XCircle, Plus, Pause, Play } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const qc = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: gyms = [], isLoading } = useQuery({
    queryKey: ["admin-gyms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Gym[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => getPlatformStats(),
  });

  const cards = [
    { label: "Gimnasios totales", value: stats?.totalGyms ?? "—", icon: Building2, color: "text-foreground", bg: "bg-secondary" },
    { label: "Activos", value: stats?.activeGyms ?? "—", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "Suspendidos", value: stats?.suspendedGyms ?? "—", icon: XCircle, color: "text-danger", bg: "bg-danger/10" },
    { label: "Socios en la plataforma", value: stats?.totalMembers ?? "—", icon: Users, color: "text-foreground", bg: "bg-secondary" },
  ];

  const toggleStatus = async (gym: Gym) => {
    setTogglingId(gym.id);
    try {
      await setGymStatus({
        data: { gymId: gym.id, status: gym.status === "active" ? "suspended" : "active" },
      });
      toast.success(
        gym.status === "active" ? "Gimnasio suspendido" : "Gimnasio activado",
      );
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            Panel de Superadministrador
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los gimnasios de la plataforma.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/admin/gyms/new">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nuevo gimnasio</span>
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
                  <p className="text-3xl font-bold mt-2 tabular-nums">{c.value}</p>
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
        <CardHeader>
          <CardTitle>Gimnasios registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Cargando...</div>
          ) : gyms.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-muted-foreground">Aún no hay gimnasios registrados.</p>
              <Button asChild className="mt-4">
                <Link to="/admin/gyms/new">
                  <Plus className="h-4 w-4 mr-2" /> Crear el primer gimnasio
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Nombre</th>
                    <th className="px-6 py-3 font-medium">Contacto</th>
                    <th className="px-6 py-3 font-medium">Vence suscripción</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gyms.map((gym) => {
                    const meta = gymStatusMeta[gym.status];
                    const expired = isSubscriptionExpired(gym.subscription_end_date);
                    const expiring = isSubscriptionExpiringSoon(gym.subscription_end_date);
                    return (
                      <tr key={gym.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-3 font-medium">
                          <Link
                            to="/admin/gyms/$id"
                            params={{ id: gym.id }}
                            className="hover:underline"
                          >
                            {gym.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {gym.email || gym.phone || "—"}
                        </td>
                        <td className="px-6 py-3 tabular-nums">
                          {gym.subscription_end_date ? (
                            <span
                              className={
                                expired
                                  ? "text-danger font-medium"
                                  : expiring
                                    ? "text-warning-foreground font-medium"
                                    : "text-muted-foreground"
                              }
                            >
                              {format(parseISO(gym.subscription_end_date), "d MMM yyyy", { locale: es })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={togglingId === gym.id}
                              onClick={() => toggleStatus(gym)}
                              title={gym.status === "active" ? "Suspender" : "Activar"}
                            >
                              {gym.status === "active" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
