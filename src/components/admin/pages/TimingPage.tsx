import { useState, useEffect } from "react";

interface TimingPageProps {
  categories: string[];
  onConfigChanged: () => void;
  onDataVersionBump: () => void;
}

const LS_CUTOFF = "imr_cutoff_ms";
const LS_CAT_START = "imr_cat_start_raw";

function loadCutoffMs(): number | null {
  const v = localStorage.getItem(LS_CUTOFF);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function saveCutoffMs(ms: number | null) {
  if (ms == null) localStorage.removeItem(LS_CUTOFF);
  else localStorage.setItem(LS_CUTOFF, String(ms));
}

function loadCatStartMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_CAT_START) || "{}");
  } catch {
    return {};
  }
}

function saveCatStartMap(map: Record<string, string>) {
  localStorage.setItem(LS_CAT_START, JSON.stringify(map));
}

function formatNowAsTimestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${Y}-${M}-${D} ${h}:${m}:${s}.${ms}`;
}

export default function TimingPage({
  categories,
  onConfigChanged,
  onDataVersionBump
}: TimingPageProps) {
  const [cutoffHours, setCutoffHours] = useState(() => {
    const ms = loadCutoffMs();
    if (!ms) return "";
    return String(ms / 3600000);
  });

  const [catStart, setCatStart] = useState<Record<string, string>>(loadCatStartMap());

  // Update catStart when categories change
  useEffect(() => {
    setCatStart(prev => {
      const newMap: Record<string, string> = {};
      categories.forEach(cat => {
        newMap[cat] = prev[cat] || '';
      });
      return newMap;
    });
  }, [categories]);

  const applyCutoff = async () => {
    const h = Number(cutoffHours);
    let ms: number | null = null;
    if (!Number.isFinite(h) || h <= 0) {
      saveCutoffMs(null);
    } else {
      ms = h * 3600000;
      saveCutoffMs(ms);
    }

    onDataVersionBump();
    onConfigChanged();
    alert("Cut off time berhasil diperbarui");
  };

  const applyCatStart = async () => {
    saveCatStartMap(catStart);
    onDataVersionBump();
    onConfigChanged();
    alert(
      "Waktu start kategori berhasil diperbarui.\nTotal time akan menggunakan nilai ini per kategori."
    );
  };

  return (
    <>
      {/* Cut Off Time */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Cut Off Settings</h2>
            <div className="subtle text-sm">
              Cut off time dihitung dari start masing-masing pelari / kategori.
            </div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={applyCutoff}>
            Save Cut Off
          </button>
        </div>

        <div className="admin-cutoff">
          <div className="label">Cut Off Duration (hours)</div>
          <div className="tools">
            <input
              className="search w-full"
              placeholder="e.g. 3.5"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
            />
          </div>
          <div className="subtle text-sm mt-2">Jika kosong / 0 → cut off nonaktif.</div>
        </div>
      </div>

      {/* Category Start Time Overrides */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Category Start Times</h2>
            <div className="subtle text-sm">
              Set start time per kategori. Jika diisi, sistem akan menghitung{" "}
              <b>total time = finish time - start time kategori</b>.
            </div>
          </div>
          <button className="btn w-full sm:w-auto" onClick={applyCatStart}>
            Save Start Times
          </button>
        </div>

        {/* Desktop Table - hidden on mobile */}
        <div className="hidden md:block table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Start Time (datetime)</th>
                <th style={{ width: 200 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">No categories defined yet.</td>
                </tr>
              ) : (
                categories.map((catKey) => (
                  <tr key={catKey} className="row-hover">
                    <td className="name-cell">{catKey}</td>
                    <td>
                      <input
                        className="search"
                        style={{ width: "100%" }}
                        placeholder="contoh: 2025-11-23 07:00:00.000"
                        value={catStart[catKey] || ""}
                        onChange={(e) =>
                          setCatStart((prev) => ({
                            ...prev,
                            [catKey]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn ghost"
                          onClick={() =>
                            setCatStart((prev) => ({
                              ...prev,
                              [catKey]: formatNowAsTimestamp(),
                            }))
                          }
                        >
                          Set Now
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() =>
                            setCatStart((prev) => ({
                              ...prev,
                              [catKey]: "",
                            }))
                          }
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards - visible only on mobile */}
        <div className="md:hidden space-y-3">
          {categories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No categories defined yet.</div>
          ) : (
            categories.map((catKey) => (
              <div key={catKey} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="font-medium text-gray-900 mb-2">{catKey}</div>
                <input
                  className="search w-full mb-2 text-sm"
                  placeholder="2025-11-23 07:00:00.000"
                  value={catStart[catKey] || ""}
                  onChange={(e) =>
                    setCatStart((prev) => ({
                      ...prev,
                      [catKey]: e.target.value,
                    }))
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="btn ghost flex-1 text-sm"
                    onClick={() =>
                      setCatStart((prev) => ({
                        ...prev,
                        [catKey]: formatNowAsTimestamp(),
                      }))
                    }
                  >
                    Set Now
                  </button>
                  <button
                    className="btn ghost flex-1 text-sm"
                    onClick={() =>
                      setCatStart((prev) => ({
                        ...prev,
                        [catKey]: "",
                      }))
                    }
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="subtle text-sm mt-4">
          Gunakan format tanggal &amp; jam yang sama dengan di CSV timing
          (misal: <code>2025-11-23 07:00:00.000</code>). Kamu juga bisa klik <b>Set Now</b>
          untuk mengisi otomatis berdasarkan jam saat ini.
        </div>
      </div>
    </>
  );
}
