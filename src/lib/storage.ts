import type { CsvKind } from './config';

const getEnvVar = (key: string): string | undefined => {
  if (import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  return undefined;
};

const SUPABASE_S3_ENDPOINT = getEnvVar('VITE_SUPABASE_S3_ENDPOINT');
const SUPABASE_S3_BUCKET = getEnvVar('VITE_SUPABASE_S3_BUCKET');

const SUPABASE_URL = SUPABASE_S3_ENDPOINT?.replace('.storage.', '.');
const STORAGE_BUCKET = SUPABASE_S3_BUCKET;

export function getPublicUrl(filePath: string): string {
  if (!SUPABASE_URL || !STORAGE_BUCKET) {
    throw new Error('Missing VITE_SUPABASE_S3_ENDPOINT or VITE_SUPABASE_S3_BUCKET environment variables');
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
}

export function getCsvPublicUrl(eventId: string, kind: CsvKind): string {
  return getPublicUrl(`${eventId}/csv/${kind}.csv`);
}

export function getCsvMetaPublicUrl(eventId: string): string {
  return getPublicUrl(`${eventId}/csv/_meta.json`);
}

export type StoredCsvMeta = {
  kind: CsvKind;
  filename: string;
  path: string;
  url: string;
  rows: number;
  updatedAt: number;
};

export async function fetchCsvContent(
  eventId: string,
  kind: CsvKind
): Promise<{ text: string; meta: StoredCsvMeta } | null> {
  try {
    const response = await fetch(`/api/csv-read?eventId=${encodeURIComponent(eventId)}&kind=${kind}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const data = await response.json();

    if (data.text === null) {
      return {
        text: '',
        meta: data.meta || {
          kind,
          filename: `${kind}.csv`,
          path: `${eventId}/csv/${kind}.csv`,
          url: '',
          rows: 0,
          updatedAt: Date.now()
        }
      };
    }

    return {
      text: data.text,
      meta: {
        kind,
        filename: data.filename || `${kind}.csv`,
        path: `${eventId}/csv/${kind}.csv`,
        url: '',
        rows: data.text.split('\n').length - 1,
        updatedAt: data.updatedAt || Date.now()
      }
    };
  } catch (error: any) {
    console.error(`Error fetching CSV ${kind}:`, error);
    return null;
  }
}

// Fetch CSV metadata from server API
export async function fetchCsvMeta(
  eventId: string,
  kind: CsvKind
): Promise<StoredCsvMeta | null> {
  try {
    const response = await fetch(`/api/csv-read?eventId=${encodeURIComponent(eventId)}&action=list`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const metaList = await response.json() as StoredCsvMeta[];
    return metaList.find(m => m.kind === kind) || null;
  } catch {
    return null;
  }
}

export async function fetchAllCsvMeta(eventId: string): Promise<StoredCsvMeta[]> {
  try {
    const response = await fetch(`/api/csv-read?eventId=${encodeURIComponent(eventId)}&action=list`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return await response.json() as StoredCsvMeta[];
  } catch {
    return [];
  }
}

export async function uploadCsvViaApi(
  eventId: string,
  kind: CsvKind,
  text: string,
  filename: string,
  rows: number
): Promise<StoredCsvMeta> {
  const response = await fetch(`/api/csv-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventId,
      kind,
      content: text,
      filename,
      rows,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to upload CSV');
  }

  return await response.json();
}

export async function uploadBannerViaApi(
  eventId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('eventId', eventId);

  const response = await fetch('/api/banner-upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to upload banner');
  }

  return await response.json();
}

export async function deleteCsvViaApi(
  eventId: string,
  kind: CsvKind
): Promise<void> {
  const response = await fetch(`/api/csv-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventId, kind }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete CSV');
  }
}

export async function deleteBannerViaApi(path: string): Promise<void> {
  const response = await fetch('/api/banner-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete banner');
  }
}
