import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import BrandLogo from "../ui/BrandLogo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Red de seguridad: si una pantalla se rompe al renderizar (o no se pudo
// descargar), mostramos una salida clara en vez de una pantalla en blanco.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en la interfaz:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[100dvh] bg-[var(--ink-950)] flex items-center justify-center p-4 font-sans antialiased">
        <div role="alert" className="bg-[var(--ink-900)] border border-[var(--line-800)] max-w-md w-full rounded-3xl shadow-xl p-8 text-center">
          <div className="h-10 mb-6 flex justify-center">
            <BrandLogo className="h-full w-auto" />
          </div>
          <div className="w-16 h-16 bg-[var(--signal-500)]/10 text-[var(--signal-500)] rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={30} />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--mist-100)] uppercase tracking-wide mb-2">Algo salió mal</h2>
          <p className="text-[var(--mist-500)] mb-8 font-medium leading-relaxed">
            No pudimos cargar esta pantalla. Recargá la página para traer la última versión.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] font-display font-bold uppercase tracking-wide py-3.5 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-900)]"
          >
            <RotateCw size={18} /> Recargar
          </button>
        </div>
      </div>
    );
  }
}
