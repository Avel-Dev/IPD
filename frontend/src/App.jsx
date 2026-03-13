import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("mm_jwt");
  if (!token) return <Navigate to="/" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState(
    () => localStorage.getItem("mm_wallet") || ""
  );

  function handleWalletConnected(address) {
    setWalletAddress(address || "");
  }

  function handleDisconnect() {
    localStorage.removeItem("mm_jwt");
    localStorage.removeItem("mm_wallet");
    setWalletAddress("");
    // Navigate back to login; using replace ensures dashboard isn't in history
    window.history.replaceState(null, "", "/");
    // Force a light reload of the current route so RequireAuth re-evaluates
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="min-h-screen">
      <Navbar walletAddress={walletAddress} onDisconnect={handleDisconnect} />
      <Routes>
        <Route
          path="/"
          element={<Login onWalletConnected={handleWalletConnected} />}
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard
                onDisconnect={handleDisconnect}
                onWalletUpdated={handleWalletConnected}
              />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

