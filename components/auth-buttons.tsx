"use client";

import { createClient } from "@/utils/supabase/client";

export function AuthButtons() {
  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="h-12 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
      >
        התחבר עם Google
      </button>
      <button
        type="button"
        disabled
        className="h-12 rounded-xl border border-zinc-400 bg-zinc-50 px-4 text-sm font-semibold text-zinc-600"
      >
        התחבר עם Apple (בקרוב)
      </button>
    </div>
  );
}
