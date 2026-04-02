import { Home, LayoutTemplate, PenTool, HardDrive, UserRound, LogIn, LogOut, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

const coreItems = [
    { label: "Home", icon: Home, to: "/dashboard" },
    { label: "Templates", icon: LayoutTemplate, to: "/templates" },
    { label: "Generator", icon: Sparkles, to: "/generator" },
    { label: "Editor", icon: PenTool, to: "/editor" },
];

const authenticatedMainItems = [
    { label: "Storage", icon: HardDrive, to: "/storage" },
];

const authenticatedRightItems = [
    { label: "Profile", icon: UserRound, to: "/profile" },
];

export default function Navbar() {
    const [user] = useAuthState(auth);
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const mainItems = user ? [...coreItems, ...authenticatedMainItems] : coreItems;
    const rightItems = user ? authenticatedRightItems : [];

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/dashboard");
    };

    const renderItem = (item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.to);

        return (
            <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1.5">
                <div
                    className={`flex items-center justify-center w-12 h-12 rounded-lg border border-zinc-200 shadow-sm transition ${
                        isActive ? "bg-zinc-200/60" : "bg-white/80 hover:bg-zinc-200/50"
                    }`}
                >
                    <Icon className="h-5 w-5 text-zinc-700" strokeWidth={1.5} />
                </div>
                <span className="text-xs text-zinc-700">{item.label}</span>
            </Link>
        );
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-start justify-between px-4 pt-4">
            <Link to="/dashboard">
                <img src="/logo.svg" alt="logo" className="h-20 w-20 rounded-md" />
            </Link>

            <header>
                <nav
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                        background: "rgba(186, 196, 200, 0.15)",
                        borderRadius: "16px",
                        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                        backdropFilter: "blur(11.9px)",
                        WebkitBackdropFilter: "blur(11.9px)",
                        border: "1px solid rgba(255, 255, 255, 1)",
                    }}
                >
                    {mainItems.map(renderItem)}

                    {/* Divider */}
                    <div className="h-12 w-px bg-zinc-300" />

                    {rightItems.map(renderItem)}

                    {user ? (
                        <button onClick={handleLogout} className="flex flex-col items-center gap-1.5 cursor-pointer">
                            <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-zinc-200 shadow-sm transition bg-white/80 hover:bg-red-100">
                                <LogOut className="h-5 w-5 text-zinc-700" strokeWidth={1.5} />
                            </div>
                            <span className="text-xs text-zinc-700">Logout</span>
                        </button>
                    ) : (
                        <Link to="/login" className="flex flex-col items-center gap-1.5 cursor-pointer">
                            <div
                                className={`flex items-center justify-center w-12 h-12 rounded-lg border border-zinc-200 shadow-sm transition ${
                                    pathname.startsWith("/login")
                                        ? "bg-zinc-200/60"
                                        : "bg-white/80 hover:bg-zinc-200/50"
                                }`}
                            >
                                <LogIn className="h-5 w-5 text-zinc-700" strokeWidth={1.5} />
                            </div>
                            <span className="text-xs text-zinc-700">Login</span>
                        </Link>
                    )}
                </nav>
            </header>
        </div>

    );
}
