import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { Athlete, Mesocycle, MesocyclePhase, Macrocycle, MonthlyRoutine } from "../../types/models";
import MonthlyRoutineManager from "./MonthlyRoutineManager";
import { ChevronLeft, Plus, Calendar, SearchX } from "lucide-react";
import Toast, { type ToastState } from "../shared/Toast";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal";
import AthleteHeader from "./athlete-detail/AthleteHeader";
import MacrocycleCard from "./athlete-detail/MacrocycleCard";
import MacrocycleFormModal from "./athlete-detail/MacrocycleFormModal";
import MesocycleFormModal from "./athlete-detail/MesocycleFormModal";
import EditAthleteModal from "./athlete-detail/EditAthleteModal";
import PasteTemplateModal from "./athlete-detail/PasteTemplateModal";
import InjectRoutineModal from "./athlete-detail/InjectRoutineModal";
import GlobalLoader from "../ui/GlobalLoader";
import AthleteDetailSkeleton from "./athlete-detail/AthleteDetailSkeleton";
import { lazyWithRetry } from "../../utils/lazyWithRetry";
import { sortMesosByStart } from "./athlete-detail/dateHelpers";
import { usePlanningForms } from "./athlete-detail/hooks/usePlanningForms";
import { useBlockCalendar } from "./athlete-detail/hooks/useBlockCalendar";
import { useRoutineInjection } from "./athlete-detail/hooks/useRoutineInjection";
import type { AthleteFormData } from "./athlete-detail/types";
import RecentFeedbackCard from "./athlete-detail/RecentFeedbackCard";
import { useSessionFeedback } from "../../hooks/useSessionFeedback";

// El editor trae Quill (~240 kB): se descarga recién al abrir "Cargar Sesión" / "Editar"
const DailyBlockEditorModal = lazyWithRetry(() => import("./athlete-detail/DailyBlockEditorModal"));

