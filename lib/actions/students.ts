"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deleteStudentRecord } from "@/lib/student-deletion";
import type { ActionResult } from "./seats";

export interface UpdateStudentInput {
  studentId: string;
  name: string;
  phone: string;
  monthlyFee: number;
  customFee?: number | null;
}

export async function updateStudent(
  input: UpdateStudentInput
): Promise<ActionResult> {
  const { studentId, name, phone, monthlyFee, customFee } = input;

  if (!name.trim() || !phone.trim()) {
    return { success: false, error: "Name and phone are required." };
  }

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        monthlyFee,
        customFee: customFee ?? null,
      },
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return { success: true };
}

/**
 * Permanently deletes a student, their payment rows, and frees their seat.
 *
 * This is the "permanently left" path, distinct from markStudentLeft(): LEFT
 * keeps the student around (they might be back next month), delete removes
 * them for good. Revenue they already paid is preserved against the months it
 * was collected in - see deleteStudentRecord() in lib/student-deletion.ts for
 * how, and why that logic lives outside this file.
 */
export async function deleteStudent(studentId: string): Promise<ActionResult> {
  // Destructive and irreversible, so the session is checked in the action
  // itself rather than relying only on middleware: a Server Action is a POST
  // endpoint that can be hit without going through the UI.
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "You are not signed in. Please log in again." };
  }

  try {
    await deleteStudentRecord(studentId);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }

  revalidatePath("/students");
  revalidatePath("/seats");
  revalidatePath("/dashboard");
  revalidatePath("/fees");
  revalidatePath("/reports");
  return { success: true };
}
