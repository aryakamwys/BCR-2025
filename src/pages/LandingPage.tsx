// src/pages/LandingPage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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

export default function LandingPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [showSignupForm, setShowSignupForm] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Failed to fetch events:', err));
  }, []);

  const faqs = [
    {
      question: "How is ranking calculated?",
      answer: "Rankings are based on your finish time in each event. Faster times earn higher points, and we aggregate your performance across all events to determine your position on the leaderboard."
    },
    {
      question: "Can I join without participating in events?",
      answer: "Yes! You can explore the leaderboard and events map anytime. However, to appear on the leaderboard, you'll need to participate in at least one registered running event."
    },
    {
      question: "Is the ranking fair and anti-cheat?",
      answer: "Absolutely. All results are verified from official event timing systems. We use unique bib numbers and timing checkpoints to ensure accuracy and prevent any manipulation."
    },
    {
      question: "How do I register for events?",
      answer: "Browse our events map to find upcoming races near you. Click on any event to view details and registration information. Each event has its own registration process managed by the event organizer."
    },
    {
      question: "Is BIP Runner free to use?",
      answer: "Yes! BIP Runner is completely free for runners. Explore leaderboards, find events, and track your ranking at no cost."
    }
  ];

  return (
    <>
      <Navbar />

      {/* Hero Section - Mobile Optimized */}
      <section className="relative bg-gradient-to-br from-gray-50 to-white min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)] flex items-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-red-100 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-red-50 rounded-full blur-3xl opacity-40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 sm:py-12 lg:py-16">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in">
            {/* Running Animation */}
            <div className="flex justify-center">
              <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-96 lg:h-96">
                <DotLottieReact
                  src="https://lottie.host/a584c560-c949-418e-b49a-ee9c4217799d/x8OswG47qm.json"
                  loop
                  autoplay
                />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Run. Rank. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500">
                  Be on the Board.
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto px-2">
                Indonesia's running leaderboard + upcoming events map. Track your performance, discover races, and compete with runners nationwide.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 px-4 sm:px-0">
              <button
                onClick={() => navigate('/leaderboard')}
                className="px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 text-sm sm:text-base lg:text-lg"
              >
                View Leaderboard
              </button>
              <button
                onClick={() => navigate('/event')}
                className="px-6 sm:px-8 lg:px-10 py-3 sm:py-3.5 lg:py-4 bg-white text-red-600 font-bold rounded-xl border-2 border-red-600 hover:bg-red-50 transition-all duration-300 shadow-md hover:shadow-lg text-sm sm:text-base lg:text-lg"
              >
                Find Events Near Me
              </button>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-4 sm:gap-6 lg:gap-12 pt-4 sm:pt-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">1,200+</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500">Runners Ranked</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">50+</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500">Events Listed</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">12</div>
                <div className="text-[10px] sm:text-xs lg:text-sm text-gray-500">Cities Covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Map Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2 lg:mb-3">
              Next Event Near You
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">
              Discover upcoming running events across Indonesia. Click on any marker to see event details.
            </p>
          </div>

          {/* Map - Responsive Height */}
          <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-gray-100 mb-6 lg:mb-8 h-[280px] sm:h-[350px] md:h-[400px] lg:h-[450px]">
            <EventMap events={events} onEventClick={(e) => setSelectedEvent(e)} />
          </div>

          {/* Event Cards - Carousel on Mobile, Grid on Desktop */}
          {events.length > 0 && (
            <>
              {/* Mobile Carousel */}
              <div className="sm:hidden">
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
                  {events.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex-shrink-0 w-72 snap-start bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer hover:-translate-y-2"
                    >
                      <div className="h-36 bg-gradient-to-br from-red-500 to-red-600 relative">
                        {event.status && (
                          <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              event.status === 'ongoing'
                                ? 'bg-green-500 text-white'
                                : event.status === 'completed'
                                ? 'bg-gray-500 text-white'
                                : 'bg-yellow-400 text-yellow-900'
                            }`}>
                              {event.status === 'ongoing' ? 'LIVE' : event.status === 'completed' ? 'SELESAI' : 'SEGERA'}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center p-3">
                          <h3 className="text-white text-lg font-bold text-center line-clamp-2">{event.name}</h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm truncate">{event.location || 'Location TBD'}</span>
                        </div>
                        {event.date && (
                          <div className="text-sm text-gray-500 mb-3">{event.date}</div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/event/${event.slug}`);
                          }}
                          className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel Indicators */}
                {events.length > 1 && (
                  <div className="flex justify-center gap-2 mt-2">
                    {events.slice(0, 6).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full bg-gray-300"
                      />
                    ))}
                  </div>
                )}

                {/* Scroll Hint */}
                <div className="flex justify-center items-center gap-2 mt-3 text-gray-400 text-sm">
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Swipe to see more</span>
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Desktop Grid */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {events.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer hover:-translate-y-1 sm:hover:-translate-y-2"
                  >
                    <div className="h-32 sm:h-40 bg-gradient-to-br from-red-500 to-red-600 relative">
                      {event.status && (
                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                            event.status === 'ongoing'
                              ? 'bg-green-500 text-white'
                              : event.status === 'completed'
                              ? 'bg-gray-500 text-white'
                              : 'bg-yellow-400 text-yellow-900'
                          }`}>
                            {event.status === 'ongoing' ? 'LIVE' : event.status === 'completed' ? 'SELESAI' : 'SEGERA'}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
                        <h3 className="text-white text-lg sm:text-xl font-bold text-center line-clamp-2">{event.name}</h3>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm truncate">{event.location || 'Location TBD'}</span>
                      </div>
                      {event.date && (
                        <div className="text-sm text-gray-500 mb-3">{event.date}</div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${event.slug}`);
                        }}
                        className="w-full bg-red-600 text-white py-2 sm:py-2.5 rounded-lg font-bold hover:bg-red-700 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2 lg:mb-3">
              How It Works
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600">
              Three simple steps to get on the leaderboard
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {[
              {
                step: '01',
                title: 'Join Leaderboard',
                description: 'Create your profile and join the Indonesia running community',
                icon: '🏃'
              },
              {
                step: '02',
                title: 'Run / Join Events',
                description: 'Participate in registered running events across Indonesia',
                icon: '🏆'
              },
              {
                step: '03',
                title: 'Get Ranked',
                description: 'Track your performance, earn badges, and climb the leaderboard',
                icon: '⭐'
              }
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl lg:text-5xl mb-2 lg:mb-3">{item.icon}</div>
                  <div className="text-red-600 font-bold text-xs lg:text-sm mb-1 lg:mb-2">STEP {item.step}</div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 lg:mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">{item.description}</p>
                </div>

                {/* Connector Line (Desktop) */}
                {idx < 2 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 lg:-right-5 w-6 lg:w-10 h-0.5 bg-red-200"></div>
                )}
              </div>
            ))}
          </div>

          {/* Running Celebration Animation */}
          <div className="flex justify-center mt-6 lg:mt-8">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 lg:w-64 lg:h-64">
              <DotLottieReact
                src="https://lottie.host/07a5f32b-83de-4ae4-a8b6-5806d75d41fe/knAde8aQgL.lottie"
                loop
                autoplay
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2 lg:mb-3">
              Why BIP Runner Wins
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600">
              Everything you need to track your running journey
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {[
              {
                title: 'Live Rankings',
                description: 'Real-time leaderboard updates as events finish',
                icon: '⚡'
              },
              {
                title: 'City Leaderboards',
                description: 'Compete with runners in your city',
                icon: '🏙️'
              },
              {
                title: 'Verified Results',
                description: 'Official timing data you can trust',
                icon: '✓'
              },
              {
                title: 'Runner Profiles',
                description: 'Track your progress and showcase achievements',
                icon: '👤'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 hover:bg-red-50 transition-all duration-300 hover:-translate-y-1 cursor-default"
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3 lg:mb-4">{feature.icon}</div>
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600 line-clamp-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-10 sm:py-14 lg:py-20 bg-gradient-to-br from-red-600 to-red-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6 lg:mb-8">
            Trusted by Runners Across Indonesia
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-red-50 mb-6 sm:mb-8 lg:mb-10 max-w-2xl mx-auto">
            Join our growing community of passionate runners
          </p>

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
            {['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta', 'Bali'].map((city, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl px-2 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
                <div className="text-base sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1">{Math.floor(Math.random() * 500 + 100)}+</div>
                <div className="text-red-100 text-[10px] sm:text-xs lg:text-sm truncate">{city}</div>
              </div>
            ))}
          </div>

          {/* Avatar Stack - Hidden on very small screens */}
          <div className="hidden sm:flex justify-center gap-1 sm:gap-2 lg:gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {String.fromCharCode(65 + (idx % 26))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 sm:py-14 lg:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2 sm:mb-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-4 sm:px-5 lg:px-6 py-3 sm:py-4 lg:py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors gap-2"
                >
                  <span className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">{faq.question}</span>
                  <svg
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`px-4 sm:px-5 lg:px-6 overflow-hidden transition-all duration-300 ${
                    openFaq === idx ? 'pb-3 sm:pb-4 lg:pb-5' : 'max-h-0'
                  }`}
                >
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 sm:mb-4 lg:mb-6">
            Ready to be on the Board?
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 lg:mb-10">
            Join thousands of runners across Indonesia and start tracking your performance today.
          </p>

          {!showSignupForm ? (
            <button
              onClick={() => setShowSignupForm(true)}
              className="px-8 sm:px-10 lg:px-12 py-3 sm:py-4 lg:py-5 bg-red-600 text-white text-sm sm:text-base lg:text-xl font-bold rounded-xl sm:rounded-2xl hover:bg-red-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Join Waitlist
            </button>
          ) : (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-sm sm:text-base"
                />
                <button
                  onClick={() => {
                    // Handle signup
                    alert(`Thanks! We'll notify ${emailInput} when we launch.`);
                    setEmailInput('');
                    setShowSignupForm(false);
                  }}
                  className="px-6 sm:px-6 lg:px-8 py-3 sm:py-3.5 lg:py-4 bg-red-600 text-white font-bold rounded-lg sm:rounded-xl hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => setShowSignupForm(false)}
                className="mt-3 lg:mt-4 text-gray-500 hover:text-gray-700 text-xs sm:text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="mt-6 sm:mt-8 lg:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 lg:gap-6">
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-red-600 font-bold hover:text-red-700 transition-colors text-sm sm:text-base"
            >
              View Leaderboard →
            </button>
            <button
              onClick={() => navigate('/event')}
              className="text-red-600 font-bold hover:text-red-700 transition-colors text-sm sm:text-base"
            >
              Find Events →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="text-center md:text-left">
              <div className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">BIP Runner</div>
              <p className="text-xs sm:text-sm">Indonesia's Running Leaderboard</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Events</a>
              <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            © 2025 BIP Runner. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Event Modal - Mobile Optimized */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-xl sm:rounded-2xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-40 sm:h-48 md:h-56 bg-gradient-to-br from-red-500 to-red-600 relative rounded-t-xl sm:rounded-t-2xl">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white hover:text-gray-200 text-xl sm:text-2xl md:text-3xl font-bold leading-none z-10 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
              >
                ×
              </button>
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                <div className="text-white text-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{selectedEvent.name}</h2>
                  {selectedEvent.location && (
                    <p className="text-sm sm:text-base md:text-lg text-red-50">{selectedEvent.location}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">
              {selectedEvent.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 sm:mb-2">About This Event</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.date && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Date</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">{selectedEvent.date}</p>
                </div>
              )}

              {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                <div className="mb-5 sm:mb-6 lg:mb-8">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-semibold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedEvent(null);
                  navigate(`/event/${selectedEvent.slug}`);
                }}
                className="w-full bg-red-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 lg:py-4 rounded-lg sm:rounded-xl font-bold hover:bg-red-700 transition-colors text-sm sm:text-base lg:text-lg"
              >
                View Event Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
