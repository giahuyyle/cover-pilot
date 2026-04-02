import { Link } from "react-router";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";

export default function Home() {
    const [user, loading] = useAuthState(auth);

    if (loading) {
        return <p className="mx-auto max-w-5xl px-6 pb-20 text-muted-foreground">Loading...</p>;
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-5xl px-6 pb-20">
                <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                    <p className="text-sm font-mono text-[rgb(108,144,46)]">{`{ guest mode }`}</p>
                    <h1 className="mt-2 text-3xl font-bold text-foreground">Welcome to Cover Pilot</h1>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                        You are currently using guest mode. You can generate resumes now and sign in anytime to unlock longer storage,
                        model choice, and full account features.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild className="rounded-full px-6">
                            <Link to="/generator">Start Generating</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full px-6">
                            <Link to="/login">Login</Link>
                        </Button>
                        <Button asChild variant="ghost" className="rounded-full px-6">
                            <Link to="/signup">Sign Up</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-6 pb-20">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <p className="text-sm font-mono text-[rgb(108,144,46)]">{`{ dashboard }`}</p>
                <h1 className="mt-2 text-3xl font-bold">Welcome, {user.displayName || "User"}</h1>
                <p className="text-muted-foreground mt-2">{user.email}</p>
            </div>
        </div>
    );
}
