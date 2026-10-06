import type { MetadataRoute } from "next";

/** Web app manifest: lets "Add to Home Screen" open GranaBank full screen with its icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GranaBank",
    short_name: "GranaBank",
    description: "Con cada compra, sumás orgullo granate.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafc",
    theme_color: "#f9fafc",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
