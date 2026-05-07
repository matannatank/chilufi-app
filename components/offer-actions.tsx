"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { formatUserDisplay } from "@/lib/format";
import type { ApplicationStatus, OfferStatus, Shift, UserRole } from "@/types";

type PendingApplicant = {
  applicationId: string;
  applicantId: string;
  fullName: string;
  role: UserRole;
  shift: Shift | null;
  hasHazmat: boolean;
  hasLicense: boolean;
  hasCrane: boolean;
};

type UserApplication = {
  id: string;
  status: ApplicationStatus;
};

type OfferActionsProps = {
  offerId: string;
  offerStatus: OfferStatus;
  posterId: string;
  userId: string;
  pendingApplicants: PendingApplicant[];
  userApplication: UserApplication | null;
};

async function notify(type: string, offerId: string) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, offerId }),
  }).catch(() => {
    // Notification failures should not block the core action.
  });
}

export function OfferActions({
  offerId,
  offerStatus,
  posterId,
  userId,
  pendingApplicants,
  userApplication,
}: OfferActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isPoster = posterId === userId;

  const applyToOffer = async () => {
    if (isPoster || offerStatus !== "open" || userApplication) {
      return;
    }

    setError("");
    setIsSaving(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("shift")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.shift) {
      setIsSaving(false);
      setError("עליך להגדיר משמרת בפרופיל לפני הגשת מועמדות");
      router.push("/profile");
      return;
    }

    const { error: insertError } = await supabase.from("applications").insert({
      offer_id: offerId,
      applicant_id: userId,
      status: "pending",
    });
    setIsSaving(false);

    if (insertError) {
      setError("לא ניתן להגיש מועמדות כרגע");
      return;
    }

    await notify("new_application", offerId);
    router.refresh();
  };

  const withdrawApplication = async () => {
    if (!userApplication || userApplication.status !== "pending") {
      return;
    }

    setError("");
    setIsSaving(true);
    const { error: updateError } = await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("id", userApplication.id);
    setIsSaving(false);

    if (updateError) {
      setError("לא ניתן לבטל מועמדות כרגע");
      return;
    }
    router.refresh();
  };

  const chooseApplicant = async (applicationId: string, applicantId: string) => {
    if (!isPoster || offerStatus !== "open") {
      return;
    }

    setError("");
    setIsSaving(true);

    const { error: offerError } = await supabase
      .from("swap_offers")
      .update({ status: "matched", chosen_applicant_id: applicantId })
      .eq("id", offerId)
      .eq("status", "open");

    if (offerError) {
      setIsSaving(false);
      setError("בחירת המועמד נכשלה");
      return;
    }

    const { error: appError } = await supabase
      .from("applications")
      .update({ status: "chosen" })
      .eq("id", applicationId)
      .eq("status", "pending");

    setIsSaving(false);

    if (appError) {
      setError("בחירת המועמד נכשלה");
      return;
    }

    await notify("chosen", offerId);
    router.refresh();
  };

  const cancelOffer = async () => {
    if (!isPoster || offerStatus === "cancelled") {
      return;
    }

    setError("");
    setIsSaving(true);
    const notificationType =
      offerStatus === "matched" ? "cancelled_after_match" : "cancelled_w_app";

    const { error: updateError } = await supabase
      .from("swap_offers")
      .update({ status: "cancelled" })
      .eq("id", offerId);
    setIsSaving(false);

    if (updateError) {
      setError("ביטול ההצעה נכשל");
      return;
    }

    await notify(notificationType, offerId);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-zinc-900 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-950">פעולות</h2>

      {isPoster ? (
        <>
          {offerStatus === "cancelled" ? (
            <p className="text-sm font-medium text-zinc-700">ההצעה בוטלה</p>
          ) : (
            <button
              type="button"
              onClick={cancelOffer}
              disabled={isSaving}
              className="h-10 rounded-lg border border-red-300 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              בטל הצעה
            </button>
          )}

          {offerStatus === "open" ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-sm font-medium">מועמדים ({pendingApplicants.length})</p>
              {pendingApplicants.length === 0 ? (
                <p className="text-sm font-medium text-zinc-700">עדיין אין מועמדים</p>
              ) : (
                pendingApplicants.map((applicant) => (
                  <div
                    key={applicant.applicationId}
                    className="rounded-lg border border-zinc-300 bg-zinc-100/80 p-3"
                  >
                    <p className="text-sm font-medium">{applicant.fullName}</p>
                    <p className="text-xs font-medium text-zinc-700">
                      {formatUserDisplay({
                        full_name: applicant.fullName,
                        role: applicant.role,
                        shift: applicant.shift,
                        has_hazmat: applicant.hasHazmat,
                        has_license: applicant.hasLicense,
                        has_crane: applicant.hasCrane,
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        chooseApplicant(
                          applicant.applicationId,
                          applicant.applicantId,
                        )
                      }
                      disabled={isSaving}
                      className="mt-2 h-9 rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      בחר
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {offerStatus === "open" && !userApplication ? (
            <button
              type="button"
              onClick={applyToOffer}
              disabled={isSaving}
              className="h-10 rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-60"
            >
              אני רוצה לקחת
            </button>
          ) : null}

          {offerStatus === "open" && userApplication?.status === "pending" ? (
            <>
              <p className="text-sm font-medium text-zinc-800">הגשת מועמדות, ממתין לבחירה</p>
              <button
                type="button"
                onClick={withdrawApplication}
                disabled={isSaving}
                className="h-10 rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-700 disabled:opacity-60"
              >
                בטל מועמדות
              </button>
            </>
          ) : null}

          {userApplication?.status === "chosen" ? (
            <div className="rounded-lg border border-emerald-200/90 bg-emerald-100/90 p-3 text-sm font-semibold text-emerald-900">
              נבחרת לחילוף הזה! תאם עם המפקד
            </div>
          ) : null}

          {offerStatus === "matched" && userApplication?.status !== "chosen" ? (
            <p className="text-sm font-medium text-zinc-700">ההצעה כבר נסגרה</p>
          ) : null}

          {offerStatus === "cancelled" ? (
            <p className="text-sm font-medium text-zinc-700">ההצעה בוטלה</p>
          ) : null}
        </>
      )}

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
    </section>
  );
}
