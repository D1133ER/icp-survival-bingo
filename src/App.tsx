import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import GamePage from "./components/game-page";
import PrintCard from "./components/print-card";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:code" element={<GamePage />} />
          <Route path="/print" element={<PrintCard />} />
        </Routes>
      </>
    </Suspense>
  );
}

export default App;
