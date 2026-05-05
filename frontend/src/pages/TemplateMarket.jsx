import { ArrowRight, BriefcaseBusiness, GraduationCap, Palette, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FILTERS = ["All", "Templates", "Examples"];

const MOCK_TEMPLATES = [
    {
        id: 1,
        title: "Professional Cover Letter",
        description: "A clean letter structure for corporate, business, and operations applications.",
        author: "Amanda Chen",
        category: "Templates",
        icon: BriefcaseBusiness,
        tone: "bg-[#f8f4e8]",
    },
    {
        id: 2,
        title: "Modern Minimalist Letter",
        description: "A restrained layout for tech, product, design, and startup roles.",
        author: "Jordan Lee",
        category: "Templates",
        icon: Sparkles,
        tone: "bg-[#eef3f5]",
    },
    {
        id: 3,
        title: "Academic Cover Letter",
        description: "A research-focused format for publications, teaching, and academic fit.",
        author: "Dr. Sarah Kim",
        category: "Templates",
        icon: GraduationCap,
        tone: "bg-[#f4f6e8]",
    },
    {
        id: 4,
        title: "Creative Portfolio Letter",
        description: "A confident example for designers, artists, and portfolio-heavy candidates.",
        author: "Marcus Rivera",
        category: "Examples",
        icon: Palette,
        tone: "bg-[#f4f1ea]",
    },
    {
        id: 5,
        title: "Internship Application",
        description: "An entry-level example that balances coursework, projects, and motivation.",
        author: "Emily Zhang",
        category: "Examples",
        icon: GraduationCap,
        tone: "bg-[#f8f4e8]",
    },
    {
        id: 6,
        title: "Career Change Letter",
        description: "A transition-focused example that makes transferable experience clear.",
        author: "David Park",
        category: "Examples",
        icon: BriefcaseBusiness,
        tone: "bg-[#eef3f5]",
    },
];

function TemplatePreview({ tone }) {
    return (
        <div className={`aspect-[4/5] rounded-lg border border-[#d9d2c3] ${tone} p-5 shadow-sm`}>
            <div className="mb-6 flex items-center justify-between">
                <div className="h-2 w-24 rounded-full bg-zinc-900/80" />
                <div className="h-2 w-10 rounded-full bg-[#66701f]/80" />
            </div>
            <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-zinc-300/80" />
                <div className="h-2 w-11/12 rounded-full bg-zinc-200" />
                <div className="h-2 w-4/5 rounded-full bg-zinc-200" />
            </div>
            <div className="mt-7 grid grid-cols-[72px_1fr] gap-4">
                <div className="space-y-2">
                    <div className="h-2 rounded-full bg-[#66701f]/70" />
                    <div className="h-2 rounded-full bg-zinc-200" />
                    <div className="h-2 w-4/5 rounded-full bg-zinc-200" />
                </div>
                <div className="space-y-2">
                    <div className="h-2 rounded-full bg-zinc-300" />
                    <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
                    <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
                </div>
            </div>
            <div className="mt-8 space-y-2 border-t border-[#e6dfd1] pt-5">
                <div className="h-2 w-2/3 rounded-full bg-zinc-300" />
                <div className="h-2 w-full rounded-full bg-zinc-200" />
                <div className="h-2 w-4/5 rounded-full bg-zinc-200" />
            </div>
        </div>
    );
}

export default function TemplateMarket() {
    const [activeFilter, setActiveFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = MOCK_TEMPLATES.filter((template) => {
        const query = searchQuery.toLowerCase();
        const matchesFilter = activeFilter === "All" || template.category === activeFilter;
        const matchesSearch =
            !query ||
            template.title.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query);

        return matchesFilter && matchesSearch;
    });

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_420px] lg:items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Template market</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        Choose a professional structure before generation or switch formats after your packet is drafted.
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.8} />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="h-11 rounded-lg border-[#d9d2c2] bg-white pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setActiveFilter(filter)}
                                className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                                    activeFilter === filter
                                        ? "border-[#b8be92] bg-[#eef2d8] text-[#3f4a14]"
                                        : "border-[#ded7c8] bg-white text-zinc-600 hover:border-[#b8be92] hover:text-zinc-950"
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((template) => {
                        const Icon = template.icon;

                        return (
                            <article
                                key={template.id}
                                className="group rounded-xl border border-[#ded7c8] bg-[#fffdf8] p-4 shadow-[0_18px_55px_rgba(32,31,22,0.06)] transition hover:-translate-y-0.5 hover:border-[#c6cda5]"
                            >
                                <TemplatePreview tone={template.tone} />
                                <div className="mt-5 flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                        <Icon className="size-5" strokeWidth={1.8} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{template.title}</h2>
                                        <p className="mt-2 text-sm leading-6 text-zinc-600">{template.description}</p>
                                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">{template.author}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center justify-between border-t border-[#e6dfd1] pt-4">
                                    <span className="rounded-md bg-[#f4f6e8] px-2 py-1 text-xs font-semibold text-[#53621e]">
                                        {template.category}
                                    </span>
                                    <Button asChild variant="outline" size="sm" className="rounded-md border-[#cfc7b7] bg-white">
                                        <Link to="/tailor">
                                            Use
                                            <ArrowRight className="size-4" strokeWidth={1.8} />
                                        </Link>
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <section className="rounded-xl border border-[#ded7c8] bg-[#fffdf8] px-6 py-16 text-center">
                    <h2 className="text-xl font-semibold text-zinc-950">No templates found</h2>
                    <p className="mt-2 text-sm text-zinc-600">Try a broader search or switch back to all templates.</p>
                </section>
            )}
        </div>
    );
}
