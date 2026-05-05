import {
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    FileText,
    FolderOpen,
    LayoutTemplate,
    PenLine,
    Send,
    ShieldCheck,
    Sparkles,
    Target,
    Upload,
} from "lucide-react";
import { Link } from "react-router";

const navItems = [
    { label: "Workflow", href: "#workflow" },
    { label: "Templates", href: "#templates" },
    { label: "Quality", href: "#quality" },
];

const workflowSteps = [
    {
        title: "Upload resume",
        description: "Start from your existing PDF and keep your base profile intact.",
        icon: Upload,
    },
    {
        title: "Paste job post",
        description: "Cover Pilot reads the role, keywords, and hiring signals.",
        icon: ClipboardList,
    },
    {
        title: "Generate packet",
        description: "Get a tailored resume and cover letter ready to refine.",
        icon: Sparkles,
    },
];

const dashboardStats = [
    { label: "Resume health", value: "78", detail: "Good" },
    { label: "Drafts ready", value: "12", detail: "4 this week" },
    { label: "Applications", value: "14", detail: "65% ready" },
];

const templateCards = [
    {
        title: "Modern Professional",
        description: "Clean structure for operations, business, and product roles.",
        tone: "bg-[#f8f4e8]",
    },
    {
        title: "Executive",
        description: "A confident format for senior-level impact and leadership.",
        tone: "bg-[#eef3f5]",
    },
    {
        title: "Creative Minimal",
        description: "A lean layout for design, research, and portfolio work.",
        tone: "bg-[#f4f1ea]",
    },
];

const qualityItems = [
    "Role-specific language",
    "Template-safe structure",
    "Resume health scoring",
    "Application tracker",
];

function DocumentPreview({ tone = "bg-white", compact = false }) {
    return (
        <div className={`rounded-lg border border-[#d9d2c3] ${tone} p-4 shadow-sm`}>
            <div className="mb-4 flex items-center justify-between">
                <div className="h-2 w-20 rounded-full bg-zinc-900/80" />
                <div className="h-2 w-8 rounded-full bg-[#66701f]/80" />
            </div>
            <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-zinc-300/80" />
                <div className="h-2 w-11/12 rounded-full bg-zinc-200" />
                <div className="h-2 w-4/5 rounded-full bg-zinc-200" />
            </div>
            <div className={`${compact ? "mt-4" : "mt-6"} grid grid-cols-[64px_1fr] gap-3`}>
                <div className="space-y-2">
                    <div className="h-2 rounded-full bg-[#66701f]/70" />
                    <div className="h-2 rounded-full bg-zinc-200" />
                    <div className="h-2 rounded-full bg-zinc-200" />
                </div>
                <div className="space-y-2">
                    <div className="h-2 rounded-full bg-zinc-300" />
                    <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
                    <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
                </div>
            </div>
            {!compact && (
                <div className="mt-6 space-y-2 border-t border-[#e6dfd1] pt-4">
                    <div className="h-2 w-2/3 rounded-full bg-zinc-300" />
                    <div className="h-2 w-full rounded-full bg-zinc-200" />
                    <div className="h-2 w-4/5 rounded-full bg-zinc-200" />
                </div>
            )}
        </div>
    );
}

