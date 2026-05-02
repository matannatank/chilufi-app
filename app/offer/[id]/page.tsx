import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LOCATION_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/types";
import { OfferActions } from "@/components/offer-actions";
import type { ApplicationStatus, Location, OfferStatus, UserRole } from "@/types";

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
  profiles: { full_name: string; role: UserRole } | Array<{ full_name: string; role: UserRole }> | null;
};

type OfferApplicationRow = {
  id: string;
  applicant_id: string;
  status: ApplicationStatus;
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
      "id, shift_date, start_time, end_time, location, notes, status, poster_id, profiles!swap_offers_poster_id_fkey(full_name, role)",
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
      "id, applicant_id, status, profiles!applications_applicant_id_fkey(full_name, role, has_hazmat, has_license)",
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
        hasHazmat: applicant?.has_hazmat ?? false,
        hasLicense: applicant?.has_license ?? false,
      };
    });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6">
      <h1 className="text-2xl font-bold">פרטי הצעה</h1>
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
        <p className="text-sm text-zinc-700">תאריך: {offer.shift_date}</p>
        <p className="text-sm text-zinc-700">
          שעות: {trimTime(offer.start_time)} - {trimTime(offer.end_time)}
        </p>
        <p className="text-sm text-zinc-700">מיקום: {LOCATION_LABELS[offer.location]}</p>
        <p className="text-sm text-zinc-700">סטטוס: {STATUS_LABELS[offer.status]}</p>
        <p className="mt-2 text-sm font-medium text-zinc-800">
          מציע: {poster?.full_name ?? "לא ידוע"}
        </p>
        <p className="text-xs text-zinc-600">
          תפקיד: {poster?.role ? ROLE_LABELS[poster.role] : "לא ידוע"}
        </p>
        {offer.notes ? (
          <p className="mt-2 rounded-lg border border-zinc-200/80 bg-zinc-200/40 p-2 text-sm text-zinc-800">
            הערות: {offer.notes}
          </p>
        ) : null}
      </div>
      <OfferActions
        offerId={offer.id}
        offerStatus={offer.status}
        posterId={offer.poster_id}
        userId={user.id}
        pendingApplicants={pendingApplicants}
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
