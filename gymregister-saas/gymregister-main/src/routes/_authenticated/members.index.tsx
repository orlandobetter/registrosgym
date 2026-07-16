import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMemberStatus, statusMeta, type Member, type MemberStatus } from "@/lib/members";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, UserPlus, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/members/")({
  component: MembersList,
});

function MembersList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [deleting, setDeleting] = useState<Member | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (q && !m.full_name.toLowerCase().includes(q) && !m.document.toLowerCase().includes(q))
        return false;
      if (statusFilter !== "all" && getMemberStatus(m.end_date) !== statusFilter) return false;
      return true;
    });
  }, [members, search, statusFilter]);

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("members").delete().eq("id", deleting.id);
    if (error) {
      toast.error("No se pudo eliminar");
    } else {
      toast.success("Socio eliminado");
      qc.invalidateQueries({ queryKey: ["members"] });
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Socios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} de {members.length} socios
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

      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as never)}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="expiring">Próximos a vencer</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border/60 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground">
              {members.length === 0
                ? "Aún no hay socios. Registra el primero."
                : "No se encontraron socios con esos filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Documento</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Vence</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const s = getMemberStatus(m.end_date);
                  const meta = statusMeta[s];
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-3 font-medium">{m.full_name}</td>
                      <td className="px-6 py-3 text-muted-foreground tabular-nums">{m.document}</td>
                      <td className="px-6 py-3 text-muted-foreground">{m.phone || "—"}</td>
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
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate({ to: "/members/$id/edit", params: { id: m.id } })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(m)}
                            className="text-danger hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar socio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleting?.full_name}</strong> permanentemente. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
