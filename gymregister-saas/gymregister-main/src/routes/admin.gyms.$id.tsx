import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createGymAdmin,
  deleteGym,
  resetGymAdminPassword,
  setGymStatus,
  updateGym,
} from "@/lib/admin-actions";
import { gymStatusMeta, type Gym } from "@/lib/gyms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Pause, Play, Trash2, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { GymForm, type GymFormValues } from "@/components/gym-form";

type GymAdminProfile = { id: string; full_name: string | null };

export const Route = createFileRoute("/admin/gyms/$id")({
  component: GymDetail,
});

function GymDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [savingGym, setSavingGym] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: gym, isLoading } = useQuery({
    queryKey: ["admin-gym", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("gyms").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Gym;
    },
  });

  const { data: gymAdmin, isLoading: loadingAdmin } = useQuery({
    queryKey: ["admin-gym-admin", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("gym_id", id)
        .eq("role", "gym_admin")
        .maybeSingle();
      if (error) throw error;
      return data as GymAdminProfile | null;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-gym", id] });
    qc.invalidateQueries({ queryKey: ["admin-gym-admin", id] });
    qc.invalidateQueries({ queryKey: ["admin-gyms"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const saveGym = async (v: GymFormValues) => {
    setSavingGym(true);
    try {
      await updateGym({
        data: {
          id,
          name: v.name.trim(),
          address: v.address || null,
          phone: v.phone || null,
          email: v.email || null,
          subscription_end_date: v.subscription_end_date || null,
        },
      });
      toast.success("Gimnasio actualizado");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSavingGym(false);
    }
  };

  const toggleStatus = async () => {
    if (!gym) return;
    setTogglingStatus(true);
    try {
      await setGymStatus({
        data: { gymId: id, status: gym.status === "active" ? "suspended" : "active" },
      });
      toast.success(gym.status === "active" ? "Gimnasio suspendido" : "Gimnasio activado");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGym({ data: { gymId: id } });
      toast.success("Gimnasio eliminado");
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el gimnasio");
      setDeleting(false);
    }
  };

  if (isLoading || !gym) {
    return <div className="p-10 text-center text-muted-foreground">Cargando...</div>;
  }

  const meta = gymStatusMeta[gym.status];

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{gym.name}</h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium mt-2 ${meta.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleStatus} disabled={togglingStatus}>
            {togglingStatus ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : gym.status === "active" ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {gym.status === "active" ? "Suspender" : "Activar"}
          </Button>
          <Button
            variant="outline"
            className="text-danger hover:text-danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Datos del gimnasio</CardTitle>
        </CardHeader>
        <CardContent>
          <GymForm
            key={gym.id}
            initial={{
              name: gym.name,
              address: gym.address ?? "",
              phone: gym.phone ?? "",
              email: gym.email ?? "",
              subscription_end_date: gym.subscription_end_date ?? "",
            }}
            onSubmit={saveGym}
            submitting={savingGym}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Administrador del gimnasio</CardTitle>
          <CardDescription>
            Este usuario inicia sesión y administra únicamente los socios de este gimnasio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdmin ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : gymAdmin ? (
            <ResetPasswordForm adminId={gymAdmin.id} />
          ) : (
            <CreateAdminForm gymId={id} onCreated={invalidateAll} />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gimnasio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{gym.name}</strong>, su administrador y todos sus socios de
              forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateAdminForm({ gymId, onCreated }: { gymId: string; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createGymAdmin({ data: { gymId, email, password, full_name: fullName || undefined } });
      toast.success("Administrador creado");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el administrador");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="admin_full_name">Nombre</Label>
        <Input id="admin_full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin_email">Correo *</Label>
        <Input
          id="admin_email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin_password">Contraseña inicial *</Label>
        <Input
          id="admin_password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        <UserPlus className="h-4 w-4 mr-2" />
        Crear administrador
      </Button>
    </form>
  );
}

function ResetPasswordForm({ adminId }: { adminId: string }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetGymAdminPassword({ data: { userId: adminId, password } });
      toast.success("Contraseña restablecida");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <p className="text-sm text-muted-foreground">
        Este gimnasio ya tiene un administrador asignado. Puedes restablecer su contraseña.
      </p>
      <div className="space-y-2">
        <Label htmlFor="reset_password">Nueva contraseña</Label>
        <Input
          id="reset_password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" variant="outline" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        <KeyRound className="h-4 w-4 mr-2" />
        Restablecer contraseña
      </Button>
    </form>
  );
}
