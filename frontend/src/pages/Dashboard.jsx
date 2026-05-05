import {
    ArrowRight,
    Bell,
    BriefcaseBusiness,
    CalendarClock,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock3,
    FileText,
    FolderOpen,
    LayoutTemplate,
    MoreVertical,
    PenLine,
    Plus,
    Send,
    Sparkles,
    Target,
    Upload,
    UserRound,
} from "lucide-react";
import { Link } from "react-router";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";

const DASHBOARD_STATS = [
    { label: "To apply", value: "6", icon: CalendarClock },
    { label: "In progress", value: "3", icon: Clock3 },
    { label: "Applied", value: "4", icon: Send },
    { label: "Interview", value: "1", icon: UserRound },
];

const RESUME_HEALTH = [
    { label: "Content", value: 82 },
    { label: "Structure", value: 76 },
    { label: "Keywords", value: 74 },
    { label: "Format", value: 80 },
];

const RECENT_DRAFTS = [
    {
        title: "Marketing Manager Cover Letter",
        type: "CL",
        role: "Marketing Manager",
        updated: "May 15",
    },
    {
        title: "Product Manager Resume",
        type: "RES",
        role: "Product Manager",
        updated: "May 14",
    },
    {
        title: "Data Analyst Cover Letter",
        type: "CL",
        role: "Data Analyst",
        updated: "May 12",
    },
    {
        title: "Software Engineer Resume",
        type: "RES",
        role: "Software Engineer",
        updated: "May 10",
    },
];

const APPLICATION_TARGETS = [
    {
        company: "Acme Corp",
        role: "Product Manager",
        status: "In progress",
        updated: "May 15",
        accent: "bg-zinc-950 text-white",
    },
    {
        company: "Northwind",
        role: "Marketing Manager",
        status: "To apply",
        updated: "May 14",
        accent: "bg-[#4f6121] text-white",
    },
    {
        company: "Horizon Labs",
        role: "Data Analyst",
        status: "Applied",
        updated: "May 12",
        accent: "bg-[#0f4f78] text-white",
    },
    {
        company: "Brightside",
        role: "UX Researcher",
        status: "Interview",
        updated: "May 10",
        accent: "bg-[#1d2630] text-white",
    },
];

const TEMPLATE_PICKS = [
    {
        title: "Modern Professional",
        description: "Clean structure for any industry.",
        tone: "bg-[#f7f6ef]",
    },
    {
        title: "Executive",
        description: "Confident layout for senior roles.",
        tone: "bg-[#eef2f5]",
    },
    {
        title: "Creative Minimal",
        description: "Subtle edge for portfolio work.",
        tone: "bg-[#f4f0e7]",
    },
];

const PROFILE_ITEMS = [
    { label: "Basics", complete: true },
    { label: "Experience", complete: true },
    { label: "Skills", complete: true },
    { label: "Education", complete: true },
    { label: "Links", complete: false },
];

function getDisplayName(user) {
    const fallbackName = user?.email?.split("@")[0] || "Job seeker";
    return (user?.displayName || fallbackName).trim();
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function ProgressRing({ value, label, size = "size-28" }) {
    const ringStyle = {
        background: `conic-gradient(#5b661c ${value * 3.6}deg, #e7e2d6 0deg)`,
    };

    return (
        <div className={`${size} rounded-full p-2`} style={ringStyle}>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#fffdf8] text-center">
                <span className="text-2xl font-semibold tracking-tight text-zinc-950">{value}</span>
                <span className="text-xs text-zinc-600">{label}</span>
            </div>
        </div>
    );
}

function Panel({ children, className = "" }) {
    return (
        <section className={`rounded-lg border border-[#ded8c9] bg-[#fffdf8] shadow-[0_18px_55px_rgba(32,31,22,0.06)] ${className}`}>
            {children}
        </section>
    );
}

function SectionHeader({ title, action, to }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h2>
            {action && (
                <Link
                    to={to}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#4d5818] transition hover:text-zinc-950"
                >
                    {action}
                    <ChevronRight className="size-3.5" strokeWidth={1.8} />
                </Link>
            )}
        </div>
    );
}

