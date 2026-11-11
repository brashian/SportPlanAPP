import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import type { SessionFeedback } from "../types/models";

export type FeedbackDraft = Omit<SessionFeedback, "id" | "seenByCoach" | "createdAt" | "updatedAt">;

// "sent": confirmado por Firestore. "queued": sin conexión, se sube solo cuando vuelva la señal.
export type SaveFeedbackResult = "sent" | "queued";

// Feedback de sesiones de un atleta, indexado por fecha. Lo usan el atleta
// (para enviar/editar) y el coach (para leerlo y marcarlo como visto).
// coachId: pasarlo desde el lado coach; las reglas de Firestore exigen ese filtro para listar.
export function useSessionFeedback(athleteId?: string, coachId?: string) {
  const [feedbackByDate, setFeedbackByDate] = useState<Record<string, SessionFeedback>>({});
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  useEffect(() => {
    // Descarta la respuesta de un atleta anterior si se navega rápido entre perfiles
    let cancelled = false;
    async function load() {
      if (!athleteId) return;
      setIsLoadingFeedback(true);
      try {
        const filters = [where("athleteId", "==", athleteId)];
        if (coachId) filters.push(where("coachId", "==", coachId));
        const snap = await getDocs(query(collection(db, "sessionFeedback"), ...filters));
        const byDate: Record<string, SessionFeedback> = {};
        snap.forEach((d) => {
          const fb = d.data() as SessionFeedback;
          byDate[fb.date] = fb;
        });
        if (!cancelled) setFeedbackByDate(byDate);
      } catch (error) {
        if (!cancelled) console.error("Error al traer el feedback del atleta:", error);
      } finally {
        if (!cancelled) setIsLoadingFeedback(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [athleteId, coachId]);

  const saveFeedback = useCallback(async (draft: FeedbackDraft): Promise<SaveFeedbackResult> => {
    const id = `${draft.athleteId}_${draft.date}`;
    const now = new Date().toISOString();
    const feedback: SessionFeedback = {
      ...draft,
      id,
      seenByCoach: false, // cada envío o edición vuelve a avisarle al coach
      createdAt: feedbackByDate[draft.date]?.createdAt ?? now,
      updatedAt: now,
    };

    const write = setDoc(doc(db, "sessionFeedback", id), feedback);
    // Sin conexión, Firestore guarda el cambio en el dispositivo pero la promesa
    // recién se resuelve cuando vuelve la señal: no hacemos esperar al atleta.
    if (!navigator.onLine) {
      write.catch((error) => console.error("Error al sincronizar el feedback:", error));
      setFeedbackByDate((prev) => ({ ...prev, [draft.date]: feedback }));
      return "queued";
    }
    await write;
    setFeedbackByDate((prev) => ({ ...prev, [draft.date]: feedback }));
    return "sent";
  }, [feedbackByDate]);

  const markSeen = useCallback(async (date: string) => {
    const fb = feedbackByDate[date];
    if (!fb || fb.seenByCoach) return;
    setFeedbackByDate((prev) => ({ ...prev, [date]: { ...fb, seenByCoach: true } }));
    try {
      await updateDoc(doc(db, "sessionFeedback", fb.id), { seenByCoach: true });
    } catch (error) {
      console.error("Error al marcar el feedback como visto:", error);
    }
  }, [feedbackByDate]);

  return { feedbackByDate, isLoadingFeedback, saveFeedback, markSeen };
}
