import React, { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { DailyBlock, Macrocycle, Mesocycle, MesocyclePhase } from "../../types/models";
import { MESOCYCLE_PHASES } from "../../types/models";
import { useMesocycleWeeks } from "../../hooks/useMesocycleWeeks";
import MesocycleDragList from "./MesocycleDragList";
import DayBlockEditor from "./DayBlockEditor";
import WeekAccordion from "../shared/WeekAccordion";

interface IndividualPlanningViewProps {
  macrocycle: Macrocycle;
  onUpdateMacrocycle: (data: { name: string; startDate: string; endDate: string }) => void;
  onCreateMesocycle: (data: {
    name: string;
    phase: MesocyclePhase;
    startDate: string;
    endDate: string;
  }) => void;
  onUpdateMesocycle: (
    mesocycleId: string,
    data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }
  ) => void;
  onReorderMesocycles: (reordered: Mesocycle[]) => void;
  /** Bloques diarios de TODOS los mesociclos de este macrociclo, indexados por mesocycleId */
  blocksByMesocycle: Record<string, DailyBlock[]>;
  onSaveBlock: (
    mesocycleId: string,
    block: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">,
    existingBlockId?: string // si viene, es UPDATE; si no, es CREATE
  ) => void;
  onDeleteBlock: (mesocycleId: string, blockId: string) => void;
}

/**
 * IndividualPlanningView
 * ----------------------------------------------------------------------------
 * Editor "hoja" de la planificación individual: opera sobre UN Macrociclo
 * concreto, ya seleccionado en AthleteDetailView desde el historial del
 * atleta. Permite:
 *  - Editar nombre/fechas del propio macrociclo (no crearlo — eso vive un
 *    nivel arriba, en AthleteDetailView, junto al resto del historial).
 *  - Crear y editar Mesociclos (nombre, fase, fechas) + reordenarlos (drag&drop).
 *  - CRUD completo de bloques diarios dentro del acordeón semanal calculado.
 */
