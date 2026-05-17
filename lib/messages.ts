import { LOCATION_LABELS } from "@/types";
import { SHIFT_LABELS } from "@/types";
import type { Location, Shift, UserRole } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

export type NotifyType =
  | "new_offer"
  | "new_application"
  | "chosen"
  | "cancelled_w_app"
  | "cancelled_after_match"
  | "cancelled_during_approval"
  | "commander_approval_needed"
  | "commander_approved"
  | "commander_rejected"
  | "auto_approved";

export type NotifyMessageOffer = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: Location;
  poster: {
    full_name: string;
    role: UserRole;
    shift?: Shift | null;
    has_hazmat: boolean;
    has_license: boolean;
  };
  chosen?: {
    full_name: string;
    shift: Shift | null;
  } | null;
  rejection_reason?: string | null;
};

function buildSkillsString(profile: NotifyMessageOffer["poster"]) {
  const parts: string[] = [];
  if (profile.has_hazmat) parts.push("חומ״ס");
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
  const posterShift = offer.poster.shift ? SHIFT_LABELS[offer.poster.shift] : "ללא משמרת";
  const chosenName = offer.chosen?.full_name ?? "מועמד";
  const chosenShift = offer.chosen?.shift ? SHIFT_LABELS[offer.chosen.shift] : "ללא משמרת";
  const rejectionReason = offer.rejection_reason?.trim() || "לא צוין";

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
    case "cancelled_during_approval":
      return `*הצעת חילוף בוטלה בזמן אישור מפקדים*\n${posterName} ביטל את ההצעה.\n${date}\n${location}`;
    case "commander_approval_needed": {
      const approvalsLink = `${APP_URL}/approvals`;
      return `🔔 *נדרש אישור חילוף משמרת*\n\nחילוף ממתין לאישורך:\n\n👤 ${posterName} (${posterShift}) ↔ ${chosenName} (${chosenShift})\n\n📅 ${date}\n\n🕖 ${hours}\n\n📍 ${location}\n\nלאישור: ${approvalsLink}\n\nפרטי הצעה: ${link}`;
    }
    case "commander_approved":
      return `✅ *מפקד אחד אישר את החילוף*\n\nהחילוף ממתין לאישור המפקד השני.\n\n📅 ${date}\n\n📍 ${location}\n\nמעקב:\n\n${link}`;
    case "commander_rejected":
      return `❌ *החילוף נדחה על ידי מפקד*\n\n📅 ${date}\n\n📍 ${location}\n\nסיבה: "${rejectionReason}"\n\nההצעה חוזרת לרשימת הפתוחים. ניתן לבחור מועמד אחר או לחכות לחדשים.\n\n${link}`;
    case "auto_approved":
      return `✅ *החילוף אושר אוטומטית*\n\nשני הצדדים מפקדי משמרת במשמרות שלהם.\n\n📅 ${date}\n\n📍 ${location}\n\nפרטים: ${link}`;
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
  const chosenName = offer.chosen?.full_name ?? "מועמד";
  const rejectionReason = offer.rejection_reason?.trim() || "לא צוין";
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
    case "cancelled_during_approval":
      return {
        title: "הצעה בוטלה בזמן אישור",
        body: `${posterName} ביטל הצעה ממתינה לאישור · ${date} · ${location}`,
        url,
      };
    case "commander_approval_needed":
      return {
        title: "חילוף ממתין לאישורך",
        body: `${posterName} ↔ ${chosenName} · ${date} · ${location} · לחץ לאשר`,
        url: `${APP_URL}/approvals`,
      };
    case "commander_approved":
      return {
        title: "אישור ראשון התקבל",
        body: `${date} · ${location} · ממתין לאישור נוסף`,
        url,
      };
    case "commander_rejected":
      return {
        title: "החילוף נדחה",
        body: `סיבה: ${rejectionReason}`,
        url,
      };
    case "auto_approved":
      return {
        title: "החילוף אושר אוטומטית",
        body: `${date} · ${location}`,
        url,
      };
    default:
      return { title: "חילופי", body: "עדכון חדש", url: APP_URL };
  }
}
