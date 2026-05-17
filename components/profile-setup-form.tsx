"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ROLE_LABELS, SELF_ASSIGNABLE_ROLES, SHIFT_LABELS } from "@/types";
import type { Profile, Shift, UserRole } from "@/types";

type ProfileSetupFormProps = {
  userId: string;
  initialProfile: Profile | null;
  submitLabel?: string;
  redirectTo?: string;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = SELF_ASSIGNABLE_ROLES.map(
  (role) => ({ value: role, label: ROLE_LABELS[role] }),
);

const SHIFT_OPTIONS: Shift[] = ["a", "b", "c"];

const isValidIsraeliPhone = (value: string) => /^05\d{8}$/.test(value);

export function ProfileSetupForm({
  userId,
  initialProfile,
  submitLabel = "המשך",
  redirectTo = "/home",
}: ProfileSetupFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile?.full_name ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [role, setRole] = useState<UserRole>(initialProfile?.role ?? "fighter");
  const [shift, setShift] = useState<Shift | null>(initialProfile?.shift ?? null);
  const [hasHazmat, setHasHazmat] = useState(initialProfile?.has_hazmat ?? false);
  const [hasLicense, setHasLicense] = useState(
    initialProfile?.has_license ?? false,
  );
  const [hasCrane, setHasCrane] = useState(initialProfile?.has_crane ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    fullName.trim().length > 0 && isValidIsraeliPhone(phone) && role.length > 0 && shift !== null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isValidIsraeliPhone(phone)) {
      setError("מספר טלפון חייב להתחיל ב-05 ולהכיל 10 ספרות");
      return;
    }

    if (!shift) {
      setError("חובה לבחור משמרת");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const roleToSave =
      initialProfile?.role === "shift_commander" ? "shift_commander" : role;

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName.trim(),
        phone,
        role: roleToSave,
        shift,
        has_hazmat: hasHazmat,
        has_license: hasLicense,
        has_crane: hasCrane,
      },
      { onConflict: "id" },
    );

    setIsSaving(false);

    if (upsertError) {
      setError("שמירת הפרופיל נכשלה, נסה שוב");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-zinc-900">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-900">שם מלא</span>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-11 rounded-lg border border-zinc-400 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500"
          placeholder="לדוגמה: מתן כחלון"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-900">מספר טלפון (לוואטסאפ)</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-lg border border-zinc-400 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500"
          placeholder="05XXXXXXXX"
          maxLength={10}
          required
        />
      </label>

      {initialProfile?.role === "shift_commander" ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          תפקידך: {ROLE_LABELS.shift_commander}
          {initialProfile.shift ? ` · ${SHIFT_LABELS[initialProfile.shift]}` : ""}. שינוי תפקיד
          מתבצע דרך מנהל המערכת.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-zinc-900">תפקיד</legend>
          <div className="flex flex-col gap-2">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-900">משמרת</legend>
        <div className="flex flex-col gap-2">
          {SHIFT_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
            >
              <input
                type="radio"
                name="shift"
                value={option}
                checked={shift === option}
                onChange={() => setShift(option)}
              />
              {SHIFT_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-900">הכשרות</legend>
        <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900">
          חומ״ס
          <input
            type="checkbox"
            checked={hasHazmat}
            onChange={(event) => setHasHazmat(event.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900">
          רישיון נהיגה
          <input
            type="checkbox"
            checked={hasLicense}
            onChange={(event) => setHasLicense(event.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900">
          מנופאי
          <input
            type="checkbox"
            checked={hasCrane}
            onChange={(event) => setHasCrane(event.target.checked)}
          />
        </label>
      </fieldset>

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || isSaving}
        className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {isSaving ? "שומר..." : submitLabel}
      </button>
    </form>
  );
}
