// src/App.tsx

import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import RaceClock from "./components/RaceClock";
import CategorySection from "./components/CategorySection";
import LeaderboardTable, { LeaderRow } from "./components/LeaderboardTable";
import ParticipantModal from "./components/ParticipantModal";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import CreateEventPage from "./pages/CreateEventPage";
import LandingPage from "./pages/LandingPage";
import UserEventPage from "./pages/UserEventPage";
import AdminLayout from "./components/admin/AdminLayout";
import {
  OverviewPageWrapper,
  EventsPageWrapper,
  DataPageWrapper,
  BannersPageWrapper,
  CategoriesPageWrapper,
  TimingPageWrapper,
  DQPageWrapper
} from "./components/admin/wrappers";
import { EventProvider, useEvent } from "./contexts/EventContext";
import {
  loadMasterParticipants,
  loadTimesMap,
  loadCheckpointTimesMap,
} from "./lib/data";
import { DEFAULT_EVENT_TITLE, LS_EVENT_TITLE, LS_DATA_VERSION } from "./lib/config";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "./lib/time";

const LS_CUTOFF = "imr_cutoff_ms";
const LS_DQ = "imr_dq_map";
const LS_CAT_START = "imr_cat_start_raw";

function loadCutoffMs(): number | null {
  const v = localStorage.getItem(LS_CUTOFF);
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;

  // kalau kecil (<=48) dianggap jam → konversi ke ms
  if (n <= 48) return n * 3600000;

  // kalau sudah besar, anggap sudah ms
  return n;
}

function loadDQMap(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_DQ) || "{}");
  } catch {
    return {};
  }
}
function loadCatStartRaw(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_CAT_START) || "{}");
  } catch {
    return {};
  }
}

type LoadState =
  | { status: "loading"; msg: string }
  | { status: "error"; msg: string }
  | { status: "ready" };

