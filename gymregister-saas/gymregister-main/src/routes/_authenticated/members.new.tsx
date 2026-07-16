import { createFileRoute, useNavigate, Link, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MemberForm, type MemberFormValues } from "@/components/member-form";

export const Route = createFileRoute("/_authenticated/members/new")({
  component: NewMember,
});

function NewMember() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useRouteContext({ from: "/_authenticated" });
  const [submitting, setSubmitting] = useState(false);

  const save = async (v: MemberFormValues) => {
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sesión no válida");
      if (!profile.gym_id) throw new Error("Tu cuenta no está asociada a un gimnasio");
      const { error } = await supabase.from("members").insert({
        user_id: userData.user.id,
        gym_id: profile.gym_id,
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
      });
      if (error) throw error;
      toast.success("Socio registrado");
      qc.invalidateQueries({ queryKey: ["members"] });
      navigate({ to: "/members" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Registrar socio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completa los datos del nuevo socio del gimnasio.
        </p>
      </div>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Datos del socio</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberForm onSubmit={save} submitting={submitting} />
        </CardContent>
      </Card>
    </div>
  );
}
