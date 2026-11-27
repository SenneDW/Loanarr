import { addMonths } from "@/lib/format";

/**
 * The NBB/ECB publish a month's mortgage rates about five weeks after it ends,
 * in the first days of the month after next (September → early November).
 */
const RELEASE_DAY = 5;

export interface ReleaseStatus {
  /** Months between the latest published month and today's month. */
  ageMonths: number;
  /** The next month the NBB will publish ("YYYY-MM"). */
  nextMonth: string;
  /** The month it is expected in ("YYYY-MM"), around RELEASE_DAY. */
  expectedIn: string;
  /** Days from today until the expected date; negative when it is overdue. */
  daysUntil: number;
}

const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
};

/** "YYYY-MM" of a date, in UTC. */
export const monthOf = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export function releaseStatus(latestMonth: string, today: Date): ReleaseStatus {
  const nextMonth = addMonths(latestMonth, 1);
  const expectedIn = addMonths(nextMonth, 2);
  const [y, m] = expectedIn.split("-").map(Number);
  const expected = Date.UTC(y, m - 1, RELEASE_DAY);
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return {
    ageMonths: monthIndex(monthOf(today)) - monthIndex(latestMonth),
    nextMonth,
    expectedIn,
    daysUntil: Math.round((expected - todayUtc) / 86_400_000),
  };
}
