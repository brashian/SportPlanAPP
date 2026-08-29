import React, { useState, useEffect, useCallback, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useModalA11y(onRequestClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // BUGFIX (foco): esta hook recibía `onRequestClose` y el efecto de abajo
  // dependía de [onRequestClose] directamente. Como `onRequestClose` (y por
  // lo tanto también `requestClose` en el componente que llama a esta hook)
  // se recrea cada vez que el padre re-renderiza pasando un `onClose` inline
  // nuevo, el efecto se desmontaba/remontaba en cada tecla que el usuario
  // escribía dentro del modal — devolviéndole el foco al elemento anterior a
  // mitad de la interacción. Guardamos la última versión en un ref y dejamos
  // que el efecto "pesado" (overflow lock, listeners, foco inicial) corra
  // una sola vez al montar.
  const onRequestCloseRef = useRef(onRequestClose);
  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusablesIn = () =>
      containerRef.current
        ? Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];

    focusablesIn()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onRequestCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = focusablesIn();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
    // Montaje único a propósito: ver comentario de onRequestCloseRef arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return containerRef;
}

interface ModalShellProps {
  onClose: () => void;
  labelledBy: string;
  overlayClassName?: string;
  panelClassName?: string;
  zIndexClassName?: string;
  children: (requestClose: () => void) => React.ReactNode;
}

// Overlay + panel + focus trap + Escape + scroll lock + animación de cierre,
// en un solo lugar para no reimplementarlo modal por modal.
export default function ModalShell({
  onClose,
  labelledBy,
  overlayClassName,
  panelClassName,
  zIndexClassName = "z-50",
  children,
}: ModalShellProps) {
  const [isClosing, setIsClosing] = useState(false);
  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);
  const containerRef = useModalA11y(requestClose);

  return (
    <div
      className={`fixed inset-0 ${
        overlayClassName || "bg-[var(--ink-950)]/80 backdrop-blur-sm motion-reduce:backdrop-blur-none"
      } flex items-center justify-center p-4 ${zIndexClassName} transition-opacity duration-150 motion-reduce:transition-none ${
        isClosing ? "opacity-0" : "opacity-100 animate-in fade-in duration-200"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-[var(--ink-900)] border border-[var(--line-800)] rounded-3xl shadow-2xl w-full transition-all duration-150 motion-reduce:transition-none ${
          panelClassName || "max-w-md p-8"
        } ${isClosing ? "opacity-0 scale-95" : "opacity-100 animate-in zoom-in-95 duration-300"}`}
      >
        {children(requestClose)}
      </div>
    </div>
  );
}