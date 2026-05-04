import { useEffect, useState } from "react";
import { FileCheck2, FileText, Loader2, PanelRightOpen, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { apiUpload } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const TEMPLATES = [
    { value: "classic", label: "Classic" },
    { value: "modern", label: "Modern" },
    { value: "minimal", label: "Minimal" },
    { value: "academic", label: "Academic" },
    { value: "jakes", label: "Jake's Resume" },
];

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

const GUEST_PROVIDER = "openai";
const GUEST_MODEL = "gpt-5.4-mini";
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

function getModelsForProvider(provider) {
    return PROVIDER_MODELS[provider] || [];
}

function isPdfFile(file) {
    return file.type === PDF_MIME_TYPE || file.name.toLowerCase().endsWith(".pdf");
}

function validateResumeFile(file) {
    if (!file) {
        return "Please upload your resume PDF.";
    }
    if (!isPdfFile(file)) {
        return "Resume must be a PDF file.";
    }
    if (file.size > MAX_RESUME_BYTES) {
        return "Resume PDF must be 10MB or smaller.";
    }
    return "";
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

export default function Generator() {
    const [user, authLoading] = useAuthState(auth);
    const [template, setTemplate] = useState(TEMPLATES[0].value);
    const [provider, setProvider] = useState(GUEST_PROVIDER);
    const [model, setModel] = useState(GUEST_MODEL);
    const [jobDesc, setJobDesc] = useState("");
    const [extraInstructions, setExtraInstructions] = useState("");
    const [file, setFile] = useState(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resultUrl, setResultUrl] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [viewerFailed, setViewerFailed] = useState(false);
    const isGuest = !authLoading && !user;

    useEffect(() => {
        if (isGuest) {
            setProvider(GUEST_PROVIDER);
            setModel(GUEST_MODEL);
        }
    }, [isGuest]);

    const availableModels = getModelsForProvider(provider);
    const hasResult = Boolean(resultUrl);
    const showPreview = hasResult && isPreviewOpen;

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0] || null;
        const fileError = validateResumeFile(selectedFile);

        if (fileError) {
            setFile(null);
            setFileInputKey((prev) => prev + 1);
            setError(fileError);
            return;
        }

        setFile(selectedFile);
        setError("");
    };

    const handleRemoveFile = () => {
        setFile(null);
        setError("");
        setFileInputKey((prev) => prev + 1);
    };

    const handleProviderChange = (nextProvider) => {
        setProvider(nextProvider);
        const nextModels = getModelsForProvider(nextProvider);
        setModel(nextModels[0]?.value || "");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setResultUrl("");
        setIsPreviewOpen(false);
        setViewerFailed(false);

        const fileError = validateResumeFile(file);
        if (fileError) {
            setError(fileError);
            return;
        }
        if (!jobDesc.trim()) {
            setError("Please paste the job description.");
            return;
        }
        if (!provider || !model) {
            setError("Please select an AI provider and model.");
            return;
        }

        const form = new FormData();
        form.append("template", template);
        form.append("pdf", file);
        form.append("job_description", jobDesc);
        form.append("prompt", extraInstructions.trim());

        try {
            setLoading(true);
            const path = `/api/generate/${encodeURIComponent(provider)}/${encodeURIComponent(model)}/`;
            const data = await apiUpload(path, form);
            const nextUrl = data?.pdf_url || "";
            setResultUrl(nextUrl);
            setIsPreviewOpen(Boolean(nextUrl));
            setViewerFailed(false);
        } catch (err) {
            setError(typeof err?.message === "string" ? err.message : "Failed to generate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Generate application packet</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        Upload your resume, paste the role, choose a template, and generate a tailored document for your next application.
                    </p>
                    {isGuest && (
                        <p className="mt-3 max-w-2xl rounded-md border border-[#e5dfd0] bg-[#fffdf8] px-3 py-2 text-sm text-zinc-600">
                            Guest mode uses the default OpenAI model. Sign in to unlock provider and model selection.
                        </p>
                    )}
                </div>

                <FormPanel className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                            <FileCheck2 className="size-5" strokeWidth={1.8} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-zinc-950">Packet readiness</p>
                            <p className="text-xs text-zinc-600">
                                {file ? "Resume attached" : "Waiting for resume"}
                                {" | "}
                                {jobDesc.trim() ? "Role added" : "Role needed"}
                            </p>
                        </div>
                    </div>
                </FormPanel>
            </header>

            <div className={`grid gap-6 ${showPreview ? "xl:grid-cols-[0.82fr_1.18fr]" : "xl:grid-cols-[minmax(0,1fr)_360px]"}`}>
                <FormPanel className="p-5 lg:p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className={`grid gap-4 ${isGuest ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
                            <div className="space-y-2">
                                <FieldLabel>Template</FieldLabel>
                                <Select value={template} onValueChange={setTemplate}>
                                    <SelectTrigger className="h-11 w-full border-[#d9d2c2] bg-white">
                                        <SelectValue placeholder="Select template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEMPLATES.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!isGuest && (
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
                            )}

                            {!isGuest && (
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
                            )}
                        </div>

                        <div className="space-y-2">
                            <FieldLabel>Resume PDF</FieldLabel>
                            <Input
                                key={fileInputKey}
                                id="resume-upload"
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="sr-only"
                            />
                            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[#cfc7b7] bg-[#faf8f1] p-4">
                                <label
                                    htmlFor="resume-upload"
                                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[#5d681c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                                >
                                    <Upload className="size-4" strokeWidth={1.8} />
                                    Choose PDF
                                </label>
                                <p className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                                    {file ? file.name : "No file selected"}
                                </p>
                                {file && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-md border-[#cfc7b7] bg-white"
                                        onClick={handleRemoveFile}
                                    >
                                        <X className="size-4" strokeWidth={1.8} />
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500">PDF only. Maximum file size is 10MB.</p>
                        </div>

                        <div className="space-y-2">
                            <FieldLabel>Job description</FieldLabel>
                            <textarea
                                className="min-h-48 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 py-3 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#9fa76f] focus:ring-3 focus:ring-[#d8dfb6]/50"
                                placeholder="Paste the job description here..."
                                value={jobDesc}
                                onChange={(event) => setJobDesc(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <FieldLabel>Extra instructions</FieldLabel>
                            <textarea
                                className="min-h-28 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 py-3 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#9fa76f] focus:ring-3 focus:ring-[#d8dfb6]/50"
                                placeholder="Example: emphasize customer-facing product launches and quantify team impact."
                                value={extraInstructions}
                                onChange={(event) => setExtraInstructions(event.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button type="submit" className="h-11 rounded-md bg-[#5d681c] px-6 text-white hover:bg-[#4d5818]" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="size-4" strokeWidth={1.8} />
                                        Generate packet
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
                            <div className="flex items-center gap-2">
                                <FileText className="size-4 text-[#5d681c]" strokeWidth={1.8} />
                                <h2 className="text-sm font-semibold text-zinc-950">Generated PDF preview</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="sm" className="rounded-md border-[#cfc7b7] bg-white">
                                    <a href={resultUrl || "#"} target="_blank" rel="noreferrer">Open</a>
                                </Button>
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
                        </div>

                        <div className="p-3">
                            {!viewerFailed && (
                                <iframe
                                    title="generated-resume-preview"
                                    src={resultUrl}
                                    className="h-[78vh] min-h-136 w-full rounded-lg border border-[#ded7c8] bg-white"
                                    onError={() => setViewerFailed(true)}
                                    onLoad={() => setViewerFailed(false)}
                                />
                            )}
                            {viewerFailed && (
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
                            <h2 className="text-base font-semibold text-zinc-950">Generation checklist</h2>
                            <div className="mt-4 space-y-3">
                                {[
                                    { label: "Resume attached", done: Boolean(file) },
                                    { label: "Job post added", done: Boolean(jobDesc.trim()) },
                                    { label: "Template selected", done: Boolean(template) },
                                    { label: "Model selected", done: Boolean(model) },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center justify-between rounded-md border border-[#e5dfd0] bg-white px-3 py-2 text-sm">
                                        <span className="text-zinc-700">{item.label}</span>
                                        <span className={item.done ? "font-medium text-[#5d681c]" : "text-zinc-400"}>
                                            {item.done ? "Ready" : "Needed"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </FormPanel>

                        <FormPanel className="border-[#cbd3ad] bg-[#f4f6e8] p-5">
                            <h2 className="text-base font-semibold text-zinc-950">Output</h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-700">
                                Cover Pilot returns a PDF preview when generation succeeds. Saved user documents also appear in storage while available.
                            </p>
                        </FormPanel>
                    </aside>
                )}
            </div>
        </div>
    );
}
