/** @type {import('next').NextConfig} */
const nextConfig = {
  /* PWA-friendly */
  reactStrictMode: true,
  // pdfkit reads its font metrics from disk — keep it (and nodemailer) out of the bundle.
  serverExternalPackages: ["pdfkit", "nodemailer"],
};

export default nextConfig;
