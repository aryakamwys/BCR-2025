// API endpoint for CSV upload to Vercel Blob storage
import { uploadCsvFile } from '../src/lib/vercelBlobStorage';
import type { CsvKind } from '../src/lib/config';

interface APIEvent {
  httpMethod: string;
  headers: { [key: string]: string };
  body: string | null;
  isBase64Encoded: boolean;
}

interface APIResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

const VALID_KINDS: CsvKind[] = ['master', 'start', 'finish', 'checkpoint'];

export default async function handler(event: APIEvent): Promise<APIResponse> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
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

    const { eventId, kind, content, filename, rows } = body;

    // Validate required fields
    if (!eventId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'eventId is required' }),
      };
    }

    if (!kind || !VALID_KINDS.includes(kind)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `kind must be one of: ${VALID_KINDS.join(', ')}` }),
      };
    }

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'content is required' }),
      };
    }

    // Upload to S3
    const meta = await uploadCsvFile(
      eventId,
      kind as CsvKind,
      content,
      filename || `${kind}.csv`,
      rows || content.split('\n').length - 1
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(meta),
    };
  } catch (error: any) {
    console.error('CSV upload error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));

    const errorMessage = error.message || error.toString() || 'Internal server error';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
}
