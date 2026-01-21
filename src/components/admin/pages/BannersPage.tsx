import { useState } from "react";
import { uploadBannerViaApi } from "../../../lib/storage";

interface BannersPageProps {
  banners: any[];
  eventId?: string;
  onBannersChange: (banners: any[]) => void;
}

export default function BannersPage({ banners, eventId, onBannersChange }: BannersPageProps) {
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerAlt, setBannerAlt] = useState('');
  const [bannerOrder, setBannerOrder] = useState(0);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const refreshBanners = async () => {
    if (!eventId) return;
    try {
      const response = await fetch(`/api/banners?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        onBannersChange(data);
      }
    } catch (error) {
      console.error('Failed to refresh banners:', error);
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
      await uploadBannerViaApi(eventId, bannerFile);

      setBannerFile(null);
      setBannerAlt('');
      setBannerOrder(0);
      const fileInput = document.getElementById('banner-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await refreshBanners();

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
        await refreshBanners();
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  const deleteBanner = async (bannerId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const response = await fetch(`/api/delete-banner?bannerId=${bannerId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshBanners();
        alert('Banner deleted successfully!');
      }
    } catch (error) {
      alert('Failed to delete banner');
    }
  };

  if (!eventId) {
    return (
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">Banner Images</h2>
            <div className="subtle">Please select an event first to manage banners.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Banner Images */}
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
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: banner.isActive ? '#dcfce7' : '#f3f4f6',
                          color: banner.isActive ? '#166534' : '#6b7280',
                        }}>
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
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <input
              id="banner-upload"
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
    </>
  );
}
