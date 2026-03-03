import { Outlet } from "react-router";

export default function RootLayout() {
  return (
    <div className="">

      {/* Outlet is to render the children element */}
      <main className="">
        <Outlet />
      </main>

    </div>
  );
}
