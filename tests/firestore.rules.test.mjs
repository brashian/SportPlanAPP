// Pruebas de las reglas de Firestore contra el emulador.
// Uso: npm run test:rules  (levanta el emulador, corre esto y lo apaga)
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";

const COACH_A = "coachA";
const COACH_B = "coachB";
const ATHLETE_EMAIL = "atleta@demo.com";
const OTHER_EMAIL = "otro@demo.com";

let env;
const coachA = () => env.authenticatedContext(COACH_A, { email: "a@coach.com" }).firestore();
const coachB = () => env.authenticatedContext(COACH_B, { email: "b@coach.com" }).firestore();
const athlete = () => env.authenticatedContext("athleteUid", { email: ATHLETE_EMAIL }).firestore();
const stranger = () => env.authenticatedContext("strangerUid", { email: OTHER_EMAIL }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sportplan",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8085 },
  });
});

after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", COACH_A), { role: "coach", isApproved: true });
    await setDoc(doc(db, "users", COACH_B), { role: "coach" });
    await setDoc(doc(db, "athletes", "a1"), { id: "a1", coachId: COACH_A, email: ATHLETE_EMAIL, name: "Atleta" });
    await setDoc(doc(db, "macrocycles", "m1"), { id: "m1", athleteId: "a1", mesocycles: [{ id: "meso1" }] });
    await setDoc(doc(db, "mesocycleBlocks", "meso1"), { coachId: COACH_A, athleteId: "a1", blocks: {} });
    await setDoc(doc(db, "mesocycleBlocks", "legacyMeso"), { blocks: {} });
    await setDoc(doc(db, "monthlyRoutines", "r1"), { athleteId: "a1", coachId: COACH_A, monthName: "Marzo", days: [] });
    await setDoc(doc(db, "routineTemplates", "t1"), { coachId: COACH_A, name: "Fuerza" });
    await setDoc(doc(db, "clubs", "c1"), { coachId: COACH_A, name: "Club", categories: [] });
    await setDoc(doc(db, "clubTrainings", "cat1_2026-03-02"), { coachId: COACH_A, teamId: "cat1" });
    await setDoc(doc(db, "sessionFeedback", "a1_2026-03-02"), {
      id: "a1_2026-03-02", athleteId: "a1", coachId: COACH_A, date: "2026-03-02", rpe: 7, seenByCoach: false,
    });
  });
});

const feedback = (overrides = {}) => ({
  id: "a1_2026-03-03", athleteId: "a1", coachId: COACH_A, mesocycleId: "meso1", blockId: "b1",
  date: "2026-03-03", sessionType: "Fuerza", rpe: 8, fatigue: 3, exercises: [], completedExerciseIds: [],
  notes: "", seenByCoach: false, createdAt: "x", updatedAt: "x", ...overrides,
});

describe("usuarios y coaches", () => {
  test("nadie puede escribir su rol en users", async () => {
    await assertFails(setDoc(doc(stranger(), "users", "strangerUid"), { role: "coach", isApproved: true }));
    await assertFails(updateDoc(doc(coachB(), "users", COACH_B), { isApproved: true }));
  });
  test("cada uno lee solo su users", async () => {
    await assertSucceeds(getDoc(doc(coachA(), "users", COACH_A)));
    await assertFails(getDoc(doc(coachB(), "users", COACH_A)));
  });
  test("registro de coach: solo pendiente y sin autoaprobarse", async () => {
    await assertSucceeds(setDoc(doc(stranger(), "coaches", "strangerUid"), { id: "strangerUid", role: "coach", isApproved: false }));
    await assertFails(setDoc(doc(stranger(), "coaches", "strangerUid"), { id: "strangerUid", role: "coach", isApproved: true }));
    await assertFails(updateDoc(doc(stranger(), "coaches", "strangerUid"), { isApproved: true }));
  });
  test("el login lee coaches/{uid} propio aunque no exista", async () => {
    await assertSucceeds(getDoc(doc(athlete(), "coaches", "athleteUid")));
  });
  test("sin sesión no se lee nada", async () => {
    await assertFails(getDoc(doc(anon(), "athletes", "a1")));
  });
});

