import { useEffect, useState } from "react";
import { Archive, Download, FileText, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 10;

function createDefaultPagination() {
    return {
        page: 1,
        page_size: PAGE_SIZE,
        total_items: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    };
}

function normalizePagination(value) {
    const safe = value || {};

    return {
        page: Number(safe.page) > 0 ? Number(safe.page) : 1,
        page_size: Number(safe.page_size) > 0 ? Number(safe.page_size) : PAGE_SIZE,
        total_items: Number(safe.total_items) >= 0 ? Number(safe.total_items) : 0,
        total_pages: Number(safe.total_pages) > 0 ? Number(safe.total_pages) : 1,
        has_next: Boolean(safe.has_next),
        has_prev: Boolean(safe.has_prev),
    };
}

function formatDateTime(value) {
    if (!value) return "-";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function DocumentTypeBadge({ type }) {
    const label = type || "resume";
    const className = label === "cover_letter"
        ? "bg-[#f4dfb7] text-[#73521d]"
        : "bg-[#e5ecd8] text-[#46591d]";

    return (
        <span className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold capitalize ${className}`}>
            {label.replace("_", " ")}
        </span>
    );
}

export default function Storage() {
    const [user, authLoading] = useAuthState(auth);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [documents, setDocuments] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(createDefaultPagination());
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!user) {
            setDocuments([]);
            setPagination(createDefaultPagination());
            setPage(1);
            return;
        }

        let mounted = true;

        const fetchStorage = async () => {
            setLoading(true);
            setError("");
            try {
                const payload = await apiFetch(`/api/users/storage/?page=${page}&page_size=${PAGE_SIZE}`);
                if (mounted) {
                    setDocuments(Array.isArray(payload?.documents) ? payload.documents : []);
                    const normalizedPagination = normalizePagination(payload?.pagination);
                    setPagination(normalizedPagination);
                    if (normalizedPagination.page !== page) {
                        setPage(normalizedPagination.page);
                    }
                }
            } catch (nextError) {
                if (mounted) {
                    setError(nextError?.message || "Failed to load storage.");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchStorage();
        return () => {
            mounted = false;
        };
    }, [user, page]);

    const filteredDocuments = documents.filter((doc) => {
        const safeQuery = query.toLowerCase().trim();
        if (!safeQuery) return true;

        return [doc.company_name, doc.position_name, doc.name, doc.template, doc.kind]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(safeQuery));
    });

    if (authLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 pb-24 text-sm text-zinc-600 sm:px-6 lg:px-8">
                Loading storage...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_380px] lg:items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Generated documents</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        View, download, and check expiration for saved application packets.
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.8} />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search saved documents..."
                        className="h-11 rounded-lg border-[#d9d2c2] bg-white pl-9"
                    />
                </div>
            </header>

            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                {[
                    { label: "Saved documents", value: pagination.total_items, icon: Archive },
                    { label: "Current page", value: pagination.page, icon: FileText },
                    { label: "Storage status", value: "Active", icon: ShieldCheck },
                ].map((item) => {
                    const Icon = item.icon;

                    return (
                        <section key={item.label} className="rounded-lg border border-[#ded7c8] bg-[#fffdf8] p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-zinc-600">{item.label}</p>
                                    <p className="mt-1 text-2xl font-semibold text-zinc-950">{item.value}</p>
                                </div>
                                <div className="flex size-10 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                    <Icon className="size-5" strokeWidth={1.8} />
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>

            <section className="overflow-hidden rounded-xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_18px_55px_rgba(32,31,22,0.06)]">
                <div className="hidden grid-cols-12 gap-4 border-b border-[#e5dfd0] bg-[#faf8f1] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Template</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {loading && (
                    <div className="flex items-center gap-2 px-5 py-8 text-sm text-zinc-600">
                        <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} />
                        Loading documents...
                    </div>
                )}

                {!loading && error && (
                    <div className="px-5 py-8 text-sm text-red-600 whitespace-pre-wrap">{error}</div>
                )}

                {!loading && !error && filteredDocuments.length === 0 && (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                            <FileText className="size-6" strokeWidth={1.8} />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold text-zinc-950">No generated documents found</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                            Generate a resume or cover letter and it will appear here while it is still available.
                        </p>
                    </div>
                )}

                {!loading && !error && filteredDocuments.map((doc) => {
                    const isExpired = Boolean(doc.expired);
                    const companyName = (doc.company_name || "").trim();
                    const positionName = (doc.position_name || "").trim();
                    const displayCompany = companyName || doc.name || `Document ${doc.id}`;
                    const displayPosition = positionName;

                    return (
                        <div key={doc.id} className="grid gap-4 border-b border-[#eee8dc] px-5 py-4 last:border-b-0 md:grid-cols-12 md:items-center">
                            <div className="min-w-0 md:col-span-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#f4f6e8] text-[#5d681c]">
                                        <FileText className="size-4" strokeWidth={1.8} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate font-medium text-zinc-950">{displayCompany}</div>
                                        {displayPosition && (
                                            <div className="truncate text-sm text-zinc-600">{displayPosition}</div>
                                        )}
                                        <div className="text-xs text-zinc-500">Expires: {formatDateTime(doc.expires_at)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <DocumentTypeBadge type={doc.kind} />
                            </div>
                            <div className="text-sm capitalize text-zinc-700 md:col-span-2">{doc.template || "-"}</div>
                            <div className="text-sm text-zinc-600 md:col-span-2">{formatDateTime(doc.created_at)}</div>

                            <div className="flex gap-2 md:col-span-2 md:justify-end">
                                {isExpired ? (
                                    <span className="rounded-md bg-[#fff1ed] px-2 py-1 text-xs font-semibold text-red-700">Expired</span>
                                ) : (
                                    <>
                                        <Button asChild variant="outline" size="sm" className="rounded-md border-[#cfc7b7] bg-white">
                                            <a href={doc.view_url} target="_blank" rel="noreferrer">View</a>
                                        </Button>
                                        <Button asChild size="sm" className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]">
                                            <a href={doc.download_url}>
                                                <Download className="size-4" strokeWidth={1.8} />
                                                Download
                                            </a>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-[#cfc7b7] bg-white"
                    disabled={loading || !pagination.has_prev}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                    Prev
                </Button>

                <p className="text-center text-sm text-zinc-600">
                    Page {pagination.page} of {pagination.total_pages}
                    {" | "}
                    {pagination.total_items} total documents
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-[#cfc7b7] bg-white"
                    disabled={loading || !pagination.has_next}
                    onClick={() => setPage((prev) => prev + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
