import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  eventDate: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

interface EventContextType {
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;
  events: Event[];
  setEvents: (events: Event[]) => void;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  const refreshEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      const activeEvents = data.events || [];

      setEvents(activeEvents);

      // Set current event if not set or if current event is no longer active
      if (!currentEvent && activeEvents.length > 0) {
        // Default to first active event or create default event
        const defaultEvent = activeEvents.find((e: Event) => e.slug === 'default') || activeEvents[0];
        setCurrentEvent(defaultEvent);
      } else if (currentEvent) {
        // Verify current event still exists
        const stillExists = activeEvents.find((e: Event) => e.id === currentEvent.id);
        if (!stillExists && activeEvents.length > 0) {
          setCurrentEvent(activeEvents[0]);
        }
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  return (
    <EventContext.Provider value={{ currentEvent, setCurrentEvent, events, setEvents, refreshEvents }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
