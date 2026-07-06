import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { AuthUser, Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle } from "./types/models";
import CoachLayout from "./components/coach/CoachLayout";
import AthleteListView from "./components/coach/AthleteListView";
import AthleteDetailView from "./components/coach/AthleteDetailView";
import AthleteLayout from "./components/athlete/AthleteLayout";
import AthleteView from "./components/athlete/AthleteView";

// Base FireStore
import { db, auth } from "./firebase"; 
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, arrayUnion, deleteDoc, addDoc } from "firebase/firestore";

// LogIn
import { onAuthStateChanged, signOut } from 'firebase/auth';
import LoginView from './components/log/LoginView'; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          setRole('athlete'); 
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando aplicación...</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  if (role === 'coach') {
    // Le pasamos el email también al Coach
    return <CoachApp currentUser={{ id: user.uid, role: 'coach', name: user.email || "Coach", email: user.email }} />;
  }

  // Le pasamos el email al Atleta
  return <AthleteApp currentUser={{ id: user.uid, role: 'athlete', name: user.email || "Atleta", email: user.email }} />;
}

// ============================================================================
// Rama Coach (No cambió, funciona perfecto)
// ============================================================================
function CoachApp({ currentUser }: { currentUser: any }) {
  const coachId = currentUser.id;
  const coachName = currentUser.name;

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blocksByMesocycle, setBlocksByMesocycle] = useState<Record<string, DailyBlock[]>>({});

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const q = query(collection(db, "athletes"), where("coachId", "==", coachId));
        const querySnapshot = await getDocs(q);
        
        const fetchedAthletes: Athlete[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedAthletes.push({
            id: doc.id,
            coachId: data.coachId,
            name: data.name,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            sport: data.sport,
            email: data.email || "",
            phone: data.phone || "",
            macrocycles: data.macrocycles || [], 
          } as Athlete);
        });
        setAthletes(fetchedAthletes);
      } catch (error) {
        console.error("Error al traer los atletas:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAthletes();
  }, [coachId]);
  
  async function handleCreateAthlete(data: { name: string; sport: string; email?: string; phone?: string; }) {
    try {
      const newAthleteRef = doc(collection(db, "athletes"));
      const newAthlete: Athlete = {
        id: newAthleteRef.id, coachId: coachId, name: data.name, firstName: "", lastName: "",  
        sport: data.sport, email: data.email || "", phone: data.phone || "", macrocycles: [], 
      };
      await setDoc(newAthleteRef, newAthlete);
      setAthletes((prev) => [...prev, newAthlete]);
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      alert("Hubo un error al guardar el atleta.");
    }
  }

  async function handleCreateMacrocycle(athleteId: string, data: { name: string; startDate: string; endDate: string }) {
    try {
      const newMacroRef = doc(collection(db, "macrocycles"));
      const newMacro: Macrocycle = {
        id: newMacroRef.id, athleteId, name: data.name, startDate: data.startDate,
        endDate: data.endDate, createdAt: new Date().toISOString(), mesocycles: [],
      };
      await setDoc(newMacroRef, newMacro);
      setAthletes((prev) => prev.map((a) => a.id !== athleteId ? a : { ...a, macrocycles: [...(a.macrocycles || []), newMacro] }));
    } catch (error) {
      console.error("Error al guardar macrociclo:", error);
      alert("Error al crear el macrociclo.");
    }
  }

  function handleLoadMacrocycles(athleteId: string, fetchedMacros: Macrocycle[]) {
    setAthletes((prev) => prev.map((a) => a.id !== athleteId ? a : { ...a, macrocycles: fetchedMacros }));
  }

  function handleUpdateMacrocycle(macrocycleId: string, data: { name: string; startDate: string; endDate: string }) {
    setAthletes((prev) => prev.map((a) => ({
      ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, ...data })),
    })));
  }

  async function handleCreateMesocycle(macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) {
    try {
      let currentOrder = 0;
      athletes.forEach((a) => {
        const macro = a.macrocycles?.find((m) => m.id === macrocycleId);
        if (macro) { currentOrder = macro.mesocycles?.length || 0; }
      });
      const newMesocycle: Mesocycle = {
        id: `meso-${Date.now()}`, macrocycleId, name: data.name, phase: data.phase,
        startDate: data.startDate, endDate: data.endDate, order: currentOrder,
      };
      const macroRef = doc(db, "macrocycles", macrocycleId);
      await updateDoc(macroRef, { mesocycles: arrayUnion(newMesocycle) });
      setAthletes((prev) => prev.map((a) => ({
        ...a, macrocycles: a.macrocycles.map((m) =>
          m.id !== macrocycleId ? m : { ...m, mesocycles: [...(m.mesocycles || []), newMesocycle] }
        ),
      })));
    } catch (error) {
      console.error("Error al crear mesociclo:", error);
      alert("Hubo un error al guardar el mesociclo.");
    }
  }

  function handleUpdateMesocycle(mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) {
    setAthletes((prev) => prev.map((a) => ({
      ...a, macrocycles: a.macrocycles.map((m) => ({
        ...m, mesocycles: m.mesocycles.map((meso) => meso.id !== mesocycleId ? meso : { ...meso, ...data }),
      })),
    })));
  }

  function handleReorderMesocycles(macrocycleId: string, reordered: Mesocycle[]) {
    setAthletes((prev) => prev.map((a) => ({
      ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, mesocycles: reordered })),
    })));
  }

  function handleLoadBlocks(mesocycleId: string, fetchedBlocks: DailyBlock[]) {
    setBlocksByMesocycle((prev) => ({ ...prev, [mesocycleId]: fetchedBlocks }));
  }

  async function handleSaveBlock(mesocycleId: string, blockData: any, existingBlockId?: string) {
    try {
      const now = new Date().toISOString();
      if (existingBlockId) {
        const blockRef = doc(db, "dailyBlocks", existingBlockId);
        await updateDoc(blockRef, { ...blockData, updatedAt: now });
        setBlocksByMesocycle((prev) => {
          const current = prev[mesocycleId] ?? [];
          return { ...prev, [mesocycleId]: current.map((b) => b.id !== existingBlockId ? b : { ...b, ...blockData, updatedAt: now }) };
        });
      } else {
        const newBlockRef = doc(collection(db, "dailyBlocks"));
        const newBlock = { ...blockData, id: newBlockRef.id, mesocycleId, createdAt: now, updatedAt: now };
        await setDoc(newBlockRef, newBlock);
        setBlocksByMesocycle((prev) => {
          const current = prev[mesocycleId] ?? [];
          return { ...prev, [mesocycleId]: [...current, newBlock] };
        });
      }
    } catch (error) {
      console.error("Error guardando el bloque:", error);
      alert("Hubo un error al guardar el entrenamiento.");
    }
  }

  async function handleDeleteBlock(mesocycleId: string, blockId: string) {
    try {
      await deleteDoc(doc(db, "dailyBlocks", blockId));
      setBlocksByMesocycle((prev) => ({
        ...prev, [mesocycleId]: (prev[mesocycleId] ?? []).filter((b) => b.id !== blockId),
      }));
    } catch (error) {
      console.error("Error borrando el bloque:", error);
      alert("Hubo un error al intentar eliminar el entrenamiento.");
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Cargando tus atletas desde la nube...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<CoachLayout coachName={coachName} />}>
        <Route index element={<Navigate to="/athletes" replace />} />
        <Route path="athletes" element={<AthleteListView athletes={athletes} onCreateAthlete={handleCreateAthlete} />} />
        <Route
          path="athletes/:athleteId"
          element={
            <AthleteDetailView
              athletes={athletes}
              onLoadMacrocycles={handleLoadMacrocycles}
              onCreateMacrocycle={handleCreateMacrocycle}
              onUpdateMacrocycle={handleUpdateMacrocycle}
              onCreateMesocycle={handleCreateMesocycle}
              onUpdateMesocycle={handleUpdateMesocycle}
              onReorderMesocycles={handleReorderMesocycles}
              blocksByMesocycle={blocksByMesocycle}
              onLoadBlocks={handleLoadBlocks}
              onSaveBlock={handleSaveBlock}
              onDeleteBlock={handleDeleteBlock}
            />
          }
        />
        <Route path="club" element={<div className="text-sm text-gray-500">Módulo "Planificación del Club"</div>} />
        <Route path="*" element={<Navigate to="/athletes" replace />} />
      </Route>
    </Routes>
  );
}

