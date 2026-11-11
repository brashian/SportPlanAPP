import type { FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Mesocycle, MonthlyRoutine } from "../../../types/models";
import ModalShell from "../../shared/ModalShell";
import FormErrorAlert from "../../shared/FormErrorAlert";
import DayMappingFields from "./DayMappingFields";
import type { DayMapping } from "./types";

interface InjectRoutineModalProps {
  routine: MonthlyRoutine;
  mesocycleOptions: (Mesocycle & { macroName: string })[];
  targetMesoId: string;
  onSelectTargetMeso: (id: string) => void;
  dayMapping: DayMapping;
  onDayMappingChange: (mapping: DayMapping) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// "Inyectar Rutina": la rutina ya está fijada, se elige el mesociclo destino
export default function InjectRoutineModal({
  routine, mesocycleOptions, targetMesoId, onSelectTargetMeso, dayMapping, onDayMappingChange, error, isSubmitting, onSubmit, onClose,
}: InjectRoutineModalProps) {
  return (
    <ModalShell onClose={onClose} labelledBy="global-import-modal-title" panelClassName="max-w-md p-8 max-h-[90vh] overflow-y-auto">
      {(close) => (
        <>
          <h2 id="global-import-modal-title" className="text-2xl font-display font-bold text-[var(--mist-100)] mb-2 uppercase tracking-wide">Inyectar Rutina PDF</h2>
          <p className="text-sm font-medium text-[var(--mist-500)] mb-6">Elegí el destino en el calendario para volcar esta rutina mensual.</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <FormErrorAlert message={error} />
            {mesocycleOptions.length === 0 ? (
              <div role="status" className="flex items-center gap-2.5 bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-300)] text-sm font-semibold rounded-xl px-4 py-3">
                <AlertCircle size={16} className="shrink-0 text-[var(--signal-500)]" /> Primero creá un mesociclo para poder inyectar esta rutina.
              </div>
            ) : (
              <div>
                <label htmlFor="target-meso" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Mesociclo Destino</label>
                <select id="target-meso" required value={targetMesoId} onChange={(e) => onSelectTargetMeso(e.target.value)} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] transition-all cursor-pointer">
                  <option value="">Seleccionar Mesociclo...</option>
                  {mesocycleOptions.map(meso => (
                    <option key={meso.id} value={meso.id}>
                      {meso.macroName}: {meso.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetMesoId && (
              <DayMappingFields
                days={routine.days}
                mapping={dayMapping}
                onChange={onDayMappingChange}
                heading="Asignar a días"
                placeholder="Día..."
                idPrefix="gday-map"
                showSessionType
              />
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={close} className="flex-1 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
              <button type="submit" disabled={isSubmitting || !targetMesoId} className="flex-1 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />} Finalizar Inyección
              </button>
            </div>
          </form>
        </>
      )}
    </ModalShell>
  );
}
