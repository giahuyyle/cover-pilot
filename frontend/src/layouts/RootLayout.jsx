import { Outlet } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Outlet is to render the children element */}
      <main className="min-h-screen pt-33">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
