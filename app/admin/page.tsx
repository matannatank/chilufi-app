import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { isAppAdmin } from "@/lib/app-admin";
import { createClient } from "@/utils/supabase/server";
import type { Shift, ShiftCommanderRequestStatus, UserRole } from "@/types";

type ProfileJoin = { full_name: string; phone?: string; role?: UserRole } | null;

function normalizeProfile<T extends ProfileJoin>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const admin = await isAppAdmin(supabase, user.id);
  if (!admin) {
    redirect("/home");
  }

  const [{ data: requestsRaw }, { data: users }, { data: adminsRaw }] = await Promise.all([
    supabase
      .from("shift_commander_requests")
      .select(
        "id, user_id, shift, status, rejection_reason, created_at, profiles!shift_commander_requests_user_id_fkey(full_name, phone, role)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, shift, has_hazmat, has_license, has_crane")
      .order("full_name"),
    supabase
      .from("app_admins")
      .select("user_id, profiles!app_admins_user_id_fkey(full_name)"),
  ]);

  const initialRequests =
    requestsRaw?.map((row) => {
      const profile = normalizeProfile(row.profiles as ProfileJoin | ProfileJoin[] | null);
      return {
        id: row.id,
        user_id: row.user_id,
        shift: row.shift as Shift,
        status: row.status as ShiftCommanderRequestStatus,
        rejection_reason: row.rejection_reason,
        created_at: row.created_at,
        profiles: profile
          ? {
              full_name: profile.full_name,
              phone: profile.phone ?? "",
              role: (profile.role ?? "fighter") as UserRole,
            }
          : null,
      };
    }) ?? [];

  const initialAdmins =
    adminsRaw?.map((row) => ({
      user_id: row.user_id,
      profiles: normalizeProfile(row.profiles as { full_name: string } | { full_name: string }[] | null),
    })) ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header>
        <h1 className="text-2xl font-bold text-zinc-950">ניהול</h1>
        <p className="mt-1 text-sm text-zinc-600">בקשות מפקד משמרת, משתמשים ומנהלי מערכת</p>
      </header>

      <AdminPanel
        currentUserId={user.id}
        initialRequests={initialRequests}
        initialUsers={users ?? []}
        initialAdmins={initialAdmins}
      />

      <AppBottomNav />
    </main>
  );
}
