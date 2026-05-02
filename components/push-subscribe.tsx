"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const DISMISS_PERMISSION = "chilufi-push-dismiss-perm";
const DISMISS_IOS_HINT = "chilufi-push-dismiss-ios-hint";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  if (mq.matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PushSubscribe() {
  const [visible, setVisible] = useState(false);
  const [blockedHint, setBlockedHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session) {
        return;
      }

      if (typeof Notification === "undefined") {
        return;
      }

      if (Notification.permission === "granted") {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js");
          await reg.update();
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapid),
            });
          }
          // תמיד לסנכרן לשרת: אחרי טבלה חדשה, כשלי רשת קודמים, או מכשיר חדש — אחרת לא יגיעו Push.
          if (sub) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub.toJSON()),
            });
          }
        } catch {
          // silent — push is optional
        }
        return;
      }

      if (Notification.permission === "denied") {
        return;
      }

      if (isIos() && !isStandaloneDisplay()) {
        if (sessionStorage.getItem(DISMISS_IOS_HINT) === "1") {
          return;
        }
        setBlockedHint(true);
        setVisible(true);
        return;
      }

      if (sessionStorage.getItem(DISMISS_PERMISSION) === "1") {
        return;
      }

      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    if (blockedHint) {
      sessionStorage.setItem(DISMISS_IOS_HINT, "1");
    } else {
      sessionStorage.setItem(DISMISS_PERMISSION, "1");
    }
    setVisible(false);
    setBlockedHint(false);
  };

  const enable = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) return;

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.update();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (!res.ok) {
        setBusy(false);
        return;
      }

      setVisible(false);
      setBlockedHint(false);
    } catch {
      setBusy(false);
    }
    setBusy(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="התראות דחיפה"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg"
    >
      {blockedHint ? (
        <>
          <p className="text-sm font-semibold text-zinc-900">התראות באייפון</p>
          <p className="mt-1 text-xs text-zinc-600">
            בשביל התראות דחיפה יש להתקין את האתר למסך הבית: ב-Safari לחצו שיתוף → הוסף למסך הבית,
            ואז פתחו את האפליקציה משם והפעילו התראות.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-zinc-900">הפעלת התראות</p>
          <p className="mt-1 text-xs text-zinc-600">
            קבלו עדכונים על הצעות חדשות ומועמדויות — בנוסף לוואטסאפ.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="h-9 flex-1 rounded-lg bg-zinc-900 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy ? "מפעיל..." : "אפשר התראות"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700"
            >
              לא עכשיו
            </button>
          </div>
        </>
      )}

      {blockedHint ? (
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs text-zinc-500 underline"
        >
          סגור
        </button>
      ) : null}
    </div>
  );
}