describe("atletas", () => {
  test("el coach lista sus atletas y no los de otro", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "athletes"), where("coachId", "==", COACH_A))));
    await assertFails(getDocs(query(collection(coachB(), "athletes"), where("coachId", "==", COACH_A))));
    await assertFails(getDoc(doc(coachB(), "athletes", "a1")));
  });
  test("el atleta encuentra su ficha por email", async () => {
    await assertSucceeds(getDocs(query(collection(athlete(), "athletes"), where("email", "==", ATHLETE_EMAIL))));
    await assertFails(getDocs(query(collection(stranger(), "athletes"), where("email", "==", ATHLETE_EMAIL))));
  });
  test("solo un coach aprobado crea atletas a su nombre", async () => {
    await assertSucceeds(setDoc(doc(coachA(), "athletes", "a2"), { coachId: COACH_A, email: "x@y.com" }));
    await assertSucceeds(setDoc(doc(coachB(), "athletes", "b1"), { coachId: COACH_B, email: "x@y.com" })); // isApproved ausente = aprobado
    await assertFails(setDoc(doc(stranger(), "athletes", "s1"), { coachId: "strangerUid", email: ATHLETE_EMAIL }));
    await assertFails(setDoc(doc(coachB(), "athletes", "a3"), { coachId: COACH_A, email: "x@y.com" }));
  });
  test("otro coach no edita ni roba un atleta", async () => {
    await assertFails(updateDoc(doc(coachB(), "athletes", "a1"), { coachId: COACH_B }));
    await assertFails(updateDoc(doc(coachA(), "athletes", "a1"), { coachId: COACH_B }));
    await assertSucceeds(updateDoc(doc(coachA(), "athletes", "a1"), { name: "Nuevo" }));
  });
});

describe("macrociclos", () => {
  test("consulta por atleta: coach dueño y atleta sí, otro coach no", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "macrocycles"), where("athleteId", "==", "a1"))));
    await assertSucceeds(getDocs(query(collection(athlete(), "macrocycles"), where("athleteId", "==", "a1"))));
    await assertFails(getDocs(query(collection(coachB(), "macrocycles"), where("athleteId", "==", "a1"))));
  });
  test("consulta 'in' de la lista de atletas", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "macrocycles"), where("athleteId", "in", ["a1"]))));
  });
  test("crear y editar solo para el coach del atleta", async () => {
    await assertSucceeds(setDoc(doc(coachA(), "macrocycles", "m2"), { athleteId: "a1", mesocycles: [] }));
    await assertFails(setDoc(doc(coachB(), "macrocycles", "m3"), { athleteId: "a1", mesocycles: [] }));
    await assertFails(updateDoc(doc(athlete(), "macrocycles", "m1"), { name: "x" }));
  });
});

describe("bloques del mesociclo", () => {
  test("lectura: dueño y atleta sí, otro coach no; mesociclo sin bloques sí", async () => {
    await assertSucceeds(getDoc(doc(coachA(), "mesocycleBlocks", "meso1")));
    await assertSucceeds(getDoc(doc(athlete(), "mesocycleBlocks", "meso1")));
    await assertFails(getDoc(doc(coachB(), "mesocycleBlocks", "meso1")));
    await assertSucceeds(getDoc(doc(coachA(), "mesocycleBlocks", "noExiste")));
  });
  test("legacy (sin dueño): se lee y se migra", async () => {
    await assertSucceeds(getDoc(doc(coachB(), "mesocycleBlocks", "legacyMeso")));
    await assertSucceeds(setDoc(doc(coachA(), "mesocycleBlocks", "legacyMeso"), { coachId: COACH_A, athleteId: "a1" }, { merge: true }));
  });
  test("escritura: el dueño sí, otro coach no ni a nombre ajeno", async () => {
    await assertSucceeds(setDoc(doc(coachA(), "mesocycleBlocks", "meso1"), { coachId: COACH_A, athleteId: "a1", blocks: { d: {} } }, { merge: true }));
    await assertFails(setDoc(doc(coachB(), "mesocycleBlocks", "meso1"), { coachId: COACH_B, athleteId: "a1", blocks: {} }, { merge: true }));
    await assertFails(setDoc(doc(coachB(), "mesocycleBlocks", "nuevo"), { coachId: COACH_B, athleteId: "a1", blocks: {} }));
    await assertFails(setDoc(doc(athlete(), "mesocycleBlocks", "meso1"), { coachId: COACH_A, athleteId: "a1", blocks: {} }, { merge: true }));
  });
  test("borrado en lote del atleta completo (incluye mesociclo sin bloques)", async () => {
    const db = coachA();
    const batch = writeBatch(db);
    batch.delete(doc(db, "mesocycleBlocks", "meso1"));
    batch.delete(doc(db, "mesocycleBlocks", "noExiste"));
    batch.delete(doc(db, "macrocycles", "m1"));
    batch.delete(doc(db, "monthlyRoutines", "r1"));
    batch.delete(doc(db, "athletes", "a1"));
    await assertSucceeds(batch.commit());
  });
});

