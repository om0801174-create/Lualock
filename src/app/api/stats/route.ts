import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const [{ count: projectCount }, { count: buildCount }, { count: deploymentCount }, { data: recentJobs }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("protection_jobs").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "completed"),
    supabase.from("deployments").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("protection_jobs").select("created_at,completed_at").eq("owner_id", user.id).eq("status", "completed").not("completed_at", "is", null).order("created_at", { ascending: false }).limit(100),
  ]);
  const durations = (recentJobs ?? []).map((job) => new Date(job.completed_at!).getTime() - new Date(job.created_at).getTime()).filter((duration) => Number.isFinite(duration) && duration >= 0);
  const averageDuration = durations.length ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length) : 0;
  return NextResponse.json({
    totalProjects: projectCount ?? 0,
    protectedBuilds: buildCount ?? 0,
    apiRequests: buildCount ?? 0,
    avgProtectionTime: averageDuration ? `${(averageDuration / 1000).toFixed(1)}s` : "—",
    deployments: deploymentCount ?? 0,
  });
}
