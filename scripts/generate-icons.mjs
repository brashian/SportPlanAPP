// Genera los íconos PNG de la PWA (iPhone, Android) a partir de public/logo.svg.
// El logo es blanco sobre transparente: cada ícono lleva el fondo de la marca
// (--ink-950) y el logo centrado con margen.
// Uso: npm run generate-pwa-assets
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const BRAND_BG = "#0A0E14";
const SOURCE = "public/logo.svg";

// padding = margen por lado, como fracción del tamaño del ícono
const ICONS = [
  { file: "apple-touch-icon-180x180.png", size: 180, padding: 0.12 },
  { file: "pwa-64x64.png", size: 64, padding: 0.1 },
  { file: "pwa-192x192.png", size: 192, padding: 0.12 },
  { file: "pwa-512x512.png", size: 512, padding: 0.12 },
  // Android recorta los "maskable" en círculo: el logo tiene que entrar en la zona segura (80%)
  { file: "maskable-icon-512x512.png", size: 512, padding: 0.2 },
];

const svg = readFileSync(SOURCE, "utf8");
const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
const inner = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"));
if (!viewBox || !inner) throw new Error(`No se pudo leer ${SOURCE}`);
const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
const aspect = vbWidth / vbHeight;

for (const { file, size, padding } of ICONS) {
  const available = size * (1 - padding * 2);
  const width = aspect >= 1 ? available : available * aspect;
  const height = aspect >= 1 ? available / aspect : available;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  const composed = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BRAND_BG}"/>
  <svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}">${inner}</svg>
</svg>`;

  const png = new Resvg(composed, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(`public/${file}`, png);
  console.log(`public/${file} (${size}x${size})`);
}