function MiniDocumentPreview({ tone }) {
    return (
        <div className={`h-22 w-16 shrink-0 rounded-md border border-[#d7d0c1] p-2 ${tone}`}>
            <div className="mb-2 h-1.5 w-8 rounded-full bg-zinc-900/70" />
            <div className="space-y-1">
                <div className="h-1 w-10 rounded-full bg-zinc-400/70" />
                <div className="h-1 w-8 rounded-full bg-zinc-300/80" />
                <div className="h-1 w-11 rounded-full bg-zinc-300/80" />
            </div>
            <div className="mt-3 space-y-1">
                <div className="h-1 w-7 rounded-full bg-[#6b741f]/70" />
                <div className="h-1 w-10 rounded-full bg-zinc-300/80" />
                <div className="h-1 w-9 rounded-full bg-zinc-300/80" />
            </div>
        </div>
    );
}

function HealthBar({ label, value }) {
    return (
        <div className="grid grid-cols-[76px_1fr_34px] items-center gap-3 text-sm">
            <span className="text-zinc-700">{label}</span>
            <div className="h-2 rounded-full bg-[#ece7dc]">
                <div className="h-full rounded-full bg-[#5b661c]" style={{ width: `${value}%` }} />
            </div>
            <span className="text-right text-xs font-medium text-zinc-700">{value}%</span>
        </div>
    );
}

