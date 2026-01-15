// API endpoint for banner delete from local storage
import { deleteFile, deleteFileByUrl } from '../src/lib/fileStorage';
import prisma from '../src/lib/prisma';

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

    const { path, bannerId, url } = body;

    // Delete from local filesystem if path or url provided
    if (path) {
      try {
        await deleteFile(path);
      } catch (error) {
        console.error('Error deleting file from filesystem:', error);
        // Continue even if filesystem delete fails
      }
    } else if (url) {
      try {
        await deleteFileByUrl(url);
      } catch (error) {
        console.error('Error deleting file by URL:', error);
        // Continue even if filesystem delete fails
      }
    }

    // Delete from database if bannerId provided
    if (bannerId) {
      await prisma.banner.delete({
        where: { id: bannerId },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Banner delete error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}
