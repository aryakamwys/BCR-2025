import { upload } from '@vercel/blob/client';
import type { PutBlobResult } from '@vercel/blob';
import type { CsvKind } from './config';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const IS_DEV = import.meta.env.DEV;

export type CsvMeta = {
  key: CsvKind;
  filename: string;
  updatedAt: number;
  rows: number;
};

export type StoredFile = {
  key: string; // Changed from CsvKind to string for compatibility
  text: string;
  filename: string;
  updatedAt: number;
  rows: number;
};

export async function uploadCsvToBlob(
  kind: CsvKind,
  file: File,
  eventId: string = 'default'
): Promise<PutBlobResult> {
  if (IS_DEV) {
    throw new Error('Vercel Blob tidak tersedia di development mode');
  }

  const filename = `${kind}-${Date.now()}-${file.name}`;

  const blob = await upload(filename, file, {
    access: 'public',
    contentType: 'text/csv',
    handleUploadUrl: `${API_BASE}/upload-csv?eventId=${encodeURIComponent(eventId)}`,
    clientPayload: JSON.stringify({ kind }),
  });

  return blob;
}

export async function getCsvFromBlob(
  kind: CsvKind,
  eventId: string = 'default'
): Promise<StoredFile | null> {
  if (IS_DEV) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE}/get-csv?kind=${kind}&eventId=${encodeURIComponent(eventId)}`
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    const data = await response.json();

    if (!data || !data.text) {
      return null;
    }

    const rows = data.text.split('\n').filter((line: string) => line.trim().length > 0).length - 1;

    return {
      key: kind,
      text: data.text,
      filename: data.filename || `${kind}.csv`,
      updatedAt: data.updatedAt,
      rows: Math.max(0, rows),
    };
  } catch {
    return null;
  }
}

export async function listCsvMetaFromBlob(eventId: string = 'default'): Promise<CsvMeta[]> {
  if (IS_DEV) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE}/list-csv?eventId=${encodeURIComponent(eventId)}`
    );

    if (!response.ok) {
      return [];
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return [];
    }

    return await response.json();
  } catch {
    return [];
  }
}

export async function deleteCsvFromBlob(
  kind: CsvKind,
  eventId: string = 'default'
): Promise<void> {
  if (IS_DEV) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/delete-csv?kind=${kind}&eventId=${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json().catch(() => ({ error: 'Gagal menghapus CSV' }));
        throw new Error(error.error || 'Gagal menghapus CSV');
      }
    }
  } catch {
  }
}

export type AppSettings = {
  cutoffMs: number | null;
  catStartMap: Record<string, string>;
  eventTitle: string;
  dqMap: Record<string, boolean>;
  eventId?: string; // Add eventId to settings
};

export async function getSettingsFromBlob(eventId: string = 'default'): Promise<AppSettings | null> {
  if (IS_DEV) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE}/settings?eventId=${encodeURIComponent(eventId)}`
    );

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function saveSettingsToBlob(
  settings: AppSettings,
  eventId: string = 'default'
): Promise<void> {
  if (IS_DEV) {
    return;
  }

  const response = await fetch(
    `${API_BASE}/settings?eventId=${encodeURIComponent(eventId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    }
  );

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json().catch(() => ({ error: 'Gagal menyimpan settings' }));
      throw new Error(error.error || 'Gagal menyimpan settings');
    }
    throw new Error('Gagal menyimpan settings');
  }
}
