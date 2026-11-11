import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../../firebase";

// Los entrenamientos de club guardados antes de las reglas de seguridad no tienen
// coachId, y sin él las reglas nuevas no dejan listarlos. Esta migración se lo
// agrega a los de las categorías del coach. Mientras rigen las reglas viejas
// funciona; con las nuevas la consulta sin filtro de coachId se rechaza y no hace
// nada (para entonces ya está todo migrado).
let pending: Promise<void> | null = null;

// Recibe una promesa de los ids de categoría para quedar "pendiente" desde que
// empiezan a cargarse los clubes, y no recién cuando terminan.
export function migrateClubTrainingsOwner(coachId: string, categoryIdsPromise: Promise<string[]>): Promise<void> {
  pending = (async () => {
    const categoryIds = await categoryIdsPromise;
    for (let i = 0; i < categoryIds.length; i += 30) {
      const snap = await getDocs(query(collection(db, "clubTrainings"), where("teamId", "in", categoryIds.slice(i, i + 30))));
      const missing = snap.docs.filter((d) => !d.data().coachId);
      if (missing.length === 0) continue;
      const batch = writeBatch(db);
      missing.forEach((d) => batch.update(doc(db, "clubTrainings", d.id), { coachId }));
      await batch.commit();
    }
  })().catch(() => {
    // Esperable con las reglas nuevas (ya no hay documentos sin dueño que listar)
  });
  return pending;
}

// El calendario espera a que termine la migración para no mostrar días vacíos
export function waitForClubTrainingsMigration(): Promise<void> {
  return pending ?? Promise.resolve();
}
