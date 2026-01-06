import { put, list, del } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { eventId } = req.query;

  const event = (eventId && typeof eventId === 'string') ? eventId : 'default';

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN belum dikonfigurasi',
    });
  }

  if (req.method === 'GET') {
    try {
      const SETTINGS_KEY = `app-settings-${event}.json`;

      const { blobs } = await list({
        prefix: SETTINGS_KEY,
        token,
      });

      if (blobs.length === 0) {
        return res.status(200).json({
          cutoffMs: null,
          catStartMap: {},
          eventTitle: '',
          dqMap: {},
          eventId: event,
        });
      }

      const latestBlob = blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

      const response = await fetch(latestBlob.url);
      const settings = await response.json();

      return res.status(200).json(settings);
    } catch (error: any) {
      console.error('Get settings error:', error);
      return res.status(500).json({
        error: error.message || 'Gagal mengambil settings',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const settings = req.body;
      const SETTINGS_KEY = `app-settings-${event}.json`; // Add eventId suffix

      const { blobs } = await list({
        prefix: SETTINGS_KEY,
        token,
      });

      for (const blob of blobs) {
        await del(blob.url, { token });
      }

      const blob = await put(SETTINGS_KEY, JSON.stringify(settings), {
        access: 'public',
        contentType: 'application/json',
        token,
      });

      return res.status(200).json({ success: true, url: blob.url });
    } catch (error: any) {
      console.error('Save settings error:', error);
      return res.status(500).json({
        error: error.message || 'Gagal menyimpan settings',
      });
    }
  }

  return res.status(405).json({ error: 'Method tidak diizinkan' });
}

