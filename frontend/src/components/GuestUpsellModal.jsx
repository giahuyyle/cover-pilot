import { Link } from "react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const perks = [
    "Longer document storage",
    "Provider and model choice",
    "Profile-backed generation context",
];

export default function GuestUpsellModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-zinc-950/48 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            <div className="relative w-full max-w-xl rounded-xl border border-[#ded7c8] bg-[#fffdf8] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                    <Sparkles className="size-5" strokeWidth={1.8} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
                    Save this workspace when you are ready.
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                    Guest mode is open for quick drafting. An account keeps your generated packets, profile details, and model settings together.
                </p>

                <div className="mt-5 grid gap-2">
                    {perks.map((perk) => (
                        <div key={perk} className="flex items-center gap-2 text-sm text-zinc-700">
                            <CheckCircle2 className="size-4 text-[#5d681c]" strokeWidth={1.8} />
                            {perk}
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button asChild className="h-10 rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]">
                        <Link to="/signup" onClick={onClose}>Sign up</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-10 rounded-md border-[#cfc7b7] bg-white">
                        <Link to="/login" onClick={onClose}>Login</Link>
                    </Button>
                    <Button type="button" variant="ghost" className="h-10 rounded-md" onClick={onClose}>
                        Continue guest
                    </Button>
                </div>
            </div>
        </div>
    );
}