function ProductPreview() {
    return (
        <div className="rounded-xl border border-[#d8d1c2] bg-[#fffdf8] p-4 shadow-[0_28px_80px_rgba(45,42,29,0.14)]">
            <div className="mb-4 flex items-center justify-between border-b border-[#e7e0d3] pb-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#64701f]">Dashboard</p>
                    <h2 className="mt-1 text-lg font-semibold text-zinc-950">Application workspace</h2>
                </div>
                <Link
                    to="/tailor"
                    className="inline-flex items-center gap-2 rounded-md bg-[#5d681c] px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4d5818]"
                >
                    <Sparkles className="size-3.5" strokeWidth={1.8} />
                    Open tailor
                </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_172px]">
                <div className="space-y-4">
                    <div className="rounded-lg border border-[#ded7c8] bg-[#faf8f1] p-4">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-zinc-950">Create new letter</p>
                                <p className="mt-1 text-xs text-zinc-600">Marketing manager at Northwind</p>
                            </div>
                            <div className="flex size-10 items-center justify-center rounded-md bg-[#5d681c] text-white">
                                <PenLine className="size-5" strokeWidth={1.8} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {dashboardStats.map((stat) => (
                                <div key={stat.label} className="rounded-md border border-[#e2dbcd] bg-white p-3">
                                    <p className="text-xl font-semibold text-zinc-950">{stat.value}</p>
                                    <p className="mt-1 text-[11px] font-medium text-zinc-500">{stat.label}</p>
                                    <p className="mt-1 text-[11px] text-[#64701f]">{stat.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-[#ded7c8] bg-white">
                        <div className="grid grid-cols-[1fr_76px_84px] border-b border-[#e7e0d3] bg-[#faf8f1] px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            <span>Recent draft</span>
                            <span>Type</span>
                            <span>Status</span>
                        </div>
                        {[
                            ["Product Manager Resume", "RES", "Ready"],
                            ["Data Analyst Cover Letter", "CL", "Review"],
                            ["UX Researcher Packet", "CL", "Draft"],
                        ].map(([name, type, status]) => (
                            <div key={name} className="grid grid-cols-[1fr_76px_84px] items-center border-b border-[#eee8dc] px-4 py-3 text-xs last:border-b-0">
                                <span className="truncate font-medium text-zinc-900">{name}</span>
                                <span className="w-fit rounded bg-[#e5ecd8] px-2 py-1 font-semibold text-[#53621e]">{type}</span>
                                <span className="text-zinc-600">{status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-lg border border-[#ded7c8] bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-950">Resume health</span>
                            <span className="text-sm font-semibold text-[#5d681c]">78%</span>
                        </div>
                        <div className="space-y-2">
                            {["Content", "Structure", "Keywords", "Format"].map((item, index) => (
                                <div key={item}>
                                    <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
                                        <span>{item}</span>
                                        <span>{82 - index * 4}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[#ece7dc]">
                                        <div
                                            className="h-full rounded-full bg-[#5d681c]"
                                            style={{ width: `${82 - index * 4}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-[#ded7c8] bg-[#f4f6e8] p-4">
                        <p className="text-sm font-semibold text-zinc-950">Template pick</p>
                        <div className="mt-3 flex gap-3">
                            <div className="h-20 w-14 rounded-md border border-[#d2cab9] bg-white p-2">
                                <div className="mb-2 h-1.5 w-8 rounded-full bg-zinc-800" />
                                <div className="space-y-1">
                                    <div className="h-1 rounded-full bg-zinc-300" />
                                    <div className="h-1 w-4/5 rounded-full bg-zinc-200" />
                                    <div className="h-1 w-3/5 rounded-full bg-zinc-200" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-zinc-900">Modern Professional</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-600">Clean layout for product and operations roles.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WorkflowCard({ step, index }) {
    const Icon = step.icon;

    return (
        <div className="rounded-lg border border-[#ded7c8] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#f3f5e6] text-[#5d681c]">
                    <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <span className="text-sm font-semibold text-[#b07625]">0{index + 1}</span>
            </div>
            <h3 className="text-lg font-semibold text-zinc-950">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{step.description}</p>
        </div>
    );
}

function TemplateCard({ template }) {
    return (
        <div className="rounded-lg border border-[#ded7c8] bg-white p-4 shadow-sm">
            <DocumentPreview tone={template.tone} compact />
            <h3 className="mt-5 text-lg font-semibold text-zinc-950">{template.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{template.description}</p>
            <Link
                to="/templates"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#4d5818] transition hover:text-zinc-950"
            >
                View template
                <ArrowRight className="size-4" strokeWidth={1.8} />
            </Link>
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen bg-[#fbfaf5] text-zinc-950">
            <header className="sticky top-0 z-40 border-b border-[#e4dece] bg-[#fbfaf5]/90 backdrop-blur">
                <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Cover Pilot" className="size-11 rounded-md" />
                        <span className="text-lg font-semibold tracking-tight">Cover Pilot</span>
                    </Link>

                    <div className="hidden items-center gap-7 md:flex">
                        {navItems.map((item) => (
                            <a key={item.label} href={item.href} className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950">
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            className="hidden rounded-md px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white hover:text-zinc-950 sm:inline-flex"
                        >
                            Login
                        </Link>
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 rounded-md bg-[#5d681c] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4d5818]"
                        >
                            Start generating
                            <ArrowRight className="size-4" strokeWidth={1.8} />
                        </Link>
                    </div>
                </nav>
            </header>

            <main>
                <section className="border-b border-[#e4dece]">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-20 lg:pt-20">
                        <div className="flex flex-col justify-center">
                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-zinc-950 sm:text-6xl">
                                Tailored resumes and cover letters without the formatting grind.
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-650">
                                Cover Pilot turns your resume and a job post into a polished application packet, then helps you track readiness across every role.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/tailor"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#5d681c] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                                >
                                    Start generating
                                    <Sparkles className="size-4" strokeWidth={1.8} />
                                </Link>
                                <Link
                                    to="/templates"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#cfc7b7] bg-white px-6 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#a8aa78] hover:bg-[#f8f5eb]"
                                >
                                    View templates
                                    <LayoutTemplate className="size-4" strokeWidth={1.8} />
                                </Link>
                            </div>

                            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                                {[
                                    ["30 sec", "first draft"],
                                    ["5", "template styles"],
                                    ["PDF", "ready output"],
                                ].map(([value, label]) => (
                                    <div key={label} className="rounded-lg border border-[#ddd6c8] bg-white p-4">
                                        <p className="text-2xl font-semibold text-zinc-950">{value}</p>
                                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 rounded-[28px] border border-[#ebe4d6] bg-white/45" />
                            <div className="relative">
                                <ProductPreview />
                            </div>
                        </div>
                    </div>
                </section>

                <section id="workflow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">From job post to application packet.</h2>
                            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
                                Keep the workflow compact: upload your resume, paste the role, choose a template, and generate a packet you can keep improving.
                            </p>
                        </div>
                        <Link
                            to="/tailor"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4d5818] transition hover:text-zinc-950"
                        >
                            Open tailor
                            <ArrowRight className="size-4" strokeWidth={1.8} />
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {workflowSteps.map((step, index) => (
                            <WorkflowCard key={step.title} step={step} index={index} />
                        ))}
                    </div>
                </section>

                <section className="border-y border-[#e4dece] bg-white">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">Write with the job in view.</h2>
                            <p className="mt-4 text-base leading-7 text-zinc-600">
                                Cover Pilot keeps the resume, job requirements, model choice, and generated output in one focused workspace.
                            </p>
                            <div className="mt-8 space-y-4">
                                {[
                                    ["Resume health", "Catch content, keyword, structure, and formatting gaps before you apply."],
                                    ["Application tracker", "Keep generated packets tied to the company, role, and next action."],
                                    ["Template market", "Switch formats without rebuilding every document from scratch."],
                                ].map(([title, description]) => (
                                    <div key={title} className="flex gap-3">
                                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#5d681c]" strokeWidth={1.8} />
                                        <div>
                                            <h3 className="font-semibold text-zinc-950">{title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-[#ded7c8] bg-[#fbfaf5] p-5">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-md bg-[#f1e1bf] text-[#8a5c1f]">
                                        <Target className="size-5" strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-950">Target role</h3>
                                        <p className="text-sm text-zinc-600">Product Manager</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {["Leadership", "Roadmaps", "Stakeholders", "Metrics"].map((item) => (
                                        <div key={item} className="flex items-center justify-between rounded-md border border-[#e3dcca] bg-white px-3 py-2 text-sm">
                                            <span>{item}</span>
                                            <span className="text-[#5d681c]">Matched</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#ded7c8] bg-[#f4f6e8] p-5">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-md bg-white text-[#5d681c]">
                                        <FileText className="size-5" strokeWidth={1.8} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-950">Generated packet</h3>
                                        <p className="text-sm text-zinc-600">Resume and cover letter</p>
                                    </div>
                                </div>
                                <DocumentPreview tone="bg-white" compact />
                            </div>
                        </div>
                    </div>
                </section>

                <section id="templates" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">Template market without the rebuild.</h2>
                            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
                                Pick a professional structure first or swap the look after generation while preserving the substance of your packet.
                            </p>
                        </div>
                        <Link
                            to="/templates"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4d5818] transition hover:text-zinc-950"
                        >
                            Browse templates
                            <ArrowRight className="size-4" strokeWidth={1.8} />
                        </Link>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {templateCards.map((template) => (
                            <TemplateCard key={template.title} template={template} />
                        ))}
                    </div>
                </section>

                <section id="quality" className="border-y border-[#e4dece] bg-[#1f2613] text-white">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
                        <div>
                            <ShieldCheck className="size-10 text-[#d6efa3]" strokeWidth={1.7} />
                            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Built for careful applications, not one-off text dumps.</h2>
                            <p className="mt-4 text-base leading-7 text-zinc-300">
                                The dashboard gives every generated document context: target role, readiness, template, and follow-up status.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {qualityItems.map((item) => (
                                <div key={item} className="rounded-lg border border-white/12 bg-white/8 p-5">
                                    <CheckCircle2 className="size-5 text-[#d6efa3]" strokeWidth={1.8} />
                                    <p className="mt-4 font-semibold">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="rounded-xl border border-[#d8d1c2] bg-[#fffdf8] p-8 shadow-[0_24px_70px_rgba(45,42,29,0.08)] md:p-10">
                        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
                            <div>
                                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">Start with one role. Leave with a stronger packet.</h2>
                                <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
                                    Generate a tailored draft, try a template, and bring the same workspace into your next application.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/tailor"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#5d681c] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                                >
                                    Start generating
                                    <Send className="size-4" strokeWidth={1.8} />
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#cfc7b7] bg-white px-6 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#a8aa78] hover:bg-[#f8f5eb]"
                                >
                                    Open dashboard
                                    <FolderOpen className="size-4" strokeWidth={1.8} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#e4dece] bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Cover Pilot" className="size-10 rounded-md" />
                        <span className="font-semibold tracking-tight">Cover Pilot</span>
                    </Link>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
                        <a href="mailto:cover.pilot@gmail.com" className="hover:text-zinc-950">Contact</a>
                        <a href="https://www.instagram.com/coverpilot" className="hover:text-zinc-950">Instagram</a>
                        <Link to="/terms" className="hover:text-zinc-950">Terms</Link>
                        <Link to="/privacy" className="hover:text-zinc-950">Privacy</Link>
                    </div>
                    <p className="text-sm text-zinc-500">2026 Cover Pilot. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
