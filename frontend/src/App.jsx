import { Routes, Route } from "react-router";
import RootLayout from "./layouts/RootLayout";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
