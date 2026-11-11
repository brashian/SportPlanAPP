import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import ModalShell from "../../shared/ModalShell";
import type { AthleteFormData } from "./types";

interface EditAthleteModalProps {
  formData: AthleteFormData;
  onChange: (data: AthleteFormData) => void;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// Editar perfil del atleta
export default function EditAthleteModal({ formData, onChange, isSubmitting, onSubmit, onClose }: EditAthleteModalProps) {
  return (
    <ModalShell onClose={onClose} labelledBy="edit-athlete-title" zIndexClassName="z-[60]">
      {(close) => (
        <>
          <h2 id="edit-athlete-title" className="text-2xl font-display font-bold text-[var(--mist-100)] mb-6 uppercase tracking-wide">Editar Perfil</h2>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="athlete-name" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Nombre Completo *</label>
              <input id="athlete-name" required type="text" value={formData.name} onChange={(e) => onChange({ ...formData, name: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" />
            </div>
            <div>
              <label htmlFor="athlete-sport" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Deporte o Categoría *</label>
              <input id="athlete-sport" required type="text" value={formData.sport} onChange={(e) => onChange({ ...formData, sport: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" />
            </div>
            <div>
              <label htmlFor="athlete-email" className="block text-xs font-bold text-[var(--mist-500)] uppercase tracking-wider mb-2">Email de acceso</label>
              <input id="athlete-email" type="email" value={formData.email} onChange={(e) => onChange({ ...formData, email: e.target.value })} className="w-full bg-[var(--ink-800)] border border-[var(--line-800)] text-[var(--mist-100)] font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-[var(--signal-500)]/15 focus:border-[var(--signal-500)] outline-none transition-all" placeholder="atleta@correo.com" />
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
