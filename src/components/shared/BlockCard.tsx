import React from "react";
import type { DailyBlock } from "../../types/models";
import RichTextViewer from "./RichTextViewer";

interface BlockCardProps {
  block: DailyBlock;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const volumeStyles: Record<string, string> = {
  Bajo: "bg-blue-100 text-blue-500",
  Medio: "bg-blue-200 text-blue-500",
  Alto: "bg-blue-500 text-white",
};

export default function BlockCard({ block, readOnly = false, onEdit, onDelete }: BlockCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-2 hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">{block.sessionType}</p>
        {!readOnly && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="text-xs text-blue-500 hover:underline"
              aria-label="Editar bloque"
            >
              Editar
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={onDelete}
              className="text-xs text-gray-400 hover:text-red-500"
              aria-label="Eliminar bloque"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-medium ${volumeStyles[block.volume]}`}>
          Vol. {block.volume}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
          Intensidad {block.intensity}/10
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
          {block.durationMinutes} min
        </span>
      </div>

      <RichTextViewer html={block.notesHtml} />
    </div>
  );
}
