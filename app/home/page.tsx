import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfferCard } from "@/components/offer-card";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import type { Location, UserRole } from "@/types";

type HomeOfferRow = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  poster_id: string;
  profiles:
    | {
        full_name: string;
        role: UserRole;
        has_hazmat: boolean;
        has_license: boolean;
      }
    | Array<{
        full_name: string;
        role: UserRole;
        has_hazmat: boolean;
        has_license: boolean;
      }>
    | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: offersRaw, error } = await supabase
    .from("swap_offers")
    .select(
      "id, shift_date, start_time, end_time, location, poster_id, profiles!swap_offers_poster_id_fkey(full_name, role, has_hazmat, has_license)",
    )
    .eq("status", "open")
    .gte("shift_date", today)
    .order("shift_date", { ascending: true });

  const offers = (offersRaw ?? []) as HomeOfferRow[];

  const offerIds = offers.map((offer) => offer.id);

  const { data: applications } = offerIds.length
    ? await supabase
        .from("applications")
        .select("offer_id, applicant_id, status")
        .in("offer_id", offerIds)
        .eq("status", "pending")
    : { data: [] as Array<{ offer_id: string; applicant_id: string; status: string }> };

  const applicationByOffer = new Map<string, number>();
  const userAppliedOffers = new Set<string>();

  (applications ?? []).forEach((application) => {
    applicationByOffer.set(
      application.offer_id,
      (applicationByOffer.get(application.offer_id) ?? 0) + 1,
    );
    if (application.applicant_id === user.id) {
      userAppliedOffers.add(application.offer_id);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-950">חילופי</h1>
        <div className="flex items-center gap-2">
          <Link href="/offer/new" className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">
            הצעה חדשה +
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-200/80 p-1 text-sm">
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-center font-semibold text-zinc-900 shadow-sm">
          הצעות פתוחות
        </div>
        <Link
          href="/offer/new"
          className="rounded-lg px-3 py-2 text-center text-zinc-600 transition hover:bg-zinc-300/50"
        >
          חדשה
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300/90 bg-red-100/90 p-3 text-sm text-red-900">
          שגיאה בטעינת ההצעות. נסה לרענן.
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        {offers && offers.length > 0 ? (
          offers.map((offer) => {
            const poster = Array.isArray(offer.profiles)
              ? offer.profiles[0]
              : offer.profiles;

            if (!poster) {
              return null;
            }

            return (
              <OfferCard
                key={offer.id}
                id={offer.id}
                shiftDate={offer.shift_date}
                startTime={offer.start_time}
                endTime={offer.end_time}
                location={offer.location}
                posterName={poster.full_name}
                posterRole={poster.role}
                hasHazmat={poster.has_hazmat}
                hasLicense={poster.has_license}
                applicantsCount={applicationByOffer.get(offer.id) ?? 0}
                isMine={offer.poster_id === user.id}
                iApplied={userAppliedOffers.has(offer.id)}
              />
            );
          })
        ) : (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 shadow-sm">
            אין הצעות פתוחות כרגע
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
