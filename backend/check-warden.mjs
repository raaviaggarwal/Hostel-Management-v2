import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { username: "azadwarden" }
  });

  console.log({
    found: !!user,
    role: user?.role,
    hostelId: user?.hostelId,
    passwordMatches: user
      ? bcrypt.compareSync("warden123", user.password)
      : false
  });
} catch (error) {
  console.error(error.message);
} finally {
  await prisma.$disconnect();
}
