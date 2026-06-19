import type { MetadataRoute } from "next";

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512] as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Creality Hub",
    short_name: "Creality Hub",
    description: "Local dashboard for Creality K1C 2025",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#2C6B2F",
    icons: [
      ...iconSizes.map((size) => ({
        src: `/icons/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png" as const,
      })),
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
