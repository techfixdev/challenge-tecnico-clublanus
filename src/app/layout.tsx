import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { AppShell } from "@/shared/ui/AppShell";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GranaBank",
  description: "Con cada compra, sumás orgullo granate.",
};

/**
 * `viewport-fit=cover` lets the app draw under the notch/home indicator, and AppShell,
 * BottomNav and the login pad themselves with `env(safe-area-inset-*)`. User zoom stays
 * enabled (accessibility); inputs are 16px so iOS does not auto-zoom on focus instead.
 * The browser chrome takes the app background, not the brand granate: every screen
 * starts with a light header, and a granate bar above it would look like a separate band.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f9fafc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
