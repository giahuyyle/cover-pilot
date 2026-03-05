import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FILTERS = ["All", "Templates", "Examples"];

// Mock data — replace with real data from your backend later
const MOCK_TEMPLATES = [
    {
        id: 1,
        title: "Professional Cover Letter",
        description:
            "A clean, professional cover letter template suitable for corporate and business applications. Includes structured sections for...",
        author: "Amanda Chen",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Cover+Letter",
        category: "Templates",
    },
    {
        id: 2,
        title: "Modern Minimalist Letter",
        description:
            "Minimalist cover letter design with a modern layout. Perfect for tech, design and startup roles. Features clean typography and...",
        author: "Jordan Lee",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Minimalist",
        category: "Templates",
    },
    {
        id: 3,
        title: "Academic Cover Letter",
        description:
            "Tailored for academic and research positions. Includes sections for publications, teaching experience and research interests...",
        author: "Dr. Sarah Kim",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Academic",
        category: "Templates",
    },
    {
        id: 4,
        title: "Creative Portfolio Letter",
        description:
            "A bold, creative cover letter template designed for artists, designers, and other creative professionals who want to stand out...",
        author: "Marcus Rivera",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Creative",
        category: "Examples",
    },
    {
        id: 5,
        title: "Internship Application",
        description:
            "Entry-level cover letter example for internship and graduate applications. Highlights education, relevant coursework and...",
        author: "Emily Zhang",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Internship",
        category: "Examples",
    },
    {
        id: 6,
        title: "Career Change Letter",
        description:
            "Cover letter example for professionals transitioning between industries. Focuses on transferable skills and motivation for...",
        author: "David Park",
        thumbnail: "https://placehold.co/400x520/f8fafc/94a3b8?text=Career+Change",
        category: "Examples",
    },
];

export default function TemplateMarket() {
    const [activeFilter, setActiveFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = MOCK_TEMPLATES.filter((t) => {
        const matchesFilter =
            activeFilter === "All" || t.category === activeFilter;
        const matchesSearch =
            !searchQuery ||
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="max-w-6xl mx-auto px-6 pb-16">
            {/* Filter tabs */}
            <div className="flex justify-end items-center gap-1 text-sm mb-8">
                <span className="text-[rgb(108,144,46)] mr-1">Filters:</span>
                {FILTERS.map((filter, i) => (
                    <span key={filter} className="flex items-center gap-1">
                        <button
                            onClick={() => setActiveFilter(filter)}
                            className={`cursor-pointer transition ${
                                activeFilter === filter
                                    ? "text-foreground font-semibold underline underline-offset-4"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {filter}
                        </button>
                        {i < FILTERS.length - 1 && (
                            <span className="text-muted-foreground mx-1">/</span>
                        )}
                    </span>
                ))}
            </div>

            {/* Hero section */}
            <div className="flex flex-col items-center text-center mb-12">
                <p className="text-sm font-mono mb-2 text-[rgb(108,144,46)]">
                    {"{"} cover pilot template gallery {"}"}
                </p>
                <h1 className="text-4xl font-bold text-foreground mb-3">
                    Cover Letter Templates
                </h1>
                <p className="text-muted-foreground font-extralight max-w-xl mb-8">
                    Cover letter templates for job applications, internships, career
                    changes, and more.
                </p>

                {/* Search bar */}
                <div className="flex items-center gap-3 w-full max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 rounded-lg"
                        />
                    </div>
                    <Button className="h-11 px-6 rounded-full">Search</Button>
                </div>
            </div>

            {/* Section title */}
            <h2 className="text-2xl font-bold text-foreground mb-6">Recent</h2>

            {/* Template grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((template) => (
                        <div
                            key={template.id}
                            className="group flex flex-col cursor-pointer"
                        >
                            {/* Thumbnail */}
                            <div className="rounded-xl border border-border overflow-hidden bg-muted/30 aspect-3/4 mb-4">
                                <img
                                    src={template.thumbnail}
                                    alt={template.title}
                                    className="w-full h-full object-cover transition group-hover:scale-[1.02]"
                                />
                            </div>

                            {/* Info */}
                            <h3 className="text-base font-semibold text-foreground leading-snug mb-1 group-hover:underline">
                                {template.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {template.description}
                            </p>
                            <p className="text-sm text-muted-foreground/80">
                                {template.author}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-16">
                    No templates found.
                </p>
            )}
        </div>
    );
}