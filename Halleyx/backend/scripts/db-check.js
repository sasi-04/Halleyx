require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const usersCount = await prisma.user.count();
  const workflowsCount = await prisma.workflow.count();
  const executionsCount = await prisma.execution.count();
  console.log("DATABASE_URL=" + process.env.DATABASE_URL);
  console.log("users_count=" + usersCount);
  console.log("workflows_count=" + workflowsCount);
  console.log("executions_count=" + executionsCount);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

