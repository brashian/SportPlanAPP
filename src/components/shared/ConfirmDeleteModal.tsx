import { AlertTriangle, Loader2 } from "lucide-react";
import ModalShell from "./ModalShell";

interface ConfirmDeleteModalProps {
  labelledBy: string;
  title: string;
  message: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Confirmación de borrado definitiva (atleta, macrociclo, mesociclo...)
export default function ConfirmDeleteModal({ labelledBy, title, message, isSubmitting, onConfirm, onClose }: ConfirmDeleteModalProps) {
  return (
    <ModalShell onClose={onClose} labelledBy={labelledBy} panelClassName="max-w-sm p-8 text-center" zIndexClassName="z-[70]">
      {(close) => (
        <>
          <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-5"><AlertTriangle size={36} /></div>
          <h3 id={labelledBy} className="text-2xl font-display font-bold text-[var(--mist-100)] mb-2 uppercase tracking-wide">{title}</h3>
          <p className="text-sm font-medium text-[var(--mist-500)] mb-8">{message}</p>
          <div className="flex gap-3">
            <button onClick={close} className="flex-1 py-3.5 rounded-xl font-bold text-[var(--mist-100)] bg-[var(--ink-800)] hover:bg-[var(--line-800)] transition-all active:scale-95">Cancelar</button>
            <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} Sí, borrar
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
