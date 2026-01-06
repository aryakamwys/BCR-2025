import prisma from '../src/lib/prisma';

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
  body: string | null;
  isBase64Encoded: boolean;
}

interface APIResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

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
}

function formatEvent(event: any): Event {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description || '',
    eventDate: event.eventDate.toISOString(),
    location: event.location || '',
    isActive: event.isActive,
    categories: event.categories.map((c: any) => c.name),
    createdAt: event.createdAt.getTime(),
  };
}

export default async function handler(event: APIEvent): Promise<APIResponse> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const eventId = event.queryStringParameters?.eventId;

      if (eventId) {
        const eventRecord = await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!eventRecord) {
          const eventBySlug = await prisma.event.findUnique({
            where: { slug: eventId },
            include: {
              categories: {
                orderBy: { order: 'asc' },
              },
            },
          });

          if (!eventBySlug) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Event not found' }),
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(formatEvent(eventBySlug)),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(formatEvent(eventRecord)),
        };
      } else {
        const events = await prisma.event.findMany({
          include: {
            categories: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(events.map(formatEvent)),
        };
      }
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString())
        : JSON.parse(event.body);

      const { name, description, eventDate, location, isActive, categories } = body;

      if (!name || !eventDate) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name and eventDate are required' }),
        };
      }

      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug;
      let counter = 1;

      let existingEvent = await prisma.event.findUnique({
        where: { slug },
      });

      while (existingEvent) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        existingEvent = await prisma.event.findUnique({
          where: { slug },
        });
      }

      const defaultCategories = categories || ['10K Laki-laki', '10K Perempuan', '5K Laki-Laki', '5K Perempuan'];

      const newEvent = await prisma.event.create({
        data: {
          name,
          slug,
          description,
          eventDate: new Date(eventDate),
          location,
          isActive: isActive !== undefined ? isActive : true,
          categories: {
            create: defaultCategories.map((name: string, order: number) => ({
              name,
              order,
            })),
          },
        },
        include: {
          categories: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formatEvent(newEvent)),
      };
    }

    if (event.httpMethod === 'PUT') {
      const eventId = event.queryStringParameters?.eventId;

      if (!eventId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'eventId is required' }),
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, 'base64').toString())
        : JSON.parse(event.body);

      const { name, description, eventDate, location, isActive } = body;

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(eventDate && { eventDate: new Date(eventDate) }),
          ...(location !== undefined && { location }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          categories: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formatEvent(updatedEvent)),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const eventId = event.queryStringParameters?.eventId;

      if (!eventId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'eventId is required' }),
        };
      }

      await prisma.event.delete({
        where: { id: eventId },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Events API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}
