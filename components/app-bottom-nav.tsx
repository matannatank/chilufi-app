import { createClient } from "@/utils/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
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
  const pendingApprovalsCount = isShiftCommander
    ? await countPendingCommanderApprovals(supabase, user.id)
    : 0;

  return (
    <BottomNav
      isShiftCommander={isShiftCommander}
      pendingApprovalsCount={pendingApprovalsCount}
    />
  );
}
