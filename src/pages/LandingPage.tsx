// src/pages/LandingPage.tsx

import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      {/* Hero Section dengan Background Image */}
      <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-end overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Assets/main.png')" }}
        />

        {/* Overlay gelap untuk teks lebih terbaca */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content di atas background - LEFT ALIGNED */}
        <div className="relative z-10 text-left px-10 md:px-20 max-w-3xl">
          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white drop-shadow-lg whitespace-nowrap">
            Lumpat Lumpatan
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white mb-8 leading-relaxed drop-shadow-md">
            Sit elit feugiat turpis sed integer integer accumsan turpis. Sed suspendisse nec lorem mauris. Pharetra, eu imperdiet ipsum ultrices amet.
          </p>

          {/* Button */}
          <button
            onClick={() => navigate("/leaderboard")}
            className="bg-white text-red-600 border-2 border-red-600 px-8 py-3 rounded font-bold text-base hover:bg-red-600 hover:text-white transition-all duration-300 shadow-lg"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* HR Line Grey */}
      <hr className="border-t border-gray-300" />

      {/* Map Section - 2 Column Layout */}
      <div className="bg-white py-16 px-10 md:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Map Image - Left Column */}
            <div className="order-2 lg:order-1 group">
              <img
                src="/Assets/map.png"
                alt="Event Map"
                className="w-full h-auto rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl cursor-pointer"
              />
            </div>

            {/* Content - Right Column */}
            <div className="order-1 lg:order-2 text-left">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
                Event Route Map
              </h2>
              <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed">
                Explore the challenging route through scenic trails. Check out the map below and get ready for an unforgettable running experience.
              </p>

              {/* Next Event Button */}
              <button
                onClick={() => navigate("/event")}
                className="bg-white text-red-600 border-2 border-red-600 px-8 py-3 rounded font-bold text-base hover:bg-red-600 hover:text-white transition-all duration-300 shadow-lg"
              >
                Next Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
