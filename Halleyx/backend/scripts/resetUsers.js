/* eslint-disable no-console */
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = process.env.RESET_PASSWORD;
  if (!password) {
    throw new Error(
      "Missing RESET_PASSWORD env var. Set RESET_PASSWORD to the desired password before running this script.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const users = [
    {
      name: "Employee User",
      email: "sssrse5e66755788@gmail.com",
      role: "EMPLOYEE",
    },
    {
      name: "Manager User",
      email: "sasidharan071204@gmail.com",
      role: "MANAGER",
    },
    {
      name: "HR User",
      email: "mathansmathan27@gmail.com",
      role: "HR",
    },
    {
      name: "CEO User",
      email: "sasidharan.n.s54@gmail.com",
      role: "CEO",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
      },
      create: {
        ...user,
        email: user.email.toLowerCase(),
        password: hashedPassword,
      },
    });

    console.log("USER SET:", user.email, "ROLE:", user.role);
  }
}

main()
  .catch((err) => {
    console.error("RESET FAILED:", err?.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

