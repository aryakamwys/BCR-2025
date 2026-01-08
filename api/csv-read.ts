import { list } from '@vercel/blob';
import prisma from '../src/lib/prisma';

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  queryStringParameters?: { [key: string]: string };
}

interface APIResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

export default async function handler(event: APIEvent): Promise<APIResponse> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method tidak diizinkan' }),
    };
  }

  try {
    const kind = event.queryStringParameters?.kind;
    const eventId = event.queryStringParameters?.eventId || 'default';

    if (!kind || typeof kind !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Parameter kind tidak ditemukan',
        }),
      };
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'BLOB_READ_WRITE_TOKEN belum dikonfigurasi',
        }),
      };
    }

    let eventFolderName = eventId;
    if (eventId !== 'default') {
      try {
        const eventRecord = await prisma.event.findUnique({
          where: { id: eventId },
          select: { name: true },
        });
        if (eventRecord?.name) {
          eventFolderName = eventRecord.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        }
      } catch {
        eventFolderName = eventId;
      }
    }

    // Use eventId prefix to separate CSV data per event (folder structure)
    const { blobs } = await list({
      prefix: `events/${eventFolderName}/${kind}-`,
      token,
    });

    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    if (!latestBlob) {
      const optionalKinds = ['start', 'checkpoint'];
      if (optionalKinds.includes(kind)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ text: null, filename: null, updatedAt: null, url: null }),
        };
      }
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'CSV tidak ditemukan' }),
      };
    }

    const response = await fetch(latestBlob.url);
    const text = await response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text,
        filename: latestBlob.pathname,
        url: latestBlob.url,
        updatedAt: new Date(latestBlob.uploadedAt).getTime(),
      }),
    };
  } catch (error: any) {
    console.error('Get CSV error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Gagal mengambil CSV',
      }),
    };
  }
}
