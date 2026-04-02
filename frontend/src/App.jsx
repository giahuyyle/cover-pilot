import { Navigate, Outlet, Route, Routes } from "react-router";
import { useAuthState } from "react-firebase-hooks/auth";

import RootLayout from "./layouts/RootLayout";
import { auth } from "./lib/firebase";

import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import TemplateMarket from "./pages/TemplateMarket";
import Generator from "./pages/Generator";
import Storage from "./pages/Storage";

function RequireAuth() {
    const [user, loading] = useAuthState(auth);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;

    return <Outlet />;
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* App routes available to guests and authenticated users */}
            <Route element={<RootLayout />}>
                <Route path="/dashboard/*" element={<Dashboard />} />
                <Route path="/templates" element={<TemplateMarket />} />
                <Route path="/generator" element={<Generator />} />

                {/* Auth-only routes */}
                <Route element={<RequireAuth />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/storage" element={<Storage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}

export default App;
