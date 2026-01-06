// api/categories.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

export interface EventCategories {
  eventId: string;
  categories: string[];
  updatedAt: number;
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
    const { eventId } = req.query;

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'eventId is required' });
    }

    if (req.method === 'GET') {
      const categories = await loadCategories(eventId);
      return res.status(200).setHeaders(corsHeaders).json(categories);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { categories } = req.body;

      if (!Array.isArray(categories)) {
        return res.status(400).json({ error: 'categories must be an array' });
      }

      if (categories.length === 0) {
        return res.status(400).json({ error: 'At least one category is required' });
      }

      const data: EventCategories = {
        eventId,
        categories,
        updatedAt: Date.now(),
      };

      await saveCategories(data);

      return res.status(200).setHeaders(corsHeaders).json(data);
    }

    if (req.method === 'DELETE') {
      const defaultCategories = [
        '10K Laki-laki',
        '10K Perempuan',
        '5K Laki-Laki',
        '5K Perempuan',
      ];

      const data: EventCategories = {
        eventId,
        categories: defaultCategories,
        updatedAt: Date.now(),
      };

      await saveCategories(data);

      return res.status(200).setHeaders(corsHeaders).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function loadCategories(eventId: string): Promise<string[]> {
  try {
    const fileName = `categories-${eventId}.json`;
    const response = await fetch(
      `https://rdr.la/${process.env.BLOB_READ_WRITE_TOKEN}/${fileName}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [
          '10K Laki-laki',
          '10K Perempuan',
          '5K Laki-Laki',
          '5K Perempuan',
        ];
      }
      throw new Error(`Failed to load categories: ${response.statusText}`);
    }

    const data: EventCategories = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Error loading categories:', error);
    return [
      '10K Laki-laki',
      '10K Perempuan',
      '5K Laki-Laki',
      '5K Perempuan',
    ];
  }
}

async function saveCategories(data: EventCategories): Promise<void> {
  try {
    const fileName = `categories-${data.eventId}.json`;
    await put(fileName, JSON.stringify(data), {
      access: 'public',
    });
  } catch (error) {
    console.error('Error saving categories:', error);
    throw error;
  }
}