// ============================================================================
// Rama Atleta (AHORA CONECTADA A FIREBASE REAL)
// ============================================================================
function AthleteApp({ currentUser }: { currentUser: any }) {
  const athleteEmail = currentUser.email; // Tomamos el email con el que inició sesión

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [blocksByMesocycle, setBlocksByMesocycle] = useState<Record<string, DailyBlock[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAthleteData() {
      if (!athleteEmail) return;
      try {
        // 1. Buscamos al atleta en la base de datos usando su Email
        const q = query(collection(db, "athletes"), where("email", "==", athleteEmail));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setAthlete(null); // No hay atleta con ese email vinculado
          setIsLoading(false);
          return;
        }

        // 2. Tomamos los datos del atleta encontrado
        const athleteDoc = snapshot.docs[0];
        const athleteData = { id: athleteDoc.id, ...athleteDoc.data() } as Athlete;
        
        // 3. Traemos sus macrociclos
        const macroQuery = query(collection(db, "macrocycles"), where("athleteId", "==", athleteData.id));
        const macroSnap = await getDocs(macroQuery);
        const macros: Macrocycle[] = [];
        
        macroSnap.forEach(doc => {
          macros.push({ id: doc.id, ...doc.data() } as Macrocycle);
        });
        
        // Ordenamos los macrociclos por fecha
        macros.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        athleteData.macrocycles = macros;
        setAthlete(athleteData);

        // 4. Traemos todas sus rutinas (dailyBlocks) para que las pueda ver
        const blocksObj: Record<string, DailyBlock[]> = {};
        for (const macro of macros) {
          for (const meso of macro.mesocycles || []) {
            const blocksQ = query(collection(db, "dailyBlocks"), where("mesocycleId", "==", meso.id));
            const blocksSnap = await getDocs(blocksQ);
            const blocks: DailyBlock[] = [];
            blocksSnap.forEach(b => blocks.push({ id: b.id, ...b.data() } as DailyBlock));
            blocksObj[meso.id] = blocks;
          }
        }
        setBlocksByMesocycle(blocksObj);

      } catch (error) {
        console.error("Error al cargar los datos del atleta:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAthleteData();
  }, [athleteEmail]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">Buscando tu planificación en la nube...</div>;
  }

  // Pantalla que se muestra si el entrenador no lo agregó o escribió mal el email
  if (!athlete) {
    return (
      <div className="p-8 text-center text-gray-700 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">¡Hola!</h2>
        <p className="text-gray-600 mb-2">Iniciaste sesión correctamente como: <strong>{athleteEmail}</strong></p>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg max-w-md mt-4">
          <p>Tu entrenador aún no ha vinculado tu cuenta.</p>
          <p className="text-sm mt-2">Pídele que vaya a su panel de control y te agregue como atleta usando exactamente este mismo correo electrónico.</p>
        </div>
        <button 
          onClick={() => signOut(auth)} 
          className="mt-8 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold text-gray-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  const fullName = athlete.firstName ? `${athlete.firstName} ${athlete.lastName}` : athlete.name;

  return (
    <AthleteLayout athleteName={fullName}>
      <AthleteView athlete={athlete} blocksByMesocycle={blocksByMesocycle} />
    </AthleteLayout>
  );
}