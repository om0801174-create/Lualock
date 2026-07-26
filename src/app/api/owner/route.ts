import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const OWNER_EMAIL = "om0801174@gmail.com";

async function requireOwner() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email.toLowerCase() !== OWNER_EMAIL) {
    return { error: NextResponse.json({ error: "Owner access required." }, { status: 403 }) };
  }
  return { supabase, user };
}

export async function GET() {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY in Vercel to enable the owner console." }, { status: 503 });

  const [{ data: users, error: usersError }, { count: projects }, { count: builds }, { count: deployments }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    access.supabase.from("projects").select("id", { count: "exact", head: true }),
    access.supabase.from("protection_jobs").select("id", { count: "exact", head: true }),
    access.supabase.from("deployments").select("id", { count: "exact", head: true }),
  ]);
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
  return NextResponse.json({ users: (users?.users ?? []).map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, confirmed: Boolean(user.email_confirmed_at), disabled: user.banned_until ? new Date(user.banned_until).getTime() > Date.now() : false })), totals: { users: users?.users.length ?? 0, projects: projects ?? 0, builds: builds ?? 0, deployments: deployments ?? 0 } });
}

export async function POST(request: Request) {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY in Vercel to enable owner account management." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const action = body?.action;
  if (!userId || !["confirm", "disable", "enable", "delete"].includes(action)) return NextResponse.json({ error: "Invalid owner action." }, { status: 400 });
  if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const updates = action === "confirm" ? { email_confirm: true } : action === "disable" ? { ban_duration: "876000h" } : { ban_duration: "none" };
  const { error } = await admin.auth.admin.updateUserById(userId, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
