import Link from "next/link";
import { LOCATION_LABELS, ROLE_LABELS } from "@/types";
import type { Location, UserRole } from "@/types";

type OfferCardProps = {
  id: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: Location;
  posterName: string;
  posterRole: UserRole;
  hasHazmat: boolean;
  hasLicense: boolean;
  applicantsCount: number;
  isMine: boolean;
  iApplied: boolean;
};

const formatDate = (dateValue: string) => {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const trimTime = (timeValue: string) => timeValue.slice(0, 5);

export function OfferCard({
  id,
  shiftDate,
  startTime,
  endTime,
  location,
  posterName,
  posterRole,
  hasHazmat,
  hasLicense,
  applicantsCount,
  isMine,
  iApplied,
}: OfferCardProps) {
  return (
    <Link
      href={`/offer/${id}`}
      className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm transition hover:border-zinc-400"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{formatDate(shiftDate)}</p>
          <p className="text-sm text-zinc-600">
            {trimTime(startTime)} - {trimTime(endTime)}
          </p>
        </div>
        <span className="rounded-full bg-zinc-200/90 px-2 py-1 text-xs text-zinc-800">
          {LOCATION_LABELS[location]}
        </span>
      </div>

      <div className="text-sm text-zinc-700">
        <p className="font-medium">{posterName}</p>
        <p className="text-xs text-zinc-600">
          {ROLE_LABELS[posterRole]} | {hasHazmat ? "סחומ" : "ללא סחומ"} |{" "}
          {hasLicense ? "רישיון ✓" : "ללא רישיון"}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>{applicantsCount} הגישו מועמדות</span>
        <div className="flex items-center gap-2">
          {isMine ? (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
              ההצעה שלך
            </span>
          ) : null}
          {iApplied ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
              הגשת מועמדות
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
