import { Navigate, Route, Routes } from "react-router";
import { useAuthState } from "react-firebase-hooks/auth";

import RootLayout from "./layouts/RootLayout";
import { auth } from "./lib/firebase";

import { Dashboard, Editor, Landing, Login, NotFound, Profile, Signup, TemplateMarket } from "./pages";

function ProtectedRootLayout() {
  const [user, loading] = useAuthState(auth);

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  return <RootLayout />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes, i.e. only logged in users can access */}
      <Route element={<ProtectedRootLayout />}>
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/templates" element={<TemplateMarket />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/editor/*" element={<Editor />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
