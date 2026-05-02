import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { NotifyMessageOffer, NotifyType } from "@/lib/messages";
import { buildPushContent } from "@/lib/messages";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

function vapidSubject(): string {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit) return explicit;
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app?.startsWith("https://")) return app;
  return "mailto:push@localhost";
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const subject = vapidSubject();
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isWebPushConfigured(): boolean {
  return Boolean(publicKey && privateKey && vapidSubject().length > 0);
}

export async function sendWebPushForOfferEvent(
  supabase: SupabaseClient,
  notifyType: NotifyType,
  offer: NotifyMessageOffer,
  recipientUserIds: string[],
): Promise<{
  skipped: boolean;
  reason?: string;
  attempted: number;
  sent: number;
  failed: number;
}> {
  if (!isWebPushConfigured() || !ensureVapid()) {
    return { skipped: true, reason: "web_push_not_configured", attempted: 0, sent: 0, failed: 0 };
  }

  const uniqueIds = [...new Set(recipientUserIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { skipped: false, attempted: 0, sent: 0, failed: 0 };
  }

  const { title, body, url } = buildPushContent(notifyType, offer);
  const payload = JSON.stringify({ title, body, url });

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", uniqueIds);

  if (error) {
    console.error("push_subscriptions load failed:", error);
    return {
      skipped: false,
      attempted: 0,
      sent: 0,
      failed: 0,
    };
  }

  const subscriptions = rows ?? [];
  let sent = 0;
  let failed = 0;
  const deadIds: string[] = [];

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
        { TTL: 86_400 },
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        deadIds.push(row.id);
      }
      console.error("Web push send failed:", err);
    }
  }

  if (deadIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadIds);
  }

  return {
    skipped: false,
    attempted: subscriptions.length,
    sent,
    failed,
  };
}
