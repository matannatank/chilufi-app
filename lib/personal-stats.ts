import { createClient } from "@/utils/supabase/server";

export async function getPersonalStats(userId: string) {
  const supabase = await createClient();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const since = oneYearAgo.toISOString();

  const [{ count: postedMatchedCount }, { count: chosenMatchedCount }, { count: submittedApplicationsCount }] =
    await Promise.all([
      supabase
        .from("swap_offers")
        .select("id", { count: "exact", head: true })
        .eq("poster_id", userId)
        .eq("status", "matched")
        .gte("updated_at", since),
      supabase
        .from("swap_offers")
        .select("id", { count: "exact", head: true })
        .eq("chosen_applicant_id", userId)
        .eq("status", "matched")
        .gte("updated_at", since),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("applicant_id", userId)
        .gte("created_at", since),
    ]);

  return {
    yearlyCompletedSwaps: (postedMatchedCount ?? 0) + (chosenMatchedCount ?? 0),
    yearlySubmittedApplications: submittedApplicationsCount ?? 0,
  };
}
