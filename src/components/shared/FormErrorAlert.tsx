import { AlertCircle } from "lucide-react";

// Cartel de error dentro de formularios y modales. No renderiza nada si no hay mensaje.
export default function FormErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div role="alert" className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl px-4 py-3">
      <AlertCircle size={16} className="shrink-0" /> {message}
    </div>
  );
}
