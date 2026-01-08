import { del, list } from '@vercel/blob';
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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Get event name for folder structure
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

    // Delete all blobs for this eventId folder and kind
    const { blobs } = await list({
      prefix: `events/${eventFolderName}/${kind}-`,
      token,
    });

    await Promise.all(
      blobs.map((blob) => del(blob.url, { token }))
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Delete CSV error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Gagal menghapus CSV',
      }),
    };
  }
}
