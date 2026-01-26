// src/pages/EventPage.tsx - User facing event detail page

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RaceClock from "../components/RaceClock";
import CategorySection from "../components/CategorySection";
import LeaderboardTable, { LeaderRow } from "../components/LeaderboardTable";
import ParticipantModal from "../components/ParticipantModal";
import Navbar from "../components/Navbar";
import {
  loadMasterParticipants,
  loadTimesMap,
  loadCheckpointTimesMap,
} from "../lib/data";
import { LS_DATA_VERSION } from "../lib/config";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "../lib/time";

const LS_DQ = "imr_dq_map";

interface EventData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  eventDate: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  gpxFile?: string;
  categories: string[];
  isActive: boolean;
  cutoffMs?: number | null;
  categoryStartTimes?: Record<string, string> | null;
}

interface Banner {
  id: string;
  imageUrl: string;
  alt?: string;
  order: number;
  isActive: boolean;
}

function loadDQMap(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_DQ) || "{}");
  } catch {
    return {};
  }
}

type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Memuat data event...",
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [activeTab, setActiveTab] = useState<string>("Participants");
  const [checkpointMap, setCheckpointMap] = useState<Map<string, string[]>>(new Map());
  const [selected, setSelected] = useState<LeaderRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [recalcTick, setRecalcTick] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [gpxTrackPoints, setGpxTrackPoints] = useState<Array<[number, number]>>([]);

  // Load event info
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const response = await fetch(`/api/events?eventId=${slug}`);
        if (response.ok) {
          const eventData = await response.json();
          setEvent(eventData);
        } else {
          setState({ status: "error", msg: "Event tidak ditemukan" });
        }
      } catch (error) {
        setState({ status: "error", msg: "Gagal memuat data event" });
      }
    })();
  }, [slug]);

  // Load banners
  useEffect(() => {
    if (!event?.id) return;

    (async () => {
      try {
        const response = await fetch(`/api/banners?eventId=${event.id}`);
        if (response.ok) {
          const data = await response.json();
          const activeBanners = (Array.isArray(data) ? data : [])
            .filter((b: Banner) => b.isActive)
            .sort((a: Banner, b: Banner) => a.order - b.order);
          setBanners(activeBanners);
        }
      } catch (error) {
        console.error('Failed to load banners:', error);
      }
    })();
  }, [event?.id]);

  // Banner auto-rotate
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Load GPX data
  useEffect(() => {
    if (!event?.gpxFile) {
      setGpxTrackPoints([]);
      return;
    }

    const gpxUrl = event.gpxFile;

    (async () => {
      try {
        const response = await fetch(gpxUrl);
        if (!response.ok) {
          console.error('Failed to load GPX file');
          return;
        }
        
        const gpxText = await response.text();
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        
        // Parse track points
        const trackPoints: Array<[number, number]> = [];
        const trkpts = gpxDoc.querySelectorAll('trkpt');
        
        trkpts.forEach((pt) => {
          const lat = parseFloat(pt.getAttribute('lat') || '0');
          const lon = parseFloat(pt.getAttribute('lon') || '0');
          if (lat && lon) {
            trackPoints.push([lat, lon]);
          }
        });
        
        // Also check for route points (rtept)
        if (trackPoints.length === 0) {
          const rtepts = gpxDoc.querySelectorAll('rtept');
          rtepts.forEach((pt) => {
            const lat = parseFloat(pt.getAttribute('lat') || '0');
            const lon = parseFloat(pt.getAttribute('lon') || '0');
            if (lat && lon) {
              trackPoints.push([lat, lon]);
            }
          });
        }
        
        setGpxTrackPoints(trackPoints);
      } catch (error) {
        console.error('Error parsing GPX:', error);
      }
    })();
  }, [event?.gpxFile]);

  // Load race data (participants, results)
  useEffect(() => {
    if (!event?.id) return;

    (async () => {
      try {
        if (!hasLoadedOnce) {
          setState({ status: "loading", msg: "Load data peserta..." });
        }

        const master = await loadMasterParticipants(event.id);
        const startMap = await loadTimesMap("start", event.id);
        const finishMap = await loadTimesMap("finish", event.id);
        const cpMap = await loadCheckpointTimesMap(event.id);
        setCheckpointMap(cpMap);

        // Use timing from event (per-event database) instead of localStorage
        const cutoffMs = event.cutoffMs ?? null;
        const dqMap = loadDQMap();
        const catStartRaw = event.categoryStartTimes ?? {};

        const absOverrideMs: Record<string, number | null> = {};
        const timeOnlyStr: Record<string, string | null> = {};

        Object.entries(catStartRaw).forEach(([key, raw]) => {
          const s = String(raw || "").trim();
          if (!s) {
            absOverrideMs[key] = null;
            timeOnlyStr[key] = null;
            return;
          }
          if (/\d{4}-\d{2}-\d{2}/.test(s)) {
            const parsed = parseTimeToMs(s);
            absOverrideMs[key] = parsed.ms;
            timeOnlyStr[key] = null;
          } else {
            absOverrideMs[key] = null;
            timeOnlyStr[key] = s;
          }
        });

        function buildOverrideFromFinishDate(finishMs: number, timeStr: string): number | null {
          const m = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/);
          if (!m) return null;
          const h = Number(m[1] || 0);
          const mi = Number(m[2] || 0);
          const se = Number(m[3] || 0);
          const ms = m[4] ? Number(String(m[4]).padEnd(3, "0").slice(0, 3)) : 0;
          const d = new Date(finishMs);
          const override = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, se, ms);
          return override.getTime();
        }

        const baseRows: LeaderRow[] = [];

        master.all.forEach((p) => {
          const finishEntry = finishMap.get(p.epc);
          if (!finishEntry?.ms) return;

          const catKey = p.sourceCategoryKey;
          const absMs = absOverrideMs[catKey] ?? null;
          const timeOnly = timeOnlyStr[catKey] ?? null;

          let total: number | null = null;

          if (absMs != null && Number.isFinite(absMs)) {
            const delta = finishEntry.ms - absMs;
            if (Number.isFinite(delta) && delta >= 0) {
              total = delta;
            } else {
              const startEntry = startMap.get(p.epc);
              if (!startEntry?.ms) return;
              total = finishEntry.ms - startEntry.ms;
            }
          } else if (timeOnly) {
            const builtOverride = buildOverrideFromFinishDate(finishEntry.ms, timeOnly);
            if (builtOverride != null) {
              const delta = finishEntry.ms - builtOverride;
              if (Number.isFinite(delta) && delta >= 0) {
                total = delta;
              } else {
                const startEntry = startMap.get(p.epc);
                if (!startEntry?.ms) return;
                total = finishEntry.ms - startEntry.ms;
              }
            } else {
              const startEntry = startMap.get(p.epc);
              if (!startEntry?.ms) return;
              total = finishEntry.ms - startEntry.ms;
            }
          } else {
            const startEntry = startMap.get(p.epc);
            if (!startEntry?.ms) return;
            total = finishEntry.ms - startEntry.ms;
          }

          if (!Number.isFinite(total) || total == null || total < 0) return;

          const isDQ = !!dqMap[p.epc];
          const isDNF = cutoffMs != null && total > cutoffMs;

          baseRows.push({
            rank: null,
            bib: p.bib,
            name: p.name,
            gender: p.gender,
            category: p.category || p.sourceCategoryKey,
            sourceCategoryKey: p.sourceCategoryKey,
            finishTimeRaw: extractTimeOfDay(finishEntry.raw),
            totalTimeMs: total,
            totalTimeDisplay: isDQ ? "DSQ" : isDNF ? "DNF" : formatDuration(total),
            epc: p.epc,
          });
        });

        const finishers = baseRows.filter(
          (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ"
        );

        const finisherSorted = [...finishers]
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const finisherRankByEpc = new Map(finisherSorted.map((r) => [r.epc, r.rank!]));
        const genderRankByEpc = new Map<string, number>();
        const genders = Array.from(new Set(finisherSorted.map((r) => (r.gender || "").toLowerCase())));
        genders.forEach((g) => {
          const list = finisherSorted.filter((r) => (r.gender || "").toLowerCase() === g);
          list.forEach((r, i) => genderRankByEpc.set(r.epc, i + 1));
        });

        const categoryRankByEpc = new Map<string, number>();
        (event.categories || []).forEach((catKey) => {
          const list = finisherSorted.filter((r) => r.sourceCategoryKey === catKey);
          list.forEach((r, i) => categoryRankByEpc.set(r.epc, i + 1));
        });

        const dnfs = baseRows
          .filter((r) => r.totalTimeDisplay === "DNF")
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs);
        const dsqs = baseRows.filter((r) => r.totalTimeDisplay === "DSQ");

        const overallFinal: LeaderRow[] = [
          ...finisherSorted,
          ...dnfs.map((r) => ({ ...r, rank: null })),
          ...dsqs.map((r) => ({ ...r, rank: null })),
        ];

        const catMap: Record<string, LeaderRow[]> = {};
        (event.categories || []).forEach((catKey) => {
          const list = overallFinal.filter((r) => r.sourceCategoryKey === catKey);
          catMap[catKey] = list;
        });

        setOverall(overallFinal);
        setByCategory(catMap);

        (EventPage as any)._rankMaps = {
          finisherRankByEpc,
          genderRankByEpc,
          categoryRankByEpc,
        };

        setState({ status: "ready" });
        setHasLoadedOnce(true);
      } catch (e: any) {
        // Allow page to render even without data - don't block UI
        setState({ status: "ready" });
        setHasLoadedOnce(true);
      }
    })();
  }, [recalcTick, event?.id, event?.categories]);

  // Refresh when data changes
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_DATA_VERSION) {
        setRecalcTick((t) => t + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const tabs = useMemo(() => {
    const baseTabs = ["Participants", "Results", ...(event?.categories || [])];
    // Add Route tab if GPX file exists
    if (event?.gpxFile || (event?.latitude && event?.longitude)) {
      baseTabs.push("Route");
    }
    return baseTabs;
  }, [event?.categories, event?.gpxFile, event?.latitude, event?.longitude]);

  const onSelectParticipant = (row: LeaderRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  const modalData = useMemo(() => {
    if (!selected) return null;
    const maps = (EventPage as any)._rankMaps;
    const overallRank = maps?.finisherRankByEpc?.get(selected.epc) ?? null;
    const genderRank = maps?.genderRankByEpc?.get(selected.epc) ?? null;
    const categoryRank = maps?.categoryRankByEpc?.get(selected.epc) ?? null;

    return {
      name: selected.name,
      bib: selected.bib,
      gender: selected.gender,
      category: selected.category,
      finishTimeRaw: selected.finishTimeRaw,
      totalTimeDisplay: selected.totalTimeDisplay,
      checkpointTimes: checkpointMap.get(selected.epc) || [],
      overallRank,
      genderRank,
      categoryRank,
    };
  }, [selected, checkpointMap]);

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="page">
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            {state.status === "loading" ? (
              <>
                <div className="loading-spinner" />
                <p>{state.msg}</p>
              </>
            ) : (
              <>
                <h2>Event tidak ditemukan</h2>
                <Link to="/events" className="btn" style={{ marginTop: '1rem' }}>
                  Kembali ke Events
                </Link>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // Get first banner as main logo/image
  const mainBanner = banners.length > 0 ? banners[0] : null;

  return (
    <>
      <Navbar />
      <div className="event-page">
        {/* Red Banner Header Area */}
        <div className="event-banner-header">
          {/* Banner Carousel */}
          {banners.length > 0 && (
            <div className="banner-carousel">
              <div className="banner-container">
                {banners.map((banner, index) => (
                  <img
                    key={banner.id}
                    src={banner.imageUrl}
                    alt={banner.alt || event.name}
                    className={`banner-image ${index === currentBannerIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
              {banners.length > 1 && (
                <div className="banner-indicators">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentBannerIndex ? 'active' : ''}`}
                      onClick={() => setCurrentBannerIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Info Section - Logo left, Info right */}
        <div className="event-info-section">
          {/* Event Logo */}
          <div className="event-logo-container">
            {mainBanner ? (
              <img src={mainBanner.imageUrl} alt={event.name} className="event-logo" />
            ) : (
              <div className="event-logo-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#9ca3af">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="event-details">
            <div className="event-meta-line">
              {event.eventDate && (
                <span>
                  {new Date(event.eventDate).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              )}
              {event.location && (
                <>
                  <span className="separator">|</span>
                  <span>{event.location}</span>
                </>
              )}
            </div>
            <h1 className="event-title">{event.name}</h1>
            {event.description && (
              <p className="event-description">{event.description}</p>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="event-tabs-container">
          <div className="event-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                className={`event-tab ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="event-content">
          {activeTab === "Participants" && (
            <div className="content-section">
              <h2 className="section-title">Peserta Terdaftar</h2>
              {overall.length > 0 ? (
                <>
                  {/* Simple stats without gradient */}
                  <div className="simple-stats">
                    <div className="simple-stat">
                      <span className="stat-number">{overall.length}</span>
                      <span className="stat-text">Total Peserta</span>
                    </div>
                    <div className="simple-stat">
                      <span className="stat-number">
                        {overall.filter(r => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ").length}
                      </span>
                      <span className="stat-text">Finisher</span>
                    </div>
                    <div className="simple-stat">
                      <span className="stat-number">{event.categories?.length || 0}</span>
                      <span className="stat-text">Kategori</span>
                    </div>
                  </div>
                  <LeaderboardTable
                    title=""
                    rows={overall}
                    onSelect={onSelectParticipant}
                  />
                </>
              ) : (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="#d1d5db">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <p>Belum ada data peserta</p>
                  <span className="subtle">Data peserta akan muncul setelah admin mengupload file CSV</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "Results" && (
            <div className="content-section">
              <RaceClock cutoffMs={event?.cutoffMs} categoryStartTimes={event?.categoryStartTimes} />
              <LeaderboardTable
                title="Overall Result (All Categories)"
                rows={overall}
                onSelect={onSelectParticipant}
              />
            </div>
          )}

          {activeTab !== "Participants" && activeTab !== "Results" && activeTab !== "Route" && (
            <div className="content-section">
              <RaceClock cutoffMs={event?.cutoffMs} categoryStartTimes={event?.categoryStartTimes} />
              <CategorySection
                categoryKey={activeTab}
                rows={(byCategory as any)[activeTab] || []}
                onSelect={onSelectParticipant}
              />
            </div>
          )}

          {activeTab === "Route" && (
            <div className="content-section">
              <h2 className="section-title">Rute Lomba</h2>
              <div className="route-map-container">
                {(gpxTrackPoints.length > 0 || (event?.latitude && event?.longitude)) ? (
                  <iframe
                    src={`/route-map.html?eventId=${event?.id}&lat=${event?.latitude || ''}&lng=${event?.longitude || ''}&hasGpx=${gpxTrackPoints.length > 0 ? '1' : '0'}`}
                    width="100%"
                    height="500"
                    style={{ border: 0, borderRadius: '8px' }}
                    title="Route Map"
                  />
                ) : (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="#d1d5db">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <p>Rute belum tersedia</p>
                    <span className="subtle">Admin akan mengupload file GPX rute lomba</span>
                  </div>
                )}
              </div>
              
              {gpxTrackPoints.length > 0 && (
                <div className="route-info">
                  <strong>Info Rute:</strong> {gpxTrackPoints.length} titik koordinat
                </div>
              )}
            </div>
          )}
        </div>

        <ParticipantModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          data={modalData}
        />

        <style>{`
          .event-page {
            min-height: 100vh;
            background: #f8f9fa;
          }

          .event-banner-header {
            background: linear-gradient(135deg, #c62828, #e53935);
            padding: 0;
            min-height: 80px;
          }

          .banner-carousel {
            position: relative;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            height: 200px;
            overflow: hidden;
          }

          .banner-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .banner-image {
            position: absolute;
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
          }

          .banner-image.active {
            opacity: 1;
          }

          .banner-indicators {
            position: absolute;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 0.5rem;
          }

          .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.3s;
          }

          .indicator.active {
            background: white;
            width: 24px;
            border-radius: 5px;
          }

          .event-info-section {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem 2rem;
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            background: white;
            border-bottom: 1px solid #e5e7eb;
          }

          .event-logo-container {
            flex-shrink: 0;
          }

          .event-logo {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            padding: 8px;
          }

          .event-logo-placeholder {
            width: 100px;
            height: 100px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .event-details {
            flex: 1;
          }

          .event-meta-line {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 0.5rem;
          }

          .event-meta-line .separator {
            margin: 0 0.5rem;
          }

          .event-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 0.5rem 0;
            line-height: 1.3;
          }

          .event-description {
            font-size: 0.9rem;
            color: #6b7280;
            margin: 0;
            line-height: 1.5;
          }

          .event-tabs-container {
            background: white;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
          }

          .event-tabs {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            gap: 0;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .event-tabs::-webkit-scrollbar {
            display: none;
          }

          /* Scroll fade indicators */
          .event-tabs-container::before,
          .event-tabs-container::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            width: 30px;
            pointer-events: none;
            z-index: 2;
            opacity: 0;
            transition: opacity 0.3s;
          }

          .event-tabs-container::before {
            left: 0;
            background: linear-gradient(to right, white 30%, transparent);
          }

          .event-tabs-container::after {
            right: 0;
            background: linear-gradient(to left, white 30%, transparent);
          }

          .event-tab {
            padding: 1rem 1.5rem;
            border: none;
            background: none;
            font-size: 0.9rem;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .event-tab:hover {
            color: #c62828;
          }

          .event-tab.active {
            color: #c62828;
            border-bottom-color: #c62828;
          }

          .event-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem 2rem;
            width: 100%;
          }

          .content-section {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            overflow-x: hidden;
          }

          .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #c62828;
            margin: 0 0 1rem 0;
          }

          /* Simple stats - no gradient */
          .simple-stats {
            display: flex;
            gap: 2rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .simple-stat {
            display: flex;
            flex-direction: column;
          }

          .stat-number {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1f2937;
          }

          .stat-text {
            font-size: 0.8rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .empty-state {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
          }

          .empty-state svg {
            margin-bottom: 1rem;
          }

          .empty-state p {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
          }

          .empty-state .subtle {
            font-size: 0.875rem;
            color: #9ca3af;
          }

          .route-map-container {
            margin-top: 1rem;
          }

          .route-map-container iframe {
            width: 100%;
            height: 500px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }

          .route-info {
            margin-top: 1rem;
            padding: 0.75rem 1rem;
            background: #f9fafb;
            border-radius: 6px;
            font-size: 0.875rem;
            color: #6b7280;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-top-color: #c62828;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @media (max-width: 768px) {
            .event-info-section {
              flex-direction: column;
              align-items: center;
              text-align: center;
              padding: 1rem;
            }

            .event-logo {
              width: 80px;
              height: 80px;
            }

            .event-title {
              font-size: 1.25rem;
            }

            .event-tabs-container {
              position: relative;
            }

            .event-tabs-container::after {
              opacity: 1;
            }

            .event-tabs {
              padding: 0 0.75rem;
              gap: 0.25rem;
            }

            .event-tab {
              padding: 0.875rem 1rem;
              font-size: 0.8rem;
              min-width: fit-content;
            }

            .event-content {
              padding: 0;
              margin: 0;
              max-width: 100%;
              width: 100%;
            }

            .content-section {
              padding: 1rem;
              margin: 1rem;
              border-radius: 0;
            }

            .simple-stats {
              flex-wrap: wrap;
              justify-content: center;
              gap: 1.5rem;
            }

            .simple-stat {
              align-items: center;
              min-width: 80px;
            }

            .banner-carousel {
              height: 150px;
            }

            .route-map-container iframe {
              height: 300px;
            }

            /* Fix table overflow on mobile */
            .content-section .table-wrap {
              width: calc(100% + 2rem);
              margin-left: -1rem;
              margin-right: -1rem;
              border-left: none;
              border-right: none;
              border-radius: 0;
            }

            .content-section .card {
              border-radius: 0;
              border-left: none;
              border-right: none;
            }
          }

          @media (max-width: 480px) {
            .event-tabs {
              padding: 0 0.5rem;
            }

            .event-tab {
              padding: 0.75rem 0.75rem;
              font-size: 0.75rem;
            }

            .event-title {
              font-size: 1.1rem;
            }

            .simple-stats {
              gap: 1rem;
            }

            .stat-number {
              font-size: 1.5rem;
            }

            .route-map-container iframe {
              height: 250px;
            }
          }
        `}</style>
      </div>
    </>
  );
}
