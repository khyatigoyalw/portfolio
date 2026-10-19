import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@portfolio/core"],
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/media/**" }]
      : [],
  },
  async redirects() {
    return [
      // The dashboard lives in apps/admin; old /admin links forward there when its URL is configured.
      ...(adminUrl
        ? [
            { source: "/admin", destination: `${adminUrl}/`, permanent: false },
            { source: "/admin/:path*", destination: `${adminUrl}/:path*`, permanent: false },
          ]
        : []),
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/case-studies/:slug.html", destination: "/case-studies/:slug", permanent: true },
      { source: "/articles/:slug.html", destination: "/articles/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
