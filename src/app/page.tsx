"use client";

import { useMemo, useState } from "react";
import {
  Activity,
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
  name: string;
  description: string;
  language: string;
  updated: string;
  status: "Protected" | "Draft" | "Processing";
  icon: "lime" | "cyan" | "violet" | "amber";
};

const initialProjects: Project[] = [
  { name: "Nebula Hub", description: "Main loader & authentication", language: "Luau", updated: "2 min ago", status: "Protected", icon: "lime" },
  { name: "Admin Console", description: "Moderation & admin tools", language: "Lua", updated: "1 hour ago", status: "Protected", icon: "cyan" },
  { name: "Silent Aim", description: "Universal targeting module", language: "Luau", updated: "Yesterday", status: "Draft", icon: "violet" },
  { name: "UI Library", description: "Reusable interface components", language: "Lua", updated: "3 days ago", status: "Processing", icon: "amber" },
];

const chartPoints = "0,135 43,126 86,126 129,116 172,121 215,101 258,108 301,91 344,96 387,76 430,81 473,62 516,69 559,48 602,57 645,37";
const chartFill = `0,135 ${chartPoints} 645,158 0,158`;

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | "protect" | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newName, setNewName] = useState("");
  const [script, setScript] = useState("-- LuaLock protection preview\nlocal function greet(name)\n  return 'Hello, ' .. name\nend\n\nprint(greet('world'))");
  const [minify, setMinify] = useState(true);
  const [watermark, setWatermark] = useState(true);

  const filteredProjects = useMemo(() => projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function createProject() {
    const name = newName.trim() || "Untitled Script";
    const project: Project = { name, description: "New LuaLock project", language: "Luau", updated: "Just now", status: "Draft", icon: "lime" };
    setProjects((items) => [project, ...items]);
    setNewName("");
    setModal(null);
    showToast(`${name} created`);
  }

  function openProtect(project: Project) {
    setSelectedProject(project);
    setModal("protect");
  }

  function protectScript() {
    if (selectedProject) {
      setProjects((items) => items.map((item) => item.name === selectedProject.name ? { ...item, status: "Processing", updated: "Just now" } : item));
    }
    setModal(null);
    showToast("Protection job queued");
  }

  function copyProjectName(name: string) {
    void navigator.clipboard?.writeText(name);
    showToast(`${name} copied`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><LockKeyhole size={15} strokeWidth={2.5} /></span><span>LuaLock</span><span className="brand-pro">PRO</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch"><span className="workspace-avatar">L</span><span className="workspace-name">lualock</span><span className="online-dot" /><ChevronDown size={13} /></button>
        <nav className="side-nav">
          {[{ label: "Overview", icon: Gauge }, { label: "Projects", icon: FolderOpen, count: projects.length }, { label: "Deployments", icon: GitBranch }, { label: "Protection", icon: ShieldCheck }, { label: "API Keys", icon: KeyRound }].map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); if (label === "Projects") document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); }}><Icon size={15} strokeWidth={1.8} /><span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}</button>)}
        </nav>
        <div className="side-spacer" />
        <div className="usage-card"><div className="usage-title"><span>MONTHLY USAGE</span><span>68%</span></div><div className="usage-bar"><span /></div><div className="usage-note">6,842 / 10,000 requests</div><button onClick={() => showToast("Usage details opened")}>View usage <ArrowUpRight size={11} /></button></div>
        <button className="nav-item settings" onClick={() => { setActiveNav("Settings"); showToast("Settings is ready for your workspace"); }}><Settings size={15} strokeWidth={1.8} /><span>Settings</span></button>
        <div className="side-user"><span className="user-avatar">L</span><span><strong>lualock</strong><small>Owner</small></span><MoreHorizontal size={15} /></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={12} /><strong>{activeNav}</strong></div><div className="top-actions"><span className="status-live"><span /> All systems operational</span><button className="icon-button" onClick={() => showToast("Command palette coming soon")}><Terminal size={16} /></button><button className="help-button" onClick={() => showToast("LuaLock help center coming soon")}>?</button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><div className="eyebrow"><span className="pulse" /> LUA PROTECTION PLATFORM</div><h1>Welcome back, <em>lualock</em></h1><p>Protect, deploy, and manage your scripts with confidence.</p></div><button className="primary-button" onClick={() => setModal("new")}><Plus size={14} /> New project</button></section>
          <section className="stats-grid">
            <StatCard icon={Blocks} tone="purple" label="TOTAL PROJECTS" value={projects.length.toString()} note="+2 this month" trend />
            <StatCard icon={ShieldCheck} tone="green" label="PROTECTED BUILDS" value="1,284" note="+18.4% from last month" trend />
            <StatCard icon={Activity} tone="blue" label="API REQUESTS" value="6,842" note="+12.7% from last month" trend />
            <StatCard icon={Zap} tone="amber" label="AVG. PROTECTION TIME" value="1.8s" note="↓ 0.3s faster than last week" />
          </section>

          <section id="projects"><div className="section-heading"><div><h2>Your projects</h2><p>Manage and protect your Lua scripts.</p></div><button className="text-button" onClick={() => setQuery("")}>View all <ArrowUpRight size={12} /></button></div>
            <div className="projects-card"><div className="projects-toolbar"><div className="toolbar-title"><span className="green-line" /><strong>All projects</strong><span className="count-pill">{projects.length}</span></div><div className="toolbar-actions"><label className="search-box"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." /></label><button className="filter-button" onClick={() => showToast("Showing every project")}><Menu size={13} /> Filter</button></div></div>
              <div className="project-list">{filteredProjects.length ? filteredProjects.map((project) => <ProjectRow key={project.name} project={project} onProtect={() => openProtect(project)} onCopy={() => copyProjectName(project.name)} />) : <div className="empty-state">No projects match “{query}”.</div>}</div>
            </div>
          </section>

          <div className="bottom-grid"><section className="activity-card"><div className="card-heading"><div><h2>Protection activity</h2><p>Requests processed over the last 7 days.</p></div><button className="dots" onClick={() => showToast("Activity options opened")}><MoreHorizontal size={16} /></button></div><ActivityChart /></section><section className="quick-card"><div className="card-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away.</p></div><Sparkles className="sparkle" size={15} /></div><QuickAction icon={FileCode2} tone="purple" title="Protect a script" description="Obfuscate and secure your Lua code" onClick={() => setModal("protect")} /><QuickAction icon={Upload} tone="blue" title="Upload project" description="Import an existing project" onClick={() => showToast("Upload picker opened")} /><QuickAction icon={Code2} tone="green" title="API documentation" description="Integrate LuaLock into your workflow" onClick={() => showToast("API docs opened")} /></section></div>
        </div>
      </main>

      {toast ? <div className="toast"><Check size={16} /><span><strong>{toast}</strong><small>LuaLock workspace</small></span><X size={14} onClick={() => setToast(null)} /></div> : null}
      {modal === "new" ? <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="modal"><button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button><div className="modal-icon"><Plus size={18} /></div><h2>Create a new project</h2><p>Start a protected Lua script workspace.</p><label>Project name<input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createProject()} placeholder="e.g. My Script" /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" onClick={createProject}>Create project <ArrowUpRight size={13} /></button></div></div></div> : null}
      {modal === "protect" ? <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="editor-modal"><div className="editor-top"><span><span className="live-dot" />Protect script</span><button className="modal-close" onClick={() => setModal(null)}><X size={16} /></button></div><div className="editor-body"><div className="editor-head"><div><h2>{selectedProject?.name ?? "Quick protection"}</h2><p>Configure your mopsfl protection pipeline before processing.</p></div><span className="badge"><span className="badge-dot" />API ready</span></div><textarea value={script} onChange={(event) => setScript(event.target.value)} spellCheck={false} /><div className="editor-options"><span>Minify output</span><button aria-label="Toggle minify" className={`toggle ${minify ? "on" : ""}`} onClick={() => setMinify(!minify)} /><span>Watermark</span><button aria-label="Toggle watermark" className={`toggle ${watermark ? "on" : ""}`} onClick={() => setWatermark(!watermark)} /><span>Target: Luau</span></div><button className="protect-button" onClick={protectScript}><ShieldCheck size={14} /> Protect with LuaLock <ArrowUpRight size={14} /></button></div></div></div> : null}
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, note, trend = false }: { icon: typeof Gauge; tone: string; label: string; value: string; note: string; trend?: boolean }) { return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={16} /></span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{trend ? <span className="up">↗</span> : null}{note}</small></div></div>; }
function ProjectRow({ project, onProtect, onCopy }: { project: Project; onProtect: () => void; onCopy: () => void }) { const Icon = project.language === "Luau" ? FileCode2 : Code2; return <div className="project-row"><span className={`file-icon ${project.icon}`}><Icon size={16} /></span><div className="project-info"><strong>{project.name}</strong><span>{project.description}</span></div><span className="language">{project.language}</span><span className="updated">{project.updated}</span><span className={`badge ${project.status === "Draft" ? "badge-gray" : project.status === "Processing" ? "badge-amber" : ""}`}><span className="badge-dot" />{project.status}</span><button className="row-action" onClick={onProtect}><LockKeyhole size={12} /> Protect</button><button className="icon-button" aria-label={`Copy ${project.name}`} onClick={onCopy}><Copy size={13} /></button></div>; }
function ActivityChart() { return <div className="chart"><div className="y-labels"><span>2k</span><span>1.5k</span><span>1k</span><span>500</span><span>0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 645 158" preserveAspectRatio="none" aria-label="Protection activity chart"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b7f36d" stopOpacity=".2" /><stop offset="1" stopColor="#b7f36d" stopOpacity="0" /></linearGradient></defs><polygon points={chartFill} fill="url(#chart-fill)" /><polyline points={chartPoints} fill="none" stroke="#b7f36d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg><div className="x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div>; }
function QuickAction({ icon: Icon, tone, title, description, onClick }: { icon: typeof Gauge; tone: string; title: string; description: string; onClick: () => void }) { return <button onClick={onClick}><span className={`quick-icon ${tone}`}><Icon size={15} /></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={14} /></button>; }
