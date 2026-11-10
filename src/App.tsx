import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { AuthUser, Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle, UserRole } from "./types/models";
import { db, auth } from "./firebase";
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, arrayUnion, deleteDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import LoginView from './components/log/LoginView';
import { AlertCircle, LogOut, Dumbbell } from 'lucide-react';

const PlanningView = lazy(() => import("./components/coach/PlanningView"));
const CoachLayout = lazy(() => import("./components/coach/CoachLayout"));
const AthleteListView = lazy(() => import("./components/coach/AthleteListView"));
const AthleteDetailView = lazy(() => import("./components/coach/AthleteDetailView"));
const AthleteLayout = lazy(() => import("./components/athlete/AthleteLayout"));
const AthleteView = lazy(() => import("./components/athlete/AthleteView"));
const RoutineLibrary = lazy(() => import("./components/coach/RoutineLibrary"));

// Firebase Auth devuelve los emails en minúsculas; guardamos y buscamos igual
// para que el vínculo coach → atleta no dependa de cómo se tipeó el email.
const normalizeEmail = (email?: string) => (email ?? "").trim().toLowerCase();

// ── Pantallas de carga premium (reemplazan los flashes blancos/grises) ──────
// 'dark' matcheá la estética del lado atleta (fondo navy + glow azul, como
// AthleteView). 'light' matcheá el lado coach (card blanca elevada, como
// AthleteDetailView y DailyRoutineModal).

function LoadingScreen({ message, variant = "dark" }: { message: string; variant?: "dark" | "light" }) {
  if (variant === "dark") {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-5" role="status" aria-live="polite">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/60" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            <Dumbbell className="text-blue-400" size={22} />
          </div>
          <p className="text-slate-300 font-bold tracking-wide text-sm">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-white px-10 py-8 rounded-3xl shadow-xl border border-slate-100" role="status" aria-live="polite">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="text-slate-500 font-bold text-sm">{message}</p>
      </div>
    </div>
  );
}

// Skeleton para la lista de atletas del coach: en vez de un spinner genérico,
// muestra la FORMA del contenido que está por llegar (percepción de carga
// mucho mejor que un spinner suelto sobre fondo vacío).
function AthleteListSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-52 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-14 h-14 rounded-2xl bg-slate-200 mb-4" />
            <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role);
            setIsApproved(data.isApproved ?? true);
          } else {
            setRole('athlete');
            setIsApproved(true);
          }
        } else {
          setUser(null);
          setRole(null);
          setIsApproved(null);
        }
      } catch (error) {
        console.error("Error al cargar el perfil del usuario:", error);
        await signOut(auth).catch(() => {});
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen message="Cargando plataforma..." variant="dark" />;
  if (!user) return <LoginView />;

  if (role === 'coach' && isApproved === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-slate-100 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">Cuenta en Revisión</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">
            Tu registro como Entrenador se completó con éxito, pero tu cuenta requiere la aprobación del Administrador Principal para acceder a la base de datos de atletas. Por favor, aguarda la confirmación.
          </p>
          <button onClick={() => signOut(auth)} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen message="Cargando plataforma..." variant={role === 'athlete' ? 'dark' : 'light'} />}>
      {role === 'coach' ? (
        <CoachApp currentUser={{ id: user.uid, role: 'coach', name: user.email || "Coach", email: user.email ?? undefined }} />
      ) : (
        <AthleteApp currentUser={{ id: user.uid, role: 'athlete', name: user.email || "Atleta", email: user.email ?? undefined }} />
      )}
    </Suspense>
  );
}

