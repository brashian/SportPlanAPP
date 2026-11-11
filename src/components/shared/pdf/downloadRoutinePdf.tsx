import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import RoutinePdfDocument, { type RoutinePdfProps } from "./RoutinePdfDocument";

// "Mesociclo Fuerza / Semana 2" → "Mesociclo_Fuerza_Semana_2"
const toFileName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Rutina";

// Arma el documento fuera de pantalla, lo convierte a PDF y lo descarga.
// html2pdf (~1 MB) se carga recién acá, la primera vez que el coach pide un PDF.
export async function downloadRoutinePdf(doc: RoutinePdfProps, fileName: string) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(<RoutinePdfDocument {...doc} />));
    const { default: html2pdf } = await import("html2pdf.js");
    const worker = html2pdf();
    // `pagebreak` existe en html2pdf.js pero falta en sus tipos: de ahí la aserción
    const options = {
      margin: 10,
      filename: `${toFileName(fileName)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#FFFFFF" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      // Respeta los saltos entre semanas y no corta filas ni títulos de día a la mitad
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".pdf-day-header"] },
    } as Parameters<typeof worker.set>[0];
    await worker
      .set(options)
      .from(host.firstElementChild as HTMLElement)
      .save();
  } finally {
    root.unmount();
    host.remove();
  }
}
