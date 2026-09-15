import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface DeleteStudentSummary {
  studentName: string;
  paymentsDeleted: number;
  monthsArchived: number;
}

/**
 * The actual work behind permanently deleting a student. Lives outside the
 * "use server" module on purpose: every exported async function in a
 * "use server" file becomes a callable POST endpoint, and this one performs
 * an irreversible delete with no auth check of its own. The auth check lives
 * in deleteStudent() in lib/actions/students.ts, which is the only thing that
 * should call this - keeping the core here means it can also be exercised
 * directly by a script or test without going through a request.
 *
 * Deleting must not rewrite history. Money collected in a past month was
 * really collected, so before the Payment rows go they are summed per
 * calendar month (bucketed by paidOn, exactly how the Reports page buckets
 * live payments) into ArchivedRevenue. The Reports page adds those archived
 * totals on top of the live ones, so every month's "Collected" figure is
 * unchanged by a delete. Going forward the student simply doesn't exist: no
 * dues, no occupancy, no active count.
 *
 * Sums are accumulated in Prisma.Decimal rather than JS numbers so the
 * archived total is exact. A float round-trip could drift by a paisa and so
 * change a past month's total, which is the one thing this exists to prevent.
 */
export async function deleteStudentRecord(
  studentId: string
): Promise<DeleteStudentSummary> {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { payments: true },
    });

    if (!student) {
      throw new Error("That student no longer exists. Please refresh the page.");
    }

    const byMonth = new Map<
      string,
      { collectedMonth: Date; amount: Prisma.Decimal; paymentCount: number }
    >();

    for (const payment of student.payments) {
      const collectedMonth = new Date(
        Date.UTC(payment.paidOn.getUTCFullYear(), payment.paidOn.getUTCMonth(), 1)
      );
      const key = collectedMonth.toISOString();
      const bucket = byMonth.get(key) ?? {
        collectedMonth,
        amount: new Prisma.Decimal(0),
        paymentCount: 0,
      };
      bucket.amount = bucket.amount.plus(payment.amount);
      bucket.paymentCount += 1;
      byMonth.set(key, bucket);
    }

    if (byMonth.size > 0) {
      await tx.archivedRevenue.createMany({
        data: Array.from(byMonth.values()).map((bucket) => ({
          studentName: student.name,
          collectedMonth: bucket.collectedMonth,
          amount: bucket.amount,
          paymentCount: bucket.paymentCount,
        })),
      });
    }

    // Payments first - Payment.studentId is a required relation, so the
    // student row cannot go while any of them still point at it.
    await tx.payment.deleteMany({ where: { studentId } });

    // Deleting the student row is also what frees the seat: occupancy is
    // Student.seatId, so there is no separate seat update to make.
    await tx.student.delete({ where: { id: studentId } });

    return {
      studentName: student.name,
      paymentsDeleted: student.payments.length,
      monthsArchived: byMonth.size,
    };
  });
}
