import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle({ className = "" }) {
    const { resolvedTheme, toggleTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center justify-center rounded-xl border border-[#d8d1c2] bg-white/72 text-zinc-700 shadow-sm backdrop-blur-xl transition hover:border-[#b8be92] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#d8dfb6]/70 dark:border-[#4b4a36] dark:bg-[#202216]/82 dark:text-[#e9e4d7] dark:hover:border-[#8c9650] dark:hover:text-white dark:focus-visible:ring-[#8c9650]/45 ${className}`}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? (
                <Sun className="size-4" strokeWidth={1.8} />
            ) : (
                <Moon className="size-4" strokeWidth={1.8} />
            )}
        </button>
    );
}
