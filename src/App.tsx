import { useState, useEffect, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { AuthUser, Athlete, DailyBlock, Mesocycle, MesocyclePhase, Macrocycle, UserRole } from "./types/models";
import { db, auth } from "./firebase";
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, arrayUnion, deleteDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import LoginView from './components/log/LoginView';
import { AlertCircle, LogOut } from 'lucide-react';
import GlobalLoader from './components/ui/GlobalLoader';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

const PlanningView = lazyWithRetry(() => import("./components/coach/PlanningView"));
const CoachLayout = lazyWithRetry(() => import("./components/coach/CoachLayout"));
const AthleteListView = lazyWithRetry(() => import("./components/coach/AthleteListView"));
const AthleteDetailView = lazyWithRetry(() => import("./components/coach/AthleteDetailView"));
const AthleteLayout = lazyWithRetry(() => import("./components/athlete/AthleteLayout"));
const AthleteView = lazyWithRetry(() => import("./components/athlete/AthleteView"));
const RoutineLibrary = lazyWithRetry(() => import("./components/coach/RoutineLibrary"));

// Firebase Auth devuelve los emails en minúsculas; guardamos y buscamos igual
// para que el vínculo coach → atleta no dependa de cómo se tipeó el email.
const normalizeEmail = (email?: string) => (email ?? "").trim().toLowerCase();

// Lunes de la semana actual en formato YYYY-MM-DD (hora local), igual que "Tu Semana"
function mondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Trae los bloques diarios de varios mesociclos en paralelo
async function fetchBlocksFor(mesos: Mesocycle[]) {
  const result: Record<string, DailyBlock[]> = {};
  await Promise.all(mesos.map(async (meso) => {
    const docSnap = await getDoc(doc(db, "mesocycleBlocks", meso.id));
    result[meso.id] = docSnap.exists() && docSnap.data().blocks ? Object.values(docSnap.data().blocks) : [];
  }));
  return result;
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

  if (loading) return <GlobalLoader message="Cargando plataforma..." />;
  if (!user) return <LoginView />;

  if (role === 'coach' && isApproved === false) {
    return (
      <div className="min-h-[100dvh] bg-[var(--ink-950)] flex items-center justify-center p-4">
        <div className="bg-[var(--ink-900)] max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-[var(--line-800)] animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-[var(--mist-100)] mb-3">Cuenta en Revisión</h2>
          <p className="text-[var(--mist-500)] mb-8 leading-relaxed font-medium">
            Tu registro como Entrenador se completó con éxito, pero tu cuenta requiere la aprobación del Administrador Principal para acceder a la base de datos de atletas. Por favor, aguarda la confirmación.
          </p>
          <button onClick={() => signOut(auth)} className="w-full bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] border border-[var(--line-800)] font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<GlobalLoader message="Cargando plataforma..." />}>
        {role === 'coach' ? (
          <CoachApp currentUser={{ id: user.uid, role: 'coach', name: user.email || "Coach", email: user.email ?? undefined }} />
        ) : (
          <AthleteApp currentUser={{ id: user.uid, role: 'athlete', name: user.email || "Atleta", email: user.email ?? undefined }} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

function CoachApp({ currentUser }: { currentUser: AuthUser }) {
  const coachId = currentUser.id;
  const coachName = currentUser.name;

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [areMacrosLoading, setAreMacrosLoading] = useState(true);

  // Carga en dos pasos: primero los atletas (la lista se muestra enseguida) y
  // después, en segundo plano, sus macrociclos para el contador de cada tarjeta.
  useEffect(() => {
    async function fetchAthletes() {
      let fetchedAthletes: Athlete[] = [];
      try {
        const q = query(collection(db, "athletes"), where("coachId", "==", coachId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedAthletes.push({
            id: doc.id, coachId: data.coachId, name: data.name, firstName: data.firstName || "",
            lastName: data.lastName || "", sport: data.sport, email: data.email || "",
            phone: data.phone || "", macrocycles: data.macrocycles || [],
          } as Athlete);
        });
        setAthletes(fetchedAthletes);
      } catch (error) { console.error("Error al traer los atletas:", error); }
      finally { setIsLoading(false); }

      // Los macrociclos viven en su propia colección: los traemos para que la
      // lista muestre el contador real. Firestore limita "in" a 30 valores, por
      // eso va en grupos. Si falla (ej. reglas), la lista ya está visible igual.
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
        // Solo completa a los atletas que siguen sin macrociclos: si el coach ya
        // abrió un perfil (o creó un macrociclo) mientras tanto, no lo pisamos.
        setAthletes((prev) => prev.map((a) => a.macrocycles.length > 0 ? a : {
          ...a, macrocycles: (macrosByAthlete[a.id] || []).sort((x, y) => x.startDate.localeCompare(y.startDate)),
        }));
      } catch (error) {
        console.error("Error al traer los macrociclos de la lista:", error);
      } finally {
        setAreMacrosLoading(false);
      }
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
        // El filtro por coachId lo exigen las reglas de Firestore para poder listar
        getDocs(query(collection(db, "monthlyRoutines"), where("athleteId", "==", athleteId), where("coachId", "==", coachId))),
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

  return (
    <Routes>
      <Route path="/" element={<CoachLayout coachName={coachName} />}>
        <Route index element={<Navigate to="/athletes" replace />} />
        <Route
          path="athletes"
          element={
            <AthleteListView
              athletes={athletes}
              isLoading={isLoading}
              areMacrosLoading={areMacrosLoading}
              onCreateAthlete={handleCreateAthlete}
            />
          }
        />
        <Route
          path="athletes/:athleteId"
          element={
            <AthleteDetailView
              athletes={athletes}
              isLoadingAthletes={isLoading}
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
      let pastMesos: Mesocycle[] = [];
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

        // Carga en dos pasos: primero los mesociclos que tocan esta semana o el
        // futuro (lo que el atleta ve al entrar) y después, en segundo plano, los pasados.
        const weekStart = mondayOfCurrentWeek();
        const allMesos = macros.flatMap((macro) => macro.mesocycles || []);
        const priorityMesos = allMesos.filter((meso) => meso.endDate >= weekStart);
        pastMesos = allMesos.filter((meso) => meso.endDate < weekStart);

        const priorityBlocks = await fetchBlocksFor(priorityMesos);
        setBlocksByMesocycle(priorityBlocks);
      } catch (error) { console.error(error); }
      finally { setIsLoading(false); }

      if (pastMesos.length === 0) return;
      try {
        const pastBlocks = await fetchBlocksFor(pastMesos);
        setBlocksByMesocycle((prev) => ({ ...pastBlocks, ...prev }));
      } catch (error) {
        console.error("Error al traer los bloques de mesociclos pasados:", error);
        // Los marcamos como vacíos para que AthleteView no quede con el skeleton para siempre
        setBlocksByMesocycle((prev) => {
          const next = { ...prev };
          pastMesos.forEach((meso) => { next[meso.id] ??= []; });
          return next;
        });
      }
    }
    fetchAthleteData();
  }, [athleteEmail]);

  if (isLoading) return <GlobalLoader message="Buscando tu planificación..." />;

  if (!athlete) {
    return (
      <div className="p-8 text-center bg-[var(--ink-950)] min-h-[100dvh] flex flex-col items-center justify-center">
        <div className="bg-[var(--ink-900)] p-8 rounded-3xl shadow-xl max-w-md w-full border border-[var(--line-800)]">
          <h2 className="text-3xl font-black text-[var(--mist-100)] mb-2">¡Hola!</h2>
          <p className="text-[var(--mist-500)] mb-6">Iniciaste sesión como: <br /><strong className="text-[var(--signal-500)]">{athleteEmail}</strong></p>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-5 rounded-2xl mb-8">
            <p className="font-medium text-sm">Tu entrenador aún no ha vinculado tu cuenta a tu perfil de atleta. Pedile que te agregue usando este correo.</p>
          </div>
          <button onClick={() => signOut(auth)} className="w-full bg-[var(--ink-800)] hover:bg-[var(--line-800)] text-[var(--mist-100)] border border-[var(--line-800)] font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-500)]">
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