import { AppBottomNav } from "@/components/app-bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { LOCATION_LABELS, SHIFT_LABELS, STATUS_LABELS } from "@/types";
import type { ApplicationStatus, Location, OfferStatus, Shift } from "@/types";
import { getPersonalStats } from "@/lib/personal-stats";
import { getAuthUser, getSupabase } from "@/lib/server-session";
import Link from "next/link";
import { redirect } from "next/navigation";

type MyOffer = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  status: OfferStatus;
  created_at: string;
  chosen_applicant_id: string | null;
  chosen_applicant_profile: { full_name: string } | Array<{ full_name: string }> | null;
};

type MyApplication = {
  id: string;
  created_at: string;
  status: ApplicationStatus;
  swap_offers:
    | {
        id: string;
        shift_date: string;
        start_time: string;
        end_time: string;
        location: Location;
        status: OfferStatus;
        poster_profile: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
      }
    | Array<{
        id: string;
        shift_date: string;
        start_time: string;
        end_time: string;
        location: Location;
        status: OfferStatus;
        poster_profile: { full_name: string; shift: Shift | null } | Array<{ full_name: string; shift: Shift | null }> | null;
      }>
    | null;
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "ממתין",
  chosen: "נבחרת",
  withdrawn: "משכת מועמדות",
};

const trimTime = (value: string) => value.slice(0, 5);

function offerStatusBadgeClass(status: OfferStatus): string {
  if (status === "open") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  if (status === "pending_approval") return "border-amber-300 bg-amber-100 text-amber-900";
  if (status === "matched") return "border-blue-300 bg-blue-100 text-blue-900";
  return "border-zinc-300 bg-zinc-200 text-zinc-800";
}

function applicationStatusBadgeClass(status: ApplicationStatus): string {
  if (status === "pending") return "border-amber-300 bg-amber-100 text-amber-900";
  if (status === "chosen") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  return "border-zinc-300 bg-zinc-200 text-zinc-800";
}

export default async function MyRequestsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  const supabase = await getSupabase();

  const [{ data: offersRaw }, { data: applicationsRaw }, stats] = await Promise.all([
    supabase
      .from("swap_offers")
      .select(
        "id, shift_date, start_time, end_time, location, status, created_at, chosen_applicant_id, chosen_applicant_profile:profiles!swap_offers_chosen_applicant_id_fkey(full_name)",
      )
      .eq("poster_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select(
        "id, created_at, status, swap_offers!applications_offer_id_fkey(id, shift_date, start_time, end_time, location, status, poster_profile:profiles!swap_offers_poster_id_fkey(full_name, shift))",
      )
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false }),
    getPersonalStats(user.id),
  ]);

  const offers = (offersRaw ?? []) as MyOffer[];
  const applications = (applicationsRaw ?? []) as MyApplication[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-950">הבקשות שלי</h1>
        <LogoutButton />
      </header>

      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">הסטטיסטיקה שלך</h2>
        <div className="mt-2 space-y-1 text-sm text-zinc-800">
          <p>חילופים שהשלמת השנה: {stats.yearlyCompletedSwaps}</p>
          <p>מועמדויות שהגשת השנה: {stats.yearlySubmittedApplications}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-zinc-900">ההצעות שלי</h2>
        {offers.length === 0 ? (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 shadow-sm">
            אין לך הצעות כרגע
          </div>
        ) : (
          offers.map((offer) => {
            const chosenApplicant = Array.isArray(offer.chosen_applicant_profile)
              ? offer.chosen_applicant_profile[0]
              : offer.chosen_applicant_profile;

            return (
              <Link
                key={offer.id}
                href={`/offer/${offer.id}`}
                className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm shadow-sm transition hover:border-zinc-400"
              >
                <p className="font-semibold text-zinc-900">
                  {offer.shift_date} | {trimTime(offer.start_time)} - {trimTime(offer.end_time)}
                </p>
                <p className="mt-1 text-zinc-700">{LOCATION_LABELS[offer.location]}</p>
                {offer.chosen_applicant_id && chosenApplicant ? (
                  <p className="mt-1 text-zinc-700">נבחר: {chosenApplicant.full_name}</p>
                ) : null}
                <span
                  className={`mt-2 inline-block rounded-full border px-2 py-1 text-xs ${offerStatusBadgeClass(offer.status)}`}
                >
                  {STATUS_LABELS[offer.status]}
                </span>
              </Link>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-zinc-900">המועמדויות שלי</h2>
        {applications.length === 0 ? (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 shadow-sm">
            אין לך מועמדויות כרגע
          </div>
        ) : (
          applications.map((application) => {
            const offer = Array.isArray(application.swap_offers)
              ? application.swap_offers[0]
              : application.swap_offers;
            if (!offer) {
              return null;
            }

            const poster = Array.isArray(offer.poster_profile)
              ? offer.poster_profile[0]
              : offer.poster_profile;

            return (
              <Link
                key={application.id}
                href={`/offer/${offer.id}`}
                className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm shadow-sm transition hover:border-zinc-400"
              >
                <p className="font-semibold text-zinc-900">
                  {offer.shift_date} | {trimTime(offer.start_time)} - {trimTime(offer.end_time)}
                </p>
                <p className="mt-1 text-zinc-700">{LOCATION_LABELS[offer.location]}</p>
                <p className="mt-1 text-zinc-700">
                  מציע: {poster?.full_name ?? "לא ידוע"} | {poster?.shift ? SHIFT_LABELS[poster.shift] : "ללא משמרת"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded-full border px-2 py-1 text-xs ${applicationStatusBadgeClass(application.status)}`}
                  >
                    מועמדות: {APPLICATION_STATUS_LABELS[application.status]}
                  </span>
                  <span
                    className={`inline-block rounded-full border px-2 py-1 text-xs ${offerStatusBadgeClass(offer.status)}`}
                  >
                    הצעה: {STATUS_LABELS[offer.status]}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