export default function IndividualPlanningView({
  macrocycle,
  onUpdateMacrocycle,
  onCreateMesocycle,
  onUpdateMesocycle,
  onReorderMesocycles,
  blocksByMesocycle,
  onSaveBlock,
  onDeleteBlock,
}: IndividualPlanningViewProps) {
  const [editingMacro, setEditingMacro] = useState(false);
  const [showMesoForm, setShowMesoForm] = useState(false);
  const [editingMesoId, setEditingMesoId] = useState<string | null>(null);
  const [activeMesoId, setActiveMesoId] = useState<string | null>(
    macrocycle.mesocycles[0]?.id ?? null
  );
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<DailyBlock | undefined>(undefined);

  const activeMesocycle = macrocycle.mesocycles.find((m) => m.id === activeMesoId);
  const editingMesocycle = macrocycle.mesocycles.find((m) => m.id === editingMesoId);
  const activeBlocks = activeMesocycle ? blocksByMesocycle[activeMesocycle.id] ?? [] : [];

  // Semanas calculadas automáticamente a partir de las fechas del mesociclo activo
  const weeks = useMesocycleWeeks(
    activeMesocycle ?? {
      id: "",
      macrocycleId: macrocycle.id,
      name: "",
      phase: "Preparación General",
      startDate: macrocycle.startDate,
      endDate: macrocycle.startDate,
      order: 0,
    },
    activeBlocks
  );

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Datos del Macrociclo (editable in-place)                         */}
      {/* ---------------------------------------------------------------- */}
      {editingMacro ? (
        <MacrocycleForm
          initial={macrocycle}
          onSubmit={(data) => {
            onUpdateMacrocycle(data);
            setEditingMacro(false);
          }}
          onCancel={() => setEditingMacro(false)}
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{macrocycle.name}</h2>
            <p className="text-xs text-gray-500">
              {macrocycle.startDate} → {macrocycle.endDate}
            </p>
          </div>
          <button
            onClick={() => setEditingMacro(true)}
            className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
          >
            <Pencil size={14} /> Editar macrociclo
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* -------------------------------------------------------------- */}
        {/* Columna izquierda: Mesociclos (crear, editar, reordenar)        */}
        {/* -------------------------------------------------------------- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Mesociclos</h3>
            <button
              onClick={() => {
                setEditingMesoId(null);
                setShowMesoForm(true);
              }}
              className="flex items-center gap-1 text-xs text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1.5 rounded-lg"
            >
              <Plus size={14} /> Nuevo
            </button>
          </div>

          {showMesoForm && (
            <MesocycleForm
              onSubmit={(data) => {
                onCreateMesocycle(data);
                setShowMesoForm(false);
              }}
              onCancel={() => setShowMesoForm(false)}
            />
          )}

          {editingMesocycle && (
            <MesocycleForm
              initial={editingMesocycle}
              onSubmit={(data) => {
                onUpdateMesocycle(editingMesocycle.id, data);
                setEditingMesoId(null);
              }}
              onCancel={() => setEditingMesoId(null)}
            />
          )}

          <MesocycleDragList
            mesocycles={macrocycle.mesocycles}
            activeMesocycleId={activeMesoId}
            onSelect={setActiveMesoId}
            onEdit={(mesoId) => {
              setShowMesoForm(false);
              setEditingMesoId(mesoId);
            }}
            onReorder={onReorderMesocycles}
          />
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Columna derecha: Acordeón semanal del mesociclo activo         */}
        {/* -------------------------------------------------------------- */}
        <div>
          {!activeMesocycle ? (
            <p className="text-sm text-gray-400 italic">
              Seleccioná o creá un mesociclo para ver su planificación semanal.
            </p>
          ) : (
            <>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {activeMesocycle.name}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    · {activeMesocycle.phase}
                  </span>
                </h3>
              </div>

              {editingDate && (
                <div className="mb-3">
                  <DayBlockEditor
                    date={editingDate}
                    initialBlock={editingBlock}
                    onCancel={() => {
                      setEditingDate(null);
                      setEditingBlock(undefined);
                    }}
                    onSave={(data) => {
                      // Si editingBlock existe, es un UPDATE; si no, es un CREATE.
                      onSaveBlock(activeMesocycle.id, data, editingBlock?.id);
                      setEditingDate(null);
                      setEditingBlock(undefined);
                    }}
                  />
                </div>
              )}

              <WeekAccordion
                weeks={weeks}
                onAddBlock={(date) => {
                  setEditingDate(date);
                  setEditingBlock(undefined);
                }}
                onEditBlock={(date, block) => {
                  setEditingDate(date);
                  setEditingBlock(block);
                }}
                onDeleteBlock={(_date, blockId) => onDeleteBlock(activeMesocycle.id, blockId)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Formulario de Macrociclo — sirve tanto para crear (sin `initial`) como para
// editar (con `initial` precargado)
// ============================================================================
function MacrocycleForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; startDate: string; endDate: string };
  onSubmit: (data: { name: string; startDate: string; endDate: string }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState<Date | null>(
    initial ? new Date(initial.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(initial ? new Date(initial.endDate) : null);

  const canSubmit = name.trim() && startDate && endDate;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          name,
          startDate: startDate!.toISOString().slice(0, 10),
          endDate: endDate!.toISOString().slice(0, 10),
        });
      }}
      className="rounded-xl border border-blue-100 bg-white p-4 space-y-3 shadow-card"
    >
      <h3 className="text-sm font-semibold text-gray-700">
        {initial ? "Editar Macrociclo" : "Nuevo Macrociclo"}
      </h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Temporada 2026"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Inicio</label>
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            dateFormat="dd/MM/yyyy"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            placeholderText="Seleccionar fecha"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Fin</label>
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            dateFormat="dd/MM/yyyy"
            minDate={startDate ?? undefined}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            placeholderText="Seleccionar fecha"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
        )}
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

// ============================================================================
// Formulario de Mesociclo — sirve tanto para crear como para editar
// ============================================================================
function MesocycleForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; phase: MesocyclePhase; startDate: string; endDate: string };
  onSubmit: (data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phase, setPhase] = useState<MesocyclePhase>(initial?.phase ?? MESOCYCLE_PHASES[0]);
  const [startDate, setStartDate] = useState<Date | null>(
    initial ? new Date(initial.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(initial ? new Date(initial.endDate) : null);

  const canSubmit = name.trim() && startDate && endDate;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          name,
          phase,
          startDate: startDate!.toISOString().slice(0, 10),
          endDate: endDate!.toISOString().slice(0, 10),
        });
      }}
      className="rounded-xl border border-blue-100 bg-white p-3 space-y-2 mb-3 shadow-card"
    >
      <p className="text-xs font-semibold text-gray-500">
        {initial ? "Editar mesociclo" : "Nuevo mesociclo"}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Base General 1"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
      />
      <select
        value={phase}
        onChange={(e) => setPhase(e.target.value as MesocyclePhase)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
      >
        {MESOCYCLE_PHASES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          selected={startDate}
          onChange={setStartDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="Inicio"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        />
        <DatePicker
          selected={endDate}
          onChange={setEndDate}
          dateFormat="dd/MM/yyyy"
          minDate={startDate ?? undefined}
          placeholderText="Fin"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium hover:bg-blue-600"
        >
          {initial ? "Guardar cambios" : "Crear mesociclo"}
        </button>
      </div>
    </form>
  );
}
