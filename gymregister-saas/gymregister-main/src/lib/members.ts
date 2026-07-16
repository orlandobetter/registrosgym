import { differenceInCalendarDays, parseISO } from "date-fns";

export type MemberStatus = "active" | "expiring" | "expired";

export type Member = {
  id: string;
  user_id: string;
  gym_id: string | null;
  full_name: string;
  document: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  plan: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function getMemberStatus(endDate: string): MemberStatus {
  const days = differenceInCalendarDays(parseISO(endDate), new Date());
  if (days <= 0) return "expired";
  if (days < 7) return "expiring";
  return "active";
}

export const statusMeta: Record<MemberStatus, { label: string; className: string; dot: string }> = {
  active: {
    label: "Activo",
    className: "bg-success/10 text-success border border-success/20",
    dot: "bg-success",
  },
  expiring: {
    label: "Próximo a vencer",
    className: "bg-warning/15 text-warning-foreground border border-warning/30",
    dot: "bg-warning",
  },
  expired: {
    label: "Vencido",
    className: "bg-danger/10 text-danger border border-danger/20",
    dot: "bg-danger",
  },
};
