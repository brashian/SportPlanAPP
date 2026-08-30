import React, { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Loader2, AlertCircle } from "lucide-react";
import DatePicker from "react-datepicker";
//error este por version
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
    <div className="space-y-6 bg-[var(--ink-950)]">
      {/* Overrides de react-datepicker: la librería trae CSS propio con clases
          globales, no pensado para temas oscuros. Este bloque es el único lugar
          donde tocamos esas clases; si algo del popup se ve claro en el futuro,
          es una clase de la librería que falta cubrir acá. */}
      <style>{`
        .react-datepicker {
          font-family: inherit;
          background-color: var(--ink-900);
          border: 1px solid var(--line-800);
          border-radius: 1rem;
          overflow: hidden;
        }
        .react-datepicker__header {
          background-color: var(--ink-850);
          border-bottom: 1px solid var(--line-800);
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: var(--mist-100);
        }
        .react-datepicker__day {
          color: var(--mist-300);
        }
        .react-datepicker__day:hover {
          background-color: var(--ink-800);
          color: var(--mist-100);
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: var(--signal-500);
          color: var(--ink-950);
          font-weight: 700;
        }
        .react-datepicker__day--outside-month {
          color: var(--mist-500);
          opacity: 0.5;
        }
        .react-datepicker__day--disabled {
          color: var(--mist-500);
          opacity: 0.3;
        }
        .react-datepicker__triangle::before,
        .react-datepicker__triangle::after {
          border-bottom-color: var(--ink-850) !important;
        }
        .react-datepicker__navigation-icon::before {
          border-color: var(--mist-300);
        }
        .react-datepicker__input-container input {
          width: 100%;
        }
      `}</style>

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
        <div className="flex items-center justify-between bg-[var(--ink-900)] border border-[var(--line-800)] rounded-2xl p-5">
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--mist-100)] uppercase tracking-wide">{macrocycle.name}</h2>
            <p className="text-xs text-[var(--mist-500)] font-medium mt-1">
              {macrocycle.startDate.split("-").reverse().join("/")} → {macrocycle.endDate.split("-").reverse().join("/")}
            </p>
          </div>
          <button
            onClick={() => setEditingMacro(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-[var(--signal-500)] hover:text-[var(--signal-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] rounded-md px-2 py-1 transition-colors"
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
            <h3 className="text-xs font-black text-[var(--mist-500)] uppercase tracking-widest">Mesociclos</h3>
            <button
              onClick={() => {
                setEditingMesoId(null);
                setShowMesoForm(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-[var(--ink-950)] bg-[var(--signal-500)] hover:bg-[var(--signal-600)] px-2.5 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-950)]"
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
            <p className="text-sm text-[var(--mist-500)] italic">
              Seleccioná o creá un mesociclo para ver su planificación semanal.
            </p>
          ) : (
            <>
              <div className="mb-3">
                <h3 className="text-sm font-bold text-[var(--mist-100)]">
                  {activeMesocycle.name}{" "}
                  <span className="text-xs font-normal text-[var(--mist-500)]">
                    · {activeMesocycle.phase}
                  </span>
                </h3>
              </div>

              {editingDate && (
                <div className="mb-3">
                  <DayBlockEditor
                    date={editingDate}
                    mesocycleId={activeMesocycle.id}
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
  const [dateWasReset, setDateWasReset] = useState(false);

  // Si el nuevo inicio queda después del fin ya cargado, el rango deja de
  // tener sentido: limpiamos el fin en vez de dejarlo guardar en silencio.
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date && endDate && endDate < date) {
      setEndDate(null);
      setDateWasReset(true);
    }
  };

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
      className="rounded-2xl border border-[var(--line-800)] bg-[var(--ink-900)] p-5 space-y-4"
    >
      <h3 className="text-sm font-display font-bold text-[var(--mist-100)] uppercase tracking-wide">
        {initial ? "Editar Macrociclo" : "Nuevo Macrociclo"}
      </h3>
      <div>
        <label htmlFor="macro-form-name" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre del macrociclo</label>
        <input
          id="macro-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Temporada 2026"
          className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] focus:ring-2 focus:ring-[var(--signal-500)]/20 outline-none transition-all placeholder:text-[var(--mist-500)] placeholder:font-normal"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="macro-form-start" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Inicio</label>
          <DatePicker
            id="macro-form-start"
            selected={startDate}
            onChange={handleStartDateChange}
            dateFormat="dd/MM/yyyy"
            className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
            placeholderText="Seleccionar fecha"
          />
        </div>
        <div>
          <label htmlFor="macro-form-end" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Fin</label>
          <DatePicker
            id="macro-form-end"
            selected={endDate}
            onChange={(date: Date | null) => { setEndDate(date); setDateWasReset(false); }}
            dateFormat="dd/MM/yyyy"
            minDate={startDate ?? undefined}
            className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
            placeholderText="Seleccionar fecha"
          />
        </div>
      </div>
      {dateWasReset && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <AlertCircle size={13} /> El fin quedaba antes del nuevo inicio, elegí una fecha de fin de nuevo.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-[var(--mist-300)] hover:bg-[var(--ink-800)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--signal-500)] disabled:bg-[var(--ink-800)] disabled:text-[var(--mist-500)] text-[var(--ink-950)] text-sm font-bold px-4 py-2 hover:bg-[var(--signal-600)] transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
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
  const [dateWasReset, setDateWasReset] = useState(false);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date && endDate && endDate < date) {
      setEndDate(null);
      setDateWasReset(true);
    }
  };

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
      className="rounded-2xl border border-[var(--line-800)] bg-[var(--ink-900)] p-4 space-y-3 mb-3"
    >
      <p className="text-xs font-black text-[var(--mist-500)] uppercase tracking-widest">
        {initial ? "Editar mesociclo" : "Nuevo mesociclo"}
      </p>
      <div>
        <label htmlFor="meso-form-name" className="sr-only">Nombre del mesociclo</label>
        <input
          id="meso-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Base General 1"
          className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] focus:ring-2 focus:ring-[var(--signal-500)]/20 outline-none transition-all placeholder:text-[var(--mist-500)] placeholder:font-normal"
        />
      </div>
      <div>
        <label htmlFor="meso-form-phase" className="sr-only">Fase del mesociclo</label>
        <select
          id="meso-form-phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value as MesocyclePhase)}
          className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] outline-none transition-all cursor-pointer"
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
            onChange={handleStartDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText="Inicio"
            className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
          />
        </div>
        <div>
          <label htmlFor="meso-form-end" className="sr-only">Fecha de fin</label>
          <DatePicker
            id="meso-form-end"
            selected={endDate}
            onChange={(date: Date | null) => { setEndDate(date); setDateWasReset(false); }}
            dateFormat="dd/MM/yyyy"
            minDate={startDate ?? undefined}
            placeholderText="Fin"
            className="w-full rounded-lg border border-[var(--line-800)] bg-[var(--ink-800)] text-[var(--mist-100)] font-semibold px-3 py-2.5 text-sm focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]"
          />
        </div>
      </div>
      {dateWasReset && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <AlertCircle size={13} /> El fin quedaba antes del nuevo inicio, elegí una fecha de fin de nuevo.
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--mist-300)] hover:bg-[var(--ink-800)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--signal-500)] disabled:bg-[var(--ink-800)] disabled:text-[var(--mist-500)] text-[var(--ink-950)] font-bold hover:bg-[var(--signal-600)] transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
        >
          {isSubmitting && <Loader2 size={12} className="animate-spin" />}
          {initial ? "Guardar cambios" : "Crear mesociclo"}
        </button>
      </div>
    </form>
  );
}