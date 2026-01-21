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

  const handlePrevEvent = () => {
    setCurrentIndex((prev) => prev === 0 ? events.length - 1 : prev - 1);
  };

  const handleNextEvent = () => {
    const maxIndex = Math.max(0, events.length - 3);
    setCurrentIndex((prev) => (prev + 1) % (maxIndex + 1));
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-800">
            Our Running Events
          </h1>
          <p className="text-lg text-gray-600">
            Explore exciting running events across Indonesia
          </p>
        </div>

        {/* Hero Section with Interactive Map */}
        <div className="relative h-[700px] flex-shrink-0 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto rounded-lg overflow-hidden shadow-lg">
          <EventMap events={events} onEventClick={handleEventClick} />
        </div>

        {/* Header and Carousel Section - Below Map */}
        <div className="max-w-7xl mx-auto px-10 py-16">

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">No events available yet.</p>
              <button
                onClick={() => navigate("/leaderboard")}
                className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                View Leaderboard
              </button>
            </div>
          ) : (
            /* Carousel - 3 Cards at Once */
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out gap-6"
                  style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
                >
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="w-1/3 flex-shrink-0"
                    >
                      <div
                        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full"
                        onClick={() => handleEventClick(event)}
                      >
                        {/* Event Header with Gradient */}
                        <div className="h-36 bg-gradient-to-br from-red-500 via-red-600 to-red-700 relative overflow-hidden flex-shrink-0">
                          {/* Decorative circles */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
                          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full"></div>
                          
                          <div className="absolute inset-0 flex items-center justify-center p-4">
                            <div className="text-white text-center">
                              <h3 className="text-xl font-bold mb-2 drop-shadow-lg line-clamp-2 leading-tight">{event.name}</h3>
                              {event.location && (
                                <div className="flex items-center justify-center gap-1 text-red-100">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm font-medium line-clamp-1">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
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
                        <div className="p-5 flex flex-col flex-1">
                          {/* Description */}
                          <div className="mb-4 min-h-[60px]">
                            {event.description ? (
                              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                                {event.description}
                              </p>
                            ) : (
                              <p className="text-gray-400 text-sm leading-relaxed italic">
                                Deskripsi belum tersedia
                              </p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-3"></div>

                          {/* Categories */}
                          <div className="mb-4 flex-1">
                            <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Kategori</p>
                            {event.categories && event.categories.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {event.categories.slice(0, 3).map((cat) => (
                                  <span
                                    key={`${event.id}-${cat}`}
                                    className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-100"
                                  >
                                    {cat}
                                  </span>
                                ))}
                                {event.categories.length > 3 && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                    +{event.categories.length - 3} lainnya
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Tidak ada kategori</span>
                            )}
                          </div>

                          {/* Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLeaderboard(event.slug);
                            }}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Controls */}
              {events.length > 3 && (
                <>
                  <button
                    onClick={handlePrevEvent}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white text-gray-800 w-12 h-12 rounded-full shadow-xl hover:bg-gray-100 transition-all duration-300 flex items-center justify-center text-2xl font-bold z-10"
                  >
                    ←
                  </button>
                  <button
                    onClick={handleNextEvent}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white text-gray-800 w-12 h-12 rounded-full shadow-xl hover:bg-gray-100 transition-all duration-300 flex items-center justify-center text-2xl font-bold z-10"
                  >
                    →
                  </button>
                </>
              )}

              {/* Carousel Indicators */}
              {events.length > 3 && (
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: Math.max(1, events.length - 2) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? 'bg-accent w-8' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Modal/Popup */}
        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-64 bg-gradient-to-br from-red-500 to-red-600 relative">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 text-white hover:text-gray-200 text-3xl font-bold leading-none z-10"
                >
                  ×
                </button>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center px-6">
                    <h2 className="text-4xl font-bold mb-2">{selectedEvent.name}</h2>
                    {selectedEvent.location && (
                      <p className="text-lg text-red-50">{selectedEvent.location}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {selectedEvent.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">About This Event</h3>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.date && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Date</h3>
                    <p className="text-gray-600">{selectedEvent.date}</p>
                  </div>
                )}

                {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.categories.map((cat) => (
                        <span
                          key={`${selectedEvent.id}-modal-${cat}`}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      handleViewLeaderboard(selectedEvent.slug);
                    }}
                    className="flex-1 bg-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
                  >
                    View Leaderboard
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
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
