import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { DailyBlock } from "../../types/models";
import RichTextViewer from "./RichTextViewer";

interface BlockCardProps {
  block: DailyBlock;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Mismo criterio que el selector de Volumen en DayBlockEditor: "Alto" usa el
// acento signal a pleno, el resto se queda en la escala neutra ink/mist para
// no competir visualmente.
const volumeStyles: Record<string, string> = {
  Bajo: "bg-[var(--ink-800)] text-[var(--mist-300)]",
  Medio: "bg-[var(--ink-800)] text-[var(--mist-100)]",
  Alto: "bg-[var(--signal-500)] text-[var(--ink-950)]",
};

export default function BlockCard({ block, readOnly = false, onEdit, onDelete }: BlockCardProps) {
  return (
    <div className="rounded-xl border border-[var(--line-800)] bg-[var(--ink-900)] p-3 space-y-2 hover:border-[var(--signal-500)]/50 transition-colors motion-reduce:transition-none">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--mist-100)] truncate">{block.sessionType}</p>
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="text-[var(--mist-500)] hover:text-[var(--signal-500)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] rounded p-1"
              aria-label="Editar bloque"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="text-[var(--mist-500)] hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded p-1"
              aria-label="Eliminar bloque"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-bold ${volumeStyles[block.volume]}`}>
          Vol. {block.volume}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[var(--ink-800)] text-[var(--mist-300)] font-bold">
          Intensidad {block.intensity}/10
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[var(--ink-800)] text-[var(--mist-300)] font-bold">
          {block.durationMinutes} min
        </span>
      </div>

      {/* RichTextViewer renderiza HTML de Quill, que trae estilos de texto
          oscuro por defecto (mismo motivo por el que Quill se aísla en panel
          claro en los editores). Como acá es solo lectura sobre fondo oscuro,
          forzamos el color de los nodos hijos en vez de aislar el panel. */}
      <div className="text-sm text-[var(--mist-300)] [&_*]:text-[var(--mist-300)] [&_strong]:text-[var(--mist-100)] [&_p]:my-1">
        <RichTextViewer html={block.notesHtml} />
      </div>
    </div>
  );
}