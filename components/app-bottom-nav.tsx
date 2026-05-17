import { createClient } from "@/utils/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { isAppAdmin, countPendingShiftCommanderRequests } from "@/lib/app-admin";
import { countPendingCommanderApprovals } from "@/lib/pending-commander-approvals";

export async function AppBottomNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <BottomNav />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isShiftCommander = profile?.role === "shift_commander";
  const isAdmin = await isAppAdmin(supabase, user.id);

  const [pendingApprovalsCount, pendingCommanderRequestsCount] = await Promise.all([
    isShiftCommander ? countPendingCommanderApprovals(supabase, user.id) : Promise.resolve(0),
    isAdmin ? countPendingShiftCommanderRequests(supabase) : Promise.resolve(0),
  ]);

  return (
    <BottomNav
      isShiftCommander={isShiftCommander}
      pendingApprovalsCount={pendingApprovalsCount}
      isAdmin={isAdmin}
      pendingCommanderRequestsCount={pendingCommanderRequestsCount}
    />
  );
}
