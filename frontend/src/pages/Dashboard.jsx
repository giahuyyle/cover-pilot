import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function Home() {
    const [user, loading] = useAuthState(auth);

    if (loading) return <p>Loading...</p>;
    if (!user) return <p>Not logged in.</p>;

    return (
        <div className="p-10">
            <h1 className="text-2xl">Welcome, {user.displayName || "User"}</h1>
            <p className="text-gray-500 mt-2">{user.email}</p>
        </div>
    );
};