interface AthleteDetailViewProps {
  athletes: Athlete[];
  // true mientras CoachApp sigue trayendo la lista (ej. se entró directo a /athletes/:id)
  isLoadingAthletes: boolean;
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

export default function AthleteDetailView({
  athletes, isLoadingAthletes, onLoadMacrocycles, onCreateMacrocycle, onUpdateMacrocycle, onDeleteMacrocycle,
  onCreateMesocycle, onUpdateMesocycle, onDeleteMesocycle, onUpdateAthlete, onDeleteAthlete
}: AthleteDetailViewProps) {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const athlete = athletes.find((a) => a.id === athleteId);
  const [isLoadingMacros, setIsLoadingMacros] = useState(true);

  const [isEditAthleteModalOpen, setIsEditAthleteModalOpen] = useState(false);
  const [athleteFormData, setAthleteFormData] = useState<AthleteFormData>({ name: "", sport: "", email: "", phone: "" });

  const [athleteToDelete, setAthleteToDelete] = useState(false);
  const [macroToDelete, setMacroToDelete] = useState<string | null>(null);
  const [mesoToDelete, setMesoToDelete] = useState<{ macroId: string; mesoId: string } | null>(null);
  // Un único "guardando..." compartido por todos los modales de esta vista
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((type: ToastState['type'], message: string) => setToast({ type, message }), []);
  // Referencia estable: si cambiara en cada render, el temporizador del Toast se reiniciaría sin parar
  const dismissToast = useCallback(() => setToast(null), []);

  const forms = usePlanningForms({
    athlete, athleteId, isSubmitting, setIsSubmitting, showToast,
    onCreateMacrocycle, onUpdateMacrocycle, onCreateMesocycle, onUpdateMesocycle,
  });
  const calendar = useBlockCalendar({
    isSubmitting, setIsSubmitting, showToast,
    owner: athlete ? { coachId: athlete.coachId, athleteId: athlete.id } : undefined,
  });
  const injection = useRoutineInjection({
    athlete, athleteId, setIsSubmitting, showToast,
    blocksByMesocycle: calendar.blocksByMesocycle,
    setBlocksByMesocycle: calendar.setBlocksByMesocycle,
    handleViewBlocks: calendar.handleViewBlocks,
  });
  // Feedback que el atleta envía de cada sesión (se marca como visto al abrirlo)
  const { feedbackByDate, markSeen } = useSessionFeedback(athlete ? athleteId : undefined, athlete?.coachId);

  // ── Perfil del atleta ──────────────────────────────────────────────────────

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

  // ── Confirmaciones de borrado ──────────────────────────────────────────────

  const confirmDeleteAthlete = async () => {
    if (!athlete) return;
    setIsSubmitting(true);
    const success = await onDeleteAthlete(athlete.id);
    if (success) navigate("/athletes");
    else showToast('error', 'No se pudo eliminar al atleta.');
    setIsSubmitting(false);
    setAthleteToDelete(false);
  };

  // Con try/catch: si onDeleteMacrocycle rechaza, el spinner no queda girando y se avisa del error
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

  // ── Carga de macrociclos ───────────────────────────────────────────────────

  useEffect(() => {
    // Descarta respuestas de un atleta anterior si el coach navega rápido entre perfiles
    let cancelled = false;
    async function fetchMacrocycles() {
      // Esperamos a que exista el atleta en la lista: si no, onLoadMacrocycles no tendría dónde guardarlos
      if (!athleteId || isLoadingAthletes) return;
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
  }, [athleteId, isLoadingAthletes]);

  // ── Lista de atletas todavía en camino ──────────────────────────────────────
  if (isLoadingAthletes) return <AthleteDetailSkeleton />;

  // ── Estado "atleta no encontrado" ───────────────────────────────────────────
  // La lista ya terminó de cargar: si el id no está, el atleta no existe (o
  // fue borrado) — no está "cargando".
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">

      <AthleteHeader
        fullName={fullName}
        sport={athlete.sport}
        onEdit={handleOpenEditAthlete}
        onDelete={() => setAthleteToDelete(true)}
      />

      <RecentFeedbackCard feedbackByDate={feedbackByDate} onSeen={markSeen} />

      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-[var(--mist-100)] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="text-[var(--signal-500)]" size={24} /> Planificación de Temporada
            </h2>
            <p className="text-sm font-medium text-[var(--mist-500)] mt-1">Estructurá los macrociclos y bloques diarios del atleta.</p>
          </div>
          <button onClick={() => forms.openMacroModal()} className="w-full sm:w-auto bg-[var(--signal-500)] hover:bg-[var(--signal-600)] text-[var(--ink-950)] px-6 py-3.5 rounded-2xl text-sm font-display font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
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
              <MacrocycleCard
                key={macro.id}
                macro={macro}
                blocksByMesocycle={calendar.blocksByMesocycle}
                feedbackByDate={feedbackByDate}
                athleteName={fullName || "Atleta"}
                onPdfError={(message) => showToast('error', message)}
                activeViewMesoId={calendar.activeViewMesoId}
                isLoadingBlocks={calendar.isLoadingBlocks}
                onEdit={() => forms.openMacroModal(macro)}
                onDelete={() => setMacroToDelete(macro.id)}
                onAddMeso={() => forms.openMesoModal(macro.id)}
                onEditMeso={(meso) => forms.openMesoModal(macro.id, meso)}
                onDeleteMeso={(meso) => setMesoToDelete({ macroId: macro.id, mesoId: meso.id })}
                onPasteTemplate={injection.openPasteTemplate}
                onToggleCalendar={(meso) => calendar.handleViewBlocks(meso.id)}
                onOpenDay={(meso, date, dayName, existingBlock) => { calendar.handleOpenBlockModal(meso.id, date, dayName, existingBlock); markSeen(date); }}
              />
            ))}
          </div>
        )}
      </div>

      <MonthlyRoutineManager
        athleteId={athlete.id}
        coachId={athlete.coachId}
        athleteName={fullName || "Atleta"}
        onPdfError={(message) => showToast('error', message)}
        templates={injection.templates}
        monthlyRoutines={injection.monthlyRoutines}
        onInjectRequest={injection.openInjectRoutine}
        onSaveAthleteRoutine={async (routineData) => {
          const newRef = doc(collection(db, "monthlyRoutines"));
          const newRoutine = { ...routineData, id: newRef.id, createdAt: new Date().toISOString() };
          await setDoc(newRef, newRoutine);
          injection.setMonthlyRoutines(prev => [...prev, newRoutine as MonthlyRoutine]);
          return newRoutine as MonthlyRoutine;
        }}
        onUpdateAthleteRoutine={async (routineId, data) => {
          await updateDoc(doc(db, "monthlyRoutines", routineId), data);
          injection.setMonthlyRoutines(prev => prev.map(r => r.id === routineId ? { ...r, ...data } : r));
        }}
        onDeleteAthleteRoutine={async (routineId) => {
          try {
            await deleteDoc(doc(db, "monthlyRoutines", routineId));
            injection.setMonthlyRoutines(prev => prev.filter(r => r.id !== routineId));
            showToast('success', 'Rutina eliminada.');
          } catch (e) {
            console.error(e);
            showToast('error', 'Error al eliminar la rutina.');
          }
        }}
      />

      {/* MODALES */}
      {injection.isImportModalOpen && injection.importMeso && (
        <PasteTemplateModal
          templates={injection.templates}
          monthlyRoutines={injection.monthlyRoutines}
          selectedTemplateId={injection.selectedTemplate}
          onSelectTemplate={injection.selectTemplate}
          dayMapping={injection.dayMapping}
          onDayMappingChange={injection.changeDayMapping}
          error={injection.injectError}
          isSubmitting={isSubmitting}
          onSubmit={injection.handleImportSubmit}
          onClose={() => injection.setIsImportModalOpen(false)}
        />
      )}

      {injection.globalImportRoutine && (
        <InjectRoutineModal
          routine={injection.globalImportRoutine}
          mesocycleOptions={allMesosForDropdown}
          targetMesoId={injection.globalTargetMesoId}
          onSelectTargetMeso={injection.selectTargetMeso}
          dayMapping={injection.dayMapping}
          onDayMappingChange={injection.changeDayMapping}
          error={injection.injectError}
          isSubmitting={isSubmitting}
          onSubmit={injection.handleGlobalImportSubmit}
          onClose={injection.closeInjectRoutine}
        />
      )}

      {forms.isMacroModalOpen && (
        <MacrocycleFormModal
          isEditing={!!forms.editingMacroId}
          formData={forms.macroFormData}
          onChange={forms.setMacroFormData}
          error={forms.macroFormError}
          isSubmitting={isSubmitting}
          onSubmit={forms.handleMacroSubmit}
          onClose={forms.closeMacroModal}
        />
      )}

      {forms.isMesoModalOpen && (
        <MesocycleFormModal
          isEditing={!!forms.editingMesoId}
          parentMacro={forms.activeMacro}
          formData={forms.mesoFormData}
          onChange={forms.setMesoFormData}
          error={forms.mesoFormError}
          isSubmitting={isSubmitting}
          onSubmit={forms.handleMesoSubmit}
          onClose={forms.closeMesoModal}
        />
      )}

      {/* EDITOR DE BLOQUES DIARIOS */}
      {calendar.isBlockModalOpen && calendar.activeBlockContext && (
        <Suspense fallback={<GlobalLoader message="Abriendo editor..." />}>
          <DailyBlockEditorModal
            context={calendar.activeBlockContext}
            formData={calendar.blockFormData}
            setFormData={calendar.setBlockFormData}
            isSubmitting={isSubmitting}
            onSubmit={calendar.handleBlockSubmit}
            onClose={() => calendar.setIsBlockModalOpen(false)}
            feedback={feedbackByDate[calendar.activeBlockContext.date]}
          />
        </Suspense>
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
