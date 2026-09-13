import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Adjust this if the library's seat count changes.
const TOTAL_SEATS = 90;

async function main() {
  console.log(`Seeding ${TOTAL_SEATS} seats...`);

  for (let seatNumber = 1; seatNumber <= TOTAL_SEATS; seatNumber++) {
    await prisma.seat.upsert({
      where: { seatNumber },
      update: {},
      create: { seatNumber },
    });
  }

  console.log("Done. No student or payment data was created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
