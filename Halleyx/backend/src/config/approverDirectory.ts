import { UserRole } from "@prisma/client";

export const APPROVER_DIRECTORY = {
  [UserRole.MANAGER]: {
    name: "Manager User",
    email: "sasidharan071204@gmail.com",
  },
  [UserRole.HR]: {
    name: "HR User",
    email: "mathansmathan27@gmail.com",
  },
  [UserRole.CEO]: {
    name: "CEO User",
    email: "sasidharan.n.s54@gmail.com",
  },
} as const;

export const INITIAL_EMPLOYEE = {
  name: "Demo Employee",
  email: "sssrse5e66755788@gmail.com",
} as const;

export function getFixedApproverEmail(role: UserRole): string | null {
  return (APPROVER_DIRECTORY as any)?.[role]?.email ?? null;
}

