import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const OWNER_EMAIL = "om0801174@gmail.com";
const OWNER_ACTIONS = ["confirm", "disable", "enable", "temp_ban", "delete"] as const;
type OwnerAction = (typeof OWNER_ACTIONS)[number];

async function requireOwner() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email.toLowerCase() !== OWNER_EMAIL) {
    return { error: NextResponse.json({ error: "Owner access required." }, { status: 403 }) };
  }
  return { supabase, user };
}

function getBanUntil(user: { banned_until?: string | null }) {
  return user.banned_until && new Date(user.banned_until).getTime() > Date.now() ? user.banned_until : null;
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
  return NextResponse.json({
    users: (users?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      confirmed: Boolean(user.email_confirmed_at),
      disabled: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000),
      banned_until: getBanUntil(user),
    })),
    totals: { users: users?.users.length ?? 0, projects: projects ?? 0, builds: builds ?? 0, deployments: deployments ?? 0 },
  });
}

export async function POST(request: Request) {
  const access = await requireOwner();
  if ("error" in access) return access.error;
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Add SUPABASE_SERVICE_ROLE_KEY in Vercel to enable owner account management." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const action = body?.action as OwnerAction;
  if (!userId || !OWNER_ACTIONS.includes(action)) return NextResponse.json({ error: "Invalid owner action." }, { status: 400 });
  if (userId === access.user.id && ["disable", "temp_ban", "delete"].includes(action)) return NextResponse.json({ error: "You cannot disable or delete the owner account from this console." }, { status: 400 });
  if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const duration = typeof body?.duration === "string" && ["1h", "24h", "7d", "30d"].includes(body.duration) ? body.duration : "24h";
  const updates = action === "confirm" ? { email_confirm: true } : action === "disable" ? { ban_duration: "876000h" } : action === "temp_ban" ? { ban_duration: duration } : { ban_duration: "none" };
  const { error } = await admin.auth.admin.updateUserById(userId, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action, duration: action === "temp_ban" ? duration : null });
}
