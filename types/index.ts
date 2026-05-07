export type Shift = "a" | "b" | "c";

export type UserRole = "officer" | "team_commander" | "shift_commander" | "fighter";

export type Location = "petah_tikva" | "rosh_haayin" | "elad";

export type OfferStatus = "open" | "pending_approval" | "matched" | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApplicationStatus = "pending" | "chosen" | "withdrawn";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  shift: Shift | null;
  has_hazmat: boolean;
  has_license: boolean;
  has_crane: boolean;
  created_at: string;
  updated_at: string;
}

export interface SwapOffer {
  id: string;
  poster_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  notes: string | null;
  status: OfferStatus;
  chosen_applicant_id: string | null;
  target_shift: Shift | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  offer_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface CommanderApproval {
  id: string;
  offer_id: string;
  commander_id: string;
  shift: Shift;
  status: ApprovalStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const SHIFT_LABELS: Record<Shift, string> = {
  a: "משמרת א'",
  b: "משמרת ב'",
  c: "משמרת ג'",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  officer: "קצין",
  team_commander: "מפקד צוות",
  shift_commander: "מפקד משמרת",
  fighter: "לוחם",
};

export const LOCATION_LABELS: Record<Location, string> = {
  petah_tikva: "פתח תקווה",
  rosh_haayin: "ראש העין",
  elad: "אלעד",
};

export const STATUS_LABELS: Record<OfferStatus, string> = {
  open: "פתוח",
  pending_approval: "ממתין לאישור מפקדים",
  matched: "אושר",
  cancelled: "בוטל",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
};
