import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// ── Toast simple, no bloqueante ──────────────────────────────────────────────

export interface ToastState {
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  toast: ToastState | null;
  // Debe ser una referencia estable (useCallback): si cambia en cada render,
  // el temporizador de cierre se reinicia sin parar.
  onDismiss: () => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm text-[var(--ink-950)] animate-in slide-in-from-bottom-4 fade-in duration-300 motion-reduce:animate-none ${
        toast.type === "success" ? "bg-[var(--pulse-500)]" : "bg-red-400"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}
