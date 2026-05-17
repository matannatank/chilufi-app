import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/profile-setup-form";
import { ShiftCommanderRequestSection } from "@/components/shift-commander-request-section";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { getPersonalStats } from "@/lib/personal-stats";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const stats = await getPersonalStats(user.id);

  const { data: latestRequest } = await supabase
    .from("shift_commander_requests")
    .select("id, shift, status, rejection_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-950">פרופיל</h1>
        <LogoutButton />
      </header>
      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">הסטטיסטיקה שלך</h2>
        <div className="mt-2 space-y-1 text-sm text-zinc-800">
          <p>חילופים שהשלמת השנה: {stats.yearlyCompletedSwaps}</p>
          <p>מועמדויות שהגשת השנה: {stats.yearlySubmittedApplications}</p>
        </div>
      </section>
      <ShiftCommanderRequestSection
        userId={user.id}
        profile={profile}
        latestRequest={latestRequest}
      />
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
        <ProfileSetupForm
          userId={user.id}
          initialProfile={profile}
          submitLabel="שמור שינויים"
          redirectTo="/profile"
        />
      </div>
      <AppBottomNav />
    </main>
  );
}
