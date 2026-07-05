import React from "react";
import { Pencil } from "lucide-react";
import type { Macrocycle } from "../../types/models";
import { isCurrentPeriod } from "../../utils/dateUtils";

interface MacrocycleCardProps {
  macrocycle: Macrocycle;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

/**
 * MacrocycleCard
 * ----------------------------------------------------------------------------
 * Representa UN registro del historial de ciclos del atleta (ej. "Temporada
 * 2024", "Temporada 2025", "Recuperación Lesión"). El historial completo vive
 * en athlete.macrocycles: Macrocycle[], así que ningún ciclo pasado se pierde
 * al crear uno nuevo.
 */
export default function MacrocycleCard({ macrocycle, active, onSelect, onEdit }: MacrocycleCardProps) {
  const vigente = isCurrentPeriod(macrocycle.startDate, macrocycle.endDate);

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
        active ? "border-blue-500 bg-blue-100/40" : "border-gray-200 bg-white hover:border-blue-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-semibold ${active ? "text-blue-500" : "text-gray-900"}`}>
            {macrocycle.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {macrocycle.startDate} → {macrocycle.endDate}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {vigente && (
            <span className="text-[10px] uppercase tracking-wide bg-blue-500 text-white px-2 py-0.5 rounded-full">
              Vigente
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-blue-500"
            aria-label="Editar macrociclo"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {macrocycle.mesocycles.length}{" "}
        {macrocycle.mesocycles.length === 1 ? "mesociclo" : "mesociclos"}
      </p>
    </div>
  );
}
