import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentEditForm } from "@/components/students/student-edit-form";
import { ReceiptDialog } from "@/components/payments/receipt-dialog";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      seat: true,
      payments: { orderBy: { paidOn: "desc" } },
    },
  });

  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{student.name}</h1>
          <p className="text-sm text-muted-foreground">{student.phone}</p>
        </div>
        <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>
          {student.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Current seat</p>
              <p>
                {student.seat ? (
                  <Link href="/seats" className="underline underline-offset-4">
                    Seat {student.seat.seatNumber}
                  </Link>
                ) : (
                  "Not seated"
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p>{formatDate(student.joinDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Effective fee</p>
              <p>{formatCurrency(Number(student.customFee ?? student.monthlyFee))}</p>
            </div>
          </div>

          <StudentEditForm
            studentId={student.id}
            initialName={student.name}
            initialPhone={student.phone}
            initialMonthlyFee={Number(student.monthlyFee)}
            initialCustomFee={student.customFee != null ? Number(student.customFee) : null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {student.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet. (Recording payments is coming in the Fees module.)
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Receipt</th>
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Paid on</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {student.payments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="py-2 pr-4">{payment.receiptNo}</td>
                      <td className="py-2 pr-4">{formatDate(payment.periodMonth)}</td>
                      <td className="py-2 pr-4">{formatDate(payment.paidOn)}</td>
                      <td className="py-2 pr-4">{formatCurrency(Number(payment.amount))}</td>
                      <td className="py-2 pr-4">{payment.mode}</td>
                      <td className="py-2 pr-4">{payment.status}</td>
                      <td className="py-2 pr-4">
                        <ReceiptDialog
                          receipt={{
                            receiptNo: payment.receiptNo,
                            studentName: student.name,
                            seatNumber: student.seat?.seatNumber ?? null,
                            periodMonth: payment.periodMonth,
                            amount: Number(payment.amount),
                            mode: payment.mode,
                            paidOn: payment.paidOn,
                            status: payment.status,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
