"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Location } from "@/types";

type NewOfferFormProps = {
  userId: string;
};

const LOCATION_OPTIONS: Array<{ value: Location; label: string }> = [
  { value: "petah_tikva", label: "פתח תקווה" },
  { value: "rosh_haayin", label: "ראש העין" },
  { value: "elad", label: "אלעד" },
];

export function NewOfferForm({ userId }: NewOfferFormProps) {
  const router = useRouter();
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState<Location>("petah_tikva");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = Boolean(shiftDate && startTime && endTime && location);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("יש למלא את כל השדות החובה");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("swap_offers")
      .insert({
        poster_id: userId,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        location,
        notes: notes.trim() || null,
        status: "open",
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (insertError || !data) {
      setError("יצירת ההצעה נכשלה, נסה שוב");
      return;
    }

    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new_offer",
        offerId: data.id,
      }),
    }).catch(() => {
      // Notification failures should not block the core action.
    });

    router.push(`/offer/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-zinc-900">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-900">תאריך המשמרת</span>
        <input
          type="date"
          value={shiftDate}
          onChange={(event) => setShiftDate(event.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="h-11 rounded-lg border border-zinc-400 bg-white px-3 text-sm text-zinc-900"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-zinc-900">שעת התחלה</span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="h-11 rounded-lg border border-zinc-400 bg-white px-3 text-sm text-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-zinc-900">שעת סיום</span>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="h-11 rounded-lg border border-zinc-400 bg-white px-3 text-sm text-zinc-900"
            required
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-900">מיקום</legend>
        <div className="flex flex-col gap-2">
          {LOCATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
            >
              <input
                type="radio"
                name="location"
                checked={location === option.value}
                onChange={() => setLocation(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-900">הערות (אופציונלי)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500"
          placeholder="פרטים נוספים שחשוב לדעת"
        />
      </label>

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || isSaving}
        className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isSaving ? "מפרסם..." : "פרסם הצעה"}
      </button>
    </form>
  );
}
