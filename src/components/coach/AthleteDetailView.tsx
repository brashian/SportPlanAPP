import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import type { Athlete, DailyBlock, Mesocycle, MesocyclePhase } from "../../types/models";
import { athleteFullName } from "../../types/models";
import MacrocycleCard from "./MacrocycleCard";
import IndividualPlanningView from "./IndividualPlanningView";

interface AthleteDetailViewProps {
  athletes: Athlete[];
  onCreateMacrocycle: (
    athleteId: string,
    data: { name: string; startDate: string; endDate: string }
  ) => void;
  onUpdateMacrocycle: (
    macrocycleId: string,
    data: { name: string; startDate: string; endDate: string }
  ) => void;
  onCreateMesocycle: (
    macrocycleId: string,
    data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }
  ) => void;
  onUpdateMesocycle: (
    mesocycleId: string,
    data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }
  ) => void;
  onReorderMesocycles: (macrocycleId: string, reordered: Mesocycle[]) => void;
  blocksByMesocycle: Record<string, DailyBlock[]>;
  onSaveBlock: (
    mesocycleId: string,
    block: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">,
    existingBlockId?: string
  ) => void;
  onDeleteBlock: (mesocycleId: string, blockId: string) => void;
}

/**
 * AthleteDetailView
 * ----------------------------------------------------------------------------
 * Ruta: /athletes/:athleteId
 *
 * Muestra el historial COMPLETO de Macrociclos del atleta (uno a muchos:
 * athlete.macrocycles: Macrocycle[]) — temporadas pasadas, actuales y futuras
 * conviven todas acá, nada se borra al crear un ciclo nuevo. Al seleccionar
 * una tarjeta, se abre debajo el editor completo (IndividualPlanningView)
 * para ESE macrociclo puntual.
 */
export default function AthleteDetailView({
  athletes,
  onCreateMacrocycle,
  onUpdateMacrocycle,
  onCreateMesocycle,
  onUpdateMesocycle,
  onReorderMesocycles,
  blocksByMesocycle,
  onSaveBlock,
  onDeleteBlock,
}: AthleteDetailViewProps) {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();

  const athlete = athletes.find((a) => a.id === athleteId);

  const [showNewMacroForm, setShowNewMacroForm] = useState(false);
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(
    athlete?.macrocycles[0]?.id ?? null
  );

  if (!athlete) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-400 mb-3">No se encontró este atleta.</p>
        <button onClick={() => navigate("/athletes")} className="text-sm text-blue-500 hover:underline">
          ← Volver a Mis Atletas
        </button>
      </div>
    );
  }

  // Historial ordenado del más reciente al más antiguo
  const sortedMacrocycles = [...athlete.macrocycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );
  const selectedMacrocycle = sortedMacrocycles.find((m) => m.id === selectedMacroId);
  const editingMacrocycle = sortedMacrocycles.find((m) => m.id === editingMacroId);

  return (
    <div className="space-y-8">
      {/* Header con navegación de vuelta al listado */}
      <div>
        <button
          onClick={() => navigate("/athletes")}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 mb-2"
        >
          <ArrowLeft size={14} /> Mis Atletas
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{athleteFullName(athlete)}</h1>
        <p className="text-xs text-gray-500">{athlete.email}</p>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Historial de Macrociclos (1 atleta : N macrociclos)             */}
      {/* -------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Historial de Macrociclos</h2>
          <button
            onClick={() => {
              setEditingMacroId(null);
              setShowNewMacroForm(true);
            }}
            className="flex items-center gap-1 text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg"
          >
            <Plus size={14} /> Nuevo macrociclo
          </button>
        </div>

        {showNewMacroForm && (
          <InlineMacroForm
            onSubmit={(data) => {
              onCreateMacrocycle(athlete.id, data);
              setShowNewMacroForm(false);
            }}
            onCancel={() => setShowNewMacroForm(false)}
          />
        )}

        {editingMacrocycle && (
          <InlineMacroForm
            initial={editingMacrocycle}
            onSubmit={(data) => {
              onUpdateMacrocycle(editingMacrocycle.id, data);
              setEditingMacroId(null);
            }}
            onCancel={() => setEditingMacroId(null)}
          />
        )}

        {sortedMacrocycles.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Este atleta todavía no tiene macrociclos. Creá el primero para empezar a planificar.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedMacrocycles.map((macro) => (
              <MacrocycleCard
                key={macro.id}
                macrocycle={macro}
                active={macro.id === selectedMacroId}
                onSelect={() => setSelectedMacroId(macro.id)}
                onEdit={() => {
                  setShowNewMacroForm(false);
                  setEditingMacroId(macro.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Editor completo del Macrociclo seleccionado                    */}
      {/* -------------------------------------------------------------- */}
      {selectedMacrocycle && (
        <div className="pt-4 border-t border-gray-100">
          <IndividualPlanningView
            macrocycle={selectedMacrocycle}
            onUpdateMacrocycle={(data) => onUpdateMacrocycle(selectedMacrocycle.id, data)}
            onCreateMesocycle={(data) => onCreateMesocycle(selectedMacrocycle.id, data)}
            onUpdateMesocycle={onUpdateMesocycle}
            onReorderMesocycles={(reordered) =>
              onReorderMesocycles(selectedMacrocycle.id, reordered)
            }
            blocksByMesocycle={blocksByMesocycle}
            onSaveBlock={onSaveBlock}
            onDeleteBlock={onDeleteBlock}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Formulario compacto de Macrociclo, usado tanto para crear como editar
// desde el historial (misma idea que en IndividualPlanningView, pero vive
// acá porque a este nivel el macrociclo todavía no fue seleccionado)
// ============================================================================
function InlineMacroForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; startDate: string; endDate: string };
  onSubmit: (data: { name: string; startDate: string; endDate: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");

  const canSubmit = name.trim() && startDate && endDate;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ name, startDate, endDate });
      }}
      className="rounded-xl border border-blue-100 bg-white p-4 space-y-3 shadow-card mb-3"
    >
      <p className="text-sm font-semibold text-gray-700">
        {initial ? "Editar macrociclo" : "Nuevo macrociclo"}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder='Ej: "Temporada 2027" o "Recuperación Lesión"'
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Fin</label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium px-4 py-2 hover:bg-blue-600 transition-colors"
        >
          {initial ? "Guardar cambios" : "Crear macrociclo"}
        </button>
      </div>
    </form>
  );
}
