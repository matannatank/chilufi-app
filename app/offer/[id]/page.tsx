import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { formatUserDisplay } from "@/lib/format";
import { APPROVAL_STATUS_LABELS, LOCATION_LABELS, ROLE_LABELS, SHIFT_LABELS, STATUS_LABELS } from "@/types";
import { OfferActions } from "@/components/offer-actions";
import type { ApplicationStatus, ApprovalStatus, Location, OfferStatus, Shift, UserRole } from "@/types";

type OfferDetailsPageProps = {
  params: Promise<{ id: string }>;
};

type OfferDetailsRow = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  notes: string | null;
  status: OfferStatus;
  poster_id: string;
  chosen_applicant_id: string | null;
  target_shift: Shift | null;
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

type OfferApplicationRow = {
  id: string;
  applicant_id: string;
  status: ApplicationStatus;
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

type CommanderApprovalRow = {
  id: string;
  commander_id: string;
  shift: Shift;
  status: ApprovalStatus;
  rejection_reason: string | null;
  updated_at: string;
  profiles: { full_name: string } | Array<{ full_name: string }> | null;
};

const trimTime = (timeValue: string) => timeValue.slice(0, 5);

export default async function OfferDetailsPage({ params }: OfferDetailsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: offerRaw } = await supabase
    .from("swap_offers")
    .select(
      "id, shift_date, start_time, end_time, location, notes, status, poster_id, chosen_applicant_id, target_shift, profiles!swap_offers_poster_id_fkey(full_name, role, shift, has_hazmat, has_license, has_crane)",
    )
    .eq("id", id)
    .maybeSingle();

  const offer = offerRaw as OfferDetailsRow | null;

  if (!offer) {
    notFound();
  }

  const poster = Array.isArray(offer.profiles) ? offer.profiles[0] : offer.profiles;

  const { data: applicationsRaw } = await supabase
    .from("applications")
    .select(
      "id, applicant_id, status, profiles!applications_applicant_id_fkey(full_name, role, shift, has_hazmat, has_license, has_crane)",
    )
    .eq("offer_id", offer.id);

  const applications = (applicationsRaw ?? []) as OfferApplicationRow[];
  const userApplication =
    applications.find((application) => application.applicant_id === user.id) ?? null;
  const pendingApplicants = applications
    .filter((application) => application.status === "pending")
    .map((application) => {
      const applicant = Array.isArray(application.profiles)
        ? application.profiles[0]
        : application.profiles;

      return {
        applicationId: application.id,
        applicantId: application.applicant_id,
        fullName: applicant?.full_name ?? "לא ידוע",
        role: applicant?.role ?? "fighter",
        shift: applicant?.shift ?? null,
        hasHazmat: applicant?.has_hazmat ?? false,
        hasLicense: applicant?.has_license ?? false,
        hasCrane: applicant?.has_crane ?? false,
      };
    });

  const { data: approvalsRaw } = await supabase
    .from("commander_approvals")
    .select("id, commander_id, shift, status, rejection_reason, updated_at, profiles!commander_approvals_commander_id_fkey(full_name)")
    .eq("offer_id", offer.id)
    .order("created_at", { ascending: true });

  const commanderApprovals = (approvalsRaw ?? []) as CommanderApprovalRow[];

  const { data: latestRejectedApprovalRaw } = await supabase
    .from("commander_approvals")
    .select("id, commander_id, shift, status, rejection_reason, updated_at, profiles!commander_approvals_commander_id_fkey(full_name)")
    .eq("offer_id", offer.id)
    .eq("status", "rejected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestRejectedApproval = latestRejectedApprovalRaw as CommanderApprovalRow | null;
  const canSeeRejectedReason =
    user.id === offer.poster_id || (offer.chosen_applicant_id !== null && user.id === offer.chosen_applicant_id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <h1 className="text-2xl font-bold text-zinc-950">פרטי הצעה</h1>
      {latestRejectedApproval?.rejection_reason && canSeeRejectedReason ? (
        <section className="rounded-xl border border-amber-300 bg-amber-100/80 p-4 text-sm text-amber-950">
          <p className="font-semibold">
            ⚠️ החילוף הקודם נדחה על ידי {ROLE_LABELS.shift_commander}{" "}
            {SHIFT_LABELS[latestRejectedApproval.shift]}
          </p>
          <p className="mt-1">סיבה: &quot;{latestRejectedApproval.rejection_reason}&quot;</p>
        </section>
      ) : null}
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
        <p className="text-sm font-medium text-zinc-800">תאריך: {offer.shift_date}</p>
        <p className="text-sm font-medium text-zinc-800">
          שעות: {trimTime(offer.start_time)} - {trimTime(offer.end_time)}
        </p>
        <p className="text-sm font-medium text-zinc-800">מיקום: {LOCATION_LABELS[offer.location]}</p>
        <p className="text-sm font-medium text-zinc-800">סטטוס: {STATUS_LABELS[offer.status]}</p>
        <p className="mt-2 text-xs font-medium text-zinc-700">
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
        {offer.notes ? (
          <p className="mt-2 rounded-lg border border-zinc-200/80 bg-zinc-200/40 p-2 text-sm text-zinc-800">
            הערות: {offer.notes}
          </p>
        ) : null}
      </div>
      {offer.status === "pending_approval" ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-zinc-900 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-950">ממתין לאישור מפקדים:</h2>
          <div className="mt-2 flex flex-col gap-2">
            {commanderApprovals.length > 0 ? (
              commanderApprovals.map((approval) => {
                const commander = Array.isArray(approval.profiles)
                  ? approval.profiles[0]
                  : approval.profiles;
                return (
                  <article
                    key={approval.id}
                    className="rounded-lg border border-zinc-300 bg-white p-3 text-sm"
                  >
                    <p className="font-medium">
                      {ROLE_LABELS.shift_commander} {SHIFT_LABELS[approval.shift]} ({commander?.full_name ?? "לא ידוע"})
                    </p>
                    <p className="mt-1 text-zinc-700">סטטוס: {APPROVAL_STATUS_LABELS[approval.status]}</p>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-zinc-700">אין אישורים פעילים כרגע</p>
            )}
          </div>
        </section>
      ) : null}
      <OfferActions
        offerId={offer.id}
        offerStatus={offer.status}
        posterId={offer.poster_id}
        chosenApplicantId={offer.chosen_applicant_id}
        userId={user.id}
        pendingApplicants={pendingApplicants}
        commanderApprovals={commanderApprovals.map((approval) => ({
          id: approval.id,
          commanderId: approval.commander_id,
          shift: approval.shift,
          status: approval.status,
          rejectionReason: approval.rejection_reason,
        }))}
        userApplication={
          userApplication
            ? { id: userApplication.id, status: userApplication.status }
            : null
        }
      />
      <Link href="/home" className="text-sm font-medium text-blue-800 hover:text-blue-900">
        חזרה לבית
      </Link>
    </main>
  );
}
