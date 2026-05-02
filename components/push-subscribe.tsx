"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const DISMISS_PERMISSION = "chilufi-push-dismiss-perm";
const DISMISS_IOS_HINT = "chilufi-push-dismiss-ios-hint";
const DISMISS_NO_VAPID = "chilufi-push-dismiss-no-vapid";

type BannerVariant = "ios-hint" | "need-vapid" | "prompt" | null;

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
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<BannerVariant>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setOpen(false);
        setVariant(null);
        return;
      }

      if (typeof Notification === "undefined") {
        setOpen(false);
        setVariant(null);
        return;
      }

      // אייפון: ב-Safari רגיל אין Web Push — חייבים התקנה למסך הבית (גם בלי PushManager / לפני VAPID)
      if (isIos() && !isStandaloneDisplay()) {
        if (sessionStorage.getItem(DISMISS_IOS_HINT) === "1") {
          setOpen(false);
          setVariant(null);
          return;
        }
        setVariant("ios-hint");
        setOpen(true);
        return;
      }

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
      if (!vapid) {
        if (sessionStorage.getItem(DISMISS_NO_VAPID) === "1") {
          setOpen(false);
          setVariant(null);
          return;
        }
        setVariant("need-vapid");
        setOpen(true);
        return;
      }

      if (!("PushManager" in window)) {
        setOpen(false);
        setVariant(null);
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
          if (sub) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub.toJSON()),
            });
          }
        } catch {
          // Push אופציונלי
        }
        setOpen(false);
        setVariant(null);
        return;
      }

      if (Notification.permission === "denied") {
        setOpen(false);
        setVariant(null);
        return;
      }

      if (sessionStorage.getItem(DISMISS_PERMISSION) === "1") {
        setOpen(false);
        setVariant(null);
        return;
      }

      setVariant("prompt");
      setOpen(true);
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const dismiss = () => {
    if (variant === "ios-hint") {
      sessionStorage.setItem(DISMISS_IOS_HINT, "1");
    } else if (variant === "need-vapid") {
      sessionStorage.setItem(DISMISS_NO_VAPID, "1");
    } else if (variant === "prompt") {
      sessionStorage.setItem(DISMISS_PERMISSION, "1");
    }
    setOpen(false);
    setVariant(null);
  };

  const enable = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
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

      setOpen(false);
      setVariant(null);
    } catch {
      setBusy(false);
    }
    setBusy(false);
  };

  if (!open || !variant) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="התראות דחיפה"
      className="fixed inset-x-4 bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] z-[100] mx-auto max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
    >
      {variant === "ios-hint" ? (
        <>
          <p className="text-sm font-semibold text-zinc-900">התראות באייפון</p>
          <p className="mt-1 text-xs text-zinc-600">
            Web Push עובד באייפון רק כשהאתר מותקן כאפליקציה: ב-Safari לחצו שיתוף → הוסף למסך הבית,
            ואז פתחו מהאייקון החדש והפעילו התראות.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-zinc-500 underline"
          >
            סגור
          </button>
        </>
      ) : null}

      {variant === "need-vapid" ? (
        <>
          <p className="text-sm font-semibold text-zinc-900">התראות דחיפה לא מופעלות</p>
          <p className="mt-1 text-xs text-zinc-600">
            חסרים מפתחות VAPID בשרת (Vercel). הוסיפו את{" "}
            <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">VAPID_PRIVATE_KEY</code> ו־
            <code className="rounded bg-zinc-100 px-1">VAPID_SUBJECT</code> לפי{" "}
            <code className="rounded bg-zinc-100 px-1">.env.local.example</code>, ואז Deploy מחדש.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-zinc-500 underline"
          >
            סגור
          </button>
        </>
      ) : null}

      {variant === "prompt" ? (
        <>
          <p className="text-sm font-semibold text-zinc-900">הפעלת התראות</p>
          <p className="mt-1 text-xs text-zinc-600">
            קבלו עדכונים על הצעות ומועמדויות — בנוסף לוואטסאפ. אחרי לחיצה על הכפתור למטה אמור להופיע חלון
            מערכת לאישור התראות.
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
      ) : null}
    </div>
  );
}
