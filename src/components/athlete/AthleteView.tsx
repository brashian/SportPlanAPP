import React, { useMemo, useState } from "react";
import type { Athlete, DailyBlock, Mesocycle } from "../../types/models";
import { useMesocycleWeeks } from "../../hooks/useMesocycleWeeks";
import { formatWeekRange, isCurrentPeriod } from "../../utils/dateUtils";
import WeekAccordion from "../shared/WeekAccordion";

interface AthleteViewProps {
  athlete: Athlete;
  blocksByMesocycle: Record<string, DailyBlock[]>;
}

export default function AthleteView({ athlete, blocksByMesocycle }: AthleteViewProps) {
  const fullName = athlete.firstName 
    ? `${athlete.firstName} ${athlete.lastName}` 
    : athlete.name;

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      
      {/* TARJETA DE PERFIL DEL ATLETA */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hola, {fullName}</h1>
            <span className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-medium border border-blue-100">
              {athlete.sport || "Deporte no especificado"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-600 bg-gray-50 p-3 rounded-md w-full md:w-auto border border-gray-100">
          {athlete.email && (
            <div className="flex items-center gap-2">
              <span>✉️</span> {athlete.email}
            </div>
          )}
          {athlete.phone && (
            <div className="flex items-center gap-2">
              <span>📱</span> {athlete.phone}
            </div>
          )}
        </div>
      </div>

      {/* PLANIFICACIÓN (MACROCICLOS Y MESOCICLOS) */}
      {!macrocycle ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
          Todavía no tenés un plan de entrenamiento asignado por tu entrenador.
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900">{macrocycle.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {macrocycle.startDate} al {macrocycle.endDate}
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {orderedMesocycles.map((meso) => {
              const isActive = meso.id === activeMesocycle?.id;
              const isCurrent = meso.id === currentMesocycle?.id;
              return (
                <button
                  key={meso.id}
                  onClick={() => setSelectedMesoId(meso.id)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : isCurrent
                      ? "border-blue-300 text-blue-600 bg-blue-50"
                      : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-semibold">{meso.name}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${isActive ? "text-blue-100" : "text-gray-500"}`}>
                    {meso.phase}
                  </p>
                </button>
              );
            })}
          </div>

          {activeMesocycle && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Bloques de {activeMesocycle.name}
                </h3>
                <p className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {activeMesocycle.startDate} → {activeMesocycle.endDate}
                </p>
              </div>
              
              <WeekAccordion weeks={weeks} readOnly />
            </div>
          )}
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