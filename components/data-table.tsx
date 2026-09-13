import type { Row } from "@/lib/dashboard/data";

export function DataTable({ rows, columns, empty = "No records found." }: { rows: Row[]; columns: { key: string; label: string; render?: (row: Row) => React.ReactNode }[]; empty?: string }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
      {rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? "—")}</td>)}</tr>)}
    </tbody></table></div>
  );
}
