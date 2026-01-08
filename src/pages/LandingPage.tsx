// src/pages/LandingPage.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLeaderboardClick = () => {
    navigate("/leaderboard");
  };

  return (
    <>
      <Navbar />

      <div className="page">
        {/* Canvas kosong putih - akan diisi content nanti */}
        <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-10">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">
            Ini Landing Page
          </h1>
          <p className="text-base text-gray-600 mb-8">
            progress
          </p>
        </div>
      </div>
    </>
  );
}
