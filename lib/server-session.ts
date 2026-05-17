import { cache } from "react";
import { isAppAdmin, countPendingShiftCommanderRequests } from "@/lib/app-admin";
import { countPendingCommanderApprovals } from "@/lib/pending-commander-approvals";
import { createClient } from "@/utils/supabase/server";
import type { Shift, UserRole } from "@/types";

export const getSupabase = cache(createClient);

export const getAuthUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type CurrentProfile = {
  id: string;
  shift: Shift | null;
  role: UserRole;
  full_name: string;
  phone: string;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("shift, role, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: user.id,
    shift: data.shift as Shift | null,
    role: data.role as UserRole,
    full_name: data.full_name,
    phone: data.phone,
  };
});

export type NavBadges = {
  isShiftCommander: boolean;
  isAdmin: boolean;
  pendingApprovalsCount: number;
  pendingCommanderRequestsCount: number;
};

export const getNavBadges = cache(async (): Promise<NavBadges> => {
  const user = await getAuthUser();
  if (!user) {
    return {
      isShiftCommander: false,
      isAdmin: false,
      pendingApprovalsCount: 0,
      pendingCommanderRequestsCount: 0,
    };
  }

  const profile = await getCurrentProfile();
  const supabase = await getSupabase();
  const isShiftCommander = profile?.role === "shift_commander";

  const adminPromise = isAppAdmin(supabase, user.id);

  const [isAdmin, pendingApprovalsCount, pendingCommanderRequestsCount] = await Promise.all([
    adminPromise,
    isShiftCommander
      ? countPendingCommanderApprovals(supabase, user.id)
      : Promise.resolve(0),
    adminPromise.then((admin) =>
      admin ? countPendingShiftCommanderRequests(supabase) : Promise.resolve(0),
    ),
  ]);

  return {
    isShiftCommander,
    isAdmin,
    pendingApprovalsCount,
    pendingCommanderRequestsCount,
  };
});
