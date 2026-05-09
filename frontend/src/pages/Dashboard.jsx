import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    Bell,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock3,
    Download,
    FileText,
    FolderOpen,
    LayoutTemplate,
    Loader2,
    PenLine,
    Plus,
    RefreshCw,
    Sparkles,
    Upload,
    UserRound,
} from "lucide-react";
import { Link } from "react-router";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const STORAGE_PAGE_SIZE = 8;
const GUEST_PROFILE_ITEMS = [
    { key: "basics", label: "Basics", complete: false, required: true },
    { key: "experience", label: "Experience", complete: false, required: true },
    { key: "projects", label: "Projects", complete: false, required: true },
    { key: "education", label: "Education", complete: false, required: true },
    { key: "skills", label: "Skills", complete: false, required: true },
    { key: "links", label: "Links", complete: false, required: false },
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

function createDefaultPagination() {
    return {
        page: 1,
        page_size: STORAGE_PAGE_SIZE,
        total_items: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    };
}

function createEmptyDashboardData() {
    return {
        profile: null,
        documents: [],
        pagination: createDefaultPagination(),
        profileError: "",
        storageError: "",
    };
}

function getDisplayName(user, profile) {
    const fallbackName = user?.email?.split("@")[0] || "Job seeker";
    return (profile?.display_name || profile?.full_name || user?.displayName || fallbackName).trim();
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

function cleanString(value) {
    return String(value || "").trim();
}

function hasText(value) {
    return cleanString(value).length > 0;
}

function hasListItem(value) {
    return Array.isArray(value) && value.some((item) => hasText(item));
}

function getProfileItems(profile, userEmail = "") {
    if (!profile) return GUEST_PROFILE_ITEMS;

    const basic = profile.basic || {};
    const basicsComplete = Boolean(
        hasText(profile.full_name) &&
        hasText(basic.phone) &&
        hasText(basic.location) &&
        (hasText(basic.contact_email) || hasText(userEmail))
    );
    const experienceComplete = Array.isArray(profile.experience) && profile.experience.some((item) => (
        hasText(item?.company) && hasText(item?.role) && hasListItem(item?.description)
    ));
    const projectsComplete = Array.isArray(profile.projects) && profile.projects.some((item) => (
        hasText(item?.name) && hasListItem(item?.stack) && hasListItem(item?.description)
    ));
    const educationComplete = Array.isArray(profile.education) && profile.education.some((item) => (
        hasText(item?.school) && (hasText(item?.degree) || hasText(item?.major))
    ));
    const skillsComplete = Array.isArray(profile.skills) && profile.skills.some((item) => hasText(item?.name));
    const linksComplete = Boolean(hasText(basic.linkedin_url) || hasText(basic.portfolio_url) || hasText(basic.github_url));
    const certificatesComplete = Array.isArray(profile.certificates) && profile.certificates.some((item) => (
        hasText(item?.name) && hasText(item?.issuer)
    ));

    return [
        { key: "basics", label: "Basics", complete: basicsComplete, required: true },
        { key: "experience", label: "Experience", complete: experienceComplete, required: true },
        { key: "projects", label: "Projects", complete: projectsComplete, required: true },
        { key: "education", label: "Education", complete: educationComplete, required: true },
        { key: "skills", label: "Skills", complete: skillsComplete, required: true },
        { key: "links", label: "Links", complete: linksComplete, required: false },
        { key: "certificates", label: "Certificates", complete: certificatesComplete, required: false },
    ];
}

function getCompletionSummary(profileItems) {
    const requiredItems = profileItems.filter((item) => item.required);
    const completeRequired = requiredItems.filter((item) => item.complete).length;
    const completeItems = profileItems.filter((item) => item.complete).length;
    const percent = requiredItems.length > 0 ? Math.round((completeRequired / requiredItems.length) * 100) : 0;

    return {
        percent,
        completeRequired,
        requiredTotal: requiredItems.length,
        completeItems,
        totalItems: profileItems.length,
        missingRequired: requiredItems.filter((item) => !item.complete),
        missingOptional: profileItems.filter((item) => !item.required && !item.complete),
    };
}

function formatDate(value) {
    if (!value) return "-";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function formatRelativeDate(value) {
    if (!value) return "No date";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return formatDate(value);

    const diffMs = Date.now() - parsed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(value);
}

function getDocumentTypeLabel(kind) {
    const label = cleanString(kind) || "resume";
    if (label === "cover_letter") return "CL";
    return label.slice(0, 3).toUpperCase();
}

function getDocumentTitle(doc) {
    const companyName = cleanString(doc?.company_name);
    const positionName = cleanString(doc?.position_name);
    if (companyName && positionName) return `${companyName} - ${positionName}`;
    return companyName || cleanString(doc?.name) || `Document ${doc?.id || ""}`.trim();
}

function getDocumentRole(doc) {
    return cleanString(doc?.position_name) || cleanString(doc?.template) || "Generated document";
}

function getNextSteps({ isGuest, completion, documents, profileError, storageError }) {
    if (isGuest) {
        return [
            {
                title: "Create a saved workspace",
                description: "Sign up to keep generated packets, profile details, and storage history together.",
                to: "/signup",
                icon: UserRound,
            },
            {
                title: "Tailor a resume",
                description: "Upload a resume and job description for a quick guest draft.",
                to: "/tailor",
                icon: Upload,
            },
        ];
    }

    const steps = [];

    if (profileError) {
        steps.push({
            title: "Refresh profile data",
            description: "The dashboard could not read your profile yet. Open profile settings and save once.",
            to: "/profile",
            icon: RefreshCw,
        });
    }

    completion.missingRequired.slice(0, 2).forEach((item) => {
        steps.push({
            title: `Complete ${item.label.toLowerCase()}`,
            description: "Add this profile section so generated resumes have stronger source material.",
            to: "/profile",
            icon: UserRound,
        });
    });

    const missingLinks = completion.missingOptional.find((item) => item.key === "links");
    if (missingLinks) {
        steps.push({
            title: "Add professional links",
            description: "LinkedIn, GitHub, or portfolio links give application packets better contact context.",
            to: "/profile",
            icon: PenLine,
        });
    }

    if (storageError) {
        steps.push({
            title: "Retry generated document storage",
            description: "Storage did not load. Reopen storage to refresh document links.",
            to: "/storage",
            icon: FolderOpen,
        });
    } else if (documents.length === 0) {
        steps.push({
            title: "Generate your first saved document",
            description: "Use your profile to create a resume packet that will appear in storage.",
            to: "/generator",
            icon: Sparkles,
        });
    } else if (documents.every((doc) => doc.expired)) {
        steps.push({
            title: "Regenerate an active packet",
            description: "Your recent stored documents have expired, so create a fresh downloadable version.",
            to: "/generator",
            icon: Clock3,
        });
    } else {
        steps.push({
            title: "Draft the next application packet",
            description: "Turn your current profile into another tailored resume for a target role.",
            to: "/generator",
            icon: BriefcaseBusiness,
        });
    }

    return steps.slice(0, 4);
}

function ProgressRing({ value, label, size = "size-28" }) {
    const normalizedValue = Math.max(0, Math.min(100, Number(value) || 0));
    const ringStyle = {
        background: `conic-gradient(#5b661c ${normalizedValue * 3.6}deg, #e7e2d6 0deg)`,
    };

    return (
        <div className={`${size} rounded-full p-2`} style={ringStyle}>
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#fffdf8] text-center">
                <span className="text-2xl font-semibold tracking-tight text-zinc-950">{normalizedValue}</span>
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

function HealthBar({ label, complete }) {
    const value = complete ? 100 : 0;

    return (
        <div className="grid grid-cols-[82px_1fr_54px] items-center gap-3 text-sm">
            <span className="text-zinc-700">{label}</span>
            <div className="h-2 rounded-full bg-[#ece7dc]">
                <div className="h-full rounded-full bg-[#5b661c]" style={{ width: `${value}%` }} />
            </div>
            <span className="text-right text-xs font-medium text-zinc-700">{complete ? "Ready" : "Missing"}</span>
        </div>
    );
}

function EmptyState({ title, description, children }) {
    return (
        <div className="px-5 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                {children}
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-950">{title}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">{description}</p>
        </div>
    );
}

export default function Dashboard() {
    const [user, loading] = useAuthState(auth);
    const [dashboardData, setDashboardData] = useState(createEmptyDashboardData);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const guestDashboardData = useMemo(() => createEmptyDashboardData(), []);
    const currentDashboardData = user ? dashboardData : guestDashboardData;
    const isGuest = !loading && !user;

    useEffect(() => {
        if (!user) {
            return;
        }

        let isMounted = true;

        const fetchDashboardData = async () => {
            setDashboardLoading(true);

            const [profileResult, storageResult] = await Promise.allSettled([
                apiFetch("/api/users/me/"),
                apiFetch(`/api/users/storage/?page=1&page_size=${STORAGE_PAGE_SIZE}`),
            ]);

            if (!isMounted) return;

            const nextData = createEmptyDashboardData();

            if (profileResult.status === "fulfilled") {
                nextData.profile = profileResult.value || null;
            } else {
                const message = profileResult.reason?.message || "Profile data could not be loaded.";
                nextData.profileError = message.includes("Profile not found") ? "" : message;
            }

            if (storageResult.status === "fulfilled") {
                nextData.documents = Array.isArray(storageResult.value?.documents) ? storageResult.value.documents : [];
                nextData.pagination = {
                    ...createDefaultPagination(),
                    ...(storageResult.value?.pagination || {}),
                };
            } else {
                nextData.storageError = storageResult.reason?.message || "Generated documents could not be loaded.";
            }

            setDashboardData(nextData);
            setDashboardLoading(false);
        };

        fetchDashboardData();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const profileItems = useMemo(
        () => getProfileItems(currentDashboardData.profile, user?.email || ""),
        [currentDashboardData.profile, user?.email]
    );
    const completion = useMemo(() => getCompletionSummary(profileItems), [profileItems]);
    const displayName = getDisplayName(user, currentDashboardData.profile);
    const firstName = displayName.split(" ")[0] || "Job seeker";
    const initials = getInitials(displayName);
    const activeDocuments = currentDashboardData.documents.filter((doc) => !doc.expired);
    const expiredDocuments = currentDashboardData.documents.filter((doc) => doc.expired);
    const recentDocuments = currentDashboardData.documents.slice(0, 4);
    const nextSteps = useMemo(
        () => getNextSteps({
            isGuest,
            completion,
            documents: currentDashboardData.documents,
            profileError: currentDashboardData.profileError,
            storageError: currentDashboardData.storageError,
        }),
        [completion, currentDashboardData.documents, currentDashboardData.profileError, currentDashboardData.storageError, isGuest]
    );
    const focusStep = nextSteps[0];
    const stats = [
        {
            label: "Profile complete",
            value: `${completion.percent}%`,
            detail: `${completion.completeRequired}/${completion.requiredTotal} required sections`,
            icon: UserRound,
        },
        {
            label: "Saved documents",
            value: currentDashboardData.pagination.total_items,
            detail: user ? "from storage" : "sign in to save",
            icon: FileText,
        },
        {
            label: "Active recent docs",
            value: activeDocuments.length,
            detail: expiredDocuments.length > 0 ? `${expiredDocuments.length} expired recently` : "download links ready",
            icon: Clock3,
        },
        {
            label: "Next steps",
            value: nextSteps.length,
            detail: focusStep?.title || "ready to start",
            icon: CheckCircle2,
        },
    ];
    const loadingDashboard = loading || Boolean(user && dashboardLoading);

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-6 pb-24 text-sm text-muted-foreground">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="bg-[linear-gradient(180deg,#fbfaf5_0%,#ffffff_42%,#f7f5ec_100%)] dark:bg-[linear-gradient(180deg,#11130c_0%,#17180f_46%,#10110b_100%)]">
            <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#e3dece] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                            Good morning, {firstName}
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                            {isGuest
                                ? "Build your first tailored application packet and save your workspace when you are ready."
                                : "Your dashboard is synced with your profile and generated document storage."}
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

                {(currentDashboardData.profileError || currentDashboardData.storageError) && (
                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                        <div>
                            <p className="font-medium">Some dashboard data could not be loaded.</p>
                            <p className="mt-1 whitespace-pre-wrap text-amber-800">
                                {[currentDashboardData.profileError, currentDashboardData.storageError].filter(Boolean).join("\n")}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_326px]">
                    <div className="space-y-6">
                        <Panel className="overflow-hidden">
                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:p-6">
                                <div className="flex flex-col justify-between gap-5">
                                    <div>
                                        <p className="text-sm font-medium text-[#59631c]">Today&apos;s focus</p>
                                        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-zinc-950">
                                            {focusStep?.title || "Start with a tailored application packet."}
                                        </h2>
                                        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                                            {focusStep?.description || "Use your profile and target role to generate a focused resume."}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button
                                            asChild
                                            className="h-16 justify-between rounded-lg bg-[#5d681c] px-5 text-base text-white hover:bg-[#4d5818]"
                                        >
                                            <Link to={focusStep?.to || (user ? "/generator" : "/tailor")}>
                                                <span className="inline-flex items-center gap-3">
                                                    <Plus className="size-5" strokeWidth={1.8} />
                                                    {user ? "Continue" : "Start guest draft"}
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
                                    <SectionHeader title="Profile signals" action="Improve" to={user ? "/profile" : "/signup"} />
                                    <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
                                        <ProgressRing value={completion.percent} label="Ready" />
                                        <div className="min-w-0 flex-1 space-y-3">
                                            {profileItems.filter((item) => item.required).map((item) => (
                                                <HealthBar key={item.key} label={item.label} complete={item.complete} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel className="p-5 lg:p-6">
                            <div className="grid gap-5 md:grid-cols-[minmax(180px,240px)_1fr] md:items-center">
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-950">Application readiness</h2>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        {completion.missingRequired.length === 0
                                            ? "Required profile sections are ready."
                                            : `${completion.missingRequired.length} profile sections need attention.`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {stats.map((stat) => {
                                        const Icon = stat.icon;

                                        return (
                                            <div key={stat.label} className="border-l border-[#e5dfd0] pl-4 first:border-l-0 first:pl-0">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="size-4 text-zinc-600" strokeWidth={1.7} />
                                                    <span className="text-2xl font-semibold text-zinc-950">{stat.value}</span>
                                                </div>
                                                <p className="mt-1 text-sm text-zinc-600">{stat.label}</p>
                                                <p className="mt-0.5 truncate text-xs text-zinc-500">{stat.detail}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Panel>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Panel className="overflow-hidden">
                                <div className="p-5">
                                    <SectionHeader title="Recent generated documents" action={user ? "View all" : ""} to="/storage" />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_64px_112px_78px] border-y border-[#e5dfd0] bg-[#faf8f1] px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    <span>Name</span>
                                    <span>Type</span>
                                    <span>Target</span>
                                    <span>Created</span>
                                </div>
                                <div>
                                    {loadingDashboard && (
                                        <div className="flex items-center gap-2 px-5 py-8 text-sm text-zinc-600">
                                            <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
                                            Loading documents...
                                        </div>
                                    )}

                                    {!loadingDashboard && recentDocuments.length === 0 && (
                                        <EmptyState
                                            title={user ? "No generated documents yet" : "Storage starts after sign in"}
                                            description={user
                                                ? "Generate a profile-based resume and it will appear here while available."
                                                : "Guest drafts are temporary. Sign in to keep generated documents visible on this dashboard."}
                                        >
                                            <FileText className="size-6" strokeWidth={1.8} />
                                        </EmptyState>
                                    )}

                                    {!loadingDashboard && recentDocuments.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="grid grid-cols-[minmax(0,1fr)_64px_112px_78px] items-center border-b border-[#eee8dc] px-5 py-4 last:border-b-0"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <FileText className="size-4 shrink-0 text-zinc-600" strokeWidth={1.7} />
                                                <div className="min-w-0">
                                                    <span className="block truncate text-sm font-medium text-zinc-900">{getDocumentTitle(doc)}</span>
                                                    {doc.expired && (
                                                        <span className="text-xs font-medium text-red-700">Expired</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="w-fit rounded-md bg-[#e3ead5] px-2 py-1 text-xs font-semibold text-[#4f6121]">
                                                {getDocumentTypeLabel(doc.kind)}
                                            </span>
                                            <span className="truncate text-sm text-zinc-600">{getDocumentRole(doc)}</span>
                                            <span className="text-sm text-zinc-600">{formatRelativeDate(doc.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    to={user ? "/storage" : "/signup"}
                                    className="flex items-center justify-center gap-2 border-t border-[#e5dfd0] px-5 py-4 text-sm font-medium text-[#4d5818] transition hover:bg-[#faf8f1]"
                                >
                                    {user ? "Open storage" : "Sign up to save drafts"}
                                    <ArrowRight className="size-4" strokeWidth={1.8} />
                                </Link>
                            </Panel>

                            <Panel className="overflow-hidden">
                                <div className="p-5">
                                    <SectionHeader title="Actionable next steps" action={user ? "Update profile" : "Sign up"} to={user ? "/profile" : "/signup"} />
                                </div>
                                <div className="divide-y divide-[#eee8dc]">
                                    {nextSteps.map((step) => {
                                        const Icon = step.icon;

                                        return (
                                            <Link
                                                key={step.title}
                                                to={step.to}
                                                className="flex items-start gap-4 px-5 py-4 transition hover:bg-[#faf8f1]"
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                                    <Icon className="size-4" strokeWidth={1.8} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-zinc-950">{step.title}</span>
                                                    <span className="mt-1 block text-sm leading-5 text-zinc-600">{step.description}</span>
                                                </span>
                                                <ChevronRight className="mt-1 size-4 shrink-0 text-zinc-400" strokeWidth={1.8} />
                                            </Link>
                                        );
                                    })}
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
                                        Storage {user ? "summary" : "(Guest)"}
                                    </h2>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {user ? "Generated document links refresh from storage." : "Sign in to save generated documents."}
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
                                    {
                                        label: "Saved documents",
                                        value: currentDashboardData.pagination.total_items,
                                        percent: Math.min(100, currentDashboardData.pagination.total_items * 10),
                                        icon: FileText,
                                    },
                                    {
                                        label: "Active recent",
                                        value: activeDocuments.length,
                                        percent: currentDashboardData.documents.length > 0
                                            ? Math.round((activeDocuments.length / currentDashboardData.documents.length) * 100)
                                            : 0,
                                        icon: Download,
                                    },
                                    {
                                        label: "Expired recent",
                                        value: expiredDocuments.length,
                                        percent: currentDashboardData.documents.length > 0
                                            ? Math.round((expiredDocuments.length / currentDashboardData.documents.length) * 100)
                                            : 0,
                                        icon: Clock3,
                                    },
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
                                <ProgressRing value={completion.percent} label="Complete" size="size-24" />
                                <div className="space-y-2">
                                    {profileItems.map((item) => (
                                        <div key={item.key} className="flex items-center gap-2 text-sm text-zinc-700">
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
                                {completion.missingRequired.length === 0
                                    ? "Required profile sections are ready for profile-based resume generation."
                                    : `Add ${completion.missingRequired[0].label.toLowerCase()} details to improve generated drafts.`}
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
                                        {activeDocuments[0]
                                            ? `Use ${getDocumentRole(activeDocuments[0])} as context for the next targeted packet.`
                                            : "Draft a targeted resume and letter together for a cleaner application record."}
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
