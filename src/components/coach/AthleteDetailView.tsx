import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle, RoutineTemplate, MonthlyRoutine } from "../../types/models";
import MonthlyRoutineManager from "./MonthlyRoutineManager";
import { Trash2, Edit3, ChevronLeft, Plus, Calendar, SearchX } from "lucide-react";
import Toast, { type ToastState } from "../shared/Toast";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal";
import MacrocycleFormModal from "./athlete-detail/MacrocycleFormModal";
import MesocycleFormModal from "./athlete-detail/MesocycleFormModal";
import EditAthleteModal from "./athlete-detail/EditAthleteModal";
import PasteTemplateModal from "./athlete-detail/PasteTemplateModal";
import InjectRoutineModal from "./athlete-detail/InjectRoutineModal";
import DailyBlockEditorModal from "./athlete-detail/DailyBlockEditorModal";
import type { AthleteFormData, BlockContext, BlockFormData, DayMapping, MacroFormData, MesoFormData } from "./athlete-detail/types";

interface AthleteDetailViewProps {
  athletes: Athlete[];
  onLoadMacrocycles: (athleteId: string, macros: Macrocycle[]) => void;
  onCreateMacrocycle: (athleteId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onUpdateMacrocycle: (macrocycleId: string, data: { name: string; startDate: string; endDate: string }) => Promise<void>;
  onDeleteMacrocycle: (macrocycleId: string, athleteId: string) => void;
  onCreateMesocycle: (macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onUpdateMesocycle: (mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => Promise<void>;
  onDeleteMesocycle: (macrocycleId: string, mesocycleId: string) => void;
  // Sin UI por ahora (los mesociclos se muestran ordenados por fecha); se mantiene para un futuro drag & drop
  onReorderMesocycles: (macrocycleId: string, reordered: Mesocycle[]) => void;
  onUpdateAthlete: (athleteId: string, data: { name: string; sport: string; email?: string; phone?: string }) => Promise<void>;
  onDeleteAthlete: (athleteId: string) => Promise<boolean>;
}

// ── Helpers puros (fuera del componente: no se recrean en cada render) ──────

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "yyyy-MM-dd" → "dd/MM"
const toDayMonth = (isoDate: string) => isoDate.split('-').reverse().slice(0, 2).join('/');

// Las fechas son ISO "yyyy-MM-dd", así que la comparación de strings respeta el orden cronológico
const sortMesosByStart = (mesos: Mesocycle[] = []) => [...mesos].sort((a, b) => a.startDate.localeCompare(b.startDate));

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

export default function AthleteDetailView({
  athletes, onLoadMacrocycles, onCreateMacrocycle, onUpdateMacrocycle, onDeleteMacrocycle,
  onCreateMesocycle, onUpdateMesocycle, onDeleteMesocycle, onUpdateAthlete, onDeleteAthlete
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
  const [dayMapping, setDayMapping] = useState<DayMapping>({});

  const [isEditAthleteModalOpen, setIsEditAthleteModalOpen] = useState(false);
  const [athleteFormData, setAthleteFormData] = useState<AthleteFormData>({ name: "", sport: "", email: "", phone: "" });

  const [athleteToDelete, setAthleteToDelete] = useState(false);
  const [macroToDelete, setMacroToDelete] = useState<string | null>(null);
  const [mesoToDelete, setMesoToDelete] = useState<{ macroId: string; mesoId: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => setToast({ type, message }), []);
  // Referencia estable: si cambiara en cada render, el temporizador del Toast se reiniciaría sin parar
  const dismissToast = useCallback(() => setToast(null), []);

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

  // FIX: sin try/catch, si onDeleteMacrocycle rechaza (ahora que App.tsx
  // relanza los errores de Firestore en vez de tragárselos con alert()), el
  // spinner del botón quedaba girando para siempre y nunca se avisaba del error.
  const confirmDeleteMacro = async () => {
    if (!macroToDelete || !athlete) return;
    setIsSubmitting(true);
    try {
      await onDeleteMacrocycle(macroToDelete, athlete.id);
      setMacroToDelete(null);
      showToast('success', 'Macrociclo eliminado.');
    } catch (e) {
      showToast('error', 'No se pudo eliminar el macrociclo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteMeso = async () => {
    if (!mesoToDelete) return;
    setIsSubmitting(true);
    try {
      await onDeleteMesocycle(mesoToDelete.macroId, mesoToDelete.mesoId);
      setMesoToDelete(null);
      showToast('success', 'Mesociclo eliminado.');
    } catch (e) {
      showToast('error', 'No se pudo eliminar el mesociclo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Descarta respuestas de un atleta anterior si el coach navega rápido entre perfiles
    let cancelled = false;
    async function fetchData() {
      if (!athlete?.coachId) return;
      try {
        const qT = query(collection(db, "routineTemplates"), where("coachId", "==", athlete.coachId));
        const snapT = await getDocs(qT);
        const loadedT: RoutineTemplate[] = [];
        snapT.forEach(doc => loadedT.push({ id: doc.id, ...doc.data() } as RoutineTemplate));

        const qM = query(collection(db, "monthlyRoutines"), where("athleteId", "==", athleteId));
        const snapM = await getDocs(qM);
        const loadedM: MonthlyRoutine[] = [];
        snapM.forEach(doc => loadedM.push({ id: doc.id, ...doc.data() } as MonthlyRoutine));

        if (cancelled) return;
        setTemplates(loadedT);
        setMonthlyRoutines(loadedM);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        showToast('error', 'No se pudieron cargar las plantillas y rutinas.');
      }
    }
    fetchData();
    return () => { cancelled = true; };
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

  // Si dos días de la plantilla apuntan al mismo día de la semana, uno se perdería en silencio
  const validateDayMapping = (mapping: Record<number, string>): string | null => {
    const seen = new Map<string, number>();
    for (const [templateDay, weekDay] of Object.entries(mapping)) {
      if (!weekDay) continue;
      const previous = seen.get(weekDay);
      if (previous !== undefined) {
        return `El Día ${previous} y el Día ${templateDay} están asignados al mismo día de la semana.`;
      }
      seen.set(weekDay, Number(templateDay));
    }
    return null;
  };

  const [injectError, setInjectError] = useState<string | null>(null);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importMeso || !selectedTemplate) return;
    const templateObj = templates.find(t => t.id === selectedTemplate) || monthlyRoutines.find(r => r.id === selectedTemplate);
    if (!templateObj) return;
    const mappingError = validateDayMapping(dayMapping);
    if (mappingError) { setInjectError(mappingError); return; }
    setInjectError(null);
    await executeBatchInjection(templateObj, importMeso, dayMapping);
    setIsImportModalOpen(false); setSelectedTemplate("");
  };

  const handleGlobalImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalImportRoutine || !globalTargetMesoId) return;
    const allMesos = athlete?.macrocycles?.flatMap(m => m.mesocycles || []) || [];
    const targetMeso = allMesos.find(m => m.id === globalTargetMesoId);
    if (!targetMeso) return;
    const mappingError = validateDayMapping(dayMapping);
    if (mappingError) { setInjectError(mappingError); return; }
    setInjectError(null);
    await executeBatchInjection(globalImportRoutine, targetMeso, dayMapping);
    setGlobalImportRoutine(null); setGlobalTargetMesoId("");
  };

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [macroFormData, setMacroFormData] = useState<MacroFormData>({ name: "", startDate: "", endDate: "" });
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [macroFormError, setMacroFormError] = useState<string | null>(null);

  const openMacroModal = (macro?: Macrocycle) => {
    setMacroFormError(null);
    setEditingMacroId(macro?.id ?? null);
    setMacroFormData(macro ? { name: macro.name, startDate: macro.startDate, endDate: macro.endDate } : { name: "", startDate: "", endDate: "" });
    setIsMacroModalOpen(true);
  };

  const closeMacroModal = () => {
    setIsMacroModalOpen(false);
    setEditingMacroId(null);
    setMacroFormError(null);
  };

  const handleMacroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId || isSubmitting) return;

    const { startDate, endDate } = macroFormData;
    if (endDate < startDate) {
      setMacroFormError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    if (editingMacroId) {
      // Al editar, el macrociclo no puede dejar afuera a sus mesociclos
      const current = athlete?.macrocycles.find((m) => m.id === editingMacroId);
      const outside = (current?.mesocycles || []).find((meso) => meso.startDate < startDate || meso.endDate > endDate);
      if (outside) {
        setMacroFormError(`El mesociclo "${outside.name}" quedaría fuera del rango. Ajustá sus fechas primero.`);
        return;
      }
    }

    setMacroFormError(null);
    setIsSubmitting(true);
    try {
      if (editingMacroId) {
        await onUpdateMacrocycle(editingMacroId, macroFormData);
        showToast('success', 'Macrociclo actualizado.');
      } else {
        await onCreateMacrocycle(athleteId, macroFormData);
        showToast('success', 'Macrociclo creado.');
      }
      setMacroFormData({ name: "", startDate: "", endDate: "" });
      closeMacroModal();
    } catch (e) {
      setMacroFormError(editingMacroId ? "No se pudo actualizar el macrociclo." : "No se pudo crear el macrociclo.");
    } finally { setIsSubmitting(false); }
  };

  const [isMesoModalOpen, setIsMesoModalOpen] = useState(false);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [mesoFormData, setMesoFormData] = useState<MesoFormData>({ name: "", phase: "Preparación General", startDate: "", endDate: "" });
  const [editingMesoId, setEditingMesoId] = useState<string | null>(null);
  const [mesoFormError, setMesoFormError] = useState<string | null>(null);

  const openMesoModal = (macroId: string, meso?: Mesocycle) => {
    setMesoFormError(null);
    setActiveMacroId(macroId);
    setEditingMesoId(meso?.id ?? null);
    setMesoFormData(meso
      ? { name: meso.name, phase: meso.phase, startDate: meso.startDate, endDate: meso.endDate }
      : { name: "", phase: "Preparación General", startDate: "", endDate: "" });
    setIsMesoModalOpen(true);
  };

  const closeMesoModal = () => {
    setIsMesoModalOpen(false);
    setActiveMacroId(null);
    setEditingMesoId(null);
    setMesoFormError(null);
  };

  const handleMesoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMacroId || isSubmitting) return;

    const { startDate, endDate } = mesoFormData;
    const parentMacro = athlete?.macrocycles.find((m) => m.id === activeMacroId);
    if (endDate < startDate) {
      setMesoFormError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    if (parentMacro && (startDate < parentMacro.startDate || endDate > parentMacro.endDate)) {
      setMesoFormError("El mesociclo tiene que estar dentro de las fechas de su macrociclo.");
      return;
    }

    setMesoFormError(null);
    setIsSubmitting(true);
    try {
      if (editingMesoId) {
        await onUpdateMesocycle(editingMesoId, mesoFormData);
        showToast('success', 'Mesociclo actualizado.');
      } else {
        await onCreateMesocycle(activeMacroId, mesoFormData);
        showToast('success', 'Mesociclo creado.');
      }
      setMesoFormData({ name: "", phase: "Preparación General", startDate: "", endDate: "" });
      closeMesoModal();
    } catch (e) {
      setMesoFormError(editingMesoId ? "No se pudo actualizar el mesociclo." : "No se pudo crear el mesociclo.");
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
  const [activeBlockContext, setActiveBlockContext] = useState<BlockContext | null>(null);
  const [blockFormData, setBlockFormData] = useState<BlockFormData>({
    sessionType: "", intensity: 5, volume: "Medio", durationMinutes: 60, notesHtml: "", exercises: []
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
    // Descarta respuestas de un atleta anterior si el coach navega rápido entre perfiles
    let cancelled = false;
    async function fetchMacrocycles() {
      if (!athleteId) return;
      setIsLoadingMacros(true);
      try {
        const q = query(collection(db, "macrocycles"), where("athleteId", "==", athleteId));
        const snapshot = await getDocs(q);
        const fetchedMacros: Macrocycle[] = [];
        snapshot.forEach((doc) => fetchedMacros.push(doc.data() as Macrocycle));
        fetchedMacros.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        if (cancelled) return;
        onLoadMacrocycles(athleteId, fetchedMacros);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        showToast('error', 'No se pudo cargar la planificación del atleta.');
      }
      finally { if (!cancelled) setIsLoadingMacros(false); }
    }
    fetchMacrocycles();
    return () => { cancelled = true; };
  }, [athleteId]);

  // ── Estado "atleta no encontrado" ───────────────────────────────────────────
  // CoachApp muestra su skeleton hasta que llega la lista de atletas, así que
  // cuando esta vista se renderiza la lista ya está cargada: si el id no está,
  // el atleta no existe (o fue borrado) — no está "cargando".
  if (!athlete) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--ink-800)] flex items-center justify-center mb-5">
          <SearchX size={28} className="text-[var(--mist-500)]" />
        </div>
        <h1 className="font-display font-bold text-2xl text-[var(--mist-100)] uppercase tracking-wide">Atleta no encontrado</h1>
        <p className="text-[var(--mist-500)] mt-2 font-medium">Puede que el perfil haya sido eliminado o el enlace ya no sea válido.</p>
        <Link
          to="/athletes"
          className="mt-6 inline-flex items-center gap-2 bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-6 py-3 rounded-xl font-display font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-950)]"
        >
          <ChevronLeft size={18} /> Volver a Mis Atletas
        </Link>
      </div>
    );
  }

  const fullName = athlete.firstName ? `${athlete.firstName} ${athlete.lastName}` : athlete.name;
  const allMesosForDropdown = athlete.macrocycles?.flatMap(m => sortMesosByStart(m.mesocycles).map(meso => ({ ...meso, macroName: m.name }))) || [];
  const activeMacro = athlete.macrocycles?.find((m) => m.id === activeMacroId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      <div>
        <Link to="/athletes" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--mist-300)] hover:text-[var(--signal-500)] transition-colors bg-[var(--ink-900)] px-4 py-2.5 rounded-xl border border-[var(--line-800)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
          <ChevronLeft size={16} /> Volver a Mis Atletas
        </Link>
      </div>

      <div className="bg-[var(--ink-900)] p-6 sm:p-8 rounded-3xl border border-[var(--line-800)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gradient-to-br from-[var(--signal-500)] to-[var(--signal-600)] text-[var(--ink-950)] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-display font-bold">
            {fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--mist-100)] tracking-tight leading-tight">{fullName}</h1>
            <span className="inline-block mt-2 px-3 py-1 bg-[var(--ink-800)] text-[var(--mist-300)] text-xs font-black uppercase tracking-wider rounded-lg">
              {athlete.sport || "Deporte no especificado"}
            </span>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <button onClick={handleOpenEditAthlete} className="flex-1 md:flex-none px-5 py-3.5 bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <Edit3 size={18} /> Editar Perfil
          </button>
          <button onClick={() => setAthleteToDelete(true)} className="flex-1 md:flex-none px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <Trash2 size={18} /> Eliminar
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="text-[var(--signal-500)]" size={24} /> Planificación de Temporada
            </h2>
            <p className="text-sm font-medium text-[var(--mist-500)] mt-1">Estructurá los macrociclos y bloques diarios del atleta.</p>
          </div>
          <button onClick={() => openMacroModal()} className="w-full sm:w-auto bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-6 py-3.5 rounded-2xl text-sm font-display font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <Plus size={18} /> Nuevo Macrociclo
          </button>
        </div>

