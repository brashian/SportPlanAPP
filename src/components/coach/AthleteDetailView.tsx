import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle, RoutineTemplate, MonthlyRoutine } from "../../types/models";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import MonthlyRoutineManager from "./MonthlyRoutineManager";
import { Trash2, Edit3, AlertTriangle, X, ChevronLeft, Plus, Dumbbell, Calendar, Target, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface AthleteDetailViewProps {
  athletes: Athlete[];
  onLoadMacrocycles: (athleteId: string, macros: Macrocycle[]) => void;
  onCreateMacrocycle: (athleteId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onUpdateMacrocycle: (macrocycleId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onDeleteMacrocycle: (macrocycleId: string, athleteId: string) => void;
  onCreateMesocycle: (macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onUpdateMesocycle: (mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onDeleteMesocycle: (macrocycleId: string, mesocycleId: string) => void;
  onReorderMesocycles: (macrocycleId: string, reordered: Mesocycle[]) => void;
  onUpdateAthlete: (athleteId: string, data: { name: string; sport: string; email?: string; phone?: string }) => Promise<void>;
  onDeleteAthlete: (athleteId: string) => Promise<boolean>;
}

// ── Helpers puros (fuera del componente: no se recrean en cada render) ──────

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const getWeeksInRange = (start: string, end: string) => {
  const weeks: { label: string; days: { date: string; name: string }[] }[] = [];
  let current = new Date(start + "T12:00:00");
  const day = current.getDay();
  current.setDate(current.getDate() - day + (day === 0 ? -6 : 1));
  const endDate = new Date(end + "T12:00:00");
  let weekNumber = 1;
  while (current <= endDate || current.getDay() !== 1) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push({ date: current.toISOString().split("T")[0], name: DAY_NAMES[current.getDay()] });
      current.setDate(current.getDate() + 1);
    }
    weeks.push({ label: `Semana ${weekNumber}`, days });
    weekNumber++;
    if (current > endDate) break;
  }
  return weeks;
};

const BLOCK_COLORS = [
  "bg-blue-100 border-l-4 border-blue-500",
  "bg-emerald-100 border-l-4 border-emerald-500",
  "bg-purple-100 border-l-4 border-purple-500",
  "bg-amber-100 border-l-4 border-amber-500",
  "bg-rose-100 border-l-4 border-rose-500",
  "bg-cyan-100 border-l-4 border-cyan-500",
];

const getBlockColor = (groupId?: string) => {
  if (!groupId || groupId.trim() === "") return "bg-white border-l-4 border-transparent";
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash += groupId.toUpperCase().charCodeAt(i);
  return BLOCK_COLORS[hash % BLOCK_COLORS.length];
};

// ── Accesibilidad de modales: focus trap + Escape + scroll lock, reutilizable ──

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useModalA11y(onRequestClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusablesIn = () =>
      containerRef.current ? Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    focusablesIn()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onRequestClose();
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
  }, [onRequestClose]);

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

// Envoltorio único para TODOS los overlays del archivo: da focus trap, cierre con
// Escape, click afuera, bloqueo de scroll del body y una animación de cierre suave,
// en vez de reimplementar (o de no implementar) esto en cada uno de los 8 modales.
function ModalShell({ onClose, labelledBy, overlayClassName, panelClassName, zIndexClassName = "z-50", children }: ModalShellProps) {
  const [isClosing, setIsClosing] = useState(false);
  const requestClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);
  const containerRef = useModalA11y(requestClose);

  return (
    <div
      className={`fixed inset-0 ${overlayClassName || 'bg-slate-900/60 backdrop-blur-sm'} flex items-center justify-center p-4 ${zIndexClassName} transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-200'
      }`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-white rounded-3xl shadow-2xl w-full transition-all duration-150 ${panelClassName || 'max-w-md p-8'} ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 animate-in zoom-in-95 duration-300'
        }`}
      >
        {children(requestClose)}
      </div>
    </div>
  );
}

// ── Toast simple, no bloqueante (reemplaza los alert() del original) ────────

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
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
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm text-white animate-in slide-in-from-bottom-4 fade-in duration-300 ${
        toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}

export default function AthleteDetailView({
  athletes, onLoadMacrocycles, onCreateMacrocycle, onUpdateMacrocycle, onDeleteMacrocycle,
  onCreateMesocycle, onUpdateMesocycle, onDeleteMesocycle, onReorderMesocycles, onUpdateAthlete, onDeleteAthlete
}: AthleteDetailViewProps) {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [isLoadingMacros, setIsLoadingMacros] = useState(true);

  const [blocksByMesocycle, setBlocksByMesocycle] = useState<Record<string, DailyBlock[]>>({});
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [monthlyRoutines, setMonthlyRoutines] = useState<MonthlyRoutine[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMeso, setImportMeso] = useState<Mesocycle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [globalImportRoutine, setGlobalImportRoutine] = useState<MonthlyRoutine | null>(null);
  const [globalTargetMesoId, setGlobalTargetMesoId] = useState<string>("");
  const [dayMapping, setDayMapping] = useState<Record<number, string>>({});

  const [isEditAthleteModalOpen, setIsEditAthleteModalOpen] = useState(false);
  const [athleteFormData, setAthleteFormData] = useState({ name: "", sport: "", email: "", phone: "" });

  const [athleteToDelete, setAthleteToDelete] = useState(false);
  const [macroToDelete, setMacroToDelete] = useState<string | null>(null);
  const [mesoToDelete, setMesoToDelete] = useState<{ macroId: string; mesoId: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => setToast({ type, message }), []);

  const handleOpenEditAthlete = () => {
    if (!athlete) return;
    setAthleteFormData({
      name: athlete.name || "",
      sport: athlete.sport || "",
      email: athlete.email || "",
      phone: athlete.phone || ""
    });
    setIsEditAthleteModalOpen(true);
  };

  const handleAthleteEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete) return;
    setIsSubmitting(true);
    try {
      await onUpdateAthlete(athlete.id, athleteFormData);
      setIsEditAthleteModalOpen(false);
      showToast('success', 'Perfil actualizado.');
    } catch (e) {
      showToast('error', 'No se pudo actualizar el perfil.');
    } finally { setIsSubmitting(false); }
  };

  const confirmDeleteAthlete = async () => {
    if (!athlete) return;
    setIsSubmitting(true);
    const success = await onDeleteAthlete(athlete.id);
    if (success) navigate("/athletes");
    else showToast('error', 'No se pudo eliminar al atleta.');
    setIsSubmitting(false);
    setAthleteToDelete(false);
  };

  const confirmDeleteMacro = async () => {
    if (!macroToDelete || !athlete) return;
    setIsSubmitting(true);
    await onDeleteMacrocycle(macroToDelete, athlete.id);
    setIsSubmitting(false);
    setMacroToDelete(null);
    showToast('success', 'Macrociclo eliminado.');
  };

  const confirmDeleteMeso = async () => {
    if (!mesoToDelete) return;
    setIsSubmitting(true);
    await onDeleteMesocycle(mesoToDelete.macroId, mesoToDelete.mesoId);
    setIsSubmitting(false);
    setMesoToDelete(null);
    showToast('success', 'Mesociclo eliminado.');
  };

  useEffect(() => {
    async function fetchData() {
      if (!athlete?.coachId) return;
      try {
        const qT = query(collection(db, "routineTemplates"), where("coachId", "==", athlete.coachId));
        const snapT = await getDocs(qT);
        const loadedT: RoutineTemplate[] = [];
        snapT.forEach(doc => loadedT.push({ id: doc.id, ...doc.data() } as RoutineTemplate));
        setTemplates(loadedT);

        const qM = query(collection(db, "monthlyRoutines"), where("athleteId", "==", athleteId));
        const snapM = await getDocs(qM);
        const loadedM: MonthlyRoutine[] = [];
        snapM.forEach(doc => loadedM.push({ id: doc.id, ...doc.data() } as MonthlyRoutine));
        setMonthlyRoutines(loadedM);
      } catch (e) {
        console.error(e);
        showToast('error', 'No se pudieron cargar las plantillas y rutinas.');
      }
    }
    fetchData();
  }, [athlete?.coachId, athleteId, showToast]);

  const executeBatchInjection = async (template: RoutineTemplate | MonthlyRoutine, targetMeso: Mesocycle, mapping: Record<number, string>) => {
    setIsSubmitting(true);
    try {
      const startDate = new Date(targetMeso.startDate + "T12:00:00");
      const endDate = new Date(targetMeso.endDate + "T12:00:00");
      let current = new Date(startDate);
      const newBlocksLocally: DailyBlock[] = [];
      const existingBlocks = blocksByMesocycle[targetMeso.id] || [];

      const blocksToInject: Record<string, any> = {};

      while (current <= endDate) {
        const jsDayStr = current.getDay().toString();
        const templateDayNum = Object.keys(mapping).find(key => mapping[Number(key)] === jsDayStr);

        if (templateDayNum) {
          const tDay = template.days.find((d: any) => d.dayNumber === Number(templateDayNum));
          if (tDay) {
            const dateStr = current.toISOString().split("T")[0];
            const now = new Date().toISOString();
            const existingBlock = existingBlocks.find((b: any) => b.date === dateStr);

            const blockData = {
              date: dateStr,
              sessionType: tDay.sessionType,
              intensity: 5,
              volume: "Medio",
              durationMinutes: 60,
              notesHtml: tDay.notesHtml || "",
              exercises: tDay.exercises || [],
              mesocycleId: targetMeso.id,
              updatedAt: now,
              id: existingBlock?.id || Date.now().toString() + Math.random().toString().slice(2, 6),
              createdAt: existingBlock?.createdAt || now
            };

            blocksToInject[dateStr] = blockData;
            newBlocksLocally.push(blockData as DailyBlock);
          }
        }
        current.setDate(current.getDate() + 1);
      }

      const docRef = doc(db, "mesocycleBlocks", targetMeso.id);
      await setDoc(docRef, { blocks: blocksToInject }, { merge: true });

      setBlocksByMesocycle(prev => {
        const currentList = prev[targetMeso.id] || [];
        const filtered = currentList.filter(b => !newBlocksLocally.find(nb => nb.date === b.date));
        return { ...prev, [targetMeso.id]: [...filtered, ...newBlocksLocally] };
      });
      showToast('success', `${newBlocksLocally.length} sesiones inyectadas en el calendario.`);
    } catch (error) {
      showToast('error', 'Error al inyectar la rutina en el calendario.');
    } finally {
      setIsSubmitting(false); setDayMapping({}); handleViewBlocks(targetMeso.id, true);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importMeso || !selectedTemplate) return;
    const templateObj = templates.find(t => t.id === selectedTemplate) || monthlyRoutines.find(r => r.id === selectedTemplate);
    if (!templateObj) return;
    await executeBatchInjection(templateObj, importMeso, dayMapping);
    setIsImportModalOpen(false); setSelectedTemplate("");
  };

  const handleGlobalImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalImportRoutine || !globalTargetMesoId) return;
    const allMesos = athlete?.macrocycles?.flatMap(m => m.mesocycles || []) || [];
    const targetMeso = allMesos.find(m => m.id === globalTargetMesoId);
    if (!targetMeso) return;
    await executeBatchInjection(globalImportRoutine, targetMeso, dayMapping);
    setGlobalImportRoutine(null); setGlobalTargetMesoId("");
  };

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [macroFormData, setMacroFormData] = useState({ name: "", startDate: "", endDate: "" });

  const handleMacroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateMacrocycle(athleteId, macroFormData);
      setMacroFormData({ name: "", startDate: "", endDate: "" });
      setIsMacroModalOpen(false);
      showToast('success', 'Macrociclo creado.');
    } catch (e) {
      showToast('error', 'No se pudo crear el macrociclo.');
    } finally { setIsSubmitting(false); }
  };

  const [isMesoModalOpen, setIsMesoModalOpen] = useState(false);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [mesoFormData, setMesoFormData] = useState({ name: "", phase: "Preparación General" as MesocyclePhase, startDate: "", endDate: "" });

  const handleMesoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMacroId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreateMesocycle(activeMacroId, mesoFormData);
      setMesoFormData({ name: "", phase: "Preparación General", startDate: "", endDate: "" });
      setIsMesoModalOpen(false); setActiveMacroId(null);
      showToast('success', 'Mesociclo creado.');
    } catch (e) {
      showToast('error', 'No se pudo crear el mesociclo.');
    } finally { setIsSubmitting(false); }
  };

  const [activeViewMesoId, setActiveViewMesoId] = useState<string | null>(null);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);

  const handleViewBlocks = async (mesocycleId: string, forceRefresh = false) => {
    if (activeViewMesoId === mesocycleId && !forceRefresh) { setActiveViewMesoId(null); return; }
    setActiveViewMesoId(mesocycleId);
    setIsLoadingBlocks(true);
    try {
      const docRef = doc(db, "mesocycleBlocks", mesocycleId);
      const docSnap = await getDoc(docRef);
      let fetchedBlocks: DailyBlock[] = [];

      if (docSnap.exists() && docSnap.data().blocks) {
        fetchedBlocks = Object.values(docSnap.data().blocks);
      }
      setBlocksByMesocycle((prev) => ({ ...prev, [mesocycleId]: fetchedBlocks }));
    } catch (error) {
      console.error(error);
      showToast('error', 'No se pudo cargar el calendario de este mesociclo.');
    }
    finally { setIsLoadingBlocks(false); }
  };

  const handleSaveBlock = async (mesocycleId: string, blockData: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">, existingBlockId?: string) => {
    try {
      const now = new Date().toISOString();
      const blockId = existingBlockId || Date.now().toString();
      const existingBlocks = blocksByMesocycle[mesocycleId] || [];
      const oldBlock = existingBlocks.find(b => b.date === blockData.date);

      const finalBlock = {
        ...blockData,
        id: blockId,
        mesocycleId,
        createdAt: oldBlock?.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, "mesocycleBlocks", mesocycleId);
      await setDoc(docRef, { blocks: { [blockData.date]: finalBlock } }, { merge: true });

      setBlocksByMesocycle((prev) => {
        const currentMesoBlocks = prev[mesocycleId] || [];
        const updatedBlocks = currentMesoBlocks.filter(b => b.date !== blockData.date);
        return { ...prev, [mesocycleId]: [...updatedBlocks, finalBlock as DailyBlock] };
      });
      showToast('success', 'Entrenamiento guardado.');
    } catch (error) {
      showToast('error', 'Hubo un error al guardar el entrenamiento.');
      throw error;
    }
  };

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [activeBlockContext, setActiveBlockContext] = useState<{ mesoId: string; date: string; name: string; existingId?: string } | null>(null);
  const [blockFormData, setBlockFormData] = useState({
    sessionType: "", intensity: 5, volume: "Medio" as "Bajo" | "Medio" | "Alto", durationMinutes: 60, notesHtml: "",
    exercises: [] as { id: string; name: string; sets: string; reps: string; weight: string; groupId?: string; videoUrl?: string }[]
  });

  const handleOpenBlockModal = (mesoId: string, date: string, dayName: string, existingBlock?: DailyBlock) => {
    setActiveBlockContext({ mesoId, date, name: dayName, existingId: existingBlock?.id });
    if (existingBlock) {
      setBlockFormData({
        sessionType: existingBlock.sessionType, intensity: existingBlock.intensity, volume: existingBlock.volume,
        durationMinutes: existingBlock.durationMinutes, notesHtml: existingBlock.notesHtml,
        exercises: existingBlock.exercises ? existingBlock.exercises.map((ex: any) => ({ ...ex, sets: ex.sets || "", groupId: ex.groupId || "", videoUrl: ex.videoUrl || "" })) : []
      });
    } else {
      setBlockFormData({ sessionType: "", intensity: 5, volume: "Medio", durationMinutes: 60, notesHtml: "", exercises: [] });
    }
    setIsBlockModalOpen(true);
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlockContext || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await handleSaveBlock(activeBlockContext.mesoId, {
        date: activeBlockContext.date, sessionType: blockFormData.sessionType, intensity: blockFormData.intensity,
        volume: blockFormData.volume, durationMinutes: blockFormData.durationMinutes, notesHtml: blockFormData.notesHtml,
        exercises: blockFormData.exercises, mesocycleId: activeBlockContext.mesoId
      }, activeBlockContext.existingId);
      setIsBlockModalOpen(false);
    } catch {
      // el toast de error ya se disparó dentro de handleSaveBlock
    } finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    async function fetchMacrocycles() {
      if (!athleteId) return;
      setIsLoadingMacros(true);
      try {
        const q = query(collection(db, "macrocycles"), where("athleteId", "==", athleteId));
        const snapshot = await getDocs(q);
        const fetchedMacros: Macrocycle[] = [];
        snapshot.forEach((doc) => fetchedMacros.push(doc.data() as Macrocycle));
        fetchedMacros.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        onLoadMacrocycles(athleteId, fetchedMacros);
      } catch (error) {
        console.error(error);
        showToast('error', 'No se pudo cargar la planificación del atleta.');
      }
      finally { setIsLoadingMacros(false); }
    }
    fetchMacrocycles();
  }, [athleteId]);

  if (!athlete) return (
    <div className="p-12 text-center text-blue-600 font-bold animate-pulse flex flex-col items-center">
      <Target size={40} className="mb-4 opacity-50" />
      <p>Cargando perfil del atleta...</p>
    </div>
  );

  const fullName = athlete.firstName ? `${athlete.firstName} ${athlete.lastName}` : athlete.name;
  const allMesosForDropdown = athlete.macrocycles?.flatMap(m => (m.mesocycles || []).map(meso => ({ ...meso, macroName: m.name }))) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans">

      <div>
        <Link to="/athletes" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <ChevronLeft size={16} /> Volver a Mis Atletas
        </Link>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md shadow-blue-500/30">
            {fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">{fullName}</h1>
            <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider rounded-lg">
              {athlete.sport || "Deporte no especificado"}
            </span>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <button onClick={handleOpenEditAthlete} className="flex-1 md:flex-none px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Edit3 size={18} /> Editar Perfil
          </button>
          <button onClick={() => setAthleteToDelete(true)} className="flex-1 md:flex-none px-5 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <Trash2 size={18} /> Eliminar
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} /> Planificación de Temporada
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Estructurá los macrociclos y bloques diarios del atleta.</p>
          </div>
          <button onClick={() => setIsMacroModalOpen(true)} className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            <Plus size={18} /> Nuevo Macrociclo
          </button>
        </div>

        {isLoadingMacros ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[0, 1].map(i => (
              <div key={i} className="border border-slate-200 bg-white rounded-3xl shadow-sm p-6 animate-pulse">
                <div className="h-5 w-48 bg-slate-200 rounded mb-3" />
                <div className="h-3 w-64 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : !athlete.macrocycles || athlete.macrocycles.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center">
            <Calendar size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-700">Aún no hay planificación creada.</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Organizá el año de tu atleta agregando el primer macrociclo.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {athlete.macrocycles.map((macro) => (
              <div key={macro.id} className="border border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden transition-all">
                <div className="bg-slate-50/50 p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">{macro.name}</h3>
                      <button onClick={() => setMacroToDelete(macro.id)} aria-label={`Eliminar macrociclo ${macro.name}`} title="Eliminar Macrociclo" className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-1">Del {macro.startDate.split('-').reverse().join('/')} al {macro.endDate.split('-').reverse().join('/')}</p>
                  </div>
                  <button onClick={() => { setActiveMacroId(macro.id); setIsMesoModalOpen(true); }} className="w-full sm:w-auto text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    <Plus size={16} /> Agregar Mesociclo
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {!macro.mesocycles || macro.mesocycles.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-6">No hay ciclos menores creados todavía.</p>
                  ) : (
                    <div className="space-y-4">
                      {macro.mesocycles.map((meso) => (
                        <div key={meso.id} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-black text-lg text-slate-800">{meso.name}</h4>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{meso.phase}</span>
                                <button onClick={() => setMesoToDelete({ macroId: macro.id, mesoId: meso.id })} aria-label={`Eliminar mesociclo ${meso.name}`} title="Eliminar Mesociclo" className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <p className="text-xs font-medium text-slate-500 mt-1">{meso.startDate.split('-').reverse().join('/')} → {meso.endDate.split('-').reverse().join('/')}</p>
                            </div>

                            <div className="flex w-full lg:w-auto gap-2">
                              <button onClick={() => { setImportMeso(meso); setIsImportModalOpen(true); }} className="flex-1 lg:flex-none text-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                                Pegar Plantilla
                              </button>
                              <button
                                onClick={() => handleViewBlocks(meso.id)}
                                aria-expanded={activeViewMesoId === meso.id}
                                className={`flex-1 lg:flex-none text-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${activeViewMesoId === meso.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                              >
                                {activeViewMesoId === meso.id ? "Ocultar Días" : "Ver Calendario"}
                              </button>
                            </div>
                          </div>

                          {activeViewMesoId === meso.id && (
                            <div className="mt-5 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                              {isLoadingBlocks ? (
                                <div className="space-y-2 p-2" aria-live="polite" aria-busy="true">
                                  {[0, 1, 2].map(i => <div key={i} className="h-11 bg-slate-100 rounded-xl animate-pulse" />)}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {getWeeksInRange(meso.startDate, meso.endDate).map((week, idx) => {
                                    const weekKey = `${meso.id}-w${idx}`;
                                    const isExpanded = expandedWeek === weekKey;

                                    return (
                                      <div key={weekKey} className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden transition-all">
                                        <button onClick={() => setExpandedWeek(isExpanded ? null : weekKey)} aria-expanded={isExpanded} className="w-full flex justify-between items-center p-4 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset">
                                          <span className="font-black text-slate-800 text-sm md:text-base">{week.label}</span>
                                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Del {week.days[0].date.slice(-5).replace('-', '/')} al {week.days[6].date.slice(-5).replace('-', '/')}</span>
                                        </button>

                                        {isExpanded && (
                                          <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/50">
                                            {week.days.map(day => {
                                              const existingBlock = blocksByMesocycle[meso.id]?.find((b: any) => b.date === day.date);
                                              const isOutside = day.date < meso.startDate || day.date > meso.endDate;

                                              return (
                                                <div key={day.date} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 text-sm transition-colors ${isOutside ? 'bg-slate-100/50 opacity-60' : 'bg-white hover:bg-slate-50'}`}>
                                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full sm:w-auto">
                                                    <span className="font-bold w-full sm:w-28 text-slate-700 flex items-center justify-between sm:justify-start gap-2">
                                                      {day.name} <span className="font-medium text-xs text-slate-400">{day.date.split('-').reverse().slice(0, 2).join('/')}</span>
                                                    </span>
                                                    {existingBlock ? (
                                                      <span className="text-blue-600 font-black truncate bg-blue-50 px-2.5 py-0.5 rounded text-xs">{existingBlock.sessionType}</span>
                                                    ) : (
                                                      <span className="text-slate-400 italic text-xs font-medium">Descanso / Libre</span>
                                                    )}
                                                  </div>
                                                  <button onClick={() => handleOpenBlockModal(meso.id, day.date, day.name, existingBlock)} className={`w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${existingBlock ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'}`}>
                                                    {existingBlock ? "Editar" : "Cargar Sesión"}
                                                  </button>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {athlete && (
        <MonthlyRoutineManager
          athleteId={athlete.id}
          coachId={athlete.coachId}
          templates={templates}
          monthlyRoutines={monthlyRoutines}
          onInjectRequest={(routine: MonthlyRoutine) => {
            setGlobalImportRoutine(routine);
            setGlobalTargetMesoId("");
            setDayMapping({});
          }}
          onSaveAthleteRoutine={async (routineData) => {
            const newRef = doc(collection(db, "monthlyRoutines"));
            const newRoutine = { ...routineData, id: newRef.id, createdAt: new Date().toISOString() };
            await setDoc(newRef, newRoutine);
            setMonthlyRoutines(prev => [...prev, newRoutine as MonthlyRoutine]);
            return newRoutine as MonthlyRoutine;
          }}

          onUpdateAthleteRoutine={async (routineId, data) => {
            await updateDoc(doc(db, "monthlyRoutines", routineId), data);
            setMonthlyRoutines(prev => prev.map(r => r.id === routineId ? { ...r, ...data } : r));
          }}
          onDeleteAthleteRoutine={async (routineId) => {
            try {
              await deleteDoc(doc(db, "monthlyRoutines", routineId));
              setMonthlyRoutines(prev => prev.filter(r => r.id !== routineId));
              showToast('success', 'Rutina eliminada.');
            } catch (e) {
              console.error(e);
              showToast('error', 'Error al eliminar la rutina.');
            }
          }}
        />
      )}

      {/* MODALES */}
      {isImportModalOpen && importMeso && (
        <ModalShell onClose={() => setIsImportModalOpen(false)} labelledBy="import-modal-title" panelClassName="max-w-md p-8 max-h-[90vh] overflow-y-auto">
          {(close) => (
            <>
              <h2 id="import-modal-title" className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Inyectar Plantilla</h2>
              <p className="text-sm font-medium text-slate-500 mb-6">Pegá una rutina directamente al calendario de este mesociclo.</p>

              <form onSubmit={handleImportSubmit} className="space-y-5">
                <select required value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setDayMapping({}); }} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer">
                  <option value="">Seleccionar Rutina...</option>
                  <optgroup label="Historial del Atleta">
                    {monthlyRoutines.map(r => <option key={r.id} value={r.id}>{r.monthName}</option>)}
                  </optgroup>
                  <optgroup label="Plantillas Maestra (Global)">
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                </select>

                {selectedTemplate && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asignar a días de la semana</p>
                    {(templates.find(t => t.id === selectedTemplate) || monthlyRoutines.find(r => r.id === selectedTemplate))?.days.map(d => (
                      <div key={d.dayNumber} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                        <label htmlFor={`day-map-${d.dayNumber}`} className="text-sm font-bold text-slate-700">Día {d.dayNumber}</label>
                        <select id={`day-map-${d.dayNumber}`} required value={dayMapping[d.dayNumber] || ""} onChange={(e) => setDayMapping({ ...dayMapping, [d.dayNumber]: e.target.value })} className="bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold text-slate-700 w-full sm:w-36 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                          <option value="">Elegir...</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option><option value="0">Domingo</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={close} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
                  <button type="submit" disabled={isSubmitting || !selectedTemplate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Inyectar Días
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}

      {globalImportRoutine && (
        <ModalShell onClose={() => { setGlobalImportRoutine(null); setGlobalTargetMesoId(""); }} labelledBy="global-import-modal-title" panelClassName="max-w-md p-8 max-h-[90vh] overflow-y-auto">
          {(close) => (
            <>
              <h2 id="global-import-modal-title" className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Inyectar Rutina PDF</h2>
              <p className="text-sm font-medium text-slate-500 mb-6">Elegí el destino en el calendario para volcar esta rutina mensual.</p>

              <form onSubmit={handleGlobalImportSubmit} className="space-y-5">
                <div>
                  <label htmlFor="target-meso" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mesociclo Destino</label>
                  <select id="target-meso" required value={globalTargetMesoId} onChange={(e) => { setGlobalTargetMesoId(e.target.value); setDayMapping({}); }} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer">
                    <option value="">Seleccionar Mesociclo...</option>
                    {allMesosForDropdown.map(meso => (
                      <option key={meso.id} value={meso.id}>
                        {meso.macroName}: {meso.name}
                      </option>
                    ))}
                  </select>
                </div>

                {globalTargetMesoId && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asignar a días</p>
                    {globalImportRoutine.days.map(d => (
                      <div key={d.dayNumber} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                        <label htmlFor={`gday-map-${d.dayNumber}`} className="text-xs font-bold text-slate-700 truncate w-32" title={d.sessionType}>Día {d.dayNumber}: {d.sessionType}</label>
                        <select id={`gday-map-${d.dayNumber}`} required value={dayMapping[d.dayNumber] || ""} onChange={(e) => setDayMapping({ ...dayMapping, [d.dayNumber]: e.target.value })} className="bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold text-slate-700 w-full sm:w-36 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                          <option value="">Día...</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option><option value="0">Domingo</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={close} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
                  <button type="submit" disabled={isSubmitting || !globalTargetMesoId} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Finalizar Inyección
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}

      {isMacroModalOpen && (
        <ModalShell onClose={() => setIsMacroModalOpen(false)} labelledBy="macro-modal-title">
          {(close) => (
            <>
              <h2 id="macro-modal-title" className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Nuevo Macrociclo</h2>
              <form onSubmit={handleMacroSubmit} className="space-y-5">
                <div>
                  <label htmlFor="macro-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Bloque</label>
                  <input id="macro-name" type="text" required placeholder="Ej: Torneo Apertura" value={macroFormData.name} onChange={(e) => setMacroFormData({ ...macroFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="macro-start" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inicio</label>
                    <input id="macro-start" type="date" required value={macroFormData.startDate} onChange={(e) => setMacroFormData({ ...macroFormData, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="macro-end" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fin</label>
                    <input id="macro-end" type="date" required value={macroFormData.endDate} onChange={(e) => setMacroFormData({ ...macroFormData, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={close} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}

      {isMesoModalOpen && (
        <ModalShell onClose={() => { setIsMesoModalOpen(false); setActiveMacroId(null); }} labelledBy="meso-modal-title">
          {(close) => (
            <>
              <h2 id="meso-modal-title" className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Agregar Mesociclo</h2>
              <form onSubmit={handleMesoSubmit} className="space-y-5">
                <div>
                  <label htmlFor="meso-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Ciclo</label>
                  <input id="meso-name" type="text" required placeholder="Ej: Fuerza Base I" value={mesoFormData.name} onChange={(e) => setMesoFormData({ ...mesoFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
                <div>
                  <label htmlFor="meso-phase" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fase del Entrenamiento</label>
                  <select id="meso-phase" required value={mesoFormData.phase} onChange={(e) => setMesoFormData({ ...mesoFormData, phase: e.target.value as MesocyclePhase })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all cursor-pointer">
                    <option value="Preparación General">Preparación General</option>
                    <option value="Preparación Específica">Preparación Específica</option>
                    <option value="Pre-Competitiva">Pre-Competitiva</option>
                    <option value="Competitiva">Competitiva</option>
                    <option value="Transición">Transición</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="meso-start" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inicio</label>
                    <input id="meso-start" type="date" required value={mesoFormData.startDate} onChange={(e) => setMesoFormData({ ...mesoFormData, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="meso-end" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fin</label>
                    <input id="meso-end" type="date" required value={mesoFormData.endDate} onChange={(e) => setMesoFormData({ ...mesoFormData, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={close} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}

      {/* EDITOR DE BLOQUES DIARIOS */}
      {isBlockModalOpen && activeBlockContext && (
        <ModalShell
          onClose={() => setIsBlockModalOpen(false)}
          labelledBy="block-modal-title"
          overlayClassName="bg-slate-900/80 backdrop-blur-sm"
          panelClassName="max-w-5xl flex flex-col max-h-[95vh] overflow-hidden p-0"
        >
          {(close) => (
            <>
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl hidden sm:block">
                    <Calendar size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 id="block-modal-title" className="font-black text-lg sm:text-2xl tracking-tight">{activeBlockContext.name} {activeBlockContext.date.split('-').reverse().join('/')}</h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">Diseñá el entrenamiento exacto para este día.</p>
                  </div>
                </div>
                <button onClick={close} aria-label="Cerrar editor de sesión" className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><X size={20} /></button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto bg-slate-50/50 flex-1 space-y-8 custom-scrollbar">
                <form id="blockForm" onSubmit={handleBlockSubmit} className="space-y-8">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <label htmlFor="session-type" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Enfoque de la sesión</label>
                      <input id="session-type" type="text" required value={blockFormData.sessionType} onChange={(e) => setBlockFormData({ ...blockFormData, sessionType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" placeholder="Ej: Empuje y Tríceps" />
                    </div>
                    <div>
                      <label htmlFor="session-volume" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Volumen Estimado</label>
                      <select id="session-volume" value={blockFormData.volume} onChange={(e) => setBlockFormData({ ...blockFormData, volume: e.target.value as any })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer">
                        <option value="Bajo">Bajo</option><option value="Medio">Medio</option><option value="Alto">Alto</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Dumbbell size={20} className="text-blue-500" /> Esquema de Ejercicios
                        </h3>
                      </div>
                      <button type="button" onClick={() => setBlockFormData(prev => ({ ...prev, exercises: [...prev.exercises, { id: Date.now().toString(), name: "", sets: "", reps: "", weight: "", groupId: "", videoUrl: "" }] }))} className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        <Plus size={16} strokeWidth={3} /> Agregar Ejercicio
                      </button>
                    </div>

                    {blockFormData.exercises.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm font-medium">No hay ejercicios cargados para este día.</div>
                    ) : (
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[800px] space-y-3">
                          <div className="flex gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="w-[30%]">Ejercicio</div>
                            <div className="w-[10%] text-center">Series</div>
                            <div className="w-[10%] text-center">Reps</div>
                            <div className="w-[15%]">Carga</div>
                            <div className="w-[20%]">Link Video</div>
                            <div className="w-[8%] text-center">Blq</div>
                            <div className="w-[7%]"></div>
                          </div>
                          {blockFormData.exercises.map((ex) => {
                            const groupColor = getBlockColor(ex.groupId);
                            return (
                              <div key={ex.id} className={`flex gap-2 mb-2 p-2 rounded-xl shadow-sm border items-center transition-all focus-within:ring-2 focus-within:ring-blue-600/20 ${groupColor === "bg-white border-l-4 border-transparent" ? "bg-slate-50 border-slate-100" : groupColor}`}>
                                <input type="text" aria-label="Nombre del ejercicio" value={ex.name} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, name: e.target.value } : x) }))} className="w-[30%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none shadow-sm" placeholder="Sentadilla" />
                                <input type="text" aria-label="Cantidad de series" value={ex.sets || ""} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, sets: e.target.value } : x) }))} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none shadow-sm" placeholder="4" />
                                <input type="text" aria-label="Repeticiones" value={ex.reps} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, reps: e.target.value } : x) }))} className="w-[10%] text-center bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none shadow-sm" placeholder="10" />
                                <input type="text" aria-label="Carga o intensidad" value={ex.weight} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, weight: e.target.value } : x) }))} className="w-[15%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-blue-600 focus:border-blue-500 outline-none shadow-sm" placeholder="RIR 2" />
                                <input type="url" aria-label="Link del video demostrativo" value={ex.videoUrl || ""} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, videoUrl: e.target.value } : x) }))} className="w-[20%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-medium text-slate-500 focus:border-blue-500 outline-none shadow-sm" placeholder="https://youtu.be/..." />
                                <input type="text" aria-label="Identificador de bloque o grupo" maxLength={2} value={ex.groupId || ""} onChange={(e) => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.map(x => x.id === ex.id ? { ...x, groupId: e.target.value.toUpperCase() } : x) }))} className="w-[8%] bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-black text-slate-700 text-center uppercase focus:border-blue-500 outline-none shadow-sm" placeholder="-" />
                                <div className="w-[7%] flex justify-center">
                                  <button type="button" onClick={() => setBlockFormData(prev => ({ ...prev, exercises: prev.exercises.filter(x => x.id !== ex.id) }))} aria-label={`Eliminar ejercicio ${ex.name || 'sin nombre'}`} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><X size={18} /></button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notas y Observaciones</label>
                    <div className="h-40 sm:h-48 mb-12 sm:mb-10">
                      <ReactQuill
                        key={`quill-block-${activeBlockContext?.date || 'new'}`}
                        theme="snow"
                        value={blockFormData.notesHtml}
                        onChange={(content: string, delta: any, source: string) => {
                          if (source === "user") setBlockFormData(prev => ({ ...prev, notesHtml: content }));
                        }}
                        className="h-full rounded-b-xl"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                <button type="button" onClick={close} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-sm text-slate-700 transition-all active:scale-95">Cancelar</button>
                <button type="submit" form="blockForm" disabled={isSubmitting} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar Sesión
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {isEditAthleteModalOpen && (
        <ModalShell onClose={() => setIsEditAthleteModalOpen(false)} labelledBy="edit-athlete-title" zIndexClassName="z-[60]">
          {(close) => (
            <>
              <h2 id="edit-athlete-title" className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Editar Perfil</h2>
              <form onSubmit={handleAthleteEditSubmit} className="space-y-5">
                <div>
                  <label htmlFor="athlete-name" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo *</label>
                  <input id="athlete-name" required type="text" value={athleteFormData.name} onChange={(e) => setAthleteFormData({ ...athleteFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
                <div>
                  <label htmlFor="athlete-sport" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deporte o Categoría *</label>
                  <input id="athlete-sport" required type="text" value={athleteFormData.sport} onChange={(e) => setAthleteFormData({ ...athleteFormData, sport: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" />
                </div>
                <div>
                  <label htmlFor="athlete-email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email de acceso</label>
                  <input id="athlete-email" type="email" value={athleteFormData.email} onChange={(e) => setAthleteFormData({ ...athleteFormData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl p-3.5 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all" placeholder="atleta@correo.com" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={close} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-95">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl disabled:bg-blue-300 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Guardar
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalShell>
      )}

      {athleteToDelete && (
        <ModalShell onClose={() => setAthleteToDelete(false)} labelledBy="delete-athlete-title" overlayClassName="bg-slate-900/60 backdrop-blur-sm" panelClassName="max-w-sm p-8 text-center" zIndexClassName="z-[70]">
          {(close) => (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><AlertTriangle size={36} /></div>
              <h3 id="delete-athlete-title" className="text-2xl font-black text-slate-800 mb-2">¿Eliminar Atleta?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">Se borrará toda su planificación, rutinas y semanas de forma definitiva.</p>
              <div className="flex gap-3">
                <button onClick={close} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
                <button onClick={confirmDeleteAthlete} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} Sí, borrar
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {macroToDelete && (
        <ModalShell onClose={() => setMacroToDelete(null)} labelledBy="delete-macro-title" panelClassName="max-w-sm p-8 text-center" zIndexClassName="z-[70]">
          {(close) => (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><AlertTriangle size={36} /></div>
              <h3 id="delete-macro-title" className="text-2xl font-black text-slate-800 mb-2">¿Borrar Macrociclo?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">Se perderán todos los mesociclos y días de entrenamiento cargados.</p>
              <div className="flex gap-3">
                <button onClick={close} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
                <button onClick={confirmDeleteMacro} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} Sí, borrar
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {mesoToDelete && (
        <ModalShell onClose={() => setMesoToDelete(null)} labelledBy="delete-meso-title" panelClassName="max-w-sm p-8 text-center" zIndexClassName="z-[70]">
          {(close) => (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner"><AlertTriangle size={36} /></div>
              <h3 id="delete-meso-title" className="text-2xl font-black text-slate-800 mb-2">¿Eliminar Mesociclo?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8">Los días de entrenamiento de este bloque desaparecerán del calendario.</p>
              <div className="flex gap-3">
                <button onClick={close} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
                <button onClick={confirmDeleteMeso} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} Sí, borrar
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />

    </div>
  );
}