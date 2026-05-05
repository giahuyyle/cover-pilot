import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, Loader2, PanelRightOpen, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/firebase";

const PROVIDERS = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
];

const PROVIDER_MODELS = {
    openai: [
        { value: "gpt-5.4-mini", label: "GPT 5.4 Mini" },
        { value: "gpt-5.2", label: "GPT 5.2" },
    ],
    anthropic: [
        { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
        { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    ],
};

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-5.4-mini";

function getModelsForProvider(provider) {
    return PROVIDER_MODELS[provider] || [];
}

function FieldLabel({ children }) {
    return <label className="text-sm font-semibold text-zinc-900">{children}</label>;
}

function FormPanel({ children, className = "" }) {
    return (
        <section className={`rounded-xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_18px_55px_rgba(32,31,22,0.06)] ${className}`}>
            {children}
        </section>
    );
}

function countItems(value) {
    return Array.isArray(value) ? value.length : 0;
}

function buildProfileStats(profile) {
    return [
        { label: "Work entries", value: countItems(profile?.experience), target: "2-3" },
        { label: "Projects", value: countItems(profile?.projects), target: "2-3" },
        { label: "Education", value: countItems(profile?.education), target: "1+" },
        { label: "Skills", value: countItems(profile?.skills), target: "Role matched" },
    ];
}

function getReadiness(profile) {
    const experienceCount = countItems(profile?.experience);
    const projectCount = countItems(profile?.projects);
    const totalEvidence = experienceCount + projectCount;
    if (!profile) return { label: "Loading", ready: false };
    if (totalEvidence >= 5 && experienceCount >= 2 && projectCount >= 2) return { label: "Strong profile", ready: true };
    if (totalEvidence > 0) return { label: "Best effort", ready: true };
    return { label: "Needs profile data", ready: false };
}

export default function Generator() {
    const [user, authLoading] = useAuthState(auth);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [provider, setProvider] = useState(DEFAULT_PROVIDER);
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [role, setRole] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [jobDesc, setJobDesc] = useState("");
    const [extraInstructions, setExtraInstructions] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [warnings, setWarnings] = useState([]);
    const [resultUrl, setResultUrl] = useState("");
    const [documentName, setDocumentName] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [viewerFailed, setViewerFailed] = useState(false);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        let mounted = true;
        const loadProfile = async () => {
            setProfileLoading(true);
            setProfileError("");
            try {
                const payload = await apiFetch("/api/users/me/");
                if (mounted) setProfile(payload);
            } catch (nextError) {
                if (mounted) setProfileError(nextError?.message || "Failed to load profile.");
            } finally {
                if (mounted) setProfileLoading(false);
            }
        };

        loadProfile();
        return () => {
            mounted = false;
        };
    }, [user]);

    const availableModels = getModelsForProvider(provider);
    const profileStats = useMemo(() => buildProfileStats(profile), [profile]);
    const readiness = useMemo(() => getReadiness(profile), [profile]);
    const hasResult = Boolean(resultUrl);
    const showPreview = hasResult && isPreviewOpen;

    const handleProviderChange = (nextProvider) => {
        setProvider(nextProvider);
        const nextModels = getModelsForProvider(nextProvider);
        setModel(nextModels[0]?.value || "");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setWarnings([]);
        setResultUrl("");
        setDocumentName("");
        setIsPreviewOpen(false);
        setViewerFailed(false);

        if (!role.trim()) {
            setError("Please enter the role you want to apply to.");
            return;
        }
        if (!provider || !model) {
            setError("Please select an AI provider and model.");
            return;
        }

        try {
            setLoading(true);
            const path = `/api/generate/${encodeURIComponent(provider)}/${encodeURIComponent(model)}/`;
            const data = await apiFetch(path, {
                method: "POST",
                body: JSON.stringify({
                    role: role.trim(),
                    company_name: companyName.trim(),
                    job_description: jobDesc.trim(),
                    prompt: extraInstructions.trim(),
                }),
            });
            const nextUrl = data?.pdf_url || "";
            setResultUrl(nextUrl);
            setDocumentName(data?.document_name || "");
            setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
            setIsPreviewOpen(Boolean(nextUrl));
            setViewerFailed(false);
        } catch (err) {
            setError(typeof err?.message === "string" ? err.message : "Failed to generate resume.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 pb-24 text-sm text-zinc-600 sm:px-6 lg:px-8">
                Loading generator...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_380px] lg:items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Generate from profile</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        Create a new Jake-style resume from your saved profile, targeted to the role you want next.
                    </p>
                </div>

                <FormPanel className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                            <UserRound className="size-5" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-950">Profile readiness</p>
                            <p className={`text-xs ${readiness.ready ? "text-[#5d681c]" : "text-zinc-600"}`}>
                                {profileLoading ? "Checking saved profile..." : readiness.label}
                            </p>
                        </div>
                    </div>
                </FormPanel>
            </header>

            <div className={`grid gap-6 ${showPreview ? "xl:grid-cols-[0.82fr_1.18fr]" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
                <FormPanel className="p-5 lg:p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                                <FieldLabel>Role</FieldLabel>
                                <Input
                                    value={role}
                                    onChange={(event) => setRole(event.target.value)}
                                    placeholder="Software Engineer"
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>Company</FieldLabel>
                                <Input
                                    value={companyName}
                                    onChange={(event) => setCompanyName(event.target.value)}
                                    placeholder="Optional"
                                    className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>AI Provider</FieldLabel>
                                <Select value={provider} onValueChange={handleProviderChange}>
                                    <SelectTrigger className="h-11 w-full border-[#d9d2c2] bg-white">
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDERS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>AI Model</FieldLabel>
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger className="h-11 w-full border-[#d9d2c2] bg-white">
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <FieldLabel>Job posting</FieldLabel>
                            <textarea
                                className="min-h-44 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 py-3 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#9fa76f] focus:ring-3 focus:ring-[#d8dfb6]/50"
                                placeholder="Optional. Paste the posting for stronger project and skill selection."
                                value={jobDesc}
                                onChange={(event) => setJobDesc(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <FieldLabel>Extra instructions</FieldLabel>
                            <textarea
                                className="min-h-24 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 py-3 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#9fa76f] focus:ring-3 focus:ring-[#d8dfb6]/50"
                                placeholder="Example: prioritize AI platform work and backend systems."
                                value={extraInstructions}
                                onChange={(event) => setExtraInstructions(event.target.value)}
                            />
                        </div>

                        {profileError && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
                        )}
                        {warnings.length > 0 && (
                            <div className="space-y-2 rounded-md border border-[#e2c56d] bg-[#fff8df] px-3 py-3 text-sm text-[#6b5316]">
                                {warnings.map((warning) => (
                                    <div key={warning} className="flex gap-2">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                                        <span>{warning}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" className="h-11 rounded-md bg-[#5d681c] px-6 text-white hover:bg-[#4d5818]" disabled={loading || profileLoading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="size-4" strokeWidth={1.8} />
                                        Generate resume
                                    </>
                                )}
                            </Button>
                            {hasResult && !showPreview && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-md border-[#cfc7b7] bg-white"
                                    onClick={() => {
                                        setViewerFailed(false);
                                        setIsPreviewOpen(true);
                                    }}
                                >
                                    <PanelRightOpen className="size-4" strokeWidth={1.8} />
                                    Show preview
                                </Button>
                            )}
                            {hasResult && (
                                <Button asChild variant="link" className="h-11 px-0 text-[#4d5818]">
                                    <a href={resultUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                                </Button>
                            )}
                        </div>
                    </form>
                </FormPanel>

                {showPreview ? (
                    <FormPanel className="overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd0] bg-[#faf8f1] px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="size-4 shrink-0 text-[#5d681c]" strokeWidth={1.8} />
                                <h2 className="truncate text-sm font-semibold text-zinc-950">{documentName || "Generated resume"}</h2>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-md"
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                        <div className="p-3">
                            {!viewerFailed ? (
                                <iframe
                                    title="generated-profile-resume-preview"
                                    src={resultUrl}
                                    className="h-[78vh] min-h-136 w-full rounded-lg border border-[#ded7c8] bg-white"
                                    onError={() => setViewerFailed(true)}
                                    onLoad={() => setViewerFailed(false)}
                                />
                            ) : (
                                <div className="rounded-lg border border-[#ded7c8] bg-white p-4 text-sm text-zinc-600">
                                    Inline PDF preview is unavailable in this browser or for this file URL.{" "}
                                    <a href={resultUrl} target="_blank" rel="noreferrer" className="font-medium text-[#4d5818] underline">
                                        Open it in a new tab.
                                    </a>
                                </div>
                            )}
                        </div>
                    </FormPanel>
                ) : (
                    <aside className="space-y-4">
                        <FormPanel className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold text-zinc-950">Profile evidence</h2>
                                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                                        The generator chooses the closest work and project entries from saved profile data.
                                    </p>
                                </div>
                                <Button asChild variant="outline" size="sm" className="rounded-md border-[#cfc7b7] bg-white">
                                    <Link to="/profile">Edit</Link>
                                </Button>
                            </div>
                            <div className="mt-4 space-y-3">
                                {profileStats.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between rounded-md border border-[#e5dfd0] bg-white px-3 py-2 text-sm">
                                        <span className="text-zinc-700">{item.label}</span>
                                        <span className="font-medium text-zinc-900">{item.value} / {item.target}</span>
                                    </div>
                                ))}
                            </div>
                        </FormPanel>

                        <FormPanel className="border-[#cbd3ad] bg-[#f4f6e8] p-5">
                            <h2 className="text-base font-semibold text-zinc-950">Selection rule</h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-700">
                                When enough evidence exists, the API asks for 2-3 work experiences and 2-3 projects, five entries total.
                            </p>
                        </FormPanel>
                    </aside>
                )}
            </div>
        </div>
    );
}
