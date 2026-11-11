import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import type { DailyBlock } from "../../../../types/models";
import type { ToastState } from "../../../shared/Toast";
import type { BlockContext, BlockFormData } from "../types";

interface UseBlockCalendarParams {
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  showToast: (type: ToastState["type"], message: string) => void;
}

const EMPTY_BLOCK: BlockFormData = { sessionType: "", intensity: 5, volume: "Medio", durationMinutes: 60, notesHtml: "", exercises: [] };

// Calendario de sesiones por mesociclo: carga de bloques y editor del día
export function useBlockCalendar({ isSubmitting, setIsSubmitting, showToast }: UseBlockCalendarParams) {
  const [blocksByMesocycle, setBlocksByMesocycle] = useState<Record<string, DailyBlock[]>>({});
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

      const finalBlock: DailyBlock = {
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
        return { ...prev, [mesocycleId]: [...updatedBlocks, finalBlock] };
      });
      showToast('success', 'Entrenamiento guardado.');
    } catch (error) {
      showToast('error', 'Hubo un error al guardar el entrenamiento.');
      throw error;
    }
  };

  // ── Editor de la sesión del día ────────────────────────────────────────────
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [activeBlockContext, setActiveBlockContext] = useState<BlockContext | null>(null);
  const [blockFormData, setBlockFormData] = useState<BlockFormData>(EMPTY_BLOCK);

  const handleOpenBlockModal = (mesoId: string, date: string, dayName: string, existingBlock?: DailyBlock) => {
    setActiveBlockContext({ mesoId, date, name: dayName, existingId: existingBlock?.id });
    if (existingBlock) {
      setBlockFormData({
        sessionType: existingBlock.sessionType, intensity: existingBlock.intensity, volume: existingBlock.volume,
        durationMinutes: existingBlock.durationMinutes, notesHtml: existingBlock.notesHtml,
        exercises: existingBlock.exercises ? existingBlock.exercises.map((ex) => ({ ...ex, sets: ex.sets || "", groupId: ex.groupId || "", videoUrl: ex.videoUrl || "" })) : []
      });
    } else {
      setBlockFormData(EMPTY_BLOCK);
    }
    setIsBlockModalOpen(true);
  };

  const handleBlockSubmit = async (e: FormEvent) => {
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

  return {
    blocksByMesocycle, setBlocksByMesocycle, activeViewMesoId, isLoadingBlocks, handleViewBlocks,
    isBlockModalOpen, setIsBlockModalOpen, activeBlockContext, blockFormData, setBlockFormData,
    handleOpenBlockModal, handleBlockSubmit,
  };
}
