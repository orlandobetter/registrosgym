-- ============================================================================
-- GymRegister → SaaS privado multi-tenant
-- Introduce: roles (superadmin / gym_admin), gimnasios (tenants), aislamiento
-- de datos por gimnasio y eliminación del registro público.
-- ============================================================================

-- 1. Rol de aplicación --------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('superadmin', 'gym_admin');

-- 2. Gimnasios (empresas / tenants) -------------------------------------------
CREATE TABLE public.gyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  subscription_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Perfiles (vincula auth.users con rol y gimnasio) -------------------------
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.app_role NOT NULL,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un gym_admin siempre debe pertenecer a un gimnasio; un superadmin nunca.
  CONSTRAINT profiles_role_gym_check CHECK (
    (role = 'gym_admin' AND gym_id IS NOT NULL) OR
    (role = 'superadmin' AND gym_id IS NULL)
  )
);

CREATE UNIQUE INDEX profiles_single_admin_per_gym_idx
  ON public.profiles (gym_id)
  WHERE role = 'gym_admin';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Funciones SECURITY DEFINER (evitan recursión de RLS sobre profiles) -----
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gym_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_gym_active(check_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms WHERE id = check_gym_id AND status = 'active'
  )
$$;

-- 5. RLS: gyms -----------------------------------------------------------------
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;

CREATE POLICY "Superadmin gestiona todos los gimnasios"
  ON public.gyms FOR ALL
  USING (public.current_role() = 'superadmin')
  WITH CHECK (public.current_role() = 'superadmin');

CREATE POLICY "Gym admin ve su propio gimnasio"
  ON public.gyms FOR SELECT
  USING (id = public.current_gym_id());

-- 6. RLS: profiles ---------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Usuario ve su propio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Superadmin ve todos los perfiles"
  ON public.profiles FOR SELECT
  USING (public.current_role() = 'superadmin');

CREATE POLICY "Superadmin administra perfiles"
  ON public.profiles FOR ALL
  USING (public.current_role() = 'superadmin')
  WITH CHECK (public.current_role() = 'superadmin');

-- 7. members: aislamiento por gimnasio -----------------------------------------
ALTER TABLE public.members ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
CREATE INDEX members_gym_id_idx ON public.members(gym_id);

-- Elimina la política antigua basada en el dueño individual.
DROP POLICY IF EXISTS "Users manage their own members" ON public.members;

CREATE POLICY "Gym admin gestiona los socios de su gimnasio"
  ON public.members FOR ALL
  USING (gym_id = public.current_gym_id())
  WITH CHECK (gym_id = public.current_gym_id());

CREATE POLICY "Superadmin ve todos los socios (estadísticas)"
  ON public.members FOR SELECT
  USING (public.current_role() = 'superadmin');

-- NOTA: si ya existían socios sin gym_id, deberán reasignarse a un gimnasio
-- antes de poder marcar la columna como NOT NULL. Se deja nullable a propósito
-- para no romper datos existentes; la aplicación siempre envía gym_id al crear.

-- 8. Bootstrap del primer Superadministrador -----------------------------------
-- No hay registro público, así que el primer superadmin debe crearse a mano:
-- 1) Crea el usuario en Supabase Studio → Authentication → Add user
--    (o vía `supabaseAdmin.auth.admin.createUser` en un script puntual).
-- 2) Ejecuta, reemplazando el correo:
--
--    INSERT INTO public.profiles (id, role, full_name)
--    SELECT id, 'superadmin', 'Superadministrador'
--    FROM auth.users WHERE email = 'tu-correo@ejemplo.com';
