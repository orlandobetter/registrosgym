import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import type { ProfileWithGym } from "@/lib/gyms";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw redirect({ to: "/auth" });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, gym_id, created_at, updated_at, gyms(*)")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    // Este espacio (dashboard, socios) es exclusivo del administrador del
    // gimnasio. El Superadministrador tiene su propio panel en /admin.
    if (profile.role === "superadmin") {
      throw redirect({ to: "/admin" });
    }

    if (!profile.gym_id || !profile.gyms || profile.gyms.status !== "active") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { suspended: true } });
    }

    return { user: userData.user, profile: profile as unknown as ProfileWithGym };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
