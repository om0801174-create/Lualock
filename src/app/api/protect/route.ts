import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MOPSFL_ENDPOINT = "https://goofyluauglifier.mopsfl.de/v1/api/uglify";

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const source = typeof body?.source === "string" ? body.source : "";
  const method = typeof body?.method === "string" && body.method.trim() ? body.method.trim() : "bytestrings,transformnums,minify";
  const options = body?.options && typeof body.options === "object" ? body.options : {};
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;
  if (!source.trim()) return NextResponse.json({ error: "Script source is required." }, { status: 400 });

  if (projectId) {
    const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const headers: HeadersInit = {
    "content-type": "text/plain",
    "uglifier-options": JSON.stringify(options),
  };
  if (process.env.MOPSFL_API_KEY) headers["api-key"] = process.env.MOPSFL_API_KEY;

  const response = await fetch(`${MOPSFL_ENDPOINT}/${encodeURIComponent(method)}`, {
    method: "POST",
    headers,
    body: source,
    cache: "no-store",
  });
  const protectedCode = await response.text();
  if (!response.ok) return NextResponse.json({ error: protectedCode || "mopsfl protection failed." }, { status: response.status });

  if (projectId) {
    const { error: updateError } = await supabase.from("projects").update({ source_code: source, protected_code: protectedCode, protection_options: options, status: "Protected" }).eq("id", projectId).eq("owner_id", user.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: jobError } = await supabase.from("protection_jobs").insert({ project_id: projectId, owner_id: user.id, provider: "mopsfl", method, options, status: "completed", completed_at: new Date().toISOString() });
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  return NextResponse.json({ protectedCode, method, userId: user.id });
}
