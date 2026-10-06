import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { APP_BACKGROUND_COLOR } from "@/shared/lib/theme";
import { AppShell } from "@/shared/ui/AppShell";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  // Only the weights the UI uses (font-normal, font-medium, font-semibold): each one is
  // a font file the browser may download.
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GranaBank",
  description: "Con cada compra, sumás orgullo granate.",
};

/**
 * `viewport-fit=cover` lets the app draw under the notch/home indicator, so the insets are
 * handled explicitly: AppShell pads the top, left and right (`env(safe-area-inset-*)`); the
 * fixed BottomNav and the login form pad the bottom, and the signed-in layout reserves the
 * nav height plus the bottom inset. User zoom stays enabled (accessibility); inputs are 16px
 * so iOS does not auto-zoom on focus instead.
 * The browser chrome takes the app background, not the brand granate: every screen starts
 * with a light header, and a granate bar above it would look like a separate band.
 * `colorScheme: "light"`: the app has no dark theme, so the browser must not render form
 * controls and scrollbars in dark mode when the device is set to dark.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_BACKGROUND_COLOR,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browsers add their own attributes to <html> before React hydrates (Chrome for iOS
    // injects `__gcrremoteframetoken`); this silences that one-level mismatch only.
    <html
      lang="es"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
