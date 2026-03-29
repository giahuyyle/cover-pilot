import { useState } from "react";
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

const TEMPLATES = [
    { value: "classic", label: "Classic" },
    { value: "modern", label: "Modern" },
    { value: "minimal", label: "Minimal" },
    { value: "academic", label: "Academic" },
];

const MODELS = [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
];

export default function Generator() {
    const [template, setTemplate] = useState(TEMPLATES[0].value);
    const [model, setModel] = useState(MODELS[0].value);
    const [jobDesc, setJobDesc] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resultUrl, setResultUrl] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setResultUrl("");

        if (!file) {
            setError("Please upload your resume PDF.");
            return;
        }
        if (!jobDesc.trim()) {
            setError("Please paste the job description.");
            return;
        }

        const form = new FormData();
        form.append("template", template);
        form.append("pdf", file);
        form.append("job_description", jobDesc);
        // Backend may ignore unknown fields; include model for future support
        form.append("model", model);

        try {
            setLoading(true);
            const data = await apiUpload("/api/generate/", form);
            setResultUrl(data?.pdf_url || "");
        } catch (err) {
            setError(typeof err?.message === "string" ? err.message : "Failed to generate.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 pb-24">
            <header className="mb-8">
                <p className="text-sm font-mono mb-1 text-[rgb(108,144,46)]">{`{ generator }`}</p>
                <h1 className="text-3xl font-bold">Generate Tailored Resume</h1>
                <p className="text-muted-foreground">Upload your resume PDF, choose a template, paste the job description, pick a model, and generate.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Template</label>
                        <Select value={template} onValueChange={setTemplate}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">AI Model</label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                {MODELS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Resume (PDF)</label>
                    <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="file:bg-black file:text-white file:hover:bg-black/90 file:rounded-md file:px-3 file:py-1.5 file:border-0 file:shadow-xs file:cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Max 10MB. PDF only.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Job Description</label>
                    <textarea
                        className="w-full min-h-40 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                        placeholder="Paste the job description here..."
                        value={jobDesc}
                        onChange={(e) => setJobDesc(e.target.value)}
                    />
                </div>

                {error && (
                    <div className="text-sm text-red-600">{error}</div>
                )}

                <div className="flex items-center gap-3">
                    <Button type="submit" className="h-10 px-6 rounded-full" disabled={loading}>
                        {loading ? "Generating..." : "Send"}
                    </Button>
                    {resultUrl && (
                        <a href={resultUrl} target="_blank" rel="noreferrer" className="text-sm underline">
              Open generated PDF
                        </a>
                    )}
                </div>
            </form>
        </div>
    );
}
