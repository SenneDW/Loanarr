import { z } from "zod";

/**
 * Repayment types used for Belgian mortgage loans (hypothecaire lening / crédit hypothécaire):
 * - "annuity": fixed monthly payment (vaste mensualiteiten / mensualités constantes)
 * - "linear":  fixed capital repayment, decreasing payments
 *              (vaste kapitaalaflossing / amortissement constant du capital)
 */
export const repaymentTypes = ["annuity", "linear"] as const;
export type RepaymentType = (typeof repaymentTypes)[number];

// Validation messages are user-facing, so they are in Dutch.
export const loanInputSchema = z.object({
  /** Borrowed amount in EUR. */
  principal: z
    .number({ error: "Vul een bedrag in." })
    .positive({ error: "Het bedrag moet groter zijn dan € 0." })
    .max(100_000_000, { error: "Het bedrag is te hoog." }),
  /** Yearly interest rate in percent, e.g. 3.2 for 3,20 %. */
  annualRatePercent: z
    .number({ error: "Vul een rentevoet in." })
    .min(0, { error: "De rentevoet kan niet negatief zijn." })
    .max(30, { error: "De rentevoet mag maximaal 30 % zijn." }),
  /** Duration in years. Belgian mortgages are typically 10–30 years. */
  years: z
    .number({ error: "Vul een looptijd in." })
    .int({ error: "De looptijd moet een geheel aantal jaren zijn." })
    .min(1, { error: "De looptijd moet minstens 1 jaar zijn." })
    .max(40, { error: "De looptijd mag maximaal 40 jaar zijn." }),
  repaymentType: z.enum(repaymentTypes),
});

export type LoanInput = z.infer<typeof loanInputSchema>;

export interface ScheduleRow {
  /** 1-based month number. */
  month: number;
  payment: number;
  interest: number;
  capital: number;
  /** Outstanding balance after this payment. */
  balance: number;
}

export interface YearSummary {
  year: number;
  payment: number;
  interest: number;
  capital: number;
  balance: number;
}

export interface LoanResult {
  monthlyRate: number;
  schedule: ScheduleRow[];
  years: YearSummary[];
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalPaid: number;
}
