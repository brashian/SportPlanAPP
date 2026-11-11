import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../../../../firebase";
import type { Athlete, DailyBlock, Mesocycle, MonthlyRoutine, RoutineTemplate } from "../../../../types/models";
import type { ToastState } from "../../../shared/Toast";
import type { DayMapping } from "../types";

interface UseRoutineInjectionParams {
  athlete?: Athlete;
  athleteId?: string;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  showToast: (type: ToastState["type"], message: string) => void;
  // Vienen de useBlockCalendar: la inyección actualiza el calendario y lo recarga
  blocksByMesocycle: Record<string, DailyBlock[]>;
  setBlocksByMesocycle: Dispatch<SetStateAction<Record<string, DailyBlock[]>>>;
  handleViewBlocks: (mesocycleId: string, forceRefresh?: boolean) => Promise<void>;
}

// Si dos días de la plantilla apuntan al mismo día de la semana, uno se perdería en silencio
const validateDayMapping = (mapping: DayMapping): string | null => {
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

// Plantillas y rutinas del atleta + inyección en lote al calendario de un mesociclo
export function useRoutineInjection({
  athlete, athleteId, setIsSubmitting, showToast, blocksByMesocycle, setBlocksByMesocycle, handleViewBlocks,
}: UseRoutineInjectionParams) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [monthlyRoutines, setMonthlyRoutines] = useState<MonthlyRoutine[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMeso, setImportMeso] = useState<Mesocycle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [globalImportRoutine, setGlobalImportRoutine] = useState<MonthlyRoutine | null>(null);
  const [globalTargetMesoId, setGlobalTargetMesoId] = useState<string>("");
  const [dayMapping, setDayMapping] = useState<DayMapping>({});
  const [injectError, setInjectError] = useState<string | null>(null);

  useEffect(() => {
    // Descarta respuestas de un atleta anterior si el coach navega rápido entre perfiles
    let cancelled = false;
    async function fetchData() {
      if (!athlete?.coachId) return;
      try {
        const qT = query(collection(db, "routineTemplates"), where("coachId", "==", athlete.coachId));
        // El filtro por coachId lo exigen las reglas de Firestore para poder listar
        const qM = query(collection(db, "monthlyRoutines"), where("athleteId", "==", athleteId), where("coachId", "==", athlete.coachId));
        // Las dos consultas son independientes: van en paralelo
        const [snapT, snapM] = await Promise.all([getDocs(qT), getDocs(qM)]);

        const loadedT: RoutineTemplate[] = [];
        snapT.forEach(doc => loadedT.push({ id: doc.id, ...doc.data() } as RoutineTemplate));

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

  const executeBatchInjection = async (template: RoutineTemplate | MonthlyRoutine, targetMeso: Mesocycle, mapping: DayMapping) => {
    setIsSubmitting(true);
    try {
      const startDate = new Date(targetMeso.startDate + "T12:00:00");
      const endDate = new Date(targetMeso.endDate + "T12:00:00");
      const current = new Date(startDate);
      const newBlocksLocally: DailyBlock[] = [];
      const existingBlocks = blocksByMesocycle[targetMeso.id] || [];

      const blocksToInject: Record<string, DailyBlock> = {};

      while (current <= endDate) {
        const jsDayStr = current.getDay().toString();
        const templateDayNum = Object.keys(mapping).find(key => mapping[Number(key)] === jsDayStr);

        if (templateDayNum) {
          const tDay = template.days.find((d) => d.dayNumber === Number(templateDayNum));
          if (tDay) {
            const dateStr = current.toISOString().split("T")[0];
            const now = new Date().toISOString();
            const existingBlock = existingBlocks.find((b) => b.date === dateStr);

            const blockData: DailyBlock = {
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
            newBlocksLocally.push(blockData);
          }
        }
        current.setDate(current.getDate() + 1);
      }

      const docRef = doc(db, "mesocycleBlocks", targetMeso.id);
      // coachId/athleteId: dueño del documento para las reglas de Firestore
      const owner = athlete ? { coachId: athlete.coachId, athleteId: athlete.id } : {};
      await setDoc(docRef, { ...owner, blocks: blocksToInject }, { merge: true });

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

  // "Pegar Plantilla" sobre un mesociclo
  const openPasteTemplate = (meso: Mesocycle) => {
    setImportMeso(meso);
    setInjectError(null);
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (e: FormEvent) => {
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

  // "Inyectar" una rutina del historial (desde MonthlyRoutineManager)
  const openInjectRoutine = (routine: MonthlyRoutine) => {
    setGlobalImportRoutine(routine);
    setInjectError(null);
    setGlobalTargetMesoId("");
    setDayMapping({});
  };

  const closeInjectRoutine = () => {
    setGlobalImportRoutine(null);
    setGlobalTargetMesoId("");
  };

  const handleGlobalImportSubmit = async (e: FormEvent) => {
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

  // Handlers de los selects de los modales (cambiar la elección resetea el mapeo / el error)
  const selectTemplate = (id: string) => { setSelectedTemplate(id); setDayMapping({}); };
  const selectTargetMeso = (id: string) => { setGlobalTargetMesoId(id); setDayMapping({}); setInjectError(null); };
  const changeDayMapping = (mapping: DayMapping) => { setDayMapping(mapping); setInjectError(null); };

  return {
    templates, monthlyRoutines, setMonthlyRoutines,
    isImportModalOpen, setIsImportModalOpen, importMeso, selectedTemplate, openPasteTemplate, handleImportSubmit,
    globalImportRoutine, globalTargetMesoId, openInjectRoutine, closeInjectRoutine, handleGlobalImportSubmit,
    dayMapping, injectError, selectTemplate, selectTargetMeso, changeDayMapping,
  };
}
