/**
 * 依存ライブラリなしの小さな CSV パーサ（RFC4180 相当）。
 * - ダブルクオート内のカンマ・改行・"" エスケープに対応
 * - CRLF / CR を LF に正規化
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 全セル空の行は捨てる
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** ヘッダ行をキーにしたオブジェクト配列に変換する（キーは小文字・trim）。 */
export function parseCsvObjects(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const table = parseCsv(text);
  if (table.length === 0) return { headers: [], rows: [] };
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const rows = table.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
