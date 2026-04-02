// src/lib/api.js
import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL;
const GUEST_ID_STORAGE_KEY = "coverpilot_guest_id";

function createGuestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `guest_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getOrCreateGuestId() {
    if (typeof window === "undefined") {
        return createGuestId();
    }

    try {
        const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
        if (existing) return existing;

        const created = createGuestId();
        window.localStorage.setItem(GUEST_ID_STORAGE_KEY, created);
        return created;
    } catch {
        return createGuestId();
    }
}

function resolveGuestRequest(path, token) {
    if (token) {
        return { path, guestId: null };
    }

    const guestId = getOrCreateGuestId();
    const separator = path.includes("?") ? "&" : "?";
    return {
        path: `${path}${separator}guest_id=${encodeURIComponent(guestId)}`,
        guestId,
    };
}

export async function apiFetch(path, options = {}) {
    const token = await auth.currentUser?.getIdToken();
    const { path: resolvedPath, guestId } = resolveGuestRequest(path, token);

    const res = await fetch(`${API_URL}${resolvedPath}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(!token && guestId && { "X-Guest-Id": guestId }),
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// Multipart/form-data upload helper; do not set Content-Type so the browser adds the boundary
export async function apiUpload(path, formData, options = {}) {
    const token = await auth.currentUser?.getIdToken();
    const { path: resolvedPath, guestId } = resolveGuestRequest(path, token);

    const res = await fetch(`${API_URL}${resolvedPath}`, {
        method: "POST",
        body: formData,
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(!token && guestId && { "X-Guest-Id": guestId }),
            // Intentionally omit Content-Type
        },
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
