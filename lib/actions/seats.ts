"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export interface AssignStudentInput {
  seatId: string;
  name: string;
  phone: string;
  monthlyFee: number;
  customFee?: number | null;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a new student and seats them. Wrapped in a transaction and
 * protected by the DB-level unique constraint on Student.seatId, so a seat
 * can never end up with two active occupants even under concurrent requests.
 */
export async function assignStudentToSeat(
  input: AssignStudentInput
): Promise<ActionResult> {
  const { seatId, name, phone, monthlyFee, customFee } = input;

  if (!name.trim() || !phone.trim()) {
    return { success: false, error: "Name and phone are required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const seat = await tx.seat.findUnique({
        where: { id: seatId },
        include: { currentStudent: true },
      });

      if (!seat) throw new Error("Seat not found.");
      if (!seat.isActive) throw new Error("This seat is not active.");
      if (seat.currentStudent) throw new Error("This seat is already occupied.");

      await tx.student.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          seatId,
          monthlyFee,
          customFee: customFee ?? null,
          status: "ACTIVE",
        },
      });
    });
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }

  revalidatePath("/seats");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Marks a student as LEFT and frees their seat. Keeps the student's history
 * (payments, past seat) intact - only status and seatId change.
 */
export async function markStudentLeft(studentId: string): Promise<ActionResult> {
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { status: "LEFT", seatId: null },
    });
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }

  revalidatePath("/seats");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Moves an active student to a different, currently-vacant seat. This is a
 * single atomic operation: the transaction re-checks the target seat's
 * occupancy at write time, and the unique constraint on Student.seatId means
 * the database itself will reject the write if a race condition somehow
 * let two requests through - the seat can never be double-booked.
 */
export async function changeStudentSeat(
  studentId: string,
  newSeatId: string
): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) throw new Error("Student not found.");
      if (student.status !== "ACTIVE") {
        throw new Error("Only active students can change seats.");
      }
      if (student.seatId === newSeatId) {
        throw new Error("Student is already in that seat.");
      }

      const targetSeat = await tx.seat.findUnique({
        where: { id: newSeatId },
        include: { currentStudent: true },
      });
      if (!targetSeat) throw new Error("Target seat not found.");
      if (!targetSeat.isActive) throw new Error("Target seat is not active.");
      if (targetSeat.currentStudent) {
        throw new Error("Target seat is already occupied.");
      }

      await tx.student.update({
        where: { id: studentId },
        data: { seatId: newSeatId },
      });
    });
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }

  revalidatePath("/seats");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return "That seat was just taken by someone else. Please refresh and try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
