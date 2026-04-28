export type UserRole = "officer" | "team_commander" | "fighter";

export type Location = "petah_tikva" | "rosh_haayin" | "elad";

export type OfferStatus = "open" | "matched" | "cancelled";

export type ApplicationStatus = "pending" | "chosen" | "withdrawn";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  has_hazmat: boolean;
  has_license: boolean;
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

export const ROLE_LABELS: Record<UserRole, string> = {
  officer: "קצין",
  team_commander: "מפקד צוות",
  fighter: "לוחם",
};

export const LOCATION_LABELS: Record<Location, string> = {
  petah_tikva: "פתח תקווה",
  rosh_haayin: "ראש העין",
  elad: "אלעד",
};

export const STATUS_LABELS: Record<OfferStatus, string> = {
  open: "פתוח",
  matched: "נסגר",
  cancelled: "בוטל",
};
