import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const [{ count: projectCount }, { count: buildCount }, { count: deploymentCount }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("protection_jobs").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "completed"),
    supabase.from("deployments").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);
  return NextResponse.json({ totalProjects: projectCount ?? 0, protectedBuilds: buildCount ?? 0, deployments: deploymentCount ?? 0 });
}
