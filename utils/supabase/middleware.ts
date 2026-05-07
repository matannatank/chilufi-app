import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
  );
}

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/auth");
  const isLoginRoute = path === "/";
  const isProfileSetupRoute = path === "/profile/setup";

  if (!user && !isLoginRoute && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone, shift")
    .eq("id", user.id)
    .maybeSingle();

  const hasPhone = Boolean(profile?.phone?.trim());
  const hasShift = Boolean(profile?.shift);

  if ((!hasPhone || !hasShift) && !isProfileSetupRoute && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile/setup";
    return NextResponse.redirect(url);
  }

  if (hasPhone && hasShift && (isLoginRoute || isProfileSetupRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};
