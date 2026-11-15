/** @type {import('next').NextConfig} */
const nextConfig = {
  /* PWA-friendly */
  reactStrictMode: true,
  // pdfkit reads font metrics from disk and resvg-js ships a native binary — keep them out of the bundle.
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
