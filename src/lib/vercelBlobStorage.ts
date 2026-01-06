import { put, list, del } from '@vercel/blob';
import type { CsvKind } from './config';

const getBlobToken = (): string => {
  if (typeof process !== 'undefined' && process.env?.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }

  throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
};

export type StoredCsvMeta = {
  kind: CsvKind;
  filename: string;
  path: string;
  url: string;
  rows: number;
  updatedAt: number;
};

function getCsvPath(eventId: string, kind: CsvKind): string {
  return `${eventId}/csv/${kind}.csv`;
}

function getCsvMetaPath(eventId: string): string {
  return `${eventId}/csv/_meta.json`;
}

export async function uploadCsvFile(
  eventId: string,
  kind: CsvKind,
  text: string,
  filename: string,
  rows: number
): Promise<StoredCsvMeta> {
  const filePath = getCsvPath(eventId, kind);
  const token = getBlobToken();

  const blob = await put(filePath, text, {
    access: 'public',
    token,
    contentType: 'text/csv',
    allowOverwrite: true,
  });

  const meta: StoredCsvMeta = {
    kind,
    filename,
    path: filePath,
    url: blob.url,
    rows,
    updatedAt: Date.now(),
  };

  await updateCsvMetadata(eventId, kind, meta);

  return meta;
}

async function updateCsvMetadata(
  eventId: string,
  kind: CsvKind,
  meta: StoredCsvMeta
): Promise<void> {
  const metaPath = getCsvMetaPath(eventId);
  const token = getBlobToken();

  let allMeta: Record<string, StoredCsvMeta> = {};
  try {
    const listResult = await list({ token, prefix: eventId + '/csv/' });
    const metaFile = listResult.blobs.find(b => b.url.includes('_meta.json'));

    if (metaFile) {
      // Fetch existing metadata
      const response = await fetch(metaFile.url);
      if (response.ok) {
        allMeta = await response.json();
      }
    }
  } catch {
  }

  allMeta[kind] = meta;

  await put(metaPath, JSON.stringify(allMeta, null, 2), {
    access: 'public',
    token,
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

export async function getCsvFileContent(
  eventId: string,
  kind: CsvKind
): Promise<{ text: string; meta: StoredCsvMeta } | null> {
  const filePath = getCsvPath(eventId, kind);

  try {
    const token = getBlobToken();
    const listResult = await list({ token, prefix: eventId + '/csv/' });

    const csvFile = listResult.blobs.find(b => b.pathname === filePath);

    if (!csvFile) {
      return null;
    }

    const response = await fetch(csvFile.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const text = await response.text();

    const meta = await getCsvMeta(eventId, kind);

    return {
      text,
      meta: meta || {
        kind,
        filename: `${kind}.csv`,
        path: filePath,
        url: csvFile.url,
        rows: 0,
        updatedAt: csvFile.uploadedAt,
      },
    };
  } catch (error: any) {
    console.error(`Error getting CSV ${kind}:`, error);
    return null;
  }
}

// Get metadata for a specific CSV file
export async function getCsvMeta(
  eventId: string,
  kind: CsvKind
): Promise<StoredCsvMeta | null> {
  const token = getBlobToken();

  try {
    const listResult = await list({ token, prefix: eventId + '/csv/' });
    const metaFile = listResult.blobs.find(b => b.pathname.includes('_meta.json'));

    if (!metaFile) return null;

    const response = await fetch(metaFile.url);
    if (!response.ok) return null;

    const allMeta = (await response.json()) as Record<string, StoredCsvMeta>;
    return allMeta[kind] || null;
  } catch {
    return null;
  }
}

export async function listCsvMetadata(eventId: string): Promise<StoredCsvMeta[]> {
  const token = getBlobToken();

  try {
    const listResult = await list({ token, prefix: eventId + '/csv/' });
    const metaFile = listResult.blobs.find(b => b.pathname.includes('_meta.json'));

    if (!metaFile) return [];

    const response = await fetch(metaFile.url);
    if (!response.ok) return [];

    const allMeta = (await response.json()) as Record<string, StoredCsvMeta>;
    return Object.values(allMeta);
  } catch {
    return [];
  }
}

export async function deleteCsvFileFromStorage(
  eventId: string,
  kind: CsvKind
): Promise<void> {
  const token = getBlobToken();
  const filePath = getCsvPath(eventId, kind);

  try {
    await del([filePath], { token });
  } catch {
  }

  const metaPath = getCsvMetaPath(eventId);
  try {
    const listResult = await list({ token, prefix: eventId + '/csv/' });
    const metaFile = listResult.blobs.find(b => b.pathname.includes('_meta.json'));

    if (metaFile) {
      const response = await fetch(metaFile.url);
      if (response.ok) {
        const allMeta = (await response.json()) as Record<string, StoredCsvMeta>;
        delete allMeta[kind];

        // Update metadata file
        await put(metaPath, JSON.stringify(allMeta, null, 2), {
          access: 'public',
          token,
          contentType: 'application/json',
          allowOverwrite: true,
        });
      }
    }
  } catch {
  }
}

export async function deleteAllCsvFiles(eventId: string): Promise<void> {
  const kinds: CsvKind[] = ['master', 'start', 'finish', 'checkpoint'];
  for (const kind of kinds) {
    await deleteCsvFileFromStorage(eventId, kind).catch(() => {});
  }
}

export async function uploadFile(
  eventId: string,
  file: File,
  folder: 'csv' | 'images'
): Promise<{ path: string; url: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${eventId}/${folder}/${fileName}`;

  console.log('Uploading to Vercel Blob:', filePath);

  const blob = await put(filePath, file, {
    access: 'public',
    token: getBlobToken(),
    addRandomSuffix: true, // Add random suffix to avoid conflicts
  });

  return {
    path: filePath,
    url: blob.url,
  };
}

// Upload banner image specifically
export async function uploadBannerImage(
  eventId: string,
  file: File
): Promise<{ path: string; url: string }> {
  return uploadFile(eventId, file, 'images');
}

export async function deleteFile(path: string): Promise<void> {
  await del([path], { token: getBlobToken() });
}

export async function listFiles(eventId: string, folder: 'csv' | 'images'): Promise<string[]> {
  const token = getBlobToken();
  const listResult = await list({ token, prefix: `${eventId}/${folder}/` });

  return listResult.blobs.map(blob => blob.pathname);
}

export async function getFileUrl(path: string): Promise<string> {
  const token = getBlobToken();
  const listResult = await list({ token });

  const file = listResult.blobs.find(b => b.pathname === path);
  return file?.url || '';
}

export function getStorageConfig() {
  return {
    provider: 'vercel-blob',
    hasToken: !!getBlobToken(),
  };
}
