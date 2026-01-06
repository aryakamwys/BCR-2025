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

const DEFAULT_CATEGORIES = [
  '10K Laki-laki',
  '10K Perempuan',
  '5K Laki-Laki',
  '5K Perempuan',
];

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
    const eventId = event.queryStringParameters?.eventId;

    if (!eventId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'eventId is required' }),
      };
    }

    if (event.httpMethod === 'GET') {
      const categories = await prisma.category.findMany({
        where: { eventId },
        orderBy: { order: 'asc' },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          categories: categories.map((c) => c.name),
        }),
      };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
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

      const { categories } = body;

      if (!Array.isArray(categories)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'categories must be an array' }),
        };
      }

      if (categories.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'At least one category is required' }),
        };
      }

      await prisma.category.deleteMany({
        where: { eventId },
      });

      await prisma.category.createMany({
        data: categories.map((name: string, order: number) => ({
          eventId,
          name,
          order,
        })),
      });

      const updated = await prisma.category.findMany({
        where: { eventId },
        orderBy: { order: 'asc' },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          categories: updated.map((c) => c.name),
        }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      await prisma.category.deleteMany({
        where: { eventId },
      });

      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((name, order) => ({
          eventId,
          name,
          order,
        })),
      });

      const categories = await prisma.category.findMany({
        where: { eventId },
        orderBy: { order: 'asc' },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          categories: categories.map((c) => c.name),
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Categories API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}
