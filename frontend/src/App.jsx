import { Routes, Route } from "react-router";
import RootLayout from "./layouts/RootLayout";

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
      </Route>
    </Routes>
  );
}

export default App;
