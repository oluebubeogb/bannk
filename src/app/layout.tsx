import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/** Righteous (OFL), self-hosted — brand wordmark "bannk" only. */
const brandFont = localFont({
  src: "../../assets/fonts/Righteous-Regular.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-brand",
  fallback: ["Arial Rounded MT Bold", "Trebuchet MS", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Bannk — Banking without borders",
  description: "Bannk — send, receive and manage money with your @username. Built in Nigeria.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bannk",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={brandFont.variable}>
      <body className="antialiased">
        <div className="bg-alive" aria-hidden>
          <span />
        </div>
        {children}
      </body>
    </html>
  );
}
