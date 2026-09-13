"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, type PaymentMode } from "@prisma/client";
import { computeDueStatus, addMonthsClamped, hasDues } from "@/lib/fees";
import type { ActionResult } from "./seats";

// Allow a tiny epsilon so floating point rounding (e.g. 999.9999999999999
// from repeated division) doesn't wrongly classify a full payment as partial.
const EPSILON = 0.01;

export interface RecordPaymentInput {
  studentId: string;
  amount: number;
  mode: PaymentMode;
  monthsCovered?: number;
}

/**
 * Records a payment for a student. Handles both a normal "pay for the
 * current period" payment and an advance payment covering multiple months
 * (via monthsCovered). Whether the payment is enough to fully cover what's
 * expected determines whether it's recorded as PAID (which advances the
 * student's due date) or PARTIAL (which leaves the due date/period open).
 */
export async function recordPayment(
  input: RecordPaymentInput
): Promise<ActionResult> {
  const { studentId, amount, mode } = input;
  const monthsCovered = input.monthsCovered ?? 1;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be greater than zero." };
  }
  if (!Number.isInteger(monthsCovered) || monthsCovered < 1) {
    return { success: false, error: "Months covered must be a whole number of at least 1." };
  }

  try {
    await recordPaymentCore({ studentId, amount, mode, monthsCovered, batchId: null });
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/fees");
  revalidatePath("/reports");
  return { success: true };
}

export interface BulkMarkPaidInput {
  studentIds: string[];
  mode: PaymentMode;
}

export interface BulkMarkPaidResult {
  success: boolean;
  succeeded: string[];
  failed: { studentId: string; error: string }[];
}

/**
 * Marks each given student as fully paid up for whatever they currently owe,
 * tagging every payment created with a shared batchId. Each student's write
 * happens in its own transaction so one bad record doesn't roll back the
 * others; we collect per-student success/failure instead of throwing.
 */
export async function bulkMarkPaid(
  input: BulkMarkPaidInput
): Promise<BulkMarkPaidResult> {
  const { studentIds, mode } = input;
  const batchId = crypto.randomUUID();

  const succeeded: string[] = [];
  const failed: { studentId: string; error: string }[] = [];

  for (const studentId of studentIds) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { payments: true },
      });
      if (!student) {
        failed.push({ studentId, error: "Student not found." });
        continue;
      }
      if (student.status !== "ACTIVE") {
        failed.push({ studentId, error: "Student is not active." });
        continue;
      }

      const due = computeDueStatus({
        joinDate: student.joinDate,
        monthlyFee: Number(student.monthlyFee),
        customFee: student.customFee != null ? Number(student.customFee) : null,
        payments: student.payments.map((p) => ({
          status: p.status,
          periodMonth: p.periodMonth,
          amount: Number(p.amount),
          dueDateAfter: p.dueDateAfter,
        })),
      });

      // Gate on hasDues (status + amount), not amountOwed alone: for a
      // fully-paid-up (OK) student, the raw formula's amountOwed still
      // computes to a full period's fee (it reflects the *next* period,
      // which legitimately has no matching payment yet) - it is only
      // meaningful once the student is actually DUE_SOON/OVERDUE.
      if (!hasDues(due)) {
        failed.push({ studentId, error: "No amount owed - nothing to mark paid." });
        continue;
      }

      await recordPaymentCore({
        studentId,
        amount: due.amountOwed,
        mode,
        monthsCovered: due.monthsOwed,
        batchId,
      });
      succeeded.push(studentId);
    } catch (err) {
      failed.push({ studentId, error: toErrorMessage(err) });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/fees");
  revalidatePath("/reports");
  for (const id of succeeded) {
    revalidatePath(`/students/${id}`);
  }

  return { success: failed.length === 0, succeeded, failed };
}

interface RecordPaymentCoreInput {
  studentId: string;
  amount: number;
  mode: PaymentMode;
  monthsCovered: number;
  batchId: string | null;
}

async function recordPaymentCore(input: RecordPaymentCoreInput): Promise<void> {
  const { studentId, amount, mode, monthsCovered, batchId } = input;

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { payments: true },
    });

    if (!student) throw new Error("Student not found.");
    if (student.status !== "ACTIVE") {
      throw new Error("Cannot record a payment for a student who has left.");
    }

    const due = computeDueStatus({
      joinDate: student.joinDate,
      monthlyFee: Number(student.monthlyFee),
      customFee: student.customFee != null ? Number(student.customFee) : null,
      payments: student.payments.map((p) => ({
        status: p.status,
        periodMonth: p.periodMonth,
        amount: Number(p.amount),
        dueDateAfter: p.dueDateAfter,
      })),
    });

    const expectedTotal =
      due.effectiveFee * monthsCovered - due.paidTowardsCurrentPeriod;

    const isFullyPaid = amount >= expectedTotal - EPSILON;

    const status = isFullyPaid ? "PAID" : "PARTIAL";
    const dueDateAfter = isFullyPaid
      ? addMonthsClamped(due.currentDueDate, monthsCovered)
      : due.currentDueDate;

    const receiptNo =
      "RCPT-" + String((await tx.payment.count()) + 1).padStart(6, "0");

    await tx.payment.create({
      data: {
        studentId,
        amount,
        periodMonth: due.currentDueDate,
        paidOn: new Date(),
        dueDateAfter,
        mode,
        status,
        receiptNo,
        batchId,
        monthsCovered,
      },
    });
  });
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return "Please try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
