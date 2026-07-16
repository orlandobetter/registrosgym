import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type AuthSearch = {
  suspended?: boolean;
};

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    suspended:
      search.suspended === true || search.suspended === "true" || search.suspended === "1"
        ? true
        : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { suspended } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bienvenido de vuelta");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <Link to="/auth" className="flex items-center gap-2 font-semibold text-lg">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground/15 backdrop-blur">
            <Dumbbell className="h-5 w-5" />
          </div>
          GymRegister
        </Link>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Deja el Excel. Administra tu gimnasio con claridad.
          </h2>
          <p className="text-primary-foreground/80">
            Registra socios, controla vencimientos y toma decisiones con un panel diseñado
            para verse bien en cualquier pantalla.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} GymRegister
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <Link to="/auth" className="lg:hidden flex items-center gap-2 font-semibold text-lg">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            GymRegister
          </Link>

          {suspended && (
            <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Tu cuenta está suspendida</p>
                <p className="mt-1 text-danger/90">
                  Contacta al administrador de la plataforma para reactivar tu acceso.
                </p>
              </div>
            </div>
          )}

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
              <CardDescription>Accede al panel de tu gimnasio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@gimnasio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar sesión
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                El acceso es exclusivo para cuentas creadas por el administrador de la
                plataforma. No es posible registrarse por cuenta propia.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
