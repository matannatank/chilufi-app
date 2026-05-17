import { BottomNav } from "@/components/bottom-nav";
import { getNavBadges } from "@/lib/server-session";

export async function AppBottomNav() {
  const badges = await getNavBadges();

  return (
    <BottomNav
      isShiftCommander={badges.isShiftCommander}
      pendingApprovalsCount={badges.pendingApprovalsCount}
      isAdmin={badges.isAdmin}
      pendingCommanderRequestsCount={badges.pendingCommanderRequestsCount}
    />
  );
}
