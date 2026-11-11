import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { Macrocycle, MesocyclePhase } from "../../../types/models";
import ModalShell from "../../shared/ModalShell";
import FormErrorAlert from "../../shared/FormErrorAlert";
import type { MesoFormData } from "./types";

interface MesocycleFormModalProps {
  isEditing: boolean;
  // Macrociclo padre: limita el rango de fechas permitido en los inputs
  parentMacro?: Macrocycle;
  formData: MesoFormData;
  onChange: (data: MesoFormData) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// Crear / editar mesociclo
export default function MesocycleFormModal({ isEditing, parentMacro, formData, onChange, error, isSubmitting, onSubmit, onClose }: MesocycleFormModalProps) {
  return (
    <ModalShell onClose={onClose} labelledBy="meso-modal-title">
      {(close) => (
        <>
          <h2 id="meso-modal-title" className="text-2xl font-display font-bold text-[var(--mist-100)] mb-6 uppercase tracking-wide">{isEditing ? "Editar Mesociclo" : "Agregar Mesociclo"}</h2>
          <form onSubmit={onSubmit} className="space-y-5">
            <FormErrorAlert message={error} />
            <div>
              <label htmlFor="meso-name" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre del Ciclo</label>
              <input id="meso-name" type="text" required placeholder="Ej: Fuerza Base I" value={formData.name} onChange={(e) => onChange({ ...formData, name: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all placeholder:text-[var(--mist-500)]" />
            </div>
            <div>
              <label htmlFor="meso-phase" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Fase del Entrenamiento</label>
              <select id="meso-phase" required value={formData.phase} onChange={(e) => onChange({ ...formData, phase: e.target.value as MesocyclePhase })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all cursor-pointer">
                <option value="Preparación General">Preparación General</option>
                <option value="Preparación Específica">Preparación Específica</option>
                <option value="Pre-Competitiva">Pre-Competitiva</option>
                <option value="Competitiva">Competitiva</option>
                <option value="Transición">Transición</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="meso-start" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Inicio</label>
                <input id="meso-start" type="date" required min={parentMacro?.startDate} max={parentMacro?.endDate} value={formData.startDate} onChange={(e) => onChange({ ...formData, startDate: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" />
              </div>
              <div>
                <label htmlFor="meso-end" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Fin</label>
                <input id="meso-end" type="date" required min={formData.startDate || parentMacro?.startDate} max={parentMacro?.endDate} value={formData.endDate} onChange={(e) => onChange({ ...formData, endDate: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={close} className="flex-1 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar
              </button>
            </div>
          </form>
        </>
      )}
    </ModalShell>
  );
}
