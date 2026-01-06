import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../api/events';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  function getEventStatus(event: Event): 'live' | 'upcoming' | 'completed' {
    const now = Date.now();
    const eventDate = new Date(event.eventDate).getTime();

    if (!event.isActive) {
      return 'completed';
    }

    if (eventDate > now) {
      return 'upcoming';
    }

    return 'live';
  }

  function getEventBadge(status: 'live' | 'upcoming' | 'completed') {
    switch (status) {
      case 'live':
        return <span className="badge badge-live">🔴 Live</span>;
      case 'upcoming':
        return <span className="badge badge-upcoming">⏰ Upcoming</span>;
      case 'completed':
        return <span className="badge badge-completed">✅ Completed</span>;
    }
  }

  function getFilteredEvents() {
    let filtered = events;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => getEventStatus(event) === statusFilter);
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading">Loading events...</div>
      </div>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <header className="home-hero">
        <div className="hero-content">
          <h1>BCR Race Platform</h1>
          <p className="hero-subtitle">Professional Race Timing & Real-time Results</p>
          <p className="hero-description">
            Live leaderboard, tracking, and timing system for your running events
          </p>
          <Link to="/create-event" className="btn btn-primary btn-large">
            + Create New Event
          </Link>
        </div>
      </header>

      {/* Search and Filter Section */}
      <section className="search-section">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search events by name, location, or description..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Events
            </button>
            <button
              className={`filter-btn ${statusFilter === 'live' ? 'active' : ''}`}
              onClick={() => setStatusFilter('live')}
            >
              🔴 Live
            </button>
            <button
              className={`filter-btn ${statusFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setStatusFilter('upcoming')}
            >
              ⏰ Upcoming
            </button>
            <button
              className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              ✅ Completed
            </button>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="events-section">
        <h2 className="section-title">
          {statusFilter === 'all' ? 'All Events' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Events`}
          <span className="event-count">({filteredEvents.length})</span>
        </h2>

        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events found.</p>
            {searchTerm && <p>Try adjusting your search or filters.</p>}
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/create-event" className="btn btn-primary">
                Create Your First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event);
              return (
                <div key={event.id} className="event-card">
                  <div className="event-card-header">
                    <h3 className="event-name">{event.name}</h3>
                    {getEventBadge(status)}
                  </div>

                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}

                  <div className="event-meta">
                    <div className="meta-item">
                      <span className="meta-icon">📅</span>
                      <span>{new Date(event.eventDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>

                    {event.location && (
                      <div className="meta-item">
                        <span className="meta-icon">📍</span>
                        <span>{event.location}</span>
                      </div>
                    )}

                    <div className="meta-item">
                      <span className="meta-icon">👥</span>
                      <span>{event.participantCount || 0} participants</span>
                    </div>

                    <div className="meta-item">
                      <span className="meta-icon">🏃</span>
                      <span>{event.categories.length} categories</span>
                    </div>
                  </div>

                  <div className="event-categories">
                    <strong>Categories:</strong>
                    <div className="category-tags">
                      {event.categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="category-tag">
                          {cat}
                        </span>
                      ))}
                      {event.categories.length > 3 && (
                        <span className="category-tag">+{event.categories.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="event-actions">
                    <Link to={`/event/${event.slug}`} className="btn btn-primary btn-block">
                      View Results →
                    </Link>
                    <Link to={`/event/${event.slug}/admin`} className="btn btn-secondary btn-block">
                      Admin Panel
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .home-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .home-hero {
          background: rgba(0, 0, 0, 0.3);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
          backdrop-filter: blur(10px);
        }

        .hero-content h1 {
          font-size: 3rem;
          font-weight: 800;
          margin: 0 0 1rem 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .hero-subtitle {
          font-size: 1.5rem;
          margin: 0 0 0.5rem 0;
          font-weight: 300;
          opacity: 0.95;
        }

        .hero-description {
          font-size: 1.1rem;
          margin: 0 0 2rem 0;
          opacity: 0.9;
        }

        .btn-large {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 50px;
          background: white;
          color: #667eea;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }

        .btn-large:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        .search-section {
          background: white;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .search-controls {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #667eea;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.75rem 1.5rem;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #667eea;
          background: #f9fafb;
        }

        .filter-btn.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .events-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .event-count {
          font-size: 1.2rem;
          font-weight: 400;
          margin-left: 0.5rem;
          opacity: 0.9;
        }

        .empty-state {
          background: white;
          border-radius: 10px;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .event-card {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
        }

        .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .event-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #1f2937;
          flex: 1;
        }

        .badge {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge-live {
          background: #fef2f2;
          color: #dc2626;
          border: 2px solid #dc2626;
        }

        .badge-upcoming {
          background: #fef3c7;
          color: #d97706;
          border: 2px solid #d97706;
        }

        .badge-completed {
          background: #d1fae5;
          color: #059669;
          border: 2px solid #059669;
        }

        .event-description {
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .event-meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4b5563;
        }

        .meta-icon {
          font-size: 1.2rem;
        }

        .event-categories {
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .event-categories strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .category-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-tag {
          background: #f3f4f6;
          color: #4b5563;
          padding: 0.35rem 0.75rem;
          border-radius: 15px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .event-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: block;
        }

        .btn-block {
          width: 100%;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .loading {
          text-align: center;
          padding: 4rem;
          color: white;
          font-size: 1.5rem;
        }

        @media (max-width: 768px) {
          .hero-content h1 {
            font-size: 2rem;
          }

          .hero-subtitle {
            font-size: 1.2rem;
          }

          .events-grid {
            grid-template-columns: 1fr;
          }

          .event-meta {
            grid-template-columns: 1fr;
          }

          .filter-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
