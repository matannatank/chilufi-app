import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/profile-setup-form";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-50 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">פרופיל</h1>
        <LogoutButton />
      </header>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <ProfileSetupForm
          userId={user.id}
          initialProfile={profile}
          submitLabel="שמור שינויים"
          redirectTo="/profile"
        />
      </div>
      <BottomNav />
    </main>
  );
}
