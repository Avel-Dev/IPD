import React from "react";
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
  const walletAddress = localStorage.getItem("mm_wallet") || "";
  return (
    <div className="min-h-screen">
      <Navbar walletAddress={walletAddress} />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

