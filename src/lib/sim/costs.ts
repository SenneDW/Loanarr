import Decimal from "decimal.js";
import {
  type DeedYear,
  type FeeScale,
  MORTGAGE_ACCESSORIES,
  MORTGAGE_DUTY_RATE,
  MORTGAGE_REGISTRATION_RATE,
  NOTARY_ADMIN_FEE,
  type Region,
  registrationRule,
  SCALE_GBIS,
  SCALE_JBIS,
  VAT_RATE,
} from "./tariffs";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const cents = (value: Decimal) =>
  value.toDecimalPlaces(2, D.ROUND_HALF_UP).toNumber();

/**
 * Proportional notary fee for an amount on a fee scale.
 * Art. 4: amounts are rounded to the nearest euro (halves up) before applying the scale.
 * Art. 6: below 20 000 EUR the fixed part is reduced by 86 EUR (not relevant for homes,
 * implemented for completeness).
 */
export function notaryFee(amount: number, scale: FeeScale): number {
  if (amount <= 0) return 0;
  let remaining = new D(Math.round(amount));
  let fee = new D(0);
  for (const [size, ratePercent] of scale.slices) {
    if (remaining.lte(0)) break;
    const slice = D.min(remaining, size === Infinity ? remaining : size);
    fee = fee.plus(slice.times(ratePercent).div(100));
    remaining = remaining.minus(slice);
  }
  const fixed =
    scale.fixed > 0 && amount <= 20_000
      ? Math.max(scale.fixed - 86, 0)
      : scale.fixed;
  return cents(fee.plus(fixed));
}

export function registrationDuty(
  price: number,
  region: Region,
  deedYear: DeedYear,
): number {
  const rule = registrationRule(region, deedYear);
  let base = new D(price);
  if (
    rule.exemptAmount &&
    (rule.exemptMaxPrice === undefined || price <= rule.exemptMaxPrice)
  ) {
    base = D.max(base.minus(rule.exemptAmount), 0);
  }
  return cents(base.times(rule.rate));
}

export interface PurchaseCosts {
  registrationDuty: number;
  notaryFee: number;
  adminFee: number;
  vat: number;
  expenses: number;
  total: number;
}

/** Costs of the purchase deed (aankoopakte) for a sole own home: scale Jbis. */
export function purchaseCosts(
  price: number,
  region: Region,
  deedYear: DeedYear,
  expenses: number,
): PurchaseCosts {
  const duty = registrationDuty(price, region, deedYear);
  const fee = notaryFee(price, SCALE_JBIS);
  const vat = cents(new D(fee).plus(NOTARY_ADMIN_FEE).times(VAT_RATE));
  const total = cents(
    new D(duty).plus(fee).plus(NOTARY_ADMIN_FEE).plus(vat).plus(expenses),
  );
  return {
    registrationDuty: duty,
    notaryFee: fee,
    adminFee: NOTARY_ADMIN_FEE,
    vat,
    expenses,
    total,
  };
}

export interface CreditCosts {
  /** 1 % registration duty + 0.3 % mortgage duty on the inscribed part. */
  mortgageDuties: number;
  notaryFee: number;
  adminFee: number;
  vat: number;
  expenses: number;
  total: number;
}

/**
 * Costs of the credit deed (kredietakte) financing a sole own home: scale Gbis.
 *
 * @param inscriptionShare Fraction of the loan secured by a mortgage inscription
 *   (0–1). The rest is a mortgage mandate, which carries no proportional duties.
 */
export function creditCosts(
  loan: number,
  inscriptionShare: number,
  expenses: number,
): CreditCosts {
  if (loan <= 0) {
    return {
      mortgageDuties: 0,
      notaryFee: 0,
      adminFee: 0,
      vat: 0,
      expenses: 0,
      total: 0,
    };
  }
  const inscribed = new D(loan)
    .times(inscriptionShare)
    .times(1 + MORTGAGE_ACCESSORIES);
  const duties = cents(
    inscribed.times(MORTGAGE_REGISTRATION_RATE + MORTGAGE_DUTY_RATE),
  );
  const fee = notaryFee(loan, SCALE_GBIS);
  const vat = cents(new D(fee).plus(NOTARY_ADMIN_FEE).times(VAT_RATE));
  const total = cents(
    new D(duties).plus(fee).plus(NOTARY_ADMIN_FEE).plus(vat).plus(expenses),
  );
  return {
    mortgageDuties: duties,
    notaryFee: fee,
    adminFee: NOTARY_ADMIN_FEE,
    vat,
    expenses,
    total,
  };
}
