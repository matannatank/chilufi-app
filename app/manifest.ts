import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "חילופי",
    short_name: "חילופי",
    description: "מערכת לניהול חילופי משמרות לכבאים",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#18181b",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "צור הצעה חדשה",
        url: "/offer/new",
      },
      {
        name: "הבקשות שלי",
        url: "/my-requests",
      },
      {
        name: "צוות",
        url: "/team",
      },
    ],
  };
}