function StatusBadge({ status }) {
    const className = {
        "In progress": "bg-[#f4dfb7] text-[#73521d]",
        "To apply": "bg-[#e9eaec] text-zinc-700",
        Applied: "bg-[#e5ecd8] text-[#46591d]",
        Interview: "bg-[#dce6ef] text-[#27485c]",
    }[status] || "bg-zinc-100 text-zinc-700";

    return (
        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${className}`}>
            {status}
        </span>
    );
}

export default function Dashboard() {
    const [user, loading] = useAuthState(auth);
    const displayName = getDisplayName(user);
    const firstName = displayName.split(" ")[0] || "Job seeker";
    const initials = getInitials(displayName);
    const isGuest = !loading && !user;

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-6 pb-24 text-sm text-muted-foreground">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="bg-[linear-gradient(180deg,#fbfaf5_0%,#ffffff_42%,#f7f5ec_100%)]">
            <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#e3dece] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                            Good morning, {firstName}
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                            {isGuest
                                ? "Build your first tailored application packet and save your workspace when you are ready."
                                : "Your application workspace is ready for the next role."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="inline-flex size-10 items-center justify-center rounded-md border border-[#d9d2c2] bg-white text-zinc-700 shadow-sm transition hover:border-[#a8aa78] hover:text-zinc-950"
                            aria-label="Notifications"
                        >
                            <Bell className="size-4" strokeWidth={1.8} />
                        </button>
                        <Link
                            to={user ? "/profile" : "/login"}
                            className="inline-flex items-center gap-2 rounded-md border border-[#d9d2c2] bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-[#a8aa78]"
                        >
                            <span className="flex size-7 items-center justify-center rounded-full bg-[#65711f] text-xs font-semibold text-white">
                                {initials || "CP"}
                            </span>
                            <span className="hidden sm:inline">{user ? displayName : "Guest"}</span>
                            <ChevronRight className="size-4 text-zinc-500" strokeWidth={1.8} />
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_326px]">
                    <div className="space-y-6">
                        <Panel className="overflow-hidden">
                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:p-6">
                                <div className="flex flex-col justify-between gap-5">
                                    <div>
                                        <p className="text-sm font-medium text-[#59631c]">Today&apos;s focus</p>
                                        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-zinc-950">
                                            Create a sharper letter for your next application.
                                        </h2>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button
                                            asChild
                                            className="h-16 justify-between rounded-lg bg-[#5d681c] px-5 text-base text-white hover:bg-[#4d5818]"
                                        >
                                            <Link to={user ? "/generator" : "/tailor"}>
                                                <span className="inline-flex items-center gap-3">
                                                    <Plus className="size-5" strokeWidth={1.8} />
                                                    {user ? "Generate resume" : "Tailor resume"}
                                                </span>
                                                <ArrowRight className="size-5" strokeWidth={1.8} />
                                            </Link>
                                        </Button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="h-16 flex-col rounded-lg border-[#d9d2c2] bg-white text-[#493b1e] hover:bg-[#f6f2e8]"
                                            >
                                                <Link to="/tailor">
                                                    <Upload className="size-4" strokeWidth={1.8} />
                                                    Tailor PDF
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="h-16 flex-col rounded-lg border-[#d9d2c2] bg-white text-[#493b1e] hover:bg-[#f6f2e8]"
                                            >
                                                <Link to="/templates">
                                                    <LayoutTemplate className="size-4" strokeWidth={1.8} />
                                                    Templates
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-[#e6e0d2] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                                    <SectionHeader title="Resume health" action="Improve" to="/tailor" />
                                    <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
                                        <ProgressRing value={78} label="Good" />
                                        <div className="min-w-0 flex-1 space-y-3">
                                            {RESUME_HEALTH.map((item) => (
                                                <HealthBar key={item.label} label={item.label} value={item.value} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel className="p-5 lg:p-6">
                            <div className="grid gap-5 md:grid-cols-[190px_1fr] md:items-center">
                                <div className="flex items-center gap-4">
                                    <ProgressRing value={65} label="On track" size="size-20" />
                                    <div>
                                        <h2 className="text-base font-semibold text-zinc-950">Application readiness</h2>
                                        <p className="mt-1 text-sm text-zinc-600">4 strong packets, 3 need polish</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {DASHBOARD_STATS.map((stat) => {
                                        const Icon = stat.icon;

                                        return (
                                            <div key={stat.label} className="border-l border-[#e5dfd0] pl-4 first:border-l-0 first:pl-0">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="size-4 text-zinc-600" strokeWidth={1.7} />
                                                    <span className="text-2xl font-semibold text-zinc-950">{stat.value}</span>
                                                </div>
                                                <p className="mt-1 text-sm text-zinc-600">{stat.label}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Panel>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Panel className="overflow-hidden">
                                <div className="p-5">
                                    <SectionHeader title="Recent drafts" action="View all" to="/storage" />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_64px_120px_72px_28px] border-y border-[#e5dfd0] bg-[#faf8f1] px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    <span>Name</span>
                                    <span>Type</span>
                                    <span>Target role</span>
                                    <span>Updated</span>
                                    <span />
                                </div>
                                <div>
                                    {RECENT_DRAFTS.map((draft) => (
                                        <div
                                            key={draft.title}
                                            className="grid grid-cols-[minmax(0,1fr)_64px_120px_72px_28px] items-center gap-0 border-b border-[#eee8dc] px-5 py-4 last:border-b-0"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <FileText className="size-4 shrink-0 text-zinc-600" strokeWidth={1.7} />
                                                <span className="truncate text-sm font-medium text-zinc-900">{draft.title}</span>
                                            </div>
                                            <span className="w-fit rounded-md bg-[#e3ead5] px-2 py-1 text-xs font-semibold text-[#4f6121]">
                                                {draft.type}
                                            </span>
                                            <span className="truncate text-sm text-zinc-600">{draft.role}</span>
                                            <span className="text-sm text-zinc-600">{draft.updated}</span>
                                            <button type="button" className="text-zinc-400 hover:text-zinc-800" aria-label={`Open actions for ${draft.title}`}>
                                                <MoreVertical className="size-4" strokeWidth={1.7} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to="/storage"
                                    className="flex items-center justify-center gap-2 border-t border-[#e5dfd0] px-5 py-4 text-sm font-medium text-[#4d5818] transition hover:bg-[#faf8f1]"
                                >
                                    View all drafts
                                    <ArrowRight className="size-4" strokeWidth={1.8} />
                                </Link>
                            </Panel>

                            <Panel className="overflow-hidden">
                                <div className="p-5">
                                    <SectionHeader title="Application targets" action="View all" to="/storage" />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_112px_92px_72px] border-y border-[#e5dfd0] bg-[#faf8f1] px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    <span>Company</span>
                                    <span>Role</span>
                                    <span>Status</span>
                                    <span>Updated</span>
                                </div>
                                <div>
                                    {APPLICATION_TARGETS.map((target) => (
                                        <div
                                            key={`${target.company}-${target.role}`}
                                            className="grid grid-cols-[minmax(0,1fr)_112px_92px_72px] items-center border-b border-[#eee8dc] px-5 py-4 last:border-b-0"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${target.accent}`}>
                                                    {target.company[0]}
                                                </span>
                                                <span className="truncate text-sm font-medium text-zinc-900">{target.company}</span>
                                            </div>
                                            <span className="truncate text-sm text-zinc-600">{target.role}</span>
                                            <StatusBadge status={target.status} />
                                            <span className="text-sm text-zinc-600">{target.updated}</span>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to={user ? "/generator" : "/tailor"}
                                    className="flex items-center justify-center gap-2 border-t border-[#e5dfd0] px-5 py-4 text-sm font-medium text-[#4d5818] transition hover:bg-[#faf8f1]"
                                >
                                    Start next application
                                    <ArrowRight className="size-4" strokeWidth={1.8} />
                                </Link>
                            </Panel>
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <Panel className="p-5">
                            <SectionHeader title="Template picks" action="View all" to="/templates" />
                            <div className="mt-5 space-y-4">
                                {TEMPLATE_PICKS.map((template) => (
                                    <div key={template.title} className="flex items-center gap-4">
                                        <MiniDocumentPreview tone={template.tone} />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-semibold text-zinc-950">{template.title}</h3>
                                            <p className="mt-1 text-sm leading-5 text-zinc-600">{template.description}</p>
                                        </div>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="rounded-md border-[#cfc6b4] bg-white text-[#493b1e] hover:bg-[#f6f2e8]"
                                        >
                                            <Link to="/tailor">Use</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Link
                                to="/templates"
                                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#4d5818] hover:text-zinc-950"
                            >
                                Explore all templates
                                <ArrowRight className="size-4" strokeWidth={1.8} />
                            </Link>
                        </Panel>

                        <Panel className="p-5">
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                                        Usage {user ? "(Pro plan)" : "(Guest)"}
                                    </h2>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {user ? "Renews Jun 10" : "Sign in to save generated documents"}
                                    </p>
                                </div>
                                {isGuest && (
                                    <Button asChild size="sm" className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]">
                                        <Link to="/signup">Sign up</Link>
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Cover letters", value: user ? "12 / 50" : "1 / 3", percent: user ? 24 : 33, icon: PenLine },
                                    { label: "Resumes", value: user ? "6 / 25" : "1 / 2", percent: user ? 24 : 50, icon: FileText },
                                    { label: "AI credits", value: user ? "1,240 / 5,000" : "240 / 500", percent: user ? 25 : 48, icon: Sparkles },
                                ].map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div key={item.label}>
                                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                                <span className="inline-flex items-center gap-2 text-zinc-700">
                                                    <Icon className="size-4 text-[#6b741f]" strokeWidth={1.7} />
                                                    {item.label}
                                                </span>
                                                <span className="font-medium text-zinc-800">{item.value}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-[#ece7dc]">
                                                <div className="h-full rounded-full bg-[#5b661c]" style={{ width: `${item.percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Panel>

                        <Panel className="p-5">
                            <SectionHeader title="Profile completeness" action="View profile" to={user ? "/profile" : "/signup"} />
                            <div className="mt-5 flex items-center gap-5">
                                <ProgressRing value={80} label="Complete" size="size-24" />
                                <div className="space-y-2">
                                    {PROFILE_ITEMS.map((item) => (
                                        <div key={item.label} className="flex items-center gap-2 text-sm text-zinc-700">
                                            {item.complete ? (
                                                <CheckCircle2 className="size-4 text-[#5f6c1c]" strokeWidth={1.8} />
                                            ) : (
                                                <Circle className="size-4 text-zinc-400" strokeWidth={1.8} />
                                            )}
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="mt-5 text-sm leading-6 text-zinc-600">
                                Add links to sharpen company-specific drafts and role summaries.
                            </p>
                        </Panel>

                        <Panel className="border-[#cbd3ad] bg-[#f4f6e8] p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 items-center justify-center rounded-md bg-white text-[#5b661c] shadow-sm">
                                    <BriefcaseBusiness className="size-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-950">Next packet</h2>
                                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                                        Draft a targeted resume and letter together for a cleaner application record.
                                    </p>
                                </div>
                            </div>
                            <Button asChild variant="outline" className="mt-5 w-full rounded-md border-[#b8be92] bg-white text-[#493b1e] hover:bg-[#fbfaf5]">
                                <Link to={user ? "/generator" : "/tailor"}>
                                    <FolderOpen className="size-4" strokeWidth={1.8} />
                                    {user ? "Open generator" : "Open tailor"}
                                </Link>
                            </Button>
                        </Panel>
                    </aside>
                </div>
            </div>
        </div>
    );
}
