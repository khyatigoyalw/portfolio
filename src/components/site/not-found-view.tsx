import Link from "next/link";

export function NotFoundView() {
  return (
    <section className="section" style={{ minHeight: "100svh", display: "flex", alignItems: "center" }}>
      <div className="wrap">
        <span className="eyebrow">404</span>
        <h1 className="section-title">
          This page wandered <em>off.</em>
        </h1>
        <p className="lead">The page you were looking for doesn&apos;t exist, or it has moved.</p>
        <div className="hero-cta" style={{ opacity: 1, transform: "none" }}>
          <Link href="/" className="btn btn-primary">
            Back to home <span className="arr">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
