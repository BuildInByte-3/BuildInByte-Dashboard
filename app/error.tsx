"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="centered"><section className="notice-card"><p className="eyebrow">Unexpected error</p><h1>This dashboard view could not be loaded.</h1><button className="primary-button" onClick={reset}>Try again</button></section></main>; }
