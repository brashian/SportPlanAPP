import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { MonthlyRoutine, RoutineTemplate } from "../../../types/models";
import ModalShell from "../../shared/ModalShell";
import FormErrorAlert from "../../shared/FormErrorAlert";
import DayMappingFields from "./DayMappingFields";
import type { DayMapping } from "./types";

interface PasteTemplateModalProps {
  templates: RoutineTemplate[];
  monthlyRoutines: MonthlyRoutine[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  dayMapping: DayMapping;
  onDayMappingChange: (mapping: DayMapping) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// "Pegar Plantilla": el mesociclo destino ya está fijado, se elige la rutina
export default function PasteTemplateModal({
  templates, monthlyRoutines, selectedTemplateId, onSelectTemplate, dayMapping, onDayMappingChange, error, isSubmitting, onSubmit, onClose,
}: PasteTemplateModalProps) {
  const selected = templates.find(t => t.id === selectedTemplateId) || monthlyRoutines.find(r => r.id === selectedTemplateId);

  return (
    <ModalShell onClose={onClose} labelledBy="import-modal-title" panelClassName="max-w-md p-8 max-h-[90vh] overflow-y-auto">
      {(close) => (
        <>
          <h2 id="import-modal-title" className="text-2xl font-display font-bold text-[var(--mist-100)] mb-2 uppercase tracking-wide">Inyectar Plantilla</h2>
          <p className="text-sm font-medium text-[var(--mist-500)] mb-6">Pegá una rutina directamente al calendario de este mesociclo.</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <FormErrorAlert message={error} />
            <select required value={selectedTemplateId} onChange={(e) => onSelectTemplate(e.target.value)} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] transition-all cursor-pointer">
              <option value="">Seleccionar Rutina...</option>
              <optgroup label="Historial del Atleta">
                {monthlyRoutines.map(r => <option key={r.id} value={r.id}>{r.monthName}</option>)}
              </optgroup>
              <optgroup label="Plantillas Maestra (Global)">
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            </select>

            {selected && (
              <DayMappingFields
                days={selected.days}
                mapping={dayMapping}
                onChange={onDayMappingChange}
                heading="Asignar a días de la semana"
                placeholder="Elegir..."
                idPrefix="day-map"
              />
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={close} className="flex-1 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
              <button type="submit" disabled={isSubmitting || !selectedTemplateId} className="flex-1 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />} Inyectar Días
              </button>
            </div>
          </form>
        </>
      )}
    </ModalShell>
  );
}
