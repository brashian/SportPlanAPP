import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Service worker: guarda la app en el dispositivo para que abra sin conexión.
    // Los datos sin conexión los cubre la caché persistente de Firestore (src/firebase.ts).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "SportPlan",
        short_name: "SportPlan",
        description: "Planificación de entrenamientos para coaches y atletas.",
        lang: "es",
        start_url: "/",
        display: "standalone",
        background_color: "#0A0E14",
        theme_color: "#0A0E14",
        // PNG generados con `npm run generate-pwa-assets` (scripts/generate-icons.mjs)
        icons: [
          { src: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // html2pdf (~1 MB) solo se usa al exportar el PDF: no lo descargamos por adelantado
        globIgnores: ["**/html2pdf-*.js"],
        navigateFallback: "/index.html",
        // Las rutas internas de Firebase (/__/auth, etc.) siempre van a la red
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Librerías que casi no cambian, en archivos propios: el navegador las
        // conserva entre deploys y solo vuelve a bajar el código de la app.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) {
            return "vendor-firebase";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
