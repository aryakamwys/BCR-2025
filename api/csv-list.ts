import { listCsvMetadata } from '../src/lib/fileStorage';
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

    // Get CSV metadata from local filesystem
    const metaList = await listCsvMetadata(eventFolderName);

    // Transform to expected format
    const result = metaList.map(meta => ({
      key: meta.kind,
      filename: meta.filename,
      updatedAt: meta.updatedAt,
      rows: meta.rows,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
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
