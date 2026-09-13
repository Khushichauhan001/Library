import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { computeDueStatus, effectiveAmountOwed } from "@/lib/fees";
import { formatCurrency } from "@/lib/format";
import { FeesTable, type FeeRow } from "@/components/fees/fees-table";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    include: { seat: true, payments: true },
    orderBy: { name: "asc" },
  });

  const rows: FeeRow[] = students.map((student) => {
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

    return {
      id: student.id,
      name: student.name,
      seatNumber: student.seat?.seatNumber ?? null,
      effectiveFee: due.effectiveFee,
      paidThisPeriod: due.paidTowardsCurrentPeriod,
      amountOwed: effectiveAmountOwed(due),
      monthsOwed: due.monthsOwed,
      status: due.status,
    };
  });

  const totalOwed = rows.reduce((sum, r) => sum + r.amountOwed, 0);
  const overdueCount = rows.filter((r) => r.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fees</h1>
        <p className="text-sm text-muted-foreground">
          Record payments, run bulk mark-paid, and keep an eye on who owes what.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total owed right now</p>
            <p className="text-3xl font-semibold">{formatCurrency(totalOwed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overdue students</p>
            <p className="text-3xl font-semibold">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      <FeesTable rows={rows} />
    </div>
  );
}
