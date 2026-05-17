import type { SupabaseClient } from "@supabase/supabase-js";
import type { Location, Shift } from "@/types";

export type PendingCommanderApproval = {
  approvalId: string;
  offerId: string;
  shift: Shift;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: Location;
  posterName: string;
  posterShift: Shift | null;
  chosenName: string;
  chosenShift: Shift | null;
};

type ApprovalRow = {
  id: string;
  shift: Shift;
  offer_id: string;
  swap_offers:
    | {
        id: string;
        shift_date: string;
        start_time: string;
        end_time: string;
        location: Location;
        status: string;
        poster: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
        chosen: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
      }
    | Array<{
        id: string;
        shift_date: string;
        start_time: string;
        end_time: string;
        location: Location;
        status: string;
        poster: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
        chosen: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
      }>
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getPendingCommanderApprovals(
  supabase: SupabaseClient,
  userId: string,
): Promise<PendingCommanderApproval[]> {
  const { data, error } = await supabase
    .from("commander_approvals")
    .select(
      `id, shift, offer_id,
      swap_offers!inner(
        id, shift_date, start_time, end_time, location, status,
        poster:profiles!swap_offers_poster_id_fkey(full_name, shift),
        chosen:profiles!swap_offers_chosen_applicant_id_fkey(full_name, shift)
      )`,
    )
    .eq("commander_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as ApprovalRow[])
    .map((row) => {
      const offer = first(row.swap_offers);
      const poster = first(offer?.poster ?? null);
      const chosen = first(offer?.chosen ?? null);
      if (!offer || offer.status !== "pending_approval" || !poster || !chosen) {
        return null;
      }
      return {
        approvalId: row.id,
        offerId: row.offer_id,
        shift: row.shift,
        shiftDate: offer.shift_date,
        startTime: offer.start_time,
        endTime: offer.end_time,
        location: offer.location,
        posterName: poster.full_name,
        posterShift: poster.shift,
        chosenName: chosen.full_name,
        chosenShift: chosen.shift,
      } satisfies PendingCommanderApproval;
    })
    .filter((row): row is PendingCommanderApproval => row !== null);
}

export async function countPendingCommanderApprovals(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("commander_approvals")
    .select("id", { count: "exact", head: true })
    .eq("commander_id", userId)
    .eq("status", "pending");

  if (error) {
    return 0;
  }

  return count ?? 0;
}
