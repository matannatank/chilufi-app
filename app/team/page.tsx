import { AppBottomNav } from "@/components/app-bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { formatUserDisplay } from "@/lib/format";
import type { Shift, UserRole } from "@/types";
import { ROLE_LABELS, SHIFT_LABELS } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

type TeamProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  shift: Shift | null;
  has_hazmat: boolean;
  has_license: boolean;
  has_crane: boolean;
};

const SHIFT_SECTIONS: Array<{ key: Shift | "none"; label: string }> = [
  { key: "a", label: SHIFT_LABELS.a },
  { key: "b", label: SHIFT_LABELS.b },
  { key: "c", label: SHIFT_LABELS.c },
  { key: "none", label: "ללא משמרת" },
];

const ROLE_SECTION_ORDER: UserRole[] = [
  "officer",
  "team_commander",
  "shift_commander",
  "fighter",
];

function sortByName(a: TeamProfile, b: TeamProfile) {
  return a.full_name.localeCompare(b.full_name, "he");
}

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profilesRaw } = await supabase
    .from("profiles")
    .select("id, full_name, role, shift, has_hazmat, has_license, has_crane")
    .order("shift", { ascending: true })
    .order("full_name", { ascending: true });

  const profiles = (profilesRaw ?? []) as TeamProfile[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-100 p-6 text-zinc-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-950">צוות</h1>
        <LogoutButton />
      </header>

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 shadow-sm">
          אין עובדים במערכת
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          {SHIFT_SECTIONS.map((section) => {
            const sectionProfiles = profiles
              .filter((profile) =>
                section.key === "none" ? profile.shift === null : profile.shift === section.key,
              )
              .sort(sortByName);

            return (
              <article key={section.key} className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">{section.label}</h2>
                <div className="mt-3 flex flex-col gap-4">
                  {sectionProfiles.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-100 p-3 text-sm text-zinc-600">
                      אין עובדים במשמרת זו
                    </p>
                  ) : (
                    ROLE_SECTION_ORDER.map((role) => {
                      const roleProfiles = sectionProfiles
                        .filter((profile) => profile.role === role)
                        .sort(sortByName);

                      if (roleProfiles.length === 0) {
                        return null;
                      }

                      return (
                        <div key={role} className="flex flex-col gap-2">
                          <h3 className="text-xs font-semibold text-zinc-500">{ROLE_LABELS[role]}</h3>
                          {roleProfiles.map((profile) => (
                            <div
                              key={profile.id}
                              className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
                            >
                              <p className="text-sm font-bold text-zinc-900">{profile.full_name}</p>
                              <p className="mt-1 text-xs text-zinc-700">
                                {formatUserDisplay({
                                  full_name: profile.full_name,
                                  role: profile.role,
                                  shift: null,
                                  has_hazmat: profile.has_hazmat,
                                  has_license: profile.has_license,
                                  has_crane: profile.has_crane,
                                }).replace(`${profile.full_name} - `, "")}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <AppBottomNav />
    </main>
  );
}
