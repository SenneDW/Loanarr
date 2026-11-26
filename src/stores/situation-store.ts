import { create } from "zustand";
import type { Situation } from "@/lib/sim/situation";

interface SituationStore {
  situation: Situation;
  setSituation: (patch: Partial<Situation>) => void;
  reset: () => void;
}

/** Empty by default: nothing is assumed about the user until they fill it in. */
export const emptySituation: Situation = {
  household: "single",
  children: 0,
  income1: 0,
  income2: 0,
  savings: 0,
  investments: 0,
  useInvestments: true,
  gift: 0,
  rent: 0,
  otherCredits: 0,
  bufferMonths: 6,
};

/** Kept in memory only: financial details never leave the browser tab. */
export const useSituationStore = create<SituationStore>((set) => ({
  situation: emptySituation,
  setSituation: (patch) =>
    set((s) => ({ situation: { ...s.situation, ...patch } })),
  reset: () => set({ situation: emptySituation }),
}));

/** True once the user has entered anything we can use. */
export const hasSituation = (s: Situation) =>
  s.income1 > 0 ||
  s.income2 > 0 ||
  s.savings > 0 ||
  s.investments > 0 ||
  s.gift > 0 ||
  s.rent > 0;