        {isLoadingMacros ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            {[0, 1].map(i => (
              <div key={i} className="border border-[var(--line-800)] bg-[var(--ink-900)] rounded-3xl p-6 animate-pulse motion-reduce:animate-none">
                <div className="h-5 w-48 bg-[var(--ink-800)] rounded mb-3" />
                <div className="h-3 w-64 bg-[var(--ink-800)] rounded" />
              </div>
            ))}
          </div>
        ) : !athlete.macrocycles || athlete.macrocycles.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-[var(--line-800)] rounded-3xl bg-[var(--ink-900)]/50 flex flex-col items-center">
            <Calendar size={48} className="text-[var(--mist-500)] mb-4" />
            <p className="text-lg font-bold text-[var(--mist-100)]">Aún no hay planificación creada.</p>
            <p className="text-sm text-[var(--mist-500)] mt-1 max-w-sm">Organizá el año de tu atleta agregando el primer macrociclo.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {athlete.macrocycles.map((macro) => (
              <div key={macro.id} className="border border-[var(--line-800)] bg-[var(--ink-900)] rounded-3xl overflow-hidden transition-all">
                <div className="bg-[var(--ink-850)] p-5 sm:p-6 border-b border-[var(--line-800)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-display font-bold text-[var(--mist-100)] tracking-tight">{macro.name}</h3>
                      <button onClick={() => openMacroModal(macro)} aria-label={`Editar macrociclo ${macro.name}`} title="Editar Macrociclo" className="text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--signal-500)]/10 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => setMacroToDelete(macro.id)} aria-label={`Eliminar macrociclo ${macro.name}`} title="Eliminar Macrociclo" className="text-[var(--mist-500)] hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-[var(--mist-500)] mt-1">Del {macro.startDate.split('-').reverse().join('/')} al {macro.endDate.split('-').reverse().join('/')}</p>
                  </div>
                  <button onClick={() => openMesoModal(macro.id)} className="w-full sm:w-auto text-[var(--signal-500)] font-bold bg-[var(--signal-500)]/10 hover:bg-[var(--signal-500)]/20 px-5 py-2.5 rounded-xl text-sm transition-colors active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                    <Plus size={16} /> Agregar Mesociclo
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {!macro.mesocycles || macro.mesocycles.length === 0 ? (
                    <p className="text-sm text-[var(--mist-500)] italic text-center py-6">No hay ciclos menores creados todavía.</p>
                  ) : (
                    <div className="space-y-4">
                      {sortMesosByStart(macro.mesocycles).map((meso) => (
                        <div key={meso.id} className="border border-[var(--line-800)] rounded-2xl p-4 sm:p-5 bg-[var(--ink-850)] hover:border-[var(--mist-500)]/40 transition-colors">
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-display font-bold text-lg text-[var(--mist-100)]">{meso.name}</h4>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--ink-800)] text-[var(--mist-300)] px-2 py-1 rounded-md">{meso.phase}</span>
                                <button onClick={() => openMesoModal(macro.id, meso)} aria-label={`Editar mesociclo ${meso.name}`} title="Editar Mesociclo" className="text-[var(--mist-500)] hover:text-[var(--signal-500)] hover:bg-[var(--signal-500)]/10 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
                                  <Edit3 size={15} />
                                </button>
                                <button onClick={() => setMesoToDelete({ macroId: macro.id, mesoId: meso.id })} aria-label={`Eliminar mesociclo ${meso.name}`} title="Eliminar Mesociclo" className="text-[var(--mist-500)] hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <p className="text-xs font-medium text-[var(--mist-500)] mt-1">{meso.startDate.split('-').reverse().join('/')} → {meso.endDate.split('-').reverse().join('/')}</p>
                            </div>

                            <div className="flex w-full lg:w-auto gap-2">
                              <button onClick={() => { setImportMeso(meso); setInjectError(null); setIsImportModalOpen(true); }} className="flex-1 lg:flex-none text-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                                Pegar Plantilla
                              </button>
                              <button
                                onClick={() => handleViewBlocks(meso.id)}
                                aria-expanded={activeViewMesoId === meso.id}
                                className={`flex-1 lg:flex-none text-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${activeViewMesoId === meso.id ? 'bg-[var(--signal-500)] text-[var(--ink-950)] border-[var(--signal-500)]' : 'bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-100)] hover:bg-[var(--line-800)]'}`}
                              >
                                {activeViewMesoId === meso.id ? "Ocultar Días" : "Ver Calendario"}
                              </button>
                            </div>
                          </div>

                          {activeViewMesoId === meso.id && (
                            <div className="mt-5 p-3 sm:p-4 bg-[var(--ink-950)] rounded-2xl border border-[var(--line-800)] animate-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
                              {isLoadingBlocks ? (
                                <div className="space-y-2 p-2" aria-live="polite" aria-busy="true">
                                  {[0, 1, 2].map(i => <div key={i} className="h-11 bg-[var(--ink-800)] rounded-xl animate-pulse motion-reduce:animate-none" />)}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {getWeeksInRange(meso.startDate, meso.endDate).map((week, idx) => {
                                    const weekKey = `${meso.id}-w${idx}`;
                                    const isExpanded = expandedWeek === weekKey;

                                    return (
                                      <div key={weekKey} className="border border-[var(--line-800)] bg-[var(--ink-900)] rounded-xl overflow-hidden transition-all">
                                        <button onClick={() => setExpandedWeek(isExpanded ? null : weekKey)} aria-expanded={isExpanded} className="w-full flex justify-between items-center p-4 hover:bg-[var(--ink-850)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] focus-visible:ring-inset">
                                          <span className="font-display font-bold text-[var(--mist-100)] text-sm md:text-base">{week.label}</span>
                                          <span className="text-xs font-bold text-[var(--mist-500)] bg-[var(--ink-800)] px-2.5 py-1 rounded-lg">Del {toDayMonth(week.days[0].date)} al {toDayMonth(week.days[6].date)}</span>
                                        </button>

                                        {isExpanded && (
                                          <div className="border-t border-[var(--line-800)] divide-y divide-[var(--line-800)] bg-[var(--ink-950)]">
                                            {week.days.map(day => {
                                              const existingBlock = blocksByMesocycle[meso.id]?.find((b: any) => b.date === day.date);
                                              const isOutside = day.date < meso.startDate || day.date > meso.endDate;

                                              return (
                                                <div key={day.date} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 text-sm transition-colors ${isOutside ? 'bg-[var(--ink-900)]/40 opacity-50' : 'bg-[var(--ink-900)] hover:bg-[var(--ink-850)]'}`}>
                                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 w-full sm:w-auto">
                                                    <span className="font-bold w-full sm:w-28 text-[var(--mist-100)] flex items-center justify-between sm:justify-start gap-2">
                                                      {day.name} <span className="font-medium text-xs text-[var(--mist-500)]">{toDayMonth(day.date)}</span>
                                                    </span>
                                                    {existingBlock ? (
                                                      <span className="text-[var(--signal-500)] font-black truncate bg-[var(--signal-500)]/10 px-2.5 py-0.5 rounded text-xs">{existingBlock.sessionType}</span>
                                                    ) : (
                                                      <span className="text-[var(--mist-500)] italic text-xs font-medium">Descanso / Libre</span>
                                                    )}
                                                  </div>
                                                  {isOutside && !existingBlock ? (
                                                    // Fuera del rango del mesociclo: no se cargan sesiones nuevas
                                                    <button type="button" disabled className="w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-bold border bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-500)] cursor-not-allowed">
                                                      Fuera del ciclo
                                                    </button>
                                                  ) : (
                                                    <button onClick={() => handleOpenBlockModal(meso.id, day.date, day.name, existingBlock)} className={`w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)] ${existingBlock ? 'bg-[var(--ink-800)] border-[var(--line-800)] text-[var(--mist-100)] hover:bg-[var(--line-800)]' : 'bg-[var(--signal-500)]/10 border-[var(--signal-500)]/20 text-[var(--signal-500)] hover:bg-[var(--signal-500)]/20'}`}>
                                                      {existingBlock ? "Editar" : "Cargar Sesión"}
                                                    </button>
                                                  )}
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
            setInjectError(null);
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
        <PasteTemplateModal
          templates={templates}
          monthlyRoutines={monthlyRoutines}
          selectedTemplateId={selectedTemplate}
          onSelectTemplate={(id) => { setSelectedTemplate(id); setDayMapping({}); }}
          dayMapping={dayMapping}
          onDayMappingChange={(mapping) => { setDayMapping(mapping); setInjectError(null); }}
          error={injectError}
          isSubmitting={isSubmitting}
          onSubmit={handleImportSubmit}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {globalImportRoutine && (
        <InjectRoutineModal
          routine={globalImportRoutine}
          mesocycleOptions={allMesosForDropdown}
          targetMesoId={globalTargetMesoId}
          onSelectTargetMeso={(id) => { setGlobalTargetMesoId(id); setDayMapping({}); setInjectError(null); }}
          dayMapping={dayMapping}
          onDayMappingChange={(mapping) => { setDayMapping(mapping); setInjectError(null); }}
          error={injectError}
          isSubmitting={isSubmitting}
          onSubmit={handleGlobalImportSubmit}
          onClose={() => { setGlobalImportRoutine(null); setGlobalTargetMesoId(""); }}
        />
      )}

      {isMacroModalOpen && (
        <MacrocycleFormModal
          isEditing={!!editingMacroId}
          formData={macroFormData}
          onChange={setMacroFormData}
          error={macroFormError}
          isSubmitting={isSubmitting}
          onSubmit={handleMacroSubmit}
          onClose={closeMacroModal}
        />
      )}

      {isMesoModalOpen && (
        <MesocycleFormModal
          isEditing={!!editingMesoId}
          parentMacro={activeMacro}
          formData={mesoFormData}
          onChange={setMesoFormData}
          error={mesoFormError}
          isSubmitting={isSubmitting}
          onSubmit={handleMesoSubmit}
          onClose={closeMesoModal}
        />
      )}

      {/* EDITOR DE BLOQUES DIARIOS */}
      {isBlockModalOpen && activeBlockContext && (
        <DailyBlockEditorModal
          context={activeBlockContext}
          formData={blockFormData}
          setFormData={setBlockFormData}
          isSubmitting={isSubmitting}
          onSubmit={handleBlockSubmit}
          onClose={() => setIsBlockModalOpen(false)}
        />
      )}

      {isEditAthleteModalOpen && (
        <EditAthleteModal
          formData={athleteFormData}
          onChange={setAthleteFormData}
          isSubmitting={isSubmitting}
          onSubmit={handleAthleteEditSubmit}
          onClose={() => setIsEditAthleteModalOpen(false)}
        />
      )}

      {athleteToDelete && (
        <ConfirmDeleteModal
          labelledBy="delete-athlete-title"
          title="¿Eliminar Atleta?"
          message="Se borrará toda su planificación, rutinas y semanas de forma definitiva."
          isSubmitting={isSubmitting}
          onConfirm={confirmDeleteAthlete}
          onClose={() => setAthleteToDelete(false)}
        />
      )}

      {macroToDelete && (
        <ConfirmDeleteModal
          labelledBy="delete-macro-title"
          title="¿Borrar Macrociclo?"
          message="Se perderán todos los mesociclos y días de entrenamiento cargados."
          isSubmitting={isSubmitting}
          onConfirm={confirmDeleteMacro}
          onClose={() => setMacroToDelete(null)}
        />
      )}

      {mesoToDelete && (
        <ConfirmDeleteModal
          labelledBy="delete-meso-title"
          title="¿Eliminar Mesociclo?"
          message="Los días de entrenamiento de este bloque desaparecerán del calendario."
          isSubmitting={isSubmitting}
          onConfirm={confirmDeleteMeso}
          onClose={() => setMesoToDelete(null)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />

    </div>
  );
}