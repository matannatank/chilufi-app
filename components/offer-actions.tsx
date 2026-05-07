"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { SHIFT_LABELS } from "@/types";
import { formatUserDisplay } from "@/lib/format";
import type { ApplicationStatus, ApprovalStatus, OfferStatus, Shift, UserRole } from "@/types";

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

type CommanderApprovalView = {
  id: string;
  commanderId: string;
  shift: Shift;
  status: ApprovalStatus;
  rejectionReason: string | null;
};

type OfferActionsProps = {
  offerId: string;
  offerStatus: OfferStatus;
  posterId: string;
  chosenApplicantId: string | null;
  userId: string;
  pendingApplicants: PendingApplicant[];
  commanderApprovals: CommanderApprovalView[];
  userApplication: UserApplication | null;
};

async function notify(type: string, offerId: string, rejectionReason?: string) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, offerId, rejectionReason }),
  }).catch(() => {
    // Notification failures should not block the core action.
  });
}

export function OfferActions({
  offerId,
  offerStatus,
  posterId,
  chosenApplicantId,
  userId,
  pendingApplicants,
  commanderApprovals,
  userApplication,
}: OfferActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const isPoster = posterId === userId;
  const myPendingApproval = commanderApprovals.find(
    (approval) => approval.commanderId === userId && approval.status === "pending",
  );

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

    const { data: posterProfile } = await supabase
      .from("profiles")
      .select("id, role, shift")
      .eq("id", posterId)
      .maybeSingle();

    const { data: applicantProfile } = await supabase
      .from("profiles")
      .select("id, role, shift")
      .eq("id", applicantId)
      .maybeSingle();

    if (!posterProfile?.shift || !applicantProfile?.shift) {
      setIsSaving(false);
      setError("בחירת המועמד נכשלה");
      return;
    }

    const posterShift = posterProfile.shift as Shift;
    const applicantShift = applicantProfile.shift as Shift;

    const skipPosterApproval = posterProfile.role === "shift_commander";
    const skipApplicantApproval = applicantProfile.role === "shift_commander";

    const approvalRows = new Map<string, { commander_id: string; shift: Shift }>();

    if (!skipPosterApproval) {
      const { data: posterCommander } = await supabase
        .from("profiles")
        .select("id, shift")
        .eq("role", "shift_commander")
        .eq("shift", posterShift)
        .maybeSingle();

      if (!posterCommander) {
        setIsSaving(false);
        setError(`לא נמצא מפקד משמרת ל${SHIFT_LABELS[posterShift]}. פנה לאדמין.`);
        return;
      }
      approvalRows.set(posterCommander.id, {
        commander_id: posterCommander.id,
        shift: posterShift,
      });
    }

    if (!skipApplicantApproval) {
      const { data: applicantCommander } = await supabase
        .from("profiles")
        .select("id, shift")
        .eq("role", "shift_commander")
        .eq("shift", applicantShift)
        .maybeSingle();

      if (!applicantCommander) {
        setIsSaving(false);
        setError(`לא נמצא מפקד משמרת ל${SHIFT_LABELS[applicantShift]}. פנה לאדמין.`);
        return;
      }
      approvalRows.set(applicantCommander.id, {
        commander_id: applicantCommander.id,
        shift: applicantShift,
      });
    }

    const nextStatus = approvalRows.size === 0 ? "matched" : "pending_approval";

    const { error: offerError } = await supabase
      .from("swap_offers")
      .update({ status: nextStatus, chosen_applicant_id: applicantId })
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

    if (appError) {
      setIsSaving(false);
      setError("בחירת המועמד נכשלה");
      return;
    }

    await supabase.from("commander_approvals").delete().eq("offer_id", offerId);

    if (approvalRows.size > 0) {
      const { error: approvalsInsertError } = await supabase
        .from("commander_approvals")
        .insert(
          Array.from(approvalRows.values()).map((approval) => ({
            offer_id: offerId,
            commander_id: approval.commander_id,
            shift: approval.shift,
            status: "pending",
          })),
        );
      if (approvalsInsertError) {
        setIsSaving(false);
        setError("בחירת המועמד נכשלה");
        return;
      }
      await notify("commander_approval_needed", offerId);
    } else {
      await notify("chosen", offerId);
      await notify("auto_approved", offerId);
    }

    setIsSaving(false);
    router.refresh();
  };

  const approveAsCommander = async () => {
    if (!myPendingApproval || offerStatus !== "pending_approval") {
      return;
    }

    setError("");
    setIsSaving(true);

    const { error: approveError } = await supabase
      .from("commander_approvals")
      .update({ status: "approved", rejection_reason: null })
      .eq("id", myPendingApproval.id)
      .eq("status", "pending");

    if (approveError) {
      setIsSaving(false);
      setError("לא ניתן לאשר כרגע");
      return;
    }

    const { data: approvals } = await supabase
      .from("commander_approvals")
      .select("status")
      .eq("offer_id", offerId);

    const allApproved =
      (approvals ?? []).length > 0 && (approvals ?? []).every((approval) => approval.status === "approved");

    if (allApproved) {
      await supabase
        .from("swap_offers")
        .update({ status: "matched" })
        .eq("id", offerId)
        .eq("status", "pending_approval");
      await notify("chosen", offerId);
    } else {
      await notify("commander_approved", offerId);
    }

    setIsSaving(false);
    router.refresh();
  };

  const rejectAsCommander = async () => {
    if (!myPendingApproval || offerStatus !== "pending_approval") {
      return;
    }
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setError("יש להזין סיבת דחייה");
      return;
    }

    setError("");
    setIsSaving(true);

    const { error: rejectError } = await supabase
      .from("commander_approvals")
      .update({ status: "rejected", rejection_reason: trimmedReason })
      .eq("id", myPendingApproval.id)
      .eq("status", "pending");

    if (rejectError) {
      setIsSaving(false);
      setError("לא ניתן לדחות כרגע");
      return;
    }

    await supabase
      .from("swap_offers")
      .update({ status: "open" })
      .eq("id", offerId)
      .eq("status", "pending_approval");

    if (chosenApplicantId) {
      await supabase
        .from("applications")
        .update({ status: "pending" })
        .eq("offer_id", offerId)
        .eq("applicant_id", chosenApplicantId)
        .eq("status", "chosen");
    }

    await supabase
      .from("commander_approvals")
      .delete()
      .eq("offer_id", offerId)
      .neq("id", myPendingApproval.id);

    await notify("commander_rejected", offerId, trimmedReason);
    setIsSaving(false);
    setIsRejecting(false);
    setRejectionReason("");
    router.refresh();
  };

  const cancelOffer = async () => {
    if (!isPoster || offerStatus === "cancelled") {
      return;
    }

    setError("");
    setIsSaving(true);
    const notificationType =
      offerStatus === "matched" || offerStatus === "pending_approval"
        ? "cancelled_after_match"
        : "cancelled_w_app";

    const { error: updateError } = await supabase
      .from("swap_offers")
      .update({ status: "cancelled" })
      .eq("id", offerId);
    setIsSaving(false);

    if (updateError) {
      setError("ביטול ההצעה נכשל");
      return;
    }

    if (offerStatus === "pending_approval") {
      await notify("cancelled_during_approval", offerId);
      await supabase.from("commander_approvals").delete().eq("offer_id", offerId);
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
          {offerStatus === "pending_approval" ? (
            <p className="text-sm font-medium text-amber-800">ממתין לאישור מפקדים</p>
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

          {offerStatus === "pending_approval" && !myPendingApproval ? (
            <p className="text-sm font-medium text-amber-800">החילוף ממתין לאישור מפקדים</p>
          ) : null}

          {offerStatus === "cancelled" ? (
            <p className="text-sm font-medium text-zinc-700">ההצעה בוטלה</p>
          ) : null}
        </>
      )}

      {offerStatus === "pending_approval" && myPendingApproval ? (
        <div className="rounded-lg border border-amber-300 bg-amber-100/80 p-3 text-sm">
          <p className="font-semibold text-amber-950">ממתין לאישור שלך כמפקד משמרת</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={approveAsCommander}
              disabled={isSaving}
              className="h-9 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              אשר
            </button>
            <button
              type="button"
              onClick={() => setIsRejecting((current) => !current)}
              disabled={isSaving}
              className="h-9 rounded-md border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 disabled:opacity-60"
            >
              דחה
            </button>
          </div>
          {isRejecting ? (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={3}
                placeholder="יש להזין סיבת דחייה"
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
              />
              <button
                type="button"
                onClick={rejectAsCommander}
                disabled={isSaving}
                className="h-9 rounded-md bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                אשר דחייה
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
    </section>
  );
}
