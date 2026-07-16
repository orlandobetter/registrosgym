import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export type GymFormValues = {
  name: string;
  address: string;
  phone: string;
  email: string;
  subscription_end_date: string;
};

const emptyValues: GymFormValues = {
  name: "",
  address: "",
  phone: "",
  email: "",
  subscription_end_date: "",
};

export function GymForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Guardar gimnasio",
}: {
  initial?: Partial<GymFormValues>;
  onSubmit: (values: GymFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<GymFormValues>({ ...emptyValues, ...initial });

  const set = <K extends keyof GymFormValues>(k: K, v: GymFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handle} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nombre del gimnasio *</Label>
          <Input
            id="name"
            required
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
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
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscription_end_date">Vencimiento de la suscripción</Label>
          <Input
            id="subscription_end_date"
            type="date"
            value={values.subscription_end_date}
            onChange={(e) => set("subscription_end_date", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
