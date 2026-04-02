import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function GuestUpsellModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />

            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <p className="text-xs font-mono text-[rgb(108,144,46)]">{`{ unlock-more }`}</p>
                <h2 className="mt-2 text-2xl font-semibold">Continue as guest, or unlock all perks</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                    Create an account to get longer document storage, model choice for generation, and full profile access.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button asChild className="h-10 rounded-full">
                        <Link to="/login" onClick={onClose}>Login</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-10 rounded-full">
                        <Link to="/signup" onClick={onClose}>Sign Up</Link>
                    </Button>
                    <Button type="button" variant="ghost" className="h-10 rounded-full" onClick={onClose}>
                        Continue as Guest
                    </Button>
                </div>
            </div>
        </div>
    );
}
