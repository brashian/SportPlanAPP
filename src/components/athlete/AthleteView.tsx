import React, { useMemo, useState } from "react";
import type { Athlete, DailyBlock, Mesocycle } from "../../types/models";
import { useMesocycleWeeks } from "../../hooks/useMesocycleWeeks";
import { formatWeekRange, isCurrentPeriod } from "../../utils/dateUtils";
import WeekAccordion from "../shared/WeekAccordion";

interface AthleteViewProps {
  athlete: Athlete;
  /** Bloques diarios de todos los mesociclos del atleta, indexados por mesocycleId */
  blocksByMesocycle: Record<string, DailyBlock[]>;
}

/**
 * AthleteView
 * ----------------------------------------------------------------------------
 * Vista de Solo Lectura para el rol Atleta:
 * - Sin Sidebar (se usa junto a <AthleteTopbar />, ver layout).
 * - No hay drag-and-drop: los mesociclos se listan en orden fijo (by `order`).
 * - No hay botones de "Agregar", "Editar" ni "Guardar" (WeekAccordion con readOnly).
 * - Se resalta en azul primario `#0960ae` el Mesociclo, Semana y Día actuales.
 */
export default function AthleteView({ athlete, blocksByMesocycle }: AthleteViewProps) {
  const macrocycle = athlete.macrocycles[0];
  const orderedMesocycles = useMemo(
    () => [...(macrocycle?.mesocycles ?? [])].sort((a, b) => a.order - b.order),
    [macrocycle]
  );

  const currentMesocycle =
    orderedMesocycles.find((m) => isCurrentPeriod(m.startDate, m.endDate)) ?? orderedMesocycles[0];

  const [selectedMesoId, setSelectedMesoId] = useState<string | undefined>(currentMesocycle?.id);
  const activeMesocycle = orderedMesocycles.find((m) => m.id === selectedMesoId);

  const activeBlocks = activeMesocycle ? blocksByMesocycle[activeMesocycle.id] ?? [] : [];
  const weeks = useMesocycleWeeks(
    activeMesocycle ?? placeholderMesocycle(),
    activeBlocks
  );

  if (!macrocycle) {
    return (
      <div className="p-8 text-center text-gray-400">
        Todavía no tenés un plan de entrenamiento asignado.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{macrocycle.name}</h1>
        <p className="text-xs text-gray-500">
          {macrocycle.startDate} → {macrocycle.endDate}
        </p>
      </div>

      {/* Navegación de mesociclos: lista simple en orden fijo, sin handle de drag */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {orderedMesocycles.map((meso) => {
          const isActive = meso.id === activeMesocycle?.id;
          const isCurrent = meso.id === currentMesocycle?.id;
          return (
            <button
              key={meso.id}
              onClick={() => setSelectedMesoId(meso.id)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-left transition-colors ${
                isActive
                  ? "bg-blue-500 border-blue-500 text-white"
                  : isCurrent
                  ? "border-blue-300 text-blue-500 bg-blue-100/40"
                  : "border-gray-200 text-gray-600 hover:border-blue-200"
              }`}
            >
              <p className="text-xs font-medium">{meso.name}</p>
              <p className={`text-[10px] ${isActive ? "text-blue-100" : "text-gray-400"}`}>
                {meso.phase}
              </p>
            </button>
          );
        })}
      </div>

      {activeMesocycle && (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            {activeMesocycle.startDate} → {activeMesocycle.endDate}
          </p>
          {/* readOnly=true: sin drag&drop, sin botones de agregar/editar/eliminar,
              y el HTML de Quill se pinta estático dentro de BlockCard -> RichTextViewer */}
          <WeekAccordion weeks={weeks} readOnly />
        </div>
      )}
    </div>
  );
}

function placeholderMesocycle(): Mesocycle {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    macrocycleId: "",
    name: "",
    phase: "Preparación General",
    startDate: today,
    endDate: today,
    order: 0,
  };
}
