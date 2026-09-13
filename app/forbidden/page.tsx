import Link from "next/link";
export default function ForbiddenPage() { return <main className="centered"><section className="notice-card"><p className="eyebrow">Access denied</p><h1>Your role cannot access this area.</h1><p><Link href="/">Return to the dashboard</Link></p></section></main>; }
