import { useMemo, useState } from "react";
import { exportLeaderboardCSV } from "../lib/csv";

export type LeaderRow = {
  rank: number | null;
  bib: string;
  name: string;
  gender: string;
  category: string;
  sourceCategoryKey: string;
  finishTimeRaw: string;
  totalTimeMs: number;
  totalTimeDisplay: string;
  epc: string;
};

export default function LeaderboardTable({
  title,
  rows,
  showTop10Badge = false,
  onSelect,
}: {
  title: string;
  rows: LeaderRow[];
  showTop10Badge?: boolean;
  onSelect?: (row: LeaderRow) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => String(r.bib).toLowerCase().includes(query));
  }, [q, rows]);

  const handleExport = () => {
    exportLeaderboardCSV(
      filtered.map(
        (r) =>
          ({
            ...r,
            rank: r.rank ?? "-",
          } as any)
      ),
      `${title.replace(/\s+/g, "_")}.csv`
    );
  };

  const showingCount = filtered.length;

  // Mobile Card Component
  const MobileCard = ({ r }: { r: LeaderRow }) => {
    const pos = r.rank ?? "-";
    const isTop10 = r.rank != null && r.rank <= 10;
    const isSpecial = r.totalTimeDisplay === "DNF" || r.totalTimeDisplay === "DSQ";

    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          isTop10 && showTop10Badge ? "bg-yellow-50 border-yellow-200" : ""
        } ${isSpecial ? "bg-gray-50" : ""}`}
        onClick={() => onSelect?.(r)}
      >
        {/* Top Row: Rank + Name + BIB */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm ${
              r.rank === 1
                ? "bg-yellow-400 text-yellow-900"
                : r.rank === 2
                ? "bg-gray-300 text-gray-800"
                : r.rank === 3
                ? "bg-amber-600 text-white"
                : "bg-gray-800 text-white"
            }`}
          >
            {pos}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 truncate">{r.name || "-"}</div>
            <div className="text-sm text-gray-500 font-mono">BIB: {r.bib || "-"}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500 mb-0.5">Gender</div>
            <div className="font-semibold text-gray-800">{r.gender || "-"}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500 mb-0.5">Category</div>
            <div className="font-semibold text-gray-800 truncate">{r.category || "-"}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xs text-gray-500 mb-0.5">Finish</div>
            <div className="font-mono font-semibold text-gray-800">{r.finishTimeRaw || "-"}</div>
          </div>
          <div className="bg-red-50 rounded-lg px-3 py-2">
            <div className="text-xs text-red-600 mb-0.5">Total Time</div>
            <div className={`font-mono font-bold ${isSpecial ? "text-orange-700" : "text-red-600"}`}>
              {r.totalTimeDisplay}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="header-row">
        <div>
          <h2 className="section-title">{title}</h2>
          <div className="subtle">
            Showing <b>{showingCount}</b> participants (valid EPC only)
          </div>
        </div>

        <div className="tools">
          <input
            className="search"
            type="text"
            placeholder="Search NO BIB…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn ghost" onClick={() => setQ("")}>
            Reset
          </button>
          <button className="btn" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden mt-4 space-y-3 max-h-[70vh] overflow-y-auto px-0">
        {filtered.map((r) => (
          <MobileCard key={r.epc} r={r} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            {rows.length === 0
              ? "Belum ada finisher (data waktu belum tersedia)."
              : "No data matched your search."}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block table-wrap">
        <table className="f1-table">
          <thead>
            <tr>
              <th className="col-rank">POS</th>
              <th className="col-bib">BIB</th>
              <th>NAME</th>
              <th className="col-gender">GENDER</th>
              <th className="col-cat">CATEGORY</th>
              <th className="col-time">FINISH</th>
              <th className="col-time">TOTAL</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => {
              const pos = r.rank ?? "-";
              const isTop10 = r.rank != null && r.rank <= 10;
              const isSpecial =
                r.totalTimeDisplay === "DNF" || r.totalTimeDisplay === "DSQ";

              return (
                <tr
                  key={r.epc}
                  className={[
                    "row-hover",
                    isTop10 && showTop10Badge ? "top10-row" : "",
                    isSpecial ? "special-row" : "",
                  ].join(" ")}
                >
                  <td className="pos-cell">
                    <span className={`pos-pill pos-${r.rank != null && r.rank <= 3 ? r.rank : "n"}`}>
                      {pos}
                    </span>
                  </td>

                  <td className="mono">
                    <button className="link-btn" onClick={() => onSelect?.(r)}>
                      {r.bib || "-"}
                    </button>
                  </td>

                  <td className="name-cell">
                    <button className="link-btn" onClick={() => onSelect?.(r)}>
                      {r.name || "-"}
                    </button>
                  </td>

                  <td>{r.gender || "-"}</td>
                  <td>{r.category || "-"}</td>
                  <td className="mono">{r.finishTimeRaw || "-"}</td>
                  <td className="mono strong">{r.totalTimeDisplay}</td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {rows.length === 0
                    ? "Belum ada finisher (data waktu belum tersedia)."
                    : "No data matched your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
