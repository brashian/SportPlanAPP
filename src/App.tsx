import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { AuthUser, Athlete, DailyBlock, Mesocycle, MesocyclePhase } from "./types/models";
import CoachLayout from "./components/coach/CoachLayout";
import AthleteListView from "./components/coach/AthleteListView";
import AthleteDetailView from "./components/coach/AthleteDetailView";
import AthleteLayout from "./components/athlete/AthleteLayout";
import AthleteView from "./components/athlete/AthleteView";
import { seedAthletes, seedBlocksByMesocycle } from "./mockData";

/**
 * App
 * ----------------------------------------------------------------------------
 * Punto de entrada de la SPA. Aplica RBAC: según currentUser.role, se monta
 * un árbol de rutas completamente distinto (Coach vs Athlete).
 *
 * IMPORTANTE (seguridad): el filtrado por athleteId/coachId acá es solo de
 * PRESENTACIÓN, hecho en memoria para poder previsualizar sin backend. En
 * producción, cada request al servidor debe validar server-side que:
 *   - role === "athlete"  -> solo puede leer datos donde athleteId === user.id
 *   - role === "coach"    -> solo puede leer/escribir atletas donde coachId === user.id
 */
export default function App({ currentUser }: { currentUser: AuthUser }) {
  if (currentUser.role === "coach") {
    return <CoachApp coachId={currentUser.id} coachName={currentUser.name} />;
  }
  return <AthleteApp athleteId={currentUser.id} athleteName={currentUser.name} />;
}

// ============================================================================
// Rama Coach — mantiene el estado de TODOS sus atletas y expone el CRUD
// ============================================================================
function CoachApp({ coachId, coachName }: { coachId: string; coachName: string }) {
  // En producción esto viene de tu API (ej: react-query), filtrado por coachId
  // en el backend. Acá se simula con useState + datos semilla en memoria.
  const [athletes, setAthletes] = useState<Athlete[]>(() =>
    seedAthletes.filter((a) => a.coachId === coachId)
  );
  const [blocksByMesocycle, setBlocksByMesocycle] =
    useState<Record<string, DailyBlock[]>>(seedBlocksByMesocycle);

  // -- Macrociclos ------------------------------------------------------------
  function handleCreateMacrocycle(
    athleteId: string,
    data: { name: string; startDate: string; endDate: string }
  ) {
    setAthletes((prev) =>
      prev.map((a) =>
        a.id !== athleteId
          ? a
          : {
              ...a,
              macrocycles: [
                ...a.macrocycles,
                {
                  id: crypto.randomUUID(),
                  athleteId,
                  name: data.name,
                  startDate: data.startDate,
                  endDate: data.endDate,
                  createdAt: new Date().toISOString(),
                  mesocycles: [],
                },
              ],
            }
      )
    );
  }

  function handleUpdateMacrocycle(
    macrocycleId: string,
    data: { name: string; startDate: string; endDate: string }
  ) {
    setAthletes((prev) =>
      prev.map((a) => ({
        ...a,
        macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, ...data })),
      }))
    );
  }

  // -- Mesociclos ---------------------------------------------------------------
  function handleCreateMesocycle(
    macrocycleId: string,
    data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }
  ) {
    setAthletes((prev) =>
      prev.map((a) => ({
        ...a,
        macrocycles: a.macrocycles.map((m) =>
          m.id !== macrocycleId
            ? m
            : {
                ...m,
                mesocycles: [
                  ...m.mesocycles,
                  {
                    id: crypto.randomUUID(),
                    macrocycleId,
                    name: data.name,
                    phase: data.phase,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    order: m.mesocycles.length,
                  },
                ],
              }
        ),
      }))
    );
  }

  function handleUpdateMesocycle(
    mesocycleId: string,
    data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }
  ) {
    setAthletes((prev) =>
      prev.map((a) => ({
        ...a,
        macrocycles: a.macrocycles.map((m) => ({
          ...m,
          mesocycles: m.mesocycles.map((meso) =>
            meso.id !== mesocycleId ? meso : { ...meso, ...data }
          ),
        })),
      }))
    );
  }

  function handleReorderMesocycles(macrocycleId: string, reordered: Mesocycle[]) {
    setAthletes((prev) =>
      prev.map((a) => ({
        ...a,
        macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, mesocycles: reordered })),
      }))
    );
  }

  // -- Bloques diarios (crear / actualizar / borrar) -----------------------------
  function handleSaveBlock(
    mesocycleId: string,
    block: Omit<DailyBlock, "id" | "createdAt" | "updatedAt">,
    existingBlockId?: string
  ) {
    setBlocksByMesocycle((prev) => {
      const current = prev[mesocycleId] ?? [];
      const now = new Date().toISOString();

      if (existingBlockId) {
        // UPDATE
        return {
          ...prev,
          [mesocycleId]: current.map((b) =>
            b.id !== existingBlockId ? b : { ...b, ...block, updatedAt: now }
          ),
        };
      }

      // CREATE
      const newBlock: DailyBlock = {
        ...block,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      return { ...prev, [mesocycleId]: [...current, newBlock] };
    });
  }

  function handleDeleteBlock(mesocycleId: string, blockId: string) {
    setBlocksByMesocycle((prev) => ({
      ...prev,
      [mesocycleId]: (prev[mesocycleId] ?? []).filter((b) => b.id !== blockId),
    }));
  }

  return (
    <Routes>
      <Route path="/" element={<CoachLayout coachName={coachName} />}>
        <Route index element={<Navigate to="/athletes" replace />} />
        <Route path="athletes" element={<AthleteListView athletes={athletes} />} />
        <Route
          path="athletes/:athleteId"
          element={
            <AthleteDetailView
              athletes={athletes}
              onCreateMacrocycle={handleCreateMacrocycle}
              onUpdateMacrocycle={handleUpdateMacrocycle}
              onCreateMesocycle={handleCreateMesocycle}
              onUpdateMesocycle={handleUpdateMesocycle}
              onReorderMesocycles={handleReorderMesocycles}
              blocksByMesocycle={blocksByMesocycle}
              onSaveBlock={handleSaveBlock}
              onDeleteBlock={handleDeleteBlock}
            />
          }
        />
        <Route
          path="club"
          element={
            <div className="text-sm text-gray-500">
              {/* Módulo independiente: ClubPlanningView (selección de Deporte / Categoría
                  + calendario semanal por equipo) — fuera del alcance de esta entrega. */}
              Módulo "Planificación del Club" — selección de Deporte / Categoría + calendario
              semanal.
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/athletes" replace />} />
      </Route>
    </Routes>
  );
}

// ============================================================================
// Rama Atleta
// ============================================================================
function AthleteApp({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const athlete = seedAthletes.find((a) => a.id === athleteId);
  const blocksByMesocycle = seedBlocksByMesocycle;

  if (!athlete) {
    return <div className="p-8 text-center text-gray-400">No se encontró tu perfil.</div>;
  }

  return (
    <AthleteLayout athleteName={athleteName}>
      <AthleteView athlete={athlete} blocksByMesocycle={blocksByMesocycle} />
    </AthleteLayout>
  );
}
