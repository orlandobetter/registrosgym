import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MemberForm, type MemberFormValues } from "@/components/member-form";
import type { Member } from "@/lib/members";

export const Route = createFileRoute("/_authenticated/members/$id/edit")({
  component: EditMember,
});

function EditMember() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ["members", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Member;
    },
  });

  const save = async (v: MemberFormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          full_name: v.full_name.trim(),
          document: v.document.trim(),
          phone: v.phone || null,
          email: v.email || null,
          address: v.address || null,
          birth_date: v.birth_date || null,
          plan: v.plan,
          start_date: v.start_date,
          end_date: v.end_date,
          notes: v.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Socio actualizado");
      qc.invalidateQueries({ queryKey: ["members"] });
      navigate({ to: "/members" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/members">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Editar socio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actualiza la información del socio.
        </p>
      </div>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Datos del socio</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !member ? (
            <div className="py-10 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <MemberForm
              submitting={submitting}
              submitLabel="Guardar cambios"
              onSubmit={save}
              initial={{
                full_name: member.full_name,
                document: member.document,
                phone: member.phone ?? "",
                email: member.email ?? "",
                address: member.address ?? "",
                birth_date: member.birth_date ?? "",
                plan: member.plan,
                start_date: member.start_date,
                end_date: member.end_date,
                notes: member.notes ?? "",
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
