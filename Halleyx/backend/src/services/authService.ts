import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../models/prisma";
import { UserRole } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  id: string; // alias for sub — backward compat with AuthUser
  email: string;
  role: UserRole;
  name: string;
  department?: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthService {
  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async register(input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    const hashed = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: this.normalizeEmail(input.email),
        password: hashed,
        role: input.role,
      },
      select: { id: true, name: true, email: true, role: true, created_at: true },
    });
    return user;
  }

  async login(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new Error("Invalid credentials");
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error("Invalid credentials");

    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: (user as any).department ?? null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: (user as any).department ?? null,
      },
    };
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; department?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const updates: { name?: string; department?: string; password?: string } = {};
    if (data.name) updates.name = data.name;
    if (data.department !== undefined) updates.department = data.department;

    if (data.newPassword) {
      if (!data.currentPassword) throw new Error("Current password required to change password");
      const ok = await bcrypt.compare(data.currentPassword, user.password);
      if (!ok) throw new Error("Current password is incorrect");
      updates.password = await bcrypt.hash(data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: { id: true, name: true, email: true, role: true, department: true },
    });
    return updated;
  }
}

