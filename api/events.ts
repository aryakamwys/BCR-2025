// api/events.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';

const EVENTS_FILE = 'events.json';

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  eventDate: string;
  location?: string;
  isActive: boolean;
  createdAt: number;
  categories: string[];
  participantCount?: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  try {
    if (req.method === 'GET') {
      const { eventId } = req.query;

      if (eventId && typeof eventId === 'string') {
        const events = await loadEvents();
        const event = events.find((e) => e.id === eventId || e.slug === eventId);

        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        return res.status(200).setHeaders(corsHeaders).json(event);
      } else {
        const events = await loadEvents();
        return res.status(200).setHeaders(corsHeaders).json(events);
      }
    }

    if (req.method === 'POST') {
      const eventData: Omit<Event, 'id' | 'slug' | 'createdAt'> = req.body;

      if (!eventData.name || !eventData.eventDate) {
        return res.status(400).json({ error: 'Name and eventDate are required' });
      }

      const events = await loadEvents();

      // Generate slug from name
      const baseSlug = eventData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let counter = 1;

      while (events.some((e) => e.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const newEvent: Event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        slug,
        name: eventData.name,
        description: eventData.description || '',
        eventDate: eventData.eventDate,
        location: eventData.location || '',
        isActive: eventData.isActive ?? false,
        categories: eventData.categories || [
          '10K Laki-laki',
          '10K Perempuan',
          '5K Laki-Laki',
          '5K Perempuan',
        ],
        participantCount: 0,
        createdAt: Date.now(),
      };

      events.push(newEvent);
      await saveEvents(events);

      await saveCategories(newEvent.id, newEvent.categories);

      return res.status(201).setHeaders(corsHeaders).json(newEvent);
    }

    if (req.method === 'PUT') {
      const { eventId } = req.query;
      const updates: Partial<Event> = req.body;

      if (!eventId || typeof eventId !== 'string') {
        return res.status(400).json({ error: 'eventId is required' });
      }

      const events = await loadEvents();
      const eventIndex = events.findIndex((e) => e.id === eventId);

      if (eventIndex === -1) {
        return res.status(404).json({ error: 'Event not found' });
      }

      events[eventIndex] = {
        ...events[eventIndex],
        ...updates,
        id: events[eventIndex].id, // Preserve ID
        slug: updates.slug || events[eventIndex].slug, // Preserve slug if not provided
      };

      await saveEvents(events);

      return res.status(200).setHeaders(corsHeaders).json(events[eventIndex]);
    }

    // DELETE - Delete event
    if (req.method === 'DELETE') {
      const { eventId } = req.query;

      if (!eventId || typeof eventId !== 'string') {
        return res.status(400).json({ error: 'eventId is required' });
      }

      const events = await loadEvents();
      const eventIndex = events.findIndex((e) => e.id === eventId);

      if (eventIndex === -1) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Remove event
      events.splice(eventIndex, 1);
      await saveEvents(events);

      try {
        const { blobs } = await list({ prefix: `${eventId}/` });
        await Promise.all(blobs.map((blob) => del(blob.url)));
      } catch (error) {
        console.error('Error deleting event files:', error);
      }

      return res.status(200).setHeaders(corsHeaders).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function loadEvents(): Promise<Event[]> {
  try {
    const response = await fetch(
      `https://rdr.la/${process.env.BLOB_READ_WRITE_TOKEN}/${EVENTS_FILE}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No events yet
      }
      throw new Error(`Failed to load events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error loading events:', error);
    return [];
  }
}

async function saveEvents(events: Event[]): Promise<void> {
  try {
    await put(EVENTS_FILE, JSON.stringify({ events, updatedAt: Date.now() }), {
      access: 'public',
    });
  } catch (error) {
    console.error('Error saving events:', error);
    throw error;
  }
}

async function saveCategories(eventId: string, categories: string[]): Promise<void> {
  try {
    await put(
      `categories-${eventId}.json`,
      JSON.stringify({ eventId, categories, updatedAt: Date.now() }),
      { access: 'public' }
    );
  } catch (error) {
    console.error('Error saving categories:', error);
    throw error;
  }
}
