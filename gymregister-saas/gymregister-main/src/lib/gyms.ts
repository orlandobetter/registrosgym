import { differenceInCalendarDays, parseISO } from "date-fns";

export type AppRole = "superadmin" | "gym_admin";

export type Gym = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "suspended";
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  gym_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Perfil del usuario autenticado, con su gimnasio embebido si aplica. */
export type ProfileWithGym = Profile & { gyms: Gym | null };

export function isSubscriptionExpiringSoon(date: string | null): boolean {
  if (!date) return false;
  const days = differenceInCalendarDays(parseISO(date), new Date());
  return days >= 0 && days <= 7;
}

export function isSubscriptionExpired(date: string | null): boolean {
  if (!date) return false;
  return differenceInCalendarDays(parseISO(date), new Date()) < 0;
}

export const gymStatusMeta: Record<Gym["status"], { label: string; className: string; dot: string }> = {
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border border-success/20",
    dot: "bg-success",
  },
  suspended: {
    label: "Suspendido",
    className: "bg-danger/10 text-danger border border-danger/20",
    dot: "bg-danger",
  },
};
