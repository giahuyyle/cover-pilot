import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "@/lib/theme-context";

const THEME_STORAGE_KEY = "coverpilot_theme";

function getStoredTheme() {
    if (typeof window === "undefined") return "system";

    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
        return "system";
    }
}

function getSystemTheme() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolvedTheme) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getStoredTheme);
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);
    const resolvedTheme = theme === "system" ? systemTheme : theme;

    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    useEffect(() => {
        if (theme !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return undefined;
        }

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (event) => setSystemTheme(event.matches ? "dark" : "light");

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, [theme]);

    const setTheme = (nextTheme) => {
        if (!["light", "dark", "system"].includes(nextTheme)) return;

        setThemeState(nextTheme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // Theme persistence is a convenience; the in-memory setting still works.
        }
    };

    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    }), [theme, resolvedTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
