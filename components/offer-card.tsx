import Link from "next/link";
import { LOCATION_LABELS, STATUS_LABELS } from "@/types";
import { formatUserDisplay } from "@/lib/format";
import type { Location, OfferStatus, Shift, UserRole } from "@/types";

type OfferCardProps = {
  id: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  location: Location;
  posterName: string;
  posterRole: UserRole;
  posterShift: Shift | null;
  hasHazmat: boolean;
  hasLicense: boolean;
  hasCrane: boolean;
  applicantsCount: number;
  status: OfferStatus;
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
  posterShift,
  hasHazmat,
  hasLicense,
  hasCrane,
  applicantsCount,
  status,
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
          <p className="text-sm font-medium text-zinc-700">
            {trimTime(startTime)} - {trimTime(endTime)}
          </p>
        </div>
        <span className="rounded-full bg-zinc-200/90 px-2 py-1 text-xs text-zinc-800">
          {LOCATION_LABELS[location]}
        </span>
      </div>

      <div className="text-sm text-zinc-800">
        <p className="text-xs font-medium text-zinc-700">
          {formatUserDisplay({
            full_name: posterName,
            role: posterRole,
            shift: posterShift,
            has_hazmat: hasHazmat,
            has_license: hasLicense,
            has_crane: hasCrane,
          })}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs font-medium text-zinc-700">
        <span>{applicantsCount} הגישו מועמדות</span>
        <div className="flex items-center gap-2">
          {status === "pending_approval" ? (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900">
              {STATUS_LABELS.pending_approval}
            </span>
          ) : null}
          {isMine ? (
            <span className="rounded-full border border-blue-200/80 bg-blue-100 px-2 py-1 text-blue-900">
              ההצעה שלך
            </span>
          ) : null}
          {iApplied ? (
            <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-1 text-emerald-900">
              הגשת מועמדות
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
