"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  FolderOpen,
  Gauge,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Project = {
  id?: string;
  name: string;
  description: string;
  language: string;
  updated: string;
  status: "Protected" | "Draft" | "Processing";
  icon: "lime" | "cyan" | "violet" | "amber";
};

const chartPoints = "0,135 43,126 86,126 129,116 172,121 215,101 258,108 301,91 344,96 387,76 430,81 473,62 516,69 559,48 602,57 645,37";
const chartFill = `0,135 ${chartPoints} 645,158 0,158`;
const dashboardProjectTotal = 5;

async function fetchProjects(supabase: SupabaseClient, ownerId: string): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("id,name,description,language,status,updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description || "", language: item.language, updated: formatUpdated(item.updated_at), status: item.status, icon: "lime" as const }));
}

function formatUpdated(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function Home() {
  const [view, setView] = useState<"landing" | "auth" | "dashboard">("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [activeNav, setActiveNav] = useState("Overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "protect" | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newName, setNewName] = useState("");
  const [script, setScript] = useState("");
  const [minify, setMinify] = useState(true);
  const [watermark, setWatermark] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [userLabel, setUserLabel] = useState("new user");
  const [loading, setLoading] = useState(false);
  const [protectedCode, setProtectedCode] = useState("");
  const [protectedResultOpen, setProtectedResultOpen] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const filteredProjects = useMemo(() => projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted || !data.session?.user) return;
      setUserLabel(data.session.user.user_metadata?.display_name || data.session.user.email?.split("@")[0] || "new user");
      setView("dashboard");
      void fetchProjects(supabase, data.session.user.id).then(setProjects).catch((error: Error) => setToast(error.message));
    });
    return () => { mounted = false; };
  }, []);

  async function finishAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setView("dashboard"); showToast("Connect Supabase to enable accounts"); return; }
    setLoading(true);
    const result = authMode === "signup" ? await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { display_name: authName } } }) : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setLoading(false);
    if (result.error) { showToast(result.error.message); return; }
    const user = result.data.user;
    if (!user) { showToast("Check your email to confirm your account"); return; }
    setUserLabel(user.user_metadata?.display_name || user.email?.split("@")[0] || "new user");
    setView("dashboard");
    try { setProjects(await fetchProjects(supabase, user.id)); } catch (error) { showToast((error as Error).message); }
    showToast(authMode === "signup" ? "Workspace created" : "Signed in successfully");
  }

  async function createProject() {
    const name = newName.trim() || "Untitled Script";
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { showToast("Connect Supabase before creating projects"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Sign in to create projects"); return; }
    const { data, error } = await supabase.from("projects").insert({ owner_id: user.id, name, description: "New LuaLock project", language: "Luau", status: "Draft", source_code: "" }).select("id,name,description,language,status,updated_at").single();
    if (error) { showToast(error.message); return; }
    setProjects((items) => [{ id: data.id, name: data.name, description: data.description || "", language: data.language, updated: formatUpdated(data.updated_at), status: data.status, icon: "lime" }, ...items]);
    setNewName(""); setModal(null); showToast(`${name} created`);
  }

  async function handleScriptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setScript(await file.text());
    setSelectedProject(null);
    setModal("protect");
    event.target.value = "";
    showToast(`${file.name} loaded`);
  }

  function openApiDocs() {
    window.open("https://docs.mopsfl.de/", "_blank", "noopener,noreferrer");
  }

  async function protectScript() {
    setLoading(true);
    const response = await fetch("/api/protect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: selectedProject?.id, source: script, options: { minify_output: minify, protect_watermark: watermark, watermark: "LuaLock", target_lua_version: "Luau" } }) });
    const result = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { showToast(result.error || "Protection failed"); return; }
    setProtectedCode(result.protectedCode || result.code || result.output || "");
    setProtectedResultOpen(true);
    if (selectedProject) setProjects((items) => items.map((item) => item.id === selectedProject.id ? { ...item, status: "Protected", updated: "Just now" } : item));
    setModal(null); showToast("Script protected successfully");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setProjects([]); setView("landing"); showToast("Signed out");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setView("auth");
  }

  function openProtect(project?: Project) {
    setSelectedProject(project ?? null);
    setModal("protect");
  }

  function copyProjectName(name: string) {
    void navigator.clipboard?.writeText(name);
    showToast(`${name} copied`);
  }

  if (view === "landing") return <LandingPage onLogin={() => openAuth("login")} onSignup={() => openAuth("signup")} />;
  if (view === "auth") return <AuthPage mode={authMode} name={authName} email={authEmail} password={authPassword} onNameChange={setAuthName} onEmailChange={setAuthEmail} onPasswordChange={setAuthPassword} onSubmit={finishAuth} onModeChange={setAuthMode} onBack={() => setView("landing")} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><LockKeyhole size={15} strokeWidth={2.5} /></span><span>LuaLock</span><span className="brand-pro">PRO</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch"><span className="workspace-avatar">L</span><span className="workspace-name">{userLabel}</span><span className="online-dot" /><ChevronDown size={13} /></button>
        <nav className="side-nav">
          {[{ label: "Overview", icon: Gauge }, { label: "Projects", icon: FolderOpen, count: projects.length }, { label: "Deployments", icon: GitBranch }, { label: "Protection", icon: ShieldCheck }, { label: "API Keys", icon: KeyRound }].map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); if (label === "Projects") document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}><Icon size={15} strokeWidth={1.8} /><span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}</button>)}
        </nav>
        <div className="side-spacer" />
        <div className="usage-card"><div className="usage-title"><span>MONTHLY USAGE</span><span>68%</span></div><div className="usage-bar"><span /></div><div className="usage-note">6,842 / 10,000 requests</div><button onClick={() => showToast("Usage details opened")}>View usage <ArrowUpRight size={11} /></button></div>
        <button className="nav-item settings" onClick={() => { setActiveNav("Settings"); showToast("Settings is ready for your workspace"); }}><Settings size={15} strokeWidth={1.8} /><span>Settings</span></button>
        <button className="side-user" onClick={signOut}><span className="user-avatar">{userLabel.slice(0, 1).toUpperCase()}</span><span><strong>{userLabel}</strong><small>Sign out</small></span><MoreHorizontal size={15} /></button>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={12} /><strong>{activeNav}</strong></div><div className="top-actions"><span className="status-live"><span /> All systems operational</span><button className="icon-button" onClick={() => document.getElementById("script-upload")?.click()}><Terminal size={16} /></button><button className="help-button" onClick={openApiDocs}>?</button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><div className="eyebrow"><span className="pulse" /> LUA PROTECTION PLATFORM</div><h1>Welcome back, <em>{userLabel}</em></h1><p>Protect, deploy, and manage your scripts with confidence.</p></div><button className="primary-button" onClick={() => setModal("new")}><Plus size={14} /> New project</button></section>
          <section className="stats-grid"><StatCard icon={Blocks} tone="purple" label="TOTAL PROJECTS" value={dashboardProjectTotal.toString()} note="+2 this month" trend /><StatCard icon={ShieldCheck} tone="green" label="PROTECTED BUILDS" value="1,284" note="+18.4% from last month" trend /><StatCard icon={Activity} tone="blue" label="API REQUESTS" value="6,842" note="+12.7% from last month" trend /><StatCard icon={Zap} tone="amber" label="AVG. PROTECTION TIME" value="—" note="" /></section>
          <section id="projects"><div className="section-heading"><div><h2>Your projects</h2><p>Manage and protect your Lua scripts.</p></div><button className="text-button" onClick={() => setQuery("")}>View all <ArrowUpRight size={12} /></button></div><div className="projects-card"><div className="projects-toolbar"><div className="toolbar-title"><span className="green-line" /><strong>All projects</strong><span className="count-pill">{dashboardProjectTotal}</span></div><div className="toolbar-actions"><label className="search-box"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." /></label><div className="filter-wrap"><button className="filter-button" onClick={() => setShowProjectMenu((open) => !open)}><Menu size={13} /> Filter</button>{showProjectMenu ? <div className="filter-menu"><button onClick={() => { setProjects((items) => [...items].sort((a, b) => a.name.localeCompare(b.name))); setShowProjectMenu(false); }}>Name A–Z</button><button onClick={() => { setProjects((items) => [...items].sort((a, b) => a.status.localeCompare(b.status))); setShowProjectMenu(false); }}>Status</button><button onClick={() => { setProjects((items) => [...items].sort((a, b) => a.updated.localeCompare(b.updated))); setShowProjectMenu(false); }}>Recently updated</button></div> : null}</div></div></div><div className="project-list">{filteredProjects.length ? filteredProjects.map((project) => <ProjectRow key={project.id ?? project.name} project={project} onProtect={() => openProtect(project)} onCopy={() => copyProjectName(project.name)} />) : <div className="empty-state"><FolderOpen size={20} /><strong>{query ? `No projects match "${query}".` : "Your projects will appear here."}</strong><span>Create a project to start protecting your Lua scripts.</span><button className="secondary-button" onClick={() => setModal("new")}><Plus size={13} /> New project</button></div>}</div></div></section>
          <div className="bottom-grid"><section className="activity-card"><div className="card-heading"><div><h2>Protection activity</h2><p>Requests processed over the last 7 days.</p></div><button className="dots" onClick={() => showToast("Activity options opened")}><MoreHorizontal size={16} /></button></div><ActivityChart /></section><section className="quick-card"><div className="card-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away.</p></div><Sparkles className="sparkle" size={15} /></div><QuickAction icon={FileCode2} tone="purple" title="Protect a script" description="Obfuscate and secure your Lua code" onClick={() => openProtect()} /><QuickAction icon={Upload} tone="blue" title="Upload project" description="Import an existing project" onClick={() => document.getElementById("script-upload")?.click()} /><QuickAction icon={Code2} tone="green" title="API documentation" description="Integrate LuaLock into your workflow" onClick={openApiDocs} /></section></div>
        </div>
      </main>

      <input id="script-upload" type="file" accept=".lua,.luau,.txt" hidden onChange={handleScriptUpload} />
      {toast ? <div className="toast"><Check size={16} /><span><strong>{toast}</strong><small>LuaLock workspace</small></span><X size={14} onClick={() => setToast(null)} /></div> : null}
      {modal === "new" ? <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="modal"><button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button><div className="modal-icon"><Plus size={18} /></div><h2>Create a new project</h2><p>Start a protected Lua script workspace.</p><label>Project name<input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createProject()} placeholder="e.g. My Script" /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={createProject}>Create project <ArrowUpRight size={13} /></button></div></div></div> : null}
      {modal === "protect" ? <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="editor-modal"><div className="editor-top"><span><span className="live-dot" />Protect script</span><button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button></div><div className="editor-body"><div className="editor-head"><div><h2>{selectedProject?.name ?? "Quick protection"}</h2><p>Configure your mopsfl protection pipeline before processing.</p></div><span className="badge"><span className="badge-dot" />API ready</span></div><textarea value={script} onChange={(event) => setScript(event.target.value)} spellCheck={false} placeholder="Paste your Lua or Luau script here..." /><div className="editor-options"><span>Minify output</span><button aria-label="Toggle minify" className={`toggle ${minify ? "on" : ""}`} onClick={() => setMinify(!minify)} /><span>Watermark</span><button aria-label="Toggle watermark" className={`toggle ${watermark ? "on" : ""}`} onClick={() => setWatermark(!watermark)} /><span>Target: Luau</span></div><button className="protect-button" disabled={loading || !script.trim()} onClick={protectScript}><ShieldCheck size={14} /> {loading ? "Protecting..." : "Protect with LuaLock"} <ArrowUpRight size={14} /></button></div></div></div> : null}
      {protectedResultOpen ? <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProtectedResultOpen(false)}><div className="editor-modal result-modal"><div className="editor-top"><span><span className="live-dot" />Protected output</span><button className="modal-close" onClick={() => setProtectedResultOpen(false)}><X size={16} /></button></div><div className="editor-body"><div className="editor-head"><div><h2>Your protected script</h2><p>Copy the result or download it for your release.</p></div><span className="badge"><span className="badge-dot" />Complete</span></div><textarea readOnly value={protectedCode} /><div className="modal-actions"><button className="secondary-button" onClick={() => { void navigator.clipboard?.writeText(protectedCode); showToast("Protected output copied"); }}><Copy size={13} /> Copy output</button><button className="primary-button" onClick={() => { const blob = new Blob([protectedCode], { type: "text/plain" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "lualock-protected.lua"; link.click(); URL.revokeObjectURL(url); }}><ArrowUpRight size={13} /> Download .lua</button></div></div></div></div> : null}
    </div>
  );
}

