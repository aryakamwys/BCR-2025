// src/pages/UserEventPage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EventMap from "../components/EventMap";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  date?: string;
  categories?: string[];
  status?: 'upcoming' | 'ongoing' | 'completed';
}

export default function UserEventPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch events dari API
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events:', err);
        setLoading(false);
      });
  }, []);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleViewLeaderboard = (eventSlug: string) => {
    navigate(`/event/${eventSlug}`);
  };

  // Get visible cards count based on screen size (we'll use CSS for actual display)
  const getVisibleCards = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 1024) return 2;
      return 3;
    }
    return 3;
  };

  const [visibleCards, setVisibleCards] = useState(getVisibleCards());

  useEffect(() => {
    const handleResize = () => {
      setVisibleCards(getVisibleCards());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePrevEvent = () => {
    setCurrentIndex((prev) => prev === 0 ? Math.max(0, events.length - visibleCards) : prev - 1);
  };

  const handleNextEvent = () => {
    const maxIndex = Math.max(0, events.length - visibleCards);
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  // Calculate translate percentage based on visible cards
  const getTranslateX = () => {
    return currentIndex * (100 / visibleCards);
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="text-center py-6 md:py-12 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-gray-800">
            Our Running Events
          </h1>
          <p className="text-sm md:text-lg text-gray-600">
            Explore exciting running events across Indonesia
          </p>
        </div>

        {/* Hero Section with Interactive Map - More aggressive mobile height reduction */}
        <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[550px] flex-shrink-0 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full rounded-lg overflow-hidden shadow-lg">
          <EventMap events={events} onEventClick={handleEventClick} />
        </div>

        {/* Header and Carousel Section - Below Map */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-6 md:py-12 w-full">

          {loading ? (
            <div className="text-center py-12 md:py-20">
              <div className="inline-block h-10 w-10 md:h-12 md:w-12 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
              <p className="mt-4 text-gray-600 text-sm md:text-base">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 md:py-20 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4 text-sm md:text-base">No events available yet.</p>
              <button
                onClick={() => navigate("/leaderboard")}
                className="bg-accent text-white px-5 py-2.5 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                View Leaderboard
              </button>
            </div>
          ) : (
            /* Responsive Carousel */
            <div className="relative px-1 sm:px-0">
              <div className="overflow-hidden mx-8 sm:mx-10 lg:mx-0">
                <div
                  className="flex transition-transform duration-500 ease-in-out gap-3 md:gap-6"
                  style={{ transform: `translateX(-${getTranslateX()}%)` }}
                >
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="w-full sm:w-1/2 lg:w-1/3 flex-shrink-0"
                    >
                      <div
                        className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full"
                        onClick={() => handleEventClick(event)}
                      >
                        {/* Event Header with Gradient */}
                        <div className="h-28 sm:h-32 md:h-36 bg-gradient-to-br from-red-500 via-red-600 to-red-700 relative overflow-hidden flex-shrink-0">
                          {/* Decorative circles */}
                          <div className="absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full"></div>
                          <div className="absolute -bottom-8 -left-8 w-20 sm:w-24 h-20 sm:h-24 bg-white/5 rounded-full"></div>
                          
                          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
                            <div className="text-white text-center">
                              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1.5 sm:mb-2 drop-shadow-lg line-clamp-2 leading-tight">{event.name}</h3>
                              {event.location && (
                                <div className="flex items-center justify-center gap-1 text-red-100">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs font-medium line-clamp-1">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-md ${
                              event.status === 'ongoing'
                                ? 'bg-green-500 text-white'
                                : event.status === 'completed'
                                ? 'bg-gray-500 text-white'
                                : 'bg-yellow-400 text-yellow-900'
                            }`}>
                              {event.status === 'ongoing' ? 'LIVE' : event.status === 'completed' ? 'SELESAI' : 'SEGERA'}
                            </span>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-1">
                          {/* Description */}
                          <div className="mb-2 sm:mb-3 md:mb-4 min-h-[40px] sm:min-h-[48px] md:min-h-[60px]">
                            {event.description ? (
                              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2">
                                {event.description}
                              </p>
                            ) : (
                              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed italic">
                                Deskripsi belum tersedia
                              </p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-2"></div>

                          {/* Categories */}
                          <div className="mb-2 sm:mb-3 md:mb-4 flex-1">
                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1.5 sm:mb-2 uppercase tracking-wide">Kategori</p>
                            {event.categories && event.categories.length > 0 ? (
                              <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
                                {event.categories.slice(0, 2).map((cat) => (
                                  <span
                                    key={`${event.id}-${cat}`}
                                    className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-red-50 text-red-600 rounded-full text-[10px] sm:text-xs font-semibold border border-red-100"
                                  >
                                    {cat}
                                  </span>
                                ))}
                                {event.categories.length > 2 && (
                                  <span className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] sm:text-xs font-semibold">
                                    +{event.categories.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[10px] sm:text-xs italic">Tidak ada kategori</span>
                            )}
                          </div>

                          {/* Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLeaderboard(event.slug);
                            }}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg"
                          >
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Controls - Fixed positioning for mobile */}
              {events.length > visibleCards && (
                <>
                  <button
                    onClick={handlePrevEvent}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center z-10 border border-gray-200"
                    aria-label="Previous events"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextEvent}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white text-gray-800 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center z-10 border border-gray-200"
                    aria-label="Next events"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Carousel Indicators */}
              {events.length > visibleCards && (
                <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
                  {Array.from({ length: Math.max(1, events.length - visibleCards + 1) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 sm:h-2.5 md:h-3 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? 'bg-accent w-5 sm:w-6 md:w-8' : 'bg-gray-300 hover:bg-gray-400 w-2 sm:w-2.5 md:w-3'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Modal/Popup - Responsive */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white rounded-lg w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-48 sm:h-56 md:h-64 bg-gradient-to-br from-red-500 to-red-600 relative">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white hover:text-gray-200 text-2xl sm:text-3xl font-bold leading-none z-10 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/20"
                >
                  ×
                </button>
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                  <div className="text-white text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{selectedEvent.name}</h2>
                    {selectedEvent.location && (
                      <p className="text-base sm:text-lg text-red-50">{selectedEvent.location}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {selectedEvent.description && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">About This Event</h3>
                    <p className="text-sm sm:text-base text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.date && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Date</h3>
                    <p className="text-sm sm:text-base text-gray-600">{selectedEvent.date}</p>
                  </div>
                )}

                {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.categories.map((cat) => (
                        <span
                          key={`${selectedEvent.id}-modal-${cat}`}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-semibold"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      handleViewLeaderboard(selectedEvent.slug);
                    }}
                    className="flex-1 bg-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition-colors text-sm sm:text-base"
                  >
                    View Leaderboard
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors text-sm sm:text-base"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
