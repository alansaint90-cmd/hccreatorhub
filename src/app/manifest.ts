import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HC Agency — Creator Platform",
    short_name: "HC Agency",
    description: "Conecte creators, marcas e campanhas com a HC Agency.",
    lang: "pt-BR",
    start_url: "/?view=overview",
    scope: "/",
    display: "standalone",
    background_color: "#F5F5F5",
    theme_color: "#101010",
    icons: [
      {
        src: "/icons/app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
