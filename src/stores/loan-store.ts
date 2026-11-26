import type { LoanInput } from "@/lib/sim/types";
import { createRateStore } from "./create-rate-store";

export const useLoanStore = createRateStore<LoanInput>({
  principal: 250_000,
  years: 25,
  repaymentType: "annuity",
});