function CoachApp({ currentUser }: { currentUser: AuthUser }) {
  const coachId = currentUser.id;
  const coachName = currentUser.name;

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const q = query(collection(db, "athletes"), where("coachId", "==", coachId));
        const querySnapshot = await getDocs(q);
        const fetchedAthletes: Athlete[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedAthletes.push({
            id: doc.id, coachId: data.coachId, name: data.name, firstName: data.firstName || "",
            lastName: data.lastName || "", sport: data.sport, email: data.email || "",
            phone: data.phone || "", macrocycles: data.macrocycles || [],
          } as Athlete);
        });

        // Los macrociclos viven en su propia colección: los traemos para que la
        // lista muestre el contador real. Firestore limita "in" a 30 valores, por
        // eso va en grupos. Si falla (ej. reglas), la lista carga igual.
        try {
          const ids = fetchedAthletes.map((a) => a.id);
          const macrosByAthlete: Record<string, Macrocycle[]> = {};
          for (let i = 0; i < ids.length; i += 30) {
            const macroSnap = await getDocs(query(collection(db, "macrocycles"), where("athleteId", "in", ids.slice(i, i + 30))));
            macroSnap.forEach((macroDoc) => {
              const macro = { id: macroDoc.id, ...macroDoc.data() } as Macrocycle;
              (macrosByAthlete[macro.athleteId] ||= []).push(macro);
            });
          }
          fetchedAthletes.forEach((a) => {
            a.macrocycles = (macrosByAthlete[a.id] || []).sort((x, y) => x.startDate.localeCompare(y.startDate));
          });
        } catch (error) {
          console.error("Error al traer los macrociclos de la lista:", error);
        }

        setAthletes(fetchedAthletes);
      } catch (error) { console.error("Error al traer los atletas:", error); }
      finally { setIsLoading(false); }
    }
    fetchAthletes();
  }, [coachId]);

  async function handleCreateAthlete(data: { name: string; sport: string; email?: string; phone?: string; }) {
    try {
      const newAthleteRef = doc(collection(db, "athletes"));
      const newAthlete: Athlete = {
        id: newAthleteRef.id, coachId: coachId, name: data.name, firstName: "", lastName: "",
        sport: data.sport, email: normalizeEmail(data.email), phone: data.phone || "", macrocycles: [],
      };
      await setDoc(newAthleteRef, newAthlete);
      setAthletes((prev) => [...prev, newAthlete]);
    } catch (error) {
      console.error("Error al guardar el atleta:", error);
      throw error; // deja que quien llame (AthleteListView) decida cómo avisar al usuario
    }
  }

  async function handleUpdateAthlete(athleteId: string, data: { name: string; sport: string; email?: string; phone?: string }) {
    try {
      const payload = { ...data, email: normalizeEmail(data.email) };
      await updateDoc(doc(db, "athletes", athleteId), payload);
      setAthletes((prev) => prev.map((a) => a.id === athleteId ? { ...a, ...payload } : a));
    } catch (error) {
      console.error("Error al actualizar el atleta:", error);
      throw error; // AthleteDetailView ya lo captura y muestra un toast
    }
  }

  // Borra el atleta junto con toda su planificación en una sola operación
  // atómica: o se borra todo, o no se borra nada (sin documentos huérfanos).
  async function handleDeleteAthlete(athleteId: string) {
    try {
      const [macroSnap, routinesSnap] = await Promise.all([
        getDocs(query(collection(db, "macrocycles"), where("athleteId", "==", athleteId))),
        getDocs(query(collection(db, "monthlyRoutines"), where("athleteId", "==", athleteId))),
      ]);

      const batch = writeBatch(db);
      macroSnap.forEach((macroDoc) => {
        const mesos: Mesocycle[] = macroDoc.data().mesocycles || [];
        mesos.forEach((meso) => batch.delete(doc(db, "mesocycleBlocks", meso.id)));
        batch.delete(macroDoc.ref);
      });
      routinesSnap.forEach((routineDoc) => batch.delete(routineDoc.ref));
      batch.delete(doc(db, "athletes", athleteId));
      await batch.commit();

      setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
      return true;
    } catch (error) {
      console.error("Error al eliminar el atleta:", error);
      return false; // AthleteDetailView ya muestra un toast cuando success === false
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
      console.error("Error al crear el macrociclo:", error);
      throw error; // AthleteDetailView.handleMacroSubmit ya tiene try/catch/showToast
    }
  }

  async function handleDeleteMacrocycle(macrocycleId: string, athleteId: string) {
    try {
      // Lee los mesociclos desde Firestore (no del estado local) para no dejar bloques huérfanos
      const macroSnap = await getDoc(doc(db, "macrocycles", macrocycleId));
      const mesos: Mesocycle[] = macroSnap.exists() ? macroSnap.data().mesocycles || [] : [];

      const batch = writeBatch(db);
      mesos.forEach((meso) => batch.delete(doc(db, "mesocycleBlocks", meso.id)));
      batch.delete(doc(db, "macrocycles", macrocycleId));
      await batch.commit();
      setAthletes((prev) => prev.map((a) => a.id !== athleteId ? a : {
        ...a, macrocycles: a.macrocycles.filter((m) => m.id !== macrocycleId)
      }));
    } catch (error) {
      console.error("Error al eliminar el macrociclo:", error);
      throw error; // ver nota en confirmDeleteMacro dentro de AthleteDetailView
    }
  }

  function handleLoadMacrocycles(athleteId: string, fetchedMacros: Macrocycle[]) {
    setAthletes((prev) => prev.map((a) => a.id !== athleteId ? a : { ...a, macrocycles: fetchedMacros }));
  }

  // FIX: antes esta función solo tocaba el estado local y nunca escribía en
  // Firestore — el coach editaba un macrociclo, lo veía "guardado", y al
  // recargar la página el cambio había desaparecido. Ahora persiste de verdad.
  async function handleUpdateMacrocycle(macrocycleId: string, data: { name: string; startDate: string; endDate: string }) {
    try {
      await updateDoc(doc(db, "macrocycles", macrocycleId), data);
      setAthletes((prev) => prev.map((a) => ({
        ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, ...data })),
      })));
    } catch (error) {
      console.error("Error al actualizar el macrociclo:", error);
      throw error;
    }
  }

  async function handleCreateMesocycle(macrocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) {
    try {
      const parentMacro = athletes.flatMap((a) => a.macrocycles || []).find((m) => m.id === macrocycleId);
      const currentOrder = parentMacro?.mesocycles?.length || 0;

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
      console.error("Error al guardar el mesociclo:", error);
      throw error; // AthleteDetailView.handleMesoSubmit ya tiene try/catch/showToast
    }
  }

  async function handleDeleteMesocycle(macrocycleId: string, mesocycleId: string) {
    try {
      const macro = athletes.flatMap(a => a.macrocycles || []).find(m => m.id === macrocycleId);
      if (!macro) return;
      const updatedMesos = macro.mesocycles.filter(m => m.id !== mesocycleId);
      await updateDoc(doc(db, "macrocycles", macrocycleId), { mesocycles: updatedMesos });
      await deleteDoc(doc(db, "mesocycleBlocks", mesocycleId));

      setAthletes((prev) => prev.map((a) => ({
        ...a, macrocycles: a.macrocycles.map((m) => m.id !== macrocycleId ? m : { ...m, mesocycles: updatedMesos })
      })));
    } catch (error) {
      console.error("Error al eliminar el mesociclo:", error);
      throw error; // ver nota en confirmDeleteMeso dentro de AthleteDetailView
    }
  }

  // FIX: mismo problema que handleUpdateMacrocycle — nunca persistía.
  async function handleUpdateMesocycle(mesocycleId: string, data: { name: string; phase: MesocyclePhase; startDate: string; endDate: string }) {
    try {
      const macro = athletes.flatMap((a) => a.macrocycles || []).find((m) => m.mesocycles.some((meso) => meso.id === mesocycleId));
      if (!macro) return;
      const updatedMesos = macro.mesocycles.map((meso) => (meso.id !== mesocycleId ? meso : { ...meso, ...data }));
      await updateDoc(doc(db, "macrocycles", macro.id), { mesocycles: updatedMesos });
      setAthletes((prev) => prev.map((a) => ({
        ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macro.id ? m : { ...m, mesocycles: updatedMesos })),
      })));
    } catch (error) {
      console.error("Error al actualizar el mesociclo:", error);
      throw error;
    }
  }

  // FIX: reordenar (drag & drop) tampoco persistía. Ahora se refleja al
  // instante (optimista, para que el drag se sienta fluido) y revierte solo
  // si Firestore rechaza el guardado.
  async function handleReorderMesocycles(macrocycleId: string, reordered: Mesocycle[]) {
    const previous = athletes.flatMap((a) => a.macrocycles || []).find((m) => m.id === macrocycleId)?.mesocycles;

    setAthletes((prev) => prev.map((a) => ({
      ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, mesocycles: reordered })),
    })));

    try {
      await updateDoc(doc(db, "macrocycles", macrocycleId), { mesocycles: reordered });
    } catch (error) {
      console.error("Error al reordenar los mesociclos:", error);
      if (previous) {
        setAthletes((prev) => prev.map((a) => ({
          ...a, macrocycles: a.macrocycles.map((m) => (m.id !== macrocycleId ? m : { ...m, mesocycles: previous })),
        })));
      }
      throw error;
    }
  }

  if (isLoading) return <AthleteListSkeleton />;

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
              onDeleteMacrocycle={handleDeleteMacrocycle}
              onCreateMesocycle={handleCreateMesocycle}
              onUpdateMesocycle={handleUpdateMesocycle}
              onDeleteMesocycle={handleDeleteMesocycle}
              onReorderMesocycles={handleReorderMesocycles}
              onUpdateAthlete={handleUpdateAthlete}
              onDeleteAthlete={handleDeleteAthlete}
            />
          }
        />
        <Route path="library" element={<RoutineLibrary coachId={coachId} />} />
        <Route path="planificacion" element={<PlanningView />} />
        <Route path="*" element={<Navigate to="/athletes" replace />} />
      </Route>
    </Routes>
  );
}

