import { Home, LayoutTemplate, PenTool, HardDrive, UserRound, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const mainItems = [
	{ label: "Home", icon: Home, to: "/dashboard" },
	{ label: "Templates", icon: LayoutTemplate, to: "/templates" },
	{ label: "Editor", icon: PenTool, to: "/editor" },
	{ label: "Storage", icon: HardDrive, to: "/storage" },
];

const rightItems = [
	{ label: "Profile", icon: UserRound, to: "/profile" },
];

export default function Navbar() {
	const { pathname } = useLocation();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await signOut(auth);
		navigate("/");
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
		<header className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
			<nav
				className="flex items-center gap-3 px-4 py-3"
				style={{
					background: "rgba(255, 255, 255, 0.36)",
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

				{/* Logout button */}
				<button onClick={handleLogout} className="flex flex-col items-center gap-1.5 cursor-pointer">
					<div className="flex items-center justify-center w-12 h-12 rounded-lg border border-zinc-200 shadow-sm transition bg-white/80 hover:bg-red-100">
						<LogOut className="h-5 w-5 text-zinc-700" strokeWidth={1.5} />
					</div>
					<span className="text-xs text-zinc-700">Logout</span>
				</button>
			</nav>
		</header>
	);
}
