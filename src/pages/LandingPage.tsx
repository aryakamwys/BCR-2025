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

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 to-white min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            {/* Running Animation Above Title */}
            <div className="flex justify-center">
              <div className="w-48 h-48 md:w-64 md:h-64">
                <DotLottieReact
                  src="https://lottie.host/a584c560-c949-418e-b49a-ee9c4217799d/x8OswG47qm.json"
                  loop
                  autoplay
                />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Run. Rank. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-500">
                  Be on the Board.
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto">
                Indonesia's running leaderboard + upcoming events map. Track your performance, discover races, and compete with runners nationwide.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/leaderboard')}
                className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                View Leaderboard
              </button>
              <button
                onClick={() => navigate('/event')}
                className="px-8 py-4 bg-white text-red-600 font-bold rounded-xl border-2 border-red-600 hover:bg-red-50 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Find Events Near Me
              </button>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 pt-8 border-t border-gray-200">
              <div>
                <div className="text-3xl font-bold text-gray-900">1,200+</div>
                <div className="text-sm text-gray-500">Runners Ranked</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">50+</div>
                <div className="text-sm text-gray-500">Events Listed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">12</div>
                <div className="text-sm text-gray-500">Cities Covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Map Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Next Event Near You
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover upcoming running events across Indonesia. Click on any marker to see event details.
            </p>
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100 mb-12">
            <EventMap events={events} onEventClick={(e) => setSelectedEvent(e)} />
          </div>

          {/* Event Cards */}
          {events.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer hover:-translate-y-2"
                >
                  <div className="h-40 bg-gradient-to-br from-red-500 to-red-600 relative">
                    {event.status && (
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <h3 className="text-white text-xl font-bold text-center line-clamp-2">{event.name}</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{event.location || 'Location TBD'}</span>
                    </div>
                    {event.date && (
                      <div className="text-sm text-gray-500 mb-3">{event.date}</div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/event/${event.slug}`);
                      }}
                      className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to get on the leaderboard
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
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
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <div className="text-6xl mb-4">{item.icon}</div>
                  <div className="text-red-600 font-bold text-sm mb-2">STEP {item.step}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>

                {/* Connector Line (Desktop) */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-0.5 bg-red-200"></div>
                )}
              </div>
            ))}
          </div>
          
          {/* Running Celebration Animation */}
          <div className="flex justify-center mt-12">
            <div className="w-64 h-64 md:w-80 md:h-80">
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Why BIP Runner Wins
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to track your running journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                className="bg-gray-50 rounded-2xl p-6 hover:bg-red-50 transition-all duration-300 hover:-translate-y-1 cursor-default"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 bg-gradient-to-br from-red-600 to-red-500 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8">
            Trusted by Runners Across Indonesia
          </h2>
          <p className="text-xl text-red-50 mb-12 max-w-2xl mx-auto">
            Join our growing community of passionate runners
          </p>

          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta', 'Bali'].map((city, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-6">
                <div className="text-3xl font-bold mb-1">{Math.floor(Math.random() * 500 + 100)}+</div>
                <div className="text-red-100 text-sm">{city}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            {Array.from({ length: 20 }).map((_, idx) => (
              <div
                key={idx}
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-sm"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {String.fromCharCode(65 + (idx % 26))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
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
                  className={`px-6 overflow-hidden transition-all duration-300 ${
                    openFaq === idx ? 'pb-5' : 'max-h-0'
                  }`}
                >
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Ready to be on the Board?
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Join thousands of runners across Indonesia and start tracking your performance today.
          </p>

          {!showSignupForm ? (
            <button
              onClick={() => setShowSignupForm(true)}
              className="px-12 py-5 bg-red-600 text-white text-xl font-bold rounded-2xl hover:bg-red-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Join Waitlist
            </button>
          ) : (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                />
                <button
                  onClick={() => {
                    // Handle signup
                    alert(`Thanks! We'll notify ${emailInput} when we launch.`);
                    setEmailInput('');
                    setShowSignupForm(false);
                  }}
                  className="px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => setShowSignupForm(false)}
                className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="mt-12 flex justify-center gap-6">
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-red-600 font-bold hover:text-red-700 transition-colors"
            >
              View Leaderboard →
            </button>
            <button
              onClick={() => navigate('/event')}
              className="text-red-600 font-bold hover:text-red-700 transition-colors"
            >
              Find Events →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-bold text-white mb-2">BIP Runner</div>
              <p className="text-sm">Indonesia's Running Leaderboard</p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Events</a>
              <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2025 BIP Runner. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-56 bg-gradient-to-br from-red-500 to-red-600 relative rounded-t-2xl">
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-200 text-3xl font-bold leading-none z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
              >
                ×
              </button>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="text-white text-center">
                  <h2 className="text-4xl font-bold mb-2">{selectedEvent.name}</h2>
                  {selectedEvent.location && (
                    <p className="text-lg text-red-50">{selectedEvent.location}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8">
              {selectedEvent.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">About This Event</h3>
                  <p className="text-gray-600">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.date && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Date</h3>
                  <p className="text-gray-600">{selectedEvent.date}</p>
                </div>
              )}

              {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold"
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
                className="w-full bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition-colors text-lg"
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
