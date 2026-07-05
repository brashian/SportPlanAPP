import { useMemo } from "react";
import type { DailyBlock, DailyBlocksMap, Mesocycle } from "../types/models";
import { getWeeksInRange, hydrateWeeksWithBlocks } from "../utils/dateUtils";

/**
 * useMesocycleWeeks
 * ----------------------------------------------------------------------------
 * Dado un Mesociclo y la lista plana de DailyBlocks que le pertenecen,
 * devuelve el array de semanas listo para alimentar el Acordeón.
 *
 * Se recalcula solo cuando cambian las fechas del mesociclo o los bloques.
 */
export function useMesocycleWeeks(mesocycle: Mesocycle, blocks: DailyBlock[]) {
  const blocksMap: DailyBlocksMap = useMemo(() => {
    const map: DailyBlocksMap = {};
    for (const block of blocks) {
      if (!map[block.date]) map[block.date] = [];
      map[block.date].push(block);
    }
    return map;
  }, [blocks]);

  const weeks = useMemo(() => {
    const structure = getWeeksInRange(mesocycle.startDate, mesocycle.endDate);
    return hydrateWeeksWithBlocks(structure, blocksMap);
  }, [mesocycle.startDate, mesocycle.endDate, blocksMap]);

  return weeks;
}
