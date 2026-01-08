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
    const eventId = event.queryStringParameters?.eventId || 'default';

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

    const { blobs } = await list({
      token,
    });

    const csvKinds = ['master', 'start', 'finish', 'checkpoint'];
    const meta: Array<{ key: string; filename: string; updatedAt: number; rows: number }> = [];

    for (const kind of csvKinds) {
      const kindBlobs = blobs
        .filter((b) => b.pathname.startsWith(`events/${eventFolderName}/${kind}-`))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      if (kindBlobs.length > 0) {
        const latest = kindBlobs[0];

        const response = await fetch(latest.url);
        const text = await response.text();
        const rows = text.split('\n').filter((line) => line.trim().length > 0).length - 1;

        const cleanFilename = latest.pathname
          .replace(`events/${eventFolderName}/${kind}-`, '')
          .replace(/^\d+-/, '');

        meta.push({
          key: kind,
          filename: cleanFilename,
          updatedAt: new Date(latest.uploadedAt).getTime(),
          rows: Math.max(0, rows),
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(meta),
    };
  } catch (error: any) {
    console.error('List CSV error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Gagal mengambil daftar CSV',
      }),
    };
  }
}
