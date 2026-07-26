import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { obfuscateLua, normalizeNovaMethod } from "@/lib/nova-obfuscator";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const source = typeof body?.source === "string" ? body.source : "";
  const method = normalizeNovaMethod(body?.method);
  if (!projectId || !source.trim()) return NextResponse.json({ error: "Project and source code are required." }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const options = { engine: "Nova", version: "1.0", method };
  const { data: job, error: jobError } = await supabase.from("protection_jobs").insert({ project_id: projectId, owner_id: user.id, provider: "nova", method, options, status: "processing" }).select("id").single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  try {
    const { code: protectedCode } = obfuscateLua(source, method);
    const { error: updateError } = await supabase.from("projects").update({ source_code: source, protected_code: protectedCode, status: "Protected", protection_options: options }).eq("id", projectId).eq("owner_id", user.id);
    if (updateError) throw new Error(updateError.message);
    await supabase.from("protection_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ protectedCode, source, method, engine: "Nova", jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nova protection failed";
    await supabase.from("protection_jobs").update({ status: "failed", error_message: message }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
