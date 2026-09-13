// Single source of truth for "is this student paid up / due soon / overdue,
// and how much do they owe" math. Used by the dashboard, students list,
// fees page, and reports page - don't duplicate this logic elsewhere.
//
// Deliberately a pure function with no Prisma import: callers load the
// student + payments via Prisma, convert any Decimal fields to plain
// numbers, and pass plain data in. That keeps this file trivially unit
// testable and free of any DB/runtime dependency.

export type DueStatus = "OK" | "DUE_SOON" | "OVERDUE";

export interface DueStatusPaymentInput {
  status: "PAID" | "PARTIAL";
  periodMonth: Date;
  amount: number;
  dueDateAfter: Date;
}

export interface DueStatusStudentInput {
  joinDate: Date;
  monthlyFee: number;
  customFee: number | null;
  payments: DueStatusPaymentInput[];
}

export interface DueStatusResult {
  status: DueStatus;
  currentDueDate: Date;
  daysUntilDue: number;
  monthsOwed: number;
  amountOwed: number;
  effectiveFee: number;
  paidTowardsCurrentPeriod: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalizes a Date to a UTC day-only timestamp (midnight UTC), so day
 * comparisons are stable regardless of the server's local timezone and
 * regardless of what time-of-day component the source Date happens to carry
 * (e.g. joinDate has a real timestamp, periodMonth is stored as "the 1st"). */
function toUTCDateOnly(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return toUTCDateOnly(a) === toUTCDateOnly(b);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((toUTCDateOnly(from) - toUTCDateOnly(to)) / MS_PER_DAY);
}

/**
 * Adds `months` calendar months to `date`, clamping the day-of-month to the
 * last valid day of the target month (e.g. Jan 31 + 1 month -> Feb 28/29,
 * never silently rolling into March). Operates on UTC date components so it
 * matches how Prisma reads/writes DateTime columns.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function computeDueStatus(
  student: DueStatusStudentInput,
  now: Date = new Date()
): DueStatusResult {
  const effectiveFee = student.customFee ?? student.monthlyFee;

  // The anchor: dueDateAfter of the most recent PAID payment, or joinDate if
  // there isn't one yet. PARTIAL payments never move this anchor.
  const paidPayments = student.payments.filter((p) => p.status === "PAID");
  const currentDueDate =
    paidPayments.length > 0
      ? paidPayments.reduce(
          (latest, p) => (p.dueDateAfter > latest ? p.dueDateAfter : latest),
          paidPayments[0].dueDateAfter
        )
      : student.joinDate;

  const paidTowardsCurrentPeriod = student.payments
    .filter((p) => isSameCalendarDay(p.periodMonth, currentDueDate))
    .reduce((sum, p) => sum + p.amount, 0);

  const daysUntilDue = daysBetween(currentDueDate, now);

  let status: DueStatus;
  if (daysUntilDue > 3) {
    status = "OK";
  } else if (daysUntilDue >= 0) {
    status = "DUE_SOON";
  } else {
    status = "OVERDUE";
  }

  const monthsOwed =
    status === "OVERDUE" ? Math.max(1, Math.floor(-daysUntilDue / 30) + 1) : 1;

  const amountOwed = Math.max(
    0,
    effectiveFee * monthsOwed - paidTowardsCurrentPeriod
  );

  return {
    status,
    currentDueDate,
    daysUntilDue,
    monthsOwed,
    amountOwed,
    effectiveFee,
    paidTowardsCurrentPeriod,
  };
}

/** Convenience: true if this computed status should show up in a "has dues" list. */
export function hasDues(result: DueStatusResult): boolean {
  return (
    (result.status === "DUE_SOON" || result.status === "OVERDUE") &&
    result.amountOwed > 0
  );
}

/**
 * The amount that should actually be treated as "owed" for display/action
 * purposes (record-payment buttons, bulk selection, totals). For an OK
 * (fully paid up) student, DueStatusResult.amountOwed still computes to a
 * full period's fee under the hood - it reflects the *next*, not-yet-due
 * period, which by definition has no matching payment yet. That number is
 * meaningless outside the raw math, so anywhere the app shows or acts on
 * "how much does this student owe right now", use this instead of the raw
 * field.
 */
export function effectiveAmountOwed(result: DueStatusResult): number {
  return hasDues(result) ? result.amountOwed : 0;
}
