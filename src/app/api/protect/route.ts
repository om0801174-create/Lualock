import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MOPSFL_NEW_SCRIPT_ENDPOINT = "https://api.luaobfuscator.com/v1/obfuscator/newscript";
const MOPSFL_OBFUSCATE_ENDPOINT = "https://api.luaobfuscator.com/v1/obfuscator/obfuscate";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const source = typeof body?.source === "string" ? body.source : "";
  if (!projectId || !source.trim()) return NextResponse.json({ error: "Project and source code are required." }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data: job, error: jobError } = await supabase.from("protection_jobs").insert({ project_id: projectId, owner_id: user.id, provider: "mopsfl", method: "MinifyAll", options: { MinifyAll: true }, status: "processing" }).select("id").single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  try {
    const apiKey = process.env.MOPSFL_API_KEY;
    if (!apiKey) throw new Error("MOPSFL_API_KEY is not configured on the server.");
    const authHeaders = { "content-type": "application/json", apikey: apiKey };
    const sessionResponse = await fetch(MOPSFL_NEW_SCRIPT_ENDPOINT, { method: "POST", headers: authHeaders, body: source, cache: "no-store" });
    const sessionData = await sessionResponse.json().catch(() => null);
    if (!sessionResponse.ok || !sessionData?.sessionId) throw new Error(sessionData?.message || `Mopsfl session request failed (${sessionResponse.status}).`);
    const obfuscateResponse = await fetch(MOPSFL_OBFUSCATE_ENDPOINT, { method: "POST", headers: { ...authHeaders, sessionId: sessionData.sessionId }, body: JSON.stringify({ MinifyAll: true }), cache: "no-store" });
    const result = await obfuscateResponse.json().catch(() => null);
    if (!obfuscateResponse.ok || !result?.code) throw new Error(result?.message || `Mopsfl obfuscation failed (${obfuscateResponse.status}).`);
    const protectedCode = String(result.code);
    const options = { MinifyAll: true };
    const { error: updateError } = await supabase.from("projects").update({ source_code: source, protected_code: protectedCode, status: "Protected", protection_options: options }).eq("id", projectId).eq("owner_id", user.id);
    if (updateError) throw new Error(updateError.message);
    await supabase.from("protection_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ protectedCode, source, method: "MinifyAll", jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Protection failed";
    await supabase.from("protection_jobs").update({ status: "failed", error_message: message }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
