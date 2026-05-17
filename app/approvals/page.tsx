import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { formatUserDisplay } from "@/lib/format";
import { getPendingCommanderApprovals } from "@/lib/pending-commander-approvals";
import { getAuthUser, getCurrentProfile, getSupabase } from "@/lib/server-session";
import { LOCATION_LABELS, SHIFT_LABELS } from "@/types";
import type { Shift } from "@/types";

const trimTime = (value: string) => value.slice(0, 5);

const formatDate = (dateValue: string) => {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

export default async function ApprovalsPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/");
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "shift_commander") {
    redirect("/home");
  }

  const supabase = await getSupabase();
  const pendingApprovals = await getPendingCommanderApprovals(supabase, user.id);
  const userShift = profile.shift;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header>
        <h1 className="text-2xl font-bold text-zinc-950">אישורי חילוף</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {profile.full_name}
          {userShift ? ` · מפקד משמרת ${SHIFT_LABELS[userShift]}` : ""}
        </p>
      </header>

      {pendingApprovals.length > 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          יש לך {pendingApprovals.length} חילופים שממתינים לאישורך
        </p>
      ) : (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 shadow-sm">
          אין כרגע חילופים שממתינים לאישור שלך
        </div>
      )}

      <section className="flex flex-col gap-3">
        {pendingApprovals.map((approval) => (
          <Link
            key={approval.approvalId}
            href={`/offer/${approval.offerId}`}
            className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm transition hover:border-amber-400"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{formatDate(approval.shiftDate)}</p>
                <p className="text-sm font-medium text-zinc-700">
                  {trimTime(approval.startTime)} - {trimTime(approval.endTime)}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-zinc-800">
                {LOCATION_LABELS[approval.location]}
              </span>
            </div>
            <p className="text-sm text-zinc-800">
              {formatUserDisplay({
                full_name: approval.posterName,
                role: "fighter",
                shift: approval.posterShift,
                has_hazmat: false,
                has_license: false,
                has_crane: false,
              })}{" "}
              ↔{" "}
              {formatUserDisplay({
                full_name: approval.chosenName,
                role: "fighter",
                shift: approval.chosenShift,
                has_hazmat: false,
                has_license: false,
                has_crane: false,
              })}
            </p>
            <p className="text-xs font-semibold text-amber-900">לחץ לאשר או לדחות →</p>
          </Link>
        ))}
      </section>

      <Link href="/home" className="text-center text-sm font-medium text-blue-700">
        חזרה לבית
      </Link>

      <AppBottomNav />
    </main>
  );
}
