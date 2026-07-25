import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await auth();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const { data, error } = await supabase.from("projects").select("id,name,description,language,status,source_code,protected_code,protection_options,created_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await auth();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const sourceCode = typeof body?.sourceCode === "string" ? body.sourceCode : "";
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const { data, error } = await supabase.from("projects").insert({ owner_id: user.id, name, description, language: "Luau", source_code: sourceCode, status: "Draft" }).select("id,name,description,language,status,source_code,protected_code,protection_options,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await auth();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Project id is required." }, { status: 400 });
  const updates: Record<string, unknown> = {};
  for (const [input, column] of [["name", "name"], ["description", "description"], ["sourceCode", "source_code"], ["protectedCode", "protected_code"], ["status", "status"], ["protectionOptions", "protection_options"]] as const) if (input in (body ?? {})) updates[column] = body[input];
  const { data, error } = await supabase.from("projects").update(updates).eq("id", id).eq("owner_id", user.id).select("id,name,description,language,status,source_code,protected_code,protection_options,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await auth();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Project id is required." }, { status: 400 });
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
