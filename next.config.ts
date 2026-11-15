import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* PWA-friendly */
  reactStrictMode: true,
  serverExternalPackages: ["pdfkit", "nodemailer", "@resvg/resvg-js"],
  async rewrites() {
    return [
      { source: "/api/transaction/:path*", destination: "/transaction/:path*" },
      { source: "/api/charge", destination: "/charge" },
      { source: "/api/charge/:path*", destination: "/charge/:path*" },
    ];
  },
};

export default nextConfig;
