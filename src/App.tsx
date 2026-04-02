import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import GamePage from "./components/game-page";
import PrintCard from "./components/print-card";
import { ErrorBoundary } from "./components/error-boundary";

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<p>Loading...</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:code" element={<GamePage />} />
          <Route path="/print" element={<PrintCard />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
