import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MOPSFL_ENDPOINT = "https://goofyluauglifier.mopsfl.de/v1/api/uglify";
const ALLOWED_METHODS = new Set(["bytestrings", "bytestrings,transformnums,minify"]);
const DEFAULT_OPTIONS = { minify_output: true, ignore_bytestring: true, byte_string_type: "Decimal", byte_encrypt_all_constants: true, target_lua_version: "5.3" };

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const source = typeof body?.source === "string" ? body.source : "";
  const requestedMethod = typeof body?.method === "string" ? body.method.trim() : "";
  const method = ALLOWED_METHODS.has(requestedMethod) ? requestedMethod : "bytestrings";
  const options = body?.options && typeof body.options === "object" ? { ...DEFAULT_OPTIONS, ...body.options } : DEFAULT_OPTIONS;
  if (!projectId || !source.trim()) return NextResponse.json({ error: "Project and source code are required." }, { status: 400 });
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data: job, error: jobError } = await supabase.from("protection_jobs").insert({ project_id: projectId, owner_id: user.id, provider: "mopsfl", method, options, status: "processing" }).select("id").single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  try {
    const headers: HeadersInit = { "content-type": "text/plain", "origin": "https://mopsfl.de", "referer": "https://mopsfl.de/GoofyLuaUglifier/", "uglifier-options": JSON.stringify(options) };
    if (process.env.MOPSFL_API_KEY) headers["api-key"] = process.env.MOPSFL_API_KEY;
    const response = await fetch(`${MOPSFL_ENDPOINT}/${encodeURIComponent(method)}`, { method: "POST", headers, body: source, cache: "no-store" });
    const protectedCode = (await response.text()).trim();
    if (!response.ok) throw new Error(protectedCode || `mopsfl returned ${response.status}`);
    if (!protectedCode || protectedCode.startsWith("<!DOCTYPE html") || protectedCode.includes("Cannot POST")) throw new Error("mopsfl returned an invalid response. The public API may be unavailable or the method is not accepted.");
    const { error: updateError } = await supabase.from("projects").update({ source_code: source, protected_code: protectedCode, status: "Protected", protection_options: options }).eq("id", projectId).eq("owner_id", user.id);
    if (updateError) throw new Error(updateError.message);
    await supabase.from("protection_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ protectedCode, source, method, jobId: job.id });
  } catch (error) {
    await supabase.from("protection_jobs").update({ status: "failed", error_message: error instanceof Error ? error.message : "Protection failed" }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Protection failed" }, { status: 502 });
  }
}
