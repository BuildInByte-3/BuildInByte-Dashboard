export function ConfigurationRequired() {
  return (
    <main className="centered">
      <section className="notice-card">
        <p className="eyebrow">Configuration required</p>
        <h1>Connect the dashboard to a staging Supabase project.</h1>
        <p>Copy <code>.env.example</code> to <code>.env.local</code>, add server-only credentials, and apply the checked-in migrations. This screen never substitutes mock business data.</p>
      </section>
    </main>
  );
}
