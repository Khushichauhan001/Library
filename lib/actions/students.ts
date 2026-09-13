"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
