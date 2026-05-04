import { ArrowLeft, FolderOpen } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
    return (
        <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 pb-20">
            <section className="w-full rounded-xl border border-[#ded7c8] bg-[#fffdf8] p-8 text-center shadow-[0_18px_55px_rgba(32,31,22,0.06)]">
                <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                    <FolderOpen className="size-7" strokeWidth={1.7} />
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-[#5d681c]">404</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">This page is not in the workspace.</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                    The route may have moved, or it may not exist yet. Head back to your dashboard to keep working.
                </p>
                <Link
                    to="/dashboard"
                    className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#5d681c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                >
                    <ArrowLeft className="size-4" strokeWidth={1.8} />
                    Back to dashboard
                </Link>
            </section>
        </div>
    );
}
