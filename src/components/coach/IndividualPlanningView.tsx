import React, { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
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

// ── Helpers de fecha "seguros" respecto al huso horario ─────────────────────
// new Date("YYYY-MM-DD") se interpreta como medianoche UTC: en husos negativos
// (Argentina, UTC-3) el DatePicker termina mostrando el día anterior. Fijamos
// la hora al mediodía para que nunca cruce el límite de día, y al formatear de
// vuelta usamos los componentes locales en vez de toISOString() (que vuelve a
// pasar por UTC). Mismo criterio que ya usa el resto del código (AthleteView,
// AthleteDetailView) al parsear fechas de mesociclos.
const parseLocalDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  return new Date(dateStr + "T12:00:00");
};

const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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

  // Re-sincroniza activeMesoId si: (a) todavía no había ninguno seleccionado y
  // los mesociclos llegaron después (fetch async), o (b) el mesociclo activo
  // fue eliminado en otra pestaña/por otro coach y ya no existe en la lista.
  // Sin esto, activeMesoId podía quedar apuntando a un id fantasma para siempre.
  useEffect(() => {
    const stillExists = macrocycle.mesocycles.some((m) => m.id === activeMesoId);
    if (!stillExists) {
      setActiveMesoId(macrocycle.mesocycles[0]?.id ?? null);
      setEditingDate(null);
      setEditingBlock(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macrocycle.mesocycles]);

  // Objeto estable para el fallback: si se recrea en cada render (como antes,
  // inline en el JSX) invalida cualquier memoización interna de useMesocycleWeeks.
  const fallbackMesocycle = useMemo(
    () => ({
      id: "",
      macrocycleId: macrocycle.id,
      name: "",
      phase: "Preparación General" as MesocyclePhase,
      startDate: macrocycle.startDate,
      endDate: macrocycle.startDate,
      order: 0,
    }),
    [macrocycle.id, macrocycle.startDate]
  );

  // Semanas calculadas automáticamente a partir de las fechas del mesociclo activo
  const weeks = useMesocycleWeeks(activeMesocycle ?? fallbackMesocycle, activeBlocks);

  // Cambiar de mesociclo activo cierra el editor de día: si quedaba abierto
  // con una fecha del mesociclo anterior, guardar hubiera escrito el bloque
  // en el mesociclo nuevo con la fecha vieja (bug real, sin ningún aviso).
  const handleSelectMesocycle = (mesoId: string) => {
    setActiveMesoId(mesoId);
    setEditingDate(null);
    setEditingBlock(undefined);
  };

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
            className="flex items-center gap-1 text-sm text-blue-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md px-1"
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
              className="flex items-center gap-1 text-xs text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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
            onSelect={handleSelectMesocycle}
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
  const [startDate, setStartDate] = useState<Date | null>(parseLocalDate(initial?.startDate));
  const [endDate, setEndDate] = useState<Date | null>(parseLocalDate(initial?.endDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = name.trim() && startDate && endDate && !isSubmitting;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
          await onSubmit({
            name,
            startDate: formatLocalDate(startDate!),
            endDate: formatLocalDate(endDate!),
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="rounded-xl border border-blue-100 bg-white p-4 space-y-3 shadow-card"
    >
      <h3 className="text-sm font-semibold text-gray-700">
        {initial ? "Editar Macrociclo" : "Nuevo Macrociclo"}
      </h3>
      <div>
        <label htmlFor="macro-form-name" className="sr-only">Nombre del macrociclo</label>
        <input
          id="macro-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Temporada 2026"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="macro-form-start" className="text-xs text-gray-500">Inicio</label>
          <DatePicker
            id="macro-form-start"
            selected={startDate}
            onChange={setStartDate}
            dateFormat="dd/MM/yyyy"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
            placeholderText="Seleccionar fecha"
          />
        </div>
        <div>
          <label htmlFor="macro-form-end" className="text-xs text-gray-500">Fin</label>
          <DatePicker
            id="macro-form-end"
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
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium px-4 py-2 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
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
  const [startDate, setStartDate] = useState<Date | null>(parseLocalDate(initial?.startDate));
  const [endDate, setEndDate] = useState<Date | null>(parseLocalDate(initial?.endDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = name.trim() && startDate && endDate && !isSubmitting;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
          await onSubmit({
            name,
            phase,
            startDate: formatLocalDate(startDate!),
            endDate: formatLocalDate(endDate!),
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="rounded-xl border border-blue-100 bg-white p-3 space-y-2 mb-3 shadow-card"
    >
      <p className="text-xs font-semibold text-gray-500">
        {initial ? "Editar mesociclo" : "Nuevo mesociclo"}
      </p>
      <div>
        <label htmlFor="meso-form-name" className="sr-only">Nombre del mesociclo</label>
        <input
          id="meso-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Base General 1"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 outline-none"
        />
      </div>
      <div>
        <label htmlFor="meso-form-phase" className="sr-only">Fase del mesociclo</label>
        <select
          id="meso-form-phase"
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
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="meso-form-start" className="sr-only">Fecha de inicio</label>
          <DatePicker
            id="meso-form-start"
            selected={startDate}
            onChange={setStartDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Inicio"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label htmlFor="meso-form-end" className="sr-only">Fecha de fin</label>
          <DatePicker
            id="meso-form-end"
            selected={endDate}
            onChange={setEndDate}
            dateFormat="dd/MM/yyyy"
            minDate={startDate ?? undefined}
            placeholderText="Fin"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-xs rounded-lg bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium hover:bg-blue-600 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {isSubmitting && <Loader2 size={12} className="animate-spin" />}
          {initial ? "Guardar cambios" : "Crear mesociclo"}
        </button>
      </div>
    </form>
  );
}