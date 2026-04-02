import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuthState } from "react-firebase-hooks/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuestUpsellModal from "@/components/GuestUpsellModal";
import { auth } from "@/lib/firebase";

const GUEST_UPSELL_SEEN_KEY = "coverpilot_guest_upsell_seen";
const GUEST_ENTRY_PATHS = ["/dashboard", "/templates", "/generator"];

function isGuestEntryPath(pathname) {
    return GUEST_ENTRY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function RootLayout() {
    const [user, loading] = useAuthState(auth);
    const { pathname } = useLocation();
    const [hasSeenUpsell, setHasSeenUpsell] = useState(() => {
        try {
            return window.sessionStorage.getItem(GUEST_UPSELL_SEEN_KEY) === "1";
        } catch {
            return false;
        }
    });

    const isUpsellOpen = !loading && !user && isGuestEntryPath(pathname) && !hasSeenUpsell;

    const closeUpsell = () => {
        try {
            window.sessionStorage.setItem(GUEST_UPSELL_SEEN_KEY, "1");
        } catch {
            // Ignore storage errors and still close modal.
        }
        setHasSeenUpsell(true);
    };

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Outlet is to render the children element */}
            <main className="min-h-screen pt-40 ">
                <Outlet />
            </main>

            <Footer />
            <GuestUpsellModal isOpen={isUpsellOpen} onClose={closeUpsell} />
        </div>
    );
}