function AthleteApp({ currentUser }: { currentUser: AuthUser }) {
  const athleteEmail = currentUser.email;
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [blocksByMesocycle, setBlocksByMesocycle] = useState<Record<string, DailyBlock[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAthleteData() {
      if (!athleteEmail) { setIsLoading(false); return; }
      try {
        const q = query(collection(db, "athletes"), where("email", "==", normalizeEmail(athleteEmail)));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { setAthlete(null); setIsLoading(false); return; }
        // Si hay duplicados (registro viejo + alta del coach), gana el vinculado a un coach
        const athleteDoc = snapshot.docs.find((d) => d.data().coachId) ?? snapshot.docs[0];
        const athleteData = { id: athleteDoc.id, ...athleteDoc.data() } as Athlete;

        const macroQuery = query(collection(db, "macrocycles"), where("athleteId", "==", athleteData.id));
        const macroSnap = await getDocs(macroQuery);
        const macros: Macrocycle[] = [];
        macroSnap.forEach(doc => { macros.push({ id: doc.id, ...doc.data() } as Macrocycle); });
        macros.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        athleteData.macrocycles = macros;
        setAthlete(athleteData);

        const blocksObj: Record<string, DailyBlock[]> = {};
        const fetchPromises = [];
        for (const macro of macros) {
          for (const meso of macro.mesocycles || []) {
            const fetchTask = async () => {
              const docRef = doc(db, "mesocycleBlocks", meso.id);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists() && docSnap.data().blocks) {
                blocksObj[meso.id] = Object.values(docSnap.data().blocks);
              } else {
                blocksObj[meso.id] = [];
              }
            };
            fetchPromises.push(fetchTask());
          }
        }
        await Promise.all(fetchPromises);
        setBlocksByMesocycle(blocksObj);
      } catch (error) { console.error(error); }
      finally { setIsLoading(false); }
    }
    fetchAthleteData();
  }, [athleteEmail]);

  if (isLoading) return <LoadingScreen message="Buscando tu planificación..." variant="dark" />;

  if (!athlete) {
    return (
      <div className="p-8 text-center text-gray-700 bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-2">¡Hola!</h2>
          <p className="text-slate-500 mb-6">Iniciaste sesión como: <br /><strong className="text-blue-600">{athleteEmail}</strong></p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl mb-8">
            <p className="font-medium text-sm">Tu entrenador aún no ha vinculado tu cuenta a tu perfil de atleta. Pedile que te agregue usando este correo.</p>
          </div>
          <button onClick={() => signOut(auth)} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const fullName = athlete.firstName ? `${athlete.firstName} ${athlete.lastName}` : (athlete.name || "Atleta");

  return (
    <AthleteLayout athleteName={fullName}>
      <AthleteView athlete={athlete} blocksByMesocycle={blocksByMesocycle} />
    </AthleteLayout>
  );
}