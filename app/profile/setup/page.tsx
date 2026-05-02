import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/profile-setup-form";

export default async function ProfileSetupPage() {
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-zinc-100 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">השלמת פרופיל</h1>
        <p className="mt-2 text-sm text-zinc-600">
          כדי להשתמש באפליקציה צריך למלא פרטים בסיסיים
        </p>
      </header>
      <ProfileSetupForm userId={user.id} initialProfile={profile} />
    </main>
  );
}
