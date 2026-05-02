"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { Profile, UserRole } from "@/types";

type ProfileSetupFormProps = {
  userId: string;
  initialProfile: Profile | null;
  submitLabel?: string;
  redirectTo?: string;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "officer", label: "קצין" },
  { value: "team_commander", label: "מפקד צוות" },
  { value: "fighter", label: "לוחם" },
];

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
  const [hasHazmat, setHasHazmat] = useState(initialProfile?.has_hazmat ?? false);
  const [hasLicense, setHasLicense] = useState(
    initialProfile?.has_license ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    fullName.trim().length > 0 && isValidIsraeliPhone(phone) && role.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isValidIsraeliPhone(phone)) {
      setError("מספר טלפון חייב להתחיל ב-05 ולהכיל 10 ספרות");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName.trim(),
        phone,
        role,
        has_hazmat: hasHazmat,
        has_license: hasLicense,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">שם מלא</span>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-11 rounded-lg border border-zinc-400 bg-zinc-50 px-3 text-sm"
          placeholder="לדוגמה: מתן כחלון"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">מספר טלפון (לוואטסאפ)</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-lg border border-zinc-400 bg-zinc-50 px-3 text-sm"
          placeholder="05XXXXXXXX"
          maxLength={10}
          required
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">תפקיד</legend>
        <div className="flex flex-col gap-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm"
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

      <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm">
        סחומ
        <input
          type="checkbox"
          checked={hasHazmat}
          onChange={(event) => setHasHazmat(event.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm">
        רישיון נהיגה
        <input
          type="checkbox"
          checked={hasLicense}
          onChange={(event) => setHasLicense(event.target.checked)}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
