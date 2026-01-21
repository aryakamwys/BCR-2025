// Admin Event Detail Page - for managing individual event data, CSV uploads, banners, categories
import { useState, useEffect } from "react";
import { putCsvFile, deleteCsvFile, listCsvMeta } from "../../../lib/idb";
import { parseCsv, countDataRows } from "../../../lib/csvParse";
import { uploadBannerViaApi } from "../../../lib/storage";
import type { CsvKind } from "../../../lib/config";
import { LS_DATA_VERSION } from "../../../lib/config";

interface EventDetailPageProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
  onBack: () => void;
}

interface Banner {
  id: string;
  imageUrl: string;
  alt?: string;
  order: number;
  isActive: boolean;
}

export default function EventDetailPage({ eventId, eventSlug, eventName, onBack }: EventDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'banners' | 'categories' | 'route' | 'settings'>('data');
  const [csvMeta, setCsvMeta] = useState<Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Banner upload state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // Category state
  const [newCategory, setNewCategory] = useState('');
  
  // GPX upload state
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const [currentGpxPath, setCurrentGpxPath] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadAllData();
  }, [eventId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load CSV meta
      const meta = await listCsvMeta(eventId);
      setCsvMeta(meta as any);
      
      // Load banners
      const bannersRes = await fetch(`/api/banners?eventId=${eventId}`);
      if (bannersRes.ok) {
        const data = await bannersRes.json();
        setBanners(Array.isArray(data) ? data : []);
      }
      
      // Load categories
      const catRes = await fetch(`/api/categories?eventId=${eventId}`);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
      
      // Load event data to get GPX file path
      const eventRes = await fetch(`/api/events?eventId=${eventId}`);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setCurrentGpxPath(eventData.gpxFile || null);
      }
    } catch (error) {
      console.error('Failed to load event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const bumpDataVersion = () => {
    localStorage.setItem(LS_DATA_VERSION, String(Date.now()));
  };

  // CSV Upload handlers
  const uploadCsv = async (kind: CsvKind, file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);

    if (!grid || grid.length === 0) {
      alert(`CSV '${kind}': File kosong atau tidak valid.`);
      return;
    }

    const headers = (grid[0] || []).map((x) => String(x || "").trim());
    const headersNorm = headers.map((s) => s.toLowerCase().replace(/\s+/g, " ").trim());

    const headerAliases: Record<string, string[]> = {
      epc: ["epc", "uid", "tag", "rfid", "chip epc", "epc code"],
      times: ["times", "time", "timestamp", "start time", "finish time", "jam"],
    };

    if (kind === "master") {
      const epcAliases = headerAliases.epc.map((s) => s.toLowerCase());
      const hasEpc = headersNorm.some((h) => epcAliases.some((alias) => h === alias || h.includes(alias)));
      if (!hasEpc) {
        alert(`CSV '${kind}': kolom EPC tidak ditemukan.\nFormat Master CSV harus memiliki kolom EPC.`);
        return;
      }
    }

    if (kind !== "master") {
      const epcAliases = headerAliases.epc.map((s) => s.toLowerCase());
      const timesAliases = headerAliases.times.map((s) => s.toLowerCase());
      const hasEpc = headersNorm.some((h) => epcAliases.some((alias) => h === alias || h.includes(alias)));
      const hasTimes = headersNorm.some((h) => timesAliases.some((alias) => h === alias || h.includes(alias)));

      if (!hasEpc || !hasTimes) {
        alert(`CSV '${kind}': kolom EPC atau Times tidak ditemukan.`);
        return;
      }
    }

    const rows = countDataRows(grid);
    await putCsvFile({ kind, text, filename: file.name, rows, eventId });
    bumpDataVersion();
    
    // Reload CSV meta
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);
    
    alert(`'${kind}' berhasil diupload (${rows} baris)`);
  };

  const clearCsv = async (kind: CsvKind) => {
    if (!confirm(`Reset CSV '${kind}'?`)) return;
    await deleteCsvFile(kind, eventId);
    bumpDataVersion();
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);
    alert(`CSV '${kind}' telah dihapus`);
  };

  const clearAllCsv = async () => {
    if (!confirm("Reset semua CSV yang sudah diupload?")) return;
    for (const k of ["master", "start", "finish", "checkpoint"] as CsvKind[]) {
      await deleteCsvFile(k, eventId);
    }
    bumpDataVersion();
    const meta = await listCsvMeta(eventId);
    setCsvMeta(meta as any);
    alert("Semua CSV telah dihapus");
  };

  // Banner handlers
  const handleBannerUpload = async () => {
    if (!bannerFile) {
      alert('Please select an image file');
      return;
    }

    setUploadingBanner(true);
    try {
      await uploadBannerViaApi(eventId, bannerFile);
      setBannerFile(null);
      const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload banners
      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
      alert('Banner uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  const toggleBannerActive = async (bannerId: string) => {
    const banner = banners.find((b) => b.id === bannerId);
    if (!banner) return;

    try {
      await fetch('/api/update-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId, isActive: !banner.isActive }),
      });
      
      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!confirm('Delete this banner?')) return;

    try {
      await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });
      
      const res = await fetch(`/api/banners?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
      }
      alert('Banner deleted!');
    } catch (error) {
      alert('Failed to delete banner');
    }
  };

  // Category handlers
  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert('Category already exists');
      return;
    }

    const updated = [...categories, trimmed];
    await saveCategories(updated);
    setNewCategory('');
  };

  const removeCategory = async (cat: string) => {
    if (!confirm(`Remove category "${cat}"?`)) return;
    const updated = categories.filter((c) => c !== cat);
    await saveCategories(updated);
  };

  const saveCategories = async (cats: string[]) => {
    try {
      const res = await fetch(`/api/categories?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats }),
      });
      
      if (res.ok) {
        setCategories(cats);
        bumpDataVersion();
      } else {
        alert('Failed to save categories');
      }
    } catch (error) {
      alert('Failed to save categories');
    }
  };

  // GPX Upload handler
  const handleGpxUpload = async () => {
    if (!gpxFile) {
      alert('Please select a GPX file');
      return;
    }

    setUploadingGpx(true);
    try {
      const content = await gpxFile.text();
      
      const response = await fetch('/api/gpx-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          content,
          filename: gpxFile.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload GPX');
      }

      const result = await response.json();
      setCurrentGpxPath(result.url);
      setGpxFile(null);
      
      const fileInput = document.getElementById('gpx-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      alert('GPX file uploaded successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to upload GPX file');
    } finally {
      setUploadingGpx(false);
    }
  };

  const clearGpxFile = async () => {
    if (!confirm('Remove GPX route file?')) return;
    
    try {
      // Update event to remove GPX path
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpxFile: null }),
      });

      if (response.ok) {
        setCurrentGpxPath(null);
        alert('GPX file removed');
      } else {
        alert('Failed to remove GPX file');
      }
    } catch (error) {
      alert('Failed to remove GPX file');
    }
  };

  const metaByKind: Partial<Record<CsvKind, { filename: string; updatedAt: number; rows: number }>> = {};
  csvMeta.forEach((x) => {
    metaByKind[x.key] = { filename: x.filename, updatedAt: x.updatedAt, rows: x.rows };
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-500 border-r-transparent"></div>
        <p className="mt-4">Loading event data...</p>
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn ghost" onClick={onBack}>
          ← Back to Events
        </button>
        <div className="header-info">
          <h1 className="page-title">{eventName}</h1>
          <span className="event-slug">/{eventSlug}</span>
        </div>
        <button 
          className="btn" 
          onClick={() => window.open(`/event/${eventSlug}`, '_blank')}
        >
          View Public Page
        </button>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button 
          className={`detail-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Data Upload
        </button>
        <button 
          className={`detail-tab ${activeTab === 'banners' ? 'active' : ''}`}
          onClick={() => setActiveTab('banners')}
        >
          Banners ({banners.length})
        </button>
        <button 
          className={`detail-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories ({categories.length})
        </button>
        <button 
          className={`detail-tab ${activeTab === 'route' ? 'active' : ''}`}
          onClick={() => setActiveTab('route')}
        >
          Route {currentGpxPath ? '(1)' : '(0)'}
        </button>
      </div>

      {/* Data Upload Tab */}
      {activeTab === 'data' && (
        <div className="card">
          <div className="header-row">
            <div>
              <h2 className="section-title">CSV Upload</h2>
              <div className="subtle">
                Upload CSV data untuk event ini. Master & Finish wajib. Start optional jika menggunakan Category Start Times.
              </div>
            </div>
            <button className="btn ghost" onClick={clearAllCsv}>
              Reset All CSV
            </button>
          </div>

          <div className="table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Type</th>
                  <th>Upload</th>
                  <th style={{ width: 280 }}>Current File</th>
                  <th style={{ width: 100 }}>Rows</th>
                  <th style={{ width: 150 }}>Updated</th>
                  <th style={{ width: 100 }}>Actions</th>
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
                        {meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "-"}
                      </td>
                      <td>
                        {meta && (
                          <button className="btn ghost" onClick={() => clearCsv(kind)}>
                            Clear
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Banners Tab */}
      {activeTab === 'banners' && (
        <div className="card">
          <div className="header-row">
            <div>
              <h2 className="section-title">Banner Images</h2>
              <div className="subtle">
                Upload banner images yang akan ditampilkan di halaman event.
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
            <div className="subtle" style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Upload New Banner</div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                style={{ flex: 1 }}
              />
              <button
                className="btn"
                onClick={handleBannerUpload}
                disabled={!bannerFile || uploadingBanner}
              >
                {uploadingBanner ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Banner List */}
          <div className="table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Preview</th>
                  <th>URL</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">No banners uploaded yet</td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id} className="row-hover">
                      <td>
                        <img
                          src={banner.imageUrl}
                          alt={banner.alt || "Banner"}
                          style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </td>
                      <td className="mono" style={{ fontSize: '11px' }}>
                        {banner.imageUrl.slice(0, 50)}...
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}>
                          {banner.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn ghost" onClick={() => toggleBannerActive(banner.id)}>
                            {banner.isActive ? 'Hide' : 'Show'}
                          </button>
                          <button 
                            className="btn ghost" 
                            style={{ color: '#dc2626' }}
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
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="card">
          <div className="header-row">
            <div>
              <h2 className="section-title">Race Categories</h2>
              <div className="subtle">
                Kelola kategori lomba untuk event ini.
              </div>
            </div>
          </div>

          {/* Add Category */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <input
              className="search"
              style={{ flex: 1 }}
              placeholder="e.g., 10K Laki-laki"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button className="btn" onClick={addCategory} disabled={!newCategory.trim()}>
              + Add Category
            </button>
          </div>

          {/* Category List */}
          <div className="table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Category Name</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">No categories yet</td>
                  </tr>
                ) : (
                  categories.map((cat, index) => (
                    <tr key={cat} className="row-hover">
                      <td className="mono">{index + 1}</td>
                      <td className="name-cell">{cat}</td>
                      <td>
                        <button 
                          className="btn ghost" 
                          style={{ color: '#dc2626' }}
                          onClick={() => removeCategory(cat)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Route Tab */}
      {activeTab === 'route' && (
        <div className="card">
          <div className="header-row">
            <div>
              <h2 className="section-title">GPX Route File</h2>
              <div className="subtle">
                Upload file GPX untuk menampilkan rute lomba di peta.
              </div>
            </div>
          </div>

          {/* GPX Upload */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
            <div className="subtle" style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Upload GPX File</div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                id="gpx-upload"
                type="file"
                accept=".gpx,application/gpx+xml"
                onChange={(e) => setGpxFile(e.target.files?.[0] || null)}
                style={{ flex: 1 }}
              />
              <button
                className="btn"
                onClick={handleGpxUpload}
                disabled={!gpxFile || uploadingGpx}
              >
                {uploadingGpx ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#6b7280' }}>
              Format yang didukung: .gpx (GPS Exchange Format)
            </div>
          </div>

          {/* Current GPX */}
          <div className="table-wrap">
            <table className="f1-table compact">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>File Path</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentGpxPath ? (
                  <tr className="row-hover">
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#166534',
                      }}>
                        Uploaded
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{currentGpxPath}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn ghost"
                          onClick={() => window.open(currentGpxPath, '_blank')}
                        >
                          View
                        </button>
                        <button 
                          className="btn ghost" 
                          style={{ color: '#dc2626' }}
                          onClick={clearGpxFile}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={3} className="empty">No GPX file uploaded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Info box */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#e7f3ff',
            border: '1px solid #2196F3',
            borderRadius: '4px',
            color: '#0d47a1',
            fontSize: '14px'
          }}>
            <strong>Info:</strong> File GPX akan ditampilkan sebagai rute di halaman event publik. 
            Anda bisa membuat file GPX menggunakan aplikasi seperti Strava, Garmin Connect, atau GPX Editor.
          </div>
        </div>
      )}

      <style>{`
        .event-detail-page {
          padding: 0;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-info {
          flex: 1;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .event-slug {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .detail-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .detail-tab {
          padding: 0.75rem 1.25rem;
          background: none;
          border: none;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
        }

        .detail-tab:hover {
          color: #111827;
        }

        .detail-tab.active {
          color: #dc2626;
        }

        .detail-tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}
