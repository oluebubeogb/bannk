/** @type {import('next').NextConfig} */
const nextConfig = {
  /* PWA-friendly */
  reactStrictMode: true,
  // pdfkit reads font metrics from disk and resvg-js ships a native binary — keep them out of the bundle.
  serverExternalPackages: ["pdfkit", "nodemailer", "@resvg/resvg-js"],
};

export default nextConfig;
