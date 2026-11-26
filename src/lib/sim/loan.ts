import Decimal from "decimal.js";
import {
  type LoanInput,
  type LoanResult,
  loanInputSchema,
  type ScheduleRow,
  type YearSummary,
} from "./types";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const cents = (value: Decimal) => value.toDecimalPlaces(2, D.ROUND_HALF_UP);

/**
 * Equivalent monthly rate, as required for Belgian mortgage credit
 * (Wetboek van economisch recht, boek VII): (1 + yearly)^(1/12) − 1.
 * Not yearly / 12, which would give a higher effective yearly rate.
 */
export function equivalentMonthlyRate(annualRatePercent: number): Decimal {
  const yearly = new D(annualRatePercent).div(100);
  return yearly.plus(1).pow(new D(1).div(12)).minus(1);
}

/** Fixed monthly payment for an annuity loan, before rounding to cents. */
function annuityPayment(principal: Decimal, rate: Decimal, months: number) {
  if (rate.isZero()) return principal.div(months);
  const factor = new D(1).minus(rate.plus(1).pow(-months));
  return principal.times(rate).div(factor);
}

/**
 * Builds the full monthly repayment schedule. Every amount is rounded to cents;
 * the last payment absorbs rounding differences so the balance ends at exactly 0.
 */
export function simulateLoan(rawInput: LoanInput): LoanResult {
  const input = loanInputSchema.parse(rawInput);
  const months = input.years * 12;
  const principal = new D(input.principal);
  const rate = equivalentMonthlyRate(input.annualRatePercent);

  const fixedPayment = cents(annuityPayment(principal, rate, months));
  const fixedCapital = cents(principal.div(months));

  const schedule: ScheduleRow[] = [];
  let balance = principal;

  for (let month = 1; month <= months; month++) {
    const interest = cents(balance.times(rate));
    const isLast = month === months;

    let capital: Decimal;
    if (isLast) {
      capital = balance;
    } else if (input.repaymentType === "annuity") {
      capital = D.min(fixedPayment.minus(interest), balance);
    } else {
      capital = D.min(fixedCapital, balance);
    }

    balance = balance.minus(capital);
    schedule.push({
      month,
      payment: capital.plus(interest).toNumber(),
      interest: interest.toNumber(),
      capital: capital.toNumber(),
      balance: balance.toNumber(),
    });
  }

  const years: YearSummary[] = [];
  for (let y = 0; y < input.years; y++) {
    const rows = schedule.slice(y * 12, y * 12 + 12);
    const sum = (key: "payment" | "interest" | "capital") =>
      rows.reduce((acc, row) => acc.plus(row[key]), new D(0)).toNumber();
    years.push({
      year: y + 1,
      payment: sum("payment"),
      interest: sum("interest"),
      capital: sum("capital"),
      balance: rows[rows.length - 1].balance,
    });
  }

  const totalInterest = schedule
    .reduce((acc, row) => acc.plus(row.interest), new D(0))
    .toNumber();

  return {
    monthlyRate: rate.toNumber(),
    schedule,
    years,
    firstPayment: schedule[0].payment,
    lastPayment: schedule[schedule.length - 1].payment,
    totalInterest,
    totalPaid: principal.plus(totalInterest).toNumber(),
  };
}
