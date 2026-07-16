// Funciones de servidor (TanStack Start) para el panel del Superadministrador.
// Se ejecutan únicamente en el servidor: usan el cliente con service_role
// (bypassa RLS) y por eso jamás se importan directamente en componentes.
// Cada función valida primero, con el JWT del llamador, que el usuario tiene
// rol "superadmin" antes de tocar datos de otros gimnasios.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperadmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "superadmin") {
    throw new Error("No autorizado: se requiere rol de superadministrador");
  }
  return supabaseAdmin;
}

// ---------------------------------------------------------------------------
// Gimnasios
// ---------------------------------------------------------------------------

export const createGym = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      subscription_end_date?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);
    const { data: gym, error } = await supabaseAdmin
      .from("gyms")
      .insert({
        name: data.name.trim(),
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        subscription_end_date: data.subscription_end_date || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return gym;
  });

export const updateGym = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      id: string;
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      subscription_end_date?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin
      .from("gyms")
      .update({
        name: data.name.trim(),
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        subscription_end_date: data.subscription_end_date || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const setGymStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { gymId: string; status: "active" | "suspended" }) => data)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin
      .from("gyms")
      .update({ status: data.status })
      .eq("id", data.gymId);
    if (error) throw new Error(error.message);

    // Si se suspende, se cierra la sesión de inmediato a todos los usuarios
    // de ese gimnasio (no solo se bloquea en el próximo request).
    if (data.status === "suspended") {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("gym_id", data.gymId);
      for (const admin of admins ?? []) {
        await supabaseAdmin.auth.admin.signOut(admin.id, "global").catch(() => undefined);
      }
    }
    return { success: true };
  });

export const deleteGym = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { gymId: string }) => data)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);

    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("gym_id", data.gymId);

    // El registro de gyms cae en cascada sobre profiles y members;
    // adicionalmente eliminamos las cuentas auth de sus administradores.
    const { error } = await supabaseAdmin.from("gyms").delete().eq("id", data.gymId);
    if (error) throw new Error(error.message);

    for (const admin of admins ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(admin.id).catch(() => undefined);
    }
    return { success: true };
  });

// ---------------------------------------------------------------------------
// Administradores de gimnasio
// ---------------------------------------------------------------------------

export const createGymAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { gymId: string; email: string; password: string; full_name?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("gym_id", data.gymId)
      .eq("role", "gym_admin")
      .maybeSingle();
    if (existing) throw new Error("Este gimnasio ya tiene un administrador asignado");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(createError?.message || "No se pudo crear el usuario");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      role: "gym_admin",
      gym_id: data.gymId,
      full_name: data.full_name || null,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      throw new Error(profileError.message);
    }

    return { id: created.user.id, email: created.user.email };
  });

export const resetGymAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// Estadísticas de la plataforma
// ---------------------------------------------------------------------------

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertSuperadmin(context.userId);

    const [{ count: totalGyms }, { count: activeGyms }, { count: suspendedGyms }, { count: totalMembers }] =
      await Promise.all([
        supabaseAdmin.from("gyms").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("gyms").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("gyms").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabaseAdmin.from("members").select("*", { count: "exact", head: true }),
      ]);

    return {
      totalGyms: totalGyms ?? 0,
      activeGyms: activeGyms ?? 0,
      suspendedGyms: suspendedGyms ?? 0,
      totalMembers: totalMembers ?? 0,
    };
  });
