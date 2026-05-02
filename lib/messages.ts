import { LOCATION_LABELS } from "@/types";
import type { Location, UserRole } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

export type NotifyType =
  | "new_offer"
  | "new_application"
  | "chosen"
  | "cancelled_w_app"
  | "cancelled_after_match";

export type NotifyMessageOffer = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  poster: {
    full_name: string;
    role: UserRole;
    has_hazmat: boolean;
    has_license: boolean;
  };
};

function buildSkillsString(profile: NotifyMessageOffer["poster"]) {
  const parts: string[] = [];
  if (profile.has_hazmat) parts.push('סחומ');
  if (profile.has_license) parts.push("רישיון");
  return parts.length > 0 ? ` | ${parts.join(" | ")}` : "";
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function buildMessage(type: NotifyType, offer: NotifyMessageOffer): string {
  const date = formatDate(offer.shift_date);
  const hours = `${offer.start_time.slice(0, 5)} - ${offer.end_time.slice(0, 5)}`;
  const location = LOCATION_LABELS[offer.location];
  const posterName = offer.poster.full_name;
  const skills = buildSkillsString(offer.poster);
  const link = `${APP_URL}/offer/${offer.id}`;

  switch (type) {
    case "new_offer":
      return `*בקשת חילוף משמרת חדשה*\n${posterName}${skills}\n${location}\n${date}\n${hours}\nלצפייה: ${link}`;
    case "new_application":
      return `*יש מועמד חדש להצעה שלך*\n${date}\n${location}\nצפה בהצעה: ${link}`;
    case "chosen":
      return `*נבחרת לחילוף!*\n${posterName} בחר בך למשמרת.\n${date}\n${hours}\n${location}\nפרטים: ${link}`;
    case "cancelled_w_app":
      return `*הצעת חילוף בוטלה*\n${posterName} ביטל את ההצעה שאליה הגשת מועמדות.\n${date}\n${location}`;
    case "cancelled_after_match":
      return `*הצעת חילוף בוטלה*\n${posterName} ביטל את ההצעה אליה נבחרת.\n${date}\n${location}`;
    default:
      return "עדכון מאפליקציית חילופי";
  }
}

export function buildPushContent(
  type: NotifyType,
  offer: NotifyMessageOffer,
): { title: string; body: string; url: string } {
  const date = formatDate(offer.shift_date);
  const hours = `${offer.start_time.slice(0, 5)} - ${offer.end_time.slice(0, 5)}`;
  const location = LOCATION_LABELS[offer.location];
  const posterName = offer.poster.full_name;
  const skills = buildSkillsString(offer.poster);
  const url = `${APP_URL}/offer/${offer.id}`;

  switch (type) {
    case "new_offer":
      return {
        title: "בקשת חילוף חדשה",
        body: `${posterName}${skills} · ${location} · ${date} ${hours}`,
        url,
      };
    case "new_application":
      return {
        title: "מועמד חדש להצעה שלך",
        body: `${date} · ${location}`,
        url,
      };
    case "chosen":
      return {
        title: "נבחרת לחילוף",
        body: `${posterName} · ${date} ${hours} · ${location}`,
        url,
      };
    case "cancelled_w_app":
      return {
        title: "הצעה בוטלה",
        body: `${posterName} ביטל את ההצעה · ${date} · ${location}`,
        url,
      };
    case "cancelled_after_match":
      return {
        title: "הצעה בוטלה",
        body: `${posterName} ביטל את ההצעה · ${date} · ${location}`,
        url,
      };
    default:
      return { title: "חילופי", body: "עדכון חדש", url: APP_URL };
  }
}