function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <main className="landing-page jnkie-inspired-page">
      <nav className="jnkie-nav">
        <button className="jnkie-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="jnkie-brand-mark"><LockKeyhole size={16} strokeWidth={2.5} /></span>
          <span className="jnkie-brand-name"><strong>Lua</strong>Lock</span>
        </button>
        <div className="jnkie-nav-actions">
          <button className="jnkie-nav-link" onClick={() => window.open("https://docs.mopsfl.de/", "_blank")}>Docs</button>
          <button className="jnkie-nav-link" onClick={onLogin}>Login</button>
          <button className="jnkie-nav-cta" onClick={onSignup}>Get Started <ArrowRight size={14} /></button>
        </div>
      </nav>
      <section className="jnkie-hero">
        <div className="jnkie-orb jnkie-orb-left" />
        <div className="jnkie-orb jnkie-orb-right" />
        <div className="jnkie-badge"><span /> PRODUCTION-READY</div>
        <h1>Enterprise Script<br /><span>Protection Platform</span></h1>
        <p>Protect, distribute, and control your Lua and Luau scripts with confidence.</p>
        <div className="jnkie-hero-actions">
          <button className="jnkie-primary-button" onClick={onSignup}>Get started <ArrowRight size={16} /></button>
          <button className="jnkie-secondary-button" onClick={onLogin}>Sign In</button>
        </div>
        <div className="jnkie-proof-row">
          <span><Check size={13} /> No credit card</span>
          <span><Check size={13} /> Free to start</span>
          <span><Check size={13} /> 5 min setup</span>
        </div>
      </section>
    </main>
  );
}

