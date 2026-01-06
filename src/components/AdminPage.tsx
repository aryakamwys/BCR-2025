import React, { useEffect, useMemo, useState } from "react";
import type { LeaderRow } from "./LeaderboardTable";
import { CATEGORY_KEYS, DEFAULT_EVENT_TITLE, LS_DATA_VERSION, LS_EVENT_TITLE, type CsvKind, getCategoriesForEvent } from "../lib/config";
import { putCsvFile, deleteCsvFile, listCsvMeta } from "../lib/idb";
import { parseCsv, countDataRows } from "../lib/csvParse";
import CategoryManager from "./CategoryManager";
import { uploadBannerViaApi } from "../lib/storage";
import { useEvent } from "../contexts/EventContext";

const ADMIN_USER = "izbat@izbat.org";
const ADMIN_PASS = "12345678";

const LS_AUTH = "imr_admin_authed";
const LS_CUTOFF = "imr_cutoff_ms";
const LS_DQ = "imr_dq_map";
const LS_CAT_START = "imr_cat_start_raw";

function loadAuth() {
  return localStorage.getItem(LS_AUTH) === "true";
}
function saveAuth(v: boolean) {
  localStorage.setItem(LS_AUTH, v ? "true" : "false");
}

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

function loadDQMap(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_DQ) || "{}");
  } catch {
    return {};
  }
}
function saveDQMap(map: Record<string, boolean>) {
  localStorage.setItem(LS_DQ, JSON.stringify(map));
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

export default function AdminPage({
  allRows,
  onConfigChanged,
  eventId,
}: {
  allRows: LeaderRow[];
  onConfigChanged: () => void;
  eventId?: string;
}) {
  const { refreshEvents } = useEvent();
  const [authed, setAuthed] = useState(loadAuth());
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const [cutoffHours, setCutoffHours] = useState(() => {
    const ms = loadCutoffMs();
    if (!ms) return "";
    return String(ms / 3600000);
  });

  const [q, setQ] = useState("");
  const [dqMap, setDqMap] = useState<Record<string, boolean>>(loadDQMap());
  const [catStart, setCatStart] = useState<Record<string, string>>(
    loadCatStartMap()
  );

  const [eventTitle, setEventTitle] = useState<string>(() =>
    localStorage.getItem(LS_EVENT_TITLE) || DEFAULT_EVENT_TITLE
  );

  const [categories, setCategories] = useState<string[]>([...CATEGORY_KEYS]);

  // Event management state
  const [events, setEvents] = useState<any[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventActive, setNewEventActive] = useState(true);

  // Banner management state
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerAlt, setBannerAlt] = useState('');
  const [bannerOrder, setBannerOrder] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [csvMeta, setCsvMeta] = useState<
    Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>
  >([]);

  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  useEffect(() => {
    (async () => {
      try {
        const meta = await listCsvMeta(eventId);
        setCsvMeta(meta as any);
      } catch {
      }

      // Load categories for this event
      if (eventId) {
        try {
          const cats = await getCategoriesForEvent(eventId);
          setCategories(cats);
        } catch (error) {
        }
      }
    })();
  }, [authed, eventId]);

  const refreshCsvMeta = async () => {
    try {
      const meta = await listCsvMeta(eventId);
      setCsvMeta(meta as any);
    } catch (error) {
    }
  };

  const saveEventTitle = async () => {
    const t = (eventTitle || "").trim();
    localStorage.setItem(LS_EVENT_TITLE, t || DEFAULT_EVENT_TITLE);
    bumpDataVersion();
    onConfigChanged();
    alert("Judul event berhasil diperbarui");
  };

  const uploadCsv = async (kind: CsvKind, file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);

    if (!grid || grid.length === 0) {
      alert(`CSV '${kind}': File kosong atau tidak valid.`);
      return;
    }

    const headers = (grid[0] || []).map((x) => String(x || "").trim());

    // Normalize headers untuk matching (sama seperti di data.ts)
    function norm(s: string) {
      return String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\n/g, " ")
        .trim();
    }

    const headersNorm = headers.map(norm);

    // Menggunakan headerAliases yang sama dengan data.ts
    const headerAliases: Record<string, string[]> = {
      epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
      bib: ["bib", "no bib", "bib number", "race bib", "nomor bib", "no. bib"],
      name: ["nama lengkap", "full name", "name", "nama", "participant name"],
      gender: ["jenis kelamin", "gender", "sex", "jk", "kelamin"],
      category: ["kategori", "category", "kelas", "class"],
      times: ["times", "time", "timestamp", "start time", "finish time", "jam", "checkpoint time", "cp time"],
    };

    // Validasi untuk Master CSV
    if (kind === "master") {
      const epcAliases = headerAliases.epc.map(norm);
      const hasEpc = headersNorm.some((h) =>
        epcAliases.some((alias) => h === alias || h.includes(alias))
      );

      if (!hasEpc) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom EPC tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format Master CSV harus memiliki kolom:\n` +
          `- EPC (atau UID, Tag, RFID, Chip EPC)\n` +
          `- NO BIB (atau BIB, Bib Number)\n` +
          `- Nama Lengkap (atau Name, Nama)\n` +
          `- Gender (atau Jenis Kelamin, JK)\n` +
          `- Kategori (atau Category, Kelas)\n\n` +
          `Catatan: CSV yang diupload sepertinya adalah hasil export leaderboard.\n` +
          `Master CSV harus berisi data peserta dengan kolom EPC untuk matching.`
        );
        return;
      }
    }

    // Validasi untuk Start, Finish, Checkpoint CSV
    if (kind !== "master") {
      const epcAliases = headerAliases.epc.map(norm);
      const timesAliases = headerAliases.times.map(norm);

      const hasEpc = headersNorm.some((h) =>
        epcAliases.some((alias) => h === alias || h.includes(alias))
      );
      const hasTimes = headersNorm.some((h) =>
        timesAliases.some((alias) => h === alias || h.includes(alias))
      );

      if (!hasEpc) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom EPC tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format CSV '${kind}' harus memiliki:\n` +
          `- EPC (atau UID, Tag, RFID)\n` +
          `- Times (atau Time, Timestamp, Jam)`
        );
        return;
      }

      if (!hasTimes) {
        const headerList = headers.length > 0 ? headers.join(", ") : "(tidak ada header)";
        alert(
          `CSV '${kind}': kolom Times/Time tidak ditemukan.\n\n` +
          `Kolom yang ditemukan: ${headerList}\n\n` +
          `Format CSV '${kind}' harus memiliki:\n` +
          `- EPC (atau UID, Tag, RFID)\n` +
          `- Times (atau Time, Timestamp, Jam)`
        );
        return;
      }
    }

    const rows = countDataRows(grid);

    await putCsvFile({ kind, text, filename: file.name, rows, eventId });

    bumpDataVersion();
    onConfigChanged();
    await refreshCsvMeta();
    alert(`'${kind}' berhasil diupload (${rows} baris)`);
  };

  const clearAllCsv = async () => {
    if (!confirm("Reset semua CSV yang sudah diupload?")) return;
    for (const k of ["master", "start", "finish", "checkpoint"] as CsvKind[]) {
      await deleteCsvFile(k, eventId);
    }
    bumpDataVersion();
    onConfigChanged();
    await refreshCsvMeta();
    alert("Semua CSV yang diupload telah dihapus");
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return allRows;
    return allRows.filter(
      (r) =>
        (r.bib || "").toLowerCase().includes(qq) ||
        (r.name || "").toLowerCase().includes(qq)
    );
  }, [q, allRows]);

  const metaByKind = useMemo(() => {
    const m: Partial<Record<CsvKind, { filename: string; updatedAt: number; rows: number }>> = {};
    csvMeta.forEach((x) => {
      m[x.key] = { filename: x.filename, updatedAt: x.updatedAt, rows: x.rows };
    });
    return m;
  }, [csvMeta]);

  const login = () => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      saveAuth(true);
      setAuthed(true);
    } else {
      alert("Kredensial tidak valid");
    }
  };


  const logout = () => {
    saveAuth(false);
    setAuthed(false);
  };

  const applyCutoff = async () => {
    const h = Number(cutoffHours);
    let ms: number | null = null;
    if (!Number.isFinite(h) || h <= 0) {
      saveCutoffMs(null);
    } else {
      ms = h * 3600000;
      saveCutoffMs(ms);
    }

    onConfigChanged();
    alert("Cut off time berhasil diperbarui");
  };

  const toggleDQ = async (epc: string) => {
    const next = { ...dqMap, [epc]: !dqMap[epc] };
    if (!next[epc]) delete next[epc];
    setDqMap(next);
    saveDQMap(next);
    onConfigChanged();
  };

  const applyCatStart = async () => {
    saveCatStartMap(catStart);
    onConfigChanged();
    alert(
      "Waktu start kategori berhasil diperbarui.\nTotal time akan menggunakan nilai ini per kategori."
    );
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
    }
  };

  const createEvent = async () => {
    if (!newEventName.trim()) {
      alert('Event name is required');
      return;
    }
    if (!newEventDate) {
      alert('Event date is required');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEventName.trim(),
          description: newEventDescription.trim(),
          eventDate: newEventDate,
          location: newEventLocation.trim(),
          isActive: newEventActive,
          categories: [...CATEGORY_KEYS],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const event = await response.json();

      // Reset form
      setNewEventName('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventDescription('');
      setNewEventActive(true);
      setShowEventForm(false);

      // Reload events list
      await loadEvents();
      await refreshEvents();

      alert(`Event "${event.name}" created successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  // Load events when authenticated
  useEffect(() => {
    if (authed) {
      loadEvents();
      loadBanners();
    }
  }, [authed, eventId]);

  const loadBanners = async () => {
    if (!eventId) return;
    try {
      const response = await fetch(`/api/banners?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      }
    } catch (error) {
    }
  };

  const handleBannerUpload = async () => {
    if (!bannerFile) {
      alert('Please select an image file');
      return;
    }
    if (!eventId) {
      alert('Event ID is required');
      return;
    }

    setUploadingBanner(true);

    try {
      const result = await uploadBannerViaApi(eventId, bannerFile);

      setBannerFile(null);
      setBannerAlt('');
      setBannerOrder(0);
      const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await loadBanners();

      alert('Banner uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const toggleBannerActive = async (bannerId: string) => {
    try {
      const banner = banners.find((b: any) => b.id === bannerId);
      if (!banner) return;

      const response = await fetch('/api/update-banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bannerId,
          isActive: !banner.isActive,
        }),
      });

      if (response.ok) {
        await loadBanners();
      }
    } catch (error) {
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const response = await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadBanners();
        alert('Banner deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete banner');
    }
  };

  if (!authed) {
    return (
      <div className="card">
        <h2 className="section-title">Admin Login</h2>
        <div className="subtle">Akses terbatas</div>

        <div className="admin-login">
          <input
            className="search"
            placeholder="Username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <input
            className="search"
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button className="btn" onClick={login}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Event Title */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Event Settings</h2>
            <div className="subtle">Ubah judul event yang tampil di halaman leaderboard.</div>
          </div>
          <button className="btn" onClick={saveEventTitle}>
            Save Title
          </button>
        </div>

        <div className="admin-cutoff">
          <div className="label">Event Title</div>
          <div className="tools">
            <input
              className="search"
              style={{ width: "100%" }}
              placeholder={DEFAULT_EVENT_TITLE}
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Manage Events - New Section */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Manage Events</h2>
            <div className="subtle">Create and manage multiple race events.</div>
          </div>
          <button className="btn" onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? "Cancel" : "+ Create Event"}
          </button>
        </div>

        {showEventForm && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Event Name</label>
              <input
                className="search"
                style={{ width: "100%" }}
                placeholder="e.g., Jakarta Marathon 2025"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Event Date</label>
              <input
                type="date"
                className="search"
                style={{ width: "100%" }}
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Location</label>
              <input
                className="search"
                style={{ width: "100%" }}
                placeholder="e.g., Jakarta, Indonesia"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Description</label>
              <textarea
                className="search"
                style={{ width: "100%", minHeight: "80px" }}
                placeholder="Brief description of the event..."
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={newEventActive}
                  onChange={(e) => setNewEventActive(e.target.checked)}
                />
                <span>Event is active</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" onClick={createEvent}>
                Create Event
              </button>
              <button className="btn ghost" onClick={() => {
                setShowEventForm(false);
                setNewEventName("");
                setNewEventDate("");
                setNewEventLocation("");
                setNewEventDescription("");
                setNewEventActive(true);
              }}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="f1-table compact">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">No events created yet</td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="row-hover">
                    <td className="name-cell">{evt.name}</td>
                    <td className="mono">{new Date(evt.eventDate).toLocaleDateString()}</td>
                    <td>{evt.location || "-"}</td>
                    <td>
                      <span className={`badge ${evt.isActive ? 'badge-live' : 'badge-completed'}`}>
                        {evt.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn ghost"
                        onClick={() => window.open(`/event/${evt.slug}`, '_blank')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">CSV Upload (Master / Start / Finish / Checkpoint)</h2>
            <div className="subtle">
              Data timing sekarang berasal dari file CSV upload (bukan Google Sheet).
              <b>Master &amp; Finish wajib</b>. <b>Start tidak wajib</b> jika kamu memakai
              <b> Category Start Times</b> (start global per kategori) di bawah.
              Checkpoint optional.
            </div>
          </div>
          <div className="tools">
            <button className="btn ghost" onClick={() => refreshCsvMeta()}>
              Refresh Status
            </button>
            <button className="btn" onClick={clearAllCsv}>
              Reset Uploaded CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Type</th>
                <th>Upload</th>
                <th style={{ width: 320 }}>Current File</th>
                <th style={{ width: 120 }}>Rows</th>
                <th style={{ width: 200 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {(["master", "start", "finish", "checkpoint"] as CsvKind[]).map((kind) => {
                const meta = metaByKind[kind];
                return (
                  <tr key={kind} className="row-hover">
                    <td className="mono strong">{kind.toUpperCase()}</td>
                    <td>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const f = (e.target as HTMLInputElement).files?.[0];
                          if (f) uploadCsv(kind, f);
                        }}
                      />
                    </td>
                    <td className="mono">{meta?.filename || "-"}</td>
                    <td className="mono">{meta?.rows ?? "-"}</td>
                    <td className="mono">
                      {meta?.updatedAt
                        ? new Date(meta.updatedAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="subtle" style={{ marginTop: 8 }}>
          Format kolom minimal:
          <ul style={{ marginTop: 6, marginBottom: 0 }}>
            <li><b>Master</b>: EPC, Nama, Kelamin, Kategori, BIB (mis: BIB Number)</li>
            <li><b>Finish / Checkpoint</b>: EPC, Times (atau Time / Timestamp)</li>
            <li><b>Start</b>: optional (bisa pakai Category Start Times). Jika dipakai: EPC, Times (atau Time / Timestamp)</li>
          </ul>
        </div>
      </div>

      {/* Banner Images */}
      {eventId && (
        <div className="card">
          <div className="header-row">
            <div>
              <h2 className="section-title">Banner Images</h2>
              <div className="subtle">
                Upload banner images untuk event ini. Supported formats: JPG, PNG, GIF
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Preview</th>
                  <th>Image URL / Alt Text</th>
                  <th style={{ width: 80 }}>Order</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">No banners uploaded yet</td>
                  </tr>
                ) : (
                  banners
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((banner: any) => (
                      <tr key={banner.id} className="row-hover">
                        <td>
                          <img
                            src={banner.imageUrl}
                            alt={banner.alt || "Banner preview"}
                            style={{ width: "100px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        </td>
                        <td>
                          <div className="mono" style={{ fontSize: "11px", marginBottom: "4px" }}>
                            {banner.imageUrl.slice(0, 50)}...
                          </div>
                          <div className="subtle">{banner.alt || "-"}</div>
                        </td>
                        <td className="mono">{banner.order}</td>
                        <td>
                          <span className={`badge ${banner.isActive ? 'badge-live' : 'badge-inactive'}`}>
                            {banner.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn ghost"
                              onClick={() => toggleBannerActive(banner.id)}
                            >
                              {banner.isActive ? "Hide" : "Show"}
                            </button>
                            <button
                              className="btn ghost"
                              onClick={() => deleteBanner(banner.id, banner.imageUrl)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
            <div className="subtle" style={{ marginBottom: "0.75rem", fontWeight: 500 }}>Upload New Banner</div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                style={{ flex: 1, minWidth: "200px" }}
              />
              <input
                className="search"
                style={{ width: "300px" }}
                placeholder="Alt text (optional)"
                value={bannerAlt}
                onChange={(e) => setBannerAlt(e.target.value)}
              />
              <input
                type="number"
                className="search"
                style={{ width: "100px" }}
                placeholder="Order"
                value={bannerOrder}
                onChange={(e) => setBannerOrder(Number(e.target.value))}
              />
              <button
                className="btn"
                onClick={handleBannerUpload}
                disabled={!bannerFile || uploadingBanner}
              >
                {uploadingBanner ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management - Always show, use 'default' eventId if not provided */}
      <CategoryManager
        eventId={eventId || 'default'}
        onCategoriesChange={(newCategories) => {
          setCategories(newCategories);
          onConfigChanged();
        }}
      />

      {/* Cut Off Time */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Cut Off Settings</h2>
            <div className="subtle">
              Cut off time dihitung dari start masing-masing pelari / kategori.
            </div>
          </div>
          <button className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="admin-cutoff">
          <div className="label">Cut Off Duration (hours)</div>
          <div className="tools">
            <input
              className="search"
              placeholder="e.g. 3.5"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
            />
            <button className="btn" onClick={applyCutoff}>
              Save Cut Off
            </button>
          </div>
          <div className="subtle">Jika kosong / 0 → cut off nonaktif.</div>
        </div>
      </div>

      {/* Category Start Time Overrides */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Category Start Times</h2>
            <div className="subtle">
              Set start time per kategori. Jika diisi, sistem akan menghitung{" "}
              <b>total time = finish time - start time kategori</b>
              untuk kategori tersebut (mengabaikan start time per peserta).
            </div>
          </div>
          <button className="btn" onClick={applyCatStart}>
            Save Start Times
          </button>
        </div>

        <div className="table-wrap">
          <table className="f1-table compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Start Time (datetime)</th>
                <th style={{ width: 200 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((catKey) => (
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="subtle" style={{ marginTop: 8 }}>
          Gunakan format tanggal &amp; jam yang sama dengan di CSV timing
          (misal: <code>2025-11-23 07:00:00.000</code>). Kamu juga bisa klik <b>Set Now</b>
          untuk mengisi otomatis berdasarkan jam saat ini. Jika kolom dikosongkan,
          kategori tersebut akan kembali memakai start time per peserta dari CSV start (jika ada).
        </div>
      </div>

      {/* DSQ Management */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Disqualification (Manual)</h2>
            <div className="subtle">
              Toggle DSQ per runner (by EPC). DSQ tetap tampil di tabel tapi
              tanpa rank.
            </div>
          </div>
          <input
            className="search"
            placeholder="Search BIB / Name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table className="f1-table">
            <thead>
              <tr>
                <th className="col-bib">BIB</th>
                <th>NAME</th>
                <th className="col-gender">GENDER</th>
                <th className="col-cat">CATEGORY</th>
                <th style={{ width: 120 }}>STATUS</th>
                <th style={{ width: 120 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isDQ = !!dqMap[r.epc];
                return (
                  <tr key={r.epc} className="row-hover">
                    <td className="mono">{r.bib}</td>
                    <td className="name-cell">{r.name}</td>
                    <td>{r.gender}</td>
                    <td>{r.category}</td>
                    <td className="mono strong">{isDQ ? "DSQ" : "OK"}</td>
                    <td>
                      <button
                        className="btn ghost"
                        onClick={() => toggleDQ(r.epc)}
                      >
                        {isDQ ? "Undo DSQ" : "Disqualify"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Tidak ada peserta yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
