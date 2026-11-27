import type { AffordabilityInput } from "@/lib/sim/affordability";
import {
  DEFAULT_FILE_COSTS,
  DEFAULT_MAX_LTV,
  DEFAULT_VALUATION_COSTS,
  ESTIMATED_CREDIT_EXPENSES,
  ESTIMATED_PURCHASE_EXPENSES,
} from "@/lib/sim/tariffs";
import { createRateStore } from "./create-rate-store";

/** Starting values, shown as an example until the user fills in their own. */
export const DEFAULT_MONTHLY_PAYMENT = 1_200;
export const DEFAULT_OWN_FUNDS = 50_000;

export const useAffordabilityStore = createRateStore<AffordabilityInput>({
  monthlyPayment: DEFAULT_MONTHLY_PAYMENT,
  ownFunds: DEFAULT_OWN_FUNDS,
  years: 25,
  repaymentType: "annuity",
  region: "flanders",
  deedYear: 2027,
  maxLtv: DEFAULT_MAX_LTV,
  inscriptionShare: 1,
  fileCosts: DEFAULT_FILE_COSTS,
  valuationCosts: DEFAULT_VALUATION_COSTS,
  purchaseExpenses: ESTIMATED_PURCHASE_EXPENSES,
  creditExpenses: ESTIMATED_CREDIT_EXPENSES,
  netIncome: undefined,
});
