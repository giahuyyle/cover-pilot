import { Link } from "react-router";

export default function Footer() {
    return (
        <footer className="border-t border-[#e4dece] bg-white/78 dark:border-[#383724] dark:bg-[#16170f]/86">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                <Link to="/dashboard" className="flex items-center gap-3">
                    <img src="/logo.svg" alt="Cover Pilot" className="size-10 rounded-md" />
                    <div>
                        <p className="font-semibold tracking-tight text-zinc-950 dark:text-[#f4f1e8]">Cover Pilot</p>
                        <p className="text-xs font-medium text-[#5d681c] dark:text-[#d6efa3]">Application workspace</p>
                    </div>
                </Link>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-[#bcb6a6]">
                    <a href="mailto:cover.pilot@gmail.com" className="transition hover:text-zinc-950 dark:hover:text-white">
                        Contact
                    </a>
                    <a href="https://www.instagram.com/coverpilot" className="transition hover:text-zinc-950 dark:hover:text-white">
                        Instagram
                    </a>
                    <Link to="/terms" className="transition hover:text-zinc-950 dark:hover:text-white">
                        Terms
                    </Link>
                    <Link to="/privacy" className="transition hover:text-zinc-950 dark:hover:text-white">
                        Privacy
                    </Link>
                </div>

                <p className="text-sm text-zinc-500 dark:text-[#8f8979]">2026 Cover Pilot. All rights reserved.</p>
            </div>
        </footer>
    );
}
