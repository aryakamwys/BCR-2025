import prisma from '../src/lib/prisma';
import { deleteFile } from '../src/lib/vercelBlobStorage';

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
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const bannerId = event.queryStringParameters?.bannerId;
    const imageUrl = event.queryStringParameters?.imageUrl;

    if (!bannerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'bannerId is required' }),
      };
    }

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'imageUrl is required' }),
      };
    }

    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!banner) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Banner not found' }),
      };
    }

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex((part) => part === 'bcr-race-files');

      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const path = pathParts.slice(bucketIndex + 1).join('/');
        await deleteFile(path);
      }
    } catch (storageError) {
      console.error('Failed to delete file from storage:', storageError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('Delete banner error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
}
