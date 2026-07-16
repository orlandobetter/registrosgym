import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export type MemberFormValues = {
  full_name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  birth_date: string;
  plan: string;
  start_date: string;
  end_date: string;
  notes: string;
};

const emptyValues: MemberFormValues = {
  full_name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  birth_date: "",
  plan: "Mensual",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  notes: "",
};

const plans = ["Diario", "Semanal", "Quincenal", "Mensual", "Trimestral", "Semestral", "Anual"];

export function MemberForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Guardar socio",
}: {
  initial?: Partial<MemberFormValues>;
  onSubmit: (values: MemberFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<MemberFormValues>({ ...emptyValues, ...initial });

  const set = <K extends keyof MemberFormValues>(k: K, v: MemberFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handle} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Información personal
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input
              id="full_name"
              required
              value={values.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">Documento *</Label>
            <Input
              id="document"
              required
              value={values.document}
              onChange={(e) => set("document", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de nacimiento</Label>
            <Input
              id="birth_date"
              type="date"
              value={values.birth_date}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Membresía
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="plan">Plan contratado *</Label>
            <Select value={values.plan} onValueChange={(v) => set("plan", v)}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha de inicio *</Label>
            <Input
              id="start_date"
              type="date"
              required
              value={values.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Fecha de vencimiento *</Label>
            <Input
              id="end_date"
              type="date"
              required
              value={values.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea
            id="notes"
            rows={4}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Notas, condiciones médicas, objetivos..."
          />
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
