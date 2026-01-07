import { list } from '@vercel/blob';

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

    const { blobs } = await list({
      token,
    });

    const csvKinds = ['master', 'start', 'finish', 'checkpoint'];
    const meta: Array<{ key: string; filename: string; updatedAt: number; rows: number }> = [];

    for (const kind of csvKinds) {
      const kindBlobs = blobs
        .filter((b) => b.pathname.startsWith(`${kind}-`))
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      if (kindBlobs.length > 0) {
        const latest = kindBlobs[0];

        // Try to extract row count from filename or fetch and count
        const response = await fetch(latest.url);
        const text = await response.text();
        const rows = text.split('\n').filter((line) => line.trim().length > 0).length - 1;

        meta.push({
          key: kind,
          filename: latest.pathname.replace(`${kind}-`, '').replace(/^\d+-/, ''),
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
