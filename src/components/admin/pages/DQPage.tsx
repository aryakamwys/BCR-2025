import { useMemo, useState } from "react";
import type { LeaderRow } from "../../LeaderboardTable";

interface DQPageProps {
  allRows: LeaderRow[];
  onConfigChanged: () => void;
  onDataVersionBump: () => void;
}

const LS_DQ = "imr_dq_map";

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

export default function DQPage({ allRows, onConfigChanged, onDataVersionBump }: DQPageProps) {
  const [q, setQ] = useState("");
  const [dqMap, setDqMap] = useState<Record<string, boolean>>(loadDQMap());

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return allRows;
    return allRows.filter(
      (r) =>
        (r.bib || "").toLowerCase().includes(qq) ||
        (r.name || "").toLowerCase().includes(qq)
    );
  }, [q, allRows]);

  const toggleDQ = async (epc: string) => {
    const next = { ...dqMap, [epc]: !dqMap[epc] };
    if (!next[epc]) delete next[epc];
    setDqMap(next);
    saveDQMap(next);
    onDataVersionBump();
    onConfigChanged();
  };

  return (
    <>
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

        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: '#e7f3ff',
          border: '1px solid #2196F3',
          borderRadius: '8px',
          color: '#0d47a1',
          fontSize: '13px'
        }}>
          <strong>Info:</strong> Total {Object.values(dqMap).filter(Boolean).length} peserta di-DSQ.
        </div>
      </div>
    </>
  );
}
