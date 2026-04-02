import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

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

export default function Storage() {
    const [user, authLoading] = useAuthState(auth);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [documents, setDocuments] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(createDefaultPagination());

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

    if (authLoading) {
        return <div className="mx-auto max-w-5xl px-6 pb-20 text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="mx-auto max-w-5xl px-6 pb-20">
            <header className="mb-8">
                <p className="text-sm font-mono mb-1 text-[rgb(108,144,46)]">{`{ storage }`}</p>
                <h1 className="text-3xl font-bold">Generated Documents</h1>
                <p className="text-muted-foreground mt-1">View or download documents that have not expired yet.</p>
            </header>

            <section className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Template</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {loading && (
                    <div className="px-4 py-6 text-sm text-muted-foreground">Loading documents...</div>
                )}

                {!loading && error && (
                    <div className="px-4 py-6 text-sm text-red-600 whitespace-pre-wrap">{error}</div>
                )}

                {!loading && !error && documents.length === 0 && (
                    <div className="px-4 py-10 text-sm text-muted-foreground">No generated documents found.</div>
                )}

                {!loading && !error && documents.map((doc) => {
                    const isExpired = Boolean(doc.expired);

                    return (
                        <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-border last:border-b-0 items-center">
                            <div className="col-span-4 min-w-0">
                                <div className="font-medium truncate">{doc.name || `Document ${doc.id}`}</div>
                                <div className="text-xs text-muted-foreground">Expires: {formatDateTime(doc.expires_at)}</div>
                            </div>

                            <div className="col-span-2 text-sm capitalize">{doc.kind || "resume"}</div>
                            <div className="col-span-2 text-sm capitalize">{doc.template || "-"}</div>
                            <div className="col-span-2 text-sm text-muted-foreground">{formatDateTime(doc.created_at)}</div>

                            <div className="col-span-2 flex justify-end gap-2">
                                {isExpired ? (
                                    <span className="text-xs font-semibold text-red-600">EXPIRED</span>
                                ) : (
                                    <>
                                        <Button asChild variant="outline" size="sm">
                                            <a href={doc.view_url} target="_blank" rel="noreferrer">View</a>
                                        </Button>
                                        <Button asChild size="sm">
                                            <a href={doc.download_url}>Download</a>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="mt-6 flex items-center justify-between">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || !pagination.has_prev}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                    Prev
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                    Page {pagination.page} of {pagination.total_pages}
                    {" \u2022 "}
                    {pagination.total_items} total documents
                </p>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || !pagination.has_next}
                    onClick={() => setPage((prev) => prev + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
