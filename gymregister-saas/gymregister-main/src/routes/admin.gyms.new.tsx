import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { GymForm, type GymFormValues } from "@/components/gym-form";
import { createGym } from "@/lib/admin-actions";

export const Route = createFileRoute("/admin/gyms/new")({
  component: NewGym,
});

function NewGym() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const save = async (v: GymFormValues) => {
    setSubmitting(true);
    try {
      const gym = await createGym({
        data: {
          name: v.name.trim(),
          address: v.address || null,
          phone: v.phone || null,
          email: v.email || null,
          subscription_end_date: v.subscription_end_date || null,
        },
      });
      toast.success("Gimnasio creado");
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate({ to: "/admin/gyms/$id", params: { id: gym.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el gimnasio");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nuevo gimnasio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registra un nuevo gimnasio en la plataforma.
        </p>
      </div>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Datos del gimnasio</CardTitle>
        </CardHeader>
        <CardContent>
          <GymForm onSubmit={save} submitting={submitting} submitLabel="Crear gimnasio" />
        </CardContent>
      </Card>
    </div>
  );
}
