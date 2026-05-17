"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ROLE_LABELS, SHIFT_COMMANDER_REQUEST_STATUS_LABELS, SHIFT_LABELS } from "@/types";
import type { Profile, Shift, ShiftCommanderRequestStatus } from "@/types";

type ShiftCommanderRequestSectionProps = {
  userId: string;
  profile: Profile | null;
  latestRequest: {
    id: string;
    shift: Shift;
    status: ShiftCommanderRequestStatus;
    rejection_reason: string | null;
  } | null;
};

async function notifyAdmins(requestId: string) {
  await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "shift_commander_request_submitted", requestId }),
  }).catch(() => {});
}

export function ShiftCommanderRequestSection({
  userId,
  profile,
  latestRequest,
}: ShiftCommanderRequestSectionProps) {
  const router = useRouter();
  const [requestShift, setRequestShift] = useState<Shift>(profile?.shift ?? "a");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (profile?.role === "shift_commander") {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">מפקד משמרת</h2>
        <p className="mt-1 text-sm text-amber-900">
          אתה רשום כ{ROLE_LABELS.shift_commander}
          {profile.shift ? ` · ${SHIFT_LABELS[profile.shift]}` : ""}.
        </p>
      </section>
    );
  }

  if (latestRequest?.status === "pending") {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">בקשה להיות מפקד משמרת</h2>
        <p className="mt-1 text-sm text-amber-900">
          הבקשה שלך ל{SHIFT_LABELS[latestRequest.shift]} בטיפול —{" "}
          {SHIFT_COMMANDER_REQUEST_STATUS_LABELS.pending}.
        </p>
      </section>
    );
  }

  const handleSubmitRequest = async () => {
    setError("");
    setIsSaving(true);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("shift_commander_requests")
      .insert({
        user_id: userId,
        shift: requestShift,
        status: "pending",
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (insertError || !data) {
      setError("שליחת הבקשה נכשלה. ייתכן שכבר יש בקשה ממתינה.");
      return;
    }

    await notifyAdmins(data.id);
    router.refresh();
  };

  return (
    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">בקשה להירשם כמפקד משמרת</h2>
      <p className="mt-1 text-sm text-zinc-700">
        תפקיד מפקד משמרת מאושר על ידי מנהל המערכת. שלח בקשה ומנהל יאשר או ידחה.
      </p>

      {latestRequest?.status === "rejected" ? (
        <p className="mt-2 text-sm text-red-800">
          הבקשה האחרונה נדחתה
          {latestRequest.rejection_reason
            ? `: ${latestRequest.rejection_reason}`
            : ""}
          . אפשר לשלוח בקשה חדשה.
        </p>
      ) : null}

      <fieldset className="mt-3 flex flex-col gap-2">
        <legend className="text-xs font-semibold text-zinc-800">משמרת מבוקשת</legend>
        {(["a", "b", "c"] as Shift[]).map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name="request_shift"
              value={option}
              checked={requestShift === option}
              onChange={() => setRequestShift(option)}
            />
            {SHIFT_LABELS[option]}
          </label>
        ))}
      </fieldset>

      {error ? <p className="mt-2 text-sm font-medium text-red-800">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmitRequest}
        disabled={isSaving}
        className="mt-3 h-10 w-full rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? "שולח..." : "שלח בקשה להיות מפקד משמרת"}
      </button>
    </section>
  );
}
