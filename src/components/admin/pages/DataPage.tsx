import type { CsvKind } from "../../../lib/config";
import { putCsvFile, deleteCsvFile } from "../../../lib/idb";
import { parseCsv, countDataRows } from "../../../lib/csvParse";

interface DataPageProps {
  csvMeta: Array<{ key: CsvKind; filename: string; updatedAt: number; rows: number }>;
  eventId?: string;
  onCsvChange: () => void;
  onDataVersionBump: () => void;
  onConfigChanged: () => void;
}

export default function DataPage({ csvMeta, eventId, onCsvChange, onDataVersionBump, onConfigChanged }: DataPageProps) {
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

    onDataVersionBump();
    onConfigChanged();
    onCsvChange();
    alert(`'${kind}' berhasil diupload (${rows} baris)`);
  };

  const clearAllCsv = async () => {
    if (!confirm("Reset semua CSV yang sudah diupload?")) return;
    for (const k of ["master", "start", "finish", "checkpoint"] as CsvKind[]) {
      await deleteCsvFile(k, eventId);
    }
    onDataVersionBump();
    onConfigChanged();
    onCsvChange();
    alert("Semua CSV yang diupload telah dihapus");
  };

  const metaByKind: Partial<Record<CsvKind, { filename: string; updatedAt: number; rows: number }>> = {};
  csvMeta.forEach((x) => {
    metaByKind[x.key] = { filename: x.filename, updatedAt: x.updatedAt, rows: x.rows };
  });

  return (
    <>
      {/* CSV Upload */}
      <div className="card">
        <div className="header-row">
          <div>
            <h2 className="section-title">CSV Upload (Master / Start / Finish / Checkpoint)</h2>
            <div className="subtle">
              Data timing sekarang berasal dari file CSV upload (bukan Google Sheet).
              <b> Master &amp; Finish wajib</b>. <b>Start tidak wajib</b> jika kamu memakai
              <b> Category Start Times</b> (start global per kategori) di Timing page.
              Checkpoint optional.
            </div>
          </div>
          <div className="tools">
            <button className="btn ghost" onClick={onCsvChange}>
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
    </>
  );
}
