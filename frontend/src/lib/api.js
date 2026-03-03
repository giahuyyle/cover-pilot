// src/lib/api.js
import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
    const token = await auth.currentUser?.getIdToken();

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}