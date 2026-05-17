import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile, getSupabase } from "@/lib/server-session";
import { NewOfferForm } from "@/components/new-offer-form";
import type { Shift } from "@/types";

export default async function NewOfferPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  const profile = await getCurrentProfile();

  if (!profile?.shift) {
    redirect("/profile/setup");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-zinc-100 p-6 text-zinc-900">
      <header className="text-center text-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-950">הצעה חדשה</h1>
        <p className="mt-2 text-sm font-medium text-zinc-700">מלא פרטים ופרסם את המשמרת להחלפה</p>
      </header>
      <NewOfferForm userId={user.id} userShift={profile.shift as Shift} />
    </main>
  );
}
