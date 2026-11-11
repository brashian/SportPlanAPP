import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Athlete, Macrocycle, Mesocycle, MesocyclePhase } from "../../../../types/models";
import type { ToastState } from "../../../shared/Toast";
import type { MacroFormData, MesoFormData } from "../types";

interface UsePlanningFormsParams {
  athlete?: Athlete;
  athleteId?: string;
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  showToast: (type: ToastState["type"], message: string) => void;
  onCreateMacrocycle: (athleteId: string, data: { name: string; startDate: string; endDate: string }) => void;
  onUpdateMacrocycle: (macrocycleId: string, data: { name: string; startDate: string; endDate: string }) => Promise<void>;
  onCreateMesocycle: (macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => void;
  onUpdateMesocycle: (mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) => Promise<void>;
}

const EMPTY_MACRO: MacroFormData = { name: "", startDate: "", endDate: "" };
const EMPTY_MESO: MesoFormData = { name: "", phase: "Preparación General", startDate: "", endDate: "" };

// Modales de crear / editar macrociclo y mesociclo, con validación de fechas
export function usePlanningForms({
  athlete, athleteId, isSubmitting, setIsSubmitting, showToast,
  onCreateMacrocycle, onUpdateMacrocycle, onCreateMesocycle, onUpdateMesocycle,
}: UsePlanningFormsParams) {
  // ── Macrociclo ─────────────────────────────────────────────────────────────
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [macroFormData, setMacroFormData] = useState<MacroFormData>(EMPTY_MACRO);
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [macroFormError, setMacroFormError] = useState<string | null>(null);

  const openMacroModal = (macro?: Macrocycle) => {
    setMacroFormError(null);
    setEditingMacroId(macro?.id ?? null);
    setMacroFormData(macro ? { name: macro.name, startDate: macro.startDate, endDate: macro.endDate } : EMPTY_MACRO);
    setIsMacroModalOpen(true);
  };

  const closeMacroModal = () => {
    setIsMacroModalOpen(false);
    setEditingMacroId(null);
    setMacroFormError(null);
  };

  const handleMacroSubmit = async (e: FormEvent) => {
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
      setMacroFormData(EMPTY_MACRO);
      closeMacroModal();
    } catch (e) {
      setMacroFormError(editingMacroId ? "No se pudo actualizar el macrociclo." : "No se pudo crear el macrociclo.");
    } finally { setIsSubmitting(false); }
  };

  // ── Mesociclo ──────────────────────────────────────────────────────────────
  const [isMesoModalOpen, setIsMesoModalOpen] = useState(false);
  const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
  const [mesoFormData, setMesoFormData] = useState<MesoFormData>(EMPTY_MESO);
  const [editingMesoId, setEditingMesoId] = useState<string | null>(null);
  const [mesoFormError, setMesoFormError] = useState<string | null>(null);

  const openMesoModal = (macroId: string, meso?: Mesocycle) => {
    setMesoFormError(null);
    setActiveMacroId(macroId);
    setEditingMesoId(meso?.id ?? null);
    setMesoFormData(meso
      ? { name: meso.name, phase: meso.phase, startDate: meso.startDate, endDate: meso.endDate }
      : EMPTY_MESO);
    setIsMesoModalOpen(true);
  };

  const closeMesoModal = () => {
    setIsMesoModalOpen(false);
    setActiveMacroId(null);
    setEditingMesoId(null);
    setMesoFormError(null);
  };

  const handleMesoSubmit = async (e: FormEvent) => {
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
      setMesoFormData(EMPTY_MESO);
      closeMesoModal();
    } catch (e) {
      setMesoFormError(editingMesoId ? "No se pudo actualizar el mesociclo." : "No se pudo crear el mesociclo.");
    } finally { setIsSubmitting(false); }
  };

  // Macrociclo padre del modal de mesociclo abierto (limita las fechas de los inputs)
  const activeMacro = athlete?.macrocycles?.find((m) => m.id === activeMacroId);

  return {
    isMacroModalOpen, macroFormData, setMacroFormData, editingMacroId, macroFormError,
    openMacroModal, closeMacroModal, handleMacroSubmit,
    isMesoModalOpen, mesoFormData, setMesoFormData, editingMesoId, mesoFormError, activeMacro,
    openMesoModal, closeMesoModal, handleMesoSubmit,
  };
}
