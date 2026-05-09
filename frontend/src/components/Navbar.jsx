import {
    FileText,
    HardDrive,
    LayoutDashboard,
    LayoutTemplate,
    LogIn,
    LogOut,
    Sparkles,
    UserRound,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import ThemeToggle from "@/components/ThemeToggle";

const guestItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Templates", icon: LayoutTemplate, to: "/templates" },
    { label: "Tailor", icon: FileText, to: "/tailor" },
];

const userItems = [
    ...guestItems,
    { label: "Generator", icon: Sparkles, to: "/generator" },
    { label: "Storage", icon: HardDrive, to: "/storage" },
];

function getDisplayName(user) {
    return (user?.displayName || user?.email?.split("@")[0] || "User").trim();
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

export default function Navbar() {
    const [user] = useAuthState(auth);
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const navItems = user ? userItems : guestItems;
    const displayName = getDisplayName(user);
    const initials = getInitials(displayName);

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/dashboard");
    };

    return (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl items-center gap-4">
                <Link
                    to="/dashboard"
                    className="pointer-events-auto flex h-14 shrink-0 items-center gap-3 rounded-xl border border-white/90 bg-white/62 px-3 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:bg-white/78 dark:border-[#474631] dark:bg-[#1c1d13]/76 dark:hover:bg-[#232518]/88"
                >
                    <img src="/logo.svg" alt="Cover Pilot" className="size-10 rounded-md" />
                    <div className="hidden leading-tight sm:block">
                        <span className="block text-base font-semibold tracking-tight text-zinc-950 dark:text-[#f4f1e8]">Cover Pilot</span>
                        <span className="block text-xs font-medium text-[#5d681c] dark:text-[#d6efa3]">Application workspace</span>
                    </div>
                </Link>

                <nav className="nav-scrollbarless pointer-events-auto flex h-14 min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-white/90 bg-white/56 p-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl dark:border-[#474631] dark:bg-[#1c1d13]/72">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);

                        return (
                            <Link
                                key={item.label}
                                to={item.to}
                                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                                    isActive
                                        ? "bg-[#eef2d8] text-[#3f4a14] shadow-sm dark:bg-[#303719] dark:text-[#d6efa3]"
                                        : "text-zinc-600 hover:bg-[#f7f3e8] hover:text-zinc-950 dark:text-[#bcb6a6] dark:hover:bg-[#28291a] dark:hover:text-white"
                                }`}
                            >
                                <Icon className="size-4" strokeWidth={1.8} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                    <ThemeToggle className="h-14 w-14" />
                    {user ? (
                        <>
                            <Link
                                to="/profile"
                                className={`hidden h-14 items-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-[0_4px_30px_rgba(0,0,0,0.10)] transition md:inline-flex ${
                                    pathname.startsWith("/profile")
                                        ? "border-[#b8be92] bg-[#eef2d8] text-[#3f4a14] dark:border-[#8c9650] dark:bg-[#303719] dark:text-[#d6efa3]"
                                        : "border-white/90 bg-white/70 text-zinc-700 backdrop-blur-xl hover:border-[#b8be92] hover:text-zinc-950 dark:border-[#474631] dark:bg-[#1c1d13]/76 dark:text-[#d8d2c3] dark:hover:border-[#8c9650] dark:hover:text-white"
                                }`}
                            >
                                <span className="flex size-6 items-center justify-center rounded-full bg-[#5d681c] text-[10px] font-semibold text-white">
                                    {initials}
                                </span>
                                <span className="max-w-24 truncate">{displayName}</span>
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/90 bg-white/70 text-zinc-600 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:border-[#d5a0a0] hover:bg-[#fff4f2] hover:text-[#9a3412] dark:border-[#474631] dark:bg-[#1c1d13]/76 dark:text-[#bcb6a6] dark:hover:border-[#9a6a50] dark:hover:bg-[#2a1d16] dark:hover:text-[#f0b38e]"
                                aria-label="Log out"
                            >
                                <LogOut className="size-4" strokeWidth={1.8} />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="hidden h-14 items-center gap-2 rounded-xl border border-white/90 bg-white/70 px-3 text-sm font-medium text-zinc-700 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:border-[#b8be92] hover:text-zinc-950 sm:inline-flex dark:border-[#474631] dark:bg-[#1c1d13]/76 dark:text-[#d8d2c3] dark:hover:border-[#8c9650] dark:hover:text-white"
                            >
                                <LogIn className="size-4" strokeWidth={1.8} />
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="inline-flex h-14 items-center gap-2 rounded-xl bg-[#5d681c] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                            >
                                <FileText className="size-4" strokeWidth={1.8} />
                                Sign up
                            </Link>
                        </>
                    )}

                    {user && (
                        <Link
                            to="/profile"
                            className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/90 bg-white/70 text-zinc-600 shadow-[0_4px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl transition hover:border-[#b8be92] hover:text-zinc-950 md:hidden dark:border-[#474631] dark:bg-[#1c1d13]/76 dark:text-[#d8d2c3] dark:hover:border-[#8c9650] dark:hover:text-white"
                            aria-label="Open profile"
                        >
                            <UserRound className="size-4" strokeWidth={1.8} />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