describe("plantillas, rutinas y clubes", () => {
  test("rutinas del atleta: consulta con coachId", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "monthlyRoutines"), where("athleteId", "==", "a1"), where("coachId", "==", COACH_A))));
    await assertFails(getDocs(query(collection(coachB(), "monthlyRoutines"), where("athleteId", "==", "a1"))));
  });
  test("plantillas y clubes: solo el dueño", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "routineTemplates"), where("coachId", "==", COACH_A))));
    await assertFails(getDoc(doc(coachB(), "routineTemplates", "t1")));
    await assertSucceeds(getDocs(query(collection(coachA(), "clubs"), where("coachId", "==", COACH_A))));
    await assertFails(deleteDoc(doc(coachB(), "clubs", "c1")));
  });
  test("entrenamientos de club: consulta con coachId y día vacío", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "clubTrainings"), where("teamId", "==", "cat1"), where("coachId", "==", COACH_A))));
    await assertFails(getDocs(query(collection(coachB(), "clubTrainings"), where("teamId", "==", "cat1"))));
    await assertSucceeds(getDoc(doc(coachA(), "clubTrainings", "cat1_2026-03-09")));
    await assertSucceeds(setDoc(doc(coachA(), "clubTrainings", "cat1_2026-03-09"), { coachId: COACH_A, teamId: "cat1" }, { merge: true }));
    await assertFails(setDoc(doc(coachB(), "clubTrainings", "cat1_2026-03-02"), { coachId: COACH_B, teamId: "cat1" }, { merge: true }));
  });
});

describe("feedback del atleta", () => {
  test("el atleta crea y edita el suyo", async () => {
    await assertSucceeds(setDoc(doc(athlete(), "sessionFeedback", "a1_2026-03-03"), feedback()));
    await assertSucceeds(setDoc(doc(athlete(), "sessionFeedback", "a1_2026-03-02"), feedback({ id: "a1_2026-03-02", date: "2026-03-02", rpe: 9 })));
  });
  test("no puede mandarlo a otro coach ni hacerse pasar por otro atleta", async () => {
    await assertFails(setDoc(doc(athlete(), "sessionFeedback", "a1_2026-03-03"), feedback({ coachId: COACH_B })));
    await assertFails(setDoc(doc(stranger(), "sessionFeedback", "a1_2026-03-03"), feedback()));
    await assertFails(setDoc(doc(athlete(), "sessionFeedback", "otro_id"), feedback()));
  });
  test("el coach lee (con filtro coachId) y solo marca como visto", async () => {
    await assertSucceeds(getDocs(query(collection(coachA(), "sessionFeedback"), where("athleteId", "==", "a1"), where("coachId", "==", COACH_A))));
    await assertSucceeds(getDocs(query(collection(coachA(), "sessionFeedback"), where("coachId", "==", COACH_A), where("seenByCoach", "==", false))));
    await assertSucceeds(updateDoc(doc(coachA(), "sessionFeedback", "a1_2026-03-02"), { seenByCoach: true }));
    await assertFails(updateDoc(doc(coachA(), "sessionFeedback", "a1_2026-03-02"), { rpe: 1 }));
  });
  test("el atleta lista el suyo; otro coach no ve nada", async () => {
    await assertSucceeds(getDocs(query(collection(athlete(), "sessionFeedback"), where("athleteId", "==", "a1"))));
    await assertFails(getDocs(query(collection(coachB(), "sessionFeedback"), where("athleteId", "==", "a1"))));
  });
});

describe("todo lo demás", () => {
  test("colecciones no listadas quedan denegadas", async () => {
    await assertFails(getDoc(doc(coachA(), "dailyBlocks", "x")));
    await assertFails(setDoc(doc(coachA(), "loQueSea", "x"), { a: 1 }));
  });
});
