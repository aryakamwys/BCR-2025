import { useState } from "react";
import { useEvent } from "../../../contexts/EventContext";
import { CATEGORY_KEYS } from "../../../lib/config";
import EventDetailPage from "./EventDetailPage";

interface EventsPageProps {
  events: any[];
  onEventsChange: (events: any[]) => void;
}

type EventStatus = 'upcoming' | 'ongoing' | 'completed';

// Helper functions for status styling
function getStatusColor(status?: string): string {
  switch (status) {
    case 'ongoing':
      return '#dcfce7';
    case 'completed':
      return '#f3f4f6';
    case 'upcoming':
    default:
      return '#fef3c7';
  }
}

function getStatusTextColor(status?: string): string {
  switch (status) {
    case 'ongoing':
      return '#166534';
    case 'completed':
      return '#6b7280';
    case 'upcoming':
    default:
      return '#92400e';
  }
}

export default function EventsPage({ events, onEventsChange }: EventsPageProps) {
  const { refreshEvents } = useEvent();
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventLatitude, setNewEventLatitude] = useState('');
  const [newEventLongitude, setNewEventLongitude] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventActive, setNewEventActive] = useState(true);
  const [newEventStatus, setNewEventStatus] = useState<EventStatus>('upcoming');

  // Selected event for detail view
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      alert('Event name is required');
      return;
    }
    if (!newEventDate) {
      alert('Event date is required');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEventName.trim(),
          description: newEventDescription.trim(),
          eventDate: newEventDate,
          location: newEventLocation.trim(),
          latitude: newEventLatitude.trim() ? parseFloat(newEventLatitude.trim()) : null,
          longitude: newEventLongitude.trim() ? parseFloat(newEventLongitude.trim()) : null,
          isActive: newEventActive,
          categories: [...CATEGORY_KEYS],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const event = await response.json();

      // Reset form
      setNewEventName('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventLatitude('');
      setNewEventLongitude('');
      setNewEventDescription('');
      setNewEventActive(true);
      setNewEventStatus('upcoming');
      setShowEventForm(false);

      // Reload events list
      const eventsRes = await fetch('/api/events');
      const eventsData = await eventsRes.json();
      onEventsChange(Array.isArray(eventsData) ? eventsData : []);
      await refreshEvents();

      alert(`Event "${event.name}" created successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: EventStatus) => {
    setUpdatingStatus(eventId);
    try {
      const response = await fetch(`/api/events?eventId=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update event status');
      }

      // Reload events
      const eventsRes = await fetch('/api/events');
      const eventsData = await eventsRes.json();
      onEventsChange(Array.isArray(eventsData) ? eventsData : []);
      await refreshEvents();

      alert(`Event status updated to "${newStatus}"`);
    } catch (error: any) {
      alert(error.message || 'Failed to update event status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const clearForm = () => {
    setShowEventForm(false);
    setNewEventName("");
    setNewEventDate("");
    setNewEventLocation("");
    setNewEventLatitude("");
    setNewEventLongitude("");
    setNewEventDescription("");
    setNewEventActive(true);
  };

  const handleBackFromDetail = async () => {
    setSelectedEvent(null);
    // Refresh events list
    const eventsRes = await fetch('/api/events');
    const eventsData = await eventsRes.json();
    onEventsChange(Array.isArray(eventsData) ? eventsData : []);
    await refreshEvents();
  };

  // Show event detail page if an event is selected
  if (selectedEvent) {
    return (
      <EventDetailPage
        eventId={selectedEvent.id}
        eventSlug={selectedEvent.slug}
        eventName={selectedEvent.name}
        onBack={handleBackFromDetail}
      />
    );
  }

  return (
    <>
      {/* Manage Events */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Manage Events</h2>
            <div className="subtle">Create and manage multiple race events.</div>
          </div>
          <button className="btn" onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? "Cancel" : "+ Create Event"}
          </button>
        </div>

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#e7f3ff',
          border: '1px solid #2196F3',
          borderRadius: '4px',
          color: '#0d47a1',
          fontSize: '14px'
        }}>
          <strong>Info:</strong> Setiap event memiliki kategori dan data CSV sendiri.
          Pilih event dari data table di bawah untuk mengelola event tersebut.
        </div>

        {showEventForm && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Event Name</label>
              <input
                className="search"
                style={{ width: "100%" }}
                placeholder="e.g., Jakarta Marathon 2025"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Event Date</label>
              <input
                type="date"
                className="search"
                style={{ width: "100%" }}
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Location</label>
              <input
                className="search"
                style={{ width: "100%" }}
                placeholder="e.g., Jakarta, Indonesia"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Coordinates (Optional)
              </label>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.5rem" }}>
                For accurate map placement, enter coordinates from Google Maps. Right-click on a location → "What's here?" to get coordinates.
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input
                  className="search"
                  style={{ flex: 1 }}
                  placeholder="Latitude (e.g., -6.9732083)"
                  value={newEventLatitude}
                  onChange={(e) => setNewEventLatitude(e.target.value)}
                />
                <input
                  className="search"
                  style={{ flex: 1 }}
                  placeholder="Longitude (e.g., 107.6308535)"
                  value={newEventLongitude}
                  onChange={(e) => setNewEventLongitude(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Description</label>
              <textarea
                className="search"
                style={{ width: "100%", minHeight: "80px" }}
                placeholder="Brief description of the event..."
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Event Status</label>
              <select
                className="search"
                style={{ width: "100%" }}
                value={newEventStatus}
                onChange={(e) => setNewEventStatus(e.target.value as EventStatus)}
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={newEventActive}
                  onChange={(e) => setNewEventActive(e.target.checked)}
                />
                <span>Event is active</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" onClick={handleCreateEvent}>
                Create Event
              </button>
              <button className="btn ghost" onClick={clearForm}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="f1-table compact">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">No events created yet</td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="row-hover">
                    <td className="name-cell">{evt.name}</td>
                    <td className="mono">{evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : (evt.date || '-')}</td>
                    <td>{evt.location || "-"}</td>
                    <td>
                      <select
                        className="search"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #e5e7eb',
                          background: getStatusColor(evt.status),
                          color: getStatusTextColor(evt.status),
                          cursor: 'pointer',
                        }}
                        value={evt.status || 'upcoming'}
                        onChange={(e) => handleStatusChange(evt.id, e.target.value as EventStatus)}
                        disabled={updatingStatus === evt.id}
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn"
                          onClick={() => setSelectedEvent(evt)}
                        >
                          Manage
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => window.open(`/event/${evt.slug}`, '_blank')}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
