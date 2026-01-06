// src/lib/config.ts

// ✅ Default categories (used as fallback)
export const DEFAULT_CATEGORIES = [
  "10K Laki-laki",
  "10K Perempuan",
  "5K Laki-Laki",
  "5K Perempuan",
] as const;

// Legacy support - use DEFAULT_CATEGORIES instead
export const CATEGORY_KEYS = DEFAULT_CATEGORIES;

export type CategoryKey = typeof DEFAULT_CATEGORIES[number];

export const DEFAULT_EVENT_TITLE = "IMR 2025 Timing By IZT Race Technology";

// LocalStorage keys
export const LS_EVENT_TITLE = "imr_event_title";
export const LS_DATA_VERSION = "imr_data_version"; // used to force refresh across tabs

// IndexedDB keys (for CSV file contents)
export const DB_NAME = "imr_timing_db";
export const DB_STORE = "files";

export type CsvKind = "master" | "start" | "finish" | "checkpoint";

export const CSV_KINDS: CsvKind[] = ["master", "start", "finish", "checkpoint"];

// Event-related keys
export const LS_CURRENT_EVENT_ID = "imr_current_event_id";
export const DEFAULT_EVENT_ID = "default";

/**
 * Fetch categories for a specific event from API
 * Falls back to default categories if none configured
 */
export async function getCategoriesForEvent(eventId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/categories?eventId=${encodeURIComponent(eventId)}`);

    if (!response.ok) {
      console.warn(`Failed to load categories for event ${eventId}, using defaults`);
      return [...DEFAULT_CATEGORIES];
    }

    const data = await response.json();
    return data.categories || [...DEFAULT_CATEGORIES];
  } catch (error) {
    console.error('Error loading categories:', error);
    return [...DEFAULT_CATEGORIES];
  }
}
