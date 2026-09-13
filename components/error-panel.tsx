export function ErrorPanel({ error }: { error: unknown }) {
  return <section className="notice-card"><p className="eyebrow">Data unavailable</p><h2>The dashboard could not load this dataset.</h2><p>{error instanceof Error ? error.message : "Unknown data error"}</p></section>;
}
