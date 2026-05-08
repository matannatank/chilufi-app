import { ROLE_LABELS, SHIFT_LABELS } from "@/types";
import type { Profile } from "@/types";

export function formatUserDisplay(
  profile: Pick<
    Profile,
    "full_name" | "role" | "shift" | "has_hazmat" | "has_license" | "has_crane"
  >,
): string {
  const parts: string[] = [`${profile.full_name} - ${ROLE_LABELS[profile.role]}`];

  if (profile.shift) {
    parts.push(SHIFT_LABELS[profile.shift]);
  }

  const skills: string[] = [];
  if (profile.has_hazmat) skills.push("חומ״ס");
  if (profile.has_license) skills.push("רישיון");
  if (profile.has_crane) skills.push("מנופאי");

  if (skills.length > 0) {
    parts.push(skills.join(" | "));
  }

  return parts.join(" | ");
}
