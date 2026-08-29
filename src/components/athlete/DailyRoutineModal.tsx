import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { DailyBlock } from '../../types/models';
import { X, Flame, Dumbbell, Trophy, Check, Download, Loader2, PlayCircle } from 'lucide-react';

interface Props {
  block: DailyBlock;
  onClose: () => void;
}

// ── Helpers puros (fuera del componente: no se recrean en cada render) ──────

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url || url.trim() === "") return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1` : null;
};

const formatWeight = (weight?: string) => {
  if (!weight || weight.trim() === "") return "";
  const w = weight.trim();
  if (w.toLowerCase().includes("kg") || w.toLowerCase().includes("%") || w.toLowerCase().includes("lb") || w.toLowerCase().includes("seg")) return w;
  return `${w} kg`;
};

const GROUP_COLORS = [
  { bg: "bg-blue-50/40 border-blue-200", badge: "bg-blue-500 text-white" },
  { bg: "bg-emerald-50/40 border-emerald-200", badge: "bg-emerald-500 text-white" },
  { bg: "bg-purple-50/40 border-purple-200", badge: "bg-purple-500 text-white" },
  { bg: "bg-amber-50/40 border-amber-200", badge: "bg-amber-500 text-white" },
  { bg: "bg-rose-50/40 border-rose-200", badge: "bg-rose-500 text-white" },
  { bg: "bg-cyan-50/40 border-cyan-200", badge: "bg-cyan-500 text-white" },
];

const getAthleteBlockColor = (groupId?: string) => {
  if (!groupId || groupId.trim() === "") return { bg: "bg-white border-slate-200", badge: "" };
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
  return GROUP_COLORS[hash % GROUP_COLORS.length];
};

// Selector estándar de elementos enfocables, para el focus trap
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── Subcomponente memoizado: cada ejercicio solo re-renderiza si cambian SUS props ──

interface ExerciseCardProps {
  ex: any; // Reemplazar por el tipo `Exercise` real cuando esté exportado en models.ts
  isCompleted: boolean;
  isVideoOpen: boolean;
  onToggleComplete: (id: string) => void;
  onToggleVideo: (id: string) => void;
}

const ExerciseCard = memo(function ExerciseCard({
  ex,
  isCompleted,
  isVideoOpen,
  onToggleComplete,
  onToggleVideo,
}: ExerciseCardProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { bg: athleteColor, badge: badgeColor } = getAthleteBlockColor(ex.groupId);
  const embedUrl = useMemo(() => getYouTubeEmbedUrl(ex.videoUrl), [ex.videoUrl]);

  // Si se cierra el video, reseteamos el flag de "cargado" para la próxima vez que se abra
  useEffect(() => {
    if (!isVideoOpen) setVideoLoaded(false);
  }, [isVideoOpen]);

  return (
    <div
      className={`flex flex-col border rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${athleteColor} ${
        isCompleted ? 'ring-1 ring-green-500 opacity-70 bg-green-50/30' : 'hover:shadow-md'
      }`}
    >
      <div className="p-2.5 sm:p-3 flex items-center justify-between relative gap-2">
        {ex.groupId && ex.groupId.trim() !== "" && <div className={`absolute left-0 top-0 bottom-0 w-1 ${badgeColor}`}></div>}

        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 flex-1 pl-2">
          {ex.groupId && ex.groupId.trim() !== "" && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${badgeColor}`}>{ex.groupId}</span>
          )}

          <div className={`text-sm sm:text-base leading-snug transition-colors ${isCompleted ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
            <span className="font-bold">{ex.name}</span>
            <span className="mx-1.5 text-slate-400 font-light">/</span>
            <span className="font-semibold text-slate-700">{ex.sets ? `${ex.sets} x ${ex.reps}` : ex.reps}</span>
            {ex.weight && ex.weight.trim() !== "" && (
              <>
                <span className="mx-1.5 text-slate-400 font-light">/</span>
                <span className="font-bold text-blue-700">{formatWeight(ex.weight)}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {embedUrl && (
            <button
              onClick={() => onToggleVideo(ex.id)}
              aria-expanded={isVideoOpen}
              aria-label={isVideoOpen ? `Cerrar video de ${ex.name}` : `Ver video de ${ex.name}`}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isVideoOpen ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PlayCircle size={18} className={isVideoOpen ? "text-red-500" : "text-blue-500"} />
              <span className="hidden sm:inline">{isVideoOpen ? "Cerrar" : "Video"}</span>
            </button>
          )}

          <button
            onClick={() => onToggleComplete(ex.id)}
            aria-pressed={isCompleted}
            aria-label={isCompleted ? `Marcar ${ex.name} como pendiente` : `Marcar ${ex.name} como completado`}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isCompleted
                ? 'bg-green-500 text-white shadow-md shadow-green-500/40 border-transparent'
                : 'bg-white border-2 border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400'
            }`}
          >
            <Check size={20} strokeWidth={isCompleted ? 3 : 2} />
          </button>
        </div>
      </div>

      {isVideoOpen && embedUrl && (
        <div className="w-full bg-black aspect-video relative animate-in slide-in-from-top-2 duration-300">
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <Loader2 size={28} className="text-white/60 animate-spin" />
            </div>
          )}
          <iframe
            src={embedUrl}
            title={`Video demostrativo: ${ex.name}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setVideoLoaded(true)}
          />
        </div>
      )}
    </div>
  );
});

// ── Componente principal ─────────────────────────────────────────────────────

export default function DailyRoutineModal({ block, onClose }: Props) {
  const progressKey = `routine-progress-${block.id}`;

  // Progreso persistido: si el atleta cierra y reabre el modal, no pierde lo marcado
  const [completedExercises, setCompletedExercises] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(progressKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(progressKey, JSON.stringify(completedExercises));
    } catch {
      // sessionStorage puede fallar en modo privado; no es crítico, seguimos sin persistir
    }
  }, [completedExercises, progressKey]);

  // Cierre animado: espera a que termine la transición antes de desmontar
  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  // Bloqueo de scroll del body + focus trap + Escape + devolución de foco al cerrar
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusablesIn = () =>
      modalRef.current ? Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    const firstFocusable = focusablesIn()[0];
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== 'Tab') return;

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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [requestClose]);

  const toggleExercise = useCallback((id: string) => {
    setCompletedExercises(prev => (prev.includes(id) ? prev.filter(exId => exId !== id) : [...prev, id]));
  }, []);

  const toggleVideo = useCallback((id: string) => {
    setPlayingVideoId(prev => (prev === id ? null : id));
  }, []);

  const totalExercises = block.exercises?.length || 0;
  const completedCount = completedExercises.length;
  const progressPercentage = totalExercises === 0 ? 0 : Math.round((completedCount / totalExercises) * 100);

  // html2pdf.js pesa ~350kb: lo cargamos solo cuando el usuario realmente pide el PDF,
  // en vez de sumarlo al bundle inicial del modal.
  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const opt = {
        margin: 15,
        filename: `Entrenamiento_${block.date}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[100] transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-300'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {/* OCULTO: Contenedor para exportar a PDF */}
      <div className="hidden">
        <div ref={printRef} className="bg-white text-black p-8" style={{ width: '210mm', minHeight: '297mm' }}>
          <div className="border-b-4 border-blue-600 pb-4 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">{block.sessionType}</h1>
              <p className="text-gray-500 mt-2 font-medium">Fecha: {block.date.split("-").reverse().join("/")} | Volumen: {block.volume}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300 text-sm uppercase text-gray-600">
                <th className="p-3 font-bold w-16 text-center">BLQ</th>
                <th className="p-3 font-bold">Ejercicio</th>
                <th className="p-3 font-bold">Series x Reps</th>
                <th className="p-3 font-bold">Carga</th>
              </tr>
            </thead>
            <tbody>
              {block.exercises?.map((ex: any) => (
                <tr key={ex.id} className="border-b border-gray-200">
                  <td className="p-3 font-bold text-center text-blue-600">{ex.groupId || "-"}</td>
                  <td className="p-3 font-medium text-gray-800">{ex.name}</td>
                  <td className="p-3 text-gray-600 font-semibold">{ex.sets ? `${ex.sets} x ${ex.reps}` : ex.reps}</td>
                  <td className="p-3 text-gray-600 font-semibold">{formatWeight(ex.weight) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-modal-title"
        className={`bg-slate-50 w-full max-w-3xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[95vh] sm:h-auto sm:max-h-[90vh] transition-all duration-200 ${
          isClosing
            ? 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
            : 'opacity-100 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300'
        }`}
      >
        {/* HEADER MODAL */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 p-5 sm:p-6 flex justify-between items-start text-white relative overflow-hidden sm:rounded-t-3xl rounded-t-3xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="relative z-10 w-full">
            <div className="flex justify-between items-center w-full mb-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                <Flame size={14} className="text-orange-400" />
                {block.volume}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  aria-label={isGeneratingPdf ? "Generando PDF, por favor espera" : "Descargar rutina en PDF"}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-70 disabled:cursor-wait p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg transition-colors flex items-center gap-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span className="hidden sm:inline">{isGeneratingPdf ? "Armando..." : "Descargar PDF"}</span>
                </button>
                <button
                  onClick={requestClose}
                  aria-label="Cerrar rutina"
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <h2 id="routine-modal-title" className="text-2xl sm:text-3xl font-black tracking-tight">{block.sessionType}</h2>
          </div>
        </div>

        {/* CUERPO MODAL */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar overscroll-contain">
          {/* BARRA DE PROGRESO */}
          {totalExercises > 0 && (
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100" role="status" aria-live="polite">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Trophy size={16} className={progressPercentage === 100 ? "text-amber-500" : "text-slate-400"} /> Progreso
                </span>
                <span className="text-xs font-black text-blue-600">{completedCount} / {totalExercises}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* LISTA DE EJERCICIOS */}
          {(!block.exercises || block.exercises.length === 0) ? (
            <div className="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Dumbbell className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-slate-500 font-medium">No hay ejercicios cargados para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {block.exercises.map((ex: any) => (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  isCompleted={completedExercises.includes(ex.id)}
                  isVideoOpen={playingVideoId === ex.id}
                  onToggleComplete={toggleExercise}
                  onToggleVideo={toggleVideo}
                />
              ))}
            </div>
          )}

          {/* NOTAS DE LA SESIÓN */}
          {block.notesHtml && block.notesHtml !== "<p><br></p>" && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4">
              <h4 className="text-amber-800 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1">📝 Notas de Sesión</h4>
              <div className="prose prose-sm prose-amber text-slate-700 max-w-none leading-snug" dangerouslySetInnerHTML={{ __html: block.notesHtml }} />
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-slate-100 flex justify-center pb-6 sm:pb-4">
          <button
            onClick={requestClose}
            className={`w-full font-black py-3.5 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              progressPercentage === 100
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30 focus-visible:ring-green-400'
                : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20 focus-visible:ring-slate-400'
            }`}
          >
            {progressPercentage === 100 ? <><Check size={20} strokeWidth={3} /> ¡Sesión Completada!</> : 'Cerrar Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}