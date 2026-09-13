"use client";

import { useMemo, useState } from "react";

type CellRow = Record<string, string | number | boolean | null> & { id: string; updated_at?: string };
type Column = { key: string; label: string };
type Mutation = { key: string; payloadKey: string; label: string; options: string[]; valueType?: "string" | "boolean" };

export function ManagedTable({
  rows: initialRows,
  columns,
  mutations = [],
  endpointBase,
  canWrite = false,
  empty = "No records found.",
}: {
  rows: CellRow[];
  columns: Column[];
  mutations?: Mutation[];
  endpointBase?: string;
  canWrite?: boolean;
  empty?: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle))) : rows;
  }, [query, rows]);

  async function update(row: CellRow, mutation: Mutation, value: string) {
    if (!endpointBase) return;
    const key = `${row.id}:${mutation.key}`;
    setPending(key);
    setError("");
    try {
      const response = await fetch(`${endpointBase}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [mutation.payloadKey]: mutation.valueType === "boolean" ? value === "true" : value, ...(row.updated_at ? { expectedUpdatedAt: row.updated_at } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Update failed");
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, [mutation.key]: value, updated_at: result.data?.updated_at || item.updated_at } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed");
    } finally {
      setPending(null);
    }
  }

  return <section className="records">
    <div className="toolbar"><label className="search-label">Search records<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this table" /></label></div>
    {error ? <p className="error" role="alert">{error}</p> : null}
    {!visible.length ? <div className="empty-state">{empty}</div> : <div className="table-wrap"><table><thead><tr>
      {columns.map((column) => <th key={column.key}>{column.label}</th>)}
      {canWrite && mutations.length ? <th>Update</th> : null}
    </tr></thead><tbody>{visible.map((row) => <tr key={row.id}>
      {columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}
      {canWrite && mutations.length ? <td><div className="row-actions">{mutations.map((mutation) => {
        const busy = pending === `${row.id}:${mutation.key}`;
        return <label key={mutation.key}>{mutation.label}<select value={String(row[mutation.key] ?? "")} disabled={Boolean(pending)} onChange={(event) => update(row, mutation, event.target.value)} aria-busy={busy}>
          {mutation.options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
        </select></label>;
      })}</div></td> : null}
    </tr>)}</tbody></table></div>}
  </section>;
}