// Original Leaderboard App Component
function LeaderboardApp() {
  const { currentEvent, events, setCurrentEvent, loading: eventLoading } = useEvent();
  const [eventTitle, setEventTitle] = useState<string>(() => {
    return localStorage.getItem(LS_EVENT_TITLE) || DEFAULT_EVENT_TITLE;
  });

  const [state, setState] = useState<LoadState>({
    status: "loading",
    msg: "Memuat data CSV…",
  });

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [overall, setOverall] = useState<LeaderRow[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, LeaderRow[]>>({});
  const [activeTab, setActiveTab] = useState<string>("Overall");
  const [checkpointMap, setCheckpointMap] = useState<Map<string, string[]>>(
    new Map()
  );

  const [selected, setSelected] = useState<LeaderRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [recalcTick, setRecalcTick] = useState(0);
  
  // Mobile event selector state
  const [mobileEventSelectorOpen, setMobileEventSelectorOpen] = useState(false);

  const eventId = currentEvent?.id || 'default';
  
  // Get categories from current event
  const eventCategories: string[] = useMemo(() => {
    return currentEvent?.categories || [];
  }, [currentEvent?.categories]);

  // Reset data and reload when event changes
  useEffect(() => {
    if (currentEvent?.id) {
      setHasLoadedOnce(false);
      setRecalcTick(t => t + 1);
      setActiveTab("Overall"); // Reset to Overall tab when switching events
      // Update event title when switching events
      setEventTitle(currentEvent.name || DEFAULT_EVENT_TITLE);
    }
  }, [currentEvent?.id, currentEvent?.name]);

  useEffect(() => {
    // Wait for event context to finish loading
    if (eventLoading) {
      return;
    }

    (async () => {
      try {
        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Load master peserta (CSV)…",
          });
        }

        console.log('[LeaderboardApp] Loading data for eventId:', eventId);
        const master = await loadMasterParticipants(eventId);

        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Load start, finish, checkpoint (CSV)…",
          });
        }

        const startMap = await loadTimesMap("start", eventId);
        const finishMap = await loadTimesMap("finish", eventId);
        const cpMap = await loadCheckpointTimesMap(eventId);
        setCheckpointMap(cpMap);

        const cutoffMs = loadCutoffMs();
        const dqMap = loadDQMap();
        const catStartRaw = loadCatStartRaw();

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

        function buildOverrideFromFinishDate(
          finishMs: number,
          timeStr: string
        ): number | null {
          const m = timeStr.match(
            /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?/
          );
          if (!m) return null;

          const h = Number(m[1] || 0);
          const mi = Number(m[2] || 0);
          const se = Number(m[3] || 0);
          const ms = m[4] ? Number(String(m[4]).padEnd(3, "0").slice(0, 3)) : 0;

          const d = new Date(finishMs);
          const override = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            h,
            mi,
            se,
            ms
          );
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
            const builtOverride = buildOverrideFromFinishDate(
              finishEntry.ms,
              timeOnly
            );
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
            totalTimeDisplay: isDQ
              ? "DSQ"
              : isDNF
              ? "DNF"
              : formatDuration(total),
            epc: p.epc,
          });
        });

        // Deduplicate by EPC to ensure unique participants
        const uniqueRows = Array.from(
          new Map(baseRows.map(r => [r.epc, r])).values()
        );

        const finishers = uniqueRows.filter(
          (r) => r.totalTimeDisplay !== "DNF" && r.totalTimeDisplay !== "DSQ"
        );

        const finisherSorted = [...finishers]
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs)
          .map((r, i) => ({ ...r, rank: i + 1 }));

        const finisherRankByEpc = new Map(
          finisherSorted.map((r) => [r.epc, r.rank!])
        );

        const genderRankByEpc = new Map<string, number>();
        const genders = Array.from(
          new Set(finisherSorted.map((r) => (r.gender || "").toLowerCase()))
        );
        genders.forEach((g) => {
          const list = finisherSorted.filter(
            (r) => (r.gender || "").toLowerCase() === g
          );
          list.forEach((r, i) => genderRankByEpc.set(r.epc, i + 1));
        });

        // Use event-specific categories
        const categoryRankByEpc = new Map<string, number>();
        eventCategories.forEach((catKey: string) => {
          const list = finisherSorted.filter((r) => r.sourceCategoryKey === catKey);
          list.forEach((r, i) => categoryRankByEpc.set(r.epc, i + 1));
        });

        const dnfs = uniqueRows
          .filter((r) => r.totalTimeDisplay === "DNF")
          .sort((a, b) => a.totalTimeMs - b.totalTimeMs);
        const dsqs = uniqueRows.filter((r) => r.totalTimeDisplay === "DSQ");

        const overallFinal: LeaderRow[] = [
          ...finisherSorted,
          ...dnfs.map((r) => ({ ...r, rank: null })),
          ...dsqs.map((r) => ({ ...r, rank: null })),
        ];

        // Use event-specific categories for category map
        const catMap: Record<string, LeaderRow[]> = {};
        eventCategories.forEach((catKey: string) => {
          const list = overallFinal.filter((r) => r.sourceCategoryKey === catKey);
          catMap[catKey] = list;
        });

        setOverall(overallFinal);
        setByCategory(catMap);

        (LeaderboardApp as any)._rankMaps = {
          finisherRankByEpc,
          genderRankByEpc,
          categoryRankByEpc,
        };

        setState({ status: "ready" });
        setHasLoadedOnce(true);
      } catch (e: any) {
        const errorMsg = e?.message || "";
        if (errorMsg.includes("belum diupload")) {
          setState({
            status: "error",
            msg: "CSV files belum diupload untuk event ini. Silakan buka tab Admin untuk upload Master dan Finish CSV.",
          });
        } else {
          setState({
            status: "error",
            msg: e?.message || "Gagal load data",
          });
        }
      }
    })();
  }, [recalcTick, hasLoadedOnce, eventId, eventLoading, eventCategories]);

  // Refresh when Admin uploads CSV / changes title (cross-tab)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_DATA_VERSION) {
        setRecalcTick((t) => t + 1);
      }
      if (ev.key === LS_EVENT_TITLE) {
        setEventTitle(ev.newValue || DEFAULT_EVENT_TITLE);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Use event-specific categories for tabs
  const tabs = useMemo(
    () => ["Overall", ...eventCategories],
    [eventCategories]
  );

  // Jika data belum pernah berhasil dimuat (belum upload CSV),
  // tampilkan pesan error untuk upload CSV
  useEffect(() => {
    if (!hasLoadedOnce && state.status === "error") {
      // Keep showing error state
    }
  }, [hasLoadedOnce, state.status]);
  
  const onSelectParticipant = (row: LeaderRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  const modalData = useMemo(() => {
    if (!selected) return null;
    const maps = (LeaderboardApp as any)._rankMaps;
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

  // Jangan memblokir UI ketika data belum ada:
  // Admin harus tetap bisa diakses untuk upload CSV pertama kali.
  const needsFirstUpload = !hasLoadedOnce && (state.status === "loading" || state.status === "error");

  // Setelah first load: UI selalu tampil, meskipun data lagi refresh di background
  return (
    <>
      <Navbar showAdminButton={true} />

      <div className="flex">
        {/* Mobile Event Selector - Only visible on mobile */}
        <div className="lg:hidden w-full fixed bottom-0 left-0 right-0 z-40">
          {/* Backdrop */}
          {mobileEventSelectorOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileEventSelectorOpen(false)}
            />
          )}
          
          {/* Event List Drawer */}
          <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out ${
            mobileEventSelectorOpen ? 'translate-y-0' : 'translate-y-full'
          }`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Pilih Event</h3>
                <button 
                  onClick={() => setMobileEventSelectorOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setCurrentEvent(ev);
                      setMobileEventSelectorOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      currentEvent?.id === ev.id
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="font-semibold truncate">{ev.name}</div>
                    <div className={`text-sm mt-1 ${currentEvent?.id === ev.id ? 'text-red-100' : 'text-gray-500'}`}>
                      {ev.location || 'No location'}
                    </div>
                  </button>
                ))}
                {events.length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No events available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Events Sidebar - Desktop Only */}
        <aside className="w-64 min-h-screen bg-gray-50 border-r border-gray-200 p-4 hidden lg:block">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Events</h3>
          <div className="space-y-2">
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setCurrentEvent(ev)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  currentEvent?.id === ev.id
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="font-semibold text-sm truncate">{ev.name}</div>
                <div className={`text-xs mt-1 ${currentEvent?.id === ev.id ? 'text-red-100' : 'text-gray-500'}`}>
                  {ev.location || 'No location'}
                </div>
              </button>
            ))}
            {events.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">
                No events available
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 page">
          {/* Mobile: Current Event Selector - Compact inline style */}
          <div className="lg:hidden mb-3">
            <button 
              onClick={() => setMobileEventSelectorOpen(true)}
              className="w-full bg-red-600 text-white rounded-lg px-3 py-2 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="font-semibold text-sm truncate">{currentEvent?.name || 'Pilih Event'}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
              </div>
            </button>
          </div>

          {/* Title - Hidden on mobile since event name is shown in selector */}
          <h1 className="app-title hidden lg:block">{eventTitle}</h1>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={`tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Notice: first-time setup / missing upload */}
      {needsFirstUpload && (
        <div className="card">
          <div className="error-title">Data belum siap</div>
          <div style={{ marginTop: 6 }}>
            {state.status === "loading"
              ? state.msg
              : state.msg}
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/admin/overview" className="tab active">
              Buka Admin Panel untuk Upload CSV
            </Link>
          </div>
        </div>
      )}


      {activeTab === "Overall" && (
        <>
          {state.status === "ready" || hasLoadedOnce ? (
            <>
              <RaceClock />
              <LeaderboardTable
                title="Overall Result (All Categories)"
                rows={overall}
                onSelect={onSelectParticipant}
              />
            </>
          ) : (
            <div className="card">
              Silakan login tab <b>Admin</b> untuk upload CSV (Master &amp; Finish wajib; Start optional jika memakai start global per kategori).
            </div>
          )}
        </>
      )}


      {activeTab !== "Overall" && (
        <>
          {state.status === "ready" || hasLoadedOnce ? (
            <>
              <RaceClock />
              <CategorySection
                categoryKey={activeTab}
                rows={(byCategory as any)[activeTab] || []}
                onSelect={onSelectParticipant}
              />
            </>
          ) : (
            <div className="card">
              Data belum tersedia. Buka <Link to="/admin/overview" className="text-red-600 font-semibold hover:underline">Admin Panel</Link> untuk upload CSV.
            </div>
          )}
        </>
      )}

      <ParticipantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <EventProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/leaderboard" element={<LeaderboardApp />} />
        <Route path="/event" element={<UserEventPage />} />
        <Route path="/admin/home" element={<HomePage />} />
        <Route path="/admin/create-event" element={<CreateEventPage />} />
        <Route path="/event/:slug" element={<EventPage />} />

        {/* New Admin Routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="overview" element={<OverviewPageWrapper />} />
          <Route path="events" element={<EventsPageWrapper />} />
          <Route path="data" element={<DataPageWrapper />} />
          <Route path="banners" element={<BannersPageWrapper />} />
          <Route path="categories" element={<CategoriesPageWrapper />} />
          <Route path="timing" element={<TimingPageWrapper />} />
          <Route path="dq" element={<DQPageWrapper />} />
        </Route>
      </Routes>
    </EventProvider>
  );
}
