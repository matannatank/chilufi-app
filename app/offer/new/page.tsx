import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { NewOfferForm } from "@/components/new-offer-form";

export default async function NewOfferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-zinc-100 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">הצעה חדשה</h1>
        <p className="mt-2 text-sm text-zinc-600">מלא פרטים ופרסם את המשמרת להחלפה</p>
      </header>
      <NewOfferForm userId={user.id} />
    </main>
  );
}
