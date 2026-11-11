import { useState, type MouseEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import type { RoutinePdfProps } from "./RoutinePdfDocument";

// Error con un mensaje pensado para mostrarle al coach (ej. "no hay sesiones cargadas")
export class PdfUserError extends Error {}

interface PdfButtonProps {
  // Arma el contenido al hacer clic (puede ir a buscar datos a Firestore)
  getDocument: () => RoutinePdfProps | Promise<RoutinePdfProps>;
  fileName: string;
  label?: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

const DEFAULT_CLASS =
  "bg-[var(--ink-800)] hover:bg-[var(--line-800)] border border-[var(--line-800)] text-[var(--mist-100)] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]";

// Botón "PDF" del coach: genera y descarga la rutina, con estado de carga
export default function PdfButton({ getDocument, fileName, label = "PDF", ariaLabel, className = DEFAULT_CLASS, disabled, onError }: PdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async (e: MouseEvent) => {
    // Puede estar dentro de un elemento clickeable (ej. el encabezado de una semana)
    e.stopPropagation();
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const doc = await getDocument();
      const { downloadRoutinePdf } = await import("./downloadRoutinePdf");
      await downloadRoutinePdf(doc, fileName);
    } catch (error) {
      if (error instanceof PdfUserError) {
        onError?.(error.message);
      } else {
        console.error("Error al generar el PDF:", error);
        onError?.("No se pudo generar el PDF. Probá de nuevo.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={disabled || isGenerating} aria-label={isGenerating ? "Generando PDF" : ariaLabel} title={ariaLabel} className={className}>
      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {label && <span>{isGenerating ? "Generando…" : label}</span>}
    </button>
  );
}