function AuthPage({ mode, name, email, password, onNameChange, onEmailChange, onPasswordChange, onSubmit, onModeChange, onBack }: { mode: "login" | "signup"; name: string; email: string; password: string; onNameChange: (value: string) => void; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onModeChange: (mode: "login" | "signup") => void; onBack: () => void }) {
  return <main className="auth-page"><div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><nav className="auth-nav"><button className="brand auth-brand" onClick={onBack}><span className="brand-mark"><LockKeyhole size={15} /></span><span>LuaLock</span></button><button className="back-link" onClick={onBack}><ChevronRight size={14} className="back-arrow" /> Back to home</button></nav><div className="auth-layout"><div className="auth-rail"><div className="section-kicker">PRIVATE WORKSPACE</div><h1>{mode === "signup" ? "Your scripts,\nunder lock." : "Welcome\nback."}</h1><p>{mode === "signup" ? "Create a workspace for protected releases, deployments, and API access." : "Pick up where you left off and keep your release pipeline moving."}</p><div className="auth-rail-points"><span><ShieldCheck size={14} /> signed protection jobs</span><span><GitBranch size={14} /> versioned deployments</span><span><Zap size={14} /> fast API workflow</span></div></div><form className="auth-card" onSubmit={onSubmit}><div className="auth-card-head"><div className="modal-icon"><LockKeyhole size={17} /></div><div><h2>{mode === "signup" ? "Create your account" : "Log in to LuaLock"}</h2><p>{mode === "signup" ? "Start with a free workspace." : "Your dashboard is one step away."}</p></div></div>{mode === "signup" ? <label>Display name<input required value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. lualock" /></label> : null}<label>Email address<input required type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="At least 8 characters" /></label><button className="landing-cta auth-submit" type="submit">{mode === "signup" ? "Create workspace" : "Log in"} <ArrowRight size={15} /></button><div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to LuaLock?"}<button type="button" onClick={() => onModeChange(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Log in" : "Create an account"}</button></div><small className="auth-disclaimer">By continuing, you agree to use LuaLock to protect scripts you own or have permission to manage.</small></form></div></main>;
}

function StatCard({ icon: Icon, tone, label, value, note, trend = false }: { icon: typeof Gauge; tone: string; label: string; value: string; note: string; trend?: boolean }) { return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={16} /></span><div><span className="stat-label">{label}</span><strong>{value}</strong>{note ? <small>{trend ? <span className="up">↗</span> : null}{note}</small> : <small className="stat-note-empty">&nbsp;</small>}</div></div>; }
function ProjectRow({ project, onProtect, onCopy }: { project: Project; onProtect: () => void; onCopy: () => void }) { const Icon = project.language === "Luau" ? FileCode2 : Code2; return <div className="project-row"><span className={`file-icon ${project.icon}`}><Icon size={16} /></span><div className="project-info"><strong>{project.name}</strong><span>{project.description}</span></div><span className="language">{project.language}</span><span className="updated">{project.updated}</span><span className={`badge ${project.status === "Draft" ? "badge-gray" : project.status === "Processing" ? "badge-amber" : ""}`}><span className="badge-dot" />{project.status}</span><button className="row-action" onClick={onProtect}><LockKeyhole size={12} /> Protect</button><button className="icon-button" aria-label={`Copy ${project.name}`} onClick={onCopy}><Copy size={13} /></button></div>; }
function ActivityChart() { return <div className="chart"><div className="y-labels"><span>2k</span><span>1.5k</span><span>1k</span><span>500</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 645 158" preserveAspectRatio="none" aria-label="Protection activity chart"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b7f36d" stopOpacity=".2" /><stop offset="1" stopColor="#b7f36d" stopOpacity="0" /></linearGradient></defs><polygon points={chartFill} fill="url(#chart-fill)" /><polyline points={chartPoints} fill="none" stroke="#b7f36d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg><div className="x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div>; }
function QuickAction({ icon: Icon, tone, title, description, onClick }: { icon: typeof Gauge; tone: string; title: string; description: string; onClick: () => void }) { return <button onClick={onClick}><span className={`quick-icon ${tone}`}><Icon size={15} /></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={14} /></button>; }
