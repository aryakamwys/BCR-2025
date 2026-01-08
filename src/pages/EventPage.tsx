// src/pages/EventPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RaceClock from "../components/RaceClock";
import CategorySection from "../components/CategorySection";
import LeaderboardTable, { LeaderRow } from "../components/LeaderboardTable";
import ParticipantModal from "../components/ParticipantModal";
import AdminPage from "../components/AdminPage";
import Navbar from "../components/Navbar";
import {
  loadMasterParticipants,
  loadTimesMap,
  loadCheckpointTimesMap,
} from "../lib/data";
import { DEFAULT_EVENT_TITLE, LS_EVENT_TITLE, LS_DATA_VERSION, getCategoriesForEvent } from "../lib/config";
import parseTimeToMs, { extractTimeOfDay, formatDuration } from "../lib/time";

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

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

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
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load event info and categories
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        // Load events to find matching event ID
        const response = await fetch('/api/events');
        if (response.ok) {
          const events = await response.json();
          const event = events.find((e: any) => e.slug === slug);
          if (event) {
            setEventId(event.id);
            setEventTitle(event.name);
            setCategories(event.categories || []);
            setSettingsLoaded(true);
          }
        }
      } catch (error) {
        setSettingsLoaded(true);
      }
    })();
  }, [slug]);

  useEffect(() => {
    setSettingsLoaded(true);
  }, [eventId]);

  useEffect(() => {
    if (!settingsLoaded || !eventId) return;

    (async () => {
      try {
        if (!hasLoadedOnce) {
          setState({
            status: "loading",
            msg: "Load master peserta (CSV)…",
          });
        }

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

        const finishers = baseRows.filter(
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

        const categoryRankByEpc = new Map<string, number>();
        categories.forEach((catKey) => {
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
        categories.forEach((catKey) => {
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
  }, [recalcTick, hasLoadedOnce, settingsLoaded, eventId, categories]);

  // 🔁 Refresh when Admin uploads CSV / changes title (cross-tab)
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

  const tabs = useMemo(
    () => ["Overall", ...categories, "Admin"],
    [categories]
  );

  // ✅ Jika data belum pernah berhasil dimuat (belum upload CSV),
  // langsung arahkan user ke tab Admin agar bisa upload.
  useEffect(() => {
    if (!hasLoadedOnce && state.status === "error") {
      setActiveTab("Admin");
    }
  }, [hasLoadedOnce, state.status]);

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

  // ✅ Jangan memblokir UI ketika data belum ada:
  // Admin harus tetap bisa diakses untuk upload CSV pertama kali.
  const needsFirstUpload = !hasLoadedOnce && (state.status === "loading" || state.status === "error");

  return (
    <>
      <Navbar />
      <div className="page">
        <div className="event-header">
          <Link to="/" className="back-link">← Back to Events</Link>
          <h1 className="app-title">{eventTitle}</h1>
        </div>

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

      {/*  Notice: first-time setup / missing upload */}
      {needsFirstUpload && activeTab !== "Admin" && (
        <div className="card">
          <div className="error-title">Data belum siap</div>
          <div style={{ marginTop: 6 }}>
            {state.status === "loading"
              ? state.msg
              : state.msg}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="tab active" onClick={() => setActiveTab("Admin")}>
              Buka Admin untuk Upload CSV
            </button>
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


      {activeTab !== "Overall" && activeTab !== "Admin" && (
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
              Data belum tersedia. Buka tab <b>Admin</b> untuk upload CSV.
            </div>
          )}
        </>
      )}


      {activeTab === "Admin" && (
        <AdminPage
          eventId={eventId || undefined}
          allRows={overall}
          onConfigChanged={() => setRecalcTick((t) => t + 1)}
        />
      )}

      <ParticipantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />

      <style>{`
        .event-header {
          margin-bottom: 1rem;
        }

        .back-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 0.5rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #5568d3;
          text-decoration: underline;
        }
      `}</style>
      </div>
    </>
  );
}
