import { getAuthUser, getSupabase } from "@/lib/server-session";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/profile-setup-form";

export default async function ProfileSetupPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-zinc-100 p-6 text-zinc-900">
      <header className="text-center text-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-950">השלמת פרופיל</h1>
        <p className="mt-2 text-sm font-medium text-zinc-700">
          כדי להשתמש באפליקציה צריך למלא פרטים בסיסיים
        </p>
      </header>
      <ProfileSetupForm userId={user.id} initialProfile={profile} />
    </main>
  );
}
