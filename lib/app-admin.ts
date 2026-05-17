import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAppAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export async function countPendingShiftCommanderRequests(
  supabase: SupabaseClient,
): Promise<number> {
  const { count } = await supabase
    .from("shift_commander_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return count ?? 0;
}
