import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { formatUserDisplay } from "@/lib/format";
import { LOCATION_LABELS, STATUS_LABELS } from "@/types";
import type { Location, OfferStatus, Shift, UserRole } from "@/types";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";

type HistoryOffer = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  status: OfferStatus;
  updated_at: string;
  profiles:
    | {
        full_name: string;
        role: UserRole;
        shift: Shift | null;
        has_hazmat: boolean;
        has_license: boolean;
        has_crane: boolean;
      }
    | Array<{
        full_name: string;
        role: UserRole;
        shift: Shift | null;
        has_hazmat: boolean;
        has_license: boolean;
        has_crane: boolean;
      }>
    | null;
};

const trimTime = (value: string) => value.slice(0, 5);

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: offersRaw, error } = await supabase
    .from("swap_offers")
    .select(
      "id, shift_date, start_time, end_time, location, status, updated_at, profiles!swap_offers_poster_id_fkey(full_name, role, shift, has_hazmat, has_license, has_crane)",
    )
    .in("status", ["matched", "cancelled"])
    .order("updated_at", { ascending: false })
    .limit(100);

  const offers = (offersRaw ?? []) as HistoryOffer[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-950">היסטוריה</h1>
        <LogoutButton />
      </header>

      {error ? (
        <div className="rounded-lg border border-red-300/90 bg-red-100/90 p-3 text-sm font-medium text-red-900">
          שגיאה בטעינת ההיסטוריה. נסה שוב.
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        {offers.length === 0 ? (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 text-center text-sm font-medium text-zinc-700 shadow-sm">
            אין היסטוריית חילופים
          </div>
        ) : (
          offers.map((offer) => {
            const poster = Array.isArray(offer.profiles)
              ? offer.profiles[0]
              : offer.profiles;
            return (
              <article
                key={offer.id}
                className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm shadow-sm"
              >
                <p className="font-semibold">
                  {offer.shift_date} | {trimTime(offer.start_time)} -{" "}
                  {trimTime(offer.end_time)}
                </p>
                <p className="mt-1 text-zinc-700">{LOCATION_LABELS[offer.location]}</p>
                <p className="mt-1 text-zinc-700">
                  מציע:{" "}
                  {poster
                    ? formatUserDisplay({
                        full_name: poster.full_name,
                        role: poster.role,
                        shift: poster.shift,
                        has_hazmat: poster.has_hazmat,
                        has_license: poster.has_license,
                        has_crane: poster.has_crane,
                      })
                    : "לא ידוע"}
                </p>
                <span className="mt-2 inline-block rounded-full bg-zinc-200/90 px-2 py-1 text-xs text-zinc-800">
                  {STATUS_LABELS[offer.status]}
                </span>
              </article>
            );
          })
        )}
      </section>

      <BottomNav />
    </main>
  );
}
